# Blockers and Decisions

Date: 2026-10-22. Phases 00–02 COMPLETE; accepted progress **3/22**. Phase 03 **PROVISIONAL**; Phase 03 Chrome/Brave smoke NOT TESTED. Historical decisions/evidence below are superseded by dated reconciliations where stated.

## Current blockers and pending decisions

| ID | Status / severity | Affected phase / impact | Owner / required action |
|---|---|---|---|
| DB-REVIEW | RESOLVED | DB accepted per explicit owner statement; commit/push verified at f3cdea5 | Owner acceptance recorded; historical DB report preserved |
| PHASE-00-AUTH | RESOLVED | Owner explicitly authorized this Phase 00 only | No broader authority inferred |
| P00-REVIEW | RESOLVED | ChatGPT/owner accepted 00 on 2026-10-21 per owner | Acceptance reconciliation in Phase 00 report; commit/push 9b728ba verified |
| P00-SCOPE | RESOLVED | Owner explicitly retains single-case 16, comparison 17, optional discovery 21 | Current instruction dated 2026-10-21; ADR-P01-01 |
| P00-DIFF | OPEN / product risk | Workbench already overlaps recording/comparison/local export | Owner approve narrow value hypothesis; later controlled recipient/leakage evaluation |
| ODOO-ENV | UNKNOWN / runtime blocker | No authorized real version/edition/hosting evidence | Owner later supplies non-sensitive environment/permission inventory and permitted test actions; no access now |
| P00-CAPTURE | OPEN / feasibility risk | MAIN observer may be unsafe; metadata misses HTTP-200 application errors | Owner accept reduced handover or revisit scope after Phase 08 safety GO/NO-GO; never force invasive capture |
| P00-POLICY | OPEN / security policy | Retention caps, encryption, export classification, production restrictions undecided | Owner/security lead choose in authorized 01; no production recording assumed |
| P00-BROWSER | OPEN / coverage | Exact Chrome floor/channel/OS and expanded browsers unknown | Owner prioritize test target/build later; Chromium MV3 is only a direction |
| P00-ACCEPT | OPEN / acceptance policy | No user study/performance measurements | Owner agree seeded scenarios and acceptance measurement; numerical performance/coverage targets after baseline/instances |
| P00-BRAND | OPEN / release gate | Trademark/name/store availability, license/support process unverified | Owner/legal choose before public release; no first/endorsement claim |
| PRODUCT-IMPLEMENTATION | IN PROGRESS / gated | Phase 02 scaffold accepted; Phase 03 consent preview provisional; no capture | Review 03; no Phase 04 authorization |
| PLEMO-CAPABILITY | UNKNOWN / NOT IMPLEMENTED | No intake/auth or capability evidenced | Optional 21 only, separately authorized; no integration now |

## Historical owner decisions recorded (DB / Phase 01)

- Owner states DB accepted and pushed at f3cdea5. Local/live remote evidence confirms the commit; acceptance itself is owner-attested.
- Required permanent branch: feature/odoo-tracebridge, originally created from origin/develop at 64a05446cd9ca65e89c5515c6c76e8ee073fb94a. Current HEAD 9b728bae9c54ebd07768fbe641aed3a7f5178ebe; upstream origin/feature/odoo-tracebridge now exists and matches live remote.
- Current authorization: Phase 01 architecture/security documentation and Phase 00 acceptance reconciliation only. No code/dependencies/Odoo/customer access/Plemo/commit/push/Phase 02. Future Git publication requires separate owner action/review.
- Product remains AI-free/local-first as a proposed requirement; all architecture, runtime security and compatibility claims remain untested.

## Security and privacy boundaries

Public documentation/store pages and Git remote were read. No Odoo application/customer database, production system, secrets, credentials or capture data was accessed. Read-only extension intent does not authorize business-action reproduction that changes Odoo data. See [scope](PRODUCT_SCOPE.md), [feasibility](FEASIBILITY.md) and [support inventory](SUPPORT_MATRIX.md).

## Phase 01 review gates — reconciled 2026-10-21

