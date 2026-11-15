# Phase 15.04 — Staging neutralized-copy and connected fixture exit

2026-11-15 (Africa/Cairo). FIXTURE_ONLY / NO EXECUTION AUTHORITY.
Contract and plan recorded before implementation. Phase 15.03 ACCEPTED/PUBLISHED
at `374f90b952421159d581f332dd1f6e485d34b6fd`, per supplied owner acceptance;
local HEAD/upstream match. Earlier reports remain historical, unchanged.
Official progress **52/72; 5/20**. Phase 15 **IN_PROGRESS / NOT ACCEPTED**.

## Scope and implementation plan

The supplied task authorizes implementation with ten paths, native Node tests and
no Git mutations. It overrides skill defaults for extra plan files, approval
rounds, worktrees and commits. Design and execution ledger live in this report.
Use the existing standalone canonical-parser/result pattern; do not import shared
production helpers or connect production callers. No callers, fixtures, config,
exports elsewhere or dependencies change. Test composition belongs only in the
new connected suite. No real data or capabilities are needed.

- [x] Document contract; write Staging tests, then an inert export shell; capture assertion RED.
- [x] Implement the standalone evaluator and capture GREEN.
- [x] Write connected scenarios against an inert test-only harness; capture assertion RED.
- [x] Implement test-only composition and offline-exit assessment; capture GREEN.
- [x] Run requested focused/full/isolation/syntax verification and review.
- [x] Append six histories, audit exact paths/bytes/Git, and stop for ChatGPT review.

Review focus: cancellation masking upstream uncertainty; independently consistent
but divergent stages; report aggregation losing a secondary module denial;
reported neutralization without valid copy context; replay mistaken for durable
reconciliation. Each has an explicit new test.

## Canonical Staging v1 wire contract

Sole export `assessFixtureStagingCopy(requestText, stagingText, copyText, neutralizationText)`.
Four primitive strings, each 1–1024 printable ASCII characters (U+0020–U+007E).
Check every argument's primitive type before lengths; then parse all four before
version checks. No coercion, getters or proxy inspection. Exact closed ordered
flat records; JSON.stringify round-trip equality required. Reject extra/missing/
reordered/duplicate fields, nested values, arrays, alternate escapes/numbers,
whitespace, arbitrary URLs, secrets, dumps and customer content. Native intrinsics
are assumed pristine. Version integer 1–999; only 1 supported.

Every record begins with these fields in exactly this order:

| Field | Closed domain |
|---|---|
| version | integer 1–999 |
| projectToken | null, fixture-project-001, fixture-project-002 |
| sourceEnvironmentToken | null, fixture-production-001, fixture-staging-001 |
| destinationEnvironmentToken | null, fixture-production-001, fixture-staging-001 |
| sourceBranch | null, main, develop |
| stagingBranch | null, main, develop |
| documentGeneration | null or integer 1–1000000 |
| contextGeneration | null or integer 1–1000000 |
| sequence | request: integer 0–999999; observations: integer 1–1000000 |
| lifecycle | active, cancelled, interrupted, worker_lost, session_lost |

Suffixes, in exact order:

| Record | Ordered suffix fields and domains |
|---|---|
| request | intent: neutralized_copy; review: missing, pending, reviewed, declined |
| staging | authentication: none/login/mfa/captcha/session_expired; environmentState: awaiting_copy/present/missing/stale/conflicting/unknown; branchState: created/missing/pending/conflicting; buildReadiness then databaseReadiness: ready/pending/failed/unknown/missing/stale/conflicting |
| copy | authentication: same domain; copyState: not_started/review_required/pending/reported_complete/failed/unknown; writeOutcome: none/uncertain; approvalEvidence: missing/caller_reported |
| neutralization | authentication: same domain; neutralizationState: not_assessed/pending/reported_neutralized/incomplete/conflicting/unknown/manual_verification |

Only project001, production001 source, staging001 destination, main source and
develop destination are consistent; null and alternate fictional tokens serve
negative cases. All four generations must match and be non-null. Each observation
sequence must equal request + 1: these are views of a synthetic round, not actual
chronological events. Every generation, sequence, lifecycle, review and approval
claim is caller-supplied synthetic test evidence. `caller_reported` approval is
NEVER authenticated evidence; there is no authenticated-approval input value.

