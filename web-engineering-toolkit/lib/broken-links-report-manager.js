import fs from 'node:fs';
import path from 'node:path';
import { csvEscape, ensureDir, slugify, timestamp } from './utils.js';
import { generateToolPdf } from './pdf-report-renderer.js';
import { brokenLinksPdfHtml } from './tool-pdf-reports.js';
import { reportDownloadHref } from './report-downloads.js';

const ATTENTION_OUTCOMES = new Set(['broken', 'fragment_missing', 'server_error', 'unreachable', 'failed_to_check', 'client_error', 'restricted', 'rate_limited']);

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' })[char]);
}

function humanize(value) {
  return String(value || '').replace(/[_-]+/g, ' ').replace(/\b\w/g, (character) => character.toUpperCase());
}

function spreadsheetSafe(value) {
  const text = String(value ?? '');
  return /^[=+\-@]/.test(text) ? `'${text}` : text;
}

function csvCell(value) {
  return csvEscape(spreadsheetSafe(value));
}

function overviewFor(result) {
  return {
    reportType: 'broken-links-resources',
    projectName: result.projectName,
    baseUrl: result.baseUrl,
    pages: result.summary.pagesScanned,
    targets: result.summary.uniqueTargets,
    broken: result.summary.broken,
    redirected: result.summary.redirected,
    unavailable: result.summary.unavailable,
    healthy: result.summary.healthy,
    externalTargets: result.summary.externalTargets,
    durationMs: result.durationMs
  };
}

function targetRow(target) {
  return [
    humanize(target.outcome),
    target.httpStatus || '',
    target.referenceTypes?.map(humanize).join(', ') || humanize(target.referenceType),
    target.internal ? 'Internal' : 'External',
    target.targetUrl,
    target.finalUrl || '',
    target.redirectCount || 0,
    target.occurrenceCount || 0,
    (target.sourcePages || []).join('\n'),
    humanize(target.checkMethod),
    target.failureReason || ''
  ];
}

function writeCsv(root, result) {
  const headers = ['Outcome', 'HTTP Status', 'Reference Type', 'Internal/External', 'Target URL', 'Final URL', 'Redirect Count', 'Occurrence Count', 'Source Pages', 'Check Method', 'Failure Reason'];
  const rows = [headers, ...result.targets.map(targetRow)];
  fs.writeFileSync(path.join(root, 'summary.csv'), rows.map((row) => row.map(csvCell).join(',')).join('\n'));
}

const REPORT_ATTENTION_OUTCOMES = new Set(['broken', 'fragment_missing', 'server_error', 'unreachable', 'failed_to_check', 'client_error']);
const REPORT_REVIEW_OUTCOMES = new Set(['restricted', 'rate_limited']);
const REPORT_PRIORITY = { broken: 0, fragment_missing: 1, server_error: 2, unreachable: 3, failed_to_check: 4, client_error: 5, restricted: 6, rate_limited: 7, redirected: 8, healthy: 9, skipped: 10 };

function readableUrl(value) {
  try {
    const url = new URL(value);
    return { path: `${url.pathname}${url.search}${url.hash}` || '/', host: url.host };
  } catch { return { path: String(value || 'Unknown target'), host: '' }; }
}