| ID | Proposal / unresolved tradeoff | Owner / gate |
|---|---|---|
| P01-REVIEW | **SATISFIED** — owner supplied Phase 01 acceptance for 2026-10-21 and verified pushed commit `013887312f69d77458191d1663308ed9490297e7` | Phase 01 COMPLETE; historical pending record preserved |
| P01-BUILD | **RESOLVED FOR PHASE 02** — WXT + React implemented with exact pins and audited manifests | See ADR-P02-01 and [Phase 02](Phases/PHASE_02.md); not a security certification |
| P01-HOST | activeTab baseline; optional HTTPS site grant only if 07 needs it; no wildcard grant | Owner/security; approve permission strategy before capture |
| P01-RETENTION | Proposed 30-minute capture, 24-hour age, 10 cases / 20 MiB total; smaller caps reduce evidence | Owner/security; before 04 persistence |
| P01-CRYPT | IndexedDB sanitized cases without app encryption versus volatile-only or passphrase encryption | Owner/security; before persisted evidence; restrictive volatile alternative if unresolved |
| P01-BROWSER | Proposed API floor Chrome 120, supported target current patched Stable on Linux only; no old-build security promise | Owner/QA; before scaffold browser target |
| P01-PRODUCTION | Proposed deny production/unknown environments; later exception needs organization approval and tested noninterference | Owner/security; before any real recording |
| P01-EXPORT | Internal confidential reviewed file classification; notes/aliases may still identify people | Owner/data custodian; before export; recipient transmission separately authorized |

Numeric proposals, encryption, browser coverage, production access and export classification are not accepted by accepting Phase 00. See [policy tradeoffs](SECURITY_PRIVACY.md). P00-POLICY/P00-BROWSER are refined by these IDs, not silently resolved.

## Historical Phase 02 acceptance gap (superseded below)

Phase 02 implementation/build/tool checks are recorded as PASS, but owner acceptance is **PENDING** because no Chrome window was available for a manual unpacked-install/popup smoke. Run the exact owner steps in [PHASE_02](Phases/PHASE_02.md). This does not block later review of Phase 02 artifacts, but acceptance should record the browser result explicitly. Phase 02 does not resolve host permissions, consent, retention, encryption, production or export decisions for later phases.

## Phase 02 acceptance reconciliation — 2026-10-21

Owner/ChatGPT accepted Phase 02 on 2026-10-21 and reports Brave popup smoke **PASSED**. This is owner-attested browser evidence, not a new Codex browser run. Google Chrome remains **NOT TESTED**. Local HEAD, upstream tracking ref and live origin match pushed commit `fe90532b11e043344aa2abfb7a539a0156e30cd5`. Phase 02 is **COMPLETE**; accepted progress is **3/22**. Earlier provisional/2-of-22 and uncommitted records above are preserved as historical execution evidence and superseded by this reconciliation. Current authorization is Phase 03 only; no publication or later phase is authorized.

## Current Phase 03 gates

| ID | Status / impact | Owner / next action |
|---|---|---|
| P02-REVIEW | RESOLVED — accepted 2026-10-21, fe90532 verified pushed; owner-attested Brave popup PASS | Chrome remains NOT TESTED; historical execution evidence preserved |
| P03-REVIEW | OPEN — Phase 03 PROVISIONAL; 3/22 accepted | Owner/ChatGPT review phase report; do not begin 04 |
| P03-BROWSER | OPEN — Chrome and Brave Phase 03 smoke NOT TESTED | Owner runs fixture-only runbook and reports build/browser/OS, status, permission view, runtime errors and non-sensitive screenshots |
| P03-ACCESS | LIMITATION — URL visibility cannot certify injection rights; temporary grant removal may not emit onRemoved | No capture exists; revoke on events, revalidate before approval, discard popup consent; future worker independently validates authority |
| P03-AUTH | LIMITATION — authorization/environment user stated; no trusted inventory or production/Odoo detector | Unknown/production declarations denied; no live/customer use follows; owner/security resolves real-use policy later |
| P03-DEV | LIMITATION — WXT reload tabs/scripting/localhost access; connect-src none may block HMR | Use only fixture dev profile; production rebuild/manual reload is safe fallback |

Current authorization is Phase 03 only; no Git publication, customer/production access or later phase. P01-HOST remains activeTab-only; optional/persistent hosts still undecided. Retention/encryption/export/production exceptions remain open. No policy numbers selected and no storage/session/capture implemented.

