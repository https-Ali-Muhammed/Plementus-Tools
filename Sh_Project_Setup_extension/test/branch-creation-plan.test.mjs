import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { planFixtureBranchCreation } from '../src/github/branch-creation-plan.mjs';
import { inspectFixtureBranches } from '../src/github/branch-inspection.mjs';

const names = ['fixture-main', 'fixture-develop', 'fixture-staging', 'fixture-release',
  'fixture-feature-a', 'fixture-feature-b', 'fixture-hotfix', 'fixture-test', 'fixture-docs'];
const fixture = () => ({
  selection: { organization: 'fixture-org-alpha', repository: 'fixture-repo-demo' },
  repositories: [{ id: 'fixture-repo-demo', organization: 'fixture-org-alpha', visibility: 'private',
    branchState: 'available', branches: ['fixture-main', 'fixture-develop'], defaultBranch: 'fixture-main' }],
});
function safe(result) {
  assert.ok(result, 'planner must return a plan');
  assert.equal(result.evidenceTier, 'SIMULATED');
  assert.equal(result.fixtureOnly, true);
  assert.equal(result.nextStep, 'manual');
  for (const key of ['accountVerified', 'permissionsVerified', 'executionAuthorized', 'approvalGranted',
    'trustedContinuingContext', 'effectsEnabled', 'creationAuthorized', 'targetVerified', 'baseShaVerified']) {
    assert.equal(result[key], false, key);
  }
  assert.equal(result.baseCommitSha, null);
  assert.equal(result.requiresIndependentTargetVerification, true);
  assert.equal(result.requiresIndependentBaseShaVerification, true);
  assert.equal(result.potentialOperation, result.outcome === 'AWAITING_VERIFIED_BASE_SHA' ? 'CREATE_BRANCH' : null);
  assert.ok(Object.isFrozen(result));
  assert.ok(Object.isFrozen(result.defaultBranch));
  assert.ok(Object.isFrozen(result.targetBranch));
  const text = JSON.stringify(result);
  assert.ok(text.length <= 1024, 'fixed-size output');
  assert.match(text, /^[\x20-\x7e]+$/);
  assert.doesNotMatch(text, /SECRET|fixture-|password|stack|[a-f0-9]{40}|git\s|https?:/);
  return result;
}
function plan(value = fixture(), target = 'fixture-test') {
  return safe(planFixtureBranchCreation(JSON.stringify(value), target));
}
function outcome(result, expected, reason) {
  assert.equal(result.outcome, expected);
  assert.equal(result.reason, reason);
}

