# PRE-07.03: Browser-first read-only connector implementation plan

2026-11-09 (Africa/Cairo). **PROPOSED — OWNER AUTHORIZATION REQUIRED. NON_COUNTED / PRE_07_03_PLANNING_ONLY.** The current request authorizes preparation of this decision package only. Recommendations below are not adopted architecture, security concurrence, permission grants, independent acceptance or official Phase 07.03 execution.

**Goal:** define the smallest future connector that can report bounded observations of explicitly selected tabs, with mocked tests and honest manual fallback, without account or write authority.

**Architecture:** recommend a disconnected, one-shot read interface with a single worker-owned admission controller when a Chrome experiment is separately authorized. Preserve BF-07 unchanged; do not connect it to Chrome or the workflow/storage adapters. A three-role review contains sequential historical observations, never a current atomic three-tab context.

**Tech stack:** existing vanilla MV3, JavaScript ES modules and Node built-in tests for future mocks; owned disposable Chrome fixtures only under separate authorization. No new dependency proposed.

**Spec:** [canonical master](../../01_MASTER_PLAN.md), its [equal source](../../_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md), [owner direction](PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md), [BF-12 and R1](PHASE_07_BROWSER_FIRST_SECURITY_READINESS_ASSESSMENT.md), [BF-08 trust boundary](PHASE_07_BROWSER_FIRST_TRUST_BOUNDARY_DESIGN.md). These documents, ADRs, policy and integration contracts remain unchanged. A future executor must read both this proposal and its sources; implementation workflows begin only after a new explicit authorization.

## 1. Verdict and reconciliation with official Phase 07.03

**Decision-ready proposal; implementation NOT_AUTHORIZED; production NO_GO.** Recommend manual, separately invoked bounded observations for the first disconnected prototype. Continuing guided context needs its own security decision and evidence. Review acceptance of this plan does not count as delivering 07.03.

| Binding source / requirement | Proposed interpretation and acceptance boundary |
|---|---|
| Canonical 07.03: “Implement read-only connector and mocked tests” | A future implementation must actually provide an executable read-only interface and mocks. This plan, an observer report or manual instructions alone cannot satisfy it |
| Canonical Phase 07: connector after approval; mock its API; no secrets in reports/assets | Owner/reviewer must explicitly agree that a browser observation interface with mocked Chrome boundary is the browser-first interpretation of the connector API. Mocking Chrome does not implement an authenticated GitHub API client |
| 07.02 least-privilege authorization and parent exit criteria | Browser-first owner preference does not settle the twelve security decisions. Record applicable decisions and explicit deferrals before execution; parent acceptance is a separate review |
| ADR-006 / owner direction | One profile, three existing explicitly assigned Plementus/GitHub/Odoo.sh tabs; site-owned sessions; no default OAuth/App/PAT/backend or session-to-API conversion |
| BF-12 recommended alternative 1 | Keep BF-07 and observer disconnected; manual fallback; resolve privacy, permission, review ownership and support scope before implementation |
| Phase 08 / 13 / 18 / 19 | Organization/repository rights, repository/branch discovery, real Odoo.sh/Plementus behavior and release demos remain later gates. Page recognition alone completes none of them |
| Historical accepted fixture experiments | BF-09-AUTO, BF-10-R1 and BF-11-R1 acceptance is already recorded in BF-12-R1. Do not reopen that local acceptance; do not infer BF-12-R1 acceptance from publication |

Historical BF-11-R1 full matrix: **34 PASS / 0 FAIL / 0 BLOCKED / 8 NOT_RUN**, 37 callbacks and 37 confirmations (34 accepted observations, two rejected conflicts, one held result later rejected). Historical Node total: **288 PASS**. These are published results, not reruns. Original BF-11 access denial remains **UNRESOLVED**, not fixed by R1 success. The original BLOCKED evidence, six simulated full-matrix passes and all evidence-tier distinctions remain intact.

Global constraints: no credentials, account operations, provider APIs, business writes, persistence, real-site inspection or runtime work in this gate. No BF-13. Progress remains **5/20 master phases; 28/72 official micro-phases**; Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED / NOT ACCEPTED**; Phase 07 **IN_PROGRESS / NOT ACCEPTED**; 07.03 **NOT_STARTED / NOT_AUTHORIZED**.

## 2. Minimum capability and exclusions

Proposed first implementation contract: an explicitly requested, bounded top-document observation for one assigned role, followed by an inert summary. The three role slots are `plementus`, `github`, `odoo-sh`; each must use a distinct operator-selected tab in the same approved profile. The controller receives browser facts only through its private Chrome-facing boundary. Review intent is a separate input. No global title/URL scanning or automatic role assignment.

The only initial page-derived output is an enumerated fixture page kind (`supported`, `unsupported`, `unknown`), not DOM text. A supported fixture marker is untrusted page data and cannot authenticate a provider. Results report role, bounded outcome/reason and evidence provenance. Keep `accountVerified`, `executionAuthorized`, `approvalGranted`, `trustedContinuingContext` **false**. No provider-connected, account-verified, all-tabs-ready, security-approved or current-context success label.

