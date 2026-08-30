import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import path from 'node:path';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { detectBrowserCapabilities } from '../lib/browser-capability.js';
import { createBrokenLinksPresentationFixture } from './fixtures/broken-links-presentation-fixture.js';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const publicRoot = path.join(root, 'public');

function resultFixture() {
  const source = 'https://fixture.test/';
  const occurrence = { sourcePageUrl: source, targetUrl: 'https://fixture.test/missing', referenceType: 'link', attribute: 'href', linkText: 'Missing', fragment: '' };
  return {
    schemaVersion: '1.0.0', reportType: 'broken-links-resources', projectName: 'Shared fixture', baseUrl: 'https://fixture.test', generatedAt: '2026-08-29T12:00:00.000Z', durationMs: 250,
    scope: { mode: 'selected', startingPages: [source] }, summary: { pagesScanned: 1, uniqueTargets: 2, occurrences: 2, healthy: 1, broken: 1, redirected: 0, unavailable: 0, externalTargets: 0, skipped: 0 },
    targets: [
      { targetUrl: occurrence.targetUrl, finalUrl: occurrence.targetUrl, outcome: 'broken', httpStatus: 404, referenceType: 'link', referenceTypes: ['link'], internal: true, checkMethod: 'head', failureReason: '', occurrenceCount: 1, sourcePages: [source], occurrences: [occurrence] },
      { targetUrl: 'https://fixture.test/logo.png', finalUrl: 'https://fixture.test/logo.png', outcome: 'healthy', httpStatus: 200, referenceType: 'image', referenceTypes: ['image'], internal: true, checkMethod: 'browser_get', failureReason: '', occurrenceCount: 1, sourcePages: [source], occurrences: [{ ...occurrence, targetUrl: 'https://fixture.test/logo.png', referenceType: 'image', attribute: 'src', linkText: '' }] }
    ],
    summaryHref: '/reports/fixture/summary.html', jsonHref: '/reports/fixture/summary.json', csvHref: '/reports/fixture/summary.csv', xlsxHref: '/reports/fixture/summary.xlsx'
  };
}

async function startUiFixture(result = resultFixture()) {
  const requests = [];
  const server = http.createServer(async (req, res) => {
    const url = new URL(req.url, `http://${req.headers.host}`);
    if (url.pathname === '/api/projects') return json(res, { activeProjectId: 'shared', projects: [{ id: 'shared', name: 'Shared fixture', testingUrl: 'https://fixture.test', productionUrl: '', activeEnvironment: 'testing', defaultLanguage: 'en', languages: ['en'], paths: ['/', '/docs'], updatedAt: '2026-08-29T12:00:00.000Z' }] });
    if (url.pathname === '/api/reports') return json(res, []);
    if (url.pathname === '/api/browser/status') return json(res, { running: false });
    if (url.pathname === '/api/health') return json(res, { ready: true, browsers: [], checks: [], summary: { errors: 0, warnings: 0 } });
    if (req.method === 'POST' && url.pathname === '/api/broken-links/check') {
      let body = '';
      for await (const chunk of req) body += chunk;
      requests.push(JSON.parse(body));
      return json(res, result);
    }
    const relative = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = path.join(publicRoot, relative);
    if (!file.startsWith(publicRoot) || !fs.existsSync(file) || !fs.statSync(file).isFile()) { res.writeHead(404); return res.end('Not found'); }
    const type = file.endsWith('.css') ? 'text/css' : file.endsWith('.js') ? 'text/javascript' : file.endsWith('.png') ? 'image/png' : 'text/html';
    res.writeHead(200, { 'Content-Type': type });
    return fs.createReadStream(file).pipe(res);
  });
  await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); });
  return { url: `http://127.0.0.1:${server.address().port}`, requests, close: () => new Promise((resolve, reject) => { server.closeAllConnections(); server.close((error) => error ? reject(error) : resolve()); }) };
}

