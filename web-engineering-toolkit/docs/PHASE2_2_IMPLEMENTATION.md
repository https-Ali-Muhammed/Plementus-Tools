# Phase 2.2 — P1 Evidence & Mapping Reliability Corrections

## Baseline

- Repository commit at start: `b3125d6` (`develop`). The Phase 2.1 audit document was already present as an untracked workspace file and was preserved.
- Toolkit version: `1.7.1` (unchanged).
- Mapping catalog before this work: `2026.08.25.2`.
- Static registry before this work: 62 mappings, 19 distinct controls and 5 registry-owned framework identities. ePrivacy was counted under GDPR.
- Starting `npm test`: 78 passed, 0 failed, 0 skipped.
- Starting `npm run validate:phase1`: 78 passed, 0 failed, 0 skipped.
- Browser capability: Brave Browser 151.1.93.134 at `/usr/bin/brave-browser`; launch, navigation, PDF source navigation and PDF rendering were available.

No main toolkit version bump was required by the current release policy. The mapping catalog was bumped because mapping ownership and semantics changed.

## P1 fixes

### P1-AUD-001 — Prerequisite symmetry

**Root cause:** `buildControlEvaluations()` gated adverse direct/supporting evidence when prerequisites were uncertain, but successful and contextual evidence could still be elevated.

**Implementation:**

- Added a deterministic prerequisite outcome classification: `none`, `all_met`, `uncertain` and `not_met`.
- Applied the classification before all relationship/outcome evidence-state logic.
- `uncertain` now preserves the candidate mapping and technical observation but produces `manual_review_required`.
- `not_met` now preserves the candidate mapping and observation with `mapping_prerequisite_not_met`; it does not produce adverse, supporting, contextual or partial control evidence.
- A negative tested-origin participation observation is now `not_met`, not manual confirmation.

**Files changed:** `lib/security-finding-model.js`, `lib/security-mapping-registry.js`.

**Tests added/updated:** full direct/supporting/contextual × positive/adverse × met/unknown/manual-confirmation/not-met matrix; all required PCI two-prerequisite combinations; existing Phase 1 expectations.

### P1-AUD-002 — Independent ePrivacy ownership and applicability

**Root cause:** canonical Article 5(3) evidence was owned by `gdpr` and inherited GDPR applicability and report labels.

**Implementation:**

- Added internal framework identity `eprivacy` with display label `ePrivacy Directive`.
- Canonical ePrivacy controls project only into the ePrivacy framework result.
- ePrivacy applicability is normalized independently. With no explicit operator input it remains `unknown`/`requires_scope_confirmation`, even if GDPR is marked applicable or not applicable.
- Selecting GDPR still includes an internal ePrivacy projection for compatibility with the existing privacy workflow; this does not create a new operator-facing selection requirement or assert applicability.
- Historical `GDPR-EPRIVACY-ART-5(3)` and GDPR-owned canonical records resolve to ePrivacy in presentation without rewriting stored report data.

**Files changed:** `lib/security-mapping-registry.js`, `lib/security-scanner.js`, `lib/security-report-html.js`, `lib/security-report-manager.js`, `public/app.js`.

**Tests added/updated:** independent applicability, framework isolation, legacy ID/owner rendering, browser projection and JSON/HTML/XLSX/CSV format consistency.

### P1-AUD-003 — ePrivacy relationship and amended provenance

**Root cause:** a bounded pre-consent network observation was mapped directly to Article 5(3), while neither terminal storage/access, the legal consent requirement nor an exception was determined. The catalog cited only the original 2002 source/version.

**Implementation:**

- Changed the canonical relationship from `direct` to `supporting`.
- Kept network requests, cookie snapshots, storage snapshots and interface observations as distinct available evidence items.
- Added an explicit limitation that the observation does not determine storage/access, whether consent was legally required, or whether a strictly-necessary exception applies.
- Updated provenance to `Directive 2002/58/EC as amended by Directive 2009/136/EC`, Article 5(3), using the official EUR-Lex consolidated source.
- No observation produces a legal violation, control satisfaction or compliance conclusion.

**Files changed:** `lib/security-mapping-registry.js`, `lib/security-scanner.js`.

**Tests added/updated:** network-only, network plus cookie/storage, interface present/absent, unknown consent state, unresolved exception, GDPR-not-applicable/ePrivacy-unresolved, legacy ID, and conservative invariant assertions.

### P1-AUD-004 — Finding provenance

**Root cause:** finding normalization could reconstruct generic evidence instead of using structured check evidence and could produce blank URLs or non-resolving composite artifact IDs.

**Implementation:**

