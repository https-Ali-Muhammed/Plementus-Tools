import test from "node:test";
import assert from "node:assert/strict";
import { createCheckpointService } from "../src/storage/checkpoint-service.mjs";
import { RETENTION_MS } from "../src/storage/checkpoint-policy.mjs";
import { fakeIndexedDB } from "./fake-indexeddb.mjs";

const id = "12345678-1234-4123-8123-123456789abc";
const secondId = "12345678-1234-4123-8123-123456789abd";
const record = (overrides = {}) => ({ schemaVersion: 2, runId: id, state: "draft", step: 0, evidenceTier: "none", revision: 0, createdAt: 1000, ...overrides });
const rejected = promise => assert.rejects(promise, { message: "Checkpoint operation failed" });
async function setup() {
  const factory = fakeIndexedDB(); let current = 1000, monotonic = 0, allowed = true;
  const service = await createCheckpointService(factory, { now: () => current, monotonicNow: () => monotonic, authorize: () => allowed });
  return { factory, service, clock: (value, elapsed = monotonic) => { current = value; monotonic = elapsed; }, auth: value => { allowed = value; } };
}
const nextTurn = () => new Promise(resolve => setImmediate(resolve));
async function waitForTransaction(factory, count) {
  for (let attempt = 0; attempt < 10 && factory.startedTransactionCount() < count; attempt++) await nextTurn();
  assert.equal(factory.startedTransactionCount(), count);
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
  factory.beforeTransaction(() => factory.beforeTransaction(() => factory.abortNext()));
  await rejected(service.transition(id, "draft", 0, "ready")); assert.deepEqual(await service.read(id), record());
  factory.beforeTransaction(() => factory.beforeTransaction(() => factory.abortNext()));
  await rejected(service.delete(id, 0, "explicit")); assert.deepEqual(await service.read(id), record());
});

test("terminal and reconciliation guards, authorization is synthetic", async () => {
  const { service, factory, auth } = await setup();
  await service.create(record());
  for (const state of ["completed", "cancelled", "reconcile_required", "blocked"]) {
    factory.seed(record({ state })); await rejected(service.transition(id, state, 0, "ready"));
  }
  factory.seed(record()); auth(false);
  await rejected(service.transition(id, "draft", 0, "ready")); await rejected(service.delete(id, 0, "explicit"));
  assert.deepEqual(factory.snapshot(id), record());
});

test("expiry is exact and never renewed; expired records cannot be read or updated", async () => {
  const { service, clock, factory } = await setup(); await service.create(record());
  clock(1000 + RETENTION_MS - 1, RETENTION_MS - 1); await service.transition(id, "draft", 0, "ready");
  assert.equal((await service.read(id)).createdAt, 1000);
  clock(1000 + RETENTION_MS, RETENTION_MS + 0.2); await rejected(service.read(id)); await rejected(service.transition(id, "ready", 1, "running"));
  assert.equal(factory.snapshot(id), undefined); assert.equal(await service.cleanup(), 0);
});

test("authorized and acknowledged deletion guard state and revision", async () => {
  const { service, factory } = await setup(); await service.create(record());
  await rejected(service.delete(id, 1, "explicit")); await rejected(service.delete(id, 0, "acknowledged"));
  assert.deepEqual(await service.read(id), record()); await service.delete(id, 0, "explicit");
  await rejected(service.read(id)); await service.create(record({ state: "completed" })); await service.delete(id, 0, "acknowledged"); assert.equal(factory.snapshot(id), undefined);
});

test("cleanup is one atomic transaction and reports committed deletion", async () => {
  const { service, factory, clock } = await setup(); await service.create(record());
  await service.create(record({ runId: secondId })); clock(1000 + RETENTION_MS, RETENTION_MS + 0.2);
  const before = factory.transactionCount();
  assert.equal(await service.cleanup(), 2);
  assert.equal(factory.transactionCount(), before + 1);
  assert.equal(factory.snapshot(id), undefined); assert.equal(factory.snapshot(secondId), undefined);
});

test("abort after a staged deletion rolls back every expired record", async () => {
  const { service, factory, clock } = await setup(); await service.create(record());
  await service.create(record({ runId: secondId })); clock(1000 + RETENTION_MS, RETENTION_MS + 0.2);
  factory.abortAfterDeletes(1); await rejected(service.cleanup());
  assert.deepEqual(factory.snapshot(id), record()); assert.deepEqual(factory.snapshot(secondId), record({ runId: secondId }));
  assert.equal(await service.cleanup(), 2);
});

