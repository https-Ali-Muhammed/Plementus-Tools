import test from "node:test";
import assert from "node:assert/strict";
import { createPauseControl } from "../src/workflow/pause-control.mjs";
import { createApprovalCheckpoint } from "../src/workflow/approval-checkpoint.mjs";
import { FAILURE_SCENARIOS } from "../fixtures/scenarios/failure-states.mjs";

const target = { provider: "odoo-sh", reference: "fixture-target", environment: "test" };
const step = (n = 1) => ({
  capability: { version: 1, provider: "odoo-sh", operation: "inspect-page", classification: "supported", mutates: false },
  request: { version: 1, operation: "inspect-page", parameters: { limit: 1 }, target: { ...target },
    context: { run: "fixture-run", step: `fixture-step-${n}` } },
});
const plan = (...steps) => ({ run: "fixture-run", steps: steps.length ? steps : [step()] });
const mutation = () => {
  const { capability, request } = FAILURE_SCENARIOS.find(s => s.id === "F05-timeout");
  return structuredClone({ capability, request });
};
const observed = () => ({ version: 1, operation: "inspect-page", target: { ...target }, status: "observed",
  evidenceTier: "SIMULATED", category: "none", retrySafety: "safe", reviewRequired: false,
  reconciliationRequired: false, verification: "none" });
const submission = (n = 1, result = observed()) => ({ run: "fixture-run", step: `fixture-step-${n}`, result });
const command = (c, action, s = step()) => ({ version: 1, checkpoint: c.next(), run: "fixture-run",
  step: s.request.context.step, operation: s.request.operation, target: { ...s.request.target }, action });
const invalid = fn => assert.throws(fn, /^Error: Pause control failed$/);
const state = (c, name, index = 0) => {
  const d = c.next();
  assert.equal(d.decision, name); assert.equal(d.index, index);
  assert.equal(d.evidenceTier, "SIMULATED"); assert.equal(d.retryAllowed, false);
  assert.equal(d.executionAuthorized, false);
  assert.equal(d.reconciliationRequired, name === "reconcile_required");
  return d;
};

test("pause preserves a supported read position and returns a sanitized frozen decision", () => {
  const c = createPauseControl(plan(step(), step(2)));
  assert.deepEqual(c.control(command(c, "pause")), { decision: "paused", index: 0, total: 2,
    evidenceTier: "SIMULATED", retryAllowed: false, executionAuthorized: false, reconciliationRequired: false });
  const d = state(c, "paused");
  assert.equal(Object.isFrozen(d), true); assert.strictEqual(c.next(), d);
  assert.equal(JSON.stringify(d).includes("fixture-target"), false);
});

test("resume changes no step and only explicit ordered results advance afterward", () => {
  const c = createPauseControl(plan(step(2), step(), step(3)));
  c.control(command(c, "pause", step(2)));
  c.control(command(c, "resume", step(2))); state(c, "fixture_result_required");
  assert.equal(c.next().index, 0);
  c.submit(submission(2)); state(c, "fixture_result_required", 1);
  c.control(command(c, "pause")); c.control(command(c, "resume"));
  c.submit(submission()); state(c, "fixture_result_required", 2);
  c.submit(submission(3)); state(c, "completed", 3);
});

test("mutation pause and resume leave review pending even after simulated approval", () => {
  const s = mutation(); const c = createPauseControl(plan(s));
  c.control(command(c, "pause", s)); state(c, "paused");
  const review = createApprovalCheckpoint(s); const preview = review.preview();
  const intent = review.submit({ version: 1, checkpoint: preview, run: preview.run, step: preview.step,
    operation: preview.operation, target: { ...preview.target }, approvalReference: preview.approvalReference, choice: "approve" });
  assert.equal(intent.executionAuthorized, false);
  c.control(command(c, "resume", s)); state(c, "awaiting_operator");
  invalid(() => c.submit({ run: "fixture-run", step: s.request.context.step, result: intent }));
  state(c, "blocked");
});

test("neither synthetic nor provider-tier observed mutation results authorize execution", () => {
  for (const evidenceTier of ["SIMULATED", "ODOO_SH_DEMO_VERIFIED"]) {
    const s = mutation(); const c = createPauseControl(plan(s));
    c.control(command(c, "pause", s)); c.control(command(c, "resume", s));
    invalid(() => c.submit({ run: "fixture-run", step: s.request.context.step, result: {
      ...observed(), operation: "create-project", evidenceTier, retrySafety: "unsafe", reviewRequired: true,
      verification: "provider-state" } }));
    state(c, "blocked");
  }
});

