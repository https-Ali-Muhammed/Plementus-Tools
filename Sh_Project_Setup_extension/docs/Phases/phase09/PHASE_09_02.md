# Phase 09.02 - Offline sandbox write authorization and approval gate

2026-11-11 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY; not accepted**.
Official progress **33/72 pending review/publication**.

## Owner authorization and design recorded before implementation

Implement only a disconnected, fixture-only authorization/approval model and its
native Node tests. The owner explicitly excludes real sandbox writes, authenticated
provider access, real user approval and Phase 09.03. The accepted v1 adapter excludes
GitHub and remains unchanged. No product caller, shared export, fixture, dependency,
manifest, wizard, configuration or orchestration change is needed.

Use the [09.01](PHASE_09_01.md) primitive canonical printable-ASCII JSON boundary
and finite invented identifier vocabulary, with separate preview, sandbox declaration
and operator-decision records. An object API would expose caller getters/coercion;
using an accepted preview result as authority would conflate independent boundaries.
This standalone function has no imports. Every result omits target details, including
positive results, minimizing output without losing the descriptive outcome.

Implementation choices below are within the owner's supplied specification; they
are not an additional owner security approval. Ponytail and Superpowers design,
planning, inline execution, test-first and verification guidance apply subject to
the exact scope and no-commit instructions. No extra repository planning files.

1. Write behavioral tests for the exact independent declarations, isolation,
   whole-catalog consistency, encodings, hostile inputs, bounds and permanent denial
   of execution authority; run against an empty exported function to capture RED.
2. Implement `evaluateFixtureSandboxWriteApproval(text)` and run focused GREEN,
   syntax checks and the full native Node regression suite on v24.19.0.
3. Append current records to the six permitted tracking documents. Audit all nine
   paths, original document prefixes, accepted files and prospective Git preservation.
4. Stop for independent ChatGPT review and owner publication decision.

## Closed schema and bounds

Input: a primitive string of at most **4,096 printable ASCII bytes**. Canonical
means `JSON.stringify(JSON.parse(text)) === text` after shape validation; object
key order may vary. No coercion, duplicate JSON keys, padding, alternate escaping,
Unicode, free text, timestamps, approval references or unknown fields are admitted.
Native intrinsics are assumed pristine. All records have exactly the listed keys.

