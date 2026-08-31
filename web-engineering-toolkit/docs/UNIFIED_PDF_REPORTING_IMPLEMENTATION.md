# Unified PDF Reporting Implementation

Date: 2026-08-30
Repository baseline: `6c9c7f5779c40aaee902bb50ed4665bebd211d5f`
Toolkit version: `1.7.1`

## 1. Baseline

The work continued from the validated four-tool checkout and preserved the existing Lighthouse/Asset/Broken Links UX changes. The pre-change reporting inventory and constraints are recorded in `docs/UNIFIED_PDF_REPORTING_AUDIT.md`. Compliance Mapping already had the approved native A4 PDF and remained the visual reference rather than being converted to a new report model.

## 2. Reporting audit result

The selected public export contract is now **View report + PDF + CSV** for Lighthouse Reporter, Compliance Mapping, Asset & Page-Weight Analyzer, and Broken Links & Resources Checker. Internal `summary.json`, `metadata.json`, Compliance workflow/manifests, and other machine artifacts remain where the application needs them. XLSX is no longer generated or advertised by current report managers.

## 3. Shared PDF architecture

`lib/pdf-report-renderer.js` provides the native Playwright/Chromium PDF infrastructure for the three non-Compliance tools. It owns A4 generation, print backgrounds, the report-family cover, shared typography, approved visual tokens, safe long-text wrapping, PDF header/footer identity, tagging/outline options, and browser discovery. `lib/tool-pdf-reports.js` owns the tool-specific static report structures.

This layer is presentational only. It does not import Compliance findings, mappings, evidence, applicability, controls, or review semantics.

## 4. Compliance PDF preservation

Compliance continues to use `lib/security-report-html.js` plus its established `lib/security-pdf.js` path. The approved report CSS was not restyled. The post-change report CSS SHA-256 remains:

`18d93a1568bb88bb08182512daa7e03781cf65352ff7d41f7f78a0295a36a28e`

which matches the recorded approved baseline hash. The reporting migration changes export routing, not Compliance visual semantics.

## 5. Lighthouse PDF

Lighthouse now writes `summary.pdf` beside its standalone HTML, internal JSON/metadata, and `summary.csv`. The PDF uses the shared report family while remaining Lighthouse-specific: report identity, selected categories/devices, executive run facts, category score summary, grouped important findings, bounded page results, and methodology/limitations. Raw Lighthouse objects are not dumped into the PDF.

## 6. Asset & Page-Weight PDF

Asset Analyzer now writes `summary.pdf` with a tool-specific report containing scan identity, page/transfer/request summary, resource breakdown, page results, optimization findings, largest transferred assets, and methodology/limitations. The complete structured page export remains CSV; the existing supplemental `assets.csv` remains an internal/supplemental machine artifact and is not presented as the primary report export.

## 7. Broken Links PDF

Broken Links now writes a remediation-first `summary.pdf`. It preserves the canonical outcome distinctions and prioritizes attention, review, and redirects before a bounded healthy-inventory summary. The recently redesigned standalone HTML report remains independent and unchanged in its interactive pagination/search behavior. Complete unique-target inventory remains in CSV/JSON rather than creating an unnecessarily large PDF.

## 8. CSV exports

CSV remains the primary structured user export for every tool. Compliance downloads `findings.csv` through the canonical CSV route while retaining its `summary.csv` compatibility alias internally. Lighthouse, Asset, and Broken Links download `summary.csv`. Existing CSV injection/escaping protections remain in place.

## 9. XLSX removal

Current report managers no longer create `summary.xlsx`; current-run actions and unified Report History no longer expose Excel. Smoke validation explicitly fails if a newly generated report contains `summary.xlsx`. Historical documentation and tests may still mention `.xlsx` only when describing the old format or asserting that the deprecated artifact is absent.

## 10. ExcelJS dependency removal

`exceljs` was removed from `package.json` and `package-lock.json`. There is no active runtime/test import of ExcelJS. The final checkout was pruned with `npm prune --offline`; `npm ls --depth=0` now contains only `lighthouse@12.8.2` and `playwright-core@1.54.2` with no extraneous ExcelJS tree.

