# Phase 2.2B — P2 Semantic Hardening Implementation

Date: 2026-08-26

Status: Phase 2.2B implemented and validated. This document does not mark all Phase 2 work complete. P3-AUD-015 through P3-AUD-018 remain deferred.

## 1. Baseline

The implementation started from repository commit `b3125d651cbdcad0051010ff0b30d1dff89438cf` (`b3125d6`) with toolkit version `1.7.1`.

- Mapping catalog: `2026.08.26.1`
- Static mappings: 62
- Registry frameworks: 6 (`eprivacy`, `gdpr`, `hipaa`, `iso-27001`, `pci-dss`, `soc-2`)
- Unique candidate controls: 19
- `npm test`: 91 passed, 0 failed, 0 skipped; 61.97 seconds
- `npm run validate:phase1`: 78 passed, 0 failed, 0 skipped; 111.92 seconds
- Browser capability: Brave 151.1.93.134 at `/usr/bin/brave-browser`; browser launch, navigation, PDF source navigation, and PDF rendering available

The repository contained pre-existing Phase 2.2A and documentation changes. They were preserved. No production module belonging to Lighthouse Reporter or Asset & Page-Weight Analyzer was changed for Phase 2.2B.

## 2. P2-AUD-008 implementation

`control.state` remains the primary semantic state. Each control evaluation now also exposes:

```json
{
  "coverageSummary": {
    "totalEvidenceItems": 0,
    "completedEvidenceItems": 0,
    "partialEvidenceItems": 0,
    "failedEvidenceItems": 0,
    "notAssessedEvidenceItems": 0,
    "manualReviewEvidenceItems": 0,
    "uncertainPrerequisiteItems": 0,
    "complete": false
  },
  "coverageQualifiers": []
}
```

Supported qualifiers are `failed_evidence_present`, `not_assessed_evidence_present`, `partial_collection_present`, `manual_review_evidence_present`, `uncertain_prerequisite_present`, and `coverage_incomplete`.

The primary-state precedence is unchanged. Therefore adverse, supporting, contextual, manual, failed, and not-assessed evidence can coexist without a failed or unassessed source disappearing behind the primary state. All matrix cases retain `controlSatisfaction = not_determined` and `coverage = partial`.

## 3. P2-AUD-009 implementation

`lib/security-evidence-semantics.js` centralizes four independent dimensions:

- `collectionMethod`: HTTP response, TLS probe, DNS, browser runtime, crawl, authenticated browser, operator input, passive ZAP, manual, or artifact-only provenance
- `collectionState`: `completed`, `partial`, `not_tested`, or `failed_to_test`
- `evidenceConfidence`: `high`, `medium`, `low`, `asserted_not_verified`, or `unknown`
- `normalizedEvidenceStrength`: `direct`, `supporting`, `contextual`, `scope_signal`, `manual`, `provenance_only`, or `unknown`

Legacy fields remain present. A legacy `testState = confirmed` maps to `collectionState = completed`, but legacy `confidence = confirmed` maps conservatively to `evidenceConfidence = unknown`; completion no longer implies high epistemic confidence.

Passive ZAP records preserve ZAP confidence separately from collection completion. Failed ZAP collection points to the restricted execution artifact, while partial/completed results with a JSON report point to the restricted ZAP report artifact. ZAP findings still receive no candidate mapping unless governed by the mapping registry.

Automated evidence-vault artifacts now use `collectionMethod = artifact_only`, `evidenceStrength = provenance_only`, and `semanticEvidenceStrength = not_applicable`. Artifact existence therefore records provenance and integrity, not the semantic strength of an observation.

## 4. P2-AUD-010 implementation

The normalized negative-observation classes are:

- `actual_technical_absence`: successful technical source, absence bounded to that source
- `bounded_public_absence`: successful bounded public crawl, no matching public evidence found
- `not_assessed`: collection was not run
- `failed_to_test`: collection failed and no absence was asserted
- `bounded_source_absence_with_failed_sources`: one source completed with a bounded absence while another source failed
- `partial_collection`: incomplete collection without a full absence conclusion

Corrections cover HTTP redirect probing, TLS/certificate detail failure, browser cookies, mixed content, third-party scripts, CORS, authenticated session/crawl and route candidates, consent scenarios, security.txt, public evidence crawl, and ZAP. Static success plus runtime failure now reports the bounded static result and runtime failure separately. Failed collection no longer produces a pass or an unqualified “not observed” statement.

