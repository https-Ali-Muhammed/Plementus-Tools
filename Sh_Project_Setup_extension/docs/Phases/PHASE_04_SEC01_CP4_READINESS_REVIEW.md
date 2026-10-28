# SEC-01 checkpoint 4: security and activation readiness review

**Status: READY_FOR_REVIEW — DOCUMENTATION ONLY. Activation: NO_GO.** CP1–CP3 are ACCEPTED per ChatGPT acceptance supplied for this review. Phase 04 remains **IN_PROGRESS / BLOCKED**; progress remains **4/20 master phases and 18/72 micro-phases accepted**. CP4 is an engineering checkpoint, not a master-plan micro-phase. Approval of this report is not approval to activate storage or runtime behavior.

This review uses the unchanged [approved policy](PHASE_04_SEC01_APPROVED_POLICY.md), [implementation plan](PHASE_04_SEC01_STORAGE_IMPLEMENTATION_PLAN.md), [CP1](PHASE_04_SEC01_CP1.md), [CP2](PHASE_04_SEC01_CP2.md), [CP3](PHASE_04_SEC01_CP3.md), [security requirements](../09_SECURITY_AND_SECRETS.md), and existing source. The published commit `7d0861c3f8750e0be741562ecf235f11c5b7e7e8` is the owner-supplied CP3 baseline; this review verified local HEAD and local upstream equality without fetching. The CP3 report and its original test evidence remain historical and unchanged. No new browser, provider, or operational security test was run.

## Security readiness matrix

`PASS` means only the stated, bounded evidence passed. `PARTIAL` means some engineering evidence exists but the complete control is unverified. `OPEN` needs a decision or implementation. `BLOCKED` prevents activation now. The decision-maker column assigns the proposed closure decision; it does not claim that person has approved it.

| Requirement | Existing evidence | State | Missing decision or verification | Responsible decision-maker | Exact closure evidence |
|---|---|---|---|---|---|
| Approved seven-field v2 schema; reject unknown, prohibited, legacy and malformed data | CP1 pure guards; CP2 service; CP3 isolated browser cases | PARTIAL | Production worker boundary and privacy review absent | Owner/security reviewer | Reviewed runtime schema path plus negative tests against actual caller interface and stored records with invented data |
| Local, profile-scoped storage; no sync, export, telemetry or external transmission | CP2 injected factory; CP3 disposable extension-origin IndexedDB; production manifest has no permission keys | PARTIAL | Production runtime and network/permission review absent | Owner/security reviewer | Packaged manifest inspection and authorized isolated runtime observation showing local-only storage and no external requests or export path |
| Immutable creation time; deny use at exact seven-day boundary | CP1/CP2 guards; CP3 boundary and non-renewal test | PARTIAL | Trusted time and rollback across restarts unresolved | Owner/security reviewer | Approved time-trust design and observed restart/rollback tests that fail closed without extending expiry |
| Delete completed/cancelled after acknowledgment, explicit deletion, and expiry no later than seven days | CP2/CP3 transactional deletion and cleanup when invoked | BLOCKED | No deadline deletion while Chrome is closed; no production scheduling; no secure-erasure proof | Owner/security reviewer | Approved policy-compatible mechanism and observed deadline/closed-browser, conflict, failure and absence evidence; separately characterize disk-remanence limits |
| Atomic expected-state/revision checks and fail-closed failures | CP2 fake transaction tests; CP3 real isolated IDB conflict/abort results | PARTIAL | Production caller path and competing-context lifecycle unverified | Owner/security reviewer | Authorized runtime tests showing one committed competing update, one conflict, abort preservation and no success before commit |
| Missing, corrupt, expired, stale, terminal and uncertain records stop work | CP1–CP3 guards and isolated cases; `reconcile_required` has no continuation path | PARTIAL | Real workflow interruption and operator reconciliation path absent | Owner/operator/security reviewer | Authorized end-to-end interrupted-action cases with no replay and documented operator reconciliation before any safe continuation |
| One authoritative worker storage service; no direct repository update bypass | CP2 service disconnected; production `src/background.js` has no service import; v1 repository still exports `update` | OPEN | Runtime design and guard implementation separately authorized | Owner/security reviewer | Reviewed worker integration and tests proving only allowlisted calls reach service and direct update bypass is unavailable |
| Sender/origin validation, strict request/response schemas, unauthorized-call denial, no content-script storage | CP3 test-only read handler is synthetic; production message interface absent | OPEN | Runtime trust-boundary implementation and tests absent | Owner/security reviewer | Negative tests for forged sender, origin, malformed request, unknown action and response leakage; content-script access denied |
| Real operator identity, per-sensitive-action approval, approval scope/validity/revocation | CP2/CP3 `authorize` callback returns synthetic booleans | BLOCKED | Identity and approval authority are not established | Owner/operator/security reviewer | Approved identity and approval contract plus authorized tests for valid, stale, wrong-target and revoked approvals; no blanket approval |
| Device disk encryption, screen lock, protected profile and unauthorized-local-access response | Approved policy names prerequisites; no device checks performed | BLOCKED | Verification method, accountable attestor and fail/unverifiable response unset | Owner/security reviewer | Recorded technical observations where possible plus named security/operator attestation and fail-closed activation decision |
| Incident owner, contacts, channel, escalation, custodian, containment/recovery authority | Policy requires owner-led response; details unset | BLOCKED | All table values below need owner decision | Owner/security reviewer | Owner-approved incident procedure with assigned roles, reachable route, timing, evidence custody and exercise or documented validation |
| No new permission, provider write, migration, or production activation from CP1–CP3 | CP1–CP3 reports; current manifest and worker inspection | PASS | Bounded to current source and historical evidence | Owner/security reviewer for later activation | Recheck packaged artifact and scope immediately before any separately authorized activation |

