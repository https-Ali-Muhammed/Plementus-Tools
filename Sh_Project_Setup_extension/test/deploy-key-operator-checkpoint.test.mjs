import assert from 'node:assert/strict';
import test from 'node:test';
import { createFixtureDeployKeyHandoff } from '../src/github/deploy-key-handoff.mjs';
import { planFixtureUtilities } from '../src/github/utilities-plan.mjs';
import { validateFixtureSubmoduleStructure } from '../src/github/submodule-structure.mjs';

const base = { version: 1, attempt: 1, planGeneration: 1, contextGeneration: 1,
  selectionIndex: 0, selection: 'valid', structure: 'matched', context: 'current',
  publicKeyAvailability: 'unavailable', permission: 'read_only', event: 'start', possibleWrite: false };
const available = { publicKeyAvailability: 'operator_reports_available' };
const flags = ['accountVerified', 'permissionVerified', 'approvalGranted', 'executionAuthorized',
  'mutationAuthorized', 'trustedContinuingContext', 'associationVerified', 'checkoutVerified',
  'moduleInstalled', 'effectsApplied'];
const fields = ['version', 'attempt', 'planGeneration', 'contextGeneration', 'selectionIndex',
  'state', 'reason', 'permission', 'evidenceTier', 'fixtureOnly', 'scenarioOutcome',
  'reviewRecorded', 'reconciliationRequired', 'nextStep', ...flags].sort();
function safe(result) {
  assert.deepEqual(Object.keys(result).sort(), fields);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.values(result).every(value => value === null || typeof value !== 'object'));
  assert.throws(() => { result.state = 'configured'; }, TypeError);
  assert.equal(result.evidenceTier, 'SIMULATED');
  assert.equal(result.fixtureOnly, true);
  assert.equal(result.permission, 'read_only');
  assert.equal(result.nextStep, 'manual');
  assert.equal(result.scenarioOutcome, result.state);
  for (const flag of flags) assert.equal(result[flag], false, flag);
  assert.ok(JSON.stringify(result).length <= 4096);
  assert.match(JSON.stringify(result), /^[\x20-\x7e]+$/);
  return result;
}
function send(controller, event, changes = {}) {
  safe(controller.snapshot());
  return safe(controller.send(JSON.stringify({ ...base, event, ...changes })));
}
function expect(result, state, reason, reconciliation = false) {
  assert.equal(result.state, state);
  assert.equal(result.reason, reason);
  assert.equal(result.reconciliationRequired, reconciliation);
  return result;
}

for (const availability of ['unavailable', 'unknown']) test(`validated selection waits with key ${availability}`, () => {
  const plan = planFixtureUtilities(JSON.stringify([{ url: 'https://github.com/fixture-org/example.git', path: 'addons/example' }]));
  const structure = validateFixtureSubmoduleStructure(JSON.stringify({
    gitmodulesText: '[submodule "example"]\npath = addons/example\nurl = https://github.com/fixture-org/example.git\n',
    tree: [{ path: '.gitmodules', mode: '100644', oid: 'a'.repeat(40) },
      { path: 'addons/example', mode: '160000', oid: 'b'.repeat(40) }],
  }));
  assert.equal(plan.selectionState, 'valid');
  assert.equal(structure.structureState, 'matched');
  const c = createFixtureDeployKeyHandoff();
  const before = expect(send(c, 'start', { selection: plan.selectionState, structure: structure.structureState,
    publicKeyAvailability: availability }), 'AWAITING_OPERATOR', 'key_unavailable');
  assert.equal(before.reviewRecorded, false);
  expect(send(c, 'confirm', { publicKeyAvailability: availability }), 'BLOCKED', 'invalid_transition');
  assert.equal(before.state, 'AWAITING_OPERATOR');
});

test('empty optional selection uses independent structure assessment', () => {
  assert.equal(planFixtureUtilities('[]').selectionState, 'empty_optional');
  const structure = validateFixtureSubmoduleStructure('{"gitmodulesText":null,"tree":[]}');
  assert.equal(structure.structureState, 'empty');
  expect(send(createFixtureDeployKeyHandoff(), 'start', { selection: 'empty', selectionIndex: null,
    structure: structure.structureState }), 'NO_ACTION', 'no_selection');
});
for (const [structure, state, reason] of [
  ['invalid', 'BLOCKED', 'structure_invalid'], ['unknown', 'MANUAL_REVIEW', 'structure_unknown'],
  ['unsupported', 'MANUAL_REVIEW', 'structure_unknown'], ['conflict', 'MANUAL_REVIEW', 'target_conflict'],
  ['matched', 'MANUAL_REVIEW', 'target_conflict'],
]) test(`empty selection cannot mask ${structure} structure`, () => {
  expect(send(createFixtureDeployKeyHandoff(), 'start', { selection: 'empty', selectionIndex: null, structure }), state, reason);
});
for (const publicKeyAvailability of ['unavailable', 'unknown', 'operator_reports_available']) {
  test(`invalid selection and structure outrank ${publicKeyAvailability}`, () => {
    for (const [field, reason] of [['selection', 'selection_invalid'], ['structure', 'structure_invalid']]) {
      expect(send(createFixtureDeployKeyHandoff(), 'start', { [field]: 'invalid', publicKeyAvailability }), 'BLOCKED', reason);
    }
  });
}
for (const fact of ['repository access', 'rights', 'context', 'key provenance']) {
  test(`unknown ${fact} stays manual despite reported key`, () => {
    // The accepted schema summarizes external uncertainty; it does not verify these facts.
    const changes = fact === 'rights' ? { permission: 'unknown' } : { context: 'unknown' };
    expect(send(createFixtureDeployKeyHandoff(), 'start', { ...available, ...changes }), 'MANUAL_REVIEW', 'context_unknown');
  });
}

