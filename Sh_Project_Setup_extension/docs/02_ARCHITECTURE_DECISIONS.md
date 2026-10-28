# Architecture decisions

Date: 2026-10-28. Scope: documentation for micro-phase 00.02; pending review. The owner-approved [source plan](01_MASTER_PLAN.md) and Amendment A define the product. These entries record that direction without implementing it or verifying provider behavior.

## ADR-001: One Chrome MV3 extension

**Status:** APPROVED PRODUCT DIRECTION; implementation NOT STARTED.

Context: operators coordinate customer setup across GitHub, Odoo.sh, customer Odoo and optional Plementus. The authoritative plan supersedes its former Odoo-addon approach.

Decision: build one Chrome Manifest V3 extension. No Odoo addon, backend service, standard Odoo changes, or required local Plementus dependency. Keep the future UI, event-driven service worker, non-secret journal, GitHub connector and origin-scoped site adapters within that product.

Trade-off: MV3 suspension requires checkpoint/recovery design. Popup versus side panel, build layout, browser baseline and tooling remain OPEN for Phases 01–03. A backend or hybrid design would require a later owner-approved scope change.

Evidence: source plan sections 2–3 and handoff sections 1/4. Runtime feasibility: UNVERIFIED.

## ADR-002: Local fixtures and manual checkpoints first

**Status:** APPROVED PRODUCT DIRECTION; runtime UNVERIFIED.

Decision: begin with local fixture pages and mocks. Require human checkpoints for sign-in/MFA/CAPTCHA, permissions, risky writes, unknown UI and uncertain results. Preserve a manual path when automation cannot confirm the target state. Reconcile an unknown write before retrying.

Trade-off: fixtures establish local behavior only. They cannot establish actual provisioning, module installation, Staging database copy, or native Connect behavior. The plan requires explicit evidence tiers: `SIMULATED`, `LOCAL_BROWSER_TESTED`, `GITHUB_SANDBOX_VERIFIED`, `MANUALLY_ATTESTED`, `ODOO_SH_DEMO_VERIFIED`, `PLEMENTUS_DEMO_VERIFIED`.

Evidence: source plan sections 3/5/6. No fixture, browser or application tests ran in 00.02. Real Odoo.sh and Plementus acceptance remains gated at Phases 18/19.

## ADR-003: Official GitHub APIs; candidate site UI adapters

**Status:** APPROVED INTEGRATION DIRECTION; contracts/auth OPEN; site automation UNVERIFIED.

Decision: use documented official GitHub APIs for supported operations, with least privilege and explicit approval before writes. Keep site-specific selectors in versioned adapters. Treat Odoo.sh, customer Odoo and Plementus UI automation as candidate capabilities until authorized demonstrations. Use existing Plementus Connect Live/Test behavior; do not invent `pl_auth` sessions or intercept tokens.

Evidence: the supplied plan cites the Odoo.sh FAQ for the absence of a supported project/branch/rebuild platform API. This phase preserves that source assertion; it does not revalidate current provider documentation or authorize undocumented endpoints. GitHub authentication and sandbox permissions remain OPEN for Phases 07–09; Gitlink/submodule mechanics remain UNVERIFIED for Phases 11–12.

Trade-off: UI changes and missing accounts can force operator assistance. Creating `develop` alone does not verify the plan's intended neutralized Production-derived Staging database. Odoo.sh account/policy/selectors, actual module state and Plementus fields/native Connect contract remain UNVERIFIED.

## ADR-004: Initial branch ancestry and integration base

**Status:** LOCAL ANCESTRY VERIFIED; future integration base OPEN / OWNER DECISION REQUIRED.

Phase 00.01 created `feature/sh-project-setup-extension` from the then-current `feature/odoo-tracebridge` HEAD, `39a6e97e637dd227aadea5529b2d1a80e2d4c531`, as authorized. It did not start from `main`. Both local feature refs still resolve to that SHA in 00.02. The HEAD subject is `feat(tracebridge): add bounded volatile action and navigation capture`.

Current read-only local evidence:

```text
origin/main = 54018867756fd0a2807f145e65ebe02c3d7a7ea9
merge-base HEAD origin/main = 54018867756fd0a2807f145e65ebe02c3d7a7ea9
rev-list --left-right --count origin/main...HEAD = 0 26
```

Against this local remote-tracking ref, HEAD includes 26 commits beyond the common ancestor. A future PR to that base could include inherited TraceBridge changes. These counts do not establish the live remote main state. The 00.01 live-remote snapshot differs; see the [retrospective](Phases/PHASE_00_01.md). No fetch or branch correction was performed here.

Decision: preserve the accepted branch and HEAD. The owner/reviewer must choose the integration base and assess inherited changes before future publication. Do not rebase, cherry-pick, reset or switch in 00.02. Exact future PR contents and the cause/timing of historical ref differences remain UNVERIFIED.

## Open decisions

| Item | State | Resolution gate |
|---|---|---|
| Browser/Node/tooling/layout; popup or side panel | OPEN / UNVERIFIED | Phases 01–03 |
| Auth flow, GitHub org, permissions and disposable sandbox | OPEN / UNVERIFIED | Phases 07–09 |
| Utility URLs, Gitlinks, paths and public deploy-key handoff | OPEN / UNVERIFIED | Phases 11–12 |
| Host origins, retention and permission/privacy details | OPEN; source security boundaries apply | Later scoped security work and Phase 17 |
| Odoo.sh access, UI/policy, subscription, Production and Staging | UNVERIFIED; live acceptance BLOCKED without access | Phase 18 |
| Plementus fields, permissions and native pl_auth Connect contract | UNVERIFIED; live acceptance BLOCKED without access | Phase 19 |
| Domains/DNS authority, distribution and release | OPEN / UNVERIFIED | Authorized real-demo/release gates |
| Future integration base and inherited TraceBridge history | OPEN / OWNER DECISION REQUIRED | Before Git publication |

The source prohibits collecting passwords, MFA codes, session cookies, private SSH keys and `pl_auth` tokens, or shipping client secrets. This document records those boundaries; 00.03 security/integration deliverables remain NOT STARTED. Current status: [00_PROJECT_STATUS.md](00_PROJECT_STATUS.md).
