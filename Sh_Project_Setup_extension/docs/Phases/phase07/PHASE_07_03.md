# Phase 07.03 — Read-only admission and mocked tests

2026-11-09 (Africa/Cairo). **COMPLETE / ACCEPTED — MOCK_ONLY.** This is the current official micro-phase acceptance record for the owner's revised disconnected mock-only scope. It supersedes earlier 07.03 NOT_STARTED / NOT_AUTHORIZED status snapshots only for that scope; all historical entries remain verbatim. This documentation packet is **READY_FOR_CHATGPT_REVIEW**; its document-verification review is separate from the owner acceptance recorded here.

## 1. Owner decision and evidence provenance

On **2026-11-09**, the project owner explicitly approved marking official **07.03** complete under the revised disconnected mock-only scope in the same Codex chat used for R1 implementation. Accepted implementation commit: **`964b0726e8c5a352cb3a425cefd7e204dec8c7f4`**. The owner identifies the published R1 contract, one-time owner risk acceptance, completed implementation, test evidence and ChatGPT review as the basis of acceptance.

Authority is the owner's current explicit decision, not an inference from Git publication or passing tests. The prior ChatGPT review is **owner-reported acceptance evidence**: no separate review transcript was fetched, no reviewer identity or independent human security role was invented, and this task did not rerun that review. The earlier Codex implementation report and technical subagent review are historical AI-assisted evidence, not independent human security concurrence.

The [R1 contract](PHASE_07_03_R1_CONTRACT_FREEZE.md) remains the technical baseline. The [one-time owner risk-acceptance exception](PHASE_07_03_R1_OWNER_RISK_ACCEPTANCE.md) replaced the independent security-concurrence prerequisite only for disconnected R1; **independent human security concurrence was not obtained**. The earlier [R0 decisions](PHASE_07_03_R0_OWNER_SECURITY_DECISIONS.md), contract and exception retain their historical pending/not-authorized wording. The separately scoped R1 implementation authorization and this later acceptance decision supersede those historical execution/status gates only within the accepted mock scope. No contract, policy or master-plan text is rewritten.

## 2. Accepted deliverables and scope

Both files are relative to `Sh_Project_Setup_extension` and were earlier verifiedly verified byte-equal to the required published implementation commit:

| Accepted file | Purpose |
|---|---|
| [src/browser/read-only-admission.mjs](../../../src/browser/read-only-admission.mjs) | Disconnected `createReadOnlyAdmission(boundary, limits)` controller using injected synthetic capabilities and time |
| [test/read-only-admission.test.mjs](../../../test/read-only-admission.test.mjs) | Deterministic native ES-module tests using Node's bundled test/assert facilities |

The accepted result is a one-shot read-only **mock** admission controller with strict closed-record validation, private capture provenance, explicit role selection, connection ownership, one-use correlation tickets and fixed synthetic Plementus/GitHub/Odoo.sh targets. One pending observation is allowed; there is no queue, retry or product integration. Existing BF-07 remains unchanged and disconnected, with its separate OFFLINE_SIMULATED evidence contract.

Public evidence is **SIMULATED** only. `accountVerified`, `executionAuthorized`, `approvalGranted` and `trustedContinuingContext` remain literal **false**. Manual fallback is non-authorizing. Supported role summaries represent historical one-shot mock observations, not an atomic or continuously valid three-tab context.

No actual Chrome execution, account verification, provider call, permission adoption, credential handling, persistence, business write, workflow/storage bridge or product wiring is accepted or performed by this task. Existing popup, background, manifest, fixtures and dependencies are unchanged. Real-browser validation, R2 and later integration each require separate scoped approval. This is **not browser-security certification or production authorization**.

## 3. Local Git baseline and supplied remote evidence

| Check | Earlier verified observation |
|---|---|
| Root | `/home/https_ali_muhammed/Plementus/Tools-sh-project-setup-extension-clean` |
| Branch | `feature/sh-project-setup-extension-clean` |
| HEAD / local upstream SHA; owner-supplied independent remote verification | `964b0726e8c5a352cb3a425cefd7e204dec8c7f4` |
| Upstream | `origin/feature/sh-project-setup-extension-clean` |
| Origin fetch/push URL | `https://github.com/https-Ali-Muhammed/Plementus-Tools.git` |
| Runtime | `node --version` → `v24.19.0` |
| Initial index | No staged changes |
| Sibling worktree | `/home/https_ali_muhammed/Plementus/Tools`, branch `feature/sh-project-setup-extension`, HEAD `390c9ea7c311f362ea04aad64ed14569161642ec` |

