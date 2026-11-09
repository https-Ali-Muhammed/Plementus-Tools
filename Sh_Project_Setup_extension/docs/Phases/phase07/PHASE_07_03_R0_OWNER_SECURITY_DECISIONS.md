# PRE-07.03 R0: Owner/security decision reconciliation

2026-11-09 (Africa/Cairo). **DOCUMENTATION_ONLY / NON_COUNTED. P1 OWNER-SELECTED CANDIDATE; reviewer/security concurrence PENDING. R1, R2 and official Phase 07.03 NOT_AUTHORIZED.**

## 1. Authority and selected candidate

The owner's current R0 instruction identifies the [PRE-07.03 planning package](PHASE_07_03_BROWSER_FIRST_READ_ONLY_PLANNING_GATE.md) as accepted and selects P1: **a disconnected, one-shot read-only observation interface, mocked Chrome boundary, manual fallback, BF-07 unchanged, no real website access or writes**. This records the supplied owner decision; publication alone is not evidence of acceptance. The accepted package and [BF-12 assessment](PHASE_07_BROWSER_FIRST_SECURITY_READINESS_ASSESSMENT.md) remain unchanged, including prior limitations and access-deviation disclosures. Acceptance of documentation does not supply security concurrence or implementation authority.

P1 replaces only the earlier unselected-candidate status for this prospective direction. Required reviewer agreement on canonical 07.03 interpretation and security concurrence are still pending. Canonical 07.03 still requires **“Implement read-only connector and mocked tests”** after approval; this register supplies neither implementation nor tests. No historical 07.02 decision is closed by P1.

Progress remains **5/20 master phases; 28/72 official micro-phases**. Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED / NOT ACCEPTED**; Phase 07 **IN_PROGRESS / NOT ACCEPTED**; Phase 07.03 **NOT_STARTED / NOT_AUTHORIZED**. D-04/B-02/B-03 **OPEN**; production **NO_GO**. R0 is not a counted micro-phase.

## 2. P1–P8 decision register

Defaults below are recommendations for review, not newly approved permissions, numeric policy or architecture. “Approver” names an accountable role, not a verified person or supplied signature. Each decision needs approve/reject/revise, exact scope/values, approver identity and authority evidence, reviewer/security concurrence, date, conditions and unresolved dependencies. A partial reply leaves every other item pending.