The accepted [Staging HTML](../../../fixtures/odoo-sh/staging.html) contains
project001/staging001, created develop, awaiting-copy, pending build/database,
not-copied, and a disabled copy control. Translate awaiting-copy to awaiting_copy
and not-copied to not_started only in test data. The HTML contains no executed
copy or verified neutralization. All positive states beyond those markers are
**caller-supplied synthetic test evidence**, never observed provider effects.
No real neutralization procedure, endpoint or SQL is specified.

## Exact sanitized output and first-applicable precedence

Fresh flat frozen record, exact ordered keys: version=1, evidenceTier=SIMULATED,
provenance=SYNTHETIC_UNTRUSTED, fixtureOnly=true, reason, nextStep,
syntheticBranch, syntheticBuild, syntheticDatabase, syntheticCopy,
syntheticNeutralization, then these 17 permanently false flags in this order:

`browserObserved`, `permissionVerified`, `accountVerified`, `rightsVerified`,
`subscriptionVerified`, `approvalGranted`, `executionAuthorized`,
`mutationAuthorized`, `installationAuthorized`, `trustedContinuingContext`,
`associationVerified`, `productionDatabaseVerified`, `stagingCopyVerified`,
`moduleInstalled`, `effectsApplied`, `readAuthorized`, `writeAuthorized`.

Output <=2048 printable ASCII characters, fixed enum codes only, no identifiers,
input fragments, raw exceptions or alternative capability-bearing fields. Five
synthetic states default to UNRESOLVED; after target checks they independently
reflect uppercase branch/build/database/copy/neutralization enums. Uppercase
REPORTED_COMPLETE and REPORTED_NEUTRALIZED remain explicitly synthetic/untrusted.
No copyVerified or neutralizationVerified field exists.

| Order | Condition | reason | nextStep |
|---|---|---|---|
| 1 | any nonstring | invalid_input | CORRECT_FIXTURE |
| 2 | any input >1024 | input_too_large | CORRECT_FIXTURE |
| 3 | any invalid schema/canonical form | invalid_input | CORRECT_FIXTURE |
| 4 | any version !=1 | unsupported_version | REVIEW_VERSION |
| 5 | copy writeOutcome uncertain | possible_write_unresolved | MANUAL_RECONCILIATION |
| 6 | copyState unknown | copy_unknown | MANUAL_RECONCILIATION |
| 7 | any cancelled | operator_cancelled | STOP |
| 8 | any worker_lost/session_lost | context_lost | FRESH_FIXTURE_CONTEXT |
| 9 | any interrupted | lifecycle_interrupted | FRESH_FIXTURE_CONTEXT |
| 10 | any observation authentication !=none | authentication_required | MANUAL_AUTH |
| 11–14 | document missing, mismatch; context missing, mismatch | document_generation_missing/document_generation_mismatch/context_generation_missing/context_generation_mismatch | FRESH_FIXTURE_CONTEXT |
| 15–17 | any duplicate, delayed, then gapped sequence | duplicate_observation/delayed_observation/observation_gap | FRESH_FIXTURE_CONTEXT |
| 18 | any null project/source/destination | target_missing | MANUAL_FIXTURE_TARGET |
| 19 | any project !=project001 | project_mismatch | MANUAL_FIXTURE_TARGET |
| 20 | any source !=production001 | source_mismatch | MANUAL_FIXTURE_TARGET |
| 21 | any destination !=staging001 | destination_mismatch | MANUAL_FIXTURE_TARGET |
| 22 | any null branch | branch_missing | MANUAL_FIXTURE_TARGET |
| 23 | any sourceBranch !=main or stagingBranch !=develop | branch_mismatch | MANUAL_FIXTURE_TARGET |
| 24 | reported_neutralized without reported_complete copy | neutralization_without_copy | MANUAL_RECONCILIATION |
| 25 | attempted copy (pending/reported_complete/failed) with review !=reviewed | copy_review_conflict | MANUAL_RECONCILIATION |
| 26 | attempted copy with approvalEvidence missing | copy_approval_missing | MANUAL_RECONCILIATION |
| 27 | review declined | review_declined | STOP |
| 28–29 | review missing, pending | copy_review_missing/copy_review_required | MANUAL_COPY_REVIEW |
| 30 | environmentState missing/stale/conflicting/unknown | staging_environment_STATE | missing/unknown: MANUAL_STAGING_EVIDENCE; stale: FRESH_FIXTURE_CONTEXT; conflicting: MANUAL_RECONCILIATION |
| 31 | branchState !=created | staging_branch_STATE | conflicting: MANUAL_RECONCILIATION; otherwise MANUAL_STAGING_EVIDENCE |
| 32–37 | either readiness conflicting, missing, stale, failed, unknown, pending, in that order | staging_evidence_conflicting/staging_evidence_missing/staging_evidence_stale/staging_failed/staging_unknown; pending: staging_build_pending if build pending else staging_database_pending | conflicting: MANUAL_RECONCILIATION; stale: FRESH_FIXTURE_CONTEXT; failed: MANUAL_FAILURE_REVIEW; others: MANUAL_STAGING_EVIDENCE |
| 38–41 | copy not_started/review_required/pending/failed | copy_not_started/copy_review_required/copy_pending/copy_failed | MANUAL_COPY_REVIEW/MANUAL_COPY_REVIEW/MANUAL_COPY_OBSERVATION/MANUAL_RECONCILIATION |
| 42–47 | reported copy; neutralization not_assessed/pending/incomplete/conflicting/unknown/manual_verification | neutralization_not_assessed/neutralization_pending/neutralization_incomplete/neutralization_conflicting/neutralization_unknown/neutralization_manual_verification | incomplete/conflicting/unknown: MANUAL_RECONCILIATION; others: MANUAL_NEUTRALIZATION_REVIEW |
| 48 | reported copy and reported neutralization | synthetic_reported_copy_neutralization | MANUAL_INDEPENDENT_VERIFICATION |

