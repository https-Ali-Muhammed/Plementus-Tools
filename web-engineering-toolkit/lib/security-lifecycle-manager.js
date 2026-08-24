import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './utils.js';

const STATUSES = new Set(['open', 'false_positive', 'suppressed', 'risk_accepted', 'resolved']);

export class SecurityLifecycleManager {
  constructor({ dataDir, audit = () => {} }) {
    ensureDir(dataDir);
    this.file = path.join(dataDir, 'security-finding-lifecycle.json');
    this.audit = audit;
    if (!fs.existsSync(this.file)) fs.writeFileSync(this.file, `${JSON.stringify({ version: 1, findings: [] }, null, 2)}\n`);
  }

  read() { try { return JSON.parse(fs.readFileSync(this.file, 'utf8')); } catch { return { version: 1, findings: [] }; } }
  write(data) { const temporary = `${this.file}.${process.pid}.tmp`; fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`); fs.renameSync(temporary, this.file); }

  reconcile(summary) {
    const data = this.read();
    const projectName = summary.projectName;
    const priorOpen = data.findings.filter((item) => item.projectName === projectName && item.status === 'open');
    const seen = new Set();
    const comparison = { new: [], recurring: [], resolved: [] };
    for (const finding of summary.findings || []) {
      seen.add(finding.fingerprint);
      let record = data.findings.find((item) => item.projectName === projectName && item.fingerprint === finding.fingerprint);
      if (record) {
        finding.firstSeen = record.firstSeen;
        finding.status = record.status === 'resolved' ? 'open' : record.status;
        record.status = finding.status;
        record.lastSeen = finding.lastSeen;
        record.severity = finding.severity;
        record.title = finding.title;
        comparison.recurring.push(finding.fingerprint);
      } else {
        record = { projectName, fingerprint: finding.fingerprint, findingId: finding.id, title: finding.title, severity: finding.severity, affectedUrl: finding.affectedUrl, firstSeen: finding.firstSeen, lastSeen: finding.lastSeen, status: finding.status, reason: '', expiresAt: '', actor: '', role: '' };
        data.findings.push(record);
        comparison.new.push(finding.fingerprint);
      }
    }
    for (const record of priorOpen) {
      if (seen.has(record.fingerprint)) continue;
      record.status = 'resolved';
      record.resolvedAt = summary.generatedAt;
      comparison.resolved.push(record.fingerprint);
    }
    this.write(data);
    return { ...summary, comparison: { newCount: comparison.new.length, recurringCount: comparison.recurring.length, resolvedCount: comparison.resolved.length, ...comparison } };
  }

  list(projectName = '') { const items = this.read().findings; return projectName ? items.filter((item) => item.projectName === projectName) : items; }

  update(fingerprint, input = {}) {
    const status = String(input.status || '');
    if (!STATUSES.has(status)) throw new Error('Invalid finding lifecycle status.');
    if (['false_positive', 'suppressed', 'risk_accepted'].includes(status) && !String(input.reason || '').trim()) throw new Error('A reason is required for false-positive, suppression, and risk-acceptance decisions.');
    if (status === 'risk_accepted' && (!input.expiresAt || !Number.isFinite(Date.parse(input.expiresAt)) || Date.parse(input.expiresAt) <= Date.now())) throw new Error('Risk acceptance requires a future expiry date.');
    const data = this.read();
    const record = data.findings.find((item) => item.fingerprint === fingerprint && (!input.projectName || item.projectName === input.projectName));
    if (!record) throw new Error('Finding lifecycle record not found.');
    const previousStatus = record.status;
    record.status = status;
    record.reason = String(input.reason || '');
    record.expiresAt = String(input.expiresAt || '');
    record.actor = String(input.actor || 'local-user');
    record.role = String(input.role || 'security_reviewer');
    record.updatedAt = new Date().toISOString();
    this.write(data);
    this.audit({ action: 'finding_lifecycle_changed', actor: record.actor, role: record.role, projectName: record.projectName, fingerprint, previousStatus, status, reason: record.reason, expiresAt: record.expiresAt });
    return record;
  }
}

export { STATUSES as FINDING_LIFECYCLE_STATUSES };
