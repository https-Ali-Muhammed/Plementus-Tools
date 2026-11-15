import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { assessFixtureCustomerApps } from '../src/customer-odoo/apps-fixture-adapter.mjs';
import { simulateFixtureCustomerAppsInstall } from '../src/customer-odoo/apps-mock-install-fixture-flow.mjs';
import { assessFixturePlementusDatabaseInfo } from '../src/plementus/database-info-fixture-adapter.mjs';
import { assessFixturePlementusNativeConnectHandoff } from '../src/plementus/native-connect-handoff-fixture-flow.mjs';

const flags = 'browserObserved permissionVerified accountVerified rightsVerified subscriptionVerified approvalGranted executionAuthorized mutationAuthorized installationAuthorized trustedContinuingContext associationVerified productionDatabaseVerified stagingCopyVerified moduleInstalled effectsApplied readAuthorized writeAuthorized'.split(' ');
const infoMarkers = ['plementus-database-info', 'database-info-candidates', 'database-name', 'live-url', 'test-url', 'database-user',
  'review-submit-checkpoint', 'submit-control', 'connect-live-checkpoint', 'connect-live-control', 'connect-test-checkpoint', 'connect-test-control'];
const connectMarkers = ['plementus-database-info', 'database-info-candidates', 'connect-live-checkpoint', 'connect-live-control', 'connect-test-checkpoint', 'connect-test-control'];

