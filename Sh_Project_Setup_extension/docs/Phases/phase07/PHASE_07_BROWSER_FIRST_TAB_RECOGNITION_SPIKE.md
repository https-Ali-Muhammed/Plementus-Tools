# Browser-first tab recognition: disconnected prerequisite spike

## BF-01-R1 rework: unknown/blocked precedence — 2026-11-03 (Africa/Cairo)

**READY_FOR_CHATGPT_REVIEW / OFFLINE_SIMULATED. STOP FOR INDEPENDENT CHATGPT REVIEW.** Fix only the independently reproduced BF-01-R1 defect. The earlier BF-01 report and **26 focused / 239 full PASS** results below are preserved as historical evidence; this entry records the rework.

Root cause: the first unavailable selected field immediately threw the `unknown` marker, skipping remaining fields, the other snapshot and later roles. The evaluator now records unavailable metadata, independently validates each available URL/document/permission field, and checks known URL/document mismatches before returning `unknown`. Any known hard failure returns `blocked`; genuinely unavailable metadata alone remains `unknown`. Every failure still returns empty frozen bindings with `accountVerified: false` and `executionAuthorized: false`. The single pure export, strict input guards, deterministic sanitized decisions and fixture-only origin restrictions remain unchanged.

Exactly three independent regressions were added before implementation: missing prior metadata plus current permission denial; missing URL plus malformed document ID; and missing earlier-role metadata plus another role's permission denial. Additional cases within those tests cover both snapshots, malformed available URL/permission, known URL/document drift despite a different missing field, and later-role closure/origin/accessibility/navigation failures. The original 26 focused tests remain intact.

| Rework command / stage | Actual result |
|---|---|
| Pre-edit `node --test test/tab-recognition.test.mjs` | **26 PASS**, 0 FAIL/SKIP/CANCELLED/TODO |
| RED `node --test test/tab-recognition.test.mjs`, implementation unchanged | **26 PASS / 3 FAIL**, each new test received `unknown` instead of `blocked`; exit 1 |
| GREEN `node --test test/tab-recognition.test.mjs` | **29 PASS**, 0 FAIL/SKIP/CANCELLED/TODO; exit 0 |
| `node --test test/*.test.mjs` | **242 PASS = existing 213 + focused 29**, 0 FAIL/SKIP/CANCELLED/TODO; exit 0 |
| `node --check src/browser/tab-recognition.mjs` | **PASS**, exit 0 |
| `node --check test/tab-recognition.test.mjs` | **PASS**, exit 0 |

Node v24.19.0; commands run from the extension directory. Logs and preflight byte/index snapshot: `/tmp/bf01-r1-r07q7k4t/` (`red.txt`, `focused.txt`, `full.txt`, `snapshot.json`). Preflight confirmed exact root/branch/origin fetch/push URLs and HEAD/upstream/live tip `40ff873fbf4ad6c97e372b573fddac5176835a63`; upstream `origin/feature/sh-project-setup-extension-clean`. Entry inventory was exactly six modified tracking documents and three untracked BF-01 files, with zero staged changes. Only the same nine authorized paths are changed by this rework. No callers, other exports, config, fixtures or integration require changes.

