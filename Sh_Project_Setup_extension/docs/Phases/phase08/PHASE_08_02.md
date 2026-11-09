# Phase 08.02 — Offline repository visibility and branches

2026-11-09 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW / FIXTURE_ONLY; not accepted**. Official progress remains **30/72**, 42 remaining.

## Design and bounded implementation plan

The owner authorized this standalone synthetic-only reader as a narrow sequencing exception. Phase 08.01 is owner-accepted, ChatGPT-reviewed and published at `343a4c8025645cf86f33ebdb95f84759e5a4dec8`, per the supplied owner instruction and verified local HEAD/upstream. Its historical report, source and 79-test suite remain unchanged. Current reconciliation is appended to the [Phase 08 parent](PHASE_08.md); historical status text is not rewritten.

Implement `readFixtureRepositoryMetadata(text)` in one new import-free module, with one new native Node test file. No callers, shared exports, fixtures, dependencies, manifest, worker, popup, permissions or existing tests need changes. The accepted v1 contract excludes GitHub and remains unchanged. The reader neither consumes Phase 08.01 permissions nor represents live API data.

Chosen design: primitive canonical ASCII JSON, maximum 3,072 input bytes; closed selection/catalog/record schemas; at most 16 repositories and 8 unique branches each. Branch names come from a fixed synthetic allowlist so output can never echo an arbitrary branch string. Default branch must belong to a nonempty available set; empty available and all non-available states require null default, and non-available states require an empty set. Output is deeply frozen, fixed-vocabulary plus allowlisted synthetic branch names, at most 1,024 ASCII bytes, and always non-authorizing.

1. Create retained RED tests against an empty export for selection, visibility/discovery combinations, default consistency, schemas, ambiguity, hostile objects, bounds and isolation.
2. Implement the minimal pure reader and run authorized syntax/focused tests to GREEN.
3. Run the full suite; review the source/tests; append only the six authorized records and verify nine-file scope, historical prefixes, links, indexes, references, protected metadata and both worktrees.

Ponytail and Superpowers planning/test-first/verification guidance apply within the owner's explicit scope. No extra plan/ledger files, worktree creation, commit or publication is authorized.

## Exact fixture input contract

Sole export: `readFixtureRepositoryMetadata(text)`. Accept only primitive canonical ASCII JSON text, **0–3,072 bytes** at the raw type/size boundary; empty text subsequently fails JSON syntax. Canonical means exactly equal to native `JSON.stringify(JSON.parse(text))` after bounded schema validation. Object key ordering may vary if reserialization preserves it. Duplicate keys, whitespace variants, noncanonical escaping, non-ASCII text, boxed strings and object inputs are rejected. No coercion or caller serialization occurs.

```js
readFixtureRepositoryMetadata(JSON.stringify({
  selection: { organization: 'fixture-org-alpha', repository: 'fixture-repo-demo' },
  repositories: [{
    id: 'fixture-repo-demo',
    organization: 'fixture-org-alpha',
    visibility: 'private',
    branchState: 'available',
    branches: ['fixture-main', 'fixture-develop'],
    defaultBranch: 'fixture-main'
  }]
}));
```

Every displayed key is required, and no other keys are accepted. The root has exactly `selection` and `repositories`; selection has exactly `organization` and `repository`; each repository has exactly the six fields shown. No permission, login, account, provider, revision, credential or production field is admitted.

| Field/boundary | Exact accepted values |
|---|---|
| Organization ID | `^fixture-org-[a-z][a-z0-9]{0,31}$`, case-sensitive; suffix 1–32 characters, total 13–44 ASCII bytes |
| Repository ID | `^fixture-repo-[a-z][a-z0-9]{0,31}$`, case-sensitive; suffix 1–32 characters, total 14–45 ASCII bytes |
| `repositories` | Array, 0–16 records; unique IDs globally within the catalog, including across organizations |
| `visibility` | `private`, `public`, `internal`, `unknown`, `unavailable`, `unsupported` |
| `branchState` | `available`, `unknown`, `unavailable`, `unsupported` |
| `branches` | Array of 0–8 unique names from the exact allowlist below; input order retained |
| `defaultBranch` | An allowlisted name or null, subject to consistency rules below |
| Input size | At most 3,072 ASCII bytes before parsing; aggregate cap can take effect before individual field/count maxima |
| Output size | At most 1,024 ASCII bytes; fixed envelope/vocabulary and bounded branch list make the cap structural |

