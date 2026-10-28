# Phase 04.01: Workflow state types and valid transitions

**Status: READY_FOR_REVIEW.** 2026-10-29 (Africa/Cairo). Progress: **4/20 master phases; 14/72 micro-phases accepted.** Phase 03 and 03.04 are ACCEPTED per owner instruction.

## Preflight and scope

Root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`; origin fetch/push `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`; branch `feature/sh-project-setup-extension-clean`; upstream `origin/feature/sh-project-setup-extension-clean`. Entry HEAD `a25bb6b989c3c2f596a2e67b9066f1e58a9e29d0` is the owner-authored Phase 03.04 commit, directly following supplied baseline `1e914f9e3de25d1bf6ade5cd9ee10c896d8475f6`. After the owner removed an unexpected ZIP, the worktree was clean. No Git mutation.

`src/workflow/state.mjs` exports frozen states and transition definitions, a boolean validator, and a deterministic function that returns the destination string or throws a generic error. It accepts only state strings, does not mutate inputs, and handles no customer data or metadata. A JSDoc metadata sketch is a future hook, not a persistence schema or approval to store values; privacy and retention decisions remain open.

| From | Allowed destinations |
|---|---|
| draft | ready, cancelled |
| ready | draft, running, blocked, cancelled |
| running | awaiting_operator, reconcile_required, failed, blocked, completed, cancelled |
| awaiting_operator | running, reconcile_required, blocked, cancelled |
| reconcile_required | ready, blocked, cancelled |
| failed | reconcile_required, cancelled |
| blocked | ready, cancelled |
| completed, cancelled | none (terminal) |

All other transitions, including repeated states and unknown values, fail. These edges describe possible state changes only: the module does not verify prerequisites, operator approval, reconciliation, evidence, or safety to retry. Callers must enforce those requirements in later reviewed phases. In particular, reaching `ready` after reconciliation does not prove reconciliation occurred. No transition executes or retries a provider operation.

## Checks

From the extension directory:

```sh
node --test test/workflow-state.test.mjs test/popup-validation.test.mjs
node --check src/workflow/state.mjs
node --check test/workflow-state.test.mjs
```

From the Git root:

```sh
git diff --check
cmp Sh_Project_Setup_extension/docs/01_MASTER_PLAN.md Sh_Project_Setup_extension/docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md
```

Both syntax checks, the tracked diff whitespace check and master-plan byte comparison passed (exit 0). The diff check does not inspect untracked files.

PASS: 14 tests (5 state, 9 Phase 03 validation regression); FAIL: 0; SKIP: 0. Cases cover all declared edges, every forbidden pair including repeated and terminal states, unknown/non-string inputs, frozen definitions and input immutability, and execution without browser globals. No browser test, persistence, worker restart, workflow execution, provider, network or real-site test was run. Node tests do not establish runtime integration or policy compliance. See [test evidence](../04_TEST_EVIDENCE.md).

Requested-module selection remains a deferred Phase 03 scope gap in the [decision register](../05_BLOCKERS_AND_DECISIONS.md); an owner-approved later implementation must close it before module-installation workflows. No Phase 04.02 work. Stop for ChatGPT acceptance.