For a real later connector, the page-field allowlist and supported signatures require a separate exact site/version review before any collection. Until then, no real-site selector or field value is invented. An unsupported page, denied access, missing metadata, changed document, expired review or unknown privacy classification returns blocked/unknown plus a manual path, not success.

Excluded: form filling (including autosave), site clicks/navigation performed by the extension, repository/branch/project creation, database copies, module installation, deploy keys, DNS/domains, Plementus fields/Connect, login/logout/MFA/CAPTCHA automation, clipboard transfer, downloads/screenshots, arbitrary selectors/code, MAIN-world evaluation, all-frame reads, remote code, network interception, fetch/XHR proxies, undocumented endpoints, cookies/storage/private authentication state, token/SSH-secret handling, polling/background scraping, durable logs/checkpoints and automatic retry/replay. Opening/focusing the extension's own review UI is distinct from interacting with a website.

## 3. Proposed selection and review experience

1. The engineer opens the three intended tabs in one approved profile and navigates manually. Login is performed by the engineer on each website; selection proves no account rights.
2. On each intended tab, the engineer invokes the extension. Capture the Chrome callback's tab/window synchronously **before** any await or review focus change. One invocation covers that tab only. The review offers an unassigned capture, never a guessed role.
3. A packaged review page presents three role slots, explicit assign/confirm, cancel and manual controls. Show a bounded role/origin summary from trusted metadata; never page title, query, fragment, account/customer value or raw error. A display-origin decision is still pending privacy review. Duplicate tabs, conflicting roles, unexpected origins and missing facts block assignment.
4. Confirmation binds the owning review connection and exact capture ticket. A stale page cannot confirm a new capture. Ownership is one specific packaged document and connection, not merely extension ID or URL. Replacing the owner invalidates the old review; closing an obsolete review must not clear a newer owner.
5. Each role gets at most one accepted observation per fresh invocation/confirmation. Display “Observed once — account and permissions unverified” with a local sequence, not a freshness timer. Earlier role cards describe history only. After completion the read capability/pending ticket is consumed; another read requires another invocation. No automatic refresh or reuse of retained Chrome access.
6. Any known selected-tab change, permission/discovery failure, owner disconnect, timeout or uncertain lifecycle clears all operative captures/bindings/pending reads before further acceptance. Display “Selection expired — use manual guidance or select again.” An old result may be shown only as explicitly expired history; it cannot enable another action.
7. Stop/manual clears volatile authority, cancels outstanding acceptance and provides instructions for the engineer to inspect the sites themselves. A manual statement is MANUALLY_ATTESTED only; it never toggles a verified flag. Stopping the extension does not log out websites or revoke provider sessions.

