# Phase 08.03 — Offline API failure classification

2026-11-09 (Africa/Cairo). Implementation/review record; **not accepted**. Official progress **31/72**.

## Design and implementation plan

The owner authorized only a disconnected fixture classifier and tests. Accepted 08.01/08.02 source, tests and historical reports remain unchanged; 08.02 acceptance/publication at `e21cc7e0bd3bd293f180373a0e1ed3c14ef28edd` is reconciled through append-only current records. The accepted v1 contract excludes GitHub. No product caller, adapter extension, integration, permission adoption or real provider schema is needed.

Implement the sole export `evaluateFixtureApiFailure(text)` with primitive canonical ASCII JSON input, maximum 128 bytes, a closed three-field schema (`status`, `hint`, `transport`) and a flat frozen output bounded to 512 bytes. The HTTP status is null or an integer 100–599; only an explicit representative subset is classified. Fixed hint/transport enums provide synthetic distinctions without response bodies, identifiers, headers or free text. Conflicting evidence never grants precedence to denial or rate limiting; it produces UNKNOWN. All 404 classifications preserve unverified existence. Every result keeps readOutcome UNKNOWN, nextStep manual and four false authority flags; no retry-related field or executor is needed.

1. Write complete table-driven tests, then retain RED against an empty export.
2. Implement only the pure classifier; run authorized syntax and focused tests to GREEN.
3. Run the full suite and read-only code review; append the six current records, then verify exact nine-file scope, document prefixes, links, protected bytes/metadata, indexes, refs and both worktrees.

Ponytail and previously read Superpowers planning/test-first/verification/review guidance are used within the owner's explicit file/command scope. No extra plan/ledger files, worktree creation, staging, commit or publication.


## Phase 08.03 recovery completion - 2026-11-11 (Africa/Cairo)

**Phase 08.03 READY_FOR_CHATGPT_REVIEW, not ACCEPTED.** Official progress remains **31/72**, with **41 remaining**, pending independent review and owner acceptance/publication. No Phase 09.01 work is authorized.

The owner identifies Phase 08.02 as ACCEPTED / PUBLISHED - FIXTURE_ONLY at `e21cc7e0bd3bd293f180373a0e1ed3c14ef28edd`. Current local branch HEAD and its local upstream both match that commit. Publication is owner-supplied provenance; this recovery did not contact GitHub or independently verify the live remote. Earlier pending 08.01/08.02 records remain historical and unchanged.

The historical **35 -> 24 reference discrepancy remains UNVERIFIED**. Missing baseline evidence prevents reconstruction or a continuity claim. The owner approved a one-time Phase 08.03 recovery exception and then limited the revised preservation exception to documented name-only additions/removals under `refs/codex/turn-diffs/`. Surviving names must retain their type and target; normal refs, both worktree registrations/HEADs and indexes must remain unchanged. The agent may not restore, delete, prune, retarget or repair refs. This exception grants no real API, browser, credential, storage, workflow, staging, commit, push, publication or later-phase authority.

Private durable evidence: `/home/https_ali_muhammed/.local/share/sh-project-setup-review/phase08-03/20261111T084612.284305Z/`. `baseline.json` records the prospective starting point at `2026-11-11T08:46:12.284305+00:00`; `baseline-refs.txt` contains all 25 current refs (10 normal, 15 Codex); `checkpoint-refs.txt` retains the earlier observed 24-ref inventory. Directories use mode 0700 and evidence files mode 0600. This establishes a new starting point only.

### Recovery scope and chronology

The three unfinished files existed before this recovery. Review found no demonstrable correction needed in the classifier or tests, and both remain byte-identical to the fresh baseline. This report also retains its original 1,947-byte draft as a prefix; the current record supersedes its pending plan where evidence is missing. The six existing tracking documents receive append-only dated records. No accepted 08.01/08.02 source, test or report changes are included.

The first recovery checkpoint observed 24 refs. The subsequent strict preflight observed 25 and stopped before baseline creation, edits or tests. At the owner's updated exception, the fresh baseline again contains 25 refs; the capture/checkpoint names differ. No cause is inferred from these observations. Full names and targets, including the original observed 24-ref inventory, are retained in the private evidence. A transcription note in `baseline.json` identifies the missing `930` substring in one ref name in the first chat summary; the original tool-observed metadata supplied the comparison identity.

Relative to the original observed 24-ref checkpoint, the new baseline records:

| Delta | Complete ref name | Target/type |
|---|---|---|
| Absent | `refs/codex/turn-diffs/captures/1794385850184/87227934-9400-47f4-8ed8-959ef1a6b969/base` | `89eb552f7f790321085a0831563cc182cc620baa` / tree |
| Added | `refs/codex/turn-diffs/captures/1794386625652/37d87d75-4495-42a6-ae4d-b6d7170c650f/base` | `89eb552f7f790321085a0831563cc182cc620baa` / tree |
| Added | `refs/codex/turn-diffs/checkpoints/f5b81e026760a4b8426746ca5f71d711/672fc4a3b23158851cea77ca04590f4d/1794386458237/dd4ba12b-125d-4238-8123-aced8b4f6ea4` | `89eb552f7f790321085a0831563cc182cc620baa` / tree |

All 23 surviving original ref names retain their targets and types. Both new names target the already-observed tree `89eb552f7f790321085a0831563cc182cc620baa`. The recovery guard stops on a retarget, a name delta outside the allowed namespace, an addition with an unknown target/type, worktree/index drift or an unrelated path change. It logs permitted name deltas without performing ref mutations. These safeguards do not reconstruct the historical 35 -> 24 gap.

### Public fixture contract

The sole export `evaluateFixtureApiFailure(text)` consumes primitive canonical ASCII JSON (maximum 128 bytes), validates a closed three-field fixture schema, and returns a bounded flat frozen summary (maximum 512 ASCII bytes). All own values are primitives, so the frozen result is deeply immutable. Every outcome retains `evidenceTier: "SIMULATED"`, `fixtureOnly: true`, `readOutcome: "UNKNOWN"`, `nextStep: "manual"`, and `accountVerified`, `executionAuthorized`, `approvalGranted`, `trustedContinuingContext` all false. Classification cannot establish actual access, existence, rights, rate limits, availability or successful reads.

| Field | Admitted values |
|---|---|
| `status` | `null` or integer 100 through 599 |
| `hint` | `none`, `permission-denied`, `rate-limited`, `not-found`, `hidden-resource` |
| `transport` | `none`, `timeout`, `connection-failure`, `interrupted` |

The caller must supply a primitive string. Printable ASCII, the size bound, parseability, own-key count, own field names, value types/enums and exact `JSON.stringify(parsed) === text` round-trip are required. Key order may vary when the round-trip preserves it. Whitespace padding, alternate number/string encodings, duplicate/extra/missing keys, nested payloads, boxed strings, objects and proxies are rejected. Caller hooks are not inspected or invoked. The contract assumes pristine native JavaScript intrinsics; it does not harden a compromised JavaScript realm.

Validation precedes semantic classification. A numeric HTTP status with a transport failure, or null status with a non-`none` hint, gives `UNKNOWN / contradictory_fixture`. Null status with `hint: none` and `transport: none` gives `UNKNOWN / missing_failure`. Unsupported numeric statuses yield `UNKNOWN / unsupported_status` after contradiction checks.

For HTTP rows below, `transport` must be `none`; incompatible hints for a supported status yield `UNKNOWN / contradictory_fixture`.

| Fixture status / hint | Category | Fixed reason |
|---|---|---|
| 401 / none | AUTHENTICATION_FAILURE | fixture_authentication_failure |
| 403 / none | UNKNOWN | fixture_ambiguous_403 |
| 403 / permission-denied | PERMISSION_DENIED | fixture_permission_denied |
| 403 / rate-limited | RATE_LIMITED | fixture_rate_limited |
| 404 / none | UNKNOWN | fixture_absent_or_hidden |
| 404 / not-found | UNKNOWN | fixture_not_found_unverified |
| 404 / hidden-resource | UNKNOWN | fixture_hidden_resource |
| 429 / none or rate-limited | RATE_LIMITED | fixture_rate_limited |
| 400 / none | REQUEST_ERROR | fixture_bad_request |
| 422 / none | REQUEST_ERROR | fixture_validation_error |
| 409 / none | CONFLICT | fixture_conflict |
| 500, 502, 503, 504 / none | PROVIDER_FAILURE | fixture_provider_failure |
| null / none / timeout | UNKNOWN | fixture_timeout |
| null / none / connection-failure | UNKNOWN | fixture_connection_failure |
| null / none / interrupted | UNKNOWN | fixture_interrupted |
| Malformed encoding/schema | UNKNOWN | invalid_fixture |

Only the listed representative 5xx codes receive PROVIDER_FAILURE. Other in-range codes, including 501, remain unsupported/UNKNOWN. A 403 without a compatible explicit synthetic hint stays ambiguous; no denial/rate-limit inference takes priority over a contradiction. A 404 never proves absence. Transport failures never prove provider state. The result contains fixed enums only: no supplied payload, raw error, URL, token, stack, request ID, header, quota, retry-after or reset time is echoed. There is no scheduling, automatic retry or retry assessment.

