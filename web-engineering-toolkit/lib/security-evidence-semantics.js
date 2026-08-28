const METHOD_ALIASES = new Map([
  ['http_response', 'http_response'],
  ['http_response_analysis', 'http_response'],
  ['http_response_header', 'http_response'],
  ['initial_http_response', 'http_response'],
  ['static_html_analysis', 'http_response'],
  ['tls_probe', 'tls_probe'],
  ['tls_handshake', 'tls_probe'],
  ['dns', 'dns'],
  ['dns_lookup', 'dns'],
  ['browser_runtime', 'browser_runtime'],
  ['headless_browser_runtime', 'browser_runtime'],
  ['browser_network', 'browser_runtime'],
  ['browser_cookie_snapshot', 'browser_runtime'],
  ['browser_storage_snapshot', 'browser_runtime'],
  ['browser_dom_observation', 'browser_runtime'],
  ['crawl', 'crawl'],
  ['bounded_public_crawl', 'crawl'],
  ['public_policy_text', 'crawl'],
  ['policy_runtime_comparison', 'crawl'],
  ['authenticated_browser', 'authenticated_browser'],
  ['bounded_authenticated_crawl', 'authenticated_browser'],
  ['authenticated_route_observation', 'authenticated_browser'],
  ['operator_input', 'operator_input'],
  ['operator_scope_input', 'operator_input'],
  ['zap_passive', 'zap_passive'],
  ['owasp_zap_alert', 'zap_passive'],
  ['manual', 'manual'],
  ['manual_reviewer_evidence', 'manual'],
  ['manual_review', 'manual'],
  ['artifact_only', 'artifact_only'],
  ['automated_scan_artifact', 'artifact_only']
]);

const COLLECTION_STATE_ALIASES = new Map([
  ['completed', 'completed'],
  ['confirmed', 'completed'],
  ['partial', 'partial'],
  ['observed', 'partial'],
  ['inferred', 'partial'],
  ['not_tested', 'not_tested'],
  ['not_assessed', 'not_tested'],
  ['failed_to_test', 'failed_to_test'],
  ['failed_to_assess', 'failed_to_test']
]);

const CONFIDENCE_ALIASES = new Map([
  ['high', 'high'],
  ['3', 'high'],
  ['medium', 'medium'],
  ['2', 'medium'],
  ['low', 'low'],
  ['1', 'low'],
  ['inferred', 'low'],
  ['asserted_not_verified', 'asserted_not_verified'],
  ['unknown', 'unknown'],
  ['not_assessed', 'unknown'],
  ['not_tested', 'unknown'],
  // Legacy completion labels deliberately do not become epistemic confidence.
  ['confirmed', 'unknown'],
  ['observed', 'unknown']
]);

const STRENGTH_ALIASES = new Map([
  ['direct', 'direct'],
  ['direct_observation', 'direct'],
  ['supporting', 'supporting'],
  ['supporting_technical', 'supporting'],
  ['policy_claim', 'supporting'],
  ['contextual', 'contextual'],
  ['runtime_observation', 'contextual'],
  ['scope_signal', 'scope_signal'],
  ['manual', 'manual'],
  ['manual_evidence', 'manual'],
  ['provenance_only', 'provenance_only'],
  ['not_applicable', 'provenance_only'],
  ['failed_to_test', 'unknown'],
  ['unknown', 'unknown']
]);

function normalizedKey(value) {
  return String(value || '').trim().toLowerCase().replace(/[\s-]+/g, '_');
}

export function normalizeCollectionMethod(value = '') {
  const key = normalizedKey(value);
  if (METHOD_ALIASES.has(key)) return METHOD_ALIASES.get(key);
  if (/zap/.test(key)) return 'zap_passive';
  if (/authenticated|auth_.*browser/.test(key)) return 'authenticated_browser';
  if (/browser|playwright|runtime/.test(key)) return 'browser_runtime';
  if (/crawl|policy|public_page/.test(key)) return 'crawl';
  if (/tls|certificate|ocsp/.test(key)) return 'tls_probe';
  if (/dns/.test(key)) return 'dns';
  if (/http|header|response|static_html/.test(key)) return 'http_response';
  if (/operator/.test(key)) return 'operator_input';
  if (/artifact|vault/.test(key)) return 'artifact_only';
  return 'manual';
}

export function normalizeCollectionState(value = '') {
  return COLLECTION_STATE_ALIASES.get(normalizedKey(value)) || 'not_tested';
}

export function normalizeEvidenceConfidence(value = '') {
  return CONFIDENCE_ALIASES.get(normalizedKey(value)) || 'unknown';
}

export function normalizeEvidenceStrength(value = '', { collectionMethod = '' } = {}) {
  if (normalizeCollectionMethod(collectionMethod) === 'artifact_only') return 'provenance_only';
  return STRENGTH_ALIASES.get(normalizedKey(value)) || 'unknown';
}

