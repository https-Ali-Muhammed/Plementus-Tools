# PHASE_04 — Session Lifecycle & Bounded Persistence

## Scope and owner authorization

Date: **2026-10-22 (Africa/Cairo)**. Phase 04 ONLY, explicitly authorized. **PROVISIONAL — owner/ChatGPT acceptance UNREVIEWED; accepted progress 4/22.** STOP after this phase. No Phase 05 collection, client-error/network observers, RPC, telemetry, services, Plemo or production/customer Odoo access.

GitHub: https://github.com/https-Ali-Muhammed/Plementus-Tools/tree/feature/odoo-tracebridge

Project `/home/https_ali_muhammed/Plementus/Tools/Odoo_TraceBridge_extention`; Git root `/home/https_ali_muhammed/Plementus/Tools`; origin `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`; branch `feature/odoo-tracebridge`; starting/ending HEAD **`8c7349150cf40adae0bdb015064a8d61aebdc74a`**; upstream `origin/feature/odoo-tracebridge`. Preflight verified expected identities, clean **whole-repository** worktree, tracking and live remote SHA. No clone/switch/reset/stage/commit/push.

First reconciled owner/ChatGPT acceptance of Phase 03 dated 2026-10-22 at verified pushed `8c73491`: COMPLETE; progress **4/22**. Preserved provisional history, **123 unit/integration PASS; 10 Chromium PASS (9 native invocation, 1 direct popup)**. Local Development and permanent Codex-owned automated verification approved. Chrome Stable, Brave Phase 03 and real Odoo remain NOT TESTED.

Read README, canonical blueprint Phase 04, docs/00–07, architecture/security, Phase 03 and relevant ADRs. P01-RETENTION/P01-CRYPT were reviewed before code. Current request explicitly permits minimal non-sensitive headers while sensitive evidence policy stays unresolved; no permissive interpretation of earlier proposals.

## Execution summary

Worker-authoritative typed lifecycle, one open recording/paused session globally, strict packaged-UI messages, independent browser validation, UUID epochs/challenges, serialized initialization/mutations, conservative restart/navigation recovery, atomic bounded IndexedDB headers and exact selected-case deletion. Popup preserves the approved form/layout and adds real controls with explicit **no diagnostic capture** status. Existing dependencies, policy and Chromium harness reused; package.json/lockfile unchanged.

Exact project-relative changed paths (**29: 22 modified, 7 new**):

| Path | Change |
|---|---|
| `entrypoints/background.ts` | New synchronous worker listeners, platform adapter, trusted session storage and badge/title |
| `src/session/model.ts` | New lifecycle/header/control types, strict schemas/sender checks, UUID and bounds |
| `src/session/controller.ts` | New serialized worker lifecycle, review/epoch invalidation, recovery, retention and controls |
| `src/session/store.ts` | New atomic strict-durability IndexedDB transactions; no events schema/API |
| `src/session/controller.test.ts` | New worker integration/security/race/failure/retention/replay tests with synthetic platform ports |
| `src/session/boundary.test.ts` | New source/privacy/permission/listener tests |
| `entrypoints/popup/Popup.tsx` | Worker controls, fresh consent, retained-case selection, no-capture/error status |
| `entrypoints/popup/consent.ts` | Keep shared tab/origin/declaration policy; remove superseded popup-local authority |
| `entrypoints/popup/consent.test.ts` | Keep 100 policy regressions; replace obsolete controller/source assertions with worker tests |
| `entrypoints/popup/status.ts` | Honest lifecycle-only status |
| `entrypoints/popup/status.test.ts` | Verify no-capture status |
| `wxt.config.ts` | Add required storage permission; phase description; no hosts/scripting |
| `vitest.config.ts` | Include new src tests |
| `scripts/audit-manifests.mjs` | Verify activeTab+storage/worker and separate dev permissions |
| `tests/e2e/fixtures.ts` | Keep authentic native action harness; add wholly intercepted synthetic HTTPS-origin fixture |
| `tests/e2e/consent.spec.ts` | Packaged MV3 lifecycle/identity/recovery/storage/security browser matrix |
| `README.md` | Current usage, header policy, verification and limits |
| `docs/01_MASTER_PLAN.md` | Phase 03 accepted; Phase 04 provisional |
| `docs/02_ARCHITECTURE_DECISIONS.md` | Reconciliation and ADR-P04-01/02 |
| `docs/03_CHANGELOG.md` | Actual Phase 04 scope |
| `docs/04_TEST_EVIDENCE.md` | Current counts, commands, coverage/limits |
| `docs/05_BLOCKERS_AND_DECISIONS.md` | Current policy/acceptance gates; preserve history |
| `docs/06_DEPLOYMENT_RUNBOOK.md` | Current workflow, recovery, errors and automated evidence |
| `docs/ARCHITECTURE.md` | Transitions, worker/storage/message contracts and source register |
| `docs/SECURITY_PRIVACY.md` | Header-only policy, revocation/deletion and tested limits |
| `docs/Phases/PHASE_03.md` | Acceptance reconciliation only; historical evidence retained |
| `docs/Phases/PHASE_04.md` | This report |
| `docs/07_HANDOFF.md` | Updated SECOND LAST |
| `docs/00_PROJECT_STATUS.md` | Updated LAST |

