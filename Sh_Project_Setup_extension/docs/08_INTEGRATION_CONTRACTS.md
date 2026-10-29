# Proposed integration contracts

Phase 05.01 adds the [pure v1 contract](Phases/PHASE_05_01.md) for the three site adapters under an owner-approved offline sequencing exception. It is READY_FOR_REVIEW and does not verify any real provider capability or alter the later integration gates. The historical design text below remains a proposal where no implementation exists.

Status: DESIGN REQUIREMENTS ONLY, not implemented or verified. [Master plan](01_MASTER_PLAN.md) sections 2–3 and 5 are the source. No site, provider or sandbox was accessed in 00.03. Real Odoo.sh, customer Odoo and Plementus UI capabilities are **CANDIDATE_ONLY / UNVERIFIED**.

## Common boundary

A coordinator requests a bounded operation through a site-specific adapter; selectors and provider behavior stay in versioned adapters. Inputs are operation, minimum sanitized parameters, operator-selected origin/account/repository/environment, run/step identity and an approval reference when a write is requested. A proposed result identifies the target, state (`observed`, `manual-attestation`, `unknown`, `blocked` or `failed`), evidence tier, sanitized evidence/error and retry safety. Exact schema and identifiers are OPEN.

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