test('existing nondefault target needs no action or overwrite', () => {
  const r = plan(fixture(), 'fixture-develop');
  outcome(r, 'NO_ACTION', 'target_already_exists');
  assert.deepEqual(r.defaultBranch, { state: 'existing' });
  assert.deepEqual(r.targetBranch, { state: 'existing' });
});
test('missing target with existing default only awaits independently verified base SHA', () => {
  const r = plan();
  outcome(r, 'AWAITING_VERIFIED_BASE_SHA', 'verified_base_sha_required');
  assert.deepEqual(r.defaultBranch, { state: 'existing' });
  assert.deepEqual(r.targetBranch, { state: 'missing' });
  assert.equal(r.defaultBranchAsNewTarget, false);
});
for (const name of names) {
  test(`default ${name} cannot be recreated even though it exists`, () => {
    const f = fixture(); Object.assign(f.repositories[0], { branches: [name], defaultBranch: name });
    const r = plan(f, name);
    outcome(r, 'BLOCKED', 'default_branch_protected');
    assert.equal(r.defaultBranchAsNewTarget, true);
  });
}
test('empty repository cannot supply a base or bootstrap a default', () => {
  const f = fixture(); Object.assign(f.repositories[0], { branches: [], defaultBranch: null });
  for (const target of ['fixture-main', 'fixture-test']) {
    const r = plan(f, target);
    outcome(r, 'BLOCKED', 'default_branch_missing');
    assert.deepEqual(r.defaultBranch, { state: 'missing' });
    assert.deepEqual(r.targetBranch, { state: 'missing' });
  }
});
for (const state of ['unknown', 'unavailable', 'unsupported']) {
  test(`${state} discovery requires review without inferring missing branches`, () => {
    const f = fixture(); Object.assign(f.repositories[0], { branchState: state, branches: [], defaultBranch: null });
    const r = plan(f);
    outcome(r, 'MANUAL_REVIEW', `fixture_branches_${state}`);
    assert.deepEqual(r.defaultBranch, { state });
    assert.deepEqual(r.targetBranch, { state });
    assert.equal(r.defaultBranchAsNewTarget, null);
  });
  test(`${state} discovery with branch data is conflicting`, () => {
    const f = fixture(); f.repositories[0].branchState = state;
    outcome(plan(f), 'MANUAL_REVIEW', 'ambiguous_fixture');
  });
}
for (const [label, change, expected, reason] of [
  ['absent default', f => { f.repositories[0].defaultBranch = 'fixture-test'; }, 'MANUAL_REVIEW', 'ambiguous_fixture'],
  ['null default with branches', f => { f.repositories[0].defaultBranch = null; }, 'MANUAL_REVIEW', 'ambiguous_fixture'],
  ['empty branches with declared default', f => { f.repositories[0].branches = []; }, 'MANUAL_REVIEW', 'ambiguous_fixture'],
  ['duplicate branches', f => { f.repositories[0].branches.push('fixture-main'); }, 'MANUAL_REVIEW', 'ambiguous_fixture'],
  ['duplicate repositories', f => { f.repositories.push(f.repositories[0]); }, 'MANUAL_REVIEW', 'ambiguous_fixture'],
  ['missing repository', f => { f.repositories = []; }, 'MANUAL_REVIEW', 'repository_missing'],
  ['ownership mismatch', f => { f.repositories[0].organization = 'fixture-org-other'; }, 'MANUAL_REVIEW', 'ownership_mismatch'],
  ['malformed unselected repository', f => { f.repositories.push({ id: 'SECRET' }); }, 'BLOCKED', 'invalid_fixture'],
  ['excess branches', f => { f.repositories[0].branches = names; }, 'BLOCKED', 'invalid_fixture'],
  ['extra authority field', f => { f.executionAuthorized = true; }, 'BLOCKED', 'invalid_fixture'],
  ['caller base SHA', f => { f.repositories[0].sha = 'a'.repeat(40); }, 'BLOCKED', 'invalid_fixture'],
]) {
  test(`${label} never yields a potential operation`, () => {
    const f = fixture(); change(f);
    for (const target of ['fixture-main', 'fixture-develop', 'fixture-test']) outcome(plan(f, target), expected, reason);
  });
}
for (const visibility of ['private', 'public', 'internal', 'unknown', 'unavailable', 'unsupported']) {
  test(`visibility ${visibility} supplies no execution authority`, () => {
    const f = fixture(); f.repositories[0].visibility = visibility;
    outcome(plan(f), 'AWAITING_VERIFIED_BASE_SHA', 'verified_base_sha_required');
  });
}
for (const target of ['', 'main', 'fixture-Main', 'fixture-main\n', 'fixture-é', 'SECRET',
  'fixture-feature-aa', 'refs/heads/fixture-main', '--force', 'a'.repeat(3073),
  null, undefined, 1, true, {}, [], 1n, Symbol('SECRET')]) {
  test(`invalid target ${typeof target} / ${typeof target === 'string' ? target.slice(0, 24) : ''} is blocked`, () => {
    const r = safe(planFixtureBranchCreation(JSON.stringify(fixture()), target));
    outcome(r, 'BLOCKED', 'invalid_target');
    assert.deepEqual(r.targetBranch, { state: 'invalid' });
  });
}
test('invalid fixture takes precedence over invalid target', () => {
  outcome(safe(planFixtureBranchCreation('{}', 'SECRET')), 'BLOCKED', 'invalid_fixture');
});
test('malformed, noncanonical, oversized and deep text is rejected without echo', () => {
  const text = JSON.stringify(fixture());
  for (const bad of ['', '{', '{}', text + ' ', text.replace('fixture-main', 'fixture\\u002dmain'),
    text.replace('"visibility":"private"', '"visibility":"public","visibility":"private"'),
    'SECRET'.repeat(100000), '['.repeat(1500) + '0' + ']'.repeat(1500)]) {
    outcome(safe(planFixtureBranchCreation(bad, 'fixture-test')), 'BLOCKED', 'invalid_fixture');
  }
});
test('caller inspection summaries are never accepted as fixture evidence', () => {
  const inspection = inspectFixtureBranches(JSON.stringify(fixture()), 'fixture-test');
  for (const summary of [inspection, { ...inspection, executionAuthorized: true, baseCommitSha: 'a'.repeat(40) },
    { outcome: 'AWAITING_VERIFIED_BASE_SHA', defaultBranch: { state: 'existing' }, targetBranch: { state: 'missing' } }]) {
    outcome(safe(planFixtureBranchCreation(summary, 'fixture-test')), 'BLOCKED', 'invalid_fixture');
    outcome(safe(planFixtureBranchCreation(JSON.stringify(summary), 'fixture-test')), 'BLOCKED', 'invalid_fixture');
  }
});
test('hostile objects never invoke hooks, getters, proxies or coercion', () => {
  let calls = 0; const hook = () => { calls++; throw new Error('SECRET'); };
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const cycle = {}; cycle.self = cycle;
  const bad = [new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook }), revoked.proxy,
    { toJSON: hook, toString: hook, [Symbol.toPrimitive]: hook, get defaultBranch() { return hook(); } },
    cycle, new String('fixture-main'), hook, new Proxy(hook, { apply: hook }), null, undefined, true, 1, 1n, Symbol('SECRET')];
  for (const value of bad) {
    outcome(safe(planFixtureBranchCreation(value, 'fixture-test')), 'BLOCKED', 'invalid_fixture');
    outcome(safe(planFixtureBranchCreation(JSON.stringify(fixture()), value)), 'BLOCKED', 'invalid_target');
  }
  assert.equal(calls, 0);
});
for (const size of [3071, 3072, 3073]) {
  test(`fixture input byte boundary ${size} is enforced through inspection`, () => {
    const f = fixture();
    const item = { ...f.repositories[0], branches: [], defaultBranch: null };
    f.repositories.push(...Array.from({ length: 15 }, (_, i) => ({ ...item, id: `fixture-repo-a${i}` })));
    for (const row of f.repositories.slice(1)) for (const field of ['id', 'organization']) {
      const extra = Math.min(size - JSON.stringify(f).length, 32 - row[field].split('-').at(-1).length);
      if (extra > 0) row[field] += 'a'.repeat(extra);
    }
    assert.equal(JSON.stringify(f).length, size);
    outcome(plan(f), size > 3072 ? 'BLOCKED' : 'AWAITING_VERIFIED_BASE_SHA',
      size > 3072 ? 'invalid_fixture' : 'verified_base_sha_required');
  });
}
test('maximum branch set stays bounded, immutable and deterministic without altering input', () => {
  const f = fixture(); f.repositories[0].branches = names.slice(0, 8);
  const before = JSON.stringify(f); const result = plan(f, 'fixture-docs');
  outcome(result, 'AWAITING_VERIFIED_BASE_SHA', 'verified_base_sha_required');
  for (let i = 0; i < 20; i++) assert.deepEqual(plan(f, 'fixture-docs'), result);
  assert.equal(JSON.stringify(f), before);
  assert.throws(() => { result.effectsEnabled = true; }, TypeError);
  assert.throws(() => { result.baseCommitSha = 'a'.repeat(40); }, TypeError);
  assert.throws(() => { result.defaultBranch.state = 'missing'; }, TypeError);
  assert.throws(() => { result.targetBranch.state = 'existing'; }, TypeError);
});
test('planning preserves inspection behavior and uncertainty for every outcome', () => {
  for (const target of ['fixture-main', 'fixture-develop', 'fixture-test', 'SECRET']) {
    const text = JSON.stringify(fixture()); const before = inspectFixtureBranches(text, target);
    const r = safe(planFixtureBranchCreation(text, target));
    assert.deepEqual(inspectFixtureBranches(text, target), before);
    for (const key of Object.keys(before).filter(key => key !== 'reason')) assert.deepEqual(r[key], before[key]);
  }
});
test('no network, browser or storage capability is accessed on any outcome', () => {
  const keys = ['fetch', 'XMLHttpRequest', 'WebSocket', 'chrome', 'browser', 'localStorage', 'sessionStorage', 'indexedDB'];
  const descriptors = keys.map(k => Object.getOwnPropertyDescriptor(globalThis, k)); let calls = 0;
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, get() { calls++; throw new Error('SECRET'); } });
    plan(); plan(fixture(), 'fixture-main'); plan(fixture(), 'fixture-develop'); plan(fixture(), 'SECRET');
    const f = fixture(); f.repositories = []; plan(f);
    safe(planFixtureBranchCreation('{}', 'fixture-main'));
    assert.equal(calls, 0);
  } finally {
    keys.forEach((k, i) => descriptors[i] ? Object.defineProperty(globalThis, k, descriptors[i]) : delete globalThis[k]);
  }
});
test('standalone planner imports only inspection and has no product callers or execution capabilities', () => {
  const source = readFileSync(new URL('../src/github/branch-creation-plan.mjs', import.meta.url), 'utf8');
  assert.deepEqual([...source.matchAll(/\bimport\s+[^;]+;/g)].map(match => match[0]),
    ["import { inspectFixtureBranches } from './branch-inspection.mjs';"]);
  assert.doesNotMatch(source, /\b(?:require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function)\s*(?:[.(]|\{|'|"|\*)/);
  assert.doesNotMatch(source, /\bimport\s*\(|\bexport\s+.*\bfrom\s|node:|child_process|https?:|git\s+(?:branch|checkout|switch|push|update-ref)/);
  for (const file of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true })) {
    if (file.isFile() && /\.(mjs|js|html)$/.test(file.name) && file.name !== 'branch-creation-plan.mjs') {
      assert.doesNotMatch(readFileSync(`${file.parentPath}/${file.name}`, 'utf8'), /branch-creation-plan|planFixtureBranchCreation/);
    }
  }
});
