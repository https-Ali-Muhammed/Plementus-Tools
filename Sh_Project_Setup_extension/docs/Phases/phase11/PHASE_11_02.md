# Phase 11.02 — Offline .gitmodules and Gitlink validation

2026-11-11 (Africa/Cairo). **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Owner-supplied [11.01](PHASE_11_01.md) acceptance/publication baseline:
`a0f23ba9ceba3c558c275a42601f1e611c1ae27e`. Official progress stays **37/72**
pending independent acceptance and publication. [Phase 10](../phase10/PHASE_10.md)
and [Phase 11](PHASE_11.md) remain **IN_PROGRESS / NOT ACCEPTED**;
**10.03 BLOCKED / NOT AUTHORIZED**; production **NO_GO**.

## Fixture contract

[submodule-structure.mjs](../../../src/github/submodule-structure.mjs) exports
`validateFixtureSubmoduleStructure(text)`. The primitive string is canonical JSON
(exact `JSON.stringify` representation), with only these optional fields:

```js
JSON.stringify({
  gitmodulesText: '[submodule "custom-name"]\npath = addons/example\nurl = https://github.com/fixture-org/example.git\n',
  tree: [
    { path: '.gitmodules', mode: '100644', oid: 'a'.repeat(40) },
    { path: 'addons/example', mode: '160000', oid: 'b'.repeat(40) },
  ],
})
```

`gitmodulesText` holds actual synthetic file text, never tree metadata. `null`
explicitly represents an absent file; omission means unknown content.
`tree` is an explicitly complete synthetic inventory of root-relative entries
across superproject directories, excluding the interior of Gitlinks. Directory
entries may be omitted; supplied ancestors must be directories. `[]` means an
explicitly empty inventory; omitted/null `tree` means missing metadata. A missing
entry `mode` or `oid` also requires manual review; a supplied invalid value blocks.
Each entry has only `path`, `mode`, `oid`; `path` is required. No caller object,
getter, proxy, coercion hook, extra authority field or duplicate JSON key is trusted.
Native intrinsics are assumed pristine. No real tree is read or inventoried.

Bounds: **32,768 UTF-16 code units** per envelope; **8,192** for decoded file text;
**256** LF-separated lines (including final empty line), **512** code units per
line before trimming (including CR); **16** sections; **128** tree entries;
**200** characters per recognized subsection name, path and URL. Overlimits are
rejected, never truncated. Non-ASCII file text falls back manually; forbidden
control bytes and lone CR block. Nested JSON is rejected without recursive input
walking; parse/stringify errors become sanitized `invalid_input`.

## Recognized subset and conservative fallback

The narrow parser supports blank lines, whole-line `#`/`;` comments, LF/CRLF,
surrounding horizontal whitespace, `[submodule "name"]`, and `path = value` /
`url = value`. Section/key keywords are case insensitive; names and paths retain
case. Names use ASCII letters/digits/underscore/dot/slash/hyphen and need not equal
checkout paths. Values are single unquoted tokens; no escaping or inline comments.
Both required keys must occur exactly once; repeated sections are blocked.

The unchanged pure [popup validation primitive](../../../src/popup/validation.mjs)
is the only import. Checkout paths reuse its conservative safe relative-component
rules (no traversal, dot-prefixed components, device names, trailing dots, `.lock`
suffixes or unsafe punctuation). Recognized URLs are its GitHub HTTPS, SCP-style
`git@github.com:` and `ssh://git@github.com/` forms. Relative URLs require manual
review without resolution; other URL forms, credentials or ambiguous URL semantics
are unsupported and never acted upon. Empty/overlong URL values block.

Quoted/escaped values, continuations, whitespace inside values, inline comments,
legacy dotted sections, includes, unknown sections, non-ASCII text, names outside
the subset, and every optional key (including branch/update/ignore/shallow) return
`unsupported_syntax`. Parsing stops at the unsupported construct; declaration
completeness, missing-key and Gitlink correlation are not inferred from a partial
parse. Independently detectable tree errors still block. Obvious malformed section
headers and assignments outside a section block. This is not a general Git parser.

Tree modes are exact strings: `100644`, `100755`, `120000`, `040000`, `160000`.
Ordinary entries use bounded ASCII relative paths; dotfiles are allowed, but empty,
`.`/`..`/`.git` components, trailing dots and unsafe punctuation are rejected.
`.gitmodules` must be a regular file when text is supplied. A symlink, directory,
Gitlink or implicit `.gitmodules/child` representation blocks. Case aliases require
manual review; literal path correlation remains case sensitive.

Every declared path is correlated to exactly one valid Gitlink. Missing/orphan
Gitlinks, duplicate tree entries, duplicate declared paths, parent/child declaration
overlaps, conflicting modes and descendants beneath non-directories block.
Case aliases/overlaps with otherwise valid structure require manual review.
Object IDs accept exactly **40 or 64 hexadecimal characters**, either case,
including all-zero strings as syntax only. Mixed lengths require manual review.
No existence, object type or reachability is inferred from hexadecimal syntax.

