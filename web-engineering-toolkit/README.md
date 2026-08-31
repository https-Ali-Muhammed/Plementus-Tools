# Web Engineering Toolkit v1.7.1

A framework-free website engineering and QA workspace built with vanilla HTML, CSS, JavaScript, and Node.js.

## Tools included

- **Lighthouse Reporter** — repeatable Performance, Accessibility, Best Practices and SEO audits with public/session modes, language-aware routing, mobile/desktop runs, grouped Lighthouse findings and HTML/PDF/CSV reports.
- **Compliance Mapping** — collects defensible HTTP, browser, TLS, crawl, and optional passive OWASP ZAP evidence; maps that evidence to framework controls and reviewer decisions without claiming certification.
- **Asset & Page-Weight Analyzer** — measures transferred page weight and network requests across selected pages, including JavaScript, CSS, images, fonts, media, XHR/fetch, third-party resources and the largest assets.
- **Broken Links & Resources Checker** — renders selected pages, discovers links and page resources, checks bounded unique HTTP(S) targets, validates in-scope fragments, and preserves every source occurrence without treating restricted or timed-out targets as definitive broken links.

## Shared Projects

v1.2 adds a **Projects** category to the sidebar.

A project profile can store:

- project name
- Testing URL
- Production URL
- active/default environment
- default language
- available EN / AR languages
- shared target pages

Selecting **Use project** applies that configuration across Lighthouse Reporter, Compliance Mapping, Asset & Page-Weight Analyzer, and Broken Links & Resources Checker so the same website information does not need to be entered repeatedly.

Project profiles are stored in:

```text
data/projects.json
```

The generated file is ignored by Git so local project data is not committed accidentally.

## Lighthouse Reporter output

Each completed Lighthouse run retains its standalone HTML summary and internal JSON/metadata, plus the user-facing report pair:

```text
summary.pdf
summary.csv
```

The PDF presents selected category scores, grouped important findings, bounded page results, and methodology. CSV remains the structured page-result export; raw Lighthouse detail stays in the existing run artifacts rather than being dumped into the PDF.

## Asset & Page-Weight Analyzer

The analyzer launches a detected Chrome/Chromium/Brave executable in **headless mode**. You do not need to manually launch the Lighthouse browser first.

For every selected page it uses a fresh browser context with cache disabled and records network transfer information using the Chrome DevTools Protocol.

It reports:

- total transferred page weight
- request count
- JavaScript transfer size
- CSS transfer size
- image transfer size
- font transfer size
- media transfer size
- XHR/fetch resources
- third-party transfer size and request share
- DOM element count
- failed HTTP/network resources
- largest individual resources
- cache-control information
- content encoding / compression information
- below-the-fold images without `loading="lazy"`

The analyzer also creates practical optimization findings for heavy pages, large JavaScript/image/font payloads, very large individual assets, high request counts, missing compression, weak static-asset caching and high third-party transfer share.

### Asset report output

Each run creates a complete folder inside `reports/` and appears in global Report History with an **Asset Page Weight** report badge.

Generated files include:

```text
summary.html
summary.json
summary.csv
summary.pdf
assets.csv
metadata.json
```


## Broken Links & Resources Checker

The checker uses a detected Chrome/Chromium/Brave browser to discover references after each selected page renders. It can inspect explicit pages only or follow same-origin page links within strict page, target, timeout, concurrency, and redirect limits. External targets can be status-checked but are never recursively crawled.

Primary inputs are project name, Base URL, starting pages, scan scope, and browser. Check options cover external links, rendered-page fragments, and page resources. Advanced options expose bounded limits and simple ignore patterns. If starting pages are empty, `/` is used as the visible safe default.

Outcomes remain factual and distinct: `healthy`, `redirected`, `broken` (404/410), `client_error`, `restricted` (401/403), `rate_limited` (429), `server_error`, `unreachable`, `fragment_missing`, `failed_to_check`, and `skipped`. Redirects, authorization responses, rate limits, timeouts, and checker failures are not labelled broken.

Each run writes:

```text
summary.html
summary.json
summary.csv
summary.pdf
metadata.json
```

The PDF is remediation-first and summarizes healthy inventory without printing hundreds of normal rows. The CSV retains one row per unique target. Reports do not archive response bodies, request bodies, credentials, cookies, or browser storage.

## Unified report history

Report History supports the current report types:

- Lighthouse
- Compliance Mapping
- Asset Page Weight
- Broken Links & Resources

