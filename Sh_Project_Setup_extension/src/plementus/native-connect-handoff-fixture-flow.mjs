const LIFECYCLES = ['active', 'cancelled', 'interrupted', 'worker_lost', 'tab_lost', 'context_lost', 'session_lost'];
const AUTHENTICATION = ['none', 'login', 'mfa', 'captcha', 'session_expired'];
const CONNECTIONS = ['not-connected', 'missing', 'unknown', 'reported-connected'];
const CONTROLS = ['disabled', 'enabled', 'missing', 'unknown'];
const MARKERS = ['plementus-database-info', 'database-info-candidates', 'connect-live-checkpoint', 'connect-live-control',
  'connect-test-checkpoint', 'connect-test-control', 'unknown-marker'];
const COMMON = [
  ['version', 1, 999], ['projectToken', [null, 'fixture-plementus-project-001', 'fixture-plementus-project-002']],
  ['environment', [null, 'production', 'test']], ['target', [null, 'live', 'test']],
  ['documentGeneration', 1, 1000000, true], ['contextGeneration', 1, 1000000, true], ['sequence', 0, 1000000],
];
const SCHEMAS = [
  [...COMMON, ['page', [null, 'plementus-database-info', 'customer-odoo-apps']], ['priorOutcome', ['none', 'uncertain']],
    ['lifecycle', LIFECYCLES], ['authentication', AUTHENTICATION]],
  [...COMMON, ['projectOccurrences', 0, 2], ['projectLabel', [null, 'Cedar Workshop Demo', 'unknown']], ['markers', MARKERS],
    ['liveEnvironment', ['production', 'test', 'missing']], ['testEnvironment', ['production', 'test', 'missing']],
    ['liveState', CONNECTIONS], ['liveControl', CONTROLS], ['testState', CONNECTIONS], ['testControl', CONTROLS],
    ['databaseInfo', ['unsubmitted-preview', 'missing', 'unknown', 'reported-submitted', 'reported-saved']],
    ['nativeKnowledge', ['unknown', 'claimed-known']], ['observation', ['current', 'missing', 'stale', 'conflicting']],
    ['lifecycle', LIFECYCLES], ['authentication', AUTHENTICATION]],
  [...COMMON, ['decision', ['missing', 'pending', 'declined', 'interrupted', 'cancelled', 'stale', 'duplicated', 'conflicting', 'synthetic_acknowledged']]],
  [...COMMON, ['attempt', ['not_attempted', 'claimed_attempt']], ['outcome', ['none', 'reported_success', 'failed', 'unknown', 'interrupted']],
    ['verification', ['none', 'claimed_independent_verification']]],
];

function parse(text, schema) {
  if (!/^[\x20-\x7e]+$/.test(text)) return null;
  let value;
  try { value = JSON.parse(text); } catch { return null; }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null;
  const keys = Object.keys(value);
  if (keys.length !== schema.length) return null;
  for (let i = 0; i < schema.length; i++) {
    const [key, domain, maximum, nullable] = schema[i];
    if (keys[i] !== key) return null;
    const v = value[key];
    if (key === 'markers') {
      if (!Array.isArray(v) || v.length > 12 || v.some(marker => !domain.includes(marker))) return null;
    } else if (Array.isArray(domain)) {
      if (!domain.includes(v)) return null;
    } else if (!(nullable && v === null) && !(Number.isInteger(v) && v >= domain && v <= maximum)) return null;
  }
  return JSON.stringify(value) === text ? value : null;
}

