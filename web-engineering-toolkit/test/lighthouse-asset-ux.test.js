import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { detectBrowserCapabilities } from '../lib/browser-capability.js';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const publicRoot = path.join(root, 'public');
const read = (relative) => fs.readFileSync(path.join(root, relative), 'utf8');

function json(res, value) {
  const body = JSON.stringify(value);
  res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

function lighthouseSummary() {
  return {
    overview: {
      projectName: 'UX fixture', categories: ['performance', 'accessibility'], pages: 2, totalAudits: 2,
      validAudits: 2, redirectedAudits: 0, failedAudits: 0, totalFindings: 1, performance: 91,
      accessibility: 96, fcpMs: 850, lcpMs: 1300, speedIndexMs: 1050, tbtMs: 40, cls: 0.02,
      totalBytes: 420000, domElements: 310, exports: { pdf: true }
    },
    insights: { categories: [{ title: 'Performance', totalFindings: 1, groups: [{ title: 'Diagnostics', description: 'Useful checks', totalChecks: 1, findingCount: 1, findings: [{ status: 'warning', title: 'Review image delivery', explanation: 'One image can be optimized.', affected: [{ path: '/', device: 'desktop' }] }] }] }] },
    rows: [
      { path: '/', testedPath: 'https://fixture.test/', device: 'desktop', status: 'valid', validRuns: 1, totalRuns: 1, performance: 91, accessibility: 96, lcpMs: 1300, cls: 0.02, findingCount: 1, reportFile: 'pages/home.html' },
      { path: '/docs', testedPath: 'https://fixture.test/docs', device: 'desktop', status: 'valid', validRuns: 1, totalRuns: 1, performance: 93, accessibility: 98, lcpMs: 1200, cls: 0.01, findingCount: 0, reportFile: 'pages/docs.html' }
    ]
  };
}

function assetResult() {
  return {
    projectName: 'UX fixture', baseUrl: 'https://fixture.test', device: 'desktop',
    summary: { pageCount: 2, averageBytes: 300000, totalBytes: 600000, averageRequests: 18, totalRequests: 36, thirdPartyBytes: 80000, breakdown: { script: 220000, image: 180000, stylesheet: 60000, font: 40000, other: 100000 } },
    pages: [
      { finalUrl: 'https://fixture.test/', status: 200, totalTransferBytes: 280000, requestCount: 16, thirdPartyBytes: 30000, breakdown: { script: 100000, image: 90000 }, findings: [] },
      { finalUrl: 'https://fixture.test/docs', status: 200, totalTransferBytes: 320000, requestCount: 20, thirdPartyBytes: 50000, breakdown: { script: 120000, image: 90000 }, findings: [{ id: 'large-image' }] }
    ],
    findings: [{ severity: 'medium', title: 'Large image transfer', detail: 'An image exceeds the review threshold.', recommendation: 'Resize and compress the image.' }],
    largestAssets: [{ category: 'image', url: 'https://fixture.test/assets/very-long-product-image-name-for-responsive-layout-testing.webp', transferBytes: 160000, host: 'fixture.test', pageUrl: 'https://fixture.test/docs' }],
    summaryHref: '/reports/asset/summary.html', csvHref: '/api/reports/asset/download/csv', pdfHref: '/api/reports/asset/download/pdf'
  };
}

async function startFixture() {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/projects') return json(res, { activeProjectId: 'shared', projects: [{ id: 'shared', name: 'UX fixture', testingUrl: 'https://fixture.test', productionUrl: '', activeEnvironment: 'testing', defaultLanguage: 'en', languages: ['en'], paths: ['/', '/docs'], updatedAt: '2026-08-30T10:00:00.000Z' }] });
    if (url.pathname === '/api/reports') return json(res, []);
    if (url.pathname === '/api/browser/status') return json(res, { running: true, browserName: 'Fixture browser', port: 9222 });
    if (url.pathname === '/api/health') return json(res, { ready: true, browsers: [{ name: 'Fixture browser', path: '/fixture/browser', version: '1' }], checks: [], summary: { errors: 0, warnings: 0 } });
    if (req.method === 'POST' && url.pathname === '/api/runs') {
      let body = '';
      for await (const chunk of req) body += chunk;
      requests.push({ tool: 'lighthouse', body: JSON.parse(body) });
      return json(res, { id: 'ux-run' });
    }
    if (url.pathname === '/api/runs/ux-run/events') {
      res.writeHead(200, { 'Content-Type': 'text/event-stream', 'Cache-Control': 'no-cache', Connection: 'keep-alive' });
      const events = [
        { type: 'started', totalRuns: 2 },
        { type: 'phase', message: 'Preparing controlled audits' },
        { type: 'run-complete', current: 2, total: 2, valid: 2, redirected: 0, failed: 0, record: { status: 'valid', device: 'desktop', path: '/docs' } },
        { type: 'finished', status: 'completed', reportName: 'ux_lighthouse_fixture', summary: lighthouseSummary() }
      ];
      for (const event of events) res.write(`data: ${JSON.stringify(event)}\n\n`);
      return res.end();
    }
    if (req.method === 'POST' && url.pathname === '/api/assets/analyze') {
      let body = '';
      for await (const chunk of req) body += chunk;
      requests.push({ tool: 'asset', body: JSON.parse(body) });
      return json(res, assetResult());
    }
    const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = path.join(publicRoot, relative);
    if (!file.startsWith(publicRoot) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('Not found'); }
    const type = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : 'text/html';
    res.writeHead(200, { 'Content-Type': type });
    fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { url: `http://127.0.0.1:${server.address().port}`, requests, close: () => new Promise((resolve, reject) => { server.closeAllConnections(); server.close((error) => error ? reject(error) : resolve()); }) };
}

test('Lighthouse and Asset markup use inline run flows and tool-owned full-width layouts', () => {
  const html = read('public/index.html');
  const lighthouse = html.match(/<section id="runnerSection"[\s\S]*?<section id="securitySection"/)?.[0] || '';
  const asset = html.match(/<section id="assetsSection"[\s\S]*?<section id="linksSection"/)?.[0] || '';
  assert.doesNotMatch(lighthouse, /<aside class="action-column"/);
  assert.doesNotMatch(lighthouse, /health-mini|health-detail-panel|Environment details/);
  assert.match(lighthouse, /class="lighthouse-workspace-container"/);
  assert.match(lighthouse, /class="[^\"]*lighthouse-project-step/);
  assert.match(lighthouse, /class="[^\"]*lighthouse-target-step/);
  assert.match(lighthouse, /class="[^\"]*lighthouse-session-step/);
  assert.match(lighthouse, /class="[^\"]*lighthouse-run-step/);
  assert.doesNotMatch(asset, /<aside class="action-column"/);
  assert.match(asset, /class="asset-workspace-container"/);
  assert.match(asset, /class="[^\"]*asset-target-step/);
  assert.match(asset, /class="[^\"]*asset-run-step/);
  const lighthouseCss = read('public/styles/lighthouse.css');
  const assetCss = read('public/styles/asset-analyzer.css');
  assert.match(lighthouseCss, /grid-template-areas:\s*"project run"\s*"target run"\s*"session run"/s);
  assert.match(assetCss, /grid-template-areas:\s*"target run"/s);
  assert.match(lighthouseCss, /#runnerSection #urls[^{]*\{[^}]*overflow-y:\s*hidden/s);
  assert.match(assetCss, /#assetsSection #assetPaths[^{]*\{[^}]*overflow-y:\s*hidden/s);
});

test('Lighthouse and Asset real UI runs retain controls, auto-size page lists, and render full-width results', { timeout: 60_000 }, async (t) => {
  const fixture = await startFixture();
  t.after(() => fixture.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: fixture.url });
  if (capability.navigation !== 'available') return t.skip(capability.reasons?.join('; ') || 'Browser unavailable');
  const browser = await chromium.launch({ executablePath: capability.browser.path, headless: true, args: ['--disable-dev-shm-usage'] });
  t.after(() => browser.close());

  for (const width of [1440, 1024, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(fixture.url, { waitUntil: 'networkidle' });

    const manyPages = Array.from({ length: 14 }, (_, index) => `/page-${index + 1}`).join('\n');
    await page.locator('#urls').fill(manyPages);
    const lighthouseTextarea = await page.locator('#urls').evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, overflowY: getComputedStyle(element).overflowY }));
    assert.ok(lighthouseTextarea.clientHeight >= lighthouseTextarea.scrollHeight - 2);
    assert.equal(lighthouseTextarea.overflowY, 'hidden');
    assert.equal(await page.locator('#startRunBtn').isVisible(), true);
    if (process.env.CAPTURE_LIGHTHOUSE_ASSET_UX === '1' && [1440, 390].includes(width)) await page.screenshot({ path: `/tmp/lighthouse-setup-${width}.png`, fullPage: true });
    await page.locator('#startRunBtn').click();
    await page.locator('#resultSummary:not(.hidden)').waitFor();
    const lighthouseGeometry = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, section: document.querySelector('#runnerSection').clientWidth, results: document.querySelector('#liveSection').clientWidth }));
    assert.equal(lighthouseGeometry.page, lighthouseGeometry.viewport);
    assert.ok(lighthouseGeometry.results >= lighthouseGeometry.section * 0.96);
    assert.equal(await page.locator('#resultSummary .report-open-btn').first().isVisible(), true);
    if (process.env.CAPTURE_LIGHTHOUSE_ASSET_UX === '1' && [1440, 390].includes(width)) await page.screenshot({ path: `/tmp/lighthouse-results-${width}.png`, fullPage: true });

    if (width <= 900) await page.locator('#mobileMenuToggle').click();
    await page.locator('[data-section="assets"]').click();
    await page.locator('#assetPaths').fill(manyPages);
    const assetTextarea = await page.locator('#assetPaths').evaluate((element) => ({ clientHeight: element.clientHeight, scrollHeight: element.scrollHeight, overflowY: getComputedStyle(element).overflowY }));
    assert.ok(assetTextarea.clientHeight >= assetTextarea.scrollHeight - 2);
    assert.equal(assetTextarea.overflowY, 'hidden');
    assert.equal(await page.locator('#startAssetAnalysisBtn').isVisible(), true);
    if (process.env.CAPTURE_LIGHTHOUSE_ASSET_UX === '1' && [1440, 390].includes(width)) await page.screenshot({ path: `/tmp/asset-setup-${width}.png`, fullPage: true });
    await page.locator('#startAssetAnalysisBtn').click();
    await page.locator('#assetResultsCard:not(.hidden)').waitFor();
    const assetGeometry = await page.evaluate(() => ({ viewport: innerWidth, page: document.documentElement.scrollWidth, section: document.querySelector('#assetsSection').clientWidth, results: document.querySelector('#assetResultsCard').clientWidth }));
    assert.equal(assetGeometry.page, assetGeometry.viewport);
    assert.ok(assetGeometry.results >= assetGeometry.section * 0.96);
    assert.equal(await page.locator('#assetResultActions a').count(), 3);
    if (process.env.CAPTURE_LIGHTHOUSE_ASSET_UX === '1' && [1440, 390].includes(width)) await page.screenshot({ path: `/tmp/asset-results-${width}.png`, fullPage: true });
    assert.deepEqual(errors, []);
    await page.close();
  }
  assert.equal(fixture.requests.filter((item) => item.tool === 'lighthouse').length, 4);
  assert.equal(fixture.requests.filter((item) => item.tool === 'asset').length, 4);
});
