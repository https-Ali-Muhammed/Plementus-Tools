# Phase 04 SEC-01: stalled-wall fix and restart-recovery resolution

**Status: BOUNDED_DISCONNECTED_FIX READY_FOR_REVIEW / RESTART_RECOVERY DESIGN PROPOSED / PHASE_04 BLOCKED (2026-10-29).** Progress remains **5/20 master phases; 22/72 micro-phases accepted**. Production is **NO_GO**. This task changed only the disconnected storage service, its tests, isolated browser harnesses and current evidence documents. It did not approve a clock source or numerical criterion, amend policy, connect production worker/recovery code, or implement operator recovery.

## Authority and defect

The [master plan](../01_MASTER_PLAN.md) requires durable non-secret state and worker-restart/tab-close handling. [SEC-01](PHASE_04_SEC01_APPROVED_POLICY.md), [Option B](PHASE_04_SEC01_RETENTION_AMENDMENT_B.md), the [combined A+B owner decision](PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md), and the [uncertain-time exception](PHASE_04_SEC01_UNCERTAIN_TIME_RETENTION_AMENDMENT.md) are approved within their stated scopes. The [runtime clock-source decision](PHASE_04_SEC01_RUNTIME_CLOCK_SOURCE_DECISION.md) remains proposed; the [previous combined remediation](PHASE_04_SEC01_RUNTIME_CLOCK_COMBINED_REMEDIATION.md) remains historical and unchanged.

`eligibilityFor()` previously checked conservative monotonic elapsed time only when wall time classified a row as expired. If wall time stalled while monotonic time reached seven days, cleanup and checkpoint-dependent operations could continue using an apparently eligible row. A focused Node regression failed on the original code with `Missing expected rejection`; the shared eligibility check now compares the same-instance monotonic lower bound independently of the wall result. At or beyond the seven-day lower bound with wall time still eligible, it latches uncertainty, aborts the current transaction, rejects all later operations on that service instance with `Checkpoint operation failed`, and retains the row. Correcting wall time does not clear the latch. Monotonic evidence alone never authorizes deletion.

Normal automatic expiry cleanup still requires **both** wall time `>= createdAt + 604800000` and conservative same-instance monotonic lower bound `>= 604800000`, with no unresolved uncertainty. The lower bound remains current `before` minus creation `after` minus the existing 0.1 ms precision margin; the existing 1.1 ms forward-detection allowance contributes nothing to expiry. At one millisecond before the wall boundary, the row is not deleted. At the exact boundary with sufficient independent evidence, deletion reports success only after the atomic transaction commits. If wall time reaches the boundary before the monotonic lower bound, access blocks and the row remains. No new tolerance or time anchor was added.

Existing invalid/reversed/wide monotonic brackets, regression, rollback, forward movement, cumulative small discrepancies and permanent latch checks remain in the Node suite. Seven persisted fields, immutable `createdAt`, generic errors, revision/terminal/authorization guards, atomic abort and authorized explicit/acknowledged deletion remain unchanged. Browser and Node tests exercised representative guards. These injected values test code paths, not seven days of real elapsed time or trusted device clocks.

## Restart behavior and its limit

| Event | Observed disconnected behavior | Recovery implication |
|---|---|---|
| Tab closes while the same test worker remains alive | A page-local service loses its `known` map; a separate worker service kept its boot ID and could read its own row after the tab reopened. | Tab closure alone need not destroy worker authority. Continuation is possible only while the original service and accepted time evidence survive; production wiring is absent. |
| Worker stopped and reactivated | CDP observed stop and a new boot ID. The new instance rejected read, transition, explicit delete, cleanup and creation of a fresh row while the old row remained field-for-field unchanged. | Unobserved worker lifetime gap destroys the volatile creation bracket. No automatic use, replay, retry or expiry deletion follows. |
| Browser process closed and reopened on the same disposable profile | The old row persisted; synthetic worker and page services rejected use and cleanup even when wall input said seven days had passed. The row's state/revision stayed unchanged and no fresh row was created. | A plausible post-restart wall timestamp cannot bridge the gap or authorize deletion. |
| Possible external-write outcome unknown | A Node test persisted `reconcile_required` at revision 3, constructed a fresh service, and verified read, transition, delete, cleanup and fresh create all failed while the row stayed unchanged. | No workflow runner exists in this harness, so absence of automatic replay is limited to the tested service/API and unchanged stored state; production replay paths remain unverified. |

The current seven-field record has no trusted cross-lifetime elapsed-time evidence. `Date.now()` and a new worker's monotonic clock cannot prove the unobserved interval under the current approved constraints. A fresh service fails closed for any previously persisted row. Its global cleanup gate also blocks creation of a separate run while an unresolved row remains. Thus **true automatic cross-restart resumption is not achievable under the current architecture**. The master plan's durable-state/restart expectation remains unmet if interpreted as automatic continuation. The tested fail-closed response handles interruption safely, but does not satisfy product resumability or complete Phase 04.

## Proposed operator-assisted path (design only)

