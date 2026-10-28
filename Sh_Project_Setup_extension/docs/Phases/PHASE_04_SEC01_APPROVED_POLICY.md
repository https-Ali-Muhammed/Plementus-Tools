# SEC-01: Approved durable-checkpoint security, privacy, retention, and recovery policy

**Status: SEC-01 OWNER_APPROVED / IMPLEMENTATION_NOT_STARTED.** Owner approval recorded 2026-10-29. This policy authorizes no code, storage activation, permission, persistent write, browser test, provider action, or parent Phase 04 acceptance. Phase 04 remains **IN_PROGRESS / BLOCKED** until implementation and lifecycle evidence meet this policy.

## Policy scope and decision-ID clarification

SEC-01 is the durable-checkpoint security, privacy, retention, and recovery policy. It supersedes the decision preparation in [D-07 decision draft](PHASE_04_D07_DECISION_DRAFT.md) for this checkpoint-policy subject while preserving that draft as historical preparation.

The authoritative master plan's historical `D-07` identifier refers to the separate private Utilities SSH/submodule decision. It is not this policy. The master plan and its source copy remain unchanged.

## Approved checkpoint policy

Only these existing sanitized fields may persist: `schemaVersion`, `runId`, `state`, `step`, `evidenceTier`, and `revision`. A narrowly defined immutable `createdAt` timestamp may also persist solely to determine expiry. No other field is authorized.

Checkpoints expire no later than seven days after `createdAt`. Updates must never change `createdAt` or extend expiry. Delete a completed or cancelled checkpoint after operator acknowledgment, or at expiry, whichever comes first. Explicit operator deletion is supported. This policy does not claim that deletion has been implemented or verified.

Storage is device- and browser-profile-local only. Synchronization, export, telemetry, external transmission, and direct content-script access are prohibited. One authoritative extension storage service may access checkpoints; any future callers must use that service rather than a direct repository update.

Activation requires device disk encryption, a screen lock, and a protected browser profile. IndexedDB must not be represented as providing encryption by itself. The future implementation must verify and document what controls it can actually observe; it must not claim the activation prerequisites have been verified merely because storage is available.

Credentials, account data, customer identifiers, subscription references, URLs, repository identifiers, screenshots, raw errors, and telemetry must never persist. A suspected exposure stops affected operations and triggers owner-led incident handling. Missing, corrupt, expired, stale, and uncertain checkpoints fail closed. An uncertain external operation is never automatically replayed; operator reconciliation is mandatory before a safe continuation.

Extension-origin IndexedDB transactional storage is the preferred implementation candidate, subject to actual feasibility and concurrency testing. This preference is not an implementation, security, or browser-storage acceptance claim.

## Proposed implementation contract

Any later approved schema successor must retain the six authorized fields and add exactly `createdAt`, an immutable creation-time value. The schema version must distinguish that successor from the current schema. The storage service must reject records with an absent, invalid, changed, or expired `createdAt`; it must reject unknown fields and all prohibited data.

Expiry is `createdAt + seven days`; it is evaluated on every read and before any proposed transition or update. An expired record must not resume, transition, or replay work. Deletion must compare the expected revision where a record still exists, and must fail closed on conflicts. The retention rule does not permit an update to renew a checkpoint.

Before runtime integration, make direct repository update access private to the authoritative service or enforce equivalent guards there. That service must validate schema, expiry, expected state, expected revision, and the `decideTransition` result, then use an atomic compare-and-replace. It must preserve terminal states, require operator review, and require reconciliation evidence before leaving `reconcile_required`. No workflow runner or background retry follows from this contract.

## Activation decisions still required

The owner must name the incident contacts, notification route, escalation timing, and evidence custodian before activation. The owner or security reviewer must also specify how disk encryption, screen lock, and protected browser-profile requirements are verified and how a failed or unverifiable check is handled. This policy does not invent those details.

## Implementation and evidence gates

Policy approval is distinct from implementation and security acceptance. Prior to any durable-state acceptance, a separately authorized implementation must demonstrate policy-driven storage and deletion, local-only scope, schema/version validation, immutable expiry, atomic conflict handling, and direct-update guards.

Observed lifecycle tests must cover Chrome worker restart and tab closure, absent/corrupt/expired/stale checkpoints, terminal records, operator deletion, acknowledgment deletion, seven-day expiry without renewal, competing updates, and possible external writes that require reconciliation without replay. Security acceptance additionally requires evidence for the activation-device controls and owner-led incident route. Until then, real storage and Phase 04 remain blocked.
