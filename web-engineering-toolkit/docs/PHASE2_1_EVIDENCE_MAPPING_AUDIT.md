# Phase 2.1 — Core Evidence & Mapping Reliability Audit

Audit date: 2026-08-26

Repository state: `b3125d6` (`develop`), clean before audit

Toolkit version: `1.7.1`

Mapping catalog: `2026.08.25.2`

## 1. Executive Summary

Overall result: the current Compliance Mapping model is structurally sound and consistently preserves its conservative product boundary, but seven demonstrated P1 reliability gaps should be corrected before the evidence/mapping model is treated as fully defensible. None of the gaps changed the current legal or control conclusions: every exercised assessment remained `compliance_pre_assessment`, `complianceConclusion = not_determined`, `controlSatisfaction = not_determined`, and `coverage = partial`.

| Measure | Current result |
| --- | ---: |
| Static registry mappings | 62 |
| Static controls | 19 |
| Built-in runtime local-law instrument IDs | 4 |
| Product framework families | 6 |
| Frameworks with static mappings | 5 |
| Direct / supporting / contextual | 5 / 33 / 24 |
| P0 findings | 0 |
| P1 findings | 7 |
| P2 findings | 7 |
| P3 findings | 4 |

The highest risks are: prerequisite uncertainty is not applied to successful evidence; ePrivacy is scoped and presented as GDPR even though it is a distinct directive; the ePrivacy direct mapping is stronger than the observed network evidence and cites the unamended source; several normalized findings point to blank, synthetic, or wrong provenance; payment evidence can report the target URL instead of the page that supplied the evidence; dynamic local-law mappings have no citations and fan out generic checks to whole instruments; and the workspace calls hash/signature records “Verified” without performing verification there.

No production mapping changes were made in Phase 2.1.

## 2. Current Architecture

The current path is:

```text
HTTP/TLS/DNS/crawl/browser/authenticated/ZAP collection
  -> restricted evidenceArchive
  -> evidence/manifest.json with SHA-256 metadata
  -> safe public projection in security-report-manager
  -> scanner checks (outcome + collection state + confidence)
  -> normalized findings/fingerprints
  -> candidate mappings from the versioned registry
  -> prerequisiteResults
  -> one aggregate state per control plus automatedEvidence
  -> frameworkResults and statement projections
  -> HTML / JSON / PDF / XLSX / findings CSV
```

Transition audit:

| Transition | Input and transformation | Retained | Principal uncertainty / loss |
| --- | --- | --- | --- |
| Collection -> restricted artifact | Raw response, TLS probe, crawl pages, browser resources/cookies/storage/screenshots, authenticated pages, ZAP JSON | Artifact ID, type, bytes, SHA-256, access flag, scan metadata | Collection failures are unevenly represented; some checks default to `observed` or `confirmed` despite incomplete collection. |
| Restricted -> safe projection | `publicSummary()` and `stripBrowserSecrets()` remove browser/session secrets | Redacted cookie metadata, resource URLs, storage keys, consent metadata | Boundary is strong; however normalized finding provenance may already point to a generic/wrong artifact. |
| Artifact -> check | Scanner-specific parsing and heuristics | Check ID, URL when supplied, outcome, test state, confidence, method, limitations | Method, strength and confidence vocabularies overlap; several checks omit `affectedUrl`. |
| Check -> finding | Only warning/fail checks (plus atomic cookie instances) become findings | Fingerprint, source check, evidence, mappings, limitations | `check.evidenceItems` are not propagated into ordinary normalized findings; fallback artifact and URL can be wrong. |
| Finding/check -> mapping | Registry lookup by check/framework plus dynamic local templates | Mapping/catalog/framework versions, relationship, prerequisites, citation, limitations | Framework selection and applicability gates are separate, but ePrivacy is owned by the GDPR key. |
| Mapping -> prerequisite | `evaluateMappingPrerequisites()` produces `met`, `not_met`, `unknown`, or `requires_manual_confirmation` | Per-mapping results | Adverse direct/supporting evidence is downgraded when uncertain; successful supporting evidence is not. |
| Evidence -> control | Per-evidence state classification and fixed precedence | All automatedEvidence rows, linked findings, merged mapping provenance | Flat primary state hides mixed failure/coverage qualifiers. |
| Control -> framework | Prefix resolver, registry framework, evidence-key filter | Framework-isolated evidence and control arrays | ePrivacy intentionally resolves to the GDPR bucket, which preserves projection but obscures legal ownership. |
| Framework -> reports | One canonical public summary drives formats | Invariants, versions, findings, checks, controls, manifest metadata | Some concise labels overstate scope, negative evidence, or integrity verification. |

Primary code: `lib/security-scanner.js` (`scanWebsiteSecurity`, `frameworkEvidenceSummary`, `analyzePaymentFlowEvidence`), `lib/website-crawler.js` (`extractComplianceEvidence`), `lib/security-finding-model.js` (`buildFindings`, `buildControlEvaluations`), `lib/security-mapping-registry.js`, `lib/security-report-manager.js`, `lib/security-report-html.js`, `lib/security-pdf.js`, and `public/app.js`.

## 3. Mapping Registry Inventory

### Inventory statistics

| Dimension | Result |
| --- | --- |
| Mapping count | 62 static entries |
| By framework | GDPR bucket 17; ISO/IEC 27001 14; SOC 2 14; PCI DSS 10; HIPAA 7; Local 0 static |
| By relationship | supporting 33; contextual 24; direct 5; scope_signal 0; manual_only 0 |
| With / without prerequisites | 34 / 28 |
| Unique registry checks | 17 |
| Unique static controls | 19 |
| Duplicate IDs | 0 |
| Duplicate exact entries | 0 |
| Missing static citations | 0 |
| Missing static framework versions | 0 |
| Invalid static prefixes | 0 |
| Orphan registry check IDs | 0 demonstrated; all 17 are emitted by current scanner paths |
| Governance | all 62 `internal_review_required`; 0 approved; 47 have only the global limitation |

Local-law mappings are generated at runtime, not stored in `SECURITY_MAPPING_REGISTRY`. Thirteen relevant checks may map contextually to one UAE instrument ID, one Saudi instrument ID, or two Egyptian instrument IDs. Semantic merging makes one mapping record per local instrument/control in a control evaluation while retaining source check IDs. Unsupported jurisdictions produce no invented mapping. The generated records use `frameworkVersion = jurisdiction-specific` and an empty citation.

### Mapping limitations

Fifteen entries add a useful mapping-specific caveat; 47 repeat only the global “qualified review / no control satisfaction” limitation. The global limitation is correct, but its per-entry repetition makes it harder to distinguish a control-specific boundary. Phase 2.2 should keep global, framework-level and mapping-specific limitations as separate presentation/governance layers, without deleting the conservative text.

All 62 entries carry: “The mapping identifies evidence relevant for qualified review; it does not determine control satisfaction.” The complete additional limitation inventory is:

| Mapping group | Entries | Additional limitation |
| --- | ---: | --- |
| `https`, `http-to-https`, `certificate`, `tls` -> SOC2-CC6.7 | 4 | Public transport observation cannot establish entity-level design or operating effectiveness. |
| `hsts` -> SOC2-CC6.7 | 1 | HSTS alone cannot establish entity-level logical-access/transmission control. |
| `hsts` -> PCI 4.2.1 | 1 | Missing HSTS is transport hardening evidence, not proof the requirement is unsatisfied. |
| `csp`, `clickjacking`, `nosniff` -> ISO A.8.28 | 3 | Isolated response headers cannot establish organization-wide secure-coding practice. |
| The same three checks -> SOC2-CC7.1 | 3 | Isolated response headers cannot establish SOC 2 design/operating effectiveness. |
| The same three checks -> PCI 6.2.4 | 3 | Isolated response headers cannot establish software-engineering practice effectiveness. |

### Semantic mapping duplication

The requested semantic key (`framework + version + control + relationship + normalized prerequisites`) intentionally collapses distinct source checks. Twelve static semantic groups contain more than one registry entry. The largest are GDPR Article 32 supporting (8 source checks), SOC 2 CC6.7 supporting (5), HIPAA transmission supporting (5), PCI DSS 4.2.1 supporting (5), ISO/IEC 27001 A.8.24 supporting (4), and the three-check contextual groups for ISO A.8.28, SOC CC7.1, and PCI 6.2.4. This is valid multi-source provenance, not duplicate IDs. `mergeSemanticMappings()` correctly retains `sourceCheckIds` and `sourceMappingIds`. The remaining risk is presentation density and flat aggregation, not structural duplication.

### Mapping density

| Control | Mapping count | Assessment |
| --- | ---: | --- |
| GDPR-ART-32 | 10 | Unusually dense. Checks cover transport, cookies, mixed content, password transport and an access-control candidate. Mostly defensible supporting/contextual evidence, but the volume can imply strength and the positive prerequisite bug affects it. |
| ISO27001:2022-A.8.24 | 6 | Meaningful transport/cryptography cluster; direct and supporting evidence must remain visibly partial. |
| SOC2-CC6.7 | 6 | Coherent transmission cluster but organization-level effectiveness cannot be inferred. |
| HIPAA-164.312(e)(1) | 6 | Coherent only after regulated-entity/ePHI scope is established. |
| PCI-DSS-v4.0.1-4.2.1 | 6 | Coherent only when the tested origin participates in the payment flow. |

### Check fan-out

