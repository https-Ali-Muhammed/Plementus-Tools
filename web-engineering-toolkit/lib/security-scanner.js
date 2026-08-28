import { URL } from 'node:url';
import tls from 'node:tls';
import dns from 'node:dns/promises';
import { requestWithRedirects } from './http-client.js';
import { detectLocale, discoverEvidencePages, extractComplianceEvidence, resolveDocumentCandidate } from './website-crawler.js';
import { detectBrowsers } from './environment-checker.js';
import { sleep } from './utils.js';
import { buildControlEvaluations, buildFindings, buildTestResults, mergeFindingsByFingerprint, resolveLocalJurisdictions } from './security-finding-model.js';
import { MAPPING_CATALOG_VERSION, frameworkForControl } from './security-mapping-registry.js';
import { classifyNegativeObservation, normalizeCollectionMethod, normalizeCollectionState, normalizeEvidenceConfidence, normalizeEvidenceStrength, normalizeTraceabilityTuple } from './security-evidence-semantics.js';
import { TOOL_VERSION } from './tool-version.js';
import { buildZapEvidenceMetadata, runZapScan } from './zap-runner.js';
import {
  buildCollectionCoverage,
  canonicalizeObservedUrl,
  classifyObservedDestination,
  compareConsentSnapshots,
  normalizeSafeFormMetadata
} from './security-collection-model.js';
import {
  applicabilityPresentation,
  FRAMEWORK_DISPLAY_NAMES,
  frameworkManualReviewReasons,
  RELATIONSHIP_DEFINITIONS,
  RELATIONSHIP_DISCLAIMER,
  REVIEW_REASON_DEFINITIONS
} from './security-compliance-semantics.js';

const SCANNER_VERSION = TOOL_VERSION;
const RESULT_STATES = {
  confirmed: 'Technical Check Completed',
  observed: 'Observed',
  inferred: 'Inferred',
  not_tested: 'Not Tested',
  failed_to_test: 'Failed To Test'
};

const FRAMEWORKS = {
  'iso-27001': { label: FRAMEWORK_DISPLAY_NAMES['iso-27001'] },
  gdpr: { label: FRAMEWORK_DISPLAY_NAMES.gdpr },
  eprivacy: { label: FRAMEWORK_DISPLAY_NAMES.eprivacy },
  'soc-2': { label: FRAMEWORK_DISPLAY_NAMES['soc-2'] },
  hipaa: { label: FRAMEWORK_DISPLAY_NAMES.hipaa },
  'pci-dss': { label: FRAMEWORK_DISPLAY_NAMES['pci-dss'] },
  local: { label: FRAMEWORK_DISPLAY_NAMES.local }
};

const APPLICABILITY_VALUES = new Set(['unknown', 'applicable', 'not_applicable']);

function normalizeApplicabilityValue(value) {
  if (value === true || /^(yes|applicable|in[_ -]?scope)$/i.test(String(value || ''))) return 'applicable';
  if (value === false || /^(no|not[_ -]?applicable|out[_ -]?of[_ -]?scope)$/i.test(String(value || ''))) return 'not_applicable';
  return 'unknown';
}

export function normalizeFrameworkApplicability(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  return Object.fromEntries(Object.keys(FRAMEWORKS).map((id) => {
    const normalized = normalizeApplicabilityValue(source[id]);
    return [id, APPLICABILITY_VALUES.has(normalized) ? normalized : 'unknown'];
  }));
}

export function buildOperatorScopeEvidence({ frameworkApplicability = {}, jurisdiction = '', sourceUrl = '', observedAt = '' } = {}) {
  return [
    ...Object.entries(normalizeFrameworkApplicability(frameworkApplicability))
      .filter(([, state]) => state !== 'unknown')
      .map(([framework, state]) => ({
        evidenceId: `scope_${framework}`,
        evidenceType: 'operator_scope_input',
        evidenceStrength: 'manual_evidence',
        sourceMethod: 'operator_input',
        sourceUrl,
        observedAt,
        confidence: 'asserted_not_verified',
        framework,
        state,
        limitations: ['Operator scope input was recorded but was not independently verified by the scanner.']
      })),
    ...(String(jurisdiction || '').trim() ? [{
      evidenceId: 'scope_local_jurisdiction',
      evidenceType: 'operator_scope_input',
      evidenceStrength: 'manual_evidence',
      sourceMethod: 'operator_input',
      sourceUrl,
      observedAt,
      confidence: 'asserted_not_verified',
      jurisdiction: String(jurisdiction).trim(),
      limitations: ['Jurisdiction was supplied by the operator and was not inferred from the website or independently verified.']
    }] : [])
  ];
}

export function assessInitialTracking({ consentInterfaceDetected = false, trackingRequestCount = 0, freshContext = true } = {}) {
  const trackingObserved = Number(trackingRequestCount) > 0;
  return {
    freshConsentContext: Boolean(freshContext),
    trackingBeforeConsent: Boolean(freshContext && consentInterfaceDetected && trackingObserved),
    trackingWithoutConsentInterface: Boolean(freshContext && !consentInterfaceDetected && trackingObserved)
  };
}

export function assessPrivacyRuntimeConsistency({ noAdvertisingCookiesClaim = false, noTrackingClaim = false, consentInterfaceClaim = false, consentInterfaceDetected = false, browserState = 'not_tested', freshContext = true, trackingRequests = [], cookies = [] } = {}) {
  const advertisingRequests = trackingRequests.filter((request) => /(?:^|\.)(?:facebook\.net|facebook\.com|doubleclick\.net|googlesyndication\.com|adservice\.google\.[a-z.]+|tiktok\.com|linkedin\.com)$/i.test((() => { try { return new URL(request.url).hostname; } catch { return ''; } })()));
  const advertisingCookies = cookies.filter((cookie) => /^(_fbp|_fbc|_gcl|_uetsid|_uetvid|li_fat_id)/i.test(cookie.name || ''));
  const contradictoryRequests = noTrackingClaim ? trackingRequests : advertisingRequests;
  return {
    advertisingRequests,
    advertisingCookies,
    contradictoryRequests,
    contradictionObserved: contradictoryRequests.length > 0 || (noAdvertisingCookiesClaim && advertisingCookies.length > 0),
    consentClaimVerified: Boolean(consentInterfaceClaim && consentInterfaceDetected),
    consentClaimUnverified: Boolean(consentInterfaceClaim && freshContext && browserState === 'confirmed' && !consentInterfaceDetected)
  };
}

const CONSENT_SCENARIOS = new Set(['fresh_load', 'accept', 'reject', 'reopen_preferences', 'withdraw', 'reload_persistence', 'returning_user', 'locale_variant']);

export function normalizeConsentTestingConfig(input = {}) {
  const source = input && typeof input === 'object' ? input : {};
  const advanced = source.advanced === true || source.mode === 'advanced';
  const requested = Array.isArray(source.scenarios) ? source.scenarios.filter((item) => CONSENT_SCENARIOS.has(item)) : [];
  const scenarios = advanced ? [...new Set(['fresh_load', ...requested])].slice(0, 8) : ['fresh_load'];
  return {
    mode: advanced ? 'advanced' : 'basic',
    scenarios,
    localeUrls: Array.isArray(source.localeUrls) ? [...new Set(source.localeUrls.map(String).filter(Boolean))].slice(0, 2) : []
  };
}

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
  cookies: ['iso-27001', 'gdpr', 'eprivacy', 'soc-2', 'hipaa', 'pci-dss', 'local'],
  'runtime-cookies': ['iso-27001', 'gdpr', 'eprivacy', 'soc-2', 'hipaa', 'pci-dss', 'local'],
  'authenticated-session': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  'authenticated-crawl': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  'access-control-candidates': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  cors: ['iso-27001', 'soc-2', 'hipaa', 'pci-dss'],
  disclosure: ['iso-27001', 'soc-2', 'pci-dss'],
  'mixed-content': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  'password-transport': ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss'],
  privacy: ['gdpr', 'local'],
  consent: ['gdpr', 'eprivacy', 'local'],
  'consent-behavior': ['gdpr', 'eprivacy', 'local'],
  'privacy-runtime-consistency': ['gdpr', 'local'],
  'privacy-runtime-verification': ['gdpr', 'local'],
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

function result({ id, title, category, status, summary, details = '', recommendation = '', evidence = '', affectedUrl = '', severity = '', references = [], evidenceItems = [], instances = [], testState = '', collectionState = '', confidence = '', evidenceConfidence = '', collectionMethod = '', negativeObservation = null, testMethod = '', limitations = [] }) {
  const resolvedTestState = testState || (status === 'manual' ? 'not_tested' : status === 'info' ? 'observed' : 'confirmed');
  const legacyConfidence = confidence || (resolvedTestState === 'confirmed' ? 'confirmed' : resolvedTestState === 'observed' ? 'observed' : resolvedTestState === 'inferred' ? 'inferred' : 'not_tested');
  const normalizedCollectionState = normalizeCollectionState(collectionState || resolvedTestState);
  const normalizedCollectionMethod = normalizeCollectionMethod(collectionMethod || testMethod || 'http_response_analysis');
  return {
    id, title, category, status, severity: severity || defaultSeverity(status), summary, details, recommendation, evidence, affectedUrl, references, evidenceItems, instances,
    frameworks: CHECK_FRAMEWORKS[id] || [],
    testState: resolvedTestState,
    testStateLabel: RESULT_STATES[resolvedTestState] || resolvedTestState,
    collectionState: normalizedCollectionState,
    collectionMethod: normalizedCollectionMethod,
    confidence: legacyConfidence,
    evidenceConfidence: normalizeEvidenceConfidence(evidenceConfidence || legacyConfidence),
    negativeObservation,
    testMethod,
    limitations: Array.isArray(limitations) ? limitations.filter(Boolean) : []
  };
}

