import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { extractComplianceEvidence } from '../lib/website-crawler.js';
import { analyzeCsp, classifyCookie, parseHsts, scanWebsiteSecurity } from '../lib/security-scanner.js';
import { buildFindings } from '../lib/security-finding-model.js';
import { SecurityReportManager } from '../lib/security-report-manager.js';
import { SecuritySessionStore } from '../lib/security-session-store.js';
import { normalizeZapAlerts } from '../lib/zap-runner.js';
import { EvidenceVault } from '../lib/evidence-vault.js';
import { SecurityLifecycleManager } from '../lib/security-lifecycle-manager.js';
import { SecurityScheduleManager } from '../lib/security-schedule-manager.js';
import { startSecurityLab } from './fixtures/security-lab-server.js';

test('CSP analysis rejects a present but unsafe policy', () => {
  const analysis = analyzeCsp("default-src *; script-src * 'unsafe-inline' 'unsafe-eval'");
  assert.equal(analysis.present, true);
  assert.equal(analysis.strength, 'weak');
  assert.match(analysis.issues.join(' '), /unsafe-inline/);
  assert.match(analysis.issues.join(' '), /object-src/);
});

test('HSTS and cookie classifiers retain security context', () => {
  const hsts = parseHsts('max-age=300');
  assert.equal(hsts.includeSubDomains, false);
  assert.ok(hsts.issues.length >= 2);
  assert.equal(classifyCookie('session_id'), 'session-or-auth');
  assert.equal(classifyCookie('_ga'), 'tracking-analytics');
  assert.equal(classifyCookie('theme'), 'functional-preference');
});

test('generic healthcare marketing does not establish HIPAA applicability evidence', () => {
  const generic = extractComplianceEvidence([{ found: true, groups: ['homepage'], html: '<p>Industries: healthcare and wellness</p>', finalUrl: 'https://example.test/' }]);
  const explicit = extractComplianceEvidence([{ found: true, groups: ['homepage'], html: '<p>We process protected health information (PHI) under a BAA.</p>', finalUrl: 'https://example.test/' }]);
  assert.equal(generic.evidenceFound.healthcarePhi, true);
  assert.equal(generic.evidenceFound.hipaaApplicability, false);
  assert.equal(explicit.evidenceFound.hipaaApplicability, true);
});

test('cookie instances normalize into atomic professional findings', () => {
  const findings = buildFindings([{
    id: 'cookies', title: 'Cookie attributes', category: 'Privacy & session', status: 'fail', severity: 'high', confidence: 'confirmed', testState: 'confirmed', affectedUrl: 'https://example.test', references: [], limitations: [],
    instances: [{ name: 'session_id', category: 'session-or-auth', missing: ['Secure'], raw: 'session_id=[REDACTED]; HttpOnly; SameSite=Lax' }]
  }], { generatedAt: '2026-08-24T00:00:00.000Z', toolVersion: '1.5.0', frameworks: ['soc-2', 'iso-27001'] });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, 'COOKIE_SESSION_SECURE_MISSING');
  assert.equal(findings[0].status, 'open');
  assert.equal(findings[0].confidence, 'confirmed');
  assert.ok(findings[0].controls.includes('SOC2-CC6.1'));
  assert.equal(findings[0].evidence.raw.includes('test-secret'), false);
});

test('ZAP alerts normalize without losing plugin, URL, evidence, or remediation', () => {
  const findings = normalizeZapAlerts({ site: [{ '@name': 'https://example.test', alerts: [{ pluginid: '10020', alert: 'Missing Anti-clickjacking Header', riskcode: '2', confidence: '3', desc: 'The response can be framed.', solution: 'Set frame-ancestors.', reference: 'https://www.zaproxy.org/docs/alerts/10020/', cweid: '1021', instances: [{ uri: 'https://example.test/login', method: 'GET', evidence: '<html>' }] }] }] });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, 'ZAP_10020');
  assert.equal(findings[0].severity, 'medium');
  assert.equal(findings[0].confidence, 'confirmed');
  assert.equal(findings[0].affectedUrl, 'https://example.test/login');
  assert.match(findings[0].evidence.raw, /GET/);
});

test('security session storage encrypts Playwright state and reuses it by role', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'security-session-test-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const store = new SecuritySessionStore({ root, encryptionSecret: 'test-only-secret' });
  const id = store.sessionId('Example Project', 'manager');
  store.save(id, { cookies: [{ name: 'session', value: 'secret-value' }], origins: [] });
  const encrypted = fs.readFileSync(store.fileFor(id), 'utf8');
  assert.equal(encrypted.includes('secret-value'), false);
  assert.equal(store.load(id).storageState.cookies[0].value, 'secret-value');
  assert.equal(store.load(id).metadata.persistentAcrossRestarts, true);
});

test('evidence vault records review changes and immutable audit events', (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-vault-test-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const vault = new EvidenceVault({ dataDir });
  const evidence = vault.createManual({ projectName: 'Example', note: 'Retention policy reviewed.', owner: 'compliance', linkedControls: ['GDPR-ART-5'] });
  const reviewed = vault.review(evidence.id, { status: 'approved', reviewer: 'Reviewer', role: 'legal_reviewer', note: 'Current policy accepted.' });
  assert.equal(reviewed.approvalStatus, 'approved');
  assert.equal(reviewed.version, 2);
  assert.ok(vault.auditLog({ projectName: 'Example' }).length >= 2);
});