## 11. Internal JSON decision

Internal JSON remains canonical for report history, metadata, workflow reconstruction, machine contracts, and regression checks. Generic internal filenames such as `summary.json`, `metadata.json`, and internal `summary.pdf`/`summary.csv` storage names are intentionally retained so report discovery remains stable. The descriptive-name requirement is enforced at download time.

## 12. Filename convention

`lib/report-downloads.js` is the single filename authority. User downloads use:

`<report-name>__<project-name>__<YYYY-MM-DD_HH-mm-ssZ>.<ext>`

Examples:

- `lighthouse-report__plementus__2026-08-30_13-55-42Z.pdf`
- `asset-page-weight-report__plementus__2026-08-30_13-57-10Z.csv`
- `broken-links-resources-report__plementus__2026-08-30_14-02-33Z.pdf`
- `compliance-mapping-report__plementus__2026-08-30_14-06-05Z.csv`

PDF and CSV from one report use the same stored `generatedAt`; historical downloads do not use the current download time.

## 13. Filename sanitization

Project names pass through the bounded toolkit slugifier, stripping path separators, punctuation, URL syntax, and traversal-like values. Project segments are bounded to 80 characters and fall back to `project` when no safe ASCII slug remains. Report names and extensions are allow-listed. Tests cover spaces, slashes, quotes, backslashes, Arabic/Unicode fallback, excessive length, missing/unsafe names, and unsupported XLSX requests.

## 14. Download endpoint

`GET /api/reports/:reportName/download/(pdf|csv)` resolves only a known report directory and one of two allow-listed public artifacts. It validates the report-name basename, confines resolution to `REPORTS_DIR`, loads stored report metadata, chooses `findings.csv` for Compliance CSV, sends the correct MIME type, and sets canonical `Content-Disposition`. `TOOLKIT_REPORTS_DIR` can point the server at an isolated reports root for controlled integration tests.

The standalone Lighthouse and Compliance report download links now also use the same bounded endpoint rather than directly downloading generic `summary.csv`/`summary.pdf` names.

## 15. Report History

Unified Report History discovers PDF/CSV availability from canonical stored artifacts and exposes **View**, **PDF**, **CSV**, and **Delete** for current report types. Excel is absent. Internal JSON may remain discoverable by application code but is not presented as a primary report export.

## 16. Current-result actions

Completed Lighthouse, Compliance, Asset, and Broken Links workspaces expose the same primary report model: open/view the standalone report plus PDF and CSV downloads. Compliance retains the Evidence Manifest as a separate evidence action; it is not treated as an alternate report format.

## 17. PDF metadata and report family

The three new PDFs are generated as tagged A4 documents with selectable/searchable text and consistent Web Engineering Toolkit page identity. They share the report-family cover, font stack, palette, metadata-card vocabulary, section hierarchy, header/footer treatment, and page numbering while using truthful tool-specific terminology.

## 18. Redaction and security

The new templates consume public/redacted report models only. Broken Links preserves sensitive-query redaction and never adds request/response bodies, credentials, cookies, headers, or session state. Lighthouse and Asset reports do not add browser-profile paths or session material. HTML escaping and machine-text cleanup protect report rendering. The download endpoint is not an arbitrary filesystem endpoint.

## 19. Pagination and long text

The common report CSS uses A4 print rules, repeating table headers, bounded report detail, `overflow-wrap:anywhere`/machine-string wrapping, and explicit cover-to-content pagination. Large inventories are summarized rather than blindly printed. Direct Chromium validation with long token-redacted URLs produced readable A4 pages without horizontal clipping.

## 20. Visual PDF validation

Direct Chromium generation in the final checkout produced:

- Lighthouse: 2 pages, tagged A4, 225,642 bytes; sample PDF generation 751 ms.
- Asset Analyzer: 3 pages, tagged A4, 282,839 bytes; sample PDF generation 456 ms.
- Broken Links: 3 pages, tagged A4, 235,787 bytes; sample PDF generation 443 ms.

