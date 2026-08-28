import crypto from 'node:crypto';
import { MAPPING_CATALOG_VERSION, evaluateMappingPrerequisites, frameworkForControl, mappingsForCheck } from './security-mapping-registry.js';
import { normalizeCollectionMethod, normalizeCollectionState, normalizeEvidenceConfidence, normalizeEvidenceStrength, normalizeTraceabilityTuple } from './security-evidence-semantics.js';
import { controlManualReviewReasons } from './security-compliance-semantics.js';

export const FINDING_SCHEMA_VERSION = '1.4.0';

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
  {
    id: 'uae', label: 'United Arab Emirates', pattern: /\b(uae|united arab emirates)\b/i,
    mappingStatus: 'manual_legal_mapping_required',
    rationale: 'The official instrument is identified, but no current scanner check has a provision-level relationship approved for automated candidate mapping.',
    instruments: [{ instrumentId: 'UAE-FDL-45-2021', officialName: 'Federal Decree-Law No. 45 of 2021 Concerning the Protection of Personal Data', versionDate: '2021-09-20', sourceCitation: 'https://www.uaelegislation.gov.ae/en/legislations/1972/download' }]
  },
  {
    id: 'saudi-arabia', label: 'Saudi Arabia', pattern: /\b(saudi arabia|ksa|kingdom of saudi arabia)\b/i,
    mappingStatus: 'manual_legal_mapping_required',
    rationale: 'The official instrument is identified, but no current scanner check has a provision-level relationship approved for automated candidate mapping.',
    instruments: [{ instrumentId: 'SA-PDPL-RD-M19-1443', officialName: 'Personal Data Protection Law issued by Royal Decree No. M/19, as amended', versionDate: '2023-09-14', sourceCitation: 'https://dgp.sdaia.gov.sa/wps/portal/pdp/knowledgecenter/details/PDPL' }]
  },
  {
    id: 'egypt', label: 'Egypt', pattern: /\b(egypt|egyptian)\b/i,
    mappingStatus: 'manual_legal_mapping_required',
    rationale: 'The official instruments are identified, but no current scanner check has a provision-level relationship approved for automated candidate mapping.',
    instruments: [
      { instrumentId: 'EG-PDPL-LAW-151-2020', officialName: 'Personal Data Protection Law No. 151 of 2020', versionDate: '2020', sourceCitation: 'https://pdpc.gov.eg/' },
      { instrumentId: 'EG-PDPL-ER-816-2025', officialName: 'Executive Regulations No. 816 of 2025', versionDate: '2025', sourceCitation: 'https://pdpc.gov.eg/' }
    ]
  }
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
  if (['certificate', 'tls', 'ocsp-stapling', 'dns-caa'].includes(checkId)) return 'tls-analysis';
  if (checkId === 'runtime-cookies') return 'browser-cookies';
  if (checkId === 'mixed-content') return 'browser-network';
  if (checkId === 'consent-behavior') return 'browser-network';
  if (['privacy-runtime-consistency', 'privacy-runtime-verification', 'policy-document-quality', 'locale-policy-parity'].includes(checkId)) return 'crawl-pages';
  if (checkId === 'access-control-candidates') return 'authenticated-pages';
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

