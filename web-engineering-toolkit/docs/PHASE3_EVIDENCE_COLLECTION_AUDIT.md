# Phase 3 — Deeper Evidence Collection Audit

Date: 2026-08-26

Repository baseline: `ca437992726776debdfb8989841f4fb833cb32ae` (`develop`), clean before the audit

Toolkit version: `1.7.1`

Mapping catalog: `2026.08.26.3`

This audit was completed before Phase 3 production changes. It treats the Phase 2 evidence, mapping, control, applicability, governance, and reporting semantics as the validated baseline. The purpose is to identify collection gaps, not to reopen that model.

## 1. Baseline validation

- Report schema: `2.4.0`
- Finding/control schema: `1.4.0`
- Evidence vault schema: `4`
- Evidence manifest schema: `1.2.0`
- Passive ZAP finding schema: `1.1.0`
- Static mappings: 62
- Registry frameworks: 6
- Unique candidate controls: 19
- `npm test`: 112 passed, 0 failed, 0 skipped; 54.80 seconds wall time
- `npm run validate:phase1`: 80 passed, 0 failed, 0 skipped; 105.99 seconds wall time
- Browser: Brave 151.1.93.134 at `/usr/bin/brave-browser`; launch, navigation, PDF source navigation, and PDF rendering available

The invariants remained `assessmentType = compliance_pre_assessment`, `complianceConclusion = not_determined`, `controlSatisfaction = not_determined`, and `coverage = partial`.

## 2. Current collection architecture

The live collection path is:

```text
bounded HTTP/TLS/DNS/crawl/browser/authenticated/consent/passive-ZAP collection
  -> restricted evidence archive
  -> evidence manifest and artifact hashes
  -> safe public projection
  -> existing Phase 2 evidence dimensions and traceability tuple
  -> findings and unchanged mapping registry
  -> unchanged conservative control aggregation
  -> JSON / HTML / PDF / XLSX / CSV / workspace
```

The general `BrowserManager`, `flow-runner`, and `flow-worker` support Lighthouse setup/session workflows. Compliance Mapping uses its own isolated Playwright collector in `security-scanner.js`; changing those Lighthouse flow modules would duplicate capability and violate three-tool isolation.

## 3. Existing capability inventory

| Surface | Current capability | Assessment |
|---|---|---|
| HTTP | Bounded GET, retries, explicit attempts, body cap, headers, raw headers, Set-Cookie, redirect chain | Sufficient baseline |
| TLS/certificate | Handshake-bound certificate chain, protocol/cipher/ALPN/ephemeral key, OCSP metadata, protocol probes, CAA | Sufficient baseline |
| DNS | CAA observation with explicit error | Sufficient baseline for current scope |
| Security headers/CORS | CSP, HSTS, framing, nosniff, referrer, permissions, isolation policies, bounded synthetic-Origin GET probes | Sufficient; no exploit behavior needed |
| Static HTML | Scripts, iframes, forms, mixed-content references, policy/payment/locale signals | Substantial but route discovery is narrow |
| Cookies | Static and runtime attributes, stable name/domain/path/scope/missing-condition identity | Sufficient; Phase 2 identity must not change |
| Browser runtime | Retry/backoff, page navigation, resources, cookies, storage key names, links, forms, frames, console security messages, screenshot | Substantial; network records lack precise safe provenance/classification and an explicit record cap |
| API/XHR/fetch | Naturally observed endpoint URLs, bounded display list, bounded CORS follow-up for same-party candidates | Partial; public record is URL-only and source page/status/category detail is lost in the API summary |
| Third parties | Existing first-party heuristic, host list, script list, tracking-host heuristic | Partial; exact origin and related-host distinctions are not explicit |
| Public crawl | Homepage plus keyword links, locale variants, and guessed policy/security/legal paths; 1–25 page cap; 900 KB/page | Partial; no robots/sitemap input and URL dedupe discards every query parameter |
| SPA/client routes | Runtime anchors are captured after JavaScript; authenticated link navigation can observe browser-rendered pages | Partial; public SPA routes are candidates only and are not falsely reported as visited |
| Policy/documents | Privacy/cookie/terms/security/compliance/healthcare paths, quality classification, GDPR notice matrix, Arabic/English locale handling, fragment safety | Strong for HTML/text; rendered-only and downloadable documents remain bounded limitations |
| Authentication | Operator-supplied username/password selectors or encrypted storage-state reuse; role-scoped session IDs | Sufficient baseline |
| Authenticated crawl | Same-origin GET navigation, 1–25 page cap, forms and safe body/title/status evidence, first three screenshots | Substantial; lacks explicit time/depth/queue completeness metadata |
| Role evidence | Any operator-labelled role can be scanned independently; fixture roles include normal, privileged, admin, and custom | Sufficient for per-role evidence; no automatic RBAC comparison |
| Forms | Action, method, input types and field identifiers; forms are not submitted except configured login and consent cases | Partial; safe form flags and autocomplete metadata can be clearer |
| Consent | Fresh load plus bounded accept/reject/preferences/withdraw/reload/returning/locale scenarios, isolated contexts, cookies/storage keys, screenshots | Strong; actions that do not match are not explicitly labelled as requiring manual confirmation and scenario network deltas are absent |
| Payment | Redirect, iframe, hosted fields, merchant form, provider script/request, tested origin/source/destination/provider separation | Sufficient; no transaction is or should be executed |
| Storage | Cookie metadata plus localStorage/sessionStorage key names; values stay restricted | Sufficient baseline; safe pre/post consent differences can add value |
| Screenshots | Main page, consent scenarios, and first three authenticated pages | Sufficient and bounded; all evidence screenshots are restricted |
| Evidence archive | Restricted JSON/binary artifacts, SHA-256, manifest, binary deduplication with roles/aliases | Strong; one duplicate browser-network registration call is redundant |
| Passive ZAP | Public passive and authenticated-passive product modes, normalized confidence/state/method/provenance | Sufficient; server and UI reject active/API modes |
| Framework scope signals | Policy text, payment/PHI signals, operator assertions and jurisdiction metadata | Sufficient; Phase 3 must not change applicability semantics |

