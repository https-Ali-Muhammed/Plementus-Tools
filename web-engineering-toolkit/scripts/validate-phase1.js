import { spawnSync } from 'node:child_process';
import { browserSkipCode, browserSkipReason, detectBrowserCapabilities } from '../lib/browser-capability.js';
import { startSecurityLab } from '../test/fixtures/security-lab-server.js';

const categories = [];

function tapCounts(output = '') {
  const number = (label) => Number(output.match(new RegExp(`# ${label} (\\d+)`, 'g'))?.at(-1)?.match(/\d+$/)?.[0] || 0);
  return { total: number('tests'), passed: number('pass'), failed: number('fail'), skipped: number('skipped') };
}

function run(name, command, args, { env = {} } = {}) {
  const started = performance.now();
  const child = spawnSync(command, args, { cwd: process.cwd(), encoding: 'utf8', maxBuffer: 20 * 1024 * 1024, env: { ...process.env, ...env } });
  const stdout = child.stdout || '';
  const stderr = child.stderr || '';
  const entry = {
    name,
    status: child.status === 0 && !child.error ? 'passed' : 'failed',
    durationMs: Math.round(performance.now() - started),
    ...(args.includes('--test') ? tapCounts(stdout) : {}),
    ...(child.error ? { error: child.error.message } : {}),
    ...(child.status !== 0 ? { exitCode: child.status, diagnostics: (stderr || stdout).slice(-4000) } : {})
  };
  categories.push(entry);
  process.stdout.write(`${entry.status === 'passed' ? 'PASS' : 'FAIL'} ${name} (${entry.durationMs} ms)\n`);
  return entry;
}

function skip(name, reason) {
  const entry = { name, status: 'skipped', reason, total: 0, passed: 0, failed: 0, skipped: 0, durationMs: 0 };
  categories.push(entry);
  process.stdout.write(`SKIP ${name} — ${reason}\n`);
}

let lab;
let browserCapability = { browserDetected: false, launch: 'unavailable', navigation: 'not_tested', pdfRendering: 'not_tested', reasons: [] };
try {
  lab = await startSecurityLab();
  browserCapability = await detectBrowserCapabilities({ fixtureUrl: `${lab.baseUrl}/secure-corporate` });
} catch (error) {
  browserCapability.reasons.push({ operation: 'environment', reason: 'fixture_setup_failed', message: String(error?.message || error) });
} finally {
  await lab?.close().catch(() => {});
}

run('core_deterministic', process.execPath, [
  '--test',
  'test/compliance-reliability.test.js',
  'test/compliance-workspace-ui.test.js',
  'test/phase1-core.test.js'
]);
run('security_core_deterministic', process.execPath, [
  '--test',
  'test/security-scanner.test.js'
], { env: { WET_TEST_TAXONOMY: 'core' } });
run('cross_format', process.execPath, ['--test', 'test/phase1-report-consistency.test.js']);
run('packaging', process.execPath, ['--test', 'test/phase1-package.test.js']);

const navigationReason = browserSkipReason(browserCapability, 'navigation');
const pdfReason = browserSkipReason(browserCapability, 'pdf');
if (navigationReason) {
  skip('browser_integration', browserSkipCode(browserCapability, 'navigation'));
} else {
  run('browser_integration', process.execPath, ['--test', 'test/phase1-browser-integration.test.js']);
  run('existing_browser_regressions', process.execPath, [
    '--test',
    'test/security-scanner.test.js'
  ], { env: { WET_TEST_TAXONOMY: 'browser' } });
}

if (pdfReason) {
  skip('pdf_rendering', browserSkipCode(browserCapability, 'pdf'));
} else if (spawnSync('pdftotext', ['-v'], { encoding: 'utf8' }).error) {
  skip('pdf_rendering', 'pdftotext unavailable');
} else {
  run('pdf_rendering', process.execPath, ['--test', 'test/compliance-pdf-pagination.test.js']);
}

run('three_tool_smoke', process.execPath, ['scripts/smoke-all-tools.js']);

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
  phase: 'phase1_independent_validation',
  generatedAt: new Date().toISOString(),
  environment: {
    browserDetected: browserCapability.browserDetected,
    browser: browserCapability.browser || null,
    browserLaunch: browserCapability.launch,
    navigation: browserCapability.navigation,
    pdfSourceNavigation: browserCapability.pdfSourceNavigation,
    pdfRendering: browserCapability.pdfRendering,
    reasons: browserCapability.reasons
  },
  categories,
  aggregate,
  status: aggregate.failedCategories === 0 ? 'passed' : 'failed'
};

process.stdout.write('\nPHASE1_VALIDATION_JSON\n');
process.stdout.write(`${JSON.stringify(summary, null, 2)}\n`);
if (aggregate.failedCategories > 0) process.exitCode = 1;
