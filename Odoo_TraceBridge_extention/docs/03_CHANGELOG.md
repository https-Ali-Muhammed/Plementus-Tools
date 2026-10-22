# Changelog

All entries describe repository changes only. Product functionality is not implied.

## 2026-10-20 — Step DB documentation bootstrap (historical execution snapshot)
- Created root `README.md` with proposed scope, honest non-runnable status, and links to project records.
- Added eight progress records under `docs/` and `docs/Phases/PHASE_DB_DOCUMENTATION_BOOTSTRAP.md`.
- Copied the two authoritative source Markdown references verbatim into `docs/`.
- Created local branch `feature/odoo-tracebridge` from verified `origin/develop` at `64a05446cd9ca65e89c5515c6c76e8ee073fb94a`, as explicitly authorized by the owner.
- No product code, dependencies, tests, deployment, commit, or push were added/performed.

## 2026-10-20 — Phase 00 discovery and DB-state reconciliation

- Created `PRODUCT_SCOPE.md`, `COMPETITOR_MATRIX.md`, `FEASIBILITY.md`, `SUPPORT_MATRIX.md` under `docs/`, plus `docs/Phases/PHASE_00.md`: proposed MVP/scenarios, dated primary research, MV3/Odoo limits/fallbacks, all 13 versions UNKNOWN / NOT TESTED.
- Updated README, docs/00–07 and DB report with current discovery/review state. Preserved canonical references and historical DB actions; original no-commit/no-push statements describe bootstrap execution only.
- Owner reports DB accepted/pushed. Verified commit `f3cdea5` and live remote/upstream match; no Phase 00 commit/push performed.
- All changes documentation only; Phase 00 PROVISIONAL, product phases completed 0/22. No code, dependencies, Odoo/customer access, provisioning, Plemo or Phase 01 work.

## 2026-10-21 — Phase 01 architecture/security documentation (provisional)

- Reconciled Phase 00 acceptance on 2026-10-21 per owner and verified commit/push 9b728ba; preserved Phase 00 execution snapshot and accepted progress 1/22.
- Added `docs/ARCHITECTURE.md`, `docs/SECURITY_PRIVACY.md`, `docs/Phases/PHASE_01.md`: MV3 components and diagrams, message/session boundaries, permission-purpose map, threat/test map, capability degradation, current official framework comparison and policy tradeoffs.
- Updated `docs/02_ARCHITECTURE_DECISIONS.md` with accepted sequencing ADR and five proposed ADRs; WXT/React, retention, encryption, browser and production decisions remain unapproved.
- Updated `README.md`, `docs/PRODUCT_SCOPE.md`, `docs/Phases/PHASE_00.md`, and docs/00–07 (14 changed Markdown paths total); handoff second last, status last.
- Six static/Git verification groups PASS, two SKIP; runtime/browser/Odoo NOT TESTED. No code, dependencies, live Odoo/customer access, Plemo, commit/push or Phase 02 work.

## 2026-10-21 — Phase 02 MV3 scaffold (provisional)

- Reconciled owner/ChatGPT Phase 01 acceptance and verified pushed baseline `013887312f69d77458191d1663308ed9490297e7`; preserved Phase 01 historical evidence; accepted progress 2/22.
- Added project-local WXT/React popup scaffold, exact-pinned npm dependency tree/lockfile, strict TypeScript, build/dev/typecheck/lint/test scripts, one smoke test and scoped `.gitignore`.
- Replaced README's non-runnable directions with verified prerequisites, commands, production output and Chrome unpacked-install steps; all unimplemented product capabilities labeled PLANNED or NOT IMPLEMENTED.
- Recorded build, typecheck, lint and 1/1 unit test PASS; audited production and development manifests. Manual Chrome load/popup smoke NOT TESTED because no Chrome window was connected.
- Phase 02 PROVISIONAL — pending owner acceptance. No capture/Odoo/customer access, consent, persistence, Plemo, deployment, commit or push.

## 2026-10-21 — Phase 02 acceptance reconciliation and Phase 03 PROVISIONAL

- Owner/ChatGPT acceptance at pushed `fe90532`: Phase 02 COMPLETE, progress 3/22. Owner-attested Brave popup smoke PASSED; Chrome NOT TESTED. Historical Phase 02 evidence retained.
- `entrypoints/popup/main.tsx` now mounts new `Popup.tsx`; `consent.ts` validates selected identity/exact origin, explicit authorization/non-production declaration, rechecks target and drops stale async decisions. `style.css` adds local form styling/focus. No page content or browsing history is gathered.
- `consent.test.ts`: 51 focused new synthetic/mock/source tests; existing status test retained (52 total). `wxt.config.ts`: only activeTab, incognito disabled, restrictive packaged CSP. No package/lock changes.
- `README.md`, `docs/01_MASTER_PLAN.md`, `02_ARCHITECTURE_DECISIONS.md`, `04_TEST_EVIDENCE.md`, `05_BLOCKERS_AND_DECISIONS.md`, `06_DEPLOYMENT_RUNBOOK.md`, `ARCHITECTURE.md`, `SECURITY_PRIVACY.md`, `Phases/PHASE_02.md`, new `Phases/PHASE_03.md` updated; `07_HANDOFF.md` second last and `00_PROJECT_STATUS.md` last.
- Approval never starts recording. Start stays disabled until 04; no sessions/storage/observers/capture/network/telemetry/RPC/Plemo added. Production has no host grant, worker or content scripts; WXT development-only broadening documented. No commit/push/deployment. Phase 03 browser smoke NOT TESTED; no real Odoo compatibility claim.

## 2026-10-22 — Phase 03 automated verification and local development (PROVISIONAL)

- Extended existing consent policy and popup with explicit Local Development, normalized loopback HTTP(S)/exact-port support, shared declaration gating and fail-closed remote HTTP/production/unknown rejection. Retained Deny/Revoke/stale-target checks and disabled Start. Removed popup max-width constraint that native screenshots showed shrinking it to 182px; native tests assert 390px.
- Added exact Playwright 1.64.1/lock entries, Playwright/Vitest configs, two E2E fixture/spec files, manifest/verification scripts, npm test:e2e/test:e2e:headed/verify scripts and ignored .artifacts. No production permission widening, worker, content script, collection, persistence or later phase.
- Clean npm ci, production build/typecheck/lint, 123 unit/integration/regression tests and 10 actual Chromium extension specs pass. Nine specs invoke the native browser action; one directly opens the popup. Prod/dev manifests audited separately; installed production grants observed. Screenshots/traces/browser JSON/logs and verified ZIP recorded; earlier test-harness/type errors recovered and retained in logs.
- Updated README, current phase/architecture/security and docs/00–07 with superseded HTTPS-only restriction, Codex-owned permanent phase verification, exact browser evidence/limits. Handoff second last, status last. Historical Phase 02 Brave PASS/Google Chrome NOT TESTED preserved. Accepted progress remains 3/22; 28 paths unstaged/uncommitted; no commit/push/Phase 04.
