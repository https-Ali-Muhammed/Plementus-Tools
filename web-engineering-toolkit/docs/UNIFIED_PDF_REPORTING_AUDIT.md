# Unified PDF Reporting Audit

## Baseline

- Repository commit: `6c9c7f5779c40aaee902bb50ed4665bebd211d5f`
- Toolkit version: `1.7.1`
- Working tree: pre-existing uncommitted Lighthouse/Asset/Broken Links UX work and user reference images are present and must be preserved.
- `git diff --check`: passed.
- `npm test`: 156 passed, 0 failed, 0 skipped.
- Phase 1: 80 passed, 0 failed, 0 skipped.
- Phase 3: 27 passed, 0 failed, 0 skipped.
- Phase 4: 25 passed, 0 failed, 0 skipped.
- Four-tool smoke: passed.
- Browser/PDF capability: available through the existing Playwright/Chromium discovery path (Brave 151.1.93.134 in this checkout).

## Current format inventory

| Tool | Report manager | HTML | Internal JSON | CSV | XLSX | PDF | Current public actions |
| --- | --- | --- | --- | --- | --- | --- | --- |
| Lighthouse Reporter | `lib/report-manager.js` | `summary.html` | `summary.json`, `metadata.json` | `summary.csv` | `summary.xlsx` | none | View, CSV, Excel |
| Compliance Mapping | `lib/security-report-manager.js` | `summary.html` | `summary.json`, `metadata.json`, `workflow.json`, manifests | `findings.csv`, legacy `summary.csv` | `summary.xlsx` | `summary.pdf` | View, PDF, JSON, Excel, CSV, evidence manifest |
| Asset & Page-Weight Analyzer | `lib/asset-report-manager.js` | `summary.html` | `summary.json`, `metadata.json` | `summary.csv`, `assets.csv` | `summary.xlsx` | none | View, CSV, Excel |
| Broken Links & Resources Checker | `lib/broken-links-report-manager.js` | `summary.html` | `summary.json`, `metadata.json` | `summary.csv` | `summary.xlsx` | none | View, CSV, Excel, JSON |

All managers store canonical artifacts under a unique report directory. Unified Report History discovers those files in `lib/report-manager.js`, constructs direct `/reports/<run>/<file>` links, and the browser consequently receives generic physical names such as `summary.csv` or `summary.pdf`. JSON and metadata are architectural inputs for discovery and history; they are not required as primary user exports.

## XLSX paths and dependency

All four managers dynamically or directly use ExcelJS to build `summary.xlsx`. The UI exposes Excel in current-result actions and Report History. Smoke tests, package tests, cross-format tests, environment capability copy, and several fixtures assert XLSX availability. ExcelJS has no independent production responsibility outside these exports. It can be removed once those paths and assertions are replaced by PDF/CSV contracts.

## Compliance PDF reference

Compliance renders its dedicated report HTML and converts it with `lib/security-pdf.js` through the detected Playwright Chromium executable. Its contract is A4, print backgrounds, stable margins, tagged/outlined output where supported, dedicated header/footer templates, searchable text, and report-specific pagination validation. The HTML template owns the approved cover, typography, palette, cards, mapping/review presentation, and print rules.

The Compliance template is tightly coupled to technical findings, evidence, mappings, controls, applicability, and the human-review overlay. None of those semantic structures are reusable by the other tools.

Safe reuse is limited to presentation infrastructure and family-level conventions: Chromium PDF invocation, A4 options, font stack, approved colors, page margins, cover hierarchy, metadata blocks, cards, tables, machine-text wrapping, page-break rules, and footer/page identity. To avoid visual drift, Compliance should retain its existing template and generator. New reports can reproduce the validated presentation primitives without making Compliance consume a new abstraction.

## Tool-specific PDF plan

- Lighthouse: cover and run identity; canonical selected scores; grouped important findings; bounded page results and selected details; methodology. Raw Lighthouse objects remain internal.
- Asset Analyzer: cover and run identity; page-weight/request summary; resource breakdown; page results; grouped optimization findings; bounded largest-assets table; methodology. Complete inventory remains in CSV.
- Broken Links: cover and scope identity; remediation-first summary; attention/review/redirect detail; bounded healthy inventory summary; methodology. The redesigned standalone HTML remains unchanged and complete CSV remains authoritative for inventory.

Each PDF will be a dedicated static document, not a print of the toolkit application and not a fake Compliance object.

## Download and filename audit

Current links point directly at canonical storage names. Compliance sometimes supplies a PDF `download` attribute, but there is no single cross-tool filename authority and historical downloads are not consistently guaranteed to retain the report timestamp.

The selected correction is to keep canonical storage filenames for compatibility and add a bounded download endpoint accepting only known report artifacts. A single filename helper will derive a safe name from report type, report-time project name, and stored `generatedAt`. The endpoint will resolve only an existing report directory and an allow-listed PDF/CSV artifact, set its MIME type and `Content-Disposition`, and never expose arbitrary filesystem paths.

Canonical format:

`<report-name>__<project-name>__<YYYY-MM-DD_HH-mm-ssZ>.<ext>`

PDF and CSV from one report will share the same stored generation timestamp. Missing or unsafe project names receive a bounded fallback.

## Selected implementation gaps

1. Add presentational PDF infrastructure for the three non-Compliance tools.
2. Generate a native searchable A4 PDF in each corresponding manager.
3. Remove all XLSX generation and public Excel actions.
4. Retain internal JSON and useful CSV artifacts.
5. Guarantee descriptive historical and current-run download names through one helper and a safe endpoint.
6. Standardize primary actions to View, PDF, CSV.
7. Update smoke, report/history tests, package expectations, README, and active user-facing copy.
8. Preserve the Compliance PDF visual baseline and all tool analysis semantics.

## Security and validation plan

- Reuse public/redacted report models only; never introduce headers, bodies, credentials, sessions, or restricted evidence into PDF templates.
- HTML-escape every report value and wrap long machine strings/URLs.
- Keep CSV formula-injection protections.
- Test filename traversal, slashes, Unicode, length, fallbacks, historical timestamps, and real `Content-Disposition` behavior.
- Validate `%PDF`, A4 geometry, text extraction, core sections, long text, pagination, and secret absence.
- Compare a controlled Compliance PDF before/after for page count, extracted text, size, and raster output.
- Require PDF plus CSV for every tool in `smoke:all`; `.xlsx` becomes a failure condition.

## Deliberately unchanged

- Compliance report semantics, layout, PDF template, and evidence/review boundaries.
- Lighthouse scores/audits and analysis behavior.
- Asset measurements, thresholds, and findings.
- Broken Links classification, checking, redaction, and redesigned standalone HTML UX.
- Report-directory identity and internal JSON filenames.
- Phase 5 and Phase 6 roadmap state.