test('finding lifecycle identifies new, recurring, and resolved fingerprints', (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finding-lifecycle-test-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const manager = new SecurityLifecycleManager({ dataDir });
  const finding = { fingerprint: 'a'.repeat(64), id: 'TEST_FINDING', title: 'Test', severity: 'medium', affectedUrl: 'https://example.test', firstSeen: '2026-08-24T00:00:00.000Z', lastSeen: '2026-08-24T00:00:00.000Z', status: 'open' };
  const first = manager.reconcile({ projectName: 'Example', generatedAt: finding.lastSeen, findings: [{ ...finding }] });
  const second = manager.reconcile({ projectName: 'Example', generatedAt: '2026-08-25T00:00:00.000Z', findings: [{ ...finding, lastSeen: '2026-08-25T00:00:00.000Z' }] });
  const third = manager.reconcile({ projectName: 'Example', generatedAt: '2026-08-26T00:00:00.000Z', findings: [] });
  assert.equal(first.comparison.newCount, 1);
  assert.equal(second.comparison.recurringCount, 1);
  assert.equal(third.comparison.resolvedCount, 1);
});

test('scheduler refuses to persist credentials', (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'security-schedule-test-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const manager = new SecurityScheduleManager({ dataDir, runner: async () => ({}) });
  assert.throws(() => manager.create({ config: { projectName: 'Example', targetUrl: 'https://example.test', authentication: { enabled: true, username: 'u', password: 'p' } } }), /cannot persist credentials/);
});

test('local lab scan produces findings, coverage states, and a hashed evidence archive', async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  const scan = await scanWebsiteSecurity({
    projectName: 'Security Lab',
    targetUrl: `${lab.baseUrl}/weak-cookies`,
    frameworks: ['iso-27001', 'gdpr', 'soc-2'],
    crawl: false,
    browserRetryCount: 0,
    browserTimeoutMs: 5000
  });
  assert.equal(scan.schemaVersion, '2.0.0');
  assert.ok(scan.findings.some((finding) => finding.id === 'COOKIE_SESSION_SECURE_MISSING'));
  assert.ok(scan.testResults.every((result) => result.state));
  assert.ok(scan.controlEvaluations.length > 0);
  assert.deepEqual(scan.evidenceArchive.http.initialResponse.rawSetCookieHeaders.length, 2);

  const reportsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'security-report-test-'));
  t.after(() => fs.rmSync(reportsRoot, { recursive: true, force: true }));
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'security-report-data-test-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const vault = new EvidenceVault({ dataDir });
  const lifecycle = new SecurityLifecycleManager({ dataDir, audit: (event) => vault.audit(event) });
  const reportManager = new SecurityReportManager({ reportsRoot, evidenceVault: vault, lifecycleManager: lifecycle });
  const saved = await reportManager.save(lifecycle.reconcile(scan));
  const reportRoot = path.join(reportsRoot, saved.reportName);
  const manifest = JSON.parse(fs.readFileSync(path.join(reportRoot, 'evidence', 'manifest.json'), 'utf8'));
  assert.ok(manifest.artifactCount >= 8);
  assert.ok(manifest.artifacts.every((artifact) => /^[a-f0-9]{64}$/.test(artifact.sha256)));
  assert.equal('evidenceArchive' in saved, false);
  assert.equal('screenshotBase64' in saved.browserScan, false);
  assert.ok(fs.existsSync(path.join(reportRoot, 'summary.xlsx')));

  vault.review(saved.vaultEvidence[0].id, { status: 'approved', reviewer: 'Alice Reviewer', role: 'security_reviewer', note: 'Header evidence verified.' });
  lifecycle.update(saved.findings[0].fingerprint, { projectName: 'Security Lab', status: 'false_positive', reason: 'Compensating edge control verified.', actor: 'Bob Reviewer', role: 'security_reviewer' });
  const refreshed = await reportManager.refreshWorkflow({ projectName: 'Security Lab' });
  assert.deepEqual(refreshed, [saved.reportName]);
  const refreshedSummary = JSON.parse(fs.readFileSync(path.join(reportRoot, 'summary.json'), 'utf8'));
  const refreshedHtml = fs.readFileSync(path.join(reportRoot, 'summary.html'), 'utf8');
  const refreshedManifest = JSON.parse(fs.readFileSync(path.join(reportRoot, 'report-manifest.json'), 'utf8'));
  assert.equal(refreshedSummary.workflow.revision, 2);
  assert.match(refreshedHtml, /Alice Reviewer/);
  assert.match(refreshedHtml, /Header evidence verified/);
  assert.match(refreshedHtml, /Compensating edge control verified/);
  assert.ok(fs.existsSync(path.join(reportRoot, 'revisions', 'report-manifest-revision-0001.json')));
  assert.ok(fs.existsSync(path.join(reportRoot, 'revisions', 'workflow-revision-0002.json')));
  assert.match(refreshedManifest.previousManifestSha256, /^[a-f0-9]{64}$/);
});
