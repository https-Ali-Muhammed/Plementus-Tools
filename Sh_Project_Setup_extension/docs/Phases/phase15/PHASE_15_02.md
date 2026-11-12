# Phase 15.02 — Offline repository association and Production readiness

2026-11-12 (Africa/Cairo). **FIXTURE_ONLY / NO EXECUTION AUTHORITY**.
Contract and implementation plan recorded before implementation.

## Baseline and scope

Required/observed HEAD and local upstream:
`75c5c977e91f06121b15e6fa23ea5276cafe0610`.
Root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`;
branch `feature/sh-project-setup-extension-clean`; origin fetch/push both
`https://github.com/https-Ali-Muhammed/Plementus-Tools.git`.
Initial staged inventory and extension status empty. All Git inspection uses
`GIT_OPTIONAL_LOCKS=0`. Publication/acceptance of [15.01](PHASE_15_01.md) is
owner-supplied; local refs match, with no fetch or live remote verification.
Earlier pending labels remain historical, byte-identical records.
Official progress **50/72 accepted micro-phases; 5/20 fully accepted master phases**.

Scope reaches only one new standalone evaluator, its native tests, this report,
and six append-only tracking records. No callers, existing exports, fixtures,
configuration, dependencies or accepted implementations change. Importing the
existing evaluators into production would violate this scope; no such connection
is needed. A34/G25/D32/I36 and the accepted 15.01 isolation test stay unchanged.
ADR-006/007/008, [integration](../../08_INTEGRATION_CONTRACTS.md) and
[security](../../09_SECURITY_AND_SECRETS.md) retain independent authentication,
browser access, provider rights and immediate write approval boundaries.
Phase 08–10 discovery/approval contracts confer no rights here; even branch
existence is separate from environment readiness. No GitHub schema is reused or
extended. This new vocabulary describes the inert Odoo.sh fixtures only.

## Canonical v1 wire contract

Sole export: `assessFixtureRepositoryProduction(requestText, associationText, productionText)`.
Each argument must be a primitive canonical JSON string of **1–1024 printable
ASCII characters** (U+0020–U+007E). Reject all nonstrings before size checks,
parsing, coercion or property access. Every input must parse to a flat object with
exactly the ordered fields below. `JSON.stringify(parsed) === original` and exact
key order are required. Whitespace, duplicate keys, alternate escaping/numbers,
missing/extra fields, arrays and nested values reject. Assume pristine native
JavaScript intrinsics; caller objects/accessors/proxies are never inspected.

Shared closed vocabularies:

| Name | Values |
|---|---|
| project | null, `fixture-project-001`, `fixture-project-002` |
| repository | null, `fixture-repo-001`, `fixture-repo-002` |
| branch | null, `main`, `develop` (fictional branch labels only) |
| environment | null, `fixture-production-001`, `fixture-staging-001` |
| generation | null or integer 1–1000000 |
| lifecycle | `active`, `cancelled`, `interrupted`, `worker_lost`, `session_lost` |
| authentication | `none`, `login`, `mfa`, `captcha`, `session_expired` |
| readiness | `ready`, `pending`, `failed`, `unknown`, `missing`, `stale`, `conflicting`, `interrupted` |

| Request fields, exact order | Allowed value |
|---|---|
| version | integer 1–999; only 1 supported |
| projectToken | project |
| repositoryToken | repository |
| branch | branch |
| environmentToken | environment |
| documentGeneration | generation |
| contextGeneration | generation |
| sequence | integer 0–999999 |
| lifecycle | lifecycle |
| review | `pending`, `reviewed`, `declined` |

| Association fields, exact order | Allowed value |
|---|---|
| version | integer 1–999; only 1 supported |
| projectToken | project |
| repositoryToken | repository |
| branch | branch |
| environmentToken | environment |
| documentGeneration | generation |
| contextGeneration | generation |
| sequence | integer 1–1000000 |
| lifecycle | lifecycle |
| authentication | authentication |
| associationState | `not_established`, `pending`, `reported`, `conflicting`, `unknown`, `failed` |
| writeOutcome | `none`, `uncertain` |

