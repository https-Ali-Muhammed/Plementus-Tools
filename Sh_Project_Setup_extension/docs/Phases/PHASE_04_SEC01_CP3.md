# SEC-01 implementation checkpoint 3: isolated Chrome IndexedDB

**READY_FOR_REVIEW** for ChatGPT acceptance. CP1 and CP2 are ACCEPTED per owner. Phase 04 remains **IN_PROGRESS / BLOCKED**; progress remains **4/20 master, 18/72 micro-phases accepted**. CP3 is not a master-plan micro-phase.

## Environment and scope

Preflight at Git root confirmed origin `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`, branch `feature/sh-project-setup-extension-clean`, HEAD `fcded6b71aa2b7243db807e20f3666ff4b0a8356`, clean entire worktree, and local upstream equality (0 ahead/0 behind; no fetch). Node v24.19.0 and installed Playwright used `/home/https_ali_muhammed/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`, **Google Chrome for Testing 151.0.7922.34**. The system Chromium launcher is an unavailable Snap stub.

`test/sec01-cp3-browser.mjs` creates an owned temporary directory containing a test-only MV3 extension and isolated user-data profile. It copies the actual CP2 storage and workflow modules, injects real extension-origin `indexedDB`, synthetic authorization, and deterministic clocks. Direct IndexedDB fixture operations inspect the store and insert synthetic corrupt or terminal records; they are test-only, not production callers. Page requests outside the extension origin are blocked and Chrome background networking is disabled. No provider or customer operation was requested; browser-wide network traffic was not independently audited. The test-only worker has only a read message handler and does not execute workflow actions. Production runtime integration and real operator verification are **NOT IMPLEMENTED**.

## Commands and observed results

From the extension directory:

```sh
node --test test/*.test.mjs
node test/sec01-cp3-browser.mjs
node --check test/sec01-cp3-browser.mjs
```

Node regression: **40 PASS, 0 FAIL, 0 SKIP**. Final browser run: **10 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED**. Browser groups cover initialization, create/read/duplicate, strict inputs, concurrent revision conflict and stale state, injected transaction abort and completion, page close/reopen, observed worker stop/reactivation, browser-process restart, explicit and acknowledged deletion, and expiry/cleanup/invalid records/terminal and reconciliation guards. Two transitions using revision zero yielded one success. The aborted delete preserved the prior record. A completion listener preceded service resolution. `createdAt` remained unchanged through transition and denial occurred at the exact seven-day boundary; cleanup then removed the record. Legacy, unknown and sensitive-field records were rejected and cleanup failed closed. Authorization was a synthetic callback only.

The test closes and reopens its page and observes the same revision; it closes the entire isolated browser and relaunches with the same disposable profile, observing the same state and revision. The test worker contains no workflow runner and no action was replayed by that worker; this is not a production workflow replay test. The repaired lifecycle check uses CDP `ServiceWorker.enable`, filters `workerVersionUpdated` to the test extension's `worker.mjs`, calls `stopWorker(versionId)`, and directly observes `running → stopping → stopped → starting → running`. Chrome retained version ID `0` across the restart, so the test does not require a new version ID. Its test-only in-memory `crypto.randomUUID()` boot identifier changed after a synthetic extension message reactivated the worker, while the committed revision remained `1`. This is direct worker lifecycle evidence, not a Playwright event, popup-close, or timeout inference. The prior `Target.closeTarget` attempt did not yield the Playwright worker close event within five seconds and remains preserved as the original failed attempt. The first harness attempt failed before database tests because Node's URL origin for an extension URL was `null`; the harness URL extraction was corrected. Each attempt closed the browser and verified deletion of its own temporary directory, **cleanup PASS**. No CP2 service correction was needed based on observed results. Expiry was advanced after browser relaunch in the reopened test environment; expiry across an additional close and reopen was not separately tested.

Expiry denies reads and transitions; it does not itself physically delete the database record. No process runs to enforce physical deletion while Chrome is closed. The approved seven-day physical-deletion requirement therefore remains unresolved before activation, and browser storage deletion is not evidence of secure erasure. Clock rollback across restarts remains undetectable with the approved fields.

## Validation and remaining gates

The production manifest, permissions, popup and background worker remain unchanged; production activation, messaging integration, provider access, customer data, credentials and workflow execution were not tested or implemented. See [test evidence](../04_TEST_EVIDENCE.md) and [blockers](../05_BLOCKERS_AND_DECISIONS.md). Remaining activation gates: closed-browser physical deletion; incident contacts and notification route; disk encryption, screen lock and protected profile verification; real operator authorization; production runtime caller restrictions; security review and owner activation approval. Stop for ChatGPT acceptance; CP4 and Phase 05 are not authorized.

Verification compared 12 protected files byte-for-byte to HEAD, including both source inputs, master plan, policy, implementation plan, CP1, CP2, manifest, worker and popup files. The master plan also matches its source copy. The manifest has no permission or host-permission keys. All 119 local Markdown links in changed documents resolved; `git diff --check` and checks of both new files passed. The Git delta contains only the six authorized status documents, this report and the browser test. No commit or push occurred.
