import { URL } from 'node:url';
import { requestWithRedirects } from './http-client.js';
import { discoverEvidencePages, extractComplianceEvidence } from './website-crawler.js';

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
  tls: ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  hsts: ['iso-27001', 'soc-2', 'hipaa', 'pci-dss'],
  csp: ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  clickjacking: ['iso-27001', 'soc-2', 'hipaa', 'pci-dss'],
  nosniff: ['iso-27001', 'soc-2', 'hipaa', 'pci-dss'],
  'referrer-policy': ['gdpr', 'iso-27001', 'soc-2'],
  'permissions-policy': ['gdpr', 'iso-27001', 'soc-2'],
  cookies: ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss', 'local'],
  cors: ['iso-27001', 'soc-2', 'hipaa', 'pci-dss'],
  disclosure: ['iso-27001', 'soc-2', 'pci-dss'],
  'mixed-content': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  'password-transport': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  privacy: ['gdpr', 'local'],
  consent: ['gdpr', 'local'],
  'third-party-scripts': ['gdpr', 'iso-27001', 'soc-2'],
  'security-txt': ['iso-27001', 'soc-2'],
  'evidence-privacy-page': ['gdpr', 'hipaa', 'local'],
  'evidence-security-page': ['iso-27001', 'soc-2', 'pci-dss'],
  'evidence-compliance-page': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss', 'local'],
  'evidence-data-subject-rights': ['gdpr', 'local'],
  'evidence-consent-management': ['gdpr', 'local'],
  'evidence-breach-notification': ['gdpr', 'hipaa', 'iso-27001', 'soc-2'],
  'evidence-certifications': ['iso-27001', 'soc-2', 'pci-dss']
};

function result({ id, title, category, status, summary, details = '', recommendation = '', evidence = '' }) {
  return {
    id, title, category, status, summary, details, recommendation, evidence,
    frameworks: CHECK_FRAMEWORKS[id] || []
  };
}

// --- Cookie sensitivity classification -------------------------------------
// Not every cookie is a session/auth cookie, so flagging every missing
// attribute at the same severity produces noisy false positives (e.g. a
// language-preference cookie is not equivalent to a session-id cookie).
const SENSITIVE_COOKIE_PATTERN = /session|(?:^|[_-])sid(?:[_-]|$)|auth|token|jwt|login|logged.?in|user.?id|uid|csrf|xsrf|remember.?me|account|credential|refresh/i;
const TRACKING_COOKIE_PATTERN = /^(_ga|_gid|_gat|_fbp|_fbc|_gcl|_hj|_pk_|_uetsid|_uetvid|amplitude|mixpanel|intercom|hubspot|_clck|_clsk)/i;
const FUNCTIONAL_COOKIE_PATTERN = /\b(lang|locale|currency|theme|region|timezone|consent|cookie.?consent|cookieconsent|display|layout)\b/i;

function classifyCookie(name) {
  if (SENSITIVE_COOKIE_PATTERN.test(name)) return 'session-or-auth';
  if (TRACKING_COOKIE_PATTERN.test(name)) return 'tracking-analytics';
  if (FUNCTIONAL_COOKIE_PATTERN.test(name)) return 'functional-preference';
  return 'unclassified';
}

