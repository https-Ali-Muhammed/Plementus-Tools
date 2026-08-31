import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureDir, slugify, timestamp, csvEscape } from './utils.js';
import { buildComplianceHtml } from './security-report-html.js';
import { generateCompliancePdf } from './security-pdf.js';
import { reportDownloadHref } from './report-downloads.js';
import { validateFindingProvenance, validateSummaryTraceability } from './security-finding-model.js';
import { normalizeCollectionMethod, normalizeCollectionState, normalizeEvidenceConfidence, normalizeEvidenceStrength } from './security-evidence-semantics.js';
import {
  applicabilityPresentation,
  controlManualReviewReasons,
  FRAMEWORK_DISPLAY_NAMES,
  frameworkDisplayName,
  manualReviewReasonLabels,
  RELATIONSHIP_DEFINITIONS,
  RELATIONSHIP_DISCLAIMER,
  REVIEW_REASON_DEFINITIONS
} from './security-compliance-semantics.js';

function humanize(value) { return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function mappingFrameworkLabel(mapping = {}) {
  const framework = /^EPRIVACY-|^GDPR-EPRIVACY-/i.test(mapping.controlId || '') ? 'eprivacy' : mapping.framework || '';
  return frameworkDisplayName(framework);
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
function statusColor(status) { return ({ pass: 'FF177B57', warning: 'FF9B5F09', fail: 'FFB4233A', manual: 'FF5A4EB4', info: 'FF416889' })[status] || 'FF416889'; }
function statusFill(status) { return ({ pass: 'FFE5F7EF', warning: 'FFFFF1DD', fail: 'FFFDE8EB', manual: 'FFEDEAFE', info: 'FFE9F3FB' })[status] || 'FFF4F6F9'; }

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

export function spreadsheetSafeReviewText(value = '') {
  const text = String(value || '');
  return /^[\s\u0000-\u001f]*[=+\-@]/u.test(text) ? `'${text}` : text;
}

export function buildReviewSummary(findings = [], workflow = {}) {
  const decisions = (workflow.findingDecisions || []).length
    ? workflow.findingDecisions
    : findings.map((finding) => finding.decision || finding);
  const byFingerprint = new Map(decisions.map((decision) => [decision.fingerprint, decision]));
  const relevant = findings.map((finding) => byFingerprint.get(finding.fingerprint) || finding.decision || finding);
  const reviewed = relevant.filter((item) => item.findingStatus === 'reviewed' || item.status === 'reviewed' || item.reviewDecision || item.scopeDecision || item.mappingDecision);
  const count = (field, value) => relevant.filter((item) => item[field] === value || (item.reviews || []).some((review) => review[field] === value)).length;
  return {
    label: 'Review progress',
    state: reviewed.length === 0 ? 'not_started' : reviewed.length === findings.length ? 'reviewed' : 'in_progress',
    totalFindings: findings.length,
    reviewedFindings: reviewed.length,
    unreviewedFindings: Math.max(0, findings.length - reviewed.length),
    acceptedObservations: count('reviewDecision', 'accepted_as_observation'),
    falsePositives: count('reviewDecision', 'false_positive'),
    requiresMoreEvidence: count('reviewDecision', 'requires_more_evidence'),
    mappingConfirmed: count('mappingDecision', 'confirmed'),
    mappingRejected: count('mappingDecision', 'rejected'),
    scopeConfirmed: count('scopeDecision', 'confirmed'),
    scopeNotConfirmed: count('scopeDecision', 'not_confirmed'),
    complianceConclusion: 'not_determined',
    controlSatisfaction: 'not_determined'
  };
}

export function describeIntegrityMetadata({ evidenceManifest = {}, reportManifest = {} } = {}) {
  const artifacts = evidenceManifest.artifacts || [];
  const validHashCount = artifacts.filter((artifact) => /^[a-f0-9]{64}$/i.test(String(artifact.sha256 || ''))).length;
  const signature = reportManifest.signature || evidenceManifest.signature || {};
  const signatureRecorded = signature.algorithm === 'hmac-sha256' && /^[a-f0-9]{64}$/i.test(String(signature.value || ''));
  const signatureMalformed = signature.algorithm === 'hmac-sha256' && !signatureRecorded;
  return {
    verification: 'not_performed',
    artifactHashLabel: 'Artifacts with SHA-256 recorded',
    artifactHashValue: `${validHashCount} / ${artifacts.length}`,
    manifestLabel: 'Manifest hash metadata',
    manifestValue: artifacts.length && validHashCount === artifacts.length ? 'Complete metadata; not verified in this view' : artifacts.length ? 'Incomplete metadata; not verified in this view' : 'No artifact metadata',
    signatureLabel: 'Signature metadata',
    signatureValue: signatureRecorded ? 'HMAC signature recorded; not verified in this view' : signatureMalformed ? 'Malformed HMAC signature metadata; not verified in this view' : 'Not configured',
    integrityVerified: false,
    authenticityVerified: false
  };
}

function reportMimeType(file) {
  return ({ '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.pdf': 'application/pdf' })[path.extname(file)] || 'application/octet-stream';
}

function stripBrowserSecrets(browserScan = {}) {
  const { screenshotBase64, sessionState, storageState, ...safe } = browserScan;
  const storageMetadata = (storage = {}) => ({
    localStorageKeys: [...(storage.localStorageKeys || [])],
    sessionStorageKeys: [...(storage.sessionStorageKeys || [])],
    ...(storage.detectedLocale ? { detectedLocale: storage.detectedLocale } : {}),
    ...(typeof storage.consentInterfaceDetected === 'boolean' ? { consentInterfaceDetected: storage.consentInterfaceDetected } : {})
  });
  const cookieMetadata = ({ value, ...cookie }) => ({ ...cookie, value: '[REDACTED]' });
  const networkMetadata = ({ requestHeaders, responseHeaders, requestBody, responseBody, body, postData, authorization, headers, cookieHeader, ...record }) => record;
  safe.resources = (safe.resources || []).map(networkMetadata);
  safe.apiObservations = (safe.apiObservations || []).map(networkMetadata);
  safe.cookies = (safe.cookies || []).map(cookieMetadata);
  safe.storage = storageMetadata(safe.storage || {});
  safe.authenticatedPages = (safe.authenticatedPages || []).map(({ headers, bodyText, screenshotBase64: pageScreenshot, ...page }) => page);
  safe.consentScenarios = (safe.consentScenarios || []).map(({ screenshotBase64: scenarioScreenshot, cookies = [], storage = {}, networkObservations = [], ...scenario }) => ({ ...scenario, cookies: cookies.map(cookieMetadata), storage: storageMetadata(storage), networkObservations: networkObservations.map(networkMetadata) }));
  return safe;
}

function publicSummary(summary) {
  const { evidenceArchive, ...safe } = summary;
  return { ...safe, browserScan: stripBrowserSecrets(summary.browserScan || {}) };
}

function reportWorkflow({ summary, reportName, lifecycleManager, revision = 1 }) {
  const fingerprints = new Set((summary.findings || []).map((finding) => finding.fingerprint).filter(Boolean));
  const snapshot = lifecycleManager ? lifecycleManager.snapshot(summary.projectName) : null;
  const findingDecisions = lifecycleManager
    ? snapshot.findings.filter((item) => fingerprints.has(item.fingerprint)).map((item) => ({
      fingerprint: item.fingerprint,
      findingId: item.findingId,
      findingStatus: item.findingStatus || item.status || 'open',
      reviewDecision: item.reviewDecision || '',
      scopeDecision: item.scopeDecision || '',
      mappingDecision: item.mappingDecision || '',
      mappingId: item.mappingId || '',
      scopeFramework: item.scopeFramework || '',
      reason: item.reason || '',
      reviewer: item.reviewer || item.actor || '',
      role: item.role || 'reviewer',
      updatedAt: item.updatedAt || '',
      evidenceRefs: [...(item.evidenceRefs || [])],
      reviews: (item.reviews || []).map((review) => ({ reviewId: review.reviewId, reviewer: review.reviewer || '', role: review.role || 'reviewer', reviewDecision: review.reviewDecision || '', scopeDecision: review.scopeDecision || '', mappingDecision: review.mappingDecision || '', mappingId: review.mappingId || '', scopeFramework: review.scopeFramework || '', reason: review.reason || '', createdAt: review.createdAt || '', updatedAt: review.updatedAt || '', revision: review.revision ?? null, evidenceRefs: [...(review.evidenceRefs || [])] }))
    }))
    : (summary.findings || []).map((finding) => ({ fingerprint: finding.fingerprint, findingId: finding.id, findingStatus: finding.findingStatus || finding.status || 'open', reviewDecision: finding.reviewDecision || '', scopeDecision: finding.scopeDecision || '', mappingDecision: finding.mappingDecision || '', reason: '', reviewer: '', role: 'reviewer', updatedAt: '', evidenceRefs: [], reviews: finding.decision?.reviews || [] }));
  const workflow = { schemaVersion: '3.0.0', revision: snapshot?.revision ?? revision, reportName, projectName: summary.projectName, scanGeneratedAt: summary.generatedAt, updatedAt: snapshot?.updatedAt || summary.generatedAt, state: 'review_required', history: (snapshot?.history || []).filter((entry) => fingerprints.has(entry.fingerprint)).slice(-100), findingDecisions };
  const reviewSummary = buildReviewSummary(summary.findings || [], workflow);
  workflow.state = reviewSummary.state;
  workflow.reviewSummary = reviewSummary;
  return workflow;
}

function applyWorkflow(summary, workflow) {
  const decisions = new Map((workflow.findingDecisions || []).map((item) => [item.fingerprint, item]));
  return {
    ...summary,
    workflow,
    findings: (summary.findings || []).map((finding) => {
      const decision = decisions.get(finding.fingerprint);
      if (!decision) return finding;
      const findingStatus = decision.findingStatus || decision.status || 'open';
      return { ...finding, status: findingStatus, findingStatus, reviewDecision: decision.reviewDecision || '', scopeDecision: decision.scopeDecision || '', mappingDecision: decision.mappingDecision || '', decision };
    }),
    reviewSummary: workflow.reviewSummary || buildReviewSummary(summary.findings || [], workflow)
  };
}

export function normalizeLegacySummary(summary) {
  const normalizeLegacyEvidence = (item = {}) => ({
    ...item,
    collectionMethod: item.collectionMethod || normalizeCollectionMethod(item.sourceMethod || item.testMethod || 'manual'),
    collectionState: item.collectionState || normalizeCollectionState(item.testState || item.state || 'not_tested'),
    evidenceConfidence: item.evidenceConfidence || normalizeEvidenceConfidence(item.confidence || 'unknown'),
    normalizedEvidenceStrength: item.normalizedEvidenceStrength || normalizeEvidenceStrength(item.evidenceStrength || item.relationship || 'unknown', { collectionMethod: item.collectionMethod || item.sourceMethod || item.testMethod || 'manual' })
  });
  const normalizeLegacyMapping = (mapping = {}) => ({
    ...mapping,
    rationale: mapping.rationale || '',
    sourceVersion: mapping.sourceVersion || mapping.frameworkVersion || 'legacy_source_version_not_recorded',
    lastReviewedAt: mapping.lastReviewedAt || '',
    reviewedBy: mapping.reviewedBy || '',
    changeReason: mapping.changeReason || 'Legacy mapping governance metadata was not recorded.',
    approvedBy: mapping.approvedBy ?? null,
    approvalDate: mapping.approvalDate ?? null
  });
  return {
    ...summary,
    assessmentType: summary.assessmentType || 'compliance_pre_assessment',
    evidenceLevel: summary.evidenceLevel || 'public_url',
    complianceConclusion: summary.complianceConclusion || 'not_determined',
    coverage: summary.coverage || 'partial',
    mappingCatalogVersion: summary.mappingCatalogVersion || 'legacy-unversioned',
    relationshipDefinitions: summary.relationshipDefinitions || RELATIONSHIP_DEFINITIONS,
    relationshipDisclaimer: summary.relationshipDisclaimer || RELATIONSHIP_DISCLAIMER,
    frameworkDefinitions: summary.frameworkDefinitions || FRAMEWORK_DISPLAY_NAMES,
    reviewReasonDefinitions: summary.reviewReasonDefinitions || REVIEW_REASON_DEFINITIONS,
    scopeEvidence: Array.isArray(summary.scopeEvidence) ? summary.scopeEvidence : [],
    collectionCoverage: summary.collectionCoverage || {},
    findings: Array.isArray(summary.findings) ? summary.findings.map((finding) => ({ ...finding, evidenceItems: (finding.evidenceItems || (finding.evidence ? [finding.evidence] : [])).map(normalizeLegacyEvidence) })) : [],
    testResults: Array.isArray(summary.testResults) ? summary.testResults.map(normalizeLegacyEvidence) : [],
    controlEvaluations: Array.isArray(summary.controlEvaluations) ? summary.controlEvaluations.map((control) => {
      const automatedEvidence = (control.automatedEvidence || []).map(normalizeLegacyEvidence);
      const failedEvidenceItems = automatedEvidence.filter((item) => item.collectionState === 'failed_to_test').length;
      const notAssessedEvidenceItems = automatedEvidence.filter((item) => item.collectionState === 'not_tested').length;
      const mappings = (control.mappings || []).map(normalizeLegacyMapping);
      const coverageSummary = control.coverageSummary || { totalEvidenceItems: automatedEvidence.length, completedEvidenceItems: automatedEvidence.filter((item) => item.collectionState === 'completed').length, partialEvidenceItems: automatedEvidence.filter((item) => item.collectionState === 'partial').length, failedEvidenceItems, notAssessedEvidenceItems, manualReviewEvidenceItems: 0, uncertainPrerequisiteItems: 0, complete: automatedEvidence.length > 0 && failedEvidenceItems === 0 && notAssessedEvidenceItems === 0 };
      return { ...control, controlSatisfaction: control.controlSatisfaction || 'not_determined', coverage: control.coverage || 'partial', mappings, automatedEvidence, coverageSummary, coverageQualifiers: control.coverageQualifiers || [...(failedEvidenceItems ? ['failed_evidence_present'] : []), ...(notAssessedEvidenceItems ? ['not_assessed_evidence_present'] : []), ...(failedEvidenceItems || notAssessedEvidenceItems ? ['coverage_incomplete'] : [])], manualReviewRequired: control.manualReviewRequired !== false, manualReviewReasons: control.manualReviewReasons || controlManualReviewReasons({ framework: String(control.controlId || '').startsWith('LOCAL-') ? 'local' : '', classified: [], coverageSummary, mappings }) };
    }) : [],
    checks: Array.isArray(summary.checks) ? summary.checks : [],
    vaultEvidence: Array.isArray(summary.vaultEvidence) ? summary.vaultEvidence : [],
    frameworkResults: (summary.frameworkResults || []).map((framework) => { const display = applicabilityPresentation(framework.applicability || 'unknown', { inputState: framework.applicabilityInput || 'unknown' }); return { ...framework, label: frameworkDisplayName(framework.id), applicabilityLabel: display.label, selectedForMapping: framework.selectedForMapping !== false, selectionLabel: framework.selectionLabel || display.selectionLabel, publicEvidence: framework.publicEvidence || [], technicalControls: framework.technicalControls || [], missingEvidence: framework.missingEvidence || [], controlEvaluations: framework.controlEvaluations || [], evidenceItems: framework.evidenceItems || [], evidenceStatements: framework.evidenceStatements || [], attentionFindings: framework.attentionFindings || [], controlSatisfaction: framework.controlSatisfaction || 'not_determined', coverage: framework.coverage || 'partial' }; }),
    totals: { pass: 0, warning: 0, fail: 0, manual: 0, info: 0, ...(summary.totals || {}) },
    counts: { checks: (summary.checks || []).length, observations: (summary.testResults || []).length, findings: (summary.findings || []).length, evidenceItems: 0, controlMappings: 0, controlEvaluations: (summary.controlEvaluations || []).length, ...(summary.counts || {}) },
    policyDocumentQuality: summary.policyDocumentQuality || [],
    gdprPublicNoticeMatrix: summary.gdprPublicNoticeMatrix || [],
    localeCoverage: summary.localeCoverage || { state: 'locale_parity_not_assessed', availableLocales: [], contentLocalesDiscovered: [], policyLocalesTested: [], languageSignals: [] },
    paymentFlow: summary.paymentFlow || { paymentFlowObserved: false, architecture: 'unknown', providerHosts: [], cardDataHandling: 'not_determined', pciScopeConclusion: 'requires_scope_confirmation' },
    consentAssessment: summary.consentAssessment || { policyClaimObserved: false, runtimeBehaviorObserved: false, claimNotVerified: false, confirmedRuntimeMismatch: false, scenarios: [], conclusion: 'not_assessed' }
  };
}

export function writeEvidenceArchive(root, archive = {}) {
  const evidenceRoot = ensureDir(path.join(root, 'evidence'));
  const artifacts = [];
  const binaryContent = new Map();
  const writeArtifact = (id, relativePath, value, { type = 'application/json', sensitive = false, binary = false } = {}) => {
    if (value == null || value === '') return;
    const file = path.join(evidenceRoot, relativePath);
    ensureDir(path.dirname(file));
    const buffer = binary ? Buffer.from(value, 'base64') : Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    const digest = sha256(buffer);
    if (binary) {
      const contentKey = `${digest}:${buffer.length}`;
      const canonical = binaryContent.get(contentKey);
      if (canonical) {
        canonical.roles.push(id);
        canonical.aliases.push({ id, intendedPath: `evidence/${relativePath}` });
        canonical.sensitive = canonical.sensitive || sensitive;
        return;
      }
      const artifact = { id, roles: [id], aliases: [], type, path: `evidence/${relativePath}`, sha256: digest, bytes: buffer.length, sensitive };
      binaryContent.set(contentKey, artifact);
      fs.writeFileSync(file, buffer);
      artifacts.push(artifact);
      return;
    }
    fs.writeFileSync(file, buffer);
    artifacts.push({ id, type, path: `evidence/${relativePath}`, sha256: digest, bytes: buffer.length, sensitive });
  };

  writeArtifact('scan-metadata', 'scan-metadata.json', archive.metadata || {});
  writeArtifact('initial-http-response', 'http/initial-response.json', archive.http?.initialResponse || {}, { sensitive: true });
  writeArtifact('set-cookie-headers', 'http/set-cookie.json', archive.http?.initialResponse?.rawSetCookieHeaders || [], { sensitive: true });
  const browser = archive.browser || {};
  writeArtifact('browser-attempts', 'browser/attempts.json', browser.attempts || []);
  writeArtifact('browser-cookies', 'browser/cookies.json', browser.cookies || [], { sensitive: true });
  writeArtifact('browser-network', 'browser/network.json', browser.resources || [], { sensitive: true });
  writeArtifact('browser-console', 'browser/console.json', browser.consoleMessages || []);
  writeArtifact('browser-storage', 'browser/storage.json', browser.storage || {}, { sensitive: true });
  writeArtifact('consent-scenarios', 'browser/consent-scenarios.json', (browser.consentScenarios || []).map(({ screenshotBase64, ...scenario }) => scenario), { sensitive: true });
  for (const [index, scenario] of (browser.consentScenarios || []).entries()) writeArtifact(`consent-scenario-screenshot-${index + 1}`, `browser/consent-scenario-${index + 1}.png`, scenario.screenshotBase64, { type: 'image/png', sensitive: true, binary: true });
  writeArtifact('browser-screenshot', 'browser/page.png', browser.screenshotBase64, { type: 'image/png', sensitive: true, binary: true });
  writeArtifact('authenticated-pages', 'browser/authenticated-pages.json', (browser.authenticatedPages || []).map(({ screenshotBase64, ...page }) => page), { sensitive: true });
  for (const [index, page] of (browser.authenticatedPages || []).entries()) {
    writeArtifact(`authenticated-page-screenshot-${index + 1}`, `browser/authenticated-page-${index + 1}.png`, page.screenshotBase64, { type: 'image/png', sensitive: true, binary: true });
  }
  writeArtifact('tls-analysis', 'tls/analysis.json', archive.tls || {});
  writeArtifact('crawl-pages', 'crawl/pages.json', archive.crawl?.pages || [], { sensitive: true });
  writeArtifact('crawl-errors', 'crawl/errors.json', archive.crawl?.errors || []);
  writeArtifact('zap-json-report', 'zap/report.json', archive.zap?.rawReport || null, { sensitive: true });
  writeArtifact('zap-execution', 'zap/execution.json', archive.zap ? { mode: archive.zap.mode, image: archive.zap.image, state: archive.zap.state, stdout: archive.zap.stdout, stderr: archive.zap.stderr } : null, { sensitive: true });

  const manifest = {
    schemaVersion: '1.2.0',
    scan: archive.metadata || {},
    generatedAt: new Date().toISOString(),
    artifactCount: artifacts.length,
    access: 'local-filesystem-only',
    note: 'Sensitive evidence is intentionally not served by the generic /reports static route.',
    immutableSnapshot: true,
    artifacts
  };
  const signingKey = process.env.SECURITY_REPORT_SIGNING_KEY || '';
  manifest.signature = signingKey ? { algorithm: 'hmac-sha256', value: crypto.createHmac('sha256', signingKey).update(JSON.stringify(artifacts)).digest('hex') } : { algorithm: 'none', value: '', reason: 'SECURITY_REPORT_SIGNING_KEY is not configured.' };
  const manifestBuffer = Buffer.from(`${JSON.stringify(manifest, null, 2)}\n`, 'utf8');
  fs.writeFileSync(path.join(evidenceRoot, 'manifest.json'), manifestBuffer);
  for (const artifact of artifacts) { try { fs.chmodSync(path.join(root, artifact.path), 0o440); } catch {} }
  try { fs.chmodSync(path.join(evidenceRoot, 'manifest.json'), 0o440); } catch {}
  return manifest;
}

function writeSignedReportManifest(root, summary, files) {
  const entries = files.map((file) => {
    const buffer = fs.readFileSync(path.join(root, file));
    return { file, filename: file, mimeType: reportMimeType(file), bytes: buffer.length, size: buffer.length, sha256: sha256(buffer) };
  });
  const signingKey = process.env.SECURITY_REPORT_SIGNING_KEY || '';
  const signedPayload = { schemaVersion: '1.4.0', reportType: summary.reportType, toolVersion: summary.toolVersion || summary.scannerVersion, scannerVersion: summary.scannerVersion, mappingCatalogVersion: summary.mappingCatalogVersion, projectName: summary.projectName, generatedAt: summary.generatedAt, workflowRevision: summary.workflow?.revision || 0, workflowUpdatedAt: summary.workflow?.updatedAt || summary.generatedAt, reviewSummary: summary.reviewSummary || buildReviewSummary(summary.findings || [], summary.workflow || {}), immutableEvidenceSnapshot: true, files: entries };
  const manifest = { ...signedPayload, signature: signingKey ? { algorithm: 'hmac-sha256', value: crypto.createHmac('sha256', signingKey).update(JSON.stringify(signedPayload)).digest('hex') } : { algorithm: 'none', value: '', reason: 'SECURITY_REPORT_SIGNING_KEY is not configured.' } };
  fs.writeFileSync(path.join(root, 'report-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const file of [...files, 'report-manifest.json']) { try { fs.chmodSync(path.join(root, file), 0o444); } catch {} }
  return manifest;
}

function writeCsv(root, summary) {
  const rows = [['Finding ID','Title','Severity','Legacy Confidence','Collection State','Evidence Confidence','Collection Method','Normalized Evidence Strength','Finding Status','Review Decision','Scope Decision','Mapping Decision','Decision Reason','Reviewed By','Reviewer Role','Review Date','Affected URL','Evidence Type','Evidence Strength','Source Method','Evidence','Impact','Recommendation','References','Controls','Mapping Relationships','Mapping Prerequisites','Mapping Applicability','Assessment Type','Evidence Level','Compliance Conclusion','Coverage','First Seen','Last Seen','Test Method','Tool Version','Scanner Version','Mapping Catalog Version','Limitations']];
  for (const item of summary.findings || []) {
    rows.push([item.id,item.title,item.severity,item.confidence,item.evidence?.collectionState||'',item.evidence?.confidence||item.evidence?.evidenceConfidence||'',item.evidence?.collectionMethod||'',item.evidence?.normalizedEvidenceStrength||'',item.findingStatus||item.status,item.decision?.reviewDecision||'',item.decision?.scopeDecision||'',item.decision?.mappingDecision||'',spreadsheetSafeReviewText(item.decision?.reason||''),spreadsheetSafeReviewText(item.decision?.reviewer||item.decision?.actor||''),spreadsheetSafeReviewText(item.decision?.role||''),item.decision?.updatedAt||'',item.affectedUrl||'',item.evidence?.evidenceType||item.evidence?.type||'',item.evidence?.evidenceStrength||'',item.evidence?.sourceMethod||'',item.evidence?.raw||'',item.impact,item.recommendation,(item.references||[]).join(' | '),(item.controls||[]).join(' | '),(item.controlMappings||[]).map((mapping)=>`${mappingFrameworkLabel(mapping)} ${mapping.controlId}: ${mapping.relationship}`).join(' | '),(item.controlMappings||[]).flatMap((mapping)=>mapping.prerequisiteResults||[]).map((entry)=>`${entry.prerequisite}: ${entry.state}`).join(' | '),Object.entries(item.mappingApplicability||{}).map(([framework,state])=>`${framework}: ${state}`).join(' | '),summary.assessmentType,summary.evidenceLevel,summary.complianceConclusion,'partial',item.firstSeen,item.lastSeen,item.testMethod,item.toolVersion,summary.scannerVersion,summary.mappingCatalogVersion,(item.limitations||[]).join(' | ')]);
  }
  const csv = `\uFEFF${rows.map(row=>row.map(csvEscape).join(',')).join('\n')}\n`;
  fs.writeFileSync(path.join(root,'findings.csv'),csv,'utf8');
  fs.writeFileSync(path.join(root,'summary.csv'),csv,'utf8');
}

export class SecurityReportManager {
  constructor({ reportsRoot, evidenceVault = null, lifecycleManager = null, pdfGenerator = generateCompliancePdf, browserPath = '' }) {
    this.reportsRoot = reportsRoot;
    this.evidenceVault = evidenceVault;
    this.lifecycleManager = lifecycleManager;
    this.pdfGenerator = pdfGenerator;
    this.browserPath = browserPath;
  }

  makeReportWritable(root) {
    for (const file of ['metadata.json','summary.json','summary.csv','findings.csv','summary.html','summary.pdf','workflow.json','report-manifest.json']) {
      try { fs.chmodSync(path.join(root, file), 0o644); } catch {}
    }
  }

  async writeReportFiles(root, summary) {
    const htmlStarted = performance.now();
    summary = { ...summary, pdfGeneration: { status: 'pending', method: 'playwright_chromium_print_to_pdf' } };
    fs.writeFileSync(path.join(root,'summary.html'),buildComplianceHtml(summary),'utf8');
    const htmlGenerationMs = Math.round(performance.now() - htmlStarted);
    const pendingPdf = path.join(root, 'summary.pdf.pending');
    const finalPdf = path.join(root, 'summary.pdf');
    try {
      const pdfResult = await this.pdfGenerator({ htmlPath: path.join(root, 'summary.html'), pdfPath: pendingPdf, summary, browserPath: this.browserPath });
      fs.renameSync(pendingPdf, finalPdf);
      const pdfStat = fs.statSync(finalPdf);
      summary = { ...summary, pdfGeneration: { status: 'generated', method: pdfResult?.method || 'playwright_chromium_print_to_pdf', durationMs: pdfResult?.durationMs ?? null, bytes: pdfStat.size } };
    } catch (error) {
      try { fs.unlinkSync(pendingPdf); } catch {}
      try { fs.unlinkSync(finalPdf); } catch {}
      summary = { ...summary, pdfGeneration: { status: 'failed', method: 'playwright_chromium_print_to_pdf', reason: error.message } };
    }
    summary = { ...summary, reportGeneration: { ...(summary.reportGeneration || {}), htmlGenerationMs, pdfGenerationMs: summary.pdfGeneration.durationMs ?? null } };
    const metadata = { reportType:'security-compliance', assessmentType:summary.assessmentType, evidenceLevel:summary.evidenceLevel, complianceConclusion:summary.complianceConclusion, coverage:'partial', collectionCoverage:summary.collectionCoverage||{}, schemaVersion:summary.schemaVersion, toolVersion:summary.toolVersion||summary.scannerVersion, scannerVersion:summary.scannerVersion, mappingCatalogVersion:summary.mappingCatalogVersion, projectName:summary.projectName, targetUrl:summary.requestedUrl, generatedAt:summary.generatedAt, frameworks:summary.frameworks, jurisdiction:summary.jurisdiction, counts:summary.counts, evidenceArtifactCount:summary.evidenceManifest?.artifactCount || 0, workflowRevision:summary.workflow?.revision || 0, workflowUpdatedAt:summary.workflow?.updatedAt || summary.generatedAt, reviewSummary:summary.reviewSummary||buildReviewSummary(summary.findings||[],summary.workflow||{}), pdfGeneration:summary.pdfGeneration };
    const overview = { reportType:'security-compliance', assessmentType:summary.assessmentType, evidenceLevel:summary.evidenceLevel, complianceConclusion:summary.complianceConclusion, coverage:'partial', collectionCoverage:summary.collectionCoverage||{}, toolVersion:summary.toolVersion||summary.scannerVersion, scannerVersion:summary.scannerVersion, mappingCatalogVersion:summary.mappingCatalogVersion, projectName:summary.projectName, baseUrl:summary.finalUrl, generatedAt:summary.generatedAt, workflowRevision:summary.workflow?.revision||0, workflowUpdatedAt:summary.workflow?.updatedAt||summary.generatedAt, reviewSummary:summary.reviewSummary||buildReviewSummary(summary.findings||[],summary.workflow||{}), overallStatus:summary.overallStatus, counts:summary.counts, checksWithoutAdverseObservation:summary.totals.pass, attentionFindings:summary.totals.fail + summary.totals.warning, frameworks:summary.frameworkResults.map(f=>f.label), exports:{ html:true, json:true, findingsCsv:true, pdf:summary.pdfGeneration.status === 'generated' }, pdfGeneration:summary.pdfGeneration };
    fs.writeFileSync(path.join(root,'metadata.json'),JSON.stringify(metadata,null,2));
    fs.writeFileSync(path.join(root,'summary.json'),JSON.stringify({ ...summary, overview },null,2));
    fs.writeFileSync(path.join(root,'workflow.json'),`${JSON.stringify(summary.workflow || {},null,2)}\n`);
    writeCsv(root,summary);
    fs.writeFileSync(path.join(root,'summary.html'),buildComplianceHtml(summary),'utf8');
    const files = ['metadata.json','summary.json','findings.csv','summary.csv','summary.html','workflow.json'];
    if (summary.pdfGeneration.status === 'generated' && fs.existsSync(finalPdf)) files.push('summary.pdf');
    if (fs.existsSync(path.join(root, 'evidence', 'manifest.json'))) files.push('evidence/manifest.json');
    return { reportManifest: writeSignedReportManifest(root, summary, files), summary };
  }

  async save(summary) {
    ensureDir(this.reportsRoot);
    const runName = `${slugify(summary.projectName)}_security-compliance_${timestamp()}`;
    const root = path.join(this.reportsRoot, runName);
    ensureDir(root);
    const evidenceManifest = writeEvidenceArchive(root, summary.evidenceArchive || {});
    const vaultEvidence = this.evidenceVault ? this.evidenceVault.registerScan({ projectName: summary.projectName, reportName: runName, manifest: evidenceManifest }) : [];
    const provenanceValidation = validateFindingProvenance(summary.findings || [], evidenceManifest);
    if (!provenanceValidation.valid) throw new Error(`Finding provenance validation failed: ${provenanceValidation.errors.join('; ')}`);
    const traceabilityValidation = validateSummaryTraceability(summary, evidenceManifest);
    if (!traceabilityValidation.valid) throw new Error(`Summary traceability validation failed: ${traceabilityValidation.errors.join('; ')}`);
    summary = { ...publicSummary(summary), evidenceManifest: { schemaVersion: evidenceManifest.schemaVersion, artifactCount: evidenceManifest.artifactCount, access: evidenceManifest.access, artifacts: evidenceManifest.artifacts, signature: evidenceManifest.signature }, vaultEvidence, provenanceValidation, traceabilityValidation };
    summary = applyWorkflow({ ...summary, reportName: runName }, reportWorkflow({ summary, reportName: runName, lifecycleManager: this.lifecycleManager, revision: 1 }));
    const written = await this.writeReportFiles(root, summary);
    summary = written.summary;
    const pdfHref = summary.pdfGeneration.status === 'generated' ? reportDownloadHref(runName, 'pdf') : '';
    return { ...summary, reportManifest:written.reportManifest, integrityPresentation: describeIntegrityMetadata({ evidenceManifest, reportManifest: written.reportManifest }), reportName:runName, summaryHref:`/reports/${encodeURIComponent(runName)}/summary.html`, jsonHref:`/reports/${encodeURIComponent(runName)}/summary.json`, csvHref:reportDownloadHref(runName, 'csv'), legacyCsvHref:`/reports/${encodeURIComponent(runName)}/summary.csv`, pdfHref, evidenceManifestHref:`/reports/${encodeURIComponent(runName)}/evidence/manifest.json` };
  }

  async refreshWorkflow({ projectName = '', reportName = '', legacyOnly = false } = {}) {
    if (!fs.existsSync(this.reportsRoot)) return [];
    const updated = [];
    for (const entry of fs.readdirSync(this.reportsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || (reportName && entry.name !== reportName)) continue;
      const root = path.join(this.reportsRoot, entry.name);
      const summaryFile = path.join(root, 'summary.json');
      if (!fs.existsSync(summaryFile)) continue;
      let summary;
      try { summary = normalizeLegacySummary(JSON.parse(fs.readFileSync(summaryFile, 'utf8'))); } catch { continue; }
      const workflowIsCurrent = summary.workflow?.schemaVersion === '3.0.0';
      if (summary.overview?.reportType !== 'security-compliance' || (projectName && summary.projectName !== projectName) || (legacyOnly && workflowIsCurrent)) continue;
      const workflow = reportWorkflow({ summary, reportName: entry.name, lifecycleManager: this.lifecycleManager, revision: (summary.workflow?.revision || 0) + 1 });
      summary = applyWorkflow({ ...summary, reportName: entry.name }, workflow);
      this.makeReportWritable(root);
      await this.writeReportFiles(root, summary);
      updated.push(entry.name);
    }
    return updated;
  }
}