## Seven-day retention: distinct guarantees

1. **Record expiry and denial of use:** `checkpointEligibility` returns `expired` at `createdAt + 604800000` when its clock is trustworthy. The service refuses normal reads and transitions then. This controls use; the expired bytes may still exist in IndexedDB.
2. **Cleanup while Chrome runs:** `cleanup()` scans structurally valid records and deletes expired ones with a revision check. It runs only when a caller invokes it. A conflict, invalid record or failed transaction is an unresolved cleanup, and earlier successful deletions are not rolled back. CP3 exercised cleanup after advancing a test clock; it did not prove deadline scheduling.
3. **Physical deletion while Chrome is closed:** no extension worker can execute then. The current implementation cannot guarantee deletion at the seven-day deadline if Chrome remains closed. A later launch may clean up, but that is later than the approved maximum and does not satisfy it. Even an external scheduled process cannot delete while a device is off; feasibility and policy compliance require explicit owner/security resolution.
4. **Secure erasure from disk:** an IndexedDB delete/absence check does not prove erasure from browser files, backups, snapshots, wear-leveled media or forensic recovery. Disk encryption reduces exposure but does not turn a database delete into an erasure guarantee. The approved policy must not be described as proven secure erasure.

**Options for owner review:** (A) keep activation blocked until a separately authorized, browser-independent retention mechanism is designed and tested against the seven-day deadline, including closed browser and powered-off limits; (B) use no durable checkpoint storage if that deadline cannot be demonstrated; (C) if the owner wants a different guarantee, request a separate, explicit policy revision and security review. Option C is not approved here and does not reinterpret the current policy. **Recommendation: NO_GO for activation until the owner/security reviewer identifies a policy-compatible guarantee and records its limits.**

The service compares clock observations only within one service instance. With exactly the seven approved persistent fields, a clock rollback across worker or browser restarts cannot reliably be detected. A changed local clock can defer apparent expiry and cleanup; a future trusted-time or equivalent design needs separate approval and evidence. Until then, seven-day compliance remains unproven even when Chrome runs.

