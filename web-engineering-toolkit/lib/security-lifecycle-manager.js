import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureDir } from './utils.js';

const FINDING_STATUSES = new Set(['open', 'reviewed', 'resolved']);
const REVIEW_DECISIONS = new Set(['', 'accepted_as_observation', 'false_positive', 'requires_more_evidence']);
const SCOPE_DECISIONS = new Set(['', 'confirmed', 'not_confirmed']);
const MAPPING_DECISIONS = new Set(['', 'confirmed', 'rejected']);
const REVIEWER_ROLES = new Set(['reviewer', 'compliance_owner', 'legal_reviewer', 'external_reviewer']);
const LIFECYCLE_SCHEMA_VERSION = 4;

function normalizeRole(value = '') {
  const role = String(value || 'reviewer');
  if (role === 'security_reviewer') return 'reviewer';
  if (role === 'auditor') return 'external_reviewer';
  return REVIEWER_ROLES.has(role) ? role : 'reviewer';
}

function normalizeReview(review = {}, fallbackId = '') {
  return {
    reviewId: String(review.reviewId || fallbackId || ''),
    reviewer: String(review.reviewer || review.actor || ''),
    role: normalizeRole(review.role),
    reviewDecision: REVIEW_DECISIONS.has(review.reviewDecision) ? review.reviewDecision : '',
    scopeDecision: SCOPE_DECISIONS.has(review.scopeDecision) ? review.scopeDecision : '',
    mappingDecision: MAPPING_DECISIONS.has(review.mappingDecision) ? review.mappingDecision : '',
    reason: String(review.reason || ''),
    createdAt: String(review.createdAt || review.updatedAt || ''),
    updatedAt: String(review.updatedAt || review.createdAt || ''),
    evidenceRefs: Array.isArray(review.evidenceRefs) ? [...new Set(review.evidenceRefs.map(String).filter(Boolean))] : []
  };
}

function hasReviewDecision(review = {}) {
  return Boolean(review.reviewDecision || review.scopeDecision || review.mappingDecision);
}

function legacyDecision(status = '') {
  if (status === 'false_positive') return { findingStatus: 'reviewed', reviewDecision: 'false_positive' };
  if (status === 'accepted_observation') return { findingStatus: 'reviewed', reviewDecision: 'accepted_as_observation' };
  if (['suppressed', 'risk_accepted'].includes(status)) return { findingStatus: 'reviewed', reviewDecision: 'requires_more_evidence' };
  if (status === 'scope_confirmed') return { findingStatus: 'reviewed', scopeDecision: 'confirmed' };
  if (status === 'scope_rejected') return { findingStatus: 'reviewed', scopeDecision: 'not_confirmed' };
  if (status === 'mapping_confirmed') return { findingStatus: 'reviewed', mappingDecision: 'confirmed' };
  if (status === 'mapping_rejected') return { findingStatus: 'reviewed', mappingDecision: 'rejected' };
  if (status === 'resolved') return { findingStatus: 'resolved' };
  if (status === 'reviewed') return { findingStatus: 'reviewed' };
  return { findingStatus: 'open' };
}

function normalizeRecord(record = {}) {
  const migrated = record.findingStatus ? {} : legacyDecision(record.status);
  const findingStatus = FINDING_STATUSES.has(record.findingStatus) ? record.findingStatus : migrated.findingStatus || 'open';
  const normalized = {
    ...record,
    legacyStatus: record.legacyStatus || (!record.findingStatus && record.status && !FINDING_STATUSES.has(record.status) ? record.status : ''),
    findingStatus,
    status: findingStatus,
    reviewDecision: REVIEW_DECISIONS.has(record.reviewDecision) ? record.reviewDecision : migrated.reviewDecision || '',
    scopeDecision: SCOPE_DECISIONS.has(record.scopeDecision) ? record.scopeDecision : migrated.scopeDecision || '',
    mappingDecision: MAPPING_DECISIONS.has(record.mappingDecision) ? record.mappingDecision : migrated.mappingDecision || '',
    reviewer: record.reviewer || record.actor || '',
    role: normalizeRole(record.role),
    reason: record.reason || '',
    evidenceRefs: Array.isArray(record.evidenceRefs) ? [...new Set(record.evidenceRefs.map(String).filter(Boolean))] : [],
    decisionHistory: Array.isArray(record.decisionHistory) ? record.decisionHistory : []
  };
  const existingReviews = Array.isArray(record.reviews) ? record.reviews.map((review) => normalizeReview(review)).filter((review) => review.reviewId) : [];
  if (!existingReviews.length && (hasReviewDecision(normalized) || normalized.reason || normalized.reviewer)) {
    existingReviews.push(normalizeReview(normalized, record.primaryReviewId || `legacy-${String(record.fingerprint || '').slice(0, 16)}`));
  }
  normalized.reviews = existingReviews;
  normalized.primaryReviewId = String(record.primaryReviewId || existingReviews[0]?.reviewId || '');
  return normalized;
}

