# Phase 15.01 — Offline subscription and project setup simulation

2026-11-12 (Africa/Cairo). Scope: **FIXTURE_ONLY**.
**PHASE 15.01: READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Contract below was recorded before implementation; measured final evidence follows.

## Baseline, reconciliation and scope

Required and observed HEAD/recorded upstream:
`16bb67ca0d85ddba84c6f4847c094690621183ce`.
Root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`;
branch `feature/sh-project-setup-extension-clean`; origin fetch and push both
`https://github.com/https-Ali-Muhammed/Plementus-Tools.git`.
Initial staging and extension status are empty. All Git checks use
`GIT_OPTIONAL_LOCKS=0`; no fetch or remote freshness claim.

Per supplied acceptance/publication, [14.04](../phase14/PHASE_14_04.md) is
**ACCEPTED/PUBLISHED — FIXTURE_ONLY** at this baseline. Phase 14 fixture-only
exit **PASS**, live capability **PENDING**. Phase 13 fixture-only exit **PASS**,
live capability **PENDING**. These later tracking facts supersede earlier pending
labels without modifying any historical record. Official progress **49/72
accepted micro-phases; 5/20 fully accepted master phases**, unchanged by this work.
Phase 10.03 **BLOCKED / NOT AUTHORIZED**; historical Git discrepancies
**UNVERIFIED**; production **NO_GO**.

Scope map: one new standalone export and its new native tests; this report and
[Phase 15 parent](PHASE_15.md); five append-only tracking entries. No existing
caller, export, fixture, configuration, dependency or accepted module changes.
A34/G25/D32/I36 remain binding. No imports, re-exports, copied implementations,
or disguised dependencies on accepted recognition or interaction components.
ADR-006/007/008 govern browser-first direction; no OAuth/backend/token work.

## Canonical v1 contract — defined before implementation

`assessFixtureProjectSetup(requestText, observationText)` takes exactly two
primitive canonical JSON strings. Each is 1–1024 ASCII printable characters
(U+0020–U+007E). Reject nonstrings before length, parsing or property access;
never coerce objects, proxies, functions, symbols or boxed strings. Both documents
must parse to flat objects with exactly the ordered fields below. Canonical means
`JSON.stringify(parsed) === original`, plus exact key order; whitespace, duplicate
keys, escapes that stringify differently, alternate numeric forms, missing/extra
keys and arrays reject. No actual reference value, name, URL, credential, raw
error or customer field is accepted.

| Request fields in order | Allowed values/types |
|---|---|
| version | integer 1–999; only 1 supported |
| subscriptionMode | null, `customer`, `partner-trial` |
| referencePlaceholder | `present`, `absent` (presence only, no value) |
| projectToken | null, `fixture-project-001`, `fixture-project-002` |
| environmentToken | null, `fixture-production-001`, `fixture-staging-001` |
| documentGeneration | null or integer 1–1000000 |
| contextGeneration | null or integer 1–1000000 |
| sequence | integer 0–999999 (last synthetic observation) |
| lifecycle | `active`, `cancelled`, `interrupted` |
| review | `pending`, `reviewed`, `declined` |

| Observation fields in order | Allowed values/types |
|---|---|
| version | integer 1–999; only 1 supported |
| page | `project-setup`, `production`, `unknown` |
| selectedMode | null, `customer`, `partner-trial` |
| referencePlaceholder | `present`, `absent` |
| projectToken | null, `fixture-project-001`, `fixture-project-002` |
| environmentToken | null, `fixture-production-001`, `fixture-staging-001` |
| documentGeneration | null or integer 1–1000000 |
| contextGeneration | null or integer 1–1000000 |
| sequence | integer 1–1000000 |
| lifecycle | `active`, `cancelled`, `interrupted` |
| authentication | `none`, `login`, `mfa`, `captcha`, `session_expired` |
| evidence | `complete`, `missing`, `unknown`, `conflicting`, `ambiguous` |
| setupState | `not_submitted`, `submitted`, `pending`, `uncertain`, `failed`, `unknown` |

