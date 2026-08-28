import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { buildComplianceHtml } from '../lib/security-report-html.js';
import { buildControlEvaluations } from '../lib/security-finding-model.js';
import { MAPPING_CATALOG_VERSION, SECURITY_MAPPING_REGISTRY } from '../lib/security-mapping-registry.js';
import { normalizeLegacySummary, SecurityReportManager } from '../lib/security-report-manager.js';
import { frameworkEvidenceSummary } from '../lib/security-scanner.js';
import { createComplianceSummary } from './fixtures/compliance-summary-fixture.js';

const observedAt = '2026-08-26T15:00:00.000Z';

function check(id, status = 'pass', testState = 'confirmed', extra = {}) {
  return {
    id,
    title: id,
    category: 'Phase 2.2C regression',
    status,
    severity: status === 'fail' ? 'high' : status === 'warning' ? 'medium' : 'informational',
    testState,
    confidence: testState === 'confirmed' ? 'confirmed' : testState,
    collectionState: testState === 'confirmed' ? 'completed' : testState,
    affectedUrl: 'https://example.test/',
    summary: `${id} ${status}`,
    limitations: [],
    references: [],
    ...extra
  };
}

test('P3-AUD-015 centrally defines conservative relationship terminology', async () => {
  const semantics = await import('../lib/security-compliance-semantics.js');
  const used = new Set(SECURITY_MAPPING_REGISTRY.map((mapping) => mapping.relationship));
  for (const relationship of ['direct', 'supporting', 'contextual', 'scope_signal', 'manual_only']) {
    const definition = semantics.RELATIONSHIP_DEFINITIONS[relationship];
    assert.ok(definition?.label, relationship);
    assert.ok(definition?.shortDescription, relationship);
    assert.ok(definition?.longDescription, relationship);
  }
  for (const relationship of used) assert.ok(semantics.RELATIONSHIP_DEFINITIONS[relationship], relationship);
  const prose = Object.values(semantics.RELATIONSHIP_DEFINITIONS).flatMap((item) => [item.shortDescription, item.longDescription]).join(' ');
  assert.doesNotMatch(prose, /control (?:passed|failed|satisfied)|\bcompliant\b|\bviolated\b/i);
  assert.match(semantics.RELATIONSHIP_DISCLAIMER, /No relationship type determines control satisfaction or compliance/i);
});

test('P3-AUD-016 gives every static mapping truthful governance provenance', () => {
  const sourceVersions = {
    'iso-27001': 'ISO/IEC 27001:2022',
    gdpr: 'Regulation (EU) 2016/679',
    eprivacy: 'Directive 2002/58/EC as amended by Directive 2009/136/EC',
    'soc-2': '2017 Trust Services Criteria (With Revised Points of Focus — 2022)',
    hipaa: '45 CFR Part 164',
    'pci-dss': 'PCI DSS 4.0.1'
  };
  assert.equal(SECURITY_MAPPING_REGISTRY.length, 62);
  assert.equal(MAPPING_CATALOG_VERSION, '2026.08.26.3');
  for (const mapping of SECURITY_MAPPING_REGISTRY) {
    for (const field of ['mappingId', 'framework', 'frameworkVersion', 'controlId', 'relationship', 'sourceCitation', 'sourceVersion', 'rationale', 'reviewStatus', 'mappingVersion', 'lastReviewedAt', 'reviewedBy', 'changeReason']) {
      assert.ok(String(mapping[field] || '').trim(), `${mapping.mappingId}: ${field}`);
    }
    assert.equal(mapping.sourceVersion, sourceVersions[mapping.framework], mapping.mappingId);
    assert.match(mapping.lastReviewedAt, /^\d{4}-\d{2}-\d{2}$/, mapping.mappingId);
    assert.equal(mapping.reviewedBy, 'toolkit_mapping_governance', mapping.mappingId);
    assert.equal(mapping.approvedBy, null, mapping.mappingId);
    assert.equal(mapping.approvalDate, null, mapping.mappingId);
    assert.doesNotMatch(mapping.rationale, /\b(?:proves?|certif(?:y|ies|ied)|compliant|violat(?:e|es|ed)|control (?:passed|failed|satisfied))\b/i, mapping.mappingId);
  }
});

