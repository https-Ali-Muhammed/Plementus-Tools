import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as flow from '../src/odoo-sh/repository-production-fixture-flow.mjs';
import { assessFixtureProjectSetup } from '../src/odoo-sh/project-setup-fixture-flow.mjs';

const assess = flow.assessFixtureRepositoryProduction;
const encode = JSON.stringify;
const flags = ['browserObserved', 'permissionVerified', 'accountVerified', 'rightsVerified',
  'subscriptionVerified', 'approvalGranted', 'executionAuthorized', 'mutationAuthorized',
  'installationAuthorized', 'trustedContinuingContext', 'associationVerified',
  'productionDatabaseVerified', 'stagingCopyVerified', 'moduleInstalled', 'effectsApplied',
  'readAuthorized', 'writeAuthorized'];
const exercised = [];
function triple(r = {}, a = {}, p = {}) {
  return [
    { version: 1, projectToken: 'fixture-project-001', repositoryToken: 'fixture-repo-001',
      branch: 'main', environmentToken: 'fixture-production-001', documentGeneration: 4,
      contextGeneration: 5, sequence: 7, lifecycle: 'active', review: 'reviewed', ...r },
    { version: 1, projectToken: 'fixture-project-001', repositoryToken: 'fixture-repo-001',
      branch: 'main', environmentToken: 'fixture-production-001', documentGeneration: 4,
      contextGeneration: 5, sequence: 8, lifecycle: 'active', authentication: 'none',
      associationState: 'reported', writeOutcome: 'none', ...a },
    { version: 1, projectToken: 'fixture-project-001', branch: 'main',
      environmentToken: 'fixture-production-001', documentGeneration: 4,
      contextGeneration: 5, sequence: 8, lifecycle: 'active', authentication: 'none',
      buildReadiness: 'ready', databaseReadiness: 'ready', ...p },
  ];
}
function checkTexts(args, reason, nextStep, resultClass = 'MANUAL_REVIEW',
  syntheticAssociation = 'UNRESOLVED', syntheticBuild = 'UNRESOLVED', syntheticDatabase = 'UNRESOLVED') {
  const result = assess(...args);
  const expected = { version: 1, resultClass, syntheticAssociation, syntheticBuild, syntheticDatabase,
    reason, evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true, nextStep,
    ...Object.fromEntries(flags.map(key => [key, false])) };
  assert.deepEqual(result, expected);
  assert.deepEqual(Reflect.ownKeys(result), Object.keys(expected));
  assert.ok(Object.isFrozen(result));
  for (const value of Object.values(result)) assert.ok(['string', 'number', 'boolean'].includes(typeof value));
  assert.ok(encode(result).length <= 2048);
  assert.match(encode(result), /^[\x20-\x7e]+$/);
  assert.doesNotMatch(encode(result), /fixture-project|fixture-repo|fixture-production|fixture-staging|fixture-secret|https?:|@|__proto__|constructor/);
  if (args.every(arg => typeof arg === 'string')) exercised.push([...args, encode(result)]);
  return result;
}
function check(r, a, p, ...want) { return checkTexts(triple(r, a, p).map(encode), ...want); }
function ready(r = {}, a = {}, p = {}) {
  return check(r, a, p, 'synthetic_pair_ready', 'MANUAL_FIXTURE_REVIEW', 'SIMULATED_READINESS', 'REPORTED', 'READY', 'READY');
}
function invalid(args, reason = 'invalid_input', step = 'CORRECT_FIXTURE') {
  return checkTexts(args, reason, step, 'REJECTED');
}

