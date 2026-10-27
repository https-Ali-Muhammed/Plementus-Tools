# Architecture Decisions

These are baseline decisions from the supplied planning references and the explicitly authorized Step DB. They do not represent implemented or runtime-verified architecture.

## ADR-DB-01 — Dedicated implementation branch
- Date: 2026-10-20
- Status: APPLIED FOR STEP DB; future workflow owner-review required
- Context: Establish a permanent working branch without changing `develop` or `main`.
- Decision: Use verified `develop` as the source and create local `feature/odoo-tracebridge` from `origin/develop` commit `64a05446cd9ca65e89c5515c6c76e8ee073fb94a`.
- Authorization: Explicitly requested by the owner in this task; documented as an exception to the original documentation-only DB scope.
- Strategy: All subsequent phases use this branch unless the owner explicitly changes strategy. Commits and pushes require owner review. No automatic merges into `develop` or `main`. At DB execution no upstream was configured. Rechecked 2026-10-20: upstream is `origin/feature/odoo-tracebridge`, local and live remote HEAD `f3cdea5`; owner reports accepted/pushed DB.
- Evidence: Local Git preflight and branch-creation commands/results are recorded in `Phases/PHASE_DB_DOCUMENTATION_BOOTSTRAP.md` and `04_TEST_EVIDENCE.md`.

## ADR-DB-02 — Keep the project nested at the supplied path
- Date: 2026-10-20
- Status: APPLIED
- Context: The supplied project directory is nested inside the actual Git root.
- Decision: Place README and project documentation inside `/home/https_ali_muhammed/Plementus/Tools/Odoo_TraceBridge_extention`; do not place project docs at `/home/https_ali_muhammed/Plementus/Tools`.
- Tradeoff: Git operations are rooted at the parent repository, while project files remain scoped to the nested TraceBridge directory.

## ADR-DB-03 — Preserve proposed AI-free, local-first direction
- Date: 2026-10-20
- Status: PROPOSED BY AUTHORITATIVE BLUEPRINT; no code exists
- Context: Define the product direction without implementing it during DB.
- Decision: The proposed initial product is a Chromium MV3 browser extension with deterministic, AI-free diagnostics and local-first operation. Any future Plemo connection requires separate discovery and authorization.
- Limits: Product feasibility, APIs, data flows, permissions, and behavior have not been validated. Phase 01 owns architecture and security decisions.

## ADR-DB-04 — Evidence and privacy boundaries
- Date: 2026-10-20
- Status: PROPOSED BY AUTHORITATIVE BLUEPRINT; runtime controls NOT TESTED
- Decision: Proposed diagnostics are opt-in, bounded, read-only, and evidence-labeled. Do not collect credentials, cookies, tokens, typed input, raw request/response bodies, or business record values by default. No Odoo database/customer access, external transfer, or autonomous action is part of this bootstrap.
- Limits: This record is a design constraint, not proof of implementation or security certification.

## ADR-DB-05 — Compatibility claims require evidence
- Date: 2026-10-20
- Status: PROPOSED BY AUTHORITATIVE BLUEPRINT
- Decision: Use a capability-based strategy with generic fallback and explicit `Verified`, `Partial`, `Fallback`, `Unknown`, and `Unsupported` statuses. Do not claim compatibility for any Odoo version without real, feature-specific evidence.
- Current evidence: Real Odoo compatibility NOT TESTED.

## ADR-P00-01 — Provisional discovery interpretation, not architecture approval

- Date: 2026-10-20. Status: PROPOSED; ChatGPT/owner review pending.
- Problem: Workbench overlaps recording/comparison; broad blueprint MVP list conflicts with detailed sequencing.
- Alternatives: duplicate broad toolkit/ship comparison by 16; or preserve the §10 sequence and focus single-case handover first.
- Proposed choice: minimal-data, evidence-labeled single-case handover at 16; automated comparison at 17, within v1. No implementation or approved policy follows.
- Evidence: [competitor matrix](COMPETITOR_MATRIX.md), [scope](PRODUCT_SCOPE.md), canonical §2.1 and §10.
- Tradeoff: narrower first checkpoint; differentiation and degraded-capture usefulness still require evaluation (`P00-DIFF`, `P00-SCOPE`, `P00-CAPTURE`).
- Architecture/permissions/retention/framework selection deferred to separately authorized Phase 01. WXT feasibility assessed only; no dependency selected or installed.

