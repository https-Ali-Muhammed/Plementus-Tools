import test from "node:test";
import assert from "node:assert/strict";
import { createCheckpointService } from "../src/storage/checkpoint-service.mjs";
import { RETENTION_MS } from "../src/storage/checkpoint-policy.mjs";
import { fakeIndexedDB } from "./fake-indexeddb.mjs";

const id = "12345678-1234-4123-8123-123456789abc";
const record = (overrides = {}) => ({ schemaVersion: 2, runId: id, state: "draft", step: 0, evidenceTier: "none", revision: 0, createdAt: 1000, ...overrides });
const rejected = promise => assert.rejects(promise, { message: "Checkpoint operation failed" });
async function setup() {
  const factory = fakeIndexedDB(); let current = 1000, allowed = true;
  const service = await createCheckpointService(factory, { now: () => current, authorize: () => allowed });
  return { factory, service, clock: value => { current = value; }, auth: value => { allowed = value; } };
}

test("initialization, strict schema, duplicates, immutability and generic errors", async () => {
  const { service, factory } = await setup();
  const input = Object.freeze(record());
  assert.deepEqual(await service.create(input), input);
  await rejected(service.create(input));
  for (const change of [{ schemaVersion: 1 }, { schemaVersion: 3 }, { secret: "sensitive" }, { createdAt: 999 }, { step: 100 }]) await rejected(service.create(record(change)));
  await rejected(service.read("secret"));
  assert.deepEqual(input, record()); assert.deepEqual(factory.snapshot(id), input);
});

test("transactional updates serialize competing revisions and preserve creation time", async () => {
  const { service } = await setup(); await service.create(record());
  const outcomes = await Promise.allSettled([service.transition(id, "draft", 0, "ready"), service.transition(id, "draft", 0, "cancelled")]);
  assert.equal(outcomes.filter(x => x.status === "fulfilled").length, 1);
  assert.equal(outcomes.filter(x => x.status === "rejected" && x.reason.message === "Checkpoint operation failed").length, 1);
  const saved = await service.read(id); assert.equal(saved.revision, 1); assert.equal(saved.createdAt, 1000);
  await rejected(service.transition(id, "draft", 1, "ready"));
  await rejected(service.transition(id, saved.state, 1, saved.state));
});

test("transaction abort rolls back both update and deletion", async () => {
  const { service, factory } = await setup(); await service.create(record());
  factory.abortNext(); await rejected(service.transition(id, "draft", 0, "ready")); assert.deepEqual(await service.read(id), record());
  factory.abortNext(); await rejected(service.delete(id, 0, "explicit")); assert.deepEqual(await service.read(id), record());
});

test("terminal and reconciliation guards, authorization is synthetic", async () => {
  const { service, factory, auth } = await setup();
  for (const state of ["completed", "cancelled", "reconcile_required", "blocked"]) {
    factory.seed(record({ state })); await rejected(service.transition(id, state, 0, "ready"));
  }
  factory.seed(record()); auth(false);
  await rejected(service.transition(id, "draft", 0, "ready")); await rejected(service.delete(id, 0, "explicit"));
  assert.deepEqual(factory.snapshot(id), record());
});

test("expiry is exact and never renewed; expired records cannot be read or updated", async () => {
  const { service, clock, factory } = await setup(); await service.create(record());
  clock(1000 + RETENTION_MS - 1); await service.transition(id, "draft", 0, "ready");
  assert.equal((await service.read(id)).createdAt, 1000);
  clock(1000 + RETENTION_MS); await rejected(service.read(id)); await rejected(service.transition(id, "ready", 1, "running"));
  assert.equal(factory.snapshot(id).createdAt, 1000); assert.equal(await service.cleanup(), 1); assert.equal(factory.snapshot(id), undefined);
});

test("authorized and acknowledged deletion guard state and revision", async () => {
  const { service, factory } = await setup(); await service.create(record());
  await rejected(service.delete(id, 1, "explicit")); await rejected(service.delete(id, 0, "acknowledged"));
  assert.deepEqual(await service.read(id), record()); await service.delete(id, 0, "explicit");
  await rejected(service.read(id)); factory.seed(record({ state: "completed" })); await service.delete(id, 0, "acknowledged"); assert.equal(factory.snapshot(id), undefined);
});

test("cleanup rejects conflicts and aborts while preserving records", async () => {
  const { service, factory, clock } = await setup(); await service.create(record()); clock(1000 + RETENTION_MS);
  // The second transaction is deletion: replace the record after the scan commits.
  const cleanup = service.cleanup();
  queueMicrotask(() => factory.beforeTransaction(() => factory.seed(record({ revision: 1 }))));
  await rejected(cleanup); assert.equal(factory.snapshot(id).revision, 1);
  factory.abortNext(); await rejected(service.cleanup()); assert.equal(factory.snapshot(id).revision, 1);
  const abortedDelete = service.cleanup();
  queueMicrotask(() => factory.beforeTransaction(() => factory.abortNext()));
  await rejected(abortedDelete); assert.equal(factory.snapshot(id).revision, 1);
});

test("missing, corrupt, legacy, unknown versions and unavailable databases fail closed", async () => {
  const { service, factory } = await setup(); await rejected(service.read(id)); await rejected(service.delete(id, 0, "explicit"));
  for (const value of [record({ schemaVersion: 1 }), record({ schemaVersion: 3 }), record({ secret: "sensitive" })]) {
    factory.seed(value); await rejected(service.read(id)); await rejected(service.delete(id, 0, "explicit")); await rejected(service.cleanup()); assert.deepEqual(factory.snapshot(id), value);
  }
  const unavailable = fakeIndexedDB(); unavailable.failOpen(); await rejected(createCheckpointService(unavailable, { now: () => 1000, authorize: () => true }));
  await rejected(createCheckpointService(null, { now: () => 1000, authorize: () => true }));
});