## Proposed incident-response decision table

Suspected exposure stops affected operations. Only safely redacted evidence may be preserved. These proposed decisions have no assigned person, route, deadline or authorization yet.

| Decision | Proposed responsibility or behavior | Required value | Closure evidence |
|---|---|---|---|
| Incident owner | Direct triage and owner-led decisions | OWNER_DECISION_REQUIRED | Named role/person and accepted duty |
| Primary contact | Receive first notification | OWNER_DECISION_REQUIRED | Named reachable contact and validated route |
| Backup contact | Receive escalation if primary unavailable | OWNER_DECISION_REQUIRED | Named reachable backup and validation |
| Notification channel | Approved secure route; no secrets or raw checkpoint data in notices | OWNER_DECISION_REQUIRED | Channel and redacted notice procedure approved |
| Escalation timeframe | Trigger and maximum time to backup/owner | OWNER_DECISION_REQUIRED | Approved timing and documented exercise or validation |
| Evidence custodian | Preserve access-controlled, redacted evidence and record chain of custody | OWNER_DECISION_REQUIRED | Assigned custodian and retention/access procedure |
| Containment authority | Authorize disabling affected actions and any credential/provider containment | OWNER_DECISION_REQUIRED | Approved decision authority and procedure |
| Recovery authority | Authorize safe resumption only after cause, exposure and reconciliation review | OWNER_DECISION_REQUIRED | Approved criteria and signed recovery decision |

## Device-security verification proposal

| Control | Possible technical observation | Required operator/security attestation | Failed or unverifiable result |
|---|---|---|---|
| Disk encryption | Security reviewer may inspect OS-reported encryption state for the relevant device/volume | Confirm coverage, key custody and policy compliance; IndexedDB provides no encryption claim | NO_GO; do not write checkpoints |
| Screen lock | Inspect configured automatic lock and authentication requirement where the OS exposes them | Confirm actual operator practice and required lock policy | NO_GO; do not write checkpoints |
| Protected browser profile | Inspect profile location, ownership, OS permissions and sharing configuration where observable | Confirm dedicated authorized operators and profile access procedure | NO_GO; do not write checkpoints |
| Unauthorized local access | Review OS account/profile access evidence within an approved scope | Attest who may use the device/profile and how access is revoked and incidents reported | NO_GO; stop affected operations and use approved incident route |

No device, account or operator state was inspected in CP4. A technical signal alone cannot establish who has physical access, recovery keys, backups or an unlocked session. The owner/security reviewer must specify the actual checks, acceptable evidence, review cadence and treatment of unavailable signals before activation.

## Operator authorization and runtime boundary

The CP2 callback and CP3 test handler use synthetic authorization. They do not identify a human, prove the human controls the selected account, or bind approval to a particular write. A proposed authorization contract must check operator identity through an approved local/provider flow without storing credentials; bind each approval to the exact action, target account/origin, repository or environment, and intended effect; check freshness and current validity immediately before the action; and reject revoked, stale, wrong-target or ambiguous approvals. Each sensitive action still requires its own explicit approval. After a possible external write or interruption, mandatory operator reconciliation precedes safe continuation; there is no automatic retry or replay. Identity source, approval lifetime, revocation authority and evidence format are **OWNER_DECISION_REQUIRED**. No provider permission is assumed.

The current production worker is only an `onInstalled` stub. The checkpoint service accepts an injected factory and synthetic `authorize`; it is not imported into the worker or popup. The v1 `createRunRepository` still exposes unrestricted `update` to any module that instantiates it. Before separately authorized integration, make one MV3 worker service authoritative; expose only named operations through a narrow message allowlist; validate sender identity, extension origin, request shape and field bounds; return only strict, sanitized response shapes; deny unknown or unauthorized calls; keep content scripts from direct storage access; and remove or equivalently guard unrestricted repository updates. A compromised extension or local profile is outside what a message allowlist alone can protect. **All production runtime access restrictions are UNIMPLEMENTED / NOT TESTED.** No workflow runner, automatic retry or external-write replay is authorized by this review.

