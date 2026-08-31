import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { analyzeWebsiteAssets } from '../lib/asset-analyzer.js';
import { AssetReportManager } from '../lib/asset-report-manager.js';
import { checkBrokenLinksAndResources } from '../lib/broken-links-checker.js';
import { BrokenLinksReportManager } from '../lib/broken-links-report-manager.js';
import { browserSkipCode, browserSkipReason, detectBrowserCapabilities } from '../lib/browser-capability.js';
import { runSingleLighthouse } from '../lib/lighthouse-runner.js';
import { ReportManager } from '../lib/report-manager.js';
import { SecurityReportManager } from '../lib/security-report-manager.js';
import { scanWebsiteSecurity } from '../lib/security-scanner.js';
import { ensureDir, findFreePort } from '../lib/utils.js';
import { startSecurityLab } from '../test/fixtures/security-lab-server.js';
import { startBrokenLinksLab } from '../test/fixtures/broken-links-lab-server.js';

const keep = process.argv.includes('--keep');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'web-toolkit-smoke-'));
const reportsRoot = ensureDir(path.join(root, 'reports'));
const browserProcesses = [];
let lab;
let linksLab;

async function startCdpBrowser(executablePath) {
  const port = await findFreePort(9333);
  const profile = fs.mkdtempSync(path.join(root, 'lighthouse-profile-'));
  const processHandle = spawn(executablePath, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', 'about:blank'
  ], { stdio: 'ignore' });
  browserProcesses.push(processHandle);
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return port;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Headless browser did not expose the Lighthouse debugging endpoint.');
}

function skipped(reason) {
  return { status: 'skipped', reason };
}

async function captureTool(name, operation) {
  try {
    return { status: 'passed', ...(await operation()) };
  } catch (error) {
    return { status: 'failed', reason: 'application_error', error: String(error?.stack || error?.message || error), tool: name };
  }
}

function assertExportSet(reportRoot, required) {
  if (!required.every((file) => fs.existsSync(path.join(reportRoot, file)))) throw new Error(`Report exports are incomplete: ${required.join(', ')}.`);
}

async function stopBrowserProcess(processHandle) {
  if (!processHandle || processHandle.exitCode !== null) return;
  const exited = new Promise((resolve) => processHandle.once('exit', resolve));
  processHandle.kill('SIGTERM');
  await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 2000))]);
  if (processHandle.exitCode === null) {
    processHandle.kill('SIGKILL');
    await Promise.race([exited, new Promise((resolve) => setTimeout(resolve, 1000))]);
  }
}

const result = {
  outputRoot: root,
  environment: { browserDetected: false, browserLaunch: 'not_tested', navigation: 'not_tested', pdfRendering: 'not_tested' },
  compliance: skipped('environment_not_checked'),
  lighthouse: skipped('environment_not_checked'),
  asset: skipped('environment_not_checked'),
  links: skipped('environment_not_checked')
};

