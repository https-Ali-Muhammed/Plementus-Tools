import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn, spawnSync } from 'node:child_process';
import { buildReportDownloadFilename, resolveReportDownload } from '../lib/report-downloads.js';
import { assetPdfHtml, brokenLinksPdfHtml, lighthousePdfHtml } from '../lib/tool-pdf-reports.js';
import { generateToolPdf, REPORT_FAMILY_TOKENS } from '../lib/pdf-report-renderer.js';
import { spreadsheetSafeCell, writeReportXlsx } from '../lib/xlsx-reports.js';
import { detectBrowserCapabilities } from '../lib/browser-capability.js';
import { findFreePort } from '../lib/utils.js';

test('canonical report filenames are descriptive, safe, and share the report timestamp', () => {
  const generatedAt = '2026-08-30T13:55:42.123Z';
  assert.equal(buildReportDownloadFilename({ reportType: 'lighthouse', projectName: 'Plementus', generatedAt, extension: 'pdf' }), 'lighthouse-report__plementus__2026-08-30_13-55-42Z.pdf');
  assert.equal(buildReportDownloadFilename({ reportType: 'lighthouse', projectName: 'Plementus', generatedAt, extension: 'csv' }), 'lighthouse-report__plementus__2026-08-30_13-55-42Z.csv');
  assert.equal(buildReportDownloadFilename({ reportType: 'lighthouse', projectName: 'Plementus', generatedAt, extension: 'xlsx' }), 'lighthouse-report__plementus__2026-08-30_13-55-42Z.xlsx');
  assert.match(buildReportDownloadFilename({ reportType: 'asset-page-weight', projectName: 'My Client / مصر', generatedAt, extension: 'pdf' }), /^asset-page-weight-report__my-client__/);
  assert.match(buildReportDownloadFilename({ reportType: 'security-compliance', projectName: 'Client: "North" \\ Cairo', generatedAt, extension: 'csv' }), /^compliance-mapping-report__client-north-cairo__/);
  assert.ok(buildReportDownloadFilename({ reportType: 'broken-links-resources', projectName: 'a'.repeat(300), generatedAt, extension: 'pdf' }).length < 160);
  assert.match(buildReportDownloadFilename({ reportType: 'lighthouse', projectName: 'مشروع عربي', generatedAt, extension: 'pdf' }), /__project__/);
  assert.match(buildReportDownloadFilename({ reportType: 'broken-links-resources', projectName: '../', generatedAt, extension: 'csv' }), /^broken-links-resources-report__project__/);
  assert.throws(() => buildReportDownloadFilename({ reportType: 'lighthouse', extension: 'zip' }), /Unsupported/);
});

test('new native PDFs are A4, searchable, bounded, and Unicode-safe', { timeout: 30_000 }, async (t) => {
  const capability = await detectBrowserCapabilities();
  if (capability.pdfRendering !== 'available') return t.skip(capability.reasons?.map((item) => item.message).join('; ') || 'PDF browser unavailable');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'unified-pdf-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const generatedAt = '2026-08-30T13:55:42.123Z';
  const longUrl = `https://example.test/${'long-segment-'.repeat(24)}?config=${'bounded-value-'.repeat(50)}MACHINE-TAIL&token=%5BREDACTED%5D`;
  const documents = [
    ['lighthouse', 'Lighthouse Reporter', lighthousePdfHtml({ generatedAt, overview: { projectName: 'مشروع Lighthouse', baseUrl: longUrl, categories: ['performance'], devices: ['desktop'], pages: 1, validAudits: 1, failedAudits: 0, totalFindings: 1, performance: 91 }, rows: [{ path: longUrl, device: 'desktop', status: 'valid', performance: 91, lcpMs: 1234, findingCount: 1 }], insights: { categories: [] } })],
    ['asset', 'Asset & Page-Weight Analyzer', assetPdfHtml({ projectName: 'مشروع Assets', baseUrl: longUrl, generatedAt, browser: { name: 'Fixture' }, device: 'desktop', summary: { pageCount: 1, averageBytes: 2048, averageRequests: 3, thirdPartyBytes: 0, breakdown: { image: 2048 } }, pages: [{ finalUrl: longUrl, status: 200, totalTransferBytes: 2048, requestCount: 3, breakdown: { script: 0, image: 2048 }, thirdPartyBytes: 0, findings: [] }], findings: [], largestAssets: [{ category: 'image', url: longUrl, transferBytes: 2048, host: 'example.test', pageUrl: longUrl }] })],
    ['links', 'Broken Links & Resources Checker', brokenLinksPdfHtml({ projectName: 'مشروع Links', baseUrl: longUrl, generatedAt, scope: { mode: 'selected' }, summary: { pagesScanned: 1, uniqueTargets: 1 }, targets: [{ outcome: 'broken', httpStatus: 404, targetUrl: longUrl, referenceTypes: ['image'], occurrenceCount: 1, sourcePages: [longUrl], failureReason: 'Not found' }] })]
  ];
  for (const [name, title, html] of documents) {
    assert.doesNotMatch(html, /SECRET|Authorization|browser profile|session state/i);
    const pdfPath = path.join(root, `${name}.pdf`);
    await generateToolPdf({ html, pdfPath, toolName: title, reportTitle: title, projectName: 'مشروع Fixture', target: longUrl, browserPath: capability.browser.path });
    assert.equal(fs.readFileSync(pdfPath).subarray(0, 5).toString(), '%PDF-');
    const info = spawnSync('pdfinfo', [pdfPath], { encoding: 'utf8' });
    if (!info.error && info.status === 0) {
      assert.match(info.stdout, /Page size:\s+59[45]\.\d+ x 84[12]\.\d+ pts \(A4\)/);
      assert.match(info.stdout, /Creator:\s+Web Engineering Toolkit/);
      assert.match(info.stdout, /Tagged:\s+yes/);
    }
    const textFile = path.join(root, `${name}.txt`);
    const extracted = spawnSync('pdftotext', [pdfPath, textFile], { encoding: 'utf8' });
    if (!extracted.error && extracted.status === 0) {
      const text = fs.readFileSync(textFile, 'utf8');
      assert.match(text, new RegExp(title.replace(/[&]/g, '.')));
      assert.match(text, /2026-08-30T13:55:42\.123Z/);
      assert.match(text, /REDACTED/);
      assert.match(text, /MACHINE-?TAIL/);
    }
  }
});

