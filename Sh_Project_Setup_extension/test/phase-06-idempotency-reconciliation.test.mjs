import test from "node:test";
import assert from "node:assert/strict";
import { createStepCoordinator } from "../src/workflow/step-coordinator.mjs";
import { createApprovalCheckpoint } from "../src/workflow/approval-checkpoint.mjs";
import { createPauseControl } from "../src/workflow/pause-control.mjs";
import { FAILURE_SCENARIOS } from "../fixtures/scenarios/failure-states.mjs";

const read = (n = 1) => ({
  capability: { version: 1, provider: "odoo-sh", operation: "inspect-page", classification: "supported", mutates: false },
  request: { version: 1, operation: "inspect-page", parameters: { limit: 1 },
    target: { provider: "odoo-sh", reference: "fixture-target", environment: "test" },
    context: { run: "fixture-run", step: `fixture-step-${n}` } },
});
const plan = (...steps) => ({ run: "fixture-run", steps: steps.length ? steps : [read()] });
const fixture = (id = "F05-timeout") => {
  const { capability, request } = FAILURE_SCENARIOS.find(s => s.id === id);
  return structuredClone({ capability, request });
};
const observed = s => ({ version: 1, operation: s.request.operation, target: { ...s.request.target },
  status: "observed", evidenceTier: "SIMULATED", category: "none", retrySafety: "safe",
  reviewRequired: false, reconciliationRequired: false, verification: "none" });
const submission = (s = read(), result = observed(s)) => ({ run: "fixture-run", step: s.request.context.step, result });
const command = (c, action, s = read(), checkpoint = c.next()) => ({ version: 1, checkpoint,
  run: "fixture-run", step: s.request.context.step, operation: s.request.operation, target: { ...s.request.target }, action });
const review = (checkpoint, choice = "approve") => ({ version: 1, checkpoint, run: checkpoint.run,
  step: checkpoint.step, operation: checkpoint.operation, target: { ...checkpoint.target },
  approvalReference: checkpoint.approvalReference, choice });
const invalid = (kind, fn) => assert.throws(fn, new RegExp(`^Error: ${kind} failed$`));
const stopped = (c, name, index = 0) => {
  const d = c.next();
  assert.equal(d.decision, name); assert.equal(d.index, index);
  assert.equal(d.evidenceTier, "SIMULATED"); assert.equal(d.retryAllowed, false);
  assert.equal(d.executionAuthorized, false);
  assert.equal(d.reconciliationRequired, name === "reconcile_required");
  assert.ok(Object.isFrozen(d));
  return d;
};

test("observation and explicit pause/resume never advance ordered reads", () => {
  const c = createPauseControl(plan(read(2), read(), read(3)));
  const first = c.next();
  for (let i = 0; i < 20; i++) assert.strictEqual(c.next(), first);
  for (const s of [read(2), read(), read(3)]) {
    const index = c.next().index;
    c.control(command(c, "pause", s)); stopped(c, "paused", index);
    c.control(command(c, "resume", s)); stopped(c, "fixture_result_required", index);
    assert.equal(c.submit(submission(s)).index, index + 1);
  }
  stopped(c, "completed", 3);
});

test("original copied and serialized duplicate results never advance twice, including after resume", () => {
  for (const create of [createStepCoordinator, createPauseControl]) {
    for (const copy of [v => v, v => structuredClone(v), v => JSON.parse(JSON.stringify(v))]) {
      const c = create(plan(read(), read(2)));
      const value = submission(); c.submit(value);
      if (c.control) {
        c.control(command(c, "pause", read(2))); c.control(command(c, "resume", read(2)));
      }
      const kind = c.control ? "Pause control" : "Step coordination";
      invalid(kind, () => c.submit(copy(value)));
      assert.equal(c.next().index, 1); assert.equal(c.next().decision, "blocked");
      invalid(kind, () => c.submit(submission(read(2))));
      assert.equal(c.next().index, 1);
    }
  }
});

test("previous and future steps cannot be submitted around pause/resume", () => {
  for (const n of [1, 3]) {
    const c = createPauseControl(plan(read(), read(2), read(3)));
    c.submit(submission()); c.control(command(c, "pause", read(2)));
    c.control(command(c, "resume", read(2)));
    invalid("Pause control", () => c.submit(submission(read(n))));
    stopped(c, "blocked", 1);
  }
});

