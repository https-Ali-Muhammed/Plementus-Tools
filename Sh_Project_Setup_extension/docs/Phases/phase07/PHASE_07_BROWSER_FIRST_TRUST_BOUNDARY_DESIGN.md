# BF-08: Chrome-to-state-machine trust boundary design

2026-11-03 (Africa/Cairo). **PROPOSED / DOCUMENTATION_ONLY / OWNER AUTHORIZATION REQUIRED / SECURITY_REVIEW_PENDING.** This non-counted design is ready for independent review. The current instruction authorizes exactly seven documentation paths; it authorizes no bridge, permission adoption, architecture approval, test execution or runtime security claim.

## Authority and preserved baseline

**BF-07 is accepted and published at `29fd5c2457d89f7c7f26f44df9702304c658083b` (`29fd5c2`), per the supplied BF-08 instruction, within OFFLINE_SIMULATED scope only.** Git confirms publication, not independent reviewer authority. Preserve its [original report](PHASE_07_BROWSER_FIRST_SELECTION_INVALIDATION_SPIKE.md), original pending-review/stop wording, source and tests byte-for-byte. Historical results remain **46 focused / 242 existing / 288 full Node PASS**, both syntax checks PASS, with their original RED/failure history; none was rerun here. Acceptance does not authenticate its inputs or approve a production bridge.

[BF-01/R1](PHASE_07_BROWSER_FIRST_TAB_RECOGNITION_SPIKE.md), [BF-02](PHASE_07_BROWSER_FIRST_ARCHITECTURE_RECONCILIATION.md), [BF-03](PHASE_07_BROWSER_FIRST_CHROME_FIXTURE_SPIKE.md), [BF-04](PHASE_07_BROWSER_FIRST_PERMISSION_LIFECYCLE_DESIGN.md), [BF-05](PHASE_07_BROWSER_FIRST_ACTIVETAB_INVOCATION_SPIKE.md), [BF-05-R1](PHASE_07_BROWSER_FIRST_ACTIVETAB_HEADED_REMEDIATION.md), [BF-06](PHASE_07_BROWSER_FIRST_SELECTION_INVALIDATION_DESIGN.md) and BF-07 were inspected alongside [ADR-006/007/008](../../02_ARCHITECTURE_DECISIONS.md), [owner direction](PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md), [integration contracts](../../08_INTEGRATION_CONTRACTS.md), [security](../../09_SECURITY_AND_SECRETS.md), [Phase 04](../phase04/PHASE_04.md), [Phase 06](../phase06/PHASE_06.md), master/canonical and current tracking. ADRs and contracts remain unchanged; candidate M2 and UI migration remain unapproved.

Read-only inspection included [BF-07 source](../../../src/browser/selection-invalidation.mjs) and [tests](../../../test/selection-invalidation.test.mjs), the [BF-03](../../../test/browser-first-tab-recognition-browser.mjs), [BF-05](../../../test/browser-first-activetab-browser.mjs) and [headed R1](../../../test/browser-first-activetab-headed-browser.mjs) harnesses, current manifest and worker. The product still has no permissions and uses a default popup; the worker is an install-listener stub. None of these harnesses imports BF-07 or implements a production admission boundary. No caller, test, fixture, config, export, dependency or runtime change is required for BF-08.

## Mandatory Git preflight

