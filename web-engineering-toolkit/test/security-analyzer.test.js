import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { analyzeCookies, analyzeSecurityHeaders, parseSetCookie, scoreChecks } from '../lib/security-analyzer.js';
import { buildSecurityAnalyzerSummaryHtml, SecurityAnalyzerReportManager } from '../lib/security-analyzer-report-manager.js';
import { ReportManager } from '../lib/report-manager.js';
import { buildReportDownloadFilename, resolveReportDownload } from '../lib/report-downloads.js';
import { detectBrowsers } from '../lib/environment-checker.js';
import { securityAnalyzerPdfHtml } from '../lib/tool-pdf-reports.js';

function fixture() {
  const headerChecks = analyzeSecurityHeaders({
    'content-security-policy': "default-src 'self'; script-src 'self'",
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'x-frame-options': 'DENY',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=(), microphone=(), geolocation=()',
    'cross-origin-opener-policy': 'same-origin',
    'cross-origin-resource-policy': 'same-site',
    'cross-origin-embedder-policy': 'require-corp'
  });
  const tlsChecks = [
    { id: 'https-enabled', label: 'HTTPS enabled', status: 'pass', currentValue: 'https://example.test/', risk: 'The final page used HTTPS.', recommendation: 'Serve every page over HTTPS.' },
    { id: 'certificate-validity', label: 'Certificate validity', status: 'pass', currentValue: 'Authorized', risk: 'The chain was authorized.', recommendation: 'Monitor renewal.' },
    { id: 'certificate-expiration', label: 'Certificate expiration', status: 'warning', currentValue: '2026-09-20', risk: '18 days remain.', recommendation: 'Renew before expiration.' },
    { id: 'tls-version', label: 'TLS protocol', status: 'pass', currentValue: 'TLSv1.3', risk: 'Modern TLS observed.', recommendation: 'Retain TLS 1.2 or newer.' }
  ];
  const cookieChecks = [{ id: 'cookie-1', label: 'Cookie: session', status: 'pass', currentValue: 'Secure; HttpOnly; SameSite=Lax', risk: 'Protected cookie attributes observed.', recommendation: 'Retain protections.' }];
  const mixedChecks = [{ id: 'mixed-content', label: 'Mixed content', status: 'pass', currentValue: '0 insecure request(s)', risk: 'No mixed content observed.', recommendation: 'Serve every resource over HTTPS.' }];
  return {
    schemaVersion: '1.0.0', reportType: 'security-analyzer', projectName: 'Analyzer Fixture', baseUrl: 'https://example.test', generatedAt: '2026-09-02T17:30:00.000Z', scanType: 'single-page', environment: { browser: 'Chromium', browserPath: '', device: 'desktop', timeoutMs: 30000 }, options: { headers: true, https: true, cookies: true, mixedContent: true },
    pages: [{ requestedUrl: 'https://example.test/', finalUrl: 'https://example.test/', status: 200, headers: {}, headerChecks, tlsChecks, http: { tls: { authorized: true, protocol: 'TLSv1.3', cipher: 'TLS_AES_256_GCM_SHA384', issuer: 'Example CA', subject: 'example.test', validFrom: '2026-01-01', validTo: '2026-12-31', authorizationError: '' } }, cookieFindings: [], cookieChecks, mixedContent: [], mixedChecks }],
    redirectCheck: { id: 'http-redirect', label: 'HTTP redirects to HTTPS', status: 'pass', currentValue: '301 http://example.test → 200 https://example.test', risk: 'HTTP redirected to HTTPS.', recommendation: 'Retain the redirect.' },
    categories: { headers: { label: 'Security Headers', score: 100, passed: 9, warnings: 0, failures: 0, unavailable: 0, total: 9 }, https: { label: 'HTTPS & TLS', score: 90, passed: 4, warnings: 1, failures: 0, unavailable: 0, total: 5 }, cookies: { label: 'Cookies', score: 100, passed: 1, warnings: 0, failures: 0, unavailable: 0, total: 1 }, mixedContent: { label: 'Mixed Content', score: 100, passed: 1, warnings: 0, failures: 0, unavailable: 0, total: 1 } },
    score: 98, findings: [{ category: 'https', ...tlsChecks[2] }], recommendations: [{ category: 'https', priority: 'medium', title: 'Certificate expiration', recommendation: 'Renew before expiration.' }]
  };
}

