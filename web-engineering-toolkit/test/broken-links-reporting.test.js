import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { pathToFileURL } from 'node:url';
import { chromium } from 'playwright-core';
import { detectBrowserCapabilities } from '../lib/browser-capability.js';
import { BrokenLinksReportManager } from '../lib/broken-links-report-manager.js';
import { ReportManager } from '../lib/report-manager.js';
import { createBrokenLinksPresentationFixture } from './fixtures/broken-links-presentation-fixture.js';

function fixtureResult() {
  const generatedAt = '2026-08-29T12:00:00.000Z';
  const occurrence = { sourcePageUrl: 'https://example.test/', targetUrl: 'https://example.test/missing?token=%5BREDACTED%5D', referenceType: 'link', attribute: 'href', linkText: '=HYPERLINK("bad")', fragment: '' };
  return {
    schemaVersion: '1.0.0', reportType: 'broken-links-resources', projectName: 'Links Fixture', baseUrl: 'https://example.test', generatedAt, durationMs: 321,
    browser: { name: 'Fixture Browser', path: '/fixture/browser', version: '1' },
    scope: { mode: 'selected', startingPages: ['https://example.test/'], checkExternal: true, checkFragments: true, checkResources: true, ignorePatternCount: 0 },
    limits: { maxPages: 25, maxTargets: 2000, timeoutMs: 10000, concurrency: 6, perHostConcurrency: 2, maxRedirects: 8, pageLimitReached: false, targetLimitReached: false, runtimeLimitReached: false },
    summary: { pagesScanned: 1, uniqueTargets: 3, occurrences: 3, healthy: 1, broken: 1, httpBroken: 1, fragmentMissing: 0, redirected: 1, unavailable: 1, externalTargets: 0, skipped: 0 },
    pages: [{ requestedUrl: 'https://example.test/', finalUrl: 'https://example.test/', title: '<script>alert(1)</script>', status: 200, durationMs: 100, referenceCount: 3, error: '' }],
    targets: [
      { targetUrl: occurrence.targetUrl, referenceType: 'link', referenceTypes: ['link'], internal: true, outcome: 'broken', httpStatus: 404, finalUrl: occurrence.targetUrl, redirectCount: 0, redirectChain: [], checkMethod: 'head', failureReason: '=1+1', fragment: '', networkTarget: true, occurrenceCount: 1, sourcePages: [occurrence.sourcePageUrl], occurrences: [occurrence] },
      { targetUrl: 'https://example.test/redirect', referenceType: 'link', referenceTypes: ['link'], internal: true, outcome: 'redirected', httpStatus: 200, finalUrl: 'https://example.test/healthy', redirectCount: 1, redirectChain: [{ url: 'https://example.test/redirect', status: 301, location: 'https://example.test/healthy' }], checkMethod: 'head', failureReason: '', fragment: '', networkTarget: true, occurrenceCount: 1, sourcePages: [occurrence.sourcePageUrl], occurrences: [{ ...occurrence, targetUrl: 'https://example.test/redirect', linkText: 'Redirect' }] },
      { targetUrl: 'https://example.test/healthy', referenceType: 'image', referenceTypes: ['image'], internal: true, outcome: 'healthy', httpStatus: 200, finalUrl: 'https://example.test/healthy', redirectCount: 0, redirectChain: [], checkMethod: 'browser_get', failureReason: '', fragment: '', networkTarget: true, occurrenceCount: 1, sourcePages: [occurrence.sourcePageUrl], occurrences: [{ ...occurrence, targetUrl: 'https://example.test/healthy', referenceType: 'image', attribute: 'src', linkText: '' }] }
    ]
  };
}

test('dedicated report manager writes safe HTML, JSON, CSV, PDF, and metadata projections', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'broken-links-report-'));
  const saved = await new BrokenLinksReportManager({ reportsRoot: root }).save(fixtureResult());
  const reportRoot = path.join(root, saved.reportName);
  for (const file of ['summary.html', 'summary.json', 'summary.csv', 'summary.pdf', 'metadata.json']) assert.equal(fs.existsSync(path.join(reportRoot, file)), true, file);
  assert.equal(fs.existsSync(path.join(reportRoot, 'summary.xlsx')), false);
  const json = JSON.parse(fs.readFileSync(path.join(reportRoot, 'summary.json'), 'utf8'));
  const metadata = JSON.parse(fs.readFileSync(path.join(reportRoot, 'metadata.json'), 'utf8'));
  const html = fs.readFileSync(path.join(reportRoot, 'summary.html'), 'utf8');
  const csv = fs.readFileSync(path.join(reportRoot, 'summary.csv'), 'utf8');
  assert.equal(json.reportType, 'broken-links-resources');
  assert.equal(json.schemaVersion, '1.0.0');
  assert.equal(metadata.overview.broken, 1);
  assert.match(html, /Broken Links &amp; Resources Checker/);
  assert.match(html, /Needs attention/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.equal(html.includes('SECRET'), false);
  assert.match(csv, /Outcome,HTTP Status,Reference Type,Internal\/External,Target URL/);
  assert.match(csv, /'=1\+1/);

  const pdf = fs.readFileSync(path.join(reportRoot, 'summary.pdf'));
  assert.equal(pdf.subarray(0, 5).toString(), '%PDF-');
  assert.ok(pdf.length > 10_000);
  assert.match(saved.pdfHref, /\/download\/pdf$/);
});

