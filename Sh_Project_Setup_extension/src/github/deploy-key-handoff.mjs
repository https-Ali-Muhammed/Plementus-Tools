const domains = Object.freeze({
  selection: Object.freeze(['empty', 'valid', 'invalid', 'conflict']),
  structure: Object.freeze(['empty', 'matched', 'invalid', 'unknown', 'unsupported', 'conflict']),
  context: Object.freeze(['current', 'unknown', 'stale', 'conflict', 'denied']),
  publicKeyAvailability: Object.freeze(['unavailable', 'unknown', 'operator_reports_available']),
  permission: Object.freeze(['read_only', 'write_requested', 'unknown']),
  event: Object.freeze(['start', 'key_available', 'confirm', 'defer', 'reject', 'cancel',
    'returned', 'attest', 'observe_match', 'observe_conflict', 'unknown_result', 'invalidate']),
});
const counters = Object.freeze(['attempt', 'planGeneration', 'contextGeneration']);
const fields = Object.freeze(['version', ...counters, 'selectionIndex', ...Object.keys(domains), 'possibleWrite']);
const facts = Object.freeze(['selectionIndex', 'selection', 'structure', 'context', 'permission', 'publicKeyAvailability']);
const terminal = Object.freeze(['NO_ACTION', 'BLOCKED', 'CANCELLED']);
const restartable = Object.freeze([...terminal, 'MANUAL_REVIEW', 'STALE_CONTEXT']);

function parse(text) {
  if (typeof text !== 'string' || text.length > 8192 || !/^[\x20-\x7e]*$/.test(text)) return null;
  try {
    const input = JSON.parse(text);
    // Round-tripping rejects duplicate keys, alternate encodings and noncanonical numbers.
    if (!input || typeof input !== 'object' || Array.isArray(input) || JSON.stringify(input) !== text ||
        Object.keys(input).length !== fields.length || fields.some(key => !Object.hasOwn(input, key)) ||
        input.version !== 1 || typeof input.possibleWrite !== 'boolean' ||
        counters.some(key => !Number.isInteger(input[key]) || input[key] < 1 || input[key] > 1000000) ||
        Object.entries(domains).some(([key, values]) => !values.includes(input[key])) ||
        (input.selection === 'empty' ? input.selectionIndex !== null :
          !Number.isInteger(input.selectionIndex) || input.selectionIndex < 0 || input.selectionIndex > 15)) return null;
    return input;
  } catch { return null; }
}

function blockingReason(input) {
  if (input.selection === 'invalid') return 'selection_invalid';
  if (input.structure === 'invalid') return 'structure_invalid';
  if (input.context === 'denied') return 'permission_denied';
  if (input.permission === 'write_requested') return 'write_unsupported';
  return null;
}

/**
 * Memory-only synthetic handoff. send accepts one complete canonical JSON event.
 * Native intrinsics are assumed pristine. No result grants real authority.
 */
