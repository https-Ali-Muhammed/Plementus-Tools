# Project changelog

## 2026-10-29: SEC-01 combined clock and restart remediation, ready for review

Updated the disconnected checkpoint service for bracketed clock sampling, cumulative forward-jump detection, volatile creation-time evidence and conservative seven-day cleanup. Added synthetic regressions and isolated Chromium timing checks; final results were **88 Node PASS** and **13 + 9 Chromium PASS**. The [combined report](Phases/PHASE_04_SEC01_RUNTIME_CLOCK_COMBINED_REMEDIATION.md) records candidate numerical assumptions, restart retention and remaining security gates. Progress remains **5/20 and 22/72**; Phase 04 **IN_PROGRESS / BLOCKED**, production **NO_GO**. No production wiring, commit or push.

## 2026-10-29: SEC-01 clock-safety Chromium regression, ready for review

Updated the two historical browser scripts for the accepted fail-closed clock and known-record rules, preserving guarded create, transaction, revision, terminal, schema, authorization and lifecycle coverage. The [new report](Phases/PHASE_04_SEC01_CLOCK_SAFETY_BROWSER.md) records baseline failures, final 80 Node PASS, 20 isolated Chromium PASS, direct worker stop/reactivation and same-profile browser restart. Only test scripts and current documentation changed. Progress remains **5/20 and 22/72**; Phase 04 **IN_PROGRESS / BLOCKED**, activation **NO_GO**. No commit or push.

## 2026-10-29: Phase 05 parent acceptance, documentation closure

Owner/ChatGPT accepted 05.01–05.04 and passed the [Phase 05 parent exit review](Phases/PHASE_05.md). Progress is **5/20 master phases; 22/72 micro-phases accepted**. The five invented provider-like HTML pages, pure v1 contract and F01–F07 scenarios satisfy local Phase 05 criteria; the recorded Node suite had **75 PASS**, with prior bounded fixture-browser checks of **12 PASS** and **22 PASS**. Mock evidence does not verify real provider behavior. The final product remains an online-capable Chrome extension; Phase 04 runtime-security gates remain unresolved and production NO_GO. No Phase 06 or production implementation is authorized. This entry changes documentation only.

## 2026-10-29: Phase 05.04 deterministic failure fixtures, ready for review

Owner accepted 05.03, raising progress to 4/20 and 21/72. Added a pure [failure-state catalog](../fixtures/scenarios/failure-states.mjs), Node contract tests and [05.04 report](Phases/PHASE_05_04.md). No provider, worker, storage or network integration was added. Phase 04 remains blocked, real provider behavior UNVERIFIED and activation NO_GO.

## 2026-10-29: Phase 05.02 mock Odoo.sh pages, ready for review

Owner accepted 05.01, bringing progress to 4/20 and 19/72. Added three invented local Odoo.sh-like pages, structural tests and [05.02 report](Phases/PHASE_05_02.md). Node and local browser checks passed. These fixtures are test infrastructure for the future online extension; no provider, worker, storage or network integration was added. Phase 04 remains blocked and activation NO_GO.

## 2026-10-29: Phase 05.01 versioned adapter contract, ready for review

Owner-approved offline sequencing exception while Phase 04 remains blocked. Added a pure v1 provider-neutral contract, Node tests and [05.01 report](Phases/PHASE_05_01.md). No provider, browser, storage or worker integration. Progress remains 4/20 and 18/72; production NO_GO.

Chronological project record; no entry implies application functionality or live provider verification. Current progress is **5/20 master phases; 22/72 micro-phases accepted**; 04.02 is ACCEPTED FOR SIMULATED FOUNDATION ONLY; 04.03 for SYNTHETIC DECISIONS ONLY; 04.04 for PURE VALIDATION AND SIMULATION ONLY. SEC-01 CP1–CP4, the disconnected cleanup gate and isolated browser cleanup are ACCEPTED within their scopes. Retention Option B remains OWNER_APPROVED; COMBINED_AB_OPERATIONAL_POLICY and UNCERTAIN_TIME_RETENTION_AMENDMENT are OWNER_APPROVED. SEC-01 operational implementation is not authorized. Phase 04 remains IN_PROGRESS / BLOCKED and activation is NO_GO.

