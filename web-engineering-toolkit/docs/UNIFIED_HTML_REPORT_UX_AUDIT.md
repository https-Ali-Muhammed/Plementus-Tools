# Unified HTML Report UX Audit

## Scope and guardrails

This audit covers the interactive toolkit shell, Report History, and the four
standalone `summary.html` report families: Compliance Mapping, Lighthouse,
Asset & Page-Weight Analyzer, and Broken Links & Resources Checker. It does not
change report data, report schemas, analysis, exports, PDF renderers, or Phase
5/Phase 6 work.

## Baseline observed on 2026-08-31

- `git status --short` reported one pre-existing modification:
  `public/styles/shared.css`.
- `git diff --check` reported no whitespace errors.
- `npm test` completed with 164 passing and 2 failing tests. The failures were
  the rendered dynamic-link check and Report History action focus check. The
  inspected pre-existing diff has an unmatched closing brace immediately after
  `.report-export-popover`; it invalidates the following shared CSS rules and
  explains the affected Report History interaction styling. The overlapping
  shared-style defect will be corrected with the requested shared control work.
- Phase 1, Phase 3, Phase 4, smoke, package, and package-test gates remain to
  be run as the requested baseline and final validation sequence.

## Existing report-family architecture

| Surface | Current owner | Audit finding |
| --- | --- | --- |
| Compliance Mapping | `lib/security-report-html.js` | Mature standalone dark report with the desired shell and conservative semantics. It is the visual reference and must retain its report content and print presentation. |
| Lighthouse | `lib/report-manager.js` | Standalone report has a related but independently defined shell, tokens, cards, tables, and responsive rules. |
| Asset | `lib/asset-report-manager.js` | Standalone report is compact but has a separate shell and unbounded URL presentation in tables. |
| Broken Links | `lib/broken-links-report-manager.js` | Standalone report has a separate shell and repeated per-section `Back to top` links. |
| Report History | `public/app.js`, `public/styles/shared.css` | One generic badge class is emitted; existing tool selectors are inconsistent and do not provide the requested four identity variants. |

## Implementation approach

1. Add one self-contained report HTML theme helper that supplies shared dark
   report shell, cards, tables, metadata, responsive rules, print hiding, and
   one floating Back-to-top control. Tool generators keep their own data and
   content markup.
2. Keep Compliance Mapping's existing styles/content as the reference; add only
   the shared global control and non-printing compatibility hooks required for
   the common family.
3. Move Lighthouse, Asset, and Broken Links onto the common structural classes
   while preserving their sections, classifications, filters, pagination, and
   generated artifact names.
4. Add Report History's four explicit badge modifiers. Their labels remain
   visible, so colour is identity decoration rather than the sole signal.
5. Add exactly one global app control and one generated-report helper. Both
   appear after roughly 400 px, are keyboard-operable buttons, use reduced
   motion when requested, respect safe-area insets, and are hidden when printed.
6. Add static and browser coverage for badge variants, the common standalone
   shell, no duplicate controls, removal of Broken Links local links, scrolling,
   print hiding, responsive widths, and console errors.

## Non-goals

- No changes to finding content, evidence, mapping, classifications,
  calculations, CSV/XLSX/PDF generation, or file names.
- No redesign of Report History beyond badges and the global control.
- No Phase 5 or Phase 6 files, validators, or behavior.
