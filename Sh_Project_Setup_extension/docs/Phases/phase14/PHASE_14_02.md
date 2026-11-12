# Phase 14.02 — Bounded synthetic DOM interaction previews

2026-11-12 (Africa/Cairo). Scope: **FIXTURE_ONLY / PREVIEW_ONLY**.
Implementation and verification are pending at contract-writing time.

## Baseline and dated reconciliation

The user's supplied acceptance/publication makes [Phase 14.01-R1](PHASE_14_01.md)
**ACCEPTED/PUBLISHED** at `19836e673ec706483a291377c29458141be54354`.
Read-only preflight confirms required root, branch, origin fetch/push URLs and
HEAD/recorded upstream match; extension status and staged inventory are empty.
No fetch or remote freshness check. Acceptance is supplied, not inferred from Git.
Historical BLOCKED and R1 review records remain verbatim; this dated record and
append-only tracking updates reconcile their later status.

Official progress **46/72 accepted; 5/20 master phases**. Phase 14 remains
**IN_PROGRESS / NOT ACCEPTED**; Phase 13 fixture-only exit **PASS**, live capability
**PENDING**; Phase 10.03 **BLOCKED / NOT AUTHORIZED**; production **NO_GO**.
Historical 35→24 refs, sibling-index drift and cross-turn Codex ref changes remain
**UNVERIFIED**. No repair or attribution.

## Exact v1 wire contract — documented before implementation logic

Export only `previewFixtureDomInteraction(contextText, snapshotText, intentText)`
from [the primitive](../../../src/interaction/dom-primitives.mjs). Three primitive
strings only; no coercion or access to caller object hooks. Context limit **2048**,
snapshot **4096**, intent **512** ASCII characters; each nonempty, combined maximum
**6656**. Reject overflows before parsing. Each must equal `JSON.stringify` of its
parsed value with the exact key order below. Reject whitespace, escapes with an
alternative canonical spelling, duplicate/missing/extra keys, non-ASCII, controls,
alternative number spelling and arbitrary nesting. All keys are required.
Version fields are integers 1–999; only 1 is supported. Generations are integers
1–1000000, target slots integers 1–3; no null generations or targets.

### Context: inert serialized Phase 14.01 guard result

Exact ordered fields: `version,resultClass,reason,recognizerReason,evidenceTier,`
`provenance,fixtureOnly,nextStep`, then the 17 flags listed below, in that order.
`evidenceTier=SIMULATED`, `provenance=SYNTHETIC_UNTRUSTED`, `fixtureOnly=true`,
all 17 flags strictly false. Class enum: `SYNTHETIC_CONTEXT_MATCH`, `MANUAL_REVIEW`,
`REJECTED`, `CANCELLED`. Next-step enum: `CORRECT_FIXTURE`, `REVIEW_VERSION`,
`STOP`, `FRESH_SELECTION`, `MANUAL_TARGET`, `MANUAL_ACCOUNT`, `MANUAL_ACCESS`,
`MANUAL_AUTH`, `MANUAL_PAGE`, `REVIEW_FIXTURE`.

Reason enum is the union of the accepted guard's literal output reasons:
`invalid_input`, `input_too_large`, `unsupported_binding_version`,
`unsupported_contract_version`, `unsupported_fixture_version`, `operator_cancelled`,
`unsupported_site`, `selection_conflict`, `selection_missing`, `permission_denied`,
`permission_unavailable`, `context_lost`, `context_restarted`, `unexpected_navigation`,
`source_context_missing`, `tab_mismatch`, `document_context_missing`, `stale_generation`,
`duplicate_marker`, `interruption_conflict`, `page_conflict`, `unsupported_marker`,
`target_conflict`, `mfa_required`, `captcha_required`, `login_required`, `page_unknown`,
`target_context_missing`, `binding_selection_missing`, `binding_tab_mismatch`,
`binding_origin_mismatch`, `binding_generation_missing`, `binding_generation_stale`,
`binding_target_mismatch`, `account_context_conflicting`, `account_context_unavailable`,
`account_context_drift`, `account_continuity_unknown`, `binding_permission_denied`,
`binding_permission_unavailable`, `operation_rights_denied`, `operation_rights_unavailable`,
`synthetic_context_match`. `recognizerReason` admits this same bounded reason union
plus `NOT_ASSESSED` and `fixture_page_match`. This is inert validation of reason
tokens, not a recognizer or a duplicated page/marker catalog.