The module has no imports and no product caller. The source/test checks cover isolation from network/browser/storage/clock/scheduling globals, hostile caller values, deterministic repeated results and result immutability. The fixture classifier does not extend the accepted adapter contract or integrate with permissions, workflow or storage.

### Fresh verification and reproducibility

Fresh Node v24.19.0 verification on 2026-11-11: source syntax **exit 0**; test syntax **exit 0**; focused **289 PASS / 0 FAIL / 0 SKIP / 0 CANCELLED**, **exit 0**; full **1,034 PASS / 0 FAIL / 0 SKIP / 0 CANCELLED**, **exit 0**. All five commands, including `node --version`, exited 0; stderr was empty. The earlier 289 focused and 745 pre-08.03 full counts are historical comparison figures, not substitutes for these runs.

Historical RED logs are **UNAVAILABLE**. The pre-interruption plan above is a plan, not proof that RED was captured. This recovery retained the existing classifier and test bytes, made no empty-export substitution, and claims only the fresh GREEN/syntax evidence saved here.

Run from `Sh_Project_Setup_extension` with Node v24.19.0:

```bash
node --version
node --check src/github/api-error-fixtures.mjs
node --check test/github-api-error-fixtures.test.mjs
node --test test/github-api-error-fixtures.test.mjs
node --test test/*.test.mjs
```

`verification-results.json` records exact commands/cwd, UTC start/end, exit codes, stdout/stderr filenames, SHA-256 fingerprints and totals. `node-version`, `source-syntax`, `test-syntax`, `focused` and `full` each have separate `.stdout.log` and `.stderr.log` files. Focused ran at 08:48:08.274984 through 08:48:08.720285 UTC; full ran at 08:48:08.855763 through 08:48:10.815411 UTC. The focused suite contains 220 HTTP matrix cases, 20 null-status transport/missing cases and 49 further tests, including exhaustive unsupported status/hint combinations and boundary/hostile-input checks. The full run includes the accepted suites unchanged; 745 historical baseline tests plus 289 focused tests equals the observed 1,034 total, but this arithmetic is not the verification evidence.

The recovery guard ran before and after every command. `preservation-checks.jsonl` records complete observed refs and deltas plus index/worktree/path/prefix checks. `verify_preservation.py` and `run_verification.py` reproduce these local checks; both reside outside the worktrees. `final-audit.json` records the final scope, prefix, accepted-file, link, syntax and formatting results. The appended verification closure below records the observed final outcome.

### Exact nine-path package and prospective fingerprints

Paths in this table are relative to the extension root:

| Path | Disposition |
|---|---|
| [src/github/api-error-fixtures.mjs](../../../src/github/api-error-fixtures.mjs) | Existing untracked implementation retained unchanged |
| [test/github-api-error-fixtures.test.mjs](../../../test/github-api-error-fixtures.test.mjs) | Existing untracked tests retained unchanged |
| [docs/Phases/phase08/PHASE_08_03.md](PHASE_08_03.md) | Existing untracked draft completed by appending this record |
| [docs/Phases/phase08/PHASE_08.md](PHASE_08.md) | Append current parent ledger |
| [docs/00_PROJECT_STATUS.md](../../00_PROJECT_STATUS.md) | Append current progress/status |
| [docs/03_CHANGELOG.md](../../03_CHANGELOG.md) | Append recovery package entry |
| [docs/04_TEST_EVIDENCE.md](../../04_TEST_EVIDENCE.md) | Append fresh evidence/provenance |
| [docs/05_BLOCKERS_AND_DECISIONS.md](../../05_BLOCKERS_AND_DECISIONS.md) | Append owner exception and unchanged gates |
| [docs/06_HANDOFF.md](../../06_HANDOFF.md) | Append independent review handoff |

Original new-file SHA-256 fingerprints:

- `src/github/api-error-fixtures.mjs`: `3a4310e683fe49269eafcd27e8bc18e33c2e514e7a9ba505a088328c5bc3015a` (5031 bytes).
- `test/github-api-error-fixtures.test.mjs`: `be5338880356a73ea456f64df22aa066f50aefecce58bc85311e940fd0d5c429` (12643 bytes).
- `docs/Phases/phase08/PHASE_08_03.md`: `99963f9d5c8904d8c7b8175bb1312c44054cf714721275790f2b6fbc2c48c0a4` (1947 bytes).

