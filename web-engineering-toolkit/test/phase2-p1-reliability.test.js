import assert from 'node:assert/strict';
import fs from 'node:fs';
import test from 'node:test';
import { buildControlEvaluations, buildFindings, classifyControlEvidence, classifyPrerequisiteOutcome, resolveLocalJurisdictions, validateFindingProvenance } from '../lib/security-finding-model.js';
import { EPRIVACY_ARTICLE_5_3_SOURCE, SECURITY_MAPPING_REGISTRY, frameworkForControl } from '../lib/security-mapping-registry.js';
import { buildComplianceHtml } from '../lib/security-report-html.js';
import { describeIntegrityMetadata } from '../lib/security-report-manager.js';
import { analyzePaymentFlowEvidence, assessInitialTracking, frameworkEvidenceSummary, normalizeFrameworkApplicability } from '../lib/security-scanner.js';
import { createComplianceSummary, PHASE1_OBSERVED_AT } from './fixtures/compliance-summary-fixture.js';

function check(id, status, extra = {}) {
  return {
    id,
    title: id,
    category: 'Phase 2.2 regression',
    status,
    severity: status === 'pass' ? 'informational' : 'medium',
    testState: 'confirmed',
    confidence: 'confirmed',
    affectedUrl: 'https://example.test/',
    limitations: [],
    references: [],
    ...extra
  };
}

function controls(checks, frameworks, frameworkApplicability, options = {}) {
  return buildControlEvaluations(checks, [], frameworks, { frameworkApplicability, evidenceLevel: 'public_url', ...options });
}

test('P1-AUD-001 prerequisites gate positive and adverse evidence symmetrically', () => {
  const cases = [
    ['supporting pass met', check('https', 'pass'), ['gdpr'], { gdpr: 'applicable' }, {}, 'supporting_technical_evidence_observed'],
    ['supporting pass uncertain', check('https', 'pass'), ['gdpr'], { gdpr: 'requires_scope_confirmation' }, {}, 'manual_review_required'],
    ['supporting adverse uncertain', check('https', 'fail'), ['gdpr'], { gdpr: 'requires_scope_confirmation' }, {}, 'manual_review_required'],
    ['contextual pass uncertain', check('hsts', 'pass'), ['gdpr'], { gdpr: 'requires_scope_confirmation' }, {}, 'manual_review_required'],
    ['contextual adverse uncertain', check('hsts', 'warning'), ['gdpr'], { gdpr: 'requires_scope_confirmation' }, {}, 'manual_review_required'],
    ['direct pass uncertain', check('privacy-runtime-consistency', 'pass'), ['gdpr'], { gdpr: 'requires_scope_confirmation' }, {}, 'manual_review_required'],
    ['direct adverse uncertain', check('privacy-runtime-consistency', 'warning'), ['gdpr'], { gdpr: 'requires_scope_confirmation' }, {}, 'manual_review_required']
  ];
  for (const [name, input, frameworks, applicability, options, expected] of cases) {
    const result = controls([input], frameworks, applicability, options);
    assert.equal(result[0]?.state, expected, name);
    assert.equal(result[0]?.controlSatisfaction, 'not_determined', name);
    assert.equal(result[0]?.coverage, 'partial', name);
  }

  const notMet = controls([check('https', 'pass')], ['gdpr'], { gdpr: 'not_applicable' });
  assert.equal(notMet.length, 1, 'candidate mapping is preserved when its prerequisite is not met');
  assert.equal(notMet[0].state, 'manual_review_required');
  assert.equal(notMet[0].automatedEvidence[0].evidenceState, 'mapping_prerequisite_not_met');
});

test('P1-AUD-001 PCI dual prerequisites require every prerequisite to be met', () => {
  const combinations = [
    ['met + met', 'applicable', true, 'supporting_technical_evidence_observed'],
    ['met + unknown', 'applicable', null, 'manual_review_required'],
    ['met + not met', 'applicable', false, 'manual_review_required'],
    ['uncertain + met', 'requires_scope_confirmation', true, 'manual_review_required'],
    ['not met + met', 'not_applicable', true, 'manual_review_required']
  ];
  for (const [name, scope, participation, expected] of combinations) {
    const result = controls([check('https', 'pass')], ['pci-dss'], { 'pci-dss': scope }, { paymentFlow: { testedOriginParticipatesInPaymentFlow: participation } });
    assert.equal(result[0]?.state, expected, name);
    if (expected === 'manual_review_required') {
      assert.ok(result[0].automatedEvidence.every((item) => !['supporting_technical_evidence_observed', 'adverse_technical_evidence_observed', 'partial_technical_evidence_observed'].includes(item.evidenceState)), name);
    }
  }
});

