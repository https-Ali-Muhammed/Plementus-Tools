# Architecture decisions

## ADR-007: Candidate permission and lifecycle design — 2026-11-03 (Africa/Cairo)

**Status: PROPOSED / SECURITY_REVIEW_PENDING / DOCUMENTATION_ONLY; not final approval or implementation authorization.** [BF-04 design and comparison](Phases/phase07/PHASE_07_BROWSER_FIRST_PERMISSION_LIFECYCLE_DESIGN.md) evaluates manual guidance, metadata access, per-tab invocation, optional sites and broad/required hosts. Recommend **candidate M2** for later review: separate human invocation on each selected tab using `activeTab` + `scripting`, with separately consented optional `webNavigation` for guided lifecycle observation; no `tabs` or host declarations. Navigation access can expose metadata beyond selected tabs; application filtering is not a Chrome permission boundary. Without it, use manual guidance/fresh single-tab observation, not a continuing three-tab binding. No permission set is adopted.

**Trade-off and UX proposal.** Three explicit invocations avoid guessed dynamic hosts and persistent site grants but require reselection after drift. A future action handler without a default popup would capture its invoking tab before focusing a dedicated extension review page; the present popup/manifest remain unchanged. Review the UI change separately from ADR-005's scaffold decision. Exact profile context/window/tab/origin/full URL/main-frame/document/navigation binding, current capability and account/target checks are prospective requirements. Same-document routing, reload/redirect, closure/replacement, revocation, UI loss and worker restart invalidate context/approvals; missing/stale observations fail closed. Races are not atomically eliminated; unverifiable targets require manual completion, and possible writes require reconciliation before retry. No durable authority, policy amendment or synthetic execution permission follows.

