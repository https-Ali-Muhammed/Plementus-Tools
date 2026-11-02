# Phase 04 SEC-01: isolated Chromium clock-safety regression

**Status: BROWSER_REGRESSION READY_FOR_REVIEW.** Independent ChatGPT acceptance is pending. Phase 04 remains **IN_PROGRESS / BLOCKED**; accepted progress remains **5/20 master phases and 22/72 micro-phases**. Production activation is **NO_GO**.

## Scope and Git preflight

This verification changed only two existing browser scripts and current documentation. It used the accepted disconnected service unchanged, invented seven-field records, a synthetic MV3 worker, real extension-origin IndexedDB and disposable Chromium profiles. Preflight at `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` found fetch/push origin `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`, branch `feature/sh-project-setup-extension-clean`, local HEAD, upstream HEAD and live remote branch HEAD all `f66bdfb0c28b02824acac5aa260414a686322130`, and empty `git status --porcelain=v1 --untracked-files=all`. No branch switch, reset, clone, commit or push occurred. The live remote check used `git ls-remote --heads origin feature/sh-project-setup-extension-clean`; it was a Git preflight, not browser traffic.

Preflight commands from the Git root: `git rev-parse --show-toplevel`, `git remote -v`, `git branch --show-current`, `git rev-parse HEAD`, `git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'`, `git rev-parse '@{upstream}'`, `git ls-remote --heads origin feature/sh-project-setup-extension-clean`, and `git status --porcelain=v1 --untracked-files=all`.

## Environment and commands

Node: v24.19.0. Installed Playwright launched Chromium / Chrome for Testing **151.0.7922.34** from `/home/https_ali_muhammed/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`, using `--headless=new`. Each script created a new owned directory below the OS temporary directory, copied the current storage and workflow modules into a test-only extension, launched a disposable user-data profile, closed Chromium, then removed its directory. No browser or dependency was downloaded. Both reported **CLEANUP PASS** and zero intercepted non-extension page requests. The test-only manifest has no permissions or host permissions. This is not a browser-wide network audit.

Commands actually run from `Sh_Project_Setup_extension`:

```sh
node test/sec01-cleanup-browser.mjs
node test/sec01-cp3-browser.mjs
node --test test/*.test.mjs
node --check test/sec01-cleanup-browser.mjs
node --check test/sec01-cp3-browser.mjs
node test/sec01-cleanup-browser.mjs
node test/sec01-cp3-browser.mjs
```

`node --version` also reported v24.19.0. Final repository checks from the Git root ran `git diff --check`, `git status --porcelain=v1 --untracked-files=all`, `git diff --name-only`, `git ls-files --others --exclude-standard`, `cmp -s Sh_Project_Setup_extension/docs/01_MASTER_PLAN.md Sh_Project_Setup_extension/docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md`, and `git diff --exit-code HEAD --` with the protected source, manifest, approved policy, historical browser reports, master-plan/source and Node-test paths. A local Python path-existence check resolved **184 relative Markdown links** in the six changed documentation files and found no trailing whitespace in this new report. The master plan matched its source byte-for-byte; protected files matched HEAD; `git diff --check` passed. The full worktree inventory was exactly the eight files listed below. No manifest, permission, dependency or production source path changed.

The first two commands were the unmodified baseline scripts and ran **separately**: cleanup failed after 0 passes at its direct IndexedDB seeded read; CP3 failed after 4 passes when a newly constructed service tried to read a prior record. Both cleaned their profiles. After updating the tests, the final Node suite reported **80 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED**. Both syntax checks passed. Final cleanup browser script: **11 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED**. Final CP3 browser script: **9 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED**. Both final browser runs were separate and reported **CLEANUP PASS**. An intermediate CP3 harness run had 8 PASS and 1 BLOCKED because CDP did not emit a running-worker version until a controlled message was sent after `ServiceWorker.enable`; the final run directly observed stop and reactivation.

## Test-by-test real IndexedDB observations

