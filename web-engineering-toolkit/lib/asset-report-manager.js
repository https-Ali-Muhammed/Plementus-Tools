import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, slugify, timestamp, csvEscape } from './utils.js';
import { generateToolPdf } from './pdf-report-renderer.js';
import { assetPdfHtml } from './tool-pdf-reports.js';
import { reportDownloadHref } from './report-downloads.js';
import { writeReportXlsx } from './xlsx-reports.js';
import { reportBackToTopControl, reportHtmlQuickActions, reportHtmlTheme } from './report-html-theme.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;' }[char]));
}
function formatBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${Math.round(bytes)} B`;
}
function humanize(value) { return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function severityLabel(value) { return ({ high: 'High priority', medium: 'Review', low: 'Opportunity' })[value] || humanize(value); }

function writeCsv(root, result) {
  const headers = ['Page', 'Device', 'HTTP Status', 'Page Weight', 'Requests', 'JavaScript', 'CSS', 'Images', 'Fonts', 'Media', 'Third-party', 'DOM Elements', 'Findings'];
  const rows = result.pages.map((page) => [
    page.finalUrl, humanize(page.device), page.status, formatBytes(page.totalTransferBytes), page.requestCount,
    formatBytes(page.breakdown.script), formatBytes(page.breakdown.stylesheet), formatBytes(page.breakdown.image), formatBytes(page.breakdown.font), formatBytes(page.breakdown.media),
    formatBytes(page.thirdPartyBytes), page.dom?.domElements || 0, page.findings.length
  ]);
  fs.writeFileSync(path.join(root, 'summary.csv'), [headers, ...rows].map((row) => row.map(csvEscape).join(',')).join('\n'));

  const assetHeaders = ['Page', 'Asset URL', 'Type', 'Transfer Size', 'Host', 'HTTP Status', 'Content Encoding', 'Cache-Control', 'First Party'];
  const assetRows = result.pages.flatMap((page) => page.resources.map((asset) => [page.finalUrl, asset.url, humanize(asset.category), formatBytes(asset.transferBytes), asset.host, asset.status, asset.contentEncoding || 'None', asset.cacheControl || 'Not set', asset.firstParty ? 'Yes' : 'No']));
  fs.writeFileSync(path.join(root, 'assets.csv'), [assetHeaders, ...assetRows].map((row) => row.map(csvEscape).join(',')).join('\n'));
}

export function buildAssetSummaryHtml(result) {
  const breakdown = Object.entries(result.summary.breakdown).sort((a,b)=>b[1]-a[1]);
  const maxBreakdown = Math.max(...breakdown.map(([,value])=>value),1);
  const pageRows = result.pages.map((page)=>`<tr><td><strong>${escapeHtml(new URL(page.finalUrl).pathname || '/')}</strong><span class="report-muted report-machine-text">${escapeHtml(page.finalUrl)}</span></td><td><span class="report-status-chip ${page.status >= 400 ? 'danger' : 'good'}">${page.status}</span></td><td>${formatBytes(page.totalTransferBytes)}</td><td>${page.requestCount}</td><td>${formatBytes(page.breakdown.script)}</td><td>${formatBytes(page.breakdown.image)}</td><td>${formatBytes(page.thirdPartyBytes)}</td><td>${page.findings.length}</td></tr>`).join('');
  const findingCards = result.findings.length ? result.findings.map((finding)=>`<article class="finding ${finding.severity}"><span class="report-status-chip ${finding.severity === 'high' ? 'danger' : 'warning'}">${escapeHtml(severityLabel(finding.severity))}</span><div><b>${escapeHtml(finding.title)}</b><p>${escapeHtml(finding.detail)}</p><small>${escapeHtml(finding.recommendation)}</small></div></article>`).join('') : '<div class="empty">No page-weight thresholds were triggered.</div>';
  const assetRows = result.largestAssets.slice(0,20).map((a)=>`<tr><td><span class="report-status-chip">${escapeHtml(humanize(a.category))}</span></td><td><details class="asset-url-details"><summary>${escapeHtml(a.url)}</summary><a class="report-machine-text" href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${escapeHtml(a.url)}</a></details></td><td>${formatBytes(a.transferBytes)}</td><td>${escapeHtml(a.host)}</td></tr>`).join('');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Asset Report · ${escapeHtml(result.projectName)}</title><link rel="icon" href="/assets/mark-color.png"><style>${reportHtmlTheme({ accent: '#b59aff', accentSoft: 'rgba(181,154,255,.12)' })}.asset-bars,.findings{display:grid;gap:10px}.asset-bar-row{display:grid;grid-template-columns:130px minmax(0,1fr) 96px;gap:12px;align-items:center;font-size:12px}.asset-bar{height:9px;overflow:hidden;border-radius:999px;background:#1c2941}.asset-bar i{display:block;height:100%;border-radius:inherit;background:linear-gradient(90deg,#a78bfa,#72b6ff)}.finding{display:grid;grid-template-columns:80px minmax(0,1fr);gap:13px;padding:14px;border:1px solid var(--report-border);border-radius:13px;background:var(--report-panel-soft)}.finding p,.finding small{margin:5px 0 0;color:var(--report-muted);font-size:12px}.asset-url-details{max-width:min(520px,42vw)}.asset-url-details summary{overflow:hidden;color:#a8cbff;cursor:pointer;text-overflow:ellipsis;white-space:nowrap}.asset-url-details[open] summary{margin-bottom:6px;white-space:normal}.empty{padding:22px;color:var(--report-muted);text-align:center}@media(max-width:560px){.asset-bar-row,.finding{grid-template-columns:1fr}.asset-url-details{max-width:270px}}</style></head><body><main class="report-shell"><header class="report-header"><div><div class="report-eyebrow">Web Engineering Toolkit · Asset &amp; Page-Weight Analyzer</div><h1 class="report-title">${escapeHtml(result.projectName)}</h1><p class="report-subtitle report-machine-text">${escapeHtml(result.baseUrl)} · ${escapeHtml(humanize(result.device))} · ${escapeHtml(new Date(result.generatedAt).toLocaleString())}</p></div>${reportHtmlQuickActions({ exports: [['summary.pdf', 'PDF'], ['summary.xlsx', 'Excel'], ['summary.csv', 'CSV'], ['summary.json', 'JSON']], label: 'Asset report exports' })}</header><section class="report-metrics" style="--metric-columns:4"><div class="report-metric"><span>Pages analyzed</span><strong>${result.summary.pageCount}</strong></div><div class="report-metric"><span>Average page weight</span><strong>${formatBytes(result.summary.averageBytes)}</strong></div><div class="report-metric"><span>Average requests</span><strong>${Math.round(result.summary.averageRequests)}</strong></div><div class="report-metric"><span>Third-party transfer</span><strong>${formatBytes(result.summary.thirdPartyBytes)}</strong></div></section><section class="report-section"><div class="report-section-heading"><h2>Resource breakdown</h2></div><div class="asset-bars">${breakdown.map(([type,bytes])=>`<div class="asset-bar-row"><span>${escapeHtml(humanize(type))}</span><div class="asset-bar"><i style="width:${Math.max(2,bytes/maxBreakdown*100)}%"></i></div><b>${formatBytes(bytes)}</b></div>`).join('')}</div></section><section class="report-section"><div class="report-section-heading"><h2>Page results</h2></div><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Page</th><th>Status</th><th>Weight</th><th>Requests</th><th>JS</th><th>Images</th><th>Third-party</th><th>Findings</th></tr></thead><tbody>${pageRows}</tbody></table></div></section><section class="report-section"><div class="report-section-heading"><h2>Optimization findings</h2></div><div class="findings">${findingCards}</div></section><section class="report-section"><div class="report-section-heading"><h2>Largest transferred assets</h2></div><div class="report-table-wrap"><table class="report-table"><thead><tr><th>Type</th><th>Asset</th><th>Size</th><th>Host</th></tr></thead><tbody>${assetRows}</tbody></table></div></section></main>${reportBackToTopControl()}</body></html>`;
  return html;
}

