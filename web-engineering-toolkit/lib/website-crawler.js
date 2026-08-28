import crypto from 'node:crypto';
import { URL } from 'node:url';
import { requestWithRedirects } from './http-client.js';
import { SECURITY_SCANNER_USER_AGENT } from './tool-version.js';
import { canonicalizeObservedUrl } from './security-collection-model.js';

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

const LINK_KEYWORD_PATTERN = /privacy|terms|security|trust|complian|legal|gdpr|hipaa|cookie|data.?protection|خصوصية|الشروط|قانوني|ملفات تعريف الارتباط|حماية البيانات|الأمن/i;
const GROUP_RELEVANCE = {
  privacy: /privacy|personal data|data protection|data subject|right to access|right to erasure|خصوصية|بيانات شخصية|حماية البيانات|حقوق صاحب البيانات/i,
  terms: /terms|conditions|acceptable use|user agreement|الشروط|الأحكام/i,
  security: /security|trust|vulnerability|incident response|encryption|security.txt|الأمن|التشفير|الاستجابة للحوادث/i,
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

function decodeEntities(value) {
  return String(value || '').replace(/&nbsp;/gi, ' ').replace(/&amp;/gi, '&').replace(/&lt;/gi, '<').replace(/&gt;/gi, '>').replace(/&quot;/gi, '"').replace(/&#39;|&apos;/gi, "'");
}

function boundedExcerpt(text, index, matchLength, before = 120, after = 180) {
  const start = Math.max(0, Number(index || 0) - before);
  const end = Math.min(text.length, Number(index || 0) + Number(matchLength || 0) + after);
  return text.slice(start, end).replace(/\s+/g, ' ').trim();
}

function evidenceId(key, sourceUrl, excerpt) {
  return `obs_${crypto.createHash('sha256').update(`${key}|${sourceUrl}|${excerpt}`).digest('hex').slice(0, 20)}`;
}

export function detectLocale(page = {}) {
  const html = String(page.html || '');
  const htmlLang = html.match(/<html\b[^>]*\blang\s*=\s*["']?([^"'\s>]+)/i)?.[1] || '';
  if (htmlLang) return htmlLang.toLowerCase().split(/[-_]/)[0];
  try {
    const segments = new URL(page.finalUrl || page.url).pathname.split('/').filter(Boolean);
    const locale = segments.find((segment) => /^(?:ar|en)(?:[-_][a-z]{2})?$/i.test(segment));
    if (locale) return locale.toLowerCase().split(/[-_]/)[0];
  } catch {}
  if (/[؀-ۿ]/.test(stripTags(html).slice(0, 1000))) return 'ar';
  return 'unknown';
}

function extractTitle(html) {
  return (String(html || '').match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] || '')
    .replace(/\s+/g, ' ')
    .trim();
}

export function resolveDocumentCandidate(href, baseUrl) {
  const raw = String(href || '').trim();
  if (!raw || raw.startsWith('#') || /^(?:javascript|data|mailto|tel):/i.test(raw)) return '';
  try {
    const base = new URL(baseUrl);
    const resolved = new URL(raw, base);
    if (!/^https?:$/.test(resolved.protocol) || resolved.origin !== base.origin) return '';
    const sameDocument = resolved.origin === base.origin
      && resolved.pathname === base.pathname
      && resolved.search === base.search;
    if (sameDocument && raw.includes('#')) return '';
    resolved.hash = '';
    return resolved.href;
  } catch {
    return '';
  }
}

function extractLinks(html, baseUrl) {
  const links = [];
  const matches = String(html || '').matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']*)["'][^>]*>([\s\S]*?)<\/a>/gi);
  for (const match of matches) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!LINK_KEYWORD_PATTERN.test(href) && !LINK_KEYWORD_PATTERN.test(text)) continue;
    const documentUrl = resolveDocumentCandidate(href, baseUrl);
    if (!documentUrl) continue;
    try {
      const resolved = new URL(documentUrl);
      const haystack = `${resolved.pathname} ${text}`;
      const groups = [];
      if (/privacy|data.?protection|خصوصية|حماية البيانات/i.test(haystack)) groups.push('privacy');
      if (/terms|conditions|الشروط|الأحكام/i.test(haystack)) groups.push('terms');
      if (/security|trust|الأمن/i.test(haystack)) groups.push('security');
      if (/compliance|legal|gdpr|hipaa|pci|قانوني|امتثال/i.test(haystack)) groups.push('compliance');
      if (/cookie|ملفات تعريف الارتباط/i.test(haystack)) groups.push('cookies');
      links.push({ url: resolved.href, text, groups });
    } catch {}
  }
  return links;
}

