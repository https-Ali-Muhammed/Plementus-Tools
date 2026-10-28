import assert from "node:assert/strict";
import test from "node:test";
import { decideTransition } from "../src/workflow/transition-decision.mjs";
import { createRunRepository } from "../src/storage/run-record.mjs";

const id = "12345678-1234-4123-8123-123456789abc";
const record = (state = "ready", revision = 0) => ({ schemaVersion: 1, runId: id, state, step: 1, evidenceTier: "SIMULATED", revision });
function fake(initial) {
  let saved = { ...initial };
  return {
    get: () => ({ ...saved }),
    replace: (value, expected) => saved.revision !== expected ? false : (saved = { ...value }, true),
  };
}
const rejected = fn => assert.throws(fn, { message: "Transition decision failed" });

test("proposals preserve frozen inputs, require review and reject duplicate and repeated cancellation", () => {
  const input = Object.freeze(record());
  const proposed = decideTransition(input, "ready", 0, "cancelled");
  assert.deepEqual(proposed, { decision: "operator_review", record: { ...input, state: "cancelled", revision: 1 } });
  assert.deepEqual(input, record());
  rejected(() => decideTransition(proposed.record, "ready", 0, "cancelled"));
  rejected(() => decideTransition(proposed.record, "cancelled", 1, "cancelled"));
});

test("unknown, invalid, stale, terminal and malformed requests fail without mutation", () => {
  for (const [source, expected, rev, target] of [
    [record(), "running", 0, "running"], [record(), "ready", 1, "running"],
    [record(), "ready", 0, "ready"], [record(), "ready", 0, "unknown"],
    [record("completed"), "completed", 0, "ready"], [record("cancelled"), "cancelled", 0, "ready"],
    [record("unknown"), "unknown", 0, "ready"], [{ ...record(), token: "secret" }, "ready", 0, "running"],
    [record("ready", Number.MAX_SAFE_INTEGER - 1), "ready", Number.MAX_SAFE_INTEGER - 1, "running"],
  ]) {
    const before = { ...source }; Object.freeze(source);
    rejected(() => decideTransition(source, expected, rev, target));
    assert.deepEqual(source, before);
  }
});

test("competing proposals cannot overwrite a newer fake record using atomic repository checks", () => {
  const input = record(), adapter = fake(input), repo = createRunRepository(adapter);
  const first = decideTransition(repo.read(id), "ready", 0, "running");
  const second = decideTransition(repo.read(id), "ready", 0, "cancelled");
  repo.update(first.record, 0);
  assert.throws(() => repo.update(second.record, 0), { message: "Run record operation failed" });
  rejected(() => decideTransition(repo.read(id), "ready", 0, "cancelled"));
  assert.deepEqual(repo.read(id), first.record);
});

test("uncertain operations cannot return to ready without reconciliation; safe cancellation and blocking require review", () => {
  const uncertain = Object.freeze(record("reconcile_required"));
  rejected(() => decideTransition(uncertain, "reconcile_required", 0, "ready"));
  rejected(() => decideTransition(record("blocked"), "blocked", 0, "ready"));
  for (const target of ["cancelled", "blocked"]) {
    const result = decideTransition(uncertain, "reconcile_required", 0, target);
    assert.equal(result.decision, "operator_review");
    assert.equal(result.record.state, target);
  }
  assert.deepEqual(uncertain, record("reconcile_required"));
});