function result(reason, nextStep, states = {}) {
  return Object.freeze({ version: 1, evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true,
    classification: nextStep === 'MANUAL_NATIVE_CONNECT_REVIEW' ? 'MANUAL_HANDOFF'
      : nextStep === 'MANUAL_RECONCILIATION' ? 'MANUAL_RECONCILIATION' : 'STOP', reason, nextStep,
    syntheticTarget: 'UNRESOLVED', syntheticCheckpoint: 'UNRESOLVED', syntheticAcknowledgment: 'UNRESOLVED',
    syntheticAttempt: 'UNRESOLVED', syntheticOutcome: 'UNRESOLVED', syntheticReconciliation: 'UNRESOLVED',
    fixtureBaseline: 'UNRESOLVED', databaseInfoState: 'UNRESOLVED', realConnectionState: 'UNVERIFIED', retryPolicy: 'NEVER_AUTOMATIC', ...states,
    browserObserved: false, permissionVerified: false, accountVerified: false, rightsVerified: false,
    subscriptionVerified: false, approvalGranted: false, executionAuthorized: false, mutationAuthorized: false,
    installationAuthorized: false, trustedContinuingContext: false, associationVerified: false,
    productionDatabaseVerified: false, stagingCopyVerified: false, moduleInstalled: false,
    effectsApplied: false, readAuthorized: false, writeAuthorized: false,
  });
}