function patch(envelopes, changes = {}) {
  for (const [i, values] of Object.entries(changes)) Object.assign(envelopes[i], values);
  return envelopes;
}
function apps(changes) {
  return patch([
    { version: 1, databaseToken: 'fixture-customer-db-001', environment: 'production', moduleToken: 'pl_auth',
      documentGeneration: 4, contextGeneration: 5, sequence: 7, review: 'reviewed', lifecycle: 'active' },
    { version: 1, page: 'customer-odoo-apps', databaseToken: 'fixture-customer-db-001', selectedEnvironment: 'production',
      testEnvironment: 'available', moduleToken: 'pl_auth', plAuthMarker: 'module-pl-auth', plAuthAvailability: 'available',
      plAuthInstallation: 'not_installed', cedarLabelsMarker: 'module-cedar-labels', cedarLabelsAvailability: 'available',
      cedarLabelsInstallation: 'static_installed', approval: 'awaiting_approval', installControl: 'disabled',
      documentGeneration: 4, contextGeneration: 5, sequence: 8, authentication: 'none', lifecycle: 'active' },
  ], changes);
}
function install(changes) {
  const common = { version: 1, databaseToken: 'fixture-customer-db-001', environment: 'production', moduleToken: 'pl_auth',
    documentGeneration: 6, contextGeneration: 7, sequence: 20 };
  // This round is new caller data, not authenticated continuity from discovery.
  const discovery = assessFixtureCustomerApps(...apps({ 0: { review: 'reviewed' } }).map(JSON.stringify));
  boundary(discovery);
  return patch([discovery,
    { ...common, operation: 'simulate', priorOutcome: 'none', lifecycle: 'active', authentication: 'none' },
    { ...common, sequence: 21, decision: 'synthetic_approved' },
    { ...common, sequence: 22, status: 'attempted', outcome: 'reported_success' },
    { ...common, sequence: 23, state: 'synthetic_installed', testEnvironment: 'available',
      cedarLabelsInstallation: 'static_installed', lifecycle: 'active', authentication: 'none' },
  ], changes);
}
function info(changes) {
  return patch([
    { version: 1, page: 'plementus-database-info', projectToken: 'fixture-plementus-project-001',
      documentGeneration: 10, contextGeneration: 11, sequence: 30, review: 'pending', lifecycle: 'active' },
    { version: 1, projectToken: 'fixture-plementus-project-001', projectOccurrences: 1, projectLabel: 'Cedar Workshop Demo',
      documentGeneration: 10, contextGeneration: 11, sequence: 31, markers: [...infoMarkers],
      databaseName: 'fixture_cedar_db', liveUrl: 'https://cedar-live.invalid', testUrl: 'https://cedar-test.invalid', databaseUser: 'fixture_cedar_user',
      databaseNameReadonly: true, liveUrlReadonly: true, testUrlReadonly: true, databaseUserReadonly: true,
      reviewState: 'awaiting-review', submitControl: 'disabled', connectLiveState: 'not-connected', connectLiveControl: 'disabled',
      connectTestState: 'not-connected', connectTestControl: 'disabled', authentication: 'none', lifecycle: 'active' },
  ], changes);
}
function connect(target = 'live', changes) {
  const common = { version: 1, projectToken: 'fixture-plementus-project-001', environment: target === 'live' ? 'production' : 'test',
    target, documentGeneration: 12, contextGeneration: 13, sequence: 40 };
  return patch([
    { ...common, page: 'plementus-database-info', priorOutcome: 'none', lifecycle: 'active', authentication: 'none' },
    { ...common, sequence: 41, projectOccurrences: 1, projectLabel: 'Cedar Workshop Demo', markers: [...connectMarkers],
      liveEnvironment: 'production', testEnvironment: 'test', liveState: 'not-connected', liveControl: 'disabled',
      testState: 'not-connected', testControl: 'disabled', databaseInfo: 'unsubmitted-preview', nativeKnowledge: 'unknown',
      observation: 'current', lifecycle: 'active', authentication: 'none' },
    { ...common, sequence: 42, decision: 'synthetic_acknowledged' },
    { ...common, sequence: 43, attempt: 'not_attempted', outcome: 'none', verification: 'none' },
  ], changes);
}
function boundary(out) {
  assert.equal(out.evidenceTier, 'SIMULATED');
  assert.equal(out.provenance, 'SYNTHETIC_UNTRUSTED');
  assert.equal(out.fixtureOnly, true);
  assert.ok(Object.isFrozen(out));
  assert.equal(flags.length, 17);
  for (const flag of flags) assert.equal(out[flag], false, flag);
  assert.deepEqual(Object.keys(out).filter(k => typeof out[k] === 'boolean'), ['fixtureOnly', ...flags]);
  assert.ok(Object.values(out).every(v => ['string', 'number', 'boolean'].includes(typeof v)));
  const encoded = JSON.stringify(out);
  assert.ok(encoded.length <= 2048);
  assert.match(encoded, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(encoded, /fixture-customer|fixture-plementus|fixture_cedar|https?:|<|@|fixture-secret/);
  if ('realConnectionState' in out) {
    assert.equal(out.realConnectionState, 'UNVERIFIED');
    assert.equal(out.retryPolicy, 'NEVER_AUTOMATIC');
  }
  return out;
}
function check(fn, inputs, reason, nextStep, states = {}) {
  const out = boundary(fn(...inputs.map(JSON.stringify)));
  assert.equal(out.reason, reason);
  assert.equal(out.nextStep, nextStep);
  for (const [key, value] of Object.entries(states)) assert.equal(out[key], value, key);
  return out;
}
const required = { syntheticReconciliation: 'SYNTHETIC_REQUIRED' };
const idle = { 3: { status: 'not_attempted', outcome: 'none' }, 4: { state: 'missing' } };

// BEGIN SCENARIOS: pure tests are also executed independently in capability-trapped VMs.
test('P16 A1: Apps recognition separates available pl_auth from static cedar_labels', () => {
  check(assessFixtureCustomerApps, apps(), 'synthetic_not_installed', 'MANUAL_APPS_REVIEW', {
    syntheticAvailability: 'SYNTHETIC_AVAILABLE', syntheticInstallation: 'SYNTHETIC_NOT_INSTALLED',
    syntheticEnvironment: 'PRODUCTION_PREVIEW', syntheticTestEnvironment: 'AVAILABLE_NOT_SELECTED',
  });
  check(assessFixtureCustomerApps, apps({ 0: { moduleToken: 'cedar_labels' }, 1: { moduleToken: 'cedar_labels' } }),
    'synthetic_static_installed', 'MANUAL_APPS_REVIEW', { syntheticInstallation: 'SYNTHETIC_STATIC_INSTALLED' });
});
test('P16 A2: approval, attempt, and separate post-attempt listing are three different claims', () => {
  check(simulateFixtureCustomerAppsInstall, install(idle), 'mock_not_attempted', 'MOCK_REVIEW', {
    syntheticApproval: 'SYNTHETIC_MOCK_APPROVED', syntheticAttempt: 'SYNTHETIC_NOT_ATTEMPTED', syntheticInstallation: 'SYNTHETIC_UNCONFIRMED',
  });
  check(simulateFixtureCustomerAppsInstall, install({ 4: { state: 'missing' } }), 'mock_post_missing', 'MOCK_RECONCILIATION', required);
  check(simulateFixtureCustomerAppsInstall, install(), 'mock_installed_confirmed', 'MOCK_REVIEW_COMPLETE', {
    syntheticAttempt: 'SYNTHETIC_ATTEMPTED', syntheticInstallation: 'SYNTHETIC_INSTALLED_LISTING_CONFIRMED',
  });
});
test('P16 A3: four fictional fields remain distinct and await manual Database INFO review', () => {
  for (const review of ['pending', 'reviewed']) check(assessFixturePlementusDatabaseInfo, info({ 0: { review } }),
    'synthetic_mapping_ready', 'MANUAL_DATABASE_INFO_REVIEW', {
      syntheticDatabaseName: 'SYNTHETIC_DATABASE_NAME_EXAMPLE', syntheticLiveUrl: 'SYNTHETIC_LIVE_URL_EXAMPLE',
      syntheticTestUrl: 'SYNTHETIC_TEST_URL_EXAMPLE', syntheticDatabaseUser: 'SYNTHETIC_DATABASE_USER_EXAMPLE',
      syntheticPreview: 'SYNTHETIC_READY_FOR_MANUAL_REVIEW', syntheticReview: 'SYNTHETIC_AWAITING_REVIEW', syntheticControls: 'SYNTHETIC_DISABLED',
    });
});
for (const [target, label, checkpoint] of [['live', 'SYNTHETIC_LIVE', 'SYNTHETIC_CONNECT_LIVE_CHECKPOINT'],
  ['test', 'SYNTHETIC_TEST', 'SYNTHETIC_CONNECT_TEST_CHECKPOINT']]) test(`P16 A4: independent ${target} native handoff is manual only`, () => {
  check(assessFixturePlementusNativeConnectHandoff, connect(target), 'native_knowledge_unverified', 'MANUAL_NATIVE_CONNECT_REVIEW', {
    syntheticTarget: label, syntheticCheckpoint: checkpoint, syntheticAcknowledgment: 'SYNTHETIC_HANDOFF_ACK_ONLY',
    fixtureBaseline: 'SYNTHETIC_NOT_CONNECTED', databaseInfoState: 'SYNTHETIC_UNSUBMITTED_PREVIEW',
  });
});
test('P16 A5: logical interaction composes only the accepted discovery wire, without trusted cross-system identity', () => {
  const discovery = check(assessFixtureCustomerApps, apps(), 'synthetic_not_installed', 'MANUAL_APPS_REVIEW');
  const round = install(); round[0] = discovery;
  const installed = check(simulateFixtureCustomerAppsInstall, round, 'mock_installed_confirmed', 'MOCK_REVIEW_COMPLETE');
  const mapped = check(assessFixturePlementusDatabaseInfo, info(), 'synthetic_mapping_ready', 'MANUAL_DATABASE_INFO_REVIEW');
  const live = check(assessFixturePlementusNativeConnectHandoff, connect('live'), 'native_knowledge_unverified', 'MANUAL_NATIVE_CONNECT_REVIEW');
  const separateTest = check(assessFixturePlementusNativeConnectHandoff, connect('test'), 'native_knowledge_unverified', 'MANUAL_NATIVE_CONNECT_REVIEW');
  for (const out of [discovery, installed, mapped, live, separateTest]) {
    assert.equal(out.associationVerified, false); assert.equal(out.trustedContinuingContext, false);
  }
  assert.equal(discovery.syntheticInstallation, 'SYNTHETIC_NOT_INSTALLED');
  assert.equal(installed.syntheticInstallation, 'SYNTHETIC_INSTALLED_LISTING_CONFIRMED');
  assert.notEqual(live.syntheticTarget, separateTest.syntheticTarget);
});
test('P16 B1: Production discovery and install results cannot be reused for Test', () => {
  check(assessFixtureCustomerApps, apps({ 0: { environment: 'test' } }), 'environment_mismatch', 'MANUAL_FIXTURE_TARGET');
  check(assessFixtureCustomerApps, apps({ 0: { environment: 'test' }, 1: { selectedEnvironment: 'test' } }), 'environment_baseline_conflict', 'MANUAL_FIXTURE_TARGET');
  check(simulateFixtureCustomerAppsInstall, install({ 4: { environment: 'test' } }), 'observation_context_mismatch', 'FRESH_FIXTURE_CONTEXT', required);
  const round = install(); for (const side of [1, 2, 3, 4]) round[side].environment = 'test';
  check(simulateFixtureCustomerAppsInstall, round, 'target_incompatible', 'MOCK_REVIEW', required);
});
test('P16 B1: Live and Test values cannot be swapped or copied', () => {
  for (const values of [{ liveUrl: 'https://cedar-test.invalid' }, { testUrl: 'https://cedar-live.invalid' },
    { liveUrl: 'https://cedar-test.invalid', testUrl: 'https://cedar-live.invalid' }])
    check(assessFixturePlementusDatabaseInfo, info({ 1: values }), 'field_conflicting', 'MANUAL_DATABASE_INFO_REVIEW');
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 0: { environment: 'test' } }), 'target_environment_conflict', 'MANUAL_CHECKPOINT');
  check(assessFixturePlementusNativeConnectHandoff, connect('test', { 1: { testEnvironment: 'production' } }), 'checkpoint_environment_conflict', 'MANUAL_CHECKPOINT');
});
test('P16 B2: mismatched customer database and Plementus project fail independently', () => {
  check(assessFixtureCustomerApps, apps({ 1: { databaseToken: 'fixture-customer-db-002' } }), 'database_mismatch', 'MANUAL_FIXTURE_TARGET');
  check(simulateFixtureCustomerAppsInstall, install({ 3: { databaseToken: 'fixture-customer-db-002' } }), 'attempt_context_mismatch', 'FRESH_FIXTURE_CONTEXT', required);
  check(assessFixturePlementusDatabaseInfo, info({ 1: { projectToken: 'fixture-plementus-project-002' } }), 'project_conflict', 'MANUAL_DATABASE_INFO_REVIEW');
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 1: { projectToken: 'fixture-plementus-project-002' } }), 'snapshot_projectToken_mismatch', 'FRESH_FIXTURE_CONTEXT');
});
test('P16 B2: foreign-context approval and acknowledgment cannot inherit readiness', () => {
  check(simulateFixtureCustomerAppsInstall, install({ 2: { contextGeneration: 8 } }), 'approval_context_mismatch', 'FRESH_FIXTURE_CONTEXT', required);
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 2: { contextGeneration: 14 } }), 'acknowledgment_contextGeneration_mismatch', 'FRESH_FIXTURE_CONTEXT');
});
for (const target of ['live', 'test']) test(`P16 B2: ${target} rejects the other environment's snapshot acknowledgment and result`, () => {
  for (const [side, kind] of [[1, 'snapshot'], [2, 'acknowledgment'], [3, 'claim']]) {
    const f = connect(target), other = connect(target === 'live' ? 'test' : 'live');
    if (side === 3) Object.assign(other[3], { attempt: 'claimed_attempt', outcome: 'reported_success' });
    f[side] = other[side];
    check(assessFixturePlementusNativeConnectHandoff, f, kind + '_environment_mismatch', 'FRESH_FIXTURE_CONTEXT', side === 3 ? required : {});
  }
});
test('P16 B3: static installed listing is incompatible with an installation attempt', () => {
  const cedar = check(assessFixtureCustomerApps, apps({ 0: { moduleToken: 'cedar_labels' }, 1: { moduleToken: 'cedar_labels' } }),
    'synthetic_static_installed', 'MANUAL_APPS_REVIEW');
  const round = install(); round[0] = cedar;
  check(simulateFixtureCustomerAppsInstall, round, 'discovery_incompatible', 'MOCK_REVIEW');
  check(simulateFixtureCustomerAppsInstall, install({ 3: { status: 'not_attempted', outcome: 'none' } }), 'observation_without_attempt', 'MOCK_REVIEW');
});
test('P16 B3: simulated results cannot be promoted or passed as another evaluator contract', () => {
  const installed = check(simulateFixtureCustomerAppsInstall, install(), 'mock_installed_confirmed', 'MOCK_REVIEW_COMPLETE');
  const round = install(); round[0] = installed;
  check(simulateFixtureCustomerAppsInstall, round, 'discovery_incompatible', 'MOCK_REVIEW');
  const forged = install(); forged[0] = { ...forged[0], evidenceTier: 'PLEMENTUS_DEMO_VERIFIED', moduleInstalled: true };
  check(simulateFixtureCustomerAppsInstall, forged, 'discovery_incompatible', 'MOCK_REVIEW');
  const mapped = check(assessFixturePlementusDatabaseInfo, info(), 'synthetic_mapping_ready', 'MANUAL_DATABASE_INFO_REVIEW');
  const f = connect(); f[1] = mapped;
  check(assessFixturePlementusNativeConnectHandoff, f, 'invalid_input', 'CORRECT_FIXTURE');
  assert.throws(() => { installed.moduleInstalled = true; }, TypeError);
});

