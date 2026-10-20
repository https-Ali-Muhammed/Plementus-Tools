---
title: "Odoo TraceBridge — Product Specification and Phased Implementation Plan"
subtitle: "Cross-version Odoo developer diagnostics, evidence comparison, and handover; AI-free core; future Plemo integration"
version: "2.0 — Small-Phase Codex Execution Baseline"
date: "2026-10-20"
status: "PROPOSED — NOT IMPLEMENTED"
---

# Odoo TraceBridge

## Complete Product Blueprint, Repository Documentation, and 22-Phase Codex Implementation Plan

**Document version:** 2.0  
**Prepared:** October 20, 2026 (original v1.0 planning baseline; revised v2.0 execution plan)  
**Status:** Proposed concept and 22-phase execution blueprint; no implementation, installation, or product compatibility certification has been completed.  
**Intended readers:** Product owner, Odoo developers, browser-extension engineers, QA engineers, security reviewers, Codex, and future ChatGPT project-coordination chats.  
**Working name:** Odoo TraceBridge (name, trademark, and Chrome Web Store availability are **not** validated).

> **The one-sentence idea:** A privacy-first, cross-version browser extension that records an *opted-in* Odoo troubleshooting session, turns observable client errors and RPC metadata into evidence-backed diagnostic hints, compares sessions or environments, and exports a safe handover package another developer can use. A future, separately authorized integration may share selected cases with the company's Plemo agent.

**Important:** This is a *technical implementation brief*, not a claim that the extension, capabilities, compatibility, uniqueness, Chrome Web Store approval, or Plemo integration already exist.

**Companion handoff:** [`Odoo_TraceBridge_New_Chat_Instructions.md`](Odoo_TraceBridge_New_Chat_Instructions.md) contains the paste-ready ChatGPT coordination instructions. Use it together with this blueprint. The owner must provide their GitHub repository URL and local clone path **before any Codex task**.

---

## 1. Executive Summary

Odoo developers often reproduce a bug manually, inspect the browser console and network tab, identify the model/action involved, collect screenshots or notes, and explain the problem to another developer. Valuable context is lost between investigation, environment comparison, and handover. Odoo TraceBridge should make this sequence repeatable without modifying Odoo itself.

The product's initial differentiator is **structured, privacy-safe, version-aware evidence with practical human-to-human handover**. Generic debug toggles, RPC explorers, field inspectors, workflow recording, and recording comparisons already exist in other products. Our product must prove its value through safer evidence correlation, precise uncertainty labels, cross-version normalization, and handover quality—not through an unsupported "world's first" claim.

**Release strategy:** An **AI-free, local-first Chromium extension** first. Add coverage progressively across Odoo web clients and versions. Integrate with Plemo only after an explicit interface, security, and native-capability assessment. Avoid introducing an Odoo server module or cloud service into the initial MVP.

### 1.1 Primary users and outcomes

| User | Daily pain | Desired outcome |
|---|---|---|
| Odoo developer | A button, view, or workflow fails with unclear cause | See what happened, when, and which evidence supports the next check |
| Technical lead / backup developer | Bug context is scattered across chat and screenshots | Import one structured, redacted case with steps, signals, and open questions |
| Implementation / QA engineer | Same workflow behaves differently in two environments | Compare observable behavior and identify a focused investigation path |
| Odoo support engineer | A production issue must be investigated without changing data | Capture a bounded, read-only, reviewable diagnostic session |

### 1.2 Product principles

1. **Evidence before guesses:** Show observed facts separately from rules-based hypotheses.
2. **No AI required for core functionality:** Capture, normalization, correlation, comparison, and exports are deterministic.
3. **Never silently diagnose the backend:** A browser extension cannot inspect server source code, PostgreSQL, or protected server logs just because it runs on an Odoo page.
4. **Cross-version by capability:** A universal observation baseline plus tested Odoo adapters; unsupported capabilities must be labeled rather than fabricated.
5. **Opt-in, bounded, local-first:** Investigation starts explicitly; export and any transmission require deliberate user action.
6. **Non-invasive:** Do not change Odoo data, intercept credentials, block requests, auto-retry business actions, or alter web-client behavior.
7. **Honest support claims:** "Tested" means actually tested; "expected" and "fallback" are distinct support levels.

## 2. Scope, Non-goals, and the Originality Constraint

### 2.1 MVP: in scope

- Browser extension with compact popup and/or side panel.
- Per-tab, user-started investigation session: start, pause, stop, clear.
- Instance detection: host and Odoo-like application signals; version where *reliably available*, without forcing privileged calls.
- Redacted timeline of deliberate user actions and high-level network outcomes.
- JavaScript errors and unhandled Promise rejections within the permitted capture scope.
- HTTP status, timing, route classification, request IDs where observable; RPC model/method only when safely and reliably extractable.
- Detection of JSON-RPC error envelopes where the adopted instrumentation can observe and safely parse them.
- Deterministic rules-based diagnostic suggestions with evidence references and confidence/limitations.
- Local session persistence, search/filter in a basic UI, deletion, and explicit Markdown + JSON export.
- One-session reproduction case and a cautious two-session comparison.
- Unit, integration, security, and smoke tests; a documented support matrix.

### 2.2 Deferred until a justified phase

- Broad cross-version adapters for all historical releases; comprehensive comparison and advanced correlation.
- Optional DevTools integration for richer on-demand diagnostics.
- Optional advanced debugging permissions; never as a default requirement.
- Screenshot support (explicit per-capture permission, redaction, and preview).
- Company/team collaboration or hosted storage.
- Plemo agent connection, LLM features, server-side code investigation, automatic patch suggestions.
- Firefox/Edge-specific packaging beyond Chromium compatibility unless proven low-risk.

### 2.3 Explicit non-goals

- Not a replacement for Odoo logs, Python debugging, tests, ORM introspection, or official Odoo development tools.
- No universal guarantee of detecting every Odoo exception or root cause.
- No reverse engineering of inaccessible server resources or bypassing access controls.
- No autonomous production fixes, workflow replay that commits transactions, database modifications, or elevated access.
- No collection of raw passwords, auth tokens, cookies, Authorization headers, CSRF tokens, complete record payloads, or sensitive field values.
- No claim of originality, legal clearance, or trademark ownership without separate review.

### 2.4 Market differentiation: hypothesis, not established fact

Existing Odoo developer extensions offer overlapping capabilities. **Odoo Workbench advertises workflow/RPC recording, error and Owl profiling, and comparisons for Odoo 15–20.** The proposed competitive space is an intentionally narrow workflow: *read-only diagnostics → verifiable timeline → version-aware normalization → evidence-labeled hypotheses → secure handover, with future optional Plemo intake*. A competitor audit in Phase 0 must decide whether that is meaningfully differentiated.

## 3. End-to-End User Journeys

### Scenario A — Broken button in Odoo 17

1. Developer opens an authorized test instance; launches TraceBridge and approves site access.
2. Clicks **Start Investigation**. The extension shows clearly that recording is active.
3. Reproduces a failing `Confirm` button on a sale order.
4. TraceBridge records the click context **without reading form values**, network timing/status when available, and a JavaScript error or JSON-RPC failure envelope if observable.
5. The UI shows: **Observed** (`RPC error envelope`, normalized method `action_confirm` if supported); **Possible checks** (`ACLs`, `record rules`, `business validation`, relevant server logs); **Unknown** (`backend root cause`, `source file` unless the error contains a reliable traceback).
6. Developer stops capture, reviews/redacts the exported case, and shares it with a teammate.

### Scenario B — Local works, staging fails

1. Record the exact workflow once on Local, once on Staging, with matching human-assigned scenario label.
2. Compare normalized ordered steps, endpoint classes, method labels, failure categories, and approximate timing.
3. The comparison highlights "first observable divergence" and missing evidence; it does **not** claim database or code equivalence.
4. Export one comparative handover containing both environments with safe host aliases and data limitations.

### Scenario C — Odoo 12 vs. Odoo 20

1. Odoo 12 uses a legacy adapter where supported; Odoo 20 uses modern adapters where supported.
2. Both produce the same **normalized event schema** with explicit `captureCapabilities`.
3. The tool compares semantic action categories when evidence supports alignment, not unstable CSS selectors, exact RPC route text, or arbitrary time ordering.
4. Unsupported older-version features remain "not captured" instead of being treated as failures.

### Scenario D — Future Plemo handover

