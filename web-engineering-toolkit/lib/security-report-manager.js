import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureDir, slugify, timestamp, csvEscape } from './utils.js';
import { buildComplianceHtml } from './security-report-html.js';
import { generateCompliancePdf } from './security-pdf.js';

function humanize(value) { return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function statusLabel(status, item = {}) {
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

function reportMimeType(file) {
  return ({ '.html': 'text/html; charset=utf-8', '.json': 'application/json; charset=utf-8', '.csv': 'text/csv; charset=utf-8', '.xlsx': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', '.pdf': 'application/pdf' })[path.extname(file)] || 'application/octet-stream';
}

function stripBrowserSecrets(browserScan = {}) {
  const { screenshotBase64, ...safe } = browserScan;
  safe.resources = (safe.resources || []).map(({ requestHeaders, responseHeaders, ...resource }) => resource);
  safe.cookies = (safe.cookies || []).map(({ value, ...cookie }) => ({ ...cookie, value: '[REDACTED]' }));
  safe.authenticatedPages = (safe.authenticatedPages || []).map(({ headers, bodyText, screenshotBase64: pageScreenshot, ...page }) => page);
  safe.consentScenarios = (safe.consentScenarios || []).map(({ screenshotBase64: scenarioScreenshot, ...scenario }) => scenario);
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

function normalizeLegacySummary(summary) {
  return {
    ...summary,
    assessmentType: summary.assessmentType || 'compliance_pre_assessment',
    evidenceLevel: summary.evidenceLevel || 'public_url',
    complianceConclusion: summary.complianceConclusion || 'not_determined',
    coverage: summary.coverage || 'partial',
    mappingCatalogVersion: summary.mappingCatalogVersion || 'legacy-unversioned',
    scopeEvidence: Array.isArray(summary.scopeEvidence) ? summary.scopeEvidence : [],
    findings: Array.isArray(summary.findings) ? summary.findings : [],
    testResults: Array.isArray(summary.testResults) ? summary.testResults : [],
    controlEvaluations: Array.isArray(summary.controlEvaluations) ? summary.controlEvaluations.map((control) => ({ ...control, controlSatisfaction: control.controlSatisfaction || 'not_determined', coverage: control.coverage || 'partial', mappings: control.mappings || [] })) : [],
    checks: Array.isArray(summary.checks) ? summary.checks : [],
    vaultEvidence: Array.isArray(summary.vaultEvidence) ? summary.vaultEvidence : [],
    frameworkResults: (summary.frameworkResults || []).map((framework) => ({ ...framework, publicEvidence: framework.publicEvidence || [], technicalControls: framework.technicalControls || [], missingEvidence: framework.missingEvidence || [], controlEvaluations: framework.controlEvaluations || [], evidenceItems: framework.evidenceItems || [], evidenceStatements: framework.evidenceStatements || [], attentionFindings: framework.attentionFindings || [], controlSatisfaction: framework.controlSatisfaction || 'not_determined', coverage: framework.coverage || 'partial' })),
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
  const rows = [['Finding ID','Title','Severity','Confidence','Finding Status','Review Decision','Scope Decision','Mapping Decision','Decision Reason','Reviewed By','Reviewer Role','Review Date','Affected URL','Evidence Type','Evidence Strength','Source Method','Evidence','Impact','Recommendation','References','Controls','Mapping Relationships','Mapping Prerequisites','Mapping Applicability','Assessment Type','Evidence Level','Compliance Conclusion','Coverage','First Seen','Last Seen','Test Method','Tool Version','Scanner Version','Mapping Catalog Version','Limitations']];
  for (const item of summary.findings || []) {
    rows.push([item.id,item.title,item.severity,item.confidence,item.findingStatus||item.status,item.decision?.reviewDecision||'',item.decision?.scopeDecision||'',item.decision?.mappingDecision||'',item.decision?.reason||'',item.decision?.reviewer||item.decision?.actor||'',item.decision?.role||'',item.decision?.updatedAt||'',item.affectedUrl||'',item.evidence?.evidenceType||item.evidence?.type||'',item.evidence?.evidenceStrength||'',item.evidence?.sourceMethod||'',item.evidence?.raw||'',item.impact,item.recommendation,(item.references||[]).join(' | '),(item.controls||[]).join(' | '),(item.controlMappings||[]).map((mapping)=>`${mapping.controlId}: ${mapping.relationship}`).join(' | '),(item.controlMappings||[]).flatMap((mapping)=>mapping.prerequisiteResults||[]).map((entry)=>`${entry.prerequisite}: ${entry.state}`).join(' | '),Object.entries(item.mappingApplicability||{}).map(([framework,state])=>`${framework}: ${state}`).join(' | '),summary.assessmentType,summary.evidenceLevel,summary.complianceConclusion,'partial',item.firstSeen,item.lastSeen,item.testMethod,item.toolVersion,summary.scannerVersion,summary.mappingCatalogVersion,(item.limitations||[]).join(' | ')]);
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
  summary.frameworkResults.forEach((fw,i)=>{const r=14+i;overview.getCell(r,4).value=fw.label;overview.getCell(r,4).font={bold:true,color:{argb:text}};overview.getCell(r,5).value=fw.applicabilityLabel||humanize(fw.applicability);overview.getCell(r,6).value=`${(fw.publicEvidence||[]).length + (fw.technicalControls||[]).length} observed`;overview.getCell(r,7).value=`${(fw.missingEvidence||[]).length} missing/manual`;});

  const findings = workbook.addWorksheet('Findings', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  findings.columns=[{header:'Finding ID',width:38},{header:'Title',width:38},{header:'Severity',width:14},{header:'Confidence',width:16},{header:'Finding Status',width:18},{header:'Review Decision',width:28},{header:'Scope Decision',width:22},{header:'Mapping Decision',width:22},{header:'Decision Reason',width:48},{header:'Reviewed By',width:24},{header:'Reviewer Role',width:24},{header:'Review Date',width:24},{header:'Affected URL',width:50},{header:'Evidence Type',width:24},{header:'Evidence',width:72},{header:'Impact',width:58},{header:'Recommendation',width:62},{header:'Controls',width:52},{header:'Mapping Applicability',width:44},{header:'Test Method',width:36},{header:'First Seen',width:24},{header:'Last Seen',width:24},{header:'Tool Version',width:16},{header:'Limitations',width:60}];
  findings.getRow(1).height=34;findings.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.findings || []){const row=findings.addRow([item.id,item.title,item.severity,item.confidence,item.findingStatus||item.status,item.decision?.reviewDecision||'',item.decision?.scopeDecision||'',item.decision?.mappingDecision||'',item.decision?.reason||'',item.decision?.reviewer||item.decision?.actor||'',item.decision?.role||'',item.decision?.updatedAt||'',item.affectedUrl,item.evidence?.type||'',item.evidence?.raw||'',item.impact,item.recommendation,(item.controls||[]).join('\n'),Object.entries(item.mappingApplicability||{}).map(([framework,state])=>`${framework}: ${state}`).join('\n'),item.testMethod,item.firstSeen,item.lastSeen,item.toolVersion,(item.limitations||[]).join('\n')]);row.height=58;row.alignment={vertical:'top',wrapText:true};row.getCell(3).fill={type:'pattern',pattern:'solid',fgColor:{argb:statusFill(['critical','high'].includes(item.severity)?'fail':item.severity==='medium'?'warning':'info')}};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  findings.autoFilter={from:'A1',to:'X1'};

  const coverage = workbook.addWorksheet('Test Coverage', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  coverage.columns=[{header:'Test ID',width:30},{header:'Title',width:38},{header:'Category',width:28},{header:'Outcome',width:18},{header:'Collection State',width:20},{header:'Confidence',width:16},{header:'Affected URL',width:50},{header:'Test Method',width:38},{header:'Summary',width:60},{header:'Limitations',width:62}];
  coverage.getRow(1).height=34;coverage.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.testResults || []){const row=coverage.addRow([item.id,item.title,item.category,statusLabel(item.outcome,item),item.stateLabel||humanize(item.state),item.confidence,item.affectedUrl,item.testMethod,item.summary,(item.limitations||[]).join('\n')]);row.height=46;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  coverage.autoFilter={from:'A1',to:'J1'};

  const checks = workbook.addWorksheet('Security Checks', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  checks.columns=[{header:'Category',width:24},{header:'Check',width:34},{header:'Status',width:18},{header:'Severity',width:16},{header:'Affected URL',width:54},{header:'Summary',width:58},{header:'Details / Evidence',width:70},{header:'Recommendation',width:65},{header:'References',width:65},{header:'Frameworks',width:42}];
  checks.getRow(1).height=34;checks.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.checks){const evidenceItems=(item.evidenceItems||[]).map(e=>`${e.sourceUrl}: ${e.evidenceText}`).join(' | ');const row=checks.addRow([item.category,item.title,statusLabel(item.status,item),item.severity||'',item.affectedUrl||'',item.summary,[item.details,item.evidence,evidenceItems].filter(Boolean).join(' · '),item.recommendation,(item.references||[]).join('\n'),(item.frameworks||[]).join(', ')]);row.height=50;row.alignment={vertical:'top',wrapText:true};row.getCell(3).fill={type:'pattern',pattern:'solid',fgColor:{argb:statusFill(item.status)}};row.getCell(3).font={bold:true,color:{argb:statusColor(item.status)}};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  checks.autoFilter={from:'A1',to:'J1'};

  const mapping = workbook.addWorksheet('Compliance Mapping', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  mapping.columns=[{header:'Framework',width:24},{header:'Applicability',width:18},{header:'Scope Basis',width:26},{header:'Scope Confidence',width:22},{header:'Control Satisfaction',width:24},{header:'Public Evidence',width:58},{header:'Technical Evidence Statements',width:68},{header:'Missing / Manual Evidence',width:58},{header:'Jurisdiction',width:24},{header:'Scope Note',width:72}];
  mapping.getRow(1).height=34;mapping.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const fw of summary.frameworkResults){const row=mapping.addRow([fw.label,fw.applicabilityLabel||humanize(fw.applicability),humanize(fw.scopeBasis),humanize(fw.scopeConfidence),humanize(fw.controlSatisfaction||'not_determined'),(fw.evidenceStatements||[]).map(item=>`${item.statement} [${(item.evidenceRefs||[]).join(', ')}]`).join('\n'),(fw.technicalEvidenceStatements||[]).map(item=>`${item.statement} [${(item.evidenceRefs||[]).join(', ')}]`).join('\n'),(fw.missingEvidence||[]).join('\n'),fw.jurisdiction||'',fw.note]);row.height=64;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}

  const controls = workbook.addWorksheet('Control Evidence', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  controls.columns=[{header:'Control ID',width:34},{header:'Evidence State',width:34},{header:'Control Satisfaction',width:24},{header:'Evidence Level',width:24},{header:'Coverage',width:16},{header:'Automated Evidence',width:76},{header:'Mapping Relationships',width:42},{header:'Prerequisites',width:58},{header:'Linked Findings',width:48},{header:'Manual Review Required',width:24},{header:'Limitations',width:72}];
  controls.getRow(1).height=34;controls.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.controlEvaluations || []){const row=controls.addRow([item.controlId,humanize(item.state),humanize(item.controlSatisfaction),humanize(item.evidenceLevel),humanize(item.coverage),(item.automatedEvidence||[]).map(e=>`${e.checkId}: ${e.outcome} (${e.testState}; ${humanize(e.evidenceState||e.strength)})`).join('\n'),(item.mappings||[]).map(mapping=>`${mapping.mappingId}: ${mapping.relationship}`).join('\n'),(item.mappings||[]).flatMap(mapping=>mapping.prerequisiteResults||[]).map(entry=>`${entry.prerequisite}: ${entry.state}`).join('\n'),(item.linkedFindings||[]).join('\n'),item.manualReviewRequired?'Yes':'No',(item.limitations||[]).join('\n')]);row.height=58;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  controls.autoFilter={from:'A1',to:'K1'};

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
    const metadata = { reportType:'security-compliance', assessmentType:summary.assessmentType, evidenceLevel:summary.evidenceLevel, complianceConclusion:summary.complianceConclusion, coverage:'partial', schemaVersion:summary.schemaVersion, toolVersion:summary.toolVersion||summary.scannerVersion, scannerVersion:summary.scannerVersion, mappingCatalogVersion:summary.mappingCatalogVersion, projectName:summary.projectName, targetUrl:summary.requestedUrl, generatedAt:summary.generatedAt, frameworks:summary.frameworks, jurisdiction:summary.jurisdiction, counts:summary.counts, evidenceArtifactCount:summary.evidenceManifest?.artifactCount || 0, workflowRevision:summary.workflow?.revision || 1, workflowUpdatedAt:summary.workflow?.updatedAt || summary.generatedAt, pdfGeneration:summary.pdfGeneration };
    const overview = { reportType:'security-compliance', assessmentType:summary.assessmentType, evidenceLevel:summary.evidenceLevel, complianceConclusion:summary.complianceConclusion, coverage:'partial', toolVersion:summary.toolVersion||summary.scannerVersion, scannerVersion:summary.scannerVersion, mappingCatalogVersion:summary.mappingCatalogVersion, projectName:summary.projectName, baseUrl:summary.finalUrl, overallStatus:summary.overallStatus, counts:summary.counts, checksWithoutAdverseObservation:summary.totals.pass, attentionFindings:summary.totals.fail + summary.totals.warning, frameworks:summary.frameworkResults.map(f=>f.label), exports:{ html:true, json:true, findingsCsv:true, xlsx:true, pdf:summary.pdfGeneration.status === 'generated' }, pdfGeneration:summary.pdfGeneration };
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
    summary = { ...publicSummary(summary), evidenceManifest: { schemaVersion: evidenceManifest.schemaVersion, artifactCount: evidenceManifest.artifactCount, access: evidenceManifest.access, artifacts: evidenceManifest.artifacts, signature: evidenceManifest.signature }, vaultEvidence };
    summary = applyWorkflow({ ...summary, pdfDownloadName: `${slugify(summary.projectName)}_compliance-pre-assessment_${timestamp()}.pdf` }, reportWorkflow({ summary, reportName: runName, lifecycleManager: this.lifecycleManager, revision: 1 }));
    const written = await this.writeReportFiles(root, summary);
    summary = written.summary;
    const pdfHref = summary.pdfGeneration.status === 'generated' ? `/reports/${encodeURIComponent(runName)}/summary.pdf` : '';
    return { ...summary, reportManifest:written.reportManifest, reportName:runName, summaryHref:`/reports/${encodeURIComponent(runName)}/summary.html`, jsonHref:`/reports/${encodeURIComponent(runName)}/summary.json`, csvHref:`/reports/${encodeURIComponent(runName)}/findings.csv`, legacyCsvHref:`/reports/${encodeURIComponent(runName)}/summary.csv`, xlsxHref:`/reports/${encodeURIComponent(runName)}/summary.xlsx`, pdfHref, evidenceManifestHref:`/reports/${encodeURIComponent(runName)}/evidence/manifest.json` };
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
