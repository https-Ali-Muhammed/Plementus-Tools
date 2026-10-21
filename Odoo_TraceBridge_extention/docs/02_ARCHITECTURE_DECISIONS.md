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
