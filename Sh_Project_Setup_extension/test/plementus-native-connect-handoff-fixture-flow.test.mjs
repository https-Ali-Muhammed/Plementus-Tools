import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as adapter from '../src/plementus/native-connect-handoff-fixture-flow.mjs';

const { assessFixturePlementusNativeConnectHandoff: assess } = adapter;
const flags = 'browserObserved permissionVerified accountVerified rightsVerified subscriptionVerified approvalGranted executionAuthorized mutationAuthorized installationAuthorized trustedContinuingContext associationVerified productionDatabaseVerified stagingCopyVerified moduleInstalled effectsApplied readAuthorized writeAuthorized'.split(' ');
const markers = ['plementus-database-info', 'database-info-candidates', 'connect-live-checkpoint', 'connect-live-control', 'connect-test-checkpoint', 'connect-test-control'];
const keys = ['version', 'evidenceTier', 'provenance', 'fixtureOnly', 'classification', 'reason', 'nextStep', 'syntheticTarget',
  'syntheticCheckpoint', 'syntheticAcknowledgment', 'syntheticAttempt', 'syntheticOutcome', 'syntheticReconciliation',
  'fixtureBaseline', 'databaseInfoState', 'realConnectionState', 'retryPolicy', ...flags];
const manual = 'MANUAL_CHECKPOINT', reconcile = 'MANUAL_RECONCILIATION', fresh = 'FRESH_FIXTURE_CONTEXT';
const ready = 'MANUAL_NATIVE_CONNECT_REVIEW';
function fixture(target = 'live') {
  const common = { version: 1, projectToken: 'fixture-plementus-project-001', environment: target === 'live' ? 'production' : 'test',
    target, documentGeneration: 4, contextGeneration: 5, sequence: 7 };
  return [
    { ...common, page: 'plementus-database-info', priorOutcome: 'none', lifecycle: 'active', authentication: 'none' },
    { ...common, sequence: 8, projectOccurrences: 1, projectLabel: 'Cedar Workshop Demo', markers: [...markers],
      liveEnvironment: 'production', testEnvironment: 'test', liveState: 'not-connected', liveControl: 'disabled',
      testState: 'not-connected', testControl: 'disabled', databaseInfo: 'unsubmitted-preview', nativeKnowledge: 'unknown',
      observation: 'current', lifecycle: 'active', authentication: 'none' },
    { ...common, sequence: 9, decision: 'synthetic_acknowledged' },
    { ...common, sequence: 10, attempt: 'not_attempted', outcome: 'none', verification: 'none' },
  ];
}
function changed(patch = {}, target) {
  const f = fixture(target); for (const [side, values] of Object.entries(patch)) Object.assign(f[side], values); return f;
}
const corpus = [];
function boundary(out) {
  assert.ok(out && typeof out === 'object'); assert.deepEqual(Object.keys(out), keys); assert.ok(Object.isFrozen(out));
  assert.equal(out.version, 1); assert.equal(out.evidenceTier, 'SIMULATED'); assert.equal(out.provenance, 'SYNTHETIC_UNTRUSTED');
  assert.equal(out.fixtureOnly, true); assert.equal(out.realConnectionState, 'UNVERIFIED'); assert.equal(out.retryPolicy, 'NEVER_AUTOMATIC');
  assert.ok(['CORRECT_FIXTURE', 'REVIEW_VERSION', 'STOP', fresh, 'MANUAL_AUTH', manual, reconcile, ready].includes(out.nextStep));
  assert.equal(out.classification, out.nextStep === ready ? 'MANUAL_HANDOFF' : out.nextStep === reconcile ? 'MANUAL_RECONCILIATION' : 'STOP');
  const domains = {
    syntheticTarget: ['UNRESOLVED', 'SYNTHETIC_LIVE', 'SYNTHETIC_TEST'],
    syntheticCheckpoint: ['UNRESOLVED', 'SYNTHETIC_CONNECT_LIVE_CHECKPOINT', 'SYNTHETIC_CONNECT_TEST_CHECKPOINT'],
    syntheticAcknowledgment: ['UNRESOLVED', 'SYNTHETIC_UNREVIEWED', 'SYNTHETIC_HANDOFF_ACK_ONLY'],
    syntheticAttempt: ['UNRESOLVED', 'SYNTHETIC_ATTEMPT_CLAIMED', 'SYNTHETIC_NO_ATTEMPT_CLAIM'],
    syntheticOutcome: ['UNRESOLVED', 'SYNTHETIC_CLAIM_NONE', 'SYNTHETIC_CLAIM_REPORTED_SUCCESS', 'SYNTHETIC_CLAIM_FAILED', 'SYNTHETIC_CLAIM_UNKNOWN', 'SYNTHETIC_CLAIM_INTERRUPTED'],
    syntheticReconciliation: ['UNRESOLVED', 'SYNTHETIC_REQUIRED', 'SYNTHETIC_NOT_INDICATED'],
    fixtureBaseline: ['UNRESOLVED', 'SYNTHETIC_NOT_CONNECTED'],
    databaseInfoState: ['UNRESOLVED', 'SYNTHETIC_UNSUBMITTED_PREVIEW'],
  };
  for (const [key, values] of Object.entries(domains)) assert.ok(values.includes(out[key]), key);
  for (const flag of flags) assert.equal(out[flag], false, flag);
  assert.ok(Object.values(out).every(v => ['number', 'boolean', 'string'].includes(typeof v)));
  const encoded = JSON.stringify(out); assert.ok(encoded.length <= 2048); assert.match(encoded, /^[\x20-\x7e]+$/);
  const sanitized = encoded.replace(/"(?:snapshot|acknowledgment|claim)_projectToken_mismatch"/g, '"project_mismatch"');
  assert.doesNotMatch(sanitized, /fixture-plementus|Cedar Workshop|fixture_cedar|https?:|@|<|secret|password|token|cookie/i);
}
function wire(args, reason = 'native_knowledge_unverified', step = ready) {
  const out = assess(...args); assert.equal(out?.reason, reason); assert.equal(out?.nextStep, step); boundary(out);
  corpus.push([[...args], JSON.stringify(out)]); return out;
}
function run(patch, reason, step, target) { return wire(changed(patch, target).map(JSON.stringify), reason, step); }

