import crypto from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { spawn } from 'node:child_process';

const ZAP_IMAGE = 'ghcr.io/zaproxy/zaproxy:stable';
const ZAP_REFERENCE = 'https://www.zaproxy.org/docs/docker/';

function hash(parts) {
  return crypto.createHash('sha256').update(parts.filter(Boolean).join('|')).digest('hex');
}

function runProcess(command, args, { timeoutMs }) {
  return new Promise((resolve) => {
    const child = spawn(command, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    const append = (current, chunk) => `${current}${chunk.toString()}`.slice(-2_000_000);
    child.stdout.on('data', (chunk) => { stdout = append(stdout, chunk); });
    child.stderr.on('data', (chunk) => { stderr = append(stderr, chunk); });
    child.once('error', (error) => resolve({ exitCode: null, stdout, stderr, error: error.message, timedOut: false }));
    const timer = setTimeout(() => {
      timedOut = true;
      child.kill('SIGTERM');
      setTimeout(() => { if (child.exitCode === null) child.kill('SIGKILL'); }, 3000).unref();
    }, timeoutMs);
    child.once('exit', (exitCode) => {
      clearTimeout(timer);
      resolve({ exitCode, stdout, stderr, error: '', timedOut });
    });
  });
}

function severityFor(alert) {
  const riskCode = Number(alert.riskcode);
  if (riskCode >= 4) return 'critical';
  if (riskCode === 3) return 'high';
  if (riskCode === 2) return 'medium';
  if (riskCode === 1) return 'low';
  const risk = String(alert.riskdesc || alert.risk || '').toLowerCase();
  if (risk.includes('high')) return 'high';
  if (risk.includes('medium')) return 'medium';
  if (risk.includes('low')) return 'low';
  return 'informational';
}

function confidenceFor(alert) {
  const value = String(alert.confidence || '').toLowerCase();
  if (value.includes('high') || value === '3') return 'confirmed';
  if (value.includes('medium') || value === '2') return 'observed';
  return 'inferred';
}

function referencesFor(alert) {
  return [...new Set([...(String(alert.reference || '').match(/https?:\/\/[^\s]+/g) || []), ZAP_REFERENCE])];
}

export function normalizeZapAlerts(report = {}, { generatedAt = new Date().toISOString(), toolVersion = 'OWASP ZAP stable container' } = {}) {
  const alerts = (report.site || []).flatMap((site) => (site.alerts || []).map((alert) => ({ ...alert, siteName: site['@name'] || site.name || '' })));
  return alerts.map((alert) => {
    const instance = (alert.instances || [])[0] || {};
    const pluginId = String(alert.pluginid || alert.alertRef || alert.sourceid || 'UNKNOWN');
    const affectedUrl = instance.uri || alert.url || alert.siteName || '';
    const rawEvidence = [instance.method, instance.uri, instance.param ? `parameter=${instance.param}` : '', instance.evidence ? `evidence=${instance.evidence}` : '', instance.attack ? `attack=${instance.attack}` : ''].filter(Boolean).join(' | ');
    return {
      schemaVersion: '1.0.0',
      id: `ZAP_${pluginId.replace(/[^A-Za-z0-9]+/g, '_')}`,
      fingerprint: hash([pluginId, affectedUrl, instance.param, instance.evidence]),
      title: alert.alert || alert.name || `ZAP alert ${pluginId}`,
      category: 'OWASP ZAP',
      severity: severityFor(alert),
      confidence: confidenceFor(alert),
      status: 'open',
      affectedUrl,
      evidence: { type: 'zap_alert', raw: rawEvidence || alert.evidence || alert.otherinfo || '', artifactId: 'zap-json-report' },
      impact: alert.desc || alert.otherinfo || 'ZAP reported a condition that may affect application security.',
      recommendation: alert.solution || 'Review the ZAP alert and remediate the underlying condition.',
      references: referencesFor(alert),
      controls: [],
      firstSeen: generatedAt,
      lastSeen: generatedAt,
      testMethod: `OWASP ZAP plugin ${pluginId}`,
      toolVersion,
      limitations: ['Imported from ZAP; validate exploitability, application context, and false-positive status before remediation or risk acceptance.'],
      source: 'zap',
      sourceCheckId: pluginId,
      cweId: String(alert.cweid || ''),
      wascId: String(alert.wascid || ''),
      instances: alert.instances || []
    };
  });
}

export async function runZapScan(config = {}, targetUrl) {
  const mode = String(config.mode || 'none');
  if (mode === 'none') return { enabled: false, mode, state: 'not_tested', stateLabel: 'Not Tested', findings: [] };
  if (!['passive', 'authenticated-passive', 'active', 'api'].includes(mode)) throw new Error('Unsupported ZAP scan mode.');
  if (['active', 'api'].includes(mode) && config.activeScanAuthorized !== true) throw new Error('Active ZAP and API scans require explicit authorization acknowledgement.');
  if (mode === 'authenticated-passive' && (!config.contextFile || !config.contextUser)) throw new Error('Authenticated passive ZAP scanning requires a ZAP context file and context user.');
  if (mode === 'api' && !config.apiDefinition) throw new Error('ZAP API scanning requires an OpenAPI, SOAP, or GraphQL definition URL.');

  const timeoutMinutes = Math.max(2, Math.min(180, Number(config.timeoutMinutes) || (mode === 'passive' ? 10 : 30)));
  let contextSource = '';
  if (mode === 'authenticated-passive') {
    contextSource = path.resolve(String(config.contextFile));
    if (!fs.existsSync(contextSource) || !fs.statSync(contextSource).isFile()) throw new Error('The configured ZAP context file does not exist.');
  }
  const workDir = fs.mkdtempSync(path.join(os.tmpdir(), 'web-toolkit-zap-'));
  fs.chmodSync(workDir, 0o777);
  const reportFile = path.join(workDir, 'zap-report.json');
  const mount = `${workDir}:/zap/wrk/:rw`;
  const args = ['run', '--rm', '-v', mount, '-t', ZAP_IMAGE];
  if (mode === 'api') {
    args.push('zap-api-scan.py', '-t', String(config.apiDefinition), '-f', String(config.apiFormat || 'openapi'), '-J', 'zap-report.json', '-I', '-T', String(timeoutMinutes));
  } else {
    args.push(mode === 'active' ? 'zap-full-scan.py' : 'zap-baseline.py', '-t', targetUrl, '-J', 'zap-report.json', '-I', '-T', String(timeoutMinutes));
    if (mode !== 'active') args.push('-m', String(Math.max(1, Math.min(10, Number(config.spiderMinutes) || 1))));
  }
  try {
    if (mode === 'authenticated-passive') {
      fs.copyFileSync(contextSource, path.join(workDir, 'scan.context'));
      args.push('-n', '/zap/wrk/scan.context', '-U', String(config.contextUser));
    }
    const execution = await runProcess('docker', args, { timeoutMs: timeoutMinutes * 60_000 + 30_000 });
    let rawReport = null;
    if (fs.existsSync(reportFile)) {
      try { rawReport = JSON.parse(fs.readFileSync(reportFile, 'utf8')); } catch {}
    }
    const findings = rawReport ? normalizeZapAlerts(rawReport, { generatedAt: new Date().toISOString() }) : [];
    const completed = Boolean(rawReport) && !execution.timedOut && execution.exitCode !== 3;
    return {
      enabled: true,
      mode,
      image: ZAP_IMAGE,
      state: completed ? 'confirmed' : findings.length ? 'observed' : 'failed_to_test',
      stateLabel: completed ? 'Confirmed' : findings.length ? 'Observed' : 'Failed To Test',
      exitCode: execution.exitCode,
      timedOut: execution.timedOut,
      error: execution.error || (!rawReport ? execution.stderr.slice(-1000) || 'ZAP did not produce a JSON report.' : ''),
      alertCount: findings.length,
      findings,
      rawReport,
      stdout: execution.stdout,
      stderr: execution.stderr,
      limitations: mode === 'authenticated-passive' ? ['Authentication is controlled by the supplied ZAP context and user, not by the Playwright browser session.'] : []
    };
  } finally {
    fs.rmSync(workDir, { recursive: true, force: true });
  }
}
