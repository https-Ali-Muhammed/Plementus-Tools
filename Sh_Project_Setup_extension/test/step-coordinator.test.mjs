import test from "node:test";
import assert from "node:assert/strict";
import { createStepCoordinator } from "../src/workflow/step-coordinator.mjs";
import { FAILURE_SCENARIOS } from "../fixtures/scenarios/failure-states.mjs";

const target = { provider: "odoo-sh", reference: "fixture-target", environment: "test" };
const step = (n = 1) => ({
  capability: { version: 1, provider: "odoo-sh", operation: "inspect-page", classification: "supported", mutates: false },
  request: { version: 1, operation: "inspect-page", parameters: { limit: 1 }, target: { ...target },
    context: { run: "fixture-run", step: `fixture-step-${n}` } },
});
const plan = (...steps) => ({ run: "fixture-run", steps: steps.length ? steps : [step()] });
const observed = () => ({ version: 1, operation: "inspect-page", target: { ...target }, status: "observed",
  evidenceTier: "SIMULATED", category: "none", retrySafety: "safe", reviewRequired: false,
  reconciliationRequired: false, verification: "none" });
const submission = (n = 1, result = observed()) => ({ run: "fixture-run", step: `fixture-step-${n}`, result });
const invalid = fn => assert.throws(fn, /^Error: Step coordination failed$/);

test("declared order is preserved and next alone never advances", () => {
  const c = createStepCoordinator(plan(step(2), step(1)));
  assert.deepEqual(c.next(), { decision: "fixture_result_required", index: 0, total: 2, evidenceTier: "SIMULATED", retryAllowed: false });
  assert.equal(c.next().index, 0);
  assert.equal(c.submit(submission(2)).index, 1);
  assert.equal(c.submit(submission(1)).decision, "completed");
  assert.equal(c.next().index, 2);
});

test("empty, malformed, sparse, oversized and duplicate plans are rejected", () => {
  for (const p of [null, {}, [], { run: "fixture-run", steps: [] }, plan(null),
    { ...plan(), steps: Array(2) }, { ...plan(), steps: Array.from({ length: 33 }, (_, i) => step(i + 1)) },
    plan(step(), step()), { ...plan(), extra: true }]) invalid(() => createStepCoordinator(p));
  assert.equal(createStepCoordinator(plan(...Array.from({ length: 32 }, (_, i) => step(i + 1)))).next().total, 32);
});

test("unsupported operation/provider and spoofed mutation semantics are rejected", () => {
  for (const change of [s => { s.capability.operation = s.request.operation = "unsupported"; },
    s => { s.capability.provider = s.request.target.provider = "other"; }, s => { s.capability.version = 2; },
    s => { s.request.version = 2; }, s => { s.capability.operation = s.request.operation = "create-project"; },
    s => { s.capability.provider = s.request.target.provider = "plementus"; }]) {
    const s = step(); change(s); invalid(() => createStepCoordinator(plan(s)));
  }
});

test("the entire plan is checked for wrong target, run, step and request operation", () => {
  for (const change of [s => { s.request.target.reference = "other-target"; },
    s => { s.request.target.environment = "production"; }, s => { s.request.context.run = "other-run"; },
    s => { s.request.context.step = "other-step"; }, s => { s.request.operation = "inspect-module"; }]) {
    const s = step(2); change(s); invalid(() => createStepCoordinator(plan(step(), s)));
  }
});

test("blocked and unverified capabilities cannot accept success", () => {
  for (const classification of ["blocked", "unverified"]) {
    const s = step(); s.capability.classification = classification;
    const c = createStepCoordinator(plan(s));
    assert.equal(c.next().decision, "blocked");
    invalid(() => c.submit(submission()));
    assert.equal(c.next().index, 0);
  }
});

test("blocked, failed and unknown reads stop permanently without retry", () => {
  for (const [status, category, decision] of [["blocked", "permission", "blocked"],
    ["failed", "provider-error", "failed"], ["unknown", "timeout", "reconcile_required"]]) {
    const c = createStepCoordinator(plan(step(), step(2)));
    assert.equal(c.submit(submission(1, { ...observed(), status, category, reviewRequired: true })).decision, decision);
    invalid(() => c.submit(submission()));
    assert.equal(c.next().decision, decision);
    assert.equal(c.next().index, 0);
    assert.equal(c.next().retryAllowed, false);
  }
});

test("approval handle cannot authorize a mutation or elevate fixture evidence", () => {
  const s = FAILURE_SCENARIOS.find(s => s.id === "F05-timeout");
  const c = createStepCoordinator(plan({ capability: s.capability, request: s.request }));
  assert.equal(c.next().decision, "awaiting_operator");
  for (const evidenceTier of ["SIMULATED", "ODOO_SH_DEMO_VERIFIED"]) invalid(() =>
    createStepCoordinator(plan({ capability: s.capability, request: s.request })).submit({ run: "fixture-run", step: s.request.context.step,
    result: { ...s.result, status: "observed", category: "none", reconciliationRequired: false,
      retrySafety: "unsafe", verification: "provider-state", evidenceTier } }));
  assert.equal(c.next().index, 0);
  const request = structuredClone(s.request); delete request.approvalReference;
  invalid(() => createStepCoordinator(plan({ capability: s.capability, request })));
});