| Production fields, exact order | Allowed value |
|---|---|
| version | integer 1–999; only 1 supported |
| projectToken | project |
| branch | branch |
| environmentToken | environment |
| documentGeneration | generation |
| contextGeneration | generation |
| sequence | integer 1–1000000 |
| lifecycle | lifecycle |
| authentication | authentication |
| buildReadiness | readiness |
| databaseReadiness | readiness |

The only matching target is project001 / repo001 / main / production001. Alternate
tokens exist solely for negative tests, even when all inputs agree on them.
Production has no repository field: the inert Production HTML supplies none.
Its project, branch and environment must match the requested association target.
Both observation sequences must independently equal request sequence + 1; these
are two views of one synthetic assessment round, not a chronological write chain.
Generations identify a caller-supplied fixture round, not actual browser documents.
All three must agree; null, older and newer values fail closed. No freshness or
cross-page atomicity is inferred. `interrupted` covers unexpected interruption;
`worker_lost`/`session_lost` explicitly model lost execution context.

The [setup HTML](../../../fixtures/odoo-sh/project-setup.html) contains repo001
as an option, project001 and main/Production text. **An option proves only its
presence in a fixture**, not association, privacy, branch permissions or ownership.
The [Production HTML](../../../fixtures/odoo-sh/production.html) contains
production001 and independent build/database `ready` markers. These are inert
text, not browser observations or provider readiness. Every association status,
review, lifecycle, generation, sequence, uncertainty and non-ready state is
**caller-supplied test data**, not an existing HTML observation. No real URLs,
customer names, subscription codes, credentials, provider IDs or arbitrary page
text are accepted. A `reported` association is never installed modules, utility
authorization, verified privacy or GitHub permission evidence.

## Exact output

Fresh, flat, frozen record; ordered fields:
`version` (1), `resultClass`, `syntheticAssociation`, `syntheticBuild`,
`syntheticDatabase`, `reason`, `evidenceTier` (`SIMULATED`), `provenance`
(`SYNTHETIC_UNTRUSTED`), `fixtureOnly` (true), `nextStep`, then these **17 false**
fields in order:

`browserObserved`, `permissionVerified`, `accountVerified`, `rightsVerified`,
`subscriptionVerified`, `approvalGranted`, `executionAuthorized`,
`mutationAuthorized`, `installationAuthorized`, `trustedContinuingContext`,
`associationVerified`, `productionDatabaseVerified`, `stagingCopyVerified`,
`moduleInstalled`, `effectsApplied`, `readAuthorized`, `writeAuthorized`.

Only fixed primitive literals leave the boundary, no tokens or raw inputs/errors.
Serialized output <=2048 printable ASCII characters. No success, repositoryLinked,
productionReady, retryAllowed or equivalent authority-bearing field exists.
Default class `MANUAL_REVIEW`, three synthetic states `UNRESOLVED`.
`syntheticAssociation` can otherwise be `NOT_ESTABLISHED`, `PENDING`, `FAILED`,
`REPORTED`. Only after context, target and review checks can association be
`REPORTED` and build/database independently project the readiness enum in uppercase.
`READY` on one synthetic field does not imply `READY` on the other.

## Deterministic first-match precedence

Checks below apply to all relevant inputs before later rows. Within a row,
missing beats mismatch; across observations the condition is aggregate, so an
earlier category wins regardless of which observation contains it.

