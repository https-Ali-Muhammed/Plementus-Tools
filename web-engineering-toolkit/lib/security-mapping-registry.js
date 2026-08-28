export const MAPPING_CATALOG_VERSION = '2026.08.26.3';

export const SOC2_TSC_VERSION = '2017 Trust Services Criteria (With Revised Points of Focus — 2022)';
export const SOC2_TSC_SOURCE = 'https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022';

const FRAMEWORK_PREFIX = {
  'iso-27001': 'ISO27001:',
  gdpr: 'GDPR-',
  eprivacy: 'EPRIVACY-',
  'soc-2': 'SOC2-',
  hipaa: 'HIPAA-',
  'pci-dss': 'PCI-DSS-',
  local: 'LOCAL-'
};

const FRAMEWORK_VERSIONS = {
  'iso-27001': '2022',
  gdpr: '2016/679',
  eprivacy: 'Directive 2002/58/EC as amended by Directive 2009/136/EC',
  'soc-2': SOC2_TSC_VERSION,
  hipaa: '45 CFR Part 164',
  'pci-dss': '4.0.1',
  local: 'jurisdiction-specific'
};

const SOURCE_CITATIONS = {
  'iso-27001': 'https://www.iso.org/standard/27001',
  gdpr: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
  eprivacy: 'https://eur-lex.europa.eu/eli/dir/2002/58/2009-12-19/eng',
  'soc-2': SOC2_TSC_SOURCE,
  hipaa: 'https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html',
  'pci-dss': 'https://www.pcisecuritystandards.org/document_library/',
  local: ''
};

export const FRAMEWORK_SOURCE_VERSIONS = Object.freeze({
  'iso-27001': 'ISO/IEC 27001:2022',
  gdpr: 'Regulation (EU) 2016/679',
  eprivacy: 'Directive 2002/58/EC as amended by Directive 2009/136/EC',
  'soc-2': SOC2_TSC_VERSION,
  hipaa: '45 CFR Part 164',
  'pci-dss': 'PCI DSS 4.0.1',
  local: 'Jurisdiction-specific official instrument metadata'
});

const GOVERNANCE_REVIEW_DATE = '2026-08-26';
const GOVERNANCE_REVIEWER = 'toolkit_mapping_governance';
const CHECK_RATIONALE_SUBJECTS = Object.freeze({
  https: 'Use of HTTPS on the tested URL',
  'http-to-https': 'HTTP-to-HTTPS redirect behavior on the tested origin',
  certificate: 'The observed public TLS certificate condition',
  tls: 'The observed TLS protocol condition',
  hsts: 'The observed HSTS transport-hardening condition',
  csp: 'The observed Content-Security-Policy condition',
  clickjacking: 'The observed framing-protection condition',
  nosniff: 'The observed MIME-sniffing protection condition',
  cookies: 'The observed Set-Cookie security-attribute condition',
  'runtime-cookies': 'The observed runtime cookie security-attribute condition',
  cors: 'The observed cross-origin resource-sharing condition',
  'mixed-content': 'The observed mixed-content condition on the tested page',
  'password-transport': 'The observed password-field transport condition',
  'consent-behavior': 'The bounded consent-ordering and tracking observation',
  'privacy-runtime-consistency': 'The bounded comparison between a public policy claim and runtime behavior',
  'privacy-runtime-verification': 'The bounded runtime validation attempt for a public policy claim',
  'access-control-candidates': 'The observed authenticated-route candidate evidence'
});

function mappingRationale(checkId, controlId, relationship) {
  const subject = CHECK_RATIONALE_SUBJECTS[checkId] || 'The observed technical condition';
  const relevance = relationship === 'direct'
    ? 'has a close relationship to a narrow technical aspect'
    : relationship === 'supporting'
      ? 'may support a narrow technical aspect'
      : relationship === 'contextual'
        ? 'provides indirect reviewer context'
        : 'is relevant only to qualified review';
  return `${subject} ${relevance} of ${controlId}, but does not determine the broader organizational requirement.`;
}

function mappingChangeReason(framework) {
  if (framework === 'soc-2') return 'SOC TSC source edition was pinned during Phase 2.2B; governance metadata was added during Phase 2.2C.';
  if (framework === 'eprivacy') return 'Ownership, prerequisite behavior, relationship, and amended source provenance were validated during Phase 2.2A; governance metadata was added during Phase 2.2C.';
  return 'Mapping and prerequisite behavior were retained from the validated Phase 2.2 model; governance metadata was added during Phase 2.2C.';
}

