import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import nodeTest from 'node:test';
import { extractComplianceEvidence } from '../lib/website-crawler.js';
import { analyzeCsp, assessInitialTracking, assessPrivacyRuntimeConsistency, classifyCookie, normalizeFrameworkApplicability, parseHsts, scanWebsiteSecurity, serverDisclosureAssessment } from '../lib/security-scanner.js';
import { buildControlEvaluations, buildFindings, resolveLocalJurisdictions } from '../lib/security-finding-model.js';
import { SecurityReportManager } from '../lib/security-report-manager.js';
import { SecuritySessionStore } from '../lib/security-session-store.js';
import { normalizeZapAlerts } from '../lib/zap-runner.js';
import { EvidenceVault } from '../lib/evidence-vault.js';
import { SecurityLifecycleManager } from '../lib/security-lifecycle-manager.js';
import { startSecurityLab } from './fixtures/security-lab-server.js';
import { browserSkipReason, detectBrowserCapabilities } from '../lib/browser-capability.js';

const browserTestName = /^(?:strong PHI signals|outsourced payment-processing|local lab scan produces)/;
function test(name, ...args) {
  const taxonomy = process.env.WET_TEST_TAXONOMY || 'all';
  if (taxonomy === 'core' && browserTestName.test(name)) return undefined;
  if (taxonomy === 'browser' && !browserTestName.test(name)) return undefined;
  return nodeTest(name, ...args);
}

async function requireBrowserCapability(t, fixtureUrl, { pdf = false } = {}) {
  const capability = await detectBrowserCapabilities({ fixtureUrl });
  const navigationReason = browserSkipReason(capability, 'navigation');
  const pdfReason = pdf ? browserSkipReason(capability, 'pdf') : '';
  const reason = navigationReason || pdfReason;
  if (reason) t.skip(reason);
  return !reason;
}

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

test('tracking in a fresh context is adverse even when no consent interface exists', () => {
  assert.deepEqual(assessInitialTracking({ consentInterfaceDetected: false, trackingRequestCount: 2, freshContext: true }), {
    freshConsentContext: true,
    trackingBeforeConsent: false,
    trackingWithoutConsentInterface: true
  });
  assert.equal(assessInitialTracking({ consentInterfaceDetected: true, trackingRequestCount: 1, freshContext: true }).trackingBeforeConsent, true);
  assert.equal(assessInitialTracking({ consentInterfaceDetected: false, trackingRequestCount: 1, freshContext: false }).trackingWithoutConsentInterface, false);
});

test('framework applicability and local jurisdictions are normalized without assuming legal scope', () => {
  const applicability = normalizeFrameworkApplicability({ gdpr: 'yes', hipaa: 'no', 'pci-dss': 'unknown' });
  assert.equal(applicability.gdpr, 'applicable');
  assert.equal(applicability.hipaa, 'not_applicable');
  assert.equal(applicability['pci-dss'], 'unknown');
  assert.deepEqual(resolveLocalJurisdictions('UAE, Saudi Arabia and Egypt').map((item) => item.id), ['uae', 'saudi-arabia', 'egypt']);
  assert.deepEqual(resolveLocalJurisdictions('Office address: Cairo').map((item) => item.id), []);
});

test('generic healthcare marketing does not establish HIPAA applicability evidence', () => {
  const generic = extractComplianceEvidence([{ found: true, groups: ['homepage'], html: '<p>Industries: healthcare and wellness</p>', finalUrl: 'https://example.test/' }]);
  const explicit = extractComplianceEvidence([{ found: true, groups: ['homepage'], html: '<p>We process protected health information (PHI) under a BAA.</p>', finalUrl: 'https://example.test/' }]);
  assert.equal(generic.evidenceFound.healthcareContext, true);
  assert.equal(generic.evidenceFound.healthcarePhi, false);
  assert.equal(generic.evidenceFound.hipaaApplicability, false);
  assert.equal(explicit.evidenceFound.healthcarePhi, true);
  assert.equal(explicit.evidenceFound.hipaaApplicability, true);
});

