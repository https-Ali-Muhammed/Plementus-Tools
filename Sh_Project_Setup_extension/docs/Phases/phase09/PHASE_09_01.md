# Phase 09.01 - Offline private repository creation preview

2026-11-11 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW - FIXTURE_ONLY; not accepted**.
Official progress **32/72**, pending acceptance.

## Design and implementation plan recorded before implementation

The owner authorizes one disconnected fixture preview, its native Node tests,
two new phase reports and six append-only records. No callers, shared exports,
existing fixtures, configuration, dependencies or accepted tests need changes.
The accepted [v1 adapter](../../../src/adapters/contract.mjs) excludes GitHub.
The wizard's `new`/`existing` choices remain independent; its free-form inputs
cannot be passed to this closed fixture API. No provider response is modeled.

Use the existing readers' primitive canonical JSON boundary to avoid caller
getters, proxies and coercion. A finite identifier/name allowlist is narrower
than the earlier readers' identifier patterns because this preview displays a
target. An object API or live adapter adds capabilities outside this task.
These limits are implementation choices within the owner's supplied spec.

1. Record this schema, then write behavioral tests and capture genuine RED
   against an empty exported function before implementing classification.
2. Implement only the pure preview; capture focused GREEN and both syntax checks.
3. Run the full native Node suite, append the six current records, and audit
   ten-file scope, historical prefixes, accepted files and prospective Git state.
4. Stop for independent ChatGPT review and the owner's publication decision.

Ponytail and Superpowers design/planning/TDD/verification guidance apply within
the explicit authorization. No extra repository plans, worktrees, commits or
approval execution are needed. Evidence and audit scripts live outside both
worktrees in a restricted durable directory.

## Exact closed fixture schema and limits

Sole export: `previewFixtureRepositoryCreation(text)`. Input must be a primitive
printable ASCII JSON string, at most **4,096 bytes** before parsing. Canonical
means exact native `JSON.stringify(parsed) === text` after schema validation.
Key order may vary if round-tripping preserves it. Duplicate keys, whitespace
variants, alternate escaping, non-ASCII, boxed strings and objects are invalid.
Native intrinsics are assumed pristine. The fixed shallow schema bounds traversal.

```json
{"selection":{"account":"fixture-account-alpha","organization":"fixture-org-alpha","repository":"fixture-repo-alpha","operation":"create-new","visibility":"private"},"accounts":[{"id":"fixture-account-alpha","state":"current"}],"organizations":[{"id":"fixture-org-alpha","account":"fixture-account-alpha","createPermission":"allowed"}],"repositories":[{"id":"fixture-repo-alpha","organization":"fixture-org-alpha","name":"fixture-name-alpha","state":"new","visibility":"private","readPermission":"unknown"}]}
```

Every key shown is required and no extra key is admitted at any level.

| Record | Exact fields |
|---|---|
| Root | `selection`, `accounts`, `organizations`, `repositories` |
| Selection | `account`, `organization`, `repository`, `operation`, `visibility` |
| Account | `id`, `state` |
| Organization | `id`, `account`, `createPermission` |
| Repository | `id`, `organization`, `name`, `state`, `visibility`, `readPermission` |

| Value | Exact vocabulary / bound |
|---|---|
| Account ID | `fixture-account-alpha`, `fixture-account-beta`, `fixture-account-gamma`, `fixture-account-delta` |
| Organization ID | `fixture-org-alpha`, `fixture-org-beta`, `fixture-org-gamma`, `fixture-org-delta` |
| Repository ID | `fixture-repo-alpha`, `fixture-repo-beta`, `fixture-repo-gamma`, `fixture-repo-delta` |
| Repository name | `fixture-name-alpha`, `fixture-name-beta`, `fixture-name-gamma`, `fixture-name-delta` |
| Each collection | Array of 0..3 records; four allowlisted IDs permit testing count overflow independently |
| Account state | `current`, `stale`, `unknown`, `unavailable`, `unsupported` |
| Repository state | `new`, `existing`, `unknown`, `unavailable`, `unsupported` |
| Either permission | `allowed`, `denied`, `unknown`, `unavailable`, `unsupported` |
| Either visibility | `private`, `public`, `internal`, `unknown`, `unavailable`, `unsupported` |
| Operation | `create-new`, `select-existing`, `unknown`, `unsupported` |
| Identifiers/names | Exact allowlist only, case-sensitive; maximum 21 ASCII bytes (account ID); no normalization |
| Output | At most 768 printable ASCII bytes, deeply frozen, fixed vocabulary plus allowlisted target values |