## 5. P2-AUD-011 implementation

Cookie canonical identity now includes:

- finding type
- cookie name
- normalized domain
- host-only versus domain scope
- normalized path
- missing attribute/condition
- tested origin

Cookie value, expiry, and creation time are excluded, preserving fingerprint stability across scans and value changes. Static `Set-Cookie` and browser-runtime evidence merge when name, domain semantics, path semantics, missing condition, and tested origin identify the same configuration. Same-name cookies with different paths, domains, host-only/domain scope, or missing conditions remain distinct.

New findings expose `canonicalFingerprint`, `legacyFingerprint`, and `fingerprintAliases`. An unambiguous old lifecycle fingerprint migrates to the canonical fingerprint and retains review history. If one old fingerprint ambiguously corresponds to multiple new path/domain-specific findings, the old record is resolved and the new findings remain open rather than applying one historical review to several distinct cookie configurations. Historical records are not rewritten in bulk.

## 6. P2-AUD-012 implementation

Semantic mapping deduplication remains in place and retains `sourceCheckIds`, `sourceMappingIds`, and evidence items. Each control now includes a `provenanceSummary` with source-check and source-mapping counts and IDs.

HTML, PDF, XLSX, JSON, and the workspace present one semantic control evaluation with source count and source checks. The wording explicitly states that source quantity is “provenance breadth, not assurance strength.” No confidence score, mapping score, evidence percentage, control readiness, compliance percentage, or readiness percentage was added.

## 7. P2-AUD-013 implementation

All 14 SOC 2 mappings now use:

- Framework version: `2017 Trust Services Criteria (With Revised Points of Focus — 2022)`
- Canonical official source: `https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022`

The official AICPA resource returned HTTP 200 during validation. All 14 control identifiers retain the `SOC2-CCn.n` form and their existing relationships; this phase changed provenance, not relationship semantics or copyrighted criteria text.

## 8. P2-AUD-014 implementation

Captured automated evidence carries the safe normalized traceability tuple where applicable:

`evidenceId`, `sourceUrl`, `sourceUrls`, `artifactRefs`, `collectionMethod`, `collectionState`, `observedAt`, `confidence`, `evidenceStrength`, `normalizedEvidenceStrength`, `limitations`, `sourceCheckId`, and `mappingIds`.

The tuple is retained through checks, findings, test results, control evidence, framework statements, JSON, HTML/PDF, XLSX, findings CSV where applicable, and the workspace. HTTP, TLS, browser, crawl/policy, authenticated, payment, operator, passive ZAP, and manual evidence classes have deterministic fixtures.

`validateSummaryTraceability()` validates finding, test-result, control, and framework-statement evidence. Claimed artifact IDs must resolve to `evidenceManifest.artifacts[].id`, role, or alias. Statement `evidenceRefs` must resolve to a known evidence item or an explicit safe `check:` reference. Synthetic composite artifact IDs are rejected. Evidence-specific source URLs take precedence over the root target URL, preserving the Phase 2.2A payment-source correction.

## 9. Schema and catalog version changes

Toolkit version remains `1.7.1`.

| Component | Old | New | Reason |
|---|---:|---:|---|
| Mapping catalog | `2026.08.26.1` | `2026.08.26.2` | Exact SOC 2 edition and canonical official citation |
| Compliance summary | `2.2.0` | `2.3.0` | Normalized evidence dimensions, coverage qualifiers, source provenance, and traceability |
| Finding | `1.2.0` | `1.3.0` | Canonical cookie identity/fingerprint aliases and normalized traceability |
| Evidence vault | `3` | `4` | Artifact-only provenance semantics and normalized collection metadata |
| ZAP finding | `1.0.0` | `1.1.0` | Separate ZAP confidence, collection state, method, and traceability |

Evidence manifest schema remains `1.2.0`; its structure did not require a change.

## 10. Legacy compatibility

Historical reports are normalized at read time and are not rewritten. Old `testState`, confidence, source method, evidence strength, scalar artifact ID, cookie fingerprint, SOC source/version, and mapping-catalog values remain readable and preserved. Missing normalized dimensions receive conservative defaults. Legacy `confirmed` confidence never becomes high confidence automatically.

Superseded expectations are documented as follows:

- ZAP `High` no longer becomes collection completion `confirmed`; new records expose confidence `high`, collection state separately, and a legacy confidence alias.
- Automated artifact presence no longer receives semantic `direct_observation`; new artifacts use provenance-only semantics.
- Same-name cookies on different paths/domains no longer collapse; ambiguous old lifecycle reviews are not guessed onto multiple new findings.

## 11. Tests

Final `npm test` result:

- Total: 104
- Passed: 104
- Failed: 0
- Skipped: 0
- Duration: 63.28 seconds wall time (62.96 seconds reported by the Node test runner)

The 13-test increase from the 91-test baseline consists of 12 Phase 2.2B semantic-hardening regressions plus one workspace projection regression. The Phase 2.2B suite covers the required coverage, normalization, negative-state, cookie identity/lifecycle, dense mapping, SOC provenance, traceability, legacy, and invariant matrices.

## 12. Cross-format validation

The same canonical state was validated across `summary.json`, `summary.html`, `summary.pdf`, `summary.xlsx`, `findings.csv`, the `summary.csv` alias, `metadata.json`, `report-manifest.json`, and the workspace.

- JSON retains complete structured objects.
- HTML/PDF show coverage notes, source counts, source checks, normalized traceability, and exact mapping citations.
- XLSX adds normalized finding/test fields and control coverage/source columns.
- Findings CSV adds collection state, evidence confidence, collection method, and normalized evidence strength without forcing control-summary rows into the findings export.
- Metadata and the signed report manifest retain canonical invariants, versions, counts, hashes, and MIME information.
- Workspace finding and framework/control presentations expose traceability and provenance breadth.

## 13. PDF and redaction validation

Native Chromium PDF validation passed all three pagination/redaction tests.

- Searchable/selectable text: passed via `pdftotext`
- Page size: A4, 595.92 × 842.88 points
- Controlled smoke PDF: 23 pages, 599,305 bytes
- Dense mapping pagination: multiple compact mappings per page where space permits; large mappings flow naturally
- Sparse internal-page and minimum printable-height regressions: passed
- Long URLs, mapping IDs, hashes, and SOC source links: extracted without hidden Unicode or machine-string corruption
- Visual inspection: cover, finding traceability, and dense control pages were readable with no clipping or overlap
- Restricted-value checks: Authorization values, session/cookie values, passwords, browser storage values, Playwright state, authenticated body content, and raw sensitive ZAP evidence absent from public outputs
- Safe metadata retained: artifact IDs, hashes, URLs, collection methods, and observation times

## 14. Three-tool smoke

Controlled fixture smoke result: all three tools passed.

- Compliance Mapping: 13 findings; JSON, HTML, findings CSV, XLSX, PDF, report manifest, and restricted evidence manifest generated; evidence access remained `local-filesystem-only`
- Lighthouse Reporter: one valid controlled accessibility run; HTML/JSON/CSV/XLSX report set generated; accessibility result 85
- Asset & Page-Weight Analyzer: one controlled page with request metrics; HTML/JSON/CSV/XLSX report set generated

No Lighthouse Reporter or Asset & Page-Weight Analyzer production behavior was changed.

## 15. Performance

Measured on the controlled local fixture:

| Operation | Duration / size |
|---|---:|
| `npm test` | 63.28 s wall; 62.96 s runner |
| Phase 1 validation | 115.03 s |
| Compliance scan | 2,456 ms |
| Compliance report generation | 2,413 ms |
| HTML generation | 41 ms |
| PDF generation | 1,855 ms |
| PDF size | 599,305 bytes |
| Lighthouse smoke | 12,343 ms |
| Asset smoke | 2,220 ms |

Compared with the starting measurements, the final full-suite wall time increased from 61.97 seconds to 63.28 seconds (approximately 2.1%). Phase 1 validation increased from 111.92 seconds to 115.03 seconds (approximately 2.8%). Neither is a meaningful regression for the added deterministic, browser, cross-format, and PDF coverage.

## 16. Remaining P3 findings

The following remain explicitly deferred and were not implemented:

- P3-AUD-015 — full relationship legend
- P3-AUD-016 — broad mapping governance metadata (`reviewedBy`, `lastReviewedAt`, `changeReason`, owner, and related workflow)
- P3-AUD-017 — broad framework naming/applicability-label cleanup
- P3-AUD-018 — redesign of universal `manualReviewRequired`

The product invariants remain unchanged: `assessmentType = compliance_pre_assessment`, `complianceConclusion = not_determined`, `controlSatisfaction = not_determined`, and `coverage = partial`.