`pdfinfo` identified every sample as `595.92 x 842.88 pts (A4)`. `pdftotext` extracted report titles, timestamps, long URLs, and `[REDACTED]` text successfully. Cover/content raster inspection showed the common report family, safe long-URL wrapping, no horizontal clipping, and natural final methodology sections. The sandbox blocks some browser `file://` navigation used by the legacy capability probe; direct Playwright `setContent()` PDF generation remains available.

## 21. Tests

Final `npm test`: **161 tests, 138 passed, 0 failed, 23 environment-skipped**. The skips are browser-navigation/PDF-capability cases blocked by the sandbox administrator rather than assertion failures. The suite includes dedicated unified-reporting coverage for filename generation, allow-listed resolution, real HTTP `Content-Disposition` behavior for all four report types, report-family semantics, A4/searchable PDF checks when the environment permits the browser capability probe, and explicit absence of generated XLSX artifacts.

## 22. Phase validators

Phase 1, Phase 3, and Phase 4 validators were rerun after reporting migration. Phase 1 passed **70/70 deterministic assertions** with 2 environment-skipped browser/PDF categories; Phase 3 passed **20/20 deterministic assertions** with 2 environment-skipped browser/PDF categories; Phase 4 passed **19/19 deterministic assertions** with 2 environment-skipped browser/PDF categories. All three validators returned `status: passed`.

## 23. Four-tool smoke

`npm run smoke:all` now expects PDF + CSV for Compliance, Lighthouse, Asset, and Broken Links and rejects any newly generated `summary.xlsx`. In the final sandbox run the command exited successfully and all four browser-dependent tool runs were explicitly skipped because localhost/browser navigation is administratively restricted. The prior live Codex run had exercised the four-tool path before the final documentation/download-link cleanup; no analysis-engine semantics changed afterward.

## 24. Performance

Tool-specific sample native-PDF generation in the final checkout measured 751 ms (Lighthouse), 456 ms (Asset), and 443 ms (Broken Links) using `/usr/bin/chromium` and deterministic representative content. Full smoke timings are environment-dependent and are reported by the smoke command when browser navigation is available.

## 25. Packaging

Deterministic source packaging requires the shared PDF renderer, tool-specific templates, download helper, audit, this implementation record, and unified-reporting tests. Runtime reports, browser profiles, sessions, credentials, evidence state, `node_modules`, and generated PDFs remain excluded from the source archive. Two consecutive final builds produced **102 source entries** with identical output; `npm run test:package` passed 1/1. The final byte size and SHA-256 are recorded in the external completion handoff so the package does not attempt to contain its own digest.

## 26. Schema/version decisions

Toolkit remains `1.7.1`. Existing Compliance report/workflow/mapping/checker schemas are unchanged because the canonical assessment models were not structurally altered. The change adds/removes presentation artifacts and download routing rather than changing scanner semantics.

## 27. Remaining limitations

- PDF content is intentionally bounded; CSV/JSON remain authoritative for exhaustive structured inventories.
- Historical report directories created before this migration may still contain old XLSX files, but new report managers do not generate or advertise them.
- The legacy browser capability probe may classify PDF/browser visual tests as environment-skipped where `file://` navigation is administratively blocked, even though direct Chromium `setContent()` PDF generation works.
- Supplemental Asset `assets.csv` remains an internal/supplemental artifact; the primary public Asset CSV export is `summary.csv`.

## 28. Ready-to-commit assessment

Ready to commit: **yes, subject to the repository owner performing the normal workstation smoke if they require a non-skipped browser run**. The full deterministic suite is green, Phase 1/3/4 validators are green, the four-tool smoke is correctly environment-skipped rather than failed in this sandbox, direct Chromium PDF generation/visual inspection is green, real HTTP download naming is verified for all four report types, active production/user-facing Excel references are absent, the dependency tree is clean, package regression is green, two source-package builds are deterministic, and modified reporting files contain no accidental trailing whitespace. The provided ZIP did not include `.git`, so `git diff --check` itself cannot be executed here; equivalent source whitespace/syntax checks were performed without creating Git metadata.
