# Feasibility — Phase 00

Date: **2026-10-20 (Africa/Cairo)**. **STATIC REVIEW / PROVISIONAL**. Source-supported APIs make a bounded MV3 investigation plausible; no extension, capture spike or real Odoo test exists. This is discovery, not Phase 01 architecture approval.

## Official sources and retrieval

All sources below were checked on the date above. Chrome/WXT pages opened through web tools. Odoo direct web opens timed out; read-only Python `urllib.request.urlopen(url, timeout=25)` recovered HTTP 200 at the same URLs, and relevant text was inspected. No Odoo application endpoint or account was accessed.

| ID | Primary source | Claim used |
|---|---|---|
| F1 | [Chrome content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) | Isolated JS worlds, DOM access, page CSP applies to MAIN world |
| F2 | [Chrome scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting) | Permission/host access, execution worlds, tab/frame targeting; unregistering does not remove already injected scripts |
| F3 | [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) | Gesture-based temporary host access; origin change/closure revokes access |
| F4 | [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) | Distinct API/host/optional host permissions |
| F5 | [Chrome webRequest](https://developer.chrome.com/docs/extensions/reference/api/webRequest) | Metadata events/host access; request and initiator permissions; no general response-body retrieval interface |
| F6 | [MV3 worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Worker can terminate, globals are lost; durable state required |
| F7 | [DevTools network](https://developer.chrome.com/docs/extensions/reference/api/devtools/network) | HAR, separate getContent; requests can be missing if DevTools opens late |
| F8 | [Chrome debugger](https://developer.chrome.com/docs/extensions/reference/api/debugger) | Powerful protocol access requires debugger permission |
| F9 | [Chrome Web Store policies](https://developer.chrome.com/docs/webstore/program-policies/policies) | Minimal relevant access, user-data handling/disclosure and policy obligations |
| F10 | [Odoo 20 framework](https://www.odoo.com/documentation/20.0/developer/reference/frontend/framework_overview.html) | Web-client services/components/context; version-specific internals |
| F11 | [Odoo 19 frontend services](https://www.odoo.com/documentation/19.0/developer/reference/frontend/services.html) | RPC server errors can arrive with HTTP 200; this evidence is specific to the documented version |
| F12 | [Odoo 20 external JSON-2](https://www.odoo.com/documentation/20.0/developer/reference/external_api.html) | Introduced in 19; /json/2, external API keys and plan constraints |
| F13 | [Odoo 20 external RPC](https://www.odoo.com/documentation/20.0/developer/reference/external_rpc_api.html) | External service deprecation explicitly excludes other JSON-RPC controllers |
| F14 | [Odoo 20 release notes](https://www.odoo.com/odoo-20-release-notes) | September 2026 release; existence is not compatibility evidence |
| F15 | [WXT manifest](https://wxt.dev/guide/essentials/config/manifest.html), [release history](https://github.com/wxt-dev/wxt/releases), [maintainer package metadata](https://raw.githubusercontent.com/wxt-dev/wxt/main/packages/wxt/package.json) | Current docs/package show 0.21.4; MV3 generation, development permissions, declared Node >=22 / Bun >=1.2.0 |

## Feasibility and safe degradation

| Area | Source-supported capability | Limit / risk | Required safe fallback and future proof |
|---|---|---|---|
| Consent and capture | F2–F4 allow deliberate selected-tab injection with scoped permission | Browser permission alone is not recording consent; grants can outlive a recording | Keep session OFF until explicit start; validate tab/origin/frame/session independently; stop on revocation/navigation; prove in 03/04 |
| Actions/navigation | F1 supports reading DOM and attaching listeners | Text, selectors, URLs and labels can reveal business data; SPA routing varies | Use action categories and sanitized route classes; no input/DOM/label contents by default; manual steps when safe context absent |
| Client exceptions | Page errors may be observable with an appropriate observer | Isolation means page globals/hooks are not directly accessible; swallowed/handled errors, frames and early failures may be missed | Report unavailable/not observed, never “no error”; MAIN-world observation remains conditional; synthetic + real proof later |
| Network outcomes | F5 exposes request IDs, timestamps/status and completion/error events with permissions | No general response body; HTTP 200 cannot establish application success (F11); inaccessible initiators/frames omit traffic | Metadata-only mode; label application outcome unknown; do not expand to all sites or request headers/body retention |
| RPC/model/method | F10/F11 expose version-specific browser service patterns; a later scoped observer might extract allowlisted categories | MAIN world shares page environment, can be tampered with; response parsing can expose secrets, consume streams or change semantics | Phase 08 GO/NO-GO: bounded allowlisted extraction only; fail-open to metadata/manual notes on collision/CSP/unsafe size/format; never delay/replay/modify a business request |
| Correlation/comparison | A timeline can support deterministic joins and heuristic alignment (product inference) | Concurrency, polling, missing events and clocks prevent proof of causation | Ambiguous/unmatched events remain separate; compare only shared capabilities, record gaps; Phase 17 for automation |
| Persistence | F6 requires surviving worker termination without relying on globals | Silent recording restart, quota/storage loss and profile access threaten privacy/reliability | Persist minimal bounded state; require verified consent after recovery; report loss; deletion/expiry tests later; local storage is not a security certification |
| Rich diagnostics | F7 allows HAR/content on demand; F8 offers protocol access | DevTools must be open; early requests missing; powerful permissions and sensitive contents | Neither DevTools nor debugger is an MVP dependency; do not auto-reload/reproduce to fill gaps |
| Export | Local reviewed schema can carry evidence without a backend (proposal) | Notes, hosts, stacks and Markdown may leak secrets or render active content | Collection + export allowlists, plain-text rendering, size limits, user preview, blocked export if sanitation fails |

No observer can see protected Python source, database state or server logs through browser metadata. A user clicking an Odoo business button can mutate data even when the observer is read-only. No such action is authorized in Phase 00.

## Odoo API and version boundaries

F12 concerns external integrations, not the tool's browser observation path. No external API key/subscription or `/json/2` request is needed for the proposed MVP. F13 distinguishes external common/object services (currently scheduled for removal in Odoo 22 / Online 21.1) and the db service (removed in Odoo 20 / Online 19.1) from other `@route(type='jsonrpc')` controllers, known as `type='json'` through 18. Those dates do not establish internal web-route compatibility. Do not transplant external API lifecycle assumptions into a universal `/web/...` hook.

F10's framework is version-specific. Legacy/modified clients may lack the same globals/routes/Owl patterns; choose observed capability or mark unknown. F14 confirms a release, not TraceBridge support. All feature-level results remain [UNKNOWN / NOT TESTED](SUPPORT_MATRIX.md).

## Security risks and future gates

| Risk | Proposed constraint / stop condition | Gate owner |
|---|---|---|
| Malicious page bridge messages / spoofed version | Treat MAIN/page evidence as untrusted; validate bounded schema, tab/origin/frame/session, reject unexpected content; no privileged page command channel | 01 design, 03/08/11 tests |
| Credentials or business data in URLs/errors/notes | No cookies/tokens/headers/raw payloads/record values; sanitize before boundary/storage and export; drop unsafe content | 01 policy, 05–08/15 checks |
| Hook collisions, latency or changed promises | Native arguments/results/streams/exception semantics preserved, bounded work, teardown and no duplicate hooks; fail-open if unsafe | 08 explicit safety GO/NO-GO |
| Retention / device or export exposure | Minimize data, enforce time/byte/count caps and deletion; hashing is not anonymization; owner chooses encryption and sharing classification | P00-POLICY / 01 |
| Cross-tab/origin capture or silent restart | Consent independent of API permission, visible state, deny unrelated origins/frames and no silent resume | 03/04/19 |
| Misleading findings / public claims | Evidence IDs and uncertainty, no backend diagnosis without source evidence, no compatibility without real tests | 09–20; owner review |
| Store or dependency supply chain | Review actual generated production/development permissions and dependency tree before use; no remote executable code or telemetry added for convenience | 01/02/19/20 |

## Framework candidate and remaining uncertainty

WXT remains a **candidate**, not selected or installed. F15 provides current maintenance/release evidence and MV3 manifest support. Its main-branch metadata declares Node >=22 and Bun >=1.2.0; these are upstream metadata, not verified local prerequisites or a final pinned release contract. WXT can add development `tabs`/`scripting` permissions and side-panel permission from entrypoints: inspect generated manifests later. No dependency tree exists here; vulnerability/transitive-dependency and reproducible-build checks are **SKIP — no installation authorized**. Recheck a pinned candidate and alternatives in Phase 01/02; no “secure dependency” claim follows from release activity.

Discovery recommendation: **conditional technical feasibility**, with a metadata/manual handover baseline if sensitive parsing is unsafe. Owner must approve usefulness under degraded capture. Architecture, permission selection, numeric limits, browser floor, encryption and production policy remain undecided; see [decisions](05_BLOCKERS_AND_DECISIONS.md). No Phase 01 implementation or approval is implied.
