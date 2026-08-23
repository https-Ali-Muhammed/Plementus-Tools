import { URL } from 'node:url';
import { requestWithRedirects } from './http-client.js';

// Well-known paths worth probing directly even if the homepage doesn't link
// to them plainly (many sites keep these pages but bury or omit the link).
const EVIDENCE_PATH_GROUPS = {
  privacy: ['/privacy', '/privacy-policy', '/privacy-notice', '/legal/privacy'],
  terms: ['/terms', '/terms-of-service', '/terms-conditions', '/legal/terms'],
  security: ['/security', '/trust', '/trust-center', '/.well-known/security.txt'],
  compliance: ['/compliance', '/legal/compliance', '/gdpr', '/hipaa', '/pci-dss', '/data-protection'],
  cookies: ['/cookie-policy', '/cookies', '/cookie-notice'],
  support: ['/support', '/help'],
  healthcare: ['/healthcare', '/hipaa-notice']
};

const LINK_KEYWORD_PATTERN = /privacy|terms|security|trust|complian|legal|gdpr|hipaa|cookie|data.?protection/i;
const GROUP_RELEVANCE = {
  privacy: /privacy|personal data|data protection|data subject|right to access|right to erasure/i,
  terms: /terms|conditions|acceptable use|user agreement/i,
  security: /security|trust|vulnerability|incident response|encryption|security.txt/i,
  compliance: /compliance|gdpr|iso|soc\s?2|pci|hipaa|data protection/i,
  cookies: /cookie|consent|tracking|analytics/i,
  support: /support|help|contact/i,
  healthcare: /healthcare|health care|patient|medical|phi|hipaa/i
};

function stripTags(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractTitle(html) {
  return (String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
    .replace(/\s+/g, ' ')
    .trim();
}

function extractLinks(html, baseUrl) {
  const links = [];
  const matches = String(html || '').matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"'#]+)["'][^>]*>([\s\S]*?)<\/a>/gi);
  const base = new URL(baseUrl);
  for (const match of matches) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!LINK_KEYWORD_PATTERN.test(href) && !LINK_KEYWORD_PATTERN.test(text)) continue;
    try {
      const resolved = new URL(href, base);
      if (!/^https?:$/.test(resolved.protocol)) continue;
      if (resolved.hostname !== base.hostname) continue;
      links.push({ url: resolved.href, text });
    } catch {}
  }
  return links;
}

function normalizeForDedupe(href) {
  try {
    const u = new URL(href);
    return `${u.origin}${(u.pathname || '/').replace(/\/$/, '') || '/'}`;
  } catch {
    return href;
  }
}

function pageLooksRelevant({ html, finalUrl, groups = [] }) {
  if (!groups.length) return true;
  const title = extractTitle(html);
  const text = stripTags(html).slice(0, 5000);
  return groups.some((group) => {
    const pattern = GROUP_RELEVANCE[group] || LINK_KEYWORD_PATTERN;
    if (pattern.test(title)) return true;
    const matches = text.match(new RegExp(pattern.source, pattern.flags.includes('g') ? pattern.flags : `${pattern.flags}g`)) || [];
    return matches.length >= 2;
  });
}

function describeError(error) {
  if (error?.message) return error.message;
  const nested = Array.isArray(error?.errors) ? error.errors : [];
  const details = nested.map((item) => item?.message || item?.code).filter(Boolean);
  if (details.length) return details.slice(0, 3).join(' | ');
  return String(error?.code || error?.name || 'Request failed');
}

async function fetchPageWithRedirects(target, { timeout = 8000, maxBodyBytes = 900_000 } = {}) {
  const response = await fetch(target, {
    redirect: 'follow',
    signal: AbortSignal.timeout(timeout),
    headers: {
      'User-Agent': 'Web-Engineering-Toolkit-Security-Scanner/1.4',
      'Accept': 'text/html,application/xhtml+xml,text/plain;q=0.8,*/*;q=0.5'
    }
  });
  const buffer = Buffer.from(await response.arrayBuffer());
  const body = buffer.subarray(0, maxBodyBytes).toString('utf8');
  return {
    finalUrl: response.url || target,
    status: response.status || 0,
    body,
    truncated: buffer.length > maxBodyBytes,
    headers: Object.fromEntries(response.headers.entries())
  };
}