Original six-document Git-blob identities at HEAD/index:

| Document | Blob SHA | Original prefix bytes |
|---|---|---:|
| `docs/Phases/phase08/PHASE_08.md` | `eb8d0cbf6405d11a40fa303ee7b37425708de20e` | 2532 |
| `docs/00_PROJECT_STATUS.md` | `9ae21ecab0e02bf4bc854671f986df615fbdcbed` | 80459 |
| `docs/03_CHANGELOG.md` | `849d6306d6c932bd27a18b43b68795f8518cf135` | 85868 |
| `docs/04_TEST_EVIDENCE.md` | `95b0d81c28bf7783373b4370f72ebe59b899af8f` | 193946 |
| `docs/05_BLOCKERS_AND_DECISIONS.md` | `2c136311377b775d869dd11d7093ca22776727ba` | 73699 |
| `docs/06_HANDOFF.md` | `c08aa8f569e60760ec7c52eaceef034a0525e79d` | 95894 |

Both index files remain external to the authored package. Prospective SHA-256 fingerprints:

- Main `/home/https_ali_muhammed/Plementus/Tools/.git/index`: `97d6cfaa9e3a713c1e1d5e5579b62f43a7c03d8699f0738db7fbba0f5a2bf1cd` (212 entries).
- Requested `/home/https_ali_muhammed/Plementus/Tools/.git/worktrees/Tools-sh-project-setup-extension-clean/index`: `b8bbc6cbf82f1d0b03eb112768665c7df6ed074528167f5217b9399ed296f441` (256 entries).

The main worktree remains on `feature/sh-project-setup-extension` at `390c9ea7c311f362ea04aad64ed14569161642ec`; the requested worktree remains on `feature/sh-project-setup-extension-clean` at `e21cc7e0bd3bd293f180373a0e1ed3c14ef28edd`. Effective origin fetch/push URL remains `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`. No staged paths existed at baseline. The requested worktree's only pre-existing tracked stat mismatch was `.idea/plemo-chats.xml`; the three Phase 08.03 files were its only untracked paths. The main worktree's two untracked `docs/_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md` and `docs/_source/ODOO_SH_PROJECT_SETUP_NEXT_CHAT_HANDOFF.md` files remain untouched.

Both `.idea/plemo-chats.xml` and `.idea/workspace.xml` in both worktrees receive path/stat checks only. Their contents are not read, hashed or diffed; no IDE byte-equality claim is made. The old draft phrase about protected bytes is superseded by this restriction. For unrelated tracked files and sibling source documents, preservation evidence is metadata-level; accepted 08.01/08.02 files, the retained 08.03 source/tests and original document prefixes additionally have content fingerprints. No evidence claims continuity before this prospective baseline.

### Review boundary and unchanged security gates

Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED**; Phase 07 parent **IN_PROGRESS / NOT ACCEPTED**; Phase 07.03 **ACCEPTED - MOCK_ONLY**; Phase 08.01 and 08.02 **ACCEPTED / PUBLISHED - FIXTURE_ONLY**; Phase 08 parent **IN_PROGRESS / NOT ACCEPTED**. D-04/B-02/B-03 remain **OPEN**; twelve historical security decisions remain **PENDING**; production **NO_GO**.

**Phase 08.03 READY_FOR_CHATGPT_REVIEW, not ACCEPTED.** Official progress remains **31/72**, with **41 remaining**, pending independent review and owner acceptance/publication. No Phase 09.01 work is authorized.

Independent ChatGPT review and the owner's subsequent publication decision remain outstanding. Fresh synthetic test success does not supply security concurrence or real-provider acceptance. Historical BF-11 denial/NOT_RUN limitations and prior SEC-01/Phase 06 blockers remain unchanged. There is no Phase 09 work, staging, commit or push.

Skills used for this recovery: Ponytail, Superpowers execution/verification/review guidance and Stop Slop. Local Git/Python/Node tools supply the evidence; no external-service MCP or provider access is involved. The owner's exact file scope overrides generic skill suggestions to create plan files, worktrees or commits. The recovery does not recreate missing RED evidence or advance a phase without review.


## Final audit closure under owner IDE metadata exception - 2026-11-11 (Africa/Cairo)

The owner approved a one-time metadata exception for `.idea/workspace.xml` and `.idea/plemo-chats.xml` only. Their contents remain uninspected and untouched by this recovery. The observed workspace-file stat change (3,241 to 4,509 bytes plus timestamps) has an **UNKNOWN** cause. The earlier stop remains recorded in `blocked-preservation.json`; this completed audit supersedes its pending status under the explicit exception, without erasing the event.