function reportTargetCard(target) {
  const readable = readableUrl(target.targetUrl);
  const occurrences = (target.occurrences || []).map((occurrence) => `<li class="report-occurrence"><strong>${escapeHtml(occurrence.sourcePageUrl || 'Unknown source')}</strong><span>${escapeHtml(humanize(occurrence.referenceType))} · ${escapeHtml(occurrence.attribute || 'reference')}${occurrence.fragment ? ` · #${escapeHtml(occurrence.fragment)}` : ''}${occurrence.linkText ? ` · ${escapeHtml(occurrence.linkText)}` : ''}</span></li>`).join('');
  const redirects = (target.redirectChain || []).map((hop) => `<li><strong>${hop.status || '—'}</strong><span>${escapeHtml(hop.url || '')}${hop.location ? ` → ${escapeHtml(hop.location)}` : ''}</span></li>`).join('');
  return `<article class="target-card ${escapeHtml(target.outcome)}" data-report-target data-search="${escapeHtml([target.targetUrl, target.finalUrl, target.httpStatus, target.failureReason, ...(target.referenceTypes || []), ...(target.sourcePages || [])].join(' ').toLowerCase())}"><div class="target-row"><div class="target-status"><span class="outcome ${escapeHtml(target.outcome)}">${escapeHtml(humanize(target.outcome))}</span><strong>${target.httpStatus || '—'}</strong></div><div class="target-name"><strong title="${escapeHtml(target.targetUrl)}">${escapeHtml(readable.path)}</strong><span>${escapeHtml(readable.host)}</span></div><div class="target-facts"><span>${escapeHtml((target.referenceTypes || []).map(humanize).join(', ') || 'Other resource')}</span><span>${target.internal ? 'Internal' : 'External'}</span><span>${target.occurrenceCount || 0} occurrence${target.occurrenceCount === 1 ? '' : 's'}</span></div></div>${target.failureReason ? `<p class="reason">${escapeHtml(target.failureReason)}</p>` : ''}<details class="report-target-detail"><summary>Target and source details</summary><div class="detail-grid"><div><span>Full safe target</span><strong>${escapeHtml(target.targetUrl)}</strong></div><div><span>Final URL</span><strong>${escapeHtml(target.finalUrl || '—')}</strong></div><div><span>Check method</span><strong>${escapeHtml(humanize(target.checkMethod))}</strong></div><div><span>Reference types</span><strong>${escapeHtml((target.referenceTypes || []).map(humanize).join(', ') || '—')}</strong></div></div>${redirects ? `<div class="redirect-chain"><h4>Redirect chain</h4><ol>${redirects}</ol></div>` : ''}<div class="occurrences"><h4>Found on ${target.occurrenceCount || 0} occurrence${target.occurrenceCount === 1 ? '' : 's'}</h4><ul>${occurrences || '<li>No source occurrence metadata was retained.</li>'}</ul></div></details></article>`;
}

function reportSection(group, sectionId, title, description, targets, empty) {
  return `<section class="panel report-section" id="${sectionId}"><div class="section-heading"><div><h2>${escapeHtml(title)}</h2><p>${escapeHtml(description)}</p></div><strong>${targets.length}</strong></div><div class="report-list" data-report-group="${group}">${targets.slice(0, 25).map(reportTargetCard).join('')}</div><div id="${group}Empty" class="empty" ${targets.length ? 'hidden' : ''}>${escapeHtml(empty)}</div>${targets.length > 25 || group === 'healthy' ? `<div class="report-controls screen-only"><label ${group === 'healthy' ? '' : 'hidden'}>Search <input id="${group}Search" type="search" placeholder="Target, source, status, type…"></label><label>Rows <select id="${group}PageSize"><option value="25">25</option><option value="50">50</option><option value="100">100</option></select></label><button id="${group}Previous" type="button">Previous</button><span id="${group}PageStatus" aria-live="polite">Page 1 of ${Math.max(1, Math.ceil(targets.length / 25))}</span><button id="${group}Next" type="button">Next</button>${group === 'healthy' ? `<button id="${group}Clear" type="button">Clear</button>` : ''}</div>` : ''}<a class="back-top screen-only" href="#top">Back to top ↑</a></section>`;
}

function writeHtml(root, result) {
  const orderedTargets = [...result.targets].sort((left, right) => (REPORT_PRIORITY[left.outcome] ?? 99) - (REPORT_PRIORITY[right.outcome] ?? 99) || String(left.targetUrl).localeCompare(String(right.targetUrl)));
  const attention = orderedTargets.filter((target) => REPORT_ATTENTION_OUTCOMES.has(target.outcome));
  const review = orderedTargets.filter((target) => REPORT_REVIEW_OUTCOMES.has(target.outcome));
  const redirects = orderedTargets.filter((target) => target.outcome === 'redirected');
  const healthy = orderedTargets.filter((target) => target.outcome === 'healthy');
  const skipped = result.targets.filter((target) => target.outcome === 'skipped');
  const outcomeCount = (outcome) => result.targets.filter((target) => target.outcome === outcome).length;
  const groups = Object.fromEntries([['needs-attention', attention], ['review', review], ['redirects', redirects], ['healthy', healthy]].map(([name, targets]) => [name, targets.map(reportTargetCard)]));
  const reportData = JSON.stringify({ groups }).replace(/</g, '\\u003c');
  const html = `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(result.projectName)} — Broken Links & Resources</title><style>
  :root{color-scheme:dark;--bg:#0b1020;--panel:#11192d;--border:rgba(255,255,255,.09);--text:#f7f9ff;--muted:#95a0ba;--accent:#7c6cff;--success:#4fd1a1;--warning:#ffbf69;--danger:#ff6b7a}*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:14px/1.55 Inter,system-ui,sans-serif}button,input,select{font:inherit}a{color:#aaa2ff}main{width:min(1180px,100%);margin:auto;padding:30px 24px 64px}.report-header{display:grid;gap:16px;padding:22px;border:1px solid var(--border);border-radius:18px;background:var(--panel)}.eyebrow{color:#aaa2ff;font-size:10px;font-weight:800;letter-spacing:.14em;text-transform:uppercase}h1{margin:5px 0 2px;font-size:28px;letter-spacing:-.03em}.identity{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.identity div,.metric,.detail-grid div,.limits div{min-width:0;padding:10px 11px;border:1px solid var(--border);border-radius:10px}.identity span,.metric span,.detail-grid span,.limits span{display:block;color:var(--muted);font-size:9px;text-transform:uppercase;letter-spacing:.04em}.identity strong,.detail-grid strong{display:block;margin-top:4px;font-size:11px;overflow-wrap:anywhere}.toc{position:sticky;top:0;z-index:4;display:flex;gap:6px;overflow:auto;margin:14px 0;padding:8px;border:1px solid var(--border);border-radius:12px;background:var(--bg)}.toc a,.report-controls button,.report-controls select,.report-controls input{min-height:34px;padding:7px 9px;border:1px solid var(--border);border-radius:8px;background:var(--panel);color:var(--text);text-decoration:none;white-space:nowrap}.metrics{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.metric strong{display:block;margin-top:4px;font-size:22px}.metric.attention{border-left:3px solid var(--danger)}.metric.review{border-left:3px solid var(--warning)}.metric.healthy{border-left:3px solid var(--success)}.outcome-breakdown{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}.outcome-breakdown span{padding:5px 8px;border:1px solid var(--border);border-radius:999px;color:var(--muted);font-size:10px}.panel{margin-top:14px;padding:18px;border:1px solid var(--border);border-radius:16px;background:var(--panel)}.section-heading{display:flex;justify-content:space-between;gap:12px;align-items:start;margin-bottom:12px}.section-heading h2{margin:0;font-size:18px}.section-heading p{margin:3px 0 0;color:var(--muted);font-size:11px}.section-heading>strong{font-size:22px}.attention-overview{display:grid;grid-template-columns:repeat(5,minmax(0,1fr));gap:8px}.attention-overview div{padding:10px;border:1px solid var(--border);border-radius:10px}.attention-overview span,.attention-overview strong{display:block}.attention-overview span{color:var(--muted);font-size:9px}.attention-overview strong{margin-top:3px;font-size:18px}.report-list{display:grid;gap:7px;min-width:0}.target-card{min-width:0;padding:11px 12px;border:1px solid var(--border);border-radius:11px;background:#0b1221}.target-card.broken,.target-card.fragment_missing,.target-card.server_error,.target-card.unreachable,.target-card.failed_to_check,.target-card.client_error{border-left:3px solid var(--danger)}.target-row{display:grid;grid-template-columns:110px minmax(0,1fr) minmax(175px,auto);gap:12px;align-items:center;min-width:0}.target-status{display:flex;align-items:center;gap:7px}.target-name{display:grid;gap:2px;min-width:0}.target-name strong{display:-webkit-box;overflow:hidden;overflow-wrap:anywhere;-webkit-box-orient:vertical;-webkit-line-clamp:2}.target-name span,.target-facts{color:var(--muted);font-size:9px}.target-name span{overflow:hidden;text-overflow:ellipsis;white-space:nowrap}.target-facts{display:flex;justify-content:flex-end;flex-wrap:wrap;gap:4px 9px}.outcome{display:inline-flex;padding:4px 7px;border:1px solid var(--border);border-radius:999px;font-size:9px;font-weight:800;white-space:nowrap}.outcome.healthy{color:var(--success)}.outcome.redirected,.outcome.restricted,.outcome.rate_limited{color:var(--warning)}.outcome.broken,.outcome.fragment_missing,.outcome.server_error,.outcome.unreachable,.outcome.failed_to_check,.outcome.client_error{color:var(--danger)}.reason{margin:7px 0 0 122px;color:var(--danger);font-size:10px;overflow-wrap:anywhere}.report-target-detail{margin-top:8px;border-top:1px solid var(--border)}.report-target-detail>summary{width:max-content;padding-top:7px;color:#aaa2ff;font-size:10px;cursor:pointer}.detail-grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:7px;padding-top:10px}.redirect-chain ol,.occurrences ul{display:grid;gap:5px;margin:6px 0 0;padding-left:20px}.redirect-chain li,.occurrences li{overflow-wrap:anywhere;font-size:10px}.redirect-chain li span,.occurrences li span{display:block;color:var(--muted)}.report-controls{display:flex;align-items:end;justify-content:flex-end;gap:7px;margin-top:12px}.report-controls label{display:grid;gap:3px;color:var(--muted);font-size:9px}.report-controls input{min-width:230px}.empty{padding:22px;color:var(--muted);text-align:center}.back-top{display:block;width:max-content;margin:12px 0 0 auto;font-size:10px}.limits{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:8px}.method{color:var(--muted);font-size:11px}.skipped-note{margin-top:10px;color:var(--muted);font-size:10px}@media(max-width:800px){.identity,.metrics{grid-template-columns:repeat(2,minmax(0,1fr))}.attention-overview{grid-template-columns:repeat(3,minmax(0,1fr))}.target-row{grid-template-columns:auto minmax(0,1fr)}.target-facts{grid-column:2;justify-content:flex-start}.reason{margin-left:0}}@media(max-width:520px){main{padding:18px 12px 42px}.report-header,.panel{padding:14px}h1{font-size:23px}.identity,.metrics,.attention-overview,.detail-grid{grid-template-columns:1fr}.target-row{grid-template-columns:1fr;gap:6px}.target-facts{grid-column:auto;justify-content:flex-start}.report-controls{align-items:stretch;flex-wrap:wrap;justify-content:space-between}.report-controls label:first-child{width:100%}.report-controls input{width:100%;min-width:0}.toc{margin-inline:-2px}}@media print{body{background:#fff;color:#111}.screen-only{display:none!important}.report-header,.panel,.target-card{break-inside:avoid;border-color:#bbb;background:#fff}.report-target-detail>:not(summary){display:block!important}.report-target-detail>summary{display:none}.target-card{page-break-inside:avoid}.outcome,.target-name span,.target-facts,.method,.section-heading p{color:#444}.panel{margin-top:10px}}
  </style></head><body><main id="top"><header class="report-header"><div><div class="eyebrow">Broken Links &amp; Resources Checker</div><h1>${escapeHtml(result.projectName)}</h1></div><div class="identity"><div><span>Base URL</span><strong>${escapeHtml(result.baseUrl)}</strong></div><div><span>Generated</span><strong>${escapeHtml(result.generatedAt)}</strong></div><div><span>Scan scope</span><strong>${escapeHtml(humanize(result.scope.mode))}</strong></div><div><span>Pages scanned</span><strong>${result.summary.pagesScanned}</strong></div><div><span>Targets checked</span><strong>${result.summary.uniqueTargets}</strong></div><div><span>Duration</span><strong>${Math.round(result.durationMs || 0).toLocaleString()} ms</strong></div></div></header>
  <nav class="toc screen-only" aria-label="Report sections"><a href="#summary">Summary</a><a href="#needs-attention">Needs attention</a><a href="#review-items">Review</a><a href="#redirects">Redirects</a><a href="#healthy-inventory">Healthy references</a><a href="#scan-details">Scan details</a></nav>
  <section class="panel" id="summary"><div class="section-heading"><div><h2>Executive factual summary</h2><p>Availability observations are grouped for remediation without a score.</p></div></div><div class="metrics"><div class="metric"><span>Pages scanned</span><strong>${result.summary.pagesScanned}</strong></div><div class="metric"><span>Targets checked</span><strong>${result.summary.uniqueTargets}</strong></div><div class="metric attention"><span>Needs attention</span><strong>${attention.length}</strong></div><div class="metric review"><span>Review</span><strong>${review.length + redirects.length}</strong></div><div class="metric healthy"><span>Healthy</span><strong>${healthy.length}</strong></div></div><div class="outcome-breakdown">${[...new Set(result.targets.map((target) => target.outcome))].sort().map((outcome) => `<span>${escapeHtml(humanize(outcome))}: <strong>${outcomeCount(outcome)}</strong></span>`).join('')}</div></section>
  <section class="panel"><div class="section-heading"><div><h2>Attention required</h2><p>Start with definitive failures, missing fragments, server errors, and failed checks.</p></div><strong>${attention.length}</strong></div><div class="attention-overview"><div><span>Broken links</span><strong>${outcomeCount('broken')}</strong></div><div><span>Missing fragments</span><strong>${outcomeCount('fragment_missing')}</strong></div><div><span>Server errors</span><strong>${outcomeCount('server_error')}</strong></div><div><span>Unreachable</span><strong>${outcomeCount('unreachable')}</strong></div><div><span>Failed checks</span><strong>${outcomeCount('failed_to_check')}</strong></div></div></section>
  ${reportSection('needs-attention', 'needs-attention', 'Needs attention', 'Problem outcomes ordered before inventory.', attention, 'No references need attention within the configured scope.')}
  ${reportSection('review', 'review-items', 'Review items', 'Restricted and rate-limited responses require context; they are not broken links.', review, 'No restricted or rate-limited references were recorded.')}
  ${reportSection('redirects', 'redirects', 'Redirects', 'Review original targets, final destinations, and hop details.', redirects, 'No redirects were recorded.')}
  ${reportSection('healthy', 'healthy-inventory', 'Healthy references', 'Complete 2xx inventory remains available without dominating the report.', healthy, 'No healthy references were recorded.')}
  <section class="panel" id="scan-details"><div class="section-heading"><div><h2>Scope, methodology, and limitations</h2><p>Interpret results within the bounded collection context.</p></div></div><div class="limits"><div><span>Starting pages</span><strong>${result.scope.startingPages.length}</strong></div><div><span>Page / target bounds</span><strong>${result.limits.maxPages} / ${result.limits.maxTargets}</strong></div><div><span>Timeout / redirects</span><strong>${result.limits.timeoutMs} ms / ${result.limits.maxRedirects}</strong></div></div><p class="method">Only HTTP(S) references were checked using bounded browser evidence or HEAD/GET requests. Restricted, rate-limited, redirected, timed-out, and failed checks remain separate from definitive 404/410 outcomes. External pages were not crawled, external fragments were not rendered, response bodies were not archived, and no forms or state-changing controls were activated.</p>${skipped.length ? `<p class="skipped-note">${skipped.length} safety- or scope-excluded reference${skipped.length === 1 ? ' was' : 's were'} retained as skipped in the machine-readable inventory.</p>` : ''}</section>
  <script id="reportData" type="application/json">${reportData}</script><script>(()=>{const data=JSON.parse(document.querySelector('#reportData').textContent);for(const [group,items] of Object.entries(data.groups)){const list=document.querySelector('[data-report-group="'+group+'"]');if(!list)continue;const prefix=group;const search=document.querySelector('#'+prefix+'Search');const size=document.querySelector('#'+prefix+'PageSize');const previous=document.querySelector('#'+prefix+'Previous');const next=document.querySelector('#'+prefix+'Next');const status=document.querySelector('#'+prefix+'PageStatus');const empty=document.querySelector('#'+prefix+'Empty');const clear=document.querySelector('#'+prefix+'Clear');let page=1;const render=()=>{const query=(search?.value||'').trim().toLowerCase();const filtered=query?items.filter(item=>item.toLowerCase().includes(query)):items;const pageSize=Number(size?.value)||25;const pages=Math.max(1,Math.ceil(filtered.length/pageSize));page=Math.min(Math.max(1,page),pages);list.innerHTML=filtered.slice((page-1)*pageSize,page*pageSize).join('');if(status)status.textContent='Page '+page+' of '+pages;if(previous)previous.disabled=page<=1;if(next)next.disabled=page>=pages;if(empty){empty.hidden=filtered.length>0;empty.textContent=filtered.length?'':'No references match this search.'}};search?.addEventListener('input',()=>{page=1;render()});size?.addEventListener('change',()=>{page=1;render()});previous?.addEventListener('click',()=>{page-=1;render()});next?.addEventListener('click',()=>{page+=1;render()});clear?.addEventListener('click',()=>{if(search)search.value='';page=1;render()});render()}})();</script>
  </main></body></html>`;
  fs.writeFileSync(path.join(root, 'summary.html'), html);
}

export class BrokenLinksReportManager {
  constructor({ reportsRoot }) { this.reportsRoot = ensureDir(reportsRoot); }

  async save(result) {
    const reportName = `${slugify(result.projectName)}_broken-links-resources_${timestamp()}`;
    const root = ensureDir(path.join(this.reportsRoot, reportName));
    const overview = overviewFor(result);
    fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify({ ...result, overview }, null, 2));
    fs.writeFileSync(path.join(root, 'metadata.json'), JSON.stringify({ schemaVersion: result.schemaVersion, reportType: 'broken-links-resources', generatedAt: result.generatedAt, projectName: result.projectName, baseUrl: result.baseUrl, overview }, null, 2));
    writeCsv(root, result);
    writeHtml(root, result);
    const pdfGeneration = await generateToolPdf({ html: brokenLinksPdfHtml(result), pdfPath: path.join(root, 'summary.pdf'), toolName: 'Broken Links & Resources Checker', projectName: result.projectName });
    return {
      ...result, pdfGeneration,
      reportName,
      overview,
      summaryHref: `/reports/${encodeURIComponent(reportName)}/summary.html`,
      jsonHref: `/reports/${encodeURIComponent(reportName)}/summary.json`,
      csvHref: reportDownloadHref(reportName, 'csv'),
      pdfHref: reportDownloadHref(reportName, 'pdf')
    };
  }
}
