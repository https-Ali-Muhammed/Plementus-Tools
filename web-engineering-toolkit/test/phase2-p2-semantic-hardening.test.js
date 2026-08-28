import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { buildComplianceHtml } from '../lib/security-report-html.js';
import {
  buildControlEvaluations,
  buildFindings,
  validateSummaryTraceability
} from '../lib/security-finding-model.js';
import {
  MAPPING_CATALOG_VERSION,
  SECURITY_MAPPING_REGISTRY,
  SOC2_TSC_SOURCE,
  SOC2_TSC_VERSION
} from '../lib/security-mapping-registry.js';
import {
  classifyNegativeObservation,
  normalizeCollectionMethod,
  normalizeCollectionState,
  normalizeEvidenceConfidence,
  normalizeEvidenceRecord,
  normalizeEvidenceStrength,
  normalizeTraceabilityTuple
} from '../lib/security-evidence-semantics.js';
import { EvidenceVault } from '../lib/evidence-vault.js';
import { SecurityLifecycleManager } from '../lib/security-lifecycle-manager.js';
import { normalizeLegacySummary } from '../lib/security-report-manager.js';
import { browserCookieChecks, tlsCollectionFailureChecks } from '../lib/security-scanner.js';
import { buildZapEvidenceMetadata, normalizeZapAlerts } from '../lib/zap-runner.js';

const observedAt = '2026-08-26T10:00:00.000Z';

function check(id, status = 'pass', testState = 'confirmed', extra = {}) {
  return {
    id,
    title: id,
    category: 'Phase 2.2B regression',
    status,
    severity: status === 'fail' ? 'high' : status === 'warning' ? 'medium' : 'informational',
    testState,
    confidence: testState === 'confirmed' ? 'confirmed' : testState,
    affectedUrl: 'https://example.test/',
    summary: `${id} ${status}`,
    limitations: [],
    references: [],
    ...extra
  };
}

function isoControl(checks) {
  return buildControlEvaluations(checks, [], ['iso-27001'])
    .find((control) => control.controlId === 'ISO27001:2022-A.8.24');
}

test('P2-AUD-008 preserves primary state and exposes deterministic mixed-evidence coverage qualifiers', () => {
  const cases = [
    { name: 'direct adverse plus failed', checks: [check('https', 'fail'), check('certificate', 'info', 'failed_to_test')], state: 'adverse_technical_evidence_observed', qualifiers: ['failed_evidence_present', 'coverage_incomplete'] },
    { name: 'direct adverse plus not assessed', checks: [check('https', 'fail'), check('certificate', 'manual', 'not_tested')], state: 'adverse_technical_evidence_observed', qualifiers: ['not_assessed_evidence_present', 'coverage_incomplete'] },
    { name: 'supporting positive plus failed', checks: [check('certificate'), check('tls', 'info', 'failed_to_test')], state: 'supporting_technical_evidence_observed', qualifiers: ['failed_evidence_present', 'coverage_incomplete'] },
    { name: 'supporting positive plus contextual', checks: [check('certificate'), check('hsts', 'warning')], state: 'supporting_technical_evidence_observed', qualifiers: [] },
    { name: 'manual review plus failed', checks: [check('hsts', 'manual', 'confirmed'), check('tls', 'info', 'failed_to_test')], state: 'manual_review_required', qualifiers: ['failed_evidence_present', 'manual_review_evidence_present', 'coverage_incomplete'] },
    { name: 'all failed', checks: [check('certificate', 'info', 'failed_to_test'), check('tls', 'info', 'failed_to_test')], state: 'failed_to_test', qualifiers: ['failed_evidence_present', 'coverage_incomplete'] },
    { name: 'all not assessed', checks: [check('certificate', 'manual', 'not_tested'), check('tls', 'manual', 'not_tested')], state: 'not_assessed', qualifiers: ['not_assessed_evidence_present', 'coverage_incomplete'] },
    { name: 'all completed', checks: [check('https'), check('certificate')], state: 'supporting_technical_evidence_observed', qualifiers: [] }
  ];
  for (const fixture of cases) {
    const control = isoControl(fixture.checks);
    assert.ok(control, fixture.name);
    assert.equal(control.state, fixture.state, fixture.name);
    assert.equal(control.controlSatisfaction, 'not_determined', fixture.name);
    assert.equal(control.coverage, 'partial', fixture.name);
    assert.deepEqual(control.coverageQualifiers, fixture.qualifiers, fixture.name);
    assert.equal(control.coverageSummary.totalEvidenceItems, fixture.checks.length, fixture.name);
    assert.equal(control.coverageSummary.complete, fixture.qualifiers.length === 0, fixture.name);
  }

  const contextual = buildControlEvaluations(
    [check('hsts', 'warning'), check('tls', 'info', 'failed_to_test')],
    [],
    ['pci-dss'],
    { frameworkApplicability: { 'pci-dss': 'applicable' }, paymentFlow: { testedOriginParticipatesInPaymentFlow: true } }
  ).find((control) => control.controlId === 'PCI-DSS-v4.0.1-4.2.1');
  assert.equal(contextual.state, 'contextual_evidence_observed');
  assert.deepEqual(contextual.coverageQualifiers, ['failed_evidence_present', 'coverage_incomplete']);
  assert.equal(contextual.controlSatisfaction, 'not_determined');

  const uncertain = buildControlEvaluations(
    [check('https'), check('certificate', 'info', 'failed_to_test')],
    [],
    ['gdpr'],
    { frameworkApplicability: { gdpr: 'requires_scope_confirmation' } }
  ).find((control) => control.controlId === 'GDPR-ART-32');
  assert.equal(uncertain.state, 'manual_review_required');
  assert.deepEqual(uncertain.coverageQualifiers, ['failed_evidence_present', 'uncertain_prerequisite_present', 'coverage_incomplete']);
  assert.equal(uncertain.coverageSummary.uncertainPrerequisiteItems, 2);
  assert.equal(uncertain.controlSatisfaction, 'not_determined');
});

