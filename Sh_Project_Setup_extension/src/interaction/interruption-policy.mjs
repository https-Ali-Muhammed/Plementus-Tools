const STATE_FIELDS = 'version,tabSlot,originToken,documentGeneration,contextGeneration,workerGeneration,projectSlot,branchSlot,sequence,lifecycle,writeStatus';
const EVENT_FIELDS = 'version,tabSlot,originToken,documentGeneration,contextGeneration,workerGeneration,projectSlot,branchSlot,sequence,lifecycle,navigation,authentication,dialog,evidence,writeStatus';
const LOSS_ORDER = ['context_lost', 'session_lost', 'worker_suspended', 'worker_restarted', 'worker_resumed', 'browser_restarted'];
const NAVIGATION_REASONS = Object.freeze({
  same_document_navigation: 'same_document_navigation', reload: 'document_reload',
  document_replaced: 'document_replaced', unexpected: 'unexpected_navigation',
  unknown: 'navigation_unknown', conflicting: 'navigation_conflict',
});
const AUTH_REASONS = Object.freeze({ none: '', login_required: 'login_required',
  session_expired: 'session_expired', mfa: 'mfa_required', captcha: 'captcha_required',
  conflicting: 'authentication_conflict' });
const DIALOG_REASONS = Object.freeze({ none: '', unexpected: 'unexpected_dialog',
  unsupported: 'unsupported_dialog', conflicting: 'dialog_conflict' });
const EVIDENCE_REASONS = Object.freeze({ complete: '', missing: 'evidence_missing',
  ambiguous: 'evidence_ambiguous', unknown_page: 'page_unknown',
  unknown_interruption: 'interruption_unknown', conflicting: 'interruption_conflict' });

