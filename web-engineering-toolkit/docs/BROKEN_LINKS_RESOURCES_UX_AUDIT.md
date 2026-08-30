# Broken Links & Resources UX Audit

Date: 2026-08-29  
Repository baseline: `2403c79a580d3d3b95746e7d8083e0eebac1e6d0`  
Toolkit version: `1.7.1`

## Baseline

The live uncommitted checkout contains the validated fourth-tool implementation. Before this audit, `git diff --check` was clean, `npm test` passed 151/151 tests, Phase 1 passed 80/80, Phase 3 passed 27/27, Phase 4 passed 25/25, and the four-tool smoke passed. Brave `151.1.93.134` provided browser launch, navigation, and PDF capability. Existing fourth-tool source work and the unrelated parent-level session file were preserved.

## Evidence from the screenshots and live workspace

The screenshots accurately reflect the live rendering path. `renderLinksResults()` creates every unique target row immediately, including each target's complete occurrence markup. The result view is one seven-column table with a minimum width greater than the narrow content area. Filtering walks all rendered rows and toggles `hidden`; it does not reduce DOM size. Healthy references therefore occupy the same visual and rendering budget as broken or unavailable references.

The summary is factual but non-interactive and gives six metrics equal emphasis. The filter area resembles another configuration form, has no group navigation, clear action, sorting, pagination, active-filter summary, or useful empty state. Full URLs, final URLs, failures, methods, scope, and occurrence sources compete in each row. On mobile the table remains a horizontally panned desktop table.

The starting-pages textarea is correct and compatible with Shared Projects, but seven permanently visible rows make it visually heavy. Advanced limits are collapsed, although the summary label does not expose the actual configured limits. The Run card remains a large sticky panel after completion instead of becoming a compact last-run control.

## Evidence from the standalone HTML report

`writeHtml()` renders Broken & unavailable, Redirects, and then All checked references. The final section repeats every target—including all healthy targets—in one unpaginated table with a `980px` minimum width. Source pages, final URL, and failures remain permanently inline. The report has no internal navigation, no grouped review section, no progressive occurrence details, no bounded healthy inventory, and no self-contained pagination. Its scope panel appears before remediation details and interrupts the issue-first reading path.

The report is correctly isolated, escaped, palette-aligned, and machine exports are stable. Those properties should remain.

## Selected workspace redesign

The workspace should derive presentation groups from canonical outcomes:

- Needs attention: `broken`, `fragment_missing`, `server_error`, `unreachable`, `failed_to_check`, `client_error`;
- Review: `redirected`, `restricted`, `rate_limited`;
- Healthy: `healthy`;
- All: every canonical result, including `skipped`.

The initial group will be Needs attention when non-empty, then Review, Healthy, or All as the first non-empty fallback. Group tabs and summary buttons will expose factual counts. They are presentation filters, not new outcome states.

Only the active filtered page will be rendered. Page sizes will be 25, 50, or 100, with 25 as the default. Search, canonical-outcome, type, scope, status, source, and deterministic sort will be retained across page changes. A compact sticky toolbar will include Clear filters and an explicit empty state.

Each primary record will emphasize outcome/status, a readable path, host, types, and occurrence count. Full URL, final URL, redirect chain, method, scope, failure, fragments, and source occurrences move into native expandable details. Occurrence previews will be bounded initially with an explicit Show all control. Copy and safe Open actions will use the already-redacted public URL.

The existing textarea remains to preserve Shared Project synchronization and input semantics, but it will become shorter with a live page count. Advanced summary text will show actual page/target/timeout bounds. After completion, configuration cards become collapsible rather than disappearing, and the Run card becomes a compact Run again / last-check state.

## Selected standalone report redesign

The report reading order will be scan identity, factual summary, attention overview, Needs attention, Review, Redirects, Healthy inventory, then scope/methodology/limitations. A compact anchor navigation and Back to top links will support long reports.

Issue and review sections will render concise remediation records with native details for source occurrences and secondary metadata. Healthy inventory will render only its current client-side page, default 25, with local search and 25/50/100 pagination. All canonical target data remains in JSON/CSV/XLSX and in an escaped self-contained JSON payload used by report pagination; no network dependency is introduced.

Print CSS will remove controls, avoid horizontal scrolling, and expose essential issue detail. Healthy inventory remains deliberately bounded in print because the machine exports remain the complete inventory.

## Accessibility and responsive plan

Summary shortcuts and group navigation will be real buttons with pressed/current state. Pagination controls will expose labels and disabled state. Status text will use an `aria-live` region. Native `details`/`summary` preserves keyboard behavior. Outcome text accompanies color.

Desktop uses compact records rather than a wide table. Mobile stacks outcome, target, metadata, and actions, avoiding page-level horizontal overflow. Touch controls retain the shared control sizing and focus-visible treatment.

## Large-result strategy and tests

A deterministic 320-target presentation fixture will contain a healthy majority, every attention/review family, long URLs, and repeated occurrences. Browser tests will prove actionable-first defaults, summary shortcuts, sorting/filter persistence, bounded DOM rows, pagination, empty state, clear filters, occurrence expansion, responsive widths, and no console/page errors. Report tests will prove section order, local navigation, bounded healthy DOM rendering, complete embedded data, occurrence access, standalone script operation, and responsive layout.

Performance measurements will use the same fixture and record initial rendering, filtering, and page switching. The checker fixture will be rerun before and after presentation work to confirm target/outcome/redirect/fragment/occurrence/redaction invariance.

## Intentionally unchanged

This audit selects no changes to checker outcome semantics, URL or occurrence identity, fragments, queries, SSRF, HEAD/GET behavior, crawl bounds, redaction, schema `1.0.0`, JSON, CSV, XLSX, metadata, Compliance reports, Phase 5/6, or the other three toolkit tools. No score, framework, frontend dependency, PDF export, infinite scroll, or new palette/font is introduced.