### Worker authority and transitions

`idle → permission_pending → recording → paused → recording` through explicit Start/Pause/Resume. Stop makes recording/paused terminal stopped. Delete removes any selected retained header. Storage/initialization failures produce controller error and disable controls. A stopped/error/deleted header cannot Resume. Inspect issues a new worker review challenge for the browser-selected eligible scope; it never authorizes recording. Start/Resume consume that one-use challenge plus a freshly entered declaration, independently re-query selected tab/window/normalized exact origin twice around ephemeral storage, and apply existing loopback/remote policy. Missing browser URL/access, pending/incognito, wrong tab/window/port/origin or authorization fails closed. Payload tab IDs are not accepted at all.

Only browser-attested extension ID, exact packaged popup URL/origin/top frame may control the worker. Native popup and a matching packaged popup tab are UI; ordinary page/content/foreign/iframe senders and unknown keys are rejected before storage initialization. Environment/organizational authority remain user assertions, not independently provable browser facts. Native activeTab URL visibility is verified; future collector document/injection authority is **not** claimed.

Controls name exact case ID + epoch, never whichever tab is focused later. Transitions, failed authorization and invalidation rotate appropriate epochs; Pause/Stop/Delete advance a generation immediately before awaited work. Delayed Start/Resume cannot re-create stopped/deleted sessions. Duplicate/replayed challenges and stale epochs fail; a rejected authorization attempt may conservatively pause an open session. There is no stale-write retry or event queue.

Worker listeners register synchronously. A queue serializes initialization, state changes, sweep and deletion. Durable IndexedDB state is authoritative; worker globals only sequence live operations and transient review. Worker restart invalidates all prior reviews, recovers recording/paused headers as **PAUSED** with fresh epochs, then admits commands. Resume requires explicit fresh user action and original temporary binding. Browser/extension restart that loses the binding cannot rebind a retained case; Stop/Delete it and create a new case. Closing only the popup does not stop an explicitly started lifecycle.

Navigation/reload/origin changes, tab close/replacement/detach/activation, window focus change and observed permission removal conservatively pause. Temporary activeTab loss may not emit permission removal; Start/Resume always query browser access anew. No content collector exists, so there is nothing reading signals during suspension/loss. No artificial keepalive, timers/alarms, five-second lease, scripting or broad host recovery. Badge/title reflects last processed lifecycle; it can remain stale until wake after worker termination/expiry. The popup explicitly explains lifecycle-only recording.

### Storage schema, bounds and policy

IndexedDB database **tracebridge v1**, only store **cases**, keyPath **id**:

```ts
{ schema: 1, id: UUIDv4, epoch: UUIDv4,
  state: 'recording' | 'paused' | 'stopped' | 'error',
  createdAt: integerMilliseconds, updatedAt: integerMilliseconds }
```

