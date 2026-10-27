# Odoo TraceBridge

Phase 05 **PROVISIONAL — pending owner/ChatGPT review**. Phases 00–04 COMPLETE; accepted progress **5/22**. Phase 04 accepted 2026-10-22 at verified pushed `56ca07d`, with historical **158 unit/integration PASS and 18 Chromium PASS** preserved. Current scope: limited user-action/navigation categories in worker memory. [Phase 05 report](docs/Phases/PHASE_05.md).

## Explicit scope and controls

Invoke the extension on the intended tab, type its displayed normalized exact origin, select **Local Development** for HTTP(S) localhost/127.0.0.1/[::1] at that exact port, or **Test/Staging** for remote HTTPS, confirm site/data-owner authority and click **Start**. Production, unknown, unauthorized or mismatched declarations, remote HTTP/LAN/custom local names and unsupported browser pages are denied. Authority/environment remain user stated; this does not prove Odoo identity or authorize customer use.

Worker-owned Start/Pause/Resume/Stop/Delete and one open case remain. Pause/Revoke ends authorization. Refresh, declare scope again and explicitly Resume. Stop is terminal; Delete names the selected case/revision. Closing the native popup back to the same bound window preserves an authorized session. Navigation/reload, tab switch/close, other/lost window focus, observed revocation, document/access failure and worker restart stop/invalidate capture. Restart recovers PAUSED, with fresh epochs; no reconnect, automatic resume or keepalive. A lost ephemeral binding blocks Resume of the old header.

## What can be observed

After Start, the worker injects only into the selected top-level document in **ISOLATED** world using activeTab+scripting. Trusted generic button/link clicks and limited navigation signals produce allowlisted categories, bounded sequence and coarse elapsed time. Inputs, typed values, text, business labels, selectors, DOM HTML, record identifiers, raw paths/query/fragment and unknown/custom/child-frame targets are excluded. No error, network or RPC capture exists.

The popup shows an accepted-category count and buffer evictions after **Refresh scope / status**. One volatile ring holds at most **128 entries**; **512 admitted collector events per Start/Resume** pauses collection. One message in flight; intervening actions are omitted. Eviction count does not count every omitted/unobservable action. Start/Resume clears prior categories. Worker restart loses all categories. Full navigation/reload may destroy the collector before a navigation category is accepted. In-place rendering and all SPA routes/actions are not reliably observable; missing events do not prove nothing happened.

Collection has a **non-renewing deadline at the existing 30-minute session lifetime**, including pauses. No five-second lease or heartbeat. A separate **3-second injection/handshake setup timeout** fails closed, rather than starting an unavailable collector. These Phase 05 bounds remain reviewable implementation choices. Timer callbacks can be delayed while suspended; event admission checks the absolute deadline independently.

## Storage and security boundary

**P01-RETENTION / P01-CRYPT remain OPEN.** Action/navigation evidence is never persisted by the product: no IndexedDB/event store, storage.local/session event writes, disk logs or encryption claim. Only existing exact six-key non-sensitive headers persist in IndexedDB; one normalized case/tab/window/origin binding is in trusted-context storage.session. Header bounds/deletion remain: 10 cases, 24-hour TTL, 5 MiB/case / 20 MiB serialized header ceilings, cleanup on access/wake; no physical disk/backup erasure promise.

Production permissions: **activeTab + storage + scripting**. Programmatic document-targeted top-frame injection only; no static/all-frame/host/optional grants, MAIN/page command bridge, external listener, telemetry, remote networking, AI or Plemo. Packaged CSP retains `connect-src 'none'`; incognito disabled. Development output adds WXT tabs/localhost/reload exceptions and must never be distributed or used on customer pages.

## Codex-owned verification

Node 22+ and npm; dependencies/lock unchanged. Use synthetic disposable fixtures and profiles only:

```sh
npm ci
npx playwright install chromium
npm run verify
```

Verification builds production, typechecks/lints/tests, audits both manifests, runs actual production MV3 in sandboxed isolated Chromium, and checks diff whitespace. X11+xdotool invokes the genuine browser-owned native action with real activeTab; two direct-popup cases are separately labeled. Missing prerequisites cause BLOCKED coverage and a failing gate. Existing pinned Playwright other-target attachment is a maintenance limit. CDP termination, real browser quota enforcement and accelerated page virtual time are identified explicitly. **200 unit/integration/security PASS (6 files); 32 Chromium PASS (30 native action / 2 direct popup); 0 FAIL, 0 BLOCKED, 0 skipped. All 7 npm run verify gates PASS, exit 0.** Reports/screenshots/traces are ignored under `.artifacts/`; final counts and limits are in [test evidence](docs/04_TEST_EVIDENCE.md).

Chrome Stable, Brave Phase 04/05, real Odoo/customer/production, TLS/remote staging, full WCAG/security/performance and OS-wide traffic certification remain **NOT TESTED**. The historical Phase 02 owner-attested Brave result remains historical. Owner reviews Phase 05 evidence; no routine manual testing or publication is assigned. **STOP after Phase 05.**

- [Status](docs/00_PROJECT_STATUS.md) · [handoff](docs/07_HANDOFF.md) · [master plan](docs/01_MASTER_PLAN.md)
- [Architecture](docs/ARCHITECTURE.md) · [security/privacy](docs/SECURITY_PRIVACY.md) · [ADRs](docs/02_ARCHITECTURE_DECISIONS.md) · [blockers](docs/05_BLOCKERS_AND_DECISIONS.md)
- [Runbook](docs/06_DEPLOYMENT_RUNBOOK.md) · [Phase 04 accepted history](docs/Phases/PHASE_04.md) · [canonical blueprint](docs/Odoo_TraceBridge_Complete_Implementation_Blueprint.md)
