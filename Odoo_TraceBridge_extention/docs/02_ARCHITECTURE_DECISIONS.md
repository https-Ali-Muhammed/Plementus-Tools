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
