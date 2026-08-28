import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { AssetReportManager } from '../lib/asset-report-manager.js';
import { buildLanguagePath } from '../lib/lighthouse-runner.js';
import { buildControlEvaluations, buildFindings } from '../lib/security-finding-model.js';
import { EPRIVACY_ARTICLE_5_3_SOURCE, MAPPING_CATALOG_VERSION, SECURITY_MAPPING_REGISTRY } from '../lib/security-mapping-registry.js';
import { SecurityReportManager, writeEvidenceArchive } from '../lib/security-report-manager.js';
import { buildComplianceHtml } from '../lib/security-report-html.js';
import { aggregateGdprPublicNoticeState, analyzePaymentFlowEvidence, analyzeReferrerPolicy, buildOperatorScopeEvidence, cookieChecks, detectPrivacyPolicySignal, extractLinkedEvidencePages, frameworkEvidenceSummary, normalizeConsentTestingConfig } from '../lib/security-scanner.js';
import { TOOL_VERSION } from '../lib/tool-version.js';
import { analyzePolicyDocumentQuality, buildGdprPublicNoticeMatrix, extractComplianceEvidence, resolveDocumentCandidate } from '../lib/website-crawler.js';
import { requestOnce } from '../lib/http-client.js';
import { contentTypeForFile } from '../lib/mime-types.js';

const observedAt = '2026-08-24T10:00:00.000Z';

function check(id, status = 'warning', extra = {}) {
  return { id, title: id, category: 'Test', status, severity: status === 'fail' ? 'high' : status === 'warning' ? 'low' : 'informational', testState: 'confirmed', confidence: 'confirmed', affectedUrl: 'https://example.test/', limitations: [], references: [], ...extra };
}

function findingsAndControls(checks, frameworks, frameworkApplicability, options = {}) {
  const findings = buildFindings(checks, { generatedAt: observedAt, toolVersion: TOOL_VERSION, frameworks, frameworkApplicability, ...options });
  const controls = buildControlEvaluations(checks, findings, frameworks, { frameworkApplicability, evidenceLevel: 'public_url', ...options });
  return { findings, controls };
}