test('plain-language privacy rights, retention, processors, and disclosure claims are extracted', () => {
  const evidence = extractComplianceEvidence([{ found: true, groups: ['privacy'], finalUrl: 'https://example.test/privacy', html: '<h2>Who we share it with</h2><p>Our service providers act as processors under appropriate safeguards.</p><h2>How long we keep it</h2><p>We retain enquiry data as needed, then delete or anonymise it.</p><h2>Your rights</h2><p>You may ask us to access, correct, or delete your personal data.</p><p>We do not set advertising cookies.</p>' }]);
  assert.equal(evidence.evidenceFound.dataSubjectRights, true);
  assert.equal(evidence.evidenceFound.dataRetention, true);
  assert.equal(evidence.evidenceFound.subprocessors, true);
  assert.equal(evidence.evidenceFound.noAdvertisingCookiesClaim, true);
});

test('policy headings, explicit periods, banner claims, and outsourced payment language are extracted', () => {
  const evidence = extractComplianceEvidence([{ found: true, groups: ['privacy'], finalUrl: 'https://example.test/privacy', html: '<h2>Data Retention</h2><p>We keep booking records for 7 years. Account data is deleted within 90 days.</p><p>You can manage your cookie preferences via the banner on your first visit.</p><p>Payment details are processed by our payment processor; we never store full card numbers.</p>' }]);
  assert.equal(evidence.evidenceFound.dataRetention, true);
  assert.equal(evidence.evidenceFound.consentInterfaceClaim, true);
  assert.equal(evidence.evidenceFound.paymentProcessing, true);
  assert.equal(evidence.evidenceFound.pciApplicability, true);
});

test('privacy/runtime comparison identifies advertising technology that contradicts a policy claim', () => {
  const result = assessPrivacyRuntimeConsistency({
    noAdvertisingCookiesClaim: true,
    trackingRequests: [{ url: 'https://connect.facebook.net/en_US/fbevents.js' }, { url: 'https://www.google-analytics.com/g/collect' }],
    cookies: [{ name: '_fbp' }, { name: '_ga' }]
  });
  assert.equal(result.contradictionObserved, true);
  assert.equal(result.advertisingRequests.length, 1);
  assert.deepEqual(result.advertisingCookies.map((cookie) => cookie.name), ['_fbp']);
});

test('privacy/runtime comparison separates an unverified banner claim from a legal conclusion', () => {
  const unverified = assessPrivacyRuntimeConsistency({ consentInterfaceClaim: true, consentInterfaceDetected: false, browserState: 'confirmed', freshContext: true });
  assert.equal(unverified.consentClaimUnverified, true);
  assert.equal(unverified.contradictionObserved, false);
  const incomplete = assessPrivacyRuntimeConsistency({ consentInterfaceClaim: true, consentInterfaceDetected: false, browserState: 'observed', freshContext: true });
  assert.equal(incomplete.consentClaimUnverified, false);
});

test('versionless platform disclosure is informational while version disclosure is low severity', () => {
  assert.equal(serverDisclosureAssessment({ server: 'Odoo.sh' }).status, 'info');
  const versioned = serverDisclosureAssessment({ server: 'Apache/2.4.62' });
  assert.equal(versioned.status, 'warning');
  assert.equal(versioned.severity, 'low');
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

test('cookie evidence is deduplicated and inferred session severity is calibrated', () => {
  const checks = ['cookies', 'runtime-cookies'].map((id) => ({
    id, title: 'Cookie attributes', category: 'Privacy & session', status: 'fail', severity: 'high', confidence: 'confirmed', testState: 'confirmed', affectedUrl: 'https://example.test/', references: [], limitations: [],
    instances: [{ name: 'session_id', category: 'session-or-auth', missing: ['Secure'], raw: `${id}: session_id=[REDACTED]` }]
  }));
  const findings = buildFindings(checks, {
    generatedAt: '2026-08-24T00:00:00.000Z', toolVersion: '1.6.0',
    frameworks: ['iso-27001', 'gdpr', 'hipaa', 'pci-dss', 'local'],
    frameworkApplicability: { 'iso-27001': 'selected_for_mapping', gdpr: 'requires_scope_confirmation', hipaa: 'not_indicated', 'pci-dss': 'not_indicated', local: 'requires_scope_confirmation' },
    jurisdiction: 'Egypt'
  });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].severity, 'medium');
  assert.equal(findings[0].evidenceItems.length, 2);
  assert.ok(findings[0].controls.includes('ISO27001:2022-A.8.5'));
  assert.equal(findings[0].controls.some((control) => control.startsWith('LOCAL-')), false);
  assert.equal(findings[0].controls.some((control) => control.startsWith('HIPAA-')), false);
  assert.equal(findings[0].controls.some((control) => control.startsWith('PCI-DSS-')), false);
  const isoMapping = findings[0].controlMappings.filter((mapping) => mapping.controlId === 'ISO27001:2022-A.8.5' && mapping.relationship === 'supporting');
  assert.equal(isoMapping.length, 1);
  assert.deepEqual(isoMapping[0].sourceCheckIds.sort(), ['cookies', 'runtime-cookies']);
  assert.equal(isoMapping[0].sourceMappingIds.length, 2);
});