test("a failed deletion aborts cleanup without partial commit or record disclosure", async () => {
  const { service, factory, clock } = await setup();
  await service.create(record()); await service.create(record({ runId: secondId })); clock(1000 + RETENTION_MS, RETENTION_MS + 0.2);
  factory.failNextDelete(); await rejected(service.cleanup());
  assert.deepEqual(factory.snapshot(id), record()); assert.deepEqual(factory.snapshot(secondId), record({ runId: secondId }));
});

test("a stored primary-key mismatch aborts cleanup and preserves every row", async () => {
  const { service, factory, clock } = await setup();
  await service.create(record()); factory.seed(record({ runId: secondId }), "mismatched-key"); clock(1000 + RETENTION_MS, RETENTION_MS + 0.2);
  await rejected(service.cleanup());
  assert.deepEqual(factory.snapshot(id), record());
  assert.deepEqual(factory.snapshot("mismatched-key"), record({ runId: secondId }));
});

test("first and subsequent operations run cleanup before their own transaction", async () => {
  const { service, factory } = await setup();
  assert.equal(factory.transactionCount(), 0);
  await service.create(record()); assert.equal(factory.transactionCount(), 2);
  await service.read(id); assert.equal(factory.transactionCount(), 4);
  await service.transition(id, "draft", 0, "ready"); assert.equal(factory.transactionCount(), 6);
  await service.delete(id, 1, "explicit"); assert.equal(factory.transactionCount(), 8);
  await rejected(service.read(id)); assert.equal(factory.transactionCount(), 10);
});

test("startup-style cleanup preserves restart-uncertain records", async () => {
  const factory = fakeIndexedDB(); factory.seed(record());
  const service = await createCheckpointService(factory, { now: () => 1000 + RETENTION_MS, authorize: () => true });
  await rejected(service.cleanup());
  assert.deepEqual(factory.snapshot(id), record());
  await rejected(service.read(id));
});

test("concurrent operations share the pending cleanup and wait for commit", async () => {
  const { service, factory } = await setup(); await service.create(record());
  const before = factory.transactionCount();
  const release = factory.pauseNextCommit();
  const first = service.read(id), second = service.transition(id, "draft", 0, "ready");
  await waitForTransaction(factory, before + 1);
  assert.equal(factory.transactionCount(), before + 1); assert.equal(factory.snapshot(id).revision, 0);
  release();
  assert.deepEqual(await first, record());
  assert.equal((await second).record.revision, 1);
  assert.equal(factory.transactionCount(), before + 3);
});

test("failed shared cleanup blocks requests, then a fresh request retries without replay", async () => {
  const { service, factory } = await setup(); await service.create(record());
  const before = factory.transactionCount();
  factory.abortNext();
  const first = service.transition(id, "draft", 0, "ready"), second = service.read(id);
  await rejected(first); await rejected(second);
  assert.equal(factory.transactionCount(), before + 1); assert.deepEqual(factory.snapshot(id), record());
  assert.deepEqual(await service.read(id), record());
  assert.equal(factory.snapshot(id).revision, 0);
});

test("aborted cleanup blocks create, read, update and delete", async () => {
  const { service, factory } = await setup(); await service.create(record());
  for (const operation of [() => service.create(record({ runId: secondId })), () => service.read(id),
    () => service.transition(id, "draft", 0, "ready"), () => service.delete(id, 0, "explicit")]) {
    const before = factory.transactionCount(); factory.abortNext(); await rejected(operation());
    assert.equal(factory.transactionCount(), before + 1);
    assert.deepEqual(factory.snapshot(id), record()); assert.equal(factory.snapshot(secondId), undefined);
  }
});

test("time is rechecked after a pending cleanup before reading or writing", async () => {
  const { service, factory, clock } = await setup(); await service.create(record());
  const before = factory.transactionCount();
  const release = factory.pauseNextCommit(); const pending = service.read(id);
  await waitForTransaction(factory, before + 1);
  clock(1000 + RETENTION_MS, RETENTION_MS + 0.2); release(); await rejected(pending);
  assert.deepEqual(factory.snapshot(id), record());
  await rejected(service.read(id)); assert.equal(factory.snapshot(id), undefined);
});

test("invalid and backward clock samples block cleanup and access", async () => {
  const { service, factory, clock } = await setup(); await service.create(record());
  const before = factory.transactionCount();
  clock(NaN); await rejected(service.read(id)); assert.equal(factory.transactionCount(), before);
  clock(1001, 1); await rejected(service.read(id));
  assert.deepEqual(factory.snapshot(id), record());
  assert.equal(factory.transactionCount(), before);
});

