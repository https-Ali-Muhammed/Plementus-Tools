# Phase 04.02: Sanitized run-record persistence foundation

## Preflight exception evidence, captured before implementation

HEAD: `395e3383a2d5ccb94dd5b506f1606c2fea16c7af`.
Preserved report SHA-256: `aa710e425be416c4a5052cf200e9bf60e2792bfca0349819c785817f509440aa`.
Ignored `.idea/workspace.xml` SHA-256: `7b565d979eaa3541fa4f4ab039efcaf3d4a5e5d3a60ab561137cf620ec579e5d`; ignored by `.idea/.gitignore:3`.

Exact `git diff -- Sh_Project_Setup_extension/docs/Phases/PHASE_03_04.md`:

```diff
diff --git a/Sh_Project_Setup_extension/docs/Phases/PHASE_03_04.md b/Sh_Project_Setup_extension/docs/Phases/PHASE_03_04.md
index 869b8b5..458673c 100644
--- a/Sh_Project_Setup_extension/docs/Phases/PHASE_03_04.md
+++ b/Sh_Project_Setup_extension/docs/Phases/PHASE_03_04.md
@@ -1,6 +1,6 @@
 # Phase 03.04: Branches, domains and review summary
 
-**Status: READY_FOR_REVIEW.** 2026-10-29 (Africa/Cairo). **3/20 master phases; 13/72 micro-phases accepted.** Phase 03.03 is accepted per owner instruction. Evidence: **LOCAL_BROWSER_TESTED**.
+**Status: ACCEPTED per owner instruction.** 2026-10-29 (Africa/Cairo). **4/20 master phases; 14/72 micro-phases accepted.** Phase 03.03 is accepted per owner instruction. Evidence: **LOCAL_BROWSER_TESTED**.
 
 ## Preflight and scope
 
@@ -22,4 +22,4 @@ git diff --check
 
 Nine Node tests passed, including prior project, subscription, GitHub and Utilities cases. An initial new test exposed acceptance of a leading-hyphen branch; the validator was corrected and the suite passed. Both JavaScript syntax checks passed. Chrome for Testing 151.0.7922.34 loaded the extension in a disposable profile: regressions, safe rendering of synthetic markup, reference redaction, domain switching, disabled actions, empty permission declarations, no external requests and no console/page errors passed. No screenshots or secrets were recorded. `git diff --check` passed.
 
-Provider, actual branch, DNS, Odoo.sh and live environment tests: **NOT RUN**. Ownership, actual branch existence and database state: **UNVERIFIED**. Stop for ChatGPT acceptance; no Phase 04 work.
+Provider, actual branch, DNS, Odoo.sh and live environment tests: **NOT RUN**. Ownership, actual branch existence and database state: **UNVERIFIED**. Historical review boundary for this phase; Phase 04.01 is now separately requested.
```

## Status and preflight