const journeys = [
  ['key never available', [
    ['start', {}, 'AWAITING_OPERATOR', 'key_unavailable'],
    ['key_available', { publicKeyAvailability: 'unknown' }, 'AWAITING_OPERATOR', 'key_unavailable'],
    ['key_available', {}, 'AWAITING_OPERATOR', 'key_unavailable'],
    ['cancel', {}, 'CANCELLED', 'operator_cancelled'],
  ]],
  ['defer then explicit manual review and synthetic match', [
    ['start', {}, 'AWAITING_OPERATOR', 'key_unavailable'],
    ['key_available', available, 'REVIEW_REQUIRED', 'review_required'],
    ['defer', available, 'AWAITING_OPERATOR', 'deferred'],
    ['key_available', available, 'REVIEW_REQUIRED', 'review_required'],
    ['confirm', available, 'MANUAL_CONFIGURATION', 'none'],
    ['returned', available, 'AWAITING_VERIFICATION', 'verification_pending'],
    ['attest', available, 'OPERATOR_ATTESTED', 'operator_report_only'],
    ['observe_match', available, 'ASSOCIATION_OBSERVED', 'association_match'],
    ['cancel', available, 'CANCELLED', 'operator_cancelled', true],
  ]],
  ['reject available key', [
    ['start', available, 'REVIEW_REQUIRED', 'review_required'],
    ['reject', available, 'BLOCKED', 'operator_rejected'],
    ['confirm', available, 'BLOCKED', 'operator_rejected'],
  ]],
  ['cancel review', [
    ['start', available, 'REVIEW_REQUIRED', 'review_required'],
    ['cancel', available, 'CANCELLED', 'operator_cancelled'],
    ['confirm', available, 'CANCELLED', 'operator_cancelled'],
  ]],
];
for (const [name, steps] of journeys) test(`manual journey: ${name}`, () => {
  const c = createFixtureDeployKeyHandoff();
  let confirmed = false;
  const history = [];
  for (const [event, changes, state, reason, reconcile = false] of steps) {
    const result = expect(send(c, event, changes), state, reason, reconcile);
    if (state === 'MANUAL_CONFIGURATION') confirmed = true;
    assert.equal(result.reviewRecorded, confirmed);
    history.push([result, JSON.stringify(result)]);
  }
  for (const [snapshot, serialized] of history) assert.equal(JSON.stringify(snapshot), serialized);
});
for (const event of ['unknown_result', 'observe_conflict']) test(`${event} cannot retry or clear possible-write reconciliation`, () => {
  const c = createFixtureDeployKeyHandoff();
  send(c, 'start', available); send(c, 'confirm', available); send(c, 'returned', available);
  expect(send(c, event, available), 'RECONCILE_REQUIRED', event === 'unknown_result' ? 'outcome_unknown' : 'association_conflict', true);
  expect(send(c, 'cancel', available), 'CANCELLED', 'operator_cancelled', true);
  expect(send(c, 'start', { ...available, attempt: 2, planGeneration: 2, contextGeneration: 2 }), 'CANCELLED', 'operator_cancelled', true);
  expect(send(c, 'observe_match', available), 'CANCELLED', 'operator_cancelled', true);
});
test('manual configuration alone latches possible write even when caller reports false', () => {
  const c = createFixtureDeployKeyHandoff();
  send(c, 'start', available); send(c, 'confirm', available);
  expect(send(c, 'cancel', { ...available, possibleWrite: false }), 'CANCELLED', 'operator_cancelled', true);
});
for (const changes of [{ attempt: 2 }, { selectionIndex: 1 }, { planGeneration: 2 }, { contextGeneration: 2 }]) {
  test(`stale binding cannot revive handoff: ${JSON.stringify(changes)}`, () => {
    for (const confirmed of [false, true]) {
      const c = createFixtureDeployKeyHandoff();
      send(c, 'start', available);
      if (confirmed) send(c, 'confirm', available);
      const result = expect(send(c, 'returned', { ...available, ...changes }), confirmed ? 'RECONCILE_REQUIRED' : 'STALE_CONTEXT',
        'selectionIndex' in changes ? 'target_conflict' : 'context_stale', confirmed);
      assert.equal(result.attempt, 1); assert.equal(result.selectionIndex, 0);
      assert.equal(result.planGeneration, 1); assert.equal(result.contextGeneration, 1);
      expect(send(c, 'observe_match', available), 'BLOCKED', 'invalid_transition', confirmed);
    }
  });
}
for (const [context, state, reason] of [['stale', 'STALE_CONTEXT', 'context_stale'],
  ['conflict', 'MANUAL_REVIEW', 'target_conflict'], ['denied', 'BLOCKED', 'permission_denied']]) {
  test(`reported key cannot bypass ${context} context`, () => {
    expect(send(createFixtureDeployKeyHandoff(), 'start', { ...available, context }), state, reason);
  });
}
test('missing key never produces material or IDs and extra material fields fail closed', () => {
  for (const field of ['publicKey', 'privateKey', 'fingerprint', 'providerId']) {
    const c = createFixtureDeployKeyHandoff();
    const waiting = send(c, 'start');
    assert.equal(waiting.reviewRecorded, false);
    const result = safe(c.send(JSON.stringify({ ...base, [field]: 'synthetic-marker' })));
    expect(result, 'BLOCKED', 'invalid_input');
    assert.ok(!JSON.stringify(result).includes('synthetic-marker'));
  }
});
