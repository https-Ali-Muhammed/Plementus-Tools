# PDF Visual and Report CTA Implementation

Date: 2026-08-31
Repository baseline: `6c9c7f5` (`develop`) with pre-existing uncommitted work preserved. No commit was created.

## 1. Baseline

The implementation began from the live application, supplied report artifacts, current report managers, and current Compliance renderer. The pre-change gates passed: `npm test` 161/161, Phase 1 80/80, Phase 3 27/27, Phase 4 25/25, all four real-browser smoke checks, and `git diff --check`.

## 2. PDF comparison

The controlled inputs were the generated 21-page Compliance, 4-page Lighthouse, 5-page Asset, and 3-page Broken Links PDFs dated 2026-08-31. Compliance was a compact white technical document. The other three used a forced dark poster cover, oversized dashboard cards, dark table bands, and a separate spacing/typography system. Asset additionally allowed 1,260-character resource URLs to dominate table pages.

## 3. Shared report-family design

`lib/pdf-report-renderer.js` now owns the non-Compliance print family: white A4 canvas, compact first-page hierarchy, two-column metadata, factual chips, numbered sections, light bordered cards, compact metrics, pale integrated tables, restrained purple, print-aware breaks, DejaVu/Noto/Segoe font fallbacks, and safe machine text. `lib/tool-pdf-reports.js` supplies tool-specific content to that presentation layer.

## 4. Compliance preservation

Compliance remains on `lib/security-report-html.js` and `lib/security-pdf.js`; neither file was changed. Hash guards pin them to:

- `1c382b1f2552ff2a2bd13a44a4aca3ecdfb69230d638f75a0e1f51d120e76fcd`
- `61f71d575c5b95462fadc6f40541d7cb21e863a8f54ee2161116711d41a3335d`

The controlled Compliance PDF remained 21 pages, A4, tagged/searchable, and raster-identical by intentional design scope. Same-input rasters for pages 1, 2, 8, 13, and 21 were byte-identical to the supplied golden PDF. Compliance semantics and conservative assessment invariants were not altered.

## 5. Lighthouse redesign

The dark forced cover was replaced by `WEB ENGINEERING TOOLKIT · LIGHTHOUSE REPORTER`, `Lighthouse Technical Report`, a factual lead, compact project/run metadata, and run-state chips. Numbered sections are Executive Summary, Lighthouse Score Summary, Important Findings, Page Results, and Methodology / Limitations. ISSUE/MANUAL and Lighthouse category meanings are preserved; no severity model was added.

## 6. Asset redesign

The report now begins with `WEB ENGINEERING TOOLKIT · ASSET & PAGE-WEIGHT ANALYZER` and `Asset & Page-Weight Analysis`. It uses compact metadata and numbered Executive Summary, Resource Breakdown, Page Results, Optimization Findings, Largest Transferred Assets, and Methodology / Limitations sections. Byte calculations and findings are unchanged.

## 7. Broken Links redesign

The report now begins with `WEB ENGINEERING TOOLKIT · BROKEN LINKS & RESOURCES CHECKER` and `Broken Links & Resources Report`. Its numbered sections preserve canonical counts, attention, review, redirect, healthy-inventory, and methodology distinctions. Needs attention, Review, and Healthy remain factual states; no health percentage or compliance score was introduced.

## 8. Typography

The non-Compliance renderer reproduces the golden report scale: 8pt uppercase eyebrow, 27pt title, 9.5pt lead/body, 15pt section headings, 9pt card headings, 7-8.4pt metadata/table text, and DejaVu Sans Mono for machine values. The palette and type tokens are exported as `REPORT_FAMILY_TOKENS` and asserted by tests.

## 9. Card and table system

Cards use white backgrounds, 1px `#d7dce5` borders, 5px radii, 3mm padding/gaps, dark text, and muted labels. Tables use fixed layout, repeating light headers, compact cells, thin separators, and safe wrapping. Dark navy dashboard headers and oversized rounded widgets were removed from all three PDFs.

## 10. Headers and footers

Every non-Compliance page uses a two-column running header: toolkit/tool identity on the left and project/target context on the right. Both columns shrink and ellipsize independently to prevent collision. Footers use the report title and `Page X of Y`. Compliance retains its existing equivalent header/footer unchanged.

## 11. URL handling

Asset PDF cells use a readable projection containing origin, bounded path identity, and query-key summary. When this differs from the source, the complete safe URL is retained immediately below in 2.2pt searchable machine text. A controlled 1,260-character URL remained fully extractable—including its final 80 characters—without horizontally clipping or occupying half a page. CSV/XLSX canonical values remain exhaustive.

## 12. Pagination

