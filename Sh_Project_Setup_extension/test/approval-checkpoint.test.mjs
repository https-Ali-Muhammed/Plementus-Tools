import test from "node:test";
import assert from "node:assert/strict";
import { createApprovalCheckpoint } from "../src/workflow/approval-checkpoint.mjs";
import { createStepCoordinator } from "../src/workflow/step-coordinator.mjs";
import { FAILURE_SCENARIOS } from "../fixtures/scenarios/failure-states.mjs";

const fixture = () => {
  const { capability, request } = FAILURE_SCENARIOS.find(s => s.id === "F05-timeout");
  return structuredClone({ capability, request });
};
const response = (checkpoint, choice = "approve") => ({
  version: 1, checkpoint, run: "fixture-run", step: "f05-timeout", operation: "create-project",
  target: { provider: "odoo-sh", reference: "fixture-target", environment: "test" },
  approvalReference: "fixture-approval", choice,
});
const invalid = fn => assert.throws(fn, /^Error: Approval review failed$/);
const pending = c => assert.deepEqual(c.status(), {
  decision: "awaiting_review", choice: null, reviewRecorded: false, terminal: false,
  executionAuthorized: false, evidenceTier: "SIMULATED",
});
const blocked = c => {
  assert.equal(c.status().decision, "blocked");
  assert.equal(c.status().terminal, true);
  assert.equal(c.status().reviewRecorded, false);
  assert.equal(c.status().executionAuthorized, false);
};

test("preview binds the synthetic mutation and omits parameter values", () => {
  const c = createApprovalCheckpoint(fixture()); pending(c);
  assert.deepEqual(c.preview(), {
    version: 1, run: "fixture-run", step: "f05-timeout", operation: "create-project",
    target: { provider: "odoo-sh", reference: "fixture-target", environment: "test" },
    approvalReference: "fixture-approval", classification: "supported", mutates: true,
    reviewRequired: true, evidenceTier: "SIMULATED", executionAuthorized: false,
  });
  assert.strictEqual(c.preview(), c.preview()); pending(c);
  assert.equal(JSON.stringify(c.preview()).includes("possible-write"), false);
});

test("only known mutation semantics may create a review", () => {
  for (const change of [f => { f.capability.mutates = false; delete f.request.approvalReference; },
    f => { f.capability.operation = f.request.operation = "inspect-page"; },
    f => { f.capability.operation = f.request.operation = "other-operation"; },
    f => { f.capability.provider = f.request.target.provider = "plementus"; }]) {
    const f = fixture(); change(f); invalid(() => createApprovalCheckpoint(f));
  }
  const { capability, request } = FAILURE_SCENARIOS[0];
  invalid(() => createApprovalCheckpoint({ capability, request }));
});

test("missing or invented approval correlation is rejected", () => {
  for (const value of [undefined, null, "", "other-approval", 1]) {
    const f = fixture(); f.request.approvalReference = value;
    invalid(() => createApprovalCheckpoint(f));
  }
  const f = fixture(); delete f.request.approvalReference;
  invalid(() => createApprovalCheckpoint(f));
});

test("v1 capability and request shapes are strictly validated", () => {
  for (const change of [f => { f.capability.version = 2; }, f => { f.request.version = 2; },
    f => { f.capability.classification = "approved"; }, f => { f.request.operation = "install-module"; },
    f => { f.request.parameters = { limit: 1001 }; }, f => { f.request.parameters = { invented: true }; },
    f => { f.request.parameters = { limit: "secret" }; }, f => { f.extra = true; },
    f => { f.request.extra = true; }, f => { delete f.capability.mutates; }]) {
    const f = fixture(); change(f); invalid(() => createApprovalCheckpoint(f));
  }
  for (const value of [null, {}, [], new Date(), Object.create(null)]) invalid(() => createApprovalCheckpoint(value));
});

test("only fixed synthetic run, step, target and environment are admitted", () => {
  for (const change of [f => { f.request.context.run = "customer-run"; },
    f => { f.request.context.step = "customer-step"; }, f => { f.request.target.reference = "customer-target"; },
    f => { f.request.target.environment = "production"; }]) {
    const f = fixture(); change(f); invalid(() => createApprovalCheckpoint(f));
  }
  const f = fixture(); f.request.context.step = "fixture-step-32";
  assert.equal(createApprovalCheckpoint(f).preview().step, "fixture-step-32");
});

