# Master Plan — Step DB and Product Phases 00–21

Current Phase 05 verification: **200 unit/integration/security PASS (6 files); 32 Chromium PASS (30 native action / 2 direct popup); 0 FAIL, 0 BLOCKED, 0 skipped. All 7 npm run verify gates PASS, exit 0.**

## Current Phase 05 ledger — 2026-10-27

- Phases 00–04 **COMPLETE**; accepted progress **5/22**. Phase 04 owner/ChatGPT acceptance dated **2026-10-22**, pushed `56ca07d36c833313c9f3bc757d47e9620b8c39ca`, verified against HEAD/upstream/live origin. Historical 158 unit/integration and 18 Chromium PASS, worker lifecycle and header-only persistence accepted; Chrome Stable/Brave Phase 04/real Odoo NOT TESTED.
- Phase 05 **PROVISIONAL / UNREVIEWED**: minimal isolated top-document categories, memory-only bounds and popup count. Final verification recorded in [Phase 05](Phases/PHASE_05.md). Accepted progress stays 5/22.
- P01-RETENTION/P01-CRYPT OPEN; no diagnostic persistence or policy acceptance. Phase 06–20 NOT STARTED. Phase 21 remains optional discovery only.
- Git root/origin/branch/upstream match; whole-repository preflight clean, HEAD 56ca07d. All Phase 05 changes remain unstaged/uncommitted. No publication or next phase.
- Permanent Codex-owned verification and existing detailed phase sequence below remain. Next single step: owner/ChatGPT reviews Phase 05 and its evidence ZIP. **STOP after Phase 05.**

## Historical records — superseded by the Phase 05 record above

## Current ledger
- Documentation Bootstrap (DB): ACCEPTED per owner; committed/pushed at `f3cdea5`, verified 2026-10-20.
- Verified repository: `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`; project path `/home/https_ali_muhammed/Plementus/Tools/Odoo_TraceBridge_extention`; Git root `/home/https_ali_muhammed/Plementus/Tools`.
- Implementation branch: `feature/odoo-tracebridge`; verified HEAD/upstream/live remote `8c7349150cf40adae0bdb015064a8d61aebdc74a`. Whole-repository worktree clean at Phase 04 preflight.
- Accepted progress: **4/22**.
- Phases 00–02: COMPLETE. Phase 02 owner/ChatGPT acceptance dated 2026-10-21; owner-attested Brave popup smoke PASSED, Google Chrome NOT TESTED. Historical Phase 02 evidence preserved.
- Phase 03: **COMPLETE**, owner/ChatGPT accepted 2026-10-22 at pushed `8c73491`: 123 unit/integration PASS; 10 Chromium PASS (9 native, 1 direct). Chrome Stable, Brave Phase 03 and real Odoo NOT TESTED.
- Phase 04: **PROVISIONAL**, worker lifecycle and bounded non-sensitive headers; pending owner/ChatGPT review. Accepted progress stays 4/22. Phases 05–20 NOT STARTED.
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

## Accepted sequencing — 2026-10-21

Detailed roadmap §10 places the single-case MVP at 16 and automated comparison at 17, whereas broad §2.1 includes comparison. Owner explicitly retains single-case MVP at 16 and comparison at 17 in v1; `P00-SCOPE` resolved. See [product scope](PRODUCT_SCOPE.md), [Phase 00 report](Phases/PHASE_00.md) and [owner decisions](05_BLOCKERS_AND_DECISIONS.md). Phase 01 documents [architecture](ARCHITECTURE.md) and [security](SECURITY_PRIVACY.md); no Phase 02 work.

## Permanent verification and approved loopback development — 2026-10-22

Phase 03 remains PROVISIONAL, progress 3/22; no Phase 04. The owner approves Local Development as a primary use case on explicitly authorized exact localhost/127.0.0.1/[::1] origins and valid loopback ports, including HTTP. This supersedes HTTPS-only loopback restrictions. Remote HTTP/LAN/custom DNS and production/unknown remain denied; authorized remote HTTPS Test/Staging is retained.

Every implementation phase must add appropriate tests, run build/strict typecheck/lint/unit/integration/regression/security negatives and applicable actual extension E2E, audit both manifests, record exact commands/versions/machine results and sanitized screenshots/traces, fix in-scope failures, and provide a verified evidence archive before review. Codex owns fixtures, execution and evidence; owner reviews and authorizes publication. FAIL/BLOCKED/NOT TESTED must remain explicit; mandatory blocked coverage prevents a fully verified claim. Full policy and commands: [runbook](06_DEPLOYMENT_RUNBOOK.md#permanent-codex-owned-phase-verification-policy). This updates all future phase gates without authorizing their implementation.

## Phase 04 review gate — 2026-10-22

Current owner scope supersedes historical no-Phase-04 instructions above. Implemented worker authority, fresh Start/Resume validation, conservative restart/navigation recovery, atomic bounded header-only persistence/deletion and Codex-owned automated tests. P01-RETENTION/P01-CRYPT remain unresolved for sensitive evidence; numeric values are proposals tested only against headers. See [Phase 04](Phases/PHASE_04.md). STOP for owner/ChatGPT review; Phase 05 NOT STARTED. No commit/push.
