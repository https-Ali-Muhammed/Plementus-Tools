import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { ensureDir } from './utils.js';

const FINDING_STATUSES = new Set(['open', 'reviewed', 'resolved']);
const REVIEW_DECISIONS = new Set(['', 'accepted_as_observation', 'false_positive', 'requires_more_evidence']);
const SCOPE_DECISIONS = new Set(['', 'confirmed', 'not_confirmed']);
const MAPPING_DECISIONS = new Set(['', 'confirmed', 'rejected']);
const REVIEWER_ROLES = new Set(['reviewer', 'compliance_owner', 'legal_reviewer', 'external_reviewer']);
const LIFECYCLE_SCHEMA_VERSION = 5;
const MAX_REVIEWER_LENGTH = 80;
const MAX_REASON_LENGTH = 4000;
const MAX_REFERENCE_LENGTH = 200;
const MAX_EVIDENCE_REFS = 100;
const MAX_PROJECT_HISTORY = 100;

class ReviewWorkflowError extends Error {
  constructor(message, statusCode = 400, details = {}) {
    super(message);
    this.name = 'ReviewWorkflowError';
    this.statusCode = statusCode;
    Object.assign(this, details);
  }
}

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
    mappingId: String(review.mappingId || ''),
    scopeFramework: String(review.scopeFramework || ''),
    reason: String(review.reason || ''),
    createdAt: String(review.createdAt || review.updatedAt || ''),
    updatedAt: String(review.updatedAt || review.createdAt || ''),
    evidenceRefs: Array.isArray(review.evidenceRefs) ? [...new Set(review.evidenceRefs.map(String).filter(Boolean))] : [],
    revision: Number.isInteger(review.revision) ? review.revision : null
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
    mappingId: String(record.mappingId || ''),
    scopeFramework: String(record.scopeFramework || ''),
    reviewer: record.reviewer || record.actor || '',
    role: normalizeRole(record.role),
    reason: record.reason || '',
    evidenceRefs: Array.isArray(record.evidenceRefs) ? [...new Set(record.evidenceRefs.map(String).filter(Boolean))] : [],
    decisionHistory: Array.isArray(record.decisionHistory) ? record.decisionHistory : [],
    mappingIds: Array.isArray(record.mappingIds) ? [...new Set(record.mappingIds.map(String).filter(Boolean))] : [],
    scopeFrameworks: Array.isArray(record.scopeFrameworks) ? [...new Set(record.scopeFrameworks.map(String).filter(Boolean))] : [],
    evidenceIds: Array.isArray(record.evidenceIds) ? [...record.evidenceIds] : [],
    artifactRefs: Array.isArray(record.artifactRefs) ? [...record.artifactRefs] : [],
    collectionState: String(record.collectionState || ''),
    scanGeneratedAt: String(record.scanGeneratedAt || ''),
    controlSatisfaction: 'not_determined',
    complianceConclusion: 'not_determined',
    coverage: 'partial'
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
    mappingId: record.mappingId || '',
    scopeFramework: record.scopeFramework || '',
    reason: record.reason,
    reviewer: record.reviewer,
    role: record.role,
    timestamp: record.updatedAt || '',
    evidenceRefs: [...(record.evidenceRefs || [])]
  };
}

function historyDecision(value = null) {
  if (!value) return null;
  return {
    reviewDecision: String(value.reviewDecision || ''),
    scopeDecision: String(value.scopeDecision || ''),
    scopeFramework: String(value.scopeFramework || ''),
    mappingDecision: String(value.mappingDecision || ''),
    mappingId: String(value.mappingId || '')
  };
}

function boundedText(value, label, maximum, { required = false } = {}) {
  const text = String(value || '').trim();
  if (required && !text) throw new ReviewWorkflowError(`${label} is required.`);
  if (text.length > maximum) throw new ReviewWorkflowError(`${label} must be ${maximum} characters or fewer.`);
  return text;
}

