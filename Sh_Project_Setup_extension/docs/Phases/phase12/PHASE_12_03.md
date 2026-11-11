# Phase 12.03 — Unavailable public key and operator checkpoint

2026-11-11 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Tests and documentation only; no new controller, authorization mechanism or gate.
User-supplied Phase 12.02 **ACCEPTED/PUBLISHED** baseline:
`18af12ecd45aaa6d85f5acc4d36952918eb4c419`, corroborated by local HEAD/upstream.
The original [12.02 report](PHASE_12_02.md) remains unchanged and historical.
Official progress remains **41/72** pending independent review and publication.

## Preconditions and operator presentation

Follow the accepted [handoff contract](PHASE_12_01.md) and
[existing API](../../../src/github/deploy-key-handoff.mjs). Use the original
validated selected Utilities repository, path/revision intent and current review
context, with an independent [structure assessment](../phase11/PHASE_11_02.md).
The [selection planner](../phase11/PHASE_11_01.md) only validates syntax and returns
sanitized indexes; it establishes neither repository access nor key provenance.
Resolve the authorized GitHub account, target, rights and Odoo.sh project context
externally. Unknown access, rights or provenance stays `MANUAL_REVIEW`; explicit
denial or invalid selection/structure blocks. Empty optional selection produces
`NO_ACTION` only with known empty structure and otherwise acceptable context.

For absent or unknown key availability, present `AWAITING_OPERATOR` and exactly:

> Public key unavailable. No GitHub access configuration has been verified.

Offer **Obtain key externally**, **Defer**, and **Cancel**. There is no private-key
or raw public-key input field in this fixture, and no enabled configuration
confirmation while the key is unavailable. These are future presentation
instructions; this phase implements no screen. Keep status and reasons textual,
controls keyboard accessible, and focus on the changed status.

**Defer while already waiting** means remain at the checkpoint without dispatching
an event. The accepted `defer` event is valid only from `REVIEW_REQUIRED`, returning
`AWAITING_OPERATOR/deferred`; dispatching it while waiting blocks as an invalid
transition. Cancel dispatches `cancel` and terminates the attempt. Waiting does not
poll, retry, generate a key or infer availability.

## Exact manual fallback