function extractLocaleVariantLinks(html, baseUrl) {
  const base = new URL(baseUrl);
  const found = [];
  const add = (href, locale) => {
    if (!href) return;
    try {
      const documentUrl = resolveDocumentCandidate(href, baseUrl);
      if (!documentUrl) return;
      const resolved = new URL(documentUrl);
      const normalizedLocale = String(locale || '').toLowerCase().split(/[-_]/)[0];
      if (!['ar', 'en'].includes(normalizedLocale)) return;
      found.push({ url: resolved.href, locale: normalizedLocale });
    } catch {}
  };
  for (const match of String(html || '').matchAll(/<link\b[^>]*\brel\s*=\s*["'][^"']*alternate[^"']*["'][^>]*>/gi)) {
    const tag = match[0];
    add(tag.match(/\bhref\s*=\s*["']([^"']+)["']/i)?.[1], tag.match(/\bhreflang\s*=\s*["']([^"']+)["']/i)?.[1]);
  }
  for (const match of String(html || '').matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1];
    const label = stripTags(match[2]);
    const locale = href.match(/\/(ar|en)(?:\/|$)/i)?.[1] || (/^(?:العربية|عربي)$/i.test(label) ? 'ar' : /^(?:english|en)$/i.test(label) ? 'en' : '');
    if (locale) add(href, locale);
  }
  return [...new Map(found.map((item) => [`${item.locale}|${normalizeForDedupe(item.url)}`, item])).values()].slice(0, 4);
}

const normalizeForDedupe = canonicalizeObservedUrl;

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
      'User-Agent': SECURITY_SCANNER_USER_AGENT,
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

function xmlLocations(xml, baseUrl) {
  return [...String(xml || '').matchAll(/<loc\b[^>]*>([\s\S]*?)<\/loc>/gi)].map((match) => {
    const value = decodeEntities(match[1]).trim();
    try { return new URL(value, baseUrl).href; } catch { return ''; }
  }).filter(Boolean);
}

async function discoverSitemapUrls(homepageUrl, { timeoutPerPage, maxSitemapDocuments, maxSitemapUrls }) {
  const origin = new URL(homepageUrl).origin;
  const sitemapQueue = [];
  const seenDocuments = new Set();
  const discoveredUrls = [];
  const limitations = [];
  const errors = [];
  const addSitemap = (value, source) => {
    try {
      const url = new URL(value, origin);
      if (url.origin !== origin || seenDocuments.has(canonicalizeObservedUrl(url.href)) || sitemapQueue.some((entry) => canonicalizeObservedUrl(entry.url) === canonicalizeObservedUrl(url.href))) return;
      sitemapQueue.push({ url: url.href, source });
    } catch {}
  };
  try {
    const robots = await fetchPageWithRedirects(new URL('/robots.txt', origin).href, { timeout: timeoutPerPage, maxBodyBytes: 100_000 });
    for (const match of String(robots.body || '').matchAll(/^\s*Sitemap:\s*(\S+)\s*$/gim)) addSitemap(match[1], 'robots');
  } catch (error) {
    errors.push(`robots.txt: ${describeError(error)}`);
  }
  addSitemap(new URL('/sitemap.xml', origin).href, 'default');
  while (sitemapQueue.length && seenDocuments.size < maxSitemapDocuments && discoveredUrls.length < maxSitemapUrls) {
    const entry = sitemapQueue.shift();
    const key = canonicalizeObservedUrl(entry.url);
    if (seenDocuments.has(key)) continue;
    seenDocuments.add(key);
    try {
      const response = await fetchPageWithRedirects(entry.url, { timeout: timeoutPerPage, maxBodyBytes: 500_000 });
      if (response.status < 200 || response.status >= 400) continue;
      const locations = xmlLocations(response.body, response.finalUrl);
      if (/<sitemapindex\b/i.test(response.body || '')) {
        for (const location of locations) addSitemap(location, 'sitemap-index');
      } else {
        for (const location of locations) {
          if (discoveredUrls.length >= maxSitemapUrls) break;
          try {
            const url = new URL(location);
            if (url.origin === origin) discoveredUrls.push(url.href);
          } catch {}
        }
      }
      if (response.truncated) limitations.push(`Sitemap document was truncated: ${response.finalUrl}`);
    } catch (error) {
      errors.push(`${entry.url}: ${describeError(error)}`);
    }
  }
  if (sitemapQueue.length) limitations.push(`Sitemap document limit reached (${maxSitemapDocuments}).`);
  if (discoveredUrls.length >= maxSitemapUrls) limitations.push(`Sitemap URL limit reached (${maxSitemapUrls}).`);
  return {
    urls: [...new Map(discoveredUrls.map((url) => [canonicalizeObservedUrl(url), url])).values()],
    documentsRequested: seenDocuments.size,
    errors,
    limitations
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
export async function discoverEvidencePages(homepageUrl, homepageHtml, { maxPages = 10, timeoutPerPage = 8000, maxSitemapDocuments = 3, maxSitemapUrls = 100 } = {}) {
  const origin = new URL(homepageUrl);
  const candidates = new Map();

  const addCandidate = (href, groupId, source) => {
    const documentUrl = resolveDocumentCandidate(href, homepageUrl);
    if (!documentUrl) return;
    const key = normalizeForDedupe(documentUrl);
    if (key === normalizeForDedupe(homepageUrl)) return;
    if (!candidates.has(key)) candidates.set(key, { url: documentUrl, groups: new Set(), source });
    if (groupId) candidates.get(key).groups.add(groupId);
  };

  for (const [groupId, paths] of Object.entries(EVIDENCE_PATH_GROUPS)) {
    for (const p of paths) {
      try { addCandidate(new URL(p, origin).href, groupId, 'well-known-path'); } catch {}
      const homepageLocale = detectLocale({ finalUrl: homepageUrl, html: homepageHtml });
      if (['ar', 'en'].includes(homepageLocale)) {
        try { addCandidate(new URL(`/${homepageLocale}${p}`, origin).href, groupId, 'locale-well-known-path'); } catch {}
      }
    }
  }
  for (const link of extractLinks(homepageHtml, homepageUrl)) {
    if (link.groups.length) for (const group of link.groups) addCandidate(link.url, group, 'homepage-link');
    else addCandidate(link.url, null, 'homepage-link');
  }
  for (const variant of extractLocaleVariantLinks(homepageHtml, homepageUrl)) addCandidate(variant.url, 'locale', 'homepage-locale-link');

  const sitemapDiscovery = await discoverSitemapUrls(homepageUrl, {
    timeoutPerPage: Math.max(500, Math.min(15_000, Number(timeoutPerPage) || 8000)),
    maxSitemapDocuments: Math.max(1, Math.min(10, Number(maxSitemapDocuments) || 3)),
    maxSitemapUrls: Math.max(1, Math.min(500, Number(maxSitemapUrls) || 100))
  });
  for (const sitemapUrl of sitemapDiscovery.urls) {
    const groups = extractLinks(`<a href="${sitemapUrl}">${sitemapUrl}</a>`, homepageUrl).flatMap((item) => item.groups);
    if (groups.length) for (const group of groups) addCandidate(sitemapUrl, group, 'sitemap');
    else if (LINK_KEYWORD_PATTERN.test(sitemapUrl)) addCandidate(sitemapUrl, null, 'sitemap');
  }

  // Prefer links the site actually surfaces over guessed well-known paths.
  const priority = { 'homepage-link': 0, 'homepage-locale-link': 0, sitemap: 1, 'locale-well-known-path': 2, 'well-known-path': 3 };
  const ordered = [...candidates.values()].sort((a, b) => (priority[a.source] ?? 4) - (priority[b.source] ?? 4));
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
        detectedLocale: found ? detectLocale({ finalUrl, html: response.body || '' }) : 'unknown',
        collectedAt: new Date().toISOString(),
        found,
        error: primaryError ? `Primary HTTP client failed; fetch fallback succeeded: ${describeError(primaryError)}` : ''
      };
      if (found) seenFinalUrls.set(finalKey, pages.length);
      pages.push(page);
    } catch (error) {
      pages.push({ url: candidate.url, finalUrl: candidate.url, status: 0, groups: [...candidate.groups], source: candidate.source, html: '', found: false, detectedLocale: detectLocale({ finalUrl: candidate.url }), collectedAt: new Date().toISOString(), error: describeError(error) });
    }
  }
  const pageFailures = pages.filter((page) => page.status === 0).length;
  const budgetReached = ordered.length > selected.length;
  const limitations = [...sitemapDiscovery.limitations];
  if (budgetReached) limitations.push(`Crawl page limit reached (${selected.length}).`);
  if (pageFailures) limitations.push(`${pageFailures} selected page request(s) failed.`);
  Object.defineProperty(pages, 'collectionMetadata', {
    value: {
      state: pageFailures || budgetReached || limitations.length ? 'partial' : 'completed',
      selectedPageCount: selected.length,
      candidateCount: ordered.length,
      pageFailures,
      sitemapDocumentsRequested: sitemapDiscovery.documentsRequested,
      sitemapErrors: sitemapDiscovery.errors,
      limitations
    },
    enumerable: false
  });
  return pages;
}

