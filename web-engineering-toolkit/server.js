import http from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { runEnvironmentCheck } from './lib/environment-checker.js';
import { BrowserManager } from './lib/browser-manager.js';
import { ReportManager } from './lib/report-manager.js';
import { RunManager } from './lib/run-manager.js';
import { scanWebsiteSecurity } from './lib/security-scanner.js';
import { SecurityReportManager } from './lib/security-report-manager.js';
import { ProjectManager } from './lib/project-manager.js';
import { analyzeWebsiteAssets } from './lib/asset-analyzer.js';
import { AssetReportManager } from './lib/asset-report-manager.js';
import { SecuritySessionStore } from './lib/security-session-store.js';
import { EvidenceVault } from './lib/evidence-vault.js';
import { SecurityLifecycleManager } from './lib/security-lifecycle-manager.js';
import { contentTypeForFile } from './lib/mime-types.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PUBLIC_DIR = path.join(__dirname, 'public');
const REPORTS_DIR = path.join(__dirname, 'reports');
const PROFILES_DIR = path.join(__dirname, 'profiles');
const FLOWS_DIR = path.join(__dirname, 'flows');
const DATA_DIR = path.join(__dirname, 'data');
const PORT = Number(process.env.APP_PORT || 4177);

const browserManager = new BrowserManager({ profilesDir: PROFILES_DIR });
const reportManager = new ReportManager({ reportsRoot: REPORTS_DIR });
const runManager = new RunManager({ browserManager, reportManager, flowsDir: FLOWS_DIR });
const evidenceVault = new EvidenceVault({ dataDir: DATA_DIR });
const securityLifecycleManager = new SecurityLifecycleManager({ dataDir: DATA_DIR, audit: (event) => evidenceVault.audit(event) });
const securityReportManager = new SecurityReportManager({ reportsRoot: REPORTS_DIR, evidenceVault, lifecycleManager: securityLifecycleManager });
const projectManager = new ProjectManager({ dataDir: DATA_DIR });
const assetReportManager = new AssetReportManager({ reportsRoot: REPORTS_DIR });
const securitySessionStore = new SecuritySessionStore({ root: path.join(PROFILES_DIR, 'security-scanner') });
const executeSecurityScan = async (config) => securityReportManager.save(securityLifecycleManager.reconcile(await scanWebsiteSecurity(config, { sessionStore: securitySessionStore })));

function json(res, status, data) {
  const body = JSON.stringify(data);
  res.writeHead(status, { 'Content-Type': 'application/json; charset=utf-8', 'Content-Length': Buffer.byteLength(body) });
  res.end(body);
}

async function readBody(req) {
  let body = '';
  for await (const chunk of req) {
    body += chunk;
    if (body.length > 2_000_000) throw new Error('Request body too large.');
  }
  return body ? JSON.parse(body) : {};
}

function safeFile(base, pathname) {
  const decoded = decodeURIComponent(pathname);
  const normalized = path.normalize(decoded).replace(/^(\.\.(\/|\\|$))+/, '');
  const full = path.join(base, normalized);
  return full.startsWith(base) ? full : null;
}

