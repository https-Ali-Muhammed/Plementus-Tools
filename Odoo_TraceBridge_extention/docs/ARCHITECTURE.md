# Architecture — Phase 01

> Current 2026-10-22 gate: Phase 03 COMPLETE; accepted **4/22**. Phase 04 lifecycle/header-only persistence **PROVISIONAL**; see the Phase 04 section at the end. All earlier snapshots below are historical. No diagnostic capture or sensitive-storage policy approval.

> Current gate (2026-10-21): Phase 01 accepted by owner/ChatGPT; original design snapshot below is historical and future contracts remain phase gated. Phases 00–02 COMPLETE, 3/22 accepted; Phase 03 PROVISIONAL. See the Phase 03 implementation note at the end for the narrow working boundary. No capture/compatibility/security certification.

Date: **2026-10-21 (Africa/Cairo)**. **PROVISIONAL — pending owner acceptance; NOT IMPLEMENTED**. Design requirements below are future contracts, not working features. Accepted progress 1/22. [Security policy](SECURITY_PRIVACY.md) defines sensitive choices; [ADRs](02_ARCHITECTURE_DECISIONS.md) distinguish accepted sequencing from proposed engineering choices.

## Components and ownership

| Component | Responsibility / boundary | Phase |
|---|---|---|
| Extension popup | Permission explanation, selected tab/site, explicit start/pause/stop/delete, badge state; closing popup never grants consent | 02 inert shell, 03 consent |
| Investigation panel | Packaged extension UI for timeline/notes, gaps and export review; receives sanitized case views, never page DOM HTML; bind each control to displayed case/tab | 14–15; proposed side panel, full extension page alternative |
| Isolated content script | Programmatic top-frame injection after start; minimal action categories/navigation, eligible error categories; no page values/labels/selectors or injected product UI | 05–06 |
| MV3 service worker | Sole authority for session/permission checks and evidence writes; bounded validation/redaction, durable transactions, state/revocation, capability selection | 03–04 onward |
| Normalizer / correlator / rules | Pure deterministic transformations; IDs/provenance/gaps, conservative ambiguity, evidence-linked checks; no backend inference as fact | 11–13 |
| Capability adapters | Small version-independent interface, tested Odoo-specific enhancements and generic fallback; no privileged probes | 09–10, legacy 18 |
| Storage | IndexedDB proposed for sanitized cases/events; chrome.storage.local for small settings, session area for ephemeral binding; worker owns evidence writes | 04; policy pending |
| Export | One sanitized snapshot → JSON + escaped Markdown; preview/exclusions/redaction report, deliberate local download, no transmission | 15 |
| Optional MAIN observer | Untrusted, reversible fetch/XHR/error observation only after explicit Phase 08 safety GO/NO-GO; absent before then | 08 deferred |

Strict TypeScript is the blueprint direction; schema validator library remains a pinned-dependency decision in 02/11 (Zod candidate, no extra messaging abstraction required). Boundary validation starts with the first message in 03; 11 formalizes the versioned evidence schema, rather than postponing validation until 11.

## Trust boundaries and data flow

```mermaid
flowchart TD
  subgraph P[Untrusted page origin and renderer]
    DOM[Page DOM / script events]
    MAIN[Optional MAIN observer - Phase 08 only]
    CS[Isolated content script - lower trust]
    DOM -->|minimal categories; no values| CS
    MAIN -.->|untrusted bounded page messages| CS
  end
  subgraph E[Privileged extension origin]
    UI[Popup / investigation panel]
    G[Worker: permission + session gate]
    V[Validate / allowlist / redact]
    N[Capabilities / normalize / correlate / rules]
    DB[(Bounded local storage)]
    X[Sanitized export snapshot + review]
    UI -->|explicit controls bound to case/tab| G
    G --> V --> N --> DB
    DB -->|sanitized view| UI
    DB --> X
  end
  CS -->|runtime message + browser sender metadata| G
  B[Browser webRequest metadata - optional Phase 07] --> G
  X -->|user approved local download| F[File outside extension control]
```

