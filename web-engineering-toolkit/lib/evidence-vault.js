import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, slugify } from './utils.js';

const REVIEW_STATUSES = new Set(['not_started', 'automated_evidence_collected', 'manual_evidence_required', 'submitted_for_review', 'reviewed', 'approved', 'rejected', 'expired']);
const REVIEW_ROLES = new Set(['security_reviewer', 'legal_reviewer', 'compliance_owner', 'auditor']);

function now() { return new Date().toISOString(); }
function id() { return `ev_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`; }
function sha256(buffer) { return crypto.createHash('sha256').update(buffer).digest('hex'); }

export class EvidenceVault {
  constructor({ dataDir }) {
    this.dataDir = ensureDir(dataDir);
    this.documentsDir = ensureDir(path.join(dataDir, 'evidence-documents'));
    this.indexFile = path.join(dataDir, 'security-evidence-vault.json');
    this.auditFile = path.join(dataDir, 'security-audit-log.jsonl');
    if (!fs.existsSync(this.indexFile)) fs.writeFileSync(this.indexFile, `${JSON.stringify({ version: 1, evidence: [] }, null, 2)}\n`);
  }

  read() {
    try { return JSON.parse(fs.readFileSync(this.indexFile, 'utf8')); } catch { return { version: 1, evidence: [] }; }
  }

  write(data) {
    const temporary = `${this.indexFile}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify(data, null, 2)}\n`);
    fs.renameSync(temporary, this.indexFile);
  }

  audit(event) {
    fs.appendFileSync(this.auditFile, `${JSON.stringify({ id: `audit_${Date.now().toString(36)}_${crypto.randomBytes(4).toString('hex')}`, occurredAt: now(), ...event })}\n`);
  }

  registerScan({ projectName, reportName, manifest }) {
    const data = this.read();
    const created = [];
    for (const artifact of manifest.artifacts || []) {
      const record = {
        id: id(),
        projectName,
        reportName,
        type: artifact.type,
        source: 'automated_scan',
        sourceReference: artifact.path,
        owner: 'security-scanner',
        collectedAt: manifest.generatedAt || now(),
        expiryDate: '',
        hash: artifact.sha256,
        version: 1,
        reviewer: '',
        reviewerRole: '',
        approvalStatus: 'automated_evidence_collected',
        linkedControls: [],
        linkedFindings: [],
        sensitive: Boolean(artifact.sensitive),
        metadata: { artifactId: artifact.id, bytes: artifact.bytes, access: manifest.access }
      };
      data.evidence.push(record);
      created.push(record);
    }
    this.write(data);
    this.audit({ action: 'automated_evidence_registered', actor: 'security-scanner', role: 'security_reviewer', projectName, reportName, evidenceIds: created.map((item) => item.id) });
    return created;
  }

  createManual(input = {}) {
    const projectName = String(input.projectName || '').trim();
    if (!projectName) throw new Error('Project name is required for manual evidence.');
    const content = input.contentBase64 ? Buffer.from(String(input.contentBase64), 'base64') : Buffer.from(String(input.note || ''), 'utf8');
    if (!content.length) throw new Error('Manual evidence content or note is required.');
    if (content.length > 10_000_000) throw new Error('Manual evidence is limited to 10 MB.');
    const evidenceId = id();
    const extension = input.contentBase64 ? path.extname(String(input.fileName || '')).slice(0, 12) : '.txt';
    const fileName = `${evidenceId}_${slugify(path.basename(String(input.fileName || 'manual-note'), path.extname(String(input.fileName || ''))))}${extension || '.bin'}`;
    const file = path.join(this.documentsDir, fileName);
    fs.writeFileSync(file, content, { mode: 0o600 });
    const record = {
      id: evidenceId,
      projectName,
      reportName: '',
      type: String(input.type || (input.contentBase64 ? 'document' : 'manual_note')),
      source: 'manual_upload',
      sourceReference: `evidence-documents/${fileName}`,
      owner: String(input.owner || ''),
      collectedAt: now(),
      expiryDate: String(input.expiryDate || ''),
      hash: sha256(content),
      version: 1,
      reviewer: '',
      reviewerRole: '',
      approvalStatus: 'manual_evidence_required',
      linkedControls: Array.isArray(input.linkedControls) ? input.linkedControls.map(String) : [],
      linkedFindings: Array.isArray(input.linkedFindings) ? input.linkedFindings.map(String) : [],
      sensitive: input.sensitive !== false,
      metadata: { fileName: String(input.fileName || 'manual-note.txt'), bytes: content.length }
    };
    const data = this.read();
    data.evidence.push(record);
    this.write(data);
    this.audit({ action: 'manual_evidence_created', actor: String(input.actor || input.owner || 'local-user'), role: String(input.role || 'compliance_owner'), projectName, evidenceId });
    return record;
  }

  review(evidenceId, input = {}) {
    const status = String(input.status || '');
    const role = String(input.role || '');
    if (!REVIEW_STATUSES.has(status)) throw new Error('Invalid evidence review status.');
    if (!REVIEW_ROLES.has(role)) throw new Error('Invalid reviewer role.');
    const data = this.read();
    const record = data.evidence.find((item) => item.id === evidenceId);
    if (!record) throw new Error('Evidence object not found.');
    const previousStatus = record.approvalStatus;
    record.approvalStatus = status;
    record.reviewer = String(input.reviewer || '');
    record.reviewerRole = role;
    record.reviewedAt = now();
    record.reviewNote = String(input.note || '');
    record.version = Number(record.version || 1) + 1;
    this.write(data);
    this.audit({ action: 'evidence_review_status_changed', actor: record.reviewer || 'local-user', role, projectName: record.projectName, evidenceId, previousStatus, status, note: record.reviewNote });
    return record;
  }

  list({ projectName = '' } = {}) {
    const currentTime = Date.now();
    const data = this.read();
    let changed = false;
    for (const item of data.evidence) {
      if (item.expiryDate && Date.parse(item.expiryDate) <= currentTime && item.approvalStatus !== 'expired') {
        item.approvalStatus = 'expired';
        changed = true;
      }
    }
    if (changed) this.write(data);
    return projectName ? data.evidence.filter((item) => item.projectName === projectName) : data.evidence;
  }

  auditLog({ projectName = '', limit = 250 } = {}) {
    if (!fs.existsSync(this.auditFile)) return [];
    const events = fs.readFileSync(this.auditFile, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
    return events.filter((event) => !projectName || event.projectName === projectName).slice(-Math.max(1, Math.min(1000, Number(limit) || 250))).reverse();
  }
}

export { REVIEW_ROLES, REVIEW_STATUSES };