function sendFile(res, file) {
  if (!file || !fs.existsSync(file) || !fs.statSync(file).isFile()) {
    res.writeHead(404); res.end('Not found'); return;
  }
  res.writeHead(200, { 'Content-Type': contentTypeForFile(file) });
  fs.createReadStream(file).pipe(res);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  try {
    if (req.method === 'GET' && url.pathname === '/api/health') {
      return json(res, 200, await runEnvironmentCheck({ targetUrl: url.searchParams.get('target') || '', reportsDir: REPORTS_DIR }));
    }
    if (req.method === 'GET' && url.pathname === '/api/browser/status') {
      return json(res, 200, await browserManager.status());
    }
    if (req.method === 'POST' && url.pathname === '/api/browser/start') {
      return json(res, 200, await browserManager.start(await readBody(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/browser/stop') {
      return json(res, 200, browserManager.stop());
    }
    if (req.method === 'POST' && url.pathname === '/api/runs') {
      return json(res, 202, runManager.create(await readBody(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/security/scan') {
      const config = await readBody(req);
      const zapMode = config.zap?.mode || 'none';
      if (!['none', 'passive', 'authenticated-passive'].includes(zapMode)) {
        return json(res, 400, { error: 'Compliance Mapping supports ZAP modes: none, passive, and authenticated-passive.' });
      }
      return json(res, 200, await executeSecurityScan(config));
    }
    if (req.method === 'GET' && url.pathname === '/api/security/evidence') {
      return json(res, 200, evidenceVault.list({ projectName: url.searchParams.get('project') || '' }));
    }
    if (req.method === 'GET' && url.pathname === '/api/security/audit-log') {
      return json(res, 200, evidenceVault.auditLog({ projectName: url.searchParams.get('project') || '', limit: url.searchParams.get('limit') || 250 }));
    }
    if (req.method === 'GET' && url.pathname === '/api/security/findings') {
      return json(res, 200, securityLifecycleManager.list(url.searchParams.get('project') || ''));
    }
    const findingReviewCollectionMatch = url.pathname.match(/^\/api\/security\/findings\/([a-f0-9]{64})\/reviews$/);
    if (req.method === 'POST' && findingReviewCollectionMatch) {
      const finding = securityLifecycleManager.addReview(findingReviewCollectionMatch[1], await readBody(req));
      const refreshedReports = await securityReportManager.refreshWorkflow({ projectName: finding.projectName });
      return json(res, 200, { ...finding, refreshedReports });
    }
    const findingReviewMatch = url.pathname.match(/^\/api\/security\/findings\/([a-f0-9]{64})\/reviews\/([a-f0-9-]+)$/);
    if (['PUT', 'PATCH'].includes(req.method) && findingReviewMatch) {
      const finding = securityLifecycleManager.updateReview(findingReviewMatch[1], findingReviewMatch[2], await readBody(req));
      const refreshedReports = await securityReportManager.refreshWorkflow({ projectName: finding.projectName });
      return json(res, 200, { ...finding, refreshedReports });
    }
    const findingLifecycleMatch = url.pathname.match(/^\/api\/security\/findings\/([a-f0-9]{64})$/);
    if (req.method === 'POST' && findingLifecycleMatch) {
      const finding = securityLifecycleManager.update(findingLifecycleMatch[1], await readBody(req));
      const refreshedReports = await securityReportManager.refreshWorkflow({ projectName: finding.projectName });
      return json(res, 200, { ...finding, refreshedReports });
    }
    if (req.method === 'POST' && url.pathname === '/api/assets/analyze') {
      const result = await analyzeWebsiteAssets(await readBody(req));
      return json(res, 200, await assetReportManager.save(result));
    }
    if (req.method === 'GET' && url.pathname === '/api/projects') {
      return json(res, 200, projectManager.list());
    }
    if (req.method === 'POST' && url.pathname === '/api/projects') {
      return json(res, 201, projectManager.create(await readBody(req)));
    }
    if (req.method === 'POST' && url.pathname === '/api/projects/active') {
      const body = await readBody(req);
      return json(res, 200, projectManager.setActive(String(body.id || '')));
    }
    const projectMatch = url.pathname.match(/^\/api\/projects\/([^/]+)$/);
    if (projectMatch && req.method === 'PUT') {
      return json(res, 200, projectManager.update(decodeURIComponent(projectMatch[1]), await readBody(req)));
    }
    if (projectMatch && req.method === 'DELETE') {
      return json(res, 200, projectManager.delete(decodeURIComponent(projectMatch[1])));
    }
    if (req.method === 'GET' && url.pathname === '/api/reports') {
      return json(res, 200, reportManager.listReports());
    }
    if (req.method === 'POST' && url.pathname === '/api/reports/delete') {
      const body = await readBody(req);
      const names = Array.isArray(body.names) ? body.names : [];
      if (!names.length) return json(res, 400, { error: 'Select at least one report to delete.' });
      const active = runManager.activeReportNames();
      const blocked = names.filter((name) => active.has(name));
      if (blocked.length) return json(res, 409, { error: `Cannot delete an active report: ${blocked.join(', ')}` });
      return json(res, 200, reportManager.deleteReports(names));
    }
    const runMatch = url.pathname.match(/^\/api\/runs\/([^/]+)$/);
    if (req.method === 'GET' && runMatch) {
      const job = runManager.get(runMatch[1]);
      return job ? json(res, 200, runManager.publicJob(job)) : json(res, 404, { error: 'Run not found.' });
    }
    const cancelMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/cancel$/);
    if (req.method === 'POST' && cancelMatch) {
      const job = runManager.cancel(cancelMatch[1]);
      return job ? json(res, 200, job) : json(res, 404, { error: 'Run not found.' });
    }
    const eventMatch = url.pathname.match(/^\/api\/runs\/([^/]+)\/events$/);
    if (req.method === 'GET' && eventMatch) {
      const job = runManager.get(eventMatch[1]);
      if (!job) return json(res, 404, { error: 'Run not found.' });
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
        'Access-Control-Allow-Origin': '*'
      });
      const send = (event) => res.write(`data: ${JSON.stringify(event)}\n\n`);
      send({ type: 'snapshot', job: runManager.publicJob(job) });
      const listener = (event) => send(event);
      job.emitter.on('event', listener);
      req.on('close', () => job.emitter.off('event', listener));
      return;
    }

    if (url.pathname.startsWith('/api/')) return json(res, 404, { error: 'API route not found.' });

    if (url.pathname.startsWith('/reports/')) {
      const relative = url.pathname.slice('/reports/'.length);
      const parts = decodeURIComponent(relative).split(/[\\/]+/);
      const evidenceIndex = parts.indexOf('evidence');
      const isEvidenceManifest = evidenceIndex === parts.length - 2 && parts.at(-1) === 'manifest.json';
      if (evidenceIndex !== -1 && !isEvidenceManifest) return json(res, 403, { error: 'Raw security evidence is restricted to local filesystem access.' });
      return sendFile(res, safeFile(REPORTS_DIR, relative));
    }

    const pathname = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
    const file = safeFile(PUBLIC_DIR, pathname);
    if (file && fs.existsSync(file) && fs.statSync(file).isFile()) return sendFile(res, file);
    return sendFile(res, path.join(PUBLIC_DIR, 'index.html'));
  } catch (error) {
    return json(res, 500, { error: error.message });
  }
});

server.on('error', (error) => {
  if (error.code === 'EADDRINUSE') {
    console.error(`Port ${PORT} is already in use. Set APP_PORT to another local port and start again.`);
  } else {
    console.error(error);
  }
  process.exit(1);
});

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Web Engineering Toolkit running at http://127.0.0.1:${PORT}`);
});