test('P3-AUD-017 uses canonical names and source-qualified applicability labels', async () => {
  const semantics = await import('../lib/security-compliance-semantics.js');
  assert.equal(semantics.frameworkDisplayName('iso-27001'), 'ISO/IEC 27001');
  assert.equal(semantics.frameworkDisplayName('eprivacy'), 'ePrivacy Directive');
  const cases = [
    ['applicable', 'applicable', 'Applicable — operator asserted'],
    ['not_applicable', 'not_applicable', 'Not applicable — operator asserted'],
    ['potentially_applicable', 'unknown', 'Potentially applicable — scope confirmation required'],
    ['not_indicated', 'unknown', 'Not indicated by observed public evidence'],
    ['unknown', 'unknown', 'Applicability not determined'],
    ['requires_scope_confirmation', 'unknown', 'Scope confirmation required'],
    ['selected_for_mapping', 'unknown', 'Applicability not determined']
  ];
  for (const [state, inputState, expected] of cases) {
    assert.equal(semantics.applicabilityPresentation(state, { inputState }).label, expected, state);
  }

  const selected = frameworkEvidenceSummary('iso-27001', { checks: [], crawl: null, jurisdiction: '', frameworkApplicability: { 'iso-27001': 'unknown' } });
  assert.equal(selected.label, 'ISO/IEC 27001');
  assert.equal(selected.selectionLabel, 'Selected for mapping');
  assert.equal(selected.applicabilityLabel, 'Applicability not determined');
  const asserted = frameworkEvidenceSummary('gdpr', { checks: [], crawl: null, jurisdiction: '', frameworkApplicability: { gdpr: 'applicable' } });
  assert.equal(asserted.applicabilityLabel, 'Applicable — operator asserted');
  const local = frameworkEvidenceSummary('local', { checks: [], crawl: null, jurisdiction: 'Egypt', frameworkApplicability: { local: 'unknown' } });
  assert.ok(local.publicEvidence.includes('Jurisdiction configured: Egypt'));
  assert.doesNotMatch(local.publicEvidence.join(' '), /Egypt PDPL applies/i);
});

test('P3-AUD-018 retains universal review while adding specific deduplicated reasons', () => {
  const iso = buildControlEvaluations([check('https'), check('certificate')], [], ['iso-27001']);
  const normal = iso.find((control) => control.controlId === 'ISO27001:2022-A.8.24');
  assert.equal(normal.manualReviewRequired, true);
  assert.deepEqual(normal.manualReviewReasons, ['organizational_evidence_required', 'operating_effectiveness_not_assessed', 'mapping_requires_human_review']);

  const uncertain = buildControlEvaluations([check('https')], [], ['gdpr'], { frameworkApplicability: { gdpr: 'requires_scope_confirmation' } })[0];
  assert.ok(uncertain.manualReviewReasons.includes('scope_confirmation_required'));
  const failed = buildControlEvaluations([check('https'), check('tls', 'info', 'failed_to_test')], [], ['iso-27001'])[0];
  assert.ok(failed.manualReviewReasons.includes('failed_collection_present'));
  const notAssessed = buildControlEvaluations([check('https'), check('tls', 'manual', 'not_tested')], [], ['iso-27001'])[0];
  assert.ok(notAssessed.manualReviewReasons.includes('not_assessed_evidence_present'));
  const policy = buildControlEvaluations([check('privacy-runtime-consistency', 'pass')], [], ['gdpr'], { frameworkApplicability: { gdpr: 'applicable' } })[0];
  assert.ok(policy.manualReviewReasons.includes('policy_claim_requires_validation'));
  const auth = buildControlEvaluations([check('access-control-candidates', 'pass')], [], ['iso-27001'])[0];
  assert.ok(auth.manualReviewReasons.includes('authenticated_authorization_not_verified'));
  const dense = buildControlEvaluations([check('https'), check('certificate'), check('tls'), check('hsts')], [], ['iso-27001'])[0];
  assert.equal(new Set(dense.manualReviewReasons).size, dense.manualReviewReasons.length);

  const local = frameworkEvidenceSummary('local', { checks: [], crawl: null, jurisdiction: 'Egypt', frameworkApplicability: { local: 'unknown' } });
  assert.equal(local.manualReviewRequired, true);
  assert.ok(local.manualReviewReasons.includes('legal_interpretation_required'));
});