## Phase 03 smoke-only blocker update — 2026-10-22

- `P03-BROWSER`: **BLOCKED / NOT TESTED**, observed again through real CUA capability discovery: only empty in-app browser/MCP Apps surfaces; no native Chrome/Brave. Direct Chrome extensions-page request returned `Error: Browser is not available: chrome`. Browser/version/OS unknown; no isolated profile or installed extension/runtime/permission Details/screenshot evidence. Twelve actual browser cases: **0 PASS / 0 FAIL / 12 NOT TESTED**. Build/output/static manifest checks pass separately. Owner must connect a supported Chrome/Brave surface or run the unchanged Phase 03 runbook manually in an isolated profile. Do not bypass browser policy or treat static/mocked results as browser PASS.
- `P03-FIXTURE`: **UNIDENTIFIED / positive-test blocker**, no existing owner-controlled synthetic HTTPS/default-port fixture identified in supplied records; existence elsewhere UNKNOWN. Owner supplies/identifies its exact authorized origin/provenance before positive consent tests. No unrelated/public/customer site substitution or false authorization; no fixture provisioned this run.
- Initial unexpected docs.zip caused preflight stop. Owner confirmed deletion and continuation; resumed exact 19-path preflight passed. Existing source/config/package changes preserved. Only phase/test/blocker/handoff/status docs updated.
- No runtime functional defect diagnosed without runtime access; Phase 03 **PROVISIONAL**, progress **3/22**, acceptance UNREVIEWED. Evidence ZIP `/tmp/tracebridge-phase03-smoke.zip` has blocked per-case results and safe reports, no screenshots. Next action: owner browser + authorized synthetic fixture verification, then ChatGPT review; no Phase 04.

## Current automation/local-development reconciliation — 2026-10-22

This section supersedes earlier CUA-only/manual/HTTPS-only requirements while preserving historical evidence.

| ID | Current status | Next action / limitation |
|---|---|---|
| P03-BROWSER | RESOLVED for isolated synthetic Chromium matrix | 10 real MV3 specs PASS: 9 native action, 1 direct popup; 0 mandatory BLOCKED. Chrome Stable/Brave Phase 03/minimum-version/other OS remain NOT TESTED |
| P03-FIXTURE | RESOLVED | Codex-created synthetic HTTP IPv4/IPv6 loopback servers at dynamic ports; no real data, no public listener, no existing 8069 access |
| P03-LOCAL | OWNER APPROVED / IMPLEMENTED | Local Development primary use case, exact normalized loopback HTTP(S)/ports, explicit confirmation; supersedes HTTPS-only restriction. Remote HTTP/LAN/custom names denied |
| P03-AUTOMATION | OWNER APPROVED / IMPLEMENTED | Codex owns tests/fixtures/evidence each phase; [permanent policy](06_DEPLOYMENT_RUNBOOK.md#permanent-codex-owned-phase-verification-policy). Owner reviews/publication only |
| P03-TOOLING | MAINTENANCE LIMITATION | Pinned internal Playwright other-target hook; native X11 + xdotool work here. Xvfb unavailable/NOT TESTED; physical toolbar click not tested. Missing native prerequisites must be BLOCKED, not waived |
| P03-ACCESS | EXISTING LIMITATION | Native action true activeTab observed; no injection authority claim, expiry events not guaranteed. Browser UI permission withholding/removal/disable/re-enable/incognito UX NOT TESTED; policy/mock negatives separate |
| P03-AUTH | EXISTING LIMITATION | User-stated environment/authority cannot detect dishonest production classification or prove Odoo; no trusted inventory or real-use certification |
| P03-DEV | EXISTING LIMITATION | Dev manifest separately audited; HMR NOT TESTED, connect-src none retained; never distribute dev output |
| P03-REVIEW | OPEN | Phase 03 PROVISIONAL / 3/22 / UNREVIEWED. Owner/ChatGPT reviews verified ZIP; no routine manual testing assigned to owner |

123 unit/integration tests and 10 browser specs PASS, final build/typecheck/lint/manifests/regression/diff pass. No current mandatory automation blocker. Compatibility/real Odoo/performance/security certification NOT TESTED; retention/encryption/production exceptions/export still open for future phases. No Phase 04, Git publication or customer/production access.