function validateReviewInput(input = {}, record = {}) {
  const reviewDecision = String(input.reviewDecision || '');
  const scopeDecision = String(input.scopeDecision || '');
  const mappingDecision = String(input.mappingDecision || '');
  const reviewer = boundedText(input.reviewer || input.actor, 'Reviewer label', MAX_REVIEWER_LENGTH, { required: true });
  const reason = boundedText(input.reason, 'Review note', MAX_REASON_LENGTH, { required: true });
  const role = String(input.role || 'reviewer');
  if (!REVIEW_DECISIONS.has(reviewDecision)) throw new ReviewWorkflowError('Invalid review decision.');
  if (!SCOPE_DECISIONS.has(scopeDecision)) throw new ReviewWorkflowError('Invalid scope decision.');
  if (!MAPPING_DECISIONS.has(mappingDecision)) throw new ReviewWorkflowError('Invalid mapping decision.');
  if (!REVIEWER_ROLES.has(role)) throw new ReviewWorkflowError('Invalid reviewer role.');
  if (!(reviewDecision || scopeDecision || mappingDecision)) throw new ReviewWorkflowError('A review, scope, or mapping decision is required.');
  let mappingId = boundedText(input.mappingId, 'Mapping ID', MAX_REFERENCE_LENGTH);
  let scopeFramework = boundedText(input.scopeFramework, 'Scope framework', MAX_REFERENCE_LENGTH);
  if (mappingDecision && !mappingId && record.mappingIds?.length === 1) [mappingId] = record.mappingIds;
  if (scopeDecision && !scopeFramework && record.scopeFrameworks?.length === 1) [scopeFramework] = record.scopeFrameworks;
  if (mappingDecision && record.mappingIds?.length > 1 && !mappingId) throw new ReviewWorkflowError('A mapping ID is required when multiple candidate mappings exist.');
  if (scopeDecision && record.scopeFrameworks?.length > 1 && !scopeFramework) throw new ReviewWorkflowError('A scope framework is required when multiple candidate frameworks exist.');
  if (mappingId && !record.mappingIds?.includes(mappingId)) throw new ReviewWorkflowError('Mapping ID is not a candidate mapping for this finding.');
  if (scopeFramework && !record.scopeFrameworks?.includes(scopeFramework)) throw new ReviewWorkflowError('Scope framework is not a candidate framework for this finding.');
  const evidenceRefs = Array.isArray(input.evidenceRefs) ? [...new Set(input.evidenceRefs.map((value) => boundedText(value, 'Evidence reference', MAX_REFERENCE_LENGTH)).filter(Boolean))] : [];
  if (evidenceRefs.length > MAX_EVIDENCE_REFS) throw new ReviewWorkflowError(`Evidence references are limited to ${MAX_EVIDENCE_REFS}.`);
  return { reviewDecision, scopeDecision, mappingDecision, mappingId, scopeFramework, reviewer, reason, role, evidenceRefs };
}

function applyReviewProjection(record, review) {
  record.findingStatus = 'reviewed';
  record.status = 'reviewed';
  record.reviewDecision = review.reviewDecision;
  record.scopeDecision = review.scopeDecision;
  record.mappingDecision = review.mappingDecision;
  record.mappingId = review.mappingId || '';
  record.scopeFramework = review.scopeFramework || '';
  record.reason = review.reason;
  record.reviewer = review.reviewer;
  record.actor = review.reviewer;
  record.role = review.role;
  record.updatedAt = review.updatedAt;
  record.evidenceRefs = [...review.evidenceRefs];
  record.decision = review.reviewDecision || (review.scopeDecision ? `scope_${review.scopeDecision}` : review.mappingDecision ? `mapping_${review.mappingDecision}` : 'reviewed');
  record.workflowRevision = review.revision;
}

export class SecurityLifecycleManager {
  constructor({ dataDir, audit = () => {} }) {
    ensureDir(dataDir);
    this.file = path.join(dataDir, 'security-finding-lifecycle.json');
    this.audit = audit;
    if (!fs.existsSync(this.file)) fs.writeFileSync(this.file, `${JSON.stringify({ version: LIFECYCLE_SCHEMA_VERSION, projects: {}, findings: [] }, null, 2)}\n`);
  }