Tokens are an invented closed fixture vocabulary, not provider identifiers.
`fixture-project-002` and `fixture-staging-001` exist solely to exercise conflicts;
even matching pairs are inconsistent with this setup fixture. The accepted inert
[HTML](../../../fixtures/odoo-sh/project-setup.html) supplies customer/partner-trial
choices, project 001, repository 001, branch main and Production intent. This
module validates only subscription/project/Production-target semantics; repository
association belongs to 15.02. The HTML has no subscription-reference field:
`referencePlaceholder` is a synthetic test assertion, never a selector or real
input. Both subscription modes require `present` on both sides. Review and outcome
labels likewise are supplied synthetic assertions, not observed HTML effects.

### Output: exact ordered flat object, deeply frozen

Fields in order: `version` (1), `resultClass`, `setupState`, `reason`,
`evidenceTier` (`SIMULATED`), `provenance` (`SYNTHETIC_UNTRUSTED`), `fixtureOnly`
(true), `nextStep`, followed by these **17 permanently false** fields in order:

`browserObserved`, `permissionVerified`, `accountVerified`, `rightsVerified`,
`subscriptionVerified`, `approvalGranted`, `executionAuthorized`,
`mutationAuthorized`, `installationAuthorized`, `trustedContinuingContext`,
`associationVerified`, `productionDatabaseVerified`, `stagingCopyVerified`,
`moduleInstalled`, `effectsApplied`, `readAuthorized`, `writeAuthorized`.

All values are fixed primitive literals, output JSON <=2048 printable ASCII
characters. No input values are echoed. A fresh frozen object is returned per
call; flat primitive fields make the entire output deeply immutable. There is no
`created`, `success`, provider-verification or safe-retry output. `SUBMITTED` and
`PENDING` describe only a supplied simulated setup state, not project existence.

### Deterministic first-match precedence and output table

Unless specified otherwise, class is `MANUAL_REVIEW`, state `UNRESOLVED`.
Names on each row are literal reason/nextStep codes. Field order within paired
checks is documentGeneration then contextGeneration; both sides must be present.

| Order | Condition | reason | nextStep | Class / state override |
|---|---|---|---|---|
| 1 | Either argument not primitive string | invalid_input | CORRECT_FIXTURE | REJECTED / UNRESOLVED |
| 2 | Either string >1024 characters | input_too_large | CORRECT_FIXTURE | REJECTED / UNRESOLVED |
| 3 | Either malformed, noncanonical or outside schema | invalid_input | CORRECT_FIXTURE | REJECTED / UNRESOLVED |
| 4 | Either structurally valid version not 1 | unsupported_version | REVIEW_VERSION | REJECTED / UNRESOLVED |
| 5 | Either lifecycle cancelled | operator_cancelled | STOP | CANCELLED / CANCELLED |
| 6 | setupState uncertain | setup_uncertain | MANUAL_RECONCILIATION | SIMULATED_SETUP / UNCERTAIN |
| 7 | Either lifecycle interrupted | lifecycle_interrupted | FRESH_FIXTURE_CONTEXT | default |
| 8 | authentication not none | authentication_required | MANUAL_AUTH | default |
| 9 | page unknown | page_unknown | MANUAL_FIXTURE_PAGE | default |
| 10 | page not project-setup | wrong_fixture_page | MANUAL_FIXTURE_PAGE | default |
| 11 | Missing document generation | document_generation_missing | FRESH_FIXTURE_CONTEXT | default |
| 12 | Unequal document generations | document_generation_mismatch | FRESH_FIXTURE_CONTEXT | default |
| 13 | Missing context generation | context_generation_missing | FRESH_FIXTURE_CONTEXT | default |
| 14 | Unequal context generations | context_generation_mismatch | FRESH_FIXTURE_CONTEXT | default |
| 15 | Equal sequence | duplicate_observation | FRESH_FIXTURE_CONTEXT | default |
| 16 | Observation sequence < request sequence | delayed_observation | FRESH_FIXTURE_CONTEXT | default |
| 17 | Observation sequence > request sequence + 1 | observation_gap | FRESH_FIXTURE_CONTEXT | default |
| 18 | Any missing project/environment token | target_missing | MANUAL_FIXTURE_TARGET | default |
| 19 | Unequal project or environment tokens | target_mismatch | MANUAL_FIXTURE_TARGET | default |
| 20 | Matching tokens other than project001/production001 | fixture_target_mismatch | MANUAL_FIXTURE_TARGET | default |
| 21 | Either mode null | mode_missing | MANUAL_SUBSCRIPTION | default |
| 22 | Modes disagree | mode_mismatch | MANUAL_SUBSCRIPTION | default |
| 23 | Either reference placeholder absent | reference_placeholder_missing | MANUAL_SUBSCRIPTION | default |
| 24 | evidence not complete | evidence_unresolved | MANUAL_FIXTURE_PAGE | default |
| 25 | setupState unknown | setup_unknown | MANUAL_RECONCILIATION | default |
| 26 | review not reviewed with state other than not_submitted | review_outcome_conflict | MANUAL_RECONCILIATION | default |
| 27 | review declined | review_declined | STOP | MANUAL_REVIEW / DECLINED |
| 28 | review pending | creation_review_required | MANUAL_PROJECT_REVIEW | MANUAL_REVIEW / AWAITING_REVIEW |
| 29 | reviewed + not_submitted | synthetic_review_recorded | MANUAL_PROJECT_REVIEW | SIMULATED_SETUP / REVIEWED |
| 30 | reviewed + submitted | synthetic_submitted | MANUAL_SETUP_OBSERVATION | SIMULATED_SETUP / SUBMITTED |
| 31 | reviewed + pending | synthetic_pending | MANUAL_SETUP_OBSERVATION | SIMULATED_SETUP / PENDING |
| 32 | reviewed + failed | synthetic_failed | MANUAL_FAILURE_REVIEW | SIMULATED_SETUP / FAILED |

