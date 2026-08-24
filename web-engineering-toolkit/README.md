# Web Engineering Toolkit v1.5

A framework-free website engineering and QA workspace built with vanilla HTML, CSS, JavaScript, and Node.js.

## Tools included

- **Lighthouse Reporter** — repeatable Performance, Accessibility, Best Practices and SEO audits with public/session modes, language-aware routing, mobile/desktop runs, grouped Lighthouse findings and HTML/CSV/XLSX reports.
- **Security & Compliance Scanner** — collects defensible HTTP, browser, TLS, crawl, and optional OWASP ZAP evidence; creates lifecycle findings and control mappings without claiming certification.
- **Asset & Page-Weight Analyzer** — measures transferred page weight and network requests across selected pages, including JavaScript, CSS, images, fonts, media, XHR/fetch, third-party resources and the largest assets.

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

Selecting **Use project** applies that configuration across Lighthouse Reporter, Security & Compliance, and Asset & Page-Weight Analyzer so the same website information does not need to be entered repeatedly.

Project profiles are stored in:

```text
data/projects.json
```

The generated file is ignored by Git so local project data is not committed accidentally.

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
summary.xlsx
assets.csv
metadata.json
```

The Excel workbook contains:

- Summary
- Page Results
- Largest Assets
- Findings

## Unified report history

Report History supports the current report types:

- Lighthouse
- Security Compliance
- Asset Page Weight

Existing single-report deletion and multi-select report-folder deletion remain available.

## Requirements

- Node.js 20+
- npm
- Chrome, Chromium or Brave

Project dependencies:

- Lighthouse 12.8.2
- Playwright Core 1.54.2
- ExcelJS 4.4.0

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

## Security/compliance scope

The Security & Compliance Scanner evaluates technical website evidence only. It cannot verify internal policies, contracts, staff procedures, certifications, risk assessments or legal applicability, and therefore does not claim that a website or organization is compliant/certified.

It separates:

- confirmed, observed, inferred, not-tested, and failed-to-test results
- open security findings from successful test coverage
- automated evidence from manual evidence and reviewer decisions
- control evidence support from framework-level compliance conclusions

### Security scanner capabilities

- browser retries with exponential backoff, timeout recovery, and partial evidence preservation
- raw response headers, Set-Cookie values, browser cookies, network requests, console events, screenshots, TLS data, and crawl errors
- SHA-256 evidence manifests and read-only report snapshots
- atomic findings with severity, confidence, evidence, impact, recommendation, references, controls, first/last seen, test method, scanner version, and limitations
- CSP, HSTS, cookie, consent-order, CORS, mixed-content, certificate, protocol, OCSP, DNS CAA, and forward-secrecy observations
- structured login flows, role-scoped encrypted Playwright session reuse, and bounded authenticated crawling
- OWASP ZAP passive, authenticated-passive, active, and OpenAPI/SOAP/GraphQL API modes
- evidence review states, reviewer roles, and append-only audit events
- finding comparison, false-positive/suppression/risk-acceptance lifecycle, and recurring schedules
- executive, developer, auditor-evidence, privacy/legal, technical-appendix, HTML, JSON, CSV, and XLSX reports

Raw evidence is stored below each report's `evidence/` directory and is intentionally blocked from the generic `/reports` static route because it can contain session identifiers or personal data.

Reviewer changes and finding decisions refresh the affected Report History HTML, JSON, CSV, and XLSX outputs. Each refresh creates a numbered workflow snapshot under the report's `revisions/` directory and links the new report manifest to the preceding manifest hash; the original raw evidence archive is not modified.

### Authenticated sessions

The security scanner accepts a structured login flow: login URL, username selector, password selector, submit selector, and optional success URL/selector. Credentials are used only for the current request and are excluded from reports and evidence.

Successful Playwright storage state is encrypted with AES-256-GCM under `profiles/security-scanner/`. Set a stable secret to reuse sessions after a toolkit restart:

```bash
SECURITY_SESSION_KEY='replace-with-a-long-random-secret' npm start
```

Without this variable, an ephemeral process key is used and stored sessions are reusable only until the server restarts.

### OWASP ZAP

ZAP integration uses the official stable container image. Docker must be installed and able to reach the target.

- Passive mode uses `zap-baseline.py` and does not perform active attacks.
- Authenticated passive mode requires a local ZAP context file and named context user.
- Active mode uses `zap-full-scan.py` and requires explicit authorization acknowledgement.
- API mode uses `zap-api-scan.py`, performs active testing, and accepts OpenAPI, SOAP, or GraphQL definitions.

Postman collections must currently be converted to OpenAPI before using the packaged API scan.

### Signing

Configure an HMAC key to sign evidence and report manifests:

```bash
SECURITY_REPORT_SIGNING_KEY='replace-with-a-separate-random-secret' npm start
```

Without a configured key, manifests are still hashed and explicitly marked unsigned.

### Security data and API

Local platform state is stored beneath `data/`:

- `security-evidence-vault.json`
- `security-audit-log.jsonl`
- `security-finding-lifecycle.json`
- `security-schedules.json`

Security API routes include:

- `POST /api/security/scan`
- `GET|POST /api/security/evidence`
- `POST /api/security/evidence/:id/review`
- `GET /api/security/audit-log`
- `GET /api/security/findings`
- `POST /api/security/findings/:fingerprint`
- `GET|POST /api/security/schedules`
- `DELETE /api/security/schedules/:id`

### Tests

```bash
npm test
```

The local security lab and expected results are documented in `test/EXPECTED_FINDINGS.md`. Active security testing must only be run against targets for which the operator has explicit permission.


## v1.3
Added responsive mobile navigation drawer with burger menu and overlay.
