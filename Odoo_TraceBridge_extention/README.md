# Odoo TraceBridge

Phase 03 permission and consent preview. **Recording unavailable — not implemented.** Start stays disabled. Phases 00–02 COMPLETE; Phase 03 **PROVISIONAL**, accepted progress **3/22**, pending owner/ChatGPT review. Phase 04 is NOT STARTED.

## Local development is a primary use case

Explicitly authorized local Odoo development now supports `http://localhost:8069`, `http://127.0.0.1:8069`, other URL-valid loopback ports, browser-normalized default ports, and `http://[::1]:<port>` where IPv6 is available. No certificates, proxies or public exposure are required. The prior HTTPS-only restriction is superseded for loopback development by owner instruction on 2026-10-22.

Invoke the extension on the intended tab. Type its **displayed normalized exact origin**, select **Local Development**, confirm site/data-owner authorization and click **Approve consent only**. Loopback alone never establishes Odoo identity or authorization. Local Development rejects non-loopback hosts; loopback approval requires Local Development. Authorized remote HTTPS Odoo.sh/test/staging origins use Test or Staging, including exact non-default HTTPS ports. Production/unknown, ordinary remote HTTP, LAN/custom DNS, misleading local hostnames, credentials, unsupported schemes, mismatched host/port/tab and missing confirmation fail closed. Consent is transient; Deny, Revoke, popup closure and tab/document changes invalidate it. Browser activeTab is never recording consent.

## Setup and automated verification

Node 22+ and npm. Verified Node `v24.19.0`, npm `11.17.0`; exact-pinned Playwright `1.64.1`, WXT `0.21.4`, React `19.3.1` and lockfile. Only Playwright and its two required packages were added for automation.

```sh
npm ci
npx playwright install chromium
npm run verify
```

`verify` builds production, checks strict TypeScript/lint, runs all policy/integration/regression tests, separately generates/audits production and development manifests, runs isolated Chromium extension E2E, and checks diff whitespace. Results/logs/screenshots/traces are in ignored `.artifacts/`; inspect `verification.json`, `unit.json`, `e2e.json` and `browser/*/browser.json`. Final run: **123 unit/integration PASS; 10 browser PASS (9 native action, 1 direct popup); 0 FAIL, 0 BLOCKED, 0 skipped**. The clean `npm ci` passed, with 0 vulnerabilities reported by npm (not a security certification).

```sh
npm test
npm run test:e2e
npm run test:e2e:headed
npm run dev -- --host 127.0.0.1
```

E2E automatically builds/loads actual `.output/chrome-mv3` in temporary isolated persistent Chromium profiles. On Linux, native action tests use an available X11 display and existing `xdotool`; headless direct-popup coverage is separate. If already installed, `xvfb-run -a npm run verify` supplies a disposable display (Xvfb unavailable/NOT TESTED here). Missing native prerequisites cause explicit skipped/BLOCKED coverage; `verify` exits unsuccessfully if mandatory E2E specs skip. Do not install system dependencies with sudo or weaken browser security to recover. Full [automation policy and runbook](docs/06_DEPLOYMENT_RUNBOOK.md).

## Permission and privacy boundary

Production requests **only activeTab**, incognito disabled, packaged scripts and `connect-src 'none'`. No host/optional grants, background worker, content scripts, storage, collectors, case persistence, RPC, telemetry or Plemo. Revoke clears app consent, not Chrome's temporary grant. Cross-origin navigation/tab closure ends browser access; same-origin navigation may retain the browser grant, while app consent still invalidates. A future worker must independently verify authority before capture.

Development `.output/chrome-mv3-dev` adds WXT-only tabs/scripting, localhost host access, reload worker and localhost script CSP; never distribute or use on customer pages. Its retained connect-src none may block HMR; rebuild production/reload as fallback. Local Odoo HTTP support is independent of development-build HMR.

## Evidence and limits

Chromium `156.0.8078.4` on Linux tested against synthetic loopback fixtures only. Authentic invocation uses the browser's built-in Activate Extension shortcut, configured in the disposable profile and sent as native input. It grants real activeTab and opens the browser-owned popup; no grant/API mocks or production manifest changes. Physical toolbar mouse clicking and the Chrome minimum version 120 are NOT TESTED. The pinned Playwright internal popup-target hook is a maintenance limitation. Context request/console observations are bounded runtime evidence, not OS-wide network or security certification.

Historical Phase 02 Brave popup smoke PASSED (owner-attested, accepted 2026-10-21); **Google Chrome Stable remains NOT TESTED**. No real Odoo version, edition, hosting environment, customer or production system was accessed/certified. Future features remain PLANNED. Owner reviews evidence and authorizes Git publication; routine testing is Codex-owned.

- [Phase 03](docs/Phases/PHASE_03.md) · [test evidence](docs/04_TEST_EVIDENCE.md) · [blockers](docs/05_BLOCKERS_AND_DECISIONS.md)
- [Status](docs/00_PROJECT_STATUS.md) · [handoff](docs/07_HANDOFF.md) · [master plan](docs/01_MASTER_PLAN.md) · [ADRs](docs/02_ARCHITECTURE_DECISIONS.md)
- [Architecture](docs/ARCHITECTURE.md) · [security/privacy](docs/SECURITY_PRIVACY.md) · [canonical blueprint](docs/Odoo_TraceBridge_Complete_Implementation_Blueprint.md)
