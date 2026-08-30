# Broken Links & Resources Checker Implementation

Date: 2026-08-29  
Repository baseline: `2403c79a580d3d3b95746e7d8083e0eebac1e6d0`  
Toolkit version: `1.7.1`

## 1. Baseline

The repository itself began clean; an unrelated untracked `web-engineering-toolkit.zip` remained one directory above it and was not modified. `git diff --check` was clean. The live baseline used Toolkit `1.7.1`, Compliance report schema `2.6.0`, workflow schema `3.0.0`, lifecycle persistence `5`, and mapping catalog `2026.08.26.3`.

The 142-test starting suite reproduced the two documented stylesheet-source assumptions: compact versus spaced `minmax()` and `rgba()` spellings. The production CSS already expressed the approved layout and exact approved color values. Tests were corrected to normalize insignificant CSS whitespace/leading-zero syntax; no production palette or layout was changed to satisfy source formatting. The corrected baseline was green before feature work.

Brave `151.1.93.134` at `/usr/bin/brave-browser` provided launch, navigation, PDF-source navigation, and PDF rendering capability.

## 2. Audit result

The pre-implementation audit is `docs/BROKEN_LINKS_RESOURCES_CHECKER_AUDIT.md`. It selected an independent fourth-tool architecture modelled on the Asset tool's separation, not on Compliance Mapping. Safe reuse is limited to browser detection, Playwright conventions, generic utilities, Shared Projects, Report History, shared interactive primitives, ExcelJS, deterministic packaging, and all-tools smoke.

The audit rejected Compliance findings/mappings/review/evidence coupling, aggressive query normalization, unrestricted crawling, binary working/broken classification, and arbitrary server-side fetching.

## 3. Architecture

The production path is:

```text
#linksSection interactive UI
  -> POST /api/broken-links/check
  -> lib/broken-links-checker.js
  -> lib/broken-links-report-manager.js
  -> existing reports/ + generic Report History
```

`broken-links-resources` is the canonical report type. The checker and report contract begin at schema `1.0.0`. No existing Compliance, Lighthouse, Asset, evidence, mapping, workflow, or lifecycle schema changed.

## 4. Inputs

Required inputs are project name, HTTP(S) Base URL, and starting pages. An empty starting-page list becomes the explicit safe `/` default. Scan scope is either selected pages only or selected pages plus bounded same-origin crawl. Browser selection follows the existing auto-detect/explicit executable model.

Enabled-by-default options are external status checks, in-scope fragment checks, and page-resource checks. Advanced defaults and hard bounds are:

- pages: default 25, range 1–100;
- unique targets: default 2,000, range 1–5,000;
- request timeout: default 10,000 ms, range 100–30,000 ms;
- global concurrency: default 6, range 1–12;
- per-host concurrency: 2 or lower when global concurrency is lower;
- redirects: default 8, range 0–12;
- ignore patterns: at most 20 entries and 200 characters each;
- runtime: fixed 120-second upper bound.

Both frontend and server validate project, URL, page, credential, scheme, numeric, and pattern constraints. Invalid API configuration returns HTTP 400 rather than exposing an arbitrary fetch primitive.

## 5. Discovery behavior

Pages are rendered with Playwright after DOM content load and a short bounded settling period. Discovery includes rendered anchors; image `src`/`srcset`; scripts; stylesheet, icon, preload, modulepreload, and manifest links; iframes; source `src`/`srcset`; video/audio sources; and video posters. Dynamically inserted references are included.

Browser responses and failed requests contribute status/failure evidence without bodies, headers, cookies, storage, or session data. Selected mode renders only explicit pages. Crawl mode queues only same-origin HTTP(S) page links and strips only the fragment from the document queue identity. External targets are never recursively rendered.

## 6. HTTP-check strategy

Trustworthy browser-observed resource responses are reused. Remaining HTTP(S) identities use HEAD with manual redirects. Controlled 405/501 responses trigger GET fallback. GET bodies are cancelled and are never persisted. Every redirect hop is revalidated and the public chain retains redacted original/intermediate/final URLs and statuses. Only HEAD and GET are sent.

Transport timeouts, DNS failures, connection refusal, TLS failures, and browser runtime failures remain transport outcomes. They are never converted to synthetic 404 results.

## 7. Reference types

Occurrences carry explicit `link`, `image`, `script`, `stylesheet`, `font`, `media`, `iframe`, `manifest`, `preload`, or `other_resource` types. A unique target used by several types exposes the complete `referenceTypes` set rather than guessing one purpose.

## 8. URL normalization and deduplication

