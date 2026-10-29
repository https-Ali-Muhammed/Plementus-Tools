// Pure v1 boundary. An adapter declaration is capability data, never permission to act.
export const CONTRACT_VERSION = 1;
export const PROVIDERS = Object.freeze(["odoo-sh", "customer-odoo", "plementus"]);
export const CAPABILITY_CLASSES = Object.freeze(["supported", "unverified", "blocked"]);
export const RESULT_CLASSES = Object.freeze(["observed", "manual-attestation", "unknown", "blocked", "failed"]);
export const EVIDENCE_TIERS = Object.freeze(["SIMULATED", "LOCAL_BROWSER_TESTED", "GITHUB_SANDBOX_VERIFIED", "MANUALLY_ATTESTED", "ODOO_SH_DEMO_VERIFIED", "PLEMENTUS_DEMO_VERIFIED"]);
const CATEGORIES = ["none", "unsupported", "unverified", "permission", "target-mismatch", "timeout", "interrupted", "provider-error", "unknown-outcome", "validation"];
const token = /^[a-z][a-z0-9-]{0,39}$/;
const reference = /^[a-z][a-z0-9-]{0,63}$/;

function fail() { throw new Error("Invalid adapter contract"); }
function record(value, required, optional = []) {
  if (!value || typeof value !== "object" || Array.isArray(value) || Object.getPrototypeOf(value) !== Object.prototype ||
      Reflect.ownKeys(value).some(key => typeof key !== "string" || !Object.getOwnPropertyDescriptor(value, key)?.enumerable ||
        !Object.hasOwn(Object.getOwnPropertyDescriptor(value, key), "value")) ||
      required.some(key => !Object.hasOwn(value, key)) ||
      Object.keys(value).some(key => !required.includes(key) && !optional.includes(key))) fail();
}
function id(value, pattern = token) { if (typeof value !== "string" || !pattern.test(value)) fail(); }
function version(value) { if (value !== CONTRACT_VERSION) fail(); }
function target(value) {
  record(value, ["provider", "reference", "environment"]);
  if (!PROVIDERS.includes(value.provider)) fail();
  id(value.reference, reference);
  id(value.environment);
}
function sameTarget(a, b) {
  return a.provider === b.provider && a.reference === b.reference && a.environment === b.environment;
}

export function validateCapability(value) {
  record(value, ["version", "provider", "operation", "classification", "mutates"]);
  version(value.version);
  if (!PROVIDERS.includes(value.provider)) fail();
  id(value.operation);
  if (!CAPABILITY_CLASSES.includes(value.classification) || typeof value.mutates !== "boolean") fail();
  return value;
}

export function validateAdapterRequest(value, capability) {
  validateCapability(capability);
  record(value, ["version", "operation", "parameters", "target", "context"], ["approvalReference"]);
  version(value.version);
  id(value.operation);
  target(value.target);
  record(value.context, ["run", "step"]);
  id(value.context.run, reference);
  id(value.context.step, reference);
  if (!value.parameters || typeof value.parameters !== "object" || Array.isArray(value.parameters) ||
      Object.getPrototypeOf(value.parameters) !== Object.prototype) fail();
  if (Reflect.ownKeys(value.parameters).some(key => typeof key !== "string" ||
      !Object.getOwnPropertyDescriptor(value.parameters, key)?.enumerable ||
      !Object.hasOwn(Object.getOwnPropertyDescriptor(value.parameters, key), "value"))) fail();
  if (Object.keys(value.parameters).length > 8 || Object.entries(value.parameters).some(([key, item]) =>
      !token.test(key) || !(typeof item === "boolean" || (Number.isSafeInteger(item) && item >= 0 && item <= 1000)))) fail();
  if (value.operation !== capability.operation || value.target.provider !== capability.provider) fail();
  if (capability.mutates) id(value.approvalReference, reference);
  else if (Object.hasOwn(value, "approvalReference")) fail();
  return value;
}

export function validateAdapterResult(value, request, capability) {
  validateAdapterRequest(request, capability);
  record(value, ["version", "operation", "target", "status", "evidenceTier", "category", "retrySafety", "reviewRequired", "reconciliationRequired", "verification"]);
  version(value.version);
  if (value.operation !== request.operation) fail();
  target(value.target);
  if (!sameTarget(value.target, request.target) || !RESULT_CLASSES.includes(value.status) ||
      !EVIDENCE_TIERS.includes(value.evidenceTier) || !CATEGORIES.includes(value.category) ||
      !["safe", "unsafe", "reconcile-first"].includes(value.retrySafety) ||
      typeof value.reviewRequired !== "boolean" || typeof value.reconciliationRequired !== "boolean" ||
      !["none", "provider-state"].includes(value.verification)) fail();
  const uncertainWrite = capability.mutates && value.status === "unknown";
  if (capability.mutates && ["timeout", "interrupted", "unknown-outcome"].includes(value.category) &&
      value.status !== "unknown") fail();
  if (uncertainWrite !== value.reconciliationRequired ||
      value.retrySafety !== (uncertainWrite ? "reconcile-first" : capability.mutates ? "unsafe" : "safe") ||
      value.reviewRequired !== (value.status !== "observed" || capability.mutates) ||
      (value.status === "observed" ? value.category !== "none" : value.category === "none")) fail();
  if (value.status === "manual-attestation" && value.evidenceTier !== "MANUALLY_ATTESTED") fail();
  if (value.status !== "manual-attestation" && value.evidenceTier === "MANUALLY_ATTESTED") fail();
  if (value.evidenceTier === "GITHUB_SANDBOX_VERIFIED" ||
      (value.evidenceTier === "ODOO_SH_DEMO_VERIFIED" && value.target.provider !== "odoo-sh") ||
      (value.evidenceTier === "PLEMENTUS_DEMO_VERIFIED" && value.target.provider !== "plementus")) fail();
  if ((capability.classification === "blocked" && value.status !== "blocked") ||
      (capability.classification === "unverified" && !["unknown", "blocked"].includes(value.status))) fail();
  if (capability.mutates && value.status === "observed") {
    const tier = value.target.provider === "plementus" ? "PLEMENTUS_DEMO_VERIFIED" :
      value.target.provider === "odoo-sh" ? "ODOO_SH_DEMO_VERIFIED" : null;
    if (value.verification !== "provider-state" || value.evidenceTier !== tier) fail();
  } else if (value.verification !== "none") fail();
  return value;
}
