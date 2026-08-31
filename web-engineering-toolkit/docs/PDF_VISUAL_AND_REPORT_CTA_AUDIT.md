# PDF Visual and Report CTA Audit

Date: 2026-08-31
Repository baseline: `6c9c7f5` (`develop`) with substantial pre-existing uncommitted reporting and UI work. This audit does not attribute those changes and treats them as user-owned.

## 1. Compliance PDF golden characteristics

The live generated Compliance report `plementus_security-compliance_20260831_120352/summary.pdf` is the visual source of truth. It is a 21-page, tagged, searchable A4 PDF. Its first two pages establish the approved print vocabulary:

- white document canvas with compact repeating header and footer;
- DejaVu Sans/DejaVu Sans Mono print stack, dark `#172033`/`#18223a` text, muted `#5f6879`, toolkit purple `#5747c7`, pale borders `#d7dce5`, and pale warning `#fff8e8`/`#e4c98f`;
- 27pt cover title, compact uppercase eyebrow, restrained lead text, and a dense two-column metadata list;
- small bordered factual chips and a pale warning/information callout;
- 15pt numbered section headings, compact metric cards, 5px print radii, 3mm gaps, thin borders, and integrated light tables;
- print-aware `break-after`, `break-inside`, and repeat-table-header behavior; machine text uses explicit LTR isolation and safe wrapping.

The controlled baseline hashes are:

- `lib/security-report-html.js`: `1c382b1f2552ff2a2bd13a44a4aca3ecdfb69230d638f75a0e1f51d120e76fcd`
- `lib/security-pdf.js`: `61f71d575c5b95462fadc6f40541d7cb21e863a8f54ee2161116711d41a3335d`

No Compliance PDF CSS, print typography, cover, pagination, header/footer, or semantics should change in this task.

## 2. Lighthouse PDF differences

The live Lighthouse PDF is A4, tagged, and searchable, but page 1 is a dark navy poster-style cover with a 245mm minimum height, large unused space, rounded dark metadata panels, and a forced page break. Later pages use oversized pale dashboard cards, unnumbered sections, and dark navy table headers. The header omits the target URL, the footer uses the tool name rather than the requested report title, the cover omits toolkit version/pages/runs, and the font resolves to Liberation Sans rather than the golden DejaVu stack.

## 3. Asset PDF differences

The live Asset PDF has the same dark poster cover and dashboard vocabulary. Page 2 uses heavy rounded cards and a dominant dark table header. Pages 3-4 demonstrate the critical long-URL defect: complete Facebook signal/config query strings occupy most of two pages. The strings remain searchable but the display projection is not bounded and wastes document area. Section numbering, toolkit version metadata, golden typography, and target-aware header context are absent.

## 4. Broken Links PDF differences

The live Broken Links PDF also uses the forced dark cover and dashboard cards. Its factual `Needs attention`, `Review`, and `Healthy` distinctions are correct and must be preserved, but the presentation is not in the Compliance report family. Tables use dark navy bands and compressed headings; the header omits the base URL; sections are unnumbered; and the first page wastes most of its printable area.

## 5. Common visual system selected

The three non-Compliance PDFs will reproduce the existing Compliance print system, not the Compliance subject matter: white A4 canvas, DejaVu/Noto/Segoe fallback stack, golden print palette, compact cover hierarchy, two-column metadata, optional factual chips/notices, numbered sections, 3mm grids, 5px cards, subtle table headers, safe machine text, natural pagination, and the same header/footer geometry. Tool content and calculations remain owned by their existing canonical models.

## 6. Long URL issues

CSV remains exhaustive. PDF tables will present a bounded readable URL identity (origin, path, and a compact query-key summary) plus a smaller searchable machine-detail row containing the full safe URL. The detail row will use explicit breaking opportunities and bounded print typography. No canonical source URL or CSV value is rewritten.

## 7. Current CTA implementation per tool

- Lighthouse: three independent anchors in `renderFinalSummary`: `View full summary`, `Download PDF`, `Download CSV`.
- Compliance: closest to the target, with `Open Report`, primary `Download PDF`, and a native `<details>` `More Exports`; the menu currently contains Findings CSV and Evidence Manifest.
- Asset: three independent anchors: `Open report`, `PDF`, `CSV`.
- Broken Links: three independent anchors: `Open report`, `PDF`, `CSV`.
- Report History: separate flat links using different vocabulary (`View report`, `PDF`, `CSV`) plus Compliance evidence manifest.

The four implementations duplicate markup and do not share keyboard/menu behavior. Native `<details>` does not provide the full requested Escape/focus/outside-click contract.

## 8. Current export formats per tool

The active uncommitted migration generates and exposes HTML, PDF, and CSV for all four tools. Compliance additionally retains JSON/workflow/manifests internally and exposes its evidence manifest. New XLSX files are explicitly rejected by the smoke suite, the download resolver allow-lists only PDF/CSV, and `exceljs` has been removed from active dependencies.

## 9. Excel availability decision

This is case B: Excel was intentionally removed by the active unified-reporting migration (`docs/UNIFIED_PDF_REPORTING_AUDIT.md` and `docs/UNIFIED_PDF_REPORTING_IMPLEMENTATION.md`). The current task nevertheless explicitly requires `Download Excel` under `More Exports` for all four tools, so it is treated as deliberate authorization to reintroduce XLSX.

The implementation will restore ExcelJS 4.4.0 from repository history, use a new shared workbook layer, retain formula-injection neutralization for mutable/untrusted spreadsheet text, add allow-listed `.xlsx` download resolution and current tests, and avoid restoring old UI/report-manager coupling. Existing professional identity/project/original-timestamp filenames will extend to `.xlsx`.

## 10. Selected shared CTA architecture

One `reportActionControls()` renderer in `public/app.js` will accept Open Report, PDF, CSV, and Excel URLs and emit the same accessible action group everywhere. One shared stylesheet in `public/styles/shared.css` will own the pill hierarchy and responsive behavior. One delegated interaction controller will own click, Arrow/Home/End keyboard movement, Escape close with trigger focus restoration, outside-click close, focus-visible, disabled state, and transient downloading state. Report History will use the same renderer and vocabulary. Compliance-only evidence manifest remains available as an additional menu item without displacing CSV/Excel.

## 11. Intentionally unchanged semantics

No Lighthouse scoring/audit interpretation, Asset byte calculation/finding, Broken Links classification/checking, or Compliance evidence/mapping/workflow/conclusion logic is authorized to change. Compliance invariants remain `assessmentType = compliance_pre_assessment`, `complianceConclusion = not_determined`, `controlSatisfaction = not_determined`, and `coverage = partial`. No tool receives compliance-specific concepts, invented severity, or a fabricated health score.

## Baseline validation

- `git diff --check`: passed.
- `npm test`: 161/161 passed, 0 failed, 0 skipped.
- `npm run validate:phase1`: 80/80 passed; browser, PDF, and three-tool smoke categories passed.
- `npm run validate:phase3`: 27/27 passed.
- `npm run validate:phase4`: 25/25 passed.
- `npm run smoke:all`: passed with real Brave navigation/PDF rendering for Compliance, Lighthouse, Asset, and Broken Links.
