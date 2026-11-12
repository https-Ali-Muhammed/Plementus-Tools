import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as recognition from '../src/odoo-sh/page-recognition.mjs';

const recognize = recognition.recognizeFixtureOdooShPage;
const encode = JSON.stringify;
const origin = 'https://odoo-sh.fixture.invalid';
const source = readFileSync(new URL('../src/odoo-sh/page-recognition.mjs', import.meta.url), 'utf8');
function fixture(c = {}, o = {}) {
  return [{ version: 1, fixtureVersion: 1, expectedOrigin: origin,
    selections: [{ role: 'odoo-sh', tabSlot: 1 }], documentGeneration: 1,
    contextGeneration: 1, projectSlot: 1, branchSlot: 1,
    access: 'fixture_available', lifecycle: 'current', ...c },
  { version: 1, fixtureVersion: 1, origin, tabSlot: 1, documentGeneration: 1,
    contextGeneration: 1, projectSlot: 1, branchSlot: 1,
    markers: ['fx:project-detail'], ...o }];
}
const flags = ['browserObserved', 'permissionVerified', 'accountVerified', 'rightsVerified',
  'subscriptionVerified', 'approvalGranted', 'executionAuthorized', 'mutationAuthorized',
  'installationAuthorized', 'trustedContinuingContext', 'associationVerified',
  'productionDatabaseVerified', 'stagingCopyVerified', 'moduleInstalled', 'effectsApplied'];
const keys = ['version', 'fixtureVersion', 'resultClass', 'reason', 'pageClass',
  'projectContext', 'branchContext', 'evidenceTier', 'provenance', 'fixtureOnly', 'nextStep', ...flags];
const reasons = {
  invalid_input: ['REJECTED', 'CORRECT_FIXTURE'], input_too_large: ['REJECTED', 'CORRECT_FIXTURE'],
  unsupported_contract_version: ['REJECTED', 'REVIEW_VERSION'], unsupported_fixture_version: ['REJECTED', 'REVIEW_VERSION'],
  operator_cancelled: ['CANCELLED', 'STOP'], unsupported_site: ['REJECTED', 'FRESH_SELECTION'],
  selection_conflict: ['AMBIGUOUS_PAGE', 'FRESH_SELECTION'], selection_missing: ['MANUAL_REVIEW', 'FRESH_SELECTION'],
  permission_denied: ['MANUAL_REVIEW', 'MANUAL_ACCESS'], permission_unavailable: ['MANUAL_REVIEW', 'MANUAL_ACCESS'],
  context_lost: ['MANUAL_REVIEW', 'FRESH_SELECTION'], unexpected_navigation: ['MANUAL_REVIEW', 'FRESH_SELECTION'],
  source_context_missing: ['MANUAL_REVIEW', 'FRESH_SELECTION'], tab_mismatch: ['MANUAL_REVIEW', 'FRESH_SELECTION'],
  document_context_missing: ['MANUAL_REVIEW', 'FRESH_SELECTION'], stale_generation: ['MANUAL_REVIEW', 'FRESH_SELECTION'],
  duplicate_marker: ['AMBIGUOUS_PAGE', 'MANUAL_PAGE'], interruption_conflict: ['AMBIGUOUS_PAGE', 'MANUAL_PAGE'],
  page_conflict: ['AMBIGUOUS_PAGE', 'MANUAL_PAGE'], unsupported_marker: ['UNKNOWN_PAGE', 'MANUAL_PAGE'],
  target_conflict: ['AMBIGUOUS_PAGE', 'MANUAL_TARGET'], mfa_required: ['MANUAL_REVIEW', 'MANUAL_AUTH'],
  captcha_required: ['MANUAL_REVIEW', 'MANUAL_AUTH'], login_required: ['MANUAL_REVIEW', 'MANUAL_AUTH'],
  page_unknown: ['UNKNOWN_PAGE', 'MANUAL_PAGE'], target_context_missing: ['MANUAL_REVIEW', 'MANUAL_TARGET'],
  fixture_page_match: ['FIXTURE_MATCH', 'REVIEW_FIXTURE'],
};
const pages = [
  ['fx:project-list', 'PROJECT_LIST', 'NOT_REQUIRED', 'NOT_REQUIRED'],
  ['fx:project-detail', 'PROJECT_DETAIL', 'AVAILABLE', 'NOT_REQUIRED'],
  ['fx:project-settings', 'PROJECT_SETTINGS', 'AVAILABLE', 'NOT_REQUIRED'],
  ['fx:submodule-key-settings', 'SUBMODULE_KEY_SETTINGS', 'AVAILABLE', 'NOT_REQUIRED'],
  ['fx:branch-build', 'BRANCH_BUILD', 'AVAILABLE', 'AVAILABLE'],
  ['fx:production-context', 'PRODUCTION_CONTEXT', 'AVAILABLE', 'AVAILABLE'],
  ['fx:staging-context', 'STAGING_CONTEXT', 'AVAILABLE', 'AVAILABLE'],
];
const exercised = [];
function expected(reason, pageClass = 'UNKNOWN', projectContext = 'UNAVAILABLE', branchContext = 'UNAVAILABLE') {
  const [resultClass, nextStep] = reasons[reason];
  return { version: 1, fixtureVersion: 1, resultClass, reason, pageClass, projectContext,
    branchContext, evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true,
    nextStep, ...Object.fromEntries(flags.map(key => [key, false])) };
}
function checkTexts(c, o, reason, ...projection) {
  const result = recognize(c, o);
  assert.deepEqual(result, expected(reason, ...projection));
  assert.deepEqual(Reflect.ownKeys(result), keys);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.ok(Object.isFrozen(result));
  const serialized = encode(result);
  assert.ok(serialized.length <= 2048);
  assert.match(serialized, /^[\x00-\x7f]+$/);
  for (const key of keys) {
    const descriptor = Object.getOwnPropertyDescriptor(result, key);
    assert.equal(descriptor.writable, false);
    assert.equal(descriptor.configurable, false);
    assert.equal(descriptor.enumerable, true);
    assert.ok(['string', 'number', 'boolean'].includes(typeof result[key]));
  }
  for (const flag of flags) assert.equal(result[flag], false);
  if (typeof c === 'string' && typeof o === 'string') exercised.push([c, o, serialized]);
  return result;
}
function check(c, o, reason = 'fixture_page_match', ...projection) {
  const pair = fixture(c, o).map(encode);
  return checkTexts(...pair, reason, ...projection);
}
function match(c = {}, o = {}) { return check(c, o, 'fixture_page_match', 'PROJECT_DETAIL', 'AVAILABLE', 'NOT_REQUIRED'); }
function permutations(items) {
  if (!items.length) return [[]];
  return items.flatMap((item, i) => permutations(items.filter((_, j) => i !== j)).map(rest => [item, ...rest]));
}

