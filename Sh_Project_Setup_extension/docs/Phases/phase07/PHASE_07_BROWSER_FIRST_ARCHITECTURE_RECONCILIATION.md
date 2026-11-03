# BF-02: Browser-first architecture reconciliation

**READY_FOR_CHATGPT_REVIEW / DOCUMENTATION_ONLY.** Recorded **2026-11-03 (Africa/Cairo)**. Non-counted documentation prerequisite; independent acceptance is pending. No implementation, permission selection or live-site authorization.

## Authority, accepted baseline and Git identity

The confirmed [browser-first owner direction](PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md) supersedes historical API-first proposals for current planning. One Chrome MV3 extension supports a Plementus implementation engineer using three already open and signed-in websites in **one Chrome profile**: GitHub, Odoo.sh (normally signed in using GitHub), and Plementus Odoo. The extension's intended role is explicit tab identification/selection, ordinary visible UI navigation and approved form filling, per-write human confirmation, observed results and manual fallbacks. These product requirements prove neither live feasibility nor account rights, site-policy compatibility or operation authorization.

**BF-01 is independently accepted and published at `02862e80ed3275bebfbcc227991954e0a0fd5214` (`02862e8`), per supplied acceptance, within its disconnected offline scope.** Git verifies publication, not reviewer authority. Its [original report and BF-01-R1 review wording](PHASE_07_BROWSER_FIRST_TAB_RECOGNITION_SPIKE.md) remain byte-identical, including historical **29 focused / 242 full PASS**, prior 26/239 and RED evidence. None was rerun for BF-02. `selection_bound` compares invented snapshots only; `accountVerified: false` and `executionAuthorized: false` remain binding. No trusted Chrome observation, account, freshness, replay protection or runtime authority follows.