for (const target of ['live', 'test']) test(`native handoff ${target}: only a manual recommendation, no connection or authorization`, () => {
  const out = run({}, undefined, undefined, target);
  assert.equal(out.syntheticTarget, target === 'live' ? 'SYNTHETIC_LIVE' : 'SYNTHETIC_TEST');
  assert.equal(out.syntheticCheckpoint, target === 'live' ? 'SYNTHETIC_CONNECT_LIVE_CHECKPOINT' : 'SYNTHETIC_CONNECT_TEST_CHECKPOINT');
  assert.equal(out.syntheticAcknowledgment, 'SYNTHETIC_HANDOFF_ACK_ONLY'); assert.equal(out.syntheticAttempt, 'SYNTHETIC_NO_ATTEMPT_CLAIM');
  assert.equal(out.syntheticOutcome, 'SYNTHETIC_CLAIM_NONE'); assert.equal(out.syntheticReconciliation, 'SYNTHETIC_NOT_INDICATED');
  assert.equal(out.fixtureBaseline, 'SYNTHETIC_NOT_CONNECTED'); assert.equal(out.databaseInfoState, 'SYNTHETIC_UNSUBMITTED_PREVIEW');
});
test('native handoff agrees with unchanged HTML markers, disabled controls and unsubmitted baseline', () => {
  const html = readFileSync(new URL('../fixtures/plementus/database-info.html', import.meta.url), 'utf8');
  assert.match(html, /SIMULATED TEST FIXTURE — NOT REAL CUSTOMER SYSTEM/);
  assert.match(html, /data-project-id="fixture-plementus-project-001"/); assert.match(html, /Cedar Workshop Demo/);
  const observed = [...html.matchAll(/data-fixture="([^"]+)"/g)].map(m => m[1]);
  for (const marker of markers) assert.equal(observed.filter(m => m === marker).length, 1);
  for (const target of ['live', 'test']) {
    assert.ok(html.includes(`data-fixture="connect-${target}-checkpoint" data-state="not-connected"`));
    assert.ok(html.includes(`data-fixture="connect-${target}-control" disabled`));
  }
  assert.match(html, /no form has been submitted/); assert.doesNotMatch(html, /<form\b|<script\b/); run();
});
for (const marker of markers) {
  test(`native handoff absent ${marker} fails closed`, () => {
    const reason = marker.includes('plementus') || marker === 'database-info-candidates' ? 'unrecognized_layout'
      : marker.endsWith('control') ? 'control_missing_or_unknown' : 'checkpoint_missing';
    run({ 1: { markers: markers.filter(m => m !== marker) } }, reason, manual);
  });
  test(`native handoff duplicate ${marker} fails closed`, () => run({ 1: { markers: [...markers, marker] } }, 'duplicate_marker', manual));
}
test('native handoff reversed markers work; unknown or substituted checkpoint cannot be recognized', () => {
  run({ 1: { markers: [...markers].reverse() } });
  run({ 1: { markers: [...markers, 'unknown-marker'] } }, 'unknown_marker', manual);
  run({ 1: { markers: markers.map(m => m === 'connect-test-checkpoint' ? 'connect-live-checkpoint' : m) } }, 'duplicate_marker', manual);
  for (const liveEnvironment of ['test', 'missing']) run({ 1: { liveEnvironment } }, 'checkpoint_environment_conflict', manual);
  for (const testEnvironment of ['production', 'missing']) run({ 1: { testEnvironment } }, 'checkpoint_environment_conflict', manual);
});
for (const target of ['live', 'test']) for (const control of ['liveControl', 'testControl'])
  test(`native ${target} handoff requires even ${control} disabled`, () => {
    for (const state of ['enabled', 'missing', 'unknown'])
      run({ 1: { [control]: state } }, state === 'enabled' ? 'control_conflict' : 'control_missing_or_unknown', state === 'enabled' ? 'STOP' : manual, target);
  });
