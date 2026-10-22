# Deployment Runbook

## Current status

NOT RELEASE-READY. Phase 03 **PROVISIONAL**, accepted **3/22**, pending owner/ChatGPT review; no Phase 04. Local Development is an approved primary use case. Historical Phase 02 Brave popup smoke PASSED (owner-attested); Google Chrome Stable NOT TESTED. The old manual owner smoke checklist below is preserved only as historical evidence; Codex now owns routine verification.

## Reproducible automated commands

From `/home/https_ali_muhammed/Plementus/Tools/Odoo_TraceBridge_extention`, Node 22+ / npm:

```sh
npm ci
npx playwright install chromium
npm run verify
```

Clean installation, production build, strict typecheck, lint, 123 policy/integration/regression tests, 10 real Chromium extension specs and separate prod/dev manifest/diff checks PASS. Exact versions/logs in [test evidence](04_TEST_EVIDENCE.md). Only Playwright 1.64.1 was added directly; all dependencies are exact-pinned and locked.

```sh
npm run build
npm run typecheck
npm run lint
npm test
npm run test:e2e
npm run test:e2e:headed
node scripts/audit-manifests.mjs
npm run dev -- --host 127.0.0.1
```

`test:e2e` builds production automatically; verify builds it once before running Playwright. E2E uses bundled Chromium/persistent temporary profile and actual `.output/chrome-mv3`. Never pass an owner's browser profile. A Linux X11 display plus existing xdotool enables native action tests automatically; explicit TRACEBRIDGE_HEADED=1 requires it, TRACEBRIDGE_HEADED=0 runs only direct-popup coverage and records native cases skipped. If Xvfb/xdotool are already installed, `xvfb-run -a npm run verify` is a supported setup route to attempt; Xvfb itself is absent/NOT TESTED on this host. Do not use sudo/install-deps, change DNS/certificates/firewall, or disable browser security to overcome blockers. Missing native prerequisites → BLOCKED; verify returns nonzero for mandatory skipped E2E cases. Preserve the technical cause, attempted command and logs.

Native helper configures the built-in Activate Extension shortcut in the isolated profile and delivers native Ctrl+Shift+Y to its uniquely identified window. This is authentic browser action/activeTab coverage, not direct popup/grant simulation. Pinned Playwright uses PW_CHROMIUM_ATTACH_TO_OTHER for native popup targets; the code marks this maintenance shortcut. Physical toolbar mouse clicking remains NOT TESTED.

Fixture servers bind only 127.0.0.1 and ::1 at OS-allocated ports; localhost resolves normally. No Odoo data, credentials, remote service or existing port 8069 is used. Finally cleanup closes browser contexts, removes profiles, closes fixture sockets and terminates the WXT dev-generation process group. Runtime logs, sanitized PNGs and traces are in ignored `.artifacts/`; JSON reports: verification.json, unit.json, e2e.json and per-spec browser.json. Playwright traces can be opened locally with `npx playwright show-trace <trace.zip>`; never include owner/customer sessions in these artifacts.

## Local development consent

Invoke on the intended eligible tab; type the displayed canonical exact origin, select Local Development, confirm site/data-owner authorization, Approve consent only. HTTP localhost/127.0.0.1/[::1] and browser-normalized valid ports are allowed explicitly; no HTTPS proxy/certificate/public exposure is required. Loopback is not Odoo detection or automatic authorization. Remote HTTPS Test/Staging remains available; ordinary remote HTTP, LAN/custom DNS, misleading localhost-like hosts, credentials, unknown/production and exact tab/origin/port mismatches fail closed. Prior HTTPS-only loopback restrictions are superseded by owner approval on 2026-10-22.

Consent expires with popup closure/tab/document/window changes; Deny/Revoke clear it. Start remains disabled. Revoke does not remove Chrome's temporary activeTab; same-origin navigation can retain browser access even though the app decision invalidates. No capture/worker/content script/storage/session evidence/RPC/telemetry/Plemo exists.

Production manifest: only activeTab, incognito not_allowed, no optional/host grants, no worker/content scripts, packaged script CSP/connect-src none. Dev manifest is distinct: WXT tabs/scripting, localhost host/script access and reload worker; never distribute/load against real customer pages. connect-src none can block HMR; rebuild production/reload fallback. Local Odoo support does not require dev HMR.

## Permanent Codex-owned phase verification policy

For **every future implementation phase**, Codex must:

1. Add tests for the new functionality and security-sensitive negative cases, using synthetic fixtures where possible and real authorized environments only within explicit scope.
2. Execute production build, strict typecheck, lint, unit/integration and all existing regression checks; validate a clean/reproducible installation when package/lock changes warrant it.
3. Execute applicable actual browser extension E2E, keeping native action/activeTab behavior, direct popup rendering and mocked policy/integration coverage separately labeled.
4. Audit freshly generated production **and development** manifests and shipped asset/permission boundaries.
5. Record exact commands, exit codes, versions/OS/date and observed PASS/FAIL/BLOCKED/NOT TESTED cases in the phase report and test ledger; do not infer browser compatibility or Odoo support from synthetic tests.
6. Generate a machine-readable report and sanitized real screenshots/traces/logs where applicable; never fabricate evidence or include credentials/customer data/browser profiles.
7. Fix authorized in-scope failures and rerun affected checks before requesting acceptance. Escalate genuine automation limitations with attempted commands/evidence; mandatory blocked coverage prevents a fully verified claim.
8. Create an evidence ZIP outside Git, inspect its inventory, verify integrity/content hashes and record its exact path. Exclude node_modules, profiles/cookies/secrets/customer data and unrelated/generated bulk.
9. Preserve historical evidence, update the detailed phase report and supporting docs, update handoff SECOND LAST and project status LAST, then perform read-only final checks/packaging.
10. Leave routine browser tests, fixture creation and evidence collection to Codex. The owner reviews results and authorizes Git publication; no silent waiver, automatic commit/push or next-phase work.

## Review and publication boundary

Current verified archive: `/tmp/tracebridge-phase03-automated-evidence.zip`. Review [Phase 03](Phases/PHASE_03.md) and [test evidence](04_TEST_EVIDENCE.md), including explicit NOT TESTED inventory. Chromium synthetic success does not certify Google Chrome Stable/Brave/old versions/real Odoo or security/performance. No deployment/production action is authorized.

Branch feature/odoo-tracebridge / HEAD fe90532b11e043344aa2abfb7a539a0156e30cd5 / upstream origin/feature/odoo-tracebridge unchanged; 28 project paths unstaged/uncommitted, no commit/push. Owner/ChatGPT acceptance is the next action. STOP after Phase 03.

## Historical snapshots — superseded by the current record above

## Current status

**NOT RELEASE-READY.** Phases 00–02 COMPLETE; accepted progress **3/22**. Phase 03 permission/consent preview **PROVISIONAL**, recording unavailable. Phase 02 was accepted by owner/ChatGPT on 2026-10-21 at pushed `fe90532b11e043344aa2abfb7a539a0156e30cd5`; owner-attested Brave popup smoke PASSED, Google Chrome NOT TESTED. Historical execution evidence is preserved in [Phase 02](Phases/PHASE_02.md). Phase 03 Chrome **and Brave** smoke NOT TESTED; no extension-capable browser is connected.

## Local commands and artifact

From `/home/https_ali_muhammed/Plementus/Tools/Odoo_TraceBridge_extention`, Node 22+ and npm:

```sh
npm ci
npm run build
npm run typecheck
npm run lint
npm test
npm run dev
```

Phase 03 build/typecheck/lint/52 tests pass. Fresh npm ci was not repeated: accepted Phase 02 install and unchanged package/lock pins retained. Production output is **`.output/chrome-mv3`**, four local manifest/HTML/JS/CSS files. Production permissions exactly activeTab; no optional/host grants, background/content scripts, storage or capture. Incognito disabled. Packaged-only script CSP, connect-src none.

Development output `.output/chrome-mv3-dev` is **not distributable**: WXT adds tabs/scripting, localhost host/script access and a reload worker. Use only a disposable local fixture profile, never real Odoo/customer pages. Phase 03 retains connect-src none, which may block HMR/WebSocket; no relaxation added. Safe fallback: stop dev server, rebuild production and manually reload the unpacked extension. No dev runtime/HMR success is claimed.

## Phase 03 owner browser smoke — NOT TESTED

Use a disposable profile, current patched Chrome Stable (manifest floor 120) or Brave, and only owner-controlled **synthetic HTTPS/default-port fixtures**. Do not navigate to real/customer Odoo to perform these checks. No fixture server, customer instance or compatibility is invented/provisioned by this task. Record browser/version/OS and fixture provenance without credentials/query/record data. A synthetic fixture can simulate an Odoo test page; it does not establish Odoo support.