| Order | Condition | reason | nextStep / override |
|---|---|---|---|
| 1 | Any nonstring | invalid_input | CORRECT_FIXTURE; REJECTED |
| 2 | Any string >1024 | input_too_large | CORRECT_FIXTURE; REJECTED |
| 3 | Any invalid schema/canonical form | invalid_input | CORRECT_FIXTURE; REJECTED |
| 4 | Any valid version other than 1 | unsupported_version | REVIEW_VERSION; REJECTED |
| 5 | Any cancelled lifecycle | operator_cancelled | STOP; CANCELLED |
| 6 | writeOutcome uncertain | possible_write_unresolved | MANUAL_RECONCILIATION |
| 7 | associationState unknown | association_unknown | MANUAL_RECONCILIATION |
| 8 | Any worker_lost or session_lost | context_lost | FRESH_FIXTURE_CONTEXT |
| 9 | Any interrupted lifecycle | lifecycle_interrupted | FRESH_FIXTURE_CONTEXT |
| 10 | Either authentication not none | authentication_required | MANUAL_AUTH |
| 11 | Any null document generation | document_generation_missing | FRESH_FIXTURE_CONTEXT |
| 12 | Document generations unequal | document_generation_mismatch | FRESH_FIXTURE_CONTEXT |
| 13 | Any null context generation | context_generation_missing | FRESH_FIXTURE_CONTEXT |
| 14 | Context generations unequal | context_generation_mismatch | FRESH_FIXTURE_CONTEXT |
| 15 | Either observation sequence equals request | duplicate_observation | FRESH_FIXTURE_CONTEXT |
| 16 | Either observation sequence below request | delayed_observation | FRESH_FIXTURE_CONTEXT |
| 17 | Either observation sequence exceeds request + 1 | observation_gap | FRESH_FIXTURE_CONTEXT |
| 18 | Any null project/environment | target_missing | MANUAL_FIXTURE_TARGET |
| 19 | Project/environment unequal | target_mismatch | MANUAL_FIXTURE_TARGET |
| 20 | Agreed project/environment not project001/production001 | fixture_target_mismatch | MANUAL_FIXTURE_TARGET |
| 21 | Request or association repository null | repository_missing | MANUAL_ASSOCIATION |
| 22 | Repositories unequal or agreed repository not repo001 | repository_mismatch | MANUAL_ASSOCIATION |
| 23 | Any branch null | branch_missing | MANUAL_FIXTURE_TARGET |
| 24 | Branches unequal or agreed branch not main | branch_mismatch | MANUAL_FIXTURE_TARGET |
| 25 | associationState conflicting | association_conflicting | MANUAL_RECONCILIATION |
| 26 | Review not reviewed with association other than not_established | review_outcome_conflict | MANUAL_RECONCILIATION |
| 27 | Review declined | review_declined | STOP |
| 28 | Review pending | association_review_required | MANUAL_ASSOCIATION_REVIEW |
| 29 | Association not_established | association_not_established | MANUAL_ASSOCIATION; syntheticAssociation NOT_ESTABLISHED |
| 30 | Association pending | association_pending | MANUAL_ASSOCIATION; syntheticAssociation PENDING |
| 31 | Association failed | association_failed | MANUAL_FAILURE_REVIEW; syntheticAssociation FAILED |
| 32 | Either readiness conflicting | production_evidence_conflicting | MANUAL_RECONCILIATION |
| 33 | Either readiness missing | production_evidence_missing | MANUAL_PRODUCTION_EVIDENCE |
| 34 | Either readiness stale | production_evidence_stale | FRESH_FIXTURE_CONTEXT |
| 35 | Either readiness interrupted | production_interrupted | FRESH_FIXTURE_CONTEXT |
| 36 | Either readiness failed | production_failed | MANUAL_FAILURE_REVIEW |
| 37 | Either readiness unknown | production_unknown | MANUAL_PRODUCTION_EVIDENCE |
| 38 | Both readiness pending | synthetic_both_pending | MANUAL_PRODUCTION_EVIDENCE |
| 39 | Build pending only | synthetic_build_pending | MANUAL_PRODUCTION_EVIDENCE |
| 40 | Database pending only | synthetic_database_pending | MANUAL_PRODUCTION_EVIDENCE |
| 41 | Both ready | synthetic_pair_ready | MANUAL_FIXTURE_REVIEW |

Rows 32–41 use class `SIMULATED_READINESS`, association `REPORTED` and independent
uppercase synthetic build/database states. Earlier rows leave both readiness
fields `UNRESOLVED`, even if inputs say ready. `conflicting` means contradictory
evidence about a component; ready build with pending database is not a conflict.
All steps are diagnostic manual labels, never executable operations.
Cancellation wins diagnosis but cannot reconcile an earlier effect. Unknown or
uncertain write state cannot be cleared by unrelated readiness. Structural/version
rejection grants no retry and does not erase external uncertainty records.