export const EPRIVACY_ARTICLE_5_3_SOURCE = SOURCE_CITATIONS.eprivacy;

const registry = [];

function add(checkId, framework, controlId, relationship, evidenceTypes, prerequisites = [], limitations = [], metadata = {}) {
  registry.push(Object.freeze({
    mappingId: `${checkId}:${framework}:${controlId}`.replace(/[^a-z0-9:().-]+/gi, '_'),
    checkId,
    framework,
    frameworkVersion: metadata.frameworkVersion || FRAMEWORK_VERSIONS[framework],
    controlId,
    relationship,
    evidenceTypes,
    prerequisites,
    limitations: [
      'The mapping identifies evidence relevant for qualified review; it does not determine control satisfaction.',
      ...limitations
    ],
    sourceCitation: metadata.sourceCitation || SOURCE_CITATIONS[framework],
    sourceVersion: metadata.sourceVersion || FRAMEWORK_SOURCE_VERSIONS[framework],
    rationale: metadata.rationale || mappingRationale(checkId, controlId, relationship),
    aliases: Object.freeze([...(metadata.aliases || [])]),
    reviewStatus: 'internal_review_required',
    lastReviewedAt: metadata.lastReviewedAt || GOVERNANCE_REVIEW_DATE,
    reviewedBy: metadata.reviewedBy || GOVERNANCE_REVIEWER,
    changeReason: metadata.changeReason || mappingChangeReason(framework),
    approvedBy: null,
    approvalDate: null,
    mappingVersion: MAPPING_CATALOG_VERSION
  }));
}

const transportChecks = ['https', 'http-to-https', 'certificate', 'tls'];
for (const checkId of transportChecks) {
  add(checkId, 'iso-27001', 'ISO27001:2022-A.8.24', checkId === 'https' ? 'direct' : 'supporting', ['direct_observation', 'supporting_technical']);
  add(checkId, 'soc-2', 'SOC2-CC6.7', 'supporting', ['supporting_technical'], [], ['A public transport observation cannot establish the design or operating effectiveness of entity-level SOC 2 controls.']);
  add(checkId, 'gdpr', 'GDPR-ART-32', 'supporting', ['supporting_technical'], ['gdpr_scope_confirmed_or_potential']);
  add(checkId, 'hipaa', 'HIPAA-164.312(e)(1)', 'supporting', ['supporting_technical'], ['hipaa_scope_confirmed_or_potential']);
  add(checkId, 'pci-dss', 'PCI-DSS-v4.0.1-4.2.1', 'supporting', ['supporting_technical'], ['pci_scope_confirmed_or_potential', 'tested_origin_participates_in_payment_flow']);
}

add('hsts', 'iso-27001', 'ISO27001:2022-A.8.24', 'supporting', ['supporting_technical']);
add('hsts', 'soc-2', 'SOC2-CC6.7', 'contextual', ['contextual'], [], ['HSTS alone does not establish an entity-level logical access or transmission control.']);
add('hsts', 'gdpr', 'GDPR-ART-32', 'contextual', ['contextual'], ['gdpr_scope_confirmed_or_potential']);
add('hsts', 'hipaa', 'HIPAA-164.312(e)(1)', 'contextual', ['contextual'], ['hipaa_scope_confirmed_or_potential']);
add('hsts', 'pci-dss', 'PCI-DSS-v4.0.1-4.2.1', 'contextual', ['contextual', 'supporting_technical'], ['pci_scope_confirmed_or_potential', 'tested_origin_participates_in_payment_flow'], ['Missing HSTS is a transport-hardening observation and does not prove PCI DSS 4.2.1 is unsatisfied.']);

for (const checkId of ['csp', 'clickjacking', 'nosniff']) {
  add(checkId, 'iso-27001', 'ISO27001:2022-A.8.28', 'contextual', ['contextual', 'supporting_technical'], [], ['An isolated response-header observation cannot establish organization-wide secure coding practices.']);
  add(checkId, 'soc-2', 'SOC2-CC7.1', 'contextual', ['contextual'], [], ['An isolated response-header observation cannot establish SOC 2 control design or operating effectiveness.']);
  add(checkId, 'pci-dss', 'PCI-DSS-v4.0.1-6.2.4', 'contextual', ['contextual', 'supporting_technical'], ['pci_scope_confirmed_or_potential', 'tested_origin_participates_in_payment_flow'], ['An isolated response-header observation cannot establish organizational software-engineering practice effectiveness.']);
}

