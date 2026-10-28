# Git branch remediation

**Status: READY_FOR_REVIEW.** Recorded 2026-10-28 (Africa/Cairo). Project progress remains **1/20 master phases; 5/72 micro-phases accepted**. Phase 01.02 is not started.

## Scope and baselines

This documentation-only remediation created clean local branch `feature/sh-project-setup-extension-clean` in `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`. Its HEAD and verified base are `origin/main` at `9a818495593c87ef6d4a1376e7f81be26513e0b5`. The branch is local only and has no commit or remote publication.

The preserved historical source worktree is `/home/https_ali_muhammed/Plementus/Tools` on `feature/sh-project-setup-extension` at `390c9ea7c311f362ea04aad64ed14569161642ec`. It remains unchanged with its two pre-existing untracked `_source` documents. Its historical TraceBridge ancestry remains intact there and was not copied as Git history.

## Migrated inventory and verification

The clean worktree contains 21 unstaged files under `Sh_Project_Setup_extension`: 19 tracked-at-source Markdown documents (`docs/00_PROJECT_STATUS.md` through `12_BROWSER_AUTOMATION_FEASIBILITY.md`, `Phases/PHASE_00.md`, `PHASE_00_01.md` through `PHASE_00_04.md`, and `PHASE_01_01.md`) plus two authoritative source files: `docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md` and `docs/_source/ODOO_SH_PROJECT_SETUP_NEXT_CHAT_HANDOFF.md`.

`git restore --source=feature/sh-project-setup-extension --worktree -- Sh_Project_Setup_extension` restored only the source branch's tracked extension paths. The two source documents were copied only after a scoped literal-secret scan returned no matches. SHA-256 comparison confirmed byte-for-byte equality for all 21 migrated files. The master plan equals its source copy byte-for-byte; local Markdown links resolve; no TraceBridge-only path exists in the extension directory; and `git diff --check` passes.

## Current documentation reconciliation

The current status and handoff now identify the clean worktree and main-based branch as canonical for future tasks. Historical phase reports retain their original branch and baseline statements. The decision register records the clean local integration base while keeping commit, remote publication, remote SHA verification and PR-base review pending.

## Commands and remaining gates

```bash
git -C /home/https_ali_muhammed/Plementus/Tools worktree list --porcelain
git -C /home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean rev-parse HEAD origin/main
git -C /home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean status --short --branch --untracked-files=all
git -C /home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean diff --check
```

Before publication, the owner must authorize staging and a local commit. Remote push, remote branch verification, and any pull-request base review require separate authorization. Application, browser, provider and Phase 01.02 work: **NOT RUN**.

**STOP for ChatGPT acceptance.**
