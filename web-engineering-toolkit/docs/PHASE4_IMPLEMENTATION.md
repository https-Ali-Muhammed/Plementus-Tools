# Phase 4 — Human Review & Reporting Usability Implementation

Completion date: 2026-08-28

## 1. Baseline

Phase 4 started from commit `ed4882280ecb44a95a0577cc4b8d210f0008fc64` on `develop` with a clean worktree. The Toolkit was `1.7.1`, mapping catalog `2026.08.26.3`, report schema `2.5.0`, finding/control schema `1.4.0`, evidence vault `4`, evidence manifest `1.2.0`, passive ZAP finding `1.1.0`, review workflow `2.0.0`, and lifecycle persistence `4`.

The baseline gates were 125/125 for `npm test` in 60.44 seconds, 80/80 for Phase 1 in 96.82 seconds, and 27/27 for Phase 3 in 30.38 seconds. Brave `151.1.93.134` was available at `/usr/bin/brave-browser`; launch, fixture navigation, PDF source navigation, and PDF rendering were available. The catalog contained 62 static mappings, six external registry frameworks, and 19 unique candidate controls.

## 2. Review/reporting audit result

The audit is recorded in `docs/PHASE4_REVIEW_REPORTING_AUDIT.md`. The live product already had a separate lifecycle overlay, explicit save actions, multiple reviewer records, stable finding/scope/mapping decision enums, reviewer labels/roles/timestamps, evidence-vault audit events, report refresh, progress counts, search/filtering, progressive HTML disclosure, and review fields in its public exports.

The demonstrated gaps were: no project revision concurrency contract; insufficient write bounds and spreadsheet formula safety; ambiguous mapping/scope targets; lifecycle history omitted from workflow output; limited deterministic triage; and weak early/cross-format separation of scan identity from review identity. No evidence, mapping, applicability, collection, or control semantic redesign was justified.

## 3. Existing capabilities retained

The implementation retains the existing decision vocabulary and explicit **Save review**, **Add review**, and **Update review** actions. It retains multiple independent reviewer records, atomic lifecycle persistence, evidence-vault audit events, project report refresh, immutable scan evidence, current report downloads, and legacy read-time normalization.

## 4. Selected Phase 4 gaps

- `P4-REV-001`: project workflow revision and stale-write protection.
- `P4-REV-002`: bounded input validation and mutable review-text export safety.
- `P4-REV-003`: targeted mapping and scope overlays.
- `P4-REV-004`: bounded revision/change history in workflow reports.
- `P4-UX-005`: review queue clarity and deterministic triage.
- `P4-RPT-006`: scan/review separation and compact cross-format review summary.

## 5. Review semantic changes

No duplicate disposition enums were added. Finding disposition remains `accepted_as_observation`, `false_positive`, or `requires_more_evidence`; scope remains `confirmed` or `not_confirmed`; mapping remains `confirmed` or `rejected`; and finding status remains `open`, `reviewed`, or `resolved`.

Review records may now carry a validated `mappingId` and `scopeFramework`. These fields identify the overlay target only. `mappingDecision = confirmed` means candidate relevance was accepted for review; it does not mean a control passed. `scopeDecision = confirmed` confirms review scope only; it does not establish legal applicability. False-positive decisions retain the finding, fingerprint, evidence, and provenance.

Every lifecycle record continues to expose `controlSatisfaction = not_determined`, `complianceConclusion = not_determined`, and `coverage = partial`. The scan summary remains `assessmentType = compliance_pre_assessment`.

## 6. Workflow persistence/revision changes

Lifecycle persistence schema `5` adds a bounded project state with `revision`, `updatedAt`, and at most 100 safe change entries. Initial scan reconciliation establishes revision 1. Each explicit saved add/update increments the project revision once. Review records and evidence-vault audit events carry the resulting revision.

Clients may send `expectedWorkflowRevision`. A mismatch raises HTTP `409 Conflict` with `currentRevision`; the stale write is not applied. Invalid data produces 400 and missing finding/reviewer records produce 404. The implementation uses optimistic concurrency only; it adds no locking.

Workflow schema `3.0.0` reuses the project revision and includes scan `generatedAt`, review `updatedAt`, current finding decisions, and bounded safe history. History contains object identity, action, target decision values, reviewer label/role, and time; it excludes notes, evidence content, credentials, session data, and restricted artifacts. Full report copies are not created for each edit.

## 7. Workspace usability changes

The one-column queue keeps its existing search and filters and adds disposition, collection-state, manual-review-reason, and deterministic sort controls. Sort options are severity, review state, review updated time, framework, and title; no AI or opaque ranking is used. Search now includes safe reviewer label/note, mapping IDs, and manual-review reason codes, never restricted evidence.

The workspace explicit-save form now supports finding, mapping, and scope decisions plus candidate mapping/framework targets. The client sends its expected revision and updates its local revision only after a successful save. Report History distinguishes scan time from review revision/update time and shows factual review progress.

