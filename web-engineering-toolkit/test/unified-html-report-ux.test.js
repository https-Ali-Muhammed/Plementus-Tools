import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { buildAssetSummaryHtml } from '../lib/asset-report-manager.js';
import { detectBrowserCapabilities } from '../lib/browser-capability.js';
import { buildBrokenLinksSummaryHtml } from '../lib/broken-links-report-manager.js';
import { buildLighthouseSummaryHtml } from '../lib/report-manager.js';
import { buildComplianceHtml } from '../lib/security-report-html.js';
import { createBrokenLinksPresentationFixture } from './fixtures/broken-links-presentation-fixture.js';

const root = new URL('..', import.meta.url);
const read = (file) => fs.readFileSync(new URL(file, root), 'utf8');

function assetFixture() {
  const longUrl = `https://fixture.test/assets/${'long-resource-segment-'.repeat(22)}image.webp?cache=controlled`;
  return {
    projectName: 'Asset UX fixture', baseUrl: 'https://fixture.test', device: 'desktop', generatedAt: '2026-08-31T12:00:00.000Z',
    summary: { pageCount: 2, averageBytes: 300000, averageRequests: 18, thirdPartyBytes: 80000, breakdown: { script: 220000, image: 180000, stylesheet: 60000, font: 40000, other: 100000 } },
    pages: [{ finalUrl: 'https://fixture.test/', status: 200, totalTransferBytes: 280000, requestCount: 16, thirdPartyBytes: 30000, breakdown: { script: 100000, image: 90000 }, findings: [] }],
    findings: [{ severity: 'medium', title: 'Large image transfer', detail: 'A controlled fixture exceeds the review threshold.', recommendation: 'Resize and compress the image.' }],
    largestAssets: [{ category: 'image', url: longUrl, transferBytes: 160000, host: 'fixture.test' }]
  };
}

function lighthouseFixture() {
  return {
    reportName: 'lighthouse-fixture', generatedAt: '2026-08-31T12:00:00.000Z',
    overview: { projectName: 'Lighthouse UX fixture', baseUrl: 'https://fixture.test', mode: 'public', targetLanguage: 'en', categories: ['performance', 'accessibility'], pages: 1, totalAudits: 1, validAudits: 1, redirectedAudits: 0, failedAudits: 0, cancelledAudits: 0, performance: 91, accessibility: 96, fcpMs: 850, lcpMs: 1300, speedIndexMs: 1050, tbtMs: 40, cls: .02, totalBytes: 420000, domElements: 310 },
    insights: { categories: [{ title: 'Performance', totalFindings: 1, groups: [{ title: 'Diagnostics', description: 'Useful checks', totalChecks: 1, findingCount: 1, findings: [{ status: 'warning', title: 'Review image delivery', explanation: 'One image can be optimized.', affected: [{ path: '/', device: 'desktop' }] }] }] }] },
    rows: [{ path: '/', testedPath: 'https://fixture.test/', device: 'desktop', status: 'valid', validRuns: 1, totalRuns: 1, performance: 91, accessibility: 96, lcpMs: 1300, cls: .02, findingCount: 1, reportFile: '' }]
  };
}

function complianceFixture() {
  return { projectName: 'Compliance UX fixture', requestedUrl: 'https://fixture.test/', finalUrl: 'https://fixture.test/', generatedAt: '2026-08-31T12:00:00.000Z', counts: { checks: 1, observations: 1 }, checks: [], testResults: [{ state: 'observed' }], findings: [{ id: 'UX_FIXTURE', fingerprint: 'a'.repeat(64), title: 'Controlled fixture', severity: 'medium', confidence: 'observed', category: 'Test', affectedUrl: 'https://fixture.test/', description: 'Observed.', recommendation: 'Review.', limitations: [], controlMappings: [] }], frameworkResults: [{ id: 'iso-27001', label: 'ISO 27001', evidenceStatements: [] }], controlEvaluations: [], policyDocumentQuality: [], localeCoverage: { state: 'locale_parity_not_assessed', availableLocales: [], policyLocalesTested: [] }, paymentFlow: {}, gdprPublicNoticeMatrix: [], evidenceManifest: { artifacts: [] }, workflow: { findingDecisions: [] } };
}

test('Report History badge variants are explicit, distinct, and retain labels', () => {
  const css = read('public/styles/shared.css');
  const app = read('public/app.js');
  for (const name of ['compliance', 'lighthouse', 'asset', 'broken-links']) assert.match(css, new RegExp(`\\.report-type-badge--${name}\\s*\\{`));
  assert.match(app, /reportTypeBadgeClass/);
  assert.match(app, /reportTypeLabel\(reportType\)/);
  assert.match(app, /report-type-badge report-type-badge--lighthouse/);
});

