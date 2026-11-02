# Phase 07.01: GitHub authentication options and security threat model

**READY_FOR_REVIEW; not ACCEPTED.** Assessment date and official-documentation retrieval date: **2026-11-02 (Africa/Cairo)**. Documentation only. Accepted progress **5/20 master phases; 26/72 official micro-phases**, unchanged by this report. Phase 04 **IN_PROGRESS / BLOCKED / POSTPONED**; Phase 05 **ACCEPTED**; Phase 06 parent **PARTIAL / BLOCKED / NOT ACCEPTED**; production **NO_GO**. 07.02 and 07.03 **NOT_STARTED / NOT_AUTHORIZED**.

## Scope, evidence and assessment plan

- Verify exact Git identity, complete changes and live origin tip before editing.
- Read the required governance/security/Phase 04/06 documents and inspect manifest and architecture read-only.
- Verify current official GitHub/Chrome capabilities, then separate them from candidate extension designs and unverified behavior.
- Write the comparison, threat model, conditional recommendation and explicit owner/implementation gates.
- Reconcile supplied 06.04 acceptance; verify exactly eight documentation paths and preserve all protected material. Stop for independent ChatGPT review.

This report does not select, configure, implement or activate authentication. No authentication/consent/API session, account access, token exchange, authenticated GitHub API call, sandbox, provider mutation or backend was initiated. Public documentation consultation and the explicitly required read-only Git remote-tip queries are the only external work. Official capability verification is not `GITHUB_SANDBOX_VERIFIED` or extension runtime evidence.

Read: [master plan](../../01_MASTER_PLAN.md), [status](../../00_PROJECT_STATUS.md), [architecture decisions](../../02_ARCHITECTURE_DECISIONS.md), [blockers](../../05_BLOCKERS_AND_DECISIONS.md), [handoff](../../06_HANDOFF.md), [integration contracts](../../08_INTEGRATION_CONTRACTS.md), [security](../../09_SECURITY_AND_SECRETS.md), [Phase 04](../phase04/PHASE_04.md), [Phase 06](../phase06/PHASE_06.md) and [06.04](../phase06/PHASE_06_04.md). Existing source was inspected, not executed or changed.

## Git preflight and acceptance reconciliation

