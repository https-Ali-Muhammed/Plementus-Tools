# PHASE_05 — Safe User-Action and Navigation Events

## Scope and owner authorization

Date: **2026-10-27 (Africa/Cairo)**. Phase 05 only, **PROVISIONAL / UNREVIEWED**, accepted progress **5/22**. Owner/ChatGPT accepted Phase 04 on **2026-10-22** at pushed `56ca07d36c833313c9f3bc757d47e9620b8c39ca`; verified HEAD, upstream and live origin agree. Phase 04 is COMPLETE: historical **158 unit/integration PASS; 18 Chromium PASS**, worker-owned lifecycle and header-only persistence accepted. Sensitive retention/encryption remains OPEN. Chrome Stable, Brave Phase 04 and real Odoo NOT TESTED. [Reconciliation and original execution record](PHASE_04.md).

Project `/home/https_ali_muhammed/Plementus/Tools/Odoo_TraceBridge_extention`; Git root `/home/https_ali_muhammed/Plementus/Tools`; origin `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`; branch `feature/odoo-tracebridge`; upstream `origin/feature/odoo-tracebridge`. Whole-repository porcelain empty before edits. No clone/switch/reset/commit/push. README, canonical blueprint Phase 05, docs/00–07, architecture/security, Phase 04 and relevant ADRs reviewed. Current explicit owner scope supersedes old no-Phase-05 gates.

Authorized: programmatic isolated top-frame action/navigation categories after worker-authorized Start, explicit Resume, bounded volatile evidence, honest popup counter, automated synthetic verification and documentation/evidence. Excluded: Phase 06 errors, Phase 07 network capture, Phase 08 RPC/MAIN instrumentation, sensitive persistence, customer/production access, telemetry/AI/Plemo and publication.

## Execution summary

**PROVISIONAL**; mandatory automated verification complete, owner/ChatGPT review pending. The existing controller/header store and consent policy remain the authority. No dependencies or stored schemas added.

- Worker validates fresh Start/Resume, browser-selected tab/window/exact origin and declaration. It probes only the top frame in ISOLATED world; browser-returned `documentId` binds the actual collector injection. No static content-script registration or all-frame/host grant.
- Collector opens one random worker-minted port scoped to the session epoch/document. No observation listeners until worker readiness. Port sender must match extension, exact origin, tab/window, active document ID/lifecycle and top frame; payload identity is never trusted. The bound port carries strict `{sequence,category}` messages only. Worker rechecks current recording row/epoch, generation, deadline, sequence, selected scope and an actual document-targeted injection permission probe before every acceptance. Late/replayed/unknown/flooded/stale messages fail closed. Invalid content messages cannot invoke lifecycle controls or return case data.
- Allowlist: `button_click`, `link_click`, `navigation_signal`, `document_navigation`. Clicks require trusted browser input and conservative BUTTON/A tag classification. Ignore inputs, textarea/select/option, editable ancestry and unknown/custom target types. No text, labels, attributes, selectors, form values, key/input listeners, URLs/routes/query/fragment, record IDs or DOM serialization. The sole attribute-like read is the platform's `isContentEditable` classification. The shared DOM is lower trust; categories do not establish business intent, success or Odoo identity.
- Worker stores only `{category,sequence,elapsedMs}` in one volatile ring: **128 recent entries**, **512 accepted collector events per Start/Resume**, then pause; elapsed time is worker-assigned, nonnegative, rounded down to 100 ms and bounded by session lifetime. One event in flight; intervening page actions are dropped without a raw queue. `count` counts accepted categories; `dropped` counts only ring eviction, not unobservable or busy-period actions. Summary copies cannot mutate worker state. Start/Resume replaces the prior buffer; selected Delete clears its buffer, and deleting an older case preserves a different active collector. Worker restart loses all categories.
- Expiration is a **non-renewing absolute deadline at the existing 30-minute header lifetime**, including time paused. No five-second lease, heartbeat, extension keepalive, reconnect or automatic recovery. A separate **3-second injection/handshake setup timeout** fails Start/Resume closed; it is not a capture lease. Worker and collector enforce deadline; collector checks it before classifying every action and removes listeners on timer, pagehide or port disconnect. Browser timer throttling can delay timer callbacks; no event after deadline is admitted. Worker restart disconnects ports and recovers headers PAUSED/fresh epoch; explicit fresh authorization is required.
- Pause/Revoke/Stop/Delete, navigation, tab closure/replacement/detach/switch, other/lost window focus, observed permission removal, access/document validation failure and worker restart stop/invalidate capture. Native popup closure returning focus to the **same bound window** preserves authorized capture; actual loss (`WINDOW_ID_NONE`) or another window pauses. Stale controls cannot tear down an unrelated current collector.
- Popup shows accepted volatile count/evictions on Refresh and explicitly states loss, exclusions and unavailable error/network/RPC signals. Full document navigation/reload may tear down/disconnect before a navigation category is admitted. Hash/popstate/browser tab updates provide limited navigation signals; in-place rendering is unavailable, and all SPA routes/actions are not claimed observable. A missing category is not proof no action/navigation occurred.