The shared renderer uses natural flow, heading keep-with-next, avoid-break cards, repeating table headers, and no forced cover page. Controlled output changed from 5 to 4 pages for Asset and from 3 to 2 for Broken Links; Lighthouse used 5 dense pages. Large tables can continue naturally.

## 13. CTA component

One `reportActionControls()` renderer in `public/app.js` serves current Lighthouse, Compliance, Asset, and Broken Links results plus Report History. One delegated controller owns all menu behavior, and `public/styles/shared.css` owns the compact pill hierarchy and responsive rules. Repeated controls use classes/data attributes rather than IDs.

## 14. Open Report

Open Report is the outlined purple secondary action. It uses each report's existing safe HTML URL and consistent vocabulary in current results and history.

## 15. Download PDF

Download PDF is the filled purple-to-blue primary action. It keeps the existing allow-listed endpoint and professional filename convention based on report identity, project, and original generation timestamp.

## 16. More Exports menu

More Exports is a subdued tertiary pill opening a compact menu. Opening it does not generate an export. The menu closes on outside click or Escape, restores trigger focus after Escape, and supports Arrow Up/Down, Home, and End navigation. Compliance's Evidence Manifest remains an additional lower-priority item.

## 17. CSV

Download CSV moved under More Exports for all four tools. Existing CSV generation and formula-neutralization behavior are retained, and the safe download endpoint remains authoritative.

## 18. Excel decision

The audit found that the active unified-reporting migration had intentionally removed XLSX. The current requirement explicitly reauthorizes it. ExcelJS 4.4.0 was restored deliberately, and `lib/xlsx-reports.js` now provides one safe workbook layer for all four report families. `.xlsx` is included in manifests/history, MIME and download allow-lists, smoke expectations, and professional filename resolution. Obsolete per-tool UI coupling was not restored.

## 19. Accessibility

PDFs remain native text PDFs with A4 geometry, Unicode, Arabic support, URL extraction, page numbers, document metadata, and tagged output. CTAs expose an action-group label, menu semantics, `aria-expanded`, keyboard navigation, focus-visible treatment, Escape focus restoration, disabled/loading styling, and click-safe menu activation.

## 20. Responsive validation

Real-browser CTA tests run at 1440, 1024, 768, and 390 CSS pixels. Controls remain a compact row where possible and wrap at narrower widths. Tests assert no document or action-group horizontal overflow, no duplicate IDs, correct URLs, and no console errors.

## 21. PDF visual validation

Controlled PDFs were rasterized and visually inspected at the requested representative pages: Compliance 1, 2, findings, dense mapping, and final; Lighthouse cover/summary, dense findings, results, and final; Asset cover/summary, largest-assets and 1,260-character URL pages, and final; Broken Links cover/summary, review/redirect content, and final. The white canvas, hierarchy, palette, cards, tables, running furniture, and density now read as one toolkit report family while content stays tool-specific.

## 22. Tests

`test/pdf-visual-unification.test.js` pins the Compliance renderer hashes and asserts the shared white report tokens, removal of dark covers, and domain-specific sections. `test/report-actions.test.js` exercises all four tools and history across breakpoints. Unified-reporting, report-manager, scanner, smoke, and package expectations now cover XLSX, metadata, machine text, filenames, and safe URL projection. The post-change full suite passes 166/166 with no failures or skips.

## 23. Smoke

The final `npm run smoke:all` gate passed all four real-browser workflows with Brave 151.1.93.134. Compliance, Lighthouse, Asset, and Broken Links each produced HTML, PDF, CSV, and XLSX artifacts; Compliance also retained JSON and manifest artifacts.

## 24. Packaging

The source package contract includes the shared PDF renderer, tool projections, XLSX writer, audit/implementation records, and new tests. `npm run package` produced a deterministic 109-file source ZIP, `npm run test:package` passed 1/1, and direct inventory inspection confirmed the XLSX layer, both records, and both new tests. The final handoff records the ZIP SHA-256 separately so the packaged implementation document does not create a self-referential hash.

## 25. Remaining limitations

PDF pagination remains content- and Chromium-dependent, so future unusually large translations or result shapes can alter page counts. The complete Asset URL detail is intentionally extremely small because it is a machine-readable companion to the bounded human display; exhaustive spreadsheet exports remain the primary machine-analysis format. No user-supplied screenshot file was present in the workspace, so the explicit screenshot specification and live Compliance controls were the CTA visual authority.

## 26. Ready-to-commit assessment

The implementation gates passed: full tests 166/166, Phase 1 80/80, Phase 3 27/27, Phase 4 25/25, four-tool smoke, source packaging, extracted-package testing, Compliance source hashes, same-input raster comparison, and ZIP inventory inspection. Final `git diff --check` and worktree review are required immediately before handoff. The worktree remains intentionally uncommitted.