for (const [field, change] of [
  ["run", v => { v.run = "other-run"; }],
  ["step", v => { v.step = "fixture-step-2"; }],
  ["operation", v => { v.operation = "inspect-module"; }],
  ["provider", v => { v.target.provider = "plementus"; }],
  ["target", v => { v.target.reference = "other-target"; }],
  ["environment", v => { v.target.environment = "production"; }],
]) {
  test(`wrong ${field} rejects result, pause control and approval without replay`, () => {
    for (const create of [createStepCoordinator, createPauseControl]) {
      const c = create(plan()); const value = submission();
      change(["run", "step"].includes(field) ? value : value.result);
      const kind = c.control ? "Pause control" : "Step coordination";
      invalid(kind, () => c.submit(value)); invalid(kind, () => c.submit(submission()));
      assert.equal(c.next().index, 0); assert.equal(c.next().decision, "blocked");
    }
    const c = createPauseControl(plan()); const value = command(c, "pause"); change(value);
    invalid("Pause control", () => c.control(value)); stopped(c, "blocked");
    const a = createApprovalCheckpoint(fixture()); const p = a.preview(); const response = review(p); change(response);
    invalid("Approval review", () => a.submit(response));
    invalid("Approval review", () => a.submit(review(p)));
    assert.equal(a.status().decision, "blocked"); assert.equal(a.status().executionAuthorized, false);
  });
}

test("cross-instance pause checkpoints cannot transfer progress or consume the original", () => {
  const first = createPauseControl(plan(read(), read(2))); first.submit(submission());
  first.control(command(first, "pause", read(2))); const old = command(first, "resume", read(2));
  const other = createPauseControl(plan(read(), read(2))); other.submit(submission());
  other.control(command(other, "pause", read(2)));
  invalid("Pause control", () => other.control(old)); stopped(other, "blocked", 1);
  stopped(first, "paused", 1); first.control(old); stopped(first, "fixture_result_required", 1);
});

test("cross-instance approval previews and recorded decisions cannot be reused", () => {
  const first = createApprovalCheckpoint(fixture()); const value = review(first.preview());
  const intent = first.submit(value);
  for (const replay of [value, intent, structuredClone(intent), JSON.parse(JSON.stringify(intent))]) {
    const other = createApprovalCheckpoint(fixture());
    invalid("Approval review", () => other.submit(replay));
    assert.equal(other.status().decision, "blocked"); assert.equal(other.status().executionAuthorized, false);
  }
  assert.strictEqual(first.status(), intent);
});

test("copied serialized and consumed decisions never resume a later cycle", () => {
  for (const copy of [d => ({ ...d }), d => structuredClone(d), d => JSON.parse(JSON.stringify(d)), d => d]) {
    const c = createPauseControl(plan()); c.control(command(c, "pause"));
    const old = command(c, "resume"); const checkpoint = copy(old.checkpoint);
    c.control(old); c.control(command(c, "pause"));
    invalid("Pause control", () => c.control(command(c, "resume", read(), checkpoint)));
    stopped(c, "blocked");
    const a = createApprovalCheckpoint(fixture()); const p = a.preview();
    if (checkpoint === old.checkpoint) a.submit(review(p, "deny"));
    invalid("Approval review", () => a.submit(review(copy(p))));
    assert.equal(a.status().executionAuthorized, false);
  }
});

test("paused submission and cancelled replay cannot move or reopen a controller", () => {
  for (const action of ["pause", "cancel"]) {
    const c = createPauseControl(plan(read(), read(2))); c.control(command(c, action));
    invalid("Pause control", () => c.submit(submission()));
    stopped(c, action === "cancel" ? "cancelled" : "blocked");
    invalid("Pause control", () => c.control(command(c, "resume")));
  }
});

test("each approval choice leaves mutation gates closed before and after pause/resume", () => {
  for (const choice of ["approve", "deny", "defer", "cancel"]) {
    const s = fixture(); const c = createPauseControl(plan(s, read(2)));
    const direct = createStepCoordinator(plan(s)); const a = createApprovalCheckpoint(s);
    const response = review(a.preview(), choice); const intent = a.submit(response);
    invalid("Approval review", () => a.submit(response)); assert.strictEqual(a.status(), intent);
    assert.equal(intent.choice, choice); assert.equal(intent.executionAuthorized, false);
    assert.equal(direct.next().decision, "awaiting_operator");
    c.control(command(c, "pause", s)); c.control(command(c, "resume", s));
    stopped(c, "awaiting_operator");
    invalid("Pause control", () => c.submit(submission(s, intent))); stopped(c, "blocked");
    invalid("Step coordination", () => direct.submit(submission(s, intent)));
    assert.equal(direct.next().index, 0);
  }
});

