# Compliance report alignment implementation

Date: 2026-08-31  
Status: uncommitted presentation-only work.

## 1. Baseline

The worktree already contained the prior unified standalone-report, Report History badge, and global bottom-right back-to-top implementation. This task preserves those changes and adds Compliance presentation alignment only. The baseline `npm test` passed 169/169; Phase 1 passed 80/80 and Phase 3 passed 27/27. The initial Phase 4 browser invocation stalled after its deterministic checks because its browser worker remained alive; it is retried in the final gate.

## 2. Screenshot references used

Approved images were reviewed from `/home/https_ali_muhammed/Plementus/Tools/REF_ScreenShots`:

- `Lighthouse Reporter Tool.png`
- `Compliance Mapping Tool.png`
- `Asset & Page-Weight Analyzer Tool.png`
- `Broken Links & Resources Checker Tool.png`
- `Lighthouse Reporter Tool main page after run.png`
- `Compliance Mapping Tool main page after run.png`
- `Asset & Page-Weight Analyzer Tool main page after run.png`
- `Broken Links & Resources Checker Tool main page after run.png`

They were not copied, moved, renamed, deleted, or added to the source package.

## 3. Screenshot comparison findings

Lighthouse, Asset, and Broken Links establish a common dark toolkit family: a broad centred shell, compact uppercase eyebrow, project-led header, restrained metadata, a three-level quick-action bar, and rounded bordered surfaces. Compliance’s standalone report retained useful context but had a legacy cover and older export links. Its post-run workspace was semantically correct but visually denser and flatter than the other tool result surfaces.

## 4. Quick-action architecture

- In-app actions continue to use the existing shared `reportActionControls()` renderer for all four tools.
- Standalone summaries now use the new self-contained `reportHtmlQuickActions()` helper from `lib/report-html-theme.js`.
- Every standalone header now exposes **Open Report**, **Download PDF**, and **More Exports**.
- More Exports retains each tool’s existing secondary artifacts: CSV/XLSX for Lighthouse, Asset, and Broken Links; CSV/XLSX plus Evidence Manifest for Compliance.
- Standalone links use relative report artifacts, so a downloaded report folder continues to work without a network dependency. The application continues to use its existing safe download routes.
- The disclosure keeps real button semantics, menu roles, `aria-expanded`, Arrow Down/menu-item keyboard navigation, Escape-to-close, visible focus, and responsive wrapping.

## 5. Compliance report top alignment

`lib/security-report-html.js` now presents the Compliance top section as a screen-only shared-family header while retaining all Compliance content:

- Toolkit eyebrow and project-first title.
- Technical Compliance Pre-Assessment identity, target/run metadata, conclusion, coverage, disclaimer, and review information.
- Shared action hierarchy and compact metadata surfaces.
- The existing report sections, evidence, candidate mappings, review workflow, conservative conclusion, files, and print renderer remain in place.

## 6. Compliance post-run alignment

`public/index.html` marks the Compliance results outer card with `tool-result-card`. Scoped rules in `public/styles/compliance.css` align the post-run workspace with the toolkit family:

- consistent outer result elevation, border, radius, and heading divider;
- common header action-bar placement;
- a refined sticky section navigation surface;
- rounded nested result sections rather than flat, rule-only divisions;
- common card background/border language for metrics, framework summaries, disclosure panels, and finding groups;
- the existing assessment-boundary warning remains explicit and text-labelled.

No Compliance information architecture or workflow controls were removed.

## 7. Shared CSS and token changes

`lib/report-html-theme.js` now includes standalone action controls and their responsive/focus/menu styles. Application action styling remains centralised in `public/styles/shared.css`; Compliance adds only root-scoped result-surface overrides and does not introduce a second global palette.

## 8. Semantics preserved

No scanner, collection, evidence, mapping, applicability, classification, conclusion, review, revision, filename, PDF data, CSV data, XLSX data, Report History, or safe download behaviour was changed. The Compliance conclusion remains **Not determined** and the technical pre-assessment/disclaimer language remains visible.

## 9. Accessibility

- Actions retain visible text labels and keyboard-operable controls.
- The export menu retains menu roles, `aria-haspopup`, `aria-expanded`, Arrow Down/menu traversal, Escape closure, and focus restoration.
- Focus-visible outlines are present on report actions and standalone export items.
- Long URLs/machine text retain wrapping or bounded disclosure rather than clipping data.
- The global back-to-top button remains a real, labelled button, honours reduced motion, is hidden for print, and is fixed bottom-right with safe-area handling.

## 10. Responsive and browser visual validation

Fresh controlled standalone report captures were generated and visually inspected at 1440px and 390px for Compliance, Lighthouse, Asset, and Broken Links. A controlled Compliance main-page run was also captured at 1440px and 390px. The capture checks found no console errors; the shared automated report test covers 1440, 1024, 768, and 390px for all four standalone reports, no horizontal overflow, keyboard actions, reduced motion, print hiding, and the global bottom-right control.

## 11. Tests

Added or updated checks cover:

- shared standalone action structure, labels, exports, and no duplicate action group;
- Compliance report header classes and preserved pre-assessment/conclusion/section content;
- standalone keyboard export-menu use, responsive widths, console errors, reduced motion, print, and global ↑ behaviour;
- Compliance post-run result-surface hooks and preserved content contracts;
- the Compliance screen-renderer source baseline guard (the PDF renderer file itself remains unchanged).

## 12. Validation status

- `git diff --check`: passed.
- `npm test`: passed, 171/171.
- `npm run validate:phase1`: passed, 81/81.
- `npm run validate:phase3`: passed, 28/28.
- `npm run validate:phase4`: passed, 26/26.
- `npm run smoke:all`: passed for Compliance, Lighthouse, Asset, and Broken Links.
- `npm run package`: passed; 115 source files packaged.
- `npm run test:package`: passed, 1/1.

## 13. Phase 5 and Phase 6

Phase 5 is untouched. Phase 6 is untouched. Their roadmap state remains frozen/on hold; no Phase 5/6 code, test, or documentation implementation was introduced.

## 14. Remaining limitations and ready-to-commit assessment

The Compliance standalone report intentionally retains its unique full report body and review workflow; only its screen top presentation is aligned. The source remains uncommitted as requested. Subject to the final validation gates, the changes are ready for normal review and commit.
