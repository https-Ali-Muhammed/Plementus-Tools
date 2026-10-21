# Blockers and Decisions

Date: 2026-10-20. Phase 00 PROVISIONAL; no Phase 01 authorization.

## Current blockers and pending decisions

| ID | Status / severity | Affected phase / impact | Owner / required action |
|---|---|---|---|
| DB-REVIEW | RESOLVED | DB accepted per explicit owner statement; commit/push verified at f3cdea5 | Owner acceptance recorded; historical DB report preserved |
| PHASE-00-AUTH | RESOLVED | Owner explicitly authorized this Phase 00 only | No broader authority inferred |
| P00-REVIEW | OPEN / gate | Cannot accept 00 or start 01 | ChatGPT/owner review phase report, sources and checks |
| P00-SCOPE | OPEN / gate | Broad MVP comparison list versus Phase 16/17 sequencing | Owner ratify single-case MVP at 16, automatic comparison at 17; see scope |
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
- Required permanent branch: feature/odoo-tracebridge, originally created from origin/develop at 64a05446cd9ca65e89c5515c6c76e8ee073fb94a. Current HEAD f3cdea59bf1a563d16897a1bd0771d60fd7cb640; upstream origin/feature/odoo-tracebridge now exists and matches live remote.
- Current authorization: Phase 00 documents and DB reconciliation only. No code/dependencies/Odoo/customer access/Plemo/commit/push/Phase 01. Future Git publication requires separate owner action/review.
- Product remains AI-free/local-first as a proposed requirement; all architecture, runtime security and compatibility claims remain untested.

## Security and privacy boundaries

Public documentation/store pages and Git remote were read. No Odoo application/customer database, production system, secrets, credentials or capture data was accessed. Read-only extension intent does not authorize business-action reproduction that changes Odoo data. See [scope](PRODUCT_SCOPE.md), [feasibility](FEASIBILITY.md) and [support inventory](SUPPORT_MATRIX.md).
