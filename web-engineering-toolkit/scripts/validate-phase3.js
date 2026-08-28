import { spawnSync } from 'node:child_process';
import { browserSkipCode, browserSkipReason, detectBrowserCapabilities } from '../lib/browser-capability.js';
import { startSecurityLab } from '../test/fixtures/security-lab-server.js';

const categories = [];

function tapCounts(output = '') {
  const number = (label) => Number(output.match(new RegExp(`# ${label} (\\d+)`, 'g'))?.at(-1)?.match(/\d+$/)?.[0] || 0);
  return { total: number('tests'), passed: number('pass'), failed: number('fail'), skipped: number('skipped') };
}

function run(name, files) {
  const started = performance.now();
  const child = spawnSync(process.execPath, ['--test', ...files], { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, env: process.env });
  const output = child.stdout || '';
  const entry = {
    name,
    status: child.status === 0 && !child.error ? 'passed' : 'failed',
    durationMs: Math.round(performance.now() - started),
    ...tapCounts(output),
    ...(child.error ? { error: child.error.message } : {}),
    ...(child.status !== 0 ? { exitCode: child.status, diagnostics: `${child.stderr || ''}\n${output}`.trim().slice(-4000) } : {})
  };
  categories.push(entry);
  process.stdout.write(`${entry.status === 'passed' ? 'PASS' : 'FAIL'} ${name} (${entry.durationMs} ms; ${entry.passed}/${entry.total} passed)\n`);
}

function skip(name, reason) {
  const entry = { name, status: 'skipped', reason, durationMs: 0, total: 0, passed: 0, failed: 0, skipped: 0 };
  categories.push(entry);
  process.stdout.write(`SKIP ${name} — ${reason}\n`);
}

let lab;
let capability = { browserDetected: false, launch: 'unavailable', navigation: 'not_tested', pdfRendering: 'not_tested', reasons: [] };
try {
  lab = await startSecurityLab();
  capability = await detectBrowserCapabilities({ fixtureUrl: `${lab.baseUrl}/secure-corporate` });
} catch (error) {
  capability.reasons.push({ operation: 'environment', reason: 'fixture_setup_failed', message: String(error?.message || error) });
} finally {
  await lab?.close().catch(() => {});
}

run('phase3_deterministic', ['test/phase3-evidence-collection.test.js']);
run('cross_format_workspace_redaction_provenance', ['test/phase3-report-consistency.test.js', 'test/phase1-report-consistency.test.js', 'test/compliance-workspace-ui.test.js']);

const navigationReason = browserSkipReason(capability, 'navigation');
if (navigationReason) skip('phase3_browser', browserSkipCode(capability, 'navigation'));
else run('phase3_browser', ['test/phase3-browser-collection.test.js']);

const pdfReason = browserSkipReason(capability, 'pdf');
if (pdfReason) skip('pdf_rendering_redaction', browserSkipCode(capability, 'pdf'));
else if (spawnSync('pdftotext', ['-v'], { encoding: 'utf8' }).error) skip('pdf_rendering_redaction', 'pdftotext_unavailable');
else run('pdf_rendering_redaction', ['test/compliance-pdf-pagination.test.js']);

const aggregate = categories.reduce((summary, category) => {
  summary.total += category.total || 0;
  summary.passed += category.passed || 0;
  summary.failed += category.failed || 0;
  summary.skipped += category.skipped || 0;
  if (category.status === 'skipped') summary.skippedCategories += 1;
  if (category.status === 'failed') summary.failedCategories += 1;
  return summary;
}, { total: 0, passed: 0, failed: 0, skipped: 0, skippedCategories: 0, failedCategories: 0 });

const summary = {
  phase: 'phase3_deeper_evidence_collection_validation',
  generatedAt: new Date().toISOString(),
  environment: {
    browserDetected: capability.browserDetected,
    browser: capability.browser || null,
    browserLaunch: capability.launch,
    navigation: capability.navigation,
    pdfSourceNavigation: capability.pdfSourceNavigation,
    pdfRendering: capability.pdfRendering,
    reasons: capability.reasons
  },
  categories,
  aggregate,
  status: aggregate.failedCategories === 0 ? 'passed' : 'failed'
};

process.stdout.write('\nPHASE3_VALIDATION_JSON\n');
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (aggregate.failedCategories > 0) process.exitCode = 1;
