import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { previewFixtureRepositoryCreation as preview } from '../src/github/repository-create-preview.mjs';

const encode = JSON.stringify;
const suffixes = ['alpha', 'beta', 'gamma', 'delta'];
const permissions = ['allowed', 'denied', 'unknown', 'unavailable', 'unsupported'];
const visibilities = ['private', 'public', 'internal', 'unknown', 'unavailable', 'unsupported'];
const accountStates = ['current', 'stale', 'unknown', 'unavailable', 'unsupported'];
const repositoryStates = ['new', 'existing', 'unknown', 'unavailable', 'unsupported'];
const operations = ['create-new', 'select-existing', 'unknown', 'unsupported'];
const fixture = () => ({
  selection: { account: 'fixture-account-alpha', organization: 'fixture-org-alpha',
    repository: 'fixture-repo-alpha', operation: 'create-new', visibility: 'private' },
  accounts: [{ id: 'fixture-account-alpha', state: 'current' }],
  organizations: [{ id: 'fixture-org-alpha', account: 'fixture-account-alpha', createPermission: 'allowed' }],
  repositories: [{ id: 'fixture-repo-alpha', organization: 'fixture-org-alpha', name: 'fixture-name-alpha',
    state: 'new', visibility: 'private', readPermission: 'unknown' }],
});
function existing(value = fixture()) {
  value.selection.operation = 'select-existing';
  Object.assign(value.repositories[0], { state: 'existing', readPermission: 'allowed' });
  return value;
}
const locations = value => [value, value.selection, ...value.accounts, ...value.organizations, ...value.repositories];
function safe(result) {
  assert.ok(result && typeof result === 'object', 'preview must return the non-authorizing envelope');
  assert.deepEqual(Object.keys(result), ['evidenceTier', 'fixtureOnly', 'accountVerified',
    'executionAuthorized', 'approvalGranted', 'trustedContinuingContext', 'nextStep', 'outcome', 'reason', 'preview']);
  assert.equal(result.evidenceTier, 'SIMULATED');
  assert.equal(result.fixtureOnly, true);
  assert.equal(result.nextStep, 'manual');
  for (const flag of ['accountVerified', 'executionAuthorized', 'approvalGranted', 'trustedContinuingContext']) {
    assert.equal(result[flag], false);
  }
  assert.ok(Object.isFrozen(result));
  if (result.preview !== null) {
    assert.ok(Object.isFrozen(result.preview));
    assert.deepEqual(Object.keys(result.preview), ['operation', 'account', 'organization', 'repository', 'name', 'visibility']);
    assert.ok(['create-new', 'select-existing'].includes(result.preview.operation));
    assert.equal(result.preview.visibility, 'private');
    for (const [field, prefix] of [['account', 'account'], ['organization', 'org'], ['repository', 'repo'], ['name', 'name']]) {
      assert.ok(suffixes.map(s => `fixture-${prefix}-${s}`).includes(result.preview[field]));
    }
  }
  const text = encode(result);
  assert.match(text, /^[\x20-\x7e]+$/);
  assert.ok(Buffer.byteLength(text) <= 768);
  assert.doesNotMatch(text, /SECRET|Error|stack|https?:|github\.com|password|token|Authorization|curl|fetch|approvalRef/);
  return result;
}
function check(value, outcome = 'MANUAL_ONLY', reason = 'invalid_fixture', raw = false) {
  const result = safe(preview(raw ? value : encode(value)));
  assert.equal(result.outcome, outcome);
  assert.equal(result.reason, reason);
  if (!['PRIVATE_CREATION_PREVIEW', 'EXISTING_SELECTION_PREVIEW'].includes(outcome)) assert.equal(result.preview, null);
  return result;
}
function positive(value = fixture()) {
  const selecting = value.selection.operation === 'select-existing';
  return check(value, selecting ? 'EXISTING_SELECTION_PREVIEW' : 'PRIVATE_CREATION_PREVIEW',
    selecting ? 'synthetic_existing_selection_only' : 'synthetic_private_creation_only');
}