test("cancel before starting or after pause is terminal without moving the step", () => {
  for (const paused of [false, true]) {
    const c = createPauseControl(plan());
    if (paused) c.control(command(c, "pause"));
    const d = c.control(command(c, "cancel")); state(c, "cancelled");
    for (const action of ["pause", "resume", "cancel"]) invalid(() => c.control(command(c, action)));
    invalid(() => c.submit(submission())); assert.strictEqual(c.next(), d);
  }
});

test("attempted result submission while paused latches a block with no advancement", () => {
  const c = createPauseControl(plan(step(), step(2))); c.control(command(c, "pause"));
  invalid(() => c.submit(submission())); state(c, "blocked");
  invalid(() => c.control(command(c, "resume"))); state(c, "blocked");
});

test("pause resume and cancel never clear unknown reads or uncertain mutations", () => {
  const s = mutation();
  for (const p of [plan(), plan(s)]) {
    const c = createPauseControl(p);
    const result = p.steps[0].capability.mutates ? FAILURE_SCENARIOS.find(s => s.id === "F05-timeout").result :
      { ...observed(), status: "unknown", category: "timeout", reviewRequired: true };
    c.submit({ run: "fixture-run", step: p.steps[0].request.context.step, result });
    const d = state(c, "reconcile_required");
    for (const action of ["pause", "resume", "cancel"]) invalid(() => c.control(command(c, action, p.steps[0])));
    invalid(() => c.submit(submission())); assert.strictEqual(c.next(), d);
  }
});

test("all existing F01–F07 outcomes retain their coordinator stop and cannot be resumed", () => {
  for (const s of FAILURE_SCENARIOS) {
    const c = createPauseControl(plan({ capability: s.capability, request: s.request }, step(2)));
    const expected = ["F01", "F06", "F05-timeout", "F05-interrupted", "F05-unknown", "F07-submit", "F07-connect"].includes(s.id) ?
      "reconcile_required" : s.id === "F04" ? "failed" : "blocked";
    c.submit({ run: "fixture-run", step: s.request.context.step, result: s.result });
    const d = state(c, expected);
    for (const action of ["pause", "resume", "cancel"]) invalid(() => c.control(command(c, action, s)));
    assert.strictEqual(c.next(), d);
  }
});

test("blocked declarations cannot be paused cancelled or admitted as safe results", () => {
  for (const classification of ["blocked", "unverified"]) {
    for (const action of ["pause", "resume", "cancel"]) {
      const s = step(); s.capability.classification = classification;
      const c = createPauseControl(plan(s)); invalid(() => c.control(command(c, action, s)));
      invalid(() => c.submit(submission())); state(c, "blocked");
    }
  }
});

test("invalid sequence duplicate controls and consumed decisions fail closed", () => {
  for (const scenario of ["resume-active", "duplicate-pause", "duplicate-resume", "stale-after-result"]) {
    const c = createPauseControl(plan(step(), step(2)));
    if (scenario === "resume-active") invalid(() => c.control(command(c, "resume")));
    if (scenario === "duplicate-pause") {
      const v = command(c, "pause"); c.control(v); invalid(() => c.control(v));
    }
    if (scenario === "duplicate-resume") {
      c.control(command(c, "pause")); const v = command(c, "resume"); c.control(v); invalid(() => c.control(v));
    }
    if (scenario === "stale-after-result") {
      const v = command(c, "pause"); c.submit(submission()); invalid(() => c.control(v));
    }
    state(c, "blocked", scenario === "stale-after-result" ? 1 : 0);
  }
});

test("controls bind run step operation provider target environment and version", () => {
  for (const change of [v => { v.run = "other-run"; }, v => { v.step = "fixture-step-2"; },
    v => { v.operation = "inspect-module"; }, v => { v.target.provider = "plementus"; },
    v => { v.target.reference = "other-target"; }, v => { v.target.environment = "production"; },
    v => { v.version = 2; }, v => { v.action = "retry"; }]) {
    const c = createPauseControl(plan()); const v = command(c, "pause"); change(v);
    invalid(() => c.control(v)); state(c, "blocked");
    invalid(() => c.control(command(c, "cancel"))); state(c, "blocked");
  }
});

test("copied serialized foreign and old-cycle decisions cannot resume", () => {
  for (const replace of [p => ({ ...p }), p => JSON.parse(JSON.stringify(p)), () => null,
    () => { const c = createPauseControl(plan()); return c.control(command(c, "pause")); }]) {
    const c = createPauseControl(plan()); c.control(command(c, "pause"));
    const v = command(c, "resume"); v.checkpoint = replace(v.checkpoint);
    invalid(() => c.control(v)); state(c, "blocked");
  }
  const c = createPauseControl(plan()); c.control(command(c, "pause")); const old = command(c, "resume");
  c.control(old); c.control(command(c, "pause")); invalid(() => c.control(old)); state(c, "blocked");
});

