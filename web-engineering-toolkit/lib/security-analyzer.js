import { detectBrowsers } from './environment-checker.js';
import { requestWithRedirects } from './http-client.js';

const CATEGORY_LABELS = Object.freeze({
  headers: 'Security Headers',
  https: 'HTTPS & TLS',
  cookies: 'Cookies',
  mixedContent: 'Mixed Content'
});

const SCORE_VALUE = Object.freeze({ pass: 1, warning: 0.5, fail: 0, unavailable: null });
const PUBLIC_SECURITY_HEADERS = new Set(['content-security-policy', 'strict-transport-security', 'x-frame-options', 'x-content-type-options', 'referrer-policy', 'permissions-policy', 'cross-origin-opener-policy', 'cross-origin-resource-policy', 'cross-origin-embedder-policy']);

function result(id, label, status, currentValue, risk, recommendation, details = {}) {
  return { id, label, status, currentValue: currentValue || 'Not observed', risk, recommendation, ...details };
}

function normalizedHeaders(headers = {}) {
  return Object.fromEntries(Object.entries(headers).map(([name, value]) => [String(name).toLowerCase(), String(value ?? '')]));
}

function publicHeaders(headers = {}) {
  return Object.fromEntries(Object.entries(normalizedHeaders(headers)).filter(([name]) => PUBLIC_SECURITY_HEADERS.has(name)));
}

function publicHttpObservation(http, finalUrl, status) {
  const tls = http?.tls ? Object.fromEntries(['protocol', 'cipher', 'authorized', 'authorizationError', 'validFrom', 'validTo', 'issuer', 'subject', 'subjectAltName', 'bits', 'publicKeyType', 'ocspStapled'].map((key) => [key, http.tls[key] ?? ''])) : null;
  return { status: http?.status || status || 0, finalUrl: http?.finalUrl || finalUrl, redirectChain: (http?.redirectChain || []).map((hop) => ({ url: hop.url, status: hop.status, location: hop.location || '' })), tls, error: http?.error || '' };
}

function cspCheck(value) {
  if (!value) return result('content-security-policy', 'Content-Security-Policy', 'fail', '', 'No browser content restrictions were advertised.', 'Define a restrictive Content-Security-Policy and roll it out with reporting before enforcement.');
  const weaknesses = [];
  if (/\bunsafe-inline\b/i.test(value)) weaknesses.push('allows unsafe-inline');
  if (/\bunsafe-eval\b/i.test(value)) weaknesses.push('allows unsafe-eval');
  if (/(?:^|;)\s*default-src\s+\*/i.test(value) || /(?:^|;)\s*(?:script|style|img|connect)-src[^;]*\s\*/i.test(value)) weaknesses.push('contains wildcard source(s)');
  if (!/(?:^|;)\s*(?:default-src|script-src)\b/i.test(value)) weaknesses.push('does not define default-src or script-src');
  return weaknesses.length
    ? result('content-security-policy', 'Content-Security-Policy', 'warning', value, weaknesses.join('; '), 'Remove unsafe and wildcard sources where possible; prefer nonces or hashes and explicit origins.')
    : result('content-security-policy', 'Content-Security-Policy', 'pass', value, 'No common high-risk CSP weakness was detected.', 'Continue reviewing the policy as application dependencies change.');
}

