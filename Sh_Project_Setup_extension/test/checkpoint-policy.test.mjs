import assert from "node:assert/strict";
import test from "node:test";
import { checkpointEligibility, RETENTION_MS, validateCheckpointStructure, validateCheckpointUpdate } from "../src/storage/checkpoint-policy.mjs";
import { WORKFLOW_STATES } from "../src/workflow/state.mjs";

const record = () => ({ schemaVersion: 2, runId: "12345678-1234-4123-8123-123456789abc", state: "draft", step: 0, evidenceTier: "none", revision: 0, createdAt: 1000 });

test("accepts the exact v2 schema and existing bounded states", () => {
  for (const state of WORKFLOW_STATES) assert.equal(validateCheckpointStructure({ ...record(), state }), true);
  assert.equal(checkpointEligibility(record(), 1000), "eligible");
  for (const change of [{ schemaVersion: 1 }, { schemaVersion: 3 }, { state: "unknown" }, { runId: "customer" }, { step: 100 }, { evidenceTier: "secret" }, { revision: Number.MAX_SAFE_INTEGER }]) {
    assert.equal(validateCheckpointStructure({ ...record(), ...change }), false);
  }
});

test("rejects every missing field, extra, sensitive, inherited, accessor and symbol", () => {
  for (const key of Object.keys(record())) { const input = record(); delete input[key]; assert.equal(validateCheckpointStructure(input), false); }
  for (const key of ["extra", "token", "customerName", "subscriptionReference", "url", "repository"]) assert.equal(validateCheckpointStructure({ ...record(), [key]: "secret" }), false);
  assert.equal(validateCheckpointStructure({ ...record(), [Symbol("secret")]: 1 }), false);
  assert.equal(validateCheckpointStructure(Object.assign(Object.create({ extra: 1 }), record())), false);
  const accessor = record(); Object.defineProperty(accessor, "state", { enumerable: true, get() { throw Error("secret"); } });
  assert.equal(validateCheckpointStructure(accessor), false);
  const hidden = record(); Object.defineProperty(hidden, "step", { value: 0, enumerable: false });
  assert.equal(validateCheckpointStructure(hidden), false);
});

test("validates time, overflow and the exact expiry boundary", () => {
  for (const createdAt of [undefined, null, -1, 1.5, NaN, Infinity, "1000", Number.MAX_SAFE_INTEGER]) assert.equal(validateCheckpointStructure({ ...record(), createdAt }), false);
  assert.equal(checkpointEligibility(record(), 999), "invalid");
  for (const now of [-1, 1.5, NaN, Infinity, "1000", Number.MAX_SAFE_INTEGER + 1]) assert.equal(checkpointEligibility(record(), now), "invalid");
  assert.equal(checkpointEligibility(record(), 1000 + RETENTION_MS - 1), "eligible");
  assert.equal(checkpointEligibility(record(), 1000 + RETENTION_MS), "expired");
  assert.equal(validateCheckpointStructure(record()), true);
  assert.equal(checkpointEligibility(record(), 1000 + RETENTION_MS + 1), "expired");
});

test("updates cannot change creation time or renew expiry", () => {
  const current = Object.freeze(record()), proposed = Object.freeze({ ...current, revision: 1 });
  assert.equal(validateCheckpointUpdate(current, proposed, 1001), true);
  assert.equal(validateCheckpointUpdate(current, { ...proposed, createdAt: 1001 }, 1001), false);
  assert.equal(validateCheckpointUpdate(current, { ...proposed, runId: "aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa" }, 1001), false);
  assert.equal(validateCheckpointUpdate(current, { ...proposed, createdAt: 1000 + RETENTION_MS }, 1000 + RETENTION_MS), false);
  assert.equal(validateCheckpointUpdate(current, proposed, 1000 + RETENTION_MS), false);
  assert.deepEqual(current, record());
  assert.deepEqual(proposed, { ...record(), revision: 1 });
});

test("trusted prior time detects rollback and failures stay generic", () => {
  assert.equal(checkpointEligibility(record(), 1200, 1200), "eligible");
  assert.equal(checkpointEligibility(record(), 1200, 1201), "invalid");
  assert.equal(checkpointEligibility(record(), 1200, NaN), "invalid");
  assert.equal(validateCheckpointUpdate(record(), record(), 1200, 1201), false);
  const hostile = new Proxy({}, { getPrototypeOf() { throw Error("secret payload"); } });
  assert.equal(validateCheckpointStructure(hostile), false);
  assert.equal(checkpointEligibility(hostile, 1200), "invalid");
});