test('R01 matching fixture diagnostic never grants association or provider authority', () => {
  ready();
  assert.deepEqual(Object.keys(flow), ['assessFixtureRepositoryProduction']);
});
for (const [state, reason, output, step] of [
  ['not_established', 'association_not_established', 'NOT_ESTABLISHED', 'MANUAL_ASSOCIATION'],
  ['pending', 'association_pending', 'PENDING', 'MANUAL_ASSOCIATION'],
  ['failed', 'association_failed', 'FAILED', 'MANUAL_FAILURE_REVIEW'],
]) test(`R02 selected repository with ${state} association cannot claim readiness`, () => {
  check({}, { associationState: state }, {}, reason, step, 'MANUAL_REVIEW', output);
});
test('R03 missing selection and another fictional repository fail closed', () => {
  for (const side of [0, 1]) {
    const args = triple(); args[side].repositoryToken = null;
    checkTexts(args.map(encode), 'repository_missing', 'MANUAL_ASSOCIATION');
    args[side].repositoryToken = 'fixture-repo-002';
    checkTexts(args.map(encode), 'repository_mismatch', 'MANUAL_ASSOCIATION');
  }
  check({ repositoryToken: null }, { repositoryToken: null }, {}, 'repository_missing', 'MANUAL_ASSOCIATION');
  check({ repositoryToken: 'fixture-repo-002' }, { repositoryToken: 'fixture-repo-002' }, {},
    'repository_mismatch', 'MANUAL_ASSOCIATION');
});
for (const key of ['projectToken', 'environmentToken']) test(`R04 ${key} must be present and match the fixture in all three inputs`, () => {
  const other = key === 'projectToken' ? 'fixture-project-002' : 'fixture-staging-001';
  for (let side = 0; side < 3; side++) {
    const args = triple(); args[side][key] = null;
    checkTexts(args.map(encode), 'target_missing', 'MANUAL_FIXTURE_TARGET');
    args[side][key] = other;
    checkTexts(args.map(encode), 'target_mismatch', 'MANUAL_FIXTURE_TARGET');
  }
  const absent = { [key]: null }, wrong = { [key]: other };
  check(absent, absent, absent, 'target_missing', 'MANUAL_FIXTURE_TARGET');
  check(wrong, wrong, wrong, 'fixture_target_mismatch', 'MANUAL_FIXTURE_TARGET');
});
test('R05 branch agreement is necessary but does not establish build or database readiness', () => {
  for (let side = 0; side < 3; side++) {
    const args = triple(); args[side].branch = null;
    checkTexts(args.map(encode), 'branch_missing', 'MANUAL_FIXTURE_TARGET');
    args[side].branch = 'develop'; checkTexts(args.map(encode), 'branch_mismatch', 'MANUAL_FIXTURE_TARGET');
  }
  check({ branch: 'develop' }, { branch: 'develop' }, { branch: 'develop' }, 'branch_mismatch', 'MANUAL_FIXTURE_TARGET');
  check({ branch: null }, { branch: null }, { branch: null }, 'branch_missing', 'MANUAL_FIXTURE_TARGET');
  check({}, {}, { buildReadiness: 'pending', databaseReadiness: 'pending' }, 'synthetic_both_pending',
    'MANUAL_PRODUCTION_EVIDENCE', 'SIMULATED_READINESS', 'REPORTED', 'PENDING', 'PENDING');
});
test('R06 review assertions are required yet never authenticated approval', () => {
  for (const review of ['pending', 'declined']) for (const associationState of ['reported', 'pending', 'failed'])
    check({ review }, { associationState }, {}, 'review_outcome_conflict', 'MANUAL_RECONCILIATION');
  check({ review: 'pending' }, { associationState: 'not_established' }, {}, 'association_review_required', 'MANUAL_ASSOCIATION_REVIEW');
  check({ review: 'declined' }, { associationState: 'not_established' }, {}, 'review_declined', 'STOP');
});
test('R07 unknown association and possible-write uncertainty require manual reconciliation', () => {
  check({}, { associationState: 'unknown' }, {}, 'association_unknown', 'MANUAL_RECONCILIATION');
  for (const associationState of ['not_established', 'pending', 'reported', 'conflicting', 'unknown', 'failed'])
    for (const review of ['pending', 'reviewed', 'declined'])
      check({ review }, { associationState, writeOutcome: 'uncertain' }, {},
        'possible_write_unresolved', 'MANUAL_RECONCILIATION');
  check({}, { associationState: 'conflicting' }, {}, 'association_conflicting', 'MANUAL_RECONCILIATION');
});

