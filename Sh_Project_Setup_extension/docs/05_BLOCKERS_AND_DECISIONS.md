# Blockers and decisions

## BF-01-R1 precedence correction — 2026-11-03 (Africa/Cairo)

The [offline rework](Phases/phase07/PHASE_07_BROWSER_FIRST_TAB_RECOGNITION_SPIKE.md#bf-01-r1-rework-unknownblocked-precedence--2026-11-03-africacairo) fixes missing metadata hiding known hard failures. `blocked` now takes precedence across selected fields, snapshots and roles; unavailable metadata alone remains `unknown`. RED **26 PASS / 3 FAIL**; GREEN **29 focused / 242 full PASS**, syntax PASS. Historical **26/239** evidence below is preserved. No runtime/security-policy decision is resolved: D-04/B-02/B-03 remain OPEN, historical security decisions and browser/live-site permissions PENDING; account/execution authority stays false. Existing progress and all blocked gates remain unchanged. Browser/provider verification NOT RUN. **READY_FOR_CHATGPT_REVIEW / OFFLINE_SIMULATED; STOP FOR INDEPENDENT CHATGPT REVIEW.** No staging/commit/push.

## Offline recognition prerequisite: unresolved runtime gates — 2026-11-02 (Africa/Cairo)

[Disconnected spike](Phases/phase07/PHASE_07_BROWSER_FIRST_TAB_RECOGNITION_SPIKE.md) is **READY_FOR_CHATGPT_REVIEW / OFFLINE_SIMULATED**. Its bounded fixture decisions add no authenticated identity, operator permission, workflow authority, Chrome grant or security acceptance. **26 focused / 239 full PASS**; real Chrome/permissions/account/lifecycle checks NOT RUN. Missing metadata is unknown; snapshot markers do not prove freshness after real popup loss/restart or prevent replay of identical observations.

**D-04/B-02/B-03 remain OPEN; the twelve historical security decisions and browser/live-site permissions remain PENDING.** Future runtime work needs separately authorized exact origins/profile/targets, least-privilege permission review, trusted explicit selection and fresh document/navigation observations, isolated lifecycle/race tests, reviewed account/target evidence or manual checkpoint, and architecture/contracts reconciliation. No guessed real Plementus/customer origin, credential access, backend, API client or SEC-01 bypass is approved. The pure fixture prerequisite resolves none of these dependencies.

Progress **5/20 master phases; 28/72 official micro-phases** unchanged; Phase 04 **BLOCKED / POSTPONED**, Phase 06 **PARTIAL / BLOCKED**, Phase 07 **IN_PROGRESS**, 07.03 **NOT_STARTED / NOT_AUTHORIZED**, production **NO_GO**. Prior documentation snapshots below are preserved. **STOP FOR INDEPENDENT CHATGPT REVIEW.** No commit/push.

## Current browser-first direction and unresolved decisions — 2026-11-02 (Africa/Cairo)

**OWNER_ARCHITECTURE_DIRECTION / SECURITY_REVIEW_PENDING.** [Amendment and prospective twelve-item reconciliation](Phases/phase07/PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md#8-prospective-applicability-of-the-twelve-historical-decisions). Owner supplies **07.02 ACCEPTED as documentation**; progress **5/20 master phases; 28/72 official micro-phases**. Historical 07.01/07.02 bytes and all twelve **PENDING** decision states preserved; no security concurrence/closure invented.

| Decision / gate | Current state | Remaining requirement |
|---|---|---|
| Owner architecture direction | **OWNER_ARCHITECTURE_DIRECTION / SECURITY_REVIEW_PENDING** | Browser-first visible UI across one profile/three existing authenticated tabs; manual fallback. Validate feasibility/security separately; no implementation authority |
| GitHub App/backend candidate | **DEFERRED, not selected** | No backend/OAuth/token exception requested. Revisit only under a later explicit authenticated API scope |
| D-04 identities/permissions/targets/site behavior | **OPEN / OWNER DECISION REQUIRED** | Verify each site's actual operator identity, org/repo/subscription/customer scope, authority, permitted UI behavior and ambiguity controls; login alone proves none of these |
| B-02 future authenticated API design | **OPEN / OWNER DECISION REQUIRED** | Existing no-backend/no-token rules preserved; browser sessions are not API credentials. No internal endpoints or credential-extraction workaround |
| B-03 sandbox and rights | **OPEN** | Fresh identities/targets/operations and evidence/cleanup authorization before live access; no write authority from this direction |
| Browser permissions and live-site authorizations | **PENDING** | Exact origin/tab model, optional grants, dynamic customer domains, policy review and separate explicit live-inspection/write scope |
| Protected API-first design text | **PROSPECTIVE RECONCILIATION REQUIRED** | Master/ADR/contracts/security stay byte-identical; scope later documentation review before implementation, without weakening credential or phase gates |

SEC-01 and all existing retention/uncertainty/clock/cleanup/operator/device/incident gates remain unchanged. Phase 04 **IN_PROGRESS / BLOCKED / POSTPONED**; Phase 06 parent **PARTIAL / BLOCKED / NOT ACCEPTED**; Phase 07 parent **IN_PROGRESS / NOT ACCEPTED**; production **NO_GO**. Future read-only recognition/fixtures is recommended only; 07.03 **NOT_STARTED / NOT_AUTHORIZED**. Application/browser/provider tests **NOT RUN**. **STOP FOR INDEPENDENT CHATGPT REVIEW.**

## Historical Phase 07.02 decision tracking — preserved

The earlier current-state wording below belongs to the packet task. The new prospective direction supersedes its recommendation for current tracking only; historical security decisions remain PENDING and no blocker is closed.

## Current Phase 07.02 decision package — 2026-11-02 (Africa/Cairo)

**5/20 master phases; 27/72 official micro-phases accepted.** Supplied 07.01 acceptance at published `b04d0d4` is documentation-only; original report/evidence preserved. [07.02 packet](Phases/phase07/PHASE_07_02.md) **READY_FOR_OWNER_SECURITY_DECISION / READY_FOR_CHATGPT_REVIEW**; no method/policy decision approved. All twelve register items PENDING.

| ID | Current state / responsible roles | Required decision and closure gate |
|---|---|---|
| D-04 GitHub authentication/org/sandbox | **OPEN / OWNER DECISION REQUIRED**; project owner and security reviewer | Review packet items 01–12 individually: direction, backend exception/ownership, transient/durable credentials, sessions, identities/repos, endpoints, registration/callbacks, Chrome/distribution, incidents and future validation. No selection or external configuration follows from the packet |
| B-02 GitHub authentication | **OPEN / OWNER DECISION REQUIRED**; project owner and security reviewer | Existing no-backend/no-credential rules remain binding. Approve a coherent method and explicit handling/storage/session rules through later authorized policy records; memory/encryption/backend custody is no automatic exception. Documentation acceptance alone cannot close this blocker |
| B-03 GitHub sandbox and rights | **OPEN**; owner | No sandbox, app registration, sign-in/consent or live read/write authorized. Require later explicit identities/targets/operations and security-evidence boundaries |

Candidate A remains a proposal. B permits only separately authorized mock/public discovery and manual private work; C's documented secret-free device exchange still needs token/lifecycle/phishing review. No change to SEC-01, D-04/B-02 status or existing incident/retention policy. Phase 04 **IN_PROGRESS / BLOCKED / POSTPONED**; Phase 05 ACCEPTED; Phase 06 parent **PARTIAL / BLOCKED / NOT ACCEPTED**; 07.03 **NOT_STARTED / NOT_AUTHORIZED**; production **NO_GO**.

**STOP FOR INDEPENDENT CHATGPT REVIEW AND OWNER/SECURITY DECISION.** No 07.03 implementation follows from publication or documentation review.

## Historical Phase 07.01 tracking snapshot — preserved

The section below records its original task state; this current record supersedes its progress and next-action wording without amending security policy.

## Current Phase 07.01 assessment — 2026-11-02 (Africa/Cairo)

**5/20 master phases; 26/72 official micro-phases accepted.** Supplied 06.04 acceptance at published `5f9f588` is offline only; its historical evidence remains intact. Phase 04 **IN_PROGRESS / BLOCKED / POSTPONED**; Phase 05 **ACCEPTED**; Phase 06 parent **PARTIAL / BLOCKED / NOT ACCEPTED**; 07.01 **READY_FOR_REVIEW**, not accepted; 07.02/07.03 **NOT_STARTED / NOT_AUTHORIZED**; production **NO_GO**.

| ID | Current state / owner | Assessment and unresolved gate |
|---|---|---|
| D-04 (master-plan GitHub authentication/org/sandbox decision) | **OPEN / OWNER DECISION REQUIRED**; owner and security reviewer | [07.01](Phases/phase07/PHASE_07_01.md) recommends a candidate for consideration only. Decide method, identity/org/repository scope, exact permissions, credential/session handling, any no-backend exception, callback/distribution and later validation scope before approval. No selection or configuration is authorized. |
| B-02 GitHub authentication | **OPEN / OWNER DECISION REQUIRED** | The existing prohibition on access-token storage remains unchanged. PKCE does not remove the documented web-flow client-secret requirement. A backend or transient-memory design is not an approved workaround. See the assessment's separate gates before 07.02/07.03. |
| B-03 GitHub sandbox and rights | **OPEN** | No account, sandbox or live-provider validation authorized; documentation and mocks cannot close live-read/write acceptance. |

The proposed direction is GitHub App **user** authorization with a separately approved backend; it does not select installation-token authority or approve server credential custody. If both the no-backend and strict no-token-handling/storage limits remain, authenticated integration remains blocked. The master plan itself is unchanged; D-04's historical `NOT PROVIDED` entry is preserved there. D-04 is distinct from the later documentation's D-06/D-08/D-09 labels; no decision is renumbered or closed.

All SEC-01 implementation, approved retention/uncertainty rules and unresolved clock/runtime/operator/device/incident gates remain unchanged. **STOP FOR INDEPENDENT CHATGPT REVIEW of 07.01.**

## Historical baseline decisions and evidence — unchanged

The following text is preserved from entry HEAD. Earlier progress and phase-authorization statements are historical; current tracking is above. Existing security decisions retain their original states and wording.

Current status: **5/20 master phases; 22/72 micro-phases accepted; Phase 05 parent exit review PASS / ACCEPTED; 04.02 ACCEPTED FOR SIMULATED FOUNDATION ONLY; 04.03 ACCEPTED FOR SYNTHETIC DECISIONS ONLY; 04.04 ACCEPTED FOR PURE VALIDATION AND SIMULATION ONLY**. Parent Phase 04 remains IN_PROGRESS / BLOCKED. Phase 05 mock evidence does not verify real provider behavior; the final product remains an online-capable Chrome extension. Phase 04 runtime-security gates remain unresolved, production activation is NO_GO, and no Phase 06 or production implementation is authorized. Entries remain open until the owner or the relevant reviewer provides a decision and closure evidence.

| ID | State / owner | Impact | Required decision or input | Resolution gate / evidence |
|---|---|---|---|---|
| B-01 Git integration base | CLOSED; owner and Git reviewer | Clean branch `feature/sh-project-setup-extension-clean` begins at `origin/main` `9a818495593c87ef6d4a1376e7f81be26513e0b5`. Commit `47a0fb38171b3b21c7317c787e746c12272059d3` contains the 22 documentation files, is published to remote branch `feature/sh-project-setup-extension-clean`, and has no imported TraceBridge history. | None for this blocker. Preserve historical migration evidence and use the published commit as the verified baseline. | Verified branch, remote SHA, clean base and ancestry in the Phase 01.02 reconciliation. See [Git remediation](Phases/GIT_BRANCH_REMEDIATION.md). |
| B-02 GitHub authentication | OPEN / OWNER DECISION REQUIRED; owner and security reviewer | GitHub connector cannot be considered ready without an approved method compatible with the instruction to never store access tokens. | Select a feasible least-privilege approach under that constraint or explicitly revise scope; authorize permissions separately. | Phases 07–09: threat model, approval and bounded mock/authorized sandbox evidence. No workaround is approved here. |
| B-03 GitHub sandbox and rights | OPEN / owner | Live-write acceptance cannot be inferred from mocks. | Identify an approved disposable sandbox, organization, account, permissions, write scope and recovery plan. | Explicit authorization and observed sandbox result for relevant gates; unavailable sandbox can block live-write acceptance. |
| B-04 Odoo.sh access and UI | BLOCKED for live acceptance / owner | Project, Production, module, Staging and UI feasibility remain unverified. | Supply authorized demo account, entitlement, scope, cost and recovery plan. | Phase 18: approved real demo and observable result; fixtures alone cannot close it. |
| B-05 Plementus access and contract | BLOCKED for live acceptance / owner | Actual form, permissions and native `pl_auth` Connect behavior are unverified. | Provide authorized Plementus demo access and contract inspection scope. | Phase 19: observed real fields and native Connect behavior under approval. |
| D-06 Browser, MV3 layout and UX | PARTIALLY RESOLVED / ADR-005 | Vanilla modules, action popup, no initial permissions/host access, and future Node/Playwright testing boundaries are selected; implementation and browser loading remain unverified. | Confirm future host origins, side-panel need and extension-local Playwright version when their phases are authorized. | Phase 02 scaffold and later local fixture/MV3 evidence. |
| SEC-01 Durable checkpoint policy | RETENTION OPTION_B, COMBINED_AB_OPERATIONAL_POLICY and UNCERTAIN_TIME_RETENTION_AMENDMENT OWNER_APPROVED; DOCUMENTATION_ONLY / IMPLEMENTATION_NOT_AUTHORIZED; CLEANUP_GATE, BROWSER_CLEANUP and CP1–CP4 ACCEPTED within scope; activation NO_GO | [Original policy](Phases/phase04/PHASE_04_SEC01_APPROVED_POLICY.md), [Retention Option B](Phases/phase04/PHASE_04_SEC01_RETENTION_AMENDMENT_B.md), [combined A+B decision](Phases/phase04/PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md) and [uncertainty amendment](Phases/phase04/PHASE_04_SEC01_UNCERTAIN_TIME_RETENTION_AMENDMENT.md) now record the approved rules. Prior [disconnected](Phases/phase04/PHASE_04_SEC01_CLEANUP_GATE_IMPLEMENTATION.md) and [isolated Chrome](Phases/phase04/PHASE_04_SEC01_CLEANUP_GATE_BROWSER.md) evidence does not prove the new paths or OS time integrity. | Define exact uncertainty detection, verify project-owner identity and case approval, integrate guarded worker/recovery callers, verify device controls and incident contacts/route, and obtain security review. No delegation, guaranteed maximum hold or automatic uncertain deletion is approved. | Separately authorized implementation and synthetic/real-browser verification, then explicit activation decision. Historical [CP4 matrix](Phases/phase04/PHASE_04_SEC01_CP4_READINESS_REVIEW.md) retains its original-policy finding. Phase 04 remains blocked. |
| D-08 Utilities, domains and release | OPEN / owner | Private utility access, deploy-key public handoff, DNS ownership and distribution readiness are unverified. | Supply approved utility paths/access and domain/distribution decisions when relevant. | Phases 11–12, 18–19 with authorized evidence; operator controls DNS and release. |

| D-09 Requested-module selection | DEFERRED PHASE 03 SCOPE GAP / OWNER DECISION REQUIRED | The wizard does not collect requested modules; module-installation workflows cannot be considered ready. | Owner-approved later implementation must define and implement selection and validation. | Close with scoped implementation and verification before module-installation workflows. |

Never store passwords, MFA codes, private keys, cookies, access tokens or customer credentials. See [security](09_SECURITY_AND_SECRETS.md), [contracts](08_INTEGRATION_CONTRACTS.md) and [feasibility](12_BROWSER_AUTOMATION_FEASIBILITY.md). Owner access or a stated plan is not itself live verification.

The historical master-plan `D-07` identifier is the separate private Utilities SSH/submodule decision; it is not the durable-checkpoint policy. The preserved [D-07 draft](Phases/phase04/PHASE_04_D07_DECISION_DRAFT.md) prepared the checkpoint policy that is now recorded as SEC-01.

Production durable checkpoint storage and workflow recovery remain **BLOCKED** despite SEC-01 approval. CP3 observed real IndexedDB and worker/browser lifecycle only in an isolated test extension with synthetic authorization; it did not integrate production runtime or verify operator/device controls.

Parent Phase 04 remains **IN_PROGRESS**. Durable-state acceptance requires an owner-approved data policy, separately authorized actual storage with conflict protection, and observed worker restart and tab-close recovery tests including uncertain writes. The 04.04 synthetic decision boundary is not connected to runtime and does not establish these requirements.

SEC-01 CP1–CP4 and the [disconnected gate](Phases/phase04/PHASE_04_SEC01_CLEANUP_GATE_IMPLEMENTATION.md) are ACCEPTED. [CP3](Phases/phase04/PHASE_04_SEC01_CP3.md) directly observed worker stop and reactivation before this gate was implemented. The [new isolated browser test](Phases/phase04/PHASE_04_SEC01_CLEANUP_GATE_BROWSER.md) observed this gate's real IndexedDB cleanup, atomic abort, worker reactivation and full browser restart in a disposable profile. The historical [CP4 review](Phases/phase04/PHASE_04_SEC01_CP4_READINESS_REVIEW.md) and later [Option B amendment](Phases/phase04/PHASE_04_SEC01_RETENTION_AMENDMENT_B.md) retain their distinct scopes. Production next-execution wiring, clock trust, incident routing, device checks, real operator authorization and runtime restrictions remain unresolved.

The owner approved the final combined A+B [operational policy](Phases/phase04/PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md) and [uncertain-time retention amendment](Phases/phase04/PHASE_04_SEC01_UNCERTAIN_TIME_RETENTION_AMENDMENT.md). They permit outstanding blocked local retention without a guaranteed maximum and require case-specific project-owner approval for destructive disposition; no delegation is approved. The seven-field browser-only architecture cannot prove elapsed time across an unobserved restart. Implementation, security and activation gates remain open.
