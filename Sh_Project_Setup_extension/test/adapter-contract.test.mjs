import test from "node:test";
import assert from "node:assert/strict";
import { CONTRACT_VERSION, validateCapability, validateAdapterRequest, validateAdapterResult } from "../src/adapters/contract.mjs";

const capability = Object.freeze({ version: CONTRACT_VERSION, provider: "odoo-sh", operation: "inspect", classification: "supported", mutates: false });
const target = Object.freeze({ provider: "odoo-sh", reference: "opaque-a", environment: "demo" });
const request = Object.freeze({ version: CONTRACT_VERSION, operation: "inspect", parameters: Object.freeze({ limit: 2 }), target, context: Object.freeze({ run: "run-a", step: "step-a" }) });
const result = Object.freeze({ version: CONTRACT_VERSION, operation: "inspect", target, status: "observed", evidenceTier: "SIMULATED", category: "none", retrySafety: "safe", reviewRequired: false, reconciliationRequired: false, verification: "none" });
const writeCapability = Object.freeze({ ...capability, operation: "submit", mutates: true });
const writeRequest = Object.freeze({ ...request, operation: "submit", approvalReference: "approval-a" });
const writeResult = Object.freeze({ ...result, operation: "submit", evidenceTier: "ODOO_SH_DEMO_VERIFIED", retrySafety: "unsafe", reviewRequired: true, verification: "provider-state" });
const invalid = fn => assert.throws(fn, /^Error: Invalid adapter contract$/);

test("valid v1 request, capability and result preserve frozen inputs", () => {
  assert.equal(validateCapability(capability), capability);
  assert.equal(validateAdapterRequest(request, capability), request);
  assert.equal(validateAdapterResult(result, request, capability), result);
  assert.equal(validateAdapterResult(writeResult, writeRequest, writeCapability), writeResult);
  assert.equal(request.parameters.limit, 2);
});

test("unknown versions, operations and fields fail closed", () => {
  invalid(() => validateCapability({ ...capability, version: 2 }));
  invalid(() => validateAdapterRequest({ ...request, version: 2 }, capability));
  invalid(() => validateAdapterResult({ ...result, version: 2 }, request, capability));
  invalid(() => validateAdapterRequest({ ...request, operation: "other" }, capability));
  invalid(() => validateAdapterRequest({ ...request, secret: "x" }, capability));
  invalid(() => validateAdapterResult({ ...result, rawError: "x" }, request, capability));
});

test("proposed mutation requires an approval reference, including blocked capability", () => {
  invalid(() => validateAdapterRequest({ ...request, operation: "submit" }, writeCapability));
  invalid(() => validateAdapterRequest({ ...writeRequest, approvalReference: "" }, writeCapability));
  assert.equal(validateAdapterRequest(writeRequest, { ...writeCapability, classification: "blocked" }), writeRequest);
});

test("unverified and blocked capabilities cannot report success", () => {
  invalid(() => validateAdapterResult(writeResult, writeRequest, { ...writeCapability, classification: "unverified" }));
  invalid(() => validateAdapterResult(writeResult, writeRequest, { ...writeCapability, classification: "blocked" }));
  const blocked = { ...writeResult, status: "blocked", evidenceTier: "SIMULATED", category: "unsupported", verification: "none" };
  assert.equal(validateAdapterResult(blocked, writeRequest, { ...writeCapability, classification: "blocked" }), blocked);
  invalid(() => validateAdapterResult({ ...blocked, status: "unknown" }, writeRequest, { ...writeCapability, classification: "blocked" }));
});

