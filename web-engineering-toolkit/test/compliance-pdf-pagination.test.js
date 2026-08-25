import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawnSync } from 'node:child_process';
import test from 'node:test';
import { generateCompliancePdf } from '../lib/security-pdf.js';
import { buildComplianceHtml } from '../lib/security-report-html.js';

const generatedAt = '2026-08-25T12:00:00.000Z';

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
  const longEvidence = Array.from({ length: 85 }, (_, index) => `https://example.test/evidence/path-${index + 1}?source=G-3FKJ4RP8QB&policy=strict-origin-when-cross-origin`).join(' · ');
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
      mapping('ISO27001:TEST-SMALL-3', 1)
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
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'compliance-pagination-fixture-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const summary = fixtureSummary();
  const htmlPath = path.join(root, 'summary.html');
  const pdfPath = path.join(root, 'summary.pdf');
  const textPath = path.join(root, 'summary.txt');
  const bboxPath = path.join(root, 'summary-bbox.html');
  const html = buildComplianceHtml(summary);
  fs.writeFileSync(htmlPath, html);

  assert.doesNotMatch(html, /class="mapping-card avoid-break"|print-section-break/);
  assert.match(html, /\.mapping-card\{break-inside:auto;page-break-inside:auto\}/);
  await generateCompliancePdf({ htmlPath, pdfPath, summary });
  assert.equal(fs.readFileSync(pdfPath).subarray(0, 5).toString(), '%PDF-');
  const extracted = spawnSync('pdftotext', ['-layout', pdfPath, textPath], { encoding: 'utf8' });
  assert.equal(extracted.status, 0, extracted.stderr);
  const bbox = spawnSync('pdftotext', ['-bbox-layout', pdfPath, bboxPath], { encoding: 'utf8' });
  assert.equal(bbox.status, 0, bbox.stderr);
  const pdfText = fs.readFileSync(textPath, 'utf8');
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

  const compactText = pdfText.replace(/\s+/g, '');
  assert.match(compactText, /https:\/\/elmoosa-pre\.odoo\.com\/en/);
  assert.match(compactText, /strict-origin-when-cross-origin/);
  assert.match(compactText, /G-3FKJ4RP8QB/);
  assert.match(compactText, new RegExp('b'.repeat(64)));
  assert.doesNotMatch(pdfText, /[\u00ad\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff\ufffd]/);
  assert.match(pdfText, /Compliance conclusion:\s*Not determined/i);
  assert.match(pdfText, /Coverage:\s*Partial/i);
});
