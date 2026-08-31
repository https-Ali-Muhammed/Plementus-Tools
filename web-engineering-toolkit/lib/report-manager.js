import fs from 'node:fs';
import path from 'node:path';
import { csvEscape, ensureDir, median, slugify, timestamp } from './utils.js';
import { generateToolPdf } from './pdf-report-renderer.js';
import { lighthousePdfHtml } from './tool-pdf-reports.js';
import { reportDownloadHref } from './report-downloads.js';

const CATEGORY_META = {
  performance: { label: 'Performance', key: 'performance' },
  accessibility: { label: 'Accessibility', key: 'accessibility' },
  'best-practices': { label: 'Best Practices', key: 'bestPractices' },
  seo: { label: 'SEO', key: 'seo' }
};
const DEFAULT_CATEGORIES = Object.keys(CATEGORY_META);

function selectedCategories(config = {}) {
  const list = Array.isArray(config.categories) ? config.categories.filter((id) => CATEGORY_META[id]) : [];
  return list.length ? [...new Set(list)] : DEFAULT_CATEGORIES;
}

function categoryScore(report, key) {
  const score = report?.categories?.[key]?.score;
  return Number.isFinite(score) ? Math.round(score * 10000) / 100 : null;
}

function auditValue(report, key) {
  const value = report?.audits?.[key]?.numericValue;
  return Number.isFinite(value) ? value : null;
}

