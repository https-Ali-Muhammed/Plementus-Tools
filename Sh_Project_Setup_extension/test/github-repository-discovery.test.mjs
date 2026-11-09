import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { readFixtureRepositoryMetadata } from '../src/github/repository-discovery.mjs';

const names = ['fixture-main', 'fixture-develop', 'fixture-staging', 'fixture-release',
  'fixture-feature-a', 'fixture-feature-b', 'fixture-hotfix', 'fixture-test', 'fixture-docs'];
const visibilities = ['private', 'public', 'internal', 'unknown', 'unavailable', 'unsupported'];
const states = ['available', 'unknown', 'unavailable', 'unsupported'];
const fixture = () => ({
  selection: { organization: 'fixture-org-alpha', repository: 'fixture-repo-demo' },
  repositories: [{ id: 'fixture-repo-demo', organization: 'fixture-org-alpha', visibility: 'private',
    branchState: 'available', branches: ['fixture-main'], defaultBranch: 'fixture-main' }],
});
const encode = value => JSON.stringify(value);
const read = value => safe(readFixtureRepositoryMetadata(encode(value)));
function safe(result) {
  assert.equal(result.evidenceTier, 'SIMULATED');
  assert.equal(result.fixtureOnly, true);
  assert.equal(result.nextStep, 'manual');
  for (const flag of ['accountVerified', 'executionAuthorized', 'approvalGranted', 'trustedContinuingContext']) {
    assert.equal(result[flag], false);
  }
  function frozen(value) {
    assert.ok(Object.isFrozen(value));
    for (const item of Object.values(value)) if (item && typeof item === 'object') frozen(item);
  }
  frozen(result);
  const text = encode(result);
  assert.match(text, /^[\x20-\x7e]+$/);
  assert.ok(Buffer.byteLength(text) <= 1024);
  assert.doesNotMatch(text, /fixture-org-|fixture-repo-|SECRET|Error|stack|token|password/);
  assert.deepEqual(Object.keys(result), ['evidenceTier', 'fixtureOnly', 'accountVerified',
    'executionAuthorized', 'approvalGranted', 'trustedContinuingContext', 'nextStep', 'visibility', 'branchDiscovery']);
  return result;
}
function invalid(text, reason = 'invalid_fixture') {
  const result = safe(readFixtureRepositoryMetadata(text));
  assert.deepEqual(result.visibility, { state: 'unknown', reason });
  assert.deepEqual(result.branchDiscovery, { state: 'unknown', reason, branches: [], defaultBranch: null });
}

