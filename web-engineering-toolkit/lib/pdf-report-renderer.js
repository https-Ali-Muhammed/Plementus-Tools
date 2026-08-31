import { detectBrowsers } from './environment-checker.js';

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

export function reportFamilyDocument({ title, projectName, subtitle, generatedAt, metadata = [], metrics = [], sections = [] }) {
  const meta = metadata.map(([label, value]) => `<div><span>${escapePdfHtml(label)}</span><strong>${escapePdfHtml(value ?? '—')}</strong></div>`).join('');
  const metricHtml = metrics.map(([label, value, tone = '']) => `<div class="metric ${escapePdfHtml(tone)}"><span>${escapePdfHtml(label)}</span><strong>${escapePdfHtml(value ?? '—')}</strong></div>`).join('');
  return `<!doctype html><html lang="en"><head><meta charset="utf-8"><title>${escapePdfHtml(title)} - ${escapePdfHtml(projectName)}</title><style>
  @page{size:A4;margin:0}*{box-sizing:border-box}html{font-family:Inter,"Noto Sans Arabic","Segoe UI",Arial,sans-serif;color:#101828}body{margin:0;background:#fff;font-size:9.5px;line-height:1.45}main{width:100%}.cover{min-height:245mm;padding:26mm 20mm 18mm;background:#11192d;color:#f7f9ff;display:flex;flex-direction:column;break-after:page}.eyebrow{color:#a99fff;font-size:9px;font-weight:800;letter-spacing:.15em;text-transform:uppercase}.cover h1{max-width:155mm;margin:10mm 0 4mm;font-size:28px;line-height:1.08;letter-spacing:-.03em}.cover .subtitle{max-width:150mm;color:#c4cad8;font-size:12px}.cover-meta{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:3mm;margin-top:12mm}.cover-meta div{min-width:0;padding:4mm;border:1px solid rgba(255,255,255,.13);border-radius:3mm}.cover-meta span,.metric span,.label{display:block;color:#667085;font-size:7px;font-weight:750;letter-spacing:.08em;text-transform:uppercase}.cover-meta span{color:#9ca6ba}.cover-meta strong{display:block;margin-top:1.5mm;overflow-wrap:anywhere;font-size:10px}.cover-foot{margin-top:auto;padding-top:7mm;border-top:1px solid rgba(255,255,255,.15);color:#9ca6ba}.content{padding:8mm 0}.section{margin:0 0 6mm;break-inside:auto}.section>h2{margin:0 0 3mm;font-size:17px;line-height:1.2;color:#11192d;break-after:avoid}.section>p.intro{margin:-1.5mm 0 3mm;color:#667085}.metrics{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:2.5mm}.metric,.card{min-width:0;padding:3.5mm;border:1px solid #e4e7ec;border-radius:3mm;background:#f8fafc;break-inside:avoid}.metric strong{display:block;margin-top:1mm;font-size:17px;color:#11192d}.metric.attention{border-left:1.2mm solid #b4233a}.metric.review{border-left:1.2mm solid #9b5f09}.metric.healthy{border-left:1.2mm solid #177b57}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:2.5mm}.card h3{margin:0 0 1.5mm;font-size:11px}.card p{margin:1mm 0;color:#475467;overflow-wrap:anywhere}.machine{overflow-wrap:anywhere;word-break:break-word}.badge{display:inline-block;padding:1mm 2mm;border:1px solid #d0d5dd;border-radius:99px;font-size:7px;font-weight:800;text-transform:uppercase}.table-wrap{width:100%;overflow:hidden}table{width:100%;border-collapse:collapse;table-layout:fixed}thead{display:table-header-group}tr{break-inside:avoid}th,td{padding:2.2mm;border-bottom:.25mm solid #e4e7ec;text-align:left;vertical-align:top;overflow-wrap:anywhere}th{background:#11192d;color:#fff;font-size:7px;letter-spacing:.05em;text-transform:uppercase}td{font-size:8px}.muted{color:#667085}.bar{height:2.2mm;border-radius:2mm;background:#e4e7ec;overflow:hidden}.bar i{display:block;height:100%;background:#7c6cff}.limitations{padding:4mm;border-left:1mm solid #7c6cff;background:#f8fafc}.page-break{break-before:page}@media print{a{color:inherit;text-decoration:none}}
  </style></head><body><main><section class="cover"><div class="eyebrow">Web Engineering Toolkit</div><h1>${escapePdfHtml(title)}</h1><p class="subtitle">${escapePdfHtml(subtitle)}</p><div class="cover-meta">${meta}</div><div class="cover-foot">Generated ${escapePdfHtml(generatedAt)} · Professional technical report</div></section><div class="content">${metrics.length ? `<section class="section"><h2>Executive summary</h2><div class="metrics">${metricHtml}</div></section>` : ''}${sections.join('')}</div></main></body></html>`;
}

export async function generateToolPdf({ html, pdfPath, toolName, projectName, browserPath = '' }) {
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
    await page.pdf({ path: pdfPath, format: 'A4', printBackground: true, displayHeaderFooter: true, margin: { top: '18mm', right: '16mm', bottom: '18mm', left: '16mm' }, headerTemplate: `<div style="width:100%;padding:0 16mm;font:7px Arial;color:#6b7280;display:flex;justify-content:space-between"><span>Web Engineering Toolkit — ${escapePdfHtml(toolName)}</span><span>${escapePdfHtml(projectName)}</span></div>`, footerTemplate: `<div style="width:100%;padding:0 16mm;font:7px Arial;color:#6b7280;display:flex;justify-content:space-between"><span>${escapePdfHtml(toolName)}</span><span>Page <span class="pageNumber"></span> of <span class="totalPages"></span></span></div>`, tagged: true, outline: true });
  } finally { await browser.close(); }
  return { durationMs: Math.round(performance.now() - startedAt), method: 'playwright_chromium_print_to_pdf' };
}