export function createFixtureDeployKeyHandoff() {
  let bound = null;
  let state = 'AWAITING_OPERATOR';
  let reason = 'none';
  let possibleWrite = false;
  let reconciliationRequired = false;
  let reviewRecorded = false;

  const snapshot = () => Object.freeze({
    version: 1, attempt: bound?.attempt ?? null, planGeneration: bound?.planGeneration ?? null,
    contextGeneration: bound?.contextGeneration ?? null, selectionIndex: bound?.selectionIndex ?? null,
    state, reason, permission: 'read_only', evidenceTier: 'SIMULATED', fixtureOnly: true,
    scenarioOutcome: state, reviewRecorded, reconciliationRequired, nextStep: 'manual',
    accountVerified: false, permissionVerified: false, approvalGranted: false,
    executionAuthorized: false, mutationAuthorized: false, trustedContinuingContext: false,
    associationVerified: false, checkoutVerified: false, moduleInstalled: false, effectsApplied: false,
  });
  const move = (next, why) => {
    state = next;
    reason = why;
    if (possibleWrite && ['RECONCILE_REQUIRED', 'BLOCKED', 'CANCELLED'].includes(next)) reconciliationRequired = true;
    return snapshot();
  };
  const invalidate = why => move(possibleWrite ? 'RECONCILE_REQUIRED' : 'STALE_CONTEXT', why);
  const admit = input => {
    bound = input;
    reviewRecorded = false;
    possibleWrite = input.possibleWrite;
    const blocked = blockingReason(input);
    if (blocked) return move('BLOCKED', blocked);
    if (possibleWrite) return move('RECONCILE_REQUIRED', 'outcome_unknown');
    if (input.context === 'stale') return move('STALE_CONTEXT', 'context_stale');
    if (input.selection === 'conflict') return move('MANUAL_REVIEW', 'selection_conflict');
    if (input.context === 'conflict' || input.structure === 'conflict') return move('MANUAL_REVIEW', 'target_conflict');
    if (['unknown', 'unsupported'].includes(input.structure)) return move('MANUAL_REVIEW', 'structure_unknown');
    if (input.context === 'unknown' || input.permission === 'unknown') return move('MANUAL_REVIEW', 'context_unknown');
    if ((input.selection === 'empty') !== (input.structure === 'empty')) return move('MANUAL_REVIEW', 'target_conflict');
    if (input.selection === 'empty') return move('NO_ACTION', 'no_selection');
    return move(input.publicKeyAvailability === 'operator_reports_available' ? 'REVIEW_REQUIRED' : 'AWAITING_OPERATOR',
      input.publicKeyAvailability === 'operator_reports_available' ? 'review_required' : 'key_unavailable');
  };

  const send = text => {
    const input = parse(text);
    if (!input) return terminal.includes(state) ? snapshot() : move('BLOCKED', 'invalid_input');

    // A new attempt needs fresh generations; no event can reconcile a possible write here.
    if (input.event === 'start' && bound && !possibleWrite && restartable.includes(state) &&
        input.attempt > bound.attempt && input.planGeneration >= bound.planGeneration &&
        input.contextGeneration >= bound.contextGeneration &&
        (input.planGeneration > bound.planGeneration || input.contextGeneration > bound.contextGeneration)) return admit(input);
    if (terminal.includes(state)) {
      // Late uncertainty can add an obligation without reviving the stopped attempt.
      possibleWrite ||= input.possibleWrite;
      reconciliationRequired ||= possibleWrite;
      return snapshot();
    }
    possibleWrite ||= input.possibleWrite;
    if (!bound) {
      if (input.event !== 'start') return move('BLOCKED', 'invalid_transition');
      return admit(input);
    }
    const blocked = blockingReason(input);
    if (blocked) return move('BLOCKED', blocked);
    if (state === 'RECONCILE_REQUIRED') {
      if (input.event === 'cancel') return move('CANCELLED', 'operator_cancelled');
      if (input.event === 'invalidate') return invalidate('context_stale');
      return move('BLOCKED', 'invalid_transition');
    }
    if (input.event === 'start') return move(possibleWrite ? 'RECONCILE_REQUIRED' : 'BLOCKED', 'invalid_transition');
    if (counters.some(key => input[key] !== bound[key])) return invalidate('context_stale');
    const drift = facts.find(key => input[key] !== bound[key] &&
      !(key === 'publicKeyAvailability' && input.event === 'key_available'));
    if (drift) return invalidate(['selectionIndex', 'selection', 'structure'].includes(drift) || input.context === 'conflict' ?
      'target_conflict' : 'context_stale');
    if (input.event === 'cancel') return move('CANCELLED', 'operator_cancelled');
    if (input.event === 'invalidate') return invalidate('context_stale');
    if (input.event === 'key_available' && state === 'AWAITING_OPERATOR') {
      if (possibleWrite) return move('RECONCILE_REQUIRED', 'outcome_unknown');
      bound = { ...bound, publicKeyAvailability: input.publicKeyAvailability };
      return move(input.publicKeyAvailability === 'operator_reports_available' ? 'REVIEW_REQUIRED' : 'AWAITING_OPERATOR',
        input.publicKeyAvailability === 'operator_reports_available' ? 'review_required' : 'key_unavailable');
    }
    if (state === 'REVIEW_REQUIRED') {
      if (possibleWrite && ['defer', 'confirm'].includes(input.event)) return move('RECONCILE_REQUIRED', 'outcome_unknown');
      if (input.event === 'defer') return move('AWAITING_OPERATOR', 'deferred');
      if (input.event === 'reject') return move('BLOCKED', 'operator_rejected');
      if (input.event === 'confirm') {
        reviewRecorded = true;
        // The operator can save outside this controller as soon as handoff starts.
        possibleWrite = true;
        return move('MANUAL_CONFIGURATION', 'none');
      }
    }
    if (input.event === 'returned' && state === 'MANUAL_CONFIGURATION') return move('AWAITING_VERIFICATION', 'verification_pending');
    if (input.event === 'attest' && state === 'AWAITING_VERIFICATION') return move('OPERATOR_ATTESTED', 'operator_report_only');
    if (input.event === 'observe_match' && ['AWAITING_VERIFICATION', 'OPERATOR_ATTESTED'].includes(state)) {
      return move('ASSOCIATION_OBSERVED', 'association_match');
    }
    if (possibleWrite && ['unknown_result', 'observe_conflict'].includes(input.event)) {
      return move('RECONCILE_REQUIRED', input.event === 'unknown_result' ? 'outcome_unknown' : 'association_conflict');
    }
    return move('BLOCKED', 'invalid_transition');
  };
  return Object.freeze({ send, snapshot });
}