const EVIDENCE_SIGNALS = {
  dataSubjectRights: { label: 'Data rights', category: 'privacy', pattern: /\b(right to (access|erasure|be forgotten|rectification|portability|object)|data subject rights?|your (privacy |data )?rights|(?:you|individuals?|users?) (?:may|can) (?:ask|request)(?: us)? to .{0,90}(?:access|correct|rectif|delete|erase|portab|object|restrict)|opt-?out of (the )?sale|do not sell (my|our))\b/i },
  consentManagement: { label: 'Consent management', category: 'privacy', pattern: /\b(cookie consent|consent management|manage (cookie )?preferences|onetrust|cookiebot|trustarc|usercentrics|quantcast choice)\b/i },
  consentInterfaceClaim: { label: 'Consent-interface claim', category: 'privacy-claim', pattern: /\b(cookie (?:banner|pop-?up|preference cent(?:er|re))|(?:manage|set|change) (?:your )?cookie preferences?.{0,80}(?:banner|first visit)|banner.{0,80}(?:cookie|consent|preferences?))\b/i },
  breachNotification: { label: 'Breach notification / incident response', category: 'security-operations', pattern: /\b(data breach notification|breach notification|incident response (plan|policy|process))\b/i },
  encryption: { label: 'Encryption', category: 'technical-control', pattern: /\b(encrypt(ed|ion)? (at rest|in transit)|end-to-end encryption|TLS ?1\.[23])\b/i },
  subprocessors: { label: 'Processors / DPA', category: 'privacy', pattern: /\b(sub-?processors?|processors?|data processing agreement|service providers?.{0,60}(?:act as|process(?:ing|ors?)?)|\bDPA\b)\b/i },
  accessControl: { label: 'Access control', category: 'security-control', pattern: /\b(multi-?factor authentication|\bMFA\b|role-based access control|least privilege)\b/i },
  vulnerabilityMgmt: { label: 'Vulnerability management', category: 'security-operations', pattern: /\b(penetration test(ing)?|vulnerability (management|disclosure)|bug bounty)\b/i },
  dataRetention: { label: 'Data retention', category: 'privacy', pattern: /\b(data retention\b|retention (?:policy|period|schedule)|how long we (?:keep|retain)|(?:keep|retain)(?:s|ed|ing)? .{0,80}(?:data|information|records).{0,50}(?:for|until|while|as long)|(?:data|information|records).{0,50}(?:is|are|will be)?\s*(?:deleted|erased|retained).{0,50}(?:within|for|after|upon)|(?:delete|erase) or anonymi[sz]e)\b/i },
  auditLogging: { label: 'Audit logging', category: 'security-control', pattern: /\b(audit log|audit logging|activity logs?|access logs?)\b/i },
  availabilityBackup: { label: 'Backup / availability', category: 'resilience', pattern: /\b(backup|disaster recovery|business continuity|availability commitment|uptime)\b/i },
  paymentContext: { label: 'Payment context', category: 'payment', pattern: /\b(payment|checkout|billing|stripe|paypal|adyen|braintree)\b/i },
  paymentProcessing: { label: 'Payment-processing context', category: 'payment', pattern: /\b((?:process|accept|handle|store|transmit)(?:es|ed|ing)? .{0,50}(?:payments?|payment details?|payment cards?|credit cards?|debit cards?)|payment(?:s| details?)? (?:are|is)?\s*.{0,35}(?:processed|handled|redirected)|hosted checkout|payment (?:provider|processor))\b/i },
  healthcareContext: { label: 'Healthcare marketing context', category: 'healthcare', pattern: /\b(healthcare|health care|medical|wellness)\b/i },
  healthcarePhi: { label: 'PHI-handling context', category: 'healthcare', pattern: /\b(protected health information|electronic protected health information|ePHI|\bPHI\b|HIPAA|patient (?:records?|data|information)|business associate agreement|\bBAA\b)\b/i },
  hipaaApplicability: { label: 'HIPAA / PHI applicability', category: 'healthcare', pattern: /\b(HIPAA|protected health information|\bPHI\b|covered entit(?:y|ies)|business associate agreement|\bBAA\b|patient portal)\b/i },
  pciApplicability: { label: 'PCI / cardholder applicability', category: 'payment', pattern: /\b(PCI[\s-]?DSS|cardholder data|card(?:holder)? data environment|\bCDE\b|payment card data|(?:full )?(?:credit |debit )?card numbers?|card security code|\bCVV\b|\bCVC\b)\b/i },
  noAdvertisingCookiesClaim: { label: 'No-advertising-cookie claim', category: 'privacy-claim', pattern: /\b(?:do not|does not|don't|doesn't|no) (?:set|use|place|deploy)?\s*(?:any )?(?:advertising|marketing|targeting) cookies?\b/i },
  noTrackingClaim: { label: 'No-tracking claim', category: 'privacy-claim', pattern: /\b(?:do not|does not|don't|doesn't|no) (?:track|use tracking|deploy tracking)\b/i }
};