- Structured `check.evidenceItems` are now the primary normalization source; legacy evidence/details/summary remain fallbacks.
- New findings preserve stable evidence IDs, evidence items, artifact references, source URLs, methods, time, confidence, evidence type/strength and limitations where available.
- Multiple sources are represented as `evidenceItems`, `artifactRefs` and `sourceUrls`; new scalar compatibility fields contain the primary value only.
- Removed synthetic `artifactA+artifactB` IDs from new normalized findings.
- Added report-save provenance validation: captured artifact references must resolve to the evidence manifest, structured evidence IDs must be stable/unique, and known technical evidence must have a source URL. Operator/manual evidence remains artifact-optional.

**Files changed:** `lib/security-finding-model.js`, `lib/security-scanner.js`, `lib/security-report-manager.js`.

**Tests added/updated:** structured-source preference, multi-reference shape, composite rejection, manifest resolution, URL fallback and public-report secret exclusion.

### P1-AUD-005 — Payment source dimensions

**Root cause:** payment statements could use the tested origin/homepage as their source even when the observation came from a checkout route, iframe, redirect, script or runtime request.

**Implementation:**

- Payment evidence now keeps `testedOrigin`, `sourceUrl`, `destinationUrl`, `providerHost` and `observationKind` separately.
- The most precise actual observation page is selected as `sourceUrl`; the tested origin remains separate scope context.
- Redirect, iframe, form action, provider script and provider request destinations retain their own destination/provider fields.
- `cardDataHandling` remains `not_determined`.

**Files changed:** `lib/security-scanner.js`.

**Tests added/updated:** homepage wording, checkout route, redirect, iframe, hosted fields, merchant form, provider script and third-party provider request.

### P1-AUD-006 — Local-law candidate safety

**Root cause:** broad technical checks could dynamically map to whole UAE, Saudi and Egyptian instruments without a provision-level rationale or source/version provenance.

**Implementation:**

- Removed all dynamic built-in local control candidates that lacked a defensible provision-level mapping.
- Preserved jurisdiction scope signals, conservative `requires_scope_confirmation`, official instrument metadata, and `manual_legal_mapping_required`/provision-level review wording.
- No article or provision number was invented.
- Unsupported and blank jurisdictions produce no fabricated control mapping.

Built-in jurisdiction result:

| Jurisdiction | Instrument metadata retained | Automated provision/control mapping |
|---|---|---|
| UAE | Federal Decree-Law No. 45 of 2021, official source and date | Omitted pending provision-level legal mapping |
| Saudi Arabia | PDPL issued by Royal Decree M/19 as amended, official source and date | Omitted pending provision-level legal mapping |
| Egypt | Law 151/2020 and Executive Regulations 816/2025, official regulator source and dates | Omitted pending provision-level legal mapping |
| Unsupported / blank | No invented instrument | None |

**Files changed:** `lib/security-finding-model.js`, `lib/security-scanner.js`.

**Tests added/updated:** UAE, Saudi Arabia, Egypt, unsupported jurisdiction and no jurisdiction; official-source/version metadata, conservative applicability and zero fabricated controls.

### P1-AUD-007 — Integrity wording

**Root cause:** the workspace inferred “Verified” from hash-shaped values and signature metadata without recomputing artifact or report-manifest bytes in that view.

**Implementation:** chose the audit's wording-only option because the workspace receives safe report metadata, not all restricted bytes or trusted verification material.

- Replaced verification claims with `SHA-256 recorded`, `Manifest hash metadata`, `Signature metadata present`/`HMAC signature recorded`, and `Not verified in this view`.
- Integrity and authenticity remain separate and both are explicitly unverified in this view.
- No cryptographic subsystem was added.

**Files changed:** `lib/security-report-manager.js`, `public/app.js`.

**Tests added/updated:** valid/missing/malformed hash metadata, tampered-artifact marker, valid/missing signature metadata, unsigned manifest and tampered-signed-manifest marker.

## Mapping catalog changes

Catalog: `2026.08.25.2` → `2026.08.26.1`.

Static registry count: 62 → 62. Distinct controls: 19 → 19. Registry framework identities: 5 → 6 because ePrivacy is no longer counted as GDPR.

| Audit finding | Old semantic mapping | New semantic mapping | Reason | Regression |
|---|---|---|---|---|
| P1-AUD-002/003 | `consent-behavior` → framework `gdpr` → `EPRIVACY-DIR-2002-58-ART-5(3)`, `direct`, GDPR/ePrivacy coupled prerequisite, original-Directive version/citation | `consent-behavior` → framework `eprivacy` → same canonical control, `supporting`, independent ePrivacy prerequisite, amended version/consolidated official citation | Separate legal-instrument ownership and keep evidential strength within the observed data | `test/phase2-p1-reliability.test.js`; browser, PDF and cross-format suites |
| P1-AUD-006 | Relevant check × selected UAE/Saudi/Egypt broad instrument control ID, contextual and uncited | No automated local control candidate; official instrument metadata plus manual provision mapping required | Whole-instrument candidates were not provision-backed | local jurisdiction matrix in `test/phase2-p1-reliability.test.js` |