### Exact changed paths

Final **30 project-only paths (24 modified / 6 new), all unstaged**. Areas: `src/capture/`, `src/session/{controller,model,boundary.test,controller.test}.ts`, `entrypoints/background.ts`, popup status/UI/tests, WXT permission config, manifest audit, E2E fixtures/specs and the phase documentation ledgers. `src/session/store.ts`, consent policy, package/lock and canonical references are unchanged.

- `README.md`
- `docs/00_PROJECT_STATUS.md`
- `docs/01_MASTER_PLAN.md`
- `docs/02_ARCHITECTURE_DECISIONS.md`
- `docs/03_CHANGELOG.md`
- `docs/04_TEST_EVIDENCE.md`
- `docs/05_BLOCKERS_AND_DECISIONS.md`
- `docs/06_DEPLOYMENT_RUNBOOK.md`
- `docs/07_HANDOFF.md`
- `docs/ARCHITECTURE.md`
- `docs/Phases/PHASE_04.md`
- `docs/Phases/PHASE_05.md`
- `docs/SECURITY_PRIVACY.md`
- `entrypoints/background.ts`
- `entrypoints/popup/Popup.tsx`
- `entrypoints/popup/status.test.ts`
- `entrypoints/popup/status.ts`
- `scripts/audit-manifests.mjs`
- `src/capture/collector.test.ts`
- `src/capture/collector.ts`
- `src/capture/controller.test.ts`
- `src/capture/controller.ts`
- `src/session/boundary.test.ts`
- `src/session/controller.test.ts`
- `src/session/controller.ts`
- `src/session/model.ts`
- `tests/e2e/consent.spec.ts`
- `tests/e2e/events.spec.ts`
- `tests/e2e/fixtures.ts`
- `wxt.config.ts`

### Persistence and permission review

P01-RETENTION/P01-CRYPT remain **OPEN**. No action/navigation category is written to IndexedDB, storage.local/session, logs or disk by the product. `tracebridge` v1 still has only `cases`, with exact `{schema,id,epoch,state,createdAt,updatedAt}` headers. The pre-existing trusted-context storage.session binding contains only case ID and normalized tab/window/origin. No collector token/document ID/authorization/event is persisted; no new object stores or settings. Dev/test reports/traces intentionally contain only synthetic fixtures and are outside shipped code. No encryption or secure physical-erasure claim.

Production adds only **scripting**, needed for dynamic ISOLATED injection using activeTab. Production permissions are exactly `activeTab`, `storage`, `scripting`; no host/optional/content-script declarations, external listener, MAIN bridge, debugger/webRequest/cookies permissions, remote code or network APIs. CSP `connect-src 'none'` and incognito denial retained. Dev adds WXT tabs/localhost/reload exceptions, audited separately; never distribute. Page fetch/XHR/history remain untouched; test-only CDP and synthetic page requests are not production instrumentation.

Official platform facts checked 2026-10-27: [scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting) (activeTab, ISOLATED, frame/document targeting), [messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) (ports/disconnect and lower-trust senders), [MV3 lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) (lost globals and termination). Product choices above are Phase 05 proposals under review, not platform guarantees or approval of sensitive policy.

## Verification evidence