Seven checks (`https`, `http-to-https`, `certificate`, `tls`, `hsts`, `mixed-content`, `access-control-candidates`) each fan out to five frameworks. The first six form a defensible transport cluster with framework-specific caveats; `access-control-candidates` is correctly contextual everywhere. CSP/clickjacking/nosniff fan out to three frameworks and remain contextual. Consent behavior fans out to three controls inside one GDPR-oriented bucket and needs the ePrivacy separation described in P1-AUD-002/003.

### Complete static mapping table

Every static registry entry appears exactly once below.

| Mapping ID | Check | Framework / version | Control | Relationship | Prerequisites | Evidence types | Citation | Audit status | Priority | Notes |
| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |
| https:iso-27001:ISO27001:2022-A.8.24 | https | iso-27001 2022 | ISO27001:2022-A.8.24 | direct | None | direct_observation<br>supporting_technical | https://www.iso.org/standard/27001 | Accept with caveat | P2 | Direct technical condition only; control satisfaction remains not determined. |
| https:soc-2:SOC2-CC6.7 | https | soc-2 Trust Services Criteria | SOC2-CC6.7 | supporting | None | supporting_technical | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Relationship is defensible; cite the exact 2017 TSC with revised 2022 points of focus. |
| https:gdpr:GDPR-ART-32 | https | gdpr 2016/679 | GDPR-ART-32 | supporting | gdpr_scope_confirmed_or_potential | supporting_technical | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Positive prerequisite gating and Article 32 density need Phase 2.2 coverage. |
| https:hipaa:HIPAA-164.312(e)(1) | https | hipaa 45 CFR Part 164 | HIPAA-164.312(e)(1) | supporting | hipaa_scope_confirmed_or_potential | supporting_technical | https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html | Accept with caveat | P2 | Cannot establish ePHI or regulated-entity scope. |
| https:pci-dss:PCI-DSS-v4.0.1-4.2.1 | https | pci-dss 4.0.1 | PCI-DSS-v4.0.1-4.2.1 | supporting | pci_scope_confirmed_or_potential<br>tested_origin_participates_in_payment_flow | supporting_technical | https://www.pcisecuritystandards.org/document_library/ | Accept with caveat | P2 | Both scope and tested-origin prerequisites are necessary. |
| http-to-https:iso-27001:ISO27001:2022-A.8.24 | http-to-https | iso-27001 2022 | ISO27001:2022-A.8.24 | supporting | None | direct_observation<br>supporting_technical | https://www.iso.org/standard/27001 | Accept | — | Proportionate candidate relationship. |
| http-to-https:soc-2:SOC2-CC6.7 | http-to-https | soc-2 Trust Services Criteria | SOC2-CC6.7 | supporting | None | supporting_technical | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Exact TSC edition/source needed. |
| http-to-https:gdpr:GDPR-ART-32 | http-to-https | gdpr 2016/679 | GDPR-ART-32 | supporting | gdpr_scope_confirmed_or_potential | supporting_technical | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Positive prerequisite gating applies. |
| http-to-https:hipaa:HIPAA-164.312(e)(1) | http-to-https | hipaa 45 CFR Part 164 | HIPAA-164.312(e)(1) | supporting | hipaa_scope_confirmed_or_potential | supporting_technical | https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html | Accept with caveat | P2 | Scope must be established. |
| http-to-https:pci-dss:PCI-DSS-v4.0.1-4.2.1 | http-to-https | pci-dss 4.0.1 | PCI-DSS-v4.0.1-4.2.1 | supporting | pci_scope_confirmed_or_potential<br>tested_origin_participates_in_payment_flow | supporting_technical | https://www.pcisecuritystandards.org/document_library/ | Accept with caveat | P2 | Covers only a technical slice. |
| certificate:iso-27001:ISO27001:2022-A.8.24 | certificate | iso-27001 2022 | ISO27001:2022-A.8.24 | supporting | None | direct_observation<br>supporting_technical | https://www.iso.org/standard/27001 | Accept | — | Proportionate candidate relationship. |
| certificate:soc-2:SOC2-CC6.7 | certificate | soc-2 Trust Services Criteria | SOC2-CC6.7 | supporting | None | supporting_technical | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Exact TSC edition/source needed. |
| certificate:gdpr:GDPR-ART-32 | certificate | gdpr 2016/679 | GDPR-ART-32 | supporting | gdpr_scope_confirmed_or_potential | supporting_technical | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Positive prerequisite gating applies. |
| certificate:hipaa:HIPAA-164.312(e)(1) | certificate | hipaa 45 CFR Part 164 | HIPAA-164.312(e)(1) | supporting | hipaa_scope_confirmed_or_potential | supporting_technical | https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html | Accept with caveat | P2 | Scope must be established. |
| certificate:pci-dss:PCI-DSS-v4.0.1-4.2.1 | certificate | pci-dss 4.0.1 | PCI-DSS-v4.0.1-4.2.1 | supporting | pci_scope_confirmed_or_potential<br>tested_origin_participates_in_payment_flow | supporting_technical | https://www.pcisecuritystandards.org/document_library/ | Accept with caveat | P2 | Exact certificate observation is relevant once scope is met. |
| tls:iso-27001:ISO27001:2022-A.8.24 | tls | iso-27001 2022 | ISO27001:2022-A.8.24 | supporting | None | direct_observation<br>supporting_technical | https://www.iso.org/standard/27001 | Accept | — | Proportionate candidate relationship. |
| tls:soc-2:SOC2-CC6.7 | tls | soc-2 Trust Services Criteria | SOC2-CC6.7 | supporting | None | supporting_technical | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Exact TSC edition/source needed. |
| tls:gdpr:GDPR-ART-32 | tls | gdpr 2016/679 | GDPR-ART-32 | supporting | gdpr_scope_confirmed_or_potential | supporting_technical | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Positive prerequisite gating applies. |
| tls:hipaa:HIPAA-164.312(e)(1) | tls | hipaa 45 CFR Part 164 | HIPAA-164.312(e)(1) | supporting | hipaa_scope_confirmed_or_potential | supporting_technical | https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html | Accept with caveat | P2 | Scope must be established. |
| tls:pci-dss:PCI-DSS-v4.0.1-4.2.1 | tls | pci-dss 4.0.1 | PCI-DSS-v4.0.1-4.2.1 | supporting | pci_scope_confirmed_or_potential<br>tested_origin_participates_in_payment_flow | supporting_technical | https://www.pcisecuritystandards.org/document_library/ | Accept with caveat | P2 | Exact protocol observation is relevant once scope is met. |
| hsts:iso-27001:ISO27001:2022-A.8.24 | hsts | iso-27001 2022 | ISO27001:2022-A.8.24 | supporting | None | supporting_technical | https://www.iso.org/standard/27001 | Accept | — | Proportionate transport-hardening evidence. |
| hsts:soc-2:SOC2-CC6.7 | hsts | soc-2 Trust Services Criteria | SOC2-CC6.7 | contextual | None | contextual | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Contextual is correctly conservative; exact source needed. |
| hsts:gdpr:GDPR-ART-32 | hsts | gdpr 2016/679 | GDPR-ART-32 | contextual | gdpr_scope_confirmed_or_potential | contextual | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Context only after scope review. |
| hsts:hipaa:HIPAA-164.312(e)(1) | hsts | hipaa 45 CFR Part 164 | HIPAA-164.312(e)(1) | contextual | hipaa_scope_confirmed_or_potential | contextual | https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html | Accept with caveat | P2 | Context only after scope review. |
| hsts:pci-dss:PCI-DSS-v4.0.1-4.2.1 | hsts | pci-dss 4.0.1 | PCI-DSS-v4.0.1-4.2.1 | contextual | pci_scope_confirmed_or_potential<br>tested_origin_participates_in_payment_flow | contextual<br>supporting_technical | https://www.pcisecuritystandards.org/document_library/ | Accept with caveat | P2 | Explicit limitation correctly prevents requirement-level inference. |
| csp:iso-27001:ISO27001:2022-A.8.28 | csp | iso-27001 2022 | ISO27001:2022-A.8.28 | contextual | None | contextual<br>supporting_technical | https://www.iso.org/standard/27001 | Accept | — | Header observation is appropriately contextual to secure coding. |
| csp:soc-2:SOC2-CC7.1 | csp | soc-2 Trust Services Criteria | SOC2-CC7.1 | contextual | None | contextual | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Broad but useful context; exact source needed. |
| csp:pci-dss:PCI-DSS-v4.0.1-6.2.4 | csp | pci-dss 4.0.1 | PCI-DSS-v4.0.1-6.2.4 | contextual | pci_scope_confirmed_or_potential<br>tested_origin_participates_in_payment_flow | contextual<br>supporting_technical | https://www.pcisecuritystandards.org/document_library/ | Accept with caveat | P2 | Does not establish software-engineering practice. |
| clickjacking:iso-27001:ISO27001:2022-A.8.28 | clickjacking | iso-27001 2022 | ISO27001:2022-A.8.28 | contextual | None | contextual<br>supporting_technical | https://www.iso.org/standard/27001 | Accept | — | Appropriately contextual. |
| clickjacking:soc-2:SOC2-CC7.1 | clickjacking | soc-2 Trust Services Criteria | SOC2-CC7.1 | contextual | None | contextual | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Broad but useful context; exact source needed. |
| clickjacking:pci-dss:PCI-DSS-v4.0.1-6.2.4 | clickjacking | pci-dss 4.0.1 | PCI-DSS-v4.0.1-6.2.4 | contextual | pci_scope_confirmed_or_potential<br>tested_origin_participates_in_payment_flow | contextual<br>supporting_technical | https://www.pcisecuritystandards.org/document_library/ | Accept with caveat | P2 | Does not establish software-engineering practice. |
| nosniff:iso-27001:ISO27001:2022-A.8.28 | nosniff | iso-27001 2022 | ISO27001:2022-A.8.28 | contextual | None | contextual<br>supporting_technical | https://www.iso.org/standard/27001 | Accept | — | Appropriately contextual. |
| nosniff:soc-2:SOC2-CC7.1 | nosniff | soc-2 Trust Services Criteria | SOC2-CC7.1 | contextual | None | contextual | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Broad but useful context; exact source needed. |
| nosniff:pci-dss:PCI-DSS-v4.0.1-6.2.4 | nosniff | pci-dss 4.0.1 | PCI-DSS-v4.0.1-6.2.4 | contextual | pci_scope_confirmed_or_potential<br>tested_origin_participates_in_payment_flow | contextual<br>supporting_technical | https://www.pcisecuritystandards.org/document_library/ | Accept with caveat | P2 | Does not establish software-engineering practice. |
| cookies:iso-27001:ISO27001:2022-A.8.5 | cookies | iso-27001 2022 | ISO27001:2022-A.8.5 | supporting | None | supporting_technical<br>runtime_observation | https://www.iso.org/standard/27001 | Accept with caveat | P2 | Cookie attributes are a narrow access/authentication signal. |
| cookies:soc-2:SOC2-CC6.1 | cookies | soc-2 Trust Services Criteria | SOC2-CC6.1 | contextual | None | contextual<br>runtime_observation | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Contextual is proportionate; exact source needed. |
| cookies:gdpr:GDPR-ART-32 | cookies | gdpr 2016/679 | GDPR-ART-32 | supporting | gdpr_scope_confirmed_or_potential | supporting_technical<br>runtime_observation | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Positive prerequisite gating and density apply. |
| runtime-cookies:iso-27001:ISO27001:2022-A.8.5 | runtime-cookies | iso-27001 2022 | ISO27001:2022-A.8.5 | supporting | None | supporting_technical<br>runtime_observation | https://www.iso.org/standard/27001 | Accept with caveat | P2 | Runtime source adds provenance; cookie fingerprint needs refinement. |
| runtime-cookies:soc-2:SOC2-CC6.1 | runtime-cookies | soc-2 Trust Services Criteria | SOC2-CC6.1 | contextual | None | contextual<br>runtime_observation | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Contextual is proportionate; exact source needed. |
| runtime-cookies:gdpr:GDPR-ART-32 | runtime-cookies | gdpr 2016/679 | GDPR-ART-32 | supporting | gdpr_scope_confirmed_or_potential | supporting_technical<br>runtime_observation | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Positive prerequisite gating and density apply. |
| cors:iso-27001:ISO27001:2022-A.8.20 | cors | iso-27001 2022 | ISO27001:2022-A.8.20 | supporting | None | supporting_technical | https://www.iso.org/standard/27001 | Accept with caveat | P2 | Narrow externally observable network-control evidence. |
| cors:soc-2:SOC2-CC6.6 | cors | soc-2 Trust Services Criteria | SOC2-CC6.6 | contextual | None | contextual | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Correctly avoids design/effectiveness inference. |
| mixed-content:iso-27001:ISO27001:2022-A.8.24 | mixed-content | iso-27001 2022 | ISO27001:2022-A.8.24 | direct | None | direct_observation<br>runtime_observation | https://www.iso.org/standard/27001 | Accept with caveat | P2 | Direct only to the observed page condition, never the whole control. |
| mixed-content:soc-2:SOC2-CC6.7 | mixed-content | soc-2 Trust Services Criteria | SOC2-CC6.7 | supporting | None | supporting_technical<br>runtime_observation | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Defensible narrow support; exact source needed. |
| mixed-content:gdpr:GDPR-ART-32 | mixed-content | gdpr 2016/679 | GDPR-ART-32 | supporting | gdpr_scope_confirmed_or_potential | supporting_technical<br>runtime_observation | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Positive prerequisite gating applies. |
| mixed-content:hipaa:HIPAA-164.312(e)(1) | mixed-content | hipaa 45 CFR Part 164 | HIPAA-164.312(e)(1) | supporting | hipaa_scope_confirmed_or_potential | supporting_technical<br>runtime_observation | https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html | Accept with caveat | P2 | Cannot establish ePHI or regulated-entity scope. |
| mixed-content:pci-dss:PCI-DSS-v4.0.1-4.2.1 | mixed-content | pci-dss 4.0.1 | PCI-DSS-v4.0.1-4.2.1 | supporting | pci_scope_confirmed_or_potential<br>tested_origin_participates_in_payment_flow | supporting_technical<br>runtime_observation | https://www.pcisecuritystandards.org/document_library/ | Accept with caveat | P2 | Both prerequisites are necessary. |
| password-transport:iso-27001:ISO27001:2022-A.8.5 | password-transport | iso-27001 2022 | ISO27001:2022-A.8.5 | direct | None | direct_observation<br>runtime_observation | https://www.iso.org/standard/27001 | Accept with caveat | P2 | Strong page-level observation, not proof of identity-management design. |
| password-transport:soc-2:SOC2-CC6.1 | password-transport | soc-2 Trust Services Criteria | SOC2-CC6.1 | supporting | None | supporting_technical<br>runtime_observation | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Narrow support; exact source needed. |
| password-transport:gdpr:GDPR-ART-32 | password-transport | gdpr 2016/679 | GDPR-ART-32 | supporting | gdpr_scope_confirmed_or_potential | supporting_technical<br>runtime_observation | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Positive prerequisite gating applies. |
| consent-behavior:gdpr:GDPR-ART-5 | consent-behavior | gdpr 2016/679 | GDPR-ART-5 | supporting | gdpr_scope_confirmed_or_potential | runtime_observation | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Runtime behavior is relevant but cannot establish legal principle compliance. |
| consent-behavior:gdpr:GDPR-ART-6 | consent-behavior | gdpr 2016/679 | GDPR-ART-6 | contextual | gdpr_scope_confirmed_or_potential | runtime_observation | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Cannot establish lawful basis. |
| consent-behavior:gdpr:EPRIVACY-DIR-2002-58-ART-5(3) | consent-behavior | gdpr Directive 2002/58/EC | EPRIVACY-DIR-2002-58-ART-5(3) | direct | gdpr_or_eprivacy_scope_confirmed_or_potential | direct_observation<br>runtime_observation | https://eur-lex.europa.eu/eli/dir/2002/58/oj | Likely change | P1 | Framework ownership, scope coupling, direct strength, and amended citation require correction. |
| privacy-runtime-consistency:gdpr:GDPR-ART-5 | privacy-runtime-consistency | gdpr 2016/679 | GDPR-ART-5 | direct | gdpr_scope_confirmed_or_potential | policy_claim<br>runtime_observation | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Review in 2.2 | P1 | Bounded heuristic and composite evidence make direct relationship interpretation-sensitive. |
| privacy-runtime-consistency:gdpr:GDPR-ART-12 | privacy-runtime-consistency | gdpr 2016/679 | GDPR-ART-12 | supporting | gdpr_scope_confirmed_or_potential | policy_claim<br>runtime_observation | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Claim/runtime comparison supports review; does not prove transparency. |
| privacy-runtime-verification:gdpr:GDPR-ART-5 | privacy-runtime-verification | gdpr 2016/679 | GDPR-ART-5 | contextual | gdpr_scope_confirmed_or_potential | policy_claim<br>runtime_observation | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept | — | Correctly contextual when verification is incomplete. |
| privacy-runtime-verification:gdpr:GDPR-ART-12 | privacy-runtime-verification | gdpr 2016/679 | GDPR-ART-12 | contextual | gdpr_scope_confirmed_or_potential | policy_claim<br>runtime_observation | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept | — | Correctly contextual when verification is incomplete. |
| access-control-candidates:iso-27001:ISO27001:2022-A.5.15 | access-control-candidates | iso-27001 2022 | ISO27001:2022-A.5.15 | contextual | None | contextual<br>runtime_observation | https://www.iso.org/standard/27001 | Accept | — | Route differences are candidates only; no RBAC assertion. |
| access-control-candidates:soc-2:SOC2-CC6.1 | access-control-candidates | soc-2 Trust Services Criteria | SOC2-CC6.1 | contextual | None | contextual<br>runtime_observation | https://www.aicpa-cima.com/resources/landing/system-and-organization-controls-soc-suite-of-services | Citation review | P2 | Correctly candidate-only; exact source needed. |
| access-control-candidates:gdpr:GDPR-ART-32 | access-control-candidates | gdpr 2016/679 | GDPR-ART-32 | contextual | gdpr_scope_confirmed_or_potential | contextual<br>runtime_observation | https://eur-lex.europa.eu/eli/reg/2016/679/oj | Accept with caveat | P2 | Authentication does not verify authorization. |
| access-control-candidates:hipaa:HIPAA-164.312(a)(1) | access-control-candidates | hipaa 45 CFR Part 164 | HIPAA-164.312(a)(1) | contextual | hipaa_scope_confirmed_or_potential | contextual<br>runtime_observation | https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html | Accept with caveat | P2 | Scope and manual authorization review remain required. |
| access-control-candidates:pci-dss:PCI-DSS-v4.0.1-7.2.1 | access-control-candidates | pci-dss 4.0.1 | PCI-DSS-v4.0.1-7.2.1 | contextual | pci_scope_confirmed_or_potential | contextual<br>runtime_observation | https://www.pcisecuritystandards.org/document_library/ | Accept with caveat | P2 | Correctly avoids RBAC/least-privilege claims. |

