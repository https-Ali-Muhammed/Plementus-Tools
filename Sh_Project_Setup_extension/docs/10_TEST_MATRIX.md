# Planned test matrix

All product tests below are **PLANNED / NOT RUN**. There is no extension implementation or verified browser/tooling baseline in Phase 00. Documentation and Git checks actually executed are recorded separately in [test evidence](04_TEST_EVIDENCE.md) and [00.04 report](Phases/PHASE_00_04.md).

| Coverage | Planned cases | Prerequisite / future evidence | Current result |
|---|---|---|---|
| Unit | Validate wizard inputs, branches, duplicate paths, run state and invalid transitions. | Node built-in `node --test` selected in ADR-005; implementation and exact commands/counts remain future work. | NOT RUN |
| Integration | Coordinator/adapter results, approvals, origin/account guards, redacted failure paths. | Adapter contracts and test doubles. | NOT RUN |
| Fixture UI | Fake Odoo.sh, customer Odoo and Plementus pages; unknown pages, module states and staging-copy scenarios. | Explicit fake local pages; `SIMULATED` evidence only unless browser execution is observed. | NOT RUN |
| MV3 / permissions | Manifest and unpacked loading; optional permissions, expected host scope, worker startup. | Approved scaffold plus extension-local pinned Playwright and persistent local Chromium context; capture environment. | NOT RUN |
| Security | Input/message validation, origin isolation, XSS, permission denial, least privilege and no sensitive data in storage/logs/screenshots. | Implementation plus approved data policy; security review does not by itself prove provider security. | NOT RUN |
| Interruption / recovery | Worker suspension, tab loss, navigation, pause/resume, timeout and uncertain writes without blind retry. | Reproducible fixture state and reconciliation paths. | NOT RUN |
| GitHub mocked | Discovery, missing rights, conflicts, rate limits and unknown write result. | Approved auth design and mocks; no live capability implied. | NOT RUN |
| GitHub sandbox | Read and explicitly approved disposable repository/branch writes; observe target and reconcile results. | Owner-approved sandbox, identity, scope, permissions and recovery; record actual provider evidence. | NOT RUN / access UNVERIFIED |
| Odoo.sh real demo | Authorized project, Production readiness, utilities, installed modules and actual neutralized Staging copy. | Phase 18 gate, authorized account, entitlement, scope, cost and recovery plan. | NOT RUN / BLOCKED without access |
| Plementus real demo | Actual Database INFO fields and native Connect Live/Test behavior. | Phase 19 gate, authorized demo account and verified `pl_auth` contract. | NOT RUN / BLOCKED without access/contract |

The evidence tiers `SIMULATED`, `LOCAL_BROWSER_TESTED`, `GITHUB_SANDBOX_VERIFIED`, `MANUALLY_ATTESTED`, `ODOO_SH_DEMO_VERIFIED`, `PLEMENTUS_DEMO_VERIFIED` describe future results only when observed. Record exact environment, command, exit status, counts, limitations and sanitized evidence when a test actually runs. Fixture success is not live proof. See [security](09_SECURITY_AND_SECRETS.md), [feasibility](12_BROWSER_AUTOMATION_FEASIBILITY.md) and [blockers](05_BLOCKERS_AND_DECISIONS.md).
