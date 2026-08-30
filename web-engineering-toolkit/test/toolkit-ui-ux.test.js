import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildComplianceHtml } from '../lib/security-report-html.js';
import { createComplianceSummary } from './fixtures/compliance-summary-fixture.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (relativePath) => fs.readFileSync(path.join(root, relativePath), 'utf8');
const escapeRegExp = (value) => value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
const normalizeCssValue = (value) => String(value).replace(/\s+/g, '').replace(/0\.(\d+)/g, '.$1');

test('toolkit CSS has one shared owner and one isolated stylesheet per tool', () => {
  const entry = read('public/styles.css');
  const expectedImports = [
    './styles/shared.css',
    './styles/lighthouse.css',
    './styles/compliance.css',
    './styles/asset-analyzer.css',
    './styles/broken-links.css'
  ];

  for (const stylesheet of expectedImports) {
    assert.match(entry, new RegExp(`@import\\s+url\\(["']?${stylesheet.replaceAll('.', '\\.')}["']?\\)`));
    assert.ok(fs.existsSync(path.join(root, 'public', stylesheet)), `${stylesheet} must exist`);
  }
  assert.doesNotMatch(entry, /\{[^}]*\}/s, 'styles.css must remain an import-only compatibility entry point');

  assert.match(read('public/styles/lighthouse.css'), /#runnerSection/);
  assert.match(read('public/styles/compliance.css'), /#securitySection/);
  assert.match(read('public/styles/asset-analyzer.css'), /#assetsSection/);
  assert.match(read('public/styles/broken-links.css'), /#linksSection/);
});

test('toolkit shell preserves functional roots and loads only the compatibility entry point', () => {
  const html = read('public/index.html');
  assert.match(html, /<link rel="stylesheet" href="\/styles\.css"\s*\/?>/);
  assert.match(html, /id="runnerSection"/);
  assert.match(html, /id="securitySection"/);
  assert.match(html, /id="assetsSection"/);
  assert.match(html, /id="linksSection"/);
  assert.match(html, /id="historySection"/);
  assert.doesNotMatch(html, /class="security-select-all" style=/);
});

test('Compliance review markup groups existing decisions without changing control IDs', () => {
  const app = read('public/app.js');
  assert.match(app, /security-review-group/);
  assert.match(app, /security-review-group-title/);
  for (const controlClass of ['security-review-decision', 'security-scope-decision', 'security-scope-framework', 'security-mapping-decision', 'security-mapping-id', 'security-lifecycle-reason', 'security-lifecycle-save']) {
    assert.match(app, new RegExp(controlClass));
  }
});

test('generated Compliance reports remain isolated from interactive toolkit styles', () => {
  const html = buildComplianceHtml(createComplianceSummary({
    schemaVersion: '2.6.0',
    projectName: 'Toolkit CSS isolation fixture'
  }));
  assert.doesNotMatch(html, /(?:shared|compliance|lighthouse|asset-analyzer|broken-links|styles)\.css/i);
  assert.match(html, /@media print/);
});

test('shared stylesheet preserves the approved canonical palette values', () => {
  const shared = read('public/styles/shared.css');
  const expected = {
    '--bg': '#0b1020',
    '--panel': 'rgba(18, 25, 45, 0.86)',
    '--panel-strong': '#11192d',
    '--panel-soft': 'rgba(255,255,255,.035)',
    '--border': 'rgba(255,255,255,.09)',
    '--border-strong': 'rgba(255,255,255,.14)',
    '--text': '#f7f9ff',
    '--muted': '#95a0ba',
    '--subtle': '#65718e',
    '--accent': '#7c6cff',
    '--accent-2': '#4f9cff',
    '--success': '#4fd1a1',
    '--warning': '#ffbf69',
    '--danger': '#ff6b7a'
  };
  for (const [token, value] of Object.entries(expected)) {
    const declaration = shared.match(new RegExp(`${escapeRegExp(token)}:\\s*([^;]+)`));
    assert.ok(declaration, `${token} must remain declared`);
    assert.equal(normalizeCssValue(declaration[1]), normalizeCssValue(value), `${token} must preserve its approved value`);
  }
});