1. User opens a reviewed and redacted case and selects **Send to Plemo** (future feature).
2. Explicitly chooses included fields and approves transmission to a configured, authenticated company-controlled gateway.
3. Plemo receives a versioned **evidence package**, not browser credentials or authority to make changes.
4. Plemo acknowledges ingestion and may conduct its own authorized source-code investigation; it must clearly separate observed evidence from hypotheses.
5. No automatic fix, privileged action, or server change occurs because a case was uploaded.

## 4. Compatibility Strategy: All Odoo Versions as a Long-Term Goal

**Goal:** A usable baseline on as many Odoo versions as possible; verified enhanced diagnostics on supported versions. "All versions" cannot be guaranteed before a real test matrix is run. Odoo 20 was released in September 2026; Odoo 8–20 represent the initial historical matrix, with older releases subject to a limited browser-only fallback. Customized/forked clients can defeat version assumptions.

### 4.1 Four compatibility tiers

- **Tier G — Generic browser baseline:** Same-origin, authorized page detection; action timeline, observable JavaScript errors, general request metadata, manual notes, export. Does not depend on private Odoo internals.
- **Tier L — Legacy Odoo adapters:** Target versions 8–13 using empirically tested routes, page patterns, and semantics. Avoid hard dependencies on fragile globals.
- **Tier T — Transitional adapters:** Target versions 14–16, where legacy patterns and Owl coexist; select features based on observed capability, not only version number.
- **Tier M — Modern adapters:** Target versions 17–20 with tested modern web-client behavior, Owl-aware UI context when safely available, and known RPC-envelope normalization.

The tier boundaries are planning conveniences; they are not a guarantee that every database or custom module in those releases behaves identically.

### 4.2 Support statuses

| Status | Meaning |
|---|---|
| **Verified** | Tested on a specific Odoo version, edition/host type, and exact feature; evidence recorded |
| **Partial** | Basic capture works but explicitly named signals are not available/reliable |
| **Fallback** | Generic browser evidence only; no Odoo-specific enhancement promised |
| **Unknown** | No trustworthy test evidence yet |
| **Unsupported** | Known technical incompatibility, or unsafe to enable |

The UI must report feature-by-feature capability, not a blanket "supports Odoo X" green checkmark.

### 4.3 Test matrix requirements

Track **Odoo 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20** individually. Prioritize 17, 18, 19, 20 for development; then 14–16, 11–13, 8–10 if test instances are legally and technically available. Track Community/Enterprise, Odoo Online/Odoo.sh/self-hosted, dev/prod restrictions, language, multi-company, custom modules, app types, and Chrome versions. Do not fabricate coverage for missing instances.

### 4.4 Odoo API nuance

- Odoo introduced external **JSON-2** in v19. The old external `/xmlrpc`, `/xmlrpc/2`, and `/jsonrpc` services are deprecated with separate removal timelines.
- **Do not confuse external RPC deprecation with internal browser-facing Odoo web controllers.** The extension primarily observes the existing web client; it must not require an external API subscription or API key for the initial release.
- `/web/...`, request shapes, and JS frameworks vary. Recognize them via tested adapters; do not implement one brittle hard-coded "universal" RPC hook.
- External API availability may differ by Odoo subscription plan. The initial MVP must not depend on it.

## 5. Proposed Technical Architecture

### 5.1 Technology decisions

- **TypeScript** strict mode throughout.
- **Chromium Manifest V3** as the first release target.
- **WXT** (candidate build framework; verify current compatibility and dependency health in Phase 0), with React for popup/side panel only.
- **Vitest** for deterministic logic, **Playwright** for extension UI / integration tests where practical.
- **Zod** or equivalent validated schema for incoming event messages and import/export packages.
- **IndexedDB** for bounded session/event data; `chrome.storage.local` for small settings only. Review retention and encryption expectations before storing any potentially sensitive data.
- No server, database, user account, model API key, or external AI endpoint in v1.

### 5.2 Logical components

```text
Odoo tab (authorized and opted-in)
  |
  +-- Isolated content script
  |      - basic DOM / click metadata, navigation, sanitized context
  |      - message validation & origin/tab binding
  |
  +-- Optional tightly scoped MAIN-world observer
  |      - observes fetch/XHR metadata and limited error envelopes
  |      - avoid request/response body retention
  |      - reversible instrumentation; fail-open
  |
  v
MV3 background/service worker
  - session lifecycle & event collection
  - permission and tab gating
  - rate / memory / retention bounds
  - redaction and schema validation
  |
  +--> Version detector & capability registry
  +--> Event normalizer & deterministic correlator
  +--> Rule engine (evidence + limitations)
  +--> Local session storage
  +--> Comparison engine
  +--> Export generator (JSON + Markdown)
  |
  v
Popup / side panel
  - start, pause, stop, scope, evidence, compare, review, export

FUTURE ONLY: reviewed case -> explicit opt-in -> secure Plemo gateway
```

### 5.3 Capture modes and realistic browser API limits

**Baseline mode:** Use an isolated content script plus narrow optional host permission, activated deliberately for the selected tab/site. Record click descriptions (element role and stable label if non-sensitive), URL *route path only after redaction*, navigation, and eligible client errors. Avoid keystrokes and form field content entirely.

**Metadata mode:** Where justified, `chrome.webRequest` can expose request metadata/status/timing with appropriate permissions; **it does not provide general response bodies**. Its availability and fields must be validated against the Chrome version and permission model. Do not request it unless the MVP design truly needs it.

**RPC envelope mode:** A very small, tested MAIN-world observer can instrument `fetch`/`XMLHttpRequest` for Odoo-specific endpoint classes. Scope by tab, origin, explicit session state, allowlisted routes and capped payload bytes; extract only schema-approved envelope fields such as error category/model/method if present. Avoid retaining raw bodies; redact before messages cross into extension storage. The page can interfere with MAIN-world scripts, so treat the result as **untrusted evidence**; design safe installation/uninstallation and noninterference tests.

**Optional DevTools mode (later):** A DevTools extension page can inspect a network HAR stream and, in certain contexts, retrieve content; this works only when DevTools is open and may miss earlier requests. **Optional debugger mode (much later, if essential)** requires powerful permissions and produces explicit browser warnings; assess separately and never make it the ordinary experience.

**Unobservable cases:** Errors swallowed by Odoo, server-only exceptions, cross-origin frames without access, failures before capture starts, or custom frameworks can be absent. State `signal_not_observed`, not `no_error`.

### 5.4 Deterministic event model (illustrative, sanitized)

```json
{
  "schemaVersion": "1.0.0",
  "sessionId": "case-local-id",
  "sequence": 18,
  "timestamp": "2026-10-20T09:22:14.312Z",
  "source": "main_world_observer",
  "eventType": "rpc_error",
  "odoo": { "version": "17.0", "versionConfidence": "reported" },
  "environment": { "alias": "Staging", "hostHash": "sha256:example" },
  "context": { "model": "sale.order", "action": "action_confirm", "view": "form" },
  "request": { "routeClass": "web_dataset_call_button", "status": 200, "durationMs": 420 },
  "error": { "family": "AccessError", "message": "[REDACTED]" },
  "evidence": { "confidence": "observed", "captureMode": "rpc_envelope" },
  "redactions": ["error.message", "url.query", "request.body"]
}
```

The example is a **schema proposal**, not evidence from a real Odoo server. Never store record names, complete object IDs, raw stack locals, email addresses, invoice amounts, session cookies, PII, arbitrary custom field contents, or raw request bodies by default. A source filename/line number may be included only if present in an already-exposed traceback and safe to share; otherwise mark unknown.

### 5.5 Correlation and diagnosis

Normalize diverse signals into a single session timeline. Associate actions and RPC outcomes using reliable request IDs where available, then bounded temporal windows as a **heuristic**. Concurrent requests, background polling, retries, and unrelated tabs must not be falsely grouped.

Suggested deterministic rules:

| Rule | Evidence required | Suggested checks | Prohibited conclusion |
|---|---|---|---|
| `access_error` | Structured AccessError observed in eligible envelope | User groups, model ACLs, record rules, company context | "Record rule X is the root cause" |
| `backend_rpc_failure` | HTTP failure / eligible RPC error envelope | Corresponding server log and method if shown | "The backend crashed because of module Y" |
| `owl_render_error` | Observable Owl/client stack or error signature | Component stack, props/state, assets, version mismatch | "Patch component X" absent source |
| `missing_asset` | JS/CSS asset request failure | Bundle/assets loading, cached bundles, deployment | "Module is missing" absent verification |
| `no_rpc_after_action` | Action captured, no correlated eligible RPC observed | Frontend handler, form validation, permissions, instrumentation gap | "Click handler is broken" |
| `timeout_or_network` | Explicit timeout/connection failure | Connectivity, proxy, long-running method, server logs | "Database overload" |

