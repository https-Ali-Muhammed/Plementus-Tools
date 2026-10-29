# Security and secrets requirements

Status: SEC-01 checkpoint policy and [Option B retention amendment](Phases/PHASE_04_SEC01_RETENTION_AMENDMENT_B.md) are owner-approved; disconnected cleanup and isolated browser verification are accepted within their bounded scopes, while production implementation is NOT VERIFIED. CP1–CP4 are ACCEPTED within their documented scope; production runtime security and device verification are NOT RUN. Clock Option B is OWNER_APPROVED_AS_DIRECTION_ONLY. Its operational policy is incomplete; the [manual-resolution decision](Phases/PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md) is OWNER_DECISION_REQUIRED and the retention conflict is UNRESOLVED. Activation is NO_GO. Other controls remain proposed. Source: [SEC-01](Phases/PHASE_04_SEC01_APPROVED_POLICY.md), [master plan](01_MASTER_PLAN.md), and [architecture](02_ARCHITECTURE_DECISIONS.md).

## Permissions, origin and isolation

Request only necessary MV3 permissions and explicitly selected site origins; prefer optional, user-consented access where feasible. Avoid blanket `<all_urls>` and remote executable code absent a documented, separately accepted exception. Check scheme, exact origin, tab, active account and environment before each operation; stop on navigation or target change. Isolate content scripts and adapters by origin, validate messages and all site/API input at the trust boundary, and prevent untrusted page text from becoming executable content. Exact host patterns, permission lifecycle and multi-account isolation remain OPEN / UNVERIFIED.

## Authentication and sensitive data

The operator signs in through the provider's official flow and handles MFA and CAPTCHA. Never capture, store or log passwords, MFA codes, CAPTCHA solutions, private keys, cookies, access tokens or customer credentials. Never embed client secrets in extension assets. The user-specified no-token-storage rule applies to every provider and storage location. GitHub authentication that can satisfy these rules is **OPEN / OWNER DECISION REQUIRED**; this document does not approve a workaround.

Treat subscription references, customer identifiers, database names/users, URLs and form data as sensitive. SEC-01 permits only six sanitized checkpoint fields plus immutable `createdAt`, device/profile-local storage, seven-day non-renewable logical expiry, and no export, sync, screenshots, raw errors, or telemetry. Under owner-approved [Option B](Phases/PHASE_04_SEC01_RETENTION_AMENDMENT_B.md), expired records may not be used; if Chrome is closed at expiry, physical persistence beyond seven days is permitted solely until the next available execution and cleanup attempt. Cleanup must run before checkpoint-dependent operations and fail closed on error/conflict. The disconnected cleanup gate has bounded synthetic and isolated-browser evidence, but production startup/access integration is not implemented or verified. Clock rollback across restarts remains unresolved. Disk encryption, screen lock, protected profile, incident contacts, notification route, real operator authorization and runtime access verification remain required before activation. The historical [CP4 review](Phases/PHASE_04_SEC01_CP4_READINESS_REVIEW.md) assessed the original deadline. A public deploy key is not a private key; verify it is public before an operator-approved handoff.

The [cleanup and clock-safety design](Phases/PHASE_04_SEC01_CLEANUP_CLOCK_DESIGN.md) remains a design record; the disconnected gate and isolated-browser cleanup checks are accepted within their scopes. The seven persisted fields cannot establish trusted elapsed time after restart. A backward jump can extend apparent eligibility; a forward jump can cause early deletion. The owner chose fail-closed Clock B as direction only; the [manual-resolution package](Phases/PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md) recommends blocking use and uncertain expiry deletion pending authorized review. That hold can leave physical records beyond the next execution, so a separate owner decision, likely retention amendment and security review remain necessary. Manual approval or a clock reset cannot prove elapsed time. No runtime control, device prerequisite or exact seven-day elapsed-time guarantee is verified.

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
