# Phase 05.03: Customer Odoo and Plementus mock fixtures

**READY_FOR_REVIEW**, 2026-10-29. Owner accepted 05.02 and authorized this local fixture micro-phase while Phase 04 remains **IN_PROGRESS / BLOCKED**. Accepted progress remains **4/20 master phases; 20/72 micro-phases**. Production activation is **NO_GO**; 05.04 is **NOT_STARTED**.

## Scope

Preflight confirmed the canonical root `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean`, branch `feature/sh-project-setup-extension-clean`, local HEAD, upstream and live origin branch `231e249bef2c27f3aee1a017f2321fc180b3c943`, matching fetch/push origin and a completely clean worktree. No fetch, switch, reset, commit or push occurred.

[`customer-odoo/apps.html`](../../fixtures/customer-odoo/apps.html) displays a fictional database, separate Production/Test indicators, simulated module availability and installation states, and a disabled approval checkpoint. `pl_auth` is available but explicitly not installed. [`plementus/database-info.html`](../../fixtures/plementus/database-info.html) displays fictional candidate Database INFO values, review/submit, and separate disabled Connect Live/Test checkpoints in `not-connected` states. These pages do not claim real Plementus field mappings or native `pl_auth` behavior. They are local test infrastructure for a future **online** extension; no adapter or runtime connection was added.

## Evidence and limits

| Check | Result | Limit |
|---|---|---|
| `node --test test/*.test.mjs` | **69 PASS, 0 FAIL, 0 SKIP**; four new structural cases | Source assertions only. |
| `node --check test/customer-plementus-fixtures.test.mjs` | **PASS** | Syntax only. |
| Local Playwright Chromium `file:` smoke | **22 PASS, 0 FAIL**; Chromium 151.0.7922.34 | Rendered two pages, found semantic landmarks, accessible labeled fields and disabled controls; zero external requests/page errors. Fixture behavior only. |

No real customer system, provider account, credentials, module installation, submission, connection, storage, extension worker or content script was used. Real provider structure and behavior are **UNVERIFIED**. The existing adapter contract, Odoo.sh fixtures, protected source and SEC-01 policy remained unchanged; master plan equals its source byte-for-byte. See [test evidence](../04_TEST_EVIDENCE.md). Stop for ChatGPT acceptance before 05.04.