Every emitted suggestion must contain `ruleId`, severity, actual evidence event IDs, observed/possible/unknown sections, clear limitations, and confidence as **evidence quality** (`high`, `medium`, `low`, `insufficient`) rather than a pretend mathematical probability.

## 6. UX Specification

### 6.1 Primary views

1. **Popup:** Detect instance, show version-confidence and permissions, start/pause/stop, active recording indicator.
2. **Investigation panel:** Ordered timeline, filters (user actions, RPC, client errors), event detail, capture gaps, and safety notice.
3. **Diagnosis panel:** Observed facts, ranked **checks**, uncertainty, and source event links. Avoid "AI-like certainty" language.
4. **Comparison:** Session A/B selectors, aligned steps, first observable divergence, version/capability caveats.
5. **Export review:** Fields to include, redaction summary, warnings, download JSON/Markdown, delete session.
6. **Settings:** Per-site authorization, retention, capture mode, size limits, optional future integrations (disabled in v1).

### 6.2 Default UX behaviors

- Recording starts **off** and never follows the user to an unrelated domain or tab.
- Show a conspicuous indicator while active; pause automatically on navigation to a disallowed origin.
- If required permission is unavailable, retain a lower-fidelity baseline and explain the limitation.
- Provide quick "Add note" and "Expected vs. actual" inputs; user-authored text is still scanned for secrets before export.
- Expose "Why suggested?" with evidence IDs for each diagnosis.
- Distinguish **Not observed**, **Unavailable**, **Unsupported**, and **Not yet tested**.
- Empty states and failures should be useful, not misleading.

## 7. Privacy, Security, and Compliance by Design

**Threats:** credentials or PII in URLs/messages, network bodies, stack traces and screenshots; malicious scripts on untrusted pages; confusing production with development; stale data after a session; export to public support tickets; unauthorized transfer to Plemo; excessive host permissions.

**Mandatory controls**

1. **Least privilege:** request optional host permissions for the active Odoo origin only where supported; no blanket all-site surveillance. A user must explicitly approve each site.
2. **Explicit recording:** start/pause/stop controls; no automatic capture when the browser opens.
3. **Allowlist extraction:** selected event categories and RPC envelope fields only; no full-body capture persisted. An internal parser may inspect bounded content solely to extract safe fields where explicitly enabled.
4. **Never read or store:** passwords, cookies, bearer tokens, authorization headers, CSRF tokens, business field values, typed characters, or raw responses.
5. **Redaction at collection + export:** sensitive paths, query params, hostnames, emails, phone numbers, secret-like strings, and user-authored notes must pass layered filters. Hashes themselves can be correlatable personal data; never imply hashing equals anonymization.
6. **Production guardrails:** production is read-only; manual investigation only; show environment labeling; never replay a business action automatically.
7. **Isolation:** validate `tabId`, origin, extension message format, source frame, session ID, and payload length. Treat page content as attacker-controlled.
8. **Safe local retention:** user-controlled deletion, strict item/byte/time caps, auto-expiration, no analytics or external transfers by default. Evaluate if encryption at rest is needed under organization policy.
9. **Secure export:** review before download, schema validation on import, reject oversized or script-bearing data, never render untrusted HTML in the extension UI.
10. **Permission audit:** document why each Manifest permission is required; review Chrome Web Store privacy declarations and policy prior to publishing.
11. **Noninterference:** observer must not mutate arguments/results, break promise semantics, introduce excessive latency, or install duplicate wrappers after client navigation.
12. **Stop conditions:** unknown origin/identity; overbroad sensitive capture; unsafe content; compatibility breakage; inability to sanitize evidence; any request to bypass site permissions.

**Security test cases:** token in query string, credential in error string, PII in traceback, JSON-RPC response with complete customer record, malicious postMessage, tab switch, iframe, huge response, concurrent request flood, service-worker restart, disabled permission, navigation across origins, CSP conflicts, malformed imported JSON, export-after-delete, and attempted network exfiltration.

## 8. Reporting and Evidence Contract

### 8.1 Human-readable Markdown export

Suggested headings:

1. Case ID, creation timestamp, tool/schema version, reporter-entered title.
2. Environment aliases and observed Odoo version(s) with confidence and capture capabilities.
3. Expected vs. actual behavior (user supplied; label as such).
4. Steps to reproduce, each linked to evidence event IDs and time.
5. Timeline table (sanitized), first observable failure, request/error summaries.
6. **Observed facts**; **rules-based hypotheses and next checks**; **unknowns/visibility gaps**.
7. Comparison (if relevant): matched steps, divergences, unmatched events, limitations.
8. Redaction report and data provenance.
9. Handover checklist and items requested from backend developer (e.g., logs, version diff, access-rule inspection).

### 8.2 JSON export

Versioned, validated, machine-readable schema with `caseId`, `schemaVersion`, `sourceVersion`, `environments`, `capabilities`, `events`, `steps`, `findings`, `redactions`, `comparison`, `humanNotes`, and `importWarnings`. Strictly separate user statements from observed evidence. Add schema migration strategy before v2.

### 8.3 Evidence reliability levels

- **Observed:** directly captured by the extension in scope.
- **Derived:** deterministic transformation of observed events; provide algorithm/rule ID.
- **User stated:** expected behavior, annotations, environment descriptions.
- **Unavailable:** evidence not accessible to the client or permissions absent.
- **Hypothesis:** a suggested check, not a verified root cause.

## 9. Future Plemo Integration — Architecture Reserved, Not Assumed

**Intent:** Once TraceBridge's exports are stable, optionally send the reviewed case to the company's Plemo agent to correlate client-side evidence with its legitimately accessible project/source/tool context. No current Plemo API, auth mechanism, extension integration capability, or skill activation is assumed or certified.

### 9.1 Integration boundary

```text
TraceBridge local case
  -> redaction & preview
  -> explicit user approval for this case
  -> HTTPS company-controlled connector/gateway (future)
  -> authn/authz, scope enforcement, size limits, audit record
  -> versioned Plemo evidence-intake contract (future)
  -> Plemo's existing native investigation workflow
  -> response with hypotheses/evidence and authorization boundaries
```

The gateway is only one candidate. If Plemo offers an authenticated, documented direct integration, evaluate it against the gateway. **Do not place long-lived Plemo secrets or service tokens inside the extension.** Prefer per-user delegated auth, least-privilege scopes, revocation, TLS, explicit consent, and no automatic case upload. A file-import workflow may be preferable to a live API initially.

### 9.2 Draft interoperability payload (future-only)

```json
{
  "contract": "tracebridge.plemo.case.v1",
  "caseId": "local-case-id",
  "exportSchemaVersion": "1.0.0",
  "consent": { "approvedForTransfer": true, "approvalTime": "..." },
  "dataClassification": "sanitized_developer_diagnostics",
  "included": ["environmentAliases", "steps", "events", "findings"],
  "permissions": { "authorizesSourceReview": false, "authorizesWrite": false },
  "payloadDigest": "sha256:...",
  "case": { "...": "validated, redacted TraceBridge case content" }
}
```

The `consent` structure represents a real UI action at send time, not a self-asserted trust signal. The gateway must independently authenticate the sender, check organization policy, validate the payload/digest, and reject scope escalation. Receiving evidence never grants Plemo permission to fix production, change a database, or access an unrelated repository.

### 9.3 Discovery checklist before implementation

- What documented Plemo intake channel actually exists: local import, extension API, enterprise gateway, or none?
- What are Plemo's native ability, source access, permission model, audit logs, data-retention, and response format?
- Is there an existing internal skill/workflow for debugging or developer handover? Avoid duplicating it.
- Can Plemo distinguish observation, rule suggestions, source-derived findings, and unverified inferences?
- How are Odoo company/customer secrets classified and approved for transfer?
- Which use cases require explicit human authorization before code edits, tests, deployments, or data changes?

**Project note:** This document does **not** propose creating a Plemo skill. If a new Plemo skill is later requested, follow the company's separate Plemo skill-creation workflow, inspect the current skill repository, and perform the read-only native-capability assessment *before* drafting any new skill.

## 10. Execution Roadmap — Documentation Bootstrap + 22 Small Phases

### 10.1 Non-negotiable prerequisites and sequence

**Owner-managed repository first.** Before generating any Codex implementation or documentation-bootstrap prompt, the coordinating ChatGPT chat MUST request and receive both:

1. **The new GitHub repository URL**, supplied by the owner.
2. **The exact local path to the already-cloned repository**, supplied by the owner.

Do not invent either value, create a substitute repository, clone again, or assume a branch name. Validate the local path, Git root, remote, branch, working-tree status and README state *with Codex after those two values are received*. Do not execute local actions in ChatGPT merely by guessing the owner's machine is accessible. If the local path and remote do not correspond, stop and document the discrepancy; do not initialize over existing work.

**Step DB — Documentation Bootstrap (mandatory, not counted as a product phase).** Create the eight authoritative progress files and a `Phases/` directory at `docs/` before any production implementation. Create or carefully preserve the new repository root `README.md`, accurately labeling non-operational commands/features as **planned**. Save a baseline spec copy or link. Validate file naming and Markdown links, and record the initial Git state. Do not scaffold application code or install dependencies during DB. ChatGPT reviews Codex's documented output and provides a proposed commit message; the owner performs any commit/push manually. Then start Phase 00.

**Numbering:** Product phases are **00–21 inclusive (22 phases)**, initially **0/22 completed**, plus documentation bootstrap `DB`. Optional future Phase 21 is not part of the AI-free v1 acceptance gate. Each phase is deliberately small enough for one focused Codex execution and review cycle; split a phase further if necessary without silently combining two.

### 10.2 Phase map and dependencies

| ID | Phase | Essential result | Gate/milestone |
|---|---|---|---|
| DB | Documentation bootstrap | Exact progress records, `docs/Phases/` and honest root README | **Required before any product code** |
| 00 | Product discovery and originality audit | Competitor matrix, evidence-based differentiation, available test-instance inventory | Owner-approved scope |
| 01 | Architecture and security decisions | MVP component boundaries, data flows, threat model, initial decisions | Architecture gate |
| 02 | MV3 project scaffold and installation README | Strict TS extension skeleton, quality scripts, detailed tested setup instructions | Runnable blank extension |
| 03 | Permission request and recording consent | Single-origin opt-in permission UI and no-capture-before-start proof | Consent gate |
| 04 | Session lifecycle and bounded persistence | Start/pause/resume/stop, tab binding, restart handling, storage limits | Session gate |
| 05 | Safe user-action and navigation events | Non-sensitive click/navigation categories only | Generic actions |
| 06 | Client exception capture | Scoped `error` and `unhandledrejection` with redaction | Client diagnostics |
| 07 | Network outcome metadata | Status/timing/route-class signal with least privilege | Network metadata |
| 08 | RPC envelope research and safe observer | Narrow `fetch`/XHR experimental adapter or documented fallback | Explicit safety GO/NO-GO |
| 09 | Odoo identification and capability registry | Version-confidence model and generic fallback | Version honesty |
| 10 | Modern Odoo adapter fixtures | Targeted tested 17–20 fixtures/adapters where available | No invented compatibility |
| 11 | Evidence schema and normalization | Versioned sanitized events and provenance | Reliable event contract |
| 12 | Action-to-request correlation | Deterministic joins; ambiguous matches labeled | Causality limits |
| 13 | Rule-based diagnosis | Transparent rules with evidence IDs and uncertainty | No AI/backend inference |
| 14 | Investigation UI and case notes | Searchable timeline, observed/derived/user notes separated | Usable investigation |
| 15 | Reviewed Markdown + JSON export | Field-level redaction preview and local export | Human handover |
| 16 | MVP end-to-end acceptance | Reproduce → inspect → export; full privacy/noninterference gate | **MVP checkpoint** |
| 17 | Environment and version comparison | Two-session normalized, uncertainty-aware diff | Comparison checkpoint |
| 18 | Legacy version adapters and coverage | Testable expansion toward Odoo 8–16 plus accurate matrix | Feature-level support |
| 19 | Security, performance and resilience | Fuzzing, retention, multi-tab, worker-restart, performance | Hardening gate |
| 20 | Release readiness and README completion | Reproducible package, Chrome install/manual, disclosures/checklist | **v1 release candidate**, not published |
| 21 | Optional future Plemo integration discovery | Read-only assessment and secure case handover contract | Not implementation approval |

**High-level dependencies:** DB → 00 → 01 → 02 → 03 → 04 → 05 → 06 → 07 → 08 → 09 → 10 → 11 → 12 → 13 → 14 → 15 → 16 → 17 → 18 → 19 → 20. Phase 21 follows stable exports and is a separately approved exploratory track, not a prerequisite for releasing an AI-free extension. When a technical spike fails safely, the owner can approve a documented reduced feature scope; do not force hooks or block generic functionality.

### 10.3 Phase details, acceptance evidence and stops

**Phase 00 — Product discovery and originality audit**
- Do: Compare named competitor functions (especially existing Odoo workflow recording/comparison), define three concrete handover scenarios, inventory lawful Odoo test instances and browser targets, verify current official documentation. Decide which MVP claims are defensible.
- Deliver: `docs/PRODUCT_SCOPE.md`, `docs/COMPETITOR_MATRIX.md`, `docs/FEASIBILITY.md`, `docs/SUPPORT_MATRIX.md` (initial unknown statuses).
- Verify: cited feature matrix with dated observations; supported-versus-unavailable test instances separated; explicit novelty and trademark caveats.
- Stop: no first-in-world claim; owner decides scope before 01. No product code.

**Phase 01 — Architecture and security decisions**
- Do: Choose MV3 components, isolated vs MAIN-world boundaries, minimum consent and retention model, trust boundaries, Odoo adapter strategy and telemetry policy. Record actual architecture alternatives and decisions.
- Deliver: `docs/ARCHITECTURE.md`, `docs/SECURITY_PRIVACY.md`, relevant entries in `02_ARCHITECTURE_DECISIONS.md`.
- Verify: sequence/data-flow review; prohibited data list; origin/tab binding and injection limits; current package/framework support verified rather than assumed.
- Stop: unresolved overbroad permissions or lack of a safe local-first design.

**Phase 02 — MV3 project scaffold and installation README**
- Do: Initialize an appropriate strict-TypeScript MV3 extension project (WXT/React candidates only after verification), an inert popup, lint/typecheck/unit tests, build scripts, and optional scoped CI. Preserve existing repository content and use small dependency changes.
- Deliver: runnable unpacked Chrome build, truthful root `README.md` with **exact, tested** clone prerequisites, Node/package-manager version, dependency install, dev/build/test commands, loading via `chrome://extensions` (Developer mode), permission overview, basic troubleshooting, status and supported-version caveats.
- Verify: clean build/lint/typecheck/tests; manual unpacked-extension launch, exact path to output build directory; manifest permission audit; README command reproducibility.
- Stop: no capture features or speculative README setup commands.

**Phase 03 — Permission request and recording consent**
- Do: Detect user-selected active tab, request narrowly scoped origin access only after gesture, show what is collected and verify active host/site before approval. Implement clear rejection/unavailable states.
- Deliver: permission UI, testable consent policy and permission documentation.
- Verify: no unconsented collection, no `all_urls` wildcard default, unrelated site and wrong-tab denials, revocation and failed permission paths.
- Stop: never request full browsing history or powerful permissions as a shortcut.

**Phase 04 — Session lifecycle and bounded persistence**
- Do: Implement typed state transitions (`idle`, `permission_pending`, `recording`, `paused`, `stopped`, `error`), unique session/tab binding, service-worker restart recovery, limit counts/bytes/age and clear/delete functions.
- Deliver: controlled session state and bounded local storage plus test fixtures.
- Verify: tab close, worker suspend/restart, origin navigation, revoked consent, expiry, pause/stop/no-capture invariants; deletion removes local evidence.
- Stop: never silently resume a recording without verified consent and visible indicator.

**Phase 05 — Safe user-action and navigation events**
- Do: Record minimal action type, timestamp and conservative non-sensitive target classification; redact routes and URLs before storage. Exclude inputs, text, business labels and unstable selectors by default.
- Deliver: action event capture using the session contract.
- Verify: click/navigation fixture; sensitive input and record-name fixtures; listener teardown; event boundedness.
- Stop: do not capture form values, keystrokes, raw DOM HTML or customer identifiers.

**Phase 06 — Client exception capture**
- Do: Observe permitted uncaught errors and unhandled rejections with safe categorizations and redaction; do not promise capture of swallowed Odoo errors.
- Deliver: normalized JS error events; trace-quality/visibility flags.
- Verify: synthetic JS throw and rejected promise, error message with fake tokens and PII, frames/origin guard, teardown.
- Stop: no indiscriminate logging of console contents or full stack/local variables.

