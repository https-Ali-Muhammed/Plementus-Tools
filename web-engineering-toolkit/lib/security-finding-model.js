import crypto from 'node:crypto';
import { MAPPING_CATALOG_VERSION, evaluateMappingPrerequisites, frameworkForControl, mappingsForCheck } from './security-mapping-registry.js';

export const FINDING_SCHEMA_VERSION = '1.2.0';

const FINDING_IDS = {
  https: 'HTTPS_TRANSPORT_MISSING',
  'http-to-https': 'HTTP_TO_HTTPS_REDIRECT_MISSING',
  certificate: 'TLS_CERTIFICATE_VALIDATION_ISSUE',
  tls: 'TLS_CONFIGURATION_WEAK',
  hsts: 'HSTS_POLICY_WEAK',
  csp: 'CSP_POLICY_WEAK',
  clickjacking: 'CLICKJACKING_PROTECTION_MISSING',
  nosniff: 'MIME_SNIFFING_PROTECTION_MISSING',
  'referrer-policy': 'REFERRER_POLICY_WEAK',
  'permissions-policy': 'PERMISSIONS_POLICY_WEAK',
  cookies: 'COOKIE_SECURITY_ATTRIBUTES_MISSING',
  'runtime-cookies': 'RUNTIME_COOKIE_SECURITY_ATTRIBUTES_MISSING',
  cors: 'CORS_POLICY_PERMISSIVE',
  disclosure: 'TECHNOLOGY_DISCLOSURE_PRESENT',
  'mixed-content': 'MIXED_CONTENT_DETECTED',
  'password-transport': 'PASSWORD_TRANSPORT_INSECURE',
  'consent-behavior': 'TRACKING_BEFORE_CONSENT_OBSERVED',
  'privacy-runtime-consistency': 'PRIVACY_NOTICE_RUNTIME_CONTRADICTION',
  'privacy-runtime-verification': 'PRIVACY_NOTICE_RUNTIME_CLAIM_UNVERIFIED',
  'policy-document-quality': 'PUBLIC_POLICY_TEMPLATE_OR_PLACEHOLDER_DETECTED',
  'locale-policy-parity': 'PUBLIC_POLICY_LOCALE_DIFFERENCE_REVIEW_REQUIRED',
  'access-control-candidates': 'ADMIN_ROUTE_ACCESS_REVIEW_REQUIRED'
};

const IMPACTS = {
  https: 'Traffic can be observed or modified in transit when transport encryption is not enforced.',
  'http-to-https': 'Users following an HTTP link may remain exposed to interception or downgrade before reaching HTTPS.',
  certificate: 'Clients may be unable to authenticate the server or may receive certificate warnings that weaken trust.',
  tls: 'Legacy protocols or weak transport configuration can expose encrypted sessions to known downgrade or cryptographic attacks.',
  hsts: 'Without a durable HSTS policy, first visits and downgrade paths can remain vulnerable to SSL stripping.',
  csp: 'A missing or weak CSP reduces browser-side mitigation against script injection, framing, and unsafe resource loading.',
  clickjacking: 'Another site may be able to frame the application and trick users into unintended interactions.',
  nosniff: 'Browsers may interpret resources as a different content type, increasing script execution risk in some contexts.',
  'referrer-policy': 'Navigation may disclose more URL or origin information than intended to third parties.',
  'permissions-policy': 'Embedded or third-party content may receive browser feature access broader than the application requires.',
  cookies: 'Sensitive cookie values may be exposed to insecure transport, script access, or cross-site request contexts.',
  'runtime-cookies': 'Cookies created during browser execution may lack protections appropriate to their security role.',
  cors: 'An untrusted origin may be able to read responses or make credentialed cross-origin requests outside the intended trust boundary.',
  disclosure: 'Detailed technology information can make targeted reconnaissance easier.',
  'mixed-content': 'Insecure subresources on an HTTPS page can be blocked or modified in transit and can undermine page integrity.',
  'password-transport': 'Credentials submitted over HTTP can be intercepted or modified in transit.',
  'consent-behavior': 'Non-essential tracking initiated before the required user choice may conflict with privacy expectations or applicable consent requirements.',
  'privacy-runtime-consistency': 'A public privacy statement that conflicts with observed runtime behavior can prevent visitors and reviewers from understanding the actual data processing.',
  'privacy-runtime-verification': 'A publicly described consent interface was not observed in the bounded browser test, so visitors may not receive the choice described by the notice.',
  'policy-document-quality': 'Apparent template, placeholder, or draft language can make a public policy document incomplete or misleading without proving that the document is legally invalid.',
  'locale-policy-parity': 'Materially different public policy coverage between language variants can leave visitors with different information and requires a qualified content review.',
  'access-control-candidates': 'A non-admin role may be able to reach administration functionality outside its intended authorization boundary.'
};

