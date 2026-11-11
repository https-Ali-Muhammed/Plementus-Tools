# Phase 12.01 — Public deploy-key handoff and operator workflow

2026-11-11 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW — DOCUMENTATION_ONLY**.
Scope: **DOCUMENTATION_ONLY / FIXTURE-READY**. This is a proposed implementation
contract, not a working integration or authorization to perform its future steps.

## Governing context and decisions

Read with the [master plan](../../01_MASTER_PLAN.md), [Phase 11 parent](../phase11/PHASE_11.md),
[selection contract](../phase11/PHASE_11_01.md), [structure contract](../phase11/PHASE_11_02.md),
[conflict/fallback report](../phase11/PHASE_11_03.md), [ADR-006](../../02_ARCHITECTURE_DECISIONS.md),
[integration contracts](../../08_INTEGRATION_CONTRACTS.md) and
[public-key, credentials and approval policy](../../09_SECURITY_AND_SECRETS.md).

Use the existing validated Utilities selection as the starting point, then a
visible, target-specific operator handoff. Manual GitHub configuration is the
default and fallback. Browser automation remains unverified; an API route is
conditional, not the selected route. This follows browser-first planning without
changing architecture, source, accepted tests, adapters, workflow states or policies.
No separate approval packet or owner questionnaire is introduced.

The user supplies ChatGPT acceptance of Phase 11.03 **FIXTURE_ONLY** and Phase 11
fixture-only parent exit **PASS**. Publication at
`c100604267cbf9fc1f3a515902e28b3b83a031b5` is verified by matching local HEAD,
local upstream and live `refs/heads/feature/sh-project-setup-extension-clean`.
Historical Phase 11 reports and test counts remain verbatim; they are not new runs.
Full live-capability Phase 11 acceptance is **PENDING**. Official progress stays
**39/72**, overall master-phase count **5/20**. Phase 12 parent is
**IN_PROGRESS / NOT ACCEPTED**; 10.03 **BLOCKED / NOT AUTHORIZED**; historical
**35 → 24 discrepancy UNVERIFIED**; production **NO_GO**.

## Verified documentation facts versus unverified live facts

Official pages consulted on 2026-11-11; documentation observation is not a live
provider test, account check, key inspection or authorization.

