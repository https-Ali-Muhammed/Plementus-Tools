import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as policy from '../src/interaction/interruption-policy.mjs';

const assess = policy.assessFixtureInterruption;
const encode = value => JSON.stringify(value);
const flags = ['browserObserved', 'permissionVerified', 'accountVerified', 'rightsVerified',
  'subscriptionVerified', 'approvalGranted', 'executionAuthorized', 'mutationAuthorized',
  'installationAuthorized', 'trustedContinuingContext', 'associationVerified',
  'productionDatabaseVerified', 'stagingCopyVerified', 'moduleInstalled', 'effectsApplied',
  'readAuthorized', 'writeAuthorized'];
const exercised = [];
function fixture(s = {}, e = {}) {
  return [{ version: 1, tabSlot: 1, originToken: 'toy-origin-a', documentGeneration: 4,
    contextGeneration: 5, workerGeneration: 2, projectSlot: 1, branchSlot: 2,
    sequence: 7, lifecycle: 'active', writeStatus: 'none', ...s },
  { version: 1, tabSlot: 1, originToken: 'toy-origin-a', documentGeneration: 4,
    contextGeneration: 5, workerGeneration: 2, projectSlot: 1, branchSlot: 2,
    sequence: 8, lifecycle: 'active', navigation: 'none', authentication: 'none',
    dialog: 'none', evidence: 'complete', writeStatus: 'none', ...e }];
}
function texts(args, reason = 'synthetic_stable', nextStep = 'REVIEW_FIXTURE', resultClass = 'SYNTHETIC_DIAGNOSTIC') {
  const result = assess(...args);
  const expected = { version: 1, resultClass, reason, evidenceTier: 'SIMULATED',
    provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true, nextStep,
    ...Object.fromEntries(flags.map(key => [key, false])) };
  assert.deepEqual(result, expected);
  assert.deepEqual(Reflect.ownKeys(result), Object.keys(expected));
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.ok(Object.isFrozen(result));
  for (const key of Object.keys(result)) {
    assert.ok(['string', 'number', 'boolean'].includes(typeof result[key]));
    assert.equal(Object.getOwnPropertyDescriptor(result, key).writable, false);
  }
  for (const key of ['allowed', 'resumeAuthorized', 'executed', 'approved', 'tabSlot',
    'originToken', 'event', 'payload', 'documentGeneration', 'target', 'error']) assert.equal(key in result, false);
  const serialized = encode(result);
  assert.ok(serialized.length <= 2048);
  assert.match(serialized, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(serialized, /toy-|https?:|@|fixture-secret|password|__proto__|constructor/);
  if (args.every(value => typeof value === 'string')) exercised.push([...args, serialized]);
  return result;
}
function check(s = {}, e = {}, ...expected) { return texts(fixture(s, e).map(encode), ...expected); }
function manual(s, e, reason, step = 'FRESH_SELECTION') { return check(s, e, reason, step, 'MANUAL_REVIEW'); }
function invalid(args) { return texts(args, 'invalid_input', 'CORRECT_FIXTURE', 'REJECTED'); }
function reject(s, e, reason = 'invalid_input', step = 'CORRECT_FIXTURE') { return check(s, e, reason, step, 'REJECTED'); }

test('I01 stable synthetic observation is diagnostic with no authority', () => {
  assert.deepEqual(Object.keys(policy), ['assessFixtureInterruption']);
  check();
  check({}, { navigation: 'same_document_observation' });
});
test('I02 reported same-document navigation invalidates even unchanged identities', () => {
  manual({}, { navigation: 'same_document_navigation' }, 'same_document_navigation');
});
test('I03 reload and document replacement require fresh selection', () => {
  for (const [navigation, reason] of [['reload', 'document_reload'], ['document_replaced', 'document_replaced']]) {
    manual({}, { navigation }, reason);
    manual({}, { navigation, documentGeneration: 6 }, reason);
  }
});
test('I04 unexpected navigation and explicit cross-origin movement fail closed', () => {
  manual({}, { navigation: 'unexpected' }, 'unexpected_navigation');
  manual({}, { navigation: 'cross_origin' }, 'cross_origin');
  manual({}, { originToken: 'toy-origin-b' }, 'cross_origin');
});
test('I05 tab closure and replacement never transfer identity', () => {
  for (const navigation of ['tab_closed', 'tab_replaced']) {
    manual({}, { navigation }, navigation);
    manual({}, { navigation, tabSlot: 3 }, navigation);
  }
});
test('I06 missing and mismatched selected tabs reject equal nulls', () => {
  manual({}, { tabSlot: 2 }, 'tab_mismatch');
  manual({ tabSlot: 3 }, {}, 'tab_mismatch');
  for (const [s, e] of [[{ tabSlot: null }, {}], [{}, { tabSlot: null }], [{ tabSlot: null }, { tabSlot: null }]])
    manual(s, e, 'selection_missing');
});
test('I07 missing origins do not equal valid continuity', () => {
  for (const [s, e] of [[{ originToken: null }, {}], [{}, { originToken: null }], [{ originToken: null }, { originToken: null }]])
    manual(s, e, 'origin_missing');
});
test('I08 unknown and conflicting navigation evidence cannot stabilize', () => {
  manual({}, { navigation: 'unknown' }, 'navigation_unknown');
  manual({}, { navigation: 'conflicting' }, 'navigation_conflict');
});
test('I09 older newer and missing document generations fail closed', () => {
  for (const documentGeneration of [1, 3, 5, 1000000])
    manual({}, { documentGeneration }, 'document_generation_mismatch');
  for (const [s, e] of [[{ documentGeneration: null }, {}], [{}, { documentGeneration: null }],
    [{ documentGeneration: null }, { documentGeneration: null }]]) manual(s, e, 'document_generation_missing');
});
test('I10 older newer and missing context generations fail closed', () => {
  for (const contextGeneration of [1, 4, 6, 1000000]) manual({}, { contextGeneration }, 'context_generation_mismatch');
  for (const [s, e] of [[{ contextGeneration: null }, {}], [{}, { contextGeneration: null }],
    [{ contextGeneration: null }, { contextGeneration: null }]]) manual(s, e, 'context_generation_missing');
});
test('I11 suspension restart resumption and browser restart do not inherit stable tab authority', () => {
  for (const lifecycle of ['worker_suspended', 'worker_restarted', 'worker_resumed', 'browser_restarted'])
    for (const [s, e] of [[{ lifecycle }, {}], [{}, { lifecycle }]]) manual(s, e, lifecycle);
});
test('I12 worker generation mismatch or absence blocks even active lifecycle', () => {
  for (const workerGeneration of [1, 3, 1000000, null]) manual({}, { workerGeneration }, 'worker_context_mismatch');
  manual({ workerGeneration: null }, { workerGeneration: null }, 'worker_context_mismatch');
});
test('I13 review or session context loss requires fresh selection', () => {
  for (const lifecycle of ['context_lost', 'session_lost'])
    for (const [s, e] of [[{ lifecycle }, {}], [{}, { lifecycle }]]) manual(s, e, lifecycle);
});
test('I14 cancellation in either supplied envelope stops', () => {
  for (const [s, e] of [[{ lifecycle: 'cancelled' }, {}], [{}, { lifecycle: 'cancelled' }]])
    check(s, e, 'operator_cancelled', 'STOP', 'CANCELLED');
});
test('I15 login session expiry MFA CAPTCHA and contradictory auth are always human-handled', () => {
  for (const [authentication, reason] of [['login_required', 'login_required'], ['session_expired', 'session_expired'],
    ['mfa', 'mfa_required'], ['captcha', 'captcha_required'], ['conflicting', 'authentication_conflict']])
    manual({}, { authentication }, reason, 'MANUAL_AUTH');
});
test('I16 unexpected unsupported and contradictory dialogs are always human-handled', () => {
  for (const [dialog, reason] of [['unexpected', 'unexpected_dialog'], ['unsupported', 'unsupported_dialog'], ['conflicting', 'dialog_conflict']])
    manual({}, { dialog }, reason, 'MANUAL_DIALOG');
});
test('I17 missing ambiguous unknown and contradictory page evidence is manual', () => {
  for (const [evidence, reason] of [['missing', 'evidence_missing'], ['ambiguous', 'evidence_ambiguous'],
    ['unknown_page', 'page_unknown'], ['unknown_interruption', 'interruption_unknown'], ['conflicting', 'interruption_conflict']])
    manual({}, { evidence }, reason, 'MANUAL_PAGE');
});
test('I18 duplicate delayed and skipped observations cannot continue', () => {
  manual({}, { sequence: 7 }, 'duplicate_observation');
  for (const sequence of [1, 6]) manual({}, { sequence }, 'delayed_observation');
  for (const sequence of [9, 1000000]) manual({}, { sequence }, 'observation_gap');
});
test('I19 changed or missing project and branch require manual target review', () => {
  for (const key of ['projectSlot', 'branchSlot']) {
    manual({}, { [key]: 3 }, 'target_mismatch', 'MANUAL_TARGET');
    for (const [s, e] of [[{ [key]: null }, {}], [{}, { [key]: null }], [{ [key]: null }, { [key]: null }]])
      manual(s, e, 'target_missing', 'MANUAL_TARGET');
  }
});
test('I20 possible unresolved write requests only manual reconciliation', () => {
  for (const [s, e] of [[{ writeStatus: 'possible_unresolved' }, {}], [{}, { writeStatus: 'possible_unresolved' }]])
    manual(s, e, 'possible_write_unresolved', 'MANUAL_RECONCILIATION');
});
test('I21 future versions in either envelope never downgrade', () => {
  for (const version of [2, 999]) for (const [s, e] of [[{ version }, {}], [{}, { version }], [{ version }, { version }]])
    reject(s, e, 'unsupported_version', 'REVIEW_VERSION');
});
test('I22 nonprimitive arguments reject without invoking throwing hooks or proxies', () => {
  let accesses = 0;
  const hostile = new Proxy({}, { get() { accesses++; throw Error('fixture-secret'); },
    ownKeys() { accesses++; throw Error('fixture-secret'); }, getPrototypeOf() { accesses++; throw Error('fixture-secret'); } });
  const object = { get toJSON() { accesses++; throw Error('fixture-secret'); },
    get toString() { accesses++; throw Error('fixture-secret'); } };
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const value of [undefined, null, 1, true, Symbol('fixture-secret'), 1n, [], object, hostile, revoked.proxy,
    new String('{}'), () => { throw Error('fixture-secret'); }]) for (let side = 0; side < 2; side++) {
    const args = fixture().map(encode); args[side] = value; invalid(args);
  }
  assert.equal(accesses, 0);
});
test('I23 transport limits precede parse and reject each oversized side', () => {
  for (let side = 0; side < 2; side++) for (const length of [1025, 20000]) {
    const args = fixture().map(encode); args[side] = 'x'.repeat(length);
    texts(args, 'input_too_large', 'CORRECT_FIXTURE', 'REJECTED');
  }
});
test('I24 malformed and nonrecord JSON including exact transport bound reject', () => {
  for (const value of ['', ' ', '{', 'null', 'true', '1', '"fixture-secret"', '[]', '[{}]', 'x'.repeat(1024)])
    for (let side = 0; side < 2; side++) { const args = fixture().map(encode); args[side] = value; invalid(args); }
});
test('I25 canonical ordering whitespace duplicate keys escapes and number spelling are enforced', () => {
  for (let side = 0; side < 2; side++) {
    const args = fixture().map(encode); const wire = args[side]; const obj = JSON.parse(wire);
    for (const value of [' ' + wire, wire + '\n', JSON.stringify(obj, null, 2),
      encode(Object.fromEntries(Object.entries(obj).reverse())), wire.replace('"version":1', '"version":1,"version":1'),
      wire.replace('"version":1', '"version":1.0'), wire.replace('"version":1', '"version":1e0'),
      wire.replace('toy-origin-a', '\\u0074oy-origin-a')]) { const bad = [...args]; bad[side] = value; invalid(bad); }
  }
});
test('I26 closed shapes reject missing extra nested and prototype pollution fields', () => {
  for (let side = 0; side < 2; side++) {
    const items = fixture();
    for (const key of Object.keys(items[side])) {
      const copy = { ...items[side] }; delete copy[key]; const args = items.map(encode); args[side] = encode(copy); invalid(args);
    }
    for (const suffix of ['"__proto__":{"polluted":true}', '"constructor":{"prototype":{"polluted":true}}',
      '"extra":false', '"payload":{"password":"fixture-secret"}']) {
      const args = items.map(encode); args[side] = args[side].slice(0, -1) + ',' + suffix + '}'; invalid(args);
    }
    for (const value of [{}, [], { __proto__: null }]) { const args = items.map(encode); args[side] = encode({ ...items[side], lifecycle: value }); invalid(args); }
  }
  assert.equal({}.polluted, undefined);
});
test('I27 integer boundaries types and null requirements are closed', () => {
  for (const key of ['version', 'tabSlot', 'projectSlot', 'branchSlot', 'documentGeneration', 'contextGeneration', 'workerGeneration', 'sequence']) {
    const maximum = key === 'version' ? 999 : key.endsWith('Slot') ? 3 : 1000000;
    for (const value of [-1, 0.5, maximum + 1, '1', true, {}, [], ...(key === 'version' || key === 'sequence' ? [null] : [])])
      for (const [s, e] of [[{ [key]: value }, {}], [{}, { [key]: value }]]) reject(s, e);
    if (key !== 'sequence') { reject({ [key]: 0 }, {}); reject({}, { [key]: 0 }); }
  }
  reject({}, { sequence: 0 });
});
test('I28 all enum fields reject unknown hostile non-ASCII control and credential text', () => {
  for (const key of ['originToken', 'lifecycle', 'writeStatus']) for (const value of ['unknown', 'https://fixture.invalid/?password=fixture-secret',
    'fixture-secret@example.invalid', '__proto__', 'é', '\u0000', true, null, {}, []]) {
    if (key === 'originToken' && value === null) continue;
    reject({ [key]: value }, {}); reject({}, { [key]: value });
  }
  for (const key of ['navigation', 'authentication', 'dialog', 'evidence'])
    for (const value of ['not_supported', null, 1, {}, [], 'fixture-secret', 'é', '\n']) reject({}, { [key]: value });
});
test('I29 valid lower and upper fixture bounds remain diagnostic', () => {
  const low = { tabSlot: 1, documentGeneration: 1, contextGeneration: 1, workerGeneration: 1, projectSlot: 1, branchSlot: 1 };
  check({ ...low, sequence: 0 }, { ...low, sequence: 1 });
  const high = { tabSlot: 3, originToken: 'toy-origin-b', documentGeneration: 1000000,
    contextGeneration: 1000000, workerGeneration: 1000000, projectSlot: 3, branchSlot: 3 };
  check({ ...high, sequence: 999999 }, { ...high, sequence: 1000000 });
});
test('I37 nested enum objects cannot trigger property-key coercion or escape rejection', () => {
  for (const key of ['authentication', 'dialog', 'evidence'])
    for (const value of [{ toString: null, valueOf: null }, { toString: {} },
      { toString: 'fixture-secret', valueOf: 'fixture-secret' }])
      assert.doesNotThrow(() => reject({}, { [key]: value }));
});
test('I30 type limit shape and version precedence apply across both envelopes', () => {
  texts(['x'.repeat(1025), {}], 'invalid_input', 'CORRECT_FIXTURE', 'REJECTED');
  texts(['{', 'x'.repeat(1025)], 'input_too_large', 'CORRECT_FIXTURE', 'REJECTED');
  const args = fixture({ version: 2 }).map(encode); args[1] = '{'; invalid(args);
  reject({ version: 2 }, { lifecycle: 'cancelled' }, 'unsupported_version', 'REVIEW_VERSION');
  reject({ lifecycle: 'cancelled' }, { version: 2 }, 'unsupported_version', 'REVIEW_VERSION');
});
test('I31 cancellation possible write and context-loss precedence is fixed', () => {
  check({ writeStatus: 'possible_unresolved', lifecycle: 'browser_restarted' }, { lifecycle: 'cancelled' }, 'operator_cancelled', 'STOP', 'CANCELLED');
  manual({ lifecycle: 'context_lost' }, { writeStatus: 'possible_unresolved', authentication: 'mfa' }, 'possible_write_unresolved', 'MANUAL_RECONCILIATION');
  manual({ lifecycle: 'browser_restarted' }, { lifecycle: 'context_lost', authentication: 'mfa' }, 'context_lost');
  manual({ lifecycle: 'worker_suspended' }, { lifecycle: 'session_lost' }, 'session_lost');
  manual({ workerGeneration: null }, { authentication: 'mfa', dialog: 'unexpected' }, 'worker_context_mismatch');
});
test('I32 auth dialogs and navigation precedence is fixed', () => {
  manual({}, { authentication: 'captcha', dialog: 'unexpected', navigation: 'tab_closed' }, 'captcha_required', 'MANUAL_AUTH');
  manual({}, { dialog: 'unsupported', navigation: 'cross_origin', documentGeneration: null }, 'unsupported_dialog', 'MANUAL_DIALOG');
  manual({ tabSlot: null }, { navigation: 'tab_replaced' }, 'tab_replaced');
  manual({ tabSlot: null }, { originToken: null }, 'selection_missing');
  manual({}, { tabSlot: 2, navigation: 'cross_origin' }, 'tab_mismatch');
  manual({}, { originToken: 'toy-origin-b', navigation: 'reload' }, 'cross_origin');
});
test('I33 navigation generation sequence target and evidence precedence is fixed', () => {
  manual({}, { navigation: 'unexpected', documentGeneration: null }, 'unexpected_navigation');
  manual({}, { documentGeneration: 3, contextGeneration: null }, 'document_generation_mismatch');
  manual({}, { contextGeneration: 4, sequence: 7 }, 'context_generation_mismatch');
  manual({}, { sequence: 7, projectSlot: null }, 'duplicate_observation');
  manual({}, { projectSlot: 3, evidence: 'missing' }, 'target_mismatch', 'MANUAL_TARGET');
});
test('I34 repeated calls are fresh frozen deterministic and stateless replay remains possible', () => {
  const args = fixture().map(encode); const a = texts(args); const b = texts(args);
  assert.notEqual(a, b); assert.deepEqual(a, b);
  assert.throws(() => { a.writeAuthorized = true; }, TypeError);
  assert.throws(() => { a.extra = 'fixture-secret'; }, TypeError);
  assert.throws(() => { delete a.reason; }, TypeError);
  assert.throws(() => Object.setPrototypeOf(a, null), TypeError);
  check({}, { lifecycle: 'cancelled' }, 'operator_cancelled', 'STOP', 'CANCELLED');
  manual({}, { lifecycle: 'worker_restarted' }, 'worker_restarted');
  manual({}, { writeStatus: 'possible_unresolved' }, 'possible_write_unresolved', 'MANUAL_RECONCILIATION');
  assert.deepEqual(texts(args), a);
  assert.equal(encode(fixture()), encode(args.map(JSON.parse)));
});
test('I35 all result branches have fixed permanently false authority and sanitized immutable shape', () => {
  check();
  assert.ok(exercised.length > 200);
  const reasons = new Set();
  for (const [s, e, serialized] of exercised) {
    const result = assess(s, e); assert.equal(encode(result), serialized); reasons.add(result.reason);
    for (const flag of flags) assert.equal(result[flag], false);
    assert.equal(Object.isFrozen(result), true);
  }
  for (const reason of ['invalid_input', 'input_too_large', 'unsupported_version', 'operator_cancelled',
    'possible_write_unresolved', 'synthetic_stable', 'interruption_unknown']) assert.ok(reasons.has(reason));
});
test('I36 import-free source and all exercised scenarios have zero capability accesses', () => {
  const source = readFileSync(new URL('../src/interaction/interruption-policy.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:import|require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function|globalThis|window|document|navigator|Date|performance|setTimeout|setInterval|setImmediate|queueMicrotask|Worker|Promise|console)\b/);
  assert.doesNotMatch(source, /page-recognition|recognizeFixtureOdooShPage|dom-primitives|previewFixtureDomInteraction|fx:|Math\.random|node:|child_process/);
  const root = new URL('../src/', import.meta.url);
  for (const file of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!file.isFile() || !/\.(mjs|js|html|json)$/.test(file.name)) continue;
    const url = new URL(file.name, `file://${file.parentPath}/`);
    if (url.pathname.endsWith('/interaction/interruption-policy.mjs')) continue;
    assert.doesNotMatch(readFileSync(url, 'utf8'), /interruption-policy|assessFixtureInterruption/);
  }
  let accesses = 0; const sandbox = {};
  for (const key of ['fetch', 'XMLHttpRequest', 'WebSocket', 'chrome', 'browser', 'document', 'window', 'navigator',
    'location', 'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'clipboard', 'process', 'console',
    'Date', 'performance', 'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'Worker', 'eval', 'Function'])
    Object.defineProperty(sandbox, key, { get() { accesses++; throw Error('fixture-secret'); } });
  const isolated = runInNewContext(source.replace('export function', 'function') + '\nassessFixtureInterruption;',
    sandbox, { codeGeneration: { strings: false, wasm: false } });
  const args = fixture().map(encode);
  assert.equal(isolated(...args)?.reason, 'synthetic_stable');
  for (const [s, e, serialized] of exercised) assert.equal(encode(isolated(s, e)), serialized);
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (let side = 0; side < 2; side++) { const bad = [...args]; bad[side] = revoked.proxy;
    assert.equal(isolated(...bad)?.reason, 'invalid_input'); }
  assert.equal(accesses, 0);
});
