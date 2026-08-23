import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, slugify, timestamp, csvEscape } from './utils.js';

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

async function writeWorkbook(root, result) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Web Engineering Toolkit';
  const navy = 'FF11192D', blue = 'FF2563EB', text = 'FF101828', muted = 'FF667085', border = 'FFE4E7EC', soft = 'FFF8FAFC';
  const thin = { top:{style:'thin',color:{argb:border}}, left:{style:'thin',color:{argb:border}}, bottom:{style:'thin',color:{argb:border}}, right:{style:'thin',color:{argb:border}} };
  const headerStyle = (row) => { row.height = 28; row.eachCell((cell) => { cell.font = { bold: true, color: { argb: 'FFFFFFFF' } }; cell.fill = { type:'pattern',pattern:'solid',fgColor:{argb:navy} }; cell.alignment = { vertical:'middle', wrapText:true }; cell.border = thin; }); };
  const styleRows = (sheet, start = 2) => { for (let i = start; i <= sheet.rowCount; i += 1) { const row = sheet.getRow(i); row.height = 26; row.eachCell((cell) => { cell.font = { color:{argb:text}, size:10 }; cell.alignment = { vertical:'middle', wrapText:true }; cell.border = thin; if (i % 2 === 0) cell.fill = { type:'pattern',pattern:'solid',fgColor:{argb:soft} }; }); } };

  const summary = workbook.addWorksheet('Summary', { views:[{showGridLines:false}] });
  summary.columns = [{width:24},{width:48},{width:4},{width:22},{width:22}];
  summary.mergeCells('A1:E2'); const title = summary.getCell('A1'); title.value = 'Asset & Page-Weight Report'; title.font = { size:22,bold:true,color:{argb:'FFFFFFFF'} }; title.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}}; title.alignment={vertical:'middle'};
  const details = [['Project', result.projectName], ['Base URL', result.baseUrl], ['Device', humanize(result.device)], ['Browser', result.browser?.name || '—'], ['Pages analyzed', result.summary.pageCount], ['Generated', new Date(result.generatedAt).toLocaleString()]];
  details.forEach(([label,value], i) => { const r=4+i; summary.getCell(r,1).value=label; summary.getCell(r,1).font={bold:true,color:{argb:muted}}; summary.getCell(r,2).value=value; summary.getCell(r,2).alignment={wrapText:true}; });
  summary.getCell('D4').value='Average page weight'; summary.getCell('D5').value='Average requests'; summary.getCell('D6').value='Total transfer'; summary.getCell('D7').value='Third-party transfer';
  summary.getCell('E4').value=formatBytes(result.summary.averageBytes); summary.getCell('E5').value=Math.round(result.summary.averageRequests); summary.getCell('E6').value=formatBytes(result.summary.totalBytes); summary.getCell('E7').value=formatBytes(result.summary.thirdPartyBytes);
  for (let r=4;r<=7;r+=1){ summary.getCell(r,4).font={bold:true,color:{argb:muted}}; summary.getCell(r,5).font={bold:true,color:{argb:blue},size:14}; }
  const breakdownStart=12; summary.getCell(`A${breakdownStart}`).value='Resource breakdown'; summary.getCell(`A${breakdownStart}`).font={bold:true,size:13,color:{argb:text}};
  const breakdown = Object.entries(result.summary.breakdown).sort((a,b)=>b[1]-a[1]); breakdown.forEach(([type,bytes],i)=>{ const r=breakdownStart+1+i; summary.getCell(r,1).value=humanize(type); summary.getCell(r,2).value=formatBytes(bytes); });

  const pages = workbook.addWorksheet('Page Results', { views:[{state:'frozen',ySplit:1,showGridLines:false}] });
  pages.columns=[{header:'Page',key:'page',width:52},{header:'Status',key:'status',width:12},{header:'Weight',key:'weight',width:14},{header:'Requests',key:'requests',width:12},{header:'JavaScript',key:'js',width:14},{header:'CSS',key:'css',width:14},{header:'Images',key:'images',width:14},{header:'Fonts',key:'fonts',width:14},{header:'Third-party',key:'third',width:14},{header:'DOM Elements',key:'dom',width:14},{header:'Findings',key:'findings',width:12}];
  result.pages.forEach((page)=>pages.addRow({page:page.finalUrl,status:page.status,weight:formatBytes(page.totalTransferBytes),requests:page.requestCount,js:formatBytes(page.breakdown.script),css:formatBytes(page.breakdown.stylesheet),images:formatBytes(page.breakdown.image),fonts:formatBytes(page.breakdown.font),third:formatBytes(page.thirdPartyBytes),dom:page.dom?.domElements||0,findings:page.findings.length})); headerStyle(pages.getRow(1)); styleRows(pages);

  const assets = workbook.addWorksheet('Largest Assets', { views:[{state:'frozen',ySplit:1,showGridLines:false}] });
  assets.columns=[{header:'Asset URL',key:'url',width:70},{header:'Type',key:'type',width:16},{header:'Size',key:'size',width:14},{header:'Host',key:'host',width:28},{header:'Status',key:'status',width:12},{header:'Encoding',key:'encoding',width:14},{header:'Cache-Control',key:'cache',width:36},{header:'Page',key:'page',width:42}];
  result.largestAssets.forEach((a)=>assets.addRow({url:a.url,type:humanize(a.category),size:formatBytes(a.transferBytes),host:a.host,status:a.status,encoding:a.contentEncoding||'None',cache:a.cacheControl||'Not set',page:a.pageUrl})); headerStyle(assets.getRow(1)); styleRows(assets);

  const findings = workbook.addWorksheet('Findings', { views:[{state:'frozen',ySplit:1,showGridLines:false}] });
  findings.columns=[{header:'Priority',key:'priority',width:16},{header:'Category',key:'category',width:18},{header:'Finding',key:'finding',width:34},{header:'Details',key:'detail',width:58},{header:'Recommendation',key:'recommendation',width:62},{header:'Affected Pages',key:'pages',width:60}];
  result.findings.forEach((f)=>findings.addRow({priority:severityLabel(f.severity),category:f.category,finding:f.title,detail:f.detail,recommendation:f.recommendation,pages:f.pages.join('\n')})); headerStyle(findings.getRow(1)); styleRows(findings);

  await workbook.xlsx.writeFile(path.join(root, 'summary.xlsx'));
}

