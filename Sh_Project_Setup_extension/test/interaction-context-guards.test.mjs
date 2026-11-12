import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as guards from '../src/interaction/context-guards.mjs';

const assess = guards.assessFixtureInteractionContext;
const origin = 'https://odoo-sh.fixture.invalid';
const flags = ['browserObserved', 'permissionVerified', 'accountVerified', 'rightsVerified',
  'subscriptionVerified', 'approvalGranted', 'executionAuthorized', 'mutationAuthorized',
  'installationAuthorized', 'trustedContinuingContext', 'associationVerified',
  'productionDatabaseVerified', 'stagingCopyVerified', 'moduleInstalled', 'effectsApplied',
  'readAuthorized', 'writeAuthorized'];
const keys = ['version', 'resultClass', 'reason', 'recognizerReason', 'evidenceTier',
  'provenance', 'fixtureOnly', 'nextStep', ...flags];
const exercised = [];
function fixture(b = {}, c = {}, o = {}) {
  return [{ version: 1, selectedRole: 'odoo-sh', tabSlot: 1, expectedOrigin: origin,
    documentGeneration: 1, contextGeneration: 1, accountContext: 'operator_reported',
    accountContinuity: 'current', projectSlot: 1, branchSlot: 1,
    permissionEvidence: 'fixture_available', rightsEvidence: 'fixture_available', lifecycle: 'current', ...b },
  { version: 1, fixtureVersion: 1, expectedOrigin: origin,
    selections: [{ role: 'odoo-sh', tabSlot: 1 }], documentGeneration: 1, contextGeneration: 1,
    projectSlot: 1, branchSlot: 1, access: 'fixture_available', lifecycle: 'current', ...c },
  { version: 1, fixtureVersion: 1, origin, tabSlot: 1, documentGeneration: 1,
    contextGeneration: 1, projectSlot: 1, branchSlot: 1, markers: ['fx:project-detail'], ...o }];
}
function checkTexts(args, reason, nextStep = 'FRESH_SELECTION', resultClass = 'MANUAL_REVIEW', recognizerReason = 'fixture_page_match') {
  const result = assess(...args);
  assert.deepEqual(result, { version: 1, resultClass, reason, recognizerReason,
    evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED', fixtureOnly: true,
    nextStep, ...Object.fromEntries(flags.map(flag => [flag, false])) });
  assert.deepEqual(Reflect.ownKeys(result), keys);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.ok(Object.isFrozen(result));
  for (const key of keys) {
    assert.ok(['string', 'number', 'boolean'].includes(typeof result[key]));
    assert.equal(Object.getOwnPropertyDescriptor(result, key).writable, false);
  }
  assert.equal('allowed' in result, false);
  const serialized = JSON.stringify(result);
  assert.ok(serialized.length <= 2048);
  assert.match(serialized, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(serialized, /fixture\.invalid|fx:|fixture-secret|fixture-account|https?:|@/);
  if (args.every(value => typeof value === 'string')) exercised.push([...args, serialized]);
  return result;
}
function check(b, c, o, ...expectation) { return checkTexts(fixture(b, c, o).map(JSON.stringify), ...expectation); }
function match(b = {}, c = {}, o = {}) { return check(b, c, o, 'synthetic_context_match', 'REVIEW_FIXTURE', 'SYNTHETIC_CONTEXT_MATCH'); }
function delegated(c, o, reason, step, resultClass = 'MANUAL_REVIEW') { return check({}, c, o, reason, step, resultClass, reason); }
function invalid(args) { return checkTexts(args, 'invalid_input', 'CORRECT_FIXTURE', 'REJECTED', 'NOT_ASSESSED'); }

test('G01 valid synthetic context uses the approved recognizer with no authority', () => {
  assert.deepEqual(Object.keys(guards), ['assessFixtureInteractionContext']);
  match();
  match({ tabSlot: 3 }, { selections: [{ role: 'odoo-sh', tabSlot: 3 }] }, { tabSlot: 3 });
});
test('G02 missing or wrong role/tab cannot inherit another tab evidence', () => {
  for (const patch of [{ selectedRole: null }, { tabSlot: null }]) check(patch, {}, {}, 'binding_selection_missing');
  for (const patch of [{ selectedRole: 'github' }, { selectedRole: 'plementus' }, { tabSlot: 2 }])
    check(patch, {}, {}, 'binding_tab_mismatch');
});
test('G03 binding origin agreement is exact without URL normalization', () => {
  for (const expectedOrigin of [origin + '/', origin.toUpperCase(), 'https://other.fixture.invalid', '*'])
    check({ expectedOrigin }, {}, {}, 'binding_origin_mismatch', 'FRESH_SELECTION', 'REJECTED');
});
test('G04 binding document/context generations must be present and current', () => {
  for (const key of ['documentGeneration', 'contextGeneration']) {
    check({ [key]: null }, {}, {}, 'binding_generation_missing');
    for (const value of [2, 1000000]) check({ [key]: value }, {}, {}, 'binding_generation_stale');
    check({ [key]: 1 }, { [key]: 2 }, { [key]: 2 }, 'binding_generation_stale');
    match({ [key]: 1000000 }, { [key]: 1000000 }, { [key]: 1000000 });
  }
});
test('G05 binding project/branch target disagreement requires manual review', () => {
  for (const key of ['projectSlot', 'branchSlot']) for (const value of [null, 2, 3])
    check({ [key]: value }, {}, {}, 'binding_target_mismatch', 'MANUAL_TARGET');
  match({ projectSlot: null, branchSlot: null }, { projectSlot: null, branchSlot: null },
    { projectSlot: null, branchSlot: null, markers: ['fx:project-list'] });
});
test('G06 missing unknown conflicting and drifting account context stays unverified', () => {
  for (const accountContext of ['missing', 'unknown'])
    check({ accountContext }, {}, {}, 'account_context_unavailable', 'MANUAL_ACCOUNT');
  for (const patch of [{ accountContext: 'conflicting' }, { accountContinuity: 'conflicting' }])
    check(patch, {}, {}, 'account_context_conflicting', 'MANUAL_ACCOUNT');
  check({ accountContinuity: 'stale' }, {}, {}, 'account_context_drift');
  check({ accountContinuity: 'unknown' }, {}, {}, 'account_continuity_unknown', 'MANUAL_ACCOUNT');
});
test('G07 fixture access and login never establish operation rights or Chrome permission', () => {
  check({ permissionEvidence: 'denied' }, {}, {}, 'binding_permission_denied', 'MANUAL_ACCESS');
  check({ rightsEvidence: 'denied' }, {}, {}, 'operation_rights_denied', 'MANUAL_ACCESS');
  for (const value of ['missing', 'unknown']) {
    check({ permissionEvidence: value }, {}, {}, 'binding_permission_unavailable', 'MANUAL_ACCESS');
    check({ rightsEvidence: value }, {}, {}, 'operation_rights_unavailable', 'MANUAL_ACCESS');
  }
  match();
});
test('G08 cancellation loss restart and unexpected navigation stop the candidate', () => {
  check({ lifecycle: 'cancelled' }, {}, {}, 'operator_cancelled', 'STOP', 'CANCELLED');
  for (const [lifecycle, reason] of [['context_lost', 'context_lost'], ['restarted', 'context_restarted'],
    ['unexpected_navigation', 'unexpected_navigation']]) {
    match(); check({ lifecycle }, {}, {}, reason); match();
  }
});
test('G09 recognizer owns wrong-site wrong-tab and missing selection rejection', () => {
  delegated({ expectedOrigin: '*' }, {}, 'unsupported_site', 'FRESH_SELECTION', 'REJECTED');
  delegated({}, { origin: 'https://other.fixture.invalid' }, 'unsupported_site', 'FRESH_SELECTION', 'REJECTED');
  delegated({}, { tabSlot: 2 }, 'tab_mismatch', 'FRESH_SELECTION');
  delegated({ selections: [] }, {}, 'selection_missing', 'FRESH_SELECTION');
  for (const key of ['origin', 'tabSlot']) delegated({}, { [key]: null }, 'source_context_missing', 'FRESH_SELECTION');
});
test('G10 duplicate roles and shared selected tabs cannot choose a winner', () => {
  for (const selections of [
    [{ role: 'odoo-sh', tabSlot: 1 }, { role: 'odoo-sh', tabSlot: 2 }],
    [{ role: 'odoo-sh', tabSlot: 1 }, { role: 'github', tabSlot: 1 }],
    [{ role: 'odoo-sh', tabSlot: 1 }, { role: 'odoo-sh', tabSlot: 1 }],
  ]) {
    delegated({ selections }, {}, 'selection_conflict', 'FRESH_SELECTION');
    delegated({ selections: [...selections].reverse() }, {}, 'selection_conflict', 'FRESH_SELECTION');
  }
});
test('G11 missing and stale recognition generations prevent continuation', () => {
  for (const key of ['documentGeneration', 'contextGeneration']) {
    delegated({ [key]: null }, {}, 'document_context_missing', 'FRESH_SELECTION');
    delegated({}, { [key]: null }, 'document_context_missing', 'FRESH_SELECTION');
    delegated({ [key]: 2 }, {}, 'stale_generation', 'FRESH_SELECTION');
    delegated({}, { [key]: 2 }, 'stale_generation', 'FRESH_SELECTION');
  }
});
test('G12 recognizer target contradictions and missing required targets stay manual', () => {
  for (const key of ['projectSlot', 'branchSlot']) delegated({}, { [key]: 2 }, 'target_conflict', 'MANUAL_TARGET');
  delegated({}, { projectSlot: null }, 'target_context_missing', 'MANUAL_TARGET');
  delegated({}, { branchSlot: null, markers: ['fx:branch-build'] }, 'target_context_missing', 'MANUAL_TARGET');
});
test('G13 login MFA and CAPTCHA interruptions remain manual', () => {
  for (const [marker, reason] of [['fx:auth-required', 'login_required'], ['fx:mfa-required', 'mfa_required'], ['fx:captcha-required', 'captcha_required']])
    delegated({}, { markers: [marker] }, reason, 'MANUAL_AUTH');
});
test('G14 unknown ambiguous and hostile marker classifications cannot support a match', () => {
  for (const [markers, reason] of [[[], 'page_unknown'], [['fx:unknown-panel'], 'unsupported_marker'],
    [['fx:project-detail', 'fx:project-settings'], 'page_conflict'],
    [['fx:project-detail', 'fx:project-detail'], 'duplicate_marker'],
    [['fx:mfa-required', 'fx:captcha-required'], 'interruption_conflict'],
    [['<fixture-script>'], 'unsupported_marker']]) delegated({}, { markers }, reason, 'MANUAL_PAGE');
});
test('G15 binding and accepted recognizer versions never downgrade', () => {
  for (const version of [2, 999]) {
    check({ version }, {}, {}, 'unsupported_binding_version', 'REVIEW_VERSION', 'REJECTED', 'NOT_ASSESSED');
    for (const [key, reason] of [['version', 'unsupported_contract_version'], ['fixtureVersion', 'unsupported_fixture_version']]) {
      delegated({ [key]: version }, {}, reason, 'REVIEW_VERSION', 'REJECTED');
      delegated({}, { [key]: version }, reason, 'REVIEW_VERSION', 'REJECTED');
    }
  }
});
test('G16 recognizer access and lifecycle decisions are preserved', () => {
  delegated({ access: 'denied' }, {}, 'permission_denied', 'MANUAL_ACCESS');
  for (const access of ['missing', 'unknown']) delegated({ access }, {}, 'permission_unavailable', 'MANUAL_ACCESS');
  delegated({ lifecycle: 'cancelled' }, {}, 'operator_cancelled', 'STOP', 'CANCELLED');
  for (const lifecycle of ['context_lost', 'unexpected_navigation']) delegated({ lifecycle }, {}, lifecycle, 'FRESH_SELECTION');
});
test('G17 nonprimitive arguments reject without touching proxies getters or coercion hooks', () => {
  let touched = 0;
  const trap = () => { touched++; throw new Error('fixture-secret'); };
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const values = [undefined, null, true, 1, 1n, Symbol('fixture-account'), () => {}, new String('{}'),
    { toJSON: trap, toString: trap, get then() { return trap(); } }, new Proxy({}, { get: trap, ownKeys: trap }), revoked.proxy];
  for (const value of values) for (let i = 0; i < 3; i++) {
    const args = fixture().map(JSON.stringify); args[i] = value; invalid(args);
  }
  assert.equal(touched, 0);
});
test('G18 malformed noncanonical and deep binding records reject without echo', () => {
  const args = fixture().map(JSON.stringify);
  const reordered = Object.fromEntries(Object.entries(fixture()[0]).reverse());
  for (const text of ['', '{', 'null', '[]', 'true', '"fixture-secret"', args[0] + '\n', ' ' + args[0],
    '\ufeff' + args[0], args[0].replace('"version":1', '"version":1,"version":1'), JSON.stringify(reordered),
    args[0].replace('"version":1', '"version":1.0'), args[0].replace('"tabSlot":1', '"tabSlot":-0'),
    args[0].replace('odoo-sh', '\\u006fdoo-sh'), '['.repeat(600) + ']'.repeat(600)]) invalid([text, ...args.slice(1)]);
  for (const key of Object.keys(fixture()[0])) {
    const b = fixture()[0]; delete b[key]; invalid([JSON.stringify(b), ...args.slice(1)]);
  }
});
test('G19 every binding scalar is closed and bounded', () => {
  const args = fixture().map(JSON.stringify);
  for (const key of ['version', 'tabSlot', 'documentGeneration', 'contextGeneration', 'projectSlot', 'branchSlot'])
    for (const value of [0, -1, 1.5, '1', true, {}, [], key === 'version' ? 1000 : key.includes('Generation') ? 1000001 : 4])
      invalid([JSON.stringify(fixture({ [key]: value })[0]), ...args.slice(1)]);
  for (const key of ['selectedRole', 'accountContext', 'accountContinuity', 'permissionEvidence', 'rightsEvidence', 'lifecycle'])
    for (const value of ['fixture-account', '', 1, {}, false]) invalid([JSON.stringify(fixture({ [key]: value })[0]), ...args.slice(1)]);
  for (const value of ['', 'x'.repeat(129), '\n', 'é', null, {}, 1])
    invalid([JSON.stringify(fixture({ expectedOrigin: value })[0]), ...args.slice(1)]);
  for (const version of [null, false]) invalid([JSON.stringify(fixture({ version })[0]), ...args.slice(1)]);
});
test('G20 unexpected sensitive authority and prototype properties reject in all envelopes', () => {
  for (const key of ['accountId', 'email', 'cookie', 'token', 'allowed', 'approvalGranted', '__proto__', 'constructor'])
    for (let i = 0; i < 3; i++) {
      const values = fixture(); Object.defineProperty(values[i], key, { value: 'fixture-secret', enumerable: true });
      const args = values.map(JSON.stringify);
      if (i === 0) invalid(args);
      else checkTexts(args, 'invalid_input', 'CORRECT_FIXTURE', 'REJECTED', 'invalid_input');
    }
});
test('G21 independent transport budgets reject overflow before parse without truncation', () => {
  for (let i = 0; i < 3; i++) {
    const limit = i === 0 ? 2048 : 8192;
    const args = fixture().map(JSON.stringify); args[i] = 'x'.repeat(limit + 1);
    checkTexts(args, 'input_too_large', 'CORRECT_FIXTURE', 'REJECTED', 'NOT_ASSESSED');
    args[i] = 'x'.repeat(limit);
    checkTexts(args, 'invalid_input', 'CORRECT_FIXTURE', 'REJECTED', i === 0 ? 'NOT_ASSESSED' : 'invalid_input');
  }
});
test('G22 precedence preserves recognizer order then deterministic binding order', () => {
  check({ lifecycle: 'cancelled' }, {}, { markers: [] }, 'page_unknown', 'MANUAL_PAGE', 'MANUAL_REVIEW', 'page_unknown');
  check({ accountContext: 'conflicting', lifecycle: 'cancelled' }, {}, {}, 'operator_cancelled', 'STOP', 'CANCELLED');
  check({ tabSlot: 2, expectedOrigin: '*' }, {}, {}, 'binding_tab_mismatch');
  check({ accountContext: 'missing', accountContinuity: 'conflicting' }, {}, {}, 'account_context_conflicting', 'MANUAL_ACCOUNT');
  check({ accountContext: 'missing', accountContinuity: 'stale' }, {}, {}, 'account_context_unavailable', 'MANUAL_ACCOUNT');
  check({ permissionEvidence: 'unknown', rightsEvidence: 'denied' }, {}, {}, 'binding_permission_unavailable', 'MANUAL_ACCESS');
  check({ version: 2, lifecycle: 'cancelled' }, {}, {}, 'unsupported_binding_version', 'REVIEW_VERSION', 'REJECTED', 'NOT_ASSESSED');
});
test('G23 records have fresh identity and deep immutability with no retained state', () => {
  const first = match();
  assert.throws(() => { first.accountVerified = true; }, TypeError);
  assert.throws(() => { first.allowed = true; }, TypeError);
  assert.throws(() => { delete first.reason; }, TypeError);
  const second = match(); assert.notEqual(first, second); assert.deepEqual(first, second);
  check({ lifecycle: 'restarted' }, {}, {}, 'context_restarted');
  assert.deepEqual(match(), first);
});
test('G24 environment project key and branch matches never grant real authority', () => {
  for (const marker of ['fx:project-list', 'fx:project-detail', 'fx:project-settings', 'fx:submodule-key-settings',
    'fx:branch-build', 'fx:production-context', 'fx:staging-context']) match({}, {}, { markers: [marker] });
});
test('G25 approved import is the sole dependency and scenarios replay with zero capability access', () => {
  const guardSource = readFileSync(new URL('../src/interaction/context-guards.mjs', import.meta.url), 'utf8');
  const providerSource = readFileSync(new URL('../src/odoo-sh/page-recognition.mjs', import.meta.url), 'utf8');
  const importLine = "import { recognizeFixtureOdooShPage } from '../odoo-sh/page-recognition.mjs';\n";
  assert.ok(guardSource.startsWith(importLine));
  const body = guardSource.slice(importLine.length);
  assert.doesNotMatch(body, /\b(?:import|require|eval|Function)\b|\bexport\s*(?:\*|\{)|fx:|Math\.random|node:/);
  let accesses = 0;
  function sandbox() {
    const context = {};
    for (const key of ['fetch', 'XMLHttpRequest', 'WebSocket', 'chrome', 'browser', 'window', 'document', 'navigator',
      'location', 'localStorage', 'sessionStorage', 'indexedDB', 'caches', 'clipboard', 'process', 'console',
      'Date', 'performance', 'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'Worker', 'eval', 'Function'])
      Object.defineProperty(context, key, { get() { accesses++; throw new Error('fixture-secret'); } });
    return context;
  }
  const options = { codeGeneration: { strings: false, wasm: false } };
  const provider = runInNewContext(providerSource.replace('export function', 'function') + '\nrecognizeFixtureOdooShPage;', sandbox(), options);
  const context = sandbox(); context.recognizeFixtureOdooShPage = provider;
  const isolated = runInNewContext(body.replace('export function', 'function') + '\nassessFixtureInteractionContext;', context, options);
  for (const [b, c, o, serialized] of exercised) assert.equal(JSON.stringify(isolated(b, c, o)), serialized);
  assert.equal(accesses, 0);
});
