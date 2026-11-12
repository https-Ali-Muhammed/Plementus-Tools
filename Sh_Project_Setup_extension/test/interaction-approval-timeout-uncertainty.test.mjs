import test from 'node:test';
import assert from 'node:assert/strict';
import { createApprovalCheckpoint } from '../src/workflow/approval-checkpoint.mjs';
import { createPauseControl } from '../src/workflow/pause-control.mjs';
import { createStepCoordinator } from '../src/workflow/step-coordinator.mjs';
import { decideRecovery } from '../src/workflow/recovery.mjs';
import { assessFixtureInterruption } from '../src/interaction/interruption-policy.mjs';
import { FAILURE_SCENARIOS } from '../fixtures/scenarios/failure-states.mjs';

const uncertain = FAILURE_SCENARIOS.filter(s => /^F05-/.test(s.id));
const fixture = (id = 'F05-timeout') => {
  const { capability, request } = FAILURE_SCENARIOS.find(s => s.id === id);
  return structuredClone({ capability, request });
};
const plan = (...steps) => ({ run: 'fixture-run', steps });
const submission = (step, result) => ({ run: 'fixture-run', step: step.request.context.step, result });
const review = (checkpoint, choice = 'approve') => ({ version: 1, checkpoint,
  run: checkpoint.run, step: checkpoint.step, operation: checkpoint.operation,
  target: { ...checkpoint.target }, approvalReference: checkpoint.approvalReference, choice });
const command = (control, step, action) => ({ version: 1, checkpoint: control.next(),
  run: 'fixture-run', step: step.request.context.step, operation: step.request.operation,
  target: { ...step.request.target }, action });
const invalid = (kind, fn) => assert.throws(fn, { message: `${kind} failed` });
const factories = [['Step coordination', createStepCoordinator], ['Pause control', createPauseControl]];
function position(control, decision, total = 2) {
  const result = control.next();
  assert.equal(result.decision, decision);
  assert.equal(result.index, 0);
  assert.equal(result.total, total);
  assert.equal(result.evidenceTier, 'SIMULATED');
  assert.equal(result.retryAllowed, false);
  assert.ok(Object.isFrozen(result));
  if (control.control) {
    assert.equal(result.executionAuthorized, false);
    assert.equal(result.reconciliationRequired, decision === 'reconcile_required');
  }
  return result;
}
const flags = ['browserObserved', 'permissionVerified', 'accountVerified', 'rightsVerified',
  'subscriptionVerified', 'approvalGranted', 'executionAuthorized', 'mutationAuthorized',
  'installationAuthorized', 'trustedContinuingContext', 'associationVerified',
  'productionDatabaseVerified', 'stagingCopyVerified', 'moduleInstalled', 'effectsApplied',
  'readAuthorized', 'writeAuthorized'];
function pair(state = {}, event = {}) {
  return [{ version: 1, tabSlot: 1, originToken: 'toy-origin-a', documentGeneration: 4,
    contextGeneration: 5, workerGeneration: 2, projectSlot: 1, branchSlot: 2,
    sequence: 7, lifecycle: 'active', writeStatus: 'none', ...state },
  { version: 1, tabSlot: 1, originToken: 'toy-origin-a', documentGeneration: 4,
    contextGeneration: 5, workerGeneration: 2, projectSlot: 1, branchSlot: 2,
    sequence: 8, lifecycle: 'active', navigation: 'none', authentication: 'none',
    dialog: 'none', evidence: 'complete', writeStatus: 'none', ...event }].map(v => JSON.stringify(v));
}
function diagnostic(state, event, reason, nextStep, resultClass = 'MANUAL_REVIEW') {
  const result = assessFixtureInterruption(...pair(state, event));
  assert.deepEqual(result, { version: 1, resultClass, reason, evidenceTier: 'SIMULATED',
    provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true, nextStep,
    ...Object.fromEntries(flags.map(key => [key, false])) });
  assert.ok(Object.isFrozen(result));
  return result;
}