All records, including unselected entries, validate before selection. IDs must
be unique within each typed collection. Every organization references a listed
account; every repository references a listed organization. A `new` repository
is a proposed fixture entry, never proof of real absence, and requires
`readPermission: unknown`. Any other read declaration on a new entry is
inconsistent. Names must be unique within each organization across all states;
an existing entry and a proposed entry sharing a name produce a collision.
The same name in different organizations is not a collision.

Selections must bind exactly: selected organization belongs to selected account,
and selected repository belongs to selected organization. No fallback or inferred
target is allowed. Desired and repository visibility must agree. Operation must
agree with `new` or `existing` state. Stale/unknown/unavailable/unsupported account
or repository declarations remain non-authorizing; `current` is only a fixture
label, never a freshness check. No timestamps or live identity semantics exist.

## Output and ordered outcome matrix

Every output has exactly `evidenceTier: "SIMULATED"`, `fixtureOnly: true`,
`accountVerified: false`, `executionAuthorized: false`, `approvalGranted: false`,
`trustedContinuingContext: false`, `nextStep: "manual"`, plus `outcome`, `reason`
and `preview`. All objects are frozen. No arbitrary text, error, URL, endpoint,
command, request object, credential, approval reference or retry instruction is
returned. There is no output execution path.

Only the two positive preview outcomes expose a frozen `preview` object with
exactly `operation`, `account`, `organization`, `repository`, `name`, `visibility`.
All other outcomes have `preview: null`, concealing even a syntactically valid
target. Positive outcomes also require manual handling and confer no authority.

First matching row wins; whole-catalog checks precede target selection:

| Condition | Outcome | Fixed reason |
|---|---|---|
| Encoding, shape, type, enum, allowlist or bound invalid | `MANUAL_ONLY` | `invalid_fixture` |
| Duplicate ID or new entry with read permission other than unknown | `MANUAL_ONLY` | `inconsistent_fixture` |
| Any organization references an absent account | `MANUAL_ONLY` | `account_missing` |
| Any repository references an absent organization | `MANUAL_ONLY` | `organization_missing` |
| Any two entries share organization and name | `BLOCKED` | `repository_collision` |
| Selected account / organization / repository absent (in that order) | `MANUAL_ONLY` | `account_missing` / `organization_missing` / `repository_missing` |
| Selected organization/account mismatch | `MANUAL_ONLY` | `account_mismatch` |
| Selected repository/organization mismatch | `MANUAL_ONLY` | `organization_mismatch` |
| Desired/repository visibility disagree | `MANUAL_ONLY` | `inconsistent_fixture` |
| Account state not current | `MANUAL_ONLY` | `fixture_account_stale` / `fixture_account_unknown` / `fixture_account_unavailable` / `fixture_account_unsupported` |
| Operation unknown / unsupported | `MANUAL_ONLY` | `operation_ambiguous` / `operation_unsupported` |
| Repository state unknown / unavailable / unsupported | `MANUAL_ONLY` | `fixture_repository_unknown` / `fixture_repository_unavailable` / `fixture_repository_unsupported` |
| Create on existing or select on new | `MANUAL_ONLY` | `inconsistent_fixture` |
| Public visibility | `BLOCKED` | `public_visibility_blocked` |
| Internal / unknown / unavailable / unsupported visibility | `MANUAL_ONLY` | `fixture_visibility_internal` / `fixture_visibility_unknown` / `fixture_visibility_unavailable` / `fixture_visibility_unsupported` |
| Relevant permission denied | `BLOCKED` | `fixture_permission_denied` |
| Relevant permission unknown / unavailable / unsupported | `MANUAL_ONLY` | `fixture_permission_unknown` / `fixture_permission_unavailable` / `fixture_permission_unsupported` |
| Private new entry, create-new, organization createPermission allowed | `PRIVATE_CREATION_PREVIEW` | `synthetic_private_creation_only` |
| Private existing entry, select-existing, repository readPermission allowed | `EXISTING_SELECTION_PREVIEW` | `synthetic_existing_selection_only` |