test("missing approval references and observed synthetic mutation claims never admit execution", () => {
  for (const create of [createStepCoordinator, createPauseControl]) {
    const s = fixture(); delete s.request.approvalReference;
    const kind = create === createPauseControl ? "Pause control" : "Step coordination";
    invalid(kind, () => create(plan(s)));
    const valid = fixture(); const c = create(plan(valid));
    invalid(kind, () => c.submit(submission(valid, { ...observed(valid), retrySafety: "unsafe", reviewRequired: true })));
    assert.equal(c.next().index, 0); assert.equal(c.next().decision, "blocked");
  }
});

const expectedStops = {
  F01: "reconcile_required", F02: "blocked", "F03-login": "blocked", "F03-mfa": "blocked", "F03-captcha": "blocked",
  F04: "failed", "F05-timeout": "reconcile_required", "F05-interrupted": "reconcile_required",
  "F05-unknown": "reconcile_required", F06: "reconcile_required", "F07-submit": "reconcile_required", "F07-connect": "reconcile_required",
};
test("the reconciliation matrix covers every immutable F01–F07 variant", () => {
  assert.deepEqual(Object.keys(expectedStops), FAILURE_SCENARIOS.map(s => s.id));
  assert.ok(Object.isFrozen(FAILURE_SCENARIOS));
});
for (const s of FAILURE_SCENARIOS) {
  test(`${s.id}: intent and repeated observation cannot bypass ${expectedStops[s.id]}`, () => {
    const selected = fixture(s.id); const c = createPauseControl(plan(selected, read(2)));
    const direct = createStepCoordinator(plan(selected, read(2)));
    if (s.capability.mutates) {
      const a = createApprovalCheckpoint(selected); const d = a.submit(review(a.preview()));
      assert.equal(d.executionAuthorized, false);
    }
    const value = submission(selected, s.result);
    assert.equal(direct.submit(value).decision, expectedStops[s.id]);
    c.submit(value); const terminal = stopped(c, expectedStops[s.id]);
    for (let i = 0; i < 10; i++) assert.strictEqual(c.next(), terminal);
    for (const action of ["cancel", "resume", "pause"]) {
      invalid("Pause control", () => c.control(command(c, action, selected)));
      assert.strictEqual(c.next(), terminal);
    }
    invalid("Pause control", () => c.submit(value));
    invalid("Pause control", () => c.submit(submission(read(2))));
    invalid("Step coordination", () => direct.submit(value));
    assert.strictEqual(c.next(), terminal); assert.equal(direct.next().decision, expectedStops[s.id]);
    assert.equal(direct.next().index, 0); assert.equal(direct.next().retryAllowed, false);
  });
}

test("timeout interruption and unknown writes cannot be downgraded to known permission denial", () => {
  for (const s of FAILURE_SCENARIOS.filter(s => s.result.reconciliationRequired)) {
    for (const change of [
      { status: "failed", retrySafety: "unsafe", reconciliationRequired: false },
      { retrySafety: "safe" }, { reconciliationRequired: false },
    ]) {
      const c = createPauseControl(plan(fixture(s.id)));
      invalid("Pause control", () => c.submit(submission(s, { ...s.result, ...change })));
      stopped(c, "blocked");
    }
  }
  const denied = createPauseControl(plan(fixture("F04")));
  const denial = FAILURE_SCENARIOS.find(s => s.id === "F04");
  denied.submit(submission(denial, denial.result)); stopped(denied, "failed");
  const uncertain = createPauseControl(plan(fixture()));
  const timeout = FAILURE_SCENARIOS.find(s => s.id === "F05-timeout");
  uncertain.submit(submission(timeout, timeout.result)); stopped(uncertain, "reconcile_required");
  invalid("Pause control", () => uncertain.submit(submission(timeout, { ...timeout.result,
    status: "failed", category: "permission", retrySafety: "unsafe", reconciliationRequired: false })));
  stopped(uncertain, "reconcile_required");
});

test("all non-simulated evidence tiers fail closed for reads and mutation claims", () => {
  for (const evidenceTier of ["LOCAL_BROWSER_TESTED", "GITHUB_SANDBOX_VERIFIED", "MANUALLY_ATTESTED",
    "ODOO_SH_DEMO_VERIFIED", "PLEMENTUS_DEMO_VERIFIED", "OWNER_APPROVED", "SIMULATED "]) {
    for (const selected of [read(), fixture(), fixture("F07-submit")]) {
      for (const create of [createStepCoordinator, createPauseControl]) {
        const c = create(plan(selected)); const result = selected.capability.mutates ?
          FAILURE_SCENARIOS.find(s => s.request.context.step === selected.request.context.step).result : observed(selected);
        invalid(create === createPauseControl ? "Pause control" : "Step coordination",
          () => c.submit(submission(selected, { ...result, evidenceTier })));
        assert.equal(c.next().index, 0); assert.equal(c.next().decision, "blocked");
      }
    }
    const a = createApprovalCheckpoint(fixture());
    invalid("Approval review", () => a.submit({ ...review(a.preview()), evidenceTier }));
    assert.equal(a.status().executionAuthorized, false);
  }
});