1. In the authorized Odoo.sh project, verify the project/account and intended
   Utilities repository. Consult **Settings → Submodules** for that private
   sub-repository's actual public deploy key. The official
   [Odoo.sh FAQ](https://www.odoo.sh/faq?expand=1) describes entering the sub-repository
   URL and using Add before copying its public key. Perform any such provider
   operation only under existing separate authorization. If the project, UI,
   rights or public-key provenance cannot be established, stop for manual review;
   if the actual key is unavailable, remain waiting. Never substitute a sample,
   newly generated local key, private key or another project's key.
2. Keep key material entirely on the authorized provider pages. Do not paste it
   into this fixture, chat, logs, screenshots or reports. Report only the category
   `operator_reports_available` through `key_available` after obtaining the real
   key externally. With unchanged valid context this enters `REVIEW_REQUIRED`,
   never configuration or approval. Recheck the selected target and read-only
   effect. Require the explicit, unselected confirmation from 12.01 before
   `confirm` enters `MANUAL_CONFIGURATION`. Defer returns to waiting; reject
   enters `BLOCKED/operator_rejected`; cancel enters `CANCELLED/operator_cancelled`.
3. On the **selected Utilities repository** in GitHub, open **Settings → Deploy
   keys → Add deploy key**. Supply a non-sensitive title and paste only that
   actual public key directly into GitHub. Leave **Allow write access** unchecked.
   Recheck the repository and read-only permission before choosing **Add key**.
   These steps follow [GitHub's deploy-key documentation](https://docs.github.com/en/authentication/connecting-to-github-with-ssh/managing-deploy-keys).
   Missing rights or an unexpected target means stop; do not escalate permissions,
   overwrite/delete existing keys, or reuse a key across repositories.
4. Inspect the target repository's deploy-key details and read-only permission
   against the intended key externally. A title, toast or successful click is
   insufficient evidence. Return with a categorical result only. `returned`
   enters `AWAITING_VERIFICATION`; `attest` records `OPERATOR_ATTESTED` and must
   present “Operator reports configuration; association not independently verified.”
   Unknown results or conflicting associations require reconciliation. No fixture
   event actually inspects GitHub or performs configuration.

## Evidence and recovery

| Evidence | Exact interpretation |
|---|---|
| Unavailable/unknown | No actual public key reported available; no configuration claim |
| Operator-attested | Human report only; `associationVerified: false` |
| Synthetically matched | `observe_match` models `ASSOCIATION_OBSERVED`; still `SIMULATED`, never actual verification |
| Actually verified | Requires independent authorized observation of the exact current association and read-only permission; not produced or observed in this phase |

`MANUAL_CONFIGURATION` is a simulated operator handoff. Entry conservatively
latches possible write because an operator could save outside the controller's
view. It does not perform a save or grant execution. Returning, attesting, a
synthetic match and caller `possibleWrite: false` cannot clear that latch.

Changed attempt, selection target, plan or context invalidates the old handoff:
`STALE_CONTEXT` before possible write, `RECONCILE_REQUIRED` afterward. Unknown
context requires manual review; conflicting target cannot be guessed. Permission
denial blocks and retains reconciliation when a write may have occurred. Unknown
or conflicting results after handoff require external inspection before any new
review; there is no automatic retry or in-fixture reconciliation reset. Cancel
stops the attempt but preserves `reconciliationRequired` after possible write.
Late results cannot revive it. Lost volatile history requires external
reconciliation and fresh selection; never infer rollback or resume from approval.

## Scenario-driven regression journey

| Scenario | Expected sequence |
|---|---|
| Key never becomes available | Start unavailable → wait; unknown/unavailable reports → wait; defer by remaining idle; cancel → cancelled, no review |
| Key available, deferred, then confirmed | Wait → reported availability → review → defer → wait → reported availability → review → explicit confirm → simulated manual configuration |
| Operator returns | Manual configuration → return → awaiting verification → attest → operator-attested → synthetic match; every authority flag false |
| Reject or cancel before configuration | Review → blocked/rejected or cancelled; late confirm cannot revive |
| Unknown/conflicting result after possible save | Manual return → reconciliation → cancel with obligation retained; new start and late match cannot erase it |
| Stale attempt/target/plan/context | Before handoff → stale; after handoff → reconciliation; old result cannot supply success |

The [30 focused regression tests](../../../test/deploy-key-operator-checkpoint.test.mjs)
exercise the existing API with canonical JSON and independently exercise accepted
Phase 11 selection/structure APIs. They check exact snapshot fields, immutability,
ASCII/size bounds, sanitization, `SIMULATED` evidence and all ten false authority,
verification and effect flags at every tested step. No full transition-matrix
copy was added. Raw-material/provider-ID fields are rejected with a harmless
marker; no key bodies, fingerprints, tokens or customer identifiers are fixtures.

## Verification and scope

Initial run against accepted source: **GREEN, 30 passed / 0 failed**. No RED was
manufactured and no source defect was found. Required commands, from the extension:

```bash
node --test --test-reporter=tap test/deploy-key-operator-checkpoint.test.mjs
node --test --test-reporter=tap test/deploy-key-handoff.test.mjs test/deploy-key-operator-checkpoint.test.mjs
node --test --test-reporter=tap test/*.test.mjs
node --check test/deploy-key-operator-checkpoint.test.mjs
node --test --test-reporter=tap --test-name-pattern='no imports|isolated source|planner only imports' test/deploy-key-handoff.test.mjs test/utilities-plan.test.mjs test/submodule-structure.test.mjs
```

Only two new files (this report and its tests) and six append-only ledgers:
[Phase 12](PHASE_12.md), [status](../../00_PROJECT_STATUS.md),
[changelog](../../03_CHANGELOG.md), [evidence](../../04_TEST_EVIDENCE.md),
[decisions](../../05_BLOCKERS_AND_DECISIONS.md), [handoff](../../06_HANDOFF.md).
Source, accepted tests, master plan, security policies, workflow, manifest,
dependencies, popup and browser adapters are unchanged.

Public official documentation was read and links resolved on 2026-11-11; this is
not provider/account access verification. No authenticated provider access,
browser automation, key collection or external write occurred. No actual key,
GitHub association, Odoo.sh checkout or module installation was observed.

Skills used: Ponytail and Superpowers workflow/verification guidance, bounded by
the user's exact eight-file scope, initial-GREEN instruction and no Git mutations.
Tools: functions shell/Git/Python/Node and web official-documentation reads.
No service MCP was used; WarpGrep and Valyu were not available.

Phase 12 parent: **IN_PROGRESS / NOT ACCEPTED**, eligible for fixture-only exit
assessment after 12.03 publication. Phase 11 live-capability acceptance: **PENDING**.
Phase 10.03: **BLOCKED / NOT AUTHORIZED**. Historical **35 → 24 ref discrepancy:
UNVERIFIED**. Production: **NO_GO**. **STOP for ChatGPT review**; no staging,
commit, push, publication or Phase 13.01.

### Measured final results and preservation boundary

Required focused run: **30 passed**; combined accepted/new handoff run:
**330 passed**; full extension run: **2,137 passed**; explicit existing source
isolation: **3 passed**. All have zero failures, skips and cancellations. The new
test syntax check passed. Temporary evidence: `/tmp/phase1203-*.tap`,
`/tmp/phase1203-baseline.json`, `/tmp/phase1203-audit.py`.

The final scoped audit confirms exactly eight changed files, all six exact
original document byte prefixes, unchanged accepted source/tests, empty scoped
staging, all three raw index hashes, sampled Git control files (HEAD/config/
registration/packed refs where present), all **33 original ref values**, and
all three worktree registrations/HEADs. No new refs or sampled directory mtime
differences were observed during this task's snapshot window. The pre-existing
Codex-internal checkpoint namespace is retained; no task command created a ref.
The 12.02 additional checkpoint-ref/shared `.git` mtime exception remains historical
and is neither deleted nor attributed. No equality claim covers all Git metadata.

Both protected IDE paths received metadata-only checks, unchanged over the
captured interval; their contents were never read, hashed, edited or staged.
Sibling protected source documents and sibling working-tree contents were not
inspected. Preservation is prospective from this task's snapshots, not proof of
historical content equality or of the unresolved 35 → 24 discrepancy. Status and
diffs stayed extension-scoped; optional index refresh was disabled. No clone,
fetch, checkout, reset, commit or push occurred. New local links resolve, official
external links loaded successfully, and whitespace, LF endings and final newlines
pass. These results do not grant independent acceptance or live capability.