test('P1-AUD-001 prerequisite by relationship by outcome matrix is deterministic', () => {
  const relationships = ['direct', 'supporting', 'contextual'];
  const outcomes = [['pass', false], ['warning', true]];
  const prerequisiteStates = ['met', 'unknown', 'requires_manual_confirmation', 'not_met'];
  const expectedNormal = {
    'direct:pass': 'partial_technical_evidence_observed',
    'direct:warning': 'adverse_technical_evidence_observed',
    'supporting:pass': 'supporting_technical_evidence_observed',
    'supporting:warning': 'supporting_technical_evidence_observed',
    'contextual:pass': 'contextual_evidence_observed',
    'contextual:warning': 'contextual_evidence_observed'
  };
  for (const relationship of relationships) {
    for (const [status] of outcomes) {
      for (const state of prerequisiteStates) {
        const mapping = { relationship, evidenceTypes: relationship === 'contextual' ? ['contextual'] : ['supporting_technical'], prerequisites: ['scope'], prerequisiteResults: [{ prerequisite: 'scope', state }] };
        const classified = classifyControlEvidence(check('matrix-check', status), mapping);
        const expected = state === 'met' ? expectedNormal[`${relationship}:${status}`] : state === 'not_met' ? 'mapping_prerequisite_not_met' : 'manual_review_required';
        assert.equal(classified.evidenceState, expected, `${relationship} ${status} ${state}`);
        assert.equal(classified.prerequisiteOutcome, state === 'met' ? 'all_met' : state === 'not_met' ? 'not_met' : 'uncertain');
      }
    }
  }
  assert.equal(classifyPrerequisiteOutcome({ prerequisites: [] }), 'none');
});

test('P1-AUD-001 PCI prerequisite outcome matrix handles all required combinations', () => {
  const combinations = [
    [['met', 'met'], 'all_met'],
    [['met', 'unknown'], 'uncertain'],
    [['met', 'requires_manual_confirmation'], 'uncertain'],
    [['met', 'not_met'], 'not_met'],
    [['unknown', 'met'], 'uncertain'],
    [['requires_manual_confirmation', 'met'], 'uncertain'],
    [['not_met', 'met'], 'not_met']
  ];
  for (const [states, expected] of combinations) {
    const mapping = { prerequisites: ['pci_scope', 'payment_origin'], prerequisiteResults: [{ prerequisite: 'pci_scope', state: states[0] }, { prerequisite: 'payment_origin', state: states[1] }] };
    assert.equal(classifyPrerequisiteOutcome(mapping), expected, states.join(' + '));
  }
});

test('P1-AUD-002 and 003 give ePrivacy independent ownership, conservative strength, and amended provenance', () => {
  const mapping = SECURITY_MAPPING_REGISTRY.find((item) => item.controlId === 'EPRIVACY-DIR-2002-58-ART-5(3)');
  assert.equal(mapping.framework, 'eprivacy');
  assert.equal(frameworkForControl(mapping.controlId), 'eprivacy');
  assert.equal(mapping.relationship, 'supporting');
  assert.match(mapping.frameworkVersion, /2002\/58\/EC.*2009\/136\/EC/i);
  assert.equal(mapping.sourceCitation, EPRIVACY_ARTICLE_5_3_SOURCE);
  assert.match(mapping.limitations.join(' '), /storage\/access occurred/i);
  assert.match(mapping.limitations.join(' '), /strictly-necessary exception/i);
  assert.ok(mapping.aliases.includes('GDPR-EPRIVACY-ART-5(3)'));

  const applicability = normalizeFrameworkApplicability({ gdpr: 'not_applicable' });
  assert.equal(applicability.gdpr, 'not_applicable');
  assert.equal(applicability.eprivacy, 'unknown');
  const framework = frameworkEvidenceSummary('eprivacy', { checks: [], crawl: null, jurisdiction: '', frameworkApplicability: applicability });
  assert.equal(framework.label, 'ePrivacy Directive');
  assert.equal(framework.applicability, 'requires_scope_confirmation');
  assert.equal(framework.controlSatisfaction, 'not_determined');
});

