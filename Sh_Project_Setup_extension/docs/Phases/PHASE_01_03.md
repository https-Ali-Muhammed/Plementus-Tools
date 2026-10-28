# Phase 01.03: minimal MV3 architecture decision

**Status: READY_FOR_REVIEW.** Recorded 2026-10-28 (Africa/Cairo). **1/20 master phases; 6/72 micro-phases accepted.** Phase 00 and 00.01–00.04 and 01.01–01.02 are accepted per owner. This phase records architecture decisions only; no extension source, manifest, package, dependency, browser extension load, provider access, or Git mutation occurred.

## Preflight and accepted successor

| Check | Actual result |
|---|---|
| Root | `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` |
| Origin | `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| Branch / upstream | `feature/sh-project-setup-extension-clean` / `origin/feature/sh-project-setup-extension-clean` |
| Entry HEAD | `0d7f169b8013e587b637eb7fec1bffb85f1614c7` |
| Entry worktree | clean |
| Baseline relationship | `0d7f169` parent is `47a0fb38171b3b21c7317c787e746c12272059d3` |
| Successor verification | Owner-authored `docs(sh-project-setup): audit local MV3 development tooling`; eight changed paths are documentation only; `git diff --check HEAD^` passed |

## Decision

[ADR-005](../02_ARCHITECTURE_DECISIONS.md) selects vanilla browser ES modules with no TypeScript, bundler, or framework for the first scaffold. The proposed Phase 02 layout is `manifest.json`, `src/background.js`, `src/popup/{popup.html,popup.js,popup.css}`, plus reserved `src/adapters/`, `src/storage/`, `tests/`, and `fixtures/` boundaries.

The initial entry point is an action popup. The background service worker owns future event/message coordination; popup/UI code owns rendering and validated requests; provider adapters own provider-specific selectors or HTTP details; storage owns future non-secret run state; tests remain separate from fixture pages. Side panel, content scripts, adapter behavior, state schema, and workflow behavior are deferred.

## Permissions, tooling, and unknowns

Initial Phase 02 manifest: no permissions and no host permissions. `storage` is deferred to Phase 04. Future host access must use explicit user-triggered optional permissions for confirmed origins; `<all_urls>` is prohibited. The exact Odoo.sh, customer Odoo and Plementus origins remain unverified.

Future pure logic uses Node's built-in `node --test`. A later authorized Phase 02/05 install must add and pin an extension-local Playwright dependency before any unpacked-extension test; the practical approach is a persistent local Chromium context with only local fixture/data URLs. The host's Playwright/browser observation is not a project dependency or MV3 test result.

## Validation and stop point

Read-only validation: root/origin/branch/HEAD/upstream/worktree; successor parent, author, subject and eight documentation-only paths; and `git diff --check HEAD^`. Final documentation validation passed: `git diff --check` returned 0; 105 local Markdown links across 25 files resolved with zero missing targets; the master plan and `PHASE_01_02.md` are unchanged from `HEAD`; and current-record scans found no stale 5/72, 01.02-review, 01.03-not-started, or incorrect `47a0fb3` Phase 01.02 claims.

The exact Phase 01.03 delta is this report plus changes to `00_PROJECT_STATUS.md`, `02_ARCHITECTURE_DECISIONS.md`, `03_CHANGELOG.md`, `04_TEST_EVIDENCE.md`, `05_BLOCKERS_AND_DECISIONS.md`, `06_HANDOFF.md`, `10_TEST_MATRIX.md`, `Phases/GIT_BRANCH_REMEDIATION.md`, and `Phases/PHASE_01.md`. All changes are documentation-only and remain uncommitted by instruction.

Application, MV3, browser extension loading, fixture, provider, and external-site tests: **NOT RUN**. Odoo.sh/Plementus integration remains **CANDIDATE_ONLY / UNVERIFIED**.

**STOP for ChatGPT acceptance of Phase 01.03.**