test('P2-AUD-009 normalizes method, collection state, confidence, and strength independently', () => {
  const matrix = [
    ['http_response_header', 'confirmed', 'confirmed', 'direct_observation', 'http_response', 'completed', 'unknown', 'direct'],
    ['tls_probe', 'observed', 'medium', 'supporting_technical', 'tls_probe', 'partial', 'medium', 'supporting'],
    ['dns_lookup', 'failed_to_test', 'high', 'contextual', 'dns', 'failed_to_test', 'high', 'contextual'],
    ['headless_browser_runtime', 'confirmed', 'low', 'runtime_observation', 'browser_runtime', 'completed', 'low', 'contextual'],
    ['bounded_public_crawl', 'observed', 'high', 'policy_claim', 'crawl', 'partial', 'high', 'supporting'],
    ['bounded_authenticated_crawl', 'confirmed', 'inferred', 'contextual', 'authenticated_browser', 'completed', 'low', 'contextual'],
    ['operator_input', 'confirmed', 'asserted_not_verified', 'scope_signal', 'operator_input', 'completed', 'asserted_not_verified', 'scope_signal'],
    ['owasp_zap_alert', 'confirmed', 'High', 'supporting_technical', 'zap_passive', 'completed', 'high', 'supporting'],
    ['manual_reviewer_evidence', 'not_tested', 'unknown', 'manual_evidence', 'manual', 'not_tested', 'unknown', 'manual'],
    ['automated_scan_artifact', 'confirmed', 'confirmed', 'direct_observation', 'artifact_only', 'completed', 'unknown', 'provenance_only']
  ];
  for (const [method, state, confidence, strength, expectedMethod, expectedState, expectedConfidence, expectedStrength] of matrix) {
    const normalized = normalizeEvidenceRecord({ collectionMethod: method, testState: state, confidence, evidenceStrength: strength });
    assert.equal(normalized.collectionMethod, expectedMethod, method);
    assert.equal(normalized.collectionState, expectedState, method);
    assert.equal(normalized.evidenceConfidence, expectedConfidence, method);
    assert.equal(normalized.normalizedEvidenceStrength, expectedStrength, method);
  }
  assert.equal(normalizeCollectionState('confirmed'), 'completed');
  assert.equal(normalizeEvidenceConfidence('confirmed'), 'unknown');
  assert.equal(normalizeCollectionMethod('browser_network'), 'browser_runtime');
  assert.equal(normalizeEvidenceStrength('direct_observation', { collectionMethod: 'automated_scan_artifact' }), 'provenance_only');

  const [finding] = buildFindings([check('https', 'fail', 'confirmed')], { generatedAt: observedAt, toolVersion: '1.7.1' });
  assert.equal(finding.legacyConfidence, 'confirmed');
  assert.equal(finding.evidenceConfidence, 'unknown');
  const html = buildComplianceHtml({ projectName: 'Confidence Fixture', finalUrl: 'https://example.test/', requestedUrl: 'https://example.test/', generatedAt: observedAt, scannerVersion: '1.7.1', toolVersion: '1.7.1', mappingCatalogVersion: MAPPING_CATALOG_VERSION, schemaVersion: '2.3.0', evidenceLevel: 'public_url', findings: [finding], checks: [], testResults: [], controlEvaluations: [], frameworkResults: [], totals: { pass: 0, warning: 0, fail: 1, manual: 0, info: 0 }, counts: { checks: 0 }, paymentFlow: {}, localeCoverage: {}, gdprPublicNoticeMatrix: [], disclaimer: '' });
  assert.match(html, /Evidence confidence Unknown/i);
  assert.doesNotMatch(html, /Confidence High/i);
});

