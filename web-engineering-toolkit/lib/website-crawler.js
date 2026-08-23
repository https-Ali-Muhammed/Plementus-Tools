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

function stripTags(html) {
  return String(html || '')
    .replace(/<script[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]+>/g, ' ')
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
    try {
      const response = await requestWithRedirects(candidate.url, {
        rejectUnauthorized: false,
        timeout: timeoutPerPage,
        maxBodyBytes: 900_000
      });
      const found = response.status >= 200 && response.status < 400;
      const finalUrl = response.finalUrl;
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
        html: found ? (response.body || '') : '',
        found
      };
      if (found) seenFinalUrls.set(finalKey, pages.length);
      pages.push(page);
    } catch (error) {
      pages.push({ url: candidate.url, finalUrl: candidate.url, status: 0, groups: [...candidate.groups], source: candidate.source, html: '', found: false, error: error.message });
    }
  }
  return pages;
}

const EVIDENCE_SIGNALS = {
  dataSubjectRights: /\b(right to (access|erasure|be forgotten|rectification|portability|object)|data subject rights?|opt-?out of (the )?sale|do not sell (my|our))\b/i,
  consentManagement: /\b(cookie consent|consent management|manage (cookie )?preferences|onetrust|cookiebot|trustarc|usercentrics|quantcast choice)\b/i,
  breachNotification: /\b(data breach notification|breach notification|incident response (plan|policy|process))\b/i,
  encryption: /\b(encrypt(ed|ion)? (at rest|in transit)|end-to-end encryption|TLS ?1\.[23])\b/i,
  subprocessors: /\b(sub-?processors?|data processing agreement|\bDPA\b)\b/i,
  accessControl: /\b(multi-?factor authentication|\bMFA\b|role-based access control|least privilege)\b/i,
  vulnerabilityMgmt: /\b(penetration test(ing)?|vulnerability (management|disclosure)|bug bounty)\b/i,
  dataRetention: /\b(data retention (policy|period|schedule)|retention schedule)\b/i
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
  const text = pages.filter((p) => p.found && p.html).map((p) => stripTags(p.html)).join(' \n ');

  const evidenceFound = {};
  for (const [key, pattern] of Object.entries(EVIDENCE_SIGNALS)) evidenceFound[key] = pattern.test(text);

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

  return { evidenceFound, certifications, pagesFoundByGroup };
}