for (const choice of ['approve', 'deny', 'defer', 'cancel']) {
  test(`AT01 ${choice}: synthetic intent neither authorizes nor advances either coordinator`, () => {
    const step = fixture();
    const controls = factories.map(([, create]) => create(plan(step, fixture('F05-interrupted'))));
    const before = controls.map(c => position(c, 'awaiting_operator'));
    const approval = createApprovalCheckpoint(step);
    const checkpoint = approval.preview();
    const intent = approval.submit(review(checkpoint, choice));
    assert.deepEqual(intent, { decision: 'review_recorded', choice, reviewRecorded: true,
      terminal: true, executionAuthorized: false, evidenceTier: 'SIMULATED' });
    controls.forEach((c, i) => assert.deepEqual(c.next(), before[i]));
    controls.forEach((c, i) => {
      invalid(factories[i][0], () => c.submit(submission(step, intent)));
      position(c, 'blocked');
    });
    invalid('Approval review', () => approval.submit(review(checkpoint)));
    assert.strictEqual(approval.status(), intent);
  });
}

test('AT02 each review identity field rejects substitution and a later valid choice cannot repair it', () => {
  for (const change of [v => { v.run = 'other-run'; }, v => { v.step = 'fixture-step-2'; },
    v => { v.operation = 'install-module'; }, v => { v.target.provider = 'plementus'; },
    v => { v.target.reference = 'other-target'; }, v => { v.target.environment = 'production'; },
    v => { v.approvalReference = 'other-approval'; }, v => { delete v.approvalReference; }]) {
    const approval = createApprovalCheckpoint(fixture());
    const checkpoint = approval.preview(); const value = review(checkpoint); change(value);
    invalid('Approval review', () => approval.submit(value));
    invalid('Approval review', () => approval.submit(review(checkpoint)));
    assert.equal(approval.status().decision, 'blocked');
    assert.equal(approval.status().executionAuthorized, false);
  }
});

test('AT03 copied serialized cross-instance and consumed checkpoints cannot transfer intent', () => {
  for (const copy of [p => ({ ...p }), p => structuredClone(p), p => JSON.parse(JSON.stringify(p)),
    () => createApprovalCheckpoint(fixture()).preview()]) {
    const approval = createApprovalCheckpoint(fixture()); const checkpoint = approval.preview();
    invalid('Approval review', () => approval.submit(review(copy(checkpoint))));
    assert.equal(approval.status().decision, 'blocked');
    invalid('Approval review', () => approval.submit(review(checkpoint)));
  }
  const first = createApprovalCheckpoint(fixture()); const value = review(first.preview());
  const intent = first.submit(value);
  for (const replay of [value, intent, structuredClone(intent)]) {
    const second = createApprovalCheckpoint(fixture());
    invalid('Approval review', () => second.submit(replay));
    assert.equal(second.status().decision, 'blocked');
  }
  invalid('Approval review', () => first.submit(value));
  assert.strictEqual(first.status(), intent);
});

test('AT04 reported definition drift closes approval even if the definition is subsequently restored', () => {
  for (const change of [s => { s.request.context.step = 'fixture-step-2'; },
    s => { s.request.target.reference = 'other-target'; }, s => { delete s.request.context; }]) {
    const step = fixture(); const approval = createApprovalCheckpoint(step);
    const checkpoint = approval.preview(); const original = structuredClone(step);
    change(step); invalid('Approval review', () => approval.preview());
    Object.assign(step, original);
    invalid('Approval review', () => approval.submit(review(checkpoint)));
    assert.equal(approval.status().decision, 'blocked');
  }
});

test('AT05 production unsupported operations and wrong or missing request approval reject at all factories', () => {
  for (const change of [s => { s.request.target.environment = 'production'; },
    s => { s.capability.operation = s.request.operation = 'unsupported-operation'; },
    s => { s.request.approvalReference = 'other-approval'; }, s => { delete s.request.approvalReference; }]) {
    const step = fixture(); change(step);
    invalid('Approval review', () => createApprovalCheckpoint(step));
    for (const [kind, create] of factories) invalid(kind, () => create(plan(step)));
  }
});

