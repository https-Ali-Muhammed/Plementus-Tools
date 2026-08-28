import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { SecurityLifecycleManager } from '../lib/security-lifecycle-manager.js';

function fixtureFinding() {
  return {
    fingerprint: '4'.repeat(64),
    id: 'PHASE4-REVIEW',
    title: 'Immutable technical observation',
    severity: 'high',
    affectedUrl: 'https://example.test/account?id=1',
    firstSeen: '2026-08-28T08:00:00.000Z',
    lastSeen: '2026-08-28T08:00:00.000Z',
    status: 'open',
    evidenceIds: ['evidence-1'],
    artifactRefs: ['evidence/http.json'],
    collectionState: 'completed',
    controlMappings: [
      { mappingId: 'MAP-ISO-1', framework: 'iso-27001', controlId: 'ISO-A.1' },
      { mappingId: 'MAP-SOC-1', framework: 'soc-2', controlId: 'SOC-CC1' }
    ]
  };
}

function managerFixture() {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase4-review-'));
  const manager = new SecurityLifecycleManager({ dataDir });
  const finding = fixtureFinding();
  manager.reconcile({ projectName: 'Phase 4', generatedAt: '2026-08-28T08:00:00.000Z', findings: [{ ...finding }] });
  return { manager, finding };
}

test('project workflow revisions reject stale review writes without losing the newer decision', () => {
  const { manager, finding } = managerFixture();
  assert.equal(manager.snapshot('Phase 4').revision, 1);
  const first = manager.addReview(finding.fingerprint, {
    projectName: 'Phase 4', expectedWorkflowRevision: 1,
    reviewDecision: 'accepted_as_observation', reason: 'The observation is supported.', reviewer: 'Operator', role: 'reviewer'
  });
  assert.equal(first.workflowRevision, 2);
  const second = manager.updateReview(finding.fingerprint, first.primaryReviewId, {
    projectName: 'Phase 4', expectedWorkflowRevision: 2,
    reviewDecision: 'requires_more_evidence', reason: 'Runtime evidence is still required.', reviewer: 'Operator', role: 'reviewer'
  });
  assert.equal(second.workflowRevision, 3);
  assert.throws(() => manager.updateReview(finding.fingerprint, first.primaryReviewId, {
    projectName: 'Phase 4', expectedWorkflowRevision: 2,
    reviewDecision: 'false_positive', reason: 'Stale client decision.', reviewer: 'Other tab', role: 'reviewer'
  }), (error) => error.statusCode === 409 && error.currentRevision === 3);
  assert.equal(manager.list('Phase 4')[0].reviewDecision, 'requires_more_evidence');
  assert.equal(manager.snapshot('Phase 4').revision, 3);
});

test('review saves retain immutable technical identity and conservative assessment fields', () => {
  const { manager, finding } = managerFixture();
  const before = manager.list('Phase 4')[0];
  const reviewed = manager.addReview(finding.fingerprint, {
    projectName: 'Phase 4', expectedWorkflowRevision: 1,
    mappingDecision: 'rejected', mappingId: 'MAP-ISO-1',
    scopeDecision: 'confirmed', scopeFramework: 'iso-27001',
    reason: 'Candidate relevance and scope were reviewed only.', reviewer: 'Reviewer label', role: 'external_reviewer'
  });
  for (const key of ['fingerprint', 'findingId', 'affectedUrl', 'firstSeen', 'scanGeneratedAt', 'collectionState']) {
    assert.deepEqual(reviewed[key], before[key], key);
  }
  assert.deepEqual(reviewed.evidenceIds, before.evidenceIds);
  assert.deepEqual(reviewed.artifactRefs, before.artifactRefs);
  assert.deepEqual(reviewed.mappingIds, ['MAP-ISO-1', 'MAP-SOC-1']);
  assert.equal(reviewed.reviews[0].mappingId, 'MAP-ISO-1');
  assert.equal(reviewed.reviews[0].scopeFramework, 'iso-27001');
  assert.equal(reviewed.controlSatisfaction, 'not_determined');
  assert.equal(reviewed.complianceConclusion, 'not_determined');
  assert.equal(reviewed.coverage, 'partial');
});

