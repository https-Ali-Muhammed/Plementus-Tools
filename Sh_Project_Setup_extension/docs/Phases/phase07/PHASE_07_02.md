# Phase 07.02: GitHub authentication decision and owner/security authorization packet

**READY_FOR_OWNER_SECURITY_DECISION / READY_FOR_CHATGPT_REVIEW**. Prepared **2026-11-02 (Africa/Cairo)**. Documentation only; **not ACCEPTED or APPROVED**. All twelve decision items are **PENDING**. This packet proposes choices; it selects no authentication method and changes no security policy.

Accepted progress remains **5/20 master phases; 27/72 official micro-phases**. Phase 04 **IN_PROGRESS / BLOCKED / POSTPONED**; Phase 05 **ACCEPTED**; Phase 06.01–06.04 **ACCEPTED for offline scope**, parent Phase 06 **PARTIAL / BLOCKED / NOT ACCEPTED**; parent Phase 07 **IN_PROGRESS / NOT ACCEPTED**. **D-04 and B-02 remain OPEN / OWNER DECISION REQUIRED; production NO_GO. Phase 07.03 NOT_STARTED / NOT_AUTHORIZED.**

## 1. Authority, reading and acceptance reconciliation

The owner authorizes preparation of this decision package only. No approval is inferred from the request, recommendation, documentation publication, commit history or public-source research. Independent ChatGPT review and explicit project-owner/security decisions remain outstanding. No implementation follows automatically even if this packet is later published or accepted as documentation.