for (const visibility of visibilities) for (const branchState of states) {
  test(`${visibility} visibility / ${branchState} discovery: independent synthetic declarations`, () => {
    const value = fixture(); Object.assign(value.repositories[0], { visibility, branchState });
    if (branchState !== 'available') Object.assign(value.repositories[0], { branches: [], defaultBranch: null });
    const result = read(value);
    assert.deepEqual(result.visibility, { state: visibility, reason: `fixture_${visibility}` });
    assert.deepEqual(result.branchDiscovery, { state: branchState, reason: `fixture_branches_${branchState}`,
      branches: branchState === 'available' ? ['fixture-main'] : [],
      defaultBranch: branchState === 'available' ? 'fixture-main' : null });
  });
}
for (const count of [0, 1, 7, 8, 9]) {
  test(`branch count boundary ${count}`, () => {
    const value = fixture(); const item = value.repositories[0];
    item.branches = names.slice(0, count); item.defaultBranch = count ? item.branches.at(-1) : null;
    if (count > 8) invalid(encode(value));
    else {
      const result = read(value);
      assert.deepEqual(result.branchDiscovery, { state: 'available',
        reason: count ? 'fixture_branches_available' : 'fixture_branches_empty',
        branches: item.branches, defaultBranch: item.defaultBranch });
    }
  });
}
for (const name of names) {
  test(`allowlisted branch ${name}`, () => {
    const value = fixture(); Object.assign(value.repositories[0], { branches: [name], defaultBranch: name });
    assert.deepEqual(read(value).branchDiscovery.branches, [name]);
  });
}
test('exact target selection does not return first catalog entry', () => {
  const value = fixture(); value.repositories.unshift({ ...value.repositories[0], id: 'fixture-repo-other', visibility: 'public' });
  assert.equal(read(value).visibility.state, 'private');
});
test('missing selected repository is redacted', () => {
  const value = fixture(); value.repositories = []; invalid(encode(value), 'repository_missing');
  value.repositories = [{ ...fixture().repositories[0], id: 'fixture-repo-other' }];
  invalid(encode(value), 'repository_missing');
});
test('wrong organization is redacted and cannot expose branches', () => {
  const value = fixture(); value.repositories[0].organization = 'fixture-org-other';
  invalid(encode(value), 'ownership_mismatch');
});
for (const change of [{}, { visibility: 'public' }, { organization: 'fixture-org-other' }]) {
  test(`duplicate repository ID rejects ambiguity ${encode(change)}`, () => {
    const value = fixture(); value.repositories.push({ ...value.repositories[0], ...change });
    invalid(encode(value), 'ambiguous_fixture');
  });
}
test('duplicate branches reject the entire fixture', () => {
  const value = fixture(); value.repositories[0].branches.push('fixture-main');
  invalid(encode(value), 'ambiguous_fixture');
});
test('nonempty available branches require a member default', () => {
  for (const defaultBranch of [null, 'fixture-develop']) {
    const value = fixture(); value.repositories[0].defaultBranch = defaultBranch;
    invalid(encode(value), 'ambiguous_fixture');
  }
});
test('empty available branches require null default', () => {
  const value = fixture(); value.repositories[0].branches = [];
  invalid(encode(value), 'ambiguous_fixture');
});
for (const state of states.slice(1)) {
  test(`${state} forbids retained branch data/default`, () => {
    for (const [branches, defaultBranch] of [[['fixture-main'], 'fixture-main'], [['fixture-main'], null], [[], 'fixture-main']]) {
      const value = fixture(); Object.assign(value.repositories[0], { branchState: state, branches, defaultBranch });
      invalid(encode(value), 'ambiguous_fixture');
    }
  });
}
const locations = value => [value, value.selection, value.repositories[0]];
for (let location = 0; location < 3; location++) {
  test(`closed schema ${location}: every missing key, extra key and unsafe key`, () => {
    for (const field of Object.keys(locations(fixture())[location])) {
      const value = fixture(); delete locations(value)[location][field]; invalid(encode(value));
    }
    for (const field of ['extra', '__proto__', 'constructor', 'prototype', 'toJSON', 'toString', 'valueOf', 'permissions', 'accountVerified']) {
      const value = fixture(); Object.defineProperty(locations(value)[location], field, { value: 'SECRET', enumerable: true });
      invalid(encode(value));
    }
  });
}
test('all record and array positions reject malformed container types', () => {
  for (const wrong of [null, false, 1, 'SECRET', {}, []]) {
    invalid(encode(wrong));
    const value = fixture(); value.selection = wrong; invalid(encode(value));
    value.selection = fixture().selection; value.repositories = [wrong]; invalid(encode(value));
  }
  for (const wrong of [null, {}, 'SECRET', false, 1, [null], new Array(2)]) {
    const value = fixture(); value.repositories = wrong; invalid(encode(value));
    const other = fixture(); other.repositories[0].branches = wrong; invalid(encode(other));
  }
});
for (const field of ['visibility', 'branchState', 'defaultBranch']) {
  test(`malformed ${field} enum/type`, () => {
    for (const wrong of ['', 'SECRET', 'AVAILABLE', 'allowed', 1, true, [], {}]) {
      const value = fixture(); value.repositories[0][field] = wrong; invalid(encode(value));
    }
    if (field !== 'defaultBranch') {
      const value = fixture(); value.repositories[0][field] = null; invalid(encode(value));
    }
  });
}
for (const name of ['', 'main', 'fixture-main/secret', 'fixture-main\n', 'fixture-Main', 'fixture-é',
  'fixture-\ud800', 'a'.repeat(16), 'a'.repeat(17), 'fixture-feature-aa', null, 1, true, {}, []]) {
  test(`invalid branch name ${encode(name)}`, () => {
    const value = fixture(); value.repositories[0].branches = [name]; invalid(encode(value));
    const other = fixture(); other.repositories[0].defaultBranch = name;
    if (name === null) invalid(encode(other), 'ambiguous_fixture'); else invalid(encode(other));
  });
}
for (const kind of ['organization', 'repository']) {
  for (const size of [0, 1, 31, 32, 33]) {
    test(`${kind} ID suffix boundary ${size}`, () => {
      const value = fixture(); const id = `fixture-${kind === 'organization' ? 'org' : 'repo'}-${'a'.repeat(size)}`;
      value.selection[kind] = id; value.repositories[0][kind === 'organization' ? 'organization' : 'id'] = id;
      if (size === 0 || size > 32) invalid(encode(value)); else assert.equal(read(value).visibility.state, 'private');
    });
  }
}
test('every identifier position rejects wrong IDs/types and unsafe characters', () => {
  for (const [location, field] of [[1, 'organization'], [1, 'repository'], [2, 'id'], [2, 'organization']]) {
    for (const wrong of ['SECRET', 'fixture-org-A', 'fixture-repo-a/b', 'fixture-org-é', 'fixture-org-a\n',
      'fixture-org-1', 'fixture-repo-\ud800', null, 1, {}, []]) {
      const value = fixture(); locations(value)[location][field] = wrong; invalid(encode(value));
    }
  }
});
for (const count of [0, 1, 15, 16, 17]) {
  test(`repository count boundary ${count}`, () => {
    const value = fixture(); const item = { ...value.repositories[0], branches: [], defaultBranch: null };
    value.repositories = Array.from({ length: count }, (_, i) => ({ ...item, id: i ? `fixture-repo-a${i}` : item.id }));
    assert.ok(encode(value).length <= 3072, 'count test must not be masked by byte cap');
    if (count > 16) invalid(encode(value));
    else if (!count) invalid(encode(value), 'repository_missing');
    else assert.equal(read(value).visibility.state, 'private');
  });
}
for (const size of [3071, 3072, 3073]) {
  test(`canonical ASCII input boundary ${size}`, () => {
    const value = fixture(); const item = { ...value.repositories[0], branches: [], defaultBranch: null };
    value.repositories = Array.from({ length: 16 }, (_, i) => ({ ...item, id: i ? `fixture-repo-a${i}` : item.id }));
    for (const row of value.repositories.slice(1)) for (const field of ['id', 'organization']) {
      const extra = Math.min(size - encode(value).length, 32 - row[field].split('-').at(-1).length);
      if (extra > 0) row[field] += 'a'.repeat(extra);
    }
    assert.equal(encode(value).length, size);
    if (size > 3072) invalid(encode(value)); else assert.equal(read(value).visibility.state, 'private');
  });
}
test('noncanonical JSON, duplicate keys, deep data and non-ASCII are invalid', () => {
  const text = encode(fixture());
  for (const bad of ['', '{', text + ' ', '\n' + text, text.replace('alpha', '\\u0061lpha'),
    text.replace('fixture-main', 'fixture\\u002dmain'), text.replace('alpha', 'α'),
    text.replace('"visibility":"private"', '"visibility":"public","visibility":"private"'),
    text.replace('"selection":', '"repositories":[],"selection":'),
    text.replace('"organization":"fixture-org-alpha"', '"organization":"fixture-org-other","organization":"fixture-org-alpha"'),
    '['.repeat(1500) + '0' + ']'.repeat(1500)]) invalid(bad);
});
test('all unselected malformed/ambiguous records invalidate the catalog', () => {
  for (const change of [{ visibility: 'SECRET' }, { defaultBranch: null }, { branches: ['fixture-main', 'fixture-main'] },
    { branchState: 'unsupported' }, { extra: true }]) {
    const value = fixture(); value.repositories.push({ ...value.repositories[0], id: 'fixture-repo-other', ...change });
    invalid(encode(value), change.visibility || change.extra ? 'invalid_fixture' : 'ambiguous_fixture');
  }
});
test('hostile object/scalar inputs never invoke prototype, Proxy or coercion hooks', () => {
  let calls = 0; const hook = () => { calls++; throw new Error('SECRET'); };
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook, getOwnPropertyDescriptor: hook });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const cycle = {}; cycle.self = cycle;
  for (const value of [fixture(), cycle, Object.create(null), Object.create({ inherited: true }),
    { get selection() { return hook(); } }, { toJSON: hook, toString: hook, valueOf: hook, [Symbol.toPrimitive]: hook },
    { [Symbol('SECRET')]: true }, new String(encode(fixture())), proxy, revoked.proxy,
    undefined, null, true, 1, 1n, Symbol('SECRET'), hook, new Proxy(hook, { apply: hook })]) invalid(value);
  assert.equal(calls, 0);
});
test('immutable sanitized result, repeatable calls, caller data unchanged', () => {
  const value = fixture(); const text = encode(value); const result = read(value);
  for (let i = 0; i < 20; i++) assert.deepEqual(safe(readFixtureRepositoryMetadata(text)), result);
  assert.throws(() => { result.accountVerified = true; }, TypeError);
  assert.throws(() => { result.visibility.state = 'public'; }, TypeError);
  assert.throws(() => { result.branchDiscovery.defaultBranch = null; }, TypeError);
  assert.throws(() => result.branchDiscovery.branches.push('fixture-test'), TypeError);
  assert.equal(encode(value), text);
  Object.freeze(value); invalid(value); assert.equal(encode(value), text);
});
test('maximum branch output remains bounded for all declarations/defaults', () => {
  const branches = [...names].sort((a, b) => b.length - a.length).slice(0, 8);
  for (const visibility of visibilities) for (const defaultBranch of branches) {
    const value = fixture(); Object.assign(value.repositories[0], { visibility, branches, defaultBranch });
    const result = read(value); assert.deepEqual(result.branchDiscovery.branches, branches);
  }
});
test('import-free module has no external capability or product dependency', () => {
  const source = readFileSync(new URL('../src/github/repository-discovery.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:import|require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function)\s*(?:[.(]|\{|'|"|\*)/);
  for (const file of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true })) {
    if (file.isFile() && /\.(mjs|js|html)$/.test(file.name) && file.name !== 'repository-discovery.mjs') {
      assert.doesNotMatch(readFileSync(`${file.parentPath}/${file.name}`, 'utf8'), /repository-discovery|readFixtureRepositoryMetadata/);
    }
  }
  const keys = ['fetch', 'chrome', 'browser', 'localStorage', 'sessionStorage', 'indexedDB'];
  const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key)); let accesses = 0;
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, get() { accesses++; throw new Error('SECRET'); } });
    read(fixture()); invalid('{}'); assert.equal(accesses, 0);
  } finally {
    keys.forEach((key, i) => descriptors[i] ? Object.defineProperty(globalThis, key, descriptors[i]) : delete globalThis[key]);
  }
});