All next steps are manual diagnostic codes, never an instruction to execute a
provider operation. Cancellation wins diagnosis but does not reconcile any
possible prior effect. Explicit uncertainty outranks other operational evidence;
malformed/version rejection never licenses retry or discards an external record.
Reported submitted/pending outcomes with inconsistent context remain unresolved,
never verified. Neither `reviewed` nor manual inspection grants approval.

### Stateless limits

This evaluator cannot authenticate any input, observe a real project, latch
cancellation, retain uncertainty across calls, detect unreported events or prevent
identical-input replay. A later supplied clean pair returns the same diagnostic
as before cancellation/uncertainty. Sequence/generation comparisons concern only
the two supplied envelopes, not actual elapsed time, browser freshness or history.
No browser/DOM/network/provider/storage/timer/dynamic-execution capability exists.

## Implementation and verification plan

Ruling: the user's explicit implementation request and nine-file allowlist govern
this workflow. Contract and plan live here; no extra plan file, approval round,
worktree, staging or commits. Use local native Node tests; no external research is
needed to define this invented offline contract.

- [x] Write behavior tests for all table rows, both modes and hostile input.
- [x] Add an inert exported evaluator shell and record genuine assertion RED.
- [x] Implement the standalone evaluator, then record GREEN with unchanged tests.
- [x] Run focused, full, separate accepted isolation and both syntax checks.
- [x] Append five tracking records; verify exact nine paths, unchanged prefixes,
  accepted bytes, refs/indexes/worktrees, Markdown links and formatting.
- [x] Stop for independent ChatGPT review; do not begin 15.02.

Evidence baseline: `/tmp/phase15-01-s31ytlzk/` (temporary, may expire):
221 tracked extension hashes, five original documents, 42 refs, 53 captured
Git metadata hashes including three indexes, three worktree identities.
Historical 35→24 refs, sibling-index drift and cross-turn ref continuity remain
UNVERIFIED; no repair, attribution or protected-content inspection.

## Behavioral evidence and acceptance coverage

Native Node **v24.19.0**. Unchanged baseline: **2322/2322 PASS**, exit 0.
35 new tests (S01–S31, with mode/generation variants) cover all 32 precedence
rows / 31 distinct reasons. Every behavioral assertion checks the exact flat
schema, SIMULATED markers, bounded sanitized output and all 17 false flags.

| Required behavior | Tests |
|---|---|
| Customer and partner trial; presence without reference values | S01–S04, S25 |
| Project/environment/page agreement including equal missing values | S05–S08 |
| Generation continuity; duplicate/delayed/gapped observation | S09–S10 |
| Cancel, lifecycle, login/MFA/CAPTCHA/session loss | S11–S14 |
| Unknown/conflicting/ambiguous evidence and uncertain setup | S14–S16 |
| Manual review, reviewed/submitted/pending/failed; no created state | S01–S02, S17, S25 |
| Unsupported version, malformed/noncanonical, closed schema/limits | S18–S24 |
| Hostile objects, revoked proxies, accessors without coercion | S19, S31 |
| Validation/operational precedence | S26–S27 |
| Stateless replay, immutable results, permanent false authority | S28–S30 |
| No imports, dependency/caller additions or external capabilities | S31 plus accepted A34/G25/D32/I36 |