Required documents read: [master plan](../../01_MASTER_PLAN.md), [current status](../../00_PROJECT_STATUS.md), [architecture decisions](../../02_ARCHITECTURE_DECISIONS.md), [blockers](../../05_BLOCKERS_AND_DECISIONS.md), [handoff](../../06_HANDOFF.md), [contracts](../../08_INTEGRATION_CONTRACTS.md), [security rules](../../09_SECURITY_AND_SECRETS.md), [Phase 07 parent](PHASE_07.md), [07.01 assessment and official source register](PHASE_07_01.md#official-source-register), and [Phase 06 parent](../phase06/PHASE_06.md).

The owner supplies **07.01 ACCEPTED at published `b04d0d49005e9a0aa44b207e6008a92d82d10a14` (`b04d0d4`)**. Git checks verify the published commit, not independent reviewer acceptance. The entire 07.01 report remains byte-identical to HEAD, including its original pending-review language, threat model, evidence and source register. Current tracking supersedes that historical review state only. Supplied 06.04 offline acceptance at `5f9f588` remains reconciled; no Phase 06 report or historical RED/GREEN result is changed or rerun. 07.02 adds no accepted progress.

ADR-001 and the master plan prohibit a backend without a later owner-approved scope change. The security rules prohibit capture/storage/logging of credentials, including access tokens and cookies, in every location. Volatile memory, browser session storage, encryption and a backend are **not existing exceptions**. Transient codes/verifiers, provider tokens, backend client secrets and backend session credentials each need explicit authorization. SEC-01 remains a separate non-secret checkpoint policy, never an authentication store.

## 2. Verified Git preflight

| Field | Entry observation |
|---|---|
| Exact root | `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` |
| Extension | `Sh_Project_Setup_extension` |
| Branch | `feature/sh-project-setup-extension-clean` |
| HEAD, configured upstream SHA and live branch tip | `b04d0d49005e9a0aa44b207e6008a92d82d10a14` |
| Upstream | `origin/feature/sh-project-setup-extension-clean` |
| All origin fetch/push URLs | `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| Complete initial staged / unstaged / untracked inventory | Empty / empty / empty |
| Ignored inventory | Only `.idea/workspace.xml`; preserved without opening, hashing, editing, deleting or staging |
| Complete linked-worktree inventory | Current clean checkout at `b04d0d4`; `/home/https_ali_muhammed/Plementus/Tools` on `feature/sh-project-setup-extension` at `390c9ea7c311f362ea04aad64ed14569161642ec` |
| Tracked baseline | 217 tracked files; byte hashes and index snapshot outside the repository |

Commands: `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse HEAD`, `git remote -v`, `git remote get-url --all origin`, `git remote get-url --push --all origin`, upstream name/SHA, `git status --porcelain=v1 --untracked-files=all`, ignored status, `git ls-files --stage`, `git worktree list --porcelain`, and `git ls-remote`. A repeated public-tip query used `GIT_TERMINAL_PROMPT=0 GIT_ASKPASS=/bin/false git -c credential.helper= ls-remote --exit-code` against the exact origin and feature ref. No mismatch or unexpected change was found. No clone, switch, fetch, reset, stash, merge, staging, commit or push.

## 3. Evidence labels and research boundary

**OFFICIAL:** capability or endpoint permission established by public GitHub/Chrome documentation. **PROPOSED:** this packet's design/control recommendation, requiring approval. **UNVERIFIED:** extension, backend, organization, account or live-provider behavior not exercised. Official capabilities do not prove this extension can use them under current policy.

The accepted 07.01 source register is the baseline. Section 10 records targeted reverification of material flow, lifetime, callback and endpoint claims, and three additional REST references. Sources not re-opened retain 07.01's retrieval provenance; none imply account access. Only public documentation and read-only Git queries were contacted. No login, authorization URL, token endpoint, authenticated provider API, account settings or private repository was accessed.

## 4. Three realistic directions

| Direction | Usability | Implementation complexity | Operational cost and availability | Security and policy fit | Outcome |
|---|---|---|---|---|---|
| **A — GitHub App user authorization with backend** | Familiar browser consent; installation and individual authorization require separate explanations | Highest: confidential exchange, request/session authentication, tenant isolation, callback and backend operations | Hosting, TLS/domain, secret management, patching, monitoring and incident staffing; amount/budget UNDECIDED, no quote or purchase. Backend outage blocks authenticated reads | Granular repository grants and user attribution; adds backend compromise and session theft risk. Requires no-backend exception **and** explicit credential/session rules | Conditional candidate for private read discovery; neither selected nor authorized |
| **B — Preserve no-backend and existing credential restrictions** | Public-only discovery or labeled mocks; operator handles private tasks in GitHub | Lowest for mocks; public networking still needs scoped permission/error/privacy work | No new service; public service/rate-limit availability remains external | Avoids new credential custody. Public data cannot prove the operator's identity, membership or private access | Safe fallback for separately authorized limited work; does **not** meet private authentication or final project creation |
| **C — Device flow or separately approved alternative** | Code entry, GitHub verification page and waiting; less natural for a browser extension | Medium/high: bounded polling, denial/expiry/cancel, identity checks, token custody and MV3 interruption | No protocol-required confidential exchange backend for device flow; client lifecycle/security support still costs effort | No client secret in documented device grant; bearer tokens still exist. Phishing, approval of another device's code, wrong-account and lost-worker risks need affirmative review | Technically consider after policy change; not an approved shortcut. PAT entry remains prohibited |

### A. Browser authorization with a separately approved backend

**OFFICIAL:** GitHub App user authorization is distinct from installation. Each operator authorizes the app; organization installation/repository access does not consent on every member's behalf. User access is limited by both user and app access. Organization restrictions can reserve installation to owners. Repository access can be selected and later changed or suspended. [App user authority](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user), [organization installation controls](https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/limiting-oauth-app-and-github-app-access-requests-and-installations), [installation management](https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps).

The documented web exchange requires a client secret; S256 PKCE does not remove it. **Inference under project policy:** a confidential backend is necessary for this candidate because the extension must not ship that secret. No App private key or installation token is needed for the proposed user-token exchange/read routes; neither is proposed for this initial scope. [User token generation](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app), [GitHub App security guidance](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app).

**PROPOSED flow, only if decisions 01–12 are resolved:**

1. An explained operator action starts one authentication attempt. The extension holds an unpredictable initiation proof only in memory; the backend binds its challenge to a bounded transaction, approved callback/client and intended extension context. Starting a transaction grants no data access.
2. The backend owns random single-use state and S256 verifier, sends the user to GitHub consent, and receives the code at its exact HTTPS callback. It validates state/PKCE/issuer/client/expiry once and performs the confidential exchange. It rejects duplicate/malformed parameters, replay and unsolicited callbacks.
3. Before creating a session, the backend calls the approved identity/access reads and checks the permitted operator, organization, installation and repository intersection. It asks the operator to confirm the returned GitHub account and selected target; an unexpected account stops the attempt.
4. The backend completes Chrome's redirect using only a non-authorizing transaction reference/status. The extension proves possession of its initiation secret over HTTPS to obtain a short-lived session credential in a response body. No provider token, session bearer, OAuth code or verifier appears in the final extension URL. Transaction IDs alone cannot redeem a session. The handoff protocol still needs detailed security review and mocked/live evidence.
5. Each data request presents the approved session credential. The backend verifies session expiry, operator status, tenant/installation/repository binding and current provider access, and dispatches only an allowlisted read. User-controlled URLs, verbs, installation IDs, repository IDs and pagination links never confer authority. Loss of the extension attempt/session or backend process requires fresh login; no automatic authentication recovery.

This initiation proof and session bearer are sensitive credentials requiring decisions 04/06, even if all GitHub tokens stay on the server. An extension ID, client ID, Origin/CORS header or installation callback parameter is not user authentication. A public extension can be copied or spoofed; the design must rely on approved operator identity, proof of the initiating transaction and server authorization. Cryptographic attestation of the official extension is **UNVERIFIED**; the owner/security reviewer must accept the residual risk or reject this candidate.

**Backend responsibilities:** the owner must assign an accountable operator and deputy, deployment account/domain/TLS ownership, hosting location/data exposure, budget, availability/support expectations, secret rotation, dependency patching, monitoring, backup exclusions and incident response. No provider, host, jurisdiction or monetary commitment is selected. An outage stops reads and leads to an honest manual fallback; it does not redirect secrets into extension storage. Proxy/cache/access logs, tracing, error reporting and crash dumps must exclude credentials and private responses. Read payloads should be minimized and uncached; any retention needs its own approved duration.

**PROPOSED custody/lifecycle for review:** use expiring user access tokens, keep them only in backend process memory for the active session, discard returned refresh material, and require a fresh user-initiated authorization after expiry or process loss; GitHub may reuse an existing grant without showing consent again. Retain only the App client secret in an approved server secret manager with named access/rotation controls. No provider credentials or private read responses persist in the extension, journal, logs, backups or telemetry. This still changes existing prohibitions and is **not permitted yet**. If renewal or durable token custody is requested later, obtain a revised decision specifying storage, encryption/key custody, duration, deletion, breach response and rotation races before implementing it.

**OFFICIAL lifecycle:** for expiring App user tokens, access lasts eight hours and refresh lasts six months; refresh replaces both old tokens. Expiration is enabled unless opted out; device-origin refresh has a client-secret exception. These provider lifetimes do not approve keeping a credential for that long. [Refreshing user tokens](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens).

**PROPOSED local limits for approval, not effective policy:** transaction at most five minutes; session at most one hour absolute and fifteen minutes idle, always bounded by provider expiry. No silent renewal or persistent refresh. Proposed backend controls must rate-limit transaction creation, proof redemption and authenticated requests without revealing account or tenant existence. Backend shutdown/logout clears active material; incomplete attempts expire. Provider-side revocation and local deletion are distinct: expired/revoked tokens cease working, and revoking a user grant invalidates its associated tokens. [Expiration and revocation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation). The reviewer must assess provider-side revocation for issued-but-unused tokens after lost exchanges or crashes; discarding local memory does not revoke a GitHub grant. If these controls or limits are rejected, record replacement values and review the design again.

### Exact Chrome identity, redirect and network boundary for A

**OFFICIAL:** `chrome.identity.launchWebAuthFlow` supports non-Google authorization. `getRedirectURL(path)` generates `https://<app-id>.chromiumapp.org/*`; the API requires `identity`. Chrome's broad interception pattern does not validate the application's chosen path. [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/api/identity).

**PROPOSED topology:** GitHub → exact backend callback → exact extension return from `chrome.identity.getRedirectURL('github-auth')`. These are two different URLs. The backend callback is registered with GitHub; the generated extension URL is an allowlisted backend return. Reject arbitrary `return_to`, alternate schemes/hosts/paths, unexpected query/fragment fields and stale state. Disable GitHub callback wildcard matching. Installation setup URLs are not user authorization callbacks. A direct GitHub → extension callback would be a different topology requiring a new review; it is not silently interchangeable. [GitHub callback rules](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-user-authorization-callback-url).

The owner must approve stable development/production extension IDs, isolated registrations, supported Chrome version, unpacked/internal/store distribution and update ownership before deriving real callback values. No actual IDs, backend origin or callback are configured. No `identity.email`, Google `getAuthToken`, profile identity, cookie-reading or content-script permissions are proposed for GitHub identity. Candidate A needs `identity` and approved host access for the specific backend origin; direct API host access is unnecessary in the proposed proxy topology. GitHub consent navigation is distinct from extension `fetch` host permission.

Extension cross-origin fetch requires approved host permissions; content scripts retain their page-origin limits. Origin host patterns do not restrict routes: the backend must enforce route authorization. Candidate B public reads would need `https://api.github.com/*`; C device exchange would additionally need `https://github.com/*` if issued by the extension. These are proposed patterns only; request optional host access after user action where feasible and never `<all_urls>`. Provider CORS, redirects and actual permission prompts remain **UNVERIFIED**. [Chrome networking](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests).

MV3 worker globals can vanish. Chrome 116's auth-prompt lifetime accommodation is not a persistence guarantee. Pending attempts, initiation proofs and volatile sessions must fail closed on worker loss; do not persist them to resume. The exact supported-version decision and termination/cancellation behavior require verification. [Worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle).

### B. Retain current architecture and credential restrictions

**OFFICIAL:** public repository metadata and branch endpoints permit unauthenticated public-resource reads. These are discovery capabilities, not authentication. [Repository metadata](https://docs.github.com/en/rest/repos/repos#get-a-repository), [branches](https://docs.github.com/en/rest/branches/branches#list-branches).

**PROPOSED fallback:** keep existing offline work; a later, separately authorized scope could build labeled mock GitHub discovery, or narrow public-only GET requests without credential collection. Public discovery still needs origin consent, input/response validation, safe rendering, pagination/redirect bounds, rate-limit handling and review of disclosed query/target data. This task implements neither. Never reuse GitHub website cookies, scrape a signed-in page/session or invent a secretless browser-code flow.

With restrictions unchanged, private repository reads, authenticated user/organization verification, token renewal and automated private project/repository creation remain impossible for this connector. Mock results stay **SIMULATED**; public results say **PUBLIC / UNAUTHENTICATED**, never “connected” or “private access verified.” The operator may complete private work manually in GitHub under their own authority; the extension must not claim it performed or verified those actions. B cannot satisfy the final project-creation objective or close B-02/D-04 by itself.

### C. Device authorization or another explicitly reviewed alternative

**OFFICIAL:** GitHub documents device authorization using client ID, device code and the device grant without a client secret, after enabling the flow. Returned interval/deadline govern polling; `slow_down` increases the interval. [Device grant](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app#using-the-device-flow-to-generate-a-user-access-token).

**Inference:** the protocol can operate without a confidential exchange backend. It does **not** meet current no-token-handling/storage rules. The extension would receive bearer credentials and potentially refresh material. GitHub cautions against enabling device flow without a reason because attackers can trick people into authorizing another device. A browser extension already has a browser; justify suitability explicitly. [GitHub security guidance](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app).

**PROPOSED controls if separately chosen:** initiate only from an explained action, show the official verification origin and locally issued user code, never request passwords/MFA; bind one local attempt to resulting `GET /user` identity and selected installation/repositories. Do not claim redirect/state/PKCE callback protection for device polling. Observe returned polling bounds, denial and expiry; cancel on user action, worker loss or account mismatch, discard late results and require a fresh action. Define issued-but-undelivered token revocation and incident handling. Polling and storage/lifetime design remain unimplemented and **UNVERIFIED**; no automatic resume via the journal.

A fine-grained PAT is another manually created bearer credential, not an automatic substitute: entry/clipboard collection directly conflicts with the current prohibition. No PAT prompt, reuse of `gh` credentials, App private key or website cookie is authorized. An OAuth App browser flow also retains its documented secret requirement under the 07.01 baseline. Any alternative needs a new explicit method and custody review; no undocumented “secretless authenticated” flow is proposed.

## 5. Proposed minimum future read surface

The following are **OFFICIAL endpoint permission claims**, reverified in public documentation on 2026-11-02. All rows propose GitHub App **user access tokens**, not installation tokens. They are a candidate allowlist, not permission to call them. Organization membership/administration discovery beyond this surface belongs to a separately approved Phase 08 scope.

| Proposed endpoint | Purpose | Verified fine-grained permission | Source / implementation limit |
|---|---|---|---|
| `GET /user` | Bind durable operator ID and display login | App user token supported; no additional fine-grained permission | [Authenticated user](https://docs.github.com/en/rest/users/users#get-the-authenticated-user). No private email/profile access proposed; installation token cannot establish human identity |
| `GET /user/installations` | Find this app's installations accessible to that user | App user token; no additional fine-grained permission | [User installations](https://docs.github.com/en/rest/apps/installations#list-app-installations-accessible-to-the-user-access-token). Not proof of organization membership or admin authority |
| `GET /user/installations/{installation_id}/repositories` | Selected installation's user-accessible repositories and returned access flags | **Metadata: read** repository permission | [User-accessible repositories](https://docs.github.com/en/rest/apps/installations#list-repositories-accessible-to-the-user-access-token). Backend binds installation/tenant before listing; no arbitrary cross-tenant discovery |
| `GET /repos/{owner}/{repo}` | Selected repository identity, visibility and default branch | **Metadata: read** repository permission | [Get repository](https://docs.github.com/en/rest/repos/repos#get-a-repository). Actual response fields and policy suitability remain untested |
| `GET /repos/{owner}/{repo}/branches` | Branch names/current commit references | **Contents: read** repository permission | [List branches](https://docs.github.com/en/rest/branches/branches#list-branches). Pagination bounded; does not verify Odoo.sh environment/database |

**PROPOSED registration baseline:** selected repositories; Metadata read and Contents read only; no write, organization Members, Administration, email, Actions, workflow or installation-token permissions. Identity/install discovery requires authentication even where no extra fine-grained grant is listed. If branch reading is deferred, reconsider whether Contents read is needed. Contents read also exposes repository source to a stolen token; a route-limited UI/proxy cannot shrink that provider grant. The owner/security reviewer must accept that residual exposure or remove branch reads.

Actual org policy, SSO, operator eligibility, repository selection, installation approval, API version, pagination fields, permission changes and response access flags remain **UNVERIFIED**. Listing an accessible installation/repository does not establish organization membership, repository admin status or authority to create repositories. Do not claim Metadata read supports a future membership endpoint. No generic proxy, content download, mutation or extra endpoint is implied. Auth/session control POSTs, if later authorized, are distinct from this GET-only GitHub resource surface.

## 6. Individually reviewable owner/security decision register

Each item has current status **PENDING**. Proposed values are for approval or rejection, not active policy. No person, signature or approval evidence is supplied. Project owner and security reviewer are roles only; their actual identities and authority must be verified before recording decisions. An organization administrator/backend operator must separately consent where applicable.

### 01 — Authentication direction — PENDING

- **Proposed decision:** consider A, GitHub App user authorization with backend, for future private reads; retain B until all approvals exist. Reject or explicitly choose C if A cannot be authorized. No current selection.
- **Security rationale:** granular user/app intersection fits operator-driven reads better than independent installation authority.
- **Risks/dependencies:** backend/session compromise; all remaining items; choosing B leaves the product objective incomplete.
- **Exact approval needed:** project owner records approve/reject A/B/C and allowed capability; security reviewer records concurrence/rejection and residual risks. A recommendation alone is insufficient.

### 02 — External backend scope exception — PENDING

- **Proposed decision:** permit only a bounded authentication/session/read proxy if A is chosen; no workflow executor or provider writes.
- **Security rationale:** confidential code exchange keeps the App client secret out of the public extension.
- **Risks/dependencies:** exception to master-plan/ADR-001 architecture; new service/data trust boundary, outage and vendor exposure.
- **Exact approval needed:** owner explicitly approves or rejects the no-backend exception and its boundaries; security reviewer approves the trust/data-flow model. Later authorized amendments to protected architecture/security records are required; this packet changes neither.

### 03 — Backend ownership and operations — PENDING

- **Proposed decision:** assign accountable owner/operator and deputy, hosting/deployment/domain accounts, region/data controls, funding, patching/rotation/monitoring duties and availability/manual-handoff expectations before any deployment.
- **Security rationale:** credential custody requires staffed operational and incident accountability.
- **Risks/dependencies:** unowned service, recurring cost, neglected secrets or outages; no operator/vendor/budget is currently supplied.
- **Exact approval needed:** owner names authorized operators and spending/deployment limits; operators accept duties; security reviewer approves hosting/access/incident controls. Unfilled responsibilities block A.

### 04 — Transient OAuth/code/PKCE/token handling — PENDING

- **Proposed decision:** permit only bounded in-memory state/verifiers/codes and backend user tokens for A; initiation proof/session bearer in extension memory; five-minute attempt limit. Device codes/tokens require a separate C-specific decision. Never journal, log, screenshot, export or auto-resume auth material.
- **Security rationale:** short-lived material is still authorization material; explicit handling prevents a memory-only policy bypass.
- **Risks/dependencies:** interception, process inspection, crash remnants, late issuance and worker loss; numeric limits and deletion are proposed, not approved.
- **Exact approval needed:** owner/security explicitly approve each material, handler/location, maximum lifetime, cancellation/deletion behavior and interruption response, including whether transient handling is permitted at all.

### 05 — Provider credential storage — PENDING

- **Proposed decision:** no durable user/refresh tokens; backend volatile access token only through its approved active session, refresh discarded; App client secret only in an approved server secret manager with restricted identities/rotation. No private key, installation token or extension provider-token store.
- **Security rationale:** minimize retained bearer authority and avoid granting app-wide installation authority.
- **Risks/dependencies:** server memory remains storage/custody; backups/dumps/telemetry can leak; local deletion does not revoke provider tokens. A needs the client secret across deployments.
- **Exact approval needed:** owner/security approve or reject credential classes, exact storage systems, retention/deletion/backup exclusions, encryption/key custody, access/rotation and incident controls. Any durable refresh/access proposal needs a separately revised item, not implied permission.

### 06 — Backend session cookies or bearer credentials — PENDING

- **Proposed decision:** initial A candidate uses a per-operator, tenant-bound opaque bearer held only in extension memory; one-hour absolute/fifteen-minute idle maximum, capped by provider expiry; server invalidation on logout. Do not adopt session cookies for this candidate without a new cookie/CSRF/SameSite review.
- **Security rationale:** backend requests need authenticated authorization even when provider tokens never leave it.
- **Risks/dependencies:** bearer theft/replay and spoofable public client; initiation-proof handoff, TLS, request validation, account binding and revocation evidence. Cookies are not exempt credentials.
- **Exact approval needed:** owner/security explicitly approve bearer vs cookie, issuance/authentication protocol, transport/storage/expiry/revocation, browser-profile assumptions and residual client-spoofing risk; approve or replace the proposed limits.

### 07 — Organization, operator and repository restrictions — PENDING

- **Proposed decision:** allow only owner-designated operator IDs, organization IDs, installation and selected-repository IDs; deny other tenants/accounts and fail closed when access changes. Use user authority for each read.
- **Security rationale:** prevent wrong-account, cross-tenant and confused-deputy access; names/login hints alone are insufficient.
- **Risks/dependencies:** actual IDs, org policies/SSO and outside-collaborator eligibility are unsupplied/unverified; copied extension cannot prove official-client origin.
- **Exact approval needed:** owner designates allowed identities/targets and onboarding/offboarding rules; org authority approves selected installation scope; security reviewer approves enforcement/recheck and anti-enumeration boundaries. No GitHub access is asserted.

### 08 — Read endpoints and permissions — PENDING

- **Proposed decision:** approve only the five GET endpoints in section 5 and Metadata read/Contents read on selected repositories, or remove branch reads to reconsider Contents. Deny arbitrary proxying and provider writes.
- **Security rationale:** tie each permission to a concrete read; avoid broad OAuth repo scopes or assumed Members/admin grants.
- **Risks/dependencies:** Contents grant has wider source-read exposure than branch route; actual response/permission behavior untested; pagination and redirects can escape naive allowlists.
- **Exact approval needed:** owner/security approve the exact endpoint/permission matrix and residual source exposure; separately review any additional Phase 08 endpoint/organization permission. No permission is configured now.

### 09 — Registration, installation approval and callback ownership — PENDING

- **Proposed decision:** owner-designated app owner controls registration/client secret; authorized org administrator approves selected-repo installation; backend operator owns exact TLS callback and return allowlist. Separate dev/production registrations; wildcard callbacks disabled. Individual users consent separately.
- **Security rationale:** distinguish app ownership, organization installation, user authority and callback control.
- **Risks/dependencies:** malicious registration/return URL, domain takeover, wrong install target, changes in org policy; all real values remain unverified.
- **Exact approval needed:** owner/org authority/security approve app ownership, who may register/install/change permissions, callback/return values and rotation/transfer procedure before any external configuration.

### 10 — Chrome identity, permissions and distribution — PENDING

- **Proposed decision:** stable separate dev/production IDs and selected Chrome baseline; A uses identity plus a specific approved backend host, no broad host/cookie/profile access; optional host consent where feasible. Exact generated extension return follows section 4.
- **Security rationale:** bind return to intended extension and minimize cross-origin privileges.
- **Risks/dependencies:** unpacked ID drift, distribution/update compromise, worker termination, unverified redirects/host prompts/CORS; no actual deployment identity supplied.
- **Exact approval needed:** owner/security approve IDs, minimum browser version, distribution/update ownership, exact permissions/hosts and callback derivation. Manifest or store changes require separate authorization.

### 11 — Logout, revocation, incidents and manual fallback — PENDING

- **Proposed decision:** stop requests/cancel attempts, invalidate backend session and clear transient material on logout; offer explicit provider grant revocation separately. Owner/organization authority handles compromised grants/installations; named operator handles backend secret rotation. Unconfirmed revocation stays UNVERIFIED; private work falls back to manual GitHub actions.
- **Security rationale:** local sign-out is not global provider revocation; containment needs accountable roles.
- **Risks/dependencies:** lost responses/crashes may leave provider-issued credentials valid; uninstall/suspension and user-grant revocation have different scopes. Incident contacts/channels are unsupplied.
- **Exact approval needed:** owner/security assign verified incident/revocation owners, notification route, bounded response expectations, evidence/deletion controls and authorized manual procedures; separately authorize any actual revocation/configuration. No automatic contacting or credential change is approved.

### 12 — Future sandbox and security-verification boundaries — PENDING

- **Proposed decision:** permit later mocked connector work only under explicit file scope; isolate any separately authorized live read sandbox to disposable approved repositories/accounts. Test no production/customer data or writes. Preserve all evidence tiers and Phase 04/06 gates.
- **Security rationale:** separate official capability, synthetic behavior and real provider acceptance; prevent expanding read consent into repository creation.
- **Risks/dependencies:** sandbox org/repositories, consent, cost, expected denials and cleanup plan are absent; mocks cannot prove live behavior.
- **Exact approval needed:** owner/security approve test identities/targets, operations, evidence redaction, stop/cleanup/revocation rules and residual risks; issue separate registration/auth/live-read authorization. Writes require their own later operation-specific authorization.

**How to record a decision later:** for each ID record approve/reject/revise, exact values/limits, project-owner authority and decision evidence/date, security-reviewer authority and evidence/date, conditions and unresolved dependencies. Record actual evidence only; no blank signature is a decision. A partial response leaves the other items PENDING. Do not close D-04/B-02 until a coherent approved design and required closure evidence exist. Approval of documentation quality alone does not approve an option, amend protected policy or authorize 07.03.

## 7. Recommended candidate and safe fallback

**Recommendation for consideration only:** A with GitHub App user authority, selected-repository reads, confidential backend exchange, volatile user-token custody and a separately approved volatile backend session. Prefer reauthentication over retaining refresh tokens for the initial read-only scope. This remains conditional on all owner/security items, accepted policy amendments, design verification and explicit implementation authority. No current approval is recorded.

If the owner permits the backend **and** approves coherent code/token/client-secret/session handling, a separately authorized connector could authenticate an approved operator and read permitted private repositories/branches through that backend. This would not create a repository, prove organization admin rights, configure Odoo.sh, copy databases or resolve Phase 04/06 runtime security.

**Fallback:** B, preserving existing restrictions and manual private workflows. Separately authorized mock/public-only work may be possible; private authenticated reads and the final private project-creation automation remain blocked. If the owner rejects the backend but permits token handling, C can receive its own security review; that conditional possibility is not a selection or approval now.

## 8. Evidence and controls required before Phase 07.03

| Entry gate | Required record/control/evidence | Current disposition |
|---|---|---|
| Independent review and explicit decisions | Independent ChatGPT review; per-item owner/security decisions with actual authority evidence, coherent method and conditions | **PENDING** |
| Architecture/security consistency | Separately authorized approved amendments for backend and credential/session handling, reconciled to master/ADR/security/contracts as necessary; never override them by inference | **NOT AUTHORIZED in this task** |
| Explicit 07.03 scope | Fresh implementation authorization, exact file allowlist and mocked-only vs live scope; protected v1 provider/coordinator contract changes separately scoped | **NOT_STARTED / NOT_AUTHORIZED** |
| Bounded security design | Transaction/state/S256, initiation-proof handoff/session authentication; account/tenant/repository binding, exact callback/host routes, no arbitrary proxy, write denial, lifecycle/logout/incident ownership | **PROPOSED / UNVERIFIED** |
| Test specification | Mock denial/cancel/replay/malformed callback, wrong-account/cross-tenant, spoofed caller, worker loss/late issuance, expiry/revocation, response validation, 401/403/404/429, network failure, pagination/redirect leakage and redaction; renewal races only if refresh separately approved | **NOT IMPLEMENTED / NOT RUN** |
| Compatibility and real access | Recheck chosen official flow/permissions. Before live use, separately approve app registration, callbacks, installation, auth/consent, sandbox identities and security verification. If no live authorization exists, 07.03 must be explicitly limited to mocks with runtime behavior UNVERIFIED | **No registration/access authorized or verified** |
| Existing blocked gates | No SEC-01 credential storage, recovery bypass or runtime connection to synthetic approval authority. Any offline sequencing exception must be explicit; production remains NO_GO | Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED / NOT ACCEPTED** |

**Why future writes are separate:** these read grants/routes do not authorize repository creation, branch writes, Gitlinks, deploy keys or any customer operation. Later phases need endpoint-specific permission research, approved sandbox/write scope, a target/effect preview, authenticated operator approval and reconciliation/incident controls. Organization creation/admin authority must never be inferred from a successful read or an installation. Existing simulated approval references remain `executionAuthorized: false` and cannot confer provider authority.

## 9. Documentation scope and verification

Exactly seven repository-relative documentation paths change:

| Change | Path |
|---|---|
| New | `Sh_Project_Setup_extension/docs/Phases/phase07/PHASE_07_02.md` |
| Modified | `Sh_Project_Setup_extension/docs/Phases/phase07/PHASE_07.md` |
| Modified | `Sh_Project_Setup_extension/docs/00_PROJECT_STATUS.md` |
| Modified | `Sh_Project_Setup_extension/docs/03_CHANGELOG.md` |
| Modified | `Sh_Project_Setup_extension/docs/04_TEST_EVIDENCE.md` |
| Modified | `Sh_Project_Setup_extension/docs/05_BLOCKERS_AND_DECISIONS.md` |
| Modified | `Sh_Project_Setup_extension/docs/06_HANDOFF.md` |

[Measured verification](../../04_TEST_EVIDENCE.md#phase-0702--documentation-only-evidence-2026-11-02-africacairo) records actual outcomes. Git/Python assertions cover exact scope/index/inventory, protected bytes, master/source equality, 07.01/history preservation, local link file/fragment targets, source URLs and permission claims, new-text secret patterns, whitespace/final newline and unchanged blocked gates. Evidence/checker baseline: `/tmp/phase0702-review-iw_psgck/`, outside the repository. Secret scanning has pattern limits; no credentials/private provider values were collected or pasted.

Application, browser, authentication, authenticated-provider, backend and operational security tests: **NOT RUN**. No app registration, consent, credential prompt, provider API session, backend creation, external account configuration or policy change. No code, manifest/permissions, tests, fixtures, dependencies, Phase 06, Phase 04/SEC-01 or protected plan/source/security/contracts changes. No staging, commit or push.

Skills applied: Superpowers using-superpowers, brainstorming assessment principles and verification-before-completion; stop-slop. Ponytail full-mode constraints applied. Tools: shell/Git/Python through `functions.exec` and `web.run` for public official documentation. No GitHub account connector, browser automation, subagent, WarpGrep or Valyu; the latter two were unavailable in the tool inventory.

## 10. Official source register and claim provenance

Baseline: [07.01 official source register](PHASE_07_01.md#official-source-register). The following public pages were successfully re-opened **2026-11-02 (Africa/Cairo)** for material decisions; endpoint pages R01–R03 supplement the baseline. Retrieval confirms documentation, not registered callbacks, actual permissions or runtime behavior. A guessed permissions-guide URL was inaccessible and is not used as evidence; endpoint-specific permission sections below support the matrix instead.

| Baseline / new ID | Official source | Claim checked |
|---|---|---|
| G04 | [App on behalf of a user](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/authenticating-with-a-github-app-on-behalf-of-a-user) | User consent separate from installation; intersection of user/app access |
| G05 | [Generate App user token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/generating-a-user-access-token-for-a-github-app) | Web secret/S256/state; documented device grant and polling |
| G06 | [Refresh user token](https://docs.github.com/en/apps/creating-github-apps/authenticating-with-a-github-app/refreshing-user-access-tokens) | Expiration/default settings, rotation and device-secret exception |
| G09 | [App security practices](https://docs.github.com/en/apps/creating-github-apps/about-creating-github-apps/best-practices-for-creating-a-github-app) | Public-client spoofing/secret limitation and device phishing |
| G13 | [Organization installation restrictions](https://docs.github.com/en/organizations/managing-programmatic-access-to-your-organization/limiting-oauth-app-and-github-app-access-requests-and-installations) | Owner controls installation approvals |
| G14 | [Manage installed Apps](https://docs.github.com/en/apps/using-github-apps/reviewing-and-modifying-installed-github-apps) | Selected repositories, suspension/uninstall and separate authorization |
| G15 | [Expiration/revocation](https://docs.github.com/en/authentication/keeping-your-account-and-data-secure/token-expiration-and-revocation) | Expired/revoked credentials cease working; local logout is not revocation |
| G16 | [Authorization callback](https://docs.github.com/en/apps/creating-github-apps/registering-a-github-app/about-the-user-authorization-callback-url) | Exact matching with wildcard disabled; callback vs setup URL |
| G17 | [Get authenticated user](https://docs.github.com/en/rest/users/users#get-the-authenticated-user) | App user token, no extra fine-grained permission |
| G18 | [List branches](https://docs.github.com/en/rest/branches/branches#list-branches) | Contents read; public unauthenticated resource option |
| C01 | [Chrome Identity API](https://developer.chrome.com/docs/extensions/reference/api/identity) | identity permission, non-Google flow, generated return URL |
| C02 | [Worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Volatile state, termination and Chrome 116 auth-prompt behavior |
| C04 | [Cross-origin networking](https://developer.chrome.com/docs/extensions/develop/concepts/network-requests) | Host permission boundary and content-script restrictions |
| R01 | [User installations](https://docs.github.com/en/rest/apps/installations#list-app-installations-accessible-to-the-user-access-token) | App user token; no additional fine-grained permission |
| R02 | [User installation repositories](https://docs.github.com/en/rest/apps/installations#list-repositories-accessible-to-the-user-access-token) | App user token, Metadata read, returned repository access flags |
| R03 | [Get repository](https://docs.github.com/en/rest/repos/repos#get-a-repository) | Metadata read; public unauthenticated resource option |

Sources from 07.01 not listed here were not re-retrieved. In particular PAT limitations/OAuth alternatives remain baseline analysis, not fresh endpoint verification or approval. No new permission claim relies on a failed URL or an authenticated response.

**NEXT: STOP FOR INDEPENDENT CHATGPT REVIEW AND OWNER/SECURITY DECISION. D-04/B-02 OPEN; 07.03 NOT_STARTED / NOT_AUTHORIZED; production NO_GO. No commit or push.**
