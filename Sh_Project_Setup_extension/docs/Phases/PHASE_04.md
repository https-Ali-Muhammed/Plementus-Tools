# Phase 04: Durable workflow state

**Status: IN_PROGRESS / BLOCKED.** 2026-10-29. Progress: **4/20 master phases; 18/72 micro-phases accepted.** SEC-01 CP1 is READY_FOR_REVIEW; pure v2 guards are implemented pending acceptance.

| Micro-phase | Status |
|---|---|
| 04.01 State types and transitions | ACCEPTED; [report](PHASE_04_01.md) |
| 04.02 Sanitized record foundation | ACCEPTED FOR SIMULATED FOUNDATION ONLY; [report](PHASE_04_02.md) |
| 04.03 Safe recovery | ACCEPTED FOR SYNTHETIC DECISIONS ONLY; [report](PHASE_04_03.md) |
| 04.04 Duplicate and invalid transitions | ACCEPTED FOR PURE VALIDATION AND SIMULATION ONLY; [report](PHASE_04_04.md) |

Synthetic decisions and fake-adapter conflict checks do not establish real durable state. [SEC-01](PHASE_04_SEC01_APPROVED_POLICY.md) now records the owner-approved checkpoint policy, and [CP1](PHASE_04_SEC01_CP1.md) adds disconnected pure guards; parent Phase 04 remains IN_PROGRESS / BLOCKED pending separately scoped implementation and observed worker restart and tab-close recovery tests. Historical master-plan D-07 concerns private Utilities SSH/submodules; [D-07 draft](PHASE_04_D07_DECISION_DRAFT.md) is preserved as policy preparation. Stop for ChatGPT review.
