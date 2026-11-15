const FLAGS = Object.freeze({
  browserObserved: false, permissionVerified: false, accountVerified: false, rightsVerified: false,
  subscriptionVerified: false, approvalGranted: false, executionAuthorized: false, mutationAuthorized: false,
  installationAuthorized: false, trustedContinuingContext: false, associationVerified: false,
  productionDatabaseVerified: false, stagingCopyVerified: false, moduleInstalled: false,
  effectsApplied: false, readAuthorized: false, writeAuthorized: false,
});
const DISCOVERY = JSON.stringify({ version: 1, evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true,
  classification: 'MANUAL_REVIEW', reason: 'synthetic_not_installed', nextStep: 'MANUAL_APPS_REVIEW',
  syntheticEnvironment: 'PRODUCTION_PREVIEW', syntheticTestEnvironment: 'AVAILABLE_NOT_SELECTED',
  syntheticAvailability: 'SYNTHETIC_AVAILABLE', syntheticInstallation: 'SYNTHETIC_NOT_INSTALLED',
  syntheticApproval: 'SYNTHETIC_AWAITING_APPROVAL', ...FLAGS,
});
const IDENTITY = [['version', 1, 999], ['databaseToken', [null, 'fixture-customer-db-001', 'fixture-customer-db-002']],
  ['environment', [null, 'production', 'test']], ['moduleToken', [null, 'pl_auth', 'cedar_labels', 'fixture-missing-module']],
  ['documentGeneration', 1, 1000000, true], ['contextGeneration', 1, 1000000, true], ['sequence', 0, 1000000]];
const LIFECYCLE = [['lifecycle', ['active', 'cancelled', 'interrupted', 'worker_lost', 'session_lost']],
  ['authentication', ['none', 'login', 'mfa', 'captcha', 'session_expired']]];
const SCHEMAS = [
  [...IDENTITY, ['operation', ['simulate', 'reconcile']], ['priorOutcome', ['none', 'uncertain']], ...LIFECYCLE],
  [...IDENTITY, ['decision', ['missing', 'declined', 'conflicting', 'stale', 'synthetic_approved']]],
  [...IDENTITY, ['status', ['not_attempted', 'attempted']], ['outcome', ['none', 'reported_success', 'failed', 'timeout', 'unknown', 'missing', 'stale']]],
  [...IDENTITY, ['state', ['missing', 'stale', 'unknown', 'conflicting', 'synthetic_installed', 'synthetic_not_installed']],
    ['testEnvironment', ['available', 'selected', 'missing', 'stale', 'unknown', 'conflicting']],
    ['cedarLabelsInstallation', ['static_installed', 'not_installed', 'missing', 'stale', 'unknown', 'conflicting']], ...LIFECYCLE],
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
    if (Array.isArray(domain)) {
      if (!domain.includes(v)) return null;
    } else if (!(nullable && v === null) && !(Number.isInteger(v) && v >= domain && v <= maximum)) return null;
  }
  return JSON.stringify(value) === text ? value : null;
}

function result(reason, nextStep, states = {}) {
  return Object.freeze({ version: 1, evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true,
    classification: nextStep === 'MOCK_REVIEW_COMPLETE' ? 'SIMULATED_CONFIRMATION'
      : nextStep === 'MOCK_RECONCILIATION' ? 'MOCK_RECONCILE_REQUIRED' : 'STOP', reason, nextStep,
    syntheticEnvironment: 'UNRESOLVED', syntheticTestEnvironment: 'UNRESOLVED', syntheticAvailability: 'UNRESOLVED',
    syntheticApproval: 'UNRESOLVED', syntheticAttempt: 'UNRESOLVED', syntheticInstallation: 'UNRESOLVED',
    syntheticReconciliation: 'UNRESOLVED', ...states, ...FLAGS,
  });
}

