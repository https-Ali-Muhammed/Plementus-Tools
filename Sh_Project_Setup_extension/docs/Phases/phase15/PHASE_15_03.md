# Phase 15.03 — Utilities and module fixture checkpoints

2026-11-15 (Africa/Cairo). Implementation contract recorded before implementation.
Scope: FIXTURE_ONLY / NO EXECUTION AUTHORITY. Phase 15.02 ACCEPTED/PUBLISHED
at `757f1d0065b1c8772c204d85aeb699cc1fb4b503` per supplied acceptance.
Official progress: 51/72; 5/20. Phase 15 IN_PROGRESS / NOT ACCEPTED.

## Canonical v1 contract

Sole export `assessFixtureUtilitiesModules(requestText, utilitiesText, modulesText)`.
Three primitive JSON strings, each 1–1024 printable ASCII characters. Validate all
primitive types before lengths, then parse all schemas, then versions. No coercion.
Exact ordered closed fields below; JSON.stringify round-trip equality required.
Arrays, nested values, extra/missing/reordered keys, duplicate keys, alternate
escaping/numeric encodings, whitespace and arbitrary values reject. Native
intrinsics are assumed pristine. Version integer 1–999; only 1 supported.
Generations: null or integer 1–1000000. Sequence: integer 0–1000000; observations
must independently equal request + 1 (a round, not a chronological event chain).
Numeric lists below denote inclusive bounds, not enum members.

### Request: exact field order

| Field | Domain |
|---|---|
| version | `[1, 999]` |
| projectToken | `[null, "fixture-project-001", "fixture-project-002"]` |
| environmentToken | `[null, "fixture-production-001", "fixture-staging-001"]` |
| documentGeneration | `[null, 1, 1000000]` |
| contextGeneration | `[null, 1, 1000000]` |
| sequence | `[0, 1000000]` |
| lifecycle | `["active", "cancelled", "interrupted", "worker_lost", "session_lost"]` |
| utilityToken | `[null, "fixture-utility-001", "fixture-utility-002"]` |
| moduleToken | `[null, "pl_auth", "cedar_labels", "fixture-missing-module"]` |
| review | `["pending", "reviewed", "declined"]` |

### Utilities: exact field order

| Field | Domain |
|---|---|
| version | `[1, 999]` |
| projectToken | `[null, "fixture-project-001", "fixture-project-002"]` |
| environmentToken | `[null, "fixture-production-001", "fixture-staging-001"]` |
| documentGeneration | `[null, 1, 1000000]` |
| contextGeneration | `[null, 1, 1000000]` |
| sequence | `[0, 1000000]` |
| lifecycle | `["active", "cancelled", "interrupted", "worker_lost", "session_lost"]` |
| authentication | `["none", "login", "mfa", "captcha", "session_expired"]` |
| utilityToken | `[null, "fixture-utility-001", "fixture-utility-002"]` |
| handoff | `["none", "review_required", "configured", "access_reported", "unknown", "failed", "denied", "conflicting"]` |
| writeOutcome | `["none", "uncertain"]` |

### Modules: exact field order

| Field | Domain |
|---|---|
| version | `[1, 999]` |
| projectToken | `[null, "fixture-project-001", "fixture-project-002"]` |
| environmentToken | `[null, "fixture-production-001", "fixture-staging-001"]` |
| documentGeneration | `[null, 1, 1000000]` |
| contextGeneration | `[null, 1, 1000000]` |
| sequence | `[0, 1000000]` |
| lifecycle | `["active", "cancelled", "interrupted", "worker_lost", "session_lost"]` |
| authentication | `["none", "login", "mfa", "captcha", "session_expired"]` |
| databaseToken | `[null, "fixture-customer-db-001", "fixture-customer-db-002"]` |
| moduleToken | `[null, "pl_auth", "cedar_labels", "fixture-missing-module"]` |
| availability | `["available", "missing", "unknown", "stale", "conflicting"]` |
| installation | `["not_installed", "static_installed", "reported_installed", "unknown", "stale", "conflicting"]` |
| approval | `["awaiting_approval", "missing", "reviewed", "declined", "conflicting"]` |
| writeOutcome | `["none", "uncertain"]` |

Only project001/production001/database001 are accepted targets. Alternate
fictional tokens support negative cases. Utility002 is never the selected fixture.
The missing-module token models a request absent from the two-item module catalog.
No fixture establishes a module-to-Utilities dependency: neither module requires
Utilities in this contract. Missing Utilities evidence must remain independent of
module evidence; an installed listing cannot establish access and vice versa.

