# Phase 4 — Human Review & Reporting Usability Audit

Audit date: 2026-08-28

Repository baseline: `ed4882280ecb44a95a0577cc4b8d210f0008fc64` (`develop`), clean worktree

Toolkit version: `1.7.1`

Mapping catalog: `2026.08.26.3`

This audit was completed before Phase 4 production changes. The Phase 1 validation model, Phase 2 evidence/mapping semantics, and Phase 3 bounded collection model are treated as validated baselines. Phase 4 evaluates only the mutable human-review overlay and its presentation.

## 1. Baseline validation and inventory

- Report schema: `2.5.0`
- Finding/control schema: `1.4.0`
- Evidence vault schema: `4`
- Evidence manifest schema: `1.2.0`
- Review workflow schema: `2.0.0`
- Lifecycle persistence schema: `4`
- Passive ZAP finding schema: `1.1.0`
- Static mappings: 62
- Registry frameworks: 6
- Unique candidate controls: 19
- `npm test`: 125 passed, 0 failed, 0 skipped; 60.44 seconds wall time
- `npm run validate:phase1`: 80 passed, 0 failed, 0 skipped; 96.82 seconds wall time
- `npm run validate:phase3`: 27 passed, 0 failed, 0 skipped; 30.38 seconds wall time
- Browser: Brave 151.1.93.134 at `/usr/bin/brave-browser`; launch, navigation, PDF source navigation, and PDF rendering available

The live checkout preserves `assessmentType = compliance_pre_assessment`, `complianceConclusion = not_determined`, `controlSatisfaction = not_determined`, and `coverage = partial`.

## 2. Current review architecture

The live path is:

```text
immutable scan evidence and technical findings
  -> SecurityLifecycleManager project/fingerprint records
  -> explicit review add/update action
  -> lifecycle JSON + evidence-vault audit event
  -> SecurityReportManager refreshes affected project reports
  -> workflow overlay applied to findings
  -> JSON / HTML / PDF / XLSX / findings CSV / workspace / Report History
```

The evidence vault has no approval/review mutation API. Review decisions are stored in `data/security-finding-lifecycle.json`, not in restricted evidence artifacts. Report regeneration applies a review overlay to public findings but does not rewrite scan evidence, hashes, fingerprints, source URLs, mapping catalog records, or scan timestamps.

## 3. Audit questions

### 3.1 What review functionality already exists?

The workspace has a one-column finding queue, client-side search, severity/category/review/framework filters, factual review counts, a reviewer-label field, per-finding note and decision controls, and an explicit **Save review** button. Generated HTML reports support adding multiple reviewer records and editing an individual record through explicit **Add review** / **Update review** submits. Saved actions refresh affected project reports.

### 3.2 Which states and decisions already exist?

The actual live vocabulary is:

- Finding status: `open`, `reviewed`, `resolved`
- Finding disposition (`reviewDecision`): `accepted_as_observation`, `false_positive`, `requires_more_evidence`
- Scope decision (`scopeDecision`): `confirmed`, `not_confirmed`
- Mapping decision (`mappingDecision`): `confirmed`, `rejected`
- Reviewer role labels: `reviewer`, `compliance_owner`, `legal_reviewer`, `external_reviewer`

Legacy overloaded values are conservatively migrated at read time. Phase 4 must not add synonymous values such as `needs_evidence` or `mapping_confirmed` as a second stored enum.

### 3.3 How are review changes persisted?

`SecurityLifecycleManager` writes an atomic temporary JSON file and rename. `addReview()` creates a UUID review record; `updateReview()` retains `createdAt`, writes a new `updatedAt`, and archives the prior review in `decisionHistory`. The older `update()` endpoint maintains a primary review projection for compatibility. Evidence-vault audit events record add/update/change actions.

### 3.4 How does Report History work?

`GET /api/reports` lists report directories by filesystem modification time. Compliance reports expose HTML, JSON, findings CSV, XLSX, PDF, and evidence-manifest links. A review save calls `refreshWorkflow({ projectName })`, which rewrites every Compliance report for that project and therefore changes Report History modification time.

The history row does not currently show scan `generatedAt`, workflow revision, or workflow `updatedAt`. A historical scan report can therefore be visually mistaken for a newly scanned report after review refresh.

### 3.5 Which review actions regenerate report artifacts?

All three current write routes regenerate affected project reports:

- `POST /api/security/findings/:fingerprint`
- `POST /api/security/findings/:fingerprint/reviews`
- `PUT|PATCH /api/security/findings/:fingerprint/reviews/:reviewId`

They regenerate metadata, summary JSON, workflow JSON, findings/summary CSV, HTML, XLSX, PDF, and report manifest while leaving the restricted evidence archive unchanged.

### 3.6 Which data is immutable versus mutable?

Immutable technical layer: scan `generatedAt`, finding fingerprint and technical ID/status source, evidence IDs, artifact references/hashes, source URLs, collection states/methods, mapping IDs/catalog provenance, applicability input/state, and control technical evaluation.