const LOCAL_JURISDICTIONS = [
  { id: 'uae', label: 'United Arab Emirates', pattern: /\b(uae|united arab emirates)\b/i, controls: ['LOCAL-UAE-PDPL-FDL45-2021'] },
  { id: 'saudi-arabia', label: 'Saudi Arabia', pattern: /\b(saudi arabia|ksa|kingdom of saudi arabia)\b/i, controls: ['LOCAL-SA-PDPL'] },
  { id: 'egypt', label: 'Egypt', pattern: /\b(egypt|egyptian)\b/i, controls: ['LOCAL-EG-PDPL-LAW151-2020', 'LOCAL-EG-PDPL-ER816-2025'] }
];

const LOCAL_RELEVANT_CHECKS = new Set([
  'https', 'cookies', 'runtime-cookies', 'privacy', 'consent', 'consent-behavior',
  'privacy-runtime-consistency',
  'privacy-runtime-verification',
  'mixed-content', 'password-transport', 'evidence-privacy-page',
  'evidence-data-subject-rights', 'evidence-consent-management'
]);

function evidenceType(checkId) {
  if (checkId === 'dns-caa') return 'dns_observation';
  if (['certificate', 'tls'].includes(checkId)) return 'tls_observation';
  if (checkId === 'ocsp-stapling') return 'tls_observation';
  if (['hsts', 'csp', 'clickjacking', 'nosniff', 'referrer-policy', 'permissions-policy', 'cors', 'disclosure'].includes(checkId)) return 'http_header';
  if (checkId === 'cookies') return 'set_cookie_header';
  if (checkId === 'runtime-cookies') return 'browser_cookie_snapshot';
  if (['privacy-runtime-consistency', 'privacy-runtime-verification'].includes(checkId)) return 'policy_runtime_comparison';
  if (['policy-document-quality', 'locale-policy-parity'].includes(checkId)) return 'public_policy_text';
  if (['mixed-content', 'password-transport'].includes(checkId)) return 'browser_or_document_observation';
  return 'scan_observation';
}

function artifactId(checkId) {
  if (['certificate', 'tls'].includes(checkId)) return 'tls-analysis';
  if (checkId === 'runtime-cookies') return 'browser-cookies';
  if (checkId === 'mixed-content') return 'browser-network';
  if (checkId === 'consent-behavior') return 'browser-network';
  if (['privacy-runtime-consistency', 'privacy-runtime-verification'].includes(checkId)) return 'browser-network+crawl-pages';
  return 'initial-http-response';
}

export function resolveLocalJurisdictions(value = '') {
  const text = String(value || '');
  return LOCAL_JURISDICTIONS.filter((item) => item.pattern.test(text)).map(({ pattern, controls, ...item }) => item);
}

function mappingContext(selectedFrameworks, { applicability = {}, jurisdiction = '', paymentFlow = {} } = {}) {
  const jurisdictionMappings = LOCAL_RELEVANT_CHECKS.size && jurisdiction
    ? LOCAL_JURISDICTIONS.filter((item) => item.pattern.test(String(jurisdiction)))
    : [];
  return { selectedFrameworks, frameworkApplicability: applicability, jurisdiction, paymentFlow, jurisdictionMappings };
}