No page message can start a recording, change permissions, read another case, export, delete or cause network access. Page and content-script signals are claims from a lower-trust context; browser metadata improves source attribution, not page truthfulness. Files leave the extension retention boundary. There is no backend/telemetry/AI/Plemo transport or API contract; stable reviewed export is the only future interoperability seam (optional discovery 21).

```mermaid
sequenceDiagram
  actor U as User
  participant UI as Extension UI
  participant W as Worker gate
  participant C as Isolated script
  participant S as Local storage
  U->>UI: Select tab/site; Start
  UI->>W: Start request bound to selected tab
  W->>W: Check browser grant + origin + policy + explicit consent
  W->>C: Inject top frame; handshake document identity
  W->>W: Mint fresh session epoch and short collection lease
  C->>W: Sanitized bounded event + epoch/sequence
  W->>W: Verify sender, lease, state; normalize/redact
  W->>S: Atomic bounded append
  U->>UI: Stop / revoke / delete
  UI->>W: Invalidate epoch before teardown
  W->>C: Stop; detach; discard buffers
  W->>S: Close session or delete transaction
  Note over W,C: Restart or lost lease means paused; explicit Resume required
```

## Message and identity contract

Use runtime messages for extension traffic; do not declare `externally_connectable` or external listeners. Proposal: plain bounded JSON envelope containing protocol version, enum message kind, session ID, epoch, source sequence and allowlisted event payload. Reject unknown keys, nesting, non-finite values, types, unsupported versions and oversized strings/arrays before expensive normalization; rate limits in [security](SECURITY_PRIVACY.md). Never spread untrusted objects into configuration or merge prototype keys.

Worker validation order on every event/control:

1. Recheck permission and initialized policy; hydrate storage before admitting any event. A surviving browser grant is not consent.
2. For content messages require `sender.id` equal extension ID, browser-provided `sender.tab.id`, `frameId == 0`, non-opaque sender origin/URL and `documentId` matching the bound live document. Never trust payload tab/origin/frame. Missing identity → reject; no wildcard fallback. Parse exact URL origin (scheme, host, port), not prefix/substring. Reject restricted schemes, incognito, child frames and related about/blob/data frames in the proposed first scope.
3. Match session + current epoch, state recording, current short lease, expected document, sequence monotonicity, size/rate bounds. IDs/nonces reduce replay but cannot authenticate a malicious page. Worker assigns persisted sequence/time; page time is only a bounded source hint. Late/replayed events after pause/delete are dropped, not attached to a new session.
4. Extension controls require sender URL under this extension's known packaged UI paths with no content-script tab sender; derive target case/tab from worker registry, check current binding and request revision. Do not act on whichever browser tab happens to be focused after the click. UI must visibly identify target and reject stale controls.
5. Browser network events use browser `tabId`, frame/document and initiator/destination identity, match bound origin and recording epoch; require attributable same-origin top-frame traffic only. Missing identity/unpermitted initiator means a gap, never a new host grant.

Phase 08 page bridge, if approved: `postMessage` with exact `targetOrigin`; isolated receiver checks `event.source === window`, exact `event.origin`, protocol kind/namespace, schema/limits and current epoch; no wildcard acceptance, command channel, secrets or case data returned to page. Namespace/nonce are not an authentication boundary because same-origin page code can forge messages. Worker repeats validation/redaction. A malicious page can still falsify evidence; label source `page_untrusted` and never turn page claims into privileged commands.

## Consent, lifecycle and bounded writes

States: idle → permission_pending → recording → paused/stopped/error. Start requires explicit UI action for one tab/exact origin; recording default OFF. One active recording globally is proposed to simplify leaks/races; stored cases remain separate. Pause invalidates epoch and lease, stops observation/listeners and discards pending queues. Resume always requires explicit action and identity revalidation. Stop closes collection; delete additionally removes retained case content.