test('all standalone HTML summaries use the common report shell and one shared back-to-top control', () => {
  const reports = [
    buildComplianceHtml(complianceFixture()),
    buildLighthouseSummaryHtml(lighthouseFixture()),
    buildAssetSummaryHtml(assetFixture()),
    buildBrokenLinksSummaryHtml(createBrokenLinksPresentationFixture(80))
  ];
  for (const html of reports) {
    assert.match(html, /aria-label="Back to top"/);
    assert.equal((html.match(/data-report-back-to-top/g) || []).length, 2, 'one control plus its controller selector');
    assert.match(html, /@media\(prefers-reduced-motion:reduce\)/);
    assert.match(html, /@media print/);
    assert.match(html, /1360px/, 'shared report family width');
  }
  for (const html of reports.slice(1)) {
    assert.match(html, /report-shell/);
    assert.match(html, /report-header/);
    assert.match(html, /report-section/);
  }
  const broken = reports.at(-1);
  assert.doesNotMatch(broken, /Back to top ↑|class="back-top/);
});

test('all standalone summaries use the shared quick-action structure without changing their exports', () => {
  const reports = [
    ['Compliance Mapping', buildComplianceHtml(complianceFixture()), [['summary.pdf', 'PDF'], ['summary.xlsx', 'Excel'], ['findings.csv', 'CSV'], ['summary.json', 'JSON'], ['evidence/manifest.json', 'Evidence Manifest']]],
    ['Lighthouse', buildLighthouseSummaryHtml(lighthouseFixture()), [['summary.pdf', 'PDF'], ['summary.xlsx', 'Excel'], ['summary.csv', 'CSV'], ['summary.json', 'JSON']]],
    ['Asset', buildAssetSummaryHtml(assetFixture()), [['summary.pdf', 'PDF'], ['summary.xlsx', 'Excel'], ['summary.csv', 'CSV'], ['summary.json', 'JSON']]],
    ['Broken Links', buildBrokenLinksSummaryHtml(createBrokenLinksPresentationFixture(80)), [['summary.pdf', 'PDF'], ['summary.xlsx', 'Excel'], ['summary.csv', 'CSV'], ['summary.json', 'JSON']]]
  ];
  for (const [name, html, exports] of reports) {
    assert.equal((html.match(/class="report-actions report-action-controls screen-only"/g) || []).length, 1, `${name} has one action group`);
    assert.doesNotMatch(html, /Open Report|More Exports|Download (?:PDF|Excel|CSV|JSON)/);
    assert.equal((html.match(/class="report-action report-export-action"/g) || []).length, exports.length, `${name} exposes one direct button per format`);
    for (const [href, label] of exports) {
      assert.match(html, new RegExp(`href="${href.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>${label}<`), `${name} retains direct ${label} export`);
    }
    assert.doesNotMatch(html, /aria-haspopup="menu"|role="menuitem"|report-export-popover/);
  }
  const compliance = reports[0][1];
  assert.match(compliance, /class="cover compliance-report-header"/);
  assert.match(compliance, /Compliance UX fixture<\/h1>/);
  assert.match(compliance, /https:\/\/fixture\.test\/ · PUBLIC URL · TECHNICAL PRE-ASSESSMENT ·/);
  assert.match(compliance, /class="compliance-report-metadata"/);
  assert.doesNotMatch(compliance.match(/<section class="cover compliance-report-header">[\s\S]*?<\/section>/)?.[0] || '', /Technical Compliance Pre-Assessment|A professional portable representation|Target URL|Toolkit version|Disclaimer/);
  assert.match(compliance, /Compliance conclusion: <strong>Not determined<\/strong>/);
  assert.match(compliance, /Assessment Overview|Collection Coverage|Candidate Control Mappings|Human Review Status/);
});

test('all standalone summaries are responsive and the global control behaves accessibly', { timeout: 60_000 }, async (t) => {
  const reports = [
    ['Compliance', buildComplianceHtml(complianceFixture())],
    ['Lighthouse', buildLighthouseSummaryHtml(lighthouseFixture())],
    ['Asset', buildAssetSummaryHtml(assetFixture())],
    ['Broken Links', buildBrokenLinksSummaryHtml(createBrokenLinksPresentationFixture(320))]
  ].map(([name, html]) => [name, html.replace('</body>', '<div style="height:1200px"></div></body>')]);
  const capability = await detectBrowserCapabilities();
  if (capability.launch !== 'available') return t.skip(capability.reasons?.map((item) => item.message).join('; ') || 'Browser unavailable');
  const browser = await chromium.launch({ executablePath: capability.browser.path, headless: true, args: ['--disable-dev-shm-usage'] });
  t.after(() => browser.close());
  for (const width of [1440, 1024, 768, 390]) {
    for (const [name, html] of reports) {
      const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
      const errors = [];
      page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
      page.on('pageerror', (error) => errors.push(error.message));
      await page.setContent(html, { waitUntil: 'load' });
      const actions = page.locator('.report-action-controls');
      assert.equal(await actions.count(), 1, `${name} has one quick action group`);
      assert.equal(await actions.getByText('PDF', { exact: true }).count(), 1);
      assert.equal(await actions.getByText('JSON', { exact: true }).count(), 1);
      assert.equal(await actions.locator('.report-export-action').count(), name === 'Compliance' ? 5 : 4);
      await actions.locator('.report-export-action').first().focus();
      assert.equal(await actions.locator('.report-export-action').first().evaluate((node) => node.matches(':focus-visible')), true, `${name} direct export is keyboard focusable`);
      const control = page.locator('[data-report-back-to-top]');
      assert.equal(await control.count(), 1, `${name} has one control`);
      assert.equal(await control.isHidden(), true, `${name} control starts hidden`);
      await page.evaluate(() => window.scrollTo(0, 600));
      await page.waitForTimeout(20);
      assert.equal(await control.isVisible(), true, `${name} control becomes visible`);
      assert.equal(await control.evaluate((node) => { const box = node.getBoundingClientRect(); return box.left > innerWidth / 2 && innerWidth - box.right <= 24; }), true, `${name} control is bottom-right aligned`);
      await control.focus();
      await control.press('Enter');
      await page.waitForFunction(() => window.scrollY === 0);
      assert.equal(await page.evaluate(() => window.scrollY), 0, `${name} control returns to top`);
      await page.emulateMedia({ media: 'print' });
      assert.equal(await control.isHidden(), true, `${name} control is hidden in print`);
      await page.emulateMedia({ media: 'screen', reducedMotion: 'reduce' });
      const dimensions = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
      assert.equal(dimensions.scrollWidth, dimensions.innerWidth, `${name} has no overflow at ${width}px`);
      assert.deepEqual(errors, [], `${name} has no console errors at ${width}px`);
      await page.close();
    }
  }
});