Existing single-report deletion and multi-select report-folder deletion remain available.

Every tool exposes **View report**, **PDF**, and **CSV** actions. Downloaded PDF and CSV files use the report identity, report-time project name, and original generation timestamp; internal JSON and metadata remain available to the application for history and reconstruction.

## Requirements

- Node.js 20+
- npm
- Chrome, Chromium or Brave

Project dependencies:

- Lighthouse 12.8.2
- Playwright Core 1.54.2

## Install and run

```bash
npm install
npm start
```

Open:

```text
http://127.0.0.1:4177
```

If port 4177 is already in use:

```bash
APP_PORT=4180 npm start
```

## Basic workflow

1. Open **Project workspace** and create the website project once.
2. Set the Testing/Production URL, default language and shared pages.
3. Click **Use project** if it is not already active.
4. Open any tool from the sidebar; the active project is reused automatically.
5. Run the selected analysis.
6. Open **Report history** to view or export generated reports.

## Compliance Mapping scope

The Compliance Mapping subsystem produces a technical compliance pre-assessment. A public-URL scan evaluates technical website evidence and scope signals only; an authenticated scan adds bounded application evidence. Neither level can verify internal policies, contracts, staff procedures, certifications, risk assessments, full control satisfaction, or legal compliance.

It separates:

- technical checks completed, observed/partial evidence, not-assessed, and failed-to-test collection states
- open security findings from successful test coverage
- automated evidence from manual evidence and reviewer decisions
- partial technical evidence from control satisfaction and framework-level compliance conclusions

Framework selection and framework applicability are separate. GDPR, HIPAA, PCI DSS, and local-law scope can be marked applicable, not applicable, or unknown. An applicable/not-applicable selection is recorded as an unverified operator assertion. Unknown scope never becomes a not-applicable conclusion. Generic healthcare/payment marketing is contextual only; HIPAA and PCI scope require strong PHI/cardholder-data signals or operator evidence.

Local Regulations requires a jurisdiction. Built-in mapping identifiers currently cover the UAE PDPL, Saudi PDPL, and Egypt PDPL plus its 2025 Executive Regulations. Other entered jurisdictions remain explicit manual legal-mapping work rather than receiving invented generic control citations.

### Compliance mapping capabilities

- browser retries with exponential backoff, timeout recovery, and partial evidence preservation
- raw response headers, Set-Cookie values, browser cookies, network requests, console events, screenshots, TLS data, and crawl errors
- SHA-256 evidence manifests and read-only report snapshots
- atomic findings with severity, confidence, evidence, impact, recommendation, references, controls, first/last seen, test method, scanner version, and limitations
- CSP, HSTS, cookie, consent-order, CORS, mixed-content, certificate, protocol, OCSP, DNS CAA, and forward-secrecy observations
- fresh-browser detection of tracking both before a visible consent choice and where no consent interface exists
- privacy-notice/runtime comparison for explicit no-advertising or no-tracking claims
- opt-in bounded consent scenarios for accept, reject, preferences, withdrawal, reload persistence, and returning-user observations
- public-policy template/draft quality detection with bounded excerpts, plus Arabic/English locale coverage
- structured GDPR public-notice evidence coverage without legal sufficiency conclusions
- bounded payment-flow architecture and provider observations without PCI applicability or SAQ conclusions
- framework-specific evidence filtering so unrelated healthcare, payment, or privacy signals do not leak across frameworks
- a versioned mapping registry with direct/supporting/contextual relationships, prerequisite states, and mapping limitations
- evidence-strength-aware control evaluations that keep control satisfaction `not_determined` and coverage `partial`
- deduplicated cookie findings that combine HTTP-header and browser-runtime evidence
- structured login flows, role-scoped encrypted Playwright session reuse, and bounded authenticated crawling
- OWASP ZAP passive and authenticated-passive evidence modes
- immutable automated evidence provenance, reviewer decisions, and append-only audit events
- finding comparison with separate finding status, review, scope, and mapping decisions
- canonical HTML, JSON, native searchable PDF and findings CSV reports with metadata, workflow, evidence, and signed/hash manifests

### Compliance report output

Each new Compliance Mapping assessment writes:

```text
summary.html       interactive assessment report
summary.json       canonical machine-readable assessment
summary.pdf        native A4 text/vector PDF printed from summary.html
findings.csv       normalized findings export
summary.csv        backward-compatible alias of findings.csv
metadata.json
workflow.json
report-manifest.json
evidence/manifest.json
```

