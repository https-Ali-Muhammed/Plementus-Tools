# BF-04: Least-privilege Chrome permission and tab-lifecycle design

**READY_FOR_CHATGPT_REVIEW / DOCUMENTATION_ONLY.** Dated **2026-11-03 (Africa/Cairo)**. Candidate architecture for later owner/security review; **PROPOSED / UNIMPLEMENTED / SECURITY_REVIEW_PENDING**. The owner's eight-path instruction authorizes this documentation task only. It does not approve a permission set, browser implementation, real-site inspection, BF-05, Phase 07.03 or production activation.

## Authority and preserved evidence

The [browser-first owner direction](PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md), [BF-02 reconciliation](PHASE_07_BROWSER_FIRST_ARCHITECTURE_RECONCILIATION.md) and [ADR-006](../../02_ARCHITECTURE_DECISIONS.md#adr-006-browser-first-three-tab-owner-direction--2026-11-03-africacairo) govern current planning. The engineer already has GitHub, Odoo.sh and Plementus open and signed in within one Chrome profile, according to the confirmed product requirement. This is not a live observation of accounts, rights or sessions. Use the existing website interfaces and their own session handling. No separate website OAuth, GitHub App, PAT, backend or authenticated API client is required by default. Never extract cookies, session material, tokens or credentials; no private page globals, credential storage inspection, network interception or authenticated endpoint proxy.

**BF-03 is independently accepted and published at `efd5757fcb597848ab48bda8feb4704b6dcaadd3` (`efd5757`), per the supplied owner instruction, within LOCAL_FIXTURE_BROWSER_ONLY scope.** Git independently confirms publication; it does not establish reviewer authority. The [published BF-03 report](PHASE_07_BROWSER_FIRST_CHROME_FIXTURE_SPIKE.md) and [harness](../../../test/browser-first-tab-recognition-browser.mjs) retain their original bytes, pending-review wording, development failures and historical **242 Node PASS; 48 Chrome cases: 43 PASS / 0 FAIL / 5 SKIP/NOT RUN**. Passing cases comprise **37 LOCAL_BROWSER_TESTED + 6 SIMULATED**. None was rerun for BF-04. Acceptance supplies no human-selection evidence, product permission approval, account verification or write authority. BF-01's accepted offline evaluator and BF-02's published report are also unchanged; no additional BF-02 acceptance is inferred.

Read the [master plan](../../01_MASTER_PLAN.md), [canonical master](../../_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md), [integration contracts](../../08_INTEGRATION_CONTRACTS.md), [security policy](../../09_SECURITY_AND_SECRETS.md), [Phase 07 parent](PHASE_07.md), [BF-01 including R1](PHASE_07_BROWSER_FIRST_TAB_RECOGNITION_SPIKE.md), BF-02/BF-03, owner direction and current status/changelog/evidence/blockers/handoff. Read-only inspection of the [manifest](../../../manifest.json), [popup](../../../src/popup/popup.js), [popup markup](../../../src/popup/popup.html), [worker](../../../src/background.js), [BF-01 evaluator](../../../src/browser/tab-recognition.mjs) and BF-03 harness confirms: product manifest has no permissions/host grants/content scripts; popup is a local preview; worker is an install-listener stub; BF-01 compares synthetic snapshots only; BF-03 is a disconnected disposable test. This report changes no caller, export, schema, fixture, test, configuration or runtime behavior.

| Independent control | Meaning in this design |
|---|---|
| Website login | Site-owned session, human sign-in/MFA/CAPTCHA; Odoo.sh's GitHub login does not merge the two sites' rights |
| Chrome site/API access | Browser capability and its own consent; an invocation or grant is neither account verification nor business approval |
| Account operation rights | Separately establish intended account, organization/repository, subscription, customer and environment; a button or successful read is insufficient |
| Immediate per-write approval | Review exact current target and effect immediately before each sensitive write; invalidate on drift; observation/selection never grants execution |

## Git preflight and scope boundary

| Field | Verified before edits |
|---|---|
| Root | `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` |
| Extension | `Sh_Project_Setup_extension` |
| All origin fetch/push URLs | `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| Branch | `feature/sh-project-setup-extension-clean` |
| HEAD / upstream SHA / live tip | `efd5757fcb597848ab48bda8feb4704b6dcaadd3` |
| Upstream / divergence | `origin/feature/sh-project-setup-extension-clean` / `0 0` |
| Staged / unstaged / untracked entry inventory | Empty / empty / empty; **225 tracked paths**, all equal HEAD |
| Worktrees | Current clean worktree at `efd5757`; preserved sibling `/home/https_ali_muhammed/Plementus/Tools`, branch `feature/sh-project-setup-extension`, HEAD `390c9ea7c311f362ea04aad64ed14569161642ec`; no sibling operation |
| Snapshot | `/tmp/bf04-docs-vaadxibr/baseline.json`: tracked hashes, raw index hash/entries, HEAD and history hash |

Read-only Git queries included root/branch/HEAD/upstream, all origin fetch/push URLs, full porcelain with all untracked paths, staged inventory, worktree inventory, tracked flags/entries, divergence, HEAD publication metadata and `git ls-remote origin refs/heads/feature/sh-project-setup-extension-clean`. No clone, switch, fetch, reset, stage, commit or push. Ignored `.idea/workspace.xml` is excluded from every content read, hash and change.

## Platform facts and permission comparison

Official Chrome documentation was retrieved on **2026-11-03 (Africa/Cairo)**. Citations support platform facts; the candidate choices and safeguards below are engineering proposals, not Chrome guarantees or new runtime evidence.

- `activeTab` grants temporary access to the tab on which the user invokes the extension. Same-origin navigation can retain the grant; cross-origin navigation and closure revoke it. Restricted pages remain unavailable. Selecting IDs in a wizard, declaring the permission, activating a tab programmatically or opening a popup programmatically does not establish three genuine invocation grants. Three existing site tabs would require separate actual invocations and validation of each grant's continuing usability. Coexistence in this proposed UX remains unverified. [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab).
- Most tab management needs no `tabs` permission. That permission exposes `url`, `pendingUrl`, `title` and `favIconUrl`; applicable host access also exposes matching metadata. Neither is proof of DOM access or an account. IDs are browser-session identifiers, not durable identities. `tabs.onReplaced` reports prerender/instant replacement with added/removed IDs. [Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs).
- Programmatic injection needs `scripting` plus applicable host access or an invoked `activeTab` grant. It defaults to the main frame. Document results/targets support `documentId`/`documentIds` from Chrome 106; document targeting and frame targeting are alternatives. Removing registered scripts does not remove code already injected. [Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting).
- `webNavigation` is a separate permission, not a host/script grant. Its frame/document and history/fragment events help detect lifecycle changes. It can expose navigation outside host injection access, as BF-03 observed. Filtering callbacks to selected IDs/origins reduces collection but does not narrow the permission boundary. Frame IDs survive document changes; cached/prerendered and overlapping navigation sequences need care. [webNavigation API](https://developer.chrome.com/docs/extensions/reference/api/webNavigation).
- Named, host and optional declarations are separate manifest categories. Runtime requests need a user gesture and declared/withheld eligible scope; broad optional HTTPS declarations can support hosts discovered later. `contains`, grant events and actual API outcomes need rechecking; removal can fail. Browser prompts may not recur for previously granted scope. Chrome 133+ `addHostAccessRequest` acceptance gives persistent top-origin access, not a temporary tab grant. [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions), [Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions).
- Host-pattern paths are ignored for host permissions; a path pattern cannot restrict access to one project. Patterns may cover more ports/subdomains than the application intends; BF-03's portless loopback pattern covered three ports. The current match-pattern reference describes optional port syntax; compatibility of any proposed port-specific declaration needs later validation. Always compare actual scheme/host/effective port independently. [Match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns).

The following are feasible platform approaches with different coverage. No row adopts a product manifest. **RO** below means intended read-only application behavior; Chrome does not provide a read-only DOM permission. `scripting` plus page access can mutate DOM and trigger site actions, so RO must be enforced by reviewed packaged code and operation limits.

| Model | Chrome requirements | Exposure | Usability / limits | Existing validation and missing evidence |
|---|---|---|---|---|
| M0: manual guidance, no page access | Current permission-free scaffold; human uses websites | Lowest extension access; human still handles sensitive website values | No automatic page/account verification; honest MANUALLY_ATTESTED outcomes only | BF-03 restricted variant observed missing sensitive metadata; human workflow/UX unverified |
| M1: global metadata picker | `tabs`; add `scripting` and separate page grants for any DOM read | Can expose sensitive metadata across accessible profile tabs; metadata alone gives no injection | Convenient candidate list, including duplicates, but wrong-account and missing-page-access risks remain | BF-03 metadata variant observed URL/title and denied all uninvoked injections; real picker unverified |
| M2: separately invoked tabs | `activeTab` + `scripting`; no host declaration or `tabs`; add separately consented optional `webNavigation` for guided lifecycle observation | Temporary page access per invoked tab; webNavigation adds broader browsing-metadata capability | Three explicit invocations; repeat after drift. No arbitrary-domain host declaration. Without navigation observation, restrict to fresh single-tab RO/manual checkpoints, not a durable three-tab context | BF-03 only proves uninvoked denial and local document/event primitives; genuine invocation/coexistence/revocation and full design UNVERIFIED |
| M3: narrow optional sites | `scripting`, reviewed `optional_host_permissions` for known hosts, gesture-based exact site requests; navigation permission separately | Granted host capability can reach other tabs/accounts/paths on that host and persist across restarts | Smooth multi-tab use; grants do not expire with the wizard. Unknown domains outside declarations unavailable | BF-03 required loopback host variant proves local metadata/injection primitives only; optional consent/expiry/removal UNVERIFIED |
| M4: arbitrary optional HTTPS | Broad `optional_host_permissions` such as `https://*/*`, exact host requested at runtime plus scripting/navigation as needed | Broad future request envelope even without an active blanket grant; persistent site capability after approval | Handles unknown customer domains; requires an explicit security exception/review of the widened envelope, no blanket request | Officially documented mechanism only; no BF-03 optional request or real consent evidence; not recommended |
| M5: required site hosts / blanket hosts | Required fixed host patterns or `<all_urls>`, scripting and separately navigation | Standing host access; wildcard version reaches unrelated sites; fixed hosts still include unselected same-host tabs | Few prompts, least user control; unknown domains still unresolved with fixed list | BF-03 required loopback grants worked but required-host removal was rejected; no product adoption evidence; reject blanket model |

A Chrome 133+ host-access-request UI is an M3/M4 presentation alternative, not a new least-privilege grant class. Its persistent origin grant and declaration/eligibility constraints remain; not selected or tested here. No permission named `permissions` is needed simply to call the Permissions API. No `cookies`, `identity`, `debugger`, `webRequest`, clipboard, storage, sidePanel or profile-identity capability is proposed by this candidate.

## Candidate recommendation and unresolved review decisions

**Candidate M2 for later fixture evaluation: explicit per-tab invocation with `activeTab` + `scripting`, plus optional `webNavigation` only when the engineer deliberately enables guided three-tab observation.** No `tabs`, required/optional host patterns, broad HTTPS envelope, static content scripts or persistent script registration. M0 remains available if capability, consent, freshness or rights is unavailable. This minimizes standing site access and handles unknown HTTPS hosts without guessed domains. It trades convenience for repeated invocation and introduces an openly disclosed navigation-metadata permission. It is not a claim that this combined model is implemented, proven sufficient, or finally approved as least privilege.

Proposed declaration roles, **not a manifest patch**: `activeTab` and `scripting` would support the user-invoked capture feature; `webNavigation` would be an optional named permission for the optional guided observation feature. Without that optional grant, do not establish a continuing three-role binding from polling or page-supplied route flags. Offer manual guidance or a newly invoked single-tab RO check with no carried authority. Re-request only after a new human action; no background prompts or permission escalation after failure.

The review must explicitly resolve: acceptable breadth of webNavigation; three invoked grants' coexistence and lifecycle; supported browser baseline; dynamic-origin verification; UI ownership and worker-loss behavior; account/rights evidence; and future sensitive-write enforcement. Chrome 106 is the API floor for the document features discussed, not an adopted product minimum or proof of compatibility. BF-03 used Chrome for Testing 151.0.7922.34; that is historical test environment evidence only. Missing required features produce manual mode, never fabricated document IDs or weaker targeting.

M3 is a secondary candidate only if owner/security later accepts persistent site exposure to reduce repeated invocation. Verify exact Odoo.sh/Plementus origins before declaring them; do not assume a service name identifies a deploy hostname. `https://github.com` is an expected role origin from BF-01, not a permission grant or proof of signed-in account. Do not silently combine M2 with persistent host grants or M4. A changed permission set needs its own review and authorization.

## Human selection and consent UX proposal

A future dedicated extension review page is preferable to making a transient popup the coordinator. Chrome closes action popups on outside focus; with a popup configured, `action.onClicked` does not fire. [Popup lifecycle](https://developer.chrome.com/docs/extensions/develop/ui/add-popup), [Action API](https://developer.chrome.com/docs/extensions/reference/api/action). Proposed future capture would use an action handler **without a default popup**, obtaining the invoking tab before opening/focusing the extension review page. This is a prospective change from ADR-005's scaffold, not an edit to the current popup/manifest and not an approved UI migration. No side-panel permission is needed for an ordinary extension page. The invocation-to-tab association must be tested; never query a later last-focused tab and assume it was the invoked tab.

1. **Explain scope.** Show: “Use your existing signed-in GitHub, Odoo.sh and Plementus tabs in this Chrome profile. Website login, extension access and permission to change records are separate. Nothing changes during tab review.” Explain that Chrome script access is technically capable of page changes even while the extension is in RO mode.
2. **Enable observation deliberately.** Explain before requesting optional navigation access: “Chrome navigation access can expose browsing metadata beyond your selected tabs. The extension will process only selected tab events and will not log URLs or browsing history.” Provide equally clear “Enable guided observation” and “Continue manually” choices. Actual prompt text is Chrome-owned; no fake consent dialog or promised automatic expiry.
3. **Capture each existing tab.** Human activates the intended website tab, invokes the extension there, then assigns that captured tab to Plementus, GitHub or Odoo.sh in the trusted review page. Repeat for all three; capture does not auto-assign by title, hostname or first match, even if only one candidate exists. Never request a second website login. Deliberate role change discards prior candidate context and any approval.
4. **Resolve ambiguity visibly.** Show role, safe exact origin, local “Tab A/B” label and bound window label; no raw title/favicon or private URL list. “Show selected tab” lets the human compare the actual address bar, route, visible account, organization/project and environment on the site. Multiple same-origin tabs stay distinct; a new/reopened tab is never substituted. Sensitive full URLs stay out of extension display/logs; account/target details are confirmed on the native site and represented by local confirmation status in the review. Missing evidence means manual verification or blocked automation, never “account verified” by selection.
5. **Confirm all three.** Require three distinct selected IDs and explicit origin/role confirmation, plus separate confirmation of intended site accounts/targets and authorized operation rights. Default candidate assumes distinct role origins, matching BF-01; if deployment shares an origin, stop for a separately reviewed role-isolation design. Normal windows in the same profile may differ: bind each role's chosen window, disclose it and invalidate on a move. Do not require users to merge windows or treat window equality as account proof.
6. **Run a bounded RO preflight.** Reobserve each selected tab/document/URL and active lifecycle, current capability and navigation generation before showing “Tabs reviewed for observation.” Never label this “Ready to execute.” Selection, site consent and safe read results do not satisfy the separate sensitive-write gate.
7. **Provide visible stop and fallback.** “Stop observation” clears application bindings/approvals and rejects further messages. Explain any Chrome capability that remains and how to remove it in Chrome site/extension settings. “Access unavailable — select the tab again or continue manually” covers denial/revocation/restricted pages; no repeated prompts. Unknown possible write: “Result unknown — inspect the target before trying again.”

Future sensitive-write UX is a distinct screen: exact current account/target/environment, effect and values needed for review; explicit per-action approval immediately before dispatch; no prechecked approval, blanket run approval or reuse after drift. Form filling can trigger autosave and therefore belongs to write review, not RO preflight. Native Connect Live/Test, sign-in/MFA/CAPTCHA, unknown frames/UI and unverifiable rights remain human checkpoints. MANUALLY_ATTESTED is never displayed as automatically verified. No such screen or executor is implemented here.

## Prospective binding model

These are **volatile design concepts**, not BF-01 input fields, v1 contract changes, SEC-01 fields or storage authorization. Exact URLs can be sensitive: compare only transient browser metadata in trusted extension memory, never persist/export it or send it to general page code. If a URL appears to carry credentials, stop without copying/logging it; use the human/native-site checkpoint. No hashing of customer URLs or identities as a substitute for this restriction.

| Context | Required binding / refusal |
|---|---|
| Browser/profile | Extension instance in the current normal browser context, worker boot generation and human profile confirmation; reject incognito/guest/foreign context. No Chrome profile path/name/account harvesting or claimed authenticated profile ID. Same profile does not establish site-account identity |
| Window and tab | Per-role exact browser-provided windowId/tabId plus trusted invocation and human role choice; distinct role IDs; no tab-index/title/opener/URL substitution; selected window move/loss invalidates |
| Origin and full URL | Owner/human-reviewed exact HTTPS scheme, hostname and effective port; validate canonical parsed values and reject userinfo/lookalikes/unsupported schemes. Compare full committed URL including path/query/fragment in memory; absent/pending data cannot be invented or treated as permission |
| Frame/document | Main frame only (`frameId: 0`, top-level frame, active lifecycle); Chrome-provided opaque documentId cross-checked by navigation/read result; no invented Tab.documentId or UUID-format assumption; no allFrames, MAIN-world or related/opaque-frame fallback |
| Navigation | Worker-local selection generation and monotonic event sequence for selected tabs; bump on every relevant event, including same-document updates and away-and-back. These are invalidation markers, not a trusted clock, TTL or durable replay defense |
| Account/target | Independently reviewed visible site account and org/repo/project/subscription/customer/environment, using only a later approved minimal page signature or labeled manual check; an account switch can happen without navigation. Unavailable/ambiguous or changed context blocks automated writes |
| Request and approval | Worker/UI generation, request identity, role and exact bound context; optional later write approval additionally binds operation/target/effect and is single-use. BF-01 and Phase 06 synthetic approvals remain executionAuthorized: false |

Dynamic Plementus/customer domains: human reviews the exact HTTPS origin on the intended native page and confirms role/environment before invocation-based access. Page links/redirects, suffix matches, organization names and Live/Test labels cannot authorize a new origin. Customer Production/Test are additional reviewed roles/contexts, never inherited from Odoo.sh or Plementus. After a custom-domain change, explicitly reselect and verify the new origin; never guess, follow-and-grant, wildcard subdomains, or auto-promote a new tab. If review cannot establish origin ownership/environment, use manual mode. M3 could request only a verified origin within a predeclared eligible pattern; an undeclared arbitrary origin must remain unavailable rather than escalating to a blanket request.

## Lifecycle invalidation and race handling

All rows are **PROPOSED / UNIMPLEMENTED**. Loss invalidates the affected role and the aggregate three-tab context; discard all dependent previews and approvals. Known denial/drift takes precedence over unknown metadata, consistent with BF-01-R1. No event, read or grant added later resurrects an invalidated binding.

| Trigger | Required future response | Evidence boundary |
|---|---|---|
| Fragment, history route, query or same-URL history transition | Bump navigation generation, invalidate even if documentId unchanged; reselect/reobserve intended page | BF-03 observed fragment/pushState with retained document, not every router/history race |
| Reload/full navigation/redirect, same origin included | Invalidate on start, not just after completion; reject pending/error states; committed destination needs fresh review. Browser grant retention is not selection validity | Local reload/full/cross-host document changes observed; redirect chains/pending timing unverified |
| Cross-origin redirect/login/custom host | Stop; no inherited role/access/approval. Human handles authentication; new origin needs review/invocation. Return to original origin does not revive context | BF-03 observed host-grant loss/return, not invoked activeTab revocation |
| Close/reopen, replacement/prerender, detach/attach, window closure/move | Old ID/context unusable; do not transfer to addedTabId or same-URL tab. Handle tabs.onRemoved/onReplaced/onDetached/onAttached and window mismatch, with navigation replacement signals as corroboration | Close/reopen observed; genuine onReplaced/prerender unverified |
| BFCache, discard/freeze, inactive/prerender/cached document | Invalidate; require current active top document and fresh read; no assumption DOMContentLoaded always fires | Official lifecycle semantics; these recovery paths not established by BF-03 |
| Site-access revocation, optional permission removal, withheld/managed/unavailable access | Stop scheduling reads/actions; bump generation, discard bindings/approvals; ignore queued results. No automatic wider request | Required-host removal rejection observed; genuine optional revocation/user denial unverified |
| Popup/review-page loss, extension update/reload/disable | No authority stored in a popup; discard incomplete selection and pending approval on loss. Review-page loss clears the entire review. An optional future popup cannot carry authority across closure | BF-03 extension-page loss observed; actual action-popup lifecycle unverified |
| Worker stop/restart, browser crash/restart/session restore | New boot starts unbound and blocked; old UI cache/messages cannot restore authority. Require fresh human review/reselection; reconcile any possibly attempted write first | Forced worker stop and controlled restart observed; natural/crash/restore unverified |
| Wrong/changed account, target, UI signature or unsupported iframe | Block regardless of unchanged URL/document; request native-site verification/manual completion, not secret inspection | No real account/UI/rights evidence; fixture selection never resolves it |
| Timeout/port loss after possible write | Preserve unknown outcome, enter RECONCILE_REQUIRED; no automatic retry/resume/replay or assumption of rollback/cancellation | Requirement from protected policy; no browser-first writes tested |

For M2's guided mode, register lifecycle/grant listeners before selection and take fresh observations after listener registration. Ignore unrelated tab events without retaining URLs. Match selected main-frame document/context; delayed old events may conservatively invalidate but must never validate a newer context. Handle onBeforeNavigate, onCommitted, onHistoryStateUpdated, onReferenceFragmentUpdated, onErrorOccurred and replacement/loss signals. Avoid ordering assumptions between different APIs; resnapshot and reject disagreement. Event timestamps do not supply trusted elapsed time or change SEC-01's clock policy. [Navigation semantics](https://developer.chrome.com/docs/extensions/reference/api/webNavigation).

A future observation request captures the current boot/selection/navigation generations, targets the current document, and returns only bounded approved data. After every await, check those generations, selected tab/window, current capability, committed full URL and active document again; discard stale, duplicate, unsolicited or out-of-order responses. `permissions.contains({permissions: ['activeTab']})` alone establishes declaration/capability, not a usable grant on a selected tab; use fresh browser metadata and the actual bounded read/API outcome. Any missing API/field, thrown error, denial or observation gap fails closed. Do not silently downgrade document-specific targeting to tab-only targeting.

Content-script messages are observations only. Validate Chrome-supplied sender extension ID, tab/window, frameId, documentId, origin/URL and current binding, plus an exact bounded payload schema and request correlation; never accept page-provided sender identity. Extension-UI messages use a separate exact packaged-page/context check and cannot impersonate a site sender. Reject unselected subframes, opaque origins, old ports and unknown requests. Page messages cannot approve writes, choose new hosts or submit executable commands. Sender document/lifecycle fields are available from Chrome 106, but port-open lifecycle is not a fresh-state guarantee. [Runtime MessageSender](https://developer.chrome.com/docs/extensions/reference/api/runtime#type-MessageSender), [message security](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#security-considerations).

**Residual race:** Chrome reads, navigation events, DOM changes, human confirmation and external writes are not one atomic transaction. Document targeting prevents some stale-document execution but cannot freeze same-document account/target changes or make a hostile DOM authentic. A later write design must check expected URL/account/target/page state inside the targeted packaged action immediately before its one approved effect, serialize attempts, consume approval before dispatch and reconcile uncertainty. If that cannot safely establish the target, the human performs the operation. BF-04 does not certify this mechanism or connect any synthetic approval to execution.

## Permission denial, removal and stop semantics

For any future optional request, prepare a specific explanation and eligible scope first, then request inside a fresh human gesture. A false result, rejection, managed-policy restriction, restricted page, unsupported feature or missing access leads to manual mode; do not retry in the background, widen scope, collect credentials or navigate around a denial. A true result permits only reobservation; a later grant/onAdded does not restore old selections/approvals. A grant query is a snapshot, not a lock against revocation. [Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions).

On stop, terminate application observation, clear volatile bindings and disallow queued/in-flight results immediately. Attempt removal of an optional named/site grant only where applicable and separately show the observed outcome; removal refusal must not be reported as revoked access. In M2, clearing bindings is not programmatic revocation of each activeTab grant. Explain Chrome settings controls and the browser's navigation/closure grant boundary; do not auto-close/navigate the user's tabs merely to revoke access. In M3/M4, remove only grants explicitly associated with the reviewed session, accounting for other legitimate uses and shared host patterns; if access remains, show that truth and keep application work stopped.

Grant loss or script unregistration cannot undo an already performed site operation, retract disclosed data or prove an injected script has disappeared. Keep RO probes short-lived with no autonomous action loops; subsequent messages remain subject to trusted-worker checks. No claim that stopping observation logs the user out, revokes website sessions, cancels a possible write or deletes provider data. Incident handling remains owner-led under the unchanged security policy.

## Non-secret observations, evidence and logging limits

Isolated worlds separate JavaScript globals, while the DOM remains shared and untrusted. Use only reviewed packaged isolated-world, main-frame code; no remote code, MAIN-world authentication inspection, arbitrary selectors/actions from pages, eval or unsafe HTML rendering. The content script must not become an authenticated fetch/XHR proxy. [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [messaging security](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#security-considerations).

Proposed RO outputs are role, generic page-kind/status, capability available/unknown/denied, binding valid/stale and labeled evidence tier. Document/URL/context values used transiently for comparison are not report fields. Do not scrape account menus, whole forms or entire DOM to infer login. Future account evidence needs a separately approved minimal non-secret check; until then human confirmation remains MANUALLY_ATTESTED, and unknown rights block automated writes.

No screenshots, DOM dumps, raw messages/errors, full URLs/query/fragment, titles/favicons, browsing history, private repo/customer names, subscription references, database users/values, credentials or session material in logs, journal, exports, telemetry or clipboard. Avoid stable hashes that correlate sensitive identifiers. Retain only generic reasons and approved status/evidence labels, with no new durable log or retention policy here. Review displays may show the selected safe origin locally; exact sensitive route/account/target verification happens on the native website. Do not leak secrets through permission errors or source citations.

Worker shutdown loses globals; neither a port nor a visible review page is proof of an immortal worker. [MV3 lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle). The candidate deliberately starts unbound after loss. It introduces no alternate storage, eighth checkpoint field, persistence activation, trusted-clock workaround or restart authority. SEC-01 cleanup/retention/uncertain-hold/operator/device/incident gates and Phase 06 reconciliation remain binding. Durable post-write uncertainty is an unresolved prerequisite for any later executor; UI caches and manual confirmation cannot erase it.

## BF-03 observed cases and five unverified groups

Historical results only, copied by reference to the [published case matrix](PHASE_07_BROWSER_FIRST_CHROME_FIXTURE_SPIKE.md#case-matrix-and-evidence-limits). No new Node or Chrome execution for BF-04.

| Historical group | Count / result | What it establishes |
|---|---|---|
| Explicit driver role choices, three variants | 3 LOCAL_BROWSER_TESTED PASS | Actual distinct tab IDs were used; role choices were supplied by a test driver, not real users |
| Missing/duplicate roles and reused IDs | 6 SIMULATED PASS | Driver assertion behavior only; no user-selection UX evidence |
| Metadata/injection separation; uninvoked activeTab; unavailable webNavigation | 9 LOCAL_BROWSER_TESTED PASS | Restricted/metadata/host capability boundaries; no genuine invocation or consent |
| Duplicate-origin candidate, closed selected ID, reopened same URL | 9 LOCAL_BROWSER_TESTED PASS | Explicit chosen ID retained; closed ID unavailable; new ID after reopen; no genuine replacement event |
| Host/port access; document cross-API agreement | 2 LOCAL_BROWSER_TESTED PASS | Loopback host exposure across ports and actual main-frame document identity |
| Fragment/history, full navigation/reload/stale document, cross-host/return | 8 LOCAL_BROWSER_TESTED PASS | URL/document/access changes; webNavigation could observe outside host injection access; no complete race guarantee |
| Required-host removal refusal | 1 LOCAL_BROWSER_TESTED PASS | Removal rejected and access remained; actual revocation NOT RUN |
| Extension-page loss, forced worker stop, controlled browser reopen | 3 LOCAL_BROWSER_TESTED PASS | Volatile context loss under controlled conditions only |
| Page request allowlist and disposable-profile cleanup | 2 LOCAL_BROWSER_TESTED PASS | Recorded local safety/cleanup checks; not OS-wide egress certification |
| Total passing | **43 = 37 LOCAL_BROWSER_TESTED + 6 SIMULATED** | Every accountVerified/executionAuthorized value remained false |

Exactly **five SKIP/NOT RUN groups remain UNVERIFIED**:

| Unverified group | Narrower observation that must not substitute | Later evidence needed; not authorized now |
|---|---|---|
| 1. Genuine consent accept/deny and optional-grant removal | Injection denial and required-host removal refusal | Actual browser-owned prompt choices, optional grant removal/settings loss and queued-result invalidation |
| 2. Invoked activeTab and navigation revocation | Permission declaration and uninvoked denial; required-host navigation boundary | Genuine action on each site fixture tab, grants coexisting, same-/cross-origin/reload/closure behavior and fresh re-invocation |
| 3. Actual action-popup lifecycle | openPopup resolved but popup unobservable; ordinary extension page closed/reopened | Observable genuine popup open/close/focus loss and safe capture/review-page handoff |
| 4. Natural idle suspension, crash and session restoration | Forced CDP worker stop and controlled browser close/reopen | Natural worker lifecycle, crash/restore and stale UI/message rejection with no resumed authority |
| 5. tabs.onReplaced / prerender swap | Close/reopen produces a new ID | Genuine replacement events, old-document messages and explicit reselection; BFCache/race tests also needed |

The published Node **242 PASS** is offline regression evidence, not a test of this candidate. BF-03 used no optional declarations/requests and no user-selected website tabs. Its temporary host manifest is not a permission recommendation. Real accounts/rights, dynamic customer origins, provider UI/policies, read-only collection limits, lifecycle races and safe write outcomes remain UNVERIFIED. No live-provider evidence tier is earned.

## Official source register

Retrieved via `web.run` **2026-11-03 (Africa/Cairo)**; public documentation only. Source-to-claim review distinguishes platform facts from the prospective design. Older GitHub/Odoo policy references remain historical; no fresh policy compatibility or real-site inspection is claimed.

| ID | Official source | Supported boundary |
|---|---|---|
| C1 | [Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs) | Metadata versus tab management, session tab IDs, replacement events |
| C2 | [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) | User-invoked temporary per-tab access and navigation/closure limits |
| C3 | [Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting) | Access prerequisites, isolated execution, frame/document targeting and version gates |
| C4 | [Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions) | Gesture/declared scope, dynamic hosts, current grants, removal/events and persistent host-access requests |
| C5 | [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) | Required/optional API and host categories |
| C6 | [Match patterns](https://developer.chrome.com/docs/extensions/develop/concepts/match-patterns) | Host/path/port/wildcard scope; application origin checks remain separate |
| C7 | [webNavigation](https://developer.chrome.com/docs/extensions/reference/api/webNavigation) | Separate permission, frame/document lifecycle, same-document and replacement events, event ordering/timestamp limits |
| C8 | [Service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Shutdown/global loss and browser-version sensitivity |
| C9 | [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) | Isolated globals and page DOM access |
| C10 | [Message security](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#security-considerations) | Untrusted messages, bounded privileges and safe rendering |
| C11 | [Runtime MessageSender](https://developer.chrome.com/docs/extensions/reference/api/runtime#type-MessageSender) | Browser sender tab/frame/document/origin context and port-open lifecycle limits |
| C12 | [Action API](https://developer.chrome.com/docs/extensions/reference/api/action) | Invocation context and popup/onClicked exclusivity |
| C13 | [Add a popup](https://developer.chrome.com/docs/extensions/develop/ui/add-popup) | Outside focus automatically closes a popup |

## Exact documentation scope and verification

Paths relative to the extension root; **seven modified + one created = exactly eight**:

| Change | Path |
|---|---|
| Modify | `docs/02_ARCHITECTURE_DECISIONS.md` |
| Modify | `docs/Phases/phase07/PHASE_07.md` |
| Modify | `docs/00_PROJECT_STATUS.md` |
| Modify | `docs/03_CHANGELOG.md` |
| Modify | `docs/04_TEST_EVIDENCE.md` |
| Modify | `docs/05_BLOCKERS_AND_DECISIONS.md` |
| Modify | `docs/06_HANDOFF.md` |
| Create | `docs/Phases/phase07/PHASE_07_BROWSER_FIRST_PERMISSION_LIFECYCLE_DESIGN.md` |

Original bodies of all seven edited documents are preserved after their original titles, including ADR-006/all historical ADRs, historical status/acceptance/evidence and prior stop instructions. New dated entries govern BF-04 only. Master/canonical sources, integration contracts, security/SEC-01, Phase 04/06, BF-01/BF-02/BF-03 reports, manifest/popup/worker/source/tests/fixtures/dependencies and unrelated tracked files remain protected against HEAD and preflight hashes. Master/canonical SHA-256 is `d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91`.

[Documentation verification](../../04_TEST_EVIDENCE.md#bf-04-documentation-verification--2026-11-03-africacairo): `python3 /tmp/bf04-docs-vaadxibr/verify.py` **PASS, exit 0**; exact eight paths, zero staged/unexpected, **218 protected tracked files equal preflight and HEAD**, seven original bodies preserved, raw index/entries/history unchanged, master/canonical equal. All eight changed Markdown files: **348 local links / 43 fragment targets / 0 broken**; all 86 extension Markdown files: **885 local links / 137 fragment targets / 0 broken**. Thirteen distinct official source entries and source-to-claim review; diff whitespace, LF and single-final-newline checks PASS. Scratch checker and results reside under `/tmp/bf04-docs-vaadxibr/`. **Node/application/browser/provider tests NOT RUN**; documentation verification supplies no new runtime/security evidence. No Chrome launch, user browser/profile access, real tab inspection, permission request, DOM injection, authenticated connector, credential access or external write.

Skills applied: Superpowers using-superpowers, brainstorming for permission alternatives and verification-before-completion; Ponytail full. The owner's exact design deliverable/allowlist/stop instructions override extra artifacts, implementation and publication workflows. Tools used: shell/Git/Python and apply_patch through functions.exec, web.run for official Chrome sources, and a read-only collaboration subagent for the brainstorming skill's builder check. That check found no material issue beyond explicitly deferred review/evidence gates; it grants no independent ChatGPT acceptance or security approval. WarpGrep and Valyu are unavailable in the tool inventory. No browser-control tool was used.

## Review gate

Owner/security must review the candidate grants and their breadth, dynamic-origin/account checks, UI/lifecycle choices, evidence gaps and manual fallback before any separately scoped implementation. Independent ChatGPT review is required now; this design remains unaccepted. No BF-05 prompt or continuation is authorized.

Official progress **5/20 master phases; 28/72 micro-phases**. Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED**; Phase 07 **IN_PROGRESS / NOT ACCEPTED**; 07.03 **NOT_STARTED / NOT_AUTHORIZED**; D-04/B-02/B-03 **OPEN**; twelve historical owner/security decisions **PENDING**; production **NO_GO**. No staging, commit or push.

**READY_FOR_CHATGPT_REVIEW / DOCUMENTATION_ONLY. STOP FOR INDEPENDENT REVIEW.**