Full navigation/reload, BFCache restoration, origin change, tab close, permission removal, extension update/disable or browser restart invalidates active collection. Conservative proposal: pause even on same-origin full-document changes; SPA same-document navigation may continue after gate checks. No persistent/all-frame content registration. Already injected scripts require teardown; unregistering alone does not undo injection (S2). If acknowledgement fails, worker rejects all events and shows capture error; short local leases expire collectors. A compromised page is outside the control guarantee.

Worker globals are disposable (S4). Top-level listeners hydrate state through a serialized initialization gate; fresh worker epoch invalidates all prior leases, recovers cases as paused and admits no queued old events. Collectors check a short lease before reading even eligible fields; worker death cannot be detected instantaneously, so a bounded lease expiry is the fallback, not a promise of immediate remote teardown. No keepalive workaround or full raw-event queue. Restart gaps are visible and explicit Resume is required. Persisted consent does not auto-start collection.

Worker serializes append/delete/state operations with transactions and a deletion generation: recheck epoch before commit, remove stale aggregates/findings/indexes with events, reject stale export snapshots and late writes. Quota/disk error or cap → stop capture, report gap, no unbounded retries. Expiry is enforced before read/write/export and on wake; closed-browser cleanup cannot run on a wall-clock deadline. Numeric limits and encryption are unapproved proposals, not defaults in code.

## Adapter capability model and safe degradation

Each adapter declares its ID/revision, applicable observed capabilities, safely accepted input categories, output categories, provenance reference and limitations. Selection uses capabilities first, claimed version second. No adapter can request permission, invoke RPC, fetch URLs, inject code, write records or inspect arbitrary bodies. Normalizer rejects unsupported fields regardless of adapter.

A per-session capability entry records feature, availability/reason, source and confidence, adapter ID/revision, safe evidence IDs and fixture/real-test provenance. Keep detection confidence (`reported`, `inferred`, `unknown`; exact verified evidence only when justified) separate from support status (`Verified`, `Partial`, `Fallback`, `Unknown`, `Unsupported`). Current feature support for every Odoo 8–20 row remains UNKNOWN / NOT TESTED in [support matrix](SUPPORT_MATRIX.md).

Generic baseline can retain eligible action/navigation categories and manual notes, plus only actually observable errors/request metadata. Isolated JS does not grant access to all page errors or internals. Denied webRequest/MAIN/CSP/unknown clients → feature unavailable with reason, manual steps and reduced handover; no permission escalation or universal route hook. Unknown route becomes a category `unknown`, not a retained raw URL. RPC model/method/envelope errors remain absent without safely observed signals. HTTP 200 is transport evidence; application success remains unknown. Reliable browser request IDs can join metadata; temporal action joins remain heuristic with unmatched events preserved. Missing signal is not evidence of success or failure.

Cases retain evidence ID, source kind/trust, schema/tool/adapter version, observed/derived/user-stated/unavailable/hypothesis, capture mode, redaction/drop/gap reasons and evidence links. Derived findings reference actual IDs and algorithm/rule revision. No hidden cross-case join; comparison 17 uses only shared capabilities after the single-case MVP 16. No certification from synthetic fixtures or version labels.

## Framework/build comparison — current official evidence

Checked **2026-10-21**; source support is not an installed build test or dependency audit. Options below are engineering judgments derived from the cited docs.

| Candidate | Verified official capability | Fit / cost and permission risk | Disposition |
|---|---|---|---|
| WXT + React UI | Generated manifests; official React module; upstream metadata 0.21.4, Node >=22 and Bun >=1.2.0 declarations (S10–S12) | Fits separate entrypoints; inspect generated manifests because development adds permissions and panel entrypoints affect manifest. More tooling dependencies than manual MV3 | Recommended, PROPOSED P01-BUILD; strict TS, React only packaged UI |
| Native MV3 + Vite, React or plain UI | Chrome defines worker/scripts; Vite builds assets; React docs describe Vite as an option (S1–S4, S13–S14) | Explicit manifest and fewer extension conventions; team must wire worker/content outputs, reload and packaging correctly | Viable fallback if WXT permissions/output unsuitable; no claim of inherently greater security |
| Plasmo + React | Official SDK documents TS/React, extension entrypoints and multi-manifest/browser targeting (S15) | Relevant batteries included; abstractions still need manifest/data-flow audit; hosted build/deploy features unnecessary | Alternative; not chosen, no assertion of vulnerability or poor maintenance |