## Stateless limits and plan

Identical input replays identically with a fresh result. This function stores
nothing, latches no cancellation, retains no uncertainty across calls, authenticates
no reviews and detects no unreported event. A later clean triple can repeat its
earlier diagnostic: it does not clear a real cancellation or authorize resuming.
No production workflow, connected provisioning demonstration or browser/provider
capability is introduced. Connected provisioning remains a Phase 15 parent exit
requirement under its accepted isolation constraints.

The explicit implementation request and nine-file allowlist govern skill workflow
defaults: keep design/plan here, no additional approval round, worktree, commit or
plan file. Use Ponytail and Superpowers scope/planning, TDD and verification.

- [x] Write behavioral tests for all rows, independent readiness, competing
  failures, hostile/canonical inputs, replay, immutable false authority and isolation.
- [x] Add an inert export shell; record assertion RED, not import/syntax failure.
- [x] Implement only this standalone evaluator; record GREEN with the same tests.
- [x] Run requested focused/full/syntax checks and accepted isolation selection.
- [x] Append six trackers; audit exact nine paths, original document byte prefixes,
  all accepted extension bytes, refs, raw indexes and three worktree identities.
- [x] Stop for independent ChatGPT review; do not begin 15.03.

Initial full suite: **2357/2357 PASS**, no failures/skips/cancellations/todo.
Preflight snapshot: `/tmp/phase1502-baseline.json`; baseline log:
`/tmp/phase1502-baseline-tests.log`. Temporary evidence may expire.

## Measured verification and review evidence

Node **v24.19.0**; local native tests only. **43 tests** (R01–R34 with independent
parameter variants) cover all 41 precedence rows. R03–R07 separate selection,
association and target/branch agreement; R08–R10/R27 check all 64 build/database
combinations; R11–R16 cover generations, ordering, cancellation, context loss,
authentication and uncertainty. R17–R25 cover all three input schemas, versions,
malformed/hostile inputs, bounds and precedence. R26 exercises every compatible
pair in its operational-failure table; R28 covers review/association priority over
Production evidence. R29–R30 check replay and immutability. R31–R32 distinguish
inert HTML and test-only 15.01 consistency from authenticated project existence.
R33–R34 replay exercised cases, check sanitized output/all 17 false flags, reject
new production consumers/imports and trap capability access during initialization
and evaluation. Every behavior assertion checks the exact flat ordered output.

Initial tests preceded an inert exported shell: **0/43 PASS, 43 assertion failures,
exit 1**; no missing-module/syntax failure. First implementation: **41/43 PASS,
2 FAIL, exit 1**. R26's generated combination inadvertently aligned all environment
tokens, eliminating its intended mismatch; the mismatch witness was changed to a
different project, so it remains independent of the all-wrong-environment case.
R34's new lexical capability guard rejected the literal `document` used as a
reason-code prefix. Explicit generation checks retain the contract and satisfy
the unchanged guard. No accepted isolation conflict was encountered.

After these corrections the final test file was rerun against the inert shell:
**0/43 PASS, 43 assertion failures, exit 1**. Restoring the implementation produced
**43/43 GREEN, exit 0** against that byte-identical final test file. Original and
corrected RED logs/source/tests and the intermediate log are retained. These
are behavioral assertions, not module or syntax failures. The two corrections
are disclosed rather than counted as an uninterrupted first-pass GREEN.