test('P1-AUD-002 legacy GDPR-owned ePrivacy records render as ePrivacy without rewriting the record', () => {
  const legacyMapping = { framework: 'gdpr', controlId: 'GDPR-EPRIVACY-ART-5(3)', relationship: 'direct', prerequisites: [], prerequisiteResults: [] };
  const control = { controlId: 'GDPR-EPRIVACY-ART-5(3)', state: 'contextual_evidence_observed', controlSatisfaction: 'not_determined', coverage: 'partial', mappings: [legacyMapping], automatedEvidence: [], linkedFindings: [], limitations: [], manualReviewRequired: true };
  const legacyFinding = { ...createComplianceSummary().findings[0], controls: ['GDPR-EPRIVACY-ART-5(3)'], controlMappings: [legacyMapping] };
  const summary = createComplianceSummary({ findings: [legacyFinding], controlEvaluations: [control], frameworkResults: [{ id: 'gdpr', label: 'GDPR', applicability: 'requires_scope_confirmation', controlEvaluations: [control], publicEvidence: [], technicalControls: [], missingEvidence: [], evidenceItems: [], evidenceStatements: [], technicalEvidenceStatements: [], attentionFindings: [], controlSatisfaction: 'not_determined', coverage: 'partial' }] });
  const html = buildComplianceHtml(summary);
  assert.match(html, /ePrivacy Directive/);
  assert.match(html, /ePrivacy Directive GDPR-EPRIVACY-ART-5\(3\)/);
  assert.equal(legacyMapping.framework, 'gdpr', 'historical evidence is not mutated');
});

test('P1-AUD-003 bounded consent fixtures never become a legal or control conclusion', () => {
  const fixtures = [
    ['network only', { consentInterfaceDetected: false, trackingRequestCount: 1, freshContext: true }, ['network_request']],
    ['tracking with cookie snapshot', { consentInterfaceDetected: true, trackingRequestCount: 1, freshContext: true }, ['network_request', 'cookie_snapshot']],
    ['consent interface without tracking', { consentInterfaceDetected: true, trackingRequestCount: 0, freshContext: true }, ['consent_interface']],
    ['unknown consent state', { consentInterfaceDetected: false, trackingRequestCount: 0, freshContext: false }, []]
  ];
  for (const [name, input, observationKinds] of fixtures) {
    const initial = assessInitialTracking(input);
    assert.equal(typeof initial.trackingBeforeConsent, 'boolean', name);
    const result = controls([check('consent-behavior', initial.trackingBeforeConsent || initial.trackingWithoutConsentInterface ? 'warning' : 'pass', { evidenceItems: observationKinds.map((observationKind, index) => ({ evidenceId: `${name}_${index}`, observationKind })) })], ['eprivacy'], { eprivacy: 'requires_scope_confirmation' });
    assert.equal(result[0].state, 'manual_review_required', name);
    assert.equal(result[0].controlSatisfaction, 'not_determined', name);
    assert.equal(result[0].coverage, 'partial', name);
    assert.ok(result.every((control) => !['control_failed', 'non_compliant', 'violation'].includes(control.state)), name);
  }
});