Mutable review overlay: finding review status, reviewer disposition, mapping/scope decision, reviewer note/label/role, evidence references selected for the review, review timestamps, primary projection, and decision history.

`applyWorkflow()` changes only finding lifecycle presentation fields and attaches `decision`; it does not replace evidence or mapping objects.

### 3.7 Is there a revision/history log?

Partially. Each report workflow has a numeric revision incremented when that report is refreshed. Lifecycle records retain `decisionHistory`, and the evidence vault receives safe audit events. However, lifecycle persistence has no project-level revision, workflow output omits `decisionHistory`, and report revisions are computed per overwritten report rather than used as an optimistic-concurrency contract.

### 3.8 Can review state be traced to reviewer/time/revision?

Reviewer records retain label, role, created time, updated time, decisions, note, and evidence references. Reports retain workflow revision/updated time. The missing link is a stable project review revision on each saved review/history event. Current audit events and history cannot be joined deterministically by revision.

### 3.9 Which review fields appear in each format?

- JSON/workflow JSON: primary and multiple reviewer records, decisions, notes, labels, roles, timestamps, evidence references.
- HTML/PDF: review summary counts and finding-level reviewer records/decisions/notes/timestamps.
- XLSX: findings rows include primary review decision fields; no dedicated review queue/history sheet.
- Findings CSV: finding status, review/scope/mapping decisions, reason, reviewer, role, and review date.
- Metadata/report manifest: workflow revision and updated time.
- Workspace: primary finding disposition and factual progress; generated report HTML supports the fuller three-dimension review form.

### 3.10 Are mapping-level decisions supported?

Only partially. A `mappingDecision` exists, but it is attached to the finding/review record without a `mappingId`. Findings commonly have multiple candidate mappings, so a reviewer cannot identify which mapping was confirmed or rejected. The original mappings are retained, but the overlay target is ambiguous.

### 3.11 Are scope decisions supported?

Only partially. `scopeDecision` is stored separately from automated applicability and does not rewrite it, which is correct. It lacks a target framework identifier, so a finding spanning multiple frameworks cannot identify which scope was confirmed/not confirmed.

### 3.12 Are manual-review reasons surfaced usefully?

Phase 2 reason codes and shared human labels are present in framework/control HTML, PDF, XLSX, and workspace detail. They are not available as a finding-queue filter, and the queue does not expose which mapped controls supplied the reasons. The underlying reason semantics are sufficient and must not change.

### 3.13 Can reviewers distinguish evidence from interpretation?

The product repeatedly states that findings are technical observations and mappings are candidates. Finding detail uses “Evidence & mappings,” while generated review forms are separate expandable blocks. The distinction is conceptually correct. Early report pages and Report History do not show scan time and review-overlay time/revision together, so the temporal separation is weaker than the semantic separation.

### 3.14 Are review controls usable on desktop/mobile?

The existing CSS collapses filters and review forms to one column below 768px; controls are labelled and keyboard-native, and status messages use live regions/toasts. This is a sufficient responsive baseline. Browser validation is still required after any queue changes at approximately 1440px and 390px.

### 3.15 Are filtering/search/sorting sufficient?

Partially. Search covers finding ID/title/category/URL/impact/evidence/control IDs. Filters cover severity, category, reviewed/awaiting, and framework. There is no deterministic sort control, disposition filter, collection-state filter, or manual-review-reason filter. Search omits reviewer note, mapping IDs, and reviewer label from current review overlay.

### 3.16 Are report pages too dense/repetitive?

HTML already uses progressive disclosure and one shared relationship legend. PDF tests show dense but healthy mapping flow. The review summary is late in the report, and the cover/early summary does not state review progress or workflow revision. A compact early review summary is justified; per-decision pages or repeated legends are not.

### 3.17 Are reviewer comments safe from HTML/script injection?

HTML server rendering uses escaping, and dynamic review cards use `textContent`; these paths are safe against direct script/HTML injection. JSON serialization is safe as data. Input length and Unicode-control validation are missing. CSV preserves formula-leading review notes, demonstrated with `=HYPERLINK(...)`; quoting alone does not neutralize spreadsheet formula interpretation. XLSX review text is stored as strings by ExcelJS, but explicit review-text neutralization provides a clearer cross-export boundary.

### 3.18 Does Report History preserve old reviewed states?

Lifecycle `decisionHistory` preserves superseded review records, but refreshed report artifacts include only current reviewer records. All reports for a project are overwritten with the newest overlay, and the previous workflow JSON is not retained. This is compatible with the existing “refresh affected reports” behavior but insufficient for reviewing what changed between revisions. Phase 4 should expose a bounded change trail in the workflow, not create a full duplicate report per keystroke.

### 3.19 What would duplicate existing architecture?

A new user/authentication system, assignments, approvals, email/Slack, task scheduling, a second review database, a separate report revision identifier, automatic AI dispositions, full-report snapshots per edit, batch mapping/scope decisions, or a project-management board would duplicate or exceed the local workflow. Existing explicit saves, lifecycle storage, audit events, report refresh, decision enums, progress counts, and progressive disclosure should be extended rather than replaced.

### 3.20 Which gaps are genuinely worth implementing?

