import test from 'node:test';
import assert from 'node:assert/strict';
import { inspectFixtureBranches } from '../src/github/branch-inspection.mjs';

const names = ['fixture-main', 'fixture-develop', 'fixture-staging', 'fixture-release',
  'fixture-feature-a', 'fixture-feature-b', 'fixture-hotfix', 'fixture-test', 'fixture-docs'];
const fixture = () => ({
  selection: { organization: 'fixture-org-alpha', repository: 'fixture-repo-demo' },
  repositories: [{ id: 'fixture-repo-demo', organization: 'fixture-org-alpha', visibility: 'private',
    branchState: 'available', branches: ['fixture-main', 'fixture-develop'], defaultBranch: 'fixture-main' }],
});
function inspect(value = fixture(), target = 'fixture-develop') {
  return safe(inspectFixtureBranches(JSON.stringify(value), target));
}
function safe(result) {
  assert.ok(result, 'inspector must return a summary');
  assert.equal(result.evidenceTier, 'SIMULATED');
  assert.equal(result.fixtureOnly, true);
  assert.equal(result.nextStep, 'manual');
  for (const key of ['accountVerified', 'permissionsVerified', 'executionAuthorized', 'approvalGranted',
    'trustedContinuingContext', 'effectsEnabled']) assert.equal(result[key], false);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.defaultBranch));
  assert.ok(Object.isFrozen(result.targetBranch));
  const text = JSON.stringify(result);
  assert.ok(text.length <= 1024);
  assert.match(text, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(text, /SECRET|fixture-org-|fixture-repo-|password|stack/);
  return result;
}
function states(result, defaultState, targetState, reason) {
  assert.deepEqual(result.defaultBranch, { state: defaultState });
  assert.deepEqual(result.targetBranch, { state: targetState });
  assert.equal(result.reason, reason);
}