## 8. Report usability changes

Current schema-3 HTML/PDF reports show scan-evidence time separately from review-overlay time/revision, plus compact factual review progress. The early summary labels this as workflow progress and explicitly says it is not a compliance, readiness, certification, or coverage score. Legacy reports without a Phase 4 workflow do not gain this extra layout, preserving prior pagination.

Finding details retain technical observation/evidence first and reviewer decisions as a separate block. Reviewer target IDs, labels, timestamps, and revisions remain compact. HTML continues to use expandable provenance and review controls; printable/PDF output contains the reviewer context without creating one page per decision.

XLSX adds a bounded `Review Queue` sheet with technical identity, workflow status, dispositions/targets, framework/control identifiers, safe source URL, manual-review reasons, reviewer note/label, time, and revision. Findings CSV remains findings-oriented and does not contain workflow history.

## 9. Mapping/scope review behavior

Candidate mapping IDs and frameworks are copied into lifecycle target inventories at scan reconciliation. A supplied mapping/framework target must exist in that inventory. When one target exists it may be inferred; when multiple exist an explicit target is required. Rejection never deletes the mapping record, catalog version, relationship, governance, prerequisites, or provenance. Scope review never rewrites automated/operator applicability.

## 10. Review progress/count behavior

One canonical `reviewSummary` reports factual totals for findings, reviewed/unreviewed work, finding dispositions, and mapping/scope decisions. It has no percentage or score. The summary explicitly retains `complianceConclusion = not_determined` and `controlSatisfaction = not_determined`.

## 11. Input safety

Write-time validation rejects unsupported decision/role values, missing decisions, missing reviewer/note, invalid targets, reviewer labels over 80 characters, notes over 4,000 characters, references over 200 characters, and more than 100 evidence references. Text remains Unicode-safe.

Server-rendered HTML/PDF escapes notes and labels; browser rendering uses safe text nodes. Mutable review fields beginning with `=`, `+`, `-`, or `@` (after control/whitespace prefixes) receive an apostrophe in CSV/XLSX exports. Technical source values are not rewritten. Tests include script/HTML fragments, formula prefixes, Arabic text, and length violations.

## 12. Legacy compatibility

Schema-4 lifecycle files remain readable with revision 0 and empty project history until a current scan/save establishes state. Legacy decision aliases retain conservative read-time migration. Historical summaries keep their evidence unchanged and receive existing conservative defaults. Reports without schema-3 review data retain their old early-page layout. No stored legacy file is rewritten merely to add defaults.

## 13. Schema/version changes

- Toolkit: `1.7.1` unchanged.
- Mapping catalog: `2026.08.26.3` unchanged.
- Report schema: `2.5.0` to `2.6.0` for canonical review summary/target identity.
- Workflow schema: `2.0.0` to `3.0.0` for project revision, scan/review identity, and bounded history.
- Lifecycle persistence: `4` to `5` for project revision/history state.
- Finding/control: `1.4.0` unchanged.
- Evidence vault: `4` unchanged.
- Evidence manifest: `1.2.0` unchanged.
- Passive ZAP finding: `1.1.0` unchanged.

No mapping, finding/control, evidence, manifest, or ZAP structural change justified another bump.

## 14. Tests

Phase 4 adds deterministic lifecycle/concurrency/immutability/validation tests, cross-format safety/legacy tests, and controlled browser responsive/runtime tests. After the post-validation runtime correction described in section 23, the final full suite passed 137/137 with zero failures and zero skips in 77.69 seconds. An earlier intermediate 134/135 run demonstrated a legacy PDF pagination regression; conditional Phase 4 presentation corrected it without weakening the pagination assertion.

Tests prove stale revision rejection, immutable technical identity, conservative outcomes after supported decisions, target validation, bounded history, HTML/formula injection handling, JSON/HTML/XLSX/CSV/workflow/metadata/manifest consistency, legacy readability, and 1440px/390px rendering without console/page errors or horizontal overflow.

## 15. Phase 4 validator

`npm run validate:phase4` composes the new review model, cross-format/input safety, workspace contract, controlled browser, and native PDF gates. It emits `PHASE4_VALIDATION_JSON` and classifies unavailable browser/PDF capabilities as environment skips. The post-fix run passed 25/25, with zero failures/skips. Its reported category runtimes totalled 31.08 seconds, including the scanner-backed workspace Run/render regression.

## 16. PDF/redaction

The native pagination/redaction suite passed 3/3. A separate reviewed PDF visual fixture was six pages, tagged, searchable/selectable, A4, 149,957 bytes, and contained exact machine strings for scan time, workflow revision, conservative conclusion, and control state. Visual inspection of the cover and reviewed-finding page found no clipping, horizontal overflow, sparse internal page, or malformed note wrapping. The post-fix controlled smoke PDF was 682,789 bytes.