export function analyzeSecurityHeaders(headers = {}, { isHttps = true } = {}) {
  const h = normalizedHeaders(headers);
  const checks = [cspCheck(h['content-security-policy'])];
  const hsts = h['strict-transport-security'] || '';
  if (!isHttps) checks.push(result('strict-transport-security', 'Strict-Transport-Security', 'fail', hsts, 'The page is not served over HTTPS, so HSTS cannot protect it.', 'Serve the site over HTTPS, then send HSTS on HTTPS responses.'));
  else if (!hsts) checks.push(result('strict-transport-security', 'Strict-Transport-Security', 'fail', '', 'Browsers are not instructed to require HTTPS on future visits.', 'Send Strict-Transport-Security with max-age of at least 31536000 and includeSubDomains where appropriate.'));
  else {
    const maxAge = Number(hsts.match(/max-age\s*=\s*(\d+)/i)?.[1] || 0);
    const issues = [];
    if (maxAge < 31536000) issues.push(`max-age is ${maxAge} seconds`);
    if (!/includesubdomains/i.test(hsts)) issues.push('includeSubDomains is missing');
    checks.push(result('strict-transport-security', 'Strict-Transport-Security', issues.length ? 'warning' : 'pass', hsts, issues.join('; ') || 'A durable HSTS policy was observed.', issues.length ? 'Use max-age=31536000 or longer and add includeSubDomains after confirming every subdomain supports HTTPS.' : 'Maintain HTTPS coverage before considering preload.'));
  }
  const xfo = h['x-frame-options'] || '';
  checks.push(xfo && /^(deny|sameorigin)$/i.test(xfo.trim())
    ? result('x-frame-options', 'X-Frame-Options', 'pass', xfo, 'Legacy clickjacking protection was observed.', 'Keep this aligned with CSP frame-ancestors.')
    : result('x-frame-options', 'X-Frame-Options', 'fail', xfo, xfo ? 'The value is not DENY or SAMEORIGIN.' : 'No legacy clickjacking protection was observed.', 'Send DENY or SAMEORIGIN and define CSP frame-ancestors.'));
  const xcto = h['x-content-type-options'] || '';
  checks.push(/^nosniff$/i.test(xcto.trim())
    ? result('x-content-type-options', 'X-Content-Type-Options', 'pass', xcto, 'MIME sniffing protection was observed.', 'Retain nosniff on relevant responses.')
    : result('x-content-type-options', 'X-Content-Type-Options', 'fail', xcto, 'Browsers may MIME-sniff content.', 'Send X-Content-Type-Options: nosniff.'));
  const referrer = h['referrer-policy'] || '';
  const weakReferrer = /^(unsafe-url|no-referrer-when-downgrade|origin-when-cross-origin)$/i.test(referrer.trim());
  checks.push(!referrer
    ? result('referrer-policy', 'Referrer-Policy', 'fail', '', 'No explicit referrer disclosure policy was observed.', 'Set a deliberate policy such as strict-origin-when-cross-origin or no-referrer.')
    : result('referrer-policy', 'Referrer-Policy', weakReferrer ? 'warning' : 'pass', referrer, weakReferrer ? 'The policy may disclose more URL information than necessary.' : 'An explicit non-weak policy was observed.', weakReferrer ? 'Prefer strict-origin-when-cross-origin or a stricter policy after testing.' : 'Keep the policy aligned with application requirements.'));
  const permissions = h['permissions-policy'] || '';
  const restrictedFeatures = (permissions.match(/(?:camera|microphone|geolocation|payment|usb)\s*=\s*\(\s*\)/gi) || []).length;
  checks.push(!permissions
    ? result('permissions-policy', 'Permissions-Policy', 'fail', '', 'No browser feature restrictions were observed.', 'Define an explicit Permissions-Policy for sensitive features that the application does not need.')
    : result('permissions-policy', 'Permissions-Policy', restrictedFeatures >= 2 ? 'pass' : 'warning', permissions, restrictedFeatures >= 2 ? 'Multiple sensitive features are explicitly disabled.' : 'Few common sensitive features are explicitly restricted.', 'Restrict unused camera, microphone, geolocation, payment, USB, and other capabilities.'));
  for (const [id, label, good, recommendation] of [
    ['cross-origin-opener-policy', 'Cross-Origin-Opener-Policy', /^(same-origin|same-origin-allow-popups)$/i, 'Use same-origin where cross-origin window isolation is compatible.'],
    ['cross-origin-resource-policy', 'Cross-Origin-Resource-Policy', /^(same-origin|same-site|cross-origin)$/i, 'Declare the narrowest compatible resource policy.'],
    ['cross-origin-embedder-policy', 'Cross-Origin-Embedder-Policy', /^(require-corp|credentialless)$/i, 'Use require-corp or credentialless when cross-origin isolation is required and compatible.']
  ]) {
    const value = h[id] || '';
    checks.push(value && good.test(value.trim())
      ? result(id, label, 'pass', value, 'An explicit cross-origin policy was observed.', recommendation)
      : result(id, label, value ? 'warning' : 'fail', value, value ? 'The policy value is not recognized by this analyzer.' : 'No explicit cross-origin policy was observed.', recommendation));
  }
  return checks;
}