test('cookie and CORS observations do not claim HIPAA authentication/access-control or PCI secure-development controls', () => {
  const checks = [{ id: 'cookies', title: 'Cookies', category: 'Privacy & session', status: 'fail', severity: 'medium', testState: 'confirmed', affectedUrl: 'https://example.test/', instances: [{ name: 'session_id', category: 'session-or-auth', missing: ['Secure'], raw: 'session_id=[REDACTED]' }] }];
  const findings = buildFindings(checks, {
    generatedAt: '2026-08-24T00:00:00.000Z', toolVersion: '1.7.0', frameworks: ['hipaa', 'pci-dss'],
    frameworkApplicability: { hipaa: 'applicable', 'pci-dss': 'applicable' }
  });
  assert.equal(findings[0].controls.some((control) => control.startsWith('HIPAA-')), false);
  assert.equal(findings[0].controls.some((control) => control.startsWith('PCI-DSS-')), false);
});

test('control evaluation reports partial evidence and never automatic control satisfaction', () => {
  const checks = [{ id: 'https', status: 'pass', testState: 'confirmed' }];
  const controls = buildControlEvaluations(checks, [], ['iso-27001'], { frameworkApplicability: { 'iso-27001': 'selected_for_mapping' }, evidenceLevel: 'public_url' });
  assert.equal(controls[0].state, 'partial_technical_evidence_observed');
  assert.equal(controls[0].controlSatisfaction, 'not_determined');
  assert.equal(controls[0].coverage, 'partial');
  assert.equal(controls[0].automatedEvidence[0].strength, 'direct_observation');
});

test('ZAP alerts normalize without losing plugin, URL, evidence, or remediation', () => {
  const findings = normalizeZapAlerts({ site: [{ '@name': 'https://example.test', alerts: [{ pluginid: '10020', alert: 'Missing Anti-clickjacking Header', riskcode: '2', confidence: '3', desc: 'The response can be framed.', solution: 'Set frame-ancestors.', reference: 'https://www.zaproxy.org/docs/alerts/10020/', cweid: '1021', instances: [{ uri: 'https://example.test/login', method: 'GET', evidence: '<html>' }] }] }] });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].id, 'ZAP_10020');
  assert.equal(findings[0].severity, 'medium');
  assert.equal(findings[0].confidence, 'high');
  assert.equal(findings[0].legacyConfidence, 'confirmed');
  assert.equal(findings[0].collectionState, 'completed');
  assert.equal(findings[0].collectionMethod, 'zap_passive');
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

