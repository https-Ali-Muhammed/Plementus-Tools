# Project handoff

Snapshot: 2026-10-28. **2/20 master phases; 8/72 micro-phases accepted.** Phase 00, Phase 01, 00.01–00.04, 01.01–01.03, and 02.01 are ACCEPTED per owner; 02.02 is READY_FOR_REVIEW. The clean worktree is the canonical location for future Codex tasks. [Project status](00_PROJECT_STATUS.md) is the current progress record; the [master plan](01_MASTER_PLAN.md) preserves its publication-time status and Amendment A verbatim.

## Verified Git and worktree

- Canonical Git root: `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`
- Extension: `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean/Sh_Project_Setup_extension`
- Origin fetch/push: `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`
- Branch/entry HEAD: `feature/sh-project-setup-extension-clean` / `4563f845112311c6bb5fb465741a972b58c1e440`, based on verified `origin/main` at `9a818495593c87ef6d4a1376e7f81be26513e0b5`; remote publication is verified.
- Commit `47a0fb3` published the 22-file migration baseline; owner-created successors added Phase 01 and 02.01 records. No TraceBridge history was imported. Phase 02.02 adds a listener-only module worker and static popup; no permissions, runtime workflow, test, fixture, or package configuration exists. See [Git remediation](Phases/GIT_BRANCH_REMEDIATION.md).

## Key documents

[Requirements](07_REQUIREMENTS_AND_SCOPE.md), [architecture](02_ARCHITECTURE_DECISIONS.md), [contracts](08_INTEGRATION_CONTRACTS.md), [security](09_SECURITY_AND_SECRETS.md), [feasibility](12_BROWSER_AUTOMATION_FEASIBILITY.md), [decisions](05_BLOCKERS_AND_DECISIONS.md), [test evidence](04_TEST_EVIDENCE.md), [test matrix](10_TEST_MATRIX.md), [runbook](11_OPERATIONS_RUNBOOK.md), [Phase 00](Phases/PHASE_00.md), [Phase 01](Phases/PHASE_01.md), [Phase 02](Phases/PHASE_02.md), [02.01 manifest](Phases/PHASE_02_01.md), [02.02 worker and popup](Phases/PHASE_02_02.md), [Git remediation](Phases/GIT_BRANCH_REMEDIATION.md), and [changelog](03_CHANGELOG.md).

## Decisions, evidence and next safe action

The inherited TraceBridge history is absent from the clean branch because it begins at `origin/main`; the prior ancestry blocker is CLOSED. Odoo.sh and Plementus real-demo acceptance remain blocked without authorized access and contracts. Privacy, retention and incident policies remain OPEN. Application/MV3/provider tests are NOT RUN; the Phase 01.02 local Playwright prerequisite smoke check is recorded in its report. Real UI automation is CANDIDATE_ONLY / UNVERIFIED. Fixtures cannot prove real-site behavior.

**STOP for ChatGPT acceptance of Phase 02.02.** Do not start 02.03, change Git history or access a provider without the relevant subsequent request. Recheck root, origin, branch, HEAD and full status on the next turn.
