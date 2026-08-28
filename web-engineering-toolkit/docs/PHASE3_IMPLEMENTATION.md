# Phase 3 — Deeper Evidence Collection Implementation

Date completed: 2026-08-28

## 1. Baseline

Phase 3 continued from the audited `ca437992726776debdfb8989841f4fb833cb32ae` (`develop`) baseline and the existing uncommitted implementation. The Toolkit remains `1.7.1`. The mapping catalog remains `2026.08.26.3`. The report schema intentionally changed from `2.4.0` to `2.5.0` because the canonical report gained collection-level coverage and safe runtime collection metadata.

The conservative invariants remain:

- `assessmentType = compliance_pre_assessment`
- `complianceConclusion = not_determined`
- `controlSatisfaction = not_determined`
- `coverage = partial`

## 2. Audit result and capabilities already sufficient

The completed audit is recorded in `docs/PHASE3_EVIDENCE_COLLECTION_AUDIT.md`. Existing HTTP, TLS, DNS CAA, security-header, cookie identity, payment architecture, policy-quality, locale, mapping, applicability, evidence-vault, workflow, and passive-ZAP behavior remained the baseline. Phase 3 did not redesign those capabilities.

The audit selected exactly six demonstrated gaps, P3-COL-001 through P3-COL-006. No additional evidence-collection scope was added.

## 3. P3-COL-001 — URL identity and bounded discovery

`lib/security-collection-model.js` provides shared canonical observed-URL identity. It removes fragments, default ports, trailing-slash noise, and known tracking parameters; it preserves and deterministically sorts meaningful query parameters. Query-sensitive routes such as `?id=1` and `?id=2` remain distinct.

`lib/website-crawler.js` adds bounded `robots.txt`, `sitemap.xml`, and sitemap-index discovery with document, URL, body, request-time, and selected-page limits. Sitemap data is provenance/discovery input only. Robots directives do not become findings or compliance conclusions.

## 4. P3-COL-002 — Browser network/API provenance

Browser network records now have an explicit record cap and truncation state. Safe records retain source page URL, destination host/origin, observation time, initiator metadata where available, and factual `same_origin`, `related_host`, or `external_host` classification. API/XHR/fetch summaries retain bounded method, status, source, destination, and category metadata.

No request body, response body, Authorization header, cookie value, storage value, or session token is collected for public reporting. Public projection defensively removes header/body fields if supplied by older or synthetic input. The classification is technical host relation only; it is not tracker, purpose, legal, or security-posture classification.

## 5. P3-COL-003 — `collectionCoverage`

The schema now carries non-scored collector states for HTTP, TLS, DNS, crawl, browser, authenticated, consent, and passive ZAP. Each collector has an explicit state and limitations. There is no score or percentage, and collection completion does not change control satisfaction or the compliance conclusion.

Collection coverage is projected to `summary.json`, `metadata.json`, `summary.html`, `summary.pdf`, `summary.xlsx`, the report manifest set, and the workspace. It is not forced into `findings.csv`.

## 6. P3-COL-004 — Consent action state and safe deltas

Consent scenarios now distinguish `completed`, `not_applicable`, and `requires_manual_confirmation`. Ambiguous or unmatched controls remain manual-confirmation cases. Scenario comparison exposes only added/removed cookie names, localStorage keys, sessionStorage keys, and network hosts relative to fresh load.

No cookie/storage values, request/response bodies, or consent-validity conclusion is exposed. The evidence remains bounded technical observation.

## 7. P3-COL-005 — Authenticated/form budgets

Authenticated collection has deterministic page, depth, queue, and runtime limits plus explicit completed/partial metadata. It uses the shared URL canonicalizer to limit loops and tracking-query expansion. Forms expose action, method, encoding, field count, input types, autocomplete tokens, and password/file/payment-relevant flags without field values.

Credentials and browser session state remain restricted. No arbitrary form is submitted, no file is uploaded, no payment transaction is executed, and no automatic cross-role RBAC verdict is produced.

## 8. P3-COL-006 — Evidence deduplication

The duplicate browser-network artifact registration was removed. The evidence archive retains one canonical `browser-network` artifact/reference behavior, with existing content-based binary deduplication semantics unchanged.

## 9. Intentionally deferred capabilities

Phase 3 did not implement unrestricted spidering; arbitrary SPA/menu/business-action clicking; credential discovery, guessing, or account enumeration; automatic multi-role authorization testing; arbitrary form submission or upload; checkout or real payment transactions; request/response body archival; general PDF parsing or OCR; cookie-purpose or legal tracker classification; consent-validity conclusions; privacy-notice, contract, BAA, legal-applicability, violation, certification, or compliance conclusions; active ZAP/API/fuzzing/forced-browse modes; or mapping, relationship, prerequisite, applicability, cookie-identity, governance, or control-aggregation redesign.

## 10. Report and schema changes

The report schema is `2.5.0`. HTML/PDF Structured Evidence conditionally includes a compact Runtime network/API evidence card only when runtime network evidence exists. It shows bounded API observation count, collection state, retained-record count, destination hosts, and the passive-metadata boundary. Legacy reports with empty runtime arrays do not gain the card.

Toolkit `1.7.1`, mapping catalog `2026.08.26.3`, finding/control schema `1.4.0`, evidence-vault schema `4`, evidence-manifest schema `1.2.0`, and passive-ZAP finding schema `1.1.0` remain unchanged. No structural change justified another bump.

## 11. Legacy compatibility

