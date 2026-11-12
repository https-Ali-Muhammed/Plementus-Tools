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
