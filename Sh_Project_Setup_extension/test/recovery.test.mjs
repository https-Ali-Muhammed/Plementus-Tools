import assert from "node:assert/strict";
import test from "node:test";
import { createRunRepository } from "../src/storage/run-record.mjs";
import { decideRecovery } from "../src/workflow/recovery.mjs";

const id = "12345678-1234-4123-8123-123456789abc";
const checkpoint = (state = "running") => ({ schemaVersion: 1, runId: id, state, step: 1, evidenceTier: "SIMULATED", revision: 0 });
function fake() {
  let saved = null, writes = 0;
  return {
    get: () => saved === null ? null : { ...saved },
    insert: record => { if (saved) return false; saved = { ...record }; return true; },
    corrupt: record => { saved = record; },
    externalWrite: () => { writes++; },
    get writes() { return writes; },
  };
}

test("fresh repository observes interrupted synthetic checkpoint and requires reconciliation without a write", () => {
  const adapter = fake(), input = Object.freeze(checkpoint());
  createRunRepository(adapter).create(input);
  adapter.externalWrite(); // Simulate a write whose outcome became uncertain before interruption.
  const before = adapter.get();
  assert.deepEqual(decideRecovery(adapter, id, 0), { decision: "reconcile_required", state: "running", revision: 0 });
  assert.deepEqual(decideRecovery(adapter, id, 0), { decision: "reconcile_required", state: "running", revision: 0 });
  assert.equal(adapter.writes, 1);
  assert.deepEqual(adapter.get(), before);
  assert.deepEqual(input, checkpoint());
});

test("missing, malformed, version-mismatched, stale and failing adapters fail generically", () => {
  const adapter = fake();
  assert.throws(() => decideRecovery(adapter, id, 0), { message: "Recovery decision failed" });
  for (const bad of [{ ...checkpoint(), schemaVersion: 2 }, { ...checkpoint(), token: "sensitive" }, { ...checkpoint(), state: "unknown" }]) {
    adapter.corrupt(bad);
    assert.throws(() => decideRecovery(adapter, id, 0), { message: "Recovery decision failed" });
    assert.deepEqual(adapter.get(), bad);
  }
  adapter.corrupt(checkpoint());
  for (const rev of [1, -1, 0.5, NaN]) assert.throws(() => decideRecovery(adapter, id, rev), { message: "Recovery decision failed" });
  assert.throws(() => decideRecovery({ get() { throw new Error("sensitive"); } }, id, 0), { message: "Recovery decision failed" });
  assert.deepEqual(adapter.get(), checkpoint());
});

test("terminal, uncertain and other states never auto-start", () => {
  for (const [state, decision] of Object.entries({ completed: "terminal", cancelled: "terminal", running: "reconcile_required", awaiting_operator: "reconcile_required", reconcile_required: "reconcile_required", failed: "reconcile_required", draft: "operator_review", ready: "operator_review", blocked: "operator_review" })) {
    const adapter = fake(); createRunRepository(adapter).create(checkpoint(state));
    assert.deepEqual(decideRecovery(adapter, id, 0), { decision, state, revision: 0 });
    assert.equal(adapter.writes, 0);
  }
});
