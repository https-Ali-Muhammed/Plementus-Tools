# Security & Compliance Scanner Audit

Audit date: 2026-08-24
Audited version: 1.4.0
Scope: scanner engine, HTTP and browser collection, crawler, TLS/header/cookie analysis, compliance mapping, persistence, reports, and frontend rendering.

## Executive Summary

The current scanner is a useful public-website security review tool, but it is not yet an assessment platform. It combines collection, analysis, compliance interpretation, and presentation in one large module. It records normalized scan output but does not preserve a defensible raw evidence package. A browser navigation failure discards observations already collected, and the current check model represents one aggregate result per check rather than one finding per affected condition.

The existing product already observes important signals: redirects, response headers, raw `Set-Cookie` values in memory, certificate metadata, selected TLS versions, CSP/HSTS quality, runtime requests and cookies, targeted CORS behavior, mixed content, evidence-page discovery, and public compliance language. It also correctly states that automated scanning cannot certify compliance.

The recommended evolution is incremental. Keep the framework-free Node server, vanilla frontend, report-folder convention, and report history. Introduce stable collection artifacts and schemas underneath them: a scan manifest, an evidence archive, atomic findings, explicit test-result states, control evaluations, and lifecycle metadata. Existing `checks` can remain as a compatibility projection while reports and UI migrate to `findings` and `controlEvaluations`.

## 1. Current Architecture

### Request and execution flow

1. `public/index.html` collects project, URL, jurisdiction, crawl limit, and selected frameworks.
2. `public/app.js` posts the configuration to `POST /api/security/scan`.
3. `server.js` invokes `scanWebsiteSecurity()` synchronously and passes its result to `SecurityReportManager.save()`.
4. `lib/security-scanner.js` performs the initial HTTP request, TLS probes, browser scan, analyzers, CORS probes, and evidence crawl.
5. `lib/security-report-manager.js` creates one report folder containing HTML, JSON, CSV, XLSX, and metadata.
6. The API returns the full scan result plus report links; the frontend renders grouped checks and framework summaries.

There is no security-scan job queue, progress stream, scheduler, database, authentication/authorization layer, evidence repository, or review workflow. A long scan holds a single HTTP request open.

### Components

| Component | Current responsibility | Important coupling |
| --- | --- | --- |
| `lib/security-scanner.js` | Collection, security analysis, compliance mapping, orchestration | One 960-line module owns most scanner behavior and result construction |
| `lib/http-client.js` | HTTP(S), redirects, body limits, raw Set-Cookie extraction, TLS handshake metadata | Raw response header ordering/casing is not retained; retry metadata is not returned |
| `lib/website-crawler.js` | Bounded discovery of likely policy/trust pages and regex evidence extraction | Not a general crawler; fetched HTML is removed from the returned report |
| `lib/environment-checker.js` | Browser executable discovery | Scanner always selects the first detected executable |
| `lib/security-report-manager.js` | Report-folder creation and HTML/CSV/XLSX/JSON generation | Presentation reads legacy aggregate `checks` directly |
| `public/app.js` | Configuration, synchronous scan request, grouped result rendering | Understands only `pass`, `warning`, `fail`, `manual`, and `info` |
| `server.js` | Routes and static/report file delivery | No per-project access checks; report files are directly addressable |

### Current storage model

Each scan creates:

```text
reports/<project>_security-compliance_<timestamp>/
  metadata.json
  summary.json
  summary.html
  summary.csv
  summary.xlsx
```

`summary.json` contains processed TLS, browser, crawl, checks, and framework summaries. It does not contain the original response body, a byte-faithful header capture, raw browser response headers, screenshots, complete request metadata, crawl response bodies, artifact hashes, or reviewer history.

## 2. Current Security Checks

### Transport and TLS

- Final URL uses HTTPS.
- HTTP endpoint redirects to HTTPS.
- Leaf certificate authorization, subject, issuer, validity dates, and days to expiry.
- Negotiated TLS protocol and cipher.
- Individual connection probes for TLS 1.0, 1.1, 1.2, and 1.3.
- Legacy protocol detection.

