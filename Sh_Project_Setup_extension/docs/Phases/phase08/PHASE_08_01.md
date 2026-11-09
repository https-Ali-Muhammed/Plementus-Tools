# Phase 08.01 — Offline permission reader

2026-11-09 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW / SIMULATED / FIXTURE_ONLY; not accepted**. Official progress **29/72**.

## Design and implementation plan

The user authorized one pure synthetic reader and native Node tests, plus two new reports and six append-only records. No product callers, exports from existing modules, fixtures, configuration or dependencies need changes. The accepted [v1 adapter contract](../../../src/adapters/contract.mjs) excludes GitHub and stays unchanged. The reader cannot consume [07.03 mock admission](../phase07/PHASE_07_03.md) or browser/provider authority. The [R1 risk exception](../phase07/PHASE_07_03_R1_OWNER_RISK_ACCEPTANCE.md) is historical and does not authorize live permissions.

Chosen boundary: `readFixturePermissions(text)` accepts primitive canonical JSON text with invented IDs. An object API would require inspecting caller-owned descriptors and Proxy traps; serialized input avoids executing them. A real adapter is outside authorization. No live GitHub response schema is implied. Builder choices: 3,072 ASCII input characters, at most 16 records per collection, synthetic ID suffixes of 1–32 lowercase alphanumeric characters starting with a letter, and fixed output vocabulary. Native intrinsics are assumed uncompromised.

1. Write deterministic cases for selection, independent permissions, malformed data, ambiguity, hostile object rejection, bounds, privacy, isolation and immutability; retain the initial RED log externally.
2. Implement only [permission-reader.mjs](../../../src/github/permission-reader.mjs), with no imports or side effects; run the authorized syntax and focused tests.
3. Run the authorized full suite, review requirements, append reports, and verify exact scope, historical prefixes, links and both worktrees. Do not stage, commit or publish.

The owner's exact file/command scope overrides skill defaults for extra design/ledger files, worktree creation, commits and broader execution. Test-first and verification guidance are applied within that scope.

## Exact mock API and output contract

The sole export is `readFixturePermissions(text)`. Pass a primitive ASCII JSON string in exact `JSON.stringify` form, at most **3,072 characters/bytes**. Whitespace, duplicate object keys, alternate escaping, boxed strings and object inputs are rejected. JSON object key order may vary, provided serializing that parsed object reproduces the supplied string exactly. This is deliberately a small invented fixture format, not a GitHub API response or a browser-admission result.

```js
readFixturePermissions(JSON.stringify({
  selection: { organization: 'fixture-org-alpha', repository: 'fixture-repo-demo' },
  organizations: [{ id: 'fixture-org-alpha', read: 'allowed', admin: 'denied' }],
  repositories: [{ id: 'fixture-repo-demo', organization: 'fixture-org-alpha', read: 'allowed' }]
}));
```

All displayed input keys are required, and no additional fields are allowed. Arrays contain 0–16 records, with unique IDs across each collection. Organization identifiers match `^fixture-org-[a-z][a-z0-9]{0,31}$`; repository identifiers match `^fixture-repo-[a-z][a-z0-9]{0,31}$`. Matches are exact and case-sensitive. Every `read` and `admin` field must be one of `allowed`, `denied`, `unknown`, `unsupported`, `unavailable`. These are fixture declarations; they do not model GitHub role hierarchies, membership, token scopes or actual grants. The synthetic consistency rule rejects organization `admin: allowed` unless its declared `read` is also `allowed`.

The entire catalog is validated before selection, including unselected records. The byte cap may reject a catalog before its count/identifier maxima are reached. Parsed objects have a fixed shallow schema; deep or cyclic caller objects cannot enter it. JSON arrays cannot encode holes: null elements fail validation. Duplicate IDs anywhere make the entire fixture ambiguous, even identical duplicates or repositories declared under different organizations.

The example returns:

```json
{
  "evidenceTier": "SIMULATED",
  "fixtureOnly": true,
  "accountVerified": false,
  "executionAuthorized": false,
  "approvalGranted": false,
  "trustedContinuingContext": false,
  "nextStep": "manual",
  "organization": {
    "read": { "state": "allowed", "reason": "fixture_allowed" },
    "admin": { "state": "denied", "reason": "fixture_denied" }
  },
  "repository": {
    "read": { "state": "allowed", "reason": "fixture_allowed" }
  }
}
```