Final audit: **PASS under the documented exceptions**. Exactly nine package paths remain: three existing untracked 08.03 files and six appended documents. All six original document bodies and the unfinished report's original draft remain exact prefixes. Retained 08.03 source/tests and accepted 08.01/08.02 files are unchanged; both indexes, worktree registrations/HEADs, normal refs, surviving Codex targets/types, non-exempt tracked metadata and sibling source-document metadata pass preservation checks. No staging or agent ref mutation occurred.

The audit checked 459 local Markdown target paths, 15 authored link occurrences, UTF-8, balanced fences, authored inline-code/link structure, LF, final newlines and authored whitespace; all passed. Link checking establishes path existence, not fragment-anchor validity. Git whitespace check exited 0. The Node v24.19.0 recovery logs retain 289 focused and 1,034 full PASS, zero FAIL/SKIP/CANCELLED, both syntax checks and all command exits 0. This final audit verified log fingerprints and unchanged source/test hashes; it did not rerun those tests.

**08.03 READY_FOR_CHATGPT_REVIEW, not ACCEPTED.** Official progress remains **31/72**, 41 remaining. Historical **35 -> 24 preservation remains UNVERIFIED**, RED logs remain UNAVAILABLE, and production remains **NO_GO**. All previously listed security and parent-phase gates remain unchanged. Stop for independent ChatGPT review and the owner's publication decision; no staging, commit, push, live-provider access or Phase 09 work.

### Amended audit evidence and remaining review limits

The original `baseline.json`, original helpers and failure record remain intact. `owner-ide-metadata-exception.json` records the owner's narrow authorization; `verify_preservation_ide_exception.py` logs stat differences for exactly the two protected names in both worktrees. It still stops on non-exempt path drift, index/worktree drift, normal-ref deltas and changes to any observed ref name's target/type. IDE stat evidence is not an IDE content-preservation claim.

The original helper also imposed an unrequested known-target-only test on new ref names. The amended helper follows the approved name-based rule: a newly added name may identify a new tree, while a surviving or previously observed name must retain its target and type. This correction supersedes the earlier report sentence about stopping on unknown addition targets; it does not permit existing-name retargeting. No ref objects were opened, repaired or mutated, and no cause is inferred for the name changes.

At this final audit there are 25 refs (10 normal, 15 Codex). Relative to the fresh baseline, two names are absent and two new names are present; all surviving names retain targets/types. Complete deltas:

| Delta | Ref name | Target/type |
|---|---|---|
| Absent | `refs/codex/turn-diffs/captures/1794386625652/37d87d75-4495-42a6-ae4d-b6d7170c650f/base` | `89eb552f7f790321085a0831563cc182cc620baa` / tree |
| Absent | `refs/codex/turn-diffs/checkpoints/f5b81e026760a4b8426746ca5f71d711/672fc4a3b23158851cea77ca04590f4d/1794386458237/dd4ba12b-125d-4238-8123-aced8b4f6ea4` | `89eb552f7f790321085a0831563cc182cc620baa` / tree |
| Added | `refs/codex/turn-diffs/captures/1794388079008/d973f8ec-80dc-4dd2-b2c3-4ac0f50d6204/base` | `617aa5e9c977add7522567e63baa0c9711738029` / tree |
| Added | `refs/codex/turn-diffs/checkpoints/f5b81e026760a4b8426746ca5f71d711/03e7c982f2d87284ae61fc0c8e99ac8d/1794387220767/2a44c65b-38dc-4e01-82c1-1dcf4d00750e` | `617aa5e9c977add7522567e63baa0c9711738029` / tree |

`preservation-checks.jsonl` captures complete observed inventories and all protected stat tuples; `final-audit.json` captures the final package hashes, scope, links, formatting and preservation results. `pre-closure-audit.json` preserves the first passing amended audit. `retained-test-evidence-check.json` verifies the existing fresh test logs without rerunning code. Evidence remains at the private durable directory listed above with owner-only permissions. Reproduce the amended audit with `PYTHONDONTWRITEBYTECODE=1 python3 audit_package_ide_exception.py` from that directory.

A read-only internal reviewer found no actionable Critical, Important or Minor findings in the classifier/tests and pre-closure documentation; `internal-review.txt` retains the result and limits. The reviewer did not run tests or edit files and did not assess live publication/provider behavior, missing historical RED logs, historical ref continuity, protected IDE contents/drift causes or this subsequently appended closure. Root verifies the closure's preservation, links and formatting after writing it. The internal review is not the required independent ChatGPT acceptance or security concurrence.
