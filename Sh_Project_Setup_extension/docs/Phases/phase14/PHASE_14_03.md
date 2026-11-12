# Phase 14.03 — Offline interruption policy

2026-11-12 (Africa/Cairo). **FIXTURE_ONLY / NO EXECUTION AUTHORITY**.
Contract and plan recorded before tests and implementation logic.

## Baseline and supplied acceptance

The user records [Phase 14.02](PHASE_14_02.md) **ACCEPTED/PUBLISHED** at
`dc6bb93b943cb396d2f117b1c8f1280bf224d253`. Read-only preflight confirms the
required root, branch, origin fetch/push and HEAD/recorded upstream. No remote
freshness claim; no fetch. Staging and extension status were empty. Git reports
the pre-existing protected `.idea/plemo-chats.xml` modification; its contents and
metadata are not inspected or changed. No sibling source contents are accessed.

Initial prospective snapshot: 216 tracked extension files, 40 refs, three raw
indexes, 69 captured non-object Git metadata files and three worktree identities.
Historical 35→24 refs, sibling-index drift and cross-turn Codex ref differences
remain **UNVERIFIED**; today's ref count does not establish historical continuity.
No repair or attribution. Historical documentation is preserved verbatim.

## Canonical v1 wire contract

Export only `assessFixtureInterruption(stateText, eventText)` from
[the new policy](../../../src/interaction/interruption-policy.mjs).
Pure, synchronous and deterministic; no imports or runtime consumers. Neither
input is a guard/recognizer/preview output or proof of a trusted browser actor.
No accepted module's parser, catalog or implementation is copied.

Both arguments must be primitive strings, each **1–1024 printable ASCII
characters** (combined maximum 2048); types precede length checks and no caller
hooks are accessed. Before semantics, both envelopes must equal `JSON.stringify`
of their parsed plain records with exactly the ordered fields below. Reject
duplicate/extra/missing/reordered keys, whitespace, alternative escapes or number
spellings, controls, non-ASCII, nesting and arrays. All fields are required.

State ordered fields:
`version,tabSlot,originToken,documentGeneration,contextGeneration,workerGeneration,projectSlot,branchSlot,sequence,lifecycle,writeStatus`.

Event ordered fields:
`version,tabSlot,originToken,documentGeneration,contextGeneration,workerGeneration,projectSlot,branchSlot,sequence,lifecycle,navigation,authentication,dialog,evidence,writeStatus`.

| Field | Exact type and closed vocabulary |
|---|---|
| version | Integer 1–999; only 1 supported in both envelopes |
| tabSlot, projectSlot, branchSlot | Integer 1–3 or null |
| originToken | `toy-origin-a`, `toy-origin-b`, or null; invented labels, no URLs |
| documentGeneration, contextGeneration, workerGeneration | Integer 1–1000000 or null |
| sequence | State integer 0–1000000; event integer 1–1000000 |
| lifecycle | `active`, `cancelled`, `context_lost`, `session_lost`, `worker_suspended`, `worker_restarted`, `worker_resumed`, `browser_restarted` |
| navigation | Event only: `none`, `same_document_observation`, `same_document_navigation`, `reload`, `document_replaced`, `unexpected`, `cross_origin`, `tab_closed`, `tab_replaced`, `unknown`, `conflicting` |
| authentication | Event only: `none`, `login_required`, `session_expired`, `mfa`, `captcha`, `conflicting` |
| dialog | Event only: `none`, `unexpected`, `unsupported`, `conflicting` |
| evidence | Event only: `complete`, `missing`, `ambiguous`, `unknown_page`, `unknown_interruption`, `conflicting` |
| writeStatus | `none` or `possible_unresolved`; untrusted possibility, never confirmation |

Versions are checked only after all shape checks across both inputs. A valid
future version always rejects; no version downgrade, alternate parser, inference
or fallback. Invalid versions such as 0, strings or fractions are invalid shape.
Missing identities/generations use null explicitly; equal nulls never match.
No account names, credentials, page/dialog text or actual provider identifiers.