test('P1-AUD-004 structured evidence drives finding provenance without synthetic references', () => {
  const evidenceItem = {
    evidenceId: 'crawl_policy_1',
    artifactId: 'crawl-pages',
    sourceUrl: 'https://example.test/privacy',
    collectionMethod: 'bounded_public_crawl',
    sourceMethod: 'public_policy_text',
    observedAt: PHASE1_OBSERVED_AT,
    confidence: 'medium',
    evidenceType: 'public_policy_text',
    evidenceStrength: 'direct_observation',
    evidenceText: 'Policy placeholder observed.',
    limitations: ['Bounded public page evidence.']
  };
  const findings = buildFindings([check('policy-document-quality', 'warning', {
    affectedUrl: '',
    evidence: 'fallback evidence that must not replace the structured item',
    evidenceItems: [evidenceItem]
  })], { generatedAt: PHASE1_OBSERVED_AT, toolVersion: 'test', frameworks: [], defaultSourceUrl: 'https://example.test/' });
  assert.equal(findings.length, 1);
  assert.equal(findings[0].affectedUrl, evidenceItem.sourceUrl);
  assert.equal(findings[0].evidence.evidenceId, evidenceItem.evidenceId);
  assert.equal(findings[0].evidence.artifactId, 'crawl-pages');
  assert.deepEqual(findings[0].artifactRefs, ['crawl-pages']);
  assert.deepEqual(findings[0].sourceUrls, ['https://example.test/privacy']);
  assert.deepEqual(findings[0].evidenceItems.map((item) => item.evidenceId), ['crawl_policy_1']);
  assert.ok(findings[0].artifactRefs.every((ref) => !ref.includes('+')));
  const validation = validateFindingProvenance(findings, { artifacts: [{ id: 'crawl-pages' }] });
  assert.deepEqual(validation, { valid: true, errors: [] });
  const invalid = validateFindingProvenance([{ ...findings[0], artifactRefs: ['crawl-pages+browser-network'], evidenceItems: [{ ...findings[0].evidenceItems[0], artifactId: 'crawl-pages+browser-network', artifactRefs: ['crawl-pages+browser-network'] }] }], { artifacts: [{ id: 'crawl-pages' }, { id: 'browser-network' }] });
  assert.equal(invalid.valid, false);
  assert.ok(invalid.errors.some((error) => error.includes('synthetic artifact reference')));
});

test('P1-AUD-005 payment evidence separates tested origin from actual source and destination', () => {
  const result = analyzePaymentFlowEvidence({
    testedOrigin: 'https://shop.test/',
    observedAt: PHASE1_OBSERVED_AT,
    pages: [{ found: true, finalUrl: 'https://shop.test/checkout', html: '<iframe src="https://checkout.stripe.com/pay/session"></iframe>' }]
  });
  const item = result.evidenceItems[0];
  assert.equal(item.testedOrigin, 'https://shop.test');
  assert.equal(item.sourceUrl, 'https://shop.test/checkout');
  assert.equal(item.destinationUrl, 'https://checkout.stripe.com/pay/session');
  assert.equal(item.providerHost, 'checkout.stripe.com');
  assert.equal(item.observationKind, 'iframe');
  assert.equal(result.cardDataHandling, 'not_determined');
});

test('P1-AUD-005 payment source matrix retains the actual observation route', () => {
  const cases = [
    ['homepage wording', [{ found: true, finalUrl: 'https://shop.test/', html: '<p>Enter card number and CVV.</p>' }], {}, 'https://shop.test/', 'public_page_text'],
    ['checkout route', [{ found: true, finalUrl: 'https://shop.test/checkout', html: '<p>Enter card number and CVV.</p>' }], {}, 'https://shop.test/checkout', 'public_page_text'],
    ['redirect', [{ found: true, finalUrl: 'https://shop.test/checkout', html: '<a href="https://checkout.stripe.com/pay/x">Pay</a>' }], {}, 'https://shop.test/checkout', 'redirect'],
    ['iframe', [{ found: true, finalUrl: 'https://shop.test/payment', html: '<iframe src="https://checkout.stripe.com/frame"></iframe>' }], {}, 'https://shop.test/payment', 'iframe'],
    ['hosted fields', [{ found: true, finalUrl: 'https://shop.test/checkout', html: '<script src="https://js.stripe.com/v3/elements.js"></script>' }], {}, 'https://shop.test/checkout', 'script'],
    ['merchant form', [{ found: true, finalUrl: 'https://shop.test/pay', html: '<form action="/pay"><input name="card_number"><input name="cvv"></form>' }], {}, 'https://shop.test/pay', 'form_action'],
    ['provider script', [{ found: true, finalUrl: 'https://shop.test/checkout', html: '<script src="https://js.stripe.com/sdk.js"></script>' }], {}, 'https://shop.test/checkout', 'script'],
    ['provider request', [], { finalUrl: 'https://shop.test/checkout', resources: [{ url: 'https://api.stripe.com/v1/tokens', category: 'xhr' }] }, 'https://shop.test/checkout', 'provider_request']
  ];
  for (const [name, pages, browserScan, expectedSource, expectedKind] of cases) {
    const result = analyzePaymentFlowEvidence({ pages, browserScan, testedOrigin: 'https://shop.test/', observedAt: PHASE1_OBSERVED_AT });
    assert.equal(result.evidenceItems[0]?.sourceUrl, expectedSource, name);
    assert.equal(result.evidenceItems[0]?.observationKind, expectedKind, name);
    assert.equal(result.testedOrigin, 'https://shop.test', name);
    assert.equal(result.cardDataHandling, 'not_determined', name);
  }
});