| ID / status | Recommended default / selected boundary | Accountable approver and required concurrence | Required evidence | Open values | Stop condition |
|---|---|---|---|---|---|
| **P1 OWNER-SELECTED CANDIDATE**; concurrence PENDING | Selected disconnected one-shot interface with mocked Chrome boundary, manual fallback, unchanged BF-07; no real site or writes | Project owner selection supplied in current instruction; project reviewer and security reviewer still required | Current owner instruction; accepted planning package; explicit reviewer mapping to canonical 07.03 and security concurrence | Actual reviewer/security decision evidence; final mock-only acceptance boundary and sequencing exception | Treating selection or document acceptance as permission to implement or complete 07.03 |
| **P2 PENDING** | Mock-only first: no Chrome calls or permission adoption. Future disposable `activeTab` + `scripting` remains a proposal; no product permission changes | Owner + extension/security reviewers | Mock dependency/data-flow review; before R2, exact disposable manifest/probe/invocation and consent plan | Future manifest, invocation method, permission-risk disposition; no `tabs`, host patterns, static scripts or extra grants proposed | Browser invocation, manifest edit or real permission request in R1; any extra grant without new scope |
| **P3 PENDING concurrence on exclusion** | Continuing navigation excluded by P1; no `webNavigation` approval, listeners or continuous-context claim | Owner + security/privacy reviewers | Contract/UI wording and mocks that never assert continuity; separate future event/privacy/gap decision if reconsidered | Only a later separately scoped continuing-mode decision; no event-coverage promise now | Treating sequential one-shot results as atomic, continuously fresh or account-verifying |
| **P4 PENDING** | Preserve existing popup/wizard. Future no-popup capture plus packaged review remains conditional; mock review ownership only in R1 | Owner + extension/UX/security reviewers | No runtime caller/UI changes; mock old/current owner and disconnect tests; future migration/accessibility review | Future entry behavior, review ownership, wizard access and exact files | Removing/replacing popup, adding live review, or treating mocked/UI intent as a genuine browser invocation |
| **P5 PENDING** | No real origins/accounts. Invented mock inputs only; future disposable fixtures require the scope record in section 3 | Owner + security reviewer; future fixture operator accountable for containment/cleanup | Explicit synthetic input list for R1; later exact origin/profile/process/traffic/cleanup authorization | Synthetic mock constants, then separately approved loopback origins/ports/profile and ownership | Production/customer origin invented; remote traffic, real profile/account or loopback-to-provider identity mapping |
| **P6 PENDING** | Only enumerated page-kind page-derived output; proposed numeric caps/timeouts in section 4, all UNAPPROVED | Owner + security/privacy reviewers; maintainer supplies test evidence | Exact schema/data-flow, cap and timeout review, boundary/Unicode/oversize/error/race mocks | Approve/revise each proposed number, complete fixed schema and unknown-field behavior before R1 | Silent truncation, raw page/URL/error leakage, unapproved values becoming implementation defaults |
| **P7 PENDING** | Volatile-only records; no durable logs/storage/credentials; manual outcomes never authorize | Owner + security/privacy reviewers; operations concurrence for any later diagnostics exception | In-memory lifetime/clearing design, no durable sinks, redaction and non-authority tests | Exact approved field lifetime; any future diagnostic exception requires separate fields/retention/access/cleanup decision | Persistence, credential access, cached approval/recovery or manual attestation promoted to authority |
| **P8 PENDING** | Mock-only support first; no browser compatibility claim. Future Chromium/OS/version/permissions support is separate | Owner + extension/security reviewers; future test operator | Proposed Node/toolchain baseline and deterministic mocks; later exact browser/OS/features/lifecycle/denial matrix | R1 Node/test version and runner; later browser version/OS/profile/managed restrictions/distribution | Claiming Chromium 151 historical fixture results establish production support or skipping missing features |

P2–P8 remain pending even where the selected P1 scope already excludes a capability. A reviewer may record an explicit **deferred/not applicable to R1** disposition for browser-only values; that is not approval of those values or closure of their future gates. There is no authority to run even the mock implementation until the prerequisites in section 6 are satisfied.

## 3. P5 future fixture-origin authorization contents

R1 would use invented data in mocks, with no listeners, browser, DNS lookup, network request or account session. Mock constants must be fixed and reviewed as synthetic inputs; they are not a provider-origin allowlist and must not be passed through BF-07 as actual browser evidence.

A future R2 authorization must contain all of the following before an owned disposable fixture run:

- Exact role-to-origin mapping, including scheme, loopback address/hostname and effective port; allowed paths, redirects and expected negative origins. If ports are allocated dynamically, approve a bounded allocation rule and record the resolved exact origins before browser start; no wildcard or arbitrary destination.
- Invented fixture identities and content/data budget, three distinct target tabs in one isolated profile, and any negative/duplicate tabs. No production tenant origins, real accounts or logged-in profile reuse.
- Responsible operator, owned disposable profile location, process/listener boundaries, selected browser/OS/version, exact generated extension/manifest, invocation method and explicit permission/consent scope.
- Network containment allowing only the approved local endpoints, monitoring for unexpected requests, immediate stop rules, bounded duration and cleanup of owned processes/profile/listeners/artifacts. No cleanup of unrelated resources.
- Evidence fields, redaction/access/lifetime, actual-browser versus injected-simulation labels, denial handling and unresolved groups. Any detailed fixture diagnostics need separate P7 approval; production logging is not inherited from test logs.

No concrete future origins, accounts, ports or profile paths are authorized by this document. Unknown origin, ownership, traffic or cleanup scope blocks R2; it cannot expand R1.

## 4. P6 proposed numeric budget — ALL VALUES UNAPPROVED

These are conservative engineering proposals for a small **mock-only** contract, not measured platform maxima, adopted security policy or changes to BF-07. Owner/security must explicitly approve or revise the numbers and complete field schema before R1. Browser compatibility is a later P8 decision; real identifiers that cannot fit a subsequently approved schema must block, never be shortened or remapped.

