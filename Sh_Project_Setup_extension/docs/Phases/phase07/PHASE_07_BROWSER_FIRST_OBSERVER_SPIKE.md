# BF-09: Isolated Chrome observer trust-boundary verification

2026-11-04 (Africa/Cairo). **PARTIAL / BLOCKED / READY_FOR_CHATGPT_REVIEW / LOCAL_FIXTURE_BROWSER_ONLY / NON_COUNTED.** The owner explicitly answered “Authorize BF-09; I can perform the browser steps” after the proposal preflight. This authorizes only the supplied eight-file experiment. The owner subsequently answered “Unable; stop” for the fresh run's personal toolbar step; no further browser run is authorized before independent review.

## Bounded plan and authority

Implement BF-08 alternative A: one disposable observer, disconnected from BF-07. Use installed Playwright, Node standard libraries, a new headed Chromium profile, invented HTTP loopback fixtures, a denying proxy and exact request allowlist. The temporary manifest has only activeTab/scripting, a top-level action listener, worker and static packaged review page. No webNavigation, host/tabs/debugger/storage permissions or production integration.

- [x] Verify Git identity/live remote, complete status, index and linked worktrees; record protected-byte/Git baseline outside Git.
- [x] Obtain explicit owner authorization; inspect governing designs, historical evidence, current source/security/contracts and official Chrome documentation.
- [x] Create one standalone harness with assert-based checks; capture real invoking identity synchronously, keep captures unassigned until current review confirmation, discover then target the exact document.
- [x] Require owner visibility confirmation and personal toolbar/review clicks; distinguish deliberate adversarial stimuli from genuine Chrome events. One initial action/review pair observed; fresh-run invocation unavailable.
- [ ] Complete stale-document, delayed-completion, controlled-worker application-state and surviving-access cases: **BLOCKED / NOT RUN** after the recorded failure and unavailable fresh human invocation. No simulated substitute.
- [x] Close/remove only owned resources; run syntax, existing Node suite and structural/history/link/whitespace checks recorded below.
- [x] Insert records into exactly six tracking documents, preserving their complete prior bodies; STOP for independent review.

The scope reaches only the new harness, this report and six tracking inserts. No existing caller, export, fixture, config, dependency, policy, manifest, worker or BF-07 source/test change. The authorized-spike exception to Superpowers brainstorming applies; writing-plans guidance is confined to this report. The exact allowlist and review stop override extra plan artifacts, worktrees, commits and further implementation workflows.

## Preflight, references and preserved history

