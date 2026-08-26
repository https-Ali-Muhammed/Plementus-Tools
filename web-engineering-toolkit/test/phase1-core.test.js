import assert from 'node:assert/strict';
import test from 'node:test';
import { browserSkipCode, classifyBrowserFailure } from '../lib/browser-capability.js';
import { buildControlEvaluations, buildFindings } from '../lib/security-finding-model.js';
import { EPRIVACY_ARTICLE_5_3_SOURCE, MAPPING_CATALOG_VERSION, SECURITY_MAPPING_REGISTRY, evaluateMappingPrerequisites, frameworkForControl } from '../lib/security-mapping-registry.js';
import { analyzePaymentFlowEvidence, assessPrivacyRuntimeConsistency, frameworkEvidenceSummary } from '../lib/security-scanner.js';
import { analyzePolicyDocumentQuality, buildGdprPublicNoticeMatrix, contentLocaleFromRoute, extractComplianceEvidence } from '../lib/website-crawler.js';
import { createComplianceSummary, assertConservativeInvariants, PHASE1_OBSERVED_AT } from './fixtures/compliance-summary-fixture.js';

const requiredMappingFields = ['mappingId', 'checkId', 'framework', 'frameworkVersion', 'controlId', 'relationship', 'evidenceTypes', 'prerequisites', 'limitations', 'reviewStatus', 'mappingVersion'];
const relationships = new Set(['direct', 'supporting', 'contextual', 'scope_signal', 'manual_only']);
const prefixes = { 'iso-27001': 'ISO27001:', gdpr: ['GDPR-', 'EPRIVACY-'], 'soc-2': 'SOC2-', hipaa: 'HIPAA-', 'pci-dss': 'PCI-DSS-', local: 'LOCAL-' };

test('Phase 1 fixture model preserves global conservative invariants', () => {
  assertConservativeInvariants(assert, createComplianceSummary());
});