STATE is the literal lowercase enum. Rows 24–48 carry the five independent
synthetic labels; earlier rows leave them UNRESOLVED. A ready branch/build never
establishes copy, and a reported copy never establishes neutralization. A claimed
neutralization never authenticates approval or source/destination verification.
Uncertainty wins over cancellation, even with new review/ready build/neutralization.
Malformed/version rejection does not clear a prior uncertainty obligation.

This stateless function cannot retain unknown writes, cancellations or replay
history across calls. Omitting earlier uncertainty on a later call is not
reconciliation. Repeated inputs return equal but distinct frozen diagnostics.

## Connected test-only topology and report contract

One deterministic test-only harness builds canonical inputs from a fictional
project001/production001/main → staging001/develop topology. Context generation 5
and document generation 4 are explicit synthetic round tokens shared by all stages;
request/observation sequences advance as 7/8, 8/9, 9/10, 10/11. No cross-page
browser atomicity is claimed. The setup stage uses either customer or partner-trial.
Repository association and Production build/database share the second evaluator;
Utilities/module checkpoints are third; source/destination review and copy/
neutralization are fourth. All four are evaluated in order for diagnostics even
when earlier stages are unresolved. Evaluating a pure function is not permission
to execute its represented operation. Results are never used as authenticated
inputs or approvals. No production coordinator is introduced.

A bounded frozen final report contains version, evidenceTier, provenance,
fixtureOnly, syntheticDisposition, chainReason, setupReason, repositoryReason,
utilitiesReason, moduleReason, stagingReason, possibleWriteObligation, blockingStage, blockingReason and the
17 false flags. Reasons are fixed evaluator codes. Disposition precedence:
UNRESOLVED_RECONCILIATION, HARD_STOP, MANUAL_CONTINUATION. Obligation is a synthetic
label (UNRESOLVED/NONE_REPORTED), never verification. Every prior stage diagnostic
remains visible; secondary module denial also stops the report.

