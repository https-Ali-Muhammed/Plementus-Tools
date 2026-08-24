import { URL } from 'node:url';
import tls from 'node:tls';
import dns from 'node:dns/promises';
import { requestWithRedirects } from './http-client.js';
import { discoverEvidencePages, extractComplianceEvidence } from './website-crawler.js';
import { detectBrowsers } from './environment-checker.js';
import { sleep } from './utils.js';
import { buildControlEvaluations, buildFindings, buildTestResults } from './security-finding-model.js';
import { runZapScan } from './zap-runner.js';

const SCANNER_VERSION = '1.5.0';
const RESULT_STATES = {
  confirmed: 'Confirmed',
  observed: 'Observed',
  inferred: 'Inferred',
  not_tested: 'Not Tested',
  failed_to_test: 'Failed To Test'
};

const FRAMEWORKS = {
  'iso-27001': { label: 'ISO 27001' },
  gdpr: { label: 'GDPR' },
  'soc-2': { label: 'SOC 2' },
  hipaa: { label: 'HIPAA' },
  'pci-dss': { label: 'PCI DSS' },
  local: { label: 'Local Regulations' }
};

const CHECK_FRAMEWORKS = {
  https: ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss', 'local'],
  'http-to-https': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  certificate: ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  tls: ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  'ocsp-stapling': ['iso-27001', 'soc-2', 'pci-dss'],
  'dns-caa': ['iso-27001', 'soc-2', 'pci-dss'],
  hsts: ['iso-27001', 'soc-2', 'hipaa', 'pci-dss'],
  csp: ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  clickjacking: ['iso-27001', 'soc-2', 'hipaa', 'pci-dss'],
  nosniff: ['iso-27001', 'soc-2', 'hipaa', 'pci-dss'],
  'referrer-policy': ['gdpr', 'iso-27001', 'soc-2'],
  'permissions-policy': ['gdpr', 'iso-27001', 'soc-2'],
  'cross-origin-policies': ['iso-27001', 'gdpr', 'soc-2'],
  cookies: ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss', 'local'],
  'runtime-cookies': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss', 'local'],
  'authenticated-session': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  'authenticated-crawl': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  'access-control-candidates': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  cors: ['iso-27001', 'soc-2', 'hipaa', 'pci-dss'],
  disclosure: ['iso-27001', 'soc-2', 'pci-dss'],
  'mixed-content': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  'password-transport': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  privacy: ['gdpr', 'local'],
  consent: ['gdpr', 'local'],
  'consent-behavior': ['gdpr', 'local'],
  'third-party-scripts': ['gdpr', 'iso-27001', 'soc-2'],
  'browser-security': ['iso-27001', 'gdpr', 'soc-2'],
  'security-txt': ['iso-27001', 'soc-2'],
  'evidence-privacy-page': ['gdpr', 'hipaa', 'local'],
  'evidence-security-page': ['iso-27001', 'soc-2', 'pci-dss'],
  'evidence-compliance-page': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss', 'local'],
  'evidence-data-subject-rights': ['gdpr', 'local'],
  'evidence-consent-management': ['gdpr', 'local'],
  'evidence-breach-notification': ['gdpr', 'hipaa', 'iso-27001', 'soc-2'],
  'evidence-certifications': ['iso-27001', 'soc-2', 'pci-dss']
};

const REFERENCES = {
  headers: 'https://cheatsheetseries.owasp.org/cheatsheets/HTTP_Headers_Cheat_Sheet.html',
  observatory: 'https://developer.mozilla.org/en-US/observatory',
  zapPassive: 'https://www.zaproxy.org/docs/desktop/addons/passive-scan-rules/',
  sslLabs: 'https://github.com/ssllabs/research/wiki/SSL-Server-Rating-Guide',
  cors: 'https://owasp.org/www-project-web-security-testing-guide/latest/4-Web_Application_Security_Testing/11-Client-side_Testing/07-Testing_Cross_Origin_Resource_Sharing'
};

function defaultSeverity(status) {
  return ({ fail: 'high', warning: 'medium', manual: 'manual', info: 'informational', pass: 'informational' })[status] || 'informational';
}

function describeError(error) {
  if (error?.message) return error.message;
  const nested = Array.isArray(error?.errors) ? error.errors : [];
  const details = nested.map((item) => item?.message || item?.code).filter(Boolean);
  if (details.length) return details.slice(0, 3).join(' | ');
  return String(error?.code || error?.name || 'Request failed');
}

function result({ id, title, category, status, summary, details = '', recommendation = '', evidence = '', affectedUrl = '', severity = '', references = [], evidenceItems = [], instances = [], testState = '', confidence = '', testMethod = '', limitations = [] }) {
  const resolvedTestState = testState || (status === 'manual' ? 'not_tested' : status === 'info' ? 'observed' : 'confirmed');
  return {
    id, title, category, status, severity: severity || defaultSeverity(status), summary, details, recommendation, evidence, affectedUrl, references, evidenceItems, instances,
    frameworks: CHECK_FRAMEWORKS[id] || [],
    testState: resolvedTestState,
    testStateLabel: RESULT_STATES[resolvedTestState] || resolvedTestState,
    confidence: confidence || (resolvedTestState === 'confirmed' ? 'confirmed' : resolvedTestState === 'observed' ? 'observed' : resolvedTestState === 'inferred' ? 'inferred' : 'not_tested'),
    testMethod,
    limitations: Array.isArray(limitations) ? limitations.filter(Boolean) : []
  };
}

// --- Cookie sensitivity classification -------------------------------------
// Not every cookie is a session/auth cookie, so flagging every missing
// attribute at the same severity produces noisy false positives (e.g. a
// language-preference cookie is not equivalent to a session-id cookie).
const SENSITIVE_COOKIE_PATTERN = /session|(?:^|[_-])sid(?:[_-]|$)|auth|token|jwt|login|logged.?in|user.?id|uid|csrf|xsrf|remember.?me|account|credential|refresh/i;
const TRACKING_COOKIE_PATTERN = /^(_ga|_gid|_gat|_fbp|_fbc|_gcl|_hj|_pk_|_uetsid|_uetvid|amplitude|mixpanel|intercom|hubspot|_clck|_clsk)/i;
const FUNCTIONAL_COOKIE_PATTERN = /(^|[_-])(lang|locale|currency|theme|region|timezone|consent|cookie.?consent|cookieconsent|display|layout)([_-]|$)/i;
const TRACKING_HOST_PATTERN = /(^|\.)(google-analytics\.com|googletagmanager\.com|doubleclick\.net|facebook\.net|connect\.facebook\.net|hotjar\.com|segment\.io|mixpanel\.com|amplitude\.com|clarity\.ms)$/i;

function classifyCookie(name) {
  if (SENSITIVE_COOKIE_PATTERN.test(name)) return 'session-or-auth';
  if (TRACKING_COOKIE_PATTERN.test(name)) return 'tracking-analytics';
  if (FUNCTIONAL_COOKIE_PATTERN.test(name)) return 'functional-preference';
  return 'unclassified';
}

function expectedCookieAttributes(category) {
  if (category === 'session-or-auth') return ['Secure', 'HttpOnly', 'SameSite'];
  if (category === 'tracking-analytics' || category === 'functional-preference') return ['Secure', 'SameSite'];
  return ['Secure', 'SameSite'];
}

function cookieChecks(cookies = []) {
  if (!cookies.length) {
    return result({ id: 'cookies', title: 'Cookie security attributes', category: 'Privacy & session', status: 'info', summary: 'No Set-Cookie headers were observed on the scanned response.', details: 'Cookies may still be created after JavaScript runs or on other pages.', recommendation: 'Review authenticated/session pages as well if the website uses cookies.' });
  }
  const highSeverity = [];
  const lowSeverity = [];
  const details = [];
  const instances = [];
  for (const cookie of cookies) {
    const name = cookie.split('=')[0]?.trim() || 'cookie';
    const lower = cookie.toLowerCase();
    const category = classifyCookie(name);
    const expected = expectedCookieAttributes(category);
    const missing = [];
    if (expected.includes('Secure') && !lower.includes('; secure')) missing.push('Secure');
    if (expected.includes('HttpOnly') && !lower.includes('; httponly')) missing.push('HttpOnly');
    if (expected.includes('SameSite') && !lower.includes('; samesite=')) missing.push('SameSite');
    if (!missing.length) continue;
    const entry = `${name} [${category}]: missing ${missing.join(', ')}`;
    details.push(entry);
    instances.push({ name, category, missing, raw: cookie.replace(/^([^=]+)=([^;]*)/, '$1=[REDACTED]') });
    if (category === 'session-or-auth') highSeverity.push(entry);
    else lowSeverity.push(entry);
  }
  const status = highSeverity.length ? 'fail' : lowSeverity.length ? 'info' : 'pass';
  return result({
    id: 'cookies', title: 'Cookie security attributes', category: 'Privacy & session',
    status,
    summary: highSeverity.length
      ? `${highSeverity.length} session/authentication cookie(s) are missing Secure, HttpOnly, or SameSite attributes.`
      : lowSeverity.length
        ? `${lowSeverity.length} lower-sensitivity cookie(s) (preferences/analytics) are missing recommended attributes; no session or auth cookies were flagged.`
        : 'Observed cookies use attributes appropriate to their apparent sensitivity.',
    details: details.join(' · '),
    recommendation: highSeverity.length
      ? 'Add Secure, HttpOnly, and SameSite attributes to session/authentication cookies as a priority.'
      : (lowSeverity.length ? 'Consider adding Secure and SameSite to preference/analytics cookies where practical; HttpOnly is not expected for many JavaScript-managed cookies.' : ''),
    evidence: `${cookies.length} Set-Cookie header${cookies.length === 1 ? '' : 's'} observed; classified by likely sensitivity (session/auth vs. tracking vs. functional).`,
    instances,
    testMethod: 'HTTP Set-Cookie response header analysis'
  });
}

function browserCookieChecks(cookies = [], affectedUrl = '', browserScan = {}) {
  const partial = browserScan.state === 'observed';
  const runtimeMeta = {
    testState: browserScan.state || 'confirmed',
    confidence: partial ? 'observed' : 'confirmed',
    testMethod: 'Headless browser cookie snapshot',
    limitations: browserScan.limitations || []
  };
  if (!cookies.length) {
    return result({ id: 'runtime-cookies', title: 'Runtime browser cookies', category: 'Privacy & session', status: 'info', summary: partial ? 'No runtime cookies were captured before the browser navigation timed out; this is a partial observation.' : 'No cookies were present after the page executed in a browser.', details: 'This does not cover authenticated areas or user interactions.', affectedUrl, ...runtimeMeta });
  }
  const sensitiveMissing = [];
  const lowerSensitivity = [];
  const instances = [];
  for (const cookie of cookies) {
    const category = classifyCookie(cookie.name || '');
    const expected = expectedCookieAttributes(category);
    const missing = [];
    if (expected.includes('Secure') && !cookie.secure) missing.push('Secure');
    if (expected.includes('HttpOnly') && !cookie.httpOnly) missing.push('HttpOnly');
    if (expected.includes('SameSite') && (!cookie.sameSite || String(cookie.sameSite).toLowerCase() === 'none' && !cookie.secure)) missing.push('SameSite/Secure pairing');
    if (!missing.length) continue;
    const entry = `${cookie.name} [${category}]: missing ${missing.join(', ')}`;
    instances.push({
      name: cookie.name,
      category,
      missing,
      raw: `${cookie.name}=[REDACTED]; domain=${cookie.domain || ''}; path=${cookie.path || '/'}; secure=${Boolean(cookie.secure)}; httpOnly=${Boolean(cookie.httpOnly)}; sameSite=${cookie.sameSite || '(none)'}`
    });
    if (category === 'session-or-auth') sensitiveMissing.push(entry);
    else lowerSensitivity.push(entry);
  }
  const status = sensitiveMissing.length ? 'fail' : lowerSensitivity.length ? 'info' : 'pass';
  return result({
    id: 'runtime-cookies', title: 'Runtime browser cookies', category: 'Privacy & session',
    status,
    severity: sensitiveMissing.length ? 'high' : lowerSensitivity.length ? 'informational' : 'informational',
    summary: sensitiveMissing.length
      ? `${sensitiveMissing.length} browser cookie(s) that look session/auth related are missing expected attributes.`
      : lowerSensitivity.length
        ? `${lowerSensitivity.length} lower-sensitivity runtime cookie(s) are missing recommended attributes.`
        : 'Runtime cookies observed in the browser have attributes appropriate to their apparent sensitivity.',
    details: [...sensitiveMissing, ...lowerSensitivity].slice(0, 30).join(' · '),
    recommendation: sensitiveMissing.length ? 'Set Secure, HttpOnly, and SameSite on authentication/session cookies.' : '',
    affectedUrl,
    references: [REFERENCES.zapPassive],
    instances,
    ...runtimeMeta
  });
}

