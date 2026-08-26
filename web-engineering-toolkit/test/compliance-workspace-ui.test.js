import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';

const html = fs.readFileSync(new URL('../public/index.html', import.meta.url), 'utf8');
const app = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
const css = fs.readFileSync(new URL('../public/styles.css', import.meta.url), 'utf8');

test('Compliance setup uses project context with an explicit ad-hoc override path', () => {
  assert.match(html, /id="securityProjectContext" class="security-project-context hidden"/);
  assert.match(html, /id="securityProjectOverrideFields"/);
  assert.match(app, /data-security-project-override/);
  assert.match(app, /state\.securityProjectOverride = true/);
  assert.match(app, /projectEnvironmentUrl\(project\)/);
});

test('framework applicability stays inside its framework card and is conditionally synchronized', () => {
  for (const framework of ['gdpr', 'hipaa', 'pci-dss', 'local']) {
    assert.match(html, new RegExp(`data-framework-input="${framework}"`));
  }
  assert.match(app, /querySelector\('\[data-framework-input\]'\).*classList\.toggle\('hidden', !input\.checked\)/);
  assert.match(css, /#securitySection \.security-framework-grid \{ grid-template-columns: repeat\(3, minmax\(0, 1fr\)\)/);
});

test('advanced evidence and crawl limit are collapsed by default with a live summary', () => {
  assert.match(html, /<details id="securityAdvancedOptions" class="security-advanced-options">/);
  assert.doesNotMatch(html, /<details id="securityAdvancedOptions"[^>]*\sopen/);
  assert.match(html, /id="securityMaxPages"[^>]*value="10"/);
  assert.match(html, /id="securityAdvancedSummary">Crawl limit: 10 pages · Authenticated: Off/);
  assert.match(app, /Authenticated:.*Consent scenarios:.*ZAP:/);
});

test('successful assessments collapse configuration and expose keyboard-accessible result anchors', () => {
  assert.match(app, /setSecurityConfigurationCollapsed\(true, result\)/);
  assert.match(app, /data-security-edit-config/);
  assert.match(app, /data-security-run-again/);
  for (const id of ['securityOverview', 'securityScope', 'securityEvidence', 'securityFindings', 'securityMappings', 'securityCrawl', 'securityReview']) {
    assert.match(app, new RegExp(`href="#${id}"`));
    assert.match(app, new RegExp(`id="${id}"`));
  }
  assert.match(html, /<nav|aria-label="Compliance mapping workflow"/);
});

test('coverage, framework evidence, GDPR matrix, review forms, and crawl failures use progressive disclosure', () => {
  assert.match(app, /<details class="security-summary-details"><summary><div><strong>Coverage limitations/);
  assert.match(app, /<details class="security-inline-details"><summary>View evidence/);
  assert.match(app, /<details class="security-evidence-card security-gdpr-matrix">/);
  assert.match(app, /<details class="security-inline-details security-review-panel">/);
  assert.match(app, /<details class="security-summary-details security-crawl-failures">/);
  assert.doesNotMatch(app, /security-reviewer-name/);
});

test('workspace presents coverage and source density as traceable provenance', () => {
  assert.match(app, /<strong>Traceability<\/strong>/);
  assert.match(app, /provenance breadth, not assurance strength/);
  assert.match(app, /coverageQualifiers/);
  assert.match(app, /finding\.evidenceConfidence \|\| evidence\.evidenceConfidence \|\| evidence\.confidence/);
  assert.doesNotMatch(app, /confidence score|mapping score|readiness percentage|partially compliant/i);
});

test('workspace presents canonical relationship, applicability, and manual-review guidance', () => {
  assert.match(app, /result\.relationshipDefinitions/);
  assert.match(app, /Mapping relationships/);
  assert.match(app, /result\.relationshipDisclaimer/);
  assert.match(app, /selectionLabel/);
  assert.match(app, /applicabilityLabel/);
  assert.match(app, /manualReviewReasons/);
  assert.match(app, /Human review required/);
  assert.match(app, /ISO\/IEC 27001/);
});

test('finding filters are display-only, reset with each rendered result, and keep findings one-column', () => {
  for (const id of ['securityFindingSearch', 'securityFindingSeverity', 'securityFindingCategory', 'securityFindingReview', 'securityFindingFramework']) {
    assert.match(app, new RegExp(`id="${id}"`));
  }
  assert.match(app, /function applySecurityFindingFilters\(\)/);
  assert.match(app, /card\.classList\.toggle\('hidden', !matches\)/);
  assert.match(app, /refs\.securityResults\.innerHTML =/);
  assert.match(css, /#securitySection \.security-findings \{ display: grid; grid-template-columns: minmax\(0,1fr\)/);
});

test('workspace exports preserve report PDF semantics and show only available artifacts', () => {
  assert.match(app, /\[result\.pdfHref, 'Download PDF'/);
  assert.match(app, /primaryDownloads.*filter\(\(\[href\]\) => Boolean\(href\)\)/);
  assert.match(app, /\[result\.csvHref, 'Findings CSV'/);
  assert.match(app, /More Exports/);
  assert.doesNotMatch(app, /workspace.*pdf|screenshot.*pdf/i);
});

test('Compliance layout rules are scoped and cover desktop, tablet, and mobile breakpoints', () => {
  assert.match(css, /#securitySection \.security-setup-grid \{ display: grid; grid-template-columns: minmax\(0, 1fr\) 300px/);
  assert.match(css, /@media \(max-width: 1000px\)[\s\S]*?#securitySection \.security-setup-grid/);
  assert.match(css, /@media \(max-width: 768px\)[\s\S]*?#securitySection \.security-score-grid/);
  assert.match(css, /@media \(max-width: 600px\)[\s\S]*?#securitySection \.security-framework-grid/);
  assert.match(css, /overflow-wrap: anywhere/);
  const workspaceBlock = css.slice(css.indexOf('Compliance Mapping workspace refinement'));
  assert.doesNotMatch(workspaceBlock, /\n\.(?:asset|layout-grid|page-section|nav-item)[^{]*\{/);
});
