import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as flow from '../src/odoo-sh/project-setup-fixture-flow.mjs';

const assess = flow.assessFixtureProjectSetup;
const encode = JSON.stringify;
const flags = ['browserObserved', 'permissionVerified', 'accountVerified', 'rightsVerified',
  'subscriptionVerified', 'approvalGranted', 'executionAuthorized', 'mutationAuthorized',
  'installationAuthorized', 'trustedContinuingContext', 'associationVerified',
  'productionDatabaseVerified', 'stagingCopyVerified', 'moduleInstalled', 'effectsApplied',
  'readAuthorized', 'writeAuthorized'];
const exercised = [];
function pair(request = {}, observation = {}) {
  return [{ version: 1, subscriptionMode: 'customer', referencePlaceholder: 'present',
    projectToken: 'fixture-project-001', environmentToken: 'fixture-production-001',
    documentGeneration: 4, contextGeneration: 5, sequence: 7, lifecycle: 'active',
    review: 'pending', ...request },
  { version: 1, page: 'project-setup', selectedMode: 'customer', referencePlaceholder: 'present',
    projectToken: 'fixture-project-001', environmentToken: 'fixture-production-001',
    documentGeneration: 4, contextGeneration: 5, sequence: 8, lifecycle: 'active',
    authentication: 'none', evidence: 'complete', setupState: 'not_submitted', ...observation }];
}
function checkTexts(args, reason = 'creation_review_required', nextStep = 'MANUAL_PROJECT_REVIEW',
  resultClass = 'MANUAL_REVIEW', setupState = 'AWAITING_REVIEW') {
  const result = assess(...args);
  const expected = { version: 1, resultClass, setupState, reason, evidenceTier: 'SIMULATED',
    provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true, nextStep,
    ...Object.fromEntries(flags.map(key => [key, false])) };
  assert.deepEqual(result, expected);
  assert.deepEqual(Reflect.ownKeys(result), Object.keys(expected));
  assert.ok(Object.isFrozen(result));
  for (const value of Object.values(result)) assert.ok(['string', 'number', 'boolean'].includes(typeof value));
  assert.ok(encode(result).length <= 2048);
  assert.match(encode(result), /^[\x20-\x7e]+$/);
  assert.doesNotMatch(encode(result), /fixture-project|fixture-production|fixture-staging|fixture-secret|https?:|@|__proto__|constructor/);
  for (const name of ['created', 'success', 'projectCreated', 'safeWrite', 'retryAllowed', 'error', 'target', 'reference'])
    assert.equal(Object.hasOwn(result, name), false);
  if (args.every(arg => typeof arg === 'string')) exercised.push([...args, encode(result)]);
  return result;
}
function check(r = {}, o = {}, ...expected) { return checkTexts(pair(r, o).map(encode), ...expected); }
function manual(r, o, reason, step) { return check(r, o, reason, step, 'MANUAL_REVIEW', 'UNRESOLVED'); }
function invalid(args, reason = 'invalid_input', step = 'CORRECT_FIXTURE') {
  return checkTexts(args, reason, step, 'REJECTED', 'UNRESOLVED');
}