test('P2-AUD-009 keeps ZAP confidence separate from completion and artifact presence from evidence strength', (t) => {
  const zap = normalizeZapAlerts({ site: [{ alerts: [{ pluginid: '10021', confidence: 'High', alert: 'Header observation', instances: [{ uri: 'https://example.test/' }] }] }] }, { generatedAt: observedAt })[0];
  assert.equal(zap.collectionMethod, 'zap_passive');
  assert.equal(zap.collectionState, 'completed');
  assert.equal(zap.confidence, 'high');
  assert.equal(zap.legacyConfidence, 'confirmed');
  assert.equal(zap.evidence.collectionMethod, 'zap_passive');
  assert.equal(zap.evidence.collectionState, 'completed');

  const unavailable = buildZapEvidenceMetadata({ mode: 'passive', state: 'failed_to_test', collectionState: 'failed_to_test', alertCount: 0 }, 'https://example.test/', observedAt);
  assert.equal(unavailable.artifactId, 'zap-execution');
  assert.equal(unavailable.collectionState, 'failed_to_test');
  const partial = buildZapEvidenceMetadata({ mode: 'passive', state: 'observed', collectionState: 'partial', alertCount: 1, rawReport: { site: [] } }, 'https://example.test/', observedAt);
  assert.equal(partial.artifactId, 'zap-json-report');
  assert.equal(partial.collectionState, 'partial');

  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase2-p2-vault-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const vault = new EvidenceVault({ dataDir });
  const [artifact] = vault.registerScan({ projectName: 'Fixture', reportName: 'fixture', manifest: { generatedAt: observedAt, scan: { finalUrl: 'https://example.test/' }, artifacts: [{ id: 'initial-http-response', type: 'application/json', path: 'evidence/http.json', sha256: 'a'.repeat(64), bytes: 42 }] } });
  assert.equal(artifact.collectionMethod, 'artifact_only');
  assert.equal(artifact.collectionState, 'completed');
  assert.equal(artifact.evidenceStrength, 'provenance_only');
  assert.equal(artifact.semanticEvidenceStrength, 'not_applicable');
});