Network identity removes only the fragment. Meaningful query strings and their order/value semantics remain intact. Fragment-bearing targets retain separate target identities while sharing the underlying network check. Relative references resolve against their rendered source page.

Unique targets are checked once where technically appropriate. Every bounded occurrence retains redacted source page, target, type, attribute, bounded link text, and fragment. Controlled tests prove duplicate checks are avoided, two source pages remain recoverable, fragments remain distinct, and `?id=1`/`?id=2` are not merged.

## 9. Outcome classification

- `healthy`: direct 2xx;
- `redirected`: bounded redirect chain ending in healthy 2xx;
- `broken`: 404 or 410;
- `client_error`: other actionable 4xx;
- `restricted`: 401 or 403;
- `rate_limited`: 429;
- `server_error`: 5xx;
- `unreachable`: timeout/DNS/connection/TLS transport failure;
- `fragment_missing`: rendered in-scope document exists but lacks the requested anchor;
- `failed_to_check`: no factual result could be established;
- `skipped`: unsupported, ignored, credential-bearing, safety-sensitive, SSRF-restricted, or scope-excluded target.

No health, quality, readiness, SEO, or compliance score was added.

## 10. Fragment validation

Rendered documents retain bounded `id` and legacy `name` anchor sets. Same-page and cross-page internal fragments are checked when the document was rendered within scope. Missing anchors become `fragment_missing`, not HTTP 404. External or out-of-render-scope fragments remain `failed_to_check` rather than triggering unbounded rendering.

## 11. Resource checking

DOM resources and browser runtime failures join the same target/occurrence model as hyperlinks. Browser HTTP responses take precedence over a later browser `ERR_ABORTED` event so a factual 404 is not degraded to a generic transport result. Video posters are classified as images. No request or response content is archived.

## 12. Crawl bounds

The crawler is same-origin, HTTP(S)-only, queue-deduplicated, and constrained by page, target, runtime, request, redirect, global-concurrency, and per-host-concurrency limits. External targets may be status-checked when enabled but are not enqueued. Limit-reached facts are explicit in the result.

## 13. Safety and SSRF controls

Credential-bearing URLs and non-HTTP schemes are never requested. Known state-changing route families (logout/signout, delete/remove, unsubscribe, confirm, checkout/payment) are skipped when automatically discovered. Forms, buttons, uploads, and non-GET/HEAD methods are never activated.

Server checks resolve every destination and redirect hop. Browser routing applies the same check before rendered subresources leave the browser. Loopback, private, link-local, unspecified, multicast, and metadata-style destinations are rejected when reached through a different hostname. Intentional local fixtures remain supported only when the selected Base URL itself uses that same local hostname.

## 14. Sensitive-data handling

Known token/authentication/session/key/code/signature/JWT query parameter values are replaced with `[REDACTED]` in public results and every report format. URL username/password credentials are removed from projection and rejected from checking. Browser/storage/session values, headers, Authorization, cookies, request bodies, response bodies, and general HTML bodies are absent from persisted output.

HTML output escapes untrusted text. CSV and XLSX neutralize values beginning with `=`, `+`, `-`, or `@`. JSON retains escaped machine-readable public data only.

## 15. Shared Project integration

The active Shared Project now populates checker project name, active-environment Base URL, and shared target pages. The visible `/` default yields to shared pages during initial synchronization. Navigation synchronization arrays now include `links` while preserving the existing three tools.

## 16. UI implementation

The sidebar adds Broken Links & Resources Checker with an inline chain icon. `#linksSection` uses numbered target/configuration/run/result cards, existing fields, segmented scope controls, enabled check options, collapsed advanced bounds, the shared run state, factual summary cards, remediation-first results, and expandable occurrence provenance.

Filters cover search, outcome, reference type, internal/external, HTTP status, and source page. Filtering is client-side over public result metadata only. Long targets and source URLs wrap inside a bounded horizontally scrollable result table.

## 17. CSS integration

`public/styles/broken-links.css` owns the fourth tool and its report badge/icon modifiers. Workspace component selectors are scoped through `#linksSection`. `public/styles.css` remains import-only and now loads five ownership files. No new color or font was introduced; the file reuses existing variables and exact approved palette values.

Generated Compliance HTML/PDF files and styles were not modified.

## 18. Report outputs

`BrokenLinksReportManager` writes:

- `summary.html`: standalone scan identity, bounds, factual counts, broken/unavailable targets first, redirects, all checks, source pages, and limitations;
- `summary.json`: canonical public result and history overview;
- `summary.csv`: one remediation row per unique target;
- `summary.xlsx`: Summary, Broken & Unavailable, Redirects, All Checks, and Occurrences sheets;
- `metadata.json`: report identity, schema, scan identity, and overview.