const CERTIFICATION_SIGNALS = {
  'iso-27001': /\bISO\/?IEC\s?27001\b/i,
  'soc-2': /\bSOC\s?2\b/i,
  'pci-dss': /\bPCI[\s-]?DSS\b/i,
  hipaa: /\bHIPAA\b/i,
  gdpr: /\bGDPR\b/i,
  ccpa: /\bCCPA\b/i
};

const POLICY_TEMPLATE_PATTERNS = [
  /you should update this document/i, /suggested text/i, /sample text/i, /placeholder/i,
  /optional subtitle goes here/i, /lorem ipsum/i, /replace this text/i, /coming soon/i,
  /\bTBD\b/i, /to be completed/i, /insert (?:company|name|date|text) here/i,
  /نص (?:مقترح|تجريبي|افتراضي)/i, /نص بديل/i, /يرجى (?:تحديث|استبدال) (?:هذا )?النص/i,
  /قريباً|قريبا/i, /قيد (?:الإنشاء|الإعداد|الاستكمال)/i, /يتم استكماله لاحقاً|يتم استكماله لاحقا/i
];
const POLICY_DRAFT_PATTERNS = [/\bdraft\b/i, /work in progress/i, /under construction/i, /مسودة/i, /قيد المراجعة/i];

export function analyzePolicyDocumentQuality(pages = []) {
  return pages.filter((page) => page.found && (page.groups || []).some((group) => ['privacy', 'terms', 'compliance', 'cookies'].includes(group))).map((page) => {
    const text = decodeEntities(stripTags(page.html));
    const templateMatch = POLICY_TEMPLATE_PATTERNS.map((pattern) => text.match(pattern)).find(Boolean);
    const draftMatch = POLICY_DRAFT_PATTERNS.map((pattern) => text.match(pattern)).find(Boolean);
    let quality = 'unknown';
    let confidence = 'medium';
    let excerpt = '';
    if (!page.html || !text) quality = page.error || /<script\b/i.test(page.html || '') ? 'failed_to_extract' : 'insufficient_content';
    else if (templateMatch) {
      quality = 'template_or_placeholder_detected';
      confidence = 'high';
      excerpt = boundedExcerpt(text, templateMatch.index, templateMatch[0].length, 80, 120);
    } else if (draftMatch) {
      quality = 'likely_draft';
      confidence = 'high';
      excerpt = boundedExcerpt(text, draftMatch.index, draftMatch[0].length, 80, 120);
    } else if (text.length < 160 || text.split(/\s+/).length < 28) quality = 'insufficient_content';
    else quality = 'substantive';
    const sourceUrl = page.finalUrl || page.url;
    return {
      documentId: evidenceId('policyDocumentQuality', sourceUrl, excerpt || text.slice(0, 160)),
      sourceUrl,
      pageTitle: page.title || '',
      documentGroups: [...(page.groups || [])],
      detectedLocale: page.detectedLocale || detectLocale(page),
      policyDocumentQuality: quality,
      confidence,
      excerpt,
      collectionMethod: page.source === 'browser-rendered' ? 'browser_runtime' : 'bounded_public_crawl',
      observedAt: page.collectedAt || new Date().toISOString(),
      limitations: ['Document quality is a bounded content heuristic and is not a legal-validity determination.']
    };
  });
}