function findThirdPartyScripts(html, baseUrl) {
  const scripts = [...String(html || '').matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["'][^>]*>/gi)].map((match) => match[1]);
  const base = new URL(baseUrl);
  const thirdParty = [];
  for (const source of scripts) {
    try {
      const parsed = new URL(source, base);
      if (/^https?:$/.test(parsed.protocol) && parsed.hostname !== base.hostname) thirdParty.push(parsed.hostname);
    } catch {}
  }
  return [...new Set(thirdParty)];
}

function extractLinkedEvidencePages(headers, html, baseUrl) {
  const found = { privacy: [], terms: [], security: [], compliance: [] };
  const add = (group, href) => {
    try {
      const url = new URL(href, baseUrl);
      const base = new URL(baseUrl);
      if (!/^https?:$/.test(url.protocol) || url.hostname !== base.hostname) return;
      found[group].push(url.href);
    } catch {}
  };

  const linkHeader = headers.link || '';
  for (const match of String(linkHeader).matchAll(/<([^>]+)>\s*;\s*rel="?([^",;]+)"?/gi)) {
    const rel = match[2].toLowerCase();
    if (rel === 'privacy-policy') add('privacy', match[1]);
    if (rel === 'terms-of-service') add('terms', match[1]);
  }

  for (const match of String(html || '').matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a>/gi)) {
    const href = match[1];
    const text = match[2].replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    const haystack = `${href} ${text}`;
    if (/privacy/i.test(haystack)) add('privacy', href);
    if (/\bterms?\b|terms.of.service|conditions/i.test(haystack)) add('terms', href);
    if (/security|trust/i.test(haystack)) add('security', href);
    if (/compliance|legal|gdpr|iso-?27001|soc-?2|pci|hipaa/i.test(href)) add('compliance', href);
  }

  return Object.fromEntries(Object.entries(found).map(([group, urls]) => [group, [...new Set(urls)]]));
}

// --- CSP directive-level analysis -------------------------------------------
// A CSP header existing at all used to be treated as "passed". A CSP of
// `default-src *` technically exists but provides essentially no protection,
// so this checks the directives that actually determine strength.
function parseCsp(cspHeader) {
  const directives = {};
  for (const part of String(cspHeader || '').split(';')) {
    const trimmed = part.trim();
    if (!trimmed) continue;
    const [name, ...values] = trimmed.split(/\s+/);
    if (name) directives[name.toLowerCase()] = values;
  }
  return directives;
}

