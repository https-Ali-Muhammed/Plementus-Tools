import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as primitives from '../src/interaction/dom-primitives.mjs';
import { assessFixtureInteractionContext } from '../src/interaction/context-guards.mjs';

const preview = primitives.previewFixtureDomInteraction;
const flags = ['browserObserved', 'permissionVerified', 'accountVerified', 'rightsVerified',
  'subscriptionVerified', 'approvalGranted', 'executionAuthorized', 'mutationAuthorized',
  'installationAuthorized', 'trustedContinuingContext', 'associationVerified',
  'productionDatabaseVerified', 'stagingCopyVerified', 'moduleInstalled', 'effectsApplied',
  'readAuthorized', 'writeAuthorized'];
const falseFlags = Object.fromEntries(flags.map(key => [key, false]));
const exercised = [];
function element(patch = {}) {
  return { token: 'toy:button-a', kind: 'button', visible: true, enabled: true,
    documentGeneration: 1, contextGeneration: 1, projectSlot: 1, branchSlot: 1, ...patch };
}
function fixture(c = {}, s = {}, i = {}) {
  return [{ version: 1, resultClass: 'SYNTHETIC_CONTEXT_MATCH', reason: 'synthetic_context_match',
    recognizerReason: 'fixture_page_match', evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED',
    fixtureOnly: true, nextStep: 'REVIEW_FIXTURE', ...falseFlags, ...c },
  { version: 1, documentGeneration: 1, contextGeneration: 1, projectSlot: 1, branchSlot: 1,
    interruption: 'none', elements: [element()], ...s },
  { version: 1, operation: 'click_preview', token: 'toy:button-a', expectedKind: 'button',
    documentGeneration: 1, contextGeneration: 1, projectSlot: 1, branchSlot: 1, value: null, ...i }];
}
const encode = value => JSON.stringify(value);
function checkTexts(args, reason = 'click_preview', nextStep = 'REVIEW_FIXTURE', resultClass = 'PREVIEW_READY') {
  const result = preview(...args);
  const expected = { version: 1, resultClass, reason, evidenceTier: 'SIMULATED',
    provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true, previewOnly: true, nextStep, ...falseFlags };
  assert.deepEqual(result, expected);
  assert.deepEqual(Reflect.ownKeys(result), Object.keys(expected));
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.ok(Object.isFrozen(result));
  for (const key of Object.keys(expected)) {
    assert.ok(['string', 'number', 'boolean'].includes(typeof result[key]));
    assert.equal(Object.getOwnPropertyDescriptor(result, key).writable, false);
  }
  for (const key of ['allowed', 'executed', 'token', 'value', 'target']) assert.equal(key in result, false);
  const text = encode(result);
  assert.ok(text.length <= 2048);
  assert.match(text, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(text, /toy:|toy-value|fixture-secret|customer|password|https?:|@|__proto__/);
  if (args.every(value => typeof value === 'string')) exercised.push([...args, text]);
  return result;
}
function check(c = {}, s = {}, i = {}, ...expected) { return checkTexts(fixture(c, s, i).map(encode), ...expected); }
function manual(s, i, reason, step = 'MANUAL_SELECTOR') { return check({}, s, i, reason, step, 'MANUAL_REVIEW'); }
function invalid(args) { return checkTexts(args, 'invalid_input', 'CORRECT_FIXTURE', 'REJECTED'); }
function withElement(patch) { return { elements: [element(patch)] }; }

test('D01 synthetic click preview has no execution or verification authority', () => {
  assert.deepEqual(Object.keys(primitives), ['previewFixtureDomInteraction']);
  check();
});
test('D02 inspection supports every catalog kind without reading page content', () => {
  for (const [token, kind] of [['toy:button-a', 'button'], ['toy:input-a', 'input'], ['toy:label-a', 'label']])
    check({}, withElement({ token, kind }), { operation: 'inspect', token, expectedKind: kind }, 'inspection_preview');
});
test('D03 fill previews accept only two invented values and never imply a write', () => {
  for (const value of ['toy-value-a', 'toy-value-b'])
    check({}, withElement({ token: 'toy:input-a', kind: 'input' }),
      { operation: 'fill_preview', token: 'toy:input-a', expectedKind: 'input', value }, 'fill_preview');
});
test('D04 zero matches require manual selector fallback', () => {
  manual({ elements: [] }, {}, 'element_missing');
  manual(withElement({ token: 'toy:input-a', kind: 'input' }), {}, 'element_missing');
});
test('D05 duplicate matches never select first, including conflicting kinds and states', () => {
  for (const patch of [{}, { kind: 'input' }, { visible: false }, { enabled: false }, { documentGeneration: 2 }]) {
    const elements = [element(), element(patch)];
    manual({ elements }, {}, 'element_ambiguous');
    manual({ elements: elements.reverse() }, {}, 'element_ambiguous');
  }
});
test('D06 hidden elements require manual fallback for every supported intent', () => {
  manual(withElement({ visible: false }), {}, 'element_hidden');
  manual(withElement({ visible: false }), { operation: 'inspect' }, 'element_hidden');
  manual(withElement({ token: 'toy:input-a', kind: 'input', visible: false }),
    { operation: 'fill_preview', token: 'toy:input-a', expectedKind: 'input', value: 'toy-value-a' }, 'element_hidden');
});
test('D07 disabled elements require manual fallback including inspection', () => {
  manual(withElement({ enabled: false }), {}, 'element_disabled');
  manual(withElement({ enabled: false }), { operation: 'inspect' }, 'element_disabled');
});
test('D08 expected and catalog kind disagreements block', () => {
  for (const expectedKind of ['input', 'label'])
    check({}, {}, { expectedKind }, 'kind_mismatch', 'CORRECT_FIXTURE', 'BLOCKED');
  check({}, withElement({ kind: 'input' }), { operation: 'inspect', expectedKind: 'input' },
    'kind_mismatch', 'CORRECT_FIXTURE', 'BLOCKED');
});
test('D09 click and fill previews cannot target incompatible kinds', () => {
  for (const [token, kind] of [['toy:input-a', 'input'], ['toy:label-a', 'label']])
    check({}, withElement({ token, kind }), { token, expectedKind: kind }, 'kind_mismatch', 'CORRECT_FIXTURE', 'BLOCKED');
  for (const [token, kind] of [['toy:button-a', 'button'], ['toy:label-a', 'label']])
    check({}, withElement({ token, kind }), { operation: 'fill_preview', token, expectedKind: kind, value: 'toy-value-a' },
      'kind_mismatch', 'CORRECT_FIXTURE', 'BLOCKED');
});
test('D10 stale snapshot or intent generations require fresh selection', () => {
  for (const key of ['documentGeneration', 'contextGeneration']) {
    manual({ [key]: 2 }, {}, 'stale_generation', 'FRESH_SELECTION');
    manual({}, { [key]: 2 }, 'stale_generation', 'FRESH_SELECTION');
  }
});
test('D11 stale matched element generations require fresh selection', () => {
  for (const key of ['documentGeneration', 'contextGeneration'])
    manual(withElement({ [key]: 2 }), {}, 'stale_generation', 'FRESH_SELECTION');
});
test('D12 snapshot intent and matched element targets must agree', () => {
  for (const key of ['projectSlot', 'branchSlot']) {
    manual({ [key]: 2 }, {}, 'target_mismatch', 'MANUAL_TARGET');
    manual({}, { [key]: 2 }, 'target_mismatch', 'MANUAL_TARGET');
    manual(withElement({ [key]: 2 }), {}, 'target_mismatch', 'MANUAL_TARGET');
  }
});
test('D13 upper generation and slot boundaries can describe matching synthetic inputs', () => {
  const patch = { documentGeneration: 1000000, contextGeneration: 1000000, projectSlot: 3, branchSlot: 3 };
  check({}, { ...patch, elements: [element(patch)] }, patch);
});
test('D14 unknown bounded tokens require manual fallback anywhere in the inventory', () => {
  for (const token of ['toy:unknown', 'toy:a', 'toy:abcdefghijklmnop']) {
    manual({}, { token }, 'unknown_element');
    manual({ elements: [element(), element({ token })] }, {}, 'unknown_element');
  }
});
test('D15 arbitrary selectors scripts URLs and hostile strings reject without echo', () => {
  for (const value of ['#button', '//button', '[onclick]', '<script>', 'javascript:alert(1)',
    'https://customer.invalid', 'customer@example.invalid', 'fixture-secret', '__proto__',
    'toy:button-a, toy:input-a', 'toy:', 'toy:' + 'a'.repeat(17), 'toy:Button-a', 'toy:é', 'toy:a\n']) {
    for (const side of [1, 2]) {
      const args = fixture(); if (side === 1) args[1].elements[0].token = value; else args[2].token = value;
      invalid(args.map(encode));
    }
  }
});
test('D16 unknown operations reject rather than acting or falling back to click', () => {
  for (const operation of ['click', 'fill', 'submit', 'navigate', 'dismiss', 'a'.repeat(24)])
    check({}, {}, { operation }, 'unsupported_operation', 'CORRECT_FIXTURE', 'REJECTED');
  for (const operation of ['', 'a'.repeat(25), 'click()', '<script>', {}, true, null])
    invalid(fixture({}, {}, { operation }).map(encode));
});
test('D17 operation value pairing is closed and fill never accepts free-form input', () => {
  for (const operation of ['inspect', 'click_preview']) for (const value of ['toy-value-a', 'toy-value-b'])
    check({}, {}, { operation, value }, 'invalid_intent', 'CORRECT_FIXTURE', 'REJECTED');
  check({}, {}, { operation: 'fill_preview' }, 'invalid_intent', 'CORRECT_FIXTURE', 'REJECTED');
  for (const value of ['', 'fixture-secret', 'password=secret', '<script>', 1, true, {}, []])
    invalid(fixture({}, {}, { value }).map(encode));
});
test('D18 cancelled failed uncertain and nonmatching contexts cannot produce a preview', () => {
  check({ resultClass: 'CANCELLED', reason: 'operator_cancelled', nextStep: 'STOP' }, {}, {},
    'context_not_matching', 'STOP', 'MANUAL_REVIEW');
  for (const resultClass of ['FAILED', 'UNCERTAIN', 'FIXTURE_MATCH']) invalid(fixture({ resultClass }).map(encode));
  for (const reason of ['context_lost', 'context_restarted', 'binding_generation_stale', 'account_context_drift',
    'operation_rights_denied', 'page_unknown', 'target_conflict'])
    check({ resultClass: 'MANUAL_REVIEW', reason, nextStep: 'FRESH_SELECTION' }, {}, {},
      'context_not_matching', 'FRESH_SELECTION', 'MANUAL_REVIEW');
  check({ resultClass: 'REJECTED', reason: 'invalid_input', nextStep: 'CORRECT_FIXTURE' }, {}, {},
    'context_not_matching', 'FRESH_SELECTION', 'MANUAL_REVIEW');
});
test('D19 contradictory guard class reason recognizer or next step never succeeds', () => {
  for (const patch of [{ resultClass: 'MANUAL_REVIEW' }, { reason: 'page_unknown' },
    { recognizerReason: 'NOT_ASSESSED' }, { nextStep: 'FRESH_SELECTION' }])
    check(patch, {}, {}, 'context_not_matching', 'FRESH_SELECTION', 'MANUAL_REVIEW');
  for (const key of flags) invalid(fixture({ [key]: true }).map(encode));
});
test('D20 login MFA CAPTCHA and unexpected dialogs require human handling', () => {
  for (const interruption of ['login', 'mfa', 'captcha', 'unexpected_dialog'])
    manual({ interruption }, {}, 'manual_interruption', interruption === 'unexpected_dialog' ? 'MANUAL_DIALOG' : 'MANUAL_AUTH');
  for (const reason of ['login_required', 'mfa_required', 'captcha_required']) {
    check({ resultClass: 'MANUAL_REVIEW', reason, nextStep: 'MANUAL_AUTH' }, {}, {},
      'context_not_matching', 'MANUAL_AUTH', 'MANUAL_REVIEW');
    check({ recognizerReason: reason }, {}, {}, 'context_not_matching', 'MANUAL_AUTH', 'MANUAL_REVIEW');
  }
});
test('D21 genuine accepted guard serialization is consumed only as inert evidence', () => {
  const origin = 'https://odoo-sh.fixture.invalid';
  const binding = { version: 1, selectedRole: 'odoo-sh', tabSlot: 1, expectedOrigin: origin,
    documentGeneration: 1, contextGeneration: 1, accountContext: 'operator_reported', accountContinuity: 'current',
    projectSlot: 1, branchSlot: 1, permissionEvidence: 'fixture_available', rightsEvidence: 'fixture_available', lifecycle: 'current' };
  const configuration = { version: 1, fixtureVersion: 1, expectedOrigin: origin,
    selections: [{ role: 'odoo-sh', tabSlot: 1 }], documentGeneration: 1, contextGeneration: 1,
    projectSlot: 1, branchSlot: 1, access: 'fixture_available', lifecycle: 'current' };
  const observation = { version: 1, fixtureVersion: 1, origin, tabSlot: 1, documentGeneration: 1,
    contextGeneration: 1, projectSlot: 1, branchSlot: 1, markers: ['fx:project-detail'] };
  const args = fixture().map(encode);
  args[0] = encode(assessFixtureInteractionContext(...[binding, configuration, observation].map(encode)));
  checkTexts(args);
  args[0] = encode(assessFixtureInteractionContext(...[{ ...binding, lifecycle: 'cancelled' }, configuration, observation].map(encode)));
  checkTexts(args, 'context_not_matching', 'STOP', 'MANUAL_REVIEW');
});
test('D22 nonprimitive arguments do not access proxies getters or coercion hooks', () => {
  let touched = 0; const trap = () => { touched++; throw new Error('fixture-secret'); };
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const value of [undefined, null, true, 1, 1n, Symbol('fixture-secret'), () => {}, new String('{}'), [],
    { toString: trap, toJSON: trap, get then() { return trap(); } }, new Proxy({}, { get: trap, ownKeys: trap }), revoked.proxy])
    for (let side = 0; side < 3; side++) { const args = fixture().map(encode); args[side] = value; invalid(args); }
  assert.equal(touched, 0);
});
test('D23 malformed and noncanonical JSON rejects on all three transports', () => {
  for (let side = 0; side < 3; side++) {
    const args = fixture().map(encode); const original = args[side];
    for (const text of ['', '{', 'null', '[]', 'true', '1', '"fixture-secret"', original + '\n', ' ' + original,
      '\ufeff' + original, original.replace('"version":1', '"version":1,"version":1'),
      original.replace('"version":1', '"version":1.0'), original.replace('"version":1', '"version":1e0'),
      encode(Object.fromEntries(Object.entries(fixture()[side]).reverse())),
      original.replace('version', '\\u0076ersion'), '['.repeat(1900) + ']'.repeat(1900)]) {
      const changed = [...args]; changed[side] = text;
      if (text.length > [2048, 4096, 512][side]) checkTexts(changed, 'input_too_large', 'CORRECT_FIXTURE', 'REJECTED');
      else invalid(changed);
    }
  }
  const args = fixture().map(encode); args[1] = args[1].replace('"visible":true', '"visible":true,"visible":true'); invalid(args);
  args[1] = encode({ ...fixture()[1], elements: [Object.fromEntries(Object.entries(element()).reverse())] }); invalid(args);
});
test('D24 every missing or extra field including pollution keys rejects', () => {
  for (let side = 0; side < 4; side++) {
    const select = args => side === 3 ? args[1].elements[0] : args[side];
    for (const key of Object.keys(select(fixture()))) {
      const args = fixture(); delete select(args)[key]; invalid(args.map(encode));
    }
    for (const key of ['__proto__', 'constructor', 'prototype', 'selector', 'url', 'password', 'allowed', 'executed']) {
      const args = fixture(); Object.defineProperty(select(args), key, { value: 'fixture-secret', enumerable: true }); invalid(args.map(encode));
    }
  }
  assert.equal({}.polluted, undefined);
});
test('D25 numeric fields and strict booleans are bounded on every record', () => {
  for (const side of [0, 1, 2, 3]) {
    const object = side === 3 ? element() : fixture()[side];
    for (const key of Object.keys(object).filter(key => typeof object[key] === 'number')) {
      const maximum = key === 'version' ? 999 : key.includes('Generation') ? 1000000 : 3;
      for (const value of [null, 0, -1, 1.5, '1', true, {}, [], maximum + 1]) {
        const args = fixture(); (side === 3 ? args[1].elements[0] : args[side])[key] = value; invalid(args.map(encode));
      }
    }
  }
  for (const key of ['visible', 'enabled']) for (const value of [null, 'true', 0, 1, {}, []])
    invalid(fixture({}, withElement({ [key]: value })).map(encode));
  for (let side = 1; side < 3; side++) {
    const args = fixture().map(encode); args[side] = args[side].replace('"documentGeneration":1', '"documentGeneration":-0'); invalid(args);
  }
});
test('D26 context constants enums and inventory shapes are closed', () => {
  for (const patch of [{ evidenceTier: 'LOCAL_BROWSER_TESTED' }, { provenance: 'AUTHENTICATED' }, { fixtureOnly: false },
    { reason: 'fixture-secret' }, { recognizerReason: 'fixture-secret' }, { nextStep: 'EXECUTE' }]) invalid(fixture(patch).map(encode));
  for (const kind of ['select', 'BUTTON', null, true, {}, []]) {
    invalid(fixture({}, withElement({ kind })).map(encode));
    invalid(fixture({}, {}, { expectedKind: kind }).map(encode));
  }
  for (const elements of [null, {}, 'fixture-secret', [null], [[]], [1], Array.from({ length: 9 }, () => element())])
    invalid(fixture({}, { elements }).map(encode));
  for (const interruption of ['', 'dismiss', null, {}, true]) invalid(fixture({}, { interruption }).map(encode));
});
test('D27 transport limits reject overflow before parse and never truncate', () => {
  for (let side = 0; side < 3; side++) {
    const limit = [2048, 4096, 512][side]; const args = fixture().map(encode);
    args[side] = 'x'.repeat(limit + 1); checkTexts(args, 'input_too_large', 'CORRECT_FIXTURE', 'REJECTED');
    args[side] = 'x'.repeat(limit); invalid(args);
  }
  manual({ elements: Array.from({ length: 8 }, () => element()) }, {}, 'element_ambiguous');
});
test('D28 versions reject without downgrading after all shapes are validated', () => {
  for (let side = 0; side < 3; side++) for (const version of [2, 999]) {
    const args = fixture(); args[side].version = version;
    checkTexts(args.map(encode), 'unsupported_version', 'REVIEW_VERSION', 'REJECTED');
  }
});
test('D29 competing failures follow documented precedence without partial preview', () => {
  const args = fixture().map(encode); args[0] = null; args[1] = 'x'.repeat(4097); invalid(args);
  args[0] = '{'; checkTexts(args, 'input_too_large', 'CORRECT_FIXTURE', 'REJECTED');
  const badShape = fixture({ version: 2 }); badShape[2].extra = true; invalid(badShape.map(encode));
  check({ version: 2 }, {}, { operation: 'submit' }, 'unsupported_version', 'REVIEW_VERSION', 'REJECTED');
  check({ resultClass: 'CANCELLED' }, {}, { operation: 'submit' }, 'unsupported_operation', 'CORRECT_FIXTURE', 'REJECTED');
  check({ resultClass: 'CANCELLED' }, {}, { value: 'toy-value-a' }, 'invalid_intent', 'CORRECT_FIXTURE', 'REJECTED');
  check({ resultClass: 'CANCELLED' }, { interruption: 'login' }, {}, 'context_not_matching', 'STOP', 'MANUAL_REVIEW');
  manual({ interruption: 'login', documentGeneration: 2 }, {}, 'manual_interruption', 'MANUAL_AUTH');
  manual({ documentGeneration: 2, projectSlot: 2 }, {}, 'stale_generation', 'FRESH_SELECTION');
  manual({ projectSlot: 2, elements: [] }, { token: 'toy:unknown' }, 'target_mismatch', 'MANUAL_TARGET');
  manual({ elements: [] }, { token: 'toy:unknown' }, 'unknown_element');
  manual(withElement({ documentGeneration: 2, visible: false }), {}, 'stale_generation', 'FRESH_SELECTION');
  manual(withElement({ projectSlot: 2, visible: false }), {}, 'target_mismatch', 'MANUAL_TARGET');
  manual(withElement({ visible: false, enabled: false, kind: 'input' }), {}, 'element_hidden');
  manual(withElement({ enabled: false, kind: 'input' }), {}, 'element_disabled');
});
test('D30 unrelated known elements do not become requested candidates', () => {
  check({}, { elements: [element({ token: 'toy:label-a', kind: 'label', visible: false, enabled: false, documentGeneration: 2 }),
    element(), element({ token: 'toy:label-a', kind: 'label' })] });
});
test('D31 output is fresh deeply immutable deterministic and explicitly stateless', () => {
  const first = check();
  for (const key of Reflect.ownKeys(first)) assert.throws(() => { first[key] = true; }, TypeError);
  assert.throws(() => { first.allowed = true; }, TypeError);
  assert.throws(() => { delete first.reason; }, TypeError);
  const second = check(); assert.notEqual(first, second); assert.deepEqual(first, second);
  manual({ interruption: 'unexpected_dialog' }, {}, 'manual_interruption', 'MANUAL_DIALOG');
  assert.deepEqual(check(), first);
});
test('D32 no runtime caller or recognizer dependency is introduced and all scenarios use zero capabilities', () => {
  const source = readFileSync(new URL('../src/interaction/dom-primitives.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:import|require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function|globalThis|window|document|navigator|Date|performance|setTimeout|setInterval|setImmediate|queueMicrotask|Worker|Promise|console)\b/);
  assert.doesNotMatch(source, /page-recognition|recognizeFixtureOdooShPage|fx:|Math\.random|node:|child_process/);
  const root = new URL('../src/', import.meta.url);
  for (const file of readdirSync(root, { recursive: true, withFileTypes: true })) {
    if (!file.isFile() || !/\.(mjs|js|html|json)$/.test(file.name)) continue;
    const url = new URL(file.name, `file://${file.parentPath}/`);
    if (url.pathname === new URL('../src/interaction/dom-primitives.mjs', import.meta.url).pathname) continue;
    assert.doesNotMatch(readFileSync(url, 'utf8'), /dom-primitives|previewFixtureDomInteraction/);
  }
  let accesses = 0; const sandbox = {};
  for (const key of ['fetch', 'XMLHttpRequest', 'WebSocket', 'chrome', 'browser', 'document', 'window', 'navigator',
    'location', 'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'clipboard', 'process', 'console',
    'Date', 'performance', 'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'Worker', 'eval', 'Function'])
    Object.defineProperty(sandbox, key, { get() { accesses++; throw new Error('fixture-secret'); } });
  const isolated = runInNewContext(source.replace('export function', 'function') + '\npreviewFixtureDomInteraction;',
    sandbox, { codeGeneration: { strings: false, wasm: false } });
  for (const [c, s, i, serialized] of exercised) assert.equal(encode(isolated(c, s, i)), serialized);
  for (let side = 0; side < 3; side++) { const args = fixture().map(encode); args[side] = {}; assert.equal(isolated(...args)?.reason, 'invalid_input'); }
  assert.equal(accesses, 0);
});
