# Phase 04.04: Duplicate and invalid transition protection

**READY_FOR_REVIEW for pure validation and simulation only.** 2026-10-29 (Africa/Cairo). Progress: **4/20 master phases; 17/72 micro-phases accepted.** Per owner instruction 04.03 is **ACCEPTED FOR SYNTHETIC DECISIONS ONLY**. Parent Phase 04 remains **IN_PROGRESS**, not accepted.

## Preflight and scope

Git root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`; origin fetch/push `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`; branch `feature/sh-project-setup-extension-clean`; upstream `origin/feature/sh-project-setup-extension-clean`; HEAD `4a59b8450bb11005524b879ada0d7fd6fb8fea91`, the owner-created 04.03 successor to `e9b0c622`. Worktree was clean, local upstream was equal (0 ahead/behind), and the requested baseline was an ancestor. No fetch was performed. An earlier preflight stopped on uncommitted 04.03 files; the owner then reported pushing, and the clean preflight above was verified.

Existing `canTransition` rejects unspecified, repeated and terminal transitions. Existing repository update validates records and compares revisions, relying on its adapter's atomic compare-and-replace. Neither checks a request's expected state and revision against a transition proposal. `src/workflow/transition-decision.mjs` adds a pure, deterministic boundary: it validates the sanitized record, matches expected state/revision, checks the accepted state machine and returns a copied next-revision proposal requiring operator review. It changes no input or stored record. Errors are generic. Revision overflow fails closed. Cancellation remains a review-required proposal and cannot repeat after cancellation.

The boundary refuses `reconcile_required` to `ready`; it also refuses `blocked` to `ready` because the current schema cannot distinguish a block following an uncertain write. This conservative restriction avoids bypass through blocking. A future separately authorized reconciliation design must establish and validate evidence before enabling resumption; an allowed state-machine edge alone is not proof of prerequisites. The decision does not execute a workflow or retry any operation.

**Limitations:** proposals are snapshots, not locks or globally unique request IDs. Identical proposals can be produced before a record changes; a later update must re-read/validate and use an atomic revision check. Tests demonstrate a single winner using the fake adapter, not real concurrency. The existing repository is a low-level storage interface and does not enforce transition rules on direct updates; this boundary is not connected to runtime. No guarantee is made for callers bypassing it. Actual conflict protection, operation reconciliation, identity/origin checks and provider side effects require later implementation and verification.

## Checks

Executed from Git root:

```sh
node --test Sh_Project_Setup_extension/test/*.test.mjs
node --check Sh_Project_Setup_extension/src/workflow/transition-decision.mjs
node --check Sh_Project_Setup_extension/test/transition-decision.test.mjs
cmp Sh_Project_Setup_extension/docs/01_MASTER_PLAN.md Sh_Project_Setup_extension/docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md
git diff --check
git diff --exit-code HEAD -- Sh_Project_Setup_extension/manifest.json Sh_Project_Setup_extension/src/background.js Sh_Project_Setup_extension/src/popup Sh_Project_Setup_extension/docs/01_MASTER_PLAN.md Sh_Project_Setup_extension/docs/_source
```

**PASS:** 27 Node tests (23 existing and four new), 0 FAIL, 0 SKIP. Cases cover duplicate and repeated cancellation, unknown and invalid states, stale state/revision, competing proposals and atomic fake-adapter rejection, terminal states, uncertain operations and input immutability. Syntax checks, master-plan byte equality, protected tracked-file comparison, and whitespace check: **PASS**. Browser smoke: **NOT RUN**, because the isolated pure module is not connected to the browser; 04.03's historical browser evidence is preserved. Real durable storage, real concurrent updates, worker restart/tab closure, provider actions and actual replay prevention: **NOT RUN / UNVERIFIED**.

## Durable-state acceptance gate

Real storage is **BLOCKED / OWNER DECISION REQUIRED** for retention, deletion, access and encryption policy. Actual Phase 04 acceptance requires the approved policy, a separately scoped real durable storage and recovery implementation, atomic conflict handling, and observed Chrome worker restart and tab-close tests covering checkpoint integrity, reconciliation and uncertain-write safety. Synthetic tests cannot satisfy this gate. No permissions, dependencies, provider calls, background retries, Git commit/push or Phase 05 work were added.

**STOP for ChatGPT acceptance of Phase 04.04.**
