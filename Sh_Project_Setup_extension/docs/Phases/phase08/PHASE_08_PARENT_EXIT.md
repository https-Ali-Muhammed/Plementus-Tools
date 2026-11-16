# Phase 08 — offline parent-exit acceptance record

2026-11-16 (Africa/Cairo). **DOCUMENTATION_ONLY / NO_PUBLICATION**.
**PHASE 08 PARENT ACCEPTANCE DOCUMENTATION: READY_FOR_CHATGPT_REVIEW.**

## Decision and evidence provenance

The owner supplies the independent ChatGPT review disposition: the uploaded
23-case [parent regression](../../../test/phase08-parent-exit.test.mjs) is
**ACCEPTED within OFFLINE_FIXTURE_ONLY scope**. ChatGPT independently checked
syntax and assertions but did not rerun functional tests. This task verified
that the local untracked test has the supplied SHA-256
`01994f0c18adaaacb2ed0396e4449954f4c84e9c16fb6a308f30b62c33f29dc4`.
The test is preserved without editing it. Acceptance is attributed to the
supplied review, not inferred from a test count or Git metadata.

The Phase 08 offline parent-exit evidence is accepted **for documentation**.
This report and six append-only tracking records remain uncommitted and
unpublished. Phase 08 is **not yet counted as a published parent**. The
owner-supplied current ledger is **57/72 accepted micro-phases and 10/20
published parents**. Only independently verified approval and publication of
this record may make the prospective count **57/72 and 11/20**. Earlier
[2026-11-15 reconciliation](../PARENT_ACCEPTANCE_RECONCILIATION_2026_11_15.md)
records its then-current 7/20 and prospective 10/20 state as history; this
task does not rewrite it or independently reverify publication of Phases 11–13.

## Parent-level offline evidence

The [master plan](../../_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md) requires
read-only discovery of organization/repository access, repository visibility,
branches/default, scope errors and rate limits. The accepted fixture-only
micro-phases remain separate:

| Evidence | Existing public function | Codex-reported focused result |
|---|---|---:|
| [08.01](PHASE_08_01.md) organization/repository permissions | `readFixturePermissions` | 79/79 PASS |
| [08.02](PHASE_08_02.md) visibility and branches | `readFixtureRepositoryMetadata` | 97/97 PASS |
| [08.03](PHASE_08_03.md) API-failure classification | `evaluateFixtureApiFailure` | 289/289 PASS |
| Parent matrix | Three existing exports, invoked independently in the new test | 23/23 PASS |

The parent matrix uses the same invented organization and repository IDs in
the permission and metadata fixtures. It checks positive private-repository
branches; denied, unknown, unavailable and conflicting permissions; unknown or
unavailable discovery; malformed input to either reader; 401, ambiguous and
explicit 403, three unverified 404 variants, 429, timeout, interruption,
contradictory and malformed API-failure inputs. Every case asserts its specific
field-level result plus `evidenceTier: SIMULATED`, `fixtureOnly: true`,
`nextStep: manual`, four false authority flags, frozen sanitized outputs and
`readOutcome: UNKNOWN` for the failure classifier. Raw organization/repository
IDs, credentials and exception details do not appear in outputs.

The failure classifier has **no target identity field**. Its fixture result is
separately supplied synthetic evidence, never an authenticated response
correlated with the selected repository. The test creates no runtime
aggregator, production composite response or authorization rule. Even three
positive declarations cannot establish authenticated account access, current
permission, successful provider read or execution authority.

## Reproducible commands and limits

The following commands ran from `Sh_Project_Setup_extension/` in the preceding
Codex parent-regression task. Results are **Codex-reported historical evidence**;
no application tests were rerun for this documentation task. The independent
ChatGPT reviewer checked the uploaded test's syntax/assertions, not these
functional runs.

| Exact command | Reported result | Exit |
|---|---:|---:|
| `node --check test/phase08-parent-exit.test.mjs` | Syntax PASS | 0 |
| `node --test test/phase08-parent-exit.test.mjs` | 23/23 PASS | 0 |
| `node --test test/github-permission-reader.test.mjs test/github-repository-discovery.test.mjs test/github-api-error-fixtures.test.mjs test/phase08-parent-exit.test.mjs` | 488/488 PASS | 0 |
| `node --test test/*.test.mjs` | 2,968/2,968 PASS | 0 |

The three test runs reported zero failed, skipped and cancelled tests. The three
component suites total 465 tests; adding 23 parent cases gives 488 combined.
These are offline Node fixtures. Real GitHub authentication, membership,
provider response shapes, rate limits, repository/branch state and browser
behavior remain **NOT_VERIFIED**. No credential or provider call occurred in
this documentation task.

