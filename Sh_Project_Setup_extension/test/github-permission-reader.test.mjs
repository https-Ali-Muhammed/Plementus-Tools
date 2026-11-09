import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { readFixturePermissions } from '../src/github/permission-reader.mjs';

const fixture = () => ({
  selection: { organization: 'fixture-org-alpha', repository: 'fixture-repo-demo' },
  organizations: [{ id: 'fixture-org-alpha', read: 'allowed', admin: 'denied' }],
  repositories: [{ id: 'fixture-repo-demo', organization: 'fixture-org-alpha', read: 'allowed' }],
});
const encode = value => JSON.stringify(value);
const read = value => readFixturePermissions(encode(value));
function safe(result) {
  assert.equal(result.evidenceTier, 'SIMULATED');
  assert.equal(result.fixtureOnly, true);
  for (const flag of ['accountVerified', 'executionAuthorized', 'approvalGranted', 'trustedContinuingContext']) {
    assert.equal(result[flag], false);
  }
  assert.equal(result.nextStep, 'manual');
  function frozen(value) {
    assert.ok(Object.isFrozen(value));
    for (const item of Object.values(value)) if (item && typeof item === 'object') frozen(item);
  }
  frozen(result);
  const text = encode(result);
  assert.ok(Buffer.byteLength(text) <= 1024);
  assert.doesNotMatch(text, /fixture-org-|fixture-repo-|SECRET|Error|stack/);
  return result;
}
function invalid(value, reason = 'invalid_fixture') {
  const result = safe(readFixturePermissions(value));
  for (const assessment of [result.organization.read, result.organization.admin, result.repository.read]) {
    assert.deepEqual(assessment, { state: 'unknown', reason });
  }
}

