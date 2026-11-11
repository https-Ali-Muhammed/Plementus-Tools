# Phase 12.02 — Offline deploy-key handoff state machine

2026-11-11 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Scope: **FIXTURE_ONLY**. Authoritative design: [Phase 12.01](PHASE_12_01.md).
User-supplied acceptance/publication baseline: `b579fcc8f444e8fbaa0d1ef0ab37a18885b014e3`,
matching local HEAD/upstream. Official progress remains **40/72**.

## Implementation plan

- [x] Write behavioral tests for the closed canonical event boundary, every state,
  transition precedence, replay/drift, cancellation, reconciliation and sanitized
  immutable no-authority results; run genuine RED before implementation.
- [x] Implement `createFixtureDeployKeyHandoff()` in
  [deploy-key-handoff.mjs](../../../src/github/deploy-key-handoff.mjs), exposing
  `send(text)` and `snapshot()`. Keep the original binding and possible-write latch
  private to each controller; no imports, runtime callers or external capabilities.
- [x] Run focused tests, accepted Phase 11/workflow/checkpoint/isolation regressions,
  full native Node suite and syntax checks; inspect all failures.
- [x] Verify nine-file scope, six preserved documentation prefixes, accepted files,
  Git controls/refs/indexes/worktrees and metadata-only protected boundaries.
  Append concise evidence to the six authorized ledgers and stop for review.

Review focus: empty selection cannot mask structure uncertainty; invalid/denied
facts precede key availability; event binding precedes results; cancellation and
caller false values cannot erase possible writes; simulated observation never
grants association, execution, checkout or installation authority.

## Implemented behavior and boundary decisions

The controller accepts exactly the 12 fields and closed values in Phase 12.01,
including primitive canonical ASCII JSON up to 8,192 characters. Round-trip
validation rejects duplicate keys and alternate encodings. It never accepts raw
keys, provider identifiers, caller objects or prior state. The result has exactly
the accepted 24 fields, fixed reasons and flat primitive values; freezing the
record therefore freezes it deeply. Every result is below 4,096 ASCII characters,
`nextStep: manual`, `evidenceTier: SIMULATED`, with all ten real-authority,
verification and effect flags false. `scenarioOutcome` is the modeled state.

Before `start`, the snapshot is `AWAITING_OPERATOR/none`, with null local references
and no recorded review. Only `start` binds an attempt. A fresh start after a stopped
no-write attempt requires a larger attempt number, nondecreasing generations and
at least one newer generation. Repeated starts cannot reset an active attempt.
This is a conservative implementation of fresh selection/review, not a retry API.
There is no in-boundary reconciliation reset; a controller with possible-write
history cannot use a new start to discard it. Losing an instance loses volatile
history: callers must reconcile externally before fresh selection, never resume
from persisted approval. No such production caller is implemented.

Empty selection preserves independent structure blockers/uncertainty. Denial and
invalid facts block before key availability. Only explicit confirmation enters
manual configuration and latches possible write. Manual return, report-only
attestation and synthetic match remain distinct states. Drift invalidates the
original binding; possible writes instead require reconciliation. Cancellation
and blocking retain the obligation, including a later categorical possible-write
report. Impossible reconciliation events block with `invalid_transition` and keep
the obligation. No event performs a save, retry, rollback, checkout or installation.

Scope reaches only the new standalone export, its test file and seven tracking
documents. Existing production callers, config, dependencies, exports, workflow,
checkpoint, Phase 11 source/tests, isolation assertions and security policies are
unchanged. Tests exercise accepted Phase 11 APIs separately; the controller imports
nothing. No live key handling, network/provider/browser/clipboard/storage/SSH/Git
execution or secret handling exists in the controller.

## Measured verification

Node **v24.19.0**. Logs and prospective snapshots: `/tmp/phase12-02-audit/`
(temporary local evidence, not committed).

| Run | Pass / fail | Exit |
|---|---|---|
| Initial RED against empty export | 0 / 257 | 1 |
| First implementation GREEN | 257 / 0 | 0 |
| Late terminal possible-write regression RED → GREEN | 257 / 3 → 260 / 0 | 1 → 0 |
| Pre-confirmation possible-write RED → GREEN | 261 / 3 → 264 / 0 | 1 → 0 |
| Reconciliation transition RED → GREEN | 287 / 13 → 300 / 0 | 1 → 0 |
| Final focused tests | 300 / 0 | 0 |
| Relevant accepted regressions | 690 / 0 | 0 |
| Explicit new/accepted source-isolation checks | 3 / 0 | 0 |
| Full native extension Node suite | 2,107 / 0 | 0 |
| Syntax checks, both new JavaScript files | 2 successful checks | 0 each |

