import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import test from 'node:test';
import { browserSkipReason, detectBrowserCapabilities } from '../lib/browser-capability.js';
import { buildComplianceHtml } from '../lib/security-report-html.js';
import { scanWebsiteSecurity } from '../lib/security-scanner.js';
import { createComplianceSummary } from './fixtures/compliance-summary-fixture.js';
import { startSecurityLab } from './fixtures/security-lab-server.js';

async function startWorkspaceFixture(scanResultForProject) {
  const publicRoot = path.resolve(new URL('../public/', import.meta.url).pathname);
  const server = http.createServer(async (request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);
    if (url.pathname === '/api/security/scan' && request.method === 'POST') {
      let body = '';
      for await (const chunk of request) body += chunk;
      const config = JSON.parse(body || '{}');
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return response.end(JSON.stringify(await scanResultForProject(config.projectName, config)));
    }
    if (url.pathname === '/api/projects') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return response.end('{"projects":[],"activeProjectId":""}');
    }
    if (url.pathname === '/api/reports') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return response.end('[]');
    }
    if (url.pathname === '/api/browser/status') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return response.end('{"running":false}');
    }
    if (url.pathname === '/api/health') {
      response.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
      return response.end('{"ready":true,"checks":[],"browsers":[]}');
    }
    const relative = url.pathname === '/' ? 'index.html' : url.pathname.replace(/^\//, '');
    const file = path.join(publicRoot, relative);
    if (!file.startsWith(publicRoot) || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
      response.writeHead(404);
      return response.end('Not found');
    }
    const type = file.endsWith('.js') ? 'text/javascript' : file.endsWith('.css') ? 'text/css' : 'text/html';
    response.writeHead(200, { 'Content-Type': `${type}; charset=utf-8` });
    fs.createReadStream(file).pipe(response);
  });
  await new Promise((resolve, reject) => {
    server.once('error', reject);
    server.listen(0, '127.0.0.1', resolve);
  });
  return {
    url: `http://127.0.0.1:${server.address().port}`,
    close: () => new Promise((resolve, reject) => server.close((error) => error ? reject(error) : resolve()))
  };
}

function workspaceReviewResult(projectName) {
  const result = createComplianceSummary({ schemaVersion: '2.6.0', projectName });
  result.reviewReasonDefinitions = {
    scope_confirmation_required: { label: 'Scope confirmation required' },
    organizational_evidence_required: { label: 'Organizational evidence required' }
  };
  result.controlEvaluations[0].manualReviewReasons = ['scope_confirmation_required', 'organizational_evidence_required', 'unknown_legacy_reason'];
  result.frameworkResults[0].manualReviewReasons = ['scope_confirmation_required'];
  result.frameworkResults[0].controlEvaluations = result.controlEvaluations;
  if (projectName === 'Missing definitions') delete result.reviewReasonDefinitions;
  if (projectName === 'Missing reasons') {
    delete result.controlEvaluations[0].manualReviewReasons;
    delete result.frameworkResults[0].manualReviewReasons;
  }
  return result;
}

test('reviewed report remains accessible and overflow-free at desktop and mobile widths', { timeout: 30_000 }, async (t) => {
  const capability = await detectBrowserCapabilities();
  const reason = browserSkipReason(capability, 'pdf');
  if (reason) return t.skip(reason);
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase4-browser-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const summary = createComplianceSummary({ schemaVersion: '2.6.0' });
  summary.findings[0].controlMappings = [{ mappingId: 'P4-BROWSER-MAP', framework: 'iso-27001', controlId: 'ISO27001:2022-A.8.5', relationship: 'supporting' }];
  const review = { reviewId: 'review-1', reviewer: '<script>alert(1)</script>', role: 'reviewer', reviewDecision: 'requires_more_evidence', mappingDecision: 'rejected', mappingId: 'P4-BROWSER-MAP', scopeDecision: 'confirmed', scopeFramework: 'iso-27001', reason: '<img src=x onerror=alert(1)> مرحبا', createdAt: '2026-08-28T09:00:00.000Z', updatedAt: '2026-08-28T09:00:00.000Z', revision: 2 };
  summary.workflow = { schemaVersion: '3.0.0', revision: 2, updatedAt: review.updatedAt, state: 'reviewed', history: [], findingDecisions: [{ fingerprint: summary.findings[0].fingerprint, findingStatus: 'reviewed', ...review, reviews: [review] }] };
  summary.findings[0].decision = summary.workflow.findingDecisions[0];
  summary.findings[0].findingStatus = 'reviewed';
  summary.reviewSummary = { state: 'reviewed', totalFindings: 1, reviewedFindings: 1, unreviewedFindings: 0, requiresMoreEvidence: 1 };
  const htmlPath = path.join(root, 'summary.html');
  fs.writeFileSync(htmlPath, buildComplianceHtml(summary));

  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: capability.browser.path, headless: true, args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(pathToFileURL(htmlPath).href, { waitUntil: 'load' });
  for (const width of [1440, 390]) {
    await page.setViewportSize({ width, height: width === 390 ? 844 : 1000 });
    const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    assert.ok(layout.scrollWidth <= layout.innerWidth, `${width}px overflow: ${layout.scrollWidth} > ${layout.innerWidth}`);
  }
  assert.equal(await page.locator('.report-review-form button[type="submit"]').count(), 1);
  assert.equal(await page.locator('select[name="mappingId"] option[value="P4-BROWSER-MAP"]').count(), 1);
  assert.equal(await page.locator('script').evaluateAll((scripts) => scripts.some((script) => script.textContent.includes('<script>alert(1)</script>'))), false);
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
});