test('AT06 a lifecycle diagnostic is disconnected from pending approval; browser invalidation is absent', () => {
  const approval = createApprovalCheckpoint(fixture()); const checkpoint = approval.preview();
  diagnostic({}, { lifecycle: 'context_lost' }, 'context_lost', 'FRESH_SELECTION');
  assert.equal(approval.status().decision, 'awaiting_review');
  const intent = approval.submit(review(checkpoint));
  assert.equal(intent.reviewRecorded, true);
  assert.equal(intent.executionAuthorized, false);
  assert.deepEqual(Object.keys(approval).sort(), ['preview', 'status', 'submit']);
});

for (const scenario of uncertain) {
  test(`AT07 ${scenario.id}: uncertainty survives duplicate input resume new approval and a second mutation`, () => {
    assert.equal(scenario.request.parameters['possible-write'], true);
    assert.equal(scenario.result.status, 'unknown');
    assert.equal(scenario.result.verification, 'none');
    for (const [kind, create] of factories) {
      const first = fixture(scenario.id); const second = fixture('F07-connect');
      const control = create(plan(first, second));
      const terminal = control.submit(submission(first, scenario.result));
      position(control, 'reconcile_required');
      for (const value of [submission(first, scenario.result), structuredClone(submission(first, scenario.result)),
        submission(second, FAILURE_SCENARIOS.find(s => s.id === 'F07-connect').result)]) {
        invalid(kind, () => control.submit(value));
        assert.deepEqual(control.next(), terminal);
      }
      if (control.control) for (const action of ['resume', 'cancel', 'pause']) {
        invalid(kind, () => control.control(command(control, first, action)));
        assert.strictEqual(control.next(), terminal);
      }
      const approval = createApprovalCheckpoint(first);
      assert.equal(approval.submit(review(approval.preview())).executionAuthorized, false);
      assert.deepEqual(control.next(), terminal);
      position(control, 'reconcile_required');
    }
  });

  test(`AT08 ${scenario.id}: observed safe retry failure and permission labels cannot replace latched uncertainty`, () => {
    for (const patch of [{ status: 'observed', category: 'none', retrySafety: 'unsafe', reconciliationRequired: false },
      { retrySafety: 'safe' }, { status: 'failed', retrySafety: 'unsafe', reconciliationRequired: false },
      { status: 'failed', category: 'permission', retrySafety: 'unsafe', reconciliationRequired: false },
      { status: 'blocked', category: 'permission', retrySafety: 'unsafe', reconciliationRequired: false }]) {
      for (const [kind, create] of factories) {
        const step = fixture(scenario.id); const control = create(plan(step));
        control.submit(submission(step, scenario.result));
        invalid(kind, () => control.submit(submission(step, { ...scenario.result, ...patch })));
        position(control, 'reconcile_required', 1);
      }
    }
  });

  test(`AT09 ${scenario.id}: malformed initial uncertainty and synthetic success claims fail closed`, () => {
    for (const patch of [{ status: 'observed' }, { status: 'failed' }, { status: 'blocked' },
      { retrySafety: 'safe' }, { reconciliationRequired: false },
      { status: 'observed', category: 'none', retrySafety: 'unsafe', reconciliationRequired: false }]) {
      for (const [kind, create] of factories) {
        const step = fixture(scenario.id); const control = create(plan(step));
        invalid(kind, () => control.submit(submission(step, { ...scenario.result, ...patch })));
        position(control, 'blocked', 1);
      }
    }
  });
}