/**
 * Crawls a small, targeted set of pages beyond the homepage to find
 * compliance-relevant evidence (privacy policy, terms, security/trust pages,
 * cookie notices, etc). Evidence for GDPR/HIPAA/PCI-DSS/etc often lives
 * entirely off the homepage, so scanning only the requested URL misses it.
 *
 * This is a shallow, bounded crawl (homepage + well-known paths + homepage
 * links matching compliance keywords) — not a general-purpose site crawler.
 */
export async function discoverEvidencePages(homepageUrl, homepageHtml, { maxPages = 10, timeoutPerPage = 8000 } = {}) {
  const origin = new URL(homepageUrl);
  const candidates = new Map();

  const addCandidate = (href, groupId, source) => {
    const key = normalizeForDedupe(href);
    if (key === normalizeForDedupe(homepageUrl)) return;
    if (!candidates.has(key)) candidates.set(key, { url: href, groups: new Set(), source });
    if (groupId) candidates.get(key).groups.add(groupId);
  };

  for (const [groupId, paths] of Object.entries(EVIDENCE_PATH_GROUPS)) {
    for (const p of paths) {
      try { addCandidate(new URL(p, origin).href, groupId, 'well-known-path'); } catch {}
    }
  }
  for (const link of extractLinks(homepageHtml, homepageUrl)) {
    addCandidate(link.url, null, 'homepage-link');
  }

  // Prefer links the site actually surfaces over guessed well-known paths.
  const ordered = [...candidates.values()].sort((a, b) => {
    if (a.source === b.source) return 0;
    return a.source === 'homepage-link' ? -1 : 1;
  });
  const selected = ordered.slice(0, Math.max(1, Math.min(25, maxPages)));

  const pages = [];
  const seenFinalUrls = new Map(); // normalized finalUrl -> index in `pages`
  for (const candidate of selected) {
    let primaryError = null;
    try {
      let response;
      try {
        response = await requestWithRedirects(candidate.url, {
          rejectUnauthorized: false,
          timeout: timeoutPerPage,
          maxBodyBytes: 900_000
        });
      } catch (error) {
        primaryError = error;
        response = await fetchPageWithRedirects(candidate.url, {
          timeout: timeoutPerPage,
          maxBodyBytes: 900_000
        });
      }
      const candidateFound = response.status >= 200 && response.status < 400;
      const finalUrl = response.finalUrl;
      const found = candidateFound && (candidate.source !== 'well-known-path' || pageLooksRelevant({ html: response.body || '', finalUrl, groups: [...candidate.groups] }));
      const finalKey = found ? normalizeForDedupe(finalUrl) : null;

      // Different guessed paths for a group (e.g. /privacy and /privacy-policy)
      // can both redirect to the same canonical page. Merge their groups into
      // the one entry already recorded instead of listing the page twice.
      if (found && seenFinalUrls.has(finalKey)) {
        const existing = pages[seenFinalUrls.get(finalKey)];
        for (const g of candidate.groups) existing.groups = [...new Set([...existing.groups, g])];
        continue;
      }

      const page = {
        url: candidate.url,
        finalUrl,
        status: response.status,
        groups: [...candidate.groups],
        source: candidate.source,
        title: found ? extractTitle(response.body || '') : '',
        html: found ? (response.body || '') : '',
        found,
        error: primaryError ? `Primary HTTP client failed; fetch fallback succeeded: ${describeError(primaryError)}` : ''
      };
      if (found) seenFinalUrls.set(finalKey, pages.length);
      pages.push(page);
    } catch (error) {
      pages.push({ url: candidate.url, finalUrl: candidate.url, status: 0, groups: [...candidate.groups], source: candidate.source, html: '', found: false, error: describeError(error) });
    }
  }
  return pages;
}

