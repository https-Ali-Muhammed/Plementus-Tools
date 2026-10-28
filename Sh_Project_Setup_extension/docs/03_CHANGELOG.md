# Project changelog

Chronological project record; no entry implies application functionality or live provider verification. Progress is **4/20 master phases; 15/72 micro-phases accepted**; 04.02 is READY_FOR_REVIEW. Current state: [project status](00_PROJECT_STATUS.md).

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

## 2026-10-28: 01.03, accepted

Selected the minimal MV3 baseline: vanilla browser ES modules without a bundler or framework, an action popup, event-driven worker boundary, no initial permissions/host access, and deferred storage/adapters. Node's built-in runner is the future pure-logic baseline; Playwright is deferred until an extension-local dependency is explicitly added for local unpacked-extension/fixture testing. No source, manifest, dependency, browser extension load, provider access, or application test occurred. See [ADR-005](02_ARCHITECTURE_DECISIONS.md) and [01.03 report](Phases/PHASE_01_03.md).

## 2026-10-28: 02.01, accepted

Created the minimal MV3 `manifest.json` with only `manifest_version`, name, and version. Node parsed the JSON and confirmed MV3 required fields, no permissions, host permissions, runtime-file references, or remote code. Browser loading and provider tests did not run. See [02.01 report](Phases/PHASE_02_01.md).

## 2026-10-28: 02.02, accepted

Added the module MV3 worker and the accessible static popup, referenced only by the manifest. Static checks cover manifest references, JavaScript syntax, HTML local paths, absence of permissions and remote code, source preservation, and scoped changes. Browser loading and provider tests did not run. See [02.02 report](Phases/PHASE_02_02.md).

## 2026-10-28: 02.03, accepted

Added local unpacked-installation instructions. Playwright-managed Chrome for Testing 151.0.7922.34 loaded the extension in a disposable profile, registered the worker, rendered the popup's title and status message, and reported empty permissions and host access without page errors. No provider site or account was used. See [02.03 report](Phases/PHASE_02_03.md).

## 2026-10-28: 03.01, accepted

Replaced the static popup with a responsive, scrollable preview-only “Set Up New Customer” wizard shell. It exposes labelled, disabled controls and headings for customer/subscription, GitHub/Utilities, Production/Staging/modules/domains, and review/confirmation; navigation remains disabled. It has no JavaScript, validation, storage, provider connection, or data collection. Static structure/permission checks and the isolated local Chrome popup smoke test passed. See [03.01 report](Phases/PHASE_03_01.md).

## 2026-10-28: 03.02, accepted

Enabled only the customer/project name, subscription mode, and masked subscription-reference inputs. Added a small in-memory browser module and Node tests for required, whitespace, valid customer/partner-trial, and length-limit cases. Inline errors are generic and accessible; the reference is not included in an error, console output, storage, or network request. The local Chrome popup smoke test passed. See [03.02 report](Phases/PHASE_03_02.md).

## 2026-10-29: 03.03, ready for review

Added local GitHub organization, repository selection/name and repeatable optional Utilities fields. Validation covers supported GitHub URLs, credentials, relative paths, and duplicates; Enter cannot submit the form. Node and local Chrome checks passed. No GitHub access or submodule operation occurred. See [03.03 report](Phases/PHASE_03_03.md).

## 2026-10-29: 03.04, ready for review

Reconciled 03.03 as accepted per owner instruction. Added in-memory branch and domain validation and a safely rendered, subscription-reference-redacted summary. Node and local Chrome checks passed; no provider access occurred. See [03.04 report](Phases/PHASE_03_04.md).

## 2026-10-29: 04.01, ready for review

Reconciled Phase 03 and 03.04 as accepted per owner instruction. Added a pure state transition module and Node tests; documented the deferred requested-module selection gap. See [04.01 report](Phases/PHASE_04_01.md).

## 2026-10-29: 04.02, ready for review

Reconciled 04.01 as accepted per owner instruction. Added strict run-record validation and a dependency-injected repository tested with a synthetic in-memory fake. Real browser persistence remains blocked pending policy. See [04.02 report](Phases/PHASE_04_02.md), including the older 03.03 smoke test failure.
