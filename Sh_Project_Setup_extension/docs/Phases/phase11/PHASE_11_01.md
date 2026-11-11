# Phase 11.01 — Offline utilities repository and path planner

2026-11-11 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Official progress **36/72 unchanged** pending independent acceptance/publication.
The owner authorized this offline sequencing exception, not completion of 10.03:
**10.03 BLOCKED / NOT AUTHORIZED**; [Phase 10](../phase10/PHASE_10.md) and
[Phase 11](PHASE_11.md) **IN_PROGRESS / NOT ACCEPTED**; production **NO_GO**.
Earlier progress statements remain historical; 36/72 is the current user-supplied
ledger, not a new acceptance or independently verified publication claim.

## Contract and scope

[utilities-plan.mjs](../../../src/github/utilities-plan.mjs) exports only
`planFixtureUtilities(text)`. Input is primitive canonical printable-ASCII JSON
(exact `JSON.stringify` form), at most **8,192 bytes**, containing an array of
**0–16** synthetic selections. Each entry has exactly `url` and `path` string
fields, each at most **200 characters**, with no surrounding whitespace.
Caller objects, coercion hooks, alternate encodings, duplicate JSON keys and
additional fields cannot supply authority. Native intrinsics are assumed pristine.

```js
planFixtureUtilities('[{"url":"https://github.com/fixture-org/fixture-repo.git","path":"addons/utility"}]');
```

The only import is the unchanged pure [popup validator](../../../src/popup/validation.mjs).
HTTPS `https://github.com/owner/repo`, SCP-style `git@github.com:owner/repo` and
`ssh://git@github.com/owner/repo` support optional `.git`, with casing normalized
for identity comparison. Embedded HTTPS credentials, non-`git` SSH users, passwords,
other hosts/schemes, ports, malformed URLs, query/fragment text and percent encoding
are rejected. Syntactic identity is not verified provider identity.

Relative POSIX paths reuse existing component rules: no traversal, absolute paths,
empty segments, backslashes, dot-prefixed Git/control paths, trailing dots, `.lock`
suffixes, device names or unsafe punctuation. Case-insensitive equality and
component-delimited ancestor/descendant comparisons detect conflicts; `a/b` does
not overlap `a/bc`. All pairs are considered (at most **120**); no first-conflict
truncation. Invalid entries do not hide conflicts in other individually valid fields.

Intentional differences from [03.03](../phase03/PHASE_03_03.md): primitive bounded
canonical JSON instead of caller objects; exact entry schema; no trimming;
parent/child overlap detection; sanitized frozen summaries instead of form messages.
The accepted popup behavior/tests are unchanged. Existing safe punctuation remains
accepted; no stronger provider-identity or filesystem claim is inferred. Regression
coverage also preserves the popup's `.git` / `.git.git` identity interpretation.

| `selectionState` | `outcome` | Meaning |
|---|---|---|
| `empty_optional` | `NO_ACTION` | Valid empty optional list |
| `invalid_input` | `BLOCKED` | Invalid fixture envelope, encoding, JSON or bounds |
| `invalid_entries` | `BLOCKED` | Invalid entry schema, URL or path; other diagnostics retained |
| `conflicts` | `MANUAL_REVIEW` | Duplicate identity, exact collision or path overlap |
| `valid` | `MANUAL_REVIEW` | Syntax passes; independent verification still required |

Entries contain only index, state and fixed reason codes. Conflict pairs contain
only indexes and fixed reasons. Invalid entries take aggregate precedence over
conflicts without dropping conflict diagnostics. No URLs, paths, identifiers,
credentials, arbitrary input or exception messages are returned. Results are
deeply frozen, deterministic and bounded below **16,384 printable-ASCII bytes**;
the 16-identical-entry fixture yields 120 pairs and **10,476 bytes**.

Every outcome carries `evidenceTier: SIMULATED`, `fixtureOnly: true`, `nextStep: manual`.
Account/permission verification, execution/mutation authorization, approval,
trusted continuing context, effects and module-installation flags are always false.
Existence, privacy/visibility, ownership, access, revision and branch availability
remain unknown; commit SHA, Gitlinks and `.gitmodules` content remain null.
Identity, permissions, revision and paths always require independent manual review.
A valid plan neither permits repository modification nor confirms module installation.

