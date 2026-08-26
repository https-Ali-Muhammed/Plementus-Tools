import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { detectBrowsers } from './environment-checker.js';

export function classifyBrowserFailure(error) {
  const message = String(error?.message || error || 'Unknown browser error');
  if (/ERR_BLOCKED_BY_ADMINISTRATOR|blocked by administrator|administratively prohibited/i.test(message)) {
    return { state: 'navigation_restricted', reason: 'browser_navigation_restricted', message };
  }
  if (/executable doesn.t exist|browser.*not found|no compatible.*browser/i.test(message)) {
    return { state: 'unavailable', reason: 'browser_unavailable', message };
  }
  return { state: 'failed', reason: 'browser_operation_failed', message };
}

export async function detectBrowserCapabilities({ fixtureUrl = '', browserPath = '' } = {}) {
  const browsers = browserPath ? [{ name: 'Configured browser', path: browserPath, version: 'Configured' }] : await detectBrowsers();
  const selected = browsers.find((browser) => browser.path);
  const result = {
    browserDetected: Boolean(selected),
    browser: selected || null,
    launch: selected ? 'pending' : 'unavailable',
    navigation: fixtureUrl ? 'pending' : 'not_tested',
    pdfSourceNavigation: 'pending',
    pdfRendering: 'pending',
    reasons: []
  };
  if (!selected) {
    result.pdfSourceNavigation = 'unavailable';
    result.pdfRendering = 'unavailable';
    result.reasons.push({ operation: 'launch', reason: 'browser_unavailable', message: 'No compatible Chromium-based browser was detected.' });
    return result;
  }

  const { chromium } = await import('playwright-core');
  let browser;
  const temporaryRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'browser-capability-'));
  const fixtureFile = path.join(temporaryRoot, 'fixture.html');
  fs.writeFileSync(fixtureFile, '<!doctype html><html><body><h1>Browser capability fixture</h1></body></html>');
  try {
    try {
      browser = await chromium.launch({ executablePath: selected.path, headless: true, args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'] });
      result.launch = 'available';
    } catch (error) {
      const classified = classifyBrowserFailure(error);
      result.launch = classified.state === 'unavailable' ? 'unavailable' : 'launch_failed';
      result.navigation = fixtureUrl ? 'not_tested' : result.navigation;
      result.pdfSourceNavigation = 'not_tested';
      result.pdfRendering = 'not_tested';
      result.reasons.push({ operation: 'launch', reason: classified.reason, message: classified.message });
      return result;
    }

    const page = await browser.newPage();
    if (fixtureUrl) {
      try {
        await page.goto(fixtureUrl, { waitUntil: 'domcontentloaded', timeout: 10_000 });
        result.navigation = 'available';
      } catch (error) {
        const classified = classifyBrowserFailure(error);
        result.navigation = classified.state === 'navigation_restricted' ? 'restricted' : 'failed';
        result.reasons.push({ operation: 'navigation', reason: classified.reason, message: classified.message });
      }
    }

    try {
      await page.goto(pathToFileURL(fixtureFile).href, { waitUntil: 'load', timeout: 10_000 });
      result.pdfSourceNavigation = 'available';
      const pdf = await page.pdf({ format: 'A4' });
      result.pdfRendering = pdf.subarray(0, 5).toString() === '%PDF-' ? 'available' : 'failed';
      if (result.pdfRendering === 'failed') result.reasons.push({ operation: 'pdf_rendering', reason: 'invalid_pdf_output', message: 'Chromium did not return a PDF signature.' });
    } catch (error) {
      const classified = classifyBrowserFailure(error);
      result.pdfSourceNavigation = classified.state === 'navigation_restricted' ? 'restricted' : 'failed';
      result.pdfRendering = 'not_tested';
      result.reasons.push({ operation: 'pdf_source_navigation', reason: classified.reason, message: classified.message });
    }
    return result;
  } finally {
    await browser?.close().catch(() => {});
    fs.rmSync(temporaryRoot, { recursive: true, force: true });
  }
}

export function browserSkipReason(capability, operation = 'navigation') {
  if (!capability?.browserDetected || capability?.launch === 'unavailable') return 'browser unavailable';
  if (capability?.launch !== 'available') return 'browser launch failed';
  if (operation === 'pdf' && capability.pdfSourceNavigation === 'restricted') return 'browser navigation restricted';
  const state = operation === 'pdf' ? capability.pdfRendering : capability.navigation;
  if (state === 'restricted') return 'browser navigation restricted';
  if (state !== 'available') return operation === 'pdf' ? 'PDF rendering unavailable' : 'browser navigation unavailable';
  return '';
}

export function browserSkipCode(capability, operation = 'navigation') {
  if (!capability?.browserDetected || capability?.launch === 'unavailable') return 'browser_unavailable';
  if (capability?.launch !== 'available') return 'browser_launch_failed';
  if (operation === 'pdf' && capability.pdfSourceNavigation === 'restricted') return 'browser_navigation_restricted';
  const state = operation === 'pdf' ? capability.pdfRendering : capability.navigation;
  if (state === 'restricted') return 'browser_navigation_restricted';
  if (state !== 'available') return operation === 'pdf' ? 'pdf_rendering_unavailable' : 'browser_navigation_unavailable';
  return '';
}