for (const decision of ['missing', 'declined']) test(`P16 C1: ${decision} approval blocks and preserves any attempted effect`, () => {
  check(simulateFixtureCustomerAppsInstall, install({ ...idle, 2: { decision } }), 'mock_approval_' + decision, 'MOCK_REVIEW');
  check(simulateFixtureCustomerAppsInstall, install({ 2: { decision } }), 'mock_approval_' + decision, 'MOCK_RECONCILIATION', required);
});
for (const state of ['missing', 'stale', 'unknown', 'conflicting']) test(`P16 C1: ${state} post-state cannot confirm installation`, () => {
  check(simulateFixtureCustomerAppsInstall, install({ 4: { state } }), 'mock_post_' + state, 'MOCK_RECONCILIATION', required);
});
test('P16 C1: failed install requires independent absent listing and rejects contrary post-state', () => {
  check(simulateFixtureCustomerAppsInstall, install({ 3: { outcome: 'failed' }, 4: { state: 'synthetic_not_installed' } }),
    'mock_attempt_failed', 'MOCK_REVIEW', { syntheticInstallation: 'SYNTHETIC_NOT_INSTALLED' });
  check(simulateFixtureCustomerAppsInstall, install({ 3: { outcome: 'failed' } }), 'mock_result_conflict', 'MOCK_RECONCILIATION', required);
  check(simulateFixtureCustomerAppsInstall, install({ 4: { state: 'synthetic_not_installed' } }), 'mock_result_conflict', 'MOCK_RECONCILIATION', required);
});
for (const outcome of ['unknown', 'timeout']) test(`P16 C2: ${outcome} plus apparent completion still needs reconciliation`, () => {
  check(simulateFixtureCustomerAppsInstall, install({ 3: { outcome } }), 'mock_result_' + outcome, 'MOCK_RECONCILIATION', required);
  check(simulateFixtureCustomerAppsInstall, install({ 1: { priorOutcome: 'uncertain' } }), 'mock_reconciliation_required', 'MOCK_RECONCILIATION', required);
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 0: { priorOutcome: 'uncertain' } }), 'prior_outcome_uncertain', 'MANUAL_RECONCILIATION', required);
});
for (const [outcome, reason] of [['reported_success', 'outcome_reported_success_claimed'], ['unknown', 'outcome_unknown_claimed'],
  ['failed', 'outcome_failed_claimed'], ['interrupted', 'outcome_interrupted_claimed']]) test(`P16 C2: native ${outcome} stays an unverified claim`, () => {
  for (const target of ['live', 'test']) check(assessFixturePlementusNativeConnectHandoff,
    connect(target, { 3: { attempt: 'claimed_attempt', outcome } }), reason, 'MANUAL_RECONCILIATION', required);
});
test('P16 C2: independent verification and later acknowledgment cannot clear possible native effects', () => {
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 3: { attempt: 'claimed_attempt', outcome: 'reported_success', verification: 'claimed_independent_verification' } }),
    'independent_verification_claim_untrusted', 'MANUAL_RECONCILIATION', required);
  for (const target of ['live', 'test']) {
    const later = connect(target, { 0: { priorOutcome: 'uncertain' } });
    later.forEach((v, i) => { v.sequence = 60 + i; });
    check(assessFixturePlementusNativeConnectHandoff, later, 'prior_outcome_uncertain', 'MANUAL_RECONCILIATION', required);
  }
});
for (const [lifecycle, installReason, nativeReason, step] of [
  ['cancelled', 'operator_cancelled', 'operator_cancelled', 'STOP'],
  ['interrupted', 'interrupted', 'interrupted', 'FRESH_FIXTURE_CONTEXT'],
  ['worker_lost', 'context_lost', 'lifecycle_worker_lost', 'FRESH_FIXTURE_CONTEXT'],
  ['session_lost', 'context_lost', 'lifecycle_session_lost', 'FRESH_FIXTURE_CONTEXT'],
]) test(`P16 C3: ${lifecycle} never resolves a possible effect`, () => {
  for (const side of [1, 4]) check(simulateFixtureCustomerAppsInstall, install({ [side]: { lifecycle } }), installReason, step, required);
  for (const side of [0, 1]) check(assessFixturePlementusNativeConnectHandoff,
    connect('live', { [side]: { lifecycle }, 3: { attempt: 'claimed_attempt', outcome: 'unknown' } }), nativeReason, step, required);
  check(assessFixtureCustomerApps, apps({ 0: { lifecycle } }), installReason, step);
  check(assessFixturePlementusDatabaseInfo, info({ 0: { lifecycle } }), installReason, step);
});
for (const [name, installSequence, nativeSequence, nativeReason] of [
  ['duplicate', 20, 40, 'claim_duplicate_observation'], ['delayed', 19, 39, 'claim_delayed_observation'],
  ['out-of-order', 22, 42, 'claim_delayed_observation'], ['gap', 24, 44, 'claim_observation_gap'],
]) test(`P16 C4: ${name} possible-effect observations fail closed`, () => {
  check(simulateFixtureCustomerAppsInstall, install({ 4: { sequence: installSequence } }), 'observation_sequence_mismatch', 'FRESH_FIXTURE_CONTEXT', required);
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 3: { sequence: nativeSequence, attempt: 'claimed_attempt', outcome: 'unknown' } }),
    nativeReason, 'FRESH_FIXTURE_CONTEXT', required);
});
test('P16 C4: stale generations and observations cannot inherit completed previews', () => {
  check(assessFixtureCustomerApps, apps({ 1: { documentGeneration: 3 } }), 'document_generation_mismatch', 'FRESH_FIXTURE_CONTEXT');
  check(assessFixturePlementusDatabaseInfo, info({ 1: { contextGeneration: 10 } }), 'context_generation_mismatch', 'FRESH_FIXTURE_CONTEXT');
  check(simulateFixtureCustomerAppsInstall, install({ 4: { state: 'stale' } }), 'mock_post_stale', 'MOCK_RECONCILIATION', required);
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 1: { observation: 'stale' }, 3: { attempt: 'claimed_attempt', outcome: 'unknown' } }),
    'observation_stale', 'MANUAL_RECONCILIATION', required);
  for (const [sequence, reason] of [[30, 'duplicate_observation'], [29, 'delayed_observation'], [32, 'observation_gap']])
    check(assessFixturePlementusDatabaseInfo, info({ 1: { sequence } }), reason, 'FRESH_FIXTURE_CONTEXT');
});
test('P16 C5: explicit mock reconciliation is not real reconciliation or permission to retry', () => {
  const reconciled = check(simulateFixtureCustomerAppsInstall, install({ 1: { operation: 'reconcile', priorOutcome: 'uncertain' },
    2: { decision: 'missing' }, 3: { status: 'not_attempted', outcome: 'none' } }), 'mock_reconciled_installed', 'MOCK_REVIEW_COMPLETE', {
    syntheticReconciliation: 'SYNTHETIC_RECONCILED', syntheticAttempt: 'SYNTHETIC_NOT_ATTEMPTED',
  });
  assert.equal(reconciled.effectsApplied, false);
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 0: { priorOutcome: 'uncertain' } }), 'prior_outcome_uncertain', 'MANUAL_RECONCILIATION', required);
  check(simulateFixtureCustomerAppsInstall, install({ 1: { operation: 'reconcile', priorOutcome: 'uncertain' } }),
    'reconciliation_attempt_conflict', 'MOCK_RECONCILIATION', required);
  check(simulateFixtureCustomerAppsInstall, install({ 1: { operation: 'retry', priorOutcome: 'uncertain' } }), 'invalid_input', 'CORRECT_FIXTURE');
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 0: { automaticRetry: true } }), 'invalid_input', 'CORRECT_FIXTURE');
});
test('P16 C5: replay and omitted history stay inert and cannot authenticate reconciliation', () => {
  for (const [fn, f] of [[assessFixtureCustomerApps, apps], [simulateFixtureCustomerAppsInstall, install],
    [assessFixturePlementusDatabaseInfo, info], [assessFixturePlementusNativeConnectHandoff, connect]]) {
    const inputs = f().map(JSON.stringify), first = boundary(fn(...inputs)), second = boundary(fn(...inputs));
    assert.deepEqual(first, second); assert.notEqual(first, second);
  }
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 0: { priorOutcome: 'uncertain' } }), 'prior_outcome_uncertain', 'MANUAL_RECONCILIATION', required);
  // Omitted history cannot be detected by these stateless contracts; this is never safe-resumption evidence.
  check(assessFixturePlementusNativeConnectHandoff, connect(), 'native_knowledge_unverified', 'MANUAL_NATIVE_CONNECT_REVIEW');
});
test('P16 D1: unknown modules fields pages and native knowledge require manual handling', () => {
  check(assessFixtureCustomerApps, apps({ 0: { moduleToken: 'fixture-missing-module' } }), 'module_missing', 'MANUAL_APPS_REVIEW');
  check(assessFixtureCustomerApps, apps({ 1: { page: null } }), 'page_missing', 'MANUAL_FIXTURE_TARGET');
  check(assessFixturePlementusDatabaseInfo, info({ 1: { databaseUser: 'unknown' } }), 'unknown_mapping', 'MANUAL_DATABASE_INFO_REVIEW');
  check(assessFixturePlementusDatabaseInfo, info({ 1: { markers: [...infoMarkers, 'unknown-marker'] } }), 'unknown_mapping', 'MANUAL_DATABASE_INFO_REVIEW');
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 1: { nativeKnowledge: 'claimed-known' } }), 'native_knowledge_unverified', 'MANUAL_NATIVE_CONNECT_REVIEW');
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 1: { markers: [...connectMarkers, 'unknown-marker'] } }), 'unknown_marker', 'MANUAL_CHECKPOINT');
});
test('P16 D1: arbitrary selectors and execution requests are rejected without echo', () => {
  for (const [fn, f] of [[assessFixtureCustomerApps, apps], [simulateFixtureCustomerAppsInstall, install],
    [assessFixturePlementusDatabaseInfo, info], [assessFixturePlementusNativeConnectHandoff, connect]]) {
    const inputs = f(); inputs[1].selector = '#fixture-secret';
    check(fn, inputs, 'invalid_input', 'CORRECT_FIXTURE');
  }
});
test('P16 D2: complete Database INFO preview never means submitted or connected', () => {
  check(assessFixturePlementusDatabaseInfo, info({ 0: { review: 'missing' } }), 'review_checkpoint_missing', 'MANUAL_DATABASE_INFO_REVIEW', {
    syntheticPreview: 'SYNTHETIC_COMPLETE', syntheticReview: 'UNRESOLVED',
  });
  for (const reviewState of ['reported-submitted', 'reported-saved'])
    check(assessFixturePlementusDatabaseInfo, info({ 1: { reviewState } }), 'review_checkpoint_unverified', 'MANUAL_DATABASE_INFO_REVIEW');
  for (const databaseInfo of ['reported-submitted', 'reported-saved'])
    check(assessFixturePlementusNativeConnectHandoff, connect('live', { 1: { databaseInfo } }), 'database_info_' + databaseInfo, 'MANUAL_CHECKPOINT');
  for (const key of ['liveState', 'testState']) check(assessFixturePlementusNativeConnectHandoff,
    connect('live', { 1: { [key]: 'reported-connected' } }), 'connection_baseline_unverified', 'MANUAL_RECONCILIATION', required);
});
for (const authentication of ['login', 'mfa', 'captcha']) test(`P16 D3: ${authentication} is a human checkpoint for all four evaluators`, () => {
  check(assessFixtureCustomerApps, apps({ 1: { authentication } }), 'authentication_required', 'MANUAL_AUTH');
  check(simulateFixtureCustomerAppsInstall, install({ 1: { authentication } }), 'authentication_required', 'MANUAL_AUTH', required);
  check(assessFixturePlementusDatabaseInfo, info({ 1: { authentication } }), 'authentication_required', 'MANUAL_AUTH');
  check(assessFixturePlementusNativeConnectHandoff, connect('live', { 1: { authentication }, 0: { priorOutcome: 'uncertain' } }),
    'authentication_' + authentication, 'MANUAL_AUTH', required);
});

