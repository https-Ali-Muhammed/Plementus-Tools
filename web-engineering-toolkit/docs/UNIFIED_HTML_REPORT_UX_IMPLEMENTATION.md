# Unified HTML Report UX Implementation

## Delivered scope

The four standalone `summary.html` reports now present as one dark report
family while retaining their independent data and report content. Compliance
Mapping remains the visual reference and keeps its established content,
semantics, and print-specific presentation.

`lib/report-html-theme.js` is the standalone, no-network-dependency helper.
It provides shared dark-shell tokens, width and padding, header/metadata,
metric-card, section, table, muted machine-text, status-chip, responsive, print,
reduced-motion, and floating-control rules. Lighthouse, Asset, and Broken Links
consume the common theme; their tool-specific result content remains in their
respective managers.

## Tool-specific application

- **Compliance Mapping:** retains its existing report structure and visual
  tokens. A screen-only global button is injected after existing report
  behavior. Its print CSS hides the control, and `lib/security-pdf.js` was not
  changed.
- **Lighthouse:** uses the shared shell bridge while retaining scores, metrics,
  finding groups, page results, and download actions.
- **Asset & Page-Weight Analyzer:** uses the family shell, cards, headings, and
  tables. Largest asset URLs are collapsed to a bounded `details` summary with
  the full linked URL still available.
- **Broken Links & Resources Checker:** uses the family shell while retaining
  Summary, Needs attention, Review, Redirects, Healthy, scan details, filtering,
  and pagination. Repeated local Back-to-top links were removed.

## Report History and global controls

Report History now emits reusable, labeled badge modifiers:

- `report-type-badge--compliance` (teal)
- `report-type-badge--lighthouse` (blue)
- `report-type-badge--asset` (violet)
- `report-type-badge--broken-links` (amber/copper)

The text label remains in every badge; colour is visual tool identity only.

The interactive toolkit contains one `#globalBackToTop` button. Generated
reports contain one helper-provided `data-report-back-to-top` button. Each is a
real button with `aria-label="Back to top"`, appears after 400 px, scrolls to the
top, respects reduced motion, is 42 px square, accounts for safe-area insets,
has visible focus, and is hidden for printing.

## Test coverage

`test/unified-html-report-ux.test.js` verifies explicit badge variants and
labels, the common standalone-control contract, one control per report,
Broken Links local-link removal, reduced-motion/print declarations, and a
browser coverage path for 1440, 1024, 768, and 390 px across all four reports.
The browser path checks visibility threshold, keyboard activation, scroll-to-top,
print hiding, overflow, and console errors when browser navigation is available.

The cross-family browser path passed at 1440, 1024, 768, and 390 px for all
four standalone reports. It verified the threshold, keyboard activation,
scroll-to-top behavior, print hiding, responsive width, and console errors.

## Guardrails

No report analysis, calculations, findings, classifications, mappings, evidence,
filenames, CSV, XLSX, or PDF generator content was changed. Phase 5 and Phase 6
files were not changed.