Every object is frozen, all strings come from fixed vocabulary, and outputs stay within **1,024 ASCII bytes**. No IDs, raw input, raw errors or private values are returned. Every outcome uses `nextStep: manual`; this is a non-authorizing handoff label, not approval or an execution transition. No aggregate authorization field exists. Four authority flags remain literally false, including on all positive fixture assessments.

## Fixture matrix and failure semantics

| Condition | Organization assessment | Repository assessment / reason |
|---|---|---|
| Both explicit reads allowed | Declared read/admin only | `allowed / fixture_allowed` |
| Organization read/admin allowed; repo denied | Allowed declarations retained | `denied / fixture_denied` |
| Organization read/admin denied; repo explicitly allowed | Denied; no inferred administration | Fixture-only allowed |
| Declared unknown | `unknown / fixture_unknown` for that field | Same independent mapping |
| Declared unavailable | `unknown / fixture_unavailable` for that field | Same independent mapping |
| Declared unsupported | `unsupported / fixture_unsupported` for that field | Same independent mapping |
| Selected organization absent | Both unknown, `organization_missing` | Unknown, `organization_missing` |
| Selected repository absent | Organization declarations retained | Unknown, `repository_missing` |
| Repository owned by a different fixture organization | Organization declarations retained | Unknown, `ownership_mismatch` |
| Duplicate/conflicting IDs or inconsistent organization admin/read | All unknown, `ambiguous_fixture` | Same |
| Extra/missing keys, invalid types/enums/IDs, bad encoding or limits | All unknown, `invalid_fixture` | Same |

An existing organization record with denied/unknown/unavailable/unsupported read does not automatically erase an independently declared repository read. Only absence of the selected organization prevents the ownership association from being established in this mock. No membership or organization read implies repository access, and no repository access implies organization administration. No synthetic outcome establishes live account read or modification rights.

## Test-first evidence and reproducible commands

Run from `Sh_Project_Setup_extension` with Node **v24.19.0**:

```bash
node --version
node --check src/github/permission-reader.mjs
node --check test/github-permission-reader.test.mjs
node --test test/github-permission-reader.test.mjs
node --test test/*.test.mjs
```

| Verification | Actual result |
|---|---|
| Runtime | `v24.19.0` |
| Source syntax | PASS, exit 0 |
| Test syntax | PASS, exit 0 |
| Initial RED before source existed | 0 PASS / 1 FAIL / 0 SKIP; `ERR_MODULE_NOT_FOUND` |
| First implementation run | 74 PASS / 3 FAIL / 0 SKIP; boundary-fixture construction assertions failed |
| Final focused | **79 PASS / 0 FAIL / 0 SKIP / 0 cancelled**, exit 0 |
| Final full | **648 PASS / 0 FAIL / 0 SKIP / 0 cancelled**, exit 0 |

The initial RED is import-level evidence, not a claim that each behavioral assertion was individually observed failing. Intermediate failures were retained: the generated fixtures were 3,183 characters, not the intended 4,095–4,097. Investigation computed the maximum valid canonical schema at 3,933 characters. The input cap was deliberately tightened from the initial builder proposal of 4,096 to **3,072** so valid fixtures exercise exact minus-one/equality/plus-one boundaries. The test now proves success at 3,071 and 3,072 and safe rejection at 3,073. No existing test was edited or weakened.

The focused suite additionally covers every declared permission combination (125 combinations within one test), 15/16/17 records, identifier suffixes 31/32/33 characters, missing selections, ownership mismatch, duplicate/conflicting records, malformed unselected records, every required field, serialization/prototype-related keys, deep JSON, duplicates/escaping, enum/type failures, caller prototypes/getters/symbols, throwing and revoked Proxies, boxed strings, coercion hooks, immutability, privacy, repetition and caller-input preservation. Direct object input is rejected without inspecting it; the reader never invokes caller getters, traps, coercion or serialization hooks. Caller-side serialization is outside the function's boundary.

The source isolation test checks prohibited dependency/capability syntax, verifies no existing source caller references the new API, and installs throwing global capability sentinels during representative reads. The source itself has **zero imports**. These checks and source review establish the current offline implementation; they are not a general static-analysis or hostile-runtime certification. No existing tests changed.

Temporary non-sensitive evidence is outside Git at `/tmp/phase0801-cbaw_edy/`: `red.txt`, `intermediate-74pass-3fail.txt`, `focused.txt`, `full.txt`, `before.json`, and subsequent preservation metadata. These files are ephemeral; committed source/test commands reproduce behavior without them.