| Source | Verified documentation fact | What it does not prove here |
|---|---|---|
| [GitHub managing deploy keys](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys) | Public part is attached to one repository; private part stays on the server. Keys are read-only by default. A key cannot be reused across repositories. | Operator rights, current target, actual association or successful fetch |
| [GitHub deploy-key REST reference](https://docs.github.com/en/rest/deploy-keys/deploy-keys) | Create uses `POST /repos/{owner}/{repo}/keys`; list/get read back association. Creation needs repository Administration write for supported fine-grained authorization; readback needs Administration read. `read_only: true` limits the key to reads. | An approved authentication route or permission to call it |
| [Odoo.sh FAQ, submodules](https://www.odoo.sh/faq?expand=1) | Documents obtaining a public key for a private sub-repository and adding it at GitHub. It names project Settings/Submodules and RSA/Ed25519 support. | The selected project's UI, selectors, actual available key format, lifetime, rotation, reuse or removal behavior |

The Odoo 19.0 submodules/settings documentation requests timed out; they are not
used as verified sources. The accessible FAQ is the Odoo.sh reference for this
contract. Its descriptive UI path is not an executable selector or a promise that
any current project exposes it. No key format is assumed by the fixture model.
Never substitute a generated/sample key when the actual key is unavailable.

## Inputs, binding and transient handoff boundary

One handoff concerns **one selected Utilities repository** and one plan revision.
The main project repository is not the deploy-key target unless it independently
is the selected utility; never guess a target from the active tab.

| Required input or fact | Source and handling |
|---|---|
| Selection index, canonical GitHub owner/repository and selected path/revision intent | Use the original validated plan in its existing owner context. The Phase 11 planner returns sanitized indexes/reasons, not repository strings; do not reconstruct a target from its result. Display the validated selection transiently, never echo it to evidence. |
| Plan and handoff generations | Volatile monotonic counters bind one review to one unchanged selection; a new selection invalidates all prior review and evidence applicability. |
| Structure status | Preserve the separate Phase 11 structure result. Invalid structure blocks; missing/unsupported/ambiguous metadata stays manual. Syntax or a synthetic match is not authorization. |
| GitHub account, target identity/privacy and authority; Odoo.sh account/project and key provenance | Independent facts requiring future authorized confirmation. Signed-in tabs and a syntactically valid plan do not establish them. Unknown facts prevent a configured claim. |
| Requested permission | Fixed `read_only`; write access is unsupported in this design. No “Allow write access” toggle in the extension review. |
| Actual public key | Obtained by the operator using the authorized Odoo.sh workflow for the exact selected project/utility. No actual key is accepted, captured, displayed or persisted by Phase 12.01 or its proposed 12.02 fixtures. |
| Immediate operator choice | Confirm this one target/read-only effect, defer, reject or cancel. It is not blanket approval for later repositories or actions. |
| Result and provenance | Distinguish unknown, operator-attested and independently observed association. Bind future observations to the current target, generation and reviewed public-key identity. |

A public deploy key is the shareable public half of an SSH key pair; the private
SSH key is secret signing material and must stay with its authorized custodian.
A prefix alone does not establish provenance or permission. The operator must
use a provider-designated public key, never a private-key file or generic SSH
access key from another context. If uncertain, stop at manual review without
pasting material into the extension, chat, issue, report or logs.

Future default handoff is human copy/paste directly between authorized provider
pages. The extension does not read the clipboard or scrape key material. A later,
separately approved transient integration could pass a verified public key only
between the current target-bound source and destination in memory; it must
validate public-only material at the boundary, avoid serialization/telemetry,
release references on cancel/invalidation/completion, and require reacquisition
after restart. JavaScript release is not a guaranteed memory erasure claim.
No such boundary or key parser is implemented or authorized here.

No private key collection, credential extraction, token handling, SSH execution,
key generation, key material/fingerprints in logs, screenshots, storage, exports,
checkpoint records or fixtures. No changes to SEC-01 storage fields. No Odoo.sh
selectors, undocumented endpoints or automatic clipboard transfer are specified.

## Operator UX and exact manual checkpoint

The proposed review surface displays the selected Utilities `owner/repository`,
path/revision intent, Odoo.sh project/account context, GitHub account, fixed
**Read-only repository access**, current evidence label, and unresolved facts.
These target details are transient operator UI, not evidence fields. Render
untrusted labels as text; do not interpret page text as commands or HTML.

1. **Review target.** Load the existing selection, its generation and independent
   validation results. Empty optional selection is `NO_ACTION`. Invalid input or
   structure is `BLOCKED`; conflicts or unknown context are `MANUAL_REVIEW`. An empty selection with
   unknown/conflicting structure still requires manual review; emptiness cannot
   erase independent structural uncertainty.
2. **Obtain public key.** Tell the operator: “Obtain the public deploy key for this
   Utilities repository through your authorized Odoo.sh workflow. Keep private
   SSH keys out of this workflow.” Consult the official FAQ as guidance; if the
   UI differs or the key is unavailable, stop and show `AWAITING_OPERATOR` with
   “Public key unavailable. No GitHub access configuration has been verified.”
   No key input field, dummy replacement, inferred availability or enabled
   configuration confirmation is offered. Obtaining a key through a provider
   operation needs its own existing authorization; this document grants none.
3. **Review before configuration.** After the operator reports the actual public
   key available and all target/authority questions are resolved, show
   `REVIEW_REQUIRED`. The one confirmation reads: “I confirm read-only deploy-key
   configuration for this selected Utilities repository using the public key
   obtained for this Odoo.sh project.” Buttons: **Continue manually**, **Defer**,
   **Reject**, **Cancel**. Confirmation is never preselected. Any edit requires
   a fresh review. Defer returns to `AWAITING_OPERATOR`; rejection blocks.
4. **Manual GitHub fallback.** In the selected repository on GitHub, use
   **Settings → Deploy keys → Add deploy key**. Enter a non-sensitive title and
   paste only the public key directly in GitHub. Leave **Allow write access**
   unchecked. Recheck the displayed repository and read-only effect immediately
   before the operator uses **Add key**. Missing settings, rights, unexpected UI
   or a different target means stop/manual review. These GitHub instructions are
   documented in the linked managing-deploy-keys page; no extension click occurs.
5. **Inspect result.** Return to the repository's deploy-key listing/details and
   check the exact public-key association and read-only permission against the
   intended key and target. A title, saved toast, button click or request success
   alone cannot prove this. The extension asks only for a categorical outcome:
   **Configured manually**, **Could not configure**, or **Outcome uncertain**.
   The first records an attestation; it does not manufacture an observation.
   “Could not configure” with explicit permission rejection blocks; an unsupported
   page before the handoff stays manual. Once configuration may have been attempted,
   every other unresolved failure or uncertain result requires reconciliation.
6. **Keep the conclusion narrow.** Without independent authorized observation,
   show “Operator reports configuration; association not independently verified.”
   With matching observed association, show “Read-only deploy-key association
   observed. Checkout and module installation remain unverified.” Never display
   generic “Access works”, “Checkout complete” or “Modules installed”.

All screens retain a visible cancel action, keyboard-operable controls, explicit
text status/reasons and focus on the new status message; color alone conveys
nothing. No new UI is implemented. The manual route remains available when a
future browser adapter cannot recognize a supported page, without bypassing a
known denial or conflict. Existing keys are not deleted, rotated or overwritten.
A duplicate/different-target key requires manual reconciliation, not retries,
key reuse across utilities, extra permissions or a newly generated key.

## States, transitions and precedence

These are **handoff-local design states**, not additions to accepted workflow or
adapter enums. No state advances the existing coordinator or grants execution.

| State / operator text | Admission and permitted next transition |
|---|---|
| `NO_ACTION` — No Utilities selection | Empty optional selection with no unresolved structural blocker; terminal for this attempt |
| `AWAITING_OPERATOR` — Public key or operator action needed | Known acceptable target but absent/unknown key, or deferred review; actual-key availability attestation plus current resolved context → `REVIEW_REQUIRED` |
| `REVIEW_REQUIRED` — Confirm target and read-only effect | Target-bound review; confirm → `MANUAL_CONFIGURATION`; defer → `AWAITING_OPERATOR`; reject → `BLOCKED` |
| `MANUAL_CONFIGURATION` — Complete in GitHub | No executor; operator returns from a possible save → `AWAITING_VERIFICATION`; uncertainty/interruption after possible save → `RECONCILE_REQUIRED` |
| `AWAITING_VERIFICATION` — Configuration unverified | Matching current authorized observation → `ASSOCIATION_OBSERVED`; report-only success → `OPERATOR_ATTESTED`; denial → `BLOCKED`; unknown result → `RECONCILE_REQUIRED` |
| `OPERATOR_ATTESTED` — Reported, not independently verified | Manual stopping point; later matching observation in unchanged context → `ASSOCIATION_OBSERVED`; conflicting observation → `RECONCILE_REQUIRED` |
| `ASSOCIATION_OBSERVED` — Read-only association observed | Narrow successful stopping point; no checkout/install inference; context drift makes the evidence inapplicable and requires new review |
| `MANUAL_REVIEW` — Resolve unknown or conflicting context | Unknown identity/rights/provenance, unsupported UI, selection conflict or ambiguous existing key; resolve externally then start a fresh attempt; no direct success transition |
| `STALE_CONTEXT` — Select and review again | Context changes before possible save invalidate review; fresh plan/target selection creates a new attempt |
| `RECONCILE_REQUIRED` — Possible write; inspect before retry | Preserve uncertainty after possible save, target conflict, lost result or late/mismatched observation; no automatic retry; fresh verified reconciliation and fresh review required for any new attempt |
| `BLOCKED` — Rejected or invalid | Invalid input/structure, explicit permission denial, rejected confirmation, forbidden raw material or write-access request; terminal attempt, no retry or permission escalation |
| `CANCELLED` — Handoff cancelled | Terminal attempt; no action/advance/replay; retain any outstanding possible-write reconciliation obligation separately |

Global precedence: a cancelled or blocked attempt cannot be revived by late
callbacks; cancellation never asserts rollback. Invalid envelopes fail closed.
Before any confirm/result event, require matching attempt/plan/context generations.
Navigation, tab closure/replacement, account/target/project changes, permission
revocation, worker restart or review-surface loss invalidate the review. If a save
may have happened, reconciliation takes precedence over a clean restart; otherwise
use `STALE_CONTEXT` (explicit denial still blocks). Late results cannot clear that
obligation. If the application loses the volatile history entirely, ask for manual
reconciliation and fresh selection; never resume a write from persisted approval.

Within a current valid attempt: invalid selection/structure or denied authority
blocks before key availability is considered; selection conflicts/unknown facts
stay manual; only an acceptable target with missing key waits for the operator. Unknown
permission or public-key provenance counts as unknown context (`context_unknown`);
raw key material is outside the schema and fails as `invalid_input`.
An attestation cannot repair invalid input or override rejected/conflicting evidence.
No key reuse, automatic retry, deletion, rollback, or installation follows any state.

## Fixture implementation contract for a separately authorized Phase 12.02

Keep this disconnected from browser, network, Git/SSH, clipboard, storage, popup,
worker, adapters and the coordinator. Exercise accepted Phase 11 outputs without
changing them. Do not pass GitHub operations into the v1 adapter/approval catalog:
the existing [approval checkpoint](../../../src/workflow/approval-checkpoint.mjs)
and [coordinator](../../../src/workflow/step-coordinator.mjs) admit only their fixed
synthetic operations. Reuse their fail-closed, terminal and no-authority semantics,
not their exports as a deploy-key executor. Accepted source/tests stay unchanged.

The proposed fixture boundary uses primitive canonical JSON (`JSON.stringify`
form), maximum **8,192 ASCII characters**, exact fields, no unknown fields,
duplicate keys, coercion hooks or caller objects. Suggested records below define
the required logical inputs; no real target names or key-shaped strings are allowed.

| Field | Closed fixture domain |
|---|---|
| `version` | `1` |
| `attempt`, `planGeneration`, `contextGeneration` | Integers 1–1,000,000; local synthetic references, never identifiers from a provider |
| `selectionIndex` | Integer 0–15, or null only for empty selection |
| `selection` | `empty`, `valid`, `invalid`, `conflict` |
| `structure` | `empty`, `matched`, `invalid`, `unknown`, `unsupported`, `conflict` |
| `context` | `current`, `unknown`, `stale`, `conflict`, `denied` |
| `publicKeyAvailability` | `unavailable`, `unknown`, `operator_reports_available`; no actual key field |
| `permission` | `read_only`, `write_requested`, `unknown` |
| `event` | `start`, `key_available`, `confirm`, `defer`, `reject`, `cancel`, `returned`, `attest`, `observe_match`, `observe_conflict`, `unknown_result`, `invalidate` |
| `possibleWrite` | Boolean; once true remains true for the attempt until reconciled outside this fixture boundary |

A future controller owns its state and original snapshot; callers cannot supply
trusted prior state or clear a latched possible write. Events carry the same bound
attempt/generations/index; mismatches never act on a new target. Only `start`
creates an attempt; `key_available` may update only the availability category;
other context/selection changes invalidate it. Entering `MANUAL_CONFIGURATION` conservatively latches possible write: the
operator can save outside the extension's view. `returned` keeps that latch true
even if the caller says false. `observe_match` is a
synthetic scenario event, never admission of a real observation. Reject impossible
state/event combinations with fixed `invalid_transition` and block the attempt;
terminal states remain terminal. Do not emit arbitrary input or raw exceptions.

Safe result/evidence allowlist: `version`, local `attempt`, `planGeneration`,
`contextGeneration`, `selectionIndex`, `state`, fixed `reason`, `permission`,
`evidenceTier`, `fixtureOnly`, `scenarioOutcome`, `reviewRecorded`,
`reconciliationRequired`, `nextStep`, `accountVerified`, `permissionVerified`,
`approvalGranted`, `executionAuthorized`, `mutationAuthorized`,
`trustedContinuingContext`, `associationVerified`, `checkoutVerified`,
`moduleInstalled`, `effectsApplied`. Results are deeply frozen, deterministic and
bounded to **4,096 serialized ASCII characters**. No arbitrary free-text evidence.

`reason` is one of `none`, `no_selection`, `key_unavailable`, `context_unknown`,
`context_stale`, `target_conflict`, `selection_invalid`, `selection_conflict`,
`structure_invalid`, `structure_unknown`, `permission_denied`, `write_unsupported`,
`review_required`, `deferred`, `operator_rejected`, `operator_cancelled`,
`verification_pending`, `operator_report_only`, `association_match`,
`association_conflict`, `outcome_unknown`, `invalid_input`, `invalid_transition`.
`nextStep` is `manual` for every fixture result. `reviewRecorded` describes only
simulated intent; all verification, authority, continuing-context and effect
booleans above remain **false** in every fixture outcome. `reconciliationRequired`
may remain true even with cancellation/blocking. Local references are ephemeral
and do not create a new persistence policy.

| Evidence class | Allowed interpretation |
|---|---|
| `SIMULATED`, `fixtureOnly: true` | Every 12.02 fixture, including scenarios named `ASSOCIATION_OBSERVED`, has only synthetic evidence. `scenarioOutcome` labels the modeled state; no real association is verified. |
| Operator-attested (future presentation classification) | A human reports manual configuration; independent association observation is absent. This is not a new accepted adapter evidence enum. |
| Observed (future presentation classification) | An authorized observer independently checks the current exact repository, public-key identity and read-only association. Any real evidence-tier/schema integration needs separate approval. |

The observer must compare the reviewed public key to the returned/listed public
key within the separately authorized transient boundary (or perform the human
comparison and label it an attestation). A matching title or provider key ID alone
is insufficient. Persist/report only categorical match/mismatch/unknown. Do not
persist key material, fingerprints, URLs, repo/account/project/customer identifiers,
provider key IDs, full API responses, DOM, screenshots, arbitrary errors or tokens.
Observation proves association only: checkout, revision reachability, build success,
addons discovery and module installation each need separate evidence and scope.

## Phase 12.02 acceptance cases (specified, NOT RUN)

| Case | Required result |
|---|---|
| Empty optional plan with empty known structure | `NO_ACTION`; no association/checkout/install claim |
| Valid plan, real key unavailable or unknown | `AWAITING_OPERATOR`; confirmation unavailable, no substitute key |
| Planner invalid; structure invalid even with empty plan | `BLOCKED`; valid syntax elsewhere cannot mask a blocker |
| Duplicate selection/path conflict; unknown/unsupported structure; unknown rights | `MANUAL_REVIEW`; no automatic resolution |
| Key availability reported, current acceptable context, read-only permission | `REVIEW_REQUIRED`; availability alone causes no association claim |
| Confirm/defer/reject/cancel | Exact transitions above; no default consent, approval authority or execution |
| Manual return and reported success only | `AWAITING_VERIFICATION` then `OPERATOR_ATTESTED`; no observed success |
| Matching synthetic observation | Modeled `ASSOCIATION_OBSERVED`; evidence still `SIMULATED`, every real verification flag false |
| Missing result, timeout, failed or conflicting readback | Unknown possible write → `RECONCILE_REQUIRED`; explicit denial blocks; never retry |
| Existing identical key reported; different key/target; already-in-use error | Manual comparison/reconciliation; no duplicate creation, deletion, reuse or permission widening |
| Wrong repository/account/project; navigation, tab/permission loss, restart | Review invalidated; stale before possible save, reconcile after possible save; fresh attempt required |
| Cancel after possible save; delayed success; repeated confirm | Terminal cancellation plus outstanding reconciliation; late/duplicate events cannot revive or replay |
| Write access requested or unknown key type/provenance | Block write request; uncertain provenance stays manual; no private-key input path |
| Oversized, malformed, noncanonical, extra-field, key/credential-like injected input | Reject without echoing data; no coercion; fixed failure reason |
| Boundary numbers/enums and conflicting facts | Exact limits; restrictive outcome wins; no silent truncation or permissive coercion |
| Every state and transition | Determinism, deep immutability, bounded/sanitized evidence, false authority/effect flags; zero network/browser/storage/clipboard/SSH use |

## Separate future approved sandbox integration

Fixture acceptance does not authorize sandbox access. A later explicit scope must
name the disposable project/repository, responsible operator, approved observation
and exact write, current site rights, least-privilege browser permissions, privacy
boundary, per-write confirmation, reconciliation and owner-led cleanup. Confirm
actual Odoo.sh key provenance/format/lifecycle and supported UI in that scope;
do not infer them from the FAQ. Verify account/origin/target before and after the
operation, compare actual read-only association, and separately scope any checkout
or installation. Unknown outcomes stop for reconciliation, without blind retry.

Only if a future approved architecture and credential policy explicitly permit it,
a GitHub API implementation may create the reviewed key with `read_only: true`
and perform target-bound list/get verification. API administration authority is
separate from the deploy key's read permission. No token/session extraction,
credential transport, backend, client or authorization exception is selected here.
Any returned key content would be confined to the approved transient comparison,
never raw evidence. API errors, duplicate keys and ambiguous results use the same
manual/reconciliation outcomes. This conditional route is not Phase 12.02 authority.

## Preflight, preservation and review evidence

Required root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`,
branch `feature/sh-project-setup-extension-clean`, fetch/push origin
`https://github.com/https-Ali-Muhammed/Plementus-Tools.git` and HEAD/upstream/live
remote match `c100604267cbf9fc1f3a515902e28b3b83a031b5`.
The sibling worktree remains `/home/https_ali_muhammed/Plementus/Tools`, branch
`feature/sh-project-setup-extension`, HEAD `390c9ea7c311f362ea04aad64ed14569161642ec`.
Pre-edit permitted inventories are clean; both staged states are empty. The sibling
has two pre-existing untracked protected source documents, inventoried by metadata.
The current worktree has the known `.idea/plemo-chats.xml` change outside task scope.
Prospective baseline: **29 refs**, both raw indexes, Git control files, worktree
registrations/HEADs and **274 non-protected tracked files**. Snapshot/prefix copies
and audit scripts are outside both worktrees at `/tmp/phase12-01-audit/`.

Boundary limitation: the first `git status` lacked IDE exclusions and may have
mechanically read the tracked IDE file and refreshed index stat data. No IDE
contents were displayed or explicitly opened/hashed/edited, but strict no-read
compliance for that initial command and index equality before the prospective
snapshot cannot be certified. All subsequent content checks exclude `.idea/` and
`docs/_source/`; sibling documents receive metadata-only checks. No protected
content-equality claim is made. This limitation is not repaired or concealed.

Exact authored scope: two new documents (this contract and [Phase 12](PHASE_12.md));
six append-only documents ([Phase 11](../phase11/PHASE_11.md),
[status](../../00_PROJECT_STATUS.md), [changelog](../../03_CHANGELOG.md),
[evidence](../../04_TEST_EVIDENCE.md), [decisions](../../05_BLOCKERS_AND_DECISIONS.md),
[handoff](../../06_HANDOFF.md)). Master, architecture, policies, source/tests,
manifest, dependencies and README are not edited. Historical prefixes are retained.

Node/browser/provider tests **NOT RUN**: documentation-only work. Public
reference lookup and Git remote metadata lookup are not provider integration tests.
Skills used: Ponytail; Superpowers design/planning and verification. Tools used:
local shell/Git/Python 3 through `functions`, and `web` for official documentation.
WarpGrep and Valyu were not available in tool discovery; no connected-service MCP,
computer-use tool or live provider session was used.

**STOP for ChatGPT review.** No staging, commit, push, Phase 12.02 implementation,
actual key handoff or new acceptance/publication. Verification results are recorded
in the appended evidence ledger; review must retain the preflight limitation above.


### Measured prospective verification

Exact **eight-file scope** verified: **two new, six append-only**. All six prior
byte prefixes and **268 other permitted tracked files** (including source/tests,
master, architecture, policies, manifest and dependencies) match the pre-edit
snapshot. Both raw indexes and staged states, all **29 refs**, Git control files,
worktree registrations/HEADs and sibling inventory match. Protected IDE and sibling
source metadata show no observed prospective drift; their byte equality is not
claimed. All **27 authored local links** resolve; UTF-8/LF/final-newline,
trailing-whitespace, fence and scoped Git whitespace checks pass. These results
are prospective only and retain the initial unscoped-status limitation above.
No Node/browser/provider tests ran. **STOP for ChatGPT review.**
