import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import test from 'node:test';
import { chromium } from 'playwright-core';
import { detectBrowserCapabilities } from '../lib/browser-capability.js';
import { findFreePort } from '../lib/utils.js';

const appSource = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const sharedCss = fs.readFileSync(new URL('../public/styles/shared.css', import.meta.url), 'utf8');

test('all current-result surfaces use the one shared report-action renderer', () => {
  assert.match(appSource, /function reportActionControls/);
  for (const label of ['Lighthouse report actions', 'Compliance Mapping report actions', 'Asset report actions', 'Broken Links report actions']) assert.match(appSource, new RegExp(label));
  for (const label of ['Open Report', 'Download PDF', 'More Exports', 'Download CSV', 'Download Excel']) assert.match(appSource, new RegExp(label));
  assert.match(sharedCss, /\.report-action-controls/);
  assert.match(sharedCss, /\.report-action:focus-visible/);
  assert.match(sharedCss, /@media \(max-width: 430px\)[\s\S]*grid-template-columns: 1fr/);
  assert.doesNotMatch(appSource, /Open report ↗|>PDF<|>CSV</);
});

test('shared report actions are keyboard-accessible, close correctly, and remain overflow-free', { timeout: 90_000 }, async (t) => {
  const reportsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'report-actions-'));
  const fixtures = [
    ['lighthouse-fixture', 'lighthouse', 'Lighthouse Project'],
    ['compliance-fixture', 'security-compliance', 'Compliance Project'],
    ['asset-fixture', 'asset-page-weight', 'Asset Project'],
    ['links-fixture', 'broken-links-resources', 'Links Project']
  ];
  for (const [name, reportType, projectName] of fixtures) {
    const root = path.join(reportsRoot, name); fs.mkdirSync(root);
    for (const [file, content] of [['summary.html', '<!doctype html><title>Fixture</title>'], ['summary.pdf', '%PDF-1.4\nfixture'], ['summary.csv', 'A\n1'], ['summary.xlsx', 'xlsx fixture']]) fs.writeFileSync(path.join(root, file), content);
    if (reportType === 'security-compliance') fs.writeFileSync(path.join(root, 'findings.csv'), 'Finding\nfixture');
    fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify({ reportType, projectName, generatedAt: '2026-08-31T00:00:00Z', overview: { reportType, projectName, generatedAt: '2026-08-31T00:00:00Z' } }));
    fs.writeFileSync(path.join(root, 'metadata.json'), JSON.stringify({ reportType, projectName, generatedAt: '2026-08-31T00:00:00Z' }));
  }
  const port = await findFreePort(4291);
  const child = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), env: { ...process.env, APP_PORT: String(port), TOOLKIT_REPORTS_DIR: reportsRoot }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { const response = await fetch(`http://127.0.0.1:${port}/api/health`); if (response.ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (!ready) return t.skip('Local HTTP binding unavailable.');
  const capability = await detectBrowserCapabilities({ fixtureUrl: `http://127.0.0.1:${port}` });
  if (capability.navigation !== 'available') return t.skip('Browser navigation unavailable.');
  const browser = await chromium.launch({ executablePath: capability.browser.path, headless: true, args: ['--disable-dev-shm-usage'] });
  t.after(() => browser.close());
  for (const width of [1440, 1024, 768, 390]) {
    const page = await browser.newPage({ viewport: { width, height: width === 390 ? 844 : 1000 } });
    const errors = [];
    page.on('console', (message) => { if (message.type() === 'error') errors.push(message.text()); });
    page.on('pageerror', (error) => errors.push(error.message));
    await page.goto(`http://127.0.0.1:${port}`, { waitUntil: 'networkidle' });
    await page.locator('[data-section="history"]').evaluate((button) => button.click());
    await page.locator('.history-item').first().waitFor();
    assert.equal(await page.locator('.history-item').count(), 4);
    for (const item of await page.locator('.history-item').all()) {
      assert.equal(await item.locator('.report-action-controls').count(), 1);
      await assert.doesNotReject(() => item.getByText('Open Report', { exact: true }).count());
      assert.equal(await item.getByText('Download PDF', { exact: true }).count(), 1);
      assert.equal(await item.getByText('More Exports', { exact: false }).count(), 1);
      const hrefs = await item.locator('.report-export-popover a').evaluateAll((links) => links.map((link) => ({ text: link.textContent.trim(), href: link.getAttribute('href') })));
      assert.deepEqual(hrefs.slice(0, 2).map((entry) => entry.text), ['Download CSV', 'Download Excel']);
      assert.match(hrefs[0].href, /\/download\/csv$/);
      assert.match(hrefs[1].href, /\/download\/xlsx$/);
    }
    const duplicateIds = await page.evaluate(() => [...document.querySelectorAll('[id]')].map((node) => node.id).filter((id, index, all) => all.indexOf(id) !== index));
    assert.deepEqual(duplicateIds, []);
    const firstTrigger = page.locator('.history-item .report-action-more').first();
    await firstTrigger.focus();
    await firstTrigger.press('ArrowDown');
    const firstMenu = page.locator('.history-item .report-export-popover').first();
    assert.equal(await firstMenu.isVisible(), true);
    assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), 'Download CSV');
    await page.keyboard.press('ArrowDown');
    assert.equal(await page.evaluate(() => document.activeElement?.textContent.trim()), 'Download Excel');
    await page.keyboard.press('Escape');
    assert.equal(await firstMenu.isHidden(), true);
    assert.equal(await firstTrigger.evaluate((node) => document.activeElement === node), true);
    await firstTrigger.click();
    assert.equal(await firstMenu.isVisible(), true);
    await page.locator('#historySection h2').click();
    assert.equal(await firstMenu.isHidden(), true);
    const dimensions = await page.evaluate(() => ({ innerWidth, scrollWidth: document.documentElement.scrollWidth }));
    assert.equal(dimensions.scrollWidth, dimensions.innerWidth, `no horizontal overflow at ${width}px`);
    assert.deepEqual(errors, []);
    await page.close();
  }
});
