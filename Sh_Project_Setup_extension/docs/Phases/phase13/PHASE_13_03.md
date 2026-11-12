# Phase 13.03 — Unknown-page fallback and versioned selector isolation

2026-11-12 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Scope: **FIXTURE_ONLY / TESTS + DOCUMENTATION**.

## Accepted baseline and execution plan

Per the supplied acceptance/publication instruction, [Phase 13.02](PHASE_13_02.md)
is **ACCEPTED/PUBLISHED — FIXTURE_ONLY** at
`146a61a862549abea4ae35f3a6a09ae05b5f63d4`. Local HEAD and recorded upstream
both match; no fetch or remote freshness verification was performed. Earlier
reports retain their historical review status verbatim; this appendix records
the subsequent supplied acceptance, not acceptance inferred from Git.

Binding references: [master plan](../../01_MASTER_PLAN.md),
[13.01 sections 4–10](PHASE_13_01.md),
[accepted implementation](../../../src/odoo-sh/page-recognition.mjs) and
[accepted tests](../../../test/odoo-sh-page-recognition.test.mjs).
The original 29-row precedence remains authoritative and unchanged.

- [x] Verify branch, publication baseline and prospective preservation snapshots.
- [x] Add independent unknown-page/version/isolation regressions against the published implementation.
- [x] Run the new suite first, then focused/full suites and syntax verification.
- [x] Append the six authorized tracking documents and verify exact scope/preservation.

No production source, accepted tests, callers, exports, fixtures, configuration,
permissions or dependencies need changes. The existing function already supplies
the required behavior. No failing implementation reproduction or remediation was
needed; no catalog extraction, duplicate catalog or unused registry was added.

## Verified behavior and scenario boundaries

The new [regression suite](../../../test/odoo-sh-unknown-page-fallback.test.mjs)
uses only canonical JSON strings with invented synthetic data. Its expectations
are independent literal outcomes, not expectations computed from private helpers.
The small fixture builder is test input construction, not a second marker catalog.

| Tests | Distinct regression coverage / requested guarantees |
|---|---|
| U01–U03 | Matched fixture replaced by empty, unsupported, case-varied, trailing-space or near-match tokens; page/duplicate/interruption conflicts; supported marker cannot hide unsupported evidence. Covers 1–7 and 9. |
| U04–U05 | Full permutations of competing unknown/page/interruption/duplicate evidence; whole-result determinism and accepted precedence. Covers 8 and the conflicting-page-plus-unsupported scenario. |
| U06–U07 | Known page then explicitly supplied unexpected navigation; formerly matched input with stale document/context generation. Covers changed-context scenarios and 24. |
| U08 | Missing required project retains its classified page with unavailable target; contradictory target is ambiguous with UNKNOWN class; unsupported marker precedes target conflict. Covers 10 and 23. |
| U09 | Contract/catalog versions 2 and 999 in configuration, observation and both; otherwise identical recognized markers, bracketed by valid v1 calls. Covers 12–14 and catalog-mismatch scenario. |
| U10–U11 | Malformed version fields in either envelope beat unsupported versions; contract beats catalog; supported-version and exact-site checks beat marker conflicts. Covers 15 and 20. |
| U12–U14 | Exact synthetic origin, no wildcard/normalization/prefix matching; invented CSS/XPath/DOM/route-shaped strings are inert unknown data; nested marker objects and extra registry/callback/loader keys reject. Covers 11 and 16–18. |
| U15 | Mutating external fixture objects and attempting result mutation cannot alter later catalog matching; fresh records for repeated inputs. Covers 19. |
| U16–U17 | Missing selection/context, modeled login/MFA/CAPTCHA, cancellation; exact next steps and no authority. Covers 24–26. |
| Shared assertions + U18 | Exact 26-field flat frozen plain outputs, bounded sanitized ASCII, SIMULATED/SYNTHETIC_UNTRUSTED, all 15 flags false; replay every recorded new case under throwing capability sentinels. Covers 21–22 and 27–30. |

Empty markers produce **UNKNOWN_PAGE / page_unknown**. Unsupported tokens produce
**UNKNOWN_PAGE / unsupported_marker**. Supported page conflicts, identical
duplicates and conflicting interruptions produce **AMBIGUOUS_PAGE** with
`page_conflict`, `duplicate_marker` and `interruption_conflict`, respectively.
An unsupported token does not override an earlier page conflict; a page conflict
beside that token remains `page_conflict`, independent of order. Earlier version,
site and stale-context checks still win. These are contract witnesses, not a
reinterpretation or replacement of the accepted precedence suite.

