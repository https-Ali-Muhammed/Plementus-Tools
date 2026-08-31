import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { SecurityReportManager } from '../lib/security-report-manager.js';
import { createComplianceSummary, assertConservativeInvariants } from './fixtures/compliance-summary-fixture.js';

const secrets = ['SECRET_TEST_TOKEN', 'SECRET_SESSION_COOKIE', 'SECRET_PASSWORD_VALUE', 'SECRET_LOCAL_STORAGE_VALUE', 'SECRET_AUTHENTICATED_BODY', 'SECRET_SESSION_STATE'];

test('canonical assessment stays consistent across public formats and excludes restricted evidence', async (t) => {
  const reportsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase1-cross-format-'));
  t.after(() => fs.rmSync(reportsRoot, { recursive: true, force: true }));
  const previousSigningKey = process.env.SECURITY_REPORT_SIGNING_KEY;
  process.env.SECURITY_REPORT_SIGNING_KEY = 'phase1-signing-key';
  t.after(() => {
    if (previousSigningKey == null) delete process.env.SECURITY_REPORT_SIGNING_KEY;
    else process.env.SECURITY_REPORT_SIGNING_KEY = previousSigningKey;
  });

  const summary = createComplianceSummary({
    browserScan: {
      state: 'confirmed', screenshotBase64: Buffer.from('image').toString('base64'),
      resources: [{ url: 'https://example.test/api', requestHeaders: { authorization: 'Bearer SECRET_TEST_TOKEN' }, responseHeaders: { 'set-cookie': 'session=SECRET_SESSION_COOKIE' } }],
      cookies: [{ name: 'session', value: 'SECRET_SESSION_COOKIE', secure: true }],
      sessionState: { cookies: [{ name: 'session', value: 'SECRET_SESSION_STATE' }], origins: [{ origin: 'https://example.test', localStorage: [{ name: 'secret', value: 'SECRET_SESSION_STATE' }] }] },
      storage: { localStorageKeys: ['session'], sessionStorageKeys: [], localStorageValues: { session: 'SECRET_LOCAL_STORAGE_VALUE' } },
      authenticatedPages: [{ url: 'https://example.test/account', bodyText: 'SECRET_AUTHENTICATED_BODY', headers: { authorization: 'Bearer SECRET_TEST_TOKEN' }, screenshotBase64: Buffer.from('auth').toString('base64') }],
      consentScenarios: [{ scenario: 'fresh_load', screenshotBase64: Buffer.from('consent').toString('base64'), storage: { localStorageKeys: ['session'], values: ['SECRET_LOCAL_STORAGE_VALUE'] }, cookies: [{ name: 'session', value: 'SECRET_SESSION_COOKIE' }] }]
    },
    evidenceArchive: {
      metadata: { finalUrl: 'https://example.test/' },
      http: { initialResponse: { requestHeaders: { authorization: 'Bearer SECRET_TEST_TOKEN' }, rawSetCookieHeaders: ['session=SECRET_SESSION_COOKIE'], body: 'password=SECRET_PASSWORD_VALUE' } },
      browser: { resources: [{ requestHeaders: { authorization: 'Bearer SECRET_TEST_TOKEN' } }], cookies: [{ name: 'session', value: 'SECRET_SESSION_COOKIE' }], storage: { localStorage: { session: 'SECRET_LOCAL_STORAGE_VALUE' } }, authenticatedPages: [{ bodyText: 'SECRET_AUTHENTICATED_BODY' }] },
      crawl: { pages: [], errors: [] }
    }
  });
  const traceableEvidence = {
    ...summary.findings[0].evidence,
    evidenceId: 'fixture_cookie_evidence',
    artifactRefs: ['browser-cookies'],
    sourceUrls: ['https://example.test/'],
    collectionMethod: 'browser_runtime',
    collectionState: 'completed',
    observedAt: summary.generatedAt,
    confidence: 'medium',
    evidenceConfidence: 'medium',
    normalizedEvidenceStrength: 'supporting',
    limitations: ['Technical evidence is bounded.'],
    sourceCheckId: 'cookies',
    mappingIds: []
  };
  summary.findings[0].evidence = traceableEvidence;
  summary.findings[0].evidenceItems = [traceableEvidence];
  summary.controlEvaluations[0].coverageSummary = { totalEvidenceItems: 2, completedEvidenceItems: 1, partialEvidenceItems: 0, failedEvidenceItems: 1, notAssessedEvidenceItems: 0, manualReviewEvidenceItems: 0, uncertainPrerequisiteItems: 0, complete: false };
  summary.controlEvaluations[0].coverageQualifiers = ['failed_evidence_present', 'coverage_incomplete'];
  summary.controlEvaluations[0].provenanceSummary = { sourceCheckCount: 2, sourceCheckIds: ['cookies', 'runtime-cookies'], sourceMappingCount: 2, sourceMappingIds: ['fixture-static', 'fixture-runtime'], interpretation: 'provenance_breadth_not_assurance_strength' };
  const eprivacyMapping = { mappingId: 'consent-behavior:eprivacy:EPRIVACY-DIR-2002-58-ART-5(3)', framework: 'eprivacy', frameworkVersion: 'Directive 2002/58/EC as amended by Directive 2009/136/EC', controlId: 'EPRIVACY-DIR-2002-58-ART-5(3)', relationship: 'supporting', prerequisites: ['eprivacy_scope_confirmed_or_potential'], prerequisiteResults: [{ prerequisite: 'eprivacy_scope_confirmed_or_potential', state: 'requires_manual_confirmation' }], limitations: [], sourceCitation: 'https://eur-lex.europa.eu/eli/dir/2002/58/2009-12-19/eng' };
  const eprivacyControl = { controlId: eprivacyMapping.controlId, state: 'manual_review_required', controlSatisfaction: 'not_determined', coverage: 'partial', evidenceLevel: 'public_url', automatedEvidence: [{ checkId: 'consent-behavior', evidenceState: 'manual_review_required', prerequisiteOutcome: 'uncertain' }], mappings: [eprivacyMapping], linkedFindings: [summary.findings[0].id], limitations: [], manualReviewRequired: true };
  summary.frameworks.push('eprivacy');
  summary.frameworkApplicability.eprivacy = 'requires_scope_confirmation';
  summary.findings[0].controls.push(eprivacyMapping.controlId);
  summary.findings[0].controlMappings.push(eprivacyMapping);
  summary.controlEvaluations.push(eprivacyControl);
  summary.frameworkResults.push({ id: 'eprivacy', label: 'ePrivacy Directive', applicability: 'requires_scope_confirmation', applicabilityLabel: 'Scope confirmation required', scopeBasis: 'no_verified_scope_evidence', scopeConfidence: 'not_determined', scopeDecisionRequired: true, controlSatisfaction: 'not_determined', coverage: 'partial', publicEvidence: [], technicalControls: [], missingEvidence: ['Strictly-necessary exception and legal consent requirement review'], controlEvaluations: [eprivacyControl], evidenceItems: [], evidenceStatements: [], technicalEvidenceStatements: [], attentionFindings: [], note: 'ePrivacy evidence is separate from GDPR.' });
  summary.counts.controlMappings += 1;
  summary.counts.controlEvaluations += 1;
  const manager = new SecurityReportManager({
    reportsRoot,
    pdfGenerator: async ({ pdfPath }) => {
      fs.writeFileSync(pdfPath, Buffer.from('%PDF-1.4\nPhase 1 deterministic placeholder\n%%EOF\n'));
      return { durationMs: 1, method: 'phase1_test_pdf' };
    }
  });
  const saved = await manager.save(summary);
  const root = path.join(reportsRoot, saved.reportName);
  const canonical = JSON.parse(fs.readFileSync(path.join(root, 'summary.json'), 'utf8'));
  assertConservativeInvariants(assert, canonical);

  const publicFiles = ['summary.json', 'summary.html', 'findings.csv', 'summary.csv', 'metadata.json'];
  for (const file of publicFiles) {
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    for (const secret of secrets) assert.equal(content.includes(secret), false, `${file} leaked ${secret}`);
  }
  const pdf = fs.readFileSync(path.join(root, 'summary.pdf'));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.equal(fs.existsSync(path.join(root, 'summary.xlsx')), false);

  const html = fs.readFileSync(path.join(root, 'summary.html'), 'utf8');
  const findingsRows = fs.readFileSync(path.join(root, 'findings.csv'), 'utf8').trim().split(/\r?\n/).length - 1;
  const alias = fs.readFileSync(path.join(root, 'summary.csv'));
  assert.equal(findingsRows, canonical.findings.length);
  assert.deepEqual(alias, fs.readFileSync(path.join(root, 'findings.csv')));
  assert.match(html, new RegExp(`data-finding-count="${canonical.findings.length}"`));
  assert.match(html, new RegExp(`data-check-count="${canonical.counts.checks}"`));
  const csvText = fs.readFileSync(path.join(root, 'findings.csv'), 'utf8');
  assert.match(csvText, /Collection State,Evidence Confidence,Collection Method/);
  assert.match(csvText, /completed,medium,browser_runtime/);
  assert.match(csvText, /ePrivacy Directive EPRIVACY-DIR-2002-58-ART-5\(3\): supporting/);
  assert.match(html, /ePrivacy Directive EPRIVACY-DIR-2002-58-ART-5\(3\)/);
  assert.match(html, /Evidence coverage: Partial/i);
  assert.match(html, /provenance breadth, not assurance strength/i);
  assert.match(html, /Collection method: Browser Runtime/i);
  assert.ok(canonical.frameworkResults.some((framework) => framework.id === 'eprivacy' && framework.label === 'ePrivacy Directive'));
  assert.deepEqual(canonical.controlEvaluations[0].coverageQualifiers, ['failed_evidence_present', 'coverage_incomplete']);
  assert.equal(canonical.controlEvaluations[0].provenanceSummary.sourceCheckCount, 2);
  assert.equal(canonical.findings[0].evidence.collectionState, 'completed');
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'metadata.json'), 'utf8'));
  for (const field of ['assessmentType', 'complianceConclusion', 'coverage', 'mappingCatalogVersion', 'scannerVersion', 'projectName']) assert.equal(metadata[field], canonical[field], field);
  assert.equal(metadata.counts.checks, canonical.counts.checks);
  assert.equal(metadata.counts.findings, canonical.counts.findings);

  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'report-manifest.json'), 'utf8'));
  for (const entry of manifest.files) {
    const buffer = fs.readFileSync(path.join(root, entry.file));
    assert.equal(entry.bytes, buffer.length, entry.file);
    assert.equal(entry.size, buffer.length, entry.file);
    assert.equal(entry.sha256, crypto.createHash('sha256').update(buffer).digest('hex'), entry.file);
  }
  const signedPayload = { ...manifest };
  delete signedPayload.signature;
  assert.equal(manifest.signature.algorithm, 'hmac-sha256');
  assert.equal(manifest.signature.value, crypto.createHmac('sha256', 'phase1-signing-key').update(JSON.stringify(signedPayload)).digest('hex'));
  const pdfEntry = manifest.files.find((entry) => entry.file === 'summary.pdf');
  assert.equal(pdfEntry.mimeType, 'application/pdf');

  const restrictedArchive = fs.readFileSync(path.join(root, 'evidence', 'http', 'initial-response.json'), 'utf8');
  assert.ok(secrets.some((secret) => restrictedArchive.includes(secret)), 'restricted evidence fixture should retain its fake secret values');
});