## Phase 00 acceptance reconciliation — 2026-10-21

Owner reports ChatGPT/owner acceptance on 2026-10-21; commit/push `9b728ba` verified against local HEAD, tracking ref and live origin. Phase 00 COMPLETE; accepted progress 1/22. ADR-P00-01's sequencing is accepted by explicit current owner instruction; remaining product differentiation/capture/policy questions stay open. Older ADR statuses describe their historical date unless explicitly superseded below.

## ADR-P01-01 — Preserve accepted phase sequence and documentation boundary

- Date: 2026-10-21. Status: **ACCEPTED — explicit owner instruction**, limited to scope/sequence.
- Problem: Broad blueprint MVP wording could pull comparison or future integrations forward.
- Alternatives: combine comparison into 16; or retain detailed numbered gates.
- Decision: single-case MVP 16, comparison 17, optional Plemo discovery 21. Phase 01 architecture/security documentation only; no implementation or policy acceptance inferred.
- Evidence: current owner request; [scope](PRODUCT_SCOPE.md), canonical §10; supersedes proposed sequencing in ADR-P00-01.
- Tradeoff: reduced first checkpoint, explicit later comparison; owner/ChatGPT reviews Phase 01 independently. No fabricated Plemo API or Odoo compatibility.

## ADR-P01-02 — Worker authority with isolated collection and conditional MAIN

- Date: 2026-10-21. Status: **PROPOSED — pending owner/technical-security review**.
- Problem: Page evidence is untrusted and MV3 workers restart; page-controlled commands could leak cases or broaden capture.
- Alternatives: privileged page bridge/universal MAIN hook; isolated-only forever; isolated baseline with separately gated observer.
- Proposed choice: worker owns consent/permissions/storage, content script top-frame only, strict browser sender identity/epoch/lease; popup and packaged investigation panel. Fresh worker recovers paused; explicit Resume. MAIN remains absent until 08 GO/NO-GO.
- Evidence: [architecture](ARCHITECTURE.md), S1–S5/S8 and lifecycle direct-read recovery; [threat map](SECURITY_PRIVACY.md).
- Tradeoff: more gaps/restarts and lower-fidelity errors; no page nonce can authenticate evidence from an actively malicious page. Owner/security acceptance required; runtime NOT TESTED.

## ADR-P01-03 — Permission budget and zero unsolicited transmission

- Date: 2026-10-21. Status: **PROPOSED — permission strategy P01-HOST OWNER DECISION REQUIRED**; privacy restrictions are supplied requirements, not implemented controls.
- Problem: Convenient wildcard access/network inspection expands exposure beyond one investigation.
- Alternatives: mandatory all-site/debugger capture; activeTab baseline; optional selected-site metadata mode.
- Proposed choice: inert scaffold without capture access; add activeTab/scripting/storage only in implementing phases; optional webRequest/selected HTTPS host if Phase 07 justifies it; separate recording gate regardless of browser grant. No unsolicited transmission, remote assets/analytics or privileged page command channel.
- Evidence: [permission-purpose table](SECURITY_PRIVACY.md), architecture S2–S3/S6–S10. Request/initiator scope and generated manifests require later testing.
- Tradeoff: arbitrary origins may need broad optional eligibility declaration; actual grants remain chosen-site only and runtime exact-origin checks narrower. Reject declaration → keep activeTab/degraded fallback, not blanket access. Owner/security approval before host/capture work.

## ADR-P01-04 — Bounded local evidence, reviewed export and policy options