test('private creation displays the exact synthetic target without granting authority', () => {
  assert.deepEqual(positive().preview, { operation: 'create-new', account: 'fixture-account-alpha',
    organization: 'fixture-org-alpha', repository: 'fixture-repo-alpha', name: 'fixture-name-alpha', visibility: 'private' });
});
test('existing selection displays selection, never creation, even when org creation is denied', () => {
  const value = existing(); value.organizations[0].createPermission = 'denied';
  assert.deepEqual(positive(value).preview, { operation: 'select-existing', account: 'fixture-account-alpha',
    organization: 'fixture-org-alpha', repository: 'fixture-repo-alpha', name: 'fixture-name-alpha', visibility: 'private' });
});
test('exact binding selects the requested account/org/repo rather than the first record', () => {
  const value = fixture();
  value.accounts.unshift({ id: 'fixture-account-beta', state: 'stale' });
  value.organizations.unshift({ id: 'fixture-org-beta', account: 'fixture-account-beta', createPermission: 'denied' });
  value.repositories.unshift({ ...value.repositories[0], id: 'fixture-repo-beta', organization: 'fixture-org-beta' });
  assert.equal(positive(value).preview.repository, 'fixture-repo-alpha');
  value.selection.account = 'fixture-account-beta'; check(value, 'MANUAL_ONLY', 'account_mismatch');
  value.selection.organization = 'fixture-org-beta'; check(value, 'MANUAL_ONLY', 'organization_mismatch');
});
for (const permission of permissions) for (const mode of ['new', 'existing']) {
  test(`${mode} relevant permission ${permission} remains synthetic`, () => {
    const value = mode === 'new' ? fixture() : existing();
    if (mode === 'new') value.organizations[0].createPermission = permission;
    else value.repositories[0].readPermission = permission;
    if (permission === 'allowed') positive(value);
    else check(value, permission === 'denied' ? 'BLOCKED' : 'MANUAL_ONLY', `fixture_permission_${permission}`);
  });
}
for (const permission of permissions) {
  test(`existing selection does not adopt org creation permission ${permission}`, () => {
    const value = existing(); value.organizations[0].createPermission = permission; positive(value);
  });
}
for (const desired of visibilities) for (const declared of visibilities) {
  test(`desired ${desired} versus declared ${declared} visibility`, () => {
    for (const value of [fixture(), existing()]) {
      value.selection.visibility = desired; value.repositories[0].visibility = declared;
      if (desired !== declared) check(value, 'MANUAL_ONLY', 'inconsistent_fixture');
      else if (desired === 'private') positive(value);
      else if (desired === 'public') check(value, 'BLOCKED', 'public_visibility_blocked');
      else check(value, 'MANUAL_ONLY', `fixture_visibility_${desired}`);
    }
  });
}
for (const state of accountStates) {
  test(`account declaration ${state} cannot verify identity or freshness`, () => {
    const value = fixture(); value.accounts[0].state = state;
    if (state === 'current') positive(value); else check(value, 'MANUAL_ONLY', `fixture_account_${state}`);
  });
}
for (const operation of operations) for (const state of repositoryStates) {
  test(`operation ${operation} with repository declaration ${state}`, () => {
    const value = fixture(); value.selection.operation = operation; value.repositories[0].state = state;
    if (state === 'existing') value.repositories[0].readPermission = 'allowed';
    if (operation === 'unknown') check(value, 'MANUAL_ONLY', 'operation_ambiguous');
    else if (operation === 'unsupported') check(value, 'MANUAL_ONLY', 'operation_unsupported');
    else if (!['new', 'existing'].includes(state)) check(value, 'MANUAL_ONLY', `fixture_repository_${state}`);
    else if ((operation === 'create-new') !== (state === 'new')) check(value, 'MANUAL_ONLY', 'inconsistent_fixture');
    else positive(value);
  });
}
for (const [collection, selection, missing] of [['accounts', 'account', 'account_missing'],
  ['organizations', 'organization', 'organization_missing'], ['repositories', 'repository', 'repository_missing']]) {
  test(`missing ${selection} record or selection cannot produce a target`, () => {
    const value = fixture(); value[collection] = []; check(value, 'MANUAL_ONLY', missing);
    const absent = fixture(); absent.selection[selection] = `fixture-${selection === 'organization' ? 'org' : selection === 'repository' ? 'repo' : 'account'}-delta`;
    check(absent, 'MANUAL_ONLY', missing);
    const noSelection = fixture(); delete noSelection.selection[selection]; check(noSelection);
  });
}
for (const collection of ['accounts', 'organizations', 'repositories']) {
  test(`identical or conflicting duplicate ${collection} IDs invalidate all records`, () => {
    const value = fixture(); value[collection].push({ ...value[collection][0] });
    check(value, 'MANUAL_ONLY', 'inconsistent_fixture');
    const duplicate = value[collection][1];
    if (collection === 'accounts') duplicate.state = 'stale';
    if (collection === 'organizations') duplicate.account = 'fixture-account-beta';
    if (collection === 'repositories') duplicate.organization = 'fixture-org-beta';
    check(value, 'MANUAL_ONLY', 'inconsistent_fixture');
  });
}
test('unselected orphan ownership declarations invalidate the entire catalog', () => {
  const account = fixture(); account.organizations.push({ ...account.organizations[0], id: 'fixture-org-beta', account: 'fixture-account-beta' });
  check(account, 'MANUAL_ONLY', 'account_missing');
  const org = fixture(); org.repositories.push({ ...org.repositories[0], id: 'fixture-repo-beta', organization: 'fixture-org-beta' });
  check(org, 'MANUAL_ONLY', 'organization_missing');
});
for (const permission of permissions.filter(p => p !== 'unknown')) {
  test(`new entry with ${permission} read declaration is inconsistent even if unselected`, () => {
    const value = fixture(); value.repositories[0].readPermission = permission;
    check(value, 'MANUAL_ONLY', 'inconsistent_fixture');
    value.repositories.unshift(fixture().repositories[0]); value.repositories[1].id = 'fixture-repo-beta';
    value.repositories[1].name = 'fixture-name-beta'; check(value, 'MANUAL_ONLY', 'inconsistent_fixture');
  });
}
test('existing-name collision blocks creation and unselected collisions block the whole catalog', () => {
  const value = fixture(); value.repositories.push({ ...existing().repositories[0], id: 'fixture-repo-beta' });
  check(value, 'BLOCKED', 'repository_collision');
  value.repositories[0].name = 'fixture-name-beta'; positive(value);
  value.repositories.push({ ...value.repositories[1], id: 'fixture-repo-gamma' });
  check(value, 'BLOCKED', 'repository_collision');
});
test('same name in different organizations is not a collision', () => {
  const value = fixture(); value.organizations.push({ ...value.organizations[0], id: 'fixture-org-beta' });
  value.repositories.push({ ...value.repositories[0], id: 'fixture-repo-beta', organization: 'fixture-org-beta' });
  positive(value);
});
test('schema validation precedes collision, missing selection and unsupported operations', () => {
  const value = fixture(); value.repositories.push({ ...value.repositories[0], id: 'fixture-repo-beta', extra: 'SECRET' });
  value.selection.operation = 'unsupported'; value.selection.account = 'fixture-account-delta'; check(value);
});