### Headers and browser policies

- HSTS presence, `max-age`, `includeSubDomains`, and `preload` token.
- CSP parsing with checks for missing source fallback, wildcard script sources, `unsafe-inline`, `unsafe-eval`, `object-src 'none'`, `base-uri`, and `frame-ancestors`.
- Clickjacking coverage through X-Frame-Options or CSP `frame-ancestors`.
- X-Content-Type-Options `nosniff`.
- Referrer-Policy presence and basic strength classification.
- Permissions-Policy presence and broad grants for selected sensitive features.
- Presence of COOP, COEP, and CORP.
- Server and X-Powered-By disclosure.

### Cookies, browser, and page content

- Raw `Set-Cookie` extraction from the initial response.
- Cookie-name heuristic classification: session/auth, analytics/tracking, preference, or unclassified.
- Secure, HttpOnly, and SameSite checks adjusted by inferred sensitivity.
- Headless browser collection of runtime cookies, network resources, selected response metadata, failed requests, API calls, third-party hosts/scripts, storage key names, and security-related console messages.
- Static and runtime mixed-content checks.
- Password field transport check.
- Initial-HTML privacy-policy and cookie-consent signals.
- Third-party script inventory.
- `.well-known/security.txt` contact-field check.

### Application exposure

- Synthetic external-Origin CORS requests against the main page and up to seven discovered first-party API URLs.
- Detection of wildcard ACAO and reflected synthetic origin with credentials.

### Public compliance evidence

- Shallow, same-host crawl of homepage links with compliance keywords and guessed common paths.
- Regex signals for rights, consent, incident response, encryption, processors/DPA, access control, vulnerability management, retention, logging, backup, payments, and healthcare/PHI.
- Text mentions of ISO 27001, SOC 2, PCI DSS, HIPAA, GDPR, and CCPA.
- Framework summaries for ISO 27001, GDPR, SOC 2, HIPAA, PCI DSS, and local regulation context.
- A clear disclaimer that the scan is not certification or a legal compliance determination.

## 3. Current Limitations

### Collection reliability

- Browser navigation uses one 45-second `load` attempt. It has no retry, backoff, alternate readiness strategy, or recovery context.
- On `page.goto()` failure, the context is closed and all captured requests, responses, cookies, console messages, and current-page state are discarded.
- Browser output is binary (`available` true/false); collection completeness and individual test outcomes are not represented.
- The browser blocks service workers, which improves repeatability but can hide production behavior and should be recorded as a scan limitation.
- Browser request correlation uses Playwright's private `_guid` property.
- Runtime request headers, request bodies, timing, initiators, redirect relationships, and full response headers are not archived.
- No screenshots are captured.
- The initial HTTP response retains normalized headers, but not `rawHeaders`; only Set-Cookie values are separately retained.
- Crawl errors are retained only as strings, without attempt/timing/error classification.
- HTTP retries are fixed, short, and invisible in the result.

### Finding semantics

- `checks` mix tests, observations, findings, and manual tasks.
- One check can combine several affected cookies or CSP weaknesses, preventing per-item lifecycle management.
- `status` describes analyzer outcome (`pass`, `warning`, etc.) but not finding workflow (`open`, `resolved`, `accepted`, `suppressed`).
- Confidence is absent. Static pattern matches and direct header observations appear equally authoritative.
- `evidence` is usually a prose string rather than a typed, immutable evidence reference.
- No first-seen, last-seen, scanner version, test method, limitations, fingerprint, owner, due date, or suppression data.
- Check IDs are broad (`cookies`, `csp`) and are not stable vulnerability identifiers such as `COOKIE_SESSION_SECURE_MISSING`.
- Pass counts can imply broad safety despite narrow coverage.

### Crawling and application coverage