Tests were written before the inert exported function shell. Initial run:
35 failures, exit 1; 34 assertion failures and one undefined-result property
TypeError in the VM sentinel check. Before implementation, that assertion was
made null-safe, and the coverage-count expectation was corrected to 31 unique
reasons (32 table rows share invalid_input). Retained both logs. The definitive
behavioral RED run: **35 tests / 0 pass / 35 ERR_ASSERTION failures**, exit **1**;
no missing module or syntax failure. Implementation then passed those exact,
byte-identical tests: **35/35 GREEN**, exit **0**. No accepted code was altered
or deliberately broken. Saved RED source/test snapshots support reproduction.

| Command/run | Exit | Tests / passed / failed / skipped / cancelled / todo |
|---|---|---|
| Unchanged full baseline | 0 | 2322 / 2322 / 0 / 0 / 0 / 0 |
| Definitive behavioral RED | 1 | 35 / 0 / 35 / 0 / 0 / 0 |
| New focused GREEN | 0 | 35 / 35 / 0 / 0 / 0 / 0 |
| Requested combined focused | 0 | 225 / 225 / 0 / 0 / 0 / 0 |
| Final full suite | 0 | 2357 / 2357 / 0 / 0 / 0 / 0 |
| Initial separate isolation subset | 0 | 13 / 13 / 0 / 0 / 0 / 0 |
| Complete accepted isolation selection | 0 | 15 / 15 / 0 / 0 / 0 / 0 |
| Source syntax | 0 | no test count |
| Test syntax | 0 | no test count |

The combined count includes five HTML fixture tests; it is not the narrower
14.04 focused selection. Full suite is exactly accepted 2322 + new 35 = 2357.
The initial isolation selection omitted branch/deploy-key files; the complete
15-test selection below includes both and passes. No failure was hidden.

Commands run from `Sh_Project_Setup_extension`:

```bash
node --test test/odoo-sh-project-setup-fixture-flow.test.mjs
node --test test/odoo-sh-fixtures.test.mjs test/odoo-sh-page-recognition.test.mjs test/odoo-sh-unknown-page-fallback.test.mjs test/interaction-context-guards.test.mjs test/interaction-dom-primitives.test.mjs test/interaction-interruption-policy.test.mjs test/interaction-approval-timeout-uncertainty.test.mjs test/odoo-sh-project-setup-fixture-flow.test.mjs
node --test test/*.test.mjs
node --test --test-name-pattern='A34|U18|G25|D32|I36|source.*(import|capabilit|caller)|standalone.*(import|capabilit|caller)|controller has no imports|import-free|isolated source|planner only imports' test/branch-creation-plan.test.mjs test/deploy-key-handoff.test.mjs test/github-api-error-fixtures.test.mjs test/github-permission-reader.test.mjs test/github-repository-create-preview.test.mjs test/github-repository-discovery.test.mjs test/github-sandbox-write-approval-fixtures.test.mjs test/interaction-context-guards.test.mjs test/interaction-dom-primitives.test.mjs test/interaction-interruption-policy.test.mjs test/odoo-sh-page-recognition.test.mjs test/odoo-sh-unknown-page-fallback.test.mjs test/read-only-admission.test.mjs test/submodule-structure.test.mjs test/utilities-plan.test.mjs
node --check src/odoo-sh/project-setup-fixture-flow.mjs
node --check test/odoo-sh-project-setup-fixture-flow.test.mjs
```

Evidence directory `/tmp/phase15-01-s31ytlzk/`: `baseline-tests.log`, `red.log`,
`red-assertions.log`, `red-source.mjs`, `red-test.mjs`, `green.log`, `focused.log`,
`full.log`, `isolation.log`, `isolation-complete.log`, `syntax-source.log`,
`syntax-test.log`, `runs.json`, `baseline.json` and five baseline documents.
Temporary evidence can expire; repository report text preserves measured counts.
An initial skill-read command referenced a nonexistent path (exit 1); the proper
skill files were then read. Python alias was unavailable (exit 127); snapshot
creation succeeded using Python3 before repository edits. Neither setup error
counts as behavioral RED. WarpGrep discovery returned no tool; local rg was used.