No Git mutation, remote command, provider API, authentication, credential handling,
browser operation, UI/worker/workflow integration, dependency, manifest/permission
change or accepted v1 adapter-contract change is included. Path checks do not
inspect an existing tree, symlinks or existing submodules. These remain manual.

## Automated evidence

Node **v24.19.0**, [119 new tests](../../../test/utilities-plan.test.mjs):

- Initial RED: empty export, **0 pass / 118 fail**, exit 1.
- Additional `.git` normalization regression: **0 pass / 1 fail**, exit 1, then fixed.
- One test expectation was corrected: deeply nested canonical JSON contains an
  invalid entry, not malformed JSON. Both classifications block; no validator was weakened.
- GREEN: **128 pass** (119 new + nine unchanged popup regressions), exit 0.
- Full native extension suite: **1,637 pass / 0 fail / 0 skip / 0 cancelled**, exit 0.
- Both new files pass syntax checks; new and existing source-isolation checks pass.
  Throwing capability sentinels observe zero network/browser/storage accesses.

From the extension directory:

```bash
node --test --test-reporter=tap test/utilities-plan.test.mjs test/popup-validation.test.mjs
node --test --test-reporter=tap test/*.test.mjs
node --check src/github/utilities-plan.mjs
node --check test/utilities-plan.test.mjs
```

Coverage includes every supported URL form, casing/suffix duplicates, all conflict
pairs, unsafe paths/URLs, malformed rows/envelopes, exact bounds, zero selections,
hostile hooks/proxies, privacy, determinism, deep immutability and authority denial.
Actual logs, original documentation prefixes, Git snapshots and audit results are
outside both worktrees at `/tmp/phase11-01-baseline/` (temporary evidence).
Skills used: Ponytail; Superpowers design/planning, execution, TDD, debugging and
verification. Tools: local shell/Git/Python 3/Node through functions tools, plus
a read-only reviewer subagent. No external-service or browser tool was used.

## Preservation and review boundary

Required root, branch `feature/sh-project-setup-extension-clean`, HEAD and local
upstream `b8d90ae0bfa364a86ff5047d63d9b9080a1fe572`, and origin
`https://github.com/https-Ali-Muhammed/Plementus-Tools.git` matched before edits.
Exactly **10 task files**: four new (planner, tests, two phase reports) and six
append-only ([status](../../00_PROJECT_STATUS.md), [changelog](../../03_CHANGELOG.md),
[evidence](../../04_TEST_EVIDENCE.md), [decisions](../../05_BLOCKERS_AND_DECISIONS.md),
[handoff](../../06_HANDOFF.md), [Phase 10](../phase10/PHASE_10.md)).
The pre-existing `.idea/plemo-chats.xml` change is outside task scope.
Protected IDE files and both sibling source documents receive metadata-only checks;
their contents are never read/hashed and no content-equality claim is made.

Final audit checks exact scope, six original byte prefixes, unchanged accepted
files/tests, both indexes/staged states, refs, worktree registrations/HEADs, Git
control files, sibling inventory and protected metadata, plus authored local links.
Historical **35 → 24 reference discrepancy remains UNVERIFIED**. No baseline repair,
fetch, branch switch, staging, commit, push or external write occurred.

Independent acceptance remains pending. **STOP for ChatGPT review; do not begin 11.02.**

Final measured audit: **PASS** — exact ten-file scope, six original prefixes,
all accepted files/tests, both index byte snapshots and empty staged states,
both worktree registrations/HEADs, all **27 current refs**, Git control files,
sibling inventory and protected metadata preserved. All **20 authored local
links resolve**; whitespace check passes. The 27-ref current snapshot does not
resolve the historical discrepancy. Read-only reviewer: no actionable defects;
119 planner tests and 121 additional repository-name pair comparisons passed.
This reviewer check does not constitute independent phase acceptance.