Only the exact tuple `SYNTHETIC_CONTEXT_MATCH / synthetic_context_match /
fixture_page_match / REVIEW_FIXTURE` passes the context gate. Other admitted
combinations cannot succeed, even contradictory class/reason tuples. Unknown
classes such as FAILED/UNCERTAIN reject as invalid input. Negative reason details
are never copied into output. Nonmatching context routes MANUAL_AUTH if either
reason indicates login/MFA/CAPTCHA or nextStep is MANUAL_AUTH; cancellation routes
STOP; all other nonmatches require FRESH_SELECTION.

**Limit:** the accepted guard result has no target/generation binding or identity.
It cannot authenticate a snapshot, intent, account, origin or continuing context.
Only agreement among caller-supplied snapshot/element/intent fields is assessed.
A forged matching guard result can describe a preview; it grants no authority.
No accepted binding or recognition schema is redesigned or extended.

### Snapshot: closed invented element inventory

Ordered fields: `version,documentGeneration,contextGeneration,projectSlot,branchSlot,`
`interruption,elements`. Interruption enum: `none`, `login`, `mfa`, `captcha`,
`unexpected_dialog`. Elements is an array of **0–8** records. Each record's exact
order: `token,kind,visible,enabled,documentGeneration,contextGeneration,projectSlot,`
`branchSlot`. Visibility/enabled are strict booleans. Kind enum: `button`, `input`,
`label`. All generations and target slots follow the bounds above.

Fixed local catalog: `toy:button-a` → button, `toy:input-a` → input,
`toy:label-a` → label. These are invented tokens, never actual Odoo.sh selectors.
Token syntax is `^toy:[a-z-]{1,16}$` (5–20 characters); a syntactically valid
uncataloged token anywhere in the inventory or intent requires manual selector
fallback. Arbitrary CSS, XPath, HTML, URLs, credentials and page text reject.
Duplicate tokens are retained as evidence of ambiguity; never choose the first.
Catalog/record/intent kind disagreement blocks. Unknown inventory entries cannot
be ignored merely because the requested element is known.

### Intent: one non-executing request

Ordered fields: `version,operation,token,expectedKind,documentGeneration,`
`contextGeneration,projectSlot,branchSlot,value`. Operation syntax is
`^[a-z_]{1,24}$`; supported enum: `inspect`, `click_preview`, `fill_preview`.
Other well-shaped operations reject as `unsupported_operation`.
Token, kind, generations and targets follow the snapshot rules.
`value` is null for inspect/click previews; fill admits only the invented values
`toy-value-a` or `toy-value-b`, not customer input. Invalid operation/value pair
rejects. Inspect supports every kind; click previews require button; fill previews
require input. No callbacks, handlers, actual interaction or external effects.

### Fixed output and validation precedence

Each result is a fresh frozen plain record containing flat primitives only, hence
deeply frozen. ASCII serialization ≤2048 characters. Exact ordered keys:
`version,resultClass,reason,evidenceTier,provenance,fixtureOnly,previewOnly,nextStep`,
followed by all 17 false flags: `browserObserved`, `permissionVerified`,
`accountVerified`, `rightsVerified`, `subscriptionVerified`, `approvalGranted`,
`executionAuthorized`, `mutationAuthorized`, `installationAuthorized`,
`trustedContinuingContext`, `associationVerified`, `productionDatabaseVerified`,
`stagingCopyVerified`, `moduleInstalled`, `effectsApplied`, `readAuthorized`,
`writeAuthorized`. Version is 1, evidence is SIMULATED/SYNTHETIC_UNTRUSTED,
fixtureOnly and previewOnly are true. No allowed/executed field, input echo,
operation/value/token/target, secret, arbitrary reason or raw error is returned.

First applicable row wins; shape checks cover all envelopes before semantics.