Production contains utility-access-checkpoint and module-installation-checkpoint,
both disabled and without authority. Apps has pl_auth available/not-installed,
cedar_labels available/installed, awaiting-approval and disabled install-control.
`static_installed` is consistent only for cedar_labels; `not_installed` only for
pl_auth. All handoff reports, approvals, changed installation, generations,
sequences and lifecycle outcomes are caller-supplied synthetic test evidence,
not observations of changed HTML or authenticated approval history.

## Exact output and precedence

Fresh flat frozen record, ordered fields: version=1, evidenceTier=SIMULATED,
provenance=SYNTHETIC_UNTRUSTED, fixtureOnly=true, reason, nextStep,
syntheticUtilities, syntheticModule, utilitiesReason, moduleReason, then the
17 false flags listed below. Output <=2048 printable ASCII characters. Only fixed
codes leave the boundary, never tokens, input fragments or exception text.

`browserObserved`, `permissionVerified`, `accountVerified`, `rightsVerified`, `subscriptionVerified`, `approvalGranted`, `executionAuthorized`, `mutationAuthorized`, `installationAuthorized`, `trustedContinuingContext`, `associationVerified`, `productionDatabaseVerified`, `stagingCopyVerified`, `moduleInstalled`, `effectsApplied`, `readAuthorized`, `writeAuthorized`.

Global first applicable check (all synthetic state/reason fields UNRESOLVED):

| Order | Condition | reason | nextStep |
|---|---|---|---|
| 1 | any nonstring | invalid_input | CORRECT_FIXTURE |
| 2 | any length >1024 | input_too_large | CORRECT_FIXTURE |
| 3 | any malformed/schema/noncanonical input | invalid_input | CORRECT_FIXTURE |
| 4 | any version !=1 | unsupported_version | REVIEW_VERSION |
| 5 | either writeOutcome uncertain | possible_write_unresolved | MANUAL_RECONCILIATION |
| 6 | any lifecycle cancelled | operator_cancelled | STOP |
| 7 | any worker_lost/session_lost | context_lost | FRESH_FIXTURE_CONTEXT |
| 8 | any interrupted | interrupted | FRESH_FIXTURE_CONTEXT |
| 9 | either authentication !=none | authentication_required | MANUAL_AUTH |
| 10 | any null document generation, then mismatch | document_generation_missing / document_generation_mismatch | FRESH_FIXTURE_CONTEXT |
| 11 | any null context generation, then mismatch | context_generation_missing / context_generation_mismatch | FRESH_FIXTURE_CONTEXT |
| 12 | either sequence equals request, then below, then above request+1 | duplicate_observation / delayed_observation / observation_gap | FRESH_FIXTURE_CONTEXT |
| 13 | any project/environment null | target_missing | MANUAL_FIXTURE_TARGET |
| 14 | any project/environment not project001/production001 | target_mismatch | MANUAL_FIXTURE_TARGET |

After global checks, calculate BOTH independent checkpoint reasons in order below.
Utilities: target mismatch (selection differs or utility002); handoff unknown,
conflicting, failed; declined request or denied handoff; no selection with a
non-none handoff conflicts; no selection; selected none/review_required; configured;
access_reported. Codes respectively: utilities_target_mismatch, utilities_unknown,
utilities_conflicting, utilities_failed, utilities_denied, utilities_conflicting,
no_optional_utilities, utilities_review_required, configuration_unverified,
access_unverified. No request review can verify access.

Modules: database !=database001; selection null/missing token; selection mismatch;
availability conflicting/stale/unknown/missing in that order; installation
conflicting/stale/unknown in that order; pl_auth with any installed report or
cedar_labels with not_installed conflicts with baseline; reported_installed lacks
authenticated approval even when reviewed; approval conflicting, declined,
missing, awaiting_approval; finally static_installed or installation_pending.
Codes: module_target_mismatch, module_missing, module_selection_mismatch,
availability_CONDITION, installation_CONDITION, installation_baseline_conflict,
installation_report_untrusted, approval_CONDITION, static_fixture_installed,
installation_pending (CONDITION substituted verbatim lowercase).

syntheticUtilities and utilitiesReason equal the Utilities code; syntheticModule
and moduleReason equal the module code. Thus every synthetic field is labeled and
never says real INSTALLED or AUTHORIZED. Overall reason is the Utilities reason
unless no_optional_utilities, in which case it is the module reason. Overall
nextStep: MANUAL_RECONCILIATION if either reason contains unknown, conflicting,
conflict, failed or untrusted; otherwise STOP for utilities_denied or
approval_declined; otherwise MANUAL_CHECKPOINT_REVIEW. Both reasons remain visible
regardless of overall precedence. No safe-retry code exists.