for (const checkId of ['cookies', 'runtime-cookies']) {
  add(checkId, 'iso-27001', 'ISO27001:2022-A.8.5', 'supporting', ['supporting_technical', 'runtime_observation']);
  add(checkId, 'soc-2', 'SOC2-CC6.1', 'contextual', ['contextual', 'runtime_observation']);
  add(checkId, 'gdpr', 'GDPR-ART-32', 'supporting', ['supporting_technical', 'runtime_observation'], ['gdpr_scope_confirmed_or_potential']);
}

add('cors', 'iso-27001', 'ISO27001:2022-A.8.20', 'supporting', ['supporting_technical']);
add('cors', 'soc-2', 'SOC2-CC6.6', 'contextual', ['contextual']);

add('mixed-content', 'iso-27001', 'ISO27001:2022-A.8.24', 'direct', ['direct_observation', 'runtime_observation']);
add('mixed-content', 'soc-2', 'SOC2-CC6.7', 'supporting', ['supporting_technical', 'runtime_observation']);
add('mixed-content', 'gdpr', 'GDPR-ART-32', 'supporting', ['supporting_technical', 'runtime_observation'], ['gdpr_scope_confirmed_or_potential']);
add('mixed-content', 'hipaa', 'HIPAA-164.312(e)(1)', 'supporting', ['supporting_technical', 'runtime_observation'], ['hipaa_scope_confirmed_or_potential']);
add('mixed-content', 'pci-dss', 'PCI-DSS-v4.0.1-4.2.1', 'supporting', ['supporting_technical', 'runtime_observation'], ['pci_scope_confirmed_or_potential', 'tested_origin_participates_in_payment_flow']);

add('password-transport', 'iso-27001', 'ISO27001:2022-A.8.5', 'direct', ['direct_observation', 'runtime_observation']);
add('password-transport', 'soc-2', 'SOC2-CC6.1', 'supporting', ['supporting_technical', 'runtime_observation']);
add('password-transport', 'gdpr', 'GDPR-ART-32', 'supporting', ['supporting_technical', 'runtime_observation'], ['gdpr_scope_confirmed_or_potential']);

add('consent-behavior', 'gdpr', 'GDPR-ART-5', 'supporting', ['runtime_observation'], ['gdpr_scope_confirmed_or_potential']);
add('consent-behavior', 'gdpr', 'GDPR-ART-6', 'contextual', ['runtime_observation'], ['gdpr_scope_confirmed_or_potential']);
add('consent-behavior', 'eprivacy', 'EPRIVACY-DIR-2002-58-ART-5(3)', 'supporting', ['supporting_technical', 'runtime_observation'], ['eprivacy_scope_confirmed_or_potential'], [
  'The observation does not determine whether storage/access occurred, whether consent was legally required, or whether an applicable strictly-necessary exception exists.',
  'Known-host network matching and bounded cookie/storage snapshots do not establish a violation of Article 5(3).'
], {
  frameworkVersion: 'Directive 2002/58/EC as amended by Directive 2009/136/EC',
  sourceCitation: EPRIVACY_ARTICLE_5_3_SOURCE,
  aliases: ['GDPR-EPRIVACY-ART-5(3)', 'consent-behavior:gdpr:EPRIVACY-DIR-2002-58-ART-5(3)']
});
add('privacy-runtime-consistency', 'gdpr', 'GDPR-ART-5', 'direct', ['policy_claim', 'runtime_observation'], ['gdpr_scope_confirmed_or_potential']);
add('privacy-runtime-consistency', 'gdpr', 'GDPR-ART-12', 'supporting', ['policy_claim', 'runtime_observation'], ['gdpr_scope_confirmed_or_potential']);
add('privacy-runtime-verification', 'gdpr', 'GDPR-ART-5', 'contextual', ['policy_claim', 'runtime_observation'], ['gdpr_scope_confirmed_or_potential']);
add('privacy-runtime-verification', 'gdpr', 'GDPR-ART-12', 'contextual', ['policy_claim', 'runtime_observation'], ['gdpr_scope_confirmed_or_potential']);

add('access-control-candidates', 'iso-27001', 'ISO27001:2022-A.5.15', 'contextual', ['contextual', 'runtime_observation']);
add('access-control-candidates', 'soc-2', 'SOC2-CC6.1', 'contextual', ['contextual', 'runtime_observation']);
add('access-control-candidates', 'gdpr', 'GDPR-ART-32', 'contextual', ['contextual', 'runtime_observation'], ['gdpr_scope_confirmed_or_potential']);
add('access-control-candidates', 'hipaa', 'HIPAA-164.312(a)(1)', 'contextual', ['contextual', 'runtime_observation'], ['hipaa_scope_confirmed_or_potential']);
add('access-control-candidates', 'pci-dss', 'PCI-DSS-v4.0.1-7.2.1', 'contextual', ['contextual', 'runtime_observation'], ['pci_scope_confirmed_or_potential']);