The harness checks every supplied project's/environment's/branch's/generation's
relationship across stages, including agreeing-but-divergent stage generations.
It also checks chronological round continuity. Inconsistency is a hard stop
unless reconciliation outranks it. It independently retains supplied possible
writes from setup unknown/uncertain, association unknown/uncertain, Utilities or
module uncertain, and copy unknown/uncertain. This preserves obligations masked
by accepted earlier cancellation precedence. Any diagnostic requesting manual
reconciliation retains that disposition. Replaying a later test round carries
forward one previous frozen report's reconciliation and hard-stop disposition
and its first blocking stage/reason;
there is no test-only command to clear them. The optional previous report is
owned by the test harness, not an external authority or production input. Missing
or unknown evaluator codes fail closed to HARD_STOP. Ordinary manual reasons
include pending reviews/readiness, unverified Utilities access, installation
pending, and reported copy/neutralization requiring independent verification.
Authentication, context loss, inconsistent targets and failed states hard-stop.
blockingStage is chain/setup/repository/utilities/staging/none; blockingReason
is a fixed evaluator or chain code, or none. Reconciliation always outranks stop. This is bounded in-memory test
aggregation, not durable runtime replay protection. A fresh harness has no history.

The offline exit helper accepts exactly four test-only outcome codes, ordered:
requiredCases, connectedConsistency, isolation, regressions. Each is PASS/FAIL/
INCOMPLETE. Return FIXTURE_EXIT_PASS only for all four PASS; otherwise
FIXTURE_EXIT_BLOCKED, including malformed outcomes. It carries SIMULATED /
SYNTHETIC_UNTRUSTED / fixtureOnly and all 17 false flags. This verifies an acceptance
rule; actual suite results must separately substantiate all four inputs before
recording the parent technical exit. It does not mark Phase 15 accepted or grant
production readiness.

## Negative-case matrix and observed behavior

All rows below passed in the final Staging suite. Test names begin with T;
parameter loops exercise every relevant envelope, not just the request.

| Requirement | Tests / observed result |
|---|---|
| 1 Matching fictional target | matching target created branch; copy_not_started, all flags false |
| 2 Created develop without copy | matching target; NOT_STARTED remains independent of CREATED/READY |
| 3 Missing Staging | environment missing → staging_environment_missing |
| 4 Wrong Production source | global 15; every envelope → source_mismatch |
| 5 Wrong destination | global 16; every envelope → destination_mismatch |
| 6 Wrong source/Staging branch | global 17–18; every envelope → branch_missing/branch_mismatch |
| 7 Build pending with branch present | independent readiness pending → staging_build_pending |
| 8 Database pending with branch present | independent readiness pending → staging_database_pending |
| 9 Review pending/declined/missing | copy review variants; manual review or STOP |
| 10 Attempt without authenticated evidence | attempts without reviewed intent; missing approval → reconciliation; caller_reported never authenticates |
| 11 Copy pending/failed | copy pending/failed; manual observation/reconciliation |
| 12 Unknown/possibly written | global 0–1; uncertainty precedence → MANUAL_RECONCILIATION |
| 13 Reported copy not independently verified | seven reported-copy neutralization variants; stagingCopyVerified false |
| 14 Neutralization not assessed/pending | reported-copy variants → MANUAL_NEUTRALIZATION_REVIEW |
| 15 Reported neutralization after fictional copy | synthetic_reported_copy_neutralization → MANUAL_INDEPENDENT_VERIFICATION |
| 16 Incomplete/conflicting/unknown neutralization | reported-copy variants → MANUAL_RECONCILIATION |
| 17 Neutralization without valid copy | neutralization cannot substitute for copy; neutralization_without_copy or copy_approval_missing |
| 18 Missing/stale/mismatched generations | global 6–9; every envelope; numeric boundary tests |
| 19 Duplicate/delayed/out-of-order | global 10–12; every observation; FRESH_FIXTURE_CONTEXT |
| 20 Worker/session loss/interruption/cancel | global 2–4; every envelope; STOP/fresh context |
| 21 Login/MFA/CAPTCHA/expiry | global 5; all three observations → MANUAL_AUTH |
| 22 Unsupported version/malformed JSON | canonical strict schema and rejection precedence |
| 23 Hostile inputs/oversized | hostile arguments (zero hooks); all field types, ordered closed schemas, 1024/1025 boundaries |
| 24 Determinism/replay limits | frozen output and repeated input; no durable cancellation/uncertainty latch |
| 25 Entirely synthetic diagnostic | exact output assertion in every behavioral case; 17 false flags and no alternative fields |

Additional precedence coverage: every compatible pair of 19 global failures;
49 independent build/database combinations; uncertainty over each cancelled
envelope across all review modes and multiple copy claims; schema/version before
semantic evaluation. The new isolation test replays the exercised inputs under
capability traps, including initialization. Its filtered run also calls a real
baseline case, so it is not vacuous when other tests are filtered out.