| Run | Exit | Tests / pass / fail / skip / cancelled / todo |
|---|---|---|
| Initial full baseline | Summary PASS; exit not separately captured | 2357 / 2357 / 0 / 0 / 0 / 0 |
| Rechecked unchanged accepted tests (excluding new file) | 0 | 2357 / 2357 / 0 / 0 / 0 / 0 |
| Initial behavioral RED | 1 | 43 / 0 / 43 / 0 / 0 / 0 |
| Intermediate implementation | 1 | 43 / 41 / 2 / 0 / 0 / 0 |
| Corrected-test behavioral RED | 1 | 43 / 0 / 43 / 0 / 0 / 0 |
| New focused GREEN | 0 | 43 / 43 / 0 / 0 / 0 / 0 |
| Requested combined focused | 0 | 268 / 268 / 0 / 0 / 0 / 0 |
| Requested full suite | 0 | 2400 / 2400 / 0 / 0 / 0 / 0 |
| Separate accepted/new isolation | 0 | 17 / 17 / 0 / 0 / 0 / 0 |
| Source syntax | 0 | no test count |
| Test syntax | 0 | no test count |

Run from `Sh_Project_Setup_extension`:

```bash
node --test test/odoo-sh-repository-production-fixture-flow.test.mjs
node --test test/odoo-sh-fixtures.test.mjs test/odoo-sh-project-setup-fixture-flow.test.mjs test/odoo-sh-page-recognition.test.mjs test/odoo-sh-unknown-page-fallback.test.mjs test/interaction-context-guards.test.mjs test/interaction-dom-primitives.test.mjs test/interaction-interruption-policy.test.mjs test/interaction-approval-timeout-uncertainty.test.mjs test/odoo-sh-repository-production-fixture-flow.test.mjs
node --test test/*.test.mjs
node --test --test-name-pattern='A34|U18|G25|D32|I36|source.*(import|capabilit|caller)|standalone.*(import|capabilit|caller)|controller has no imports|import-free|isolated source|planner only imports|S31|R34' test/branch-creation-plan.test.mjs test/deploy-key-handoff.test.mjs test/github-api-error-fixtures.test.mjs test/github-permission-reader.test.mjs test/github-repository-create-preview.test.mjs test/github-repository-discovery.test.mjs test/github-sandbox-write-approval-fixtures.test.mjs test/interaction-context-guards.test.mjs test/interaction-dom-primitives.test.mjs test/interaction-interruption-policy.test.mjs test/odoo-sh-page-recognition.test.mjs test/odoo-sh-unknown-page-fallback.test.mjs test/read-only-admission.test.mjs test/submodule-structure.test.mjs test/utilities-plan.test.mjs test/odoo-sh-project-setup-fixture-flow.test.mjs test/odoo-sh-repository-production-fixture-flow.test.mjs
node --check src/odoo-sh/repository-production-fixture-flow.mjs
node --check test/odoo-sh-repository-production-fixture-flow.test.mjs
```

Temporary evidence `/tmp/phase1502-evidence/`: `red.log`, `red-source.mjs`,
`red-test.mjs`, `intermediate-41-2.log`, `red-final.log`, `red-final-test.mjs`,
`implementation.mjs`, `green.log`, `focused.log`, `full.log`, `isolation.log`,
`accepted-baseline.log`, syntax logs and run JSON files. The accepted-baseline
JSON records the exact expanded test command excluding only the new file.
An initial skill-read command mistakenly referenced a nonexistent path (exit 1);
the actual installed skills were subsequently read. A discovery command ended
with rg exit 1 because no repository AGENTS.md matched. Neither is test RED.
WarpGrep discovery returned no available tool; scoped searches used rg.

## Exact nine-file inventory

All paths below are inside the extension. Create:

1. [Standalone evaluator](../../../src/odoo-sh/repository-production-fixture-flow.mjs).
2. [Native tests](../../../test/odoo-sh-repository-production-fixture-flow.test.mjs).
3. This [Phase 15.02 report](PHASE_15_02.md).

Append only:

4. [Phase 15 parent](PHASE_15.md).
5. [Project status](../../00_PROJECT_STATUS.md).
6. [Changelog](../../03_CHANGELOG.md).
7. [Test evidence](../../04_TEST_EVIDENCE.md).
8. [Blockers and decisions](../../05_BLOCKERS_AND_DECISIONS.md).
9. [Handoff](../../06_HANDOFF.md).

