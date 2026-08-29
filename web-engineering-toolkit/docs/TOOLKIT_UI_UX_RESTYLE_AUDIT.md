# Toolkit UI/UX Restyle Audit

Date: 2026-08-28  
Repository baseline: `6f5ec2e606218f7d76f3edfce8ee07dac3682e87` (`develop`)  
Toolkit version: `1.7.1`

## Scope and method

This audit covers the interactive Web Engineering Toolkit shell and the three tool workspaces: Lighthouse Reporter, Compliance Mapping, and Asset & Page-Weight Analyzer. It is a UI/UX and CSS-ownership audit, not a roadmap phase or a change to scanner, mapping, review, report, or analysis semantics.

The live checkout was inspected before production changes. The starting worktree was clean and `git diff --check` reported no errors. `public/index.html`, `public/app.js`, and the complete 1,613-line `public/styles.css` were inspected. Controlled Chromium renders were captured at 1440×1000 and 390×844 for each tool and Report History. All audited pages had `scrollWidth === innerWidth`; no baseline console errors were observed.

The generated Compliance report is outside the restyling boundary. Before implementation, a controlled report was recorded as a six-page tagged A4 PDF (138,277 bytes) and rasterized page by page for post-change comparison.

## Existing palette inventory

The current dark palette is visually coherent and approved. Its canonical core values are:

| Role | Existing value |
| --- | --- |
| Page background | `#0b1020` |
| Translucent panel | `rgba(18, 25, 45, 0.86)` |
| Strong panel | `#11192d` |
| Soft panel | `rgba(255,255,255,.035)` |
| Border | `rgba(255,255,255,.09)` |
| Strong border | `rgba(255,255,255,.14)` |
| Primary text | `#f7f9ff` |
| Muted text | `#95a0ba` |
| Subtle text | `#65718e` |
| Primary accent | `#7c6cff` |
| Secondary accent | `#4f9cff` |
| Accent surface | `rgba(124,108,255,.14)` |
| Success | `#4fd1a1` |
| Warning | `#ffbf69` |
| Danger | `#ff6b7a` |
| Existing shadow | `0 24px 80px rgba(0,0,0,.28)` |

The source also contains 285 exact literal color forms when opacity variants and component-specific approved shades are counted. Those values are implementation details of the same palette, not authority to add colors. The refactor must retain exact live values, centralize the core tokens above, and move existing component variants without chromatic substitution.

## Shell and shared UI

### Already strong and retained

- The brand mark, dark shell, restrained gradients, and purple/blue accent language are distinctive and consistent.
- Desktop navigation is readable and the mobile menu already collapses without page overflow.
- Shared cards, controls, focus treatment, loading indicators, toasts, and status badges provide a useful visual foundation.
- The content width and two-column setup patterns work well at desktop sizes.

### Demonstrated gaps

- All shell, tool, results, report-history, modal, and responsive rules share one chronological stylesheet. Later blocks override earlier generic selectors, obscuring ownership.
- Generic result and history selectors can affect more than their intended tool. The absence of file-level ownership makes regressions difficult to localize.
- Repeated spacing, control, border, radius, and surface values are not expressed as a small shared system.
- Several dense history rows place long report identity and many actions on one line. Mobile cards remain usable, but action grouping can be clearer.
- Long machine values have component-specific wrapping fixes instead of a consistent shared baseline.

### Selected correction

Create one shared stylesheet for the shell and genuine primitives, plus one scoped stylesheet per tool. Preserve the existing DOM and functional selectors. Keep Report History and Projects in shared ownership because they are cross-tool workspaces; tool-specific report badges remain owned by their corresponding tool.

## Lighthouse Reporter

### Already strong and retained

- The URL/project configuration, category matrix, run summary, and environment panel have a clear desktop flow.
- Score and metric cards already use an effective scan hierarchy.
- Existing loading, error, and completed states are functional and accessible.
- Mobile rendering has no horizontal overflow and controls remain reachable.

### Demonstrated gaps

- Lighthouse-specific result, insight, category, and report styles are mixed with generic shell rules, making cross-tool leakage possible.
- The long mobile configuration flow has limited visual separation between target setup, categories, environment detail, and the final run action.
- Dense result metadata and long URLs need a consistent wrapping boundary.

### Selected correction

Move Lighthouse-only configuration and result styling into `lighthouse.css`, scoped through `#runnerSection` where practical. Improve section rhythm and mobile grouping using existing colors, spacing, borders, and typography. Preserve category selection, scoring, analysis behavior, result rendering, and report contracts.

## Compliance Mapping

### Already strong and retained