Final `npm run verify` **PASS, exit 0**. **200 unit/integration/security PASS (6 files); 32 Chromium PASS (30 native action / 2 direct popup); 0 FAIL, 0 BLOCKED, 0 skipped. All 7 npm run verify gates PASS, exit 0.** Machine reports `.artifacts/verification.json`, `unit.json`, `e2e.json`; exact commands/results updated before handoff/status.

| Check | Exact command/action | Environment | Result | Evidence / limitation |
|---|---|---|---|---|
| Preflight | pwd, Git root/origin/branch/HEAD/upstream/tracking, whole-root porcelain, live ls-remote | Linux; before edits | PASS | Expected 56ca07d, clean whole root |
| Clean install | `npm ci` | Unchanged exact lock | PASS, exit 0 | 246 added / 247 audited, npm reports 0 vulnerabilities; phase05-npm-ci.log |
| Build/type/lint/tests/manifests/browser/diff | `npm run verify` | Production MV3; existing pinned tooling | PASS, exit 0 | 200 unit/integration and 32 Chromium PASS, no fail/skip; gate logs and machine results |
| Documentation/scope | Python 3 assertions and `git diff --check` | Local | PASS before final ledgers; repeated afterward | Relative links/anchors, UTF-8/fences/whitespace, immutable canonical refs/package/store, only project unstaged paths |
| Archive | Python zipfile CRC/inventory/member SHA-256/current-file comparison | `/tmp/tracebridge-phase05-evidence.zip` | Integrity recorded externally after final ledgers | Source/tests/docs/manifests/machine reports/synthetic PNGs/traces only |

Unit/integration checks distinguish synthetic worker/browser-storage ports and DOM doubles from actual browser tests. Cover consent/origin/loopback regressions; worker lifecycle/current epoch; wrong tab/window/frame/document/origin/extension/session token; missing/cached documents; duplicate ports, schema/replay/flood; delayed validation against Stop/Delete/generation; failure/expiry/clock rollback/setup timeout; ring overflow/total cap; forbidden reads/teardown; exact persistence; minimal permissions and no network/MAIN bridge. Actual browser coverage uses the production unpacked MV3, sandbox-enabled isolated Chromium, native action via xdotool with genuine activeTab, loopback servers and intercepted HTTPS-origin fixture. Direct-popup tests remain separately counted. No grant/API mocks in native coverage. Real CDP DOMDebugger inspection verifies one document capture-click listener during recording and zero after each Pause/Stop/Delete.

Browser cases include trusted click categories, actual sensitive synthetic inputs/labels/identifiers and child frame exclusion, consent before Start, authorized local/staging versus production/unknown/mismatches, Pause/Stop/Delete, navigation/reload, tab/window/closure, real CDP worker termination and explicit Resume, buffer overflow, actual cases-only IndexedDB/local/session minimization, fixture request/response and action behavior, original page fetch/XHR/history identity, and both manifest grants. Collector expiry uses accelerated **CDP page virtual time**, labeled distinctly from a real 30-minute wait. Permission-loss and handshake/API failure injection remain synthetic-port checks; browser UI access-withholding/removal is NOT TESTED.

Recovered attempts retained in phase05 logs: Phase 04 source assertion intentionally rejected newly authorized injection and was narrowed while retaining prohibited capabilities; first browser harness accessed a closed native popup, so a packaged inspector is opened before authorization; actual popup-return focus paused recording, fixed with regression; full-navigation category assumptions failed when teardown won, now explicitly measured as unavailable with safe pause, not fabricated evidence; state-only history call also generated a browser tab update, so the unavailable in-place-rendering fixture uses an actual DOM update instead. A later privacy assertion matched the synthetic record digits `991` inside a legitimate header timestamp; replaced the ambiguous substring scan with exact stored schema/header equality and exact operational binding checks. This was a test false positive, with no page data in storage. No unresolved product failure may be hidden by these descriptions; final results below govern.

Versions: Node v24.19.0, npm 11.17.0, WXT 0.21.4, Vite 8.3.5, TypeScript 6.0.3, ESLint 10.0.1, Vitest 5.0.5, Playwright 1.64.1, Chromium 156.0.8078.4, Linux 6.8.0-138-generic; `.artifacts/phase05-versions.json` and per-spec browser.json. Native PNGs visually inspected; no full accessibility claim.