function normalizedCookieIdentity(instance = {}, affectedUrl = '', missing = '') {
  let testedOrigin = '';
  let defaultDomain = '';
  try {
    const parsed = new URL(affectedUrl);
    testedOrigin = parsed.origin.toLowerCase();
    defaultDomain = parsed.hostname.toLowerCase();
  } catch {}
  const suppliedDomain = String(instance.domain || '').trim().toLowerCase();
  const domain = (suppliedDomain || defaultDomain).replace(/^\.+/, '');
  const hostOnly = typeof instance.hostOnly === 'boolean' ? instance.hostOnly : suppliedDomain ? !suppliedDomain.startsWith('.') : true;
  const cookiePath = String(instance.path || '/').trim() || '/';
  return {
    name: String(instance.name || 'cookie'),
    domain,
    domainScope: hostOnly ? 'host_only' : 'domain',
    hostOnly,
    path: cookiePath.startsWith('/') ? cookiePath : `/${cookiePath}`,
    missingAttribute: String(missing || ''),
    testedOrigin
  };
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

function normalizedEvidenceItems(check, observedAt = '', defaultSourceUrl = '', context = {}) {
  return (check.evidenceItems || []).map((item, index) => {
    const raw = item.raw || item.evidenceText || item.excerpt || check.summary || '';
    const sourceUrls = [...new Set([...(item.sourceUrls || []), item.sourceUrl].filter(Boolean))];
    const artifactRefs = [...new Set([...(item.artifactRefs || []), item.artifactId].filter(Boolean))];
    const evidenceId = item.evidenceId || `evidence_${fingerprintFor([check.id, sourceUrls[0], artifactRefs[0], raw, index]).slice(0, 20)}`;
    return normalizeTraceabilityTuple({
      ...item,
      evidenceId,
      type: item.type || item.evidenceType || evidenceType(check.id),
      raw,
      artifactId: artifactRefs[0] || '',
      artifactRefs,
      evidenceType: item.evidenceType || item.type || evidenceType(check.id),
      evidenceStrength: item.evidenceStrength || evidenceStrength(check),
      collectionMethod: item.collectionMethod || item.sourceMethod || sourceMethod(check),
      collectionState: item.collectionState || check.collectionState || check.testState,
      sourceMethod: item.sourceMethod || item.collectionMethod || sourceMethod(check),
      sourceUrl: sourceUrls[0] || check.affectedUrl || defaultSourceUrl || '',
      sourceUrls: sourceUrls.length ? sourceUrls : [check.affectedUrl || defaultSourceUrl].filter(Boolean),
      observedAt: item.observedAt || observedAt,
      confidence: item.confidence || check.evidenceConfidence || check.confidence || 'observed',
      limitations: [...new Set([...(item.limitations || []), ...(check.limitations || [])])]
    }, { sourceCheckId: check.id, mappingIds: context.mappingIds || [], observedAt, sourceUrl: check.affectedUrl || defaultSourceUrl || '' });
  });
}

function findingEvidence(check, observedAt = '', defaultSourceUrl = '') {
  const structured = normalizedEvidenceItems(check, observedAt, defaultSourceUrl);
  if (structured.length) return structured[0];
  const raw = [check.evidence, check.details].filter(Boolean).join(' | ') || check.summary;
  const resolvedArtifactId = artifactId(check.id);
  const resolvedSourceUrl = check.affectedUrl || defaultSourceUrl || '';
  return normalizeTraceabilityTuple({
    evidenceId: `evidence_${fingerprintFor([check.id, resolvedSourceUrl, resolvedArtifactId, raw]).slice(0, 20)}`,
    type: evidenceType(check.id),
    raw,
    artifactId: resolvedArtifactId,
    artifactRefs: [resolvedArtifactId],
    evidenceType: evidenceType(check.id),
    evidenceStrength: evidenceStrength(check),
    collectionMethod: sourceMethod(check),
    collectionState: check.collectionState || check.testState,
    sourceMethod: sourceMethod(check),
    sourceUrl: resolvedSourceUrl,
    sourceUrls: [resolvedSourceUrl].filter(Boolean),
    observedAt,
    confidence: check.evidenceConfidence || check.confidence || 'observed',
    limitations: [...(check.limitations || [])]
  }, { sourceCheckId: check.id, observedAt, sourceUrl: resolvedSourceUrl });
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
    const key = item?.evidenceId || `${item?.type || ''}|${item?.raw || ''}|${item?.artifactId || ''}|${item?.sourceUrl || ''}`;
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
    const governanceRecord = (item = {}) => ({
      mappingId: item.mappingId,
      checkId: item.checkId,
      framework: item.framework,
      controlId: item.controlId,
      relationship: item.relationship,
      rationale: item.rationale || '',
      sourceVersion: item.sourceVersion || item.frameworkVersion || '',
      sourceCitation: item.sourceCitation || '',
      reviewStatus: item.reviewStatus || '',
      lastReviewedAt: item.lastReviewedAt || '',
      reviewedBy: item.reviewedBy || '',
      changeReason: item.changeReason || '',
      approvedBy: item.approvedBy ?? null,
      approvalDate: item.approvalDate ?? null,
      mappingVersion: item.mappingVersion || ''
    });
    const sourceGovernance = [...new Map([
      ...(prior?.sourceGovernance || (prior ? [governanceRecord(prior)] : [])),
      ...(mapping.sourceGovernance || [governanceRecord(mapping)])
    ].map((item) => [item.mappingId, item])).values()];
    merged.set(key, {
      ...(prior || mapping),
      evidenceTypes: [...new Set([...(prior?.evidenceTypes || []), ...(mapping.evidenceTypes || [])])],
      limitations: [...new Set([...(prior?.limitations || []), ...(mapping.limitations || [])])],
      sourceCheckIds,
      sourceMappingIds,
      sourceGovernance
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
    const artifactRefs = [...new Set(evidenceItems.flatMap((item) => item.artifactRefs || [item.artifactId]).filter(Boolean))];
    const sourceUrls = [...new Set(evidenceItems.flatMap((item) => item.sourceUrls || [item.sourceUrl]).filter(Boolean))];
    const primaryEvidence = evidenceItems[0] || prior.evidence || finding.evidence || {};
    merged.set(finding.fingerprint, {
      ...prior,
      evidenceItems,
      evidence: {
        ...primaryEvidence,
        type: primaryEvidence.type || evidenceItems[0]?.evidenceType || '',
        evidenceType: primaryEvidence.evidenceType || primaryEvidence.type || '',
        evidenceStrength: evidenceItems.some((item) => item.evidenceStrength === 'direct_observation') ? 'direct_observation' : evidenceItems.some((item) => item.evidenceStrength === 'runtime_observation') ? 'runtime_observation' : evidenceItems[0]?.evidenceStrength || 'contextual',
        sourceMethod: primaryEvidence.sourceMethod || '',
        sourceUrl: sourceUrls[0] || '',
        sourceUrls,
        observedAt: evidenceItems.map((item) => item.observedAt).filter(Boolean).sort().at(-1) || '',
        confidence: evidenceItems.some((item) => item.confidence === 'confirmed') ? 'confirmed' : evidenceItems[0]?.confidence || 'observed',
        limitations: [...new Set(evidenceItems.flatMap((item) => item.limitations || []))],
        raw: evidenceItems.map((item) => item.raw).filter(Boolean).join(' | '),
        artifactId: artifactRefs[0] || '',
        artifactRefs
      },
      affectedUrl: prior.affectedUrl || finding.affectedUrl || sourceUrls[0] || '',
      artifactRefs,
      sourceUrls,
      controls: [...new Set([...(prior.controls || []), ...(finding.controls || [])])],
      controlMappings: mergeSemanticMappings([...(prior.controlMappings || []), ...(finding.controlMappings || [])]),
      limitations: [...new Set([...(prior.limitations || []), ...(finding.limitations || [])])],
      testMethod: [...new Set([prior.testMethod, finding.testMethod].filter(Boolean))].join(' + '),
      sourceCheckIds: [...new Set([...(prior.sourceCheckIds || [prior.sourceCheckId]), ...(finding.sourceCheckIds || [finding.sourceCheckId])].filter(Boolean))],
      fingerprintAliases: [...new Set([...(prior.fingerprintAliases || []), prior.legacyFingerprint, ...(finding.fingerprintAliases || []), finding.legacyFingerprint].filter(Boolean))]
    });
  }
  return [...merged.values()];
}

export function buildFindings(checks = [], { generatedAt, toolVersion, frameworks = [], frameworkApplicability = {}, jurisdiction = '', paymentFlow = {}, defaultSourceUrl = '' } = {}) {
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
          const cookieArtifactId = artifactId(check.id);
          const cookieSourceUrl = check.affectedUrl || defaultSourceUrl || '';
          const cookieIdentity = normalizedCookieIdentity(instance, cookieSourceUrl, missing);
          const canonicalFingerprint = fingerprintFor([id, cookieIdentity.testedOrigin, cookieIdentity.name, cookieIdentity.domainScope, cookieIdentity.domain, cookieIdentity.path, cookieIdentity.missingAttribute]);
          const legacyFingerprint = fingerprintFor([id, check.affectedUrl, instance.name]);
          const rawEvidence = normalizeTraceabilityTuple({ evidenceId: `evidence_${fingerprintFor([check.id, cookieSourceUrl, cookieArtifactId, cookieIdentity.name, cookieIdentity.domainScope, cookieIdentity.domain, cookieIdentity.path, missing]).slice(0, 20)}`, type: check.id === 'cookies' ? 'set_cookie_header' : 'browser_cookie_snapshot', raw: instance.raw, artifactId: cookieArtifactId, artifactRefs: [cookieArtifactId], evidenceType: check.id === 'cookies' ? 'http_response_header' : 'browser_runtime', evidenceStrength: check.id === 'cookies' ? 'direct_observation' : 'runtime_observation', collectionMethod: check.id === 'cookies' ? 'http_response_header' : 'browser_runtime', collectionState: check.collectionState || check.testState, sourceMethod: check.id === 'cookies' ? 'http_response_header' : 'browser_runtime', sourceUrl: cookieSourceUrl, sourceUrls: [cookieSourceUrl].filter(Boolean), observedAt, confidence: check.evidenceConfidence || check.confidence || 'observed', limitations: [...(check.limitations || [])], configuredSameSite: instance.configuredSameSite ?? null, effectiveSameSiteObserved: instance.effectiveSameSiteObserved || 'not_assessed', cookieIdentity }, { sourceCheckId: check.id, mappingIds: controlMappings.map((mapping) => mapping.mappingId) });
          findings.push({
            schemaVersion: FINDING_SCHEMA_VERSION,
            id,
            fingerprint: canonicalFingerprint,
            canonicalFingerprint,
            legacyFingerprint,
            fingerprintAliases: [legacyFingerprint],
            cookieIdentity,
            title: `${instance.name} cookie missing ${missing}`,
            category: check.category,
            severity,
            confidence: check.confidence || (check.testState === 'confirmed' ? 'confirmed' : 'observed'),
            legacyConfidence: check.legacyConfidence || check.confidence || check.testState || '',
            evidenceConfidence: normalizeEvidenceConfidence(check.evidenceConfidence || check.confidence || 'unknown'),
            status: 'open',
            affectedUrl: cookieSourceUrl,
            evidence: rawEvidence,
            evidenceItems: [rawEvidence],
            artifactRefs: [cookieArtifactId],
            sourceUrls: [cookieSourceUrl].filter(Boolean),
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
      const controlMappings = controlMappingsFor(check.id, frameworks, { applicability: frameworkApplicability, jurisdiction, paymentFlow });
      const mappingIds = controlMappings.map((mapping) => mapping.mappingId);
      const structuredEvidence = normalizedEvidenceItems(check, observedAt, defaultSourceUrl, { mappingIds });
      const evidence = structuredEvidence[0] || normalizeTraceabilityTuple(findingEvidence(check, observedAt, defaultSourceUrl), { sourceCheckId: check.id, mappingIds });
      const evidenceItems = structuredEvidence.length ? structuredEvidence : [evidence];
      const artifactRefs = [...new Set(evidenceItems.flatMap((item) => item.artifactRefs || [item.artifactId]).filter(Boolean))];
      const sourceUrls = [...new Set(evidenceItems.flatMap((item) => item.sourceUrls || [item.sourceUrl]).filter(Boolean))];
      const affectedUrl = sourceUrls[0] || check.affectedUrl || defaultSourceUrl || '';
      findings.push({
        schemaVersion: FINDING_SCHEMA_VERSION,
        id,
        fingerprint: fingerprintFor([id, affectedUrl, evidence.raw]),
        title: check.title,
        category: check.category,
        severity: check.severity || 'informational',
        confidence: check.confidence || (check.testState === 'confirmed' ? 'confirmed' : 'observed'),
        legacyConfidence: check.legacyConfidence || check.confidence || check.testState || '',
        evidenceConfidence: normalizeEvidenceConfidence(check.evidenceConfidence || check.confidence || 'unknown'),
        status: 'open',
        affectedUrl,
        evidence,
        evidenceItems,
        artifactRefs,
        sourceUrls,
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
  return checks.map((check) => {
    const collectionMethod = normalizeCollectionMethod(check.collectionMethod || check.testMethod || sourceMethod(check));
    const collectionState = normalizeCollectionState(check.collectionState || check.testState || 'observed');
    const evidenceConfidence = normalizeEvidenceConfidence(check.evidenceConfidence || check.confidence || 'unknown');
    return ({
    id: check.id,
    title: check.title,
    category: check.category,
    outcome: check.status,
    state: check.testState || 'observed',
    collectionState,
    stateLabel: check.testStateLabel || '',
    confidence: check.confidence || 'observed',
    evidenceConfidence,
    collectionMethod,
    affectedUrl: check.affectedUrl || '',
    summary: check.summary,
    testMethod: defaultMethod(check),
    evidence: findingEvidence(check, generatedAt || new Date().toISOString()),
    evidenceItems: normalizedEvidenceItems(check, generatedAt || new Date().toISOString()),
    limitations: [...(check.limitations || [])]
    });
  });
}

export function validateFindingProvenance(findings = [], evidenceManifest = {}) {
  const resolvableArtifactIds = new Set((evidenceManifest.artifacts || []).flatMap((artifact) => [artifact.id, ...(artifact.roles || []), ...(artifact.aliases || []).map((alias) => alias.id)].filter(Boolean)));
  const errors = [];
  for (const finding of findings) {
    const hasStructuredEvidence = Boolean(finding.evidenceItems?.length);
    const evidenceItems = hasStructuredEvidence ? finding.evidenceItems : finding.evidence ? [finding.evidence] : [];
    const evidenceIds = new Set();
    for (const item of evidenceItems) {
      if (hasStructuredEvidence && !item.evidenceId) errors.push(`${finding.id}: evidence item is missing evidenceId`);
      else if (evidenceIds.has(item.evidenceId)) errors.push(`${finding.id}: duplicate evidenceId ${item.evidenceId}`);
      else evidenceIds.add(item.evidenceId);
      const refs = [...new Set([...(item.artifactRefs || []), item.artifactId].filter(Boolean))];
      for (const ref of refs) {
        if (ref.includes('+')) errors.push(`${finding.id}: synthetic artifact reference ${ref}`);
        else if (!resolvableArtifactIds.has(ref)) errors.push(`${finding.id}: unresolved artifact reference ${ref}`);
      }
      const manual = item.evidenceStrength === 'manual_evidence' || item.sourceMethod === 'operator_input';
      if (!manual && !item.sourceUrl && !(item.sourceUrls || []).length) errors.push(`${finding.id}: technical evidence ${item.evidenceId || '(unknown)'} has no source URL`);
    }
  }
  return { valid: errors.length === 0, errors };
}

export function validateSummaryTraceability(summary = {}, evidenceManifest = {}) {
  const resolvableArtifactIds = new Set((evidenceManifest.artifacts || []).flatMap((artifact) => [artifact.id, ...(artifact.roles || []), ...(artifact.aliases || []).map((alias) => alias.id)].filter(Boolean)));
  const errors = [];
  const evidenceItems = [
    ...(summary.findings || []).flatMap((finding) => finding.evidenceItems || (finding.evidence ? [finding.evidence] : [])),
    ...(summary.testResults || []).flatMap((result) => result.evidenceItems || (result.evidence ? [result.evidence] : [])),
    ...(summary.controlEvaluations || []).flatMap((control) => (control.automatedEvidence || []).flatMap((entry) => entry.evidenceItems || [])),
    ...(summary.frameworkResults || []).flatMap((framework) => framework.evidenceItems || [])
  ];
  const knownEvidenceIds = new Set(evidenceItems.map((item) => item.evidenceId).filter(Boolean));
  const seen = new Set();
  for (const item of evidenceItems) {
    const key = `${item.evidenceId || ''}|${item.sourceCheckId || ''}|${(item.mappingIds || []).join('|')}|${(item.artifactRefs || []).join('|')}`;
    if (seen.has(key)) continue;
    seen.add(key);
    const refs = [...new Set([...(item.artifactRefs || []), item.artifactId].filter(Boolean))];
    for (const ref of refs) {
      if (String(ref).includes('+')) errors.push(`${item.evidenceId || '(unknown)'}: synthetic artifact reference ${ref}`);
      else if (!resolvableArtifactIds.has(ref)) errors.push(`${item.evidenceId || '(unknown)'}: unresolved artifact reference ${ref}`);
    }
    if (refs.length) {
      for (const field of ['evidenceId', 'collectionMethod', 'collectionState', 'observedAt', 'confidence', 'evidenceStrength', 'limitations', 'sourceCheckId', 'mappingIds']) {
        if (!Object.hasOwn(item, field)) errors.push(`${item.evidenceId || '(unknown)'}: traceability tuple is missing ${field}`);
      }
      const method = normalizeCollectionMethod(item.collectionMethod || item.sourceMethod);
      if (!['operator_input', 'manual', 'artifact_only'].includes(method) && !item.sourceUrl && !(item.sourceUrls || []).length) errors.push(`${item.evidenceId || '(unknown)'}: technical evidence has no source URL`);
    }
  }
  const statements = (summary.frameworkResults || []).flatMap((framework) => [...(framework.evidenceStatements || []), ...(framework.technicalEvidenceStatements || []), ...(framework.statementTraceability || [])]);
  for (const statement of statements) {
    for (const ref of statement.evidenceRefs || []) {
      if (!String(ref).startsWith('check:') && !knownEvidenceIds.has(ref)) errors.push(`${statement.statementId || '(unknown statement)'}: unresolved evidence reference ${ref}`);
    }
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)] };
}

export function classifyPrerequisiteOutcome(mapping = {}) {
  const prerequisites = mapping.prerequisites || [];
  if (!prerequisites.length) return 'none';
  const results = mapping.prerequisiteResults || [];
  const states = prerequisites.map((prerequisite) => results.find((item) => item.prerequisite === prerequisite)?.state || 'unknown');
  if (states.some((state) => state === 'not_met')) return 'not_met';
  if (states.some((state) => ['unknown', 'requires_manual_confirmation'].includes(state))) return 'uncertain';
  return states.every((state) => state === 'met') ? 'all_met' : 'uncertain';
}

export function classifyControlEvidence(check = {}, mapping = {}) {
  const prerequisiteOutcome = classifyPrerequisiteOutcome(mapping);
  const adverse = ['fail', 'warning'].includes(check.status);
  const collectionState = normalizeCollectionState(check.collectionState || check.testState);
  if (collectionState === 'failed_to_test') return { evidenceState: 'failed_to_test', prerequisiteOutcome };
  if (collectionState === 'not_tested') return { evidenceState: 'not_assessed', prerequisiteOutcome };
  if (prerequisiteOutcome === 'not_met') return { evidenceState: 'mapping_prerequisite_not_met', prerequisiteOutcome };
  if (prerequisiteOutcome === 'uncertain') return { evidenceState: 'manual_review_required', prerequisiteOutcome };
  if (check.id === 'privacy-runtime-verification' && check.status === 'warning') return { evidenceState: 'claim_not_verified', prerequisiteOutcome };
  if (check.id === 'privacy-runtime-consistency' && adverse) return { evidenceState: 'potential_claim_runtime_mismatch', prerequisiteOutcome };
  if (adverse && mapping.relationship === 'direct') return { evidenceState: 'adverse_technical_evidence_observed', prerequisiteOutcome };
  if (adverse && mapping.relationship === 'supporting') return { evidenceState: 'supporting_technical_evidence_observed', prerequisiteOutcome };
  if (adverse && ['contextual', 'scope_signal'].includes(mapping.relationship)) return { evidenceState: 'contextual_evidence_observed', prerequisiteOutcome };
  if (check.status === 'manual') return { evidenceState: 'manual_review_required', prerequisiteOutcome };
  if (!adverse && (mapping.evidenceTypes || []).includes('policy_claim') && ['pass', 'info'].includes(check.status)) return { evidenceState: 'policy_claim_observed', prerequisiteOutcome };
  if (check.status === 'pass' && mapping.relationship === 'supporting') return { evidenceState: 'supporting_technical_evidence_observed', prerequisiteOutcome };
  if (check.status === 'pass' && mapping.relationship === 'contextual') return { evidenceState: 'contextual_evidence_observed', prerequisiteOutcome };
  if (check.status === 'pass' || check.testState === 'confirmed') return { evidenceState: 'partial_technical_evidence_observed', prerequisiteOutcome };
  return { evidenceState: 'manual_review_required', prerequisiteOutcome };
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
    const collectionStates = record.evidence.map(({ check }) => normalizeCollectionState(check.collectionState || check.testState));
    const failed = collectionStates.some((state) => state === 'failed_to_test');
    const notTested = collectionStates.every((state) => ['not_tested', 'failed_to_test'].includes(state));
    const classified = record.evidence.map(({ check, mapping }) => {
      const { evidenceState, prerequisiteOutcome } = classifyControlEvidence(check, mapping);
      return { check, mapping, evidenceState, prerequisiteOutcome };
    });
    const precedence = ['adverse_technical_evidence_observed', 'potential_claim_runtime_mismatch', 'claim_not_verified', 'supporting_technical_evidence_observed', 'contextual_evidence_observed', 'policy_claim_observed', 'partial_technical_evidence_observed', 'manual_review_required', 'not_assessed', 'failed_to_test'];
    const state = notTested ? (failed ? 'failed_to_test' : 'not_assessed') : precedence.find((candidate) => classified.some((item) => item.evidenceState === candidate)) || 'manual_review_required';
    const framework = frameworkForControl(record.controlId);
    const coverageSummary = {
      totalEvidenceItems: classified.length,
      completedEvidenceItems: classified.filter(({ check }) => normalizeCollectionState(check.collectionState || check.testState) === 'completed').length,
      partialEvidenceItems: classified.filter(({ check }) => normalizeCollectionState(check.collectionState || check.testState) === 'partial').length,
      failedEvidenceItems: classified.filter(({ check }) => normalizeCollectionState(check.collectionState || check.testState) === 'failed_to_test').length,
      notAssessedEvidenceItems: classified.filter(({ check }) => normalizeCollectionState(check.collectionState || check.testState) === 'not_tested').length,
      manualReviewEvidenceItems: classified.filter(({ evidenceState }) => evidenceState === 'manual_review_required').length,
      uncertainPrerequisiteItems: classified.filter(({ prerequisiteOutcome }) => prerequisiteOutcome === 'uncertain').length
    };
    coverageSummary.complete = coverageSummary.totalEvidenceItems > 0
      && coverageSummary.completedEvidenceItems === coverageSummary.totalEvidenceItems
      && coverageSummary.manualReviewEvidenceItems === 0
      && coverageSummary.uncertainPrerequisiteItems === 0;
    const coverageQualifiers = [
      coverageSummary.failedEvidenceItems ? 'failed_evidence_present' : '',
      coverageSummary.notAssessedEvidenceItems ? 'not_assessed_evidence_present' : '',
      coverageSummary.partialEvidenceItems ? 'partial_collection_present' : '',
      coverageSummary.manualReviewEvidenceItems > coverageSummary.uncertainPrerequisiteItems ? 'manual_review_evidence_present' : '',
      coverageSummary.uncertainPrerequisiteItems ? 'uncertain_prerequisite_present' : '',
      !coverageSummary.complete ? 'coverage_incomplete' : ''
    ].filter(Boolean);
    const mergedMappings = mergeSemanticMappings(record.mappings);
    const sourceCheckIds = [...new Set(record.evidence.map(({ check }) => check.id).filter(Boolean))];
    const sourceMappingIds = [...new Set(mergedMappings.flatMap((mapping) => mapping.sourceMappingIds || [mapping.mappingId]).filter(Boolean))];
    const manualReviewReasons = controlManualReviewReasons({ framework, classified, coverageSummary, mappings: mergedMappings });
    return {
      controlId: record.controlId,
      state,
      controlSatisfaction: 'not_determined',
      coverage: 'partial',
      evidenceLevel,
      frameworkApplicability: frameworkApplicability[framework] || 'selected_for_mapping',
      mappingCatalogVersion: MAPPING_CATALOG_VERSION,
      coverageSummary,
      coverageQualifiers,
      provenanceSummary: {
        sourceCheckCount: sourceCheckIds.length,
        sourceCheckIds,
        sourceMappingCount: sourceMappingIds.length,
        sourceMappingIds,
        interpretation: 'provenance_breadth_not_assurance_strength'
      },
      automatedEvidence: classified.map(({ check, mapping, evidenceState, prerequisiteOutcome }) => {
        const collectionMethod = normalizeCollectionMethod(check.collectionMethod || sourceMethod(check));
        const collectionState = normalizeCollectionState(check.collectionState || check.testState);
        const evidenceConfidence = normalizeEvidenceConfidence(check.evidenceConfidence || check.confidence);
        const normalizedStrength = normalizeEvidenceStrength(mapping.relationship);
        const evidenceItems = normalizedEvidenceItems(check, check.observedAt || '', check.affectedUrl || '', { mappingIds: [mapping.mappingId] });
        const traceability = evidenceItems.length ? evidenceItems : [normalizeTraceabilityTuple({
          evidenceId: `check:${check.id}`,
          sourceUrl: check.affectedUrl || '',
          artifactId: artifactId(check.id),
          artifactRefs: [artifactId(check.id)],
          collectionMethod,
          collectionState,
          observedAt: check.observedAt || '',
          confidence: evidenceConfidence,
          evidenceStrength: normalizedStrength,
          limitations: check.limitations || []
        }, { sourceCheckId: check.id, mappingIds: [mapping.mappingId] })];
        return { checkId: check.id, sourceCheckId: check.id, outcome: check.status, testState: check.testState, collectionMethod, collectionState, confidence: evidenceConfidence, legacyConfidence: check.confidence || '', artifactId: traceability[0]?.artifactId || '', artifactRefs: [...new Set(traceability.flatMap((item) => item.artifactRefs || []))], evidenceRefs: traceability.map((item) => item.evidenceId).filter(Boolean), evidenceItems: traceability, evidenceType: evidenceStrength(check), relationship: mapping.relationship, strength: mapping.relationship === 'direct' ? 'direct_observation' : mapping.relationship === 'supporting' ? 'supporting_technical' : 'contextual', normalizedEvidenceStrength: normalizedStrength, evidenceState, prerequisiteOutcome, mappingId: mapping.mappingId, mappingIds: [mapping.mappingId], prerequisites: mapping.prerequisiteResults };
      }),
      mappings: mergedMappings,
      linkedFindings: [...new Set(record.findingIds)],
      manualReviewRequired: true,
      manualReviewReasons,
      limitations: [...new Set(['Automated evidence covers only the observed technical portion of this control. Control satisfaction, organizational implementation, scope completeness, and operating effectiveness were not determined.', ...record.mappings.flatMap((mapping) => mapping.limitations || [])])]
    };
  });
}
