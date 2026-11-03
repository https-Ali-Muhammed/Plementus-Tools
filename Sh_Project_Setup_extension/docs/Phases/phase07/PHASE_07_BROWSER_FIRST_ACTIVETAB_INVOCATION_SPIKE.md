# BF-05: Isolated activeTab invocation and three-tab verification

**READY_FOR_CHATGPT_REVIEW / LOCAL_FIXTURE_BROWSER_ONLY.** Dated **2026-11-03 (Africa/Cairo)**. **M2: BLOCKED BY BROWSER/TEST LIMITATIONS; feasibility not established.** The installed headless Chromium registered the declared action shortcut, but Playwright keyboard input produced no observed `action.onClicked`, popup context or scripting grant. This result neither proves M2 feasible nor demonstrates that Chrome's real user-invoked model is unsuitable.

## Authority and preserved baseline

The owner's present BF-05 instruction supplies the exact eight-file local experiment scope and commands; it supersedes historical “no BF-05” stops only within this disposable fixture experiment. The proposed-status banner does not adopt a product permission set or authorize real sites. **BF-04 is independently accepted as documentation and published at `0afe5afd9b3257e5b04c2835bdcf8c09841fb152` (`0afe5af`), per the supplied owner instruction.** Local/upstream/live-tip equality verifies publication, not reviewer authority. Its [original design report](PHASE_07_BROWSER_FIRST_PERMISSION_LIFECYCLE_DESIGN.md), pending-review wording and [ADR-007](../../02_ARCHITECTURE_DECISIONS.md#adr-007-candidate-permission-and-lifecycle-design--2026-11-03-africacairo) remain byte-identical. Documentation acceptance is not permission adoption or security approval.