const readinessCases = [
  ['conflicting', 'production_evidence_conflicting', 'MANUAL_RECONCILIATION', 'CONFLICTING'],
  ['missing', 'production_evidence_missing', 'MANUAL_PRODUCTION_EVIDENCE', 'MISSING'],
  ['stale', 'production_evidence_stale', 'FRESH_FIXTURE_CONTEXT', 'STALE'],
  ['interrupted', 'production_interrupted', 'FRESH_FIXTURE_CONTEXT', 'INTERRUPTED'],
  ['failed', 'production_failed', 'MANUAL_FAILURE_REVIEW', 'FAILED'],
  ['unknown', 'production_unknown', 'MANUAL_PRODUCTION_EVIDENCE', 'UNKNOWN'],
];
for (const [state, reason, step, output] of readinessCases)
  test(`R08 ${state} Production evidence remains independent for each component`, () => {
    check({}, {}, { buildReadiness: state }, reason, step, 'SIMULATED_READINESS', 'REPORTED', output, 'READY');
    check({}, {}, { databaseReadiness: state }, reason, step, 'SIMULATED_READINESS', 'REPORTED', 'READY', output);
    check({}, {}, { buildReadiness: state, databaseReadiness: state }, reason, step,
      'SIMULATED_READINESS', 'REPORTED', output, output);
  });
test('R09 ready build never substitutes for pending database', () => {
  check({}, {}, { databaseReadiness: 'pending' }, 'synthetic_database_pending', 'MANUAL_PRODUCTION_EVIDENCE',
    'SIMULATED_READINESS', 'REPORTED', 'READY', 'PENDING');
});
test('R10 ready database never substitutes for pending build', () => {
  check({}, {}, { buildReadiness: 'pending' }, 'synthetic_build_pending', 'MANUAL_PRODUCTION_EVIDENCE',
    'SIMULATED_READINESS', 'REPORTED', 'PENDING', 'READY');
});
for (const [key, prefix] of [['documentGeneration', 'document'], ['contextGeneration', 'context']])
  test(`R11 ${key} null older newer and inclusive bounds across three envelopes`, () => {
    for (let side = 0; side < 3; side++) {
      const args = triple(); args[side][key] = null;
      checkTexts(args.map(encode), `${prefix}_generation_missing`, 'FRESH_FIXTURE_CONTEXT');
      for (const value of [1, 3, 6, 1000000]) {
        args[side][key] = value;
        checkTexts(args.map(encode), `${prefix}_generation_mismatch`, 'FRESH_FIXTURE_CONTEXT');
      }
    }
    check({ [key]: null }, { [key]: null }, { [key]: null }, `${prefix}_generation_missing`, 'FRESH_FIXTURE_CONTEXT');
    for (const value of [1, 1000000]) ready({ [key]: value }, { [key]: value }, { [key]: value });
  });