1. Build production. Open `chrome://extensions` (Brave: `brave://extensions`), enable Developer mode, Load unpacked, select the absolute project `.output/chrome-mv3` directory. Confirm installation, inspect runtime Errors. Use Reload after rebuilding an already loaded copy. Record non-sensitive screenshots of the extension Details/permissions and popup. Expect activeTab only; no persistent/all-site host permission and no incognito access.
2. Select fixture tab A. Click the toolbar icon to invoke activeTab. Confirm **Recording unavailable — not implemented**, correct tab/window IDs and exact origin only (no title/path/query/fragment). Browser access should be available, consent required; Start disabled. No investigation should begin.
3. With defaults untouched, confirm approval is disabled. Production or Unknown selection, unchecked authorization or a different origin must keep approval disabled. Try a different scheme/port/subdomain/path; only the identical displayed origin with authorized test/staging declaration may be approved. Do not attest authorization for any real or unrelated site. Confirm labels/warnings can be read and inputs/buttons reached by keyboard, with visible focus.
4. Enter the exact authorized fixture origin, choose test/staging, check authorization, click **Approve consent only**. Expect consent approved for this popup/tab/origin; Start remains disabled and nothing is recording. Deny should show denied and remove target; reopen to review afresh. Approve again, Revoke should show revoked and remove target. Revoke does not revoke Chrome's activeTab permission; close/navigate the fixture tab or disable the extension to end browser access separately.
5. Approve A, close popup, reopen it: consent must be required again. Before approving, switch to fixture tab B (also try a second tab on the same origin), another window, reload/full navigation or a different origin. Popups normally close during these actions; reopening must require fresh confirmation for the current tab/origin. If kept open during browser event delivery, expect tab-changed and no target. Old approval must never appear for B. Do not infer event-delivery coverage from popup closure alone.
6. Invoke on browser settings/new-tab, file/data/about pages, known extension store, HTTP or custom HTTPS port, loading fixture or incognito. Expect unsupported/unavailable or the browser blocking the popup entirely. Incognito should disallow the extension. Missing URL/access must fail closed, with no host permission prompt/expansion.
7. Test denial/revocation via browser controls where available: deny/withhold site access, disable extension, navigate/close the granted fixture tab. Re-enable/reinvoke only on the intended fixture. Expect unavailable/revoked/tab-changed, or fresh required consent after popup closes. Browser UI/grant behavior varies; record exact actions and observed results. A permissions removal event is not promised for every temporary activeTab expiry. Do not report an unexercised event path as PASS.
8. Inspect popup DevTools/runtime errors and extension-origin network panel through initial open, form approval, denial/revoke and reopen. Expect no extension-initiated external requests, no storage writes and no injected scripts/observers. Normal fixture traffic belongs to the page and is not extension telemetry. If the browser cannot expose a check, mark NOT TESTED. Capture no secrets/customer content in screenshots/logs.
9. Report each step PASS/FAIL/NOT TESTED, exact browser/build/OS, target fixture origin (safe only), screenshots and sanitized runtime errors. Any mismatch is a corrective Phase 03 task; no Phase 04 work. Prior Phase 02 Brave pass does not satisfy this checklist.

## Permission limits and troubleshooting

- Browser invocation grants temporary activeTab access, not recording consent. No permissions.request or persistent host grant is used. URL visibility identifies scope but cannot prove future injection rights or organization authorization.
- Missing access → unavailable. Close popup, select intended eligible tab, reinvoke toolbar. Unsupported URL, unknown/production classification or lack of owner authorization → do not approve; manual evidence only. Never request broad hosts/tabs/scripting as recovery.
- Popup consent is intentionally volatile. Tab/document/window changes and permission-removal events invalidate it; approval rechecks current tab/window/exact origin and drops stale async results. A future worker must independently validate document/permission/session authority before Start; no preview decision is reusable recording authority.
- Origin names cannot reliably identify production/Odoo. Environment/authorization are user stated. HTTP/private HTTP/custom ports need separate policy/fixture review. No organization inventory or production exception is approved.
- No saved investigations/settings/export exist to delete. Revoke clears popup consent; browser grant removal is separate. Removing/disabling the extension is a manual owner action. No published package, rollback binary or production traffic/deployment exists.

## Git and release boundary

Root `/home/https_ali_muhammed/Plementus/Tools`, project nested as above; origin `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`, branch `feature/odoo-tracebridge`, unchanged HEAD/upstream baseline `fe90532b11e043344aa2abfb7a539a0156e30cd5`. Phase 03 changes unstaged/uncommitted, no push/merge/reset/switch/clone. Owner reviews only; no publication commands executed.

Retention, encryption, export and production exceptions remain separate decisions. Real Odoo/support/security/performance/Chrome compatibility NOT TESTED. Plemo stays optional discovery 21. Next action: owner fixture-only smoke and ChatGPT review of [Phase 03](Phases/PHASE_03.md); **STOP after Phase 03**.