function readJson(file) {
  try {
    if (!file || !fs.existsSync(file)) return null;
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch {
    return null;
  }
}

function relFile(root, file) {
  if (!file || !fs.existsSync(file)) return '';
  return path.relative(root, file).split(path.sep).join('/');
}

function groupStatus({ totalRuns, validRuns, redirectedRuns, failedRuns, cancelledRuns }) {
  if (totalRuns > 0 && validRuns === totalRuns) return 'valid';
  if (validRuns > 0) return 'partial';
  if (redirectedRuns > 0 && failedRuns === 0 && cancelledRuns === 0) return 'redirected';
  if (failedRuns > 0) return 'failed';
  if (cancelledRuns > 0) return 'cancelled';
  return 'no-data';
}

function metricMedian(rows, key) {
  return median(rows.map((row) => row[key]).filter((value) => value !== '' && value != null).map(Number).filter(Number.isFinite));
}

function formatScore(value) {
  return value === '' || value == null ? '—' : String(Math.round(Number(value) * 100) / 100);
}

function formatMs(value) {
  if (value === '' || value == null) return '—';
  const number = Number(value);
  return Number.isFinite(number) ? `${Math.round(number).toLocaleString('en-US')} ms` : '—';
}

function formatBytes(value) {
  if (value === '' || value == null) return '—';
  const bytes = Number(value);
  if (!Number.isFinite(bytes)) return '—';
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${Math.round(bytes)} B`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

function cleanText(value) {
  return String(value || '')
    .replace(/\[([^\]]+)\]\([^\)]+\)/g, '$1')
    .replace(/`([^`]+)`/g, '$1')
    .replace(/\s+/g, ' ')
    .trim();
}

function scoreClass(score) {
  if (score === '' || score == null || !Number.isFinite(Number(score))) return 'na';
  if (Number(score) >= 90) return 'good';
  if (Number(score) >= 50) return 'mid';
  return 'low';
}

function auditStatus(audit) {
  if (!audit) return 'not-applicable';
  if (audit.errorMessage) return 'error';
  if (Array.isArray(audit.warnings) && audit.warnings.length) return 'warning';
  if (audit.scoreDisplayMode === 'notApplicable') return 'not-applicable';
  if (audit.scoreDisplayMode === 'manual') return 'manual';
  if (audit.score === 1) return 'passed';
  if (Number.isFinite(audit.score) && audit.score < 1) return 'issue';
  if (audit.scoreDisplayMode === 'informative' && (audit.displayValue || audit.details)) return 'info';
  return 'passed';
}

function isFinding(status) {
  return ['issue', 'warning', 'error', 'manual', 'info'].includes(status);
}

function humanize(value) {
  return String(value || 'Other checks')
    .replace(/[-_]+/g, ' ')
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

function extractAuditGroups(report, categories) {
  const output = [];
  const categoryGroups = report?.categoryGroups || {};

  for (const categoryId of categories) {
    const category = report?.categories?.[categoryId];
    if (!category) continue;
    const categoryTitle = category.title || CATEGORY_META[categoryId]?.label || humanize(categoryId);
    const groups = new Map();

    for (const ref of category.auditRefs || []) {
      const audit = report?.audits?.[ref.id];
      if (!audit) continue;
      const groupId = ref.group || `${categoryId}-other`;
      if (!groups.has(groupId)) {
        groups.set(groupId, {
          id: groupId,
          title: categoryGroups[groupId]?.title || (ref.group ? humanize(ref.group) : 'Other checks'),
          description: cleanText(categoryGroups[groupId]?.description || ''),
          totalChecks: 0,
          passedChecks: 0,
          findings: []
        });
      }
      const group = groups.get(groupId);
      const status = auditStatus(audit);
      group.totalChecks += 1;
      if (status === 'passed' || status === 'not-applicable') group.passedChecks += 1;
      if (isFinding(status)) {
        group.findings.push({
          id: ref.id,
          title: cleanText(audit.title || humanize(ref.id)),
          description: cleanText(audit.description || ''),
          explanation: cleanText(audit.explanation || audit.errorMessage || ''),
          displayValue: cleanText(audit.displayValue || ''),
          warnings: (audit.warnings || []).map(cleanText).filter(Boolean),
          status,
          score: Number.isFinite(audit.score) ? audit.score : null,
          weight: Number.isFinite(ref.weight) ? ref.weight : 0
        });
      }
    }

    output.push({
      id: categoryId,
      title: categoryTitle,
      groups: [...groups.values()].map((group) => ({
        ...group,
        findingCount: group.findings.length
      }))
    });
  }
  return output;
}

function aggregateInsights(rows, categories) {
  const categoryMap = new Map(categories.map((id) => [id, {
    id,
    title: CATEGORY_META[id]?.label || humanize(id),
    groups: new Map(),
    totalFindings: 0
  }]));

  for (const row of rows) {
    for (const category of row.auditGroups || []) {
      if (!categoryMap.has(category.id)) categoryMap.set(category.id, { id: category.id, title: category.title, groups: new Map(), totalFindings: 0 });
      const categoryTarget = categoryMap.get(category.id);
      categoryTarget.title = category.title || categoryTarget.title;

      for (const group of category.groups || []) {
        if (!categoryTarget.groups.has(group.id)) {
          categoryTarget.groups.set(group.id, {
            id: group.id,
            title: group.title,
            description: group.description,
            checkedRows: 0,
            affectedRows: 0,
            totalChecks: 0,
            findings: new Map()
          });
        }
        const groupTarget = categoryTarget.groups.get(group.id);
        groupTarget.checkedRows += 1;
        groupTarget.totalChecks += group.totalChecks || 0;
        if (group.findings?.length) groupTarget.affectedRows += 1;

        for (const finding of group.findings || []) {
          if (!groupTarget.findings.has(finding.id)) {
            groupTarget.findings.set(finding.id, {
              ...finding,
              affected: [],
              occurrences: 0
            });
          }
          const target = groupTarget.findings.get(finding.id);
          target.occurrences += 1;
          target.affected.push({ path: row.path, device: row.device, status: row.status });
          if (!target.explanation && finding.explanation) target.explanation = finding.explanation;
          if (!target.displayValue && finding.displayValue) target.displayValue = finding.displayValue;
        }
      }
    }
  }

  return [...categoryMap.values()].map((category) => {
    const groups = [...category.groups.values()].map((group) => {
      const findings = [...group.findings.values()].sort((a, b) => {
        const rank = { error: 5, issue: 4, warning: 3, manual: 2, info: 1 };
        return (rank[b.status] || 0) - (rank[a.status] || 0) || b.occurrences - a.occurrences || a.title.localeCompare(b.title);
      });
      return {
        ...group,
        findings,
        findingCount: findings.length
      };
    });
    const totalFindings = groups.reduce((sum, group) => sum + group.findingCount, 0);
    return { id: category.id, title: category.title, totalFindings, groups };
  });
}

function representativeRun(validRuns, categories) {
  if (!validRuns.length) return null;
  const medians = Object.fromEntries(categories.map((id) => [id, median(validRuns.map(({ report }) => categoryScore(report, id))) ]));
  return [...validRuns].sort((a, b) => {
    const distance = (entry) => {
      const values = categories.map((id) => {
        const center = medians[id];
        const score = categoryScore(entry.report, id);
        return center === '' || score == null ? 0 : Math.abs(score - center);
      });
      return values.reduce((sum, value) => sum + value, 0);
    };
    return distance(a) - distance(b);
  })[0];
}

function findingStatusLabel(status) {
  const normalized = String(status || '').toLowerCase();
  if (normalized === 'issue' || normalized === 'error') return 'Needs attention';
  if (normalized === 'warning') return 'Review';
  if (normalized === 'info') return 'Info';
  if (normalized === 'manual') return 'Manual review';
  return humanize(status);
}

const accordionChevron = '<span class="accordion-chevron" aria-hidden="true"><svg viewBox="0 0 20 20"><path d="m7 5 5 5-5 5"/></svg></span>';

function buildInsightsHtml(insights) {
  const categories = insights?.categories || [];
  return categories.map((category) => `
    <section class="insight-category">
      <div class="insight-category-head"><div><span class="category-tag">${escapeHtml(category.title)}</span><strong>${category.totalFindings ? `${category.totalFindings} important finding${category.totalFindings === 1 ? '' : 's'}` : 'No important findings'}</strong></div></div>
      <div class="insight-groups">
        ${(category.groups || []).map((group) => `<details class="insight-group">
          <summary><div><strong>${escapeHtml(group.title)}</strong><span>${escapeHtml(group.description || `${group.totalChecks || 0} checks`)}</span></div><div class="accordion-summary-actions"><span class="finding-badge ${group.findingCount ? 'has-findings' : ''}">${group.findingCount || 0} finding${group.findingCount === 1 ? '' : 's'}</span>${accordionChevron}</div></summary>
          <div class="finding-list">${group.findings?.length ? group.findings.map((finding) => `<div class="finding-row">
            <span class="finding-status ${escapeHtml(finding.status)}"><span class="finding-status-dot"></span>${escapeHtml(findingStatusLabel(finding.status))}</span>
            <div><strong>${escapeHtml(finding.title)}</strong><span>${escapeHtml([finding.displayValue, finding.explanation].filter(Boolean).join(' — ') || finding.description || 'Review this check in the full Lighthouse report.')}</span><small>Affects ${finding.affected.length} page/device result${finding.affected.length === 1 ? '' : 's'}: ${escapeHtml(finding.affected.slice(0, 6).map((item) => `${item.path} (${humanize(item.device)})`).join(', '))}${finding.affected.length > 6 ? '…' : ''}</small></div>
          </div>`).join('') : '<div class="finding-empty">No important findings in this group.</div>'}</div>
        </details>`).join('')}
      </div>
    </section>`).join('');
}

function buildSummaryHtml(summary) {
  const { overview, rows, insights } = summary;
  const categories = overview.categories || DEFAULT_CATEGORIES;
  const scoreCard = (id) => { const meta = CATEGORY_META[id]; const value = overview[meta.key]; return `<div class="score-card"><span>${escapeHtml(meta.label)}</span><strong class="${scoreClass(value)}">${escapeHtml(formatScore(value))}</strong></div>`; };
  const metric = (label, value) => `<div class="metric"><span>${escapeHtml(label)}</span><strong>${escapeHtml(value)}</strong></div>`;
  const externalIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 4h6v6M20 4l-9 9M19 13v6a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V6a1 1 0 0 1 1-1h6"/></svg>';
  const scoreHeaders = categories.map((id) => `<th>${escapeHtml(CATEGORY_META[id].label)}</th>`).join('');
  const scoreCells = (row) => categories.map((id) => { const key = CATEGORY_META[id].key; return `<td class="${scoreClass(row[key])}">${escapeHtml(formatScore(row[key]))}</td>`; }).join('');
  const performanceHeaders = categories.includes('performance') ? '<th>LCP</th><th>CLS</th>' : '';
  const performanceCells = (row) => categories.includes('performance') ? `<td>${escapeHtml(formatMs(row.lcpMs))}</td><td>${escapeHtml(row.cls === '' ? '—' : row.cls)}</td>` : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${escapeHtml(overview.projectName || 'Lighthouse')} — Lighthouse Summary</title><link rel="icon" type="image/png" href="/assets/mark-color.png">
<style>
:root{color-scheme:dark;--bg:#090e1a;--panel:#11192d;--border:rgba(255,255,255,.09);--text:#f7f9ff;--muted:#95a0ba;--good:#4fd1a1;--mid:#ffbf69;--low:#ff6b7a;--accent:#7c6cff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 15% 0%,rgba(87,85,255,.14),transparent 30%),linear-gradient(180deg,#0b1020,#080c16);color:var(--text);font:14px/1.5 Inter,system-ui,sans-serif}.wrap{max-width:1480px;margin:auto;padding:42px 28px 70px}.top{display:flex;justify-content:space-between;gap:20px;align-items:flex-start;margin-bottom:28px}.eyebrow{color:#a99fff;font-size:11px;text-transform:uppercase;letter-spacing:.15em;font-weight:800}h1{margin:8px 0 8px;font-size:38px;letter-spacing:-.04em}.sub{color:var(--muted)}.actions{display:flex;gap:9px;flex-wrap:wrap}.btn{display:inline-flex;align-items:center;gap:7px;color:#e9e6ff;text-decoration:none;border:1px solid rgba(124,108,255,.28);background:rgba(124,108,255,.10);padding:10px 12px;border-radius:11px;font-weight:750;font-size:12px}.cards{display:grid;grid-template-columns:repeat(${Math.min(categories.length,4)},1fr);gap:12px}.score-card,.metric{border:1px solid var(--border);background:linear-gradient(180deg,rgba(19,27,48,.94),rgba(14,21,38,.94));border-radius:16px;padding:16px}.score-card span,.metric span{display:block;color:var(--muted);font-size:11px;margin-bottom:7px}.score-card strong{font-size:30px}.good{color:var(--good)}.mid{color:var(--mid)}.low{color:var(--low)}.na{color:var(--muted)}.status-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:10px;margin:12px 0}.metric strong{font-size:18px}.metrics{display:grid;grid-template-columns:repeat(7,1fr);gap:10px;margin:12px 0 24px}.panel,.insight-category{border:1px solid var(--border);background:rgba(17,25,45,.88);border-radius:18px;overflow:hidden;margin-top:18px}.panel-head,.insight-category-head{display:flex;justify-content:space-between;gap:15px;align-items:center;padding:18px 20px;border-bottom:1px solid var(--border)}.panel-head h2{font-size:16px;margin:0}.table-wrap{overflow:auto}table{width:100%;border-collapse:collapse;min-width:980px}th,td{padding:12px 13px;border-bottom:1px solid var(--border);text-align:left;font-size:12px}th{color:#7f8aa5;font-size:10px;text-transform:uppercase;letter-spacing:.08em;background:rgba(255,255,255,.02)}.badge,.category-tag,.finding-badge,.finding-status{display:inline-flex;padding:5px 8px;border-radius:999px;font-size:10px;font-weight:800;text-transform:capitalize;background:rgba(255,255,255,.05);color:var(--muted)}.badge.valid{color:var(--good);background:rgba(79,209,161,.09)}.badge.partial,.badge.redirected{color:var(--mid);background:rgba(255,191,105,.09)}.badge.failed{color:var(--low);background:rgba(255,107,122,.09)}.open{width:32px;height:32px;display:grid;place-items:center;border-radius:9px;border:1px solid rgba(124,108,255,.24);background:rgba(124,108,255,.09);color:#cfcaff}.open svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2}.open.disabled{opacity:.28;pointer-events:none}.path{font-weight:700}.tested{color:var(--muted);font-size:10px;margin-top:3px}.insights-title{margin:32px 0 10px}.insights-title h2{margin:0 0 5px}.insight-category-head>div{display:flex;align-items:center;gap:10px}.category-tag{color:#cfcaff;background:rgba(124,108,255,.1)}.insight-groups{padding:10px 14px 14px}.insight-group{border-bottom:1px solid var(--border)}.insight-group:last-child{border-bottom:0}.insight-group summary{cursor:pointer;display:flex;justify-content:space-between;align-items:center;gap:16px;padding:13px 4px;list-style:none}.insight-group summary::-webkit-details-marker{display:none}.insight-group summary div{display:grid;gap:8px,}.insight-group summary span{color:var(--muted);font-size:11px}.finding-badge.has-findings{color:var(--mid);background:rgba(255,191,105,.09)}.finding-list{padding:0 4px 14px}.finding-row{display:grid;grid-template-columns:90px 1fr;gap:12px;padding:12px;border:1px solid var(--border);border-radius:12px;margin-top:8px;background:rgba(255,255,255,.02)}.finding-row div{display:grid;gap:5px}.finding-row div span,.finding-row small{color:var(--muted);font-size:11px}.finding-status.issue,.finding-status.error{color:var(--low);background:rgba(255,107,122,.09)}.finding-status.warning{color:var(--mid);background:rgba(255,191,105,.09)}.finding-status.info{color:#7eb6ff;background:rgba(79,156,255,.1)}.finding-status.manual{color:#b8a5ff;background:rgba(124,108,255,.1)}.finding-empty{padding:12px;color:var(--muted);font-size:11px}@media(max-width:900px){.cards{grid-template-columns:1fr 1fr}.status-grid{grid-template-columns:repeat(3,1fr)}.metrics{grid-template-columns:repeat(3,1fr)}.top{display:grid}}@media(max-width:560px){.cards,.status-grid,.metrics{grid-template-columns:1fr 1fr}.wrap{padding:24px 14px}h1{font-size:28px}.finding-row{grid-template-columns:1fr}}

.insight-group summary{min-height:58px;padding:13px 6px;border-radius:10px;transition:background .16s ease}.insight-group summary:hover{background:rgba(255,255,255,.025)}.accordion-summary-actions{display:flex;align-items:center;gap:9px;flex:0 0 auto}.accordion-chevron{width:32px;height:32px;display:grid;place-items:center;border:1px solid rgba(124,108,255,.2);background:rgba(124,108,255,.07);border-radius:9px;color:#aaa3ff}.accordion-chevron svg{width:15px;height:15px;fill:none;stroke:currentColor;stroke-width:2;stroke-linecap:round;stroke-linejoin:round;transition:transform .18s ease}.insight-group[open] .accordion-chevron svg{transform:rotate(90deg)}.finding-row{grid-template-columns:132px 1fr;align-items:start}.finding-status{align-self:start;justify-self:start;width:auto;min-width:0;gap:6px;padding:7px 9px;border-radius:8px;border:1px solid rgba(255,255,255,.075);text-transform:none;white-space:nowrap}.finding-status-dot{width:6px;height:6px;flex:0 0 6px;border-radius:999px;background:currentColor}.finding-status.issue,.finding-status.error{color:#ff8795;border-color:rgba(255,107,122,.18);background:rgba(255,107,122,.055)}.finding-status.warning{color:#ffc36f;border-color:rgba(255,191,105,.18);background:rgba(255,191,105,.055)}.finding-status.info{color:#83bcff;border-color:rgba(79,156,255,.18);background:rgba(79,156,255,.055)}.finding-status.manual{color:#bbaeff;border-color:rgba(124,108,255,.18);background:rgba(124,108,255,.055)}@media(max-width:560px){.finding-row{grid-template-columns:1fr}}

</style></head><body><main class="wrap">
<div class="top"><div><div class="eyebrow">Lighthouse final report</div><h1>${escapeHtml(overview.projectName || 'Project')}</h1><div class="sub">${escapeHtml(overview.baseUrl || '')} · ${escapeHtml(String(overview.mode || '').toUpperCase())} · ${escapeHtml(String(overview.targetLanguage || '').toUpperCase())} · ${escapeHtml(new Date(summary.generatedAt).toLocaleString())}</div></div><div class="actions"><a class="btn" href="${escapeHtml(reportDownloadHref(summary.reportName, 'csv'))}" download>Download CSV</a><a class="btn" href="${escapeHtml(reportDownloadHref(summary.reportName, 'pdf'))}" download>Download PDF</a></div></div>
<div class="cards">${categories.map(scoreCard).join('')}</div>
<div class="status-grid">${metric('Pages',overview.pages)}${metric('Total audits',overview.totalAudits)}${metric('Valid',overview.validAudits)}${metric('Redirected',overview.redirectedAudits)}${metric('Failed',overview.failedAudits)}${metric('Cancelled',overview.cancelledAudits)}</div>
${categories.includes('performance') ? `<div class="metrics">${metric('FCP',formatMs(overview.fcpMs))}${metric('LCP',formatMs(overview.lcpMs))}${metric('Speed Index',formatMs(overview.speedIndexMs))}${metric('TBT',formatMs(overview.tbtMs))}${metric('CLS',overview.cls === '' ? '—' : overview.cls)}${metric('Transfer',formatBytes(overview.totalBytes))}${metric('DOM',overview.domElements === '' ? '—' : overview.domElements)}</div>` : ''}
<div class="insights-title"><h2>Important Lighthouse findings</h2><div class="sub">Grouped from Lighthouse's own category and audit groups. Passed groups stay visible so coverage is clear.</div></div>${buildInsightsHtml(insights)}
<section class="panel"><div class="panel-head"><h2>Page results</h2><div class="sub">Median values from valid runs only. Findings come from the representative report for each page/device.</div></div><div class="table-wrap"><table><thead><tr><th>Page</th><th>Device</th><th>Status</th><th>Runs</th>${scoreHeaders}${performanceHeaders}<th>Findings</th><th>Report</th></tr></thead><tbody>
${rows.map((row) => `<tr><td><div class="path">${escapeHtml(row.path)}</div><div class="tested">${escapeHtml(row.testedPath)}</div></td><td>${escapeHtml(row.device)}</td><td><span class="badge ${escapeHtml(row.status)}">${escapeHtml(row.status)}</span></td><td>${row.validRuns}/${row.totalRuns} valid</td>${scoreCells(row)}${performanceCells(row)}<td>${row.findingCount || 0}</td><td>${row.reportFile ? `<a class="open" href="${escapeHtml(row.reportFile)}" target="_blank" rel="noopener" title="Open Lighthouse report">${externalIcon}</a>` : `<span class="open disabled">${externalIcon}</span>`}</td></tr>`).join('')}
</tbody></table></div></section></main></body></html>`;
}

export class ReportManager {
  constructor({ reportsRoot }) { this.reportsRoot = reportsRoot; }

  createRunDirectory(config) {
    const project = slugify(config.projectName);
    const runName = `${project}_lighthouse_${config.mode}_${config.targetLanguage}_${timestamp()}`;
    const root = ensureDir(path.join(this.reportsRoot, runName));
    ensureDir(path.join(root, 'mobile')); ensureDir(path.join(root, 'desktop')); ensureDir(path.join(root, 'logs', 'mobile')); ensureDir(path.join(root, 'logs', 'desktop'));
    return { root, runName };
  }

  writeMetadata(root, config, extra = {}) {
    const payload = {
      reportType: 'lighthouse', generatedAt: new Date().toISOString(), projectName: config.projectName, mode: config.mode,
      targetLanguage: config.targetLanguage, defaultLanguage: config.defaultLanguage, baseUrl: config.baseUrl,
      runsPerPage: config.runsPerPage, devices: config.devices, categories: selectedCategories(config), lighthouseVersion: '12.8.2', ...extra
    };
    fs.writeFileSync(path.join(root, 'metadata.json'), JSON.stringify(payload, null, 2));
  }

  writeManifest(root, records) { fs.writeFileSync(path.join(root, 'run_manifest.json'), JSON.stringify(records, null, 2)); }

  async generateSummary(root, records, config = {}) {
    const categories = selectedCategories(config);
    const groups = new Map();
    for (const record of records) {
      const key = [record.device, record.language, record.path, record.testedPath].join('|');
      if (!groups.has(key)) groups.set(key, { key: { device: record.device, language: record.language, path: record.path, testedPath: record.testedPath }, runs: [] });
      groups.get(key).runs.push({ record, report: readJson(record.jsonFile) });
    }

    const rows = [...groups.values()].map(({ key, runs }) => {
      const validRuns = runs.filter(({ record, report }) => record.status === 'valid' && report);
      const counts = {
        totalRuns: runs.length, validRuns: runs.filter(({ record }) => record.status === 'valid').length,
        redirectedRuns: runs.filter(({ record }) => record.status === 'redirected').length,
        failedRuns: runs.filter(({ record }) => record.status === 'failed').length,
        cancelledRuns: runs.filter(({ record }) => record.status === 'cancelled').length
      };
      const reports = validRuns.map(({ report }) => report);
      const representative = representativeRun(validRuns, categories) || runs.find(({ record }) => record.htmlFile && fs.existsSync(record.htmlFile)) || null;
      const auditGroups = representative?.report ? extractAuditGroups(representative.report, categories) : [];
      const scores = {};
      for (const id of DEFAULT_CATEGORIES) scores[CATEGORY_META[id].key] = categories.includes(id) ? median(reports.map((r) => categoryScore(r, id))) : '';
      return {
        ...key, ...counts, status: groupStatus(counts), ...scores,
        fcpMs: categories.includes('performance') ? median(reports.map((r) => auditValue(r, 'first-contentful-paint'))) : '',
        lcpMs: categories.includes('performance') ? median(reports.map((r) => auditValue(r, 'largest-contentful-paint'))) : '',
        speedIndexMs: categories.includes('performance') ? median(reports.map((r) => auditValue(r, 'speed-index'))) : '',
        tbtMs: categories.includes('performance') ? median(reports.map((r) => auditValue(r, 'total-blocking-time'))) : '',
        cls: categories.includes('performance') ? median(reports.map((r) => auditValue(r, 'cumulative-layout-shift'))) : '',
        mainThreadMs: categories.includes('performance') ? median(reports.map((r) => auditValue(r, 'mainthread-work-breakdown'))) : '',
        totalBytes: categories.includes('performance') ? median(reports.map((r) => auditValue(r, 'total-byte-weight'))) : '',
        domElements: categories.includes('performance') ? median(reports.map((r) => auditValue(r, 'dom-size'))) : '',
        representativeRun: representative?.record?.iteration || '', reportStatus: representative?.record?.status || '', reportFile: relFile(root, representative?.record?.htmlFile),
        auditGroups,
        findingCount: auditGroups.reduce((sum, category) => sum + category.groups.reduce((groupSum, group) => groupSum + (group.findingCount || 0), 0), 0)
      };
    }).sort((a, b) => `${a.path}|${a.device}`.localeCompare(`${b.path}|${b.device}`));

    const overviewRows = rows.filter((row) => row.validRuns > 0);
    const overview = {
      reportType: 'lighthouse', projectName: config.projectName || '', baseUrl: config.baseUrl || '', mode: config.mode || '', targetLanguage: config.targetLanguage || '',
      defaultLanguage: config.defaultLanguage || '', runsPerPage: config.runsPerPage || '', devices: config.devices || [...new Set(rows.map((row) => row.device))], categories,
      pages: new Set(records.map((record) => record.path)).size, pageDeviceRows: rows.length, totalAudits: records.length,
      validAudits: records.filter((r) => r.status === 'valid').length, redirectedAudits: records.filter((r) => r.status === 'redirected').length,
      failedAudits: records.filter((r) => r.status === 'failed').length, cancelledAudits: records.filter((r) => r.status === 'cancelled').length,
      performance: categories.includes('performance') ? metricMedian(overviewRows, 'performance') : '',
      accessibility: categories.includes('accessibility') ? metricMedian(overviewRows, 'accessibility') : '',
      bestPractices: categories.includes('best-practices') ? metricMedian(overviewRows, 'bestPractices') : '',
      seo: categories.includes('seo') ? metricMedian(overviewRows, 'seo') : '',
      fcpMs: categories.includes('performance') ? metricMedian(overviewRows, 'fcpMs') : '', lcpMs: categories.includes('performance') ? metricMedian(overviewRows, 'lcpMs') : '',
      speedIndexMs: categories.includes('performance') ? metricMedian(overviewRows, 'speedIndexMs') : '', tbtMs: categories.includes('performance') ? metricMedian(overviewRows, 'tbtMs') : '',
      cls: categories.includes('performance') ? metricMedian(overviewRows, 'cls') : '', mainThreadMs: categories.includes('performance') ? metricMedian(overviewRows, 'mainThreadMs') : '',
      totalBytes: categories.includes('performance') ? metricMedian(overviewRows, 'totalBytes') : '', domElements: categories.includes('performance') ? metricMedian(overviewRows, 'domElements') : ''
    };
    const insights = { categories: aggregateInsights(rows, categories) };
    overview.totalFindings = insights.categories.reduce((sum, category) => sum + category.totalFindings, 0);
    const summary = { version: 3, reportType: 'lighthouse', reportName: path.basename(root), generatedAt: new Date().toISOString(), overview, insights, rows };

    const csvColumns = [['Page', (row) => row.path], ['Device', (row) => humanize(row.device)], ['Status', (row) => humanize(row.status)], ['Runs', (row) => `${row.validRuns}/${row.totalRuns} valid`]];
    for (const id of categories) csvColumns.push([CATEGORY_META[id].label, (row) => formatScore(row[CATEGORY_META[id].key])]);
    if (categories.includes('performance')) csvColumns.push(['FCP', (row) => formatMs(row.fcpMs)], ['LCP', (row) => formatMs(row.lcpMs)], ['Speed Index', (row) => formatMs(row.speedIndexMs)], ['TBT', (row) => formatMs(row.tbtMs)], ['CLS', (row) => row.cls === '' ? '—' : row.cls], ['Transfer Size', (row) => formatBytes(row.totalBytes)], ['DOM Elements', (row) => row.domElements === '' ? '—' : row.domElements]);
    csvColumns.push(['Important Findings', (row) => row.findingCount || 0]);
    const csv = [csvColumns.map(([label]) => csvEscape(label)).join(','), ...rows.map((row) => csvColumns.map(([, getter]) => csvEscape(getter(row))).join(','))].join('\n');
    fs.writeFileSync(path.join(root, 'summary.csv'), `\uFEFF${csv}\n`, 'utf8');
    overview.exports = { csv: true, html: true, pdf: true };
    fs.writeFileSync(path.join(root, 'summary.html'), buildSummaryHtml(summary));
    fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify(summary, null, 2));
    summary.pdfGeneration = await generateToolPdf({ html: lighthousePdfHtml(summary), pdfPath: path.join(root, 'summary.pdf'), toolName: 'Lighthouse Reporter', projectName: overview.projectName });
    fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify(summary, null, 2));
    return summary;
  }

  listReports() {
    ensureDir(this.reportsRoot);
    return fs.readdirSync(this.reportsRoot, { withFileTypes: true }).filter((entry) => entry.isDirectory()).map((entry) => {
      const full = path.join(this.reportsRoot, entry.name); const stat = fs.statSync(full);
      const summary = readJson(path.join(full, 'summary.json')); const metadata = readJson(path.join(full, 'metadata.json'));
      const overview = summary && !Array.isArray(summary) ? summary.overview || null : null;
      const reportType = overview?.reportType || summary?.reportType || metadata?.reportType || (entry.name.includes('_lighthouse_') ? 'lighthouse' : 'unknown');
      const hasHtml = fs.existsSync(path.join(full, 'summary.html')); const hasCsv = fs.existsSync(path.join(full, 'summary.csv')); const hasFindingsCsv = fs.existsSync(path.join(full, 'findings.csv')); const hasPdf = fs.existsSync(path.join(full, 'summary.pdf')); const hasJson = fs.existsSync(path.join(full, 'summary.json')); const hasEvidenceManifest = fs.existsSync(path.join(full, 'evidence', 'manifest.json'));
      return { name: entry.name, reportType, modifiedAt: stat.mtime.toISOString(), overview,
        summaryHref: hasHtml ? `/reports/${encodeURIComponent(entry.name)}/summary.html` : (hasCsv ? `/reports/${encodeURIComponent(entry.name)}/summary.csv` : ''),
        jsonHref: hasJson ? `/reports/${encodeURIComponent(entry.name)}/summary.json` : '', csvHref: hasFindingsCsv || hasCsv ? reportDownloadHref(entry.name, 'csv') : '', pdfHref: hasPdf ? reportDownloadHref(entry.name, 'pdf') : '', evidenceManifestHref: hasEvidenceManifest ? `/reports/${encodeURIComponent(entry.name)}/evidence/manifest.json` : '' };
    }).sort((a, b) => b.modifiedAt.localeCompare(a.modifiedAt));
  }

  deleteReports(names = []) {
    const unique = [...new Set((names || []).map((name) => String(name || '').trim()).filter(Boolean))];
    const deleted = [];
    for (const name of unique) {
      if (path.basename(name) !== name || name === '.' || name === '..') throw new Error(`Invalid report name: ${name}`);
      const full = path.resolve(this.reportsRoot, name); const base = path.resolve(this.reportsRoot) + path.sep;
      if (!full.startsWith(base)) throw new Error(`Invalid report path: ${name}`);
      if (!fs.existsSync(full) || !fs.statSync(full).isDirectory()) continue;
      fs.rmSync(full, { recursive: true, force: true }); deleted.push(name);
    }
    return { deleted };
  }
}