Final test runs have zero skips/cancellations. A read-only reviewer identified
three reconciliation defects; each was reproduced before its fix. Two original
expectations were corrected from silently ignoring impossible reconciliation
events to the contract's `BLOCKED/invalid_transition`; no accepted test changed.
The final matrix exercises all 12 events from all 12 states. Capability sentinels
observe zero accesses. Review is not independent phase acceptance.

Reproduce from the extension directory:

```bash
node --test --test-reporter=tap test/deploy-key-handoff.test.mjs
node --test --test-reporter=tap test/utilities-plan.test.mjs test/submodule-structure.test.mjs test/utilities-conflict-fallback.test.mjs test/approval-checkpoint.test.mjs test/step-coordinator.test.mjs test/read-only-admission.test.mjs test/selection-invalidation.test.mjs test/phase-06-idempotency-reconciliation.test.mjs
node --test --test-reporter=tap --test-name-pattern='no imports|isolated source|planner only imports' test/deploy-key-handoff.test.mjs test/utilities-plan.test.mjs test/submodule-structure.test.mjs
node --test --test-reporter=tap test/*.test.mjs
node --check src/github/deploy-key-handoff.mjs
node --check test/deploy-key-handoff.test.mjs
```

## Exact inventory and preservation boundary

New: [controller](../../../src/github/deploy-key-handoff.mjs),
[tests](../../../test/deploy-key-handoff.test.mjs), this report.
Append-only: [Phase 12](PHASE_12.md), [status](../../00_PROJECT_STATUS.md),
[changelog](../../03_CHANGELOG.md), [evidence](../../04_TEST_EVIDENCE.md),
[decisions](../../05_BLOCKERS_AND_DECISIONS.md), [handoff](../../06_HANDOFF.md).

Root, branch, fetch/push origin and local HEAD/upstream match the requested
baseline. Working-tree status/diff inspection has been extension-scoped from the
first command, with optional Git index refreshing disabled. The pre-edit snapshot
covers 195 permitted extension files, 31 refs, 65 Git control files including all
three raw indexes, three worktree registrations/HEADs and metadata-only sibling
inventories. No protected IDE/source-document contents were read or hashed.

Limitations: preservation is prospective from this task's snapshot; protected
content equality is deliberately unverified. Sibling inventories exclude Git
object directories and dependency directories; other current-root working-tree
content outside the extension was not scanned. No live remote lookup occurred:
publication/acceptance is user-supplied, with local HEAD/upstream corroboration.
The historical **35 → 24 discrepancy remains UNVERIFIED**.

Skills used: Ponytail; Superpowers design/planning, inline execution, TDD, debugging,
review and verification, bounded by the explicit accepted contract and nine-file
scope. Tools used: shell/Git/Python/Node via functions tools, apply_patch and a
read-only reviewer subagent. WarpGrep and Valyu were unavailable; no external-service
MCP, browser, research or provider tool was invoked.

## Review handoff

Official progress stays **40/72** pending independent acceptance/publication.
Phase 12 parent: **IN_PROGRESS / NOT ACCEPTED**. Phase 11 full live acceptance:
**PENDING**. Phase 10.03: **BLOCKED / NOT AUTHORIZED**. Production: **NO_GO**.
Phase 12.01 acceptance/publication at the supplied baseline is recorded here without
rewriting its historical report. **STOP for ChatGPT review.** No staging, commit,
push or Phase 12.03; no new acceptance or publication is claimed.

### Measured final preservation result — with explicit exception

Exact nine-file extension scope and all six original byte prefixes pass; all
189 other original extension files, including accepted source/tests and the 12.01
report, are unchanged. All three raw indexes, extension staged state (empty),
worktree registrations/HEADs, original 31 ref values and original 65 control-file
bytes match. Protected-file metadata and sibling inventories match except the
shared `.git` directory modification time. Authored links/formatting and scoped
Git whitespace checks pass.

Full ref/control-set equality does **not** hold: one new Codex checkpoint ref
appeared during verification (31 → 32 refs; 65 → 66 control files):
`refs/codex/turn-diffs/checkpoints/725caa6a04a7444873f40b2ac0b933f3/ef11618b8c47f5c33b0649c19f3ba144/1794408672301/92773a81-6a58-4d21-8d75-2f843957ca25`,
pointing to `de55de83d792fdf046e82a2625b52610b21d0503`.
Its cause is **UNVERIFIED**; no removal/repair was attempted. No task command
created a ref, staged, committed or pushed. This current exception does not
resolve the separate historical 35 → 24 discrepancy. Review must retain both
limitations and the metadata-only protected-content boundary.
