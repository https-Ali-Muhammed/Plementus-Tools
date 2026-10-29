# Phase 04 SEC-01: disconnected cleanup gate implementation

**Status: CLEANUP_GATE READY_FOR_REVIEW.** Option B is **OWNER_APPROVED / IMPLEMENTATION_PARTIAL**. SEC-01 CP1–CP4 remain accepted within their historical scopes. Progress is unchanged: **4/20 master phases; 18/72 micro-phases accepted**. Phase 04 remains **IN_PROGRESS / BLOCKED**; production activation is **NO_GO**. Stop for ChatGPT acceptance.

## Scope and behavior

The owner authorized disconnected implementation and synthetic tests only. The existing `src/storage/checkpoint-service.mjs` still requires an injected IndexedDB factory, time function and synthetic authorization function. It is not connected to the production worker or popup. No global IndexedDB, Chrome storage API, network call, permission, dependency, external service, browser-profile write, workflow execution or automatic retry was added.

Each public checkpoint operation (`create`, `read`, `transition`, `delete`, `cleanup`) enters a service-owned cleanup gate. The gate validates time, runs a readwrite scan, waits for transaction completion, then samples time again. Concurrent calls in one service instance share only a pending pass; no success is cached. A failed pass rejects all waiting calls with `Checkpoint operation failed`. A later explicit request may try a new pass, but the failed action is never replayed. Each admitted operation then performs its own time, eligibility, expected-state, revision and synthetic authorization checks in its guarded transaction. The first checkpoint request triggers cleanup; an explicit `cleanup()` can model startup execution. Actual startup events are not wired.

The scan uses one readwrite transaction and a cursor. Every row must have the exact seven-field v2 shape and matching primary key. At `createdAt + 604800000` milliseconds, a structurally valid row is expired and its cursor deletion is queued in that same transaction. A malformed, legacy, unknown, future-dated or key-mismatched row aborts the pass and remains available for separately authorized resolution. Request failure or transaction abort rolls back all staged deletions. The service reports the deletion count only after `oncomplete`; it never treats a queued delete as committed. IndexedDB transaction serialization supplies the database concurrency boundary; sharing the pending promise is only a same-instance optimization. No asynchronous gap is introduced inside the cursor callback.

The seven persisted fields remain `schemaVersion`, `runId`, `state`, `step`, `evidenceTier`, `revision`, `createdAt`. `createdAt` remains immutable; expiry is never renewed. Terminal-state, reconciliation, expected-state/revision and explicit/acknowledged deletion guards remain in place. Return errors contain no record contents. Inputs are copied and frozen input tests remain green. Authorization injection is synthetic and establishes no operator identity.

## Executed synthetic evidence

Preflight at `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` confirmed origin fetch/push `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`, branch `feature/sh-project-setup-extension-clean`, HEAD `457d9b615e449dd296ea6970373093039e6df31b`, upstream `origin/feature/sh-project-setup-extension-clean` at the same commit, and a clean full worktree. No fetch, branch switch, commit or push occurred.

From `Sh_Project_Setup_extension`, Node **v24.19.0**:

```sh
node --test test/*.test.mjs
node --check src/storage/checkpoint-service.mjs
node --check test/checkpoint-service.test.mjs
node --check test/fake-indexeddb.mjs
```

Result: **50 PASS, 0 FAIL, 0 SKIP**; **3 syntax PASS, 0 FAIL**. The prior suite had 40 tests; **39 existing cases remain and 11 new cases** now exercise the gate (10 net additional). The prior separate-transaction cleanup-conflict case was replaced because that transaction layout no longer exists. Existing checkpoint-service cases were adjusted where automatic cleanup changed transaction order or physical deletion timing; their security assertions were retained. New cases cover first and repeated gating, startup-style explicit cleanup, concurrent shared wait and commit ordering, atomic multiple deletion, abort after a staged delete, failed delete, key mismatch, failed-gate retry without replay, all four operation types blocked by abort, fresh time after waiting, and invalid/backward clock samples. Existing tests cover exact expiry, strict structure, revision/state and authorization guards, frozen input and generic errors. Observed failed cleanup left all staged rows intact and blocked the requested operation; a fresh explicit request retried safely.

The injected fake models serial transactions, staged writes, cursor requests, commit hold, deletion failure and abort rollback. It does **not** establish real browser IndexedDB scheduling, cross-context serialization, worker restart behavior, durable deletion, or forensic erasure. The `seed` hook can insert intentionally invalid records and does not represent a production caller. No real Chrome/Brave test was run for this task. The seven approved fields cannot prove trusted time across worker or browser restarts. A detectably backward sample in one service instance fails closed; an unexpected forward clock change cannot be distinguished from real elapsed time here and may cause premature expiry/deletion. This remains an owner/security decision and a production activation blocker.

Final repository checks used `git status --porcelain=v1 --untracked-files=all`, `git diff --name-only -z`, `git ls-files --others --exclude-standard -z`, `git ls-files -z`, `git show HEAD:<path>`, `git diff --check`, and a local Python SHA-256/link/scope assertion. Results: exactly **9 modified plus 1 new** authorized files; **152 protected tracked-file hashes** matched HEAD; master plan and source copy were byte-equal; **145 local links** in the changed Markdown files resolved; manifest/permissions were unchanged; and the service scan found no global `indexedDB`, Chrome storage, network API or URL reference. No runtime worker/popup, dependency, or permission file changed. These static scans are not browser or network observations.

## Remaining gates

Option B physical cleanup is implemented and verified only in the disconnected synthetic service. Production startup/access integration, actual operator authorization, guarded runtime callers, real IndexedDB/browser lifecycle evidence for this new gate, clock trust, device controls, incident route and final security approval remain open. Production activation is **NO_GO**. No Phase 05 work was performed.