- The Phase 4 workspace already provides explicit review saves, review progress, search, filters, sorting, manual-review reasons, mapping/scope decisions, and report history.
- Technical evidence, candidate mapping language, conservative control semantics, and review overlays are functionally distinct.
- Progressive disclosure for advanced configuration, evidence, governance, and long detail is already effective.
- The results navigation and one-column finding queue are appropriate for review work.
- Desktop and mobile baseline renders have no page overflow.

### Demonstrated gaps

- At desktop width, three-column framework cards constrain long applicability select values enough to clip their visible text.
- The per-finding Human Review form is one undifferentiated grid. Finding disposition, scope review, mapping review, note, and save action lack internal grouping even though they represent separate decisions.
- Review filters are dense at intermediate widths and rely on an abrupt column collapse.
- Nested finding, evidence, mapping/control, and review content use similar surfaces, reducing semantic hierarchy without careful reading.
- The current Compliance rules are split between an older unscoped section and a later scoped refinement block, which creates ownership ambiguity.
- One inline alignment style remains on the crawl toggle rather than a reusable class.

### Selected correction

Consolidate the interactive workspace into `compliance.css`, scope it to `#securitySection`, and retain all JavaScript IDs/classes used as contracts. Add lightweight semantic wrappers/headings inside the existing review form so reviewer metadata, finding disposition, mapping review, scope review, note, and explicit save action scan as deliberate groups. Improve framework-card sizing, filter wrapping, long-text handling, and responsive review layout without adding decisions or hiding evidence.

The generated Compliance HTML/PDF report is explicitly excluded. Its embedded report CSS, print rules, pagination, typography, colors, cards, and layout must not change.

## Asset & Page-Weight Analyzer

### Already strong and retained

- The setup form is concise, the run action is prominent, and the empty state is understandable.
- Summary metrics and category breakdowns have a useful hierarchy.
- The wide asset table already uses bounded component scrolling rather than causing page overflow.
- The mobile input flow is simple and usable.

### Demonstrated gaps

- Asset-specific layout, metric, breakdown, finding, and table styles are embedded beside shared Projects rules.
- Long asset URLs are ellipsized in the table with no consistent wrapping treatment elsewhere in the result view.
- The simple mobile form retains desktop-sized vertical density, while completed-result grouping can be clearer.

### Selected correction

Move all Asset-specific rules into `asset-analyzer.css` and scope them to `#assetsSection` where practical. Preserve intentional table scrolling, improve section rhythm and machine-text handling, and keep the form/result hierarchy consistent with shared primitives. Do not change measurements, calculations, analysis requests, or generated reports.

## CSS ownership findings

The existing stylesheet grew as successive product versions appended blocks (`v0.3` through the Phase 4 Compliance workspace refinement). This history explains duplicated concepts and broad selectors; it does not justify a visual rewrite.

The target ownership is:

- `shared.css`: approved tokens, reset, typography, shell/navigation, generic controls/buttons/cards/status/empty/loading states, Projects, cross-tool Report History, modals, toasts, responsive/accessibility helpers.
- `lighthouse.css`: `#runnerSection` configuration, category controls, Lighthouse summaries, scores, metrics, insights, and result detail.
- `compliance.css`: `#securitySection` setup, collection/evidence presentation, finding queue, review controls, mapping/control presentation, workflow revision, and Compliance-specific report-history badges.
- `asset-analyzer.css`: `#assetsSection` setup, metrics, breakdowns, tables, findings, and Asset-specific report-history badge.

`public/styles.css` should remain only as a compatibility/import entry point so the existing shell URL remains stable. It must not retain active duplicate rules.

## Accessibility and responsive findings

- Existing label associations, native controls, button semantics, live status regions, and focus-visible rules must remain.
- Tool-specific roots already provide suitable scoping without adding wrapper-only DOM.
- Desktop (1440px) and mobile (390px) baselines are overflow-free. The refactor should preserve that result and also verify 1024px and 768px.
- Mobile changes should improve grouping and touch spacing without hiding controls or replacing wide-table component scrolling with unreadably small text.
- Status continues to require text as well as color. No status meaning may become color-only.

## Items intentionally untouched

- No routes, APIs, IDs, form names, payloads, analysis logic, scanner options, mapping semantics, review states, workflow behavior, report contracts, or schema versions.
- No new dashboard, metric, chart, scanner option, review feature, or workflow state.
- No change to Lighthouse scores or Asset calculations.
- No generated Compliance report styling or PDF/print behavior.
- No new palette, font, gradient, shadow, success/warning/error color, or brand treatment.

## Implementation selection

The demonstrated work is deliberately bounded to CSS ownership, shared tokens/primitives, scoped tool rules, modest layout and responsive refinements, and minimal review-form markup grouping. The existing interface identity and working behavior remain the baseline; this is an evolutionary refactor rather than a product redesign.