test('review writes reject unsupported enums, roles, targets, and excessive text', () => {
  const { manager, finding } = managerFixture();
  const base = { projectName: 'Phase 4', expectedWorkflowRevision: 1, reviewDecision: 'accepted_as_observation', reason: 'Reason.', reviewer: 'Reviewer', role: 'reviewer' };
  assert.throws(() => manager.addReview(finding.fingerprint, { ...base, reviewDecision: 'compliant' }), (error) => error.statusCode === 400);
  assert.throws(() => manager.addReview(finding.fingerprint, { ...base, role: 'verified_auditor' }), (error) => error.statusCode === 400);
  assert.throws(() => manager.addReview(finding.fingerprint, { ...base, reviewer: 'x'.repeat(81) }), (error) => error.statusCode === 400);
  assert.throws(() => manager.addReview(finding.fingerprint, { ...base, reason: 'x'.repeat(4001) }), (error) => error.statusCode === 400);
  assert.throws(() => manager.addReview(finding.fingerprint, { ...base, reviewDecision: '', mappingDecision: 'confirmed', mappingId: 'UNKNOWN' }), (error) => error.statusCode === 400);
  assert.throws(() => manager.addReview(finding.fingerprint, { ...base, reviewDecision: '', scopeDecision: 'confirmed', scopeFramework: 'unknown-framework' }), (error) => error.statusCode === 400);
});

test('workflow history is bounded, revisioned, and legacy lifecycle data remains readable', () => {
  const { manager, finding } = managerFixture();
  const added = manager.addReview(finding.fingerprint, { projectName: 'Phase 4', expectedWorkflowRevision: 1, reviewDecision: 'accepted_as_observation', reason: 'Initial review.', reviewer: 'Reviewer', role: 'reviewer' });
  manager.updateReview(finding.fingerprint, added.primaryReviewId, { projectName: 'Phase 4', expectedWorkflowRevision: 2, reviewDecision: 'requires_more_evidence', reason: 'Changed review.', reviewer: 'Reviewer', role: 'reviewer' });
  const snapshot = manager.snapshot('Phase 4');
  assert.equal(snapshot.history.length, 2);
  assert.deepEqual(snapshot.history.map((entry) => entry.revision), [2, 3]);
  assert.deepEqual(snapshot.history.map((entry) => entry.previousRevision), [1, 2]);
  assert.ok(snapshot.history.every((entry) => entry.fingerprint === finding.fingerprint && entry.updatedAt));
  assert.ok(snapshot.history.every((entry) => !JSON.stringify(entry).includes('Changed review.')));

  const legacyDir = fs.mkdtempSync(path.join(os.tmpdir(), 'phase4-legacy-'));
  fs.writeFileSync(path.join(legacyDir, 'security-finding-lifecycle.json'), `${JSON.stringify({ version: 4, findings: [{ projectName: 'Legacy', fingerprint: 'a'.repeat(64), findingId: 'LEGACY', findingStatus: 'open' }] }, null, 2)}\n`);
  const legacy = new SecurityLifecycleManager({ dataDir: legacyDir }).snapshot('Legacy');
  assert.equal(legacy.revision, 0);
  assert.deepEqual(legacy.history, []);
  assert.equal(legacy.findings[0].findingStatus, 'open');
});

test('HTTP review contract exposes project workflow state and preserves typed 400/404/409 errors', () => {
  const server = fs.readFileSync(new URL('../server.js', import.meta.url), 'utf8');
  assert.match(server, /\/api\/security\/review-workflow/);
  assert.match(server, /securityLifecycleManager\.snapshot/);
  assert.match(server, /error\.statusCode \|\| 500/);
  assert.match(server, /currentRevision/);
});