- Date: 2026-10-21. Status: **PROPOSED — P01-RETENTION / P01-CRYPT / P01-PRODUCTION / P01-EXPORT OWNER DECISION REQUIRED**.
- Problem: Diagnostic metadata/notes and downloaded files can expose customer data even when local.
- Alternatives: volatile-only; sanitized IndexedDB with OS/profile protections; passphrase encryption with separate key lifecycle review. Production blocked initially versus separately approved exceptions.
- Proposed choice: minimized sanitized cases in IndexedDB only after policy acceptance, small trusted settings/session state; review numeric caps and 24-hour proposal in [security policy](SECURITY_PRIVACY.md); default deny production/unknown environments; preview exact sanitized export and classify internal confidential.
- Evidence: architecture S4/S6/S9, blueprint §7 and [threat/deletion contract](SECURITY_PRIVACY.md).
- Tradeoff: strict minimization/short retention reduce diagnostic value; app encryption adds recovery/crypto complexity and cannot protect unlocked UI. No encryption-at-rest guarantee, physical secure erase or downloaded-file recall. If policy unresolved, affected persistence/capture/export waits; owner/security/data custodian must decide before implementing it.

## ADR-P01-05 — Capability adapters and uncertainty over universal RPC

- Date: 2026-10-21. Status: **PROPOSED — pending owner/technical review**.
- Problem: Odoo versions/custom clients and missing envelopes can produce false support or success claims.
- Alternatives: hardcoded universal RPC/version hook; capability-bound adapters with generic/manual fallback.
- Proposed choice: capability contracts cannot grant permissions or make RPC calls; record adapter/source/provenance, gaps and independent detection confidence/support status; HTTP status alone does not prove application outcome. No unsafe parsing to fill gaps.
- Evidence: [architecture capability model](ARCHITECTURE.md), [feasibility](FEASIBILITY.md) F5/F10/F11, [support matrix](SUPPORT_MATRIX.md); no new Odoo API claim.
- Tradeoff: useful but reduced handover may require P00-CAPTURE owner scope decision after 08. Every Odoo feature remains UNKNOWN / NOT TESTED; synthetic evidence cannot certify compatibility.

## ADR-P01-06 — Recommend WXT/React, keep browser/build approval open

- Date: 2026-10-21. Status: **PROPOSED — P01-BUILD / P01-BROWSER OWNER DECISION REQUIRED**.
- Problem: Need reproducible MV3 entrypoints and UI without guessing installed package/browser support.
- Alternatives: WXT + React UI; native MV3 + Vite/plain or React UI; Plasmo + React.
- Proposed choice: WXT strict TypeScript with official React module only for packaged UI; no UI framework in Odoo pages. Proposed Chrome API floor 120 with current patched Linux Stable as first test target. No dependency pin, installation, scaffold or browser support certification now.
- Evidence: current official docs/metadata checked 2026-10-21; [comparison and sources S10–S15](ARCHITECTURE.md); Chrome API sources S2/S8. Upstream WXT metadata reports 0.21.4 and Node >=22/Bun >=1.2.0, not project prerequisites.
- Tradeoff: tooling/transitive dependencies and generated dev permissions require pinned review in separately authorized 02; manual MV3 offers explicit configuration with more wiring; Plasmo is viable but unnecessary extra conventions here. Owner/technical lead choose before scaffold; QA verifies target/build/OS later. Published support is not a passed local build.

Phase 01 acceptance reconciliation: owner/ChatGPT acceptance on 2026-10-21 and pushed commit `013887312f69d77458191d1663308ed9490297e7` were supplied by the owner. Phase 01 is COMPLETE; its original provisional execution snapshot is preserved in the phase report. Phase 02 implementation below resolves the framework/package-manager choice only; sensitive runtime policy decisions remain open.

## ADR-P02-01 — Minimal WXT/React Chromium MV3 scaffold

- Date: 2026-10-21. Status: **PROVISIONAL — pending owner acceptance**.
- Problem: establish the approved Phase 02 build and test baseline without requesting any Odoo/site access or implementing future capture behavior.
- Decision: WXT 0.21.4, official `@wxt-dev/module-react` 1.2.2, React 19.3.1, TypeScript 6.0.3 strict mode; npm as the sole package manager with exact direct dependency pins and `package-lock.json`. Chrome MV3 popup only, minimum Chrome 120, no production permissions/host grants. Test with Vitest; use Node's package scripts for build, dev, typecheck and lint.
- Evidence: `npm ci`, build/typecheck/lint/test results and dev/production manifest audit in [Phase 02](Phases/PHASE_02.md). Official WXT/React/Node/Chrome source references dated 2026-10-21 are listed there.
- Tradeoff: WXT dev mode creates a separate localhost reload build with `tabs`, `scripting`, localhost host access and localhost CSP. Use production `.output/chrome-mv3` for unpacked installation. Chrome UI smoke remains NOT TESTED; no Odoo compatibility or security guarantee is implied.