Exact branch allowlist: `fixture-main`, `fixture-develop`, `fixture-staging`, `fixture-release`, `fixture-feature-a`, `fixture-feature-b`, `fixture-hotfix`, `fixture-test`, `fixture-docs`. There are nine possible names, at most eight in any one record. Names are 12–17 ASCII bytes; this is an exact allowlist, not a general length-based acceptance rule. Real Git branch names, arbitrary `fixture-*` names, slashes, whitespace, Unicode and differently cased names are unsupported fixture input and rejected.

When discovery is available and branches are nonempty, the default must be one of those branches. Available-empty requires null default and remains a distinct available outcome. Unknown, unavailable and unsupported discovery require `branches: []` and `defaultBranch: null`; supplied branch data in those states is inconsistent, so the entire input is rejected without exposing it. Duplicate branch names are rejected, including in unselected records.

The whole catalog is validated before selection. Exact repository ID is selected, then its organization association must match. No organization-record catalog or membership assessment is introduced. Duplicate repository IDs are ambiguous even when records are identical or claim different organizations. Malformed unselected records invalidate the whole fixture. There is no deduplication, normalization, repair or fallback to another record.

## Output contract and redacted codes

The example produces this deeply frozen summary:

```json
{
  "evidenceTier": "SIMULATED",
  "fixtureOnly": true,
  "accountVerified": false,
  "executionAuthorized": false,
  "approvalGranted": false,
  "trustedContinuingContext": false,
  "nextStep": "manual",
  "visibility": { "state": "private", "reason": "fixture_private" },
  "branchDiscovery": {
    "state": "available",
    "reason": "fixture_branches_available",
    "branches": ["fixture-main", "fixture-develop"],
    "defaultBranch": "fixture-main"
  }
}
```

The envelope is identical on every public path. Every object and the branch array is frozen. IDs, input text, raw exceptions and arbitrary strings never appear in output. Branch names are only the fixed synthetic allowlist. Visibility retains the exact declared state, with reason `fixture_private`, `fixture_public`, `fixture_internal`, `fixture_unknown`, `fixture_unavailable` or `fixture_unsupported`.

Discovery retains `available`, `unknown`, `unavailable` or `unsupported`; corresponding reasons are `fixture_branches_available`, `fixture_branches_unknown`, `fixture_branches_unavailable` and `fixture_branches_unsupported`. Empty available discovery uses `fixture_branches_empty`. Only available discovery returns branch information; other valid states return []/null.

Validation/selection failures return visibility state `unknown` and discovery state `unknown`, both with the same fixed reason, plus []/null. Reasons are `invalid_fixture` for schema/type/enum/encoding/bounds errors; `ambiguous_fixture` for duplicate IDs/branches or inconsistent default/discovery data; `repository_missing` when the ID is absent; `ownership_mismatch` when the selected ID belongs to a different fixture organization. Schema/encoding failures take precedence over ambiguity, which takes precedence over selection failure. No error string is returned.

All output is SIMULATED and fixture-only. `nextStep: manual` is a non-authorizing fallback, including on positive results. Visibility, an available branch set, and a declared default do not prove login, membership, repository read access, branch-write authority, real target existence or production readiness. The four authority flags are always false; no output grants approval or continuing context.

## Positive/negative matrix and limits

