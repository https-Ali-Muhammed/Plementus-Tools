import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { browserSkipReason, detectBrowserCapabilities } from '../lib/browser-capability.js';
import { generateCompliancePdf } from '../lib/security-pdf.js';
import { buildComplianceHtml } from '../lib/security-report-html.js';
import { SecurityReportManager } from '../lib/security-report-manager.js';
import { createComplianceSummary } from './fixtures/compliance-summary-fixture.js';

const generatedAt = '2026-08-25T12:00:00.000Z';
const longMachineUrl = 'https://example.test/very-long-path-with-hyphens?x=1&y=2';

function mapping(controlId, evidenceCount, marker = '') {
  return {
    controlId,
    state: 'supporting_technical_evidence_observed',
    controlSatisfaction: 'not_determined',
    coverage: 'partial',
    linkedFindings: marker ? [marker] : [],
    automatedEvidence: Array.from({ length: evidenceCount }, (_, index) => ({
      checkId: `${controlId}-evidence-${String(index + 1).padStart(3, '0')}`,
      evidenceState: 'supporting_technical_evidence_observed'
    })),
    limitations: evidenceCount > 8 ? Array.from({ length: Math.ceil(evidenceCount / 12) }, (_, index) => `Bounded limitation ${index + 1} for ${controlId}; qualified review remains required.`) : [],
    mappings: [{ framework: 'iso-27001', frameworkVersion: '2022', relationship: 'supporting', sourceCitation: `https://example.test/citations/${encodeURIComponent(controlId)}`, prerequisiteResults: [] }]
  };
}

function fixtureSummary() {
  const longEvidence = `${longMachineUrl} · COOKIE_TRACKING_SECURE_MISSING · ` + Array.from({ length: 85 }, (_, index) => `https://example.test/evidence/path-${index + 1}?source=G-3FKJ4RP8QB&policy=strict-origin-when-cross-origin`).join(' · ');
  const eprivacy = mapping('EPRIVACY-DIR-2002-58-ART-5(3)', 1);
  eprivacy.mappings = [{ framework: 'gdpr', frameworkVersion: 'Directive 2002/58/EC', relationship: 'direct', sourceCitation: 'https://eur-lex.europa.eu/eli/dir/2002/58/oj', prerequisiteResults: [] }];
  const soc2 = mapping('SOC2-CC6.7', 5);
  soc2.manualReviewReasons = ['organizational_evidence_required'];
  soc2.mappings = [{ mappingId: 'SOC2-CC6.7-FIXTURE', framework: 'soc-2', frameworkVersion: '2017 Trust Services Criteria (With Revised Points of Focus — 2022)', sourceVersion: '2017 Trust Services Criteria (With Revised Points of Focus — 2022)', relationship: 'supporting', sourceCitation: 'https://www.aicpa-cima.com/resources/download/2017-trust-services-criteria-with-revised-points-of-focus-2022', rationale: 'The technical observation is relevant to a narrow aspect of the candidate criterion but does not establish control satisfaction.', reviewStatus: 'internal_review_required', lastReviewedAt: '2026-08-26', reviewedBy: 'toolkit_mapping_governance', changeReason: 'Governance metadata added during Phase 2.2C.', approvedBy: null, prerequisiteResults: [] }];
  return {
    projectName: 'Deterministic Pagination Fixture',
    requestedUrl: 'https://elmoosa-pre.odoo.com/en',
    finalUrl: 'https://elmoosa-pre.odoo.com/en',
    environment: 'fixture',
    generatedAt,
    toolVersion: '1.7.1',
    scannerVersion: '1.7.1',
    mappingCatalogVersion: 'fixture',
    schemaVersion: '2.2.0',
    assessmentType: 'compliance_pre_assessment',
    complianceConclusion: 'not_determined',
    coverage: 'partial',
    evidenceLevel: 'public_url',
    counts: { checks: 1, observations: 1 },
    checks: [],
    testResults: [{ state: 'observed' }],
    findings: [{
      id: 'FINDING_TAIL_FIXTURE', fingerprint: 'f'.repeat(64), title: 'Long finding near a natural page boundary', severity: 'medium', confidence: 'observed', category: 'Pagination', affectedUrl: 'https://elmoosa-pre.odoo.com/en',
      description: `A bounded observation with enough content to exercise natural finding flow. ${longEvidence}`,
      evidence: { raw: longEvidence }, recommendation: 'Review the complete evidence without treating this as a compliance conclusion.',
      limitations: ['FINDING-TAIL-LIMITATION-MARKER'], testMethod: 'FINDING-TAIL-METHOD-MARKER', controlMappings: []
    }],
    frameworkResults: [],
    controlEvaluations: [
      mapping('ISO27001:TEST-SMALL-1', 1),
      mapping('ISO27001:TEST-SMALL-2', 1),
      mapping('ISO27001:TEST-MEDIUM-1', 7),
      mapping('ISO27001:TEST-MEDIUM-2', 7),
      mapping('ISO27001:TEST-LARGE', 150, 'LARGE-END-MARKER'),
      mapping('ISO27001:TEST-SMALL-3', 1),
      soc2,
      eprivacy
    ],
    policyDocumentQuality: [],
    localeCoverage: { state: 'single_locale_observed', contentLocalesDiscovered: ['en'], availableLocales: ['en'], policyLocalesTested: [], languageSignals: ['en', 'en-US'] },
    paymentFlow: {},
    gdprPublicNoticeMatrix: [],
    evidenceManifest: { artifacts: [{ id: 'fixture-hash', type: 'application/json', bytes: 64, sha256: 'b'.repeat(64), sensitive: false }] },
    workflow: { findingDecisions: [] },
    disclaimer: 'Fixture disclaimer. Technical evidence remains bounded and no compliance conclusion is produced.'
  };
}