function cookieChecks(cookies = []) {
  if (!cookies.length) {
    return result({ id: 'cookies', title: 'Cookie security attributes', category: 'Privacy & session', status: 'info', summary: 'No Set-Cookie headers were observed on the scanned response.', details: 'Cookies may still be created after JavaScript runs or on other pages.', recommendation: 'Review authenticated/session pages as well if the website uses cookies.' });
  }
  const highSeverity = [];
  const lowSeverity = [];
  const details = [];
  for (const cookie of cookies) {
    const name = cookie.split('=')[0]?.trim() || 'cookie';
    const lower = cookie.toLowerCase();
    const category = classifyCookie(name);
    const missing = [];
    if (!lower.includes('; secure')) missing.push('Secure');
    if (!lower.includes('; httponly')) missing.push('HttpOnly');
    if (!lower.includes('; samesite=')) missing.push('SameSite');
    if (!missing.length) continue;
    const entry = `${name} [${category}]: missing ${missing.join(', ')}`;
    details.push(entry);
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
        : 'Observed cookies use Secure, HttpOnly, and SameSite attributes appropriate to their apparent sensitivity.',
    details: details.join(' · '),
    recommendation: highSeverity.length
      ? 'Add Secure, HttpOnly, and SameSite attributes to session/authentication cookies as a priority.'
      : (lowSeverity.length ? 'Consider adding Secure/SameSite to remaining cookies where practical; these are lower risk than session cookies.' : ''),
    evidence: `${cookies.length} Set-Cookie header${cookies.length === 1 ? '' : 's'} observed; classified by likely sensitivity (session/auth vs. tracking vs. functional).`
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
  if (!cspHeader) return { present: false, strength: 'missing', directives: {}, issues: [] };
  const directives = parseCsp(cspHeader);
  const issues = [];
  const scriptSrc = directives['script-src'] || directives['default-src'] || [];
  const styleSrc = directives['style-src'] || directives['default-src'] || [];

  if (!directives['default-src'] && !directives['script-src']) issues.push('No default-src or script-src fallback is defined.');
  if (scriptSrc.some((v) => v === '*')) issues.push("script-src allows any origin ('*').");
  if (scriptSrc.some((v) => v === "'unsafe-inline'")) issues.push("script-src allows 'unsafe-inline'.");
  if (scriptSrc.some((v) => v === "'unsafe-eval'")) issues.push("script-src allows 'unsafe-eval'.");
  if (styleSrc.some((v) => v === "'unsafe-inline'")) issues.push("style-src allows 'unsafe-inline'.");
  if (!directives['object-src'] || !directives['object-src'].includes("'none'")) issues.push("object-src is not restricted to 'none'.");
  if (!directives['base-uri']) issues.push('base-uri is not restricted.');
  if (!directives['frame-ancestors']) issues.push('frame-ancestors is not restricted.');

  const strength = issues.length === 0 ? 'strong' : issues.length <= 2 ? 'moderate' : 'weak';
  return { present: true, strength, directives, issues };
}

export async function scanWebsiteSecurity(config = {}) {
  const projectName = String(config.projectName || '').trim();
  const targetUrl = String(config.targetUrl || '').trim();
  const jurisdiction = String(config.jurisdiction || '').trim();
  const frameworks = Array.isArray(config.frameworks) ? [...new Set(config.frameworks.filter((id) => FRAMEWORKS[id]))] : Object.keys(FRAMEWORKS);
  const crawlEnabled = config.crawl !== false;
  const maxCrawlPages = Math.max(1, Math.min(25, Number(config.maxCrawlPages) || 10));
  if (!projectName) throw new Error('Project name is required.');
  if (!targetUrl) throw new Error('Target URL is required.');
  let parsed;
  try { parsed = new URL(targetUrl); } catch { throw new Error('Target URL must be a valid URL.'); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('Target URL must use http:// or https://.');
  if (!frameworks.length) throw new Error('Select at least one compliance framework.');

  const startedAt = new Date().toISOString();
  let response;
  let strictTlsError = '';
  try {
    response = await requestWithRedirects(parsed.href, { rejectUnauthorized: true });
  } catch (error) {
    if (parsed.protocol !== 'https:') throw error;
    strictTlsError = error.message;
    response = await requestWithRedirects(parsed.href, { rejectUnauthorized: false });
    if (response.tls) {
      response.tls.authorized = false;
      response.tls.authorizationError = response.tls.authorizationError || strictTlsError;
    }
  }
  const finalUrl = new URL(response.finalUrl);
  const headers = response.headers;
  const html = response.body || '';
  const checks = [];

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
      checks.push(result({ id: 'http-to-https', title: 'HTTP to HTTPS redirect', category: 'Transport security', status: 'info', summary: 'The HTTP redirect probe could not be completed.', details: error.message, recommendation: 'Verify manually that HTTP traffic is redirected to HTTPS.' }));
    }
  } else {
    checks.push(result({ id: 'http-to-https', title: 'HTTP to HTTPS redirect', category: 'Transport security', status: 'fail', summary: 'The scanned page remains on HTTP.', recommendation: 'Configure a permanent redirect from HTTP to HTTPS.' }));
  }

  if (finalUrl.protocol === 'https:' && !response.tls) {
    // With TLS now captured at handshake time, this only happens when the
    // handshake genuinely never completed (e.g. a proxy terminated TLS and
    // relayed plaintext) — it can no longer occur alongside a passing HTTPS
    // check for a normal successful connection.
    checks.push(result({ id: 'tls', title: 'TLS connection and certificate', category: 'Transport security', status: 'warning', summary: 'The response was delivered over HTTPS but TLS handshake details could not be captured.', details: 'This can indicate a TLS-terminating proxy in front of the origin. Treat certificate/protocol findings as unverified.', recommendation: 'Verify certificate and TLS configuration directly against the origin server.' }));
  } else if (response.tls) {
    const protocol = response.tls.protocol || '';
    const modern = /TLSv1\.[23]/i.test(protocol);
    checks.push(result({ id: 'tls', title: 'TLS connection and certificate', category: 'Transport security', status: response.tls.authorized && modern ? 'pass' : 'warning', summary: response.tls.authorized ? `TLS certificate validated${protocol ? ` using ${protocol}` : ''}.` : 'TLS certificate validation reported a problem.', details: [response.tls.authorizationError, response.tls.validTo ? `Certificate valid to ${response.tls.validTo}` : '', response.tls.issuer ? `Issuer: ${response.tls.issuer}` : ''].filter(Boolean).join(' · '), recommendation: response.tls.authorized && modern ? '' : 'Use a valid certificate and a modern TLS configuration.' }));
  } else {
    checks.push(result({ id: 'tls', title: 'TLS connection and certificate', category: 'Transport security', status: 'fail', summary: 'No TLS connection was established.', recommendation: 'Serve the website over HTTPS with a valid TLS certificate.' }));
  }

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
    details: cspAnalysis.present ? [csp.slice(0, 700), ...cspAnalysis.issues].filter(Boolean).join(' · ') : '',
    recommendation: !cspAnalysis.present
      ? 'Define a Content Security Policy appropriate for the application and third-party resources.'
      : (cspAnalysis.issues.length ? `Tighten the policy: ${cspAnalysis.issues.join(' ')}` : '')
  }));
  const xfo = headers['x-frame-options'] || '';
  const frameAncestors = Boolean(cspAnalysis.directives['frame-ancestors']);
  checks.push(result({ id: 'clickjacking', title: 'Clickjacking protection', category: 'Security headers', status: xfo || frameAncestors ? 'pass' : 'warning', summary: xfo || frameAncestors ? 'Frame embedding restrictions were detected.' : 'No X-Frame-Options or CSP frame-ancestors directive was detected.', details: xfo ? `X-Frame-Options: ${xfo}` : (frameAncestors ? 'CSP frame-ancestors directive present.' : ''), recommendation: xfo || frameAncestors ? '' : 'Restrict framing with CSP frame-ancestors and/or X-Frame-Options where appropriate.' }));
  const nosniff = (headers['x-content-type-options'] || '').toLowerCase() === 'nosniff';
  checks.push(result({ id: 'nosniff', title: 'MIME sniffing protection', category: 'Security headers', status: nosniff ? 'pass' : 'warning', summary: nosniff ? 'X-Content-Type-Options is set to nosniff.' : 'X-Content-Type-Options: nosniff was not detected.', recommendation: nosniff ? '' : 'Send X-Content-Type-Options: nosniff.' }));
  checks.push(result({ id: 'referrer-policy', title: 'Referrer Policy', category: 'Privacy & browser controls', status: headers['referrer-policy'] ? 'pass' : 'warning', summary: headers['referrer-policy'] ? 'Referrer-Policy header is present.' : 'Referrer-Policy header is missing.', details: headers['referrer-policy'] || '', recommendation: headers['referrer-policy'] ? '' : 'Define an explicit Referrer-Policy suitable for the application.' }));
  checks.push(result({ id: 'permissions-policy', title: 'Permissions Policy', category: 'Privacy & browser controls', status: headers['permissions-policy'] ? 'pass' : 'info', summary: headers['permissions-policy'] ? 'Permissions-Policy header is present.' : 'Permissions-Policy header was not detected.', details: headers['permissions-policy'] || '', recommendation: headers['permissions-policy'] ? '' : 'Consider explicitly restricting browser features that the site does not need.' }));

  checks.push(cookieChecks(response.setCookies));

  const acao = headers['access-control-allow-origin'] || '';
  checks.push(result({ id: 'cors', title: 'Cross-Origin Resource Sharing (CORS)', category: 'Application exposure', status: acao === '*' ? 'warning' : 'pass', summary: acao === '*' ? 'The response allows any origin with Access-Control-Allow-Origin: *.' : acao ? `CORS is restricted to: ${acao}` : 'No permissive CORS header was detected on this response.', details: acao ? `Access-Control-Allow-Origin: ${acao}` : '', recommendation: acao === '*' ? 'Review whether wildcard cross-origin access is required, especially for sensitive API responses.' : '' }));

  const disclosures = [];
  if (headers.server) disclosures.push(`Server: ${headers.server}`);
  if (headers['x-powered-by']) disclosures.push(`X-Powered-By: ${headers['x-powered-by']}`);
  checks.push(result({ id: 'disclosure', title: 'Technology disclosure headers', category: 'Application exposure', status: disclosures.length ? 'warning' : 'pass', summary: disclosures.length ? 'Technology/server details are exposed in response headers.' : 'No Server or X-Powered-By disclosure header was detected.', details: disclosures.join(' · '), recommendation: disclosures.length ? 'Reduce unnecessary version/product disclosure where practical.' : '' }));

  const mixedMatches = [...html.matchAll(/\b(?:src|href|action)\s*=\s*["'](http:\/\/[^"']+)["']/gi)].map((m) => m[1]).slice(0, 10);
  checks.push(result({ id: 'mixed-content', title: 'Mixed/insecure resource references', category: 'Page content', status: finalUrl.protocol === 'https:' && mixedMatches.length ? 'fail' : 'pass', summary: mixedMatches.length ? `${mixedMatches.length} insecure http:// resource reference${mixedMatches.length === 1 ? '' : 's'} detected in the scanned HTML.` : 'No direct http:// resource references were detected in the scanned HTML.', details: mixedMatches.join(' · '), recommendation: mixedMatches.length ? 'Load page resources and form actions over HTTPS.' : '' }));

  const passwordInputs = (html.match(/<input\b[^>]*\btype\s*=\s*["']password["'][^>]*>/gi) || []).length;
  checks.push(result({ id: 'password-transport', title: 'Password transport', category: 'Page content', status: passwordInputs && finalUrl.protocol !== 'https:' ? 'fail' : 'pass', summary: passwordInputs ? (finalUrl.protocol === 'https:' ? 'Password fields detected on an HTTPS page.' : 'Password fields were detected on an insecure HTTP page.') : 'No password field was detected in the scanned HTML.', recommendation: passwordInputs && finalUrl.protocol !== 'https:' ? 'Never collect passwords over HTTP.' : '' }));

  const privacyDetected = /(?:href|aria-label|title)\s*=\s*["'][^"']*privacy[^"']*["']|>\s*privacy(?:\s+policy)?\s*</i.test(html);
  checks.push(result({ id: 'privacy', title: 'Privacy policy signal', category: 'Privacy & transparency', status: privacyDetected ? 'pass' : 'manual', summary: privacyDetected ? 'A privacy-policy signal/link was detected in the scanned HTML.' : 'A privacy-policy link was not confidently detected on this page.', recommendation: privacyDetected ? '' : 'Verify manually that users can easily access the applicable privacy notice.' }));

  const consentDetected = /cookie.{0,80}(?:consent|preferences|settings|accept|reject)|(?:consent|preferences).{0,80}cookie/is.test(html);
  checks.push(result({ id: 'consent', title: 'Cookie consent signal', category: 'Privacy & transparency', status: consentDetected ? 'pass' : 'manual', summary: consentDetected ? 'Cookie-consent/preference text was detected.' : 'No clear cookie-consent interface was detected in the initial HTML.', details: 'This check cannot determine whether consent behavior is legally sufficient.', recommendation: 'Verify consent requirements and behavior manually for the jurisdictions and tracking technologies that apply.' }));

  const thirdParty = findThirdPartyScripts(html, response.finalUrl);
  checks.push(result({ id: 'third-party-scripts', title: 'Third-party scripts', category: 'Privacy & supply chain', status: thirdParty.length ? 'manual' : 'pass', summary: thirdParty.length ? `${thirdParty.length} third-party script host${thirdParty.length === 1 ? '' : 's'} detected.` : 'No third-party script hosts were detected in the initial HTML.', details: thirdParty.slice(0, 20).join(', '), recommendation: thirdParty.length ? 'Review each third-party script for necessity, data handling, contractual controls, consent requirements, and supply-chain risk.' : '' }));

  try {
    const securityTxtUrl = new URL('/.well-known/security.txt', response.finalUrl).href;
    const securityTxt = await requestWithRedirects(securityTxtUrl, { rejectUnauthorized: true, maxBodyBytes: 200_000 });
    const found = securityTxt.status >= 200 && securityTxt.status < 300 && /contact\s*:/i.test(securityTxt.body || '');
    checks.push(result({ id: 'security-txt', title: 'security.txt disclosure channel', category: 'Security operations', status: found ? 'pass' : 'info', summary: found ? 'A .well-known/security.txt file with a Contact field was detected.' : 'A usable .well-known/security.txt file was not detected.', recommendation: found ? '' : 'Consider publishing security.txt if a public vulnerability-reporting channel is appropriate for the organization.' }));
  } catch (error) {
    checks.push(result({ id: 'security-txt', title: 'security.txt disclosure channel', category: 'Security operations', status: 'info', summary: 'security.txt could not be verified.', details: error.message }));
  }

  // --- Website crawl for compliance evidence --------------------------------
  // Important evidence (privacy/terms/security/compliance pages) usually
  // lives off the homepage, so scanning only the requested URL misses it.
  let crawl = null;
  if (crawlEnabled) {
    try {
      const pages = await discoverEvidencePages(response.finalUrl, html, { maxPages: maxCrawlPages });
      const evidence = extractComplianceEvidence(pages);
      crawl = {
        pagesScanned: pages.length,
        pages: pages.map((p) => ({ url: p.finalUrl || p.url, status: p.status, found: p.found, groups: p.groups })),
        ...evidence
      };

      const hasGroup = (g) => (evidence.pagesFoundByGroup[g] || []).length > 0;

      checks.push(result({ id: 'evidence-privacy-page', title: 'Privacy policy page discovered', category: 'Compliance evidence', status: hasGroup('privacy') ? 'pass' : 'manual', summary: hasGroup('privacy') ? `A privacy-related page was found: ${evidence.pagesFoundByGroup.privacy.join(', ')}` : 'No dedicated privacy policy page was discovered by crawling common paths and homepage links.', recommendation: hasGroup('privacy') ? '' : 'Publish a clearly linked privacy policy.' }));
      checks.push(result({ id: 'evidence-security-page', title: 'Security/trust page discovered', category: 'Compliance evidence', status: hasGroup('security') ? 'pass' : 'manual', summary: hasGroup('security') ? `A security/trust page was found: ${evidence.pagesFoundByGroup.security.join(', ')}` : 'No dedicated security or trust-center page was discovered.', recommendation: hasGroup('security') ? '' : 'Consider publishing a security/trust page describing controls and certifications.' }));
      checks.push(result({ id: 'evidence-compliance-page', title: 'Compliance/legal page discovered', category: 'Compliance evidence', status: (hasGroup('compliance') || hasGroup('terms')) ? 'pass' : 'manual', summary: (hasGroup('compliance') || hasGroup('terms')) ? `Compliance/legal or terms pages were found: ${[...(evidence.pagesFoundByGroup.compliance || []), ...(evidence.pagesFoundByGroup.terms || [])].join(', ')}` : 'No dedicated compliance or terms page was discovered.', recommendation: (hasGroup('compliance') || hasGroup('terms')) ? '' : 'Publish terms of service and, where applicable, a dedicated compliance/legal page.' }));
      checks.push(result({ id: 'evidence-data-subject-rights', title: 'Data subject rights language', category: 'Compliance evidence', status: evidence.evidenceFound.dataSubjectRights ? 'pass' : 'manual', summary: evidence.evidenceFound.dataSubjectRights ? 'Language describing data subject rights (access, erasure, opt-out, etc.) was found on crawled pages.' : 'No explicit data subject rights language was found on crawled pages.', recommendation: evidence.evidenceFound.dataSubjectRights ? '' : 'Describe data subject rights (access, erasure, portability, opt-out) in the privacy policy.' }));
      checks.push(result({ id: 'evidence-consent-management', title: 'Cookie/consent management evidence', category: 'Compliance evidence', status: evidence.evidenceFound.consentManagement ? 'pass' : 'manual', summary: evidence.evidenceFound.consentManagement ? 'Consent-management language or a known consent platform was detected on crawled pages.' : 'No consent-management platform or language was detected on crawled pages.', recommendation: evidence.evidenceFound.consentManagement ? '' : 'Verify a compliant cookie-consent mechanism is deployed for applicable jurisdictions.' }));
      checks.push(result({ id: 'evidence-breach-notification', title: 'Breach notification / incident response language', category: 'Compliance evidence', status: evidence.evidenceFound.breachNotification ? 'pass' : 'manual', summary: evidence.evidenceFound.breachNotification ? 'Breach notification or incident response language was found on crawled pages.' : 'No breach notification or incident response language was found on crawled pages.', recommendation: evidence.evidenceFound.breachNotification ? '' : 'Publish a summary of breach notification / incident response commitments where applicable.' }));

      const certList = Object.entries(evidence.certifications).filter(([, found]) => found).map(([id]) => FRAMEWORKS[id]?.label || id.toUpperCase());
      checks.push(result({
        id: 'evidence-certifications', title: 'Certification / framework mentions', category: 'Compliance evidence',
        status: 'manual',
        summary: certList.length ? `The following certifications/frameworks were mentioned on crawled pages: ${certList.join(', ')}.` : 'No certification or framework mentions were found on crawled pages.',
        details: certList.join(', '),
        recommendation: 'A text mention is not proof of certification. Verify any certification claim against a current, signed certificate or audit report before relying on it.'
      }));
    } catch (error) {
      crawl = { error: error.message, pagesScanned: 0, pages: [] };
    }
  }

  const selectedSet = new Set(frameworks);
  const filteredChecks = checks.map((check) => ({ ...check, frameworks: check.frameworks.filter((id) => selectedSet.has(id)) }));
  const frameworkResults = frameworks.map((id) => {
    const applicable = filteredChecks.filter((check) => check.frameworks.includes(id));
    const automated = applicable.filter((check) => !['manual', 'info'].includes(check.status));
    const passed = automated.filter((check) => check.status === 'pass').length;
    const attention = automated.filter((check) => ['warning', 'fail'].includes(check.status)).length;
    const manual = applicable.filter((check) => ['manual', 'info'].includes(check.status)).length;
    const score = automated.length ? Math.round((passed / automated.length) * 100) : null;
    return {
      id,
      label: FRAMEWORKS[id].label,
      technicalCoverage: score,
      automatedChecks: automated.length,
      passed,
      attention,
      manualReview: manual,
      jurisdiction: id === 'local' ? jurisdiction : '',
      note: id === 'local'
        ? 'Local-regulation applicability depends on jurisdiction, industry, data, and service context. Manual legal review is required.'
        : 'This is a technical website-control mapping only; it is not certification or a compliance determination.'
    };
  });

  const totals = {
    pass: filteredChecks.filter((check) => check.status === 'pass').length,
    warning: filteredChecks.filter((check) => check.status === 'warning').length,
    fail: filteredChecks.filter((check) => check.status === 'fail').length,
    manual: filteredChecks.filter((check) => check.status === 'manual').length,
    info: filteredChecks.filter((check) => check.status === 'info').length
  };
  const riskCount = totals.fail + totals.warning;
  const overallStatus = totals.fail ? 'high-attention' : totals.warning ? 'review' : 'good';

  return {
    reportType: 'security-compliance',
    generatedAt: new Date().toISOString(),
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
    frameworkResults,
    crawl,
    disclaimer: 'Automated website scanning can identify technical signals and gaps, but it cannot certify ISO 27001, GDPR, SOC 2, HIPAA, PCI DSS, or local-law compliance. Organizational, contractual, procedural, and legal requirements require manual assessment.'
  };
}

export const SECURITY_FRAMEWORKS = FRAMEWORKS;