test('existing default and nondefault target are descriptive only', () => {
  const r = inspect(); states(r, 'existing', 'existing', 'fixture_branches_available');
  assert.equal(r.defaultBranchAsNewTarget, false);
});
test('absent target is missing, never creation permission', () => {
  states(inspect(fixture(), 'fixture-test'), 'existing', 'missing', 'fixture_branches_available');
});
test('empty available discovery means no default and missing target', () => {
  const f = fixture(); Object.assign(f.repositories[0], { branches: [], defaultBranch: null });
  states(inspect(f), 'missing', 'missing', 'fixture_branches_empty');
});
for (const name of names) {
  test(`protect declared default ${name} from use as a new target`, () => {
    const f = fixture(); Object.assign(f.repositories[0], { branches: [name], defaultBranch: name });
    const r = inspect(f, name);
    states(r, 'existing', 'existing', 'default_branch_protected');
    assert.equal(r.defaultBranchAsNewTarget, true);
  });
}
for (const state of ['unknown', 'unavailable', 'unsupported']) {
  test(`${state} discovery does not imply missing branches`, () => {
    const f = fixture(); Object.assign(f.repositories[0], { branchState: state, branches: [], defaultBranch: null });
    const r = inspect(f); states(r, state, state, `fixture_branches_${state}`);
    assert.equal(r.defaultBranchAsNewTarget, null);
  });
}
for (const visibility of ['private', 'public', 'internal', 'unknown', 'unavailable', 'unsupported']) {
  test(`visibility ${visibility} does not grant branch permissions`, () => {
    const f = fixture(); f.repositories[0].visibility = visibility;
    states(inspect(f), 'existing', 'existing', 'fixture_branches_available');
  });
}
for (const [label, change, reason, state] of [
  ['missing repository', f => { f.repositories = []; }, 'repository_missing', 'unknown'],
  ['ownership mismatch', f => { f.repositories[0].organization = 'fixture-org-other'; }, 'ownership_mismatch', 'unknown'],
  ['missing default', f => { f.repositories[0].defaultBranch = 'fixture-test'; }, 'ambiguous_fixture', 'unknown'],
  ['null default', f => { f.repositories[0].defaultBranch = null; }, 'ambiguous_fixture', 'unknown'],
  ['duplicate branches', f => { f.repositories[0].branches.push('fixture-main'); }, 'ambiguous_fixture', 'unknown'],
  ['duplicate repositories', f => { f.repositories.push(f.repositories[0]); }, 'ambiguous_fixture', 'unknown'],
  ['malformed unselected entry', f => { f.repositories.push({ id: 'SECRET' }); }, 'invalid_fixture', 'invalid'],
  ['excess branches', f => { f.repositories[0].branches = names; }, 'invalid_fixture', 'invalid'],
]) {
  test(`${label} retains sanitized manual fallback`, () => {
    const f = fixture(); change(f); const r = inspect(f);
    states(r, state, state, reason); assert.equal(r.defaultBranchAsNewTarget, null);
  });
}
for (const target of ['', 'main', 'fixture-Main', 'fixture-main\n', 'fixture-é', 'SECRET',
  'fixture-feature-aa', 'a'.repeat(3073), null, undefined, 1, true, {}, [], 1n, Symbol('SECRET')]) {
  test(`invalid target type ${typeof target} / ${typeof target === 'string' ? target.slice(0, 24) : ''}`, () => {
    const r = safe(inspectFixtureBranches(JSON.stringify(fixture()), target));
    states(r, 'existing', 'invalid', 'invalid_target');
    assert.equal(r.defaultBranchAsNewTarget, null);
  });
}
test('invalid source takes precedence over invalid target', () => {
  states(safe(inspectFixtureBranches('{}', 'SECRET')), 'invalid', 'invalid', 'invalid_fixture');
});
test('canonical encoding and size validation remain owned by accepted reader', () => {
  const text = JSON.stringify(fixture());
  for (const bad of ['', '{', text + ' ', text.replace('fixture-main', 'fixture\\u002dmain'),
    text.replace('"visibility":"private"', '"visibility":"public","visibility":"private"'),
    'x'.repeat(3073), '['.repeat(1500) + '0' + ']'.repeat(1500)]) {
    states(safe(inspectFixtureBranches(bad, 'fixture-main')), 'invalid', 'invalid', 'invalid_fixture');
  }
});
test('hostile objects are rejected without hooks or coercion', () => {
  let calls = 0; const hook = () => { calls++; throw new Error('SECRET'); };
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const cycle = {}; cycle.self = cycle;
  const bad = [new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook }), revoked.proxy,
    { toJSON: hook, toString: hook, [Symbol.toPrimitive]: hook }, cycle, new String('fixture-main'), hook];
  for (const value of bad) {
    states(safe(inspectFixtureBranches(value, 'fixture-main')), 'invalid', 'invalid', 'invalid_fixture');
    states(safe(inspectFixtureBranches(JSON.stringify(fixture()), value)), 'existing', 'invalid', 'invalid_target');
  }
  assert.equal(calls, 0);
});
test('maximum valid branch set, deterministic immutable summary, unchanged input', () => {
  const f = fixture(); f.repositories[0].branches = names.slice(0, 8);
  const before = JSON.stringify(f); const result = inspect(f);
  for (let i = 0; i < 10; i++) assert.deepEqual(inspect(f), result);
  assert.equal(JSON.stringify(f), before);
  assert.throws(() => { result.effectsEnabled = true; }, TypeError);
  assert.throws(() => { result.defaultBranch.state = 'missing'; }, TypeError);
  assert.throws(() => { result.targetBranch.state = 'missing'; }, TypeError);
});
test('no network, browser or storage capability is accessed', () => {
  const keys = ['fetch', 'XMLHttpRequest', 'WebSocket', 'chrome', 'browser', 'localStorage', 'sessionStorage', 'indexedDB'];
  const descriptors = keys.map(k => Object.getOwnPropertyDescriptor(globalThis, k)); let calls = 0;
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, get() { calls++; throw new Error('SECRET'); } });
    inspect(); inspect(fixture(), 'fixture-main'); inspect(fixture(), 'SECRET');
    safe(inspectFixtureBranches('{}', 'fixture-main')); assert.equal(calls, 0);
  } finally {
    keys.forEach((k, i) => descriptors[i] ? Object.defineProperty(globalThis, k, descriptors[i]) : delete globalThis[k]);
  }
});
