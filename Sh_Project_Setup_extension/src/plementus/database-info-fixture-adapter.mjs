const PROJECTS = [null, 'fixture-plementus-project-001', 'fixture-plementus-project-002'];
const GENERATIONS = [['documentGeneration', 1, 1000000, true], ['contextGeneration', 1, 1000000, true]];
const LIFECYCLES = ['active', 'cancelled', 'interrupted', 'worker_lost', 'session_lost'];
const CONTROLS = ['disabled', 'enabled', 'missing', 'unknown'];
const CONNECTIONS = ['not-connected', 'missing', 'unknown', 'reported-connected'];
const MARKERS = ['plementus-database-info', 'database-info-candidates', 'database-name', 'live-url', 'test-url', 'database-user',
  'review-submit-checkpoint', 'submit-control', 'connect-live-checkpoint', 'connect-live-control',
  'connect-test-checkpoint', 'connect-test-control', 'unknown-marker'];
const VALUES = [null, 'unknown', 'fixture_cedar_db', 'https://cedar-live.invalid', 'https://cedar-test.invalid', 'fixture_cedar_user'];
const FIELDS = [
  ['databaseName', 'database-name', 'fixture_cedar_db', 'syntheticDatabaseName', 'SYNTHETIC_DATABASE_NAME_EXAMPLE'],
  ['liveUrl', 'live-url', 'https://cedar-live.invalid', 'syntheticLiveUrl', 'SYNTHETIC_LIVE_URL_EXAMPLE'],
  ['testUrl', 'test-url', 'https://cedar-test.invalid', 'syntheticTestUrl', 'SYNTHETIC_TEST_URL_EXAMPLE'],
  ['databaseUser', 'database-user', 'fixture_cedar_user', 'syntheticDatabaseUser', 'SYNTHETIC_DATABASE_USER_EXAMPLE'],
];
const SCHEMAS = [
  [['version', 1, 999], ['page', [null, 'plementus-database-info', 'customer-odoo-apps']], ['projectToken', PROJECTS],
    ...GENERATIONS, ['sequence', 0, 999999], ['review', ['missing', 'pending', 'reviewed', 'declined']], ['lifecycle', LIFECYCLES]],
  [['version', 1, 999], ['projectToken', PROJECTS], ['projectOccurrences', 0, 2], ['projectLabel', [null, 'Cedar Workshop Demo', 'unknown']],
    ...GENERATIONS, ['sequence', 1, 1000000], ['markers', MARKERS], ...FIELDS.map(([key]) => [key, VALUES]),
    ...FIELDS.map(([key]) => [key + 'Readonly', [true, false]]),
    ['reviewState', ['awaiting-review', 'missing', 'unknown', 'reported-submitted', 'reported-saved']], ['submitControl', CONTROLS],
    ['connectLiveState', CONNECTIONS], ['connectLiveControl', CONTROLS], ['connectTestState', CONNECTIONS], ['connectTestControl', CONTROLS],
    ['authentication', ['none', 'login', 'mfa', 'captcha', 'session_expired']], ['lifecycle', LIFECYCLES]],
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
      if (!Array.isArray(v) || v.length > 24 || v.some(marker => !domain.includes(marker))) return null;
    } else if (Array.isArray(domain)) {
      if (!domain.includes(v)) return null;
    } else if (!(nullable && v === null) && !(Number.isInteger(v) && v >= domain && v <= maximum)) return null;
  }
  return JSON.stringify(value) === text ? value : null;
}

function result(reason, nextStep, states = {}) {
  return Object.freeze({ version: 1, evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true,
    classification: nextStep === 'MANUAL_DATABASE_INFO_REVIEW' ? 'MANUAL_REVIEW' : 'STOP', reason, nextStep,
    syntheticProject: 'UNRESOLVED', syntheticDatabaseName: 'UNRESOLVED', syntheticLiveUrl: 'UNRESOLVED',
    syntheticTestUrl: 'UNRESOLVED', syntheticDatabaseUser: 'UNRESOLVED', syntheticPreview: 'UNRESOLVED',
    syntheticReview: 'UNRESOLVED', syntheticControls: 'UNRESOLVED', ...states,
    browserObserved: false, permissionVerified: false, accountVerified: false, rightsVerified: false,
    subscriptionVerified: false, approvalGranted: false, executionAuthorized: false, mutationAuthorized: false,
    installationAuthorized: false, trustedContinuingContext: false, associationVerified: false,
    productionDatabaseVerified: false, stagingCopyVerified: false, moduleInstalled: false,
    effectsApplied: false, readAuthorized: false, writeAuthorized: false,
  });
}