## Fixed result and first-applicable precedence

Every return is a fresh frozen plain record of flat primitives, therefore deeply
frozen; printable ASCII JSON ≤2048 characters. Exact ordered keys:
`version,resultClass,reason,evidenceTier,provenance,fixtureOnly,nextStep`, followed
by these 17 flags, always false in this order:
`browserObserved,permissionVerified,accountVerified,rightsVerified,subscriptionVerified,approvalGranted,executionAuthorized,mutationAuthorized,installationAuthorized,trustedContinuingContext,associationVerified,productionDatabaseVerified,stagingCopyVerified,moduleInstalled,effectsApplied,readAuthorized,writeAuthorized`.
Version is 1; evidenceTier `SIMULATED`, provenance `SYNTHETIC_UNTRUSTED`, fixtureOnly
true. No input echoes, arbitrary error/reason, approval, allowed, executed or
resume-authority field. Class enum: `REJECTED`, `CANCELLED`, `MANUAL_REVIEW`,
`SYNTHETIC_DIAGNOSTIC`. Reason/nextStep are exactly the literals in this table.

First applicable row wins; rows containing lists use their written order.
All unspecified classes below are MANUAL_REVIEW.

| Order | Condition | reason / nextStep / special class |
|---|---|---|
| 1 | Any argument not primitive string | invalid_input / CORRECT_FIXTURE / REJECTED |
| 2 | Either length >1024 | input_too_large / CORRECT_FIXTURE / REJECTED |
| 3 | Either canonical/closed shape invalid | invalid_input / CORRECT_FIXTURE / REJECTED |
| 4 | Either version not 1 | unsupported_version / REVIEW_VERSION / REJECTED |
| 5 | Either lifecycle cancelled | operator_cancelled / STOP / CANCELLED |
| 6 | Either writeStatus possible_unresolved | possible_write_unresolved / MANUAL_RECONCILIATION |
| 7 | Either lifecycle context_lost, session_lost, worker_suspended, worker_restarted, worker_resumed, browser_restarted (in that order, across both inputs) | corresponding lifecycle literal / FRESH_SELECTION |
| 8 | Either workerGeneration null or unequal | worker_context_mismatch / FRESH_SELECTION |
| 9 | Authentication mfa, captcha, login_required, session_expired, conflicting | mfa_required, captcha_required, login_required, session_expired, authentication_conflict respectively / MANUAL_AUTH |
| 10 | Dialog unexpected, unsupported, conflicting | unexpected_dialog, unsupported_dialog, dialog_conflict respectively / MANUAL_DIALOG |
| 11 | Navigation tab_closed, tab_replaced | tab_closed, tab_replaced respectively / FRESH_SELECTION |
| 12 | Either tabSlot null, then unequal | selection_missing, tab_mismatch respectively / FRESH_SELECTION |
| 13 | Either originToken null, then unequal or cross_origin navigation | origin_missing, cross_origin respectively / FRESH_SELECTION |
| 14 | Navigation reload, document_replaced, unexpected, same_document_navigation, unknown, conflicting | document_reload, document_replaced, unexpected_navigation, same_document_navigation, navigation_unknown, navigation_conflict respectively / FRESH_SELECTION |
| 15 | Either documentGeneration null, then unequal | document_generation_missing, document_generation_mismatch respectively / FRESH_SELECTION |
| 16 | Either contextGeneration null, then unequal | context_generation_missing, context_generation_mismatch respectively / FRESH_SELECTION |
| 17 | Event sequence equal, lower, or greater than state sequence + 1 | duplicate_observation, delayed_observation, observation_gap respectively / FRESH_SELECTION |
| 18 | Any projectSlot/branchSlot null, then any unequal | target_missing, target_mismatch respectively / MANUAL_TARGET |
| 19 | Evidence missing, ambiguous, unknown_page, unknown_interruption, conflicting | evidence_missing, evidence_ambiguous, page_unknown, interruption_unknown, interruption_conflict respectively / MANUAL_PAGE |
| 20 | All comparisons match; navigation none or same_document_observation | synthetic_stable / REVIEW_FIXTURE / SYNTHETIC_DIAGNOSTIC |

