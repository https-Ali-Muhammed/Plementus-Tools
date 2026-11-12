# Phase 13 — Read-only Odoo.sh fixture page recognition

2026-11-11 (Africa/Cairo). **IN_PROGRESS / NOT ACCEPTED**.
Scope: **DOCUMENTATION_ONLY / FIXTURE-READY**.

[Phase 13.01](PHASE_13_01.md) is **READY_FOR_CHATGPT_REVIEW — DOCUMENTATION_ONLY**.
It defines a standalone deterministic fixture recognizer, not a browser observer,
provider adapter integration or authorization to collect page content.

| Micro-phase | Current boundary |
|---|---|
| 13.01 | Version 1 detection contract and future acceptance matrix; independent acceptance/publication pending |
| 13.02 | NOT_STARTED / NOT AUTHORIZED; later implementation must follow the reviewed contract |
| 13.03 | NOT_STARTED / NOT AUTHORIZED; later unknown-page handling and versioned selector isolation must preserve the v1 boundary |

The [master plan](../../01_MASTER_PLAN.md) requires fixture detection, isolated
selectors and manual fallback, with no undocumented Odoo.sh network operations or
real-browser compatibility claim. The contract uses only invented fixture origins,
local numeric slots and semantic markers; none represents an actual Odoo.sh route,
selector, UI label, account or resource. All source observations remain synthetic
and untrusted. Page classification does not establish identity, rights,
subscription availability, database/build existence, key association or installation.

## Phase 12 reconciliation and retained gates

Per the supplied review/publication instruction, [Phase 12.03](../phase12/PHASE_12_03.md)
is **ACCEPTED/PUBLISHED — FIXTURE_ONLY** at
`af73ec2d81b1ec32633f9bd174f837ebf87d95f7`, corroborated by local HEAD and recorded
upstream. [Phase 12](../phase12/PHASE_12.md) fixture-only parent exit is **PASS**.
Its original reports and historical test results remain verbatim. No test was
rerun for this reconciliation. Full Phase 12 live-capability acceptance remains
**PENDING**; fixture exit does not increment the master-phase count.

Official progress remains **42/72 accepted; 5/20 master phases accepted**, pending
independent acceptance/publication of 13.01. Phase 10.03 **BLOCKED / NOT AUTHORIZED**;
historical **35 → 24 discrepancy UNVERIFIED**; production **NO_GO**.

Application/Node/browser/provider tests **NOT RUN** for this documentation-only
phase. Exact inventory and measured document/Git checks are in the 13.01 report.
**STOP for ChatGPT review. No staging, commit, push or Phase 13.02.**

## 2026-11-12 — Phase 13.02 fixture recognition review appendix

[Phase 13.01](PHASE_13_01.md) is **ACCEPTED/PUBLISHED** at
`9d6b3534c9846d6a95c9eb165fde959a6db043e1` per supplied acceptance, corroborated by
local HEAD/upstream. Historical reports above and the accepted contract remain
verbatim; this appendix supersedes their pending-13.01/not-started-13.02 tracking.
[Phase 13.02](PHASE_13_02.md) is **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
The pure standalone recognizer implements all eight synthetic page classes,
two interruptions, canonical two-string validation and exact 29-row precedence.
All 26 output fields are frozen/sanitized; all 15 authority/effect flags are false.
No browser, provider, credential, permission, UI or runtime integration is added.

Actual behavioral RED: exported empty stub, **41 tests, 40 failed, 1 passed**,
exit **1**, assertion failures rather than module-not-found. GREEN: **41/41**
focused and **2,178/2,178** full-suite tests, exits **0**, no skips/failures.
Both requested syntax checks exit **0**. A01–A40 and competing precedence are
covered; capability sentinels report zero accesses. Independent read-only AI
review reran 41/41 and found no actionable findings; acceptance remains pending.
Additional synthetic adversarial checks cover 82,944 marker/target scenarios,
reversed order and 19 malformed/control cases, totaling 165,907 calls.

