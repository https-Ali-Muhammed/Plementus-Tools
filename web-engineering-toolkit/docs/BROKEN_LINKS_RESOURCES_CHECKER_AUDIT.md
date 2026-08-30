# Broken Links & Resources Checker Audit

Date: 2026-08-29  
Repository baseline: `2403c79a580d3d3b95746e7d8083e0eebac1e6d0`  
Toolkit version: `1.7.1`

## Current architecture

The live toolkit has three independent production paths. Lighthouse uses `RunManager` and `ReportManager`; Compliance Mapping uses its scanner, lifecycle, evidence, and security report managers; Asset & Page-Weight Analyzer uses a synchronous `/api/assets/analyze` route, a Playwright-backed analyzer, and `AssetReportManager`. Shared Projects provide a project name, active-environment base URL, languages, and target paths. Generic Report History discovers report identity from `summary.json` or `metadata.json`, then exposes the artifacts that exist in each report directory.

The interactive shell is one framework-free HTML document with stable tool sections and one JavaScript controller. `public/styles.css` is an import-only compatibility entry point for shared primitives and one root-scoped stylesheet per existing tool. Browser selection is already supplied by `detectBrowsers()`, and controlled browser capability checks distinguish environment restrictions from application failures.

The new checker is best implemented as an independent sibling of Asset Analyzer: a dedicated checker, API route, report manager, tool section, root-scoped stylesheet, and report identity. It must not use Compliance findings, mappings, applicability, review workflows, or evidence-vault contracts.

## Baseline finding

The first full-suite run reproduced two known source-formatting assumptions from the packaged checkout. The live CSS used semantically equivalent spaced `minmax(0, 1fr)` and `rgba(255, 255, 255, 0.035)` forms while assertions expected compact spellings. The rendered intent and approved values were unchanged. The selected baseline correction makes those tests compare CSS semantics while retaining the exact live CSS and palette. No production style was changed to satisfy formatting-only assertions.

## Reuse opportunities and coupling risks

Safe reuse is deliberately narrow:

- `detectBrowsers()` and Playwright launch conventions for rendered discovery.
- `ensureDir`, `slugify`, `timestamp`, and CSV serialization utilities.
- `ReportManager.listReports()` for unified history discovery.
- Shared Projects' active environment and target-page propagation.
- Existing shared controls, cards, run states, history actions, and responsive primitives.
- ExcelJS for bounded workbook generation.

The Asset analyzer's network capture is useful precedent but its byte/accounting model is not a link-status model and will not be extended. Compliance URL canonicalization intentionally removes known tracking parameters, which is inappropriate here because query strings may change target behavior. Compliance evidence and review structures remain isolated.

## Input design

The primary inputs are project name, HTTP(S) base URL, explicit starting pages, scan scope, and browser. Shared Projects populate project name, active-environment URL, and shared target pages. When an ad-hoc run has no pages, the UI and server use `/` as a visible, safe default rather than initiating an implicit site-wide crawl.

Default check options are external links enabled, fragments enabled, and page resources enabled. Advanced options contain bounded page, unique-target, timeout, concurrency, redirect, and ignore-pattern controls. Planned defaults are 25 pages, 2,000 unique targets, 10 seconds, global concurrency 6, per-host concurrency 2, and 8 redirects. Server-side hard maxima remain authoritative.

## Scan and discovery model

Each selected page is rendered in an isolated browser context without submitting forms or clicking controls. After bounded settling, the checker extracts anchors and relevant rendered resources: links, images and `srcset`, scripts, stylesheet/icon/preload/modulepreload/manifest links, iframes, sources, video/audio sources, and video posters. Browser response and failed-request events retain only safe status/failure metadata.

Selected-pages mode renders only explicit starting pages. Bounded-crawl mode queues same-origin HTTP(S) page links up to page, target, queue, and runtime limits. External targets may be checked but are never recursively rendered. URLs that resemble logout, deletion, unsubscribe, confirmation, checkout, or payment actions are skipped conservatively instead of navigated.

## URL identity and occurrence model

Network identity removes fragments only. It preserves scheme, host, port, path, and the exact meaningful query string; it does not strip tracking parameters. Fragments are separate validation identities because two anchors on one document can have different outcomes. Relative references resolve against the rendered source page.

One unique target record owns the network check, while every bounded occurrence preserves source page, reference type, source attribute, bounded anchor text, and fragment. Duplicate occurrences therefore do not create duplicate requests, but their source provenance remains recoverable.

Non-HTTP schemes are never requested and are retained only as bounded `skipped` observations. Malformed URLs and credential-bearing URLs are also skipped. Credentials are never retained in public output.

