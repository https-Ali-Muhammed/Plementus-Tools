# Project changelog

Chronological project record; no entry implies application functionality or live provider verification. Progress is **1/20 master phases; 6/72 micro-phases accepted**; 01.03 is READY_FOR_REVIEW. Current state: [project status](00_PROJECT_STATUS.md).

## 2026-10-28: 00.01, accepted

Codex reported verifying the existing Git root, origin, branch, HEAD and worktree, then creating `feature/sh-project-setup-extension` from `feature/odoo-tracebridge` at `39a6e97e637dd227aadea5529b2d1a80e2d4c531`. The two untracked source documents were preserved. This was Git preparation only. The owner subsequently reported acceptance. Historical evidence and limits: [00.01 retrospective](Phases/PHASE_00_01.md).

## 2026-10-28: 00.02, accepted

Created status, verbatim master plan, architecture decisions, the parent report and the 00.01 retrospective. Prior Codex reported documentation/source/20–72 checks and worktree preservation; no application tests ran. The owner reported acceptance and created documentation-only commit `881d431371c75afebebddc6984c2626e5623518a`. See [00.02 retrospective](Phases/PHASE_00_02.md).

## 2026-10-28: 00.03, accepted

Created requirements, integration, security and feasibility documents and the 00.02/00.03 reports; updated status and the parent report. Prior Codex reported source preservation, ordered counts, 44 local link targets and scoped pattern checks. The owner reported acceptance and created documentation-only commit `d7a3a5ee6c07eacc2810402e6e8d687e9c2c0b73`; 00.04 verified its direct parent and eight-path delta. Historical checks and limitations: [00.03 report](Phases/PHASE_00_03.md).

## 2026-10-28: 00.04, accepted

Added this changelog, [test evidence](04_TEST_EVIDENCE.md), [blockers and decisions](05_BLOCKERS_AND_DECISIONS.md), [handoff](06_HANDOFF.md), [test matrix](10_TEST_MATRIX.md), [operations runbook](11_OPERATIONS_RUNBOOK.md), and [00.04 report](Phases/PHASE_00_04.md). Updated status and parent Phase 00. No extension code, browser operation, provider access or Git mutation. Documentation checks and actual results are recorded in the 00.04 report. The owner subsequently accepted 00.04 and parent Phase 00.

## 2026-10-28: 01.01, ready for review

Read-only inventory verified the current feature branch, upstream, worktree, documentation-only 00.04 successor commit, extension contents and tracked/untracked/ignored states. It found 18 tracked documentation files, 1 new untracked Phase 01.01 report, and 2 preserved untracked source Markdown files; no extension implementation, manifest, test, fixture or package configuration exists. It also recorded that the branch remains 29 commits ahead of `main` and 3 ahead of the inherited TraceBridge tip. See [01.01 inventory](Phases/PHASE_01_01.md). No application, browser, provider, package-manager or Git mutation occurred.

## 2026-10-28: clean-branch remediation

Historical remediation created local branch `feature/sh-project-setup-extension-clean` from `origin/main` at `9a818495593c87ef6d4a1376e7f81be26513e0b5` and migrated 19 extension documents plus two authoritative source Markdown files from preserved `feature/sh-project-setup-extension`; all 21 migration-file hashes matched. At that historical point it was unpublished. Later, owner commit `47a0fb38171b3b21c7317c787e746c12272059d3` published the 22-file baseline; owner-created successor `0d7f169b8013e587b637eb7fec1bffb85f1614c7` published the 01.02 documentation records. See [Git remediation](Phases/GIT_BRANCH_REMEDIATION.md).

## 2026-10-28: 01.02, ready for review

Read-only tooling audit verified the requested root, origin, branch, upstream, expected HEAD `47a0fb38171b3b21c7317c787e746c12272059d3`, clean worktree, remote feature publication and `origin/main` ancestry. It recorded Ubuntu 22.04.5 x86_64, Node 24.19.0, npm 11.17.0, pnpm 11.25.0, Corepack 0.35.0, absent Yarn, unavailable system Chromium Snap wrapper, and a usable local Playwright-managed Chrome for Testing 151.0.7922.34. The extension remains documentation-only with no package/build/test setup. See [01.02 audit](Phases/PHASE_01_02.md). No installation, external-site access, Git mutation, application test, or 01.03 work occurred.

## 2026-10-28: 01.03, ready for review

Selected the minimal MV3 baseline: vanilla browser ES modules without a bundler or framework, an action popup, event-driven worker boundary, no initial permissions/host access, and deferred storage/adapters. Node's built-in runner is the future pure-logic baseline; Playwright is deferred until an extension-local dependency is explicitly added for local unpacked-extension/fixture testing. No source, manifest, dependency, browser extension load, provider access, or application test occurred. See [ADR-005](02_ARCHITECTURE_DECISIONS.md) and [01.03 report](Phases/PHASE_01_03.md).