## Connected scenario/results matrix

All rows passed in the final connected suite (46 native tests, C01–C23 plus
parameter variants and connected isolation). SC means synthetic manual
continuation, HS hard stop, UR unresolved reconciliation; none means completed
provisioning or execution authority.

| Case | Connected behavior | Observed report |
|---|---|---|
| C01 customer and partner-trial | setup review → repository report/ready pair → pl_auth approval → Staging review | SC; all four immutable results retained |
| C02 | created develop; build pending, then database pending, then ready pair without copy | SC; NOT_STARTED retained |
| C03 | caller-supplied reported copy + neutralization with pl_auth not installed | SC; MANUAL_INDEPENDENT_VERIFICATION; module approval still visible |
| C04 | cedar_labels static installed listing; optional Utilities absent | SC; static_fixture_installed / no_optional_utilities; moduleInstalled false |
| C05 | optional Utilities selected, configured or access reported | SC; manual handoff/configuration_unverified/access_unverified |
| C06 | association unresolved, or Production build ready/database pending; later claimed Staging result | SC; upstream unresolved reason remains visible |
| C07 | module approval awaiting/missing/declined alongside access_unverified | SC/SC/HS; secondary denial retained |
| C08 | wrong Staging source/destination despite claimed neutralization | HS; chain_target_mismatch and exact Staging reason |
| C09 | possible copy + cancellation + reviewed/ready/neutralized claims | UR; possibleWriteObligation UNRESOLVED |
| C10 | neutralization not assessed/pending/incomplete/conflicting/unknown | SC/SC/UR/UR/UR |
| C11 | cancellation at each of four stages | HS; first blocking stage retained |
| C12 | login/MFA/CAPTCHA/session expiry at each stage | HS; authentication_required |
| C13 | interruption at all stages; worker/session loss in every supporting contract | HS; context invalidated; setup uses its accepted interrupted state |
| C14 | stale generation, duplicate/delayed/gapped observation at every stage | HS; stage reason plus chain consistency failure |
| C15 | all envelopes of one stage agree on divergent generations or shifted rounds | HS; cross-stage checks catch what each isolated stage cannot |
| C16 | divergent projects and repository/source/destination branches | HS; target mismatch persists |
| C17 | earlier cancellation masks setup/association uncertainty; Utilities/copy uncertainty | UR; independent supplied obligation survives |
| C18 | later clean round and replay after uncertainty/cancellation | UR/HS retained; fresh harness has no durable history |
| C19 | upstream setup/association failure with downstream reported success | HS; upstream failure remains visible |
| C20 | earlier diagnostic substituted as a later request | invalid_input; no grant or authenticated input |
| C21 | HTML fixture grounding across all stages | matches accepted inert markers only |
| C22 | all exit prerequisites PASS, or any failed/incomplete/malformed prerequisite | FIXTURE_EXIT_PASS / FIXTURE_EXIT_BLOCKED |
| C23 | access_unverified plus secondary module conflict/unknown, then clean replay | UR; actual approval/availability/installation cause retained |
| connected isolation | four real evaluators run in order under capability traps | zero capability accesses; no production consumers |

The final report deliberately has no completed/success/ready provisioning state.
For example, C03 simultaneously retains creation_review_required,
synthetic_pair_ready, no_optional_utilities, approval_awaiting_approval and
synthetic_reported_copy_neutralization. Its disposition is MANUAL_CONTINUATION;
all 17 authority/effect flags are false. SC means an ordinary manual diagnostic
checkpoint, not permission to continue a live operation. C09 instead retains UR,
a Staging blocker and an unresolved possible-write obligation regardless of
later clean reports. Aggregation is diagnostic test composition only.

## Behavioral RED/GREEN and measured verification

Node v24.19.0. Baseline before any authored repository change: **2455/2455**, exit 0.
Staging tests were written before an inert exported shell: **1 pass / 57
ERR_ASSERTION failures**, exit 1; the one pass checked existing HTML markers.
Implementation passed the identical test file: **58/58**, exit 0.
Connected tests were written against inert runChain/exit-helper bodies while
importing all four actual evaluators: **1 pass / 44 ERR_ASSERTION failures**,
exit 1; the existing-HTML check passed. Implementing only the test harness gave
**45/45**, exit 0. Neither RED contains syntax/module-not-found/TypeError failures.