test('AT10 manual attestation invented verification and provider-tier claims cannot confirm a fixture mutation', () => {
  for (const scenario of uncertain) for (const patch of [
    { verification: 'operator-confirmed' }, { verified: true }, { verification: 'provider-state' },
    { status: 'manual-attestation', evidenceTier: 'MANUALLY_ATTESTED', category: 'unverified',
      retrySafety: 'unsafe', reconciliationRequired: false },
    { status: 'observed', evidenceTier: scenario.capability.provider === 'plementus' ?
      'PLEMENTUS_DEMO_VERIFIED' : 'ODOO_SH_DEMO_VERIFIED', category: 'none',
      retrySafety: 'unsafe', reconciliationRequired: false, verification: 'provider-state' },
  ]) for (const [kind, create] of factories) {
    const step = fixture(scenario.id); const control = create(plan(step));
    invalid(kind, () => control.submit(submission(step, { ...scenario.result, ...patch })));
    position(control, 'blocked', 1);
  }
});

test('AT11 missing mutation evidence never defaults to completion or safe retry', () => {
  for (const result of [undefined, null, {}, { status: 'observed' }]) {
    for (const [kind, create] of factories) {
      const step = fixture(); const control = create(plan(step));
      invalid(kind, () => control.submit(submission(step, result)));
      position(control, 'blocked', 1);
    }
  }
});

test('AT12 new controller loses in-memory uncertainty; no durable write history is implemented', () => {
  for (const [, create] of factories) {
    const old = create(plan(fixture()));
    old.submit(submission(fixture(), uncertain[0].result));
    position(old, 'reconcile_required', 1);
    const fresh = create(plan(fixture()));
    position(fresh, 'awaiting_operator', 1);
    assert.deepEqual(Object.keys(fresh).sort(), create === createPauseControl ?
      ['control', 'next', 'submit'] : ['next', 'submit']);
  }
});

test('AT13 recovery reads supplied synthetic records without reconciling or writing provider state', () => {
  const runId = '12345678-1234-4123-8123-123456789abc';
  for (const state of ['running', 'awaiting_operator', 'reconcile_required', 'failed']) {
    const record = Object.freeze({ schemaVersion: 1, runId, state, step: 1, evidenceTier: 'SIMULATED', revision: 0 });
    let reads = 0;
    const adapter = { get(id) { assert.equal(id, runId); reads++; return record; } };
    for (let i = 0; i < 2; i++) assert.deepEqual(decideRecovery(adapter, runId, 0),
      { decision: 'reconcile_required', state, revision: 0 });
    invalid('Recovery decision', () => decideRecovery(adapter, runId, 1));
    assert.equal(reads, 3);
    assert.equal(record.state, state);
  }
  for (const record of [null, {}, { state: 'completed' }])
    invalid('Recovery decision', () => decideRecovery({ get: () => record }, runId, 0));
});

test('AT14 login MFA CAPTCHA dialogs and navigation stay manual without execution authority', () => {
  for (const [authentication, reason] of [['login_required', 'login_required'], ['mfa', 'mfa_required'],
    ['captcha', 'captcha_required'], ['session_expired', 'session_expired']])
    diagnostic({}, { authentication }, reason, 'MANUAL_AUTH');
  for (const [dialog, reason] of [['unexpected', 'unexpected_dialog'], ['unsupported', 'unsupported_dialog']])
    diagnostic({}, { dialog }, reason, 'MANUAL_DIALOG');
  for (const [navigation, reason] of [['reload', 'document_reload'], ['unexpected', 'unexpected_navigation'],
    ['same_document_navigation', 'same_document_navigation']])
    diagnostic({}, { navigation }, reason, 'FRESH_SELECTION');
});

test('AT15 restart session loss and interruption never establish whether a write happened', () => {
  for (const lifecycle of ['worker_restarted', 'browser_restarted', 'worker_suspended', 'worker_resumed', 'session_lost']) {
    for (const [state, event] of [[{ lifecycle }, {}], [{}, { lifecycle }]]) {
      diagnostic(state, event, lifecycle, 'FRESH_SELECTION');
      diagnostic({ ...state, writeStatus: 'possible_unresolved' }, event,
        'possible_write_unresolved', 'MANUAL_RECONCILIATION');
    }
  }
});