test("simulated clicks and manual attestations cannot verify writes", () => {
  invalid(() => validateAdapterResult({ ...writeResult, evidenceTier: "SIMULATED" }, writeRequest, writeCapability));
  invalid(() => validateAdapterResult({ ...writeResult, verification: "none" }, writeRequest, writeCapability));
  invalid(() => validateAdapterResult({ ...writeResult, evidenceTier: "LOCAL_BROWSER_TESTED" }, writeRequest, writeCapability));
  invalid(() => validateAdapterResult({ ...result, evidenceTier: "GITHUB_SANDBOX_VERIFIED" }, request, capability));
  const attested = { ...writeResult, status: "manual-attestation", evidenceTier: "MANUALLY_ATTESTED", category: "unverified", verification: "none" };
  assert.equal(validateAdapterResult(attested, writeRequest, writeCapability), attested);
});

test("uncertain writes require reconciliation and no automatic retry", () => {
  const unknown = { ...writeResult, status: "unknown", evidenceTier: "SIMULATED", category: "unknown-outcome", retrySafety: "reconcile-first", reconciliationRequired: true, verification: "none" };
  assert.equal(validateAdapterResult(unknown, writeRequest, writeCapability), unknown);
  invalid(() => validateAdapterResult({ ...unknown, retrySafety: "safe" }, writeRequest, writeCapability));
  invalid(() => validateAdapterResult({ ...unknown, reconciliationRequired: false }, writeRequest, writeCapability));
});

test("timeout, interruption and unknown outcome on writes require unknown and reconciliation", () => {
  for (const category of ["timeout", "interrupted", "unknown-outcome"]) {
    const uncertain = { ...writeResult, status: "unknown", evidenceTier: "SIMULATED", category,
      retrySafety: "reconcile-first", reconciliationRequired: true, verification: "none" };
    assert.equal(validateAdapterResult(uncertain, writeRequest, writeCapability), uncertain);
    invalid(() => validateAdapterResult({ ...uncertain, status: "failed", retrySafety: "unsafe", reconciliationRequired: false }, writeRequest, writeCapability));
    invalid(() => validateAdapterResult({ ...uncertain, status: "blocked", retrySafety: "unsafe", reconciliationRequired: false }, writeRequest, writeCapability));
  }
  const definitePrewriteFailure = { ...writeResult, status: "failed", evidenceTier: "SIMULATED", category: "permission", verification: "none" };
  assert.equal(validateAdapterResult(definitePrewriteFailure, writeRequest, writeCapability), definitePrewriteFailure);
});

test("hidden and accessor parameter properties fail closed before values are read", () => {
  const hidden = { limit: 2 };
  Object.defineProperty(hidden, "secret", { value: "synthetic", enumerable: false });
  invalid(() => validateAdapterRequest({ ...request, parameters: hidden }, capability));
  const hiddenValid = { limit: 2 };
  Object.defineProperty(hiddenValid, "extra", { value: true, enumerable: false });
  invalid(() => validateAdapterRequest({ ...request, parameters: hiddenValid }, capability));
  let accessed = false;
  const accessor = { limit: 2 };
  Object.defineProperty(accessor, "extra", { enumerable: true, get() { accessed = true; return true; } });
  invalid(() => validateAdapterRequest({ ...request, parameters: accessor }, capability));
  assert.equal(accessed, false);
  invalid(() => validateAdapterRequest({ ...request, parameters: { limit: 2, [Symbol("extra")]: true } }, capability));
});

test("raw identifiers, exceptions and malformed payloads fail closed", () => {
  invalid(() => validateAdapterRequest({ ...request, target: { ...target, reference: "person@example.test" } }, capability));
  invalid(() => validateAdapterRequest({ ...request, parameters: { account: "customer" } }, capability));
  invalid(() => validateAdapterResult({ ...result, category: new Error("private") }, request, capability));
  invalid(() => validateAdapterResult({ ...result, evidenceTier: { raw: "private" } }, request, capability));
  invalid(() => validateAdapterRequest(null, capability));
});

test("same v1 structure applies to all three provider interfaces", () => {
  for (const provider of ["odoo-sh", "customer-odoo", "plementus"]) {
    const cap = { ...capability, provider };
    const req = { ...request, target: { ...target, provider } };
    const res = { ...result, target: req.target };
    assert.equal(validateAdapterResult(res, req, cap), res);
  }
});
