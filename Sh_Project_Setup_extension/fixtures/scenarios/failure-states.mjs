// Invented inputs and expected results for future online-adapter tests; never authority to act.
import { CONTRACT_VERSION } from "../../src/adapters/contract.mjs";

const target = provider => Object.freeze({ provider, reference: "fixture-target", environment: "test" });
const scenario = (id, provider, operation, classification, mutates, parameters, status, category, checkpoint) => {
  const selectedTarget = target(provider);
  const capability = Object.freeze({ version: CONTRACT_VERSION, provider, operation, classification, mutates });
  const request = Object.freeze({ version: CONTRACT_VERSION, operation, parameters: Object.freeze(parameters), target: selectedTarget,
    context: Object.freeze({ run: "fixture-run", step: id.toLowerCase() }), ...(mutates ? { approvalReference: "fixture-approval" } : {}) });
  const uncertainWrite = mutates && status === "unknown";
  const result = Object.freeze({ version: CONTRACT_VERSION, operation, target: selectedTarget, status, evidenceTier: "SIMULATED", category,
    retrySafety: uncertainWrite ? "reconcile-first" : mutates ? "unsafe" : "safe",
    reviewRequired: true, reconciliationRequired: uncertainWrite, verification: "none" });
  return Object.freeze({ id, capability, request, result, checkpoint });
};

export const FAILURE_SCENARIOS = Object.freeze([
  scenario("F01", "odoo-sh", "inspect-page", "unverified", false, { "unknown-dom": true }, "unknown", "unsupported", "manual-page-review"),
  scenario("F02", "odoo-sh", "create-project", "blocked", true, { "target-verified": false }, "blocked", "target-mismatch", "target-review"),
  scenario("F03-login", "odoo-sh", "create-project", "blocked", true, { "login-required": true }, "blocked", "unverified", "manual-login"),
  scenario("F03-mfa", "odoo-sh", "create-project", "blocked", true, { "mfa-required": true }, "blocked", "unverified", "manual-mfa"),
  scenario("F03-captcha", "odoo-sh", "create-project", "blocked", true, { "captcha-required": true }, "blocked", "unverified", "manual-captcha"),
  scenario("F04", "customer-odoo", "install-module", "supported", true, { "permission-denied": true }, "failed", "permission", "operator-review"),
  scenario("F05-timeout", "odoo-sh", "create-project", "supported", true, { "possible-write": true }, "unknown", "timeout", "reconcile-before-retry"),
  scenario("F05-interrupted", "customer-odoo", "install-module", "supported", true, { "possible-write": true }, "unknown", "interrupted", "reconcile-before-retry"),
  scenario("F05-unknown", "plementus", "submit-database-info", "supported", true, { "possible-write": true }, "unknown", "unknown-outcome", "reconcile-before-retry"),
  scenario("F06", "customer-odoo", "inspect-module", "unverified", false, { available: true, installed: false }, "unknown", "unverified", "installation-review"),
  scenario("F07-submit", "plementus", "submit-database-info", "supported", true, { "possible-write": true }, "unknown", "unknown-outcome", "reconcile-before-retry"),
  scenario("F07-connect", "plementus", "connect", "unverified", true, { "possible-write": true }, "unknown", "unknown-outcome", "reconcile-before-retry"),
]);
