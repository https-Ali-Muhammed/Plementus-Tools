import assert from "node:assert/strict";
import test from "node:test";
import { createRunRepository, validateRunRecord } from "../src/storage/run-record.mjs";
import { WORKFLOW_STATES } from "../src/workflow/state.mjs";

const id = "12345678-1234-4123-8123-123456789abc";
const record = () => ({ schemaVersion: 1, runId: id, state: "draft", step: 0, evidenceTier: "none", revision: 0 });
function fake() {
  const data = new Map();
  return {
    data,
    get: key => data.has(key) ? { ...data.get(key) } : null,
    insert: value => data.has(value.runId) ? false : (data.set(value.runId, { ...value }), true),
    replace: (value, revision) => data.get(value.runId)?.revision !== revision ? false : (data.set(value.runId, { ...value }), true),
    remove: (key, revision) => data.get(key)?.revision !== revision ? false : data.delete(key),
  };
}

test("accepts only supported bounded record fields and states", () => {
  for (const state of WORKFLOW_STATES) assert.equal(validateRunRecord({ ...record(), state }), true);
  assert.equal(validateRunRecord({ ...record(), step: 99, evidenceTier: "SIMULATED" }), true);
  for (const change of [{ schemaVersion: 2 }, { state: "unknown" }, { runId: "customer-name" }, { step: 100 }, { step: -1 }, { step: 1.5 }, { evidenceTier: "secret" }, { revision: -1 }, { revision: Number.MAX_SAFE_INTEGER }, { runId: "a".repeat(10000) }]) {
    assert.equal(validateRunRecord({ ...record(), ...change }), false);
  }
});

test("rejects sensitive, extra, missing and non-data properties", () => {
  for (const key of ["customerName", "subscriptionReference", "password", "token", "cookie", "database", "url", "repository", "form"]) {
    assert.equal(validateRunRecord({ ...record(), [key]: "sensitive" }), false);
  }
  const { step, ...missing } = record();
  assert.equal(validateRunRecord(missing), false);
  assert.equal(validateRunRecord({ ...record(), [Symbol("extra")]: 1 }), false);
  const getter = record();
  Object.defineProperty(getter, "state", { enumerable: true, get() { throw new Error("payload"); } });
  assert.equal(validateRunRecord(getter), false);
  assert.equal(validateRunRecord([]), false);
});

test("fake create, read, update and delete preserve input and copies", () => {
  const adapter = fake(), repo = createRunRepository(adapter), input = Object.freeze(record());
  assert.equal(repo.read(id), null);
  assert.deepEqual(repo.create(input), input);
  const read = repo.read(id); read.step = 3;
  assert.equal(repo.read(id).step, 0);
  const updated = Object.freeze({ ...input, state: "ready", step: 1, revision: 1 });
  assert.deepEqual(repo.update(updated, 0), updated);
  assert.deepEqual(input, record());
  assert.deepEqual(repo.read(id), updated);
  repo.delete(id, 1);
  assert.equal(repo.read(id), null);
});

test("conflicts and invalid requests fail without overwriting or deleting", () => {
  const adapter = fake(), repo = createRunRepository(adapter), initial = record();
  repo.create(initial);
  for (const action of [() => repo.create(initial), () => repo.update({ ...initial, revision: 1 }, 1), () => repo.update({ ...initial, revision: 1, token: "secret" }, 0), () => repo.delete(id, 1), () => repo.read("secret")]) {
    assert.throws(action, { message: "Run record operation failed" });
    assert.deepEqual(repo.read(id), initial);
  }
});

test("malformed stored records and adapter errors fail generically without destructive fallback", () => {
  const adapter = fake(), repo = createRunRepository(adapter);
  for (const invalid of [{ ...record(), schemaVersion: 2 }, { ...record(), state: "unknown" }, { ...record(), token: "secret" }]) {
    adapter.data.set(id, invalid);
    for (const action of [() => repo.read(id), () => repo.update({ ...record(), revision: 1 }, 0), () => repo.delete(id, 0), () => repo.create(record())]) assert.throws(action, { message: "Run record operation failed" });
    assert.deepEqual(adapter.data.get(id), invalid);
  }
  assert.throws(() => createRunRepository({ get() { throw new Error("sensitive"); } }).read(id), { message: "Run record operation failed" });
});

test("atomic adapter rejection prevents stale replace and delete", () => {
  const adapter = fake(), repo = createRunRepository(adapter);
  repo.create(record());
  adapter.replace = () => false;
  adapter.remove = () => false;
  assert.throws(() => repo.update({ ...record(), revision: 1 }, 0));
  assert.throws(() => repo.delete(id, 0));
  assert.deepEqual(repo.read(id), record());
});
