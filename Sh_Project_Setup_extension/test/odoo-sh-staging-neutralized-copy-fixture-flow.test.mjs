import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as flow from '../src/odoo-sh/staging-neutralized-copy-fixture-flow.mjs';

const assess = flow.assessFixtureStagingCopy;
const flags = 'browserObserved permissionVerified accountVerified rightsVerified subscriptionVerified approvalGranted executionAuthorized mutationAuthorized installationAuthorized trustedContinuingContext associationVerified productionDatabaseVerified stagingCopyVerified moduleInstalled effectsApplied readAuthorized writeAuthorized'.split(' ');
const exercised = [];
function inputs(r = {}, s = {}, c = {}, n = {}) {
  const common = { version: 1, projectToken: 'fixture-project-001',
    sourceEnvironmentToken: 'fixture-production-001', destinationEnvironmentToken: 'fixture-staging-001',
    sourceBranch: 'main', stagingBranch: 'develop', documentGeneration: 4, contextGeneration: 5,
    sequence: 7, lifecycle: 'active' };
  const observation = { ...common, sequence: 8, authentication: 'none' };
  return [{ ...common, intent: 'neutralized_copy', review: 'reviewed', ...r },
    { ...observation, environmentState: 'awaiting_copy', branchState: 'created',
      buildReadiness: 'ready', databaseReadiness: 'ready', ...s },
    { ...observation, copyState: 'not_started', writeOutcome: 'none', approvalEvidence: 'missing', ...c },
    { ...observation, neutralizationState: 'not_assessed', ...n }];
}
const unresolved = ['UNRESOLVED', 'UNRESOLVED', 'UNRESOLVED', 'UNRESOLVED', 'UNRESOLVED'];
const initial = ['CREATED', 'READY', 'READY', 'NOT_STARTED', 'NOT_ASSESSED'];
function check(args, reason, nextStep, states = unresolved) {
  const out = assess(...args);
  assert.equal(out?.reason, reason);
  const expected = { version: 1, evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED',
    fixtureOnly: true, reason, nextStep, syntheticBranch: states[0], syntheticBuild: states[1],
    syntheticDatabase: states[2], syntheticCopy: states[3], syntheticNeutralization: states[4],
    ...Object.fromEntries(flags.map(f => [f, false])) };
  assert.deepEqual(out, expected);
  assert.deepEqual(Reflect.ownKeys(out), Object.keys(expected));
  assert.ok(Object.isFrozen(out));
  assert.ok(Object.values(out).every(v => ['string', 'number', 'boolean'].includes(typeof v)));
  assert.ok(JSON.stringify(out).length <= 2048);
  assert.match(JSON.stringify(out), /^[\x20-\x7e]+$/);
  assert.doesNotMatch(JSON.stringify(out), /fixture-project|fixture-secret|https?:|@|__proto__|constructor/);
  assert.deepEqual(assess(...args), out);
  assert.notEqual(assess(...args), out);
  exercised.push([[...args], JSON.stringify(out)]);
  return out;
}
function run(patches, reason, step, states = initial) {
  return check(inputs(...patches).map(JSON.stringify), reason, step, states);
}
const globals = [
  [{}, {}, { writeOutcome: 'uncertain' }, {}, 'possible_write_unresolved', 'MANUAL_RECONCILIATION'],
  [{}, {}, { copyState: 'unknown' }, {}, 'copy_unknown', 'MANUAL_RECONCILIATION'],
  [{ lifecycle: 'cancelled' }, {}, {}, {}, 'operator_cancelled', 'STOP'],
  [{ lifecycle: 'worker_lost' }, {}, {}, {}, 'context_lost', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { lifecycle: 'interrupted' }, {}, {}, 'lifecycle_interrupted', 'FRESH_FIXTURE_CONTEXT'],
  [{}, {}, {}, { authentication: 'mfa' }, 'authentication_required', 'MANUAL_AUTH'],
  [{ documentGeneration: null }, {}, {}, {}, 'document_generation_missing', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { documentGeneration: 3 }, {}, {}, 'document_generation_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{ contextGeneration: null }, {}, {}, {}, 'context_generation_missing', 'FRESH_FIXTURE_CONTEXT'],
  [{}, {}, { contextGeneration: 3 }, {}, 'context_generation_mismatch', 'FRESH_FIXTURE_CONTEXT'],
  [{}, { sequence: 7 }, {}, {}, 'duplicate_observation', 'FRESH_FIXTURE_CONTEXT'],
  [{}, {}, { sequence: 6 }, {}, 'delayed_observation', 'FRESH_FIXTURE_CONTEXT'],
  [{}, {}, {}, { sequence: 9 }, 'observation_gap', 'FRESH_FIXTURE_CONTEXT'],
  [{ projectToken: null }, {}, {}, {}, 'target_missing', 'MANUAL_FIXTURE_TARGET'],
  [{}, { projectToken: 'fixture-project-002' }, {}, {}, 'project_mismatch', 'MANUAL_FIXTURE_TARGET'],
  [{}, {}, { sourceEnvironmentToken: 'fixture-staging-001' }, {}, 'source_mismatch', 'MANUAL_FIXTURE_TARGET'],
  [{}, {}, {}, { destinationEnvironmentToken: 'fixture-production-001' }, 'destination_mismatch', 'MANUAL_FIXTURE_TARGET'],
  [{ sourceBranch: null }, {}, {}, {}, 'branch_missing', 'MANUAL_FIXTURE_TARGET'],
  [{}, { stagingBranch: 'main' }, {}, {}, 'branch_mismatch', 'MANUAL_FIXTURE_TARGET'],
];
for (const [i, row] of globals.entries()) test(`T global ${i}: ${row[4]}`, () =>
  run(row.slice(0, 4), row[4], row[5], unresolved));

test('T matching target created branch is never a completed copy', () => {
  assert.deepEqual(Object.keys(flow), ['assessFixtureStagingCopy']);
  run([], 'copy_not_started', 'MANUAL_COPY_REVIEW');
  run([{ review: 'pending' }, { buildReadiness: 'pending', databaseReadiness: 'pending' }],
    'copy_review_required', 'MANUAL_COPY_REVIEW', ['CREATED', 'PENDING', 'PENDING', 'NOT_STARTED', 'NOT_ASSESSED']);
});
for (const [review, reason, step] of [['missing', 'copy_review_missing', 'MANUAL_COPY_REVIEW'],
  ['pending', 'copy_review_required', 'MANUAL_COPY_REVIEW'], ['declined', 'review_declined', 'STOP']]) {
  test(`T copy review ${review}`, () => run([{ review }], reason, step));
}
for (const [state, step] of [['missing', 'MANUAL_STAGING_EVIDENCE'], ['stale', 'FRESH_FIXTURE_CONTEXT'],
  ['conflicting', 'MANUAL_RECONCILIATION'], ['unknown', 'MANUAL_STAGING_EVIDENCE']]) {
  test(`T environment ${state}`, () => run([{}, { environmentState: state }], 'staging_environment_' + state, step));
}
for (const state of ['missing', 'pending', 'conflicting']) test(`T branch ${state}`, () =>
  run([{}, { branchState: state }], 'staging_branch_' + state,
    state === 'conflicting' ? 'MANUAL_RECONCILIATION' : 'MANUAL_STAGING_EVIDENCE', [state.toUpperCase(), ...initial.slice(1)]));
const readiness = [
  ['conflicting', 'staging_evidence_conflicting', 'MANUAL_RECONCILIATION'],
  ['missing', 'staging_evidence_missing', 'MANUAL_STAGING_EVIDENCE'],
  ['stale', 'staging_evidence_stale', 'FRESH_FIXTURE_CONTEXT'],
  ['failed', 'staging_failed', 'MANUAL_FAILURE_REVIEW'],
  ['unknown', 'staging_unknown', 'MANUAL_STAGING_EVIDENCE'],
  ['pending', 'staging_build_pending', 'MANUAL_STAGING_EVIDENCE'],
];
for (const [state, reason, step] of readiness) test(`T independent readiness ${state}`, () => {
  run([{}, { buildReadiness: state }], reason, step, ['CREATED', state.toUpperCase(), 'READY', 'NOT_STARTED', 'NOT_ASSESSED']);
  run([{}, { databaseReadiness: state }], state === 'pending' ? 'staging_database_pending' : reason, step,
    ['CREATED', 'READY', state.toUpperCase(), 'NOT_STARTED', 'NOT_ASSESSED']);
});
for (const [copyState, reason, step] of [['review_required', 'copy_review_required', 'MANUAL_COPY_REVIEW'],
  ['pending', 'copy_pending', 'MANUAL_COPY_OBSERVATION'], ['failed', 'copy_failed', 'MANUAL_RECONCILIATION']]) {
  test(`T copy ${copyState}`, () => run([{}, {}, { copyState, approvalEvidence: 'caller_reported' }],
    reason, step, ['CREATED', 'READY', 'READY', copyState.toUpperCase(), 'NOT_ASSESSED']));
}
for (const [state, reason, step] of [
  ['not_assessed', 'neutralization_not_assessed', 'MANUAL_NEUTRALIZATION_REVIEW'],
  ['pending', 'neutralization_pending', 'MANUAL_NEUTRALIZATION_REVIEW'],
  ['incomplete', 'neutralization_incomplete', 'MANUAL_RECONCILIATION'],
  ['conflicting', 'neutralization_conflicting', 'MANUAL_RECONCILIATION'],
  ['unknown', 'neutralization_unknown', 'MANUAL_RECONCILIATION'],
  ['manual_verification', 'neutralization_manual_verification', 'MANUAL_NEUTRALIZATION_REVIEW'],
  ['reported_neutralized', 'synthetic_reported_copy_neutralization', 'MANUAL_INDEPENDENT_VERIFICATION'],
]) test(`T reported copy with neutralization ${state} remains unverified`, () => {
  run([{}, { environmentState: 'present' }, { copyState: 'reported_complete', approvalEvidence: 'caller_reported' },
    { neutralizationState: state }], reason, step, ['CREATED', 'READY', 'READY', 'REPORTED_COMPLETE', state.toUpperCase()]);
});
test('T attempts without reviewed intent or even reported approval require reconciliation', () => {
  for (const copyState of ['pending', 'failed', 'reported_complete']) {
    const states = ['CREATED', 'READY', 'READY', copyState.toUpperCase(), 'NOT_ASSESSED'];
    run([{}, {}, { copyState }], 'copy_approval_missing', 'MANUAL_RECONCILIATION', states);
    for (const review of ['missing', 'pending', 'declined'])
      run([{ review }, {}, { copyState }], 'copy_review_conflict', 'MANUAL_RECONCILIATION', states);
  }
});
test('T neutralization cannot substitute for copy context or authenticated approval', () => {
  for (const copyState of ['not_started', 'review_required', 'pending', 'failed'])
    run([{}, {}, { copyState }, { neutralizationState: 'reported_neutralized' }],
      'neutralization_without_copy', 'MANUAL_RECONCILIATION', ['CREATED', 'READY', 'READY', copyState.toUpperCase(), 'REPORTED_NEUTRALIZED']);
  run([{}, {}, { copyState: 'reported_complete' }, { neutralizationState: 'reported_neutralized' }],
    'copy_approval_missing', 'MANUAL_RECONCILIATION', ['CREATED', 'READY', 'READY', 'REPORTED_COMPLETE', 'REPORTED_NEUTRALIZED']);
});
test('T uncertainty outranks cancellation new review ready builds and neutralization claims', () => {
  for (const review of ['missing', 'pending', 'reviewed', 'declined']) for (const copyState of ['not_started', 'reported_complete', 'unknown'])
    for (let side = 0; side < 4; side++) {
      const a = inputs({ review }, {}, { copyState, writeOutcome: 'uncertain' }, { neutralizationState: 'reported_neutralized' });
      a[side].lifecycle = 'cancelled';
      check(a.map(JSON.stringify), 'possible_write_unresolved', 'MANUAL_RECONCILIATION');
    }
  run([{ lifecycle: 'cancelled' }, {}, { copyState: 'unknown' }], 'copy_unknown', 'MANUAL_RECONCILIATION', unresolved);
});
test('T every compatible global pair obeys first-applicable precedence', () => {
  for (let i = 0; i < globals.length; i++) for (let j = i + 1; j < globals.length; j++) {
    const a = globals[i], b = globals[j];
    if ([0, 1, 2, 3].some(s => Object.keys(a[s]).some(k => k in b[s] && a[s][k] !== b[s][k]))) continue;
    run([0, 1, 2, 3].map(s => ({ ...b[s], ...a[s] })), a[4], a[5], unresolved);
  }
});
test('T independent readiness pairs retain build and database labels', () => {
  const rows = [...readiness, ['ready', 'copy_not_started', 'MANUAL_COPY_REVIEW']];
  for (let b = 0; b < rows.length; b++) for (let d = 0; d < rows.length; d++) {
    const first = rows[Math.min(b, d)];
    const reason = b === 6 && d === 5 ? 'staging_database_pending' : first[1];
    run([{}, { buildReadiness: rows[b][0], databaseReadiness: rows[d][0] }], reason, first[2],
      ['CREATED', rows[b][0].toUpperCase(), rows[d][0].toUpperCase(), 'NOT_STARTED', 'NOT_ASSESSED']);
  }
});
test('T every envelope checks targets branches generations lifecycle and authentication', () => {
  for (let side = 0; side < 4; side++) {
    for (const [key, value, reason, step] of [
      ['projectToken', null, 'target_missing', 'MANUAL_FIXTURE_TARGET'],
      ['projectToken', 'fixture-project-002', 'project_mismatch', 'MANUAL_FIXTURE_TARGET'],
      ['sourceEnvironmentToken', null, 'target_missing', 'MANUAL_FIXTURE_TARGET'],
      ['sourceEnvironmentToken', 'fixture-staging-001', 'source_mismatch', 'MANUAL_FIXTURE_TARGET'],
      ['destinationEnvironmentToken', null, 'target_missing', 'MANUAL_FIXTURE_TARGET'],
      ['destinationEnvironmentToken', 'fixture-production-001', 'destination_mismatch', 'MANUAL_FIXTURE_TARGET'],
      ['sourceBranch', null, 'branch_missing', 'MANUAL_FIXTURE_TARGET'],
      ['sourceBranch', 'develop', 'branch_mismatch', 'MANUAL_FIXTURE_TARGET'],
      ['stagingBranch', null, 'branch_missing', 'MANUAL_FIXTURE_TARGET'],
      ['stagingBranch', 'main', 'branch_mismatch', 'MANUAL_FIXTURE_TARGET'],
      ['documentGeneration', null, 'document_generation_missing', 'FRESH_FIXTURE_CONTEXT'],
      ['documentGeneration', 3, 'document_generation_mismatch', 'FRESH_FIXTURE_CONTEXT'],
      ['contextGeneration', null, 'context_generation_missing', 'FRESH_FIXTURE_CONTEXT'],
      ['contextGeneration', 6, 'context_generation_mismatch', 'FRESH_FIXTURE_CONTEXT'],
      ['lifecycle', 'cancelled', 'operator_cancelled', 'STOP'],
      ['lifecycle', 'worker_lost', 'context_lost', 'FRESH_FIXTURE_CONTEXT'],
      ['lifecycle', 'session_lost', 'context_lost', 'FRESH_FIXTURE_CONTEXT'],
      ['lifecycle', 'interrupted', 'lifecycle_interrupted', 'FRESH_FIXTURE_CONTEXT'],
    ]) { const a = inputs(); a[side][key] = value; check(a.map(JSON.stringify), reason, step); }
    if (side) {
      for (const authentication of ['login', 'mfa', 'captcha', 'session_expired']) {
        const a = inputs(); a[side].authentication = authentication; check(a.map(JSON.stringify), 'authentication_required', 'MANUAL_AUTH');
      }
      for (const [sequence, reason] of [[7, 'duplicate_observation'], [6, 'delayed_observation'], [9, 'observation_gap']]) {
        const a = inputs(); a[side].sequence = sequence; check(a.map(JSON.stringify), reason, 'FRESH_FIXTURE_CONTEXT');
      }
    }
  }
});
test('T canonical strict schema and all field types bounds and versions', () => {
  for (let side = 0; side < 4; side++) {
    const base = inputs()[side], wire = JSON.stringify(base);
    for (const bad of ['', '{', 'null', '[]', 'true', '1', '"fixture-secret"', wire + '\n', ' ' + wire,
      wire.replace('"version":1', '"version":1,"version":1'), wire.replace('"version":1', '"version":1.0'),
      wire.replace('"version":1', '"version":1e0'), wire.replace('fixture-project', '\\u0066ixture-project'),
      wire.replace('fixture-project', 'é'), JSON.stringify(Object.fromEntries(Object.entries(base).reverse())), 'x'.repeat(1024)]) {
      const a = inputs().map(JSON.stringify); a[side] = bad; check(a, 'invalid_input', 'CORRECT_FIXTURE');
    }
    for (const key of Object.keys(base)) {
      for (const bad of [{}, [], true, false, 'fixture-secret', typeof base[key] === 'number' ? '1' : 42]) {
        const a = inputs(); a[side][key] = bad; check(a.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
      }
      const a = inputs(); delete a[side][key]; check(a.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
    }
    for (const key of ['version', 'sequence', 'documentGeneration', 'contextGeneration']) {
      const max = key === 'version' ? 999 : key === 'sequence' && side === 0 ? 999999 : 1000000;
      for (const bad of [-1, 0.5, max + 1, ...(key === 'sequence' && side === 0 ? [] : [0])]) {
        const a = inputs(); a[side][key] = bad; check(a.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
      }
    }
    for (const key of ['extra', '__proto__', 'constructor', 'copyVerified', 'neutralizationVerified', ...flags]) {
      const a = inputs(); Object.defineProperty(a[side], key, { value: true, enumerable: true });
      check(a.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
    }
    for (const version of [2, 999]) {
      const a = inputs(); a[side].version = version; check(a.map(JSON.stringify), 'unsupported_version', 'REVIEW_VERSION');
      a[(side + 1) % 4].extra = true; check(a.map(JSON.stringify), 'invalid_input', 'CORRECT_FIXTURE');
    }
    for (const length of [1025, 100000]) {
      const a = inputs().map(JSON.stringify); a[side] = 'x'.repeat(length); check(a, 'input_too_large', 'CORRECT_FIXTURE');
      a[(side + 1) % 4] = {}; check(a, 'invalid_input', 'CORRECT_FIXTURE');
    }
  }
  const zero = inputs({ sequence: 0 }, { sequence: 1 }, { sequence: 1 }, { sequence: 1 }).map(JSON.stringify);
  check(zero, 'copy_not_started', 'MANUAL_COPY_REVIEW', initial);
  zero[0] = zero[0].replace('"sequence":0', '"sequence":-0'); check(zero, 'invalid_input', 'CORRECT_FIXTURE');
  for (const generation of [1, 1000000]) {
    const a = inputs().map((v, i) => ({ ...v, documentGeneration: generation, contextGeneration: generation, sequence: i ? 1000000 : 999999 }));
    check(a.map(JSON.stringify), 'copy_not_started', 'MANUAL_COPY_REVIEW', initial);
  }
});
test('T hostile arguments reject without invoking accessors or proxies', () => {
  let touched = 0;
  const trap = () => { touched++; throw Error('fixture-secret'); };
  const proxy = new Proxy({}, { get: trap, ownKeys: trap, getPrototypeOf: trap });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const bad of [proxy, revoked.proxy, { get version() { return trap(); } },
    { toString: trap, toJSON: trap, [Symbol.toPrimitive]: trap }, null, undefined, true, 1, 1n, Symbol(), [], new String('{}'), trap]) {
    for (let side = 0; side < 4; side++) { const a = inputs().map(JSON.stringify); a[side] = bad; check(a, 'invalid_input', 'CORRECT_FIXTURE'); }
  }
  assert.equal(touched, 0);
});
test('T rejection precedes semantic diagnostics and never implies reconciliation', () => {
  const a = inputs({ lifecycle: 'cancelled', version: 2 }, {}, { writeOutcome: 'uncertain' }).map(JSON.stringify);
  check(a, 'unsupported_version', 'REVIEW_VERSION'); a[1] = '{}'; check(a, 'invalid_input', 'CORRECT_FIXTURE');
});
test('T inert HTML contains no executed copy or neutralization', () => {
  const html = readFileSync(new URL('../fixtures/odoo-sh/staging.html', import.meta.url), 'utf8');
  for (const marker of ['data-project-id="fixture-project-001"', 'data-environment-id="fixture-staging-001"',
    'data-fixture="branch-reference" data-state="created"', 'Git branch: develop',
    'data-fixture="environment-state" data-state="awaiting-copy"', 'data-fixture="build-readiness" data-state="pending"',
    'data-fixture="database-readiness" data-state="pending"', 'data-fixture="database-copy-checkpoint" data-state="not-copied"',
    'No neutralized Production database copy has occurred.', '<button type="button" disabled>']) assert.ok(html.includes(marker));
  assert.doesNotMatch(html, /<script\b/);
});
test('T frozen output and repeated input expose stateless replay limitations', () => {
  const first = run([], 'copy_not_started', 'MANUAL_COPY_REVIEW');
  run([{ lifecycle: 'cancelled' }], 'operator_cancelled', 'STOP', unresolved);
  run([{}, {}, { writeOutcome: 'uncertain' }], 'possible_write_unresolved', 'MANUAL_RECONCILIATION', unresolved);
  assert.deepEqual(run([], 'copy_not_started', 'MANUAL_COPY_REVIEW'), first);
  for (const flag of flags) assert.throws(() => { first[flag] = true; }, TypeError);
  assert.throws(() => { first.copyVerified = true; }, TypeError);
});
test('staging isolation: no imports consumers or capabilities during initialization and evaluation', () => {
  const source = readFileSync(new URL('../src/odoo-sh/staging-neutralized-copy-fixture-flow.mjs', import.meta.url), 'utf8');
  const names = 'import require fetch XMLHttpRequest WebSocket chrome browser localStorage sessionStorage indexedDB process eval Function globalThis window document navigator Date performance setTimeout setInterval setImmediate queueMicrotask Worker Promise console'.split(' ');
  assert.doesNotMatch(source, new RegExp('\\b(?:' + names.join('|') + ')\\b'));
  assert.doesNotMatch(source, /Math\.random|node:|child_process|page-recognition|context-guards|dom-primitives|interruption-policy|project-setup-fixture-flow|repository-production-fixture-flow|utilities-modules-fixture-flow/);
  for (const f of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true }))
    if (f.isFile() && /\.(mjs|js|html|json)$/.test(f.name) && f.name !== 'staging-neutralized-copy-fixture-flow.mjs')
      assert.doesNotMatch(readFileSync(`${f.parentPath}/${f.name}`, 'utf8'), /staging-neutralized-copy-fixture-flow|assessFixtureStagingCopy/);
  let touched = 0; const context = {};
  for (const k of [...names, 'location', 'caches', 'clipboard']) Object.defineProperty(context, k, { get() { touched++; throw Error('capability'); } });
  const isolated = runInNewContext(source.replace('export function', 'function') + '\nassessFixtureStagingCopy;', context,
    { codeGeneration: { strings: false, wasm: false } });
  const base = inputs().map(JSON.stringify);
  assert.equal(isolated(...base)?.reason, 'copy_not_started');
  for (const [args, want] of exercised) assert.equal(JSON.stringify(isolated(...args)), want);
  assert.equal(touched, 0);
});
