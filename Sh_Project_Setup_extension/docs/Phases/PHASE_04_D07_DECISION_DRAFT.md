# D-07 owner policy decision draft: Phase 04 durable checkpoints

**Status: DRAFT / OWNER APPROVAL REQUIRED.** This is decision preparation only. It does not approve persistence, retention, deletion, encryption, permissions, browser recovery, provider activity, or parent Phase 04 acceptance. Parent Phase 04 remains **IN_PROGRESS / BLOCKED**.

## Decision requested

Approve or reject each item below before any durable checkpoint implementation. Record the selected policy in an owner-approved decision record; unselected options are not authorized.

### 1. Allowed persisted fields

The current sanitized run-record schema can represent only `schemaVersion`, `runId`, `state`, `step`, `evidenceTier`, and `revision`. The owner must select exactly which of those fields, if any, may persist, their meaning, and whether an opaque `runId` is acceptable as local data.

The following are mandatory exclusions: passwords, MFA or CAPTCHA data, private keys, cookies, access tokens, customer identifiers, subscription references, database names or users, URLs, repositories, form input, account identity, screenshots, raw errors, provider responses, and operation payloads. Do not add fields without a later approved schema change.

### 2. Retention and deletion

The owner must specify a retention duration or event, the authoritative time source, and deletion triggers. Required decisions include completion, cancellation, explicit operator deletion, uninstall, expiry, failed reconciliation, suspected exposure, and device loss or transfer. The owner must also decide whether deletion is best-effort local removal, a verified removal result, or an operator-directed process when browser storage cannot be verified.

No duration, automatic purge, cleanup schedule, or deletion guarantee is approved by this draft.

### 3. Authorized scope and access

The owner must choose the permitted storage mechanism and scope, including whether data is device-local only, profile-local, synchronised, exportable, or accessible to any future extension surface. The decision must name which extension components may read, create, update, and delete checkpoints and prohibit other code paths.

Mandatory boundary: no persistence of credentials or sensitive form data, no telemetry or external transmission, and no broad host permissions inferred from checkpoint storage. Any export, support collection, or cross-device behavior requires separate authorization.

### 4. Encryption and device security

The owner must decide whether platform storage encryption is sufficient, whether an additional application-layer control is required, supported-device expectations, screen-lock and profile-separation requirements, backup behavior, and the response for a device judged insecure.

The implementation must document the actual protection provided rather than claim encryption from an API name. It must fail closed when required protection is unavailable; this draft does not select a cryptographic design or authorize key handling.

### 5. Redacted evidence, screenshots, and incidents

The owner must decide which non-secret evidence fields, if any, may be retained; their retention; where redaction is performed; and who may access them. Screenshots, exports, logs, and raw errors remain disallowed unless separately approved with a redaction method and access policy.

For suspected exposure, required behavior is to stop affected actions, preserve only safely redacted evidence, notify the owner through an authorized channel, and follow owner/provider incident and credential-revocation procedures. The owner must define roles, reporting channel, retention, and evidence-handling process.

### 6. Missing, stale, and corrupted checkpoints

Mandatory behavior: fail closed with generic errors, do not expose record contents, and do not automatically replay an external write. A missing or malformed record cannot start or resume work. A schema-version mismatch, invalid state, stale revision, or failed atomic update requires operator review. A checkpoint associated with a possible interrupted write must remain `reconcile_required` until a later approved reconciliation mechanism establishes safety.

The owner must decide the operator-facing recovery procedure, acceptable reconciliation evidence, escalation owner, and whether cancellation or blocking is permitted for each unresolved case. An allowed state-machine transition does not prove operational prerequisites.

## Mandatory integration requirements

Before runtime integration, route every state-changing request through one authoritative transition service that:

- reads the current record;
- validates schema, expected state, and expected revision;
- obtains a proposal from `decideTransition`;
- performs an atomic compare-and-replace through the repository adapter; and
- returns a generic conflict result without mutation when any check fails.

Direct `createRunRepository(...).update(...)` calls must be private to that service or guarded equivalently; otherwise they can bypass state-transition rules. The service must preserve terminal states, require explicit operator review, and prohibit resume from `reconcile_required` until approved reconciliation evidence exists. It must not become a workflow runner or background retry mechanism in this scope.

## Minimum future implementation and test scope

After owner approval, the minimum scoped work is an approved storage adapter and one runtime integration boundary for sanitized records only, with policy-driven deletion and access checks. It must add no unrelated permissions, provider actions, or customer data persistence.

Required lifecycle evidence includes controlled Chrome tests for worker restart and tab closure, checkpoint read/write integrity, atomic competing updates, stale state/revision rejection, terminal-state preservation, missing/corrupt/version-mismatched checkpoint handling, deletion triggers, and an interrupted possible-write path that requires reconciliation without replay. Tests must distinguish synthetic adapter results from observed browser storage and must not claim durable-state acceptance until both pass under the approved policy.

## Recommended policy options for owner selection

- Minimize fields further than the current schema if `runId` or `step` is unnecessary for the approved recovery goal.
- Prefer device-local, non-synchronised storage unless cross-device recovery has a separately approved need and threat model.
- Use short, explicit retention with operator-visible deletion where feasible.
- Keep screenshots and diagnostic exports disabled until a separate redaction and access policy is accepted.
- Require an explicit operator decision for every stale, uncertain, or corrupted checkpoint rather than automatic cleanup or resumption.

These are recommendations, not policy decisions. No values are selected by this draft.

## Evidence and current limits

The existing Phase 04 work validates a synthetic schema, injected fake repository, recovery decisions, and transition proposals. It demonstrates no durable browser storage, actual worker restart recovery, tab-close recovery, real concurrency, provider behavior, encryption, deletion, or incident process. The applicable security requirements remain proposed and **NOT RUN**. D-07 stays **OPEN / OWNER DECISION REQUIRED** until the owner approves a concrete policy and the future implementation and lifecycle tests provide the required evidence.
