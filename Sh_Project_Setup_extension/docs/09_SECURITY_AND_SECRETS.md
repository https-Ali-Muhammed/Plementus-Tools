# Security and secrets requirements

Status: SEC-01 checkpoint policy, [Option B retention](Phases/phase04/PHASE_04_SEC01_RETENTION_AMENDMENT_B.md), [combined A+B operational policy](Phases/phase04/PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md) and [uncertain-time retention amendment](Phases/phase04/PHASE_04_SEC01_UNCERTAIN_TIME_RETENTION_AMENDMENT.md) are OWNER_APPROVED. This is DOCUMENTATION_ONLY / IMPLEMENTATION_NOT_AUTHORIZED. CP1–CP4, disconnected cleanup and isolated browser verification are accepted within their bounded scopes; production runtime security and device verification are NOT RUN. Activation is NO_GO. Other controls remain proposed. Source: [SEC-01](Phases/phase04/PHASE_04_SEC01_APPROVED_POLICY.md), [master plan](01_MASTER_PLAN.md), and [architecture](02_ARCHITECTURE_DECISIONS.md).

## Permissions, origin and isolation

Request only necessary MV3 permissions and explicitly selected site origins; prefer optional, user-consented access where feasible. Avoid blanket `<all_urls>` and remote executable code absent a documented, separately accepted exception. Check scheme, exact origin, tab, active account and environment before each operation; stop on navigation or target change. Isolate content scripts and adapters by origin, validate messages and all site/API input at the trust boundary, and prevent untrusted page text from becoming executable content. Exact host patterns, permission lifecycle and multi-account isolation remain OPEN / UNVERIFIED.

## Authentication and sensitive data

The operator signs in through the provider's official flow and handles MFA and CAPTCHA. Never capture, store or log passwords, MFA codes, CAPTCHA solutions, private keys, cookies, access tokens or customer credentials. Never embed client secrets in extension assets. The user-specified no-token-storage rule applies to every provider and storage location. GitHub authentication that can satisfy these rules is **OPEN / OWNER DECISION REQUIRED**; this document does not approve a workaround.

Treat subscription references, customer identifiers, database names/users, URLs and form data as sensitive. SEC-01 permits only six sanitized checkpoint fields plus immutable `createdAt`, device/profile-local storage, seven-day non-renewable logical expiry, and no export, sync, screenshots, raw errors, or telemetry. Under owner-approved [Option B](Phases/phase04/PHASE_04_SEC01_RETENTION_AMENDMENT_B.md), expired records may not be used; if Chrome is closed at expiry, physical persistence beyond seven days is permitted solely until the next available execution and cleanup attempt. Cleanup must run before checkpoint-dependent operations and fail closed on error/conflict. The disconnected cleanup gate has bounded synthetic and isolated-browser evidence, but production startup/access integration is not implemented or verified. Clock rollback across restarts remains unresolved. Disk encryption, screen lock, protected profile, incident contacts, notification route, real operator authorization and runtime access verification remain required before activation. The historical [CP4 review](Phases/phase04/PHASE_04_SEC01_CP4_READINESS_REVIEW.md) assessed the original deadline. A public deploy key is not a private key; verify it is public before an operator-approved handoff.

The [cleanup and clock-safety design](Phases/phase04/PHASE_04_SEC01_CLEANUP_CLOCK_DESIGN.md) remains a design record; the disconnected gate and isolated-browser cleanup checks are accepted within their scopes. The seven persisted fields cannot establish trusted elapsed time after restart. A backward jump can extend apparent eligibility; a forward jump can cause early deletion. The approved [combined A+B policy](Phases/phase04/PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md) blocks uncertain use and requires case-specific project-owner approval for destructive disposition; no delegation is approved. The [uncertainty amendment](Phases/phase04/PHASE_04_SEC01_UNCERTAIN_TIME_RETENTION_AMENDMENT.md) permits exceptional blocked local hold with an outstanding-retention obligation and no guaranteed maximum. Manual approval or a clock reset cannot prove elapsed time. Exact detection criteria, real owner identity checks, worker/recovery integration, device controls, incident contacts/route, security review and synthetic/real-browser verification remain OPEN. No runtime control or exact seven-day elapsed-time guarantee is verified.

## Approvals, recovery and incidents