- The crawler is a bounded policy-page finder, not an application crawler.
- It reads only initial server HTML, so client-rendered navigation and policies can be missed.
- It does not follow ordinary in-scope links, forms, sitemaps, robots hints, or browser-discovered routes.
- It has no route canonicalization policy beyond origin/path deduplication, no query policy, and no crawl frontier/graph.
- It does not authenticate, record login flows, reuse scanner sessions, identify logout, or maintain roles.
- It cannot compare anonymous/user/manager/admin access and cannot substantiate broken access control or IDOR findings.
- It scans one main page for headers and cookies; policy crawl responses are used primarily as text sources.

### TLS depth

- Certificate chain entries, SAN matching detail, signature algorithms, key sizes, certificate fingerprints, and trust path are not captured.
- Cipher enumeration is not performed; one negotiated cipher per successful protocol probe is insufficient for suite quality conclusions.
- Forward secrecy is not assessed.
- OCSP stapling, DNS CAA, revocation, SNI variants, HTTP/2/HTTP/3, and HSTS preload-list membership are not assessed.
- Probes use `rejectUnauthorized: false` to determine protocol support; this is appropriate for reachability but must not be confused with validation.
- No SSL Labs integration exists and the scanner correctly does not produce an SSL grade.

### Compliance depth

- Framework mappings are labels, not versioned control records.
- Technical checks are mapped broadly to whole frameworks rather than exact control clauses and evidence sufficiency requirements.
- Public text is treated as evidence of language presence, without claim verification, document identity, publication date, or reviewer approval.
- Applicability is inferred from weak content signals. It is not a scoping decision.
- There is no explicit `Not Assessed` state distinct from missing evidence.
- Manual review requirements are a boolean and prose list, not assignable workflow items.
- No evidence expiry, approval, ownership, or control-to-evidence traceability exists.

### Operational and platform gaps

- No ZAP integration, active-scan authorization gate, Docker runner, API definition scan, or imported alert normalization.
- No evidence vault, uploads, hashes, versions, or immutable snapshots.
- No reviewer roles, audit log, approvals, expiration, or legal/security ownership.
- No scheduled scans, comparisons, finding history, false-positive workflow, suppression rules, or risk acceptance.
- No notifications, signed reports, PDF, JSON API versioning, or multi-user access control.
- No scanner-specific automated tests or vulnerable test applications were found.

## 4. Likely False Positives

1. **HIPAA applicability from generic healthcare content.** The existing Plementus report marks HIPAA applicable because “Healthcare” appears in an industry list. This is not evidence that the target creates, receives, maintains, or transmits PHI as a covered entity or business associate.
2. **Payment scope from generic payment text.** Words such as “payment”, provider names, or a checkout link can mark PCI relevance even when all card entry is outsourced and the scanned host is outside the cardholder-data environment.
3. **Cookie sensitivity by name.** A cookie containing `token`, `uid`, or `session` can be non-sensitive; an opaque authentication cookie can have an innocuous name.
4. **Cookie attribute string matching.** Although semicolon-delimited checks reduce noise, unusual formatting or quoted values can still confuse substring parsing. A standards-based Set-Cookie parser is preferable.
5. **CSP severity.** Missing `object-src 'none'` may be mitigated by a restrictive `default-src`; `unsafe-inline` may coexist with nonces/hashes and `strict-dynamic`. The current count-based strong/moderate/weak rating lacks context.
6. **CORS wildcard.** `Access-Control-Allow-Origin: *` is not inherently risky for public, non-sensitive resources without credentials. Risk needs resource sensitivity, methods, and credential behavior.
7. **Header absence on non-sensitive sites.** COOP/COEP/CORP and Permissions-Policy are contextual hardening controls, not universal vulnerabilities.
8. **Policy path success.** A guessed path that redirects to generic content can still be misclassified despite relevance filtering.
9. **Certification mention.** A public framework name can be historical, aspirational, comparative, or a disclaimer rather than a claim.

## 5. Likely False Negatives

