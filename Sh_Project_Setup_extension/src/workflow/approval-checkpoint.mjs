import { validateCapability, validateAdapterRequest } from "../adapters/contract.mjs";

// Fixed Phase 05 vocabulary describes synthetic effects, never provider permission.
const mutations = new Map([
  ["create-project", "odoo-sh"], ["install-module", "customer-odoo"],
  ["submit-database-info", "plementus"], ["connect", "plementus"],
]);
const parameters = new Set(["limit", "unknown-dom", "target-verified", "login-required", "mfa-required",
  "captcha-required", "permission-denied", "possible-write", "available", "installed"]);
const stepId = /^(?:fixture-step-(?:[1-9]|[12][0-9]|3[0-2])|f0[1-7](?:-login|-mfa|-captcha|-timeout|-interrupted|-unknown|-submit|-connect)?)$/;
function fail() { throw new Error("Approval review failed"); }
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
function snapshot(value, depth = 0) {
  if (depth > 3) fail();
  return Object.fromEntries(Object.entries(record(value)).map(([key, item]) => {
    if (item && typeof item === "object") return [key, snapshot(item, depth + 1)];
    if (!(typeof item === "boolean" || Number.isSafeInteger(item) || (typeof item === "string" && item.length <= 64))) fail();
    return [key, item];
  }));
}
function definition(value) {
  const copy = snapshot(value);
  const { capability, request } = record(copy, ["capability", "request"]);
  validateCapability(capability);
  validateAdapterRequest(request, capability);
  if (!capability.mutates || mutations.get(capability.operation) !== capability.provider ||
      request.context.run !== "fixture-run" || !stepId.test(request.context.step) ||
      request.target.reference !== "fixture-target" || request.target.environment !== "test" ||
      request.approvalReference !== "fixture-approval" || Object.keys(request.parameters).some(key => !parameters.has(key))) fail();
  return copy;
}
const decision = (state, choice = null) => Object.freeze({ decision: state, choice,
  reviewRecorded: state === "review_recorded", terminal: state !== "awaiting_review",
  executionAuthorized: false, evidenceTier: "SIMULATED" });

// No executor, coordinator, persistence or authenticated operator is connected here.
export function createApprovalCheckpoint(input) {
  let admitted;
  try { admitted = definition(input); } catch { fail(); }
  const original = JSON.stringify(admitted);
  const { capability, request } = admitted;
  const preview = Object.freeze({ version: 1, run: request.context.run, step: request.context.step,
    operation: request.operation, target: Object.freeze(request.target), approvalReference: request.approvalReference,
    classification: capability.classification, mutates: true, reviewRequired: true,
    evidenceTier: "SIMULATED", executionAuthorized: false });
  let current = decision("awaiting_review");
  const guarded = action => {
    try {
      if (current.terminal || JSON.stringify(definition(input)) !== original) fail();
      return action();
    } catch {
      if (!current.terminal) current = decision("blocked");
      fail();
    }
  };
  return Object.freeze({
    preview: () => guarded(() => preview),
    status: () => current,
    submit: value => guarded(() => {
      const review = record(value, ["version", "checkpoint", "run", "step", "operation", "target", "approvalReference", "choice"]);
      const target = record(review.target, ["provider", "reference", "environment"]);
      if (review.version !== 1 || review.checkpoint !== preview || review.run !== preview.run ||
          review.step !== preview.step || review.operation !== preview.operation ||
          review.approvalReference !== preview.approvalReference ||
          target.provider !== preview.target.provider || target.reference !== preview.target.reference ||
          target.environment !== preview.target.environment || !["approve", "deny", "defer", "cancel"].includes(review.choice)) fail();
      if (current.terminal) fail();
      current = decision("review_recorded", review.choice);
      return current;
    }),
  });
}