for (const choice of ["approve", "deny", "cancel", "defer"]) {
  test(`${choice} records terminal intent without execution authorization`, () => {
    const c = createApprovalCheckpoint(fixture());
    const result = c.submit(response(c.preview(), choice));
    assert.deepEqual(result, { decision: "review_recorded", choice, reviewRecorded: true, terminal: true,
      executionAuthorized: false, evidenceTier: "SIMULATED" });
    assert.strictEqual(c.status(), result);
    invalid(() => c.preview());
  });
}

test("duplicate decisions and review after finalization are rejected without changing intent", () => {
  for (const choice of ["approve", "deny", "defer", "cancel"]) {
    const c = createApprovalCheckpoint(fixture()); const value = response(c.preview(), choice);
    const result = c.submit(value);
    invalid(() => c.submit(value)); invalid(() => c.submit({ ...value, choice: "approve" }));
    assert.strictEqual(c.status(), result);
  }
});

test("wrong run, step, operation, target or approval reference closes review", () => {
  for (const change of [v => { v.run = "other-run"; }, v => { v.step = "fixture-step-1"; },
    v => { v.operation = "install-module"; }, v => { v.target.provider = "plementus"; },
    v => { v.target.reference = "other-target"; }, v => { v.target.environment = "demo"; },
    v => { v.approvalReference = "other-approval"; }]) {
    const c = createApprovalCheckpoint(fixture()); const value = response(c.preview()); change(value);
    invalid(() => c.submit(value)); blocked(c);
    invalid(() => c.submit(response(value.checkpoint)));
  }
});

test("copied, serialized, mismatched and stale checkpoints are rejected", () => {
  for (const other of [p => ({ ...p }), p => JSON.parse(JSON.stringify(p)),
    () => createApprovalCheckpoint(fixture()).preview(), () => null, () => "fixture-approval"]) {
    const c = createApprovalCheckpoint(fixture());
    invalid(() => c.submit(response(other(c.preview())))); blocked(c);
  }
});

test("a simulated approval cannot be replayed against a new review", () => {
  const first = createApprovalCheckpoint(fixture()); const value = response(first.preview());
  const result = first.submit(value);
  const second = createApprovalCheckpoint(fixture());
  invalid(() => second.submit(value)); blocked(second);
  const third = createApprovalCheckpoint(fixture());
  invalid(() => third.submit(result)); blocked(third);
});

test("malformed submissions and implicit choices never record approval", () => {
  for (const make of [() => null, () => ({}), p => ({ ...response(p), version: 2 }),
    p => ({ ...response(p), choice: true }), p => ({ ...response(p), choice: "approved" }),
    p => ({ ...response(p), executionAuthorized: true }), p => ({ ...response(p), operator: "owner" }),
    p => { const v = response(p); delete v.approvalReference; return v; }]) {
    const c = createApprovalCheckpoint(fixture()); invalid(() => c.submit(make(c.preview()))); blocked(c);
  }
});

test("valid-looking input tampering blocks preview and submission", () => {
  for (const change of [f => { f.request.parameters["possible-write"] = false; },
    f => { f.capability.classification = "blocked"; }, f => { f.request.context.step = "f04"; },
    f => { f.request.target.provider = "plementus"; }]) {
    for (const action of ["preview", "submit"]) {
      const f = fixture(); const c = createApprovalCheckpoint(f); const value = response(c.preview()); change(f);
      invalid(() => action === "preview" ? c.preview() : c.submit(value)); blocked(c);
    }
  }
});

test("accessors, hidden fields, symbols and unusual objects fail without invoking getters", () => {
  let calls = 0;
  for (const change of [f => Object.defineProperty(f.request, "operation", { get() { calls++; return "create-project"; } }),
    f => Object.defineProperty(f.request.parameters, "hidden", { value: true }),
    f => { f.request[Symbol("secret")] = true; }, f => { f.request.target = new Date(); },
    f => { f.request.parameters = []; }, f => { f.request.context = Object.create(null); },
    f => { f.execute = () => { calls++; }; }, f => { f.request.parameters = { value: { deep: { deeper: {} } } }; }]) {
    const f = fixture(); change(f); invalid(() => createApprovalCheckpoint(f));
  }
  const c = createApprovalCheckpoint(fixture()); const value = response(c.preview());
  Object.defineProperty(value, "choice", { get() { calls++; throw new Error("secret"); } });
  invalid(() => c.submit(value)); blocked(c); assert.equal(calls, 0);
});