export function normalizeEvidenceRecord(record = {}, defaults = {}) {
  const legacyMethod = record.collectionMethod || record.sourceMethod || defaults.collectionMethod || defaults.sourceMethod || '';
  const legacyState = record.collectionState || record.testState || record.state || defaults.collectionState || defaults.testState || '';
  const legacyConfidence = record.evidenceConfidence || record.confidence || defaults.evidenceConfidence || defaults.confidence || '';
  const legacyStrength = record.normalizedEvidenceStrength || record.evidenceStrength || record.relationship || defaults.evidenceStrength || defaults.relationship || '';
  const collectionMethod = normalizeCollectionMethod(legacyMethod);
  const collectionState = normalizeCollectionState(legacyState);
  const evidenceConfidence = normalizeEvidenceConfidence(legacyConfidence);
  const normalizedEvidenceStrength = normalizeEvidenceStrength(legacyStrength, { collectionMethod });
  return {
    ...record,
    collectionMethod,
    collectionState,
    evidenceConfidence,
    normalizedEvidenceStrength,
    legacyTestState: record.legacyTestState || record.testState || record.state || '',
    legacyConfidence: record.legacyConfidence || record.confidence || '',
    legacyCollectionMethod: record.legacyCollectionMethod || legacyMethod,
    legacyEvidenceStrength: record.legacyEvidenceStrength || legacyStrength
  };
}

export function normalizeTraceabilityTuple(item = {}, context = {}) {
  const normalized = normalizeEvidenceRecord(item, context);
  const artifactRefs = [...new Set([...(item.artifactRefs || []), item.artifactId].filter(Boolean))];
  const itemSourceUrls = [...new Set([...(item.sourceUrls || []), item.sourceUrl].filter(Boolean))];
  const sourceUrls = itemSourceUrls.length ? itemSourceUrls : [context.sourceUrl].filter(Boolean);
  const mappingIds = [...new Set([...(item.mappingIds || []), ...(context.mappingIds || [])].filter(Boolean))];
  const limitations = [...new Set([...(item.limitations || []), ...(context.limitations || [])].filter(Boolean))];
  return {
    ...item,
    evidenceId: item.evidenceId || context.evidenceId || '',
    sourceUrl: sourceUrls[0] || '',
    sourceUrls,
    artifactId: artifactRefs[0] || '',
    artifactRefs,
    collectionMethod: normalized.collectionMethod,
    collectionState: normalized.collectionState,
    observedAt: item.observedAt || context.observedAt || '',
    confidence: normalized.evidenceConfidence,
    evidenceConfidence: normalized.evidenceConfidence,
    evidenceStrength: item.evidenceStrength || normalized.normalizedEvidenceStrength,
    normalizedEvidenceStrength: normalized.normalizedEvidenceStrength,
    limitations,
    sourceCheckId: item.sourceCheckId || context.sourceCheckId || '',
    mappingIds,
    legacyConfidence: normalized.legacyConfidence,
    legacyTestState: normalized.legacyTestState,
    legacyCollectionMethod: normalized.legacyCollectionMethod,
    legacyEvidenceStrength: normalized.legacyEvidenceStrength
  };
}

export function classifyNegativeObservation({ collectionState = '', negativeObserved = false, boundary = '', failedSources = [] } = {}) {
  const state = normalizeCollectionState(collectionState);
  const failures = [...new Set((failedSources || []).filter(Boolean))];
  if (state === 'failed_to_test') return { classification: 'failed_to_test', wording: 'Failed to test; no absence observation was produced.' };
  if (state === 'not_tested') return { classification: 'not_assessed', wording: 'Not assessed.' };
  if (state === 'partial' && failures.length && negativeObserved) {
    const source = boundary === 'static_html' ? 'static HTML' : boundary ? boundary.replace(/_/g, ' ') : 'completed source';
    return { classification: 'bounded_source_absence_with_failed_sources', wording: `No matching condition was observed in the bounded ${source} source; ${failures.join(', ').replace(/_/g, ' ')} failed to test.` };
  }
  if (state === 'partial') return { classification: 'partial_collection', wording: 'Partial collection completed; no full absence conclusion was produced.' };
  if (negativeObserved && boundary === 'bounded_crawl') return { classification: 'bounded_public_absence', wording: 'No matching public evidence was observed within the bounded crawl.' };
  if (negativeObserved) {
    const source = boundary === 'tested_response' ? 'tested response' : boundary ? boundary.replace(/_/g, ' ') : 'completed technical source';
    return { classification: 'actual_technical_absence', wording: `The condition was not observed in the ${source}.` };
  }
  return { classification: 'no_negative_observation', wording: 'No negative observation was asserted.' };
}
