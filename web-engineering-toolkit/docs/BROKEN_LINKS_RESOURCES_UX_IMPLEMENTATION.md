# Broken Links & Resources UX Implementation

Date: 2026-08-29  
Repository baseline: `2403c79a580d3d3b95746e7d8083e0eebac1e6d0`  
Toolkit version: `1.7.1`

## 1. Baseline

The work continued from the validated, uncommitted fourth-tool implementation without restarting or changing checker semantics. The repository baseline passed 151/151 tests, Phase 1 at 80/80, Phase 3 at 27/27, Phase 4 at 25/25, and all four smoke paths. Brave `151.1.93.134` supplied browser capability. `git diff --check` was clean.

## 2. Screenshot and live audit

The screenshot concerns were confirmed in live code. The workspace eagerly rendered every target and occurrence into one seven-column table, then hid rows for filters. Healthy records received equal visual priority and DOM cost. The table required horizontal scanning, the filter block resembled configuration, and full URLs competed with method, scope, and sources. The standalone report repeated every target in an unpaginated `980px`-minimum table with no issue-first navigation.

The audit and selected presentation-only plan are recorded in `docs/BROKEN_LINKS_RESOURCES_UX_AUDIT.md`.

## 3. Workspace before

All canonical targets became DOM rows at once. There were no result groups, outcome shortcuts, sorting, pagination, clear action, or explanatory empty state. Occurrences were embedded in every row. On mobile, the same desktop table required panning. Completed results remained constrained beside the permanent run column.

## 4. Workspace after

The configuration/run area remains two-column before a run, while the results card now occupies full width below it. Completion text immediately reports factual attention, review, and healthy counts. The result workspace renders compact remediation records instead of a wide table and only creates records for the current page.

## 5. Result grouping

Presentation derives four views from unchanged canonical outcomes:

- Needs attention: `broken`, `fragment_missing`, `server_error`, `unreachable`, `failed_to_check`, `client_error`;
- Review: `redirected`, `restricted`, `rate_limited`;
- Healthy: `healthy`;
- All: every outcome, including `skipped`.

The first non-empty view in that order becomes the default. These are view groups, not checker states or scores.

## 6. Summary interaction

Pages and targets remain informational facts. Needs attention, Review, and Healthy are keyboard-accessible buttons that switch views. Canonical outcome pills provide direct shortcuts with factual counts. `aria-pressed` communicates the selected view without relying on color.

## 7. Filters, search, and sort

The compact sticky desktop toolbar retains search, canonical outcome, reference type, internal/external scope, HTTP status, and source page. Search covers safe target/final URLs, source pages, status, type, and failure reason. Clear filters resets the filter/sort fields while retaining the chosen conceptual view. Deterministic sorting supports action priority, outcome, HTTP status, target, and occurrence count.

## 8. Pagination

Workspace pagination defaults to 25 and supports 50/100 rows. Filters and sorting operate over canonical public target data, then only the current page is rendered. Previous/next controls expose a stable page position and disabled boundary state. Infinite scroll was not introduced.

## 9. Target presentation

Primary records expose outcome, status, readable path, host, reference types, internal/external scope, and occurrence count. Long paths are safely wrapped and line-clamped with the complete safe URL available in the title and expanded detail. Copy URL and safe Open target actions use the already-redacted public target; redacted targets are not opened.

## 10. Occurrence presentation

Native details expose the full safe target/final URL, method, types, scope, fragment, redirect chain, failure reason, and source provenance. Occurrences show five entries initially and expand explicitly to the complete retained list. One unique target remains one primary record.

## 11. Run and configuration improvements

The starting-pages textarea retains its Shared Project-compatible newline contract but is shorter, scrollable, and accompanied by a live page count. Advanced limits remain collapsed while the summary reports actual pages, targets, and timeout. After completion, the run card hides repeated setup prose, becomes a compact last-check/Run again control, and no longer constrains the full-width results area.

## 12. Mobile behavior

At narrow widths, result records stack outcome/status, target, facts, and detail actions. The toolbar loses stickiness and becomes one column; group tabs become two columns; details and pagination stack. No result table or page-level horizontal panning remains.

Controlled visual inspection covered the workspace's attention view, expanded first issue, healthy inventory, and full mobile result at 1440 × 1000 and 390 × 844. The result card spans the available application width, long paths remain contained, controls remain reachable, and the mobile presentation uses stacked records without page overflow.

## 13. HTML report before

The original standalone report placed scope before remediation and ended with one unbounded All checked references table. Healthy records dominated large reports, occurrence context was permanently inline, URLs widened the table, and local readers had no table of contents or pagination.