PDF was deliberately not added.

## 19. Report History

Generic history discovery reads `broken-links-resources` from `summary.json`/`metadata.json`. The UI shows the explicit Broken Links & Resources label, existing-palette badge, pages, targets, broken, and redirected facts, plus View report, JSON, CSV, Excel, and unchanged delete behavior. No second history system was created.

## 20. Tests

New deterministic/browser coverage is in:

- `test/broken-links-checker.test.js`;
- `test/broken-links-reporting.test.js`;
- `test/broken-links-ui.test.js`;
- `test/fixtures/broken-links-lab-server.js`.

The controlled fixture uses two local origins and covers rendered/dynamic links, duplicate sources, redirects, 404/410/500/401/403/429, timeout, HEAD fallback, valid/missing same-page and target-page fragments, image/script/stylesheet/iframe failures, non-HTTP schemes, meaningful queries, sensitive queries, unsafe actions, metadata-address rejection, crawl bounds, formula text, and source occurrence recovery.

## 21. Browser and mobile validation

The controlled interactive regression uses the real application rendering code at 1440, 1024, 768, and 390 pixels. Shared Project values populate, the explicit check action completes, filters apply, result rows render, the table remains component-bounded, page width does not overflow, and no console/page errors occur.

A separate end-to-end run drove the real `server.js` API and workspace at 1440 × 1000 and 390 × 844. Both runs produced 2 rendered pages and 30 unique targets (9 broken including missing fragments, 1 redirected, 7 unavailable, 12 healthy, and 3 external), exposed every required report download, and were deleted through the existing Report History API afterward. The desktop action took 4,204 ms and the mobile action 2,410 ms; scanner/report result durations were 2,539 ms and 1,894 ms respectively. Both page widths exactly matched their viewports, the wide result table remained component-scrolled, and console/page error collections were empty.

## 22. Four-tool smoke

`npm run smoke:all` retains its command and now runs Compliance Mapping, Lighthouse Reporter, Asset & Page-Weight Analyzer, and the new checker independently. The checker smoke performs a real rendered scan, requires broken and redirected outcomes, and verifies all five report files.

## 23. Performance

The final completed four-tool smoke measured: Compliance assessment 2,132 ms and report generation 2,002 ms (HTML 35 ms, PDF 1,482 ms, 682,801-byte PDF); Lighthouse 12,055 ms; Asset Analyzer 2,298 ms; Broken Links & Resources 1,780 ms for 2 rendered pages and 30 unique targets. The smoke command completed in approximately 24.1 seconds.

The final `npm test` run completed 151 tests in 81.532 seconds with no failures or skips. Phase 1 validated 80 tests in approximately 98 seconds, Phase 3 validated 27 tests in approximately 30 seconds, and Phase 4 validated 25 tests in approximately 28.5 seconds. The real workspace timings are recorded in section 21. These are observed values from this checkout and environment, not performance guarantees.

## 24. Packaging

The source-package regression now requires the checker, report manager, stylesheet, audit, implementation record, fixture, and three new test files. The existing deterministic staging process continues to include source roots generically and exclude reports, data, profiles, credentials, browser state, and other runtime output.

The final archive contains 90 source entries. `npm run test:package` passed its deterministic completeness/exclusion regression, and two consecutive builds produced the same SHA-256. The final byte size and checksum are recorded in the handoff so the archive does not attempt to contain its own digest.

## 25. Deferred capabilities

Authenticated scanning, credentials, login flows, form submission, button clicking, repairs, scheduling, email/Slack, unlimited crawling, active security scanning, SEO scoring, Compliance mapping, AI classification, PDF, sitemap recursion, multi-user workflow, and continuous monitoring remain deferred.

## 26. Remaining limitations

The checker records one bounded observation, not permanent availability. Some servers treat HEAD differently from GET; fallback is intentionally limited to demonstrated unsupported-method cases. External fragments are not rendered. JavaScript references created after the bounded settling window may be missed. Browser execution of the selected page can cause normal page-side requests, though private-target routing is blocked and no controls are activated. Operator-selected public pages may still contain sensitive paths; only known sensitive query parameter families are redacted.

## 27. Ready-to-commit assessment

The post-implementation gates are green: 151/151 full-suite tests, Phase 1 at 80/80, Phase 3 at 27/27, Phase 4 at 25/25, a real four-tool smoke, real desktop/mobile workspace runs, deterministic package validation, package-content inspection, and final whitespace validation. Implementation remains intentionally uncommitted and is ready for review and commit.