test('mapping registry records the conservative header relationships and catalog provenance', () => {
  assert.match(MAPPING_CATALOG_VERSION, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
  const hstsPci = SECURITY_MAPPING_REGISTRY.find((item) => item.checkId === 'hsts' && item.controlId === 'PCI-DSS-v4.0.1-4.2.1');
  const cspIso = SECURITY_MAPPING_REGISTRY.find((item) => item.checkId === 'csp' && item.controlId === 'ISO27001:2022-A.8.28');
  const clickPci = SECURITY_MAPPING_REGISTRY.find((item) => item.checkId === 'clickjacking' && item.controlId === 'PCI-DSS-v4.0.1-6.2.4');
  const eprivacy = SECURITY_MAPPING_REGISTRY.find((item) => item.checkId === 'consent-behavior' && item.controlId === 'EPRIVACY-DIR-2002-58-ART-5(3)');
  const cspSoc = SECURITY_MAPPING_REGISTRY.find((item) => item.checkId === 'csp' && item.framework === 'soc-2');
  assert.equal(hstsPci.relationship, 'contextual');
  assert.deepEqual(hstsPci.prerequisites, ['pci_scope_confirmed_or_potential', 'tested_origin_participates_in_payment_flow']);
  assert.equal(cspIso.relationship, 'contextual');
  assert.equal(clickPci.relationship, 'contextual');
  assert.equal(eprivacy.framework, 'eprivacy');
  assert.equal(eprivacy.frameworkVersion, 'Directive 2002/58/EC as amended by Directive 2009/136/EC');
  assert.equal(eprivacy.relationship, 'supporting');
  assert.equal(eprivacy.sourceCitation, EPRIVACY_ARTICLE_5_3_SOURCE);
  assert.ok(eprivacy.aliases.includes('GDPR-EPRIVACY-ART-5(3)'));
  assert.equal(cspSoc.relationship, 'contextual');
  assert.ok(SECURITY_MAPPING_REGISTRY.every((item) => item.mappingVersion === MAPPING_CATALOG_VERSION));
});

test('contextual mappings never become strong adverse control evidence', () => {
  const checks = [check('hsts')];
  const { controls } = findingsAndControls(checks, ['pci-dss'], { 'pci-dss': 'potentially_applicable' }, { paymentFlow: { testedOriginParticipatesInPaymentFlow: true } });
  assert.equal(controls.length, 1);
  assert.equal(controls[0].state, 'contextual_evidence_observed');
  assert.equal(controls[0].controlSatisfaction, 'not_determined');
  assert.equal(controls[0].coverage, 'partial');
});

test('direct mapping can produce adverse technical evidence without a control-failure conclusion', () => {
  const checks = [check('https', 'fail')];
  const { controls } = findingsAndControls(checks, ['iso-27001'], { 'iso-27001': 'selected_for_mapping' });
  assert.equal(controls[0].state, 'adverse_technical_evidence_observed');
  assert.equal(controls[0].controlSatisfaction, 'not_determined');
  assert.equal(controls[0].manualReviewRequired, true);
});

test('unknown mapping prerequisites preserve evidence but prevent elevation', () => {
  const checks = [check('https', 'fail')];
  const { findings, controls } = findingsAndControls(checks, ['pci-dss'], { 'pci-dss': 'potentially_applicable' }, { paymentFlow: { testedOriginParticipatesInPaymentFlow: null } });
  assert.equal(findings.length, 1);
  assert.equal(controls[0].state, 'manual_review_required');
  const prerequisite = controls[0].mappings[0].prerequisiteResults.find((item) => item.prerequisite === 'tested_origin_participates_in_payment_flow');
  assert.equal(prerequisite.state, 'unknown');
});

test('unknown applicability remains unresolved and local-law mappings require explicit jurisdiction input', () => {
  const checks = [check('https', 'fail')];
  const withoutJurisdiction = findingsAndControls(checks, ['local'], { local: 'requires_input' });
  assert.equal(withoutJurisdiction.findings[0].controls.length, 0);
  assert.equal(withoutJurisdiction.controls.length, 0);
  const gdpr = frameworkEvidenceSummary('gdpr', { checks: [], crawl: null, jurisdiction: '', frameworkApplicability: { gdpr: 'unknown' } });
  assert.equal(gdpr.applicability, 'requires_scope_confirmation');
  assert.equal(gdpr.controlSatisfaction, 'not_determined');
});

test('operator scope assertions remain classified manual evidence instead of automated applicability proof', () => {
  const evidence = buildOperatorScopeEvidence({ frameworkApplicability: { gdpr: 'applicable' }, jurisdiction: 'Egypt', sourceUrl: 'https://e.test/', observedAt });
  assert.deepEqual(evidence.map((item) => item.evidenceType), ['operator_scope_input', 'operator_scope_input']);
  assert.ok(evidence.every((item) => item.evidenceStrength === 'manual_evidence'));
  assert.ok(evidence.every((item) => item.confidence === 'asserted_not_verified'));
  assert.equal(evidence[0].state, 'applicable');
  assert.equal(evidence[1].jurisdiction, 'Egypt');
});

test('public evidence projections remain framework-isolated and statement refs resolve exactly', () => {
  const page = { found: true, groups: ['privacy', 'security'], finalUrl: 'https://example.test/privacy', title: 'Privacy', detectedLocale: 'en', collectedAt: observedAt, html: '<p>You have the right to access and delete your personal data. Our service providers act as processors. We use TLS 1.3 encryption in transit.</p>' };
  const crawl = extractComplianceEvidence([page]);
  const gdpr = frameworkEvidenceSummary('gdpr', { checks: [], crawl, jurisdiction: '', frameworkApplicability: { gdpr: 'unknown' } });
  const hipaa = frameworkEvidenceSummary('hipaa', { checks: [], crawl, jurisdiction: '', frameworkApplicability: { hipaa: 'unknown' } });
  const pci = frameworkEvidenceSummary('pci-dss', { checks: [], crawl, jurisdiction: '', frameworkApplicability: { 'pci-dss': 'unknown' } });
  const soc = frameworkEvidenceSummary('soc-2', { checks: [], crawl, jurisdiction: '', frameworkApplicability: { 'soc-2': 'unknown' } });
  assert.ok(gdpr.evidenceItems.some((item) => item.key === 'dataSubjectRights'));
  assert.equal(hipaa.evidenceItems.some((item) => item.key === 'dataSubjectRights'), false);
  assert.equal(pci.evidenceItems.some((item) => item.key === 'subprocessors'), false);
  assert.equal(soc.evidenceItems.some((item) => item.key === 'dataSubjectRights'), false);
  for (const statement of [...gdpr.evidenceStatements, ...soc.evidenceStatements]) {
    assert.ok(statement.evidenceRefs.every((ref) => statement.sourceUrls.includes(crawl.evidenceItems.find((item) => item.evidenceId === ref)?.sourceUrl)));
  }
  const technical = frameworkEvidenceSummary('soc-2', { checks: [check('https', 'pass', { frameworks: ['soc-2'] })], crawl, jurisdiction: '', frameworkApplicability: { 'soc-2': 'unknown' } });
  assert.ok(technical.technicalEvidenceStatements.every((statement) => statement.evidenceRefs.every((ref) => technical.statementTraceability.includes(statement) && ref.startsWith('check:'))));
});

test('policy document quality distinguishes substantive, template, placeholder, minimal, empty, rendered-only, and Arabic draft pages', () => {
  const pages = [
    { found: true, groups: ['privacy'], finalUrl: 'https://e.test/real', html: `<h1>Privacy</h1><p>${'We explain how personal data is collected, used, retained, secured, and how individuals can exercise their rights. '.repeat(4)}</p>` },
    { found: true, groups: ['terms'], finalUrl: 'https://e.test/template', html: '<h1>Terms</h1><p>You should update this document before publication.</p>' },
    { found: true, groups: ['privacy'], finalUrl: 'https://e.test/placeholder', html: '<h1>Privacy</h1><p>Optional subtitle goes here</p>' },
    { found: true, groups: ['privacy'], finalUrl: 'https://e.test/minimal', html: '<p>We value privacy.</p>' },
    { found: true, groups: ['privacy'], finalUrl: 'https://e.test/empty', html: '' },
    { found: true, groups: ['privacy'], finalUrl: 'https://e.test/rendered', html: '<script>document.body.textContent = "Privacy"</script>' },
    { found: true, groups: ['privacy'], finalUrl: 'https://e.test/ar', html: '<html lang="ar"><p>هذه مسودة قيد المراجعة لسياسة الخصوصية.</p></html>' }
  ];
  const byUrl = Object.fromEntries(analyzePolicyDocumentQuality(pages).map((item) => [item.sourceUrl, item]));
  assert.equal(byUrl['https://e.test/real'].policyDocumentQuality, 'substantive');
  assert.equal(byUrl['https://e.test/template'].policyDocumentQuality, 'template_or_placeholder_detected');
  assert.equal(byUrl['https://e.test/placeholder'].policyDocumentQuality, 'template_or_placeholder_detected');
  assert.equal(byUrl['https://e.test/minimal'].policyDocumentQuality, 'insufficient_content');
  assert.equal(byUrl['https://e.test/empty'].policyDocumentQuality, 'insufficient_content');
  assert.equal(byUrl['https://e.test/rendered'].policyDocumentQuality, 'failed_to_extract');
  assert.equal(byUrl['https://e.test/ar'].policyDocumentQuality, 'likely_draft');
  assert.ok(byUrl['https://e.test/template'].excerpt.length < 260);
});

test('locale coverage records Arabic/English policy coverage without treating differences as violations', () => {
  const evidence = extractComplianceEvidence([
    { found: true, groups: ['privacy'], finalUrl: 'https://e.test/en/privacy', detectedLocale: 'en', html: '<html lang="en"><p>You have the right to access and delete personal data. We retain data for 90 days.</p></html>' },
    { found: true, groups: ['privacy'], finalUrl: 'https://e.test/ar/privacy', detectedLocale: 'ar', html: '<html lang="ar"><p>سياسة الخصوصية. لديك الحق في الوصول إلى بياناتك.</p></html>' }
  ]);
  assert.deepEqual(evidence.availableLocales, ['ar', 'en']);
  assert.deepEqual(evidence.policyLocalesTested, ['ar', 'en']);
  assert.equal(evidence.localeCoverage, 'potential_locale_content_difference');
  assert.equal(evidence.localeParity, 'potential_locale_content_difference');
});

test('browser language signals do not become discoverable content locales', () => {
  const evidence = extractComplianceEvidence([{
    found: true,
    groups: ['homepage'],
    source: 'initial-page',
    finalUrl: 'https://e.test/',
    detectedLocale: 'en-US',
    languageSignals: ['en', 'en-US'],
    html: '<html lang="en"><p>Welcome</p></html>'
  }]);
  assert.deepEqual(evidence.languageSignals, ['en', 'en-US']);
  assert.deepEqual(evidence.contentLocalesDiscovered, []);
  assert.deepEqual(evidence.availableLocales, []);
  assert.deepEqual(evidence.policyLocalesTested, []);
  assert.equal(evidence.localeCoverage, 'locale_parity_not_assessed');
});

test('fragment and pseudo privacy links remain signals but are not documents', () => {
  const baseUrl = 'https://example.test/en';
  const html = '<a href="#">Privacy Policy</a><a href="javascript:void(0)" aria-label="Privacy">Privacy</a><a href="/en#privacy">Privacy details</a>';
  assert.equal(detectPrivacyPolicySignal(html), true);
  assert.deepEqual(extractLinkedEvidencePages({}, html, baseUrl).privacy, []);
  assert.equal(resolveDocumentCandidate('#privacy', baseUrl), '');
  assert.equal(resolveDocumentCandidate('https://example.test/en#', baseUrl), '');
  assert.equal(resolveDocumentCandidate('javascript:void(0)', baseUrl), '');
  assert.equal(resolveDocumentCandidate('/privacy#rights', baseUrl), 'https://example.test/privacy');
});

test('identical evidence binaries become one artifact with multiple provenance roles', (t) => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'evidence-content-dedupe-'));
  t.after(() => fs.rmSync(root, { recursive: true, force: true }));
  const screenshotBase64 = Buffer.from('deterministic-identical-image-content').toString('base64');
  const manifest = writeEvidenceArchive(root, {
    metadata: { finalUrl: 'https://example.test/' },
    browser: { screenshotBase64, consentScenarios: [{ scenario: 'fresh_load', screenshotBase64 }] }
  });
  const screenshots = manifest.artifacts.filter((artifact) => artifact.type === 'image/png');
  assert.equal(screenshots.length, 1);
  assert.deepEqual(screenshots[0].roles, ['consent-scenario-screenshot-1', 'browser-screenshot']);
  assert.equal(screenshots[0].aliases[0].id, 'browser-screenshot');
  assert.equal(manifest.artifactCount, manifest.artifacts.length);
  assert.equal(fs.existsSync(path.join(root, 'evidence/browser/consent-scenario-1.png')), true);
  assert.equal(fs.existsSync(path.join(root, 'evidence/browser/page.png')), false);
});