The earlier single authorized `git ls-remote` attempt failed with a GitHub connection timeout (exit 128); it did not verify a remote SHA. The owner subsequently authorized using ChatGPT’s independent remote verification at the required SHA. That is supplied review evidence, not a successful Codex network check. No network command was run during this resumed documentation task; no fetch, checkout, reset, stash, staging, commit or push was performed. The sibling's two pre-existing untracked source documents are preserved. Historical unexplained `refs/codex/` changes remain unattributed and unrepaired; entry-to-final preservation does not establish historical preservation.

## 4. Reused validation evidence and provenance

Previously run from `Sh_Project_Setup_extension` on 2026-11-09 with Node **v24.19.0**; results reused here, not rerun:

| Command | Earlier verified result |
|---|---|
| `node --check src/browser/read-only-admission.mjs` | PASS, exit 0 |
| `node --check test/read-only-admission.test.mjs` | PASS, exit 0 |
| `node --test test/read-only-admission.test.mjs` | **281 PASS / 0 FAIL / 0 SKIP / 0 cancelled**, exit 0 |
| `node --test test/*.test.mjs` | **569 PASS / 0 FAIL / 0 SKIP / 0 cancelled**, exit 0 |

The earlier Codex implementation report also recorded focused **281/0/0**, full **569/0/0**, and **470 preservation checks PASS**. Those are historical Codex-reported results. The application-test totals above are reused from the earlier completed Node v24.19.0 verification in this chat; no application tests or Node execution were repeated during this documentation resumption. The historical preservation count is not the current documentation-check count. Current preservation measurements are in the appended [test-evidence record](../../04_TEST_EVIDENCE.md). Prior ChatGPT review is owner-reported; no new ChatGPT review is claimed by these commands.

Raw earlier verified logs are temporarily retained outside Git at `/tmp/phase0703-acceptance/focused.txt` and `/tmp/phase0703-acceptance/full.txt`. The committed test file and commands above make the application evidence reproducible without those temporary files. Neither suite is a real browser/provider test.

## 5. Observed mock coverage and limits

| Area | Passing synthetic evidence |
|---|---|
| T1 — Closed schemas and roles | Exact required fields/types/enums; unknown/missing/extra/symbol/accessor/prototype failures; no getter/coercion/serialization-hook admission; cycles, aliases, depth and dense-result checks; explicit roles and exact synthetic origin/URL/document matching |
| T2 — Ownership and replay | Private capture plus confirmation before reads; connection identity; stale/copied/wrong-owner and malformed correlations; consumed/future tickets; retired review and obsolete-disconnect isolation; copied cross-instance strings alone supply no authority |
| T3 — Synchronous terminal precedence | `boundary.read` entry is IN_FLIGHT; current-owner cancel/manual, trusted lifecycle invalidation, recapture/review replacement and applicable authenticated faults preempt busy. Wrong-owner/stale/unproven traffic remains a pure rejection, and nonterminal busy calls do not consume the terminal ticket |
| T3 — Settlement and retirement | Held and synchronously terminated reads settle the public observation once; first terminal reason is retained; affected unsettled reads become permanently CLOSED/RETIRED; later work cannot start another read. Actual late fulfillment/rejection, already-settled native Promises, synchronous throws, cleanup reentry/faults and validation reentry remain inert after closure |
| T4 — Privacy and non-authority | Frozen sanitized public copies, bounded envelopes, no private comparator/error leakage, SIMULATED label and all four false flags; no runtime import/product dependency; test instrumentation observes cleared private cells without claiming memory erasure |
| T5 — Lifecycle | Synthetic target/navigation/document change, same-URL document drift, review replacement/loss, worker restart, stale completion and historical-only summaries |
| T6 — Faults and numeric boundaries | Never-settling/rejected/invalid read returns; timer, cleanup and ticket-callback faults; early/stale/delayed callbacks; malformed/backward clocks; exact capture/observation expiry; safe counter exhaustion; UTF-8 multibyte, escaping, lone-surrogate and aggregate-size tests |

The synchronous matrix also covers a terminal action followed by a second termination, throw or already-rejected native Promise; authenticated schema faults versus stale malformed traffic; and historical terminal latches during earlier verified descriptor/clock/lifecycle reentry. The test sentinel separately proves genuine late fulfillment rather than accidental native assimilation rejection. The test runner reported no unhandled rejection failures.

