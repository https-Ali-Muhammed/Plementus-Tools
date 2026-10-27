# Odoo TraceBridge

Phase 04 **PROVISIONAL — pending owner/ChatGPT acceptance**. Phases 00–03 COMPLETE; accepted progress **4/22**. **Lifecycle only — no diagnostic signals collected.** No Phase 05 capture, client-error/network observer, RPC, telemetry or Plemo.

## Session controls

Invoke the extension on the intended tab. Type its displayed **normalized exact origin**, choose Local Development for HTTP(S) localhost/127.0.0.1/[::1], or Test/Staging for remote HTTPS, confirm site/data-owner authorization, then **Start**. Ordinary remote HTTP, private LAN/custom local names, credentials, production/unknown and mismatched origin/port are denied. Loopback never proves Odoo identity or authority; environment/authority remain user stated.

The MV3 worker owns the session, independently queries the browser-selected tab/window and revalidates access/identity/policy before Start/Resume. No popup-supplied tab ID or boolean grants authority. One open recording/paused case globally. Pause/Revoke invalidates authorization; use **Refresh scope / status**, then a fresh declaration and explicit **Resume**. Stop is terminal. Select a retained case before **Delete selected case**; controls carry that case's worker-issued ID/epoch, never implicitly retarget the focused tab. A stale control is rejected; refresh rather than retrying the old revision.

Navigation/reload, tab/window changes, closure and observed permission removal pause conservatively. Worker termination/restart recovers open cases **PAUSED** with fresh epochs, never recording. Browser/extension restart can clear the ephemeral binding: the old header can be stopped/deleted, but cannot be resumed without its original binding. Closing only the popup does not stop an explicitly started lifecycle. No user actions, navigation signals, RPC or diagnostics are collected in this phase.

## Minimal bounded storage

IndexedDB contains only schema version, random case ID, random epoch, lifecycle state and creation/update timestamps. No origin, authorization, environment, page URL/title, credentials, tokens, cookies, form/business values, bodies, notes or diagnostic events are persisted. A single normalized tab/window/origin binding lives in trusted-context-only `chrome.storage.session`; no `storage.local`/sync settings or app encryption are used.

Conservative **proposals implemented for header-only evaluation**: stop eligibility at 30 minutes from creation (pauses included), maximum 10 retained headers, 24-hour TTL, 5 MiB per case / 20 MiB aggregate serialized application data ceilings. The future 5,000-event ceiling is a documented constant, **not an event-storage API**. Phase 04 accepts zero events; strict tiny headers make byte ceilings unreachable in valid use. Bounds are checked before atomic writes; expiration is applied on access and worker wake. No exact cleanup deadline while closed/asleep; no silent eviction of unrelated cases. Delete atomically removes the selected header and then its related ephemeral binding. No recycle bin; no physical disk/backup erasure promise.

**P01-RETENTION and P01-CRYPT remain unresolved for sensitive evidence.** Owner acceptance of the proposed values and a future sensitive-storage policy remain required before evidence persistence. No encryption/security/Odoo compatibility certification follows.

## Setup and Codex-owned automated verification

Node 22+ and npm; exact dependency pins/lockfile unchanged in Phase 04.

```sh
npm ci
npx playwright install chromium
npm run verify
```

`verify` builds production, runs strict TypeScript/lint/unit/integration/security/regression checks, generates/audits both manifests, exercises real packaged MV3 in isolated Chromium with synthetic loopback fixtures, and checks diff whitespace. Machine reports, logs, screenshots and traces: ignored `.artifacts/`. Detailed current counts and limitations: [Phase 04](docs/Phases/PHASE_04.md), [test evidence](docs/04_TEST_EVIDENCE.md). Codex owns routine verification; owner reviews evidence/publication.

Native action tests use the existing X11 display and xdotool to configure/invoke Chromium's built-in extension action in a disposable sandboxed profile: genuine browser-owned popup and activeTab, no grant/API mocks. Direct popup tests are labeled separately. Missing prerequisites produce BLOCKED/skipped coverage and a failing verify gate. Pinned Playwright's internal popup-target hook remains a maintenance limitation. Worker termination uses CDP ServiceWorker.stopWorker and confirms the stopped event; quota failure uses the browser's real Storage.overrideQuotaForOrigin enforcement, not a mocked storage API. See [runbook](docs/06_DEPLOYMENT_RUNBOOK.md).

## Permission boundary and limits

Production: **activeTab + storage only**, packaged MV3 worker, incognito disabled, no host/optional grants, content scripts, scripting/network/debugger permissions, remote assets or services. CSP keeps `connect-src 'none'`. URL visibility under activeTab is verified for lifecycle binding; injection/document authority for future collectors remains a Phase 05 gate. Permission removal events are not guaranteed for every temporary grant loss; Start/Resume re-query access, and no collector exists to continue reading anything.

Development adds WXT-only tabs/scripting, localhost host/script access and reload code; never distribute or use on customer pages. Its retained connect-src none may block HMR; production rebuild/reload is the fallback. No keepalive or fixed five-second collector lease exists.

Chromium synthetic results do not certify Chrome Stable, Brave Phase 03/04, minimum Chrome 120, other OS/browser, real Odoo, full accessibility, physical toolbar mouse clicks or OS-wide network/security behavior. Historical Phase 02 Brave smoke PASS remains owner-attested. No production/customer Odoo accessed.

- [Status](docs/00_PROJECT_STATUS.md) · [handoff](docs/07_HANDOFF.md) · [master plan](docs/01_MASTER_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md) · [security/privacy](docs/SECURITY_PRIVACY.md) · [decisions](docs/02_ARCHITECTURE_DECISIONS.md)
- [Phase 03 accepted evidence](docs/Phases/PHASE_03.md) · [canonical blueprint](docs/Odoo_TraceBridge_Complete_Implementation_Blueprint.md)