These next steps mean only correct a fixture, review version support, stop,
freshly select/review, handle auth/dialog/target/page manually, manually reconcile
a possible write, or review a synthetic diagnostic. They never schedule anything.
Cancellation wins even over possible-write uncertainty: STOP does not clear that
possibility or resolve any write; no later retry is licensed. Otherwise possible
unresolved write takes priority over loss/auth/dialogs so fresh selection alone
cannot appear sufficient. Every other auth/dialog classification is human-only.

Reported same-document navigation always invalidates. `same_document_observation`
means a supplied observation with no reported navigation/interruption; it cannot
detect route/account changes. Even identical synthetic tab IDs cannot bypass a
reported suspension/restart/resumption or worker-generation mismatch. Document
and context comparisons reject older and newer generations equally; sequence
comparison diagnoses only the supplied pair, with no clock or durable history.

## Scope, plan and review focus

Only this report, the module and [new native Node tests](../../../test/interaction-interruption-policy.test.mjs)
are created. Append only to [Phase 14](PHASE_14.md), [status](../../00_PROJECT_STATUS.md),
[changelog](../../03_CHANGELOG.md), [evidence](../../04_TEST_EVIDENCE.md),
[decisions](../../05_BLOCKERS_AND_DECISIONS.md), [handoff](../../06_HANDOFF.md).
No callers, config, shared exports, fixture files, dependencies or permissions.
Source isolation A34/G25/D32 was inspected before implementation; the sole
recognizer consumer stays the accepted context guard and the preview has none.

- [x] Write executable behavior/security/precedence tests, then inert export;
  capture behavioral ERR_ASSERTION RED, not missing-import failure.
- [x] Implement only canonical validation and table checks; capture GREEN.
- [x] Run requested focused/full/syntax and accepted isolation checks.
- [x] Append actual counts; audit nine files, six historical prefixes, unchanged
  accepted sources/tests, links/formatting and refs/indexes/worktree identities.

Review focus: competing failures across both envelopes, null identity equality,
reported navigation despite unchanged IDs, future versions despite other failures,
restart despite stable tab, hostile transports/proxies, and possible-write priority.
The user's explicit implementation request, contract-choice delegation, nine-file
allowlist and no-Git-mutation rule override skill-default extra design/plan files,
approval rounds, worktree creation and commits. Work proceeds in the designated
existing linked worktree; final independent ChatGPT review remains mandatory.

## Limits and gates

A stateless policy cannot latch cancellation, detect unreported events, authenticate
supplied actors, prevent replay of identical old inputs or maintain a durable
sequence. Changing supplied state can hide a prior restart/cancellation/write
possibility. Stable output proves neither real continuity nor resolution of an
interruption. No result grants approval to resume actual interaction.

No browser/DOM/provider/network/storage/logging/timer access, Chrome listeners,
click/fill/navigation, authentication/dialog dismissal, persistent state, approval,
retry, write execution or authoritative reconciliation. Phase 14.04 separately
addresses approval, timeout and uncertain-write states; no 14.04 work begins here.

Official progress **47/72 accepted; 5/20 master phases**, pending independent
acceptance/publication of 14.03. Phase 14 **IN_PROGRESS / NOT ACCEPTED**. Phase 13
fixture-only exit **PASS**, live capability **PENDING**. Phase 10.03 **BLOCKED /
NOT AUTHORIZED**. Historical Git discrepancies **UNVERIFIED**. Production **NO_GO**.


## Implementation, behavioral RED/GREEN and verification

**PHASE 14.03: READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY.**
The documented contract and precedence remain unchanged. No accepted-contract
conflict occurred; no accepted source or test changed. The independent module
validates both envelopes before classifying one supplied pair. All 17 flags
remain false, including the diagnostic result. No runtime consumers were added.

Tests were written before the inert exported stub and implementation logic.
The exact requested policy command against that stub exited **1: 36 tests,
0 passed, 36 failed**; all 36 failures were **ERR_ASSERTION**, not imports,
startup errors or manufactured accepted-source defects. Minimal implementation
then passed **36/36**, exit 0 (`green-initial.log`, TAP reporter).