| Order | Predicate | Result class / reason / next step |
|---|---|---|
| 1 | Any nonprimitive string | REJECTED / invalid_input / CORRECT_FIXTURE |
| 2 | Any transport overflow | REJECTED / input_too_large / CORRECT_FIXTURE |
| 3 | Any invalid canonical JSON, key, scalar, enum or shape | REJECTED / invalid_input / CORRECT_FIXTURE |
| 4 | Any version other than 1 | REJECTED / unsupported_version / REVIEW_VERSION |
| 5 | Unknown operation | REJECTED / unsupported_operation / CORRECT_FIXTURE |
| 6 | Invalid operation/value pair | REJECTED / invalid_intent / CORRECT_FIXTURE |
| 7 | Nonmatching context | MANUAL_REVIEW / context_not_matching / MANUAL_AUTH, STOP or FRESH_SELECTION as above |
| 8 | Snapshot interruption other than none | MANUAL_REVIEW / manual_interruption / MANUAL_AUTH for login/MFA/CAPTCHA, otherwise MANUAL_DIALOG |
| 9 | Snapshot and intent document/context generations differ | MANUAL_REVIEW / stale_generation / FRESH_SELECTION |
| 10 | Snapshot and intent project/branch slots differ | MANUAL_REVIEW / target_mismatch / MANUAL_TARGET |
| 11 | Any uncataloged token in inventory or intent | MANUAL_REVIEW / unknown_element / MANUAL_SELECTOR |
| 12 | No exact requested token | MANUAL_REVIEW / element_missing / MANUAL_SELECTOR |
| 13 | Multiple exact requested tokens | MANUAL_REVIEW / element_ambiguous / MANUAL_SELECTOR |
| 14 | Matched element document/context differs from snapshot | MANUAL_REVIEW / stale_generation / FRESH_SELECTION |
| 15 | Matched element project/branch differs from snapshot | MANUAL_REVIEW / target_mismatch / MANUAL_TARGET |
| 16 | Matched element hidden | MANUAL_REVIEW / element_hidden / MANUAL_SELECTOR |
| 17 | Matched element disabled | MANUAL_REVIEW / element_disabled / MANUAL_SELECTOR |
| 18 | Catalog, element or expected kind disagree, or operation incompatible with kind | BLOCKED / kind_mismatch / CORRECT_FIXTURE |
| 19 | Valid inspect/click/fill preview | PREVIEW_READY / inspection_preview, click_preview or fill_preview respectively / REVIEW_FIXTURE |

All inventory records are shape-validated; continuity/visibility/kind are assessed
for the exactly-one requested element. Unrelated known elements can be hidden,
disabled or stale without being selected. Duplicate unrelated tokens do not choose
a requested-element winner. PREVIEW_READY describes only this synthetic input.
It never asserts a click, fill, provider write, independent verification or effect.

## Bounded implementation plan and scope

Only three new files: this report, the linked primitive and
[its tests](../../../test/interaction-dom-primitives.test.mjs). Append only to
[Phase 14](PHASE_14.md), [status](../../00_PROJECT_STATUS.md),
[changelog](../../03_CHANGELOG.md), [evidence](../../04_TEST_EVIDENCE.md),
[decisions](../../05_BLOCKERS_AND_DECISIONS.md), [handoff](../../06_HANDOFF.md).
No runtime callers, fixtures outside the test file, config, exports elsewhere,
permissions, dependencies or adapters change. No accepted source/test changes.
No imports or recognizer dependencies; A34's sole direct consumer stays the guard.

- [x] Write behavioral tests against an inert exported stub and record real RED.
- [x] Implement canonical/closed parsing and the ordered preview checks; run GREEN.
- [x] Run requested focused/full/syntax and existing source-isolation tests.
- [x] Append measured evidence; audit nine paths, six byte prefixes, accepted
  sources/tests, links/formatting, original refs/indexes/worktree identities.

Review focus: forged/contradictory context; duplicate/conflicting token kinds;
stale element versus stale inventory; cross-target input; hostile transport and
capability access. Tests must explicitly exercise each. User's exact allowlist,
execution request and no-Git-mutation rule override skill-default extra plan
artifacts, approval rounds, worktree creation, staging and commits.

No persistence, retries, latch, reconciliation, execution or Phase 14.03 work.
Identical inputs can replay an identical old preview; no live freshness claim.

## Implemented behavior and actual RED/GREEN

**PHASE 14.02: READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY / PREVIEW_ONLY.**
The checklist above is complete. The contract section was written before the
test file, inert exported stub and implementation logic, in that order.
The new module implements only the documented bounded parsing and ordered checks.
No accepted-contract conflict required expanding scope.