function json(res, value) {
  const body = JSON.stringify(value);
  res.writeHead(200, { 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

test('large checker results are remediation-first, paginated, filterable, and responsive', { timeout: 60_000 }, async (t) => {
  const fixture = await startUiFixture(createBrokenLinksPresentationFixture());
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
    if (width <= 900) await page.locator('#mobileMenuToggle').click();
    await page.locator('[data-section="links"]').click();
    await page.waitForTimeout(50);
    assert.equal(await page.locator('#linksProjectName').inputValue(), 'Shared fixture');
    assert.equal(await page.locator('#linksBaseUrl').inputValue(), 'https://fixture.test');
    assert.equal((await page.locator('#linksPages').inputValue()).includes('/docs'), true);
    assert.equal(await page.locator('#startLinksCheckBtn').isVisible(), true);
    await page.locator('#startLinksCheckBtn').click();
    await page.locator('#linksResultsCard:not(.hidden)').waitFor();
    assert.equal(await page.locator('.links-view-tabs [data-links-view="attention"]').getAttribute('aria-pressed'), 'true');
    assert.equal(await page.locator('[data-links-target]').count(), 22);
    assert.equal(await page.locator('[data-links-target] .links-outcome.healthy').count(), 0);
    if (width === 1440) {
      await page.locator('.links-summary-card[data-links-summary-outcome="healthy"]').click();
      assert.equal(await page.locator('.links-view-tabs [data-links-view="healthy"]').getAttribute('aria-pressed'), 'true');
      assert.equal(await page.locator('[data-links-target]').count(), 25);
      assert.match(await page.locator('#linksResultPageStatus').textContent(), /Page 1 of 12/);
      await page.locator('#linksResultType').selectOption('image');
      await page.locator('#linksResultNext').click();
      assert.equal(await page.locator('#linksResultType').inputValue(), 'image');
      assert.ok(await page.locator('[data-links-target]').count() <= 25);
      await page.locator('.links-view-tabs [data-links-view="attention"]').click();
      await page.locator('#linksClearFilters').click();
      await page.locator('#linksResultOutcome').selectOption('broken');
      assert.equal(await page.locator('[data-links-target]').count(), 8);
      const firstTarget = page.locator('[data-links-target]').first();
      await firstTarget.locator('details.links-target-detail summary').click();
      assert.ok(await firstTarget.locator('.links-occurrence-item').count() <= 5);
      await page.locator('[data-show-all-occurrences]').first().click();
      assert.equal(await page.locator('[data-links-target]').first().locator('.links-occurrence-item').count(), 14);
      await page.locator('#linksResultSearch').fill('definitely-no-match');
      assert.equal(await page.locator('.links-empty-state').isVisible(), true);
      await page.locator('#linksClearFilters').click();
      assert.equal(await page.locator('#linksResultSearch').inputValue(), '');
      assert.ok(await page.locator('[data-links-target]').count() > 0);
    }
    const dimensions = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth, resultWidth: document.querySelector('.links-target-list')?.scrollWidth, resultClientWidth: document.querySelector('.links-target-list')?.clientWidth }));
    assert.equal(dimensions.scrollWidth, dimensions.innerWidth, `no page overflow at ${width}px`);
    assert.equal(dimensions.resultWidth, dimensions.resultClientWidth);
    assert.deepEqual(errors, []);
    await page.close();
  }
  assert.equal(fixture.requests.length, 4);
  assert.equal(fixture.requests.every((request) => request.projectName === 'Shared fixture' && request.startingPages.includes('/docs')), true);
});

test('two-thousand-target workspace rendering remains bounded and responsive', { timeout: 30_000 }, async (t) => {
  const fixture = await startUiFixture(createBrokenLinksPresentationFixture(2000));
  t.after(() => fixture.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: fixture.url });
  if (capability.navigation !== 'available') return t.skip(capability.reasons?.join('; ') || 'Browser unavailable');
  const browser = await chromium.launch({ executablePath: capability.browser.path, headless: true, args: ['--disable-dev-shm-usage'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  await page.goto(fixture.url, { waitUntil: 'networkidle' });
  await page.locator('[data-section="links"]').click();
  const started = Date.now();
  await page.locator('#startLinksCheckBtn').click();
  await page.locator('#linksResultsCard:not(.hidden)').waitFor();
  const initialRenderMs = Date.now() - started;
  assert.ok(await page.locator('[data-links-target]').count() <= 25);
  const filterMs = await page.evaluate(() => { const start = performance.now(); const input = document.querySelector('#linksResultSearch'); input.value = 'resource'; input.dispatchEvent(new Event('input', { bubbles: true })); return performance.now() - start; });
  await page.locator('.links-summary-card[data-links-summary-outcome="healthy"]').click();
  const pageSwitchMs = await page.evaluate(() => { const start = performance.now(); document.querySelector('#linksResultNext').click(); return performance.now() - start; });
  assert.ok(initialRenderMs < 5000, `initial render took ${initialRenderMs} ms`);
  assert.ok(filterMs < 500, `filter took ${filterMs} ms`);
  assert.ok(pageSwitchMs < 500, `page switch took ${pageSwitchMs} ms`);
  t.diagnostic(JSON.stringify({ targets: 2000, initialRenderMs, filterMs: Math.round(filterMs * 100) / 100, pageSwitchMs: Math.round(pageSwitchMs * 100) / 100 }));
});

test('CSS architecture includes one root-scoped stylesheet for the fourth tool', () => {
  const entry = fs.readFileSync(path.join(publicRoot, 'styles.css'), 'utf8');
  const css = fs.readFileSync(path.join(publicRoot, 'styles', 'broken-links.css'), 'utf8');
  assert.match(entry, /@import\s+url\(["']\.\/styles\/broken-links\.css["']\)/);
  assert.match(css, /#linksSection \.links-layout/);
  assert.doesNotMatch(css, /#(?:runner|security|assets)Section/);
});
