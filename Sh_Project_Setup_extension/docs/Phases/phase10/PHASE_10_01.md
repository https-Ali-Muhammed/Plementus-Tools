# Phase 10.01 — Offline GitHub branch inspection

2026-11-11 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Not accepted; official progress **34/72** pending independent acceptance/publication.

## Scope and behavior

`inspectFixtureBranches(text, target)` in [branch-inspection.mjs](../../../src/github/branch-inspection.mjs)
passes the original fixture text through the accepted Phase 08.02
[reader](../../../src/github/repository-discovery.mjs) and consumes its validated
`branchDiscovery` result internally. It does not accept caller-provided result objects
or duplicate the repository parser, schema or branch-name allowlist. Target validation
uses a bounded synthetic singleton catalog through the same reader. Both arguments
must be primitive strings; source validation takes precedence over target validation.
The text retains the reader's canonical printable-ASCII JSON contract, 3,072-byte
limit, 16-repository limit and eight-branch limit. Target length is capped at 17 before
serialization; the reader makes the final vocabulary decision. No normalization.

| Evidence | Default / target outcome |
|---|---|
| Available, declared member default | Default existing; target existing or missing by exact membership |
| Available empty discovery | Both missing; no invented default |
| Target equals declared default | Both existing; `defaultBranchAsNewTarget: true`, `default_branch_protected` |
| Unknown / unavailable / unsupported | Distinct matching states; no missing inference |
| Conflicting evidence, missing repository, ownership mismatch | Unknown, retained redacted reader reason; manual fallback |
| Invalid source | Both invalid, `invalid_fixture` |
| Invalid target with otherwise valid source | Default assessment retained; target invalid, `invalid_target` |

The comparison flag is false for a valid nondefault target under available discovery,
and null when a valid comparison cannot be made. Conflicts are not repaired. A missing
target is descriptive, never a recommendation or approval to create it.

Every summary is deterministic, deeply frozen, printable ASCII and below 1,024 bytes.
It exposes states and fixed reason codes, not repository IDs, branch names, raw input
or exceptions. `evidenceTier: SIMULATED`, `fixtureOnly: true`, `nextStep: manual`;
account/permission verification, execution authorization, approval, continuing context
and effects are always false. There are no product callers, shared exports, callbacks,
credentials, API/browser/storage calls, dependencies or configuration changes.

## Exact authorized exception

The owner explicitly authorized one existing-test change after the initial isolation
conflict: the source-file guard in
[github-repository-discovery.test.mjs](../../../test/github-repository-discovery.test.mjs)
adds only `file.name !== 'branch-inspection.mjs'`. The existing reader exclusion and
all other assertions remain byte-identical. The reader implementation and its contract
are unchanged. The isolation test is neither removed nor skipped.

## Reproducible evidence

Node **v24.19.0**, native Node tests, 2026-11-11. From the extension directory:

```bash
node --check src/github/branch-inspection.mjs
node --check test/branch-inspection.test.mjs
node --test test/branch-inspection.test.mjs test/github-repository-discovery.test.mjs
node --test test/*.test.mjs
```

- TDD RED: empty exported function, **0 pass / 50 fail**, exit 1; assertions required a summary.
- Focused GREEN: **147 pass / 0 fail / 0 skip**, exit 0 (50 new + 97 discovery).
- Complete Node suite: **1,454 pass / 0 fail / 0 skip / 0 cancelled**, exit 0.
- Source/test syntax: PASS. Existing behavioral tests were not weakened.
- Isolation mutation check: a disposable source/test copy passed its baseline; injecting
  each of the two forbidden reference forms into each other source module produced the
  expected assertion failure: **22 modules / 44 negative checks PASS**. Real source files
  were not mutated. The exact amended isolation test performed these checks.

[New tests](../../../test/branch-inspection.test.mjs) cover all nine declared defaults,
existing/missing branches, empty discovery, all uncertainty states, visibility independence,
malformed and conflicting catalogs, ownership/missing repository cases, encoding/count/size
failures, invalid targets, hostile objects without hook execution, immutability, repeatability
and throwing network/browser/storage sentinels. No live/provider/browser execution occurred.

Local evidence: `/tmp/phase1001-audit/` contains RED/focused/full logs, isolation results,
baseline/final inventories and preservation scripts. Temporary evidence may disappear;
source/tests and the commands above are reproducible. Skills used: Ponytail; Superpowers
TDD, design guidance (owner opted out of planning rounds) and verification. Tools used:
local shell, Git, Python and Node via functions.exec/exec_command; no external MCP service.

## Exact changed-file inventory and preservation

Paths relative to `Sh_Project_Setup_extension/`:

| Mode | Path |
|---|---|
| CREATE | `src/github/branch-inspection.mjs` |
| CREATE | `test/branch-inspection.test.mjs` |
| MODIFY one guard only | `test/github-repository-discovery.test.mjs` |
| CREATE | `docs/Phases/phase10/PHASE_10.md` |
| CREATE | `docs/Phases/phase10/PHASE_10_01.md` |
| APPEND ONLY | `docs/Phases/phase09/PHASE_09.md` |
| APPEND ONLY | `docs/00_PROJECT_STATUS.md` |
| APPEND ONLY | `docs/03_CHANGELOG.md` |
| APPEND ONLY | `docs/04_TEST_EVIDENCE.md` |
| APPEND ONLY | `docs/05_BLOCKERS_AND_DECISIONS.md` |
| APPEND ONLY | `docs/06_HANDOFF.md` |

The Phase 09 parent append records only the offline sequencing exception and unchanged
live blocker, alongside the five established project trackers. No historical text is replaced.
Baseline root/branch/origin verified; HEAD and local upstream both
`e0f99d68ca89dad513053f97a6edd2c04a0af637`, branch
`feature/sh-project-setup-extension-clean`, origin
`https://github.com/https-Ali-Muhammed/Plementus-Tools.git`. No remote check occurred.
Final audit checks exact inventory, all six original byte prefixes, the precise single-test
replacement, unchanged remaining non-exempt files, both index fingerprints and empty
staged states, refs, worktree registrations/HEADs and local configuration.
Protected IDE files and both worktrees' source-document exceptions receive metadata-only
checks: no content reads/hashes or byte-equality claim. The sibling inventory is unchanged.
Historical **35 → 24 reference discrepancy remains UNVERIFIED**; prospective preservation
cannot resolve it. No staging, commit, push or Git repair.

## Limits and next action

Pristine native intrinsics and the accepted reader's synthetic contract are assumed.
No live account, permissions, branch existence, base SHA, provider behavior, Odoo.sh
Staging or production readiness is verified. No branch creation/modification/deletion,
force push, security-policy change or acceptance of Phase 10 is implied.
Phase 09.03 live execution remains **BLOCKED**; Phase 10 parent **NOT ACCEPTED**;
production **NO_GO**. Other historical blockers remain unchanged. **STOP for ChatGPT
review**; progress stays **34/72** until independent acceptance and publication.

Final measured audit: **PASS**, exactly 11 task paths, six byte-exact historical
prefixes, one exact test-guard replacement, and 11 resolving authored local links.
Both indexes/staged states, all **26 current refs**, worktree registrations/HEADs,
configuration and sibling inventory match baseline. Protected metadata matches;
no protected content equality is asserted. See `/tmp/phase1001-audit/verification.json`.