No React in Odoo DOM, no SSR/router/global state library/backend/analytics needed for this scope. React is a UI library, not a permission boundary. Phase 02 implemented WXT 0.21.4 + `@wxt-dev/module-react` 1.2.2 with React 19.3.1, strict TypeScript, npm lockfile, and Vitest smoke test. Installed package versions, reproducible build, and generated dev/production manifest differences are evidenced in [PHASE_02](Phases/PHASE_02.md). The production popup requests no permissions; WXT development mode adds local reload permissions/CSP and is not distributable. Chrome UI smoke and Odoo runtime remain untested. No capture capability was implemented.

Browser proposal: API floor Chrome 120 to simplify modern MV3 behavior; sidePanel itself is documented at 114+ and document targeting at 106+ (S2/S8), so 120 is a conservative product proposal, not a derived universal API minimum. Phase 02 sets `minimum_chrome_version: 120` but did not manually test Chrome or certify any OS/browser. Current patched Stable on Linux remains the proposed future test target; other Chromium/OS/Firefox remain untested.

## Official source register

All retrieved **2026-10-21**. Web open/find used except S4 recovered via Python urllib HTTP 200 after web timeout; relevant lifecycle/IndexedDB text inspected. Dated retrieval means source reviewed, not runtime verified. URLs below support platform facts; product policies above remain proposals.

