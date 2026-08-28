import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { ensureDir } from './utils.js';
import { normalizeCollectionMethod, normalizeCollectionState, normalizeEvidenceConfidence } from './security-evidence-semantics.js';

const EVIDENCE_VAULT_SCHEMA_VERSION = 4;

function now() { return new Date().toISOString(); }
function id() { return `ev_${Date.now().toString(36)}_${crypto.randomBytes(5).toString('hex')}`; }

export class EvidenceVault {
  constructor({ dataDir }) {
    this.dataDir = ensureDir(dataDir);
    this.indexFile = path.join(dataDir, 'security-evidence-vault.json');
    this.auditFile = path.join(dataDir, 'security-audit-log.jsonl');
    if (!fs.existsSync(this.indexFile)) fs.writeFileSync(this.indexFile, `${JSON.stringify({ version: EVIDENCE_VAULT_SCHEMA_VERSION, evidence: [] }, null, 2)}\n`);
  }

  read() {
    try {
      const data = JSON.parse(fs.readFileSync(this.indexFile, 'utf8'));
      const evidence = (Array.isArray(data.evidence) ? data.evidence : []).map((item) => ({
        ...item,
        evidenceType: item.evidenceType || item.type || 'unknown',
        evidenceStrength: item.evidenceStrength || (item.source === 'manual_upload' ? 'manual_evidence' : 'provenance_only'),
        semanticEvidenceStrength: item.semanticEvidenceStrength || (item.source === 'manual_upload' ? 'manual' : 'not_applicable'),
        sourceMethod: item.sourceMethod || (item.source === 'manual_upload' ? 'manual_reviewer_evidence' : 'automated_scan_artifact'),
        collectionMethod: normalizeCollectionMethod(item.collectionMethod || item.sourceMethod || (item.source === 'manual_upload' ? 'manual_reviewer_evidence' : 'automated_scan_artifact')),
        collectionState: normalizeCollectionState(item.collectionState || item.testState || 'completed'),
        sourceUrl: item.sourceUrl || '',
        observedAt: item.observedAt || item.collectedAt || '',
        confidence: item.confidence || (item.source === 'manual_upload' ? 'asserted_not_verified' : 'unknown'),
        evidenceConfidence: normalizeEvidenceConfidence(item.evidenceConfidence || item.confidence || (item.source === 'manual_upload' ? 'asserted_not_verified' : 'unknown')),
        limitations: Array.isArray(item.limitations) ? item.limitations : [],
        reviewState: item.reviewState || (item.source === 'manual_upload' ? 'legacy_manual_evidence' : 'automated')
      }));
      return { ...data, version: EVIDENCE_VAULT_SCHEMA_VERSION, evidence };
    } catch { return { version: EVIDENCE_VAULT_SCHEMA_VERSION, evidence: [] }; }
  }

  write(data) {
    const temporary = `${this.indexFile}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify({ ...data, version: EVIDENCE_VAULT_SCHEMA_VERSION }, null, 2)}\n`);
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
        evidenceType: artifact.type,
        evidenceStrength: 'provenance_only',
        semanticEvidenceStrength: 'not_applicable',
        source: 'automated_scan',
        sourceMethod: 'automated_scan_artifact',
        collectionMethod: 'artifact_only',
        collectionState: 'completed',
        sourceUrl: manifest.scan?.finalUrl || manifest.scan?.requestedUrl || '',
        sourceReference: artifact.path,
        owner: 'security-scanner',
        collectedAt: manifest.generatedAt || now(),
        observedAt: manifest.generatedAt || now(),
        confidence: 'unknown',
        evidenceConfidence: 'unknown',
        reviewState: 'automated',
        limitations: ['Artifact presence and integrity are recorded; interpretation remains subject to the associated test limitations.'],
        hash: artifact.sha256,
        version: 1,
        linkedControls: [],
        linkedFindings: [],
        sensitive: Boolean(artifact.sensitive),
        metadata: { artifactId: artifact.id, artifactRoles: [...(artifact.roles || [artifact.id])], artifactAliases: [...(artifact.aliases || [])], bytes: artifact.bytes, access: manifest.access }
      };
      data.evidence.push(record);
      created.push(record);
    }
    this.write(data);
    this.audit({ action: 'automated_evidence_registered', actor: 'security-scanner', role: 'reviewer', projectName, reportName, evidenceIds: created.map((item) => item.id) });
    return created;
  }

  list({ projectName = '' } = {}) {
    const data = this.read();
    return projectName ? data.evidence.filter((item) => item.projectName === projectName) : data.evidence;
  }

  auditLog({ projectName = '', limit = 250 } = {}) {
    if (!fs.existsSync(this.auditFile)) return [];
    const events = fs.readFileSync(this.auditFile, 'utf8').split(/\r?\n/).filter(Boolean).map((line) => { try { return JSON.parse(line); } catch { return null; } }).filter(Boolean);
    return events.filter((event) => !projectName || event.projectName === projectName).slice(-Math.max(1, Math.min(1000, Number(limit) || 250))).reverse();
  }
}