test('GDPR public-notice matrix handles positive, negative, negated, ambiguous, English, and Arabic wording conservatively', () => {
  const positive = buildGdprPublicNoticeMatrix([{ found: true, groups: ['privacy'], finalUrl: 'https://e.test/en', detectedLocale: 'en', collectedAt: observedAt, html: '<p>Our legal basis is performance of a contract. You have the right to access and erasure. We retain account data for 90 days. You may withdraw your consent. You may lodge a complaint with the supervisory authority. Our processors receive limited data. International transfers use standard contractual clauses.</p>' }]);
  assert.equal(positive.find((item) => item.element === 'legal_bases').state, 'observed');
  assert.equal(positive.find((item) => item.element === 'retention_periods').state, 'observed');
  assert.equal(positive.find((item) => item.element === 'right_to_complain').state, 'observed');
  assert.equal(positive.find((item) => item.element === 'international_transfers').state, 'observed');
  const negative = buildGdprPublicNoticeMatrix([{ found: true, groups: ['privacy'], finalUrl: 'https://e.test/negative', html: '<p>This page describes our products and office opening times.</p>' }]);
  assert.equal(negative.find((item) => item.element === 'legal_bases').state, 'not_observed');
  const negated = buildGdprPublicNoticeMatrix([{ found: true, groups: ['privacy'], finalUrl: 'https://e.test/negated', html: '<p>We do not state a legal basis in this page.</p>' }]);
  assert.equal(negated.find((item) => item.element === 'legal_bases').state, 'not_observed');
  const ambiguous = buildGdprPublicNoticeMatrix([{ found: true, groups: ['privacy'], finalUrl: 'https://e.test/ambiguous', html: '<p>Where applicable, we may rely on legitimate interests.</p>' }]);
  assert.equal(ambiguous.find((item) => item.element === 'legal_bases').state, 'partially_observed');
  const arabic = buildGdprPublicNoticeMatrix([{ found: true, groups: ['privacy'], finalUrl: 'https://e.test/ar', detectedLocale: 'ar', html: '<html lang="ar"><p>يمكنك سحب موافقتك ولدينا مسؤول حماية البيانات. نحتفظ بالبيانات لمدة 90 يوماً. لديك الحق في تقديم شكوى.</p></html>' }]);
  assert.equal(arabic.find((item) => item.element === 'withdrawal_of_consent').state, 'observed');
  assert.equal(arabic.find((item) => item.element === 'dpo_contact').state, 'observed');
  assert.ok(arabic.filter((item) => item.state === 'observed').every((item) => item.evidenceItems[0].sourceUrl === 'https://e.test/ar'));
});

