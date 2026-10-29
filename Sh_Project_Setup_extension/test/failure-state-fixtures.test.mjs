import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { FAILURE_SCENARIOS } from "../fixtures/scenarios/failure-states.mjs";
import { CONTRACT_VERSION, PROVIDERS, validateAdapterResult } from "../src/adapters/contract.mjs";

const byId = Object.fromEntries(FAILURE_SCENARIOS.map(item => [item.id, item]));
const rejects = (item, change) => assert.throws(() => validateAdapterResult({ ...item.result, ...change }, item.request, item.capability),
  /^Error: Invalid adapter contract$/);

test("stable, immutable catalog covers F01–F07 and all site providers", () => {
  assert.deepEqual(FAILURE_SCENARIOS.map(item => item.id), ["F01", "F02", "F03-login", "F03-mfa", "F03-captcha", "F04",
    "F05-timeout", "F05-interrupted", "F05-unknown", "F06", "F07-submit", "F07-connect"]);
  assert.equal(new Set(FAILURE_SCENARIOS.map(item => item.id)).size, FAILURE_SCENARIOS.length);
  assert.deepEqual(new Set(FAILURE_SCENARIOS.map(item => item.capability.provider)), new Set(PROVIDERS));
  assert.ok(Object.isFrozen(FAILURE_SCENARIOS));
  for (const item of FAILURE_SCENARIOS) {
    for (const value of [item, item.capability, item.request, item.request.parameters, item.request.target, item.request.context, item.result]) {
      assert.ok(Object.isFrozen(value), item.id);
    }
    assert.equal(item.capability.version, CONTRACT_VERSION);
    assert.equal(item.request.version, CONTRACT_VERSION);
    assert.equal(validateAdapterResult(item.result, item.request, item.capability), item.result);
    assert.equal(item.result.evidenceTier, "SIMULATED");
    assert.equal(item.result.verification, "none");
    assert.equal(item.result.reviewRequired, true);
    assert.notEqual(item.result.status, "observed");
    rejects(item, { status: "observed" });
  }
});

test("unsupported DOM and unverified module availability cannot become success", () => {
  assert.deepEqual(byId.F01.request.parameters, { "unknown-dom": true });
  assert.equal(byId.F01.capability.classification, "unverified");
  assert.equal(byId.F01.result.status, "unknown");
  assert.equal(byId.F01.checkpoint, "manual-page-review");
  assert.deepEqual(byId.F06.request.parameters, { available: true, installed: false });
  assert.equal(byId.F06.result.status, "unknown");
  assert.equal(byId.F06.checkpoint, "installation-review");
});

test("wrong target and definite pre-write permission denial remain blocked or failed", () => {
  assert.equal(byId.F02.result.category, "target-mismatch");
  assert.equal(byId.F02.result.status, "blocked");
  assert.equal(byId.F02.capability.classification, "blocked");
  assert.equal(byId.F04.result.category, "permission");
  assert.equal(byId.F04.result.status, "failed");
  for (const item of [byId.F02, byId.F04]) {
    assert.equal(item.result.reconciliationRequired, false);
    assert.equal(item.result.retrySafety, "unsafe");
    rejects(item, { target: { ...item.result.target, environment: "other" } });
  }
});

test("login, MFA and CAPTCHA require distinct manual operator checkpoints", () => {
  for (const [id, checkpoint] of [["F03-login", "manual-login"], ["F03-mfa", "manual-mfa"], ["F03-captcha", "manual-captcha"]]) {
    const item = byId[id];
    assert.equal(item.checkpoint, checkpoint);
    assert.equal(item.capability.classification, "blocked");
    assert.equal(item.result.status, "blocked");
    assert.equal(item.result.reconciliationRequired, false);
  }
});

test("possible writes require reconciliation before any retry", () => {
  for (const id of ["F05-timeout", "F05-interrupted", "F05-unknown", "F07-submit", "F07-connect"]) {
    const item = byId[id];
    assert.equal(item.request.parameters["possible-write"], true);
    assert.equal(item.result.status, "unknown");
    assert.equal(item.result.retrySafety, "reconcile-first");
    assert.equal(item.result.reconciliationRequired, true);
    assert.equal(item.checkpoint, "reconcile-before-retry");
    rejects(item, { retrySafety: "safe" });
    rejects(item, { reconciliationRequired: false });
    rejects(item, { status: "failed", retrySafety: "unsafe", reconciliationRequired: false });
  }
  assert.deepEqual([byId["F05-timeout"], byId["F05-interrupted"], byId["F05-unknown"]].map(item => item.result.category),
    ["timeout", "interrupted", "unknown-outcome"]);
  assert.equal(byId["F07-connect"].capability.classification, "unverified");
});

test("fixture source has no external resources, provider calls or sensitive values", () => {
  const source = readFileSync(new URL("../fixtures/scenarios/failure-states.mjs", import.meta.url), "utf8");
  assert.doesNotMatch(source, /https?:|fetch\s*\(|XMLHttpRequest|chrome\.|<script|(?:password|token|secret|credential|private.key)\s*[:=]/i);
  assert.ok(FAILURE_SCENARIOS.every(item => /^[a-z][a-z0-9-]*$/.test(item.request.target.reference)));
});