function analyzeCsp(cspHeader) {
  if (!cspHeader) return { present: false, strength: 'missing', directives: {}, issues: [], strengths: [], missingDirectives: [], nonceOrHashUsed: false };
  const directives = parseCsp(cspHeader);
  const issues = [];
  const strengths = [];
  const missingDirectives = [];
  const scriptSrc = directives['script-src'] || directives['default-src'] || [];
  const styleSrc = directives['style-src'] || directives['default-src'] || [];
  const nonceOrHashUsed = scriptSrc.some((value) => /^'(?:nonce-|sha(?:256|384|512)-)/i.test(value));

  if (!directives['default-src'] && !directives['script-src']) { issues.push('No default-src or script-src fallback is defined.'); missingDirectives.push('default-src/script-src'); }
  if (scriptSrc.some((v) => v === '*')) issues.push("script-src allows any origin ('*').");
  if (scriptSrc.some((v) => /^(?:https?:|data:)$/.test(v))) issues.push('script-src contains a broad scheme source.');
  if (scriptSrc.some((v) => v.includes('*') && v !== '*')) issues.push('script-src contains a wildcard host source.');
  if (scriptSrc.some((v) => v === "'unsafe-inline'")) issues.push("script-src allows 'unsafe-inline'.");
  if (scriptSrc.some((v) => v === "'unsafe-eval'")) issues.push("script-src allows 'unsafe-eval'.");
  if (styleSrc.some((v) => v === "'unsafe-inline'")) issues.push("style-src allows 'unsafe-inline'.");
  if (!directives['object-src'] || !directives['object-src'].includes("'none'")) { issues.push("object-src is not restricted to 'none'."); missingDirectives.push('object-src'); } else strengths.push("object-src 'none'");
  if (!directives['base-uri']) { issues.push('base-uri is not restricted.'); missingDirectives.push('base-uri'); } else strengths.push('base-uri');
  if (!directives['frame-ancestors']) { issues.push('frame-ancestors is not restricted.'); missingDirectives.push('frame-ancestors'); } else strengths.push('frame-ancestors');
  if (!directives['form-action']) { issues.push('form-action is not restricted.'); missingDirectives.push('form-action'); } else strengths.push('form-action');
  if (directives['upgrade-insecure-requests']) strengths.push('upgrade-insecure-requests');
  if (nonceOrHashUsed) strengths.push('script nonce/hash source');
  if (scriptSrc.includes("'strict-dynamic'")) strengths.push('strict-dynamic');

  const highRiskIssues = issues.filter((issue) => /script-src allows|broad scheme|wildcard host|unsafe-eval|No default-src/.test(issue));
  const strength = highRiskIssues.length || issues.length >= 4 ? 'weak' : issues.length ? 'moderate' : 'strong';
  return { present: true, strength, directives, issues, strengths, missingDirectives, nonceOrHashUsed };
}

function parseHsts(value) {
  const directives = {};
  for (const part of String(value || '').split(';')) {
    const [rawKey, rawValue = ''] = part.trim().split('=');
    if (!rawKey) continue;
    directives[rawKey.toLowerCase()] = rawValue || true;
  }
  const maxAge = Number(directives['max-age']);
  const issues = [];
  if (!value) issues.push('Strict-Transport-Security header is missing.');
  else {
    if (!Number.isFinite(maxAge) || maxAge <= 0) issues.push('max-age is missing or invalid.');
    else if (maxAge < 15552000) issues.push('max-age is shorter than 180 days.');
    if (!directives.includesubdomains) issues.push('includeSubDomains is not present.');
  }
  const includeSubDomains = Boolean(directives.includesubdomains);
  const preload = Boolean(directives.preload);
  const preloadHeaderEligible = Boolean(preload && includeSubDomains && Number.isFinite(maxAge) && maxAge >= 31536000);
  if (preload && !preloadHeaderEligible) issues.push('The preload token is present but the header does not meet common preload-list submission requirements.');
  return { present: Boolean(value), directives, maxAge: Number.isFinite(maxAge) ? maxAge : null, preload, includeSubDomains, preloadHeaderEligible, preloadListMembership: 'not_assessed', issues };
}

function analyzeReferrerPolicy(value) {
  const policy = String(value || '').trim().toLowerCase();
  const strong = ['no-referrer', 'same-origin', 'strict-origin', 'strict-origin-when-cross-origin'];
  if (!policy) return { status: 'warning', issue: 'Referrer-Policy header is missing.' };
  if (strong.includes(policy)) return { status: 'pass', issue: '' };
  if (['origin', 'origin-when-cross-origin'].includes(policy)) return { status: 'info', issue: 'Policy is present but may disclose more origin information than stricter alternatives.' };
  return { status: 'warning', issue: `Policy "${value}" is weak or uncommon and should be reviewed.` };
}

function analyzePermissionsPolicy(value) {
  if (!value) return { status: 'info', issue: 'Permissions-Policy header was not detected.' };
  const risky = ['geolocation', 'camera', 'microphone', 'payment', 'usb', 'serial'];
  const issues = risky.filter((feature) => new RegExp(`${feature}\\s*=\\s*\\*`, 'i').test(value));
  return { status: issues.length ? 'warning' : 'pass', issue: issues.length ? `Broad feature grants detected: ${issues.join(', ')}.` : '' };
}

function headerHasToken(value, token) {
  return String(value || '').split(',').map((item) => item.trim().toLowerCase()).includes(String(token).toLowerCase());
}

function serverDisclosureAssessment(headers) {
  const disclosures = [];
  const server = headers.server || '';
  const poweredBy = headers['x-powered-by'] || '';
  if (server) disclosures.push(`Server: ${server}`);
  if (poweredBy) disclosures.push(`X-Powered-By: ${poweredBy}`);
  if (!disclosures.length) return { status: 'pass', summary: 'No Server or X-Powered-By disclosure header was detected.', details: '', recommendation: '' };
  const serverOnly = server && !poweredBy;
  const genericCdn = /^(cloudflare|akamai|fastly|cloudfront|google frontend|gws|envoy)$/i.test(server.trim());
  if (serverOnly && genericCdn) {
    return {
      status: 'info',
      summary: 'A generic CDN/proxy Server header was observed.',
      details: disclosures.join(' · '),
      recommendation: 'No immediate action is required for a generic CDN header. Prioritize removing precise product/version disclosures from origin services.'
    };
  }
  return {
    status: 'warning',
    summary: 'Technology/server details are exposed in response headers.',
    details: disclosures.join(' · '),
    recommendation: 'Reduce unnecessary origin product/version disclosure where practical.'
  };
}

function daysUntil(dateValue) {
  const time = Date.parse(dateValue);
  if (!Number.isFinite(time)) return null;
  return Math.ceil((time - Date.now()) / 86400000);
}

function tlsProtocolProbe({ hostname, port, servername, minVersion, maxVersion }) {
  return new Promise((resolve) => {
    const socket = tls.connect({
      host: hostname,
      port,
      servername,
      minVersion,
      maxVersion,
      rejectUnauthorized: false,
      timeout: 5500
    });
    socket.once('secureConnect', () => {
      const cipher = typeof socket.getCipher === 'function' ? socket.getCipher() : null;
      const protocol = typeof socket.getProtocol === 'function' ? socket.getProtocol() : '';
      const ephemeralKey = typeof socket.getEphemeralKeyInfo === 'function' ? socket.getEphemeralKeyInfo() : null;
      socket.end();
      resolve({ supported: true, protocol, cipher, ephemeralKey, forwardSecrecyObserved: Boolean(ephemeralKey && Object.keys(ephemeralKey).length) || protocol === 'TLSv1.3' });
    });
    socket.once('timeout', () => {
      socket.destroy();
      resolve({ supported: false, error: 'timeout' });
    });
    socket.once('error', (error) => resolve({ supported: false, error: error.message }));
  });
}

async function analyzeTlsConfiguration(finalUrl, tlsMeta) {
  const parsed = new URL(finalUrl);
  if (parsed.protocol !== 'https:') return null;
  const hostname = parsed.hostname;
  const port = Number(parsed.port || 443);
  const protocols = {};
  for (const version of ['TLSv1', 'TLSv1.1', 'TLSv1.2', 'TLSv1.3']) {
    protocols[version] = await tlsProtocolProbe({ hostname, port, servername: hostname, minVersion: version, maxVersion: version });
  }
  const weakSupported = Boolean(protocols.TLSv1?.supported || protocols['TLSv1.1']?.supported);
  const modernSupported = Boolean(protocols['TLSv1.2']?.supported || protocols['TLSv1.3']?.supported || /TLSv1\.[23]/i.test(tlsMeta?.protocol || ''));
  const expirationDays = daysUntil(tlsMeta?.validTo);
  let caa = [];
  let caaError = '';
  try {
    caa = await dns.resolveCaa(hostname);
  } catch (error) {
    caaError = error?.code === 'ENODATA' || error?.code === 'ENOTFOUND' ? 'No CAA records were published.' : (error?.message || String(error));
  }
  const forwardSecrecyObserved = Boolean(tlsMeta?.ephemeralKey && Object.keys(tlsMeta.ephemeralKey).length)
    || Object.values(protocols).some((probe) => probe.forwardSecrecyObserved);
  return {
    certificate: {
      authorized: Boolean(tlsMeta?.authorized),
      authorizationError: tlsMeta?.authorizationError || '',
      subject: tlsMeta?.subject || '',
      issuer: tlsMeta?.issuer || '',
      validFrom: tlsMeta?.validFrom || '',
      validTo: tlsMeta?.validTo || '',
      expiresInDays: expirationDays,
      subjectAltName: tlsMeta?.subjectAltName || '',
      fingerprint256: tlsMeta?.fingerprint256 || '',
      serialNumber: tlsMeta?.serialNumber || '',
      chain: tlsMeta?.certificateChain || []
    },
    connection: {
      protocol: tlsMeta?.protocol || '',
      cipher: tlsMeta?.cipher || null,
      alpnProtocol: tlsMeta?.alpnProtocol || '',
      ephemeralKey: tlsMeta?.ephemeralKey || null,
      forwardSecrecyObserved
    },
    ocsp: { stapled: Boolean(tlsMeta?.ocspStapled), responseBase64: tlsMeta?.ocspResponseBase64 || '' },
    dnsCaa: { records: caa, error: caaError },
    protocols,
    weakSupported,
    modernSupported
  };
}

function isFirstParty(resourceUrl, pageUrl) {
  try {
    const resourceHost = new URL(resourceUrl).hostname.toLowerCase();
    const pageHost = new URL(pageUrl).hostname.toLowerCase();
    return resourceHost === pageHost || resourceHost.endsWith(`.${pageHost}`) || pageHost.endsWith(`.${resourceHost}`);
  } catch { return true; }
}

function classifyResourceType(type = '', mimeType = '') {
  const raw = String(type || '').toLowerCase();
  if (raw === 'xhr' || raw === 'fetch') return raw;
  if (raw === 'script') return 'script';
  if (raw === 'stylesheet') return 'stylesheet';
  if (raw === 'image') return 'image';
  if (raw === 'document') return 'document';
  const mime = String(mimeType || '').toLowerCase();
  if (mime.includes('javascript')) return 'script';
  if (mime.includes('css')) return 'stylesheet';
  if (mime.includes('json')) return 'api';
  if (mime.startsWith('image/')) return 'image';
  return raw || 'other';
}

async function runBrowserSecurityScan(targetUrl, options = {}) {
  const requestedRetryCount = Number(options.retryCount);
  const retryCount = Math.max(0, Math.min(4, Number.isFinite(requestedRetryCount) ? requestedRetryCount : 2));
  const navigationTimeout = Math.max(5000, Math.min(90000, Number(options.navigationTimeout) || 30000));
  const backoffMs = Array.isArray(options.backoffMs) && options.backoffMs.length
    ? options.backoffMs.map((value) => Math.max(0, Number(value) || 0))
    : [2000, 5000, 10000, 20000];
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch (error) {
    return { available: false, completed: false, state: 'not_tested', stateLabel: RESULT_STATES.not_tested, attempts: [], error: `Playwright Core is unavailable: ${error.message}` };
  }
  const browsers = await detectBrowsers();
  const browserInfo = browsers[0];
  if (!browserInfo) return { available: false, completed: false, state: 'not_tested', stateLabel: RESULT_STATES.not_tested, attempts: [], error: 'No Chrome, Chromium, or Brave executable was detected.' };

  let browser;
  try {
    browser = await chromium.launch({ executablePath: browserInfo.path, headless: true, args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'] });
    const attemptResults = [];

    for (let attemptIndex = 0; attemptIndex <= retryCount; attemptIndex += 1) {
      if (attemptIndex > 0) await sleep(backoffMs[Math.min(attemptIndex - 1, backoffMs.length - 1)] || 0);
      const attemptStartedAt = new Date().toISOString();
      const attemptStartedMs = Date.now();
      const context = await browser.newContext({ ignoreHTTPSErrors: false, serviceWorkers: 'block', ...(options.storageState ? { storageState: options.storageState } : {}) });
      const page = await context.newPage();
      const resources = new Map();
      const consoleMessages = [];

      page.on('request', (request) => {
        resources.set(request, {
          url: request.url(), method: request.method(), resourceType: request.resourceType(), requestHeaders: request.headers(), failed: false
        });
      });
      page.on('response', (response) => {
        const request = response.request();
        const responseHeaders = response.headers();
        const existing = resources.get(request) || { url: response.url(), method: request.method(), resourceType: request.resourceType(), requestHeaders: request.headers() };
        resources.set(request, { ...existing, url: response.url(), status: response.status(), responseHeaders, mimeType: responseHeaders['content-type'] || '' });
      });
      page.on('requestfailed', (request) => {
        const existing = resources.get(request) || { url: request.url(), method: request.method(), resourceType: request.resourceType(), requestHeaders: request.headers() };
        resources.set(request, { ...existing, failed: true, failure: request.failure()?.errorText || 'request failed' });
      });
      page.on('console', (message) => {
        const messageText = message.text();
        if (/mixed content|cors|content security policy|refused to load/i.test(messageText)) consoleMessages.push({ type: message.type(), text: messageText.slice(0, 500) });
      });

      let navigationResponse = null;
      let navigationError = '';
      let navigationCompleted = false;
      const authentication = { enabled: Boolean(options.authentication?.enabled), role: options.authentication?.role || 'anonymous', state: 'not_tested', stateLabel: RESULT_STATES.not_tested, sessionReused: Boolean(options.storageState), error: '' };
      if (options.authentication?.enabled) {
        if (options.storageState) {
          authentication.state = 'observed';
          authentication.stateLabel = RESULT_STATES.observed;
        } else {
          try {
            await page.goto(options.authentication.loginUrl, { waitUntil: 'domcontentloaded', timeout: navigationTimeout });
            await page.locator(options.authentication.usernameSelector).fill(options.authentication.username);
            await page.locator(options.authentication.passwordSelector).fill(options.authentication.password);
            await page.locator(options.authentication.submitSelector).click();
            if (options.authentication.successUrlPattern) await page.waitForURL(options.authentication.successUrlPattern, { timeout: navigationTimeout });
            if (options.authentication.successSelector) await page.locator(options.authentication.successSelector).waitFor({ state: 'visible', timeout: navigationTimeout });
            authentication.state = 'confirmed';
            authentication.stateLabel = RESULT_STATES.confirmed;
          } catch (error) {
            authentication.state = 'failed_to_test';
            authentication.stateLabel = RESULT_STATES.failed_to_test;
            authentication.error = `Login flow failed: ${error.message}`;
          }
        }
      }
      try {
        navigationResponse = await page.goto(targetUrl, {
          waitUntil: attemptIndex === 0 ? 'load' : 'domcontentloaded',
          timeout: navigationTimeout
        });
        navigationCompleted = true;
        try { await page.waitForLoadState('networkidle', { timeout: 5000 }); } catch {}
        await page.waitForTimeout(500);
      } catch (error) {
        navigationError = `Browser navigation failed: ${error.message}`;
        try {
          await page.waitForLoadState('domcontentloaded', { timeout: 3000 });
        } catch {}
      }

      const finalUrl = page.url() && page.url() !== 'about:blank' ? page.url() : targetUrl;
      const storage = await page.evaluate(() => ({
        title: document.title || '',
        localStorageKeys: Object.keys(localStorage || {}),
        sessionStorageKeys: Object.keys(sessionStorage || {}),
        consentInterfaceDetected: /cookie.{0,80}(consent|preferences|settings|accept|reject)|(consent|preferences).{0,80}cookie/is.test(document.body?.innerText || ''),
        links: [...document.querySelectorAll('a[href]')].map((anchor) => anchor.href).filter(Boolean).slice(0, 200),
        forms: [...document.forms].map((form) => ({ action: form.action || location.href, method: (form.method || 'get').toUpperCase(), inputTypes: [...form.elements].map((element) => element.type || element.tagName.toLowerCase()).filter(Boolean) })).slice(0, 50)
      })).catch(() => ({ title: '', localStorageKeys: [], sessionStorageKeys: [] }));
      const authenticatedPages = [];
      if (options.authentication?.enabled && ['confirmed', 'observed'].includes(authentication.state)) {
        const crawlLimit = Math.max(1, Math.min(25, Number(options.authenticatedCrawlMaxPages) || 10));
        const targetOrigin = new URL(finalUrl).origin;
        const queue = [...new Set((storage.links || []).filter((href) => {
          try { return new URL(href).origin === targetOrigin; } catch { return false; }
        }))];
        const seen = new Set([finalUrl.split('#')[0]]);
        while (queue.length && authenticatedPages.length < crawlLimit) {
          const candidate = queue.shift().split('#')[0];
          if (seen.has(candidate)) continue;
          seen.add(candidate);
          const crawlPage = await context.newPage();
          try {
            const crawlResponse = await crawlPage.goto(candidate, { waitUntil: 'domcontentloaded', timeout: Math.min(navigationTimeout, 20000) });
            const snapshot = await crawlPage.evaluate(() => ({
              title: document.title || '',
              bodyText: (document.body?.innerText || '').slice(0, 50000),
              links: [...document.querySelectorAll('a[href]')].map((anchor) => anchor.href).filter(Boolean).slice(0, 200),
              forms: [...document.forms].map((form) => ({ action: form.action || location.href, method: (form.method || 'get').toUpperCase(), inputTypes: [...form.elements].map((element) => element.type || element.tagName.toLowerCase()).filter(Boolean) })).slice(0, 50)
            }));
            for (const href of snapshot.links) {
              try { if (new URL(href).origin === targetOrigin && !seen.has(href.split('#')[0])) queue.push(href); } catch {}
            }
            const pageScreenshot = authenticatedPages.length < 3 ? await crawlPage.screenshot({ type: 'png', fullPage: true, timeout: 5000 }).then((buffer) => buffer.toString('base64')).catch(() => '') : '';
            authenticatedPages.push({ url: candidate, finalUrl: crawlPage.url(), status: crawlResponse?.status() || 0, title: snapshot.title, headers: crawlResponse?.headers() || {}, bodyText: snapshot.bodyText, forms: snapshot.forms, discoveredLinkCount: snapshot.links.length, screenshotBase64: pageScreenshot, state: 'confirmed', error: '' });
          } catch (error) {
            authenticatedPages.push({ url: candidate, finalUrl: crawlPage.url() || candidate, status: 0, title: '', headers: {}, bodyText: '', forms: [], discoveredLinkCount: 0, screenshotBase64: '', state: 'failed_to_test', error: error.message });
          } finally {
            await crawlPage.close().catch(() => {});
          }
        }
      }
      const cookies = await context.cookies().catch(() => []);
      const sessionState = await context.storageState().catch(() => null);
      const resourceList = [...resources.values()].filter((resource) => /^https?:/i.test(resource.url || '')).map((resource) => {
        const category = classifyResourceType(resource.resourceType, resource.mimeType);
        return {
          url: resource.url,
          method: resource.method || 'GET',
          status: resource.status || 0,
          category,
          resourceType: resource.resourceType || '',
          firstParty: isFirstParty(resource.url, finalUrl),
          failed: Boolean(resource.failed),
          failure: resource.failure || '',
          requestHeaders: resource.requestHeaders || {},
          responseHeaders: resource.responseHeaders || {}
        };
      });
      const screenshotBase64 = await page.screenshot({ type: 'png', fullPage: true, timeout: 5000 }).then((buffer) => buffer.toString('base64')).catch(() => '');
      const hasPartialEvidence = resourceList.length > 0 || cookies.length > 0 || Boolean(screenshotBase64) || Boolean(storage.title);
      const state = navigationCompleted ? 'confirmed' : hasPartialEvidence ? 'observed' : 'failed_to_test';
      const thirdPartyHosts = [...new Set(resourceList.filter((resource) => !resource.firstParty).map((resource) => {
        try { return new URL(resource.url).hostname; } catch { return ''; }
      }).filter(Boolean))].sort();
      const externalScripts = resourceList.filter((resource) => resource.category === 'script' && !resource.firstParty).map((resource) => resource.url);
      const apiCalls = resourceList.filter((resource) => ['xhr', 'fetch', 'api'].includes(resource.category)).map((resource) => resource.url);
      const mixedContent = resourceList.filter((resource) => finalUrl.startsWith('https:') && resource.url.startsWith('http:'));
      const trackingRequests = resourceList.filter((resource) => {
        try { return TRACKING_HOST_PATTERN.test(new URL(resource.url).hostname); } catch { return false; }
      });
      const attemptResult = {
        attempt: attemptIndex + 1,
        startedAt: attemptStartedAt,
        durationMs: Date.now() - attemptStartedMs,
        waitUntil: attemptIndex === 0 ? 'load' : 'domcontentloaded',
        state,
        stateLabel: RESULT_STATES[state],
        completed: navigationCompleted,
        error: navigationError,
        finalUrl,
        status: navigationResponse?.status() || 0,
        title: storage.title,
        resources: resourceList,
        thirdPartyHosts,
        externalScripts: externalScripts.slice(0, 50),
        apiCalls: [...new Set(apiCalls)].slice(0, 50),
        mixedContent: mixedContent.slice(0, 50),
        trackingRequests: trackingRequests.slice(0, 50),
        trackingBeforeConsent: Boolean(storage.consentInterfaceDetected && trackingRequests.length),
        cookies,
        storage,
        consoleMessages: consoleMessages.slice(0, 30),
        screenshotBase64,
        sessionState,
        authentication,
        authenticatedPages,
        limitations: navigationCompleted ? ['Service workers were blocked for scan repeatability.'] : [navigationError, 'Runtime evidence is partial because navigation did not reach the configured readiness state.', 'Service workers were blocked for scan repeatability.'].filter(Boolean)
      };
      attemptResults.push(attemptResult);
      await context.close().catch(() => {});
      if (navigationCompleted) break;
    }

    const ranked = [...attemptResults].sort((a, b) => {
      const stateRank = { confirmed: 3, observed: 2, failed_to_test: 1 };
      return (stateRank[b.state] - stateRank[a.state]) || (b.resources.length - a.resources.length);
    });
    const best = ranked[0];
    if (!best) return { available: false, completed: false, browser: browserInfo, state: 'failed_to_test', stateLabel: RESULT_STATES.failed_to_test, attempts: [], error: 'Browser scan produced no attempt result.' };
    return {
      ...best,
      available: best.state !== 'failed_to_test',
      browser: browserInfo,
      attempts: attemptResults.map((item) => ({
        attempt: item.attempt,
        startedAt: item.startedAt,
        durationMs: item.durationMs,
        waitUntil: item.waitUntil,
        state: item.state,
        stateLabel: item.stateLabel,
        completed: item.completed,
        error: item.error,
        finalUrl: item.finalUrl,
        status: item.status,
        resourceCount: item.resources.length,
        cookieCount: item.cookies.length,
        screenshotCaptured: Boolean(item.screenshotBase64),
        authentication: item.authentication,
        authenticatedPageCount: item.authenticatedPages?.length || 0
      })),
      retryCount,
      error: best.error || ''
    };
  } catch (error) {
    return { available: false, completed: false, browser: browserInfo, state: 'failed_to_test', stateLabel: RESULT_STATES.failed_to_test, attempts: [], error: error.message };
  } finally {
    if (browser) await browser.close().catch(() => {});
  }
}

async function probeCors(urls) {
  const origin = 'https://web-engineering-toolkit.invalid';
  const observations = [];
  for (const url of [...new Set(urls)].slice(0, 8)) {
    try {
      const response = await requestWithRedirects(url, {
        rejectUnauthorized: false,
        maxBodyBytes: 60_000,
        headers: { Origin: origin }
      });
      const acao = response.headers['access-control-allow-origin'] || '';
      const acac = response.headers['access-control-allow-credentials'] || '';
      observations.push({ url: response.finalUrl, status: response.status, acao, acac, risky: acao === '*' || (acao === origin && /true/i.test(acac)) });
    } catch (error) {
      observations.push({ url, status: 0, error: error.message, acao: '', acac: '', risky: false });
    }
  }
  return observations;
}

function relevantEvidenceItems(crawl, keys = []) {
  const items = Array.isArray(crawl?.evidenceItems) ? crawl.evidenceItems : [];
  if (!keys.length) return items;
  return items.filter((item) => keys.includes(item.key));
}

function frameworkEvidenceSummary(id, { checks, crawl, jurisdiction }) {
  const hasEvidence = (key) => Boolean(crawl?.evidenceFound?.[key]);
  const hasPage = (group) => Boolean((crawl?.pagesFoundByGroup?.[group] || []).length);
  const technicalPass = (checkId) => checks.some((check) => check.id === checkId && check.status === 'pass');
  const technicalAttention = checks.filter((check) => check.frameworks.includes(id) && ['fail', 'warning'].includes(check.status));
  const base = {
    id,
    label: FRAMEWORKS[id].label,
    applicable: true,
    publicEvidence: [],
    technicalControls: [],
    missingEvidence: [],
    certification: 'No public certification proof was verified by this website scan.',
    manualReviewRequired: true,
    jurisdiction: id === 'local' ? jurisdiction : '',
    note: 'Evidence comes from public website content and technical signals only. It is not a compliance determination.'
  };

  const addTech = (passed, text) => (passed ? base.technicalControls : base.missingEvidence).push(text);
  addTech(technicalPass('https'), 'HTTPS available');
  addTech(technicalPass('certificate'), 'Valid public certificate');
  addTech(technicalPass('tls'), 'Modern TLS observed');
  addTech(technicalPass('cookies') || technicalPass('runtime-cookies'), 'Cookie security attributes reviewed');

  if (id === 'iso-27001') {
    if (hasPage('security')) base.publicEvidence.push('Security/trust page available');
    if (hasEvidence('accessControl')) base.publicEvidence.push('Access control language found');
    if (hasEvidence('vulnerabilityMgmt')) base.publicEvidence.push('Vulnerability management language found');
    if (hasEvidence('auditLogging')) base.publicEvidence.push('Audit logging language found');
    if (hasEvidence('availabilityBackup')) base.publicEvidence.push('Backup/availability language found');
    for (const item of ['Access control evidence', 'Audit logging evidence', 'Incident response evidence', 'Backup/availability evidence']) {
      const key = { 'Access control evidence': 'accessControl', 'Audit logging evidence': 'auditLogging', 'Incident response evidence': 'breachNotification', 'Backup/availability evidence': 'availabilityBackup' }[item];
      if (!hasEvidence(key)) base.missingEvidence.push(item);
    }
  } else if (id === 'soc-2') {
    if (hasPage('security')) base.publicEvidence.push('Security/trust page available');
    if (hasEvidence('encryption')) base.publicEvidence.push('Encryption language found');
    if (hasEvidence('availabilityBackup')) base.publicEvidence.push('Availability/resilience language found');
    if (hasEvidence('dataSubjectRights')) base.publicEvidence.push('Privacy rights language found');
    for (const item of ['Security control evidence', 'Availability evidence', 'Confidentiality/privacy evidence']) {
      const ok = item.startsWith('Security') ? hasEvidence('accessControl') || hasEvidence('vulnerabilityMgmt') : item.startsWith('Availability') ? hasEvidence('availabilityBackup') : hasEvidence('dataSubjectRights') || hasEvidence('subprocessors');
      if (!ok) base.missingEvidence.push(item);
    }
  } else if (id === 'gdpr') {
    if (hasPage('privacy')) base.publicEvidence.push('Privacy policy page available');
    if (hasEvidence('dataSubjectRights')) base.publicEvidence.push('Data rights mentioned');
    if (hasEvidence('dataRetention')) base.publicEvidence.push('Retention language found');
    if (hasEvidence('subprocessors')) base.publicEvidence.push('Processor/DPA language found');
    if (hasEvidence('consentManagement')) base.publicEvidence.push('Consent management evidence found');
    for (const item of ['Privacy policy', 'Data subject rights', 'Retention information', 'Processor/DPA information', 'Cookie consent mechanism']) {
      const ok = item === 'Privacy policy' ? hasPage('privacy') : item === 'Data subject rights' ? hasEvidence('dataSubjectRights') : item === 'Retention information' ? hasEvidence('dataRetention') : item === 'Processor/DPA information' ? hasEvidence('subprocessors') : hasEvidence('consentManagement');
      if (!ok) base.missingEvidence.push(item);
    }
  } else if (id === 'hipaa') {
    const relevant = hasEvidence('hipaaApplicability') || Boolean(crawl?.certifications?.hipaa);
    base.applicable = relevant;
    if (!relevant) base.note = 'HIPAA relevance was not indicated by visible healthcare, patient, PHI, or HIPAA signals. Do not treat this as a HIPAA assessment.';
    else {
      if (hasEvidence('healthcarePhi')) base.publicEvidence.push('Healthcare/PHI language found');
      if (hasEvidence('accessControl')) base.publicEvidence.push('Access control language found');
      if (hasEvidence('auditLogging')) base.publicEvidence.push('Audit logging language found');
      for (const item of ['PHI applicability review', 'Access control evidence', 'Audit logging evidence', 'Breach notification evidence']) {
        const ok = item.startsWith('PHI') ? hasEvidence('healthcarePhi') : item.startsWith('Access') ? hasEvidence('accessControl') : item.startsWith('Audit') ? hasEvidence('auditLogging') : hasEvidence('breachNotification');
        if (!ok) base.missingEvidence.push(item);
      }
    }
  } else if (id === 'pci-dss') {
    const relevant = hasEvidence('pciApplicability') || Boolean(crawl?.certifications?.['pci-dss']);
    base.applicable = relevant;
    if (!relevant) base.note = 'Payment/card-processing relevance was not indicated by visible checkout, cardholder, provider, or PCI signals. Do not treat this as a PCI DSS assessment.';
    else {
      if (hasEvidence('paymentProcessing')) base.publicEvidence.push('Payment/card-processing language found');
      if (crawl?.certifications?.['pci-dss']) base.publicEvidence.push('PCI DSS mentioned publicly');
      for (const item of ['Payment page/provider evidence', 'Card handling scope evidence', 'PCI certification proof']) {
        const ok = item.startsWith('Payment') || item.startsWith('Card') ? hasEvidence('paymentProcessing') : Boolean(crawl?.certifications?.['pci-dss']);
        if (!ok) base.missingEvidence.push(item);
      }
    }
  } else if (id === 'local') {
    if (jurisdiction) base.publicEvidence.push(`Jurisdiction configured: ${jurisdiction}`);
    if (hasPage('privacy')) base.publicEvidence.push('Privacy/legal page available');
    if (hasEvidence('dataSubjectRights')) base.publicEvidence.push('Rights/privacy language found');
    if (!jurisdiction) base.missingEvidence.push('Country/region jurisdiction not configured');
    base.missingEvidence.push('Jurisdiction-specific legal interpretation');
  }

  if (crawl?.certifications?.[id]) base.certification = `${FRAMEWORKS[id].label} was mentioned publicly, but the scanner did not verify a current certificate or audit report.`;
  base.attentionFindings = technicalAttention.map((check) => ({ title: check.title, severity: check.severity, status: check.status, affectedUrl: check.affectedUrl || '' }));
  base.evidenceItems = relevantEvidenceItems(crawl, ['dataSubjectRights', 'consentManagement', 'breachNotification', 'encryption', 'subprocessors', 'accessControl', 'vulnerabilityMgmt', 'dataRetention', 'auditLogging', 'availabilityBackup', 'paymentProcessing', 'healthcarePhi', 'hipaaApplicability', 'pciApplicability']);
  return base;
}

export async function scanWebsiteSecurity(config = {}, dependencies = {}) {
  const projectName = String(config.projectName || '').trim();
  const targetUrl = String(config.targetUrl || '').trim();
  const jurisdiction = String(config.jurisdiction || '').trim();
  const frameworks = Array.isArray(config.frameworks) ? [...new Set(config.frameworks.filter((id) => FRAMEWORKS[id]))] : Object.keys(FRAMEWORKS);
  const crawlEnabled = config.crawl !== false;
  const maxCrawlPages = Math.max(1, Math.min(25, Number(config.maxCrawlPages) || 10));
  const authInput = config.authentication && typeof config.authentication === 'object' ? config.authentication : {};
  const authentication = {
    enabled: Boolean(authInput.enabled),
    role: String(authInput.role || 'normal-user').trim() || 'normal-user',
    loginUrl: String(authInput.loginUrl || '').trim(),
    usernameSelector: String(authInput.usernameSelector || '').trim(),
    passwordSelector: String(authInput.passwordSelector || '').trim(),
    submitSelector: String(authInput.submitSelector || '').trim(),
    successUrlPattern: String(authInput.successUrlPattern || '').trim(),
    successSelector: String(authInput.successSelector || '').trim(),
    username: String(authInput.username || ''),
    password: String(authInput.password || ''),
    reuseSession: Boolean(authInput.reuseSession)
  };
  if (!projectName) throw new Error('Project name is required.');
  if (!targetUrl) throw new Error('Target URL is required.');
  let parsed;
  try { parsed = new URL(targetUrl); } catch { throw new Error('Target URL must be a valid URL.'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Target URL must use http:// or https://.');
  if (!frameworks.length) throw new Error('Select at least one compliance framework.');
  if (authentication.enabled && !authentication.reuseSession) {
    if (!authentication.loginUrl || !authentication.usernameSelector || !authentication.passwordSelector || !authentication.submitSelector) throw new Error('Authenticated scanning requires a login URL and username, password, and submit selectors.');
    if (!authentication.username || !authentication.password) throw new Error('Authenticated scanning requires runtime username and password values.');
  }

  const startedAt = new Date().toISOString();
  let response;
  let strictTlsError = '';
  try {
    response = await requestWithRedirects(parsed.href, { rejectUnauthorized: true });
  } catch (error) {
    if (parsed.protocol !== 'https:') throw error;
    strictTlsError = describeError(error);
    response = await requestWithRedirects(parsed.href, { rejectUnauthorized: false });
    if (response.tls) {
      response.tls.authorized = false;
      response.tls.authorizationError = response.tls.authorizationError || strictTlsError;
    }
  }
  const finalUrl = new URL(response.finalUrl);
  const headers = response.headers;
  const html = response.body || '';
  const tlsAnalysis = finalUrl.protocol === 'https:' ? await analyzeTlsConfiguration(response.finalUrl, response.tls) : null;
  const sessionId = authentication.enabled && dependencies.sessionStore ? dependencies.sessionStore.sessionId(projectName, authentication.role) : '';
  const storedSession = authentication.enabled && authentication.reuseSession && dependencies.sessionStore ? dependencies.sessionStore.load(sessionId) : null;
  if (authentication.enabled && authentication.reuseSession && !storedSession && (!authentication.loginUrl || !authentication.usernameSelector || !authentication.passwordSelector || !authentication.submitSelector || !authentication.username || !authentication.password)) {
    throw new Error(`No reusable encrypted session exists for role "${authentication.role}". Provide the login flow and runtime credentials to create it.`);
  }
  const browserScan = await runBrowserSecurityScan(response.finalUrl, {
    retryCount: config.browserRetryCount,
    navigationTimeout: config.browserTimeoutMs,
    backoffMs: config.browserBackoffMs,
    authentication,
    storageState: storedSession?.storageState || null,
    authenticatedCrawlMaxPages: maxCrawlPages
  });
  let savedSession = null;
  if (authentication.enabled && browserScan.sessionState && dependencies.sessionStore && browserScan.authentication?.state !== 'failed_to_test') {
    savedSession = dependencies.sessionStore.save(sessionId, browserScan.sessionState);
  }
  delete browserScan.sessionState;
  const checks = [];

  if (authentication.enabled) {
    const authState = browserScan.authentication?.state || 'failed_to_test';
    checks.push(result({
      id: 'authenticated-session', title: `Authenticated session (${authentication.role})`, category: 'Authenticated coverage',
      status: ['confirmed', 'observed'].includes(authState) ? 'pass' : 'info',
      summary: authState === 'confirmed' ? 'The structured login flow completed before the target was scanned.' : authState === 'observed' ? 'An encrypted stored browser session was reused for this scan.' : 'The authenticated session could not be established.',
      details: browserScan.authentication?.error || '',
      affectedUrl: response.finalUrl,
      testState: authState,
      confidence: authState === 'confirmed' ? 'confirmed' : authState === 'observed' ? 'observed' : 'not_tested',
      testMethod: storedSession ? 'Encrypted Playwright storage-state reuse' : 'Structured browser login flow',
      limitations: ['A successful login does not prove complete authenticated route coverage or access-control correctness.']
    }));
    const authenticatedPages = browserScan.authenticatedPages || [];
    const failedPages = authenticatedPages.filter((page) => page.state === 'failed_to_test');
    checks.push(result({
      id: 'authenticated-crawl', title: `Authenticated crawl (${authentication.role})`, category: 'Authenticated coverage',
      status: authenticatedPages.length ? 'info' : 'manual',
      summary: authenticatedPages.length ? `${authenticatedPages.length} same-origin authenticated page(s) were visited; ${failedPages.length} failed to load.` : 'No additional same-origin authenticated pages were discovered or visited.',
      details: authenticatedPages.map((page) => `${page.status || 'failed'} ${page.finalUrl || page.url}${page.forms?.length ? ` (${page.forms.length} form(s))` : ''}`).join(' · '),
      affectedUrl: response.finalUrl,
      testState: authenticatedPages.length ? (failedPages.length ? 'observed' : 'confirmed') : browserScan.authentication?.state === 'failed_to_test' ? 'failed_to_test' : 'not_tested',
      confidence: authenticatedPages.length ? 'observed' : 'not_tested',
      testMethod: 'Bounded same-origin authenticated browser crawl',
      limitations: ['Only safe GET navigation through discovered links was performed. Forms were inventoried but not submitted. Access-control and IDOR conclusions require explicit cross-role comparison.']
    }));
    const adminCandidates = authentication.role === 'normal-user' ? authenticatedPages.filter((page) => page.status >= 200 && page.status < 300 && /\/(admin|management|backoffice|control-panel)(?:\/|$)/i.test(new URL(page.finalUrl || page.url).pathname)) : [];
    const objectCandidates = authenticatedPages.filter((page) => /\/(users?|accounts?|orders?|patients?|records?)\/(?:\d+|[0-9a-f]{8}-[0-9a-f-]{27,})\b/i.test(new URL(page.finalUrl || page.url).pathname));
    checks.push(result({
      id: 'access-control-candidates', title: 'Access-control review candidates', category: 'Authenticated coverage',
      status: adminCandidates.length ? 'warning' : 'manual',
      severity: adminCandidates.length ? 'medium' : 'manual',
      summary: adminCandidates.length
        ? `${adminCandidates.length} admin-labeled route(s) returned a successful response to the configured normal-user role.`
        : objectCandidates.length
          ? `${objectCandidates.length} object-identifier route(s) require explicit cross-role authorization testing.`
          : 'No admin-labeled or common object-identifier route was discovered for role comparison.',
      details: [...adminCandidates, ...objectCandidates].map((page) => `${page.status} ${page.finalUrl || page.url}`).join(' · '),
      recommendation: 'Compare the same requests with anonymous, normal-user, manager, and admin sessions and confirm authorization is enforced server-side for each object and action.',
      affectedUrl: response.finalUrl,
      testState: adminCandidates.length ? 'inferred' : 'not_tested',
      confidence: adminCandidates.length ? 'inferred' : 'not_tested',
      testMethod: 'Authenticated route-name and object-identifier triage',
      limitations: ['Route names and HTTP success do not prove unauthorized data or action access. This is a candidate for controlled manual or cross-role verification, not a confirmed broken-access-control or IDOR finding.']
    }));
  }

  checks.push(result({
    id: 'https', title: 'HTTPS transport', category: 'Transport security',
    status: finalUrl.protocol === 'https:' ? 'pass' : 'fail',
    summary: finalUrl.protocol === 'https:' ? 'The final page is delivered over HTTPS.' : 'The final page is not delivered over HTTPS.',
    recommendation: finalUrl.protocol === 'https:' ? '' : 'Serve the entire website over HTTPS and redirect HTTP traffic to HTTPS.',
    evidence: response.finalUrl
  }));

  let httpRedirect = null;
  if (finalUrl.protocol === 'https:') {
    const httpUrl = new URL(response.finalUrl); httpUrl.protocol = 'http:'; httpUrl.port = '';
    try {
      const probe = await requestWithRedirects(httpUrl.href, { rejectUnauthorized: false, maxBodyBytes: 40_000 });
      httpRedirect = new URL(probe.finalUrl).protocol === 'https:';
      checks.push(result({ id: 'http-to-https', title: 'HTTP to HTTPS redirect', category: 'Transport security', status: httpRedirect ? 'pass' : 'warning', summary: httpRedirect ? 'HTTP traffic redirects to HTTPS.' : 'HTTP traffic did not end on HTTPS.', recommendation: httpRedirect ? '' : 'Redirect all HTTP requests to the canonical HTTPS URL.', evidence: probe.redirectChain.map((item) => `${item.status} ${item.url}`).join(' → ') }));
    } catch (error) {
      checks.push(result({ id: 'http-to-https', title: 'HTTP to HTTPS redirect', category: 'Transport security', status: 'info', summary: 'The HTTP redirect probe could not be completed.', details: describeError(error), recommendation: 'Verify manually that HTTP traffic is redirected to HTTPS.' }));
    }
  } else {
    checks.push(result({ id: 'http-to-https', title: 'HTTP to HTTPS redirect', category: 'Transport security', status: 'fail', summary: 'The scanned page remains on HTTP.', recommendation: 'Configure a permanent redirect from HTTP to HTTPS.' }));
  }

  if (finalUrl.protocol === 'https:' && tlsAnalysis) {
    const cert = tlsAnalysis.certificate;
    const expiringSoon = Number.isFinite(cert.expiresInDays) && cert.expiresInDays <= 30;
    checks.push(result({
      id: 'certificate', title: 'Certificate status', category: 'Transport security',
      status: cert.authorized && !expiringSoon ? 'pass' : 'warning',
      severity: cert.authorized ? (expiringSoon ? 'medium' : 'informational') : 'high',
      summary: cert.authorized ? 'The HTTPS certificate validated successfully.' : 'The HTTPS certificate chain or hostname validation reported a problem.',
      details: [`Subject: ${cert.subject || 'unknown'}`, `Issuer: ${cert.issuer || 'unknown'}`, cert.validTo ? `Valid to: ${cert.validTo}${Number.isFinite(cert.expiresInDays) ? ` (${cert.expiresInDays} days)` : ''}` : '', cert.authorizationError].filter(Boolean).join(' · '),
      recommendation: cert.authorized && !expiringSoon ? '' : 'Use a publicly trusted certificate that matches the hostname and renew it before expiration.',
      affectedUrl: response.finalUrl,
      references: [REFERENCES.sslLabs]
    }));

    const protocolNames = Object.entries(tlsAnalysis.protocols).filter(([, probe]) => probe.supported).map(([name]) => name);
    checks.push(result({
      id: 'tls', title: 'TLS configuration', category: 'Transport security',
      status: tlsAnalysis.modernSupported && !tlsAnalysis.weakSupported ? 'pass' : 'warning',
      severity: tlsAnalysis.weakSupported ? 'high' : tlsAnalysis.modernSupported ? 'informational' : 'medium',
      summary: tlsAnalysis.weakSupported
        ? 'Legacy TLS protocol support was observed.'
        : tlsAnalysis.modernSupported
          ? 'Modern TLS support was observed.'
          : 'TLS protocol support could not be fully verified.',
      details: [
        tlsAnalysis.connection.protocol ? `Negotiated protocol: ${tlsAnalysis.connection.protocol}` : '',
        tlsAnalysis.connection.cipher?.name ? `Cipher: ${tlsAnalysis.connection.cipher.name}` : '',
        tlsAnalysis.connection.ephemeralKey?.type ? `Ephemeral key: ${tlsAnalysis.connection.ephemeralKey.type} ${tlsAnalysis.connection.ephemeralKey.name || ''} ${tlsAnalysis.connection.ephemeralKey.size || ''}`.trim() : '',
        `Forward secrecy observed: ${tlsAnalysis.connection.forwardSecrecyObserved ? 'yes' : 'not confirmed'}`,
        protocolNames.length ? `Supported protocols observed: ${protocolNames.join(', ')}` : 'Protocol probes did not confirm supported versions.'
      ].filter(Boolean).join(' · '),
      recommendation: tlsAnalysis.weakSupported ? 'Disable TLS 1.0 and TLS 1.1, and support TLS 1.2 and/or TLS 1.3 with modern cipher suites.' : '',
      affectedUrl: response.finalUrl,
      references: [REFERENCES.sslLabs]
    }));
    checks.push(result({
      id: 'ocsp-stapling', title: 'OCSP stapling', category: 'Transport security',
      status: tlsAnalysis.ocsp.stapled ? 'pass' : 'info',
      summary: tlsAnalysis.ocsp.stapled ? 'The server provided a stapled OCSP response during the observed handshake.' : 'No stapled OCSP response was observed during the handshake.',
      recommendation: tlsAnalysis.ocsp.stapled ? '' : 'Evaluate OCSP stapling for supported server stacks; absence alone is not proof that revocation checking is ineffective.',
      affectedUrl: response.finalUrl,
      testMethod: 'TLS handshake OCSP response observation',
      limitations: ['One handshake was observed; CDN edges and subsequent handshakes can differ.']
    }));
    checks.push(result({
      id: 'dns-caa', title: 'DNS Certification Authority Authorization (CAA)', category: 'Transport security',
      status: tlsAnalysis.dnsCaa.records.length ? 'pass' : 'info',
      summary: tlsAnalysis.dnsCaa.records.length ? `${tlsAnalysis.dnsCaa.records.length} CAA record(s) were observed.` : 'No DNS CAA record was observed.',
      details: tlsAnalysis.dnsCaa.records.length ? JSON.stringify(tlsAnalysis.dnsCaa.records) : tlsAnalysis.dnsCaa.error,
      recommendation: tlsAnalysis.dnsCaa.records.length ? '' : 'Consider publishing CAA records to constrain which certificate authorities may issue certificates for the domain.',
      affectedUrl: response.finalUrl,
      testMethod: 'DNS CAA lookup',
      limitations: ['DNS resolver state and split-horizon DNS can affect this observation.']
    }));
  } else if (finalUrl.protocol === 'https:') {
    checks.push(result({ id: 'certificate', title: 'Certificate status', category: 'Transport security', status: 'warning', summary: 'The response was delivered over HTTPS but certificate details could not be captured.', recommendation: 'Verify certificate status directly against the origin.', affectedUrl: response.finalUrl, references: [REFERENCES.sslLabs] }));
    checks.push(result({ id: 'tls', title: 'TLS configuration', category: 'Transport security', status: 'warning', summary: 'The response was delivered over HTTPS but TLS protocol/cipher details could not be captured.', recommendation: 'Verify TLS protocol and cipher support directly against the origin.', affectedUrl: response.finalUrl, references: [REFERENCES.sslLabs] }));
  } else {
    checks.push(result({ id: 'certificate', title: 'Certificate status', category: 'Transport security', status: 'manual', summary: 'Certificate status is not applicable because the final page is not HTTPS.', recommendation: 'Serve the website over HTTPS with a valid TLS certificate.', affectedUrl: response.finalUrl, references: [REFERENCES.sslLabs] }));
    checks.push(result({ id: 'tls', title: 'TLS configuration', category: 'Transport security', status: 'fail', summary: 'No TLS connection was established because the final page is HTTP.', recommendation: 'Serve the website over HTTPS with a valid TLS certificate and modern TLS configuration.', affectedUrl: response.finalUrl, references: [REFERENCES.sslLabs] }));
  }

  const hsts = parseHsts(headers['strict-transport-security'] || '');
  checks.push(result({
    id: 'hsts', title: 'Strict-Transport-Security (HSTS)', category: 'Security headers',
    status: finalUrl.protocol !== 'https:' ? 'fail' : hsts.issues.length ? 'warning' : 'pass',
    severity: finalUrl.protocol !== 'https:' ? 'high' : hsts.issues.length ? 'medium' : 'informational',
    summary: finalUrl.protocol !== 'https:'
      ? 'HSTS is not effective because the final page is not HTTPS.'
      : hsts.present && !hsts.issues.length
        ? 'HSTS is configured with a durable policy.'
        : 'HSTS is missing or weaker than recommended.',
    details: headers['strict-transport-security'] ? `Detected: ${headers['strict-transport-security']} · Preload header eligibility: ${hsts.preloadHeaderEligible ? 'yes' : 'no'} · Preload list membership: not assessed${hsts.issues.length ? ` · ${hsts.issues.join(' · ')}` : ''}` : '',
    recommendation: finalUrl.protocol === 'https:' && !hsts.issues.length ? '' : 'Serve HTTPS and set Strict-Transport-Security with an appropriate max-age; includeSubDomains/preload require careful rollout planning.',
    affectedUrl: response.finalUrl,
    references: [REFERENCES.headers, REFERENCES.observatory],
    testMethod: 'HTTP Strict-Transport-Security directive analysis',
    limitations: ['HSTS preload list membership was not assessed; the preload token alone does not prove inclusion.']
  }));

  const csp = headers['content-security-policy'] || '';
  const cspAnalysis = analyzeCsp(csp);
  const cspStatus = !cspAnalysis.present ? 'fail' : cspAnalysis.strength === 'strong' ? 'pass' : cspAnalysis.strength === 'moderate' ? 'warning' : 'fail';
  checks.push(result({
    id: 'csp', title: 'Content Security Policy (CSP)', category: 'Security headers',
    status: cspStatus,
    summary: !cspAnalysis.present
      ? 'Content-Security-Policy header is missing.'
      : cspAnalysis.strength === 'strong'
        ? 'A restrictive Content-Security-Policy is configured.'
        : `Content-Security-Policy is present but has ${cspAnalysis.issues.length} weakness${cspAnalysis.issues.length === 1 ? '' : 'es'} (a policy existing is not sufficient on its own).`,
    details: cspAnalysis.present ? [csp.slice(0, 700), cspAnalysis.strengths.length ? `Strong directives: ${cspAnalysis.strengths.join(', ')}` : '', cspAnalysis.missingDirectives.length ? `Missing/recommended directives: ${cspAnalysis.missingDirectives.join(', ')}` : '', ...cspAnalysis.issues].filter(Boolean).join(' · ') : '',
    recommendation: !cspAnalysis.present
      ? 'Define a Content Security Policy appropriate for the application and third-party resources.'
      : (cspAnalysis.issues.length ? `Tighten the policy: ${cspAnalysis.issues.join(' ')}` : ''),
    affectedUrl: response.finalUrl,
    references: [REFERENCES.headers, REFERENCES.observatory, REFERENCES.zapPassive],
    testMethod: 'HTTP Content-Security-Policy directive analysis',
    limitations: ['Policy behavior was assessed statically; application-specific source requirements and browser compatibility require validation.']
  }));
  const xfo = headers['x-frame-options'] || '';
  const frameAncestors = Boolean(cspAnalysis.directives['frame-ancestors']);
  checks.push(result({ id: 'clickjacking', title: 'Clickjacking protection', category: 'Security headers', status: xfo || frameAncestors ? 'pass' : 'warning', summary: xfo || frameAncestors ? 'Frame embedding restrictions were detected.' : 'No X-Frame-Options or CSP frame-ancestors directive was detected.', details: xfo ? `X-Frame-Options: ${xfo}` : (frameAncestors ? 'CSP frame-ancestors directive present.' : ''), recommendation: xfo || frameAncestors ? '' : 'Restrict framing with CSP frame-ancestors and/or X-Frame-Options where appropriate.', affectedUrl: response.finalUrl, references: [REFERENCES.headers] }));
  const nosniff = headerHasToken(headers['x-content-type-options'] || '', 'nosniff');
  checks.push(result({ id: 'nosniff', title: 'MIME sniffing protection', category: 'Security headers', status: nosniff ? 'pass' : 'warning', summary: nosniff ? 'X-Content-Type-Options is set to nosniff.' : 'X-Content-Type-Options: nosniff was not detected.', recommendation: nosniff ? '' : 'Send X-Content-Type-Options: nosniff.', affectedUrl: response.finalUrl, references: [REFERENCES.headers] }));
  const referrer = analyzeReferrerPolicy(headers['referrer-policy'] || '');
  checks.push(result({ id: 'referrer-policy', title: 'Referrer Policy', category: 'Privacy & browser controls', status: referrer.status, summary: headers['referrer-policy'] ? 'Referrer-Policy header is present.' : 'Referrer-Policy header is missing.', details: [headers['referrer-policy'] || '', referrer.issue].filter(Boolean).join(' · '), recommendation: referrer.status === 'pass' ? '' : 'Define an explicit Referrer-Policy such as strict-origin-when-cross-origin, same-origin, strict-origin, or no-referrer.', affectedUrl: response.finalUrl, references: [REFERENCES.headers] }));
  const permissions = analyzePermissionsPolicy(headers['permissions-policy'] || '');
  checks.push(result({ id: 'permissions-policy', title: 'Permissions Policy', category: 'Privacy & browser controls', status: permissions.status, summary: headers['permissions-policy'] ? 'Permissions-Policy header is present.' : 'Permissions-Policy header was not detected.', details: [headers['permissions-policy'] || '', permissions.issue].filter(Boolean).join(' · '), recommendation: permissions.status === 'pass' ? '' : 'Explicitly restrict browser features that the site does not need, especially camera, microphone, geolocation, payment, USB, and serial.', affectedUrl: response.finalUrl, references: [REFERENCES.headers] }));

  const crossOriginHeaders = [
    ['Cross-Origin-Opener-Policy', headers['cross-origin-opener-policy']],
    ['Cross-Origin-Embedder-Policy', headers['cross-origin-embedder-policy']],
    ['Cross-Origin-Resource-Policy', headers['cross-origin-resource-policy']]
  ].filter(([, value]) => value);
  checks.push(result({
    id: 'cross-origin-policies', title: 'Cross-origin isolation policies', category: 'Privacy & browser controls',
    status: crossOriginHeaders.length ? 'pass' : 'info',
    summary: crossOriginHeaders.length ? 'Cross-origin browser isolation/resource policies were detected.' : 'COOP, COEP, and CORP headers were not detected on the main document.',
    details: crossOriginHeaders.map(([name, value]) => `${name}: ${value}`).join(' · '),
    recommendation: crossOriginHeaders.length ? '' : 'For sensitive browser applications, evaluate COOP/COEP/CORP adoption. These headers can affect third-party embeds and should be tested carefully.',
    affectedUrl: response.finalUrl,
    references: [REFERENCES.headers]
  }));

  checks.push({ ...cookieChecks(response.setCookies), affectedUrl: response.finalUrl, references: [REFERENCES.zapPassive] });
  if (browserScan.available) {
    checks.push(browserCookieChecks(browserScan.cookies || [], browserScan.finalUrl || response.finalUrl, browserScan));
  } else {
    checks.push(result({ id: 'runtime-cookies', title: 'Runtime browser cookies', category: 'Privacy & session', status: 'info', summary: browserScan.state === 'failed_to_test' ? 'Runtime cookie analysis failed to complete.' : 'Runtime cookies were not tested because browser scanning prerequisites were unavailable.', details: browserScan.error || '', recommendation: 'Verify the browser runtime prerequisite and retry the scan.', affectedUrl: response.finalUrl, testState: browserScan.state || 'failed_to_test', testMethod: 'Headless browser cookie snapshot', limitations: [browserScan.error] }));
  }

  const firstPartyApiCalls = browserScan.available ? (browserScan.apiCalls || []).filter((url) => isFirstParty(url, response.finalUrl)) : [];
  const corsTargets = [response.finalUrl, ...firstPartyApiCalls];
  const corsObservations = await probeCors(corsTargets);
  const riskyCors = corsObservations.filter((item) => item.risky);
  const completedCors = corsObservations.filter((item) => !item.error);
  const testedApis = corsObservations.filter((item) => item.url !== response.finalUrl).length;
  checks.push(result({
    id: 'cors', title: 'Cross-Origin Resource Sharing (CORS)', category: 'Application exposure',
    status: riskyCors.length ? 'warning' : completedCors.length ? 'pass' : 'info',
    summary: riskyCors.length
      ? `${riskyCors.length} scanned resource(s) returned permissive CORS headers to a synthetic external Origin.`
      : testedApis
        ? 'No permissive CORS headers were observed on the main page or discovered API calls.'
        : 'No permissive CORS headers were observed on the main page; API endpoint coverage was limited.',
    details: corsObservations.map((item) => item.error ? `${item.url}: not tested (${item.error})` : `${item.url}: ACAO=${item.acao || '(none)'} ACAC=${item.acac || '(none)'}`).join(' · '),
    recommendation: riskyCors.length ? 'Restrict Access-Control-Allow-Origin to trusted origins and avoid credentialed wildcard/e reflected-origin policies for sensitive resources.' : 'Continue testing authenticated and non-homepage API endpoints; a homepage response does not prove complete CORS safety.',
    affectedUrl: response.finalUrl,
    references: [REFERENCES.cors, REFERENCES.headers],
    testState: completedCors.length === corsObservations.length ? 'confirmed' : completedCors.length ? 'observed' : 'failed_to_test',
    confidence: riskyCors.length ? 'observed' : completedCors.length ? 'observed' : 'not_tested',
    testMethod: 'Synthetic cross-origin HTTP response analysis',
    limitations: ['Only GET requests and a bounded set of public endpoints were tested.', ...corsObservations.filter((item) => item.error).map((item) => `${item.url}: ${item.error}`)]
  }));

  const disclosure = serverDisclosureAssessment(headers);
  checks.push(result({ id: 'disclosure', title: 'Technology disclosure headers', category: 'Application exposure', status: disclosure.status, summary: disclosure.summary, details: disclosure.details, recommendation: disclosure.recommendation, affectedUrl: response.finalUrl }));

  const mixedMatches = [...html.matchAll(/\b(?:src|href|action)\s*=\s*["'](http:\/\/[^"']+)["']/gi)].map((m) => m[1]).slice(0, 20);
  const browserMixed = browserScan.available ? (browserScan.mixedContent || []).map((item) => `${item.category}: ${item.url}`) : [];
  const mixedEvidence = [...new Set([...mixedMatches, ...browserMixed])].slice(0, 30);
  checks.push(result({
    id: 'mixed-content', title: 'Mixed/insecure resource references', category: 'Page content',
    status: finalUrl.protocol === 'https:' && mixedEvidence.length ? 'fail' : finalUrl.protocol === 'https:' && browserScan.state === 'observed' ? 'info' : finalUrl.protocol === 'https:' ? 'pass' : 'info',
    summary: finalUrl.protocol !== 'https:'
      ? 'Mixed-content enforcement is not applicable because the final page itself is not HTTPS.'
      : mixedEvidence.length
        ? `${mixedEvidence.length} insecure http:// reference/request${mixedEvidence.length === 1 ? '' : 's'} detected on an HTTPS page.`
        : browserScan.state === 'observed'
          ? 'No insecure references were observed in the static HTML or partial browser capture; runtime coverage is incomplete.'
          : browserScan.available
          ? 'No static or runtime mixed-content requests were detected on the scanned HTTPS page.'
          : 'No direct http:// resource references were detected in the scanned HTML; runtime mixed content was not assessed.',
    details: mixedEvidence.join(' · '),
    recommendation: mixedEvidence.length ? 'Load page resources, embeds, and form actions over HTTPS.' : '',
    affectedUrl: response.finalUrl,
    references: [REFERENCES.zapPassive],
    testState: browserScan.state === 'observed' && !mixedEvidence.length ? 'observed' : 'confirmed',
    confidence: mixedEvidence.length ? 'confirmed' : browserScan.state === 'observed' ? 'observed' : 'confirmed',
    testMethod: 'Static HTML and headless browser network analysis',
    limitations: browserScan.limitations || []
  }));

  const passwordInputs = (html.match(/<input\b[^>]*\btype\s*=\s*["']password["'][^>]*>/gi) || []).length;
  checks.push(result({ id: 'password-transport', title: 'Password transport', category: 'Page content', status: passwordInputs && finalUrl.protocol !== 'https:' ? 'fail' : 'pass', summary: passwordInputs ? (finalUrl.protocol === 'https:' ? 'Password fields detected on an HTTPS page.' : 'Password fields were detected on an insecure HTTP page.') : 'No password field was detected in the scanned HTML.', recommendation: passwordInputs && finalUrl.protocol !== 'https:' ? 'Never collect passwords over HTTP.' : '' }));

  const privacyDetected = /(?:href|aria-label|title)\s*=\s*["'][^"']*privacy[^"']*["']|>\s*privacy(?:\s+policy)?\s*</i.test(html);
  checks.push(result({ id: 'privacy', title: 'Privacy policy signal', category: 'Privacy & transparency', status: privacyDetected ? 'pass' : 'manual', summary: privacyDetected ? 'A privacy-policy signal/link was detected in the scanned HTML.' : 'A privacy-policy link was not confidently detected on this page.', recommendation: privacyDetected ? '' : 'Verify manually that users can easily access the applicable privacy notice.' }));

  const consentDetected = /cookie.{0,80}(?:consent|preferences|settings|accept|reject)|(?:consent|preferences).{0,80}cookie/is.test(html);
  checks.push(result({ id: 'consent', title: 'Cookie consent signal', category: 'Privacy & transparency', status: consentDetected ? 'pass' : 'manual', summary: consentDetected ? 'Cookie-consent/preference text was detected.' : 'No clear cookie-consent interface was detected in the initial HTML.', details: 'This check cannot determine whether consent behavior is legally sufficient.', recommendation: 'Verify consent requirements and behavior manually for the jurisdictions and tracking technologies that apply.' }));

  const runtimeConsentDetected = Boolean(browserScan.storage?.consentInterfaceDetected);
  checks.push(result({
    id: 'consent-behavior', title: 'Tracking before consent interaction', category: 'Privacy & transparency',
    status: browserScan.trackingBeforeConsent ? 'warning' : browserScan.state === 'confirmed' && runtimeConsentDetected ? 'pass' : 'manual',
    severity: browserScan.trackingBeforeConsent ? 'medium' : 'manual',
    summary: browserScan.trackingBeforeConsent
      ? `${browserScan.trackingRequests.length} request(s) to known analytics/tracking hosts were observed during initial load while a consent interface was present.`
      : browserScan.state === 'confirmed' && runtimeConsentDetected
        ? 'A consent interface was observed and no requests to the scanner\'s known tracking-host list were captured before interaction.'
        : 'Consent ordering could not be assessed from the available browser evidence.',
    details: (browserScan.trackingRequests || []).map((request) => request.url).join(' · '),
    recommendation: browserScan.trackingBeforeConsent ? 'Confirm the purpose and legal basis of each request and block non-essential tracking until the required consent is recorded.' : 'Review consent behavior against applicable jurisdictions, tracking purposes, and withdrawal requirements.',
    affectedUrl: response.finalUrl,
    testState: browserScan.state === 'confirmed' ? (runtimeConsentDetected ? 'observed' : 'not_tested') : browserScan.state || 'failed_to_test',
    confidence: browserScan.trackingBeforeConsent ? 'observed' : 'not_tested',
    testMethod: 'Initial-load browser network and consent-interface observation',
    limitations: ['Host matching cannot determine tracking purpose, legal basis, jurisdictional applicability, or whether prior consent already existed.', ...(browserScan.limitations || [])]
  }));

  const staticThirdParty = findThirdPartyScripts(html, response.finalUrl);
  const runtimeScriptHosts = browserScan.available
    ? [...new Set((browserScan.externalScripts || []).map((url) => {
        try { return new URL(url).hostname; } catch { return ''; }
      }).filter(Boolean))]
    : [];
  const thirdParty = [...new Set([...staticThirdParty, ...runtimeScriptHosts])];
  checks.push(result({ id: 'third-party-scripts', title: 'Third-party scripts', category: 'Privacy & supply chain', status: thirdParty.length ? 'manual' : 'pass', summary: thirdParty.length ? `${thirdParty.length} third-party script host${thirdParty.length === 1 ? '' : 's'} detected.` : (browserScan.available ? 'No third-party script hosts were detected statically or at runtime.' : 'No third-party script hosts were detected in the initial HTML; runtime third-party scripts were not assessed.'), details: thirdParty.slice(0, 30).join(', '), recommendation: thirdParty.length ? 'Review each third-party script for necessity, data handling, contractual controls, consent requirements, and supply-chain risk.' : '', affectedUrl: response.finalUrl, references: [REFERENCES.zapPassive] }));

  checks.push(result({
    id: 'browser-security', title: 'Browser runtime security observations', category: 'Browser/runtime evidence',
    status: browserScan.available ? 'info' : 'info',
    summary: browserScan.available
      ? `${browserScan.state === 'observed' ? 'Partial browser scan captured' : 'Browser scan loaded'} ${browserScan.resources?.length || 0} network resource(s), ${browserScan.thirdPartyHosts?.length || 0} third-party host(s), and ${browserScan.apiCalls?.length || 0} API/XHR/fetch call(s).`
      : 'Browser runtime analysis could not be completed in this environment.',
    details: browserScan.available
      ? [
          browserScan.thirdPartyHosts?.length ? `Third-party hosts: ${browserScan.thirdPartyHosts.slice(0, 20).join(', ')}` : '',
          browserScan.apiCalls?.length ? `API calls: ${browserScan.apiCalls.slice(0, 15).join(', ')}` : '',
          browserScan.storage?.localStorageKeys?.length ? `LocalStorage keys: ${browserScan.storage.localStorageKeys.slice(0, 20).join(', ')}` : '',
          browserScan.consoleMessages?.length ? `Security console messages: ${browserScan.consoleMessages.map((item) => item.text).slice(0, 5).join(' · ')}` : ''
        ].filter(Boolean).join(' · ')
      : (browserScan.error || ''),
    recommendation: browserScan.available ? 'Use runtime observations to select API endpoints and third-party services for deeper authenticated testing.' : 'Install a working Chrome, Chromium, or Brave executable to enable runtime evidence collection.',
    affectedUrl: response.finalUrl,
    references: [REFERENCES.zapPassive],
    testState: browserScan.state || 'failed_to_test',
    confidence: browserScan.state === 'confirmed' ? 'confirmed' : browserScan.state === 'observed' ? 'observed' : 'not_tested',
    testMethod: 'Headless browser runtime collection',
    limitations: browserScan.limitations || [browserScan.error]
  }));

  try {
    const securityTxtUrl = new URL('/.well-known/security.txt', response.finalUrl).href;
    const securityTxt = await requestWithRedirects(securityTxtUrl, { rejectUnauthorized: true, maxBodyBytes: 200_000 });
    const found = securityTxt.status >= 200 && securityTxt.status < 300 && /contact\s*:/i.test(securityTxt.body || '');
    checks.push(result({ id: 'security-txt', title: 'security.txt disclosure channel', category: 'Security operations', status: found ? 'pass' : 'info', summary: found ? 'A .well-known/security.txt file with a Contact field was detected.' : 'A usable .well-known/security.txt file was not detected.', recommendation: found ? '' : 'Consider publishing security.txt if a public vulnerability-reporting channel is appropriate for the organization.' }));
  } catch (error) {
    checks.push(result({ id: 'security-txt', title: 'security.txt disclosure channel', category: 'Security operations', status: 'info', summary: 'security.txt could not be verified.', details: describeError(error) }));
  }

  // --- Website crawl for compliance evidence --------------------------------
  // Important evidence (privacy/terms/security/compliance pages) usually
  // lives off the homepage, so scanning only the requested URL misses it.
  let crawl = null;
  let crawlEvidencePages = [];
  if (crawlEnabled) {
    try {
      const pages = await discoverEvidencePages(response.finalUrl, html, { maxPages: maxCrawlPages });
      const evidencePages = [
        { url: response.finalUrl, finalUrl: response.finalUrl, status: response.status, found: true, groups: ['homepage'], source: 'initial-page', title: browserScan.available ? browserScan.title || '' : '', html },
        ...pages
      ];
      crawlEvidencePages = evidencePages;
      const evidence = extractComplianceEvidence(evidencePages);
      const linkedEvidence = extractLinkedEvidencePages(headers, html, response.finalUrl);
      for (const [group, urls] of Object.entries(linkedEvidence)) {
        if (!urls.length) continue;
        evidence.pagesFoundByGroup[group] = [...new Set([...(evidence.pagesFoundByGroup[group] || []), ...urls])];
      }
      crawl = {
        pagesScanned: evidencePages.length,
        pages: evidencePages.map((p) => ({ url: p.finalUrl || p.url, status: p.status, found: p.found, groups: p.groups, title: p.title || '', source: p.source || '', error: p.error || '' })),
        linkedEvidence,
        ...evidence
      };

      const hasGroup = (g) => (evidence.pagesFoundByGroup[g] || []).length > 0;

      checks.push(result({ id: 'evidence-privacy-page', title: 'Privacy policy page discovered', category: 'Compliance evidence', status: hasGroup('privacy') ? 'pass' : 'manual', summary: hasGroup('privacy') ? `A privacy-related page was found or linked publicly: ${evidence.pagesFoundByGroup.privacy.join(', ')}` : 'No dedicated privacy policy page was discovered by crawling common paths and homepage links.', recommendation: hasGroup('privacy') ? '' : 'Publish a clearly linked privacy policy.' }));
      checks.push(result({ id: 'evidence-security-page', title: 'Security/trust page discovered', category: 'Compliance evidence', status: hasGroup('security') ? 'pass' : 'manual', summary: hasGroup('security') ? `A security/trust page was found: ${evidence.pagesFoundByGroup.security.join(', ')}` : 'No dedicated security or trust-center page was discovered.', recommendation: hasGroup('security') ? '' : 'Consider publishing a security/trust page describing controls and certifications.' }));
      checks.push(result({ id: 'evidence-compliance-page', title: 'Compliance/legal page discovered', category: 'Compliance evidence', status: (hasGroup('compliance') || hasGroup('terms')) ? 'pass' : 'manual', summary: (hasGroup('compliance') || hasGroup('terms')) ? `Compliance/legal or terms pages were found or linked publicly: ${[...(evidence.pagesFoundByGroup.compliance || []), ...(evidence.pagesFoundByGroup.terms || [])].join(', ')}` : 'No dedicated compliance or terms page was discovered.', recommendation: (hasGroup('compliance') || hasGroup('terms')) ? '' : 'Publish terms of service and, where applicable, a dedicated compliance/legal page.' }));
      const evidenceFor = (key) => (evidence.evidenceItems || []).filter((item) => item.key === key);
      checks.push(result({ id: 'evidence-data-subject-rights', title: 'Data subject rights language', category: 'Compliance evidence', status: evidence.evidenceFound.dataSubjectRights ? 'pass' : 'manual', summary: evidence.evidenceFound.dataSubjectRights ? 'Language describing data subject rights (access, erasure, opt-out, etc.) was found on crawled pages.' : 'No explicit data subject rights language was found on crawled pages.', recommendation: evidence.evidenceFound.dataSubjectRights ? '' : 'Describe data subject rights (access, erasure, portability, opt-out) in the privacy policy.', evidenceItems: evidenceFor('dataSubjectRights') }));
      checks.push(result({ id: 'evidence-consent-management', title: 'Cookie/consent management evidence', category: 'Compliance evidence', status: evidence.evidenceFound.consentManagement ? 'pass' : 'manual', summary: evidence.evidenceFound.consentManagement ? 'Consent-management language or a known consent platform was detected on crawled pages.' : 'No consent-management platform or language was detected on crawled pages.', recommendation: evidence.evidenceFound.consentManagement ? '' : 'Verify a compliant cookie-consent mechanism is deployed for applicable jurisdictions.', evidenceItems: evidenceFor('consentManagement') }));
      checks.push(result({ id: 'evidence-breach-notification', title: 'Breach notification / incident response language', category: 'Compliance evidence', status: evidence.evidenceFound.breachNotification ? 'pass' : 'manual', summary: evidence.evidenceFound.breachNotification ? 'Breach notification or incident response language was found on crawled pages.' : 'No breach notification or incident response language was found on crawled pages.', recommendation: evidence.evidenceFound.breachNotification ? '' : 'Publish a summary of breach notification / incident response commitments where applicable.', evidenceItems: evidenceFor('breachNotification') }));

      const certList = Object.entries(evidence.certifications).filter(([, found]) => found).map(([id]) => FRAMEWORKS[id]?.label || id.toUpperCase());
      checks.push(result({
        id: 'evidence-certifications', title: 'Certification / framework mentions', category: 'Compliance evidence',
        status: 'manual',
        summary: certList.length ? `The following certifications/frameworks were mentioned on crawled pages: ${certList.join(', ')}.` : 'No certification or framework mentions were found on crawled pages.',
        details: certList.join(', '),
        recommendation: 'A text mention is not proof of certification. Verify any certification claim against a current, signed certificate or audit report before relying on it.'
      }));
    } catch (error) {
      crawl = { error: describeError(error), pagesScanned: 0, pages: [] };
    }
  }

  const selectedSet = new Set(frameworks);
  const filteredChecks = checks.map((check) => ({ ...check, frameworks: check.frameworks.filter((id) => selectedSet.has(id)) }));
  const frameworkResults = frameworks.map((id) => frameworkEvidenceSummary(id, { checks: filteredChecks, crawl, jurisdiction }));

  const totals = {
    pass: filteredChecks.filter((check) => check.status === 'pass').length,
    warning: filteredChecks.filter((check) => check.status === 'warning').length,
    fail: filteredChecks.filter((check) => check.status === 'fail').length,
    manual: filteredChecks.filter((check) => check.status === 'manual').length,
    info: filteredChecks.filter((check) => check.status === 'info').length
  };
  let riskCount = totals.fail + totals.warning;
  let overallStatus = totals.fail ? 'high-attention' : totals.warning ? 'review' : 'good';
  const generatedAt = new Date().toISOString();
  const findings = buildFindings(filteredChecks, { generatedAt, toolVersion: SCANNER_VERSION, frameworks });
  const testResults = buildTestResults(filteredChecks);
  const zapConfig = config.zap && typeof config.zap === 'object' ? config.zap : { mode: 'none' };
  const zapResult = await runZapScan(zapConfig, response.finalUrl);
  findings.push(...(zapResult.findings || []));
  if (zapResult.enabled) {
    testResults.push({
      id: 'owasp-zap', title: `OWASP ZAP ${zapResult.mode} scan`, category: 'External scanner', outcome: zapResult.state === 'confirmed' ? 'pass' : 'info', state: zapResult.state, stateLabel: zapResult.stateLabel, confidence: zapResult.state === 'confirmed' ? 'confirmed' : zapResult.state === 'observed' ? 'observed' : 'not_tested', affectedUrl: response.finalUrl, summary: zapResult.state === 'confirmed' ? `ZAP completed and returned ${zapResult.alertCount} alert(s).` : `ZAP did not fully complete: ${zapResult.error}`, testMethod: 'OWASP ZAP Docker packaged scan', evidence: { type: 'zap_json_report', raw: `${zapResult.alertCount} alert(s)`, artifactId: 'zap-json-report' }, limitations: zapResult.limitations || []
    });
  }
  const controlEvaluations = buildControlEvaluations(filteredChecks, findings, frameworks);
  riskCount = findings.filter((finding) => !['informational'].includes(finding.severity)).length;
  overallStatus = findings.some((finding) => ['critical', 'high'].includes(finding.severity)) ? 'high-attention' : findings.some((finding) => finding.severity === 'medium') ? 'review' : 'good';
  const frameworkPrefixes = { 'iso-27001': 'ISO27001:', gdpr: 'GDPR-', 'soc-2': 'SOC2-', hipaa: 'HIPAA-', 'pci-dss': 'PCI-DSS-' };
  const frameworkResultsWithControls = frameworkResults.map((framework) => ({
    ...framework,
    controlEvaluations: controlEvaluations.filter((control) => control.controlId.startsWith(frameworkPrefixes[framework.id] || '__none__'))
  }));

  return {
    schemaVersion: '2.0.0',
    scannerVersion: SCANNER_VERSION,
    reportType: 'security-compliance',
    generatedAt,
    startedAt,
    projectName,
    requestedUrl: parsed.href,
    finalUrl: response.finalUrl,
    jurisdiction,
    frameworks,
    responseStatus: response.status,
    redirectChain: response.redirectChain,
    overallStatus,
    riskCount,
    totals,
    checks: filteredChecks,
    findings,
    testResults,
    controlEvaluations,
    zap: { enabled: zapResult.enabled, mode: zapResult.mode, image: zapResult.image || '', state: zapResult.state, stateLabel: zapResult.stateLabel, exitCode: zapResult.exitCode ?? null, timedOut: Boolean(zapResult.timedOut), error: zapResult.error || '', alertCount: zapResult.alertCount || 0, limitations: zapResult.limitations || [] },
    frameworkResults: frameworkResultsWithControls,
    tlsAnalysis,
    browserScan,
    crawl,
    evidenceArchive: {
      metadata: {
        schemaVersion: '1.0.0',
        scannerVersion: SCANNER_VERSION,
        projectName,
        requestedUrl: parsed.href,
        finalUrl: response.finalUrl,
        startedAt,
        completedAt: generatedAt,
        frameworks,
        jurisdiction,
        configuration: {
          crawlEnabled,
          maxCrawlPages,
          browserRetryCount: browserScan.retryCount ?? Math.max(0, Math.min(4, Number.isFinite(Number(config.browserRetryCount)) ? Number(config.browserRetryCount) : 2)),
          browserTimeoutMs: Math.max(5000, Math.min(90000, Number(config.browserTimeoutMs) || 30000)),
          serviceWorkersBlocked: true,
          authentication: authentication.enabled ? { enabled: true, role: authentication.role, loginUrl: authentication.loginUrl, sessionReuseRequested: authentication.reuseSession, sessionSaved: Boolean(savedSession), persistentSessionKey: savedSession?.persistentAcrossRestarts || false } : { enabled: false }
        }
      },
      http: {
        initialResponse: {
          requestedUrl: parsed.href,
          finalUrl: response.finalUrl,
          status: response.status,
          headers: response.headers,
          rawHeaders: response.rawHeaders || [],
          rawSetCookieHeaders: response.setCookies || [],
          redirectChain: response.redirectChain || [],
          attempts: response.attempts || [],
          body: response.body || '',
          truncated: Boolean(response.truncated)
        }
      },
      browser: browserScan,
      tls: tlsAnalysis,
      crawl: {
        pages: crawlEvidencePages,
        errors: (crawl?.pages || []).filter((page) => page.error).map((page) => ({ url: page.url, status: page.status, error: page.error }))
      },
      zap: zapResult.enabled ? { mode: zapResult.mode, image: zapResult.image, state: zapResult.state, rawReport: zapResult.rawReport, stdout: zapResult.stdout, stderr: zapResult.stderr } : null
    },
    disclaimer: 'Automated website scanning can identify technical signals and gaps, but it cannot certify ISO 27001, GDPR, SOC 2, HIPAA, PCI DSS, or local-law compliance. Organizational, contractual, procedural, and legal requirements require manual assessment.'
  };
}

export const SECURITY_FRAMEWORKS = FRAMEWORKS;
export { analyzeCsp, classifyCookie, parseHsts, runBrowserSecurityScan };