| Field | Observed entry state |
|---|---|
| Repository root | `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` |
| Extension / branch | `Sh_Project_Setup_extension` / `feature/sh-project-setup-extension-clean` |
| Origin fetch and push | `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| HEAD / upstream / live remote branch tip | `29fd5c2457d89f7c7f26f44df9702304c658083b` |
| Upstream / divergence | `origin/feature/sh-project-setup-extension-clean` / 0 ahead, 0 behind |
| Staged / untracked | Empty / empty |
| Tracked difference | Only the explicitly exempt `.idea/plemo-chats.xml`; path inventory only, no content read, hash, edit, stage, revert or cleanup |
| Linked worktrees | Current root at `29fd5c2`; sibling `/home/https_ali_muhammed/Plementus/Tools`, branch `feature/sh-project-setup-extension`, HEAD `390c9ea7c311f362ea04aad64ed14569161642ec`; no sibling operation |
| Baseline/checker | `/tmp/bf08-49kg94us/`; 233 tracked-file hashes excluding the forbidden IDE contents, six original documents, raw index/entries, refs/reflog and worktree inventory |

Queries covered root/branch/HEAD/upstream, fetch/push origins, full porcelain with all untracked paths, cached inventory, divergence, linked worktrees and read-only `git ls-remote`. No Git mutation or fetch. Ignored `.idea/workspace.xml` is excluded from all content access, hashing and changes. The exempt IDE file has no byte-stability claim; other unexpected differences require a stop.

## Evidence classes and authority

| Class | What it establishes | What it cannot establish |
|---|---|---|
| OFFLINE_SIMULATED | BF-07's deterministic response to invented inputs; by-reference context/request correlation in one JavaScript instance | A Chrome event, usable tab grant, document freshness, sender authenticity, real account or execution authority |
| LOCAL_BROWSER_TESTED within LOCAL_FIXTURE_BROWSER_ONLY | A specifically observed Chrome API/event result on an invented disposable page in a recorded browser environment | Real HTTPS provider context, authenticated account, rights, policy compatibility, product admission enforcement or general lifecycle reliability |
| Candidate trusted application state | A future reviewed worker admits narrowly sourced browser facts and explicit UI intent under one live context and a tested rejection policy | Trust in arbitrary DOM content, immutable external state, an atomic three-tab snapshot, account rights or write authorization |
| MANUALLY_ATTESTED | A human reports native-site account/target or completion within their authority | Automated identity verification, fresh browser evidence or permission for an executor |

Evidence is attached to each observation/check and its actual provenance. A serialized `source`, `evidenceTier`, `privacySafe`, `lifecycleCoverage` or verified-state string never upgrades it. Mixed experiments retain separate browser-observed facts and synthetic fault stimuli; a combined PASS cannot relabel the synthetic part. Trusted application state is a proposed admission decision, not a new v1 adapter evidence tier. BF-07's public `evidenceTier: "OFFLINE_SIMULATED"`, `accountVerified: false`, `executionAuthorized: false` stay unchanged.

Chrome access, page context, account rights and immediate per-write authorization are four independent gates. A genuine action plus successful read establishes only momentary access to that document. Page context also needs exact reviewed origin/route/document and explicit role/target intent. Website login and account rights need separate site-specific evidence; Odoo.sh and GitHub sessions/rights remain independent. Future sensitive writes need their own current target/effect approval and result/reconciliation design. Neither this document, Chrome consent nor Phase 06's non-authorizing approval intent opens that gate.

## Exact BF-07 input provenance map

All inputs below are synthetic today, including values resembling Chrome data. A future runtime must derive facts through its own reviewed admission path; this table does not make those facts acceptable to the existing module.

| BF-07 input | Current meaning | Potential future source and limit |
|---|---|---|
| `config.expectedOrigins` | Distinct canonical fixture HTTPS origins: Plementus/Odoo.sh end in `.example`; GitHub exactly `https://github.com` | Owner-reviewed origin policy plus explicit native-site confirmation, never page claims or inferred deployment names. Real non-fixture origins require a new contract |
| `config.lifecycleCoverage: true` | Caller assertion required at construction | Worker checks approved API availability, current navigation permission, registered listeners and uninterrupted current boot/review. No Boolean supplied by UI/page proves coverage or absence of undelivered events |
| Every event's `type`, `context` | Caller-selected event; same live frozen object required | Internal controller chooses transitions; worker owns boot/review/generation. No serialized BF-07 dispatch endpoint; cloned counters are not the live context |
| `invoke.source: "SIMULATED"` | Only accepted source; `CHROME` and `LOCAL_BROWSER_TESTED` are rejected | Actual top-level `action.onClicked` callback captures browser tab before any await/focus change. Do not relabel that event SIMULATED and claim a runtime binding |
| `invoke.candidate`, `beginObservation.before`, `completeObservation.after` | Full invented metadata records at each boundary | Fresh Chrome API samples tied to a worker-owned pending transaction; source each field as below, with unknown/missing failing closed |
| `assign.role`, `targetConfirmed: true` | Invented operator-intent assertion | Exact owning packaged review document sends bounded role/capture confirmation after explicit human choice. It proves intent only; hostname may reject, never assign, a role |
| `beginObservation.role` | Invented read request | Current UI intent admitted by controller for its existing binding; page cannot select role or request arbitrary reads |
| `completeObservation.request`, `readSucceeded: true` | Same-instance one-use token and claimed success | Private pending entry mapped to a direct scripting Promise completion and exact result checks. Chrome provides no BF-07 request object or readSucceeded field |
| `uncertain.tabId`, `reason` | Invented uncertainty for a selected/captured ID; 13 supported reasons | Controller translates actual selected navigation, tab/window/access loss or its own detected mismatch/gap/timeout into invalidation; event reason strings cannot validate context |
| `reselect`, `manual`, `newReview`, `cancel` | Synthetic UI commands | Owning review's allowed intent only. Reselection clears no external uncertainty and restores no access/binding; new review still needs fresh genuine invocations |
| `reviewLost`, `reviewRestart` | Synthetic loss stimuli | Worker-owned review document/connection loss or replacement; a claimed old review epoch cannot reattach ownership |
| `workerRestart`, `browserRestart` | Explicit simulated events increment local counters | A real new worker creates a new unbound instance before processing anything. Do not depend on a shutdown callback or delivery of a restart event to the old instance |
| `coverageLost` | Synthetic sticky manual latch for that instance | Actual missing/removed navigation capability, failed listener setup or known gap. Regrant cannot revive old bindings; a separately admitted fresh review is required under the future contract |

