# BF-07: Offline three-tab selection and invalidation state machine

2026-11-03 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW / OFFLINE_SIMULATED.** Only the owner's exact nine-path BF-07 scope is authorized. Independent review is required before any continuation. This is a non-counted disconnected prerequisite, not official Phase 07.03 or production integration.

## Authority and bounded implementation plan

[BF-06](PHASE_07_BROWSER_FIRST_SELECTION_INVALIDATION_DESIGN.md) is accepted/published as a design at `8782133a9130f312fdd16567f31c064e4cdbde4e` (`8782133`), per the supplied BF-07 instruction. Git verifies publication, not review authority. Its original report and prospective [ADR-008](../../02_ARCHITECTURE_DECISIONS.md#adr-008-candidate-three-role-selection-and-invalidation--2026-11-03-africacairo) remain verbatim, including original pending-review/unimplemented wording. No production implementation, permission/UI adoption or security approval follows. [BF-04](PHASE_07_BROWSER_FIRST_PERMISSION_LIFECYCLE_DESIGN.md)/ADR-007 remain candidate permission designs.

The authorized-spike exception to Superpowers brainstorming applies. The owner's existing BF-06 design, exact deliverables, execution/TDD instructions and stop boundary override extra plan artifacts, worktrees, commits and later phases. This bounded plan uses writing-plans guidance within this authorized report.

- [x] Recheck exact Git identity/live tip and linked worktrees; leave the owner-approved `.idea/plemo-chats.xml` dirty exception untouched. Its later external drift is recorded below; byte-for-byte stability cannot be claimed. Never read/hash ignored `.idea/workspace.xml`.
- [x] Read governing BF-06/ADR-008, BF-04/ADR-007, BF-01 code/tests, BF-03/BF-05/R1, security/contracts, Phase 04/06, master and current tracking.
- [x] Write Node tests first; observe RED before implementing successful transitions.
- [x] Implement one disconnected `createSelectionInvalidation(config)` factory exposing `snapshot()` and `dispatch(event)`; no other module/caller/config/export/fixture/dependency changes.
- [x] Verify explicit three-role selection, one-use requests, global invalidation, generations, restart/manual/cancel behavior and adversarial input/reentrancy; run focused/full Node and syntax checks.
- [x] Insert current records in only six tracking documents, preserving every prior body; verify exact scope, protected bytes, index/history, master equality, Markdown links, whitespace/newlines; stop for independent review.

Scope reaches only the new [module](../../../src/browser/selection-invalidation.mjs), [tests](../../../test/selection-invalidation.test.mjs), this report and six tracking inserts. No caller, runtime export, manifest, popup, worker, adapter, contract, policy, fixture or dependency needs modification. Inputs are invented SIMULATED event descriptions; this module cannot verify a genuine gesture, browser sender, site account, permission or lifecycle observation. All outcomes must keep account/execution false and OFFLINE_SIMULATED.

## Git identity and approved exception

| Field | Observed value |
|---|---|
| Root | `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` |
| Extension | `Sh_Project_Setup_extension` |
| Branch | `feature/sh-project-setup-extension-clean` |
| Fetch and push origin | `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| HEAD / upstream SHA / live remote branch tip | `8782133a9130f312fdd16567f31c064e4cdbde4e` |
| Upstream | `origin/feature/sh-project-setup-extension-clean`; divergence 0/0 |
| Complete entry inventory | One unstaged tracked modification: `.idea/plemo-chats.xml`; zero staged/untracked entries |
| Linked worktrees | This root at `8782133`; sibling `/home/https_ali_muhammed/Plementus/Tools`, branch `feature/sh-project-setup-extension`, HEAD `390c9ea7c311f362ea04aad64ed14569161642ec`; no sibling operation |
| Baseline and logs | `/tmp/bf07-ofostnr1/`; 231 tracked baseline hashes, index/entries, refs/reflog and worktree inventory |

The initial dirty-file mismatch correctly stopped BF-07. The owner then explicitly instructed “ignore it and continue the BF-07,” authorizing this sole exception. No authored edit to that file. Its preflight SHA-256 was `7e380862ef2ef791fa4f2e17ddb2898d6cd39b32f8fbe61247c0610224c88269`; later observed SHA-256 `d21e498a38b4efc27a21702035552f9bc1b910bbb9eee6878f4168dd1a5fe0db`. It changed outside the implementation edits; no restoration/overwrite was attempted. Final checker records the current hash separately. The exact nine-path claim describes BF-07 authored files; full Git status also includes this approved external exception.

No clone, checkout, fetch, reset, stash, stage, commit or push. The only network queries were the explicitly required read-only `git ls-remote` publication checks. No web research, Chrome launch, real tab/site/account inspection, browser/provider API, website automation or credentials. Ignored `.idea/workspace.xml` was excluded from every content read, hash and edit.

## Small public API and synthetic input contract

The sole named export is `createSelectionInvalidation(config)`. It returns a frozen `{ snapshot, dispatch }` API. Invalid configuration creates a permanently unsupported MANUAL_FALLBACK instance, with generic outcomes rather than raw exceptions. Configuration requires exactly `{ expectedOrigins: { plementus, github, "odoo-sh" }, lifecycleCoverage: true }`. Origins are explicit, canonical, distinct HTTPS origins. Plementus/Odoo.sh are restricted to invented `.example` hosts; GitHub is exactly `https://github.com`, used as a string only. No origin is visited. These fixture limits follow BF-01's conservative offline boundary; they are not a dynamic real-site configuration contract.

`snapshot()` returns a fresh frozen display object. `dispatch({ type, context: machine.snapshot().context, ...fields })` accepts only exact own enumerable data fields on plain records. Accessors, hidden/symbol/extra fields, exotic objects, missing fields and reflection failures are refused generically. The frozen `context` object contains worker/review/context generations and must be the same live object, not an equal clone. The request token similarly requires same-instance identity. Neither is a credential, genuine browser context or execution capability; these objects cannot be serialized and restored into authority.

| Event | Additional exact fields | Effect / guard |
|---|---|---|
| `invoke` | `source: "SIMULATED"`, `candidate: metadata` | Capture remains unassigned; no origin-derived role. A second unassigned capture replaces the first. Recapturing any already-selected ID invalidates immediately, before reassignment |
| `assign` | `role`, `targetConfirmed: true` | Consume capture once into CONTEXT_UNVERIFIED; role/origin must agree, role and tab must be unique. A conflicting/malformed assignment invalidates occupied context |
| `beginObservation` | `role`, `before: metadata` | Only an assigned same-identity role, with no pending request for that role. Withdraw its verified display before returning one frozen request token |
| `completeObservation` | `request`, `after: metadata`, `readSucceeded: true` | Accept the exact pending token once; check active identity, usable context and exact pre/post URL; consume/discard URL and token. Bad current evidence globally invalidates |
| `uncertain` | `tabId`, `reason` | Selected/captured ID only: increment global context generation, discard all requests/URL comparators/capture/bindings, mark occupied roles and any capture STALE_OR_UNCERTAIN |
| `reselect` | none | Only after invalidation; STALE_OR_UNCERTAIN → RESELECTION_REQUIRED. Empty roles stay UNBOUND; no old binding is restored; fresh invocations/assignment/observations required |
| `manual` | none | Clear all automated observation context to MANUAL_FALLBACK; never attest account/operation success |
| `coverageLost` | none | Clear to MANUAL_FALLBACK and latch synthetic navigation-coverage loss for this instance. A new review/restart cannot restore it; a separately configured new simulation is required |
| `newReview` | none | Manual mode only, with originally valid configuration and no coverage-loss latch; new review epoch, all roles UNBOUND |
| `cancel`, `reviewLost`, `reviewRestart` | none | Clear all context to UNBOUND, new review/context generations; unsupported/coverage-lost instance stays manual |
| `workerRestart`, `browserRestart` | none | Also increment worker generation; all old messages/results unusable. These are explicit synthetic stimuli, not simulated Chrome API callbacks or actual lifecycle observations |

Metadata requires exactly `tabId`, `windowId`, `frameId`, `documentId`, `origin`, `url`, `permission`, `status`, `documentLifecycle`, `pendingNavigation`, `discarded`, `incognito`, `pageKind`, `privacySafe`. Tab/window IDs are positive safe integers; frame is 0. Document IDs are bounded nonempty printable opaque strings, with no UUID-format or invented Tab.documentId claim. Origins match configured origins; URL is canonical HTTPS without userinfo, at most 2048 characters. Permission is `granted`, status `complete`, lifecycle `active`, pending/discarded/incognito false, page kind `supported`, privacySafe true. Every value is a caller-supplied synthetic assertion; none proves runtime access, safe page content or account identity. Unsupported initial capture offers manual fallback; missing/contradictory selected observation invalidates globally.

Supported generic uncertainty reasons are `navigation`, `reload`, `history`, `fragment`, `cross_origin`, `permission_lost`, `tab_closed`, `tab_replaced`, `window_changed`, `document_mismatch`, `target_ambiguous`, `observation_gap`, `timeout`. Unrelated valid ID events are dropped. A same-origin/same-URL signal still invalidates. There is no clock, TTL, timer or automatic timeout producer; callers explicitly model an observation gap/timeout. Returning to an earlier URL or retaining a synthetic grant cannot restore bindings.

Binding identity is copied into private memory; no caller-owned mutable object is retained. URLs exist only as local metadata during admission and as pending pre/post comparators, never binding fields or stable hashes. A successful completion, invalidation, manual fallback or reset discards pending comparator values. One pending request per role permits separately correlated synthetic reads; each completion must match its own binding, regardless of another role's request. An old consumed token cannot fulfill a later observation. The single global generation invalidates selection/navigation context together; immutable bindings cannot be reassigned without discarding the review, so separate per-slot generation counters add no acceptance path here.

The aggregate predicate requires all three explicit role slots CONTEXT_VERIFIED_READ_ONLY with no pending request, unassigned capture, stale flag or manual mode. It is a momentary synthetic observation verdict. Each role may use a different explicitly chosen normal window; moving a role's tab invalidates it and every occupied role. Missing roles cannot aggregate. STALE_OR_UNCERTAIN remains visible until the explicit `reselect` step; that step performs no read, retry or restoration.

Every public snapshot/dispatch outcome contains `accountVerified: false`, `executionAuthorized: false`, `evidenceTier: "OFFLINE_SIMULATED"`. Output consists only of generic acceptance/reason, state labels, aggregate boolean and frozen correlation counters/tokens. No URL, origin, tab/window/document ID, customer/account/target value, credential, raw input/error or mutable internal state is returned. A dispatch lock plus post-reflection context check rejects adversarial proxy reentrancy before any outer admission can commit. This assumes ordinary unmodified JavaScript built-ins; it is not a hardened sandbox against arbitrary code replacing platform intrinsics.

## TDD and measured verification

Commands ran from the extension root with **Node v24.19.0**, built-in `node:test`/`node:assert`, no dependencies installed. All test stimuli and results are **OFFLINE_SIMULATED**, including navigation, reload, grant loss, worker/review/browser restart and proxy/mutation checks. No LOCAL_BROWSER_TESTED label is earned.

| Stage / command | Actual result and artifact |
|---|---|
| Tests written before module; `node --test test/selection-invalidation.test.mjs` | Expected module-missing startup failure, **0 PASS / 1 FAIL**; `red-missing-module.txt`. This alone is not behavioral RED |
| Same focused command against inert TDD starting implementation | **5 PASS / 37 FAIL**, 42 tests; `red-behavior.txt`. Failures show missing successful transitions/invalidation/restart/acceptance. Original shell wrapper ended with `tail`, so that Node exit code was not retained |
| First implemented focused run | **42 PASS / 0 FAIL**, exit 0; `green-first.txt` |
| Expanded self-review regressions before fixes | **42 PASS / 4 FAIL**, 46 tests, exit 1; `red-review.txt`. Unsupported-capture manual fallback, immediate selected-tab recapture invalidation, visible unassigned-capture invalidation and coverage-loss non-restoration failed |
| Focused GREEN after those fixes | **46 PASS / 0 FAIL**, exit 0; `green-review.txt` |
| Unchanged existing Node suite, excluding only the new test file | **242 PASS / 0 FAIL**, exit 0; `existing-suite.txt` |
| `node --test test/*.test.mjs` | **288 PASS / 0 FAIL**, exit 0; `full-suite.txt` (242 existing + 46 new) |
| `node --check src/browser/selection-invalidation.mjs` | **PASS**, exit 0; `syntax-module.txt` |
| `node --check test/selection-invalidation.test.mjs` | **PASS**, exit 0; `syntax-test.txt` |

All GREEN runs have **0 SKIP / CANCELLED / TODO**. Tests exercise explicit three-role success/missing/duplicate selection, no origin inference, target confirmation, metadata at all three boundaries, exact URL/document/window identity, unsupported schemes/context, all thirteen uncertainty categories, global pending-request disposal, stale/duplicate/unsolicited/late tokens, fresh generations/instances, manual/cancel/restart/coverage loss, absent approval/write/retry/replay/restore transitions, input/config mutation, frozen outputs, getters and reentrant proxy reflection. Test helpers use the real module; no Chrome/provider/API mock supplies success. These are model checks, not exhaustive model exploration or runtime acceptance.

## Exact scope and preservation

Paths relative to `Sh_Project_Setup_extension`; **three new + six modified = nine authored paths**:

| Change | Path |
|---|---|
| Create | `src/browser/selection-invalidation.mjs` |
| Create | `test/selection-invalidation.test.mjs` |
| Create | `docs/Phases/phase07/PHASE_07_BROWSER_FIRST_SELECTION_INVALIDATION_SPIKE.md` |
| Modify | `docs/Phases/phase07/PHASE_07.md` |
| Modify | `docs/00_PROJECT_STATUS.md` |
| Modify | `docs/03_CHANGELOG.md` |
| Modify | `docs/04_TEST_EVIDENCE.md` |
| Modify | `docs/05_BLOCKERS_AND_DECISIONS.md` |
| Modify | `docs/06_HANDOFF.md` |

The [verification ledger](../../04_TEST_EVIDENCE.md#bf-07-offline-selection-and-invalidation-verification--2026-11-03-africacairo) records the final measured checker results. All six pre-existing tracking bodies remain exact suffixes after unchanged titles, including earlier stops, review wording and evidence. BF-06/ADR-008, BF-04/ADR-007, BF-01 evaluator/tests, all previous reports, master/canonical, contracts/security/SEC-01, Phase 04/06, manifest/popup/worker, existing source/tests/fixtures and dependencies remain protected. The sole IDE exception is reported separately, never counted as an authored BF-07 change. Raw index, index entries, refs/reflog, HEAD/upstream and both linked worktrees remain unchanged. No staging or history mutation.

## Limitations and review gate

No actual action event, browser sender, UI ownership, permission grant, profile identity, lifecycle-listener coverage or bounded DOM read is implemented/verified. A supplied SIMULATED flag, metadata agreement or frozen token cannot authenticate any of them. No atomic three-tab snapshot, continuous freshness, hostile-DOM identity, real-site account/rights/policy, natural idle/crash/restored tab, prerender/BFCache/replacement, optional prompt/revocation or actual popup support is established. BF-03/BF-05/R1 historical browser evidence and failures remain unmodified and were not rerun; BF-07 does not relabel those gaps. No production browser adapter, storage, service-worker integration, executor, approval consumption, write, retry/replay or durable duplicate guarantee exists. There is no Phase 06 approval promotion or SEC-01/recovery/checkpoint change. A new simulation cannot resolve any real unknown-write, cleanup or retention obligation.

Skills actually applied: Ponytail full; Superpowers using-superpowers, brainstorming's authorized-spike exception, writing-plans guidance in this report, test-driven-development (including writing-good-tests) and verification-before-completion. Tools actually used: functions.exec with shell/Git/Node/Python and apply_patch. WarpGrep/Valyu were unavailable; external research was neither needed nor authorized. No subagent, web/browser/computer-use tool, provider connector or authenticated session was used.

Progress remains **5/20 master phases; 28/72 official micro-phases**. Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED**; Phase 07 **IN_PROGRESS / NOT ACCEPTED**; Phase 07.03 **NOT_STARTED / NOT_AUTHORIZED**; D-04/B-02/B-03 **OPEN**; twelve historical owner/security decisions **PENDING**; production **NO_GO**. No gate or progress promotion.

**READY_FOR_CHATGPT_REVIEW / OFFLINE_SIMULATED. STOP for independent review.** No BF-08, Phase 07.03, browser integration, real-site inspection, staging, commit or push.
