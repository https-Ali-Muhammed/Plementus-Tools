import { EPRIVACY_ARTICLE_5_3_SOURCE } from './security-mapping-registry.js';
import { reportDownloadHref } from './report-downloads.js';
import { contentLocaleFromRoute, resolveDocumentCandidate } from './website-crawler.js';
import {
  applicabilityPresentation,
  frameworkDisplayName,
  manualReviewReasonLabels,
  RELATIONSHIP_DEFINITIONS,
  RELATIONSHIP_DISCLAIMER,
  relationshipDefinition
} from './security-compliance-semantics.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}

const MACHINE_TEXT_FORMATTING = /[\u00ad\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff\ufffd]/g;
function cleanMachineText(value) {
  return String(value ?? '').replace(MACHINE_TEXT_FORMATTING, '');
}
function escapeMachine(value) {
  return escapeHtml(cleanMachineText(value));
}

function humanize(value) {
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function statusLabel(status, item = {}) {
  if ((item.collectionState || item.testState || item.state) === 'failed_to_test') return 'Failed to test';
  if ((item.collectionState || item.testState || item.state) === 'not_tested') return 'Not assessed';
  if (item.negativeObservation?.classification === 'bounded_public_absence') return 'Bounded public absence observed';
  if (item.negativeObservation?.classification === 'bounded_source_absence_with_failed_sources') return 'Bounded source absence; other source failed';
  if (item.category === 'Compliance evidence' || item.id === 'privacy') {
    if (status === 'pass') return 'Observed';
    if (status === 'fail') return 'Failed to assess';
    if (status === 'manual') return ['evidence-certifications', 'locale-policy-parity'].includes(item.id) ? 'Manual review' : 'Not observed';
  }
  return ({ pass: 'No adverse observation', warning: 'Review', fail: 'Needs attention', manual: 'Manual review', info: 'Informational' })[status] || humanize(status);
}

function confidenceLabel(value) {
  return ({ high: 'High', medium: 'Medium', low: 'Low', asserted_not_verified: 'Asserted, not verified', unknown: 'Unknown', confirmed: 'Legacy confirmed — not normalized', observed: 'Legacy observed — not normalized', inferred: 'Legacy inferred — not normalized', not_assessed: 'Not assessed' })[value] || humanize(value || 'unknown');
}

function groupBy(items, key) {
  return (items || []).reduce((groups, item) => {
    const name = item[key] || 'Other';
    if (!groups.has(name)) groups.set(name, []);
    groups.get(name).push(item);
    return groups;
  }, new Map());
}

function list(items, empty = 'None') {
  return items?.length ? `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join('')}</ul>` : `<span class="muted">${escapeHtml(empty)}</span>`;
}

function machineList(items, empty = 'None') {
  return items?.length ? `<ul>${items.map((item) => `<li class="machine-text">${escapeMachine(item)}</li>`).join('')}</ul>` : `<span class="muted">${escapeHtml(empty)}</span>`;
}

function linkList(items, empty = 'None') {
  return items?.length ? `<ul>${items.map((item) => `<li><a class="machine-text" href="${escapeMachine(item)}">${escapeMachine(item)}</a></li>`).join('')}</ul>` : `<span class="muted">${escapeHtml(empty)}</span>`;
}

function privacyDocumentsForDisplay(summary) {
  const baseUrl = summary.finalUrl || summary.requestedUrl || '';
  const candidates = [
    ...(summary.crawl?.pagesFoundByGroup?.privacy || []),
    ...(summary.crawl?.linkedEvidence?.privacy || []),
    ...(summary.crawl?.pages || []).filter((page) => page.found && (page.groups || []).includes('privacy')).map((page) => page.url)
  ];
  return [...new Set(candidates.map((candidate) => resolveDocumentCandidate(candidate, baseUrl)).filter(Boolean))];
}

function checkForDisplay(summary, item) {
  if (item.id !== 'evidence-privacy-page') return item;
  if (!summary.crawl) return { ...item, title: 'Privacy policy document' };
  const documents = privacyDocumentsForDisplay(summary);
  return {
    ...item,
    title: 'Privacy policy document',
    status: documents.length ? 'pass' : 'manual',
    summary: documents.length
      ? `A privacy-related document was found or linked publicly: ${documents.join(', ')}. Document presence does not establish quality or legal sufficiency.`
      : 'No dedicated privacy policy document was discovered by crawling common paths and homepage links.'
  };
}

function contentLocalesForDisplay(summary, policyDocuments) {
  if (Array.isArray(summary.localeCoverage?.contentLocalesDiscovered)) return summary.localeCoverage.contentLocalesDiscovered;
  const urls = [
    ...(summary.crawl?.pages || []).filter((page) => page.found).map((page) => page.url),
    ...policyDocuments.map((item) => item.sourceUrl)
  ];
  return [...new Set(urls.map((url) => contentLocaleFromRoute({ url })).filter(Boolean))];
}

function artifactRowsForDisplay(artifacts = []) {
  const rows = [];
  const binaries = new Map();
  for (const item of artifacts) {
    const binary = /^(?:image|audio|video)\//.test(item.type || '') || item.type === 'application/octet-stream';
    const key = binary && item.sha256 ? `${item.sha256}:${item.bytes || 0}` : '';
    if (key && binaries.has(key)) {
      const canonical = binaries.get(key);
      canonical.roles = [...new Set([...(canonical.roles || [canonical.id]), ...(item.roles || [item.id])])];
      canonical.aliases = [...(canonical.aliases || []), { id: item.id, path: item.path }];
      canonical.sensitive = canonical.sensitive || item.sensitive;
      continue;
    }
    const row = { ...item, roles: [...new Set(item.roles || (binary ? [item.id] : []))] };
    rows.push(row);
    if (key) binaries.set(key, row);
  }
  return rows;
}

function gdprAggregate(summary) {
  if (summary.gdprPublicNoticeAggregate) return summary.gdprPublicNoticeAggregate;
  const states = (summary.gdprPublicNoticeMatrix || []).map((item) => item.state);
  if (states.some((state) => ['observed', 'partially_observed'].includes(state))) return 'partial_evidence';
  if (!states.length || states.every((state) => state === 'not_assessed')) return 'not_assessed';
  if (states.some((state) => ['failed_to_assess', 'failed_to_test'].includes(state))) return 'failed_to_assess';
  return states.some((state) => state === 'not_observed') ? 'no_public_evidence_observed' : 'not_assessed';
}

function mappingFramework(control) {
  if (/^EPRIVACY-|^GDPR-EPRIVACY-/i.test(control.controlId || '')) return 'eprivacy';
  return control.mappings?.find((mapping) => mapping.framework)?.framework || String(control.controlId || '').split(/[-:]/)[0];
}

function frameworkLabel(value) {
  return frameworkDisplayName(value);
}

function reviewSummary(review = {}) {
  return [review.reviewDecision ? `Review: ${humanize(review.reviewDecision)}` : '', review.scopeDecision ? `Scope: ${humanize(review.scopeDecision)}` : '', review.mappingDecision ? `Mapping: ${humanize(review.mappingDecision)}` : ''].filter(Boolean).join(' · ');
}

function reviewRecordCard(review = {}) {
  const updated = new Date(review.updatedAt || review.createdAt || '');
  const updatedLabel = Number.isNaN(updated.getTime()) ? String(review.updatedAt || review.createdAt || '') : updated.toLocaleString();
  const targets = [review.mappingId ? `Mapping ID: ${review.mappingId}` : '', review.scopeFramework ? `Scope framework: ${frameworkLabel(review.scopeFramework)}` : ''].filter(Boolean).join(' · ');
  return `<article class="report-review-record" data-report-review-id="${escapeHtml(review.reviewId || '')}"><div><strong>${escapeHtml(review.reviewer || 'Unnamed reviewer')}</strong><span>${escapeHtml(humanize(review.role || 'reviewer'))}</span></div><p>${escapeHtml(reviewSummary(review) || 'Review decision not recorded')}</p>${targets ? `<p class="machine-text">${escapeMachine(targets)}</p>` : ''}<p>${escapeHtml(review.reason || '')}</p>${updatedLabel ? `<small>${escapeHtml(updatedLabel)}${review.revision != null ? ` · Revision ${escapeHtml(review.revision)}` : ''}</small>` : ''}<button type="button" class="report-review-edit" data-review-id="${escapeHtml(review.reviewId || '')}">Edit review</button></article>`;
}

function findingCard(finding) {
  const decision = finding.decision || {};
  const reviewDecision = decision.reviewDecision || finding.reviewDecision || '';
  const scopeDecision = decision.scopeDecision || finding.scopeDecision || '';
  const mappingDecision = decision.mappingDecision || finding.mappingDecision || '';
  const reviewReason = decision.reason || '';
  const reviewer = decision.reviewer || '';
  const reviewerRole = decision.role || 'reviewer';
  const reviewedAt = decision.updatedAt || '';
  const reviewed = Boolean(reviewDecision || scopeDecision || mappingDecision);
  const reviews = Array.isArray(decision.reviews) ? decision.reviews.filter((review) => review.reviewId) : [];
  const printableReviews = reviews.length ? reviews : reviewed ? [{ reviewer, role: reviewerRole, reviewDecision, scopeDecision, mappingDecision, reason: reviewReason, updatedAt: reviewedAt }] : [];
  const mappings = (finding.controlMappings || []).map((mapping) => {
    const framework = /^EPRIVACY-|^GDPR-EPRIVACY-/i.test(mapping.controlId || '') ? 'eprivacy' : mapping.framework || '';
    return `${frameworkLabel(framework)} ${mapping.controlId} — ${humanize(mapping.relationship)}`.trim();
  });
  const mappingTargets = [...new Map((finding.controlMappings || []).filter((mapping) => mapping.mappingId).map((mapping) => [mapping.mappingId, mapping])).values()];
  const scopeTargets = [...new Set((finding.controlMappings || []).map((mapping) => mapping.framework).filter(Boolean))];
  const evidence = finding.evidence?.raw || finding.evidence?.evidenceText || '';
  const evidenceTrace = finding.evidence || finding.evidenceItems?.[0] || {};
  const normalizedConfidence = finding.evidenceConfidence || evidenceTrace.evidenceConfidence || evidenceTrace.confidence || 'unknown';
  const severityClass = ['critical', 'high'].includes(finding.severity) ? 'fail' : finding.severity === 'medium' ? 'warning' : 'info';
  return `<article class="finding-card severity-${severityClass}" data-finding-id="${escapeMachine(finding.id)}">
    <header><span class="badge ${severityClass}">${escapeHtml(finding.severity || 'informational')}</span><div><h3>${escapeHtml(finding.title)}</h3><p class="finding-meta"><span class="machine-text">${escapeMachine(finding.id)}</span> · ${escapeHtml(humanize(finding.findingStatus || finding.status || 'open'))} · Evidence confidence ${escapeHtml(confidenceLabel(normalizedConfidence))}</p></div></header>
    <dl class="detail-grid">
      <dt>Affected URL</dt><dd>${finding.affectedUrl ? `<a class="machine-text" href="${escapeMachine(finding.affectedUrl)}">${escapeMachine(finding.affectedUrl)}</a>` : 'Not recorded'}</dd>
      <dt>Observation</dt><dd>${escapeHtml(finding.description || finding.impact || '')}</dd>
      <dt>Evidence</dt><dd>${escapeHtml(evidence || 'No user-facing excerpt recorded.')}</dd>
      <dt>Evidence traceability</dt><dd>${list([
        evidenceTrace.collectionMethod ? `Collection method: ${humanize(evidenceTrace.collectionMethod)}` : '',
        evidenceTrace.collectionState ? `Collection state: ${humanize(evidenceTrace.collectionState)}` : '',
        evidenceTrace.confidence ? `Evidence confidence: ${humanize(evidenceTrace.confidence)}` : '',
        evidenceTrace.normalizedEvidenceStrength ? `Evidence strength: ${humanize(evidenceTrace.normalizedEvidenceStrength)}` : '',
        evidenceTrace.observedAt ? `Observed at: ${evidenceTrace.observedAt}` : '',
        ...(evidenceTrace.artifactRefs || []).map((ref) => `Artifact: ${ref}`)
      ].filter(Boolean), 'No normalized traceability tuple recorded')}</dd>
      <dt>Recommendation</dt><dd>${escapeHtml(finding.recommendation || 'Qualified review required.')}</dd>
      <dt>Candidate mappings</dt><dd>${machineList(mappings, 'No candidate mapping')}</dd>
      <div class="finding-tail"><dt>Limitations</dt><dd>${list(finding.limitations || [], 'No finding-specific limitation')}</dd><dt>Test method</dt><dd>${escapeHtml(finding.testMethod || 'Not recorded')}</dd></div>
      ${printableReviews.length ? `<dt class="print-only">Reviewer decisions</dt><dd class="print-only">${list(printableReviews.map((review) => `${review.reviewer || 'Unnamed reviewer'} (${humanize(review.role || 'reviewer')}) — ${reviewSummary(review)}${review.reason ? ` — ${review.reason}` : ''}`))}</dd>` : ''}
    </dl>
    ${finding.fingerprint ? `<details class="report-review-control screen-only" data-report-review-finding data-fingerprint="${escapeHtml(finding.fingerprint)}" data-reviewed="${reviewed}">
      <summary><span>Reviewer decisions</span><small class="report-review-summary-state">${reviews.length ? `${reviews.length} reviewer${reviews.length === 1 ? '' : 's'}` : reviewed ? '1 reviewer' : 'Awaiting review'}</small></summary>
      <form class="report-review-form">
        <div class="report-review-list">${reviews.map(reviewRecordCard).join('') || '<p class="report-review-empty">No reviewer decision has been saved.</p>'}</div>
        <h4 class="report-review-form-title">Add reviewer decision</h4>
        <div class="report-review-fields">
          <label><span>Review decision</span><select name="reviewDecision" disabled><option value="">Review required</option><option value="accepted_as_observation">Accepted as observation</option><option value="false_positive">False positive</option><option value="requires_more_evidence">Requires more evidence</option></select></label>
          <label class="report-review-note"><span>Review note</span><textarea name="reason" rows="3" placeholder="Explain the evidence-based decision" disabled></textarea></label>
        </div>
        <details class="report-review-advanced"><summary>Scope and mapping review</summary><div class="report-review-fields"><label><span>Scope decision</span><select name="scopeDecision" disabled><option value="">No scope decision</option><option value="confirmed">Confirmed for review scope</option><option value="not_confirmed">Not confirmed</option></select></label><label><span>Scope framework</span><select name="scopeFramework" disabled><option value="">Select framework</option>${scopeTargets.map((framework) => `<option value="${escapeHtml(framework)}">${escapeHtml(frameworkLabel(framework))}</option>`).join('')}</select></label><label><span>Mapping decision</span><select name="mappingDecision" disabled><option value="">No mapping decision</option><option value="confirmed">Candidate mapping confirmed</option><option value="rejected">Candidate mapping rejected</option></select></label><label><span>Mapping ID</span><select name="mappingId" disabled><option value="">Select candidate mapping</option>${mappingTargets.map((mapping) => `<option value="${escapeHtml(mapping.mappingId)}">${escapeHtml(mapping.mappingId)} — ${escapeHtml(mapping.controlId || '')}</option>`).join('')}</select></label></div></details>
        <div class="report-review-actions"><button type="submit" disabled>Add review</button><button type="button" class="report-review-cancel" hidden>Cancel edit</button><span class="report-review-message" role="status" aria-live="polite"></span></div>
      </form>
    </details>` : ''}
  </article>`;
}

function gdprCard(item, assessedPages) {
  const evidence = item.evidenceItems?.[0];
  const explanation = item.state === 'not_observed'
    ? 'No matching public evidence was observed in the bounded pages assessed. This does not determine GDPR compliance.'
    : item.state === 'not_assessed'
      ? 'No applicable public-notice assessment was performed.'
      : item.state === 'failed_to_assess'
        ? 'Extraction or testing failed; no evidence conclusion was produced.'
        : 'Candidate public-notice wording was observed. Organizational practice and legal sufficiency were not determined.';
  return `<article class="notice-item avoid-break">
    <div class="card-head"><strong>${escapeHtml(humanize(item.element))}</strong><span class="state">${escapeHtml(humanize(item.state))}</span></div>
    <dl class="detail-grid compact">
      ${evidence?.sourceUrl ? `<dt>Source</dt><dd><a class="machine-text" href="${escapeMachine(evidence.sourceUrl)}">${escapeMachine(evidence.sourceUrl)}</a></dd>` : ''}
      <dt>Confidence</dt><dd>${escapeHtml(humanize(item.confidence || 'not_assessed'))}</dd>
      ${item.state === 'not_assessed' ? '<dt>Element assessment</dt><dd>Not performed</dd>' : ''}
      ${!evidence?.sourceUrl && assessedPages.length ? `<dt>${item.state === 'not_assessed' ? 'Evidence pages crawled' : item.state === 'failed_to_assess' ? 'Candidate evidence pages' : 'Pages assessed'}</dt><dd>${linkList(assessedPages)}</dd>` : ''}
    </dl>
    <p>${escapeHtml(explanation)}</p>
    ${evidence?.excerpt ? `<details class="excerpt"><summary>Evidence excerpt</summary><blockquote>${escapeHtml(evidence.excerpt)}</blockquote></details>` : ''}
  </article>`;
}

function mappingCard(control) {
  const relationships = [...new Set((control.mappings || []).map((mapping) => mapping.relationship).filter(Boolean))];
  const prerequisites = [...new Set((control.mappings || []).flatMap((mapping) => mapping.prerequisiteResults || []).map((item) => `${humanize(item.prerequisite)} — ${humanize(item.state)}`))];
  const evidenceSources = [...new Set((control.automatedEvidence || []).map((item) => `${item.checkId} — ${humanize(item.evidenceState || item.strength)}`))];
  const isEprivacyArticle53 = [control.controlId, ...(control.mappings || []).map((mapping) => mapping.controlId)]
    .some((controlId) => ['GDPR-EPRIVACY-ART-5(3)', 'EPRIVACY-DIR-2002-58-ART-5(3)'].includes(controlId));
  const citations = isEprivacyArticle53
    ? [EPRIVACY_ARTICLE_5_3_SOURCE]
    : [...new Set((control.mappings || []).map((mapping) => mapping.sourceCitation).filter(Boolean))];
  const mappingLimitations = [...new Set((control.limitations || []).filter((item) => !/^Automated evidence covers only the observed technical portion/i.test(item) && !/^The mapping identifies evidence relevant for qualified review/i.test(item)))];
  const sourceCount = control.provenanceSummary?.sourceCheckCount ?? evidenceSources.length;
  const sourceChecks = control.provenanceSummary?.sourceCheckIds || (control.automatedEvidence || []).map((item) => item.checkId);
  const failedCount = control.coverageSummary?.failedEvidenceItems || 0;
  const notAssessedCount = control.coverageSummary?.notAssessedEvidenceItems || 0;
  const coverageNote = control.coverageSummary?.complete
    ? 'Mapped technical collection completed for the listed sources.'
    : `Evidence coverage: Partial${failedCount ? ` — ${failedCount} failed collection item${failedCount === 1 ? '' : 's'} present` : ''}${notAssessedCount ? ` — ${notAssessedCount} not-assessed item${notAssessedCount === 1 ? '' : 's'} present` : ''}.`;
  const reviewReasons = manualReviewReasonLabels(control.manualReviewReasons || []);
  const governance = [...new Map((control.mappings || []).flatMap((mapping) => mapping.sourceGovernance || [mapping]).map((mapping) => [mapping.mappingId, mapping])).values()]
    .filter((mapping) => mapping.rationale || mapping.sourceVersion || mapping.lastReviewedAt || mapping.reviewedBy || mapping.changeReason);
  const governanceVersions = [...new Set(governance.map((mapping) => mapping.sourceVersion || mapping.frameworkVersion).filter(Boolean))];
  const governanceReviewers = [...new Set(governance.map((mapping) => mapping.reviewedBy).filter(Boolean))];
  const governanceDates = [...new Set(governance.map((mapping) => mapping.lastReviewedAt).filter(Boolean))];
  return `<details class="mapping-card">
    <summary><span><b>${escapeHtml(frameworkLabel(mappingFramework(control)))}</b><small class="machine-text">${escapeMachine(control.controlId)}</small></span><span><small>Evidence state</small>${escapeHtml(humanize(control.state))}</span><span><small>Sources</small>${sourceCount} technical observation${sourceCount === 1 ? '' : 's'}</span><span><small>Satisfaction</small>Not determined</span></summary>
    <div class="mapping-detail">
      <div class="mapping-unit"><h4>Evidence sources</h4><p>${escapeHtml(sourceCount)} technical observation${sourceCount === 1 ? '' : 's'}; source quantity is provenance breadth, not assurance strength.</p>${machineList(sourceChecks, 'No automated evidence source')}</div>
      <div class="mapping-unit"><h4>Evidence coverage</h4><p>${escapeHtml(coverageNote)}</p>${list((control.coverageQualifiers || []).map(humanize), 'No incomplete-coverage qualifier')}</div>
      <div class="mapping-unit"><h4>Relationships</h4>${list(relationships.map((relationship) => relationshipDefinition(relationship).label), 'Not specified')}</div>
      <div class="mapping-unit"><h4>Prerequisites</h4>${list(prerequisites, 'None')}</div>
      <div class="mapping-unit"><h4>Source findings</h4>${machineList(control.linkedFindings || [], 'None')}</div>
      ${reviewReasons.length ? `<div class="mapping-unit"><h4>Human review required</h4>${list(reviewReasons)}</div>` : ''}
      <div class="mapping-unit"><h4>Mapping-specific limitations</h4>${list(mappingLimitations, 'No additional mapping-specific limitation')}</div>
      ${governance.length ? `<div class="wide mapping-unit mapping-governance screen-only"><h4>Mapping governance</h4>${governance.map((mapping) => `<article><strong class="machine-text">${escapeMachine(mapping.mappingId)}</strong><p>${escapeHtml(mapping.rationale || 'Legacy mapping rationale was not recorded.')}</p><dl class="detail-grid compact"><dt>Source version</dt><dd>${escapeHtml(mapping.sourceVersion || mapping.frameworkVersion || 'Legacy source version not recorded')}</dd><dt>Review status</dt><dd>${escapeHtml(humanize(mapping.reviewStatus || 'legacy_metadata_unavailable'))}</dd><dt>Last reviewed</dt><dd>${escapeHtml(mapping.lastReviewedAt || 'Not recorded')}</dd><dt>Reviewed by</dt><dd>${escapeHtml(mapping.reviewedBy || 'Not recorded')}</dd><dt>Change reason</dt><dd>${escapeHtml(mapping.changeReason || 'Legacy mapping governance metadata was not recorded.')}</dd><dt>Approval</dt><dd>${mapping.approvedBy ? escapeHtml(mapping.approvedBy) : 'No approval claimed'}</dd></dl></article>`).join('')}</div><div class="wide mapping-unit mapping-governance-compact print-only"><h4>Mapping governance</h4><p>${governance.length} source mapping${governance.length === 1 ? '' : 's'} reviewed against ${escapeHtml(governanceVersions.join('; ') || 'legacy source metadata')}${governanceDates.length ? ` on ${escapeHtml(governanceDates.join(', '))}` : ''}${governanceReviewers.length ? ` by ${escapeHtml(governanceReviewers.join(', '))}` : ''}. No approval claimed.</p></div>` : ''}
      ${citations.length ? `<div class="wide mapping-unit mapping-citation"><h4>Mapping source / citation</h4>${linkList(citations)}</div>` : ''}
    </div>
  </details>`;
}

export function buildComplianceHtml(summary) {
  const findings = summary.findings || [];
  const testStateCounts = (summary.testResults || []).reduce((counts, item) => { counts[item.state] = (counts[item.state] || 0) + 1; return counts; }, {});
  const frameworks = (summary.frameworkResults || []).map((framework) => { const applicability = applicabilityPresentation(framework.applicability || 'unknown', { inputState: framework.applicabilityInput || 'unknown' }); return `<article class="card scope-card avoid-break"><div class="card-head"><strong>${escapeHtml(frameworkDisplayName(framework.id))}</strong><span>${escapeHtml(framework.applicabilityLabel || applicability.label)}</span></div><p>${escapeHtml(framework.note || '')}</p><dl class="detail-grid compact"><dt>Mapping selection</dt><dd>${escapeHtml(framework.selectionLabel || applicability.selectionLabel)}</dd><dt>Applicability</dt><dd>${escapeHtml(framework.applicabilityLabel || applicability.label)}</dd><dt>Scope basis</dt><dd>${escapeHtml(humanize(framework.scopeBasis || 'not_determined'))}</dd><dt>Scope confidence</dt><dd>${escapeHtml(humanize(framework.scopeConfidence || 'not_determined'))}</dd><dt>Coverage</dt><dd>Partial</dd><dt>Control satisfaction</dt><dd>Not determined</dd></dl>${(framework.evidenceStatements || []).length ? list(framework.evidenceStatements.slice(0, 6).map((item) => item.statement)) : '<p class="muted">No framework-specific public evidence statement was produced.</p>'}</article>`; }).join('');
  const relationshipDefinitions = summary.relationshipDefinitions || RELATIONSHIP_DEFINITIONS;
  const relationshipLegend = `<div class="relationship-legend avoid-break"><h3>Mapping relationships</h3><div>${['direct', 'supporting', 'contextual'].map((relationship) => { const definition = relationshipDefinitions[relationship] || RELATIONSHIP_DEFINITIONS[relationship]; return `<p><strong>${escapeHtml(definition.label)}</strong><span>${escapeHtml(definition.shortDescription)}</span></p>`; }).join('')}</div><small>${escapeHtml(summary.relationshipDisclaimer || RELATIONSHIP_DISCLAIMER)}</small></div>`;
  const findingGroups = [...groupBy(findings, 'category')].map(([category, items]) => `<details class="group finding-group" open><summary><strong>${escapeHtml(category)}</strong><span>${items.length} finding${items.length === 1 ? '' : 's'}</span></summary><div class="items">${items.map(findingCard).join('')}</div></details>`).join('') || '<div class="notice">No normalized finding met the configured thresholds. This is limited to completed checks and is not a compliance conclusion.</div>';
  const observationGroups = [...groupBy((summary.checks || []).map((item) => checkForDisplay(summary, item)), 'category')].map(([category, items]) => `<details class="group"><summary><strong>${escapeHtml(category)}</strong><span>${items.length} check${items.length === 1 ? '' : 's'}</span></summary><div class="observation-list">${items.map((item) => `<article class="observation avoid-break"><div><strong>${escapeHtml(item.title)}</strong><span>${escapeHtml(statusLabel(item.status, item))}</span></div><p>${escapeHtml(item.summary || '')}</p><small>${escapeHtml(item.testMethod || '')}${item.limitations?.length ? ` · ${escapeHtml(item.limitations.join(' · '))}` : ''}</small></article>`).join('')}</div></details>`).join('');
  const policyDocuments = summary.policyDocumentQuality || [];
  const testedLocales = summary.localeCoverage?.policyLocalesTested || [];
  const availableLocales = contentLocalesForDisplay(summary, policyDocuments);
  const untestedLocales = availableLocales.filter((locale) => !testedLocales.includes(locale));
  const languageSignals = summary.localeCoverage?.languageSignals || summary.localeCoverage?.availableLocales || [];
  const payment = summary.paymentFlow || {};
  const runtime = summary.browserScan || {};
  const runtimeApiHosts = [...new Set((runtime.apiObservations || []).map((item) => item.destinationHost).filter(Boolean))];
  const hasRuntimeNetworkEvidence = Boolean(runtime.networkCollection || (runtime.apiObservations || []).length || (runtime.resources || []).length);
  const runtimeEvidenceCard = hasRuntimeNetworkEvidence ? `<article class="structured-card avoid-break"><span>Runtime network / API evidence</span><strong>${(runtime.apiObservations || []).length} bounded API/XHR/fetch observation(s)</strong><table><tr><th>Network collection</th><td>${escapeHtml(humanize(runtime.networkCollection?.state || runtime.state || 'not_tested'))}</td></tr><tr><th>Records retained</th><td>${escapeHtml(String(runtime.networkCollection?.recordsCaptured ?? (runtime.resources || []).length))}</td></tr><tr><th>API destination hosts</th><td class="machine-text">${escapeMachine(runtimeApiHosts.join(', ') || 'None observed')}</td></tr><tr><th>Boundary</th><td>Passive metadata only; endpoint discovery does not determine security posture.</td></tr></table></article>` : '';
  const assessedPages = [...new Set(policyDocuments.map((item) => item.sourceUrl).filter(Boolean))];
  const gdprMatrix = summary.gdprPublicNoticeMatrix || [];
  const homogeneousGdprNotAssessed = gdprMatrix.length > 0 && gdprMatrix.every((item) => item.state === 'not_assessed');
  const compactGdprMatrix = homogeneousGdprNotAssessed ? `<div class="gdpr-compact-print print-only"><table><thead><tr><th>Element</th><th>Status</th></tr></thead><tbody>${gdprMatrix.map((item) => `<tr><td>${escapeHtml(humanize(item.element))}</td><td>Not assessed</td></tr>`).join('')}</tbody></table><p>No applicable public-notice assessment was performed.</p>${assessedPages.length ? `<div><strong>Evidence pages crawled</strong>${linkList(assessedPages)}</div>` : ''}</div>` : '';
  const evidenceManifest = summary.evidenceManifest || {};
  const artifacts = artifactRowsForDisplay(evidenceManifest.artifacts || []);
  const restrictedCount = artifacts.filter((item) => item.sensitive).length;
  const hashCount = artifacts.filter((item) => /^[a-f0-9]{64}$/i.test(item.sha256 || '')).length;
  const signed = evidenceManifest.signature?.algorithm === 'hmac-sha256';
  const decisions = summary.workflow?.findingDecisions || [];
  const reviewed = decisions.filter((item) => item.findingStatus === 'reviewed' || item.reviewDecision || item.scopeDecision || item.mappingDecision);
  const decisionCount = (name) => decisions.reduce((total, item) => total + ((item.reviews || []).length ? item.reviews.filter((review) => review.reviewDecision === name).length : item.reviewDecision === name ? 1 : 0), 0);
  const reviewRecordCount = decisions.reduce((total, item) => total + ((item.reviews || []).length || (item.reviewDecision || item.scopeDecision || item.mappingDecision ? 1 : 0)), 0);
  const reportName = summary.reportName || '';
  const csvLink = reportName ? reportDownloadHref(reportName, 'csv') : 'findings.csv';
  const pdfLink = summary.pdfGeneration?.status === 'generated' ? `<a href="${escapeHtml(reportName ? reportDownloadHref(reportName, 'pdf') : 'summary.pdf')}" download>PDF</a>` : '';
  const generated = new Date(summary.generatedAt);
  const generatedLabel = Number.isNaN(generated.getTime()) ? String(summary.generatedAt || '') : generated.toLocaleString();
  const workflowUpdated = new Date(summary.workflow?.updatedAt || '');
  const workflowUpdatedLabel = Number.isNaN(workflowUpdated.getTime()) ? String(summary.workflow?.updatedAt || 'No review activity') : workflowUpdated.toLocaleString();
  const hasReviewWorkflow = summary.workflow?.schemaVersion === '3.0.0' || Boolean(summary.reviewSummary || summary.workflow?.reviewSummary);
  const progress = summary.reviewSummary || summary.workflow?.reviewSummary || { totalFindings: findings.length, reviewedFindings: reviewed.length, unreviewedFindings: Math.max(0, findings.length - reviewed.length), state: reviewed.length ? 'in_progress' : 'not_started' };
  const collectionCoverage = Object.entries(summary.collectionCoverage || {});
  const collectionCoverageCards = collectionCoverage.map(([collector, entry]) => `<article class="structured-card avoid-break"><span>${escapeHtml(humanize(collector))}</span><strong>${escapeHtml(humanize(entry.state || 'not_tested'))}</strong>${(entry.limitations || []).length ? list(entry.limitations) : '<p class="muted">No collection limitation recorded.</p>'}</article>`).join('');

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(summary.projectName)} Compliance Pre-assessment</title><style>
  :root{color-scheme:dark;--bg:#080d1a;--panel:#111a2f;--panel2:#16213a;--panel3:#0e1729;--border:rgba(181,197,230,.16);--border-strong:rgba(181,197,230,.24);--text:#f4f7ff;--muted:#a8b3ca;--accent:#8b7cff;--accent-soft:#bbb3ff;--warn:#ffbf69;--bad:#ff6b7a;--info:#73b7ff;--shadow:0 18px 50px rgba(0,0,0,.18)}
  *{box-sizing:border-box}html{scroll-behavior:smooth;scroll-padding-top:86px}html,body{max-width:100%;overflow-x:hidden}body{margin:0;background:radial-gradient(circle at 80% -10%,rgba(85,65,180,.18),transparent 32rem),linear-gradient(180deg,#0b1020,var(--bg) 45%,#070b14);color:var(--text);font:14px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,"Segoe UI",Arial,sans-serif}.wrap{max-width:1360px;margin:auto;padding:34px 24px 76px}.cover{position:relative;isolation:isolate;overflow:hidden;padding:38px 40px;border:1px solid var(--border);border-radius:24px;background:linear-gradient(135deg,rgba(22,33,58,.96),rgba(11,17,33,.96));box-shadow:var(--shadow)}.cover::after{content:"";position:absolute;z-index:-1;right:-110px;top:-170px;width:430px;height:430px;border-radius:50%;background:radial-gradient(circle,rgba(139,124,255,.24),transparent 68%)}.eyebrow{font-size:11px;letter-spacing:.14em;text-transform:uppercase;color:var(--accent-soft);font-weight:800}h1{max-width:720px;font-size:44px;line-height:1.08;letter-spacing:-.025em;margin:10px 0 12px}h2{display:flex;align-items:center;gap:10px;font-size:22px;letter-spacing:-.01em;margin:44px 0 16px}h2::after{content:"";height:1px;flex:1;background:linear-gradient(90deg,var(--border-strong),transparent)}h3,h4,p{margin-top:0}.lead,.muted,small{color:var(--muted)}.lead{max-width:920px}a{color:#c4dfff;overflow-wrap:anywhere;text-underline-offset:2px}a:hover{color:#fff}a:focus-visible,summary:focus-visible{outline:2px solid #a99fff;outline-offset:3px;border-radius:5px}.cover-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:9px 32px;margin:24px 0}.cover-meta div{display:grid;grid-template-columns:155px minmax(0,1fr);gap:10px}.cover-meta span{color:var(--muted)}.conclusion{display:flex;gap:10px;flex-wrap:wrap;margin:20px 0}.conclusion span{padding:10px 14px;border:1px solid var(--border-strong);background:rgba(8,13,26,.55);border-radius:10px}.actions{display:flex;gap:8px;flex-wrap:wrap;margin:20px 0 0}.actions a{color:#f0edff;text-decoration:none;border:1px solid rgba(139,124,255,.42);background:rgba(139,124,255,.14);padding:9px 13px;border-radius:9px;font-size:12px;font-weight:750;transition:background .16s,border-color .16s,transform .16s}.actions a:hover{background:rgba(139,124,255,.25);border-color:rgba(170,158,255,.7);transform:translateY(-1px)}.report-nav{position:sticky;z-index:20;top:12px;display:flex;gap:4px;overflow-x:auto;margin:18px 0 8px;padding:6px;border:1px solid var(--border);border-radius:13px;background:rgba(10,16,31,.88);box-shadow:0 10px 32px rgba(0,0,0,.24);backdrop-filter:blur(14px);scrollbar-width:thin}.report-nav a{flex:0 0 auto;padding:8px 11px;border-radius:8px;color:var(--muted);font-size:12px;font-weight:700;text-decoration:none}.report-nav a:hover,.report-nav a:focus-visible{color:var(--text);background:rgba(139,124,255,.16)}main>section:not(.cover){scroll-margin-top:86px}.notice{padding:14px 16px;border:1px solid rgba(255,191,105,.3);background:rgba(255,191,105,.075);border-radius:11px;color:#ead2ae;margin:14px 0}.stats,.cards{display:grid;gap:12px;margin:16px 0}.stats{grid-template-columns:repeat(4,minmax(0,1fr))}.cards{grid-template-columns:repeat(3,minmax(0,1fr))}.stat,.card,.structured-card,.notice-item{min-width:0;padding:17px;border:1px solid var(--border);border-radius:13px;background:linear-gradient(145deg,rgba(20,31,55,.96),rgba(15,24,43,.96))}.stat{min-height:94px}.stat span,.structured-card>span{display:block;color:var(--muted);font-size:11px;line-height:1.35}.stat strong,.structured-card>strong{display:block;font-size:21px;line-height:1.25;margin-top:7px}.scope-card{border-top-color:rgba(139,124,255,.58)}.card-head{display:flex;justify-content:space-between;align-items:start;gap:12px}.card-head>span{color:#cbc5ff;font-size:11px;text-align:right}.detail-grid{display:grid;grid-template-columns:140px minmax(0,1fr);gap:7px 14px;margin:12px 0}.detail-grid.compact{font-size:12px}.detail-grid dt{color:var(--muted)}.detail-grid dd{margin:0;min-width:0}.detail-grid ul,.mapping-detail ul{margin:0;padding-left:18px}.group,.mapping-card{border:1px solid var(--border);border-radius:13px;background:rgba(17,26,47,.92);margin:10px 0;overflow:hidden;transition:border-color .16s,background .16s}.group:hover,.mapping-card:hover{border-color:var(--border-strong)}.group>summary,.mapping-card>summary{cursor:pointer;list-style:none}.group>summary::-webkit-details-marker,.mapping-card>summary::-webkit-details-marker{display:none}.group>summary{display:flex;align-items:center;gap:14px;padding:15px 17px}.group>summary span{margin-left:auto;color:var(--muted);font-size:11px}.group>summary::after,.mapping-card>summary::after{content:"+";display:grid;place-items:center;width:22px;height:22px;flex:0 0 22px;border-radius:50%;background:rgba(139,124,255,.12);color:var(--accent-soft);font-weight:800}.group[open]>summary::after,.mapping-card[open]>summary::after{content:"−"}.items,.observation-list{border-top:1px solid var(--border);padding:12px;display:grid;gap:10px;background:rgba(4,9,20,.16)}.finding-card{padding:17px;border:1px solid var(--border);border-left:3px solid var(--info);border-radius:11px;background:rgba(255,255,255,.025)}.finding-card.severity-warning{border-left-color:var(--warn)}.finding-card.severity-fail{border-left-color:var(--bad)}.finding-card header{display:grid;grid-template-columns:auto minmax(0,1fr);gap:14px;align-items:start}.finding-card h3{margin:1px 0 4px;font-size:15px}.finding-meta{font-size:11px;color:var(--muted)}.badge{min-width:76px;height:27px;padding:0 12px;display:inline-flex;align-items:center;justify-content:center;border-radius:999px;font-size:10px;font-weight:800;text-transform:capitalize}.badge.fail{color:#ffb8bf;background:rgba(255,107,122,.14)}.badge.warning{color:#ffd7a2;background:rgba(255,191,105,.14)}.badge.info{color:#b5dbff;background:rgba(79,156,255,.14)}.observation{padding:13px 14px;border:0;border-bottom:1px solid var(--border);border-radius:0}.observation:last-child{border-bottom:0}.observation>div{display:flex;justify-content:space-between;gap:15px}.observation>div span{color:#c8c2ff;font-size:11px}.observation p{margin:7px 0}.structured-grid,.notice-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.structured-card table{width:100%;border-collapse:collapse;margin-top:11px}.structured-card th,.structured-card td{text-align:left;padding:7px 0;border-bottom:1px solid var(--border);font-size:12px;vertical-align:top}.structured-card th{width:58%;padding-right:14px;color:var(--muted);font-weight:500}.notice-item p{font-size:12px;color:var(--muted);margin:10px 0 0}.excerpt summary{cursor:pointer;color:#c4dfff;font-size:12px}.excerpt blockquote{margin:8px 0 0;padding:10px;border-left:3px solid var(--accent);background:rgba(139,124,255,.08);font-size:12px}.mapping-limit{margin-bottom:14px}.mapping-card>summary{position:relative;display:grid;grid-template-columns:minmax(180px,1.35fr) minmax(180px,1fr) minmax(140px,.8fr) minmax(120px,.7fr);align-items:center;gap:14px;padding:15px 50px 15px 16px}.mapping-card>summary::after{position:absolute;right:16px;top:50%;transform:translateY(-50%)}.mapping-card>summary span{min-width:0}.mapping-card>summary small{display:block;font-size:10px;color:var(--muted)}.mapping-detail{border-top:1px solid var(--border);padding:16px;display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:16px;background:rgba(4,9,20,.16)}.mapping-detail h4{font-size:11px;text-transform:uppercase;color:var(--muted);letter-spacing:.04em;margin-bottom:6px}.mapping-detail .wide{grid-column:1/-1}.integrity-summary{grid-template-columns:repeat(3,minmax(0,1fr))}.artifact-table{width:100%;border-collapse:separate;border-spacing:0;table-layout:fixed;border:1px solid var(--border);border-radius:12px;overflow:hidden}.artifact-table th,.artifact-table td{text-align:left;padding:10px 12px;border-bottom:1px solid var(--border);font-size:11px;vertical-align:top}.artifact-table th{color:#dce4f5;background:rgba(139,124,255,.08)}.artifact-table th:nth-child(1){width:38%}.artifact-table th:nth-child(2){width:22%}.artifact-table th:nth-child(3){width:16%}.artifact-table th:nth-child(4){width:24%}.hash-row td{padding:8px 12px;background:rgba(4,9,20,.15)}.hash-row code{font-size:10px;word-break:break-all;color:var(--muted)}.hash-row summary{cursor:pointer;color:var(--muted)}.review-grid{grid-template-columns:repeat(3,minmax(0,1fr))}.footer{margin-top:36px;padding-top:18px;border-top:1px solid var(--border);color:var(--muted);font-size:12px}.section-count{position:absolute;width:1px;height:1px;overflow:hidden;clip:rect(0,0,0,0)}
  .report-review-workspace{display:grid;grid-template-columns:minmax(0,1.2fr) minmax(220px,.8fr);gap:14px;align-items:end;margin:0 0 16px;padding:16px;border:1px solid rgba(139,124,255,.34);border-radius:13px;background:linear-gradient(135deg,rgba(139,124,255,.12),rgba(17,26,47,.92))}.report-review-workspace h3{margin:0 0 3px;font-size:16px}.report-review-workspace p{margin:0;color:var(--muted);font-size:12px}.report-review-context{display:grid;grid-template-columns:minmax(0,1fr) minmax(180px,.7fr);gap:10px}.report-review-context label,.report-review-fields label{display:grid;gap:5px;color:var(--muted);font-size:11px}.report-review-context input,.report-review-context select,.report-review-fields select,.report-review-fields textarea{width:100%;min-width:0;border:1px solid var(--border-strong);border-radius:9px;background:#0b1427;color:var(--text);padding:9px 10px;font:inherit}.report-review-context input:focus,.report-review-context select:focus,.report-review-fields select:focus,.report-review-fields textarea:focus{outline:2px solid rgba(169,159,255,.8);outline-offset:1px}.report-review-connection{display:block;margin-top:7px;color:var(--muted);font-size:11px}.report-review-connection.connected{color:#9ad9bd}.report-review-connection.error{color:#ffb8bf}.report-review-control{margin-top:15px;border-top:1px solid var(--border);padding-top:12px}.report-review-control>summary{display:flex;align-items:center;justify-content:space-between;gap:12px;cursor:pointer;color:#d9d4ff;font-weight:750}.report-review-control>summary small{color:var(--muted);font-weight:500}.report-review-form{margin-top:12px;padding:14px;border-radius:10px;background:rgba(5,10,22,.28)}.report-review-fields{display:grid;grid-template-columns:minmax(190px,.75fr) minmax(0,1.25fr);gap:12px}.report-review-note{grid-column:auto}.report-review-fields textarea{resize:vertical;line-height:1.45}.report-review-advanced{margin-top:10px}.report-review-advanced>summary{cursor:pointer;color:#c4dfff;font-size:12px}.report-review-advanced .report-review-fields{margin-top:10px;grid-template-columns:repeat(2,minmax(0,1fr))}.report-review-actions{display:flex;align-items:center;gap:12px;flex-wrap:wrap;margin-top:12px}.report-review-actions button{border:1px solid rgba(139,124,255,.55);border-radius:9px;background:#6558d9;color:#fff;padding:9px 13px;font:inherit;font-weight:750;cursor:pointer}.report-review-actions button:hover:not(:disabled){background:#7568e8}.report-review-actions button:disabled,.report-review-context :disabled,.report-review-fields :disabled{cursor:not-allowed;opacity:.55}.report-review-message{color:var(--muted);font-size:12px}.report-review-message.success{color:#9ad9bd}.report-review-message.error{color:#ffb8bf}.report-review-current{margin:10px 0 0;color:var(--muted);font-size:11px}
  .print-only{display:none}.machine-text{direction:ltr;unicode-bidi:isolate;overflow-wrap:anywhere;word-break:break-word}.finding-tail{display:grid;grid-template-columns:140px minmax(0,1fr);grid-column:1/-1;gap:7px 14px}.gdpr-compact-print table{width:100%;border-collapse:collapse}.gdpr-compact-print th,.gdpr-compact-print td{text-align:left;padding:5px 8px;border-bottom:1px solid var(--border)}.artifact-table td small{display:block;margin-top:3px}.report-review-list{display:grid;gap:8px;margin-bottom:14px}.report-review-empty{margin:0;color:var(--muted);font-size:12px}.report-review-record{position:relative;padding:11px 106px 11px 12px;border:1px solid var(--border);border-radius:9px;background:rgba(17,26,47,.72)}.report-review-record>div{display:flex;align-items:baseline;gap:8px;flex-wrap:wrap}.report-review-record>div span{color:#c8c2ff;font-size:11px}.report-review-record p{margin:4px 0;color:var(--muted);font-size:12px}.report-review-record small{display:block;color:var(--muted);font-size:10px}.report-review-record button{position:absolute;right:10px;top:10px;border:1px solid var(--border-strong);border-radius:8px;background:rgba(139,124,255,.12);color:#ddd8ff;padding:6px 9px;font:inherit;font-size:11px;cursor:pointer}.report-review-form-title{margin:0 0 9px;color:#d9d4ff;font-size:12px;text-transform:uppercase;letter-spacing:.05em}.report-review-actions .report-review-cancel{background:transparent;color:#d9d4ff}
  .relationship-legend{border:1px solid var(--border);border-radius:11px;padding:12px 14px;margin:10px 0 14px;background:rgba(139,124,255,.055)}.relationship-legend h3{font-size:13px;margin-bottom:8px}.relationship-legend>div{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.relationship-legend p{margin:0}.relationship-legend p strong,.relationship-legend p span{display:block}.relationship-legend p span,.relationship-legend small{font-size:11px;color:var(--muted)}.mapping-governance article{padding:8px 0;border-bottom:1px solid var(--border)}.mapping-governance article:last-child{border-bottom:0}
  @media screen and (max-width:1024px){.wrap{padding-inline:20px}.cover{padding:32px}.cover-meta{grid-template-columns:1fr}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.mapping-card>summary{grid-template-columns:1.2fr 1fr 1fr}.mapping-card>summary span:nth-child(4){grid-column:2}.integrity-summary,.review-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
  @media screen and (max-width:768px){html{scroll-padding-top:76px}.wrap{padding-inline:16px}.cover{padding:28px}.stats{grid-template-columns:repeat(2,minmax(0,1fr))}.structured-grid,.notice-grid{grid-template-columns:1fr}.mapping-card>summary{grid-template-columns:1fr 1fr}.mapping-card>summary span:nth-child(4){grid-column:auto}.mapping-detail{grid-template-columns:1fr}.mapping-detail .wide{grid-column:auto}.artifact-table th:nth-child(2),.artifact-table td:nth-child(2){display:none}.report-nav{top:8px}}
  @media screen and (max-width:768px){.report-review-workspace{grid-template-columns:1fr;align-items:stretch}.report-review-fields{grid-template-columns:1fr}.report-review-note{grid-column:1}.report-review-advanced .report-review-fields{grid-template-columns:1fr}}
  @media screen and (max-width:520px){.wrap{padding:14px 14px 52px}.cover{padding:24px 18px;border-radius:17px}h1{font-size:32px}h2{font-size:20px;margin-top:36px}h2::after{display:none}.actions{display:grid;grid-template-columns:repeat(2,minmax(0,1fr))}.actions a{text-align:center}.cover-meta div{grid-template-columns:1fr;gap:1px;margin-bottom:6px}.conclusion{align-items:flex-start}.conclusion span{width:max-content;max-width:100%}.cards{grid-template-columns:1fr}.stat{min-height:86px}.finding-card header{grid-template-columns:1fr}.badge{justify-self:start;min-width:72px}.detail-grid,.finding-tail{grid-template-columns:1fr;gap:2px}.detail-grid dd,.finding-tail dd{margin-bottom:9px}.mapping-card>summary{grid-template-columns:minmax(0,1fr)}.mapping-card>summary span,.mapping-card>summary span:nth-child(4){grid-column:1}.integrity-summary,.review-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.artifact-table th:nth-child(3),.artifact-table td:nth-child(3){display:none}.artifact-table th:nth-child(1){width:62%}.artifact-table th:nth-child(4){width:38%}.card-head{align-items:flex-start}.report-nav{margin-inline:-2px}}
  @media screen and (max-width:520px){.report-review-context{grid-template-columns:1fr}.report-review-workspace{padding:14px}.report-review-form{padding:12px}.report-review-control>summary{align-items:flex-start;flex-direction:column;gap:2px}}
  @media screen and (max-width:520px){.report-review-record{padding:11px}.report-review-record button{position:static;margin-top:8px}}
  @media screen and (max-width:360px){.stats,.integrity-summary,.review-grid{grid-template-columns:1fr}.actions{grid-template-columns:1fr}}
  @page{size:A4 portrait;margin:18mm 16mm 18mm}
  @media print{
    :root{color-scheme:light;background:#fff}
    html,body{overflow:visible;background:#fff!important;color:#172033;font-size:9.5pt;line-height:1.42}
    .wrap{max-width:none;padding:0}.screen-only,.print-hide{display:none!important}.print-only{display:block!important}
    .cover{min-height:235mm;break-after:page;padding:20mm 0 0;border:0;border-radius:0;background:#fff;box-shadow:none}.cover::after,h2::after{display:none}
    .eyebrow{color:#5747c7}h1{font-size:27pt}h2{font-size:15pt;color:#18223a;margin:8mm 0 3mm;break-after:avoid}.lead,.muted,small,.finding-meta,.footer{color:#5f6879}
    .notice{color:#4e3a18;background:#fff8e8;border-color:#e4c98f}.conclusion span{background:#f6f7fa;color:#18223a;border-color:#d7dce5}
    .stat,.card,.structured-card,.notice-item,.group,.mapping-card,.finding-card,.observation{background:#fff;border-color:#d7dce5;border-radius:5px;box-shadow:none}
    .stats,.cards{gap:3mm}.cards{grid-template-columns:repeat(2,minmax(0,1fr))}.structured-grid,.notice-grid{gap:3mm}
    .group,.mapping-card{overflow:visible}.group>summary,.mapping-card>summary{cursor:default}.group>summary{break-after:avoid}.group>summary::after,.mapping-card>summary::after{display:none}.items,.observation-list,.mapping-detail{border-color:#d7dce5;background:#fff}
    .badge.fail{color:#8a1827;background:#fde8eb}.badge.warning{color:#744500;background:#fff1dd}.badge.info{color:#1c4f73;background:#e9f3fb}a{color:#244b86;text-decoration:none}
    .avoid-break,.scope-card,.structured-card,.notice-item,.review-grid{break-inside:avoid;page-break-inside:avoid}
    .finding-card{break-inside:auto;page-break-inside:auto}.finding-card header{break-inside:avoid;break-after:avoid}.finding-tail{break-inside:avoid;break-before:avoid}
    .mapping-intro{break-inside:avoid;break-after:avoid}.mapping-card{break-inside:auto;page-break-inside:auto}.mapping-card>summary{grid-template-columns:1.4fr 1fr .8fr .8fr;break-inside:avoid;break-after:avoid}.mapping-detail h4{break-after:avoid}.mapping-unit li{break-inside:avoid}.mapping-citation{break-inside:avoid}
    .gdpr-compact-print{border:1px solid #d7dce5;border-radius:5px;padding:3mm}.gdpr-compact-print table{margin-bottom:3mm}.gdpr-compact-print th{background:#f5f6f9}.gdpr-compact-print p{margin:3mm 0}
    .artifact-table{border-color:#d7dce5}.artifact-table thead{display:table-header-group}.artifact-table th,.artifact-table td{border-color:#d7dce5;font-size:8pt}.artifact-table th{background:#f5f6f9;color:#172033}.artifact-block{break-inside:avoid;page-break-inside:avoid}.hash-row td{background:#fff}.hash-row code{font-size:6.8pt;word-break:normal;white-space:nowrap}
    .excerpt blockquote{background:#f5f3ff;border-color:#5747c7}.footer{border-color:#d7dce5}.section-count{position:static;width:auto;height:auto;clip:auto;overflow:visible;color:#5f6879;font-size:9pt;margin-bottom:2mm}
  }
  </style></head><body><main class="wrap" data-finding-count="${findings.length}" data-check-count="${summary.counts?.checks ?? summary.checks?.length ?? 0}">
  <section class="cover"><div class="eyebrow">Web Engineering Toolkit · Compliance Mapping</div><h1>Technical Compliance<br>Pre-Assessment</h1><p class="lead">A professional portable representation of the same canonical assessment used by the HTML, PDF, JSON, and findings CSV exports.</p><div class="cover-meta"><div><span>Project</span><strong>${escapeHtml(summary.projectName)}</strong></div><div><span>Target URL</span><strong class="machine-text">${escapeMachine(summary.finalUrl || summary.requestedUrl)}</strong></div><div><span>Environment</span><strong>${escapeHtml(summary.environment || 'Not specified')}</strong></div><div><span>${hasReviewWorkflow ? 'Scan evidence collected' : 'Assessment date/time'}</span><strong>${escapeHtml(generatedLabel)}</strong></div>${hasReviewWorkflow ? `<div><span>Review overlay updated</span><strong>${escapeHtml(workflowUpdatedLabel)}</strong></div><div><span>Workflow revision</span><strong class="machine-text">${escapeMachine(summary.workflow?.revision ?? 0)}</strong></div>` : ''}<div><span>Toolkit version</span><strong class="machine-text">${escapeMachine(summary.toolVersion || summary.scannerVersion || 'Unknown')}</strong></div><div><span>Compliance scanner</span><strong class="machine-text">${escapeMachine(summary.scannerVersion || 'Unknown')}</strong></div><div><span>Mapping catalog</span><strong class="machine-text">${escapeMachine(summary.mappingCatalogVersion || 'legacy-unversioned')}</strong></div><div><span>Report schema</span><strong class="machine-text">${escapeMachine(summary.schemaVersion || 'Unknown')}</strong></div><div><span>Evidence level</span><strong>${escapeHtml(humanize(summary.evidenceLevel || 'public_url'))}</strong></div></div><div class="conclusion"><span>Compliance conclusion: <strong>Not determined</strong></span><span>Coverage: <strong>Partial</strong></span>${hasReviewWorkflow ? `<span>Review progress: <strong>${progress.reviewedFindings} of ${progress.totalFindings} findings reviewed</strong></span>` : ''}</div><div class="notice"><strong>This report is a technical compliance pre-assessment.</strong>${hasReviewWorkflow ? ' Human review is a separate overlay;' : ''} It is not legal advice, certification, or an audit opinion.</div><nav class="actions screen-only" aria-label="Report downloads"><a href="summary.html">HTML</a><a href="${escapeHtml(csvLink)}" download>Findings CSV</a>${pdfLink}<a href="evidence/manifest.json" download>Evidence Manifest</a></nav></section>
  <nav class="report-nav screen-only" aria-label="Report sections"><a href="#overview">Overview</a><a href="#scope">Scope</a><a href="#quality">Quality</a><a href="#evidence">Evidence</a><a href="#observations">Observations</a><a href="#findings">Findings</a><a href="#mappings">Mappings</a><a href="#integrity">Integrity</a><a href="#review">Review</a></nav>
  <section id="overview"><h2>1. Assessment Overview</h2><div class="stats"><div class="stat"><span>Checks executed</span><strong>${summary.counts?.checks ?? summary.checks?.length ?? 0}</strong></div><div class="stat"><span>Recorded observations</span><strong>${summary.counts?.observations ?? summary.testResults?.length ?? 0}</strong></div><div class="stat"><span>Normalized findings</span><strong>${findings.length}</strong></div><div class="stat"><span>Candidate control evaluations</span><strong>${summary.controlEvaluations?.length || 0}</strong></div></div>${hasReviewWorkflow ? `<h3>Human review overlay</h3><div class="stats review-grid"><div class="stat"><span>Review state</span><strong>${escapeHtml(humanize(progress.state))}</strong></div><div class="stat"><span>Reviewed findings</span><strong>${progress.reviewedFindings}</strong></div><div class="stat"><span>Unreviewed findings</span><strong>${progress.unreviewedFindings}</strong></div><div class="stat"><span>Requires more evidence</span><strong>${progress.requiresMoreEvidence || 0}</strong></div></div><p class="lead">Review progress is workflow progress only. It is not a compliance, readiness, certification, or control-coverage score.</p>` : ''}</section>
  <section id="scope"><h2>2. Scope and Applicability</h2><div class="cards">${frameworks || '<p>No framework scope cards were produced.</p>'}</div></section>
  <section id="quality"><h2>3. Assessment Quality / Coverage</h2><div class="stats"><div class="stat"><span>Technical checks completed</span><strong>${testStateCounts.confirmed || 0}</strong></div><div class="stat"><span>Observed / partial evidence</span><strong>${testStateCounts.observed || 0}</strong></div><div class="stat"><span>Not assessed</span><strong>${testStateCounts.not_tested || 0}</strong></div><div class="stat"><span>Failed to test</span><strong>${testStateCounts.failed_to_test || 0}</strong></div></div><p class="lead">These totals describe technical collection state. They do not confirm framework requirements or control satisfaction.</p>${collectionCoverage.length ? `<h3>Collection Coverage</h3><div class="structured-grid">${collectionCoverageCards}</div><p class="lead">Collector states describe bounded execution only. They are not a score or a compliance conclusion.</p>` : ''}</section>
  <section id="evidence"><h2>4. Structured Evidence</h2><div class="structured-grid"><article class="structured-card avoid-break"><span>Payment-flow evidence</span><strong>${escapeHtml(payment.paymentFlowObserved ? 'Observed / partial evidence' : 'Not determined')}</strong><table><tr><th>Payment/card terminology</th><td>${payment.cardTerminologyObserved ? 'Observed' : 'Not observed'}</td></tr><tr><th>Payment provider evidence</th><td>${payment.providerHosts?.length ? `Observed — ${escapeHtml(payment.providerHosts.join(', '))}` : 'Not observed'}</td></tr><tr><th>Merchant-managed scripts</th><td>${payment.merchantManagedScriptsObserved ? 'Observed' : 'Not observed'}</td></tr><tr><th>Payment architecture</th><td>${escapeHtml(humanize(payment.architecture || 'unknown'))}</td></tr><tr><th>Tested origin participation</th><td>${payment.testedOriginParticipatesInPaymentFlow === true ? 'Observed' : 'Unknown'}</td></tr><tr><th>Card-data handling</th><td>Not determined</td></tr></table></article>${runtimeEvidenceCard}<article class="structured-card avoid-break"><span>Locale coverage</span><strong>${escapeHtml(humanize(summary.localeCoverage?.state || 'locale_parity_not_assessed'))}</strong><table><tr><th>Detected content locales</th><td>${escapeHtml(availableLocales.join(', ') || 'None detected')}</td></tr><tr><th>Tested locales</th><td>${escapeHtml(testedLocales.join(', ') || 'None')}</td></tr><tr><th>Untested content locales</th><td>${escapeHtml(untestedLocales.join(', ') || 'None')}</td></tr><tr><th>Language signals</th><td>${escapeHtml(languageSignals.join(', ') || 'None')}</td></tr></table></article><article class="structured-card avoid-break"><span>Public policy evidence</span><strong>${policyDocuments.length} document(s) assessed</strong><table>${policyDocuments.map((item) => `<tr><th><a class="machine-text" href="${escapeMachine(item.sourceUrl)}">${escapeMachine(item.sourceUrl)}</a></th><td>${escapeHtml(humanize(item.policyDocumentQuality))}<br><small>Locale ${escapeHtml(item.detectedLocale || 'unknown')} · Extraction ${item.policyDocumentQuality === 'failed_to_extract' ? 'failed' : 'successful'}</small></td></tr>`).join('') || '<tr><td>Not assessed</td></tr>'}</table></article><article class="structured-card avoid-break"><span>GDPR public-notice evidence</span><strong>${escapeHtml(humanize(gdprAggregate(summary)))}</strong><p>${gdprAggregate(summary) === 'not_assessed' ? 'All public-notice elements are not assessed.' : gdprAggregate(summary) === 'no_public_evidence_observed' ? 'Pages were assessed but no matching public evidence was observed.' : gdprAggregate(summary) === 'failed_to_assess' ? 'Extraction or testing failed.' : 'At least one element was observed or partially observed.'}</p></article></div>
  <h3>GDPR public-notice matrix</h3>${compactGdprMatrix}<div class="notice-grid${homogeneousGdprNotAssessed ? ' print-hide' : ''}">${gdprMatrix.map((item) => gdprCard(item, assessedPages)).join('') || '<p>Not assessed.</p>'}</div></section>
  <section id="observations"><h2>5. Technical Observations</h2>${observationGroups || '<p>No checks recorded.</p>'}</section>
  <section id="findings"><h2>6. Findings</h2><div class="report-review-workspace screen-only" data-report-review-workspace data-project-name="${escapeHtml(summary.projectName)}"><div><h3>Report Review</h3><p>Add or edit reviewer decisions for this assessment. Saved changes update the project review history and refresh affected reports.</p><span class="report-review-connection" role="status" aria-live="polite">Connecting to the toolkit review workflow…</span></div><div class="report-review-context"><label><span>Reviewer name</span><input type="text" name="reportReviewer" maxlength="80" placeholder="Name or application identity" autocomplete="off" disabled></label><label><span>Reviewer role</span><select name="reportReviewerRole" disabled><option value="reviewer">Reviewer</option><option value="compliance_owner">Compliance owner</option><option value="legal_reviewer">Legal reviewer</option><option value="external_reviewer">External reviewer</option></select></label></div></div><p class="section-count">${findings.length} normalized finding${findings.length === 1 ? '' : 's'}</p>${findingGroups}</section>
  <section id="mappings"><div class="mapping-intro"><h2>7. Candidate Control Mappings</h2><div class="notice mapping-limit"><strong>Global mapping limitation:</strong> Automated evidence covers only the observed technical portion relevant to a candidate control. Control satisfaction, organizational implementation, scope completeness, and operating effectiveness remain not determined.</div>${relationshipLegend}</div>${(summary.controlEvaluations || []).map(mappingCard).join('') || '<p>No candidate mappings were produced for the selected scope.</p>'}</section>
  <section id="integrity"><h2>8. Evidence Integrity</h2><div class="stats integrity-summary"><div class="stat"><span>Unique artifacts with SHA-256</span><strong>${hashCount} / ${artifacts.length}</strong></div><div class="stat"><span>Manifest integrity records</span><strong>${hashCount === artifacts.length ? 'Complete' : 'Incomplete'}</strong></div><div class="stat"><span>Hash algorithm</span><strong>SHA-256</strong></div><div class="stat"><span>Authenticity / signature</span><strong>${signed ? 'HMAC signed' : 'Not configured'}</strong></div><div class="stat"><span>Restricted artifacts</span><strong>${restrictedCount}</strong></div><div class="stat"><span>Metadata-safe artifacts</span><strong>${artifacts.length - restrictedCount}</strong></div></div><p class="lead">Integrity hashes detect artifact changes. Identical binary content is counted once and may carry multiple evidence roles. Authenticity is separate: an unsigned manifest is not authenticated.</p><table class="artifact-table"><thead><tr><th>Artifact / roles</th><th>Type</th><th>Size</th><th>Access</th></tr></thead>${artifacts.map((item) => `<tbody class="artifact-block"><tr><td><span class="machine-text">${escapeMachine(item.id)}</span>${(item.roles || []).length > 1 ? `<small>Roles: ${escapeMachine(item.roles.join(', '))}</small>` : ''}</td><td>${escapeHtml(item.type)}</td><td>${escapeHtml(String(item.bytes || 0))} bytes</td><td>${item.sensitive ? 'Restricted' : 'Metadata-safe'}</td></tr><tr class="hash-row"><td colspan="4"><details><summary>SHA-256 <span class="screen-only">${escapeMachine(`${String(item.sha256 || '').slice(0, 12)}…${String(item.sha256 || '').slice(-12)}`)}</span></summary><code class="machine-text">${escapeMachine(item.sha256)}</code></details></td></tr></tbody>`).join('') || '<tbody><tr><td colspan="4">No artifacts recorded.</td></tr></tbody>'}</table></section>
  <section id="review"><h2>9. Human Review Status</h2><div class="stats review-grid"><div class="stat"><span>Total findings</span><strong data-report-review-count="total">${findings.length}</strong></div><div class="stat"><span>Reviewed findings</span><strong data-report-review-count="reviewed">${reviewed.length}</strong></div><div class="stat"><span>Awaiting review</span><strong data-report-review-count="awaiting">${Math.max(0, findings.length - reviewed.length)}</strong></div><div class="stat"><span>Reviewer records</span><strong data-report-review-count="review_records">${reviewRecordCount}</strong></div><div class="stat"><span>Accepted observations</span><strong data-report-review-count="accepted_as_observation">${decisionCount('accepted_as_observation')}</strong></div><div class="stat"><span>False positives</span><strong data-report-review-count="false_positive">${decisionCount('false_positive')}</strong></div><div class="stat"><span>More evidence required</span><strong data-report-review-count="requires_more_evidence">${decisionCount('requires_more_evidence')}</strong></div></div><div class="notice">Compliance conclusion: <strong>Not determined</strong>. Reviewer decisions never change control satisfaction or the compliance conclusion automatically.</div></section>
  <section id="limitations"><h2>10. Assessment Limitations / Disclaimer</h2><p>${escapeHtml(summary.disclaimer || 'This technical pre-assessment is bounded to the collected evidence and requires qualified human review.')}</p><p class="footer">Web Engineering Toolkit — Compliance Mapping · Technical Compliance Pre-Assessment</p></section>
  </main><script>
  (() => {
    const workspace = document.querySelector('[data-report-review-workspace]');
    if (!workspace) return;
    const projectName = workspace.dataset.projectName || '';
    const connection = workspace.querySelector('.report-review-connection');
    const reviewerInput = workspace.querySelector('[name="reportReviewer"]');
    const roleInput = workspace.querySelector('[name="reportReviewerRole"]');
    const controls = Array.from(document.querySelectorAll('[data-report-review-finding]'));
    let workflowRevision = Number(${JSON.stringify(summary.workflow?.revision ?? 0)});
    const humanizeValue = (value) => String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
    const reviewedRecord = (record) => Boolean(record && (record.reviewDecision || record.scopeDecision || record.mappingDecision));
    const reviewsFor = (record = {}) => Array.isArray(record.reviews) && record.reviews.length ? record.reviews : reviewedRecord(record) ? [{ reviewId: record.primaryReviewId || '', reviewer: record.reviewer || '', role: record.role || 'reviewer', reviewDecision: record.reviewDecision || '', scopeDecision: record.scopeDecision || '', mappingDecision: record.mappingDecision || '', reason: record.reason || '', createdAt: record.updatedAt || '', updatedAt: record.updatedAt || '' }] : [];
    const readResponse = async (response) => {
      const payload = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(payload.error || 'The review request failed.');
      return payload;
    };
    const setConnection = (message, state = '') => {
      connection.textContent = message;
      connection.className = 'report-review-connection' + (state ? ' ' + state : '');
    };
    const setInteractive = (enabled) => {
      reviewerInput.disabled = !enabled;
      roleInput.disabled = !enabled;
      controls.forEach((control) => control.querySelectorAll('select, textarea, button').forEach((field) => { field.disabled = !enabled; }));
    };
    const reviewDecisionText = (review) => [review.reviewDecision ? 'Review: ' + humanizeValue(review.reviewDecision) : '', review.scopeDecision ? 'Scope: ' + humanizeValue(review.scopeDecision) : '', review.mappingDecision ? 'Mapping: ' + humanizeValue(review.mappingDecision) : ''].filter(Boolean).join(' · ');
    const resetForm = (form, clearMessage = true) => {
      delete form.dataset.reviewId;
      form.elements.reviewDecision.value = '';
      form.elements.scopeDecision.value = '';
      form.elements.mappingDecision.value = '';
      form.elements.mappingId.value = '';
      form.elements.scopeFramework.value = '';
      form.elements.reason.value = '';
      form.querySelector('.report-review-form-title').textContent = 'Add reviewer decision';
      form.querySelector('button[type="submit"]').textContent = 'Add review';
      form.querySelector('.report-review-cancel').hidden = true;
      if (clearMessage) {
        const message = form.querySelector('.report-review-message');
        message.textContent = '';
        message.className = 'report-review-message';
      }
    };
    const renderReviewList = (control) => {
      const list = control.querySelector('.report-review-list');
      list.replaceChildren();
      if (!control.reviewRecords.length) {
        const empty = document.createElement('p');
        empty.className = 'report-review-empty';
        empty.textContent = 'No reviewer decision has been saved.';
        list.append(empty);
        return;
      }
      control.reviewRecords.forEach((review) => {
        const card = document.createElement('article');
        card.className = 'report-review-record';
        card.dataset.reportReviewId = review.reviewId || '';
        const heading = document.createElement('div');
        const name = document.createElement('strong');
        name.textContent = review.reviewer || 'Unnamed reviewer';
        const role = document.createElement('span');
        role.textContent = humanizeValue(review.role || 'reviewer');
        heading.append(name, role);
        const decisions = document.createElement('p');
        decisions.textContent = reviewDecisionText(review) || 'Review decision not recorded';
        const reason = document.createElement('p');
        reason.textContent = review.reason || '';
        card.append(heading, decisions, reason);
        if (review.updatedAt || review.createdAt) {
          const date = new Date(review.updatedAt || review.createdAt);
          const dateLabel = document.createElement('small');
          dateLabel.textContent = Number.isNaN(date.getTime()) ? String(review.updatedAt || review.createdAt) : date.toLocaleString();
          card.append(dateLabel);
        }
        const edit = document.createElement('button');
        edit.type = 'button';
        edit.className = 'report-review-edit';
        edit.dataset.reviewId = review.reviewId || '';
        edit.textContent = 'Edit review';
        edit.disabled = !review.reviewId;
        card.append(edit);
        list.append(card);
      });
    };
    const applyRecord = (control, record = {}) => {
      control.reviewRecords = reviewsFor(record);
      const reviewCount = control.reviewRecords.length;
      control.dataset.reviewed = String(reviewCount > 0);
      control.querySelector(':scope > summary > span').textContent = 'Reviewer decisions';
      control.querySelector('.report-review-summary-state').textContent = reviewCount ? reviewCount + ' reviewer' + (reviewCount === 1 ? '' : 's') : 'Awaiting review';
      renderReviewList(control);
      resetForm(control.querySelector('form'));
    };
    const updateCounts = () => {
      const reviewedControls = controls.filter((control) => control.dataset.reviewed === 'true');
      const reviewRecords = controls.flatMap((control) => control.reviewRecords || []);
      const decisions = reviewRecords.reduce((counts, review) => {
        const decision = review.reviewDecision || '';
        if (decision) counts[decision] = (counts[decision] || 0) + 1;
        return counts;
      }, {});
      const values = { total: controls.length, reviewed: reviewedControls.length, awaiting: Math.max(0, controls.length - reviewedControls.length), review_records: reviewRecords.length, accepted_as_observation: decisions.accepted_as_observation || 0, false_positive: decisions.false_positive || 0, requires_more_evidence: decisions.requires_more_evidence || 0 };
      Object.entries(values).forEach(([name, value]) => {
        const target = document.querySelector('[data-report-review-count="' + name + '"]');
        if (target) target.textContent = String(value);
      });
    };
    document.addEventListener('click', (event) => {
      const cancel = event.target.closest('.report-review-cancel');
      if (cancel) {
        resetForm(cancel.closest('form'));
        return;
      }
      const edit = event.target.closest('.report-review-edit');
      if (!edit || !edit.dataset.reviewId) return;
      const control = edit.closest('[data-report-review-finding]');
      const review = (control.reviewRecords || []).find((item) => item.reviewId === edit.dataset.reviewId);
      if (!review) return;
      const form = control.querySelector('form');
      form.dataset.reviewId = review.reviewId;
      form.elements.reviewDecision.value = review.reviewDecision || '';
      form.elements.scopeDecision.value = review.scopeDecision || '';
      form.elements.mappingDecision.value = review.mappingDecision || '';
      form.elements.mappingId.value = review.mappingId || '';
      form.elements.scopeFramework.value = review.scopeFramework || '';
      form.elements.reason.value = review.reason || '';
      reviewerInput.value = review.reviewer || '';
      roleInput.value = review.role || 'reviewer';
      form.querySelector('.report-review-form-title').textContent = 'Edit reviewer decision';
      form.querySelector('button[type="submit"]').textContent = 'Update review';
      form.querySelector('.report-review-cancel').hidden = false;
      control.open = true;
      form.elements.reviewDecision.focus();
    });
    const connect = async () => {
      try {
        if (!/^https?:$/.test(window.location.protocol)) throw new Error('Open this report through the Web Engineering Toolkit server to add or edit reviews.');
        const workflow = await readResponse(await fetch('/api/security/review-workflow?project=' + encodeURIComponent(projectName), { headers: { Accept: 'application/json' } }));
        workflowRevision = Number(workflow.revision || 0);
        const byFingerprint = new Map((workflow.findings || []).map((record) => [record.fingerprint, record]));
        controls.forEach((control) => {
          const record = byFingerprint.get(control.dataset.fingerprint);
          if (record) applyRecord(control, record);
        });
        setInteractive(true);
        updateCounts();
        setConnection('Connected. Reviewer identity is used for saves only and is not stored in this browser.', 'connected');
      } catch (error) {
        setInteractive(false);
        setConnection(error.message || 'Review controls are unavailable in this copy of the report.', 'error');
      }
    };
    document.addEventListener('submit', async (event) => {
      const form = event.target.closest('.report-review-form');
      if (!form) return;
      event.preventDefault();
      const control = form.closest('[data-report-review-finding]');
      const reviewer = reviewerInput.value.trim();
      const reason = form.elements.reason.value.trim();
      const reviewDecision = form.elements.reviewDecision.value;
      const scopeDecision = form.elements.scopeDecision.value;
      const mappingDecision = form.elements.mappingDecision.value;
      const mappingId = form.elements.mappingId.value;
      const scopeFramework = form.elements.scopeFramework.value;
      const message = form.querySelector('.report-review-message');
      const button = form.querySelector('button[type="submit"]');
      message.className = 'report-review-message';
      if (!reviewer) {
        message.textContent = 'Enter the reviewer name above.';
        message.classList.add('error');
        reviewerInput.focus();
        return;
      }
      if (!(reviewDecision || scopeDecision || mappingDecision)) {
        message.textContent = 'Choose at least one review, scope, or mapping decision.';
        message.classList.add('error');
        form.elements.reviewDecision.focus();
        return;
      }
      if (!reason) {
        message.textContent = 'Add an evidence-based review note.';
        message.classList.add('error');
        form.elements.reason.focus();
        return;
      }
      try {
        button.disabled = true;
        message.textContent = 'Saving review and refreshing affected reports…';
        const reviewId = form.dataset.reviewId || '';
        const reviewEndpoint = '/api/security/findings/' + encodeURIComponent(control.dataset.fingerprint) + '/reviews' + (reviewId ? '/' + encodeURIComponent(reviewId) : '');
        const record = await readResponse(await fetch(reviewEndpoint, {
          method: reviewId ? 'PUT' : 'POST',
          headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
          body: JSON.stringify({ projectName, expectedWorkflowRevision: workflowRevision, findingStatus: 'reviewed', reviewDecision, scopeDecision, mappingDecision, mappingId, scopeFramework, reason, reviewer, role: roleInput.value })
        }));
        workflowRevision = Number(record.workflowRevision || workflowRevision + 1);
        applyRecord(control, record);
        updateCounts();
        const refreshed = Array.isArray(record.refreshedReports) ? record.refreshedReports.length : 0;
        message.textContent = (reviewId ? 'Review updated' : 'Reviewer added') + (refreshed ? '; ' + refreshed + ' report' + (refreshed === 1 ? '' : 's') + ' refreshed.' : '.');
        message.className = 'report-review-message success';
        setConnection('Connected. The latest reviewer decisions are loaded from the toolkit.', 'connected');
      } catch (error) {
        message.textContent = error.message || 'Unable to save this review.';
        message.className = 'report-review-message error';
        if (/updated by another client/i.test(message.textContent)) setConnection('Review workflow changed elsewhere. Reload the report before saving again.', 'error');
      } finally {
        button.disabled = false;
      }
    });
    setInteractive(false);
    connect();
  })();
  </script></body></html>`;
}