1. JavaScript-created cookies/resources and consent behavior are entirely missed when browser navigation times out.
2. Cookies set on redirects, subresources, later pages, authenticated routes, API responses, or user interactions are not comprehensively evaluated.
3. Consent detection checks text presence, not whether non-essential tracking is blocked before consent or stopped after withdrawal.
4. CSP analysis omits nonce/hash quality, `strict-dynamic`, scheme sources, host wildcards below `*`, `form-action`, `upgrade-insecure-requests`, report-only policies, duplicate directives, and effective fallback behavior.
5. CORS tests GET only and do not exercise preflight, methods, headers, `null` origins, subdomain origins, suffix/prefix reflection bypasses, cache variance, or authenticated responses.
6. Mixed content can be missed when blocked before a response, injected after interaction, loaded by service workers, or present on unvisited routes.
7. TLS suite quality and certificate-chain problems beyond Node's authorization result are not enumerated.
8. The crawler misses client-side routes, unlinked pages, localized policies, PDFs, sitemaps, authenticated pages, and pages without expected English keywords.
9. Broken access control and IDOR cannot be tested without authenticated, role-aware request comparison and safe test-case definitions.
10. Header checks on the homepage do not reveal weaker headers on APIs, downloads, login, admin, error pages, or redirects.
11. A `security.txt` file can be stale, malformed, incorrectly scoped, or missing required expiry while still passing the current Contact-only test.

## 6. Recommended Architecture

Preserve the existing deployment shape while separating responsibilities:

```text
POST /api/security/scans
  -> SecurityScanCoordinator
     -> collectors (HTTP, browser, crawl, TLS, DNS, ZAP)
     -> evidence writer (append-only artifacts + hashes)
     -> analyzers (headers, cookies, consent, TLS, CORS, content)
     -> finding normalizer (stable atomic findings)
     -> control evaluator (versioned mappings, no certification conclusions)
     -> report projections (executive, developer, auditor, privacy, appendix)
```

### Scan manifest

Every scan should have a versioned manifest containing scan ID, project ID/name, requested scope, authorization mode, timestamps, scanner/tool versions, collector attempts, outcome, limitations, artifact inventory, and SHA-256 hashes. A completed report folder is the first implementation of an immutable snapshot.

### Evidence archive

Store machine-readable artifacts beneath each report:

```text
evidence/
  manifest.json
  http/initial-response.json
  http/set-cookie.json
  browser/attempts.json
  browser/cookies.json
  browser/network.json
  browser/console.json
  browser/page.png
  tls/analysis.json
  crawl/pages.json
  crawl/errors.json
```

Raw artifacts may contain session identifiers, tokens, personal data, and secrets. Apply redaction by default, mark sensitivity, restrict report serving, and never persist credentials. A later vault must encrypt sensitive artifacts at rest and enforce project/user authorization.

### Test-result state

Model collection/test disposition independently from findings:

- `confirmed`: direct, reproducible evidence proves the condition.
- `observed`: direct evidence was collected but context or completeness is limited.
- `inferred`: heuristic or indirect evidence suggests the condition.
- `not_tested`: outside configured scope or prerequisites were absent.
- `failed_to_test`: attempted, but a timeout/tool/environment error prevented a conclusion.

A partial browser run should be `observed` with limitations, while only the failed subtests become `failed_to_test`.

### Finding model

Create atomic, schema-versioned findings with stable IDs and fingerprints. Each finding should include title, severity, confidence, lifecycle status, affected URL, typed evidence references, impact, recommendation, authoritative references, exact control IDs, first/last seen timestamps, test method, tool version, limitations, and source (`native`, `zap`, `manual`).

Keep successful tests as `testResults`; do not create “pass findings.” Preserve `checks` temporarily as a compatibility projection for the existing UI and reports.

### Control evaluation model