Only `pageKind` is page-derived output: exactly `supported`, `unsupported` or `unknown`. Role, outcome/reason, evidence label and fixed false authority flags are controller-derived metadata, not extra collected page data. No arbitrary strings, DOM excerpts, titles, account/customer values, URLs, selectors or exception text enter the public result. A supported fixture marker remains untrusted and proves no site identity or rights.

| Field/resource | Proposed limit — UNAPPROVED | Proposed rejection/lifetime rule |
|---|---:|---|
| Page kind | Exact enum; longest permitted value **11 UTF-8 bytes** (`unsupported`) | Reject any other value; no free-text fallback |
| Role | Exact enum `plementus`, `github`, `odoo-sh`; longest **9 UTF-8 bytes** | Explicit selection only; no normalization into a different role |
| Operation and reason codes | Fixed reviewed enums; at most **32 ASCII bytes** each | The cap does not admit arbitrary strings; unknown code blocks |
| Opaque mock boot/review/capture/request/document identifiers | **128 printable ASCII bytes** each, minimum **1** | No coercion, trimming, truncation, URL or secret content; actual browser format decision deferred |
| Private synthetic origin comparator | **256 UTF-8 bytes** | Exact scheme/host/effective port under reviewed mock constants; no userinfo/path/query/fragment; never a provider mapping or public output |
| Private synthetic full-URL comparator | **2,048 UTF-8 bytes** each | Exact bounded comparison only; discard at terminal outcome/invalidation; no output/log/export. This size does not authorize collecting real URLs |
| Review-intent message | **1,024 UTF-8 bytes** total | Closed schema containing only bounded operation/correlation/role/intent; no browser facts or authority claims |
| Mock browser-result envelope | **4,096 UTF-8 bytes** total | Closed metadata plus enum result; aggregate cap applies even if individual fields fit. No raw DOM or error object |
| Public result/summary envelope | **512 UTF-8 bytes** total | Only fixed enums, bounded sequence and false flags; no private IDs/URL/origin/exception details |
| Record shape | At most **16 own fields per record**, **2 record levels** (root is level 1), at most **1 result-array element** | Exact allowed keys remain stricter; reject extras, cycles, accessors, functions and exotic records; no arbitrary recursive payload |
| Live mock resources | **3 role slots**, **1 unassigned capture**, **1 pending read globally** | No unbounded queue/history; competing intent is refused or explicitly invalidates per the reviewed state contract, never silently queued |
| Capture-to-confirm/admission deadline | **60,000 ms** from capture, non-renewable | Expired capture cannot start a read; confirmation/reselection messages do not extend it; fresh capture required |
| One-shot observation deadline | **5,000 ms** end-to-end from read admission, including discovery and completion | Invalidate on timeout; no retry/extension; completion must recheck deadline/current generation even if timer delivery was delayed |

Byte sizes mean UTF-8 encoded compact JSON for whole envelopes and UTF-8 bytes for string fields; no UTF-16 character-count shortcut. A future implementation must validate inert shape/descriptors and field caps before safe bounded serialization, without invoking untrusted getters, `toJSON`, coercions or arbitrary recursive serializers. The aggregate cap is independent of per-field caps; an oversized value blocks, it is not truncated. These budget choices do not expand the approved schema.

Use an injected deterministic clock for future mock tests. Deadline equality is expired (`elapsed >= limit`); failed/non-finite/backward elapsed-time readings block. The earlier capture deadline still wins if it arrives during an observation. Recheck state after asynchronous/reentrant boundaries and immediately before acceptance; cancel/invalidation consumes the pending result before any callback. Timers bound an attempt; they provide no trusted clock, freshness guarantee, Chrome grant lifetime, SEC-01 expiry proof or account authority. No timing experiment runs in R0.

Required later tests: limit-minus-one/exact-limit/limit-plus-one; multi-byte Unicode size versus characters; aggregate overflow with individually valid fields; malformed/extra/accessor/cyclic objects without getter execution; enum-only output; missing/duplicate result; one pending read; deadline equality/delayed timer/clock failure; stale completion after timeout/cancel/review change. These are **NOT_RUN** and cannot be cited as validation of the proposed numbers.