Show the intended account, origin, repository/environment and effect before any sensitive write. Require explicit approval for each targeted project/repository creation, branch or utility mutation, deploy-key authorization, Production install, Staging/database action and Plementus write. No blanket approval for future actions. Recheck target and permission after navigation or restart; fail closed if stale. Human login, MFA/CAPTCHA and unrecognized pages are manual checkpoints.

SEC-01 requires missing, corrupt, expired, stale, and uncertain checkpoints to fail closed. On timeout, worker suspension or tab loss after a possible write, enter `RECONCILE_REQUIRED` and inspect before any retry; never assume success or replay an uncertain mutation. Manual recovery requires operator reconciliation before safe continuation and must not disclose data.

For suspected exposure, stop affected actions, notify the owner through an authorized channel, preserve only safely redacted evidence, and follow provider/owner incident and credential-revocation procedures. Do not transmit secrets, delete evidence or change credentials without the necessary owner authorization. Incident roles, retention and reporting procedure remain OPEN.

## Threat and risk register

| Threat | Required control / response | Evidence status |
|---|---|---|
| Wrong origin, account or environment | Exact target checks, consent, fail closed and revalidate before write | UNVERIFIED |
| Credential or sensitive-data leak | Prohibit secret storage; minimize and redact inputs, logs, screenshots and exports | UNVERIFIED |
| Excessive permissions or cross-origin access | Least privilege, optional consent and isolated adapters | UNVERIFIED |
| Untrusted page data or injected scripts | Validate messages/input; avoid remote code and unsafe rendering | UNVERIFIED |
| Duplicate or uncertain writes after interruption | Explicit approval, bounded waits, reconciliation and manual fallback | UNVERIFIED |
| Compromised account/extension or accidental disclosure | Stop, owner-led incident response, sanitized evidence and authorized revocation | OPEN |
| Unverified site behavior or inappropriate automation | Fixture-first development; real-site acceptance only under authorized gates | UNVERIFIED |

Nothing here certifies security or browser permissions. See [integration contracts](08_INTEGRATION_CONTRACTS.md) and [feasibility](12_BROWSER_AUTOMATION_FEASIBILITY.md).


## Phase 07.01 GitHub assessment — proposed requirements only

2026-11-02 (Africa/Cairo). [Authentication comparison, threat model and official citations](Phases/phase07/PHASE_07_01.md) is **READY_FOR_REVIEW; not accepted**. **D-04 and B-02 remain OPEN / OWNER DECISION REQUIRED**. 07.02 and 07.03 remain **NOT_STARTED / NOT_AUTHORIZED**; production **NO_GO**.

The current authentication prohibition above is unchanged. No-token-storage applies to every location: memory/session storage or encryption is not an approved exception. Any future transient token/code/verifier handling, backend custody, refresh material or backend session credential requires an explicit owner/security decision. No plaintext token, OAuth client secret, App private key or reusable credential may be embedded in extension source/assets. A distributed extension cannot make a bundled secret confidential; PKCE is not evidence that GitHub waives its documented web-exchange secret requirement.

Conditional candidate for consideration only: GitHub App **user** authorization with a separately approved backend. This would require an explicit exception to the no-backend architecture and reviewed credential/session policy. It is not selection, owner approval or authorization to register/configure an app. Device flow and fine-grained PATs have documented capabilities but do not remove the current token-handling/storage blocker.

Proposed controls include exact redirect/state/S256 validation, issuer/client/transaction binding, authenticated GitHub identity and org/repository revalidation, tenant isolation, read-route/permission allowlists, cancellation/late-response handling, explicit logout vs revocation status and owner-led incident recovery. Installation authority cannot substitute for the operator's authority; existing simulated approval references cannot authorize real writes. Backend session credentials are also sensitive authorization material, even if GitHub tokens never reach the extension. These controls are not implemented or verified.

All existing SEC-01 fields, retention, uncertainty, cleanup, trusted-clock, operator/device/incident requirements and blocked production gates remain unchanged. Authentication material must never enter the non-secret checkpoint schema or its recovery paths. Any later writes, account validation, sandbox or provider session needs separate explicit scope. This documentation assessment initiated none. Application and browser tests **NOT RUN**. **STOP FOR INDEPENDENT CHATGPT REVIEW.**