Metadata has exactly the following fields; no successful defaults may fill an unavailable one:

| Fields | Candidate source and admission rule |
|---|---|
| `tabId`, `windowId`, `incognito`, `discarded`, `status` | Capture browser-supplied action tab identity; recheck with `tabs.get`. Reject unavailable/closed/loading/discarded/incognito/foreign or moved context. Tab IDs are session-scoped; same profile is constrained to this extension context with human confirmation, not an invented profile identifier |
| `frameId`, `documentId` | Chrome `InjectionResult.frameId/documentId`, corroborated against current top frame/navigation and, only if used, `MessageSender`. Require frame 0 and opaque nonempty document identity. No `Tab.documentId`, UUID-display requirement, URL hash or synthetic document marker |
| `documentLifecycle` | Current supported navigation/frame observation reports active document; a port's creation-time lifecycle is insufficient. Missing, cached, prerendered or ambiguous means no accepted context |
| `origin`, `url` | Browser-observed committed URL, parsed exact scheme/host/effective port, cross-checked with current frame and bounded read. Full path/query/fragment comparison is transient and privacy-gated. Page-returned location alone cannot supply browser provenance |
| `permission` | Derived local verdict from current capability checks plus the actual document-targeted read; `permissions.contains(activeTab)` alone does not prove the selected tab's grant. Denial/unknown never becomes granted |
| `pendingNavigation` | Conservative controller state from earliest navigation/loading/error signals and fresh checks. Missing `pendingUrl` or `status: complete` alone cannot establish false; uncertain continuity blocks |
| `pageKind` | A later approved, bounded packaged probe may classify a supported fixture/page signature. It remains page-controlled data, unable to prove account/rights. Unknown signature or unsupported frame means manual mode |
| `privacySafe` | Reviewed collection/output policy and bounded local admission, not a page-supplied flag. No generic probe can guarantee secret-free arbitrary DOM/URLs. Without an approved collection contract, do not collect and mark true |

BF-07's limits (positive safe-integer tab/window IDs, printable document strings of 1–128 characters, canonical HTTPS URLs up to 2048 characters and exact record keys) are simulation validation rules, not a verified range contract for every Chrome result. Its per-role requests and context objects compare by reference. Runtime messages serialize data, so even an equal frozen clone is refused. A future worker must keep actual BF-07 tokens private if a separately approved fixture projection ever uses them; UI messages must never submit dispatch/context/request objects directly. The current module has no timeout producer, clock, listener, Chrome sender validation, UI-instance binding or invocation/capture identifier checked by `assign`. Those obligations cannot be delegated to its existing parser.

## Loopback mismatch and integration alternatives

The existing browser harnesses use **HTTP `127.0.0.1` with three separate ephemeral ports**, plus `127.0.0.2` for cross-origin/negative control. Their GitHub role is an invented local page, never `https://github.com`. BF-07 rejects HTTP, both loopback hosts for non-GitHub roles, and any local GitHub origin. Even a local HTTPS server does not satisfy BF-07's exact GitHub restriction. BF-03 explicitly avoids importing/adapting BF-01; BF-05/R1 similarly remain standalone.

Do not rewrite scheme/host/port, map loopback URLs to `.example`/GitHub and present the mapped result as genuine site evidence, monkey-patch `URL`, fabricate document IDs/flags, weaken guards or change output tiers. A future abstract projection may compare model behavior only if it is explicitly synthetic, separately tested and retains the independent raw-observation provenance; it cannot be the runtime admission decision.

| Alternative | Benefit | Cost / decision and evidence boundary |
|---|---|---|
| A. Separate disposable browser observer; BF-07 stays disconnected | Smallest next experiment; tests actual invocation/document/loss primitives without corrupting the accepted model or inventing a site contract | Recommended first candidate. No end-to-end BF-07 bridge evidence and no product authority. Observer output remains LOCAL_BROWSER_TESTED for the exact loopback cases only |
| B. Independently tested fixture adapter with explicit synthetic projection | Compare browser-driven traces against the unchanged offline model; can test translation errors independently | More code and dual provenance. Any invented origin/flag/ID mapping must stay SIMULATED and never serve as a trusted real-site binding. Requires separate adapter scope/spec/tests; no adapter authored now |
| C. Revised simulation/runtime contracts after review | Could admit honest exact loopback origins in a fixture contract and later reviewed real HTTPS origins in a distinct runtime contract | Changes accepted BF-07 assumptions and demands fresh regression/security acceptance. No universal allow-HTTP flag, source-label switch or general origin wildcard; no contract revision approved here |
| D. Manual fallback, or separately authorized fresh single-tab read | Least capability; remains usable when continuing observation cannot be justified | No aggregate three-role verification, automatic account check or write authority. Human outcome is MANUALLY_ATTESTED; no credentials/API workaround |