## Limitations and later 15.04 handoff

This stateless evaluator cannot authenticate reviews, inspect an Odoo database,
detect unreported writes, latch cancellation or prevent replay. Removing an
uncertainty field in a later call cannot prove reconciliation. Within a call,
uncertainty outranks cancellation, new review and every reported module state.
Structural rejection never means an earlier write obligation is cleared.

15.04 must supply canonical test-only inputs for customer/partner subscription,
project/repository identity, main/Production build and database, separate Utilities
and module observations, and a separately designed Staging source/target/copy and
neutralization report. A test harness may import accepted evaluators independently,
map only explicit fixture tokens and propagate unresolved reasons; it must retain
all evidence tiers and false flags. Do not feed synthetic readiness into trusted
approval or infer copy from a branch. Exercise cancellation, unknown writes, stale
generations, wrong targets, denied review, missing modules, divergence, duplicate
rounds and neutralization uncertainty throughout the connected demonstration.
No production imports, Staging evaluator or connected demonstration in 15.03.

## Work plan and scope

Write native tests and inert evaluator shell; capture assertion RED; implement
only this contract; run focused, combined, full and separate isolation checks;
append tracking and audit preservation. No callers/config/exports elsewhere change.
Nine files: new evaluator, matching native test, this report; append only Phase 15
parent and docs 00_PROJECT_STATUS, 03_CHANGELOG, 04_TEST_EVIDENCE,
05_BLOCKERS_AND_DECISIONS, 06_HANDOFF. Existing source/tests/HTML remain unchanged.

## Verification evidence and history

PHASE 15.03: **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Initial inert shell: 55 tests, 2 pass, 53 behavioral assertion failures; no missing
module or syntax RED. The two passing checks cover HTML and shell isolation.
First implementation: 54 pass / 1 fail (new source scan matched a reason-code
literal). Corrected the helper, without changing accepted tests. Next focused,
combined and full runs: 54/55, 682/683 and 2454/2455; the new replay harness retained
a mutable array later modified by its size/type test. Snapshotting that array
fixed the harness. Separate isolation had passed because filtered execution had
no earlier recorded scenarios. The final full focused run exercises those cases.
Final test file against inert shell again: 2 pass / 53 assertion failures, exit 1.
Final restored evaluator: results below, all exit 0, no skips/cancellations/todos.
The original RED exit was not separately captured; final RED exit was captured.

| Run | Tests | Pass | Fail | Exit |
|---|---|---|---|---|
| Focused | 55 | 55 | 0 | 0 |
| Requested combined | 683 | 683 | 0 | 0 |
| Full | 2455 | 2455 | 0 | 0 |
| Separate A34/G25/D32/I36/S31/R34/new isolation | 7 | 7 | 0 | 0 |
| Source and test syntax | n/a | n/a | n/a | 0 each |

All 2400 unchanged accepted tests pass in the full run. Every exercised evaluator
result is frozen, sanitized, deterministic and has all 17 authority flags false.
The VM sentinel replays exercised inputs without capability access. Source scans
verify no imports or production consumers. No browser/provider tests were run.

Exact final commands (from extension directory):