1. A future production recovery surface would display only **“checkpoint blocked; owner review required”** and sanitized cleanup status **not attempted / outstanding / committed**. It must keep the outstanding physical-retention obligation in the approved sanitized owner-controlled process; it must not expose record contents, target/customer data, credentials, URLs, raw errors or screenshots.
2. An authorized operator would reconcile the actual external-write outcome through an approved route before any further action. Unknown success is neither failure nor permission to retry. Preserve incident evidence and keep a failed/conflicted disposition outstanding.
3. Before separate new work, reverify current target, account, origin, environment and permissions, then obtain a fresh action-specific authorization. The new run must use new evidence and a new run ID; the old row cannot supply state, expiry proof or approval. Old-row deletion approval is destructive disposition only, not permission to resume or start work.
4. For an uncertain old row, only the project owner may approve case-specific manual deletion under the existing A+B policy, with reliable target/revision evidence, guarded transaction completion and feasible absence verification. No delegation or automatic deletion is approved. This task implements none of that procedure.

A separately approved fresh workflow **could be safe in principle** after reconciliation and fresh verification/authorization, while the old retention obligation remains open. It is **not implementation-ready**: the current global gate blocks fresh creation, no production runner/authorization/identity controls exist, and no reviewed mechanism isolates new work from an unresolved old row. A future scoped, owner/security-approved implementation must demonstrate that it preserves the blocked old row, its retention obligation and all no-bypass guards. Until then, keep durable recovery blocked; do not use manual storage edits or a clock reset to work around the gate.

| Option | Feasibility and trade-off |
|---|---|
| **A. Retain blocked row; separately authorize fresh work after reconciliation (recommended design)** | Fits the approved exceptional-hold and no-replay policy in principle. Gives a usable path after future guarded implementation, but may accumulate blocked rows with no guaranteed maximum hold and requires owner/operator review; current code cannot start that fresh run. |
| **B. Revisit schema/storage or time-trust architecture** | Could support automatic cross-restart eligibility if a future owner/security decision establishes a genuinely trusted bridge. Requires policy change, new evidence and implementation authorization; no such bridge is approved or demonstrated. |
| **C. Continue blocking durable recovery** | Current executable behavior. Safest until A's guarded path or an approved B is ready, but prevents automatic continuation and any fresh checkpoint creation while an unknown row is present. |

Recommend **A as the owner-decision-ready design, with C as the present operating state**. Owner/security still must accept the prior 1.1 ms detection rule, 1 ms bracket cap, 0.1 ms precision assumption, within-instance expiry criterion and residual clock risk; approve any fresh-work isolation and real operator controls; establish device and incident gates; then separately authorize production wiring and review. No policy change was silently made. Production remains **NO_GO**.

## Validation and scope

Run from `Sh_Project_Setup_extension` on 2026-10-29:

| Command | Result |
|---|---|
| `node --test test/*.test.mjs` | **89 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED** |
| `node --check src/storage/checkpoint-service.mjs` | PASS |
| `node --check test/checkpoint-service.test.mjs` | PASS |
| `node --check test/sec01-cleanup-browser.mjs` | PASS |
| `node --check test/sec01-cp3-browser.mjs` | PASS |
| `node test/sec01-cleanup-browser.mjs` | Chromium 151.0.7922.34: **14 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED**, remote requests 0, disposable profile cleanup PASS |
| `node test/sec01-cp3-browser.mjs` | Chromium 151.0.7922.34: **10 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED**, remote requests 0, disposable profile cleanup PASS |
| `git diff --check` | PASS; changed tracked files had no whitespace errors. The new untracked report was checked separately for trailing whitespace. |

Final scope verification: exactly **10 authorized files** changed (nine tracked, this new report); **14 protected files** matched `HEAD` byte-for-byte; the master plan matched `docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md` byte-for-byte; **197 local Markdown link targets** resolved across the six changed documents. No unexpected changes were present.

Changed files: `src/storage/checkpoint-service.mjs`, `test/checkpoint-service.test.mjs`, `test/sec01-cleanup-browser.mjs`, `test/sec01-cp3-browser.mjs`, `docs/Phases/PHASE_04.md`, `docs/00_PROJECT_STATUS.md`, `docs/03_CHANGELOG.md`, `docs/04_TEST_EVIDENCE.md`, `docs/06_HANDOFF.md`, and this report. Approved policies, existing clock-source decision and historical reports, `checkpoint-policy.mjs`, `run-record.mjs`, `recovery.mjs`, `background.js`, manifest, permissions, dependencies, master/source copies and Odoo files remain unchanged.

Browser tests used installed Chromium, invented records, test-only unpacked MV3 files and owned disposable profiles. They changed no OS clock and accessed no normal browser profile, provider or real account. The cleanup test used injected seven-day values and measured local bracket samples; the lifecycle test used a synthetic worker. Neither verifies production recovery, real operator identity, provider writes or true cross-restart time continuity. No permission, dependency, backend, remote time service, persisted field, manual deletion, workflow runner or production runtime integration was added.

Git preflight: root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`; branch `feature/sh-project-setup-extension-clean`; local HEAD, upstream and live remote feature tip `d2e53596ef2e880eb0d8c4292bac4147a46d3cea`; origin fetch/push `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`; live remote default HEAD `main` at `9a818495593c87ef6d4a1376e7f81be26513e0b5`; no staged, tracked or unexpected untracked changes at entry. No clone, switch, reset, fetch, commit or push. Stop for independent ChatGPT verification and owner acceptance of this bounded fix and proposed design.