## Security assumptions, limitations and governance

Native JavaScript intrinsics/prototypes are assumed pristine. Bounded native JSON parsing is trusted; arbitrary hostile runtimes, memory exhaustion, execution timing, secure erasure and real browser/provider behavior are not certified. The function makes no callbacks, reads no external state, stores nothing, and has no imports, clock, randomness, network, browser or credential access. It cannot certify that a caller invented a string; synthetic prefixes and the evidence ceiling prevent any accepted data from becoming verified rights. Output contains no fixture identifiers. The documentation and tests use invented names only.

There are no token, OAuth, PAT, App, login, account, provider, persistent-storage or business writes. The module is disconnected from v1 adapters, Phase 07.03, the popup/worker, manifest, fixtures, workflows and SEC-01. No existing contract/schema/provider/evidence authority changes. The source and test are the only code files created.

D-04/B-02/B-03 remain **OPEN**; twelve historical security decisions remain **PENDING**. Phase 04 remains **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED**; Phase 07 parent **IN_PROGRESS / NOT ACCEPTED**; Phase 07.03 **COMPLETE / ACCEPTED — MOCK_ONLY**. Production remains **NO_GO**. The earlier owner R1 exception is not independent human security concurrence, and this new offline sequencing exception does not resolve real-authentication or parent acceptance gates. Historical BF-11 and operational/security blockers remain unchanged.

## Scope and next gate

Exactly four new files: [source](../../../src/github/permission-reader.mjs), [tests](../../../test/github-permission-reader.test.mjs), [Phase 08 parent](PHASE_08.md), and this report. Exactly six existing files receive append-only current records: [status](../../00_PROJECT_STATUS.md), [changelog](../../03_CHANGELOG.md), [evidence](../../04_TEST_EVIDENCE.md), [blockers](../../05_BLOCKERS_AND_DECISIONS.md), [handoff](../../06_HANDOFF.md), and [Phase 07 parent](../phase07/PHASE_07.md). All historical prefixes must remain byte-identical.

Local preflight matched root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`, branch `feature/sh-project-setup-extension-clean`, HEAD and local upstream `c80e17862434b0a46876e839f3d94767a9486760`, upstream name `origin/feature/sh-project-setup-extension-clean`, and fetch/push origin `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`. Remote fetch refspec is `+refs/heads/*:refs/remotes/origin/*`. Live remote verification at that SHA was supplied by the owner as ChatGPT evidence, not performed by this task. No network operation was run.

Skills used: Ponytail and Superpowers workflow, design/planning, test-first, debugging, verification and code-review guidance. Tools used: `functions.exec` with shell/Git/Python and `apply_patch`, plus a read-only review subagent. No application connector, external research or browser tool was used. Tool discovery found no WarpGrep; scoped local reads/searches used standard tools.

**NEXT:** ChatGPT review and owner decision, then separately authorized publication. Remain **READY_FOR_CHATGPT_REVIEW**, not ACCEPTED; official progress stays **29/72** until review, acceptance and publication permit **30/72**, leaving 42. **STOP.** No 08.02, staging, commit, push or real-provider work.

## Separate code-review result

A read-only subagent reviewed only the new module and test after GREEN. No actionable findings were identified within the documented offline contract. The reviewer ran no tests and did not independently verify the reported runtime/counts. This is AI-assisted code review, not the required ChatGPT review, owner acceptance or independent security certification.

## Preservation outcome

The [measured preservation record](../../04_TEST_EVIDENCE.md#phase-0801-measured-preservation-evidence) records exact before/after index hashes, normal and Codex references, protected stat metadata and six historical prefix hashes. Exactly ten authorized files changed: four created, six appended. Existing non-IDE files are preserved (242 in this worktree outside the six append targets; 213 in the sibling). Both indexes are unchanged and unstaged; both worktree identities, remotes/upstream and normal refs are unchanged. Codex-reference deltas are empty; provenance remains UNKNOWN. No network operation, staging, commit or push occurred.

Both `plemo-chats.xml` entry-to-final stat tuples match. The ignored `workspace.xml` files were first explicitly statted at final verification, so entry-to-final metadata equality for those files is NOT_ESTABLISHED. Later repeated stat metadata matches. No protected contents were inspected or modified, and metadata is not a content-equality proof. Local links in authored documentation and exact historical prefixes were checked. Historical unrelated worktree changes remain untouched.
