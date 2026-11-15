import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { assessFixtureProjectSetup } from '../src/odoo-sh/project-setup-fixture-flow.mjs';
import { assessFixtureRepositoryProduction } from '../src/odoo-sh/repository-production-fixture-flow.mjs';
import { assessFixtureUtilitiesModules } from '../src/odoo-sh/utilities-modules-fixture-flow.mjs';
import { assessFixtureStagingCopy } from '../src/odoo-sh/staging-neutralized-copy-fixture-flow.mjs';

const flags = 'browserObserved permissionVerified accountVerified rightsVerified subscriptionVerified approvalGranted executionAuthorized mutationAuthorized installationAuthorized trustedContinuingContext associationVerified productionDatabaseVerified stagingCopyVerified moduleInstalled effectsApplied readAuthorized writeAuthorized'.split(' ');
const falseFlags = Object.fromEntries(flags.map(f => [f, false]));
function fixture(mode = 'customer') {
  const projectToken = 'fixture-project-001', environmentToken = 'fixture-production-001';
  const documentGeneration = 4, contextGeneration = 5;
  const common = { version: 1, projectToken, environmentToken, documentGeneration, contextGeneration, sequence: 7, lifecycle: 'active' };
  const setup = [
    { version: 1, subscriptionMode: mode, referencePlaceholder: 'present', projectToken, environmentToken,
      documentGeneration, contextGeneration, sequence: 7, lifecycle: 'active', review: 'pending' },
    { version: 1, page: 'project-setup', selectedMode: mode, referencePlaceholder: 'present', projectToken, environmentToken,
      documentGeneration, contextGeneration, sequence: 8, lifecycle: 'active', authentication: 'none', evidence: 'complete', setupState: 'not_submitted' },
  ];
  const repository = [
    { version: 1, projectToken: setup[0].projectToken, repositoryToken: 'fixture-repo-001', branch: 'main', environmentToken,
      documentGeneration, contextGeneration, sequence: setup[1].sequence, lifecycle: 'active', review: 'reviewed' },
    { version: 1, projectToken, repositoryToken: 'fixture-repo-001', branch: 'main', environmentToken,
      documentGeneration, contextGeneration, sequence: 9, lifecycle: 'active', authentication: 'none', associationState: 'reported', writeOutcome: 'none' },
    { version: 1, projectToken, branch: 'main', environmentToken, documentGeneration, contextGeneration,
      sequence: 9, lifecycle: 'active', authentication: 'none', buildReadiness: 'ready', databaseReadiness: 'ready' },
  ];
  const utilities = [
    { ...common, environmentToken: repository[2].environmentToken, sequence: repository[2].sequence, utilityToken: null, moduleToken: 'pl_auth', review: 'pending' },
    { ...common, sequence: 10, authentication: 'none', utilityToken: null, handoff: 'none', writeOutcome: 'none' },
    { ...common, sequence: 10, authentication: 'none', databaseToken: 'fixture-customer-db-001', moduleToken: 'pl_auth',
      availability: 'available', installation: 'not_installed', approval: 'awaiting_approval', writeOutcome: 'none' },
  ];
  const stagingCommon = { version: 1, projectToken: setup[0].projectToken,
    sourceEnvironmentToken: repository[2].environmentToken, destinationEnvironmentToken: 'fixture-staging-001',
    sourceBranch: repository[2].branch, stagingBranch: 'develop', documentGeneration, contextGeneration,
    sequence: utilities[2].sequence, lifecycle: 'active' };
  const stagingObservation = { ...stagingCommon, sequence: 11, authentication: 'none' };
  const staging = [
    { ...stagingCommon, intent: 'neutralized_copy', review: 'pending' },
    { ...stagingObservation, environmentState: 'awaiting_copy', branchState: 'created', buildReadiness: 'pending', databaseReadiness: 'pending' },
    { ...stagingObservation, copyState: 'not_started', writeOutcome: 'none', approvalEvidence: 'missing' },
    { ...stagingObservation, neutralizationState: 'not_assessed' },
  ];
  return { setup, repository, utilities, staging };
}
function reportedFixture() {
  const f = fixture();
  f.staging[0].review = 'reviewed';
  Object.assign(f.staging[1], { environmentState: 'present', buildReadiness: 'ready', databaseReadiness: 'ready' });
  Object.assign(f.staging[2], { copyState: 'reported_complete', approvalEvidence: 'caller_reported' });
  f.staging[3].neutralizationState = 'reported_neutralized';
  return f;
}
function chainReason(f) {
  const groups = [f.setup, f.repository, f.utilities, f.staging];
  const all = groups.flat(), first = f.setup[0];
  if (all.some(v => v.projectToken !== 'fixture-project-001')
    || [...f.setup, ...f.repository, ...f.utilities].some(v => v.environmentToken !== 'fixture-production-001')
    || f.repository.some(v => v.branch !== 'main')
    || f.staging.some(v => v.sourceEnvironmentToken !== 'fixture-production-001'
      || v.destinationEnvironmentToken !== 'fixture-staging-001' || v.sourceBranch !== 'main' || v.stagingBranch !== 'develop'))
    return 'chain_target_mismatch';
  if (all.some(v => v.documentGeneration === null || v.contextGeneration === null
    || v.documentGeneration !== first.documentGeneration || v.contextGeneration !== first.contextGeneration))
    return 'chain_generation_mismatch';
  if (groups.some((group, i) => group.slice(1).some(v => v.sequence !== group[0].sequence + 1)
    || i > 0 && group[0].sequence !== groups[i - 1][1].sequence)) return 'chain_sequence_mismatch';
  return 'synthetic_chain_consistent';
}
const manualReasons = {
  setup: ['creation_review_required', 'synthetic_review_recorded', 'synthetic_submitted', 'synthetic_pending'],
  repository: ['association_review_required', 'association_not_established', 'association_pending',
    'synthetic_pair_ready', 'synthetic_both_pending', 'synthetic_build_pending', 'synthetic_database_pending'],
  utilities: ['no_optional_utilities', 'utilities_review_required', 'configuration_unverified', 'access_unverified'],
  module: ['approval_awaiting_approval', 'approval_missing', 'installation_pending', 'static_fixture_installed'],
  staging: ['copy_review_required', 'copy_review_missing', 'copy_not_started', 'copy_pending',
    'staging_build_pending', 'staging_database_pending', 'neutralization_not_assessed', 'neutralization_pending',
    'neutralization_manual_verification', 'synthetic_reported_copy_neutralization'],
};
function runChain(f, previous = null) {
  const setup = assessFixtureProjectSetup(...f.setup.map(JSON.stringify));
  const repository = assessFixtureRepositoryProduction(...f.repository.map(JSON.stringify));
  const utilities = assessFixtureUtilitiesModules(...f.utilities.map(JSON.stringify));
  const staging = assessFixtureStagingCopy(...f.staging.map(JSON.stringify));
  const stages = Object.freeze({ setup, repository, utilities, staging });
  const relation = chainReason(f);
  const possible = {
    setup: ['uncertain', 'unknown'].includes(f.setup[1].setupState),
    repository: f.repository[1].writeOutcome === 'uncertain' || f.repository[1].associationState === 'unknown',
    utilities: f.utilities.slice(1).some(v => v.writeOutcome === 'uncertain'),
    staging: f.staging[2].writeOutcome === 'uncertain' || f.staging[2].copyState === 'unknown',
  };
  let reconciliation = null, stop = relation === 'synthetic_chain_consistent' ? null : ['chain', relation];
  for (const [name, diagnostic] of Object.entries(stages)) {
    if (possible[name] || diagnostic.nextStep === 'MANUAL_RECONCILIATION') {
      const cause = name === 'utilities'
        ? [diagnostic.utilitiesReason, diagnostic.moduleReason].find(v => /unknown|conflict|failed|untrusted/.test(v))
        : diagnostic.reason;
      reconciliation ??= [name, possible[name] ? 'possible_write_unresolved' : cause ?? diagnostic.reason];
    }
    const ordinary = name === 'utilities'
      ? manualReasons.utilities.includes(diagnostic.utilitiesReason) && manualReasons.module.includes(diagnostic.moduleReason)
      : manualReasons[name].includes(diagnostic.reason);
    if (!ordinary) stop ??= [name, name === 'utilities' && manualReasons.utilities.includes(diagnostic.utilitiesReason)
      ? diagnostic.moduleReason : diagnostic.reason];
  }
  if (previous?.syntheticDisposition === 'UNRESOLVED_RECONCILIATION')
    reconciliation = [previous.blockingStage, previous.blockingReason];
  if (previous?.syntheticDisposition === 'HARD_STOP') stop = [previous.blockingStage, previous.blockingReason];
  const blocker = reconciliation ?? stop ?? ['none', 'none'];
  const report = Object.freeze({ version: 1, evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true,
    syntheticDisposition: reconciliation ? 'UNRESOLVED_RECONCILIATION' : stop ? 'HARD_STOP' : 'MANUAL_CONTINUATION',
    chainReason: relation, setupReason: setup.reason, repositoryReason: repository.reason,
    utilitiesReason: utilities.utilitiesReason, moduleReason: utilities.moduleReason, stagingReason: staging.reason,
    possibleWriteObligation: Object.values(possible).some(Boolean) || previous?.possibleWriteObligation === 'UNRESOLVED'
      ? 'UNRESOLVED' : 'NONE_REPORTED', blockingStage: blocker[0], blockingReason: blocker[1], ...falseFlags });
  return Object.freeze({ stages, report });
}
function offlineExit(outcomes) {
  const keys = ['requiredCases', 'connectedConsistency', 'isolation', 'regressions'];
  const pass = outcomes !== null && typeof outcomes === 'object' && !Array.isArray(outcomes)
    && JSON.stringify(Object.keys(outcomes)) === JSON.stringify(keys) && keys.every(k => outcomes[k] === 'PASS');
  return Object.freeze({ version: 1, evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true,
    decision: pass ? 'FIXTURE_EXIT_PASS' : 'FIXTURE_EXIT_BLOCKED', ...falseFlags });
}

