# Project handoff

Snapshot: 2026-10-28. **3/20 master phases; 10/72 micro-phases accepted.** Phase 00, Phase 01, Phase 02, 00.01–00.04, 01.01–01.03, and 02.01–02.03 are ACCEPTED per owner; 03.01 is READY_FOR_REVIEW. The clean worktree is the canonical location for future Codex tasks. [Project status](00_PROJECT_STATUS.md) is the current progress record; the [master plan](01_MASTER_PLAN.md) preserves its publication-time status and Amendment A verbatim.

## Verified Git and worktree

- Canonical Git root: `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`
- Extension: `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean/Sh_Project_Setup_extension`
- Origin fetch/push: `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`
- Branch/entry HEAD: `feature/sh-project-setup-extension-clean` / `d192c67499f0388677ac01c98a166c06efb5fe20`, based on verified `origin/main` at `9a818495593c87ef6d4a1376e7f81be26513e0b5`; remote publication is verified.
- Commit `47a0fb3` published the 22-file migration baseline; owner-created successors added Phase 01 and 02.01–02.02 records. No TraceBridge history was imported. Phase 03.01 adds a preview-only wizard shell and isolated Chrome smoke evidence; no permissions, runtime workflow, fixture, package configuration, collection, or persistence exists. See [Git remediation](Phases/GIT_BRANCH_REMEDIATION.md).

## Key documents

[Requirements](07_REQUIREMENTS_AND_SCOPE.md), [architecture](02_ARCHITECTURE_DECISIONS.md), [contracts](08_INTEGRATION_CONTRACTS.md), [security](09_SECURITY_AND_SECRETS.md), [feasibility](12_BROWSER_AUTOMATION_FEASIBILITY.md), [decisions](05_BLOCKERS_AND_DECISIONS.md), [test evidence](04_TEST_EVIDENCE.md), [test matrix](10_TEST_MATRIX.md), [runbook](11_OPERATIONS_RUNBOOK.md), [Phase 00](Phases/PHASE_00.md), [Phase 01](Phases/PHASE_01.md), [Phase 02](Phases/PHASE_02.md), [Phase 03](Phases/PHASE_03.md), [03.01 wizard layout](Phases/PHASE_03_01.md), [Git remediation](Phases/GIT_BRANCH_REMEDIATION.md), and [changelog](03_CHANGELOG.md).

## Decisions, evidence and next safe action

The isolated Chrome smoke test loaded the unpacked extension in a disposable profile, registered its service worker, and verified the preview-only wizard's headings, labels, disabled controls/actions, and empty permission baseline. Odoo.sh and Plementus real-demo acceptance remain blocked without authorized access and contracts. Privacy, retention and incident policies remain OPEN. Provider tests are NOT RUN. Real UI automation is CANDIDATE_ONLY / UNVERIFIED. Fixtures cannot prove real-site behavior.

**STOP for ChatGPT acceptance of Phase 03.01.** Do not start Phase 03.02, change Git history or access a provider without the relevant subsequent request. Recheck root, origin, branch, HEAD and full status on the next turn.
