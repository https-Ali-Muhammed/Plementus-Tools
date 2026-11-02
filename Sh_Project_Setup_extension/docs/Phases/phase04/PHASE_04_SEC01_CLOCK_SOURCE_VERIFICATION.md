# Phase 04 SEC-01: MV3 clock-source verification

**Status: TEST-ONLY / READY_FOR_INDEPENDENT_REVIEW (2026-11-01).** The numerical clock criteria remain **UNDECIDED**. Phase 04 remains **IN_PROGRESS / BLOCKED**; production remains **NO_GO**. This report neither changes the [approved policy](PHASE_04_SEC01_APPROVED_POLICY.md) nor accepts the [proposed runtime clock source](PHASE_04_SEC01_RUNTIME_CLOCK_SOURCE_DECISION.md).

## Method and environment

The [isolated browser harness](../../../test/sec01-clock-source-browser.mjs) created a test-only MV3 extension and an owned disposable Chromium profile. Its worker sampled `performance.now()` → `Date.now()` → `performance.now()` synchronously, 20,000 times per run, with no await inside a bracket. Node classified each bracket and consecutive pair using the current candidate limits from [`checkpoint-service.mjs`](../../../src/storage/checkpoint-service.mjs). The first run preceded addition of a first-to-current discrepancy metric; both runs used the same worker sampler and candidate limits. No clock was changed. These are two short worker lifetimes, not controlled anomalies. The harness also used a volatile original-worker anchor to observe lifecycle loss. [Deterministic Node tests](../../../test/sec01-clock-source.test.mjs) cover boundary arithmetic and malformed samples.

Tested: installed Playwright Chromium **151.0.7922.34**, Linux **6.8.0-138-generic**, Node **v24.19.0**. The Chromium executable was `/home/https_ali_muhammed/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`. The browser harness made **0 external page requests**, closed its owned browser process, and removed its disposable extension/profile directory. No normal profile, provider, credential, customer data, background schedule, dependency installation or OS clock adjustment was used.

## Clock observations and candidate thresholds

| Measure | Observation in this run | Assessment |
|---|---:|---|
| Synchronous brackets | 20,000 per run; 40,000 total | Two short bursts, each in one worker |
| Finite ordered bracket widths, minimum / maximum | 0 / 4.400000000372529 ms in run 1; 0 / 0.19999999925494194 ms in run 2 | **1 of 40,000 exceeded the proposed 1 ms cap** (run 1: 1/20,000; run 2: 0/20,000). A normal delayed sample can latch the service and retain a row for owner resolution. |
| Consecutive valid-pair wall minus bracketed monotonic advance, minimum / maximum | −0.30000000074505806 / 1 ms across both runs | **0 exceeded 1.1 ms** among valid comparable pairs. The two pairs adjacent to the wide bracket were excluded from discrepancy classification. |
| First-to-current valid-pair discrepancy, minimum / maximum | −0.7000000011175871 / 0.3999999985098839 ms in run 2 | **0 exceeded 1.1 ms** in run 2; not measured in run 1. This mirrors the separate first-sample guard. |
| Invalid samples / wall rollback / monotonic regression | 0 / 0 / 0 across both runs | No such event observed; absence in these bursts is no guarantee. |
| Fractional timer readings | 18,009 in run 1; 17,861 in run 2 | Fractional readings occurred; they do not establish a guaranteed precision. |
| Smallest positive step between consecutive `before` readings | 0.09999999962747097 ms in both runs | Consistent with approximately 0.1 ms granularity on these runs. This is **observed timer resolution**, not proof that the current 0.1 ms precision assumption holds across supported machines, worker lifetimes, browser versions, privacy settings or sleep. |