// Scenario assertions are deliberately separate from the pure test-only harness.
const exercised = [];
function markers(out) {
  assert.ok(out && typeof out === 'object');
  assert.ok(Object.isFrozen(out));
  assert.equal(out.evidenceTier, 'SIMULATED');
  assert.equal(out.provenance, 'SYNTHETIC_UNTRUSTED');
  assert.equal(out.fixtureOnly, true);
  for (const f of flags) assert.equal(out[f], false, f);
  assert.ok(Object.values(out).every(v => ['string', 'number', 'boolean'].includes(typeof v)));
  assert.ok(JSON.stringify(out).length <= 2048);
  assert.doesNotMatch(JSON.stringify(out), /fixture-project|fixture-secret|https?:|@|PRODUCTION_READY/);
}
function run(f = fixture(), disposition = 'MANUAL_CONTINUATION', previous = null) {
  const out = runChain(f, previous);
  assert.equal(out?.report?.syntheticDisposition, disposition);
  assert.deepEqual(Object.keys(out), ['stages', 'report']);
  assert.deepEqual(Object.keys(out.stages), ['setup', 'repository', 'utilities', 'staging']);
  assert.ok(Object.isFrozen(out)); assert.ok(Object.isFrozen(out.stages));
  for (const stage of Object.values(out.stages)) markers(stage);
  markers(out.report);
  assert.deepEqual(Object.keys(out.report), ['version', 'evidenceTier', 'provenance', 'fixtureOnly',
    'syntheticDisposition', 'chainReason', 'setupReason', 'repositoryReason', 'utilitiesReason', 'moduleReason',
    'stagingReason', 'possibleWriteObligation', 'blockingStage', 'blockingReason', ...flags]);
  assert.deepEqual(runChain(f, previous), out);
  exercised.push([JSON.stringify(f), previous, JSON.stringify(out)]);
  return out;
}
for (const mode of ['customer', 'partner-trial']) test(`C01 ${mode}: four ordered immutable diagnostics retain manual checkpoints`, () => {
  const out = run(fixture(mode));
  assert.equal(out.stages.setup.reason, 'creation_review_required');
  assert.equal(out.stages.repository.reason, 'synthetic_pair_ready');
  assert.equal(out.stages.utilities.reason, 'approval_awaiting_approval');
  assert.equal(out.stages.staging.reason, 'copy_review_required');
  assert.equal(out.report.chainReason, 'synthetic_chain_consistent');
  assert.equal(out.report.setupReason, 'creation_review_required');
  assert.equal(out.report.moduleReason, 'approval_awaiting_approval');
  assert.equal(out.report.possibleWriteObligation, 'NONE_REPORTED');
  assert.equal(out.report.blockingStage, 'none');
});
test('C02 branch and build ready still leave copy not started', () => {
  const f = fixture(); f.staging[0].review = 'reviewed';
  const pending = run(f); assert.equal(pending.stages.staging.reason, 'staging_build_pending');
  f.staging[1].buildReadiness = 'ready'; assert.equal(run(f).stages.staging.reason, 'staging_database_pending');
  f.staging[1].databaseReadiness = 'ready';
  const out = run(f); assert.equal(out.stages.staging.reason, 'copy_not_started');
  assert.equal(out.stages.staging.syntheticCopy, 'NOT_STARTED');
});
test('C03 caller-supplied reported copy and neutralization remain unverified with pl_auth not installed', () => {
  const out = run(reportedFixture());
  assert.equal(out.report.stagingReason, 'synthetic_reported_copy_neutralization');
  assert.equal(out.stages.staging.nextStep, 'MANUAL_INDEPENDENT_VERIFICATION');
  assert.equal(out.report.moduleReason, 'approval_awaiting_approval');
  assert.equal(out.stages.utilities.moduleInstalled, false);
});
test('C04 cedar_labels static installed listing grants neither installation nor Utilities access', () => {
  const f = fixture(); f.utilities[0].moduleToken = f.utilities[2].moduleToken = 'cedar_labels';
  f.utilities[2].installation = 'static_installed'; f.utilities[2].approval = 'reviewed';
  const out = run(f); assert.equal(out.report.moduleReason, 'static_fixture_installed');
  assert.equal(out.report.utilitiesReason, 'no_optional_utilities');
});
for (const [handoff, reason] of [['review_required', 'utilities_review_required'], ['configured', 'configuration_unverified'], ['access_reported', 'access_unverified']])
  test(`C05 optional Utilities ${handoff} stays manual`, () => {
    const f = fixture(); f.utilities[0].utilityToken = f.utilities[1].utilityToken = 'fixture-utility-001';
    f.utilities[1].handoff = handoff;
    const out = run(f); assert.equal(out.report.utilitiesReason, reason); assert.equal(out.report.moduleReason, 'approval_awaiting_approval');
  });