Unchanged P6 limits: 32-byte operation/reason codes; 128-byte IDs; 256-byte private origins; 2,048-byte private URLs; 1,024/4,096/512-byte intent/result/public envelopes; at most 16 fields and record depth 2; one result element; three roles, one capture and one pending read; non-renewable 60,000-ms capture and 5,000-ms observation deadlines. Tests include minus-one/exact/plus-one sizing and expiry equality. Strict closed schemas can reject shapes before generic maxima are reached. Unreachable counter ceilings and selected internal guards use test-only source copies; no production override or introspection endpoint is added.

These results do not establish physical cancellation, secure erasure, garbage-collection timing, trusted real clocks, cross-instance browser-operation bounds, hostile-page isolation, actual Chrome lifecycle/grants or account/provider rights. Native Promise evidence concerns the controlled corpus; arbitrary poisoned constructor/species capabilities were not tested or certified. No broader contract or capability is introduced by acceptance.

## 6. Official progress and preserved blockers

Official Phase 07.03 is **COMPLETE / ACCEPTED — MOCK_ONLY**. Official micro-phase progress is **29/72**, with **43 remaining**; master-phase progress is **5/20**, unchanged. Phase 07 parent remains **IN_PROGRESS / NOT ACCEPTED**; Phase 04 **BLOCKED / POSTPONED**; Phase 06 **PARTIAL / BLOCKED / NOT ACCEPTED**; production **NO_GO**.

D-04/B-02/B-03 remain **OPEN**; all twelve historical security decisions retain their unresolved **PENDING** dispositions outside the narrowly recorded R1 exception. Phase 04 SEC-01 cleanup/outcome, clock/restart, HELD_UNCERTAIN and operational-control blockers remain. Phase 06 runtime approval, durable duplicate prevention and reconciliation are not supplied by mock admission.

The original BF-11 activeTab denial remains **UNRESOLVED**. All eight BF-11-R1 unsupported groups remain **NOT_RUN**: `optional_grant_removal`, `natural_idle`, `crash_session_restore`, `bfcache_prerender_onReplaced`, `browser_permission_prompts`, `hostile_real_pages`, `bf07_runtime_integration`, `continuous_navigation_monitoring`. Prior fixture evidence is neither rerun nor promoted to real-site or production evidence. No unrelated blocker or earlier report is rewritten.

## 7. Documentation preservation and next action

Authored scope is exactly this new report plus append-only current acceptance records in [Phase 07](PHASE_07.md), [project status](../../00_PROJECT_STATUS.md), [changelog](../../03_CHANGELOG.md), [test evidence](../../04_TEST_EVIDENCE.md), [blockers and decisions](../../05_BLOCKERS_AND_DECISIONS.md), and [handoff](../../06_HANDOFF.md). Six original file prefixes are preserved byte-for-byte. Source/tests, contracts, security policy, master/canonical plans and all other non-IDE tracked files remain unchanged. Both protected IDE paths are inspected only by Git/path/stat metadata: no content read, hash, diff, stage, restore or modification, and no content-equality claim.

Current-task verification covers the exact seven paths, appended-prefix preservation, local Markdown targets, unchanged non-IDE files, index/refs/config/worktrees and protected metadata. Final measured results are appended to [test evidence](../../04_TEST_EVIDENCE.md). Skills used: Ponytail scope discipline and Superpowers workflow/verification guidance already read in this chat. Tools: functions.exec with shell/Git/Python; no application MCP connector, external research, browser tool or new subagent used for this documentation task.

**NEXT:** ChatGPT verifies these acceptance documents; the owner then commits and pushes the acceptance record. This task performs neither action. **STOP.** No Phase 08, new micro-phase, R2 or integration starts automatically.

### Current reference-handling exception

The owner permits qualifying `refs/codex/` name additions/removals for this documentation task, with added targets restricted to `372fcbaefd16e98ce7ef2a17c4e9e604c3ea442d` and no retained-name retargeting. The original-baseline comparison shows two additions/two removals; provenance is UNKNOWN. Exact original, resumed-entry and final name/target metadata and current preservation results are recorded in the appended [test-evidence entry](../../04_TEST_EVIDENCE.md). No reference stability, ownership or repair is claimed. Normal refs and all other stop conditions remain protected. No network or application rerun was performed during this resumption.
