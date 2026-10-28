# Phase 00.01: Git preflight and extension branch

**Status: ACCEPTED**, per the owner's Phase 00.02 instruction. Retrospective recorded 2026-10-28. Evidence below separates the prior Codex tool report from checks repeated in 00.02. Acceptance does not imply application functionality.

## Scope and historical Git evidence

The authorized task verified the existing repository and created/switched to a new feature branch from current HEAD while preserving changes. It excluded clone/init, reset/stash/clean, code/docs creation, dependencies, commits and pushes.

| Field | Codex-reported 00.01 evidence |
|---|---|
| Root | `/home/https_ali_muhammed/Plementus/Tools` |
| Origin fetch/push | `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| Original branch | `feature/odoo-tracebridge` |
| Created/current branch | `feature/sh-project-setup-extension` |
| HEAD before/after | `39a6e97e637dd227aadea5529b2d1a80e2d4c531` |
| Initial staged/unstaged tracked changes | None |
| Conflicts / unsafe markers | None found in checked markers |
| Local and live remote branch-name conflicts | None at the time of the check |

Original operation, as shown by the prior tool execution (historical evidence; **do not rerun**):

```text
git switch --no-guess -c feature/sh-project-setup-extension 39a6e97e637dd227aadea5529b2d1a80e2d4c531
Switched to a new branch 'feature/sh-project-setup-extension'
```

Reported complete non-ignored worktree before and after:

```text
?? Sh_Project_Setup_extension/docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md
?? Sh_Project_Setup_extension/docs/_source/ODOO_SH_PROJECT_SETUP_NEXT_CHAT_HANDOFF.md
```

The inspected extension held only `docs/`, `docs/_source/` and these two Markdown files (51,082 and 12,450 bytes). No extension implementation existed in that inspected tree.

## Preserved 00.01 verification output

Prior Codex used Git read commands and in-memory Python SHA-256 comparisons. Before and after matched:

| Check | Reported result |
|---|---|
| HEAD and former branch ref | Both unchanged at the baseline SHA |
| Tracked/untracked file entries | 195 |
| Status SHA-256 | `f7c6dd6ba97a9a69eaaed2163bdd2935b71f6c92f34ed8211a150a5836a8fcf0` |
| Index SHA-256 | `72bd1441198b199023046c8896f48fa21f7edb2e4c8750a829dd2fcdff9a1b02` |
| Staged binary diff SHA-256 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| Unstaged binary diff SHA-256 | `e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855` |
| File bytes/modes manifest SHA-256 | `d487915aeb9605aa589bfae3ce6016ae66027bd7461f3a33148bc17ecfbabdb9` |
| Ignored-file inventory SHA-256 | `7a8a29b1660ecaf5bad27d60204a8a672b0a9d89bffdd05e5becb3367a8c716c` |

The prior `git ls-remote --heads origin` returned exit 0:

```text
530331ccb3c8df63cd5b04f8efa02e40fd253afb refs/heads/develop
39a6e97e637dd227aadea5529b2d1a80e2d4c531 refs/heads/feature/odoo-tracebridge
9a818495593c87ef6d4a1376e7f81be26513e0b5 refs/heads/main
```

These are historical remote values, not a current remote assertion. The prior worktree listing showed one worktree at the expected root. Local refs included `develop`, `feature/odoo-tracebridge`, `main` and corresponding origin refs; the target branch did not yet exist. Codex checked exact, ancestor-prefix and descendant-prefix branch-name collisions.

## Rechecked in Phase 00.02 and remaining limits

00.02 rechecked root, fetch/push origin, current branch, HEAD, prior feature ref, full porcelain status, 195 pre-existing file entries, source sizes and index hash. They match the accepted baseline. The branch-creation event, historical remote values and historical aggregate file hash remain evidence from the prior tool transcript, not a recreation of the 00.01 checks.

Current local `origin/main` resolves to `54018867756fd0a2807f145e65ebe02c3d7a7ea9`, unlike the historical remote main value above. No live remote read/fetch was performed in 00.02; timing/cause of this difference and current live values are UNVERIFIED. See [architecture decisions](../02_ARCHITECTURE_DECISIONS.md) for the integration-base risk.

Git preparation verification: prior Codex reported PASS; owner/ChatGPT acceptance supplied by the user. Application tests: **NOT RUN**. Ignored-file contents: **NOT HASHED**. No browser/provider compatibility or application security claim follows from Git checks.

This retrospective file is a new **00.02 documentation deliverable**, not a file created during 00.01. Next action: review 00.02; see [status](../00_PROJECT_STATUS.md) and [parent Phase 00](PHASE_00.md).