| Script / check | Observed result |
|---|---|
| Cleanup: extension origin and guarded creation | PASS. Service `create` and `read` returned the invented seven-field row; direct IndexedDB `get` matched. |
| Cleanup: repeated bounded operations | PASS. Each read followed a completed readwrite cleanup gate and its own completed readonly transaction. |
| Cleanup: concurrent successful reads | PASS. Both reads shared one committed cleanup transaction and each completed a readonly transaction. |
| Cleanup: concurrent failed cleanup | PASS. Three operations shared one aborted cleanup and all rejected. Removing the deliberately corrupt fixture row did not unblock the latched service or replay an operation; the valid row stayed unchanged. |
| Cleanup: trusted seven-day boundary | PASS. Synchronized wall and monotonic samples allowed a transition at one millisecond before expiry; immutable `createdAt` stayed `1000`. At equality, `cleanup()` returned `1` after `complete:readwrite`, direct `get` found no row, and read failed. |
| Cleanup: rollback | PASS. After a successful guarded create/read, a backward wall sample blocked the same service. Restoring wall time did not unblock it; direct `get` showed the unchanged row. |
| Cleanup: unexplained forward movement | PASS. Seven-day wall advance with only one monotonic millisecond blocked cleanup. A later plausible reading did not unblock the instance; no expiry deletion occurred. No jump tolerance was invented. |
| Cleanup: atomic multiple expiry | PASS. Synchronized elapsed time produced committed deletion count `2`; a newly guarded fresh row remained unchanged. |
| Cleanup: later legacy corruption | PASS. A deliberately inserted invalid row aborted a transaction after an expired row had been visited. No deletion count was returned; direct `get` found both rows intact. |
| Cleanup: authorization and instance boundary | PASS. Synthetic denial blocked transition and deletion; a new service did not inherit the prior instance's known-record authority. Errors were the generic `Checkpoint operation failed`. |
| Cleanup: revision, terminal and schema guards | PASS. Stale revision, terminal transition, wrong acknowledgment revision and an extra sensitive field were rejected without changing the saved row. |
| CP3: guarded create/read/duplicate | PASS. Real extension-origin IndexedDB retained a seven-field row; duplicate create failed. |
| CP3: schema | PASS. Extra sensitive field, wrong versions and invalid step failed. |
| CP3: competing transitions | PASS. One revision-zero proposal committed, one conflicted; `createdAt` remained immutable and stale update failed. |
| CP3: transaction abort | PASS. A guarded delete forced to abort returned a generic failure; direct `get` matched the prior row. |
| CP3: explicit/acknowledged deletion | PASS. Guarded explicit deletion and terminal cancellation acknowledgment removed their rows; stale revision was denied. |
| CP3: page close/reopen | PASS. A new page service rejected the persisted row, while direct `get` showed unchanged state and revision. Page reopening alone was not described as worker reactivation. |
| CP3: worker before stop | PASS. The synthetic worker created/read its own guarded record and returned one in-memory boot ID. |
| CP3: direct worker stop/reactivation | PASS. CDP observed the test worker running, then `stopped` after `ServiceWorker.stopWorker`; a later message caused a different boot ID and a blocked read. CDP recorded running again, and direct `get` found unchanged persisted state/revision. |
| CP3: browser-process restart | PASS. After closing Chromium and relaunching the **same disposable profile**, both new page and worker services rejected the old row, including a wall sample at the nominal expiry boundary without elapsed-time proof. The row remained `draft`, revision `0`; no expiry deletion, transition or replay occurred. |

## Changed historical assumptions

The older cleanup and CP3 scripts preceded the accepted clock-safety change. Their successful-read assertions for directly seeded rows, successful reads from newly constructed services, and physical deletion based only on an advanced wall clock after worker/browser restart are now invalid. Those checks now assert **blocked access and unchanged retention**, with successful create/read/transition/deletion covered only through the guarded service in the same known-record instance. Direct IndexedDB writes remain solely for deliberate corrupt-row setup and test isolation; direct reads inspect committed state. The earlier reports, including their then-observed outcomes, were not edited. A synthetic worker has no workflow runner, so the no-replay observation is bounded to this harness; production recovery remains unverified.

## Security and remaining limits

The wall and monotonic values were injected together for trusted within-instance expiry; this proves the service's boundary logic against real IndexedDB, not an actual trusted OS clock or seven real elapsed days. Restarted instances cannot prove prior elapsed time from the seven persisted fields. Under the approved uncertainty policy, the row remains blocked and physically retained pending owner-controlled resolution, with no guaranteed maximum physical hold. IndexedDB absence does not prove forensic erasure. `authorize: () => true` is synthetic and does not verify a real operator. Device encryption, screen lock, protected profile, actual owner identity, incident route, production worker/recovery wiring, provider behavior and final security approval remain **NOT VERIFIED / BLOCKED**. No customer data, credentials, real provider call, permission change, dependency, runtime source edit or production automation was used.

## Exact changed-file inventory

1. `test/sec01-cleanup-browser.mjs` — guarded success paths and clock/retention regression assertions.
2. `test/sec01-cp3-browser.mjs` — guarded transaction and separate page, worker and process restart assertions.
3. `docs/Phases/PHASE_04_SEC01_CLOCK_SAFETY_BROWSER.md` — this report (new).
4. `docs/Phases/PHASE_04.md` — current Phase 04 status and link.
5. `docs/00_PROJECT_STATUS.md` — current review status.
6. `docs/03_CHANGELOG.md` — new entry.
7. `docs/04_TEST_EVIDENCE.md` — current test totals and link.
8. `docs/06_HANDOFF.md` — review handoff.

Stop for independent ChatGPT review. No Phase 04 acceptance or production activation is claimed.