for (const target of ['live', 'test']) for (const key of ['liveState', 'testState'])
  test(`native ${target} handoff cannot borrow ${key} connection evidence`, () => {
    for (const state of ['missing', 'unknown', 'reported-connected']) {
      const out = run({ 1: { [key]: state } }, 'connection_baseline_unverified', state === 'missing' ? manual : reconcile, target);
      assert.equal(out.fixtureBaseline, 'UNRESOLVED');
    }
  });
for (const databaseInfo of ['missing', 'unknown', 'reported-submitted', 'reported-saved'])
  test(`native handoff Database INFO ${databaseInfo} cannot stand for saved real data`, () => {
    const out = run({ 1: { databaseInfo } }, 'database_info_' + databaseInfo, manual);
    assert.equal(out.databaseInfoState, 'UNRESOLVED');
  });
test('native knowledge claims cannot remove the manual checkpoint', () => {
  assert.deepEqual(run({ 1: { nativeKnowledge: 'claimed-known' } }), run());
});
for (const decision of ['missing', 'pending', 'declined', 'interrupted', 'cancelled', 'stale', 'duplicated', 'conflicting'])
  test(`native acknowledgment ${decision} is a distinct stop and never approval`, () => {
    const out = run({ 2: { decision } }, 'acknowledgment_' + decision, ['declined', 'cancelled'].includes(decision) ? 'STOP' : manual);
    assert.equal(out.syntheticAcknowledgment, 'SYNTHETIC_UNREVIEWED');
    const uncertain = run({ 2: { decision }, 3: { attempt: 'claimed_attempt', outcome: 'unknown' } },
      'acknowledgment_' + decision, ['declined', 'cancelled'].includes(decision) ? 'STOP' : reconcile);
    assert.equal(uncertain.syntheticReconciliation, 'SYNTHETIC_REQUIRED');
  });