test("malformed accessor hidden symbol and exotic submissions reject without invoking getters", () => {
  let getters = 0;
  const malformed = [() => null, () => [], () => new Date(), () => new Map(), () => Object.create(null),
    v => ({ ...v, extra: true }), v => { delete v.run; return v; },
    v => Object.defineProperty(v, "run", { get() { getters++; throw new Error("private-secret"); } }),
    v => Object.defineProperty(v, "hidden", { value: true }), v => { v[Symbol("private")] = true; return v; },
    v => { v.target = v; return v; }];
  for (const make of malformed) {
    const c = createPauseControl(plan()); invalid("Pause control", () => c.submit(make(submission()))); stopped(c, "blocked");
    const direct = createStepCoordinator(plan()); invalid("Step coordination", () => direct.submit(make(submission())));
    const a = createApprovalCheckpoint(fixture()); invalid("Approval review", () => a.submit(make(review(a.preview()))));
    assert.equal(a.status().decision, "blocked"); assert.equal(a.status().executionAuthorized, false);
  }
  assert.equal(getters, 0);
});

test("throwing and revoked proxies produce generic errors while preserving reconciliation", () => {
  const hostile = new Proxy({}, { getPrototypeOf() { throw new Error("private-secret"); } });
  const revoked = Proxy.revocable({}, {}); revoked.revoke();
  for (const value of [hostile, revoked.proxy]) {
    const c = createPauseControl(plan(fixture())); const s = FAILURE_SCENARIOS.find(s => s.id === "F05-timeout");
    c.submit(submission(s, s.result)); const terminal = stopped(c, "reconcile_required");
    invalid("Pause control", () => c.control(value)); invalid("Pause control", () => c.submit(value));
    assert.strictEqual(c.next(), terminal);
    const a = createApprovalCheckpoint(fixture()); invalid("Approval review", () => a.submit(value));
    assert.equal(a.status().decision, "blocked");
    invalid("Step coordination", () => createStepCoordinator(plan()).submit(value));
  }
});

test("approval reflection cannot overwrite a terminal denial recorded during the same submission", () => {
  const a = createApprovalCheckpoint(fixture()); const p = a.preview(); let denied; let error;
  const response = new Proxy(review(p), { getPrototypeOf(value) {
    denied ??= a.submit(review(p, "deny"));
    return Object.getPrototypeOf(value);
  } });
  try { a.submit(response); } catch (caught) { error = caught; }
  assert.equal(denied?.choice, "deny"); assert.equal(denied?.executionAuthorized, false);
  assert.strictEqual(a.status(), denied, "a consumed review must retain its first terminal intent");
  assert.match(String(error), /^Error: Approval review failed$/);
});

test("competing review and target reflection preserves every first terminal decision", () => {
  for (const boundary of ["review", "target"]) {
    for (const trap of ["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"]) {
      for (const choice of ["approve", "deny", "defer", "cancel", null]) {
        const a = createApprovalCheckpoint(fixture()); const p = a.preview(); let terminal;
        const value = review(p, choice === "approve" ? "deny" : "approve");
        const proxy = new Proxy(boundary === "review" ? value : value.target, {
          [trap](...args) {
            if (!terminal) {
              if (choice === null) invalid("Approval review", () => a.submit({}));
              else a.submit(review(p, choice));
              terminal = a.status();
            }
            return Reflect[trap](...args);
          },
        });
        if (boundary === "target") value.target = proxy;
        invalid("Approval review", () => a.submit(boundary === "review" ? proxy : value));
        assert.strictEqual(a.status(), terminal);
        assert.equal(terminal.choice, choice);
        assert.equal(terminal.decision, choice === null ? "blocked" : "review_recorded");
        assert.equal(terminal.terminal, true); assert.equal(terminal.executionAuthorized, false);
        assert.equal(terminal.evidenceTier, "SIMULATED");
        invalid("Approval review", () => a.submit(review(p)));
        assert.strictEqual(a.status(), terminal);
      }
    }
  }
});