## 5. P7/P8 separation and unchanged BF-07

R1's candidate controller lives only in tests and memory. No product import, Chrome global, active listener, review page, popup/manifest change, adapter/workflow/storage connection or network capability. One controller owns mock boot/review/capture/generation/pending state, checks provenance/correlation and consumes results once; a mock cannot manufacture genuine browser invocation. Restart creates an empty controller. Raw comparators clear on success/failure/cancel/timeout/invalidation/restart; only up to three inert enum summaries remain until the current review ends, with no reusable authority. Replacement review discards them. No durable log, telemetry, sync, checkpoint or credential custody; no automatic retry/replay.

Manual fallback is a bounded state/instruction. A human-reported outcome is **MANUALLY_ATTESTED**, not a successful observation or approval. R1's invented test evidence is **SIMULATED**; BF-07 output remains **OFFLINE_SIMULATED**. `accountVerified`, `executionAuthorized`, `approvalGranted` and `trustedContinuingContext` remain **false**. No new provider or adapter evidence tier is introduced. Non-sensitive test names/counts may be reported under future test authorization; private payloads must not be logged as failure diagnostics.

BF-07 remains byte-identical and disconnected: strict `source: "SIMULATED"`, its existing canonical HTTPS fixture-origin restrictions, construction-time synthetic coverage assertion and same-instance frozen context/request identities are unchanged. No loopback-to-provider rewriting, allow-HTTP flag, serialization workaround or model/runtime readiness merge. Its caller/tests/exports and v1 adapter contract remain protected. [Accepted contract disposition](PHASE_07_03_BROWSER_FIRST_READ_ONLY_PLANNING_GATE.md#7-bf-07-contract-disposition).

P8 for R1 requires a separately recorded Node/runtime/test-runner baseline, no browser globals/network, deterministic clock/scheduling and mocked browser envelopes, plus regression coverage. It does not require a Chrome permission decision to be silently implemented. R2/product support later requires exact Chromium/Chrome version, OS/desktop, profile/isolation mode, supported API fields, restricted/managed/incognito behavior, permission-denial/loss handling, lifecycle evidence and distribution/update decisions. **Historical Chromium 151 fixture testing is not production support.** Missing platform evidence retains unsupported/manual status. No new runtime baseline was executed or selected in R0.

## 6. Exact prerequisites before any separate R1 authorization

R1 remains **NOT_AUTHORIZED**. The following are conjunctive entry requirements, not automatic work instructions:

1. Record required reviewer concurrence on P1's bounded mock-only interpretation and explicit security concurrence. Preserve the owner's selected candidate; do not demand reselection or treat its selection as already satisfying these other roles.
2. Record owner/security approve/reject/revise decisions for all **R1-applicable** P2–P8 boundaries: mocks only, no continuity, UI untouched, exact synthetic inputs, closed schema plus each numeric budget, volatile lifecycle/non-authorizing manual outputs, and test-runtime baseline. Record browser-only origins/permissions/UI/platform values as deferred and unavailable to R1; unresolved R1 values block.
3. Explicitly authorize disconnected sequencing despite Phase 04/06 blockers, without changing their policies or acceptance state. Prove the proposed dependency boundary has no storage/checkpoint/cleanup/recovery, workflow result, approval authority, provider or runtime bridge. If this cannot hold, stop for a new architecture/security scope.
4. Freeze the proposed private controller boundary and exact intent/result schemas before coding: only mock boundary invokes capture/invalidation, review supplies bounded intent, controller alone owns/consumes private pending state and generates false-authority output. Reject stale/unsolicited/duplicate/wrong-review/document results; retain terminal-state and reentrancy checks. No BF-07 edits or production transport.
5. Supply a **fresh explicit R1 authorization** with verified root/branch/HEAD and exact path allowlist. Current candidate CREATE paths are only `Sh_Project_Setup_extension/src/browser/read-only-admission.mjs` and `Sh_Project_Setup_extension/test/read-only-admission.test.mjs`; any required reporting files must be separately named in that authorization. These paths are not authorized now. No dependencies, manifest, background, popup, fixtures, adapters, storage, workflow, policy or BF-07 changes.
6. Explicitly authorize future focused mocked tests and relevant existing Node regressions, with deterministic negative cases from the planning package T1–T6 and section 4. Require provenance/identity, review ownership, timeout/reentrancy/held completion, malformed/oversized input, no data leakage, no network/write/persistence and false-authority assertions. Mock browser-support checks cannot count as actual Chrome evidence. No Node execution is allowed in current R0.
7. Specify acceptance evidence and stopping conditions: exact diff and protected preservation, test counts including failures/blocked cases, no evidence promotion, no unexpected file/dependency/Git state, no runtime/account access, independent review before any R2/official 07.03. No commit/push unless separately requested. Incomplete authority, failed prerequisite/test or need for broader capability stops the work rather than expanding scope.

An R1 mock implementation could eventually satisfy an explicitly accepted mock-only delivery boundary; it does not retroactively complete canonical 07.03, authorize R2 or increment counters without the separate official review/acceptance decision.

## 7. Historical decisions and blockers carried forward

All [twelve historical 07.02 decisions](PHASE_07_02.md#6-individually-reviewable-ownersecurity-decision-register) remain **PENDING**. P1 is a new candidate-direction selection, not closure of historical decision 01 or any other row. [Browser-first applicability](PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md#8-prospective-applicability-of-the-twelve-historical-decisions) remains unchanged.

| Historical ID / subject | State and applicability |
|---|---|
| 01 Authentication direction | PENDING; candidate selected here, required final concurrence/disposition still absent |
| 02 Backend exception | PENDING / deferred; no exception or backend introduced |
| 03 Backend ownership/operations | PENDING / deferred; no operator/hosting/budget selection |
| 04 Transient OAuth/code/PKCE/token handling | PENDING / deferred; credential prohibition preserved |
| 05 Provider credential storage | PENDING / deferred; no custody/storage authorization |
| 06 Backend session cookies/bearers | PENDING / deferred; no cookie/session access or reuse |
| 07 Organization/operator/repository restrictions | PENDING; actual identities/rights/targets required before real access |
| 08 Read endpoints/permissions | PENDING; API map deferred, browser grants/collection still unapproved |
| 09 Registration/install/callback ownership | PENDING / deferred; no external registration/configuration |
| 10 Chrome identity/permissions/distribution | PENDING; no product grant, browser baseline or distribution decision |
| 11 Logout/revocation/incidents/manual fallback | PENDING; stop/manual never means provider logout/revocation; accountable incident roles remain required |
| 12 Future sandbox/security verification | PENDING; new exact scope/targets/evidence/cleanup authority required for each later activity |

Original BF-11 activeTab discovery denial remains **UNRESOLVED**. R1's later success did not explain or causally repair it. BF-09-AUTO/BF-10-R1/BF-11-R1 fixture acceptance remains within its published local scope; no repeat acceptance prerequisite is added, and no new reliability claim follows. Denial ends a future attempt with manual fallback, never automatic retries or broader grants.

All eight BF-11-R1 groups remain **NOT_RUN**: `optional_grant_removal`, `natural_idle`, `crash_session_restore`, `bfcache_prerender_onReplaced`, `browser_permission_prompts`, `hostile_real_pages`, `bf07_runtime_integration`, `continuous_navigation_monitoring`. Some are excluded from R1, but exclusion is not a PASS or closure. [BF-12 unsupported groups](PHASE_07_BROWSER_FIRST_SECURITY_READINESS_ASSESSMENT.md#f-eight-unsupported-bf-11-r1-groups).

Phase 04/SEC-01 remains BLOCKED: seven-field checkpoint contract and seven-day logical expiry/Option B cleanup duties unchanged; uncertain-time/HELD_UNCERTAIN obligations, clock/restart proof, generic cleanup rejection after possible committed deletion, owner-only destructive disposition, real operator/device/incident controls and independent security acceptance unresolved. No new expiry/clock threshold, persistence exception, deletion/discharge or fresh-work admission is created by P6's attempt budgets. [BF-12 security blockers](PHASE_07_BROWSER_FIRST_SECURITY_READINESS_ASSESSMENT.md#g-production-and-security-blockers).

Phase 06 remains PARTIAL/BLOCKED/NOT ACCEPTED: synthetic approval intent cannot authorize mutation; runtime approval, durable duplicate prevention and target reconciliation remain required. New captures/reviews cannot clear RECONCILE_REQUIRED or unknown effects. D-04/B-02/B-03 remain OPEN, with B-02 API/backend choices deferred rather than approved. B-04/B-05, later site/account/write demonstrations and release gates remain separate. **Production NO_GO.** No governing policy, canonical architecture or master plan is modified.

## 8. Preflight, verification and review stop

Required root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`; branch `feature/sh-project-setup-extension-clean`; HEAD/upstream/live remote **`150b1550d092d925ff7c93db0ef28c595851d6d6`**; upstream `origin/feature/sh-project-setup-extension-clean`; divergence **0/0**. All origin fetch/push URLs equal `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`. Index entries equal HEAD by path/mode/object/stage metadata; scoped non-IDE preflight found no changes or untracked files.

Linked sibling `/home/https_ali_muhammed/Plementus/Tools` remains at `390c9ea7c311f362ea04aad64ed14569161642ec` on `feature/sh-project-setup-extension`; its two existing untracked source documents and index/worktree registrations are preserved. Both protected IDE paths are excluded from **every content read/hash/diff/check**. Only path/index/stat metadata is inventoried; no IDE byte-equality or current content-status claim. The prior task's deviation is preserved historically and is not repeated or treated as renewed permission.

Authored scope: this new report plus append-only updates to `PHASE_07.md` and `../../00_PROJECT_STATUS.md`, `../../03_CHANGELOG.md`, `../../04_TEST_EVIDENCE.md`, `../../05_BLOCKERS_AND_DECISIONS.md`, `../../06_HANDOFF.md`. Six complete published prefixes remain unchanged. Accepted PRE-07.03 report/BF-12, all other non-IDE tracked content and master/canonical remain protected. Historical full-reference uncertainty remains UNVERIFIED; current normal/Codex ref deltas are measured separately, with no cause attribution or repair.

[Measured verification](../../04_TEST_EVIDENCE.md#pre-0703-r0-documentation-verification--2026-11-09-africacairo) covers exact seven-file scope, published prefixes, protected non-IDE bytes, index/ref/history/worktree metadata, master/canonical equality and local links/formatting. Scratch aids are outside Git: `/tmp/pre0703-r0-baseline.json`, `/tmp/pre0703-r0-verify.py`, `/tmp/pre0703-r0-verification.json`. No Node, Chromium, application, provider, account or browser execution; no new platform or policy research. All future tests remain NOT_RUN.

Measured verification: **565 structural/document checks passed**, exact one-new/six-modified scope, six published prefixes, 229 protected non-IDE hashes and master/canonical equality. Index/history/config/worktree metadata and ten normal refs preserved; current Codex delta zero. All 473 scoped links/118 fragments and 1224 links/258 fragments across 96 docs resolve; formatting checks pass. Protected IDE metadata only, no content access or equality claim. **No current-task deviations; runtime tests NOT_RUN.** Historical uncertainties/deviations remain preserved. Checks are repeated after recording results.

Skills applied: Ponytail scope discipline and Superpowers planning/verification guidance already read in this chat. Tools: functions.exec with scoped shell/Git/Python and apply_patch. No MCP application connector, browser tool or subagent used for R0. User's exact scope overrides extra artifacts and implementation/commit defaults. No unapproved policy numbers were adopted.

Next: independent ChatGPT review, required reviewer/security concurrence and explicit R1-applicable owner decisions, followed only then by a fresh separately scoped R1 authorization. **STOP. No stage, commit, push, BF-13, R1/R2 or official 07.03 implementation.**

**READY_FOR_CHATGPT_REVIEW / PRE_07_03_R0_DECISIONS_ONLY**
