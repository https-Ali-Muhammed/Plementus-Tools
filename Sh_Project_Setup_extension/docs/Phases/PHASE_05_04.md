# Phase 05.04: Deterministic failure and unknown-state fixtures

**READY_FOR_REVIEW**, 2026-10-29. Owner accepted 05.01–05.03 and authorized this limited local sequencing exception while Phase 04 remains **IN_PROGRESS / BLOCKED**. Accepted progress is **4/20 master phases; 21/72 micro-phases**. Phase 05 remains **IN_PROGRESS**; production activation is **NO_GO**.

## Scope

Preflight verified canonical Git root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`, fetch/push origin `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`, branch `feature/sh-project-setup-extension-clean`, HEAD/upstream/live remote branch `68643defb328106d5ea66e742e8a0bfe2af05e45`, and a clean complete worktree including untracked files. No fetch, switch, reset, commit or push occurred.

The pure, immutable [scenario catalog](../../fixtures/scenarios/failure-states.mjs) supplies invented v1 capability, request, expected result and manual checkpoint data for future **online** adapters and browser tests. It does not execute operations. There is no new HTML, server, dependency, provider adapter, storage or worker integration.

| Scenario | Expected synthetic state |
|---|---|
| F01 unknown Odoo.sh DOM | `unknown` / `unsupported`; manual page review |
| F02 wrong target | `blocked` / `target-mismatch`; target review |
| F03 login, MFA, CAPTCHA | `blocked` / `unverified`; distinct manual checkpoints |
| F04 permission denied before write | `failed` / `permission`; no uncertain-write claim |
| F05 timeout, interruption, unknown outcome after possible write | `unknown`; reconcile before retry |
| F06 available but uninstalled module | `unknown` / `unverified`; installation review |
| F07 Plementus submit/Connect uncertainty | `unknown`; reconcile before retry |

All expected results use exact contract v1 and `SIMULATED` evidence with no provider-state verification. Possible writes require `reconcile-first`, `reconciliationRequired: true` and `reviewRequired: true`. Expected fixture data is never authorization to operate a provider. Existing v1 contract and HTML fixtures are unchanged; actual online-provider behavior remains **UNVERIFIED**.

## Evidence and limits

`node --test test/*.test.mjs`: **75 PASS, 0 FAIL, 0 SKIP**, including six new catalog cases. `node --check` passed for both new `.mjs` files. Node assertions validate fixture structure and v1 contract behavior; they are not browser or provider observations. No new HTML scenario exists, so no new bounded Chromium check was applicable. Existing browser evidence remains historical and does not verify these scenarios in a browser.

Final validation found exactly eight authorized changed files, including new untracked files. `git diff --check`, changed Markdown links and new-file whitespace passed. The master plan and its `docs/_source` copy are byte-identical. HEAD byte comparisons confirmed unchanged v1 contract (`90d85b56…`), security requirements (`dde7cc18…`) and SEC-01 policy (`13fb60c1…`); accepted HTML fixtures are unchanged. No new dependencies, permissions, storage, remote requests, real credentials, customer information or provider/production runtime integration were added. Stop for independent ChatGPT acceptance before any next micro-phase or parent exit review.
