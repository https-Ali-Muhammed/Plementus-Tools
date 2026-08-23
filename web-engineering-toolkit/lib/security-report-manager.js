import fs from 'node:fs';
import path from 'node:path';
import { ensureDir, slugify, timestamp, csvEscape } from './utils.js';

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[char]));
}
function humanize(value) { return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase()); }
function statusLabel(status) {
  return ({ pass: 'Passed', warning: 'Review', fail: 'Needs attention', manual: 'Manual review', info: 'Informational' })[status] || humanize(status);
}
function statusRank(status) { return ({ fail: 5, warning: 4, manual: 3, info: 2, pass: 1 })[status] || 0; }
function statusColor(status) { return ({ pass: 'FF177B57', warning: 'FF9B5F09', fail: 'FFB4233A', manual: 'FF5A4EB4', info: 'FF416889' })[status] || 'FF416889'; }
function statusFill(status) { return ({ pass: 'FFE5F7EF', warning: 'FFFFF1DD', fail: 'FFFDE8EB', manual: 'FFEDEAFE', info: 'FFE9F3FB' })[status] || 'FFF4F6F9'; }

function buildHtml(summary) {
  const grouped = new Map();
  for (const check of summary.checks || []) {
    if (!grouped.has(check.category)) grouped.set(check.category, []);
    grouped.get(check.category).push(check);
  }
  const frameworkCards = (summary.frameworkResults || []).map((framework) => `
    <div class="framework-card">
      <div><span>${escapeHtml(framework.label)}</span><strong>${framework.applicable === false ? 'Not indicated' : 'Evidence'}</strong></div>
      <p>${escapeHtml(framework.note || '')}</p>
      <ul>
        ${(framework.publicEvidence || []).slice(0, 5).map((item) => `<li>✓ ${escapeHtml(item)}</li>`).join('')}
        ${(framework.technicalControls || []).slice(0, 5).map((item) => `<li>✓ ${escapeHtml(item)}</li>`).join('')}
        ${(framework.missingEvidence || []).slice(0, 5).map((item) => `<li>⚠ ${escapeHtml(item)}</li>`).join('')}
      </ul>
    </div>`).join('');
  const groups = [...grouped.entries()].map(([category, checks]) => `
    <details class="group">
      <summary><div><strong>${escapeHtml(category)}</strong><span>${checks.length} checks</span></div><span class="chev">⌄</span></summary>
      <div class="items">${checks.sort((a,b) => statusRank(b.status)-statusRank(a.status)).map((check) => `
        <article class="check">
          <span class="status ${escapeHtml(check.status)}">${escapeHtml(statusLabel(check.status))}</span>
          <div><h3>${escapeHtml(check.title)}</h3><p>${escapeHtml(check.summary)}</p><small>Severity: ${escapeHtml(check.severity || 'informational')}${check.affectedUrl ? ` · Affected URL: ${escapeHtml(check.affectedUrl)}` : ''}</small>${check.details ? `<small>${escapeHtml(check.details)}</small>` : ''}${check.evidence ? `<small>${escapeHtml(check.evidence)}</small>` : ''}${(check.evidenceItems || []).map((item) => `<small><b>Evidence:</b> ${escapeHtml(item.sourceUrl)} · ${escapeHtml(item.evidenceText)}</small>`).join('')}${check.recommendation ? `<div class="recommend"><b>Recommendation</b>${escapeHtml(check.recommendation)}</div>` : ''}${(check.references || []).length ? `<div class="recommend"><b>References</b>${(check.references || []).map((ref) => `<a href="${escapeHtml(ref)}" target="_blank" rel="noopener">${escapeHtml(ref)}</a>`).join('<br>')}</div>` : ''}</div>
        </article>`).join('')}</div>
    </details>`).join('');
  const crawlPages = (summary.crawl && Array.isArray(summary.crawl.pages)) ? summary.crawl.pages : [];
  const crawlSection = crawlPages.length ? `
    <h2 class="section-title">Crawled evidence pages</h2>
    <p class="lead" style="margin-top:-4px">${crawlPages.filter(p=>p.found).length} of ${crawlPages.length} candidate page(s) found while crawling for privacy/security/compliance evidence.</p>
    <div class="items" style="border:1px solid var(--border);border-radius:16px;background:var(--panel);padding:14px;display:grid;gap:8px">
      ${crawlPages.map((p) => `<div style="display:flex;justify-content:space-between;gap:12px;font-size:12px;color:${p.found ? '#c9d2e5' : '#6c7690'}"><span>${escapeHtml(p.url)}${p.error ? `<br><small>${escapeHtml(p.error)}</small>` : ''}</span><span>${p.found ? `${p.status} · ${escapeHtml((p.groups||[]).join(', '))}` : 'not found'}</span></div>`).join('')}
    </div>` : '';

  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>${escapeHtml(summary.projectName)} Security & Compliance Report</title>
  <style>:root{--bg:#0b1020;--panel:#11192d;--border:rgba(255,255,255,.1);--text:#f7f9ff;--muted:#95a0ba;--pass:#4fd1a1;--warn:#ffbf69;--fail:#ff6b7a;--accent:#7c6cff}*{box-sizing:border-box}body{margin:0;background:linear-gradient(180deg,#0b1020,#080c16);color:var(--text);font-family:Inter,system-ui,sans-serif}.wrap{max-width:1180px;margin:auto;padding:42px 22px 70px}.eyebrow{font-size:11px;letter-spacing:.13em;text-transform:uppercase;color:#9b92ff;font-weight:800}h1{font-size:38px;margin:10px 0 8px}.lead{color:var(--muted);line-height:1.6}.notice{margin:20px 0;padding:15px 17px;border:1px solid rgba(255,191,105,.2);background:rgba(255,191,105,.07);border-radius:14px;color:#e0c49c;font-size:13px;line-height:1.55}.stats,.frameworks{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:12px;margin:22px 0}.stat,.framework-card{padding:16px;border-radius:15px;background:var(--panel);border:1px solid var(--border)}.stat span,.framework-card span{display:block;color:var(--muted);font-size:11px}.stat strong,.framework-card strong{display:block;font-size:20px;margin-top:6px}.framework-card>div{display:flex;justify-content:space-between;gap:12px;align-items:end}.framework-card p{margin:9px 0 0;color:var(--muted);font-size:11px;line-height:1.5}.framework-card ul{margin:12px 0 0;padding-left:17px;color:#c9d2e5;font-size:11px;line-height:1.6}.group{border:1px solid var(--border);background:var(--panel);border-radius:16px;margin:12px 0;overflow:hidden}.group summary{list-style:none;cursor:pointer;padding:17px 19px;display:flex;justify-content:space-between;align-items:center}.group summary::-webkit-details-marker{display:none}.group summary div{display:flex;align-items:center;gap:10px}.group summary span{color:var(--muted);font-size:11px}.chev{font-size:18px!important;transition:.2s}.group[open] .chev{transform:rotate(180deg)}.items{border-top:1px solid var(--border);padding:14px;display:grid;gap:10px}.check{display:grid;grid-template-columns:120px minmax(0,1fr);gap:14px;padding:14px;background:rgba(255,255,255,.025);border:1px solid var(--border);border-radius:13px}.status{display:inline-flex;justify-content:center;align-items:center;height:28px;border-radius:999px;font-size:10px;font-weight:800;padding:0 10px}.status.pass{color:#91efcc;background:rgba(79,209,161,.12)}.status.warning{color:#ffd39a;background:rgba(255,191,105,.12)}.status.fail{color:#ffabb3;background:rgba(255,107,122,.12)}.status.manual{color:#c1baff;background:rgba(124,108,255,.14)}.status.info{color:#9dccff;background:rgba(79,156,255,.13)}.check h3{font-size:14px;margin:4px 0}.check p,.check small{display:block;color:var(--muted);font-size:12px;line-height:1.55;margin:0 0 5px}.recommend{margin-top:10px;color:#c9d2e5;font-size:12px;line-height:1.55}.recommend b{display:block;color:#fff;margin-bottom:3px}.recommend a{color:#bfb8ff}.section-title{margin:32px 0 8px;font-size:19px}@media(max-width:650px){.check{grid-template-columns:1fr}.status{justify-self:start}h1{font-size:30px}}</style></head><body><main class="wrap"><div class="eyebrow">Security Assessment Report</div><h1>${escapeHtml(summary.projectName)}</h1><p class="lead">${escapeHtml(summary.finalUrl)} · Generated ${escapeHtml(new Date(summary.generatedAt).toLocaleString())}</p><div class="notice"><strong>Scope note:</strong> ${escapeHtml(summary.disclaimer)}</div><div class="stats"><div class="stat"><span>Passed</span><strong>${summary.totals.pass}</strong></div><div class="stat"><span>Critical/High attention</span><strong>${summary.totals.fail}</strong></div><div class="stat"><span>Medium review</span><strong>${summary.totals.warning}</strong></div><div class="stat"><span>Manual review</span><strong>${summary.totals.manual}</strong></div></div><h2 class="section-title">Compliance evidence</h2><div class="frameworks">${frameworkCards}</div><h2 class="section-title">Technical findings</h2>${groups}${crawlSection}</main></body></html>`;
}

async function writeXlsx(root, summary) {
  const { default: ExcelJS } = await import('exceljs');
  const workbook = new ExcelJS.Workbook();
  workbook.creator = 'Developer Toolkit';
  const navy = 'FF11192D', border = 'FFE0E5EE', text = 'FF1F2A3D', muted = 'FF667085';
  const overview = workbook.addWorksheet('Summary', { views: [{ showGridLines: false }] });
  overview.columns = [{ width: 26 }, { width: 52 }, { width: 4 }, { width: 24 }, { width: 18 }, { width: 18 }, { width: 18 }];
  overview.mergeCells('A1:G2'); overview.getCell('A1').value = 'Security & Compliance Report'; overview.getCell('A1').font = { size: 22, bold: true, color: { argb: 'FFFFFFFF' } }; overview.getCell('A1').fill = { type:'pattern',pattern:'solid',fgColor:{argb:navy} }; overview.getCell('A1').alignment={vertical:'middle'};
  const details = [['Report type','Security & Compliance'],['Project',summary.projectName],['Requested URL',summary.requestedUrl],['Final URL',summary.finalUrl],['HTTP status',summary.responseStatus],['Jurisdiction',summary.jurisdiction || 'Not specified'],['Generated',new Date(summary.generatedAt).toLocaleString()],['Scope note',summary.disclaimer]];
  details.forEach(([label,value],i)=>{const r=4+i; overview.getCell(r,1).value=label;overview.getCell(r,1).font={bold:true,color:{argb:muted}};overview.getCell(r,2).value=value;overview.getCell(r,2).alignment={wrapText:true,vertical:'top'};overview.getCell(r,2).font={color:{argb:text}};overview.getRow(r).height=label==='Scope note'?58:26;});
  overview.getCell('D4').value='Status';overview.getCell('D4').font={bold:true,color:{argb:muted}};
  [['Passed',summary.totals.pass,'pass'],['Review',summary.totals.warning,'warning'],['Needs attention',summary.totals.fail,'fail'],['Manual review',summary.totals.manual,'manual']].forEach(([label,value,status],i)=>{const c=4+i;overview.getCell(5,c).value=label;overview.getCell(5,c).font={bold:true,color:{argb:muted}};overview.getCell(6,c).value=value;overview.getCell(6,c).font={size:18,bold:true,color:{argb:statusColor(status)}};overview.getCell(6,c).fill={type:'pattern',pattern:'solid',fgColor:{argb:statusFill(status)}};overview.getCell(5,c).alignment=overview.getCell(6,c).alignment={horizontal:'center'};});
  overview.getCell('D9').value='Compliance evidence';overview.getCell('D9').font={bold:true,color:{argb:muted}};
  summary.frameworkResults.forEach((fw,i)=>{const r=10+i;overview.getCell(r,4).value=fw.label;overview.getCell(r,4).font={bold:true,color:{argb:text}};overview.getCell(r,5).value=fw.applicable===false?'Not indicated':'Evidence found';overview.getCell(r,6).value=`${(fw.publicEvidence||[]).length + (fw.technicalControls||[]).length} observed`;overview.getCell(r,7).value=`${(fw.missingEvidence||[]).length} missing/manual`;});

  const checks = workbook.addWorksheet('Security Checks', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  checks.columns=[{header:'Category',width:24},{header:'Check',width:34},{header:'Status',width:18},{header:'Severity',width:16},{header:'Affected URL',width:54},{header:'Summary',width:58},{header:'Details / Evidence',width:70},{header:'Recommendation',width:65},{header:'References',width:65},{header:'Frameworks',width:42}];
  checks.getRow(1).height=34;checks.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const item of summary.checks){const evidenceItems=(item.evidenceItems||[]).map(e=>`${e.sourceUrl}: ${e.evidenceText}`).join(' | ');const row=checks.addRow([item.category,item.title,statusLabel(item.status),item.severity||'',item.affectedUrl||'',item.summary,[item.details,item.evidence,evidenceItems].filter(Boolean).join(' · '),item.recommendation,(item.references||[]).join('\n'),(item.frameworks||[]).join(', ')]);row.height=50;row.alignment={vertical:'top',wrapText:true};row.getCell(3).fill={type:'pattern',pattern:'solid',fgColor:{argb:statusFill(item.status)}};row.getCell(3).font={bold:true,color:{argb:statusColor(item.status)}};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
  checks.autoFilter={from:'A1',to:'J1'};

  const mapping = workbook.addWorksheet('Compliance Mapping', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
  mapping.columns=[{header:'Framework',width:24},{header:'Applicability',width:18},{header:'Public Evidence',width:58},{header:'Technical Controls',width:58},{header:'Missing Evidence',width:58},{header:'Certification',width:58},{header:'Jurisdiction',width:24},{header:'Scope Note',width:72}];
  mapping.getRow(1).height=34;mapping.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
  for(const fw of summary.frameworkResults){const row=mapping.addRow([fw.label,fw.applicable===false?'Not indicated':'Applicable / selected',(fw.publicEvidence||[]).join('\n'),(fw.technicalControls||[]).join('\n'),(fw.missingEvidence||[]).join('\n'),fw.certification||'',fw.jurisdiction||'',fw.note]);row.height=64;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}

  if (summary.crawl && Array.isArray(summary.crawl.pages) && summary.crawl.pages.length) {
    const evidence = workbook.addWorksheet('Crawled Evidence', { views: [{ state:'frozen', ySplit:1, showGridLines:false }] });
    evidence.columns=[{header:'URL',width:60},{header:'Found',width:12},{header:'HTTP Status',width:14},{header:'Evidence Group(s)',width:32},{header:'Error',width:54}];
    evidence.getRow(1).height=34;evidence.getRow(1).eachCell(c=>{c.font={bold:true,color:{argb:'FFFFFFFF'}};c.fill={type:'pattern',pattern:'solid',fgColor:{argb:navy}};c.alignment={vertical:'middle',horizontal:'center',wrapText:true};});
    for(const page of summary.crawl.pages){const row=evidence.addRow([page.url,page.found?'Yes':'No',page.status||'','' + (page.groups||[]).join(', '),page.error||'']);row.height=24;row.alignment={vertical:'top',wrapText:true};row.eachCell(c=>c.border={bottom:{style:'thin',color:{argb:border}}});}
    evidence.autoFilter={from:'A1',to:'E1'};
  }

  await workbook.xlsx.writeFile(path.join(root,'summary.xlsx'));
}

export class SecurityReportManager {
  constructor({ reportsRoot }) { this.reportsRoot = reportsRoot; }
  async save(summary) {
    ensureDir(this.reportsRoot);
    const runName = `${slugify(summary.projectName)}_security-compliance_${timestamp()}`;
    const root = path.join(this.reportsRoot, runName);
    ensureDir(root);
    const metadata = { reportType:'security-compliance', projectName:summary.projectName, targetUrl:summary.requestedUrl, generatedAt:summary.generatedAt, frameworks:summary.frameworks, jurisdiction:summary.jurisdiction };
    fs.writeFileSync(path.join(root,'metadata.json'),JSON.stringify(metadata,null,2));
    fs.writeFileSync(path.join(root,'summary.json'),JSON.stringify({ ...summary, overview: { reportType:'security-compliance', projectName:summary.projectName, baseUrl:summary.finalUrl, overallStatus:summary.overallStatus, securityPassed:summary.totals.pass, securityAttention:summary.totals.fail + summary.totals.warning, frameworks:summary.frameworkResults.map(f=>f.label) } },null,2));
    const rows = [['Category','Check','Status','Severity','Affected URL','Summary','Details / Evidence','Recommendation','References','Frameworks']];
    for (const item of summary.checks) {
      const evidenceItems = (item.evidenceItems || []).map((e) => `${e.sourceUrl}: ${e.evidenceText}`).join(' | ');
      rows.push([item.category,item.title,statusLabel(item.status),item.severity || '',item.affectedUrl || '',item.summary,[item.details,item.evidence,evidenceItems].filter(Boolean).join(' · '),item.recommendation,(item.references||[]).join(' | '),(item.frameworks||[]).join(', ')]);
    }
    fs.writeFileSync(path.join(root,'summary.csv'),`\uFEFF${rows.map(row=>row.map(csvEscape).join(',')).join('\n')}\n`,'utf8');
    fs.writeFileSync(path.join(root,'summary.html'),buildHtml(summary),'utf8');
    await writeXlsx(root,summary);
    return { ...summary, reportName:runName, summaryHref:`/reports/${encodeURIComponent(runName)}/summary.html`, csvHref:`/reports/${encodeURIComponent(runName)}/summary.csv`, xlsxHref:`/reports/${encodeURIComponent(runName)}/summary.xlsx` };
  }
}