test('A01 seven non-auth classes have exact required context categories', () => {
  for (const [marker, ...projection] of pages) check({}, { markers: [marker] }, 'fixture_page_match', ...projection);
});
test('A02 listing requires neither target dimension', () => {
  check({ projectSlot: null, branchSlot: null }, { projectSlot: null, branchSlot: null, markers: ['fx:project-list'] },
    'fixture_page_match', 'PROJECT_LIST', 'NOT_REQUIRED', 'NOT_REQUIRED');
});
test('A03 empty markers remain unknown', () => check({}, { markers: [] }, 'page_unknown'));
test('A04 unknown and case-varied markers never match', () => {
  for (const marker of ['fx:unlisted', 'FX:project-detail', 'fx:Project-detail', 'fx:project-detail '])
    check({}, { markers: [marker] }, 'unsupported_marker');
});
test('A05 contradictory page markers are ambiguous in every order', () => {
  for (const pair of [['fx:project-detail', 'fx:project-settings'], ['fx:production-context', 'fx:staging-context'], ['fx:auth-required', 'fx:project-detail']])
    for (const markers of permutations(pair)) check({}, { markers }, 'page_conflict');
});
test('A06 duplicate known, unknown and interruption markers stay ambiguous', () => {
  for (const marker of [...pages.map(p => p[0]), 'fx:auth-required', 'fx:unlisted', 'fx:mfa-required', 'fx:captcha-required'])
    check({}, { markers: [marker, marker] }, 'duplicate_marker');
});
test('A07 either valid future contract version rejects without fallback', () => {
  for (const version of [2, 999]) { check({ version }, {}, 'unsupported_contract_version'); check({}, { version }, 'unsupported_contract_version'); }
});
test('A08 either future fixture version rejects without fallback', () => {
  for (const fixtureVersion of [2, 999]) { check({ fixtureVersion }, {}, 'unsupported_fixture_version'); check({}, { fixtureVersion }, 'unsupported_fixture_version'); }
});
test('A09 origin text is exact and never normalized', () => {
  for (const value of ['https://other.fixture.invalid', `${origin}/`, `${origin}?fixture`, `${origin}#fixture`, origin.toUpperCase(), `${origin}:443`, 'https://fixture@odoo-sh.fixture.invalid']) {
    check({ expectedOrigin: value }, {}, 'unsupported_site'); check({}, { origin: value }, 'unsupported_site');
  }
});
test('A10 missing source origin or tab cannot match', () => {
  for (const key of ['origin', 'tabSlot']) check({}, { [key]: null }, 'source_context_missing');
});
test('A11 all four nullable generation fields are required', () => {
  for (const key of ['documentGeneration', 'contextGeneration']) {
    check({ [key]: null }, {}, 'document_context_missing'); check({}, { [key]: null }, 'document_context_missing');
  }
});
test('A12 both older and newer generations are stale', () => {
  for (const key of ['documentGeneration', 'contextGeneration']) {
    check({ [key]: 2 }, {}, 'stale_generation'); check({}, { [key]: 2 }, 'stale_generation');
  }
});
test('A13 duplicate selection roles, slots and identical entries conflict', () => {
  for (const selections of [
    [{ role: 'odoo-sh', tabSlot: 1 }, { role: 'odoo-sh', tabSlot: 2 }],
    [{ role: 'odoo-sh', tabSlot: 1 }, { role: 'odoo-sh', tabSlot: 1 }],
    [{ role: 'odoo-sh', tabSlot: 1 }, { role: 'github', tabSlot: 1 }],
  ]) for (const order of permutations(selections)) check({ selections: order }, {}, 'selection_conflict');
});
test('A14 observation never infers the missing Odoo.sh role', () => {
  for (const selections of [[], [{ role: 'github', tabSlot: 1 }], [{ role: 'plementus', tabSlot: 1 }], [{ role: 'github', tabSlot: 1 }, { role: 'plementus', tabSlot: 2 }]])
    check({ selections }, {}, 'selection_missing');
});
test('A15 every three-role selection permutation produces identical output', () => {
  const baseline = encode(match());
  for (const selections of permutations([{ role: 'odoo-sh', tabSlot: 1 }, { role: 'github', tabSlot: 2 }, { role: 'plementus', tabSlot: 3 }]))
    assert.equal(encode(match({ selections })), baseline);
});
test('A16 wrong selected tab never matches', () => check({ selections: [{ role: 'odoo-sh', tabSlot: 2 }] }, {}, 'tab_mismatch'));
test('A17 supplied conflicting project or branch includes expected null', () => {
  for (const key of ['projectSlot', 'branchSlot']) for (const value of [1, null])
    check({ [key]: value }, { [key]: 2 }, 'target_conflict');
});
test('A18 detail retains its class with unavailable required project', () => {
  for (const projectSlot of [null, 1]) check({ projectSlot }, { projectSlot: null }, 'target_context_missing', 'PROJECT_DETAIL', 'UNAVAILABLE', 'NOT_REQUIRED');
});
test('A19 required branch is unavailable without losing available project', () => {
  for (const [marker, page] of pages.slice(4)) {
    for (const branchSlot of [1, null]) check({ branchSlot }, { branchSlot: null, markers: [marker] }, 'target_context_missing', page, 'AVAILABLE', 'UNAVAILABLE');
    check({ projectSlot: null }, { projectSlot: null, markers: [marker] }, 'target_context_missing', page, 'UNAVAILABLE', 'AVAILABLE');
  }
});
test('A20 denied, missing and unknown access stay manual', () => {
  for (const access of ['denied', 'missing', 'unknown']) check({ access }, {}, access === 'denied' ? 'permission_denied' : 'permission_unavailable');
});
test('A21 lost context and unexpected navigation stay manual', () => {
  for (const lifecycle of ['context_lost', 'unexpected_navigation']) check({ lifecycle }, {}, lifecycle);
});
test('A22 login, MFA and CAPTCHA never authenticate', () => {
  check({}, { markers: ['fx:auth-required'] }, 'login_required', 'AUTH_REQUIRED', 'NOT_REQUIRED', 'NOT_REQUIRED');
  for (const type of ['mfa', 'captcha']) for (const markers of [[`fx:${type}-required`], [`fx:${type}-required`, 'fx:project-detail']])
    for (const order of permutations(markers)) check({}, { markers: order }, `${type}_required`);
});
test('A23 both interruption markers conflict regardless of order', () => {
  for (const markers of permutations(['fx:mfa-required', 'fx:captcha-required'])) check({}, { markers }, 'interruption_conflict');
});
test('A24 cancellation remains cancelled on repeated calls', () => {
  for (let i = 0; i < 3; i++) check({ lifecycle: 'cancelled' }, {}, 'operator_cancelled');
});
test('A25 hostile non-string values are rejected without property access or coercion', () => {
  let accesses = 0;
  const fail = () => { accesses++; throw new Error('fixture-sentinel'); };
  const proxy = new Proxy({}, { get: fail, ownKeys: fail, getPrototypeOf: fail });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const hostile = Object.defineProperties({}, { toJSON: { get: fail }, then: { get: fail }, [Symbol.iterator]: { get: fail }, [Symbol.toPrimitive]: { get: fail } });
  const [c, o] = fixture().map(encode);
  for (const value of [null, undefined, 1, true, 1n, Symbol('fixture'), new String(c), {}, [], proxy, revoked.proxy, hostile, fail]) {
    checkTexts(value, o, 'invalid_input'); checkTexts(c, value, 'invalid_input');
    checkTexts(value, 'x'.repeat(8193), 'invalid_input');
  }
  assert.equal(accesses, 0);
});
test('A26 syntax, serialization, field order and nested scalar violations reject', () => {
  const pair = fixture().map(encode);
  for (let side = 0; side < 2; side++) {
    const original = pair[side]; const object = JSON.parse(original);
    const missing = { ...object }; delete missing.version;
    const wrongScalar = { ...object, projectSlot: { fixture: 1 } };
    for (const invalid of ['', '{', 'null', '1', '[]', 'true', '"fixture"', original + '\n', '\ufeff' + original,
      ' ' + original, original.replace('"version":1', '"version":1,"version":1'),
      original.replace('"version":1', '"version":1.0'), original.replace('"version":1', '"version":1e0'),
      original.replace('"version"', '"\\u0076ersion"'), encode(missing), encode({ ...object, extra: 1 }),
      encode(Object.fromEntries(Object.entries(object).reverse())), encode(wrongScalar), original.replace('fixture.invalid', 'fixture.é'),
      original.replace('fixture.invalid', 'fixture.\\u00e9'), original.replace('fixture.invalid', 'fixture.\\n')]) {
      const args = [...pair]; args[side] = invalid; checkTexts(...args, 'invalid_input');
    }
  }
  for (const selection of [{ tabSlot: 1, role: 'odoo-sh' }, { role: 'odoo-sh' }, { role: 'odoo-sh', tabSlot: 1, extra: 1 }, null, [], 'odoo-sh'])
    check({ selections: [selection] }, {}, 'invalid_input');
  for (const c of [{ access: 'available' }, { lifecycle: 'CURRENT' }, { selections: [{ role: 'ODOO-SH', tabSlot: 1 }] }, { selections: {} }, { expectedOrigin: null }]) check(c, {}, 'invalid_input');
  for (const markers of [null, {}, 'fx:project-detail', [null], [1], [[]], [{}], [true]]) check({}, { markers }, 'invalid_input');
});
test('A27 each transport overflow wins before parsing or empty-input rejection', () => {
  const [c, o] = fixture().map(encode);
  for (const length of [8193, 9000]) {
    checkTexts('x'.repeat(length), o, 'input_too_large'); checkTexts(c, 'x'.repeat(length), 'input_too_large');
    checkTexts('', 'x'.repeat(length), 'input_too_large');
  }
});
test('A28 text and array boundary values follow shape then semantics', () => {
  for (const length of [0, 1, 64, 65]) check({}, { markers: ['x'.repeat(length)] }, length === 0 || length === 65 ? 'invalid_input' : 'unsupported_marker');
  for (const length of [0, 1, 128, 129]) {
    const reason = length === 0 || length === 129 ? 'invalid_input' : 'unsupported_site';
    check({ expectedOrigin: 'x'.repeat(length) }, {}, reason); check({}, { origin: 'x'.repeat(length) }, reason);
  }
  for (const count of [0, 1, 16, 17]) check({}, { markers: Array.from({ length: count }, (_, i) => `fx:unknown-${i}`) }, count === 0 ? 'page_unknown' : count === 17 ? 'invalid_input' : 'unsupported_marker');
  check({ selections: [] }, {}, 'selection_missing');
  match({ selections: [{ role: 'odoo-sh', tabSlot: 1 }, { role: 'github', tabSlot: 2 }, { role: 'plementus', tabSlot: 3 }] });
  check({ selections: Array.from({ length: 4 }, () => ({ role: 'odoo-sh', tabSlot: 1 })) }, {}, 'invalid_input');
});
test('A29 every numeric field rejects invalid values and accepts inclusive boundaries', () => {
  for (const side of [0, 1]) for (const [fields, bad, bounds] of [
    [['version', 'fixtureVersion'], [0, 1000, 1.5, '1', true, false, null], []],
    [['documentGeneration', 'contextGeneration'], [0, 1000001, 1.5, '1', true, false], [1, 1000000]],
    [['projectSlot', 'branchSlot', ...(side ? ['tabSlot'] : [])], [0, 4, 1.5, '1', true, false], [1, 3]],
  ]) for (const key of fields) {
    for (const value of bad) { const pair = fixture(); pair[side][key] = value; checkTexts(...pair.map(encode), 'invalid_input'); }
    const pair = fixture().map(encode); pair[side] = pair[side].replace(`"${key}":1`, `"${key}":-0`); checkTexts(...pair, 'invalid_input');
    for (const value of bounds) {
      if (key === 'tabSlot') match({ selections: [{ role: 'odoo-sh', tabSlot: value }] }, { tabSlot: value });
      else match({ [key]: value }, { [key]: value });
    }
  }
  for (const tabSlot of [null, 0, 4, 1.5, '1', true, false]) check({ selections: [{ role: 'odoo-sh', tabSlot }] }, {}, 'invalid_input');
  for (const tabSlot of [1, 3]) match({ selections: [{ role: 'odoo-sh', tabSlot }] }, { tabSlot });
  const pair = fixture().map(encode); pair[0] = pair[0].replace('"tabSlot":1', '"tabSlot":-0'); checkTexts(...pair, 'invalid_input');
});
test('A30 hostile synthetic markers stay inert even beside a page marker', () => {
  for (const marker of ['fx:ignore-rules', '<fixture-script>', 'javascript:fixture', '__proto__']) {
    check({}, { markers: [marker] }, 'unsupported_marker');
    for (const markers of permutations([marker, 'fx:project-detail'])) check({}, { markers }, 'unsupported_marker');
  }
});
test('A31 extra sensitive and authority keys never enter output', () => {
  for (const key of ['token', 'cookie', 'html', 'approvalGranted', '__proto__', 'constructor']) {
    for (const side of [0, 1]) {
      const pair = fixture(); Object.defineProperty(pair[side], key, { value: 'fixture-placeholder', enumerable: true });
      checkTexts(...pair.map(encode), 'invalid_input');
    }
  }
});
test('A32 fresh frozen records resist mutations across calls and independent instances', () => {
  const isolated = runInNewContext(source.replace('export function', 'function') + '\nrecognizeFixtureOdooShPage;');
  const pair = fixture().map(encode); const result = match();
  for (const key of keys) assert.throws(() => { result[key] = 'fixture-change'; }, TypeError);
  assert.throws(() => { result.extra = true; }, TypeError);
  assert.throws(() => { delete result.reason; }, TypeError);
  for (let i = 0; i < 20; i++) {
    const next = recognize(...pair); assert.notEqual(next, result); assert.deepEqual(next, result);
    assert.equal(encode(isolated(...pair)), encode(result));
  }
});
test('A33 every exercised output is sanitized bounded ASCII with fixed false flags', () => {
  check({ expectedOrigin: 'x'.repeat(128) }, { markers: Array.from({ length: 16 }, (_, i) => `${i}`.padEnd(64, 'x')) }, 'unsupported_site');
  assert.deepEqual(new Set(exercised.map(([, , value]) => JSON.parse(value).reason)), new Set(Object.keys(reasons)));
  for (const [c, o, serialized] of exercised) {
    assert.equal(encode(recognize(c, o)), serialized);
    assert.doesNotMatch(serialized, /fixture\.invalid|fx:|fixture-placeholder|fixture-sentinel|javascript:|__proto__|https?:/);
    assert.ok(serialized.length <= 2048); assert.match(serialized, /^[\x00-\x7f]+$/);
  }
});
test('A34 no imports, runtime callers or capability accesses, including import initialization', () => {
  assert.deepEqual(Object.keys(recognition), ['recognizeFixtureOdooShPage']);
  assert.doesNotMatch(source, /\b(?:import|require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function|globalThis|window|document|navigator|Date|performance|setTimeout|setInterval|setImmediate|queueMicrotask|Worker|Promise|console)\b/);
  assert.doesNotMatch(source, /Math\.random|node:|child_process/);
  for (const file of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true })) {
    if (file.isFile() && /\.(mjs|js|html|json)$/.test(file.name) && file.name !== 'page-recognition.mjs')
      assert.doesNotMatch(readFileSync(`${file.parentPath}/${file.name}`, 'utf8'), /page-recognition|recognizeFixtureOdooShPage/);
  }
  let accesses = 0; const context = {};
  for (const key of ['fetch', 'XMLHttpRequest', 'WebSocket', 'chrome', 'browser', 'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'document', 'window', 'navigator', 'clipboard', 'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'Date', 'performance', 'console', 'process', 'Worker', 'eval', 'Function'])
    Object.defineProperty(context, key, { get() { accesses++; throw new Error('fixture-sentinel'); } });
  const isolated = runInNewContext(source.replace('export function', 'function') + '\nrecognizeFixtureOdooShPage;', context, { codeGeneration: { strings: false, wasm: false } });
  for (const [c, o, serialized] of exercised) assert.equal(encode(isolated(c, o)), serialized);
  assert.equal(accesses, 0);
});
test('A35 environments, key settings and branch/build confer no real authority', () => {
  for (const [marker, ...projection] of pages.slice(3)) {
    const result = check({}, { markers: [marker] }, 'fixture_page_match', ...projection);
    for (const flag of flags) assert.equal(result[flag], false);
  }
});
test('A36 malformed and future envelopes precede cancellation; selection precedes access', () => {
  check({ lifecycle: 'cancelled', extra: true }, {}, 'invalid_input');
  check({ lifecycle: 'cancelled', version: 2 }, {}, 'unsupported_contract_version');
  check({ access: 'missing', selections: [{ role: 'odoo-sh', tabSlot: 1 }, { role: 'odoo-sh', tabSlot: 2 }] }, {}, 'selection_conflict');
});
test('A37 stale and conflicting evidence obey precedence across marker permutations', () => {
  for (const markers of [['fx:project-detail', 'fx:project-settings', 'fx:unlisted'], ['fx:unlisted']])
    for (const order of permutations(markers)) check({}, { documentGeneration: 2, markers: order }, 'stale_generation');
  for (const markers of permutations(['fx:mfa-required', 'fx:mfa-required', 'fx:captcha-required'])) check({}, { markers }, 'duplicate_marker');
  for (const markers of permutations(['fx:project-detail', 'fx:project-settings', 'fx:unlisted'])) check({}, { markers }, 'page_conflict');
});
test('A38 unknown beats target conflict, target beats MFA, login beats missing target', () => {
  check({}, { projectSlot: 2, markers: ['fx:unlisted'] }, 'unsupported_marker');
  check({}, { projectSlot: 2, markers: ['fx:mfa-required'] }, 'target_conflict');
  check({ projectSlot: null, branchSlot: null }, { projectSlot: null, branchSlot: null, markers: ['fx:auth-required'] }, 'login_required', 'AUTH_REQUIRED', 'NOT_REQUIRED', 'NOT_REQUIRED');
});
test('A39 non-required branch contradictions still conflict on listing', () => {
  check({ branchSlot: null }, { markers: ['fx:project-list'] }, 'target_conflict');
});
test('A40 parseable schema-invalid strings at exactly 8192 are not overflow', () => {
  const pair = fixture().map(value => {
    value.padding = ''; const base = encode(value); value.padding = 'x'.repeat(8192 - base.length);
    const text = encode(value); assert.equal(text.length, 8192); assert.doesNotThrow(() => JSON.parse(text)); return text;
  });
  checkTexts(...pair, 'invalid_input');
});
test('ordered precedence rows 1–29 retain the first applicable reason', () => {
  const [c, o] = fixture().map(encode);
  checkTexts(null, 'x'.repeat(8193), 'invalid_input'); // 1 before 2
  checkTexts('{', 'x'.repeat(8193), 'input_too_large'); // 2 before 3
  checkTexts(encode(fixture({ version: 2 })[0]), '{', 'invalid_input'); // 3 before 4
  const conflict = [{ role: 'github', tabSlot: 1 }, { role: 'github', tabSlot: 2 }];
  const rows = [
    [{ fixtureVersion: 2 }, { version: 2 }, 'unsupported_contract_version'], // 4 before 5 across envelopes
    [{ fixtureVersion: 2, lifecycle: 'cancelled' }, {}, 'unsupported_fixture_version'], // 5 before 6
    [{ lifecycle: 'cancelled', expectedOrigin: 'x' }, {}, 'operator_cancelled'], // 6 before 7
    [{ expectedOrigin: 'x', selections: conflict }, {}, 'unsupported_site'], // 7 before 8
    [{ selections: conflict }, {}, 'selection_conflict'], // 8 before 9
    [{ selections: [], access: 'denied' }, {}, 'selection_missing'], // 9 before 10
    [{ access: 'denied', lifecycle: 'context_lost' }, {}, 'permission_denied'], // 10 before 12 (10/11 exclusive)
    [{ access: 'unknown', lifecycle: 'context_lost' }, {}, 'permission_unavailable'], // 11 before 12
    [{ lifecycle: 'context_lost' }, { origin: null }, 'context_lost'], // 12 before 14 (12/13 exclusive)
    [{ lifecycle: 'unexpected_navigation' }, { origin: null }, 'unexpected_navigation'], // 13 before 14
    [{}, { origin: 'x', tabSlot: null }, 'source_context_missing'], // 14 before 15
    [{}, { origin: 'x', tabSlot: 2 }, 'unsupported_site'], // 15 before 16
    [{ documentGeneration: null }, { tabSlot: 2 }, 'tab_mismatch'], // 16 before 17
    [{ documentGeneration: null }, { contextGeneration: 2 }, 'document_context_missing'], // 17 before 18
    [{}, { contextGeneration: 2, markers: ['fx:unlisted', 'fx:unlisted'] }, 'stale_generation'], // 18 before 19
    [{}, { markers: ['fx:mfa-required', 'fx:mfa-required', 'fx:captcha-required'] }, 'duplicate_marker'], // 19 before 20
    [{}, { markers: ['fx:mfa-required', 'fx:captcha-required', 'fx:project-detail', 'fx:project-settings'] }, 'interruption_conflict'], // 20 before 21
    [{}, { markers: ['fx:project-detail', 'fx:project-settings', 'fx:unlisted'] }, 'page_conflict'], // 21 before 22
    [{}, { projectSlot: 2, markers: ['fx:unlisted'] }, 'unsupported_marker'], // 22 before 23
    [{}, { projectSlot: 2, markers: ['fx:mfa-required'] }, 'target_conflict'], // 23 before 24
    [{}, { markers: ['fx:mfa-required', 'fx:auth-required'] }, 'mfa_required'], // 24 before 26 (24/25 invoke 20)
    [{}, { markers: ['fx:captcha-required', 'fx:auth-required'] }, 'captcha_required'], // 25 before 26
    [{ projectSlot: null }, { projectSlot: null, markers: ['fx:auth-required'] }, 'login_required', 'AUTH_REQUIRED', 'NOT_REQUIRED', 'NOT_REQUIRED'], // 26
    [{ projectSlot: null }, { projectSlot: null, markers: [] }, 'page_unknown'], // 27
    [{}, { projectSlot: null }, 'target_context_missing', 'PROJECT_DETAIL', 'UNAVAILABLE', 'NOT_REQUIRED'], // 28
    [{}, {}, 'fixture_page_match', 'PROJECT_DETAIL', 'AVAILABLE', 'NOT_REQUIRED'], // 29
  ];
  for (const [config, observation, reason, ...projection] of rows) {
    if (observation.markers) {
      for (const markers of permutations(observation.markers)) check(config, { ...observation, markers }, reason, ...projection);
    } else check(config, observation, reason, ...projection);
  }
  checkTexts(c.replace('"version":1', '"version":2'), o.replace('"markers":[', '"extra":true,"markers":['), 'invalid_input');
});