| Scenario | Expected fixture result | Evidence |
|---|---|---|
| Private/public/internal visibility | Exact declaration, no permission inference | All 24 visibility/discovery combinations |
| Unknown/unavailable/unsupported visibility | Exact declaration independent of branches | Same 24-combination matrix |
| Available discovery with one/multiple branches | Allowlisted names and member default | One, seven, eight branches and each allowlisted name |
| Available empty | Available, `fixture_branches_empty`, []/null | Zero-branch case |
| Unknown/unavailable/unsupported discovery | Distinct state/code, []/null | Each state and inconsistent supplied-data cases |
| Missing target / wrong ownership | Unknown, fixed redacted reason, []/null | Empty catalog, nonmatching ID, wrong organization |
| Duplicate repository or branch data | Entire fixture ambiguous | Identical/conflicting IDs, cross-organization duplicate, duplicate names |
| Default absent from set / null in nonempty set | Entire fixture ambiguous | Member/nonmember/null/default-with-empty cases |
| Malformed catalog or unselected entry | Entire fixture invalid or ambiguous | Every required field, extra keys, container types and unselected failures |
| Hostile caller objects | Invalid without executing hooks | Prototypes, accessors, symbols, revoked/throwing/callable Proxies, coercion/serialization hooks and cycles |
| Identifier/count/byte limits | Exact accepted limits; above-bound invalid | Suffixes 0/1/31/32/33; repositories 0/1/15/16/17; branches 0/1/7/8/9; bytes 3,071/3,072/3,073 |
| JSON ambiguity and complexity | Invalid, no raw error | Duplicate keys at multiple levels, escaping, whitespace, non-ASCII and 1,500 nested arrays |
| Privacy/immutability/repetition | Frozen sanitized bounded identical output | Every result uses a shared assertion; repeated calls and mutation attempts |
| Isolation | No imports, external globals or product caller | Source/caller scan, throwing capability sentinels, independent source review |

Count-boundary fixtures explicitly assert they are below the input byte cap, preventing one limit from masking another. Byte-boundary fixtures use valid IDs, not padding/extra fields. All nine branch names are admitted individually, including both longest 17-byte names; invalid lengths/characters/arbitrary names fail the allowlist. The output cap has no user-controllable padding field: longest branch arrays/defaults are tested across every visibility. Structural maximum sizing is recorded below rather than pretending that 1,023/1,024/1,025-byte valid outputs can be generated.

## Reproducible verification and provenance

Run from `Sh_Project_Setup_extension`:

```bash
node --version
node --check src/github/repository-discovery.mjs
node --check test/github-repository-discovery.test.mjs
node --test test/github-repository-discovery.test.mjs
node --test test/*.test.mjs
```

| Check | Actual result, 2026-11-09 |
|---|---|
| Required runtime | `v24.19.0` |
| Initial RED, empty exported function | **0 PASS / 97 FAIL / 0 SKIP**, exit 1 |
| Source syntax | PASS, exit 0 |
| Test syntax | PASS, exit 0 |
| Focused GREEN | **97 PASS / 0 FAIL / 0 SKIP / 0 cancelled**, exit 0 |
| Full suite | **745 PASS / 0 FAIL / 0 SKIP / 0 cancelled**, exit 0 |

The 97 tests were written before behavior implementation. RED exercised the empty function and failed because it returned no summary; count/byte fixture construction reached the intended assertions. After implementing the reader, all 97 passed without an intervening failed implementation run. No existing tests were changed or weakened. The unchanged 08.01 79-test suite is included in the fresh full 745-test run; the historical 648-pass baseline is not substituted for a current run.

Raw non-sensitive logs and preservation metadata are retained outside the repository at `/tmp/phase0802-dwx3lh78/`: `red.txt`, `focused.txt`, `full.txt`, `before.json`, `preservation.json`, `verify.py` and historical prefix copies. Temporary logs may disappear; committed source/tests and the commands above are the reproducible behavioral evidence. No network/browser/provider execution occurred.

A separate read-only review subagent inspected only the two new source/test files and found no actionable findings within this synthetic contract. It did not execute tests or independently verify the reported runtime/counts. That AI-assisted review is not the required ChatGPT acceptance review, owner acceptance or independent security certification.

## Security assumptions and real-world limitations

Pristine native intrinsics/prototypes and bounded native JSON parsing are assumed. Parsed data is inert, and the closed shallow schema is validated before reserialization. Primitive type rejection precedes any caller-object inspection; caller-side serialization, poisoned runtimes, process memory exhaustion, secure erasure and timing guarantees are outside this evidence. The function does not verify where supplied text originated. Fixed identifiers and the synthetic evidence ceiling never turn caller claims into live permissions.