The proposed **1.1 ms forward detection allowance** was not violated by comparable consecutive pairs in either run or first-to-current pairs in run 2; its adequacy and security cost remain **INCONCLUSIVE**. The proposed **1 ms bracket cap** was violated once under ordinary sampling, so universal acceptance without false blocks is **UNSUPPORTED** on this machine. The **0.1 ms timer precision assumption** is consistent with the smallest observed step but is **UNSUPPORTED as a guarantee**. The [combined remediation](PHASE_04_SEC01_RUNTIME_CLOCK_COMBINED_REMEDIATION.md) subtracts 0.1 ms from the creation-after to current-before lower bound and never borrows the 1.1 ms detection allowance for expiry. Node boundary tests support that calculation as code arithmetic, but **seven real elapsed days and the sufficiency of the same-instance expiry criterion are INCONCLUSIVE**. The observed 4.4 ms bracket shows why a strict cap can create an exceptional blocked hold without a clock attack.

## Restart observations

The worker started with a volatile creation anchor. Closing and reopening the extension tab kept the **same** worker and anchor in this run; tab closure alone did not test restart. Chrome DevTools `ServiceWorker.stopWorker` then stopped it, and an extension message reactivated a **different** worker with no original anchor. Closing the browser process and reopening the **same owned profile** likewise produced a different worker with no original anchor. These observations **support** loss of volatile creation evidence across actual worker and browser restarts in this environment. A new worker can sample new clocks; it cannot inherit the original worker's in-memory anchor. The test did not fabricate a cross-restart elapsed interval or claim that `performance.timeOrigin` bridges the unobserved gap.

The test-only worker held no checkpoint and made no provider operation. The result does not independently reverify [service cleanup/restart behavior](PHASE_04_SEC01_STALLED_WALL_AND_RESTART_RESOLUTION.md), production wiring, replay prevention, or record retention across this particular run. The [strict recovery decision](PHASE_04_SEC01_STRICT_RECOVERY_DECISIONS.md) and owner direction continue to block fresh work beside an unresolved old checkpoint and preserve the global cleanup gate.

## Verification and limits

| Command | Result |
|---|---|
| `node --test test/*.test.mjs` | **103 PASS, 0 FAIL, 0 SKIP, 0 CANCELLED** |
| `node --check test/sec01-clock-source-browser.mjs` | PASS |
| `node --check test/sec01-clock-source.test.mjs` | PASS |
| `node test/sec01-clock-source-browser.mjs` | Two runs, each **6 PASS, 0 FAIL, 0 SKIP, 0 BLOCKED**; profile cleanup PASS each time |

The Node tests cover equality and slight excess for the 1 ms bracket cap, 1.1 ms discrepancy allowance and seven-day conservative lower bound, plus missing/invalid samples, rollback and monotonic regression. They are arithmetic checks, not platform guarantees. The browser run covers only this Linux/Chromium combination during active execution. Other Chrome versions, Windows/macOS, privacy timer coarsening, CPU contention, suspension, OS sleep/wake, manual/NTP wall adjustments, seven continuous real days, clock integrity and device/security controls remain **NOT TESTED**. A forward jump smaller than a detection allowance may evade a detector; a delayed bracket or paused monotonic clock may block legitimate work or delay cleanup. These are security and availability tradeoffs for owner/security review, not acceptance findings.

The owner/security reviewer still must decide whether to accept or revise the 1.1 ms allowance, 1 ms cap, 0.1 ms precision assumption and conservative same-instance expiry criterion, including false-block burden and supported-platform coverage. Real owner authentication, case-specific destructive disposition, device encryption/screen lock/profile checks, incident contacts and route, runtime access restrictions, provider behavior and final security review remain open under the [SEC-01 policy](PHASE_04_SEC01_APPROVED_POLICY.md), [manual-resolution decision](PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md), [uncertain-time retention amendment](PHASE_04_SEC01_UNCERTAIN_TIME_RETENTION_AMENDMENT.md) and [security requirements](../../09_SECURITY_AND_SECRETS.md).

**Next safe Phase 04 task after independent review:** decide the supported browser/OS matrix and numerical acceptance criteria, then run bounded worker measurements under those conditions, including contention and sleep/wake where feasible. Keep production implementation, fresh-run admission and activation blocked until separately authorized and reviewed. No commit or push was made for this test-only report.