test("missing, corrupt, legacy, unknown versions and unavailable databases fail closed", async () => {
  const { service, factory } = await setup(); await rejected(service.read(id)); await rejected(service.delete(id, 0, "explicit"));
  for (const value of [record({ schemaVersion: 1 }), record({ schemaVersion: 3 }), record({ secret: "sensitive" })]) {
    factory.seed(value); await rejected(service.create(record({ runId: secondId })));
    await rejected(service.read(id)); await rejected(service.transition(id, "draft", 0, "ready"));
    await rejected(service.delete(id, 0, "explicit")); await rejected(service.cleanup());
    assert.deepEqual(factory.snapshot(id), value); assert.equal(factory.snapshot(secondId), undefined);
  }
  const unavailable = fakeIndexedDB(); unavailable.failOpen(); await rejected(createCheckpointService(unavailable, { now: () => 1000, authorize: () => true }));
  await rejected(createCheckpointService(null, { now: () => 1000, authorize: () => true }));
  await rejected(createCheckpointService(fakeIndexedDB()));
});

test("rollback and invalid samples latch a blocked service without leaking data", async () => {
  for (const bad of [999, NaN]) {
    const { service, factory, clock } = await setup(); await service.create(record());
    clock(bad);
    await assert.rejects(service.read(id), error => {
      assert.equal(error.message, "Checkpoint operation failed");
      assert.equal(String(error).includes(id), false);
      assert.equal(String(error).includes("sensitive"), false);
      return true;
    });
    clock(1000);
    for (const operation of [() => service.read(id), () => service.transition(id, "draft", 0, "ready"),
      () => service.delete(id, 0, "explicit"), () => service.cleanup()]) await rejected(operation());
    assert.deepEqual(factory.snapshot(id), record());
  }
});

test("unexplained forward time blocks access and preserves uncertain expiry", async () => {
  const factory = fakeIndexedDB(); let wall = 1000, monotonic = 0;
  const service = await createCheckpointService(factory, { now: () => wall, monotonicNow: () => monotonic, authorize: () => true });
  await service.create(record());
  wall += RETENTION_MS;
  for (const operation of [() => service.read(id), () => service.transition(id, "draft", 0, "ready"),
    () => service.delete(id, 0, "explicit"), () => service.cleanup()]) await rejected(operation());
  assert.deepEqual(factory.snapshot(id), record());
  monotonic = RETENTION_MS; await rejected(service.cleanup());
  assert.deepEqual(factory.snapshot(id), record());
});

test("advancing time without monotonic evidence and invalid monotonic samples latch", async () => {
  const factory = fakeIndexedDB(); let wall = 1000;
  const service = await createCheckpointService(factory, { now: () => wall, authorize: () => true });
  await rejected(service.create(record())); wall = 1001;
  await rejected(service.read(id)); wall = 1000;
  await rejected(service.cleanup()); assert.equal(factory.snapshot(id), undefined);

  const second = fakeIndexedDB(); let tick = 0;
  const withMonotonic = await createCheckpointService(second, { now: () => 1000, monotonicNow: () => tick, authorize: () => true });
  await withMonotonic.create(record()); tick = NaN;
  await rejected(withMonotonic.read(id)); tick = 0;
  await rejected(withMonotonic.cleanup()); assert.deepEqual(second.snapshot(id), record());
});

test("integer wall precision and bounded fractional brackets permit ordinary progress", async () => {
  const factory = fakeIndexedDB(); let wall = 1000, edge = 0;
  const service = await createCheckpointService(factory, {
    now: () => wall,
    monotonicNow: () => edge++ * 0.05,
    authorize: () => true,
  });
  await service.create(record());
  wall = 1001;
  assert.deepEqual(await service.read(id), record());
  edge = 20; wall = 1002;
  assert.deepEqual(await service.read(id), record());
});

test("a one-millisecond sampling bracket is accepted at its boundary", async () => {
  const factory = fakeIndexedDB(); let edge = 0;
  const service = await createCheckpointService(factory, { now: () => 1000, monotonicNow: () => edge++, authorize: () => true });
  await service.create(record());
  assert.deepEqual(await service.read(id), record());
});