**Recommendation, not owner selection:** A first, with D as the operational fallback. B/C are later decision alternatives, not parallel implementations or approved architecture. There must be only one authoritative runtime admission controller if one is ever built. BF-07 may remain a reference model; its aggregate Boolean must never be ORed with observer success or wrapped in a LOCAL_BROWSER_TESTED label to create authority. A real bridge requires an explicitly reviewed provenance/contract change before any state-machine connection.

## Proposed ownership and trust boundary

The following describes responsibilities for a future separately authorized design implementation, not existing modules or an approved file layout.

| Component | Sole responsibilities | Forbidden authority |
|---|---|---|
| Chrome-facing observer inside the worker | Capture real action callback tab/window synchronously; obtain document metadata through direct APIs; register lifecycle/access listeners; attach source and current local sequence to observations | Cannot infer role, verify account or approve a write; no public command to manufacture invocation |
| Worker admission controller | Own current boot/review/capture/pending entries; validate provenance and policy; serialize acceptance; derive safe state; invalidate globally before awaits; consume one-use results | No recovery from UI cache, persisted bindings or surviving grant. No production use of unmodified BF-07 as a Chrome verifier |
| Packaged review page | Explicit role/target intent for a specific current capture; accessible generic state display and stop/manual controls; display is withdrawn on disconnect/epoch mismatch | No browser fact, lifecycleCoverage/readSucceeded/permission assertion, arbitrary host/selector/code, account-verification flag or state assignment |
| Short-lived packaged isolated-world probe | Only a reviewed top-document bounded read; browser result envelope is matched to pending request | Returned page content is untrusted; cannot choose commands, establish sender identity, authenticate a site account, read secrets or start autonomous work |
| Separate future account/write/reconciliation controls | Resolve real rights, exact per-write approval and durable uncertain-outcome obligations under new gates | No such executor or bridge exists/gets authorized by BF-08; Phase 06 approval remains non-authorizing |

Candidate no-popup action capture follows BF-04/ADR-007: record the callback's tab before opening/focusing review. Current default popup suppresses onClicked and cannot simply be reused as that path. A later focused-tab query is not invocation evidence. An action event proves browser invocation, not named human identity or business consent. Review ownership must bind one exact packaged document/context and connection, not extension ID/URL alone; a new review document cannot inherit the old page's state. BF-05-R1's URL/ID-only status endpoint is a test diagnostic, not this prospective UI authorization mechanism. [Chrome action](https://developer.chrome.com/docs/extensions/reference/api/action), [MessageSender](https://developer.chrome.com/docs/extensions/reference/api/runtime#type-MessageSender).

## Proposed observation and rejection sequence

1. **Start empty.** New worker boot gets an unpredictable local boot marker and empty review/bindings/pending maps; register top-level listeners on every start. No reliance on `onInstalled`, `onStartup`, a final shutdown event, keepalive, storage or an old UI. Feature/listener setup failure leaves manual mode.
2. **Establish bounded coverage.** Before any capture, require reviewed navigation capability and listeners for selected main-frame start/commit/error/history/fragment/replacement plus tab removal/replacement/detach/attach/window loss/discard/freeze where supported and permission loss. Missing required lifecycle support withholds guided observation; do not silently omit the signal. Observe by selected/captured ID, not only expected-origin filters that miss departures. Drop unrelated URL payloads immediately. Permission breadth is still broad; filtering does not narrow the Chrome grant. Listener registration, an empty queue or a sleep is no navigation barrier; uncertain initial/in-flight state blocks.
3. **Capture then confirm.** Only the actual action callback creates an unassigned capture in the current review. Bind its own capture sequence/tab/window before awaiting discovery. A second capture replaces the unassigned one; a selected-tab recapture/conflicting role/target change globally invalidates first. UI confirmation must reference that exact current capture and UI connection. A delayed confirmation cannot assign a newer capture. Require three distinct IDs and explicit roles; never choose by origin/title/first match.
4. **Discover, then target.** Acquire fresh tab and active top-frame identity; discovery is unverified. With a known document, one packaged probe targets `{tabId, documentIds: [expectedDocumentId]}` in the isolated world. Require exactly one result for expected document/frame 0; missing/extra/conflicting results fail. Never fall back to tab-only, allFrames, MAIN world or broader permission after failure. API completion metadata is browser evidence; `result` remains untrusted page-derived data. [Scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting).
5. **Bind each await.** Private pending entry records boot/review/capture or binding identity, global generation, role, request sequence, expected document/window, allowed result schema and a transient exact URL comparator. Every asynchronous continuation rechecks the tuple and current ownership. Navigation/permission/UI loss increments generation and discards all pending entries synchronously before other work. A later successful read cannot undo invalidation.
6. **Admit once.** Require supported active top document, exact reviewed origin/full pre/post URL, current capability, bounded safe page-kind result and no known intervening navigation/gap. Current frame and script result must agree; URLs/documents alone cannot prove uninterrupted history. Remove the pending entry before any external callback/display; accept once. Discard comparator data on completion/failure/invalidation. Known hard failure takes precedence over missing/unknown data. No automatic read retry or timeout extension.
7. **Display a scoped verdict.** Controller may display only what the separately accepted contract proves; the initial observer experiment has no BF-07 verified-state output. A future aggregate is momentary RO context agreement with three current explicit bindings and no pending capture/read/uncertainty. It is neither a continuous guarantee nor an atomic cross-tab snapshot. Same-document account/target changes can evade URL/document checks; unknown context means manual fallback.