Only these six keys are permitted. Unknown/invalid/expired/future-timestamp records are purged; inconsistent aggregate state fails closed. No origins, URLs/query/path/fragment/title, environment, authorization, credentials, tokens, cookies, forms, bodies, business values, notes, diagnostic events or arbitrary user text. No event-write message/store exists. Error is a controller failure state; the schema permits a terminal error header but current code creates no error evidence record.

Temporary **chrome.storage.session.binding = { id, target: { tabId, windowId, origin } }**; normalized exact origin only, TRUSTED_CONTEXTS access level. No authorization flag or declaration persisted anywhere. No storage.local/sync settings. No app encryption/key handling or confidential-at-rest certification. Header timestamps still reveal activity timing to an authorized profile reader.

| Proposed limit | Phase 04 enforcement / evidence |
|---|---|
| 30-minute maximum session | From creation, pauses included; at access/wake open header becomes stopped before writes/Resume |
| 10 retained cases | Reject Start at capacity; no unrelated eviction; header-count browser and unit checks |
| 24-hour case TTL | From creation, never extended on access; purge on read/write/wake; browser aging fixture and simulated wake/clock checks |
| 5 MiB per case | Serialized header bytes checked before commit; strict approximately 200-byte header schema accepts zero events |
| 20 MiB total application data | Sum of serialized case headers checked before commit; no diagnostic data or extra stores; not browser physical disk overhead |
| Future 5,000 events | Constant/proposal documented only; **zero events accepted now**, no tested claim of a future collector limit |

These are conservative **implementation proposals under review**, not approved sensitive evidence storage values. P01-RETENTION/P01-CRYPT remain open before sensitive diagnostic persistence. No fixed collector lease is adopted. Cleanup has no exact wall-clock promise while the extension/browser is asleep/closed. Clock rollback/future timestamps conservatively discard headers; no retention extension or resurrection.

Each IndexedDB change validates schema/bounds before clear/put inside one strict-durability readwrite transaction. Abort/termination rolls back that transaction. Binding is written before recording commit; an interrupted Start leaves no header to recover. Successful Delete atomically removes the header first, then clears binding. Interrupted temporary cleanup cannot recreate a missing header; recovery removes orphan bindings. An **unacknowledged interrupted deletion may roll back** and must be inspected/retried against a fresh revision; a successful deletion has no restore path. No physical disk/SSD/profile backup erasure promise. There are no related events/indexes/notes/caches to leave behind in Phase 04.

Quota/storage/init failure produces a safe generic error, error badge and closed controller for that worker. Healthy worker restart performs conservative recovery. No raw errors/payload logging or unbounded retries; no loss of unrelated retained cases to make room.

## Verification evidence

Final `npm run verify` **PASS (exit 0)**: **158 unit/integration/security PASS; 18 Chromium browser PASS (16 native invocation, 2 direct popup); 0 FAIL, 0 BLOCKED, 0 skipped**. All seven gates pass. See [test evidence](../04_TEST_EVIDENCE.md). Machine sources are `.artifacts/verification.json`, `unit.json`, `e2e.json`, `phase04-versions.log`, per-gate logs and per-spec `browser.json`/PNG/trace.zip. Evidence is synthetic only.

| Check | Exact command/action | Environment | Result / limit |
|---|---|---|---|
| Preflight | Git root/origin/branch/HEAD/upstream/whole-repo porcelain, tracking SHA, `git ls-remote origin refs/heads/feature/odoo-tracebridge` | Linux, before edits | PASS: expected 8c73491 and clean whole root |
| Aggregate | `npm run verify` | Node v24.19.0 / npm 11.17.0 | **PASS, exit 0**; build/typecheck/lint/unit/manifests/E2E/diff all pass |
| Unit/integration/security/regression | `npm test -- --reporter=default --reporter=json --outputFile=.artifacts/unit.json` | Vitest 5.0.5, 4 files | **158 PASS / 0 FAIL / 0 skipped**: 100 URL/declaration, 53 worker ports, 4 source, 1 status |
| Actual packaged browser | `npx --no-install playwright test` through verify | Playwright 1.64.1, sandboxed Chromium 156.0.8078.4, Linux X11/xdotool | **18 PASS / 0 FAIL / 0 BLOCKED / 0 skipped**; 16 native invocation and 2 direct popup |
| Manifests | `node scripts/audit-manifests.mjs` through verify | Production build and separately generated dev | activeTab+storage/worker only production; no host/optional/content; development adds WXT tabs/scripting/localhost/reload |
| Versions/dependencies | Node/npm version, `npm ls --depth=0`, uname, xdotool version | Existing exact-pinned install | PASS; no new dependency or lock change |
| Clean install | `npm ci` | No package changes | NOT RUN in Phase 04; Phase 03 clean-install PASS historical only |
| Final scope/docs/archive | `git diff --check`, exact whole-root scope/identity/immutable references/docs/whitespace/hash assertions, ZIP CRC/member checks | Local, after final ledgers | Recorded in final-checks and archive manifests |

