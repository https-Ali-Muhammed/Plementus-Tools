import { validateCapability, validateAdapterRequest, validateAdapterResult } from "../adapters/contract.mjs";

// This catalog describes synthetic operations only, never provider support or authorization.
const operations = new Map([
  ["inspect-page", ["odoo-sh", false]],
  ["inspect-module", ["customer-odoo", false]],
  ["create-project", ["odoo-sh", true]],
  ["install-module", ["customer-odoo", true]],
  ["submit-database-info", ["plementus", true]],
  ["connect", ["plementus", true]],
]);
const parameters = new Set(["limit", "unknown-dom", "target-verified", "login-required", "mfa-required",
  "captcha-required", "permission-denied", "possible-write", "available", "installed"]);
const stepId = /^(?:fixture-step-(?:[1-9]|[12][0-9]|3[0-2])|f0[1-7](?:-login|-mfa|-captcha|-timeout|-interrupted|-unknown|-submit|-connect)?)$/;
function fail() { throw new Error("Step coordination failed"); }
function record(value, keys) {
  if (!value || typeof value !== "object" || Object.getPrototypeOf(value) !== Object.prototype) fail();
  const own = Reflect.ownKeys(value);
  if (own.length !== keys.length || keys.some(key => !Object.hasOwn(value, key)) || own.some(key => {
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    return !keys.includes(key) || !descriptor.enumerable || !Object.hasOwn(descriptor, "value");
  })) fail();
}
function validatePlan(plan) {
  record(plan, ["run", "steps"]);
  if (plan.run !== "fixture-run" || !Array.isArray(plan.steps) || Object.getPrototypeOf(plan.steps) !== Array.prototype ||
      plan.steps.length < 1 || plan.steps.length > 32 || Reflect.ownKeys(plan.steps).length !== plan.steps.length + 1) fail();
  const seen = new Set();
  for (let index = 0; index < plan.steps.length; index++) {
    const descriptor = Object.getOwnPropertyDescriptor(plan.steps, String(index));
    if (!descriptor?.enumerable || !Object.hasOwn(descriptor, "value")) fail();
    const step = descriptor.value;
    record(step, ["capability", "request"]);
    validateCapability(step.capability);
    validateAdapterRequest(step.request, step.capability);
    const { capability, request } = step;
    const semantics = operations.get(capability.operation);
    if (!semantics || capability.provider !== semantics[0] || capability.mutates !== semantics[1] ||
        request.target.reference !== "fixture-target" || request.target.environment !== "test" ||
        request.context.run !== plan.run || !stepId.test(request.context.step) || seen.has(request.context.step) ||
        (capability.mutates && request.approvalReference !== "fixture-approval") ||
        Object.keys(request.parameters).some(key => !parameters.has(key))) fail();
    seen.add(request.context.step);
  }
}

// No executor, storage, approval or recovery API: results can only be injected fixtures.
export function createStepCoordinator(plan) {
  let definition;
  try {
    validatePlan(plan);
    definition = JSON.stringify(plan);
  } catch { fail(); }
  const total = plan.steps.length;
  let index = 0;
  let stopped = null;
  const decision = () => Object.freeze({ decision: stopped ?? (index === total ? "completed" :
    plan.steps[index].capability.classification !== "supported" ? "blocked" :
    plan.steps[index].capability.mutates ? "awaiting_operator" : "fixture_result_required"),
    index, total, evidenceTier: "SIMULATED", retryAllowed: false });
  const guarded = action => {
    try {
      validatePlan(plan);
      if (JSON.stringify(plan) !== definition) fail();
      return action();
    } catch {
      stopped ??= index === total ? "completed" : "blocked";
      fail();
    }
  };
  return Object.freeze({
    next: () => guarded(decision),
    submit: value => guarded(() => {
      if (stopped || index === total) fail();
      record(value, ["run", "step", "result"]);
      const { capability, request } = plan.steps[index];
      if (value.run !== plan.run || value.step !== request.context.step) fail();
      validateAdapterResult(value.result, request, capability);
      const result = value.result;
      if (result.evidenceTier !== "SIMULATED") fail();
      if (result.status === "unknown" || result.reconciliationRequired || result.retrySafety === "reconcile-first") {
        stopped = "reconcile_required";
      } else if (result.status === "observed" && !capability.mutates && capability.classification === "supported") {
        index++;
      } else {
        stopped = result.status === "failed" ? "failed" : "blocked";
      }
      return decision();
    }),
  });
}