**Authority and evidence.** ADR-006 and all historical ADR bytes below are preserved. Website sign-in, Chrome access, account rights and immediate per-write approval remain separate; no credential/session extraction or default OAuth/App/PAT/backend/API client. BF-03 is independently accepted and published at `efd5757fcb597848ab48bda8feb4704b6dcaadd3`, per supplied owner instruction, within fixture-only scope. Historical **242 Node PASS; 43 Chrome PASS / 5 SKIP** remain unchanged, including six SIMULATED selection checks; no human-selection evidence or new test run. [Five unverified groups](Phases/phase07/PHASE_07_BROWSER_FIRST_PERMISSION_LIFECYCLE_DESIGN.md#bf-03-observed-cases-and-five-unverified-groups) remain pending. BF-04 **READY_FOR_CHATGPT_REVIEW / DOCUMENTATION_ONLY**; independent review required; Phase 07.03 NOT_AUTHORIZED, production NO_GO.

## ADR-006: Browser-first three-tab owner direction — 2026-11-03 (Africa/Cairo)

**Status:** OWNER_ARCHITECTURE_DIRECTION / SECURITY_REVIEW_PENDING. BF-02 **READY_FOR_CHATGPT_REVIEW / DOCUMENTATION_ONLY**; non-counted prerequisite, not implementation authorization.

**Context and precedence.** The published [owner direction](Phases/phase07/PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md) governs current planning. One Chrome MV3 extension supports the Plementus implementation engineer using three already open, signed-in website tabs in one Chrome profile: GitHub, Odoo.sh (normally signed in using GitHub), and Plementus Odoo. Their actual accounts, rights and behavior remain unverified. **This ADR supersedes ADR-003's API-first route for current implementation planning**, preserving ADR-003's original reasoning below as historical evidence. API-oriented passages in the protected master plan and historical assessments are historical candidates; the owner direction supplies current route precedence without changing the plan's bytes, business requirements or phase gates.

**Decision.** Plan explicit identification/selection of those tabs, ordinary visible website UI navigation and approved form filling, target-specific human approval immediately before each sensitive write, observed results and manual fallbacks. GitHub private-repository and branch work are **CANDIDATE_BROWSER_UI / UNVERIFIED**, rather than a selected REST API implementation. Utilities Gitlink/submodule mutation remains an unverified mechanism with a manual checkpoint, not an invented UI operation. No additional website OAuth, GitHub App, PAT, backend, credential collection or authenticated provider API client is needed by default. GitHub App/backend remains **DEFERRED, not selected or approved**; reconsideration needs separate authorization.

**Four independent boundaries.** Website authentication is already completed by the engineer under the owner-reported starting arrangement. Chrome extension access needs its own least-privilege design/consent and security review. Each site's account separately needs organization/repository/subscription/customer operation rights. Sensitive-write approval is an explicit target/effect confirmation immediately before each write; neither sign-in nor Chrome consent grants that authority. Odoo.sh's GitHub sign-in does not merge the sites' sessions or rights. Never extract, store, replay or convert cookies/session material into API credentials.

**Permissions remain PENDING; no set selected.** `activeTab` is temporary access to the invoked tab, not a blanket three-tab grant; same-origin navigation can retain it, cross-origin navigation or closure revokes it. `tabs`, host permissions, `scripting`, dynamic customer origins and revocation require separate least-privilege review. [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [Tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs), [Scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting). These platform facts prove no website feasibility or policy compatibility. The current permission-free manifest is unchanged.

**Trade-offs and gates.** UI drift, wrong accounts, unknown rights, permission loss and uncertain results require stop/revalidation/manual handoff; a possible write requires reconciliation before any retry. No selector, browser operation, origin grant or execution contract is selected. The accepted local v1 adapter contract and BF-01 fixture evaluator remain disconnected and unchanged; simulated approvals never authorize execution. Protected [security policy](09_SECURITY_AND_SECRETS.md), SEC-01 and Phase 06 restrictions remain binding. Any needed policy change is a separately **PENDING / OWNER DECISION REQUIRED** item, not an exception granted here. [BF-02 report](Phases/phase07/PHASE_07_BROWSER_FIRST_ARCHITECTURE_RECONCILIATION.md) records the preserved sequence, evidence, unresolved decisions and validation gates.

## Historical ADRs and original evidence — preserved

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

Against this local remote-tracking ref, HEAD includes 26 commits beyond the common ancestor. A future PR to that base could include inherited TraceBridge changes. These counts do not establish the live remote main state. The 00.01 live-remote snapshot differs; see the [retrospective](Phases/phase00/PHASE_00_01.md). No fetch or branch correction was performed here.

Decision: preserve the accepted branch and HEAD. The owner/reviewer must choose the integration base and assess inherited changes before future publication. Do not rebase, cherry-pick, reset or switch in 00.02. Exact future PR contents and the cause/timing of historical ref differences remain UNVERIFIED.

## ADR-005: Minimal MV3 baseline: vanilla modules and action popup

**Status:** SELECTED FOR PHASE 02 SCAFFOLD; implementation and browser loading NOT RUN.

**Context.** The extension has no source tree, package manifest, lockfile, build configuration, or extension-local test runner. Phase 01.02 found Node 24.19.0 and a usable Playwright-managed Chrome for Testing, but no usable system Chromium and no project-owned Playwright dependency. The first scaffold must remain understandable, loadable without a build pipeline, and defer unverified site automation.

**Options considered.** Vanilla JavaScript with browser ES modules needs no transpiler or framework. TypeScript improves later static checks but introduces compiler/configuration work before any extension behavior exists. A bundler/framework adds another compatibility and packaging surface without serving the Phase 02 static popup/service-worker goal.

**Decision.** Use vanilla JavaScript ES modules and no build tool or framework for the initial extension. Phase 02 will create only this proposed layout: `manifest.json`; `src/background.js` (event-driven MV3 service worker); `src/popup/{popup.html,popup.js,popup.css}` (action popup); and reserved `src/adapters/`, `src/storage/`, `tests/`, and `fixtures/` boundaries. The initial entry point is a toolbar action popup; a side panel remains deferred until a longer-running workflow is implemented and reviewed.

**Boundaries.** The worker coordinates messages and future non-secret lifecycle events; popup code renders UI and sends validated requests; adapters own provider-specific DOM/HTTP knowledge; storage owns future non-secret run-journal reads/writes; tests exercise pure logic and fixtures separately. No provider adapter, storage schema, content script, or workflow behavior is created by this ADR.

**Permissions and tests.** The initial manifest should declare no permissions and no host permissions. `storage` is deferred until Phase 04. Later host access must be requested only after an explicit user action for confirmed origins (including a separately assessed GitHub API origin); do not use `<all_urls>`. Use Node's built-in `node --test` for future pure-module tests. Add and pin an extension-local Playwright dependency only when Phase 02/05 work is authorized; use a persistent local Chromium context to load the unpacked extension and local fixture/data URLs. The existing host-managed browser is a prerequisite observation, not a project dependency or MV3 test result.

**Trade-offs and unknowns.** This delays TypeScript, bundling, side-panel UX, host patterns, content scripts, adapter selectors, authentication, retention policy, and real-site compatibility. Odoo.sh/Plementus behavior remains CANDIDATE_ONLY / UNVERIFIED; no live-site access or browser extension loading occurred.

## Open decisions

| Item | State | Resolution gate |
|---|---|---|
| Browser/Node/tooling/layout; popup or side panel | Baseline selected in ADR-005; implementation UNVERIFIED | Phase 02 scaffold and later browser evidence |
| Auth flow, GitHub org, permissions and disposable sandbox | OPEN / UNVERIFIED | Phases 07–09 |
| Utility URLs, Gitlinks, paths and public deploy-key handoff | OPEN / UNVERIFIED | Phases 11–12 |
| Host origins, retention and permission/privacy details | OPEN; source security boundaries apply | Later scoped security work and Phase 17 |
| Odoo.sh access, UI/policy, subscription, Production and Staging | UNVERIFIED; live acceptance BLOCKED without access | Phase 18 |
| Plementus fields, permissions and native pl_auth Connect contract | UNVERIFIED; live acceptance BLOCKED without access | Phase 19 |
| Domains/DNS authority, distribution and release | OPEN / UNVERIFIED | Authorized real-demo/release gates |
| Future integration base and inherited TraceBridge history | OPEN / OWNER DECISION REQUIRED | Before Git publication |

The source prohibits collecting passwords, MFA codes, session cookies, private SSH keys and `pl_auth` tokens, or shipping client secrets. This document records those boundaries; 00.03 security/integration deliverables remain NOT STARTED. Current status: [00_PROJECT_STATUS.md](00_PROJECT_STATUS.md).