test("recreated controllers cannot resume an old paused instance or copy its position", () => {
  const p = plan(step(), step(2)); const first = createPauseControl(p); first.submit(submission());
  first.control(command(first, "pause", step(2))); const old = command(first, "resume", step(2));
  const second = createPauseControl(structuredClone(p)); state(second, "fixture_result_required");
  invalid(() => second.control(old)); state(second, "blocked"); state(first, "paused", 1);
  first.control(old); state(first, "fixture_result_required", 1);
});

test("the same admitted plan object cannot create fresh work around paused or blocked state", () => {
  const p = plan(); const c = createPauseControl(p); c.control(command(c, "pause"));
  invalid(() => createPauseControl(p));
  invalid(() => c.control(command(c, "pause"))); state(c, "blocked");
  invalid(() => createPauseControl(p));
});

test("constructor reflection cannot recursively admit the same plan twice", () => {
  let attempted = false;
  let nested;
  let rejected = 0;
  const p = new Proxy(plan(), { getPrototypeOf(value) {
    if (!attempted) {
      attempted = true;
      try { nested = createPauseControl(p); }
      catch (error) { assert.match(String(error), /^Error: Pause control failed$/); rejected++; }
    }
    return Object.getPrototypeOf(value);
  } });
  const c = createPauseControl(p);
  assert.equal(nested, undefined); assert.equal(rejected, 1);
  c.control(command(c, "pause")); state(c, "paused");
  invalid(() => createPauseControl(p));
});

test("duplicate results after resume cannot advance a second time", () => {
  const c = createPauseControl(plan(step(), step(2)));
  c.control(command(c, "pause")); c.control(command(c, "resume")); c.submit(submission());
  invalid(() => c.submit(submission())); state(c, "blocked", 1);
  invalid(() => c.submit(submission(2))); state(c, "blocked", 1);
});

test("changed admitted plans block resume even if later restored", () => {
  for (const change of [p => { p.run = "other-run"; }, p => { p.steps[0].request.parameters.limit = 2; },
    p => { p.steps[0].capability.classification = "unverified"; }, p => p.steps.reverse(),
    p => p.steps.push(step(3)), p => { p.steps[0].request.target.reference = "other-target"; }]) {
    const p = plan(step(), step(2)); const original = structuredClone(p); const c = createPauseControl(p);
    c.control(command(c, "pause")); const v = command(c, "resume"); change(p);
    invalid(() => c.control(v)); p.run = original.run; p.steps = original.steps;
    state(c, "blocked"); invalid(() => c.control(command(c, "resume"))); state(c, "blocked");
  }
});

test("plan validation covers bounds duplicates semantics and future steps", () => {
  for (const p of [null, {}, [], plan(null), { run: "fixture-run", steps: [] },
    plan(step(), step()), { ...plan(), steps: Array(2) }, plan(...Array.from({ length: 33 }, (_, i) => step(i + 1)))]) {
    invalid(() => createPauseControl(p));
  }
  for (const change of [s => { s.request.target.environment = "production"; },
    s => { s.request.context.run = "other-run"; }, s => { s.request.context.step = "other-step"; },
    s => { s.capability.mutates = true; s.request.approvalReference = "fixture-approval"; },
    s => { s.request.operation = s.capability.operation = "invented"; }]) {
    const s = step(2); change(s); invalid(() => createPauseControl(plan(step(), s)));
  }
  assert.equal(createPauseControl(plan(...Array.from({ length: 32 }, (_, i) => step(i + 1)))).next().total, 32);
});

test("malformed controls and results latch generic errors with no implicit defaults", () => {
  for (const make of [() => null, () => ({}), () => [], () => new Date(), () => Object.create(null),
    c => ({ ...command(c, "pause"), extra: true }), c => ({ ...command(c, "pause"), action: true }),
    c => { const v = command(c, "pause"); delete v.target; return v; }]) {
    const c = createPauseControl(plan()); invalid(() => c.control(make(c))); state(c, "blocked");
  }
  for (const make of [() => null, () => ({ ...submission(), run: "other-run" }),
    () => ({ ...submission(), step: "fixture-step-2" }), () => submission(1, { ...observed(), evidenceTier: "LOCAL_BROWSER_TESTED" }),
    () => submission(1, { ...observed(), target: { ...target, reference: "other-target" } })]) {
    const c = createPauseControl(plan()); invalid(() => c.submit(make())); state(c, "blocked");
  }
});