```bash
node --test test/odoo-sh-utilities-modules-fixture-flow.test.mjs
node --test test/odoo-sh-fixtures.test.mjs test/odoo-sh-project-setup-fixture-flow.test.mjs test/odoo-sh-repository-production-fixture-flow.test.mjs test/odoo-sh-utilities-modules-fixture-flow.test.mjs test/interaction-context-guards.test.mjs test/interaction-dom-primitives.test.mjs test/interaction-interruption-policy.test.mjs test/interaction-approval-timeout-uncertainty.test.mjs test/utilities-plan.test.mjs test/deploy-key-handoff.test.mjs
node --test test/adapter-contract.test.mjs test/approval-checkpoint.test.mjs test/branch-creation-plan.test.mjs test/branch-inspection.test.mjs test/checkpoint-policy.test.mjs test/checkpoint-service.test.mjs test/customer-plementus-fixtures.test.mjs test/deploy-key-handoff.test.mjs test/deploy-key-operator-checkpoint.test.mjs test/failure-state-fixtures.test.mjs test/github-api-error-fixtures.test.mjs test/github-permission-reader.test.mjs test/github-repository-create-preview.test.mjs test/github-repository-discovery.test.mjs test/github-sandbox-write-approval-fixtures.test.mjs test/interaction-approval-timeout-uncertainty.test.mjs test/interaction-context-guards.test.mjs test/interaction-dom-primitives.test.mjs test/interaction-interruption-policy.test.mjs test/odoo-sh-fixtures.test.mjs test/odoo-sh-page-recognition.test.mjs test/odoo-sh-project-setup-fixture-flow.test.mjs test/odoo-sh-repository-production-fixture-flow.test.mjs test/odoo-sh-unknown-page-fallback.test.mjs test/odoo-sh-utilities-modules-fixture-flow.test.mjs test/pause-control.test.mjs test/phase-06-idempotency-reconciliation.test.mjs test/popup-validation.test.mjs test/read-only-admission.test.mjs test/recovery.test.mjs test/run-record.test.mjs test/sec01-cleanup-commit-window.test.mjs test/sec01-clock-source.test.mjs test/sec01-recovery-decision.test.mjs test/selection-invalidation.test.mjs test/step-coordinator.test.mjs test/submodule-structure.test.mjs test/tab-recognition.test.mjs test/transition-decision.test.mjs test/utilities-conflict-fallback.test.mjs test/utilities-plan.test.mjs test/workflow-state.test.mjs
node --test --test-name-pattern='A34|G25|D32|I36|S31|R34|M isolation' test/odoo-sh-page-recognition.test.mjs test/interaction-context-guards.test.mjs test/interaction-dom-primitives.test.mjs test/interaction-interruption-policy.test.mjs test/odoo-sh-project-setup-fixture-flow.test.mjs test/odoo-sh-repository-production-fixture-flow.test.mjs test/odoo-sh-utilities-modules-fixture-flow.test.mjs
node --check src/odoo-sh/utilities-modules-fixture-flow.mjs
node --check test/odoo-sh-utilities-modules-fixture-flow.test.mjs
```

Temporary evidence: `/tmp/1503-final-runs.json`, `/tmp/1503-final-red.log`,
`/tmp/1503-final-{green,combined,full,isolation,source-syntax,test-syntax}.log`,
`/tmp/1503-red.log`, `/tmp/1503-implementation.mjs`, `/tmp/phase1503-entry.json`.
Temporary artifacts are not permanent evidence retention guarantees.

## Git entry and preservation boundaries

Entry root/branch/origin fetch+push match the requested checkout. HEAD and local
upstream both `757f1d0065b1c8772c204d85aeb699cc1fb4b503`. No fetch or independent
live-remote query was performed. Staging empty; extension initially clean.
`GIT_OPTIONAL_LOCKS=0 git for-each-ref --format='%(refname) %(objectname)'`
captured all 45 current ref names/object IDs before edits. Complete inventory is
in the entry JSON. Historical 43→44 remains UNVERIFIED: the 43-ref snapshot is
missing. Known cross-task 44→45 delta and its cause remain unverified; no creator
is attributed from namespace. This task does not repair or reconcile history.

Three registrations retain branches and HEADs:

| Worktree | Branch | HEAD |
|---|---|---|
| Tools | feature/sh-project-setup-extension | 390c9ea7c311f362ea04aad64ed14569161642ec |
| Tools-Smart-Editor-Guard | feature/odoo_website_smart_editor_guard | 9a818495593c87ef6d4a1376e7f81be26513e0b5 |
| Tools-sh-project-setup-extension-clean | feature/sh-project-setup-extension-clean | 757f1d0065b1c8772c204d85aeb699cc1fb4b503 |

Raw index byte sizes and SHA-256 at entry:

- `/home/https_ali_muhammed/Plementus/Tools/.git/index`: 26413 bytes, `97d6cfaa9e3a713c1e1d5e5579b62f43a7c03d8699f0738db7fbba0f5a2bf1cd`.
- `/home/https_ali_muhammed/Plementus/Tools/.git/worktrees/Tools-Smart-Editor-Guard/index`: 10870 bytes, `877fd06f1d7824c31cdb60b01fe31c5b842b8599bf95eec47b70881fb9119c37`.
- `/home/https_ali_muhammed/Plementus/Tools/.git/worktrees/Tools-sh-project-setup-extension-clean/index`: 42569 bytes, `70c8607923da217c4f87601c717201be898f6a2267b17a94c633bebaa6e6c05b`.

