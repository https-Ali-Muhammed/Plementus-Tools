import { WORKFLOW_STATES } from "./state.mjs";

const statuses = Object.freeze({
  checkpoint: ["worker_restart_uncertain", "browser_restart_uncertain", "clock_uncertain", "missing", "unreliable"],
  externalWrite: ["unknown", "reconciled_verified", "none_verified"],
  reconciliationEvidence: ["missing", "stale", "operator_assertion", "verified_current"],
  ownerAuthority: ["unavailable", "unverified", "case_specific_verified"],
  approval: ["missing", "stale", "operator_assertion", "verified_current"],
  incidentEvidence: ["uncleared", "cleared_verified"],
  disposition: ["not_started", "pending", "aborted", "guarded_committed"],
  absence: ["unverified", "guarded_verified"],
});
const keys = ["checkpoint", "persistedState", ...Object.keys(statuses).filter(key => key !== "checkpoint")];
const result = Object.freeze(Object.fromEntries([
  "invalid_input", "evidence_required", "reconciliation_required", "owner_review_required",
  "disposition_pending", "fresh_work_review_required",
].map(decision => [decision, Object.freeze({ decision, blocked: true })])));

// Status labels require a future trusted source; this layer grants no action even when all report verified.
export function decideSec01Recovery(input) {
  try {
    if (!input || typeof input !== "object" || Object.getPrototypeOf(input) !== Object.prototype) return result.invalid_input;
    const fields = Object.getOwnPropertyDescriptors(input);
    if (Reflect.ownKeys(fields).length !== keys.length || !keys.every(key =>
      Object.hasOwn(fields, key) && "value" in fields[key] && fields[key].enumerable)) return result.invalid_input;
    const value = Object.fromEntries(keys.map(key => [key, fields[key].value]));
    if (!WORKFLOW_STATES.includes(value.persistedState) ||
        Object.entries(statuses).some(([key, allowed]) => !allowed.includes(value[key]))) return result.invalid_input;
    if (["missing", "unreliable"].includes(value.checkpoint)) return result.evidence_required;
    if (value.externalWrite === "unknown") return result.reconciliation_required;
    if (value.reconciliationEvidence !== "verified_current") return result.evidence_required;
    if (value.ownerAuthority === "unavailable") return result.owner_review_required;
    if (value.ownerAuthority !== "case_specific_verified" || value.approval !== "verified_current") return result.evidence_required;
    if (value.incidentEvidence !== "cleared_verified" || value.disposition !== "guarded_committed" ||
        value.absence !== "guarded_verified") return result.disposition_pending;
    return result.fresh_work_review_required;
  } catch {
    return result.invalid_input;
  }
}