test('P3 metadata and review semantics render consistently in HTML', () => {
  const control = buildControlEvaluations([check('https'), check('tls', 'info', 'failed_to_test')], [], ['iso-27001'])[0];
  const summary = createComplianceSummary({
    schemaVersion: '2.4.0',
    controlEvaluations: [control],
    frameworkResults: [{ ...frameworkEvidenceSummary('iso-27001', { checks: [], crawl: null, jurisdiction: '', frameworkApplicability: { 'iso-27001': 'unknown' } }), controlEvaluations: [control] }]
  });
  const html = buildComplianceHtml(summary);
  assert.match(html, /Mapping relationships/i);
  assert.match(html, /Close technical relationship to a narrow part of a candidate requirement/i);
  assert.match(html, /No relationship type determines control satisfaction or compliance/i);
  assert.match(html, /Human review required/i);
  assert.match(html, /Failed collection present/i);
  assert.match(html, /ISO\/IEC 27001/);
  assert.doesNotMatch(html, />ISO 27001</);
});

test('P3 XLSX provides compact mapping guidance and structured review reasons', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase2-p3-xlsx-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const control = buildControlEvaluations([check('https'), check('tls', 'info', 'failed_to_test')], [], ['iso-27001'])[0];
  const summary = createComplianceSummary({
    schemaVersion: '2.4.0',
    controlEvaluations: [control],
    frameworkResults: [{ ...frameworkEvidenceSummary('iso-27001', { checks: [], crawl: null, jurisdiction: '', frameworkApplicability: { 'iso-27001': 'unknown' } }), controlEvaluations: [control] }]
  });
  const manager = new SecurityReportManager({ reportsRoot: root, pdfGenerator: async ({ pdfPath }) => { fs.writeFileSync(pdfPath, '%PDF-fixture'); return { durationMs: 1, method: 'fixture' }; } });
  await manager.writeReportFiles(root, summary);
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(root, 'summary.xlsx'));
  const guidance = workbook.getWorksheet('Mapping Guidance');
  assert.ok(guidance);
  assert.match(guidance.getCell('A1').value, /Mapping relationships/i);
  assert.match(guidance.getCell('A8').value, /No relationship type determines control satisfaction or compliance/i);
  const controls = workbook.getWorksheet('Control Evidence');
  assert.equal(controls.getRow(1).values.includes('Review Reasons'), true);
  assert.match(controls.getCell(2, 14).value, /Failed collection present/i);
});

test('legacy reports gain conservative presentation defaults without rewriting input', () => {
  const legacy = createComplianceSummary({
    schemaVersion: '2.3.0',
    relationshipDefinitions: undefined,
    frameworkResults: [{ id: 'iso-27001', label: 'ISO 27001', applicability: 'selected_for_mapping', controlEvaluations: [], publicEvidence: [], technicalControls: [], missingEvidence: [] }],
    controlEvaluations: [{ controlId: 'ISO27001:2022-A.8.24', state: 'partial_technical_evidence_observed', controlSatisfaction: 'not_determined', coverage: 'partial', manualReviewRequired: true, automatedEvidence: [], mappings: [] }]
  });
  const original = structuredClone(legacy);
  const normalized = normalizeLegacySummary(legacy);
  assert.equal(normalized.frameworkResults[0].label, 'ISO/IEC 27001');
  assert.equal(normalized.frameworkResults[0].applicabilityLabel, 'Applicability not determined');
  assert.ok(normalized.relationshipDefinitions.direct);
  assert.ok(normalized.controlEvaluations[0].manualReviewReasons.length > 0);
  assert.deepEqual(legacy, original);
});