An additional hostile-input review found that checking dictionary membership
before checking the enum scalar's type could coerce a parsed object containing
noncallable `toString`/`valueOf` properties and throw. I37 was added before the
fix. Its isolated run exited **1: 0/1 passed**, ERR_ASSERTION from doesNotThrow,
with the underlying property-key-coercion TypeError reproduced at the lookup.
The sole fix moves string validation ahead of all enum dictionary lookups;
contract/precedence unchanged. Regression GREEN **37/37**, exit 0. No accepted
test was amended. This second RED/GREEN is recorded separately from initial RED.

| Final command / run | Exit | Tests / passed / failed / skipped / cancelled / todo |
|---|---|---|
| `node --test test/interaction-interruption-policy.test.mjs` | 0 | 37 / 37 / 0 / 0 / 0 / 0 |
| `node --test test/odoo-sh-page-recognition.test.mjs test/odoo-sh-unknown-page-fallback.test.mjs test/interaction-context-guards.test.mjs test/interaction-dom-primitives.test.mjs test/interaction-interruption-policy.test.mjs` | 0 | 153 / 153 / 0 / 0 / 0 / 0 |
| `node --test test/*.test.mjs` | 0 | 2290 / 2290 / 0 / 0 / 0 / 0 |
| Targeted accepted/new isolation command below | 0 | 15 / 15 / 0 / 0 / 0 / 0 |
| `node --check src/interaction/interruption-policy.mjs` | 0 | Syntax accepted; no tests |
| `node --check test/interaction-interruption-policy.test.mjs` | 0 | Syntax accepted; no tests |

All commands ran from the extension directory. The full run supplied the shell
wildcard's sorted native test-file list to Node, preserving the requested scope.
The accepted **2253/2253** full baseline remains passing, plus **37** new tests.
No browser, site, provider or external-service validation ran.

Exact targeted isolation command:

```bash
node --test --test-name-pattern='A34|U18|G25|D32|I36|source.*(import|capabilit|caller)|standalone.*(import|capabilit|caller)|controller has no imports|import-free|isolated source|planner only imports' \
  test/branch-creation-plan.test.mjs \
  test/deploy-key-handoff.test.mjs \
  test/github-api-error-fixtures.test.mjs \
  test/github-permission-reader.test.mjs \
  test/github-repository-create-preview.test.mjs \
  test/github-repository-discovery.test.mjs \
  test/github-sandbox-write-approval-fixtures.test.mjs \
  test/interaction-context-guards.test.mjs \
  test/interaction-dom-primitives.test.mjs \
  test/interaction-interruption-policy.test.mjs \
  test/odoo-sh-page-recognition.test.mjs \
  test/odoo-sh-unknown-page-fallback.test.mjs \
  test/read-only-admission.test.mjs \
  test/submodule-structure.test.mjs \
  test/utilities-plan.test.mjs
```

A34, G25 and D32 are unchanged and passing. I36 statically excludes imports,
accepted recognizer/preview references, runtime consumers and capability names;
then evaluates the actual source from initialization through every recorded
primitive-string scenario with string/WASM generation disabled and throwing
browser/DOM/storage/network/process/logging/timer/evaluation sentinels. Revoked
nonprimitive proxies also reject. Observed capability accesses: **zero**.
VM evaluation is local test infrastructure only, absent from production source.

I01–I20 cover the interruption scenarios and explicit manual next steps;
I21–I29 cover versions, hostile transport/closed shapes/scalars/enums/bounds;
I30–I33 pin competing-condition precedence; I34 demonstrates immutable fresh
outputs and replay after cancellation/restart/possible-write hints; I35 checks
recorded output flags/sanitization; I36 enforces source/capability isolation;
I37 covers the coercion regression. Every behavioral helper checks the exact
flat output schema, 17 false flags, ASCII bound and freeze.

