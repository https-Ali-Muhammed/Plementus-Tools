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