The implementation has zero imports, callbacks, clocks, randomness, credentials, network/browser/storage calls, side effects or product callers. It is disconnected from Phase 08.01 permissions, Phase 07 admission, workflows, SEC-01, adapter v1 and existing fixtures. Source scans and sentinel tests cover this implementation, not a general hostile-runtime sandbox. No external GitHub endpoint/schema, token flow, real account, repository existence/visibility, actual branches, rights or production state has been verified.

Preserve Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED / NOT ACCEPTED**; Phase 07 parent **IN_PROGRESS / NOT ACCEPTED**; Phase 07.03 **ACCEPTED — MOCK_ONLY**; Phase 08.01 **ACCEPTED / PUBLISHED — FIXTURE_ONLY**; Phase 08 parent **IN_PROGRESS / NOT ACCEPTED**. D-04/B-02/B-03 remain **OPEN**; twelve historical security decisions remain **PENDING**; production **NO_GO**. Existing historical operational/security blockers remain unchanged.

## Exact scope and next gates

Create only:

- [src/github/repository-discovery.mjs](../../../src/github/repository-discovery.mjs)
- [test/github-repository-discovery.test.mjs](../../../test/github-repository-discovery.test.mjs)
- [docs/Phases/phase08/PHASE_08_02.md](PHASE_08_02.md)

Append only:

- [docs/Phases/phase08/PHASE_08.md](PHASE_08.md)
- [docs/00_PROJECT_STATUS.md](../../00_PROJECT_STATUS.md)
- [docs/03_CHANGELOG.md](../../03_CHANGELOG.md)
- [docs/04_TEST_EVIDENCE.md](../../04_TEST_EVIDENCE.md)
- [docs/05_BLOCKERS_AND_DECISIONS.md](../../05_BLOCKERS_AND_DECISIONS.md)
- [docs/06_HANDOFF.md](../../06_HANDOFF.md)

Local preflight verified root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`, branch `feature/sh-project-setup-extension-clean`, HEAD/local upstream `343a4c8025645cf86f33ebdb95f84759e5a4dec8`, upstream name `origin/feature/sh-project-setup-extension-clean`, fetch/push origin `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`, and refspec `+refs/heads/*:refs/remotes/origin/*`. Live remote verification is supplied ChatGPT evidence from the owner, not a network check by this task. Phase 08.01 acceptance is likewise owner-supplied; its old report remains verbatim even where it contains earlier pending status.

Skills actually used: Ponytail and previously read Superpowers planning, test-first, verification and code-review workflows. Tools: `functions.exec`, shell/Git/Python, `apply_patch` and a read-only review subagent. No external application connector, browser or research tool was used.

**NEXT:** ChatGPT review and owner publication decision. Official progress remains **30/72**, **42 remaining**, while 08.02 is **READY_FOR_CHATGPT_REVIEW**, not accepted. Only subsequent ChatGPT review, owner acceptance and publication may advance it to **31/72**, **41 remaining**. **STOP:** no 08.03, live access, permission/branch mutation, business write, staging, commit or push.

### Structural output bound

Independent sizing of the documented fixed output shape gives a maximum of **512 ASCII JSON bytes**: an 11-character visibility state, its fixed reason, eight longest allowlisted names, a longest 17-character default and available discovery. Failure/empty/non-available outputs are smaller. The 1,024-byte ceiling therefore has substantial headroom; tests check every result against it and exercise longest arrays/defaults across all visibility declarations. This sizing is an offline structural calculation, not a real-provider measurement.

## Preservation result

The [current measured evidence](../../04_TEST_EVIDENCE.md#phase-0802-measured-preservation-evidence) records exact before/after refs, both index hashes, protected IDE metadata, six historical prefix hashes and explicit unchanged 08.01 fingerprints. Exactly nine authorized paths changed: three created and six appended. Existing non-IDE files remain unchanged (246 outside append targets in this worktree; 213 in the sibling). Both indexes are unchanged and unstaged; normal and Codex refs, worktree registrations, HEADs, branch identities and remote/upstream configuration match entry. Codex-ref deltas are empty; provenance remains UNKNOWN.

Both protected IDE files in both worktrees have matching entry/final stat tuples. Their contents were never inspected or changed, and no content-equality claim is made. Historical document prefixes and local Markdown targets were verified; the previous 08.01 report, implementation and tests remain unchanged. No staging, commit, push or continuation into 08.03 occurred.