test('P1-AUD-006 local jurisdictions retain official instrument metadata but fabricate no control mapping', () => {
  for (const [input, expectedId] of [['UAE', 'uae'], ['Saudi Arabia', 'saudi-arabia'], ['Egypt', 'egypt']]) {
    const jurisdictions = resolveLocalJurisdictions(input);
    assert.equal(jurisdictions.length, 1, input);
    assert.equal(jurisdictions[0].id, expectedId, input);
    assert.ok(jurisdictions[0].instruments.length >= 1, input);
    assert.ok(jurisdictions[0].instruments.every((instrument) => instrument.instrumentId && instrument.officialName && instrument.versionDate && /^https:\/\//.test(instrument.sourceCitation)), input);
    assert.equal(jurisdictions[0].mappingStatus, 'manual_legal_mapping_required', input);
    const result = controls([check('https', 'fail')], ['local'], { local: 'requires_scope_confirmation' }, { jurisdiction: input });
    assert.equal(result.length, 0, `${input} must not receive an unsupported provision/control mapping`);
    const projection = frameworkEvidenceSummary('local', { checks: [], crawl: null, jurisdiction: input, frameworkApplicability: { local: 'unknown' } });
    assert.ok(projection.publicEvidence.some((statement) => statement.includes(`Jurisdiction configured: ${input}`)), input);
    assert.ok(projection.missingEvidence.includes('Provision-level local-law mapping by a qualified legal reviewer'), input);
    assert.equal(projection.applicability, 'requires_scope_confirmation', input);
  }
  assert.deepEqual(resolveLocalJurisdictions('France'), []);
  assert.deepEqual(resolveLocalJurisdictions(''), []);
});

test('P1-AUD-007 workspace integrity language records metadata without claiming verification', () => {
  const source = fs.readFileSync(new URL('../public/app.js', import.meta.url), 'utf8');
  for (const prohibited of ['Artifacts verified', "? 'Verified' : 'Review required'", "? 'Verified' : 'Not configured'"]) assert.equal(source.includes(prohibited), false, prohibited);
  for (const required of ['SHA-256 recorded', 'Not verified in this view', 'Signature metadata']) assert.ok(source.includes(required), required);
});

test('P1-AUD-007 integrity metadata matrix never claims integrity or authenticity verification', () => {
  const hash = 'a'.repeat(64);
  const signature = 'b'.repeat(64);
  const cases = [
    ['valid hash metadata', { evidenceManifest: { artifacts: [{ id: 'a', sha256: hash }] } }],
    ['missing hash', { evidenceManifest: { artifacts: [{ id: 'a', sha256: '' }] } }],
    ['malformed hash', { evidenceManifest: { artifacts: [{ id: 'a', sha256: 'bad' }] } }],
    ['tampered artifact not verifiable in view', { evidenceManifest: { artifacts: [{ id: 'a', sha256: hash, tampered: true }] } }],
    ['valid signature metadata', { reportManifest: { signature: { algorithm: 'hmac-sha256', value: signature } } }],
    ['missing signature', { reportManifest: { signature: { algorithm: 'none', value: '' } } }],
    ['unsigned manifest', { reportManifest: {} }],
    ['tampered signed manifest not verifiable in view', { reportManifest: { signature: { algorithm: 'hmac-sha256', value: signature }, tampered: true } }]
  ];
  for (const [name, input] of cases) {
    const presentation = describeIntegrityMetadata(input);
    assert.equal(presentation.verification, 'not_performed', name);
    assert.equal(presentation.integrityVerified, false, name);
    assert.equal(presentation.authenticityVerified, false, name);
    assert.ok(!/^(verified|integrity verified|signature verified)\b/i.test(presentation.manifestValue), name);
    assert.ok(!/^(verified|integrity verified|signature verified)\b/i.test(presentation.signatureValue), name);
  }
});
