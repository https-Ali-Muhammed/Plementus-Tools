# Security Headers & Web Security Analyzer — Implementation

## Architecture decisions

The analyzer is the fifth first-class Web Engineering Toolkit module. Its internal report identifier is `security-analyzer`; its API route is `/api/security-analyzer/analyze` so it cannot collide with the established `/api/security/*` Compliance Mapping lifecycle.

The implementation reuses the existing architecture:

- `lib/http-client.js` for bounded HTTP redirects, response headers, Set-Cookie values, and TLS handshake metadata
- Playwright Core plus `detectBrowsers()` for rendered-page requests and stored-cookie observations
- `reportHtmlTheme()`, `reportHtmlQuickActions()`, and `reportBackToTopControl()` for the self-contained `summary.html` report family
- `reportFamilyDocument()` and `generateToolPdf()` for the shared A4 searchable PDF family
- `writeReportXlsx()` and spreadsheet-safe cells for Excel
- `report-downloads.js` for safe artifact resolution and download filenames
- `ReportManager.listReports()` for history discovery, compatibility, actions, and deletion
- the shared interactive `reportActionControls()` for Open Report, Download PDF, and More Exports

No Compliance Mapping scanner, mapping, classification, review, report, or Phase 5/6 behavior is changed.

## Checks implemented

Security Headers includes Content-Security-Policy, Strict-Transport-Security, X-Frame-Options, X-Content-Type-Options, Referrer-Policy, Permissions-Policy, Cross-Origin-Opener-Policy, Cross-Origin-Resource-Policy, and Cross-Origin-Embedder-Policy. CSP identifies `unsafe-inline`, `unsafe-eval`, wildcard sources, and missing default/script source baselines. HSTS checks a one-year max-age and `includeSubDomains`.

HTTPS & TLS includes final HTTPS use, the base HTTP entry-point redirect, certificate authorization, expiration, issuer/subject metadata, negotiated TLS protocol, and cipher where available.

Cookie analysis combines response Set-Cookie observations and browser-stored cookies, deduplicates them, and checks Secure, HttpOnly, SameSite, and third-party domain context. Only cookie names and security attributes are projected into reports; cookie values and browser storage state are not exported.

Mixed Content records HTTP subresource requests observed while an HTTPS page is rendered. Scripts and stylesheets are failures; other insecure resources are warnings. Each record retains page, resource URL, resource type, risk, and recommendation.

## Scoring logic

Each check maps to a normalized value:

- pass: 1.0
- warning: 0.5
- fail: 0.0
- unavailable: excluded from the denominator and visibly counted

A category score is the arithmetic mean of its scored checks, rounded to a whole percentage. The overall security score is the equally weighted arithmetic mean of selected category scores. This prevents a category with many header rows from overwhelming a smaller category such as Mixed Content. Every category displays its score and counts of passed, warning, failed, and unavailable checks.

The score represents observed configuration at one time. It must not be interpreted as exploit resistance, vulnerability absence, legal compliance, control satisfaction, certification, or a substitute for authenticated testing and human security review.

## Reports and exports

Each report folder is named with the existing slug/timestamp helpers and contains `summary.html`, `summary.json`, `summary.csv`, `summary.xlsx`, `summary.pdf`, and `metadata.json`. History derives report identity from the canonical JSON/metadata fields, so existing records remain readable.

HTML and PDF include overview score cards, header results, TLS/HTTPS data, cookies, mixed-content findings, recommendations, and methodology/limitations. CSV is one row per check. Excel adds Summary, Checks, TLS Certificates, Mixed Content, and Recommendations sheets. Download routes use the existing safe resolver; no separate export endpoint or client-side export path was introduced.

## Limitations

- Results reflect the selected pages, browser environment, network path, and scan time only.
- The analyzer does not log in, submit forms, click consent controls, fuzz inputs, exploit vulnerabilities, enumerate server software, or run active attack payloads.
- Cookie behavior that occurs only after authentication, consent choices, or user interaction requires separate scenario-aware testing.
- Browser policies may block active mixed content before a completed response; requested insecure URLs are still reported when the browser exposes the request event.
- HTTP redirect checks can be unavailable when port 80 is blocked or unreachable; unavailable evidence is disclosed rather than converted to a pass or failure.
- Cross-origin policies are evaluated for presence and recognized values; application compatibility and isolation requirements still require human review.
- CSP analysis identifies common weaknesses but is not a full parser or application-specific allowlist review.
- Certificate and TLS data describe the connection made by the toolkit and are not a full protocol/cipher suite enumeration.
