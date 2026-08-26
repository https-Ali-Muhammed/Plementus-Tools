export const MAPPING_CATALOG_VERSION = '2026.08.25.2';

const FRAMEWORK_PREFIX = {
  'iso-27001': 'ISO27001:',
  gdpr: 'GDPR-',
  'soc-2': 'SOC2-',
  hipaa: 'HIPAA-',
  'pci-dss': 'PCI-DSS-',
  local: 'LOCAL-'
};

const FRAMEWORK_VERSIONS = {
  'iso-27001': '2022',
  gdpr: '2016/679',
  'soc-2': 'Trust Services Criteria',
  hipaa: '45 CFR Part 164',
  'pci-dss': '4.0.1',
  local: 'jurisdiction-specific'
};

const SOURCE_CITATIONS = {
  'iso-27001': 'https://www.iso.org/standard/27001',
  gdpr: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj',
  'soc-2': 'https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services',
  hipaa: 'https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html',
  'pci-dss': 'https://www.pcisecuritystandards.org/document_library/',
  local: ''
};

export const EPRIVACY_ARTICLE_5_3_SOURCE = 'https://eur-lex.europa.eu/eli/dir/2002/58/oj';

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
    aliases: Object.freeze([...(metadata.aliases || [])]),
    reviewStatus: 'internal_review_required',
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
add('consent-behavior', 'gdpr', 'EPRIVACY-DIR-2002-58-ART-5(3)', 'direct', ['direct_observation', 'runtime_observation'], ['gdpr_or_eprivacy_scope_confirmed_or_potential'], [], {
  frameworkVersion: 'Directive 2002/58/EC',
  sourceCitation: EPRIVACY_ARTICLE_5_3_SOURCE,
  aliases: ['GDPR-EPRIVACY-ART-5(3)']
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
  if (String(controlId).startsWith('EPRIVACY-')) return 'gdpr';
  return Object.entries(FRAMEWORK_PREFIX).find(([, prefix]) => String(controlId).startsWith(prefix))?.[0] || '';
}

export function mappingsForCheck(checkId, selectedFrameworks = [], { frameworkApplicability = {}, jurisdictionMappings = [] } = {}) {
  const selected = new Set(selectedFrameworks);
  const allowed = (framework) => {
    const state = frameworkApplicability[framework] || 'selected_for_mapping';
    return selected.has(framework) && !['not_applicable', 'not_indicated', 'requires_input'].includes(state);
  };
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
          reviewStatus: 'legal_review_required',
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
      state = paymentFlow.testedOriginParticipatesInPaymentFlow === true ? 'met' : paymentFlow.testedOriginParticipatesInPaymentFlow === false ? 'requires_manual_confirmation' : 'unknown';
    } else if (prerequisite === 'gdpr_scope_confirmed_or_potential' || prerequisite === 'gdpr_or_eprivacy_scope_confirmed_or_potential') {
      state = applicability === 'applicable' ? 'met' : applicability === 'not_applicable' ? 'not_met' : 'requires_manual_confirmation';
    } else if (prerequisite === 'hipaa_scope_confirmed_or_potential') {
      state = ['applicable', 'potentially_applicable'].includes(applicability) ? 'met' : applicability === 'not_applicable' ? 'not_met' : 'requires_manual_confirmation';
    } else if (prerequisite === 'local_jurisdiction_confirmed') {
      state = jurisdiction ? 'met' : 'requires_manual_confirmation';
    }
    return { prerequisite, state };
  });
}
