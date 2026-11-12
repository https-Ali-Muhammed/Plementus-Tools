# Phase 12 — Public deploy-key handoff

2026-11-11 (Africa/Cairo). **IN_PROGRESS / NOT ACCEPTED**.
Scope: **DOCUMENTATION_ONLY / FIXTURE-READY**.

[12.01 handoff contract and operator UX](PHASE_12_01.md) is
**READY_FOR_CHATGPT_REVIEW — DOCUMENTATION_ONLY**. No implementation, key capture,
provider operation or new test pass is included. The master plan's historical
“Private key handoff” heading refers here only to handing off the **public** part;
private SSH keys must never enter this workflow.

| Micro-phase | Current boundary |
|---|---|
| 12.01 | Review this public-key handoff design; not accepted or published |
| 12.02 | NOT_STARTED / NOT AUTHORIZED; future disconnected fixture work requires separate scope |
| 12.03 | NOT_STARTED / NOT AUTHORIZED; unavailable-key checkpoint is designed here, not accepted as implementation |

The default is operator-assisted manual configuration of a read-only deploy key
on the selected Utilities repository. The operator obtains the real public key
through an authorized Odoo.sh workflow. Missing key means `AWAITING_OPERATOR`.
A future GitHub API route is conditional and deferred; this phase approves no
credential handling, permissions, backend, browser integration or write.

[Phase 11 reconciliation](../phase11/PHASE_11.md) records user-supplied ChatGPT
acceptance of 11.03 **FIXTURE_ONLY** and fixture-only parent exit **PASS**.
Publication is verified at `c100604267cbf9fc1f3a515902e28b3b83a031b5` against
HEAD, local upstream and the live remote branch. Full live-capability Phase 11
acceptance remains **PENDING**; this does not increase the master-phase count.

Official progress **39/72**, master phases **5/20**, unchanged pending 12.01
acceptance/publication. Phase 10.03 **BLOCKED / NOT AUTHORIZED**; historical
**35 → 24 discrepancy UNVERIFIED**; production **NO_GO**.

**STOP for ChatGPT review. No staging, commit, push or Phase 12.02.**


## 2026-11-11 — Phase 12.02 fixture review handoff

User-supplied Phase 12.01 acceptance/publication at
`b579fcc8f444e8fbaa0d1ef0ab37a18885b014e3` matches local HEAD/upstream; its report
above remains historical. [12.02](PHASE_12_02.md) is now
**READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**: disconnected memory-only handoff,
300 focused and 2,107 full-suite tests passing (exit 0). Official progress **40/72**
remains pending 12.02 acceptance/publication. Parent **IN_PROGRESS / NOT ACCEPTED**;
12.03 not started/not authorized. Phase 11 live acceptance **PENDING**; 10.03
**BLOCKED / NOT AUTHORIZED**; historical 35 → 24 discrepancy **UNVERIFIED**;
production **NO_GO**. Stop for review; no staging, commit or push.


## 2026-11-11 — Phase 12.03 operator checkpoint review handoff

Phase 12.02 is **ACCEPTED/PUBLISHED** at the user-supplied
`18af12ecd45aaa6d85f5acc4d36952918eb4c419`, matching local HEAD/upstream.
Its original report and earlier ledger wording remain historical and unchanged.
[Phase 12.03](PHASE_12_03.md) is **READY_FOR_CHATGPT_REVIEW — FIXTURE_ONLY**.
Missing/unknown key availability waits without approval or executable action;
manual confirmation, attestation and synthetic match remain distinct. Possible
write reconciliation survives cancellation. The report defines the exact manual
operator fallback, including defer while waiting as no event, and no key input.

Thirty new tests passed initially against unchanged source (GREEN, no manufactured
RED). Focused: **30/30**; combined: **330/330**; full suite: **2,137/2,137**;
source isolation: **3/3**; syntax check passed. No failures, skips or cancellations.
Exactly eight files: two new, six append-only. Preservation details and metadata
exceptions are recorded in the phase report. No accepted source/tests changed.
Official progress stays **41/72** pending independent review/publication.
Phase 12 parent **IN_PROGRESS / NOT ACCEPTED**, eligible for fixture-only exit
assessment after 12.03 publication; Phase 11 live-capability acceptance **PENDING**;
10.03 **BLOCKED / NOT AUTHORIZED**; historical 35 → 24 ref discrepancy
**UNVERIFIED**; production **NO_GO**. No actual key, association, checkout or
installation observed. STOP for ChatGPT review; no staging, commit, push or 13.01.


## 2026-11-11 — Phase 12 fixture-only acceptance reconciliation

Per the supplied Phase 13.01 instruction, [Phase 12.03](PHASE_12_03.md) is
**ACCEPTED/PUBLISHED — FIXTURE_ONLY** at
`af73ec2d81b1ec32633f9bd174f837ebf87d95f7`, corroborated by local HEAD and recorded
upstream. Phase 12 fixture-only parent exit is **PASS**. Original 12.01–12.03
reports, historical acceptance/review wording and test results remain verbatim;
no tests were rerun for this reconciliation. Full Phase 12 live-capability
acceptance remains **PENDING**. This fixture-only exit does not increment the
master-phase count.

[Phase 13.01](../phase13/PHASE_13_01.md) is
**READY_FOR_CHATGPT_REVIEW — DOCUMENTATION_ONLY**; Phase 13 parent
**IN_PROGRESS / NOT ACCEPTED**. Official progress remains **42/72 accepted; 5/20
master phases accepted**. Phase 10.03 **BLOCKED / NOT AUTHORIZED**; historical
**35 → 24 discrepancy UNVERIFIED**; production **NO_GO**. No live key, rights,
provider operation or capability is verified. STOP for ChatGPT review; no staging,
commit, push or Phase 13.02.
