import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import ExcelJS from 'exceljs';
import { SecurityLifecycleManager } from '../lib/security-lifecycle-manager.js';
import { SecurityReportManager, buildReviewSummary, normalizeLegacySummary, spreadsheetSafeReviewText } from '../lib/security-report-manager.js';
import { createComplianceSummary } from './fixtures/compliance-summary-fixture.js';

test('review summary is factual workflow progress and never a compliance score', () => {
  const findings = [{ fingerprint: 'a', findingStatus: 'open' }, { fingerprint: 'b', findingStatus: 'open' }];
  const summary = buildReviewSummary(findings, { findingDecisions: [{ fingerprint: 'a', findingStatus: 'reviewed', reviewDecision: 'false_positive' }, { fingerprint: 'b', findingStatus: 'open' }] });
  assert.deepEqual({ total: summary.totalFindings, reviewed: summary.reviewedFindings, unreviewed: summary.unreviewedFindings }, { total: 2, reviewed: 1, unreviewed: 1 });
  assert.equal(summary.falsePositives, 1);
  assert.equal(summary.complianceConclusion, 'not_determined');
  assert.equal(summary.controlSatisfaction, 'not_determined');
  assert.equal('percentage' in summary, false);
  assert.equal('score' in summary, false);
});

test('mutable review text receives spreadsheet formula neutralization without changing ordinary or technical text', () => {
  for (const prefix of ['=', '+', '-', '@', ' \t=']) assert.equal(spreadsheetSafeReviewText(`${prefix}SUM(A1:A2)`).startsWith("'"), true, prefix);
  assert.equal(spreadsheetSafeReviewText('<script>alert(1)</script> مرحبا'), '<script>alert(1)</script> مرحبا');
  assert.equal(spreadsheetSafeReviewText('Ordinary reviewer note.'), 'Ordinary reviewer note.');
});

test('review overlay is consistent and safely separated across JSON, HTML, XLSX, workflow, metadata, and manifest', async (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase4-report-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const reportsRoot = path.join(root, 'reports');
  const lifecycle = new SecurityLifecycleManager({ dataDir: path.join(root, 'data') });
  const base = createComplianceSummary({ schemaVersion: '2.6.0', projectName: 'Phase 4 Report' });
  const mapping = { mappingId: 'P4-MAP-1', framework: 'iso-27001', controlId: 'ISO27001:2022-A.8.5', relationship: 'supporting' };
  base.findings[0].controlMappings = [mapping];
  lifecycle.reconcile(base);
  const note = '=HYPERLINK("https://invalid.test","<script>alert(1)</script>") مرحبا';
  lifecycle.addReview(base.findings[0].fingerprint, { projectName: base.projectName, expectedWorkflowRevision: 1, reviewDecision: 'requires_more_evidence', mappingDecision: 'rejected', mappingId: mapping.mappingId, scopeDecision: 'confirmed', scopeFramework: mapping.framework, reason: note, reviewer: '@Reviewer', role: 'external_reviewer' });
  const reports = new SecurityReportManager({
    reportsRoot,
    lifecycleManager: lifecycle,
    pdfGenerator: async ({ pdfPath }) => { fs.writeFileSync(pdfPath, Buffer.from('%PDF-1.4\n%%EOF\n')); return { method: 'phase4_fixture', durationMs: 1 }; }
  });
  const saved = await reports.save(base);
  const reportRoot = path.join(reportsRoot, saved.reportName);
  const json = JSON.parse(fs.readFileSync(path.join(reportRoot, 'summary.json'), 'utf8'));
  const workflow = JSON.parse(fs.readFileSync(path.join(reportRoot, 'workflow.json'), 'utf8'));
  const metadata = JSON.parse(fs.readFileSync(path.join(reportRoot, 'metadata.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(reportRoot, 'report-manifest.json'), 'utf8'));
  const html = fs.readFileSync(path.join(reportRoot, 'summary.html'), 'utf8');
  const csv = fs.readFileSync(path.join(reportRoot, 'findings.csv'), 'utf8');
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.readFile(path.join(reportRoot, 'summary.xlsx'));
  const queue = workbook.getWorksheet('Review Queue');

  assert.equal(json.schemaVersion, '2.6.0');
  assert.equal(workflow.schemaVersion, '3.0.0');
  assert.equal(workflow.revision, 2);
  assert.equal(workflow.history.length, 1);
  assert.equal(json.reviewSummary.requiresMoreEvidence, 1);
  assert.deepEqual(metadata.reviewSummary, json.reviewSummary);
  assert.equal(manifest.workflowRevision, 2);
  assert.equal(json.findings[0].decision.mappingId, mapping.mappingId);
  assert.equal(json.findings[0].controlMappings[0].mappingId, mapping.mappingId);
  assert.equal(json.frameworkResults[0].applicability, 'selected_for_mapping');
  assert.equal(json.complianceConclusion, 'not_determined');
  assert.equal(json.controlEvaluations[0].controlSatisfaction, 'not_determined');
  assert.match(html, /Scan evidence collected/);
  assert.match(html, /Human review overlay/);
  assert.match(html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
  assert.doesNotMatch(html, /<script>alert\(1\)<\/script>/);
  assert.match(csv, /'=HYPERLINK/);
  assert.equal(queue.getRow(2).getCell(13).value.startsWith("'="), true);
  assert.equal(queue.getRow(2).getCell(14).value.startsWith("'@"), true);
  const publicText = [fs.readFileSync(path.join(reportRoot, 'summary.json'), 'utf8'), html, csv].join('\n');
  for (const secret of ['Authorization: Bearer', 'session-token-secret', 'password=']) assert.doesNotMatch(publicText, new RegExp(secret, 'i'));
});

test('legacy reports receive read-time review defaults without rewriting evidence', () => {
  const legacy = { projectName: 'Legacy', findings: [{ id: 'LEGACY', fingerprint: 'a'.repeat(64), evidence: { raw: 'unchanged' } }], controlEvaluations: [], frameworkResults: [], checks: [], testResults: [] };
  const normalized = normalizeLegacySummary(legacy);
  assert.equal(normalized.findings[0].evidence.raw, 'unchanged');
  assert.equal(normalized.reviewSummary, undefined);
  assert.equal(normalized.complianceConclusion, 'not_determined');
});