Unknown/marker-ambiguous outcomes have `pageClass: UNKNOWN`; no preceding match
is retained. The scenarios explicitly supply changed fixture contexts. Equal old
inputs can still match after a navigation scenario. This stateless function does
not observe navigation, invalidate a cache, enforce cross-call freshness, latch
cancellation or provide actual lifecycle protection. Harness generation changes
are synthetic assertions, never browser evidence.

## Operator fallback guidance — documentation, not implemented UI

These instructions describe how an operator should interpret inert next-step
codes. No popup, presentation controls, navigation or other UI was implemented.
No code below grants authority for a real operator/provider action.

| Code / applicable outcome | Actionable fixture review guidance |
|---|---|
| MANUAL_PAGE — page_unknown, unsupported_marker, duplicate_marker, interruption_conflict, page_conflict | Stop the fixture review. Discard any displayed previous match. Review/correct the synthetic evidence or use manual guidance; never choose a winning marker or retry automatically. |
| REVIEW_VERSION — unsupported_contract_version, unsupported_fixture_version | Stop. Check which reviewed contract/catalog the local fixture targets. Supply a reviewed v1 fixture or seek separate version approval; never silently relabel or downgrade the rejected payload. |
| MANUAL_TARGET — target_context_missing, target_conflict | Resolve the intended synthetic project/branch outside this result, cancel the old review and supply fresh explicit context. Do not infer a target from marker text. |
| FRESH_SELECTION — missing/conflicting selection, wrong site/tab, missing/stale/lost context, unexpected_navigation | Discard the match, cancel the current review and create fresh explicit fixture selection/document/context evidence. Returning to an identical origin does not establish continuity. |
| MANUAL_AUTH — login_required, mfa_required, captcha_required | Stop recognition. Any actual authentication belongs to a separately authorized native-site workflow. Do not collect credentials or solve/bypass challenges. |
| STOP — operator_cancelled | End this review and clear the displayed result. No rollback, logout or permission revocation is claimed. |
| CORRECT_FIXTURE — invalid_input, input_too_large | Correct the local schema/limits without displaying rejected payload text. |
| MANUAL_ACCESS — permission_denied, permission_unavailable | Stop and resolve the synthetic access scenario manually; do not request or broaden browser permissions. |
| REVIEW_FIXTURE — fixture_page_match | Review the synthetic classification only; identity, rights and execution remain unverified. |

All 15 verification/authority/effect flags remain false, including account,
rights, subscription, database/copy, association and installation verification.
No outcome automatically navigates, retries, authenticates, writes or grants a
browser permission. These properties also apply to successful synthetic matches.

## Version and selector isolation

The module-private frozen marker catalog is a fixed mapping from eight invented
page tokens to classes, with two exact interruption tokens. It is not a DOM
selector registry: there are no element queries, DOM handles, route interpretation,
page text collection, caller selectors, callbacks, imports or dynamic loading.
Only the exact reviewed synthetic origin is supported. Invented selector-shaped
negative strings are merely inert fixture data, never real Odoo.sh selectors.
No real selectors, routes, labels or observations were discovered or introduced.

Only input contract/catalog version 1 is supported. Structurally valid 2/999
values reject with REVIEW_VERSION even with identical v1 markers. Malformed
version envelopes reject before version selection. Output version fields remain
1 as the output schema/catalog identifiers; they do not mean that an unsupported
input was accepted. Version and site checks precede marker classification.

Future versions require explicit reviewed schemas/catalogs, deterministic dispatch
and negative compatibility tests preserving the v1 boundary. Live recognition
additionally requires separately authorized collection, origin/selection/lifecycle
trust boundaries, privacy/permission contracts and real-site compatibility evidence.
This phase supplies none of that authorization or evidence.

## Executed tests and evidence

Commands ran from the extension root against the unchanged published source.
The **first behavioral run was GREEN**. No RED was manufactured, temporary defect
introduced or accepted file edited. One earlier shell command used a duplicated
extension path: file creation and test lookup failed, exit 1, **zero tests ran**.
That setup error is not behavioral RED. The initial metadata helper used absent
`python`, exit 127; it was rerun successfully as `python3` before edits.