Initial complete verification passed Staging 58, connected 45, focused 367,
full 2558 and isolation 9. A fresh read-only internal reviewer then found a P2:
Utilities access_unverified plus module approval_conflicting correctly requested
reconciliation but saved access_unverified as its replay blocker. The root cause
was selecting the evaluator's primary reason instead of its actual reconciling
secondary checkpoint. C23 reproduced this as **0 pass / 1 ERR_ASSERTION failure**,
exit 1 (expected approval_conflicting, actual access_unverified). The test-only
aggregator now selects the first reconciling Utilities/module reason; C23 verifies
approval conflict, availability unknown and installation conflict through replay.
C23 GREEN **1/1**, exit 0. No accepted source or test changed. No findings were
deferred. This internal review is not independent ChatGPT acceptance.

| Final run | Tests | Pass | Fail | Exit |
|---|---|---|---|---|
| Staging standalone | 58 | 58 | 0 | 0 |
| Connected end-to-end fixture | 46 | 46 | 0 | 0 |
| Requested combined focused | 368 | 368 | 0 | 0 |
| Full suite | 2559 | 2559 | 0 | 0 |
| Separate quoted isolation selection | 9 | 9 | 0 | 0 |
| Source, standalone test, connected test syntax | n/a | n/a | n/a | 0 each |

All final runs have zero skipped/cancelled/todo tests. The full suite includes all
2455 byte-unchanged baseline tests plus 58 + 46 new tests. Counts supplement the
connected behavioral assertions above; they do not substitute for chain evidence.
Original RED assertions remain unchanged; C23 is the additional review regression.

Commands from `Sh_Project_Setup_extension` (the evidence driver expands the full
suite glob into the same sorted native test-file arguments):

```bash
node --test test/odoo-sh-staging-neutralized-copy-fixture-flow.test.mjs
node --test test/phase15-connected-fixture-provisioning.test.mjs
node --test \
  test/odoo-sh-project-setup-fixture-flow.test.mjs \
  test/odoo-sh-repository-production-fixture-flow.test.mjs \
  test/odoo-sh-utilities-modules-fixture-flow.test.mjs \
  test/odoo-sh-staging-neutralized-copy-fixture-flow.test.mjs \
  test/phase15-connected-fixture-provisioning.test.mjs \
  test/odoo-sh-fixtures.test.mjs \
  test/interaction-context-guards.test.mjs \
  test/interaction-dom-primitives.test.mjs \
  test/interaction-interruption-policy.test.mjs \
  test/interaction-approval-timeout-uncertainty.test.mjs
node --test test/*.test.mjs
node --check src/odoo-sh/staging-neutralized-copy-fixture-flow.mjs
node --check test/odoo-sh-staging-neutralized-copy-fixture-flow.test.mjs
node --check test/phase15-connected-fixture-provisioning.test.mjs
node --test \
  --test-name-pattern='A34|G25|D32|I36|S31|R34|M isolation|staging isolation|connected isolation' \
  test/odoo-sh-page-recognition.test.mjs \
  test/interaction-context-guards.test.mjs \
  test/interaction-dom-primitives.test.mjs \
  test/interaction-interruption-policy.test.mjs \
  test/odoo-sh-project-setup-fixture-flow.test.mjs \
  test/odoo-sh-repository-production-fixture-flow.test.mjs \
  test/odoo-sh-utilities-modules-fixture-flow.test.mjs \
  test/odoo-sh-staging-neutralized-copy-fixture-flow.test.mjs \
  test/phase15-connected-fixture-provisioning.test.mjs
node --test --test-name-pattern='C23' test/phase15-connected-fixture-provisioning.test.mjs
```

Temporary evidence is in `/tmp/phase15-04-bgv5d3m4/`: baseline.log, both RED logs,
Staging shell/test and connected RED test snapshots, review-fix-red/green logs,
pre-review verification logs/JSON, final run logs/JSON and run.py. Temporary files
can expire; this report retains measured results. An unavailable `python` alias
failed with exit 127 before snapshot creation; Python3 succeeded before edits.
An AGENTS.md search had no matches (rg exit 1). Neither setup issue is test RED.

