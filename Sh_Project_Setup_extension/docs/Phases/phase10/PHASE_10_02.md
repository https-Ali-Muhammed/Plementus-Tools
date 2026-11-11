# Phase 10.02 — Safe offline branch creation planner

2026-11-11 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Official progress stays **35/72** pending independent acceptance and publication.
The owner identifies [10.01](PHASE_10_01.md) as **ACCEPTED / PUBLISHED** at
`719107bdd308e787d9b18654fa55cf559ccd3cf3`; local HEAD/upstream match.
Publication is owner-supplied provenance; no remote verification occurred.
Earlier pending records remain historical and unchanged.

## Implementation contract

The sole export, `planFixtureBranchCreation(text, target)`, in
[branch-creation-plan.mjs](../../../src/github/branch-creation-plan.mjs), calls
[inspectFixtureBranches](../../../src/github/branch-inspection.mjs) internally.
Only that module is imported. Caller-provided inspection objects or serialized
summaries cannot replace the original fixture. No parser, branch vocabulary or
isolation exception is added. The accepted inspection contract retains primitive
canonical printable-ASCII JSON, a 3,072-byte input cap, at most 16 repositories,
eight branches per repository and the fixed nine-name synthetic vocabulary.
Invalid source takes precedence over invalid target; no normalization or repair.

| Evidence | Outcome / reason |
|---|---|
| Existing nondefault target, valid existing default | `NO_ACTION` / `target_already_exists` |
| Missing target, valid existing default | `AWAITING_VERIFIED_BASE_SHA` / `verified_base_sha_required` |
| Target equals declared default | `BLOCKED` / `default_branch_protected` |
| Available empty repository, no default | `BLOCKED` / `default_branch_missing` |
| Invalid source or target | `BLOCKED` / retained inspection reason |
| Unknown, unavailable, unsupported, absent repository, ownership mismatch or conflicting evidence (including an absent/null declared default in a nonempty repository) | `MANUAL_REVIEW` / retained inspection reason |

Only the awaiting outcome carries `potentialOperation: CREATE_BRANCH`; all others
carry null. This is a descriptive future possibility, never permission or an
executable operation. `baseCommitSha` is always null. Any separately authorized
future execution must independently recheck the exact target's absence and verify
the current existing default's base commit SHA. Supplying a SHA cannot authorize
this planner: it accepts no SHA or approval argument and has no execution path.

Every result is deeply frozen, deterministic, below 1,024 printable-ASCII bytes,
and retains the inspection states without echoing identifiers, branch names,
input or exceptions. `evidenceTier: SIMULATED`, `fixtureOnly: true`, `nextStep: manual`.
Account/permission verification, execution authorization, approval, continuing
context, effects, creation authorization, target verification and base-SHA
verification are always false. Both independent-verification requirements are true
on every outcome. Pristine native intrinsics are assumed, as in the accepted API.
No Git commands, credentials, network/browser/storage operations, dependencies,
popup/worker/coordinator integration, manifest or permission changes are included.

## Tests and evidence

[64 new tests](../../../test/branch-creation-plan.test.mjs), Node **v24.19.0**:

- RED: missing-module run failed first; an empty export then produced **0 pass /
  64 fail**, exit 1 (63 missing-plan assertions plus the isolation/import assertion).
- Focused GREEN: **211 pass / 0 fail / 0 skip / 0 cancelled**, exit 0:
  64 planner + 50 unchanged inspection + 97 unchanged discovery tests.
- Complete extension Node suite: **1,518 pass / 0 fail / 0 skip / 0 cancelled**, exit 0.
- Both new files pass syntax checks. Existing tests, including source isolation,
  are unchanged; no additional source-isolation exclusion is needed.

Tests cover all outcomes/default names, empty/missing defaults, uncertainty and
conflicts, visibility independence, invalid targets, malformed/canonical input,
forged summaries, hostile hooks/proxies without coercion, 3,071/3,072/3,073-byte
boundaries, maximum branch sets, no invented SHA/authority, immutability,
determinism, preserved inspection behavior and throwing capability sentinels.

From the extension directory:

```bash
node --check src/github/branch-creation-plan.mjs
node --check test/branch-creation-plan.test.mjs
node --test --test-reporter=tap test/branch-creation-plan.test.mjs test/branch-inspection.test.mjs test/github-repository-discovery.test.mjs
node --test --test-reporter=tap test/*.test.mjs
```

Actual logs, baseline/final snapshots, original document prefixes and audit script
are retained outside both worktrees at `/tmp/phase1002-audit/`; temporary evidence
may disappear. `verification.json` records the final preservation/link results.
Skills used: Ponytail; Superpowers design/planning guidance, TDD and verification.
Tools: local shell/Git/Python 3/Node via functions.exec/exec_command and apply_patch.
No external service or browser tool was used.

## Exact scope and preservation

Three new files: planner, planner tests and this report. Six append-only files:
[Phase 10](PHASE_10.md), [status](../../00_PROJECT_STATUS.md),
[changelog](../../03_CHANGELOG.md), [test evidence](../../04_TEST_EVIDENCE.md),
[blockers/decisions](../../05_BLOCKERS_AND_DECISIONS.md), [handoff](../../06_HANDOFF.md).
No accepted report, existing source/test, master plan, architecture or policy is edited.

Required root, branch `feature/sh-project-setup-extension-clean`, HEAD/local upstream
and origin `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` were verified.
The audit compares the nine-path delta, all six original byte prefixes, all other
inventoried files, both indexes/staged states, worktree registrations/HEADs, refs
and Git control files. Protected IDE files and the two sibling source documents
receive metadata-only checks; no protected content-equality claim is made.
The pre-existing IDE change is outside this task. No staging, commit, push, ref
repair, worktree creation or external interaction was performed.

## Status and limitations

[Phase 10](PHASE_10.md) remains **IN_PROGRESS / NOT ACCEPTED**; 10.02 is review-ready
only. Phase 09.03 live write remains **BLOCKED**; production **NO_GO**. Phase 04
BLOCKED / POSTPONED; Phase 06 PARTIAL / BLOCKED; Phase 07/08 parents IN_PROGRESS /
NOT ACCEPTED; D-04/B-02/B-03 OPEN and twelve historical security decisions PENDING
remain unchanged. Historical **35 → 24 reference discrepancy remains UNVERIFIED**.
No real branch existence, live permissions, base SHA, provider behavior or Odoo.sh
Staging is verified. **Next: independent ChatGPT review. STOP.** No Phase 10.03.

Final measured audit: **PASS** — exactly nine task paths, six preserved original
prefixes, all existing source/tests unchanged, both indexes and empty staged states,
both worktree registrations/HEADs, all **26 refs**, Git control files, sibling inventory
and protected metadata preserved. All **17 authored local links resolve**.
Historical reference discrepancy remains UNVERIFIED; no protected byte equality is asserted.