function outcome(reason, nextStep, resultClass = 'MANUAL_REVIEW') {
  return Object.freeze({
    version: 1, resultClass, reason, evidenceTier: 'SIMULATED',
    provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true, nextStep,
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

function within(value, minimum, maximum) {
  return Number.isInteger(value) && value >= minimum && value <= maximum;
}

function envelope(text, isEvent) {
  if (!/^[\x20-\x7e]+$/.test(text)) return null;
  let value;
  try { value = JSON.parse(text); } catch { return null; }
  if (value === null || typeof value !== 'object' || Array.isArray(value)
      || JSON.stringify(value) !== text
      || Object.keys(value).join(',') !== (isEvent ? EVENT_FIELDS : STATE_FIELDS)
      || !within(value.version, 1, 999)
      || !within(value.sequence, isEvent ? 1 : 0, 1000000)
      || ![null, 'toy-origin-a', 'toy-origin-b'].includes(value.originToken)
      || !['active', 'cancelled', ...LOSS_ORDER].includes(value.lifecycle)
      || !['none', 'possible_unresolved'].includes(value.writeStatus)) return null;
  for (const key of ['tabSlot', 'projectSlot', 'branchSlot'])
    if (value[key] !== null && !within(value[key], 1, 3)) return null;
  for (const key of ['documentGeneration', 'contextGeneration', 'workerGeneration'])
    if (value[key] !== null && !within(value[key], 1, 1000000)) return null;
  if (isEvent && (!['none', 'same_document_observation', 'cross_origin', 'tab_closed',
    'tab_replaced', ...Object.keys(NAVIGATION_REASONS)].includes(value.navigation)
    || typeof value.authentication !== 'string' || typeof value.dialog !== 'string'
    || typeof value.evidence !== 'string'
    || !Object.hasOwn(AUTH_REASONS, value.authentication)
    || !Object.hasOwn(DIALOG_REASONS, value.dialog)
    || !Object.hasOwn(EVIDENCE_REASONS, value.evidence))) return null;
  return value;
}

export function assessFixtureInterruption(stateText, eventText) {
  if (typeof stateText !== 'string' || typeof eventText !== 'string')
    return outcome('invalid_input', 'CORRECT_FIXTURE', 'REJECTED');
  if (stateText.length > 1024 || eventText.length > 1024)
    return outcome('input_too_large', 'CORRECT_FIXTURE', 'REJECTED');
  const state = envelope(stateText, false);
  const event = envelope(eventText, true);
  if (!state || !event) return outcome('invalid_input', 'CORRECT_FIXTURE', 'REJECTED');
  if (state.version !== 1 || event.version !== 1)
    return outcome('unsupported_version', 'REVIEW_VERSION', 'REJECTED');
  if (state.lifecycle === 'cancelled' || event.lifecycle === 'cancelled')
    return outcome('operator_cancelled', 'STOP', 'CANCELLED');
  if (state.writeStatus === 'possible_unresolved' || event.writeStatus === 'possible_unresolved')
    return outcome('possible_write_unresolved', 'MANUAL_RECONCILIATION');
  for (const loss of LOSS_ORDER)
    if (state.lifecycle === loss || event.lifecycle === loss) return outcome(loss, 'FRESH_SELECTION');
  if (state.workerGeneration === null || event.workerGeneration === null
      || state.workerGeneration !== event.workerGeneration)
    return outcome('worker_context_mismatch', 'FRESH_SELECTION');
  if (event.authentication !== 'none') return outcome(AUTH_REASONS[event.authentication], 'MANUAL_AUTH');
  if (event.dialog !== 'none') return outcome(DIALOG_REASONS[event.dialog], 'MANUAL_DIALOG');
  if (event.navigation === 'tab_closed' || event.navigation === 'tab_replaced')
    return outcome(event.navigation, 'FRESH_SELECTION');
  if (state.tabSlot === null || event.tabSlot === null) return outcome('selection_missing', 'FRESH_SELECTION');
  if (state.tabSlot !== event.tabSlot) return outcome('tab_mismatch', 'FRESH_SELECTION');
  if (state.originToken === null || event.originToken === null) return outcome('origin_missing', 'FRESH_SELECTION');
  if (state.originToken !== event.originToken || event.navigation === 'cross_origin')
    return outcome('cross_origin', 'FRESH_SELECTION');
  if (Object.hasOwn(NAVIGATION_REASONS, event.navigation))
    return outcome(NAVIGATION_REASONS[event.navigation], 'FRESH_SELECTION');
  if (state.documentGeneration === null || event.documentGeneration === null)
    return outcome('document_generation_missing', 'FRESH_SELECTION');
  if (state.documentGeneration !== event.documentGeneration)
    return outcome('document_generation_mismatch', 'FRESH_SELECTION');
  if (state.contextGeneration === null || event.contextGeneration === null)
    return outcome('context_generation_missing', 'FRESH_SELECTION');
  if (state.contextGeneration !== event.contextGeneration)
    return outcome('context_generation_mismatch', 'FRESH_SELECTION');
  if (event.sequence === state.sequence) return outcome('duplicate_observation', 'FRESH_SELECTION');
  if (event.sequence < state.sequence) return outcome('delayed_observation', 'FRESH_SELECTION');
  if (event.sequence > state.sequence + 1) return outcome('observation_gap', 'FRESH_SELECTION');
  if (state.projectSlot === null || event.projectSlot === null || state.branchSlot === null || event.branchSlot === null)
    return outcome('target_missing', 'MANUAL_TARGET');
  if (state.projectSlot !== event.projectSlot || state.branchSlot !== event.branchSlot)
    return outcome('target_mismatch', 'MANUAL_TARGET');
  if (event.evidence !== 'complete') return outcome(EVIDENCE_REASONS[event.evidence], 'MANUAL_PAGE');
  // shortcut: supplied pairs have no replay history, upgrade only with separately authorized lifecycle enforcement.
  return outcome('synthetic_stable', 'REVIEW_FIXTURE', 'SYNTHETIC_DIAGNOSTIC');
}
