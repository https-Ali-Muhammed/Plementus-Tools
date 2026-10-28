# Requirements and scope

Status: proposed product requirements from the [approved master plan](01_MASTER_PLAN.md), recorded for 00.03. Implementation and all real-site behavior are UNVERIFIED. Current progress and acceptance are in [project status](00_PROJECT_STATUS.md).

## Eight customer setup workflow groups

1. **Subscription and project:** select an authorized customer subscription or partner trial; the operator supplies the sensitive reference, confirms entitlement, and approves the target Odoo.sh project creation.
2. **Private repository:** select an existing suitable private GitHub organization repository or propose creation of one. The operator signs in, grants scoped access and approves any creation.
3. **Production:** associate the approved `main`/`master` branch with Odoo.sh Production, then wait for and verify its build and database. A branch association or a click is not proof that a build or database is ready.
4. **Utilities:** select authorized private utility repositories, paths and intended revisions. Plan submodule/Gitlink changes; have the operator authorize access and review each write. A public deploy-key handoff may need a manual checkpoint. Attaching a utility repository does not install its modules.
5. **Production apps:** identify `pl_auth` and other selected modules, require approval for Production changes, and verify each requested module's installed state. A visible app or available repository is not proof of installation.
6. **Staging/Test:** prepare `develop` when authorized and arrange Odoo.sh Staging as the intended neutralized Production-derived Test database. Verify the actual copy, environment and selected app state. Creating a Git branch does not create or prove a database copy.
7. **Domains:** collect verified default Live/Test URLs or assist the operator with custom domain coordination. The domain owner controls DNS, TLS and any external changes; those changes require separate authorization.
8. **Plementus:** when its real contract is available, help fill the Project Database INFO form with database name, Live/Test URLs, database user and approved related fields. The operator signs in, reviews changes and uses existing Connect Live/Test; actual `pl_auth` behavior remains UNVERIFIED.

## Required product behavior

- One Chrome MV3 extension offers a setup wizard, input validation, target preview, progress and resumable non-secret journal. Popup versus side panel is OPEN.
- Identify the active site/account, repository, branch and environment before actions; request narrowly scoped origin access with consent. Keep versioned site adapters isolated from the coordinator.
- Present explicit approvals for repository/branch writes, project creation, deploy-key permissions, Production module installs, Staging/database actions and Plementus writes. Operator approval must identify the target and intended effect.
- Observe the resulting state or record a separate operator attestation; distinguish attempted, confirmed, unknown and manually confirmed outcomes. Stop at unknown pages, login/MFA/CAPTCHA or permission failures, with a manual checkpoint.
- Resume after interruption using non-secret checkpoints. Read before safe retry; a possibly completed write requires reconciliation, not a repeated mutation.
- Start with local fixtures and mocks. Fixture results do not establish real site compatibility. Plementus is optional for the core workflow.

## Boundaries, operator responsibilities and open requirements

The extension does not create an Odoo addon or backend, modify standard Odoo, bypass access controls, collect passwords or fabricate Plementus sessions. No unapproved customer/Production write, DNS operation, forced Git push, database restore or public distribution is in scope. The operator controls authentication, MFA, entitlement, approvals, DNS ownership and conflict resolution.

**OPEN / UNVERIFIED:** exact site UI and policy; subscription and demo access; GitHub org/auth/sandbox; host permission model and browser UX; utility paths and access; actual Staging semantics and installed-state evidence; Plementus field mapping and native Connect contract; customer privacy/retention and release/distribution rules. A real Odoo.sh or Plementus claim requires its separately authorized Phase 18 or 19 gate. Refer to [security requirements](09_SECURITY_AND_SECRETS.md), [proposed contracts](08_INTEGRATION_CONTRACTS.md) and [feasibility](12_BROWSER_AUTOMATION_FEASIBILITY.md).
