# Test and validation evidence

Current evidence includes documentation, read-only Git/tooling inspection, static MV3 artifact validation, Node validation tests, and isolated local Chrome smoke tests. **4/20 master phases; 18/72 micro-phases accepted; 04.02 ACCEPTED FOR SIMULATED FOUNDATION ONLY; 04.03 ACCEPTED FOR SYNTHETIC DECISIONS ONLY; 04.04 ACCEPTED FOR PURE VALIDATION AND SIMULATION ONLY.** The current unpacked extension smoke tests are **LOCAL_BROWSER_TESTED / PASS**; earlier startup timeouts are preserved below. Workflow execution, security, provider, and real-site tests remain **NOT RUN**. No provider or production capability follows from this local result.

The [SEC-01 disconnected cleanup gate](Phases/PHASE_04_SEC01_CLEANUP_GATE_IMPLEMENTATION.md) is **CLEANUP_GATE READY_FOR_REVIEW** under **OPTION_B OWNER_APPROVED / IMPLEMENTATION_PARTIAL**. Its current Node run is **50 PASS, 0 FAIL, 0 SKIP** (39 retained cases, 11 new cases; 10 net additional), with three syntax checks passing. This is synthetic service evidence only; the prior isolated Chrome results did not exercise the new gate.

## Actual evidence

| Phase | Actual check / outcome | Evidence and limits |
|---|---|---|
| 00.01 | Prior Codex reported Git identity, branch conflict and pre/post preservation checks PASS. | [Retrospective](Phases/PHASE_00_01.md); prior live branch listing is historical. No application tests. |
| 00.02 | Prior Codex reported five meaningful docs, verbatim plan, 20/72 ordering, 14 local link targets and file preservation PASS. | [Retrospective](Phases/PHASE_00_02.md); historic output, not a new runtime test. |
| 00.03 | Prior Codex reported eight scoped docs, 20/72 counts, 44 local link targets, common secret-pattern checks and preservation PASS. | [Report](Phases/PHASE_00_03.md) records the exact Python command, output and corrected first checker attempt. Pattern scans are not proof of absence of all secrets. |
| 00.04 | Read-only Git/source and foundation validation. | [00.04 report](Phases/PHASE_00_04.md) records executed commands, actual outcomes and exact delta. |
| 01.02 | Read-only environment/tooling audit; local Playwright data-URL prerequisite smoke check passed. | [01.02 report](Phases/PHASE_01_02.md) records exact versions, missing tools, exit results and limits. The smoke check did not load an extension or external site. |
| 01.03 | Read-only documentation architecture decision and owner-created 01.02 successor verification. | [01.03 report](Phases/PHASE_01_03.md) records the exact Git checks and selected baseline. No MV3/browser/product test ran. |
| 02.01 | Node parsed `manifest.json`; required MV3 fields and absence of permissions, host permissions, remote code, and file references passed. | [02.01 report](Phases/PHASE_02_01.md) records the exact command and assertions. Browser loading did not run. |
| 02.02 | Static manifest, referenced-file, JavaScript syntax, popup HTML/path, permission, remote-code, source-preservation, and scoped-delta checks. | [02.02 report](Phases/PHASE_02_02.md) records the exact commands and results. Browser loading did not run. |
| 02.03 | **LOCAL_BROWSER_TESTED / PASS:** Isolated Playwright-managed Chrome smoke test loaded the unpacked extension, registered its worker, rendered the popup, and observed empty permissions and host access with no page errors. | [02.03 report](Phases/PHASE_02_03.md) records Chrome version, exact command, result, and limits. No provider site or account was used. |
| 03.01 | **LOCAL_BROWSER_TESTED / PASS:** Fresh verification for the evidence-repair turn ran the reproducible static assertions and isolated Chrome/Playwright popup test. Chrome rendered all four sections, verified seven label targets and disabled controls/actions, and reported no page errors; static assertions confirmed local-only references and empty permissions. | [03.01 report](Phases/PHASE_03_01.md) contains the complete executable commands, actual outcomes, browser version, and evidence limits. Functional validation, persistence, workflow, GitHub sandbox, and provider tests remain **NOT RUN**. No provider site, account, sensitive value, or workflow action was used. |
| 03.02 | **LOCAL_BROWSER_TESTED / PASS:** Node's built-in runner passed four isolated validator cases. Chrome for Testing rendered generic accessible inline errors, trimmed valid text input, reported no page or console errors, made no external requests, and retained zero permissions. | [03.02 report](Phases/PHASE_03_02.md) contains executable commands and actual results. Browser rendering does not prove durable state, workflow behavior, or provider integration. |
| 03.03 | **LOCAL_BROWSER_TESTED / PASS:** Eight Node tests passed, including the 03.02 regressions. Chrome exercised local validation, duplicate entries, removal, focus, disabled actions and form submission safety; it observed no console or external network requests. | [03.03 report](Phases/PHASE_03_03.md) records commands, results, and limitations. No provider access or actual Git operation occurred. |