function pageFor(pages, marker) {
  return pages.findIndex((page) => page.includes(marker));
}

function bboxPageUtilization(xml) {
  return [...xml.matchAll(/<page\b[^>]*height="([\d.]+)"[^>]*>([\s\S]*?)<\/page>/g)].map((pageMatch) => {
    const height = Number(pageMatch[1]);
    const words = [...pageMatch[2].matchAll(/<word\b[^>]*yMin="([\d.]+)"[^>]*yMax="([\d.]+)"[^>]*>([\s\S]*?)<\/word>/g)]
      .map((match) => ({ yMin: Number(match[1]), yMax: Number(match[2]), text: match[3].replace(/<[^>]+>/g, '') }))
      .filter((word) => word.yMin > 45 && word.yMax < height - 45);
    const contentTop = words.length ? Math.min(...words.map((word) => word.yMin)) : 0;
    const contentBottom = words.length ? Math.max(...words.map((word) => word.yMax)) : 0;
    return { text: words.map((word) => word.text).join(' '), utilization: words.length ? (contentBottom - contentTop) / (height - 90) : 0 };
  });
}

test('Chromium print flow packs mappings, splits large mappings, and keeps finding tails readable', { timeout: 30_000 }, async (t) => {
  if (spawnSync('pdftotext', ['-v'], { encoding: 'utf8' }).error) return t.skip('pdftotext is unavailable');
  const capability = await detectBrowserCapabilities();
  const capabilityReason = browserSkipReason(capability, 'pdf');
  if (capabilityReason) return t.skip(capabilityReason);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'compliance-pagination-fixture-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const summary = fixtureSummary();
  const htmlPath = path.join(root, 'summary.html');
  const pdfPath = path.join(root, 'summary.pdf');
  const textPath = path.join(root, 'summary.txt');
  const rawTextPath = path.join(root, 'summary-raw.txt');
  const bboxPath = path.join(root, 'summary-bbox.html');
  const html = buildComplianceHtml(summary);
  fs.writeFileSync(htmlPath, html);

  assert.doesNotMatch(html, /class="mapping-card avoid-break"|print-section-break/);
  assert.match(html, /\.mapping-card\{break-inside:auto;page-break-inside:auto\}/);
  await generateCompliancePdf({ htmlPath, pdfPath, summary });
  assert.equal(fs.readFileSync(pdfPath).subarray(0, 5).toString(), '%PDF-');
  const extracted = spawnSync('pdftotext', ['-layout', pdfPath, textPath], { encoding: 'utf8' });
  assert.equal(extracted.status, 0, extracted.stderr);
  const rawExtracted = spawnSync('pdftotext', ['-raw', pdfPath, rawTextPath], { encoding: 'utf8' });
  assert.equal(rawExtracted.status, 0, rawExtracted.stderr);
  const bbox = spawnSync('pdftotext', ['-bbox-layout', pdfPath, bboxPath], { encoding: 'utf8' });
  assert.equal(bbox.status, 0, bbox.stderr);
  const pdfText = fs.readFileSync(textPath, 'utf8');
  const rawPdfText = fs.readFileSync(rawTextPath, 'utf8');
  const pages = pdfText.split('\f').filter((page) => page.trim());

  const smallOnePage = pageFor(pages, 'ISO27001:TEST-SMALL-1');
  assert.equal(smallOnePage, pageFor(pages, 'ISO27001:TEST-SMALL-2'), 'small mappings should share a page');
  const mediumOnePage = pageFor(pages, 'ISO27001:TEST-MEDIUM-1');
  const mediumTwoPage = pageFor(pages, 'ISO27001:TEST-MEDIUM-2');
  assert.ok(Math.abs(mediumOnePage - mediumTwoPage) <= 1, 'medium mappings should follow natural adjacent flow');
  const largeHeaderPage = pageFor(pages, 'ISO27001:TEST-LARGE');
  const largeEndPage = pageFor(pages, 'LARGE-END-MARKER');
  assert.ok(largeEndPage > largeHeaderPage, 'the large mapping should split across pages');
  assert.ok(pageFor(pages, 'ISO27001:TEST-SMALL-3') <= largeEndPage + 1, 'the small mapping after a large mapping should resume natural flow');
  assert.equal(pageFor(pages, 'FINDING-TAIL-LIMITATION-MARKER'), pageFor(pages, 'FINDING-TAIL-METHOD-MARKER'), 'finding tail fields should stay together');

  const mappingPages = pages.filter((page) => /ISO27001:TEST-(?:SMALL|MEDIUM|LARGE)/.test(page) || page.includes('LARGE-END-MARKER'));
  assert.ok(mappingPages.some((page) => (page.match(/ISO27001:TEST-/g) || []).length >= 2), 'at least one mapping page must contain multiple cards');
  assert.equal(mappingPages.filter((page) => page.replace(/\s+/g, '').length < 450).length, 0, 'no internal mapping page should be pathologically sparse');
  const bboxMappings = bboxPageUtilization(fs.readFileSync(bboxPath, 'utf8')).filter((page) => /ISO27001:TEST-(?:SMALL|MEDIUM|LARGE)|LARGE-END-MARKER/.test(page.text));
  assert.equal(bboxMappings.filter((page) => page.utilization < 0.45).length, 0, 'mapping pages should use at least 45% of printable height in this deterministic mixed fixture');

  const lineWrapNormalizedText = rawPdfText.replace(/\r?\n/g, '');
  for (const exact of ['https://elmoosa-pre.odoo.com/en', longMachineUrl, 'strict-origin-when-cross-origin', 'EPRIVACY-DIR-2002-58-ART-5(3)', 'G-3FKJ4RP8QB', 'COOKIE_TRACKING_SECURE_MISSING', 'b'.repeat(64)]) {
    assert.ok(rawPdfText.includes(exact) || lineWrapNormalizedText.includes(exact), `PDF extraction changed machine string: ${exact}`);
  }
  assert.doesNotMatch(pdfText, /[\u00ad\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff\ufffd]/);
  assert.match(pdfText, /Compliance conclusion:\s*Not determined/i);
  assert.match(pdfText, /Coverage:\s*Partial/i);
  assert.match(pdfText, /ePrivacy Directive/);
  assert.match(pdfText, /provenance breadth, not assurance strength/i);
  assert.match(pdfText, /Evidence coverage:\s*Partial/i);
  assert.match(pdfText, /Mapping relationships/i);
  assert.match(pdfText, /No relationship type determines control satisfaction or compliance/i);
  assert.match(pdfText, /Human review required/i);
  assert.match(pdfText, /toolkit_mapping_governance/i);
  assert.match(rawPdfText.replace(/\r?\n/g, ''), /2017-trust-services-criteria-with-revised-points-of-focus-2022/i);
});

