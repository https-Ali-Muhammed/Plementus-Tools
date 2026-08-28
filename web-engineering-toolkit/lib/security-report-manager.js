import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureDir, slugify, timestamp, csvEscape } from './utils.js';
import { buildComplianceHtml } from './security-report-html.js';
import { generateCompliancePdf } from './security-pdf.js';
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
  return ({ '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.pdf': 'application/pdf' })[path.extname(file)] || 'application/octet-stream';
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
  const findingDecisions = lifecycleManager
    ? lifecycleManager.list(summary.projectName).filter((item) => fingerprints.has(item.fingerprint)).map((item) => ({
      fingerprint: item.fingerprint,
      findingId: item.findingId,
      findingStatus: item.findingStatus || item.status || 'open',
      reviewDecision: item.reviewDecision || '',
      scopeDecision: item.scopeDecision || '',
      mappingDecision: item.mappingDecision || '',
      reason: item.reason || '',
      reviewer: item.reviewer || item.actor || '',
      role: item.role || 'reviewer',
      updatedAt: item.updatedAt || '',
      evidenceRefs: [...(item.evidenceRefs || [])],
      reviews: (item.reviews || []).map((review) => ({ reviewId: review.reviewId, reviewer: review.reviewer || '', role: review.role || 'reviewer', reviewDecision: review.reviewDecision || '', scopeDecision: review.scopeDecision || '', mappingDecision: review.mappingDecision || '', reason: review.reason || '', createdAt: review.createdAt || '', updatedAt: review.updatedAt || '', evidenceRefs: [...(review.evidenceRefs || [])] }))
    }))
    : (summary.findings || []).map((finding) => ({ fingerprint: finding.fingerprint, findingId: finding.id, findingStatus: finding.findingStatus || finding.status || 'open', reviewDecision: finding.reviewDecision || '', scopeDecision: finding.scopeDecision || '', mappingDecision: finding.mappingDecision || '', reason: '', reviewer: '', role: 'reviewer', updatedAt: '', evidenceRefs: [], reviews: finding.decision?.reviews || [] }));
  return { schemaVersion: '2.0.0', revision, reportName, projectName: summary.projectName, updatedAt: new Date().toISOString(), state: findingDecisions.some((item) => item.findingStatus === 'reviewed') ? 'reviewed' : 'review_required', findingDecisions };
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
    })
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
  const signedPayload = { schemaVersion: '1.4.0', reportType: summary.reportType, toolVersion: summary.toolVersion || summary.scannerVersion, scannerVersion: summary.scannerVersion, mappingCatalogVersion: summary.mappingCatalogVersion, projectName: summary.projectName, generatedAt: summary.generatedAt, workflowRevision: summary.workflow?.revision || 1, workflowUpdatedAt: summary.workflow?.updatedAt || summary.generatedAt, immutableEvidenceSnapshot: true, files: entries };
  const manifest = { ...signedPayload, signature: signingKey ? { algorithm: 'hmac-sha256', value: crypto.createHmac('sha256', signingKey).update(JSON.stringify(signedPayload)).digest('hex') } : { algorithm: 'none', value: '', reason: 'SECURITY_REPORT_SIGNING_KEY is not configured.' } };
  fs.writeFileSync(path.join(root, 'report-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const file of [...files, 'report-manifest.json']) { try { fs.chmodSync(path.join(root, file), 0o444); } catch {} }
  return manifest;
}

function writeCsv(root, summary) {
  const rows = [['Finding ID','Title','Severity','Legacy Confidence','Collection State','Evidence Confidence','Collection Method','Normalized Evidence Strength','Finding Status','Review Decision','Scope Decision','Mapping Decision','Decision Reason','Reviewed By','Reviewer Role','Review Date','Affected URL','Evidence Type','Evidence Strength','Source Method','Evidence','Impact','Recommendation','References','Controls','Mapping Relationships','Mapping Prerequisites','Mapping Applicability','Assessment Type','Evidence Level','Compliance Conclusion','Coverage','First Seen','Last Seen','Test Method','Tool Version','Scanner Version','Mapping Catalog Version','Limitations']];
  for (const item of summary.findings || []) {
    rows.push([item.id,item.title,item.severity,item.confidence,item.evidence?.collectionState||'',item.evidence?.confidence||item.evidence?.evidenceConfidence||'',item.evidence?.collectionMethod||'',item.evidence?.normalizedEvidenceStrength||'',item.findingStatus||item.status,item.decision?.reviewDecision||'',item.decision?.scopeDecision||'',item.decision?.mappingDecision||'',item.decision?.reason||'',item.decision?.reviewer||item.decision?.actor||'',item.decision?.role||'',item.decision?.updatedAt||'',item.affectedUrl||'',item.evidence?.evidenceType||item.evidence?.type||'',item.evidence?.evidenceStrength||'',item.evidence?.sourceMethod||'',item.evidence?.raw||'',item.impact,item.recommendation,(item.references||[]).join(' | '),(item.controls||[]).join(' | '),(item.controlMappings||[]).map((mapping)=>`${mappingFrameworkLabel(mapping)} ${mapping.controlId}: ${mapping.relationship}`).join(' | '),(item.controlMappings||[]).flatMap((mapping)=>mapping.prerequisiteResults||[]).map((entry)=>`${entry.prerequisite}: ${entry.state}`).join(' | '),Object.entries(item.mappingApplicability||{}).map(([framework,state])=>`${framework}: ${state}`).join(' | '),summary.assessmentType,summary.evidenceLevel,summary.complianceConclusion,'partial',item.firstSeen,item.lastSeen,item.testMethod,item.toolVersion,summary.scannerVersion,summary.mappingCatalogVersion,(item.limitations||[]).join(' | ')]);
  }
  const csv = `\uFEFF${rows.map(row=>row.map(csvEscape).join(',')).join('\n')}\n`;
  fs.writeFileSync(path.join(root,'findings.csv'),csv,'utf8');
  fs.writeFileSync(path.join(root,'summary.csv'),csv,'utf8');
}

async function writeXlsx(root, summary) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Developer Toolkit';
  const navy = 'FF11192D', border = 'FFE0E5EE', text = 'FF1F2A3D', muted = 'FF667085';
  const overview = workbook.addWorksheet('Summary', { views: [{ showGridLines: false }] });
  overview.columns = [{ width: 26 }, { width: 52 }, { width: 4 }, { width: 24 }, { width: 18 }, { width: 18 }, { width: 18 }];
  overview.mergeCells('A1:G2'); overview.getCell('A1').value = 'Compliance Pre-assessment Report'; overview.getCell('A1').font = { size: 22, bold: true, color: { argb: 'FFFFFFFF' } }; overview.getCell('A1').fill = { type:'pattern',pattern:'solid',fgColor:{argb:navy} }; overview.getCell('A1').alignment={vertical:'middle'};
  const details = [['Report type','Compliance Pre-assessment'],['Evidence level',humanize(summary.evidenceLevel)],['Compliance conclusion',humanize(summary.complianceConclusion)],['Coverage','Partial'],['Tool version',summary.toolVersion||summary.scannerVersion],['Mapping catalog',summary.mappingCatalogVersion||'legacy-unversioned'],['Project',summary.projectName],['Requested URL',summary.requestedUrl],['Final URL',summary.finalUrl],['HTTP status',summary.responseStatus],['Jurisdiction',summary.jurisdiction || 'Not specified'],['Generated',new Date(summary.generatedAt).toLocaleString()],['Scope note',summary.disclaimer]];
  details.forEach(([label,value],i)=>{const r=4+i; overview.getCell(r,1).value=label;overview.getCell(r,1).font={bold:true,color:{argb:muted}};overview.getCell(r,2).value=value;overview.getCell(r,2).alignment={wrapText:true,vertical:'top'};overview.getCell(r,2).font={color:{argb:text}};overview.getRow(r).height=label==='Scope note'?58:26;});
  overview.getCell('D4').value='Status';overview.getCell('D4').font={bold:true,color:{argb:muted}};
  [['No adverse observation',summary.totals.pass,'pass'],['Review',summary.totals.warning,'warning'],['Needs attention',summary.totals.fail,'fail'],['Manual review',summary.totals.manual,'manual']].forEach(([label,value,status],i)=>{const c=4+i;overview.getCell(5,c).value=label;overview.getCell(5,c).font={bold:true,color:{argb:muted}};overview.getCell(6,c).value=value;overview.getCell(6,c).font={size:18,bold:true,color:{argb:statusColor(status)}};overview.getCell(6,c).fill={type:'pattern',pattern:'solid',fgColor:{argb:statusFill(status)}};overview.getCell(5,c).alignment=overview.getCell(6,c).alignment={horizontal:'center'};});
  overview.getCell('D9').value='Assessment quality';overview.getCell('D9').font={bold:true,color:{argb:muted}};
  const qualityCounts=(summary.testResults||[]).reduce((counts,item)=>{counts[item.state]=(counts[item.state]||0)+1;return counts;},{});
  [['Technical checks completed',qualityCounts.confirmed||0],['Observed / partial evidence',qualityCounts.observed||0],['Not assessed',qualityCounts.not_tested||0],['Failed to test',qualityCounts.failed_to_test||0]].forEach(([label,value],i)=>{const c=4+i;overview.getCell(10,c).value=label;overview.getCell(10,c).font={bold:true,color:{argb:muted}};overview.getCell(10,c).alignment={wrapText:true,horizontal:'center'};overview.getCell(11,c).value=value;overview.getCell(11,c).font={size:16,bold:true,color:{argb:text}};overview.getCell(11,c).alignment={horizontal:'center'};});
  overview.getCell('D13').value='Compliance evidence';overview.getCell('D13').font={bold:true,color:{argb:muted}};
  summary.frameworkResults.forEach((fw,i)=>{const r=14+i;overview.getCell(r,4).value=frameworkDisplayName(fw.id);overview.getCell(r,4).font={bold:true,color:{argb:text}};overview.getCell(r,5).value=fw.applicabilityLabel||applicabilityPresentation(fw.applicability,{inputState:fw.applicabilityInput}).label;overview.getCell(r,6).value=`${(fw.publicEvidence||[]).length + (fw.technicalControls||[]).length} observed`;overview.getCell(r,7).value=`${(fw.missingEvidence||[]).length} missing/manual`;});

  const collection = workbook.addWorksheet('Collection Coverage', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  collection.columns=[{header:'Collector',width:24},{header:'Collection State',width:22},{header:'Limitations',width:90}];
  collection.getRow(1).height=34;collection.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const [collector,item] of Object.entries(summary.collectionCoverage||{})){const row=collection.addRow([humanize(collector),humanize(item.state||'not_tested'),(item.limitations||[]).join('\n')]);row.height=38;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  collection.getCell('A11').value='Collector states describe bounded execution only. They are not a score or compliance conclusion.';collection.mergeCells('A11:C11');collection.getCell('A11').font={italic:true,color:{argb:muted}};

  const guidance = workbook.addWorksheet('Mapping Guidance', { views: [{ showGridLines: false }] });
  guidance.columns = [{ width: 24 }, { width: 92 }];
  guidance.getCell('A1').value = 'Mapping relationships'; guidance.getCell('A1').font = { size: 18, bold: true, color: { argb: text } }; guidance.mergeCells('A1:B1');
  Object.values(summary.relationshipDefinitions || RELATIONSHIP_DEFINITIONS).forEach((definition, index) => { const row = guidance.getRow(index + 2); row.values = [definition.label, definition.shortDescription]; row.getCell(1).font = { bold: true, color: { argb: text } }; row.alignment = { vertical: 'top', wrapText: true }; });
  guidance.getCell('A8').value = summary.relationshipDisclaimer || RELATIONSHIP_DISCLAIMER; guidance.getCell('A8').font = { bold: true, color: { argb: muted } }; guidance.mergeCells('A8:B8');

  const findings = workbook.addWorksheet('Findings', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  findings.columns=[{header:'Finding ID',width:38},{header:'Title',width:38},{header:'Severity',width:14},{header:'Legacy Confidence',width:18},{header:'Collection State',width:18},{header:'Evidence Confidence',width:18},{header:'Collection Method',width:22},{header:'Evidence Strength',width:22},{header:'Finding Status',width:18},{header:'Review Decision',width:28},{header:'Scope Decision',width:22},{header:'Mapping Decision',width:22},{header:'Decision Reason',width:48},{header:'Reviewed By',width:24},{header:'Reviewer Role',width:24},{header:'Review Date',width:24},{header:'Affected URL',width:50},{header:'Evidence Type',width:24},{header:'Evidence',width:72},{header:'Impact',width:58},{header:'Recommendation',width:62},{header:'Controls',width:52},{header:'Mapping Applicability',width:44},{header:'Test Method',width:36},{header:'First Seen',width:24},{header:'Last Seen',width:24},{header:'Tool Version',width:16},{header:'Limitations',width:60}];
  findings.getRow(1).height=34;findings.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.findings || []){const row=findings.addRow([item.id,item.title,item.severity,item.confidence,item.evidence?.collectionState||'',item.evidence?.confidence||item.evidence?.evidenceConfidence||'',item.evidence?.collectionMethod||'',item.evidence?.normalizedEvidenceStrength||'',item.findingStatus||item.status,item.decision?.reviewDecision||'',item.decision?.scopeDecision||'',item.decision?.mappingDecision||'',item.decision?.reason||'',item.decision?.reviewer||item.decision?.actor||'',item.decision?.role||'',item.decision?.updatedAt||'',item.affectedUrl,item.evidence?.type||'',item.evidence?.raw||'',item.impact,item.recommendation,(item.controls||[]).join('\n'),Object.entries(item.mappingApplicability||{}).map(([framework,state])=>`${framework}: ${state}`).join('\n'),item.testMethod,item.firstSeen,item.lastSeen,item.toolVersion,(item.limitations||[]).join('\n')]);row.height=58;row.alignment={vertical:'top',wrapText:true};row.getCell(3).fill={type:'pattern',pattern:'solid',fgColor:{argb:statusFill(['critical','high'].includes(item.severity)?'fail':item.severity==='medium'?'warning':'info')}};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  findings.autoFilter={from:'A1',to:'AB1'};

  const coverage = workbook.addWorksheet('Test Coverage', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  coverage.columns=[{header:'Test ID',width:30},{header:'Title',width:38},{header:'Category',width:28},{header:'Outcome',width:18},{header:'Legacy State',width:18},{header:'Collection State',width:20},{header:'Evidence Confidence',width:18},{header:'Collection Method',width:22},{header:'Affected URL',width:50},{header:'Test Method',width:38},{header:'Summary',width:60},{header:'Limitations',width:62}];
  coverage.getRow(1).height=34;coverage.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.testResults || []){const row=coverage.addRow([item.id,item.title,item.category,statusLabel(item.outcome,item),item.stateLabel||humanize(item.state),humanize(item.collectionState||normalizeCollectionState(item.state)),humanize(item.evidenceConfidence||normalizeEvidenceConfidence(item.confidence)),humanize(item.collectionMethod||normalizeCollectionMethod(item.testMethod)),item.affectedUrl,item.testMethod,item.summary,(item.limitations||[]).join('\n')]);row.height=46;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  coverage.autoFilter={from:'A1',to:'L1'};

  const checks = workbook.addWorksheet('Security Checks', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  checks.columns=[{header:'Category',width:24},{header:'Check',width:34},{header:'Status',width:18},{header:'Severity',width:16},{header:'Affected URL',width:54},{header:'Summary',width:58},{header:'Details / Evidence',width:70},{header:'Recommendation',width:65},{header:'References',width:65},{header:'Frameworks',width:42}];
  checks.getRow(1).height=34;checks.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.checks){const evidenceItems=(item.evidenceItems||[]).map(e=>`${e.sourceUrl}: ${e.evidenceText}`).join(' | ');const row=checks.addRow([item.category,item.title,statusLabel(item.status,item),item.severity||'',item.affectedUrl||'',item.summary,[item.details,item.evidence,evidenceItems].filter(Boolean).join(' · '),item.recommendation,(item.references||[]).join('\n'),(item.frameworks||[]).join(', ')]);row.height=50;row.alignment={vertical:'top',wrapText:true};row.getCell(3).fill={type:'pattern',pattern:'solid',fgColor:{argb:statusFill(item.status)}};row.getCell(3).font={bold:true,color:{argb:statusColor(item.status)}};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  checks.autoFilter={from:'A1',to:'J1'};

  const mapping = workbook.addWorksheet('Compliance Mapping', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  mapping.columns=[{header:'Framework',width:24},{header:'Selected for Mapping',width:22},{header:'Applicability',width:38},{header:'Scope Basis',width:26},{header:'Scope Confidence',width:22},{header:'Control Satisfaction',width:24},{header:'Public Evidence',width:58},{header:'Technical Evidence Statements',width:68},{header:'Missing / Manual Evidence',width:58},{header:'Jurisdiction',width:24},{header:'Scope Note',width:72}];
  mapping.getRow(1).height=34;mapping.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const fw of summary.frameworkResults){const row=mapping.addRow([frameworkDisplayName(fw.id),fw.selectionLabel||'Selected for mapping',fw.applicabilityLabel||applicabilityPresentation(fw.applicability,{inputState:fw.applicabilityInput}).label,humanize(fw.scopeBasis),humanize(fw.scopeConfidence),humanize(fw.controlSatisfaction||'not_determined'),(fw.evidenceStatements||[]).map(item=>`${item.statement} [${(item.evidenceRefs||[]).join(', ')}]`).join('\n'),(fw.technicalEvidenceStatements||[]).map(item=>`${item.statement} [${(item.evidenceRefs||[]).join(', ')}]`).join('\n'),(fw.missingEvidence||[]).join('\n'),fw.jurisdiction||'',fw.note]);row.height=64;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}

  const controls = workbook.addWorksheet('Control Evidence', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  controls.columns=[{header:'Control ID',width:34},{header:'Evidence State',width:34},{header:'Control Satisfaction',width:24},{header:'Coverage',width:16},{header:'Coverage Qualifiers',width:42},{header:'Source Count',width:16},{header:'Source Checks',width:56},{header:'Evidence Level',width:24},{header:'Automated Evidence',width:76},{header:'Mapping Relationships',width:42},{header:'Prerequisites',width:58},{header:'Linked Findings',width:48},{header:'Manual Review Required',width:24},{header:'Review Reasons',width:48},{header:'Limitations',width:72}];
  controls.getRow(1).height=34;controls.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.controlEvaluations || []){const row=controls.addRow([item.controlId,humanize(item.state),humanize(item.controlSatisfaction),humanize(item.coverage),(item.coverageQualifiers||[]).map(humanize).join('\n'),item.provenanceSummary?.sourceCheckCount??(item.automatedEvidence||[]).length,(item.provenanceSummary?.sourceCheckIds||[]).join('\n'),humanize(item.evidenceLevel),(item.automatedEvidence||[]).map(e=>`${e.checkId}: ${e.outcome || 'not_recorded'} (${humanize(e.collectionState||e.testState||'not_recorded')}; ${humanize(e.evidenceState||e.normalizedEvidenceStrength||e.strength||'not_recorded')})`).join('\n'),(item.mappings||[]).map(mapping=>`${mapping.mappingId}: ${mapping.relationship}`).join('\n'),(item.mappings||[]).flatMap(mapping=>mapping.prerequisiteResults||[]).map(entry=>`${entry.prerequisite}: ${entry.state}`).join('\n'),(item.linkedFindings||[]).join('\n'),item.manualReviewRequired?'Yes':'No',manualReviewReasonLabels(item.manualReviewReasons||[]).join('\n'),(item.limitations||[]).join('\n')]);row.height=58;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  controls.autoFilter={from:'A1',to:'O1'};

  const governance = workbook.addWorksheet('Mapping Governance', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  governance.columns=[{header:'Mapping ID',width:54},{header:'Framework',width:22},{header:'Control ID',width:34},{header:'Relationship',width:18},{header:'Rationale',width:72},{header:'Source Version',width:52},{header:'Source Citation',width:72},{header:'Review Status',width:26},{header:'Last Reviewed',width:18},{header:'Reviewed By',width:30},{header:'Change Reason',width:72},{header:'Approved By',width:20},{header:'Approval Date',width:20}];
  governance.getRow(1).height=34;governance.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  const governanceMappings = [...new Map((summary.controlEvaluations || []).flatMap((control) => control.mappings || []).flatMap((entry) => entry.sourceGovernance || [entry]).map((entry) => [entry.mappingId, entry])).values()];
  for(const item of governanceMappings){const row=governance.addRow([item.mappingId,frameworkDisplayName(item.framework),item.controlId,item.relationship,item.rationale||'',item.sourceVersion||item.frameworkVersion||'',item.sourceCitation||'',item.reviewStatus||'',item.lastReviewedAt||'',item.reviewedBy||'',item.changeReason||'',item.approvedBy||'',item.approvalDate||'']);row.height=54;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}

  if (summary.crawl && Array.isArray(summary.crawl.pages) && summary.crawl.pages.length) {
    const evidence = workbook.addWorksheet('Crawled Evidence', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
    evidence.columns=[{header:'URL',width:60},{header:'Found',width:12},{header:'HTTP Status',width:14},{header:'Evidence Group(s)',width:32},{header:'Error',width:54}];
    evidence.getRow(1).height=34;evidence.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
    for(const page of summary.crawl.pages){const row=evidence.addRow([page.url,page.found?'Yes':'No',page.status||'','' + (page.groups||[]).join(', '),page.error||'']);row.height=24;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
    evidence.autoFilter={from:'A1',to:'E1'};
  }

  await workbook.xlsx.writeFile(path.join(root,'summary.xlsx'));
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
    for (const file of ['metadata.json','summary.json','summary.csv','findings.csv','summary.html','summary.xlsx','summary.pdf','workflow.json','report-manifest.json']) {
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
    const metadata = { reportType:'security-compliance', assessmentType:summary.assessmentType, evidenceLevel:summary.evidenceLevel, complianceConclusion:summary.complianceConclusion, coverage:'partial', collectionCoverage:summary.collectionCoverage||{}, schemaVersion:summary.schemaVersion, toolVersion:summary.toolVersion||summary.scannerVersion, scannerVersion:summary.scannerVersion, mappingCatalogVersion:summary.mappingCatalogVersion, projectName:summary.projectName, targetUrl:summary.requestedUrl, generatedAt:summary.generatedAt, frameworks:summary.frameworks, jurisdiction:summary.jurisdiction, counts:summary.counts, evidenceArtifactCount:summary.evidenceManifest?.artifactCount || 0, workflowRevision:summary.workflow?.revision || 1, workflowUpdatedAt:summary.workflow?.updatedAt || summary.generatedAt, pdfGeneration:summary.pdfGeneration };
    const overview = { reportType:'security-compliance', assessmentType:summary.assessmentType, evidenceLevel:summary.evidenceLevel, complianceConclusion:summary.complianceConclusion, coverage:'partial', collectionCoverage:summary.collectionCoverage||{}, toolVersion:summary.toolVersion||summary.scannerVersion, scannerVersion:summary.scannerVersion, mappingCatalogVersion:summary.mappingCatalogVersion, projectName:summary.projectName, baseUrl:summary.finalUrl, overallStatus:summary.overallStatus, counts:summary.counts, checksWithoutAdverseObservation:summary.totals.pass, attentionFindings:summary.totals.fail + summary.totals.warning, frameworks:summary.frameworkResults.map(f=>f.label), exports:{ html:true, json:true, findingsCsv:true, xlsx:true, pdf:summary.pdfGeneration.status === 'generated' }, pdfGeneration:summary.pdfGeneration };
    fs.writeFileSync(path.join(root,'metadata.json'),JSON.stringify(metadata,null,2));
    fs.writeFileSync(path.join(root,'summary.json'),JSON.stringify({ ...summary, overview },null,2));
    fs.writeFileSync(path.join(root,'workflow.json'),`${JSON.stringify(summary.workflow || {},null,2)}\n`);
    writeCsv(root,summary);
    fs.writeFileSync(path.join(root,'summary.html'),buildComplianceHtml(summary),'utf8');
    await writeXlsx(root,summary);
    const files = ['metadata.json','summary.json','findings.csv','summary.csv','summary.html','summary.xlsx','workflow.json'];
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
    summary = applyWorkflow({ ...summary, pdfDownloadName: `${slugify(summary.projectName)}_compliance-pre-assessment_${timestamp()}.pdf` }, reportWorkflow({ summary, reportName: runName, lifecycleManager: this.lifecycleManager, revision: 1 }));
    const written = await this.writeReportFiles(root, summary);
    summary = written.summary;
    const pdfHref = summary.pdfGeneration.status === 'generated' ? `/reports/${encodeURIComponent(runName)}/summary.pdf` : '';
    return { ...summary, reportManifest:written.reportManifest, integrityPresentation: describeIntegrityMetadata({ evidenceManifest, reportManifest: written.reportManifest }), reportName:runName, summaryHref:`/reports/${encodeURIComponent(runName)}/summary.html`, jsonHref:`/reports/${encodeURIComponent(runName)}/summary.json`, csvHref:`/reports/${encodeURIComponent(runName)}/findings.csv`, legacyCsvHref:`/reports/${encodeURIComponent(runName)}/summary.csv`, xlsxHref:`/reports/${encodeURIComponent(runName)}/summary.xlsx`, pdfHref, evidenceManifestHref:`/reports/${encodeURIComponent(runName)}/evidence/manifest.json` };
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
      const workflowIsCurrent = summary.workflow?.schemaVersion === '2.0.0';
      if (summary.overview?.reportType !== 'security-compliance' || (projectName && summary.projectName !== projectName) || (legacyOnly && workflowIsCurrent)) continue;
      const workflow = reportWorkflow({ summary, reportName: entry.name, lifecycleManager: this.lifecycleManager, revision: (summary.workflow?.revision || 0) + 1 });
      summary = applyWorkflow(summary, workflow);
      this.makeReportWritable(root);
      await this.writeReportFiles(root, summary);
      updated.push(entry.name);
    }
    return updated;
  }
}
