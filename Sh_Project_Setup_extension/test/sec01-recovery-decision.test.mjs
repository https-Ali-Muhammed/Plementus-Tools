import assert from "node:assert/strict";
import test from "node:test";
import { decideSec01Recovery } from "../src/workflow/sec01-recovery-decision.mjs";
import { WORKFLOW_STATES } from "../src/workflow/state.mjs";

const caseStatus = (changes = {}) => ({
  checkpoint: "worker_restart_uncertain",
  persistedState: "ready",
  externalWrite: "none_verified",
  reconciliationEvidence: "verified_current",
  ownerAuthority: "unavailable",
  approval: "missing",
  incidentEvidence: "uncleared",
  disposition: "not_started",
  absence: "unverified",
  ...changes,
});
const blocked = decision => ({ decision, blocked: true });

test("worker and browser restart uncertainty requires owner review in every persisted state", () => {
  for (const checkpoint of ["worker_restart_uncertain", "browser_restart_uncertain", "clock_uncertain"]) {
    for (const persistedState of WORKFLOW_STATES) {
      assert.deepEqual(decideSec01Recovery(caseStatus({ checkpoint, persistedState })), blocked("owner_review_required"));
    }
  }
});

test("unknown external-write outcome requires reconciliation before disposition", () => {
  assert.deepEqual(decideSec01Recovery(caseStatus({ externalWrite: "unknown", ownerAuthority: "case_specific_verified" })), blocked("reconciliation_required"));
});

test("missing, stale, and asserted reconciliation evidence remain blocked", () => {
  for (const reconciliationEvidence of ["missing", "stale", "operator_assertion"]) {
    assert.deepEqual(decideSec01Recovery(caseStatus({ reconciliationEvidence, ownerAuthority: "case_specific_verified" })), blocked("evidence_required"));
  }
});

test("missing or unreliable checkpoint evidence needs a separate guarded review", () => {
  for (const checkpoint of ["missing", "unreliable"]) {
    assert.deepEqual(decideSec01Recovery(caseStatus({ checkpoint, ownerAuthority: "case_specific_verified" })), blocked("evidence_required"));
  }
});

test("unavailable owner and unverified identity cannot advance disposition", () => {
  assert.deepEqual(decideSec01Recovery(caseStatus()), blocked("owner_review_required"));
  assert.deepEqual(decideSec01Recovery(caseStatus({ ownerAuthority: "unverified" })), blocked("evidence_required"));
});

test("stale, missing, and asserted owner approval cannot advance disposition", () => {
  for (const approval of ["stale", "missing", "operator_assertion"]) {
    assert.deepEqual(decideSec01Recovery(caseStatus({ ownerAuthority: "case_specific_verified", approval })), blocked("evidence_required"));
  }
});

test("uncleared incident evidence and pending disposition remain blocked", () => {
  const authorized = { ownerAuthority: "case_specific_verified", approval: "verified_current" };
  assert.deepEqual(decideSec01Recovery(caseStatus(authorized)), blocked("disposition_pending"));
  for (const disposition of ["not_started", "pending"]) {
    assert.deepEqual(decideSec01Recovery(caseStatus({ ...authorized, incidentEvidence: "cleared_verified", disposition })), blocked("disposition_pending"));
  }
});

test("aborted, unconfirmed, or absence-unverified deletion cannot count as completed", () => {
  const ready = { ownerAuthority: "case_specific_verified", approval: "verified_current", incidentEvidence: "cleared_verified" };
  for (const disposition of ["aborted", "pending"]) {
    assert.deepEqual(decideSec01Recovery(caseStatus({ ...ready, disposition, absence: "guarded_verified" })), blocked("disposition_pending"));
  }
  assert.deepEqual(decideSec01Recovery(caseStatus({ ...ready, disposition: "guarded_committed" })), blocked("disposition_pending"));
});

test("reported guarded completion and absence require separate fresh-work review", () => {
  const input = Object.freeze(caseStatus({ ownerAuthority: "case_specific_verified", approval: "verified_current", incidentEvidence: "cleared_verified", disposition: "guarded_committed", absence: "guarded_verified" }));
  assert.deepEqual(decideSec01Recovery(input), blocked("fresh_work_review_required"));
  assert.equal(input.persistedState, "ready");
});

test("unknown, malformed, extra, accessor, and boolean statuses fail closed without disclosure", () => {
  const cases = [null, [], {}, caseStatus({ checkpoint: "unknown" }), caseStatus({ disposition: true }),
    caseStatus({ persistedState: "unknown" }), caseStatus({ ownerAuthority: true }),
    caseStatus({ extra: "private-marker" })];
  const accessor = caseStatus();
  Object.defineProperty(accessor, "ownerAuthority", { enumerable: true, get() { throw Error("private-marker"); } });
  cases.push(accessor);
  for (const input of cases) assert.deepEqual(decideSec01Recovery(input), blocked("invalid_input"));
});

test("every valid decision has no replay, retry, transition, deletion, or fresh-creation grant", () => {
  for (const changes of [
    {}, { externalWrite: "unknown" }, { reconciliationEvidence: "stale" },
    { ownerAuthority: "case_specific_verified", approval: "verified_current", incidentEvidence: "cleared_verified", disposition: "pending" },
    { ownerAuthority: "case_specific_verified", approval: "verified_current", incidentEvidence: "cleared_verified", disposition: "guarded_committed", absence: "guarded_verified" },
  ]) {
    const result = decideSec01Recovery(caseStatus(changes));
    assert.deepEqual(Object.keys(result).sort(), ["blocked", "decision"]);
    assert.equal(result.blocked, true);
    assert.equal(JSON.stringify(result).includes("private-marker"), false);
  }
});