**Phase 07 — Network outcome metadata**
- Do: Evaluate minimum-permission browser-visible status, timing, request class and cancellation events; document whether `webRequest` is justified and not a response-body API.
- Deliver: network metadata monitor (or documented safe fallback), limited data policy.
- Verify: successful/failed/redirected concurrent synthetic requests, no header/body persistence, wrong-tab exclusion and permission revocation.
- Stop: no network interception that blocks, reroutes or edits Odoo actions.

**Phase 08 — RPC envelope research and safe observer**
- Do: Prototype the least-invasive, opt-in Odoo-specific `fetch`/XHR instrumentation only if needed to classify HTTP-200 JSON-RPC failures. Prefer a minimal observer; test `MAIN` world risks, content-script messaging and restoring native semantics. Distinguish external JSON-2 from internal browser controller traffic.
- Deliver: measured feasibility report and one of: safe narrow implementation, metadata-only fallback, or justified deferral.
- Verify: synthetic HTTP 200 + application-error response; false positive; concurrency; patch collisions; promise rejection semantics; bounded parsing; no raw request/response storage; zero capture on pause.
- Stop: unsafe wrapping, CSP failures, secret visibility or measurable functional interference triggers fallback/NO-GO.

**Phase 09 — Odoo identification and capability registry**
- Do: Detect Odoo-like pages, report version only from safely visible evidence with `verified`/`reported`/`inferred`/`unknown`; introduce per-feature capability statuses and generic fallback.
- Deliver: typed registry and user-visible detection confidence.
- Verify: spoofed/unrecognized page, custom clients, version string absent, wrong version claims; no privileged probing.
- Stop: version detection alone must not imply that any adapter works.

**Phase 10 — Modern Odoo adapter fixtures**
- Do: Build small isolated adapter tests for available Odoo 17–20 web-client patterns, always with generic fallback. Where actual instances are absent, create synthetic samples labeled **fixtures only**.
- Deliver: version-specific adapter modules, fixture provenance, preliminary per-feature support matrix.
- Verify: controlled fixtures + legitimate running instance smoke tests *when authorized*; no database writes beyond manual owner-approved test actions.
- Stop: never label a version **Verified** solely because a synthetic fixture passed.

**Phase 11 — Evidence schema and normalization**
- Do: Introduce stable normalized event fields, schema version, evidence provenance (`observed`, `derived`, `user-stated`, `unavailable`, `hypothesis`) and migration policy; normalize only supported signals.
- Deliver: typed JSON-compatible schema, validators, unit tests, provenance examples.
- Verify: fixture round-trips, malformed messages, unknown event fields, version mismatches and drop-count/missing-signal representation.
- Stop: do not invent model/method/record/file names where absent.

**Phase 12 — Action-to-request correlation**
- Do: Connect eligible user actions to RPC/network outcomes by reliable IDs when available; otherwise use bounded temporal heuristics with explicit ambiguity.
- Deliver: deterministic correlation engine and explainable links.
- Verify: overlapping clicks, background polling, retries, mixed tabs, clock skew, no network signal; tests prove conservative unmatched outputs.
- Stop: never call proximity proof of causation.

**Phase 13 — Rule-based diagnosis**
- Do: Add minimal diagnostic rules for access exceptions, backend RPC failure, Owl client failures, missing assets, no eligible request, timeout/offline. Keep checks separate from observations and unknowns.
- Deliver: rules registry with `ruleId`, evidence IDs, limitations and confidence labels.
- Verify: positive and counterexample fixtures per rule, unknown category, safe messages, source links, no AI calls.
- Stop: never assert root cause or file/line without evidence.

**Phase 14 — Investigation UI and case notes**
- Do: Build timeline filtering, diagnostics evidence links, user-stated expected/actual, editable notes, gap indicators and accessible status/permission explanations.
- Deliver: responsive investigation experience with tests.
- Verify: session switching, empty cases, slow/large cases, keyboard navigation, correct separation of user assertions and captured facts.
- Stop: no injected Odoo page UI unless separately justified; no unsanitized HTML rendering.

**Phase 15 — Reviewed Markdown and JSON export**
- Do: Generate sanitized versioned Markdown and machine-readable JSON from the same case; show an explicit preview and field-level exclusions. Allow local download after approval only; no upload.
- Deliver: validated export schema, redaction reports, import-compatibility decision (import may be deferred), sample synthetic case.
- Verify: URLs with secrets, user notes with credentials, fake PII, XSS strings, megabyte limits, export-after-delete, deterministic output.
- Stop: unsafe redaction or unreviewable payload blocks exporting affected content.

**Phase 16 — AI-free MVP end-to-end acceptance**
- Do: Review complete journey: consent → reproduce issue → capture → evidence-backed hint → handover export. Fix only blocking defects.
- Deliver: MVP acceptance report, exact feature/version support statement, user installation and reproduction walkthrough.
- Verify: automated suite plus unpacked Chrome smoke test on authorized Odoo systems where available, no background capture, network exfiltration check and read-only test policy.
- Stop: do not claim MVP complete if sensitive evidence leaks or if crucial gates were skipped.

**Phase 17 — Environment and version comparison**
- Do: Compare two previously captured local cases using normalized action classes, RPC categories and capability-aware divergence; support environment aliases and data uncertainty.
- Deliver: A/B diff engine and UI with comparison export.
- Verify: same workflow, actual divergence, unmatched steps, different Odoo versions, background traffic and unavailable signals.
- Stop: do not claim root-cause equivalence, schema equality or identical databases.

**Phase 18 — Legacy adapter expansion and support matrix**
- Do: Expand to versions 8–16 only where fixtures/test instances allow; use four-tier strategy from Section 4. Prioritize available real environments and mark the rest fallback/unknown.
- Deliver: version-adapter increments, dated, feature-by-feature support matrix and known limitations.
- Verify: automated regressions per supported signal and owner-authorized real instance smoke tests; track Community/Enterprise/hosting when known.
- Stop: do not claim 'works on all Odoo versions' as an unqualified certification.

**Phase 19 — Security, performance and resilience**
- Do: Threat-model review, permission audit, import/export fuzzing, high-event-load handling, memory caps, MV3 worker churn and collision/noninterference tests.
- Deliver: security audit results, performance evidence, privacy language and remediation list.
- Verify: synthetic secrets, malicious page messaging, cross-origin frames, 1000+ events, manual browser profiling and regression suite.
- Stop: critical security/functional regressions block release until addressed.

**Phase 20 — Release readiness and README completion**
- Do: Finalize README with installation, setup, Chrome unpacked procedure, permission behavior, user guide, build/update/uninstall, data deletion, troubleshooting and troubleshooting evidence. Prepare archive/listing/changelog after branding, license and privacy review.
- Deliver: reproducible build, release checklist and rollback steps; Chrome Web Store submission package if explicitly requested.
- Verify: clean-install walkthrough by a second developer where possible, fresh dependency install, test gates, honest supported-version list, no secret data in package.
- Stop: no auto-push, store upload, deployment or public claims without owner approval.

**Phase 21 — OPTIONAL Plemo integration discovery only**
- Do: Read-only assessment of real Plemo inputs, auth, project/source visibility, company privacy policy and native overlapping capabilities. Compare **manual file import** versus authenticated company gateway versus actual supported direct API; define versioned payload with consent and response provenance.
- Deliver: feasibility memo, minimal technical contract and owner decision; maintain future adapter boundary but do not embed service credentials in browser packages.
- Verify: concrete tool/API evidence, least-privilege data-classification workflow, consent/revocation and audit requirements, clear limitations.
- Stop: this phase DOES NOT implement a live Plemo link, modify Plemo, create skills or grant authority to change Odoo. If a Plemo skill is requested separately, consult the approved Plemo skills workflow and its mandatory read-only native-capability questionnaire first.

### 10.4 Per-phase evidence and move-forward rules

Every phase (including DB) must have a **single current phase report** in `docs/Phases/` containing objective, initial Git HEAD/branch/status, approved scope, exact changed files, implementation notes, commands and results (PASS/FAIL/SKIP + reason), real-Odoo compatibility evidence or `NOT TESTED`, security/privacy review, known limitations, owner decisions, and next single step.

A phase can be marked **COMPLETE** only after ChatGPT reviews Codex's response **and** the durable phase documents and available repository/test evidence. If ChatGPT has no direct access to the local repository, it must ask the owner to paste the needed outputs or upload the relevant documents rather than pretend to have inspected them. Mark `BLOCKED` or `PROVISIONAL` when evidence is missing. **Do not generate the next implementation phase prompt while the current phase is unverified.**