## 2026-10-29: SEC-01 combined A+B operational policy and uncertainty amendment approved

At clean, published HEAD `6e83eff869436dc8c7e385d5c11c34eedf5e8274`, the owner approved the final [combined operational policy](Phases/PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md) and a separate [uncertain-time retention amendment](Phases/PHASE_04_SEC01_UNCERTAIN_TIME_RETENTION_AMENDMENT.md). The exception permits blocked local retention without a guaranteed maximum and case-specific project-owner-approved deletion when expiry cannot be established; no delegation or old-checkpoint replay is approved. The original SEC-01 and Retention Option B policies and historical reports remain unchanged. Documentation only; implementation, browser/storage writes, tests, provider work, commit and push were not performed.

## 2026-10-29: SEC-01 combined A+B direction, consolidated owner decision pending

At clean HEAD `49ed3c48c5fbaf658c8980d26e95e97a47e2cd5f`, with equal upstream and live origin, recorded the owner's combined hold plus separately authorized deletion direction. Revised the existing [manual-resolution package](Phases/PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md) to propose one set of operating rules, explain why browser-only time cannot enforce a guaranteed maximum hold, and present one decision register and unapproved amendment wording. No operating policy, implementation, test, browser write, provider operation, commit, push or activation was authorized or performed.

## 2026-10-29: SEC-01 Clock B manual-resolution decision, owner review pending

At clean HEAD `14ca7d6ec0af6994fe72a1c088b6efab97a253bb`, recorded the owner's Clock B direction-only approval. Added a [separate decision package](Phases/PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md) comparing blocked retention, approved destructive deletion and automatic discard; proposed manual rules and separately labeled, unapproved retention-amendment wording. No operational policy, implementation or activation was approved. Documentation validation only; no application or browser tests, storage write, provider action, commit or push.

## 2026-10-29: SEC-01 isolated real-browser cleanup, ready for review

Owner-authorized synthetic verification used a disposable Chrome profile and the current disconnected storage modules in a test-only MV3 extension. Node suite: 50 PASS; real Chrome cleanup: 11 PASS, 0 FAIL/SKIP/BLOCKED, including atomic rollback, direct worker stop/reactivation and browser-process restart. The [browser report](Phases/PHASE_04_SEC01_CLEANUP_GATE_BROWSER.md) records commands, observed ordering, harness corrections and limits. Production code, permissions and runtime integration were unchanged; no provider action, commit or push occurred.

## 2026-10-29: SEC-01 disconnected cleanup gate, ready for review

The owner authorized the service-only cleanup gate and synthetic tests. The existing injected service now gates all public checkpoint operations, shares an in-flight cleanup pass, and deletes expired valid records atomically in one readwrite transaction. Node v24.19.0 reported 50 PASS, 0 FAIL, 0 SKIP; three changed JavaScript modules passed syntax checks. The [implementation report](Phases/PHASE_04_SEC01_CLEANUP_GATE_IMPLEMENTATION.md) records commands, failures, limitations and the remaining production blockers. No worker integration, browser test, provider action, commit or push occurred.

## 2026-10-28: 00.01, accepted

Codex reported verifying the existing Git root, origin, branch, HEAD and worktree, then creating `feature/sh-project-setup-extension` from `feature/odoo-tracebridge` at `39a6e97e637dd227aadea5529b2d1a80e2d4c531`. The two untracked source documents were preserved. This was Git preparation only. The owner subsequently reported acceptance. Historical evidence and limits: [00.01 retrospective](Phases/PHASE_00_01.md).

## 2026-10-28: 00.02, accepted