Use versioned control catalogs. A control evaluation should contain framework/version/control ID, applicability, evidence requirements, linked evidence, linked findings, state (`supported`, `missing_evidence`, `manual_review_required`, `not_assessed`, `not_applicable`), reviewer status, and limitations. Automated observations can support a control but can never make a framework-level compliance or certification claim.

### Authenticated scanning

Represent login as structured actions (`goto`, `fill`, `click`, `waitForURL`, `waitForSelector`) whose secrets are referenced from runtime-only secret inputs, never report configuration. Store encrypted Playwright storage state separately from report output. Require explicit scope and role definitions. Access-control comparisons should initially report candidates for manual validation, not confirmed IDOR, unless the scanner safely repeats the same object request across authorized roles and captures a material unauthorized response.

### ZAP integration

Use a dedicated adapter that runs Docker with explicit modes. Passive mode is the default. Active mode requires a persisted authorization acknowledgement, scope allowlist, and warnings. Import ZAP JSON alerts without losing plugin ID, CWE/WASC, confidence, evidence, instances, solution, and references, then normalize them into the finding schema with `source: zap`.

## 7. Incremental Implementation Plan

### Increment 1: reliability, evidence, and model foundation

- Add browser retry count, configurable navigation timeout, exponential backoff, and fallback readiness (`domcontentloaded`) after `load` timeouts.
- Preserve partial network/cookie/console/page evidence from every browser attempt.
- Capture screenshots when any DOM is available.
- Introduce explicit collector/test states and attempt metadata.
- Preserve normalized raw response headers plus original raw header pairs and raw Set-Cookie values.
- Add evidence writer, manifest, hashes, scanner version, and artifact links.
- Add versioned atomic findings while retaining legacy checks.
- Update frontend/reports to display confidence, evidence type/reference, test method, and limitations.
- Add unit/integration fixtures for timeouts, weak headers, cookies, CORS, mixed content, and partial scans.

### Increment 2: coverage and authenticated foundation

- Extract a reusable in-scope crawler with a frontier, route limits, sitemap hints, browser links, per-page collection, and structured errors.
- Scan headers/cookies/content across selected pages rather than only the homepage.
- Add structured login flows, encrypted-at-rest storage state, session reuse, logout detection, and redaction.
- Add named roles and response-difference candidates for manual access-control review.

### Increment 3: external scanner and TLS depth

- Add ZAP Docker availability checks, passive/authenticated passive/API modes, explicit active authorization, progress, import, and normalization.
- Add certificate-chain/SAN/fingerprint capture, cipher enumeration, forward-secrecy assessment, OCSP stapling, CAA lookup, and preload-list evidence.
- Optionally add SSL Labs with rate-limit-aware polling and clear third-party data-sharing disclosure.

### Increment 4: evidence vault and controls

- Add project-scoped evidence objects, uploads, owners, dates, expiry, hashes, versions, approval state, control/finding links, and retention policy.
- Add versioned ISO 27001, SOC 2, GDPR, HIPAA, and PCI DSS control catalogs with explicit applicability and evidence requirements.
- Replace framework prose arrays with control evaluations while retaining a compatibility summary.

### Increment 5: review, reporting, and operations

- Add reviewer roles, assignments, comments, approval/rejection/expiry workflow, and append-only audit events.
- Add executive, developer, auditor-evidence, legal/privacy, and technical-appendix report projections.
- Add scan comparison, finding lifecycle, suppression/risk acceptance with expiry, scheduled scans, notifications, PDF export, signed manifests, and access-controlled API endpoints.

## 8. Acceptance Boundaries

- No UI, API, export, or report may label an organization or target “compliant” or “certified” from automated evidence.
- “No findings” must be qualified by tested scope and failed/not-tested checks.
- Imported tool grades or claims must retain their source and limitations.
- Active scanning, authenticated destructive actions, and role tests require explicit authorization and scope.
- Secrets must not be written to reports, logs, screenshots, or evidence artifacts.
- Evidence must be traceable to collection time, method, tool version, scan, and hash.
- Manual evidence and automated observations must remain distinguishable in storage and presentation.