After a confirmed completion, ChatGPT supplies a **specific multi-paragraph Git commit message and safe commands** (`git status`, `git diff --check`, `git add <exact paths>`, `git commit`, `git push` for the confirmed branch). Owner commits and pushes manually unless separately and expressly authorizing another workflow. Never mask pre-existing unrelated modifications. Distinguish committed from pushed and verify push only from actual evidence.

### 10.5 Legacy plan correspondence (version 1.0 → version 2.0)

The former 13 broad phases are intentionally split into 22 focused phases. This is **sequencing refinement**, not a change in the product's original safety constraints:

| v1.0 phase | v2.0 focused phases |
|---|---|
| 0 discovery | 00–01 |
| 1 workspace | 02 |
| 2 session controls | 03–04 |
| 3 generic capture | 05–06 |
| 4 RPC observation | 07–08 |
| 5 adapters and normalization | 09–11 |
| 6 timeline and rules | 12–14 (UI included) |
| 7 case/editor/export | 14–16 (MVP gate) |
| 8 comparison | 17 |
| 9 compatibility | 18 |
| 10 hardening | 19 |
| 11 release | 20 |
| 12 Plemo optional | 21 |

## 11. Product README Installation and Setup Contract

**README.md lives at the Git repository root** and is the primary installation/setup guide for humans; planning and evidence files reside in `docs/`. During DB, the README must plainly state **project not runnable yet** if scaffold has not been created. From Phase 02 onward, installation steps MUST be validated against the actual local project and updated whenever scripts, permissions or packaging change. Never invent terminal commands or output directories.

Required README sections (in this order or a more readable equivalent):

1. Product name, concise value proposition, affiliation/trademark disclaimer as needed; project status and maturity.
2. Core functionality and **planned vs actually available** distinctions; no unsupported "AI-powered" language.
3. Minimum browser and OS requirements, Node and package-manager versions pinned to actual manifest/lockfile, required permissions and why.
4. Developer setup on a fresh clone: actual Git URL; checkout/branch convention; dependency installation; local build/dev/typecheck/lint/test commands **as tested**, exact generated directory path.
5. Load the unpacked extension via `chrome://extensions` → enable **Developer mode** → **Load unpacked** → select verified build directory; optional pin icon instructions.
6. How to grant a specific Odoo domain permission, start/pause/stop an investigation, review/redact/download a case and delete local data (only once these features exist).
7. Odoo compatibility table linking `docs/SUPPORT_MATRIX.md`, feature-level versions and untested combinations; never advertise universal certification.
8. Security and privacy: local-first, explicit per-tab consent, no AI/core network transfer, no raw credentials/record values, data retention caveats, redaction limitations.
9. Development workflow and available tests; contribution/security-reporting policy (once owner chooses).
10. Troubleshooting (`extension not visible`, missing permission, no events, RPC error with HTTP 200, absent Odoo version signal, service worker restart, reload/rebuild), with only steps proven valid.
11. Update/rebuild/reload, uninstall and local data deletion, actual behavior verified in tests.
12. Version, changelog, license (only after owner chooses), support contacts (never invent).

Keep README accurate at every phase. Before Phase 02 it is acceptable to mark install commands **NOT YET AVAILABLE**; do not present planned commands as working instructions. Phase 20 validates the end-to-end guide on a clean clone/browser profile.

## 12. Testing Plan and Measurable Success

### Automated tests

- **Unit:** event parsing, redaction, rules, normalizer, adapters, correlation, comparison, schema versioning.
- **Integration:** content script ↔ isolated bridge ↔ service worker ↔ storage ↔ UI; worker restart and permission changes.
- **E2E:** extension installed on controlled fixture pages and authorized Odoo test instances; successful reproduction, no-recording-before-consent, export/import.
- **Security:** common secret formats, customer data samples (synthetic only), malicious pages/messages, HTML/script injection, large input, cross-tab confusion.
- **Regression:** each verified Odoo version × supported feature; record environment and exact test date.
- **Noninterference:** same Odoo action produces the same server result with and without the extension; bounded timing overhead; no user-visible errors introduced.

### Initial product success indicators (targets to validate, not measured results)

- A teammate who was not present can reproduce a seeded issue from the generated case without a live explanation.
- 100% of emitted diagnostic findings link to specific stored evidence IDs.
- All exported cases pass a synthetic secret and PII leak scanner; manual review still remains necessary.
- No background capture or external transmission without explicit consent.
- The majority of initial Odoo 17–20 smoke fixtures behave as expected; set numerical version-coverage targets only after acquiring test instances.
- Relative performance overhead is measured; gate against user-visible degradation, not an invented percentage.

## 13. Repository Layout, Mandatory Progress Records, and Continuity Protocol

### 13.1 Expected structure (adapt existing repo; never overwrite unrelated material)

```text
odoo-tracebridge/                         # Actual clone path supplied by owner; do not assume this folder name
├── README.md                            # Detailed, tested human installation/setup guide at repository root
├── docs/
│   ├── Odoo_TraceBridge_Complete_Implementation_Blueprint.md  # Canonical specification, copied into repo in DB
│   ├── Odoo_TraceBridge_New_Chat_Instructions.md              # Coordinator instructions, optional copy in DB
│   ├── 00_PROJECT_STATUS.md              # One concise current truth and phase ledger
│   ├── 01_MASTER_PLAN.md                 # Phase 00–21 scope, sequence, criteria, dependencies
│   ├── 02_ARCHITECTURE_DECISIONS.md      # Dated ADR-like decisions, rejected options and reasons
│   ├── 03_CHANGELOG.md                   # Chronological factual changes, not marketing claims
│   ├── 04_TEST_EVIDENCE.md               # Exact test/build/runtime/version evidence
│   ├── 05_BLOCKERS_AND_DECISIONS.md      # Open questions, constraints, explicit owner decisions
│   ├── 06_DEPLOYMENT_RUNBOOK.md          # Build/install/release/manual rollback, not automatic deployment
│   ├── 07_HANDOFF.md                     # Where the next ChatGPT/Codex chat resumes
│   ├── PRODUCT_SCOPE.md                 # Added in Phase 00
│   ├── COMPETITOR_MATRIX.md             # Added in Phase 00
│   ├── FEASIBILITY.md                   # Added in Phase 00
│   ├── SUPPORT_MATRIX.md                # Created in Phase 00; per-version/per-feature evidence
│   ├── ARCHITECTURE.md                  # Added in Phase 01
│   ├── SECURITY_PRIVACY.md              # Added in Phase 01
│   └── Phases/                          # Exactly capital P as requested
│       ├── PHASE_DB_DOCUMENTATION_BOOTSTRAP.md
│       ├── PHASE_00.md
│       ├── PHASE_01.md
│       └── ... PHASE_21.md              # Create each report as its phase begins; no fake completion
├── src/                                 # Introduced incrementally beginning Phase 02
│   ├── background/
│   ├── content/
│   ├── capture/
│   ├── adapters/
│   ├── normalization/
│   ├── analysis/
│   ├── comparison/
│   ├── reporting/
│   ├── storage/
│   ├── security/
│   └── ui/
├── tests/                               # Introduced as required by phases
│   ├── fixtures/
│   ├── unit/
│   ├── integration/
│   └── e2e/
└── .github/workflows/                   # Only if approved and justified
```

**Directory decision:** Place the eight exactly named progress files under `docs/`, not in a separate path outside Git. This makes them visible to collaborators and handoff chats when shared. `docs/Phases/` uses the owner-requested capitalization. If the owner requests a separate documentation workspace, record an explicit ADR and stable location before bootstrap. Never write secrets, raw RPC captures or sensitive customer data to versioned documentation.

### 13.2 File-by-file minimum contract