## Exact ten-file inventory

Create:

1. [src/odoo-sh/staging-neutralized-copy-fixture-flow.mjs](../../../src/odoo-sh/staging-neutralized-copy-fixture-flow.mjs)
2. [test/odoo-sh-staging-neutralized-copy-fixture-flow.test.mjs](../../../test/odoo-sh-staging-neutralized-copy-fixture-flow.test.mjs)
3. [test/phase15-connected-fixture-provisioning.test.mjs](../../../test/phase15-connected-fixture-provisioning.test.mjs)
4. [docs/Phases/phase15/PHASE_15_04.md](PHASE_15_04.md)

Append only:

5. [docs/Phases/phase15/PHASE_15.md](PHASE_15.md)
6. [docs/00_PROJECT_STATUS.md](../../00_PROJECT_STATUS.md)
7. [docs/03_CHANGELOG.md](../../03_CHANGELOG.md)
8. [docs/04_TEST_EVIDENCE.md](../../04_TEST_EVIDENCE.md)
9. [docs/05_BLOCKERS_AND_DECISIONS.md](../../05_BLOCKERS_AND_DECISIONS.md)
10. [docs/06_HANDOFF.md](../../06_HANDOFF.md)

## Preservation evidence and remaining limits

Entry root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`;
branch `feature/sh-project-setup-extension-clean`; both origin URLs
`https://github.com/https-Ali-Muhammed/Plementus-Tools.git`.
HEAD/upstream `374f90b952421159d581f332dd1f6e485d34b6fd`; entry staging and
extension status empty. All Git inspection uses GIT_OPTIONAL_LOCKS=0. Acceptance
and publication of 15.03 are owner-supplied, reconciled with local recorded refs;
no live remote freshness or GitHub check was performed.

The evidence directory captures complete ref names/object IDs (45 at entry),
raw bytes of all three indexes, three worktree registrations, all 231 tracked
extension-file hashes, six original document byte prefixes, and non-IDE status
for every worktree. No fixed historical ref-count requirement was used.

| Worktree | Protected branch | Entry HEAD | Raw index SHA-256 |
|---|---|---|---|
| Tools | feature/sh-project-setup-extension | 390c9ea7c311f362ea04aad64ed14569161642ec | 97d6cfaa9e3a713c1e1d5e5579b62f43a7c03d8699f0738db7fbba0f5a2bf1cd |
| Tools-Smart-Editor-Guard | feature/odoo_website_smart_editor_guard | 9a818495593c87ef6d4a1376e7f81be26513e0b5 | 877fd06f1d7824c31cdb60b01fe31c5b842b8599bf95eec47b70881fb9119c37 |
| Tools-sh-project-setup-extension-clean | feature/sh-project-setup-extension-clean | 374f90b952421159d581f332dd1f6e485d34b6fd | 15881ca0303c29219882fc69c3e0dc6a44d600d4fa01741ef01794ddea015089 |

Sibling entry exceptions are metadata-only: Tools has two untracked docs/_source
files (ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md and ODOO_SH_PROJECT_SETUP_NEXT_CHAT_HANDOFF.md);
Smart Editor Guard has 21 untracked documentation paths, retained in status-1.before.
Their contents were not inspected. All .idea paths were excluded from status
inspection; no IDE content/status continuity is claimed. In particular,
.idea/plemo-chats.xml and ignored IDE contents were never read, hashed, restored,
edited or staged. Index snapshots are raw Git metadata, not IDE-file content.
Historical 43→44 and later Codex-named ref changes remain **UNVERIFIED**; no
creator attribution, historical reconciliation or repair is claimed.

Skills actually used: Ponytail; Superpowers using-superpowers, brainstorming
scope review, writing-plans, executing-plans, test-driven-development,
verification-before-completion, requesting/receiving-code-review and
systematic-debugging. Tools: functions exec/exec_command/write_stdin, shell,
Python3, rg, read-only Git, Node, and one read-only collaboration reviewer.
No external service MCP, browser, network, provider or web research was used.
WarpGrep/Valyu discovery found no available tool; local contracts define this
invented scope. The reviewer deferred documentation/audit/RED/full-suite judgment
to the root agent's measurements, and correctly excluded provider/durable behavior.
Ruling: those external capabilities remain unverified, while the root-owned final
verification and audit supply offline evidence only.