for (const mode of ['customer', 'partner-trial']) {
  test(`S01 ${mode} requires manual creation review without approval`, () => {
    assert.deepEqual(Object.keys(flow), ['assessFixtureProjectSetup']);
    check({ subscriptionMode: mode }, { selectedMode: mode });
  });
  test(`S02 ${mode} reviewed submission pending and failure are only simulated`, () => {
    for (const [setupState, reason, state, step] of [
      ['not_submitted', 'synthetic_review_recorded', 'REVIEWED', 'MANUAL_PROJECT_REVIEW'],
      ['submitted', 'synthetic_submitted', 'SUBMITTED', 'MANUAL_SETUP_OBSERVATION'],
      ['pending', 'synthetic_pending', 'PENDING', 'MANUAL_SETUP_OBSERVATION'],
      ['failed', 'synthetic_failed', 'FAILED', 'MANUAL_FAILURE_REVIEW']])
      check({ subscriptionMode: mode, review: 'reviewed' }, { selectedMode: mode, setupState },
        reason, step, 'SIMULATED_SETUP', state);
  });
  test(`S03 ${mode} requires presence-only reference in both envelopes`, () => {
    for (const [r, o] of [[{ referencePlaceholder: 'absent' }, {}], [{}, { referencePlaceholder: 'absent' }],
      [{ referencePlaceholder: 'absent' }, { referencePlaceholder: 'absent' }]])
      manual({ subscriptionMode: mode, ...r }, { selectedMode: mode, ...o },
        'reference_placeholder_missing', 'MANUAL_SUBSCRIPTION');
  });
}
test('S04 missing and conflicting mode selections remain manual', () => {
  for (const [r, o] of [[{ subscriptionMode: null }, {}], [{}, { selectedMode: null }],
    [{ subscriptionMode: null }, { selectedMode: null }]]) manual(r, o, 'mode_missing', 'MANUAL_SUBSCRIPTION');
  manual({ subscriptionMode: 'partner-trial' }, {}, 'mode_mismatch', 'MANUAL_SUBSCRIPTION');
  manual({}, { selectedMode: 'partner-trial' }, 'mode_mismatch', 'MANUAL_SUBSCRIPTION');
});
test('S05 missing project or environment never equals a valid target', () => {
  for (const key of ['projectToken', 'environmentToken']) for (const [r, o] of [
    [{ [key]: null }, {}], [{}, { [key]: null }], [{ [key]: null }, { [key]: null }]])
    manual(r, o, 'target_missing', 'MANUAL_FIXTURE_TARGET');
});
test('S06 conflicts and agreeing targets outside the inert fixture fail closed', () => {
  for (const [key, value] of [['projectToken', 'fixture-project-002'], ['environmentToken', 'fixture-staging-001']]) {
    manual({ [key]: value }, {}, 'target_mismatch', 'MANUAL_FIXTURE_TARGET');
    manual({}, { [key]: value }, 'target_mismatch', 'MANUAL_FIXTURE_TARGET');
    manual({ [key]: value }, { [key]: value }, 'fixture_target_mismatch', 'MANUAL_FIXTURE_TARGET');
  }
});
test('S07 setup semantics agree with the existing inert HTML without claiming observation', () => {
  const html = readFileSync(new URL('../fixtures/odoo-sh/project-setup.html', import.meta.url), 'utf8');
  for (const literal of ['data-fixture="odoo-sh-project-setup"', 'data-project-id="fixture-project-001"',
    'value="customer"', 'value="partner-trial"', 'Target environment: Production',
    'Simulate project creation (inert test control)']) assert.ok(html.includes(literal));
  assert.doesNotMatch(html, /<script\b|subscription-reference/i);
  assert.equal(check().browserObserved, false);
});
test('S08 wrong and unknown pages cannot imply setup', () => {
  manual({}, { page: 'production' }, 'wrong_fixture_page', 'MANUAL_FIXTURE_PAGE');
  manual({}, { page: 'unknown' }, 'page_unknown', 'MANUAL_FIXTURE_PAGE');
});
for (const key of ['documentGeneration', 'contextGeneration']) {
  const prefix = key === 'documentGeneration' ? 'document' : 'context';
  test(`S09 ${key} missing older newer and matching boundary generations`, () => {
    for (const [r, o] of [[{ [key]: null }, {}], [{}, { [key]: null }], [{ [key]: null }, { [key]: null }]])
      manual(r, o, `${prefix}_generation_missing`, 'FRESH_FIXTURE_CONTEXT');
    for (const value of [1, 3, 6, 1000000]) {
      manual({ [key]: value }, {}, `${prefix}_generation_mismatch`, 'FRESH_FIXTURE_CONTEXT');
      manual({}, { [key]: value }, `${prefix}_generation_mismatch`, 'FRESH_FIXTURE_CONTEXT');
      check({ [key]: value }, { [key]: value });
    }
  });
}
test('S10 duplicates delayed observations and gaps require fresh fixture context', () => {
  for (const [sequence, reason] of [[7, 'duplicate_observation'], [6, 'delayed_observation'], [9, 'observation_gap']])
    manual({}, { sequence }, reason, 'FRESH_FIXTURE_CONTEXT');
  check({ sequence: 0 }, { sequence: 1 });
  check({ sequence: 999999 }, { sequence: 1000000 });
});
test('S11 cancellation has diagnostic priority but cannot reconcile uncertainty', () => {
  for (const [r, o] of [[{ lifecycle: 'cancelled' }, {}], [{}, { lifecycle: 'cancelled' }]]) {
    check(r, o, 'operator_cancelled', 'STOP', 'CANCELLED', 'CANCELLED');
    check(r, { ...o, setupState: 'uncertain', authentication: 'mfa' },
      'operator_cancelled', 'STOP', 'CANCELLED', 'CANCELLED');
  }
});
test('S12 lifecycle interruption on either side never retains a setup result', () => {
  for (const [r, o] of [[{ lifecycle: 'interrupted' }, {}], [{}, { lifecycle: 'interrupted' }]])
    for (const setupState of ['not_submitted', 'submitted', 'pending', 'failed'])
      manual({ review: 'reviewed', ...r }, { ...o, setupState }, 'lifecycle_interrupted', 'FRESH_FIXTURE_CONTEXT');
});
test('S13 login MFA CAPTCHA and session expiration remain manual', () => {
  for (const authentication of ['login', 'mfa', 'captcha', 'session_expired'])
    manual({}, { authentication }, 'authentication_required', 'MANUAL_AUTH');
});
test('S14 explicit uncertainty outranks operational conflicts without safe retry', () => {
  for (const review of ['pending', 'reviewed', 'declined'])
    check({ review, lifecycle: 'interrupted' }, { setupState: 'uncertain', page: 'unknown', evidence: 'conflicting' },
      'setup_uncertain', 'MANUAL_RECONCILIATION', 'SIMULATED_SETUP', 'UNCERTAIN');
});
test('S15 missing unknown conflicting and ambiguous evidence cannot confirm submission', () => {
  for (const evidence of ['missing', 'unknown', 'conflicting', 'ambiguous'])
    for (const setupState of ['not_submitted', 'submitted', 'pending', 'failed'])
      manual({ review: 'reviewed' }, { evidence, setupState }, 'evidence_unresolved', 'MANUAL_FIXTURE_PAGE');
});
test('S16 unknown setup outcome requires reconciliation', () => {
  for (const review of ['pending', 'reviewed', 'declined'])
    manual({ review }, { setupState: 'unknown' }, 'setup_unknown', 'MANUAL_RECONCILIATION');
});
test('S17 unreviewed outcomes conflict and declined review stops', () => {
  check({ review: 'declined' }, {}, 'review_declined', 'STOP', 'MANUAL_REVIEW', 'DECLINED');
  for (const review of ['pending', 'declined']) for (const setupState of ['submitted', 'pending', 'failed'])
    manual({ review }, { setupState }, 'review_outcome_conflict', 'MANUAL_RECONCILIATION');
});
test('S18 unsupported valid versions reject only after both schemas validate', () => {
  for (let side = 0; side < 2; side++) for (const version of [2, 999]) {
    const args = pair(); args[side].version = version;
    invalid(args.map(encode), 'unsupported_version', 'REVIEW_VERSION');
    args[1 - side].extra = true;
    invalid(args.map(encode));
  }
});
test('S19 nonprimitive input rejects without invoking coercion accessors or proxies', () => {
  let accesses = 0;
  const trap = () => { accesses++; throw Error('fixture-secret'); };
  const hostile = new Proxy({}, { get: trap, ownKeys: trap, getPrototypeOf: trap });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const accessor = Object.defineProperty({}, 'version', { get: trap });
  for (const bad of [undefined, null, true, 1, 1n, Symbol('fixture-secret'), {}, [], () => {},
    new String('{}'), hostile, revoked.proxy, accessor, { toString: trap, toJSON: trap, [Symbol.toPrimitive]: trap }])
    for (let side = 0; side < 2; side++) { const args = pair().map(encode); args[side] = bad; invalid(args); }
  assert.equal(accesses, 0);
});
test('S20 size checks precede parsing but follow primitive checks', () => {
  for (let side = 0; side < 2; side++) for (const size of [1025, 4096, 100000]) {
    const args = pair().map(encode); args[side] = 'x'.repeat(size); invalid(args, 'input_too_large');
  }
  invalid(['x'.repeat(1024), '{}']);
  invalid([{}, 'x'.repeat(1025)]);
  invalid(['x'.repeat(1025), {}]);
});
test('S21 malformed whitespace duplicate keys escapes and alternate numbers are not canonical', () => {
  for (let side = 0; side < 2; side++) {
    const canonical = encode(pair()[side]);
    for (const bad of ['', '{', 'null', '[]', 'true', '1', '"fixture-secret"', canonical + '\n',
      ' ' + canonical, canonical.replace('"version":1', '"version":1,"version":1'),
      canonical.replace('"version":1', '"version":1.0'), canonical.replace('"version":1', '"version":1e0'),
      canonical.replace('fixture-project', '\\u0066ixture-project'), canonical.replace('customer', 'cüstomer'),
      canonical.replace('customer', 'cus\ttomer')]) {
      const args = pair().map(encode); args[side] = bad; invalid(args);
    }
  }
});
test('S22 closed ordered schemas reject omissions extras prototype names and nested fields', () => {
  for (let side = 0; side < 2; side++) {
    for (const key of Object.keys(pair()[side])) {
      const args = pair(); delete args[side][key]; invalid(args.map(encode));
    }
    for (const key of ['subscriptionReference', 'customerName', 'password', 'error', '__proto__', 'constructor', ...flags]) {
      const args = pair(); Object.defineProperty(args[side], key, { value: 'fixture-secret', enumerable: true });
      invalid(args.map(encode));
    }
    const args = pair(); args[side] = Object.fromEntries(Object.entries(args[side]).reverse()); invalid(args.map(encode));
  }
});
test('S23 every field rejects wrong types and out-of-catalog values', () => {
  for (let side = 0; side < 2; side++) for (const [key, value] of Object.entries(pair()[side])) {
    for (const bad of [[], {}, true, false, 'fixture-secret', typeof value === 'number' ? String(value) : 4]) {
      const args = pair(); args[side][key] = bad; invalid(args.map(encode));
    }
    if (!['subscriptionMode', 'selectedMode', 'projectToken', 'environmentToken', 'documentGeneration', 'contextGeneration'].includes(key)) {
      const args = pair(); args[side][key] = null; invalid(args.map(encode));
    }
  }
});
test('S24 numeric bounds are strict integers and reject negative zero notation', () => {
  for (let side = 0; side < 2; side++) for (const key of ['version', 'documentGeneration', 'contextGeneration', 'sequence']) {
    const max = key === 'version' ? 999 : key === 'sequence' && side === 0 ? 999999 : 1000000;
    for (const bad of [-1, 1.5, max + 1, Number.MAX_SAFE_INTEGER, ...(key === 'sequence' && side === 0 ? [] : [0])]) {
      const args = pair(); args[side][key] = bad; invalid(args.map(encode));
    }
  }
  const args = pair({ sequence: 0 }).map(encode); args[0] = args[0].replace('"sequence":0', '"sequence":-0'); invalid(args);
});
test('S25 actual reference values arbitrary errors success and authority claims never enter outputs', () => {
  for (const secret of ['fixture-secret', 'person@fixture.invalid', 'https://fixture.invalid', 'Bearer fixture-secret']) {
    invalid(pair({ referencePlaceholder: secret }).map(encode));
    invalid(pair({}, { setupState: secret }).map(encode));
  }
  for (const setupState of ['created', 'success', 'verified', 'project_created']) invalid(pair({}, { setupState }).map(encode));
});
test('S26 structural version cancellation and uncertainty precedence is deterministic', () => {
  invalid(pair({ version: 2, lifecycle: 'cancelled' }).map(encode), 'unsupported_version', 'REVIEW_VERSION');
  invalid(pair({ lifecycle: 'cancelled' }, { evidence: 'invalid' }).map(encode));
  check({ lifecycle: 'cancelled' }, { setupState: 'uncertain' }, 'operator_cancelled', 'STOP', 'CANCELLED', 'CANCELLED');
  check({}, { setupState: 'uncertain', authentication: 'login' }, 'setup_uncertain', 'MANUAL_RECONCILIATION', 'SIMULATED_SETUP', 'UNCERTAIN');
});
test('S27 competing operational failures obey the documented first-match order', () => {
  manual({ lifecycle: 'interrupted' }, { authentication: 'login' }, 'lifecycle_interrupted', 'FRESH_FIXTURE_CONTEXT');
  manual({}, { authentication: 'login', page: 'unknown' }, 'authentication_required', 'MANUAL_AUTH');
  manual({}, { page: 'unknown', documentGeneration: null }, 'page_unknown', 'MANUAL_FIXTURE_PAGE');
  manual({}, { documentGeneration: null, contextGeneration: null }, 'document_generation_missing', 'FRESH_FIXTURE_CONTEXT');
  manual({}, { documentGeneration: 3, contextGeneration: null }, 'document_generation_mismatch', 'FRESH_FIXTURE_CONTEXT');
  manual({}, { contextGeneration: null, sequence: 7 }, 'context_generation_missing', 'FRESH_FIXTURE_CONTEXT');
  manual({}, { contextGeneration: 3, sequence: 7 }, 'context_generation_mismatch', 'FRESH_FIXTURE_CONTEXT');
  manual({}, { sequence: 7, projectToken: null }, 'duplicate_observation', 'FRESH_FIXTURE_CONTEXT');
  manual({}, { projectToken: null, selectedMode: null }, 'target_missing', 'MANUAL_FIXTURE_TARGET');
  manual({}, { projectToken: 'fixture-project-002', selectedMode: null }, 'target_mismatch', 'MANUAL_FIXTURE_TARGET');
  manual({}, { selectedMode: null, referencePlaceholder: 'absent' }, 'mode_missing', 'MANUAL_SUBSCRIPTION');
  manual({}, { selectedMode: 'partner-trial', referencePlaceholder: 'absent' }, 'mode_mismatch', 'MANUAL_SUBSCRIPTION');
  manual({}, { referencePlaceholder: 'absent', evidence: 'missing' }, 'reference_placeholder_missing', 'MANUAL_SUBSCRIPTION');
  manual({}, { evidence: 'missing', setupState: 'unknown' }, 'evidence_unresolved', 'MANUAL_FIXTURE_PAGE');
});
test('S28 stateless replay remains possible after cancellation interruption and uncertainty', () => {
  const args = pair().map(encode); const first = checkTexts(args);
  check({}, { lifecycle: 'cancelled' }, 'operator_cancelled', 'STOP', 'CANCELLED', 'CANCELLED');
  manual({}, { lifecycle: 'interrupted' }, 'lifecycle_interrupted', 'FRESH_FIXTURE_CONTEXT');
  check({}, { setupState: 'uncertain' }, 'setup_uncertain', 'MANUAL_RECONCILIATION', 'SIMULATED_SETUP', 'UNCERTAIN');
  const replay = checkTexts(args); assert.deepEqual(first, replay); assert.notStrictEqual(first, replay);
  assert.deepEqual(args, pair().map(encode));
});
test('S29 output cannot be modified or promoted to authority', () => {
  const result = check();
  for (const flag of flags) assert.throws(() => { result[flag] = true; }, TypeError);
  assert.throws(() => { result.reason = 'created'; }, TypeError);
  assert.throws(() => { result.extra = 'fixture-secret'; }, TypeError);
  assert.throws(() => { delete result.fixtureOnly; }, TypeError);
  assert.throws(() => Object.setPrototypeOf(result, null), TypeError);
  check();
});
test('S30 all exercised branches replay sanitized immutable outputs with all 17 flags false', () => {
  assert.ok(exercised.length > 400);
  const reasons = new Set();
  for (const [r, o, expected] of exercised) {
    const result = assess(r, o); assert.equal(encode(result), expected); reasons.add(result.reason);
    assert.ok(Object.isFrozen(result)); for (const flag of flags) assert.equal(result[flag], false);
  }
  assert.equal(reasons.size, 31);
});
test('S31 isolated import initialization and every scenario access zero capabilities', () => {
  const source = readFileSync(new URL('../src/odoo-sh/project-setup-fixture-flow.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:import|require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function|globalThis|window|document|navigator|Date|performance|setTimeout|setInterval|setImmediate|queueMicrotask|Worker|Promise|console)\b/);
  assert.doesNotMatch(source, /page-recognition|recognizeFixtureOdooShPage|context-guards|assessFixtureInteractionContext|dom-primitives|previewFixtureDomInteraction|interruption-policy|assessFixtureInterruption|fx:|Math\.random|node:|child_process/);
  for (const entry of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true })) {
    if (!entry.isFile() || !/\.(mjs|js|html|json)$/.test(entry.name) || entry.name === 'project-setup-fixture-flow.mjs') continue;
    assert.doesNotMatch(readFileSync(`${entry.parentPath}/${entry.name}`, 'utf8'), /project-setup-fixture-flow|assessFixtureProjectSetup/);
  }
  let accesses = 0; const sandbox = {};
  for (const key of ['fetch', 'XMLHttpRequest', 'WebSocket', 'chrome', 'browser', 'window', 'document', 'navigator',
    'location', 'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'clipboard', 'process', 'console',
    'Date', 'performance', 'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'Worker', 'eval', 'Function'])
    Object.defineProperty(sandbox, key, { get() { accesses++; throw Error('fixture-secret'); } });
  const isolated = runInNewContext(source.replace('export function', 'function') + '\nassessFixtureProjectSetup;',
    sandbox, { codeGeneration: { strings: false, wasm: false } });
  for (const [r, o, expected] of exercised) assert.equal(encode(isolated(r, o)), expected);
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const args of [[revoked.proxy, '{}'], ['{}', revoked.proxy]]) assert.equal(isolated(...args)?.reason, 'invalid_input');
  assert.equal(accesses, 0);
});
