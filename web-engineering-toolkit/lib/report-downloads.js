import fs from 'node:fs';
import path from 'node:path';
import { slugify } from './utils.js';

const REPORT_SLUGS = Object.freeze({
  lighthouse: 'lighthouse-report',
  'security-compliance': 'compliance-mapping-report',
  'asset-page-weight': 'asset-page-weight-report',
  'broken-links-resources': 'broken-links-resources-report',
  'security-analyzer': 'security-web-security'
});

const ARTIFACTS = Object.freeze({
  pdf: { file: 'summary.pdf', mimeType: 'application/pdf' },
  csv: { file: 'summary.csv', complianceFile: 'findings.csv', mimeType: 'text/csv; charset=utf-8' },
  xlsx: { file: 'summary.xlsx', mimeType: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' },
  json: { file: 'summary.json', mimeType: 'application/json; charset=utf-8' },
  'evidence-manifest': { file: 'evidence/manifest.json', extension: 'json', suffix: 'evidence-manifest', mimeType: 'application/json; charset=utf-8' },
  'assets-csv': { file: 'assets.csv', extension: 'csv', suffix: 'assets', mimeType: 'text/csv; charset=utf-8' }
});

function timestampPart(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'unknown-time';
  return date.toISOString().replace(/\.\d{3}Z$/, 'Z').replace('T', '_').replaceAll(':', '-');
}

export function buildReportDownloadFilename({ reportType, projectName, generatedAt, extension, suffix = '' }) {
  const ext = String(extension || '').toLowerCase().replace(/^\./, '');
  if (!['pdf', 'csv', 'xlsx', 'json'].includes(ext)) throw new Error('Unsupported report download format.');
  const report = REPORT_SLUGS[reportType] || 'web-engineering-report';
  const project = slugify(String(projectName || '').slice(0, 160), 'project').slice(0, 80) || 'project';
  const qualifier = suffix ? `__${slugify(String(suffix).slice(0, 80), 'artifact')}` : '';
  return `${report}__${project}__${timestampPart(generatedAt)}${qualifier}.${ext}`;
}

export function buildReportArtifactDownloadFilename({ reportType, projectName, generatedAt, format }) {
  const artifact = ARTIFACTS[format];
  if (!artifact) throw new Error('Unsupported report download format.');
  return buildReportDownloadFilename({ reportType, projectName, generatedAt, extension: artifact.extension || format, suffix: artifact.suffix });
}

function readJson(file) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; }
}

export function resolveReportDownload({ reportsRoot, reportName, format }) {
  if (path.basename(reportName) !== reportName || !reportName || reportName === '.' || reportName === '..') throw new Error('Invalid report name.');
  const artifact = ARTIFACTS[format];
  if (!artifact) throw new Error('Unsupported report download format.');
  const root = path.resolve(reportsRoot, reportName);
  if (!root.startsWith(`${path.resolve(reportsRoot)}${path.sep}`)) throw new Error('Invalid report path.');
  const metadata = readJson(path.join(root, 'metadata.json')) || {};
  const summary = readJson(path.join(root, 'summary.json')) || {};
  const reportType = metadata.reportType || summary.overview?.reportType || summary.reportType || 'unknown';
  const fileName = format === 'csv' && reportType === 'security-compliance' ? artifact.complianceFile : artifact.file;
  const file = path.join(root, fileName);
  if (!fs.existsSync(file) || !fs.statSync(file).isFile()) throw Object.assign(new Error('Report artifact not found.'), { statusCode: 404 });
  const projectName = summary.projectName || summary.overview?.projectName || metadata.projectName || 'project';
  const generatedAt = summary.generatedAt || summary.overview?.generatedAt || metadata.generatedAt;
  return { file, mimeType: artifact.mimeType, filename: buildReportArtifactDownloadFilename({ reportType, projectName, generatedAt, format }) };
}

export function reportDownloadHref(reportName, format) {
  return `/api/reports/${encodeURIComponent(reportName)}/download/${format}`;
}