export function assessFixturePlementusDatabaseInfo(requestText, snapshotText) {
  if (typeof requestText !== 'string' || typeof snapshotText !== 'string') return result('invalid_input', 'CORRECT_FIXTURE');
  if (requestText.length > 1024 || snapshotText.length > 4096) return result('input_too_large', 'CORRECT_FIXTURE');
  const r = parse(requestText, SCHEMAS[0]), s = parse(snapshotText, SCHEMAS[1]);
  if (r === null || s === null) return result('invalid_input', 'CORRECT_FIXTURE');
  if (r.version !== 1 || s.version !== 1) return result('unsupported_version', 'REVIEW_VERSION');
  const all = [r, s];
  if (all.some(v => v.lifecycle === 'cancelled')) return result('operator_cancelled', 'STOP');
  if (all.some(v => ['worker_lost', 'session_lost'].includes(v.lifecycle))) return result('context_lost', 'FRESH_FIXTURE_CONTEXT');
  if (all.some(v => v.lifecycle === 'interrupted')) return result('interrupted', 'FRESH_FIXTURE_CONTEXT');
  if (s.authentication !== 'none') return result('authentication_required', 'MANUAL_AUTH');
  for (const [key, prefix] of [['documentGeneration', 'document_generation'], ['contextGeneration', 'context_generation']]) {
    if (all.some(v => v[key] === null)) return result(prefix + '_missing', 'FRESH_FIXTURE_CONTEXT');
    if (r[key] !== s[key]) return result(prefix + '_mismatch', 'FRESH_FIXTURE_CONTEXT');
  }
  if (s.sequence === r.sequence) return result('duplicate_observation', 'FRESH_FIXTURE_CONTEXT');
  if (s.sequence < r.sequence) return result('delayed_observation', 'FRESH_FIXTURE_CONTEXT');
  if (s.sequence > r.sequence + 1) return result('observation_gap', 'FRESH_FIXTURE_CONTEXT');
  const manual = 'MANUAL_DATABASE_INFO_REVIEW';
  if (r.page !== 'plementus-database-info' || !s.markers.includes('plementus-database-info') || !s.markers.includes('database-info-candidates'))
    return result('unrecognized_layout', manual);
  if (all.some(v => v.projectToken === null) || s.projectOccurrences === 0 || s.projectLabel === null) return result('project_missing', manual);
  if (all.some(v => v.projectToken !== 'fixture-plementus-project-001') || s.projectOccurrences !== 1 || s.projectLabel !== 'Cedar Workshop Demo')
    return result('project_conflict', manual);
  const states = { syntheticProject: 'SYNTHETIC_PROJECT_MATCH' };
  const stop = (reason, step = manual) => result(reason, step, states);
  if (s.markers.includes('unknown-marker')) return stop('unknown_mapping');
  if (new Set(s.markers).size !== s.markers.length) return stop('duplicate_marker');
  const controls = [s.submitControl, s.connectLiveControl, s.connectTestControl];
  if (controls.includes('enabled')) return stop('control_conflict', 'STOP');
  if (controls.some(v => v !== 'disabled') || ['submit-control', 'connect-live-control', 'connect-test-control'].some(v => !s.markers.includes(v)))
    return stop('control_missing_or_unknown');
  states.syntheticControls = 'SYNTHETIC_DISABLED';
  if (s.connectLiveState !== 'not-connected' || s.connectTestState !== 'not-connected'
    || ['connect-live-checkpoint', 'connect-test-checkpoint'].some(v => !s.markers.includes(v))) return stop('connect_checkpoint_unverified');
  for (const [key, marker, example, output, mapped] of FIELDS)
    states[output] = !s.markers.includes(marker) || s[key] === null ? 'SYNTHETIC_MISSING'
      : s[key] === 'unknown' ? 'SYNTHETIC_UNKNOWN'
        : s[key] !== example || !s[key + 'Readonly'] ? 'SYNTHETIC_CONFLICTING' : mapped;
  const values = FIELDS.map(([, , , output]) => states[output]);
  states.syntheticPreview = 'SYNTHETIC_INCOMPLETE';
  for (const [state, reason] of [['SYNTHETIC_CONFLICTING', 'field_conflicting'], ['SYNTHETIC_MISSING', 'field_missing'], ['SYNTHETIC_UNKNOWN', 'unknown_mapping']])
    if (values.includes(state)) return stop(reason);
  states.syntheticPreview = 'SYNTHETIC_COMPLETE';
  if (r.review === 'declined') return stop('review_declined', 'STOP');
  if (!s.markers.includes('review-submit-checkpoint') || r.review === 'missing' || s.reviewState === 'missing') return stop('review_checkpoint_missing');
  if (s.reviewState !== 'awaiting-review') return stop('review_checkpoint_unverified');
  states.syntheticPreview = 'SYNTHETIC_READY_FOR_MANUAL_REVIEW';
  states.syntheticReview = 'SYNTHETIC_AWAITING_REVIEW';
  // shortcut: caller generations have no authenticated history; upgrade only under a separately authorized context contract.
  return stop('synthetic_mapping_ready');
}