test('AT16 cancellation wins diagnostic precedence while recorded uncertainty remains unreconciled', () => {
  const step = fixture(); const control = createPauseControl(plan(step));
  control.submit(submission(step, uncertain[0].result));
  for (const [state, event] of [[{ lifecycle: 'cancelled', writeStatus: 'possible_unresolved' }, {}],
    [{ writeStatus: 'possible_unresolved' }, { lifecycle: 'cancelled' }]])
    diagnostic(state, event, 'operator_cancelled', 'STOP', 'CANCELLED');
  invalid('Pause control', () => control.control(command(control, step, 'cancel')));
  position(control, 'reconcile_required', 1);
});

test('AT17 stale duplicate and out-of-order observations cannot produce a stable diagnostic', () => {
  for (const [event, reason] of [[{ documentGeneration: 3 }, 'document_generation_mismatch'],
    [{ contextGeneration: 6 }, 'context_generation_mismatch'], [{ workerGeneration: 1 }, 'worker_context_mismatch'],
    [{ sequence: 7 }, 'duplicate_observation'], [{ sequence: 6 }, 'delayed_observation'],
    [{ sequence: 9 }, 'observation_gap']]) diagnostic({}, event, reason, 'FRESH_SELECTION');
});

test('AT18 changed origin or target requests manual review and cannot inherit write authority', () => {
  const approval = createApprovalCheckpoint(fixture()); const checkpoint = approval.preview();
  diagnostic({}, { originToken: 'toy-origin-b' }, 'cross_origin', 'FRESH_SELECTION');
  diagnostic({}, { projectSlot: 2 }, 'target_mismatch', 'MANUAL_TARGET');
  diagnostic({}, { branchSlot: 1 }, 'target_mismatch', 'MANUAL_TARGET');
  // shortcut: approval has no origin/lifecycle input, upgrade only under a separately approved binding contract.
  assert.equal(Object.hasOwn(checkpoint, 'originToken'), false);
  assert.equal(approval.status().decision, 'awaiting_review');
  const value = review(checkpoint); value.target.reference = 'other-target';
  invalid('Approval review', () => approval.submit(value));
  assert.equal(approval.status().executionAuthorized, false);
});

test('AT19 stable input replays identical stateless diagnostics even after restart or uncertainty', () => {
  const stable = diagnostic({}, {}, 'synthetic_stable', 'REVIEW_FIXTURE', 'SYNTHETIC_DIAGNOSTIC');
  diagnostic({}, { lifecycle: 'worker_restarted' }, 'worker_restarted', 'FRESH_SELECTION');
  diagnostic({}, { writeStatus: 'possible_unresolved' }, 'possible_write_unresolved', 'MANUAL_RECONCILIATION');
  const replay = diagnostic({}, {}, 'synthetic_stable', 'REVIEW_FIXTURE', 'SYNTHETIC_DIAGNOSTIC');
  assert.deepEqual(replay, stable);
  assert.notStrictEqual(replay, stable);
});

test('AT20 missing evidence stays manual and stable diagnostics cannot serve as mutation results', () => {
  diagnostic({}, { evidence: 'missing' }, 'evidence_missing', 'MANUAL_PAGE');
  diagnostic({}, { evidence: 'ambiguous' }, 'evidence_ambiguous', 'MANUAL_PAGE');
  const stable = diagnostic({}, {}, 'synthetic_stable', 'REVIEW_FIXTURE', 'SYNTHETIC_DIAGNOSTIC');
  for (const [kind, create] of factories) {
    const control = create(plan(fixture()));
    invalid(kind, () => control.submit(submission(fixture(), stable)));
    position(control, 'blocked', 1);
  }
});

