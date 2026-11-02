# Phase 04 SEC-01: clock load and threshold assessment

**Status: TEST-ONLY / READY_FOR_INDEPENDENT_REVIEW (2026-11-01).** Numerical clock criteria remain **UNDECIDED**. Phase 04 remains **IN_PROGRESS / BLOCKED** at **5/20 master phases; 22/72 micro-phases accepted**. Production remains **NO_GO**. This assessment changes neither the [approved SEC-01 policy](PHASE_04_SEC01_CLOCK_B_MANUAL_RESOLUTION_DECISION.md) nor the [disconnected service](../../../src/storage/checkpoint-service.mjs).

## Method and exact environment

Run from `Sh_Project_Setup_extension`:

```text
node --test test/*.test.mjs
node --check test/sec01-clock-load-browser.mjs
node test/sec01-clock-load-browser.mjs
```

The [load harness](../../../test/sec01-clock-load-browser.mjs) used installed Playwright and Chromium **151.0.7922.34** at `/home/https_ali_muhammed/.cache/ms-playwright/chromium-1234/chrome-linux64/chrome`, Node **v24.19.0**, Linux **6.8.0-138-generic**, x64, with **4 available logical CPUs**. It created a test-only MV3 worker and an owned disposable browser profile. No normal profile, provider, customer data, credential, dependency download or OS-clock change was involved. External page requests: **0**. The browser closed and the owned profile was removed (`CLEANUP PASS`).

Each scenario took **10 batches of 2,000** synchronous worker brackets; the final harness was run twice, giving **120,000 samples**. Each bracket read `performance.now()` before `Date.now()` and again after it, with no await within the bracket. Batches had a 100 ms requested pause. Classification reused [`classifyBracket` and `classifyPair`](../../../test/sec01-clock-source-browser.mjs), which mirror the current **1 ms bracket cap** and **1.1 ms forward discrepancy allowance**. The script includes an assert-based check that a wide bracket excludes adjacent pairs. Distributions are empirical min, p50, p90, p99 and max, with percentile ranks selected from the sorted samples; they are not population bounds.

| Scenario | Workload during worker sampling |
|---|---|
| Normal idle/light | Only the extension control page and scheduled sample batches; normal browser and host background activity was uncontrolled. |
| Browser page activity | A second local extension page repeatedly occupied its renderer for about 4 ms per task and updated DOM text; **251 / 250 tasks** had run when sampling ended in runs 1 / 2, and the activity was still active. |
| Controlled CPU contention | Four Node worker threads ran tight compute loops for up to 3.5 seconds while the browser worker sampled. This competed on the host's four available logical CPUs; it did not pin threads or guarantee a specific scheduling delay in the browser process. |

## Observations

All times below are milliseconds. Each run/scenario had **20,000 total samples** and **0 invalid samples**. A valid bracket has finite ordered monotonic readings, a safe integer wall reading and width at most 1 ms. A wide bracket is structurally readable but **excluded** from pair comparison. A comparable pair has two valid brackets and no wall rollback or monotonic regression. Excluded pairs are **not threshold passes**. First-to-current pairs compare each later sample with the scenario's first bracket, mirroring the service's first-sample guard. Results after an observed wide bracket are diagnostic arithmetic only: a real service would already have latched a block and would not continue checkpoint decisions.

| Run / scenario | Valid / wide / invalid brackets | Width min / p50 / p90 / p99 / max | Comparable / excluded consecutive pairs | Comparable / excluded first pairs |
|---|---:|---:|---:|---:|
| 1 idle/light | 20,000 / 0 / 0 | 0 / 0 / 0 / 0 / 0.1 | 19,999 / 0 | 19,999 / 0 |
| 1 page activity | 20,000 / 0 / 0 | 0 / 0 / 0 / 0 / 0.9 | 19,999 / 0 | 19,999 / 0 |
| 1 CPU contention | 19,996 / **4** / 0 | 0 / 0 / 0 / 0 / **7.5** | 19,991 / **8** | 19,995 / **4** |
| 2 idle/light | 20,000 / 0 / 0 | 0 / 0 / 0 / 0 / 0.1 | 19,999 / 0 | 19,999 / 0 |
| 2 page activity | 20,000 / 0 / 0 | 0 / 0 / 0 / 0 / 0.6 | 19,999 / 0 | 19,999 / 0 |
| 2 CPU contention | 19,998 / **2** / 0 | 0 / 0 / 0 / 0 / **2.0** | 19,995 / **4** | 19,997 / **2** |

Thus **6 of 120,000** brackets exceeded 1 ms, all under CPU contention in these two final runs. The **12 excluded consecutive** and **6 excluded first-to-current** pairs are separate from the comparable counts, not evidence that either threshold passed.

| Run / scenario | Consecutive discrepancy min / p50 / p90 / p99 / max | First-to-current discrepancy min / p50 / p90 / p99 / max |
|---|---:|---:|
| 1 idle/light | −0.5 / 0 / 0 / 0 / 1.0 | −0.6 / −0.1 / 0.3 / 0.4 / 0.5 |
| 1 page activity | −0.9 / 0 / 0 / 0 / 1.0 | −0.2 / 0.3 / 0.7 / 0.8 / 0.9 |
| 1 CPU contention | −0.7 / 0 / 0 / 0 / 1.0 | −0.7 / −0.1 / 0.3 / 0.4 / 0.5 |
| 2 idle/light | −0.4 / 0 / 0 / 0 / 1.0 | −0.9 / −0.4 / 0 / 0.1 / 0.2 |
| 2 page activity | −0.6 / 0 / 0 / 0 / 1.0 | −0.6 / −0.1 / 0.3 / 0.4 / 0.5 |
| 2 CPU contention | −0.7 / 0 / 0 / 0 / 1.0 | −0.6 / 0.2 / 0.6 / 0.7 / 0.8 |