Read [BF-01 including R1](PHASE_07_BROWSER_FIRST_TAB_RECOGNITION_SPIKE.md), [BF-02](PHASE_07_BROWSER_FIRST_ARCHITECTURE_RECONCILIATION.md), [BF-03](PHASE_07_BROWSER_FIRST_CHROME_FIXTURE_SPIKE.md), BF-04, [ADR-006](../../02_ARCHITECTURE_DECISIONS.md#adr-006-browser-first-three-tab-owner-direction--2026-11-03-africacairo)/ADR-007, [owner direction](PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md), [contracts](../../08_INTEGRATION_CONTRACTS.md), [security policy](../../09_SECURITY_AND_SECRETS.md), [Phase 07](PHASE_07.md), [current status](../../00_PROJECT_STATUS.md), [test evidence](../../04_TEST_EVIDENCE.md), and the master plan. Inspected [production manifest](../../../manifest.json), popup markup/JavaScript and worker read-only: permission-free preview scaffold with default popup and install-listener stub. Inspected the [BF-03 standalone harness](../../../test/browser-first-tab-recognition-browser.mjs), reusing its disposable launch, request isolation and controlled worker-stop pattern without changing/importing it or BF-01.

Historical evidence remains historical: BF-01 **29 focused / 242 full PASS**; BF-03 **43 PASS / 0 FAIL / 5 SKIP**, including **37 LOCAL_BROWSER_TESTED + 6 SIMULATED**. BF-04 performed documentation verification only and reran no Node/browser tests. Its independent documentation acceptance does not relabel any of these observations. The current 242-test run below is new regression evidence.

## Git preflight

| Field | Verified entry state |
|---|---|
| Root | `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` |
| Extension | `Sh_Project_Setup_extension` |
| All origin fetch/push URLs | `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| Branch | `feature/sh-project-setup-extension-clean` |
| HEAD / upstream / live branch tip | `0afe5afd9b3257e5b04c2835bdcf8c09841fb152` |
| Upstream name / divergence | `origin/feature/sh-project-setup-extension-clean` / 0 ahead, 0 behind |
| Complete staged / unstaged / untracked inventory | Empty / empty / empty; **226 tracked paths**, all preflight hashes equal HEAD, all tracked flags `H` |
| Linked worktrees | Current root at `0afe5af`; preserved sibling `/home/https_ali_muhammed/Plementus/Tools`, branch `feature/sh-project-setup-extension`, HEAD `390c9ea7c311f362ea04aad64ed14569161642ec` |
| Snapshot | `/tmp/bf05-evidence-q77mzx6k/baseline.json`: tracked SHA-256 values, raw index hash, index-entry hash, history hash and HEAD |

Read-only Git queries covered root, branch, all remote URLs, HEAD/upstream/live tip, divergence, complete porcelain including every untracked path, index entries/flags, linked worktrees and history. The live-tip query used `git ls-remote`, never fetch. No sibling operation; no clone, checkout, fetch, reset, stash, merge, stage, commit or push. Ignored `.idea/workspace.xml` was excluded from every content read, hash and edit; only its ignored path was inventoried.

## Bounded design and execution ledger

No product caller, test, fixture, config, export, popup, worker, dependency or permission change is required. Only the new [standalone harness](../../../test/browser-first-activetab-browser.mjs), this report and six dated tracking inserts are in scope. Their earlier bodies remain exact suffixes after unchanged titles. The user's allowlist overrides skill-default extra plans/workspaces, commits and branch integration. Brainstorming's explicitly authorized spike exception applies; assertions are built into the observation harness, with no production implementation or synthetic invocation stub.

1. Verify exact Git identity and snapshot tracked/index/history state outside the repository.
2. Inspect the required records/code and current official Chrome sources; retain all security gates.
3. Generate isolated extensions, three distinct-origin role fixtures, cross-origin fixture and profiles; establish uninvoked denial before attempting browser shortcuts.
4. Require a Chrome event/context and matching read capability. If absent, record BLOCKED/NOT RUN and skip dependent grant tests; never manufacture a grant.
5. Observe supported review/worker/browser lifecycle and uninvoked negative cases; close contexts/servers and remove generated directories in `finally`.
6. Run the required Node/syntax/browser commands, preserve historical evidence, update only the six allowed documents and verify scope/bytes/index/history/links/whitespace before stopping.

Ruling: a declared `_execute_action` shortcut is the smallest supported action attempt exposed by this harness. `chrome.commands.getAll()` registration is only configuration evidence. Playwright key delivery, tab selection and extension-page status messages are not invocation evidence. A missing browser event/grant remains blocked; no toolbar click, native human gesture or browser accelerator handling is inferred from keyboard input.

## Disposable extensions and network boundary

Both variants are generated under `/tmp/bf05-activetab-*`, each with its own disposable profile and extension directory. The action variant's exact manifest is:

```json
{
  "manifest_version": 3,
  "name": "BF05 disposable action",
  "version": "1.0",
  "permissions": ["activeTab", "scripting"],
  "background": { "service_worker": "worker.js" },
  "action": {},
  "commands": {
    "_execute_action": { "suggested_key": { "default": "Ctrl+Shift+Y" } }
  }
}
```

The second manifest changes only the name to `BF05 disposable popup` and `action` to `{ "default_popup": "popup.html" }`. Neither declares `tabs`, host/optional permissions, webNavigation, content scripts, cookies, storage, identity, debugger, webRequest, OAuth or a production integration. Chrome's actual permission inventory is asserted to equal `activeTab`/`scripting` with no origins. `chrome.webNavigation` is observed unavailable. No permission request/removal, CDP permission override, callback invocation, injected user-activation flag or direct action dispatch exists.

Both variants package a static `review.html`, a static popup page and a worker with a real top-level `chrome.action.onClicked` listener. Only that listener can append invocation observations; it captures Chrome's supplied `tab.id` before awaiting a bounded isolated-world main-frame read of fixture URL/title. The read-only review-page status handler returns volatile boot/event records, `accountVerified: false`, `executionAuthorized: false`. It checks the exact packaged sender URL/extension ID and accepts only `{ kind: 'status' }`; no selection, grant, callback or execution command can be sent through it. No event was appended during the observed run.

Three invented pages use separately allocated `127.0.0.1` HTTP ports for Plementus/GitHub/Odoo.sh roles. A fourth on `127.0.0.2` is reserved for cross-origin testing; it was started but not navigated because no invocation grant existed. A duplicate-origin GitHub fixture is created separately. The four fixture HTML files are generated under the same owned OS temporary root and served from there. These are static invented pages with no accounts, forms, credentials, provider replicas, scripts, external assets or business state. Fixture requests accept GET only and return a restrictive CSP/no-store response. Driver role choices are test stimuli, not human-selection UX evidence; no BF-01 synthetic selection assertion is counted here.

Launch uses installed Playwright-managed Chromium, `--headless=new`, disabled background networking/component updates/sync and no first-run/default-browser check. A loopback proxy rejects all HTTP/CONNECT attempts without forwarding; only `127.0.0.1`/`127.0.0.2` bypass it. A context allowlist permits only the exact four fixture origins and current generated extension origin, rejecting unexpected page traffic. No user profile or real GitHub/Odoo.sh/Plementus/customer site is opened. Public documentation and mandated read-only Git publication queries are separate from this browser experiment's traffic boundary. No screenshot, private DOM, page-state write, credential/session/cookie/storage read, authenticated endpoint or provider operation occurs. Browser-profile files are temporary test infrastructure, not product persistence. No packet capture or OS-wide egress certification is claimed.

## Actual invocation and grant observations

The negative baseline runs first for each variant: explicit fixture tabs are created, each role is activated with `tabs.update({active:true})`, scripting is attempted, sensitive URL metadata is read, and worker status is inspected. All three roles and the uninvoked duplicate deny scripting; role URL metadata is absent and invocation events remain empty. Programmatic selection/activation supplies no activeTab grant.

`chrome.commands.getAll()` then returns `_execute_action` with shortcut `Ctrl+Shift+Y` in each variant. For each action-variant role, the driver activates that exact Chrome ID, brings its corresponding fixture page to front, asserts `tabs.get(id).active === true`, and sends `page.keyboard.press('Control+Shift+Y')`. It waits up to five seconds for the worker's Chrome-supplied `action.onClicked` observation. The popup variant makes one analogous attempt and observes `runtime.getContexts({contextTypes:['POPUP']})` as well as the action listener.

| Invocation attempt | Actual outcome | Evidence tier |
|---|---|---|
| Action variant, Plementus role | No action event; read injection still denied | **BLOCKED / NOT RUN** |
| Action variant, GitHub role | No action event; read injection still denied | **BLOCKED / NOT RUN** |
| Action variant, Odoo.sh role | No action event; read injection still denied | **BLOCKED / NOT RUN** |
| Popup variant, Plementus role | No observable popup context or action event; read injection still denied | **BLOCKED / NOT RUN** |
| Genuine invoking-tab ID association | No invocation event exists to supply/verify it; activation IDs alone are insufficient | **NOT RUN** |
| Sequential grants and three simultaneously usable grants | No genuine grant prerequisite established | **NOT RUN** |

The obstacle is the installed **Playwright + new-headless Chromium harness's lack of an observed recognized browser action from this key-input path**. It is not proved whether the accelerator was never processed, browser UI handling was unavailable, or another browser-level condition prevented invocation. No alternative host-granted test, programmatic popup opening, message dispatch, callback call or CDP grant was substituted. The generated success-path assertions are unexecuted and supply no evidence. **M2 feasibility remains blocked; the combined optional-webNavigation guided architecture was not exercised.**

## Lifecycle case matrix

| Case | Actual observation / limit |
|---|---|
| Duplicate-origin tabs | Real distinct IDs and uninvoked injection denial observed in both variants. Closing/reopening the uninvoked duplicate produces a new ID; closed ID is unavailable and reopened ID denies scripting. Granted-versus-ungranted duplicate isolation is NOT RUN |
| Same-origin full navigation and reload with an invoked grant | **NOT RUN**, missing genuine grant; no retention assertion executed |
| Cross-origin navigation and loss/return of invoked access | **NOT RUN**, cross-origin server unused; BF-03's historical host-grant case is not substituted |
| Invoked-tab closure and same-URL reopening | **NOT RUN**; the uninvoked duplicate test above is narrower |
| Changed document and stale-document targeting | **NOT RUN**, no invoked injection/document result obtained; no fabricated document ID |
| Unavailable capability | `webNavigation` absent; scripting denied before invocation/after failed attempts. No product expiry policy or clock/retention change implemented |
| Review-page close/reopen | Actual packaged page closed/reopened in both variants; read-only status available and authority remains false. No human assignment, review binding or product UI-loss guard implemented |
| Forced worker restart | Driver CDP `ServiceWorker.stopWorker`, observed stopped status, then read-only status reactivation changes boot and has an empty event list; previously ungranted Odoo.sh read remains denied. Not natural suspension/crash |
| Controlled browser restart | Explicit context close/relaunch in the same disposable action profile; new worker boot and empty events, no automatic fixture replay. A newly created Odoo.sh fixture denies injection. Not crash/session restoration or same-tab grant-survival evidence |
| Grant behavior across review/worker/browser restart | **NOT RUN**, no invocation grants existed; volatile-state observations do not prove Chrome grant revocation |
| Popup versus onClicked | Manifest/getPopup configuration observed. Documentation says a configured popup suppresses onClicked; actual invocation/popup focus-loss/close/reopen **NOT RUN** because no genuine popup was observed |
| Natural idle suspension, crash, restoration, prerender replacement, expiry | **NOT RUN**; no controlled restart promoted to those cases |
| Optional permission prompt denial/removal | **NOT RUN**; no optional permissions declared/requested |

The driver uses external CDP only to force the disposable worker stop; generated manifests have no debugger permission. Navigation/closure/restart stimuli never implement business actions, recovery, retry, replay or a product workflow bridge. No browser permission establishes account identity, business rights or approval to write.

## Commands, counts and cleanup

Run from the extension root using **Node v24.19.0**, installed **Chrome for Testing 151.0.7922.34**, executable `/home/https_ali_muhammed/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`. No dependency installed.

| Command / metric | Actual result |
|---|---|
| `node --test test/*.test.mjs` | **242 PASS**, 0 FAIL/SKIP/CANCELLED/TODO; exit 0; existing baseline preserved |
| `node --check test/browser-first-activetab-browser.mjs` | **PASS**, exit 0 |
| `node test/browser-first-activetab-browser.mjs` | **30 cases: 16 PASS / 0 FAIL / 10 SKIP / 4 BLOCKED**; exit 1 deliberately signals blocked invocation, not a passing feasibility result |
| Passing evidence split | All passing browser cases **LOCAL_BROWSER_TESTED**; **0 SIMULATED** selection cases counted; blocked/skipped groups **NOT RUN** |
| Genuine observed invocations / verified grants | **0 / 0**; all actual injection attempts denied or closed-tab unavailable |
| Fixture GET requests / unexpected page requests / rejected fixture requests | **11 / 0 / 0**, all fixture requests loopback GET |
| Proxy-rejected requests/CONNECT attempts | **65**; none forwarded, destinations/content not logged |
| Cleanup | **PASS**, all disposable contexts, servers, extensions and profiles cleaned |
| Account / execution authority | Always **false / false**; no live-provider or security-acceptance tier |

Scratch evidence at `/tmp/bf05-evidence-q77mzx6k/`: `baseline.json`, `node-full.txt`, `browser-first.txt`, `browser-second.txt`, `browser-reset-failed.txt`, `browser-proxy-fixed.txt`, `browser-final.txt`, proxy-reset RED/GREEN logs and structural verification script/result. First observation run had **13 PASS / 0 FAIL / 10 SKIP / 4 BLOCKED** (27 cases), 9 fixture requests, 0 unexpected/rejected requests and 60 proxy rejections; cleanup passed. Author review added explicit uninvoked duplicate close/reopen checks and a post-worker denial assertion. A subsequent tightening snapshots worker boot/events before each keyboard attempt and requires the same boot and unchanged complete event list on the blocked path; wrong-tab or incomplete events cannot silently become “invocation unavailable.” `ATTEMPT` logs show expected activated IDs, never claimed invoking IDs. These are harness completeness corrections, not production changes. An intermediate rerun then aborted on an unhandled proxy CONNECT socket `ECONNRESET`: **7 completed PASS / 3 BLOCKED / 6 SKIP**, no aggregate RESULT, and `finally` was not reached. No surviving matching browser process was observed afterward; OS process exit closed its servers. The exact owned leftover `/tmp/bf05-activetab-yemIPn` was verified as this fixture extension and manually removed, without touching any other directory. The denying proxy now attaches an error handler to destroy a reset CONNECT socket, keeping the error from escaping the async try/finally. A temporary assert-based regression extracting the actual proxy handler demonstrated **RED: 1 failed assertion; GREEN: 1 SIMULATED proxy-reset PASS**, separate from browser/selection/invocation evidence. Logs `proxy-reset-red.txt`/`proxy-reset-green.txt` retain both outcomes. The proxy-fixed rerun completed **16 PASS / 0 FAIL / 10 SKIP / 4 BLOCKED**, with 11 fixture requests, zero unexpected/rejected traffic, 66 proxy rejections and finally cleanup PASS; its log is `browser-proxy-fixed.txt`. A final scope review also placed the static HTML fixture files under the owned temporary root, rather than serving in-memory strings; the HTTP content is unchanged and the browser run was repeated. The final browser rerun above governs current evidence; earlier success and failure logs remain historical. No natural-lifecycle or real-human result is inferred.

Cleanup is in `finally`, including failure paths: close any live context, close every server/connection, verify the generated root belongs to this process under the OS temporary directory, remove only that owned root, and assert no fixture/proxy listener or generated profile/extension remains. Cleanup errors increment FAIL and do not suppress the aggregate result. Scratch text/JSON evidence is separate and retained outside Git; it contains invented local observations, no screenshots or real-site data.

## Current official Chrome sources

Retrieved **2026-11-03 (Africa/Cairo)** with `web.run`. Documented semantics are separate from actual observed cases above.

| Official source | Supported fact and evidence boundary |
|---|---|
| [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) | User invocation enables temporary tab access; same-origin navigation can retain it, cross-origin navigation/closure revoke it. Only uninvoked denial was established here |
| [Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting) | Requires scripting plus host/activeTab access; default main-frame isolated world, document results/targeting. No granted read or document ID obtained here |
| [Action API](https://developer.chrome.com/docs/extensions/reference/api/action) | onClicked supplies the invoking tab; configured popup suppresses it. Configuration observed; invocation unavailable |
| [Commands API](https://developer.chrome.com/docs/extensions/reference/api/commands) | `_execute_action` triggers the action and does not dispatch onCommand; getAll reports configured shortcuts. Registration alone is insufficient |
| [Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs) | Tab creation/activation needs no tabs permission; sensitive metadata needs applicable access. IDs/active flags and absent URL metadata observed |
| [webNavigation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation) | Separate permission and document/navigation signals. No declaration/request here; namespace unavailable |
| [MV3 worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Worker globals can be lost; incoming events/APIs affect lifecycle. Controlled restart only; no natural suspension or storage authorization |
| [Permission declarations](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) | Named, host and optional categories differ. Both generated manifests declare only activeTab/scripting |
| [Popup behavior](https://developer.chrome.com/docs/extensions/develop/ui/add-popup) | Popup can be shortcut-invoked and closes on outside focus. Actual popup lifecycle remains NOT RUN |

## Exact scope and preservation

All paths relative to the extension root; **two new + six modified = eight**:

| Change | Path |
|---|---|
| New | `test/browser-first-activetab-browser.mjs` |
| New | `docs/Phases/phase07/PHASE_07_BROWSER_FIRST_ACTIVETAB_INVOCATION_SPIKE.md` |
| Modified | `docs/Phases/phase07/PHASE_07.md` |
| Modified | `docs/00_PROJECT_STATUS.md` |
| Modified | `docs/03_CHANGELOG.md` |
| Modified | `docs/04_TEST_EVIDENCE.md` |
| Modified | `docs/05_BLOCKERS_AND_DECISIONS.md` |
| Modified | `docs/06_HANDOFF.md` |

Structural verification **PASS**, `python3 /tmp/bf05-evidence-q77mzx6k/verify.py`, exit 0: exactly **eight allowed paths (two new, six modified), zero staged/unexpected**; **220 protected tracked files** equal preflight and HEAD; all **six complete original tracking bodies** preserved after unchanged titles. Raw index bytes, index entries/flags, 226-path tracked inventory, history hash, branch/HEAD/upstream/live tip and both linked worktrees unchanged. Master/canonical bytes equal original SHA-256 **`d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91`**. Seven changed Markdown files: **349 local links / 45 fragment targets / 0 broken**; all **87 extension Markdown files: 912 local links / 143 fragment targets / 0 broken**. Nine official Chrome sources reviewed separately from browser evidence. Diff whitespace, both new files' no-index whitespace checks, LF/single-final-newline checks PASS. No generated `bf05-activetab-*` directory remains after final cleanup. Checker/results and proxy regression are outside Git in the scratch evidence directory.

Protected targets include BF-01 source/tests/report, BF-02/BF-03/BF-04 reports, BF-03 harness, ADR-006/ADR-007, product manifest/source/popup/worker, existing tests/fixtures/dependencies, contracts/security/SEC-01, Phase 04/06, master/canonical sources and all unrelated tracked files. Six earlier tracking bodies are retained verbatim, including original review states, historical evidence and stops. Dated BF-05 entries govern only this experiment; no new BF-02 acceptance is invented.

Skills applied: Superpowers using-superpowers, brainstorming's authorized-spike exception, executing-plans/TDD guidance as limited by the disposable-spike scope, systematic-debugging for the proxy reset, verification-before-completion; Ponytail full. Tools actually used: shell/Git/Python and apply_patch through `functions.exec`, installed Playwright/Chromium and external-driver CDP worker stop, `web.run` for official Chrome documentation. WarpGrep and Valyu unavailable. Author self-review only; no subagent, authenticated connector, user browser or computer-use tool used. Skill-default implementation/review/publication workflows do not expand the owner's eight-file spike scope. Independent ChatGPT acceptance remains outstanding.

## Security and stop gate

Progress remains **5/20 master phases; 28/72 micro-phases**. Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED**; Phase 07 **IN_PROGRESS / NOT ACCEPTED**; 07.03 **NOT_STARTED / NOT_AUTHORIZED**; D-04/B-02/B-03 **OPEN**; twelve historical owner/security decisions **PENDING**; production **NO_GO**. Successful fixture assertions grant no security approval, identity/rights evidence, live-site permission or write authority. SEC-01/recovery/clock/retention and possible-write reconciliation gates are untouched.

**READY_FOR_CHATGPT_REVIEW / LOCAL_FIXTURE_BROWSER_ONLY. STOP.** No BF-06, Phase 07.03, real-site inspection, production permission adoption, staging, commit or push.