test('security header checks expose pass, warning, and failure states', () => {
  const checks = analyzeSecurityHeaders({ 'content-security-policy': "default-src *; script-src 'unsafe-inline' 'unsafe-eval'", 'strict-transport-security': 'max-age=100', 'x-frame-options': 'ALLOWALL', 'referrer-policy': 'unsafe-url', 'permissions-policy': 'camera=(self)' });
  assert.equal(checks.length, 9);
  assert.equal(checks.find((check) => check.id === 'content-security-policy').status, 'warning');
  assert.equal(checks.find((check) => check.id === 'x-content-type-options').status, 'fail');
  assert.match(checks.find((check) => check.id === 'strict-transport-security').risk, /max-age|includeSubDomains/);
});

test('cookie parsing and analysis detect missing flags and third-party domains', () => {
  const parsed = parseSetCookie('session=secret; Domain=tracker.example; SameSite=None');
  const [finding] = analyzeCookies([parsed], 'https://app.example.test/');
  assert.equal(finding.status, 'fail');
  assert.equal(finding.secure, false);
  assert.equal(finding.httpOnly, false);
  assert.equal(finding.thirdParty, true);
  assert.match(finding.risk, /Secure missing/);
});

test('scoring gives warnings half credit and excludes unavailable checks', () => {
  assert.equal(scoreChecks([{ status: 'pass' }, { status: 'warning' }, { status: 'fail' }, { status: 'unavailable' }]), 50);
  assert.equal(scoreChecks([{ status: 'unavailable' }]), null);
});