test('P2-AUD-010 keeps actual absence, bounded absence, not assessed, and failure separate', () => {
  const fixtures = [
    ['successful HTTP absence', { collectionState: 'completed', negativeObserved: true, boundary: 'tested_response' }, 'actual_technical_absence', 'was not observed in the tested response'],
    ['successful crawl absence', { collectionState: 'completed', negativeObserved: true, boundary: 'bounded_crawl' }, 'bounded_public_absence', 'within the bounded crawl'],
    ['not assessed consent scenario', { collectionState: 'not_tested' }, 'not_assessed', 'Not assessed'],
    ['failed HTTP request', { collectionState: 'failed_to_test' }, 'failed_to_test', 'Failed to test'],
    ['failed crawl', { collectionState: 'failed_to_test', boundary: 'bounded_crawl' }, 'failed_to_test', 'Failed to test'],
    ['failed browser runtime', { collectionState: 'failed_to_test', boundary: 'browser_runtime' }, 'failed_to_test', 'Failed to test'],
    ['failed authenticated route', { collectionState: 'failed_to_test', boundary: 'authenticated_browser' }, 'failed_to_test', 'Failed to test'],
    ['failed TLS detail collection', { collectionState: 'failed_to_test', boundary: 'tls_probe' }, 'failed_to_test', 'Failed to test'],
    ['static success plus runtime failure', { collectionState: 'partial', negativeObserved: true, boundary: 'static_html', failedSources: ['browser_runtime'] }, 'bounded_source_absence_with_failed_sources', 'static HTML'],
    ['ZAP unavailable', { collectionState: 'failed_to_test', boundary: 'zap_passive' }, 'failed_to_test', 'Failed to test'],
    ['ZAP partial result', { collectionState: 'partial', negativeObserved: false, boundary: 'zap_passive' }, 'partial_collection', 'Partial collection']
  ];
  for (const [name, input, expectedClass, wording] of fixtures) {
    const result = classifyNegativeObservation(input);
    assert.equal(result.classification, expectedClass, name);
    assert.match(result.wording, new RegExp(wording, 'i'), name);
  }

  const tlsFailures = tlsCollectionFailureChecks('https://example.test/', 'handshake probe unavailable');
  assert.equal(tlsFailures.length, 2);
  assert.ok(tlsFailures.every((item) => item.status === 'info' && item.collectionState === 'failed_to_test'));
  assert.ok(tlsFailures.every((item) => /Failed to test/i.test(item.summary) && !/was not observed/i.test(item.summary)));

  const browserFailure = browserCookieChecks([], 'https://example.test/', { available: false, state: 'failed_to_test', error: 'browser launch failed', limitations: ['Browser launch failed.'] });
  assert.equal(browserFailure.status, 'info');
  assert.equal(browserFailure.collectionState, 'failed_to_test');
  assert.match(browserFailure.summary, /Failed to test runtime cookies; no runtime-cookie absence was asserted/i);
});

test('P2-AUD-011 cookie fingerprints use stable domain/path/configuration identity', () => {
  const cookieCheck = (id, instances, url = 'https://example.test/') => check(id, 'fail', 'confirmed', { affectedUrl: url, instances });
  const instance = (extra = {}) => ({ name: 'session_id', domain: 'example.test', path: '/', hostOnly: true, category: 'session-or-auth', missing: ['Secure'], raw: 'session_id=[REDACTED]', ...extra });
  const findings = buildFindings([
    cookieCheck('cookies', [instance({ value: 'one' }), instance({ path: '/admin', value: 'one' }), instance({ domain: '.example.test', hostOnly: false }), instance({ domain: 'sub.example.test', hostOnly: false })]),
    cookieCheck('runtime-cookies', [instance({ value: 'two' })])
  ], { generatedAt: observedAt, toolVersion: '1.7.1' });
  assert.equal(findings.length, 4);
  assert.equal(findings.find((finding) => finding.cookieIdentity.path === '/' && finding.cookieIdentity.hostOnly)?.evidenceItems.length, 2);
  assert.equal(new Set(findings.map((finding) => finding.fingerprint)).size, 4);
  assert.ok(findings.every((finding) => finding.canonicalFingerprint === finding.fingerprint));
  assert.ok(findings.every((finding) => finding.legacyFingerprint));

  const repeated = buildFindings([cookieCheck('cookies', [instance({ value: 'changed' })])], { generatedAt: '2026-08-27T10:00:00.000Z', toolVersion: '1.7.1' });
  assert.equal(repeated[0].fingerprint, findings.find((finding) => finding.cookieIdentity.path === '/' && finding.cookieIdentity.hostOnly)?.fingerprint);

  const differentMissing = buildFindings([cookieCheck('cookies', [instance({ missing: ['HttpOnly'] })])], { generatedAt: observedAt, toolVersion: '1.7.1' });
  assert.notEqual(differentMissing[0].fingerprint, repeated[0].fingerprint);
});

