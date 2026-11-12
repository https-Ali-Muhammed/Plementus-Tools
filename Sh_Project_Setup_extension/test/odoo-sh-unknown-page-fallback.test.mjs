import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import * as recognition from '../src/odoo-sh/page-recognition.mjs';

const origin = 'https://odoo-sh.fixture.invalid';
const flags = ['browserObserved', 'permissionVerified', 'accountVerified', 'rightsVerified',
  'subscriptionVerified', 'approvalGranted', 'executionAuthorized', 'mutationAuthorized',
  'installationAuthorized', 'trustedContinuingContext', 'associationVerified',
  'productionDatabaseVerified', 'stagingCopyVerified', 'moduleInstalled', 'effectsApplied'];
const keys = ['version', 'fixtureVersion', 'resultClass', 'reason', 'pageClass',
  'projectContext', 'branchContext', 'evidenceTier', 'provenance', 'fixtureOnly', 'nextStep', ...flags];
const exercised = [];
function fixture(c = {}, o = {}) {
  return [{ version: 1, fixtureVersion: 1, expectedOrigin: origin,
    selections: [{ role: 'odoo-sh', tabSlot: 1 }], documentGeneration: 1,
    contextGeneration: 1, projectSlot: 1, branchSlot: 1,
    access: 'fixture_available', lifecycle: 'current', ...c },
  { version: 1, fixtureVersion: 1, origin, tabSlot: 1, documentGeneration: 1,
    contextGeneration: 1, projectSlot: 1, branchSlot: 1,
    markers: ['fx:project-detail'], ...o }];
}
function check(c, o, resultClass, reason, nextStep, pageClass = 'UNKNOWN',
  projectContext = 'UNAVAILABLE', branchContext = 'UNAVAILABLE') {
  const args = fixture(c, o).map(value => JSON.stringify(value));
  const result = recognition.recognizeFixtureOdooShPage(...args);
  assert.deepEqual(result, { version: 1, fixtureVersion: 1, resultClass, reason, pageClass,
    projectContext, branchContext, evidenceTier: 'SIMULATED', provenance: 'SYNTHETIC_UNTRUSTED',
    fixtureOnly: true, nextStep, ...Object.fromEntries(flags.map(flag => [flag, false])) });
  assert.deepEqual(Reflect.ownKeys(result), keys);
  assert.equal(Object.getPrototypeOf(result), Object.prototype);
  assert.ok(Object.isFrozen(result));
  for (const value of Object.values(result)) assert.ok(['string', 'number', 'boolean'].includes(typeof value));
  const serialized = JSON.stringify(result);
  assert.ok(serialized.length <= 2048);
  assert.match(serialized, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(serialized, /fx:|fixture\.invalid|fixture-inert|https?:|xpath|selector|registry/);
  exercised.push([...args, serialized]);
  return result;
}
function matched(c = {}, o = {}) {
  return check(c, o, 'FIXTURE_MATCH', 'fixture_page_match', 'REVIEW_FIXTURE', 'PROJECT_DETAIL', 'AVAILABLE', 'NOT_REQUIRED');
}
function permutations(items) {
  if (!items.length) return [[]];
  return items.flatMap((item, i) => permutations(items.filter((_, j) => i !== j)).map(rest => [item, ...rest]));
}

test('U01 supported fixture replaced by empty or unknown evidence loses its class', () => {
  for (const markers of [[], ['fx:unknown-panel'], ['FX:project-detail'], ['fx:project-detail '], ['fx:project-details']]) {
    matched();
    check({}, { documentGeneration: 2, markers }, 'MANUAL_REVIEW', 'stale_generation', 'FRESH_SELECTION');
    check({ documentGeneration: 2 }, { documentGeneration: 2, markers }, 'UNKNOWN_PAGE',
      markers.length ? 'unsupported_marker' : 'page_unknown', 'MANUAL_PAGE');
  }
});
test('U02 ambiguous replacements never retain a preceding page match', () => {
  for (const [markers, reason] of [
    [['fx:project-detail', 'fx:project-settings'], 'page_conflict'],
    [['fx:project-detail', 'fx:project-detail'], 'duplicate_marker'],
    [['fx:mfa-required', 'fx:captcha-required'], 'interruption_conflict'],
  ]) for (const order of permutations(markers)) {
    matched();
    check({}, { markers: order }, 'AMBIGUOUS_PAGE', reason, 'MANUAL_PAGE');
  }
});
test('U03 unsupported evidence cannot be ignored beside a supported marker', () => {
  for (const markers of permutations(['fx:project-detail', 'fx:unknown-panel']))
    check({}, { markers }, 'UNKNOWN_PAGE', 'unsupported_marker', 'MANUAL_PAGE');
});
test('U04 conflicting pages precede unsupported markers with deterministic permutations', () => {
  let previous;
  for (const markers of permutations(['fx:project-detail', 'fx:project-settings', 'fx:unknown-panel'])) {
    const result = check({}, { markers }, 'AMBIGUOUS_PAGE', 'page_conflict', 'MANUAL_PAGE');
    if (previous) assert.deepEqual(result, previous);
    previous = result;
  }
});
test('U05 duplicate then interruption conflict precede unknown and page conflict', () => {
  for (const [markers, reason] of [
    [['fx:mfa-required', 'fx:mfa-required', 'fx:captcha-required', 'fx:unknown-panel'], 'duplicate_marker'],
    [['fx:mfa-required', 'fx:captcha-required', 'fx:project-detail', 'fx:unknown-panel'], 'interruption_conflict'],
  ]) for (const order of permutations(markers)) check({}, { markers: order }, 'AMBIGUOUS_PAGE', reason, 'MANUAL_PAGE');
});
test('U06 known page followed by explicitly supplied unexpected navigation', () => {
  matched();
  check({ lifecycle: 'unexpected_navigation' }, {}, 'MANUAL_REVIEW', 'unexpected_navigation', 'FRESH_SELECTION');
  matched(); // Same old inputs still match: this function enforces no cross-call lifecycle.
});
test('U07 formerly matched fixture with stale document or context generation stays manual', () => {
  for (const key of ['documentGeneration', 'contextGeneration']) {
    matched();
    for (const markers of [['fx:project-detail'], ['fx:unknown-panel'], []])
      check({ [key]: 2 }, { markers }, 'MANUAL_REVIEW', 'stale_generation', 'FRESH_SELECTION');
  }
});
test('U08 missing required target and contradictory target remain distinct', () => {
  check({}, { projectSlot: null }, 'MANUAL_REVIEW', 'target_context_missing', 'MANUAL_TARGET', 'PROJECT_DETAIL', 'UNAVAILABLE', 'NOT_REQUIRED');
  check({}, { projectSlot: 2 }, 'AMBIGUOUS_PAGE', 'target_conflict', 'MANUAL_TARGET');
  check({}, { projectSlot: 2, markers: ['fx:unknown-panel'] }, 'UNKNOWN_PAGE', 'unsupported_marker', 'MANUAL_PAGE');
});
test('U09 valid unsupported contract/catalog versions never downgrade identical markers', () => {
  for (const [field, reason] of [['version', 'unsupported_contract_version'], ['fixtureVersion', 'unsupported_fixture_version']])
    for (const version of [2, 999]) for (const side of [0, 1, 2]) {
      matched();
      const patch = { [field]: version };
      check(side === 1 ? {} : patch, side === 0 ? {} : patch, 'REJECTED', reason, 'REVIEW_VERSION');
      matched();
    }
});
test('U10 malformed version envelopes precede valid unsupported version selection', () => {
  for (const field of ['version', 'fixtureVersion']) for (const value of [0, 1000, 1.5, '2', null, true]) {
    check({ version: 2 }, { [field]: value }, 'REJECTED', 'invalid_input', 'CORRECT_FIXTURE');
    check({ [field]: value }, { fixtureVersion: 2 }, 'REJECTED', 'invalid_input', 'CORRECT_FIXTURE');
  }
  check({ version: 2 }, { markers: [null] }, 'REJECTED', 'invalid_input', 'CORRECT_FIXTURE');
});
test('U11 version and exact site checks precede conflicting marker classification', () => {
  const conflict = { markers: ['fx:project-detail', 'fx:project-settings', 'fx:unknown-panel'] };
  check({ version: 2, fixtureVersion: 2, expectedOrigin: '*' }, conflict, 'REJECTED', 'unsupported_contract_version', 'REVIEW_VERSION');
  check({ fixtureVersion: 2, expectedOrigin: '*' }, conflict, 'REJECTED', 'unsupported_fixture_version', 'REVIEW_VERSION');
  check({ expectedOrigin: '*' }, conflict, 'REJECTED', 'unsupported_site', 'FRESH_SELECTION');
  check({}, { ...conflict, origin: 'https://other.fixture.invalid' }, 'REJECTED', 'unsupported_site', 'FRESH_SELECTION');
});
test('U12 no wildcard, prefix, route or origin normalization', () => {
  for (const value of ['*', 'https://*.fixture.invalid', origin + '/', origin + '/fixture-inert', origin + '#fixture-inert', origin.toUpperCase(), origin + '.other']) {
    check({ expectedOrigin: value }, {}, 'REJECTED', 'unsupported_site', 'FRESH_SELECTION');
    check({}, { origin: value }, 'REJECTED', 'unsupported_site', 'FRESH_SELECTION');
  }
});
test('U13 invented CSS XPath DOM and route-shaped strings are inert fixture data', () => {
  for (const marker of ['.fixture-inert > [data-fixture="panel"]', '//fixture-inert[@slot="1"]',
    '<fixture-inert>panel</fixture-inert>', '/fixture-inert/panel', 'fx:project-*', 'fx:project-detail#fixture-inert'])
    for (const markers of [[marker], [marker, 'fx:project-detail']])
      check({}, { markers }, 'UNKNOWN_PAGE', 'unsupported_marker', 'MANUAL_PAGE');
  check({}, { markers: [{ selector: '.fixture-inert' }] }, 'REJECTED', 'invalid_input', 'CORRECT_FIXTURE');
});
test('U14 caller registries callbacks and loaders are outside both closed schemas', () => {
  for (const key of ['selectorRegistry', 'selectors', 'callback', 'catalog', 'loader', 'module']) {
    check({ [key]: 'fixture-inert' }, {}, 'REJECTED', 'invalid_input', 'CORRECT_FIXTURE');
    check({}, { [key]: 'fixture-inert' }, 'REJECTED', 'invalid_input', 'CORRECT_FIXTURE');
  }
  assert.deepEqual(Object.keys(recognition), ['recognizeFixtureOdooShPage']);
});
test('U15 external fixture and result mutations cannot alter the private catalog', () => {
  const pair = fixture();
  const texts = pair.map(value => JSON.stringify(value));
  const first = recognition.recognizeFixtureOdooShPage(...texts);
  pair[1].markers.push('fx:unknown-panel');
  pair[0].fixtureVersion = 2;
  assert.throws(() => { first.pageClass = 'fixture-inert'; }, TypeError);
  assert.throws(() => { first.selectorRegistry = 'fixture-inert'; }, TypeError);
  assert.deepEqual(recognition.recognizeFixtureOdooShPage(...texts), first);
  assert.notEqual(recognition.recognizeFixtureOdooShPage(...texts), first);
  check({}, { markers: ['fx:unknown-panel'] }, 'UNKNOWN_PAGE', 'unsupported_marker', 'MANUAL_PAGE');
  matched();
});
test('U16 missing selection and missing context require fresh explicit fixture evidence', () => {
  check({ selections: [] }, {}, 'MANUAL_REVIEW', 'selection_missing', 'FRESH_SELECTION');
  check({}, { origin: null }, 'MANUAL_REVIEW', 'source_context_missing', 'FRESH_SELECTION');
  check({}, { documentGeneration: null }, 'MANUAL_REVIEW', 'document_context_missing', 'FRESH_SELECTION');
});
test('U17 modeled auth interruptions and cancellation stay manual with no authority', () => {
  check({}, { markers: ['fx:auth-required'] }, 'MANUAL_REVIEW', 'login_required', 'MANUAL_AUTH', 'AUTH_REQUIRED', 'NOT_REQUIRED', 'NOT_REQUIRED');
  for (const type of ['mfa', 'captcha']) check({}, { markers: [`fx:${type}-required`] }, 'MANUAL_REVIEW', `${type}_required`, 'MANUAL_AUTH');
  check({ lifecycle: 'cancelled' }, { markers: ['fx:unknown-panel'] }, 'CANCELLED', 'operator_cancelled', 'STOP');
});
test('U18 every new scenario replays without navigation permission auth or dynamic loading capabilities', () => {
  const source = readFileSync(new URL('../src/odoo-sh/page-recognition.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:import|require|eval|Function)\b/);
  let accesses = 0;
  const context = {};
  for (const key of ['fetch', 'XMLHttpRequest', 'WebSocket', 'chrome', 'browser', 'window', 'document',
    'navigator', 'location', 'localStorage', 'sessionStorage', 'indexedDB', 'process', 'console',
    'Date', 'performance', 'setTimeout', 'setInterval', 'queueMicrotask', 'Worker', 'eval', 'Function'])
    Object.defineProperty(context, key, { get() { accesses++; throw new Error('fixture-inert'); } });
  const isolated = runInNewContext(source.replace('export function', 'function') + '\nrecognizeFixtureOdooShPage;',
    context, { codeGeneration: { strings: false, wasm: false } });
  for (const [c, o, serialized] of exercised) assert.equal(JSON.stringify(isolated(c, o)), serialized);
  assert.equal(accesses, 0);
});