Skills used: Ponytail; Superpowers using-superpowers, brainstorming scope review,
writing-plans, test-driven-development, systematic-debugging and
verification-before-completion. Tools actually used: functions exec/exec_command
and apply_patch with local shell, Python3, rg, read-only Git and Node. No external
service MCP, web research, browser control, provider access or subagent was used.
Local source/contract review is not independent ChatGPT acceptance.

## Final preservation and handoff

`python3 /tmp/phase1502-evidence/audit.py`: **PASS, exit 0**. Exactly **nine
authorized paths**, three new and six append-only. All **six original document
prefixes are byte-identical**; **219 other pre-existing extension files**, including
all **87 accepted source/test files**, retain SHA-256. Phase 15.01 source/tests/report,
all accepted HTML, previous reports, master plan, ADRs, security/integration
contracts, manifest, runtime, dependencies and README are unchanged.

All **43 refs**, **three raw indexes** (bytes and device/inode/size/mtime), and
**three worktree identities** (registration, root device/inode, HEAD/branch, Git
directory and linked pointers) match the initial snapshot. Staging remains empty.
Root, branch, origin fetch/push and HEAD/upstream still match the required baseline.

| Worktree under `/home/https_ali_muhammed/Plementus/` | Branch | HEAD |
|---|---|---|
| Tools | feature/sh-project-setup-extension | 390c9ea7c311f362ea04aad64ed14569161642ec |
| Tools-Smart-Editor-Guard | feature/odoo_website_smart_editor_guard | 9a818495593c87ef6d4a1376e7f81be26513e0b5 |
| Tools-sh-project-setup-extension-clean | feature/sh-project-setup-extension-clean | 75c5c977e91f06121b15e6fa23ea5276cafe0610 |

| Raw index | Unchanged SHA-256 |
|---|---|
| Tools | 97d6cfaa9e3a713c1e1d5e5579b62f43a7c03d8699f0738db7fbba0f5a2bf1cd |
| Smart Editor Guard | 877fd06f1d7824c31cdb60b01fe31c5b842b8599bf95eec47b70881fb9119c37 |
| Extension clean | be4213538ad977f11365ebd4fb8af70e97c21f90d70ec37981095344cdb35a41 |

All **20 authored local Markdown links** resolve; UTF-8/LF/final-newline,
trailing-whitespace, paired-fence and scoped `git diff --check` checks pass.
The final test file equals the corrected RED snapshot byte-for-byte. The first
audit helper run failed because its `.strip()` removed Git status's first leading
space before path slicing; preserving that space corrected the helper, without
any repository fix. That helper error is not a repository mismatch or test RED.
`audit.json` preserves inventories, prefix/index hashes and the measured status.

No protected `.idea` contents or sibling source files were inspected or changed.
No clone, fetch, checkout, reset, stage, commit, push or discrepancy repair occurred.
Historical reference/index discrepancies and cross-turn continuity remain
**UNVERIFIED**, without attribution. This task's 43-ref snapshot does not explain
the prior report's 42-ref snapshot or older discrepancies. Git objects, other
uncaptured Git metadata and live remote freshness were not audited.

The evaluator is import-free, has no production consumers and adds no runtime,
DOM, browser, network, provider, timer, storage or write capability. No connected
provisioning demonstration, real provider verification, trusted review or durable
cancellation/uncertainty/replay protection exists. Independent ChatGPT review and
GitHub publication remain outstanding; no acceptance is claimed here.

**PHASE 15.02: READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Official progress remains **50/72 accepted micro-phases; 5/20 fully accepted master
phases** until independent ChatGPT acceptance and GitHub publication.
Phase 15 **IN_PROGRESS / NOT ACCEPTED**. Phase 14 and 13 fixture-only exits
**PASS**; live capability **PENDING**. Phase 09.03 and 10.03 live-write gates
**BLOCKED / NOT AUTHORIZED**. Historical Git discrepancies **UNVERIFIED**.
Production **NO_GO**. **STOP for independent ChatGPT review.**
No staging, commit, push or Phase 15.03 work.