| Field | Verified entry evidence |
|---|---|
| Root | `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` |
| Extension | `Sh_Project_Setup_extension` within that root |
| Branch | `feature/sh-project-setup-extension-clean` |
| HEAD / upstream SHA / live remote branch tip | `5f9f588ca04c5742e218f76bc18c8191bc1fd833` |
| Upstream | `origin/feature/sh-project-setup-extension-clean` |
| Origin fetch and push URLs, all configured values | `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| Complete staged / unstaged / untracked changes | Empty / empty / empty |
| Ignored inventory | Only `.idea/workspace.xml`; never opened, modified, staged or reset |
| Tracked baseline | 215 files; content hashes and index-entry snapshot retained outside the repository |

The owner supplies **06.04 ACCEPTED at published `5f9f588` within offline scope**. The exact published tip is verified above; Git cannot independently establish reviewer acceptance. Prior RED, GREEN and migration evidence remains untouched in the linked 06.04 report. Its historical pending-review state is superseded for current tracking only. Historical **39 focused / 213 full Node PASS** results are not new test runs. All 06.01–06.04 offline acceptance leaves the parent Phase 06 blocked and not accepted.

## Architecture actually present

The [manifest](../../../manifest.json) declares MV3, a module [service worker](../../../src/background.js) and the [action popup](../../../src/popup/popup.js). It has no permissions, host permissions, OAuth configuration or content-script declarations. The worker contains only an empty installation listener. Popup behavior is local validation/rendering; it imports the local validator, with no GitHub transport or sign-in. There is no extension-local package/dependency manifest or backend.

The [v1 adapter contract](../../../src/adapters/contract.mjs) admits only Odoo.sh, customer Odoo and Plementus providers; it does not admit a GitHub provider or `GITHUB_SANDBOX_VERIFIED` results. The [coordinator](../../../src/workflow/step-coordinator.mjs), [approval](../../../src/workflow/approval-checkpoint.mjs) and [pause controller](../../../src/workflow/pause-control.mjs) remain disconnected simulations; recorded approval intent is not execution authority. Existing non-secret [run records](../../../src/storage/run-record.mjs) and SEC-01 checkpoints are not credential containers.

Consequently a future connector needs an explicitly reviewed integration boundary; it must not silently add GitHub to the protected v1 contract or wire authentication into simulated approval authority. ADR-001's no-backend direction and the security document's prohibition on capturing/storing/logging access tokens remain unchanged. No current architecture proves a feasible authenticated implementation under both restrictions.

## Capability and candidate comparison matrix

**OFFICIAL** means verified documentation; **CANDIDATE** means this assessment's unimplemented proposal; **UNVERIFIED** means no extension/provider experiment. A documented protocol is not automatically appropriate for a public MV3 client.

| Option | Officially verified capability | Client credential / backend dependency | Candidate implementation approach | Unsupported or unverified behavior | Security requirements and blockers |
|---|---|---|---|---|---|
| A. OAuth App, browser authorization code | Consent/code flow; S256 PKCE; code exchange still requires client secret. Implicit grant unsupported. [G01](#g01) | Public extension cannot protect the secret; a confidential exchange service is necessary under the project's no-embedded-secret rule | Consented Chrome flow plus separately approved backend exchange/proxy | Secretless code exchange is not documented; end-to-end MV3 flow untested | Broad private-repository scopes; D-04, B-02, backend exception, credential policy and org approval |
| B. GitHub App, user authorization | Web flow with S256 PKCE and client-secret exchange. User/app resource intersection. [G05](#g05), [G04](#g04) | Backend required under project secret prohibition; user-token exchange alone does not require an App private key | Preferred conditional direction: user-authorized, selected-repository read access via backend | No documented secretless web exchange; no verified callback/client/backend/session integration | Owner installation plus individual consent, minimum permissions, account/tenant binding; D-04/B-02 and backend/policy decisions |
| C. GitHub App, installation token | App JWT obtains a repository/permission-limited installation token. [G07](#g07), [G08](#g08) | JWT needs private key; external confidential signer/backend required under project rules | Separately scoped service automation if later justified | Installation token does not authenticate the human; no keyless extension minting | Independent operator authorization on every request; confused-deputy risk; app key blast radius; backend and policy blockers |
| D. Device authorization, OAuth App or GitHub App user token | Documented device grants without client secret, enabled explicitly. [G01](#g01), [G05](#g05) | Protocol has no secret-exchange backend requirement; does not solve token custody | Alternative only for a justified constrained/headless case after review | Browser-extension suitability and MV3 polling lifecycle UNVERIFIED; not an installation-token flow | GitHub warns against enabling without reason; phishing/session substitution, cancellation and token-policy blockers [G09](#g09) |
| E. Fine-grained PAT | User-created credential scoped to one owner, selected repositories and granular permissions. [G10](#g10) | No application client secret/backend required by protocol | Possible narrowly scoped operator-managed access only after a policy revision | No OAuth callback/PKCE or automatic OAuth refresh; no safe storage/collection approved | Manual secret entry/clipboard exposure, approval/lifetime policy, endpoint limitations; violates current collection/storage boundary |
| F. Unauthenticated public reads (not authentication) | Public branch reads are supported without authentication. [G18](#g18) | No secret or backend | Potential future public-only/mock boundary, separately authorized | Cannot establish signed-in identity, private access or organization authority | Does not satisfy private-repository objective; public results must never imply access approval |

GitHub's own public-client guidance acknowledges that a distributed client cannot protect its client secret and discusses shipping it with PKCE. That does **not** override this project's stricter prohibition. PKCE mitigates interception; it is not evidence that GitHub waives the secret parameter. Device flow is a distinct documented grant, not a browser-code workaround. [G09](#g09)

## Documented flows and MV3 implications

**A: OAuth App browser flow.** Consent → callback code/state → exchange → identity revalidation. [G01](#g01) OIDC ID tokens remain UNVERIFIED; no such flow was verified.

**B: GitHub App user flow.** User consent is separate from installing the app. Installation alone does not authorize every organization member to act as a user; user authorization alone does not install repository access. A user token is limited by both user and app access, including installation placement. SSO can further limit organization access. [G04](#g04) The documented web exchange takes client ID, secret and code, plus the verifier when a challenge was sent. [G05](#g05)

**C: Installation flow.** Confidential signer creates an RS256 App JWT using the private key; JWT expiry is at most ten minutes. [G08](#g08) The backend exchanges it for an installation token, explicitly narrowing repositories and permissions; omitting narrowing defaults to installation grants. [G07](#g07) This is app authority and needs a separate human-authorization design for operator-driven requests. Never ship the private key or mint installation tokens in the extension. [G09](#g09)

**D: Device flow.** Obtain device/user codes, direct user verification on GitHub, then poll within the returned interval/deadline. Both documented device exchanges omit a client secret. [G01](#g01), [G05](#g05) A user code is transient authentication material, excluded from logs, checkpoints and evidence. The flow has no redirect/state/PKCE callback binding; a locally initiated transaction and verified resulting identity are essential. Browser availability makes its phishing and UX trade-off hard to justify here. [G09](#g09)

**E: PAT.** Creation and repository/permission selection occur in the user's GitHub settings. A PAT is a bearer credential, not a consented extension redirect flow. One token cannot span multiple resource-owner organizations; outside-collaborator and endpoint gaps must be checked before use. [G10](#g10) No PAT was requested or generated.

**Chrome boundary.** `chrome.identity.launchWebAuthFlow` supports non-Google authorization and returns the final redirect URL; `getRedirectURL` produces an HTTPS `chromiumapp.org` URL tied to the extension ID. It requires `identity`. `getAuthToken`/Chrome profile identity must not be treated as a GitHub identity/token service. Initiation must follow an explained user action. [C01](#c01) This only verifies Chrome's browser mechanism, not GitHub registration acceptance or a working extension flow.

**Redirect requirements.** GitHub App callback URLs differ from installation setup URLs. Disable wildcard matching and use a specifically registered callback. [G16](#g16) For OAuth too, configure an exact callback with wildcard matching disabled. [G01](#g01) A candidate direct extension callback needs stable production/development extension IDs and exact generated paths. A backend callback instead needs a separately reviewed, single-use return handoff bound to that extension transaction; never return provider tokens in URLs. Neither topology is selected or tested. Match the complete expected scheme/host/path and transaction, not Chrome's broader wildcard interception pattern.

**Worker/network limits.** Worker globals can disappear on shutdown; Chrome 116 added a longer-prompt exemption for `launchWebAuthFlow`, which is not a guarantee against all termination. [C02](#c02) Under a future explicitly approved transient-only design, worker loss must cancel the attempt and require a fresh user action; do not write secrets into the durable journal to recover it. Extension-origin cross-origin requests need approved host access; content scripts retain web-origin restrictions. Host patterns are not a path-level authorization barrier. [C04](#c04) Actual provider CORS/redirect/exchange compatibility and supported Chrome versions remain UNVERIFIED. No permission was added.

## Per-option lifecycle, consent and operating assessment

The common controls in the next section apply to every authenticated candidate; these option-specific differences are additional requirements.

| Option | Consent, identity and organization policy | Lifetime / renewal / revocation | Exposure, UX and operational consequences |
|---|---|---|---|
| A. OAuth App | Show requested and returned scopes; `repo` includes private read/write and is not a private read-only grant. [G02](#g02) Organization OAuth restrictions may require owner approval. [G12](#g12) Verify actual user, never the login hint/profile | Long-lived by default; optional expiring access lasts 8 hours, refresh expires after 6 months without use; browser-flow refresh requires secret. [G01](#g01) Revoke grant/token through authorized provider procedures [G15](#g15) | Familiar browser consent, but backend operation plus potentially excessive repository authority. Read-only application UI cannot narrow a stolen broad-scope token |
| B. App user | Organization installation/selected repositories plus individual authorization. [G04](#g04) Installation can be restricted to org owners. [G13](#g13) Recheck user/install/repo intersection | Expiration enabled by default unless opted out: 8-hour access, 6-month refresh. Refresh rotates both tokens; secret required except device-origin tokens. [G06](#g06) User grant revocation invalidates its tokens [G15](#g15) | Granular read permissions and user attribution; two consent concepts need clear UI. Backend availability, session security and credential operations add cost |
| C. Installation | Account owner/install rights and selected repositories. [G14](#g14) Does not inherit an operator's access limits; enforce those independently | Installation token expires in 1 hour; generate replacement via App JWT, not OAuth refresh. [G07](#g07) Suspension/uninstallation removes relevant installation access [G14](#g14) | Highest custody/tenant-isolation burden; App private key can affect all installations. Better suited to service automation than this operator-driven baseline |
| D. Device user | Approval in GitHub's verification page; validate resulting user and applicable OAuth scopes or App installation intersection | Token family follows A/B. Device-origin refresh does not require client secret. [G01](#g01), [G06](#g06) Denial/expiry end the attempt | Extra code entry and polling; remote phishing risk, worker loss and uncertain issuance complicate cancellation. No implicit automatic restart |
| E. Fine-grained PAT | User chooses owner/repos/permissions; org policy may deny access or require approval and maximum lifetime. [G11](#g11) Validate credential's real user/targets | User-selected expiration subject to policy, manual replacement/deletion; no OAuth refresh grant [G10](#g10) | Minimal app infrastructure; highest manual credential-transfer friction. Clipboard, form, extensions, logs and accidental reuse widen exposure; not recommended as the product default |

Clearing extension state is **local logout**, not provider revocation. GitHub user authorizations and installations have separate revocation/suspension controls; removing one installation does not remove other installations or necessarily revoke the user authorization. [G14](#g14), [G15](#g15) Logout must stop requests, cancel active transactions, invalidate any separately approved backend session and discard transient material. If provider revocation cannot be confirmed, label it unverified and give an owner-controlled manual path; do not report global sign-out. OAuth revocation may affect deploy keys created by that app, so assess those consequences before any future authorized revocation. [G03](#g03)

## Threat model and required controls

This section is security analysis and candidate requirements, not a claim that controls are implemented. Assets: provider credentials/codes, operator identity, selected organization/repository, private repository data, consent/approval intent and incident evidence. Adversaries: malicious web content, forged extension messages, another signed-in account, compromised profile/extension, replaying callbacks, a malicious tenant and a compromised backend. Boundaries: provider UI ↔ callback; extension UI ↔ worker; worker ↔ provider/backend; user ↔ installation authority; backend ↔ tenants; transient auth material ↔ non-secret journal.

| Threat / applicable options | Required behavior before authenticated implementation | Residual risk / gate |
|---|---|---|
| CSRF and authorization response substitution (A/B) | Cryptographically random single-use state, bounded lifetime, S256 verifier binding; correlate client ID/provider, callback and initiating profile/attempt. Reject missing, duplicate, malformed or mismatched code/state, unexpected fragment/error combinations and replay | PKCE does not replace state, backend authentication or exact callback validation; mocked adversarial cases and later authorized browser evidence needed |
| Authorization mix-up / wrong account (A/B/D/E; human boundary for C) | Fixed GitHub issuer/endpoints, exact allowed callback, one active attempt per context; revalidate authenticated user on every new credential, including refresh, before displaying data. Bind durable user/org/repo IDs to selected context; fail closed on mismatch, then require fresh review | Chrome/Google identity, login hint, email, visible avatar and installation ID are not proof of the intended GitHub operator. `GET /user` supports App user tokens and fine-grained PATs, not installation tokens [G17](#g17) |
| Confused deputy / cross-tenant reads (especially C and backend B) | Backend authenticates its caller independently, validates user access to selected installation/repository on every request, and uses user tokens for user-driven operations. Never accept arbitrary installation IDs, repository IDs, URLs or verbs as authority | A public client ID, extension origin or installation callback parameter is not caller authentication; a private-key service otherwise exposes its broader authority |
| Credential theft (A–E) | No secrets/keys/tokens in source/assets, URLs, clipboard, logs, screenshots, exports, telemetry, raw errors, DOM/content scripts, messages to pages or durable checkpoints. Keep any future permitted credential operation confined to reviewed trusted contexts | Compromised profile/extension can read usable runtime secrets. Encryption at rest is not protection against malicious running code and does not satisfy a no-token-storage rule |
| Backend compromise / session theft (A/B/C candidate) | Secret manager and restricted key access, TLS, tenant checks, restrictive extension-origin/CORS rules plus independent session authentication, CSRF controls, request allowlist, response minimization and redacted audit evidence. Define rotation, availability and deletion responsibilities | Backend session cookies/bearers are reusable credentials too. A proxy that keeps GitHub tokens off the extension still requires an explicit session/custody policy |
| Host/page/message injection (all) | Enforce exact provider/backend origins and approved read routes in trusted worker/backend; validate sender/context, operation, identifiers, response shape and pagination/redirect destinations. Never offer generic authenticated fetch to page code or render API data as HTML | Chrome host permissions do not enforce route/method safety; malicious API pagination or redirects must not receive authorization headers [C04](#c04) |
| Device phishing / session swap (D) | Only an explained user action may initiate a transaction; allow only GitHub verification origin; correlate returned codes locally and verify authenticated identity. Honor server polling interval/slow-down, deadline and denial; never accept a code supplied by an unrelated page | No redirect-bound state/PKCE; secretless does not mean phishing-resistant. Suitability is an owner/security decision, not assumed |
| Manual token substitution (E) | If ever separately allowed, verify identity and actual read permissions; reject overbroad credentials rather than rely on UI promises. Never share operator tokens or automate settings/consent | No current credential-entry authorization; manual token transfer remains a leak path |
| Suspension, renewal and stale results (A–E) | Invalidate incomplete attempts on context loss/logout; stale callbacks and late token responses cannot reopen cancellation. Serialize any approved refresh and discard stale responses. No durable auth recovery through SEC-01 | In-flight issuance may finish after cancellation; do not claim it was revoked. Define owner-led cleanup and confirmed revocation before reuse |
| Denial, cancel, policy denial and failure (all) | Clear pending attempt, show sanitized status and stop; do not expand scope or re-prompt automatically. Treat 401 as unusable auth; 403/404 can mean policy/invisibility, not proof of absence. Rate limits/network errors get bounded safe handling, never credential fallbacks | Provider denial, SSO and repository access must be tested separately. No automatic sign-in, consent, token minting or silent policy bypass |
| Read-to-write escalation (all) | Read-only provider grants where supported plus explicit operation/method allowlists. Future repository/branch/deploy-key writes need new authorization, reviewed grant changes, exact target preview and revalidation; unknown write results require reconciliation | Existing simulated approvals grant no real authority. Future write permissions must not be bundled into 07.03 |
| Incident / credential exposure (A–E) | Stop affected operations; owner/security contacts decide containment, authorized revocation/rotation and recovery. Preserve only redacted chronology and target references; verify access removal, reassess selected targets, then require fresh owner approval | Do not automatically delete evidence, change credentials, retry uncertain operations or reset SEC-01. Incident owner/channel, SLA and recovery criteria remain OPEN |

## No-token-storage constraint and least-privilege boundary

The current rule prohibits token storage in every location. Chrome's in-memory `storage.session` survives some worker lifetimes but is still storage, requires `storage`, and is not a credential vault or an approved exception. [C03](#c03) Keeping a decrypted token in JS memory is still handling plaintext at runtime. Encrypting persisted tokens while retaining a decrypting key in the extension does not eliminate credential custody. SEC-01's approved seven fields and retention/uncertainty policy remain byte-identical and cannot hold tokens, verifiers, device codes, refresh state or a backend session.

**OWNER DECISION REQUIRED:** whether any narrowly bounded transient credential handling is permissible, whether backend credential custody is permissible, and what a backend session may contain. No reinterpretation of “never store” as “never store on disk” is adopted here. If the owner retains the strict prohibition without an approved credential boundary, authenticated options remain blocked; only separately authorized mock/public reads and manual provider workflows can progress. No option is asserted to make private authenticated requests without usable authorization material.

For future reads, build an endpoint-to-permission map before requesting any grant. As a verified example, `GET /repos/{owner}/{repo}/branches` accepts App user/installation tokens and fine-grained PATs with **Contents: read**; public branch reads need no authentication. [G18](#g18) This is a candidate minimum for that endpoint, not a final grant for organization membership/repository discovery. Verify each additional route separately. OAuth `repo` is broader than private read-only; `public_repo` also grants writes, while `read:org` does not grant private code access. [G02](#g02)

No write grant is requested in 07.01. Future private repository creation, branch changes, utility commits and deploy keys require separate endpoint compatibility, permission and sandbox decisions. A successful read or consent never authorizes those writes. Authentication-only POSTs and provider revocation DELETEs are distinct from repository reads, but still require explicit future scope; a read-only connector must not quietly add either path.

## Recommendation for owner/security consideration

**Recommend evaluating option B: GitHub App user authorization via a consented browser flow with a small separately approved backend.** Granular permissions and selected installations reduce exposure compared with OAuth `repo`; user-bound authority suits an operator-driven workflow better than installation-only authority. GitHub generally favors Apps for fine-grained access. [G03](#g03) Keep user-driven operations under user tokens and prevent backend tenant/account substitution. No installation private key is necessary merely to exchange a user authorization code.

This recommendation is **CANDIDATE_ONLY**, not method selection or owner approval. Its costs are a change to ADR-001's no-backend direction, a new service/session trust boundary, secret operations and policy decisions. A backend exchanging tokens and returning them to the extension would not solve the custody problem; a backend proxy introduces its own session credential problem. Neither variant is designed as approved here. **D-04 remains OPEN**, B-02 remains OPEN, and implementation remains unauthorized.

A is less attractive for private read-only access because of scope breadth. C requires powerful key custody and independent human authorization. D removes the client-secret dependency but is discouraged without constrained-environment justification. E has granular grants but manual secret handling and lifecycle friction. F remains a limited public-only possibility, not a replacement for the private integration objective. If the owner preserves both present restrictions, recommend retaining the authentication block and manual workflow rather than embedding credentials or claiming a connector.

## Decisions before 07.02 and verification before 07.03

Before **07.02 may start**, independent ChatGPT must review 07.01 and the owner must explicitly authorize that next micro-phase. The 07.02 decision packet must resolve these items before any chosen approach is treated as approved:

1. D-04: intended GitHub host/account/organization, operator role, app owner and authorized repository scope; read-only objective and excluded writes.
2. Whether the no-backend architecture may change; if so, ownership, hosting, jurisdiction/data exposure, availability, cost, trust boundaries and incident responsibilities. No backend is authorized by this report.
3. Whether transient token/code/verifier handling, renewal material, encrypted backend custody and backend session credentials are permitted; exact lifetime, logout/revocation, deletion and recovery rules. Preserve SEC-01 separately.
4. App vs OAuth/PAT/device choice, rationale and explicit minimum endpoint/permission list; organization installation/approval/SSO constraints. Device suitability needs affirmative justification; PAT collection needs separate approval.
5. Stable extension IDs/distribution, Chrome baseline, callback topology/registration ownership, separately authorized Chrome/host permissions and browser-profile/account binding.
6. Reviewers, redacted evidence requirements and boundaries for any later real-provider validation. Sandbox/account access and future writes need their own express authorization.

Before **implementing 07.03**, verify the accepted 07.02 record and obtain explicit, file-scoped implementation authorization. Then recheck official documentation for the selected grant, required secret parameters, PKCE, redirects, expiration and supported endpoints. Confirm the approved credential/session policy is technically coherent; otherwise remain BLOCKED. Verify:

- Callback registration/extension-ID plan, exact-state/PKCE transaction design and issuer/client binding; no wildcard dependency or secret in a public client.
- Read-route/permission map, approved host scope, organization-policy assumptions, per-request user/install/repository intersection and explicit write denial.
- A testable transport/auth boundary with synthetic placeholders only; the current v1 adapter contract and coordinator do not already support GitHub. Any changes to protected contracts/modules require explicit scope.
- Mock cases for account/tenant mismatch, callback replay and malformed parameters, consent denial/cancel, late responses, worker loss, expiry/refresh races, revoked access, org/SSO denial, 401/403/404/429/network errors, redirect/pagination leakage and redaction.
- Whether registration and live compatibility evidence exist. If they require sign-in, consent or token exchange, request a separate explicitly authorized validation scope; they are not prerequisites to be exercised under this documentation task. Mocks must retain real-provider `UNVERIFIED` status.
- Incident contact/route, revocation ownership and a manual fallback; no approval/reference is accepted as execution authority and no uncertain write is replayed.

These are entry checks, not a future-phase implementation plan or authorization. 07.02 and 07.03 stay **NOT_STARTED / NOT_AUTHORIZED**.

## Authorized documentation files and verification record

Exactly these paths relative to the Git root are authorized; no files are staged:

| Change | Path |
|---|---|
| New | `Sh_Project_Setup_extension/docs/Phases/phase07/PHASE_07.md` |
| New | `Sh_Project_Setup_extension/docs/Phases/phase07/PHASE_07_01.md` |
| Update | `Sh_Project_Setup_extension/docs/00_PROJECT_STATUS.md` |
| Update | `Sh_Project_Setup_extension/docs/03_CHANGELOG.md` |
| Update | `Sh_Project_Setup_extension/docs/04_TEST_EVIDENCE.md` |
| Update | `Sh_Project_Setup_extension/docs/05_BLOCKERS_AND_DECISIONS.md` |
| Update | `Sh_Project_Setup_extension/docs/06_HANDOFF.md` |
| Update | `Sh_Project_Setup_extension/docs/09_SECURITY_AND_SECRETS.md` |

Final measured documentation checks are recorded in [04_TEST_EVIDENCE.md](../../04_TEST_EVIDENCE.md). Verification uses Git and Python standard-library assertions, not application tests. Baseline hashes/index snapshot and local checker evidence are outside the repository at `/tmp/phase0701-review-8mlf6ar2/`. Checks cover the exact eight-file scope, Markdown file/fragment destinations, source citation URLs/retrieval dates, all protected tracked bytes/index entries, full Git inventory, master/source equality, historical/security preservation, whitespace and newly written credential patterns. A pattern scan cannot prove absence of every possible secret; no credentials were collected and no provider-response samples were copied.

**Application, browser, authenticated provider and backend tests: NOT RUN.** No sign-in/consent/token/API session or permissions/configuration change. Skills used: Ponytail; Superpowers using-superpowers, brainstorming assessment principles and verification-before-completion, bounded by the explicit documentation-only instructions. Tools used: shell/Git/Python and `apply_patch` through `functions.exec`, plus `web.run` for public official documentation. No GitHub account connector, browser-control tool, subagent, WarpGrep or Valyu was used.

## Official source register

All sources below were successfully retrieved **2026-11-02 (Africa/Cairo)**. They establish documented capabilities only. No login, settings, authorization or API endpoint shown inside them was followed. An initial outdated App-auth path/timeout was resolved by reading the current official pages listed below. Recheck before implementation; GitHub.com behavior must not be assumed identical on GitHub Enterprise Server.

### G01

[GitHub — Authorizing OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/authorizing-oauth-apps). Retrieved 2026-11-02. Code/device grants, PKCE, required secret, optional expiration and callback rules.

### G02

[GitHub — Scopes for OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/scopes-for-oauth-apps). Retrieved 2026-11-02. Scope breadth and public/private distinction.

### G03

[GitHub — Differences between GitHub Apps and OAuth apps](https://docs.github.com/en/apps/oauth-apps/building-oauth-apps/differences-between-github-apps-and-oauth-apps). Retrieved 2026-11-02. Granularity, actor/installation distinctions and revocation consequences.

### G04

[GitHub — Authenticating with a GitHub App on behalf of a user](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user). Retrieved 2026-11-02. Authorization vs installation, user/app intersection and SSO.

### G05

[GitHub — Generating a user access token for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app). Retrieved 2026-11-02. Web/device parameter requirements and denial/polling behavior.

### G06

[GitHub — Refreshing user access tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens). Retrieved 2026-11-02. Default/optional expiration, rotation and device-origin secret exception.

### G07

[GitHub — Generating an installation access token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-an-installation-access-token-for-a-github-app). Retrieved 2026-11-02. JWT exchange, narrowing and one-hour expiry.

### G08

[GitHub — Generating a JWT for a GitHub App](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-json-web-token-jwt-for-a-github-app). Retrieved 2026-11-02. Private-key/RS256 and JWT lifetime requirements.

### G09

[GitHub — Best practices for creating a GitHub App](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app). Retrieved 2026-11-02. Public-client limitations, device phishing, key custody and user vs installation authority.

### G10

[GitHub — Managing personal access tokens](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/managing-your-personal-access-tokens). Retrieved 2026-11-02. Fine-grained ownership, permissions, creation/deletion and limitations.

### G11

[GitHub — Setting an organization PAT policy](https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/setting-a-personal-access-token-policy-for-your-organization). Retrieved 2026-11-02. Blocking, approval and maximum lifetime policy.

### G12

[GitHub — OAuth app access restrictions](https://docs.github.com/en/organizations/managing-oauth-access-to-your-organizations-data/about-oauth-app-access-restrictions). Retrieved 2026-11-02. Organization approval restrictions.

### G13

[GitHub — Limiting app access requests and installations](https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/limiting-oauth-app-and-github-app-access-requests-and-installations). Retrieved 2026-11-02. Owner-only installation restrictions and request controls.

### G14

[GitHub — Reviewing and modifying installed GitHub Apps](https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps). Retrieved 2026-11-02. Repository selection, suspension, uninstall and separate user authorization.

### G15

[GitHub — Token expiration and revocation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation). Retrieved 2026-11-02. Grant/token revocation and unusable expired/revoked credentials.

### G16

[GitHub — User authorization callback URL](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-user-authorization-callback-url). Retrieved 2026-11-02. Callback/setup distinction and configurable wildcard matching.

### G17

[GitHub REST — Get the authenticated user](https://docs.github.com/en/rest/users/users#get-the-authenticated-user). Retrieved 2026-11-02. User-token identity and fine-grained token compatibility.

### G18

[GitHub REST — List branches](https://docs.github.com/en/rest/branches/branches#list-branches). Retrieved 2026-11-02. Supported token types, Contents: read and public unauthenticated access.

### C01

[Chrome — Identity API](https://developer.chrome.com/docs/extensions/reference/api/identity). Retrieved 2026-11-02. Non-Google browser flow, generated redirect URL, identity permission and profile identity distinction.

### C02

[Chrome — Extension service worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle). Retrieved 2026-11-02. Shutdown/global state and version-dependent prompt lifetime.

### C03

[Chrome — Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage). Retrieved 2026-11-02. Storage permission, session lifetime and content-script exposure defaults.

### C04

[Chrome — Cross-origin network requests](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests). Retrieved 2026-11-02. Host permissions, worker/content-script differences and request/message restrictions.

**NEXT: STOP FOR INDEPENDENT CHATGPT REVIEW. D-04 remains OPEN; 07.01 is not accepted; 07.02/07.03 are not authorized. No commit or push.**