test('C06 unresolved association and pending Production database remain visible downstream', () => {
  const f = reportedFixture(); f.repository[1].associationState = 'not_established';
  const unresolved = run(f); assert.equal(unresolved.report.repositoryReason, 'association_not_established');
  assert.equal(unresolved.report.stagingReason, 'synthetic_reported_copy_neutralization');
  f.repository[1].associationState = 'reported'; f.repository[2].databaseReadiness = 'pending';
  const pending = run(f); assert.equal(pending.report.repositoryReason, 'synthetic_database_pending');
  assert.equal(pending.stages.repository.syntheticBuild, 'READY'); assert.equal(pending.stages.repository.syntheticDatabase, 'PENDING');
});
for (const [approval, disposition, reason] of [['awaiting_approval', 'MANUAL_CONTINUATION', 'approval_awaiting_approval'],
  ['missing', 'MANUAL_CONTINUATION', 'approval_missing'], ['declined', 'HARD_STOP', 'approval_declined']])
  test(`C07 module ${approval} is not a completed installation`, () => {
    const f = reportedFixture(); f.utilities[2].approval = approval;
    f.utilities[0].utilityToken = f.utilities[1].utilityToken = 'fixture-utility-001';
    f.utilities[1].handoff = 'access_reported';
    const out = run(f, disposition); assert.equal(out.report.moduleReason, reason);
    if (disposition === 'HARD_STOP') assert.equal(out.report.blockingReason, 'approval_declined');
  });