const GDPR_NOTICE_ELEMENTS = {
  controller_identity: /\b(data controller|controller responsible|we[, ]+(?:a company|are [^.]{2,80}(?:company|organisation|organization)))\b|(?:هوية|اسم) (?:المتحكم|جهة التحكم)|نحن شركة/i,
  controller_contact: /\b(contact (?:us|the controller)|privacy@|data protection (?:contact|team)|email us at)\b|للتواصل (?:معنا|مع المتحكم)|البريد الإلكتروني/i,
  dpo_contact: /\b(data protection officer|\bDPO\b)\b|مسؤول حماية البيانات/i,
  processing_purposes: /\b(purposes? (?:for which|of processing)|we (?:use|process|collect) (?:your )?(?:personal )?(?:data|information) (?:to|for))\b|أغراض المعالجة|نستخدم بياناتك (?:من أجل|لـ)/i,
  legal_bases: /\b(legal basis|lawful basis|legitimate interests?|performance of (?:a |the )?contract|legal obligation)\b|الأساس القانوني|مصلحة مشروعة|التزام قانوني/i,
  recipient_categories: /\b(categories of recipients|share (?:your )?(?:personal )?(?:data|information) with|service providers|recipients of)\b|فئات المستلمين|نشارك بياناتك مع|مقدمي الخدمات/i,
  international_transfers: /\b(international transfers?|outside (?:the )?(?:eea|european economic area|country)|standard contractual clauses|cross-border transfer)\b|نقل البيانات (?:دولي|خارج)|خارج المنطقة الاقتصادية الأوروبية/i,
  retention_periods: /\b(retention (?:period|schedule)|how long we (?:keep|retain)|retain .{0,90}(?:for|until)|deleted within \d+)\b|مدة الاحتفاظ|نحتفظ .{0,80}(?:لمدة|حتى)/i,
  data_subject_rights: /\b(data subject rights?|right to (?:access|erasure|rectification|portability|object|restrict)|you (?:may|can) (?:ask|request).{0,80}(?:access|correct|delete))\b|حقوق (?:صاحب|أصحاب) البيانات|حق (?:الوصول|المحو|التصحيح|الاعتراض)/i,
  right_to_complain: /\b(right to (?:lodge a )?complain|complaint with (?:a |the )?(?:supervisory|data protection) authority)\b|الحق في (?:تقديم )?شكوى|سلطة حماية البيانات/i,
  automated_decision_making: /\b(automated decision(?:-making)?|profiling|no solely automated decisions)\b|اتخاذ القرار الآلي|التنميط/i,
  required_vs_optional_data: /\b(required (?:or|versus|vs\.?) optional|mandatory (?:information|fields?|data)|optional (?:information|fields?|data)|failure to provide)\b|البيانات (?:الإلزامية|الاختيارية)|عدم تقديم البيانات/i,
  withdrawal_of_consent: /\b(withdraw (?:your )?consent|consent may be withdrawn|revoke (?:your )?consent)\b|سحب (?:الموافقة|موافقتك)|إلغاء الموافقة/i,
  processor_information: /\b(sub-?processors?|data processors?|service providers?.{0,80}process|processed by (?:our |a )?(?:provider|processor))\b|معالج(?:و|ي)? البيانات|المعالجين|مقدمي الخدمات/i,
  cookie_information: /\b(cookie (?:policy|notice|preferences?|banner)|we use cookies|manage (?:your )?cookies)\b|سياسة ملفات تعريف الارتباط|نستخدم ملفات تعريف الارتباط|إعدادات ملفات تعريف الارتباط/i
};

