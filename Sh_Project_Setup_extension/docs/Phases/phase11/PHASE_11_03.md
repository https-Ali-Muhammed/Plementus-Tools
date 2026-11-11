# Phase 11.03 — Offline conflict detection and manual fallback verification

2026-11-11 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Owner-supplied [11.02](PHASE_11_02.md) ACCEPTED/PUBLISHED baseline:
`8ae058352f65f53d4ec37bd31b7526a79d823d64`, verified as local HEAD/upstream.
Official progress remains **38/72**, pending independent acceptance/publication.
[Phase 11](PHASE_11.md) remains **IN_PROGRESS / NOT ACCEPTED**, pending exit review;
**10.03 BLOCKED / NOT AUTHORIZED**; production **NO_GO**.

## Regression scope

[37 integration-level fixture tests](../../../test/utilities-conflict-fallback.test.mjs)
exercise the unchanged [11.01 planner](../../../src/github/utilities-plan.mjs) and
[11.02 structure validator](../../../src/github/submodule-structure.mjs) together.
Each receives its own canonical JSON fixture and has separate expected states,
outcomes and diagnostics. Neither consumes the other's result. There is no new
combined authority decision, executor, parser, source module or runtime integration.

| Fixture coverage | Verified independent behavior |
|---|---|
| Valid selection and matching synthetic Gitlink | Selection `valid`; structure `matched`; both `MANUAL_REVIEW`, match unverified |
| Duplicate identities across HTTPS and both SSH forms | Planner reports `duplicate_repository`; supported matching declarations can still be `matched` |
| Exact and both directions of parent/child collisions | Planner conflicts require manual review; duplicate declarations/tree entries or structural overlaps block |
| Component-prefix near miss | Distinct sibling paths remain valid/matched |
| Case-insensitive path equality/overlap and tree aliases | Planner conflicts and tree `case_ambiguity` remain manual; wrong-case replacement also blocks missing/orphan Gitlinks |
| Missing Gitlink; orphan with empty selection | Structure blocks independently of selection validity or optional emptiness |
| File, executable, symlink, directory and duplicate conflicting modes | Structure blocks with type/duplicate diagnostics |
| Missing content; missing path/URL; absent file with file entry | Unknown content requires manual review; incomplete declarations/presence conflicts block |
| Missing/null tree; missing entry mode/OID; explicitly empty tree | Unknown metadata stays manual with zero matches; explicit absence can establish blocking conflicts |
| Unsupported optional key/quoted path; relative URL | Unsupported parsing stops correlation; relative URL blocks selection but requires manual structure review |
| Unsupported syntax plus invalid tree | Independently detected tree error retains blocking precedence |
| Invalid selections mixed with valid/conflicting fields | Invalid entries block without losing valid neighbors or conflict diagnostics |
| Empty optional selection and complete empty structure | Both `NO_ACTION`; unknown structure still requires manual review |
| Determinism and privacy | Every case repeats identically and rejects synthetic URL/path/OID leakage; renamed identifiers and reversed matching tree order preserve summaries |
| Authority and execution | Every case retains manual next step, false approval/account/permission/execution/mutation/effect/installation/context flags; real-tree/reachability flags remain false |

Planner repository facts remain unknown and SHA/Gitlink/configuration fields remain
null, even when structure counts report a match. Invalid or uncertain states never
produce execution authorization. Assertions preserve each API's own enums/reasons;
they do not equate planner conflicts with structural errors.

## Verification

Regression-first work used the existing public contracts. The first run was
**37 PASS / 0 FAIL**; no genuine defect or defect-caused RED was observed. No missing
module, artificial failing assertion or source mutation is presented as RED evidence.
No RED-to-source-fix cycle was needed or performed; accepted implementations/tests
and isolation assertions remain unchanged.

From the extension root, all commands exited 0:

```bash
node --test test/utilities-conflict-fallback.test.mjs
node --test test/utilities-plan.test.mjs test/submodule-structure.test.mjs test/utilities-conflict-fallback.test.mjs
node --test test/*.test.mjs
node --check test/utilities-conflict-fallback.test.mjs
```

Focused **37 PASS**; combined **289 PASS** (252 accepted + 37 new); full extension
suite **1,807 PASS / 0 FAIL / 0 SKIP / 0 CANCELLED**. Syntax passes. Existing
source-isolation and capability-sentinel tests pass unchanged, both in the full
suite and a separate filtered run. No provider/browser/network operation was used.
Temporary logs and preservation snapshots: `/tmp/phase11-03-evidence/`.

## File inventory and preservation

Exactly **eight authorized paths**, with no staged changes:

- New: [regression tests](../../../test/utilities-conflict-fallback.test.mjs) and this report.
- Append only: [Phase 11](PHASE_11.md), [status](../../00_PROJECT_STATUS.md),
  [changelog](../../03_CHANGELOG.md), [test evidence](../../04_TEST_EVIDENCE.md),
  [blockers/decisions](../../05_BLOCKERS_AND_DECISIONS.md), [handoff](../../06_HANDOFF.md).

Preflight verified root, branch `feature/sh-project-setup-extension-clean`, fetch/push
origin `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`, local HEAD/upstream,
permitted staged/unstaged/untracked state, refs, both indexes and linked worktrees.
Final audit verifies six original byte prefixes, all other non-IDE tracked files,
both index byte snapshots and empty staged states, all 28 current refs, Git control
files, and both worktree registrations/HEADs. Sibling inventory, including its two
protected source documents, is checked through metadata only; contents are not read
or hashed. Authored documentation links and whitespace are checked separately.

Both protected IDE files are excluded from inspection, hashing and edits; their
content/metadata stability is not claimed. Previously reported workspace metadata
drift remains unattributed and unrepaired. Historical **35 → 24 reference discrepancy
remains UNVERIFIED**; this prospective snapshot does not resolve it.

## Limits and handoff

This is offline contract co-exercising, not runtime integration or a complete Git
parser. No real repository identity/access/permissions, actual tree, commit existence
or reachability, Odoo.sh behavior, module installation or manual operator completion
was verified. Existing bounds/parser coverage stays in the accepted suites; the new
suite samples cross-validator scenarios rather than exhaustively combining inputs.
No new security gate or workflow redesign was introduced. Existing Phase 04/06,
parent-phase, security and live-provider blockers remain unchanged.

Skills used: Ponytail; Superpowers planning, TDD and verification. Tools used:
local shell/Git/Python/Node through `functions`; no browser or connected-service MCP.

**STOP for ChatGPT review.** Progress stays **38/72**. No staging, commit, push,
publication or Phase 12.01. Phase 11 acceptance requires its separate exit review.