## Exact nine-file inventory

Create:

1. [Fixture evaluator](../../../src/odoo-sh/project-setup-fixture-flow.mjs).
2. [Native tests](../../../test/odoo-sh-project-setup-fixture-flow.test.mjs).
3. [Phase 15 parent](PHASE_15.md).
4. This [Phase 15.01 report](PHASE_15_01.md).

Append only:

5. [Project status](../../00_PROJECT_STATUS.md).
6. [Changelog](../../03_CHANGELOG.md).
7. [Test evidence](../../04_TEST_EVIDENCE.md).
8. [Blockers and decisions](../../05_BLOCKERS_AND_DECISIONS.md).
9. [Handoff](../../06_HANDOFF.md).

Skills used: Ponytail; Superpowers using-superpowers, brainstorming scope review,
writing-plans, test-driven-development, executing-plans,
verification-before-completion and requesting-code-review. The explicit task
and allowlist override extra plan/worktree/commit/approval workflow defaults.
Tools used: functions exec/exec_command/write_stdin, local shell, Python3, rg,
read-only Git and Node; one read-only collaboration code reviewer. No external
service MCP, browser-control or web research. These checks cannot establish
independently observed real-site evidence.

## Final measured preservation and internal review

`python3 /tmp/phase15-01-s31ytlzk/audit.py` exits **0**. Exactly **9 authorized
paths: 4 new and 5 append-only**. All five historical documentation byte prefixes
are identical; **216 other pre-existing extension files**, including all **85
accepted source/test files**, retain SHA-256. Accepted fixtures, contracts,
policies, adapters, permissions and dependencies are unchanged. The final test
file remains byte-identical to the definitive behavioral RED test snapshot.

All **42 original/current refs**, **3 raw indexes**, **53 captured non-object Git
metadata files** (hashes, inventory, device/inode, size and mtime), and **3 worktree
identities** (registration, root device/inode, branch/HEAD, linked .git pointers)
are preserved. No new observation-window exception. Staging remains empty;
HEAD/upstream, root, branch and both origin URLs still match the preflight.

| Worktree under `/home/https_ali_muhammed/Plementus/` | Branch | HEAD |
|---|---|---|
| Tools | feature/sh-project-setup-extension | 390c9ea7c311f362ea04aad64ed14569161642ec |
| Tools-Smart-Editor-Guard | feature/odoo_website_smart_editor_guard | 9a818495593c87ef6d4a1376e7f81be26513e0b5 |
| Tools-sh-project-setup-extension-clean | feature/sh-project-setup-extension-clean | 16bb67ca0d85ddba84c6f4847c094690621183ce |

All **25 authored local Markdown links** resolve; authored UTF-8/LF/final-newline,
trailing-whitespace, paired-fence and scoped `git diff --check` pass. Audit script
and `audit.json` remain beside the logs. No protected .idea contents or sibling
source documents were read, hashed, modified or staged. Git objects, uncaptured
metadata and live remote freshness were not checked. Historical reference/index
and cross-turn discrepancies remain **UNVERIFIED**, without repair or attribution.

A fresh internal read-only reviewer compared implementation/tests to all 32
contract rows and the existing inert fixture/isolation restrictions, independently
ran **35/35**, exit **0**, and found **no critical, important or minor findings**.
It did not repeat the root-owned full suite, isolation runs or preservation audit.
Ruling: authenticated input, real observation and durable cancellation/uncertainty/
replay enforcement are explicit missing capabilities, not claims from this pure
fixture contract. Later connected provisioning needs separate authorization and
must preserve accepted isolation. Internal AI review is not independent ChatGPT
acceptance or publication authorization.

**PHASE 15.01: READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Official progress **49/72** pending ChatGPT review and GitHub publication;
**5/20 fully accepted master phases**. Phase 15 **IN_PROGRESS / NOT ACCEPTED**.
Phase 14 and Phase 13 fixture-only exits **PASS**, live capabilities **PENDING**.
Phase 10.03 **BLOCKED / NOT AUTHORIZED**. Historical Git discrepancies
**UNVERIFIED**. Production **NO_GO**.
**STOP for independent ChatGPT review. No staging, commit, push or Phase 15.02.**