function activeDecision(record) {
  return {
    findingStatus: record.findingStatus,
    reviewDecision: record.reviewDecision,
    scopeDecision: record.scopeDecision,
    mappingDecision: record.mappingDecision,
    reason: record.reason,
    reviewer: record.reviewer,
    role: record.role,
    timestamp: record.updatedAt || '',
    evidenceRefs: [...(record.evidenceRefs || [])]
  };
}

function validateReviewInput(input = {}) {
  const reviewDecision = String(input.reviewDecision || '');
  const scopeDecision = String(input.scopeDecision || '');
  const mappingDecision = String(input.mappingDecision || '');
  const reviewer = String(input.reviewer || input.actor || '').trim();
  const reason = String(input.reason || '').trim();
  if (!REVIEW_DECISIONS.has(reviewDecision)) throw new Error('Invalid review decision.');
  if (!SCOPE_DECISIONS.has(scopeDecision)) throw new Error('Invalid scope decision.');
  if (!MAPPING_DECISIONS.has(mappingDecision)) throw new Error('Invalid mapping decision.');
  if (!(reviewDecision || scopeDecision || mappingDecision)) throw new Error('A review, scope, or mapping decision is required.');
  if (!reason) throw new Error('A reason is required for reviewer decisions.');
  if (!reviewer) throw new Error('A reviewer name is required.');
  return { reviewDecision, scopeDecision, mappingDecision, reviewer, reason, role: normalizeRole(input.role), evidenceRefs: Array.isArray(input.evidenceRefs) ? [...new Set(input.evidenceRefs.map(String).filter(Boolean))] : [] };
}

function applyReviewProjection(record, review) {
  record.findingStatus = 'reviewed';
  record.status = 'reviewed';
  record.reviewDecision = review.reviewDecision;
  record.scopeDecision = review.scopeDecision;
  record.mappingDecision = review.mappingDecision;
  record.reason = review.reason;
  record.reviewer = review.reviewer;
  record.actor = review.reviewer;
  record.role = review.role;
  record.updatedAt = review.updatedAt;
  record.evidenceRefs = [...review.evidenceRefs];
  record.decision = review.reviewDecision || (review.scopeDecision ? `scope_${review.scopeDecision}` : review.mappingDecision ? `mapping_${review.mappingDecision}` : 'reviewed');
}

export class SecurityLifecycleManager {
  constructor({ dataDir, audit = () => {} }) {
    ensureDir(dataDir);
    this.file = path.join(dataDir, 'security-finding-lifecycle.json');
    this.audit = audit;
    if (!fs.existsSync(this.file)) fs.writeFileSync(this.file, `${JSON.stringify({ version: LIFECYCLE_SCHEMA_VERSION, findings: [] }, null, 2)}\n`);
  }

