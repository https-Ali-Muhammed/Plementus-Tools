import { detectBrowsers } from './environment-checker.js';
import fs from 'node:fs/promises';

export const REPORT_FAMILY_TOKENS = Object.freeze({
  fontStack: '"DejaVu Sans","Noto Sans Arabic","Segoe UI",Arial,sans-serif',
  monoStack: '"DejaVu Sans Mono","Liberation Mono",monospace',
  ink: '#172033', heading: '#18223a', muted: '#5f6879', accent: '#5747c7',
  border: '#d7dce5', soft: '#f6f7fa', warning: '#fff8e8', warningBorder: '#e4c98f'
});

export function escapePdfHtml(value) {
  return String(value ?? '').replace(/[\u00ad\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff\ufffd]/g, '').replace(/[&<>'"]/g, (character) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;' }[character]));
}

export function humanizePdf(value) {
  return String(value || '').replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

export function formatPdfBytes(value) {
  const bytes = Number(value) || 0;
  if (bytes >= 1024 * 1024) return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  if (bytes >= 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${Math.round(bytes)} B`;
}

export function readablePdfUrl(value) {
  const raw = String(value || '');
  try {
    const url = new URL(raw);
    const keys = [...new Set([...url.searchParams.keys()])];
    const query = keys.length ? `?${keys.slice(0, 4).join('&')}${keys.length > 4 ? `&+${keys.length - 4}-more` : ''}` : '';
    const path = url.pathname === '/' ? '/' : url.pathname.replace(/\/{2,}/g, '/');
    const cleanPath = path.length > 120 ? `${path.slice(0, 84)}…${path.slice(-28)}` : path;
    return `${url.origin}${cleanPath}${query}${url.hash}`;
  } catch {
    return raw.length > 150 ? `${raw.slice(0, 110)}…${raw.slice(-32)}` : raw;
  }
}

export function machineUrlCell(value) {
  const readable = readablePdfUrl(value);
  return `<span class="url-display">${escapePdfHtml(readable)}</span>${String(value || '') !== readable ? `<span class="machine-detail" aria-label="Full safe URL">Full safe URL: ${escapePdfHtml(value)}</span>` : ''}`;
}

export function reportFamilyDocument({ toolName, title, projectName, subtitle, generatedAt, metadata = [], chips = [], notice = '', metrics = [], sections = [] }) {
  const meta = metadata.map(([label, value, machine = false]) => `<div><span>${escapePdfHtml(label)}</span><strong${machine ? ' class="machine-text"' : ''}>${escapePdfHtml(value ?? '—')}</strong></div>`).join('');
  const chipHtml = chips.map(([label, value, tone = '']) => `<span class="status-chip ${escapePdfHtml(tone)}">${escapePdfHtml(label)}: <strong>${escapePdfHtml(value)}</strong></span>`).join('');
  const metricHtml = metrics.map(([label, value, tone = '']) => `<div class="metric ${escapePdfHtml(tone)}"><span>${escapePdfHtml(label)}</span><strong>${escapePdfHtml(value ?? '—')}</strong></div>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="author" content="Web Engineering Toolkit"><meta name="description" content="${escapePdfHtml(subtitle)}"><title>${escapePdfHtml(title)} - ${escapePdfHtml(projectName)}</title><style>
  @page{size:A4 portrait;margin:18mm 16mm 18mm}*{box-sizing:border-box}html{font-family:${REPORT_FAMILY_TOKENS.fontStack};color:${REPORT_FAMILY_TOKENS.ink}}body{margin:0;background:#fff;font-size:9.5pt;line-height:1.42}main{width:100%}.cover{padding:12mm 0 6mm;border-bottom:1px solid ${REPORT_FAMILY_TOKENS.border};margin-bottom:6mm}.eyebrow{color:${REPORT_FAMILY_TOKENS.accent};font-size:8pt;font-weight:800;letter-spacing:.14em;text-transform:uppercase}.cover h1{max-width:165mm;margin:3mm 0 2.5mm;color:${REPORT_FAMILY_TOKENS.heading};font-size:27pt;line-height:1.08;letter-spacing:-.025em}.cover .subtitle{max-width:168mm;margin:0;color:${REPORT_FAMILY_TOKENS.muted};font-size:9.5pt}.cover-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2mm 9mm;margin:5mm 0 0}.cover-meta div{display:grid;grid-template-columns:31mm minmax(0,1fr);gap:2mm;min-width:0}.cover-meta span,.metric span,.label{display:block;color:#98a2b3;font-size:7pt;line-height:1.35}.cover-meta strong{min-width:0;color:${REPORT_FAMILY_TOKENS.ink};font-size:8.4pt;overflow-wrap:anywhere}.status-row{display:flex;gap:2mm;flex-wrap:wrap;margin:4mm 0 0}.status-chip{padding:2mm 3mm;border:1px solid ${REPORT_FAMILY_TOKENS.border};border-radius:5px;background:${REPORT_FAMILY_TOKENS.soft};color:${REPORT_FAMILY_TOKENS.ink};font-size:7.5pt}.status-chip.attention{border-color:#e9b7bf;background:#fde8eb}.status-chip.review{border-color:${REPORT_FAMILY_TOKENS.warningBorder};background:${REPORT_FAMILY_TOKENS.warning}}.status-chip.healthy{border-color:#b8dcca;background:#e8f5ee}.notice{margin:4mm 0 0;padding:3mm;border:1px solid ${REPORT_FAMILY_TOKENS.warningBorder};border-radius:5px;background:${REPORT_FAMILY_TOKENS.warning};color:#4e3a18;font-size:8pt}.content{padding:0}.section{margin:0 0 6mm;break-inside:auto}.section>h2{margin:0 0 3mm;color:${REPORT_FAMILY_TOKENS.heading};font-size:15pt;line-height:1.2;break-after:avoid}.section>p.intro{margin:-1.5mm 0 3mm;color:${REPORT_FAMILY_TOKENS.muted};font-size:8.5pt;break-after:avoid}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:3mm}.metric,.card{min-width:0;padding:3mm;border:1px solid ${REPORT_FAMILY_TOKENS.border};border-radius:5px;background:#fff;break-inside:avoid}.metric strong{display:block;margin-top:1.5mm;color:${REPORT_FAMILY_TOKENS.heading};font-size:16pt;line-height:1.15}.metric.attention{border-left:1mm solid #b4233a}.metric.review{border-left:1mm solid #9b5f09}.metric.healthy{border-left:1mm solid #177b57}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3mm}.card h3{margin:0 0 1.5mm;color:${REPORT_FAMILY_TOKENS.heading};font-size:9pt}.card p{margin:1mm 0;color:${REPORT_FAMILY_TOKENS.muted};font-size:8pt;overflow-wrap:anywhere}.machine-text,.machine,.machine-detail{direction:ltr;unicode-bidi:isolate;font-family:${REPORT_FAMILY_TOKENS.monoStack};overflow-wrap:anywhere;word-break:break-word}.badge{display:inline-block;margin-bottom:1mm;padding:.7mm 1.6mm;border:1px solid ${REPORT_FAMILY_TOKENS.border};border-radius:99px;background:${REPORT_FAMILY_TOKENS.soft};font-size:6pt;font-weight:800;text-transform:uppercase}.table-wrap{width:100%;overflow:hidden;border:1px solid ${REPORT_FAMILY_TOKENS.border};border-radius:5px}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:1.8mm 2mm;border-bottom:.25mm solid ${REPORT_FAMILY_TOKENS.border};text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#f5f6f9;color:${REPORT_FAMILY_TOKENS.heading};font-size:6.5pt;letter-spacing:.04em;text-transform:uppercase}td{color:${REPORT_FAMILY_TOKENS.ink};font-size:7.2pt}.url-display{display:block;color:#244b86;overflow-wrap:anywhere}.machine-detail{display:block;margin-top:.6mm;color:${REPORT_FAMILY_TOKENS.muted};font-size:2.2pt;line-height:1.05}.muted{color:${REPORT_FAMILY_TOKENS.muted}}.bar{height:1.7mm;border-radius:2mm;background:#e4e7ec;overflow:hidden}.bar i{display:block;height:100%;background:${REPORT_FAMILY_TOKENS.accent}}.limitations{padding:3mm;border-left:1mm solid ${REPORT_FAMILY_TOKENS.accent};background:#f5f3ff;color:${REPORT_FAMILY_TOKENS.ink};break-inside:avoid}.page-break{break-before:page}.keep-next{break-after:avoid}@media print{a{color:inherit;text-decoration:none}.avoid-break{break-inside:avoid;page-break-inside:avoid}}
  </style></head><body><main><section class="cover"><div class="eyebrow">Web Engineering Toolkit · ${escapePdfHtml(toolName)}</div><h1>${escapePdfHtml(title)}</h1><p class="subtitle">${escapePdfHtml(subtitle)}</p><div class="cover-meta">${meta}</div>${chipHtml ? `<div class="status-row">${chipHtml}</div>` : ''}${notice ? `<div class="notice">${escapePdfHtml(notice)}</div>` : ''}</section><div class="content">${metrics.length ? `<section class="section"><h2>1. Executive Summary</h2><div class="metrics">${metricHtml}</div></section>` : ''}${sections.join('')}</div></main></body></html>`;
}

export async function generateToolPdf({ html, pdfPath, toolName, reportTitle = toolName, projectName, target = '', browserPath = '' }) {
  const startedAt = performance.now();
  const { chromium } = await import('playwright-core');
  const detected = browserPath ? [{ path: browserPath }] : await detectBrowsers();
  const executablePath = detected.find((browser) => browser.path)?.path;
  if (!executablePath) throw new Error('No compatible Chrome/Chromium/Brave executable is available for PDF generation.');
  const browser = await chromium.launch({ executablePath, headless: true, args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'] });
  try {
    const page = await browser.newPage({ viewport: { width: 1440, height: 1000 } });
    await page.setContent(html, { waitUntil: 'load', timeout: 30_000 });
    await page.emulateMedia({ media: 'print' });
    const context = [projectName, target].filter(Boolean).join(' · ');
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, displayHeaderFooter: true, margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' }, headerTemplate: `<div style="width:100%;padding:0 16mm;font:7px 'DejaVu Sans',Arial,sans-serif;color:#6b7280;display:flex;gap:10mm"><span style="min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">Web Engineering Toolkit — ${escapePdfHtml(toolName)}</span><span style="min-width:0;flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right">${escapePdfHtml(context)}</span></div>`, footerTemplate: `<div style="width:100%;padding:0 16mm;font:7px 'DejaVu Sans',Arial,sans-serif;color:#6b7280;display:flex;justify-content:space-between"><span>${escapePdfHtml(reportTitle)}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`, tagged: true, outline: true });
    const { PDFDocument } = await import('pdf-lib');
    const pdf = await PDFDocument.load(await fs.readFile(pdfPath), { updateMetadata: false });
    pdf.setTitle(`${reportTitle} - ${projectName || 'Project'}`);
    pdf.setCreator('Web Engineering Toolkit');
    pdf.setProducer('Web Engineering Toolkit');
    pdf.setSubject(`${toolName} technical report for ${projectName || 'Project'}`);
    await fs.writeFile(pdfPath, await pdf.save({ useObjectStreams: false }));
  } finally { await browser.close(); }
  return { durationMs: Math.round(performance.now() - startedAt), method: 'playwright_chromium_print_to_pdf' };
}