export function buildGdprPublicNoticeMatrix(pages = []) {
  const applicablePages = pages.filter((page) => page.found && (page.groups || []).some((group) => ['privacy', 'cookies', 'compliance'].includes(group)));
  const candidates = applicablePages.filter((page) => page.html);
  const failedCandidates = applicablePages.filter((page) => !page.html || page.error);
  return Object.entries(GDPR_NOTICE_ELEMENTS).map(([element, pattern]) => {
    for (const page of candidates) {
      const text = decodeEntities(stripTags(page.html));
      const match = text.match(pattern);
      if (!match) continue;
      const excerpt = boundedExcerpt(text, match.index, match[0].length);
      const beforeWindow = text.slice(Math.max(0, Number(match.index || 0) - 80), Number(match.index || 0));
      const before = beforeWindow.split(/[.!?؟]/).at(-1) || '';
      if (/(?:do|does|did|will) not (?:state|describe|provide|include|identify|explain)|no information (?:about|on)|not available|غير (?:مذكور|متاح)|لا (?:نذكر|نوضح|نقدم)/i.test(before)) continue;
      const partial = /\b(?:might|could|where applicable|as appropriate|generally)\b|\bmay\s+(?:rely|share|provide|include|apply|process)\b|قد |عند الاقتضاء|بشكل عام/i.test(`${before} ${match[0]}`);
      const sourceUrl = page.finalUrl || page.url;
      const ref = evidenceId(`gdprNotice:${element}`, sourceUrl, excerpt);
      return {
        element,
        state: partial ? 'partially_observed' : 'observed',
        evidenceRefs: [ref],
        evidenceItems: [{ evidenceId: ref, key: `gdprNotice:${element}`, sourceUrl, excerpt, evidenceText: excerpt, collectionMethod: 'bounded_public_crawl', sourceMethod: 'public_policy_text', observedAt: page.collectedAt || new Date().toISOString(), detectedLocale: page.detectedLocale || detectLocale(page), confidence: 'medium', evidenceType: 'public_policy_text', evidenceStrength: 'policy_claim', limitations: ['Public notice text is a policy claim and was not verified as organizational practice or legal sufficiency.'] }],
        confidence: partial ? 'low' : 'medium',
        limitations: ['Observed wording is candidate public-notice evidence, not a GDPR compliance determination.']
      };
    }
    if (!candidates.length && failedCandidates.length) return { element, state: 'failed_to_assess', evidenceRefs: [], evidenceItems: [], confidence: 'not_assessed', reason: 'Public-notice extraction failed for the applicable page(s).', limitations: ['Failed to assess means extraction or testing did not complete; it is not an adverse GDPR conclusion.'] };
    return { element, state: candidates.length ? 'not_observed' : 'not_assessed', evidenceRefs: [], evidenceItems: [], confidence: candidates.length ? 'medium' : 'not_assessed', limitations: ['Not observed means the bounded crawl did not locate candidate wording; it is not a violation determination.'] };
  });
}

