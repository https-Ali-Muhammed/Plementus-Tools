# Phase 04 SEC-01: strict operator-assisted recovery decisions

**Status: DISCONNECTED SYNTHETIC DECISION / READY_FOR_INDEPENDENT_REVIEW.** Phase 04 remains **IN_PROGRESS / BLOCKED** at **5/20 master phases and 22/72 micro-phases accepted**. Production remains **NO_GO**. This artifact implements the owner's strict recovery direction without changing the [SEC-01 policy](PHASE_04_SEC01_APPROVED_POLICY.md), [combined A+B decision](PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md), [uncertain-time retention amendment](PHASE_04_SEC01_UNCERTAIN_TIME_RETENTION_AMENDMENT.md), or [global cleanup gate](../../../src/storage/checkpoint-service.mjs).

## Scope and authority

The pure [`decideSec01Recovery`](../../../src/workflow/sec01-recovery-decision.mjs) function classifies sanitized status values only. It neither reads nor changes a checkpoint, invokes a provider, authenticates an owner, deletes storage, nor authorizes any action. The [master plan](../../01_MASTER_PLAN.md), [Phase 04 record](PHASE_04.md), [operator-assisted plan](PHASE_04_SEC01_OPERATOR_ASSISTED_RECOVERY_PLAN.md), [held-record admission decision](PHASE_04_SEC01_HELD_RECORD_ADMISSION_DECISION.md), and [security requirements](../../09_SECURITY_AND_SECRETS.md) remain the controlling context. This task follows the owner's narrower direction: **no held-record admission beside an unresolved checkpoint**. The existing service's database-wide cleanup gate remains in force. The separate [v1 synthetic recovery function](../../../src/workflow/recovery.mjs) is neither imported nor a SEC-01 fallback.

## Exact input and output contract

Input must be a plain object with exactly these nine enumerable own data properties. Accessors, symbols, extra or missing fields, unknown values, inherited input, and malformed objects produce `{ decision: "invalid_input", blocked: true }`. Values are enums, never booleans or checkpoint contents.

| Property | Accepted values |
|---|---|
| `checkpoint` | `worker_restart_uncertain`, `browser_restart_uncertain`, `clock_uncertain`, `missing`, `unreliable` |
| `persistedState` | One of the existing workflow states; it has **no effect** on old-run permission |
| `externalWrite` | `unknown`, `reconciled_verified`, `none_verified` |
| `reconciliationEvidence` | `missing`, `stale`, `operator_assertion`, `verified_current` |
| `ownerAuthority` | `unavailable`, `unverified`, `case_specific_verified` |
| `approval` | `missing`, `stale`, `operator_assertion`, `verified_current` |
| `incidentEvidence` | `uncleared`, `cleared_verified` |
| `disposition` | `not_started`, `pending`, `aborted`, `guarded_committed` |
| `absence` | `unverified`, `guarded_verified` |

Every result is a frozen, sanitized two-field object with `blocked: true` and one decision string. The priority order is:

| Condition | Decision |
|---|---|
| Malformed or unknown input | `invalid_input` |
| Missing/unreliable checkpoint or missing/stale/asserted reconciliation evidence | `evidence_required` |
| Unknown external-write outcome | `reconciliation_required` |
| Owner unavailable | `owner_review_required` |
| Owner identity/case authority unverified, or approval missing/stale/asserted | `evidence_required` |
| Incident evidence uncleared; disposition absent, pending or aborted; transaction or absence not verified | `disposition_pending` |
| Guarded completion and absence *reported* with all prior statuses satisfied | `fresh_work_review_required` |

An uncertain checkpoint with an unavailable owner returns `owner_review_required` for every persisted workflow state, including `ready` and `completed`. Its old workflow remains blocked. None of the decisions grants resume, transition, replay, retry, deletion, or fresh creation. `fresh_work_review_required` describes a separate review after reported disposition; it is **not** a finding that the disposition happened and is **not** admission. A missing row does not by itself prove deletion.

## Future trust boundary and stop condition

The enum values are synthetic inputs, not credentials or proof. A caller could forge `case_specific_verified`, `guarded_committed`, or `guarded_verified`; this module therefore grants no action even on that path. Before any runtime integration, a separately reviewed, sole guarded service and owner-controlled process must establish the actual owner identity and case-specific, current, revocable approval; bind reliable row identity and revision; preserve or clear incident evidence under an approved procedure; reconcile each possible external write through an authorized observation; and report transaction **completion** plus feasible **absence** from independent guarded checks. The adapter must reject operator assertions, untrusted page text, unchecked booleans, stale evidence, and ambiguous outcomes. It must not pass raw records, identifiers, targets, credentials, URLs, screenshots, or errors into this decision layer or its output. Missing or unreliable guards require a separately reviewed disposition procedure; they cannot be inferred from a status label.

Only after a disposition is independently verified may a **separate** new-work process independently verify current target, account, origin, environment, permission, and intended effect and obtain fresh action-specific authorization. The seven-field checkpoint cannot prove old-target binding; this task provides no such evidence or admission path. If that proof, real owner authority, guarded completion, or absence verification is unavailable, retain the blocked case and outstanding physical-retention obligation. Do not resume the old run, use v1 recovery, clear the global gate, or dispose automatically. Normal trusted-time cleanup, exact seven-day logical expiry, uncertain-time hold, and all approved privacy rules remain unchanged.

## Bounded evidence

The new [tests](../../../test/sec01-recovery-decision.test.mjs) exercise synthetic statuses and fail-closed decisions. They do not establish real operator authority, provider reconciliation, browser-worker integration, actual deletion, or fresh-work eligibility. Independent ChatGPT review is the next gate; Phase 04 remains **BLOCKED** and production **NO_GO**.