test('R12 duplicate delayed and out-of-order observations independently invalidate the round', () => {
  for (const side of [1, 2]) for (const [sequence, reason] of [
    [7, 'duplicate_observation'], [6, 'delayed_observation'], [9, 'observation_gap']]) {
    const args = triple(); args[side].sequence = sequence;
    checkTexts(args.map(encode), reason, 'FRESH_FIXTURE_CONTEXT');
  }
  ready({ sequence: 0 }, { sequence: 1 }, { sequence: 1 });
  ready({ sequence: 999999 }, { sequence: 1000000 }, { sequence: 1000000 });
});
test('R13 cancellation in any input defeats readiness and uncertainty without reconciliation', () => {
  for (let side = 0; side < 3; side++) {
    const args = triple(); args[side].lifecycle = 'cancelled';
    checkTexts(args.map(encode), 'operator_cancelled', 'STOP', 'CANCELLED');
    args[1].writeOutcome = 'uncertain';
    checkTexts(args.map(encode), 'operator_cancelled', 'STOP', 'CANCELLED');
  }
});
test('R14 unexpected interruption worker loss and session loss invalidate every envelope', () => {
  for (let side = 0; side < 3; side++) for (const [lifecycle, reason] of [
    ['interrupted', 'lifecycle_interrupted'], ['worker_lost', 'context_lost'], ['session_lost', 'context_lost']]) {
    const args = triple(); args[side].lifecycle = lifecycle;
    checkTexts(args.map(encode), reason, 'FRESH_FIXTURE_CONTEXT');
  }
});
test('R15 login MFA CAPTCHA and session expiration are manual on either observation', () => {
  for (const side of [1, 2]) for (const authentication of ['login', 'mfa', 'captcha', 'session_expired']) {
    const args = triple(); args[side].authentication = authentication;
    checkTexts(args.map(encode), 'authentication_required', 'MANUAL_AUTH');
  }
});
test('R16 unknown and uncertain association survive unrelated stale context and ready claims', () => {
  for (const [a, reason] of [[{ associationState: 'unknown' }, 'association_unknown'],
    [{ writeOutcome: 'uncertain' }, 'possible_write_unresolved']])
    check({ review: 'declined', lifecycle: 'worker_lost', projectToken: null },
      { authentication: 'captcha', documentGeneration: null, ...a }, {}, reason, 'MANUAL_RECONCILIATION');
});
test('R17 unsupported versions in any structurally valid input never authorize retries', () => {
  for (let side = 0; side < 3; side++) for (const version of [2, 999]) {
    const args = triple(); args[side].version = version;
    invalid(args.map(encode), 'unsupported_version', 'REVIEW_VERSION');
    args[(side + 1) % 3].extra = true; invalid(args.map(encode));
  }
});
test('R18 hostile objects accessors functions and proxies reject without executing hooks', () => {
  let accesses = 0; const trap = () => { accesses++; throw Error('fixture-secret'); };
  const hostile = new Proxy({}, { get: trap, ownKeys: trap, getPrototypeOf: trap });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const bad of [undefined, null, true, 1, 1n, Symbol('fixture-secret'), {}, [], () => {},
    new String('{}'), hostile, revoked.proxy, Object.defineProperty({}, 'version', { get: trap }),
    { toString: trap, toJSON: trap, [Symbol.toPrimitive]: trap }]) for (let side = 0; side < 3; side++) {
    const args = triple().map(encode); args[side] = bad; invalid(args);
  }
  assert.equal(accesses, 0);
});
test('R19 primitive size limits precede parsing but follow all primitive checks', () => {
  for (let side = 0; side < 3; side++) {
    for (const size of [1025, 4096, 100000]) {
      const args = triple().map(encode); args[side] = 'x'.repeat(size); invalid(args, 'input_too_large');
    }
    for (const size of [1023, 1024]) {
      const args = triple().map(encode); args[side] = 'x'.repeat(size); invalid(args);
    }
    for (let other = 0; other < 3; other++) if (other !== side) {
      const args = triple().map(encode); args[side] = 'x'.repeat(1025); args[other] = {}; invalid(args);
    }
  }
});
test('R20 malformed noncanonical and alternate JSON encodings never enter the contract', () => {
  for (let side = 0; side < 3; side++) {
    const canonical = encode(triple()[side]);
    for (const bad of ['', '{', 'null', '[]', 'true', '1', '"fixture-secret"', canonical + '\n',
      ' ' + canonical, canonical.replace('"version":1', '"version":1,"version":1'),
      canonical.replace('"version":1', '"version":1.0'), canonical.replace('"version":1', '"version":1e0'),
      canonical.replace('fixture-project', '\\u0066ixture-project'), canonical.replace('main', 'maïn'),
      canonical.replace('main', 'ma\tin'), '[{'.repeat(200), ' '.repeat(1024)]) {
      const args = triple().map(encode); args[side] = bad; invalid(args);
    }
  }
  const args = triple({ sequence: 0 }).map(encode);
  args[0] = args[0].replace('"sequence":0', '"sequence":-0'); invalid(args);
});
test('R21 closed ordered schemas reject omissions extra authority keys and reordered fields', () => {
  for (let side = 0; side < 3; side++) {
    for (const key of Object.keys(triple()[side])) {
      const args = triple(); delete args[side][key]; invalid(args.map(encode));
    }
    for (const key of ['repositoryURL', 'customerName', 'subscriptionReference', 'password', 'error',
      '__proto__', 'constructor', 'repositoryLinked', 'productionReady', ...flags]) {
      const args = triple(); Object.defineProperty(args[side], key, { value: 'fixture-secret', enumerable: true });
      invalid(args.map(encode));
    }
    const args = triple(); args[side] = Object.fromEntries(Object.entries(args[side]).reverse()); invalid(args.map(encode));
  }
});
test('R22 every field rejects wrong types and arbitrary values', () => {
  for (let side = 0; side < 3; side++) for (const [key, value] of Object.entries(triple()[side])) {
    for (const bad of [[], {}, true, false, 'fixture-secret', typeof value === 'number' ? String(value) : 4]) {
      const args = triple(); args[side][key] = bad; invalid(args.map(encode));
    }
    if (!['projectToken', 'repositoryToken', 'branch', 'environmentToken', 'documentGeneration', 'contextGeneration'].includes(key)) {
      const args = triple(); args[side][key] = null; invalid(args.map(encode));
    }
  }
});
test('R23 numeric limits are inclusive integers without truncation or coercion', () => {
  for (let side = 0; side < 3; side++) for (const key of ['version', 'documentGeneration', 'contextGeneration', 'sequence']) {
    const max = key === 'version' ? 999 : key === 'sequence' && side === 0 ? 999999 : 1000000;
    for (const bad of [-1, 1.5, max + 1, Number.MAX_SAFE_INTEGER, ...(key === 'sequence' && side === 0 ? [] : [0])]) {
      const args = triple(); args[side][key] = bad; invalid(args.map(encode));
    }
  }
});
test('R24 no arbitrary secret or real-sounding success claim enters any enum', () => {
  for (const value of ['fixture-secret', 'person@fixture.invalid', 'https://fixture.invalid', 'Bearer fixture-secret',
    'linked', 'verified', 'success', 'installed', 'authorized']) {
    invalid(triple({ repositoryToken: value }).map(encode));
    invalid(triple({}, { associationState: value }).map(encode));
    invalid(triple({}, {}, { buildReadiness: value }).map(encode));
    invalid(triple({}, {}, { databaseReadiness: value }).map(encode));
  }
});
test('R25 structural and version failures precede cancellation and possible-write diagnostics', () => {
  invalid(triple({ lifecycle: 'cancelled' }, { writeOutcome: 'uncertain' }, { extra: true }).map(encode));
  invalid(triple({ lifecycle: 'cancelled', version: 2 }, { writeOutcome: 'uncertain' }).map(encode),
    'unsupported_version', 'REVIEW_VERSION');
});