## 4. Redundant paths and already-correct failures

### Redundant paths

- `writeEvidenceArchive()` registers the same `browser-network` JSON artifact twice. This should be one artifact; removing the duplicate does not change evidence meaning.
- The Compliance browser collector and the Lighthouse CDP/setup-flow system serve different tool workflows. Combining them would add coupling rather than useful evidence depth.
- Payment, consent, policy-quality, cookie-identity, applicability, and mapping semantics already have controlled fixture coverage. Reimplementing them would duplicate Phase 2 work.

### Failure behavior already correct

- HTTP, TLS details, browser runtime, authenticated session/crawl, consent, crawl, and ZAP already distinguish completed/partial/not-tested/failed-to-test in their primary checks.
- Static absence plus failed browser collection remains a bounded static absence, not a full runtime absence.
- Authentication failure does not become weak/strong access-control evidence.
- Crawl failure does not become a missing-policy conclusion.
- ZAP unavailability does not become a no-alert conclusion.
- Restricted browser/session/storage/authenticated/ZAP material is removed from public projections.

## 5. Demonstrated Phase 3 gaps selected for implementation

### P3-COL-001 — URL identity and discovery inputs

`website-crawler.js` removes fragments and trailing slashes, but its dedupe key drops the complete query string. It can incorrectly merge query-sensitive application routes. It also has no bounded robots/sitemap discovery.

Implement:

- one canonical URL helper that removes fragments, default-port/trailing-slash noise, and known tracking parameters while preserving and sorting meaningful query parameters;
- bounded `/robots.txt`, `/sitemap.xml`, and sitemap-index discovery;
- sitemap/robots metadata as discovery provenance only;
- limits for sitemap documents, sitemap URLs, request time, and selected pages;
- no defect interpretation of `robots` directives.

### P3-COL-002 — Safe browser network provenance and limits

Browser resources have URL, method, type, status, and restricted raw headers, but lack page source URL, destination host, exact-origin/related-host/external classification, initiator metadata, and explicit truncation state. The in-memory resource map is unbounded until the page finishes.

Implement:

- bounded network record count;
- source page URL, destination host/origin, observation time, initiator type where available;
- factual `same_origin`, `related_host`, or `external_host` classification with a confidence/boundary note;
- safe API endpoint summaries retaining method/status/source URL/category;
- no request or response body collection.

### P3-COL-003 — Collection-level completeness