**0 comparable consecutive and 0 comparable first-to-current discrepancies exceeded 1.1 ms** in each of the six observations. **0 wall rollbacks and 0 monotonic regressions** were observed in each. The smallest positive consecutive `performance.now()` step and positive bracket width were about **0.1 ms** in every observation; the smallest positive `Date.now()` step was **1 ms**. Positive bracket-width p50 was about **0.1 ms** throughout; its p99 was about **0.1 ms** except run 2 page activity (**0.3 ms**) and CPU contention (**0.6 ms**). These are **observed timer granularities**, not guaranteed precision. Many brackets measured zero because successive readings can return the same quantized value. Batch gaps and scheduling are included in consecutive-pair comparisons; their maximum positive `before` steps across the six observations ranged from about **258 to 835 ms**. The script's raw `SCENARIO` output retains full precision and distributions.

## Threshold and security assessment

**A. Preserve the current strict cap and accept possible blocking.** This is the least risky *present behavior*: CPU contention produced brackets wider than 1 ms in both final runs, so the service would fail closed and retain any affected checkpoint for owner-controlled resolution. Six wide brackets in 120,000 test samples are a measured availability signal, **not** an estimated production operation rate. An earlier exploratory run, before a reporting-only metric was added, had one wide bracket in each of the three scenarios, showing that even idle/light and page activity can have violations on this host. A single wide bracket latches the service; the cost can include blocked checkpoint actions, manual review and an outstanding physical-retention obligation with no guaranteed maximum hold.

**B. Investigate a safer sampling design under separate authorization.** This could seek an approach with fewer scheduling-sensitive false blocks while preserving conservative expiry and the no-replay gate. This assessment neither designs nor implements one. A seemingly cheaper tactic of silently retrying a wide bracket, or discarding it from history, would erase the uncertainty at a checkpoint decision. The intervening wall or monotonic movement could include a clock jump, and later plausible samples cannot restore the missing evidence. A previous sample and first-sample comparison must not be reset to make an uncertain run appear continuous.

**C. Revise numerical thresholds only after explicit security acceptance.** A wider bracket cap might reduce blocking in these runs, but it admits a longer unobserved interval around the wall reading and can conceal a clock change or scheduling pause. A larger forward allowance can miss a small forward jump on each comparison; repeated advances matter even when individual steps fit. Either change needs measured platform coverage, a threat analysis and explicit owner/security acceptance. No threshold is changed here, and the 1.1 ms detection allowance is never credited toward seven-day expiry.

**Recommendation for owner/security review:** keep **A** as the current fail-closed rule and production **NO_GO**. The measured wide brackets justify a separately authorized **B** investigation before considering **C** or accepting the numeric criteria for production. There is insufficient evidence to recommend a larger cap or allowance. The absence of a 1.1 ms violation among comparable pairs does not validate that allowance against clock manipulation.

## Supported conclusions and remaining gates

This run supports only the observed distribution, exclusions and violations in one installed Chromium build on one Linux host during short active workloads. It does **not** establish platform-wide reliability, a secure OS clock, seven actual elapsed days, sleep/wake behavior, clock adjustment detection, or a production false-block rate. In particular, no sampling approach here establishes trusted elapsed time across an unobserved worker or browser restart. The worker's volatile creation bracket is lost; a new worker's readings cannot prove the interval. The [prior clock-source verification](PHASE_04_SEC01_CLOCK_SOURCE_VERIFICATION.md) observed that loss in an isolated lifecycle test; this load test did not rerun restart behavior.

Owner/security acceptance of the **1 ms cap**, **1.1 ms allowance**, **0.1 ms precision assumption**, conservative same-instance expiry criterion, supported browser/OS matrix and operational false-block burden remains **OPEN**. Actual project-owner identity and case-specific disposition checks, runtime worker and recovery wiring, device encryption/screen lock/profile controls, incident contacts and route, provider behavior and final security review remain **NOT VERIFIED** under the [security requirements](../../09_SECURITY_AND_SECRETS.md) and [uncertain-time retention amendment](PHASE_04_SEC01_UNCERTAIN_TIME_RETENTION_AMENDMENT.md). The [Phase 04 record](PHASE_04.md) remains blocked.

**Next safe Phase 04 task after independent ChatGPT review:** owner/security defines the supported platform and workload matrix and decides whether to authorize a focused safer-sampling investigation, with explicit acceptance criteria for false blocks and clock-detection risk. Keep production wiring, fresh-run admission, automatic replay and numerical changes out of scope until separately authorized. No commit or push was made.

## Verification

`node --test test/*.test.mjs` completed with **103 pass, 0 fail, 0 skipped**. `node --check test/sec01-clock-load-browser.mjs` passed. The browser command completed twice with **3 scenarios reported, 0 failures, 0 external requests and owned-profile cleanup PASS** each time. These are local Node and isolated-browser results, not production or security acceptance.
