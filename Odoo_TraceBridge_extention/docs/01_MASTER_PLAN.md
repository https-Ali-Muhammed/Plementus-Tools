# Master Plan — Step DB and Product Phases 00–21

## Current ledger
- Documentation Bootstrap (DB): ACCEPTED per owner; committed/pushed at `f3cdea5`, verified 2026-10-20.
- Verified repository: `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`; project path `/home/https_ali_muhammed/Plementus/Tools/Odoo_TraceBridge_extention`; Git root `/home/https_ali_muhammed/Plementus/Tools`.
- Implementation branch: `feature/odoo-tracebridge`, created from `origin/develop` at `64a05446cd9ca65e89c5515c6c76e8ee073fb94a`; current HEAD `f3cdea59bf1a563d16897a1bd0771d60fd7cb640`, upstream `origin/feature/odoo-tracebridge`; live remote equals HEAD. Future commits and pushes require owner review.
- Completed product phases: **0/22**.
- Phase 00: PROVISIONAL discovery documented; ChatGPT/owner review pending. Phases 01–20: NOT STARTED / not authorized by this task.
- Phase 21: OPTIONAL future Plemo discovery only; NOT STARTED and not part of the AI-free v1 gate.
- No phase may begin without the preceding gate and owner authorization.

## Sequence, dependencies and acceptance gates

| ID | Phase and essential result | Depends on | Acceptance gate |
|---|---|---|---|
| DB | Documentation bootstrap, branch, honest README and durable records | Verified repository/path/remote and clean tree | Owner/ChatGPT review; documentation and Git evidence; no product code |
| 00 | Product discovery and originality audit; competitors, scenarios, lawful test-instance inventory | Accepted DB | Owner-approved defensible scope and cited discovery evidence |
| 01 | Architecture and security decisions; boundaries, threat model, permissions, retention | 00 | Reviewed data flow, privacy constraints, and architecture gate |
| 02 | MV3 scaffold and tested installation README | 01 | Runnable blank extension; reproducible setup/build/lint/typecheck/tests and permission audit |
| 03 | Permission request and recording consent | 02 | No capture before explicit single-origin consent; denial/revocation behavior verified |
| 04 | Session lifecycle and bounded persistence | 03 | Lifecycle, tab binding, restart, limits, expiration, and deletion verified |
| 05 | Safe user-action and navigation events | 04 | Minimal categories only; sensitive-input/record fixtures excluded |
| 06 | Client exception capture | 05 | Scoped error/rejection evidence with redaction and teardown verified |
| 07 | Network outcome metadata | 06 | Least-privilege metadata capture or documented safe fallback; no bodies/headers persisted |
| 08 | RPC envelope research and safe observer | 07 | Explicit safety GO/NO-GO; bounded parsing and noninterference evidence or safe fallback |
| 09 | Odoo identification and capability registry | 08 | Version confidence and generic fallback; spoofed/unknown cases remain honest |
| 10 | Modern Odoo adapter fixtures (17–20) | 09 | Synthetic fixtures labeled as such; real versions only verified with authorized instances |
| 11 | Evidence schema and normalization | 10 | Versioned schema, provenance, validation, and missing-signal representation verified |
| 12 | Action-to-request correlation | 11 | Deterministic joins; ambiguous cases remain explicitly ambiguous |
| 13 | Rule-based diagnosis | 12 | Rules cite evidence IDs and limitations; no AI/backend root-cause claims |
| 14 | Investigation UI and case notes | 13 | Usable, accessible timeline and clear separation of observed/user-stated/derived evidence |
| 15 | Reviewed Markdown and JSON export | 14 | Preview, field-level redaction, schema validation, and synthetic secret tests pass |
| 16 | AI-free MVP end-to-end acceptance | 15 | Consent-to-export journey, privacy/noninterference gates, and support statement accepted |
| 17 | Environment and version comparison | 16 | Capability-aware two-session diff and uncertainty limits verified |
| 18 | Legacy adapter expansion and support matrix | 17 | Feature-level evidence for Odoo 8–16; untested versions remain unknown/fallback |
| 19 | Security, performance and resilience | 18 | Threat, permission, fuzz, event-load, worker-restart, and performance gates accepted |
| 20 | Release readiness and README completion | 19 | Reproducible package, clean install guide, disclosure/checklist; no publication implied |
| 21 | OPTIONAL future Plemo integration discovery (read-only) | Stable exports after 15; separate owner authorization | Concrete capability assessment and contract memo; not implementation approval |

## Dependency sequence

Required v1 path: `DB → 00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20`.

Phase 21 is an optional, separately approved exploratory track after stable export design; it does not gate the AI-free extension. If a spike is unsafe or infeasible, document a safe fallback and obtain owner approval before changing scope. Do not combine phases or skip acceptance gates.

## Baseline source

The complete phase definitions, detailed deliverables, verification requirements, and stop conditions are in [the canonical blueprint](Odoo_TraceBridge_Complete_Implementation_Blueprint.md), especially Sections 10–14. The companion handoff reference is [New Chat Instructions](Odoo_TraceBridge_New_Chat_Instructions.md). Both were copied verbatim from the project root into this documentation directory.

## Phase 00 scope clarification (proposed)

Detailed roadmap §10 places the single-case MVP at 16 and automated comparison at 17, whereas broad §2.1 includes comparison. Retain comparison in v1; propose 16 as the single-case checkpoint pending `P00-SCOPE`. See [product scope](PRODUCT_SCOPE.md), [Phase 00 report](Phases/PHASE_00.md) and [owner decisions](05_BLOCKERS_AND_DECISIONS.md). No downstream phase started.