test('evidence vault records immutable automated artifact provenance without an approval lifecycle', (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-vault-test-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const vault = new EvidenceVault({ dataDir });
  const [evidence] = vault.registerScan({ projectName: 'Example', reportName: 'example-report', manifest: { generatedAt: '2026-08-24T00:00:00.000Z', access: 'local-filesystem-only', scan: { finalUrl: 'https://example.test/' }, artifacts: [{ id: 'headers', type: 'application/json', path: 'evidence/http/initial-response.json', sha256: 'a'.repeat(64), bytes: 123, sensitive: true }] } });
  assert.equal(evidence.evidenceStrength, 'provenance_only');
  assert.equal(evidence.semanticEvidenceStrength, 'not_applicable');
  assert.equal(evidence.collectionMethod, 'artifact_only');
  assert.equal(evidence.collectionState, 'completed');
  assert.equal(evidence.sourceMethod, 'automated_scan_artifact');
  assert.equal(evidence.reviewState, 'automated');
  assert.equal(evidence.hash, 'a'.repeat(64));
  assert.equal(typeof vault.createManual, 'undefined');
  assert.equal(typeof vault.review, 'undefined');
  assert.equal(vault.auditLog({ projectName: 'Example' }).length, 1);
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

test('reviewer decisions preserve reviewer metadata and evidence references independently of raw findings', (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finding-review-test-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const manager = new SecurityLifecycleManager({ dataDir });
  const finding = { fingerprint: 'c'.repeat(64), id: 'REVIEW_TEST', title: 'Review', severity: 'low', affectedUrl: 'https://example.test', firstSeen: '2026-08-24T00:00:00.000Z', lastSeen: '2026-08-24T00:00:00.000Z', status: 'open' };
  manager.reconcile({ projectName: 'Review', generatedAt: finding.lastSeen, findings: [{ ...finding }] });
  const reviewed = manager.update(finding.fingerprint, { projectName: 'Review', findingStatus: 'reviewed', mappingDecision: 'confirmed', reason: 'Reviewer confirmed candidate relevance only.', reviewer: 'Reviewer', role: 'external_reviewer', evidenceRefs: ['obs_1'] });
  assert.equal(reviewed.decision, 'mapping_confirmed');
  assert.equal(reviewed.reviewer, 'Reviewer');
  assert.equal(reviewed.findingStatus, 'reviewed');
  assert.equal(reviewed.mappingDecision, 'confirmed');
  assert.equal(reviewed.role, 'external_reviewer');
  assert.deepEqual(reviewed.evidenceRefs, ['obs_1']);
  assert.equal(reviewed.findingId, 'REVIEW_TEST');
  const edited = manager.update(finding.fingerprint, { projectName: 'Review', findingStatus: 'reviewed', reviewDecision: 'requires_more_evidence', reason: 'A later review requested additional evidence.', reviewer: 'Legal Reviewer', role: 'legal_reviewer' });
  assert.equal(edited.reviewDecision, 'requires_more_evidence');
  assert.equal(edited.mappingDecision, '');
  assert.equal(edited.reviewer, 'Legal Reviewer');
  assert.equal(edited.role, 'legal_reviewer');
  assert.equal(edited.decisionHistory.length, 1);
  assert.equal(edited.decisionHistory[0].mappingDecision, 'confirmed');
  assert.equal(edited.decisionHistory[0].outcome, 'superseded');
});

test('multiple reviewers can add roles and edit their own review records independently', (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finding-multi-review-test-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const events = [];
  const manager = new SecurityLifecycleManager({ dataDir, audit: (event) => events.push(event) });
  const fingerprint = 'd'.repeat(64);
  manager.reconcile({
    projectName: 'Multi Review',
    generatedAt: '2026-08-25T00:00:00.000Z',
    findings: [{ fingerprint, id: 'MULTI_REVIEW', title: 'Review separately', severity: 'medium', affectedUrl: 'https://example.test', firstSeen: '2026-08-25T00:00:00.000Z', lastSeen: '2026-08-25T00:00:00.000Z', status: 'open' }]
  });

  const first = manager.addReview(fingerprint, { projectName: 'Multi Review', reviewDecision: 'accepted_as_observation', reason: 'Technical observation accepted.', reviewer: 'Technical Reviewer', role: 'reviewer' });
  const firstId = first.reviews[0].reviewId;
  const second = manager.addReview(fingerprint, { projectName: 'Multi Review', scopeDecision: 'not_confirmed', reason: 'Legal applicability needs confirmation.', reviewer: 'Legal Reviewer', role: 'legal_reviewer' });
  const secondId = second.reviews[1].reviewId;

  assert.equal(second.reviews.length, 2);
  assert.notEqual(firstId, secondId);
  assert.deepEqual(second.reviews.map((review) => review.role), ['reviewer', 'legal_reviewer']);
  const edited = manager.updateReview(fingerprint, firstId, { projectName: 'Multi Review', reviewDecision: 'requires_more_evidence', reason: 'Additional runtime evidence requested.', reviewer: 'Technical Reviewer', role: 'compliance_owner' });
  assert.equal(edited.reviews.length, 2);
  assert.equal(edited.reviews.find((review) => review.reviewId === firstId).reviewDecision, 'requires_more_evidence');
  assert.equal(edited.reviews.find((review) => review.reviewId === firstId).role, 'compliance_owner');
  assert.equal(edited.reviews.find((review) => review.reviewId === secondId).scopeDecision, 'not_confirmed');
  assert.equal(edited.decisionHistory.at(-1).outcome, 'review_updated');
  assert.deepEqual(events.map((event) => event.action), ['finding_review_added', 'finding_review_added', 'finding_review_updated']);
  assert.equal(manager.read().version, 5);
});

test('review records are archived and cleared when a resolved finding recurs', (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finding-review-recurrence-test-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const manager = new SecurityLifecycleManager({ dataDir });
  const fingerprint = 'e'.repeat(64);
  const finding = { fingerprint, id: 'RECURRING_REVIEW', title: 'Recurring review', severity: 'medium', affectedUrl: 'https://example.test', firstSeen: '2026-08-25T00:00:00.000Z', lastSeen: '2026-08-25T00:00:00.000Z', status: 'open' };
  manager.reconcile({ projectName: 'Recurrence', generatedAt: finding.lastSeen, findings: [{ ...finding }] });
  manager.addReview(fingerprint, { projectName: 'Recurrence', mappingDecision: 'confirmed', reason: 'Candidate mapping reviewed.', reviewer: 'Mapping Reviewer', role: 'external_reviewer' });
  manager.reconcile({ projectName: 'Recurrence', generatedAt: '2026-08-26T00:00:00.000Z', findings: [] });
  manager.reconcile({ projectName: 'Recurrence', generatedAt: '2026-08-27T00:00:00.000Z', findings: [{ ...finding, lastSeen: '2026-08-27T00:00:00.000Z' }] });
  const [record] = manager.list('Recurrence');
  assert.equal(record.findingStatus, 'open');
  assert.equal(record.reviews.length, 0);
  assert.equal(record.mappingDecision, '');
  assert.equal(record.decisionHistory.at(-1).outcome, 'finding_recurred');
});

test('legacy overloaded lifecycle decisions migrate to the simplified review model', (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'finding-migration-test-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  fs.writeFileSync(path.join(dataDir, 'security-finding-lifecycle.json'), `${JSON.stringify({ version: 2, findings: [{ projectName: 'Legacy', fingerprint: 'b'.repeat(64), findingId: 'LEGACY', status: 'risk_accepted', reason: 'Historical decision', actor: 'Reviewer', role: 'auditor' }] }, null, 2)}\n`);
  const [record] = new SecurityLifecycleManager({ dataDir }).list('Legacy');
  assert.equal(record.findingStatus, 'reviewed');
  assert.equal(record.reviewDecision, 'requires_more_evidence');
  assert.equal(record.role, 'external_reviewer');
  assert.equal(record.legacyStatus, 'risk_accepted');
});

test('strong PHI signals produce only potential HIPAA scope and do not leak into other frameworks', async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  if (!await requireBrowserCapability(t, `${lab.baseUrl}/healthcare-phi`)) return;
  const scan = await scanWebsiteSecurity({
    projectName: 'Scope Lab',
    targetUrl: `${lab.baseUrl}/healthcare-phi`,
    frameworks: ['gdpr', 'hipaa', 'pci-dss'],
    frameworkApplicability: { gdpr: 'unknown', hipaa: 'unknown', 'pci-dss': 'unknown' },
    crawl: true,
    browserRetryCount: 0,
    browserTimeoutMs: 5000
  });
  const hipaa = scan.frameworkResults.find((framework) => framework.id === 'hipaa');
  const gdpr = scan.frameworkResults.find((framework) => framework.id === 'gdpr');
  const pci = scan.frameworkResults.find((framework) => framework.id === 'pci-dss');
  assert.equal(hipaa.applicability, 'potentially_applicable');
  assert.equal(hipaa.scopeBasis, 'public_scope_signal');
  assert.equal(hipaa.scopeDecisionRequired, true);
  assert.equal(pci.applicability, 'not_indicated');
  assert.equal(gdpr.evidenceItems.some((item) => item.category === 'healthcare'), false);
  assert.equal(pci.evidenceItems.some((item) => item.category === 'healthcare'), false);
});

test('outsourced payment-processing language requires PCI scope confirmation without declaring compliance', async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  if (!await requireBrowserCapability(t, `${lab.baseUrl}/payment`)) return;
  const scan = await scanWebsiteSecurity({
    projectName: 'Payment Scope Lab',
    targetUrl: `${lab.baseUrl}/payment`,
    frameworks: ['pci-dss'],
    frameworkApplicability: { 'pci-dss': 'unknown' },
    crawl: true,
    browserRetryCount: 0,
    browserTimeoutMs: 5000
  });
  const pci = scan.frameworkResults.find((framework) => framework.id === 'pci-dss');
  assert.equal(pci.applicability, 'potentially_applicable');
  assert.equal(pci.scopeDecisionRequired, true);
  assert.equal(pci.controlSatisfaction, 'not_determined');
  assert.equal(scan.complianceConclusion, 'not_determined');
  assert.equal(scan.coverage, 'partial');
});