## Phase 02 acceptance reconciliation — 2026-10-21

Owner/ChatGPT accepted Phase 02 on 2026-10-21 and reports Brave popup smoke **PASSED**. This is owner-attested browser evidence, not a new Codex browser run. Google Chrome remains **NOT TESTED**. Local HEAD, upstream tracking ref and live origin match pushed commit `fe90532b11e043344aa2abfb7a539a0156e30cd5`. Phase 02 is **COMPLETE**; accepted progress is **3/22**. Earlier provisional/2-of-22 and uncommitted records above are preserved as historical execution evidence and superseded by this reconciliation. Current authorization is Phase 03 only; no publication or later phase is authorized.

## ADR-P03-01 — activeTab-only popup consent preview

- Date: 2026-10-21. Status: **PROVISIONAL — pending Phase 03 owner/ChatGPT review**; implementation authority is Phase 03 only.
- Problem: separate temporary browser access from deliberate, tab/origin-bound consent without implementing Phase 04 lifecycle or Phase 05 capture.
- Alternatives: persistent/optional host grants or injection probes; worker-backed session authority now; or a popup-local preview with no capture capability.
- Choice: only `activeTab` in production; no host declarations or permissions.request. Browser-selected URL visibility identifies one active tab/window and exact HTTPS/default-port origin. Operator types the identical origin, declares test/staging, confirms site/data-owner authorization and clicks Approve consent only. Unknown/production/unauthorized/unrelated declarations fail closed. Re-query before approval; invalidate on tab/document/window/access changes and discard async results after invalidation. Decisions disappear with popup closure.
- Evidence: [Phase 03](Phases/PHASE_03.md), 52 passing tests and generated manifest audit. Official docs checked 2026-10-21: [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs), [permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions). Chrome grants temporary selected-tab access after invocation; this is separate from app consent. No `tabs` permission is necessary merely to use tabs methods/events. No claim that permissions.contains proves a temporary host grant.
- Tradeoffs: URL access is not injection authority; activeTab grant expiry may lack a permissions.onRemoved event. No reliable environment/Odoo/organization authorization detection, only explicit user declarations. Conservative tab updates also revoke. No runtime guarantee before browser smoke. A future worker must own and independently validate Start/session/document authority; popup approval cannot be reused as a session token.
- Safe fallback: missing access → unavailable, reinvoke toolbar on intended tab. Future insufficient activeTab → manual/degraded evidence or explicit later host-policy decision; never silently expand permissions. Revoke clears consent only; browser access ends separately on navigation/close or extension disable.
- Production CSP adds packaged-only scripts, no object/network/form/framing; incognito disabled. Dev WXT reload permissions/localhost remain dev only; connect-src none may block HMR, so production rebuild/manual reload is the fallback. No package additions or capture/storage/telemetry/networking code.

## ADR-P03-02 — Explicit loopback development and Codex-owned browser verification

