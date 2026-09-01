import assert from 'node:assert/strict';
import crypto from 'node:crypto';
import fs from 'node:fs';
import test from 'node:test';
import { assetPdfHtml, brokenLinksPdfHtml, lighthousePdfHtml } from '../lib/tool-pdf-reports.js';

function hash(relativePath) {
  return crypto.createHash('sha256').update(fs.readFileSync(new URL(relativePath, import.meta.url))).digest('hex');
}

test('Compliance print renderer retains its visual baseline while screen-only controls may evolve', () => {
  assert.equal(hash('../lib/security-report-html.js'), '4acd912096acb6bee78a9d060be74989739b5168562988fe95df95e4279d1690');
  assert.equal(hash('../lib/security-pdf.js'), '61f71d575c5b95462fadc6f40541d7cb21e863a8f54ee2161116711d41a3335d');
});

test('non-Compliance PDFs use the approved white report family and preserve tool sections', () => {
  const generatedAt = '2026-08-31T00:00:00Z';
  const lighthouse = lighthousePdfHtml({ generatedAt, overview: { projectName: 'Fixture', baseUrl: 'https://example.test', mode: 'public', categories: ['performance'], devices: ['desktop'], targetLanguage: 'en', pages: 1, validAudits: 1, failedAudits: 0, performance: 90 }, insights: { categories: [] }, rows: [] });
  const asset = assetPdfHtml({ generatedAt, projectName: 'Fixture', baseUrl: 'https://example.test', browser: { name: 'Fixture' }, device: 'desktop', summary: { pageCount: 1, breakdown: {} }, pages: [], findings: [], largestAssets: [] });
  const links = brokenLinksPdfHtml({ generatedAt, projectName: 'Fixture', baseUrl: 'https://example.test', scope: { mode: 'selected' }, summary: { pagesScanned: 1, uniqueTargets: 0 }, targets: [] });
  for (const html of [lighthouse, asset, links]) {
    assert.match(html, /@page\{size:A4 portrait/);
    assert.match(html, /DejaVu Sans/);
    assert.match(html, /#172033/);
    assert.match(html, /#5747c7/);
    assert.match(html, /#d7dce5/);
    assert.match(html, /class="cover-meta"/);
    assert.match(html, /1\. Executive Summary/);
    assert.doesNotMatch(html, /background:#11192d;color:#f7f9ff|min-height:245mm|break-after:page|dark cover/i);
  }
  assert.match(lighthouse, /Lighthouse Technical Report/);
  assert.match(lighthouse, /ISSUE and MANUAL meanings are preserved/);
  assert.match(asset, /Largest Transferred Assets/);
  assert.match(asset, /machine-detail/);
  assert.match(links, /Needs attention/);
  assert.match(links, /Healthy Inventory Summary/);
  assert.doesNotMatch(links, /health percentage|health score/i);
  for (const html of [lighthouse, asset, links]) assert.doesNotMatch(html, /Control satisfaction|Candidate mappings|Compliance conclusion/);
});
