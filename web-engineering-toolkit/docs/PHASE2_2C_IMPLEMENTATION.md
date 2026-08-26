# Phase 2.2C — P3 Governance and Terminology Implementation

Date: 2026-08-26

Status: Phase 2.2C implemented and validated. All findings recorded by the Phase 2.1 audit are closed at their planned P1, P2, or P3 implementation level. The product remains a technical compliance pre-assessment and does not determine compliance or control satisfaction.

## 1. Baseline

Implementation started from repository commit `b3125d651cbdcad0051010ff0b30d1dff89438cf` (`b3125d6`) with toolkit version `1.7.1` and pre-existing Phase 2.2A/2.2B worktree changes preserved.

- Mapping catalog: `2026.08.26.2`
- Report schema: `2.3.0`
- Finding schema: `1.3.0`
- Evidence vault schema: `4`
- Evidence manifest schema: `1.2.0`
- Passive ZAP finding schema: `1.1.0`
- Static mappings: 62
- Registry frameworks: 6 (`eprivacy`, `gdpr`, `hipaa`, `iso-27001`, `pci-dss`, `soc-2`)
- Unique candidate controls: 19
- `npm test`: 104 passed, 0 failed, 0 skipped; 59.75 seconds wall time (59.38 seconds reported by Node)
- `npm run validate:phase1`: 79 passed, 0 failed, 0 skipped; 105.00 seconds wall time
- Browser capability: Brave 151.1.93.134 at `/usr/bin/brave-browser`; launch, navigation, PDF source navigation, and PDF rendering available

No Lighthouse Reporter or Asset & Page-Weight Analyzer production module was changed in Phase 2.2C.

## 2. P3-AUD-015 implementation

`lib/security-compliance-semantics.js` is the single canonical source for relationship labels and descriptions. It defines the supported model vocabulary: `direct`, `supporting`, `contextual`, `scope_signal`, and `manual_only`.

The definitions describe closeness and purpose only. They do not describe a control as passed, failed, satisfied, compliant, or violated. A shared disclaimer states: “No relationship type determines control satisfaction or compliance.”

- HTML and workspace show one compact legend near Candidate Control Mappings rather than repeating it on each card.
- PDF prints the compact legend in the mapping section without dedicating a page to it.
- XLSX includes a `Mapping Guidance` sheet with the same labels, short descriptions, and disclaimer.
- JSON exposes the canonical relationship definitions once as report metadata.
- Findings CSV retains machine-friendly relationship values and does not repeat glossary prose per row.

Relationship metadata never changes `controlSatisfaction = not_determined`.

## 3. P3-AUD-016 implementation

Every one of the 62 static registry mappings now has:

- `rationale`
- `sourceVersion`
- `lastReviewedAt`
- `reviewedBy`
- `changeReason`

Existing `mappingId`, `framework`, `frameworkVersion`, `controlId`, `relationship`, `sourceCitation`, `reviewStatus`, `mappingVersion`, `approvedBy`, and `approvalDate` remain intact.

Population uses concise check-specific technical subjects plus conservative relationship wording, avoiding 62 duplicated long narratives. Source versions are canonical per framework. The deterministic catalog review date is `2026-08-26`; `reviewedBy = toolkit_mapping_governance` identifies a project governance role, not a person, auditor, counsel, or framework owner.

No approval was fabricated: `approvedBy` and `approvalDate` remain `null`, and report presentation explicitly says “No approval claimed.” Mapping merge retains source-level governance records in `sourceGovernance`, so semantic control deduplication does not hide why each source mapping exists.

Dynamic local-law handling does not create new mappings. Historical local mapping metadata, if supplied by an older caller, is normalized only for qualified review. Jurisdiction configuration continues to produce instrument metadata and no unsupported automated provision-level candidate controls.

## 4. P3-AUD-017 implementation

Canonical display names are centralized and used across scanner results, workspace, HTML, PDF, XLSX, and legacy read-time presentation:

- ISO/IEC 27001
- GDPR
- ePrivacy Directive
- SOC 2
- HIPAA
- PCI DSS
- Local Regulations

Internal framework IDs are unchanged.

Applicability logic and enum values are unchanged. User-facing labels now distinguish:

- `Applicable — operator asserted`
- `Not applicable — operator asserted`
- `Potentially applicable — scope confirmation required`
- `Not indicated by observed public evidence`
- `Applicability not determined`
- `Scope confirmation required`

Framework cards separately show `Mapping selection: Selected for mapping` and `Applicability: ...`. Selecting a framework therefore does not visually imply applicability. Local scope uses `Jurisdiction configured: <jurisdiction>` and never states that a local law applies unless an operator assertion exists, which remains visibly qualified.

## 5. P3-AUD-018 implementation

`manualReviewRequired = true` remains universal for every control evaluation. The new `manualReviewReasons` array contains stable, deduplicated reason codes selected only when applicable:

- `scope_confirmation_required`
- `organizational_evidence_required`
- `operating_effectiveness_not_assessed`
- `failed_collection_present`
- `not_assessed_evidence_present`
- `mapping_requires_human_review`
- `policy_claim_requires_validation`
- `authenticated_authorization_not_verified`
- `legal_interpretation_required`

HTML, PDF, and workspace humanize these codes under “Human review required.” XLSX adds `Review Reasons` to Control Evidence. JSON retains the machine-readable array. Findings CSV remains finding-focused and does not receive control-level reason columns.

These reasons are review prompts, not reviewer decisions. They remain separate from finding lifecycle decisions such as `accepted_as_observation`, `false_positive`, `requires_more_evidence`, `mapping_confirmed`, `mapping_rejected`, `scope_confirmed`, and `scope_not_confirmed`.

## 6. Catalog and schema version decisions

| Component | Old | New | Reason |
|---|---:|---:|---|
| Toolkit | `1.7.1` | `1.7.1` | Release policy did not require a toolkit release bump |
| Mapping catalog | `2026.08.26.2` | `2026.08.26.3` | Governance metadata changes the catalog representation and provenance |
| Report schema | `2.3.0` | `2.4.0` | Adds shared definitions, precise presentation metadata, and review reasons |
| Finding/control schema | `1.3.0` | `1.4.0` | Adds control review reasons and merged source governance |
| Evidence vault | `4` | `4` | Evidence storage semantics did not change |
| Evidence manifest | `1.2.0` | `1.2.0` | Manifest structure did not change |
| Passive ZAP finding | `1.1.0` | `1.1.0` | ZAP evidence semantics did not change |

The catalog bump is intentional: although relationships and controls are unchanged, a consumer can now depend on the mapping governance representation. No unrelated schema was bumped.

## 7. Legacy compatibility

Historical reports are normalized at read time and are not rewritten. Missing relationship definitions, framework display labels, applicability labels, review-reason definitions, `manualReviewReasons`, and mapping governance fields receive conservative presentation defaults.

Legacy mapping source/version text remains preserved. Missing historical governance is labeled as unavailable rather than fabricated. Placeholder governance blocks are not printed as though a historical review occurred. Existing evidence, cookie fingerprints, lifecycle history, applicability states, and reviewer decisions are unchanged.

## 8. Tests

Eight durable regressions were added: seven in `phase2-p3-governance-terminology.test.js` and one workspace projection test. Existing PDF pagination assertions were extended for the relationship legend, manual-review reasons, and governance identity.

Final `npm test` result:

- Total: 112
- Passed: 112
- Failed: 0
- Skipped: 0
- Duration: 57.14 seconds wall time; 56.82 seconds reported by Node

Final `npm run validate:phase1` result:

- Total: 80
- Passed: 80
- Failed: 0
- Skipped: 0
- Duration: 107.56 seconds wall time

The Phase 1 total increased by one because the workspace P3 regression is included in the existing deterministic gate. No existing Phase 1 assertion was weakened.

## 9. Cross-format validation

The same canonical relationship, naming, applicability, governance, and manual-review semantics were validated across `summary.json`, `summary.html`, `summary.pdf`, `summary.xlsx`, `findings.csv`, the `summary.csv` alias, `metadata.json`, `report-manifest.json`, and the workspace.

- JSON retains shared definitions, precise labels, structured reasons, source governance, and schema/catalog versions.
- HTML/workspace use the shared terminology and keep mapping selection separate from applicability.
- PDF prints a compact legend, reason labels, and one compact governance provenance summary per semantic control.
- XLSX includes Mapping Guidance and Mapping Governance sheets plus structured review reasons.
- CSV exports retain existing machine-oriented scope and do not duplicate long glossary or control-level prose.
- Metadata and manifest retain canonical report versions and invariants.

