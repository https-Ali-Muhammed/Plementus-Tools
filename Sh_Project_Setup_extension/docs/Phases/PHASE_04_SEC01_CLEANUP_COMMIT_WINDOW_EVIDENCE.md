# Phase 04 SEC-01: guarded cleanup commit-window regression

**Status: DIAGNOSTIC REPRODUCTION / SECURITY INVARIANT FAIL / OPEN.** Phase 04 remains **IN_PROGRESS / BLOCKED**; production remains **NO_GO**. This test-only investigation grants no implementation, clock-criterion, policy, browser, provider, or security acceptance.

## Scope and method

The new [diagnostic test](../../test/sec01-cleanup-commit-window.test.mjs) uses the existing [checkpoint service](../../src/storage/checkpoint-service.mjs), [policy constant](../../src/storage/checkpoint-policy.mjs), and [fake IndexedDB](../../test/fake-indexeddb.mjs) without modifying them. It creates a seven-field synthetic row at wall time `1000` and monotonic time `0`. Accepted expiry is injected as wall `1000 + RETENTION_MS` and monotonic `RETENTION_MS + 0.2`; this meets the current conservative lower-bound check in the same service instance. Authorization is a synthetic always-true callback. No real browser profile or actual checkpoint is used.

`pauseNextCommit()` holds the next fake transaction after its cursor and deletion requests have drained and before its staged map becomes committed data. The test waits for `startedTransactionCount()` to advance, then one `setImmediate` turn for the fake's pending-request loop to reach the hold. It verifies the cleanup promise is unsettled and the committed snapshot is unchanged, changes the injected clock, then releases the hold. The fake has no public staged-map inspector; staging order follows its scheduler, and commit/abort is inferred from its known completion path plus the committed snapshot. The observation is deterministic within this fake scheduler, not evidence of real IndexedDB or browser timing.

## Observations

All snapshots below are from the fake's committed store. `R` means the original seven-field row; `absent` means `snapshot(runId) === undefined`. A changed clock is reset after settlement only to test whether the service latch persists.

| Case | Clock when cleanup started | Transaction | Snapshot before / after | Cleanup result | Post-commit clock latch / later operations |
|---|---|---|---|---|---|
| Accepted control | Accepted expiry pair | Started, committed | R / absent | Fulfilled, `1` | No latch; later cleanup fulfills `0` |
| Invalid before cleanup | `NaN` wall | Never started | R / R | Rejected, generic error | Pre-transaction permanent latch; later cleanup/read reject with no transaction |
| Backward before cleanup | Wall `999`, monotonic `0` | Never started | R / R | Rejected, generic error | Pre-transaction permanent latch; later cleanup/read reject with no transaction |
| Explicit abort control | Accepted expiry pair | Started, aborted before commit | R / R | Rejected, generic error | No clock latch; later cleanup commits deletion |
| Backward during commit pause | Accepted expiry pair; then wall `expiry - 1`, monotonic unchanged | Started, committed | R / absent | Rejected, generic error **after commit** | Yes; later cleanup/read reject without another transaction |
| Excessive forward during commit pause | Accepted expiry pair; then wall `expiry + 1000`, monotonic unchanged | Started, committed | R / absent | Rejected, generic error **after commit** | Yes; later cleanup/read reject without another transaction |

The [service's `gate()`](../../src/storage/checkpoint-service.mjs) awaits a successful cleanup transaction, removes the deleted ID from its volatile `known` map, and then calls `time()` before returning the deleted count. The fake commits before firing transaction completion. If the clock becomes invalid during the hold, that final `time()` latches uncertainty and throws after the deletion has committed. The public `safe()` wrapper returns the same generic rejection as an aborted transaction. The test therefore explicitly establishes **rejected cleanup promise plus committed deletion** in two independent clock-change cases. The fake's explicit abort case establishes the different **rejection plus retained row** outcome. It cannot simulate or establish a genuinely unknown IndexedDB transaction outcome; that state must remain separate and require reconciliation rather than being classified from a generic rejection alone.

## Security and retention assessment

**Observed behavior:** The service retains its global clock block after the post-commit sample, but the row is already absent. The rejected API response does not truthfully distinguish a completed physical deletion from a failed or unknown cleanup. A caller seeing only the generic error cannot safely count deletion as complete or assume the row remains. Snapshot absence in this disconnected fake is evidence of its commit, not forensic erasure or an authenticated production absence check.

**Desired invariant:** A cleanup outcome must preserve the distinction among transaction aborted before commit, transaction committed deletion, and genuinely unknown outcome; a rejected operation must not be used as proof that deletion did not occur. Clock uncertainty should block further checkpoint use without retrospectively obscuring a known commit. The current implementation fails that outcome-reporting invariant. It also cannot establish that the deletion was safe under a clock that changed while the transaction was pending. The [approved SEC-01 policy](PHASE_04_SEC01_APPROVED_POLICY.md) and [uncertain-time retention amendment](PHASE_04_SEC01_UNCERTAIN_TIME_RETENTION_AMENDMENT.md) require fail-closed handling and confirmed completion before treating a deletion as discharged. This diagnostic is therefore **FAIL / OPEN** for security acceptance, even though all diagnostic assertions pass.

Under the current fake transaction completion signal, it is technically possible to identify a known commit separately from a known abort and keep subsequent operations blocked. A later, separately authorized remediation should be limited initially to the cleanup gate's transaction-outcome and response contract, its callers, and focused regressions, with an independent security review of how a committed-but-clock-uncertain deletion is recorded and reconciled. A further clock read before commit would still leave a later timing window; local injected clocks plus an asynchronous IndexedDB commit cannot prove clock trust at every instant of deletion. This report does not select or implement a fix.

The owner/security reviewer must decide the acceptable outcome contract for a known committed deletion with post-commit uncertainty, how to track its retention obligation without claiming success from a generic rejection, whether the current clock/transaction assumptions can authorize expiry deletion at all, and what additional supported-platform evidence is required. Actual owner identity, incident controls, worker integration, seven-real-day proof, device controls, and production activation remain open in the [clock security acceptance packet](PHASE_04_SEC01_CLOCK_SECURITY_ACCEPTANCE_PACKET.md) and [Phase 04 status](PHASE_04.md).

## Validation

Run from `Sh_Project_Setup_extension`:

| Command | Result on 2026-11-02 |
|---|---|
| `node --test test/sec01-cleanup-commit-window.test.mjs` | 6 passed, 0 failed |
| `node --test test/*.test.mjs` | 109 passed, 0 failed |
| `node --check test/sec01-cleanup-commit-window.test.mjs` | Exit 0 |

These results establish only synthetic, injected-clock behavior. They do not prove trusted clock readings, seven real elapsed days, real browser scheduling or storage behavior, actual owner authority, production impact, or security acceptance. No browser, provider, or production tests were run. Stop for independent ChatGPT review; Phase 04 remains **BLOCKED** and production **NO_GO**.