Creation uses only the selected organization's synthetic `createPermission`;
selection uses only the existing repository's synthetic `readPermission`.
Existing selection never requires or inherits creation permission. Neither
permission describes actual GitHub rights. This is not a new policy contract.

A preview describes an invented target for human review. Approval is a separate
future target/effect decision, and execution is a separately authorized write
with independent verification. This module performs neither approval nor write.

## Actual test-first and regression evidence

Native Node **v24.19.0**, `node:test` and `node:assert/strict`; no dependency added.
Tests were written before the empty exported scaffold, then classification was
implemented only after retained RED. The first RED run returned undefined and
the shared helper threw TypeError; the helper was tightened to assert the missing
envelope explicitly. The second RED run then failed on that behavioral assertion.
Both RED logs are retained, not reconstructed. Each had 160 tests: **1 PASS,
159 FAIL, 0 SKIP, 0 CANCELLED**, exit **1**. The isolation test passed against the
empty function; RED is evidence of missing behavior, not proof that each later
branch or guard was individually mutation-tested. The first GREEN passed all 160.

From `Sh_Project_Setup_extension`:

```bash
node --version
node --check src/github/repository-create-preview.mjs
node --check test/github-repository-create-preview.test.mjs
node --test test/github-repository-create-preview.test.mjs
node --test test/*.test.mjs
```

| Command / stage | PASS | FAIL | SKIP | CANCELLED | Exit |
|---|---:|---:|---:|---:|---:|
| Empty-function RED, explicit envelope assertion | 1 | 159 | 0 | 0 | 1 |
| Focused GREEN | 160 | 0 | 0 | 0 | 0 |
| Full regression | 1,194 | 0 | 0 | 0 | 0 |
| Runtime version | v24.19.0 | - | - | - | 0 |
| Source syntax | PASS | - | - | - | 0 |
| Test syntax | PASS | - | - | - | 0 |

The historical accepted full-suite baseline is 1,034 PASS. The current full run
actually executed all 1,194 tests, including those accepted tests unchanged; the
sum of baseline plus 160 is not used as a substitute for running them. Stderr was
empty for all recorded commands. RED logs contain only local test diagnostics
with invented fixtures; no real-provider payload or account data was collected.

Coverage includes all 36 desired/declared visibility pairs in both modes,
20 operation/repository-state combinations, five account states, all relevant
permission states in both modes, and creation-permission independence for
existing selection. Binding tests exercise non-first entries, wrong account/org,
missing targets and all allowlisted names. Whole-catalog tests exercise duplicate
IDs, conflicting ownership, orphan references, selected/unselected collisions,
inconsistent new-entry permissions and malformed unselected records.

Every required field is tested for omission, type failure and duplicate keys.
Each record rejects extra, authority, prototype, serialization and secret-like
fields. Counts 0/1/2/3/4, all exact identifiers and near-match/overlong identifiers,
raw sizes 0/1/4,095/4,096/4,097, noncanonical encodings, deep JSON and hostile
objects/getters/revoked or callable proxies/coercion hooks are covered. The finite
schema cannot produce valid input near the 4,096-byte cap: raw-cap tests reject
invalid padding, while maximum-count long-value fixtures fit below the cap.
These tests do not claim successful valid input at that raw maximum.

