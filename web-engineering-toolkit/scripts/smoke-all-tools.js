import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';
import { analyzeWebsiteAssets } from '../lib/asset-analyzer.js';
import { AssetReportManager } from '../lib/asset-report-manager.js';
import { detectBrowsers } from '../lib/environment-checker.js';
import { runSingleLighthouse } from '../lib/lighthouse-runner.js';
import { ReportManager } from '../lib/report-manager.js';
import { SecurityReportManager } from '../lib/security-report-manager.js';
import { scanWebsiteSecurity } from '../lib/security-scanner.js';
import { ensureDir, findFreePort } from '../lib/utils.js';
import { startSecurityLab } from '../test/fixtures/security-lab-server.js';

const keep = process.argv.includes('--keep');
const root = fs.mkdtempSync(path.join(os.tmpdir(), 'web-toolkit-smoke-'));
const reportsRoot = ensureDir(path.join(root, 'reports'));
const lab = await startSecurityLab();
let browserProcess;

async function startCdpBrowser(executablePath) {
  const port = await findFreePort(9333);
  const profile = fs.mkdtempSync(path.join(root, 'lighthouse-profile-'));
  browserProcess = spawn(executablePath, [
    '--headless=new', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`,
    '--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check', 'about:blank'
  ], { stdio: 'ignore' });
  for (let attempt = 0; attempt < 50; attempt += 1) {
    try {
      const response = await fetch(`http://127.0.0.1:${port}/json/version`, { signal: AbortSignal.timeout(500) });
      if (response.ok) return port;
    } catch {}
    await new Promise((resolve) => setTimeout(resolve, 100));
  }
  throw new Error('Headless browser did not expose the Lighthouse debugging endpoint.');
}

try {
  const browsers = await detectBrowsers();
  if (!browsers[0]?.path) throw new Error('No compatible browser is available for smoke testing.');
  const browserPath = browsers[0].path;

  const complianceScanStarted = performance.now();
  const assessment = await scanWebsiteSecurity({
    projectName: 'Toolkit Compliance Smoke', targetUrl: `${lab.baseUrl}/weak-cookies`,
    frameworks: ['iso-27001', 'gdpr', 'soc-2'], crawl: false,
    frameworkApplicability: { gdpr: 'unknown' }, preferredBrowserPath: browserPath
  });
  const complianceReportStarted = performance.now();
  const compliance = await new SecurityReportManager({ reportsRoot, browserPath }).save(assessment);
  const complianceReportMs = Math.round(performance.now() - complianceReportStarted);
  const complianceRoot = path.join(reportsRoot, compliance.reportName);

  const assetStarted = performance.now();
  const assetAssessment = await analyzeWebsiteAssets({ projectName: 'Toolkit Asset Smoke', baseUrl: lab.baseUrl, paths: ['/'], device: 'desktop', preferredBrowserPath: browserPath });
  const asset = await new AssetReportManager({ reportsRoot }).save(assetAssessment);
  const assetMs = Math.round(performance.now() - assetStarted);

  const lighthouseStarted = performance.now();
  const debugPort = await startCdpBrowser(browserPath);
  const lighthouseManager = new ReportManager({ reportsRoot });
  const lighthouseConfig = { projectName: 'Toolkit Lighthouse Smoke', baseUrl: lab.baseUrl, mode: 'public', targetLanguage: 'en', defaultLanguage: 'en', devices: ['desktop'], categories: ['accessibility'], runsPerPage: 1, urls: ['/'] };
  const { root: lighthouseRoot, runName: lighthouseReportName } = lighthouseManager.createRunDirectory(lighthouseConfig);
  lighthouseManager.writeMetadata(lighthouseRoot, lighthouseConfig, { browser: browsers[0].name, debugPort });
  const lighthouseRecord = await runSingleLighthouse({ config: lighthouseConfig, port: debugPort, root: lighthouseRoot, device: 'desktop', logicalPath: '/', iteration: 1 });
  lighthouseManager.writeManifest(lighthouseRoot, [lighthouseRecord]);
  const lighthouse = await lighthouseManager.generateSummary(lighthouseRoot, [lighthouseRecord], lighthouseConfig);

  const pdfPath = path.join(complianceRoot, 'summary.pdf');
  const manifest = JSON.parse(fs.readFileSync(path.join(complianceRoot, 'report-manifest.json'), 'utf8'));
  const result = {
    outputRoot: root,
    browser: browsers[0],
    compliance: {
      reportName: compliance.reportName, status: 'completed', findings: compliance.findings.length,
      html: fs.existsSync(path.join(complianceRoot, 'summary.html')), json: fs.existsSync(path.join(complianceRoot, 'summary.json')),
      findingsCsv: fs.existsSync(path.join(complianceRoot, 'findings.csv')), xlsx: fs.existsSync(path.join(complianceRoot, 'summary.xlsx')),
      pdf: fs.existsSync(pdfPath), pdfBytes: fs.statSync(pdfPath).size, manifest: manifest.files.some((entry) => entry.file === 'summary.pdf'),
      evidenceAccess: compliance.evidenceManifest.access, assessmentMs: Math.round(complianceReportStarted - complianceScanStarted),
      reportMs: complianceReportMs, htmlMs: compliance.reportGeneration?.htmlGenerationMs, pdfMs: compliance.pdfGeneration?.durationMs
    },
    lighthouse: {
      reportName: lighthouseReportName, status: lighthouseRecord.status, completed: lighthouse.overview.totalAudits === 1,
      report: fs.existsSync(path.join(lighthouseRoot, 'summary.html')), accessibility: lighthouse.overview.accessibility,
      durationMs: Math.round(performance.now() - lighthouseStarted)
    },
    asset: {
      reportName: asset.reportName, status: 'completed', pages: assetAssessment.pages.length,
      metrics: assetAssessment.summary.totalRequests >= 1, report: fs.existsSync(path.join(reportsRoot, asset.reportName, 'summary.html')),
      durationMs: assetMs
    }
  };
  console.log(JSON.stringify(result, null, 2));
} finally {
  if (browserProcess && browserProcess.exitCode === null) browserProcess.kill('SIGTERM');
  await lab.close();
  if (!keep) fs.rmSync(root, { recursive: true, force: true });
}