test("accessors hidden fields symbols cyclic and exotic objects never invoke getters", () => {
  let calls = 0;
  for (const change of [p => Object.defineProperty(p.steps[0].request, "operation", { get() { calls++; return "inspect-page"; } }),
    p => Object.defineProperty(p.steps, "0", { get() { calls++; return step(); } }),
    p => Object.defineProperty(p.steps[0].request.parameters, "hidden", { value: true }),
    p => { p.steps[0][Symbol("secret")] = true; }, p => { p.steps[0].request.parameters = p; },
    p => { p.steps[0].request.parameters = new Map(); }, p => { p.steps.extra = true; },
    p => { p.execute = () => { calls++; }; }]) {
    const p = plan(); change(p); invalid(() => createPauseControl(p));
  }
  for (const action of ["control", "submit"]) {
    const c = createPauseControl(plan()); const v = action === "control" ? command(c, "pause") : submission();
    Object.defineProperty(v, action === "control" ? "action" : "result", { get() { calls++; throw new Error("secret"); } });
    invalid(() => c[action](v)); state(c, "blocked");
  }
  assert.equal(calls, 0);
});

test("throwing revoked and reentrant proxies fail closed without raw exceptions", () => {
  const hostile = new Proxy({}, { getPrototypeOf() { throw new Error("private-secret"); } });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const value of [hostile, revoked.proxy]) {
    invalid(() => createPauseControl(value));
    for (const method of ["control", "submit"]) {
      const c = createPauseControl(plan()); invalid(() => c[method](value)); state(c, "blocked");
    }
  }
  const c = createPauseControl(plan()); const v = command(c, "pause");
  const reentrant = new Proxy(v, { getPrototypeOf(obj) {
    invalid(() => c.control(v)); return Object.getPrototypeOf(obj);
  } });
  invalid(() => c.control(reentrant)); state(c, "blocked");
});

test("invalid observations during pause latch security blocks and retain uncertainty", () => {
  for (const uncertain of [false, true]) {
    const p = plan(); const c = createPauseControl(p);
    if (uncertain) c.submit(submission(1, { ...observed(), status: "unknown", category: "timeout", reviewRequired: true }));
    else c.control(command(c, "pause"));
    p.steps[0].request.parameters.limit = 2; invalid(() => c.next());
    p.steps[0].request.parameters.limit = 1;
    state(c, uncertain ? "reconcile_required" : "blocked");
  }
});

test("completed and failed decisions cannot be relabelled by cancellation", () => {
  for (const result of [observed(), { ...observed(), status: "failed", category: "provider-error", reviewRequired: true }]) {
    const c = createPauseControl(plan()); const d = c.submit(submission(1, result));
    for (const action of ["pause", "resume", "cancel"]) invalid(() => c.control(command(c, action)));
    invalid(() => c.submit(submission())); assert.strictEqual(c.next(), d);
  }
});

test("generic errors and public decisions disclose no customer strings or raw exceptions", () => {
  for (const secret of ["person@example.test", "https://private.example.test", "private-customer", "secret-value", "x".repeat(10000)]) {
    const p = plan(); p.steps[0].request.target.reference = secret; invalid(() => createPauseControl(p));
    const c = createPauseControl(plan()); const v = command(c, "pause"); v.run = secret;
    invalid(() => c.control(v));
    const d = state(c, "blocked"); assert.doesNotMatch(JSON.stringify(d), /private|secret|example|https/);
    assert.ok(JSON.stringify(d).length < 256);
    const other = createPauseControl(plan()); invalid(() => other.submit({ ...submission(), rawError: new Error(secret) }));
    state(other, "blocked");
  }
});

test("frozen public API and decisions expose no mutable coordinator or recovery bypass", () => {
  const c = createPauseControl(plan()); const d = c.next();
  assert.deepEqual(Object.keys(c).sort(), ["control", "next", "submit"]);
  assert.equal(Object.isFrozen(c), true); assert.equal(Object.isFrozen(d), true);
  assert.throws(() => { d.decision = "completed"; }, TypeError);
  assert.throws(() => { c.submit = () => {}; }, TypeError);
  c.control(command(c, "pause")); state(c, "paused");
});

test("control and result paths never access storage providers network or retry timers", () => {
  const keys = ["fetch", "chrome", "indexedDB", "localStorage", "sessionStorage", "XMLHttpRequest", "WebSocket", "setTimeout", "setInterval"];
  const originals = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key));
  let accesses = 0;
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, get() {
      accesses++; throw new Error("Forbidden external access");
    } });
    const c = createPauseControl(plan(step(), step(2))); c.control(command(c, "pause"));
    c.control(command(c, "resume")); c.submit(submission()); c.control(command(c, "cancel", step(2)));
    invalid(() => c.submit(submission(2))); state(c, "cancelled", 1);
    const s = mutation(); const other = createPauseControl(plan(s));
    other.submit({ run: "fixture-run", step: s.request.context.step, result: FAILURE_SCENARIOS.find(s => s.id === "F05-timeout").result });
    invalid(() => other.control(command(other, "resume", s))); state(other, "reconcile_required");
    assert.equal(accesses, 0);
  } finally {
    keys.forEach((key, i) => originals[i] ? Object.defineProperty(globalThis, key, originals[i]) : delete globalThis[key]);
  }
});
