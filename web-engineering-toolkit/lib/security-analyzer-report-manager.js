import fs from 'node:fs';
import path from 'node:path';
import { csvEscape, ensureDir, slugify, timestamp } from './utils.js';
import { generateToolPdf } from './pdf-report-renderer.js';
import { securityAnalyzerPdfHtml } from './tool-pdf-reports.js';
import { reportDownloadHref } from './report-downloads.js';
import { writeReportXlsx } from './xlsx-reports.js';
import { reportBackToTopControl, reportHtmlQuickActions, reportHtmlTheme } from './report-html-theme.js';

function e(value) { return String(value ?? '').replace(/[&<>'"]/g, (character) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[character])); }
function humanize(value) { return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase()); }
function score(value) { return value == null ? 'Not scored' : `${value}%`; }
function status(value) {
  const tone = ({ pass: 'good', warning: 'warning', fail: 'danger', unavailable: 'neutral' })[value] || 'neutral';
  return `<span class="report-status-chip security-analyzer-status-chip ${tone}">${e(humanize(value))}</span>`;
}

function allRows(result) {
  return result.pages.flatMap((page) => [
    ...page.headerChecks.map((check) => ({ page: page.finalUrl, category: 'Security Headers', ...check })),
    ...page.tlsChecks.map((check) => ({ page: page.finalUrl, category: 'HTTPS & TLS', ...check })),
    ...page.cookieChecks.map((check) => ({ page: page.finalUrl, category: 'Cookies', ...check })),
    ...page.mixedChecks.map((check) => ({ page: page.finalUrl, category: 'Mixed Content', ...check }))
  ]).concat(result.redirectCheck ? [{ page: result.baseUrl, category: 'HTTPS & TLS', ...result.redirectCheck }] : []);
}

function writeCsv(root, result) {
  const headers = ['Page', 'Category', 'Check', 'Status', 'Current Value', 'Risk', 'Recommendation'];
  const rows = allRows(result).map((row) => [row.page, row.category, row.label, humanize(row.status), row.currentValue, row.risk, row.recommendation]);
  fs.writeFileSync(path.join(root, 'summary.csv'), `\uFEFF${[headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n')}\n`, 'utf8');
}

function checkTable(rows, empty = 'No checks were selected for this category.') {
  return rows.length ? `<div class="report-table-wrap"><table class="report-table security-check-table"><thead><tr><th>Check</th><th>Status</th><th>Current value</th><th>Risk</th><th>Recommendation</th></tr></thead><tbody>${rows.map((row) => `<tr><td><strong>${e(row.label)}</strong><span class="report-muted report-machine-text">${e(row.page || '')}</span></td><td>${status(row.status)}</td><td class="report-machine-text">${e(row.currentValue || 'Not observed')}</td><td>${e(row.risk)}</td><td>${e(row.recommendation)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="security-report-empty">${e(empty)}</div>`;
}

export function buildSecurityAnalyzerSummaryHtml(result) {
  const rows = allRows(result);
  const headerRows = rows.filter((row) => row.category === 'Security Headers');
  const tlsRows = rows.filter((row) => row.category === 'HTTPS & TLS');
  const cookieRows = rows.filter((row) => row.category === 'Cookies');
  const mixedRows = result.pages.flatMap((page) => page.mixedContent || []);
  const hasHttpsPage = result.pages.some((page) => page.finalUrl.startsWith('https:'));
  const mixedTable = mixedRows.length ? `<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Page</th><th>Resource</th><th>Type</th><th>Status</th><th>Recommendation</th></tr></thead><tbody>${mixedRows.map((item) => `<tr><td class="report-machine-text">${e(item.pageUrl)}</td><td class="report-machine-text">${e(item.resourceUrl)}</td><td>${e(humanize(item.resourceType))}</td><td>${status(item.status)}</td><td>${e(item.recommendation)}</td></tr>`).join('')}</tbody></table></div>` : `<div class="security-report-empty">${hasHttpsPage ? 'No insecure HTTP subresource requests were observed on the analyzed HTTPS pages.' : 'Mixed content was not assessed because no analyzed page completed over HTTPS.'}</div>`;
  const cards = Object.values(result.categories).map((category) => `<div class="report-metric"><span>${e(category.label)}</span><strong>${e(score(category.score))}</strong><small>${category.passed} passed · ${category.warnings} warnings · ${category.failures} failed${category.unavailable ? ` · ${category.unavailable} unavailable` : ''}</small></div>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Security Web Analysis · ${e(result.projectName)}</title><link rel="icon" href="/assets/mark-color.png"><style>${reportHtmlTheme()}.report-eyebrow{color:#ff8291}.security-overview{--metric-columns:5}.report-metric small{display:block;margin-top:7px;color:var(--report-muted);font-size:11px}.security-report-empty{padding:22px;border:1px dashed var(--report-border);border-radius:12px;color:var(--report-muted)}.security-check-table td:first-child{display:flex;flex-direction:column;gap:4px}.security-check-table td:first-child strong{margin-right:0}.security-analyzer-status-chip.good{border-color:rgba(101,215,168,.28)}.security-analyzer-status-chip.warning{border-color:rgba(255,194,118,.3)}.security-analyzer-status-chip.danger{border-color:rgba(255,130,145,.3)}.security-analyzer-status-chip.neutral{color:var(--report-muted);border-color:var(--report-border);background:rgba(255,255,255,.04)}@media(max-width:760px){.security-overview{--metric-columns:2}}</style></head><body><main class="report-shell"><header class="report-header"><div><div class="report-eyebrow">Web Engineering Toolkit · Security Headers &amp; Web Security</div><h1 class="report-title">${e(result.projectName)}</h1><p class="report-subtitle report-machine-text">${e(result.baseUrl)} · ${e(humanize(result.scanType))} · ${e(new Date(result.generatedAt).toLocaleString())}</p></div>${reportHtmlQuickActions({ exports: [['summary.pdf', 'PDF', 'pdf'], ['summary.xlsx', 'Excel', 'xlsx'], ['summary.csv', 'CSV', 'csv'], ['summary.json', 'JSON', 'json']], label: 'Security analyzer report exports', downloadContext: { reportType: 'security-analyzer', projectName: result.projectName, generatedAt: result.generatedAt } })}</header>
  <section class="report-meta"><div><span>Target URL</span><strong class="report-machine-text">${e(result.baseUrl)}</strong></div><div><span>Scan date</span><strong>${e(result.generatedAt)}</strong></div><div><span>Environment</span><strong>${e(`${result.environment.browser} · ${humanize(result.environment.device)}`)}</strong></div><div><span>Pages analyzed</span><strong>${result.pages.length}</strong></div><div><span>Security score</span><strong>${e(score(result.score))}</strong></div></section>
  <section class="report-section"><div class="report-section-heading"><h2>1. Security Overview</h2></div><div class="report-metrics security-overview"><div class="report-metric"><span>Overall Security Score</span><strong>${e(score(result.score))}</strong><small>Equal category weighting</small></div>${cards}</div></section>
  <section class="report-section"><div class="report-section-heading"><h2>2. Security Headers Analysis</h2></div>${checkTable(headerRows)}</section>
  <section class="report-section"><div class="report-section-heading"><h2>3. TLS &amp; HTTPS Analysis</h2></div>${checkTable(tlsRows)}</section>
  <section class="report-section"><div class="report-section-heading"><h2>4. Cookie Security Analysis</h2></div>${checkTable(cookieRows)}</section>
  <section class="report-section"><div class="report-section-heading"><h2>5. Mixed Content Findings</h2></div>${mixedTable}</section>
  <section class="report-section"><div class="report-section-heading"><h2>6. Recommendations</h2></div>${result.recommendations.length ? `<div class="report-table-wrap"><table class="report-table"><thead><tr><th>Priority</th><th>Area</th><th>Recommendation</th></tr></thead><tbody>${result.recommendations.map((item) => `<tr><td>${status(item.priority === 'high' ? 'fail' : 'warning')}</td><td>${e(item.title)}</td><td>${e(item.recommendation)}</td></tr>`).join('')}</tbody></table></div>` : '<div class="security-report-empty">No recommendations were generated from the selected checks.</div>'}</section>
  <section class="report-section"><div class="report-section-heading"><h2>Scope and limitations</h2></div><p class="report-muted">This score summarizes observable transport, response-header, cookie, and browser-request configuration for the selected pages at scan time. It is not a penetration test, vulnerability guarantee, compliance conclusion, or certification. Authenticated and consent-dependent behavior requires separately configured runs.</p></section></main>${reportBackToTopControl()}</body></html>`;
}

export class SecurityAnalyzerReportManager {
  constructor({ reportsRoot }) { this.reportsRoot = ensureDir(reportsRoot); }
  async save(result) {
    const reportName = `${slugify(result.projectName)}_security-web-security_${timestamp()}`;
    const root = ensureDir(path.join(this.reportsRoot, reportName));
    const overview = { reportType: 'security-analyzer', projectName: result.projectName, baseUrl: result.baseUrl, pages: result.pages.length, securityScore: result.score, securityFailures: result.findings.filter((finding) => finding.status === 'fail').length, securityWarnings: result.findings.filter((finding) => finding.status === 'warning').length };
    fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify({ ...result, overview }, null, 2));
    fs.writeFileSync(path.join(root, 'metadata.json'), JSON.stringify({ schemaVersion: result.schemaVersion, reportType: 'security-analyzer', generatedAt: result.generatedAt, projectName: result.projectName, baseUrl: result.baseUrl, overview }, null, 2));
    writeCsv(root, result);
    await writeReportXlsx({ root, reportType: 'security-analyzer', data: result });
    fs.writeFileSync(path.join(root, 'summary.html'), buildSecurityAnalyzerSummaryHtml(result));
    const pdfGeneration = await generateToolPdf({ html: securityAnalyzerPdfHtml(result), pdfPath: path.join(root, 'summary.pdf'), toolName: 'Security Headers & Web Security Analyzer', reportTitle: 'Security Headers & Web Security Analysis', projectName: result.projectName, target: result.baseUrl });
    return { ...result, overview, pdfGeneration, reportName, summaryHref: `/reports/${encodeURIComponent(reportName)}/summary.html`, jsonHref: reportDownloadHref(reportName, 'json'), csvHref: reportDownloadHref(reportName, 'csv'), xlsxHref: reportDownloadHref(reportName, 'xlsx'), pdfHref: reportDownloadHref(reportName, 'pdf') };
  }
}