test('P2-AUD-011 preserves an unambiguous legacy lifecycle alias without merging ambiguous cookie paths', (t) => {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase2-p2-lifecycle-'));
  t.after(() => fs.rmSync(dataDir, { recursive: true, force: true }));
  const lifecycle = new SecurityLifecycleManager({ dataDir });
  const one = buildFindings([check('cookies', 'fail', 'confirmed', { affectedUrl: 'https://example.test/', instances: [{ name: 'sid', domain: 'example.test', path: '/', hostOnly: true, category: 'session-or-auth', missing: ['Secure'], raw: 'sid=[REDACTED]' }] })], { generatedAt: observedAt, toolVersion: '1.7.1' });
  fs.writeFileSync(lifecycle.file, `${JSON.stringify({ version: 4, findings: [{ projectName: 'Fixture', fingerprint: one[0].legacyFingerprint, findingId: one[0].id, title: one[0].title, severity: one[0].severity, firstSeen: observedAt, lastSeen: observedAt, findingStatus: 'reviewed', reviewDecision: 'accepted_as_observation', reason: 'legacy review', reviewer: 'reviewer', reviews: [] }] }, null, 2)}\n`);
  const reconciled = lifecycle.reconcile({ projectName: 'Fixture', generatedAt: observedAt, findings: one });
  assert.equal(reconciled.findings[0].findingStatus, 'reviewed');
  assert.ok(lifecycle.list('Fixture')[0].legacyFingerprints.includes(one[0].legacyFingerprint));

  const twoPaths = buildFindings([check('cookies', 'fail', 'confirmed', { affectedUrl: 'https://example.test/', instances: [
    { name: 'sid', domain: 'example.test', path: '/', hostOnly: true, category: 'session-or-auth', missing: ['Secure'], raw: 'sid=[REDACTED]' },
    { name: 'sid', domain: 'example.test', path: '/admin', hostOnly: true, category: 'session-or-auth', missing: ['Secure'], raw: 'sid=[REDACTED]' }
  ] })], { generatedAt: observedAt, toolVersion: '1.7.1' });
  assert.equal(twoPaths[0].legacyFingerprint, twoPaths[1].legacyFingerprint);
  fs.writeFileSync(lifecycle.file, `${JSON.stringify({ version: 4, findings: [{ projectName: 'Fixture', fingerprint: twoPaths[0].legacyFingerprint, findingId: twoPaths[0].id, title: twoPaths[0].title, severity: twoPaths[0].severity, firstSeen: observedAt, lastSeen: observedAt, findingStatus: 'reviewed', reviewDecision: 'accepted_as_observation', reason: 'ambiguous legacy review', reviewer: 'reviewer', reviews: [] }] }, null, 2)}\n`);
  const ambiguous = lifecycle.reconcile({ projectName: 'Fixture', generatedAt: observedAt, findings: twoPaths });
  assert.equal(ambiguous.comparison.newCount, 2);
  assert.ok(ambiguous.findings.every((finding) => finding.findingStatus === 'open'));
  assert.equal(lifecycle.list('Fixture').find((record) => record.fingerprint === twoPaths[0].legacyFingerprint)?.findingStatus, 'resolved');
});

test('P2-AUD-012 presents dense mappings as provenance breadth without assurance scoring', () => {
  const controls = buildControlEvaluations([
    check('https'), check('http-to-https'), check('certificate'), check('tls'), check('hsts'), check('mixed-content'), check('cookies'), check('runtime-cookies'), check('password-transport'), check('access-control-candidates', 'manual', 'not_tested')
  ], [], ['gdpr'], { frameworkApplicability: { gdpr: 'applicable' } });
  const control = controls.find((item) => item.controlId === 'GDPR-ART-32');
  assert.equal(controls.filter((item) => item.controlId === 'GDPR-ART-32').length, 1);
  assert.equal(control.provenanceSummary.sourceCheckCount, 10);
  assert.equal(control.provenanceSummary.sourceCheckIds.length, 10);
  assert.equal(control.controlSatisfaction, 'not_determined');
  const html = buildComplianceHtml({ projectName: 'Dense Fixture', finalUrl: 'https://example.test/', requestedUrl: 'https://example.test/', generatedAt: observedAt, scannerVersion: '1.7.1', toolVersion: '1.7.1', mappingCatalogVersion: MAPPING_CATALOG_VERSION, schemaVersion: '2.3.0', evidenceLevel: 'public_url', findings: [], checks: [], testResults: [], controlEvaluations: [control], frameworkResults: [], totals: { pass: 0, warning: 0, fail: 0, manual: 0, info: 0 }, counts: { checks: 0 }, paymentFlow: {}, localeCoverage: {}, gdprPublicNoticeMatrix: [], disclaimer: '' });
  assert.match(html, /10 technical observations/);
  assert.match(html, /provenance breadth/i);
  assert.doesNotMatch(html, /confidence score|mapping score|readiness percentage|partially compliant/i);
});