test('canonical implementation strips raw cookie values from persisted network observations', () => {
  const source = fs.readFileSync(path.resolve(import.meta.dirname, '../lib/security-analyzer.js'), 'utf8');
  assert.match(source, /publicHttpObservation/);
  assert.match(source, /PUBLIC_SECURITY_HEADERS/);
  assert.doesNotMatch(source, /pageResult = \{[^\n]*http, cookieFindings/);
});

test('standalone report contains the complete required section family and shared actions', () => {
  const reportFixture = fixture();
  reportFixture.pages[0].headerChecks[0].status = 'fail';
  reportFixture.pages[0].tlsChecks[0].status = 'unavailable';
  const html = buildSecurityAnalyzerSummaryHtml(reportFixture);
  for (const text of ['WEB ENGINEERING TOOLKIT · SECURITY HEADERS &amp; WEB SECURITY', 'Security Overview', 'Security Headers Analysis', 'TLS &amp; HTTPS Analysis', 'Cookie Security Analysis', 'Mixed Content Findings', 'Recommendations', 'summary.pdf', 'summary.xlsx', 'summary.csv']) assert.match(html, new RegExp(text, 'i'));
  assert.match(html, /data-report-back-to-top/);
  assert.match(html, /--report-accent:#70dfd0/);
  assert.match(html, /\.report-eyebrow\{color:#ff8291\}/);
  assert.match(securityAnalyzerPdfHtml(fixture()), /\.eyebrow\{color:#ff8291/);
  assert.match(html, /security-check-table td:first-child\{display:flex;flex-direction:column/);
  for (const [label, tone] of [['Pass', 'good'], ['Warning', 'warning'], ['Fail', 'danger'], ['Unavailable', 'neutral']]) {
    assert.match(html, new RegExp(`report-status-chip security-analyzer-status-chip ${tone}[^>]*>${label}<`));
  }
  assert.match(html, /security-analyzer-status-chip\.good\{border-color:rgba\(101,215,168,\.28\)\}/);
  assert.match(html, /security-analyzer-status-chip\.neutral\{color:var\(--report-muted\)/);
  assert.doesNotMatch(html, /--report-accent:#5dd6b7/);
  const namedHtml = buildSecurityAnalyzerSummaryHtml(fixture());
  for (const extension of ['pdf', 'xlsx', 'csv', 'json']) assert.match(namedHtml, new RegExp(`security-web-security__analyzer-fixture__2026-09-02_17-30-00Z\\.${extension}`));
});

test('report manager generates PDF, CSV, Excel, summary HTML, and history metadata', async (t) => {
  const [browser] = await detectBrowsers();
  if (!browser) return t.skip('No compatible browser available for PDF generation.');
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'security-analyzer-report-'));
  try {
    const result = fixture(); result.environment.browserPath = browser.path;
    let saved;
    try { saved = await new SecurityAnalyzerReportManager({ reportsRoot: root }).save(result); }
    catch (error) {
      if (/browserType\.launch|Target page, context or browser has been closed|Operation not permitted/i.test(error.message)) return t.skip(`PDF browser unavailable: ${error.message.split('\n')[0]}`);
      throw error;
    }
    const reportRoot = path.join(root, saved.reportName);
    for (const file of ['summary.html', 'summary.json', 'summary.csv', 'summary.xlsx', 'summary.pdf', 'metadata.json']) assert.equal(fs.existsSync(path.join(reportRoot, file)), true, file);
    assert.match(fs.readFileSync(path.join(reportRoot, 'summary.csv'), 'utf8'), /Certificate expiration/);
    assert.equal(fs.readFileSync(path.join(reportRoot, 'summary.xlsx')).subarray(0, 2).toString(), 'PK');
    assert.equal(fs.readFileSync(path.join(reportRoot, 'summary.pdf')).subarray(0, 4).toString(), '%PDF');
    const [history] = new ReportManager({ reportsRoot: root }).listReports();
    assert.equal(history.reportType, 'security-analyzer');
    assert.match(history.summaryHref, /summary\.html$/);
    const download = resolveReportDownload({ reportsRoot: root, reportName: saved.reportName, format: 'pdf' });
    assert.match(download.filename, /^security-web-security__analyzer-fixture__/);
  } finally { fs.rmSync(root, { recursive: true, force: true }); }
});

test('UI and server expose the analyzer as a first-class toolkit module', () => {
  const root = path.resolve(import.meta.dirname, '..');
  const html = fs.readFileSync(path.join(root, 'public/index.html'), 'utf8');
  const app = fs.readFileSync(path.join(root, 'public/app.js'), 'utf8');
  const server = fs.readFileSync(path.join(root, 'server.js'), 'utf8');
  const sharedCss = fs.readFileSync(path.join(root, 'public/styles/shared.css'), 'utf8');
  const analyzerCss = fs.readFileSync(path.join(root, 'public/styles/security-analyzer.css'), 'utf8');
  assert.match(html, /data-section="securityAnalyzer"/);
  assert.match(html, /id="securityAnalyzerSection"/);
  assert.match(app, /report-type-badge--security-analyzer/);
  assert.match(app, /report-type-badge security-analyzer-status-badge \$\{escapeHtml\(finding\.status\)\}/);
  assert.match(app, /reportActionControls\(\{ openHref: result\.summaryHref/);
  assert.match(server, /\/api\/security-analyzer\/analyze/);
  assert.match(analyzerCss, /\.nav-security-analyzer\s*\{\s*display:\s*grid;\s*place-items:\s*center;/);
  for (const [status, color] of [['pass', '#8ce6c3'], ['warning', '#ffd095'], ['fail', '#ff9da7']]) {
    assert.match(analyzerCss, new RegExp(`\\.security-analyzer-status-badge\\.${status}\\s*\\{[^}]*${color}`, 's'));
  }
  assert.match(analyzerCss, /\.security-analyzer-status-badge\.unavailable\s*\{[^}]*color:\s*var\(--muted\)/s);
  assert.doesNotMatch(analyzerCss, /\.nav-security-analyzer\s*\{[^}]*color:/s);
  assert.match(sharedCss, /\.report-type-badge--security-analyzer\s*\{[^}]*#ffb4d2[^}]*rgba\(235, 92, 151, \.36\)/s);
  assert.equal(buildReportDownloadFilename({ reportType: 'security-analyzer', projectName: 'Plementus', generatedAt: '2026-09-02T17:30:00Z', extension: 'pdf' }), 'security-web-security__plementus__2026-09-02_17-30-00Z.pdf');
});