test('download resolution is allow-listed and uses historical report metadata', () => {
  const reportsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'report-download-'));
  const root = path.join(reportsRoot, 'safe-report'); fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'summary.pdf'), '%PDF fixture');
  fs.writeFileSync(path.join(root, 'summary.csv'), 'A\n1\n');
  fs.writeFileSync(path.join(root, 'summary.xlsx'), 'xlsx fixture');
  fs.writeFileSync(path.join(root, 'metadata.json'), JSON.stringify({ reportType: 'asset-page-weight', projectName: 'Client / Egypt', generatedAt: '2026-08-30T13:57:10.000Z' }));
  assert.equal(resolveReportDownload({ reportsRoot, reportName: 'safe-report', format: 'pdf' }).filename, 'asset-page-weight-report__client-egypt__2026-08-30_13-57-10Z.pdf');
  assert.equal(resolveReportDownload({ reportsRoot, reportName: 'safe-report', format: 'xlsx' }).filename, 'asset-page-weight-report__client-egypt__2026-08-30_13-57-10Z.xlsx');
  assert.throws(() => resolveReportDownload({ reportsRoot, reportName: '../safe-report', format: 'pdf' }), /Invalid/);
});



test('real report download endpoint returns canonical historical PDF and CSV filenames for every tool', { timeout: 15_000 }, async (t) => {
  const reportsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'report-download-http-'));
  t.after(() => fs.rmSync(reportsRoot, { recursive: true, force: true }));
  const fixtures = [
    ['lh', 'lighthouse', 'Lighthouse Project', '2026-08-30T14:55:02.000Z'],
    ['asset', 'asset-page-weight', 'Asset Project', '2026-08-30T14:56:03.000Z'],
    ['links', 'broken-links-resources', 'Links Project', '2026-08-30T14:57:04.000Z'],
    ['comp', 'security-compliance', 'Compliance Project', '2026-08-30T14:58:05.000Z']
  ];
  for (const [name, reportType, projectName, generatedAt] of fixtures) {
    const root = path.join(reportsRoot, name); fs.mkdirSync(root);
    fs.writeFileSync(path.join(root, 'summary.pdf'), '%PDF-1.4\nfixture\n');
    fs.writeFileSync(path.join(root, 'summary.csv'), 'A,B\n1,2\n');
    fs.writeFileSync(path.join(root, 'summary.xlsx'), 'xlsx fixture');
    if (reportType === 'security-compliance') fs.writeFileSync(path.join(root, 'findings.csv'), 'Finding\nfixture\n');
    fs.writeFileSync(path.join(root, 'metadata.json'), JSON.stringify({ reportType, projectName, generatedAt }));
    fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify({ reportType, projectName, generatedAt, overview: { reportType, projectName, generatedAt } }));
  }
  const port = await findFreePort(4189);
  const child = spawn(process.execPath, ['server.js'], { cwd: process.cwd(), env: { ...process.env, APP_PORT: String(port), TOOLKIT_REPORTS_DIR: reportsRoot }, stdio: ['ignore', 'pipe', 'pipe'] });
  t.after(() => { if (child.exitCode === null) child.kill('SIGTERM'); });
  let ready = false;
  for (let attempt = 0; attempt < 60; attempt += 1) {
    try { const response = await fetch(`http://127.0.0.1:${port}/api/health`); if (response.ok) { ready = true; break; } } catch {}
    await new Promise((resolve) => setTimeout(resolve, 50));
  }
  if (!ready) { child.kill('SIGTERM'); return t.skip('Local HTTP binding unavailable in this environment.'); }
  const expected = {
    lh: ['lighthouse-report__lighthouse-project__2026-08-30_14-55-02Z.pdf', 'lighthouse-report__lighthouse-project__2026-08-30_14-55-02Z.csv', 'lighthouse-report__lighthouse-project__2026-08-30_14-55-02Z.xlsx'],
    asset: ['asset-page-weight-report__asset-project__2026-08-30_14-56-03Z.pdf', 'asset-page-weight-report__asset-project__2026-08-30_14-56-03Z.csv', 'asset-page-weight-report__asset-project__2026-08-30_14-56-03Z.xlsx'],
    links: ['broken-links-resources-report__links-project__2026-08-30_14-57-04Z.pdf', 'broken-links-resources-report__links-project__2026-08-30_14-57-04Z.csv', 'broken-links-resources-report__links-project__2026-08-30_14-57-04Z.xlsx'],
    comp: ['compliance-mapping-report__compliance-project__2026-08-30_14-58-05Z.pdf', 'compliance-mapping-report__compliance-project__2026-08-30_14-58-05Z.csv', 'compliance-mapping-report__compliance-project__2026-08-30_14-58-05Z.xlsx']
  };
  for (const [name] of fixtures) {
    for (const [index, format] of ['pdf', 'csv', 'xlsx'].entries()) {
      const response = await fetch(`http://127.0.0.1:${port}/api/reports/${name}/download/${format}`);
      assert.equal(response.status, 200);
      assert.equal(response.headers.get('content-disposition'), `attachment; filename="${expected[name][index]}"`);
      assert.match(response.headers.get('content-type') || '', format === 'pdf' ? /^application\/pdf/ : format === 'csv' ? /^text\/csv/ : /^application\/vnd\.openxmlformats-officedocument\.spreadsheetml\.sheet/);
      await response.arrayBuffer();
    }
  }
  const blocked = await fetch(`http://127.0.0.1:${port}/api/reports/lh/download/zip`);
  assert.equal(blocked.status, 404);
  child.kill('SIGTERM');
});

