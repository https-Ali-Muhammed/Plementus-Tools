# Lighthouse Reporter and Asset Analyzer UX Audit

## Baseline

The audit was performed on commit `6c9c7f5779c40aaee902bb50ed4665bebd211d5f` with toolkit version `1.7.1` and a clean working tree. The starting suite passed 154/154 tests. Phase 1 passed 80/80, Phase 3 passed 27/27, and Phase 4 passed 25/25 with Brave `151.1.93.134` available for browser navigation and PDF rendering. The four-tool smoke passed before production changes.

## Lighthouse Reporter findings

The live workspace still uses the original shared two-column `.layout-grid`: three configuration cards occupy the flexible column while a permanent 360-pixel action column contains browser controls, a four-item environment summary, detailed environment remediation, and run progress. This structure constrains configuration and results even though the environment detail is operational setup rather than part of the audit result.

The target-page textarea inherits the generic fixed minimum height and manual vertical resize behavior. With the supplied multi-page project input it retains an internal scrollbar instead of presenting the complete normal page list. The result summary is placed inside the Live execution card after the two-column layout, but the configuration and run workflow remain visually split and the execution log receives the same prominence after completion as the final report.

Useful behavior to retain includes the project and language routing model, category selection, device selection, optional session setup script, explicit browser lifecycle, run progress, cancellation, execution log, summary exports, grouped findings, and page-report actions. The backend health and browser capability checks remain useful; only the large interactive environment presentation is unsuitable.

## Asset & Page-Weight Analyzer findings

The Asset workspace defines its own two-column `.asset-layout` with a 330-pixel sticky Run analysis card. The card repeats measurement scope and methodology while permanently reducing the analysis target and results width. `#assetResultsCard` is nested in that constrained content column, making resource breakdowns and wide page/largest-asset tables harder to read on desktop.

The page textarea has the same fixed-height internal-scroll behavior as Lighthouse. Browser and viewport controls are usable but are separated from the primary action by the side column. The summary cards, findings, breakdown, report actions, and tables are already semantically useful and should be retained rather than redesigned or recalculated.

## Selected redesign

For both tools, replace the two-column operational layout with a single main flow: configuration, an inline numbered run step with compact browser/status context, then full-width results. Lighthouse keeps browser select/launch/stop because its run contract requires a managed browser, while the environment health grid, remediation details, and explicit environment-check control are removed from the tool page. Asset keeps its browser choice and measurement note inside the target configuration, then places its run button and state in a compact inline action strip.

Both newline-based page inputs will use one shared JavaScript auto-size helper with explicit textarea inputs. The helper will run on initialization, user input, and Shared Project synchronization. Tool-owned CSS will disable manual resize and normal internal overflow while preserving the existing input values and validation contracts.

Results will remain below the inline run area and span the complete tool content width. Lighthouse will visually separate compact live progress/logging from the completed summary. Asset will give metric grids, resource breakdowns, findings, and horizontally bounded tables the available width. Mobile layouts will stack run actions and result headers without page-level overflow.

## Accessibility and regression plan

Existing labels, IDs, buttons, live status text, focus styles, table semantics, and report links remain. Removed environment controls will not be replaced with clickable containers. The compact run steps use real buttons, status text, and existing progress semantics. A focused browser fixture will exercise Shared Project population, textarea growth, Lighthouse SSE completion, Asset analysis completion, report actions, full-width geometry, four target viewport widths, and console/page-error collection.

## Intentionally unchanged

No Lighthouse audit configuration, scoring, runner, report format, API route, or Report History behavior changes. No Asset calculation, threshold, finding, report format, API route, or Report History behavior changes. Compliance Mapping, Broken Links & Resources Checker, shared navigation, the approved palette, generated reports, and all schema/version values remain unchanged.
