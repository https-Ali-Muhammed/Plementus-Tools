import { recognizeFixtureOdooShPage } from '../odoo-sh/page-recognition.mjs';

const BINDING_KEYS = 'version,selectedRole,tabSlot,expectedOrigin,documentGeneration,contextGeneration,accountContext,accountContinuity,projectSlot,branchSlot,permissionEvidence,rightsEvidence,lifecycle';

function boundedInteger(value, maximum) {
  return Number.isInteger(value) && value >= 1 && value <= maximum;
}

function nullableInteger(value, maximum) {
  return value === null || boundedInteger(value, maximum);
}

function parseBinding(text) {
  if (!text.length || !/^[\x00-\x7f]+$/.test(text)) return null;
  let binding;
  try {
    binding = JSON.parse(text);
  } catch {
    return null;
  }
  if (binding === null || typeof binding !== 'object' || Array.isArray(binding)
      || JSON.stringify(binding) !== text || Object.keys(binding).join(',') !== BINDING_KEYS
      || !boundedInteger(binding.version, 999)
      || ![null, 'odoo-sh', 'github', 'plementus'].includes(binding.selectedRole)
      || !nullableInteger(binding.tabSlot, 3)
      || typeof binding.expectedOrigin !== 'string' || binding.expectedOrigin.length > 128
      || !/^[\x20-\x7e]+$/.test(binding.expectedOrigin)
      || !nullableInteger(binding.documentGeneration, 1000000)
      || !nullableInteger(binding.contextGeneration, 1000000)
      || !['operator_reported', 'missing', 'unknown', 'conflicting'].includes(binding.accountContext)
      || !['current', 'unknown', 'stale', 'conflicting'].includes(binding.accountContinuity)
      || !nullableInteger(binding.projectSlot, 3) || !nullableInteger(binding.branchSlot, 3)
      || !['fixture_available', 'missing', 'unknown', 'denied'].includes(binding.permissionEvidence)
      || !['fixture_available', 'missing', 'unknown', 'denied'].includes(binding.rightsEvidence)
      || !['current', 'cancelled', 'context_lost', 'restarted', 'unexpected_navigation'].includes(binding.lifecycle)) return null;
  return binding;
}

function result(reason, nextStep, resultClass = 'MANUAL_REVIEW', recognizerReason = 'NOT_ASSESSED') {
  return Object.freeze({
    version: 1,
    resultClass,
    reason,
    recognizerReason,
    evidenceTier: 'SIMULATED',
    provenance: 'SYNTHETIC_UNTRUSTED',
    fixtureOnly: true,
    nextStep,
    browserObserved: false,
    permissionVerified: false,
    accountVerified: false,
    rightsVerified: false,
    subscriptionVerified: false,
    approvalGranted: false,
    executionAuthorized: false,
    mutationAuthorized: false,
    installationAuthorized: false,
    trustedContinuingContext: false,
    associationVerified: false,
    productionDatabaseVerified: false,
    stagingCopyVerified: false,
    moduleInstalled: false,
    effectsApplied: false,
    readAuthorized: false,
    writeAuthorized: false,
  });
}

export function assessFixtureInteractionContext(bindingText, configurationText, observationText) {
  if (typeof bindingText !== 'string' || typeof configurationText !== 'string'
      || typeof observationText !== 'string') return result('invalid_input', 'CORRECT_FIXTURE', 'REJECTED');
  if (bindingText.length > 2048 || configurationText.length > 8192
      || observationText.length > 8192) return result('input_too_large', 'CORRECT_FIXTURE', 'REJECTED');
  const binding = parseBinding(bindingText);
  if (!binding) return result('invalid_input', 'CORRECT_FIXTURE', 'REJECTED');
  if (binding.version !== 1) return result('unsupported_binding_version', 'REVIEW_VERSION', 'REJECTED');
  const page = recognizeFixtureOdooShPage(configurationText, observationText);
  if (page.resultClass !== 'FIXTURE_MATCH') {
    const resultClass = ['REJECTED', 'CANCELLED'].includes(page.resultClass) ? page.resultClass : 'MANUAL_REVIEW';
    return result(page.reason, page.nextStep, resultClass, page.reason);
  }
  const review = (reason, nextStep = 'FRESH_SELECTION', resultClass = 'MANUAL_REVIEW') =>
    result(reason, nextStep, resultClass, page.reason);
  if (binding.lifecycle === 'cancelled') return review('operator_cancelled', 'STOP', 'CANCELLED');
  if (binding.lifecycle === 'context_lost') return review('context_lost');
  if (binding.lifecycle === 'restarted') return review('context_restarted');
  if (binding.lifecycle === 'unexpected_navigation') return review('unexpected_navigation');
  if (binding.selectedRole === null || binding.tabSlot === null) return review('binding_selection_missing');
  // The accepted match has already validated both envelopes; only binding agreement remains.
  const configuration = JSON.parse(configurationText);
  const observation = JSON.parse(observationText);
  const selected = configuration.selections.find(selection => selection.role === 'odoo-sh');
  if (binding.selectedRole !== 'odoo-sh' || binding.tabSlot !== selected.tabSlot
      || binding.tabSlot !== observation.tabSlot) return review('binding_tab_mismatch');
  if (binding.expectedOrigin !== configuration.expectedOrigin
      || binding.expectedOrigin !== observation.origin) return review('binding_origin_mismatch', 'FRESH_SELECTION', 'REJECTED');
  if (binding.documentGeneration === null || binding.contextGeneration === null) return review('binding_generation_missing');
  if (binding.documentGeneration !== configuration.documentGeneration
      || binding.documentGeneration !== observation.documentGeneration
      || binding.contextGeneration !== configuration.contextGeneration
      || binding.contextGeneration !== observation.contextGeneration) return review('binding_generation_stale');
  if (binding.projectSlot !== configuration.projectSlot
      || binding.branchSlot !== configuration.branchSlot) return review('binding_target_mismatch', 'MANUAL_TARGET');
  if (binding.accountContext === 'conflicting' || binding.accountContinuity === 'conflicting')
    return review('account_context_conflicting', 'MANUAL_ACCOUNT');
  if (binding.accountContext === 'missing' || binding.accountContext === 'unknown')
    return review('account_context_unavailable', 'MANUAL_ACCOUNT');
  if (binding.accountContinuity === 'stale') return review('account_context_drift');
  if (binding.accountContinuity === 'unknown') return review('account_continuity_unknown', 'MANUAL_ACCOUNT');
  if (binding.permissionEvidence === 'denied') return review('binding_permission_denied', 'MANUAL_ACCESS');
  if (binding.permissionEvidence !== 'fixture_available') return review('binding_permission_unavailable', 'MANUAL_ACCESS');
  if (binding.rightsEvidence === 'denied') return review('operation_rights_denied', 'MANUAL_ACCESS');
  if (binding.rightsEvidence !== 'fixture_available') return review('operation_rights_unavailable', 'MANUAL_ACCESS');
  return review('synthetic_context_match', 'REVIEW_FIXTURE', 'SYNTHETIC_CONTEXT_MATCH');
}