test('mapping registry has complete, versioned, uniquely identified records', () => {
  assert.match(MAPPING_CATALOG_VERSION, /^\d{4}\.\d{2}\.\d{2}\.\d+$/);
  assert.ok(SECURITY_MAPPING_REGISTRY.length > 0);
  const ids = new Set();
  const exactRecords = new Set();
  for (const mapping of SECURITY_MAPPING_REGISTRY) {
    for (const field of requiredMappingFields) assert.ok(field in mapping, `${mapping.mappingId || mapping.checkId} is missing ${field}`);
    assert.ok(mapping.mappingId && !ids.has(mapping.mappingId), `duplicate mappingId ${mapping.mappingId}`);
    ids.add(mapping.mappingId);
    assert.ok(relationships.has(mapping.relationship), `invalid relationship ${mapping.relationship}`);
    assert.ok(Array.isArray(mapping.evidenceTypes) && mapping.evidenceTypes.length);
    assert.ok(Array.isArray(mapping.prerequisites));
    assert.ok(Array.isArray(mapping.limitations) && mapping.limitations.length);
    assert.equal(mapping.mappingVersion, MAPPING_CATALOG_VERSION);
    assert.equal(frameworkForControl(mapping.controlId), mapping.framework, `control prefix mismatch for ${mapping.controlId}`);
    if (mapping.framework !== 'local') assert.match(mapping.sourceCitation, /^https:\/\//);
    const exact = [mapping.checkId, mapping.framework, mapping.frameworkVersion, mapping.controlId, mapping.relationship, [...mapping.prerequisites].sort().join('|')].join('|');
    assert.equal(exactRecords.has(exact), false, `duplicate exact mapping ${exact}`);
    exactRecords.add(exact);
  }
  const eprivacy = SECURITY_MAPPING_REGISTRY.find((mapping) => mapping.controlId === 'EPRIVACY-DIR-2002-58-ART-5(3)');
  assert.equal(eprivacy.frameworkVersion, 'Directive 2002/58/EC');
  assert.equal(eprivacy.sourceCitation, EPRIVACY_ARTICLE_5_3_SOURCE);
  assert.ok(eprivacy.aliases.includes('GDPR-EPRIVACY-ART-5(3)'));
});

test('mapping prerequisite matrix distinguishes met, unknown, not met, and manual confirmation', () => {
  const evaluate = (prerequisite, context) => evaluateMappingPrerequisites({ framework: prerequisite.startsWith('hipaa') ? 'hipaa' : prerequisite.startsWith('pci') || prerequisite.startsWith('tested') ? 'pci-dss' : prerequisite.startsWith('local') ? 'local' : 'gdpr', prerequisites: [prerequisite] }, context)[0].state;
  assert.equal(evaluate('gdpr_scope_confirmed_or_potential', { frameworkApplicability: { gdpr: 'applicable' } }), 'met');
  assert.equal(evaluate('gdpr_scope_confirmed_or_potential', { frameworkApplicability: { gdpr: 'not_applicable' } }), 'not_met');
  assert.equal(evaluate('gdpr_scope_confirmed_or_potential', { frameworkApplicability: { gdpr: 'unknown' } }), 'requires_manual_confirmation');
  assert.equal(evaluate('gdpr_or_eprivacy_scope_confirmed_or_potential', { frameworkApplicability: { gdpr: 'unknown' } }), 'requires_manual_confirmation');
  assert.equal(evaluate('hipaa_scope_confirmed_or_potential', { frameworkApplicability: { hipaa: 'potentially_applicable' } }), 'met');
  assert.equal(evaluate('pci_scope_confirmed_or_potential', { frameworkApplicability: { 'pci-dss': 'potentially_applicable' } }), 'met');
  assert.equal(evaluate('tested_origin_participates_in_payment_flow', { frameworkApplicability: { 'pci-dss': 'potentially_applicable' }, paymentFlow: { testedOriginParticipatesInPaymentFlow: true } }), 'met');
  assert.equal(evaluate('tested_origin_participates_in_payment_flow', { frameworkApplicability: { 'pci-dss': 'potentially_applicable' }, paymentFlow: { testedOriginParticipatesInPaymentFlow: null } }), 'unknown');
  assert.equal(evaluate('tested_origin_participates_in_payment_flow', { frameworkApplicability: { 'pci-dss': 'potentially_applicable' }, paymentFlow: { testedOriginParticipatesInPaymentFlow: false } }), 'requires_manual_confirmation');
  assert.equal(evaluate('local_jurisdiction_confirmed', { frameworkApplicability: { local: 'selected_for_mapping' }, jurisdiction: 'Egypt' }), 'met');
  assert.equal(evaluate('local_jurisdiction_confirmed', { frameworkApplicability: { local: 'selected_for_mapping' }, jurisdiction: '' }), 'requires_manual_confirmation');
});

test('direct, supporting, and contextual mappings retain distinct evidence states', () => {
  const check = (id) => ({ id, status: 'fail', testState: 'confirmed' });
  const direct = buildControlEvaluations([check('mixed-content')], [], ['iso-27001'], { frameworkApplicability: { 'iso-27001': 'selected_for_mapping' }, evidenceLevel: 'public_url' });
  const supporting = buildControlEvaluations([check('hsts')], [], ['iso-27001'], { frameworkApplicability: { 'iso-27001': 'selected_for_mapping' }, evidenceLevel: 'public_url' });
  const contextual = buildControlEvaluations([check('hsts')], [], ['soc-2'], { frameworkApplicability: { 'soc-2': 'selected_for_mapping' }, evidenceLevel: 'public_url' });
  assert.equal(direct[0].state, 'adverse_technical_evidence_observed');
  assert.equal(supporting[0].state, 'supporting_technical_evidence_observed');
  assert.equal(contextual[0].state, 'contextual_evidence_observed');
  for (const control of [...direct, ...supporting, ...contextual]) {
    assert.equal(control.controlSatisfaction, 'not_determined');
    assert.equal(control.coverage, 'partial');
  }
});

test('controlled payment archetypes remain conservative', () => {
  const pages = (html) => [{ found: true, finalUrl: 'https://shop.test/checkout', groups: ['homepage'], html }];
  const cases = [
    ['generic', '<p>We accept card payments.</p>', 'unknown', false],
    ['redirect', '<a href="https://checkout.stripe.com/pay/fixture">Pay</a>', 'redirect', false],
    ['iframe', '<iframe src="https://checkout.stripe.com/frame"></iframe>', 'iframe', false],
    ['hosted', '<script src="https://js.stripe.com/v3/elements.js"></script>', 'hosted_fields', false],
    ['merchant', '<form action="/pay"><input name="card_number"><input name="cvv"></form>', 'merchant_form', false]
  ];
  for (const [name, html, architecture, managedScript] of cases) {
    const result = analyzePaymentFlowEvidence({ pages: pages(html), testedOrigin: 'https://shop.test/' });
    assert.equal(result.architecture, architecture, name);
    assert.equal(result.cardDataHandling, 'not_determined', name);
    assert.equal(result.merchantManagedScriptsObserved, managedScript, name);
    if (name === 'generic') assert.equal(result.testedOriginParticipatesInPaymentFlow, null);
  }
});

test('controlled healthcare, consent, policy, locale, and Arabic scenarios remain bounded', () => {
  const evidence = (html, groups = ['homepage'], finalUrl = 'https://example.test/') => extractComplianceEvidence([{ found: true, groups, finalUrl, html }]);
  assert.equal(evidence('<p>Healthcare and wellness marketing.</p>').evidenceFound.hipaaApplicability, false);
  assert.equal(evidence('<p>We process protected health information under a BAA.</p>').evidenceFound.hipaaApplicability, true);
  const runtime = assessPrivacyRuntimeConsistency({ consentInterfaceClaim: true, consentInterfaceDetected: false, browserState: 'confirmed', freshContext: true });
  assert.equal(runtime.consentClaimUnverified, true);
  assert.equal(runtime.contradictionObserved, false);

  const policyPages = [
    { finalUrl: 'https://e.test/substantive', found: true, groups: ['privacy'], html: '<h1>Privacy Policy</h1><p>We collect account information to provide services. You may access, correct, or erase personal data. We retain records for 90 days and use processors under contracts.</p>' },
    { finalUrl: 'https://e.test/minimal', found: true, groups: ['privacy'], html: '<p>We respect privacy.</p>' },
    { finalUrl: 'https://e.test/template', found: true, groups: ['privacy'], html: '<h1>Privacy Policy Template</h1><p>This sample policy is an example. Replace this placeholder before publication.</p>' },
    { finalUrl: 'https://e.test/placeholder', found: true, groups: ['privacy'], html: '<p>TODO: add company privacy details.</p>' },
    { finalUrl: 'https://e.test/empty', found: true, groups: ['privacy'], html: '' },
    { finalUrl: 'https://e.test/rendered', found: true, groups: ['privacy'], html: '<main id="root"></main><script>renderPolicy()</script>', renderedText: 'Privacy content rendered by the application.' },
    { finalUrl: 'https://e.test/failed', found: true, groups: ['privacy'], html: '', error: 'extraction failed' }
  ];
  const qualities = analyzePolicyDocumentQuality(policyPages).map((item) => item.policyDocumentQuality);
  for (const expected of ['substantive', 'insufficient_content', 'template_or_placeholder_detected', 'failed_to_extract']) assert.ok(qualities.includes(expected), expected);
  const incidental = analyzePolicyDocumentQuality([{ finalUrl: 'https://e.test/incidental', found: true, groups: ['privacy'], html: '<h1>Privacy Policy</h1><p>You may access and erase data. For example, optional profile fields can be deleted. We retain records for 90 days and identify our processors.</p>' }])[0];
  assert.notEqual(incidental.policyDocumentQuality, 'template');

  assert.equal(contentLocaleFromRoute({ finalUrl: 'https://e.test/en/privacy' }), 'en');
  assert.equal(contentLocaleFromRoute({ finalUrl: 'https://e.test/page', detectedLocale: 'en-US' }), '');
  const arabic = buildGdprPublicNoticeMatrix([{ found: true, groups: ['privacy'], finalUrl: 'https://e.test/ar/privacy', detectedLocale: 'ar', html: '<p>لا نشارك البيانات دون أساس قانوني. لديك الحق في الوصول والمحو. نحتفظ بالبيانات لمدة 90 يوماً ونستخدم معالجي البيانات. يمكنك سحب موافقتك.</p>' }]);
  assert.ok(arabic.some((item) => item.state === 'observed'));
  assert.ok(arabic.every((item) => ['observed', 'partially_observed', 'not_observed'].includes(item.state)));
});

test('framework evidence references resolve to the correct isolated source evidence', () => {
  const crawl = extractComplianceEvidence([{ found: true, groups: ['privacy'], finalUrl: 'https://example.test/privacy', html: '<p>You may access and erase personal data. We retain records for 90 days.</p>' }, { found: true, groups: ['homepage'], finalUrl: 'https://example.test/health', html: '<p>Protected health information is processed under a BAA.</p>' }, { found: true, groups: ['homepage'], finalUrl: 'https://example.test/pay', html: '<p>Our payment processor handles card payments.</p>' }]);
  const frameworks = ['gdpr', 'hipaa', 'pci-dss', 'soc-2'].map((id) => frameworkEvidenceSummary(id, { checks: [], crawl, jurisdiction: '', frameworkApplicability: { [id]: 'unknown' }, paymentFlow: analyzePaymentFlowEvidence({ pages: crawl.pages || [], testedOrigin: 'https://example.test/' }) }));
  for (const framework of frameworks) {
    const evidenceById = new Map((framework.evidenceItems || []).map((item) => [item.evidenceId, item]));
    for (const statement of [...(framework.evidenceStatements || []), ...(framework.technicalEvidenceStatements || [])]) {
      for (const ref of statement.evidenceRefs || []) {
        if (ref.startsWith('check:')) continue;
        const evidence = evidenceById.get(ref);
        assert.ok(evidence, `${framework.id} missing ${ref}`);
        if (evidence.sourceUrl) assert.ok((statement.sourceUrls || []).includes(evidence.sourceUrl), `${framework.id} statement ${statement.statementId} points to the wrong source for ${ref}`);
        assert.ok(String(evidence.excerpt || evidence.evidenceText || '').length > 0, `${framework.id} evidence ${ref} has no traceable excerpt`);
      }
      for (const url of statement.sourceUrls || []) assert.ok([...evidenceById.values()].some((item) => item.sourceUrl === url), `${framework.id} unrelated ${url}`);
    }
  }
  assert.equal(frameworks.find((item) => item.id === 'gdpr').evidenceItems.some((item) => item.category === 'healthcare'), false);
  assert.equal(frameworks.find((item) => item.id === 'pci-dss').evidenceItems.some((item) => item.category === 'healthcare'), false);
});

test('failed, unassessed, unobserved, and manual states do not collapse into success', () => {
  const summary = createComplianceSummary({ testResults: [
    { id: 'timeout', outcome: 'fail', state: 'failed_to_test' },
    { id: 'manual', outcome: 'manual', state: 'not_tested' },
    { id: 'negative', outcome: 'manual', state: 'observed' },
    { id: 'observed', outcome: 'pass', state: 'confirmed' }
  ] });
  const states = summary.testResults.map((item) => item.state);
  assert.deepEqual(states, ['failed_to_test', 'not_tested', 'observed', 'confirmed']);
  assert.equal(summary.testResults[0].outcome === 'pass', false);
  assert.equal(summary.testResults[1].outcome === 'pass', false);
});

test('finding fingerprints stay stable for unchanged fixture evidence', () => {
  const check = { id: 'mixed-content', title: 'Mixed content', category: 'Transport security', status: 'fail', severity: 'high', confidence: 'confirmed', testState: 'confirmed', affectedUrl: 'https://example.test/', details: 'http://assets.example.test/logo.png', references: [], limitations: [] };
  const options = { generatedAt: PHASE1_OBSERVED_AT, toolVersion: '1.7.1', frameworks: ['iso-27001'] };
  const first = buildFindings([check], options);
  const second = buildFindings([{ ...check }], { ...options, generatedAt: '2026-08-27T00:00:00.000Z' });
  assert.equal(first[0].fingerprint, second[0].fingerprint);
});

test('browser capability failures distinguish administrative restrictions', () => {
  assert.equal(classifyBrowserFailure(new Error('page.goto: net::ERR_BLOCKED_BY_ADMINISTRATOR')).reason, 'browser_navigation_restricted');
  assert.equal(classifyBrowserFailure(new Error('Executable doesn\'t exist')).reason, 'browser_unavailable');
  assert.equal(classifyBrowserFailure(new Error('Target crashed')).reason, 'browser_operation_failed');
  assert.equal(browserSkipCode({ browserDetected: true, launch: 'available', navigation: 'restricted' }), 'browser_navigation_restricted');
  assert.equal(browserSkipCode({ browserDetected: true, launch: 'available', pdfSourceNavigation: 'restricted', pdfRendering: 'not_tested' }, 'pdf'), 'browser_navigation_restricted');
  assert.equal(browserSkipCode({ browserDetected: false, launch: 'unavailable' }), 'browser_unavailable');
});
