# PHASE_03 — Permissions & Consent

> Accepted 2026-10-22: Phase 03 **COMPLETE**, owner/ChatGPT accepted; verified pushed commit `8c7349150cf40adae0bdb015064a8d61aebdc74a`. Accepted progress **4/22**. Evidence: **123 unit/integration PASS; 10 Chromium PASS (9 native invocation, 1 direct popup)**. Local Development and permanent Codex-owned automated verification approved. Chrome Stable, Brave Phase 03 and real Odoo remain NOT TESTED. Historical provisional records and limitations below are preserved.

> Historical 2026-10-22 result: see [Automated completion and loopback policy](#automated-completion-and-loopback-policy--2026-10-22-africacairo). Earlier sections preserve historical execution snapshots; old HTTPS-only/manual-testing restrictions are superseded.

## Scope and owner authorization

- Date: **2026-10-21 (Africa/Cairo)**. Phase 03 ONLY, explicitly authorized in this chat. Status **PROVISIONAL**; accepted progress **3/22**.
- GitHub: https://github.com/https-Ali-Muhammed/Plementus-Tools/tree/feature/odoo-tracebridge
- Project: `/home/https_ali_muhammed/Plementus/Tools/Odoo_TraceBridge_extention`; Git root: `/home/https_ali_muhammed/Plementus/Tools`.
- Branch: `feature/odoo-tracebridge`; expected/starting HEAD: `fe90532b11e043344aa2abfb7a539a0156e30cd5`; upstream: `origin/feature/odoo-tracebridge`.
- Preflight matched root/origin/branch/HEAD/upstream, clean **whole-repository** worktree, tracking ref and live remote SHA. No clone/switch/reset/stage/commit/push/deployment.
- First reconciled owner/ChatGPT Phase 02 acceptance dated 2026-10-21 and pushed `fe90532`: owner-attested **Brave popup smoke PASSED**; Google Chrome **NOT TESTED**. Original records preserved in Phase 02/test/decision records. Acceptance is owner evidence, not a repeated Codex browser run.
- In scope: selected-tab permission explanation, volatile popup consent, fail-closed identity/declaration checks, focused tests, documentation. Out of scope: Phase 04 session lifecycle/storage; Phase 05 capture; RPC, observers, instrumentation, networking, telemetry, Plemo and all real/customer Odoo access.

## Execution summary

**PROVISIONAL — pending owner/ChatGPT review and browser smoke.** No packages added; lockfile unchanged. Scope reaches only the popup caller, consent logic/tests, manifest config and the following records (paths relative to project):

| Exact path | Change |
|---|---|
| `entrypoints/popup/main.tsx` | Mount the consent popup |
| `entrypoints/popup/Popup.tsx` | New labeled form, exact selected scope, access/consent states, disabled Start, browser invalidation listeners with cleanup |
| `entrypoints/popup/consent.ts` | New identity/declaration policy and popup-local async revision guard |
| `entrypoints/popup/consent.test.ts` | New synthetic policy/controller integration and source-boundary tests |
| `entrypoints/popup/style.css` | New compact local styling and visible keyboard focus |
| `wxt.config.ts` | Only activeTab permission, incognito disabled, restrictive packaged CSP |
| `README.md` | Current usage, permissions, status and honest browser limitations |
| `docs/Phases/PHASE_02.md` | Acceptance reconciliation preserving prior evidence |
| `docs/Phases/PHASE_03.md` | This phase report |
| `docs/01_MASTER_PLAN.md` | Phase ledger 3/22; 03 provisional |
| `docs/02_ARCHITECTURE_DECISIONS.md` | Reconciliation and ADR-P03-01 |
| `docs/03_CHANGELOG.md` | Actual Phase 03 behavior/files |
| `docs/04_TEST_EVIDENCE.md` | Exact checks/results/limitations |
| `docs/05_BLOCKERS_AND_DECISIONS.md` | Current blockers and policy limits |
| `docs/06_DEPLOYMENT_RUNBOOK.md` | Exact owner smoke and safe access fallback |
| `docs/ARCHITECTURE.md` | Popup-only implemented boundary; worker gate deferred |
| `docs/SECURITY_PRIVACY.md` | Implemented permission/consent limits |
| `docs/07_HANDOFF.md` | Updated second last |
| `docs/00_PROJECT_STATUS.md` | Updated last |

`identifyTab` accepts one active, completely loaded, non-incognito tab with browser-visible URL, valid tab/window IDs and HTTPS/default-port origin. It rejects missing identity/access, pending navigation, restricted/non-HTTPS schemes, credentials, custom ports and known Chromium store hosts. It keeps only tab ID, window ID and parsed exact origin, without title/path/query/fragment. No page probe or Odoo/environment inference.

The operator must type the **identical exact origin**, select disposable test or staging, check authorization by the site/data owner and deliberately click **Approve consent only**. Unknown/production/environment strings, unrelated origin, missing authorization and wrong tab/window/origin are rejected. Authorization and environment are explicitly **user stated**, not browser-verifiable facts. There is no trusted site inventory or production detector; misrepresentation cannot be detected, and no real use or capture is authorized by this form.

Browser invocation provides temporary activeTab URL visibility, **never consent or Start**. Approval re-queries the active selected tab, matches tab/window/exact origin, and discards late results using a revision counter. Tab activation/update/removal/replacement, window focus change or permission removal invalidate the popup decision. Checks are conservative (even harmless bound-tab updates invalidate). Deny and Revoke clear the target and prevent reuse. Popup closure discards all decisions; reopening starts fresh. There is no worker, inter-context message, session ID/epoch/lease, persistence, injected script or capture authority.

## Verification evidence

| Check | Exact command/action | Environment | Result | Evidence / limitation |
|---|---|---|---|---|
| Preflight | `pwd`; `git rev-parse --show-toplevel`; `git remote get-url origin`; `git branch --show-current`; `git rev-parse HEAD`; `git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'`; `git status --porcelain=v1 --untracked-files=all`; `git ls-remote origin refs/heads/feature/odoo-tracebridge` | Linux, project cwd | PASS | Expected identity; clean whole-repo tree; live remote fe90532 |
| Production build | `npm run build` | Node v24.19.0 / npm 11.17.0, WXT 0.21.4 / Vite 8.3.5 | PASS | Four production files, 227.82 kB; no worker/content output |
| Typecheck | `npm run typecheck` | TypeScript 6.0.3 strict | PASS after correction | Initial negative fixture supplied undefined incognito to a required type; made boundary input optional while still requiring explicit false; rerun passed |
| Lint | `npm run lint` | ESLint 10.0.1 | PASS | No diagnostics |
| Tests | `npm test` | Vitest 5.0.5 | PASS: **2 files / 52 tests**, 0 failed/skipped | 51 new tests + existing status test; synthetic URL/tab/declaration fixtures and mocked browser lookups; source assertions for listener wiring/disabled Start/no collection APIs |
| Dev generation | `npm run dev -- --host 127.0.0.1` | WXT, local loopback | PASS generation | Generated dev manifest; server stopped by Ctrl-C (exit 130 expected); browser HMR NOT TESTED |
| Manifest/assets audit | `python3 /tmp/tracebridge_phase03_audit.py`; inspect both manifests and production popup HTML | Python 3, local output | PASS — STATIC REVIEW | Procedure below; no browser permission/console/network proof |
| Browser availability | CUA `cua.getState()` | Connected UI inventory | UNAVAILABLE / NOT TESTED | Only empty in-app browser and MCP Apps surfaces; no Chrome/Brave/native window; no Phase 03 installation, form interaction, screenshot or runtime console observed |
| Whitespace/scope/docs | `git diff --check`; final whole-repo Git identity/status; documentation link/heading and untracked whitespace assertions | Local Git/Python | PASS | Exact 19 project paths, 0 staged; handoff second last/status last, followed by read-only checks |
| Real Odoo/security/noninterference/network monitoring | No action | No authorized instance | NOT TESTED | 0 real versions; no customer/production data or runtime compatibility claims |
| Fresh install | `npm ci` | Existing accepted pinned dependency tree | NOT RUN | No dependency changes; prior Phase 02 clean install preserved |

Manifest audit procedure: parse both generated JSON files; require production permissions exactly `['activeTab']`, incognito `not_allowed`, packaged script CSP and `connect-src 'none'`; assert absence of optional/host grants, worker/content scripts, externally-connectable and web-accessible resources. Require dev permissions exactly activeTab/tabs/scripting, only `http://localhost/*` host, WXT background.js, localhost script CSP and retained connect-src none. Require exactly four production assets, local existing HTML references and no localhost strings in production files.

Production assets: `manifest.json`, `popup.html`, `chunks/popup-B2zh8ibR.js`, `assets/popup-BhW7hcAC.css`. Dev has activeTab **plus WXT reload tabs/scripting/localhost access**, a reload worker and localhost executable source. Never distribute dev output or load it on customer/Odoo pages. Retained `connect-src 'none'` may block HMR/WebSocket; safe fallback is rebuild production and manually reload. No permission/CSP expansion to fix reload was introduced.

No capture before Start is enforced structurally: Start is disabled, no capture implementation/entrypoint exists, and tests check absence of capture/injection/storage/network APIs in popup source. These checks and mocked gate tests do **not** prove actual Chrome grant revocation, rendering, accessibility or network behavior. Owner browser steps are in the [runbook](../06_DEPLOYMENT_RUNBOOK.md#phase-03-owner-browser-smoke--not-tested).

Skills/tools actually used: Ponytail full and frontend-design; shell/Git/npm/Python via functions, official Chrome docs via web open, and CUA browser inventory. No WarpGrep, Valyu or Superpowers tools available; no agents used. Memory registry search returned no relevant TraceBridge entry; no memory-derived project facts used.

## Open risks, blockers and decisions

- `P03-BROWSER` / owner QA: Phase 03 Chrome **and Brave** smoke NOT TESTED. Prior Brave pass applies only to Phase 02. No browser certification follows.
- `P03-ACCESS` / technical review: URL visibility is a minimal selected-tab access signal, not proof of injection rights. activeTab is not a persistent optional host grant; `permissions.contains` on a host is not used as an activeTab proof. Temporary grant expiry need not emit permissions.onRemoved; URL revalidation, tab events and popup discard are conservative fallback **only while no capture exists**. Future worker/document/lifecycle gates must independently verify authority before Start. No scripting/probe/host permission added.
- `P03-AUTH` / owner/security: exact-origin authorization and environment are user attested. No inventory or dependable production/Odoo detection exists. Unknown/production declarations fail closed; dishonest declarations cannot be distinguished. Keep capture unavailable; approve future organization policy separately.
- `P01-HOST`: activeTab-only in this phase. If insufficient later, remain unavailable/reinvoke on selected tab or use manual evidence; persistent host strategy still needs separate approval.
- `P01-RETENTION`, `P01-CRYPT`, production exceptions/export policy remain open; not selected by Phase 03. No storage/session lifecycle implemented.
- `P03-DEV`: WXT-only dev permissions and potentially blocked HMR; use production rebuild/manual reload. This is not a reason to broaden access.

## Acceptance decision

| Criterion | Decision |
|---|---|
| Explicit consent separated from browser invocation | PASS — synthetic controller + source review; real UI NOT TESTED |
| Exact tab/origin and denied unknown/production/unauthorized declarations | PASS — synthetic policy + revalidation tests; organizational authorization remains user stated |
| Denial/revocation/tab-change and async stale results | PASS — mocked controller; browser event delivery NOT TESTED |
| No capture before Start; recording unavailable until 04 | PASS — structural/source checks; no capture capability exists |
| Minimum permissions/no broad host access | PASS — generated production manifest; dev-only additions separately audited |
| Browser smoke/real Odoo compatibility | UNKNOWN / NOT TESTED |
| Accepted by ChatGPT review? | **UNREVIEWED** |
| Ready for next phase? | **NO** — Phase 03 PROVISIONAL pending review |

Accepted progress remains **3/22**. **STOP after Phase 03.**

## Git and next step

- Starting/ending HEAD: `fe90532b11e043344aa2abfb7a539a0156e30cd5`; branch/upstream unchanged. Starting whole-repo tree clean; ending 19 project-scoped paths (14 modified, 5 new), all unstaged/uncommitted. Tracking/live origin matched baseline at preflight; no new commit/push/publication.
- Next single action: owner executes the Phase 03 fixture-only browser checklist and submits artifacts for ChatGPT review. Do not begin Phase 04 until Phase 03 accepted and separately authorized.

## Browser smoke-only verification — 2026-10-22 (Africa/Cairo)

Current owner authorization: actual Phase 03 installed-extension smoke only; documentation/evidence changes, no functional fixes or later phase. **Phase 03 remains PROVISIONAL, progress 3/22.**

Initial preflight stopped on unexpected untracked `docs.zip`; owner then confirmed deletion and instructed continuation. Resumed preflight verified the exact root/origin/branch/HEAD/upstream and expected 19 unstaged Phase 03 paths, no staging. `docs.zip` was absent. Existing code/package/config changes preserved byte-for-byte; no clone/switch/reset/commit/push/deployment. Starting/ending HEAD `fe90532b11e043344aa2abfb7a539a0156e30cd5`, branch `feature/odoo-tracebridge`, upstream `origin/feature/odoo-tracebridge`. This smoke run began with the existing dirty worktree, unlike the historical implementation preflight above.

`npm run build` **PASS**, exit 0: WXT 0.21.4 / Vite 8.3.5, production `.output/chrome-mv3`, four files / 227.82 kB. Output files: `manifest.json`, `popup.html`, `chunks/popup-B2zh8ibR.js`, `assets/popup-BhW7hcAC.css`. Production artifact/static manifest check PASS: only activeTab, no host/optional grants, no background/content scripts; incognito not_allowed. This is build/static evidence only, **not** installation/effective-permission or browser smoke proof. No test/typecheck/lint reruns; historical 52-test result is not a current runtime result.

**Browser tested: NONE. Chrome/Brave version UNAVAILABLE; browser OS UNVERIFIED; build host Linux.** CUA `cua.getState()` exposed only empty Codex In-app Browser and MCP Apps surfaces, no Chrome/Brave/native app. Direct `cua.createBrowserTab('chrome', 'chrome://extensions', { sessionName: '🧪 TraceBridge smoke' })` returned **`Error: Browser is not available: chrome`**. No browser profile created, extensions management page opened, extension installed/reloaded, permission Details inspected, popup/DevTools/network console observed or screenshots taken. No available Brave surface. No browser security policy changed.

No existing owner-controlled synthetic HTTPS/default-port fixture was identified in supplied inputs/project records; existence elsewhere UNKNOWN. No unrelated public website substituted, fixture created, false authorization declaration, or customer/Odoo access. Positive cases additionally require the owner to identify an existing authorized synthetic origin.

Browser counts: **0 PASS / 0 FAIL / 12 NOT TESTED**, all **BLOCKED**. Auxiliary preflight/build/output-static checks: three PASS, excluded from browser counts.

| ID | Browser test | Result | Exact observed behavior / limitation |
|---|---|---|---|
| B01 | Popup opens and renders correctly | BLOCKED / NOT TESTED | Not opened: no connected Chrome/Brave; direct Chrome access attempt unavailable. |
| B02 | Selected tab ID and exact origin displayed correctly | BLOCKED / NOT TESTED | No installed popup or selected browser tab observed. |
| B03 | Consent initially absent | BLOCKED / NOT TESTED | No popup observed; previous mock/source evidence is not smoke evidence. |
| B04 | Approval requires exact origin, test/staging and explicit authorization | BLOCKED / NOT TESTED | No installed browser and no existing owner-controlled HTTPS/default-port synthetic fixture identified in supplied records. |
| B05 | Production/unknown/unauthorized/mismatched declarations rejected | BLOCKED / NOT TESTED | No actual form interaction observed; no unrelated website substituted or false authorization entered. |
| B06 | Approval does not enable recording; Start remains disabled | BLOCKED / NOT TESTED | Positive approval blocked by missing browser/fixture; no runtime Start state observed. |
| B07 | Deny and Revoke clear consent | BLOCKED / NOT TESTED | No actual popup interaction or consent transition observed. |
| B08 | Popup close/reopen requires fresh consent | BLOCKED / NOT TESTED | No popup opened or reopened. |
| B09 | Tab switching/navigation/stale identity cannot reuse approval | BLOCKED / NOT TESTED | No installed popup, approval or browser tab navigation observed. |
| B10 | Restricted URLs/unsupported schemes/incognito fail safely | BLOCKED / NOT TESTED | No extension-capable browser; no installed behavior observed. |
| B11 | Effective installed permissions only activeTab, no host grants | BLOCKED / NOT TESTED | Generated manifest statically matches activeTab-only/no host grants; effective installed permissions and Details UI NOT TESTED. |
| B12 | No background capture/observers/unexpected network/runtime errors | BLOCKED / NOT TESTED | No installed runtime, DevTools, network monitor or console observed; absence of runtime behavior cannot be certified. |


No runtime functional defect could be established; lack of access is a verification blocker, not a product PASS/FAIL. Screenshots of popup/approval/rejection/permission Details are **UNAVAILABLE**, not fabricated. `P03-BROWSER` remains open; `P03-FIXTURE` tracks the unidentified authorized synthetic fixture.

Manual follow-up: owner connects Chrome/Brave or uses an isolated local test profile, loads the exact production directory from chrome://extensions or brave://extensions, records browser/version/OS and installation/effective permissions/runtime errors, and runs each case above on an existing explicitly authorized HTTPS/default-port synthetic fixture. Follow the unchanged [runbook](../06_DEPLOYMENT_RUNBOOK.md#phase-03-owner-browser-smoke--not-tested) steps 1–9, including denied/unknown/production/mismatched authorization, fresh popup consent, tab/navigation invalidation and network/observer checks. If either prerequisite is unavailable, retain affected NOT TESTED labels; never bypass security or attest an unrelated site. Submit sanitized screenshots/results for ChatGPT/owner review; do not begin 04.

Evidence ZIP outside Git: `/tmp/tracebridge-phase03-smoke.zip`, created and integrity/member contents verified after the final status update. Contains sanitized CUA inventory/direct access error, exact build summary, production manifest/artifact SHA-256, per-case Markdown/JSON results and all five updated evidence reports. **Zero screenshots**, because no installed browser surface existed. `git diff --check`, unchanged-source/non-target hashes, exact whole-repo 19-path scope, no staged paths and documentation checks verified after status.

Tools actually used in this smoke attempt: shell/Git/npm/Python and CUA inventory/direct Chrome access. No new skill, dependency, agent or mocked/simulated browser test invoked; existing Ponytail scope discipline retained. No source/config/package changes. Acceptance remains **UNREVIEWED**, next phase **NO**, **STOP after Phase 03 smoke verification**.

## Automated completion and loopback policy — 2026-10-22 (Africa/Cairo)

This dated section supersedes the earlier HTTPS-only restriction, CUA-only browser blocker, unidentified-fixture blocker, manual owner-testing requirement and 19-path/52-test snapshot above. Historical evidence remains intact. **PROVISIONAL — owner/ChatGPT acceptance pending; accepted progress 3/22.** Phase 04 NOT STARTED.

### Scope and implementation

Owner explicitly approved first-class loopback development and Codex-owned automated phase verification. Preflight verified the exact project/Git root/origin/branch/upstream/local/tracking/live remote HEAD `fe90532b11e043344aa2abfb7a539a0156e30cd5`. Started with **19 existing project-scoped unstaged paths**, including docs/Phases/PHASE_02.md; preserved them and found no unrelated changes. No clone/switch/reset/stage/commit/push.

Shared consent policy uses URL parsing and exact normalized origin equality. HTTP is eligible only for normalized localhost, 127.0.0.1 or [::1]; any loopback approval requires Local Development. Remote HTTPS requires Test/Staging. Default ports normalize away; non-default ports remain part of consent. The form requires the displayed canonical origin, without slash/path/query/fragment, and true authorization. It never guesses Odoo or auto-authorizes a local tab. Invalid schemes/credentials/LAN/custom DNS/misleading hostnames/ordinary remote HTTP/unknown/production are denied. Approval still rechecks exact tab/window/origin, uses async revision invalidation, and discards transient consent on closure. No recording/session lifecycle/persistent case evidence was added. Native screenshot review found existing max-width:100vw shrank the browser popup to 182px; removing that constraint restores 390px, asserted in native E2E.

Testing reaches package/lock scripts, Playwright/Vitest config, an isolated loopback fixture and native action helper, manifest audit and verification runner. Only exact-pinned @playwright/test 1.64.1 plus its playwright/playwright-core dependencies were added. Chromium runs with sandbox enabled, temporary profiles removed in finally blocks; fixture servers bind 127.0.0.1 / ::1 at OS-allocated ports and close after tests. No existing Odoo service on 8069 is contacted. Dev manifest generation uses a loopback-only WXT child process, stopped as a process group. No sudo/system/DNS/certificate/firewall/browser-wide setting changes.

### Verification evidence

| ID | Exact command / observation | Result | Boundary |
|---|---|---|---|
| P03-A01 | Whole-root porcelain status, identity/upstream, git ls-remote origin refs/heads/feature/odoo-tracebridge | PASS | Baseline matches; 19 starting paths, project only |
| P03-A02 | npm install --save-dev --save-exact @playwright/test@1.64.1; npm ci | PASS | 246 packages added / 247 audited on clean install; npm reports 0 vulnerabilities |
| P03-A03 | npx playwright install chromium | PASS | Unprivileged bundled Chromium 156.0.8078.4 / revision 1248; no install-deps/sudo |
| P03-A04 | npm run verify | PASS, exit 0 on final run | Production build, strict typecheck, lint, unit/regression, separate manifest audit, E2E, git diff --check; machine JSON/logs |
| P03-A05 | npm test via verify | **123 PASS / 0 FAIL / 0 skipped**, 2 files | Synthetic policy, mocked browser lookup integration, races/stale state and source boundaries; not counted as browser tests |
| P03-A06 | npx --no-install playwright test via verify | **10 PASS / 0 FAIL / 0 BLOCKED / 0 skipped** | 9 native action specs; 1 direct-popup spec. Actual unchanged production MV3 artifact |
| P03-A07 | Production/development manifest assertions; installed chrome.runtime.getManifest / permissions.getAll | PASS | Production only activeTab, empty installed origins; no hosts/worker/content scripts, incognito not_allowed; dev-only WXT additions documented |
| P03-A08 | Browser console/pageerror/context request logs and traces; source boundaries | PASS within observed scope | No JS console errors/page errors or non-loopback HTTP(S) context requests; only packaged/browser-internal/fixture resources observed. No whole-browser/OS packet claim |
| P03-A09 | Actual screenshots / width assertion | PASS | Real popup screenshots and traces; viewport captures show top and controls separately; native full-page capture produced stitching artifacts and was replaced; body 390px after fix |
| P03-A10 | Scope/whitespace/docs/canonical hashes/archive assertions after final ledgers | PASS | Verified outside-Git ZIP, CRC/inventory/SHA-256; no profiles/node_modules/customer data |

Versions: Node v24.19.0, npm 11.17.0, WXT 0.21.4, Vite 8.3.5, TypeScript 6.0.3, ESLint 10.0.1, Vitest 5.0.5, Playwright 1.64.1, Chromium 156.0.8078.4, Linux x86_64. Detailed OS/version/log JSON in archive. Final security review also added HTTPS LAN/local-DNS negatives so Test/Staging cannot bypass the local boundary, while exact remote DNS labels and public IPv4 boundaries remain eligible. Known private/shared/link-local addresses and local suffixes are denied; DNS resolution is never probed, so user declarations cannot certify a domain’s actual deployment. Earlier harness attempts hit a Pin-to-toolbar selector mismatch, Chromium popup targets of type other, an exact label mismatch, and strict test-fixture typing errors. Corrected in scope; final checks rerun. Earlier failed aggregate logs retained as attempt-01.log / attempt-02.log; X11 window-manager and NO_COLOR warnings are harness diagnostics, not extension JS errors.

### Actual browser matrix

| Spec | Coverage |
|---|---|
| Direct popup | Actual MV3 loads/renders, installed grants, Local Development option, fail closed without toolbar invocation, disabled approval/Start, Deny/Revoke |
| Native action consent flow | True activeTab, exact IPv4 origin, initially absent consent, production/unknown/test/staging blocked on loopback, checkbox required, cross-host/port/scheme/path denials, explicit local approval, Deny, close/reopen/fresh approval, Revoke, Start disabled |
| Native localhost | Explicit authorized localhost consent on dynamic HTTP port |
| Native IPv6 | Explicit authorized [::1] consent on dynamic HTTP port; supported on this host |
| Native second port | Explicit consent on a separately allocated valid loopback port |
| Native tab switch | Existing approval invalidates/closes; new tab needs fresh empty declaration and checkbox |
| Native same-origin full navigation | Existing approval invalidates/closes; new document needs fresh consent even if browser grant survives |
| Native cross-port navigation | New exact port needs fresh declaration/consent |
| Native cross-host navigation | localhost/IPv4 separation needs fresh declaration/consent |
| Native restricted page | chrome://settings unavailable; approval and Start disabled |

Unit negatives additionally cover browser default ports and explicit :80/:443 normalization, bounds/invalid ports, remote HTTP, localhost.evil/sub.localhost/LAN/custom DNS, credentials/protocol confusion, remote HTTPS Test/Staging, absent/malformed authorization, unsupported schemes/incognito/pending/missing identity, wrong windows and late async lookup races. These are isolated-policy/mock integration results, not equivalent real-browser interactions. Approved HTTPS remote fixtures and default port 80 were not contacted.

### Authentic invocation and limitations

The official [Playwright MV3 approach](https://playwright.dev/docs/chrome-extensions) uses bundled Chromium with persistent context and load-extension arguments. No production worker exists, so the unpacked ID is derived from the absolute-path Chromium hash and validated by loading the real popup. The harness configures Chromium's built-in Activate the extension shortcut through chrome://extensions/shortcuts in its disposable profile, then xdotool sends native Ctrl+Shift+Y to the uniquely identified test window after focus checks. The browser grants actual activeTab and opens its own popup; [Chrome documents action/keyboard gestures](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab). No API/grant mocks, action.openPopup substitute, test extension, manifest test permission or unsafe extension-debugging flag is used. Physical toolbar mouse clicking remains NOT TESTED; native action invocation is the coverage claimed.

Pinned Playwright 1.64.1 requires internal PW_CHROMIUM_ATTACH_TO_OTHER to expose Chromium's native extension popup targets. This is test-only and marked shortcut in code; retest/remove when public support exists. DISPLAY + existing xdotool worked here. Xvfb is absent and NOT TESTED; no privileged install attempted. Headless direct-popup tests alone cannot satisfy native-action acceptance; verify reports skipped mandatory cases as BLOCKED and exits nonzero.

### Open risks, acceptance and Git

P03-BROWSER and P03-FIXTURE are **RESOLVED for this isolated synthetic Chromium matrix**, replacing the former CUA/fixture blockers. No current mandatory Phase 03 automation case is blocked. Remaining NOT TESTED: physical toolbar mouse click, Chrome Stable/Brave Phase 03 and other OS/browser/minimum-version compatibility, real Odoo/remote Odoo.sh/HTTPS/default-port service behavior, browser UI withholding/removal of temporary site grants/disable/re-enable, incognito browser UX, dev HMR and real Odoo noninterference/performance/security certification. Policy tests cover missing/revoked lookup and incognito; they do not turn these unobserved UI paths into PASS. Temporary grants may lack onRemoved events. Environment/organization authority remains user stated; no production/Odoo detector.

Every future phase follows the permanent [Codex-owned testing policy](../06_DEPLOYMENT_RUNBOOK.md#permanent-codex-owned-phase-verification-policy). Owner reviews results and controls publication, without routine browser tests or fixture work. Phase 03 remains PROVISIONAL, review UNREVIEWED, progress 3/22, next-phase readiness NO. No Phase 04, capture, persistence, RPC, telemetry or Plemo. Historical Phase 02 owner-attested Brave PASS and Google Chrome NOT TESTED retained.

Final branch feature/odoo-tracebridge, HEAD `fe90532b11e043344aa2abfb7a539a0156e30cd5`, upstream origin/feature/odoo-tracebridge; **28 project-only changed paths** (17 modified / 11 new), unstaged/uncommitted, no push. Full path inventory in archive. Evidence: `/tmp/tracebridge-phase03-automated-evidence.zip`, verified after handoff second last/status last. Next action: owner/ChatGPT reviews Phase 03 evidence and accepts or requests Phase 03 corrections. STOP; no Git publication or Phase 04.

Skills/tools actually used: Ponytail full; functions shell/Git/npm/Python, official-source web research, Playwright/Chromium/native xdotool, local image inspection. WarpGrep/Valyu/Superpowers unavailable; no CUA, agents or real Odoo used in this execution.