| Record | Required fields |
|---|---|
| Root | `preview`, `catalog`, `authorizations`, `approvals`, `context`, `writeState` |
| Target (preview and each declaration's target) | `account`, `organization`, `repository`, `name`, `operation`, `visibility` |
| Catalog entry | All six target fields plus `state` |
| Authorization | `scope`, `decision`, `target` |
| Operator approval | `decision`, `claim`, `target` |

| Value | Closed vocabulary / limit |
|---|---|
| Account | `fixture-account-` plus `alpha`, `beta`, `gamma`, `delta` |
| Organization | `fixture-org-` plus the same four suffixes |
| Repository | `fixture-repo-` plus the same four suffixes |
| Name | `fixture-name-` plus the same four suffixes |
| Operation | `create-new`, `select-existing`, `unknown`, `unsupported` |
| Visibility | `private`, `public`, `internal`, `unknown`, `unavailable`, `unsupported` |
| Catalog state | `new`, `existing`, `unknown`, `unavailable`, `unsupported` |
| Authorization decision | `declared`, `missing`, `denied`, `revoked`, `withdrawn`, `unknown`, `unavailable`, `unsupported` |
| Approval decision | `declared`, `missing`, `denied`, `cancelled`, `withdrawn`, `unknown`, `unavailable`, `unsupported` |
| Scope | `fixture-disposable-sandbox`, `unknown`, `unavailable`, `unsupported` |
| Approval claim | `fresh-fixture`, `stale-fixture`, `reused-fixture`, `unknown` |
| Context | `unchanged-fixture`, `changed-target`, `stale`, `cancelled`, `invalidated`, `interrupted`, `restarted`, `unknown` |
| Write state | `not-attempted-fixture`, `unknown-possible-write` |
| Catalog | 0..3 records; four identifiers allow independent overflow tests |
| Authorizations and approvals | 0..2 records each; empty means missing; any two conflict even if identical |
| Output | At most 384 printable ASCII bytes; frozen flat record; no target details |

Every entry validates, even when unselected. Repository IDs must be unique; names
cannot collide within an organization; one organization cannot have different
accounts. `new` requires `create-new`; `existing` requires `select-existing`.
A selected repository must match every preview field. Both declarations must
independently match all six preview fields, including name, operation and visibility.

A positive case requires a new private creation, exactly one synthetic declaration
for `fixture-disposable-sandbox`, exactly one separately declared operator decision
with `fresh-fixture`, `unchanged-fixture` context and `not-attempted-fixture` write
state. These strings describe invented cases, not observed identity, permission,
freshness, single-use consumption or proof that no write happened.

## Output and ordered outcome matrix

Every result has exactly `evidenceTier: "SIMULATED"`, `fixtureOnly: true`,
`accountVerified: false`, `executionAuthorized: false`, `approvalGranted: false`,
`trustedContinuingContext: false`, `nextStep: "manual"`, `outcome` and `reason`.
The flat frozen record is deeply frozen. No target, endpoint, request, HTTP method
or body, executable operation, browser action, credential, reusable token or retry
instruction is returned. There are no external side effects or continuing state.

First matching row wins. Structural validation of the entire input precedes
semantic classification. A structurally valid unknown-write declaration takes
priority over all semantic denials and context problems, retaining reconciliation.
Malformed input always remains manual and can never instruct a retry.

| Condition | Outcome | Fixed reason |
|---|---|---|
| Invalid type, encoding, shape, field, enum, bound or serialization | `MANUAL_ONLY` | `invalid_fixture` |
| Unknown possible write | `RECONCILE_REQUIRED` | `unknown_possible_write` |
| Duplicate repository, colliding name, conflicting owner or new/existing operation contradiction | `MANUAL_ONLY` | `catalog_conflict` |
| More than one authorization or approval declaration | `MANUAL_ONLY` | `conflicting_declarations` |
| Context other than unchanged-fixture | `MANUAL_ONLY` | `context_` plus the exact context enum |
| Preview repository absent | `MANUAL_ONLY` | `catalog_missing` |
| Any selected catalog/preview target field differs | `MANUAL_ONLY` | `preview_mismatch` |
| Preview not create-new with new catalog state | `MANUAL_ONLY` | `preview_not_creation` |
| Public visibility | `BLOCKED` | `public_visibility_blocked` |
| Other non-private visibility | `MANUAL_ONLY` | `visibility_unsupported` |
| No authorization | `MANUAL_ONLY` | `authorization_missing` |
| Non-disposable scope | `MANUAL_ONLY` | `sandbox_scope_` plus exact scope enum |
| Authorization decision not declared | `BLOCKED` for denied/revoked/withdrawn, otherwise `MANUAL_ONLY` | `authorization_` plus exact decision enum |
| Authorization target differs | `MANUAL_ONLY` | `authorization_mismatch` |
| No approval | `MANUAL_ONLY` | `approval_missing` |
| Approval decision not declared | `BLOCKED` for denied/cancelled/withdrawn, otherwise `MANUAL_ONLY` | `approval_` plus exact decision enum |
| Approval claim not fresh-fixture | `MANUAL_ONLY` | `approval_claim_` plus exact claim enum |
| Approval target differs | `MANUAL_ONLY` | `approval_mismatch` |
| All synthetic checks match | `SYNTHETIC_CHECKS_SATISFIED` | `synthetic_declarations_only` |

## Trust boundary and remaining decisions

Preview describes an invented intended effect. Sandbox authorization describes an
invented disposable scope and allowed effect. Operator approval is a separate
invented decision for that same effect. Actual execution is never authorized by
any result. Discovery, sign-in, organization rights, preview success or sandbox
scope cannot imply operator approval. There is no real human click or identity.

This stateless pure function cannot prove real consent, freshness, atomic
consumption, replay prevention or absence of earlier writes. Repeated identical
positive input returns the same descriptive result; it is deliberately not a
single-use grant. Caller-provided synthetic states cannot establish these runtime
properties. Actual reconciliation and any future continuation require a separately
reviewed trusted runtime with explicit owner/security authorization.

09.03 remains NOT_STARTED / NOT AUTHORIZED. It requires a separate owner decision
covering sandbox identity/scope, permissions, authentication/security approval,
write authorization, reconciliation and recovery conditions. Live sandbox-write
acceptance remains BLOCKED. [Contracts](../../08_INTEGRATION_CONTRACTS.md),
[security](../../09_SECURITY_AND_SECRETS.md) and the [master plan](../../01_MASTER_PLAN.md)
remain unchanged.

## Exact nine-file scope

All paths are relative to `Sh_Project_Setup_extension/`.

New:

- `src/github/sandbox-write-approval-fixtures.mjs`
- `test/github-sandbox-write-approval-fixtures.test.mjs`
- `docs/Phases/phase09/PHASE_09_02.md`

Append only:

- `docs/Phases/phase09/PHASE_09.md`
- `docs/00_PROJECT_STATUS.md`
- `docs/03_CHANGELOG.md`
- `docs/04_TEST_EVIDENCE.md`
- `docs/05_BLOCKERS_AND_DECISIONS.md`
- `docs/06_HANDOFF.md`

## Fresh test-first and regression evidence

Node **v24.19.0**, native `node:test` and `node:assert/strict`. Actual commands,
logs, exit codes and summary counts are retained outside both worktrees at
`/home/https_ali_muhammed/.local/share/sh-project-setup-review/phase09-02/`.
Directory permissions are 0700; evidence files are 0600. Logs contain invented
fixtures and sanitized diagnostics only, not provider or protected-file contents.

| Fresh check | PASS | FAIL | SKIP | CANCELLED | Exit |
|---|---:|---:|---:|---:|---:|
| Initial test-first empty-function RED | 0 | 210 | 0 | 0 | 1 |
| Initial implemented focused GREEN | 210 | 0 | 0 | 0 | 0 |
| Final focused suite after test-location correction | 210 | 0 | 0 | 0 | 0 |
| Final full `test/*.test.mjs` regression | 1,404 | 0 | 0 | 0 | 0 |
| `node --version` | n/a | n/a | n/a | n/a | 0 |
| `node --check src/github/sandbox-write-approval-fixtures.mjs` | n/a | n/a | n/a | n/a | 0 |
| `node --check test/github-sandbox-write-approval-fixtures.test.mjs` | n/a | n/a | n/a | n/a | 0 |

RED was observed after writing the behavioral suite and an empty exported function,
before implementing classification. All 210 tests failed because the stub returned
no non-authorizing summary. `red.log`, `red.json`, `red-test.mjs` and `red-stub.mjs`
preserve that exact run and source. `green-initial.log` records initial GREEN.
No historical RED evidence is invented or promoted.

Internal fresh-context static review found no correctness/security blocker. It
identified a test-location ambiguity: first-occurrence duplicate-key replacement
hit the preview when target fields repeated. The final tests inject duplicate keys
at the exact selected record. This test-only refinement occurred after initial
GREEN; it is not claimed as part of the original RED revision. Final fresh syntax,
focused and full runs followed that change. `internal-review.md` records this
internal check, which does not replace independent ChatGPT review or acceptance.

The 210 new tests include all 81 authorization/approval decision-or-absence
combinations; exact agreement and all target-field mismatches; private/existing
selection separation; revoked/withdrawn/cancelled decisions; scopes, changed/stale/
invalidated/interrupted/restarted contexts; stale/reused approval claims; unknown
possible-write reconciliation precedence; whole-catalog consistency, including
unselected entries; duplicate declarations/JSON keys; every field's shape/type;
unknown fields, authority injection, hostile objects/getters/revoked proxies;
canonical serialization, unusual encodings, size and collection boundaries;
determinism, freezing, non-disclosure and all four permanently false authority flags.
Static capability checks and isolated capability traps cover the no-import,
no-product-caller, no-network/storage/timer/browser boundary.

The accepted historical baseline was **1,194 PASS**. The fresh **1,404 PASS** result
is the unchanged 1,194-test regression plus 210 new tests; it was measured, not
assumed. Accepted Phase 08 and 09.01 source/tests/reports were not modified.
`verification.json` retains actual commands (the full suite glob expanded to file
arguments), exit codes, counts and log fingerprints. No live test was performed.

## Prospective Git preservation and historical limitations

Preflight verified the repository root, branch
`feature/sh-project-setup-extension-clean`, HEAD and upstream
`49f344e7c1af7342d7689674c075e1ea4121eb1a`, and origin fetch/push
`https://github.com/https-Ali-Muhammed/Plementus-Tools.git` using local metadata.
No remote was contacted. Both registered worktrees were inventoried; sibling
`/home/https_ali_muhammed/Plementus/Tools` remains on
`feature/sh-project-setup-extension` at
`390c9ea7c311f362ea04aad64ed14569161642ec`.

The new prospective baseline contains **25 refs: 10 normal and 15 Codex refs**.
Both indexes were fingerprinted and staged state was empty. Active worktree had
263 tracked paths and no untracked paths; sibling had 212 tracked paths and only
the two expected untracked source documents. Baseline non-exempt file fingerprints,
path inventories, ref targets/types and protected-path metadata are in
`baseline.json`. Both indexes, worktree registrations, HEADs, normal refs and all
retained Codex ref targets/types must match at final audit. Only name-only changes
under `refs/codex/turn-diffs/` are allowed and are recorded by the audit. No ref
repair, deletion, retargeting or pruning is performed.

Historical **35 -> 24 Git-reference preservation remains UNVERIFIED**; this new
prospective baseline cannot fill that gap. The two sibling paths below are
EXPECTED_EXISTING / OWNER_PRESERVED and were inspected only for path/status metadata:

- `Sh_Project_Setup_extension/docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md`
- `Sh_Project_Setup_extension/docs/_source/ODOO_SH_PROJECT_SETUP_NEXT_CHAT_HANDOFF.md`

`.idea/plemo-chats.xml` and `.idea/workspace.xml` in both worktrees are also protected,
metadata-only observations. Their contents were never read, hashed, diffed, edited,
restored or staged. No protected-content byte stability is claimed.

## Current disposition and unchanged gates

**09.01 ACCEPTED / PUBLISHED — FIXTURE_ONLY** at
`49f344e7c1af7342d7689674c075e1ea4121eb1a`, per owner-supplied acceptance and local
HEAD/upstream identity; no live remote publication verification was attempted.
**09.02 READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY, not accepted.**
**09.03 NOT_STARTED / NOT AUTHORIZED.** Phase 09 parent remains
**IN_PROGRESS / NOT ACCEPTED**, live sandbox-write acceptance gate **BLOCKED**.
Official progress **33/72 pending review/publication**; production **NO_GO**.
Older pending statuses in accepted reports are historical and remain untouched.

Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED**; Phase 07 parent
**IN_PROGRESS / NOT ACCEPTED**; Phase 08.01–08.03 **ACCEPTED / PUBLISHED — FIXTURE_ONLY**;
Phase 08 parent **IN_PROGRESS / NOT ACCEPTED**. D-04/B-02/B-03 remain **OPEN**;
twelve historical security decisions remain **PENDING**. The exact nine-file
change cannot clear any authentication, permission, sandbox, runtime or production
gate. No provider calls, staging, commit, push or Phase 09.03 work occurred.

Stop for independent ChatGPT review and owner publication decision.


### Phase 09.02 final prospective audit - 2026-11-11 (Africa/Cairo)

**PASS:** exactly nine authorized paths (three new, six append-only), with all six
original documentation bodies preserved as exact prefixes. Every other non-exempt
baseline file is unchanged, including accepted Phase 08 files, Phase 09.01
implementation/tests/report, master/canonical documents, security, contracts,
architecture, manifest and dependencies. Both indexes, empty staged states,
worktree registrations/HEADs and existing inventories are preserved. The final
snapshot contains **25 refs: 10 normal, 15 Codex**, with **zero Codex name additions
or removals** and unchanged retained targets/types.

Protected IDE and owner-preserved sibling path/status metadata show no observed
size/type/timestamp drift. Contents remain uninspected; no byte-stability claim.
The historical **35 -> 24 reference gap remains UNVERIFIED**. UTF-8, LF, final
newlines, trailing whitespace, fences and 466 local Markdown path occurrences pass;
git whitespace check exits 0. Historical fragment anchors were not checked.
`final-audit.json` and `final-snapshot.json` in the restricted evidence directory
record the checks and final fingerprints. The audit is rechecked after this closure;
source/tests have not changed since the final GREEN/full verification.

**09.02 READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY; not accepted.** Independent ChatGPT
review and owner publication decision remain next. No staging, commit, push, live
writes or Phase 09.03 work; production **NO_GO**.