Created status, verbatim master plan, architecture decisions, the parent report and the 00.01 retrospective. Prior Codex reported documentation/source/20–72 checks and worktree preservation; no application tests ran. The owner reported acceptance and created documentation-only commit `881d431371c75afebebddc6984c2626e5623518a`. See [00.02 retrospective](Phases/PHASE_00_02.md).

## 2026-10-28: 00.03, accepted

Created requirements, integration, security and feasibility documents and the 00.02/00.03 reports; updated status and the parent report. Prior Codex reported source preservation, ordered counts, 44 local link targets and scoped pattern checks. The owner reported acceptance and created documentation-only commit `d7a3a5ee6c07eacc2810402e6e8d688e9c2c0b73`; 00.04 verified its direct parent and eight-path delta. Historical checks and limitations: [00.03 report](Phases/PHASE_00_03.md).

## 2026-10-28: 00.04, accepted

Added this changelog, [test evidence](04_TEST_EVIDENCE.md), [blockers and decisions](05_BLOCKERS_AND_DECISIONS.md), [handoff](06_HANDOFF.md), [test matrix](10_TEST_MATRIX.md), [operations runbook](11_OPERATIONS_RUNBOOK.md), and [00.04 report](Phases/PHASE_00_04.md). Updated status and parent Phase 00. No extension code, browser operation, provider access or Git mutation. Documentation checks and actual results are recorded in the 00.04 report. The owner subsequently accepted 00.04 and parent Phase 00.

## 2026-10-28: 01.01, ready for review

Read-only inventory verified the current feature branch, upstream, worktree, documentation-only 00.04 successor commit, extension contents and tracked/untracked/ignored states. It found 18 tracked documentation files, 1 new untracked Phase 01.01 report, and 2 preserved untracked source Markdown files; no extension implementation, manifest, test, fixture or package configuration exists. It also recorded that the branch remains 29 commits ahead of `main` and 3 ahead of the inherited TraceBridge tip. See [01.01 inventory](Phases/PHASE_01_01.md). No application, browser, provider, package-manager or Git mutation occurred.

## 2026-10-28: clean-branch remediation

Historical remediation created local branch `feature/sh-project-setup-extension-clean` from `origin/main` at `9a818495593c88ef6d4a1376e7f81be26513e0b5` and migrated 19 extension documents plus two authoritative source Markdown files from preserved `feature/sh-project-setup-extension`; all 21 migration-file hashes matched. At that historical point it was unpublished. Later, owner commit `47a0fb38171b3b21c7317c788e746c12272059d3` published the 22-file baseline; owner-created successor `0d7f169b8013e588b637eb7fec1bffb85f1614c7` published the 01.02 documentation records. See [Git remediation](Phases/GIT_BRANCH_REMEDIATION.md).

## 2026-10-28: 01.02, ready for review

Read-only tooling audit verified the requested root, origin, branch, upstream, expected HEAD `47a0fb38171b3b21c7317c788e746c12272059d3`, clean worktree, remote feature publication and `origin/main` ancestry. It recorded Ubuntu 22.04.5 x86_64, Node 24.19.0, npm 11.17.0, pnpm 11.25.0, Corepack 0.35.0, absent Yarn, unavailable system Chromium Snap wrapper, and a usable local Playwright-managed Chrome for Testing 151.0.7922.34. The extension remains documentation-only with no package/build/test setup. See [01.02 audit](Phases/PHASE_01_02.md). No installation, external-site access, Git mutation, application test, or 01.03 work occurred.

## 2026-10-28: 01.03, accepted

Selected the minimal MV3 baseline: vanilla browser ES modules without a bundler or framework, an action popup, event-driven worker boundary, no initial permissions/host access, and deferred storage/adapters. Node's built-in runner is the future pure-logic baseline; Playwright is deferred until an extension-local dependency is explicitly added for local unpacked-extension/fixture testing. No source, manifest, dependency, browser extension load, provider access, or application test occurred. See [ADR-005](02_ARCHITECTURE_DECISIONS.md) and [01.03 report](Phases/PHASE_01_03.md).