There is no exact timeout/payload/collection policy invented here. Those numerical bounds, safe URL/page fields, listener support floor and owning-UI context mechanism must be specified/tested before even the proposed collector is authorized. Current Chrome document APIs have relevant Chrome 106 feature gates; this is not adoption of a minimum browser version.

| Input/failure | Rejection and state effect |
|---|---|
| Page/external/foreign-extension message claiming invocation, coverage, role, permission, state or approval | No external messaging surface proposed. Reject at entry; never pass payload to BF-07. Page `postMessage` and claimed sender fields have no authority |
| UI message from wrong packaged page, old/second UI document, wrong connection/review/boot/capture, extra keys or invalid scalar | Exact schema and browser-provided sender/context checks first; reject without any transition. No reflective/executable object admitted into the controller |
| Content-script message if ever separately introduced | Prefer direct executeScript completions for the first observer; no content-message endpoint is needed. Later messages require actual sender extension ID, selected tab/window, frame 0, document, exact URL/nonopaque origin, current pending request and bounded inert payload; sender claims in payload are ignored. Correlation never makes DOM authentic |
| Duplicate/unsolicited/late/out-of-order result or cloned BF-07 token | Drop; no pending admission means no effect. Never look up only by a reusable counter or trust a supplied evidenceTier; old result cannot validate or take ownership of a new binding |
| Current selected document/window/origin mismatch, API rejection, timeout or malformed expected result | Globally invalidate all occupied roles/capture; consume every pending read; withdraw aggregate; require reselection/manual. Do not transfer an old response to a new request |
| Navigation, reload, same-URL/history/fragment event, cross-origin departure/return, replacement, close/move/discard/freeze | Invalidate at earliest applicable observation, including start/loading. No replacement-ID mapping or restoration from matching final URL. Same-document events invalidate even when document ID is unchanged |
| Missing/removed navigation permission, unsupported lifecycle field/event, known listener gap | Stop guided observation, clear all bindings and latch manual for that review. Polling, page route hooks and granted activeTab do not substitute. Regrant permits only a new explicitly admitted review, never revival |
| Review reload/close/navigation/connection loss, worker/browser restart/crash/restore | New state UNBOUND (or unsupported MANUAL_FALLBACK); old UI and requests unusable. Fresh invocations/role confirmations for all three. Surviving scripting access proves no application continuity |
| Wrong/unknown account/target, unsupported UI/frame or privacy ambiguity | Stop automatic collection; manual native-site verification only. No title/avatar/login inference, account-menu scrape, credential inspection or rights claim |

Malformed unrelated traffic should not become an attacker-controlled global-reset endpoint. Reject it without progress; actual selected-context contradictions/known gaps invalidate globally. Delayed browser events may conservatively invalidate a newer context; they can never establish freshness. Missing lifecycle coverage cannot be detected perfectly from silence: unsupported coverage is a reason to withhold the guided verdict, and residual delivery/race limits must remain explicit.

## Replay, worker loss and policy constraints

Human stop/cancel clears all volatile captures, bindings, confirmations and pending reads before further work. Explain that stopping application observation does not revoke Chrome grants or log out websites; do not close/navigate user tabs to manufacture revocation. A new review requires fresh invocation/confirmation and cannot erase external uncertainty.

BF-07's object identity rejects cloned/old tokens only within the simulation's live memory. Its numeric generations restart at 1 in a new factory, so they are not cross-boot identity or durable duplicate protection. Candidate runtime correlation combines an unpredictable current boot/review marker with worker-private pending membership, exact owning UI instance and single consumption. These markers are non-secret correlation data, not transferable capabilities; exposing an epoch does not authorize an intent. No pending map or binding is restored from storage or UI. A message that wakes a new worker cannot supply the missing genuine invocation history. [Worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).

A real worker restart is observed as new empty execution, not dispatch of BF-07's synthetic workerRestart on an old state machine. BF-05-R1 demonstrated retained access after controlled worker stop; do not infer permission revocation from lost globals or rehydrate from that access. Natural idle/crash/restoration remain untested. No clock/TTL, event timestamp, heartbeat or artificial keepalive proves continuity or changes trusted-time policy.