| 03.04 | **LOCAL_BROWSER_TESTED / PASS:** Nine Node cases and Chrome smoke passed, including prior validation regressions, branch/domain inputs, safe summary rendering, redaction, permissions and no external requests. | [03.04 report](Phases/PHASE_03_04.md) records commands and limitations. |

| 04.01 | **PASS:** 5 pure state tests and 9 popup regression tests; 0 failed, 0 skipped. | [04.01 report](Phases/PHASE_04_01.md) records commands and limits. No workflow execution or persistence was tested. |

| 04.02 | **SIMULATED / PASS:** 20 Node cases (6 record, 5 state, 9 popup validation); 0 failures or skips. The original 03.03 smoke run failed at its obsolete disabled-Production assertion; the narrow repair now expects the accepted enabled behavior. The corrected scripts timed out on that attempt; both passed in 04.03 after the worker was observed. The prior cause is unknown. | [04.02 report](Phases/PHASE_04_02.md) records both results, the corrective test change and the exact browser blocker. Real persistence remains BLOCKED. |

| 04.03 | **SIMULATED / PASS:** 23 Node tests, including 3 recovery cases; both existing Chrome smokes PASS after worker observation. | [04.03 report](Phases/PHASE_04_03.md); real storage, worker restart and provider recovery remain BLOCKED / NOT RUN. |

| 04.04 | **SIMULATED / PASS:** 27 Node tests (23 existing, 4 transition-proposal cases); no skips or failures. Browser smoke NOT RUN for this isolated module. | [04.04 report](Phases/PHASE_04_04.md); real durability and lifecycle recovery remain unverified. |

| SEC-01 cleanup gate | **SYNTHETIC / PASS:** Node v24.19.0, 50 tests passed, 0 failed/skipped; three changed JavaScript modules passed syntax checks. | [Implementation report](Phases/PHASE_04_SEC01_CLEANUP_GATE_IMPLEMENTATION.md); the fake cannot prove real IndexedDB scheduling, cross-context concurrency, restart-clock trust or production startup cleanup. No browser test in this task. |

Historical 00.02 commit comparison `git --no-optional-locks diff --check 39a6e97e637dd227aadea5529b2d1a80e2d4c531 HEAD` in 00.03 returned exit 2 for source-preserved Markdown hard-break whitespace. This was not an application test and its `HEAD` referred to that historical run. Do not alter the authoritative plan to remove it.

## Evidence tiers

The plan defines `SIMULATED`, `LOCAL_BROWSER_TESTED`, `GITHUB_SANDBOX_VERIFIED`, `MANUALLY_ATTESTED`, `ODOO_SH_DEMO_VERIFIED`, and `PLEMENTUS_DEMO_VERIFIED`. No tier has been earned for product behavior in Phase 00. Git/documentation checks must not be relabeled as fixture, browser, sandbox or demo evidence. A manual attestation is distinct from observed automatic verification.

## Not run / future coverage

Integration, fixture, workflow execution, security, real interruption/recovery, GitHub sandbox, real Odoo.sh and real Plementus tests: **NOT RUN**. The Phase 02.03 and Phase 03 popup checks are **LOCAL_BROWSER_TESTED / PASS** only. The future coverage, conditions and evidence required are in [test matrix](10_TEST_MATRIX.md). Real demos require separate authorization and access; unsupported capabilities remain UNVERIFIED. The Phase 01.02 report records the current browser/runtime/tool versions and exact prerequisite-check results; no product test total is claimed.

## SEC-01 CP1

**SIMULATED / PASS:** 32 Node tests (5 new and 27 existing), 0 failed, 0 skipped; two syntax checks passed. No browser or lifecycle test ran. Commands and limits: [CP1](Phases/PHASE_04_SEC01_CP1.md).

## SEC-01 CP2

Synthetic transactional service tests and limitations are recorded in [CP2](Phases/PHASE_04_SEC01_CP2.md). At CP2, real browser atomicity and lifecycle were NOT RUN.

## SEC-01 CP3

**ISOLATED REAL BROWSER:** 10 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED; Node regressions 40 PASS. CDP directly observed the synthetic worker stop and reactivation, with a new in-memory boot identifier and persisted revision. Browser-process restart passed. See [CP3](Phases/PHASE_04_SEC01_CP3.md) for scope and limitations.