| Command | Exit | Tests / pass / fail / skipped / cancelled / todo |
|---|---|---|
| node --test test/odoo-sh-unknown-page-fallback.test.mjs | 0 | 18 / 18 / 0 / 0 / 0 / 0 |
| node --test test/odoo-sh-page-recognition.test.mjs test/odoo-sh-unknown-page-fallback.test.mjs | 0 | 59 / 59 / 0 / 0 / 0 / 0 |
| node --test test/*.test.mjs | 0 | 2196 / 2196 / 0 / 0 / 0 / 0 |
| node --check test/odoo-sh-unknown-page-fallback.test.mjs | 0 | Syntax accepted; no tests executed |

The unchanged accepted A34 source-isolation check passes in focused/full suites:
sole export, no imports, no product callers and no capability accesses. New U18
replays every recorded new scenario in a fresh VM with browser/network/DOM/storage/
process/logging/clock/timer/dynamic-evaluation sentinels and string/WASM generation
disabled: **zero capability accesses**. VM source evaluation is test infrastructure,
not a runtime feature. Existing acceptance coverage remains intact; the 18 tests
focus on transitions and negative compatibility rather than copying all 41 tests.

Temporary local evidence: `/tmp/phase13-03-evidence/` contains preflight refs and
sampled metadata, extension hashes, six original prefixes, filesystem identities,
`new-initial.log`, `focused.log`, `full.log`, `audit.py` and `audit.json`.
It is outside Git and may be ephemeral; the committed report is the durable
results record after owner-controlled publication.

## Exact eight-file inventory

Created:

- [Unknown-page regression tests](../../../test/odoo-sh-unknown-page-fallback.test.mjs).
- This Phase 13.03 report.

Append-only:

- [Phase 13 parent](PHASE_13.md).
- [Project status](../../00_PROJECT_STATUS.md).
- [Changelog](../../03_CHANGELOG.md).
- [Test evidence](../../04_TEST_EVIDENCE.md).
- [Blockers and decisions](../../05_BLOCKERS_AND_DECISIONS.md).
- [Handoff](../../06_HANDOFF.md).

## Preservation, limitations and review gate

Preflight verified the required root/branch/origin fetch and push URLs and matching
HEAD/upstream. Extension-scoped status and staged inventories were empty. Read-only
Git commands use GIT_OPTIONAL_LOCKS=0 from the first command. The prospective
inventory has **37 refs**, **207 tracked extension files**, six byte prefixes,
three raw indexes, 11 existing sampled Git metadata files, three worktree
registrations/HEADs and root filesystem identities. Actual refs/SHAs are preserved
in preflight.json; no fixed historical ref count was assumed.

Phase 13.02 reported 35 original refs preserved plus one additional checkpoint.
This session's 37-ref starting inventory is a separate observation; it does not
establish intervening continuity, actor or cause. No ref deletion/repair or
metadata restoration was attempted. Historical **35 → 24 ref discrepancy** and
**sibling-index drift remain UNVERIFIED**. Sampled preservation cannot prove all
Git object/storage metadata or remote freshness.

Protected IDE files were stat-only; their contents were never read or hashed.
Sibling protected source documents and working-tree contents were not inspected.
No protected-content equality claim is made. No clone, fetch, checkout, reset,
stage, commit, push, browser/provider access, selector extraction, credential
handling, new permission or external write occurred.

Skills used: Ponytail; Superpowers using-superpowers, writing-plans and
verification-before-completion, bounded by the supplied regression-only plan,
eight-file scope and review stop. Tools used: local shell, Git, Python3 and Node
through functions.exec/exec_command/write_stdin. No external-service MCP was used.
WarpGrep/Valyu discovery returned no matching tools; external research was not
needed for this accepted local contract.

Official progress stays **44/72 accepted; 5/20 master phases** pending independent
13.03 acceptance/publication. Phase 13 is **IN_PROGRESS / NOT ACCEPTED**;
fixture-only exit is eligible for assessment after 13.03 publication, not granted
here. Phase 12 fixture-only exit **PASS**, full live capability **PENDING**.
Phase 10.03 **BLOCKED / NOT AUTHORIZED**. Production **NO_GO**.
**STOP for ChatGPT review. No staging, commit, push or Phase 14.01.**

## Final measured preservation audit

The local audit exits **0**: exactly **eight authorized changed files**, two new
and six append-only. All six original byte prefixes match; **201 other tracked
extension files** remain SHA-256 identical, including every accepted source/test,
the 13.01/13.02 reports, master plan and restricted policies/configuration.
The staged inventory remains empty. All **19 authored local Markdown links**
resolve. All eight files pass UTF-8, LF and single-final-newline checks; authored
content has no trailing whitespace, Markdown fences pair, and extension-scoped
`git diff --check` exits **0**. New-test syntax exits **0**.

All **37 pre-existing refs retain their exact values**, current count **37**,
**zero additional refs** during the measured window. All three raw index bytes,
inodes, sizes and mtimes are preserved, as are all **11 existing sampled Git
metadata files**. All three worktree registrations/HEADs/root identities and
required root/branch/origin/HEAD/upstream remain unchanged. Protected-path stat
metadata shows no observed drift; protected contents remain unverified.
**No newly observed metadata exception** in this window. This does not resolve
historical ref continuity or sibling-index drift, both **UNVERIFIED**.

No independent acceptance/publication was performed. Status remains
**READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**, progress **44/72; 5/20**,
production **NO_GO**. **STOP for ChatGPT review.**