Existing `/api/security/*`, report identity, review workflow, public/restricted evidence boundary, Lighthouse Reporter, and Asset & Page-Weight Analyzer behavior remain intact. Legacy summaries receive conservative read-time defaults; stored historical evidence is not rewritten. Reports without `collectionCoverage` or runtime network evidence avoid unnecessary new layout content.

## 12. Tests

Phase 3 includes deterministic URL/discovery, network classification, coverage, consent delta, form-safety, evidence-deduplication, conditional-report, browser-network, consent-action, authenticated-budget, cross-format, workspace, PDF, provenance, and redaction coverage.

The continuation baseline rerun passed 124/124 tests in 75.23 seconds before the final integration assertions were added. The final post-integration suite passed 125/125 tests with 0 failures and 0 skips in 60.77 seconds.

## 13. `validate:phase3`

`npm run validate:phase3` composes existing tests instead of duplicating the Phase 1 validator. It emits `PHASE3_VALIDATION_JSON` and classifies browser/PDF environment restrictions explicitly.

Final run: 27 passed, 0 failed, 0 skipped in 31.07 seconds wall time:

- deterministic Phase 3: 8/8, 444 ms
- cross-format/workspace/redaction/provenance: 12/12, 977 ms
- Phase 3 browser: 4/4, 19.613 seconds
- PDF rendering/redaction: 3/3, 8.206 seconds

Brave `151.1.93.134`, browser launch, navigation, PDF source navigation, PDF rendering, and `pdftotext` were available.

## 14. Phase 1 regression result

The first post-integration Phase 1 run passed every application, browser, PDF, cross-format, and three-tool category but intentionally failed its strengthened package-content assertion because this implementation document had not yet been created. After the document was added, the clean Phase 1 rerun passed 80/80 tests with 0 failures and 0 skips in 95.41 seconds. All eight categories passed: core deterministic, security core, cross-format, packaging, browser integration, existing browser regressions, PDF rendering, and three-tool smoke.

## 15. PDF and redaction

Native Chromium PDF tests cover A4 output, selectable/searchable text, mapping packing and natural large-card splitting, non-sparse internal pages, long machine-string extraction, URL/ID wrapping, Unicode safety, and restricted-data exclusion. The Runtime network/API card is extracted with its safe host and passive-metadata boundary. Fake Authorization, cookie, storage, authenticated-body, request-body, response-body, and session-state secrets are absent from public JSON, HTML, PDF, XLSX, CSV, and metadata projections.

The retained controlled PDF was independently checked with `pdfinfo`, `pdftotext`, rasterization, and visual inspection. It was a tagged, unencrypted, searchable 26-page A4 PDF (`595.92 x 842.88 pt`). Cover, scope/coverage, Runtime Network/API, dense finding, and final review/limitations pages showed no clipping, horizontal overflow, broken card boundaries, or sparse internal-page regression. Page count itself was not treated as a target.

## 16. Three-tool smoke

The controlled smoke passed all three tools with Brave browser/PDF capabilities available:

- Compliance Mapping: passed; 13 findings; HTML, JSON, findings CSV, XLSX, PDF, manifest, and restricted evidence access present; assessment 2.165 seconds; report 2.139 seconds; HTML 59 ms; PDF 1.629 seconds; PDF 677,056 bytes.
- Lighthouse Reporter: passed; one valid accessibility audit; accessibility fixture score 85; 12.082 seconds.
- Asset & Page-Weight Analyzer: passed; one page with metrics, HTML, and XLSX; 2.198 seconds.
- Total smoke wall time: 20.89 seconds.

## 17. Performance

Measured continuation values:

- targeted Phase 3/browser/PDF/scanner regression: 41/41 in 39.18 seconds
- pre-final full `npm test`: 124/124 in 75.23 seconds
- final full `npm test`: 125/125 in 60.77 seconds
- `validate:phase3`: 27/27 in 31.07 seconds
- final `validate:phase1`: 80/80 in 95.41 seconds
- controlled Compliance assessment: 2.165 seconds
- controlled report generation: 2.139 seconds
- controlled HTML generation: 59 ms
- controlled PDF generation: 1.629 seconds
- controlled PDF size: 677,056 bytes
- Lighthouse smoke: 12.082 seconds
- Asset smoke: 2.198 seconds

The scanner does not currently expose separate crawl-only and browser-runtime timing fields, so no standalone crawl/browser value is invented. The Phase 3 browser validation category completed four browser tests in 19.613 seconds.

## 18. Remaining limitations

Collection remains bounded to configured routes, budgets, browser contexts, credentials, locales, and passive integrations. Sitemap discovery may omit content outside limits. Runtime metadata cannot establish endpoint security, tracker purpose, consent validity, authorization correctness, organizational control operation, legal scope, or compliance. Authenticated role observations remain independent candidates for qualified review. Passive ZAP remains passive-only.

## 19. Phase 3 completion assessment

All six audit-selected implementation gaps are present. The final post-document full suite, Phase 1 gate, Phase 3 gate, browser/PDF/redaction validation, cross-format/workspace checks, three-tool smoke, deterministic source-package test, package content inspection, and `git diff --check` are green. The archive includes this audit, this implementation record, the Phase 3 model and tests, and the validator; it excludes runtime reports, evidence, browser profiles, and build output. The final ZIP SHA-256 is recorded in the handoff because embedding the digest inside the ZIP would change the ZIP digest. Phase 3 is complete within the audited bounded evidence-collection scope.