Shared assertions check the exact envelope, target allowlists, ASCII/768-byte
bound and deep freezing on every tested outcome. Mutation attempts and repeated
calls check immutability, determinism and input preservation. Source/caller scans
and isolated-realm throwing capability getters check no imports, product callers,
network, browser, storage, clocks or scheduling. This is bounded source/test
verification, not a general capability-security or compromised-realm proof.

Restricted durable evidence outside both worktrees:
`/home/https_ali_muhammed/.codex/phase09-evidence/2026-11-11-preview/`.
Directories use 0700 and files 0600. `baseline.json` contains the prospective
refs/index/worktree/file inventories; `prefixes/` retains six original document
bodies. `commands.jsonl` records commands, cwd, UTC execution times, exits, counts
and stdout/stderr fingerprints. `red.stdout.log` and `red-assertions.stdout.log`
retain both RED runs; `green`, `full`, `node-version`, `source-syntax` and
`test-syntax` have separate stdout/stderr logs. The initial recorder only parsed
TAP counters, so the first RED record has an empty counts object; its actual
spec-reporter counters remain in the original log. The second RED and all GREEN
records parse the actual spec counters. `guard.py`, `run.py`,
`preservation.jsonl` and `last-refs.json` retain prospective verification details.

## Exact authorized ten-file package

| File relative to extension root | Disposition |
|---|---|
| [src/github/repository-create-preview.mjs](../../../src/github/repository-create-preview.mjs) | New pure preview |
| [test/github-repository-create-preview.test.mjs](../../../test/github-repository-create-preview.test.mjs) | New native behavioral tests |
| [docs/Phases/phase09/PHASE_09.md](PHASE_09.md) | New parent report |
| [docs/Phases/phase09/PHASE_09_01.md](PHASE_09_01.md) | New schema, matrix and review report |
| [docs/00_PROJECT_STATUS.md](../../00_PROJECT_STATUS.md) | Append current status only |
| [docs/03_CHANGELOG.md](../../03_CHANGELOG.md) | Append current change record only |
| [docs/04_TEST_EVIDENCE.md](../../04_TEST_EVIDENCE.md) | Append actual verification only |
| [docs/05_BLOCKERS_AND_DECISIONS.md](../../05_BLOCKERS_AND_DECISIONS.md) | Append narrow exception and gates only |
| [docs/06_HANDOFF.md](../../06_HANDOFF.md) | Append review handoff only |
| [docs/Phases/phase08/PHASE_08.md](../phase08/PHASE_08.md) | Append current acceptance/parent ledger only |

## Prospective preservation and historical limitations

Required root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`,
branch `feature/sh-project-setup-extension-clean`, HEAD and local upstream
`origin/feature/sh-project-setup-extension-clean` verified at
`37e992d803295ec3da4f3d6bc9d20a0b4e221c7e`. Origin fetch/push URLs both equal
`https://github.com/https-Ali-Muhammed/Plementus-Tools.git`. This is local metadata
verification, not a network operation or independent live-publication check.
The sibling worktree `/home/https_ali_muhammed/Plementus/Tools` remains on
`feature/sh-project-setup-extension` at `390c9ea7c311f362ea04aad64ed14569161642ec`.

The fresh baseline has **26 refs: 10 normal and 16 Codex**. Each guard comparison
requires unchanged targets/types on surviving names and unchanged normal refs;
only name additions/removals under `refs/codex/turn-diffs/` are allowed and logged
by full name in `preservation.jsonl`. No agent ref mutation or repair is allowed.
Both indexes have unstaged state and baseline fingerprints; tracked inventories,
non-exempt file contents, worktree registrations and HEADs are compared throughout.
Historical **35 -> 24 Git-reference preservation remains UNVERIFIED**. The old
recovery exception cannot reconstruct that history or supply clearance.

