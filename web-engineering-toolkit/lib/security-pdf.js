import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { detectBrowsers } from './environment-checker.js';

function escapeTemplate(value) {
  return String(value || '')
    .replace(/[\u00ad\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff\ufffd]/g, '')
    .replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

export async function generateCompliancePdf({ htmlPath, pdfPath, summary, browserPath = '' }) {
  const startedAt = performance.now();
  const { chromium } = await import('playwright-core');
  const detected = browserPath ? [{ path: browserPath }] : await detectBrowsers();
  const executablePath = detected.find((browser) => browser.path)?.path;
  if (!executablePath) throw new Error('No compatible Chrome/Chromium/Brave executable is available for PDF generation.');
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.goto(pathToFileURL(path.resolve(htmlPath)).href, { waitUntil: 'load', timeout: 30_000 });
    await page.emulateMedia({ media: 'print' });
    await page.evaluate(() => {
      document.body.classList.add('pdf-render');
      document.querySelectorAll('details').forEach((detail) => { detail.open = true; });
    });
    await page.pdf({
      path: pdfPath,
      format: 'A4',
      landscape: false,
      printBackground: true,
      displayHeaderFooter: true,
      margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' },
      headerTemplate: `<div style="width:100%;padding:0 16mm;font:7px Arial;color:#6b7280;display:flex;justify-content:space-between"><span>Web Engineering Toolkit — Compliance Mapping</span><span>${escapeTemplate(summary.projectName)} · ${escapeTemplate(summary.finalUrl || summary.requestedUrl)}</span></div>`,
      footerTemplate: '<div style="width:100%;padding:0 16mm;font:7px Arial;color:#6b7280;display:flex;justify-content:space-between"><span>Technical Compliance Pre-Assessment</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>',
      tagged: true,
      outline: true
    });
  } finally {
    await browser.close();
  }
  return { durationMs: Math.round(performance.now() - startedAt), method: 'playwright_chromium_print_to_pdf' };
}