for (const [key, value, reason] of [['sourceEnvironmentToken', 'fixture-staging-001', 'source_mismatch'],
  ['destinationEnvironmentToken', 'fixture-production-001', 'destination_mismatch']])
  test(`C08 wrong Staging ${key} hard stops even with claimed neutralization`, () => {
    const f = reportedFixture(); f.staging[2][key] = value;
    const out = run(f, 'HARD_STOP'); assert.equal(out.report.stagingReason, reason);
    assert.equal(out.report.chainReason, 'chain_target_mismatch');
  });
test('C09 copy uncertainty survives cancellation reviewed readiness and neutralization', () => {
  const f = reportedFixture(); f.staging[2].writeOutcome = 'uncertain'; f.staging[0].lifecycle = 'cancelled';
  const out = run(f, 'UNRESOLVED_RECONCILIATION');
  assert.equal(out.report.stagingReason, 'possible_write_unresolved');
  assert.equal(out.report.possibleWriteObligation, 'UNRESOLVED');
  assert.equal(out.report.blockingStage, 'staging');
});
for (const [state, disposition] of [['not_assessed', 'MANUAL_CONTINUATION'], ['pending', 'MANUAL_CONTINUATION'],
  ['incomplete', 'UNRESOLVED_RECONCILIATION'], ['conflicting', 'UNRESOLVED_RECONCILIATION'], ['unknown', 'UNRESOLVED_RECONCILIATION']])
  test(`C10 missing or conflicting neutralization: ${state}`, () => {
    const f = reportedFixture(); f.staging[3].neutralizationState = state;
    assert.equal(run(f, disposition).report.stagingReason, 'neutralization_' + state);
  });