## 4. Relationship Audit

| Relationship | Current use | Audit result |
| --- | ---: | --- |
| `direct` | 5 | Appropriate only as a close relationship between an automated observation and a narrow technical aspect of a requirement. HTTPS and mixed content are appropriate; password transport is probably appropriate; privacy/runtime consistency requires review; ePrivacy consent behavior is too strong. It never changes `controlSatisfaction`. |
| `supporting` | 33 | Generally defensible partial technical evidence. It is most vulnerable to the successful-observation prerequisite defect and to dense presentation implying cumulative control strength. |
| `contextual` | 24 | Generally conservative and useful. CSP/clickjacking/nosniff and authenticated route candidates do not claim control implementation. Some broad control families add density but no demonstrated wrong-control defect. |
| `scope_signal` | 0 registry entries | Scope evidence exists outside the mapping registry in applicability/payment/health signals. It does not enter control mappings as this relationship. That separation is desirable. |
| `manual_only` | 0 registry entries | Manual review is represented by evaluation state and lifecycle workflow, not registry mappings. No missing automated mapping was demonstrated solely from its absence. |

Relationship affects evidence state, not scanner severity. `direct` adverse evidence may select `adverse_technical_evidence_observed`; a passing direct mapping is still only `partial_technical_evidence_observed`. No relationship can produce a pass/fail control result.