| Artifact | Mandatory content | Initial state | Update trigger |
|---|---|---|---|
| `00_PROJECT_STATUS.md` | Overall status; `DB` gate; current phase ID; `n/22`; current task status; latest verified HEAD/branch and Git sync status; next owner action | `DB NOT STARTED`, `0/22`, repository values `UNKNOWN` until verified | Every Codex execution and review, **last** |
| `01_MASTER_PLAN.md` | Full fixed 22-phase index, scopes/gates/dependencies, current phase marker; scope revisions cross-referenced to decisions | 00–21 `NOT STARTED`, Phase 21 `OPTIONAL` | Every phase transition |
| `02_ARCHITECTURE_DECISIONS.md` | Decision ID, date, problem, alternatives, evidence, choice, tradeoffs, owner/approval state | Initial candidate decisions clearly `PROPOSED` | Each material design/scope decision |
| `03_CHANGELOG.md` | Timestamp, phase, actual changed files/functions, behavior and side effects; don't describe unimplemented work as done | Bootstrap entry only | Every applied change |
| `04_TEST_EVIDENCE.md` | Test ID, phase, command, env/date, observed result, PASS/FAIL/SKIP, log/file references; distinguish synthetic/real Odoo | No tests run | Every check/test |
| `05_BLOCKERS_AND_DECISIONS.md` | Blocker IDs, severity, affected phase, required decision, owner, resolution and evidence | Missing repo/path/test instances noted until supplied | Whenever unknown/blocker/decision changes |
| `06_DEPLOYMENT_RUNBOOK.md` | Local build, unpacked install, release prerequisites, rollback, permissions and privacy; status-gated steps | `NOT DEPLOYABLE`, no invented commands | Phases 02, 16, 20 and whenever setup changes |
| `07_HANDOFF.md` | Concise verified state; current/next task, repo URL/path, branch/HEAD, docs to read, blockers, Codex chat reuse/new recommendation, verification commands | Initial bootstrap context | Every execution **second last** |
| `Phases/PHASE_XX.md` | Objective, scope, files, exact actions, evidence, gate decision, blockers, human review, suggested next step | Create when phase begins; never fabricate passes | Every interaction with that phase |

**Ordering contract:** When Codex finishes a task, update detailed phase report first, then decisions/changelog/test evidence/runbook/master plan, then **`07_HANDOFF.md` and `00_PROJECT_STATUS.md` last**, reflecting the final verified state. Ensure initial and final Git status are documented. If the task fails, preserve truthful `BLOCKED` or `IN PROGRESS` rather than forcing completion.

### 13.3 Mandatory phase report template

Use this exact skeleton with meaningful detail, omitting no heading. Unsupported checks must say `NOT TESTED` or `SKIPPED — <reason>` rather than pretending to have passed.

```markdown
# PHASE_XX — <name>

## Scope and owner authorization
- Planned objective / in scope / explicitly out of scope
- Inputs: GitHub URL, clone path, branch, baseline HEAD, authorization notes

## Execution summary
- Status: NOT STARTED | IN PROGRESS | BLOCKED | PROVISIONAL | COMPLETE
- Files added/edited/deleted (exact paths)
- What changed and why; integration boundaries touched

## Verification evidence
| Check | Exact command/action | Environment | Result | Evidence / limitation |
|---|---|---|---|---|
- Automated test pass/fail/skip counts, build/lint/typecheck results
- Manual Chrome evidence; exact Odoo version(s)/edition/environment tested, if any
- Synthetic fixtures distinctly identified
- Security/privacy/noninterference review

## Open risks, blockers and decisions
- IDs / owner / follow-up; failures and unresolved assumptions

## Acceptance decision
- Gate criterion-by-criterion PASS/FAIL/UNKNOWN
- Accepted by ChatGPT review? UNREVIEWED until checked
- Ready for next phase? NO until accepted

## Git and next step
- Branch, starting/ending HEAD, dirty/staged files, whether commit/push verified
- One next phase or corrective microtask only
```

### 13.4 State and evidence labels

- **Phase states:** `NOT STARTED`, `IN PROGRESS`, `PROVISIONAL`, `BLOCKED`, `COMPLETE`, `DEFERRED` (optional track only). `COMPLETE` requires acceptance evidence reviewed and confirmed.
- **Evidence:** `TESTED ON REAL ODOO`, `TESTED ON SYNTHETIC FIXTURE`, `STATIC REVIEW`, `NOT TESTED`, `UNAVAILABLE`. This prevents synthetic coverage masquerading as real-world certification.
- **Git:** `FILES CREATED`, `COMMITTED LOCAL`, `PUSHED REMOTE`, `INSTALLED UNPACKED`, `PUBLISHED CHROME WEB STORE`, `PLEMO ACTIVE` must be tracked as independent states.
- **Freshness:** Always read the live remote/working tree when available; the documents may lag and must be reconciled, not trusted blindly.

## 14. ChatGPT ↔ Codex Execution Protocol

### 14.1 Coordinator responsibilities

ChatGPT is **the project coordinator and reviewer**. Codex Desktop is **the phase-specific implementer**. The owner is the **human approver and Git operator**. A Codex chat response is not proof that the repository changed until supported by actual files/commit/check outputs.

**First reply in a new ChatGPT chat:** after reading this specification and the companion new-chat instructions, the assistant must **ask only for the two missing required identifiers**, unless already provided in that chat:

> Please share (1) your new GitHub repository URL and (2) the exact absolute local path of its already-cloned working copy. I will use them verbatim in every Codex prompt. I will not propose or start any implementation until both are available; the first Codex task will bootstrap the project documentation, not build features.

Once both are supplied, generate **only Step DB**'s Codex prompt. The prompt must tell Codex to verify path, remote, branch, README, and working tree *without cloning*; create the eight documents, `docs/Phases/PHASE_DB_DOCUMENTATION_BOOTSTRAP.md`, a truthful root `README.md`, and copies of these reference Markdown artifacts (where available); verify MD structure and links; make no product-code/dependency changes; never auto-commit or push. ChatGPT must review results before Phase 00.

**Each subsequent coordinator cycle:**

1. State current stage and phase ledger `n/22 completed`, plus optional Phase 21 status and precise next gate.
2. Read latest `00_PROJECT_STATUS.md`, `07_HANDOFF.md`, `01_MASTER_PLAN.md`, active phase report, `04_TEST_EVIDENCE.md`, `05_BLOCKERS_AND_DECISIONS.md` and real repository/Git outputs when accessible. Explicitly call out missing evidence.
3. Choose the **single next executable unit** (corrective microtask or one phase), not a bundle of phases; identify accept/reject criteria and files allowed to change.
4. Supply a short, ready-to-paste **Codex Desktop prompt**, containing **exact GitHub URL and clone path** and verified branch, target files, constraints, tests, document update order and `<150 words` final reply requirement.
5. **Immediately after each generated Codex prompt**, provide a **Codex configuration block**: model name actually available/verified in Codex Desktop or an explicit candidate subject to confirmation; thinking effort (Medium/High/Extra High when supported); `SAME chat` or `NEW chat`; rationale and context-risk note.
6. End the turn with the **exact request to paste Codex's concise response and, when needed, the updated phase report/test evidence**. Do not initiate or present the next phase until those results arrive and have been reviewed. Do not imply background monitoring.
7. When a phase is confirmed `COMPLETE`, supply the **phase-specific proposed Git commit subject and detailed body**, exact changed-path `git add` commands and branch-safe manual push commands. If Git state is unknown, show a review/verification prerequisite instead of fabricating file paths.
8. If blocked, provide a focused correction prompt, keep phase status blocked, document the reason, and **do not** issue completion commit or progress to the next phase.

**Important:** The user's instruction to "wait for Codex" means **end the current reply after issuing the one prompt**, then respond after the owner returns with Codex output. Do not claim you are running code asynchronously or schedule background completion.

### 14.2 Codex model / reasoning-effort / context guidance

Model labels and available efforts change. Verify the current Codex Desktop picker whenever possible, and **never confidently name an unavailable model**. Favor the latest currently available coding-specialized model, with effort proportionate to the task. Suggested starting recommendations:

| Phases | Recommended model profile | Thinking effort | Codex chat policy |
|---|---|---|---|
| DB, 00, 02, 05, 14, 20 docs | Current capable Codex coding model | Medium | New for DB; new when changing major subsystem or context is dense |
| 01, 03, 04, 06, 07, 09, 10, 11, 15, 17, 18 | Strongest available Codex coding model | High for security-sensitive scope; Medium otherwise | Reuse same chat for small immediately related correction, otherwise new at phase boundary |
| 08, 12, 13, 16, 19, optional 21 | Strongest supported reasoning/coding model in Codex Desktop | High; Extra High if supported and justified | Prefer **new** chat and feed current handoff files |

**On every prompt**, write a concrete choice (e.g., `Codex model: <exact visible model name or "verify model picker">`, `Thinking effort: High`, `Chat: NEW`) rather than only referencing this table. Use Medium for routine isolated edits; reserve High/Extra High for instrumentation, concurrency, security, diagnosis and cross-version correctness. If the exact model menu is unknown, ask for the picker contents once, or give a clearly labeled conditional choice with no invented entitlement.