| Preflight field | Verified baseline |
|---|---|
| Exact Git root | `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` |
| Extension | `Sh_Project_Setup_extension` |
| Origin fetch and push URLs (all values) | `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| Branch | `feature/sh-project-setup-extension-clean` |
| HEAD / upstream SHA / live remote tip | `02862e80ed3275bebfbcc227991954e0a0fd5214` |
| Upstream name | `origin/feature/sh-project-setup-extension-clean` |
| Divergence | `0 0` for `HEAD...@{upstream}` |
| Complete staged / unstaged / untracked baseline | Empty / empty / empty |
| Index and tracked baseline | 222 tracked paths verified against HEAD; index bytes/entries snapshotted outside Git |

Read-only preflight used `pwd`, root/branch/HEAD/upstream rev-parse queries, all origin fetch/push URL queries, full porcelain status, unstaged/cached name-status, index-entry inventory, divergence count and `git ls-remote --exit-code origin refs/heads/feature/sh-project-setup-extension-clean`. No clone, checkout, fetch, reset, stash, merge, staging, commit or push. `.idea/workspace.xml` was excluded from content reads, hashes and changes throughout.

Read current master plan including Amendment A, ADRs, integration/security/requirements/feasibility, Phase 07 parent, 07.01/07.02, owner amendment, BF-01, status, blockers and handoff. Read the current manifest, disconnected BF-01 evaluator and v1 adapter contract only as needed. The manifest still declares no permissions, host access, content scripts or OAuth. v1 admits Odoo.sh/customer Odoo/Plementus, not GitHub provider/results; BF-02 changes none of it.

## Before/after decision matrix

“Before” records historical proposals, not previously approved credentials or runtime capability. “After” is the current planning route subject to unresolved review and validation gates.

| Topic | Historical proposal retained | Current reconciled direction |
|---|---|---|
| GitHub operations | ADR-003 / contract / feasibility favor official REST API operations | [ADR-006](../../02_ARCHITECTURE_DECISIONS.md#adr-006-browser-first-three-tab-owner-direction--2026-11-03-africacairo) gives owner direction precedence; repository/branch website UI is CANDIDATE_BROWSER_UI / UNVERIFIED |
| Authentication infrastructure | 07.01/07.02 conditionally assess GitHub App plus backend or other token routes | No additional website OAuth, GitHub App, PAT, backend, credential collection or authenticated provider API client needed by default; GitHub App/backend **DEFERRED, not selected or approved** |
| Three-site context | Independent API/site adapter proposals | Explicitly selected existing GitHub/Odoo.sh/Plementus tabs in one profile; customer Live/Test tabs/origins need separate review |
| Site sessions | API candidates require separately approved credential handling | Sessions remain site-owned; ordinary UI uses site session handling; extension must never extract/store/replay/convert session material into API credentials |
| Browser access | Initial permission-free scaffold; future grants unresolved | Still no selected permission set; tab metadata, per-tab access, host grants, injection, dynamic hosts and revocation require separate review |
| Business sequence | Full customer setup required; API/UI mechanics proposed | Sequence preserved below; UI candidates/manual checkpoints do not establish support or completion |
| Code/evidence | Accepted local v1, offline coordinator/approval and BF-01 | Byte-identical; no new provider, operation schema, executor or authority; historical tests retain their evidence limits |
| Governance | Master and security policy contain historical API proposals and binding prohibitions | Original bytes preserved; dated prospective notes govern route planning only; no security policy weakened or phase automatically advanced |

Protected [master plan](../../01_MASTER_PLAN.md) and canonical sources are not amended. Its historical API routes are superseded for current planning by the published owner direction, while its scope, business outcomes, evidence tiers and acceptance gates remain binding. The protected [security document](../../09_SECURITY_AND_SECRETS.md) retains its historical conditional App/backend assessment; it grants no exception. If implementation reveals a necessary policy change, record a **separately PENDING / OWNER DECISION REQUIRED** proposal and await explicit owner/security decision under a new scope.

## Security boundaries

| Independent gate | Meaning and limit |
|---|---|
| Website authentication | Engineer has already completed each site's login under the reported arrangement; expired sessions/MFA/CAPTCHA remain human checkpoints. Odoo.sh's GitHub sign-in does not share sessions/rights with GitHub |
| Chrome extension access | Separate browser capabilities, consent and least-privilege security review; no permission design approved here. Having signed-in tabs does not give the extension access |
| Website operation authority | Selected site account must have actual organization/repository/subscription/customer rights. Profile membership, sign-in, a visible button or successful read/click proves no write entitlement |
| Sensitive-write approval | Explicit human confirmation of exact current target and effect immediately before **each** write, separate from Chrome consent and site account rights; invalidate on drift. No blanket approval, simulated reference or BF-01 selection grants execution |

Future guards must bind exact HTTPS origin, selected tab/document/frame, current page/account and target environment; ambiguous/missing evidence blocks or requires an honest manual checkpoint. Navigation (including route changes), tab replacement/loss, permission loss, popup/worker state loss and restart require fresh trusted observation/revalidation. Unknown outcomes after a possible write require reconciliation before any retry and fresh target-specific approval; no automatic replay. Successful clicks, toasts and fixture observations alone cannot confirm external state.

Never access cookies/session storage, private page authentication state, reusable credentials, passwords/MFA codes, private SSH keys or `pl_auth` tokens. No session-to-API conversion, authenticated fetch/XHR proxy, network interception or undocumented internal endpoint. Native website requests caused by ordinary UI remain site-owned session handling, not permission for credential access. Plementus Connect Live/Test must retain its native flow without interception or replacement.

Shared DOM and content-script observations are untrusted; isolated JavaScript does not make them authentic. Any future messaging requires trusted validation of bounded payloads and sender/tab/frame/document/origin, with safe text rendering. These remain prospective requirements, not controls implemented by BF-02. [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts), [message security](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#security-considerations).

SEC-01's fields, retention, uncertain hold, cleanup/clock, owner identity, device and incident controls stay unchanged. Browser-first operation does not enable checkpoint persistence, recovery or synthetic approvals. Phase 04 and Phase 06 runtime blockers remain independent prerequisites; no eighth field, new clock rule or recovery exception is introduced.

## Chrome permission choices remain pending

`activeTab` is user-invoked temporary access to the current tab. Same-origin navigation can retain access; cross-origin navigation or closure revokes it. One invocation is **not a blanket three-tab grant**. A stricter target/navigation guard can still invalidate context while Chrome retains same-origin permission. [Chrome activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab).

Most tab management does not need `tabs`; that permission exposes sensitive tab metadata (`url`, `pendingUrl`, `title`, `favIconUrl`), and matching host grants can expose it too. Metadata access is not DOM access or account authority. Programmatic injection needs `scripting` plus applicable host access or `activeTab`. These facts do not select either mechanism. [Tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs), [Scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting).

Required/optional host declarations, runtime consent and loss/removal behavior need review. Optional requests must fit declared capabilities and be user initiated; denial/removal must stop affected access and invalidate stale approval. Dynamic customer domains require a separate exact-origin and environment decision; a tab selection does not create a grant. Chrome documents broad optional HTTPS declarations for hosts discovered later, but BF-02 approves neither broad declarations nor any concrete host pattern. Compare narrow known-origin access, per-tab invocation and manual fallback under a separately authorized review. No real Plementus/customer origin is guessed. [Permission declarations](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions), [Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions).

## Intended setup sequence and feasibility limits

The three websites are starting roles, not a cap on later customer tabs and not permission to follow arbitrary redirects. Every row's actual selectors, site behavior and policy compatibility are **UNVERIFIED**. Dispositions describe candidates or human checkpoints, not implemented support.

| Order / outcome | Candidate route | Manual checkpoint / unsupported or unverified behavior |
|---|---|---|
| 1. Private GitHub repository | CANDIDATE_BROWSER_UI: select/create in intended organization; observe repository identity/private visibility | Verify rights; approve creation immediately before write; duplicate/unknown result requires reconciliation; manual creation available |
| 2. Odoo.sh project and Production | NEEDS_VERIFIED_SITE_BEHAVIOR: approved customer/partner subscription, repository/main or master, actual Production build/database | Entitlement/cost and each project/Production write need review/approval; build queued or branch label alone is insufficient |
| 3. Utilities and public deploy-key handoff | MANUAL_CHECKPOINT: approved repositories/paths/revisions, Gitlinks/`.gitmodules`, key authorization and checkout access | UI-only submodule mutations are UNVERIFIED; no invented API/UI operation, shell executor, private-key collection or automatic clipboard transfer; attachment is not installation |
| 4. Approved modules including `pl_auth` | CANDIDATE_BROWSER_UI on separately approved customer Production origin; observe each actual installed state | Explicit install approval; manual for unknown module/dependency/dialog; requested-module wizard gap remains unresolved |
| 5. `develop` plus neutralized Production-derived Staging | Branch CANDIDATE_BROWSER_UI; database copy NEEDS_VERIFIED_SITE_BEHAVIOR; observe correct base/revision, Staging copy/neutralization/apps separately | Separate branch and database approvals; no force update; branch creation is not a database copy; manual reconciliation if copy state unknown |
| 6. Live/Test domains | MANUAL_CHECKPOINT: verify correct default environment URLs, or coordinate approved custom domain | DNS/TLS ownership and external changes remain human responsibilities; custom-domain automation UNSUPPORTED_OR_BLOCKED here |
| 7. Plementus Database INFO | NEEDS_VERIFIED_SITE_BEHAVIOR: exact record/real fields, approved form filling/write, observe saved values | Actual mapping/rights unverified; manual entry available; no sensitive values in journal/reports |
| 8. Native Connect Live/Test verification | MANUAL_CHECKPOINT / NEEDS_VERIFIED_SITE_BEHAVIOR: existing Plementus controls and native `pl_auth` flow | Verify actual authorized result; a click is insufficient; no fabricated login/session or token capture |

Sign-in/MFA/CAPTCHA are manual only. Credential extraction, security/policy bypass, undocumented authenticated endpoints, automated uncertain-write replay and unapproved provider/customer/DNS writes are **UNSUPPORTED_OR_BLOCKED**. Unknown UI, rights or trusted-event requirements lead to manual fallback, never bypass. Final outcome reporting must distinguish candidate, attempted, observed, unknown and MANUALLY_ATTESTED; fixture success never promotes to real-site evidence. See [contracts](../../08_INTEGRATION_CONTRACTS.md#bf-02-prospective-browser-first-reconciliation--2026-11-03-africacairo) and [feasibility](../../12_BROWSER_AUTOMATION_FEASIBILITY.md#bf-02-prospective-browser-first-feasibility--2026-11-03-africacairo).

## Unresolved choices and unchanged phase gates

**D-04, B-02 and B-03 remain OPEN.** D-04 still needs verified site identities, targets, rights and permitted behavior; B-02 retains the future authenticated API design blocker without making API authentication a default requirement for the UI candidate; B-03 still needs separately approved sandbox/rights/operations/evidence/recovery scope. None is closed by BF-01 or BF-02.

The [twelve historical decisions](PHASE_07_02.md#6-individually-reviewable-ownersecurity-decision-register) remain **PENDING**; their [prospective browser-first applicability](PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md#8-prospective-applicability-of-the-twelve-historical-decisions) is preserved. Backend, credentials, API endpoint grants and app/callback registration are deferred, not covertly approved. Chrome access, identities/rights, incidents and future verification remain material under browser-first planning. No policy decision is inferred from documentation acceptance.

| Gate | Unchanged state |
|---|---|
| Official progress | **5/20 master phases; 28/72 official micro-phases**; BF-01/BF-02 non-counted |
| Phase 04 | **BLOCKED / POSTPONED** |
| Phase 06 parent | **PARTIAL / BLOCKED / NOT ACCEPTED** |
| Phase 07 parent | **IN_PROGRESS / NOT ACCEPTED** |
| Phase 07.03 | **NOT_STARTED / NOT_AUTHORIZED** |
| Chrome permissions / live-site inspection | **PENDING** |
| Production | **NO_GO** |

## Next recommended validation gates

These are recommendations only, not a BF-03 or 07.03 prompt or authorization:

1. Independent ChatGPT acceptance of BF-02's prospective precedence and preservation evidence; owner/security review of remaining policy gaps without amending protected rules by inference.
2. Separately authorize a least-privilege permission/target/lifecycle design, exact future file scope and fixture-only evidence boundaries. Include duplicate/missing tabs, unavailable metadata, denial/revocation, redirects/route changes, wrong accounts, stale documents and worker/popup loss; BF-01's synthetic flags do not settle actual Chrome behavior.
3. Before any live inspection, explicitly authorize profile/origins/accounts/targets, read-only operations, minimal observations/redaction and site-policy review. No live access is authorized by this report or the owner's signed-in-tab description.
4. Before any later write experiment, separately approve disposable targets, account rights, exact operation/effect, immediate human confirmation, result checks, reconciliation and recovery/cleanup scope. Retain Phase 18/19 real-demo gates and production NO_GO.

## Official references

Public official Chrome pages retrieved **2026-11-03 (Africa/Cairo)** using `web.run`; no account, tab, provider session or settings inspected. Sources establish platform behavior only, not extension implementation, site compatibility, rights or consent.

| Source | Supported claim / limit |
|---|---|
| [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) | Temporary invoked-tab host access; same-origin retention versus cross-origin/closure revocation |
| [Tabs](https://developer.chrome.com/docs/extensions/reference/api/tabs) | Most management needs no permission; tabs/host grants expose sensitive metadata |
| [Scripting](https://developer.chrome.com/docs/extensions/reference/api/scripting) | Programmatic injection requires scripting plus host access or activeTab |
| [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) | Named/host/optional declarations and consent boundaries |
| [Permissions API](https://developer.chrome.com/docs/extensions/reference/api/permissions) | Declared runtime requests, user gesture, current grants/removal and dynamic-host constraints |
| [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts) | Isolated JavaScript world with shared page DOM |
| [Message security](https://developer.chrome.com/docs/extensions/develop/concepts/messaging#security-considerations) | Content-script messages need validation and limited privileges |
| [MV3 worker lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Workers terminate and lose globals; no always-running coordinator assumption |

GitHub policy references in the published owner amendment retain their **2026-11-02** provenance; they were not re-retrieved here and are not site-automation approval. No new GitHub/Odoo.sh endpoint, selector or supported operation is asserted.

## Scope, verification and stop

Exactly **ten authorized documentation paths**: modify `docs/02_ARCHITECTURE_DECISIONS.md`, `docs/08_INTEGRATION_CONTRACTS.md`, `docs/12_BROWSER_AUTOMATION_FEASIBILITY.md`, `docs/Phases/phase07/PHASE_07.md`, `docs/00_PROJECT_STATUS.md`, `docs/03_CHANGELOG.md`, `docs/04_TEST_EVIDENCE.md`, `docs/05_BLOCKERS_AND_DECISIONS.md`, `docs/06_HANDOFF.md`; create only this report. Paths are relative to the extension root. Original nine document bodies are preserved as exact suffixes after their original H1 headings; historical ADR-003 and acceptance/test evidence are intact. No callers, tests, fixtures, config, exports, manifest, source or dependencies need changes.

Documentation checks and measured results are in [04_TEST_EVIDENCE](../../04_TEST_EVIDENCE.md#bf-02-documentation-verification--2026-11-03-africacairo). Scratch baseline/checker/results: `/tmp/bf02-reconciliation-90nbgdh5/`. Verification covers exact scope, all protected tracked bytes against baseline/HEAD, unchanged raw index/entries, canonical/master equality/original bytes, historical bodies, local Markdown links/anchors, official permission claims, newly written sensitive-value/approval review, diff whitespace and explicit new-file whitespace/final newline. `.idea/workspace.xml` is never read, hashed, edited, staged, deleted or reset.

**Application/browser/provider tests: NOT RUN; not required for documentation-only BF-02.** Historical 29/242 results are preserved, not fresh validation. No live tab/profile access, site navigation, authenticated request, DOM injection, form submission, credential operation or site write. Only public official documentation research and mandated read-only Git remote queries used the network.

Skills actually applied: Superpowers using-superpowers and verification-before-completion; Ponytail full. Tools actually used: shell/Git/Python and apply_patch through functions.exec, plus web.run. WarpGrep and Valyu unavailable; no authenticated connector, browser-control tool or subagent used. User's exact documentation scope overrides skill-default implementation/extra-artifact workflows.

**STOP FOR INDEPENDENT ACCEPTANCE. READY_FOR_CHATGPT_REVIEW / DOCUMENTATION_ONLY. No staging, commit or push; do not start BF-03, 07.03, Chrome integration or browser automation.**
