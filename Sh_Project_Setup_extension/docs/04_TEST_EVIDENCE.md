# Test and validation evidence

Current evidence includes documentation, read-only Git/tooling inspection, static MV3 artifact validation, and an isolated local Chrome smoke test. **2/20 master phases; 9/72 micro-phases accepted; 02.03 READY_FOR_REVIEW.** The unpacked extension smoke test is **LOCAL_BROWSER_TESTED / PASS**. Workflow, security, provider, and real-site tests remain **NOT RUN**. No provider or production capability follows from this local result.

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

Historical 00.02 commit comparison `git --no-optional-locks diff --check 39a6e97e637dd227aadea5529b2d1a80e2d4c531 HEAD` in 00.03 returned exit 2 for source-preserved Markdown hard-break whitespace. This was not an application test and its `HEAD` referred to that historical run. Do not alter the authoritative plan to remove it.

## Evidence tiers

The plan defines `SIMULATED`, `LOCAL_BROWSER_TESTED`, `GITHUB_SANDBOX_VERIFIED`, `MANUALLY_ATTESTED`, `ODOO_SH_DEMO_VERIFIED`, and `PLEMENTUS_DEMO_VERIFIED`. No tier has been earned for product behavior in Phase 00. Git/documentation checks must not be relabeled as fixture, browser, sandbox or demo evidence. A manual attestation is distinct from observed automatic verification.

## Not run / future coverage

Unit, integration, fixture, workflow, security, interruption/recovery, GitHub sandbox, real Odoo.sh and real Plementus tests: **NOT RUN**. MV3 unpacked loading is the sole **LOCAL_BROWSER_TESTED / PASS** result in this phase. The future coverage, conditions and evidence required are in [test matrix](10_TEST_MATRIX.md). Real demos require separate authorization and access; unsupported capabilities remain UNVERIFIED. The Phase 01.02 report records the current browser/runtime/tool versions and exact prerequisite-check results; no product test total is claimed.