Legacy aliases retained:

- `GDPR-EPRIVACY-ART-5(3)` → canonical ePrivacy ownership at render/resolution time.
- `consent-behavior:gdpr:EPRIVACY-DIR-2002-58-ART-5(3)` → canonical new mapping record alias.

## Compatibility

- Historical reports are read without rewriting their stored mapping IDs, framework owners, relationships, evidence values or catalog versions.
- Legacy ePrivacy controls and GDPR-owned ePrivacy mappings display as ePrivacy Directive in current HTML/PDF/workspace presentation.
- New reports use canonical `eprivacy` ownership and the supporting relationship.
- Existing scalar `evidence`, `artifactId` and source fields remain readable. New reports additionally provide structured arrays.
- `summary.csv` remains a byte-identical compatibility alias of `findings.csv`.
- Toolkit version `1.7.1` and existing `/api/security/*` report contracts remain unchanged.

## Validation

### Automated tests

- Final `npm test`: 91 passed, 0 failed, 0 skipped in 59,383 ms.
- New Phase 2.2 regression file: 13 passed, 0 failed, 0 skipped in 112 ms (last isolated run).
- Final `npm run validate:phase1`: 78 passed, 0 failed, 0 skipped; all eight validation categories passed.
- `git diff --check`: passed.

### Three-tool smoke

- Compliance Mapping: passed; controlled scan completed with 13 findings; HTML, JSON, findings CSV, XLSX, PDF, report manifest and local-only evidence access were present.
- Lighthouse Reporter: passed one controlled Lighthouse accessibility analysis; valid run, report generated, accessibility fixture score 85.
- Asset & Page-Weight Analyzer: passed one controlled page analysis; metrics, HTML report and XLSX generated.
- No Lighthouse Reporter or Asset & Page-Weight Analyzer production source file was changed.

### Cross-format, PDF and redaction

- Canonical ePrivacy identity, control and supporting relationship were asserted across JSON, HTML, XLSX and findings CSV; legacy PDF/HTML mapping ownership resolves to ePrivacy without mutating input history.
- PDF suite: 3 passed; A4 browser output remained searchable/selectable, machine strings survived extraction, mixed mapping pagination remained dense, and no sparse internal-page regression was detected.
- Redaction fixtures confirmed that authorization/session/cookie/password/local-storage/authenticated-body/session-state values do not enter JSON, HTML, CSV, XLSX or PDF public projections.
- Evidence-manifest and report-manifest hash records remained internally consistent in saved report tests. The workspace still correctly says those records were not verified in that view.

### Browser and performance

- Browser: Brave Browser 151.1.93.134; launch, navigation, PDF source navigation and rendering available.
- Phase 1 validation category timings: core 887 ms; security core 318 ms; cross-format 726 ms; packaging 456 ms; browser integration 48,071 ms; browser regressions 13,969 ms; PDF 9,154 ms; embedded three-tool smoke 20,775 ms.
- Explicit controlled Compliance smoke: scan 2,307 ms; report generation 1,919 ms; HTML 27 ms; PDF 1,460 ms; PDF 490,456 bytes.
- Explicit controlled Lighthouse smoke: 11,964 ms.
- Explicit controlled Asset smoke: 2,168 ms.
- No meaningful regression was demonstrated against the Phase 1 baseline; browser/PDF timing remains environment-sensitive.

## Remaining work

The following audit findings were intentionally not implemented:

- P2-AUD-008 — Flat control state hides incomplete coverage.
- P2-AUD-009 — Confidence, collection state, method and strength overlap.
- P2-AUD-010 — Failed collection and bounded negative observations are not uniformly separated.
- P2-AUD-011 — Cookie fingerprints can merge same-name cookies across paths.
- P2-AUD-012 — Mapping density/fan-out can visually amplify narrow evidence.
- P2-AUD-013 — SOC 2 mappings lack exact edition/source provenance.
- P2-AUD-014 — Technical evidence statements lack a uniformly complete traceability tuple.
- P3-AUD-015 — Relationship legend.
- P3-AUD-016 — Mapping-governance decision metadata.
- P3-AUD-017 — Framework/applicability label precision.
- P3-AUD-018 — Universal `manualReviewRequired` has low information value.

Phase 2 is therefore not represented as complete. This document closes only P1-AUD-001 through P1-AUD-007.