No credential/cookie/token/private authentication-state access, network interception, authenticated fetch/XHR proxy, undocumented endpoint, OAuth/backend, screenshots, DOM dumps, business writes or form filling. Form filling may autosave and is outside RO. Future diagnostics contain role, generic state/reason, provenance category and counts only: no raw/full URLs, titles, IDs, page text, customer/account values, stable hashes or raw errors. Exact URLs/document/IDs, if separately authorized, remain private transient comparison inputs. A privacy policy must precede collection; redaction afterward is not permission to capture secrets.

[SEC-01](../phase04/PHASE_04_SEC01_APPROVED_POLICY.md), [cleanup outcome decision](../phase04/PHASE_04_SEC01_CLEANUP_OUTCOME_CONTRACT_DECISION.md), [clock/restart restrictions](../phase04/PHASE_04_SEC01_STALLED_WALL_AND_RESTART_RESOLUTION.md) and Phase 06 gates are unchanged. No new persisted field/storage, retention rule, deletion/retry, approval promotion, executor or durable write guarantee. A fresh review cannot clear `RECONCILE_REQUIRED`, held uncertainty or outstanding retention obligations. Future write/recovery design is blocked independently of any observer test.

## Smallest future disposable-browser experiment

**Design only / NOT AUTHORIZED / NOT RUN.** Candidate A uses one fresh visible Chromium profile and one generated no-popup MV3 observer, two invented loopback origins, one uninvoked same-origin duplicate/control tab and one static packaged review page. One role is enough to prove the boundary before paying for a three-role integration test. The fixture policy must explicitly admit the actual HTTP addresses and ephemeral ports, with no provider names represented as provider evidence. No BF-07 import/adapter or HTTPS relabeling. Reuse the existing R1 harness's local GET-only fixtures, denied-forwarding proxy, request allowlist and owned-directory/finally cleanup pattern; do not import its weak diagnostic endpoint as an authorization layer.

Candidate temporary capabilities for separate owner/security approval: `activeTab` + `scripting`, with `webNavigation` only as a separately explained optional capability for the guided-coverage arm; no tabs/hosts/storage/debugger/content scripts/commands. This does not adopt production permissions. A future exact-scope request must define how the human grants/denies the optional permission and the exact supported environment; no synthetic permission override. The initial experiment must report DENIED/UNAVAILABLE honestly and keep its coverage-dependent arm blocked when that grant cannot be observed.

| Step | Meaningful evidence to request later | Boundaries |
|---|---|---|
| 1. Negative baseline | Actual selected/control IDs deny scripting; no action event. A forged invocation/confirmation message is rejected without creating observer state | Message payload is a deliberate adversarial stimulus; actual sender/rejection is local observer evidence, not BF-07 evidence |
| 2. Genuine invocation and explicit confirmation | Human personally activates/clicks the pinned action; actual callback captures that ID before review focus; bounded main-document result and navigation identity agree. Delayed/wrong-capture UI intent refused | Human reply/activation alone is insufficient. Known visible fixture labels only; account/execution false |
| 3. Race and stale document | Hold result acceptance in test-driver instrumentation, genuinely reload/navigate fixture, then release old completion; reject both old document-targeted read and late response; history/fragment change also withdraws context despite same document | Acceptance delay is test instrumentation, not a Chrome event. Record it separately; assertions require actual observed navigation/document signals |
| 4. Coverage loss | Actual optional-navigation denial/removal leaves manual/unbound and refuses queued completion; grant readdition does not restore context | If genuine browser consent/removal cannot be induced/observed, BLOCKED/NOT RUN; a fake coverageLost is SIMULATED and cannot substitute |
| 5. Worker loss | External driver forces disposable worker stop, confirms new boot; remaining Chrome access may survive, but prior UI/requests are rejected and state stays empty until a new real invocation | Controlled stop only, never evidence of natural idle/crash/session restoration; external CDP is not an extension debugger grant |
| 6. Cleanup and privacy | Close context/servers; remove only the owned temp root; verify no listeners/profile remain and zero forwarded external/page requests; invented canaries absent from diagnostic outputs | Proxy/allowlist evidence is not OS-wide egress certification. Record every failure/unsupported case; no generated pass counts in advance |

This provides LOCAL_BROWSER_TESTED evidence of the observer's specific provenance/rejection behavior only. It does not exercise BF-07, three-role aggregation, real HTTPS sites, production UI/sender security, natural lifecycle, BFCache/prerender replacement, account rights, writes or durable replay. A later three-role/bridge acceptance test needs an approved contract, real role confirmations and its own scope. No BF-09 prompt or follow-up execution is provided here.

## Dependency and authorization matrix