test('GDPR public-notice aggregation preserves not assessed, not observed, failed, and partial states', () => {
  assert.equal(aggregateGdprPublicNoticeState([{ state: 'not_assessed' }, { state: 'not_assessed' }]), 'not_assessed');
  assert.equal(aggregateGdprPublicNoticeState([{ state: 'not_observed' }, { state: 'not_assessed' }]), 'no_public_evidence_observed');
  assert.equal(aggregateGdprPublicNoticeState([{ state: 'failed_to_assess' }, { state: 'not_assessed' }]), 'failed_to_assess');
  assert.equal(aggregateGdprPublicNoticeState([{ state: 'partially_observed' }, { state: 'not_assessed' }]), 'partial_evidence');
  const allUnassessed = buildGdprPublicNoticeMatrix([]);
  assert.ok(allUnassessed.every((item) => item.state === 'not_assessed'));
  assert.equal(aggregateGdprPublicNoticeState(allUnassessed), 'not_assessed');
  const failed = buildGdprPublicNoticeMatrix([{ found: true, groups: ['privacy'], finalUrl: 'https://e.test/privacy', html: '', error: 'Extraction failed' }]);
  assert.ok(failed.every((item) => item.state === 'failed_to_assess'));
  assert.equal(aggregateGdprPublicNoticeState(failed), 'failed_to_assess');
});

