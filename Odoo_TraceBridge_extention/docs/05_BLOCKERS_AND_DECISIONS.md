# Blockers and Decisions

Date: 2026-10-21. Phase 00 and Phase 01 COMPLETE; Phase 02 PROVISIONAL — pending owner acceptance; accepted progress 2/22. Manual Chrome popup smoke remains NOT TESTED.

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
| PRODUCT-IMPLEMENTATION | NOT STARTED | No extension, dependency tree or test harness | Follow gated roadmap after 00 review and separate authorization |
| PLEMO-CAPABILITY | UNKNOWN / NOT IMPLEMENTED | No intake/auth or capability evidenced | Optional 21 only, separately authorized; no integration now |

## Owner decisions recorded

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

## Phase 02 acceptance gap

Phase 02 implementation/build/tool checks are recorded as PASS, but owner acceptance is **PENDING** because no Chrome window was available for a manual unpacked-install/popup smoke. Run the exact owner steps in [PHASE_02](Phases/PHASE_02.md). This does not block later review of Phase 02 artifacts, but acceptance should record the browser result explicitly. Phase 02 does not resolve host permissions, consent, retention, encryption, production or export decisions for later phases.