test("sleep-like monotonic pause is uncertain and permanently blocks cleanup", async () => {
  const { service, factory, clock } = await setup(); await service.create(record());
  clock(6000, 1); await rejected(service.cleanup());
  clock(1001, 2); await rejected(service.read(id));
  assert.deepEqual(factory.snapshot(id), record());
});

test("small repeated wall advances cannot hide a paused monotonic clock", async () => {
  const { service, factory, clock } = await setup(); await service.create(record());
  clock(1001, 0); assert.deepEqual(await service.read(id), record());
  clock(1002, 0); await rejected(service.read(id));
  clock(1002, 2); await rejected(service.cleanup());
  assert.deepEqual(factory.snapshot(id), record());
});

test("reversed, wide and regressing monotonic brackets latch without changing a row", async () => {
  for (const bad of [[2, 1], [2, 3.01], [NaN, 2], [-1, 0], [Number.MAX_SAFE_INTEGER + 1, Number.MAX_SAFE_INTEGER + 1]]) {
    const factory = fakeIndexedDB(); let bracket = [0, 0], edge = 0;
    const service = await createCheckpointService(factory, { now: () => 1000, monotonicNow: () => bracket[edge++ % 2], authorize: () => true });
    await service.create(record()); bracket = bad;
    await rejected(service.read(id)); bracket = [3, 3];
    await rejected(service.cleanup()); assert.deepEqual(factory.snapshot(id), record());
  }
  const factory = fakeIndexedDB(); let bracket = [5, 5], edge = 0;
  const service = await createCheckpointService(factory, { now: () => 1000, monotonicNow: () => bracket[edge++ % 2], authorize: () => true });
  await service.create(record()); bracket = [4, 4];
  await rejected(service.read(id)); assert.deepEqual(factory.snapshot(id), record());
});

test("wall expiry never borrows detection allowance from insufficient elapsed proof", async () => {
  const { service, factory, clock } = await setup(); await service.create(record());
  clock(1000 + RETENTION_MS, RETENTION_MS - 0.05);
  await rejected(service.cleanup());
  assert.deepEqual(factory.snapshot(id), record());
  clock(1000 + RETENTION_MS + 1, RETENTION_MS + 1);
  await rejected(service.cleanup()); assert.deepEqual(factory.snapshot(id), record());
});

test("seven-day deletion requires a conservative same-instance monotonic lower bound", async () => {
  const { service, factory, clock } = await setup(); await service.create(record());
  clock(1000 + RETENTION_MS - 1, RETENTION_MS + 0.2);
  assert.deepEqual(await service.read(id), record());
  clock(1000 + RETENTION_MS, RETENTION_MS + 0.2);
  assert.equal(await service.cleanup(), 1);
  assert.equal(factory.snapshot(id), undefined);
});

test("the first guarded cleanup after the exact seven-day boundary deletes", async () => {
  const { service, factory, clock } = await setup(); await service.create(record());
  clock(1000 + RETENTION_MS + 1, RETENTION_MS + 1.2);
  assert.equal(await service.cleanup(), 1);
  assert.equal(factory.snapshot(id), undefined);
});

test("expired cleanup reports deletion only after transaction completion", async () => {
  const { service, factory, clock } = await setup(); await service.create(record());
  clock(1000 + RETENTION_MS, RETENTION_MS + 0.2);
  const before = factory.transactionCount(), release = factory.pauseNextCommit();
  let settled = false;
  const pending = service.cleanup().then(value => { settled = true; return value; });
  await waitForTransaction(factory, before + 1); await nextTurn();
  assert.equal(settled, false); assert.deepEqual(factory.snapshot(id), record());
  release(); assert.equal(await pending, 1); assert.equal(factory.snapshot(id), undefined);
});

test("a restarted service retains a checkpoint and never replays possible writes", async () => {
  const { service, factory } = await setup(); await service.create(record());
  const saved = (await service.transition(id, "draft", 0, "ready")).record;
  const restarted = await createCheckpointService(factory, { now: () => 1000 + RETENTION_MS, monotonicNow: () => 0, authorize: () => true });
  for (const operation of [() => restarted.create(record({ runId: secondId, createdAt: 1000 + RETENTION_MS })),
    () => restarted.read(id), () => restarted.transition(id, "ready", 1, "running"),
    () => restarted.delete(id, 1, "explicit"), () => restarted.cleanup()]) await rejected(operation());
  assert.deepEqual(factory.snapshot(id), saved);
  assert.equal(factory.snapshot(id).revision, 1);
  assert.equal(factory.snapshot(secondId), undefined);
});