Gate labels below are local to this proposal, not new phases or approvals: **R** independent BF-08 documentation review; **F** separately authorized disposable observer scope/permissions; **C** separately approved fixture/bridge contract and implementation scope; **L** separately authorized real-site read/rights/policy scope; **W** separately authorized write/security/reconciliation work. Passing an earlier gate never authorizes the next.

| Dependency / remaining decision | Risk / fail-closed outcome | Current evidence | Future test method / attainable tier | Required gate / decision owner |
|---|---|---|---|---|
| A/B/C integration route and fixture-origin contract | Origin laundering or synthetic evidence promoted; keep BF-07 disconnected | Source/tests and HTTP harness mismatch confirmed read-only | Exact-origin negative/translation tests; synthetic projection stays OFFLINE_SIMULATED; real loopback facts LOCAL_BROWSER_TESTED | R; owner chooses route. F for A; C before any adapter/contract/bridge |
| Permission breadth and optional navigation UX | Navigation exposure beyond selected tabs; absent coverage means manual | ADR-007 candidate only; R1 no webNavigation; BF-03 separate host/navigation arm | Real grant/deny/remove with queued-result rejection; LOCAL_BROWSER_TESTED | Owner/security approval of F capabilities; separate production adoption decision |
| Invocation capture and explicit role ownership | Wrong tab/capture or old UI selects new target | R1 three actual events/grants in one session; no production UI | Genuine action before focus change; current/wrong capture and duplicate UI tests; LOCAL_BROWSER_TESTED | F for one-capture observer; C for three-role UI/bridge |
| Document/source binding and bounded read schema | Stale result or untrusted DOM becomes authority | Historical R1 stale-document rejection; BF-07 invented before/after | Actual reload/history with delayed completion; exact result cardinality/sender/frame negatives; LOCAL_BROWSER_TESTED, synthetic faults separately labeled | F plus owner/security-approved fields, bounds, timeout and collection policy; C for runtime contract |
| Browser support, navigation coverage and ordering | Gaps, BFCache/prerender/same-URL events; withhold continuing verdict | BF-03 history/fragment primitives; R1 unsupported groups retained | Versioned capabilities, selected departures, real replacement/BFCache and race experiments; unsupported stays NOT RUN | Owner/security support floor; F for separately bounded cases, no automatic scope expansion |
| UI/worker/browser loss and replay | Surviving grant revives old state; new boot stays unbound | R1 controlled grant retention; BF-07 identity checks only offline | Old UI/boot/one-use request rejection across actual forced stop; later natural/crash/restore tests; LOCAL_BROWSER_TESTED only for induced cases | F; C before runtime state admission; no storage/keepalive exception |
| Privacy and pageKind/privacySafe meaning | Secret-bearing URL/DOM captured before redaction; no collection without contract | Existing diagnostics use invented fixtures; no real-page privacy proof | Invented sensitive canaries, schema/output review; fixture evidence only, real collection still UNVERIFIED | Owner/security collection decision before F; L before any live observation |
| Same-profile, real origins/accounts/rights/site use (D-04/B-02/B-03) | Wrong customer/account or policy breach; manual/blocked | Owner arrangement only; no live facts. API candidate deferred | Separately authorized minimal native-site context checks and human attestation; relevant site tier only after actual evidence | L; owner/account authority/security. No API/session workaround; all three blockers OPEN |
| Per-write approval, result checks and durable uncertainty | Duplicate/unknown write, unsafe recovery; no executor | Phase 06 simulated intent is non-authorizing; Phase 04 BLOCKED | New design before any exact disposable write; provider result/reconciliation tests only with explicit authority | W plus Phase 04/06/security gates; never satisfied by R/F/C/L |
| Historical acceptance/publication | Documentation acceptance mistaken for runtime approval | BF-07 supplied acceptance at 29fd5c2; protected original report/results | Documentation provenance, unchanged bytes and independent review only | R; independent reviewer/owner, no architecture or permission approval inferred |

## Historical browser evidence retained

BF-03: **43 PASS / 0 FAIL / 5 SKIP** (37 LOCAL_BROWSER_TESTED + 6 SIMULATED passes). BF-05 headless: **16 PASS / 0 FAIL / 10 SKIP / 4 BLOCKED**, zero actual invocations. BF-05-R1's governing reopened run: **19 PASS / 0 FAIL / 2 SKIP / 0 BLOCKED**, three actual action events/grants concurrently usable, lifecycle 8 PASS / 2 SKIP. Same-origin retention, reload/new document/stale-target refusal, cross-origin loss without automatic return, close/reopen, review-marker loss, forced worker-record loss and controlled browser restart are narrowly recorded there. Initial baseline failure, partial third-click timeout and reopened scripting failure remain unresolved history, not reliability certification.

