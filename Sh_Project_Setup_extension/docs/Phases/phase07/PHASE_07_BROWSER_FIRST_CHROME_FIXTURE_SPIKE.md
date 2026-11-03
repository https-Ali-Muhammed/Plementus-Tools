# BF-03: Isolated Chrome three-tab recognition verification

2026-11-03 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW / LOCAL_FIXTURE_BROWSER_ONLY**. The owner explicitly authorized BF-03 execution in the exact eight-file scope, including an isolated Chrome test against invented loopback fixtures. This supersedes the proposal's execution gate only for BF-03; it does not supply BF-02 acceptance, product permissions, real-site access or Phase 07.03 authorization.

## Bounded design and verification plan

Use the existing Playwright-managed Chromium and Node standard library. Generate temporary MV3 extensions, profiles and local HTTP fixtures under an OS temporary directory. Compare permission-free, metadata-only and loopback-host-granted variants. An external-denying loopback proxy and context request allowlist constrain traffic. Explicit test-driver role selections use actual Chrome tab IDs, never first-match assignment. Injection only reads fixture document information. Fixture links exercise same-document and full navigation; no business data or forms exist.

The independent [BF-01 evaluator](../../../src/browser/tab-recognition.mjs) and [accepted tests](../../../test/tab-recognition.test.mjs) remain unchanged. Never import that evaluator, relax its HTTPS/origin contract, disguise loopback URLs or feed actual Chrome observations into synthetic BF-01 records. Real `documentId` values come from supported webNavigation/scripting APIs, never from an invented Tab property. All harness decisions remain `accountVerified: false` and `executionAuthorized: false`.

- [x] Reverify exact repository identity/live tip and clean complete worktree inventory; snapshot tracked bytes and raw index outside Git.
- [x] Implement only the disposable browser harness with assert-based checks and cleanup in `finally`.
- [x] Run the existing full Node suite (242 PASS) and browser harness; record actual outcomes and unsupported cases.
- [x] Update only the six allowed tracking files; preserve their earlier bodies exactly.
- [x] Verify final syntax, eight-file scope, protected bytes, index/history, canonical sources, Markdown links and whitespace; stop for independent acceptance.

No production caller, config, export, fixture, manifest or dependency change is needed. The user's exact allowlist and no-commit instruction override skill-default workspaces, extra plan artifacts and publication steps. The authorized-spike exception applies; assertions in the harness test Chrome observations rather than implementing a product adapter.

## Preflight and required reading

