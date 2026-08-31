import { escapePdfHtml as e, formatPdfBytes, humanizePdf, machineUrlCell, reportFamilyDocument } from './pdf-report-renderer.js';
import { TOOL_VERSION } from './tool-version.js';

const section = (number, title, body, intro = '', extra = '') => `<section class="section ${extra}"><h2>${number}. ${e(title)}</h2>${intro ? `<p class="intro">${e(intro)}</p>` : ''}${body}</section>`;
const table = (headers, rows, widths = []) => `<div class="table-wrap"><table><colgroup>${headers.map((_, index) => `<col${widths[index] ? ` style="width:${widths[index]}"` : ''}>`).join('')}</colgroup><thead><tr>${headers.map((h) => `<th>${e(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;

export function lighthousePdfHtml(summary) {
  const o = summary.overview || {};
  const categories = o.categories || [];
  const label = { performance: 'Performance', accessibility: 'Accessibility', 'best-practices': 'Best Practices', seo: 'SEO' };
  const key = { performance: 'performance', accessibility: 'accessibility', 'best-practices': 'bestPractices', seo: 'seo' };
  const findings = (summary.insights?.categories || []).flatMap((category) => (category.groups || []).flatMap((group) => (group.findings || []).map((finding) => ({ category: category.title, group: group.title, ...finding })))).slice(0, 40);
  const findingCards = findings.length ? `<div class="grid">${findings.map((f) => `<article class="card"><span class="badge">${e(humanizePdf(f.status))}</span><h3>${e(f.title)}</h3><p>${e(f.category)} · ${e(f.group)} · ${f.affected?.length || f.occurrences || 0} affected result(s)</p><p>${e(f.displayValue || f.explanation || f.description || 'See the detailed Lighthouse HTML report.')}</p></article>`).join('')}</div>` : '<div class="card">No important Lighthouse findings were retained for the selected categories.</div>';
  const rows = (summary.rows || []).slice(0, 100).map((row) => [machineUrlCell(row.path), e(humanizePdf(row.device)), e(humanizePdf(row.status)), ...categories.map((id) => e(row[key[id]] === '' ? '—' : row[key[id]])), e(row.lcpMs === '' ? '—' : `${Math.round(row.lcpMs)} ms`), e(row.findingCount || 0)]);
  const sections = [
    section(2, 'Lighthouse Score Summary', `<div class="metrics">${categories.map((id) => `<div class="metric"><span>${e(label[id] || humanizePdf(id))}</span><strong>${e(o[key[id]] === '' ? 'Not assessed' : o[key[id]])}</strong></div>`).join('')}</div>`, 'Only categories selected for this run are shown.'),
    section(3, 'Important Findings', findingCards, 'Grouped from Lighthouse category and audit evidence; ISSUE and MANUAL meanings are preserved and no severity model is introduced.'),
    section(4, 'Page Results', table(['Page', 'Device', 'Status', ...categories.map((id) => label[id] || humanizePdf(id)), 'LCP', 'Findings'], rows, ['30mm', '13mm', '14mm']), 'Up to 100 page/device rows are included; the HTML report and CSV retain the complete structured results.'),
    section(5, 'Methodology / Limitations', '<div class="limitations">Scores and audits reflect the selected Lighthouse categories, devices, browser environment, run count, and tested URLs at generation time. Lighthouse scores are diagnostic measurements, not compliance or certification conclusions.</div>')
  ];
  return reportFamilyDocument({
    toolName: 'Lighthouse Reporter', title: 'Lighthouse Technical Report', projectName: o.projectName || 'Project',
    subtitle: 'Lighthouse performance and quality observations for the configured pages, devices, and categories.', generatedAt: summary.generatedAt,
    metadata: [['Project', o.projectName], ['Target / base URL', o.baseUrl, true], ['Scan generated', summary.generatedAt, true], ['Toolkit version', TOOL_VERSION, true], ['Browser mode', o.mode], ['Devices', (o.devices || []).join(', ')], ['Language', o.targetLanguage], ['Selected categories', categories.map((id) => label[id] || humanizePdf(id)).join(', ')], ['Pages analyzed', o.pages], ['Valid runs / failed runs', `${o.validAudits || 0} / ${o.failedAudits || 0}`]],
    chips: [['Run state', o.failedAudits ? 'Completed with failed runs' : 'Completed'], ['Selected categories', categories.length]],
    metrics: [['Pages analyzed', o.pages], ['Valid runs', o.validAudits], ['Failed runs', o.failedAudits], ['Important findings', o.totalFindings || 0]], sections
  });
}

export function assetPdfHtml(result) {
  const s = result.summary || {};
  const breakdown = Object.entries(s.breakdown || {}).sort((a, b) => b[1] - a[1]);
  const max = Math.max(...breakdown.map(([, value]) => value), 1);
  const breakdownHtml = `<div class="grid">${breakdown.map(([type, bytes]) => `<div class="card"><h3>${e(humanizePdf(type))}</h3><p>${e(formatPdfBytes(bytes))}</p><div class="bar"><i style="width:${Math.max(2, bytes / max * 100)}%"></i></div></div>`).join('')}</div>`;
  const pages = (result.pages || []).slice(0, 100).map((p) => [machineUrlCell(p.finalUrl), e(p.status), e(formatPdfBytes(p.totalTransferBytes)), e(p.requestCount), e(formatPdfBytes(p.breakdown?.script)), e(formatPdfBytes(p.breakdown?.image)), e(formatPdfBytes(p.thirdPartyBytes)), e(p.findings?.length || 0)]);
  const findings = (result.findings || []).slice(0, 40).map((f) => `<article class="card"><span class="badge">${e(humanizePdf(f.severity))}</span><h3>${e(f.title)}</h3><p>${e(f.detail)}</p><p><strong>Recommendation:</strong> ${e(f.recommendation)}</p><p>${e((f.pages || []).slice(0, 5).join(', '))}</p></article>`).join('') || '<div class="card">No configured page-weight thresholds were triggered.</div>';
  const assets = (result.largestAssets || []).slice(0, 40).map((a) => [e(humanizePdf(a.category)), machineUrlCell(a.url), e(formatPdfBytes(a.transferBytes)), e(a.host), machineUrlCell(a.pageUrl)]);
  return reportFamilyDocument({
    toolName: 'Asset & Page-Weight Analyzer', title: 'Asset & Page-Weight Analysis', projectName: result.projectName || 'Project',
    subtitle: 'Transferred-byte, request, resource, and optimization observations for the selected pages.', generatedAt: result.generatedAt,
    metadata: [['Project', result.projectName], ['Base URL', result.baseUrl, true], ['Generated', result.generatedAt, true], ['Toolkit version', TOOL_VERSION, true], ['Browser', result.browser?.name], ['Viewport / device', result.device], ['Pages analyzed', s.pageCount]],
    metrics: [['Pages analyzed', s.pageCount], ['Average page weight', formatPdfBytes(s.averageBytes)], ['Average requests', Math.round(s.averageRequests || 0)], ['Third-party transfer', formatPdfBytes(s.thirdPartyBytes)]],
    sections: [section(2, 'Resource Breakdown', breakdownHtml), section(3, 'Page Results', table(['Page', 'Status', 'Weight', 'Requests', 'JavaScript', 'Images', 'Third-party', 'Findings'], pages, ['34mm']), 'Up to 100 page results are shown; CSV retains structured page data.'), section(4, 'Optimization Findings', `<div class="grid">${findings}</div>`), section(5, 'Largest Transferred Assets', table(['Type', 'Asset', 'Size', 'Host', 'Source page'], assets, ['13mm', '50mm', '14mm', '25mm', '39mm']), 'The PDF uses a bounded display URL plus a smaller searchable full-safe-URL detail; the asset CSV remains exhaustive.'), section(6, 'Methodology / Limitations', '<div class="limitations">Transferred bytes and request counts reflect browser-observed network activity for the configured pages and viewport. Cache, compression, third-party behavior, and dynamic content can change between runs.</div>')]
  });
}

const ATTENTION = new Set(['broken', 'fragment_missing', 'server_error', 'unreachable', 'failed_to_check', 'client_error']);
const REVIEW = new Set(['redirected', 'restricted', 'rate_limited']);
export function brokenLinksPdfHtml(result) {
  const targets = result.targets || [];
  const attention = targets.filter((t) => ATTENTION.has(t.outcome));
  const review = targets.filter((t) => REVIEW.has(t.outcome));
  const redirects = targets.filter((t) => t.outcome === 'redirected');
  const healthy = targets.filter((t) => t.outcome === 'healthy');
  const outcomeRows = [...new Set(targets.map((t) => t.outcome))].sort().map((outcome) => [e(humanizePdf(outcome)), e(targets.filter((t) => t.outcome === outcome).length)]);
  const remediation = (list, limit = 100) => table(['Outcome', 'Status', 'Target', 'Type', 'Occurrences', 'Representative sources / reason'], list.slice(0, limit).map((t) => [e(humanizePdf(t.outcome)), e(t.httpStatus || '—'), machineUrlCell(t.targetUrl), e((t.referenceTypes || []).map(humanizePdf).join(', ') || t.referenceType), e(t.occurrenceCount || 0), e([...(t.sourcePages || []).slice(0, 3), t.failureReason || '', t.finalUrl && t.finalUrl !== t.targetUrl ? `Final: ${t.finalUrl}` : ''].filter(Boolean).join(' · '))]), ['16mm', '11mm', '49mm', '18mm', '13mm']);
  const types = Object.entries(healthy.reduce((acc, target) => { for (const type of target.referenceTypes || [target.referenceType || 'other_resource']) acc[type] = (acc[type] || 0) + 1; return acc; }, {})).sort((a, b) => b[1] - a[1]);
  return reportFamilyDocument({
    toolName: 'Broken Links & Resources Checker', title: 'Broken Links & Resources Report', projectName: result.projectName || 'Project',
    subtitle: 'A remediation-first availability report preserving canonical outcome distinctions.', generatedAt: result.generatedAt,
    metadata: [['Project', result.projectName], ['Base URL', result.baseUrl, true], ['Generated', result.generatedAt, true], ['Toolkit version', TOOL_VERSION, true], ['Scan scope', humanizePdf(result.scope?.mode)], ['Pages scanned', result.summary?.pagesScanned], ['Targets checked', result.summary?.uniqueTargets]],
    chips: [['Needs attention', attention.length, 'attention'], ['Review', review.length, 'review'], ['Healthy', healthy.length, 'healthy']],
    metrics: [['Pages scanned', result.summary?.pagesScanned], ['Targets checked', result.summary?.uniqueTargets], ['Needs attention', attention.length, 'attention'], ['Review', review.length, 'review'], ['Healthy', healthy.length, 'healthy']],
    sections: [section(2, 'Canonical Outcome Counts', table(['Outcome', 'Count'], outcomeRows, ['80mm'])), section(3, 'Attention Required', remediation(attention), 'Definitive failures, missing fragments, server errors, and checks that could not complete are prioritized.'), section(4, 'Review Items', remediation(review.filter((target) => target.outcome !== 'redirected')), 'Restricted and rate-limited targets remain distinct from broken references.'), section(5, 'Redirects', remediation(redirects), 'Redirects are factual route outcomes and are not classified as broken references.'), section(6, 'Healthy Inventory Summary', `${table(['Reference type', 'Healthy targets'], types.map(([type, count]) => [e(humanizePdf(type)), e(count)]), ['90mm'])}<p class="muted">${healthy.length} healthy targets are retained in the complete CSV; individual healthy rows are intentionally omitted from this PDF.</p>`), section(7, 'Scope / Methodology / Limitations', '<div class="limitations">Only bounded HTTP(S) checks and rendered-page observations are represented. Restricted, rate-limited, redirected, timed-out, and failed checks are not classified as definitive broken links. Response bodies, credentials, headers, and sensitive query values are not included.</div>')]
  });
}