test('native PDF projection excludes restricted browser and consent values', { timeout: 30_000 }, async (t) => {
  if (spawnSync('pdftotext', ['-v'], { encoding: 'utf8' }).error) return t.skip('pdftotext is unavailable');
  const capability = await detectBrowserCapabilities();
  const capabilityReason = browserSkipReason(capability, 'pdf');
  if (capabilityReason) return t.skip(capabilityReason);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'compliance-pdf-redaction-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const secretValues = ['SECRET_PDF_TOKEN', 'SECRET_PDF_COOKIE', 'SECRET_PDF_STORAGE', 'SECRET_PDF_BODY', 'SECRET_PDF_SESSION_STATE'];
  const summary = createComplianceSummary();
  summary.browserScan = {
    state: 'confirmed',
    networkCollection: { state: 'completed', recordsCaptured: 1, recordLimit: 25, limitations: [] },
    resources: [{ url: 'https://example.test/api', sourcePageUrl: 'https://example.test/', destinationHost: 'example.test', requestHeaders: { authorization: 'Bearer SECRET_PDF_TOKEN' }, responseHeaders: { 'set-cookie': 'session=SECRET_PDF_COOKIE' }, requestBody: 'SECRET_PDF_BODY' }],
    apiObservations: [{ url: 'https://api.example.test/v1', method: 'GET', status: 200, sourcePageUrl: 'https://example.test/', destinationHost: 'api.example.test', destinationOrigin: 'https://api.example.test', category: 'fetch', requestBody: 'SECRET_PDF_BODY' }],
    cookies: [{ name: 'session', value: 'SECRET_PDF_COOKIE', secure: true }],
    sessionState: { cookies: [{ name: 'session', value: 'SECRET_PDF_SESSION_STATE' }], origins: [] },
    storage: { localStorageKeys: ['session'], sessionStorageKeys: [], values: ['SECRET_PDF_STORAGE'] },
    authenticatedPages: [{ url: 'https://example.test/account', bodyText: 'SECRET_PDF_BODY' }],
    consentScenarios: [{ scenario: 'fresh_load', cookies: [{ name: 'session', value: 'SECRET_PDF_COOKIE' }], storage: { localStorageKeys: ['consent'], values: ['SECRET_PDF_STORAGE'] } }]
  };
  const saved = await new SecurityReportManager({ reportsRoot: root, browserPath: capability.browser.path }).save(summary);
  const reportRoot = path.join(root, saved.reportName);
  const textPath = path.join(root, 'redaction.txt');
  const extracted = spawnSync('pdftotext', ['-raw', path.join(reportRoot, 'summary.pdf'), textPath], { encoding: 'utf8' });
  assert.equal(extracted.status, 0, extracted.stderr);
  const pdfText = fs.readFileSync(textPath, 'utf8');
  for (const secret of secretValues) assert.equal(pdfText.includes(secret), false, `summary.pdf leaked ${secret}`);
  assert.match(pdfText, /Runtime network \/ API evidence/i);
  assert.match(pdfText, /api\.example\.test/);
  assert.match(pdfText, /Passive\s+metadata\s+only/i);
  assert.equal(saved.complianceConclusion, 'not_determined');
  assert.equal(saved.coverage, 'partial');
});

