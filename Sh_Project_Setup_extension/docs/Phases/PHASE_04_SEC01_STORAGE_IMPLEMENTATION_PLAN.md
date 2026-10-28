# SEC-01 IndexedDB implementation and test plan

**PLAN ONLY — SEC-01 OWNER_APPROVED; IMPLEMENTATION NOT AUTHORIZED.** Phase 04 remains **IN_PROGRESS / BLOCKED**; progress remains **4/20 master, 18/72 micro-phases accepted**. This plan is not storage, migration, security, or lifecycle evidence. It does not alter the master plan's 72 micro-phases. Authority: [SEC-01 policy](PHASE_04_SEC01_APPROVED_POLICY.md), [security requirements](../09_SECURITY_AND_SECRETS.md), and [blockers](../05_BLOCKERS_AND_DECISIONS.md).

## Architecture and boundaries

After separate authorization, evaluate an extension-origin IndexedDB adapter owned by one authoritative service in the MV3 worker. Popup requests go through a narrow, sender-validated message interface; the worker uses the same service. Verify sender identity, extension origin and expected message shape, reject unrecognized callers and operations, and return sanitized results. A content script must have no direct database or service access. Do not expose a generic update or database handle to callers: make the current `createRunRepository` update private to the service or enforce equivalent guards before runtime integration. IndexedDB transactions, rather than an in-memory worker lock, must arbitrate competing contexts and worker restarts. No sync, export, telemetry, or provider requests are part of this design.

The current manifest declares an MV3 module worker and popup, with no `permissions` or `host_permissions`. Extension-origin IndexedDB is the candidate without a new `storage` or host permission; confirm this with a separately authorized isolated Chrome test and inspect the packaged manifest. Do not add `unlimitedStorage`: quota, eviction, availability and failures must be handled rather than assumed away. A worker is not a security boundary against a compromised extension or a local user with profile access; access control, minimal stored data and device prerequisites remain necessary.

## Schema and migration

Define a new explicit schema version with exactly `schemaVersion`, `runId`, `state`, `step`, `evidenceTier`, `revision`, and immutable `createdAt`. Preserve the current validator's bounded IDs, states, steps, tiers, revisions and strict own-data-property checks; reject unknown, missing, malformed or sensitive fields. Specify and test a finite, valid creation-time representation before implementation. Expiry is `createdAt + 7 * 24 * 60 * 60 * 1000` milliseconds; reject overflow, future/invalid times and expired records, including at the exact boundary. Recheck on every read and immediately before a transition or update; updates cannot alter `createdAt` or renew expiry. Clock rollback or an unreliable clock must not silently extend retention: fail closed when detected, and document the limits of detecting it across restarts without an additional persisted field.

The existing version 1 six-field schema is a synthetic foundation, not evidence of a deployed database. Plan an explicit versioned database/schema upgrade and validate every candidate before any conversion. A legacy record lacks an authoritative creation time, so do not invent one from migration time or implicitly migrate it; reject and block recovery, preserve it for an explicitly authorized resolution, and do not silently delete it. A valid, trustworthy creation time and a policy-compatible conversion process would require separate approval if legacy durable records are ever found. Unknown versions, invalid records and failed upgrades abort or fail closed without partial conversion. New records receive `createdAt` only at creation.

## Atomic transitions and recovery

Use a single read-write transaction for read, validation, expiry check, expected state and revision comparison, `decideTransition` evaluation, and conditional write. Adapt the current synchronous synthetic APIs and validation deliberately for the successor schema; do not assume the existing fake adapter provides IndexedDB atomicity. Increment revision exactly once, preserve `createdAt`, reject stale, duplicate or competing requests, abort on any failure, and require a fresh read and operator review after conflict. Never overwrite a completed or cancelled record with a transition; they remain terminal until authorized deletion.

The existing decision code intentionally refuses `reconcile_required` to `ready` and returns proposals requiring operator review. A future separately reviewed guard must require operator reconciliation evidence before any safe continuation; do not relax that rejection until its evidence path and validation are designed and tested. Missing, corrupt, stale or uncertain records stop work. A possible external operation after interruption requires operator reconciliation; no automatic replay, retry, runner or provider call follows from recovery.

## Deletion and retention

Support explicit operator deletion and deletion after operator acknowledgment of completion or cancellation, whichever occurs before expiry. In the same read-write transaction, validate identity and applicable state, compare the expected revision, then delete; a conflict, malformed record, transaction abort or error stops the operation and must not be reported as deletion. Expired records cannot be returned for continuation. On authorized service access/startup, scan for expiry and delete each eligible record with transactional revision checks; a conflict or failure remains a reported unresolved cleanup, not success. Do not use a general validation path that prevents recognizing a structurally valid but expired record for cleanup.

