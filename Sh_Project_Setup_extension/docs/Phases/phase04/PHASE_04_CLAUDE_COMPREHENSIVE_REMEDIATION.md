# Phase 04: comprehensive security remediation

**2026-11-02 (Africa/Cairo). BOUNDED_FIXES_READY_FOR_INDEPENDENT_REVIEW. Phase 04: IN_PROGRESS / BLOCKED. Production: NO_GO. Security approval and deployment authorization: NOT GRANTED. Progress unchanged: 5/20 master phases; 22/72 official micro-phases accepted.**

Two disconnected input-boundary defects were reproduced and corrected. The critical cleanup commit-window failure remains **FAIL / OPEN / BLOCKED_REQUIRES_OWNER_SECURITY_DECISION**. Passing diagnostic assertions describe that failure; they do not establish a repair. No cleanup outcome alternative has been selected or approved.

## 1. Verified Git baseline and protected documents

| Baseline check | Observed evidence |
|---|---|
| Working directory and `git rev-parse --show-toplevel` | `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` |
| Branch | `feature/sh-project-setup-extension-clean` |
| Full HEAD | `57c27450936ed283421397e0f7924bab985813dd` |
| Origin fetch and push | Both `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| Configured upstream | `origin/feature/sh-project-setup-extension-clean` |
| Upstream SHA (also checked after fixes) | `57c27450936ed283421397e0f7924bab985813dd` |
| Live remote | `git ls-remote origin refs/heads/feature/sh-project-setup-extension-clean` returned the same full SHA |
| Complete worktree/index | No tracked or staged changes; exactly the expected untracked cleanup outcome proposal |
| Master/source equality | `cmp` exit 0; both SHA-256 `d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91` |

The pre-existing untracked [cleanup outcome contract proposal](PHASE_04_SEC01_CLEANUP_OUTCOME_CONTRACT_DECISION.md) is **UNREVIEWED / NOT ACCEPTED**. Its SHA-256 is `82bd7ce49f7d63c0060d109f1b49d73ba972669699ceeecb45b71623f3782ddb`. It was read and preserved, never overwritten, staged or committed. The exact master plan and canonical source remain unchanged.

The requested `docs/02_ARCHITECTURE.md` does not exist. The existing [architecture decisions](../../02_ARCHITECTURE_DECISIONS.md), referenced by the security documentation and master plan, were read instead. All other requested authoritative documents and primary source/test files were inspected. Historical recovery/admission proposals do not override the later [strict recovery decisions](PHASE_04_SEC01_STRICT_RECOVERY_DECISIONS.md).

No clone, checkout, reset, discard, fetch, pull, staging, commit, push, remote write or history change occurred. The only remote operation was the requested read-only Git identity check.

## 2. Binding invariants and implementation boundary

Authority: [approved SEC-01 policy](PHASE_04_SEC01_APPROVED_POLICY.md), [retention amendment B](PHASE_04_SEC01_RETENTION_AMENDMENT_B.md), [combined A+B decision](PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md), [uncertain-time retention amendment](PHASE_04_SEC01_UNCERTAIN_TIME_RETENTION_AMENDMENT.md), and [security requirements](../../09_SECURITY_AND_SECRETS.md). The current task authorizes independently justified disconnected repairs, not new security policy or runtime activation.

The execution sequence was baseline reproduction, invariant review, failing acceptance tests, minimal fixes, focused/full regression, isolated Chromium verification, and final diff/scope review. The affected surface was mapped before production edits: the factory and `create()` in `checkpoint-service.mjs`; direct callers in the service/cleanup/browser tests; the existing policy validator used inside creation; and this report. No production worker caller imports the service. No export, fixture, configuration, manifest, dependency or persisted schema change is needed.

| Invariant established before production edits | What code/tests can establish; remaining authority |
|---|---|
| Exactly seven persisted fields | `schemaVersion`, `runId`, `state`, `step`, `evidenceTier`, `revision`, immutable `createdAt`; structure tests and real IndexedDB checks cover the tested path. |
| Exact non-renewable expiry | `604800000` ms; updates preserve `createdAt`. No tolerance counts toward expiry. |
| Before an automatic deletion | Whole-store validation, matching key, original same-instance creation bracket, accepted clock sample, wall expiry and conservative monotonic lower bound are required by the candidate. Their sufficiency as real deletion authority remains unapproved. |
| Verified completion | Only transaction `oncomplete` proves the tested transaction committed. A staged deletion, error callback or rejected public promise proves neither commit nor abort. Positive abort evidence and unchanged rows distinguish the explicit abort control. |
| Clock uncertainty | Invalid, rollback, regression, too-wide or excessive-forward observations and expiry disagreement latch blocking. Later plausible time cannot restore authority. Keep 1 ms width, 1.1 ms forward allowance, 0.1 ms precision assumption, both comparisons and existing anchors unchanged. |
| Committed deletion plus uncertainty | Preserve both facts analytically; reject dependent work. Public reporting, sanctioned obligation evidence and discharge rules require owner/security decision. A generic rejection must not imply rollback. |
| Unknown completion | Remains outstanding; neither infer an abort nor automatically retry. A missing callback leaves the current promise pending by source inspection; worker loss also loses volatile knowledge. Durable reconciliation/obligation handling is not implemented. |
| Global gate and fresh work | All five public methods enter the same whole-store gate. An unresolved/restart-uncertain row blocks separate creation. No v1 fallback, held-row admission, clock reset, automatic disposal or fresh-run workaround is introduced. |
| Destructive uncertain disposition | Requires actual authenticated, case-specific project-owner authority and reliable guards. Synthetic callbacks/enums cannot prove that authority; no such path is implemented here. |

## 3. Reproduced defects and root causes

### R1. Cleanup commit-window outcome ambiguity — critical, OPEN

The original six [diagnostic cases](../../../test/sec01-cleanup-commit-window.test.mjs) were run unchanged before editing: **6 PASS, 0 FAIL**. They reproduce the [historical finding](PHASE_04_SEC01_CLEANUP_COMMIT_WINDOW_EVIDENCE.md), including committed deletion plus generic rejection for both backward and excessive-forward wall movement during a held synthetic commit.

`cleanupPass()` samples time, scans/stages deletions in one readwrite transaction, and supplies a pending deleted-ID array. `transaction()` resolves only from `oncomplete`. Each `gate()` waiter then removes those IDs from volatile `known`, samples time again and returns a count. If that sample fails, the deletion has already committed; `safe()` masks that failure with the same generic message used for an abort. The caller receives neither a count nor a retained outcome record. The `known` mutation cannot substitute for owner-controlled retention accounting.

| Controlled case | Committed snapshot | Public response | Analytical evidence only |
|---|---|---|---|
| Normal accepted expiry | Absent after completion | Fulfilled count `1` | `VERIFIED_COMMITTED` at the synthetic transaction tier |
| Invalid/backward time before cleanup | Original row; no transaction starts | Generic rejection; permanent latch | No transaction / clock blocked, not an abort |
| Explicit abort before commit | Original row retained | Generic rejection | `VERIFIED_ABORTED` in this fake's explicit abort control |
| Rollback or excessive forward movement during held commit | Original before release; absent afterward | Generic rejection; permanent latch | `COMMITTED_BUT_CLOCK_UNCERTAIN` |
| Missing/contradictory completion evidence or worker loss at commit | Not established by these controls | A rejection or absence alone cannot classify it | `OUTCOME_UNKNOWN`; remains outstanding |

These labels introduce **no public API values or persisted fields**. In the fake, staged writes become committed data before the completion callback; explicit abort discards staging. The helper waits for transaction start and a scheduler turn, confirms the committed snapshot is unchanged and the public promise unsettled before release. It does not inspect a staged map or directly count completion callbacks. Its controlled scheduler plus snapshots distinguish the tested commit/abort paths; it does **not** simulate lost completion or prove browser scheduling. `tx.onerror` alone is not verified abort evidence.

The two added shared-pass diagnostics exercise create/read/transition/delete/cleanup while that same transaction is pending. Both explicit abort and committed-but-clock-uncertain cleanup reject every waiting call with the generic message. No caller starts its own transaction or creates a fresh row. An independently requested cleanup can follow a **verified abort** under the existing rules; clock uncertainty stays permanently latched. This is additional containment evidence, not outcome repair.

The asynchronous observation gap also remains: a clock can change after the starting sample while commit is pending, or change and revert between samples. Another pre-delete/pre-commit sample cannot prove continuous clock trust or undo a committed deletion. The normal expiry rule cannot be withheld or changed here without selecting an unapproved policy alternative.

### R2. Initialization errors escape sanitization — FIXED, disconnected scope

Originally the factory destructured `{ now, monotonicNow, authorize }` in its parameter list, outside its `try/catch`. Null options rejected with a raw engine TypeError. Throwing getters for each of those three properties exposed the exact injected `synthetic-private-marker` error text. This violates the service's generic-error boundary; no actual secret was used.

The two-case acceptance run failed before production changes: this test observed the raw null-options message instead of `Checkpoint operation failed`. A separate baseline reproduction confirmed the raw marker for all three option getters. Destructuring now happens inside the existing initialization `try/catch`. The regression also covers a revoked proxy and all three throwing getters; each rejects generically without starting a transaction or storing a row. Options and caller signatures retain the same external shape.

### R3. Creation checks a different revision from the inserted copy — FIXED, disconnected scope

Originally `create()` checked `record.revision === 0`, then copied caller input. A same-realm synthetic Proxy can mutate its revision while `evidenceTier` is copied, leaving a structurally valid seven-field payload at revision `1`. The transaction's eligibility validation accepts that revision as structurally valid, so creation could persist a nonzero initial revision. A separate baseline probe also observed both returned and stored revision `1` when successive caller reads differed.

The new regression failed before production changes with `Missing expected rejection`. The revision-zero check now applies to the private copy that will actually be inserted. Existing transactional structure/expiry validation still checks that copy before `add()`. The test proves generic rejection, no inserted row and only the mandatory cleanup transaction; a subsequent ordinary create succeeds at revision zero. No caller input is modified by the service.

R2/R3 are library input-boundary defects demonstrated with synthetic malformed objects. No production message path or provider exploit is claimed: the production worker is still a stub, and proxies are same-realm test inputs rather than browser-message payload evidence.

## 4. Files changed and rationale

Paths are relative to `Sh_Project_Setup_extension/`.

| File | Change |
|---|---|
| [src/storage/checkpoint-service.mjs](../../../src/storage/checkpoint-service.mjs) | Catch option extraction failures inside the existing sanitizer; check initial revision on the copied insertion payload. No cleanup, transaction, clock, recovery, permission or schema logic changed. |
| [test/checkpoint-service.test.mjs](../../../test/checkpoint-service.test.mjs) | Two acceptance regressions, observed failing before the fixes; cover sanitized malformed initialization and copied revision rejection/no insertion. |
| [test/sec01-cleanup-commit-window.test.mjs](../../../test/sec01-cleanup-commit-window.test.mjs) | Preserve the original six diagnostics; add two shared-pass containment cases covering all five public methods. |
| [test/sec01-cleanup-browser.mjs](../../../test/sec01-cleanup-browser.mjs) | Add real extension-origin IndexedDB checks for both repaired input boundaries, using the existing disposable harness. |
| This report | Consolidated baseline, invariants, fixes, evidence, blockers and review handoff. |

The fake IndexedDB, policy validators, seven-field schema, run-record/recovery/transition modules, production background, popup, manifest, permissions, dependencies, fixtures, master/source, historical documents, and unreviewed cleanup proposal are unchanged. No blanket documentation rewrite or progress increment was made.

## 5. Before/after verification

Commands run from `Sh_Project_Setup_extension/`, Node **v24.19.0**, Linux **6.8.0-138-generic**. Counts overlap; focused runs are subsets of the full suite.

| Command / stage | Result |
|---|---|
| Baseline `node --test test/sec01-cleanup-commit-window.test.mjs` | **6 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED**; security invariant still FAIL / OPEN |
| Baseline `node --test test/checkpoint-service.test.mjs` | **32 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED** |
| Baseline `node --test test/*.test.mjs` | **109 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED** |
| New tests before fixes: `node --test --test-name-pattern='initialization sanitizes\|creation rejects a nonzero' test/checkpoint-service.test.mjs` | **0 PASS, 2 FAIL** for the expected raw-error and missing-rejection defects |
| Same targeted tests after fixes | **2 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED** |
| Final focused service run | **34 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED** |
| Final focused commit-window run | **8 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED**; outcome invariant still FAIL / OPEN |
| Final `node --test test/*.test.mjs` | **113 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED** |
| `node --check` on each changed module | Exit 0 for `src/storage/checkpoint-service.mjs`, `test/checkpoint-service.test.mjs`, `test/sec01-cleanup-commit-window.test.mjs`, `test/sec01-cleanup-browser.mjs` |
| `node test/sec01-cleanup-browser.mjs` | **16 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED; remote page requests 0; CLEANUP PASS** |
| `node test/sec01-cp3-browser.mjs` (unchanged script) | **10 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED; remote page requests 0; CLEANUP PASS** |

Browser: installed Playwright Chromium **151.0.7922.34**, executable `/home/https_ali_muhammed/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`. Scripts used test-only MV3 extensions, synthetic rows/authorization and owned disposable profiles. Actual worker stop/reactivation and full browser-process restart were observed; retained old rows stayed unchanged and blocked, including fresh creation. Only fixture/test IndexedDB was changed. Owned temporary profiles were removed by the existing guarded test harnesses; no normal browser profile or real IndexedDB record was accessed or deleted.

The cleanup script's 20,000-bracket observation reported maximum width **0.5 ms**, maximum consecutive discrepancy **1 ms**, zero reversed brackets, 18,150 fractional readings, and 20,000 widths within the cap. These are this run's observations only, not new threshold acceptance or a supported-platform guarantee. The exact seven-day paths use injected values, not seven real days. The unchanged [clock-source verification](PHASE_04_SEC01_CLOCK_SOURCE_VERIFICATION.md), [load assessment](PHASE_04_SEC01_CLOCK_LOAD_ASSESSMENT.md) and [safer-sampling conclusion](PHASE_04_SEC01_SAFER_SAMPLING_DESIGN_ASSESSMENT.md) retain their original dates and results.

**NOT RUN:** lost transaction-completion callback simulation; termination precisely during a pending cleanup commit; real seven-day elapsed-time proof; other browser/OS platforms, OS sleep/wake or clock adjustments; authenticated project-owner approval; device/profile security verification; incident route; production worker/recovery integration; provider/customer/account tests. The existing fake has no lost-completion control, and the lifecycle browser test restarts outside a held cleanup commit. These gaps are not passes. The standalone clock-source/load browser measurements were not repeated because their unchanged criteria and rejected sampling alternatives are not reopened by these fixes; their arithmetic tests run in the full Node suite.

## 6. Related behavior reviewed and residual risks

| Area | Result and practical limit |
|---|---|
| Revisions, terminal states, immutable creation time | Existing Node and browser cases pass; competing transitions serialize, stale revisions/acknowledgments reject. R3 closes the independently reproduced creation gap. |
| Cleanup atomicity and aborts | Staged deletions roll back together in the fake; isolated Chromium also observes abort/unchanged rows. No deletion is reported before transaction completion on the normal accepted path. This does not repair R1. |
| Shared cleanup and `known` bookkeeping | Waiters share a transaction promise; each performs its own post-check and map removal. Tests cover blocking after abort and detected post-commit uncertainty. Pass-wide outcome custody, late entrants, duplicate count interpretation and lifetime loss still need the reviewed contract. No shared-promise rewrite is authorized by these findings. |
| Invalid, corrupt, legacy and mismatched rows | Global scans abort and preserve rows in tested cases. Unknown/restart rows latch uncertainty. No silent repair, migration or destructive fallback was introduced. |
| Clock samples and permanent latch | Existing boundary, fractional, width, rollback, forward, cumulative, stalled-wall and monotonic-pause tests pass. Numerical assumptions remain UNAPPROVED for production; common-mode pauses and between-sample changes are unresolved. |
| Restart uncertainty | Real worker/browser lifecycle tests retain blocked rows; seven fields cannot bridge unobserved elapsed time. Automatic resumption is unavailable and fresh admission beside an unresolved row remains blocked. |
| Unknown completion | `transaction()` conflates `onerror` and `onabort` at the public rejection boundary. Missing callbacks have no explicit reconciliation result; volatile maps/promises do not survive termination. No new outcome/obligation store or inferred abort was added. Absence after restart alone cannot prove safe disposition. |
| Other public methods | Read/create/transition/delete all use the global gate and their existing per-record guards; R1 can affect their prerequisite cleanup. Their own asynchronous commit/response gaps are not proven continuously clock-safe or interruption-safe by these tests. Adding a generic post-write rejection would risk the same committed-outcome ambiguity and is not a repair. |
| Errors and sensitive data | R2 closes the factory's demonstrated raw-error escape. Tested service rejection paths remain exactly `Checkpoint operation failed`; only synthetic markers were used. There is no telemetry, new log, export, extra persisted data or diagnostic channel. This is not a comprehensive production privacy certification. |
| Recovery and replay | `decideSec01Recovery()` always returns blocked decisions, including reported disposition. Synthetic enums grant no authority. v1 recovery/direct repository APIs remain separate; the production background imports neither service nor recovery. No runner/retry/replay was added; production access isolation still requires later verification. |

## 7. Decisions requiring verified owner/security authority

R1 is **BLOCKED_REQUIRES_OWNER_SECURITY_DECISION**. Minimum alternatives, as unapproved proposals only:

1. **A:** Keep generic public errors and authorize a separate sanitized transaction-outcome/retention-obligation process, including evidence location, access, lifetime, case binding and reconciliation after worker loss.
2. **B:** Approve an explicitly blocked structured internal outcome and update guarded callers without converting a committed count into permission. Durable obligation custody and worker interruption still need resolution.
3. **C:** Explicitly revise normal retention behavior to withhold automatic expiry deletion until sufficient timing/transaction assurance exists. This changes the approved normal cleanup requirement and cannot be inferred from a failing test.

No alternative is chosen here. For any alternative, decide the completion-evidence standard, how a known commit with uncertain clock is represented, whether the asynchronous deletion model can authorize expiry at all, and what evidence can discharge an obligation. `oncomplete` alone establishes transaction completion, not continuous time integrity, owner authority or forensic erasure.

Additional **OPEN / NOT VERIFIED** gates remain in the [clock security acceptance packet](PHASE_04_SEC01_CLOCK_SECURITY_ACCEPTANCE_PACKET.md): supported platform/threat model; numerical clock criteria and precision proof; conservative elapsed-time sufficiency and false-block burden; exceptional hold and incident evidence custody; actual authenticated project-owner/case authorization with no delegation; disk encryption, screen lock and protected profile; incident contacts/notification/release procedure; sole guarded worker/recovery integration and v1 isolation; final independent security review and explicit activation authorization. No owner authentication or device/incident acceptance was invented.

## 8. Changes considered and deliberately rejected

- Returning success after a committed deletion despite a failed post-commit clock check, suppressing that sample, or treating generic rejection as rollback: would hide R1 or permit uncertain work.
- Returning new outcome values or persisting outcome/obligation metadata: requires the unapproved A/B contract and privacy/custody decisions; no eighth field or alternate store was added.
- Withholding all normal expiry deletion: would select C and change approved normal retention behavior.
- Adding another clock read as a claimed solution to asynchronous commit: leaves a later observation gap and cannot undo commit.
- Retrying/averaging samples, changing 1 ms/1.1 ms/0.1 ms, resetting anchors/latches, or reinvestigating rejected sampling alternatives: no equivalence proof or owner/security authority.
- Bypassing cleanup, admitting fresh work beside held rows, using v1 recovery or directly deleting uncertain rows: conflicts with binding strict decisions and lacks real owner authority.
- Refactoring functioning service/transaction architecture, activating production, adding permissions, provider calls, remote time/backend or broad status rewrites: unnecessary or prohibited scope.

## 9. Final review and handoff

Final checks passed: every tracked diff reviewed; exact four tracked modifications plus two untracked documents verified; index unchanged; protected proposal hash unchanged; protected source, manifest, master/source and historical SEC-01 documents match `HEAD`; master/source byte equality; `git diff --check`; and report whitespace plus all **18 local Markdown link targets**. Four JavaScript modules and this report are this task's five changed/new files; the sixth worktree entry is the preserved pre-existing untracked proposal. All changes remain uncommitted and unstaged. No permission/schema/master-plan/policy/production integration change or real provider operation occurred.

A separate read-only reviewer found **no actionable critical, important or minor issues in the bounded diff or report**. The reviewer independently ran the service and commit-window Node files: **42 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED**, checked whitespace and the proposal hash, and made no edits. Browser/full-suite/baseline results above are the implementing agent's observations; the reviewer did not rerun them. This is an additional quality check, not owner/security, independent ChatGPT, merge or production authorization. R1 remains critical and OPEN.

**Smallest next action:** independent ChatGPT review of these two bounded fixes and this evidence, followed by a verified owner/security decision on R1's outcome/obligation contract and asynchronous deletion authority. Only after that decision should a focused cleanup implementation change its outcome capture, guarded caller propagation or sanctioned reconciliation handoff. Acceptance must include committed/aborted/unknown/committed-but-clock-uncertain cases, shared and late callers, lost completion and worker interruption, generic errors, no uncertain use/deletion, no fresh-run bypass and obligation preservation. Keep production integration and activation blocked.

Skills actually applied: Ponytail; Superpowers systematic debugging, test-driven development, verification-before-completion and requesting-code-review; the local SEC-01 checkpoint-security skill. Tools used: shell/Node/Git, patch editing and the existing Playwright harnesses through `functions.exec`. WarpGrep and Valyu were not available in this session; no unrelated connector or provider tool was used.

**STOP FOR INDEPENDENT CHATGPT REVIEW. Phase 04 remains IN_PROGRESS / BLOCKED; production NO_GO.**