test('P2-AUD-013 pins every SOC 2 mapping to the exact official edition and citation', () => {
  const mappings = SECURITY_MAPPING_REGISTRY.filter((mapping) => mapping.framework === 'soc-2');
  assert.equal(mappings.length, 14);
  assert.equal(SOC2_TSC_VERSION, '2017 Trust Services Criteria (With Revised Points of Focus — 2022)');
  assert.equal(SOC2_TSC_SOURCE, 'https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022');
  assert.match(MAPPING_CATALOG_VERSION, /^2026\.08\.26\.[2-9]\d*$/);
  for (const mapping of mappings) {
    assert.equal(mapping.frameworkVersion, SOC2_TSC_VERSION, mapping.mappingId);
    assert.equal(mapping.sourceCitation, SOC2_TSC_SOURCE, mapping.mappingId);
    assert.match(mapping.controlId, /^SOC2-CC\d+\.\d+$/, mapping.mappingId);
  }
});

test('P2-AUD-014 carries a safe traceability tuple through findings, controls, and statements', () => {
  const evidenceItems = [
    { evidenceId: 'http_header_1', artifactId: 'initial-http-response', sourceUrl: 'https://example.test/account', collectionMethod: 'http_response_header', collectionState: 'completed', observedAt, confidence: 'high', evidenceStrength: 'direct_observation', evidenceText: 'CSP header absent', limitations: ['Tested response only.'] },
    { evidenceId: 'browser_1', artifactRefs: ['browser-network'], sourceUrl: 'https://example.test/checkout', collectionMethod: 'headless_browser_runtime', collectionState: 'partial', observedAt, confidence: 'medium', evidenceStrength: 'supporting_technical', evidenceText: 'Runtime request observed', limitations: ['Bounded route.'] }
  ];
  const checks = [check('https', 'fail', 'confirmed', { affectedUrl: 'https://example.test/account', evidenceItems })];
  const findings = buildFindings(checks, { generatedAt: observedAt, toolVersion: '1.7.1', frameworks: ['iso-27001'], defaultSourceUrl: 'https://example.test/' });
  const controls = buildControlEvaluations(checks, findings, ['iso-27001']);
  const statements = [{ statementId: 'statement_iso_https', statement: 'HTTPS observation', evidenceRefs: ['http_header_1'], sourceCheckId: 'https', mappingIds: controls[0].mappings.map((mapping) => mapping.mappingId), artifactRefs: ['initial-http-response'], sourceUrls: ['https://example.test/account'], collectionMethod: 'http_response', collectionState: 'completed', observedAt, confidence: 'high', evidenceStrength: 'direct', limitations: ['Tested response only.'] }];
  const summary = { findings, controlEvaluations: controls, frameworkResults: [{ evidenceItems: findings[0].evidenceItems, evidenceStatements: statements, technicalEvidenceStatements: [] }] };
  const validation = validateSummaryTraceability(summary, { artifacts: [{ id: 'initial-http-response' }, { id: 'browser-network' }] });
  assert.deepEqual(validation, { valid: true, errors: [] });
  const tuple = findings[0].evidenceItems[0];
  for (const key of ['evidenceId', 'sourceUrl', 'artifactRefs', 'collectionMethod', 'collectionState', 'observedAt', 'confidence', 'evidenceStrength', 'limitations', 'sourceCheckId', 'mappingIds']) assert.ok(Object.hasOwn(tuple, key), key);
  assert.equal(tuple.sourceUrl, 'https://example.test/account');
  assert.equal(tuple.artifactRefs.includes('initial-http-response'), true);
  assert.equal(tuple.artifactRefs.some((ref) => ref.includes('+')), false);

  const invalid = validateSummaryTraceability({ ...summary, findings: [{ ...findings[0], evidenceItems: [{ ...tuple, artifactRefs: ['missing-artifact'] }] }] }, { artifacts: [{ id: 'initial-http-response' }] });
  assert.equal(invalid.valid, false);
  assert.match(invalid.errors.join(' '), /unresolved artifact reference missing-artifact/);

  const failedZap = validateSummaryTraceability({ findings: [], controlEvaluations: [], frameworkResults: [], testResults: [{ id: 'owasp-zap', evidence: { evidenceId: 'zap_failed', artifactId: 'zap-json-report', artifactRefs: ['zap-json-report'], sourceUrl: 'https://example.test/', collectionMethod: 'zap_passive', collectionState: 'failed_to_test', observedAt, confidence: 'unknown', evidenceStrength: 'provenance_only', limitations: [], sourceCheckId: 'owasp-zap', mappingIds: [] } }] }, { artifacts: [] });
  assert.equal(failedZap.valid, false);
  assert.match(failedZap.errors.join(' '), /unresolved artifact reference zap-json-report/);
});