export function contentLocaleFromRoute(page = {}) {
  try {
    const segments = new URL(page.finalUrl || page.url).pathname.split('/').filter(Boolean);
    const locale = segments.find((segment) => /^(?:ar|en)(?:[-_][a-z]{2})?$/i.test(segment));
    return locale ? locale.toLowerCase().split(/[-_]/)[0] : '';
  } catch {
    return '';
  }
}

function buildLocaleCoverage(pages, evidenceItems) {
  const found = pages.filter((page) => page.found);
  const discoverable = pages.filter((page) => page.found || page.source === 'homepage-locale-link');
  const languageSignals = [...new Set(discoverable.flatMap((page) => [
    ...(Array.isArray(page.languageSignals) ? page.languageSignals : []),
    page.detectedLocale || detectLocale(page)
  ]).map(String).filter((locale) => locale && locale !== 'unknown'))].sort();
  const locales = [...new Set(discoverable.map(contentLocaleFromRoute).filter(Boolean))].sort();
  const policyLocalesTested = [...new Set(found
    .filter((page) => (page.groups || []).some((group) => ['privacy', 'terms', 'cookies', 'compliance'].includes(group)))
    .map(contentLocaleFromRoute)
    .filter(Boolean))].sort();
  const evidenceByLocale = Object.fromEntries(locales.map((locale) => [locale, [...new Set(evidenceItems.filter((item) => item.detectedLocale === locale).map((item) => item.key))].sort()]));
  const signatures = new Set(Object.values(evidenceByLocale).map((keys) => keys.join('|')));
  let localeCoverage = !locales.length ? 'locale_parity_not_assessed' : locales.length === 1 ? 'single_locale_observed' : 'multiple_locales_observed';
  if (locales.length > policyLocalesTested.length) localeCoverage = 'partial_locale_coverage';
  else if (locales.length > 1 && signatures.size > 1) localeCoverage = 'potential_locale_content_difference';
  const localeParity = locales.length <= 1 || locales.length > policyLocalesTested.length
    ? 'locale_parity_not_assessed'
    : signatures.size > 1
      ? 'potential_locale_content_difference'
      : 'no_material_difference_observed';
  return { detectedLocale: locales[0] || 'unknown', testedLocale: policyLocalesTested[0] || 'unknown', availableLocales: locales, contentLocalesDiscovered: locales, policyLocalesTested, languageSignals, localeCoverage, localeParity, evidenceByLocale };
}

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
      const text = decodeEntities(stripTags(page.html));
      const match = text.match(signal.pattern);
      if (!match) continue;
      evidenceFound[key] = true;
      const excerpt = boundedExcerpt(text, match.index, String(match[0]).length);
      const sourceUrl = page.finalUrl || page.url;
      evidenceItems.push({
        evidenceId: evidenceId(key, sourceUrl, excerpt),
        key,
        label: signal.label,
        category: signal.category,
        sourceUrl,
        pageTitle: page.title || '',
        keyword: match[0],
        evidenceText: excerpt,
        excerpt,
        detectedLocale: page.detectedLocale || detectLocale(page),
        collectionMethod: 'bounded_public_crawl',
        sourceMethod: 'public_policy_text',
        observedAt: page.collectedAt || new Date().toISOString(),
        confidence: 'medium',
        evidenceType: 'public_policy_text',
        evidenceStrength: 'policy_claim',
        limitations: ['Public text is a policy claim or scope signal; organizational implementation was not verified.']
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

  const policyDocuments = analyzePolicyDocumentQuality(pages);
  const gdprPublicNoticeMatrix = buildGdprPublicNoticeMatrix(pages);
  const gdprNoticeEvidence = gdprPublicNoticeMatrix.flatMap((item) => item.evidenceItems || []);
  const locale = buildLocaleCoverage(pages, [...evidenceItems, ...gdprNoticeEvidence]);
  return { evidenceFound, evidenceItems: [...evidenceItems, ...gdprNoticeEvidence], certifications, pagesFoundByGroup, policyDocuments, gdprPublicNoticeMatrix, ...locale };
}