D01–D03 exercise each supported operation/kind and both invented fill values;
D04–D09 cover zero/duplicate/hidden/disabled/wrong-kind elements; D10–D14 cover
inventory/intent/element generations, targets, upper bounds and unknown tokens;
D15–D17 reject hostile selectors, operations and values; D18–D21 cover cancellation,
failed/uncertain/contradictory context, manual interruptions and genuine accepted
guard serialization. D22–D29 cover caller hooks, transport/canonical ordering,
pollution/extra/missing keys, scalar/enumeration bounds, versions and precedence.
D30 makes the documented unrelated-element boundary explicit; D31 asserts fresh
immutable deterministic/stateless outputs. Every result checked by the behavioral
helper must have the exact fixed key set, all 17 false flags, no input echoes or
capability-bearing fields, bounded ASCII output and deep immutability.

Tests preceded implementation logic. An exported stub returned undefined.
Initial RED: **32 failed / 0 passed**, exit 1; D01–D31 were assertion failures,
while D32 dereferenced the absent result and raised TypeError. That D32 error is
excluded from behavioral RED evidence. The D32 assertion was corrected to compare
an optionally absent reason; the unchanged inert stub was rerun. Definitive RED:
**32 failed / 0 passed**, exit 1, all 32 ERR_ASSERTION failures. No missing-module,
invalid test path or accepted-source mutation was counted. Initial GREEN after
minimal implementation: **32/32 passed**, exit 0. No corrective logic iteration
or feature expansion was needed.

## Executed verification

All Node commands ran from the extension directory. Each final run has zero
failed/skipped/cancelled/todo. No browser, provider or external-service test ran.

| Command / run | Exit | Tests / passed / failed / skipped / cancelled / todo |
|---|---|---|
| `node --test test/interaction-dom-primitives.test.mjs` — definitive RED | 1 | 32 / 0 / 32 / 0 / 0 / 0 |
| Same command — initial GREEN | 0 | 32 / 32 / 0 / 0 / 0 / 0 |
| Same command — final focused primitive | 0 | 32 / 32 / 0 / 0 / 0 / 0 |
| `node --test test/odoo-sh-page-recognition.test.mjs test/odoo-sh-unknown-page-fallback.test.mjs test/interaction-context-guards.test.mjs test/interaction-dom-primitives.test.mjs` | 0 | 116 / 116 / 0 / 0 / 0 / 0 |
| `node --test test/*.test.mjs` | 0 | 2253 / 2253 / 0 / 0 / 0 / 0 |
| Targeted isolation command below | 0 | 14 / 14 / 0 / 0 / 0 / 0 |
| `node --check src/interaction/dom-primitives.mjs` | 0 | Syntax accepted; no tests |
| `node --check test/interaction-dom-primitives.test.mjs` | 0 | Syntax accepted; no tests |

Exact final isolation command:

```bash
node --test --test-name-pattern='A34|U18|G25|D32|source.*(import|capabilit|caller)|standalone.*(import|capabilit|caller)|controller has no imports|import-free|isolated source|planner only imports' \
  test/branch-creation-plan.test.mjs \
  test/deploy-key-handoff.test.mjs \
  test/github-api-error-fixtures.test.mjs \
  test/github-permission-reader.test.mjs \
  test/github-repository-create-preview.test.mjs \
  test/github-repository-discovery.test.mjs \
  test/github-sandbox-write-approval-fixtures.test.mjs \
  test/interaction-context-guards.test.mjs \
  test/interaction-dom-primitives.test.mjs \
  test/odoo-sh-page-recognition.test.mjs \
  test/odoo-sh-unknown-page-fallback.test.mjs \
  test/read-only-admission.test.mjs \
  test/submodule-structure.test.mjs \
  test/utilities-plan.test.mjs
```

An earlier broad isolation selection used the same pattern without `D32` and
`planner only imports` across `test/*.test.mjs`: exit 0, Node reported 37/37
(12 named assertions and 25 file-load entries). Those entries are not claimed as
37 distinct isolation assertions. The targeted run above executes 14 named checks.
The full suite also includes all existing source-isolation checks.

D32 evaluates the actual module source from initialization through all recorded
primitive-string scenarios in an isolated VM, with dynamic string/WASM generation
disabled and throwing capability sentinels for browser/DOM/network/storage,
process/logging, clocks/timers and evaluation globals. **Zero accesses** observed.
Nonprimitive rejection also runs in that VM. No imports, recognizer source/catalog,
runtime callers, browser adapters or capability access exist in the new module.
A34 remains byte-identical and passes, enforcing the sole direct recognizer
consumer `src/interaction/context-guards.mjs`; G25 and U18 remain passing.
VM evaluation belongs only to local test infrastructure.