const EVIDENCE_SIGNALS = {
  dataSubjectRights: { label: 'Data rights', category: 'privacy', pattern: /\b(right to (access|erasure|be forgotten|rectification|portability|object)|data subject rights?|opt-?out of (the )?sale|do not sell (my|our))\b/i },
  consentManagement: { label: 'Consent management', category: 'privacy', pattern: /\b(cookie consent|consent management|manage (cookie )?preferences|onetrust|cookiebot|trustarc|usercentrics|quantcast choice)\b/i },
  breachNotification: { label: 'Breach notification / incident response', category: 'security-operations', pattern: /\b(data breach notification|breach notification|incident response (plan|policy|process))\b/i },
  encryption: { label: 'Encryption', category: 'technical-control', pattern: /\b(encrypt(ed|ion)? (at rest|in transit)|end-to-end encryption|TLS ?1\.[23])\b/i },
  subprocessors: { label: 'Processors / DPA', category: 'privacy', pattern: /\b(sub-?processors?|data processing agreement|\bDPA\b)\b/i },
  accessControl: { label: 'Access control', category: 'security-control', pattern: /\b(multi-?factor authentication|\bMFA\b|role-based access control|least privilege)\b/i },
  vulnerabilityMgmt: { label: 'Vulnerability management', category: 'security-operations', pattern: /\b(penetration test(ing)?|vulnerability (management|disclosure)|bug bounty)\b/i },
  dataRetention: { label: 'Data retention', category: 'privacy', pattern: /\b(data retention (policy|period|schedule)|retention schedule|retain (your|personal|account) data)\b/i },
  auditLogging: { label: 'Audit logging', category: 'security-control', pattern: /\b(audit log|audit logging|activity logs?|access logs?)\b/i },
  availabilityBackup: { label: 'Backup / availability', category: 'resilience', pattern: /\b(backup|disaster recovery|business continuity|availability commitment|uptime)\b/i },
  paymentProcessing: { label: 'Payment processing', category: 'payment', pattern: /\b(payment|checkout|credit card|debit card|cardholder|stripe|paypal|adyen|braintree|pci)\b/i },
  healthcarePhi: { label: 'Healthcare / PHI', category: 'healthcare', pattern: /\b(healthcare|health care|medical|patient|protected health information|\bPHI\b|HIPAA)\b/i }
};

const CERTIFICATION_SIGNALS = {
  'iso-27001': /\bISO\/?IEC\s?27001\b/i,
  'soc-2': /\bSOC\s?2\b/i,
  'pci-dss': /\bPCI[\s-]?DSS\b/i,
  hipaa: /\bHIPAA\b/i,
  gdpr: /\bGDPR\b/i,
  ccpa: /\bCCPA\b/i
};

/**
 * Extracts pattern-based compliance signals from crawled evidence pages.
 * These are text-mention detections only — they indicate a page exists and
 * uses relevant language, not that any claim on it is true or verified.
 */
export function extractComplianceEvidence(pages) {
  const evidenceFound = {};
  const evidenceItems = [];

  for (const [key, signal] of Object.entries(EVIDENCE_SIGNALS)) {
    evidenceFound[key] = false;
    for (const page of pages.filter((p) => p.found && p.html)) {
      const text = stripTags(page.html);
      const match = text.match(signal.pattern);
      if (!match) continue;
      evidenceFound[key] = true;
      const index = Math.max(0, match.index || 0);
      const start = Math.max(0, index - 120);
      const end = Math.min(text.length, index + String(match[0]).length + 180);
      evidenceItems.push({
        key,
        label: signal.label,
        category: signal.category,
        sourceUrl: page.finalUrl || page.url,
        pageTitle: page.title || '',
        keyword: match[0],
        evidenceText: text.slice(start, end).trim()
      });
      break;
    }
  }

  const text = pages.filter((p) => p.found && p.html).map((p) => stripTags(p.html)).join(' \n ');

  const certifications = {};
  for (const [key, pattern] of Object.entries(CERTIFICATION_SIGNALS)) certifications[key] = pattern.test(text);

  const pagesFoundByGroup = {};
  const seenPerGroup = {};
  for (const page of pages) {
    if (!page.found) continue;
    // Well-known-path guesses for a group (e.g. /privacy, /privacy-policy,
    // /legal/privacy) can all redirect to the same canonical page. Dedupe by
    // final URL so a single page isn't listed twice under one group just
    // because two different guessed paths happened to land on it.
    const finalKey = normalizeForDedupe(page.finalUrl || page.url);
    for (const group of page.groups) {
      if (!pagesFoundByGroup[group]) pagesFoundByGroup[group] = [];
      if (!seenPerGroup[group]) seenPerGroup[group] = new Set();
      if (seenPerGroup[group].has(finalKey)) continue;
      seenPerGroup[group].add(finalKey);
      pagesFoundByGroup[group].push(page.finalUrl || page.url);
    }
  }

  return { evidenceFound, evidenceItems, certifications, pagesFoundByGroup };
}