Verified before edits: root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`, extension `Sh_Project_Setup_extension`, branch `feature/sh-project-setup-extension-clean`, origin fetch/push `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`, upstream `origin/feature/sh-project-setup-extension-clean`. HEAD, upstream SHA and live branch tip all **`8b9ed8afa53dfc51dd8f52e62357711a953d1c17`**, divergence 0/0. Complete tracked/staged/untracked worktree inventory was clean. Both linked worktrees were inventoried; the sibling was not operated on. Ignored `.idea/workspace.xml` contents were never read, hashed or changed.

Read-only Git commands included root/HEAD/branch/upstream queries, origin fetch/push URLs, full porcelain status, `git worktree list --porcelain`, `git ls-files --stage -z`, `git rev-list --all`, index hashing and `git ls-remote --exit-code origin refs/heads/feature/sh-project-setup-extension-clean`. No fetch or other Git mutation. Baseline contains **223 tracked paths**, index bytes/entries and history hashes at `/tmp/bf03-evidence-ah1v1rl7/baseline.json`.

Reviewed [BF-01 including R1](PHASE_07_BROWSER_FIRST_TAB_RECOGNITION_SPIKE.md), [BF-02](PHASE_07_BROWSER_FIRST_ARCHITECTURE_RECONCILIATION.md), [ADR-006](../../02_ARCHITECTURE_DECISIONS.md#adr-006-browser-first-three-tab-owner-direction--2026-11-03-africacairo), [owner amendment](PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md), [contracts](../../08_INTEGRATION_CONTRACTS.md), [security](../../09_SECURITY_AND_SECRETS.md), [Phase 07 parent](PHASE_07.md), [test evidence](../../04_TEST_EVIDENCE.md), [master plan](../../01_MASTER_PLAN.md), and the existing [clock-source](../../../test/sec01-clock-source-browser.mjs) and [cleanup](../../../test/sec01-cleanup-browser.mjs) isolated Chromium harnesses. The existing persistent-context launch and forced-worker-stop pattern was reused without copying production modules or changing existing harnesses.

## Disposable test design and exact manifests

The [standalone harness](../../../test/browser-first-tab-recognition-browser.mjs) generates three extensions and three fresh profiles under `/tmp/bf03-chrome-fixture-*`. Each manifest has `manifest_version: 3`, `version: 1.0`, a generated `worker.js`, and `action.default_popup: popup.html`; no content scripts, storage, cookies, identity, debugger or webRequest permissions. Exact permission differences:

| Variant | `permissions` | `host_permissions` | Observed boundary |
|---|---|---|---|
| restricted | `[]` | absent | Real IDs/status available; URL, pending URL, title and favicon fields absent on completed selected tabs; scripting/webNavigation namespaces unavailable |
| metadata | `["tabs", "scripting", "activeTab"]` | absent | Selected URL/title available; injection into all three selected tabs denied; declaring activeTab and choosing tabs supplies no invocation grant |
| host | `["scripting", "webNavigation"]` | `["http://127.0.0.1/*"]` | Host metadata and read-only injection available without `tabs`; webNavigation exposes document identity. Host grant covered all three fixture ports, so exact-port role binding needs a separate application check |

There are **no optional permission declarations or requests**. These permissions exist only in generated temporary manifests. The production permission-free manifest remains byte-identical. Installing an unpacked disposable extension with declared host access is not evidence of a displayed/accepted permission prompt or an approved product permission model.

Three static invented role pages run on separately allocated `127.0.0.1` HTTP ports. A fourth invented endpoint on `127.0.0.2` tests cross-host loss of host access. The final run used Plementus `36343`, GitHub `43745`, Odoo.sh `40233`, cross-host `32803`; ports are ephemeral. These are invented roles, not provider replicas. No account/session values, credentials, customer data, business forms or external resources exist.

The driver explicitly creates/selects each role with `chrome.tabs.create()` and retains its returned ID. Duplicate candidates are explicitly created and identified, never discovered or assigned by first matching URL. Each API read/injection targets an explicitly chosen local fixture ID; event observations filter those IDs and the main frame. Driver selection intent and validation are **SIMULATED**, not evidence of human selection UX or operator identity. Actual Chrome IDs/metadata/API effects are **LOCAL_BROWSER_TESTED**.

Read-only `scripting.executeScript()` returns only fixture URL/title in the default isolated world. Document identity comes from `InjectionResult.documentId` and `webNavigation.getFrame({ tabId, frameId: 0 })`; Tab objects are checked to have no `documentId` property. IDs are treated as opaque nonempty strings. No page script reads cookies, storage, authentication state or private JS globals. Controlled fixture links change fragment/history/full URLs; these are navigation stimuli, not business-state writes or form edits.

Chrome launches with `--headless=new`, background networking/component update/sync disabled, no first-run/default-browser check, only the generated extension loaded, and a loopback HTTP proxy that rejects every request/CONNECT without forwarding. Only `127.0.0.1` and `127.0.0.2` bypass that proxy. A context allowlist permits only the exact four fixture origins and the generated extension origin; all other page requests are aborted. Fixtures bind only their loopback address. No network packet capture or OS-wide egress certification is claimed.

## Actual execution evidence

Commands run from the extension root with **Node v24.19.0** and installed Playwright-managed **Chrome for Testing 151.0.7922.34**, executable `/home/https_ali_muhammed/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`. No package installation or dependency changes.

| Command / check | Actual result |
|---|---|
| `node --test test/*.test.mjs` | **242 PASS**, 0 FAIL/SKIP/CANCELLED/TODO; exit 0; existing suite unchanged |
| `node test/browser-first-tab-recognition-browser.mjs` | **48 cases: 43 PASS, 0 FAIL, 5 SKIP/NOT RUN, 0 prerequisite BLOCKED**; exit 0 |
| Passing browser-harness evidence split | **37 LOCAL_BROWSER_TESTED**, including cleanup/network checks; **6 SIMULATED** selection-validation cases |
| Final fixture HTTP requests | **38**, loopback only |
| Unexpected page requests | **0** |
| Proxy-rejected browser-process requests/CONNECT attempts | **68**, all refused without forwarding; destinations/content not logged |
| Cleanup | All three profiles/generated extensions removed and servers closed after final run; cleanup also passed on both failed development runs |
| Account / execution authority | Always **false / false**; no provider evidence tier earned |

Scratch evidence: `/tmp/bf03-evidence-ah1v1rl7/` contains `node-full.txt`, `browser-first.txt`, `browser-second.txt`, `browser-third.txt`, `browser-final.txt`, baseline/original tracking bodies and structural verification. These contain only invented local observations and sanitized aggregate counters, not screenshots or real-page evidence. Final logs enumerate every PASS/SKIP.

Development history is retained honestly: first browser run **24 PASS / 1 FAIL** because the harness incorrectly required UUID display formatting. Chrome returned a different opaque string format; the fix checks nonempty strings plus cross-API identity agreement. The second run had **41 PASS / 5 SKIP**. Adding stale-document and actual-popup checks produced **39 PASS / 1 FAIL**: `action.openPopup()` resolved, but no popup page was observable through Playwright within five seconds. That case is now explicitly SKIP/NOT RUN for this harness, with no claim about whether Chrome displayed a popup. Final run above adds actual required-host removal observation and passes all supported assertions. These were harness assumptions/observability limits, not production defects.

## Case matrix and evidence limits

| Cases | Count | Tier / result |
|---|---|---|
| Explicit role choices with actual distinct IDs, across three variants | 3 | LOCAL_BROWSER_TESTED PASS; choices supplied explicitly by the test driver |
| Missing roles/empty selection; duplicate roles/reused IDs | 6 | SIMULATED PASS; driver-only assert validation, no user-facing selector implementation |
| Selected tab metadata; separate injection capability | 6 | LOCAL_BROWSER_TESTED PASS across all variants |
| activeTab present but uninvoked | 1 | LOCAL_BROWSER_TESTED PASS: injection denied for all three selected tabs; no user-invoked grant tested |
| webNavigation absent without its permission | 2 | LOCAL_BROWSER_TESTED PASS |
| Duplicate-origin candidate preserves original explicit choice; closed ID rejected; reopened same-URL candidate gets new ID | 9 | LOCAL_BROWSER_TESTED PASS; close/reopen is not Chrome's prerender replacement event |
| Host access covers three ports without tabs; webNavigation/scripting document identity agrees | 2 | LOCAL_BROWSER_TESTED PASS; actual origin/port metadata observed |
| Fragment/history route change | 2 | LOCAL_BROWSER_TESTED PASS: full URL changes and corresponding events observed; same document ID retained |
| Full navigation/reload; stale-document injection target | 3 | LOCAL_BROWSER_TESTED PASS: tab ID retained, document ID changes; old document-targeted read injection rejected |
| Cross-host navigation; webNavigation still observes document outside host injection grant; return to original host | 3 | LOCAL_BROWSER_TESTED PASS: metadata/injection denied on cross-host, document changes; return restores manifest access, not old context |
| Required-host permission removal | 1 | LOCAL_BROWSER_TESTED PASS for refusal: `permissions.remove()` rejected; existing host access remained. **Actual grant revocation NOT RUN** |
| Extension-page close/reopen; forced worker stop/reactivation; controlled browser close/reopen | 3 | LOCAL_BROWSER_TESTED PASS: page-local and worker-local states are separate; worker restart loses volatile selection, no automatic replay |
| Page allowlist and profile/extension cleanup | 2 | LOCAL_BROWSER_TESTED PASS |
| Actual action popup lifecycle | 1 | SKIP / NOT RUN: openPopup resolved, popup page not observable; extension-page loss is narrower evidence |
| Genuine consent accept/deny and optional-grant removal | 1 | SKIP / NOT RUN: no actual Chrome prompt or optional grant exercised; API injection denial is not user denial |
| Invoked activeTab grant and navigation revocation | 1 | SKIP / NOT RUN: no toolbar invocation processed; host-grant navigation loss does not prove activeTab revocation |
| Natural idle suspension, crash, session restoration | 1 | SKIP / NOT RUN: forced CDP stop and explicit browser reopen do not prove these behaviors |
| `tabs.onReplaced` / prerender swap | 1 | SKIP / NOT RUN: not induced; new IDs after close/reopen are narrower evidence |

Forced-worker testing used external test-driver CDP `ServiceWorker.stopWorker`; the generated extension has no `debugger` permission. Browser close/reopen was an explicit lifecycle experiment in the disposable profile, followed only by a read/status request; no stored selection was resumed, no fixture work was recreated/replayed, and no startup/recovery policy was implemented. Natural timing, event races, user consent and real profile behavior remain unverified.

## Official Chrome sources consulted

Retrieved 2026-11-03 (Africa/Cairo). Platform documentation supports semantics, not live-provider compatibility or security acceptance.

| Official source | Relevant fact and local boundary |
|---|---|
| [Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs) | Most tab management needs no tabs permission; sensitive metadata needs tabs or applicable host access. Completed selected tabs were tested; pending-navigation metadata/timing races were not |
| [Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting) | Injection needs scripting and host/activeTab access. Injection results carry documentId and can target documentIds. Local read-only agreement/stale-target denial observed |
| [webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation) | Separate permission; main-frame document identity and fragment/history events. It can expose selected navigation metadata independently of host injection access, as observed locally |
| [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) | User invocation grants temporary current-tab access; same-origin navigation can retain it and cross-origin navigation revokes it. Only absence of an invocation grant was observed locally |
| [Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions) | Requests need a user gesture and declared scope; removing required permissions can fail. Local required-host removal rejection was observed; no actual consent prompt/optional revocation tested |
| [MV3 service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Workers can terminate and globals are lost. Forced stop/reactivation and controlled browser restart observed; natural idle/crash behavior unverified |
| [Match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns) | Host pattern scope and exact application origin checks are distinct. Loopback grant covered multiple ports; no product host model approved |

## Future adapter requirements; no adapter implemented

BF-01's synthetic `.example`/exact-GitHub HTTPS input contract remains unchanged. No real Chrome data is fed to it. A future separately authorized adapter would need fresh explicit human selection; exact scheme/host/port/full URL and profile/window/tab/frame/document bindings; current permission/API failure checks; pending-navigation/race handling; and invalidation on intervening route/navigation/closure/replacement/restart or grant loss. Document equality alone misses same-document route changes, and tab equality misses reload. Returning to the original origin can restore browser access without restoring old selection validity.

Do not infer account identity, website rights, provider authority or execution approval from title/origin/tab/document/permission agreement. Do not fabricate unavailable document/permission fields or translate loopback observations into accepted HTTPS fixtures. Decide any actual Chrome-to-product schema and minimum permission set under a new review. Human selection UX, supported popup handling, prompt denial/revocation, prerender replacements, runtime races, signed-out/wrong-account behavior and safe manual fallback remain future requirements. No production collection, adapter, messaging bridge, workflow authority, checkpoint, persistence, restart/replay, SEC-01 or policy implementation follows from this test.

## Exact scope and preservation

All paths are relative to `Sh_Project_Setup_extension`; exactly **two new + six modified = eight**:

| Change | Path |
|---|---|
| New | `test/browser-first-tab-recognition-browser.mjs` |
| New | `docs/Phases/phase07/PHASE_07_BROWSER_FIRST_CHROME_FIXTURE_SPIKE.md` |
| Modified | `docs/Phases/phase07/PHASE_07.md` |
| Modified | `docs/00_PROJECT_STATUS.md` |
| Modified | `docs/03_CHANGELOG.md` |
| Modified | `docs/04_TEST_EVIDENCE.md` |
| Modified | `docs/05_BLOCKERS_AND_DECISIONS.md` |
| Modified | `docs/06_HANDOFF.md` |

Final structural checks **PASS**: exactly eight allowed paths, **217 protected tracked files** equal baseline and HEAD, six original tracking bodies preserved, raw index/index entries/history unchanged, master/canonical SHA-256 `d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91`, **325 local links / 33 fragment targets / 0 broken**, syntax/newline/whitespace PASS. Author self-review made the duplicate candidate an explicit alternate role selection before closure; the final browser rerun retained **43 PASS / 5 SKIP**. Independent review is still required. Structural evidence is recorded in [tracking verification](../../04_TEST_EVIDENCE.md#bf-03-isolated-chrome-fixture-verification--2026-11-03-africacairo). Protected targets include BF-01 source/tests/report, BF-02 report, ADRs/contracts/security, all production files, existing tests/fixtures/dependencies, Phase 04/06, accepted historical reports, the [master](../../01_MASTER_PLAN.md) and [canonical source](../../_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md). Earlier tracking bodies remain exact suffixes after each retained title. New dated entries govern only this authorized fixture test; historical instructions/statuses remain historical, and no BF-02 acceptance is invented.

Skills applied: Superpowers using-superpowers, brainstorming's authorized-spike exception, writing-plans (bounded plan above), systematic-debugging and verification-before-completion; Ponytail full. Tools actually used: shell/Git/Python, apply_patch through functions.exec, installed Playwright/Chrome APIs/CDP, and web.run for public official Chrome documentation. WarpGrep and Valyu were unavailable; no authenticated connector, user browser session, screenshot or subagent was used. Independent ChatGPT acceptance is outstanding.

## Gates

Progress remains **5/20 master phases; 28/72 official micro-phases**. Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED**; Phase 07 **IN_PROGRESS / NOT ACCEPTED**; 07.03 **NOT_STARTED / NOT_AUTHORIZED**; production **NO_GO**. D-04/B-02/B-03 and historical owner/security decisions remain open/pending. No live-provider evidence tier is earned. No BF-04, real-site inspection, staging, commit or push.