## Activation decision

| Gate | Current result | Decision |
|---|---|---|
| A. CP1–CP3 engineering evidence | ACCEPTED within their pure, synthetic and isolated-browser scope | PASS for bounded evidence only |
| B. CP4 documentation readiness | This review inventories gaps and proposals; pending ChatGPT acceptance | READY_FOR_REVIEW; not activation approval |
| C. Actual runtime-security verification | Production integration, real authorization, retention deadline, device and incident controls unresolved | NO_GO |
| D. Owner activation approval | No activation authorization or final security acceptance | NO_GO |

**Overall: NO_GO.** Any unresolved mandatory control keeps activation blocked. CP4 acceptance would accept this documentation review only.

## Next implementation gates, in dependency order

These are proposed scoped tasks, not additions to the master plan. Each requires its own owner authorization before work.

| Task | Required owner authorization | Potentially affected files/components | Acceptance evidence | Rollback/failure behavior | Browser tests / persistent writes |
|---|---|---|---|---|---|
| 1. Resolve retention and clock feasibility | Approve a policy-compatible design or separately request policy revision | SEC-01 policy only if separately revised; storage design, clock source, operations procedure | Written owner/security decision; demonstrable seven-day deadline including closed-browser/power-off limits and restart rollback model | Maintain NO_GO; do not activate or invent timestamps | Design review: no / no; later feasibility test: separately authorize both as needed |
| 2. Set incident and device-control decisions | Name roles/routes/timing and approve device-verification method and evidence scope | Incident procedure, device/security runbook | Approved table values, verified route, technical observations and accountable attestations | Failed/unverifiable check blocks activation; stop affected operations on exposure | Device checks may need separate operational authorization; no browser writes required by decision itself |
| 3. Define real operator authorization and reconciliation contract | Approve identity source, per-action scope, lifetime, revocation and evidence handling | Worker message contract, authorization boundary, workflow/recovery decision | Reviewed contract and negative synthetic tests for stale/revoked/wrong-target approvals and uncertain writes | Reject actions and require manual reconciliation; no replay | Later isolated browser tests likely; persistent writes only with separate authorization |
| 4. Implement guarded worker service and caller boundary | Separately authorize runtime code and isolated testing; no provider operations | `src/background.js`, `src/storage/checkpoint-service.mjs`, `src/storage/run-record.mjs`, popup caller, manifest only if expressly approved, tests | Allowlist/sender/schema tests; no direct content-script or repository bypass; inspected permissions and sanitized responses | Disable integration, abort transactions, preserve unresolved records, report generic failures | Yes, isolated browser tests and disposable-profile persistent writes require separate authorization |
| 5. Verify lifecycle, deletion and security controls | Authorize isolated browser/profile testing and any needed device checks | Runtime/test harness, storage and security evidence | Worker, popup/tab, browser restart, clock rollback, competing updates, expired cleanup, failed deletion and no replay observations; device and incident evidence | NO_GO on failure; preserve sanitized evidence and do not delete unresolved records silently | Yes; disposable-profile persistent writes required; no provider writes |
| 6. Decide activation | Explicit owner approval after all gates close | Release/operations record; packaged artifact | Signed GO decision tied to exact artifact, environment and complete evidence | Keep disabled / NO_GO if any evidence is missing or stale | No new test implied; any production write requires separate explicit authorization |

## CP4 validation boundary

This document is a source-and-record review. It does not rerun CP1–CP3 tests or inspect device security. It does not authorize implementation, migration, profile writes, provider access, permission changes, a commit, a push, or Phase 05 work. The historical test counts above are cited from CP1–CP3, not newly executed results.