const fieldSets = locations(fixture()).map(value => Object.keys(value));
for (const [index, fields] of fieldSets.entries()) for (const field of fields) {
  test(`record ${index} requires ${field} with the documented type and no duplicate keys`, () => {
    const missing = fixture(); delete locations(missing)[index][field]; check(missing);
    for (const wrong of [null, true, 1, [], {}, 'SECRET']) {
      const value = fixture(); locations(value)[index][field] = wrong;
      // Empty catalogs are valid shapes with a missing-target outcome, tested separately.
      if (index === 0 && ['accounts', 'organizations', 'repositories'].includes(field) && Array.isArray(wrong)) continue;
      check(value);
    }
    const text = encode(fixture()); const token = `${encode(field)}:${encode(locations(fixture())[index][field])}`;
    assert.ok(text.includes(token)); check(text.replace(token, `${token},${token}`), 'MANUAL_ONLY', 'invalid_fixture', true);
  });
}
for (let index = 0; index < fieldSets.length; index++) {
  test(`record ${index} rejects unknown and authority/coercion/prototype fields`, () => {
    for (const field of ['extra', '__proto__', 'constructor', 'prototype', 'toJSON', 'toString', 'valueOf',
      'accountVerified', 'approvalGranted', 'executionAuthorized', 'trustedContinuingContext', 'url', 'token', 'timestamp', 'revision']) {
      const value = fixture(); Object.defineProperty(locations(value)[index], field, { value: 'SECRET', enumerable: true }); check(value);
    }
  });
}
for (const index of [2, 3, 4]) {
  test(`unselected record ${index} must have a valid complete schema`, () => {
    const value = fixture(); const collection = ['accounts', 'organizations', 'repositories'][index - 2];
    const good = { ...value[collection][0], id: value[collection][0].id.replace('alpha', 'beta') };
    if (index === 4) good.name = 'fixture-name-beta';
    value[collection].push(good); positive(value);
    for (const field of fieldSets[index]) {
      const bad = structuredClone(value); delete bad[collection][1][field]; check(bad);
      const mistyped = structuredClone(value); mistyped[collection][1][field] = 'SECRET'; check(mistyped);
    }
    good.extra = true; check(value);
  });
}
const identifiers = [[1, 'account'], [1, 'organization'], [1, 'repository'], [2, 'id'], [3, 'id'], [3, 'account'],
  [4, 'id'], [4, 'organization'], [4, 'name']];