test('P2-AUD-014 applies evidence-class traceability requirements without inventing artifacts', () => {
  const cases = [
    ['HTTP', 'http_response_header', 'https://example.test/account', 'initial-http-response'],
    ['TLS', 'tls_probe', 'https://example.test/', 'tls-snapshot'],
    ['browser runtime', 'headless_browser_runtime', 'https://example.test/checkout', 'browser-network'],
    ['crawl', 'bounded_public_crawl', 'https://example.test/privacy', 'crawl-pages'],
    ['policy page', 'bounded_public_crawl', 'https://example.test/legal/privacy', 'policy-document'],
    ['authenticated evidence', 'bounded_authenticated_crawl', 'https://example.test/account/orders', 'authenticated-pages'],
    ['payment evidence', 'browser_network', 'https://example.test/checkout/payment', 'payment-network'],
    ['passive ZAP', 'owasp_zap_alert', 'https://example.test/api', 'zap-json-report']
  ];
  const evidenceItems = cases.map(([name, method, sourceUrl, artifactId], index) => normalizeTraceabilityTuple({
    evidenceId: `trace_${index}`,
    artifactRefs: [artifactId],
    sourceUrl,
    collectionMethod: method,
    collectionState: name === 'passive ZAP' ? 'partial' : 'completed',
    observedAt,
    confidence: name === 'passive ZAP' ? 'medium' : 'unknown',
    evidenceStrength: name === 'HTTP' ? 'direct_observation' : 'supporting_technical',
    limitations: [`${name} fixture boundary.`]
  }, { sourceCheckId: `check-${index}`, mappingIds: [`mapping-${index}`] }));
  evidenceItems.push(
    normalizeTraceabilityTuple({ evidenceId: 'operator_1', collectionMethod: 'operator_input', collectionState: 'completed', observedAt, confidence: 'asserted_not_verified', evidenceStrength: 'scope_signal', limitations: ['Operator assertion.'] }, { sourceCheckId: 'operator-input', mappingIds: [] }),
    normalizeTraceabilityTuple({ evidenceId: 'manual_1', collectionMethod: 'manual_reviewer_evidence', collectionState: 'not_tested', observedAt, confidence: 'unknown', evidenceStrength: 'manual_evidence', limitations: ['Reviewer evidence not supplied.'] }, { sourceCheckId: 'manual-review', mappingIds: [] })
  );
  const artifacts = cases.map(([, , , id]) => ({ id }));
  const validation = validateSummaryTraceability({ findings: [], controlEvaluations: [], frameworkResults: [{ evidenceItems }] }, { artifacts });
  assert.deepEqual(validation, { valid: true, errors: [] });
  for (const item of evidenceItems) {
    for (const key of ['evidenceId', 'artifactRefs', 'collectionMethod', 'collectionState', 'observedAt', 'confidence', 'evidenceStrength', 'limitations', 'sourceCheckId', 'mappingIds']) assert.ok(Object.hasOwn(item, key), `${item.evidenceId}: ${key}`);
    assert.equal(JSON.stringify(item).includes('Authorization'), false);
    assert.equal(item.artifactRefs.some((ref) => ref.includes('+')), false);
  }
  assert.equal(evidenceItems.find((item) => item.evidenceId === 'trace_4').sourceUrl, 'https://example.test/legal/privacy');
  assert.equal(evidenceItems.find((item) => item.evidenceId === 'trace_6').sourceUrl, 'https://example.test/checkout/payment');
  assert.deepEqual(evidenceItems.find((item) => item.evidenceId === 'operator_1').artifactRefs, []);
  assert.deepEqual(evidenceItems.find((item) => item.evidenceId === 'manual_1').artifactRefs, []);
});

