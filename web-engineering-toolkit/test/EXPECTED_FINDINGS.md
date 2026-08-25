# Security Lab Expected Findings

Run the fixture with a small Node launcher that calls `startSecurityLab()` or through the automated tests. The lab is intentionally local and non-production.

| Route | Condition | Expected result |
| --- | --- | --- |
| `/http-only` | HTTP transport | `HTTPS_TRANSPORT_MISSING`; TLS tests are not applicable/not tested |
| `/weak-csp` | Wildcard script source, unsafe inline/eval, missing object/base/frame restrictions | `CSP_POLICY_WEAK` with confirmed header evidence |
| `/weak-cookies` | Session cookie lacks Secure; analytics cookie lacks Secure/SameSite | atomic cookie findings with the session Secure issue medium and tracking issues low |
| `/analytics-before-consent` | Google Tag Manager loads in initial markup before any interaction | third-party tracking observed; consent-order conclusion requires browser interaction logic and manual review |
| `/analytics-no-consent` | Google Tag Manager loads in a fresh context and no consent interface is present | tracking without a consent interface is reported as an observed privacy finding |
| `/permissive-cors` | ACAO wildcard for a synthetic external origin | `CORS_POLICY_PERMISSIVE`; resource sensitivity remains a stated limitation |
| `/mixed-content` | HTTP image and form action in HTTPS-intended content | `MIXED_CONTENT_DETECTED` when served through a TLS fixture; insecure references remain visible on HTTP |
| `/login` | Public login form | password transport fails over HTTP; suitable login-flow target for authenticated scanner tests |
| `/dashboard` | Authenticated-style navigation | crawler should discover account/admin routes after session support is enabled |
| `/admin` | Requires `role=admin` cookie | 403 without admin role and 200 with it; expected role-comparison candidate, not automatically confirmed IDOR |
| `/healthcare` | Generic healthcare industry marketing | healthcare context observed, HIPAA applicability not indicated |
| `/healthcare-phi` | Explicit PHI/BAA language | HIPAA applicability indicated; all safeguard conclusions still require manual review |
| `/payment` | Outsourced payment-processing language | PCI scope confirmation required; outsourcing is not treated as out of scope |
| `/payment-card` | Explicit PCI/cardholder environment language | PCI applicability indicated; cardholder environment scope remains manual |
| `/privacy/complete` | Rights, retention, consent, and DPA language | corresponding public evidence observed |
| `/privacy/minimal` | Generic privacy statement only | privacy page observed; rights/retention/processor evidence missing |
| `/privacy/absent` | No privacy language | privacy evidence not observed |
| `/fake-compliance` | Unsupported certification/compliance claims | mentions observed only; report must require signed/current proof and never repeat them as verified status |

## TLS fixtures

Invalid and expiring certificates require a dedicated HTTPS endpoint. The expected results are:

- Self-signed or hostname-mismatched certificate: `TLS_CERTIFICATE_VALIDATION_ISSUE`, high severity, confirmed validation error, with the fallback request explicitly identified.
- Certificate expiring within 30 days: `TLS_CERTIFICATE_VALIDATION_ISSUE`, medium severity, exact expiry evidence.
- Legacy TLS 1.0/1.1 endpoint: `TLS_CONFIGURATION_WEAK`, high severity.
- Modern TLS endpoint: TLS protocol test supported by automated evidence; cipher-suite enumeration, OCSP, CAA, and forward secrecy remain separate tests.

These endpoints should be provisioned with purpose-built certificates in an isolated container; credentials and private keys must not be committed to the toolkit repository.