export function parseSetCookie(value = '') {
  const parts = String(value).split(';').map((part) => part.trim()).filter(Boolean);
  const [pair = '', ...attributes] = parts;
  const equals = pair.indexOf('=');
  const name = equals >= 0 ? pair.slice(0, equals).trim() : pair.trim();
  const attrs = Object.fromEntries(attributes.map((part) => {
    const index = part.indexOf('=');
    return [part.slice(0, index < 0 ? undefined : index).toLowerCase(), index < 0 ? true : part.slice(index + 1)];
  }));
  return { name: name || '(unnamed)', secure: attrs.secure === true, httpOnly: attrs.httponly === true, sameSite: attrs.samesite ? String(attrs.samesite) : '', domain: attrs.domain ? String(attrs.domain).replace(/^\./, '') : '', source: 'response' };
}

function cookieFinding(cookie, pageUrl) {
  const pageHost = new URL(pageUrl).hostname.toLowerCase();
  const domain = String(cookie.domain || pageHost).toLowerCase().replace(/^\./, '');
  const thirdParty = domain !== pageHost && !pageHost.endsWith(`.${domain}`) && !domain.endsWith(`.${pageHost}`);
  const problems = [];
  if (!cookie.secure) problems.push('Secure missing');
  if (!cookie.httpOnly) problems.push('HttpOnly missing');
  if (!cookie.sameSite || /^none$/i.test(cookie.sameSite) && !cookie.secure) problems.push(cookie.sameSite ? 'SameSite=None without Secure' : 'SameSite missing');
  if (thirdParty) problems.push('third-party domain');
  const status = problems.some((problem) => /Secure missing|HttpOnly missing|without Secure/.test(problem)) ? 'fail' : problems.length ? 'warning' : 'pass';
  return { ...cookie, thirdParty, status, risk: problems.join('; ') || 'Secure, HttpOnly, and SameSite attributes were observed.', recommendation: problems.length ? 'Use Secure and HttpOnly for session or sensitive cookies, choose an explicit SameSite mode, and minimize third-party cookies.' : 'Retain the observed cookie protections.' };
}

export function analyzeCookies(cookies = [], pageUrl) {
  const deduped = new Map();
  for (const cookie of cookies) deduped.set(`${cookie.name}|${cookie.domain || ''}|${cookie.path || ''}`, cookie);
  return [...deduped.values()].map((cookie) => cookieFinding(cookie, pageUrl));
}

export function scoreChecks(checks = []) {
  const scored = checks.map((check) => SCORE_VALUE[check.status]).filter((value) => value != null);
  return scored.length ? Math.round(scored.reduce((sum, value) => sum + value, 0) / scored.length * 100) : null;
}

function summarizeCategory(label, checks) {
  return {
    label,
    score: scoreChecks(checks),
    passed: checks.filter((check) => check.status === 'pass').length,
    warnings: checks.filter((check) => check.status === 'warning').length,
    failures: checks.filter((check) => check.status === 'fail').length,
    unavailable: checks.filter((check) => check.status === 'unavailable').length,
    total: checks.length
  };
}