Focused worker-port tests cover valid/invalid transitions; no consent/challenge; staging/production; loopback IPv4/IPv6; tab/window/origin/access changes; second open session; fresh Resume; recovery/lost binding; epoch/ID uniqueness/replay; late browser lookup and concurrent Pause/Stop/Delete; interrupted binding/commit/delete cleanup; clock/TTL/duration/count/bytes/schema; storage read/write/restrict/transaction failures; exact header/ephemeral minimization; untrusted senders/fields. These are synthetic platform-port tests, not browser API/grant evidence. The former popup-local mock gate is removed rather than retained as unused authority; historical 123-test Phase 03 evidence remains in Phase 03.

Actual browser matrix:

- **2 direct popup specs**: real production artifact/grants/CSP, fail-closed selected scope, empty local/session data; actual IndexedDB expiration/invalid records/10 retained headers/concurrent delete replay and cases-only store. These do not grant activeTab.
- **16 native invocation specs**: initial consent negatives and complete lifecycle/fresh Resume/Delete/replay; localhost/IPv4/IPv6/second-port Start; tab switch, reload, same-origin full navigation, cross-port, cross-host and close; restricted chrome://settings; genuine worker termination/recovery/Resume; real quota failure; selected older-case deletion versus open session/Revoke; new browser window isolation; intercepted HTTPS-origin Staging authorization and worker-enforced production denial.
- Native helper configures built-in Activate Extension in disposable profile, sends native xdotool input and opens the genuine browser-owned popup with real activeTab. No grant/API mocks, test permission, unsafe browser flag or physical toolbar mouse claim. Existing Playwright internal other-target hook remains a documented maintenance shortcut.
- Worker restart uses actual CDP **ServiceWorker.stopWorker**, observes matching **stopped** status, then sends a real UI message to wake it; state paused/epoch rotated and explicit reauthorization required. This is termination/restart, not simulated worker globals. It does not prove power-loss/OS crash behavior or undebugged natural idle timing.
- Quota uses actual browser **Storage.overrideQuotaForOrigin**, **quotaSize 1**, to force an IndexedDB failure; UI error/no header verified. Browser quota enforcement is real; real physical disk exhaustion is NOT TESTED. Other partial-operation/storage failures use synthetic ports and are labeled accordingly.
- HTTPS policy uses a Playwright-fulfilled synthetic `https://tracebridge-staging.example` page; every request to that exact fixture is intercepted before network. Actual HTTPS browser origin and native activeTab are exercised; TLS, DNS, remote hosting and real staging/Odoo are **NOT TESTED**. Fixture interception is logged separately from loopback requests.
- Context request/console/pageerror logs contain only packaged/browser/loopback and explicitly intercepted synthetic fixture traffic, with no unexpected JS error or unhandled non-fixture request in the tested matrix. Source and manifest forbid extension network APIs/hosts; this is not OS-wide traffic/security certification. Fixture servers/profiles/contexts/dev process groups clean up.