for (const stage of ['setup', 'repository', 'utilities', 'staging']) {
  test(`C11 ${stage} cancellation is a hard stop despite later reports`, () => {
    const f = reportedFixture(); f[stage][0].lifecycle = 'cancelled';
    const out = run(f, 'HARD_STOP'); assert.equal(out.stages[stage].reason, 'operator_cancelled');
    assert.equal(out.report.blockingStage, stage);
  });
  test(`C12 ${stage} login MFA CAPTCHA and expiry are hard manual barriers`, () => {
    for (const authentication of ['login', 'mfa', 'captcha', 'session_expired']) {
      const f = reportedFixture(); f[stage][1].authentication = authentication;
      assert.equal(run(f, 'HARD_STOP').stages[stage].reason, 'authentication_required');
    }
  });
  test(`C13 ${stage} interrupted context cannot continue`, () => {
    const f = reportedFixture(); f[stage][0].lifecycle = 'interrupted';
    assert.equal(run(f, 'HARD_STOP').report.blockingStage, stage);
    if (stage !== 'setup') for (const lifecycle of ['worker_lost', 'session_lost']) {
      const lost = reportedFixture(); lost[stage][1].lifecycle = lifecycle;
      assert.equal(run(lost, 'HARD_STOP').stages[stage].reason, 'context_lost');
    }
  });
  test(`C14 ${stage} stale duplicate delayed gapped observations are rejected`, () => {
    for (let side = 1; side < fixture()[stage].length; side++) {
      for (const [offset, reason] of [[0, 'duplicate_observation'], [-1, 'delayed_observation'], [2, 'observation_gap']]) {
        const f = fixture(); f[stage][side].sequence = f[stage][0].sequence + offset;
        const out = run(f, 'HARD_STOP'); assert.equal(out.stages[stage].reason, reason);
        assert.equal(out.report.chainReason, 'chain_sequence_mismatch');
      }
      const f = fixture(); f[stage][side].documentGeneration = 3;
      assert.equal(run(f, 'HARD_STOP').stages[stage].reason, 'document_generation_mismatch');
    }
  });
}
test('C15 cross-stage agreeing generations and rounds must still share the chain context', () => {
  for (const stage of ['repository', 'utilities', 'staging']) for (const key of ['documentGeneration', 'contextGeneration']) {
    const f = fixture(); for (const v of f[stage]) v[key] = 6;
    const out = run(f, 'HARD_STOP'); assert.equal(out.report.chainReason, 'chain_generation_mismatch');
    assert.notEqual(out.stages[stage].reason, 'invalid_input');
  }
  const f = fixture(); for (const v of f.utilities) v.sequence += 2;
  assert.equal(run(f, 'HARD_STOP').report.chainReason, 'chain_sequence_mismatch');
});
test('C16 divergent project and branch tokens across every stage reject consistently', () => {
  for (const stage of ['setup', 'repository', 'utilities', 'staging']) {
    const f = reportedFixture(); for (const v of f[stage]) v.projectToken = 'fixture-project-002';
    assert.equal(run(f, 'HARD_STOP').report.chainReason, 'chain_target_mismatch');
  }
  const f = fixture(); for (const v of f.repository) v.branch = 'develop';
  assert.equal(run(f, 'HARD_STOP').report.repositoryReason, 'branch_mismatch');
  for (const key of ['sourceBranch', 'stagingBranch']) {
    const f = reportedFixture(); for (const v of f.staging) v[key] = key === 'sourceBranch' ? 'develop' : 'main';
    assert.equal(run(f, 'HARD_STOP').report.stagingReason, 'branch_mismatch');
  }
});
test('C17 earlier cancellation cannot erase supplied possible-write evidence', () => {
  for (const [stage, side, key, value] of [['setup', 1, 'setupState', 'uncertain'], ['setup', 1, 'setupState', 'unknown'],
    ['repository', 1, 'writeOutcome', 'uncertain'], ['repository', 1, 'associationState', 'unknown'],
    ['utilities', 1, 'writeOutcome', 'uncertain'], ['utilities', 2, 'writeOutcome', 'uncertain'], ['staging', 2, 'copyState', 'unknown']]) {
    const f = reportedFixture(); f[stage][0].lifecycle = 'cancelled'; f[stage][side][key] = value;
    const out = run(f, 'UNRESOLVED_RECONCILIATION');
    assert.equal(out.report.possibleWriteObligation, 'UNRESOLVED'); assert.equal(out.report.blockingStage, stage);
  }
});
test('C18 later clean rounds and replay cannot clear earlier uncertainty or hard stop', () => {
  const f = reportedFixture(); f.repository[1].writeOutcome = 'uncertain';
  const first = run(f, 'UNRESOLVED_RECONCILIATION');
  const next = run(reportedFixture(), 'UNRESOLVED_RECONCILIATION', first.report);
  assert.equal(next.report.blockingStage, 'repository'); assert.equal(next.report.blockingReason, first.report.blockingReason);
  assert.equal(next.report.possibleWriteObligation, 'UNRESOLVED');
  const cancelled = fixture(); cancelled.setup[0].lifecycle = 'cancelled';
  const stop = run(cancelled, 'HARD_STOP');
  assert.equal(run(reportedFixture(), 'HARD_STOP', stop.report).report.blockingReason, 'operator_cancelled');
  run(reportedFixture());
});
test('C19 failure in an upstream stage stays visible even with downstream reported success', () => {
  const f = reportedFixture(); f.setup[0].review = 'reviewed'; f.setup[1].setupState = 'failed';
  const out = run(f, 'HARD_STOP'); assert.equal(out.report.setupReason, 'synthetic_failed');
  assert.equal(out.report.stagingReason, 'synthetic_reported_copy_neutralization');
  assert.equal(out.report.blockingStage, 'setup');
  f.setup[1].setupState = 'not_submitted'; f.repository[1].associationState = 'failed';
  assert.equal(run(f, 'HARD_STOP').report.blockingReason, 'association_failed');
});
test('C20 diagnostics are not canonical requests or authenticated permission to invoke operations', () => {
  const out = run(); const f = fixture();
  const calls = [[assessFixtureRepositoryProduction, f.repository, out.stages.setup],
    [assessFixtureUtilitiesModules, f.utilities, out.stages.repository],
    [assessFixtureStagingCopy, f.staging, out.stages.utilities]];
  for (const [assess, inputs, prior] of calls) {
    const wire = inputs.map(JSON.stringify); wire[0] = JSON.stringify(prior);
    const rejected = assess(...wire); markers(rejected); assert.equal(rejected.reason, 'invalid_input');
  }
});
test('C21 exact fixture topology stays grounded in inert HTML', () => {
  const html = name => readFileSync(new URL('../fixtures/' + name, import.meta.url), 'utf8');
  assert.match(html('odoo-sh/project-setup.html'), /value="customer"[\s\S]*value="partner-trial"/);
  assert.match(html('odoo-sh/production.html'), /database-readiness" data-state="ready"/);
  assert.match(html('customer-odoo/apps.html'), /module-pl-auth" data-availability="available" data-installation="not-installed"/);
  assert.match(html('customer-odoo/apps.html'), /module-cedar-labels" data-availability="available" data-installation="installed"/);
  assert.match(html('odoo-sh/staging.html'), /database-copy-checkpoint" data-state="not-copied"/);
});
test('C22 offline exit decision fails closed for any incomplete or failed gate', () => {
  const keys = ['requiredCases', 'connectedConsistency', 'isolation', 'regressions'];
  const complete = Object.fromEntries(keys.map(k => [k, 'PASS']));
  const pass = offlineExit(complete); assert.equal(pass?.decision, 'FIXTURE_EXIT_PASS'); markers(pass);
  assert.deepEqual(Object.keys(pass), ['version', 'evidenceTier', 'provenance', 'fixtureOnly', 'decision', ...flags]);
  for (const key of keys) for (const state of ['FAIL', 'INCOMPLETE', undefined, true]) {
    const blocked = offlineExit({ ...complete, [key]: state });
    assert.equal(blocked?.decision, 'FIXTURE_EXIT_BLOCKED'); markers(blocked);
  }
  for (const bad of [null, {}, { ...complete, extra: 'PASS' }, Object.fromEntries(Object.entries(complete).reverse())])
    assert.equal(offlineExit(bad)?.decision, 'FIXTURE_EXIT_BLOCKED');
});
test('C23 secondary module reconciliation reason survives a later clean report', () => {
  for (const [field, value, reason] of [['approval', 'conflicting', 'approval_conflicting'],
    ['availability', 'unknown', 'availability_unknown'], ['installation', 'conflicting', 'installation_conflicting']]) {
    const f = reportedFixture();
    f.utilities[0].utilityToken = f.utilities[1].utilityToken = 'fixture-utility-001';
    f.utilities[1].handoff = 'access_reported'; f.utilities[2][field] = value;
    const first = run(f, 'UNRESOLVED_RECONCILIATION');
    assert.equal(first.report.blockingStage, 'utilities'); assert.equal(first.report.blockingReason, reason);
    const later = run(reportedFixture(), 'UNRESOLVED_RECONCILIATION', first.report);
    assert.equal(later.report.blockingReason, reason);
  }
});
test('connected isolation: test-only composition runs all four real evaluators without capabilities', () => {
  const source = readFileSync(new URL('./phase15-connected-fixture-provisioning.test.mjs', import.meta.url), 'utf8');
  const names = ['assessFixtureProjectSetup', 'assessFixtureRepositoryProduction', 'assessFixtureUtilitiesModules', 'assessFixtureStagingCopy'];
  const files = ['project-setup', 'repository-production', 'utilities-modules', 'staging-neutralized-copy'];
  const forbidden = 'fetch XMLHttpRequest WebSocket chrome browser window document navigator location localStorage sessionStorage indexedDB caches clipboard process console Date performance setTimeout setInterval setImmediate queueMicrotask Worker eval Function'.split(' ');
  let touched = 0;
  function sandbox() {
    const context = {};
    for (const k of forbidden) Object.defineProperty(context, k, { get() { touched++; throw Error('capability'); } });
    return context;
  }
  const context = sandbox(); const order = [];
  for (let i = 0; i < names.length; i++) {
    const body = readFileSync(new URL(`../src/odoo-sh/${files[i]}-fixture-flow.mjs`, import.meta.url), 'utf8');
    const fn = runInNewContext(body.replace('export function', 'function') + '\n' + names[i] + ';', sandbox(),
      { codeGeneration: { strings: false, wasm: false } });
    context[names[i]] = (...args) => { order.push(names[i]); return fn(...args); };
  }
  const body = source.slice(source.indexOf('const flags ='), source.indexOf('// Scenario assertions'));
  const isolated = runInNewContext(body + '\n({runChain, fixture});', context, { codeGeneration: { strings: false, wasm: false } });
  const first = isolated.runChain(isolated.fixture());
  assert.equal(first?.report?.syntheticDisposition, 'MANUAL_CONTINUATION');
  assert.deepEqual(order, names);
  for (const [f, previous, want] of exercised) {
    order.length = 0;
    assert.equal(JSON.stringify(isolated.runChain(JSON.parse(f), previous)), want);
    assert.deepEqual(order, names);
  }
  assert.equal(touched, 0);
  for (const file of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true })) {
    if (!file.isFile() || !/\.(mjs|js|html|json)$/.test(file.name)) continue;
    const text = readFileSync(`${file.parentPath}/${file.name}`, 'utf8');
    assert.doesNotMatch(text, /phase15-connected-fixture-provisioning|runChain|offlineExit/);
    for (let i = 0; i < files.length; i++) if (file.name !== files[i] + '-fixture-flow.mjs') {
      assert.ok(!text.includes(files[i] + '-fixture-flow')); assert.ok(!text.includes(names[i]));
    }
  }
});