test('GDPR-heavy report and large evidence table flow without empty internal pages', { timeout: 30_000 }, async (t) => {
  if (spawnSync('pdftotext', ['-v'], { encoding: 'utf8' }).error) return t.skip('pdftotext is unavailable');
  const capability = await detectBrowserCapabilities();
  const capabilityReason = browserSkipReason(capability, 'pdf');
  if (capabilityReason) return t.skip(capabilityReason);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'compliance-pdf-gdpr-evidence-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const elements = ['controller_identity', 'controller_contact', 'dpo_contact', 'processing_purposes', 'legal_bases', 'legitimate_interests', 'recipients', 'international_transfers', 'retention', 'data_subject_rights', 'complaint_right', 'data_source', 'automated_decision_making', 'statutory_contractual_requirement', 'withdrawal_right'];
  const artifacts = Array.from({ length: 42 }, (_, index) => ({ id: `artifact-${String(index + 1).padStart(3, '0')}`, type: index % 2 ? 'application/json' : 'image/png', bytes: 1024 + index, sha256: index.toString(16).padStart(64, '0'), sensitive: index % 5 === 0 }));
  const summary = createComplianceSummary({
    projectName: 'GDPR and Evidence Pagination Fixture',
    frameworks: ['gdpr'],
    frameworkApplicability: { gdpr: 'unknown' },
    gdprPublicNoticeMatrix: elements.map((element) => ({ element, state: 'not_assessed', confidence: 'not_assessed', evidenceItems: [] })),
    gdprPublicNoticeAggregate: 'not_assessed',
    evidenceManifest: { artifactCount: artifacts.length, artifacts }
  });
  const html = buildComplianceHtml(summary);
  assert.match(html, /gdpr-compact-print print-only/);
  assert.match(html, /notice-grid print-hide/);
  const htmlPath = path.join(root, 'summary.html');
  const pdfPath = path.join(root, 'summary.pdf');
  const textPath = path.join(root, 'summary.txt');
  fs.writeFileSync(htmlPath, html);
  await generateCompliancePdf({ htmlPath, pdfPath, summary, browserPath: capability.browser.path });
  const extracted = spawnSync('pdftotext', ['-layout', pdfPath, textPath], { encoding: 'utf8' });
  assert.equal(extracted.status, 0, extracted.stderr);
  const pdfText = fs.readFileSync(textPath, 'utf8');
  const pages = pdfText.split('\f').filter((page) => page.trim());
  assert.ok(pages.length >= 3, 'large evidence fixture should exercise multi-page flow');
  assert.equal(pages.slice(1, -1).some((page) => page.replace(/\s+/g, '').length < 100), false, 'no internal page should be empty or nearly empty');
  assert.match(pdfText, /Controller identity\s+Not assessed/i);
  assert.equal((pdfText.match(/No applicable public-notice assessment was performed\./g) || []).length, 1);
  assert.match(pdfText, /artifact-001/);
  assert.match(pdfText, /artifact-042/);
  assert.match(pdfText, new RegExp(artifacts.at(-1).sha256));
});