## 5. Direct Mapping Review

| Check | Framework / control | Technical observation | Why direct may be justified | What it does **not** establish | Prerequisite | Audit assessment |
| --- | --- | --- | --- | --- | --- | --- |
| `https` | ISO/IEC 27001 A.8.24 | The tested URL did or did not use HTTPS. | Close, deterministic transport-cryptography condition. | Organization-wide cryptographic policy, implementation, or control satisfaction. | None | **Appropriate**; retain a page-level limitation and add relationship legend. |
| `mixed-content` | ISO/IEC 27001 A.8.24 | HTTP subresources were observed in a browser/static page context. | Directly observes a transport downgrade on the tested page. | Absence across the estate or full cryptographic-control implementation. | None | **Appropriate**; artifact attribution needs repair. |
| `password-transport` | ISO/IEC 27001 A.8.5 | A password input was observed on an insecure page. | Strong, narrow authentication-transport observation. | Identity lifecycle, access-control design, least privilege, or all authentication routes. | None | **Probably appropriate**; wording must remain page-bounded. |
| `consent-behavior` | ePrivacy Directive Article 5(3) | Known tracking requests were observed before a consent choice in the tested scenario. | Runtime behavior is closely relevant to terminal-equipment consent review. | Whether storage/access occurred, whether an exception applies, legal consent validity, or Directive applicability. | GDPR-or-ePrivacy scope | **Too strong** on current evidence and scope model; P1-AUD-002/003. |
| `privacy-runtime-consistency` | GDPR Article 5 | A public policy claim and bounded runtime hosts appear inconsistent. | A demonstrated claim/runtime mismatch is more than generic context. | Exhaustive processing, identity/purpose of every host, accuracy of the entire notice, or GDPR compliance. | GDPR scope | **Requires review**; special mismatch state is conservative, but relationship and traceability need a regression fixture. |

## 6. Prerequisite Audit

| Prerequisite | Static mappings | Question represented | Inputs / states | Met / unknown / not met behavior |
| --- | ---: | --- | --- | --- |
| `gdpr_scope_confirmed_or_potential` | 16 | Is GDPR applicability confirmed or sufficiently potential to retain a candidate mapping? | Operator applicability plus public scope signals: `applicable`, `potentially_applicable`, `requires_scope_confirmation`, `not_indicated`, `not_applicable`. | Confirmed/potential meets; uncertain yields manual confirmation; explicit negative does not meet. Adverse evidence is gated, but positive evidence is not (defect). |
| `gdpr_or_eprivacy_scope_confirmed_or_potential` | 1 | Is GDPR or ePrivacy scope confirmed/potential? | Currently derived from the GDPR applicability record rather than an independent ePrivacy record. | This cannot represent ePrivacy-only relevance and creates P1-AUD-002. |
| `hipaa_scope_confirmed_or_potential` | 7 | Is covered-entity/business-associate/ePHI scope confirmed or plausibly signaled? | Operator input and weighted signals; generic healthcare content remains weaker than PHI, portal, BAA, or health-record evidence. | Same three-way result; positive evaluation bypasses uncertain gating. |
| `pci_scope_confirmed_or_potential` | 10 | Is PCI scope confirmed or plausibly signaled? | Operator input and payment-flow evidence. | Same three-way result; must not substitute for tested-origin participation. |
| `tested_origin_participates_in_payment_flow` | 9 | Did the tested origin participate in the observed payment flow? | `true`, `false`, or unknown from payment-flow analysis/operator context. | `true` meets; unknown is `unknown`; `false` currently requires manual confirmation rather than becoming `not_met`. Positive evidence currently bypasses every result. |
| `local_jurisdiction_confirmed` | dynamic only | Did the operator select a supported jurisdiction? | UAE, Saudi Arabia, Egypt, unsupported, or absent. | A supported selection generates contextual candidates; it must not mean the law applies. Unsupported/absent generates none. |

`evaluateMappingPrerequisites()` correctly distinguishes `met`, `requires_manual_confirmation`, and `not_met`. `buildControlEvaluations()` applies that distinction to adverse observations, but its positive supporting/contextual/direct-pass branches do not require `prerequisiteResult.met`. A controlled probe produced `supporting_technical_evidence_observed` for GDPR with `requires_scope_confirmation`, and for PCI when payment participation was unknown. Therefore uncertain prerequisites can be treated as met for positive evidence, though not for adverse evidence.

When a prerequisite is uncertain, the defensible result for every relationship is manual/scope confirmation plus retained candidate evidence, not adverse or positive control evidence. Explicit `not_met` should suppress the control evidence while preserving the technical finding independently.

## 7. Applicability Audit

- **Selection versus applicability:** `normalizeFrameworkApplicability()` and report invariants keep selected framework, operator assertion, signal-derived state, and legal conclusion separate. Selection alone does not set `applicable` or a compliance conclusion.
- **GDPR/ePrivacy:** GDPR has operator/signal states, but ePrivacy has no independent applicability record. `frameworkForControl()` and the mapping registry route ePrivacy through `gdpr`; the HTML mapping card therefore labels it GDPR. This preserves projection visibility but conflates ownership and can suppress an ePrivacy-only case.
- **HIPAA:** Generic healthcare marketing contributes weaker terms; stronger signals include PHI/ePHI language, patient portals, covered entity/business associate, BAA and health-record handling. False positives are constrained by `requires_scope_confirmation`, while false negatives remain possible for sparse public sites. No public signal proves regulated status.
- **PCI DSS:** `paymentSignalsObserved`, `paymentFlowObserved`, `testedOriginParticipatesInPaymentFlow`, `cardDataHandling`, and `pciScopeConclusion` are distinct. Provider/keyword detection alone does not assert merchant handling. Hosted/redirect/iframe/script/form observations improve context; the positive prerequisite defect remains the main elevation risk.
- **Local regulations:** Jurisdiction selection is operator scope context, not applicability. Supported selections create contextual candidates only. Unsupported jurisdictions receive no generic/invented mapping, which is correct. Dynamic candidates lack exact articles/citations/version provenance.

| Jurisdiction | Current instrument/control IDs | Current version/date | Citation | Relationship / prerequisite |
| --- | --- | --- | --- | --- |
| United Arab Emirates | `LOCAL-UAE-PDPL-FDL45-2021` | `jurisdiction-specific`; ID carries 2021 | Empty | contextual / `local_jurisdiction_confirmed` |
| Saudi Arabia | `LOCAL-SA-PDPL` | `jurisdiction-specific`; no date in ID | Empty | contextual / `local_jurisdiction_confirmed` |
| Egypt | `LOCAL-EG-PDPL-LAW151-2020`; `LOCAL-EG-PDPL-ER816-2025` | `jurisdiction-specific`; IDs carry 2020/2025 | Empty | contextual / `local_jurisdiction_confirmed` |

## 8. Evidence Model Audit

### Registry evidence types

| Evidence type | Current meaning/source | Strength and limitations | Valid relationships / invalid use |
| --- | --- | --- | --- |
| `direct_observation` | An HTTP/browser-derived condition closely observed. | Strong collection assertion, but says little about requirement breadth. | Direct or supporting; invalid as automatic control satisfaction. |
| `supporting_technical` | Technical evidence relevant to part of a control. | Evidential strength/relationship, not collection method. | Supporting/contextual; should not imply severity or applicability. |
| `runtime_observation` | Browser/runtime collection method. | Method dimension; can be weak or strong depending on scenario completeness. | Any justified relationship; invalid as a strength synonym. |
| `contextual` | Reviewer context with a broad relationship. | Low requirement specificity, often useful for secure-coding/access candidates. | Contextual; invalid as adverse control evidence. |
| `policy_claim` | Public document statement. | Claim only; implementation unverified unless compared with runtime evidence. | Contextual/supporting composite; invalid alone as implementation proof. |

The larger system also uses `manual_evidence`, `scope_signal`, `public_page_observation`, artifact MIME/type labels, and high/medium/low confidence. These occupy different dimensions but are not consistently modeled in separate fields.

### Dimension separation