test("definition revalidation cannot let a competing submission replace terminal intent", () => {
  for (const trap of ["getPrototypeOf", "ownKeys", "getOwnPropertyDescriptor"]) {
    for (const choice of ["approve", "deny", "defer", "cancel"]) {
      let armed = false; let terminal; let a; let p;
      const input = new Proxy(fixture(), { [trap](...args) {
        if (armed) {
          armed = false;
          terminal = a.submit(review(p, choice));
        }
        return Reflect[trap](...args);
      } });
      a = createApprovalCheckpoint(input); p = a.preview(); armed = true;
      invalid("Approval review", () => a.submit(review(p, choice === "approve" ? "deny" : "approve")));
      assert.strictEqual(a.status(), terminal); assert.equal(terminal.choice, choice);
      assert.equal(terminal.executionAuthorized, false); assert.equal(terminal.evidenceTier, "SIMULATED");
    }
  }
});

test("outer reflection errors and invalid choices preserve completed competing decisions", () => {
  for (const choice of ["approve", "deny", "defer", "cancel"]) {
    for (const throws of [false, true]) {
      const a = createApprovalCheckpoint(fixture()); const p = a.preview(); let terminal;
      const value = new Proxy(review(p, "invalid"), { getPrototypeOf(target) {
        terminal = a.submit(review(p, choice));
        if (throws) throw new Error("private-secret");
        return Object.getPrototypeOf(target);
      } });
      invalid("Approval review", () => a.submit(value));
      assert.strictEqual(a.status(), terminal); assert.equal(terminal.choice, choice);
      assert.equal(terminal.executionAuthorized, false);
    }
  }
});

test("frozen APIs previews and decisions expose no replay or recovery method", () => {
  const c = createPauseControl(plan()); const direct = createStepCoordinator(plan());
  const a = createApprovalCheckpoint(fixture()); const p = a.preview();
  assert.deepEqual(Object.keys(c).sort(), ["control", "next", "submit"]);
  assert.deepEqual(Object.keys(direct).sort(), ["next", "submit"]);
  assert.deepEqual(Object.keys(a).sort(), ["preview", "status", "submit"]);
  for (const value of [c, direct, a, c.next(), direct.next(), p, p.target, a.status()]) assert.ok(Object.isFrozen(value));
  assert.throws(() => { c.next().index = 1; }, TypeError);
  assert.throws(() => { p.executionAuthorized = true; }, TypeError);
  const d = c.submit(submission());
  for (const value of [d, structuredClone(d), JSON.parse(JSON.stringify(d))]) {
    invalid("Pause control", () => c.submit(value)); assert.strictEqual(c.next(), d);
  }
});

test("generic failures and sanitized decisions never echo private input or raw errors", () => {
  for (const secret of ["person@example.test", "https://private.example.test", "private-customer", "secret-value", "x".repeat(10000)]) {
    const c = createPauseControl(plan()); invalid("Pause control", () => c.submit({ ...submission(), run: secret }));
    const a = createApprovalCheckpoint(fixture()); invalid("Approval review", () => a.submit({ ...review(a.preview()), rawError: new Error(secret) }));
    const direct = createStepCoordinator(plan()); invalid("Step coordination", () => direct.submit({ ...submission(), run: secret }));
    for (const d of [c.next(), a.status(), direct.next()]) {
      assert.doesNotMatch(JSON.stringify(d), /private|secret|example|https/);
      assert.ok(JSON.stringify(d).length < 256);
    }
  }
});

test("all fixture outcome and approval paths access no executor network storage or retry timer", () => {
  const keys = ["fetch", "chrome", "indexedDB", "localStorage", "sessionStorage", "XMLHttpRequest", "WebSocket", "setTimeout", "setInterval"];
  const descriptors = keys.map(key => Object.getOwnPropertyDescriptor(globalThis, key)); let accesses = 0;
  try {
    for (const key of keys) Object.defineProperty(globalThis, key, { configurable: true, get() {
      accesses++; throw new Error("Forbidden external access");
    } });
    for (const s of FAILURE_SCENARIOS) {
      const selected = fixture(s.id); const c = createPauseControl(plan(selected));
      if (s.capability.mutates) {
        const a = createApprovalCheckpoint(selected); assert.equal(a.submit(review(a.preview())).executionAuthorized, false);
      }
      c.submit(submission(s, s.result));
      invalid("Pause control", () => c.control(command(c, "cancel", selected)));
    }
    const c = createPauseControl(plan()); c.control(command(c, "pause")); c.control(command(c, "resume")); c.submit(submission());
    assert.equal(accesses, 0);
  } finally {
    keys.forEach((key, i) => descriptors[i] ? Object.defineProperty(globalThis, key, descriptors[i]) : delete globalThis[key]);
  }
});