Preservation checks compare full refs, registration identities and raw index bytes
by SHA-256 and size, not just counts. No inode/mtime or uncaptured Git-object
continuity claim. `.idea/plemo-chats.xml` observed by path/status only; its content
was not read or hashed. Sibling source was not inspected. No Git mutation occurred.

## Exact inventory and handoff

- [src/odoo-sh/utilities-modules-fixture-flow.mjs](../../../src/odoo-sh/utilities-modules-fixture-flow.mjs)
- [test/odoo-sh-utilities-modules-fixture-flow.test.mjs](../../../test/odoo-sh-utilities-modules-fixture-flow.test.mjs)
- [docs/Phases/phase15/PHASE_15_03.md](PHASE_15_03.md)
- [docs/Phases/phase15/PHASE_15.md](PHASE_15.md)
- [docs/00_PROJECT_STATUS.md](../../00_PROJECT_STATUS.md)
- [docs/03_CHANGELOG.md](../../03_CHANGELOG.md)
- [docs/04_TEST_EVIDENCE.md](../../04_TEST_EVIDENCE.md)
- [docs/05_BLOCKERS_AND_DECISIONS.md](../../05_BLOCKERS_AND_DECISIONS.md)
- [docs/06_HANDOFF.md](../../06_HANDOFF.md)

Tools: functions exec/exec_command, local shell, Python, Node and read-only Git.
Skills: Ponytail and previously read Superpowers planning, test-first and
verification guidance. No external service, browser or subagent used.

Official progress stays 51/72; 5/20. Phase 15 IN_PROGRESS / NOT ACCEPTED.
Phase 13/14 fixture-only exits PASS; live capability PENDING. Phase 09.03/10.03
BLOCKED / NOT AUTHORIZED. Historical discrepancies UNVERIFIED. Production NO_GO.
Independent ChatGPT acceptance and publication outstanding. STOP for review;
no stage, commit, push or Phase 15.04.

## Final preservation audit

`GIT_OPTIONAL_LOCKS=0 python3 /tmp/audit1503.py`: PASS, exit 0.
Exactly nine authorized changes; six historical documentation prefixes remain
byte-identical to entry and HEAD. All 222 other existing extension files retain
entry SHA-256, including accepted source, tests, fixtures and reports. All 45
ref names/object IDs, three raw indexes and three worktree registrations match
entry; no observed in-task ref differences. Root/branch/origins/HEAD/upstream
remain correct; staging empty. Authored local Markdown links, UTF-8/LF, paired
fences, trailing whitespace, final newlines and scoped git diff --check pass.
The unrelated protected IDE path retains its status; contents were not inspected.


## Verification command correction — 2026-11-15

Quoted the complete isolation pattern while retaining all seven test-file
arguments. Executed the corrected documented command through Bash: exit 0,
7 tests / 7 pass / 0 fail / 0 skipped / 0 cancelled / 0 todo.
Log: `/tmp/1503-docfix-isolation.log`. No implementation/test changes.

Original entry-ref comparison differs at correction entry: 45 refs remain, but
two `refs/codex` names were added and two removed; retained object IDs unchanged.
Added capture `1794737184483/b1be929a-f56a-4f9e-a3e8-2d34b921517c/base` and
checkpoint `8679c40fd4426df8cb12aa4e40f10bb2/2daefdcec94c6738fc4b0432b6d77520/1794736476537/0449480c-664d-4481-a2e6-5af525100e9f`,
both at `71f8ea59316f7177e4154814bb0c16bce5f6de0f`.
Removed capture `1794736120676/eccd342b-706b-417c-bb44-6d90cc51d49b/base` and
checkpoint `8679c40fd4426df8cb12aa4e40f10bb2/b5ac3b2cc260e7c89b170611c6899e52/1794735605015/332c1c47-72f4-434d-b921-b97714497889`,
both formerly at `e04f1e02db3c021de9b697cbb27bb0f61ed4235d`.
Names above are relative to `refs/codex/turn-diffs/captures/` and
`refs/codex/turn-diffs/checkpoints/`, respectively. Cause/creator unverified;
this is observed cross-task drift, not evidence of movement during this correction.

Reverification: original nine-file inventory, six historical byte prefixes,
222 other existing extension files, original HEAD/upstream/branch/origins,
three indexes and worktree registrations preserved. Only this report changed
since correction entry; source/tests and other tracking documents unchanged.
Correction-entry refs remain exact. Original ref preservation is not claimed
for this later correction; the historical audit above remains unchanged.