## 2026-10-28: 02.01, accepted

Created the minimal MV3 `manifest.json` with only `manifest_version`, name, and version. Node parsed the JSON and confirmed MV3 required fields, no permissions, host permissions, runtime-file references, or remote code. Browser loading and provider tests did not run. See [02.01 report](Phases/PHASE_02_01.md).

## 2026-10-28: 02.02, accepted

Added the module MV3 worker and the accessible static popup, referenced only by the manifest. Static checks cover manifest references, JavaScript syntax, HTML local paths, absence of permissions and remote code, source preservation, and scoped changes. Browser loading and provider tests did not run. See [02.02 report](Phases/PHASE_02_02.md).

## 2026-10-28: 02.03, accepted

Added local unpacked-installation instructions. Playwright-managed Chrome for Testing 151.0.7922.34 loaded the extension in a disposable profile, registered the worker, rendered the popup's title and status message, and reported empty permissions and host access without page errors. No provider site or account was used. See [02.03 report](Phases/PHASE_02_03.md).

## 2026-10-28: 03.01, accepted

Replaced the static popup with a responsive, scrollable preview-only “Set Up New Customer” wizard shell. It exposes labelled, disabled controls and headings for customer/subscription, GitHub/Utilities, Production/Staging/modules/domains, and review/confirmation; navigation remains disabled. It has no JavaScript, validation, storage, provider connection, or data collection. Static structure/permission checks and the isolated local Chrome popup smoke test passed. See [03.01 report](Phases/PHASE_03_01.md).

## 2026-10-28: 03.02, accepted

Enabled only the customer/project name, subscription mode, and masked subscription-reference inputs. Added a small in-memory browser module and Node tests for required, whitespace, valid customer/partner-trial, and length-limit cases. Inline errors are generic and accessible; the reference is not included in an error, console output, storage, or network request. The local Chrome popup smoke test passed. See [03.02 report](Phases/PHASE_03_02.md).

## 2026-10-29: 03.03, ready for review

Added local GitHub organization, repository selection/name and repeatable optional Utilities fields. Validation covers supported GitHub URLs, credentials, relative paths, and duplicates; Enter cannot submit the form. Node and local Chrome checks passed. No GitHub access or submodule operation occurred. See [03.03 report](Phases/PHASE_03_03.md).

## 2026-10-29: 03.04, ready for review

Reconciled 03.03 as accepted per owner instruction. Added in-memory branch and domain validation and a safely rendered, subscription-reference-redacted summary. Node and local Chrome checks passed; no provider access occurred. See [03.04 report](Phases/PHASE_03_04.md).

## 2026-10-29: 04.01, ready for review

Reconciled Phase 03 and 03.04 as accepted per owner instruction. Added a pure state transition module and Node tests; documented the deferred requested-module selection gap. See [04.01 report](Phases/PHASE_04_01.md).

## 2026-10-29: 04.02, ready for review

Reconciled 04.01 as accepted per owner instruction. Added strict run-record validation and a dependency-injected repository tested with a synthetic in-memory fake. Real browser persistence remains blocked pending policy. See [04.02 report](Phases/PHASE_04_02.md), including the older 03.03 smoke test failure.

## 2026-10-29: 04.03, ready for review

Owner accepted 04.02 for its simulated foundation only. Added a read-only synthetic recovery decision and tests; no workflow actions or durable storage. Chrome startup and both popup smokes passed on this run; the previous startup timeouts remain unexplained and preserved. See [04.03 report](Phases/PHASE_04_03.md).

## 2026-10-29: 04.04, ready for review

Owner accepted 04.03 for synthetic decisions only. Added pure expected-state and revision transition proposals with simulated conflict tests and conservative reconciliation handling. Parent Phase 04 remains in progress; see [04.04](Phases/PHASE_04_04.md).