test('workspace Run path renders and filters manual-review reasons without lexical scope failures', { timeout: 30_000 }, async (t) => {
  const fixture = await startWorkspaceFixture(workspaceReviewResult);
  t.after(() => fixture.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: fixture.url });
  const reason = browserSkipReason(capability, 'navigation');
  if (reason) return t.skip(reason);
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: capability.browser.path, headless: true, args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'] });
  t.after(() => browser.close());

  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    const page = await browser.newPage({ viewport });
    const consoleErrors = [];
    const pageErrors = [];
    page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
    page.on('pageerror', (error) => pageErrors.push(error.message));
    await page.goto(fixture.url, { waitUntil: 'networkidle' });
    await page.locator('[data-section="security"]').evaluate((element) => element.click());

    for (const projectName of ['Defined reasons', 'Missing definitions', 'Missing reasons']) {
      await page.locator('#securityProjectName').fill(projectName);
      await page.locator('#securityTargetUrl').fill('https://fixture.invalid/');
      await page.locator('#startSecurityScanBtn').click();
      await page.waitForFunction(() => document.querySelector('#securityScanState')?.classList.contains('success') || document.querySelector('#securityScanState')?.classList.contains('error'), null, { timeout: 10_000 });
      const scanState = page.locator('#securityScanState');
      assert.equal(await scanState.evaluate((element) => element.classList.contains('success')), true, await scanState.innerText());
      assert.equal(await page.locator('#securityScanState').getByText('Mapping failed').count(), 0);
      assert.equal(await page.locator('[data-security-finding]').count(), 1);
      if (projectName === 'Defined reasons') {
        const findingText = await page.locator('[data-security-finding]').textContent();
        assert.match(findingText, /Scope confirmation required/);
        assert.match(findingText, /Organizational evidence required/);
        assert.match(findingText, /Unknown Legacy Reason/);
        await page.locator('#securityFindingManualReason').selectOption('scope_confirmation_required');
        assert.equal(await page.locator('[data-security-finding]:not(.hidden)').count(), 1);
        assert.match(await page.locator('#securityFindingManualReason option:checked').innerText(), /Scope confirmation required/);
      }
      await page.locator('[data-security-edit-config]').click();
    }

    const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    assert.ok(layout.scrollWidth <= layout.innerWidth, `${viewport.width}px overflow: ${layout.scrollWidth} > ${layout.innerWidth}`);
    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
    await page.close();
  }
});

test('controlled Compliance Mapping run completes and renders the real scanner result', { timeout: 60_000 }, async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  let cachedResult;
  const fixture = await startWorkspaceFixture(async (projectName, config) => {
    cachedResult ||= await scanWebsiteSecurity({
      ...config,
      projectName,
      targetUrl: `${lab.baseUrl}/secure-corporate`,
      frameworks: ['iso-27001'],
      crawl: false,
      maxCrawlPages: 1,
      browserRetryCount: 0,
      browserTimeoutMs: 8_000
    });
    return cachedResult;
  });
  t.after(() => fixture.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: fixture.url });
  const reason = browserSkipReason(capability, 'navigation');
  if (reason) return t.skip(reason);
  const { chromium } = await import('playwright-core');
  const browser = await chromium.launch({ executablePath: capability.browser.path, headless: true, args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'] });
  t.after(() => browser.close());
  const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
  const consoleErrors = [];
  const pageErrors = [];
  page.on('console', (message) => { if (message.type() === 'error') consoleErrors.push(message.text()); });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.goto(fixture.url, { waitUntil: 'networkidle' });
  await page.locator('[data-section="security"]').evaluate((element) => element.click());
  await page.locator('#securityProjectName').fill('Phase 4 real workspace run');
  await page.locator('#securityTargetUrl').fill(`${lab.baseUrl}/secure-corporate`);
  await page.locator('#startSecurityScanBtn').click();
  await page.waitForFunction(() => document.querySelector('#securityScanState')?.classList.contains('success') || document.querySelector('#securityScanState')?.classList.contains('error'), null, { timeout: 45_000 });
  const scanState = page.locator('#securityScanState');
  assert.equal(await scanState.evaluate((element) => element.classList.contains('success')), true, await scanState.innerText());
  assert.equal(await page.locator('#securityScanState').getByText('Compliance map generated').count(), 1);
  assert.ok(await page.locator('[data-security-finding]').count() > 0);
  assert.ok(await page.locator('.security-framework-result').count() > 0);
  const reasonCode = await page.locator('[data-security-finding]').evaluateAll((cards) => cards.flatMap((card) => (card.dataset.manualReasons || '').split(' ')).find(Boolean) || '');
  assert.ok(reasonCode, 'real result should expose a finding manual-review reason');
  await page.locator('#securityFindingManualReason').selectOption(reasonCode);
  assert.ok(await page.locator('[data-security-finding]:not(.hidden)').count() > 0);
  for (const viewport of [{ width: 1440, height: 1000 }, { width: 390, height: 844 }]) {
    await page.setViewportSize(viewport);
    const layout = await page.evaluate(() => ({ scrollWidth: document.documentElement.scrollWidth, innerWidth: window.innerWidth }));
    assert.ok(layout.scrollWidth <= layout.innerWidth, `${viewport.width}px overflow: ${layout.scrollWidth} > ${layout.innerWidth}`);
  }
  assert.deepEqual(consoleErrors, []);
  assert.deepEqual(pageErrors, []);
});