Initial preflight stopped for two sibling untracked paths. The owner then
explicitly classified exactly these as **EXPECTED_EXISTING / OWNER_PRESERVED**:
`Sh_Project_Setup_extension/docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md` and
`Sh_Project_Setup_extension/docs/_source/ODOO_SH_PROJECT_SETUP_NEXT_CHAT_HANDOFF.md`.
Their regular-file type, status, size and timestamps are checked without reading,
hashing, diffing or authoring their contents. They are outside this package.

The pre-existing `.idea/plemo-chats.xml` modification is a name/status observation.
Both that path and `.idea/workspace.xml`, in both worktrees, are metadata-only
exceptions: never read, hashed, diffed, restored, staged or authored by the agent.
The Phase 08.03 report records an earlier workspace-file size/timestamp drift
(3,241 to 4,509 bytes) with UNKNOWN cause; this run does not reinterpret it.
Current metadata comparisons do not establish IDE byte stability, and any
observed drift is recorded without attributing a cause. No IDE content claim is
made. Final audit results are recorded below after all ten files exist.

## Current governance and review stop

Per the owner, Phase 08.01-08.03 are **ACCEPTED / PUBLISHED - FIXTURE_ONLY**,
with 08.03 at the required HEAD. Earlier report text remains historical and
verbatim. Phase 08 parent remains **IN_PROGRESS / NOT ACCEPTED**. The owner grants
only a narrow offline sequencing exception for 09.01, not parent acceptance.

Phase 09 parent is **IN_PROGRESS / NOT ACCEPTED**, its live-write gate **BLOCKED**.
09.01 is **READY_FOR_CHATGPT_REVIEW - FIXTURE_ONLY**. 09.02 and 09.03 are
**NOT_STARTED / NOT AUTHORIZED** and require separate authorization. Official
progress remains **32/72**, 40 remaining, pending ChatGPT acceptance and owner
publication; this task claims no additional accepted micro-phase.

Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED**; Phase 07 parent
**IN_PROGRESS / NOT ACCEPTED**; D-04/B-02/B-03 **OPEN**; twelve historical security
decisions **PENDING**; production **NO_GO**. Security, permissions, authentication,
independent human-security concurrence and all existing runtime gates are unchanged.

No live provider access, actual identity/rights verification, browser automation,
authentication, approval execution, credentials, retries, branch writes, existing
repository mutation or repository creation was implemented. No clone, checkout,
reset, stash, fetch, staging, commit, push or external-account operation occurred.
**STOP for independent ChatGPT review and the owner's publication decision.**



### Phase 09.01 final prospective audit - 2026-11-11 (Africa/Cairo)

**PASS:** exact ten-file package (four new, six append-only); all six original
bodies preserved as exact prefixes. All other non-exempt baseline tracked files,
including accepted Phase 08 source/tests/reports and canonical policies/contracts,
are unchanged. Both indexes and empty staged states, worktree registrations/HEADs,
tracked inventories, normal refs and surviving Codex targets/types match baseline.
The final snapshot has 26 refs (10 normal, 16 Codex), with **zero Codex name additions
or removals**. No agent ref mutation occurred.

Protected IDE and owner-preserved sibling metadata show no observed size/type/
timestamp drift in this prospective comparison; their contents remain uninspected
and byte stability is not claimed. Historical 35 -> 24 preservation stays UNVERIFIED.
UTF-8, LF, final newlines, trailing whitespace, fences, authored inline code and
local Markdown link paths pass; git whitespace check exits 0. The audit checks
471 local path occurrences, including 21 authored local links; historical fragment
anchors were not verified. `final-audit.json` in the restricted evidence directory
records these checks, final file/log fingerprints and metadata-only observations.
The final audit rechecks after this closure is appended; no code/test changes
occurred after the recorded GREEN/full verification.

**READY_FOR_CHATGPT_REVIEW - FIXTURE_ONLY; not accepted.** Official progress
**32/72**. Stop for independent ChatGPT review and owner publication decision;
no staging, commit, push or 09.02/09.03 work.