The selected gaps below are directly demonstrated by source/test/temp-directory probes and fit the existing architecture.

## 4. Selected Phase 4 gaps

### P4-REV-001 — Project review revision and stale-write protection

Current review saves have no expected revision. Two tabs can overwrite a newer review. Add a project-scoped workflow revision, increment it once per scan reconciliation or explicit saved review, attach it to review/history/audit records, accept `expectedWorkflowRevision`, and reject a stale explicit save with HTTP 409 plus current revision metadata. Reuse the report workflow revision; do not add locking.

### P4-REV-002 — Bounded input validation and export safety

Current input silently normalizes an unsupported role to `reviewer`, accepted a 200-character reviewer label in the audit probe, has no server note bound, and leaves a formula-leading review note active in findings CSV. Add strict write-time enum/role validation, reviewer/note/reference/target bounds, clear 400/404 errors, Unicode-safe text handling, and formula neutralization only for mutable review text in CSV/XLSX. Preserve technical source values unchanged.

### P4-REV-003 — Targeted mapping and scope overlays

Current mapping/scope decisions are separate from technical state but ambiguous when a finding has multiple candidate mappings/frameworks. Retain the actual enums (`confirmed`/`rejected`) and add optional validated `mappingId` and `scopeFramework` targets to review records. The target must exist on the lifecycle finding candidate inventory. A rejection remains an overlay and never deletes or rewrites the mapping/applicability record.

### P4-REV-004 — Bounded revision/change history in workflow reports

Project decision history exists but is omitted from `workflow.json` and reviewed reports. Add a bounded safe change trail with revision, object identity, decision dimension/target, old/new values, reviewer label, and timestamp. Do not store restricted evidence or duplicate full reports. Legacy workflow data receives empty-history/read-time defaults.

### P4-UX-005 — Review queue clarity and deterministic triage

Retain existing search and filters. Add lightweight disposition, collection-state, and manual-review-reason filters plus deterministic sort by severity, review state, updated time, framework, or title. Include safe review note/label, mapping IDs, and reason labels in client-side search. Keep per-finding explicit save; do not add batch false-positive/mapping/scope actions.

### P4-RPT-006 — Scan/review separation and compact cross-format review summary

Add one canonical factual `reviewSummary` and visibly separate scan identity (`generatedAt`) from review overlay identity (`workflow revision`, `workflow updatedAt`). Surface compact counts/labels in early HTML/PDF, JSON, metadata, Report History, workspace, and a bounded XLSX Review Queue/summary surface. Preserve finding-oriented CSV fields without adding full workflow history. Review progress must never be presented as compliance/readiness/control coverage.

## 5. Test-first requirements

Before each production correction, add deterministic regressions covering:

- revision 1/2 saves and stale revision rejection without overwriting revision 2;
- immutable fingerprint, technical status, evidence IDs/refs/source URLs, mapping IDs/catalog, collection states, and scan time after every supported decision;
- all decisions retaining `controlSatisfaction = not_determined` and `complianceConclusion = not_determined`;
- invalid enums/roles/targets, missing records, length limits, HTML/script text, formula prefixes, long/Unicode notes;
- mapping and scope target validation with original mappings/applicability unchanged;
- bounded workflow history and legacy workflow defaults;
- JSON/HTML/PDF/XLSX/workflow/metadata/manifest consistency and public-data redaction;
- workspace filters/search/sort, explicit save, 409 handling, desktop/mobile layout, and accessibility;
- existing Phase 1/3, PDF, package, and three-tool isolation gates.

## 6. Explicitly not selected

- No new compliance, readiness, certification, control-pass/fail, legal, or audit-opinion state.
- No change to evidence, mapping, prerequisite, applicability, collection, cookie identity, or control aggregation semantics.
- No AI review decisions or ranking.
- No accounts, SSO, permissions, verified identity, assignment, routing, notifications, scheduling, or automatic rescans.
- No arbitrary batch dispositions. A batch “reviewed” action is not demonstrated as necessary by the current fixture scale.
- No duplicate report per keystroke and no distributed lock.
- No restricted-evidence search/indexing or public raw-artifact links.
- No Lighthouse Reporter or Asset Analyzer production change.

## 7. Version decision before implementation

The Toolkit should remain `1.7.1` and mapping catalog `2026.08.26.3` because Phase 4 changes neither release policy nor mapping semantics.

Canonical review summary/target/history fields require a report schema bump from `2.5.0` to `2.6.0`. A project revision and history contract require workflow schema `2.0.0` to `3.0.0` and lifecycle persistence schema `4` to `5`. Finding/control, evidence-vault, evidence-manifest, and passive-ZAP schemas should remain unchanged because their technical structures do not change.

## 8. Completion boundary

Phase 4 can be complete only after the selected gaps pass focused tests, the full suite, Phase 1, Phase 3, a focused Phase 4 validator, native PDF/redaction/injection checks, 1440px/390px workspace browser checks, three-tool smoke, deterministic packaging, and final diff validation. A completed review queue will still not mean the assessed organization is compliant or that controls are satisfied.
