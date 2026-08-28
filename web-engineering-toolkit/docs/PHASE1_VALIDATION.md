# Phase 1 validation matrix

Phase 1 validates the current Compliance Mapping implementation without changing its product boundary. Every controlled assessment must remain a `compliance_pre_assessment` with `complianceConclusion = not_determined`, `coverage = partial`, and `controlSatisfaction = not_determined`.

## Test taxonomy

| Category | Command | Browser required | Purpose |
| --- | --- | --- | --- |
| Core deterministic | `npm run test:core` | No | Mapping, prerequisites, findings, policy/locale/payment parsing, review lifecycle, UI structure, and conservative invariants |
| Cross-format | `npm run test:cross-format` | No | Canonical counts, public projection redaction, XLSX/CSV/HTML/JSON/metadata, manifest hashes, and HMAC scope |
| Browser integration | `npm run test:browser` | Yes | Controlled runtime scans, authenticated collection, encrypted session reuse, and full report generation |
| PDF rendering | `npm run test:pdf` | Yes | Chromium pagination, searchable text, exact machine strings, and page utilization |
| Packaging | `npm run test:package` | No | Deterministic ZIP content and runtime-data exclusions |
| Real three-tool smoke | `npm run smoke:all` | Yes | Compliance Mapping, Lighthouse Reporter, and Asset Analyzer against the local fixture |

`npm run validate:phase1` orchestrates these categories and emits a human-readable status followed by `PHASE1_VALIDATION_JSON`. Browser launch, fixture navigation, file navigation, and PDF rendering are classified independently. Administrative navigation restrictions are reported as skips; unexpected application errors remain failures.

## Controlled scenarios

| Scenario | Fixture/test | Expected behavior | Status | Known limitation |
| --- | --- | --- | --- | --- |
| Corporate/basic | `/secure-corporate` | Strong header configuration, legal link, no payment/PHI/tracking signals | Automated | Local fixture transport is HTTP; certificate/TLS health remains covered separately by deterministic scanner tests |
| Weak security | `/weak-security` | Missing/weak browser controls, weak cookies, permissive CORS, mixed-content reference | Automated | Bounded public page only |
| Generic payment wording | `/payment-generic` | Terminology only; architecture unknown; origin participation unknown; card handling not determined | Automated | Same-origin script provenance is retained but is not a card-data conclusion |
| Redirect payment | `/payment-redirect` | Redirect architecture observed | Automated | Provider endpoint is not exercised |
| Hosted iframe | `/payment-iframe` | Iframe architecture observed | Automated | Static/runtime presence does not prove provider configuration |
| Hosted fields | `/payment-hosted-fields` | Hosted-fields architecture observed | Automated | Does not determine SAQ type |
| Merchant form | `/payment-merchant-form` | Merchant-form architecture observed; card handling remains not determined | Automated | No card data is submitted |
| Healthcare marketing | `/healthcare` | HIPAA not indicated | Automated | Public wording only |
| PHI/BAA portal signal | `/healthcare-phi` | HIPAA potentially applicable, never automatically applicable | Automated | Legal/entity scope requires review |
| Policy quality variants | `/privacy/{complete,minimal,template,placeholder,empty,rendered-only}` | Distinct conservative quality states | Automated | Heuristics do not determine legal validity |
| Fragment privacy signal | `/privacy-fragment` | Signal retained; fragment is not a discovered document | Automated | Dynamically revealed substantive content needs bounded runtime evidence |
| Consent variants | `/consent-none`, `/consent-banner`, `/consent-policy-claim` | Policy claims and runtime observations remain separate | Automated | Button matching is heuristic and is not consent-validity testing |
| Content locales | `/en`, `/ar`, localized privacy routes, `/html-lang-only` | Real routes become content locales; browser/HTML signals remain language signals | Automated | Discovery is crawl-bounded |
| Authenticated roles | `/login/{normal,privileged,admin,custom}` and `/app/{role}` | Encrypted role-scoped session collection without RBAC conclusions | Automated | Live reuse regression exercises the normal role; other role routes remain deterministic fixture variants |
| Collection failures | deterministic failed/not-assessed matrix and capability classifier | Failed, not assessed, not observed, and manual review remain distinct | Automated | Network timeouts vary by host and are not used as a required live fixture |

## Demonstrated defects fixed in Phase 1

1. Canonical ePrivacy Article 5(3) evaluations were omitted from the GDPR framework projection because projection used a `GDPR-` string prefix. Projection now uses the mapping registry's framework resolver, including the canonical `EPRIVACY-` prefix. The mapping catalog moved from `2026.08.25.1` to `2026.08.25.2`.
2. Public report projection removed top-level cookie values but retained nested consent-scenario cookie/storage values and the Playwright session-state object. Public browser evidence now drops reusable session state and retains only redacted cookie metadata and storage key/locale/consent metadata; restricted evidence remains in the access-controlled evidence archive.

## Environment interpretation

- `browser unavailable`: no supported executable was detected.
- `browser launch failed`: an executable was found but Playwright could not launch it.
- `browser navigation restricted`: Chromium reported an administrative navigation block.
- `PDF rendering unavailable`: the print source could not be loaded or Chromium did not return a valid PDF.

These environment classifications never change production scanner security behavior and never turn a failed collection into a successful observation.

## Recorded validation baseline — 2026-08-25

- Pre-change suite: 60 tests passed, 0 failed, 0 skipped.
- Phase 1 suite: 78 tests passed, 0 failed, 0 skipped.
- Browser: Brave detected and launched; fixture navigation, file-source navigation, and PDF rendering were available.
- Real controlled smoke: Compliance Mapping, Lighthouse Reporter, and Asset & Page-Weight Analyzer passed independently.
- Package: two consecutive archives had identical bytes and SHA-256; required source/test/script files were present and runtime data was absent.
