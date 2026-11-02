# Phase 07.02 amendment: browser-first owner direction

**OWNER_ARCHITECTURE_DIRECTION / SECURITY_REVIEW_PENDING.** Recorded **2026-11-02 (Africa/Cairo)**. Documentation-only amendment to accepted Phase 07.02; **READY_FOR_INDEPENDENT_CHATGPT_REVIEW**, not security approval or implementation authorization.

Accepted progress: **5/20 master phases; 28/72 official micro-phases**. Phase 04 **IN_PROGRESS / BLOCKED / POSTPONED**; Phase 06 parent **PARTIAL / BLOCKED / NOT ACCEPTED**; Phase 07 parent **IN_PROGRESS / NOT ACCEPTED**; production **NO_GO**. Phase 07.03 **NOT_STARTED / NOT_AUTHORIZED**. This amendment adds no accepted phase or micro-phase.

## 1. Authority and historical reconciliation

The owner supplies acceptance of [07.02](PHASE_07_02.md) as documentation and clarifies the intended usage: one Chrome profile, with three existing authenticated tabs for Plementus, GitHub and Odoo.sh. The owner accessed Odoo.sh through its ordinary GitHub sign-in experience. One extension wizard should coordinate visible navigation, form interaction, explicit approvals and observed results, with manual checkpoints when safe automation is unavailable. The initial direction requires no separate GitHub OAuth login or backend. These are owner-reported usage assumptions; no profile, account, tab or website behavior was inspected or verified here.

Record the preference as **OWNER_ARCHITECTURE_DIRECTION / SECURITY_REVIEW_PENDING**. The GitHub App/backend candidate is **DEFERRED, not selected**. No new OAuth, token handling, backend exception, authenticated API client or site automation is requested or authorized. Browser sessions must not become API credentials. Existing no-backend and no-token-storage restrictions remain binding.

The accepted [07.01](PHASE_07_01.md) and [07.02](PHASE_07_02.md) reports retain their original bytes, including pending-review language, recommendations, twelve PENDING decisions, source provenance and evidence. Current tracking records subsequent owner-supplied documentation acceptance; Git publication alone cannot establish reviewer acceptance or security approval. Prior 07.01 acceptance at `b04d0d4` and offline 06.04 acceptance at `5f9f588` remain recorded without rewriting historical reports. Entry HEAD `f447b3d2cf77072598d6904cedd3e18176b7b28a` is the verified published baseline for this amendment, not invented independent acceptance evidence.

