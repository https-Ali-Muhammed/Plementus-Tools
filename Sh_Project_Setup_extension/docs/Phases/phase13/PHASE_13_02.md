# Phase 13.02 — Read-only fixture page recognition

2026-11-12 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.

## Binding contract and implementation plan

Implement sections 3–9 of [accepted Phase 13.01](PHASE_13_01.md), supplied as
ACCEPTED/PUBLISHED at `9d6b3534c9846d6a95c9eb165fde959a6db043e1`.
The historical report stays verbatim. Local HEAD and upstream corroborate the SHA;
acceptance is user-supplied, not inferred from Git or a remote freshness check.

- [x] Write independent literal expectations for A01–A40 and competing precedence.
- [x] Run behavioral RED against an exported empty stub; module-not-found is not RED.
- [x] Implement the standalone two-string parser, ordered rules and frozen output.
- [x] Run focused/full suites, syntax checks and capability/source isolation checks.
- [x] Append six tracking documents and audit nine-file scope and preservation.

Only [the new recognizer](../../../src/odoo-sh/page-recognition.mjs),
[its tests](../../../test/odoo-sh-page-recognition.test.mjs), this report and six
specified appendices may change. There are no callers, exports, fixtures, config
or dependencies to update. Exact schemas, marker catalog and status vocabularies
come from the accepted contract; no design revision or new integration is needed.
Review focuses on canonical wire encoding, cross-envelope validation before
versions, competing first-match rules, non-required target contradictions and
zero authority/capability leakage. All are exercised by the planned tests.

## Implementation and privacy boundary

The sole export is `recognizeFixtureOdooShPage(configurationText, observationText)`.
The standalone synchronous module has no imports or runtime callers. Each call
validates primitive strings and transport sizes before parsing both complete
canonical envelopes, including key order and every enum, scalar and array limit.
Malformed future-version input is rejected before version selection. Canonical
round-trip rejects duplicate keys, alternative numeric/escape spellings and
negative zero. The private frozen catalog contains only eight synthetic page
markers; two exact synthetic interruption markers stay manual. The 29 predicates
are applied in contract order, without normalization, inference or fallback.

Every call returns a new frozen plain record with the exact 26 properties in
order. All values are primitives, making freezing deep for this schema. Context
categories describe only matching fixture slots. All 15 verification, authority
and effect flags remain false; evidence is always `SIMULATED`, provenance always
`SYNTHETIC_UNTRUSTED`, and `fixtureOnly` always true. No identifiers, origins,
markers, input excerpts or exceptions are returned. No observations become real
evidence, including Production/Staging matches and key/branch classifications.

## Actual RED/GREEN and verification evidence

Tests were authored before the implementation. A temporary exported stub returned
`undefined`; `node --test test/odoo-sh-page-recognition.test.mjs` exited **1**:
**41 tests, 1 passed, 40 failed**, zero skipped/cancelled/todo. Failures were actual
expected-record-versus-undefined assertions. The capability/isolation test alone
passed against the inert stub. There was no module-not-found run counted as RED,
and no claim that the stub exposed a pre-existing implementation defect.

After implementing the contract, the focused command exited **0**, **41/41 passed**,
zero failed/skipped/cancelled/todo. From the extension directory:

| Command | Exit | Actual result |
|---|---|---|
| `node --test test/odoo-sh-page-recognition.test.mjs` | 0 | 41 passed, 0 failed |
| `node --test test/*.test.mjs` | 0 | 2,178 passed, 0 failed; 0 skipped/cancelled/todo |
| `node --check src/odoo-sh/page-recognition.mjs` | 0 | Syntax accepted |
| `node --check test/odoo-sh-page-recognition.test.mjs` | 0 | Syntax accepted |

The full suite includes existing source-isolation tests, unchanged. The new test
also checks the exact single export and scans product source for callers and
forbidden capabilities. Fresh isolated evaluation installs throwing accessors for
browser, network, storage, DOM, clipboard, timers, clocks, logging and process
capabilities, with dynamic string/WASM code generation disabled. Recorded fixture
outcomes replay identically with **zero capability accesses**. The VM wrapper is
local test infrastructure; the implementation itself never evaluates source.

A separate read-only reviewer inspected the contract, implementation and tests,
independently reran **41/41 focused tests**, and found no actionable defect,
material ambiguity or required acceptance gap. That AI review is not independent
ChatGPT acceptance, human security concurrence or publication.

Additional local adversarial validation enumerated all **1,024 subsets** of the
ten known markers against **81 target-slot combinations**: **82,944 scenarios**,
each also tested with reversed marker order. Nineteen deeply nested/control-text
rejections supplement these, totaling **165,907 calls**, with literal contract
reason/context assertions and permutation equality. Deep malformed inputs through
8,191 characters reject without escaping exceptions. This is synthetic evidence.