- Date: 2026-10-22. Status: owner requirements ACCEPTED for implementation; Phase 03 artifacts PROVISIONAL pending review.
- Problem: HTTPS-only/default-port consent excluded ordinary local Odoo development; CUA-only smoke left routine verification with the owner.
- Decision: Local Development is an explicit environment. URL-parser normalized localhost/127.0.0.1/[::1] HTTP(S) origins require exact tab/window/origin, Local Development and explicit authorization. Test/Staging allows remote HTTPS, including exact non-default ports. Remote HTTP, LAN/custom names, misleading local hostnames and production/unknown remain denied. Supersedes ADR-P03-01's HTTPS-only/default-port limit; no certificates/proxies/public exposure required. Loopback is not proof of Odoo or owner authorization.
- Testing: exact Playwright 1.64.1; actual production MV3 in isolated temporary persistent Chromium. Native built-in Activate Extension shortcut uses xdotool in the disposable profile and grants real activeTab; direct popup is separate. Playwright's pinned internal other-target attachment hook is a documented test maintenance limit. No production permission/manifest additions or unsafe extension-debugging/browser-security bypass flags.
- Evidence: 123 policy/integration tests and 10 Chromium browser specs pass; [Phase 03](Phases/PHASE_03.md) records exact limits and screenshots/traces. Official [Playwright guide](https://playwright.dev/docs/chrome-extensions) and [Chrome activeTab gestures](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) checked 2026-10-22.
- Permanent policy: Codex owns phase tests, fixtures, execution, manifests, security negatives, regression, machine reports and verified archive; owner reviews/publication. Mandatory automation blockers cannot be waived silently. [Runbook policy](06_DEPLOYMENT_RUNBOOK.md#permanent-codex-owned-phase-verification-policy).
- Tradeoffs: production classification is user stated, no real Odoo/browser compatibility certification; native tests require X11/xdotool (existing Xvfb may supply X11), with explicit BLOCKED when unavailable. No Phase 04/capture/persistence approval.

## Phase 03 acceptance reconciliation — 2026-10-22

Owner/ChatGPT accepted Phase 03 on 2026-10-22; pushed commit `8c7349150cf40adae0bdb015064a8d61aebdc74a` verified against HEAD, upstream and live origin. Phase 03 COMPLETE; accepted progress **4/22**. Evidence retained: 123 unit/integration PASS; 10 Chromium PASS (9 native invocation, 1 direct popup). Local Development and permanent Codex-owned automated verification approved. Chrome Stable, Brave Phase 03 and real Odoo remain NOT TESTED. Earlier provisional records are historical.

## ADR-P04-01 — Worker-owned lifecycle and conservative recovery

- Date: 2026-10-22. Status: **PROVISIONAL — Phase 04 owner/ChatGPT review pending**. Implementation explicitly authorized for Phase 04 only.
- Choice: one recording/paused case globally; worker controls and serialized initialization/operations. Strict message schemas accept only browser-verified packaged popup URL/extension ID/origin and top frame. A browser-attested packaged popup tab is also UI; ordinary content/page tab senders are denied. No page bridge or external listener.
- Start consumes a worker-generated one-use review challenge, validates the explicit declaration, and independently queries browser-selected tab/window/exact normalized origin twice around ephemeral storage. Popup IDs/origins/authorization cannot substitute for those checks. Authorization/environment remain user assertions, not an organization inventory or production detector.
- Epoch UUID changes on transitions, invalidation and active recovery. Invalidation generation advances before awaited operations, so delayed authorization cannot revive stopped/deleted cases. Controls name exact case ID + epoch. Temporary globals serialize one live worker only; durable state comes from IndexedDB and session binding, never globals alone.
- Restart recovers active headers PAUSED. Resume requires a new review, declaration and browser validation against the original ephemeral binding. Lost binding (browser/extension restart) blocks Resume; Stop/Delete remain available. Tab/window changes, full navigation/reload, replacement/detach/close and observed permission removal conservatively pause. No artificial keepalive, timer, collector or fixed five-second lease.
- Evidence/limits: [Phase 04](Phases/PHASE_04.md); actual native activeTab, worker termination/stopped observation and browser quota enforcement. Lifecycle URL access is not future script-injection/document authority; Phase 05 must implement that gate independently. Native popup leaves its parent normal window unfocused, so selected-tab identity uses browser lastFocusedWindow rather than a focused flag.

## ADR-P04-02 — Header-only atomic persistence while sensitive policy stays open

- Date: 2026-10-22. Status: **PROVISIONAL — numeric proposals under evaluation, sensitive storage NOT APPROVED**.
- Choice: native IndexedDB `tracebridge` v1 / `cases` keyPath `id`; exact header allowlist only. No evidence/event/note/URL/authorization/environment store or API. One normalized operational binding in trusted-context-only chrome.storage.session; no local/sync settings or encryption code.
- Proposals applied narrowly to header testing: 30 minutes from creation including pauses; 10 retained cases; 24-hour TTL; 5 MiB/case and 20 MiB aggregate serialized application bytes. Reject at capacity, no unrelated eviction. Future 5,000-event cap is documented only; zero events permitted now. Valid headers remain far below byte limits. No browser physical-storage accounting claim.
- P01-RETENTION/P01-CRYPT owner decisions remain open before sensitive evidence storage. OS/profile exposure, timestamps, no physical secure erase/encryption guarantee are disclosed. This is the restrictive exception explicitly allowed by the Phase 04 owner request, not blanket acceptance of prior policies.
- IndexedDB changes occur inside a single strict-durability readwrite transaction; validation/bounds precede clear/put. Failed/aborted transactions roll back. Successful deletion removes the header first, then binding; interrupted cleanup cannot recreate a missing header, and initialization removes orphan bindings. TTL and duration enforced on access/wake; no wall-clock deletion promise while browser closed. Storage/init failure latches controls off in that worker, reports a safe error and recovers paused on a later healthy worker.


## Phase 04 acceptance reconciliation — 2026-10-22

Owner/ChatGPT accepted Phase 04 at verified pushed `56ca07d36c833313c9f3bc757d47e9620b8c39ca`. HEAD/upstream/live remote checked 2026-10-27. **COMPLETE; progress 5/22**. Historical 158 unit/integration and 18 Chromium PASS, worker-owned lifecycle and header-only persistence accepted. Sensitive retention/encryption remains OPEN. Chrome Stable, Brave Phase 04 and real Odoo NOT TESTED. Earlier ADR-P04 provisional statuses are historical and superseded only for this accepted narrow implementation.

## ADR-P05-01 — Isolated document-bound categories in volatile memory

- Date: 2026-10-27. Status: **PROVISIONAL — Phase 05 review pending**, progress 5/22; explicit owner implementation scope, no sensitive policy approval.
- Problem: useful minimal action/navigation evidence must not disclose business data, survive revoked authority, or silently expand header persistence.
- Choice: activeTab + required scripting, ISOLATED top-frame probe, browser-attested documentId-targeted injection only after worker-authorized Start/Resume. Worker-issued random port token binds one current session epoch/document. Exact sender and message validation, one in-flight event, fresh selected-scope/document injection-access probe on every event. No host/static/all-frame/MAIN registration or page command channel.
- Data: trusted BUTTON/A click categories and limited generic navigation; only enum, worker sequence and coarse elapsed time. Ignore inputs/editable/unknown/iframe targets. One 128-entry ring, 512 admitted collector events per authorization, then pause. UI count is accepted categories, evictions count ring loss only; busy/unknown/unobserved actions are not counted. Start/Resume clears prior memory. Delete clears its buffer; restart loses all evidence and recovers PAUSED.
- Expiration: non-renewing absolute deadline at the existing 30-minute lifetime, no heartbeat/reconnect/recovery. Three-second injection/handshake timeout is setup-only, not a lease. Port disconnect and pagehide remove listeners; event admission independently checks deadline/current epoch. This supersedes the unimplemented five-second renewable lease proposal for Phase 05 only; no sensitive retention/encryption policy is resolved.
- Native popup returning to its bound window keeps authorized recording; lost/other window focus, tab/navigation/access loss invalidate. Stale controls/deletion of older cases cannot invalidate a different current collector.
- Tradeoffs: full navigation can tear down before category acceptance; all actions/SPA transitions are not observable. Worker idle death ends collection, with no automatic recovery. Extra document-access probe per accepted event favors conservative authority over throughput. Categories can still reflect lower-trust/spoofed page structure; they do not establish business success, production classification or Odoo support.
- Evidence: [Phase 05](Phases/PHASE_05.md), unit/DOM doubles versus actual production Chromium matrix explicitly separated. [Chrome scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting), [ports](https://developer.chrome.com/docs/extensions/develop/concepts/messaging), [worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) checked 2026-10-27.
- Rejected/deferred: persistent event stores pending P01-RETENTION/P01-CRYPT; host grants/MAIN/network/RPC/errors, automatic recovery, richer targets/routes, full timeline/export and unrelated features. **STOP after Phase 05.**