function writeHtml(root, result) {
  fs.writeFileSync(path.join(root, 'summary.html'), buildAssetSummaryHtml(result));
}

export class AssetReportManager {
  constructor({ reportsRoot }) { this.reportsRoot = ensureDir(reportsRoot); }
  async save(result) {
    const reportName = `${slugify(result.projectName)}_asset-page-weight_${result.device}_${timestamp()}`;
    const root = ensureDir(path.join(this.reportsRoot, reportName));
    const overview = {
      reportType: 'asset-page-weight', projectName: result.projectName, baseUrl: result.baseUrl, device: result.device,
      pages: result.summary.pageCount, assetAverageBytes: Math.round(result.summary.averageBytes), assetTotalBytes: Math.round(result.summary.totalBytes),
      assetAverageRequests: Math.round(result.summary.averageRequests * 100) / 100, assetThirdPartyBytes: Math.round(result.summary.thirdPartyBytes), findings: result.findings.length
    };
    fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify({ reportType:'asset-page-weight', generatedAt:result.generatedAt, overview, ...result }, null, 2));
    fs.writeFileSync(path.join(root, 'metadata.json'), JSON.stringify({ reportType:'asset-page-weight', generatedAt:result.generatedAt, projectName:result.projectName, baseUrl:result.baseUrl, device:result.device }, null, 2));
    writeCsv(root, result);
    await writeReportXlsx({ root, reportType: 'asset-page-weight', data: result });
    writeHtml(root, result);
    const pdfGeneration = await generateToolPdf({ html: assetPdfHtml(result), pdfPath: path.join(root, 'summary.pdf'), toolName: 'Asset & Page-Weight Analyzer', reportTitle: 'Asset & Page-Weight Analysis', projectName: result.projectName, target: result.baseUrl });
    return {
      ...result, reportName, overview, pdfGeneration,
      summaryHref:`/reports/${encodeURIComponent(reportName)}/summary.html`,
      csvHref:reportDownloadHref(reportName, 'csv'),
      xlsxHref:reportDownloadHref(reportName, 'xlsx'),
      pdfHref:reportDownloadHref(reportName, 'pdf'),
      assetsCsvHref:`/reports/${encodeURIComponent(reportName)}/assets.csv`
    };
  }
}