| Dimension | Intended semantics | Current collision |
| --- | --- | --- |
| Collection method | HTTP response, TLS socket, browser runtime, crawl page, authenticated route, operator input, ZAP passive | Sometimes encoded in `evidenceTypes`; composite strings such as `browser-network+crawl-pages` are also used as artifact references. |
| Evidence strength/relationship | direct, supporting, contextual, scope signal, manual | Split between registry `relationship` and `evidenceTypes`; evidence vault labels every artifact `direct_observation`. |
| Confidence | Degree of confidence in the observation | Scanner uses `confirmed/observed/inferred/not_tested`; crawler uses `high/medium/low`; operator uses `asserted_not_verified`; ZAP high becomes `confirmed`. |
| Collection state | completed/confirmed, observed, inferred, not tested, failed to test | Scanner `testState` is also used to derive confidence. `confirmed` can mean collection completed rather than high epistemic confidence. |
| Technical outcome | pass, warning, fail, manual, info | Usually separate, but some failure/absence paths choose an outcome/state pair inconsistently. |
| Severity | Impact of a technical finding | Kept independent in core aggregation; no demonstrated rule makes direct high severity or high confidence. |
| Compliance relevance | Candidate relationship to a framework control | Mapping density may imply importance visually, but never changes technical severity or legal conclusion. |

Policy/runtime comparison distinguishes a claim, an unverified claim, and `potential_claim_runtime_mismatch`; it does not convert policy text alone into implementation evidence. Authenticated collection produces `access-control-candidates` and contextual mappings only; role labels do not claim RBAC, authorization correctness, or least privilege.

Negative evidence is mixed: missing headers on a completed response are actual bounded technical absences; missing policy/consent/payment/provider evidence is only bounded public absence or not assessed; collection failure is not absence. Some paths encode the latter distinctions correctly, but redirect, third-party-script and report wording paths need P2-AUD-010.

### Collection failure modes

| Failure | Current behavior | Audit result |
| --- | --- | --- |
| Initial HTTP request | An unrecoverable initial request aborts the scan; HTTPS retry/fallback errors are retained. | Does not synthesize stronger mapped evidence. |
| Browser unavailable/crashed | `not_tested` or `failed_to_test`; partial navigation may be `observed`. | Defensible; mixed partial/failed coverage needs a qualifier. |
| Crawl/policy extraction failure | Crawl error and zero/partial pages are retained; policy evidence becomes bounded/incomplete. | No demonstrated adverse mapping from failure itself. |
| Authentication failure | Authentication/pages use `failed_to_test`; access candidates are not asserted from an empty successful set. | Defensible. |
| Consent scenario failure | Scenario is `failed_to_test` with an explicit limitation. | Defensible, but downstream “not observed” wording must stay bounded. |
| ZAP unavailable/incomplete | Disabled is `not_tested`; incomplete is `observed` only if findings exist, otherwise `failed_to_test`. | Does not directly create control mappings. |
| TLS detail failure | HTTPS without captured details is a warning/manual verification path; an HTTP final page is a real adverse transport condition. | Defensible distinction; flat aggregation can hide failed detail coverage. |

## 9. Control Evaluation Audit

### Current precedence

`buildControlEvaluations()` selects the first available state in this order:

1. `adverse_technical_evidence_observed`
2. `potential_claim_runtime_mismatch`
3. `claim_not_verified`
4. `supporting_technical_evidence_observed`
5. `contextual_evidence_observed`
6. `policy_claim_observed`
7. `partial_technical_evidence_observed`
8. `manual_review_required`
9. `not_assessed`
10. `failed_to_test`

If all automated evidence is `not_tested`/`failed_to_test`, the incomplete state overrides the ordinary selection. The evaluation retains evidence arrays but exposes one flat primary state, so lower-precedence incompleteness is not visible as a qualifier. `manualReviewRequired` is always true; this protects conclusions but carries little discriminating information.

### Mixed-evidence examples

| Evidence mix | Current primary state | Audit assessment |
| --- | --- | --- |
| Direct adverse + supporting positive + failed test | adverse technical | Correct primary risk, but failed coverage is hidden outside evidence rows. |
| Supporting positive + contextual adverse | supporting technical | Consistent with relationship rules; contextual adverse does not become a control failure, but a qualifier would improve transparency. |
| One direct adverse + three failed tests | adverse technical | Defensible primary state; coverage qualifier is needed. |
| Policy claim + runtime mismatch + contextual evidence | potential claim/runtime mismatch | Defensible and appropriately qualified. |
| All evidence not tested/failed | failed to test | Correct; no conversion to “no adverse observation.” |
| Direct passing observation only | partial technical | Correctly avoids control pass/satisfaction. |

### Control-level summary

| Framework / control | Source checks | Relationships | Prerequisites | Current aggregate behavior | Audit concern |
| --- | --- | --- | --- | --- | --- |
| GDPR / EPRIVACY Art. 5(3) | consent-behavior | direct | GDPR-or-ePrivacy scope | Direct adverse or partial positive | Scope ownership and evidence strength are unreliable. |
| GDPR / ART-5 | consent-behavior; privacy-runtime-consistency; verification | supporting, direct, contextual | GDPR scope | Mismatch precedence over claims/context | Direct heuristic needs review. |
| GDPR / ART-6 | consent-behavior | contextual | GDPR scope | Context only | Cannot establish lawful basis; appropriate. |
| GDPR / ART-12 | consistency; verification | supporting, contextual | GDPR scope | Claim/runtime states | Appropriate if provenance repaired. |
| GDPR / ART-32 | 10 transport/cookie/access checks | supporting, contextual | GDPR scope | Dense merged evidence | Positive prerequisite bypass and density. |
| HIPAA / 164.312(a)(1) | access-control-candidates | contextual | HIPAA scope | Candidate context | Appropriate; no RBAC claim. |
| HIPAA / 164.312(e)(1) | six transport checks | supporting, contextual | HIPAA scope | Dense transmission evidence | Scope must gate positive evidence. |
| ISO / A.5.15 | access-control-candidates | contextual | None | Candidate context | Appropriate. |
| ISO / A.8.5 | cookies, runtime-cookies, password transport | supporting, direct | None | Direct adverse outranks support | Page/cookie evidence is partial. |
| ISO / A.8.20 | CORS | supporting | None | Supporting/partial | Narrow relationship is defensible. |
| ISO / A.8.24 | six transport checks | direct, supporting | None | Direct adverse outranks support | Dense but coherent; expose incomplete coverage. |
| ISO / A.8.28 | CSP, clickjacking, nosniff | contextual | None | Context only | Appropriate broad secure-coding context. |
| PCI / 4.2.1 | six transport checks | supporting, contextual | PCI scope + payment participation | Dense transmission evidence | Both prerequisites must gate positive evidence. |
| PCI / 6.2.4 | CSP, clickjacking, nosniff | contextual | PCI scope + payment participation | Context only | Does not prove coding practice. |
| PCI / 7.2.1 | access candidates | contextual | PCI scope | Context only | Appropriate candidate relationship. |
| SOC 2 / CC6.1 | cookies, runtime cookies, password, access candidates | supporting, contextual | None | Supporting/context mix | Cannot establish operating effectiveness. |
| SOC 2 / CC6.6 | CORS | contextual | None | Context only | Appropriate. |
| SOC 2 / CC6.7 | six transport checks | supporting, contextual | None | Dense transmission evidence | Exact TSC provenance needed. |
| SOC 2 / CC7.1 | CSP, clickjacking, nosniff | contextual | None | Context only | Appropriate broad context. |

## 10. Traceability Audit

- **Evidence references:** Mapping merge retains all source mapping/check IDs. Ordinary finding normalization, however, reconstructs evidence from `check.evidence`/details and does not consistently consume `check.evidenceItems`.
- **Source URLs:** Several scanner checks omit an affected URL; normalization can therefore emit blank URLs. Payment statements prefer `testedOrigin` over the actual crawl/runtime page. The target URL is not an acceptable fallback when a more precise source exists.
- **Artifact references:** Some normalized mappings point to a plausible but wrong artifact (`policy-document-quality` or access candidates to `initial-http-response`; static mixed content to `browser-network`) or a non-manifest composite (`browser-network+crawl-pages`). Abstract/operator evidence need not have a raw artifact; HTTP, browser, crawl, authenticated, and TLS observations should resolve to a manifest entry when such an artifact was captured.
- **Statement traceability:** Evidence statements carry IDs and evidence references, but some technical statements do not retain source URL, timestamp, collection method and resolvable artifact together.
- **Finding provenance:** Cookie normalization retains multiple evidence items, but the fingerprint omits cookie path/domain and can collapse distinct same-name cookies. Aggregate joined references are not resolvable canonical references.
- **Redaction:** Restricted raw session/cookie/browser data is removed from public projection while safe derived conditions remain. No demonstrated mapping requires exposed secrets. Public manifests retain hashes/roles without raw restricted evidence.
- **Artifact deduplication:** One canonical binary can have several roles/aliases and sensitivity is conservatively combined. This preserves provenance in current tests; the defects are in later normalization references, not binary deduplication.

## 11. Framework Isolation Audit

Framework projection filters evidence, statements and control evaluations by selected framework keys, and cross-format tests show no demonstrated GDPR/HIPAA/PCI/ISO/SOC leakage. Passive ZAP findings do not carry `controlMappings`, so they do not bypass registry governance. The ePrivacy control is intentionally included in privacy/GDPR projections without relying on a `GDPR-` control prefix, and legacy aliases remain readable.

The remaining isolation issue is semantic rather than raw-data leakage: ePrivacy is owned/labeled/scoped as `gdpr`, which can both imply it is GDPR and omit it when GDPR is marked not applicable. Local-law projection is isolated to a supported operator jurisdiction. Payment and HIPAA scope evidence remain framework-specific.

## 12. Citation and Version Audit