Git confirms separate name/path mappings, required path/URL keys and the symlink
restriction: [gitmodules](https://git-scm.com/docs/gitmodules). Its description of
Gitlinks and configuration precedence informs the limits here:
[gitsubmodules](https://git-scm.com/docs/gitsubmodules). These references do not
expand the recognized subset or authorize any operation.

## Deterministic results

| Outcome / structureState | Meaning |
|---|---|
| `NO_ACTION` / `empty` | Explicit complete empty declaration/Gitlink structure; ordinary entries permitted |
| `BLOCKED` / `invalid` | Invalid envelope, bounds, required data or structural conflict; takes precedence |
| `MANUAL_REVIEW` / `review_required` | Missing metadata, unsupported syntax/URL or ambiguous semantics |
| `MANUAL_REVIEW` / `matched` | Complete supported synthetic match; remains unverified |

Results contain only counts (`sections`, `treeEntries`, `gitlinks`, `matched`),
sorted unique fixed reasons and fixed status/authority fields. Counts describe
parsed/supplied data, not verified repository facts; `matched` stays zero when
configuration parsing is incomplete. Results are deeply frozen, deterministic,
under **4,096 serialized characters**, and never echo names, paths, URLs, object
IDs, arbitrary input or exception messages. Reasons are:

- Envelope/data: `invalid_input`, `input_limit`, `invalid_gitmodules_text`,
  `invalid_tree_metadata`, `invalid_tree_entry`, `invalid_tree_mode`, `invalid_object_id`.
- Configuration: `malformed_section`, `key_outside_section`, `missing_path`,
  `missing_url`, `duplicate_key`, `duplicate_section`, `invalid_path`, `invalid_url`,
  `duplicate_path`, `path_overlap`.
- Correlation: `missing_gitlink`, `orphan_gitlink`, `path_type_conflict`,
  `duplicate_tree_entry`, `tree_path_conflict`, `gitmodules_presence_conflict`,
  `gitmodules_symlink`, `gitmodules_type_conflict`.
- Manual: `missing_gitmodules_text`, `missing_tree_metadata`, `unsupported_syntax`,
  `relative_url`, `unsupported_url`, `case_ambiguity`, `mixed_object_formats`.
- Otherwise: `empty_structure`, `synthetic_match_unverified`.

Every result has `SIMULATED` evidence, `fixtureOnly: true`, and `nextStep: manual`.
Account/permission verification, approval, execution/mutation authorization,
effects, trusted continuing context, module installation, real-tree verification
and commit-reachability verification are always false. `.gitmodules` is not a
complete authorization, initialization or installation record. A match proves
neither access, a Gitlink in a real tree, reachable commits nor successful Odoo
module installation. No Git process, network, credential, browser, storage,
popup/worker/coordinator integration, manifest change or dependency is introduced.
The Phase 11.01 planner and its isolation test remain unchanged and unreferenced
by this new source.

## Test evidence and preservation

Node **v24.19.0**; [133 new tests](../../../test/submodule-structure.test.mjs).
Initial missing-module RED was followed by an empty export stub: **0 pass / 123 fail**.
First implementation: **123 pass**. Two additional edge regressions produced
**131 pass / 2 fail**, then passed after handling implicit `.gitmodules` directories
and case aliases. Final focused GREEN: **252 pass** (133 new + 119 unchanged 11.01).
Complete extension suite: **1,770 pass / 0 fail / 0 skip / 0 cancelled**, exit 0.
New and existing source-isolation checks pass; capability sentinels observe no
network/browser/storage access. Both new files pass syntax checks.

From the extension directory:

```bash
node --test --test-reporter=tap test/submodule-structure.test.mjs test/utilities-plan.test.mjs
node --test --test-reporter=tap test/*.test.mjs
node --check src/github/submodule-structure.mjs
node --check test/submodule-structure.test.mjs
```

Exact task scope: **nine files — three new, six append-only**. Original document
prefixes, other accepted files/sources/tests, both indexes and staged states, refs,
worktree registrations/HEADs and Git control files are checked against the pre-edit
snapshot. Protected IDE files and the entire sibling inventory (including its two
source documents) receive metadata-only checks; contents are never read/hashed,
and no protected-content equality is claimed. Pre-existing IDE changes remain out
of scope. Temporary logs and audit snapshots: `/tmp/phase11-02-evidence/`.
Historical **35 → 24 reference discrepancy remains UNVERIFIED**.

Skills used: Ponytail; Superpowers TDD and verification, with design/planning
considerations bounded by the owner's explicit scope and no-extra-gates instruction.
Tools: local shell/Git/Python 3/Node via functions tools, and read-only official Git
web documentation. No subagent, browser or connected-service operation was used.

**STOP for ChatGPT review.** No staging, commit, push, publication or Phase 11.03.

Final preservation audit: exact nine-file scope, six original byte prefixes,
all 265 other tracked non-IDE files, both index byte snapshots/empty staged states,
all 27 refs, worktree registrations/HEADs, Git control files and sibling inventory
are unchanged. Protected `.idea/plemo-chats.xml` metadata is unchanged. Protected
`.idea/workspace.xml` metadata changed during the task; cause and content equality
remain **UNVERIFIED**. Its contents were never opened/hashed/edited by this work.
This metadata exception is reported, not repaired or treated as preservation proof.