The P1/P2 prerequisite, ownership, source provenance, evidence-state, cookie identity, density, SOC source, and traceability tests remain green.

## 10. PDF and redaction validation

All three native PDF regressions passed.

- Searchable/selectable: passed with `pdftotext`
- Page size: A4, 595.92 × 842.88 points
- Controlled smoke PDF: 26 pages, 661,001 bytes
- Relationship legend: compact on the first mapping page
- Manual-review reasons: readable and deduplicated
- Governance: compact source count/version/review identity; no approval claimed
- Pagination: mixed small/medium/large mapping fixtures retain natural flow, no sparse internal page, no clipping, and no horizontal overflow
- Unicode/machine values: long URLs, IDs, and hashes extract without hidden Unicode corruption
- Links: official AICPA SOC 2 and other source citations remain clickable in the PDF
- Visual inspection: cover and mapping pages, including a split mapping page, were readable with no overlap or clipping

Redaction regressions confirmed that Authorization values, credentials, passwords, cookie/session values, browser storage values, Playwright state, restricted authenticated bodies, and raw sensitive ZAP evidence are absent from public reports. Safe IDs, hashes, URLs, methods, and timestamps remain available.

## 11. Three-tool smoke

Controlled local fixture smoke passed for all three tools.

- Compliance Mapping: 13 findings; HTML, JSON, findings CSV, summary CSV alias, XLSX, PDF, metadata, report manifest, workflow, and evidence manifest generated; evidence access remained `local-filesystem-only`
- Lighthouse Reporter: one valid controlled accessibility run; accessibility result 85; HTML/JSON/CSV/XLSX report set generated
- Asset & Page-Weight Analyzer: one controlled page with request metrics; HTML/JSON/CSV/XLSX report set generated

Lighthouse Reporter and Asset & Page-Weight Analyzer production behavior remains unchanged.

## 12. Performance

Measured on the controlled local fixture:

| Operation | Duration / size |
|---|---:|
| `npm test` | 57.14 s wall; 56.82 s runner |
| Phase 1 validation | 107.56 s |
| Compliance scan | 2,187 ms |
| Compliance report generation | 2,066 ms |
| HTML generation | 30 ms |
| PDF generation | 1,550 ms |
| PDF size | 661,001 bytes |
| Lighthouse smoke | 12,219 ms |
| Asset smoke | 2,253 ms |
| Complete controlled smoke | 20.31 s wall |

Compared with the Phase 2.2B measurements, test and report-generation runtimes did not materially regress. The controlled PDF grew from 23 to 26 pages and from 599,305 to 661,001 bytes because it now includes the required legend, review reasons, and governance summaries; pagination and sparse-page tests remain green.

## 13. Remaining known limitations

- Mapping rationales and governance metadata are maintained by the toolkit project role and remain `internal_review_required`; they are not external audit, legal, framework-owner, or control-owner approval.
- Public technical evidence cannot establish organization-wide implementation, sustained operating effectiveness, legal applicability, or control satisfaction.
- Operator applicability inputs remain assertions and are not independently verified by the toolkit.
- Historical reports without P3 metadata can be rendered conservatively, but missing historical governance cannot be reconstructed as a completed review.
- Local regulations remain jurisdiction/instrument context requiring qualified legal interpretation; unsupported automated provision-level mappings remain omitted.
- Manual-review reason codes identify why review is needed; they do not perform or record the review decision.

## 14. Phase 2 completion assessment

All Phase 2.1 audit findings have now been addressed at their planned priority:

- P1-AUD-001 through P1-AUD-007: closed by Phase 2.2A
- P2-AUD-008 through P2-AUD-014: closed by Phase 2.2B
- P3-AUD-015 through P3-AUD-018: closed by Phase 2.2C

Phase 2 is complete for the documented audit scope. This does not mean the target is compliant or that the toolkit has issued an audit opinion. The invariants remain `assessmentType = compliance_pre_assessment`, `complianceConclusion = not_determined`, `controlSatisfaction = not_determined`, and `coverage = partial`.