## HTTP strategy and classifications

Trustworthy browser-observed GET responses may satisfy checks for resources loaded during rendering. Other HTTP(S) targets use HEAD first, with bounded GET fallback when HEAD is unsupported or inconclusive (including controlled 405/501 behavior). Only GET and HEAD are permitted. Response bodies are never archived; fallback bodies are cancelled. Redirects are followed manually so the bounded chain retains original, intermediate, final, and status identity.

The factual initial outcome vocabulary is:

- `healthy`: a direct 2xx result.
- `redirected`: one or more redirects ending in a healthy 2xx result.
- `broken`: HTTP 404 or 410.
- `client_error`: an actionable 4xx other than the separately classified cases.
- `restricted`: HTTP 401 or 403.
- `rate_limited`: HTTP 429.
- `server_error`: HTTP 5xx.
- `unreachable`: DNS, connection, TLS, or timeout failure attributable to transport.
- `fragment_missing`: the checked rendered HTML document exists but lacks the requested `id` or legacy `name` anchor.
- `failed_to_check`: checker/browser execution could not establish a factual target result.
- `skipped`: non-HTTP, ignored, safety-sensitive, credential-bearing, SSRF-restricted, or out-of-bound target.

No health score or website-quality percentage is warranted. A 401, 403, 429, redirect, timeout, or checker failure is never collapsed into `broken`.

## Fragment validation

Fragments are checked only for rendered HTML pages within bounded page scope. Both `id` and legacy anchor `name` values are collected after rendering. Same-page fragments and fragments targeting another rendered internal page are supported. External fragments and targets outside rendered scope remain a factual `failed_to_check`/skipped fragment limitation rather than causing unbounded external rendering.

## Security boundaries

Only HTTP and HTTPS are eligible for network checks. Base and starting URLs reject credentials. Every redirect hop is revalidated. A private, loopback, link-local, multicast, unspecified, or cloud-metadata destination is rejected when it is reached from a different public hostname. Intentional local fixtures remain possible only when the explicitly selected base hostname is itself local and the discovered target uses that same hostname; a public page cannot pivot the checker into a private address.

Known sensitive query parameter values (token, authentication, session, key, code, signature, and JWT families) are replaced in public results and report artifacts. Exact internal URLs may be used transiently to perform the requested check but are not persisted. Request/response bodies, headers, Authorization, cookies, browser storage, and session state are not archived.

Ignore patterns are bounded literal/glob-like patterns rather than arbitrary regular expressions. Concurrency is bounded globally and per host. No POST, PUT, PATCH, DELETE, form submission, button click, upload, checkout, payment, authenticated session, or active security action is introduced.

## Reports and history

The dedicated report type is `broken-links-resources`, with an independent check/report schema beginning at `1.0.0`. The report manager will generate `summary.html`, `summary.json`, `summary.csv`, `summary.xlsx`, and `metadata.json`. CSV remains one row per unique target. XLSX uses Summary, Broken & Unavailable, Redirects, All Checks, and Occurrences sheets. Mutable/untrusted spreadsheet text is formula-neutralized.

Generic history discovery already recognizes report type from summary/metadata. Only presentation needs a fourth label, badge, factual pages/targets/broken/redirected facts, and existing artifact actions. Existing delete behavior remains shared.

## Test plan

Deterministic tests will use two controlled local origins and cover rendered/dynamic discovery, supported resource elements, runtime failures, redirects, 404/410/500/401/403/429, timeout, HEAD-to-GET fallback, same/other-page fragments, duplicates and occurrences, meaningful queries, non-HTTP schemes, unsafe actions, SSRF restrictions, secret redaction, bounds, report formats, history identity, Projects propagation, UI rendering, responsive overflow, smoke integration, and package contents.

## Deliberately deferred

This implementation will not add authentication, credentials, login workflows, form submission, arbitrary clicking, repairs, schedules, notifications, unlimited crawling, active security scanning, SEO scoring, Compliance mappings, AI decisions, PDF output, sitemap recursion, multi-user workflow, or monitoring. External fragments are not recursively rendered. The checker diagnoses bounded observed references; it does not prove that a resource is permanently available or that every restricted/network-limited response is defective.

## Selected implementation

Proceed with the dedicated checker/report/API/UI architecture, strict source-occurrence traceability, bounded browser rendering and HTTP checks, precise non-binary outcomes, fragment validation only for rendered in-scope documents, conservative navigation/SSRF handling, sensitive URL redaction, unified Projects/History integration, and four-tool smoke coverage. No existing tool schema or Compliance report code requires modification.