Control coverage exists, but the report has no single collector-level view. Silent top-level omission is therefore still possible for a user reading only the overview.

Implement a non-scored `collectionCoverage` object for HTTP, TLS, DNS, crawl, browser, authenticated, consent, and passive ZAP, including explicit states and limitations. It must not produce a percentage.

### P3-COL-004 — Consent action and safe delta transparency

Consent scenarios preserve individual cookie/storage snapshots but do not expose safe pre/post differences or distinguish an unmatched consent control from a successful action.

Implement:

- `actionState` with `completed`, `not_applicable`, or `requires_manual_confirmation`;
- bounded per-scenario network metadata;
- safe cookie-name/storage-key/network-host additions and removals relative to fresh load;
- no values, bodies, legal validity, or consent conclusion.

### P3-COL-005 — Authenticated/form budget transparency

Authenticated crawling is page-count bounded but does not expose queue exhaustion, runtime limit, depth, or why coverage is partial. Form metadata lacks explicit password/file/payment/autocomplete summaries.

Implement:

- deterministic authenticated depth/runtime/queue limits and completion metadata;
- shared URL canonicalization to prevent loops/query explosion;
- safe form metadata flags without field values;
- preserve independent per-role scanning; do not add automatic cross-role authorization testing.

### P3-COL-006 — Evidence archive redundancy

Remove the duplicate `browser-network` artifact registration and add a regression ensuring one canonical artifact with stable roles/references.

## 6. Gaps intentionally not implemented

- Unrestricted or recursive general-purpose spidering: conflicts with bounded assessment scope.
- Automatic public SPA menu clicking or arbitrary business interaction: intent cannot be established safely from generic controls. Runtime route candidates may be recorded without claiming they were visited.
- Automatic multi-role differential authorization/RBAC testing: route authorization must be explicitly configured per role; status/title/menu differences are candidates, not proof.
- Credential discovery, guessing, account enumeration, privilege escalation, or authentication bypass.
- Arbitrary form submission, file upload, account creation/reset, contact submission, settings changes, deletion, checkout completion, or payment transactions.
- Network request/response body archival: metadata is sufficient for selected Phase 3 gaps and avoids private API/body leakage.
- General PDF/document parsing, OCR, or screenshot redaction derivatives: useful future capabilities but materially larger parsers/sensitivity systems.
- Cookie-purpose or tracker legal classification from technical attributes.
- Consent validity, privacy-notice sufficiency, contract/BAA validity, legal applicability, or violation conclusions.
- Active ZAP, API scan, fuzzing, forced browsing, or attack payloads. Compliance Mapping remains exposed only as none/passive/authenticated-passive.
- Any mapping, relationship, prerequisite, applicability, control aggregation, cookie fingerprint, or governance change.

## 7. Fixture requirements

Only selected gaps require new fixture behavior:

- robots file referencing a sitemap;
- sitemap index and bounded child sitemap;
- meaningful-query and tracking-query duplicates;
- runtime same-origin API, external API, and script observations;
- network-record budget overflow;
- safe form inventory with password/file/payment/autocomplete fields;
- consent storage/cookie/network changes and an ambiguous/unmatched action;
- authenticated link loop/query variants and bounded crawl metadata.

Existing payment, policy-quality, multilingual, authentication, failure, PDF, redaction, mapping, and three-tool fixtures remain authoritative and should be reused.

## 8. Version decision before implementation

The mapping catalog should remain `2026.08.26.3` because no mapping semantics or provenance will change.

Adding canonical `collectionCoverage`, safe network records, consent deltas, and crawl metadata requires a report schema bump. The finding/control, evidence vault, evidence manifest, and passive ZAP finding schemas should remain unchanged unless implementation demonstrates a structural need.

## 9. Required validation

- Test-first deterministic regressions for each selected gap.
- Browser integration for network, consent, and authenticated budgets.
- Traceability/artifact-resolution and redaction tests.
- Cross-format collection-coverage and safe-network presentation checks.
- Native PDF extraction, pagination, machine text, link, and secret checks.
- `npm test`, `npm run validate:phase1`, and a focused `validate:phase3` composition.
- Controlled smoke for Compliance Mapping, Lighthouse Reporter, and Asset & Page-Weight Analyzer.

No production collector change should proceed outside the selected gaps without updating this audit first.