R1 did not declare navigation permission or popup. Its surviving grant after review/worker loss is a Chrome fact, not a tested application invalidation rule. Same-tab restoration/crash, natural idle, prerender/BFCache, optional consent/removal and actual popup lifecycle remain unsupported/unverified. BF-03's ordinary extension-page events and host grants do not fill those gaps. The governing historical scratch log `/tmp/bf05-r1-evidence-j_akjvnh/browser-reopened-diagnostic.txt` was unavailable during BF-08; evidence here is the checked-in detailed R1 report and inspected harness, not independently reread raw logs or a fresh run. BF-07 adds no Chrome evidence.

## Exact scope, documentation verification and stop

Paths relative to `Sh_Project_Setup_extension`:

| Change | Authorized path |
|---|---|
| Create | `docs/Phases/phase07/PHASE_07_BROWSER_FIRST_TRUST_BOUNDARY_DESIGN.md` |
| Modify | `docs/Phases/phase07/PHASE_07.md` |
| Modify | `docs/00_PROJECT_STATUS.md` |
| Modify | `docs/03_CHANGELOG.md` |
| Modify | `docs/04_TEST_EVIDENCE.md` |
| Modify | `docs/05_BLOCKERS_AND_DECISIONS.md` |
| Modify | `docs/06_HANDOFF.md` |

Six dated inserts follow existing titles; their complete original bodies remain exact suffixes. All previous reports/results, BF-07 module/tests, ADRs, contracts/security/SEC-01, Phase 04/06, manifest/popup/worker, fixtures/dependencies and master/canonical remain protected. IDE exceptions are excluded from content reads and equality claims. No other authored change. [Verification ledger](../../04_TEST_EVIDENCE.md#bf-08-documentation-verification--2026-11-03-africacairo) records the actual scope/historical/protected-byte/index/history/worktree/master/link/whitespace/newline checks; scratch artifacts remain outside Git at `/tmp/bf08-49kg94us/`.

## Official Chrome source register

Public official pages retrieved with `web.run` on **2026-11-03 (Africa/Cairo)**. Sources support platform semantics; proposed ownership/acceptance/rejection rules are engineering recommendations, not runtime guarantees. The canonical webNavigation URL timed out twice; its official `?hl=en` form succeeded. No authenticated site or real profile inspected.

| Source | Supported platform fact / boundary |
|---|---|
| [Action API](https://developer.chrome.com/docs/extensions/reference/api/action) | onClicked supplies a tab; configured popup suppresses it; no proof of account/operator identity |
| [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) | Temporary invoked-tab access, same-origin retention, cross-origin/closure revocation and restricted pages |
| [Scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting) | scripting plus page grant; document-targeted injection/results and frame/document targeting exclusion |
| [Tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs) | Session IDs, metadata limits and tab/window/lifecycle loss signals; no Tab.documentId |
| [webNavigation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation?hl=en) | Separate capability; main-frame/document identity, start/commit/error/history/fragment/replacement events; BFCache lacks DOMContentLoaded; document persists through lifecycle changes |
| [Runtime sender](https://developer.chrome.com/docs/extensions/reference/api/runtime#type-MessageSender) | Browser sender ID/tab/frame/document/origin; port lifecycle sampled at creation, not current activity |
| [Messaging security](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#security-considerations) | Treat content-script messages as attacker-controlled input; constrain privileges and render safely; messages are serialized |
| [Worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Unexpected termination and loss of globals; generic storage advice gives no SEC-01 persistence/revival authorization |
| [Permissions](https://developer.chrome.com/docs/extensions/reference/api/permissions) | Eligible declared requests, grant queries/removal and loss events; permission success is not execution approval |
| [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) | Isolated globals still share page DOM; script access is technically capable of mutation, not a Chrome RO permission |

Skills applied: Stop Slop for final prose review; Superpowers using-superpowers, brainstorming for these specified design alternatives, writing-plans guidance limited to the documentation work sequence, verification-before-completion; Ponytail full. The user's exact documentation paths and review stop override skill-default extra artifacts, implementation and Git publication. Tools used: shell/Git/Python through functions.exec, web.run for official sources; read-only builder review is recorded in the verification ledger. WarpGrep and Valyu were unavailable in the discovered inventory. No Node/application/Chrome/provider test, browser-control tool, authenticated connector or simulated test-evidence generation. Documentation checks are the only executed verification.

Progress stays **5/20 master phases; 28/72 official micro-phases**. Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED**; Phase 07 **IN_PROGRESS / NOT ACCEPTED**; Phase 07.03 **NOT_STARTED / NOT_AUTHORIZED**; D-04/B-02/B-03 **OPEN**; twelve historical decisions **PENDING**; production **NO_GO**. No new permission, architecture approval, bridge, real-site inspection, policy exception or security claim. Next action is independent BF-08 documentation review only; no BF-09, Phase 07.03, runtime integration, staging, commit or push.

**READY_FOR_CHATGPT_REVIEW / DOCUMENTATION_ONLY. STOP.**