// BEGIN FILE CHECKS: only the Node test harness reads local source and published fixtures.
test('P16 E2: published fixtures ground the inputs without inventing post-attempt HTML evidence', () => {
  const html = readFileSync(new URL('../fixtures/customer-odoo/apps.html', import.meta.url), 'utf8');
  const plementus = readFileSync(new URL('../fixtures/plementus/database-info.html', import.meta.url), 'utf8');
  assert.match(html, /data-database-id="fixture-customer-db-001"/);
  assert.match(html, /module-pl-auth" data-availability="available" data-installation="not-installed"/);
  assert.match(html, /module-cedar-labels" data-availability="available" data-installation="installed"/);
  assert.match(html, /install-control" disabled/);
  assert.match(plementus, /data-project-id="fixture-plementus-project-001"/);
  const s = info()[1];
  for (const [key, marker] of [['databaseName', 'database-name'], ['liveUrl', 'live-url'], ['testUrl', 'test-url'], ['databaseUser', 'database-user']])
    assert.ok(plementus.includes(`data-fixture="${marker}" value="${s[key]}" readonly`));
  for (const target of ['live', 'test']) {
    assert.ok(plementus.includes(`connect-${target}-checkpoint" data-state="not-connected"`));
    assert.ok(plementus.includes(`connect-${target}-control" disabled`));
  }
  for (const text of [html, plementus]) {
    assert.match(text, /SIMULATED TEST FIXTURE — NOT REAL CUSTOMER SYSTEM/);
    assert.doesNotMatch(text, /<script\b|<form\b/);
  }
});
test('phase16 parent-exit isolation: all pure scenarios run independently without external capabilities or production consumers', () => {
  const self = readFileSync(new URL('./phase16-parent-offline-exit.test.mjs', import.meta.url), 'utf8');
  const sources = [
    ['customer-odoo/apps-fixture-adapter.mjs', 'assessFixtureCustomerApps'],
    ['customer-odoo/apps-mock-install-fixture-flow.mjs', 'simulateFixtureCustomerAppsInstall'],
    ['plementus/database-info-fixture-adapter.mjs', 'assessFixturePlementusDatabaseInfo'],
    ['plementus/native-connect-handoff-fixture-flow.mjs', 'assessFixturePlementusNativeConnectHandoff'],
  ];
  const imports = [...self.matchAll(/^import .* from '([^']+)';$/gm)].map(m => m[1]);
  assert.deepEqual(imports, ['node:test', 'node:assert/strict', 'node:fs', 'node:vm', ...sources.map(([file]) => '../src/' + file)]);
  assert.doesNotMatch(self, /\b(?:writeFileSync|appendFileSync|execFileSync|spawn|fetch|setTimeout)\s*\(/);
  const names = 'import require fetch XMLHttpRequest WebSocket chrome browser localStorage sessionStorage indexedDB process eval Function globalThis window document navigator Date performance setTimeout setInterval setImmediate queueMicrotask Worker Promise console location caches clipboard credentials'.split(' ');
  let touches = 0;
  function sandbox() {
    const context = {};
    for (const key of names) Object.defineProperty(context, key, { get() { touches++; throw Error('forbidden capability'); } });
    return context;
  }
  const context = sandbox();
  for (const [file, name] of sources) {
    const source = readFileSync(new URL('../src/' + file, import.meta.url), 'utf8');
    assert.doesNotMatch(source, new RegExp('\\b(?:' + names.join('|') + ')\\b'));
    assert.doesNotMatch(source, /Math\.random|node:|child_process|adapters\/|\.click\s*\(/);
    context[name] = runInNewContext(source.replace('export function', 'function') + '\n' + name + ';', sandbox(),
      { codeGeneration: { strings: false, wasm: false }, timeout: 1000 });
    for (const f of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true }))
      if (f.isFile() && /\.(mjs|js|html|json)$/.test(f.name) && f.name !== file.split('/').at(-1)) {
        const body = readFileSync(`${f.parentPath}/${f.name}`, 'utf8');
        assert.ok(!body.includes(name) && !body.includes(file.split('/').at(-1)), f.name);
      }
  }
  let executed = 0;
  context.assert = assert;
  context.test = (name, callback) => { callback(); executed++; };
  const pure = self.slice(0, self.indexOf('// BEGIN FILE CHECKS')).replace(/^import .*;\n/gm, '');
  runInNewContext('"use strict";\n' + pure, context, { codeGeneration: { strings: false, wasm: false }, timeout: 5000 });
  assert.ok(executed > 0);
  assert.equal(touches, 0);
});