test('AT21 hostile objects accessors throwing and revoked proxies fail closed at supported boundaries', () => {
  let getters = 0;
  const hostile = new Proxy({}, { getPrototypeOf() { throw Error('fixture-token-DO-NOT-ECHO'); } });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const make of [() => null, () => [], () => Object.create(null), () => hostile, () => revoked.proxy,
    v => Object.defineProperty(v, 'run', { enumerable: true, get() { getters++; throw Error('fixture-password'); } })]) {
    const approval = createApprovalCheckpoint(fixture());
    invalid('Approval review', () => approval.submit(make(review(approval.preview()))));
    assert.equal(approval.status().decision, 'blocked');
    for (const [kind, create] of factories) {
      const control = create(plan(fixture()));
      invalid(kind, () => control.submit(make(submission(fixture(), uncertain[0].result))));
      position(control, 'blocked', 1);
    }
    for (let side = 0; side < 2; side++) {
      const args = pair(); args[side] = make({});
      const result = assessFixtureInterruption(...args);
      assert.equal(result.reason, 'invalid_input');
      for (const key of flags) assert.equal(result[key], false);
    }
  }
  assert.equal(getters, 0);
});

test('AT22 credential-like fixture inputs and raw exceptions are absent from outputs and generic errors', () => {
  for (const secret of ['fixture-password-DO-NOT-ECHO', 'Bearer fixture-token', 'session=fixture-cookie',
    '-----BEGIN PRIVATE KEY-----fixture', 'person@fixture.invalid']) {
    const approval = createApprovalCheckpoint(fixture()); const value = review(approval.preview());
    value.approvalReference = secret;
    invalid('Approval review', () => approval.submit(value));
    const control = createStepCoordinator(plan(fixture()));
    invalid('Step coordination', () => control.submit({ ...submission(fixture(), uncertain[0].result), run: secret }));
    const pause = createPauseControl(plan(fixture()));
    invalid('Pause control', () => pause.submit(new Proxy({}, { getPrototypeOf() { throw Error(secret); } })));
    const result = assessFixtureInterruption(...pair({}, { dialog: secret }));
    invalid('Recovery decision', () => decideRecovery({ get() { throw Error(secret); } },
      '12345678-1234-4123-8123-123456789abc', 0));
    for (const output of [approval.status(), control.next(), pause.next(), result]) {
      const text = JSON.stringify(output);
      assert.equal(text.includes(secret), false);
      assert.ok(text.length < 2048);
    }
  }
});

test('AT23 all fixture paths preserve inputs and access no provider browser storage or timer capability', () => {
  const before = JSON.stringify(FAILURE_SCENARIOS);
  const keys = ['fetch', 'chrome', 'browser', 'document', 'window', 'XMLHttpRequest', 'WebSocket',
    'indexedDB', 'localStorage', 'sessionStorage', 'setTimeout', 'setInterval'];
  const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  let accesses = 0;
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, get() {
      accesses++; throw Error('Forbidden fixture capability');
    } });
    for (const scenario of FAILURE_SCENARIOS) {
      const step = fixture(scenario.id);
      if (step.capability.mutates) for (const choice of ['approve', 'deny', 'defer', 'cancel']) {
        const approval = createApprovalCheckpoint(step);
        assert.equal(approval.submit(review(approval.preview(), choice)).executionAuthorized, false);
      }
      for (const [, create] of factories) {
        const control = create(plan(step));
        const result = control.submit(submission(step, scenario.result));
        assert.equal(result.index, 0);
        assert.equal(result.evidenceTier, 'SIMULATED');
        assert.equal(result.retryAllowed, false);
      }
    }
    diagnostic({}, {}, 'synthetic_stable', 'REVIEW_FIXTURE', 'SYNTHETIC_DIAGNOSTIC');
    assert.equal(accesses, 0);
  } finally {
    keys.forEach((key, i) => descriptors[i] ? Object.defineProperty(globalThis, key, descriptors[i]) : delete globalThis[key]);
  }
  assert.equal(JSON.stringify(FAILURE_SCENARIOS), before);
});