export const SECURITY_MAPPING_REGISTRY = Object.freeze(registry);

export function frameworkForControl(controlId = '') {
  if (String(controlId).startsWith('GDPR-EPRIVACY-')) return 'eprivacy';
  return Object.entries(FRAMEWORK_PREFIX).find(([, prefix]) => String(controlId).startsWith(prefix))?.[0] || '';
}

export function mappingsForCheck(checkId, selectedFrameworks = [], { frameworkApplicability = {}, jurisdictionMappings = [] } = {}) {
  const selected = new Set(selectedFrameworks);
  const allowed = (framework) => selected.has(framework);
  const mappings = SECURITY_MAPPING_REGISTRY.filter((item) => item.checkId === checkId && allowed(item.framework));
  if (allowed('local')) {
    for (const local of jurisdictionMappings) {
      for (const controlId of local.controls || []) {
        mappings.push({
          mappingId: `${checkId}:local:${controlId}`,
          checkId,
          framework: 'local',
          frameworkVersion: local.frameworkVersion || 'jurisdiction-specific',
          controlId,
          relationship: 'contextual',
          evidenceTypes: ['contextual'],
          prerequisites: ['local_jurisdiction_confirmed'],
          limitations: ['Local-law applicability and legal interpretation require qualified review.'],
          sourceCitation: local.sourceCitation || '',
          sourceVersion: local.sourceVersion || FRAMEWORK_SOURCE_VERSIONS.local,
          rationale: local.rationale || mappingRationale(checkId, controlId, 'contextual'),
          reviewStatus: 'legal_review_required',
          lastReviewedAt: GOVERNANCE_REVIEW_DATE,
          reviewedBy: GOVERNANCE_REVIEWER,
          changeReason: 'Legacy provision-level local mapping metadata was normalized for qualified review; no new local mapping was introduced.',
          approvedBy: null,
          approvalDate: null,
          mappingVersion: MAPPING_CATALOG_VERSION
        });
      }
    }
  }
  return mappings.map((item) => ({ ...item, prerequisites: [...item.prerequisites], limitations: [...item.limitations], evidenceTypes: [...item.evidenceTypes], aliases: [...(item.aliases || [])] }));
}

export function evaluateMappingPrerequisites(mapping, context = {}) {
  const applicability = context.frameworkApplicability?.[mapping.framework] || 'selected_for_mapping';
  const paymentFlow = context.paymentFlow || {};
  const jurisdiction = String(context.jurisdiction || '').trim();
  return (mapping.prerequisites || []).map((prerequisite) => {
    let state = 'unknown';
    if (prerequisite === 'pci_scope_confirmed_or_potential') {
      state = ['applicable', 'potentially_applicable'].includes(applicability) ? 'met' : applicability === 'not_applicable' ? 'not_met' : 'requires_manual_confirmation';
    } else if (prerequisite === 'tested_origin_participates_in_payment_flow') {
      state = paymentFlow.testedOriginParticipatesInPaymentFlow === true ? 'met' : paymentFlow.testedOriginParticipatesInPaymentFlow === false ? 'not_met' : 'unknown';
    } else if (prerequisite === 'gdpr_scope_confirmed_or_potential') {
      state = applicability === 'applicable' ? 'met' : applicability === 'not_applicable' ? 'not_met' : 'requires_manual_confirmation';
    } else if (prerequisite === 'eprivacy_scope_confirmed_or_potential' || prerequisite === 'gdpr_or_eprivacy_scope_confirmed_or_potential') {
      const eprivacyApplicability = context.frameworkApplicability?.eprivacy || (mapping.framework === 'eprivacy' ? applicability : 'unknown');
      state = ['applicable', 'potentially_applicable'].includes(eprivacyApplicability) ? 'met' : eprivacyApplicability === 'not_applicable' ? 'not_met' : 'requires_manual_confirmation';
    } else if (prerequisite === 'hipaa_scope_confirmed_or_potential') {
      state = ['applicable', 'potentially_applicable'].includes(applicability) ? 'met' : applicability === 'not_applicable' ? 'not_met' : 'requires_manual_confirmation';
    } else if (prerequisite === 'local_jurisdiction_confirmed') {
      state = jurisdiction ? 'met' : 'requires_manual_confirmation';
    }
    return { prerequisite, state };
  });
}
