const TRACKING_PARAMETERS = new Set([
  'fbclid', 'gclid', 'dclid', 'msclkid', 'mc_cid', 'mc_eid', '_ga', '_gl'
]);

function isTrackingParameter(name) {
  const normalized = String(name || '').toLowerCase();
  return TRACKING_PARAMETERS.has(normalized) || normalized.startsWith('utm_');
}

export function canonicalizeObservedUrl(value) {
  try {
    const url = new URL(String(value || ''));
    url.hash = '';
    if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
    const entries = [...url.searchParams.entries()]
      .filter(([name]) => !isTrackingParameter(name))
      .sort(([leftName, leftValue], [rightName, rightValue]) => leftName.localeCompare(rightName) || leftValue.localeCompare(rightValue));
    url.search = '';
    for (const [name, entryValue] of entries) url.searchParams.append(name, entryValue);
    if (url.pathname.length > 1) url.pathname = url.pathname.replace(/\/+$/, '');
    return url.href;
  } catch {
    return String(value || '');
  }
}

function isDirectHostRelation(left, right) {
  return left.endsWith(`.${right}`) || right.endsWith(`.${left}`);
}

export function classifyObservedDestination(resourceUrl, pageUrl) {
  try {
    const resource = new URL(resourceUrl);
    const page = new URL(pageUrl);
    if (resource.origin === page.origin) return { classification: 'same_origin', confidence: 'high' };
    if (isDirectHostRelation(resource.hostname.toLowerCase(), page.hostname.toLowerCase())) return { classification: 'related_host', confidence: 'medium' };
    return { classification: 'external_host', confidence: 'high' };
  } catch {
    return { classification: 'unknown', confidence: 'low' };
  }
}

function normalizedSet(values) {
  return [...new Set((values || []).map((value) => String(value || '').trim()).filter(Boolean))].sort();
}

function compareNames(before, after) {
  const left = new Set(normalizedSet(before));
  const right = new Set(normalizedSet(after));
  return {
    added: [...right].filter((value) => !left.has(value)).sort(),
    removed: [...left].filter((value) => !right.has(value)).sort()
  };
}

export function compareConsentSnapshots(baseline = {}, observation = {}) {
  return {
    cookieNames: compareNames((baseline.cookies || []).map((cookie) => cookie.name), (observation.cookies || []).map((cookie) => cookie.name)),
    localStorageKeys: compareNames(baseline.storage?.localStorageKeys, observation.storage?.localStorageKeys),
    sessionStorageKeys: compareNames(baseline.storage?.sessionStorageKeys, observation.storage?.sessionStorageKeys),
    networkHosts: compareNames((baseline.networkObservations || []).map((item) => item.destinationHost), (observation.networkObservations || []).map((item) => item.destinationHost))
  };
}

const PAYMENT_FIELD_PATTERN = /(?:^|[_-])(card|cc|cvv|cvc|pan|expiry|expiration)(?:$|[_-])|cardnumber|cc-number|cc-csc|cc-exp/i;

export function normalizeSafeFormMetadata(form = {}, pageUrl = '') {
  const fields = Array.isArray(form.fields) ? form.fields : [];
  const inputTypes = normalizedSet(fields.map((field) => field.type || field.tagName));
  const autocompleteTokens = normalizedSet(fields.flatMap((field) => String(field.autocomplete || '').split(/\s+/)));
  let actionUrl = String(form.action || form.actionUrl || pageUrl || '');
  try { actionUrl = new URL(actionUrl || pageUrl, pageUrl).href; } catch {}
  return {
    actionUrl,
    method: String(form.method || 'GET').toUpperCase(),
    enctype: String(form.enctype || 'application/x-www-form-urlencoded').toLowerCase(),
    inputTypes,
    autocompleteTokens,
    fieldCount: fields.length || Number(form.fieldCount) || inputTypes.length,
    hasPasswordInput: fields.some((field) => String(field.type).toLowerCase() === 'password') || inputTypes.includes('password'),
    hasFileInput: fields.some((field) => String(field.type).toLowerCase() === 'file') || inputTypes.includes('file'),
    hasPaymentRelevantInput: fields.some((field) => PAYMENT_FIELD_PATTERN.test(`${field.name || ''} ${field.id || ''} ${field.autocomplete || ''}`))
  };
}

function coverageEntry(state, limitations = []) {
  return { state, limitations: normalizedSet(limitations) };
}

export function buildCollectionCoverage({ response = {}, tlsAnalysis = null, crawlEnabled = false, crawl = null, browserScan = {}, zapResult = {} } = {}) {
  const browserBase = browserScan.state === 'confirmed' ? 'completed' : browserScan.state === 'observed' ? 'partial' : browserScan.state || 'not_tested';
  const browserState = browserScan.networkCollection?.state === 'partial' && browserBase === 'completed' ? 'partial' : browserBase;
  const authentication = browserScan.authentication || {};
  const consentConfig = browserScan.consentTesting || {};
  const consentScenarios = browserScan.consentScenarios || [];
  const consentFailures = consentScenarios.filter((item) => item.state === 'failed_to_test');
  return {
    http: coverageEntry(response.status ? 'completed' : 'failed_to_test', response.status ? [] : ['Initial HTTP response was not collected.']),
    tls: coverageEntry(tlsAnalysis ? 'completed' : (() => { try { return new URL(response.finalUrl || response.requestedUrl || '').protocol === 'https:' ? 'failed_to_test' : 'not_tested'; } catch { return 'not_tested'; } })(), tlsAnalysis ? [] : ['TLS details were not applicable or not available.']),
    dns: coverageEntry(tlsAnalysis?.dnsCaa ? (tlsAnalysis.dnsCaa.error && !/No CAA records/i.test(tlsAnalysis.dnsCaa.error) ? 'partial' : 'completed') : 'not_tested', tlsAnalysis?.dnsCaa?.error ? [tlsAnalysis.dnsCaa.error] : []),
    crawl: coverageEntry(crawlEnabled ? (crawl?.collectionMetadata?.state || crawl?.state || (crawl ? 'completed' : 'failed_to_test')) : 'not_tested', crawl?.collectionMetadata?.limitations || crawl?.limitations || []),
    browser: coverageEntry(browserState, [...(browserScan.limitations || []), ...(browserScan.networkCollection?.limitations || [])]),
    authenticated: coverageEntry(!authentication.enabled ? 'not_tested' : authentication.state === 'confirmed' ? (browserScan.authenticatedCollection?.state || 'completed') : authentication.state === 'observed' ? (browserScan.authenticatedCollection?.state || 'partial') : 'failed_to_test', browserScan.authenticatedCollection?.limitations || (authentication.error ? [authentication.error] : [])),
    consent: coverageEntry(consentConfig.mode !== 'advanced' ? 'not_tested' : consentFailures.length ? (consentFailures.length === consentScenarios.length ? 'failed_to_test' : 'partial') : 'completed', consentFailures.map((item) => `${item.scenario}: ${item.error || 'Failed to test.'}`)),
    zapPassive: coverageEntry(!zapResult.enabled ? 'not_tested' : zapResult.collectionState || (zapResult.state === 'confirmed' ? 'completed' : zapResult.state === 'observed' ? 'partial' : 'failed_to_test'), zapResult.limitations || (zapResult.error ? [zapResult.error] : []))
  };
}