export function assessFixturePlementusNativeConnectHandoff(contextText, snapshotText, acknowledgmentText, claimText) {
  const texts = [contextText, snapshotText, acknowledgmentText, claimText];
  if (texts.some(text => typeof text !== 'string')) return result('invalid_input', 'CORRECT_FIXTURE');
  if (texts.some(text => text.length > 2048)) return result('input_too_large', 'CORRECT_FIXTURE');
  const inputs = texts.map((text, i) => parse(text, SCHEMAS[i]));
  if (inputs.includes(null)) return result('invalid_input', 'CORRECT_FIXTURE');
  if (inputs.some(v => v.version !== 1)) return result('unsupported_version', 'REVIEW_VERSION');
  const [c, s, a, claim] = inputs;
  const attemptClaimed = claim.attempt === 'claimed_attempt' || claim.outcome !== 'none' || claim.verification !== 'none';
  const uncertain = attemptClaimed || c.priorOutcome === 'uncertain'
    || [s.liveState, s.testState].some(state => ['unknown', 'reported-connected'].includes(state));
  const states = { syntheticAcknowledgment: 'SYNTHETIC_UNREVIEWED',
    syntheticAttempt: attemptClaimed ? 'SYNTHETIC_ATTEMPT_CLAIMED' : 'SYNTHETIC_NO_ATTEMPT_CLAIM',
    syntheticOutcome: 'SYNTHETIC_CLAIM_' + claim.outcome.toUpperCase(),
    syntheticReconciliation: uncertain ? 'SYNTHETIC_REQUIRED' : 'SYNTHETIC_NOT_INDICATED' };
  const stop = (reason, step = uncertain ? 'MANUAL_RECONCILIATION' : 'MANUAL_CHECKPOINT') => result(reason, step, states);
  const contexts = [c, s];
  if (contexts.some(v => v.lifecycle === 'cancelled')) return stop('operator_cancelled', 'STOP');
  for (const state of ['worker_lost', 'tab_lost', 'context_lost', 'session_lost'])
    if (contexts.some(v => v.lifecycle === state)) return stop('lifecycle_' + state, 'FRESH_FIXTURE_CONTEXT');
  if (contexts.some(v => v.lifecycle === 'interrupted')) return stop('interrupted', 'FRESH_FIXTURE_CONTEXT');
  for (const state of AUTHENTICATION.slice(1))
    if (contexts.some(v => v.authentication === state)) return stop('authentication_' + state, 'MANUAL_AUTH');
  if (c.page !== 'plementus-database-info' || !s.markers.includes('plementus-database-info') || !s.markers.includes('database-info-candidates'))
    return stop('unrecognized_layout');
  if (c.projectToken === null || s.projectOccurrences === 0 || s.projectLabel === null) return stop('project_missing');
  if (c.projectToken !== 'fixture-plementus-project-001' || s.projectOccurrences !== 1 || s.projectLabel !== 'Cedar Workshop Demo')
    return stop('project_conflict');
  if (c.target === null) return stop('target_missing');
  if (c.environment === null) return stop('environment_missing');
  if (c.environment !== (c.target === 'live' ? 'production' : 'test')) return stop('target_environment_conflict');
  for (const key of ['documentGeneration', 'contextGeneration'])
    if (c[key] === null) return stop(key + '_missing', 'FRESH_FIXTURE_CONTEXT');
  if (c.sequence > 999997) return stop('sequence_exhausted', 'FRESH_FIXTURE_CONTEXT');
  for (const [i, kind] of ['snapshot', 'acknowledgment', 'claim'].entries()) {
    const v = inputs[i + 1];
    for (const key of ['projectToken', 'environment', 'target', 'documentGeneration', 'contextGeneration'])
      if (v[key] !== c[key]) return stop(kind + '_' + key + '_mismatch', 'FRESH_FIXTURE_CONTEXT');
    if (v.sequence !== c.sequence + i + 1) {
      const reason = v.sequence === c.sequence ? 'duplicate_observation'
        : v.sequence < c.sequence + i + 1 ? 'delayed_observation' : 'observation_gap';
      return stop(kind + '_' + reason, 'FRESH_FIXTURE_CONTEXT');
    }
  }
  states.syntheticTarget = c.target === 'live' ? 'SYNTHETIC_LIVE' : 'SYNTHETIC_TEST';
  states.syntheticCheckpoint = c.target === 'live' ? 'SYNTHETIC_CONNECT_LIVE_CHECKPOINT' : 'SYNTHETIC_CONNECT_TEST_CHECKPOINT';
  if (s.observation !== 'current') return stop('observation_' + s.observation);
  if (s.markers.includes('unknown-marker')) return stop('unknown_marker');
  if (new Set(s.markers).size !== s.markers.length) return stop('duplicate_marker');
  if ([s.liveControl, s.testControl].includes('enabled')) return stop('control_conflict', 'STOP');
  if ([s.liveControl, s.testControl].some(v => v !== 'disabled')
    || ['connect-live-control', 'connect-test-control'].some(marker => !s.markers.includes(marker))) return stop('control_missing_or_unknown');
  if (['connect-live-checkpoint', 'connect-test-checkpoint'].some(marker => !s.markers.includes(marker))) return stop('checkpoint_missing');
  if (s.liveEnvironment !== 'production' || s.testEnvironment !== 'test') return stop('checkpoint_environment_conflict');
  if (s.liveState !== 'not-connected' || s.testState !== 'not-connected') return stop('connection_baseline_unverified');
  states.fixtureBaseline = 'SYNTHETIC_NOT_CONNECTED';
  if (s.databaseInfo !== 'unsubmitted-preview') return stop('database_info_' + s.databaseInfo);
  states.databaseInfoState = 'SYNTHETIC_UNSUBMITTED_PREVIEW';
  if (a.decision !== 'synthetic_acknowledged')
    return stop('acknowledgment_' + a.decision, ['declined', 'cancelled'].includes(a.decision) ? 'STOP' : undefined);
  states.syntheticAcknowledgment = 'SYNTHETIC_HANDOFF_ACK_ONLY';
  if (c.priorOutcome === 'uncertain') return stop('prior_outcome_uncertain');
  if (claim.attempt === 'not_attempted' && (claim.outcome !== 'none' || claim.verification !== 'none')) return stop('claim_conflict');
  if (claim.verification !== 'none') return stop('independent_verification_claim_untrusted');
  if (claim.attempt === 'claimed_attempt') return stop(claim.outcome === 'none' ? 'attempt_claimed' : 'outcome_' + claim.outcome + '_claimed');
  // shortcut: caller history cannot prove freshness or native behavior; upgrade only under a separately authorized real-context contract.
  return stop('native_knowledge_unverified', 'MANUAL_NATIVE_CONNECT_REVIEW');
}