| Classification | Result |
| --- | --- |
| Verified | GDPR Regulation 2016/679 official EUR-Lex source; ISO/IEC 27001:2022 official publisher/version; HIPAA 45 CFR Part 164 identifiers; PCI DSS 4.0.1 official library/version; UAE Decree-Law 45/2021, Saudi PDPL, and Egypt Law 151/2020 / Executive Regulation 816/2025 instrument existence. |
| Needs verification/refinement | All 14 SOC 2 mappings use a generic suite landing page and version “Trust Services Criteria” rather than the exact official 2017 TSC with revised 2022 points of focus. PCI/ISO mappings cite publisher/catalog pages rather than control-specific public anchors; exact identifier relevance should be re-reviewed under access/copyright limits. |
| Incorrect/outdated | The ePrivacy mapping cites the original 2002 act while its consent-oriented interpretation depends on the Article 5(3) amendment made by Directive 2009/136/EC. The consolidated/amending official source should be the version provenance. |
| Missing | Runtime-generated local mappings have empty citations, generic `jurisdiction-specific` versions and whole-instrument IDs rather than cited provisions. |

No framework text was reproduced. Verification used identifiers, high-level descriptions and official publisher/regulator sources only.

Primary verification anchors: [ISO/IEC 27001:2022](https://www.iso.org/standard/27001), [AICPA 2017 TSC with revised 2022 points of focus](https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022), [PCI SSC document library](https://www.pcisecuritystandards.org/document_library/), [HHS Security Rule guidance](https://www.hhs.gov/hipaa/for-professionals/security/laws-regulations/index.html), [GDPR official journal](https://eur-lex.europa.eu/eli/reg/2016/679/oj), [Directive 2009/136/EC amendment](https://eur-lex.europa.eu/legal-content/EN/AUTO/?uri=CELEX%3A32009L0136), [UAE Decree-Law 45/2021](https://www.uaelegislation.gov.ae/en/legislations/1972/download), [Saudi PDPL official publication](https://sdaia.gov.sa/en/SDAIA/about/Documents/Personal%20Data%20English%20V2-23April2023-%20Reviewed-.pdf), and [Egypt PDPC](https://pdpc.gov.eg/).

### Framework-level limitation coverage

| Framework | Boundary that must remain explicit | Audit result |
| --- | --- | --- |
| ISO/IEC 27001 | Public technical evidence cannot establish organization-wide ISMS implementation. | Present only through global/mapping-specific caveats; add one framework-level statement. |
| SOC 2 | Public evidence cannot establish control design or operating effectiveness. | Strong mapping-specific coverage, especially transport/header mappings. |
| HIPAA | Public evidence cannot establish covered-entity/business-associate status or ePHI scope. | Applicability narrative covers it; make it a framework-level report caveat. |
| PCI DSS | Payment signals cannot establish CDE scope, applicability or validation method. | Prerequisite/limitation model is conservative, subject to P1-AUD-001. |
| GDPR/ePrivacy | Public/runtime evidence cannot establish legal applicability, lawful basis, valid consent or full compliance. | Global report disclaimer is strong; ePrivacy-specific ownership/exception caveat is missing. |
| Local law | Jurisdiction input does not establish applicability or legal interpretation. | Dynamic mapping limitation says this; source/provision provenance is missing. |

## 13. Reporting Terminology Audit

The workspace and HTML/PDF/XLSX/CSV/JSON report models preserve `compliance_pre_assessment`, `not_determined`, and `partial`, and prominently state that evidence is not an audit opinion or compliance determination. Positive technical evidence is generally phrased as partial/supporting rather than “control passed.”

Semantic wording risks remain:

- the workspace integrity panel says “Artifacts verified,” “Manifest integrity Verified,” and “Signature Verified” after shape/algorithm checks rather than recomputation;
- concise applicability labels can show “Applicable” without always carrying “operator asserted/not verified” alongside them;
- “Not observed” can describe a failed/not-tested or bounded collection path;
- mapping cards show ePrivacy under “GDPR”;
- `Direct`, `Supporting`, and `Contextual` lack a concise legend explaining that none means control failure/satisfaction;
- the product label uses “ISO 27001” rather than the publisher-accurate “ISO/IEC 27001.”

These are terminology corrections, not a UI redesign.

## 14. Audit Findings

### P1-AUD-001 — Successful mapped evidence bypasses uncertain prerequisites

- **Priority / audit confidence / category:** P1 / High / prerequisite weakness, scope risk, overstatement risk.
- **Affected files/symbols:** `lib/security-finding-model.js` — `buildControlEvaluations()`, `evaluateMappingPrerequisites()`.
- **Current behavior:** adverse evidence requires `prerequisiteResult.met`; pass/supporting/contextual branches can select positive evidence states even when a prerequisite is `unknown` or `requires_manual_confirmation`.
- **Why it matters:** a report can show supporting control evidence before GDPR/HIPAA/PCI scope or payment-origin participation is established.
- **Evidence:** controlled calls returned GDPR Article 32 supporting evidence with GDPR `requires_scope_confirmation`, and PCI 4.2.1 supporting evidence with tested-origin participation unknown. Existing `test/phase1-core.test.js` covers prerequisite matrices/adverse handling but not this positive path.
- **Recommended Phase 2.2 action:** apply prerequisite results consistently to every relationship/outcome while retaining the independent technical observation and a candidate/manual-scope state.
- **Regression test required:** pass and fail cases for every relationship with `met`, `requires_manual_confirmation`, `unknown`, and `not_met`, including the two-prerequisite PCI case.

### P1-AUD-002 — ePrivacy ownership and scope are coupled to GDPR

- **Priority / audit confidence / category:** P1 / High / framework isolation, scope risk, report wording.
- **Affected files/symbols:** `lib/security-mapping-registry.js` — ePrivacy mapping and `frameworkForControl()`; `lib/security-finding-model.js` — ePrivacy prerequisite; `public/app.js` — mapping framework label; framework projection helpers.
- **Current behavior:** the ePrivacy mapping has `framework = gdpr`; its prerequisite reads the GDPR applicability record; report cards label it GDPR. Marking GDPR not applicable can omit an independently relevant ePrivacy candidate.
- **Why it matters:** ePrivacy is a separate directive, not a GDPR article; ownership conflation can overstate or understate scope.
- **Evidence:** direct function probes and source trace; `test/phase1-browser-integration.test.js` verifies ePrivacy projection visibility but not independent applicability/labeling.
- **Recommended Phase 2.2 action:** preserve privacy grouping/aliases while representing ePrivacy ownership and applicability independently.
- **Regression test required:** ePrivacy relevant/GDPR not applicable, GDPR relevant/ePrivacy unknown, correct label, and legacy projection compatibility.

### P1-AUD-003 — ePrivacy direct mapping is stronger than the observation and cites the pre-amendment act

- **Priority / audit confidence / category:** P1 / High / mapping correctness, citation/version issue, overstatement risk.
- **Affected files/symbols:** `lib/security-mapping-registry.js` — `consent-behavior:...EPRIVACY...`; `lib/security-scanner.js` — consent scenario/tracking observation.
- **Current behavior:** known tracking requests before choice map `direct` to Article 5(3), but the observation does not necessarily prove terminal-equipment storage/access or rule out a strictly necessary exception. Citation points to the original 2002 act, while consent wording derives from the 2009 amendment.
- **Why it matters:** this is the highest-interpretation-risk direct mapping and has incomplete legal/version provenance.
- **Evidence:** registry/source trace and official EUR-Lex amendment; `test/compliance-reliability.test.js` checks citation presence, not version correctness or exception-sensitive strength.
- **Recommended Phase 2.2 action:** re-evaluate relationship/evidence predicate and cite the official amended/consolidated version; do not encode a legal conclusion.
- **Regression test required:** tracking request versus actual storage/access, strictly-necessary candidate, unknown consent scenario, and citation/version assertion.

### P1-AUD-004 — Normalized findings can lose or misidentify source/artifact provenance

- **Priority / audit confidence / category:** P1 / High / evidence provenance, status semantics.
- **Affected files/symbols:** `lib/security-finding-model.js` — `buildFindings()`, artifact-reference derivation; scanner checks `mixed-content`, `policy-document-quality`, `access-control-candidates`, privacy/runtime consistency.
- **Current behavior:** ordinary normalization does not consistently consume `check.evidenceItems`; several checks map to blank source URLs, wrong generic artifacts, or non-manifest composite IDs such as `browser-network+crawl-pages`.
- **Why it matters:** a reviewer cannot reliably resolve a statement to the page/artifact that supports it.
- **Evidence:** controlled normalization probes reproduced blank HTTPS/redirect/password URLs and mismatched/composite artifact references. Existing `test/phase1-report-consistency.test.js` validates manifests/redaction, not per-finding resolution.
- **Recommended Phase 2.2 action:** carry structured evidence items through normalization and require resolvable references for captured HTTP/browser/crawl/auth/TLS evidence.
- **Regression test required:** reference-resolution test for each affected check plus an explicit exception for abstract/operator evidence.

### P1-AUD-005 — Payment evidence can attribute a statement to the target instead of the observed page

- **Priority / audit confidence / category:** P1 / High / evidence provenance, scope risk.
- **Affected files/symbols:** `lib/security-scanner.js` — `analyzePaymentFlowEvidence()` evidence statement construction.
- **Current behavior:** statement `sourceUrl` prefers `testedOrigin` over the actual crawl/browser source, so checkout/iframe/provider evidence can be attributed to the homepage.
- **Why it matters:** tested-origin participation and actual observation location are distinct; conflating them weakens PCI scope review.
- **Evidence:** source trace and controlled input with a `/checkout` observation. `test/compliance-reliability.test.js` covers payment distinctions but not exact statement URL provenance.
- **Recommended Phase 2.2 action:** retain both tested origin and actual source URL in separate fields.
- **Regression test required:** homepage target with checkout route, redirect, iframe, hosted fields and third-party provider sources.

### P1-AUD-006 — Dynamic local-law mappings lack provision-level source/version provenance

- **Priority / audit confidence / category:** P1 / High / mapping correctness, citation/version issue, scope risk.
- **Affected files/symbols:** `lib/security-finding-model.js` — `LOCAL_JURISDICTIONS`, `LOCAL_RELEVANT_CHECKS`, `mappingContext()`, `controlMappingsFor()`; `lib/security-mapping-registry.js` — dynamic local mapping generation in `mappingsForCheck()`.
- **Current behavior:** a supported jurisdiction creates whole-instrument contextual mappings for 13 checks with empty citation and `jurisdiction-specific` version. UAE/Saudi yield one instrument ID; Egypt yields two. Unsupported jurisdictions correctly yield none.
- **Why it matters:** a selected country can generate broad law relevance without a traceable exact provision/rationale.
- **Evidence:** dynamic probes for UAE, Saudi Arabia, Egypt and France; current tests cover supported/unsupported behavior but not official citation/provision relevance.
- **Recommended Phase 2.2 action:** retain conservative contextual semantics but require official citation, effective version/date and demonstrated provision-level relationship, or omit the candidate.
- **Regression test required:** one supported fixture per jurisdiction and one unsupported jurisdiction, asserting citation/version/control/rationale and no applicability conclusion.

### P1-AUD-007 — Workspace integrity wording says verified without cryptographic verification

- **Priority / audit confidence / category:** P1 / High / overstatement risk, report wording, evidence safety.
- **Affected files/symbols:** `public/app.js` — evidence-vault integrity status rendering.
- **Current behavior:** SHA-shaped values and an `hmac-sha256` algorithm label produce “Artifacts verified,” “Manifest integrity Verified,” and “Signature Verified”; the UI path does not recompute hashes/signatures.
- **Why it matters:** users can interpret metadata presence as integrity verification.
- **Evidence:** direct code trace. Existing UI/report tests check display and packaging, not tampered-manifest verification.
- **Recommended Phase 2.2 action:** either perform actual verification or use presence/format wording.
- **Regression test required:** valid, tampered, missing and malformed hash/signature manifests.

### P2-AUD-008 — Flat control state hides incomplete coverage

- **Priority / audit confidence / category:** P2 / High / status semantics, understatement risk.
- **Affected files/symbols:** `lib/security-finding-model.js` — `buildControlEvaluations()` precedence.
- **Current behavior:** one primary state is exposed. A direct adverse or supporting positive state outranks failed/not-assessed checks, although individual evidence rows remain.
- **Why it matters:** reviewers may miss that important checks failed to run.
- **Evidence:** mixed-evidence probes documented in Section 9; no coverage-qualifier regression exists.
- **Recommended Phase 2.2 action:** retain primary state and add explicit coverage qualifiers/counts; do not weaken adverse evidence.
- **Regression test required:** the five mixed scenarios in Section 9 plus all-incomplete and all-complete controls.

### P2-AUD-009 — Confidence, collection state, method and strength use overlapping vocabularies

- **Priority / audit confidence / category:** P2 / High / confidence semantics, maintainability.
- **Affected files/symbols:** `lib/security-scanner.js` result construction; `lib/website-crawler.js` evidence; `lib/evidence-vault.js`; ZAP normalization; report serializers.
- **Current behavior:** scanner confidence is derived from `confirmed/observed/inferred/not_tested`; crawler uses high/medium/low; operator evidence uses `asserted_not_verified`; ZAP maps high to confirmed; every vault artifact is labeled direct observation regardless of semantic strength.
- **Why it matters:** consumers cannot reliably compare confidence, and an artifact container can appear stronger than the derived observation.
- **Evidence:** code inventory; tests validate allowed values locally but not cross-source semantics.
- **Recommended Phase 2.2 action:** define separate normalized fields for method, collection state, epistemic confidence and relationship/strength, with compatible aliases.
- **Regression test required:** cross-source normalization matrix for HTTP, browser, crawl, operator, authenticated, ZAP and artifact-only records.

### P2-AUD-010 — Failed collection and bounded negative observations are not uniformly separated

- **Priority / audit confidence / category:** P2 / Medium / status semantics, understatement risk.
- **Affected files/symbols:** `lib/security-scanner.js` — redirect probe, third-party-script and policy/consent checks; report state wording.
- **Current behavior:** a redirect exception can describe probe failure while retaining an observed/info-like state; static-only third-party absence can pass when runtime is unavailable; bounded privacy/consent absence can be represented as not tested; reports may flatten these to “Not observed.”
- **Why it matters:** “not found” can mean actual absence, bounded absence, not assessed or failed detection.
- **Evidence:** source paths and fixture outputs. `test/phase1-core.test.js` covers several failure distinctions but not these combinations.
- **Recommended Phase 2.2 action:** normalize outcome and collection state independently and make negative wording source-bounded.
- **Regression test required:** HTTP/browser/crawl/auth/consent/TLS failure matrix with expected outcome, state and wording.

### P2-AUD-011 — Cookie fingerprint can merge distinct same-name cookies across paths

- **Priority / audit confidence / category:** P2 / High / evidence provenance, mapping correctness.
- **Affected files/symbols:** `lib/security-finding-model.js` — fingerprint construction and cookie merge.
- **Current behavior:** fingerprint uses finding ID, affected URL and cookie name but not cookie path/domain. Same-name cookies on different paths collapse; evidence items survive, while aggregate joined source/artifact references may be synthetic.
- **Why it matters:** technically distinct cookie configurations can be presented as one condition and lose resolvable top-level provenance.
- **Evidence:** controlled two-cookie probe produced one finding with two evidence items. Existing cookie tests cover source merging, not cross-path identity.
- **Recommended Phase 2.2 action:** include stable path/domain identity or explicitly model occurrences beneath an aggregate without synthetic references.
- **Regression test required:** same name/same path dedupe, same name/different path, host-only versus domain, and static/runtime duplicate cases.

### P2-AUD-012 — Mapping density and fan-out can visually amplify narrow evidence

- **Priority / audit confidence / category:** P2 / Medium / overstatement risk, report wording.
- **Affected files/symbols:** `lib/security-mapping-registry.js`; `lib/security-finding-model.js` merge/aggregation; HTML/PDF/XLSX mapping presentation.
- **Current behavior:** a transport check maps to as many as five frameworks, and GDPR Article 32 receives 10 entries. Semantic merge preserves sources, but counts/cards can look like cumulative control strength.
- **Why it matters:** quantity is provenance breadth, not assurance depth.
- **Evidence:** density/fan-out inventory in Section 3; cross-format tests cover dedupe but not interpretation/legend.
- **Recommended Phase 2.2 action:** retain valid mappings but present merged source count as provenance and explain that it does not increase satisfaction/confidence automatically.
- **Regression test required:** dense-control format snapshot ensuring one semantic evaluation, source list retained, and no score/pass language.

### P2-AUD-013 — SOC 2 mappings lack exact edition/source provenance

- **Priority / audit confidence / category:** P2 / High / citation/version issue.
- **Affected files/symbols:** all 14 SOC 2 entries in `lib/security-mapping-registry.js`.
- **Current behavior:** `frameworkVersion` is only “Trust Services Criteria” and citations use a generic SOC services landing page.
- **Why it matters:** a historical reviewer cannot identify the exact criteria edition used to justify CC identifiers.
- **Evidence:** current registry versus AICPA’s official “2017 Trust Services Criteria (With Revised Points of Focus — 2022)” resource. Tests only require non-empty values.
- **Recommended Phase 2.2 action:** record the exact source edition and direct official citation after semantic re-review.
- **Regression test required:** authoritative source/version allowlist and historical report preservation.

### P2-AUD-014 — Technical evidence statements do not always carry a complete traceability tuple

- **Priority / audit confidence / category:** P2 / High / evidence provenance.
- **Affected files/symbols:** `lib/security-finding-model.js` statement generation; framework projection/report serializers.
- **Current behavior:** statement ID and evidence reference generally exist, but source URL, observation time, collection method, confidence, limitations and a resolvable artifact are not consistently present together.
- **Why it matters:** exported statements can be hard to independently verify even when the underlying finding retained more context.
- **Evidence:** traceability inventory in Section 10; format tests check consistency/redaction, not tuple completeness.
- **Recommended Phase 2.2 action:** define required fields by evidence class and preserve the tuple through every projection.
- **Regression test required:** JSON-to-HTML/PDF/XLSX/CSV traceability test for HTTP, browser, crawl, auth, operator and manual evidence.

### P3-AUD-015 — Reports lack a relationship legend

- **Priority / audit confidence / category:** P3 / High / report wording.
- **Affected files/symbols:** report/workspace mapping renderers in `public/app.js`, `lib/security-report-manager.js` and PDF/XLSX/CSV generation.
- **Current behavior:** Direct/Supporting/Contextual are shown without concise semantic boundaries.
- **Why it matters:** “Direct” can be misread as direct control failure even while control satisfaction is not determined.
- **Evidence:** renderer inspection; no legend assertion exists.
- **Recommended Phase 2.2 action:** add one shared concise legend without redesign.
- **Regression test required:** cross-format legend and prohibited-phrase assertions.

### P3-AUD-016 — Registry governance metadata cannot explain review rationale/history

- **Priority / audit confidence / category:** P3 / High / maintainability.
- **Affected files/symbols:** `lib/security-mapping-registry.js` metadata schema/entries.
- **Current behavior:** every entry has review status/version/citation/limitations, but all are internal-review-required, none approved, and 47 limitations are global boilerplate. No rationale, source version, reviewer/time or change reason is recorded.
- **Why it matters:** semantic decisions cannot be audited efficiently across catalog changes.
- **Evidence:** complete registry inventory; structural tests do not require decision provenance.
- **Recommended Phase 2.2 action:** add only `rationale`, `sourceVersion`, `lastReviewedAt`, `reviewedBy`, and `changeReason` where operationally owned; keep global limitations separate.
- **Regression test required:** schema validation plus a catalog-change fixture requiring version/reason/reviewer provenance.

### P3-AUD-017 — Some framework/applicability labels omit precise qualifiers

- **Priority / audit confidence / category:** P3 / High / report wording.
- **Affected files/symbols:** `public/app.js` and report label helpers.
- **Current behavior:** labels use “ISO 27001” rather than “ISO/IEC 27001”; concise “Applicable” labels may not repeat that this is operator asserted/unverified.
- **Why it matters:** abbreviated labels can be read as a tool determination.
- **Evidence:** source/rendering review; invariant narrative elsewhere mitigates the risk.
- **Recommended Phase 2.2 action:** standardize official framework names and surface the assertion qualifier wherever state is displayed standalone.
- **Regression test required:** label snapshots for operator-applicable, potential, unknown, not-indicated and not-applicable states.

### P3-AUD-018 — `manualReviewRequired` is universally true and has low information value

- **Priority / audit confidence / category:** P3 / High / status semantics, maintainability.
- **Affected files/symbols:** `lib/security-finding-model.js` — control evaluation construction; report serializers.
- **Current behavior:** every control evaluation sets `manualReviewRequired = true`.
- **Why it matters:** the invariant is safe but the Boolean cannot distinguish ordinary human conclusion requirements from specific missing/manual evidence.
- **Evidence:** code trace and generated evaluation inventory; current tests appropriately expect human review broadly.
- **Recommended Phase 2.2 action:** retain the safety invariant; consider renaming to an invariant phrase and add a separate reason list/qualifier rather than weakening it.
- **Regression test required:** every evaluation still requires qualified review, while reason codes differ for scope, failed collection, missing evidence and candidate mapping.

## 15. Accepted Areas

- Product invariants are preserved in live code and every tested format: assessment is a compliance pre-assessment; conclusion and control satisfaction are not determined; coverage is partial. No score, certification, pass/fail control or legal conclusion is generated.
- Static registry structure is deterministic: 62 unique IDs, valid prefixes/versions/citations, no orphan check IDs, and semantic merging preserves source mapping/check provenance.
- Framework projection shows no demonstrated cross-framework evidence leakage. The ePrivacy prefix-independent inclusion/legacy alias compatibility works, despite ownership ambiguity.
- PCI payment concepts remain distinct; provider/keyword evidence does not by itself become tested-origin card-data handling. HIPAA generic marketing is weaker than PHI/portal/covered-entity/BAA signals.
- Authenticated collection remains candidate/context evidence and makes no RBAC, authorization or least-privilege claim.
- Policy claims remain distinct from runtime evidence; mismatch is explicitly potential rather than a confirmed legal/implementation conclusion.
- Redaction keeps restricted browser/session/raw cookie material out of public report projection while retaining safe derived observations.
- Artifact binary deduplication retains canonical aliases/roles and conservative sensitivity. No provenance loss was demonstrated at the dedup layer.
- Passive ZAP does not contribute control mappings directly and therefore does not bypass registry governance.
- Reviewer lifecycle decisions remain overlays; they do not mutate raw evidence or change compliance/control conclusions.
- Tool, scanner, mapping-catalog and schema versions are exposed; mapping/framework versions exist; legacy/unversioned reports receive compatibility defaults and remain readable.
- All three product tools passed the Phase 1 smoke gate; no Lighthouse Reporter or Asset & Page-Weight Analyzer file was changed.

## 16. Phase 2.2 Proposed Worklist

**P0:** None.

**P1 (ordered):**

1. Gate every mapped evidence outcome consistently on prerequisites (P1-AUD-001).
2. Separate ePrivacy ownership/applicability while preserving privacy grouping and aliases (P1-AUD-002).
3. Re-evaluate ePrivacy direct strength and use amended/consolidated official source provenance (P1-AUD-003).
4. Repair structured source/artifact propagation through finding normalization (P1-AUD-004).
5. Separate payment tested origin from actual evidence source URL (P1-AUD-005).
6. Replace blanket dynamic local candidates with source/version/provision-backed mappings or omit unsupported relationships (P1-AUD-006).
7. Verify integrity cryptographically or narrow the workspace wording (P1-AUD-007).

**P2 (ordered):** add control coverage qualifiers (008); normalize evidence dimensions (009); correct failure/negative states (010); refine cookie identity/provenance (011); clarify density/fan-out (012); pin SOC TSC source/version (013); require evidence-class traceability tuples (014).

**P3 (ordered):** add a shared relationship legend (015); add minimal governance decision metadata (016); standardize names/assertion labels (017); retain human-review invariant while adding useful reason qualifiers (018).

No item adds a framework, score, active scanner mode, certification feature or legal conclusion.

## 17. Regression Tests Required for Phase 2.2

No regression coverage currently exists for the exact semantic boundary in each row below, although the adjacent suites cited in the findings cover related structure and invariants.

| Test/fixture | Required before change | Finding(s) |
| --- | --- | --- |
| Prerequisite × relationship × outcome matrix, including PCI dual prerequisites | Yes | 001 |
| Independent GDPR/ePrivacy applicability, label, legacy alias and amended citation | Yes | 002, 003 |
| Consent network versus storage/access/exception-sensitive fixture | Yes | 003 |
| Per-check evidence URL/artifact manifest resolver | Yes | 004, 014 |
| Payment homepage/checkout/redirect/iframe/hosted-field/provider source fixture | Yes | 005 |
| UAE/Saudi/Egypt official source/version/provision fixtures plus unsupported country | Yes | 006 |
| Tampered/missing/malformed/valid manifest verification UI fixture | Yes | 007 |
| Mixed-evidence primary state plus coverage qualifier matrix | Yes | 008, 018 |
| Cross-source method/state/confidence/strength normalization matrix | Yes | 009 |
| HTTP/browser/crawl/auth/consent/ZAP/TLS failure and bounded-absence matrix | Yes | 010 |
| Cookie name/path/domain/static-runtime identity matrix | Yes | 011 |
| Dense semantic control across HTML/JSON/PDF/XLSX/CSV without implied strength | Yes | 012, 015 |
| Exact SOC TSC official edition/citation plus legacy report compatibility | Yes | 013 |
| Framework/applicability terminology snapshots and prohibited conclusion phrases | Yes | 015, 017 |
| Mapping-governance schema/catalog-change fixture | Yes | 016 |

Existing coverage to retain: `test/phase1-core.test.js`, `test/compliance-reliability.test.js`, `test/security-scanner.test.js`, `test/phase1-browser-integration.test.js`, `test/phase1-report-consistency.test.js`, `test/compliance-pdf-pagination.test.js`, package validation and three-tool smoke tests.

## 18. Baseline Validation Result

| Command/gate | Total | Passed | Failed | Skipped | Result / environment |
| --- | ---: | ---: | ---: | ---: | --- |
| `npm test` | 78 | 78 | 0 | 0 | Passed; approximately 77.6 seconds. |
| `npm run validate:phase1` aggregate | 78 | 78 | 0 | 0 | Passed after running with required process/browser permissions. |
| Core deterministic | 43 | 43 | 0 | 0 | Passed. |
| Security core deterministic | 23 | 23 | 0 | 0 | Passed. |
| Cross-format / packaging | 2 | 2 | 0 | 0 | Passed. |
| Browser integration / existing browser regressions / PDF rendering | 10 | 10 | 0 | 0 | Passed using Brave `/usr/bin/brave-browser`, version `151.1.93.134`; launch, navigation and PDF available. |
| Three-tool smoke | 3 tools | 3 tools | 0 | 0 | Compliance Mapping, Lighthouse Reporter, and Asset & Page-Weight Analyzer passed. |

The first sandboxed Phase 1 validation attempt was blocked by environment `spawnSync/listen EPERM`, not by a product assertion. The same unchanged checkout passed when executed with the required process/browser permissions. Live baseline: package 1.7.1; mapping catalog `2026.08.25.2`; 62 static mappings; 5 static framework buckets plus dynamic Local (6 product framework families); 19 static control IDs plus 4 supported local instrument IDs (23 possible IDs).

## 19. Remaining Audit Limitations

- This was a source/test/controlled-fixture audit, not an active scan of public targets.
- Publisher pages confirm framework/version provenance, but full copyrighted ISO/SOC/PCI criteria text was not reproduced. Exact control-to-observation relevance remains a qualified human semantic review.
- Local official sources establish instrument identity; exact provision mapping remains unverified because current dynamic records do not identify provisions.
- No real covered entity, cardholder-data environment, authenticated production application or jurisdictional legal facts were asserted.
- Browser results are tied to the installed Brave version and controlled fixtures; they do not prove all runtime architectures.
- Several defects were demonstrated by focused function probes because no current regression fixture covers them; those exact fixtures are listed in Section 17.
- Audit confidence refers to demonstrated engineering behavior, not legal certainty or framework compliance.

**Phase 2.1 conclusion:** the conservative conclusion and projection invariants are defensible, as are most static relationship choices. Phase 2.2 should be a narrow reliability correction focused on prerequisite symmetry, ePrivacy ownership/strength/version, provenance resolution, local-law source governance, and integrity wording before broader semantic cleanup.