## 14. HTML report after

The isolated Broken Links report now reads as a remediation report: compact scan identity, executive factual summary, attention overview, Needs attention, Review items, Redirects, Healthy references, then scope/methodology/limitations. Issue records emphasize outcome, status, target, type, source count, and reason. Machine JSON/CSV/XLSX/metadata output remains unchanged.

## 15. Report navigation

A compact sticky internal navigation links Summary, Needs attention, Review, Redirects, Healthy references, and Scan details. Sections provide Back to top links. The report requires no server, CDN, font download, or framework.

## 16. Report pagination and progressive disclosure

Every report group has self-contained 25/50/100 pagination when needed. Healthy inventory also provides local search and Clear. Only the active page is placed in the visible list. Full group markup is safely embedded in an escaped local JSON payload, while complete canonical machine data remains in `summary.json`. Native details contain redirect and occurrence provenance. Print CSS removes interactive controls, avoids horizontal tables, and exposes essential details for rendered issue records.

The generated report was visually inspected at 1440, 1024, 768, and 390 pixels, including the report top, Needs attention section, Healthy inventory, and full mobile reading path. The compact header and navigation lead into issue sections before inventory; long targets stay inside their records; and there is no page-level horizontal overflow.

## 17. Accessibility

The redesign uses real buttons, labels, disabled pagination states, `aria-live` counts, pressed-state group controls, semantic articles, and native details/summary. Every color-coded state retains visible outcome text. Shared focus-visible and touch sizing remain in force.

## 18. Large-result performance

The deterministic fixture contains 320 targets with a healthy majority, every attention/review family, long URLs, and repeated occurrences. A separate 2,000-target browser run proves the workspace keeps at most 25 primary records in the DOM. The isolated final measurement recorded 405 ms from Run click through initial result visibility, 6.3 ms for a client-side search update, and 21.9 ms for a healthy-inventory page switch. These are environment-specific observations, not product guarantees.

## 19. Functional checker invariance

`lib/broken-links-checker.js` is unchanged by this task. Existing controlled checker regressions continue to validate target/outcome counts, redirects, fragment handling, occurrence deduplication, query identity, sensitive-query redaction, and transport classification. Presentation grouping is derived after collection and never written back into the result.

## 20. Tests

`test/fixtures/broken-links-presentation-fixture.js` supplies bounded 320- and 2,000-target presentations. Workspace tests cover actionable-first defaults, healthy access, summary controls, pagination, filter persistence, sorting controls, empty/clear behavior, occurrence expansion, long URLs, mobile layout, bounded DOM size, performance, and console/page errors. Report tests cover section order, navigation anchors, bounded healthy inventory, complete canonical JSON, embedded data safety, native occurrence detail, dependency-free pagination/search, and four responsive widths.

The final full suite passed 154/154 tests with no failures or skips in 86.881 seconds. Phase 1 passed 80/80, Phase 3 passed 27/27, and Phase 4 passed 25/25, all with browser/PDF capability available.

## 21. Four-tool smoke

The existing single smoke command remains responsible for Compliance Mapping, Lighthouse Reporter, Asset & Page-Weight Analyzer, and Broken Links & Resources. The final run passed all four paths. Compliance measured 2,130 ms assessment and 2,021 ms report generation; Lighthouse 12,140 ms; Asset Analyzer 2,243 ms; and Broken Links 1,949 ms for the invariant 2-page, 30-target result with 9 broken and 1 redirected target.

## 22. Package validation

The deterministic package contract now requires this audit, implementation record, and presentation fixture in addition to the existing fourth-tool sources/tests. The final archive contains 93 source entries; `npm run test:package` passes completeness, exclusion, and repeated-build assertions. Runtime reports, profiles, sessions, credentials, and evidence state remain excluded. Final byte size and repeated SHA-256 are recorded in the handoff so the archive does not attempt to contain its own digest.

## 23. Remaining limitations

Workspace filtering remains client-side and uses the public in-memory result. The report embeds escaped presentation markup for local pagination, so file size still scales with retained result/occurrence data even though visible length and active DOM records are bounded. Report search is intentionally limited to the Healthy inventory; remediation sections remain immediately readable. There is no saved UI filter state across browser reloads, PDF export, virtual scrolling, or issue-management workflow.

## 24. Ready-to-commit assessment

Visual inspection, checker invariance, the 154-test suite, Phase 1/3/4 validators, four-tool smoke, and deterministic package validation are green. Implementation remains intentionally uncommitted and is ready for review and commit after the final handoff records the archive digest and clean whitespace check.