| ID | Official reference | Fact used |
|---|---|---|
| S1 | [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) | Isolation, shared DOM, MAIN/page CSP |
| S2 | [Chrome scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting) | Target tab/frame/document, worlds, injection teardown limits |
| S3 | [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions), [match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns) | Temporary grants versus optional grants; grant scope differs from application session |
| S4 | [Worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Suspension, lost globals, persistence choices |
| S5 | [Chrome messaging](https://developer.chrome.com/docs/extensions/develop/concepts/messaging) | Runtime messages, lower-trust content input, XSS precautions |
| S6 | [Chrome storage](https://developer.chrome.com/docs/extensions/reference/api/storage) | Local/session distinction, quotas/access-level restrictions |
| S7 | [Chrome webRequest](https://developer.chrome.com/docs/extensions/reference/api/webRequest) | Metadata, initiator/destination host access, IDs; no general response-body reader |
| S8 | [Chrome sidePanel](https://developer.chrome.com/docs/extensions/reference/api/sidePanel) | Packaged persistent UI, permission and API version |
| S9 | [Chrome CSP](https://developer.chrome.com/docs/extensions/reference/manifest/content-security-policy) | Packaged scripts and extension policy constraints |
| S10 | [WXT manifest](https://wxt.dev/guide/essentials/config/manifest.html) | Generated manifest, dev permission additions |
| S11 | [WXT frontend modules](https://wxt.dev/guide/essentials/frontend-frameworks.html) | React module available |
| S12 | [WXT maintainer metadata](https://raw.githubusercontent.com/wxt-dev/wxt/main/packages/wxt/package.json) | Current upstream version/engine declarations; moving main, not a pin |
| S13 | [Vite guide](https://vite.dev/guide/) | General build/dev tooling; extension wiring remains project work |
| S14 | [React from scratch](https://react.dev/learn/build-a-react-app-from-scratch) | Build-tool options and client UI tradeoffs |
| S15 | [Plasmo framework](https://docs.plasmo.com/framework) | React/TS and extension targets |

## Future verification gates

03 consent/messages and permissions; 04 lifecycle/retention/delete/restart; 05–07 minimal signals; 08 CSP/collision/body safety GO/NO-GO; 09–11 capability/schema provenance; 12–13 conservative findings; 14–15 accessible UI/review/export; 16 single-case acceptance; 17 comparison; 18 legacy evidence; 19 security/performance resilience; 20 release review; 21 optional separate discovery. [Threat tests](SECURITY_PRIVACY.md) define expected negative cases. Runtime/browser/Odoo: **NOT TESTED**. Architecture approval and policy decisions require owner review; this document grants no access.

## Phase 03 implemented boundary — PROVISIONAL

Only the popup-local permission/consent preview exists: `main.tsx` → `Popup.tsx` → `consent.ts`; no worker, content script, runtime message, storage or collector. Worker authority/epochs/leases remain future contracts for Phase 04 onward, not silently replaced by UI state. No cross-context message validator is needed because no message channel exists.

Production uses activeTab alone, incognito disabled and packaged-only/no-network CSP. The popup queries exactly one active/current-window tab; displays ID/window/exact normalized origin; requires matching user-entered authorized origin, explicit Local Development for loopback HTTP(S) or Test/Staging for remote HTTPS, confirmation and approval. This owner-approved 2026-10-22 policy supersedes the prior HTTPS-only/default-port loopback restriction. Approval revalidates identity; tab/document/window/permission changes invalidate decisions; stale async results are dropped. Closing the popup loses approval. Start is permanently disabled.

URL visibility does not prove future injection authority or organizational permission; environment is user stated. Temporary grant revocation event delivery is not guaranteed. No future session may consume this transient preview as Start authority; worker/document checks must be designed/tested in their authorized phase. No persistent hosts or scripting probe is introduced to fill the gap. Dev WXT-only reload broadening remains separately audited; connect-src none may block HMR. See [ADR-P03-01](02_ARCHITECTURE_DECISIONS.md#adr-p03-01--activetab-only-popup-consent-preview) and [Phase 03 evidence](Phases/PHASE_03.md).

## Phase 03 automated testing architecture — 2026-10-22

Playwright 1.64.1 launches sandbox-enabled persistent bundled Chromium with the actual production MV3 and a temporary isolated profile. OS-allocated HTTP fixture servers bind only IPv4/IPv6 loopback. Native action tests configure Chromium's built-in Activate Extension shortcut through browser UI in that profile; xdotool delivers real input to the unique fixture window and observes actual activeTab/native popup. A pinned internal Playwright other-target hook exposes that popup; no production worker/test permissions are added. Direct popup rendering is counted separately from native grants; isolated policy/controller tests remain explicitly synthetic/mocked.

The verification runner serializes build/typecheck/lint/unit/regression, assertion-based production/development manifest audit and E2E, writing JSON/logs with screenshots/traces. Native prerequisites missing → explicit skip/BLOCKED, never fully verified. Profiles/contexts/servers/dev child processes clean up after execution. No owner browser profile, normal sessions or existing Odoo server is accessed. See [permanent testing policy](06_DEPLOYMENT_RUNBOOK.md#permanent-codex-owned-phase-verification-policy). 123 unit/integration and 10 Chromium specs pass; real Odoo/browser compatibility is still unverified. This remains Phase 03-only infrastructure, not session/capture implementation.

## Phase 04 implemented boundary — PROVISIONAL, 2026-10-22

Phase 03 accepted at pushed `8c73491`, progress **4/22**; historical snapshots above remain intact. Current implementation: `Popup.tsx` → strict runtime control message → `background.ts` → `src/session/controller.ts` → `store.ts` / `model.ts`. The old popup-local consent gate is removed; its reusable URL/declaration policy remains and worker tests replace obsolete mocked popup-controller tests. No collectors, injection, diagnostic/event writes or Phase 05 code.

| Operation | Valid transition / precondition | Invalidation |
|---|---|---|
| Inspect | idle → permission_pending when eligible selected scope exists; no persisted consent | New one-use worker review challenge; replaces prior review |
| Start | permission_pending → recording; no open recording/paused case; explicit valid authorization + fresh browser-selected scope twice | New random session ID and epoch; exact original tab/window/origin binding |
| Pause / Revoke | recording → paused | Rotate epoch; invalidate review before waiting |
| Resume | paused → recording; original ephemeral binding and exact selected scope; new explicit authorization/review | Rotate epoch; stopped/error/deleted cannot Resume |
| Stop | recording/paused → stopped | Terminal; rotate epoch and remove operational binding |
| Delete | any retained header → removed; view returns idle/pending based on current review | Atomic selected-ID removal; stale revisions/nonexistent IDs rejected; binding cleanup |
| Navigation/reload/tab/window/revocation event | recording → paused; paused stays paused | Synchronous generation increment; fresh epoch for open header; review cleared |
| Worker recovery | recording/paused → paused | Epoch rotation, no recovered authorization/challenge; explicit Resume only |
| Expiry | open → stopped at 30-minute logical limit; any header removed at 24-hour TTL | Enforced on wake/read/write, not a sleeping-browser deadline |
| Storage/init failure | controls → error | Fail-closed worker latch and error badge; no collection; healthy restart recovers paused |

`error` is a fail-closed controller/view state, not a persisted authorization. Header validation accepts the terminal error enum for conservative compatible reads; no current operation creates an error evidence record. One worker queue serializes initialization/read/write/delete. An in-memory generation invalidates in-flight async approval immediately; durable case epoch guards every control. Restart discards all review challenges and rotates active epochs before accepting commands. IndexedDB atomic transactions prevent half-deletes/writes; no cross-store atomicity is claimed. Binding is written before Start commit, removed after deletion; recovery reconciles orphan bindings. Interrupted Start cannot manufacture a header, successful Delete cannot be reversed by stale session state.

IndexedDB schema `tracebridge` v1, store `cases` (`id` key): `{schema:1,id:UUIDv4,epoch:UUIDv4,state:recording|paused|stopped|error,createdAt:integer,updatedAt:integer}`. Unknown keys/invalid records purged; inconsistent aggregate state fails closed. Future/rolled-back timestamps are dropped conservatively. Only this store exists. No origin/environment/consent, arbitrary strings, events, notes, URLs or customer values. `storage.session.binding = {id,target:{tabId,windowId,origin}}` is ephemeral and restricted to TRUSTED_CONTEXTS. No chrome.storage.local/sync usage. No app encryption.

Before every write, schema/count/single-open/serialized-byte bounds are checked. Proposed 10 cases, 24-hour TTL, 30-minute lifetime, 5 MiB/case / 20 MiB application bytes are applied to non-sensitive headers only. A header is approximately 200 bytes; Phase 04 accepts zero events, so future 5,000-event capacity is not a collector implementation. Sensitive retention/encryption acceptance remains blocked by P01-RETENTION/P01-CRYPT. Browser internal disk overhead/backups are outside the serialized-byte accounting and deletion guarantee.

Production permission budget is activeTab + storage; background worker and session storage are the only phase-required additions. No hosts/scripting/alarms/keepalive, observers, RPC, services or fixed five-second lease. action badge/title reflects last processed lifecycle (`ON`, `II`, `ERR`), explicitly no diagnostic capture. It can remain stale until wake after termination/time expiry; popup refresh revalidates. URL visibility establishes lifecycle access only; future document/injection authority remains gated in Phase 05.

Official platform references rechecked 2026-10-22: [MV3 worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle), [session storage/access levels](https://developer.chrome.com/docs/extensions/reference/api/storage), [runtime sender metadata](https://developer.chrome.com/docs/extensions/reference/api/runtime#type-MessageSender), [tab events](https://developer.chrome.com/docs/extensions/reference/api/tabs#event-onUpdated). Product guarantees above are bounded by [actual tests and limitations](Phases/PHASE_04.md), not documentation alone.