function resolvePageUrl(value, baseUrl) {
  const url = new URL(String(value || '/').trim() || '/', baseUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Unsupported target URL: ${value}`);
  return url.href;
}

async function browserObservations(browser, url, device, timeoutMs) {
  const mobile = device === 'mobile';
  const context = await browser.newContext({ viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 }, isMobile: mobile, ignoreHTTPSErrors: true, serviceWorkers: 'block' });
  const page = await context.newPage();
  const requests = [];
  page.on('request', (request) => requests.push({ url: request.url(), resourceType: request.resourceType() }));
  let response;
  try {
    response = await page.goto(url, { waitUntil: 'load', timeout: timeoutMs });
    try { await page.waitForLoadState('networkidle', { timeout: Math.min(timeoutMs, 8000) }); } catch {}
    const finalUrl = page.url();
    const finalHttps = new URL(finalUrl).protocol === 'https:';
    const mixedContent = finalHttps ? requests.filter((request) => /^http:\/\//i.test(request.url)).map((request) => ({ pageUrl: finalUrl, resourceUrl: request.url, resourceType: request.resourceType, status: ['script', 'stylesheet'].includes(request.resourceType) ? 'fail' : 'warning', risk: `An insecure ${request.resourceType} request was observed on an HTTPS page.`, recommendation: 'Serve this resource over HTTPS or remove it.' })) : [];
    const browserCookies = (await context.cookies()).map((cookie) => ({ name: cookie.name, domain: cookie.domain, path: cookie.path, secure: cookie.secure, httpOnly: cookie.httpOnly, sameSite: cookie.sameSite, source: 'browser' }));
    return { finalUrl, status: response?.status() || 0, responseHeaders: response?.headers() || {}, mixedContent, browserCookies };
  } finally { await context.close(); }
}

async function httpRedirectCheck(baseUrl, timeoutMs) {
  const base = new URL(baseUrl);
  if (base.protocol !== 'https:') return result('http-redirect', 'HTTP redirects to HTTPS', 'fail', base.href, 'The configured base URL itself uses HTTP.', 'Enable HTTPS and redirect every HTTP entry point to its HTTPS equivalent.');
  const httpUrl = new URL(base.href); httpUrl.protocol = 'http:'; httpUrl.port = '';
  try {
    const response = await requestWithRedirects(httpUrl.href, { timeout: timeoutMs, retries: 0, maxRedirects: 6, rejectUnauthorized: false, maxBodyBytes: 0 });
    const redirected = response.redirectChain.length > 1 && new URL(response.finalUrl).protocol === 'https:';
    return result('http-redirect', 'HTTP redirects to HTTPS', redirected ? 'pass' : 'fail', response.redirectChain.map((hop) => `${hop.status} ${hop.url}`).join(' → '), redirected ? 'The HTTP entry point redirected to HTTPS.' : 'The HTTP entry point did not complete on HTTPS.', 'Redirect all HTTP requests directly to HTTPS.');
  } catch (error) {
    return result('http-redirect', 'HTTP redirects to HTTPS', 'unavailable', '', `HTTP redirect behavior could not be tested: ${error.message}`, 'Confirm the HTTP entry point redirects to HTTPS from an external network.');
  }
}

function tlsChecks(page) {
  const isHttps = new URL(page.finalUrl).protocol === 'https:';
  const tls = page.http?.tls;
  const checks = [result('https-enabled', 'HTTPS enabled', isHttps ? 'pass' : 'fail', page.finalUrl, isHttps ? 'The final page used HTTPS.' : 'The final page used HTTP.', 'Serve every page and resource over HTTPS.')];
  if (!isHttps) {
    checks.push(result('certificate-validity', 'Certificate validity', 'unavailable', '', 'No HTTPS certificate was available.', 'Enable HTTPS with a publicly trusted certificate.'));
    checks.push(result('certificate-expiration', 'Certificate expiration', 'unavailable', '', 'No HTTPS certificate was available.', 'Enable HTTPS with a maintained certificate.'));
    checks.push(result('tls-version', 'TLS protocol', 'unavailable', '', 'No TLS connection was available.', 'Enable TLS 1.2 or newer.'));
    return checks;
  }
  if (!tls) {
    checks.push(result('certificate-validity', 'Certificate validity', 'unavailable', '', 'TLS metadata was not available from the request.', 'Verify the certificate chain from the deployment network.'));
    checks.push(result('certificate-expiration', 'Certificate expiration', 'unavailable', '', 'Certificate dates were not available.', 'Monitor certificate expiration independently.'));
    checks.push(result('tls-version', 'TLS protocol', 'unavailable', '', 'The negotiated TLS version was not available.', 'Require TLS 1.2 or newer.'));
    return checks;
  }
  checks.push(result('certificate-validity', 'Certificate validity', tls.authorized ? 'pass' : 'fail', tls.authorizationError || `${tls.subject || 'Certificate'} issued by ${tls.issuer || 'unknown issuer'}`, tls.authorized ? 'The certificate chain was authorized.' : `Certificate authorization failed: ${tls.authorizationError || 'unknown reason'}.`, 'Use a currently valid certificate whose chain and hostname verify.'));
  const expiry = Date.parse(tls.validTo);
  const days = Number.isFinite(expiry) ? Math.ceil((expiry - Date.now()) / 86400000) : null;
  checks.push(result('certificate-expiration', 'Certificate expiration', days == null ? 'unavailable' : days < 0 ? 'fail' : days < 30 ? 'warning' : 'pass', tls.validTo, days == null ? 'The certificate expiration date could not be parsed.' : days < 0 ? 'The certificate is expired.' : `${days} day(s) remain before expiration.`, 'Renew certificates before expiration and monitor renewal automation.', { issuer: tls.issuer || '', validFrom: tls.validFrom || '', validTo: tls.validTo || '' }));
  const protocol = String(tls.protocol || '');
  checks.push(result('tls-version', 'TLS protocol', /TLSv1\.[23]/i.test(protocol) ? 'pass' : 'fail', [protocol, tls.cipher].filter(Boolean).join(' · '), /TLSv1\.[23]/i.test(protocol) ? 'TLS 1.2 or newer was negotiated.' : 'A modern TLS protocol was not observed.', 'Disable obsolete TLS versions and weak cipher suites.'));
  return checks;
}

export async function analyzeWebsiteSecurity(input = {}) {
  const projectName = String(input.projectName || '').trim();
  const baseUrl = String(input.baseUrl || '').trim();
  if (projectName.length < 2) throw new Error('Project name must contain at least 2 characters.');
  let parsedBase;
  try { parsedBase = new URL(baseUrl); } catch { throw new Error('Enter a valid Base URL.'); }
  if (!['http:', 'https:'].includes(parsedBase.protocol)) throw new Error('Base URL must use http:// or https://.');
  const requestedPages = Array.isArray(input.pages) && input.pages.length ? input.pages : ['/'];
  if (requestedPages.length > 30) throw new Error('Analyze up to 30 pages in one report.');
  const urls = [...new Set(requestedPages.map((page) => resolvePageUrl(page, parsedBase.href)))];
  const timeoutMs = Math.min(60000, Math.max(1000, Number(input.timeoutMs) || 30000));
  const device = input.device === 'mobile' ? 'mobile' : 'desktop';
  const options = { headers: input.options?.headers !== false, https: input.options?.https !== false, cookies: input.options?.cookies !== false, mixedContent: input.options?.mixedContent !== false };
  const browsers = await detectBrowsers();
  const preferred = String(input.preferredBrowserPath || '');
  const browserInfo = preferred ? browsers.find((browser) => browser.path === preferred) : browsers[0];
  if (!browserInfo) throw new Error('Chrome, Chromium or Brave is required for the Security Headers & Web Security Analyzer.');
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: browserInfo.path, headless: true, args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'] });
  const pages = [];
  try {
    for (const url of urls) {
      const observed = await browserObservations(browser, url, device, timeoutMs);
      let http;
      try { http = await requestWithRedirects(url, { timeout: timeoutMs, retries: 0, maxRedirects: 8, rejectUnauthorized: false, maxBodyBytes: 0 }); }
      catch (error) { http = { finalUrl: observed.finalUrl, status: observed.status, headers: observed.responseHeaders, setCookies: [], tls: null, error: error.message }; }
      const finalUrl = http.finalUrl || observed.finalUrl;
      const safeHeaders = publicHeaders(http.headers || observed.responseHeaders);
      const headerChecks = options.headers ? analyzeSecurityHeaders(safeHeaders, { isHttps: new URL(finalUrl).protocol === 'https:' }) : [];
      const cookies = [...(http.setCookies || []).map(parseSetCookie), ...observed.browserCookies];
      const cookieFindings = options.cookies ? analyzeCookies(cookies, finalUrl) : [];
      const cookieChecks = options.cookies ? (cookieFindings.length ? cookieFindings.map((cookie, index) => result(`cookie-${index + 1}`, `Cookie: ${cookie.name}`, cookie.status, [cookie.secure && 'Secure', cookie.httpOnly && 'HttpOnly', cookie.sameSite && `SameSite=${cookie.sameSite}`, cookie.domain && `Domain=${cookie.domain}`].filter(Boolean).join('; '), cookie.risk, cookie.recommendation, cookie)) : [result('cookies-observed', 'Cookie security', 'pass', 'No cookies observed', 'No cookies were set or stored during this page load.', 'Re-run authenticated and consent scenarios separately if they set additional cookies.')]) : [];
      const finalIsHttps = new URL(finalUrl).protocol === 'https:';
      const mixedChecks = options.mixedContent ? [result('mixed-content', 'Mixed content', !finalIsHttps ? 'unavailable' : observed.mixedContent.length ? (observed.mixedContent.some((item) => item.status === 'fail') ? 'fail' : 'warning') : 'pass', !finalIsHttps ? 'HTTPS page not available' : `${observed.mixedContent.length} insecure request(s)`, !finalIsHttps ? 'Mixed content is only defined for a page loaded over HTTPS.' : observed.mixedContent.length ? 'HTTP resources were requested from an HTTPS page.' : 'No HTTP subresource requests were observed on this page load.', !finalIsHttps ? 'Enable HTTPS, then repeat the mixed-content analysis.' : 'Serve every page subresource over HTTPS.')] : [];
      const pageResult = { requestedUrl: url, finalUrl, status: http.status || observed.status, headers: safeHeaders, headerChecks, http: publicHttpObservation(http, finalUrl, observed.status), cookieFindings, cookieChecks, mixedContent: observed.mixedContent, mixedChecks };
      pageResult.tlsChecks = options.https ? tlsChecks(pageResult) : [];
      pages.push(pageResult);
    }
  } finally { await browser.close(); }
  const redirectCheck = options.https ? await httpRedirectCheck(parsedBase.href, timeoutMs) : null;
  const allChecks = {
    headers: pages.flatMap((page) => page.headerChecks),
    https: options.https ? [...pages.flatMap((page) => page.tlsChecks), redirectCheck] : [],
    cookies: pages.flatMap((page) => page.cookieChecks),
    mixedContent: pages.flatMap((page) => page.mixedChecks)
  };
  const categories = Object.fromEntries(Object.entries(allChecks).map(([key, checks]) => [key, summarizeCategory(CATEGORY_LABELS[key], checks)]));
  const scoredCategories = Object.values(categories).filter((category) => category.score != null);
  const score = scoredCategories.length ? Math.round(scoredCategories.reduce((sum, category) => sum + category.score, 0) / scoredCategories.length) : null;
  const findings = Object.entries(allChecks).flatMap(([category, checks]) => checks.filter((check) => check.status !== 'pass').map((check) => ({ category, ...check })));
  const recommendations = [...new Map(findings.filter((finding) => finding.status !== 'unavailable').map((finding) => [`${finding.category}|${finding.recommendation}`, { category: finding.category, priority: finding.status === 'fail' ? 'high' : 'medium', title: finding.label, recommendation: finding.recommendation }])).values()];
  return { schemaVersion: '1.0.0', reportType: 'security-analyzer', projectName, baseUrl: parsedBase.href.replace(/\/$/, ''), generatedAt: new Date().toISOString(), scanType: pages.length === 1 ? 'single-page' : 'selected-pages', environment: { browser: browserInfo.name, browserPath: browserInfo.path, device, timeoutMs }, options, pages, redirectCheck, categories, score, findings, recommendations };
}
