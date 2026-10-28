# Security and secrets requirements

Status: proposed controls for future implementation, not a security audit or an assertion that controls exist. Source: [master plan](01_MASTER_PLAN.md), [architecture](02_ARCHITECTURE_DECISIONS.md), and the current 00.03 instruction. Security verification: NOT RUN.

## Permissions, origin and isolation

Request only necessary MV3 permissions and explicitly selected site origins; prefer optional, user-consented access where feasible. Avoid blanket `<all_urls>` and remote executable code absent a documented, separately accepted exception. Check scheme, exact origin, tab, active account and environment before each operation; stop on navigation or target change. Isolate content scripts and adapters by origin, validate messages and all site/API input at the trust boundary, and prevent untrusted page text from becoming executable content. Exact host patterns, permission lifecycle and multi-account isolation remain OPEN / UNVERIFIED.

## Authentication and sensitive data

The operator signs in through the provider's official flow and handles MFA and CAPTCHA. Never capture, store or log passwords, MFA codes, CAPTCHA solutions, private keys, cookies, access tokens or customer credentials. Never embed client secrets in extension assets. The user-specified no-token-storage rule applies to every provider and storage location. GitHub authentication that can satisfy these rules is **OPEN / OWNER DECISION REQUIRED**; this document does not approve a workaround.

Treat subscription references, customer identifiers, database names/users, URLs and form data as sensitive. Collect the minimum needed for an authorized step, limit display, and exclude them from logs, screenshots, exports, error messages and the persisted journal unless a later owner-approved data policy permits specific non-secret metadata. Use only necessary sanitized, non-secret state and opaque references where justified. Encryption, retention, deletion, access, export and cleanup policy are **OPEN / OWNER DECISION REQUIRED**; do not infer permission to persist data. A public deploy key is not a private key; verify it is public before an operator-approved handoff.

## Approvals, recovery and incidents

Show the intended account, origin, repository/environment and effect before any sensitive write. Require explicit approval for each targeted project/repository creation, branch or utility mutation, deploy-key authorization, Production install, Staging/database action and Plementus write. No blanket approval for future actions. Recheck target and permission after navigation or restart; fail closed if stale. Human login, MFA/CAPTCHA and unrecognized pages are manual checkpoints.

Persist only allowed non-secret checkpoints. On timeout, worker suspension or tab loss after a possible write, enter `RECONCILE_REQUIRED` and inspect before any retry; never assume success or replay an uncertain mutation. Stop on account/origin mismatch, revoked permissions or unknown UI. Manual recovery must record uncertainty without disclosing data.

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