test('legacy reports gain conservative read-time defaults without rewriting stored semantics', () => {
  const legacy = {
    schemaVersion: '2.2.0',
    mappingCatalogVersion: '2026.08.26.1',
    assessmentType: 'compliance_pre_assessment',
    findings: [{ id: 'legacy-finding', fingerprint: 'old-cookie-fingerprint', confidence: 'confirmed', evidence: { artifactId: 'legacy-http', sourceMethod: 'http_response_header', testState: 'confirmed', confidence: 'confirmed', evidenceStrength: 'direct_observation' } }],
    testResults: [{ id: 'legacy-test', state: 'confirmed', confidence: 'confirmed', testMethod: 'HTTP response headers' }],
    controlEvaluations: [{ controlId: 'SOC2-CC6.1', state: 'partial_technical_evidence_observed', controlSatisfaction: 'not_determined', coverage: 'partial', automatedEvidence: [], mappings: [{ frameworkVersion: 'Trust Services Criteria', sourceCitation: 'https://www.aicpa-cima.com/topic/audit-assurance/audit-and-assurance-greater-than-soc-2' }] }],
    frameworkResults: []
  };
  const snapshot = structuredClone(legacy);
  const normalized = normalizeLegacySummary(legacy);
  assert.deepEqual(legacy, snapshot, 'read-time normalization must not mutate the stored report');
  assert.equal(normalized.schemaVersion, '2.2.0');
  assert.equal(normalized.mappingCatalogVersion, '2026.08.26.1');
  assert.equal(normalized.controlEvaluations[0].mappings[0].frameworkVersion, 'Trust Services Criteria');
  assert.equal(normalized.controlEvaluations[0].mappings[0].sourceCitation, snapshot.controlEvaluations[0].mappings[0].sourceCitation);
  assert.equal(normalized.findings[0].fingerprint, 'old-cookie-fingerprint');
  assert.equal(normalized.findings[0].evidenceItems[0].artifactId, 'legacy-http');
  assert.equal(normalized.findings[0].evidenceItems[0].collectionState, 'completed');
  assert.equal(normalized.findings[0].evidenceItems[0].evidenceConfidence, 'unknown');
  assert.equal(normalized.findings[0].evidenceItems[0].normalizedEvidenceStrength, 'direct');
  assert.equal(normalized.testResults[0].collectionState, 'completed');
  assert.equal(normalized.testResults[0].evidenceConfidence, 'unknown');
});

test('Phase 2.2B invariants remain explicit during the P3 governance layer', () => {
  const source = [
    fs.readFileSync(new URL('../lib/security-finding-model.js', import.meta.url), 'utf8'),
    fs.readFileSync(new URL('../lib/security-scanner.js', import.meta.url), 'utf8')
  ].join('\n');
  assert.doesNotMatch(source, /compliancePercentage|readinessPercentage|controlSatisfaction:\s*['"](?:compliant|passed|failed)/i);
  const control = isoControl([check('https', 'fail'), check('certificate', 'info', 'failed_to_test')]);
  assert.equal(control.controlSatisfaction, 'not_determined');
  assert.equal(control.coverage, 'partial');
  assert.equal(control.manualReviewRequired, true);
});