try {
  lab = await startSecurityLab();
  linksLab = await startBrokenLinksLab();
  const capability = await detectBrowserCapabilities({ fixtureUrl: `${lab.baseUrl}/secure-corporate` });
  result.environment = {
    browserDetected: capability.browserDetected,
    browser: capability.browser,
    browserLaunch: capability.launch,
    navigation: capability.navigation,
    pdfSourceNavigation: capability.pdfSourceNavigation,
    pdfRendering: capability.pdfRendering,
    reasons: capability.reasons
  };

  const navigationReason = browserSkipReason(capability, 'navigation');
  const pdfReason = browserSkipReason(capability, 'pdf');
  const navigationReasonCode = browserSkipCode(capability, 'navigation');
  const pdfReasonCode = browserSkipCode(capability, 'pdf');
  const browserPath = capability.browser?.path || '';

  result.compliance = navigationReason || pdfReason ? skipped(navigationReasonCode || pdfReasonCode) : await captureTool('compliance', async () => {
    const assessmentStarted = performance.now();
    const assessment = await scanWebsiteSecurity({ projectName: 'Toolkit Compliance Smoke', targetUrl: `${lab.baseUrl}/weak-security`, frameworks: ['iso-27001', 'gdpr', 'soc-2'], crawl: false, frameworkApplicability: { gdpr: 'unknown' }, browserRetryCount: 0, browserTimeoutMs: 8_000 });
    const reportStarted = performance.now();
    const compliance = await new SecurityReportManager({ reportsRoot, browserPath }).save(assessment);
    const reportMs = Math.round(performance.now() - reportStarted);
    const reportRoot = path.join(reportsRoot, compliance.reportName);
    const pdfPath = path.join(reportRoot, 'summary.pdf');
    const manifest = JSON.parse(fs.readFileSync(path.join(reportRoot, 'report-manifest.json'), 'utf8'));
    const required = ['summary.html', 'summary.json', 'findings.csv', 'summary.xlsx', 'summary.pdf'];
    assertExportSet(reportRoot, required);
    return { reportName: compliance.reportName, findings: compliance.findings.length, html: true, json: true, csv: true, xlsx: true, pdf: true, pdfBytes: fs.statSync(pdfPath).size, manifest: manifest.files.some((entry) => entry.file === 'summary.pdf') && manifest.files.some((entry) => entry.file === 'summary.xlsx'), evidenceAccess: compliance.evidenceManifest.access, assessmentMs: Math.round(reportStarted - assessmentStarted), reportMs, htmlMs: compliance.reportGeneration?.htmlGenerationMs, pdfMs: compliance.pdfGeneration?.durationMs };
  });

  result.asset = navigationReason ? skipped(navigationReasonCode) : await captureTool('asset', async () => {
    const started = performance.now();
    const assessment = await analyzeWebsiteAssets({ projectName: 'Toolkit Asset Smoke', baseUrl: lab.baseUrl, paths: ['/secure-corporate'], device: 'desktop', preferredBrowserPath: browserPath });
    const asset = await new AssetReportManager({ reportsRoot }).save(assessment);
    const reportRoot = path.join(reportsRoot, asset.reportName);
    if (!assessment.pages.length || assessment.summary.totalRequests < 1) throw new Error('Asset smoke produced no page metrics.');
    assertExportSet(reportRoot, ['summary.html', 'summary.csv', 'summary.xlsx', 'summary.pdf']);
    return { reportName: asset.reportName, pages: assessment.pages.length, metrics: true, report: true, csv: true, xlsx: true, pdf: true, pdfBytes: fs.statSync(path.join(reportRoot, 'summary.pdf')).size, pdfMs: asset.pdfGeneration?.durationMs, durationMs: Math.round(performance.now() - started) };
  });

  result.links = navigationReason ? skipped(navigationReasonCode) : await captureTool('links', async () => {
    const started = performance.now();
    const assessment = await checkBrokenLinksAndResources({ projectName: 'Toolkit Broken Links Smoke', baseUrl: linksLab.baseUrl, startingPages: ['/', '/page-two'], scanScope: 'selected', maxPages: 5, maxTargets: 200, timeoutMs: 150, concurrency: 4, maxRedirects: 4, preferredBrowserPath: browserPath });
    const saved = await new BrokenLinksReportManager({ reportsRoot }).save(assessment);
    const reportRoot = path.join(reportsRoot, saved.reportName);
    const required = ['summary.html', 'summary.json', 'summary.csv', 'summary.xlsx', 'summary.pdf', 'metadata.json'];
    assertExportSet(reportRoot, required);
    if (!assessment.targets.length || assessment.summary.broken < 1 || !assessment.targets.some((target) => target.outcome === 'redirected')) throw new Error('Broken Links smoke did not exercise broken and redirected classifications.');
    return { reportName: saved.reportName, pages: assessment.summary.pagesScanned, targets: assessment.summary.uniqueTargets, broken: assessment.summary.broken, redirected: assessment.summary.redirected, report: true, csv: true, xlsx: true, pdf: true, pdfBytes: fs.statSync(path.join(reportRoot, 'summary.pdf')).size, pdfMs: saved.pdfGeneration?.durationMs, durationMs: Math.round(performance.now() - started) };
  });

  result.lighthouse = navigationReason ? skipped(navigationReasonCode) : await captureTool('lighthouse', async () => {
    const started = performance.now();
    const debugPort = await startCdpBrowser(browserPath);
    const manager = new ReportManager({ reportsRoot });
    const config = { projectName: 'Toolkit Lighthouse Smoke', baseUrl: lab.baseUrl, mode: 'public', targetLanguage: 'en', defaultLanguage: 'en', devices: ['desktop'], categories: ['accessibility'], runsPerPage: 1, urls: ['/secure-corporate'] };
    const { root: reportRoot, runName: reportName } = manager.createRunDirectory(config);
    manager.writeMetadata(reportRoot, config, { browser: capability.browser.name, debugPort });
    const record = await runSingleLighthouse({ config, port: debugPort, root: reportRoot, device: 'desktop', logicalPath: '/secure-corporate', iteration: 1 });
    manager.writeManifest(reportRoot, [record]);
    const summary = await manager.generateSummary(reportRoot, [record], config);
    if (summary.overview.totalAudits !== 1 || !Number.isFinite(summary.overview.accessibility)) throw new Error('Lighthouse smoke did not produce the configured accessibility score.');
    assertExportSet(reportRoot, ['summary.html', 'summary.csv', 'summary.xlsx', 'summary.pdf']);
    return { reportName, runStatus: record.status, completed: true, report: true, csv: true, xlsx: true, pdf: true, pdfBytes: fs.statSync(path.join(reportRoot, 'summary.pdf')).size, pdfMs: summary.pdfGeneration?.durationMs, accessibility: summary.overview.accessibility, durationMs: Math.round(performance.now() - started) };
  });
} catch (error) {
  result.environment.setupError = String(error?.stack || error?.message || error);
  for (const tool of ['compliance', 'lighthouse', 'asset', 'links']) if (result[tool].reason === 'environment_not_checked') result[tool] = { status: 'failed', reason: 'environment_setup_failed', error: result.environment.setupError };
} finally {
  await Promise.all(browserProcesses.map(stopBrowserProcess));
  await lab?.close().catch(() => {});
  await linksLab?.close().catch(() => {});
  console.log(JSON.stringify(result, null, 2));
  if (!keep) fs.rmSync(root, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
}

if (['compliance', 'lighthouse', 'asset', 'links'].some((tool) => result[tool].status === 'failed')) process.exitCode = 1;