test("throwing and revoked proxies produce generic errors and close pending review", () => {
  const hostile = new Proxy({}, { getPrototypeOf() { throw new Error("private-customer-secret"); } });
  invalid(() => createApprovalCheckpoint(hostile));
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  invalid(() => createApprovalCheckpoint(revoked.proxy));
  for (const proxy of [hostile, revoked.proxy]) {
    const c = createApprovalCheckpoint(fixture()); invalid(() => c.submit(proxy)); blocked(c);
  }
  const f = fixture(); const c = createApprovalCheckpoint(f); f.request.target = hostile;
  invalid(() => c.preview()); blocked(c);
});

test("public preview, target, API and decisions resist mutation", () => {
  const c = createApprovalCheckpoint(fixture()); const p = c.preview();
  for (const value of [c, p, p.target, c.status()]) assert.equal(Object.isFrozen(value), true);
  assert.throws(() => { p.target.reference = "other"; }, TypeError);
  assert.throws(() => { p.executionAuthorized = true; }, TypeError);
  const d = c.submit(response(p));
  assert.throws(() => { d.executionAuthorized = true; }, TypeError);
  assert.throws(() => { d.choice = "deny"; }, TypeError);
  assert.equal(c.status().choice, "approve"); assert.equal(c.status().executionAuthorized, false);
});

test("generic errors and bounded output disclose no sensitive values or raw exceptions", () => {
  for (const secret of ["person@example.test", "https://private.example.test", "private-customer", "secret-value", "x".repeat(10000)]) {
    for (const change of [f => { f.request.target.reference = secret; }, f => { f.request.context.run = secret; },
      f => { f.request.parameters = { secret }; }, f => { f.request.approvalReference = secret; }]) {
      const f = fixture(); change(f); invalid(() => createApprovalCheckpoint(f));
    }
    const c = createApprovalCheckpoint(fixture()); const value = { ...response(c.preview()), rawError: new Error(secret) };
    invalid(() => c.submit(value));
    assert.doesNotMatch(JSON.stringify(c.status()), /private|secret|example|https/);
    assert.ok(JSON.stringify(c.status()).length < 256);
  }
  const c = createApprovalCheckpoint(fixture()); assert.ok(JSON.stringify(c.preview()).length < 512);
});

test("all existing Phase 05 mutation fixtures record intent without promoting capability", () => {
  for (const s of FAILURE_SCENARIOS.filter(s => s.capability.mutates)) {
    const c = createApprovalCheckpoint({ capability: s.capability, request: s.request }); const p = c.preview();
    assert.equal(p.classification, s.capability.classification);
    const d = c.submit({ ...response(p), step: s.request.context.step, operation: s.request.operation,
      target: { ...s.request.target } });
    assert.equal(d.executionAuthorized, false); assert.equal(d.evidenceTier, "SIMULATED");
  }
});

test("approval cannot automatically advance or be injected as a coordinator mutation result", () => {
  const f = fixture(); const coordinator = createStepCoordinator({ run: "fixture-run", steps: [f] });
  const review = createApprovalCheckpoint(f); const before = coordinator.next();
  assert.equal(before.decision, "awaiting_operator");
  const intent = review.submit(response(review.preview()));
  assert.deepEqual(coordinator.next(), before);
  assert.deepEqual(Object.keys(review).sort(), ["preview", "status", "submit"]);
  assert.throws(() => coordinator.submit({ run: "fixture-run", step: "f05-timeout", result: intent }),
    /^Error: Step coordination failed$/);
  assert.equal(coordinator.next().index, 0);
  assert.notEqual(coordinator.next().decision, "completed");
  const fresh = createStepCoordinator({ run: "fixture-run", steps: [f] });
  assert.equal(fresh.next().decision, "awaiting_operator"); assert.equal(fresh.next().index, 0);
});
