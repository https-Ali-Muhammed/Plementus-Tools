# Competitor matrix — Phase 00

Observation date: **2026-10-20 (Africa/Cairo)**. Evidence is public publisher descriptions/store declarations, **STATIC REVIEW**. No competitor installed, manifest/runtime/security audited, paid service purchased or Odoo system accessed. “Advertised” proves a published claim, not working behavior. “Not evidenced” is not proof of absence.

## Dated source register

| ID | Primary source | Observed version/update | Retrieval and evidence |
|---|---|---|---|
| C1 | [Odoo Workbench — Chrome listing](https://chromewebstore.google.com/detail/odoo-workbench/ofokmhonbnlahfageicjednphjheiodj) | 1.2 / 2026-09-29 | Direct web open initially failed; targeted search returned listing text; later direct read confirmed version/capabilities/privacy |
| C2 | [Workbench — Mozilla listing](https://addons.mozilla.org/en-US/firefox/addon/odoo-workbench/) | 1.2 / 2026-09-25 | Web-tool page opened; corroborates local export/import; direct Python link check returned a Client Challenge (not content proof); browser-specific claims are not Chrome runtime proof |
| C3 | [Odoo Debug — Droggol Chrome listing](https://chromewebstore.google.com/detail/odoo-debug/hmdmhilocobgohohpdpolmibjklfgkbi) | 5.1 / 2026-01-18 | Publisher listing retrieved through web search; unambiguous extension ID distinguishes similarly named tools |
| C4 | [Odoo Toolbox — Chrome listing](https://chromewebstore.google.com/detail/odoo-toolbox/jgobnmpfeomiffhbedhfgbhelcnnelkd) | 1.8.20 / 2026-10-06 | Live publisher page inspected via direct read; search index had stale 1.8.17 / 2026-08-31, corrected from live page; technical/sidebar/RPC features and privacy declaration visible |

## Capability, overlap and privacy comparison

| Product | Advertised capabilities / coverage | Privacy and operational surface (publisher claims) | Overlap and differentiation implication |
|---|---|---|---|
| Workbench (C1/C2) | Odoo 15–20; Odoo.com/Odoo.sh/self-hosted. Field/model tools, ORM calls, workflow/RPC/UI/error/Owl recording and recording comparison. Mozilla listing adds local recording export/import. | Chrome publisher claims existing-session use, Odoo RPCs to enabled server, no telemetry/collection; destructive operations need enabling/confirmation. Optional AI providers broaden possible data destinations. Mozilla claims recordings stay in browser. These are declarations, not audit results. | Strong direct overlap: capture, errors, comparison and local handover. AI-free is insufficient differentiation because its AI is optional. TraceBridge proposes stricter minimal capture and evidence/uncertainty contracts; comparative benefit remains untested. |
| Odoo Debug (C3) | Debug/assets-mode toggle by mouse/keyboard. Timeline, rules, comparison or handover not evidenced in reviewed description; no version certification inferred. | Store developer declares no collection/use. Permission behavior and data flows not audited. | Convenience/debug entry overlaps developer workflow, but published scope is narrower than a case handover. No need to duplicate its toggles. |
| Odoo Toolbox (C4) | RPC testing/data exploration DevTools, field/context sidebar, debug controls and Odoo.sh shortcuts. Technical model-name display advertised for 17.2+. Recording/comparison/handover not evidenced in listing. | Store developer declares no collection/use. Interactive RPC tools require session/data access; exact write safety and telemetry behavior not runtime verified. | Context/RPC inspection overlaps; focus TraceBridge on passive, minimized evidence rather than an interactive RPC console. |
| TraceBridge | Proposed single-case AI-free MVP; automated comparison later; Odoo 8–20 planning targets only. | Proposed default-off per-tab consent, no business values/raw payload retention, bounded local cases and reviewed exports. Controls NOT IMPLEMENTED. | Possible value in safer recipient-ready evidence with provenance, gaps and deterministic next checks. No superiority, exclusivity or certified version advantage established. |

## Findings and decision

Workbench makes a “first workflow recorder/comparison tool for Odoo” claim indefensible. Local-first storage, optional site activation and exports also cannot establish uniqueness from this sample. The proposed **minimal-data handover with explicit evidence quality** is a product hypothesis, not an audited competitor gap. A later controlled evaluation should compare recipient comprehension, prohibited-data leakage, permission scope and missing-signal reporting on the same authorized seeded case; record observed results before marketing benefits.

Privacy declarations do not prove least privilege or absence of processing/transmission. Optional AI use needs destination-specific review; these sources do not justify alleging secret exfiltration or declaring a competitor unsafe. No competitor's implementation, assets, branding or code was copied.

Sample is targeted, not exhaustive. Name “Odoo TraceBridge”, trademark rights, licensing and store availability are **UNVERIFIED**; no first-in-world, Odoo endorsement or legal-clearance claim. Owner must decide whether this scope is worth pursuing (`P00-DIFF`) before Phase 01. See [scope](PRODUCT_SCOPE.md) and [decision register](05_BLOCKERS_AND_DECISIONS.md).