test('local lab scan produces findings, coverage states, and a hashed evidence archive', async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  if (!await requireBrowserCapability(t, `${lab.baseUrl}/weak-cookies`, { pdf: true })) return;
  const scan = await scanWebsiteSecurity({
    projectName: 'Security Lab',
    targetUrl: `${lab.baseUrl}/weak-cookies`,
    frameworks: ['iso-27001', 'gdpr', 'soc-2'],
    crawl: false,
    browserRetryCount: 0,
    browserTimeoutMs: 5000
  });
  assert.equal(scan.schemaVersion, '2.6.0');
  assert.equal(scan.scannerVersion, '1.7.1');
  assert.equal(scan.toolVersion, '1.7.1');
  assert.match(scan.mappingCatalogVersion, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
  assert.equal(scan.assessmentType, 'compliance_pre_assessment');
  assert.equal(scan.evidenceLevel, 'public_url');
  assert.equal(scan.complianceConclusion, 'not_determined');
  assert.ok(scan.findings.some((finding) => finding.id === 'COOKIE_SESSION_SECURE_MISSING'));
  assert.equal(scan.checks.find((check) => check.id === 'cookies').severity, 'medium');
  assert.ok(scan.testResults.every((result) => result.state));
  assert.ok(scan.controlEvaluations.length > 0);
  assert.ok(scan.controlEvaluations.every((control) => control.controlSatisfaction === 'not_determined'));
  assert.ok(scan.controlEvaluations.every((control) => control.coverage === 'partial'));
  assert.equal(scan.counts.checks, scan.checks.length);
  assert.equal(scan.counts.findings, scan.findings.length);
  assert.equal(new Set(scan.findings.map((finding) => finding.fingerprint)).size, scan.findings.length);
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
  assert.equal(fs.existsSync(path.join(reportRoot, 'summary.xlsx')), true);
  assert.ok(fs.existsSync(path.join(reportRoot, 'summary.pdf')));
  assert.ok(fs.existsSync(path.join(reportRoot, 'findings.csv')));
  const pdf = fs.readFileSync(path.join(reportRoot, 'summary.pdf'));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 10_000);
  assert.equal(saved.pdfGeneration.status, 'generated');
  assert.equal(saved.pdfHref, `/api/reports/${encodeURIComponent(saved.reportName)}/download/pdf`);
  assert.match(fs.readFileSync(path.join(reportRoot, 'summary.csv'), 'utf8'), /Evidence Level/);
  const publicReportText = fs.readFileSync(path.join(reportRoot, 'summary.json'), 'utf8');
  const canonicalReport = JSON.parse(publicReportText);
  const htmlReport = fs.readFileSync(path.join(reportRoot, 'summary.html'), 'utf8');
  const findingsCsvRows = fs.readFileSync(path.join(reportRoot, 'findings.csv'), 'utf8').trim().split(/\r?\n/).length - 1;
  assert.equal(findingsCsvRows, canonicalReport.findings.length);
  assert.match(htmlReport, new RegExp(`data-finding-count="${canonicalReport.findings.length}"`));
  const qualityCounts = canonicalReport.testResults.reduce((counts, item) => { counts[item.state] = (counts[item.state] || 0) + 1; return counts; }, {});
  assert.match(htmlReport, new RegExp(`Technical checks completed</span><strong>${qualityCounts.confirmed || 0}</strong>`));
  assert.equal(publicReportText.includes('test-secret'), false);
  const metadata = JSON.parse(fs.readFileSync(path.join(reportRoot, 'metadata.json'), 'utf8'));
  assert.equal(metadata.toolVersion, '1.7.1');
  assert.equal(metadata.scannerVersion, '1.7.1');
  assert.equal(metadata.mappingCatalogVersion, scan.mappingCatalogVersion);
  assert.equal(metadata.coverage, 'partial');

  lifecycle.update(saved.findings[0].fingerprint, { projectName: 'Security Lab', findingStatus: 'reviewed', reviewDecision: 'false_positive', reason: 'Compensating edge control verified.', reviewer: 'Bob Reviewer', role: 'reviewer', evidenceRefs: [saved.vaultEvidence[0].id] });
  const refreshed = await reportManager.refreshWorkflow({ projectName: 'Security Lab' });
  assert.deepEqual(refreshed, [saved.reportName]);
  const refreshedSummary = JSON.parse(fs.readFileSync(path.join(reportRoot, 'summary.json'), 'utf8'));
  const refreshedHtml = fs.readFileSync(path.join(reportRoot, 'summary.html'), 'utf8');
  const refreshedManifest = JSON.parse(fs.readFileSync(path.join(reportRoot, 'report-manifest.json'), 'utf8'));
  assert.equal(refreshedSummary.workflow.revision, 2);
  assert.equal(refreshedSummary.workflow.schemaVersion, '3.0.0');
  assert.equal(vault.read().version, 4);
  assert.equal(lifecycle.read().version, 5);
  assert.match(refreshedHtml, /Bob Reviewer/);
  assert.match(refreshedHtml, /Compensating edge control verified/);
  assert.equal(fs.existsSync(path.join(reportRoot, 'revisions')), false);
  assert.deepEqual(refreshedManifest.files.map((entry) => entry.file).sort(), ['evidence/manifest.json', 'findings.csv', 'metadata.json', 'summary.csv', 'summary.html', 'summary.json', 'summary.pdf', 'summary.xlsx', 'workflow.json']);
  for (const entry of refreshedManifest.files) {
    const file = fs.readFileSync(path.join(reportRoot, entry.file));
    const digest = crypto.createHash('sha256').update(file).digest('hex');
    assert.equal(digest, entry.sha256);
    assert.equal(file.length, entry.bytes);
    assert.equal(file.length, entry.size);
    assert.equal(entry.filename, entry.file);
    if (entry.file === 'summary.pdf') assert.equal(entry.mimeType, 'application/pdf');
  }
  for (const projection of ['executive-report.json', 'developer-report.json', 'auditor-evidence-report.json', 'legal-privacy-report.json', 'technical-appendix.json']) {
    assert.equal(fs.existsSync(path.join(reportRoot, projection)), false);
  }
  assert.equal(saved.evidenceManifestHref, `/reports/${encodeURIComponent(saved.reportName)}/evidence/manifest.json`);
  assert.equal(refreshedHtml.includes('[object Object]'), false);
  assert.doesNotMatch(refreshedHtml, /Auditor|readiness percentage|Compliance Mapping Platform/i);
  assert.match(refreshedHtml, /Technical checks completed/);
  assert.doesNotMatch(refreshedHtml, />Confirmed</);
  const pdfTextFile = path.join(reportRoot, 'summary-pdf-text.txt');
  const extracted = spawnSync('pdftotext', [path.join(reportRoot, 'summary.pdf'), pdfTextFile], { encoding: 'utf8' });
  if (!extracted.error && extracted.status === 0) {
    const pdfText = fs.readFileSync(pdfTextFile, 'utf8');
    assert.match(pdfText, /Technical Compliance\s+Pre-Assessment/);
    assert.match(pdfText, /Not determined/i);
    assert.match(pdfText, /Assessment Quality \/ Coverage/);
    assert.match(pdfText, /Findings/);
    assert.match(pdfText, /Candidate Control Mappings/);
    assert.match(pdfText, /Evidence Integrity/);
    assert.match(pdfText, new RegExp(`${refreshedSummary.findings.length} normalized finding`));
    assert.doesNotMatch(pdfText, /Report Review|Save review|Reviewer name/);
  }
});

test('Compliance cleanup leaves no scheduler, manual-upload, active-ZAP, or duplicate-report surface', () => {
  const root = process.cwd();
  const serverSource = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const appSource = fs.readFileSync(path.join(root, 'public', 'app.js'), 'utf8');
  const htmlSource = fs.readFileSync(path.join(root, 'public', 'index.html'), 'utf8');
  assert.equal(fs.existsSync(path.join(root, 'lib', 'security-schedule-manager.js')), false);
  assert.equal(fs.existsSync(path.join(root, 'reports', 'compliance-report-manager.js')), false);
  assert.doesNotMatch(serverSource, /security\/schedules|createManual|\/evidence\/\(\[\^\/\]\+\)\/review/);
  assert.doesNotMatch(appSource, /securitySchedule|securityZapApi|securityZapAuthorized|security-evidence-save|Auditor JSON/);
  assert.doesNotMatch(htmlSource, /value="active"|value="api"|Refresh this evidence map|Compliance Mapping Platform/);
  assert.match(htmlSource, /value="passive"/);
  assert.match(htmlSource, /value="authenticated-passive"/);
  assert.match(serverSource, /contentTypeForFile/);
});