test('cookie findings separate explicit SameSite configuration from effective Lax behavior and cookie purpose', () => {
  const raw = cookieChecks(['session_id=secret; Secure; HttpOnly', 'prefs=x; Secure; SameSite=Strict', '_ga=x; SameSite=None', 'other=x'], [{ name: 'session_id', sameSite: 'Lax' }]);
  const session = raw.instances.find((item) => item.name === 'session_id');
  assert.equal(session.configuredSameSite, null);
  assert.equal(session.effectiveSameSiteObserved, 'Lax');
  const findings = buildFindings([{ ...raw, affectedUrl: 'https://example.test/', testState: 'confirmed', confidence: 'confirmed', references: [], limitations: [] }], { generatedAt: observedAt, toolVersion: TOOL_VERSION, frameworks: [] });
  assert.equal(findings.find((item) => item.id === 'COOKIE_SESSION_SAMESITE_MISSING').severity, 'low');
  assert.equal(findings.find((item) => item.id === 'COOKIE_SESSION_SAMESITE_MISSING').evidence.effectiveSameSiteObserved, 'Lax');
  assert.equal(raw.instances.some((item) => item.name === 'prefs'), false);
  assert.equal(raw.instances.find((item) => item.name === '_ga').category, 'tracking-analytics');
  assert.equal(raw.instances.find((item) => item.name === 'other').category, 'unclassified');
});

test('missing Referrer-Policy is retained as a low-impact technical observation', () => {
  assert.equal(analyzeReferrerPolicy('').status, 'warning');
  assert.match(analyzeReferrerPolicy('').issue, /missing/i);
});

test('payment-flow model distinguishes no signal, generic wording, redirect, iframe, hosted fields, merchant form, and card wording', () => {
  const page = (html) => [{ found: true, finalUrl: 'https://shop.test/checkout', groups: ['homepage'], html }];
  assert.equal(analyzePaymentFlowEvidence({ pages: page('<p>Welcome</p>'), testedOrigin: 'https://shop.test/' }).paymentFlowObserved, false);
  assert.equal(analyzePaymentFlowEvidence({ pages: page('<p>Payment options are available.</p>'), testedOrigin: 'https://shop.test/' }).architecture, 'unknown');
  const unrelatedFirstParty = analyzePaymentFlowEvidence({ pages: [{ found: true, finalUrl: 'https://shop.test/', groups: ['homepage'], html: '<p>Pay with cards at checkout.</p><script src="/assets/application.js"></script>' }], testedOrigin: 'https://shop.test/' });
  assert.equal(unrelatedFirstParty.merchantManagedScriptsObserved, false);
  assert.equal(unrelatedFirstParty.testedOriginParticipatesInPaymentFlow, null);
  const paymentScript = analyzePaymentFlowEvidence({ pages: [{ found: true, finalUrl: 'https://shop.test/', groups: ['homepage'], html: '<script src="/assets/payment-checkout.js"></script>' }], testedOrigin: 'https://shop.test/' });
  assert.equal(paymentScript.merchantManagedScriptsObserved, true);
  assert.equal(paymentScript.cardDataHandling, 'not_determined');
  assert.equal(analyzePaymentFlowEvidence({ pages: page('<a href="https://checkout.stripe.com/pay/abc">Checkout</a>'), testedOrigin: 'https://shop.test/' }).architecture, 'redirect');
  assert.equal(analyzePaymentFlowEvidence({ pages: page('<iframe src="https://checkout.stripe.com/frame"></iframe>'), testedOrigin: 'https://shop.test/' }).architecture, 'iframe');
  assert.equal(analyzePaymentFlowEvidence({ pages: page('<script src="https://js.stripe.com/v3/elements.js"></script>'), testedOrigin: 'https://shop.test/' }).architecture, 'hosted_fields');
  const merchant = analyzePaymentFlowEvidence({ pages: page('<form action="/pay"><input name="card_number"><input name="cvv"></form>'), testedOrigin: 'https://shop.test/' });
  assert.equal(merchant.architecture, 'merchant_form');
  assert.equal(merchant.cardDataHandling, 'not_determined');
  assert.equal(merchant.pciScopeConclusion, 'requires_scope_confirmation');
  const cardSignal = analyzePaymentFlowEvidence({ pages: page('<p>Enter your card number and CVV.</p>'), testedOrigin: 'https://shop.test/', observedAt });
  assert.equal(cardSignal.cardTerminologyObserved, true);
  const pci = frameworkEvidenceSummary('pci-dss', { checks: [], crawl: null, jurisdiction: '', frameworkApplicability: { 'pci-dss': 'unknown' }, paymentFlow: cardSignal });
  assert.equal(pci.applicability, 'potentially_applicable');
  assert.equal(pci.evidenceStatements[0].evidenceRefs[0], cardSignal.evidenceItems[0].evidenceId);
  assert.equal(pci.evidenceStatements[0].sourceUrls[0], 'https://shop.test/checkout');
  assert.equal(cardSignal.evidenceItems[0].testedOrigin, 'https://shop.test');
});