**Context strategy:** New Codex chat for DB, major architecture jumps, high-risk phases or when the current chat carries unrelated history. Reuse for a correction to the **same phase** only when the context is still compact. Every fresh chat must start by reading repository `README.md`, the eight progress files, current `docs/Phases/PHASE_XX.md`, the canonical blueprint and `07_HANDOFF.md`. Never expect prior chat context to substitute for repository evidence.

### 14.3 Universal Codex prompt template (coordinator must specialize each time)

```text
Odoo TraceBridge — <DB or Phase XX only>
GitHub repo: <OWNER-SUPPLIED EXACT URL>
Local clone path: <OWNER-SUPPLIED EXACT ABSOLUTE PATH>
Verified branch/base HEAD: <VERIFIED VALUES or VERIFY READ-ONLY FIRST>

Read README.md, docs/Odoo_TraceBridge_Complete_Implementation_Blueprint.md,
docs/00_PROJECT_STATUS.md, docs/01_MASTER_PLAN.md,
docs/02_ARCHITECTURE_DECISIONS.md, docs/04_TEST_EVIDENCE.md,
docs/05_BLOCKERS_AND_DECISIONS.md, docs/07_HANDOFF.md,
and docs/Phases/PHASE_XX.md if present. If missing, record and handle only within scope.

Objective: <ONE SMALL SCOPE>
Deliverables / allowed paths: <EXACT SCOPE>
Prohibited: unrelated refactors, sensitive live Odoo/customer data, unauthorized writes,
production actions, premature Plemo connection, claiming untested versions, automatic git commit/push,
Chrome Web Store publication, unsafe permissions or hidden telemetry.

Verification: <EXACT FIT-FOR-SCOPE TESTS + acceptance gates>; report NOT TESTED explicitly.
Durable records: update phase report and evidence first, relevant master/ADR/changelog/runbook,
then docs/07_HANDOFF.md and docs/00_PROJECT_STATUS.md LAST.
Report initial and final git status/HEAD, changed paths, checks, blockers and truthfully tested versions.

Final Codex chat response: NO MORE THAN 150 WORDS. Include only status, changed files,
checks with counts, blocker, Git commit/push state, next phase recommendation.
Stop after this single stage/phase; do not start the next phase.
```

**For Step DB** the reference blueprint and docs may not yet be copied into the repo. The DB prompt must read the attached/source files supplied to Codex, create the target records and avoid treating missing progress files as failures.

### 14.4 Review-and-commit protocol

**When Codex replies:**
- Verify reported file changes exist, no unauthorized changes, tests actually ran, proper PASS/FAIL/SKIP labels, no secret leaks, README truthful, docs updated and handoff/status synchronized.
- If the current platform cannot inspect the owner's local filesystem, ask for uploads/pasted relevant reports and Git summaries. Don't infer completion from a one-paragraph claim.
- Decide explicitly **ACCEPTED / BLOCKED / NEEDS EVIDENCE**, and update completed count only when accepted.
- **Only for ACCEPTED:** generate Git message and commands tailored to changed paths. Example structure:

```bash
git -C "<EXACT LOCAL CLONE PATH>" status --short --branch
git -C "<EXACT LOCAL CLONE PATH>" diff --check
# Review actual diff and select only phase-specific verified paths.
git -C "<EXACT LOCAL CLONE PATH>" add -- <EXACT REVIEWED FILE 1> <EXACT REVIEWED FILE 2>
git -C "<EXACT LOCAL CLONE PATH>" diff --cached --stat
git -C "<EXACT LOCAL CLONE PATH>" diff --cached --check
git -C "<EXACT LOCAL CLONE PATH>" commit -m "<type>: <actual result of phase>" \
  -m "<Concrete implementation/change details; no marketing claims>" \
  -m "<Verification performed, compatibility/privacy boundary, and documentation update>"
# After confirming the intended remote/branch:
git -C "<EXACT LOCAL CLONE PATH>" push -u origin <VERIFIED BRANCH>
```

Never stage an unrelated `.env`, local Odoo database, sensitive logs, screenshots with customer data, credentials, or generated build artifacts not intended for Git. Whether generated release packages belong in the repo is an explicit owner decision. If the project uses PRs/protected branches, follow that verified branch policy. **ChatGPT proposes; owner executes.**

### 14.5 Mandatory new-chat handoff

Any new ChatGPT/Codex chat should be given:

1. This canonical blueprint and its companion `Odoo_TraceBridge_New_Chat_Instructions.md`.
2. `README.md` and current `docs/00_PROJECT_STATUS.md` plus `docs/07_HANDOFF.md`.
3. The active `docs/Phases/PHASE_XX.md`, `docs/04_TEST_EVIDENCE.md`, `docs/05_BLOCKERS_AND_DECISIONS.md`, and other docs needed by the phase.
4. Exact GitHub URL, clone path, verified branch and HEAD; no assumptions across chat boundaries.
5. Most recent Codex short reply **with corroborating records**, not the reply alone.

If the new chat receives only partial files, state what cannot be independently verified before claiming progress. Avoid redoing verified phases without a reproducible reason or an owner-authorized scope change.

## 15. Risks, Open Decisions, and Stop/Go Rules

| Risk / open decision | Current status | Decision / mitigation |
|---|---|---|
| "First extension with this idea" | **Unverified; overlapping products exist** | Phase 0 competitor matrix; avoid absolute marketing claim |
| All Odoo versions | **Goal, not certified** | Feature-level test matrix, generic fallback, no green badge without evidence |
| Real-world Odoo test instances | **Unknown** | Owner supplies or authorizes fixtures/test systems; no scraping of customer sites |
| MAIN-world observer stability and sensitive data | **Technical/security risk** | Least-invasive spike, strict extraction, message validation, noninterference gate |
| Odoo browser RPC and external API changes | **Version-dependent** | Observe supported web-client behavior, don't require external API subscriptions |
| Plemo agent connectivity and auth | **Unknown** | Phase 12 assessment; file handover first, no API invented |
| Privacy/legal/store review | **Not completed** | Phase 10/11, owner/legal review and truthful store disclosures |
| Branding / copyright / license | **Not determined** | Owner decides before public release |
| CI, Git remote, platform credentials | **Not supplied** | Discover/confirm before acting; never assume |
| Production safety and customer confidentiality | **Mandatory** | Default off; per-case redaction; no direct writes or automatic actions |

**Stop implementation immediately** if a phase requires unauthorized credentials, access to a customer instance without permission, raw secret capture, invasive injection that changes Odoo behavior, unsupported blanket version claims, or undocumented data transmission. Fall back to safer capture modes and document the limitation.

## 16. Official and Competitor Reference Links (verified on October 20, 2026)

Use current documentation again at the phase where it becomes relevant; these links are reference inputs, not guarantees of API or market permanence.

1. Odoo official release notes (v20 released September 2026): https://www.odoo.com/page/release-notes
2. Odoo 20 framework overview: https://www.odoo.com/documentation/20.0/developer/reference/frontend/framework_overview.html
3. Odoo 20 JavaScript modules: https://www.odoo.com/documentation/20.0/developer/reference/frontend/javascript_modules.html
4. Odoo 20 external JSON-2 API: https://www.odoo.com/documentation/20.0/developer/reference/external_api.html
5. Odoo 20 external RPC API deprecation nuance: https://www.odoo.com/documentation/20.0/developer/reference/external_rpc_api.html
6. Chrome extension content script execution worlds: https://developer.chrome.com/docs/extensions/reference/manifest/content-scripts
7. Chrome `scripting` API and execution worlds: https://developer.chrome.com/docs/extensions/reference/api/scripting
8. Chrome `webRequest` API: https://developer.chrome.com/docs/extensions/reference/api/webRequest
9. Chrome DevTools network API and HAR limitations: https://developer.chrome.com/docs/extensions/reference/api/devtools/network
10. Chrome debugger API and warnings: https://developer.chrome.com/docs/extensions/reference/api/debugger
11. Chrome extension permissions (optional host permissions): https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions
12. Chrome Web Store user-data policy: https://developer.chrome.com/docs/webstore/program-policies/policies
13. Odoo Workbench Chrome Web Store listing (existing overlap): https://chromewebstore.google.com/detail/odoo-workbench/ofokmhonbnlahfageicjednphjheiodj

---

**End of planning baseline.** The correct first action is **Step DB: documentation bootstrap after repository details are supplied**, not implementing RPC hooks or integrating Plemo. Maintain this document as the initial scope source and track all deviations with dated decisions and test evidence.