test("F01–F07 injection records uncertainty and failures without executing mutations", () => {
  for (const s of FAILURE_SCENARIOS) {
    const c = createStepCoordinator(plan({ capability: s.capability, request: s.request }, step(2)));
    assert.equal(c.next().decision, s.capability.classification !== "supported" ? "blocked" : "awaiting_operator");
    const expected = ["F01", "F06", "F05-timeout", "F05-interrupted", "F05-unknown", "F07-submit", "F07-connect"].includes(s.id) ?
      "reconcile_required" : s.id === "F04" ? "failed" : "blocked";
    const value = { run: "fixture-run", step: s.request.context.step, result: s.result };
    const decision = c.submit(value);
    assert.equal(decision.decision, expected, s.id);
    assert.equal(decision.index, 0, s.id);
    assert.equal(decision.evidenceTier, "SIMULATED");
    invalid(() => c.submit(value));
    assert.deepEqual(c.next(), decision);
  }
});

test("duplicate results cannot advance twice even after completion", () => {
  for (const steps of [[step(), step(2)], [step()]]) {
    const c = createStepCoordinator(plan(...steps)); c.submit(submission());
    invalid(() => c.submit(submission()));
    assert.equal(c.next().index, 1);
    invalid(() => c.submit(submission(2)));
    assert.equal(c.next().index, 1);
  }
});

test("wrong envelope identity, target and v1 result shape latch a stop", () => {
  for (const value of [null, { ...submission(), run: "other-run" }, { ...submission(), step: "fixture-step-2" },
    { ...submission(), extra: true }, submission(1, { ...observed(), target: { ...target, provider: "plementus" } }),
    submission(1, { ...observed(), target: { ...target, reference: "other" } }),
    submission(1, { ...observed(), target: { ...target, environment: "demo" } }),
    submission(1, { ...observed(), operation: "inspect-module" }), submission(1, { ...observed(), version: 2 }),
    submission(1, { ...observed(), retrySafety: "unsafe" }), submission(1, { ...observed(), reviewRequired: true }),
    submission(1, { ...observed(), reconciliationRequired: true }), submission(1, { ...observed(), status: "success" })]) {
    const c = createStepCoordinator(plan()); invalid(() => c.submit(value));
    assert.equal(c.next().decision, "blocked"); invalid(() => c.submit(submission()));
    assert.equal(c.next().index, 0);
  }
});

test("valid-looking plan changes and reordering cannot authorize continuation", () => {
  for (const change of [p => { p.steps[0].request.parameters.limit = 2; }, p => p.steps.reverse(),
    p => p.steps.push(step(3)), p => { p.steps[0].capability.classification = "unverified"; }]) {
    const p = plan(step(), step(2)); const c = createStepCoordinator(p); change(p);
    invalid(() => c.next()); invalid(() => c.submit(submission()));
  }
});

test("sensitive strings, raw exceptions and non-SIMULATED evidence fail generically", () => {
  for (const secret of ["person@example.test", "https://private.example.test", "private-customer", "secret-value"]) {
    for (const change of [s => { s.request.parameters = { secret }; }, s => { s.request.target.reference = secret; },
      s => { s.request.context.run = secret; }, s => { s.request.context.step = secret; }, s => { s.request.secret = secret; }]) {
      const s = step(); change(s); invalid(() => createStepCoordinator(plan(s)));
    }
    const c = createStepCoordinator(plan());
    invalid(() => c.submit(submission(1, { ...observed(), rawError: new Error(secret) })));
    assert.doesNotMatch(JSON.stringify(c.next()), /private|secret|example/);
  }
  for (const evidenceTier of ["LOCAL_BROWSER_TESTED", "MANUALLY_ATTESTED", "ODOO_SH_DEMO_VERIFIED"]) {
    invalid(() => createStepCoordinator(plan()).submit(submission(1, { ...observed(), evidenceTier })));
  }
});

test("accessors, hidden fields, symbols, exotic objects and executor injection fail closed", () => {
  let accessed = false;
  for (const modify of [p => Object.defineProperty(p.steps[0], "capability", { get() { accessed = true; throw new Error("private"); } }),
    p => Object.defineProperty(p.steps[0].request.parameters, "hidden", { value: true }),
    p => { p.steps[0].request[Symbol("private")] = true; }, p => { p.steps[0].request = new Date(); },
    p => { p.execute = () => { accessed = true; }; },
    p => Object.defineProperty(p.steps, "0", { get() { accessed = true; return step(); } })]) {
    const p = plan(); modify(p); invalid(() => createStepCoordinator(p));
  }
  const c = createStepCoordinator(plan()); const value = submission();
  Object.defineProperty(value, "result", { get() { accessed = true; throw new Error("private"); } });
  invalid(() => c.submit(value)); assert.equal(accessed, false);
});

test("decision mutation cannot bypass state and instances share no progress", () => {
  const c = createStepCoordinator(plan()); const decision = c.next();
  assert.throws(() => { decision.index = 1; }, TypeError);
  c.submit(submission()); assert.equal(createStepCoordinator(plan()).next().index, 0);
});
