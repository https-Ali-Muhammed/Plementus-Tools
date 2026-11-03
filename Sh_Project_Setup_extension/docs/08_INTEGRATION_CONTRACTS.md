# Proposed integration contracts

## BF-02 prospective browser-first reconciliation — 2026-11-03 (Africa/Cairo)

**READY_FOR_CHATGPT_REVIEW / DOCUMENTATION_ONLY.** [ADR-006](02_ARCHITECTURE_DECISIONS.md#adr-006-browser-first-three-tab-owner-direction--2026-11-03-africacairo) and the published [owner direction](Phases/phase07/PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md) supersede the historical API-first GitHub proposal below for current planning. No accepted local v1 schema, provider list, result class, evidence tier, export or code contract changes. In particular, v1 does not admit GitHub provider/results; BF-02 adds no GitHub capability or executable operation name.

**Prospective site boundary:** explicitly select the already signed-in GitHub, Odoo.sh and Plementus tabs in one profile; later reviewed site adapters may navigate visible UI, fill approved forms and observe target-specific results. Customer Production/Test pages require separately reviewed origins/context, not inherited three-tab access. All actual selectors, UI paths, rights and outcomes remain **CANDIDATE_ONLY / UNVERIFIED**. BF-01 is independently accepted and published at `02862e8` within offline scope only, per the supplied acceptance; its **29 focused / 242 full PASS** evidence was not rerun here. Fixture binding is neither account verification nor execution authority.

| Independent boundary | Prospective requirement; no runtime implementation here |
|---|---|
| Website authentication | Engineer has already signed into each site; ordinary Odoo.sh GitHub sign-in does not share account/session authority with the extension |
| Chrome extension access | Separately reviewed least-privilege grants and user consent; no permission set selected; denial/removal stops access |
| Website operation authority | Verify each selected account's organization/repository/subscription/customer rights and intended target; sign-in or a visible control is insufficient |
| Sensitive-write approval | Explicit target/effect confirmation immediately before each write; invalidate on context drift; no blanket run approval or synthetic approval as execution authority |

**GitHub route candidate:** ordinary website UI for identifying/selecting a private repository and reviewing repository/branch creation, with rights checks, immediate per-write approval and observed resulting repository visibility/branch revision. Actual support and site-policy compatibility are UNVERIFIED. No additional website OAuth, App, PAT, backend, credential collection or authenticated API client is needed by default. The historical API route is deferred; GitHub App/backend is **DEFERRED, not approved**. No extraction/storage/replay/conversion of site cookies or session material into API credentials, authenticated fetch/XHR proxy, or undocumented provider endpoint.

**Remaining setup sequence:** private repository → Odoo.sh project/Production and actual build/database readiness → Utilities/submodule planning and public deploy-key handoff → approved module installation including `pl_auth` → `develop` plus separately verified neutralized Production-derived Staging → Live/Test domains → Plementus Database INFO → existing native Connect Live/Test verification. Repository attachment is not module installation; a branch is not a database copy; a click is not saved state or a verified connection. Utilities UI mutation is unverified and remains a manual checkpoint. Native Connect remains an operator checkpoint without token/session access; DNS/TLS changes and sign-in/MFA/CAPTCHA require the responsible human.

Before future interaction, bind and recheck exact selected origin/tab/document/frame, account, repository/subscription/customer environment, current permission and approved effect. Navigation, restart, target drift or revoked permission invalidates context/approval. A possible-write timeout/loss requires `RECONCILE_REQUIRED` before any fresh approval/retry; unknown UI/rights requires manual handoff. These are prospective requirements, not new v1 fields or implemented browser operations. [Feasibility](12_BROWSER_AUTOMATION_FEASIBILITY.md#bf-02-prospective-browser-first-feasibility--2026-11-03-africacairo) distinguishes candidates/manual/unsupported behavior; [BF-02](Phases/phase07/PHASE_07_BROWSER_FIRST_ARCHITECTURE_RECONCILIATION.md) records permission sources and pending gates. Protected [security policy](09_SECURITY_AND_SECRETS.md) is unchanged and binding; no credential or SEC-01 exception is inferred.

## Historical local contract and integration proposals — preserved

Phase 05 [parent exit review](Phases/phase05/PHASE_05.md) is **PASS / ACCEPTED** with 05.01–05.04 accepted. Its [pure v1 contract](Phases/phase05/PHASE_05_01.md), five invented provider-like HTML fixtures and [F01–F07 scenarios](../fixtures/scenarios/failure-states.mjs) satisfy local Phase 05 criteria. The recorded full Node suite had **75 PASS**; prior bounded fixture-browser checks had **12 PASS** and **22 PASS**. Mock evidence does not verify real provider behavior. The final product remains an online-capable Chrome extension. Phase 04 runtime-security gates remain unresolved; no Phase 06 or production implementation is authorized. The historical design text below remains a proposal where no implementation exists.

Status of provider integration: DESIGN REQUIREMENTS ONLY, not implemented or verified. The accepted local v1 contract and fixtures do not change this gate. [Master plan](01_MASTER_PLAN.md) sections 2–3 and 5 are the source. No site, provider or sandbox was accessed in 00.03. Real Odoo.sh, customer Odoo and Plementus UI capabilities are **CANDIDATE_ONLY / UNVERIFIED**.

## Common boundary

A coordinator requests a bounded operation through a site-specific adapter; selectors and provider behavior stay in versioned adapters. Inputs are operation, minimum sanitized parameters, operator-selected origin/account/repository/environment, run/step identity and an approval reference when a write is requested. A proposed result identifies the target, state (`observed`, `manual-attestation`, `unknown`, `blocked` or `failed`), evidence tier, sanitized evidence/error and retry safety. Provider-specific extensions beyond the accepted local v1 schema remain OPEN.

Before acting, validate the permitted origin, tab, authenticated account, selected target and current page/state. Deny wrong/unknown origin, missing consent, expired approval, account mismatch, unexpected UI, lost tab and sign-in/MFA/CAPTCHA. Never treat page content as trusted code. Validate response and redact error details; avoid raw customer values and secrets in reports. No action is confirmed merely because a click succeeded.

Read operations may be retried with bounded backoff where safe. A write requires target-specific operator approval immediately before execution. Timeout, navigation or interruption after a possible write produces `RECONCILE_REQUIRED`; inspect the target before any retry. If the result cannot be verified, preserve uncertainty and offer a manual handoff. Explicit denial, unsupported operation and permission/rate-limit errors remain visible; do not bypass them.

## GitHub connector

- **Input:** approved organization/repository/branch, desired read or specific operation and allowed target scope. Authentication method and permission model are OPEN; the current instruction prohibits storing access tokens.
- **Candidate operations:** discover organization/repository permissions, privacy and branches via applicable official GitHub APIs; preview and, only with explicit authorization, create a private sandbox repository or branch. Exact API support, grants, Gitlink and `.gitmodules` mutation mechanisms are UNVERIFIED for this implementation. No fictional submodule endpoint.
- **Output/evidence:** sanitized selected target, read state, relevant immutable revision when observed, response category and evidence tier. A mock is `SIMULATED`; a real approved sandbox operation may be `GITHUB_SANDBOX_VERIFIED` only after observation.
- **Approval/failure:** user grants least privilege and reviews each sandbox write; no live customer write without separate authorization. For missing permissions, conflict, rate limit, unexpected response or unknown write outcome, stop and reconcile or hand off. Never force-update a branch.

## Odoo.sh adapter: CANDIDATE_ONLY / UNVERIFIED

- **Input:** explicitly selected origin, signed-in account, subscription mode, authorized project/repository/branch and requested operation. Subscription references are sensitive and excluded from journal/evidence.
- **Candidate UI operations:** identify the relevant page, guide project creation, repository association, Production readiness, public deploy-key handoff and Staging copy. Real UI, selectors, policy and support remain UNVERIFIED; do not invent platform endpoints. The supplied plan cites the provider FAQ, but current documentation was not checked in 00.03.
- **Output/evidence:** an observed project/build/environment or an explicitly labeled operator attestation, plus evidence tier and safe next step. Verify actual build/database and Staging-copy state separately from Git branch creation. Unknown selectors, target or write result means stop/reconcile and show a manual checkpoint.
- **Approval:** human sign-in and entitlement; explicit approval before project creation, Production, key authorization and Staging/database operations. Customer Production actions require separate scope and authorization.

## Customer Odoo Apps adapter: CANDIDATE_ONLY / UNVERIFIED

- **Input:** approved customer origin, account, Production/Test target and selected module names.
- **Candidate UI operations:** discover requested modules, present an install preview, and observe installed state. No actual selectors or module-state contract have been verified. Repository linkage or an app listing does not confirm installation.
- **Output/failure:** sanitized per-module observed/unknown/manual status with evidence tier; do not record credential/session data. Wrong environment, missing module, approval denial or unknown installation outcome stops and requires operator review/reconciliation.
- **Approval:** explicit Production-install approval and any separate live access authorization; the operator handles sign-in and unexpected prompts.

## Plementus adapter: CANDIDATE_ONLY / UNVERIFIED

- **Input:** approved Plementus origin/account and operator-reviewed Database INFO values. Field names, mapping, permissions and actual native `pl_auth` behavior require authorized inspection.
- **Candidate UI operations:** recognize the relevant form, preview approved values, submit only with operator approval, then verify the observable result. Manual completion remains available when the contract is unknown.
- **Output/failure:** field-level sanitized status and evidence tier; unknown state is never promoted to a successful write. Preserve existing native Connect Live/Test flow as an operator checkpoint; do not invent login/session logic, capture tokens or bypass authentication.

See [security](09_SECURITY_AND_SECRETS.md) for privacy requirements and [feasibility](12_BROWSER_AUTOMATION_FEASIBILITY.md) for operation-specific checkpoints.
