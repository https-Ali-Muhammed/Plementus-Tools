# Product scope — Phase 00

Date: 2026-10-20. **PROPOSED / PROVISIONAL; NOT IMPLEMENTED**. Owner review pending; 0/22 completed.

## Problem and defensible claim

Developers, QA/support engineers and backup leads need a bounded case another developer can understand without the original investigator present. Proposed value: explicitly consented browser observations, provenance and uncertainty, deterministic next checks, and reviewed local handover. Recording, RPC inspection, local operation and comparison already overlap with [Workbench](COMPETITOR_MATRIX.md); AI-free operation alone is not unique. There is no evidence of superiority, legal clearance or product-market fit.

## AI-free MVP and sequence

The Phase 16 MVP checkpoint is a single-case journey: grant one site/tab permission → visibly start/pause/stop → manually reproduce → inspect eligible sanitized events and evidence-linked checks → add expected/actual notes → review/redact → download Markdown + versioned JSON → delete locally.

| Proposed capability | Minimum outcome / failure behavior | Roadmap |
|---|---|---|
| Consent and session control | Recording off initially; bound to one tab/origin, visible state, no silent resume | 03–04 |
| Local bounded timeline | Action categories/navigation, permitted client errors and network metadata; gaps explicit | 05–07 |
| Conditional envelope classification | Only safe allowlisted fields; HTTP 200 is not proof of success; omit unavailable signals | 08 |
| Odoo context/capabilities | Report reliable version/model/method only if observed; otherwise unknown | 09–11 |
| Correlation and rules | Evidence IDs, ambiguity and suggested next checks; no backend root-cause assertion | 12–13 |
| Review and handover | Search/filter, user notes separated, preview, redaction report, Markdown/JSON, deletion | 14–16 |
| Automated two-case comparison | Capability-aware first observable divergence and unmatched events | 17, after MVP |
| Expanded legacy adapters | Only evidenced 8–16 features; generic fallback remains a proposal until tested | 18 |

Blueprint §2.1 includes cautious comparison in broad MVP scope, while §10 puts it after the Phase 16 checkpoint. **Proposed interpretation:** retain comparison in the v1 roadmap, defer automated comparison to Phase 17; scope ratification `P00-SCOPE` is required before 01. No canonical text was silently changed.

## Three concrete handover scenarios

These are acceptance designs, not executed cases. Human reproduction can itself write Odoo data; use only separately authorized disposable fixtures/test actions. Read-only describes the extension's behavior, not the business button.

| Scenario | Investigator input and minimum package | Recipient outcome / visibility limits |
|---|---|---|
| A — Odoo 17 button fails | In authorized test data, manually reproduce a failing Confirm action. Include user-stated steps/expected/actual, action event IDs, eligible request outcome and sanitized error family if observable. | Backup developer identifies the first observed failure and chooses focused log/ACL/business-validation checks. Model/method, server source and exact rule remain unknown unless safely evidenced. |
| B — Local works, staging fails | Same user-assigned scenario label, two separately reviewed local cases, host aliases, capabilities and missing signals. At MVP, hand over two exports for human comparison. | Teammate finds the first evidenced difference without assuming equal databases/config/modules. Automated alignment/export is Phase 17; timings alone do not establish cause. |
| C — Odoo 12 versus 20 | Two legally available test systems if later authorized; disclose adapter/version confidence and unavailable features in each case. MVP handover remains manual; normalized automated comparison follows 17/18. | Teammate can distinguish missing capture from application failure. No old/new-version parity or adapter coverage is claimed; all compatibility currently unknown. |

Each case should include case/schema/tool versions, safe environment aliases, user-stated expected/actual and steps, event-linked timeline, observed/derived/user-stated/unavailable/hypothesis sections, capture capabilities/gaps, findings with rule IDs and evidence IDs, redaction summary and backend follow-up questions. JSON and Markdown must describe the same sanitized case. Import is undecided; no need to implement it to hand over a file.

## Exclusions

- No AI/model service, backend/account/cloud sync, server module, Plemo integration or credentials.
- No automatic business actions, request replay, RPC console, database/source/log access or customer access.
- No raw bodies, headers/cookies/tokens, business record values/IDs, typed input, DOM dumps, full console streams or screenshots/video in MVP.
- No generic field explorer, database introspection, editing/debug toggles, universal error detection, blanket Odoo certification or Firefox-specific package.
- No public release/store submission, trademark clearance, dependency installation or Phase 01 design in Phase 00.

## Success criteria — targets, not measured results

| ID | Future acceptance evidence | Passing condition |
|---|---|---|
| S1 | Teammate independently uses a seeded authorized case | Reproduces the issue and identifies useful next checks without live explanation; record outcome and gaps per scenario |
| S2 | Finding/export assertions | 100% of findings reference existing evidence IDs and expose limitations; JSON/Markdown agree |
| S3 | Consent and network security checks | Zero recording before consent/after pause/stop/revocation or in other tabs/origins; zero unsolicited external transmissions |
| S4 | Synthetic secret/PII and malicious-content tests | Prohibited values absent from stored/exported allowlisted evidence; failed sanitation blocks affected content; preview remains mandatory |
| S5 | Authorized real-instance smoke evidence | Every advertised feature/version tied to dated environment evidence; no quota until lawful instances exist |
| S6 | With/without extension functional and performance comparison | Same authorized action result; no user-visible regression; measure overhead before agreeing numerical limits |
| S7 | Lifecycle/storage tests | Enforced item/byte/age limits and complete user deletion, including worker restart; values decided in Phase 01 |

Phase 00 acceptance is documentary: these five deliverables, dated primary sources, explicit caveats and owner-approved scope. Runtime success is NOT TESTED. Owner decisions and accountable follow-up are in [05](05_BLOCKERS_AND_DECISIONS.md); safety fallbacks in [feasibility](FEASIBILITY.md).

## Owner review required

Ratify MVP/comparison sequence and value proposition; authorize test systems and actions later; choose browser baseline and production policy; set retention/encryption/export classification, branding/license and measurable user/performance acceptance policy. No open policy is silently enforced by these documents.