const failures = [
  [{ lifecycle: 'cancelled' }, {}, {}, 'operator_cancelled', 'STOP', 'CANCELLED'],
  [{}, { writeOutcome: 'uncertain' }, {}, 'possible_write_unresolved', 'MANUAL_RECONCILIATION'],
  [{}, { associationState: 'unknown' }, {}, 'association_unknown', 'MANUAL_RECONCILIATION'],
  [{ lifecycle: 'worker_lost' }, {}, {}, 'context_lost', 'FRESH_FIXTURE_CONTEXT'],
  [{}, {}, { lifecycle: 'interrupted' }, 'lifecycle_interrupted', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { authentication: 'mfa' }, {}, 'authentication_required', 'MANUAL_AUTH'],
  [{ documentGeneration: null }, {}, {}, 'document_generation_missing', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { documentGeneration: 3 }, {}, 'document_generation_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{ contextGeneration: null }, {}, {}, 'context_generation_missing', 'FRESH_FIXTURE_CONTEXT'],
  [{}, {}, { contextGeneration: 3 }, 'context_generation_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { sequence: 7 }, {}, 'duplicate_observation', 'FRESH_FIXTURE_CONTEXT'],
  [{}, {}, { sequence: 6 }, 'delayed_observation', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { sequence: 9 }, {}, 'observation_gap', 'FRESH_FIXTURE_CONTEXT'],
  [{ projectToken: null }, {}, {}, 'target_missing', 'MANUAL_FIXTURE_TARGET'],
  [{}, {}, { projectToken: 'fixture-project-002' }, 'target_mismatch', 'MANUAL_FIXTURE_TARGET'],
  [{ environmentToken: 'fixture-staging-001' }, { environmentToken: 'fixture-staging-001' },
    { environmentToken: 'fixture-staging-001' }, 'fixture_target_mismatch', 'MANUAL_FIXTURE_TARGET'],
  [{ repositoryToken: null }, {}, {}, 'repository_missing', 'MANUAL_ASSOCIATION'],
  [{}, { repositoryToken: 'fixture-repo-002' }, {}, 'repository_mismatch', 'MANUAL_ASSOCIATION'],
  [{}, {}, { branch: null }, 'branch_missing', 'MANUAL_FIXTURE_TARGET'],
  [{}, { branch: 'develop' }, {}, 'branch_mismatch', 'MANUAL_FIXTURE_TARGET'],
  [{}, { associationState: 'conflicting' }, {}, 'association_conflicting', 'MANUAL_RECONCILIATION'],
  [{ review: 'pending' }, {}, {}, 'review_outcome_conflict', 'MANUAL_RECONCILIATION'],
];
test('R26 every compatible pair of competing failures honors first-match precedence', () => {
  for (let i = 0; i < failures.length; i++) for (let j = i + 1; j < failures.length; j++) {
    const earlier = failures[i], later = failures[j];
    if ([0, 1, 2].some(side => Object.keys(earlier[side]).some(key =>
      Object.hasOwn(later[side], key) && earlier[side][key] !== later[side][key]))) continue;
    const args = triple(...[0, 1, 2].map(side => ({ ...later[side], ...earlier[side] })));
    checkTexts(args.map(encode), ...earlier.slice(3));
  }
});
test('R27 all 64 build/database combinations preserve independent facts and precedence', () => {
  const cases = [...readinessCases, ['pending', null, 'MANUAL_PRODUCTION_EVIDENCE', 'PENDING'],
    ['ready', null, 'MANUAL_FIXTURE_REVIEW', 'READY']];
  for (let b = 0; b < cases.length; b++) for (let d = 0; d < cases.length; d++) {
    const first = cases[Math.min(b, d)];
    const reason = first[1] ?? (b === 6 && d === 6 ? 'synthetic_both_pending'
      : b === 6 ? 'synthetic_build_pending' : d === 6 ? 'synthetic_database_pending' : 'synthetic_pair_ready');
    check({}, {}, { buildReadiness: cases[b][0], databaseReadiness: cases[d][0] }, reason, first[2],
      'SIMULATED_READINESS', 'REPORTED', cases[b][3], cases[d][3]);
  }
});
test('R28 association and review gates precede Production evidence even when conflicting', () => {
  check({ review: 'declined' }, { associationState: 'not_established' }, { buildReadiness: 'conflicting' }, 'review_declined', 'STOP');
  check({ review: 'pending' }, { associationState: 'not_established' }, { buildReadiness: 'conflicting' },
    'association_review_required', 'MANUAL_ASSOCIATION_REVIEW');
  for (const [associationState, reason, output] of [['not_established', 'association_not_established', 'NOT_ESTABLISHED'],
    ['pending', 'association_pending', 'PENDING'], ['failed', 'association_failed', 'FAILED']])
    check({}, { associationState }, { databaseReadiness: 'conflicting' }, reason,
      associationState === 'failed' ? 'MANUAL_FAILURE_REVIEW' : 'MANUAL_ASSOCIATION', 'MANUAL_REVIEW', output);
});
test('R29 repeated input replay is deterministic but carries no remembered cancellation or uncertainty', () => {
  const args = triple().map(encode); const before = ready();
  check({ lifecycle: 'cancelled' }, {}, {}, 'operator_cancelled', 'STOP', 'CANCELLED');
  check({}, { writeOutcome: 'uncertain' }, {}, 'possible_write_unresolved', 'MANUAL_RECONCILIATION');
  check({}, {}, { lifecycle: 'worker_lost' }, 'context_lost', 'FRESH_FIXTURE_CONTEXT');
  for (let i = 0; i < 20; i++) { const replay = ready(); assert.deepEqual(replay, before); assert.notStrictEqual(replay, before); }
  assert.deepEqual(args, triple().map(encode));
});
test('R30 frozen flat outputs cannot be promoted or modified', () => {
  const result = ready();
  for (const flag of flags) assert.throws(() => { result[flag] = true; }, TypeError);
  assert.throws(() => { result.syntheticDatabase = 'VERIFIED'; }, TypeError);
  assert.throws(() => { result.extra = 'fixture-secret'; }, TypeError);
  assert.throws(() => { delete result.fixtureOnly; }, TypeError);
  assert.throws(() => Object.setPrototypeOf(result, null), TypeError);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
});
test('R31 HTML option and inert readiness markers are separate from caller-supplied association', () => {
  check({}, { associationState: 'not_established' }, {}, 'association_not_established', 'MANUAL_ASSOCIATION', 'MANUAL_REVIEW', 'NOT_ESTABLISHED');
  const setup = readFileSync(new URL('../fixtures/odoo-sh/project-setup.html', import.meta.url), 'utf8');
  const production = readFileSync(new URL('../fixtures/odoo-sh/production.html', import.meta.url), 'utf8');
  assert.match(setup, /<option value="fixture-repo-001">/);
  assert.doesNotMatch(setup, /data-fixture="association-state"/);
  for (const marker of ['build-readiness', 'database-readiness']) assert.ok(production.includes(`data-fixture="${marker}" data-state="ready"`));
  assert.match(production, /data-environment-id="fixture-production-001"/);
  assert.equal(ready().browserObserved, false);
});
test('R32 test-only Phase 15.01 consistency never authenticates project existence or association', () => {
  const request = { version: 1, subscriptionMode: 'customer', referencePlaceholder: 'present',
    projectToken: 'fixture-project-001', environmentToken: 'fixture-production-001',
    documentGeneration: 4, contextGeneration: 5, sequence: 7, lifecycle: 'active', review: 'reviewed' };
  const observation = { version: 1, page: 'project-setup', selectedMode: 'customer', referencePlaceholder: 'present',
    projectToken: 'fixture-project-001', environmentToken: 'fixture-production-001',
    documentGeneration: 4, contextGeneration: 5, sequence: 8, lifecycle: 'active',
    authentication: 'none', evidence: 'complete', setupState: 'submitted' };
  const prior = assessFixtureProjectSetup(encode(request), encode(observation));
  const current = ready(); assert.equal(prior.reason, 'synthetic_submitted');
  for (const flag of flags) { assert.equal(prior[flag], false); assert.equal(current[flag], false); }
  for (let side = 0; side < 3; side++) { const args = triple().map(encode); args[side] = encode(prior); invalid(args); }
});
test('R33 all exercised results replay with bounded sanitized output and 17 false flags', () => {
  ready();
  const reasons = new Set();
  for (const [r, a, p, expected] of exercised) {
    const result = assess(r, a, p); assert.equal(encode(result), expected); reasons.add(result.reason);
    assert.ok(Object.isFrozen(result)); for (const flag of flags) assert.equal(result[flag], false);
  }
  for (const reason of ['invalid_input', 'input_too_large', 'unsupported_version', 'operator_cancelled',
    'possible_write_unresolved', 'association_unknown', 'synthetic_pair_ready', 'synthetic_both_pending']) assert.ok(reasons.has(reason));
});
test('R34 standalone source and all exercised paths access no runtime capabilities', () => {
  ready();
  const source = readFileSync(new URL('../src/odoo-sh/repository-production-fixture-flow.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:import|require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function|globalThis|window|document|navigator|Date|performance|setTimeout|setInterval|setImmediate|queueMicrotask|Worker|Promise|console)\b/);
  assert.doesNotMatch(source, /page-recognition|recognizeFixtureOdooShPage|context-guards|assessFixtureInteractionContext|dom-primitives|previewFixtureDomInteraction|interruption-policy|assessFixtureInterruption|project-setup-fixture-flow|assessFixtureProjectSetup|fx:|Math\.random|node:|child_process/);
  for (const entry of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(mjs|js|html|json)$/.test(entry.name) || entry.name === 'repository-production-fixture-flow.mjs') continue;
    assert.doesNotMatch(readFileSync(`${entry.parentPath}/${entry.name}`, 'utf8'), /repository-production-fixture-flow|assessFixtureRepositoryProduction/);
  }
  let accesses = 0; const sandbox = {};
  for (const key of ['fetch', 'XMLHttpRequest', 'WebSocket', 'chrome', 'browser', 'window', 'document', 'navigator',
    'location', 'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'clipboard', 'process', 'console',
    'Date', 'performance', 'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'Worker', 'eval', 'Function'])
    Object.defineProperty(sandbox, key, { get() { accesses++; throw Error('fixture-secret'); } });
  const isolated = runInNewContext(source.replace('export function', 'function') + '\nassessFixtureRepositoryProduction;',
    sandbox, { codeGeneration: { strings: false, wasm: false } });
  for (const [r, a, p, expected] of exercised) assert.equal(encode(isolated(r, a, p)), expected);
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (let side = 0; side < 3; side++) { const args = triple().map(encode); args[side] = revoked.proxy;
    assert.equal(isolated(...args)?.reason, 'invalid_input'); }
  assert.equal(accesses, 0);
});
