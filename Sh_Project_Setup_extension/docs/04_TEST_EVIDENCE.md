# Test and validation evidence

## BF-01-R1 rework — 2026-11-03 (Africa/Cairo)

[Rework report and precedence contract](Phases/phase07/PHASE_07_BROWSER_FIRST_TAB_RECOGNITION_SPIKE.md#bf-01-r1-rework-unknownblocked-precedence--2026-11-03-africacairo). Node v24.19.0; commands from the extension directory. Before edits: **26 focused PASS**. Exactly three added tests reproduced missing-prior/current-denial, missing-URL/malformed-document and earlier-role-missing/other-role-denied failures before implementation changed; each received `unknown` instead of `blocked`.

| Exact command / stage | Observed result |
|---|---|
| RED `node --test test/tab-recognition.test.mjs` | **26 PASS / 3 FAIL**, exit 1; expected assertion failures |
| GREEN `node --test test/tab-recognition.test.mjs` | **29 PASS**, 0 FAIL/SKIP/CANCELLED/TODO; exit 0 |
| `node --test test/*.test.mjs` | **242 PASS = unchanged 213 + focused 29**, 0 FAIL/SKIP/CANCELLED/TODO; exit 0 |
| `node --check src/browser/tab-recognition.mjs` | **PASS**, exit 0 |
| `node --check test/tab-recognition.test.mjs` | **PASS**, exit 0 |

The three regressions also exercise malformed available metadata, known URL/document mismatches with a different missing field, both snapshots and later selected-role violations. Existing genuine-unavailability cases remain GREEN. No original focused or other tests were removed or changed. Logs, protected-byte/index baseline and structural results: `/tmp/bf01-r1-r07q7k4t/`. Historical **26 focused / 239 full** results below remain unchanged.

Structural recheck **PASS**: exactly nine authorized changed paths, unchanged inventory (**219 tracked / 3 untracked**), zero staged files and byte-identical index; all **213 protected tracked files** equal both preflight bytes and HEAD. All seven pre-existing Markdown bodies and all 26 original focused tests remain intact. Master/source byte equality and SHA-256 `d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91` preserved. Across seven changed Markdown files: **298 local links / 21 fragment targets / 0 broken**. `git diff --check` and all nine file whitespace/final-newline checks PASS. One-export/no-integration scan, both syntax checks and refreshed root/branch/all origin fetch/push URLs/HEAD/upstream/live-tip checks PASS. Ignored `.idea/workspace.xml` was never read, hashed or changed. Executed checker: `python3 /tmp/bf01-r1-r07q7k4t/verify.py`; results: `verification.json`.

All gates unchanged: **5/20 master; 28/72 official micro-phases**; Phase 04 **BLOCKED**, Phase 06 **PARTIAL / BLOCKED**, Phase 07 **IN_PROGRESS**, 07.03 **NOT_AUTHORIZED**, production **NO_GO**. Browser/provider/account/lifecycle checks **NOT RUN**; no runtime authority or security-policy change. **READY_FOR_CHATGPT_REVIEW / OFFLINE_SIMULATED; STOP FOR INDEPENDENT CHATGPT REVIEW.** No staging/commit/push.

## Offline tab-recognition spike — 2026-11-02 (Africa/Cairo)

[Report, case matrix and official Chrome sources](Phases/phase07/PHASE_07_BROWSER_FIRST_TAB_RECOGNITION_SPIKE.md). **READY_FOR_CHATGPT_REVIEW / OFFLINE_SIMULATED**, an offline prerequisite, not 07.03. Node v24.19.0, extension directory. Baseline full suite **213 PASS**; initial focused RED **0 PASS / 25 FAIL** against nonfunctional export; first GREEN **25 PASS**; additional coercion regression **25 PASS / 1 FAIL**, then corrected before final runs.

| Exact final command | Observed result |
|---|---|
| `node --test test/tab-recognition.test.mjs` | **26 PASS**, 0 FAIL/SKIP/CANCELLED/TODO |
| `node --test test/*.test.mjs` | **239 PASS = unchanged 213 + new 26**, 0 FAIL/SKIP/CANCELLED/TODO |
| `node --check src/browser/tab-recognition.mjs` | **PASS**, exit 0 |
| `node --check test/tab-recognition.test.mjs` | **PASS**, exit 0 |

Saved logs/baseline and final structural checker reside at `/tmp/tab-recognition-spike-8cu4h576/`. Executed from the verified Git root: `python3 /tmp/tab-recognition-spike-8cu4h576/verify.py` (exit 0), producing `verification.json`.

| Structural check | Measured result |
|---|---|
| Exact authorized scope / index | **9 paths**, six modified + three new; zero staged; index entries and tracked inventory unchanged |
| Other tracked files equal HEAD | **213 PASS**: 205 match preflight hashes and HEAD, 8 tracked IDE configuration files separately equal HEAD; ignored IDE contents not read/hashed |
| Original tracking bodies | **6 PASS**, historical content preserved as exact suffixes |
| Master / canonical source | Byte-identical and unchanged; SHA-256 `d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91` |
| Local links across seven changed Markdown files | **289 links / 12 fragment targets / 0 broken** |
| Module dependency scan and manual review | **PASS**: one export, no imports, actual Chrome/provider/network/storage/DOM/logging/timer/clock dependency; only new test calls it |
| Fixture privacy | **PASS**: credential-pattern scan and manual invented-value review; no actual accounts, customer values or credentials |
| Whitespace | **PASS**: `git diff --check` plus trailing whitespace/final-newline checks of all nine files, including all three untracked files |
| Final Git refresh | Expected root/branch/origin URLs/HEAD/upstream/live remote tip unchanged; only authorized paths dirty |

No Chrome/browser/provider/account/lifecycle test ran. Wrong-account handling proves only that account verification stays false; popup/worker tests model invalidation markers only. A stateless function cannot detect reuse of identical stale snapshots or establish a real account, permission grant, browser document, trusted age or operator authority. The first structural-check attempts exposed checker assumptions (tracked IDE exclusions and a scan matching the literal synthetic word `document`); those checker errors were corrected without changing implementation behavior, then the complete checker passed.

Git entry root/branch/origin fetch/push URLs/upstream/live tip matched expected HEAD `40ff873fbf4ad6c97e372b573fddac5176835a63`; complete initial worktree clean apart from ignored IDE metadata whose contents were never accessed. Public official Chrome research and read-only Git metadata only. Progress **5/20 master phases; 28/72 official micro-phases** unchanged; Phase 04 BLOCKED, Phase 06 PARTIAL/BLOCKED, Phase 07 IN_PROGRESS, 07.03 NOT_AUTHORIZED, production NO_GO. No commit/push. **STOP FOR INDEPENDENT CHATGPT REVIEW.**

## Browser-first owner direction amendment — 2026-11-02 (Africa/Cairo)

[Assessment](Phases/phase07/PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md): **OWNER_ARCHITECTURE_DIRECTION / SECURITY_REVIEW_PENDING; READY_FOR_INDEPENDENT_CHATGPT_REVIEW**. Supplied 07.02 documentation acceptance recorded; historical reports retain their pending-review text and all twelve PENDING decisions. Progress **5/20 master phases; 28/72 official micro-phases**. D-04/B-02 OPEN; Phase 04 BLOCKED; Phase 06 parent PARTIAL/BLOCKED; Phase 07 parent IN_PROGRESS; production NO_GO; 07.03 NOT_STARTED/NOT_AUTHORIZED. No historical test count is a new run.

Verified Git root/branch/origin fetch and push URLs/upstream name/SHA/live remote tip at `f447b3d2cf77072598d6904cedd3e18176b7b28a`; complete initial staged/unstaged/untracked worktree clean. Ignored IDE contents excluded from inspection and hashing. Tracked-only baseline and checker: `/tmp/phase0702-browser-first-_4h18ail/`. No fetch or Git mutation.

Public documentation: web.run retrieved current official tabs, scripting, content-script isolation, permission declarations/API, activeTab, messaging, MV3 lifecycle and GitHub acceptable-use/terms pages. [Source register](Phases/phase07/PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md#11-current-official-source-register) records ten sources and claim boundaries. Initial activeTab canonical URL timed out; the official query-form page succeeded. No source proves selectors, operator authority, policy compatibility or site writes.

### Amendment verification results

Executed from the verified Git root: `python3 /tmp/phase0702-browser-first-_4h18ail/verify.py` (exit 0). Python standard-library assertions and read-only Git checks produced `/tmp/phase0702-browser-first-_4h18ail/verification.json`; these are documentation checks, not application tests.

| Check | Measured result |
|---|---|
| Exact whole-repository scope | **7 paths: six modified, one untracked new report; zero staged or unexpected paths** |
| Git identity and index | Expected root/branch/origin URLs/upstream/HEAD; index entries and tracked path inventory unchanged |
| Protected bytes | **212 of 218 tracked files** outside the six modifications equal baseline hashes and HEAD bytes, including historical 07.01/07.02, all Phase 04/06, master/source/ADR/contracts/security, code/manifest/tests/fixtures/dependencies |
| Historical tracking and acceptance | Original bodies of all six modified documents retained as exact suffixes; prior 07.01/offline 06.04 acceptance records intact; 07.02 later documentation acceptance recorded prospectively |
| Master/source equality | Byte-identical; unchanged SHA-256 **d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91** |
| Decisions and feasibility | **12 historical PENDING items; 12 prospective PENDING rows; 13 operation rows**; D-04/B-02 OPEN; no implementation/security approval |
| Current status gates | 5/20 and 28/72; Phase 04 BLOCKED, Phase 06 parent PARTIAL/BLOCKED, Phase 07 parent IN_PROGRESS, production NO_GO; 07.03 NOT_STARTED/NOT_AUTHORIZED |
| Local Markdown destinations | **281 links, including 11 fragment targets; zero broken** across all seven changed documents |
| Official source provenance | **10 official Chrome/GitHub source-register entries**; manual source-to-claim review; selectors/policy fit/accounts/live behavior remain UNVERIFIED |
| Limited secret-pattern scan | Added text/new report: no GitHub-token or private-key pattern matches; manual review found no credentials/customer values. Pattern scanning does not prove absence of every secret |
| Whitespace and newlines | git diff --check and git diff --cached --check PASS; added lines free of trailing whitespace; all seven files have LF/final newline; historical Markdown hard breaks preserved |
| Ignored IDE metadata | Content excluded from inspection/hashing/edits; no ignored-metadata preservation claim depends on reading private contents |

The full checker repeated after recording these results with the same checks/counts and exit 0. A repeated live-tip query with credential helpers/prompts disabled returned the expected full `f447b3d2cf77072598d6904cedd3e18176b7b28a` SHA. No forbidden Git operation or product test ran.

**Application tests: NOT RUN. Browser tests: NOT RUN. Provider tests: NOT RUN.** No extension execution, profile/tab/DOM inspection, permission grant, authentication, credential access, provider API client, backend or external write. Skills: Superpowers using-superpowers and verification-before-completion, Ponytail full, Stop Slop. Tools: shell/Git/Python and apply_patch through functions.exec; web.run public research. WarpGrep/Valyu unavailable; no browser-control tool, authenticated connector or subagent used. **STOP FOR INDEPENDENT CHATGPT REVIEW.** No commit or push.

## Historical Phase 07.02 evidence — preserved

The original measured results below belong to that task, not this amendment. Its historical 27/72 and pending-review wording remain unchanged; the current amendment records supplied documentation acceptance only.

## Phase 07.02 — documentation-only evidence, 2026-11-02 (Africa/Cairo)

[Decision package](Phases/phase07/PHASE_07_02.md) is **READY_FOR_OWNER_SECURITY_DECISION / READY_FOR_CHATGPT_REVIEW**, not accepted or approved. Supplied **07.01 ACCEPTED at published `b04d0d4`** reconciled in current tracking only; its whole report and historical evidence remain byte-identical. Progress **5/20 and 27/72**; twelve decisions PENDING; D-04/B-02 OPEN; Phase 04 BLOCKED/POSTPONED; Phase 06 parent PARTIAL/BLOCKED/NOT ACCEPTED; production NO_GO; 07.03 NOT_STARTED/NOT_AUTHORIZED.

Preflight: root, branch, exact HEAD `b04d0d49005e9a0aa44b207e6008a92d82d10a14`, all origin fetch/push URLs, upstream name/SHA and live remote tip match. Complete whole-repository staged/unstaged/untracked baseline empty; both linked worktrees inventoried. Sole ignored `.idea/workspace.xml` was never read, hashed, edited, removed or staged. Git operations were read-only; no fetch. The repeated live-tip check disabled credential helpers/prompts against the exact public origin/ref.

Public official-document research: accepted 07.01 register used as baseline; material flow, lifetime, callback, organization and permission claims reverified with `web.run`. Packet source register contains **16 official URL references across 15 unique public pages**: 13 baseline references plus three supplemental REST endpoint references, two sharing the installations page. No authenticated provider response, credential or private value was collected. One guessed permissions-guide URL was inaccessible and excluded; endpoint-specific official sections support all five read-permission rows. This is documentation capability evidence, not GITHUB_SANDBOX_VERIFIED or runtime security evidence.

### Measured documentation verification

From the canonical Git root: `python3 /tmp/phase0702-review-iw_psgck/verify.py`; checker, baseline and measured JSON remain outside the repository. The checker uses Python standard-library assertions and read-only Git commands. The results below describe documentation checks only, not product tests.

| Check | Result |
|---|---|
| Exact scope and complete inventory | **7 documentation paths: six unstaged existing files and one untracked new report; zero staged or unexpected untracked paths** |
| Git identity/index/worktrees | Expected root/branch/origin URLs/upstream; HEAD/upstream/live tip at full `b04d0d4` SHA; index entries identical; two-worktree inventory unchanged |
| Protected byte preservation | **211 of 217 tracked files** outside the six authorized modifications byte-identical to HEAD and baseline; includes 07.01, Phase 04/SEC-01, all Phase 06, architecture/contracts/security, code/manifest/tests/fixtures/dependencies and both source files |
| Master/source equality | Master plan equals canonical `_source/ODOO_SH_PROJECT_SETUP_MASTER_PLAN.md`; SHA-256 **d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91**; unchanged |
| History preservation | Five tracking-document original bodies remain exact suffixes below new current entries; 07.01 whole report unchanged; original 06.04 acceptance reconciliation paragraph in Phase 07 parent unchanged |
| Local Markdown links | **268 local destinations, including six fragment targets; zero broken** across the seven changed documents, including every new local link |
| Official citations and permissions | Official-domain/URL/date assertions plus manual source-to-claim review; all five proposed GET/token/permission mappings supported by official endpoint sections; actual grants/SSO/access/response behavior UNVERIFIED |
| Policy/status gates | All twelve decision items PENDING; no active-policy amendment or D-04/B-02 closure; 07.02 exact review label; Phase 04 and Phase 06 parent still blocked; counters 5/20 and 27/72; 07.03 unauthorized |
| Credentials/private values | Added lines/new packet pattern scan and manual review: no token/private-key/secret values or private provider data; only public repo paths/URLs, protocol field names and candidate limits. Pattern scans cannot exclude all possible secrets |
| Whitespace | `git diff --check` and `git diff --cached --check` PASS; new-report trailing-whitespace/CR/final-newline checks PASS |
| Ignored metadata | Only `.idea/workspace.xml`, preserved without reading or changing contents |

Checker-only correction: the first run reached the final new-file whitespace check and treated `git diff --no-index --check` exit 1 as failure. That exit reports the expected new-file difference; there was no whitespace output. The checker now accepts 0/1 only with empty diagnostics, alongside explicit whitespace/newline assertions. The full rerun passes; no repository defect or product-test failure was involved.

**Application tests: NOT RUN. Browser tests: NOT RUN. Authentication/authenticated-provider/backend/operational-security tests: NOT RUN.** No app registration, OAuth consent, token exchange, credential prompt, backend creation, account configuration, sandbox or GitHub API call. No manifest/permission, code/test/fixture/dependency or protected-policy change. No staging, commit or push.

Skills used: Superpowers using-superpowers, brainstorming assessment principles and verification-before-completion; stop-slop; Ponytail full-mode constraints. Tools used: shell/Git/Python via `functions.exec` and `web.run` public documentation. No authenticated GitHub connector, browser automation or subagent. WarpGrep/Valyu unavailable. **STOP FOR INDEPENDENT CHATGPT REVIEW AND OWNER/SECURITY DECISION.**

## Historical Phase 07.01 evidence — preserved

The prior section below retains its original preflight, eight-file scope, counts and pending-review status as historical evidence. It is not a new test run or the current 07.02 inventory.

## Phase 07.01 — documentation-only evidence, 2026-11-02 (Africa/Cairo)

[Assessment and official source register](Phases/phase07/PHASE_07_01.md). Preflight **PASS**: canonical root, expected branch, exact HEAD `5f9f588ca04c5742e218f76bc18c8191bc1fd833`, all origin fetch/push URLs, configured upstream and live tip match. `git status --porcelain=v1 --untracked-files=all`, staged/unstaged inventories were empty. `git ls-files --others --ignored --exclude-standard` showed only `.idea/workspace.xml`; contents never opened. The origin query disabled credential helpers/prompts and used `git ls-remote` only, with no fetch or authenticated API access.

Public official documentation was retrieved through `web.run` on **2026-11-02**: 18 GitHub sources and four Chrome sources, all linked with retrieval dates in the assessment. Documentation review establishes protocol support, not runtime success. No credentials/provider response samples were collected or copied.

Supplied 06.04 acceptance is reconciled at published `5f9f588`; its **39 focused / 213 full PASS** results are historical only. The 06.04 and parent reports remain protected, including RED and migration evidence. Current counters **5/20 and 26/72**; no 07.01 acceptance increment.

**Application tests: NOT RUN. Browser tests: NOT RUN. Authenticated provider/backend/security acceptance tests: NOT RUN.** No auth method/configuration, permission, application code, tests, fixtures, dependency, protected security policy, account or provider state changed. No commit or push. Final documentation verification results follow in this current section; older evidence below remains historical.

### Measured documentation verification

Command: `python3 /tmp/phase0701-review-8mlf6ar2/verify.py` from the canonical Git root. The checker uses Python standard-library path/URL parsing, heading/fragment validation, SHA-256 comparisons and read-only Git subprocesses. Baseline, checker and measured JSON are retained in that temporary evidence directory; no verification script is added to the repository.

| Check | Verified result |
|---|---|
| Exact authorized scope / final inventory | **8 paths: six unstaged existing Markdown files + two untracked reports; zero staged paths**, no other drift |
| Final Git identity and live origin | Root/branch/all origin fetch/push URLs/upstream correct; HEAD, local upstream and live branch tip **`5f9f588ca04c5742e218f76bc18c8191bc1fd833`** |
| Commands used for identity/inventory | `git rev-parse --show-toplevel`; `git branch --show-current`; `git rev-parse HEAD`; `git remote get-url --all origin`; `git remote get-url --push --all origin`; upstream name/SHA; `git -c credential.helper= ls-remote --exit-code` against the explicit origin URL and branch; `git status --porcelain=v1 --untracked-files=all`; `git ls-files --stage`; staged/unstaged diff inventories |
| Local Markdown destinations in all eight affected documents | **328 checked, including 53 fragment targets; 0 broken**; covers every newly added local link plus existing links in those documents |
| Official citations | **22 unique official URLs / 22 retrieval-date records**, 18 GitHub and four Chrome; successful public-document retrieval through `web.run`, source/claim review and official-domain/date assertions |
| Protected tracked files / index | **209 of 215 tracked files unchanged**; six authorized existing document additions only; index entries identical to preflight |
| Historical/security wording | Original bodies of five updated tracking files retained exactly; original security document retained as an exact prefix. SEC-01 implementation/all phase04 reports, architecture/contracts, Phase 06 parent and 06.04 report unchanged |
| Master and canonical source | Byte-equal to each other and baseline; SHA-256 **`d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91`**; both canonical `_source` files unchanged |
| Code / permissions / tests / fixtures / dependencies | All protected tracked bytes unchanged; no auth configuration, runtime integration or backend added |
| Credential material review | No credentials collected; pattern scan of added lines and new reports finds **0 GitHub token/private-key/secret-value matches**; manual review confirms only protocol/field names and public documentation, no copied credential examples. Pattern scanning alone cannot exclude every possible secret |
| Whitespace | `git diff --check` and `git diff --cached --check` **PASS**; separate trailing-whitespace/CR/final-newline assertions for both new reports **PASS** |
| Ignored inventory | Only `.idea/workspace.xml`, preserved without opening or modifying it; unrelated IDE activity remains allowed |
| Provider activity | Public official documentation and required read-only Git tip queries only; no authentication, consent, token exchange, authenticated API session/call, sandbox or account/repository mutation |

These checks verify documentation scope and preservation, not operational security acceptance. **07.01 READY_FOR_REVIEW**, **D-04 OPEN**, **07.02/07.03 NOT_STARTED / NOT_AUTHORIZED**. Skills actually used: Ponytail; Superpowers using-superpowers, brainstorming assessment principles and verification-before-completion. Tools actually used: shell/Git/Python and `apply_patch` through `functions.exec`; public official research through `web.run`. **STOP FOR INDEPENDENT CHATGPT REVIEW; no commit or push.**

## Historical evidence below — unchanged

**Historical initial Phase 06.04 — SIMULATED; review packet READY_FOR_REVIEW / technical REWORK_REQUIRED (2026-11-02).** [Report and retained regression](Phases/phase06/PHASE_06_04.md). Node v24.19.0, commands from extension directory: `node --test test/phase-06-idempotency-reconciliation.test.mjs` **35 PASS / 1 FAIL** (36); `node --test test/step-coordinator.test.mjs` **14 PASS**; `node --test test/approval-checkpoint.test.mjs` **21 PASS**; `node --test test/pause-control.test.mjs` **26 PASS**; `node --test test/*.test.mjs` **209 PASS / 1 FAIL** (210); `node --check test/phase-06-idempotency-reconciliation.test.mjs` PASS. Every run has 0 SKIP/CANCELLED/TODO. The initial focused run reproduced the same failure. Failing assertion: `approval reflection cannot overwrite a terminal denial recorded during the same submission`; a proxy reflection trap records nested denial, then the outer approval overwrites that terminal intent. This valid RED regression remains enabled; protected code/accepted tests are unchanged. No GREEN repair is claimed or authorized; both intents retain `executionAuthorized: false`.

New coverage exercises all 12 F01–F07 variants, ordered/repeated/duplicate results around pause/resume, wrong identities/targets/provider/operation, cross-instance/stale/copied/serialized/consumed checkpoints, all review choices without authority, uncertainty retained through cancellation/replay attempts, denial versus unknown writes, evidence spoofing, malformed/accessor/exotic/proxy inputs, generic errors/privacy and frozen decisions. Global sentinels record zero network/browser/storage/retry-timer accesses. This is offline synthetic evidence, not authenticated authority, actual reconciliation, durable idempotency or runtime recovery. Browser/provider/production tests NOT RUN; existing SEC-01 tests in the full suite do not grant security acceptance.

Migration evidence: **60** original numbered reports inventoried and moved with `git mv`; **331** link destinations repaired in **42** existing documents; pre-move repository Markdown scan **596 local links / 0 broken file destinations**. See the [complete mapping, scope and final preservation verification](Phases/phase06/PHASE_06_04.md#final-preservation-and-migration-verification). Master/source and protected source/accepted tests/fixtures remain subject to byte checks. 06.03 is ACCEPTED at `5ed2e2c`; 06.04 is not accepted; progress stays **5/20 and 25/72**; parent Phase 06 PARTIAL/BLOCKED, Phase 04 BLOCKED/POSTPONED, production NO_GO. No commit/push.

**Current Phase 06.04 fix-only remediation (2026-11-02, Africa/Cairo): READY_FOR_REVIEW; verified offline GREEN, not accepted.** The limited owner authorization allowed one post-reflection terminal check in `src/workflow/approval-checkpoint.mjs` and three narrow additions to the existing 06.04 test. The original regression reproduced RED unchanged; expanded pre-fix suite **36 PASS / 3 FAIL** (39), then final **39 focused / 21 approval / 14 coordinator / 26 pause / 213 full PASS**, 0 FAIL/SKIP/CANCELLED/TODO. Both JavaScript syntax checks pass. First completed terminal decisions survive competing submissions; failures remain generic, interfaces unchanged and `executionAuthorized: false`.

Independent verification confirms **60 staged original-byte renames**, **331 repaired destinations in 42 existing documents**, **616 current local links / 26 fragment targets / 0 broken**, preserved historical/SEC-01 wording, master/canonical equality, and **123 protected non-Markdown files** equal to HEAD except the separately excluded source fix. The index is unchanged. Only the known ignored `.idea/workspace.xml` shows unrelated external IDE metadata drift; its private contents were never read or altered. Git diff checks and separate whitespace/newline checks for both new files pass. Current pending scope is **72 logical files**; this remediation changes only **eight paths** (source, test, six reporting documents). Full counts and RED/GREEN evidence are in the linked 06.04 report above.

Accepted progress remains **5/20 and 25/72**. Parent Phase 06 **PARTIAL / BLOCKED / NOT ACCEPTED**, Phase 04 **BLOCKED / POSTPONED**, production **NO_GO**. Browser/provider/runtime/durable recovery checks **NOT RUN**. No commit or push. **NEXT: STOP FOR INDEPENDENT CHATGPT ACCEPTANCE.** Historical RED/authorization statements above are superseded only by this limited remediation.

**Historical Phase 06.03 implementation evidence — SIMULATED / READY_FOR_REVIEW (2026-11-02).** [Report](Phases/phase06/PHASE_06_03.md). Node v24.19.0, extension-directory commands: `node --test test/pause-control.test.mjs` **26 PASS**; unchanged `node --test test/approval-checkpoint.test.mjs` **21 PASS**; unchanged `node --test test/step-coordinator.test.mjs` **14 PASS**; `node --test test/*.test.mjs` **174 PASS**, each 0 FAIL/SKIP/CANCELLED. `node --check src/workflow/pause-control.mjs` and `node --check test/pause-control.test.mjs` PASS. TDD: missing-module error, then empty export with **24 FAIL / 0 PASS**, then implementation **24 PASS**. Internal review reproduced a constructor-admission race; a new regression failed before reserving plan identity ahead of proxy reflection. Final **26 PASS** includes that fix and duplicate-result-after-resume coverage. Covers read/mutation pause and resume without advancement or authority, ordered reads, pre-start/paused terminal cancel, reconciliation/failure/block retention, F01–F07, invalid/stale/duplicate/cross-instance controls, plan tampering/readmission, wrong identities/targets, malformed/accessor/hidden/symbol/exotic/reentrant inputs, privacy, frozen API and forbidden storage/provider/network/timer access. This is synthetic evidence only; no durable idempotency, real interruption or restart recovery is proved. Browser/provider tests **NOT RUN**, offline-only. Existing disconnected SEC-01 regressions ran unchanged in the full Node suite; this provides no SEC-01 integration or security acceptance. 06.02 is **ACCEPTED at published `d1e6fdb`**; 06.03 awaits independent ChatGPT acceptance, progress **5/20 and 24/72**, Phase 04 **IN_PROGRESS / BLOCKED**, production **NO_GO**.

Phase 06.03 preservation checks **PASS**: exactly nine authorized files, six unstaged tracked edits and three untracked new files, no staged/unexpected changes; `git diff --check`; new-file whitespace; **214 local Markdown links**; all **204 other tracked repository files matching HEAD bytes**; preserved 06.02 historical report body; master/source byte equality (SHA-256 `d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91`). Source inspection confirms only the coordinator import, with no executor or browser/storage/network/timer entry points. Protected production/SEC-01 files and all existing tests/fixtures are unchanged. Final local HEAD/upstream remain at full `d1e6fdbc92b4069889954e888250f8a355dd0bb2`; live remote was checked only at preflight. No commit/push.

**Historical Phase 06.02 implementation evidence — SIMULATED / READY_FOR_REVIEW (2026-11-02).** [Report](Phases/phase06/PHASE_06_02.md). Node v24.19.0, extension-directory commands: `node --test test/approval-checkpoint.test.mjs` **21 PASS**; unchanged `node --test test/step-coordinator.test.mjs` **14 PASS**; `node --test test/*.test.mjs` **148 PASS**; each 0 FAIL/SKIP/CANCELLED. `node --check src/workflow/approval-checkpoint.mjs` and `node --check test/approval-checkpoint.test.mjs` PASS. TDD: initial missing-module error; empty export then **21 failing tests** from absent behavior; implementation then **21 PASS**. Coverage: strict synthetic/v1 mutation input, approval correlation, preview privacy, all choices, exact binding, stale/duplicate/finalized reviews, no cross-instance replay, tampering/exotic objects, generic errors, immutability, all existing mutation fixtures and coordinator gate compatibility. This is synthetic intent evidence only, never authenticated identity, actual target verification, provider state or write permission. Browser/provider tests **NOT RUN**, offline-only. Phase 06.01 **ACCEPTED at published `2b965e1`**; 06.02 awaits independent ChatGPT acceptance; progress **5/20 and 23/72**, Phase 04 **IN_PROGRESS / BLOCKED**, production **NO_GO**. Earlier evidence is historical.

Phase 06.02 preservation checks **PASS**: exact nine-file scope, no staged changes, `git diff --check`, new-file whitespace, local Markdown link destinations, original 06.01 report body unchanged, all **201 other tracked files matching HEAD bytes**, and master/source byte equality. Protected coordinator implementation/tests, production files, storage, SEC-01 policy/code, adapters and fixtures are unchanged. The required read-only origin-tip preflight was the only external request; no provider/browser operations or unauthorized external actions occurred. Final local HEAD/upstream remain at `2b965e1`.

**Historical Phase 06.01 implementation evidence — SIMULATED / READY_FOR_REVIEW (2026-11-02).** [Report](Phases/phase06/PHASE_06_01.md). Node v24.19.0, extension-directory commands: `node --test test/step-coordinator.test.mjs` **14 PASS**; `node --test test/*.test.mjs` **127 PASS**; both 0 FAIL/SKIP/CANCELLED. `node --check src/workflow/step-coordinator.mjs` and `node --check test/step-coordinator.test.mjs` pass. TDD: initial missing-module failure, then minimal export with **14 failing tests**, then implementation GREEN. Coverage includes ordered plans, duplicates/bounds, identity/target/provider/shape rejection, blocked/unverified operations, mutation approval-handle limits, F01–F07, unknown outcomes, permanent stops, no retry, tampering and sensitive-data rejection. These are Node synthetic assertions only. Browser/provider/production tests **NOT RUN** as outside this offline scope; no provider behavior or runtime acceptance is inferred. Final Git validation: exactly eight unstaged files, whitespace PASS, 187 local Markdown links PASS, 12 protected HEAD byte comparisons PASS, master/source equality PASS, and unchanged HEAD/upstream/live remote tip. Earlier evidence below is historical.

**Current SEC-01 stalled-wall and restart review — READY_FOR_REVIEW (2026-10-29).** [Bounded report](Phases/phase04/PHASE_04_SEC01_STALLED_WALL_AND_RESTART_RESOLUTION.md): `node --test test/*.test.mjs` **89 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED**; four requested syntax checks PASS; isolated Chromium 151.0.7922.34 cleanup **14 PASS** and CP3 **10 PASS**, each 0 FAIL/SKIP/BLOCKED, zero external page requests and profile cleanup PASS. The test-first stalled-wall regression failed on the prior service. Restart evidence is synthetic-worker and disconnected-service behavior only; no production recovery or trusted cross-restart time was verified. Phase 04 **IN_PROGRESS / BLOCKED**, production **NO_GO**.

**Current SEC-01 combined remediation — READY_FOR_REVIEW (2026-10-29).** `node --test test/*.test.mjs`: **88 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED**. Service, Node-test and both browser-script syntax checks passed separately. Two separate isolated Chromium 151.0.7922.34 runs: cleanup **13 PASS** and CP3 **9 PASS**, each with 0 FAIL/SKIP/BLOCKED, zero intercepted non-extension page requests and disposable-profile **CLEANUP PASS**. The [combined report](Phases/phase04/PHASE_04_SEC01_RUNTIME_CLOCK_COMBINED_REMEDIATION.md) records candidate bounds, sample measurement, test-first failures and restart limitations. This is disconnected local service evidence only. Phase 04 remains **IN_PROGRESS / BLOCKED**; progress **5/20 and 22/72**; production **NO_GO**.

**Phase 05 parent exit review — PASS / ACCEPTED (2026-10-29).** All four micro-phases are accepted; progress is **5/20 master phases; 22/72 micro-phases accepted**. The five invented provider-like HTML fixtures and F01–F07 scenarios satisfy local exit criteria. The latest recorded full Node suite is **75 PASS, 0 FAIL, 0 SKIP**. Prior bounded fixture-browser observations were **12 PASS** for three Odoo.sh pages and **22 PASS** for customer Odoo/Plementus pages; no browser check was run for the pure 05.04 catalog. These are historical test results, not tests rerun for this documentation closure. Mock evidence does not verify real provider behavior. The final product remains an online-capable Chrome extension. Phase 04 runtime-security gates are unresolved; no Phase 06 or production implementation is authorized.

Phase 05.04: `node --test test/*.test.mjs` **75 PASS, 0 FAIL, 0 SKIP**, including six new deterministic scenario cases. `node --check` passed for the new catalog and test modules. These are **SIMULATED Node assertions**, not browser or provider observations. No new HTML page was added; a new Chromium check was not applicable. The [05.04 report](Phases/phase05/PHASE_05_04.md) records F01–F07 coverage. Accepted progress is **4/20 and 21/72**; 05.04 awaits independent review. Online-provider behavior remains **UNVERIFIED**.

Phase 05.04 validation: exactly eight authorized files changed; changed Markdown links, new-file whitespace, `git diff --check`, protected HEAD byte comparisons and master-plan/source byte equality passed. Existing v1 contract and prior HTML fixtures remain unchanged. No dependencies, permissions, storage or provider runtime were added.

Phase 05.03: `node --test test/*.test.mjs` **69 PASS, 0 FAIL, 0 SKIP** (four new fixture tests); `node --check test/customer-plementus-fixtures.test.mjs` PASS. Local Playwright Chromium `file:` smoke: **22 PASS, 0 FAIL** on two invented pages, with accessible labels, disabled actions, zero external requests and zero page errors. **LOCAL_BROWSER_TESTED** applies to fixtures only. [Report](Phases/phase05/PHASE_05_03.md). Current accepted progress is 4/20 and 21/72; 05.03 is accepted.

Phase 05.02: `node --test test/*.test.mjs` **65 PASS, 0 FAIL, 0 SKIP** (five new fixture tests); `node --check test/odoo-sh-fixtures.test.mjs` PASS. Local Playwright Chromium `file:` smoke: **12 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED**, including page rendering, accessible controls, inert creation control, disabled copy checkpoint, no external requests or page errors. This is **LOCAL_BROWSER_TESTED** for invented fixtures only, not real Odoo.sh DOM or workflow proof. [Report](Phases/phase05/PHASE_05_02.md). Current accepted progress is 4/20 and 21/72; 05.02 is accepted.

Phase 05.01 offline contract: `node --test test/*.test.mjs` **58 PASS, 0 FAIL, 0 SKIP** after a new validator correction; both requested `node --check` commands PASS. Pure synthetic values only. [Report](Phases/phase05/PHASE_05_01.md). No new browser/provider verification; progress remains 4/20 and 18/72.

Phase 05.01 fix-only remediation: the existing 58 tests and two new R1/R2 regressions pass; full Node suite **60 PASS, 0 FAIL, 0 SKIP** and both syntax checks pass. The prior result above is historical. No provider or browser test was added.

Current evidence includes documentation, read-only Git/tooling inspection, static MV3 artifact validation, Node validation tests, and isolated local Chrome smoke tests. **5/20 master phases; 22/72 micro-phases accepted; 04.02 ACCEPTED FOR SIMULATED FOUNDATION ONLY; 04.03 ACCEPTED FOR SYNTHETIC DECISIONS ONLY; 04.04 ACCEPTED FOR PURE VALIDATION AND SIMULATION ONLY.** The current unpacked extension smoke tests are **LOCAL_BROWSER_TESTED / PASS**; earlier startup timeouts are preserved below. Workflow execution, security, provider, and real-site tests remain **NOT RUN**. No provider or production capability follows from this local result.

The [SEC-01 disconnected cleanup gate](Phases/phase04/PHASE_04_SEC01_CLEANUP_GATE_IMPLEMENTATION.md) is **ACCEPTED** under **OPTION_B OWNER_APPROVED**. Its Node run is **50 PASS, 0 FAIL, 0 SKIP**. The new [isolated real-browser cleanup report](Phases/phase04/PHASE_04_SEC01_CLEANUP_GATE_BROWSER.md) is **BROWSER_CLEANUP READY_FOR_REVIEW**, with **11 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED** in Chrome for Testing. Production integration and security acceptance remain blocked.

## Actual evidence

| Phase | Actual check / outcome | Evidence and limits |
|---|---|---|
| 00.01 | Prior Codex reported Git identity, branch conflict and pre/post preservation checks PASS. | [Retrospective](Phases/phase00/PHASE_00_01.md); prior live branch listing is historical. No application tests. |
| 00.02 | Prior Codex reported five meaningful docs, verbatim plan, 20/72 ordering, 14 local link targets and file preservation PASS. | [Retrospective](Phases/phase00/PHASE_00_02.md); historic output, not a new runtime test. |
| 00.03 | Prior Codex reported eight scoped docs, 20/72 counts, 44 local link targets, common secret-pattern checks and preservation PASS. | [Report](Phases/phase00/PHASE_00_03.md) records the exact Python command, output and corrected first checker attempt. Pattern scans are not proof of absence of all secrets. |
| 00.04 | Read-only Git/source and foundation validation. | [00.04 report](Phases/phase00/PHASE_00_04.md) records executed commands, actual outcomes and exact delta. |
| 01.02 | Read-only environment/tooling audit; local Playwright data-URL prerequisite smoke check passed. | [01.02 report](Phases/phase01/PHASE_01_02.md) records exact versions, missing tools, exit results and limits. The smoke check did not load an extension or external site. |
| 01.03 | Read-only documentation architecture decision and owner-created 01.02 successor verification. | [01.03 report](Phases/phase01/PHASE_01_03.md) records the exact Git checks and selected baseline. No MV3/browser/product test ran. |
| 02.01 | Node parsed `manifest.json`; required MV3 fields and absence of permissions, host permissions, remote code, and file references passed. | [02.01 report](Phases/phase02/PHASE_02_01.md) records the exact command and assertions. Browser loading did not run. |
| 02.02 | Static manifest, referenced-file, JavaScript syntax, popup HTML/path, permission, remote-code, source-preservation, and scoped-delta checks. | [02.02 report](Phases/phase02/PHASE_02_02.md) records the exact commands and results. Browser loading did not run. |
| 02.03 | **LOCAL_BROWSER_TESTED / PASS:** Isolated Playwright-managed Chrome smoke test loaded the unpacked extension, registered its worker, rendered the popup, and observed empty permissions and host access with no page errors. | [02.03 report](Phases/phase02/PHASE_02_03.md) records Chrome version, exact command, result, and limits. No provider site or account was used. |
| 03.01 | **LOCAL_BROWSER_TESTED / PASS:** Fresh verification for the evidence-repair turn ran the reproducible static assertions and isolated Chrome/Playwright popup test. Chrome rendered all four sections, verified seven label targets and disabled controls/actions, and reported no page errors; static assertions confirmed local-only references and empty permissions. | [03.01 report](Phases/phase03/PHASE_03_01.md) contains the complete executable commands, actual outcomes, browser version, and evidence limits. Functional validation, persistence, workflow, GitHub sandbox, and provider tests remain **NOT RUN**. No provider site, account, sensitive value, or workflow action was used. |
| 03.02 | **LOCAL_BROWSER_TESTED / PASS:** Node's built-in runner passed four isolated validator cases. Chrome for Testing rendered generic accessible inline errors, trimmed valid text input, reported no page or console errors, made no external requests, and retained zero permissions. | [03.02 report](Phases/phase03/PHASE_03_02.md) contains executable commands and actual results. Browser rendering does not prove durable state, workflow behavior, or provider integration. |
| 03.03 | **LOCAL_BROWSER_TESTED / PASS:** Eight Node tests passed, including the 03.02 regressions. Chrome exercised local validation, duplicate entries, removal, focus, disabled actions and form submission safety; it observed no console or external network requests. | [03.03 report](Phases/phase03/PHASE_03_03.md) records commands, results, and limitations. No provider access or actual Git operation occurred. |

| 03.04 | **LOCAL_BROWSER_TESTED / PASS:** Nine Node cases and Chrome smoke passed, including prior validation regressions, branch/domain inputs, safe summary rendering, redaction, permissions and no external requests. | [03.04 report](Phases/phase03/PHASE_03_04.md) records commands and limitations. |

| 04.01 | **PASS:** 5 pure state tests and 9 popup regression tests; 0 failed, 0 skipped. | [04.01 report](Phases/phase04/PHASE_04_01.md) records commands and limits. No workflow execution or persistence was tested. |

| 04.02 | **SIMULATED / PASS:** 20 Node cases (6 record, 5 state, 9 popup validation); 0 failures or skips. The original 03.03 smoke run failed at its obsolete disabled-Production assertion; the narrow repair now expects the accepted enabled behavior. The corrected scripts timed out on that attempt; both passed in 04.03 after the worker was observed. The prior cause is unknown. | [04.02 report](Phases/phase04/PHASE_04_02.md) records both results, the corrective test change and the exact browser blocker. Real persistence remains BLOCKED. |

| 04.03 | **SIMULATED / PASS:** 23 Node tests, including 3 recovery cases; both existing Chrome smokes PASS after worker observation. | [04.03 report](Phases/phase04/PHASE_04_03.md); real storage, worker restart and provider recovery remain BLOCKED / NOT RUN. |

| 04.04 | **SIMULATED / PASS:** 27 Node tests (23 existing, 4 transition-proposal cases); no skips or failures. Browser smoke NOT RUN for this isolated module. | [04.04 report](Phases/phase04/PHASE_04_04.md); real durability and lifecycle recovery remain unverified. |

| SEC-01 cleanup gate | **SYNTHETIC / PASS:** Node v24.19.0, 50 tests passed, 0 failed/skipped; three changed JavaScript modules passed syntax checks in the earlier task. | [Implementation report](Phases/phase04/PHASE_04_SEC01_CLEANUP_GATE_IMPLEMENTATION.md); the fake alone cannot prove real IndexedDB scheduling or restart-clock trust. |
| SEC-01 isolated browser cleanup | **LOCAL_BROWSER_TESTED / PASS:** Chrome 151.0.7922.34, 11 checks passed, 0 failed/skipped/blocked; test syntax passed and disposable-profile cleanup passed. | [Browser report](Phases/phase04/PHASE_04_SEC01_CLEANUP_GATE_BROWSER.md); verified disconnected real IndexedDB cleanup, atomicity and lifecycle, not production worker integration or clock trust. |
| SEC-01 clock-safety browser regression | **LOCAL_BROWSER_TESTED / READY_FOR_REVIEW:** Chromium 151.0.7922.34, two separate scripts with 11 + 9 PASS, 0 FAIL/SKIP/BLOCKED; Node suite 80 PASS. | [Current report](Phases/phase04/PHASE_04_SEC01_CLOCK_SAFETY_BROWSER.md); fail-closed clock/restart behavior of the disconnected service, not production clock trust or recovery wiring. |

Historical 00.02 commit comparison `git --no-optional-locks diff --check 39a6e97e637dd227aadea5529b2d1a80e2d4c531 HEAD` in 00.03 returned exit 2 for source-preserved Markdown hard-break whitespace. This was not an application test and its `HEAD` referred to that historical run. Do not alter the authoritative plan to remove it.

## Evidence tiers

The plan defines `SIMULATED`, `LOCAL_BROWSER_TESTED`, `GITHUB_SANDBOX_VERIFIED`, `MANUALLY_ATTESTED`, `ODOO_SH_DEMO_VERIFIED`, and `PLEMENTUS_DEMO_VERIFIED`. No tier has been earned for product behavior in Phase 00. Git/documentation checks must not be relabeled as fixture, browser, sandbox or demo evidence. A manual attestation is distinct from observed automatic verification.

## Not run / future coverage

Integration, fixture, workflow execution, security, real interruption/recovery, GitHub sandbox, real Odoo.sh and real Plementus tests: **NOT RUN**. The Phase 02.03 and Phase 03 popup checks are **LOCAL_BROWSER_TESTED / PASS** only. The future coverage, conditions and evidence required are in [test matrix](10_TEST_MATRIX.md). Real demos require separate authorization and access; unsupported capabilities remain UNVERIFIED. The Phase 01.02 report records the current browser/runtime/tool versions and exact prerequisite-check results; no product test total is claimed.

## SEC-01 CP1

**SIMULATED / PASS:** 32 Node tests (5 new and 27 existing), 0 failed, 0 skipped; two syntax checks passed. No browser or lifecycle test ran. Commands and limits: [CP1](Phases/phase04/PHASE_04_SEC01_CP1.md).

## SEC-01 CP2

Synthetic transactional service tests and limitations are recorded in [CP2](Phases/phase04/PHASE_04_SEC01_CP2.md). At CP2, real browser atomicity and lifecycle were NOT RUN.

## SEC-01 CP3

**ISOLATED REAL BROWSER:** 10 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED; Node regressions 40 PASS. CDP directly observed the synthetic worker stop and reactivation, with a new in-memory boot identifier and persisted revision. Browser-process restart passed. See [CP3](Phases/phase04/PHASE_04_SEC01_CP3.md) for scope and limitations.
