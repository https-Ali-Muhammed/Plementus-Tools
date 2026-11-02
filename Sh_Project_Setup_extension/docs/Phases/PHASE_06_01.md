# Phase 06.01: Ordered step coordinator

**READY_FOR_REVIEW**, 2026-11-02 (Africa/Cairo). Owner-authorized bounded sequencing exception: postpone Phase 04 and implement only this offline micro-phase, following the [Phase 05.01 precedent](PHASE_05_01.md). Phase 04 remains **IN_PROGRESS / BLOCKED**, Phase 05 **ACCEPTED**, Phase 06 **IN_PROGRESS**, production **NO_GO**. Accepted progress stays **5/20 master phases; 22/72 official micro-phases**. Stop for independent ChatGPT acceptance.

## Design and scope

Use a synchronous in-memory closure with `createStepCoordinator(plan)`, `next()` and `submit({run, step, result})`. The plan is `{run, steps: [{capability, request}]}` with 1–32 ordered steps. Reuse all three v1 adapter validators. A fixed synthetic vocabulary binds operation/provider/mutation semantics; unknown operations cannot claim to be supported reads. No provider callback or executor exists. No production caller, config, export barrel or existing fixture needs changing.

`next()` returns a frozen bounded decision with only `decision`, numeric `index`/`total`, `evidenceTier: SIMULATED`, and `retryAllowed: false`. Read eligibility is only fixture-result eligibility, never availability/trust proof. `submit` binds results to the current run/step because v1 results do not carry that identity. Only supported non-mutating observed SIMULATED results advance. Mutations remain awaiting operator approval even with an approval reference. Negative injected fixture results can record blocked/failed/reconciliation decisions without executing anything. Stops are latched; there is no approve, resume, retry, reset or replay API.

Validate the entire plan before use and before every call; compare with the admitted definition to reject later changes, including otherwise-valid reordering or parameter changes. Reject duplicate step identities, exotic/hidden/accessor properties, customer values, URLs, free text and non-SIMULATED results. Errors are generic and decisions never echo input. Invalid submissions cannot advance and latch a stop; unknown outcomes retain reconciliation. New instances have no persistence or cross-instance duplicate guarantee and must never serve as a recovery bypass.

## Implementation plan (TDD, inline)

- [x] Write focused tests for ordering, bounds, contracts, identities, targets, mutation gates, F01–F07, uncertainty, duplicates, no retry/continuation, tampering and sensitive-data rejection.
- [x] Run the focused test to observe RED before implementation.
- [x] Implement only [step-coordinator.mjs](../../src/workflow/step-coordinator.mjs); run focused/full Node suites and syntax checks.
- [x] Review and update only current status, changelog, evidence and handoff plus the Phase 06 parent report.
- [x] Check Git scope, whitespace, Markdown links, protected files and master/source equality; leave changes uncommitted and stop for independent acceptance.

The owner's file/scope and no-commit instructions govern this inline plan; no extra planning files, branch/worktree changes or commits are needed. Review focus: plan tampering, wrong result identity, mutation flag spoofing, uncertainty after a stopped mutation, repeated submissions after advancement/completion.

## Evidence

Preflight verified canonical Git root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`, branch `feature/sh-project-setup-extension-clean`, HEAD `3ea52652c94c033dddbe84c25b812d629ee579a8`, configured upstream `origin/feature/sh-project-setup-extension-clean`, and matching local upstream/live remote tip. Origin fetch/push is `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`. The complete initial worktree including untracked files was clean. No clone, checkout, reset, fetch, commit or push.

Commands run from the extension directory using Node v24.19.0:

| Check | Actual result |
|---|---|
| `node --test test/step-coordinator.test.mjs` | **14 PASS**, 0 FAIL/SKIP/CANCELLED |
| `node --test test/*.test.mjs` | **127 PASS**, 0 FAIL/SKIP/CANCELLED |
| `node --check src/workflow/step-coordinator.mjs` | PASS |
| `node --check test/step-coordinator.test.mjs` | PASS |

TDD evidence: the first import failed because the module did not exist; a minimal export then produced **14 failing tests**, including missing-validation assertions. Implementation made all 14 pass. The initial file-write attempt used a duplicated directory prefix and wrote no files; it was corrected before RED. The full suite includes the existing Phase 05 contract/fixture tests and disconnected SEC-01 regressions; running those does not authorize SEC-01 changes or runtime acceptance. All operation evidence here is **SIMULATED**. No browser/provider/production tests ran because no UI or integration is present.

A separate read-only reviewer ran the focused 14-test suite and module syntax check, inspected the contracts and catalog, and reported no actionable findings. This internal review does not constitute independent ChatGPT acceptance.

## Exact file scope

Created:

- [Coordinator](../../src/workflow/step-coordinator.mjs)
- [Focused tests](../../test/step-coordinator.test.mjs)
- [Phase 06 parent](PHASE_06.md)
- This Phase 06.01 report.

Updated only [status](../00_PROJECT_STATUS.md), [changelog](../03_CHANGELOG.md), [test evidence](../04_TEST_EVIDENCE.md) and [handoff](../06_HANDOFF.md). The fixed synthetic vocabulary admits only `fixture-run`, `fixture-target`/`test`, numbered `fixture-step-1` through `fixture-step-32` or F01–F07-style step handles, `fixture-approval` for mutations, the six catalogued operation/provider/mutation combinations and ten bounded parameter flags. This is deliberately not a general provider plan format. A supported declaration is never availability/trust evidence. Results/envelopes remain caller-supplied synthetic assertions, with no independent provenance.

## Preservation and acceptance boundary

Final verification **PASS**: exactly these eight unstaged files including untracked files; `git diff --check` and new-file whitespace; **187 local Markdown links** across changed documents; **12 explicit protected-file HEAD byte comparisons**; master/source byte equality (SHA-256 `d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91`). Exact Git scope additionally confirms unchanged popup, storage tree, existing workflow modules and fixtures. Final HEAD, upstream and live origin tip still match the entry SHA. No new permissions, dependencies, persistence, credentials, network/provider operations, production approvals or runtime wiring.

The sequencing exception does not resolve SEC-01 cleanup outcome, trusted-clock, lifecycle, operator/device or production gates. Phase 04 remains **IN_PROGRESS / BLOCKED**, Phase 05 **ACCEPTED**, Phase 06 parent **IN_PROGRESS / NOT ACCEPTED**, and progress **5/20 and 22/72**. Production **NO_GO**. The synthetic coordinator satisfies the local 06.01 checks only; actual approval, pause/resume/cancel and durable idempotency remain future unauthorized micro-phases. **Stop for independent ChatGPT acceptance of 06.01; no next-phase implementation, commit or push.**