for (const [index, field] of identifiers) {
  test(`identifier ${index}.${field} rejects free text, near matches and length overflow`, () => {
    for (const wrong of ['', 'a', 'My-Org', 'fixture-org-realcompany', 'fixture-account-alphaX', 'fixture-repo-alpha/',
      'fixture-name-ALPHA', 'fixture-name-α', 'fixture-name-alpha\n', 'fixture-name-alph', 'x'.repeat(21), 'x'.repeat(22), 'x'.repeat(4097)]) {
      const value = fixture(); locations(value)[index][field] = wrong; check(value);
    }
  });
}
for (const suffix of suffixes) {
  test(`exact allowlisted ${suffix} identifiers bind and display safely`, () => {
    const text = encode(fixture()).replaceAll('alpha', suffix);
    const result = safe(preview(text)); assert.equal(result.outcome, 'PRIVATE_CREATION_PREVIEW');
    assert.equal(result.preview.account, `fixture-account-${suffix}`);
    assert.equal(result.preview.organization, `fixture-org-${suffix}`);
    assert.equal(result.preview.repository, `fixture-repo-${suffix}`);
    assert.equal(result.preview.name, `fixture-name-${suffix}`);
  });
}
for (const collection of ['accounts', 'organizations', 'repositories']) for (const count of [0, 1, 2, 3, 4]) {
  test(`${collection} count boundary ${count}`, () => {
    const value = fixture(); const first = value[collection][0];
    value[collection] = suffixes.slice(0, count).map(s => ({ ...first, id: first.id.replace('alpha', s),
      ...(collection === 'repositories' ? { name: `fixture-name-${s}` } : {}) }));
    assert.ok(encode(value).length < 4096);
    if (count === 4) check(value);
    else if (count === 0) check(value, 'MANUAL_ONLY', collection === 'accounts' ? 'account_missing' : collection === 'organizations' ? 'organization_missing' : 'repository_missing');
    else positive(value);
  });
}
for (const size of [0, 1, 4095, 4096, 4097]) {
  test(`raw input boundary ${size} rejects padding without leaking text`, () => {
    const text = size < 2 ? 'x'.repeat(size) : '"' + 'x'.repeat(size - 2) + '"';
    assert.equal(Buffer.byteLength(text), size); check(text, 'MANUAL_ONLY', 'invalid_fixture', true);
  });
}
test('maximum-count longest-value schema fits cap; valid fixtures cannot pad to the raw cap', () => {
  const value = fixture(); value.selection.operation = 'select-existing'; value.selection.visibility = 'unsupported';
  value.accounts = suffixes.slice(0, 3).map(s => ({ id: `fixture-account-${s}`, state: 'unsupported' }));
  value.organizations = suffixes.slice(0, 3).map(s => ({ id: `fixture-org-${s}`, account: 'fixture-account-alpha', createPermission: 'unsupported' }));
  value.repositories = suffixes.slice(0, 3).map(s => ({ id: `fixture-repo-${s}`, organization: 'fixture-org-alpha',
    name: `fixture-name-${s}`, state: 'unsupported', visibility: 'unsupported', readPermission: 'unsupported' }));
  assert.ok(encode(value).length < 4095); check(value, 'MANUAL_ONLY', 'fixture_account_unsupported');
  value.selection.operation = 'create-new'; value.selection.visibility = 'private';
  for (const item of value.accounts) item.state = 'current';
  for (const item of value.organizations) item.createPermission = 'allowed';
  for (const item of value.repositories) Object.assign(item, { state: 'new', visibility: 'private', readPermission: 'unknown' });
  positive(value);
});
test('malformed, duplicate, escaped, noncanonical and deeply nested JSON fails closed', () => {
  const text = encode(fixture());
  for (const bad of ['', '{', '{}', 'null', 'false', '1', '[]', '"SECRET"', text + ' ', '\n' + text,
    text.replace('alpha', '\\u0061lpha'), text.replace('selection', '\\u0073election'), text.replace('alpha', 'α'),
    text.replace('alpha', '\\ud800'), text.replace('"operation":"create-new"', '"operation":"select-existing","operation":"create-new"'),
    text.replace('"selection":', '"accounts":[],"selection":'), '['.repeat(1500) + '0' + ']'.repeat(1500),
    text.replace('"accounts":[', '"accounts":[null,'), '\ufeff' + text]) check(bad, 'MANUAL_ONLY', 'invalid_fixture', true);
});
test('canonical key ordering and catalog ordering do not affect the selected result', () => {
  const value = fixture(); const normal = positive(value);
  const reordered = Object.fromEntries(Object.entries(value).reverse().map(([key, item]) => [key,
    Array.isArray(item) ? item.map(row => Object.fromEntries(Object.entries(row).reverse())) : Object.fromEntries(Object.entries(item).reverse())]));
  assert.deepEqual(positive(reordered), normal);
});
test('hostile caller objects are rejected without reading any property or coercion hook', () => {
  let calls = 0; const hook = () => { calls++; throw new Error('SECRET'); };
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook, getOwnPropertyDescriptor: hook });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  const cycle = {}; cycle.self = cycle;
  for (const value of [fixture(), cycle, Object.create(null), Object.create({ inherited: 'SECRET' }),
    { get selection() { return hook(); } }, { toJSON: hook, toString: hook, valueOf: hook, [Symbol.toPrimitive]: hook },
    { [Symbol('SECRET')]: true }, new String(encode(fixture())), proxy, revoked.proxy, undefined, null, true, 1, 1n,
    Symbol('SECRET'), hook, new Proxy(hook, { apply: hook })]) check(value, 'MANUAL_ONLY', 'invalid_fixture', true);
  assert.equal(calls, 0);
});
test('all returned structures resist mutation; repeated calls are deterministic and independent', () => {
  for (const value of [fixture(), existing(), {}]) {
    const text = encode(value); const result = safe(preview(text));
    for (let i = 0; i < 12; i++) assert.deepEqual(safe(preview(text)), result);
    assert.throws(() => { result.executionAuthorized = true; }, TypeError);
    assert.throws(() => { result.preview = {}; }, TypeError);
    if (result.preview) assert.throws(() => { result.preview.account = 'SECRET'; }, TypeError);
    assert.equal(encode(value), text);
  }
  const saved = positive(); check({}); positive(existing()); assert.deepEqual(positive(), saved);
});
test('source has no imports, external capabilities or product callers; capability traps stay unused', () => {
  const source = readFileSync(new URL('../src/github/repository-create-preview.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:import|require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function|globalThis|window|document|navigator|Date|performance|setTimeout|setInterval|setImmediate|queueMicrotask|Worker|Promise)\b/);
  assert.doesNotMatch(source, /Math\.random|https?:|github\.com/);
  for (const file of readdirSync(new URL('../src/', import.meta.url), { recursive: true, withFileTypes: true })) {
    if (file.isFile() && /\.(mjs|js|html|json)$/.test(file.name) && file.name !== 'repository-create-preview.mjs') {
      assert.doesNotMatch(readFileSync(`${file.parentPath}/${file.name}`, 'utf8'), /repository-create-preview|previewFixtureRepositoryCreation/);
    }
  }
  let accesses = 0; const context = {};
  for (const key of ['fetch', 'chrome', 'browser', 'localStorage', 'sessionStorage', 'indexedDB', 'process',
    'setTimeout', 'setInterval', 'setImmediate', 'queueMicrotask', 'Date', 'performance', 'XMLHttpRequest', 'WebSocket', 'navigator']) {
    Object.defineProperty(context, key, { get() { accesses++; throw new Error('SECRET'); } });
  }
  const isolated = runInNewContext(source.replace('export function', 'function') + '\npreviewFixtureRepositoryCreation;', context);
  for (const value of [fixture(), existing(), {}]) assert.equal(encode(isolated(encode(value))), encode(preview(encode(value))));
  assert.equal(accesses, 0);
});