Root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`; extension `Sh_Project_Setup_extension`; branch `feature/sh-project-setup-extension-clean`; origin fetch/push `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`. HEAD, upstream and live remote branch tip matched **`e8a70219104e850db2b0f8c63f35776a3b737730`**, upstream `origin/feature/sh-project-setup-extension-clean`, divergence **0/0**, no staged/untracked paths at entry. Full entry status contained only the exempt `.idea/plemo-chats.xml` modification: path inventory only, never read, hashed, edited, staged or reverted. Ignored `.idea/workspace.xml` was never inspected. No clone/fetch/checkout/reset/stash/stage/commit/push.

Both linked worktrees inventoried: current root at e8a7021; sibling `/home/https_ali_muhammed/Plementus/Tools`, branch `feature/sh-project-setup-extension`, HEAD `390c9ea7c311f362ea04aad64ed14569161642ec`; no sibling operation. Baseline `/tmp/bf09-evidence-gbizawar/baseline.json` holds **234 tracked-file hashes excluding the forbidden IDE contents**, raw index/entries, refs/reflog, history and worktrees. Seven allowed non-exempt IDE files were subsequently included only after equality against HEAD, before any edit to them; no IDE file was edited.

The supplied instruction treats [BF-08](PHASE_07_BROWSER_FIRST_TRUST_BOUNDARY_DESIGN.md) as accepted documentation. Publication at the required tip is Git evidence, not independent review authority. BF-08's historical proposed wording remains unchanged. Inspected BF-08's provenance/ownership/verification matrix; [BF-07 source](../../../src/browser/selection-invalidation.mjs), [tests](../../../test/selection-invalidation.test.mjs) and [report](PHASE_07_BROWSER_FIRST_SELECTION_INVALIDATION_SPIKE.md); [BF-06](PHASE_07_BROWSER_FIRST_SELECTION_INVALIDATION_DESIGN.md)/[ADR-008](../../02_ARCHITECTURE_DECISIONS.md); [BF-04](PHASE_07_BROWSER_FIRST_PERMISSION_LIFECYCLE_DESIGN.md)/ADR-007; [BF-05 original](PHASE_07_BROWSER_FIRST_ACTIVETAB_INVOCATION_SPIKE.md), [headed R1 report](PHASE_07_BROWSER_FIRST_ACTIVETAB_HEADED_REMEDIATION.md) and [harness](../../../test/browser-first-activetab-headed-browser.mjs); [BF-03 report](PHASE_07_BROWSER_FIRST_CHROME_FIXTURE_SPIKE.md) and [harness](../../../test/browser-first-tab-recognition-browser.mjs). Read current manifest/worker, [security](../../09_SECURITY_AND_SECRETS.md), [contracts](../../08_INTEGRATION_CONTRACTS.md), [Phase 04](../phase04/PHASE_04.md)/SEC-01 cleanup-outcome and restart blockers, [Phase 06](../phase06/PHASE_06.md), [master](../../01_MASTER_PLAN.md), status and handoff. Historical BF-05 BLOCKED, R1 failures/success, BF-07 synthetic evidence and BF-08 design are protected.

## Observer collection and ownership contract

The [standalone harness](../../../test/browser-first-observer-browser.mjs) packages a temporary no-popup MV3 extension with exactly `permissions: ["activeTab", "scripting"]`, one worker, `review.html` and `review.js`. No host/optional permissions, tabs, debugger, storage, webNavigation, content scripts, commands, native messaging or provider capabilities. The product's permission-free manifest, popup and install-listener stub are unchanged. BF-07 is neither imported nor connected, and HTTP loopback is never mapped into HTTPS provider identity.

One invented fixture and its uninvoked same-origin control use separately retained Chrome tab identities on a single ephemeral `127.0.0.1` port; a negative control uses `127.0.0.2`. Only exact fixture GET paths and two packaged review assets are allowed. Static fixture content includes a constant boolean marker; no account, form, provider name, business state or external resource. Servers require loopback peer, GET and exact path; no-store and restrictive CSP. Chromium uses a new owned profile, headless false, background networking/component updates/sync disabled, a proxy that denies every HTTP/CONNECT without forwarding, and a Playwright exact-request allowlist. No screenshot, DOM dump, authentication/session inspection or normal-profile access. Proxy plus allowlist is not OS-wide egress certification; browser research/Git publication queries occur separately from this isolated browser traffic.

Only the top-level `chrome.action.onClicked` callback creates an unassigned capture. It copies browser-supplied tab/window identity synchronously before discovery or focus changes. Only the exact invented fixture URL is eligible; an event on a control is not adopted. Initial discovery executes a constant `true` with no DOM read and requires exactly one Chrome envelope, top frame 0 and a nonempty opaque document ID of at most 256 characters. This harness-specific defensive bound is not a general Chrome ID contract; unavailable metadata blocks the experiment. Discovery never creates verified context.

The worker allocates its review tab before navigating it to the static packaged page. A review connection must match extension ID, exact packaged URL/origin, Chrome-supplied document identity and active-at-port-creation lifecycle. `runtime.getContexts` must return exactly one current normal TAB context for that document and the worker-created review tab. The exact live port/document owns confirmation. A disconnected, wrong, second or prior review cannot reattach an old capture. Connection admission rechecks worker generation/capture after its await; disconnected-before-admission is refused. Creation-time lifecycle is not a freshness guarantee.

The only accepted port message has exactly `kind`, `boot` and `captureId`, with kind confirm and current matching values. It consumes that capture synchronously, once, before any await. Other runtime messages are uniformly refused; no external messaging bridge or arbitrary transition, selector, code, permission, invocation or state-dispatch interface exists. UI has an accessible disabled-by-default confirmation button and sends only after its actual trusted click handler; the worker does not treat a page-supplied human/permission/authorization flag as proof. Confirmation expresses this local read intent only; **accountVerified, executionAuthorized, approvalGranted and trustedContinuingContext remain false**.

The approved probe targets only `{ tabId, documentIds: [knownDocumentId] }`, in the default isolated world, returning one boolean from a fixed fixture attribute comparison. Chrome tab/window/full fixture URL/status/normal/undiscarded checks bracket the read. Require one result, frame 0, the exact expected document ID and boolean true; no tab-only, frame/allFrames/MAIN-world or broader-permission fallback. The 10-second per-read timeout only abandons that volatile operation, not a security TTL or trusted-clock claim. Known tab loading/URL changes, selected/review tab removal and owning-port loss discard capture/ownership and advance the private generation before further work. Every asynchronous admission checks the same live capture/owner/generation. Read completion reports only `fixture_read_observed`, with no verified or continuing context verdict.

External-driver inspection and narrowly named hold/release hooks are reachable through disposable worker evaluation, not runtime messages. The driver holds acceptance of a genuine completed scripting Promise, genuinely reloads the fixture, then releases the completion after invalidation. The hold/release and malformed-envelope/message stimuli are **SIMULATED**; the reload, Chrome result envelopes, denial and controlled worker stop/new boot are separately observed facts. Diagnostic polling can influence worker timing; no natural-idle result is inferred. Worker boot, captures and review ownership remain volatile, with no persistence/rehydration or replay from surviving Chrome access.

## Initial failure and diagnosis — preserved

The first full headed run (`browser-first.txt`, exit 1) recorded **11 PASS / 2 FAIL / 4 BLOCKED**, no SKIP: **7 LOCAL_BROWSER_TESTED passes + 4 SIMULATED passes**. One genuine action associated with the expected tab, one personal review click, exact-document read, duplicate/control denial, wrong review/capture and forged-message rejection passed. Chrome reported one controlled worker stop, but fresh-boot case 10 failed before a new boot was counted. Its outer RUN handler counted that same failure again; the raw total of two failures is retained here, not interpreted as two independent defects. Old-review-after-restart, surviving access, reload and delayed completion remained unrun. **3 fixture GETs / 0 unexpected page requests / 0 rejected fixture requests / 40 proxy denials / 0 forwarded**, cleanup PASS.

The harness incorrectly waited for a new Playwright `serviceworker` event after controlled stop. Current [official Playwright documentation](https://playwright.dev/docs/chrome-extensions) states that the Worker handle survives MV3 restart; installed Playwright **1.62.1** source also preserves that handle when its execution context restarts. A smaller fresh-headed diagnostic (`worker-repro.mjs`, `worker-repro.txt`, exit 0) observed Chrome stop, a different boot, the same usable Worker handle and **zero new serviceworker events**, without any invocation or capture. Its own generated profile/extension/proxy were removed. This reproduces the faulty expectation; the original full-run log did not retain a raw exception, so no exact original timeout/error text is claimed. The diagnostic is not case-10 application-state evidence. The harness now reuses the handle, still requiring a different boot and empty capture/ownership/confirmation/read state. Its outer failure accounting no longer duplicates an already recorded failing case. A fresh full run is required; no prior failure is relabeled PASS.

## Corrected fresh run and final case matrix

Both full runs used **Node v24.19.0 / Playwright 1.62.1 / headed Chromium 151.0.7922.34**, executable `/home/https_ali_muhammed/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`. No dependencies changed. Each created a new owned profile and required separate operator visibility/pinning confirmation before the negative baseline. X11 inspection used only candidate PID properties and geometry/map state of the owned Chromium window, never screenshots or other browser contents. Neither run used automated toolbar clicks, keyboard substitutes, callback dispatch or permission overrides. On asking about automated mouse clicks, the owner chose to continue with personal clicks, then later reported the required fresh toolbar action unavailable and requested a stop.

The corrected fresh run (`browser-second.txt`, exit 1) recorded **4 PASS / 0 FAIL / 13 BLOCKED / 0 SKIP**: **3 LOCAL_BROWSER_TESTED passes + 1 SIMULATED pass**. GUI/minimal permissions, pre-invocation denial and cleanup passed; the malformed-envelope self-check passed with invented inputs. No action event arrived within the 300-second deadline: **0 actual actions / 0 review clicks / 0 controlled stops / 0 fresh boots**. This is not proof that a click was attempted/rejected or that the GUI failed. The later owner response “Unable; stop” confirms no further human-action attempt is available in this task. The driver stopped all dependent cases and cleaned up. No third full run or synthetic invocation was attempted.

The following preserves each run's provenance. A pass from the initial run is not a pass of the corrected full observer. Case 10 remains a failed application-state verification followed by a blocked retest; the standalone worker diagnostic cannot replace it.

| Required case | Initial full run | Corrected fresh run | Evidence class and precise boundary |
|---|---|---|---|
| 1. Pre-invocation scripting denial | PASS | PASS | LOCAL_BROWSER_TESTED: selected, same-origin control and negative tab denied before any event |
| 2. Genuine action / invoking association | PASS: 1 action and expected tab | BLOCKED: no event within deadline | LOCAL_BROWSER_TESTED only for the initial actual callback; fresh post-restart action case 2B also BLOCKED |
| 3. Uninvoked duplicate/control denial | PASS | BLOCKED after invocation prerequisite | LOCAL_BROWSER_TESTED initial controls remain denied after the real grant; baseline denial also tested in fresh run |
| 4. Current packaged-review confirmation | PASS: 1 personal trusted UI click and one read | BLOCKED | LOCAL_BROWSER_TESTED initial exact owning document/port; no real account or execution approval |
| 5. Wrong/stale review/capture / duplicate confirmation | 5A/5B PASS; 5C NOT RUN | 5A/5B/5C BLOCKED | SIMULATED wrong packaged review, capture/boot/extra-key and duplicate stimuli with actual runtime rejection. Disconnected/superseded old review after fresh boot is not verified |
| 6. Page-originated forged messages | PASS | BLOCKED | SIMULATED page postMessage ignored with no bridge; deliberately injected fixed content-sender message uniformly rejected and its review-port impersonation refused using actual sender provenance. Not a live hostile-page security certification |
| 7. Exact document/frame/result | PASS | BLOCKED positive browser read | LOCAL_BROWSER_TESTED initial exact-target result: frame 0, one matching document, boolean true. Separate 7S SIMULATED malformed/missing/wrong/conflicting envelope self-check PASS in both runs |
| 8. Real reload / stale-document target | NOT RUN | BLOCKED | NOT_RUN: no genuine stale-target failure observed by BF-09; historical R1 cannot substitute |
| 9. Delayed result rejection | NOT RUN | BLOCKED | NOT_RUN: hold/release code exists but was not reached. No SIMULATED delayed-completion PASS is claimed |
| 10. Controlled stop / fresh boot with empty application state | FAIL after Chrome stop; outer handler double-counted failure | BLOCKED | LOCAL_BROWSER_TESTED stop count 1 in initial full run, but no successful fresh-boot/ownership assertion. Separate diagnostic observed a new boot with no capture; not application-state acceptance |
| 11. Surviving access cannot restore authorization | NOT RUN | BLOCKED | NOT_RUN: BF-09 never reached surviving-grant/old-review checks; retainedAccess false means unestablished, not observed revocation |
| 12. Isolation, negative controls and cleanup | PASS for executed boundaries | PASS for executed boundaries | LOCAL_BROWSER_TESTED fixture/proxy/allowlist and cleanup; post-grant negative controls only exercised in the initial run |

Every unexecuted required subcase is counted BLOCKED in that run's final summary. No unsupported-capability SKIP branch was reached; **zero measured SKIPs does not mean those capabilities were tested**. Continuous navigation and optional grant/removal, natural idle/crash, BFCache/prerender, browser session restoration, three-role aggregation, real sites/account rights and production UI security remain **NOT RUN / UNVERIFIED**. No trusted continuing-context verdict is emitted. The code's existing tab-loading invalidation is not full navigation coverage, and sender lifecycle at connection creation cannot establish it. Same-document or delayed-event races and a hostile shared DOM remain outside the evidence. The unexercised final stale/superseded/restart branches require separate authorized rerun after review.

## Commands, privacy and cleanup evidence

Executed from the extension directory:

```text
node --test test/*.test.mjs
node --check test/browser-first-observer-browser.mjs
node test/browser-first-observer-browser.mjs
```

The existing Node suite reports **288 PASS / 0 FAIL / 0 SKIP / 0 CANCELLED / 0 TODO** in `node-full.txt`. No dependency installation or existing test edit. New harness syntax check **PASS, exit 0** after the final code correction. Both full runs syntax-checked their generated worker/review scripts successfully before launching Chrome. Harness full-run exit 1 is deliberately retained for incomplete/failed evidence, not reported as success. Assert-based envelope checks are part of the new disposable script, not additional Node-suite tests.

| Metric | Initial run | Corrected fresh run |
|---|---|---|
| Fixture GETs | 3 | 3 |
| Unexpected page requests | 0 | 0 |
| Rejected fixture requests | 0 | 0 |
| Proxy-denied HTTP/CONNECT attempts | 40 | 23 |
| Proxy-forwarded requests | 0 | 0 |
| Actual action events / correct association / personal review clicks | 1 / 1 / 1 | 0 / 0 / 0 |
| Controlled stops / successful application fresh-boot checks | 1 / 0 | 0 / 0 |
| Read-result hold/release / stale-document checks | NOT RUN / NOT RUN | NOT RUN / NOT RUN |
| Owned browser context/server/socket/root cleanup | PASS | PASS |

Each full run closed its context, destroyed tracked sockets, checked all **three server listeners closed**, verified socket set empty, checked the exact temporary root's prefix/parent/owner UID, removed only that owned root and asserted absence. The worker diagnostic independently closed its context and single proxy and removed its own root. A separate post-run check found **no `/tmp/bf09-observer-*` or `/tmp/bf09-worker-diagnostic-*` directories**. No arbitrary process killing or normal-profile inspection. Context close and root/listener absence are the cleanup evidence; no independent OS-wide process/egress certification is claimed.

Both full-run logs were independently checked for absence of complete HTTP/extension URLs, document-ID-like 32-hex values and boot-UUID patterns. Logs contain generic case labels, booleans, versions and counts; no raw messages/errors, page content, stable IDs, credentials, session/customer values or screenshots. Private transient IDs/URLs used for assertions never become diagnostics. Scratch `/tmp/bf09-evidence-gbizawar/` retains only baseline/checker/generic logs, JSON results and the diagnostic reproduction source, with no executable extension or browser profile retained. This is experiment evidence, not a new product retention policy.

The [structural verification ledger](../../04_TEST_EVIDENCE.md#bf-09-observer-verification--2026-11-04-africacairo) records **PASS, exit 0**, `python3 /tmp/bf09-evidence-gbizawar/verify.py`: exactly **8 authored paths (2 new/6 modified), 0 staged/0 unexpected**, plus the exempt IDE path; **228 protected tracked files equal baseline and HEAD**; **6 complete original bodies preserved**; raw index/entries, refs/reflog/history and both worktree records unchanged; required Git identity/divergence unchanged; master/canonical equal original SHA-256 `d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91`. Changed Markdown **7 files / 416 local links / 74 fragments / 0 broken**; all extension documentation Markdown **91 files / 1066 links / 194 fragments / 0 broken**. Whitespace/LF/single-final-newline checks PASS. Live remote tip is separately rechecked before handoff. The checker is rerun after recording these measurements.

## Official sources reviewed

Public sources retrieved using `web.run` on **2026-11-04 (Africa/Cairo)**. They establish platform semantics, not owner identity, production acceptance or the experiment's actual outcome.

| Source | Applied fact / limitation |
|---|---|
| [Chrome action](https://developer.chrome.com/docs/extensions/reference/api/action) | onClicked supplies the invoking tab; a configured popup suppresses it |
| [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) | Temporary invoked-tab access; same-origin grant can survive document changes; access is not application authorization |
| [Scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting) | Document-targeted injection and envelope IDs from Chrome 106; exact document/frame/result checking |
| [Runtime](https://developer.chrome.com/docs/extensions/reference/api/runtime) | Browser sender document/origin/context metadata; port lifecycle describes creation time |
| [MV3 worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Termination loses worker globals; a fresh boot must not restore authorization |
| [Playwright extension workers](https://playwright.dev/docs/chrome-extensions) | Persistent Chromium extension context and Worker-handle continuity across MV3 restart |

## Exact file scope and preservation rules

Paths relative to `Sh_Project_Setup_extension`; **two new, six modified, maximum eight authored files**:

| Change | Path |
|---|---|
| Create | `test/browser-first-observer-browser.mjs` |
| Create | `docs/Phases/phase07/PHASE_07_BROWSER_FIRST_OBSERVER_SPIKE.md` |
| Modify | `docs/Phases/phase07/PHASE_07.md` |
| Modify | `docs/00_PROJECT_STATUS.md` |
| Modify | `docs/03_CHANGELOG.md` |
| Modify | `docs/04_TEST_EVIDENCE.md` |
| Modify | `docs/05_BLOCKERS_AND_DECISIONS.md` |
| Modify | `docs/06_HANDOFF.md` |

The six tracking inserts retain their complete original bodies after unchanged titles. All prior BF reports/harnesses, BF-07 source/tests, BF-08 documentation, ADRs, security/contracts/SEC-01, Phase 04/06, product source/manifest/popup/worker, dependencies, fixtures and master/canonical remain protected. The IDE exception is outside the authored scope and carries no byte-stability claim. The checker does not read either forbidden IDE file. Disposable executable assets and profiles must be removed; only generic text evidence/checker scripts remain outside Git in the owned evidence directory.

## Gates

Progress remains **5/20 master phases; 28/72 official micro-phases**. Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED**; Phase 07 **IN_PROGRESS / NOT ACCEPTED**; Phase 07.03 **NOT_STARTED / NOT_AUTHORIZED**; D-04/B-02/B-03 **OPEN**; historical security decisions **PENDING**; production **NO_GO**.

No BF-10, Phase 07.03, production permissions, observer integration, real sites, business operations, staging, commit or push.

Skills actually applied: Ponytail full; Superpowers using-superpowers, brainstorming's authorized-spike exception, writing-plans guidance within this report, systematic-debugging and verification-before-completion. Tools: shell/Git/Node/Python/apply_patch through functions.exec, installed Playwright/Chromium, owned X11 metadata, external CDP controlled-stop observation, asynchronous personal-action prompts, web.run official documentation. WarpGrep/Valyu unavailable; no subagent, authenticated connector, computer-use mouse control, screenshot or normal-profile inspection. Independent security/owner acceptance is outstanding; no completed production implementation or TDD cycle is claimed.

**READY_FOR_CHATGPT_REVIEW / LOCAL_FIXTURE_BROWSER_ONLY. STOP for independent review.**

## BF-09-AUTO — autonomous GUI experiment — 2026-11-04 (Africa/Cairo)

**LOCAL_FIXTURE_BROWSER_ONLY / AUTOMATED_GUI. Required cases observed; independent acceptance pending.** This new owner-authorized experiment supersedes the personal-click requirement only for BF-09-AUTO. Everything above is retained verbatim: the original **11 PASS / 2 FAIL / 4 BLOCKED**, corrected human run **4 PASS / 0 FAIL / 13 BLOCKED**, worker diagnosis and their evidence classifications remain historical facts. No HUMAN_INVOCATION_VERIFIED claim is made.

### Scope, execution plan and preflight

The existing worktree, branch `feature/sh-project-setup-extension-clean`, HEAD, upstream and live remote branch all matched `e8a70219104e850db2b0f8c63f35776a3b737730`; fetch/push origin remained `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`. Index empty; the expected eight BF-09 paths were uncommitted, two untracked and six modified. The other linked worktree remained at `390c9ea7c311f362ea04aad64ed14569161642ec`. The IDE exception was inventoried by path only; neither forbidden IDE file was read, hashed, changed, staged or reverted. No clone, checkout, fetch, reset, stage, commit or push.

Bounded plan executed: preserve all eight incoming files and Git/protected-file metadata; discover installed GUI capabilities; extend only the disposable harness with explicit `--automated-gui`; run its unchanged observer/security cases with actual OS mouse input; retain unsuccessful diagnostics; append this experiment to the seven allowed documents; verify Node, syntax, scope, history, links, whitespace and cleanup. No caller, product source, manifest, popup, worker, BF-07, dependency, fixture repository, policy or contract change was needed. The worker observer body and the corrected Playwright Worker-handle behavior remain unchanged. The original personal-click mode remains available but was not invoked here. Disposable UI instructions distinguish autonomous mode.

### GUI method and safety boundary

Available: existing Xorg display `:0`, `xdotool`/XTEST, `xprop`, `xwininfo`, Python `pyatspi`, `xwd`, FFmpeg and the already installed Playwright/Chromium. Xvfb was absent; existing `:1024`/`:1025` sockets denied ordinary access, so no permission bypass or package installation was attempted. The desktop fallback used only the owned disposable browser. No operator click, pinning or confirmation was requested.

Headed Chromium uses the same fresh owned profile, exact two extension permissions, fixed fixture servers, denying proxy and page-request allowlist as historical BF-09. The external driver obtains the browser PID through its own CDP session and verifies the generated profile argument in that PID's process title. It accepts only a mapped X11 window with that `_NET_WM_PID`. Accessibility enumeration reads application PIDs first and traverses only the matching Chromium application; it never traverses another application's content.

AT-SPI locates a unique visible, enabled push button by its exact first-line accessible name, deduplicating repeated references to the same accessibility object. Chrome appends site-access status on a separate line to the pinned action's name. The actual menu button is `Pin BF09 observer`. Window-bound calibration is essential on this desktop: the observed AT-SPI frame was **1290×853** while the X11 drawable was **1269×839**. Scoped owned-window captures confirmed the mismatch and the corrected Extensions-menu location. The final driver maps the observed control rectangle through the measured frame/drawable bounds; there are no fixed screen coordinates.

Before every mouse-down it verifies the owned PID, active X window, target/whole-frame geometry, proportional scale, rectangle containment, pointer coordinates and pointer window identity. It uses `xdotool mousemove` followed by `xdotool click 1`; no accessibility action invocation, keyboard action, page click, direct callback, DevTools extension-action trigger or permission grant substitutes for it. `mousemove --sync` was removed after a diagnosed timeout when the pointer was already stationary at the requested coordinate; position is explicitly checked instead. A missing/ambiguous control or ownership/geometry mismatch blocks further input. This is scoped Linux GUI evidence, not a certification against arbitrary concurrent desktop interference.

The successful sequence is seven OS clicks: Extensions menu, Pin BF09 observer, close Extensions menu, first pinned toolbar action, owning review confirmation, fresh pinned toolbar action after worker restart, new owning review confirmation. Playwright activates and verifies the selected fixture tab before each toolbar click and activates the packaged review before each confirmation. It handles page setup, reload and API assertions only. Both successful runs independently observed the callback and permission effects; an OS command return alone is not invocation proof.

### Actual final results and evidence provenance

`node test/browser-first-observer-browser.mjs --automated-gui`, final `auto-final.txt`: **17 PASS / 0 FAIL / 0 BLOCKED / 1 SKIP**, exit **0**. SKIP is one explicitly NOT_RUN aggregate of out-of-scope lifecycle limits, not an unavailable required case. Environment: **Node v24.19.0 / Playwright 1.62.1 / headed Chromium 151.0.7922.34**. No new dependency.

| Cases | Final observation | Classification |
|---|---|---|
| ENV, 1 | Owned headed browser, only activeTab+scripting, no popup/webNavigation; selected, duplicate and negative tabs all denied before invocation | 2 LOCAL_BROWSER_TESTED prerequisites only; neither asserts a GUI invocation |
| 2, 2B | **2 real action.onClicked callbacks**, each associated with the exact selected tab; one before and one after fresh worker boot | AUTOMATED_GUI_BROWSER_TESTED |
| 3 | Same-origin uninvoked control and different-origin negative tab remain denied after action; repeated after restart in case 11 | AUTOMATED_GUI_BROWSER_TESTED |
| 4, 7 | OS confirmation fires the packaged trusted click handler, one-use message reaches the owning port/document, exact document-targeted read returns one top-frame matching-document boolean true | AUTOMATED_GUI_BROWSER_TESTED |
| 5A, 5B, 5C, 6, 7S | Wrong review/capture/boot/schema, duplicate and superseded review, page/content-sender forgery, malformed envelopes rejected | SIMULATED stimuli; actual Chrome sender/connection behavior accompanies browser cases, without promoting the injected attack to organic evidence |
| 10 | Chrome reports controlled stop; same retained Playwright Worker handle observes a different boot, no capture/owner/confirmation/read restored | AUTOMATED_GUI_BROWSER_TESTED; stop is externally controlled, not natural idle/crash |
| 11 | Exact old document still scriptable after restart, but old review ticket/connection cannot restore capture or owner; controls still denied | AUTOMATED_GUI_BROWSER_TESTED for surviving access and empty application state; old-ticket submission is deliberately injected and is not a real new approval |
| 8 | Actual fixture reload emits observed loading invalidation, clears capture/owner; Chrome rejects injection into the obsolete document | AUTOMATED_GUI_BROWSER_TESTED |
| 9 | Driver holds a genuine completed read, reload invalidates it, release yields exactly one late rejection and zero accepted reads in that boot | SIMULATED hold/release scheduling; reload, scripting completion and invalidation are observed browser facts |
| 12 | Browser/process/root, three listeners and tracked sockets cleaned; request isolation checks hold | AUTOMATED_GUI_BROWSER_TESTED within this owned experiment |

Final breakdown: **9 AUTOMATED_GUI_BROWSER_TESTED passes, 6 SIMULATED passes, 2 pre-invocation LOCAL_BROWSER_TESTED prerequisite passes**. No automatic upgrade of a pre-invocation measurement. The second automated confirmation is verified in the held-result/reload sequence as well: **2 automated review clicks, 0 human review clicks**, **2 toolbar mouse clicks**, **7 total OS clicks**, **1 controlled stop / 1 fresh boot / 1 loading event / 1 delayed rejection**. `retainedAccess` and `staleTargetRejected` were both observed true. All inspected states retain **accountVerified=false, executionAuthorized=false, approvalGranted=false, trustedContinuingContext=false**. No page/account/identity/approval/business-write authority follows.

Final network counters: **4 fixture GETs / 0 unexpected page requests / 0 rejected fixture requests / 27 denied proxy requests / 0 forwarded**. The deny proxy does not forward requests; it and the exact request allowlist are not OS-wide egress certification. Public documentation and required Git remote queries were separate from disposable-browser traffic; no real GitHub/Odoo.sh/Plementus site was opened in it.

### Preserved BF-09-AUTO diagnostic attempts

All attempts below used fresh disposable roots; all reported cleanup PASS. The first thirteen stopped without any observed action callback or review confirmation. Their failures/blocks remain failures/blocks. The final run alone governs final-code acceptance evidence. Earlier automated diagnostic code over-labeled setup/cleanup as AUTOMATED_GUI_BROWSER_TESTED before a callback existed: those raw labels are retained in logs but establish only local prerequisites, never automated invocation. The final harness restricts that label until an action has actually been observed.

| Log in `/tmp/bf09-auto-evidence-115tagw9/` | PASS / FAIL / BLOCKED / SKIP | OS commands counted as clicks | Cause / result |
| `auto-first.txt` | 2 / 1 / 14 / 0 | 0 | Process/profile assertion failed before input. |
| `auto-diagnostic.txt` | 2 / 1 / 14 / 0 | 0 | Reproduced assertion; sanitized source location retained. |
| `profile-diagnostic.txt` | 2 / 1 / 14 / 0 | 0 | Chromium rewrote argv as a space-separated process title; exact token parsing corrected. |
| `auto-second.txt` | 4 / 0 / 13 / 0 | 1 | Menu control unavailable; no action callback. |
| `gui-diagnostic.txt` | 4 / 0 / 13 / 0 | 0 | GUI input prerequisite blocked; no completed mouse command. |
| `gui-diagnostic-2.txt` | 4 / 0 / 13 / 0 | 0 | Diagnosed stationary-pointer mousemove --sync timeout. |
| `auto-third.txt` | 4 / 0 / 13 / 0 | 1 | Menu control absent with uncalibrated coordinate mapping. |
| `auto-fourth.txt` | 4 / 0 / 13 / 0 | 1 | Avoiding redundant window activation did not resolve mapping. |
| `visual-diagnostic.txt` | 4 / 0 / 13 / 0 | 1 | Owned-window capture exposed coordinate mismatch. |
| `maximized-diagnostic.txt` | 4 / 0 / 13 / 0 | 1 | Start-maximized did not remove mismatch; option removed. |
| `calibrated-first.txt` | 4 / 0 / 13 / 0 | 1 | Calibrated Extensions click opened menu; actual Pin label and duplicate accessibility references identified. |
| `calibrated-second.txt` | 4 / 0 / 13 / 0 | 3 | Pinning worked; pinned action has a second accessibility-name status line. |
| `pinned-diagnostic.txt` | 4 / 0 / 13 / 0 | 3 | Confirmed exact first-line toolbar identity and status suffix. |
| `auto-complete-attempt.txt` | 17 / 0 / 0 / 1 | 7 | First complete success: 2 callbacks, 2 reviews, stop/new boot, stale/late rejection; 26 proxy denials. |
| `auto-final.txt` | 17 / 0 / 0 / 1 | 7 | Final simplified harness success with explicit toolbar count and corrected prerequisite tiers; 27 proxy denials. |

### Verification, cleanup and remaining limits

`node --test test/*.test.mjs`: **288 PASS / 0 FAIL / 0 SKIP / 0 CANCELLED / 0 TODO**, exit 0 (`node-full.txt`). Final harness syntax and both generated worker/review syntax checks PASS. The browser assertions exercise the new GUI path against actual Chrome; no production implementation or separate production TDD cycle is claimed. The worker body and historical Worker-handle correction are preserved. The no-display failure path and human mode were not rerun in this task.

Every run closed its browser context and independently required the owned browser PID to disappear, destroyed tracked sockets, asserted all three server listeners closed and socket set empty, then removed only its UID/prefix/parent-verified temporary root. Three diagnostic owned-window XWD/PNG pairs contained only the disposable Chrome and invented fixtures; all were deleted with their roots. The final harness contains no screenshot capture or diagnostic-wait option. Evidence retained outside Git is source baselines/checker and generic text/JSON logs only, not browser profiles, generated executable extensions or screenshots. Independent post-run filesystem verification and in-harness listener assertions are recorded in the tracking evidence ledger. No other application's window or normal browser profile was controlled.

Current official Chrome action, activeTab, scripting, runtime and worker-lifecycle documentation and Playwright extension documentation were retrieved on **2026-11-04 (Africa/Cairo)** using `web.run`; the source links in the earlier Official sources reviewed table remain applicable. In particular, the [Playwright worker continuity documentation](https://playwright.dev/docs/chrome-extensions#service-worker-idle-suspension-mv3) supports keeping the same Worker handle; this run independently verifies the new boot and lost state. Documentation is not test evidence.

Tools actually used: functions.exec shell/Git/Node/Python, installed Playwright/Chromium, external CDP for diagnostics/controlled stop, X11 metadata, AT-SPI and xdotool/XTEST, xwd/FFmpeg and view_image for scoped diagnosis, web.run for official sources. Skills read/applied: Ponytail full and Superpowers using-superpowers, brainstorming's authorized-spike exception, systematic-debugging and verification-before-completion; executing-plans/TDD guidance was read, with the user's disposable eight-file/no-commit scope controlling extra artifacts and workflows. WarpGrep and Valyu were unavailable. No subagent, provider connector or operator-input request was used.

No continuous navigation coverage, optional permission removal/regrant, natural idle/crash, browser restoration, BFCache/prerender, hostile-DOM identity proof, multi-role aggregation, real-site/account rights or production security acceptance is established. This fresh success does not relabel the historical failures/blocks or authorize integration. Master **5/20**, micro **28/72**, Phase 04 **BLOCKED**, Phase 06 **PARTIAL/BLOCKED**, Phase 07 **IN_PROGRESS**, Phase 07.03 **NOT_AUTHORIZED**, production **NO_GO** remain unchanged. No BF-10, real-site access, staging, commit or push.

**READY_FOR_CHATGPT_REVIEW / AUTOMATED_GUI_BROWSER_ONLY**

STOP for independent review.

### Final structural verification result

Scoped verification PASS: eight allowed paths, 228 protected tracked files, all seven incoming Markdown prefixes and the observer body preserved; 422 changed-file local links and 1072 documentation links checked, zero broken; whitespace/newlines PASS. Final full Node rerun: 288 PASS (`node-final-extension.txt`); an intermediate wrong-directory invocation discovered zero tests and is not suite evidence. No remaining disposable roots or screenshots.

**Git metadata limitation:** HEAD/upstream/live remote, origins, raw index/entries, history/reflog and worktrees match the required or historical baselines. The whole reference-list hash differs from the previous BF-09 scratch baseline. There is no current-turn initial full-ref snapshot or older raw reference list to identify the delta/timing. Codex internal refs are present, but their presence alone does not establish causation. Full-ref preservation is **UNVERIFIED**, not PASS; no repair/reset or Git mutation was performed. Details and measured results are in the appended BF-09-AUTO structural verification section of the test-evidence ledger. No further implementation followed this discrepancy.

**READY_FOR_CHATGPT_REVIEW / AUTOMATED_GUI_BROWSER_ONLY**

STOP for independent review.