function controlMappingsFor(checkId, selectedFrameworks = [], options = {}) {
  if (options.jurisdiction && !LOCAL_RELEVANT_CHECKS.has(checkId)) options = { ...options, jurisdiction: '' };
  const context = mappingContext(selectedFrameworks, options);
  return mappingsForCheck(checkId, selectedFrameworks, context).map((mapping) => ({
    ...mapping,
    prerequisiteResults: evaluateMappingPrerequisites(mapping, context)
  }));
}

function fingerprintFor(parts) {
  return crypto.createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex');
}

function evidenceStrength(check) {
  if (check.testState === 'failed_to_test') return 'failed_to_test';
  if (['runtime-cookies', 'mixed-content', 'password-transport', 'consent-behavior'].includes(check.id)) return 'runtime_observation';
  if (['privacy-runtime-consistency', 'privacy-runtime-verification'].includes(check.id)) return 'runtime_observation';
  if (check.id === 'policy-document-quality') return 'direct_observation';
  if (['evidence-privacy-page', 'evidence-data-subject-rights', 'evidence-consent-management', 'locale-policy-parity'].includes(check.id)) return 'policy_claim';
  return 'direct_observation';
}

function sourceMethod(check) {
  if (check.id === 'dns-caa') return 'dns_lookup';
  if (check.id === 'cookies') return 'http_response_header';
  if (['certificate', 'tls', 'ocsp-stapling'].includes(check.id)) return 'tls_probe';
  if (check.id === 'runtime-cookies') return 'browser_runtime';
  if (['mixed-content', 'password-transport', 'consent-behavior'].includes(check.id)) return 'browser_runtime';
  if (['privacy-runtime-consistency', 'privacy-runtime-verification'].includes(check.id)) return 'policy_runtime_comparison';
  if (['policy-document-quality', 'locale-policy-parity'].includes(check.id)) return 'public_policy_text';
  return 'http_response_analysis';
}

function findingEvidence(check, observedAt = '') {
  const raw = [check.evidence, check.details].filter(Boolean).join(' | ') || check.summary;
  return {
    type: evidenceType(check.id),
    raw,
    artifactId: artifactId(check.id),
    evidenceType: evidenceType(check.id),
    evidenceStrength: evidenceStrength(check),
    sourceMethod: sourceMethod(check),
    sourceUrl: check.affectedUrl || '',
    observedAt,
    confidence: check.confidence || 'observed',
    limitations: [...(check.limitations || [])]
  };
}

function defaultMethod(check) {
  if (check.testMethod) return check.testMethod;
  if (['certificate', 'tls'].includes(check.id)) return 'TLS handshake and protocol probes';
  if (check.id === 'runtime-cookies') return 'Headless browser cookie snapshot';
  if (check.id === 'mixed-content') return 'Static HTML and headless browser network analysis';
  return 'HTTP response analysis';
}

function cookieSeverity(instance, missing) {
  if (instance.category === 'session-or-auth') {
    if (missing === 'HttpOnly') return 'high';
    if (missing === 'SameSite' && String(instance.effectiveSameSiteObserved || '').toLowerCase() === 'lax' && !instance.unsafeCrossSiteConditionObserved) return 'low';
    return 'medium';
  }
  return instance.category === 'tracking-analytics' ? 'low' : 'informational';
}

