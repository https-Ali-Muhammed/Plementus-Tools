# Support matrix — Phase 00

Date: **2026-10-20**. Extension **NOT IMPLEMENTED**. Zero real Odoo environments, editions or feature combinations tested. Every cell below means **UNKNOWN / NOT TESTED**; planning tier/priority does not imply available adapters or a working fallback.

## Feature-level Odoo 8–20 inventory

| Odoo | Planned tier | Consent/lifecycle | Action/navigation | Client errors | Network metadata | RPC envelope | Version/context | Local review/export | Two-case comparison |
|---|---|---|---|---|---|---|---|---|---|
| 8 | L | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |
| 9 | L | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |
| 10 | L | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |
| 11 | L | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |
| 12 | L | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |
| 13 | L | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |
| 14 | T | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |
| 15 | T | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |
| 16 | T | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |
| 17 | M | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |
| 18 | M | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |
| 19 | M | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |
| 20 | M | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED | UNKNOWN / NOT TESTED |

L = proposed legacy 8–13, T = transitional 14–16, M = modern 17–20. Generic browser baseline G is proposed across all tiers; it is also UNKNOWN / NOT TESTED. Prioritize 17–20, then 14–16, 11–13, 8–10 only when authorized instances exist. Comparison is Phase 17; legacy expansion is Phase 18. UI/storage/export functionality is untested independently of Odoo version too.

## Status and evidence rules

- **Verified:** named feature tested on exact real version/build + edition + hosting + browser; dated evidence and known limits.
- **Partial:** tested subset works, specific missing signals documented.
- **Fallback:** tested generic behavior only; no Odoo-specific enhancement promised.
- **Unknown:** trustworthy test evidence absent; current state of every feature.
- **Unsupported:** evidenced technical incompatibility or unsafe operation; not inferred from age or missing access.

Synthetic fixtures can prove parser/behavior assumptions only; label TESTED ON SYNTHETIC FIXTURE. Never promote a version on that basis. A version string or competitor support claim is not TraceBridge compatibility evidence. Customized/forked clients require capability checks.

## Evidenced, authorized environment inventory

| Environment class | Available evidence / authority | Available for compatibility testing? | Access performed |
|---|---|---|---|
| Local TraceBridge documentation checkout | Owner-supplied path; verified Git state at f3cdea5 | No application, browser fixture or Odoo instance | Files/Git only |
| Real Odoo test instances | No instance identity, version/build, edition, hosting or permission supplied in authorized inputs/repo docs | **NONE EVIDENCED / UNAVAILABLE** | None |
| Customer/production Odoo | No authorization; not in scope | **UNAVAILABLE / NOT AUTHORIZED** | None |
| Synthetic fixture environment | No extension harness or fixture created | **UNAVAILABLE / NOT TESTED** | None |

No search of sibling deployments, configs, databases or credentials was made. Past hosting work, public demos, trial signup pages and vendor release notes do not grant testing authority. No instances were provisioned, visited or enrolled.

## Browser targets and future evidence requirements

Chromium MV3 is the proposed initial family; Chrome Stable on Linux is a candidate first test target. Exact Chrome build/channel, OS build and minimum supported browser are **UNKNOWN / NOT TESTED**; no browser inventory or run was performed. Windows/macOS and other Chromium browsers are untested targets requiring explicit prioritization. Firefox packaging is deferred. Chrome API version annotations are not a product support promise.

For each future authorized row record: non-sensitive environment alias, authorization reference/owner/date and permitted actions; Odoo exact version/build and detection provenance; Community/Enterprise; Online/Odoo.sh/self-hosted; test/staging/production classification; app/workflow; language; single/multi-company; relevant custom modules; Chrome version/channel/OS; extension commit/build and capture mode/permissions; feature expected/actual, date, steps, result, gaps and sanitized evidence link. Unprovided dimensions stay UNKNOWN. Store no credentials/customer records. Owner must separately authorize any provisioning and business-action writes.

Reference basis: blueprint §4/§10, [official feasibility sources](FEASIBILITY.md), [scope](PRODUCT_SCOPE.md). Release existence, published API feasibility and planning priorities establish **no compatibility certification**.
