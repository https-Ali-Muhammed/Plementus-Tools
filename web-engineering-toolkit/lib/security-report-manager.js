import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureDir, slugify, timestamp, csvEscape } from './utils.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
function humanize(value) { return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function statusLabel(status) {
  return ({ pass: 'Passed', warning: 'Review', fail: 'Needs attention', manual: 'Manual review', info: 'Informational' })[status] || humanize(status);
}
function statusRank(status) { return ({ fail: 5, warning: 4, manual: 3, info: 2, pass: 1 })[status] || 0; }
function statusColor(status) { return ({ pass: 'FF177B57', warning: 'FF9B5F09', fail: 'FFB4233A', manual: 'FF5A4EB4', info: 'FF416889' })[status] || 'FF416889'; }
function statusFill(status) { return ({ pass: 'FFE5F7EF', warning: 'FFFFF1DD', fail: 'FFFDE8EB', manual: 'FFEDEAFE', info: 'FFE9F3FB' })[status] || 'FFF4F6F9'; }

function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

function stripBrowserSecrets(browserScan = {}) {
  const { screenshotBase64, ...safe } = browserScan;
  safe.resources = (safe.resources || []).map(({ requestHeaders, responseHeaders, ...resource }) => resource);
  safe.cookies = (safe.cookies || []).map(({ value, ...cookie }) => ({ ...cookie, value: '[REDACTED]' }));
  safe.authenticatedPages = (safe.authenticatedPages || []).map(({ headers, bodyText, screenshotBase64: pageScreenshot, ...page }) => page);
  return safe;
}

function publicSummary(summary) {
  const { evidenceArchive, ...safe } = summary;
  return { ...safe, browserScan: stripBrowserSecrets(summary.browserScan || {}) };
}

function reportWorkflow({ summary, reportName, evidenceVault, lifecycleManager, revision = 1 }) {
  const fingerprints = new Set((summary.findings || []).map((finding) => finding.fingerprint).filter(Boolean));
  const evidenceReviews = evidenceVault
    ? evidenceVault.list({ projectName: summary.projectName }).filter((item) => item.reportName === reportName).map((item) => ({
      id: item.id,
      artifactId: item.metadata?.artifactId || item.type,
      sourceReference: item.sourceReference,
      approvalStatus: item.approvalStatus,
      reviewer: item.reviewer || '',
      reviewerRole: item.reviewerRole || '',
      reviewNote: item.reviewNote || '',
      reviewedAt: item.reviewedAt || '',
      expiryDate: item.expiryDate || '',
      version: item.version || 1
    }))
    : [];
  const findingDecisions = lifecycleManager
    ? lifecycleManager.list(summary.projectName).filter((item) => fingerprints.has(item.fingerprint)).map((item) => ({
      fingerprint: item.fingerprint,
      findingId: item.findingId,
      status: item.status,
      reason: item.reason || '',
      expiresAt: item.expiresAt || '',
      actor: item.actor || '',
      role: item.role || '',
      updatedAt: item.updatedAt || ''
    }))
    : (summary.findings || []).map((finding) => ({ fingerprint: finding.fingerprint, findingId: finding.id, status: finding.status || 'open', reason: '', expiresAt: '', actor: '', role: '', updatedAt: '' }));
  const evidenceIds = new Set(evidenceReviews.map((item) => item.id));
  const auditEvents = evidenceVault
    ? evidenceVault.auditLog({ projectName: summary.projectName, limit: 1000 }).filter((event) => event.reportName === reportName || evidenceIds.has(event.evidenceId) || fingerprints.has(event.fingerprint)).reverse()
    : [];
  return { schemaVersion: '1.0.0', revision, reportName, projectName: summary.projectName, updatedAt: new Date().toISOString(), evidenceReviews, findingDecisions, auditEvents };
}

function applyWorkflow(summary, workflow) {
  const decisions = new Map((workflow.findingDecisions || []).map((item) => [item.fingerprint, item]));
  const evidence = new Map((workflow.evidenceReviews || []).map((item) => [item.id, item]));
  return {
    ...summary,
    workflow,
    findings: (summary.findings || []).map((finding) => {
      const decision = decisions.get(finding.fingerprint);
      return decision ? { ...finding, status: decision.status, decision } : finding;
    }),
    vaultEvidence: (summary.vaultEvidence || []).map((item) => {
      const review = evidence.get(item.id);
      return review ? { ...item, approvalStatus: review.approvalStatus, reviewer: review.reviewer, reviewerRole: review.reviewerRole, reviewNote: review.reviewNote, reviewedAt: review.reviewedAt, expiryDate: review.expiryDate, version: review.version } : item;
    })
  };
}

function normalizeLegacySummary(summary) {
  return {
    ...summary,
    findings: Array.isArray(summary.findings) ? summary.findings : [],
    testResults: Array.isArray(summary.testResults) ? summary.testResults : [],
    controlEvaluations: Array.isArray(summary.controlEvaluations) ? summary.controlEvaluations : [],
    checks: Array.isArray(summary.checks) ? summary.checks : [],
    vaultEvidence: Array.isArray(summary.vaultEvidence) ? summary.vaultEvidence : [],
    frameworkResults: (summary.frameworkResults || []).map((framework) => ({ ...framework, publicEvidence: framework.publicEvidence || [], technicalControls: framework.technicalControls || [], missingEvidence: framework.missingEvidence || [], controlEvaluations: framework.controlEvaluations || [] })),
    totals: { pass: 0, warning: 0, fail: 0, manual: 0, info: 0, ...(summary.totals || {}) }
  };
}

function writeEvidenceArchive(root, archive = {}) {
  const evidenceRoot = ensureDir(path.join(root, 'evidence'));
  const artifacts = [];
  const writeArtifact = (id, relativePath, value, { type = 'application/json', sensitive = false, binary = false } = {}) => {
    if (value == null || value === '') return;
    const file = path.join(evidenceRoot, relativePath);
    ensureDir(path.dirname(file));
    const buffer = binary ? Buffer.from(value, 'base64') : Buffer.from(`${JSON.stringify(value, null, 2)}\n`, 'utf8');
    fs.writeFileSync(file, buffer);
    artifacts.push({ id, type, path: `evidence/${relativePath}`, sha256: sha256(buffer), bytes: buffer.length, sensitive });
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
    schemaVersion: '1.0.0',
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

function writeReportProjections(root, summary) {
  const projections = {
    'executive-report.json': {
      reportType: 'executive', projectName: summary.projectName, generatedAt: summary.generatedAt, workflowRevision: summary.workflow?.revision || 1, overallStatus: summary.overallStatus, openFindingCount: summary.findings.filter((finding) => finding.status === 'open').length, severity: Object.fromEntries(['critical','high','medium','low','informational'].map((severity) => [severity, summary.findings.filter((finding) => finding.severity === severity).length])), comparison: summary.comparison || {}, frameworkCoverage: summary.frameworkResults.map((framework) => ({ id: framework.id, label: framework.label, applicable: framework.applicable, observedEvidence: (framework.publicEvidence || []).length + (framework.technicalControls || []).length, missingOrManualEvidence: (framework.missingEvidence || []).length, note: framework.note })), disclaimer: summary.disclaimer
    },
    'developer-report.json': { reportType: 'developer', projectName: summary.projectName, generatedAt: summary.generatedAt, findings: summary.findings, testCoverage: summary.testResults, disclaimer: summary.disclaimer },
    'auditor-evidence-report.json': { reportType: 'auditor-evidence', projectName: summary.projectName, generatedAt: summary.generatedAt, workflow: summary.workflow || {}, controlEvaluations: summary.controlEvaluations, frameworkResults: summary.frameworkResults, evidenceManifest: summary.evidenceManifest, evidenceObjects: summary.vaultEvidence || [], limitations: summary.testResults.filter((test) => test.limitations.length).map((test) => ({ testId: test.id, state: test.state, limitations: test.limitations })), disclaimer: summary.disclaimer },
    'legal-privacy-report.json': { reportType: 'legal-privacy', projectName: summary.projectName, generatedAt: summary.generatedAt, jurisdiction: summary.jurisdiction, frameworkResults: summary.frameworkResults.filter((framework) => ['gdpr','local','hipaa'].includes(framework.id)), findings: summary.findings.filter((finding) => /privacy|cookie|consent|tracking/i.test(`${finding.category} ${finding.title}`)), disclaimer: summary.disclaimer },
    'technical-appendix.json': { reportType: 'technical-appendix', projectName: summary.projectName, generatedAt: summary.generatedAt, scannerVersion: summary.scannerVersion, requestedUrl: summary.requestedUrl, finalUrl: summary.finalUrl, redirectChain: summary.redirectChain, tlsAnalysis: summary.tlsAnalysis, browserScan: summary.browserScan, crawl: summary.crawl, testResults: summary.testResults, evidenceManifest: summary.evidenceManifest }
  };
  for (const [file, value] of Object.entries(projections)) fs.writeFileSync(path.join(root, file), `${JSON.stringify(value, null, 2)}\n`);
  return Object.keys(projections);
}

function writeSignedReportManifest(root, summary, files, previousManifestSha256 = '') {
  const entries = files.map((file) => {
    const buffer = fs.readFileSync(path.join(root, file));
    return { file, bytes: buffer.length, sha256: sha256(buffer) };
  });
  const signingKey = process.env.SECURITY_REPORT_SIGNING_KEY || '';
  const signedPayload = { schemaVersion: '1.1.0', reportType: summary.reportType, projectName: summary.projectName, generatedAt: summary.generatedAt, workflowRevision: summary.workflow?.revision || 1, workflowUpdatedAt: summary.workflow?.updatedAt || summary.generatedAt, previousManifestSha256, immutableEvidenceSnapshot: true, revisionedWorkflow: true, files: entries };
  const manifest = { ...signedPayload, signature: signingKey ? { algorithm: 'hmac-sha256', value: crypto.createHmac('sha256', signingKey).update(JSON.stringify(signedPayload)).digest('hex') } : { algorithm: 'none', value: '', reason: 'SECURITY_REPORT_SIGNING_KEY is not configured.' } };
  fs.writeFileSync(path.join(root, 'report-manifest.json'), `${JSON.stringify(manifest, null, 2)}\n`);
  for (const file of [...files, 'report-manifest.json']) { try { fs.chmodSync(path.join(root, file), 0o444); } catch {} }
  return manifest;
}

function buildHtml(summary) {
  const grouped = new Map();
  const findings = summary.findings || [];
  for (const finding of findings) {
    if (!grouped.has(finding.category)) grouped.set(finding.category, []);
    grouped.get(finding.category).push(finding);
  }
  const frameworkCards = (summary.frameworkResults || []).map((framework) => `
    <div class="framework-card">
      <div><span>${escapeHtml(framework.label)}</span><strong>${framework.applicable === false ? 'Not indicated' : 'Evidence'}</strong></div>
      <p>${escapeHtml(framework.note || '')}</p>
      <ul>
        ${(framework.publicEvidence || []).slice(0, 5).map((item) => `<li>✓ ${escapeHtml(item)}</li>`).join('')}
        ${(framework.technicalControls || []).slice(0, 5).map((item) => `<li>✓ ${escapeHtml(item)}</li>`).join('')}
        ${(framework.missingEvidence || []).slice(0, 5).map((item) => `<li>⚠ ${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>`).join('');
  const groups = [...grouped.entries()].map(([category, categoryFindings]) => `
    <details class="group">
      <summary><div><strong>${escapeHtml(category)}</strong><span>${categoryFindings.length} finding${categoryFindings.length === 1 ? '' : 's'}</span></div><span class="chev">⌄</span></summary>
      <div class="items">${categoryFindings.map((finding) => {
        const severityClass = ['critical', 'high'].includes(finding.severity) ? 'fail' : finding.severity === 'medium' ? 'warning' : 'info';
        return `
        <article class="check">
          <span class="status ${severityClass}">${escapeHtml(finding.severity || 'informational')}</span>
          <div><h3>${escapeHtml(finding.title)}</h3><p>${escapeHtml(finding.impact || '')}</p><small>${escapeHtml(finding.id)} · Confidence: ${escapeHtml(finding.confidence)} · Lifecycle: ${escapeHtml(humanize(finding.status || 'open'))}${finding.affectedUrl ? ` · Affected URL: ${escapeHtml(finding.affectedUrl)}` : ''}</small><small><b>Test method:</b> ${escapeHtml(finding.testMethod || '')}</small>${finding.evidence?.raw ? `<small><b>Evidence (${escapeHtml(finding.evidence.type)}):</b> ${escapeHtml(finding.evidence.raw)}</small>` : ''}${(finding.controls || []).length ? `<small><b>Linked controls:</b> ${escapeHtml(finding.controls.join(', '))}</small>` : ''}${(finding.limitations || []).length ? `<small><b>Limitations:</b> ${escapeHtml(finding.limitations.join(' · '))}</small>` : ''}${finding.decision && (finding.decision.reason || finding.decision.updatedAt) ? `<div class="decision"><b>Finding decision</b><span>Status: ${escapeHtml(humanize(finding.decision.status))}</span>${finding.decision.reason ? `<span>Reason: ${escapeHtml(finding.decision.reason)}</span>` : ''}${finding.decision.expiresAt ? `<span>Expires: ${escapeHtml(new Date(finding.decision.expiresAt).toLocaleDateString())}</span>` : ''}${finding.decision.actor ? `<span>Decided by: ${escapeHtml(finding.decision.actor)}${finding.decision.role ? ` (${escapeHtml(humanize(finding.decision.role))})` : ''}</span>` : ''}${finding.decision.updatedAt ? `<span>Decision date: ${escapeHtml(new Date(finding.decision.updatedAt).toLocaleString())}</span>` : ''}</div>` : ''}${finding.recommendation ? `<div class="recommend"><b>Recommendation</b>${escapeHtml(finding.recommendation)}</div>` : ''}${(finding.references || []).length ? `<div class="recommend"><b>References</b>${(finding.references || []).map((ref) => `<a href="${escapeHtml(ref)}" target="_blank" rel="noopener">${escapeHtml(ref)}</a>`).join('<br>')}</div>` : ''}</div>
        </article>`;
      }).join('')}</div>
    </details>`).join('') || '<div class="notice"><strong>No open findings:</strong> No adverse conditions met the scanner thresholds. This conclusion is limited to completed tests and the configured scope.</div>';
  const testStateCounts = (summary.testResults || []).reduce((counts, test) => { counts[test.state] = (counts[test.state] || 0) + 1; return counts; }, {});
  const coverageSection = (summary.testResults || []).length ? `<h2 class="section-title">Test coverage</h2><div class="stats"><div class="stat"><span>Confirmed</span><strong>${testStateCounts.confirmed || 0}</strong></div><div class="stat"><span>Observed / partial</span><strong>${testStateCounts.observed || 0}</strong></div><div class="stat"><span>Not tested</span><strong>${testStateCounts.not_tested || 0}</strong></div><div class="stat"><span>Failed to test</span><strong>${testStateCounts.failed_to_test || 0}</strong></div></div>` : '';
  const crawlPages = (summary.crawl && Array.isArray(summary.crawl.pages)) ? summary.crawl.pages : [];
  const crawlSection = crawlPages.length ? `
    <h2 class="section-title">Crawled evidence pages</h2>
    <p class="lead" style="margin-top:-4px">${crawlPages.filter(p=>p.found).length} of ${crawlPages.length} candidate page(s) found while crawling for privacy/security/compliance evidence.</p>
    <div class="items" style="border:1px solid var(--border);border-radius:16px;background:var(--panel);padding:14px;display:grid;gap:8px">
      ${crawlPages.map((p) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;color:${p.found ? '#c9d2e5' : '#6c7690'}"><span>${escapeHtml(p.url)}${p.error ? `<br><small>${escapeHtml(p.error)}</small>` : ''}</span><span>${p.found ? `${p.status} · ${escapeHtml((p.groups||[]).join(', '))}` : 'not found'}</span></div>`).join('')}
    </div>` : '';
  const reviewedEvidence = summary.workflow?.evidenceReviews || [];
  const workflowSection = reviewedEvidence.length ? `
    <h2 class="section-title">Evidence review workflow</h2>
    <p class="lead" style="margin-top:-4px">Workflow revision ${summary.workflow.revision || 1} · Updated ${escapeHtml(new Date(summary.workflow.updatedAt).toLocaleString())}</p>
    <div class="workflow-grid">${reviewedEvidence.map((item) => `<article class="workflow-item"><div><strong>${escapeHtml(item.artifactId)}</strong><span class="status ${item.approvalStatus === 'approved' ? 'pass' : ['rejected','expired'].includes(item.approvalStatus) ? 'fail' : 'manual'}">${escapeHtml(humanize(item.approvalStatus))}</span></div><small>${escapeHtml(item.sourceReference || '')}</small><dl><dt>Reviewer</dt><dd>${escapeHtml(item.reviewer || 'Not assigned')}</dd><dt>Role</dt><dd>${escapeHtml(item.reviewerRole ? humanize(item.reviewerRole) : 'Not assigned')}</dd><dt>Review date</dt><dd>${escapeHtml(item.reviewedAt ? new Date(item.reviewedAt).toLocaleString() : 'Not reviewed')}</dd><dt>Note</dt><dd>${escapeHtml(item.reviewNote || 'No note')}</dd>${item.expiryDate ? `<dt>Expiry</dt><dd>${escapeHtml(new Date(item.expiryDate).toLocaleDateString())}</dd>` : ''}</dl></article>`).join('')}</div>` : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(summary.projectName)} Security & Compliance Report</title>
  <style>:root{--bg:#0b1020;--panel:#11192d;--border:rgba(255,255,255,.1);--text:#f7f9ff;--muted:#95a0ba;--pass:#4fd1a1;--warn:#ffbf69;--fail:#ff6b7a;--accent:#7c6cff}*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#0b1020,#080c16);color:var(--text);font-family:Inter,system-ui,sans-serif}.wrap{max-width:1180px;margin:auto;padding:42px 22px 70px}.eyebrow{font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#9b92ff;font-weight:800}h1{font-size:38px;margin:10px 0 8px}.lead{color:var(--muted);line-height:1.6}.notice{margin:20px 0;padding:15px 17px;border:1px solid rgba(255,191,105,.2);background:rgba(255,191,105,.07);border-radius:8px;color:#e0c49c;font-size:13px;line-height:1.55}.stats,.frameworks,.workflow-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:12px;margin:22px 0}.stat,.framework-card,.workflow-item{padding:16px;border-radius:8px;background:var(--panel);border:1px solid var(--border)}.stat span,.framework-card span{display:block;color:var(--muted);font-size:11px}.stat strong,.framework-card strong{display:block;font-size:20px;margin-top:6px}.framework-card>div,.workflow-item>div{display:flex;justify-content:space-between;gap:12px;align-items:center}.framework-card p{margin:9px 0 0;color:var(--muted);font-size:11px;line-height:1.5}.framework-card ul{margin:12px 0 0;padding-left:17px;color:#c9d2e5;font-size:11px;line-height:1.6}.workflow-item>small{display:block;color:var(--muted);overflow-wrap:anywhere;margin-top:8px}.workflow-item dl{display:grid;grid-template-columns:90px 1fr;gap:7px 10px;margin:14px 0 0;font-size:11px}.workflow-item dt{color:var(--muted)}.workflow-item dd{margin:0;color:#dce3f2;overflow-wrap:anywhere}.group{border:1px solid var(--border);background:var(--panel);border-radius:8px;margin:12px 0;overflow:hidden}.group summary{list-style:none;cursor:pointer;padding:17px 19px;display:flex;justify-content:space-between;align-items:center}.group summary::-webkit-details-marker{display:none}.group summary div{display:flex;align-items:center;gap:10px}.group summary span{color:var(--muted);font-size:11px}.chev{font-size:18px!important;transition:.2s}.group[open] .chev{transform:rotate(180deg)}.items{border-top:1px solid var(--border);padding:14px;display:grid;gap:10px}.check{display:grid;grid-template-columns:120px minmax(0,1fr);gap:14px;padding:14px;background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:8px}.status{display:inline-flex;justify-content:center;align-items:center;height:28px;border-radius:999px;font-size:10px;font-weight:800;padding:0 10px;text-transform:capitalize}.status.pass{color:#91efcc;background:rgba(79,209,161,.12)}.status.warning{color:#ffd39a;background:rgba(255,191,105,.12)}.status.fail{color:#ffabb3;background:rgba(255,107,122,.12)}.status.manual{color:#c1baff;background:rgba(124,108,255,.14)}.status.info{color:#9dccff;background:rgba(79,156,255,.13)}.check h3{font-size:14px;margin:4px 0}.check p,.check small{display:block;color:var(--muted);font-size:12px;line-height:1.55;margin:0 0 5px}.recommend,.decision{margin-top:10px;color:#c9d2e5;font-size:12px;line-height:1.55}.recommend b,.decision b{display:block;color:#fff;margin-bottom:3px}.decision{padding:10px 12px;border-left:3px solid var(--accent);background:rgba(124,108,255,.08)}.decision span{display:block}.recommend a{color:#bfb8ff}.section-title{margin:32px 0 8px;font-size:19px}@media(max-width:650px){.check{grid-template-columns:1fr}.status{justify-self:start}.workflow-grid{grid-template-columns:1fr}h1{font-size:30px}}</style></head><body><main class="wrap"><div class="eyebrow">Security Assessment Report</div><h1>${escapeHtml(summary.projectName)}</h1><p class="lead">${escapeHtml(summary.finalUrl)} · Generated ${escapeHtml(new Date(summary.generatedAt).toLocaleString())} · Scanner ${escapeHtml(summary.scannerVersion || '')}</p><div class="notice"><strong>Scope note:</strong> ${escapeHtml(summary.disclaimer)}</div><div class="notice"><strong>Evidence archive:</strong> ${summary.evidenceManifest?.artifactCount || 0} hashed artifact(s) collected. Sensitive raw evidence is restricted to local filesystem access.</div><div class="stats"><div class="stat"><span>Open findings</span><strong>${findings.filter((finding) => finding.status === 'open').length}</strong></div><div class="stat"><span>High severity</span><strong>${findings.filter(f=>['critical','high'].includes(f.severity)).length}</strong></div><div class="stat"><span>Medium severity</span><strong>${findings.filter(f=>f.severity==='medium').length}</strong></div><div class="stat"><span>Manual-review checks</span><strong>${summary.totals.manual}</strong></div></div>${coverageSection}<h2 class="section-title">Compliance evidence</h2><div class="frameworks">${frameworkCards}</div>${workflowSection}<h2 class="section-title">Technical findings</h2>${groups}${crawlSection}</main></body></html>`;
}

function writeCsv(root, summary) {
  const rows = [['Finding ID','Title','Severity','Confidence','Lifecycle Status','Decision Reason','Decision Expiry','Decision By','Decision Role','Decision Date','Affected URL','Evidence Type','Evidence','Impact','Recommendation','References','Controls','First Seen','Last Seen','Test Method','Tool Version','Limitations']];
  for (const item of summary.findings || []) {
    rows.push([item.id,item.title,item.severity,item.confidence,item.status,item.decision?.reason||'',item.decision?.expiresAt||'',item.decision?.actor||'',item.decision?.role||'',item.decision?.updatedAt||'',item.affectedUrl||'',item.evidence?.type||'',item.evidence?.raw||'',item.impact,item.recommendation,(item.references||[]).join(' | '),(item.controls||[]).join(' | '),item.firstSeen,item.lastSeen,item.testMethod,item.toolVersion,(item.limitations||[]).join(' | ')]);
  }
  fs.writeFileSync(path.join(root,'summary.csv'),`\uFEFF${rows.map(row=>row.map(csvEscape).join(',')).join('\n')}\n`,'utf8');
}

async function writeXlsx(root, summary) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Developer Toolkit';
  const navy = 'FF11192D', border = 'FFE0E5EE', text = 'FF1F2A3D', muted = 'FF667085';
  const overview = workbook.addWorksheet('Summary', { views: [{ showGridLines: false }] });
  overview.columns = [{ width: 26 }, { width: 52 }, { width: 4 }, { width: 24 }, { width: 18 }, { width: 18 }, { width: 18 }];
  overview.mergeCells('A1:G2'); overview.getCell('A1').value = 'Security & Compliance Report'; overview.getCell('A1').font = { size: 22, bold: true, color: { argb: 'FFFFFFFF' } }; overview.getCell('A1').fill = { type:'pattern',pattern:'solid',fgColor:{argb:navy} }; overview.getCell('A1').alignment={vertical:'middle'};
  const details = [['Report type','Security & Compliance'],['Project',summary.projectName],['Requested URL',summary.requestedUrl],['Final URL',summary.finalUrl],['HTTP status',summary.responseStatus],['Jurisdiction',summary.jurisdiction || 'Not specified'],['Generated',new Date(summary.generatedAt).toLocaleString()],['Scope note',summary.disclaimer]];
  details.forEach(([label,value],i)=>{const r=4+i; overview.getCell(r,1).value=label;overview.getCell(r,1).font={bold:true,color:{argb:muted}};overview.getCell(r,2).value=value;overview.getCell(r,2).alignment={wrapText:true,vertical:'top'};overview.getCell(r,2).font={color:{argb:text}};overview.getRow(r).height=label==='Scope note'?58:26;});
  overview.getCell('D4').value='Status';overview.getCell('D4').font={bold:true,color:{argb:muted}};
  [['Passed',summary.totals.pass,'pass'],['Review',summary.totals.warning,'warning'],['Needs attention',summary.totals.fail,'fail'],['Manual review',summary.totals.manual,'manual']].forEach(([label,value,status],i)=>{const c=4+i;overview.getCell(5,c).value=label;overview.getCell(5,c).font={bold:true,color:{argb:muted}};overview.getCell(6,c).value=value;overview.getCell(6,c).font={size:18,bold:true,color:{argb:statusColor(status)}};overview.getCell(6,c).fill={type:'pattern',pattern:'solid',fgColor:{argb:statusFill(status)}};overview.getCell(5,c).alignment=overview.getCell(6,c).alignment={horizontal:'center'};});
  overview.getCell('D9').value='Compliance evidence';overview.getCell('D9').font={bold:true,color:{argb:muted}};
  summary.frameworkResults.forEach((fw,i)=>{const r=10+i;overview.getCell(r,4).value=fw.label;overview.getCell(r,4).font={bold:true,color:{argb:text}};overview.getCell(r,5).value=fw.applicable===false?'Not indicated':'Evidence found';overview.getCell(r,6).value=`${(fw.publicEvidence||[]).length + (fw.technicalControls||[]).length} observed`;overview.getCell(r,7).value=`${(fw.missingEvidence||[]).length} missing/manual`;});

  const findings = workbook.addWorksheet('Findings', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  findings.columns=[{header:'Finding ID',width:38},{header:'Title',width:38},{header:'Severity',width:14},{header:'Confidence',width:16},{header:'Lifecycle Status',width:18},{header:'Decision Reason',width:48},{header:'Decision Expiry',width:22},{header:'Decision By',width:24},{header:'Decision Role',width:24},{header:'Decision Date',width:24},{header:'Affected URL',width:50},{header:'Evidence Type',width:24},{header:'Evidence',width:72},{header:'Impact',width:58},{header:'Recommendation',width:62},{header:'Controls',width:52},{header:'Test Method',width:36},{header:'First Seen',width:24},{header:'Last Seen',width:24},{header:'Tool Version',width:16},{header:'Limitations',width:60}];
  findings.getRow(1).height=34;findings.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.findings || []){const row=findings.addRow([item.id,item.title,item.severity,item.confidence,item.status,item.decision?.reason||'',item.decision?.expiresAt||'',item.decision?.actor||'',item.decision?.role||'',item.decision?.updatedAt||'',item.affectedUrl,item.evidence?.type||'',item.evidence?.raw||'',item.impact,item.recommendation,(item.controls||[]).join('\n'),item.testMethod,item.firstSeen,item.lastSeen,item.toolVersion,(item.limitations||[]).join('\n')]);row.height=58;row.alignment={vertical:'top',wrapText:true};row.getCell(3).fill={type:'pattern',pattern:'solid',fgColor:{argb:statusFill(['critical','high'].includes(item.severity)?'fail':item.severity==='medium'?'warning':'info')}};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  findings.autoFilter={from:'A1',to:'U1'};

  if (summary.workflow?.evidenceReviews?.length) {
    const reviews = workbook.addWorksheet('Evidence Reviews', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
    reviews.columns=[{header:'Evidence ID',width:32},{header:'Artifact',width:36},{header:'State',width:28},{header:'Reviewer',width:24},{header:'Reviewer Role',width:24},{header:'Review Date',width:24},{header:'Review Note',width:62},{header:'Expiry',width:22},{header:'Source',width:60},{header:'Version',width:12}];
    reviews.getRow(1).height=34;reviews.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
    for(const item of summary.workflow.evidenceReviews){const row=reviews.addRow([item.id,item.artifactId,humanize(item.approvalStatus),item.reviewer,item.reviewerRole,item.reviewedAt,item.reviewNote,item.expiryDate,item.sourceReference,item.version]);row.height=44;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
    reviews.autoFilter={from:'A1',to:'J1'};
  }

  const coverage = workbook.addWorksheet('Test Coverage', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  coverage.columns=[{header:'Test ID',width:30},{header:'Title',width:38},{header:'Category',width:28},{header:'Outcome',width:18},{header:'Collection State',width:20},{header:'Confidence',width:16},{header:'Affected URL',width:50},{header:'Test Method',width:38},{header:'Summary',width:60},{header:'Limitations',width:62}];
  coverage.getRow(1).height=34;coverage.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.testResults || []){const row=coverage.addRow([item.id,item.title,item.category,statusLabel(item.outcome),item.stateLabel||humanize(item.state),item.confidence,item.affectedUrl,item.testMethod,item.summary,(item.limitations||[]).join('\n')]);row.height=46;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  coverage.autoFilter={from:'A1',to:'J1'};

  const checks = workbook.addWorksheet('Security Checks', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  checks.columns=[{header:'Category',width:24},{header:'Check',width:34},{header:'Status',width:18},{header:'Severity',width:16},{header:'Affected URL',width:54},{header:'Summary',width:58},{header:'Details / Evidence',width:70},{header:'Recommendation',width:65},{header:'References',width:65},{header:'Frameworks',width:42}];
  checks.getRow(1).height=34;checks.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.checks){const evidenceItems=(item.evidenceItems||[]).map(e=>`${e.sourceUrl}: ${e.evidenceText}`).join(' | ');const row=checks.addRow([item.category,item.title,statusLabel(item.status),item.severity||'',item.affectedUrl||'',item.summary,[item.details,item.evidence,evidenceItems].filter(Boolean).join(' · '),item.recommendation,(item.references||[]).join('\n'),(item.frameworks||[]).join(', ')]);row.height=50;row.alignment={vertical:'top',wrapText:true};row.getCell(3).fill={type:'pattern',pattern:'solid',fgColor:{argb:statusFill(item.status)}};row.getCell(3).font={bold:true,color:{argb:statusColor(item.status)}};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  checks.autoFilter={from:'A1',to:'J1'};

  const mapping = workbook.addWorksheet('Compliance Mapping', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  mapping.columns=[{header:'Framework',width:24},{header:'Applicability',width:18},{header:'Public Evidence',width:58},{header:'Technical Controls',width:58},{header:'Missing Evidence',width:58},{header:'Certification',width:58},{header:'Jurisdiction',width:24},{header:'Scope Note',width:72}];
  mapping.getRow(1).height=34;mapping.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const fw of summary.frameworkResults){const row=mapping.addRow([fw.label,fw.applicable===false?'Not indicated':'Applicable / selected',(fw.publicEvidence||[]).join('\n'),(fw.technicalControls||[]).join('\n'),(fw.missingEvidence||[]).join('\n'),fw.certification||'',fw.jurisdiction||'',fw.note]);row.height=64;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}

  const controls = workbook.addWorksheet('Control Evidence', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  controls.columns=[{header:'Control ID',width:34},{header:'Evidence State',width:34},{header:'Automated Evidence',width:62},{header:'Linked Findings',width:48},{header:'Manual Review Required',width:24},{header:'Limitations',width:72}];
  controls.getRow(1).height=34;controls.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.controlEvaluations || []){const row=controls.addRow([item.controlId,humanize(item.state),(item.automatedEvidence||[]).map(e=>`${e.checkId}: ${e.outcome} (${e.testState})`).join('\n'),(item.linkedFindings||[]).join('\n'),item.manualReviewRequired?'Yes':'No',(item.limitations||[]).join('\n')]);row.height=58;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  controls.autoFilter={from:'A1',to:'F1'};

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
  constructor({ reportsRoot, evidenceVault = null, lifecycleManager = null }) {
    this.reportsRoot = reportsRoot;
    this.evidenceVault = evidenceVault;
    this.lifecycleManager = lifecycleManager;
  }

  makeReportWritable(root) {
    for (const file of ['metadata.json','summary.json','summary.csv','summary.html','summary.xlsx','executive-report.json','developer-report.json','auditor-evidence-report.json','legal-privacy-report.json','technical-appendix.json','workflow.json','report-manifest.json']) {
      try { fs.chmodSync(path.join(root, file), 0o644); } catch {}
    }
  }

  async writeReportFiles(root, summary, previousManifestSha256 = '') {
    const metadata = { reportType:'security-compliance', schemaVersion:summary.schemaVersion, scannerVersion:summary.scannerVersion, projectName:summary.projectName, targetUrl:summary.requestedUrl, generatedAt:summary.generatedAt, frameworks:summary.frameworks, jurisdiction:summary.jurisdiction, evidenceArtifactCount:summary.evidenceManifest?.artifactCount || 0, workflowRevision:summary.workflow?.revision || 1, workflowUpdatedAt:summary.workflow?.updatedAt || summary.generatedAt };
    const overview = { reportType:'security-compliance', projectName:summary.projectName, baseUrl:summary.finalUrl, overallStatus:summary.overallStatus, securityPassed:summary.totals.pass, securityAttention:summary.totals.fail + summary.totals.warning, frameworks:summary.frameworkResults.map(f=>f.label) };
    fs.writeFileSync(path.join(root,'metadata.json'),JSON.stringify(metadata,null,2));
    fs.writeFileSync(path.join(root,'summary.json'),JSON.stringify({ ...summary, overview },null,2));
    fs.writeFileSync(path.join(root,'workflow.json'),`${JSON.stringify(summary.workflow || {},null,2)}\n`);
    const revisionsRoot = ensureDir(path.join(root, 'revisions'));
    const workflowRevisionFile = `revisions/workflow-revision-${String(summary.workflow?.revision || 1).padStart(4, '0')}.json`;
    fs.writeFileSync(path.join(root, workflowRevisionFile),`${JSON.stringify(summary.workflow || {},null,2)}\n`, { mode: 0o444 });
    writeCsv(root,summary);
    fs.writeFileSync(path.join(root,'summary.html'),buildHtml(summary),'utf8');
    await writeXlsx(root,summary);
    const projectionFiles = writeReportProjections(root, summary);
    const files = ['metadata.json','summary.json','summary.csv','summary.html','summary.xlsx','workflow.json',workflowRevisionFile,...projectionFiles];
    return writeSignedReportManifest(root, summary, files, previousManifestSha256);
  }

  async save(summary) {
    ensureDir(this.reportsRoot);
    const runName = `${slugify(summary.projectName)}_security-compliance_${timestamp()}`;
    const root = path.join(this.reportsRoot, runName);
    ensureDir(root);
    const evidenceManifest = writeEvidenceArchive(root, summary.evidenceArchive || {});
    const vaultEvidence = this.evidenceVault ? this.evidenceVault.registerScan({ projectName: summary.projectName, reportName: runName, manifest: evidenceManifest }) : [];
    summary = { ...publicSummary(summary), evidenceManifest: { schemaVersion: evidenceManifest.schemaVersion, artifactCount: evidenceManifest.artifactCount, access: evidenceManifest.access, artifacts: evidenceManifest.artifacts, signature: evidenceManifest.signature }, vaultEvidence };
    summary = applyWorkflow(summary, reportWorkflow({ summary, reportName: runName, evidenceVault: this.evidenceVault, lifecycleManager: this.lifecycleManager, revision: 1 }));
    const reportManifest = await this.writeReportFiles(root, summary);
    return { ...summary, reportManifest, reportName:runName, summaryHref:`/reports/${encodeURIComponent(runName)}/summary.html`, jsonHref:`/reports/${encodeURIComponent(runName)}/summary.json`, csvHref:`/reports/${encodeURIComponent(runName)}/summary.csv`, xlsxHref:`/reports/${encodeURIComponent(runName)}/summary.xlsx`, executiveHref:`/reports/${encodeURIComponent(runName)}/executive-report.json`, developerHref:`/reports/${encodeURIComponent(runName)}/developer-report.json`, auditorHref:`/reports/${encodeURIComponent(runName)}/auditor-evidence-report.json`, privacyHref:`/reports/${encodeURIComponent(runName)}/legal-privacy-report.json`, appendixHref:`/reports/${encodeURIComponent(runName)}/technical-appendix.json` };
  }

  async refreshWorkflow({ projectName = '', reportName = '', legacyOnly = false } = {}) {
    if (!fs.existsSync(this.reportsRoot)) return [];
    const updated = [];
    for (const entry of fs.readdirSync(this.reportsRoot, { withFileTypes: true })) {
      if (!entry.isDirectory() || (reportName && entry.name !== reportName)) continue;
      const root = path.join(this.reportsRoot, entry.name);
      const summaryFile = path.join(root, 'summary.json');
      if (!fs.existsSync(summaryFile)) continue;
      const previousManifestFile = path.join(root, 'report-manifest.json');
      let summary;
      let currentManifest = {};
      try { summary = normalizeLegacySummary(JSON.parse(fs.readFileSync(summaryFile, 'utf8'))); } catch { continue; }
      try { currentManifest = JSON.parse(fs.readFileSync(previousManifestFile, 'utf8')); } catch {}
      const workflowIsCurrent = Boolean(summary.workflow && currentManifest.workflowRevision === summary.workflow.revision);
      if (summary.overview?.reportType !== 'security-compliance' || (projectName && summary.projectName !== projectName) || (legacyOnly && workflowIsCurrent)) continue;
      const previousManifestBuffer = fs.existsSync(previousManifestFile) ? fs.readFileSync(previousManifestFile) : null;
      const previousManifestSha256 = previousManifestBuffer ? sha256(previousManifestBuffer) : '';
      if (previousManifestBuffer) {
        const revisionsRoot = ensureDir(path.join(root, 'revisions'));
        const previousRevision = summary.workflow?.revision || 1;
        const archivedManifest = path.join(revisionsRoot, `report-manifest-revision-${String(previousRevision).padStart(4, '0')}.json`);
        if (!fs.existsSync(archivedManifest)) fs.writeFileSync(archivedManifest, previousManifestBuffer, { mode: 0o444 });
      }
      const workflow = reportWorkflow({ summary, reportName: entry.name, evidenceVault: this.evidenceVault, lifecycleManager: this.lifecycleManager, revision: (summary.workflow?.revision || 0) + 1 });
      summary = applyWorkflow(summary, workflow);
      this.makeReportWritable(root);
      await this.writeReportFiles(root, summary, previousManifestSha256);
      updated.push(entry.name);
    }
    return updated;
  }
}