test('large standalone report is remediation-first and retains complete canonical data', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'broken-links-large-report-'));
  const saved = await new BrokenLinksReportManager({ reportsRoot: root }).save(createBrokenLinksPresentationFixture());
  const reportRoot = path.join(root, saved.reportName);
  const html = fs.readFileSync(path.join(reportRoot, 'summary.html'), 'utf8');
  const json = JSON.parse(fs.readFileSync(path.join(reportRoot, 'summary.json'), 'utf8'));
  assert.ok(html.indexOf('id="needs-attention"') < html.indexOf('id="healthy-inventory"'));
  for (const anchor of ['summary', 'needs-attention', 'review-items', 'redirects', 'healthy-inventory', 'scan-details']) assert.match(html, new RegExp(`href="#${anchor}"`));
  assert.match(html, /id="reportData" type="application\/json"/);
  assert.doesNotMatch(html, /<script[^>]+src=/);
  assert.match(html, /<details[^>]*class="report-target-detail"/);
  assert.equal(json.targets.length, 320);
  assert.equal(json.summary.healthy, 280);
});

test('standalone report pagination and responsive layout work without network dependencies', { timeout: 30_000 }, async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'broken-links-report-browser-'));
  const saved = await new BrokenLinksReportManager({ reportsRoot: root }).save(createBrokenLinksPresentationFixture());
  const reportUrl = pathToFileURL(path.join(root, saved.reportName, 'summary.html')).href;
  const capability = await detectBrowserCapabilities({ fixtureUrl: reportUrl });
  if (capability.navigation !== 'available') return t.skip(capability.reasons?.map((item) => item.message).join('; ') || 'Browser unavailable');
  const browser = await chromium.launch({ executablePath: capability.browser.path, headless: true, args: ['--disable-dev-shm-usage'] });
  t.after(() => browser.close());
  for (const width of [1440, 1024, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(reportUrl, { waitUntil: 'load' });
    assert.equal(await page.locator('#healthy-inventory [data-report-target]:not([hidden])').count(), 25);
    assert.match(await page.locator('#healthyPageStatus').textContent(), /Page 1 of 12/);
    await page.locator('#healthyNext').click();
    assert.match(await page.locator('#healthyPageStatus').textContent(), /Page 2 of 12/);
    await page.locator('#healthySearch').fill('no-such-target');
    assert.equal(await page.locator('#healthyEmpty').isVisible(), true);
    await page.locator('#healthyClear').click();
    await page.locator('#needs-attention .report-target-detail summary').first().click();
    assert.ok(await page.locator('#needs-attention .report-occurrence').count() > 0);
    const dimensions = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.equal(dimensions.scrollWidth, dimensions.innerWidth, `report has no page overflow at ${width}px`);
    assert.deepEqual(errors, []);
    await page.close();
  }
});

test('generic Report History discovers the fourth report type and artifacts', async () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'broken-links-history-'));
  const saved = await new BrokenLinksReportManager({ reportsRoot: root }).save(fixtureResult());
  const report = new ReportManager({ reportsRoot: root }).listReports().find((item) => item.name === saved.reportName);
  assert.equal(report.reportType, 'broken-links-resources');
  assert.equal(report.overview.pages, 1);
  assert.equal(report.overview.targets, 3);
  assert.equal(report.overview.broken, 1);
  assert.equal(report.overview.redirected, 1);
  assert.match(report.summaryHref, /summary\.html$/);
  assert.match(report.csvHref, /\/download\/csv$/);
  assert.match(report.pdfHref, /\/download\/pdf$/);
  assert.equal('xlsxHref' in report, false);
  assert.match(report.jsonHref, /summary\.json$/);
});
