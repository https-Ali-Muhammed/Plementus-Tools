import { createStepCoordinator } from "./step-coordinator.mjs";

const admittedPlans = new WeakSet();
const eligible = decision => ["fixture_result_required", "awaiting_operator"].includes(decision);
const terminal = decision => ["blocked", "failed", "completed", "cancelled", "reconcile_required"].includes(decision);
function fail() { throw new Error("Pause control failed"); }
function record(value, expected) {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) fail();
  const keys = Reflect.ownKeys(value);
  if (keys.length > 10 || (expected && (keys.length !== expected.length || expected.some(key => !keys.includes(key))))) fail();
  return Object.fromEntries(keys.map(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (typeof key !== "string" || key.length > 40 || !descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) fail();
    return [key, descriptor.value];
  }));
}
function snapshot(input) {
  let remaining = 2048;
  const copy = (value, depth = 0) => {
    if (--remaining < 0 || depth > 6) fail();
    if (Array.isArray(value)) {
      if (Object.getPrototypeOf(value) !== Array.prototype || value.length < 1 || value.length > 32 ||
          Reflect.ownKeys(value).length !== value.length + 1) fail();
      return Array.from({ length: value.length }, (_, index) => {
        const descriptor = Object.getOwnPropertyDescriptor(value, String(index));
        if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) fail();
        return copy(descriptor.value, depth + 1);
      });
    }
    if (value && typeof value === "object") {
      return Object.fromEntries(Object.entries(record(value)).map(([key, item]) => [key, copy(item, depth + 1)]));
    }
    if (!(typeof value === "boolean" || (Number.isSafeInteger(value) && value >= 0 && value <= 1000) ||
        (typeof value === "string" && value.length <= 64))) fail();
    return value;
  };
  return copy(input);
}
const decision = (name, position) => Object.freeze({ decision: name, index: position.index, total: position.total,
  evidenceTier: "SIMULATED", retryAllowed: false, executionAuthorized: false,
  reconciliationRequired: name === "reconcile_required" });

// Disconnected simulation only: no executor, storage, approvals or restart recovery.
export function createPauseControl(plan) {
  let admitted, coordinator, definition;
  try {
    if (admittedPlans.has(plan)) fail();
    // Reserve before reflection: a proxy must not recursively admit this identity.
    admittedPlans.add(plan);
    admitted = snapshot(plan);
    coordinator = createStepCoordinator(admitted);
    definition = JSON.stringify(admitted);
  } catch { fail(); }
  let current = decision(coordinator.next().decision, { index: 0, total: admitted.steps.length });
  let finished = false;
  let securityBlocked = false;
  let busy = false;
  const block = () => {
    securityBlocked = true;
    if (!terminal(current.decision)) current = decision("blocked", current);
  };
  const guarded = (prepare, action) => {
    if (busy) { block(); fail(); }
    busy = true;
    try {
      const value = prepare();
      if (JSON.stringify(snapshot(plan)) !== definition) fail();
      // Reflection can run caller proxy traps; a nested rejection must stay latched.
      if (securityBlocked) fail();
      return action(value);
    } catch { block(); fail(); }
    finally { busy = false; }
  };
  return Object.freeze({
    next: () => {
      // Observation remains available after a security stop, without reopening any action.
      if (securityBlocked && !busy) return current;
      return guarded(() => null, () => current);
    },
    submit: value => guarded(() => snapshot(value), submission => {
      if (finished || current.decision === "paused") fail();
      const result = coordinator.submit(submission);
      current = decision(result.decision, result);
      finished = !eligible(result.decision);
      return current;
    }),
    control: value => guarded(() => {
      const command = record(value, ["version", "checkpoint", "run", "step", "operation", "target", "action"]);
      command.target = snapshot(command.target);
      return command;
    }, command => {
      if (finished || command.version !== 1 || command.checkpoint !== current ||
          !["pause", "resume", "cancel"].includes(command.action)) fail();
      const { request } = admitted.steps[current.index];
      const target = record(command.target, ["provider", "reference", "environment"]);
      if (command.run !== admitted.run || command.step !== request.context.step || command.operation !== request.operation ||
          target.provider !== request.target.provider || target.reference !== request.target.reference ||
          target.environment !== request.target.environment) fail();
      if (command.action === "resume") {
        const position = coordinator.next();
        if (current.decision !== "paused" || !eligible(position.decision) || position.index !== current.index) fail();
        current = decision(position.decision, position);
      } else {
        if (!eligible(current.decision) && !(command.action === "cancel" && current.decision === "paused")) fail();
        current = decision(command.action === "pause" ? "paused" : "cancelled", current);
        finished = command.action === "cancel";
      }
      return current;
    }),
  });
}