The [master plan](../../01_MASTER_PLAN.md), [ADR-003](../../02_ARCHITECTURE_DECISIONS.md#adr-003-official-github-apis-candidate-site-ui-adapters) and [GitHub contract](../../08_INTEGRATION_CONTRACTS.md#github-connector) still describe official API integration; [security policy](../../09_SECURITY_AND_SECRETS.md) also retains its earlier assessment snapshot. This prospective direction identifies that design difference without editing those protected documents or declaring it resolved. A later separately scoped review must reconcile any necessary integration/architecture documentation before browser implementation. No change to existing evidence tiers or live acceptance requirements follows.

## 2. Git preflight and evidence boundary

| Check | Verified entry result |
|---|---|
| Exact Git root | `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` |
| Extension directory | `Sh_Project_Setup_extension` |
| Branch | `feature/sh-project-setup-extension-clean` |
| HEAD / configured upstream SHA / live remote branch tip | `f447b3d2cf77072598d6904cedd3e18176b7b28a` |
| Upstream | `origin/feature/sh-project-setup-extension-clean` |
| All origin fetch and push URLs | `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| Complete staged / unstaged / untracked baseline | Empty / empty / empty |
| Ignored IDE metadata | Excluded from content inspection, hashing and edits; preserved |

Read-only commands: `pwd -P`, `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse HEAD`, `git remote get-url --all origin`, `git remote get-url --push --all origin`, upstream name/SHA, `git status --porcelain=v1 --untracked-files=all`, unstaged/cached name-status, `git worktree list --porcelain`, `git ls-files --stage` and `git ls-remote --heads origin refs/heads/feature/sh-project-setup-extension-clean`. No clone, checkout, reset, fetch, staging, commit or push.

Read the required master/architecture/contracts/security/blockers and Phase 07 documents. Relevant constraints come from the [Phase 04 parent](../phase04/PHASE_04.md), [clock-security acceptance packet](../phase04/PHASE_04_SEC01_CLOCK_SECURITY_ACCEPTANCE_PACKET.md), [restart-resolution limits](../phase04/PHASE_04_SEC01_STALLED_WALL_AND_RESTART_RESOLUTION.md), [Phase 06 parent](../phase06/PHASE_06.md) and [06.04 historical evidence](../phase06/PHASE_06_04.md). No historical Node/browser results were rerun or promoted to runtime acceptance.

The current [MV3 manifest](../../../manifest.json) contains only a module worker and action popup; it declares no permissions, host permissions, content scripts or OAuth configuration. It provides no current tab-recognition or browser-adapter capability. Public official-document research and the required read-only Git query are the only external activity. All real selectors, site states, interaction behavior and write paths are **UNVERIFIED**.

## 3. Proposed browser arrangement and feasibility limits

| Boundary | Proposed responsibility | Evidence / limit |
|---|---|---|
| Extension wizard | Collect inputs; show workflow status, selected targets, approvals, manual handoffs and per-step results | Existing local wizard is not a live coordinator; runtime behavior UNVERIFIED |
| Tab selection | Discover permitted candidate tabs and require explicit selection for each of three roles | Never select the first match or infer identity from title/favicon; profile/tab behavior UNVERIFIED |
| Origin and account checks | Bind exact origin, selected tab/document, visible account context and intended organization/repository/subscription/customer environment | Login is not proof of operator authority; ambiguous or unavailable evidence requires a manual checkpoint |
| Site-specific browser adapters | Versioned, bounded page detection and visible UI interaction for GitHub, Odoo.sh, customer Odoo and Plementus | No selectors or production adapters selected, implemented or validated; existing v1 contracts are unchanged |
| Review and verification | Approval immediately before each sensitive write; observe target-specific final state or retain uncertainty | A successful click, filled field, toast or transport completion alone cannot confirm the external result |
| Non-secret workflow state | Minimum sanitized status only, subject to Phase 04/SEC-01 security gates | No persistence activation, schema extension, automatic resume or bypass of blocked cleanup/recovery |
| Plementus tab | Existing signed-in application and existing Database INFO / Connect Live/Test workflows | Actual origin, form, permissions and native Connect behavior UNVERIFIED |
| GitHub tab | Existing signed-in website under its own account and organization permissions | No separate extension OAuth, credential extraction or API client |
| Odoo.sh tab | Existing signed-in website under its own project/subscription rights | GitHub sign-in history does not make its session or authority interchangeable with GitHub |

**Assessment:** Chrome exposes primitives for a candidate extension to coordinate selected tabs and interact with permitted page DOM. That establishes platform capability only; it does not prove authenticated private-repository creation or any other master-plan operation is safely automatable. Each site can require additional tabs, frames or human steps. The three tabs are starting roles, not permission to follow arbitrary redirects or grant customer-origin access. Opening Production/Test would need its own target review. No backend is required by the proposed visible-UI arrangement; end-to-end feasibility remains **UNVERIFIED**. [Tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs), [scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting).

## 4. Master-plan operation feasibility matrix

Categories are prospective dispositions, not implemented support: **CANDIDATE_BROWSER_UI**, **MANUAL_CHECKPOINT**, **NEEDS_VERIFIED_SITE_BEHAVIOR**, **UNSUPPORTED_OR_BLOCKED**. All real website selectors, behaviors and writes in every row remain **UNVERIFIED** until separately authorized testing. No row authorizes a provider write.

| # / master-plan operation | Disposition | Candidate route and required result | Manual fallback / unresolved gate |
|---|---|---|---|
| 1. New customer input collection (Phase 03) | CANDIDATE_BROWSER_UI | Existing wizard validation plus later reviewed site form entry; confirm reviewed inputs and intended target | Sensitive subscription reference stays out of logs/journal; requested-module selection gap remains OPEN; operator enters unsupported fields |
| 2. GitHub organization and repository identification (07–08) | NEEDS_VERIFIED_SITE_BEHAVIOR | Selected GitHub tab; observe exact owner/repository/visibility and available account context | Visible access does not prove org membership/admin/create rights; operator verifies authority; ambiguity blocks |
| 3. GitHub private repository creation (09) | CANDIDATE_BROWSER_UI | Reviewed owner, repository name, private visibility and options; immediate approval before submit; independently observe created private repo in intended org | Site policy/create rights/duplicate behavior UNVERIFIED; manual creation and labeled attestation; unknown submit outcome requires reconciliation |
| 4. Odoo.sh project creation and subscription selection (15/18) | NEEDS_VERIFIED_SITE_BEHAVIOR | Visible project/repository/subscription UI; verify intended project, subscription selection and resulting association | Entitlement, trial/customer modes and financial effects UNVERIFIED; human selection and approval; never infer rights from GitHub login |
| 5. Production branch and build verification (10/15/18) | NEEDS_VERIFIED_SITE_BEHAVIOR | Observe selected main/master revision, Production placement, successful build and database readiness separately | Build queued/running is incomplete; manual verification on unavailable state; no success from branch label alone |
| 6. Private utility repositories and submodule access (11–12) | MANUAL_CHECKPOINT | Plan allowed repos, paths and revisions; verify `.gitmodules`, gitlinks, access and Odoo.sh checkout under later authorization | No invented add-submodule action, internal API or shell execution; a UI-only mutation path is unverified; conflicts need operator handling; linkage is not installation |
| 7. Public deploy-key handoff (12) | MANUAL_CHECKPOINT | Operator identifies Odoo.sh public key and intended GitHub utility repo; reviews minimum key permissions; verifies installed public key and checkout access | Never collect private keys; no automatic clipboard transfer or key-setting mutation; human consent and site behavior need verification |
| 8. Odoo Production app installation (16/18) | CANDIDATE_BROWSER_UI | Exact customer origin/environment and approved modules; approval immediately before install; observe final installed state per module | App listing/repository availability is insufficient; unexpected dependencies/dialogs or uncertain install stop for operator reconciliation |
| 9. `develop` branch preparation (10) | CANDIDATE_BROWSER_UI | Review exact repository/base revision and target branch; separately approve creation; observe resulting branch and revision | Existing branch/conflict/protection mismatch requires manual review; no force update; no Staging or database-copy claim |
| 10. Staging with neutralized Production database copy (15/18) | NEEDS_VERIFIED_SITE_BEHAVIOR | Separately approve database implications; verify Staging placement, Production-derived copy, neutralization and installed apps | A Git branch by itself does not copy a database; unsafe/unobservable copy is a manual checkpoint, not inferred success |
| 11. Live/Test domains (18) | MANUAL_CHECKPOINT | Observe and bind default Live/Test URLs; operator verifies environment, DNS ownership and TLS for custom domains | DNS/account changes outside these tabs have no supported route; custom-domain automation UNSUPPORTED_OR_BLOCKED here; no guessed customer origins |
| 12. Plementus Database INFO and existing Connect Live/Test (16/19) | NEEDS_VERIFIED_SITE_BEHAVIOR | Preview exact customer record/fields; approve form write; verify saved values in site without exporting sensitive data; preserve existing Connect buttons | Manual native Connect checkpoint; actual pl_auth behavior UNVERIFIED; no token/session interception or invented login; no success from button click |
| 13. Final verified report, interruptions and reconciliation (04/06/17–19) | UNSUPPORTED_OR_BLOCKED | Future report distinguishes attempted/observed/unknown/MANUALLY_ATTESTED and evidence tier; lists remaining manual tasks | Phase 04 runtime security and Phase 06 durable recovery unresolved; no automated completion/resume claim; operator reconciles possible writes before any fresh approval/retry |

## 5. Chrome permissions and execution boundary

**Official facts:** most Tabs API features do not require `tabs`; that permission exposes sensitive tab properties including URL/title, rather than granting DOM access. Matching host grants can also expose those properties. `scripting.executeScript` needs `scripting` plus applicable host access or `activeTab`; injection defaults to the top frame. `activeTab` is a temporary user-invoked grant for a particular tab, not a wizard-wide grant to all three tabs; cross-origin navigation revokes it. [Tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs), [scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting), [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab?hl=en).

**Proposed, PENDING:** assess optional site-specific host access after explicit user gestures for `https://github.com/*`, the verified Odoo.sh site origin and the owner-verified Plementus origin. The example GitHub pattern is not a grant. Do not guess Plementus/Odoo customer hosts or request broad `tabs` access without a demonstrated need. Denial or revoked permission must stop detection and offer manual selection. Permission consent enables browser capability; it does not authorize a provider write. [Permission declarations](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions).

**Dynamic customer Odoo origins:** first identify and review the exact HTTPS origin and intended Live/Test environment. Chrome requires optional origins to fit declared optional host patterns; its permissions reference documents a broad `https://*/*` optional declaration for arbitrary hosts discovered later. A broad optional declaration is not an active all-host grant, but still widens the potential permission boundary. This amendment approves neither that declaration nor `<all_urls>`. The later review must compare a narrow known-domain declaration, per-tab user-invoked access or manual-only operation; request only the exact approved origin. Unsupported patterns, unknown domains or denied access lead to a manual checkpoint. Runtime permission requests need a user gesture; recheck grants and stop on removal. [Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions).

**Isolation:** use packaged code in the isolated world if later approved. Isolation separates JavaScript globals; it does not make the shared DOM trustworthy. Never use MAIN-world injection to inspect page authentication state. Validate adapter messages, sender tab/frame/document/origin and bounded payloads in trusted extension logic. Page text cannot choose arbitrary origins, selectors, actions or privileged commands; render observations as text. Reject unselected frames and documents, opaque/unexpected URLs and unrecognized navigation. Keep credential fields and session-bearing URLs out of observations. [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [message security](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#security-considerations).

The design excludes cookie/session-token reads, browser/profile identity harvesting, page private JavaScript authentication state, local/session-storage credential inspection, network interception, undocumented internal endpoints and authenticated fetch/XHR proxies. Ordinary site UI submission remains the site's own session handling; the extension must neither obtain nor replay those credentials. No `cookies`, `identity`, debugger, network interception or API transport is introduced. The browser-first preference does not waive any existing credential prohibition.

## 6. Threats, approvals and failure controls

All controls below are requirements for future review, **PROPOSED / UNIMPLEMENTED / UNVERIFIED**.

| Risk | Required future control and stop condition |
|---|---|
| Wrong Chrome profile or three-tab identity | Operator confirms intended profile and explicitly selects each role within the extension's browser context; reject incognito/separate-profile assumptions. Never infer GitHub identity from Chrome/Google identity. Same-profile tabs can still use wrong accounts |
| Multiple matching tabs / wrong account | Display only minimal safe tab context, never raw titles/URLs containing customer values. Require explicit choice even among duplicate origins; confirm each site's visible account/target and operator authority independently. Missing reliable evidence means manual verification or block |
| Exact origin/navigation/target binding | Parse and compare full HTTPS origin including port; reject lookalike suffixes/userinfo/alternate hosts. Bind tab, document/frame, route, account context and org/repo/subscription/customer environment. Recheck just before interaction and on same-document route changes; navigation, tab replacement/closure or target drift invalidates approval |
| DOM deception, UI drift and asynchronous state | Versioned page signatures and bounded waits; reject missing/duplicate/hidden/disabled controls and unexpected dialogs. Shared DOM can lie; require target-specific corroborating post-action state. A trusted-event requirement or unknown page means manual fallback, not event/security bypass |
| Login, expired session, MFA or CAPTCHA | Pause; human handles the site's ordinary login/challenges. No automated credentials, consent, MFA or CAPTCHA. After completion, reselect/revalidate context and require fresh approval; GitHub and Odoo.sh sessions remain separate |
| Operator authority | Logged-in status, a visible repository, successful click or Odoo.sh GitHub sign-in is not proof of rights over selected organization, repository, subscription or customer. Establish owner-authorized scope and site-observable rights; unknown authority blocks writes |
| Sensitive write approval | Trusted extension review shows exact target, operation, effect and sensitive values only where needed for local review. Separate approval immediately before each repo/project/branch/key/install/database/domain/Plementus write. Bind to current context and invalidate on drift; no blanket run approval or synthetic execution authority |
| Duplicate action / timeout after possible write | At most one attempt for the reviewed action; no double submit or automatic retry. Timeout, lost response, navigation or suspension after possible submission means RECONCILE_REQUIRED. Inspect actual target for duplicates/conflicts and outcome before any fresh scoped approval; unknown is not absent |
| MV3 worker suspension, popup loss or browser restart | Bound each operation; never depend on a continuously running worker, popup or timer. Loss of state cannot imply cancellation of an external write. Re-establish identity/targets and reconcile first; no automatic resume/replay or journal-derived authority. Phase 04 may block all checkpoint-dependent work |
| Subscription/customer database exposure | Minimize in-memory values, clear abandoned form data without claiming provider deletion, exclude subscription references and database values from checkpoint records. Never enumerate/read credentials or pl_auth tokens. Exact handling of any non-credential sensitive fields still needs review |
| Screenshots, logs and exports | No raw DOM, screenshots, full URLs/query strings, tab titles, form values, private repo details, tokens or raw errors in logs/telemetry/export. Report only approved sanitized statuses/references and evidence tiers; manual attestation remains labeled. No clipboard access or hidden capture |
| Site policy / rate limits | Verify operation-specific permitted use and organization rules before testing. Use bounded observations; stop on policy denials, throttle notices, CAPTCHA or security challenges. No parallel bulk actions, session rotation, endpoint fallback or rate-limit evasion |
| SEC-01 / Phase 06 boundary | Preserve seven fields, non-renewable seven-day logical expiry, cleanup gate, blocked uncertain retention and case-specific owner disposition. No automatic deletion/resume, alternate store, fresh-run bypass or assumption of trusted elapsed time across restart. Synthetic approval remains executionAuthorized: false |

Chrome documents worker shutdown and loss of globals; durable storage guidance does not authorize storing sensitive data or enabling this project's blocked persistence. The existing clock packet requires real operator/device/incident controls and separate runtime/security acceptance. Browser-only operation cannot solve trusted-clock, uncertainty or durable duplicate-write gates by itself. [MV3 lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle), [SEC-01 packet](../phase04/PHASE_04_SEC01_CLOCK_SECURITY_ACCEPTANCE_PACKET.md).

## 7. Website automation and acceptable use

GitHub prohibits excessive automated bulk activity, unauthorized access and misuse of personal information, and reserves throttling/suspension for excessive bandwidth. Its acceptable-use policy treats automated extraction as scraping and distinguishes that from API collection; information-use and privacy restrictions remain applicable. Its terms also govern API access and abuse; API rate-limit rules are not a website automation allowance. [GitHub Acceptable Use Policies, sections 4–10](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies), [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service).

**Assessment/inference:** these pages do not establish permission for this extension's signed-in repository-creation workflow. Visible UI operation is not exempt from site policy, and having a session is not permission to scrape private content. Before any authorized experiment, review the specific operation, applicable account/organization terms and published automation restrictions; obtain clarification where permitted use is unclear. Record the outcome rather than inferring either universal prohibition or universal approval. Unknown policy compatibility means manual-only or BLOCKED. Do not replace denied UI automation with authenticated internal requests. Odoo.sh, Plementus and customer Odoo policy/entitlement compatibility remains UNVERIFIED and separately gated.

## 8. Prospective applicability of the twelve historical decisions

**All twelve historical statuses remain PENDING.** Owner architecture preference is recorded separately; it does not fabricate security concurrence, close historical decisions or approve any historical numeric limits. The following table reconciles applicability only; it is not a replacement decision register.

| Historical ID / topic | Historical state | Prospective browser-first applicability |
|---|---|---|
| 01 Authentication direction | PENDING | Owner prefers browser-first visible UI; security review of that direction remains pending. A GitHub App/backend is DEFERRED, not selected |
| 02 Backend exception | PENDING | No exception requested; not a prerequisite for this candidate UI arrangement. Required again if authenticated API/backend design returns |
| 03 Backend ownership/operations | PENDING | Deferred with backend; no hosting, budget or service owner selected |
| 04 Transient OAuth/code/PKCE/token handling | PENDING | No such handling requested; credential prohibition preserved; site sessions may not substitute as API tokens |
| 05 Provider credential storage | PENDING | No credential store proposed anywhere; browser's ordinary site session is not extension custody permission |
| 06 Backend session cookies/bearers | PENDING | No backend session introduced; no website cookie access or reuse approved |
| 07 Organization/operator/repository restrictions | PENDING | Still material: verify actual identities, entitlement, permitted targets and rights; visible account UI and human attestation limits need review |
| 08 Read endpoints/permissions | PENDING | Historical five-GET API map deferred; no provider API client. Review per-operation DOM scope and Chrome grants separately |
| 09 Registration/install/callback ownership | PENDING | App registration/OAuth callback work deferred; ordinary Odoo.sh sign-in is not a new extension App installation or approval |
| 10 Chrome identity/permissions/distribution | PENDING | No identity API proposed. Exact site grants, three-tab selection, dynamic hosts, browser baseline and distribution need future security decisions |
| 11 Logout/revocation/incidents/manual fallback | PENDING | Extension stop/permission removal must not claim provider logout/revocation. Human site logout, revalidation and owner-led incident handling need reviewed procedures |
| 12 Future sandbox/security verification | PENDING | Read-only recognition/fixtures recommended only; exact file scope, identities, origins, evidence limits and any live inspection need separate authorization; writes remain excluded |

**D-04 remains OPEN** for verified identities, permissions, target scope and site behavior. **B-02 remains OPEN** for any future authenticated API design under existing architecture/credential restrictions; it grants no authority to use browser sessions as API credentials. B-03 live sandbox/rights, site behavior, browser permission decisions and live-site authorizations remain OPEN/PENDING. Phase 04 and Phase 06 blockers, owner/device/incident/security acceptance and production NO_GO remain unchanged.

## 9. Recommended next gate, not authorized now

Recommend a future narrowly authorized **read-only tab recognition and fixture-based feasibility assessment** before any browser writes. Do not implement it here or mark 07.03 authorized. Independent ChatGPT review must first assess this amendment and define a fresh file allowlist, permission-review scope and evidence limits. Any live page inspection must receive separate explicit origin/account/operation authorization; the current owner's signed-in-tab description is not that authorization.

That later task should establish three-tab explicit selection, exact origin verification, a supported permission model, safe bounded page detection and manual fallback for ambiguity. Use invented fixtures for missing/duplicate tabs, wrong origin/account, permission denial/removal, route/document changes, stale observations, login/challenges, unexpected dialogs and worker/popup loss. Read-only recognition must exclude form filling, clicks that can mutate state, network credential access, provider writes and claims that fixtures prove real sites. No cookies, tokens, private JS authentication state, internal endpoints, provider API client or backend.

Acceptance would require deterministic refusal of ambiguous targets, minimum sanitized observations, explicit operator-selected scope and honest SIMULATED/local evidence. It would not close live feasibility, authorize writes, resolve SEC-01, accept Phase 06 parent, or change progress by itself. Any later write experiment needs its own policy/permission review, disposable target, explicit approval, result-verification and reconciliation plan.

## 10. Scope, verification and handoff

Exactly seven paths under `Sh_Project_Setup_extension/docs/`:

| Change | Path |
|---|---|
| New | `Phases/phase07/PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md` |
| Modified | `Phases/phase07/PHASE_07.md` |
| Modified | `00_PROJECT_STATUS.md` |
| Modified | `03_CHANGELOG.md` |
| Modified | `04_TEST_EVIDENCE.md` |
| Modified | `05_BLOCKERS_AND_DECISIONS.md` |
| Modified | `06_HANDOFF.md` |

Baseline hashes and read-only verification artifacts reside outside the repository at `/tmp/phase0702-browser-first-_4h18ail/`. [Measured documentation evidence](../../04_TEST_EVIDENCE.md#browser-first-owner-direction-amendment--2026-11-02-africacairo) records exact scope, unchanged index/protected bytes, master/source equality, historical acceptance and twelve decision states, local links/anchors and whitespace. No ignored IDE file was read, hashed or modified. No master/source/ADR/contracts/security/07.01/07.02/Phase 04/06, application code, manifest, test, fixture or dependency edit.

**Application/browser/provider tests: NOT RUN.** No live tab discovery, DOM inspection, permission request, login, credential access, API call, provider write or automation implementation. Documentation checks cannot establish operational security or site compatibility. No commit or push.

Skills used: Superpowers using-superpowers and verification-before-completion; Ponytail full; Stop Slop. Tools used: shell/Git/Python and apply_patch through functions.exec; web.run for public official documentation. WarpGrep and Valyu were unavailable in the tool inventory; no browser automation, authenticated connector or subagent was used.

## 11. Current official source register

Retrieved **2026-11-02 (Africa/Cairo)**. Official facts support platform/policy statements only; requirements, feasibility categories and risk controls above are assessment proposals. No source establishes site selectors or permission for this product's live operations.

| ID | Official source | Claim boundary |
|---|---|---|
| C-BF-01 | [Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs) | Tab management versus sensitive tab metadata and host grants |
| C-BF-02 | [Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting) | scripting plus host/activeTab requirement; targeted frame execution |
| C-BF-03 | [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) | Isolated JavaScript world and shared DOM |
| C-BF-04 | [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) | Required/optional permissions and host declarations |
| C-BF-05 | [Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions) | Optional matching declarations, dynamic-host example and user gesture |
| C-BF-06 | [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab?hl=en) | Temporary user-invoked per-tab origin access; initial canonical URL timed out, query-form page succeeded |
| C-BF-07 | [Service-worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Suspension and loss of globals; no guaranteed continuous worker |
| C-BF-08 | [Message security](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#security-considerations) | Treat content-script messages as untrusted; limit privileged actions |
| G-BF-01 | [GitHub Acceptable Use Policies](https://docs.github.com/en/site-policy/acceptable-use-policies/github-acceptable-use-policies) | Bulk/unauthorized activity, scraping/information restrictions, privacy and bandwidth |
| G-BF-02 | [GitHub Terms of Service](https://docs.github.com/en/site-policy/github-terms/github-terms-of-service) | Account/acceptable-use obligations and separate API terms; no inferred UI automation approval |

**STOP FOR INDEPENDENT CHATGPT REVIEW. OWNER_ARCHITECTURE_DIRECTION / SECURITY_REVIEW_PENDING; 07.03 NOT_STARTED / NOT_AUTHORIZED; production NO_GO.**