## Final measured audit and parent offline exit

Final preservation audit (`python3 /tmp/phase15-04-bgv5d3m4/audit.py`) **PASS**,
exit 0: exactly **10 authorized paths (4 new, 6 append-only)**; all six historical
byte prefixes identical; **225 other existing extension files unchanged**,
including every accepted source, test, fixture and Phase 15.01–15.03 report.
All **45 complete ref names/object IDs**, **three raw indexes** and **three worktree
registrations/branch identities** match entry exactly. No unexplained in-task
change was observed. Root/branch/HEAD/upstream/origins remain as required, staging
empty, sibling non-IDE status unchanged. Historical discrepancies stay UNVERIFIED.
No claim is made about uncaptured Git metadata/inodes or historical creator identity.

UTF-8/LF, whitespace, paired Markdown fences, final newlines, scoped git diff
--check and **17 authored local Markdown links** pass. Staging tests are
byte-identical to their original RED snapshot; the original connected assertions
are unchanged, with C23 added for the review fix.

| Preserved historical document | Prefix bytes | SHA-256 |
|---|---|---|
| docs/Phases/phase15/PHASE_15.md | 6201 | 17aad4c3607d2a2ac5bd26566e0323af7b20ff1cf85b91ba41650243616bef5c |
| docs/00_PROJECT_STATUS.md | 135340 | 3da4fe89da26dbf1c78f8d8d719c15786638d689583998caba46fc06fd1a73c6 |
| docs/03_CHANGELOG.md | 141994 | 3be3327765a703e2f7da5a26a17ebab0fe802a39992f925d3328f427fb9b5ddf |
| docs/04_TEST_EVIDENCE.md | 257177 | e80e3ff58a6c8749e3bce25ab96b1e9fb57ae532ad726f0c56846094ad49ad14 |
| docs/05_BLOCKERS_AND_DECISIONS.md | 132351 | 7c3685d28a643324e01fdff2042654d9972b50172e34e9d3f5baa2d312917e03 |
| docs/06_HANDOFF.md | 155448 | c72cf02c1ba7c5765e6af60e8c2b760344cd5ab79a81070b8753e3163c476aee |

Complete captured ref inventory SHA-256: `a5bec3e3da8b050b2c02c25f4e24d7a655a8aa2f39e04921e83025c7848d9fbb`.
Worktree registration inventory SHA-256: `caf2c8839970976ce0a7a66a63cb7c2ad54fad1d20e4c4931314541806ba8553`.

The actual final run records, including zero failures/skips/cancellations/todos,
were converted into the tested exit helper's four outcomes. Required cases
(58 Staging + 46 connected), connected consistency (46 connected + 368 focused),
isolation (9 checks plus preservation audit), and regressions (2559 full tests
plus three syntax checks) were all PASS. The helper returned **FIXTURE_EXIT_PASS**
with SIMULATED/SYNTHETIC_UNTRUSTED/fixtureOnly and all 17 flags false.
`exit-decision.json` retains those measured inputs and the sanitized result.
C22 separately proves failed/incomplete/malformed outcomes return
FIXTURE_EXIT_BLOCKED. This is a test-only acceptance assessment, not a production
evaluator or a grant to act.

**TECHNICAL OFFLINE FIXTURE EXIT PASS — PENDING CHATGPT ACCEPTANCE/PUBLICATION**.
**PHASE 15.04: READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Official progress remains **52/72; 5/20**. Phase 15 parent **IN_PROGRESS /
NOT ACCEPTED**. After independent accepted publication, anticipated micro-phase
progress is 53/72; parent acceptance is a separate explicit ChatGPT decision.

Provider compatibility, browser permissions, authenticated account/rights/
subscription/write approval, real source/destination checks, executed copy,
neutralization, module installation, durable replay/cancellation/uncertainty
tracking and runtime security remain unverified. Phase 09.03/10.03 **BLOCKED /
NOT AUTHORIZED**; Production **NO_GO**. Historical Git discrepancies **UNVERIFIED**.
No clone/fetch/checkout/reset/clean/stash/ref repair/staging/commit/push occurred.
No Phase 16 work. **STOP for independent ChatGPT review.**