Temporary logs and preservation evidence live at `/tmp/phase13-02-9zg5q1lo/`:
`before.json`, six `prefix-*` snapshots, `red.log`, `green-initial.log`, `full.log`,
`full-result.json`, `adversarial.mjs` and the final audit files. These local files
are outside the repository, may be ephemeral, and are not committed artifacts.

## Acceptance matrix coverage

Each A01–A40 has its own executable test. The shared assertion checks the exact
whole result against independently authored literal expectations, ordered own-key
allowlist, plain record, immutable primitive descriptors, ASCII serialization,
2,048-character bound and every false flag. Parameterized loops below are actual
assertions, not coverage inferred from test names. The final additional test
supplies ordered witnesses for all 29 rows and competing conditions; mutually
exclusive predicates are identified explicitly. Tests never import private
implementation helpers to compute expected outputs.

| Case | Executed coverage |
|---|---|
| A01 | Seven non-auth markers; exact class and both context categories. |
| A02 | Listing with all four target slots null; both NOT_REQUIRED. |
| A03 | Empty markers; page_unknown. |
| A04 | Invented, case-varied and trailing-space markers; unsupported_marker. |
| A05 | Detail/settings, Production/Staging and auth/detail; both orders. |
| A06 | Duplicate every page, unknown, MFA and CAPTCHA token. |
| A07 | Contract versions 2/999 in either argument; no fallback. |
| A08 | Fixture versions 2/999 in either argument; no fallback. |
| A09 | Both origins: other fixture, slash, query, fragment, case, port and synthetic user-info variants. |
| A10 | Observation origin and tab null independently. |
| A11 | Each of four generation fields null independently. |
| A12 | Both generations older/newer with otherwise matching evidence. |
| A13 | Duplicate roles, identical entries and shared slots, permuted. |
| A14 | Empty and GitHub/Plementus-only selections; no inferred role. |
| A15 | All six three-role permutations; identical serialized result. |
| A16 | Selected slot 2 versus observed slot 1. |
| A17 | Each observed target 2 versus expected 1/null. |
| A18 | Required project (null,null)/(1,null); retained detail class. |
| A19 | Branch/build and both environments with missing branch; also missing project with available branch. |
| A20 | Denied, missing and unknown access; exact manual reasons. |
| A21 | Context loss and unexpected navigation; no retained class. |
| A22 | Auth alone; MFA/CAPTCHA alone and alongside detail, permuted. |
| A23 | Both interruptions in either order. |
| A24 | Repeated cancellation; no resurrection. |
| A25 | Non-string primitives, boxed string, objects, getter/toJSON/thenable/iterator/coercion traps, proxies including revoked, functions; zero hook accesses. |
| A26 | Syntax, duplicate/extra/missing/reordered keys, whitespace/BOM/newline, alternate numbers/escapes, scalar roots, nested scalars, invalid enums and array members. |
| A27 | 8,193/9,000 characters in either argument; overflow precedes parse/empty-input failure. |
| A28 | Marker 0/1/64/65, origin 0/1/128/129, marker counts 0/1/16/17, selection counts 0/3/4. |
| A29 | Every numeric field type/range, negative-zero wire spelling and booleans; generation 1/1,000,000 and slot 1/3 bounds. |
| A30 | Four harmless hostile tokens alone and with detail in either order. |
| A31 | Token/cookie/html/approvalGranted and prototype keys in either envelope; no input leakage. |
| A32 | Mutation/deletion/addition attempts, fresh objects, repeated calls and independent VM instance. |
| A33 | All 27 reasons exercised; maximum strings/arrays, negative outcomes, bounds and sanitized deterministic replay. |
| A34 | Source/import graph, sole export, no runtime callers and zero throwing capability-sentinel accesses. |
| A35 | Production/Staging/key/branch matches; every authority and effect flag false. |
| A36 | Malformed versus cancellation, future version versus cancellation, selection conflict versus missing access. |
| A37 | Stale versus conflicting/unknown markers; duplicate versus both interruptions; page conflict versus unknown, permuted. |
| A38 | Unknown versus target conflict; target conflict versus MFA; login with missing targets. |
| A39 | Non-required branch contradiction on listing. |
| A40 | Both parseable strings exactly 8,192 characters with schema-invalid extra padding; invalid_input, not overflow. |

## Nine-file inventory

Created:

- [Recognizer](../../../src/odoo-sh/page-recognition.mjs).
- [Focused acceptance tests](../../../test/odoo-sh-page-recognition.test.mjs).
- This Phase 13.02 report.

Append-only:

- [Phase 13 parent](PHASE_13.md).
- [Project status](../../00_PROJECT_STATUS.md).
- [Changelog](../../03_CHANGELOG.md).
- [Test evidence](../../04_TEST_EVIDENCE.md).
- [Blockers and decisions](../../05_BLOCKERS_AND_DECISIONS.md).
- [Handoff](../../06_HANDOFF.md).

## Preservation and limitations

Initial preflight verified root, branch, origin fetch/push URLs, HEAD/upstream at
the required publication SHA, empty extension and staged inventories, 35 refs,
three worktree registrations/HEADs/root filesystem identities and three raw
indexes. Every read-only Git command used `GIT_OPTIONAL_LOCKS=0`; working-tree
inspection was extension-scoped. The prospective snapshot includes all 204
tracked extension files, six exact document prefixes and 11 sampled Git metadata
files. Protected IDE paths received metadata-only stat checks: their contents
were never read or hashed. Sibling source documents and working-tree contents
were not inspected. Final measured audit results are recorded below.

The historical **35 → 24 ref discrepancy remains UNVERIFIED**, as does the
previously reported sibling-index metadata drift; neither is repaired, attributed
or resolved by this observation window. No claim covers all Git metadata/object
storage, remote freshness, protected-file byte equality or sibling source bytes.

Skills used: Ponytail and Superpowers workflow/design/planning, TDD, inline
execution and verification; independent reviewer used requesting-code-review.
Tools used: local shell, Git, Python and Node through functions tools, plus a
read-only collaboration subagent. WarpGrep/Valyu were unavailable in tool
discovery. No external-service MCP, browser, live network/provider, credential,
UI, permission, storage or runtime integration was used or added. No dependency,
manifest, security policy, workflow, worker, popup or existing source/test changed.

This stateless function does not enforce cross-call replay, lifecycle continuity,
authentication, real identities, rights or real database/build/key/install state.
Manual next-step codes are inert guidance and authorize no action. Real browser
compatibility and provider behavior remain untested and unauthorized.

Official progress remains **43/72 accepted; 5/20 master phases**. Phase 13 parent
**IN_PROGRESS / NOT ACCEPTED**. Phase 12 fixture-only exit **PASS**, live capability
**PENDING**. Phase 10.03 **BLOCKED / NOT AUTHORIZED**. Production **NO_GO**.
**STOP for ChatGPT review. No staging, commit, push or Phase 13.03.**

## Final measured preservation audit

The audit confirms **exactly nine authorized changed files: three new and six
append-only**. All six historical document byte prefixes match the prospective
snapshot. All **198 other tracked extension files** match their initial SHA-256,
including the accepted 13.01 contract, master plan, existing source/tests and
restricted integration/configuration documents. The staged inventory is empty.
All **23 authored local Markdown links** resolve. All nine files pass UTF-8, LF
and single-final-newline checks; authored content passes trailing-whitespace,
heading spacing, table consistency and paired-fence checks. Scoped
`git diff --check` and both individually recorded Node syntax checks exit **0**.

All **35 pre-existing refs retain their values**. Required root/branch/origin,
HEAD/upstream and all three worktree registrations/HEADs/root identities still
match. All three raw index bytes and sampled index metadata match; all **11
sampled Git metadata files** retain bytes and sampled metadata. Protected IDE
metadata shows no observed drift; protected content remains deliberately
unverified. No sibling source contents were inspected.

**Preservation exception: strict full-ref-set equality failed.** The initial
final audit exited **1** because the enumerated set increased **35 → 36**.
There are no removed or changed pre-existing refs, and the sole addition is:

```text
refs/codex/turn-diffs/checkpoints/903589ce1aef85fd31cfdb585949809c/d394d586bc51ec0f10b3d1ecb791a696/1794477464888/4f9bf125-ac06-4445-8a83-c74a7f51a095
de55de83d792fdf046e82a2625b52610b21d0503
```

The addition's actor/cause is **UNVERIFIED**. No task command created/updated
refs, and no attribution, deletion, restoration or repair was attempted. The
original snapshot was retained. The subsequent audit exits **0** for preservation
of every original ref and separately records the additional checkpoint; it does
not claim identical full ref sets. This additive checkpoint leaves the required
baseline and existing-ref preservation intact; no source work followed the
finding, only reporting and completion of read-only preservation checks.
`ref-exception.json` and `audit.json` retain the comparison in the temporary
evidence directory. There are **no newly observed index-metadata exceptions** in
this window. Neither this result nor the addition resolves the historical 35 → 24
ref discrepancy or the previously recorded sibling-index metadata drift.

Final status: **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**. Official progress stays
**43/72**, master phases **5/20**, production **NO_GO**. No staging, commit, push,
Phase 13.03 or live integration. **STOP for ChatGPT review.**