Recovered attempts: initial strict TypeScript indexed-tab narrowing and unused test import fixed; first native worker lookup rejected parent window `focused:false` even though real popup invocation granted access. Browser metadata confirmed last-focused selected tab identity, and the unnecessary focus flag was removed. Direct packaged-popup tabs were initially rejected with content tab senders; strict browser-attested packaged URL/origin/frame now distinguishes them. An exact nested-select label mismatch was fixed in test selectors. A prematurely overlapping diagnostic browser attempt disrupted a trace cleanup; it was stopped and subsequent browser suites ran serially. All current mandatory cases rerun; earlier attempt logs retained, not passed off as final evidence. X11 desktop-property/NO_COLOR warnings are harness diagnostics, not extension runtime errors.

## Open risks, blockers and decisions

- **P04-REVIEW OPEN**: provisional, UNREVIEWED, accepted progress 4/22. No Phase 05 authority.
- **P01-RETENTION / P01-CRYPT OPEN before sensitive evidence**: header-only exception; proposed numbers require review. No encryption or stored credential/secret/business data permission.
- **P04-ACCESS**: native selected URL visibility establishes lifecycle scope, not future injection/document authority; Phase 05 must independently enforce document validation/teardown. Temporary activeTab loss may lack removal events. No lease/keepalive policy chosen.
- **P03-AUTH**: user declarations do not detect dishonest production labels, prove organization authority, or prove Odoo identity. No trusted site inventory or real-use certification.
- **NOT TESTED**: Chrome Stable, Brave Phase 03/04, minimum Chrome 120, other OS/browser, physical toolbar mouse click, browser UI grant withholding/removal/incognito/disable-update-reenable, full browser restart/power loss/physical disk exhaustion, full WCAG, dev HMR/Xvfb, real Odoo/version/edition/HTTPS hosting and performance/noninterference/security certification. Historical Phase 02 Brave owner-attested PASS retained. No owner routine manual browser tasks assigned.
- Guarantees apply to extension-managed logical headers/metadata, not compromised browser/OS, physical backups or exact cleanup time while off. No evidence events exist yet.

## Acceptance decision

| Criterion | Gate |
|---|---|
| Worker authority, fresh controls, strict identity/policy | PASS in tested unit/native matrix; authority/environment user stated |
| Restart → paused; explicit Resume; navigation/close/revocation logic | PASS for actual termination/navigation/close and synthetic failure ports; broader browser UX NOT TESTED |
| Atomic bounded headers, expiration, deletion/replay/concurrency/quota | PASS within tested headers/schema/browser quota; physical disk/power loss NOT TESTED |
| No diagnostic capture/prohibited persistence/host expansion/network services | PASS source/manifests/exact storage and bounded browser observations; no security certification |
| Proposed numeric/sensitive-storage policy accepted? | **NO — owner decisions remain open; header-only scope** |
| Owner/ChatGPT Phase 04 review | **UNREVIEWED / PROVISIONAL** |
| Ready for Phase 05? | **NO** until explicit acceptance, policy/document authority review and separate authorization |

## Git and next step

Expected branch/HEAD/upstream unchanged; **29 project-only changed paths, 22 modified/7 new, 0 staged**, all unstaged/uncommitted. Canonical references, package/lock and unrelated projects preserved. No clone/switch/reset/commit/push/deployment. Exact final path list and hashes included in evidence.

Evidence **`/tmp/tracebridge-phase04-evidence.zip`**: relevant source/tests/configuration/package-lock, generated prod/dev manifests, current execution JSON/logs, sanitized real screenshots/traces, updated docs and SHA-256 inventory. Excludes node_modules, browser profiles, real secrets/customer data, unrelated projects and unnecessary bundles. After docs finalized: handoff SECOND LAST, status LAST, then read-only checks and external packaging/CRC/current-member equality verification.

Skills/tools actually used: **Ponytail full**; functions shell/Git/npm/Python, official Chrome docs through web, Playwright/Chromium/CDP/native xdotool, local image inspection. WarpGrep/Superpowers/Valyu unavailable; no subagents/CUA/real Odoo used. Memory quick search had no relevant result; no memory facts used.

Next action: owner/ChatGPT reviews this Phase 04 report, policy proposals and evidence ZIP. **STOP after Phase 04; await acceptance/corrections.**