Public outputs retain Phase 3 restrictions: no Authorization headers, passwords, session tokens, cookie/storage values, Playwright state, authenticated/request/response bodies, restricted screenshots, or raw sensitive ZAP content.

## 17. Browser/mobile validation

Brave launch/PDF capability was fully available. The reviewed report and live workspace result were exercised at 1440x1000 and 390x844. Both widths had `documentElement.scrollWidth <= innerWidth`; labelled native review controls remained present, malicious note content was inert, and there were no console errors or page errors. A controlled scanner-backed run completed mapping, rendered findings plus framework/control cards, and applied the manual-review-reason filter through the same frontend action as **Run technical pre-assessment**.

## 18. Three-tool smoke

The final standalone smoke passed separately:

- Compliance Mapping: passed; 13 findings; HTML/JSON/findings CSV/XLSX/PDF/manifest present; evidence local-filesystem-only.
- Lighthouse Reporter: passed; valid completed report; accessibility 85.
- Asset & Page-Weight Analyzer: passed; one-page metrics/report/XLSX present.

No Lighthouse or Asset Analyzer production file was changed for Phase 4.

## 19. Performance

Measured final values:

- `npm test`: 77.69 seconds.
- Phase 1 validation: 80/80; reported category runtimes totalled 106.60 seconds.
- Phase 3 validation: 27/27; reported category runtimes totalled 35.48 seconds.
- Phase 4 validation: 25/25; reported category runtimes totalled 31.08 seconds.
- Controlled scanner-backed workspace render test: 7,011 ms.
- Controlled Compliance assessment: 2,268 ms.
- Controlled Compliance report generation: 2,449 ms.
- HTML generation: 34 ms.
- PDF generation: 1,875 ms.
- Controlled PDF size: 682,789 bytes.
- Lighthouse smoke: 12,873 ms.
- Asset smoke: 2,357 ms.
- Standalone three-tool smoke: 22.04 seconds wall time.
- Focused review-save test operation: approximately 20 ms for the test containing two saves plus stale rejection; no production per-save timer exists.

The controlled smoke does not separately instrument crawl and browser/runtime sub-durations, so no separate values are claimed.

## 20. Deferred items

Phase 4 did not add accounts, SSO, roles/permissions enforcement, verified identities, assignments, approvals, email/Slack, task scheduling, automatic rescans, AI dispositions/ranking, arbitrary batch decisions, report snapshots per keystroke, distributed locking, restricted-evidence search, or another workflow database. It did not add or change active ZAP, API fuzzing, authorization differential testing, payment transactions, mapping semantics, applicability conclusions, or collection semantics.

## 21. Remaining limitations

Reviewer labels are operator-provided and unverified. Optimistic concurrency is local project revisioning, not multi-node coordination. Current report artifacts refresh to the latest overlay; prior full rendered reports are not retained, although bounded workflow change history remains traceable. Mapping/scope target validation is limited to candidates collected for the current finding. The workflow does not assign reviewers, request evidence automatically, or determine legal applicability/control satisfaction/compliance.

## 22. Phase 4 completion assessment

All six audit-selected gaps are implemented. Technical evidence remains immutable; review is a separately saved, revisioned overlay; stale writes and invalid inputs are rejected; target provenance remains intact; progress remains non-scored; current public formats are consistent and safe; legacy reports remain readable; PDF/browser gates are green; Phase 1 and Phase 3 remain green; and all three tools pass smoke validation.

Phase 4 is complete. The final deterministic package validation passed after this document was added. Completion does not mean the assessed organization is compliant, ready, certified, or that any control is satisfied.

## 23. Post-validation workspace runtime regression correction

A real workspace assessment run after the initial Phase 4 validation exposed `Mapping failed — reviewReasonLabels is not defined`. The Phase 4 finding renderer had been moved into the reusable top-level `renderFindingCard()` function, but it still referenced `reviewReasonLabels`, which was declared only inside `renderSecurityResults()`. Framework/control rendering remained inside that local scope; finding rendering crossed the lexical boundary and raised the `ReferenceError`.

The correction adds one reusable `securityReviewReasonLabels(reasons, definitions)` presentation helper with explicit inputs. Finding, framework, control, and filter-option callers now pass the current result's `reviewReasonDefinitions`; absent reasons/definitions are safe, and unknown legacy codes retain the existing `humanize()` fallback. No review, mapping, evidence, applicability, collection, control, or schema semantics changed, and no version was bumped.

The browser regression first reproduced the exact failure through the workspace **Run technical pre-assessment** action. It now verifies defined labels, unknown legacy fallback, absent definitions, absent reason arrays, manual-reason filtering, and 1440px/390px overflow/error behavior. A second scanner-backed controlled run verifies that mapping completes and real findings plus framework/control cards render through the same action. Final post-fix results were: full suite 137/137, Phase 1 80/80, Phase 3 27/27, Phase 4 25/25, and three-tool smoke passed, all with zero failures or skips.