## 2026-10-29: SEC-01 policy approved

Recorded owner approval of the durable-checkpoint security, privacy, retention, and recovery policy. It permits only the sanitized checkpoint schema plus immutable creation time, seven-day non-renewable local retention, guarded access, and fail-closed reconciliation. Implementation, device-control verification, incident contacts, lifecycle testing, and parent Phase 04 acceptance remain open. See [SEC-01](Phases/PHASE_04_SEC01_APPROVED_POLICY.md).

## 2026-10-29: SEC-01 CP1, ready for review

Implemented disconnected v2 schema and retention guards with synthetic Node tests. No migration, database, persistence, or runtime integration. See [CP1](Phases/PHASE_04_SEC01_CP1.md).

## 2026-10-29: SEC-01 CP2, ready for review

Implemented a disconnected injected-factory transactional service and synthetic tests; CP1 is accepted. No runtime or browser storage activation. See [CP2](Phases/PHASE_04_SEC01_CP2.md).

## 2026-10-29: SEC-01 CP3, ready for review

CP2 accepted. Isolated Chrome IndexedDB, direct CDP worker stop/reactivation, and browser-process restart tests passed in a disposable profile. See [CP3](Phases/PHASE_04_SEC01_CP3.md).

## 2026-10-29: SEC-01 CP4, ready for review

Reconciled ChatGPT acceptance of CP3 and the owner-reported published commit `7d0861c` (local HEAD equals local upstream; no fetch). Added a documentation-only [readiness review](Phases/PHASE_04_SEC01_CP4_READINESS_REVIEW.md) with activation NO_GO and unresolved retention, clock, incident, device, operator and runtime gates. No security or browser tests were run for CP4.

## 2026-10-29: SEC-01 Option B retention amendment, owner-approved

Reconciled ChatGPT acceptance of CP4. The owner approved logical expiry at seven days and physical deletion at the next available extension execution if Chrome was closed at expiry. Added the dated [Option B amendment](Phases/PHASE_04_SEC01_RETENTION_AMENDMENT_B.md) and updated the [authoritative policy](Phases/PHASE_04_SEC01_APPROVED_POLICY.md). The historical CP4 NO_GO review remains unchanged; automatic cleanup, clock trust and other activation controls remain unverified. Documentation only; no tests or activation.

## 2026-10-29: SEC-01 Option B cleanup and clock-safety design, ready for review

Documented the proposed local MV3 [cleanup gate, transaction ordering, clock limits and test plan](Phases/PHASE_04_SEC01_CLEANUP_CLOCK_DESIGN.md). No code, browser test, storage write, permission, provider action or activation. Clock trust across restarts and the other security gates remain open; progress is unchanged.

## 2026-10-29: SEC-01 clock-trust decision draft, ready for owner review

Verified owner-published browser-cleanup commit `90d369d4917b30c4d5d55b3485200b73d45ec161`, exact eight-file scope, clean whole-repository worktree and live origin equality. Recorded acceptance of the bounded browser-cleanup verification. Added the [clock-trust decision draft](Phases/PHASE_04_SEC01_CLOCK_TRUST_DECISION_DRAFT.md) and updated current status, blocker, handoff, security and Phase 04 records. **No clock policy is selected.** Option B retention remains owner-approved; Phase 04 remains IN_PROGRESS / BLOCKED, progress 4/20 and 18/72, activation NO_GO. Documentation validation only; no implementation or test run.

## 2026-10-29: 05.03, ready for review

Reconciled owner acceptance of 05.02 to 4/20 master and 20/72 accepted micro-phases. Added invented customer Odoo Apps and Plementus Database INFO fixture pages and structural tests. Node 69 PASS; local Chromium 22 PASS. No provider or extension runtime integration. See [05.03 report](Phases/PHASE_05_03.md).