function cookieImpact(instance, missing) {
  if (instance.category === 'session-or-auth') {
    if (missing === 'Secure') return 'A session cookie may be transmitted over an unencrypted first request or downgrade path before HTTPS/HSTS protection applies.';
    if (missing === 'HttpOnly') return 'Client-side script access to a session cookie can increase the impact of a successful script-injection attack.';
    return 'An implicit or missing SameSite policy can make cross-site request behavior less predictable and harder to audit.';
  }
  if (instance.category === 'tracking-analytics') return 'The tracking cookie is missing a recommended transport or cross-site attribute; consent, disclosure, and purpose remain the primary privacy considerations.';
  return 'The preference cookie is missing a recommended hardening attribute; no sensitive value was established by the scan.';
}

function mergeEvidence(left = [], right = []) {
  const seen = new Set();
  return [...left, ...right].filter((item) => {
    const key = `${item?.type || ''}|${item?.raw || ''}|${item?.artifactId || ''}|${item?.sourceUrl || ''}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function normalizedPrerequisiteKey(mapping = {}) {
  const results = (mapping.prerequisiteResults || []).map((item) => `${String(item.prerequisite || '').trim().toLowerCase()}:${String(item.state || '').trim().toLowerCase()}`);
  const declared = (mapping.prerequisites || []).map((item) => `${String(item || '').trim().toLowerCase()}:`);
  return [...new Set(results.length ? results : declared)].sort().join('|');
}

export function semanticMappingKey(mapping = {}) {
  return [mapping.framework, mapping.frameworkVersion, mapping.controlId, mapping.relationship, normalizedPrerequisiteKey(mapping)]
    .map((value) => String(value || '').trim().toLowerCase())
    .join('|');
}

export function mergeSemanticMappings(mappings = []) {
  const merged = new Map();
  for (const mapping of mappings.filter(Boolean)) {
    const key = semanticMappingKey(mapping);
    const prior = merged.get(key);
    const sourceCheckIds = [...new Set([
      ...(prior?.sourceCheckIds || []), prior?.checkId,
      ...(mapping.sourceCheckIds || []), mapping.checkId
    ].filter(Boolean))];
    const sourceMappingIds = [...new Set([
      ...(prior?.sourceMappingIds || []), prior?.mappingId,
      ...(mapping.sourceMappingIds || []), mapping.mappingId
    ].filter(Boolean))];
    merged.set(key, {
      ...(prior || mapping),
      evidenceTypes: [...new Set([...(prior?.evidenceTypes || []), ...(mapping.evidenceTypes || [])])],
      limitations: [...new Set([...(prior?.limitations || []), ...(mapping.limitations || [])])],
      sourceCheckIds,
      sourceMappingIds
    });
  }
  return [...merged.values()];
}

export function mergeFindingsByFingerprint(findings = []) {
  const merged = new Map();
  for (const finding of findings) {
    const prior = merged.get(finding.fingerprint);
    if (!prior) {
      merged.set(finding.fingerprint, { ...finding, evidenceItems: mergeEvidence(finding.evidenceItems || [], finding.evidence ? [finding.evidence] : []) });
      continue;
    }
    const evidenceItems = mergeEvidence(prior.evidenceItems || [], finding.evidenceItems || (finding.evidence ? [finding.evidence] : []));
    merged.set(finding.fingerprint, {
      ...prior,
      evidenceItems,
      evidence: {
        type: [...new Set(evidenceItems.map((item) => item.type).filter(Boolean))].join('+'),
        evidenceType: [...new Set(evidenceItems.map((item) => item.evidenceType || item.type).filter(Boolean))].join('+'),
        evidenceStrength: evidenceItems.some((item) => item.evidenceStrength === 'direct_observation') ? 'direct_observation' : evidenceItems.some((item) => item.evidenceStrength === 'runtime_observation') ? 'runtime_observation' : evidenceItems[0]?.evidenceStrength || 'contextual',
        sourceMethod: [...new Set(evidenceItems.map((item) => item.sourceMethod).filter(Boolean))].join('+'),
        sourceUrl: [...new Set(evidenceItems.map((item) => item.sourceUrl).filter(Boolean))].join(' | '),
        observedAt: evidenceItems.map((item) => item.observedAt).filter(Boolean).sort().at(-1) || '',
        confidence: evidenceItems.some((item) => item.confidence === 'confirmed') ? 'confirmed' : evidenceItems[0]?.confidence || 'observed',
        limitations: [...new Set(evidenceItems.flatMap((item) => item.limitations || []))],
        raw: evidenceItems.map((item) => item.raw).filter(Boolean).join(' | '),
        artifactId: [...new Set(evidenceItems.map((item) => item.artifactId).filter(Boolean))].join('+')
      },
      controls: [...new Set([...(prior.controls || []), ...(finding.controls || [])])],
      controlMappings: mergeSemanticMappings([...(prior.controlMappings || []), ...(finding.controlMappings || [])]),
      limitations: [...new Set([...(prior.limitations || []), ...(finding.limitations || [])])],
      testMethod: [...new Set([prior.testMethod, finding.testMethod].filter(Boolean))].join(' + '),
      sourceCheckIds: [...new Set([...(prior.sourceCheckIds || [prior.sourceCheckId]), ...(finding.sourceCheckIds || [finding.sourceCheckId])].filter(Boolean))]
    });
  }
  return [...merged.values()];
}

export function buildFindings(checks = [], { generatedAt, toolVersion, frameworks = [], frameworkApplicability = {}, jurisdiction = '', paymentFlow = {} } = {}) {
  const observedAt = generatedAt || new Date().toISOString();
  const findings = [];
  for (const check of checks) {
    if (['cookies', 'runtime-cookies'].includes(check.id) && (check.instances || []).length) {
      for (const instance of check.instances) {
        for (const missing of instance.missing || []) {
          const normalizedAttribute = missing.toUpperCase().replace(/[^A-Z0-9]+/g, '_');
          const normalizedCategory = instance.category === 'session-or-auth' ? 'SESSION' : instance.category === 'tracking-analytics' ? 'TRACKING' : instance.category === 'functional-preference' ? 'PREFERENCE' : 'UNCLASSIFIED';
          const id = `COOKIE_${normalizedCategory}_${normalizedAttribute}_MISSING`;
          const severity = cookieSeverity(instance, missing);
          const controlMappings = controlMappingsFor(check.id, frameworks, { applicability: frameworkApplicability, jurisdiction, paymentFlow });
          const controls = [...new Set(controlMappings.map((mapping) => mapping.controlId))];
          const rawEvidence = { type: check.id === 'cookies' ? 'set_cookie_header' : 'browser_cookie_snapshot', raw: instance.raw, artifactId: artifactId(check.id), evidenceType: check.id === 'cookies' ? 'http_response_header' : 'browser_runtime', evidenceStrength: check.id === 'cookies' ? 'direct_observation' : 'runtime_observation', sourceMethod: check.id === 'cookies' ? 'http_response_header' : 'browser_runtime', sourceUrl: check.affectedUrl || '', observedAt, confidence: check.confidence || 'observed', limitations: [...(check.limitations || [])], configuredSameSite: instance.configuredSameSite ?? null, effectiveSameSiteObserved: instance.effectiveSameSiteObserved || 'not_assessed' };
          findings.push({
            schemaVersion: FINDING_SCHEMA_VERSION,
            id,
            fingerprint: fingerprintFor([id, check.affectedUrl, instance.name]),
            title: `${instance.name} cookie missing ${missing}`,
            category: check.category,
            severity,
            confidence: check.confidence || (check.testState === 'confirmed' ? 'confirmed' : 'observed'),
            status: 'open',
            affectedUrl: check.affectedUrl || '',
            evidence: rawEvidence,
            impact: cookieImpact(instance, missing),
            recommendation: `Configure the ${instance.name} cookie with an appropriate ${missing} attribute.`,
            references: [...(check.references || [])],
            controls,
            controlMappings,
            mappingApplicability: Object.fromEntries(frameworks.map((framework) => [framework, frameworkApplicability[framework] || 'selected_for_mapping'])),
            firstSeen: observedAt,
            lastSeen: observedAt,
            testMethod: defaultMethod(check),
            toolVersion: toolVersion || 'unknown',
            limitations: [`Cookie purpose was inferred as ${instance.category} from its name and attributes; confirm the server-side use manually.`, ...(check.limitations || [])],
            source: 'native',
            sourceCheckId: check.id
          });
        }
      }
      continue;
    }
    if (!['fail', 'warning'].includes(check.status)) continue;
      const id = FINDING_IDS[check.id] || `${String(check.id || 'SCAN').toUpperCase().replace(/[^A-Z0-9]+/g, '_')}_ISSUE`;
      const evidence = findingEvidence(check, observedAt);
      const controlMappings = controlMappingsFor(check.id, frameworks, { applicability: frameworkApplicability, jurisdiction, paymentFlow });
      findings.push({
        schemaVersion: FINDING_SCHEMA_VERSION,
        id,
        fingerprint: fingerprintFor([id, check.affectedUrl, evidence.raw]),
        title: check.title,
        category: check.category,
        severity: check.severity || 'informational',
        confidence: check.confidence || (check.testState === 'confirmed' ? 'confirmed' : 'observed'),
        status: 'open',
        affectedUrl: check.affectedUrl || '',
        evidence,
        impact: IMPACTS[check.id] || 'The observed condition may weaken the security or privacy posture of the assessed target.',
        recommendation: check.recommendation || 'Review the evidence and remediate the underlying condition.',
        references: [...(check.references || [])],
        controls: [...new Set(controlMappings.map((mapping) => mapping.controlId))],
        controlMappings,
        mappingApplicability: Object.fromEntries(frameworks.map((framework) => [framework, frameworkApplicability[framework] || 'selected_for_mapping'])),
        firstSeen: observedAt,
        lastSeen: observedAt,
        testMethod: defaultMethod(check),
        toolVersion: toolVersion || 'unknown',
        limitations: [...(check.limitations || [])],
        source: 'native',
        sourceCheckId: check.id
      });
  }
  return mergeFindingsByFingerprint(findings);
}

export function buildTestResults(checks = [], { generatedAt = '' } = {}) {
  return checks.map((check) => ({
    id: check.id,
    title: check.title,
    category: check.category,
    outcome: check.status,
    state: check.testState || 'observed',
    stateLabel: check.testStateLabel || '',
    confidence: check.confidence || 'observed',
    affectedUrl: check.affectedUrl || '',
    summary: check.summary,
    testMethod: defaultMethod(check),
    evidence: findingEvidence(check, generatedAt || new Date().toISOString()),
    evidenceItems: (check.evidenceItems || []).map((item) => ({ ...item, limitations: [...(item.limitations || [])] })),
    limitations: [...(check.limitations || [])]
  }));
}

export function buildControlEvaluations(checks = [], findings = [], selectedFrameworks = [], { frameworkApplicability = {}, jurisdiction = '', evidenceLevel = 'public_url', paymentFlow = {} } = {}) {
  const records = new Map();
  for (const check of checks) {
    const mappings = controlMappingsFor(check.id, selectedFrameworks, { applicability: frameworkApplicability, jurisdiction, paymentFlow });
    for (const mapping of mappings) {
      if (!records.has(mapping.controlId)) records.set(mapping.controlId, { controlId: mapping.controlId, evidence: [], findingIds: [], mappings: [] });
      records.get(mapping.controlId).evidence.push({ check, mapping });
      records.get(mapping.controlId).mappings.push(mapping);
    }
  }
  for (const finding of findings) {
    for (const mapping of finding.controlMappings || []) {
      if (!records.has(mapping.controlId)) records.set(mapping.controlId, { controlId: mapping.controlId, evidence: [], findingIds: [], mappings: [] });
      records.get(mapping.controlId).findingIds.push(finding.id);
    }
  }
  return [...records.values()].map((record) => {
    const failed = record.evidence.some(({ check }) => check.testState === 'failed_to_test');
    const notTested = record.evidence.every(({ check }) => ['not_tested', 'failed_to_test'].includes(check.testState));
    const classified = record.evidence.map(({ check, mapping }) => {
      const prerequisitesMet = (mapping.prerequisiteResults || []).every((item) => item.state === 'met');
      const hasPrerequisiteUncertainty = (mapping.prerequisiteResults || []).some((item) => ['unknown', 'requires_manual_confirmation'].includes(item.state));
      const adverse = ['fail', 'warning'].includes(check.status);
      let evidenceState = 'manual_review_required';
      if (check.testState === 'failed_to_test') evidenceState = 'failed_to_test';
      else if (check.id === 'privacy-runtime-verification' && check.status === 'warning') evidenceState = 'claim_not_verified';
      else if (check.id === 'privacy-runtime-consistency' && adverse) evidenceState = 'potential_claim_runtime_mismatch';
      else if (adverse && mapping.relationship === 'direct' && (!mapping.prerequisites.length || prerequisitesMet)) evidenceState = 'adverse_technical_evidence_observed';
      else if (adverse && mapping.relationship === 'supporting' && (!mapping.prerequisites.length || prerequisitesMet)) evidenceState = 'supporting_technical_evidence_observed';
      else if (adverse && (['contextual', 'scope_signal'].includes(mapping.relationship) || hasPrerequisiteUncertainty)) evidenceState = 'contextual_evidence_observed';
      else if (!adverse && mapping.evidenceTypes.includes('policy_claim') && ['pass', 'info'].includes(check.status)) evidenceState = 'policy_claim_observed';
      else if (check.status === 'pass' && mapping.relationship === 'supporting') evidenceState = 'supporting_technical_evidence_observed';
      else if (check.status === 'pass' && mapping.relationship === 'contextual') evidenceState = 'contextual_evidence_observed';
      else if (check.status === 'pass' || check.testState === 'confirmed') evidenceState = 'partial_technical_evidence_observed';
      return { check, mapping, evidenceState };
    });
    const precedence = ['adverse_technical_evidence_observed', 'potential_claim_runtime_mismatch', 'claim_not_verified', 'supporting_technical_evidence_observed', 'contextual_evidence_observed', 'policy_claim_observed', 'partial_technical_evidence_observed', 'manual_review_required', 'not_assessed', 'failed_to_test'];
    const state = notTested ? (failed ? 'failed_to_test' : 'not_assessed') : precedence.find((candidate) => classified.some((item) => item.evidenceState === candidate)) || 'manual_review_required';
    const framework = frameworkForControl(record.controlId);
    return {
      controlId: record.controlId,
      state,
      controlSatisfaction: 'not_determined',
      coverage: 'partial',
      evidenceLevel,
      frameworkApplicability: frameworkApplicability[framework] || 'selected_for_mapping',
      mappingCatalogVersion: MAPPING_CATALOG_VERSION,
      automatedEvidence: classified.map(({ check, mapping, evidenceState }) => ({ checkId: check.id, outcome: check.status, testState: check.testState, artifactId: artifactId(check.id), evidenceType: evidenceStrength(check), relationship: mapping.relationship, strength: mapping.relationship === 'direct' ? 'direct_observation' : mapping.relationship === 'supporting' ? 'supporting_technical' : 'contextual', evidenceState, mappingId: mapping.mappingId, prerequisites: mapping.prerequisiteResults })),
      mappings: mergeSemanticMappings(record.mappings),
      linkedFindings: [...new Set(record.findingIds)],
      manualReviewRequired: true,
      limitations: [...new Set(['Automated evidence covers only the observed technical portion of this control. Control satisfaction, organizational implementation, scope completeness, and operating effectiveness were not determined.', ...record.mappings.flatMap((mapping) => mapping.limitations || [])])]
    };
  });
}