**READY_FOR_REVIEW** for the isolated foundation; real browser persistence **BLOCKED**. Progress: **4/20 master phases; 15/72 micro-phases accepted**; 04.01 accepted per owner. Git root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`; origin fetch/push `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`; branch `feature/sh-project-setup-extension-clean`; upstream `origin/feature/sh-project-setup-extension-clean`. The exact diff above contains only historical acceptance and review-boundary reconciliation. No other tracked changes, staged changes or untracked files existed at preflight. The owner authorized preserving this diff and the ignored IDE file.

## Schema and boundaries

Schema version 1 requires exactly `schemaVersion`, `runId`, `state`, `step`, `evidenceTier`, and `revision`. IDs must be lowercase version-4 UUID-shaped opaque identifiers, not derived from customer data. `state` is checked against the Phase 04.01 states; `step` is an integer 0–99; evidence is a fixed tier or `none`; revision is a bounded nonnegative safe integer. No arbitrary text, customer data, URL, repository, credential, token, cookie, database identifier, or extra property is permitted. Structural checks cannot prove an identifier was generated randomly: future callers must provide non-sensitive random IDs.

The synchronous injected adapter contract is `get(id)` (null for absence), `insert(record)` (false on duplicate), `replace(record, expectedRevision)` and `remove(id, expectedRevision)` (false on conflict). Replace/remove must compare and mutate atomically. The repository validates every record on read and before mutation, requires revision 0 for create and an increment of one for update, copies records, and returns only a generic error on failure. This is an interface contract, not a proven concurrency implementation: future adapters need atomicity, cross-context/ABA protection, lifecycle and migration design. The repository does not enforce transition edges, approve retries, perform orchestration, or resolve conflicts. It never deletes or overwrites a malformed record as fallback. Its fake adapter exists only in tests.

Retention, deletion, access and encryption policy remains **OPEN / OWNER DECISION REQUIRED**. A separate owner-approved policy and later scoped implementation are required before production storage, permissions or popup/worker connection. Fake delete is test behavior, not a real-data deletion policy. No expiration is implemented.

## Checks

From Git root:

```sh
node --test Sh_Project_Setup_extension/test/run-record.test.mjs Sh_Project_Setup_extension/test/workflow-state.test.mjs Sh_Project_Setup_extension/test/popup-validation.test.mjs
node Sh_Project_Setup_extension/test/popup-03-03-smoke.mjs
node Sh_Project_Setup_extension/test/popup-03-04-smoke.mjs
node --check Sh_Project_Setup_extension/src/storage/run-record.mjs
node --check Sh_Project_Setup_extension/test/run-record.test.mjs
git diff --exit-code HEAD -- Sh_Project_Setup_extension/manifest.json Sh_Project_Setup_extension/src/background.js Sh_Project_Setup_extension/src/popup
cmp Sh_Project_Setup_extension/docs/01_MASTER_PLAN.md Sh_Project_Setup_extension/docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md
```

Node tests: **20 PASS, 0 FAIL, 0 SKIP** (6 record, 5 state, 9 popup). Both syntax checks, runtime/manifest tracked-diff check, and master-plan byte comparison: **PASS**. The original 03.03 Chrome smoke run failed at line 64 because it expected Production disabled; its later assertions were not reached. The narrow repair changed only that expectation to the accepted enabled behavior and added a comment explaining that the script covers earlier Phase 03.03 behavior against the current wizard. Re-execution commands were `node Sh_Project_Setup_extension/test/popup-03-03-smoke.mjs` and `node Sh_Project_Setup_extension/test/popup-03-04-smoke.mjs`; both current attempts stopped before assertions with `browserContext.waitForEvent: Timeout 10000ms exceeded while waiting for event "serviceworker"` (03.03 line 17; 03.04 line 16), including a sequential retry. Browser smoke totals for this execution: **0 PASS, 2 FAIL/BLOCKED, 0 SKIP**. The earlier 03.04 PASS remains historical evidence only. This remains local browser regression evidence only; no real browser persistence, provider, live site, worker restart, concurrency or production storage tests were run.

## Postflight preservation

Postflight checks are recorded below; the preserved report is separate from the Phase 04.02 delta. No commit, push, Phase 04.03 work, provider access or real storage activation is authorized by this phase. Stop for ChatGPT acceptance.

Postflight: the report SHA-256 and its exact Git diff matched the preflight values above; `.idea/workspace.xml` SHA-256 matched and `git check-ignore -v .idea/workspace.xml` again identified `.idea/.gitignore:3`. `git diff --check` passed. `git diff --exit-code HEAD -- Sh_Project_Setup_extension/docs/01_MASTER_PLAN.md Sh_Project_Setup_extension/docs/_source Sh_Project_Setup_extension/manifest.json Sh_Project_Setup_extension/src/background.js Sh_Project_Setup_extension/src/popup` passed. These Git checks cover tracked files; the listed new files are untracked. No staged changes were introduced.

Phase 04.02 delta: `src/storage/run-record.mjs`, `test/run-record.test.mjs`, this report, `docs/Phases/PHASE_04.md`, and `docs/00_PROJECT_STATUS.md`, `03_CHANGELOG.md`, `04_TEST_EVIDENCE.md`, `06_HANDOFF.md`. Separately preserved: the pre-existing `docs/Phases/PHASE_03_04.md` diff and ignored IDE file.