An internal read-only reviewer found **no Critical, Important or Minor findings**,
reran **37/37** tests and reported 160 extra malformed-field/bounded-nesting
checks without throws. Those extra checks are reviewer diagnostics, not added to
the official native-suite counts. It deferred broad verification/preservation
and historical claims to this root audit. Ruling: real behavior/acceptance and
concealed prior events remain outside this stateless fixture policy, exactly as
specified; they cannot be inferred from its outputs. Internal review is neither
independent ChatGPT acceptance nor publication.

## Nine-file inventory and preservation

Three new files:

- [Interruption policy](../../../src/interaction/interruption-policy.mjs).
- [Native behavior/isolation tests](../../../test/interaction-interruption-policy.test.mjs).
- This Phase 14.03 report.

Six append-only files:

- [Phase 14 parent](PHASE_14.md).
- [Project status](../../00_PROJECT_STATUS.md).
- [Changelog](../../03_CHANGELOG.md).
- [Test evidence](../../04_TEST_EVIDENCE.md).
- [Blockers and decisions](../../05_BLOCKERS_AND_DECISIONS.md).
- [Handoff](../../06_HANDOFF.md).

Final measured preservation results are recorded below after tracking appends.
The observation window cannot establish the historical 35→24 reference sequence,
sibling-index drift or cross-turn Codex ref continuity; all remain UNVERIFIED.
Git objects, uncaptured metadata, remote freshness, protected IDE contents and
sibling source bytes are not verified. No protected content is read/hashed,
modified/staged/restored; no preservation exception is repaired or attributed.

Skills actually used: Ponytail; Superpowers using-superpowers, brainstorming,
writing-plans/executing-plans adapted to explicit scope, test-driven-development,
systematic-debugging, requesting-code-review and verification-before-completion.
Tools: functions exec/exec_command/write_stdin/apply_patch, shell, read-only Git,
Python3, Node, and one read-only collaboration reviewer. No browser control,
external-service MCP or web research. WarpGrep/Valyu were unavailable in the
searched tool inventory; authoritative local contracts sufficed.

Temporary local evidence: `/tmp/phase14-03-xfkx9zmj/`, containing baseline JSON,
six original prefixes, initial RED/GREEN logs, coercion-regression RED/GREEN logs,
final policy/focused/full/isolation/syntax logs and preservation audit artifacts.
Temporary files may expire; this report retains the measured results.


## Final measured audit and handoff

Preservation audit exit **0**: exactly **nine authorized paths**, three new and
six append-only. All **six original document prefixes** are byte-identical;
**210 other tracked extension files** retain SHA-256, including all **82**
pre-existing source/test files, accepted recognizer/guard/preview, A34/G25/D32,
Phase 14.01/14.02 reports, master plan, contracts, security policy, manifest,
adapters, dependencies and README. No accepted-source or accepted-test edits.
All new local Markdown links resolve; authored UTF-8/LF/final newlines,
trailing-whitespace, paired fences and scoped `git diff --check` pass.

All **40 original refs** retain values; **40 current**, no additions/removals.
All **three raw indexes** and **69 captured non-object Git metadata files**
retain SHA-256, device/inode, size and mtime. Three linked-worktree registrations
and recorded HEADs, required root/branch/origin/HEAD/upstream identity and empty
staging are preserved. No observation-window preservation exception is observed.
Existing protected IDE exception is left untouched. No claim about historical
continuity, protected IDE bytes, sibling source bytes or uncaptured metadata.

**PHASE 14.03: READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY.** Official progress remains
**47/72 accepted; 5/20 master phases** pending independent acceptance/publication.
Phase 14 **IN_PROGRESS / NOT ACCEPTED**. Phase 13 fixture-only exit **PASS**, live
capability **PENDING**. Phase 10.03 **BLOCKED / NOT AUTHORIZED**. Historical Git
discrepancies **UNVERIFIED**. Production **NO_GO**. Stateless cancellation,
unreported-event and identical-input replay limitations remain explicit above.
No staging, commit, push, real interaction or Phase 14.04 work.
**STOP for independent ChatGPT review.**
