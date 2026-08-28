export const FRAMEWORK_DISPLAY_NAMES = Object.freeze({
  'iso-27001': 'ISO/IEC 27001',
  gdpr: 'GDPR',
  eprivacy: 'ePrivacy Directive',
  'soc-2': 'SOC 2',
  hipaa: 'HIPAA',
  'pci-dss': 'PCI DSS',
  local: 'Local Regulations'
});

export const RELATIONSHIP_DEFINITIONS = Object.freeze({
  direct: Object.freeze({
    label: 'Direct',
    shortDescription: 'Close technical relationship to a narrow part of a candidate requirement.',
    longDescription: 'A close relationship between the observed technical condition and a narrow aspect of the candidate requirement. It does not determine overall control satisfaction.'
  }),
  supporting: Object.freeze({
    label: 'Supporting',
    shortDescription: 'Relevant partial technical evidence; additional evidence is required.',
    longDescription: 'Technical evidence relevant to part of a candidate requirement. Additional technical, organizational, scope, and operating-effectiveness evidence is required.'
  }),
  contextual: Object.freeze({
    label: 'Contextual',
    shortDescription: 'Reviewer context only; the relationship is indirect.',
    longDescription: 'Evidence useful for reviewer context but too indirect to support requirement-level interpretation by itself.'
  }),
  scope_signal: Object.freeze({
    label: 'Scope signal',
    shortDescription: 'Evidence for scope review, not control-satisfaction evidence.',
    longDescription: 'Evidence relevant to determining whether a framework or requirement may be in scope. It is not control-satisfaction evidence.'
  }),
  manual_only: Object.freeze({
    label: 'Manual only',
    shortDescription: 'Qualified human assessment is required; automation does not establish the issue.',
    longDescription: 'The mapped issue requires qualified human assessment and is not established by automated evidence.'
  })
});

export const RELATIONSHIP_DISCLAIMER = 'No relationship type determines control satisfaction or compliance.';

export const REVIEW_REASON_DEFINITIONS = Object.freeze({
  scope_confirmation_required: Object.freeze({ label: 'Scope confirmation required', description: 'Framework or requirement scope has not been confirmed.' }),
  organizational_evidence_required: Object.freeze({ label: 'Organizational evidence required', description: 'Public technical evidence cannot establish organization-wide implementation.' }),
  operating_effectiveness_not_assessed: Object.freeze({ label: 'Operating effectiveness not assessed', description: 'The assessment does not test sustained operating effectiveness.' }),
  failed_collection_present: Object.freeze({ label: 'Failed collection present', description: 'At least one mapped technical source could not be collected.' }),
  not_assessed_evidence_present: Object.freeze({ label: 'Not-assessed evidence present', description: 'At least one mapped source was not assessed.' }),
  mapping_requires_human_review: Object.freeze({ label: 'Mapping requires human review', description: 'Candidate mapping interpretation requires qualified review.' }),
  policy_claim_requires_validation: Object.freeze({ label: 'Policy claim requires validation', description: 'A public policy claim requires validation against implementation and scope evidence.' }),
  authenticated_authorization_not_verified: Object.freeze({ label: 'Authenticated authorization not verified', description: 'Authenticated route evidence does not establish authorization correctness or least privilege.' }),
  legal_interpretation_required: Object.freeze({ label: 'Legal interpretation required', description: 'Jurisdictional applicability and legal interpretation require qualified review.' })
});

const REVIEW_REASON_ORDER = Object.freeze(Object.keys(REVIEW_REASON_DEFINITIONS));

export function frameworkDisplayName(framework = '') {
  return FRAMEWORK_DISPLAY_NAMES[framework] || String(framework || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

export function relationshipDefinition(relationship = '') {
  return RELATIONSHIP_DEFINITIONS[relationship] || Object.freeze({
    label: String(relationship || 'unknown').replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()),
    shortDescription: 'Relationship metadata was not available in this report version.',
    longDescription: 'Relationship metadata was not available in this report version; qualified review remains required.'
  });
}

export function applicabilityPresentation(state = 'unknown', { inputState = 'unknown' } = {}) {
  const operatorAsserted = ['applicable', 'not_applicable'].includes(inputState);
  const labels = {
    applicable: operatorAsserted ? 'Applicable — operator asserted' : 'Applicability not determined',
    not_applicable: operatorAsserted ? 'Not applicable — operator asserted' : 'Applicability not determined',
    potentially_applicable: 'Potentially applicable — scope confirmation required',
    not_indicated: 'Not indicated by observed public evidence',
    requires_scope_confirmation: 'Scope confirmation required',
    requires_input: 'Applicability not determined — jurisdiction input required',
    selected_for_mapping: 'Applicability not determined',
    unknown: 'Applicability not determined'
  };
  return {
    state,
    label: labels[state] || labels.unknown,
    selectedForMapping: state === 'selected_for_mapping',
    selectionLabel: 'Selected for mapping',
    source: operatorAsserted ? 'operator_assertion' : state === 'potentially_applicable' ? 'public_scope_signal' : 'not_determined'
  };
}

export function normalizeManualReviewReasons(reasons = []) {
  const unique = new Set((reasons || []).filter((reason) => REVIEW_REASON_DEFINITIONS[reason]));
  return REVIEW_REASON_ORDER.filter((reason) => unique.has(reason));
}

export function manualReviewReasonLabels(reasons = []) {
  return normalizeManualReviewReasons(reasons).map((reason) => REVIEW_REASON_DEFINITIONS[reason].label);
}

export function controlManualReviewReasons({ framework = '', classified = [], coverageSummary = {}, mappings = [] } = {}) {
  const reasons = ['organizational_evidence_required', 'operating_effectiveness_not_assessed'];
  if ((classified || []).some((item) => item.prerequisiteOutcome === 'uncertain')) reasons.push('scope_confirmation_required');
  if (coverageSummary.failedEvidenceItems) reasons.push('failed_collection_present');
  if (coverageSummary.notAssessedEvidenceItems) reasons.push('not_assessed_evidence_present');
  if ((mappings || []).length) reasons.push('mapping_requires_human_review');
  if ((mappings || []).some((mapping) => (mapping.evidenceTypes || []).includes('policy_claim'))) reasons.push('policy_claim_requires_validation');
  if ((classified || []).some((item) => item.check?.id === 'access-control-candidates')) reasons.push('authenticated_authorization_not_verified');
  if (framework === 'local') reasons.push('legal_interpretation_required');
  return normalizeManualReviewReasons(reasons);
}

export function frameworkManualReviewReasons({ id = '', applicability = 'unknown' } = {}) {
  const reasons = ['organizational_evidence_required', 'operating_effectiveness_not_assessed'];
  if (['unknown', 'requires_scope_confirmation', 'potentially_applicable', 'not_indicated', 'requires_input'].includes(applicability)) reasons.push('scope_confirmation_required');
  if (id === 'local') reasons.push('legal_interpretation_required');
  return normalizeManualReviewReasons(reasons);
}
