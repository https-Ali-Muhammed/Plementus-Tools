import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  createHandoff, validateHandoff, handoffKey, consumeHandoff, repositoryParts,
} from '../src/popup/observation-handoff.mjs';

const id = 'e45b3f51-0fce-4d54-9db2-e99888eaa18d';
const now = 1_800_000_000_000;

test('normalizes only bounded repository candidates and splits them for existing mode', () => {
  const record = createHandoff('  Acme/Tools  ', id, now);
  assert.deepEqual(record, { id, candidate: 'Acme/Tools', provenance: 'previous-read-only-github-page-observation', createdAt: now });
  assert.deepEqual(repositoryParts(record), { organization: 'Acme', repository: 'Tools', mode: 'existing' });
  for (const candidate of ['https://github.com/acme/tools', 'acme/tools?secret=1', 'acme/tools#x', 'a/b/c', 'a/.git', 'a/repo.git', 'a/..', 'a/b token', 'acme /tools', `${'a'.repeat(40)}/b`, `a/${'b'.repeat(101)}`]) {
    assert.equal(createHandoff(candidate, id, now), null, candidate);
  }
});

test('validates identifier and exact handoff schema without authority fields', () => {
  const record = createHandoff('acme/tools', id, now);
  assert.equal(handoffKey(id), `github-observation-handoff:${id}`);
  assert.equal(handoffKey('../secret'), null);
  assert.equal(handoffKey('acme/tools'), null);
  assert.deepEqual(validateHandoff(record, id, now + 60_000), record);
  for (const invalid of [null, {}, { ...record, id: crypto.randomUUID() }, { ...record, provenance: 'authenticated' }, { ...record, token: 'secret' }, { ...record, authorized: true }, ...[null, undefined, '', 'invalid/repository/name'].map(candidate => ({ ...record, candidate })), { ...record, candidate: 'https://github.com/acme/tools' }, { ...record, candidate: ' acme/tools ' }, { ...record, createdAt: now + 1 }, { ...record, createdAt: -1 }]) {
    assert.equal(validateHandoff(invalid, id, now), null);
  }
  assert.equal(validateHandoff(record, id, now + 60_001), null);
});

test('checks expiry after asynchronous removal, using a controlled clock', async () => {
  const key = handoffKey(id);
  const start = now + 59_999;
  let current = start;
  let advance = 0;
  const data = { [key]: createHandoff('acme/tools', id, now) };
  const storage = {
    async get(name) { return { [name]: data[name] }; },
    async remove(name) { delete data[name]; current += advance; },
  };
  const originalNow = Date.now;
  Date.now = () => current;
  try {
    assert.deepEqual(await consumeHandoff(storage, id), { organization: 'acme', repository: 'tools', mode: 'existing' });
    data[key] = createHandoff('acme/tools', id, now);
    advance = 2;
    assert.equal(await consumeHandoff(storage, id), null);
    assert.equal(key in data, false);
  } finally {
    Date.now = originalNow;
  }
});

test('consumption rejects missing, expired, malformed and repeated handoffs', async () => {
  const key = handoffKey(id);
  const data = { [key]: createHandoff('acme/tools', id, now) };
  const storage = { async get(name) { return { [name]: data[name] }; }, async remove(name) { delete data[name]; } };
  assert.deepEqual(await consumeHandoff(storage, id, now), { organization: 'acme', repository: 'tools', mode: 'existing' });
  assert.equal(await consumeHandoff(storage, id, now), null);
  data[key] = createHandoff('acme/tools', id, now);
  assert.equal(await consumeHandoff(storage, id, now + 60_001), null);
  data[key] = { ...createHandoff('acme/tools', id, now), authenticated: true };
  assert.equal(await consumeHandoff(storage, id, now), null);
  assert.equal(await consumeHandoff(storage, 'bad', now), null);
  const broken = { get: storage.get, async remove() { throw Error('denied'); } };
  data[key] = createHandoff('acme/tools', id, now);
  assert.equal(await consumeHandoff(broken, id, now), null);
  assert.equal(await consumeHandoff({ async get() { throw Error('denied'); }, remove: storage.remove }, id, now), null);
});