## Open risks, blockers and decisions

- **P05-REVIEW OPEN**: PROVISIONAL, accepted progress 5/22; owner/ChatGPT reviews this phase and evidence only.
- **P01-RETENTION / P01-CRYPT OPEN**: memory-only narrow scope; no sensitive diagnostic persistence, encryption decision or evidence retention policy approved.
- **P05-GAPS**: full navigation may lose its category to teardown; busy-period actions and unknown/iframe targets are omitted; no all-action/SPA claim. Last badge/snapshot may be stale until wake/Refresh. Worker idle termination can end observation; no keepalive or recovery.
- **P05-BOUNDS**: 128/512 and setup timeout are conservative Phase 05 implementation choices under review, not sensitive-storage policies. Explicit Resume discards previous volatile evidence. Boundedness is guaranteed within tested managed contexts, not against browser/OS compromise or malicious evidence spoofing.
- Authority/environment are user assertions, not reliable production/Odoo detection. Denied/unknown declarations fail closed; no customer/live authorization follows.
- **NOT TESTED**: Chrome Stable, Brave Phase 04/05, minimum Chrome 120/other OS, real Odoo/version/edition/production/customer systems, actual TLS/DNS/staging server, physical toolbar mouse click, browser UI site-grant withholding/removal/incognito/disable-update-reenable, full browser crash/power loss/physical disk exhaustion, natural undebugged idle termination timing, actual 30-minute wall time, full WCAG, general application performance/security/noninterference certification, OS-wide packets, dev HMR/Xvfb. Existing owner-attested historical Phase 02 Brave smoke remains historical.

## Acceptance decision

| Gate | Result |
|---|---|
| Phase 04 accepted and historical evidence preserved | COMPLETE, owner/ChatGPT acceptance supplied; pushed commit verified |
| Phase 05 authorized isolated collection/minimization/volatile bounds | PASS in current mandatory unit/native synthetic matrix; **200 unit/integration/security PASS (6 files); 32 Chromium PASS (30 native action / 2 direct popup); 0 FAIL, 0 BLOCKED, 0 skipped. All 7 npm run verify gates PASS, exit 0.** |
| Navigation and action completeness | Limited observed categories only; explicit gaps/unavailable signals |
| Sensitive retention/encryption policy | OPEN; no evidence persistence implemented |
| Real Odoo/browser-product/security certification | NOT TESTED |
| Owner/ChatGPT Phase 05 acceptance | UNREVIEWED / PROVISIONAL; progress stays 5/22 |
| Ready for Phase 06 | NO; STOP after Phase 05 |

## Git and next step

Starting/ending HEAD must remain `56ca07d36c833313c9f3bc757d47e9620b8c39ca` on `feature/odoo-tracebridge`, upstream/live origin unchanged. All task changes unstaged/uncommitted; no clone/switch/reset/commit/push/deployment. **30 paths (24 modified/6 new), 0 staged**; exact inventory above. Documentation checks passed before ledgers and are repeated after status; archive integrity/inventory/member hashes and final current-file equality are in `/tmp/tracebridge-phase05-archive-verification.json` and `/tmp/tracebridge-phase05-final-checks.json`. Evidence ZIP is `/tmp/tracebridge-phase05-evidence.zip`, with CRC/member hashes/current-source equality verified after final ledgers. Exclude dependencies, browser profiles, secrets/real customer data, unrelated projects and generated bundle bulk.

Skills/tools actually used: **Ponytail full**, functions shell/Git/npm/Python, official Chrome web docs, Playwright/Chromium/CDP/native xdotool; local PNG inspection (sanitized popup counter and recording UI). WarpGrep/Superpowers/Valyu unavailable; no subagents/CUA/real Odoo. Memory used to locate prior lifecycle context; current source and Git independently verified. Handoff SECOND LAST; status LAST; subsequent project operations read-only and external evidence packaging only.

Next action: owner/ChatGPT reviews Phase 05 and the evidence ZIP, accepts or requests Phase 05 corrections. **STOP after Phase 05.** No next phase or publication.