for (const [outcome, reason, label] of [
  ['none', 'attempt_claimed', 'SYNTHETIC_CLAIM_NONE'], ['reported_success', 'outcome_reported_success_claimed', 'SYNTHETIC_CLAIM_REPORTED_SUCCESS'],
  ['failed', 'outcome_failed_claimed', 'SYNTHETIC_CLAIM_FAILED'], ['unknown', 'outcome_unknown_claimed', 'SYNTHETIC_CLAIM_UNKNOWN'],
  ['interrupted', 'outcome_interrupted_claimed', 'SYNTHETIC_CLAIM_INTERRUPTED'],
]) test(`native attempt ${outcome} stays a synthetic claim requiring manual reconciliation`, () => {
  const out = run({ 3: { attempt: 'claimed_attempt', outcome } }, reason, reconcile);
  assert.equal(out.syntheticAttempt, 'SYNTHETIC_ATTEMPT_CLAIMED'); assert.equal(out.syntheticOutcome, label);
  assert.equal(out.syntheticReconciliation, 'SYNTHETIC_REQUIRED'); assert.equal(out.fixtureBaseline, 'SYNTHETIC_NOT_CONNECTED');
});
test('native claimed independent verification never establishes real verification', () => {
  const out = run({ 3: { attempt: 'claimed_attempt', outcome: 'reported_success', verification: 'claimed_independent_verification' } },
    'independent_verification_claim_untrusted', reconcile);
  assert.equal(out.syntheticReconciliation, 'SYNTHETIC_REQUIRED'); assert.equal(out.realConnectionState, 'UNVERIFIED');
});
test('native no-attempt conflicting outcomes and old uncertainty cannot authorize retries', () => {
  for (const outcome of ['reported_success', 'failed', 'unknown', 'interrupted']) run({ 3: { outcome } }, 'claim_conflict', reconcile);
  run({ 3: { verification: 'claimed_independent_verification' } }, 'claim_conflict', reconcile);
  run({ 0: { priorOutcome: 'uncertain' } }, 'prior_outcome_uncertain', reconcile);
});
for (const side of [0, 1]) {
  for (const lifecycle of ['cancelled', 'interrupted', 'worker_lost', 'tab_lost', 'context_lost', 'session_lost'])
    test(`native envelope ${side} ${lifecycle} preserves possible-effect uncertainty`, () => {
      const reason = lifecycle === 'cancelled' ? 'operator_cancelled' : lifecycle === 'interrupted' ? lifecycle : 'lifecycle_' + lifecycle;
      const step = lifecycle === 'cancelled' ? 'STOP' : fresh;
      run({ [side]: { lifecycle } }, reason, step);
      const out = run({ [side]: { lifecycle }, 3: { attempt: 'claimed_attempt', outcome: 'reported_success' } }, reason, step);
      assert.equal(out.syntheticReconciliation, 'SYNTHETIC_REQUIRED'); assert.equal(out.syntheticTarget, 'UNRESOLVED');
    });
  for (const authentication of ['login', 'mfa', 'captcha', 'session_expired'])
    test(`native envelope ${side} ${authentication} requires the human`, () => {
      const out = run({ [side]: { authentication }, 0: { ...(side === 0 ? { authentication } : {}), priorOutcome: 'uncertain' } },
        'authentication_' + authentication, 'MANUAL_AUTH');
      assert.equal(out.syntheticReconciliation, 'SYNTHETIC_REQUIRED');
    });
}
const binding = ['projectToken', 'environment', 'target', 'documentGeneration', 'contextGeneration'];
for (const [side, kind] of [[1, 'snapshot'], [2, 'acknowledgment'], [3, 'claim']]) {
  for (const [key, wrong] of [['projectToken', 'fixture-plementus-project-002'], ['environment', 'test'], ['target', 'test'], ['documentGeneration', 6], ['contextGeneration', 6]])
    test(`native ${kind} ${key} cannot inherit another context`, () => {
      for (const value of [wrong, null]) {
        const out = run({ [side]: { [key]: value } }, `${kind}_${key}_mismatch`, fresh);
        assert.equal(out.syntheticTarget, 'UNRESOLVED');
      }
    });
  test(`native ${kind} duplicate replay delayed and gapped observations stop`, () => {
    for (const [sequence, suffix] of [[7, 'duplicate_observation'], [6, 'delayed_observation'], [7 + side + 1, 'observation_gap']])
      run({ [side]: { sequence } }, `${kind}_${suffix}`, fresh);
    if (side > 1) run({ [side]: { sequence: 7 + side - 1 } }, `${kind}_delayed_observation`, fresh);
  });
}
test('native Live/Test acknowledgment and results are independently bound', () => {
  for (const side of [1, 2, 3]) for (const target of ['live', 'test']) {
    const f = fixture(target); const alternate = fixture(target === 'live' ? 'test' : 'live'); f[side] = alternate[side];
    wire(f.map(JSON.stringify), ['context', 'snapshot', 'acknowledgment', 'claim'][side] + '_environment_mismatch', fresh);
  }
});
const cases = [
  [{ 0: { version: 2 } }, 'unsupported_version', 'REVIEW_VERSION'],
  [{ 0: { lifecycle: 'cancelled' } }, 'operator_cancelled', 'STOP'],
  [{ 1: { lifecycle: 'worker_lost' } }, 'lifecycle_worker_lost', fresh],
  [{ 0: { lifecycle: 'interrupted' } }, 'interrupted', fresh],
  [{ 1: { authentication: 'login' } }, 'authentication_login', 'MANUAL_AUTH'],
  [{ 0: { page: null } }, 'unrecognized_layout', manual],
  [{ 1: { projectOccurrences: 0 } }, 'project_missing', manual],
  [{ 1: { projectLabel: 'unknown' } }, 'project_conflict', manual],
  [{ 0: { target: null } }, 'target_missing', manual],
  [{ 0: { environment: null } }, 'environment_missing', manual],
  [{ 0: { environment: 'test' } }, 'target_environment_conflict', manual],
  [{ 0: { documentGeneration: null } }, 'documentGeneration_missing', fresh],
  [{ 0: { contextGeneration: null } }, 'contextGeneration_missing', fresh],
  [{ 0: { sequence: 999998 } }, 'sequence_exhausted', fresh],
  [{ 1: { projectToken: 'fixture-plementus-project-002' } }, 'snapshot_projectToken_mismatch', fresh],
  [{ 1: { sequence: 7 } }, 'snapshot_duplicate_observation', fresh],
  [{ 2: { target: 'test' } }, 'acknowledgment_target_mismatch', fresh],
  [{ 2: { sequence: 10 } }, 'acknowledgment_observation_gap', fresh],
  [{ 3: { contextGeneration: 6 } }, 'claim_contextGeneration_mismatch', fresh],
  [{ 3: { sequence: 8 } }, 'claim_delayed_observation', fresh],
  [{ 1: { observation: 'stale' } }, 'observation_stale', manual],
  [{ 1: { markers: [...markers, 'unknown-marker'] } }, 'unknown_marker', manual],
  [{ 1: { markers: [...markers, 'connect-live-checkpoint'] } }, 'duplicate_marker', manual],
  [{ 1: { liveControl: 'enabled' } }, 'control_conflict', 'STOP'],
  [{ 1: { testControl: 'missing' } }, 'control_missing_or_unknown', manual],
  [{ 1: { markers: markers.filter(m => m !== 'connect-test-checkpoint') } }, 'checkpoint_missing', manual],
  [{ 1: { testEnvironment: 'production' } }, 'checkpoint_environment_conflict', manual],
  [{ 1: { liveState: 'missing' } }, 'connection_baseline_unverified', manual],
  [{ 1: { databaseInfo: 'unknown' } }, 'database_info_unknown', manual],
  [{ 2: { decision: 'stale' } }, 'acknowledgment_stale', manual],
];
for (const [i, [patch, reason, step]] of cases.entries()) test(`native failure precedence row ${i + 1}: ${reason}`, () => run(patch, reason, step));
test('native compatible failure pairs keep documented first-applicable precedence', () => {
  let pairs = 0;
  for (let i = 0; i < cases.length; i++) for (let j = i + 1; j < cases.length; j++) {
    const [a, reason, step] = cases[i], [b] = cases[j];
    if ([0, 1, 2, 3].some(side => Object.keys(a[side] ?? {}).some(key => key in (b[side] ?? {})))) continue;
    run(Object.fromEntries([0, 1, 2, 3].map(side => [side, { ...a[side], ...b[side] }])), reason, step); pairs++;
  }
  assert.ok(pairs > 350);
});
test('native missing project labels identities and pages cannot reach handoff', () => {
  for (const patch of [{ 0: { projectToken: null } }, { 1: { projectLabel: null } }]) run(patch, 'project_missing', manual);
  for (const patch of [{ 0: { projectToken: 'fixture-plementus-project-002' } }, { 1: { projectOccurrences: 2 } }]) run(patch, 'project_conflict', manual);
  run({ 0: { page: 'customer-odoo-apps' } }, 'unrecognized_layout', manual);
  for (const observation of ['missing', 'stale', 'conflicting']) run({ 1: { observation } }, 'observation_' + observation, manual);
});
for (const side of [0, 1, 2, 3]) {
  test(`native schema ${side}: absent extra nested hostile and reordered data rejected without echo`, () => {
    for (const key of Object.keys(fixture()[side])) {
      const f = fixture(); delete f[side][key]; wire(f.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
      for (const value of [{}, key === 'markers' ? [[]] : [], 'secret<unsafe>']) run({ [side]: { [key]: value } }, 'invalid_input', 'CORRECT_FIXTURE');
    }
    for (const key of [...flags, '__proto__', 'password', 'url', 'html', 'connected', 'approved']) {
      const f = fixture(); Object.defineProperty(f[side], key, { value: true, enumerable: true }); wire(f.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
    }
    const f = fixture(); f[side] = Object.fromEntries(Object.entries(f[side]).reverse()); wire(f.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
  });
  test(`native schema ${side}: noncanonical malformed oversized and unsupported versions`, () => {
    const args = fixture().map(JSON.stringify), valid = args[side];
    for (const text of ['', '{}', 'null', '[]', '{', ' ' + valid, valid + '\n', valid + ' ', valid.replace('"version":1', '"version":1,"version":1'),
      valid.replace('"version":1', '"version":1.0'), valid.replace('"version":1', '"version":1e0'), valid.replace('version', '\\u0076ersion'),
      valid.replace('fixture-plementus-project-001', 'é'), valid.replace('fixture-plementus-project-001', '\\u0000'), 'x'.repeat(2048)]) {
      const a = [...args]; a[side] = text; wire(a, 'invalid_input', 'CORRECT_FIXTURE');
    }
    const a = [...args]; a[side] = 'x'.repeat(2049); wire(a, 'input_too_large', 'CORRECT_FIXTURE');
    for (const version of [2, 999]) run({ [side]: { version } }, 'unsupported_version', 'REVIEW_VERSION');
    for (const key of ['version', 'documentGeneration', 'contextGeneration', 'sequence'])
      for (const value of [-1, 1.5, 1000001, '1', true]) run({ [side]: { [key]: value } }, 'invalid_input', 'CORRECT_FIXTURE');
  });
}
test('native primitive validation never invokes hostile or revoked object hooks', () => {
  let touches = 0;
  const hostile = new Proxy({}, { get() { touches++; throw Error('secret'); }, ownKeys() { touches++; throw Error('secret'); } });
  const revoked = Proxy.revocable({}, {}); revoked.revoke(); const callable = Proxy.revocable(() => {}, {}); callable.revoke();
  for (const value of [undefined, null, true, 1, 1n, Symbol('secret'), {}, [], new String('{}'), hostile, revoked.proxy, callable.proxy])
    for (const side of [0, 1, 2, 3]) {
      const args = fixture().map(JSON.stringify); args[side] = value; wire(args, 'invalid_input', 'CORRECT_FIXTURE');
    }
  wire(['x'.repeat(2049), hostile, '', ''], 'invalid_input', 'CORRECT_FIXTURE');
  const args = fixture().map(JSON.stringify); args[0] = args[0].replace('"version":1', '"version":2'); args[3] = '{}';
  wire(args, 'invalid_input', 'CORRECT_FIXTURE'); assert.equal(touches, 0);
});
test('native bounded marker and numeric endpoints enforce the wire contract', () => {
  for (const value of [null, {}, 'connect-live-control', [null], [{}], ['real-connect-control'], Array(13).fill('connect-live-control')])
    run({ 1: { markers: value } }, 'invalid_input', 'CORRECT_FIXTURE');
  run({ 1: { markers: [] } }, 'unrecognized_layout', manual);
  run({ 1: { markers: [...markers, ...markers] } }, 'duplicate_marker', manual);
  run({ 1: { projectOccurrences: 3 } }, 'invalid_input', 'CORRECT_FIXTURE');
  for (const generation of [1, 1000000]) for (const sequence of [0, 999997]) {
    const f = fixture(); f.forEach((v, i) => Object.assign(v, { documentGeneration: generation, contextGeneration: generation, sequence: sequence + i }));
    wire(f.map(JSON.stringify));
  }
});
test('native fresh frozen equal replay cannot gain authority or remember omitted history', () => {
  const a = run(), b = run(); assert.notEqual(a, b); assert.deepEqual(a, b);
  assert.throws(() => { a.approvalGranted = true; }, TypeError);
  assert.throws(() => { a.realConnectionState = 'CONNECTED'; }, TypeError);
  run({ 0: { lifecycle: 'cancelled' } }, 'operator_cancelled', 'STOP'); assert.deepEqual(run(), a);
  const claim = { 3: { attempt: 'claimed_attempt', outcome: 'unknown' } };
  assert.deepEqual(run(claim, 'outcome_unknown_claimed', reconcile), run(claim, 'outcome_unknown_claimed', reconcile));
});
test('native handoff isolation: no consumers or filesystem browser network timer provider capabilities', () => {
  assert.deepEqual(Object.keys(adapter), ['assessFixturePlementusNativeConnectHandoff']);
  const source = readFileSync(new URL('../src/plementus/native-connect-handoff-fixture-flow.mjs', import.meta.url), 'utf8');
  const names = 'import require fetch XMLHttpRequest WebSocket chrome browser localStorage sessionStorage indexedDB process eval Function globalThis window document navigator Date performance setTimeout setInterval setImmediate queueMicrotask Worker Promise console'.split(' ');
  assert.doesNotMatch(source, new RegExp('\\b(?:' + names.join('|') + ')\\b'));
  assert.doesNotMatch(source, /Math\.random|node:|child_process|database-info-fixture-adapter|apps-fixture-adapter|adapters\/|\.click\s*\(|pl_auth/);
  for (const f of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true }))
    if (f.isFile() && /\.(mjs|js|html|json)$/.test(f.name) && f.name !== 'native-connect-handoff-fixture-flow.mjs')
      assert.doesNotMatch(readFileSync(`${f.parentPath}/${f.name}`, 'utf8'), /native-connect-handoff-fixture-flow|assessFixturePlementusNativeConnectHandoff/);
  let touched = 0; const context = {};
  for (const key of [...names, 'location', 'caches', 'clipboard']) Object.defineProperty(context, key, { get() { touched++; throw Error('capability'); } });
  const isolated = runInNewContext(source.replace('export function', 'function') + '\nassessFixturePlementusNativeConnectHandoff;', context,
    { codeGeneration: { strings: false, wasm: false } });
  for (const [patch, reason, step] of [[{}, 'native_knowledge_unverified', ready], ...cases,
    [{ 3: { attempt: 'claimed_attempt', outcome: 'unknown' } }, 'outcome_unknown_claimed', reconcile],
    [{ 3: { attempt: 'claimed_attempt', outcome: 'reported_success', verification: 'claimed_independent_verification' } }, 'independent_verification_claim_untrusted', reconcile]]) {
    const out = isolated(...changed(patch).map(JSON.stringify)); assert.equal(out?.reason, reason); assert.equal(out?.nextStep, step); boundary(out);
  }
  const testOut = isolated(...fixture('test').map(JSON.stringify)); assert.equal(testOut?.syntheticTarget, 'SYNTHETIC_TEST'); boundary(testOut);
  for (const [args, expected] of corpus) assert.equal(JSON.stringify(isolated(...args)), expected);
  const revoked = Proxy.revocable({}, {}); revoked.revoke(); const args = fixture().map(JSON.stringify); args[0] = revoked.proxy;
  const out = isolated(...args); assert.equal(out?.reason, 'invalid_input'); boundary(out); assert.equal(touched, 0);
});