Nine-file scope: three new files and these six append-only tracking documents.
Exact inventory, acceptance mapping, test evidence and measured preservation
results are in the linked report. Accepted source/tests and contract are unchanged;
protected IDE/sibling contents were not read or hashed. Historical **35 → 24
ref discrepancy UNVERIFIED** and historical sibling-index metadata drift remain
unresolved and unattributed; no repair or blanket metadata-equality claim.

Official progress **43/72 accepted; 5/20 master phases**, unchanged pending
independent 13.02 acceptance/publication. Phase 13 **IN_PROGRESS / NOT ACCEPTED**;
Phase 12 fixture-only exit **PASS**, live capability **PENDING**; Phase 10.03
**BLOCKED / NOT AUTHORIZED**; production **NO_GO**. No staging, commit, push
or Phase 13.03. **STOP for ChatGPT review.**

Measured preservation: nine authorized changes; six exact original byte prefixes;
198 other tracked extension files unchanged; three index byte/metadata snapshots
and three worktree identities preserved. The strict full-ref-set audit initially
exited 1: **35 → 36** from one added Codex checkpoint, cause **UNVERIFIED**; all
35 original refs are unchanged. No repair or attribution. Subsequent audit records
this exception explicitly and passes original-ref preservation. No new index
metadata drift observed; historical discrepancy/drift remain UNVERIFIED. See the
13.02 report for the exact ref, SHA, evidence paths and checks. Full-ref-set
identity is not claimed. **STOP for ChatGPT review; production NO_GO.**

## 2026-11-12 — Phase 13.03 regression-only review appendix

Per supplied acceptance, Phase 13.02 is **ACCEPTED/PUBLISHED — FIXTURE_ONLY**
at `146a61a862549abea4ae35f3a6a09ae05b5f63d4`, matching local HEAD/upstream.
This supersedes earlier pending-13.02/not-started-13.03 tracking without rewriting
historical reports. [Phase 13.03](PHASE_13_03.md) is
**READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**, tests and documentation only.

Added 18 distinct unknown-page, explicit changed-context, negative version and
isolation tests. First behavioral run **GREEN: 18/18**; no manufactured RED or
accepted source/test change. Focused **59/59**, full **2196/2196**, all exit **0**,
zero failed/skipped/cancelled/todo; new test syntax exit **0**. Accepted source
isolation passes; new scenario replay reports zero capability accesses. The
private fixed v1 catalog rejects valid unsupported versions without downgrade;
unknown/marker-ambiguous outcomes retain no prior class and use MANUAL_PAGE.
Other accepted manual codes and all 15 false flags remain intact. Guidance is
documentation, not implemented UI. Scenarios explicitly supply changed context;
no cross-call lifecycle/cache/navigation enforcement is claimed.

Scope: two new files and these six append-only documents. Preflight inventoried
37 actual refs and three raw indexes; exact inventory, preservation, setup-error
accounting and limitations are recorded in the report. No protected content or
sibling source inspection, browser/provider integration, selector discovery,
credential handling, permissions or external writes. Historical **35 → 24 ref
discrepancy** and **sibling-index drift remain UNVERIFIED**; no attribution/repair.

Official progress remains **44/72 accepted; 5/20 master phases** until independent
13.03 acceptance/publication. Phase 13 **IN_PROGRESS / NOT ACCEPTED**, fixture-only
exit eligible for assessment after 13.03 publication. Phase 12 fixture-only exit
**PASS**, full live capability **PENDING**. Phase 10.03 **BLOCKED / NOT AUTHORIZED**.
Production **NO_GO**. **STOP for ChatGPT review; no stage, commit, push or 14.01.**

Final measured audit exits **0**: exactly eight authorized changes; six original
byte prefixes preserved; 201 other tracked extension files unchanged; 19 new
local links resolve; LF/final-newline/whitespace checks pass. All 37 original refs
preserved, current count 37, no additional refs. Three index byte/metadata
snapshots, 11 existing sampled Git metadata files and three worktree identities
preserved. No newly observed metadata exceptions; protected contents unverified.
Historical discrepancy/drift remain UNVERIFIED. **STOP for ChatGPT review.**