The CSV files contain normalized findings only; they are not complete assessment exports. PDF generation uses the existing Playwright Core browser infrastructure and dedicated print styles. If Chromium PDF generation fails, the assessment and its other formats remain available, `pdfGeneration.status` is recorded as `failed`, and no PDF download is advertised.

Raw evidence is stored below each report's `evidence/` directory and is intentionally blocked from the generic `/reports` static route because it can contain session identifiers or personal data. The metadata-only `evidence/manifest.json` remains downloadable so reviewers can verify artifact names, sizes, and hashes.

Finding review decisions refresh the affected Report History HTML, JSON, PDF, and findings CSV outputs plus `workflow.json` and `report-manifest.json`; the original raw evidence archive is not modified. New assessments do not generate duplicate audience-specific JSON projections or numbered workflow revisions. Existing historical files remain readable and are not deleted.

### Schema compatibility

Compliance report schema `2.2.0` includes mapping-catalog provenance, relationship/prerequisite records, evidence classification, statement-level traceability, policy quality, GDPR notice coverage, locale coverage, payment-flow observations, consent scenarios, and explicit check/observation/finding counts. Finding schema `1.2.0` retains classified evidence and structured control mappings. Evidence archive schema `1.1.0` retains consent-scenario artifacts and matching provenance. Evidence-vault and finding-lifecycle indexes use version `3`; workflow projections use version `2.0.0`, and report manifests use version `1.4.0` with filename, MIME type, size, and SHA-256 fields. Read-time migration maps historical approval/lifecycle fields to conservative legacy or reviewer-decision states. Existing `controls` arrays and prior report fields remain available. Historical reports receive conservative defaults (`controlSatisfaction = not_determined`, `coverage = partial`, and `mappingCatalogVersion = legacy-unversioned`) and raw historical evidence is not rewritten.

### Authenticated sessions

The compliance evidence collector accepts a structured login flow: login URL, username selector, password selector, submit selector, and optional success URL/selector. Credentials are used only for the current request and are excluded from reports and evidence.

Successful Playwright storage state is encrypted with AES-256-GCM under `profiles/security-scanner/`. Set a stable secret to reuse sessions after a toolkit restart:

```bash
SECURITY_SESSION_KEY='replace-with-a-long-random-secret' npm start
```

Without this variable, an ephemeral process key is used and stored sessions are reusable only until the server restarts.

### OWASP ZAP passive evidence

ZAP integration uses the official stable container image. Docker must be installed and able to reach the target.

- Passive mode uses `zap-baseline.py` and does not perform active attacks.
- Authenticated passive mode requires a local ZAP context file and named context user.

Active and API attack-testing support is not exposed by the normal Compliance Mapping UI or scan API. Any retained runner internals are reserved for a future separately authorized security-testing workflow.

### Signing

Configure an HMAC key to sign evidence and report manifests:

```bash
SECURITY_REPORT_SIGNING_KEY='replace-with-a-separate-random-secret' npm start
```

Without a configured key, manifests are still hashed and explicitly marked unsigned.

### Security data and API

Local toolkit state is created beneath `data/` when needed:

- `security-evidence-vault.json`
- `security-audit-log.jsonl`
- `security-finding-lifecycle.json`

Security API routes include:

- `POST /api/security/scan`
- `GET /api/security/evidence`
- `GET /api/security/audit-log`
- `GET /api/security/findings`
- `POST /api/security/findings/:fingerprint`

### Tests

```bash
npm test
```

Phase 1 validation is split into deterministic, browser, PDF, cross-format, packaging, and real smoke categories. Run the complete environment-aware validation with:

```bash
npm run validate:phase1
```

The command prints a concise status and a machine-readable JSON summary. Browser navigation blocked by administrator policy is reported as an explicit skip rather than a product pass or failure. See [`docs/PHASE1_VALIDATION.md`](docs/PHASE1_VALIDATION.md) for the controlled scenario matrix and category commands.

Create a clean source-only ZIP (excluding dependencies, reports, runtime state, profiles, and evidence) with:

```bash
npm run package
```

The local security lab and expected results are documented in `test/EXPECTED_FINDINGS.md`. Active security testing must only be run against targets for which the operator has explicit permission.


## v1.3
Added responsive mobile navigation drawer with burger menu and overlay.