test('explicit synthetic organization and repository read success', () => {
  const result = safe(read(fixture()));
  assert.deepEqual(result.organization.read, { state: 'allowed', reason: 'fixture_allowed' });
  assert.deepEqual(result.repository.read, { state: 'allowed', reason: 'fixture_allowed' });
  assert.equal(result.organization.admin.state, 'denied');
});
test('organization read/admin access never grants repository access', () => {
  const value = fixture(); value.organizations[0].admin = 'allowed'; value.repositories[0].read = 'denied';
  const result = safe(read(value));
  assert.equal(result.organization.admin.state, 'allowed');
  assert.equal(result.repository.read.state, 'denied');
});
test('repository access never grants organization read or admin authority', () => {
  const value = fixture(); value.organizations[0].read = 'denied';
  const result = safe(read(value));
  assert.equal(result.repository.read.state, 'allowed');
  assert.equal(result.organization.read.state, 'denied');
  assert.equal(result.organization.admin.state, 'denied');
});
for (const field of ['organization-read', 'organization-admin', 'repository-read']) {
  for (const state of ['allowed', 'denied', 'unknown', 'unsupported', 'unavailable']) {
    test(`${field}: ${state} remains explicit fixture evidence`, () => {
      const value = fixture();
      const [kind, permission] = field.split('-');
      value[kind === 'organization' ? 'organizations' : 'repositories'][0][permission] = state;
      const result = safe(read(value));
      assert.deepEqual(result[kind][permission], {
        state: state === 'unavailable' ? 'unknown' : state, reason: `fixture_${state}`,
      });
    });
  }
}
test('missing organization also blocks repository association', () => {
  const value = fixture(); value.organizations = [];
  const result = safe(read(value));
  assert.equal(result.organization.read.reason, 'organization_missing');
  assert.equal(result.repository.read.reason, 'organization_missing');
});
test('missing repository preserves independent organization assessment', () => {
  const value = fixture(); value.repositories = [];
  const result = safe(read(value));
  assert.equal(result.organization.read.state, 'allowed');
  assert.equal(result.repository.read.reason, 'repository_missing');
});
test('wrong ownership cannot produce positive repository evidence', () => {
  const value = fixture(); value.repositories[0].organization = 'fixture-org-other';
  const result = safe(read(value));
  assert.equal(result.repository.read.state, 'unknown');
  assert.equal(result.repository.read.reason, 'ownership_mismatch');
});
for (const collection of ['organizations', 'repositories']) {
  for (const conflict of [false, true]) {
    test(`${collection}: duplicate or conflicting IDs are ambiguous`, () => {
      const value = fixture(); value[collection].push({ ...value[collection][0], read: conflict ? 'denied' : 'allowed' });
      invalid(encode(value), 'ambiguous_fixture');
    });
  }
}
test('organization administrative allowance conflicting with read is ambiguous', () => {
  const value = fixture(); value.organizations[0].read = 'denied'; value.organizations[0].admin = 'allowed';
  invalid(encode(value), 'ambiguous_fixture');
});
const locations = value => [value, value.selection, value.organizations[0], value.repositories[0]];
for (let location = 0; location < 4; location++) {
  for (const alteration of ['extra', 'missing', 'type', 'prototype-key']) {
    test(`closed schema ${location}: ${alteration}`, () => {
      const value = fixture(); const target = locations(value)[location];
      if (alteration === 'extra') target.secret = 'SECRET';
      if (alteration === 'missing') delete target[Object.keys(target)[0]];
      if (alteration === 'type') target[Object.keys(target)[0]] = { nested: 'SECRET' };
      if (alteration === 'prototype-key') Object.defineProperty(target, '__proto__', { value: {}, enumerable: true });
      invalid(encode(value));
    });
  }
}
for (const permission of [null, true, 1, {}, [], 'admin', 'ALLOW', 'read', '']) {
  test(`invalid permission enum/type ${encode(permission)}`, () => {
    for (const field of ['read', 'admin']) {
      const value = fixture(); value.organizations[0][field] = permission; invalid(encode(value));
    }
    const value = fixture(); value.repositories[0].read = permission; invalid(encode(value));
  });
}
for (const id of ['', 'alpha', 'fixture-org-A', 'fixture-org-a/b', 'fixture-org-é', 'fixture-org-a\n', 'fixture-org-1', 'fixture-org-\ud800', 'fixture-org-' + 'a'.repeat(33)]) {
  test(`malformed identifier ${encode(id)}`, () => {
    const value = fixture(); value.selection.organization = id; invalid(encode(value));
  });
}
test('all identifier positions are validated', () => {
  for (const [location, field] of [[1, 'repository'], [2, 'id'], [3, 'id'], [3, 'organization']]) {
    const value = fixture(); locations(value)[location][field] = 'SECRET'; invalid(encode(value));
  }
});
test('every required field, all collection element types, and serialized hooks fail closed', () => {
  for (let location = 0; location < 4; location++) {
    for (const field of Object.keys(locations(fixture())[location])) {
      const value = fixture(); delete locations(value)[location][field]; invalid(encode(value));
    }
    for (const field of ['constructor', 'prototype', 'toJSON', 'toString', 'valueOf']) {
      const value = fixture(); locations(value)[location][field] = 'SECRET'; invalid(encode(value));
    }
  }
  for (const collection of ['organizations', 'repositories']) {
    for (const value of [null, false, 1, 'SECRET', []]) {
      const input = fixture(); input[collection] = [value]; invalid(encode(input));
    }
  }
});
test('all permission combinations preserve four false flags and deterministic conflict handling', () => {
  const states = ['allowed', 'denied', 'unknown', 'unsupported', 'unavailable'];
  for (const readState of states) for (const admin of states) for (const repo of states) {
    const value = fixture();
    Object.assign(value.organizations[0], { read: readState, admin }); value.repositories[0].read = repo;
    if (admin === 'allowed' && readState !== 'allowed') invalid(encode(value), 'ambiguous_fixture');
    else {
      const result = safe(read(value));
      assert.equal(result.organization.read.state, readState === 'unavailable' ? 'unknown' : readState);
      assert.equal(result.repository.read.state, repo === 'unavailable' ? 'unknown' : repo);
    }
  }
});
test('object input rejected without prototype, accessor, symbol or serialization hooks', () => {
  let calls = 0;
  const hook = () => { calls++; throw new Error('SECRET'); };
  const objects = [fixture(), Object.create(null), Object.create({ inherited: true }),
    { get selection() { return hook(); } }, { toJSON: hook, toString: hook, valueOf: hook, [Symbol.toPrimitive]: hook },
    { [Symbol('SECRET')]: true }, new String(encode(fixture()))];
  const proxy = new Proxy({}, { get: hook, ownKeys: hook, getPrototypeOf: hook, getOwnPropertyDescriptor: hook });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const value of [...objects, proxy, revoked.proxy]) invalid(value);
  assert.equal(calls, 0);
});
test('non-string scalars and functions rejected without coercion', () => {
  for (const value of [undefined, null, true, 1, 1n, Symbol('SECRET'), () => {}]) invalid(value);
});
test('malformed, duplicate-key, noncanonical and deep JSON rejected safely', () => {
  const text = encode(fixture());
  for (const value of ['', '{', 'null', '[]', '1', text + ' ', ' ' + text,
    text.replace('"read":"allowed"', '"read":"denied","read":"allowed"'),
    text.replace('alpha', '\\u0061lpha'), '['.repeat(1500) + '0' + ']'.repeat(1500)]) invalid(value);
});
test('strict arrays: nulls, sparse encodings, strings and objects fail', () => {
  for (const collection of ['organizations', 'repositories']) {
    for (const replacement of [null, {}, 'SECRET', [null], new Array(2)]) {
      const value = fixture(); value[collection] = replacement; invalid(encode(value));
    }
  }
});
for (const count of [15, 16, 17]) {
  test(`record count boundary ${count}`, () => {
    for (const collection of ['organizations', 'repositories']) {
      const value = fixture();
      for (let index = 1; index < count; index++) value[collection].push({ ...value[collection][0], id: `${collection === 'organizations' ? 'fixture-org' : 'fixture-repo'}-a${index}` });
      if (count > 16) invalid(encode(value));
      else assert.equal(safe(read(value)).repository.read.state, 'allowed');
    }
  });
}
for (const size of [31, 32, 33]) {
  test(`identifier suffix boundary ${size}`, () => {
    const value = fixture(); const id = 'fixture-org-' + 'a'.repeat(size);
    value.selection.organization = id; value.organizations[0].id = id; value.repositories[0].organization = id;
    if (size > 32) invalid(encode(value));
    else assert.equal(safe(read(value)).repository.read.state, 'allowed');
  });
}
for (const size of [3071, 3072, 3073]) {
  test(`serialized input boundary ${size}`, () => {
    // Pad valid records through allowed IDs, not ignored/unknown fields.
    const value = fixture();
    for (let i = 1; i < 16; i++) {
      value.organizations.push({ id: `fixture-org-a${i}`, read: 'allowed', admin: 'denied' });
      value.repositories.push({ id: `fixture-repo-a${i}`, organization: 'fixture-org-alpha', read: 'allowed' });
    }
    for (const record of [...value.organizations.slice(1), ...value.repositories.slice(1)]) {
      const extra = Math.min(size - encode(value).length, 32 - record.id.split('-').at(-1).length);
      if (extra > 0) record.id += 'a'.repeat(extra);
    }
    assert.equal(encode(value).length, size);
    if (size > 3072) invalid(encode(value));
    else assert.equal(safe(read(value)).repository.read.state, 'allowed');
  });
}
test('invalid unselected record invalidates entire fixture', () => {
  const value = fixture(); value.repositories.push({ id: 'fixture-repo-other', organization: 'fixture-org-alpha', read: 'SECRET' });
  invalid(encode(value));
});
test('repeatable, immutable sanitized outputs; no caller mutation', () => {
  const value = fixture(); const original = encode(value);
  const first = safe(readFixturePermissions(original));
  for (let i = 0; i < 20; i++) assert.deepEqual(safe(readFixturePermissions(original)), first);
  assert.throws(() => { first.repository.read.state = 'allowed'; }, TypeError);
  assert.throws(() => { first.accountVerified = true; }, TypeError);
  assert.equal(encode(value), original);
  Object.freeze(value); invalid(value); assert.equal(encode(value), original);
});
test('source has no imports or implicit external capabilities; no product caller', () => {
  const source = readFileSync(new URL('../src/github/permission-reader.mjs', import.meta.url), 'utf8');
  assert.doesNotMatch(source, /\b(?:import|require|fetch|XMLHttpRequest|WebSocket|chrome|browser|localStorage|sessionStorage|indexedDB|process|eval|Function)\s*(?:[.(]|\{|'|"|\*)/);
  const sourceRoot = new URL('../src/', import.meta.url);
  for (const file of readdirSync(sourceRoot, { recursive: true, withFileTypes: true })) {
    if (file.isFile() && /\.(mjs|js|html)$/.test(file.name) && file.name !== 'permission-reader.mjs') {
      assert.doesNotMatch(readFileSync(`${file.parentPath}/${file.name}`, 'utf8'), /permission-reader|readFixturePermissions/);
    }
  }
  const keys = ['fetch', 'chrome', 'browser', 'localStorage', 'sessionStorage', 'indexedDB'];
  const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  let accesses = 0;
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, get() { accesses++; throw new Error('SECRET'); } });
    safe(read(fixture())); invalid('{}');
    assert.equal(accesses, 0);
  } finally {
    keys.forEach((key, i) => descriptors[i] ? Object.defineProperty(globalThis, key, descriptors[i]) : delete globalThis[key]);
  }
});