A closed browser cannot run scheduled cleanup: deletion at the seven-day deadline cannot be guaranteed while it is closed. The seven-day maximum and this limitation require owner/security resolution before activation if the implementation cannot meet the policy; do not reinterpret expiry as a longer retention authorization. Capture sanitized local evidence of requested action, transaction completion and subsequent absence, or failure/conflict, without persisting prohibited details or claiming secure physical erasure. No evidence is available yet.

## Security and activation

The only persistent values are the seven allowlisted, validated fields. Never store credentials, account data, customer identifiers, subscription references, URLs, repository identifiers, screenshots, raw errors or telemetry; errors and messages must not echo them. Threats include untrusted page messages, unauthorized extension callers, stale concurrent writes, compromised extension/profile, corrupted data, clock manipulation and interrupted transactions. Enforce sender/shape checks, no content-script access, validation on reads and writes, transaction guards and fail-closed recovery; these controls cannot defeat a compromised device or extension.

Activation requires disk encryption, screen lock and a protected browser profile. The owner/security reviewer must define observable verification and the response to failed or unverifiable controls. IndexedDB itself makes no encryption guarantee. Before activation the owner must name incident contacts, notification route, escalation timing and evidence custodian. Suspected exposure stops affected operations and triggers owner-led handling through that route, with only safely redacted evidence and authorized remediation. These decisions remain open; this plan does not verify them.

## Test plan and acceptance evidence

Use invented records and isolated local profiles only; no real customer or provider data. Each gate records commands, environment, pass/fail/skip counts, sanitized observations and unresolved failures. Proposed tests are NOT RUN.

1. **Unit and fake IndexedDB:** strict seven-field and version validation; prohibited/unknown properties; immutable timestamp, overflow, invalid/future times, exact expiry boundary, non-renewal and detectable clock rollback; legacy/unknown/corrupt versions without implicit migration; upgrade aborts and no partial writes. Exercise quota, unavailable database, transaction abort, cleanup and generic errors.
2. **Concurrency and deletion:** two competing expected-state/revision updates yield one commit and one conflict; interrupted writes roll back; terminal states cannot transition; stale deletion and cleanup conflicts preserve the newer record. Verify operator deletion, acknowledged completion/cancellation deletion, expired cleanup, deletion failure and subsequent absence only after a completed transaction.
3. **Recovery:** missing, corrupt, stale, expired and terminal records; operator review and reconciliation of uncertain operations without replay; no continuation when evidence is absent. Check that direct repository updates and content-script or unauthorized messages cannot bypass the service.
4. **Real isolated Chrome MV3:** separately authorize browser tests; inspect packaged permissions and network activity, restart the actual worker, close/reopen popup and test tab closure, then observe recovery and transaction outcomes. Cover browser closed past expiry and document the limitation; use a disposable profile with invented data. Fake IndexedDB and unit results are not browser lifecycle evidence.
5. **Activation:** separate owner/security evidence for device controls, incident route, retention feasibility and privacy review. Local test success alone does not authorize production activation.

## Small delivery checkpoints and rollback

These are engineering checkpoints, not new master-plan micro-phases, and each requires separate implementation authorization and review:

| Checkpoint | Acceptance evidence | Failure / rollback |
|---|---|---|
| 1. Schema and pure policy guards | Unit results for validation, time, transition and reconciliation; legacy rejection | Keep runtime disconnected; revert scoped changes if authorized, preserve evidence and investigate. |
| 2. IndexedDB service and transactions | Fake IndexedDB results for atomicity, upgrades, conflicts, cleanup and access guards | Abort transactions, disable integration, preserve invalid data and report errors; no destructive fallback. |
| 3. Isolated MV3 lifecycle | Observed worker restart, popup/tab closure, deletion and no replay; manifest and network checks | Stop tests, disable service, preserve sanitized diagnostics and resolve failures before retest. |
| 4. Activation review | Owner/security decisions and evidence for prerequisites, incident route and seven-day retention including closed-browser behavior | Do not activate if any gate is missing or fails; owner determines separately authorized remediation. |

Rollback must not silently downgrade or discard a newer database. A failed or unsupported version remains inaccessible pending an explicitly authorized recovery plan. No production storage, deployment or provider activity is authorized by this document.