function writeHtml(root, result) {
  const breakdown = Object.entries(result.summary.breakdown).sort((a,b)=>b[1]-a[1]);
  const maxBreakdown = Math.max(...breakdown.map(([,value])=>value),1);
  const pageRows = result.pages.map((page)=>`<tr><td><strong>${escapeHtml(new URL(page.finalUrl).pathname || '/')}</strong><span>${escapeHtml(page.finalUrl)}</span></td><td>${page.status}</td><td>${formatBytes(page.totalTransferBytes)}</td><td>${page.requestCount}</td><td>${formatBytes(page.breakdown.script)}</td><td>${formatBytes(page.breakdown.image)}</td><td>${formatBytes(page.thirdPartyBytes)}</td><td>${page.findings.length}</td></tr>`).join('');
  const findingCards = result.findings.length ? result.findings.map((finding)=>`<article class="finding ${finding.severity}"><span>${escapeHtml(severityLabel(finding.severity))}</span><div><b>${escapeHtml(finding.title)}</b><p>${escapeHtml(finding.detail)}</p><small>${escapeHtml(finding.recommendation)}</small></div></article>`).join('') : '<div class="empty">No page-weight thresholds were triggered.</div>';
  const assetRows = result.largestAssets.slice(0,20).map((a)=>`<tr><td><span class="type">${escapeHtml(humanize(a.category))}</span></td><td><a href="${escapeHtml(a.url)}" target="_blank" rel="noopener">${escapeHtml(a.url)}</a></td><td>${formatBytes(a.transferBytes)}</td><td>${escapeHtml(a.host)}</td></tr>`).join('');
  const html = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Asset Report · ${escapeHtml(result.projectName)}</title><link rel="icon" href="/assets/mark-color.png"><style>
  :root{color-scheme:dark;font-family:Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;background:#09111f;color:#edf3ff}*{box-sizing:border-box}body{margin:0;background:radial-gradient(circle at 80% 0,#152556 0,transparent 28%),#09111f}main{max-width:1280px;margin:auto;padding:42px 24px 70px}.eyebrow{color:#7da7ff;font-size:12px;text-transform:uppercase;letter-spacing:.12em;font-weight:800}h1{font-size:34px;margin:8px 0 6px}p,small{color:#9eabc3}.cards{display:grid;grid-template-columns:repeat(4,1fr);gap:14px;margin:28px 0}.card,.panel{border:1px solid #24324a;background:#111b2e;border-radius:18px}.card{padding:18px}.card span{display:block;color:#8c9ab5;font-size:12px}.card b{font-size:24px;display:block;margin-top:8px}.panel{padding:22px;margin-top:18px}h2{font-size:18px;margin:0 0 18px}.bars{display:grid;gap:10px}.barrow{display:grid;grid-template-columns:120px 1fr 100px;align-items:center;gap:12px;font-size:13px}.bar{height:9px;background:#1d2940;border-radius:9px;overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,#785cff,#4da1ff);border-radius:9px}table{width:100%;border-collapse:collapse;font-size:13px}th,td{text-align:left;padding:12px 10px;border-bottom:1px solid #24324a;vertical-align:top}th{color:#8797b5;font-size:11px;text-transform:uppercase;letter-spacing:.06em}td span{display:block;color:#7f8da8;font-size:11px;margin-top:4px}a{color:#8db7ff;text-decoration:none;word-break:break-all}.findings{display:grid;gap:10px}.finding{display:grid;grid-template-columns:110px 1fr;gap:14px;padding:14px;border:1px solid #26344d;border-radius:14px;background:#0e1829}.finding>span{font-size:11px;font-weight:800;text-transform:uppercase;color:#f8bd71}.finding.high>span{color:#ff7f91}.finding b{font-size:14px}.finding p{margin:6px 0;font-size:13px}.finding small{line-height:1.5}.type{display:inline-block!important;padding:4px 7px;border-radius:999px;background:#1a2943;color:#9bbcff!important;margin:0!important}.empty{color:#8c9ab5;padding:20px;text-align:center}@media(max-width:850px){.cards{grid-template-columns:repeat(2,1fr)}.barrow{grid-template-columns:90px 1fr 80px}.panel{overflow:auto}} </style></head><body><main><div class="eyebrow">Asset & Page-Weight Analyzer</div><h1>${escapeHtml(result.projectName)}</h1><p>${escapeHtml(result.baseUrl)} · ${escapeHtml(humanize(result.device))} · ${new Date(result.generatedAt).toLocaleString()}</p><section class="cards"><div class="card"><span>Pages analyzed</span><b>${result.summary.pageCount}</b></div><div class="card"><span>Average page weight</span><b>${formatBytes(result.summary.averageBytes)}</b></div><div class="card"><span>Average requests</span><b>${Math.round(result.summary.averageRequests)}</b></div><div class="card"><span>Third-party transfer</span><b>${formatBytes(result.summary.thirdPartyBytes)}</b></div></section><section class="panel"><h2>Resource breakdown</h2><div class="bars">${breakdown.map(([type,bytes])=>`<div class="barrow"><span>${escapeHtml(humanize(type))}</span><div class="bar"><i style="width:${Math.max(2,bytes/maxBreakdown*100)}%"></i></div><b>${formatBytes(bytes)}</b></div>`).join('')}</div></section><section class="panel"><h2>Page results</h2><table><thead><tr><th>Page</th><th>Status</th><th>Weight</th><th>Requests</th><th>JS</th><th>Images</th><th>Third-party</th><th>Findings</th></tr></thead><tbody>${pageRows}</tbody></table></section><section class="panel"><h2>Optimization findings</h2><div class="findings">${findingCards}</div></section><section class="panel"><h2>Largest transferred assets</h2><table><thead><tr><th>Type</th><th>Asset</th><th>Size</th><th>Host</th></tr></thead><tbody>${assetRows}</tbody></table></section></main></body></html>`;
  fs.writeFileSync(path.join(root, 'summary.html'), html);
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
    writeHtml(root, result);
    await writeWorkbook(root, result);
    return {
      ...result, reportName, overview,
      summaryHref:`/reports/${encodeURIComponent(reportName)}/summary.html`,
      csvHref:`/reports/${encodeURIComponent(reportName)}/summary.csv`,
      xlsxHref:`/reports/${encodeURIComponent(reportName)}/summary.xlsx`,
      assetsCsvHref:`/reports/${encodeURIComponent(reportName)}/assets.csv`
    };
  }
}
