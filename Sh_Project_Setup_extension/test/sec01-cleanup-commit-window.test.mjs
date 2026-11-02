import test from "node:test";
import assert from "node:assert/strict";
import { createCheckpointService } from "../src/storage/checkpoint-service.mjs";
import { RETENTION_MS } from "../src/storage/checkpoint-policy.mjs";
import { fakeIndexedDB } from "./fake-indexeddb.mjs";

const id = "12345678-1234-4123-8123-123456789abc";
const record = { schemaVersion: 2, runId: id, state: "draft", step: 0, evidenceTier: "none", revision: 0, createdAt: 1000 };
const expiredWall = record.createdAt + RETENTION_MS;
const expiredMonotonic = RETENTION_MS + 0.2;
const nextTurn = () => new Promise(resolve => setImmediate(resolve));

async function setup() {
  const factory = fakeIndexedDB();
  let wall = record.createdAt, monotonic = 0;
  const service = await createCheckpointService(factory, {
    now: () => wall,
    monotonicNow: () => monotonic,
    authorize: () => true,
  });
  await service.create(record);
  return { factory, service, clock: (nextWall, nextMonotonic = monotonic) => { wall = nextWall; monotonic = nextMonotonic; } };
}

async function pausedCleanup(factory, service) {
  const before = factory.transactionCount();
  const release = factory.pauseNextCommit();
  let settled = false;
  const outcome = service.cleanup().then(
    value => { settled = true; return { status: "fulfilled", value }; },
    error => { settled = true; return { status: "rejected", message: error.message }; },
  );
  for (let attempt = 0; attempt < 10 && factory.startedTransactionCount() < before + 1; attempt++) await nextTurn();
  assert.equal(factory.startedTransactionCount(), before + 1, "cleanup transaction started");
  await nextTurn(); // The fake drains staged cursor/deletion requests before waiting at the commit pause.
  assert.equal(settled, false, "cleanup has not reported a result before commit");
  assert.deepEqual(factory.snapshot(id), record, "staged deletion is not yet committed");
  return { release, outcome, before };
}

test("accepted seven-day expiry commits deletion and reports one deleted row", async () => {
  const { factory, service, clock } = await setup();
  clock(expiredWall, expiredMonotonic);
  assert.deepEqual(factory.snapshot(id), record);
  const { release, outcome, before } = await pausedCleanup(factory, service);
  release();
  assert.deepEqual(await outcome, { status: "fulfilled", value: 1 });
  assert.equal(factory.transactionCount(), before + 1);
  assert.equal(factory.snapshot(id), undefined, "deletion committed");
  assert.equal(await service.cleanup(), 0, "service did not latch a clock block");
});

for (const [name, badWall] of [["invalid", NaN], ["backward", record.createdAt - 1]]) {
  test(`${name} clock before cleanup rejects without starting a transaction and latches`, async () => {
    const { factory, service, clock } = await setup();
    const before = factory.transactionCount();
    clock(badWall);
    await assert.rejects(service.cleanup(), { message: "Checkpoint operation failed" });
    assert.equal(factory.transactionCount(), before, "no cleanup transaction started");
    assert.deepEqual(factory.snapshot(id), record, "checkpoint remains unchanged");
    clock(record.createdAt);
    await assert.rejects(service.cleanup(), { message: "Checkpoint operation failed" });
    await assert.rejects(service.read(id), { message: "Checkpoint operation failed" });
    assert.equal(factory.transactionCount(), before, "later operations stay blocked");
  });
}

test("an abort before commit rejects cleanup and retains the checkpoint", async () => {
  const { factory, service, clock } = await setup();
  clock(expiredWall, expiredMonotonic);
  const { release, outcome, before } = await pausedCleanup(factory, service);
  factory.abortNext();
  release();
  assert.deepEqual(await outcome, { status: "rejected", message: "Checkpoint operation failed" });
  assert.equal(factory.transactionCount(), before + 1);
  assert.deepEqual(factory.snapshot(id), record, "aborted deletion did not commit");
  assert.equal(await service.cleanup(), 1, "an abort alone did not latch clock uncertainty");
  assert.equal(factory.snapshot(id), undefined);
});

for (const [name, changedWall] of [["backward wall", expiredWall - 1], ["excessive forward wall", expiredWall + 1000]]) {
  test(`${name} during pending cleanup commits deletion but rejects and latches afterward`, async () => {
    const { factory, service, clock } = await setup();
    clock(expiredWall, expiredMonotonic);
    const { release, outcome, before } = await pausedCleanup(factory, service);
    clock(changedWall, expiredMonotonic);
    assert.deepEqual(factory.snapshot(id), record, "checkpoint remains present before release");
    release();
    assert.deepEqual(await outcome, { status: "rejected", message: "Checkpoint operation failed" });
    assert.equal(factory.transactionCount(), before + 1, "one cleanup transaction started");
    assert.equal(factory.snapshot(id), undefined, "deletion committed despite rejected cleanup");
    clock(expiredWall, expiredMonotonic);
    await assert.rejects(service.cleanup(), { message: "Checkpoint operation failed" });
    await assert.rejects(service.read(id), { message: "Checkpoint operation failed" });
    assert.equal(factory.transactionCount(), before + 1, "post-commit clock latch blocks subsequent transactions");
  });
}

for (const abort of [true, false]) {
  test(`all five public operations share cleanup and stay blocked after ${abort ? "verified abort" : "commit with clock uncertainty"}`, async () => {
    const { factory, service, clock } = await setup();
    clock(expiredWall, expiredMonotonic);
    const { release, outcome, before } = await pausedCleanup(factory, service);
    const fresh = { ...record, runId: "12345678-1234-4123-8123-123456789abd", createdAt: expiredWall };
    const waiting = Promise.allSettled([
      service.create(fresh), service.read(id), service.transition(id, "draft", 0, "ready"),
      service.delete(id, 0, "explicit"), service.cleanup(),
    ]);
    assert.equal(factory.transactionCount(), before + 1, "all callers wait on the same pass");
    if (abort) factory.abortNext();
    else clock(expiredWall - 1);
    release();
    assert.deepEqual(await outcome, { status: "rejected", message: "Checkpoint operation failed" });
    for (const result of await waiting) {
      assert.equal(result.status, "rejected");
      assert.equal(result.reason.message, "Checkpoint operation failed");
    }
    assert.equal(factory.transactionCount(), before + 1, "no caller starts its own transaction");
    assert.deepEqual(factory.snapshot(id), abort ? record : undefined);
    assert.equal(factory.snapshot(fresh.runId), undefined, "no fresh-run workaround");
    clock(expiredWall, expiredMonotonic);
    if (abort) assert.equal(await service.cleanup(), 1, "only a fresh guarded request follows a verified abort");
    else {
      await assert.rejects(service.cleanup(), { message: "Checkpoint operation failed" });
      assert.equal(factory.transactionCount(), before + 1, "committed-but-uncertain pass stays latched");
    }
  });
}