**Popup decision:** the current manifest sets `action.default_popup`; Chrome does not dispatch `action.onClicked` when that popup is present. Recommend testing a separate no-popup action plus a packaged review tab in a disposable harness. Product adoption would require explicit approval to change the toolbar entry and preserve access to the existing wizard. Do not quietly remove the popup, synthesize a callback, query the focused tab later or treat a review click as an activeTab grant. [Chrome action](https://developer.chrome.com/docs/extensions/reference/api/action).

Accessibility acceptance: explicit labels and focus order, keyboard-operable confirmation/cancel/manual controls, announced stale/blocked states, safe text rendering, no color-only status. Keyboard intent in the review is not a substitute for separately evidenced browser invocation.

## 4. Bounded observation versus continuing navigation

| Option | Capability / cost | Proposed disposition |
|---|---|---|
| Manual guidance with no page access | Operator inspects sites; no browser-observation claim | Always-available fallback; no new permissions needed |
| Individually invoked bounded observations | Each result describes only a completed read of a specific document; repeated human selection; no continuously usable aggregate | Recommended first disconnected prototype, conditional on owner/reviewer accepting this limited 07.03 interpretation |
| Continuing guided three-tab context | Requires navigation/permission/review/lifecycle coverage, gap policy, broader privacy review and supported-environment tests; still not atomic or account-authenticating | Separate OWNER/SECURITY DECISION REQUIRED; excluded from minimum prototype |

Bounded observation is sufficient **only** to demonstrate the proposed one-shot interface with mocks and fixture evidence. It is insufficient for automated progression, an aggregate live-context claim, production account verification or writes. Sequential pre/post checks cannot freeze three pages. Same-document account/target changes and away-return sequences may evade comparisons; even a successful read cannot certify intervening continuity. No chosen timeout, event silence or URL equality fixes this.

BF-08's coverage prerequisite remains binding for any guided/context-verifying mode. This proposal does not weaken it: the bounded route withholds that mode and all related authority. If owner/reviewer requires continuing context for 07.03, stop the bounded-only acceptance route and obtain the separate navigation decision before implementation. `webNavigation` can supply history/fragment/document events, but its permission breadth extends beyond the selected injection grants, filtering is not a narrower grant, and it does not establish account identity or atomicity. [Chrome webNavigation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation).

## 5. Single admission controller and provenance

The following is a proposed runtime boundary, not code implemented or accepted here. One controller owns all admissions, even if observers/probes/UI are separate files. No BF-07 controller, popup cache, adapter or workflow may independently mark a result ready.

| Boundary | Trusted source / validation | Explicit non-authority |
|---|---|---|
| Invocation | Actual Chrome action callback; capture sequence plus callback tab/window before awaits | Payload `source`, UI assertions, automation logs and focused-tab queries cannot manufacture invocation |
| Tab/document | Direct browser API/results: exact tab/window, frame 0, opaque document ID and exact origin (scheme/host/effective port); supported lifecycle/metadata where available | No `tabs.Tab.documentId`, CDP loader ID substitution, title match, provider hostname guess or URL-only identity |
| Review | Own extension ID plus exact packaged URL/document/context and current connection; boot/review/capture correlation | Page messages, cloned tokens and an old open port cannot prove current ownership |
| Probe | Packaged, isolated-world, bounded top-document code; one result for the expected frame/document; exact fixed output schema | DOM/result content is untrusted, including fixture identity/privacy markers; no account authentication |
| Controller output | Derived only after private pending lookup, current-state checks and consume-once acceptance | No sender-supplied evidence tier, permission, coverage, approval or authority flag |

Proposed acceptance sequence:

1. Start each worker instance unbound with a new unpredictable boot marker; register listeners at top level, not only `onInstalled`. No state reconstruction from UI, disk, surviving grants or an earlier port. Setup failure means manual-only.
2. Record invocation before asynchronous discovery. A second invocation supersedes the unassigned capture. A role conflict or recapture of a selected tab invalidates the global generation before proceeding.
3. Use a minimal discovery probe only to obtain browser result-envelope document identity; do not admit page content from untargeted discovery. With no approved `webNavigation`, do not pretend unavailable lifecycle metadata exists. Missing facts required by the chosen bounded contract block. Any fresh document-bound read uses `{tabId, documentIds: [expectedDocumentId]}` and isolated world; require one frame-0 result. No tab-only retry, widened host access or all-frames fallback after failure. [Chrome scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting).
4. Private pending entry binds boot, owning review connection/document, capture, generation, request sequence, role, expected tab/window/frame/document/origin and transient pre-read URL comparator. The public UI can echo only bounded opaque correlation, role and confirm/cancel/manual intent; it cannot select code, URL or permissions.
5. Recheck that entire current tuple after **every** await and any reentrant boundary, and immediately before accepting or notifying UI. Known lifecycle/permission/target/review loss first increments generation and clears all pending authority synchronously. Terminal cancellation/invalidation wins over a late success. One controller serializes state transitions; browser pages still remain concurrent.
6. Check exact permitted schema, bounded sizes, actual injection success, pre/post document/origin/URL agreement and absence of known loss. Missing/extra/conflicting results, current-read denial or malformed payload never become successful recognition. Unrelated spoofed traffic is rejected without providing a global-reset denial-of-service endpoint; a malformed response to the current pending read blocks that attempt.
7. Consume the pending entry before publication or callback; discard raw comparison data on every terminal path. Duplicate, unsolicited, late, wrong-boot/review/capture/generation/document messages cannot be accepted. Timeout invalidates; it is not a trusted security clock and must not renew permission or enable a retry.

One-shot state proposal: `UNBOUND → CAPTURED → CONFIRMED → READING → OBSERVED_ONCE`; any uncertainty goes to `STALE_OR_UNCERTAIN`/`MANUAL_FALLBACK`, with fresh invocation required. `OBSERVED_ONCE` conveys no reusable authority. Browser permission can survive navigation/restart while application state remains empty. [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab), [worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle), [MessageSender](https://developer.chrome.com/docs/extensions/reference/api/runtime#type-MessageSender).

## 6. Exact permission, privacy and support decisions still required

Each row is **PENDING / OWNER DECISION REQUIRED**, with security concurrence required before implementation that depends on it. Record approve/reject/revise, exact values, owner/reviewer identity and authority evidence, date, conditions and residual limitations. No blank signature, source citation or documentation acceptance is an approval.

| ID | Decision requested / recommended minimum | Acceptance / stopping condition |
|---|---|---|
| P1 | Scope: bounded-only interpretation versus continuing guided context | Owner and reviewer explicitly map the chosen capability to canonical 07.03; disagreement keeps 07.03 unauthorized |
| P2 | Future disposable harness: `activeTab` + `scripting`, each selected tab independently invoked; no required/optional host patterns, `tabs`, static content scripts or extra API permissions | Security accepts executable-page-access risk and exact packaged probe; no manifest change now. Product permission adoption is a later authorization |
| P3 | Navigation: omit `webNavigation` for bounded-only; separately consider optional, user-consented `webNavigation` for continuing mode | Decide event coverage, initial gaps, history/fragment/replacement, denial/removal behavior and unrelated-navigation privacy. Never infer consent or silently fall back to continuing mode |
| P4 | No-popup capture and packaged review ownership; existing wizard entry preservation | Approve exact UI/file changes before product work; popup suppression of callback must be tested, never worked around with fabricated events |
| P5 | Origin/profile boundary | Future fixture scope explicitly lists each loopback scheme/host/port. Later real origins, dynamic customer domains, profile, incognito and managed-browser policy require separate approval; default incognito unsupported; no wildcard or guessed tenant |
| P6 | Collection budget and privacy | Propose only enumerated page kind; in-memory tab/document/origin/correlation and transient exact-URL comparison. Decide exact message/string caps and timeout before code; do not invent policy thresholds. No raw URL/query/fragment/DOM/title/account/customer data in UI, logs, errors or exports |
| P7 | Retention, diagnostics and manual outcomes | No storage/sync/checkpoint/logging. Clear transient data on completion/loss/restart; generic reasons/counts only. Diagnostic exception needs its own data fields/redaction/lifetime/cleanup scope; no extension capture of site sessions |
| P8 | Supported Chrome/OS/distribution and denial policy | Approve minimum version and actual fixture baseline for required APIs; historic Chromium 151 evidence does not establish broad support. Missing fields/features, restricted pages and managed denial stop; repeated success is not denial root-cause proof |

Metadata visibility is separate from injection access. `tabs` exposes sensitive tab properties and is not justified merely to select three explicit invocations; broader host or optional permission designs need their own review. Optional requests must fit declarations and user-consent requirements; prompt denial/cancellation/removal require honest fallback. [Tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs), [Permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions).

No new policy is adopted by this table. If an approved implementation needs a change to ADR, policy, v1 integration contract or master interpretation, obtain a separately scoped amendment first; do not edit protected records or implement a de facto exception.

## 7. BF-07 contract disposition

**Recommendation: preserve BF-07 byte-for-byte, disconnected.** Its `createSelectionInvalidation` accepts strict plain records, `source: "SIMULATED"`, canonical HTTPS origins (Plementus/Odoo.sh `.example`, GitHub exactly `https://github.com`), synthetic `lifecycleCoverage: true`, and same-instance frozen context/request object identity. Its output remains `OFFLINE_SIMULATED`, account/execution false. Serialization breaks by-reference tokens; the simulated coverage assertion proves no Chrome coverage.

Raw HTTP loopback observations cannot satisfy that contract honestly. Do not rewrite loopback origins to provider origins, set synthetic booleans as browser proof, relabel browser input SIMULATED for runtime admission, add allow-HTTP switches or OR model readiness with observer readiness. Leave `src/browser/selection-invalidation.mjs`, `src/browser/tab-recognition.mjs`, their tests and v1 adapter exports untouched in the proposed minimum path.

The runtime candidate needs its own explicitly reviewed observation envelope in the **single** admission controller, not a second production state machine connected to BF-07. Mocking that controller yields SIMULATED evidence; actual fixture API observations retain their real loopback origin and LOCAL_BROWSER_TESTED provenance; automated GUI invocation receives its separately recorded AUTOMATED_GUI_BROWSER_TESTED attribution. None is a new provider evidence tier or a change to v1 enums.

Alternative fixture-only projection is deferred unless a concrete comparison question justifies its added schema boundary. A future versioned BF-07 revision would need explicit architecture/security authorization, caller/export/fixture/test inventory, old-contract regressions and provenance/serialization review. Neither alternative is necessary for the proposed bounded prototype and neither is authorized here.

## 8. Missing tests and acceptance criteria

**All tests below are FUTURE / NOT_RUN in this gate.** A mocked positive is not browser proof. A fixture positive is not account/site-policy/security approval. Required-case failures or blocked prerequisites stop advancement; unsupported groups stay explicitly NOT_RUN rather than disappearing into a green total.

| Test set | Required assertions for the proposed bounded prototype |
|---|---|
| T1 — Contract and roles | Three distinct explicit role selections; no first-match/title inference; wrong origin/port/window/frame, duplicate role/tab, malformed/extra keys, oversize fields and unavailable metadata block; all authority flags always false |
| T2 — Invocation and review | No read before private invocation capture; callback tab captured before focus/await; exact current review ownership; wrong extension/page/frame/document, old owner, copied/replayed ticket and review reload/disconnect rejected; obsolete owner disconnect cannot kill current review |
| T3 — Async admission | Hold/release completion across role recapture, global invalidation, cancellation, timeout, worker restart and permission loss; only current private pending tuple accepted once; real stale-document result rejected; reentrant reflection cannot overwrite terminal state |
| T4 — Read safety/privacy | Fixed isolated probe only; no writes/clicks/fill/network/storage/credential APIs; hostile markup safely rendered as inert status; raw URL/query/DOM/secret sentinel absent from output/errors/logs; missing page signature and privacy uncertainty go manual |
| T5 — Lifecycle and failure | Reload, same/cross-origin departure/return, tab close/replacement/detach/window change, pending navigation and owning review loss invalidate; retained scripting grant cannot restore bindings; absence of continuous event coverage never produces continuing-context success |
| T6 — Mocked boundary failures | API rejects/throws, zero/multiple results, missing fields, mismatched frame/document, permission denial, timeout and unsupported Chrome capability return bounded blocked/unknown outcomes; no retry, larger grant or fabricated read-success |
| T7 — UI and compatibility | Keyboard/focus/status accessibility and inert rendering; uninvoked/duplicate/negative fixture tabs inaccessible; product popup/wizard preserved until separately authorized replacement; existing BF-07/recognition/adapter/workflow regressions unchanged |

**Historical activeTab denial acceptance:** preserve the original BF-11 denial and R1 non-reproduction. A future separately authorized diagnostic must record minimal callback target, committed-document/lifecycle ordering and bounded error category, with privacy review of any exact Chrome exception. A denied discovery terminates the attempt, globally invalidates and offers manual guidance. No automatic second injection, extra click loop, grant override or assumed “timing fix.” If cause remains unproved, label UNRESOLVED and restrict support; passing repeats alone cannot earn reliability or production acceptance.

| Unsupported BF-11-R1 group — all still NOT_RUN | Required future isolated evidence / applicability |
|---|---|
| `optional_grant_removal` | Real optional accept/remove/regrant and loss with read pending, only after optional design consent. Not required to pretend optional grants exist in the minimal no-optional route; mandatory before that capability is supported |
| `natural_idle` | Observe actual idle termination/wake without keeping worker alive; reject stale UI/results. Controlled stop is narrower; required before production worker-lifecycle support |
| `crash_session_restore` | Owned disposable crash/reopen/restored-tab evidence, no authority resurrection; mandatory before restored-session support, no real profile experiment |
| `bfcache_prerender_onReplaced` | Genuine lifecycle/activation/replacement and old-result rejection; simulated events/new tabs do not count. Unsupported activation remains blocked until evidenced |
| `browser_permission_prompts` | Actual accept/deny/cancel/withheld/managed behavior under approved optional declarations. Mock denial/injection denial is not prompt consent; mandatory before optional-prompt support |
| `hostile_real_pages` | Malicious local fixtures first; they cannot close this real-page group. Named-site authorization/policy/privacy scope required for any later real inspection |
| `bf07_runtime_integration` | Remains excluded and NOT_RUN under disconnected recommendation. Only an explicitly approved versioned contract or fixture comparison can create new tests; never claim disconnected acceptance covers integration |
| `continuous_navigation_monitoring` | Approved navigation permission/privacy contract plus queued-event/history/fragment/gap/replacement cases. Mandatory before continuing guided mode; bounded-only route cannot mark it passed |

Acceptance for a **disconnected prototype**: owner/reviewer accept P1 and applicable P2–P8, exact future file scope and evidence ceiling; all T1–T7 cases for its chosen mode pass with no unreported blocked prerequisites; no code path invokes workflows/storage/providers or grants authority; old regressions pass; unsupported groups and denial limitation remain visible. Mock-only delivery must be explicitly accepted as mock-only, with runtime NOT_RUN. A Chrome fixture demonstration is a separate scope and cannot substitute for the mocked tests required by 07.03.

Review focus: delayed completion after invalidation (T3); old review/connection versus current owner (T2); same-document account changes with identical URL (T5, no account claim); privacy leakage on errors (T4/T6); denied reacquisition despite matching callback (T6 plus separately gated diagnostic). These are not resolved merely by earlier fixture success.

## 9. Dependency separation and retained blockers

| Requirement | Disconnected read-only prototype | Production integration, account access or sensitive writes |
|---|---|---|
| Authorization/least privilege/provenance/privacy | Required before scoped implementation; mocks cannot self-authorize Chrome | Mandatory, plus independent security acceptance and supported-environment evidence |
| D-04 identities/rights and B-03 sandbox | No real account access; invented fixture identity only, explicit offline exception required | D-04/B-03 OPEN: verified operators/organizations/targets, policy compatibility and exact authorized operations before real access |
| B-02 authenticated API design | OPEN/deferred; no API or credential path needed for bounded fixture work | Must resolve before any authenticated API route; browser sessions never satisfy it |
| Phase 04 SEC-01 | No persistence, checkpoint admission/cleanup/recovery or connection to that service; owner must explicitly permit disconnected sequencing | Phase 04 BLOCKED: binding policy, cleanup outcomes, clock/restart/held uncertainty, owner/device/incident controls remain mandatory for dependent runtime work |
| Phase 06 | No coordinator result submission, synthetic approval bridge, executor or run resumption | PARTIAL/BLOCKED: runtime operator authority, immediate per-write approval, reconciliation and durable duplicate prevention required |
| Site/account/write authority | All false, manual claims labeled MANUALLY_ATTESTED | Login, Chrome access, actual account rights, operator intent and each write approval are separate evidence. A read/click/button does not prove rights or committed outcome |

Carry SEC-01 without amendment: exactly `schemaVersion`, `runId`, `state`, `step`, `evidenceTier`, `revision`, immutable `createdAt`; non-renewable seven-day logical expiry and local/profile-only custody; no credentials/customer/URL/approval data. Option B requires due cleanup at next permitted execution before dependent work. Combined A+B uncertain-time hold retains obligations without a guaranteed maximum; unprovable expiry cannot authorize deletion. Case-specific destructive disposition requires the project owner without delegation. HELD_UNCERTAIN admission remains proposed, not a cleanup bypass or fresh-work authorization.

The 1 ms bracket cap, 1.1 ms discrepancy allowance, 0.1 ms precision premise, common-mode pauses and supported-platform burden are not production-accepted clock guarantees. Restart loses same-instance elapsed-time proof. Generic cleanup rejection may follow committed deletion or abort; it proves neither rollback nor retained data. No retry/discharge policy is invented. Fresh grants, reviews, run IDs or owner deletion cannot erase external uncertainty.

Phase 06 approval intent remains terminal and non-authorizing; same-instance simulation cannot provide runtime identity or durable duplicate-write protection. Preserve RECONCILE_REQUIRED after any possible write under a future separately authorized path; never resume/replay on new selection. Disk encryption, screen lock, protected profile, verified owner/operator, incident route/custodian and independent security acceptance remain unresolved. B-04/B-05 real Odoo.sh/Plementus demonstrations, Utilities/modules/Staging/Connect and Phase 18/19 gates remain outside this prototype.

Authoritative blocker detail: [BF-12 production/security blockers](PHASE_07_BROWSER_FIRST_SECURITY_READINESS_ASSESSMENT.md#g-production-and-security-blockers), [Phase 04](../phase04/PHASE_04.md), [Phase 06](../phase06/PHASE_06.md), [security requirements](../../09_SECURITY_AND_SECRETS.md). No blocker is closed by documentation or fixture acceptance.

### Twelve historical decisions — all PENDING

The [original decision packet](PHASE_07_02.md#6-individually-reviewable-ownersecurity-decision-register) and [browser-first applicability](PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md#8-prospective-applicability-of-the-twelve-historical-decisions) remain authoritative. Deferral is neither approval nor closure.

| ID / decision | Carry-forward applicability and required authority |
|---|---|
| 01 Authentication direction — PENDING | Owner preference browser-first; owner/security must agree actual connector boundary and canonical interpretation |
| 02 Backend exception — PENDING | Deferred; no exception needed/requested for this prototype. Explicit owner/security exception if revived |
| 03 Backend ownership/operations — PENDING | Deferred; hosting/funding/control/incident owner unselected. Accountable operator plus owner/security needed if revived |
| 04 Transient OAuth/code/PKCE/token handling — PENDING | Prohibited here; memory-only is not permission. Owner/security must approve exact classes/lifetimes/cancellation if route changes |
| 05 Provider credential storage — PENDING | No credential custody; backend/encryption do not grant an exception. Owner/security custody/access/retention/rotation rules required if reconsidered |
| 06 Backend session cookies/bearers — PENDING | No backend session or website cookie reuse. Separate issuance/binding/expiry/revocation review if revived |
| 07 Org/operator/repository restrictions — PENDING | Still mandatory for real access; owner/org authority/security verify identities, allowed targets and rights; unknown account blocks |
| 08 Read endpoints/permissions — PENDING | Historical five-GET map deferred. Owner/security must approve exact browser read fields and Chrome surface instead; no proxy |
| 09 Registration/install/callback ownership — PENDING | App/OAuth registration deferred; owner/org/app authority/security required if revived. Existing Odoo.sh sign-in is not extension App consent |
| 10 Chrome identity/permissions/distribution — PENDING | Owner/security approve exact permissions, extension IDs, baseline and update/distribution ownership; P2–P8 are proposals only |
| 11 Logout/revocation/incidents/manual fallback — PENDING | Owner/security/operations name actual incident roles and bounded procedures; extension stop never claims site logout/revocation |
| 12 Future sandbox/security verification — PENDING | Owner/security/admins approve exact files, invented versus real targets, operations, data limits, cleanup and stops; each live/write scope separate |

## 10. Ordered future roadmap and file-scope proposals

All paths below are relative to `Sh_Project_Setup_extension/` and are **proposals, not the current allowlist**. Small steps end at independent acceptance; they do not authorize a later step. No commits/staging/pushes are proposed as automatic tasks.

### R0 — Owner/reviewer and security decision gate

- [ ] Review this plan and BF-12-R1 documentation disposition; do not repeat already recorded fixture acceptance.
- [ ] Record P1–P8 applicable decisions, explicit deferred features, historical decision applicability and the disconnected Phase 04/06 sequencing exception. Resolve exact input size/time limits and origin/support values before implementation.
- [ ] Issue a fresh exact path allowlist and choose mock-only versus separately authorized fixture execution. No future file is approved by its appearance below.

Files: append decision evidence to separately authorized phase/status/blocker/handoff records; ADR/policy/contract amendment only under a new explicit allowlist if required. Stop on absent authority, incompatible canonical interpretation, unclear privacy/support scope or unexpected Git state.

### R1 — Disconnected admission interface and mocked connector

Propose CREATE `src/browser/read-only-admission.mjs`, `test/read-only-admission.test.mjs`. No MODIFY of BF-07, v1 adapters, background, popup, manifest, fixtures, storage or workflow. Tests instantiate the module with a private mock Chrome boundary; the product imports nothing from it.

Proposed interface: `createReadOnlyAdmission(boundary, limits)` returns an owner-only controller with `captureInvocation(tab)`, `attachReview(sender, connection)`, `confirmSelection(connection, intent)`, `observeOnce(connection, intent)`, `invalidate(reason)` and `snapshot()`. Only the private trusted boundary invokes capture/invalidation; no runtime message handler exposes them. `observeOnce` consumes a current private capture/selection, performs document-bound reads through the boundary and returns a sanitized outcome with false authority flags. Exact message schema is limited to operation, opaque capture/request correlation, role and explicit intent; caps are fixed by R0, not remotely configurable. No callback can supply an evidence tier or arbitrary code/URL.

- [ ] Write T1–T6 adversarial mocks first, including held completion and reentrant terminality; confirm expected failures under the separately approved test authorization.
- [ ] Implement the smallest controller meeting sections 2–7, with a single state owner and no BF-07/controller composition.
- [ ] Run the new focused suite, then existing `test/*.test.mjs` regressions once; require zero unexpected FAIL/BLOCKED and unchanged evidence flags. Future commands: `node --test test/read-only-admission.test.mjs`, then `node --test test/*.test.mjs` from the extension root. Neither command is run in this gate.
- [ ] Stop for independent mock-only review. Runtime evidence remains NOT_RUN; no official completion claim without explicit scoped acceptance.

### R2 — Separately authorized isolated Chrome boundary and review experiment

Propose CREATE `test/browser-first-read-only-connector-browser.mjs`; generate only temporary disposable extension/review/probe/manifest assets outside Git from that owned harness, following the existing `test/browser-first-three-role-browser.mjs` pattern. Reuse the R1 controller, without editing or silently copying authority from historical harnesses. No product manifest/background/popup modification.

- [ ] Authorize owned disposable profile, exact loopback origins/ports, invocation method, P2/P4 permission/UI choices, network containment, cleanup and evidence labels. Select one unresolved question per run; no BF-13 designation.
- [ ] Connect actual callbacks and browser-derived sender/result envelopes to the private boundary. Test genuine invocation, three distinct assignments, current/obsolete reviews, denial, real stale-document rejection and T7 UI behavior. Injected fault stimuli remain SIMULATED.
- [ ] Include the historical denial limitation in support disposition; no repeat-until-green loop. Prove no uninvoked access or unexpected page traffic and clean owned browser/profile/listeners/artifacts as authorized.
- [ ] Stop for fixture-scope review, recording PASS/FAIL/BLOCKED/NOT_RUN and all eight unsupported groups separately. Any denial, ownership loss, unapproved traffic or inability to clean up ends the experiment without expansion.

### R3 — Official 07.03 implementation/acceptance packet, separately authorized

If R1/R2 are prerequisites, they do not themselves start official 07.03 or increment progress. The owner/reviewer must explicitly decide whether the reviewed disconnected deliverable satisfies the agreed mock-only 07.03 scope or whether product wiring is additionally required. No retrospective acceptance is invented.

For product wiring only, propose MODIFY `src/background.js`, `manifest.json`; CREATE `src/browser/read-only-probe.js`, `src/review/read-only.html`, `src/review/read-only.js`, `src/review/read-only.css`; extend `test/read-only-admission.test.mjs` and add `test/read-only-review.test.mjs`. Preserve current `src/popup/*` wizard behind an explicitly approved packaged entry from the review; authorize any needed popup changes separately. Background is a thin event/transport caller of the sole controller, never a second admission owner. Probe is a fixed packaged read, review emits bounded intent and renders safe summaries. No adapter/workflow/storage exports are added.

- [ ] Approve exact file scope, permission manifest and toolbar/wizard behavior, contract mapping and applicable security decisions. Product wiring is not implied by fixture acceptance.
- [ ] Add focused mocks for wiring/transport/manifest permissions and UI safety; run existing regressions and separately authorized isolated browser tests on that actual product code.
- [ ] Independently review canonical read-only interface plus mocked tests, false authority flags, disconnected boundaries, protected history and explicit runtime limitations. Parent Phase 07 acceptance remains separate.
- [ ] Stop before real-site access, Phase 08 discovery, provider operations, persistence or writes. If current blockers prevent safe wiring, retain the disconnected result and NOT_AUTHORIZED status.

### R4 — Later capabilities, never bundled with R1–R3

Continuing navigation requires P3 and its unsupported-group evidence before enabling it. Any BF-07 bridge requires section 7's separate contract decision. Real read-only site/account work needs D-04/B-03, exact origins/accounts/policy/privacy authority and revised field allowlists. Production integration requires all applicable SEC-01/Phase 06/device/incident/security gates; writes additionally require target/effect-specific immediate approval, real rights, result checks, durable uncertainty and reconciliation without replay. Each needs a new scope, paths, tests and independent stop. No current roadmap row authorizes it.

## 11. Preflight, preservation and verification boundaries

| Field | Current planning-gate baseline |
|---|---|
| Root / branch | `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` / `feature/sh-project-setup-extension-clean` |
| All origin fetch / push URLs | Both `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| HEAD / upstream / live branch | `714a82141b7372050dd83631040b4705f1e2533f` |
| Upstream / divergence | `origin/feature/sh-project-setup-extension-clean` / 0 ahead, 0 behind |
| Initial tracked worktree / index | Only protected `.idea/plemo-chats.xml` modified; no staged changes, no untracked paths in this worktree |
| Protected IDE inventory | `.idea/plemo-chats.xml` tracked/modified; `.idea/workspace.xml` ignored; both preserved in place |
| Linked sibling | `/home/https_ali_muhammed/Plementus/Tools`, branch `feature/sh-project-setup-extension`, HEAD `390c9ea7c311f362ea04aad64ed14569161642ec`; its two existing untracked canonical/handoff source documents left untouched |

**Restriction deviation disclosed:** preflight mechanically computed hashes of both protected IDE files, which read their bytes contrary to the instruction not to read their contents. A later unscoped `git diff --stat` also mechanically accessed the tracked IDE change. No contents were displayed, interpreted or changed. This cannot be represented as an unread/unhashed preservation pass. Remaining IDE preservation checks use path/status/stat metadata only; no final content comparison is performed. Final content equality for those two files is therefore not claimed. The planning artifact remains reviewable, but strict execution-compliance acceptance is qualified by this deviation.

Current authored scope is exactly seven documentation files: CREATE this report; append only to `PHASE_07.md`, `../../00_PROJECT_STATUS.md`, `../../03_CHANGELOG.md`, `../../04_TEST_EVIDENCE.md`, `../../05_BLOCKERS_AND_DECISIONS.md`, `../../06_HANDOFF.md`. Six complete published bodies remain byte prefixes. All other tracked non-IDE content, including master/canonical, BF reports, source/tests/fixtures/manifest/policy/ADR/contracts, is protected. No application code is written or executed.

Historical BF-09 missing full-reference baseline/delta/timing, BF-10-R1 removed/added Codex refs and BF-12/R1 later ref differences remain **UNVERIFIED for historical full-reference preservation**. Current normal refs and current Codex namespace changes are measured separately against this task's baseline. Namespace membership alone proves no writer/cause/timing; no history or reference repair is performed.

Scratch baseline/checker/results are outside the repository at `/tmp/pre0703-baseline.json`, `/tmp/pre0703-verify.py`, `/tmp/pre0703-verification.json`. Final measured counts and limitations are appended to [the evidence ledger](../../04_TEST_EVIDENCE.md#pre-0703-planning-verification--2026-11-09-africacairo). Checks cover exact scope, six prefixes, protected hashes, master/source equality, Git identity/index/refs/history/reflogs/config/worktrees, local links/fragments and formatting; IDE checks are metadata-only after the disclosed deviation. No new Node/Chromium/application/provider tests; historical totals are not fresh evidence.

### Current measured result

The documentation checker passed 536 structural assertions: exact one-new/six-modified scope, six published prefixes, 228 protected non-IDE hashes, master/canonical equality, unchanged index/history/configuration/worktrees and ten normal refs. Current Codex delta is zero; historical full-reference uncertainty remains UNVERIFIED. All 468 scoped local links/112 fragments and 1207 links/248 fragments across 95 documentation files resolve; formatting checks pass. The first final remote query stalled and was terminated; a bounded replacement succeeded at the required SHA. No runtime tests ran. IDE metadata is unchanged, but the disclosed mechanical-content-read deviations prevent an unqualified compliance claim. Final verification is repeated after recording results.

## 12. Sources, methods and review stop

Public official Chrome documentation was consulted through `web.run` on **2026-11-09 (Africa/Cairo)**: action, activeTab, scripting, webNavigation, runtime MessageSender, tabs, permissions and worker lifecycle, linked at the relevant claims above. This is platform documentation research, not real-site/account inspection. No provider terms, selectors, rights or site compatibility were newly verified. Repository evidence and code were read without executing Node or Chromium. Proposed controls and roadmap are engineering recommendations, not Chrome guarantees.

Skills applied: Ponytail full scope discipline; Superpowers using-superpowers, brainstorming alternatives guidance, writing-plans and verification-before-completion. The user-specified seven-file scope and review stop override extra artifacts, implementation and commit defaults. Tools: functions.exec with shell/Git/Python and apply_patch, plus web.run for public official documentation and a read-only planning-review subagent. That subagent found no material planning contradictions; it did not verify implementation or confer owner/security acceptance. WarpGrep/Valyu were unavailable; no account connector or browser-control tool was used.

Next authorization: independent ChatGPT review of this package, then explicit owner/security decisions on R0 and a fresh narrowly scoped implementation or isolated-test authorization. No adoption, BF-13, official Phase 07.03 execution, staging, commit or push follows automatically. Production remains **NO_GO**.

**READY_FOR_CHATGPT_REVIEW / PRE_07_03_PLANNING_ONLY**
