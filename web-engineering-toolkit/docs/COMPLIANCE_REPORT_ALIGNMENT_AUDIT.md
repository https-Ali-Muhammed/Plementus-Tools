# Compliance report alignment audit

Date: 2026-08-31  
Scope: presentation alignment only. Compliance Mapping Phases 5 and 6 remain frozen and are not part of this work.

## 1. Screenshot inventory

The following approved reference images were listed and visually inspected in `/home/https_ali_muhammed/Plementus/Tools/REF_ScreenShots`. They remain outside the source package and are not modified by this work.

| Reference image | Surface used for comparison |
| --- | --- |
| `Lighthouse Reporter Tool.png` | Lighthouse generated report / report-detail top section and quick-action visual direction |
| `Compliance Mapping Tool.png` | Compliance generated report top section |
| `Asset & Page-Weight Analyzer Tool.png` | Asset generated report / report-detail top section |
| `Broken Links & Resources Checker Tool.png` | Broken Links generated report / report-detail top section |
| `Lighthouse Reporter Tool main page after run.png` | Lighthouse post-run result surface and primary quick actions |
| `Compliance Mapping Tool main page after run.png` | Compliance post-run result surface |
| `Asset & Page-Weight Analyzer Tool main page after run.png` | Asset post-run result surface |
| `Broken Links & Resources Checker Tool main page after run.png` | Broken Links post-run result surface |

## 2. Screenshot comparison findings

### Group A: generated report detail

Lighthouse, Asset, and Broken Links share a dark report family: a centred wide shell, a bordered/elevated top surface, compact uppercase toolkit eyebrow, project-first title, muted run context, metric cards, rounded section surfaces, and bounded table wrappers. Lighthouse also establishes the preferred action hierarchy: outlined **Open Report**, filled **Download PDF**, and subdued **More Exports**.

The Compliance report preserves more Compliance-specific context, but its top is a legacy cover presentation: a larger pre-assessment title, cover-specific metadata/conclusion treatment, and an older HTML/CSV/PDF/manifest link row. The content is useful and must remain, yet it does not expose the common project-first header or the common action hierarchy.

### Group B: main tool after run

Lighthouse, Asset, and Broken Links use the shared application card language: dark page background, a full-width bordered result card, a compact numbered result header, consistent elevated/nested surfaces, 14–18px radii, and the common quick-action group at the header edge.

Compliance already has the same outer `card` and shared action mount, but its post-run workspace introduces older, denser styles: zero-gap result content, thin section rules instead of nested result panels, a differently toned sticky result navigation, and an assessment-boundary treatment that appears as a separate visual subsystem. Its information architecture, controls, and terminology are intentionally retained; only surface/token presentation needs to converge.

## 3. Current quick report actions

| Tool | Current in-app result actions | Secondary exports |
| --- | --- | --- |
| Lighthouse | Shared `reportActionControls()` | CSV, Excel |
| Asset & Page-Weight Analyzer | Shared `reportActionControls()` | CSV, Excel |
| Broken Links & Resources Checker | Shared `reportActionControls()` | CSV, Excel |
| Compliance Mapping | Shared `reportActionControls()` | CSV, Excel, Evidence Manifest |

The shared app helper already provides real links/buttons, labelled groups, a menu button with `aria-haspopup="menu"` / `aria-expanded`, keyboard menu handling, and the desired Open Report / Download PDF / More Exports ordering. Compliance standalone HTML does not yet use this action structure.

## 4. Current implementation surfaces

- `public/index.html` provides the three result header mounts (`securityResultActions`, `assetResultActions`, and `linksResultActions`) alongside Lighthouse’s result summary action area.
- `public/app.js` owns `reportActionControls()` and the common menu interaction. It keeps each tool’s URLs and supported exports intact.
- `public/styles/shared.css` owns action sizing, hierarchy, focus treatment, menu positioning, and responsive stacking.
- `public/styles/compliance.css` owns the post-run Compliance workspace. It has both older compact rules and later workspace-specific rules, which can be normalized with scoped presentation overrides.
- `lib/security-report-html.js` generates the Compliance standalone report and retains its own self-contained styles and review workflow.
- `lib/report-html-theme.js` is the existing self-contained standalone report token/helper used by Lighthouse, Asset, and Broken Links. It also provides one global bottom-right back-to-top control.

## 5. Shared traits to retain and apply

- Shell: `min(1360px, 100%)`, centred, with 24px desktop / 14px mobile page padding.
- Surfaces: dark blue-black background, low-contrast border, 18px outer radius, 14px inner radius, and modest elevation.
- Header: toolkit eyebrow, project title, muted base URL and run context, plus a header-aligned quick-action row.
- Components: compact metric cards, readable metadata, table wrappers, URL wrapping, muted support text, and responsive grids.
- Actions: one hierarchy and one interaction model for all four in-app result surfaces; standalone reports use the same visual/action vocabulary while preserving local artifacts and routes.

## 6. Implementation strategy

1. Add a self-contained report-action helper to the standalone report theme, with the same three labelled actions and accessible disclosure/menu behaviour.
2. Use that helper at each standalone report header. Keep exact tool-specific downloads and do not alter report names, output files, or routes.
3. Rework the Compliance standalone report cover top only into the shared report header shell: project title, retained Compliance run metadata, unchanged conclusion/disclaimer, then standard actions. Preserve the document sections, review workflow, report data, and print layout.
4. Add narrowly scoped Compliance workspace surface tokens and classes to align the post-run container, header, navigation, summary/metric surfaces, section containers, and finding/framework cards with the shared application family. Do not alter rendered information, filtering, review logic, or mapping/evidence content.
5. Extend tests around shared action structure, standalone action semantics, Compliance top content preservation, CSS surface hooks, responsive widths, keyboard menu operation, and browser console errors.

## 7. Accessibility and responsive considerations

- Keep links for real downloads/opening reports and a real button for the export menu.
- Preserve visible text labels; button color is hierarchy, never the only identifier.
- Preserve `aria-label`, `aria-haspopup`, `aria-expanded`, menu roles, Escape/arrow-key operation, and `:focus-visible` outlines.
- At 1440, 1024, 768, and 390px, headers/actions must wrap without horizontal overflow. At narrow widths, actions stack to full-width touch targets and menus remain in the viewport.
- Long machine/URL text must wrap or be bounded without removing access to the full value.
- Existing reduced-motion and print behaviour of the global back-to-top control remains unchanged.

## 8. Intentionally unchanged semantics

This task will not change assessment overview data, collection coverage, findings, framework mappings, candidate control mappings, applicability, evidence, review workflow or revisions, scope semantics, conservative conclusions, report filenames, PDF/CSV/XLSX data, download routes, scanner behaviour, or any Phase 5/6 work.
