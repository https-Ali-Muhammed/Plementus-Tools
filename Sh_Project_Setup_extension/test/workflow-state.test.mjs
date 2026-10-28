import assert from "node:assert/strict";
import test from "node:test";
import { ALLOWED_TRANSITIONS, WORKFLOW_STATES, canTransition, transition } from "../src/workflow/state.mjs";

test("defines exactly the supported states and explicit transitions", () => {
  assert.deepEqual(WORKFLOW_STATES, ["draft", "ready", "running", "awaiting_operator", "reconcile_required", "failed", "blocked", "completed", "cancelled"]);
  for (const from of WORKFLOW_STATES) {
    for (const to of ALLOWED_TRANSITIONS[from]) {
      assert.ok(WORKFLOW_STATES.includes(to));
      assert.equal(canTransition(from, to), true);
      assert.equal(transition(from, to), to);
    }
  }
});

test("rejects every unspecified transition, including repeated and terminal transitions", () => {
  for (const from of WORKFLOW_STATES) for (const to of WORKFLOW_STATES) {
    if (!ALLOWED_TRANSITIONS[from].includes(to)) {
      assert.equal(canTransition(from, to), false);
      assert.throws(() => transition(from, to), /Invalid workflow transition/);
    }
  }
  assert.deepEqual(ALLOWED_TRANSITIONS.completed, []);
  assert.deepEqual(ALLOWED_TRANSITIONS.cancelled, []);
});

test("rejects unknown and non-string states without coercion", () => {
  for (const unknown of ["unknown", "constructor", "__proto__", "", null, undefined, {}, 1]) {
    assert.equal(canTransition(unknown, "ready"), false);
    assert.equal(canTransition("draft", unknown), false);
    assert.throws(() => transition(unknown, "ready"));
    assert.throws(() => transition("draft", unknown));
  }
});

test("input and transition definitions cannot be modified", () => {
  const input = Object.freeze({ state: "draft" });
  assert.throws(() => transition(input, "ready"));
  assert.deepEqual(input, { state: "draft" });
  assert.throws(() => WORKFLOW_STATES.push("other"));
  assert.throws(() => ALLOWED_TRANSITIONS.draft.push("completed"));
  assert.throws(() => { ALLOWED_TRANSITIONS.draft = []; });
});

test("imports and operates without browser globals", () => {
  assert.equal(typeof globalThis.chrome, "undefined");
  assert.equal(typeof globalThis.window, "undefined");
  assert.equal(transition("draft", "ready"), "ready");
});