test('consent scenarios are basic by default and bounded when explicitly enabled', () => {
  assert.deepEqual(normalizeConsentTestingConfig({}).scenarios, ['fresh_load']);
  const advanced = normalizeConsentTestingConfig({ mode: 'advanced', scenarios: ['accept', 'reject', 'withdraw', 'unknown', 'accept'], localeUrls: ['https://e.test/ar', 'https://e.test/en', 'https://e.test/fr'] });
  assert.deepEqual(advanced.scenarios, ['fresh_load', 'accept', 'reject', 'withdraw']);
  assert.equal(advanced.localeUrls.length, 2);
});

test('package version is the HTTP scanner User-Agent provenance source', async (t) => {
  let userAgent = '';
  const server = http.createServer((req, res) => { userAgent = req.headers['user-agent'] || ''; res.writeHead(200, { 'Content-Type': 'text/plain' }); res.end('ok'); });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  await requestOnce(`http://127.0.0.1:${server.address().port}/`);
  assert.equal(TOOL_VERSION, '1.7.1');
  assert.equal(userAgent, `Web-Engineering-Toolkit-Security-Scanner/${TOOL_VERSION}`);
});

test('report download content types include native PDF without changing other exports', () => {
  assert.equal(contentTypeForFile('summary.pdf'), 'application/pdf');
  assert.equal(contentTypeForFile('summary.html'), 'text/html; charset=utf-8');
  assert.equal(contentTypeForFile('findings.csv'), 'text/csv; charset=utf-8');
  assert.equal(contentTypeForFile('summary.xlsx'), 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
});

test('Compliance HTML report uses responsive report-only navigation and readable layouts', () => {
  const html = buildComplianceHtml({
    projectName: 'Style Fixture',
    requestedUrl: 'https://example.test/',
    finalUrl: 'https://example.test/',
    generatedAt: observedAt,
    counts: { checks: 1, observations: 1 },
    checks: [],
    testResults: [{ state: 'observed' }],
    findings: [{ id: 'STYLE_FIXTURE', fingerprint: 'a'.repeat(64), title: 'Style fixture', severity: 'medium', confidence: 'observed', category: 'Test', affectedUrl: 'https://example.test/', description: 'Observed.', recommendation: 'Review.', limitations: [], controlMappings: [] }],
    frameworkResults: [{ id: 'iso-27001', label: 'ISO 27001', evidenceStatements: [] }],
    controlEvaluations: [],
    policyDocumentQuality: [],
    localeCoverage: { state: 'locale_parity_not_assessed', availableLocales: [], policyLocalesTested: [] },
    paymentFlow: {},
    gdprPublicNoticeMatrix: [],
    evidenceManifest: { artifacts: [] },
    workflow: { findingDecisions: [] }
  });

  assert.match(html, /<nav class="report-nav screen-only" aria-label="Report sections">/);
  for (const id of ['overview', 'scope', 'quality', 'evidence', 'observations', 'findings', 'mappings', 'integrity', 'review']) {
    assert.match(html, new RegExp(`id="${id}"`));
  }
  assert.match(html, /\.cards\{grid-template-columns:repeat\(3,minmax\(0,1fr\)\)\}/);
  assert.match(html, /\.mapping-card>summary span,\.mapping-card>summary span:nth-child\(4\)\{grid-column:1\}/);
  assert.match(html, /\.cards\{grid-template-columns:repeat\(2,minmax\(0,1fr\)\)\}\.structured-grid/);
  assert.match(html, /class="finding-card severity-warning"/);
  assert.doesNotMatch(html, /class="mapping-card avoid-break"|print-section-break/);
  assert.match(html, /\.mapping-card\{break-inside:auto;page-break-inside:auto\}/);
  assert.match(html, /\.mapping-card>summary\{[^}]*break-inside:avoid;break-after:avoid/);
  assert.match(html, /\.finding-tail\{break-inside:avoid;break-before:avoid\}/);
  assert.match(html, /:root\{color-scheme:light;background:#fff\}/);
  assert.match(html, /data-report-review-workspace/);
  assert.match(html, /data-report-review-finding data-fingerprint="a{64}"/);
  assert.match(html, /<option value="legal_reviewer">Legal reviewer<\/option>/);
  assert.match(html, /name="scopeDecision"/);
  assert.match(html, /name="mappingDecision"/);
  assert.match(html, /\/api\/security\/findings\/' \+ encodeURIComponent\(control\.dataset\.fingerprint\) \+ '\/reviews'/);
  assert.match(html, /method: reviewId \? 'PUT' : 'POST'/);
  assert.match(html, /class="report-review-list"/);
  assert.match(html, /Add reviewer decision/);
  assert.match(html, /Edit reviewer decision/);
  assert.doesNotMatch(html, /localStorage|sessionStorage/);
  assert.match(html, /Compliance conclusion: <strong>Not determined<\/strong>/);
  assert.match(html, /Coverage: <strong>Partial<\/strong>/);
});

test('Compliance report uses compact GDPR print output, evidence terminology, and exact machine text', () => {
  const unsafeUrl = 'https://elmoosa-\u00adpre.odoo.com/en?campaign=long-query-value';
  const exactUrl = 'https://elmoosa-pre.odoo.com/en?campaign=long-query-value';
  const hash = 'a'.repeat(64);
  const matrix = ['controller_identity', 'controller_contact', 'dpo_contact'].map((element) => ({ element, state: 'not_assessed', confidence: 'not_assessed', evidenceItems: [] }));
  const html = buildComplianceHtml({
    projectName: 'Report Semantics', requestedUrl: unsafeUrl, finalUrl: unsafeUrl, generatedAt: observedAt,
    assessmentType: 'compliance_pre_assessment', complianceConclusion: 'not_determined', coverage: 'partial',
    counts: { checks: 1, observations: 1 },
    checks: [{ id: 'privacy', title: 'Privacy policy signal', category: 'Privacy & transparency', status: 'pass', summary: 'Signal observed.', limitations: [] }, { id: 'evidence-privacy-page', title: 'Privacy policy page discovered', category: 'Compliance evidence', status: 'pass', summary: 'Fragment treated as a document by a legacy scan.', limitations: [] }],
    testResults: [{ state: 'observed' }],
    findings: [{ id: 'G-3FKJ4RP8QB', fingerprint: 'b'.repeat(64), title: 'Machine text', severity: 'low', confidence: 'observed', category: 'Test', affectedUrl: unsafeUrl, description: 'strict-origin-when-cross-origin', evidence: { raw: 'G-3FKJ4RP8QB' }, recommendation: 'Review.', limitations: [], controlMappings: [] }],
    frameworkResults: [],
    controlEvaluations: [{ controlId: 'GDPR-EPRIVACY-ART-5(3)', state: 'contextual_evidence_observed', controlSatisfaction: 'not_determined', linkedFindings: ['G-3FKJ4RP8QB'], automatedEvidence: [{ checkId: 'consent-behavior', evidenceState: 'contextual_evidence_observed' }], limitations: [], mappings: [{ framework: 'gdpr', controlId: 'GDPR-EPRIVACY-ART-5(3)', relationship: 'direct', sourceCitation: 'https://eur-lex.europa.eu/eli/reg/2016/679/oj', prerequisiteResults: [] }] }],
    policyDocumentQuality: [{ sourceUrl: 'https://example.test/terms', policyDocumentQuality: 'substantive', detectedLocale: 'en' }],
    localeCoverage: { state: 'partial_locale_coverage', availableLocales: ['en', 'en-US'], policyLocalesTested: ['en'] },
    crawl: { pagesFoundByGroup: { privacy: [`${unsafeUrl}#privacy`] }, linkedEvidence: { privacy: ['#'] }, pages: [{ url: unsafeUrl, found: true, groups: [] }, { url: 'https://elmoosa-pre.odoo.com/en/terms', found: true, groups: ['terms'] }] },
    paymentFlow: {}, gdprPublicNoticeMatrix: matrix, evidenceManifest: { artifacts: [{ id: 'browser-screenshot', type: 'image/png', bytes: 123, sha256: hash, sensitive: true }, { id: 'consent-scenario-screenshot-1', type: 'image/png', bytes: 123, sha256: hash, sensitive: true }] }, workflow: { findingDecisions: [] }
  });
  assert.match(html, /gdpr-compact-print print-only/);
  assert.match(html, /notice-grid print-hide/);
  assert.match(html, /Evidence pages crawled/);
  assert.match(html, /Element assessment<\/dt><dd>Not performed/);
  assert.doesNotMatch(html, /Pages assessed/);
  assert.match(html, /Privacy policy document<\/strong><span>Not observed<\/span>/);
  assert.match(html, /Privacy policy signal<\/strong><span>Observed<\/span>/);
  assert.match(html, /Detected content locales/);
  assert.match(html, /Language signals/);
  assert.match(html, /Unique artifacts with SHA-256<\/span><strong>1 \/ 1<\/strong>/);
  assert.match(html, /Roles: browser-screenshot, consent-scenario-screenshot-1/);
  assert.doesNotMatch(html, /#privacy/);
  assert.match(html, new RegExp(exactUrl.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')));
  assert.match(html, /strict-origin-when-cross-origin/);
  assert.match(html, /G-3FKJ4RP8QB/);
  assert.match(html, new RegExp(hash));
  assert.match(html, /href="https:\/\/eur-lex\.europa\.eu\/eli\/dir\/2002\/58\/2009-12-19\/eng"/);
  assert.doesNotMatch(html, /[\u00ad\u200b-\u200f\u202a-\u202e\u2060\u2066-\u2069\ufeff\ufffd]/);
  assert.match(html, /Satisfaction<\/small>Not determined/);
});

test('Lighthouse language routing smoke behavior is unchanged', () => {
  assert.equal(buildLanguagePath('/', 'en', 'en'), '/');
  assert.equal(buildLanguagePath('/pricing', 'ar', 'en'), '/ar/pricing');
  assert.equal(buildLanguagePath('https://other.test/page', 'ar', 'en'), 'https://other.test/page');
});

test('Asset report manager smoke test preserves page-weight report identity and projections', async (t) => {
  const reportsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'asset-regression-'));
  t.after(() => fs.rmSync(reportsRoot, { recursive: true, force: true }));
  const breakdown = { document: 1000, script: 0, stylesheet: 0, image: 0, font: 0, media: 0, xhr: 0, fetch: 0, other: 0 };
  const page = { finalUrl: 'https://example.test/', status: 200, device: 'desktop', totalTransferBytes: 1000, requestCount: 1, thirdPartyBytes: 0, breakdown, dom: { domElements: 5, belowFoldImagesWithoutLazy: 0 }, resources: [], findings: [] };
  const result = { projectName: 'Asset Smoke', baseUrl: 'https://example.test/', device: 'desktop', generatedAt: observedAt, browser: { name: 'fixture' }, pages: [page], findings: [], largestAssets: [], summary: { pageCount: 1, averageBytes: 1000, averageRequests: 1, totalBytes: 1000, thirdPartyBytes: 0, breakdown } };
  const saved = await new AssetReportManager({ reportsRoot }).save(result);
  const summary = JSON.parse(fs.readFileSync(path.join(reportsRoot, saved.reportName, 'summary.json'), 'utf8'));
  assert.equal(summary.reportType, 'asset-page-weight');
  assert.equal(summary.overview.pages, 1);
  assert.ok(fs.existsSync(path.join(reportsRoot, saved.reportName, 'summary.xlsx')));
});

test('legacy compliance summaries receive conservative defaults without rewriting historical evidence', async (t) => {
  const reportsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'legacy-report-'));
  t.after(() => fs.rmSync(reportsRoot, { recursive: true, force: true }));
  const reportName = 'legacy_security-compliance_fixture';
  const root = path.join(reportsRoot, reportName);
  fs.mkdirSync(root);
  fs.writeFileSync(path.join(root, 'summary.json'), JSON.stringify({ overview: { reportType: 'security-compliance' }, reportType: 'security-compliance', projectName: 'Legacy', generatedAt: observedAt, requestedUrl: 'https://e.test', finalUrl: 'https://e.test', totals: {}, findings: [], checks: [], testResults: [], controlEvaluations: [{ controlId: 'ISO27001:2022-A.8.24', state: 'manual_review_required' }], frameworkResults: [{ id: 'iso-27001', label: 'ISO 27001' }] }));
  const manager = new SecurityReportManager({ reportsRoot, pdfGenerator: async () => { throw new Error('Fixture PDF failure'); } });
  assert.deepEqual(await manager.refreshWorkflow({ reportName }), [reportName]);
  const migrated = JSON.parse(fs.readFileSync(path.join(root, 'summary.json'), 'utf8'));
  assert.equal(migrated.assessmentType, 'compliance_pre_assessment');
  assert.equal(migrated.complianceConclusion, 'not_determined');
  assert.equal(migrated.controlEvaluations[0].controlSatisfaction, 'not_determined');
  assert.equal(migrated.controlEvaluations[0].coverage, 'partial');
  assert.equal(migrated.mappingCatalogVersion, 'legacy-unversioned');
  assert.equal(migrated.pdfGeneration.status, 'failed');
  assert.match(migrated.pdfGeneration.reason, /Fixture PDF failure/);
  assert.equal(fs.existsSync(path.join(root, 'summary.pdf')), false);
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'report-manifest.json'), 'utf8'));
  assert.equal(manifest.files.some((entry) => entry.file === 'summary.pdf'), false);
});