  read() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      return { ...data, version: LIFECYCLE_SCHEMA_VERSION, findings: (Array.isArray(data.findings) ? data.findings : []).map(normalizeRecord) };
    } catch { return { version: LIFECYCLE_SCHEMA_VERSION, findings: [] }; }
  }

  write(data) {
    const temporary = `${this.file}.${process.pid}.tmp`;
    fs.writeFileSync(temporary, `${JSON.stringify({ ...data, version: LIFECYCLE_SCHEMA_VERSION }, null, 2)}\n`);
    fs.renameSync(temporary, this.file);
  }

  archiveDecision(record, outcome) {
    if (!(record.reviewDecision || record.scopeDecision || record.mappingDecision || record.reason || record.reviewer)) return;
    record.decisionHistory.push({ ...activeDecision(record), archivedAt: new Date().toISOString(), outcome });
  }

  reconcile(summary) {
    const data = this.read();
    const projectName = summary.projectName;
    const priorActive = data.findings.filter((item) => item.projectName === projectName && item.findingStatus !== 'resolved');
    const seen = new Set();
    const comparison = { new: [], recurring: [], resolved: [] };

    for (const finding of summary.findings || []) {
      seen.add(finding.fingerprint);
      let record = data.findings.find((item) => item.projectName === projectName && item.fingerprint === finding.fingerprint);
      if (record) {
        finding.firstSeen = record.firstSeen;
        if (record.findingStatus === 'resolved') {
          const archivedAt = new Date().toISOString();
          if (record.reviews.length) {
            record.decisionHistory.push(...record.reviews.map((review) => ({
              ...review,
              timestamp: review.updatedAt || '',
              archivedAt,
              outcome: 'finding_recurred'
            })));
          } else {
            this.archiveDecision(record, 'finding_recurred');
          }
          record.findingStatus = 'open';
          record.status = 'open';
          record.reviewDecision = '';
          record.scopeDecision = '';
          record.mappingDecision = '';
          record.reason = '';
          record.reviewer = '';
          record.actor = '';
          record.role = 'reviewer';
          record.updatedAt = '';
          record.evidenceRefs = [];
          record.decision = 'open';
          record.reviews = [];
          record.primaryReviewId = '';
        }
        finding.status = record.findingStatus;
        finding.findingStatus = record.findingStatus;
        finding.reviewDecision = record.reviewDecision;
        finding.scopeDecision = record.scopeDecision;
        finding.mappingDecision = record.mappingDecision;
        record.lastSeen = finding.lastSeen;
        record.severity = finding.severity;
        record.title = finding.title;
        comparison.recurring.push(finding.fingerprint);
      } else {
        record = normalizeRecord({ projectName, fingerprint: finding.fingerprint, findingId: finding.id, title: finding.title, severity: finding.severity, affectedUrl: finding.affectedUrl, firstSeen: finding.firstSeen, lastSeen: finding.lastSeen, findingStatus: 'open' });
        data.findings.push(record);
        finding.findingStatus = 'open';
        comparison.new.push(finding.fingerprint);
      }
    }

    for (const record of priorActive) {
      if (seen.has(record.fingerprint)) continue;
      record.findingStatus = 'resolved';
      record.status = 'resolved';
      record.resolvedAt = summary.generatedAt;
      comparison.resolved.push(record.fingerprint);
    }
    this.write(data);
    return { ...summary, comparison: { newCount: comparison.new.length, recurringCount: comparison.recurring.length, resolvedCount: comparison.resolved.length, ...comparison } };
  }

  list(projectName = '') {
    const items = this.read().findings;
    return projectName ? items.filter((item) => item.projectName === projectName) : items;
  }

  update(fingerprint, input = {}) {
    const legacy = input.status && !FINDING_STATUSES.has(input.status) ? legacyDecision(input.status) : {};
    const findingStatus = String(input.findingStatus || (FINDING_STATUSES.has(input.status) ? input.status : '') || legacy.findingStatus || 'reviewed');
    const reviewDecision = String(input.reviewDecision ?? legacy.reviewDecision ?? '');
    const scopeDecision = String(input.scopeDecision ?? legacy.scopeDecision ?? '');
    const mappingDecision = String(input.mappingDecision ?? legacy.mappingDecision ?? '');
    if (!FINDING_STATUSES.has(findingStatus)) throw new Error('Invalid finding status.');
    if (!REVIEW_DECISIONS.has(reviewDecision)) throw new Error('Invalid review decision.');
    if (!SCOPE_DECISIONS.has(scopeDecision)) throw new Error('Invalid scope decision.');
    if (!MAPPING_DECISIONS.has(mappingDecision)) throw new Error('Invalid mapping decision.');
    if (findingStatus === 'reviewed' && !(reviewDecision || scopeDecision || mappingDecision)) throw new Error('A review, scope, or mapping decision is required.');
    if ((reviewDecision || scopeDecision || mappingDecision) && !String(input.reason || '').trim()) throw new Error('A reason is required for reviewer decisions.');

    const data = this.read();
    const record = data.findings.find((item) => item.fingerprint === fingerprint && (!input.projectName || item.projectName === input.projectName));
    if (!record) throw new Error('Finding lifecycle record not found.');
    this.archiveDecision(record, 'superseded');
    const previous = activeDecision(record);
    record.findingStatus = findingStatus;
    record.status = findingStatus;
    record.reviewDecision = reviewDecision;
    record.scopeDecision = scopeDecision;
    record.mappingDecision = mappingDecision;
    record.reason = String(input.reason || '');
    record.reviewer = String(input.reviewer || input.actor || 'local-user');
    record.actor = record.reviewer;
    record.role = normalizeRole(input.role);
    record.updatedAt = new Date().toISOString();
    record.evidenceRefs = Array.isArray(input.evidenceRefs) ? [...new Set(input.evidenceRefs.map(String).filter(Boolean))] : [];
    record.decision = reviewDecision || (scopeDecision ? `scope_${scopeDecision}` : mappingDecision ? `mapping_${mappingDecision}` : findingStatus);
    if (reviewDecision || scopeDecision || mappingDecision) {
      const reviewId = record.primaryReviewId || crypto.randomUUID();
      const review = normalizeReview({ reviewId, reviewer: record.reviewer, role: record.role, reviewDecision, scopeDecision, mappingDecision, reason: record.reason, createdAt: record.reviews.find((item) => item.reviewId === reviewId)?.createdAt || record.updatedAt, updatedAt: record.updatedAt, evidenceRefs: record.evidenceRefs });
      const reviewIndex = record.reviews.findIndex((item) => item.reviewId === reviewId);
      if (reviewIndex === -1) record.reviews.push(review);
      else record.reviews[reviewIndex] = review;
      record.primaryReviewId = reviewId;
    }
    this.write(data);
    this.audit({ action: 'finding_review_changed', actor: record.reviewer, role: record.role, projectName: record.projectName, fingerprint, previous, current: activeDecision(record) });
    return record;
  }

  addReview(fingerprint, input = {}) {
    const reviewInput = validateReviewInput(input);
    const data = this.read();
    const record = data.findings.find((item) => item.fingerprint === fingerprint && (!input.projectName || item.projectName === input.projectName));
    if (!record) throw new Error('Finding lifecycle record not found.');
    const now = new Date().toISOString();
    const review = normalizeReview({ ...reviewInput, reviewId: crypto.randomUUID(), createdAt: now, updatedAt: now });
    record.reviews.push(review);
    if (!record.primaryReviewId) record.primaryReviewId = review.reviewId;
    applyReviewProjection(record, review);
    this.write(data);
    this.audit({ action: 'finding_review_added', actor: review.reviewer, role: review.role, projectName: record.projectName, fingerprint, reviewId: review.reviewId, current: { ...review } });
    return record;
  }

  updateReview(fingerprint, reviewId, input = {}) {
    const reviewInput = validateReviewInput(input);
    const data = this.read();
    const record = data.findings.find((item) => item.fingerprint === fingerprint && (!input.projectName || item.projectName === input.projectName));
    if (!record) throw new Error('Finding lifecycle record not found.');
    const reviewIndex = record.reviews.findIndex((item) => item.reviewId === reviewId);
    if (reviewIndex === -1) throw new Error('Reviewer record not found.');
    const previous = { ...record.reviews[reviewIndex], evidenceRefs: [...(record.reviews[reviewIndex].evidenceRefs || [])] };
    const now = new Date().toISOString();
    const review = normalizeReview({ ...reviewInput, reviewId, createdAt: previous.createdAt || now, updatedAt: now });
    record.decisionHistory.push({ ...previous, timestamp: previous.updatedAt || '', archivedAt: now, outcome: 'review_updated' });
    record.reviews[reviewIndex] = review;
    applyReviewProjection(record, review);
    this.write(data);
    this.audit({ action: 'finding_review_updated', actor: review.reviewer, role: review.role, projectName: record.projectName, fingerprint, reviewId, previous, current: { ...review } });
    return record;
  }
}

export { FINDING_STATUSES, REVIEW_DECISIONS, SCOPE_DECISIONS, MAPPING_DECISIONS, REVIEWER_ROLES };