## Security and continuation boundary

[Phase 07.03](../phase07/PHASE_07_03.md) remains accepted **MOCK_ONLY**; Phase 07
parent remains **IN_PROGRESS / NOT ACCEPTED**. Phase 04 is **BLOCKED /
POSTPONED**, Phase 06 **PARTIAL / BLOCKED**, and Phase 14 full parent acceptance
is **HOLD** pending trusted browser interaction, lifecycle invalidation,
durable uncertainty and recovery. Phase 09.03/10.03 live operations remain
blocked; Phase 17 implementation is not authorized by this documentation
task; Phase 18/19 remain hard gates. Production **NO_GO**.

Historical 35→24 reference loss and later Git discrepancies remain
**UNVERIFIED**. The owner-authorized exception here permits documented
reference-name additions/removals only within
`refs/codex/turn-diffs/captures/` and
`refs/codex/turn-diffs/checkpoints/`, provided surviving refs, normal refs,
indexes, worktrees and staging remain intact. It does not identify the writer,
authorize ref mutation or repair history.

## Git entry inventory and task scope

Git root is `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`;
branch is `feature/sh-project-setup-extension-clean`; origin fetch/push is
`https://github.com/https-Ali-Muhammed/Plementus-Tools.git`. HEAD, upstream
and read-only live branch tip are
`1aca080d4d30cb27610febc69700189e7015b35e`. At entry, the target
worktree had only the pre-existing untracked parent test and modified
`.idea/plemo-chats.xml`; the protected XML was checked by path/status only.
All three staging areas were empty; raw indexes, linked worktrees and complete
sibling status inventories matched the preceding regression's final snapshot.

Relative to that snapshot, exactly these ref names changed before this task:

| Change | Ref name | Target | Type |
|---|---|---|---|
| Removed | `refs/codex/turn-diffs/captures/1794805259390/778745cc-49eb-4d02-b34e-255d2e14ef61/base` | `41bfd1e769ba9326cf65684e7d4c491a8ea1ff6a` | tree |
| Removed | `refs/codex/turn-diffs/checkpoints/f74cb6758dacdc536c9c7e136ed4cab8/c83784e7e98d841802e70982c1e5f704/1794804626770/a2508f2a-375d-443c-992d-4d1d18a07372` | `41bfd1e769ba9326cf65684e7d4c491a8ea1ff6a` | tree |
| Added | `refs/codex/turn-diffs/captures/1794806897423/2ee23bc9-194c-4c96-8bda-fdbe4ba6967a/base` | `5486f3b3afbec46dfb9b7cd95266372eaf9ae3b5` | tree |
| Added | `refs/codex/turn-diffs/checkpoints/f74cb6758dacdc536c9c7e136ed4cab8/1ec2093f119b79f4db0d2abfba2a003e/1794805499494/5a7dcfd8-d34a-4e61-a377-3b0bbf0a6786` | `5486f3b3afbec46dfb9b7cd95266372eaf9ae3b5` | tree |

Every surviving ref retained its name, target and type; normal branch/remote
refs were unchanged. The exception permits these name changes without
establishing their cause. The exact authorized documentation package is this
new report plus append-only records in `PHASE_08.md`, `00_PROJECT_STATUS.md`,
`03_CHANGELOG.md`, `04_TEST_EVIDENCE.md`, `05_BLOCKERS_AND_DECISIONS.md` and
`06_HANDOFF.md`. No source, test, fixture, manifest, master-plan, policy,
configuration, staging, commit or push change is authorized.

## Measured documentation and Git audit

The final task-entry comparison found exactly **seven authored documentation
paths**: this new report and six appended records. All six existing files
retain their complete original `HEAD` byte prefixes. The only other target
status entries are the pre-existing untracked parent test and protected IDE
path; source, tests, fixtures, manifest, master plan, policies and configuration
have no new tracked changes. The test SHA-256 still matches the uploaded
review artifact. The seven authored texts pass UTF-8, LF, final-newline,
trailing-whitespace and fence checks; all **13 authored local Markdown links**
resolve. Scoped `git diff --check` exited 0.

At the measured final Git snapshot, all **58 entry refs** retained exact names,
targets and types: zero additions, removals or retargets during this task.
Normal refs, HEAD/upstream/live tip, three raw indexes, three empty staging
areas, linked worktree registrations/HEADs and full sibling statuses match the
entry snapshot. Existing untracked sibling files remain untouched. Protected
`.idea/plemo-chats.xml` was observed only by path/status; no content or byte
equality claim is made. Historical Git uncertainty remains **UNVERIFIED**.
No application, browser or provider tests ran in this documentation task.

**STOP for independent ChatGPT review and separate publication decision.**