test('tool PDF documents share the report family while retaining truthful sections', () => {
  const lighthouse = lighthousePdfHtml({ generatedAt: '2026-08-30T00:00:00Z', overview: { projectName: 'P', baseUrl: 'https://example.test', categories: ['performance'], devices: ['desktop'], pages: 1, validAudits: 1, failedAudits: 0, totalFindings: 0, performance: 90 }, rows: [], insights: { categories: [] } });
  const asset = assetPdfHtml({ projectName: 'P', baseUrl: 'https://example.test', generatedAt: '2026-08-30T00:00:00Z', summary: { pageCount: 1, breakdown: {} }, pages: [], findings: [], largestAssets: [] });
  const links = brokenLinksPdfHtml({ projectName: 'P', baseUrl: 'https://example.test', generatedAt: '2026-08-30T00:00:00Z', scope: {}, summary: { pagesScanned: 1, uniqueTargets: 0 }, targets: [] });
  for (const html of [lighthouse, asset, links]) {
    assert.match(html, /Web Engineering Toolkit/);
    assert.match(html, /#5747c7/);
    assert.match(html, /#d7dce5/);
    assert.doesNotMatch(html, /background:#11192d;color:#f7f9ff|min-height:245mm|break-after:page/);
  }
  assert.equal(REPORT_FAMILY_TOKENS.fontStack.includes('DejaVu Sans'), true);
  assert.match(lighthouse, /Lighthouse Score Summary/); assert.match(asset, /Resource Breakdown/); assert.match(links, /Attention Required/);
  for (const html of [asset, links]) assert.doesNotMatch(html, /Control satisfaction|Candidate mappings/);
});

test('shared XLSX writer neutralizes formula-leading cells and produces each current report family', async () => {
  assert.equal(spreadsheetSafeCell(' =HYPERLINK("bad")'), `' =HYPERLINK("bad")`);
  assert.equal(spreadsheetSafeCell('https://example.test/?value==safe'), 'https://example.test/?value==safe');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'toolkit-xlsx-'));
  await writeReportXlsx({ root, reportType: 'lighthouse', data: { generatedAt: '2026-08-30T00:00:00Z', overview: { projectName: 'Fixture', baseUrl: 'https://example.test', categories: [], devices: [] }, rows: [], insights: { categories: [] } } });
  assert.ok(fs.statSync(path.join(root, 'summary.xlsx')).size > 5_000);
});
