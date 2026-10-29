# Phase 04 SEC-01: isolated real-browser cleanup gate verification

**Status: BROWSER_CLEANUP READY_FOR_REVIEW.** The disconnected cleanup gate is **ACCEPTED**; Option B remains **OWNER_APPROVED**. Phase 04 remains **IN_PROGRESS / BLOCKED**, progress **4/20 master phases and 18/72 micro-phases accepted**, and production activation **NO_GO**. This report does not authorize runtime integration or activation.

## Scope and environment

Owner authorization covered only synthetic data in a disposable Chrome profile. Preflight confirmed canonical Git root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`, origin fetch/push `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`, branch `feature/sh-project-setup-extension-clean`, HEAD and local upstream `aa1e8301da1555d2d0200cde96bb5de424d1ebdb`, and a clean full worktree. No fetch, switch, reset, commit or push occurred.

Preflight commands from the Git root were `pwd`, `git rev-parse --show-toplevel`, `git remote -v`, `git branch --show-current`, `git rev-parse HEAD`, `git status --porcelain=v1`, `git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'`, `git rev-parse '@{upstream}'`, `git diff --quiet`, and `git diff --cached --quiet`. All matched the requested baseline.

Node was **v24.19.0**. The existing Playwright installation selected Chrome for Testing **151.0.7922.34** at `/home/https_ali_muhammed/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`; the running browser reported the version. No package or browser was installed or downloaded.

`test/sec01-cleanup-browser.mjs` creates a fresh owned directory under the OS temporary directory, copies the current `src/storage` and `src/workflow` modules without editing them, and writes a test-only MV3 manifest, worker and extension-origin page. The worker exposes only a synthetic `read` message. The page injects real `indexedDB`, a controlled clock and `authorize: () => true` into the actual `createCheckpointService`. All test records use invented UUIDs and the approved seven-field shape, except intentionally malformed legacy rows. The same temporary Chrome user-data directory is reused for the process-restart check. The browser is closed before ownership/prefix checks and recursive removal; **CLEANUP PASS** reported the directory absent afterward. No normal profile was opened.

## Commands and outcomes

From `Sh_Project_Setup_extension`:

```sh
node --version
node -e "const {chromium}=require('playwright'); console.log(chromium.executablePath())"
node --check test/sec01-cleanup-browser.mjs
node --test test/*.test.mjs
node test/sec01-cleanup-browser.mjs
```

The final Node suite: **50 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED**. Browser script syntax: **PASS**. Final real-browser run: **11 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED**; profile cleanup: **PASS**. Two earlier browser-script runs failed before the final pass due to test-harness expectations: one tried to seed before the database object store existed; the next expected a committed readonly transaction for an intentionally rejected missing-record read, which Chrome correctly aborted. Both were fixed only in the new test. Neither failure exposed a production-service defect. The preserved [CP3 report](PHASE_04_SEC01_CP3.md) and test were not edited.

Final static validation used `git diff --check`, `git status --porcelain=v1 --untracked-files=all`, `git diff --name-only`, `git ls-files --others --exclude-standard`, `git show HEAD:<path>` comparisons, `sha256sum`, `cmp -s`, and local Python link/scope checks. The exact delta is **six modified current Markdown records plus the new browser test and report**; no other tracked or untracked path changed. All **247 local links across 50 Markdown files** resolved. Master plan and source copy were byte-equal at SHA-256 `d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91`. `git diff --check` passed.

Protected files matched `HEAD` byte-for-byte: `manifest.json` (`091bcdfe262efd9d38edeb88da3ba3e333d6e662fc2030e60683a0b00676ac7f`), `src/storage/checkpoint-service.mjs` (`bece7ccf862bc48d6678543d5147d988088eef0c7067b2aa928299671c35341f`), `src/storage/checkpoint-policy.mjs` (`5ec425acb68f999fcd9c520534249a56a161f914a8e77df16b99d042a9d08b91`), `test/sec01-cp3-browser.mjs` (`7b3b467f70bbb8a64924c06fa4679070c6d9f167b4fd62026b61d6eee34155a5`), the approved policy (`13fb60c1745c8ebe66bd32e0332fefc4e78ba33e39657510d23ca57108d629f3`), and Option B amendment (`59ca0b5494f38c569edcc55cef592ece972b638227afa60175974184e5d27a40`). No dependency, backend, network integration, production permission or host-permission file changed.

## Observed assertions

| Area | Real Chrome observation |
|---|---|
| Initialization and ordering | Database opened with `checkpoints` store. The first `read` logged `start:readwrite`, `complete:readwrite`, then `start:readonly`, `complete:readonly`. Two later reads each ran another cleanup transaction; success was not cached. |
| Seven-day expiry | A record remained eligible at `createdAt + 604800000 - 1`. A transition retained immutable `createdAt` and incremented revision. At equality, the next transition was denied; cleanup removed the expired row before use. Direct IndexedDB `get` confirmed absence; a later read failed. |
| Atomic cleanup | Two expired rows were removed in one committed readwrite transaction; a fresh row remained byte-for-byte equal. The reported count was `2` only after `complete:readwrite`. A later-key legacy row caused `abort:readwrite` after an earlier expired row had been visited; both rows remained, and requested access was blocked. The legacy row was removed only by the test fixture's direct database setup/teardown path. |
| Concurrency and retry | Three simultaneous checkpoint operations shared one failing cleanup transaction and all rejected. After fixture removal of the legacy row, a new read started a new cleanup, committed deletion, then rejected the now-missing record. The failed operations were not replayed. Two simultaneous successful reads shared one cleanup and each received its own readonly transaction after commit. Competing transitions admitted one state/revision update and rejected the stale one. |
| Worker lifecycle | CDP observed the test MV3 worker running, then stopped after `ServiceWorker.stopWorker`. A later extension message reactivated it with a different in-memory boot ID. Its first service execution at the expiry boundary denied `read` and direct IndexedDB inspection showed the expired row absent. This was direct worker stop/reactivation, not page reopening. The worker has no workflow runner or replay path. |
| Browser restart | After closing the entire browser, the same profile still contained the synthetic row. Reopening Chrome alone was not treated as service execution. The first test message with clock advanced beyond expiry returned a denied read, and direct IndexedDB `get` confirmed physical absence after the cleanup commit. |
| Clock | `NaN`, unavailable (`undefined`) and detectably backward samples blocked checkpoint access. The test clock establishes boundary logic only. It does not prove real OS time, time trust after worker/browser restart, or a trusted seven-day elapsed interval. An undetected forward OS clock jump could delete a record prematurely. Clock trust and blocked-time resolution remain **OPEN for owner/security review**. |

## Boundaries and remaining blockers

The test-only manifest has no permissions or host permissions. The production manifest and its permissions, production worker, popup and storage modules were unchanged. The fixture used no real customer/provider data, provider call, backend, network integration or workflow execution. `authorize: () => true` is synthetic and does not verify a real operator. The harness aborted non-extension page requests and used Chrome's `--disable-background-networking`; this is a test-harness restriction, **not** a browser-wide network audit.

Real IndexedDB commit/abort and lifecycle behavior for the disconnected service are now observed. Production startup/access wiring, guarded runtime callers, operator authorization, device controls, incident route, clock trust, and final owner/security approval remain **BLOCKED / NOT RUN**. IndexedDB absence is not forensic erasure. Production activation remains **NO_GO**. Stop for ChatGPT acceptance of this isolated browser gate.