export function simulateFixtureCustomerAppsInstall(discoveryText, contextText, approvalText, attemptText, observationText) {
  const texts = [discoveryText, contextText, approvalText, attemptText, observationText];
  if (texts.some(v => typeof v !== 'string')) return result('invalid_input', 'CORRECT_FIXTURE');
  if (texts.some((v, i) => v.length > (i === 0 ? 2048 : 1024))) return result('input_too_large', 'CORRECT_FIXTURE');
  const parsed = texts.slice(1).map((v, i) => parse(v, SCHEMAS[i]));
  if (parsed.includes(null)) return result('invalid_input', 'CORRECT_FIXTURE');
  if (parsed.some(v => v.version !== 1)) return result('unsupported_version', 'REVIEW_VERSION');
  if (discoveryText !== DISCOVERY) return result('discovery_incompatible', 'MOCK_REVIEW');
  const [c, a, t, o] = parsed;
  const reported = t.status === 'attempted' || t.outcome !== 'none';
  const uncertain = c.priorOutcome === 'uncertain' || reported;
  const states = { syntheticApproval: 'SYNTHETIC_UNREVIEWED',
    syntheticAttempt: reported ? 'SYNTHETIC_ATTEMPT_REPORTED' : 'SYNTHETIC_NOT_ATTEMPTED',
    syntheticInstallation: 'SYNTHETIC_UNCONFIRMED',
    syntheticReconciliation: uncertain ? 'SYNTHETIC_REQUIRED' : 'SYNTHETIC_NOT_REQUIRED' };
  const stop = (reason, step) => result(reason, step, states);
  const barrier = [c, o];
  if (barrier.some(v => v.lifecycle === 'cancelled')) return stop('operator_cancelled', 'STOP');
  if (barrier.some(v => ['worker_lost', 'session_lost'].includes(v.lifecycle))) return stop('context_lost', 'FRESH_FIXTURE_CONTEXT');
  if (barrier.some(v => v.lifecycle === 'interrupted')) return stop('interrupted', 'FRESH_FIXTURE_CONTEXT');
  if (barrier.some(v => v.authentication !== 'none')) return stop('authentication_required', 'MANUAL_AUTH');
  if (c.priorOutcome === 'uncertain' && c.operation === 'simulate') return stop('mock_reconciliation_required', 'MOCK_RECONCILIATION');
  if (c.databaseToken !== 'fixture-customer-db-001' || c.environment !== 'production' || c.moduleToken !== 'pl_auth')
    return stop('target_incompatible', 'MOCK_REVIEW');
  if (c.documentGeneration === null || c.contextGeneration === null) return stop('context_missing', 'FRESH_FIXTURE_CONTEXT');
  if (c.sequence > 999997) return stop('sequence_exhausted', 'FRESH_FIXTURE_CONTEXT');
  for (const [i, v] of [a, t, o].entries()) {
    const kind = ['approval', 'attempt', 'observation'][i];
    if (IDENTITY.slice(1, 6).some(([key]) => v[key] !== c[key])) return stop(kind + '_context_mismatch', 'FRESH_FIXTURE_CONTEXT');
    if (v.sequence !== c.sequence + i + 1) return stop(kind + '_sequence_mismatch', 'FRESH_FIXTURE_CONTEXT');
  }
  if (o.testEnvironment !== 'available' || o.cedarLabelsInstallation !== 'static_installed')
    return stop('post_catalog_conflict', uncertain ? 'MOCK_RECONCILIATION' : 'MOCK_REVIEW');
  Object.assign(states, { syntheticEnvironment: 'PRODUCTION_PREVIEW', syntheticTestEnvironment: 'AVAILABLE_NOT_SELECTED',
    syntheticAvailability: 'SYNTHETIC_AVAILABLE' });
  const installed = o.state === 'synthetic_installed';
  const listed = installed || o.state === 'synthetic_not_installed';
  if (c.operation === 'reconcile') {
    if (c.priorOutcome !== 'uncertain') return stop('reconciliation_without_history', 'MOCK_REVIEW');
    if (a.decision !== 'missing' || t.status !== 'not_attempted' || t.outcome !== 'none')
      return stop('reconciliation_attempt_conflict', 'MOCK_RECONCILIATION');
    if (!listed) return stop('mock_post_' + o.state, 'MOCK_RECONCILIATION');
    states.syntheticReconciliation = 'SYNTHETIC_RECONCILED';
    states.syntheticInstallation = installed ? 'SYNTHETIC_INSTALLED_LISTING_CONFIRMED' : 'SYNTHETIC_NOT_INSTALLED';
    return stop(installed ? 'mock_reconciled_installed' : 'mock_reconciled_not_installed', 'MOCK_REVIEW_COMPLETE');
  }
  if (a.decision !== 'synthetic_approved') return stop('mock_approval_' + a.decision, uncertain ? 'MOCK_RECONCILIATION' : 'MOCK_REVIEW');
  states.syntheticApproval = 'SYNTHETIC_MOCK_APPROVED';
  if (t.status === 'not_attempted') {
    if (t.outcome !== 'none') return stop('attempt_envelope_conflict', 'MOCK_RECONCILIATION');
    if (o.state !== 'missing') return stop('observation_without_attempt', 'MOCK_REVIEW');
    return stop('mock_not_attempted', 'MOCK_REVIEW');
  }
  states.syntheticAttempt = 'SYNTHETIC_ATTEMPTED';
  if (!['reported_success', 'failed'].includes(t.outcome)) return stop('mock_result_' + t.outcome, 'MOCK_RECONCILIATION');
  if (!listed) return stop('mock_post_' + o.state, 'MOCK_RECONCILIATION');
  if ((t.outcome === 'reported_success') !== installed) return stop('mock_result_conflict', 'MOCK_RECONCILIATION');
  states.syntheticReconciliation = 'SYNTHETIC_NOT_REQUIRED';
  states.syntheticInstallation = installed ? 'SYNTHETIC_INSTALLED_LISTING_CONFIRMED' : 'SYNTHETIC_NOT_INSTALLED';
  // shortcut: caller history is unauthenticated; upgrade only under a separately authorized durable context contract.
  return stop(installed ? 'mock_installed_confirmed' : 'mock_attempt_failed', installed ? 'MOCK_REVIEW_COMPLETE' : 'MOCK_REVIEW');
}