  read() {
    try {
      const data = JSON.parse(fs.readFileSync(this.file, 'utf8'));
      const projects = data.projects && typeof data.projects === 'object' && !Array.isArray(data.projects) ? data.projects : {};
      return { ...data, version: LIFECYCLE_SCHEMA_VERSION, projects, findings: (Array.isArray(data.findings) ? data.findings : []).map(normalizeRecord) };
    } catch { return { version: LIFECYCLE_SCHEMA_VERSION, projects: {}, findings: [] }; }
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

  projectState(data, projectName, { create = false } = {}) {
    if (!data.projects[projectName] && create) data.projects[projectName] = { revision: 0, updatedAt: '', history: [] };
    const state = data.projects[projectName] || { revision: 0, updatedAt: '', history: [] };
    state.revision = Number.isInteger(state.revision) && state.revision >= 0 ? state.revision : 0;
    state.updatedAt = String(state.updatedAt || '');
    state.history = Array.isArray(state.history) ? state.history.slice(-MAX_PROJECT_HISTORY) : [];
    return state;
  }

  assertExpectedRevision(data, projectName, expected) {
    if (expected == null || expected === '') return;
    const currentRevision = this.projectState(data, projectName).revision;
    const expectedRevision = Number(expected);
    if (!Number.isInteger(expectedRevision) || expectedRevision < 0) throw new ReviewWorkflowError('Expected workflow revision must be a non-negative integer.');
    if (expectedRevision !== currentRevision) throw new ReviewWorkflowError('Review workflow was updated by another client.', 409, { currentRevision, expectedRevision });
  }

  recordProjectChange(data, record, { action, reviewId = '', previous = null, current = null, reviewer = '', role = 'reviewer', updatedAt = new Date().toISOString() }) {
    const state = this.projectState(data, record.projectName, { create: true });
    const priorRevision = state.revision;
    state.revision += 1;
    state.updatedAt = updatedAt;
    const entry = {
      revision: state.revision,
      previousRevision: priorRevision,
      action,
      fingerprint: record.fingerprint,
      findingId: record.findingId,
      reviewId,
      reviewer,
      role,
      previous: historyDecision(previous),
      current: historyDecision(current),
      updatedAt
    };
    state.history = [...state.history, entry].slice(-MAX_PROJECT_HISTORY);
    record.workflowRevision = state.revision;
    return entry;
  }

  snapshot(projectName = '') {
    const data = this.read();
    const state = this.projectState(data, projectName);
    return { schemaVersion: '3.0.0', projectName, revision: state.revision, updatedAt: state.updatedAt, history: [...state.history], findings: data.findings.filter((item) => !projectName || item.projectName === projectName) };
  }

  reconcile(summary) {
    const data = this.read();
    const projectName = summary.projectName;
    const projectState = this.projectState(data, projectName, { create: true });
    if (projectState.revision === 0) {
      projectState.revision = 1;
      projectState.updatedAt = String(summary.generatedAt || new Date().toISOString());
    }
    const priorActive = data.findings.filter((item) => item.projectName === projectName && item.findingStatus !== 'resolved');
    const seen = new Set();
    const comparison = { new: [], recurring: [], resolved: [] };
    const aliasCounts = new Map();
    for (const finding of summary.findings || []) {
      for (const alias of finding.fingerprintAliases || []) aliasCounts.set(alias, (aliasCounts.get(alias) || 0) + 1);
    }

    for (const finding of summary.findings || []) {
      seen.add(finding.fingerprint);
      let record = data.findings.find((item) => item.projectName === projectName && item.fingerprint === finding.fingerprint);
      if (!record) {
        const unambiguousAlias = (finding.fingerprintAliases || []).find((alias) => aliasCounts.get(alias) === 1);
        record = unambiguousAlias ? data.findings.find((item) => item.projectName === projectName && item.fingerprint === unambiguousAlias) : null;
        if (record) {
          record.legacyFingerprints = [...new Set([...(record.legacyFingerprints || []), record.fingerprint, unambiguousAlias].filter(Boolean))];
          record.fingerprint = finding.fingerprint;
        }
      }
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
        record = normalizeRecord({ projectName, fingerprint: finding.fingerprint, legacyFingerprints: [...(finding.fingerprintAliases || [])], findingId: finding.id, title: finding.title, severity: finding.severity, affectedUrl: finding.affectedUrl, firstSeen: finding.firstSeen, lastSeen: finding.lastSeen, findingStatus: 'open' });
        data.findings.push(record);
        finding.findingStatus = 'open';
        comparison.new.push(finding.fingerprint);
      }
      const mappings = Array.isArray(finding.controlMappings) ? finding.controlMappings : [];
      record.mappingIds = [...new Set(mappings.map((mapping) => String(mapping.mappingId || '')).filter(Boolean))];
      record.scopeFrameworks = [...new Set(mappings.map((mapping) => String(mapping.framework || '')).filter(Boolean))];
      record.evidenceIds = Array.isArray(finding.evidenceIds) ? [...finding.evidenceIds] : (finding.evidenceItems || []).map((item) => item.evidenceId).filter(Boolean);
      record.artifactRefs = Array.isArray(finding.artifactRefs) ? [...finding.artifactRefs] : (finding.evidenceItems || []).flatMap((item) => item.artifactRefs || []);
      record.collectionState = String(finding.collectionState || finding.evidence?.collectionState || '');
      record.scanGeneratedAt = record.scanGeneratedAt || String(summary.generatedAt || '');
      record.controlSatisfaction = 'not_determined';
      record.complianceConclusion = 'not_determined';
      record.coverage = 'partial';
      record.workflowRevision = projectState.revision;
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
    if (!FINDING_STATUSES.has(findingStatus)) throw new ReviewWorkflowError('Invalid finding status.');
    if (!REVIEW_DECISIONS.has(reviewDecision)) throw new ReviewWorkflowError('Invalid review decision.');
    if (!SCOPE_DECISIONS.has(scopeDecision)) throw new ReviewWorkflowError('Invalid scope decision.');
    if (!MAPPING_DECISIONS.has(mappingDecision)) throw new ReviewWorkflowError('Invalid mapping decision.');
    if (findingStatus === 'reviewed' && !(reviewDecision || scopeDecision || mappingDecision)) throw new ReviewWorkflowError('A review, scope, or mapping decision is required.');

    const data = this.read();
    const record = data.findings.find((item) => item.fingerprint === fingerprint && (!input.projectName || item.projectName === input.projectName));
    if (!record) throw new ReviewWorkflowError('Finding lifecycle record not found.', 404);
    this.assertExpectedRevision(data, record.projectName, input.expectedWorkflowRevision);
    const validated = validateReviewInput({ ...input, reviewDecision, scopeDecision, mappingDecision }, record);
    this.archiveDecision(record, 'superseded');
    const previous = activeDecision(record);
    record.findingStatus = findingStatus;
    record.status = findingStatus;
    record.reviewDecision = reviewDecision;
    record.scopeDecision = scopeDecision;
    record.mappingDecision = mappingDecision;
    record.reason = validated.reason;
    record.reviewer = validated.reviewer;
    record.actor = record.reviewer;
    record.role = validated.role;
    record.updatedAt = new Date().toISOString();
    record.evidenceRefs = validated.evidenceRefs;
    record.mappingId = validated.mappingId;
    record.scopeFramework = validated.scopeFramework;
    record.decision = reviewDecision || (scopeDecision ? `scope_${scopeDecision}` : mappingDecision ? `mapping_${mappingDecision}` : findingStatus);
    if (reviewDecision || scopeDecision || mappingDecision) {
      const reviewId = record.primaryReviewId || crypto.randomUUID();
      const review = normalizeReview({ reviewId, reviewer: record.reviewer, role: record.role, reviewDecision, scopeDecision, mappingDecision, mappingId: record.mappingId, scopeFramework: record.scopeFramework, reason: record.reason, createdAt: record.reviews.find((item) => item.reviewId === reviewId)?.createdAt || record.updatedAt, updatedAt: record.updatedAt, evidenceRefs: record.evidenceRefs });
      const reviewIndex = record.reviews.findIndex((item) => item.reviewId === reviewId);
      if (reviewIndex === -1) record.reviews.push(review);
      else record.reviews[reviewIndex] = review;
      record.primaryReviewId = reviewId;
    }
    const change = this.recordProjectChange(data, record, { action: 'finding_review_changed', reviewId: record.primaryReviewId, previous, current: activeDecision(record), reviewer: record.reviewer, role: record.role, updatedAt: record.updatedAt });
    const currentReview = record.reviews.find((item) => item.reviewId === record.primaryReviewId);
    if (currentReview) currentReview.revision = change.revision;
    this.write(data);
    this.audit({ action: 'finding_review_changed', actor: record.reviewer, role: record.role, projectName: record.projectName, fingerprint, revision: change.revision, previous, current: activeDecision(record) });
    return record;
  }

  addReview(fingerprint, input = {}) {
    const data = this.read();
    const record = data.findings.find((item) => item.fingerprint === fingerprint && (!input.projectName || item.projectName === input.projectName));
    if (!record) throw new ReviewWorkflowError('Finding lifecycle record not found.', 404);
    this.assertExpectedRevision(data, record.projectName, input.expectedWorkflowRevision);
    const reviewInput = validateReviewInput(input, record);
    const now = new Date().toISOString();
    const review = normalizeReview({ ...reviewInput, reviewId: crypto.randomUUID(), createdAt: now, updatedAt: now });
    record.reviews.push(review);
    if (!record.primaryReviewId) record.primaryReviewId = review.reviewId;
    applyReviewProjection(record, review);
    const change = this.recordProjectChange(data, record, { action: 'finding_review_added', reviewId: review.reviewId, previous: null, current: { ...review }, reviewer: review.reviewer, role: review.role, updatedAt: now });
    review.revision = change.revision;
    record.workflowRevision = change.revision;
    this.write(data);
    this.audit({ action: 'finding_review_added', actor: review.reviewer, role: review.role, projectName: record.projectName, fingerprint, reviewId: review.reviewId, revision: change.revision, current: { ...review } });
    return record;
  }

  updateReview(fingerprint, reviewId, input = {}) {
    const data = this.read();
    const record = data.findings.find((item) => item.fingerprint === fingerprint && (!input.projectName || item.projectName === input.projectName));
    if (!record) throw new ReviewWorkflowError('Finding lifecycle record not found.', 404);
    this.assertExpectedRevision(data, record.projectName, input.expectedWorkflowRevision);
    const reviewInput = validateReviewInput(input, record);
    const reviewIndex = record.reviews.findIndex((item) => item.reviewId === reviewId);
    if (reviewIndex === -1) throw new ReviewWorkflowError('Reviewer record not found.', 404);
    const previous = { ...record.reviews[reviewIndex], evidenceRefs: [...(record.reviews[reviewIndex].evidenceRefs || [])] };
    const now = new Date().toISOString();
    const review = normalizeReview({ ...reviewInput, reviewId, createdAt: previous.createdAt || now, updatedAt: now });
    record.decisionHistory.push({ ...previous, timestamp: previous.updatedAt || '', archivedAt: now, outcome: 'review_updated' });
    record.reviews[reviewIndex] = review;
    applyReviewProjection(record, review);
    const change = this.recordProjectChange(data, record, { action: 'finding_review_updated', reviewId, previous, current: { ...review }, reviewer: review.reviewer, role: review.role, updatedAt: now });
    review.revision = change.revision;
    record.workflowRevision = change.revision;
    this.write(data);
    this.audit({ action: 'finding_review_updated', actor: review.reviewer, role: review.role, projectName: record.projectName, fingerprint, reviewId, revision: change.revision, previous, current: { ...review } });
    return record;
  }
}

export { FINDING_STATUSES, REVIEW_DECISIONS, SCOPE_DECISIONS, MAPPING_DECISIONS, REVIEWER_ROLES, ReviewWorkflowError };