Structural recheck: see [BF-01-R1 test evidence](../../04_TEST_EVIDENCE.md#bf-01-r1-rework--2026-11-03-africacairo). Original tracking/report bodies and the accepted history remain preserved; ignored `.idea/workspace.xml` is excluded from reading, hashing and changes.

Progress remains **5/20 master phases; 28/72 official micro-phases**. Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED**; Phase 07 **IN_PROGRESS**; 07.03 **NOT_STARTED / NOT_AUTHORIZED**; production **NO_GO**. No Chrome adapter, account detection, permission request, timestamp/TTL, persistence, replay handling, provider calls, UI, worker, workflow integration or security-policy change. Browser/provider/account/lifecycle verification **NOT RUN**; fixture agreement supplies no runtime freshness, account identity or execution authority.

Skills applied to this rework: Superpowers using-superpowers, systematic-debugging, test-driven-development and verification-before-completion; Ponytail full. Tools actually used: shell/Git/Python and apply_patch through functions.exec. No browser, web research, authenticated connector or subagent used. No staging, commit or push.

**READY_FOR_CHATGPT_REVIEW / OFFLINE_SIMULATED.** 2026-11-02 (Africa/Cairo). This is an authorized offline prerequisite, not official 07.03. Independent ChatGPT review is required before acceptance or further work. No official acceptance or progress increment: **5/20 master phases; 28/72 official micro-phases**. Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED**; Phase 07 **IN_PROGRESS**; 07.03 **NOT_STARTED / NOT_AUTHORIZED**; production **NO_GO**.

## Scope and design

Use one pure `recognizeTabs(input)` export, no dependencies or integration. Input supplies `expectedOrigins`, `selectionSnapshot`, `currentSnapshot` and exactly three explicit `{ role, tabId }` selections. Roles are `plementus`, `github`, `odoo-sh`. Each snapshot supplies a synthetic `epoch` and at most 32 candidate observations. Only fixture `.example` HTTPS origins are configurable for the two non-GitHub roles; GitHub uses `https://github.com`. Origins must be distinct and canonical. No real Plementus/customer origin is inferred.

Candidate observations carry `id`, `url`, `documentId`, `permission`, `accessible`, `status`, `pendingNavigation`. These are invented test observations, not Chrome Tab objects. Compare the chosen tab in both snapshots, including full URL (path/query/fragment), document marker and context epoch. A context change, closure, replacement, route change, pending navigation, inaccessible tab, denied permission or duplicate ID blocks. Null metadata/unknown permission cannot establish recognition. Explicit selection is required even with one candidate per origin. Duplicate origins can be disambiguated by an explicit unique tab ID; duplicate IDs/selections and reuse across roles fail closed.

The function returns a fresh frozen minimal decision and frozen role/tab-ID bindings only. `selection_bound` means the supplied fixture observations agree; account verification and execution authorization always remain false. Generic `unknown` or `blocked` returns no partial selections or raw diagnostics. Nothing is persisted or executed. Inputs must be inert data; arbitrary executable JavaScript proxies cannot be made trustworthy by a pure parser.

Ruling: a stateless evaluator with two caller-supplied snapshots is the smallest design within this authorization. A stateful browser adapter or workflow connection would require broader scope. Snapshot epochs are synthetic invalidation markers, not clocks, authenticated identity or durable replay protection. Reusing stale but identical snapshots cannot be detected here; a later separately authorized runtime must obtain fresh observations and invalidate context on loss/restart.

## Bounded implementation plan

The user's exact file allowance replaces default skill plan/workspace locations; no commits, extra plan files, new worktree or delegated review. Brainstorming's authorized-spike exception applies. Use the existing Node test style, strict data validation and generic failure conventions without importing workflow/security modules.

- [x] Write invented fixture tests first and observe RED against a nonfunctional export.
- [x] Implement the pure evaluator and observe GREEN for normal, ambiguous, unknown, navigation and lifecycle-marker cases.
- [x] Run focused/full suites and both syntax checks; compare the unchanged 213-test baseline.
- [x] Record official Chrome permission findings, unsupported runtime cases and exact evidence; minimally update the six allowed tracking documents.
- [x] Verify all tracked bytes outside scope, unchanged index, master/source equality, local Markdown links, fixture privacy and whitespace; stop for independent review.

Only the new [module](../../../src/browser/tab-recognition.mjs), [test](../../../test/tab-recognition.test.mjs), this report and the six allowed tracking documents may change. No callers, exports in existing modules, fixture files, configuration, manifest or permissions need changes. Existing user behavior is unaffected because the prototype is disconnected.

## Git and required reading

Verified root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`; extension `Sh_Project_Setup_extension`; branch `feature/sh-project-setup-extension-clean`; HEAD, configured upstream SHA and live remote branch tip all **`40ff873fbf4ad6c97e372b573fddac5176835a63`**. Upstream `origin/feature/sh-project-setup-extension-clean`; all fetch/push URLs `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`. Complete initial tracked/staged/untracked status empty. Both linked worktrees inventoried read-only; no action in the sibling worktree. Ignored IDE metadata contents were never opened, hashed or modified.

Preflight commands: `pwd -P`, `git rev-parse --show-toplevel`, `git branch --show-current`, `git rev-parse HEAD`, `git rev-parse --abbrev-ref --symbolic-full-name '@{upstream}'`, `git rev-parse '@{upstream}'`, `git remote get-url --all origin`, `git remote get-url --push --all origin`, `git status --porcelain=v1 --untracked-files=all`, `git status --porcelain=v1 --ignored=matching --untracked-files=normal`, `git diff --name-status`, `git diff --cached --name-status`, `git worktree list --porcelain`, `git ls-files --stage -z`, `git ls-remote --exit-code origin refs/heads/feature/sh-project-setup-extension-clean`. The last command is an authorized public Git metadata query, without fetch or authenticated provider API use.

Read the [master plan](../../01_MASTER_PLAN.md), [ADRs](../../02_ARCHITECTURE_DECISIONS.md), [contracts](../../08_INTEGRATION_CONTRACTS.md), [security](../../09_SECURITY_AND_SECRETS.md), [Phase 07 parent](PHASE_07.md), [owner direction](PHASE_07_02_BROWSER_FIRST_OWNER_DIRECTION.md), [Phase 04 limits](../phase04/PHASE_04.md), [clock-security packet](../phase04/PHASE_04_SEC01_CLOCK_SECURITY_ACCEPTANCE_PACKET.md), [restart limits](../phase04/PHASE_04_SEC01_STALLED_WALL_AND_RESTART_RESOLUTION.md), [held-record admission decision](../phase04/PHASE_04_SEC01_HELD_RECORD_ADMISSION_DECISION.md), [Phase 06 limits](../phase06/PHASE_06.md), current manifest/worker/popup, existing approval-module guards and Node fixture/test conventions. Current manifest has no permissions, host grants or content scripts; worker is an install-listener stub. Existing popup validation has no connection to this evaluator. No workflow, checkpoint, recovery or clock policy changes follow from this spike.

## Exact input and decision contract

| Input | Accepted fixture shape / refusal |
|---|---|
| `expectedOrigins` | Exactly the three role keys; string HTTPS origins with no path/trailing slash, query, fragment, userinfo or normalization; distinct; non-GitHub hostname ends in `.example`, GitHub exactly `https://github.com` |
| Snapshot | Exactly `epoch`, `tabs`; epoch `fixture-context-1` through `fixture-context-9999`; equality required across snapshots |
| Candidate list | Dense plain array of 1–32 inert records; unique positive safe-integer IDs in each snapshot; no unknown keys, getters, hidden fields or symbols |
| Candidate record | Required `id`, boolean `accessible`, boolean `pendingNavigation`, `status` (`complete`, `loading`, `unloaded`); metadata `url`, `permission`, `documentId` may be absent/null to represent unavailable information |
| Selected metadata | Canonical HTTPS URL at most 2048 characters, exact configured origin including port; permission `granted`; document `fixture-document-1` through `fixture-document-9999`; accessible, complete, no pending navigation |
| Selections | Exactly three `{ role, tabId }` records; each known role once, each ID once; chosen ID exists in both snapshots; input order has no effect |
| Successful comparison | Same selected URL and document marker in both observations, same context; new frozen decision `selection_bound` and canonical role-ordered `{ role, tabId }` bindings |
| Unavailable selected metadata | `unknown`, empty frozen bindings; no partial recognition; explicit denial/unavailable accessibility/navigation/malformed input instead returns `blocked` |
| Every decision | Exactly `decision`, `selections`, `accountVerified: false`, `executionAuthorized: false`, `evidenceTier: OFFLINE_SIMULATED`; nested bindings frozen; no URL, origin, document/context value, account, title or diagnostic included |

Only selected candidates' URL/permission/document metadata is evaluated for recognition; unrelated tabs cannot be selected implicitly. All inventory IDs, record shapes and lifecycle flags are validated. A duplicate origin does not imply duplicate identity: an explicit unique tab ID disambiguates the selection, while duplicate IDs or role choices block. There is no inferred account, provider entitlement, login state or operator identity. No `operationAuthorized` capability, executor, callback, click, form, network or storage interface exists. Unknown keys such as account assertions and executors are rejected. Generic errors are caught and converted to sanitized decisions; no input/error logging.

## Observed verification

Node **v24.19.0**, commands from the extension directory on 2026-11-02 (Africa/Cairo). Scratch artifacts are outside Git at `/tmp/tab-recognition-spike-8cu4h576/`.

| Command / check | Observed result |
|---|---|
| Before changes: `node --test test/*.test.mjs` | **213 PASS**, 0 FAIL/SKIP/CANCELLED/TODO |
| Initial `node --test test/tab-recognition.test.mjs` | **0 PASS / 25 FAIL**, expected assertion failures against nonfunctional `{}` export; `red.txt` |
| First implementation focused run | **25 PASS**, 0 FAIL/SKIP/CANCELLED/TODO |
| Added coercion regression before fix | **25 PASS / 1 FAIL**; origin-object `toString` unexpectedly called once; `coercion-red.txt` |
| Final `node --test test/tab-recognition.test.mjs` | **26 PASS**, 0 FAIL/SKIP/CANCELLED/TODO; `focused.txt` |
| Final `node --test test/*.test.mjs` | **239 PASS = existing 213 + new 26**, 0 FAIL/SKIP/CANCELLED/TODO; `full.txt` |
| `node --check src/browser/tab-recognition.mjs` | **PASS**, exit 0 |
| `node --check test/tab-recognition.test.mjs` | **PASS**, exit 0 |

The coercion regression exposed interpolation before type validation. The root fix is one string-type guard before constructing the origin URL; the new assertion verifies zero caller coercion calls. All callers of the new export are confined to its new test. No existing module is imported or modified. The full suite runs only the existing `*.test.mjs` files and the new pure test, not the separately named Chrome harnesses. RED is historical development evidence; the final tree is GREEN.

## Case evidence and remaining Chrome requirements

| Case | Offline observation | Later isolated Chrome requirement — NOT RUN |
|---|---|---|
| Explicit/missing/duplicate/reused/mismatched selection | PASS: required role/ID uniqueness, no implicit first-match, no partial bindings | Trusted extension UI must capture fresh explicit operator choice and bind the profile/window context |
| Duplicate-origin candidates | PASS: explicit choice accepted, absent role choice rejected | Verify safe minimal display, separate account/target checks and no raw title/URL disclosure |
| Wrong account or signed out on same route | PASS only for **no identity/authorization claim**; cannot discriminate actual accounts | Establish reviewed site-visible account/target evidence or manual verification; origin/session/title alone cannot prove identity or rights |
| Permission denied/removed or tab inaccessible | PASS for supplied denied/accessibility flags | Real grant denial/removal, API failures and races; no inference that an earlier grant remains valid |
| URL/document/permission information absent | PASS: selected unknown metadata gives `unknown` and zero bindings | Validate actual missing metadata and restricted-page behavior under the chosen permission model |
| Wrong origin/scheme/userinfo/port/normalized URL | PASS: strict canonical HTTPS origin and full-URL comparison | Chrome-observed redirects, restricted/discarded tabs and permission boundaries |
| Route/query/fragment change, reload, tab closure/replacement, pending navigation | PASS for supplied URL/document/ID/flag changes | Observe main-frame and same-document navigation, replacements, close/reopen and races; invalidate on any intervening navigation, including away-and-back |
| Popup loss / worker restart / stale selection | PASS only when caller changes context marker or supplies missing snapshots | Prove actual lifecycle invalidation and fresh reselection after loss/restart; markers are not Chrome document IDs or durable security evidence |
| Old identical snapshots replayed | Intentionally repeatable pure evaluation; no detection or replay protection | Never reuse the snapshot as action authority; acquire fresh trusted observations. No clock/TTL policy is invented here |
| Malformed/executable input | PASS: strict record/array descriptors, no accessors/coercion, generic caught reflection error | A future adapter must validate inert messages and sender/tab/frame/document/origin; malicious proxies and compromised extension globals are outside this data-only model |

No real account/profile, browser tab, page DOM, permission request, content script, private page state, cookies/storage/tokens, authenticated API, backend, OAuth, click, navigation, fill, write, extension load or lifecycle harness was used. Public official documentation and read-only Git metadata are the only external activity. Invented `.example` sites and fixture GitHub paths carry no customer information or credentials. Adversarial userinfo fixtures are invented parser inputs, never usable account material. Successful snapshot comparison cannot satisfy a workflow preflight or grant execution.

## Permission review: official Chrome sources

Retrieved **2026-11-02 (Africa/Cairo)**. These establish platform semantics, not compatibility or authorized use on any real site.

| Source | Finding / future review implication |
|---|---|
| [Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs) | `tabs` exposes sensitive URL/pending URL/title/favicon metadata; matching host grants can expose it too. Missing URL is possible; committed URL does not rule out pending navigation. `tabs` is not DOM/account authority. A future collector needs reviewed metadata and lifecycle handling |
| [Declare permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions) | Host and optional permission declarations define access capabilities and warnings. Prefer the least reviewed scope; consent to browser access does not authorize provider operations. No broad declaration, exact host model or new permission is approved here |
| [activeTab](https://developer.chrome.com/docs/extensions/develop/concepts/activeTab) | Temporary user-invoked current-tab host access; persists for same-origin navigation, revoked by cross-origin navigation or closure. It does not grant all three tabs through one wizard action; the stricter route guard remains necessary |
| [Scripting API](https://developer.chrome.com/docs/extensions/reference/api/scripting) | Injection requires `scripting` plus host access or `activeTab`. Recognition of synthetic records needs neither injection nor scripting; any future DOM observation needs a separately approved scope |
| [MV3 lifecycle](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers/lifecycle) | Workers can terminate and lose global state. Lifecycle/restart testing and a reviewed authority model remain necessary; platform persistence advice cannot waive SEC-01 |

Current manifest remains permission-free. No permission set is selected or implemented. Real Plementus/customer origins, Chrome runtime metadata collection, trusted selection context, document freshness, event races, origin/site policy, account/target authority, runtime recovery and any page detection remain **PENDING / UNVERIFIED**. Architecture/contracts reconciliation identified in the owner amendment remains a dependency before runtime implementation; this pure prerequisite does not resolve it. D-04/B-02/B-03 and the twelve historical security decisions remain open/pending.

## Scope, preservation and review gate

Authorized paths: `src/browser/tab-recognition.mjs`, `test/tab-recognition.test.mjs`, this report, `docs/Phases/phase07/PHASE_07.md`, `docs/00_PROJECT_STATUS.md`, `docs/03_CHANGELOG.md`, `docs/04_TEST_EVIDENCE.md`, `docs/05_BLOCKERS_AND_DECISIONS.md`, `docs/06_HANDOFF.md` — **nine paths**. No persistent state, eighth checkpoint field, clock rule, cleanup bypass, workflow result, resume, replay or actual operation capability is added. Master and canonical source remain byte-identical; historical architecture/contracts/security/Phase 04/06 and accepted 07.01/07.02 reports remain protected.

Final structural verification **PASS**: exactly nine authorized paths (six modified, three new), zero staged changes; **205** protected tracked files match preflight hashes and HEAD, and **8** tracked IDE configuration files separately match HEAD (**213 other tracked files unchanged**). Ignored IDE metadata was never read or hashed. All six tracking bodies retain their original content as exact suffixes. Master/source remain byte-identical with SHA-256 `d899c554ed58aefc9e3d61c3c795233429ce729b7bae451e88b95db338a3ac91`. Across the seven changed Markdown files: **289 local links, 12 fragment targets, 0 broken**. Dependency scan/manual review, fixture secret-pattern scan/manual review, `git diff --check`, all nine file newline/whitespace checks, unchanged index and refreshed Git identity/live tip checks pass. Script/results: `/tmp/tab-recognition-spike-8cu4h576/verify.py` and `verification.json`; [tracking evidence](../../04_TEST_EVIDENCE.md#offline-tab-recognition-spike--2026-11-02-africacairo).

Skills applied: Superpowers using-superpowers, brainstorming (authorized spike), writing-plans (plan above), test-driven-development, systematic-debugging and verification-before-completion; Ponytail full. Tools actually used: shell/Git/Python and apply_patch through functions.exec; web.run for official Chrome docs. WarpGrep and Valyu were unavailable; no authenticated connector, browser automation or subagent was used. User's file/scope/no-publication limits override skill-default extra artifacts or commits.

**STOP FOR INDEPENDENT CHATGPT REVIEW. READY_FOR_CHATGPT_REVIEW / OFFLINE_SIMULATED. No official micro-phase acceptance, progress increase, commit or push.**