An internal read-only reviewer found no Critical, Important or Minor findings
and independently reran the primitive tests: **32/32 passed**, exit 0. It treated
unrelated stale/duplicate known elements as documented scope, and explicitly
left full-suite repetition, tracking appends and historical Git preservation to
the root audit. This internal review is not ChatGPT acceptance or publication.
Ruling: the selected-token scope stands because no unrelated element can become
the requested candidate; the cost is that PREVIEW_READY says nothing about the
rest of the inventory. The guard-identity/replay limitation remains explicit.

## Exact nine-file inventory and measured preservation

Three created files:

- [Pure preview primitive](../../../src/interaction/dom-primitives.mjs).
- [Behavioral and isolation tests](../../../test/interaction-dom-primitives.test.mjs).
- This Phase 14.02 report.

Six append-only files:

- [Phase 14 parent](PHASE_14.md).
- [Project status](../../00_PROJECT_STATUS.md).
- [Changelog](../../03_CHANGELOG.md).
- [Test evidence](../../04_TEST_EVIDENCE.md).
- [Blockers and decisions](../../05_BLOCKERS_AND_DECISIONS.md).
- [Handoff](../../06_HANDOFF.md).

Preservation audit exit **0**: exactly these nine paths; all **six original
documentation prefixes** byte-identical; **207 other tracked extension files**
SHA-256 unchanged, including all **80 pre-existing source/test files**, A34,
accepted recognizer/guard, Phase 14.01 historical BLOCKED/R1 record, master plan,
contracts, security policies, adapters, manifest, dependencies and README.
All **39 original refs** retain their values, current count **39**, no additions,
removals or changed refs in this observation window. All **three raw indexes**
and **84 captured non-object Git metadata files** retain SHA-256, device/inode,
size and mtime. Three linked-worktree registrations/HEADs/root identities and
required root/branch/origin/HEAD/recorded-upstream identity remain preserved;
staged inventory stays empty. No current-window preservation exception observed.
New local Markdown links resolve. Authored sections pass UTF-8/LF/final-newline,
trailing-whitespace, paired-fence and scoped `git diff --check` verification.

This observation window does not establish historical continuity or identify
actors behind the 35→24 discrepancy, sibling-index drift or cross-turn Codex ref
changes: all remain **UNVERIFIED**. Git objects, uncaptured metadata, remote
freshness, protected IDE contents and sibling source bytes were not verified.
Protected IDE/sibling source contents were not read, hashed, edited or restored.
No clone, fetch, checkout, reset, staging, commit, push or ref repair occurred.

Local temporary evidence: `/tmp/phase14-02-8rhvfqvq/`, including `baseline.json`,
six `prefixes/` originals, `red.log`, `red-final.log`, `green-initial.log`,
`primitive.log`, `focused.log`, `full.log`, `isolation.log`,
`isolation-targeted.log`, `check-source.log`, `check-test.log`, `audit.py` and
`audit.json`. Temporary files may expire; the measured evidence above is durable.

Skills actually used: Ponytail; Superpowers using-superpowers, brainstorming,
writing-plans/executing-plans guidance adapted to the explicit execution scope,
TDD, worktree detection, requesting-code-review and verification-before-completion.
Tools actually used: local shell/Git/Python3/Node through functions
exec/exec_command/write_stdin, apply_patch and one read-only collaboration reviewer.
No external-service MCP, browser-control tool or web research used. WarpGrep and
Valyu were unavailable in the discovered tool inventory; local contracts suffice.

Official progress remains **46/72 accepted; 5/20 master phases**, pending ChatGPT
acceptance/publication of 14.02. Phase 14 **IN_PROGRESS / NOT ACCEPTED**; Phase 13
fixture-only exit **PASS**, live capability **PENDING**; Phase 10.03 **BLOCKED /
NOT AUTHORIZED**; historical Git discrepancies **UNVERIFIED**; production **NO_GO**.
No persistence, retries, latch, reconciliation or real interaction capability.
**STOP for independent ChatGPT review. Do not stage, commit, push or begin 14.03.**
