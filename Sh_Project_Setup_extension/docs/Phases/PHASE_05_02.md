# Phase 05.02: Mock Odoo.sh fixture pages

**READY_FOR_REVIEW**, 2026-10-29. Owner accepted 05.01 and authorized this local fixture micro-phase while Phase 04 remains **IN_PROGRESS / BLOCKED**. Accepted progress stays **4/20 master phases; 19/72 micro-phases**. Production activation is **NO_GO**; 05.03 and 05.04 are **NOT_STARTED**.

## Scope and preflight

The canonical Git root was `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`; branch `feature/sh-project-setup-extension-clean`; HEAD, upstream and live origin branch all `91f6c7bd13aaad9ad0141aebdbd555ce0c73bf39`. Fetch and push origin were both `https://github.com/https-Ali-Muhammed/Plementus-Tools.git`; the complete worktree was clean, including untracked files. No branch switch, fetch, commit or push occurred.

Three invented, standalone pages under [`fixtures/odoo-sh/`](../../fixtures/odoo-sh/) model project setup, Production and Staging. They use synthetic identifiers, native labeled controls, semantic landmarks, stable `data-fixture` markers and inline local CSS. Project creation is an inert `type="button"`; utility, module and database-copy controls are disabled. Staging shows a created Git branch while its database copy remains `not-copied` and readiness remains pending. These pages are testing infrastructure for the future **online** extension. They do not represent verified Odoo.sh HTML, selectors, API or behavior.

## Evidence

| Check | Result | Limit |
|---|---|---|
| `node --test test/*.test.mjs` | **65 PASS, 0 FAIL, 0 SKIP**; five new structural cases | Static source assertions do not prove DOM interaction. |
| `node --check test/odoo-sh-fixtures.test.mjs` | **PASS** | Syntax only; no fixture JavaScript exists. |
| Local Playwright Chromium `file:` smoke | **12 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED** | Rendered three pages, checked accessible radio/button controls, inert creation click, disabled copy and zero external requests/page errors. LOCAL_BROWSER_TESTED for fixtures only. |

No real provider account, customer data, credentials, endpoints, storage, extension worker or content script was used. Existing v1 adapter contract and SEC-01 policy remain unchanged. Real Odoo.sh compatibility and end-to-end behavior are **UNVERIFIED**. Stop for ChatGPT independent acceptance before 05.03.

Final validation found exactly ten authorized changed files in the complete worktree. `git diff --check`, changed Markdown links, new-file whitespace and master-plan/source byte equality passed. SHA-256 remained `90d85b5690f2f4e3c213e98bfcd0c89cd558be79beed1a848ed8a208c11af478` for the v1 contract, `13fb60c1745c8ebe66bd32e0332fefc4e78ba33e39657510d23ca57108d629f3` for the SEC-01 policy and `dde7cc18cabccd95fd8ee368613dddcfa27259c44776f8b4d0455afffb4b89ac` for security requirements. No production permissions, dependencies, provider requests or runtime integration were added.