export function tlsCollectionFailureChecks(affectedUrl = '', details = '') {
  const shared = {
    category: 'Transport security',
    status: 'info',
    severity: 'informational',
    details,
    affectedUrl,
    references: [REFERENCES.sslLabs],
    testState: 'failed_to_test',
    collectionState: 'failed_to_test',
    collectionMethod: 'tls_probe',
    confidence: 'not_tested',
    negativeObservation: classifyNegativeObservation({ collectionState: 'failed_to_test' })
  };
  return [
    result({ ...shared, id: 'certificate', title: 'Certificate status', summary: 'Failed to test certificate details; no certificate-validity outcome was asserted.', recommendation: 'Verify certificate status directly against the origin.' }),
    result({ ...shared, id: 'tls', title: 'TLS configuration', summary: 'Failed to test TLS protocol and cipher details; no protocol-strength outcome was asserted.', recommendation: 'Verify TLS protocol and cipher support directly against the origin.' })
  ];
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

function aggregateCookieSeverity(instances = []) {
  if (instances.some((item) => item.category === 'session-or-auth' && (item.missing || []).includes('HttpOnly'))) return 'high';
  if (instances.some((item) => item.category === 'session-or-auth' && (item.missing || []).includes('Secure'))) return 'medium';
  if (instances.some((item) => item.category === 'session-or-auth' && (item.missing || []).some((missing) => /SameSite/.test(missing)) && String(item.effectiveSameSiteObserved || '').toLowerCase() !== 'lax')) return 'medium';
  if (instances.some((item) => item.category === 'session-or-auth')) return 'low';
  if (instances.some((item) => item.category === 'tracking-analytics')) return 'low';
  return 'informational';
}

function cookieChecks(cookies = [], runtimeCookies = []) {
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
    const explicitDomain = cookie.match(/;\s*domain=([^;]+)/i)?.[1]?.trim() || '';
    const configuredPath = cookie.match(/;\s*path=([^;]+)/i)?.[1]?.trim() || '/';
    const category = classifyCookie(name);
    const expected = expectedCookieAttributes(category);
    const missing = [];
    if (expected.includes('Secure') && !lower.includes('; secure')) missing.push('Secure');
    if (expected.includes('HttpOnly') && !lower.includes('; httponly')) missing.push('HttpOnly');
    if (expected.includes('SameSite') && !lower.includes('; samesite=')) missing.push('SameSite');
    if (!missing.length) continue;
    const entry = `${name} [${category}]: missing ${missing.join(', ')}`;
    details.push(entry);
    const runtimeCookie = runtimeCookies.find((item) => item.name === name);
    instances.push({ name, domain: explicitDomain, path: configuredPath, hostOnly: !explicitDomain, category, missing, raw: cookie.replace(/^([^=]+)=([^;]*)/, '$1=[REDACTED]'), configuredSameSite: lower.match(/;\s*samesite=([^;]+)/i)?.[1] || null, effectiveSameSiteObserved: runtimeCookie?.sameSite || 'not_assessed', unsafeCrossSiteConditionObserved: false });
    if (category === 'session-or-auth') highSeverity.push(entry);
    else lowSeverity.push(entry);
  }
  const status = highSeverity.length ? 'fail' : lowSeverity.length ? 'info' : 'pass';
  return result({
    id: 'cookies', title: 'Cookie security attributes', category: 'Privacy & session',
    status,
    severity: aggregateCookieSeverity(instances),
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
  if (browserScan.state === 'failed_to_test') {
    return result({ id: 'runtime-cookies', title: 'Runtime browser cookies', category: 'Privacy & session', status: 'info', summary: 'Failed to test runtime cookies; no runtime-cookie absence was asserted.', details: browserScan.error || '', recommendation: 'Verify the browser runtime prerequisite and retry the scan.', affectedUrl, testState: 'failed_to_test', collectionState: 'failed_to_test', collectionMethod: 'browser_runtime', negativeObservation: classifyNegativeObservation({ collectionState: 'failed_to_test' }), testMethod: 'Headless browser cookie snapshot', limitations: browserScan.limitations || [browserScan.error] });
  }
  if (browserScan.state === 'not_tested') {
    return result({ id: 'runtime-cookies', title: 'Runtime browser cookies', category: 'Privacy & session', status: 'manual', summary: 'Runtime cookies were not assessed because browser collection was not run.', affectedUrl, testState: 'not_tested', collectionState: 'not_tested', collectionMethod: 'browser_runtime', negativeObservation: classifyNegativeObservation({ collectionState: 'not_tested' }), testMethod: 'Headless browser cookie snapshot', limitations: browserScan.limitations || [] });
  }
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
      domain: cookie.domain || '',
      path: cookie.path || '/',
      hostOnly: typeof cookie.hostOnly === 'boolean' ? cookie.hostOnly : !String(cookie.domain || '').startsWith('.'),
      category,
      missing,
      configuredSameSite: 'not_assessed',
      effectiveSameSiteObserved: cookie.sameSite || 'not_assessed',
      unsafeCrossSiteConditionObserved: false,
      raw: `${cookie.name}=[REDACTED]; domain=${cookie.domain || ''}; path=${cookie.path || '/'}; secure=${Boolean(cookie.secure)}; httpOnly=${Boolean(cookie.httpOnly)}; effectiveSameSiteObserved=${cookie.sameSite || '(none)'}`
    });
    if (category === 'session-or-auth') sensitiveMissing.push(entry);
    else lowerSensitivity.push(entry);
  }
  const status = sensitiveMissing.length ? 'fail' : lowerSensitivity.length ? 'info' : 'pass';
  return result({
    id: 'runtime-cookies', title: 'Runtime browser cookies', category: 'Privacy & session',
    status,
    severity: aggregateCookieSeverity(instances),
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

export function extractLinkedEvidencePages(headers, html, baseUrl) {
  const found = { privacy: [], terms: [], security: [], compliance: [] };
  const add = (group, href) => {
    try {
      const documentUrl = resolveDocumentCandidate(href, baseUrl);
      if (!documentUrl) return;
      found[group].push(documentUrl);
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

export function detectPrivacyPolicySignal(html) {
  return /(?:href|aria-label|title)\s*=\s*["'][^"']*privacy[^"']*["']|>\s*privacy(?:\s+policy)?\s*</i.test(String(html || ''));
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

export function serverDisclosureAssessment(headers) {
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
  const versionDisclosed = disclosures.some((value) => /\b\d+(?:\.\d+)+(?:[-+._a-z0-9]*)?\b/i.test(value));
  if (!versionDisclosed) {
    return {
      status: 'info',
      severity: 'informational',
      summary: 'A versionless technology/platform header was observed.',
      details: disclosures.join(' · '),
      recommendation: 'Treat this as reconnaissance context. Remove the header where practical, but do not assign vulnerability severity without a version-specific or exploitable condition.'
    };
  }
  return {
    status: 'warning',
    severity: 'low',
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

async function runConsentScenarioSuite(browser, targetUrl, input, navigationTimeout) {
  const config = normalizeConsentTestingConfig(input);
  if (config.mode !== 'advanced') return [];
  const results = [];
  const buttonPatterns = {
    accept: /accept(?: all)?|allow(?: all)?|agree|موافق|قبول|السماح/i,
    reject: /reject(?: all)?|decline|deny|رفض|عدم القبول/i,
    preferences: /preferences|settings|manage cookies|cookie settings|التفضيلات|الإعدادات|إدارة ملفات تعريف الارتباط/i,
    withdraw: /withdraw|revoke|reject(?: all)?|سحب الموافقة|إلغاء الموافقة/i
  };
  const run = async (scenario, url = targetUrl) => {
    const context = await browser.newContext({ ignoreHTTPSErrors: false, serviceWorkers: 'block' });
    const page = await context.newPage();
    const networkObservations = [];
    const seenNetwork = new Set();
    page.on('request', (request) => {
      if (networkObservations.length >= 100) return;
      const key = `${request.method()}|${request.url()}`;
      if (seenNetwork.has(key) || !/^https?:/i.test(request.url())) return;
      seenNetwork.add(key);
      const relation = classifyObservedDestination(request.url(), page.url() || url);
      let destinationHost = '';
      try { destinationHost = new URL(request.url()).hostname; } catch {}
      networkObservations.push({ url: request.url(), method: request.method(), resourceType: request.resourceType(), sourcePageUrl: page.url() || url, destinationHost, partyClassification: relation.classification, classificationConfidence: relation.confidence, observedAt: new Date().toISOString() });
    });
    const observedAt = new Date().toISOString();
    let action = 'none';
    let actionSucceeded = false;
    let error = '';
    try {
      await page.goto(url, { waitUntil: 'domcontentloaded', timeout: navigationTimeout });
      if (scenario === 'accept' || scenario === 'reload_persistence' || scenario === 'returning_user') {
        action = 'accept';
        actionSucceeded = await page.getByRole('button', { name: buttonPatterns.accept }).first().click({ timeout: 2500 }).then(() => true).catch(() => false);
      } else if (scenario === 'reject') {
        action = 'reject';
        actionSucceeded = await page.getByRole('button', { name: buttonPatterns.reject }).first().click({ timeout: 2500 }).then(() => true).catch(() => false);
      } else if (scenario === 'reopen_preferences') {
        action = 'reopen_preferences';
        actionSucceeded = await page.getByRole('button', { name: buttonPatterns.preferences }).first().click({ timeout: 2500 }).then(() => true).catch(() => false);
      } else if (scenario === 'withdraw') {
        action = 'withdraw';
        await page.getByRole('button', { name: buttonPatterns.preferences }).first().click({ timeout: 2500 }).catch(() => {});
        actionSucceeded = await page.getByRole('button', { name: buttonPatterns.withdraw }).first().click({ timeout: 2500 }).then(() => true).catch(() => false);
      }
      if (scenario === 'reload_persistence' || scenario === 'returning_user') await page.reload({ waitUntil: 'domcontentloaded', timeout: navigationTimeout });
      const snapshot = await page.evaluate(() => ({
        route: location.href,
        detectedLocale: document.documentElement.lang || navigator.language || 'unknown',
        consentInterfaceDetected: /cookie.{0,80}(consent|preferences|settings|accept|reject)|(consent|preferences).{0,80}cookie/is.test(document.body?.innerText || ''),
        localStorageKeys: Object.keys(localStorage || {}),
        sessionStorageKeys: Object.keys(sessionStorage || {})
      }));
      const cookies = await context.cookies();
      return { scenario, state: 'observed', action, actionSucceeded, actionState: action === 'none' ? 'not_applicable' : actionSucceeded ? 'completed' : 'requires_manual_confirmation', testedLocale: snapshot.detectedLocale, visitorContext: scenario === 'returning_user' ? 'returning' : 'fresh', route: snapshot.route, cookies: cookies.map((cookie) => ({ name: cookie.name, domain: cookie.domain, secure: cookie.secure, httpOnly: cookie.httpOnly, sameSite: cookie.sameSite })), storage: { localStorageKeys: snapshot.localStorageKeys, sessionStorageKeys: snapshot.sessionStorageKeys }, networkObservations, consentInterfaceDetected: snapshot.consentInterfaceDetected, observedAt, screenshotBase64: await page.screenshot({ type: 'png', fullPage: true, timeout: 5000 }).then((buffer) => buffer.toString('base64')).catch(() => ''), limitations: ['Button matching is heuristic; the action result does not determine consent validity or legal sufficiency.', ...(networkObservations.length >= 100 ? ['Consent scenario network record limit reached (100).'] : []), ...(!actionSucceeded && action !== 'none' ? ['The intended consent control was not matched with sufficient confidence; manual confirmation is required.'] : [])] };
    } catch (caught) {
      error = caught.message;
      return { scenario, state: 'failed_to_test', action, actionSucceeded, actionState: 'requires_manual_confirmation', testedLocale: 'unknown', visitorContext: scenario === 'returning_user' ? 'returning' : 'fresh', route: page.url() || url, cookies: [], storage: { localStorageKeys: [], sessionStorageKeys: [] }, networkObservations, consentInterfaceDetected: false, observedAt, screenshotBase64: '', error, limitations: ['The selected consent scenario did not complete.'] };
    } finally {
      await context.close().catch(() => {});
    }
  };
  for (const scenario of config.scenarios.filter((item) => item !== 'fresh_load' && item !== 'locale_variant')) results.push(await run(scenario));
  if (config.scenarios.includes('locale_variant')) {
    for (const localeUrl of config.localeUrls) results.push(await run('locale_variant', localeUrl));
  }
  return results;
}

async function runBrowserSecurityScan(targetUrl, options = {}) {
  const requestedRetryCount = Number(options.retryCount);
  const retryCount = Math.max(0, Math.min(4, Number.isFinite(requestedRetryCount) ? requestedRetryCount : 2));
  const navigationTimeout = Math.max(5000, Math.min(90000, Number(options.navigationTimeout) || 30000));
  const maxNetworkRecords = Math.max(25, Math.min(2000, Number(options.maxNetworkRecords) || 500));
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
      let networkRecordLimitReached = false;
      const consoleMessages = [];

      page.on('request', (request) => {
        if (!resources.has(request) && resources.size >= maxNetworkRecords) { networkRecordLimitReached = true; return; }
        resources.set(request, {
          url: request.url(), method: request.method(), resourceType: request.resourceType(), requestHeaders: request.headers(), failed: false,
          sourcePageUrl: (() => { try { return request.frame()?.url() || page.url() || targetUrl; } catch { return page.url() || targetUrl; } })(),
          initiatorType: request.resourceType() || 'unknown', observedAt: new Date().toISOString()
        });
      });
      page.on('response', (response) => {
        const request = response.request();
        if (!resources.has(request) && resources.size >= maxNetworkRecords) { networkRecordLimitReached = true; return; }
        const responseHeaders = response.headers();
        const existing = resources.get(request) || { url: response.url(), method: request.method(), resourceType: request.resourceType(), requestHeaders: request.headers() };
        resources.set(request, { ...existing, url: response.url(), status: response.status(), responseHeaders, mimeType: responseHeaders['content-type'] || '' });
      });
      page.on('requestfailed', (request) => {
        if (!resources.has(request) && resources.size >= maxNetworkRecords) { networkRecordLimitReached = true; return; }
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
        forms: [...document.forms].map((form) => ({ action: form.action || location.href, method: (form.method || 'get').toUpperCase(), enctype: form.enctype || '', fields: [...form.elements].map((element) => ({ type: element.type || element.tagName.toLowerCase(), name: element.name || '', id: element.id || '', autocomplete: element.autocomplete || '' })) })).slice(0, 50),
        frames: [...document.querySelectorAll('iframe[src]')].map((frame) => ({ url: frame.src, title: frame.title || '' })).slice(0, 30),
        detectedLocale: document.documentElement.lang || navigator.language || 'unknown'
      })).catch(() => ({ title: '', localStorageKeys: [], sessionStorageKeys: [], links: [], forms: [], frames: [] }));
      storage.forms = (storage.forms || []).map((form) => normalizeSafeFormMetadata(form, finalUrl));
      const authenticatedPages = [];
      let authenticatedCollection = { state: 'not_tested', pageLimit: 0, depthLimit: 0, queueLimit: 0, runtimeLimitMs: 0, pagesVisited: 0, queuedRoutesRemaining: 0, limitations: [] };
      if (options.authentication?.enabled && ['confirmed', 'observed'].includes(authentication.state)) {
        const crawlLimit = Math.max(1, Math.min(25, Number(options.authenticatedCrawlMaxPages) || 10));
        const depthLimit = Math.max(1, Math.min(5, Number(options.authenticatedCrawlMaxDepth) || 2));
        const queueLimit = Math.max(crawlLimit, Math.min(200, Number(options.authenticatedCrawlMaxQueue) || 50));
        const runtimeLimitMs = Math.max(5_000, Math.min(120_000, Number(options.authenticatedCrawlMaxRuntimeMs) || 30_000));
        const authenticatedStartedMs = Date.now();
        const targetOrigin = new URL(finalUrl).origin;
        const queue = [...new Map((storage.links || []).filter((href) => {
          try { return new URL(href).origin === targetOrigin; } catch { return false; }
        }).map((href) => [canonicalizeObservedUrl(href), { url: canonicalizeObservedUrl(href), depth: 1 }])).values()].slice(0, queueLimit);
        const seen = new Set([canonicalizeObservedUrl(finalUrl)]);
        let runtimeLimitReached = false;
        let queueLimitReached = false;
        while (queue.length && authenticatedPages.length < crawlLimit) {
          if (Date.now() - authenticatedStartedMs >= runtimeLimitMs) { runtimeLimitReached = true; break; }
          const queued = queue.shift();
          const candidate = canonicalizeObservedUrl(queued.url);
          if (seen.has(candidate)) continue;
          seen.add(candidate);
          const crawlPage = await context.newPage();
          try {
            const crawlResponse = await crawlPage.goto(candidate, { waitUntil: 'domcontentloaded', timeout: Math.min(navigationTimeout, 20000) });
            const snapshot = await crawlPage.evaluate(() => ({
              title: document.title || '',
              bodyText: (document.body?.innerText || '').slice(0, 50000),
              links: [...document.querySelectorAll('a[href]')].map((anchor) => anchor.href).filter(Boolean).slice(0, 200),
              forms: [...document.forms].map((form) => ({ action: form.action || location.href, method: (form.method || 'get').toUpperCase(), enctype: form.enctype || '', fields: [...form.elements].map((element) => ({ type: element.type || element.tagName.toLowerCase(), name: element.name || '', id: element.id || '', autocomplete: element.autocomplete || '' })) })).slice(0, 50)
            }));
            if (queued.depth < depthLimit) for (const href of snapshot.links) {
              try {
                const normalized = canonicalizeObservedUrl(href);
                if (new URL(normalized).origin !== targetOrigin || seen.has(normalized) || queue.some((entry) => entry.url === normalized)) continue;
                if (queue.length >= queueLimit) { queueLimitReached = true; break; }
                queue.push({ url: normalized, depth: queued.depth + 1 });
              } catch {}
            }
            const pageScreenshot = authenticatedPages.length < 3 ? await crawlPage.screenshot({ type: 'png', fullPage: true, timeout: 5000 }).then((buffer) => buffer.toString('base64')).catch(() => '') : '';
            authenticatedPages.push({ url: candidate, finalUrl: crawlPage.url(), depth: queued.depth, status: crawlResponse?.status() || 0, title: snapshot.title, headers: crawlResponse?.headers() || {}, bodyText: snapshot.bodyText, forms: snapshot.forms.map((form) => normalizeSafeFormMetadata(form, crawlPage.url() || candidate)), discoveredLinkCount: snapshot.links.length, screenshotBase64: pageScreenshot, state: 'confirmed', error: '' });
          } catch (error) {
            authenticatedPages.push({ url: candidate, finalUrl: crawlPage.url() || candidate, status: 0, title: '', headers: {}, bodyText: '', forms: [], discoveredLinkCount: 0, screenshotBase64: '', state: 'failed_to_test', error: error.message });
          } finally {
            await crawlPage.close().catch(() => {});
          }
        }
        const pageLimitReached = authenticatedPages.length >= crawlLimit && queue.length > 0;
        const limitations = [
          ...(pageLimitReached ? [`Authenticated page limit reached (${crawlLimit}).`] : []),
          ...(runtimeLimitReached ? [`Authenticated runtime limit reached (${runtimeLimitMs} ms).`] : []),
          ...(queueLimitReached ? [`Authenticated queue limit reached (${queueLimit}).`] : [])
        ];
        authenticatedCollection = { state: limitations.length || authenticatedPages.some((item) => item.state === 'failed_to_test') ? 'partial' : 'completed', pageLimit: crawlLimit, depthLimit, queueLimit, runtimeLimitMs, pagesVisited: authenticatedPages.length, queuedRoutesRemaining: queue.length, limitations };
      }
      const cookies = await context.cookies().catch(() => []);
      const sessionState = await context.storageState().catch(() => null);
      const resourceList = [...resources.values()].filter((resource) => /^https?:/i.test(resource.url || '')).map((resource) => {
        const category = classifyResourceType(resource.resourceType, resource.mimeType);
        const relation = classifyObservedDestination(resource.url, resource.sourcePageUrl || finalUrl);
        let destinationHost = '', destinationOrigin = '';
        try { const destination = new URL(resource.url); destinationHost = destination.hostname; destinationOrigin = destination.origin; } catch {}
        return {
          url: resource.url,
          sourcePageUrl: resource.sourcePageUrl || finalUrl,
          destinationHost,
          destinationOrigin,
          method: resource.method || 'GET',
          status: resource.status || 0,
          category,
          resourceType: resource.resourceType || '',
          initiatorType: resource.initiatorType || resource.resourceType || 'unknown',
          observedAt: resource.observedAt || attemptStartedAt,
          partyClassification: relation.classification,
          classificationConfidence: relation.confidence,
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
      const apiObservations = resourceList.filter((resource) => ['xhr', 'fetch', 'api'].includes(resource.category)).map(({ requestHeaders, responseHeaders, failure, ...resource }) => resource).slice(0, 100);
      const mixedContent = resourceList.filter((resource) => finalUrl.startsWith('https:') && resource.url.startsWith('http:'));
      const trackingRequests = resourceList.filter((resource) => {
        try { return TRACKING_HOST_PATTERN.test(new URL(resource.url).hostname); } catch { return false; }
      });
      const trackingConsent = assessInitialTracking({ consentInterfaceDetected: storage.consentInterfaceDetected, trackingRequestCount: trackingRequests.length, freshContext: !options.storageState });
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
        networkCollection: { state: networkRecordLimitReached ? 'partial' : 'completed', recordLimit: maxNetworkRecords, recordsCaptured: resourceList.length, truncated: networkRecordLimitReached, limitations: networkRecordLimitReached ? [`Browser network record limit reached (${maxNetworkRecords}).`] : [] },
        thirdPartyHosts,
        externalScripts: externalScripts.slice(0, 50),
        apiCalls: [...new Set(apiCalls)].slice(0, 50),
        apiObservations,
        mixedContent: mixedContent.slice(0, 50),
        trackingRequests: trackingRequests.slice(0, 50),
        ...trackingConsent,
        cookies,
        storage,
        consoleMessages: consoleMessages.slice(0, 30),
        screenshotBase64,
        sessionState,
        authentication,
        authenticatedPages,
        authenticatedCollection,
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
    const advancedConsentScenarios = await runConsentScenarioSuite(browser, targetUrl, options.consentTesting, navigationTimeout);
    const freshScenario = { scenario: 'fresh_load', state: best.state, action: 'none', actionSucceeded: false, actionState: 'not_applicable', testedLocale: best.storage?.detectedLocale || 'unknown', visitorContext: options.storageState ? 'returning' : 'fresh', route: best.finalUrl, cookies: (best.cookies || []).map((cookie) => ({ name: cookie.name, domain: cookie.domain, secure: cookie.secure, httpOnly: cookie.httpOnly, sameSite: cookie.sameSite })), storage: { localStorageKeys: best.storage?.localStorageKeys || [], sessionStorageKeys: best.storage?.sessionStorageKeys || [] }, networkObservations: (best.resources || []).map(({ requestHeaders, responseHeaders, failure, ...resource }) => resource).slice(0, 100), consentInterfaceDetected: Boolean(best.storage?.consentInterfaceDetected), observedAt: best.startedAt, screenshotBase64: best.screenshotBase64 || '', limitations: best.limitations || [] };
    const consentScenarios = [freshScenario, ...advancedConsentScenarios.map((scenario) => ({ ...scenario, deltaFromFreshLoad: compareConsentSnapshots(freshScenario, scenario) }))];
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
      consentTesting: normalizeConsentTestingConfig(options.consentTesting),
      consentScenarios,
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

const PAYMENT_PROVIDER_PATTERN = /(?:stripe|paypal|adyen|braintree|checkout\.com|worldpay|squareup|amazonpay|paytabs|payfort|hyperpay|telr|network\.ae)/i;
const CARD_FIELD_PATTERN = /(?:card.?number|cardnumber|pan|cvv|cvc|security.?code|expiry|expiration|credit.?card|debit.?card|رقم البطاقة|رمز الأمان)/i;
const PAYMENT_PATH_PATTERN = /(?:^|[\/_-])(?:payment|payments|checkout|billing|card|cards|gateway|merchant)(?:[\/_-]|\.|$)/i;

export function analyzePaymentFlowEvidence({ pages = [], browserScan = {}, testedOrigin = '', observedAt = '' } = {}) {
  const providerHosts = new Set();
  const signalSourceUrls = new Set();
  const observations = [];
  let iframeObserved = false;
  let hostedFieldsObserved = false;
  let redirectObserved = false;
  let merchantFormObserved = false;
  let merchantManagedScriptsObserved = false;
  let cardTerminologyObserved = false;
  const origin = (() => { try { return new URL(testedOrigin || browserScan.finalUrl).origin; } catch { return ''; } })();
  const recordSignalSource = (sourceUrl) => { if (sourceUrl) signalSourceUrls.add(sourceUrl); };
  const inspectUrl = (value, kind, sourceUrl, { forceRelevant = false } = {}) => {
    try {
      const parsed = new URL(value, sourceUrl || origin);
      const providerHost = PAYMENT_PROVIDER_PATTERN.test(parsed.hostname) ? parsed.hostname : '';
      const paymentRelevant = forceRelevant || Boolean(providerHost) || PAYMENT_PATH_PATTERN.test(parsed.pathname);
      if (providerHost) providerHosts.add(providerHost);
      if (kind === 'iframe' && (providerHost || /pay|checkout|card/i.test(parsed.pathname))) iframeObserved = true;
      if (kind === 'redirect' && providerHost) redirectObserved = true;
      if (paymentRelevant) recordSignalSource(sourceUrl);
      observations.push({ kind, observationKind: kind, sourceUrl: sourceUrl || '', destination: parsed.href, destinationUrl: parsed.href, providerHost, paymentRelevant });
    } catch {}
  };
  for (const page of pages.filter((item) => item.found && item.html)) {
    const sourceUrl = page.finalUrl || page.url;
    const text = String(page.html).replace(/<script[\s\S]*?<\/script>/gi, ' ').replace(/<style[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ');
    const paymentPageObserved = (() => { try { return PAYMENT_PATH_PATTERN.test(new URL(sourceUrl).pathname); } catch { return false; } })();
    if (CARD_FIELD_PATTERN.test(text)) { cardTerminologyObserved = true; recordSignalSource(sourceUrl); }
    for (const match of String(page.html).matchAll(/<iframe\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) inspectUrl(match[1], 'iframe', sourceUrl);
    for (const match of String(page.html).matchAll(/<a\b[^>]*\bhref\s*=\s*["']([^"']+)["'][^>]*>/gi)) {
      if (/pay|checkout|billing/i.test(match[1])) inspectUrl(match[1], 'redirect', sourceUrl);
    }
    for (const match of String(page.html).matchAll(/<script\b[^>]*\bsrc\s*=\s*["']([^"']+)["']/gi)) {
      inspectUrl(match[1], 'script', sourceUrl);
      try {
        const script = new URL(match[1], sourceUrl);
        if (PAYMENT_PROVIDER_PATTERN.test(script.hostname)) hostedFieldsObserved = hostedFieldsObserved || /elements|fields|checkout|stripe|adyen|braintree/i.test(script.href);
        else if (origin && script.origin === origin && (PAYMENT_PATH_PATTERN.test(script.pathname) || paymentPageObserved)) merchantManagedScriptsObserved = true;
      } catch {}
    }
    for (const match of String(page.html).matchAll(/<form\b([^>]*)>([\s\S]*?)<\/form>/gi)) {
      const action = match[1].match(/\baction\s*=\s*["']([^"']+)["']/i)?.[1] || sourceUrl;
      if (CARD_FIELD_PATTERN.test(match[2])) {
        cardTerminologyObserved = true;
        try {
          const destination = new URL(action, sourceUrl);
          if (origin && destination.origin === origin) merchantFormObserved = true;
          else if (PAYMENT_PROVIDER_PATTERN.test(destination.hostname)) redirectObserved = true;
          providerHosts.add(PAYMENT_PROVIDER_PATTERN.test(destination.hostname) ? destination.hostname : '');
        } catch {}
        inspectUrl(action, 'form_action', sourceUrl, { forceRelevant: true });
      }
    }
  }
  for (const frame of browserScan.storage?.frames || []) inspectUrl(frame.url, 'iframe', browserScan.finalUrl || testedOrigin);
  for (const form of browserScan.storage?.forms || []) {
    if (CARD_FIELD_PATTERN.test(`${(form.inputTypes || []).join(' ')} ${(form.fieldNames || []).join(' ')}`)) {
      cardTerminologyObserved = true;
      try {
        const action = new URL(form.action, browserScan.finalUrl || testedOrigin);
        merchantFormObserved = action.origin === origin;
        if (PAYMENT_PROVIDER_PATTERN.test(action.hostname)) providerHosts.add(action.hostname);
        inspectUrl(action.href, 'form_action', browserScan.finalUrl || testedOrigin, { forceRelevant: true });
      } catch {}
    }
  }
  for (const resource of browserScan.resources || []) {
    try {
      const parsed = new URL(resource.url);
      if (PAYMENT_PROVIDER_PATTERN.test(parsed.hostname)) {
        providerHosts.add(parsed.hostname);
        inspectUrl(parsed.href, resource.category === 'script' ? 'provider_script' : 'provider_request', browserScan.finalUrl || testedOrigin, { forceRelevant: true });
      }
      if (resource.category === 'script' && paymentScript(resource.url)) hostedFieldsObserved = true;
    } catch {}
  }
  const architecture = merchantFormObserved ? 'merchant_form' : hostedFieldsObserved ? 'hosted_fields' : iframeObserved ? 'iframe' : redirectObserved ? 'redirect' : 'unknown';
  const paymentFlowObserved = merchantFormObserved || hostedFieldsObserved || iframeObserved || redirectObserved;
  const paymentSignalsObserved = paymentFlowObserved || cardTerminologyObserved || providerHosts.size > 0;
  const preciseSourceUrl = [...signalSourceUrls].sort((left, right) => {
    const depth = (value) => { try { return new URL(value).pathname.split('/').filter(Boolean).length; } catch { return 0; } };
    return depth(right) - depth(left);
  })[0] || browserScan.finalUrl || pages.find((item) => item.found)?.finalUrl || pages.find((item) => item.found)?.url || testedOrigin || '';
  const primaryObservation = observations.find((item) => item.paymentRelevant && item.sourceUrl === preciseSourceUrl) || observations.find((item) => item.paymentRelevant) || null;
  const evidenceItem = paymentSignalsObserved ? {
    evidenceId: 'payment_flow_observation',
    key: 'paymentFlow',
    label: 'Payment-flow or payment-scope signal',
    testedOrigin: origin,
    sourceUrl: preciseSourceUrl,
    destinationUrl: primaryObservation?.destinationUrl || '',
    providerHost: primaryObservation?.providerHost || [...providerHosts].filter(Boolean).sort()[0] || '',
    observationKind: primaryObservation?.observationKind || (cardTerminologyObserved ? 'public_page_text' : architecture),
    excerpt: `Architecture: ${architecture}; provider hosts: ${[...providerHosts].filter(Boolean).sort().join(', ') || 'none observed'}; card terminology: ${cardTerminologyObserved ? 'observed' : 'not observed'}.`,
    evidenceText: `Architecture: ${architecture}; provider hosts: ${[...providerHosts].filter(Boolean).sort().join(', ') || 'none observed'}; card terminology: ${cardTerminologyObserved ? 'observed' : 'not observed'}.`,
    collectionMethod: 'bounded_public_and_runtime_payment_flow_analysis',
    sourceMethod: 'public_runtime_payment_observation',
    observedAt: observedAt || new Date().toISOString(),
    confidence: paymentFlowObserved ? 'medium' : 'low',
    evidenceType: paymentFlowObserved ? 'runtime_observation' : 'public_page_observation',
    evidenceStrength: paymentFlowObserved ? 'supporting_technical' : 'scope_signal',
    limitations: ['Payment signals do not determine PCI DSS applicability, card-data handling, SAQ type, or validation obligations.']
  } : null;
  return {
    testedOrigin: origin,
    paymentFlowObserved,
    paymentSignalsObserved,
    testedOriginParticipatesInPaymentFlow: paymentFlowObserved ? true : null,
    architecture,
    providerHosts: [...providerHosts].filter(Boolean).sort(),
    merchantManagedScriptsObserved,
    cardTerminologyObserved,
    cardDataHandling: 'not_determined',
    pciScopeConclusion: 'requires_scope_confirmation',
    possibleValidationPath: paymentFlowObserved ? 'requires_acquirer_or_QSA_confirmation' : 'scope_evidence_not_sufficient',
    evidence: observations.slice(0, 50),
    evidenceItems: evidenceItem ? [evidenceItem] : [],
    limitations: ['Public/runtime payment signals do not determine PCI DSS applicability, card-data handling, SAQ type, or validation obligations.']
  };
}

export function aggregateGdprPublicNoticeState(elements = []) {
  const states = elements.map((item) => item?.state).filter(Boolean);
  if (states.some((state) => ['observed', 'partially_observed'].includes(state))) return 'partial_evidence';
  if (!states.length || states.every((state) => state === 'not_assessed')) return 'not_assessed';
  if (states.some((state) => ['failed_to_assess', 'failed_to_test'].includes(state))) return 'failed_to_assess';
  if (states.some((state) => state === 'not_observed')) return 'no_public_evidence_observed';
  return 'not_assessed';
}

function paymentScript(value) {
  return PAYMENT_PROVIDER_PATTERN.test(value) && /(?:js|elements|fields|checkout|sdk)/i.test(value);
}

function frameworkEvidenceStatements(id, evidenceItems = []) {
  const seen = new Set();
  return evidenceItems.filter((item) => item.evidenceId && item.sourceUrl).filter((item) => {
    const key = `${item.key}|${item.evidenceId}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  }).map((item) => {
    const trace = normalizeTraceabilityTuple(item, { sourceCheckId: item.sourceCheckId || `crawl:${item.key || 'public_evidence'}`, mappingIds: [] });
    return {
      statementId: `statement_${id}_${item.evidenceId}`,
      statement: `${item.label || item.key} public evidence observed`,
      evidenceRefs: [item.evidenceId],
      artifactRefs: trace.artifactRefs,
      sourceUrls: trace.sourceUrls,
      collectionMethod: trace.collectionMethod,
      collectionState: trace.collectionState,
      observedAt: trace.observedAt,
      confidence: trace.confidence,
      evidenceStrength: trace.normalizedEvidenceStrength,
      sourceCheckId: trace.sourceCheckId,
      mappingIds: trace.mappingIds,
      limitations: trace.limitations.length ? trace.limitations : ['Public evidence was observed but not independently verified.']
    };
  });
}

const FRAMEWORK_EVIDENCE_KEYS = {
  'iso-27001': ['encryption', 'accessControl', 'vulnerabilityMgmt', 'auditLogging', 'availabilityBackup', 'breachNotification'],
  gdpr: ['dataSubjectRights', 'consentManagement', 'consentInterfaceClaim', 'subprocessors', 'dataRetention', 'noAdvertisingCookiesClaim', 'noTrackingClaim'],
  eprivacy: ['consentManagement', 'consentInterfaceClaim', 'noAdvertisingCookiesClaim', 'noTrackingClaim'],
  'soc-2': ['encryption', 'accessControl', 'vulnerabilityMgmt', 'auditLogging', 'availabilityBackup', 'breachNotification', 'subprocessors'],
  hipaa: ['healthcarePhi', 'hipaaApplicability', 'accessControl', 'auditLogging', 'breachNotification'],
  'pci-dss': ['paymentContext', 'paymentProcessing', 'pciApplicability'],
  local: ['dataSubjectRights', 'consentManagement', 'consentInterfaceClaim', 'subprocessors', 'dataRetention', 'noAdvertisingCookiesClaim', 'noTrackingClaim']
};

function frameworkEvidenceSummary(id, { checks, crawl, jurisdiction, frameworkApplicability = {}, paymentFlow = {} }) {
  const hasEvidence = (key) => Boolean(crawl?.evidenceFound?.[key]);
  const hasPage = (group) => Boolean((crawl?.pagesFoundByGroup?.[group] || []).length);
  const technicalPass = (checkId) => checks.some((check) => check.id === checkId && check.status === 'pass');
  const technicalAttention = checks.filter((check) => check.frameworks.includes(id) && ['fail', 'warning'].includes(check.status));
  const inputState = frameworkApplicability[id] || 'unknown';
  const hipaaIndicated = hasEvidence('hipaaApplicability') || Boolean(crawl?.certifications?.hipaa);
  const pciIndicated = hasEvidence('paymentProcessing') || hasEvidence('pciApplicability') || Boolean(crawl?.certifications?.['pci-dss']) || Boolean(paymentFlow.paymentSignalsObserved);
  let applicability = 'selected_for_mapping';
  let applicable = null;
  if (id === 'gdpr') {
    applicability = inputState === 'applicable' ? 'applicable' : inputState === 'not_applicable' ? 'not_applicable' : 'requires_scope_confirmation';
    applicable = inputState === 'applicable' ? true : inputState === 'not_applicable' ? false : null;
  } else if (id === 'eprivacy') {
    applicability = inputState === 'applicable' ? 'applicable' : inputState === 'not_applicable' ? 'not_applicable' : 'requires_scope_confirmation';
    applicable = inputState === 'applicable' ? true : inputState === 'not_applicable' ? false : null;
  } else if (id === 'hipaa') {
    applicability = inputState === 'applicable' ? 'applicable' : inputState === 'not_applicable' ? 'not_applicable' : hipaaIndicated ? 'potentially_applicable' : 'not_indicated';
    applicable = inputState === 'applicable' ? true : inputState === 'not_applicable' ? false : null;
  } else if (id === 'pci-dss') {
    applicability = inputState === 'applicable' ? 'applicable' : inputState === 'not_applicable' ? 'not_applicable' : pciIndicated ? 'potentially_applicable' : 'not_indicated';
    applicable = inputState === 'applicable' ? true : inputState === 'not_applicable' ? false : null;
  } else if (id === 'local') {
    applicability = inputState === 'not_applicable' ? 'not_applicable' : !jurisdiction ? 'requires_input' : inputState === 'applicable' ? 'applicable' : 'requires_scope_confirmation';
    applicable = inputState === 'applicable' && Boolean(jurisdiction) ? true : inputState === 'not_applicable' ? false : null;
  }
  const applicabilityDisplay = applicabilityPresentation(applicability, { inputState });
  const base = {
    id,
    label: FRAMEWORKS[id].label,
    applicable,
    applicability,
    applicabilityInput: inputState,
    applicabilityLabel: applicabilityDisplay.label,
    selectedForMapping: true,
    selectionLabel: applicabilityDisplay.selectionLabel,
    publicEvidence: [],
    technicalControls: [],
    missingEvidence: [],
    certification: 'No public certification proof was verified by this website scan.',
    manualReviewRequired: true,
    manualReviewReasons: frameworkManualReviewReasons({ id, applicability }),
    scopeBasis: ['applicable', 'not_applicable'].includes(inputState)
      ? 'operator_assertion'
      : ['iso-27001', 'soc-2'].includes(id)
        ? 'framework_selected_for_mapping'
        : ['potentially_applicable'].includes(applicability)
          ? 'public_scope_signal'
          : 'no_verified_scope_evidence',
    scopeConfidence: ['applicable', 'not_applicable'].includes(inputState)
      ? 'asserted_not_verified'
      : applicability === 'potentially_applicable'
        ? 'low'
        : ['iso-27001', 'soc-2'].includes(id)
          ? 'not_applicable_to_mapping_selection'
          : 'not_determined',
    scopeDecisionRequired: !['applicable', 'not_applicable', 'selected_for_mapping'].includes(applicability),
    controlSatisfaction: 'not_determined',
    coverage: 'partial',
    attentionFindings: [],
    evidenceItems: [],
    jurisdiction: id === 'local' ? jurisdiction : '',
    note: 'Evidence comes from public website content and technical signals only. It is not a compliance determination.'
  };

  if (applicability === 'not_applicable') {
    base.note = `${FRAMEWORKS[id].label} was marked not applicable by the operator. No control mappings are emitted for this framework.`;
    return base;
  }
  if (['not_indicated', 'requires_input'].includes(applicability)) {
    base.note = applicability === 'requires_input'
      ? 'A local jurisdiction and applicability decision are required before local-law mappings can be produced.'
      : `${FRAMEWORKS[id].label} applicability was not indicated by public evidence. This is not a not-applicable determination; confirm scope manually.`;
    base.missingEvidence.push('Framework applicability confirmation');
    return base;
  }

  const addTech = (passed, text) => (passed ? base.technicalControls : base.missingEvidence).push(text);
  addTech(technicalPass('https'), 'HTTPS available');
  addTech(technicalPass('certificate'), 'Valid public certificate');
  addTech(technicalPass('tls'), 'Modern TLS observed');
  const cookieAssessmentChecks = checks.filter((check) => ['cookies', 'runtime-cookies'].includes(check.id));
  const cookieAssessmentCompleted = cookieAssessmentChecks.some((check) => ['confirmed', 'observed'].includes(check.testState));
  if (cookieAssessmentCompleted) {
    const adverseCookies = cookieAssessmentChecks.some((check) => ['fail', 'warning'].includes(check.status));
    base.technicalControls.push(adverseCookies ? 'Cookie security attributes assessed; adverse observations reported' : 'Cookie security attributes assessed');
  } else {
    base.missingEvidence.push('Cookie security attribute assessment');
  }

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
    if (applicability === 'requires_scope_confirmation') base.missingEvidence.push('GDPR territorial/material scope confirmation');
    if (hasPage('privacy')) base.publicEvidence.push('Privacy policy page available');
    if (hasEvidence('dataSubjectRights')) base.publicEvidence.push('Data rights mentioned');
    if (hasEvidence('dataRetention')) base.publicEvidence.push('Retention language found');
    if (hasEvidence('subprocessors')) base.publicEvidence.push('Processor/DPA language found');
    if (hasEvidence('consentManagement')) base.publicEvidence.push('Consent management evidence found');
    if (hasEvidence('consentInterfaceClaim')) base.publicEvidence.push('Consent-interface claim found; runtime verification reported separately');
    for (const item of ['Privacy policy', 'Data subject rights', 'Retention information', 'Processor/DPA information', 'Cookie consent mechanism']) {
      const ok = item === 'Privacy policy' ? hasPage('privacy') : item === 'Data subject rights' ? hasEvidence('dataSubjectRights') : item === 'Retention information' ? hasEvidence('dataRetention') : item === 'Processor/DPA information' ? hasEvidence('subprocessors') : hasEvidence('consentManagement') || hasEvidence('consentInterfaceClaim');
      if (!ok) base.missingEvidence.push(item);
    }
    const consentRuntimeCheck = checks.find((check) => check.id === 'privacy-runtime-verification');
    if (consentRuntimeCheck?.status === 'warning') base.missingEvidence.push('Consent-interface claim not verified at runtime');
    else if (consentRuntimeCheck?.status === 'manual') base.missingEvidence.push('Consent-interface runtime verification');
  } else if (id === 'eprivacy') {
    if (applicability === 'requires_scope_confirmation') base.missingEvidence.push('ePrivacy territorial/material scope and national implementation confirmation');
    if (hasEvidence('consentManagement')) base.publicEvidence.push('Consent-management evidence found');
    if (hasEvidence('consentInterfaceClaim')) base.publicEvidence.push('Consent-interface claim found; runtime verification reported separately');
    const consentBehavior = checks.find((check) => check.id === 'consent-behavior');
    if (!consentBehavior || !['confirmed', 'observed'].includes(consentBehavior.testState)) base.missingEvidence.push('Bounded terminal storage/access and consent-ordering evidence');
    base.missingEvidence.push('Strictly-necessary exception and legal consent requirement review');
    base.note = 'ePrivacy Directive evidence is reported separately from GDPR. Bounded network/cookie/storage observations do not determine Article 5(3) applicability, an exception, or a violation.';
  } else if (id === 'hipaa') {
    const relevant = hipaaIndicated || applicability === 'applicable';
    if (applicability === 'potentially_applicable' || (applicability === 'applicable' && !hipaaIndicated)) base.missingEvidence.push('HIPAA covered-entity/business-associate and PHI scope evidence');
    if (relevant) {
      if (hasEvidence('healthcarePhi')) base.publicEvidence.push('PHI-specific language found');
      if (hasEvidence('accessControl')) base.publicEvidence.push('Access control language found');
      if (hasEvidence('auditLogging')) base.publicEvidence.push('Audit logging language found');
      for (const item of ['PHI applicability review', 'Access control evidence', 'Audit logging evidence', 'Breach notification evidence']) {
        const ok = item.startsWith('PHI') ? hasEvidence('hipaaApplicability') : item.startsWith('Access') ? hasEvidence('accessControl') : item.startsWith('Audit') ? hasEvidence('auditLogging') : hasEvidence('breachNotification');
        if (!ok) base.missingEvidence.push(item);
      }
    }
  } else if (id === 'pci-dss') {
    const relevant = pciIndicated || applicability === 'applicable';
    if (applicability === 'potentially_applicable' || (applicability === 'applicable' && !pciIndicated)) base.missingEvidence.push('PCI DSS merchant/service-provider and cardholder-data-environment scope evidence');
    if (relevant) {
      if (hasEvidence('paymentProcessing')) base.publicEvidence.push('Payment-processing language found');
      if (hasEvidence('pciApplicability')) base.publicEvidence.push('Cardholder-data/PCI scope language found');
      if (paymentFlow.paymentFlowObserved) base.publicEvidence.push(`Payment-flow architecture observed: ${paymentFlow.architecture}`);
      if (crawl?.certifications?.['pci-dss']) base.publicEvidence.push('PCI DSS mentioned publicly');
      for (const item of ['Payment page/provider evidence', 'Card handling scope evidence']) {
        const ok = item.startsWith('Payment') ? hasEvidence('paymentProcessing') : hasEvidence('pciApplicability');
        if (!ok) base.missingEvidence.push(item);
      }
      base.missingEvidence.push('Current PCI DSS validation evidence (SAQ/AOC/ROC as applicable)');
    }
  } else if (id === 'local') {
    const recognizedJurisdictions = resolveLocalJurisdictions(jurisdiction);
    base.localRegulations = recognizedJurisdictions;
    if (jurisdiction) base.publicEvidence.push(`Jurisdiction configured: ${jurisdiction}`);
    if (recognizedJurisdictions.length) base.publicEvidence.push(`Official local-law instrument metadata identified for manual review: ${recognizedJurisdictions.map((item) => item.label).join(', ')}`);
    if (hasPage('privacy')) base.publicEvidence.push('Privacy/legal page available');
    if (hasEvidence('dataSubjectRights')) base.publicEvidence.push('Rights/privacy language found');
    if (applicability === 'requires_scope_confirmation') base.missingEvidence.push('Local-law territorial/material scope confirmation');
    if (jurisdiction && !recognizedJurisdictions.length) base.missingEvidence.push('No built-in control mapping for the entered jurisdiction; legal mapping required');
    if (recognizedJurisdictions.length) base.missingEvidence.push('Provision-level local-law mapping by a qualified legal reviewer');
    base.missingEvidence.push('Jurisdiction-specific legal interpretation');
  }

  if (crawl?.certifications?.[id]) base.certification = `${FRAMEWORKS[id].label} was mentioned publicly, but the scanner did not verify a current certificate or audit report.`;
  base.attentionFindings = technicalAttention.map((check) => ({ title: check.title, severity: check.severity, status: check.status, affectedUrl: check.affectedUrl || '' }));
  base.evidenceItems = relevantEvidenceItems(crawl, FRAMEWORK_EVIDENCE_KEYS[id] || []);
  if (id === 'pci-dss' && paymentFlow.paymentSignalsObserved) base.evidenceItems.push(...(paymentFlow.evidenceItems || []));
  if (id === 'gdpr') {
    base.gdprPublicNoticeMatrix = crawl?.gdprPublicNoticeMatrix || [];
    base.publicNoticeCoverage = aggregateGdprPublicNoticeState(base.gdprPublicNoticeMatrix);
    base.evidenceItems = [...new Map([...base.evidenceItems, ...(base.gdprPublicNoticeMatrix || []).flatMap((item) => item.evidenceItems || [])].map((item) => [item.evidenceId, item])).values()];
  }
  base.evidenceStatements = frameworkEvidenceStatements(id, base.evidenceItems);
  base.publicEvidence = base.evidenceStatements.map((statement) => statement.statement);
  if (id === 'local' && jurisdiction) {
    base.publicEvidence.push(`Jurisdiction configured: ${jurisdiction}`);
    if (base.localRegulations?.length) base.publicEvidence.push(`Official local-law instrument metadata identified for manual review: ${base.localRegulations.map((item) => item.label).join(', ')}`);
  }
  base.technicalEvidenceStatements = checks.filter((check) => check.frameworks.includes(id) && ['pass', 'fail', 'warning'].includes(check.status)).map((check) => {
    const evidenceItems = (check.evidenceItems || []).map((item) => normalizeTraceabilityTuple(item, { sourceCheckId: check.id, observedAt: check.observedAt || '', sourceUrl: check.affectedUrl || '', limitations: check.limitations || [] }));
    const trace = evidenceItems[0] || normalizeTraceabilityTuple({ evidenceId: `check:${check.id}`, sourceUrl: check.affectedUrl || '', collectionMethod: check.collectionMethod, collectionState: check.collectionState || check.testState, observedAt: check.observedAt || '', confidence: check.evidenceConfidence || check.confidence, evidenceStrength: 'contextual', limitations: check.limitations || [] }, { sourceCheckId: check.id, mappingIds: [] });
    return {
      statementId: `statement_${id}_check_${check.id}`,
      statement: `${check.title}: ${check.summary}`,
      evidenceRefs: evidenceItems.length ? evidenceItems.map((item) => item.evidenceId).filter(Boolean) : [`check:${check.id}`],
      artifactRefs: [...new Set(evidenceItems.flatMap((item) => item.artifactRefs || []))],
      sourceUrls: trace.sourceUrls,
      collectionMethod: trace.collectionMethod,
      collectionState: trace.collectionState,
      observedAt: trace.observedAt,
      confidence: trace.confidence,
      evidenceStrength: trace.normalizedEvidenceStrength,
      sourceCheckId: check.id,
      mappingIds: [],
      limitations: trace.limitations
    };
  });
  base.statementTraceability = [...base.evidenceStatements, ...base.technicalEvidenceStatements];
  return base;
}

export async function scanWebsiteSecurity(config = {}, dependencies = {}) {
  const projectName = String(config.projectName || '').trim();
  const targetUrl = String(config.targetUrl || '').trim();
  const jurisdiction = String(config.jurisdiction || '').trim();
  const requestedFrameworks = Array.isArray(config.frameworks) ? [...new Set(config.frameworks.filter((id) => FRAMEWORKS[id]))] : Object.keys(FRAMEWORKS).filter((id) => id !== 'eprivacy');
  const frameworks = requestedFrameworks.includes('gdpr') && !requestedFrameworks.includes('eprivacy')
    ? requestedFrameworks.flatMap((id) => id === 'gdpr' ? ['gdpr', 'eprivacy'] : [id])
    : requestedFrameworks;
  const frameworkApplicabilityInput = normalizeFrameworkApplicability(config.frameworkApplicability);
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
    authenticatedCrawlMaxPages: maxCrawlPages,
    authenticatedCrawlMaxDepth: config.authenticatedCrawlMaxDepth,
    authenticatedCrawlMaxQueue: config.authenticatedCrawlMaxQueue,
    authenticatedCrawlMaxRuntimeMs: config.authenticatedCrawlMaxRuntimeMs,
    maxNetworkRecords: config.maxNetworkRecords,
    consentTesting: config.consentTesting
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
    const authenticatedCrawlState = authenticatedPages.length ? (failedPages.length ? 'observed' : 'confirmed') : authState === 'failed_to_test' ? 'failed_to_test' : 'not_tested';
    checks.push(result({
      id: 'authenticated-crawl', title: `Authenticated crawl (${authentication.role})`, category: 'Authenticated coverage',
      status: authenticatedPages.length || authState === 'failed_to_test' ? 'info' : 'manual',
      summary: authenticatedPages.length
        ? `${authenticatedPages.length} same-origin authenticated page(s) were visited; ${failedPages.length} failed to load.`
        : authState === 'failed_to_test'
          ? 'Failed to test the authenticated crawl because the authenticated session was not established; no authenticated-route absence was asserted.'
          : 'Authenticated route discovery was not assessed beyond the established session.',
      details: authenticatedPages.map((page) => `${page.status || 'failed'} ${page.finalUrl || page.url}${page.forms?.length ? ` (${page.forms.length} form(s))` : ''}`).join(' · '),
      affectedUrl: response.finalUrl,
      testState: authenticatedCrawlState,
      collectionState: authenticatedCrawlState === 'confirmed' ? 'completed' : authenticatedCrawlState === 'observed' ? 'partial' : authenticatedCrawlState,
      collectionMethod: 'authenticated_browser',
      negativeObservation: authenticatedCrawlState === 'failed_to_test' ? classifyNegativeObservation({ collectionState: 'failed_to_test' }) : authenticatedCrawlState === 'not_tested' ? classifyNegativeObservation({ collectionState: 'not_tested' }) : null,
      confidence: authenticatedPages.length ? 'observed' : 'not_tested',
      testMethod: 'Bounded same-origin authenticated browser crawl',
      limitations: ['Only safe GET navigation through discovered links was performed. Forms were inventoried but not submitted. Access-control and IDOR conclusions require explicit cross-role comparison.']
    }));
    const adminCandidates = authentication.role === 'normal-user' ? authenticatedPages.filter((page) => page.status >= 200 && page.status < 300 && /\/(admin|management|backoffice|control-panel)(?:\/|$)/i.test(new URL(page.finalUrl || page.url).pathname)) : [];
    const objectCandidates = authenticatedPages.filter((page) => /\/(users?|accounts?|orders?|patients?|records?)\/(?:\d+|[0-9a-f]{8}-[0-9a-f-]{27,})\b/i.test(new URL(page.finalUrl || page.url).pathname));
    checks.push(result({
      id: 'access-control-candidates', title: 'Access-control review candidates', category: 'Authenticated coverage',
      status: adminCandidates.length ? 'warning' : authState === 'failed_to_test' ? 'info' : 'manual',
      severity: adminCandidates.length ? 'medium' : authState === 'failed_to_test' ? 'informational' : 'manual',
      summary: adminCandidates.length
        ? `${adminCandidates.length} admin-labeled route(s) returned a successful response to the configured normal-user role.`
        : objectCandidates.length
          ? `${objectCandidates.length} object-identifier route(s) require explicit cross-role authorization testing.`
          : authState === 'failed_to_test'
            ? 'Failed to test access-control route candidates because the authenticated session was not established; no candidate-route absence was asserted.'
            : 'No admin-labeled or common object-identifier route was discovered within the bounded authenticated crawl.',
      details: [...adminCandidates, ...objectCandidates].map((page) => `${page.status} ${page.finalUrl || page.url}`).join(' · '),
      recommendation: 'Compare the same requests with anonymous, normal-user, manager, and admin sessions and confirm authorization is enforced server-side for each object and action.',
      affectedUrl: response.finalUrl,
      testState: adminCandidates.length || objectCandidates.length ? 'inferred' : authState === 'failed_to_test' ? 'failed_to_test' : 'not_tested',
      collectionState: adminCandidates.length || objectCandidates.length ? 'partial' : authState === 'failed_to_test' ? 'failed_to_test' : 'not_tested',
      collectionMethod: 'authenticated_browser',
      negativeObservation: authState === 'failed_to_test' ? classifyNegativeObservation({ collectionState: 'failed_to_test' }) : null,
      confidence: adminCandidates.length || objectCandidates.length ? 'inferred' : 'not_tested',
      testMethod: 'Authenticated route-name and object-identifier triage',
      evidenceItems: [...adminCandidates, ...objectCandidates].map((page, index) => ({ evidenceId: `authenticated_access_candidate_${index + 1}`, artifactId: 'authenticated-pages', sourceUrl: page.finalUrl || page.url, collectionMethod: 'bounded_authenticated_crawl', sourceMethod: 'authenticated_route_observation', observedAt: startedAt, confidence: 'inferred', evidenceType: 'runtime_observation', evidenceStrength: 'contextual', evidenceText: `${page.status} ${page.finalUrl || page.url}`, observationKind: 'access_control_candidate', limitations: ['Route name and response status do not establish authorization correctness.'] })),
      limitations: ['Route names and HTTP success do not prove unauthorized data or action access. This is a candidate for controlled manual or cross-role verification, not a confirmed broken-access-control or IDOR finding.']
    }));
  }

  checks.push(result({
    id: 'https', title: 'HTTPS transport', category: 'Transport security',
    status: finalUrl.protocol === 'https:' ? 'pass' : 'fail',
    summary: finalUrl.protocol === 'https:' ? 'The final page is delivered over HTTPS.' : 'The final page is not delivered over HTTPS.',
    recommendation: finalUrl.protocol === 'https:' ? '' : 'Serve the entire website over HTTPS and redirect HTTP traffic to HTTPS.',
    evidence: response.finalUrl,
    affectedUrl: response.finalUrl
  }));

  let httpRedirect = null;
  if (finalUrl.protocol === 'https:') {
    const httpUrl = new URL(response.finalUrl); httpUrl.protocol = 'http:'; httpUrl.port = '';
    try {
      const probe = await requestWithRedirects(httpUrl.href, { rejectUnauthorized: false, maxBodyBytes: 40_000 });
      httpRedirect = new URL(probe.finalUrl).protocol === 'https:';
      checks.push(result({ id: 'http-to-https', title: 'HTTP to HTTPS redirect', category: 'Transport security', status: httpRedirect ? 'pass' : 'warning', summary: httpRedirect ? 'HTTP traffic redirects to HTTPS.' : 'HTTP traffic did not end on HTTPS.', recommendation: httpRedirect ? '' : 'Redirect all HTTP requests to the canonical HTTPS URL.', evidence: probe.redirectChain.map((item) => `${item.status} ${item.url}`).join(' → '), affectedUrl: httpUrl.href }));
    } catch (error) {
      checks.push(result({ id: 'http-to-https', title: 'HTTP to HTTPS redirect', category: 'Transport security', status: 'info', summary: 'Failed to test the HTTP-to-HTTPS redirect; no redirect absence was asserted.', details: describeError(error), recommendation: 'Verify manually that HTTP traffic is redirected to HTTPS.', affectedUrl: httpUrl.href, testState: 'failed_to_test', collectionState: 'failed_to_test', collectionMethod: 'http_response', negativeObservation: classifyNegativeObservation({ collectionState: 'failed_to_test' }) }));
    }
  } else {
    checks.push(result({ id: 'http-to-https', title: 'HTTP to HTTPS redirect', category: 'Transport security', status: 'fail', summary: 'The scanned page remains on HTTP.', recommendation: 'Configure a permanent redirect from HTTP to HTTPS.', affectedUrl: response.finalUrl }));
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
    checks.push(...tlsCollectionFailureChecks(response.finalUrl, strictTlsError));
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
    severity: cspAnalysis.strength === 'strong' ? 'informational' : 'medium',
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
  checks.push(result({ id: 'referrer-policy', title: 'Referrer Policy', category: 'Privacy & browser controls', status: referrer.status, severity: referrer.status === 'pass' ? 'informational' : 'low', summary: headers['referrer-policy'] ? 'Referrer-Policy header is present.' : 'Referrer-Policy header is missing; modern browser defaults reduce generic impact, but an explicit policy remains easier to audit.', details: [headers['referrer-policy'] || '', referrer.issue].filter(Boolean).join(' · '), recommendation: referrer.status === 'pass' ? '' : 'Define an explicit Referrer-Policy such as strict-origin-when-cross-origin, same-origin, strict-origin, or no-referrer.', affectedUrl: response.finalUrl, references: [REFERENCES.headers], limitations: ['No sensitive URL data or unsafe referrer disclosure was demonstrated by this header-presence check.'] }));
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

  checks.push({ ...cookieChecks(response.setCookies, browserScan.cookies || []), affectedUrl: response.finalUrl, references: [REFERENCES.zapPassive] });
  checks.push(browserCookieChecks(browserScan.cookies || [], browserScan.finalUrl || response.finalUrl, browserScan));

  const firstPartyApiCalls = browserScan.available ? (browserScan.apiCalls || []).filter((url) => isFirstParty(url, response.finalUrl)) : [];
  const corsTargets = [response.finalUrl, ...firstPartyApiCalls];
  const corsObservations = await probeCors(corsTargets);
  const riskyCors = corsObservations.filter((item) => item.risky);
  const completedCors = corsObservations.filter((item) => !item.error);
  const corsFailures = corsObservations.filter((item) => item.error);
  const testedApis = corsObservations.filter((item) => item.url !== response.finalUrl).length;
  checks.push(result({
    id: 'cors', title: 'Cross-Origin Resource Sharing (CORS)', category: 'Application exposure',
    status: riskyCors.length ? 'warning' : completedCors.length && !corsFailures.length ? 'pass' : 'info',
    summary: riskyCors.length
      ? `${riskyCors.length} scanned resource(s) returned permissive CORS headers to a synthetic external Origin.`
      : !completedCors.length
        ? 'Failed to test CORS response behavior; no absence of permissive CORS was asserted.'
        : corsFailures.length
          ? `No permissive CORS headers were observed for ${completedCors.length} completed source(s); ${corsFailures.length} source(s) failed to test.`
      : testedApis
        ? 'No permissive CORS headers were observed on the main page or discovered API calls.'
        : 'No permissive CORS headers were observed on the main page; API endpoint coverage was limited.',
    details: corsObservations.map((item) => item.error ? `${item.url}: not tested (${item.error})` : `${item.url}: ACAO=${item.acao || '(none)'} ACAC=${item.acac || '(none)'}`).join(' · '),
    recommendation: riskyCors.length ? 'Restrict Access-Control-Allow-Origin to trusted origins and avoid credentialed wildcard/e reflected-origin policies for sensitive resources.' : 'Continue testing authenticated and non-homepage API endpoints; a homepage response does not prove complete CORS safety.',
    affectedUrl: response.finalUrl,
    references: [REFERENCES.cors, REFERENCES.headers],
    testState: completedCors.length === corsObservations.length ? 'confirmed' : completedCors.length ? 'observed' : 'failed_to_test',
    collectionState: completedCors.length === corsObservations.length ? 'completed' : completedCors.length ? 'partial' : 'failed_to_test',
    collectionMethod: 'http_response',
    negativeObservation: riskyCors.length ? null : !completedCors.length ? classifyNegativeObservation({ collectionState: 'failed_to_test' }) : corsFailures.length ? classifyNegativeObservation({ collectionState: 'partial', negativeObserved: true, boundary: 'completed_cors_sources', failedSources: corsFailures.map((item) => item.url) }) : classifyNegativeObservation({ collectionState: 'completed', negativeObserved: true, boundary: 'tested_response' }),
    confidence: riskyCors.length ? 'observed' : completedCors.length ? 'observed' : 'not_tested',
    testMethod: 'Synthetic cross-origin HTTP response analysis',
    limitations: ['Only GET requests and a bounded set of public endpoints were tested.', ...corsObservations.filter((item) => item.error).map((item) => `${item.url}: ${item.error}`)]
  }));

  const disclosure = serverDisclosureAssessment(headers);
  checks.push(result({ id: 'disclosure', title: 'Technology disclosure headers', category: 'Application exposure', status: disclosure.status, severity: disclosure.severity, summary: disclosure.summary, details: disclosure.details, recommendation: disclosure.recommendation, affectedUrl: response.finalUrl }));

  const mixedMatches = [...html.matchAll(/\b(?:src|href|action)\s*=\s*["'](http:\/\/[^"']+)["']/gi)].map((m) => m[1]).slice(0, 20);
  const browserMixed = browserScan.available ? (browserScan.mixedContent || []).map((item) => `${item.category}: ${item.url}`) : [];
  const mixedEvidence = [...new Set([...mixedMatches, ...browserMixed])].slice(0, 30);
  const mixedEvidenceItems = [
    ...(mixedMatches.length ? [{ evidenceId: 'mixed_content_static_html', artifactId: 'initial-http-response', sourceUrl: response.finalUrl, collectionMethod: 'initial_http_response', sourceMethod: 'static_html_analysis', observedAt: startedAt, confidence: 'confirmed', evidenceType: 'document_observation', evidenceStrength: 'direct_observation', evidenceText: mixedMatches.join(' · '), observationKind: 'static_insecure_reference', limitations: ['Static HTML covers only the captured response body.'] }] : []),
    ...(browserMixed.length ? [{ evidenceId: 'mixed_content_browser_network', artifactId: 'browser-network', sourceUrl: browserScan.finalUrl || response.finalUrl, collectionMethod: 'headless_browser_runtime', sourceMethod: 'browser_network', observedAt: startedAt, confidence: browserScan.state === 'confirmed' ? 'confirmed' : 'observed', evidenceType: 'runtime_observation', evidenceStrength: 'direct_observation', evidenceText: browserMixed.join(' · '), observationKind: 'runtime_insecure_request', limitations: [...(browserScan.limitations || [])] }] : [])
  ];
  checks.push(result({
    id: 'mixed-content', title: 'Mixed/insecure resource references', category: 'Page content',
    status: finalUrl.protocol === 'https:' && mixedEvidence.length ? 'fail' : finalUrl.protocol === 'https:' && browserScan.state === 'confirmed' ? 'pass' : 'info',
    summary: finalUrl.protocol !== 'https:'
      ? 'Mixed-content enforcement is not applicable because the final page itself is not HTTPS.'
      : mixedEvidence.length
        ? `${mixedEvidence.length} insecure http:// reference/request${mixedEvidence.length === 1 ? '' : 's'} detected on an HTTPS page.`
        : browserScan.state !== 'confirmed'
          ? 'No insecure references were observed in the static HTML; browser runtime collection was incomplete or failed, so no full runtime absence is asserted.'
          : browserScan.available
          ? 'No static or runtime mixed-content requests were detected on the scanned HTTPS page.'
          : 'No direct http:// resource references were detected in the scanned HTML; runtime mixed content was not assessed.',
    details: mixedEvidence.join(' · '),
    recommendation: mixedEvidence.length ? 'Load page resources, embeds, and form actions over HTTPS.' : '',
    affectedUrl: response.finalUrl,
    references: [REFERENCES.zapPassive],
    testState: browserScan.state === 'confirmed' ? 'confirmed' : 'observed',
    collectionState: browserScan.state === 'confirmed' ? 'completed' : 'partial',
    negativeObservation: !mixedEvidence.length ? classifyNegativeObservation({ collectionState: browserScan.state === 'confirmed' ? 'completed' : 'partial', negativeObserved: true, boundary: 'static_html', failedSources: browserScan.state === 'confirmed' ? [] : ['browser_runtime'] }) : null,
    confidence: mixedEvidence.length ? 'confirmed' : browserScan.state === 'observed' ? 'observed' : 'confirmed',
    testMethod: 'Static HTML and headless browser network analysis',
    evidenceItems: mixedEvidenceItems,
    limitations: browserScan.limitations || []
  }));

  const passwordInputs = (html.match(/<input\b[^>]*\btype\s*=\s*["']password["'][^>]*>/gi) || []).length;
  checks.push(result({ id: 'password-transport', title: 'Password transport', category: 'Page content', status: passwordInputs && finalUrl.protocol !== 'https:' ? 'fail' : 'pass', summary: passwordInputs ? (finalUrl.protocol === 'https:' ? 'Password fields detected on an HTTPS page.' : 'Password fields were detected on an insecure HTTP page.') : 'No password field was detected in the scanned HTML.', recommendation: passwordInputs && finalUrl.protocol !== 'https:' ? 'Never collect passwords over HTTP.' : '', affectedUrl: response.finalUrl }));

  const privacyDetected = detectPrivacyPolicySignal(html);
  checks.push(result({ id: 'privacy', title: 'Privacy policy signal', category: 'Privacy & transparency', status: privacyDetected ? 'pass' : 'manual', summary: privacyDetected ? 'A privacy-policy signal/link was detected in the scanned HTML.' : 'No privacy-policy link was confidently observed in the tested initial HTML; this is a bounded page observation.', recommendation: privacyDetected ? '' : 'Verify manually that users can easily access the applicable privacy notice.', testState: 'confirmed', collectionState: 'completed', collectionMethod: 'http_response', negativeObservation: privacyDetected ? null : classifyNegativeObservation({ collectionState: 'completed', negativeObserved: true, boundary: 'tested_response' }) }));

  const consentDetected = /cookie.{0,80}(?:consent|preferences|settings|accept|reject)|(?:consent|preferences).{0,80}cookie/is.test(html);
  checks.push(result({ id: 'consent', title: 'Cookie consent signal', category: 'Privacy & transparency', status: consentDetected ? 'pass' : 'manual', summary: consentDetected ? 'Cookie-consent/preference text was detected.' : 'No clear cookie-consent interface was observed in the tested initial HTML; browser behavior is assessed separately.', details: 'This check cannot determine whether consent behavior is legally sufficient.', recommendation: 'Verify consent requirements and behavior manually for the jurisdictions and tracking technologies that apply.', testState: 'confirmed', collectionState: 'completed', collectionMethod: 'http_response', negativeObservation: consentDetected ? null : classifyNegativeObservation({ collectionState: 'completed', negativeObserved: true, boundary: 'tested_response' }) }));

  const runtimeConsentDetected = Boolean(browserScan.storage?.consentInterfaceDetected);
  const trackingBeforeChoice = Boolean(browserScan.trackingBeforeConsent || browserScan.trackingWithoutConsentInterface);
  const failedConsentScenarios = (browserScan.consentScenarios || []).filter((scenario) => scenario.state === 'failed_to_test');
  const consentCollectionState = browserScan.state === 'failed_to_test'
    ? 'failed_to_test'
    : failedConsentScenarios.length || browserScan.state === 'observed'
      ? 'partial'
      : browserScan.state === 'confirmed' && (trackingBeforeChoice || runtimeConsentDetected)
        ? 'completed'
        : 'not_tested';
  const consentEvidenceItems = [
    ...((browserScan.trackingRequests || []).length ? [{ evidenceId: 'consent_tracking_network_requests', artifactId: 'browser-network', sourceUrl: browserScan.finalUrl || response.finalUrl, collectionMethod: 'headless_browser_runtime', sourceMethod: 'browser_network', observedAt: startedAt, confidence: browserScan.state === 'confirmed' ? 'confirmed' : 'observed', evidenceType: 'runtime_observation', evidenceStrength: 'supporting_technical', evidenceText: browserScan.trackingRequests.map((request) => request.url).join(' · '), observationKind: 'network_request', limitations: ['Known-host matching does not determine request purpose, legal necessity, or whether terminal storage/access occurred.'] }] : []),
    ...((browserScan.cookies || []).length ? [{ evidenceId: 'consent_cookie_snapshot', artifactId: 'browser-cookies', sourceUrl: browserScan.finalUrl || response.finalUrl, collectionMethod: 'headless_browser_runtime', sourceMethod: 'browser_cookie_snapshot', observedAt: startedAt, confidence: 'observed', evidenceType: 'runtime_observation', evidenceStrength: 'supporting_technical', evidenceText: `${browserScan.cookies.length} cookie metadata record(s) observed.`, observationKind: 'cookie_snapshot', limitations: ['A cookie snapshot does not establish when each cookie was written, its necessity, or legal consent requirements.'] }] : []),
    ...((browserScan.storage?.localStorageKeys || []).length ? [{ evidenceId: 'consent_local_storage_snapshot', artifactId: 'browser-storage', sourceUrl: browserScan.finalUrl || response.finalUrl, collectionMethod: 'headless_browser_runtime', sourceMethod: 'browser_storage_snapshot', observedAt: startedAt, confidence: 'observed', evidenceType: 'runtime_observation', evidenceStrength: 'contextual', evidenceText: `${browserScan.storage.localStorageKeys.length} localStorage key name(s) observed.`, observationKind: 'local_storage_key_snapshot', limitations: ['Key-name presence does not establish when storage was written, its purpose, or legal consent requirements.'] }] : []),
    ...(runtimeConsentDetected ? [{ evidenceId: 'consent_interface_runtime', artifactId: 'browser-storage', sourceUrl: browserScan.finalUrl || response.finalUrl, collectionMethod: 'headless_browser_runtime', sourceMethod: 'browser_dom_observation', observedAt: startedAt, confidence: 'confirmed', evidenceType: 'runtime_observation', evidenceStrength: 'contextual', evidenceText: 'A consent interface was observed in the tested browser state.', observationKind: 'consent_interface', limitations: ['Interface presence does not establish valid consent or complete behavior across routes, locales, or visitor states.'] }] : [])
  ];
  checks.push(result({
    id: 'consent-behavior', title: 'Tracking before consent interaction', category: 'Privacy & transparency',
    status: trackingBeforeChoice ? 'warning' : failedConsentScenarios.length || browserScan.state === 'failed_to_test' ? 'info' : browserScan.state === 'confirmed' && runtimeConsentDetected ? 'pass' : 'manual',
    severity: trackingBeforeChoice ? 'medium' : failedConsentScenarios.length || browserScan.state === 'failed_to_test' ? 'informational' : 'manual',
    summary: browserScan.trackingWithoutConsentInterface
      ? `${browserScan.trackingRequests.length} request(s) to known analytics/tracking hosts were observed in a fresh browser context and no consent interface was detected.`
      : browserScan.trackingBeforeConsent
        ? `${browserScan.trackingRequests.length} request(s) to known analytics/tracking hosts were observed during initial load before interaction with the detected consent interface.`
      : browserScan.state === 'confirmed' && runtimeConsentDetected
        ? failedConsentScenarios.length
          ? `A consent interface was observed, but ${failedConsentScenarios.length} configured consent scenario(s) failed to test; no complete behavior absence was asserted.`
          : 'A consent interface was observed and no requests to the scanner\'s known tracking-host list were captured before interaction.'
        : browserScan.state === 'failed_to_test'
          ? 'Failed to test consent ordering; no consent-interface or tracking absence was asserted.'
        : 'Consent ordering could not be assessed from the available browser evidence.',
    details: (browserScan.trackingRequests || []).map((request) => request.url).join(' · '),
    recommendation: trackingBeforeChoice ? 'Confirm the purpose and legal basis of each request and block non-essential tracking until the required consent is recorded.' : 'Review consent behavior against applicable jurisdictions, tracking purposes, and withdrawal requirements.',
    affectedUrl: response.finalUrl,
    testState: consentCollectionState === 'completed' ? 'confirmed' : consentCollectionState === 'partial' ? 'observed' : consentCollectionState,
    collectionState: consentCollectionState,
    collectionMethod: 'browser_runtime',
    negativeObservation: trackingBeforeChoice ? null : consentCollectionState === 'failed_to_test' ? classifyNegativeObservation({ collectionState: 'failed_to_test' }) : consentCollectionState === 'partial' ? classifyNegativeObservation({ collectionState: 'partial', negativeObserved: true, boundary: 'completed_consent_scenarios', failedSources: failedConsentScenarios.map((scenario) => scenario.scenario) }) : null,
    confidence: trackingBeforeChoice ? 'confirmed' : consentCollectionState === 'completed' ? 'confirmed' : consentCollectionState === 'partial' ? 'observed' : 'not_tested',
    testMethod: 'Initial-load browser network and consent-interface observation',
    evidenceItems: consentEvidenceItems,
    limitations: ['Host matching cannot determine tracking purpose, legal basis, or jurisdictional applicability.', 'The observation does not determine whether storage/access occurred, whether consent was legally required, or whether an applicable strictly-necessary exception exists.', ...(browserScan.freshConsentContext ? [] : ['A stored browser session was reused, so a prior consent choice may have existed.']), ...(browserScan.limitations || [])]
  }));

  const staticThirdParty = findThirdPartyScripts(html, response.finalUrl);
  const runtimeScriptHosts = browserScan.available
    ? [...new Set((browserScan.externalScripts || []).map((url) => {
        try { return new URL(url).hostname; } catch { return ''; }
      }).filter(Boolean))]
    : [];
  const thirdParty = [...new Set([...staticThirdParty, ...runtimeScriptHosts])];
  const thirdPartyCollectionComplete = browserScan.state === 'confirmed';
  checks.push(result({ id: 'third-party-scripts', title: 'Third-party scripts', category: 'Privacy & supply chain', status: thirdParty.length ? 'manual' : thirdPartyCollectionComplete ? 'pass' : 'info', summary: thirdParty.length ? `${thirdParty.length} third-party script host${thirdParty.length === 1 ? '' : 's'} detected.` : (thirdPartyCollectionComplete ? 'No third-party script hosts were observed in the static HTML or bounded browser runtime.' : 'No third-party script hosts were observed in the static HTML; browser runtime collection was incomplete or failed.'), details: thirdParty.slice(0, 30).join(', '), recommendation: thirdParty.length ? 'Review each third-party script for necessity, data handling, contractual controls, consent requirements, and supply-chain risk.' : '', affectedUrl: response.finalUrl, references: [REFERENCES.zapPassive], testState: thirdPartyCollectionComplete ? 'confirmed' : 'observed', collectionState: thirdPartyCollectionComplete ? 'completed' : 'partial', collectionMethod: 'browser_runtime', negativeObservation: thirdParty.length ? null : classifyNegativeObservation({ collectionState: thirdPartyCollectionComplete ? 'completed' : 'partial', negativeObserved: true, boundary: 'static_html', failedSources: thirdPartyCollectionComplete ? [] : ['browser_runtime'] }) }));

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
    checks.push(result({ id: 'security-txt', title: 'security.txt disclosure channel', category: 'Security operations', status: 'info', summary: 'Failed to test security.txt; no security.txt absence was asserted.', details: describeError(error), testState: 'failed_to_test', collectionState: 'failed_to_test', collectionMethod: 'http_response', negativeObservation: classifyNegativeObservation({ collectionState: 'failed_to_test' }) }));
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
        { url: response.finalUrl, finalUrl: response.finalUrl, status: response.status, found: true, groups: ['homepage'], source: 'initial-page', title: browserScan.available ? browserScan.title || '' : '', html, detectedLocale: detectLocale({ finalUrl: response.finalUrl, html }), languageSignals: [detectLocale({ finalUrl: response.finalUrl, html }), browserScan.storage?.detectedLocale || 'unknown'].filter((value) => value !== 'unknown'), collectedAt: startedAt },
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
        state: pages.collectionMetadata?.state || 'completed',
        collectionMetadata: pages.collectionMetadata || { state: 'completed', limitations: [] },
        pages: evidencePages.map((p) => ({ url: p.finalUrl || p.url, status: p.status, found: p.found, groups: p.groups, title: p.title || '', source: p.source || '', detectedLocale: p.detectedLocale || 'unknown', error: p.error || '' })),
        linkedEvidence,
        ...evidence
      };

      const hasGroup = (g) => (evidence.pagesFoundByGroup[g] || []).length > 0;

      checks.push(result({ id: 'evidence-privacy-page', title: 'Privacy policy document', category: 'Compliance evidence', status: hasGroup('privacy') ? 'pass' : 'manual', summary: hasGroup('privacy') ? `A privacy-related document was found or linked publicly: ${evidence.pagesFoundByGroup.privacy.join(', ')}. Document presence does not establish quality or legal sufficiency.` : 'No dedicated privacy policy document was observed within the bounded crawl of common paths and homepage links.', recommendation: hasGroup('privacy') ? '' : 'Publish a clearly linked privacy policy.', testState: 'confirmed', collectionState: 'completed', collectionMethod: 'crawl', negativeObservation: hasGroup('privacy') ? null : classifyNegativeObservation({ collectionState: 'completed', negativeObserved: true, boundary: 'bounded_crawl' }) }));
      checks.push(result({ id: 'evidence-security-page', title: 'Security/trust page', category: 'Compliance evidence', status: hasGroup('security') ? 'pass' : 'manual', summary: hasGroup('security') ? `A security/trust page was found: ${evidence.pagesFoundByGroup.security.join(', ')}` : 'No dedicated security or trust-center page was observed within the bounded crawl.', recommendation: hasGroup('security') ? '' : 'Consider publishing a security/trust page describing controls and certifications.', testState: 'confirmed', collectionState: 'completed', collectionMethod: 'crawl', negativeObservation: hasGroup('security') ? null : classifyNegativeObservation({ collectionState: 'completed', negativeObserved: true, boundary: 'bounded_crawl' }) }));
      checks.push(result({ id: 'evidence-compliance-page', title: 'Compliance/legal page', category: 'Compliance evidence', status: (hasGroup('compliance') || hasGroup('terms')) ? 'pass' : 'manual', summary: (hasGroup('compliance') || hasGroup('terms')) ? `Compliance/legal or terms pages were found or linked publicly: ${[...(evidence.pagesFoundByGroup.compliance || []), ...(evidence.pagesFoundByGroup.terms || [])].join(', ')}` : 'No dedicated compliance or terms page was observed within the bounded crawl.', recommendation: (hasGroup('compliance') || hasGroup('terms')) ? '' : 'Publish terms of service and, where applicable, a dedicated compliance/legal page.', testState: 'confirmed', collectionState: 'completed', collectionMethod: 'crawl', negativeObservation: (hasGroup('compliance') || hasGroup('terms')) ? null : classifyNegativeObservation({ collectionState: 'completed', negativeObserved: true, boundary: 'bounded_crawl' }) }));
      const evidenceFor = (key) => (evidence.evidenceItems || []).filter((item) => item.key === key).map((item) => ({ ...item, artifactId: item.artifactId || 'crawl-pages' }));
      checks.push(result({ id: 'evidence-data-subject-rights', title: 'Data subject rights language', category: 'Compliance evidence', status: evidence.evidenceFound.dataSubjectRights ? 'pass' : 'manual', summary: evidence.evidenceFound.dataSubjectRights ? 'Language describing data subject rights (access, erasure, opt-out, etc.) was found on crawled pages.' : 'No explicit data subject rights language was found on crawled pages.', recommendation: evidence.evidenceFound.dataSubjectRights ? '' : 'Describe data subject rights (access, erasure, portability, opt-out) in the privacy policy.', evidenceItems: evidenceFor('dataSubjectRights') }));
      checks.push(result({ id: 'evidence-consent-management', title: 'Cookie/consent management evidence', category: 'Compliance evidence', status: evidence.evidenceFound.consentManagement ? 'pass' : 'manual', summary: evidence.evidenceFound.consentManagement ? 'Consent-management language or a known consent platform was detected on crawled pages.' : 'No consent-management platform or language was detected on crawled pages.', recommendation: evidence.evidenceFound.consentManagement ? '' : 'Verify an appropriate cookie-consent mechanism is deployed where required after qualified scope review.', evidenceItems: evidenceFor('consentManagement') }));
      checks.push(result({ id: 'evidence-breach-notification', title: 'Breach notification / incident response language', category: 'Compliance evidence', status: evidence.evidenceFound.breachNotification ? 'pass' : 'manual', summary: evidence.evidenceFound.breachNotification ? 'Breach notification or incident response language was found on crawled pages.' : 'No breach notification or incident response language was found on crawled pages.', recommendation: evidence.evidenceFound.breachNotification ? '' : 'Publish a summary of breach notification / incident response commitments where applicable.', evidenceItems: evidenceFor('breachNotification') }));

      const policyQualityIssues = (evidence.policyDocuments || []).filter((item) => ['template_or_placeholder_detected', 'likely_draft'].includes(item.policyDocumentQuality));
      checks.push(result({
        id: 'policy-document-quality',
        title: 'Public policy document quality',
        category: 'Compliance evidence',
        status: policyQualityIssues.length ? 'warning' : (evidence.policyDocuments || []).length ? 'info' : 'manual',
        severity: policyQualityIssues.length ? 'low' : 'informational',
        summary: policyQualityIssues.length ? `${policyQualityIssues.length} public policy page(s) contain apparent template, placeholder, or draft language.` : (evidence.policyDocuments || []).length ? 'No common template or draft marker was detected in the bounded policy-page text.' : 'No public policy document was available for quality analysis.',
        details: policyQualityIssues.map((item) => `${item.sourceUrl}: ${item.excerpt}`).join(' · '),
        recommendation: policyQualityIssues.length ? 'Have the document owner review and replace apparent template or draft content; this observation does not determine legal validity.' : '',
        evidenceItems: policyQualityIssues.map((item) => ({ evidenceId: item.documentId, key: 'policyDocumentQuality', label: 'Policy document quality', artifactId: 'crawl-pages', sourceUrl: item.sourceUrl, evidenceText: item.excerpt, excerpt: item.excerpt, collectionMethod: item.collectionMethod, sourceMethod: 'public_policy_text', observedAt: item.observedAt, confidence: item.confidence, evidenceType: 'public_policy_text', evidenceStrength: 'direct_observation', limitations: item.limitations })),
        confidence: policyQualityIssues.some((item) => item.confidence === 'high') ? 'confirmed' : 'observed',
        testMethod: 'Bounded public policy text quality heuristics',
        limitations: ['Template/draft matching does not determine whether a document is legally valid, complete, current, or applicable.']
      }));

      checks.push(result({
        id: 'locale-policy-parity',
        title: 'Public policy locale coverage',
        category: 'Compliance evidence',
        status: evidence.localeCoverage === 'potential_locale_content_difference' ? 'warning' : evidence.localeCoverage === 'partial_locale_coverage' ? 'manual' : 'info',
        severity: evidence.localeCoverage === 'potential_locale_content_difference' ? 'low' : 'informational',
        summary: evidence.localeCoverage === 'potential_locale_content_difference' ? 'Important public evidence categories differ between observed locale variants and require manual review.' : `Locale coverage: ${evidence.localeCoverage}.`,
        details: `Detected locale: ${evidence.detectedLocale}; available locales: ${(evidence.availableLocales || []).join(', ') || 'unknown'}; policy locales tested: ${(evidence.policyLocalesTested || []).join(', ') || 'none'}`,
        recommendation: evidence.localeCoverage === 'potential_locale_content_difference' ? 'Compare the public policy and consent content in each supported locale, prioritizing Arabic and English.' : '',
        testMethod: 'Bounded locale-aware public evidence comparison',
        limitations: ['Content differences are review signals, not legal violations. Locale discovery is bounded and may not enumerate every route.']
      }));

      const certList = Object.entries(evidence.certifications).filter(([, found]) => found).map(([id]) => FRAMEWORKS[id]?.label || id.toUpperCase());
      checks.push(result({
        id: 'evidence-certifications', title: 'Certification / framework mentions', category: 'Compliance evidence',
        status: 'manual',
        summary: certList.length ? `The following certifications/frameworks were mentioned on crawled pages: ${certList.join(', ')}.` : 'No certification or framework mentions were found on crawled pages.',
        details: certList.join(', '),
        recommendation: 'A text mention is not proof of certification. Verify any certification claim against a current, signed certificate or audit report before relying on it.'
      }));
    } catch (error) {
      crawl = { error: describeError(error), state: 'failed_to_test', collectionMetadata: { state: 'failed_to_test', limitations: [describeError(error)] }, pagesScanned: 0, pages: [] };
      checks.push(result({ id: 'public-evidence-crawl', title: 'Public evidence crawl', category: 'Compliance evidence', status: 'info', summary: 'Failed to test public evidence discovery; no public-document absence was asserted.', details: crawl.error, affectedUrl: response.finalUrl, testState: 'failed_to_test', collectionState: 'failed_to_test', collectionMethod: 'crawl', negativeObservation: classifyNegativeObservation({ collectionState: 'failed_to_test' }), limitations: ['Crawl failure does not establish that a public policy, security, compliance, or terms document is absent.'] }));
    }
  }

  const paymentFlow = analyzePaymentFlowEvidence({ pages: crawlEvidencePages, browserScan, testedOrigin: response.finalUrl, observedAt: startedAt });

  // Compare explicit privacy promises with runtime behavior. This does not
  // decide legal compliance; it identifies evidence that reviewers should
  // reconcile because the public notice and observed page behavior differ.
  if (crawl?.evidenceFound) {
    const claimItems = relevantEvidenceItems(crawl, ['noAdvertisingCookiesClaim', 'noTrackingClaim']).map((item) => ({ ...item, artifactId: item.artifactId || 'crawl-pages' }));
    if (claimItems.length) {
      const noAdvertisingClaim = Boolean(crawl.evidenceFound.noAdvertisingCookiesClaim);
      const noTrackingClaim = Boolean(crawl.evidenceFound.noTrackingClaim);
      const consistency = assessPrivacyRuntimeConsistency({ noAdvertisingCookiesClaim: noAdvertisingClaim, noTrackingClaim, trackingRequests: browserScan.trackingRequests || [], cookies: browserScan.cookies || [] });
      const { contradictoryRequests, advertisingCookies, contradictionObserved } = consistency;
      const runtimeDetails = [
        ...contradictoryRequests.map((request) => request.url),
        ...advertisingCookies.map((cookie) => `cookie:${cookie.name}`)
      ];
      checks.push(result({
        id: 'privacy-runtime-consistency',
        title: 'Privacy notice and runtime behavior consistency',
        category: 'Privacy & transparency',
        status: contradictionObserved ? 'warning' : 'info',
        severity: contradictionObserved ? 'medium' : 'informational',
        summary: contradictionObserved
          ? 'An explicit privacy-policy claim appears inconsistent with advertising/tracking technology observed during the browser scan.'
          : 'An explicit no-advertising/no-tracking claim was found, and no contradictory request was identified in the bounded browser observation.',
        details: [
          ...claimItems.map((item) => `${item.sourceUrl}: ${item.keyword}`),
          ...runtimeDetails
        ].join(' · '),
        recommendation: contradictionObserved ? 'Review the observed services and cookies, then update either the runtime configuration or the privacy notice so the disclosure matches actual processing.' : '',
        affectedUrl: response.finalUrl,
        evidenceItems: [
          ...claimItems,
          ...(runtimeDetails.length ? [{ evidenceId: 'privacy_runtime_consistency_browser', artifactId: 'browser-network', artifactRefs: ['browser-network', ...(advertisingCookies.length ? ['browser-cookies'] : [])], sourceUrl: browserScan.finalUrl || response.finalUrl, collectionMethod: 'headless_browser_runtime', sourceMethod: 'browser_network_and_cookie_snapshot', observedAt: startedAt, confidence: browserScan.state === 'confirmed' ? 'confirmed' : 'observed', evidenceType: 'runtime_observation', evidenceStrength: 'supporting_technical', evidenceText: runtimeDetails.join(' · '), observationKind: 'runtime_claim_comparison', limitations: ['Vendor/host matching cannot by itself determine each request purpose.'] }] : [])
        ],
        testState: browserScan.state === 'confirmed' ? 'confirmed' : browserScan.state || 'failed_to_test',
        confidence: contradictionObserved && browserScan.state === 'confirmed' ? 'confirmed' : 'observed',
        testMethod: 'Crawled privacy-notice claim compared with initial-load browser requests and cookies',
        limitations: ['Vendor/host matching cannot by itself determine each request purpose; the detected inconsistency requires owner review.', ...(browserScan.limitations || [])]
      }));
    }

    const consentClaimItems = relevantEvidenceItems(crawl, ['consentInterfaceClaim']).map((item) => ({ ...item, artifactId: item.artifactId || 'crawl-pages' }));
    if (consentClaimItems.length) {
      const consentConsistency = assessPrivacyRuntimeConsistency({
        consentInterfaceClaim: true,
        consentInterfaceDetected: Boolean(browserScan.storage?.consentInterfaceDetected),
        browserState: browserScan.state,
        freshContext: Boolean(browserScan.freshConsentContext),
        trackingRequests: browserScan.trackingRequests || [],
        cookies: browserScan.cookies || []
      });
      checks.push(result({
        id: 'privacy-runtime-verification',
        title: 'Privacy notice consent-interface claim verification',
        category: 'Privacy & transparency',
        status: consentConsistency.consentClaimUnverified ? 'warning' : consentConsistency.consentClaimVerified ? 'info' : 'manual',
        severity: consentConsistency.consentClaimUnverified ? 'low' : consentConsistency.consentClaimVerified ? 'informational' : 'manual',
        summary: consentConsistency.consentClaimUnverified
          ? 'The privacy notice says a consent or cookie-preference interface is available, but no such interface was detected during a confirmed fresh-context browser load.'
          : consentConsistency.consentClaimVerified
            ? 'A privacy-notice consent-interface claim was found and a consent interface was observed during the browser scan.'
            : 'A privacy-notice consent-interface claim was found, but runtime verification could not be completed.',
        details: consentClaimItems.map((item) => `${item.sourceUrl}: ${item.keyword}`).join(' · '),
        recommendation: consentConsistency.consentClaimUnverified ? 'Verify that the interface is deployed for the tested locale and visitor state, then align the runtime behavior or privacy notice.' : '',
        affectedUrl: response.finalUrl,
        evidenceItems: [
          ...consentClaimItems,
          ...(['confirmed', 'observed'].includes(browserScan.state) ? [{ evidenceId: 'privacy_runtime_consent_interface', artifactId: 'browser-storage', sourceUrl: browserScan.finalUrl || response.finalUrl, collectionMethod: 'headless_browser_runtime', sourceMethod: 'browser_dom_observation', observedAt: startedAt, confidence: browserScan.state === 'confirmed' ? 'confirmed' : 'observed', evidenceType: 'runtime_observation', evidenceStrength: 'contextual', evidenceText: browserScan.storage?.consentInterfaceDetected ? 'Consent interface observed.' : 'Consent interface not observed in the bounded runtime state.', observationKind: 'consent_interface', limitations: ['One bounded load does not establish behavior for every route, locale, region, or visitor state.'] }] : [])
        ],
        testState: browserScan.state === 'confirmed' ? 'confirmed' : browserScan.state || 'failed_to_test',
        confidence: consentConsistency.consentClaimUnverified ? 'observed' : consentConsistency.consentClaimVerified ? 'confirmed' : 'not_tested',
        testMethod: 'Crawled privacy-notice claim compared with a fresh-context browser DOM observation',
        limitations: ['A missing interface in one bounded load does not prove it is absent for every locale, region, route, or visitor state.', ...(browserScan.limitations || [])]
      }));
    }
  }

  const selectedSet = new Set(frameworks);
  const filteredChecks = checks.map((check) => ({ ...check, observedAt: check.observedAt || startedAt, frameworks: check.frameworks.filter((id) => selectedSet.has(id)) }));
  const frameworkResults = frameworks.map((id) => frameworkEvidenceSummary(id, { checks: filteredChecks, crawl, jurisdiction, frameworkApplicability: frameworkApplicabilityInput, paymentFlow }));
  const frameworkApplicability = Object.fromEntries(frameworkResults.map((framework) => [framework.id, framework.applicability]));

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
  let findings = buildFindings(filteredChecks, { generatedAt, toolVersion: SCANNER_VERSION, frameworks, frameworkApplicability, jurisdiction, paymentFlow, defaultSourceUrl: response.finalUrl });
  const testResults = buildTestResults(filteredChecks, { generatedAt });
  const zapConfig = config.zap && typeof config.zap === 'object' ? config.zap : { mode: 'none' };
  const zapResult = await runZapScan(zapConfig, response.finalUrl);
  findings.push(...(zapResult.findings || []));
  findings = mergeFindingsByFingerprint(findings);
  if (zapResult.enabled) {
    const zapEvidence = buildZapEvidenceMetadata(zapResult, response.finalUrl, generatedAt);
    testResults.push({
      id: 'owasp-zap', title: `OWASP ZAP ${zapResult.mode} scan`, category: 'External scanner', outcome: zapResult.state === 'confirmed' ? 'pass' : 'info', state: zapResult.state, collectionState: zapResult.collectionState || normalizeCollectionState(zapResult.state), collectionMethod: 'zap_passive', stateLabel: zapResult.stateLabel, confidence: 'unknown', legacyConfidence: zapResult.state === 'confirmed' ? 'confirmed' : zapResult.state === 'observed' ? 'observed' : 'not_tested', affectedUrl: response.finalUrl, summary: zapResult.state === 'confirmed' ? `ZAP completed and returned ${zapResult.alertCount} alert(s).` : `ZAP did not fully complete: ${zapResult.error}`, testMethod: 'OWASP ZAP Docker packaged scan', evidence: zapEvidence, evidenceItems: [zapEvidence], limitations: zapResult.limitations || []
    });
  }
  const evidenceLevel = authentication.enabled && (browserScan.authenticatedPages || []).length ? 'authenticated_application' : 'public_url';
  const controlEvaluations = buildControlEvaluations(filteredChecks, findings, frameworks, { frameworkApplicability, jurisdiction, evidenceLevel, paymentFlow });
  riskCount = findings.filter((finding) => !['informational'].includes(finding.severity)).length;
  overallStatus = findings.some((finding) => ['critical', 'high'].includes(finding.severity)) ? 'high-attention' : findings.some((finding) => finding.severity === 'medium') ? 'review' : 'good';
  const frameworkResultsWithControls = frameworkResults.map((framework) => ({
    ...framework,
    controlEvaluations: controlEvaluations.filter((control) => frameworkForControl(control.controlId) === framework.id)
  }));
  const runtimeConsistencyCheck = filteredChecks.find((check) => check.id === 'privacy-runtime-consistency');
  const runtimeVerificationCheck = filteredChecks.find((check) => check.id === 'privacy-runtime-verification');
  const consentAssessment = {
    policyClaimObserved: Boolean(crawl?.evidenceFound?.consentInterfaceClaim),
    runtimeBehaviorObserved: ['confirmed', 'observed'].includes(browserScan.state),
    claimNotVerified: runtimeVerificationCheck?.status === 'warning',
    confirmedRuntimeMismatch: runtimeConsistencyCheck?.status === 'warning' && runtimeConsistencyCheck?.confidence === 'confirmed',
    scenarios: (browserScan.consentScenarios || []).map(({ screenshotBase64, ...scenario }) => scenario),
    conclusion: runtimeConsistencyCheck?.status === 'warning' && runtimeConsistencyCheck?.confidence === 'confirmed' ? 'confirmed_runtime_mismatch' : runtimeVerificationCheck?.status === 'warning' ? 'claim_not_verified' : ['confirmed', 'observed'].includes(browserScan.state) ? 'runtime_behavior_observed' : crawl?.evidenceFound?.consentInterfaceClaim ? 'policy_claim_observed' : 'not_assessed',
    limitations: ['Consent observations are bounded by tested route, locale, visitor context, cookies/storage state, and scenario configuration; legal sufficiency is not determined.']
  };
  const scopeEvidence = buildOperatorScopeEvidence({ frameworkApplicability: frameworkApplicabilityInput, jurisdiction, sourceUrl: response.finalUrl, observedAt: generatedAt });
  const collectionCoverage = buildCollectionCoverage({ response, tlsAnalysis, crawlEnabled, crawl, browserScan, zapResult });

  return {
    schemaVersion: '2.6.0',
    scannerVersion: SCANNER_VERSION,
    toolVersion: TOOL_VERSION,
    mappingCatalogVersion: MAPPING_CATALOG_VERSION,
    relationshipDefinitions: RELATIONSHIP_DEFINITIONS,
    relationshipDisclaimer: RELATIONSHIP_DISCLAIMER,
    frameworkDefinitions: FRAMEWORK_DISPLAY_NAMES,
    reviewReasonDefinitions: REVIEW_REASON_DEFINITIONS,
    reportType: 'security-compliance',
    assessmentType: 'compliance_pre_assessment',
    evidenceLevel,
    complianceConclusion: 'not_determined',
    coverage: 'partial',
    generatedAt,
    startedAt,
    projectName,
    requestedUrl: parsed.href,
    finalUrl: response.finalUrl,
    jurisdiction,
    frameworks,
    frameworkApplicability,
    scopeAssessment: Object.fromEntries(frameworkResultsWithControls.map((framework) => [framework.id, {
      state: framework.applicability,
      label: framework.applicabilityLabel,
      selectedForMapping: framework.selectedForMapping,
      selectionLabel: framework.selectionLabel,
      basis: framework.scopeBasis,
      confidence: framework.scopeConfidence,
      decisionRequired: framework.scopeDecisionRequired,
      operatorInput: framework.applicabilityInput
    }])),
    scopeEvidence,
    collectionCoverage,
    responseStatus: response.status,
    redirectChain: response.redirectChain,
    overallStatus,
    riskCount,
    totals,
    counts: {
      checks: filteredChecks.length,
      observations: filteredChecks.filter((check) => ['confirmed', 'observed', 'inferred'].includes(check.testState)).length,
      findings: findings.length,
      evidenceItems: (crawl?.evidenceItems || []).length + testResults.length,
      controlMappings: controlEvaluations.reduce((count, control) => count + (control.mappings || []).length, 0),
      controlEvaluations: controlEvaluations.length
    },
    checks: filteredChecks,
    findings,
    testResults,
    controlEvaluations,
    zap: { enabled: zapResult.enabled, mode: zapResult.mode, image: zapResult.image || '', state: zapResult.state, stateLabel: zapResult.stateLabel, exitCode: zapResult.exitCode ?? null, timedOut: Boolean(zapResult.timedOut), error: zapResult.error || '', alertCount: zapResult.alertCount || 0, limitations: zapResult.limitations || [] },
    frameworkResults: frameworkResultsWithControls,
    tlsAnalysis,
    browserScan,
    crawl,
    policyDocumentQuality: crawl?.policyDocuments || [],
    gdprPublicNoticeMatrix: crawl?.gdprPublicNoticeMatrix || [],
    gdprPublicNoticeAggregate: aggregateGdprPublicNoticeState(crawl?.gdprPublicNoticeMatrix || []),
    localeCoverage: crawl ? { detectedLocale: crawl.detectedLocale, testedLocale: crawl.testedLocale, availableLocales: crawl.availableLocales || [], contentLocalesDiscovered: crawl.contentLocalesDiscovered || crawl.availableLocales || [], policyLocalesTested: crawl.policyLocalesTested || [], languageSignals: crawl.languageSignals || [], state: crawl.localeCoverage || 'locale_parity_not_assessed', localeParity: crawl.localeParity || 'locale_parity_not_assessed' } : { detectedLocale: 'unknown', testedLocale: 'unknown', availableLocales: [], contentLocalesDiscovered: [], policyLocalesTested: [], languageSignals: [], state: 'locale_parity_not_assessed', localeParity: 'locale_parity_not_assessed' },
    paymentFlow,
    consentAssessment,
    evidenceArchive: {
      metadata: {
        schemaVersion: '1.1.0',
        scannerVersion: SCANNER_VERSION,
        toolVersion: TOOL_VERSION,
        mappingCatalogVersion: MAPPING_CATALOG_VERSION,
        assessmentType: 'compliance_pre_assessment',
        evidenceLevel,
        complianceConclusion: 'not_determined',
        coverage: 'partial',
        projectName,
        requestedUrl: parsed.href,
        finalUrl: response.finalUrl,
        startedAt,
        completedAt: generatedAt,
        frameworks,
        jurisdiction,
        frameworkApplicability: frameworkApplicabilityInput,
        configuration: {
          crawlEnabled,
          maxCrawlPages,
          browserRetryCount: browserScan.retryCount ?? Math.max(0, Math.min(4, Number.isFinite(Number(config.browserRetryCount)) ? Number(config.browserRetryCount) : 2)),
          browserTimeoutMs: Math.max(5000, Math.min(90000, Number(config.browserTimeoutMs) || 30000)),
          serviceWorkersBlocked: true,
          consentTesting: normalizeConsentTestingConfig(config.consentTesting),
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
    disclaimer: `This ${evidenceLevel === 'authenticated_application' ? 'authenticated-application' : 'public-URL'} scan is an automated compliance pre-assessment. It reports scope signals, technical observations, and candidate control mappings; it does not determine control satisfaction, operating effectiveness, certification, or legal compliance. Organizational, contractual, procedural, and legal evidence requires qualified manual assessment.`
  };
}

export const SECURITY_FRAMEWORKS = FRAMEWORKS;
export { analyzeCsp, analyzeReferrerPolicy, browserCookieChecks, classifyCookie, cookieChecks, frameworkEvidenceSummary, parseHsts, runBrowserSecurityScan };
