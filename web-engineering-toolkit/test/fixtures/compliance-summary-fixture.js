import { MAPPING_CATALOG_VERSION } from '../../lib/security-mapping-registry.js';
import { TOOL_VERSION } from '../../lib/tool-version.js';

export const PHASE1_OBSERVED_AT = '2026-08-25T00:00:00.000Z';

export function createComplianceSummary(overrides = {}) {
  const finding = {
    id: 'COOKIE_TRACKING_SECURE_MISSING',
    fingerprint: 'f'.repeat(64),
    title: 'Tracking cookie Secure attribute missing',
    category: 'Privacy & session',
    severity: 'low',
    confidence: 'confirmed',
    status: 'open',
    findingStatus: 'open',
    affectedUrl: 'https://example.test/very-long-path-with-hyphens?x=1&y=2',
    description: 'A bounded technical cookie observation was recorded.',
    impact: 'Transport hardening should be reviewed.',
    recommendation: 'Set Secure where appropriate.',
    evidence: { type: 'browser_cookie_snapshot', raw: 'COOKIE_TRACKING_SECURE_MISSING', evidenceType: 'browser_cookie_snapshot', evidenceStrength: 'runtime_observation', sourceMethod: 'browser_runtime', sourceUrl: 'https://example.test/', artifactId: 'browser-cookies' },
    evidenceItems: [], references: [], limitations: ['Technical evidence is bounded.'], controls: ['ISO27001:2022-A.8.5'], controlMappings: [], mappingApplicability: {},
    firstSeen: PHASE1_OBSERVED_AT, lastSeen: PHASE1_OBSERVED_AT, testMethod: 'Controlled fixture', toolVersion: TOOL_VERSION
  };
  const check = { id: 'cookies', title: 'Cookie attributes', category: 'Privacy & session', status: 'warning', severity: 'low', testState: 'confirmed', confidence: 'confirmed', affectedUrl: 'https://example.test/', summary: 'A cookie attribute requires review.', testMethod: 'Controlled fixture', limitations: [] };
  const control = { controlId: 'ISO27001:2022-A.8.5', state: 'supporting_technical_evidence_observed', controlSatisfaction: 'not_determined', coverage: 'partial', evidenceLevel: 'public_url', automatedEvidence: [{ checkId: 'cookies', evidenceState: 'supporting_technical_evidence_observed' }], mappings: [], linkedFindings: [finding.id], limitations: [], manualReviewRequired: true };
  const base = {
    schemaVersion: '2.2.0', scannerVersion: TOOL_VERSION, toolVersion: TOOL_VERSION, mappingCatalogVersion: MAPPING_CATALOG_VERSION,
    reportType: 'security-compliance', assessmentType: 'compliance_pre_assessment', evidenceLevel: 'public_url', complianceConclusion: 'not_determined', coverage: 'partial',
    generatedAt: PHASE1_OBSERVED_AT, startedAt: PHASE1_OBSERVED_AT, projectName: 'Phase 1 Fixture', requestedUrl: 'https://example.test/', finalUrl: 'https://example.test/', environment: 'fixture', jurisdiction: '', frameworks: ['iso-27001'], frameworkApplicability: { 'iso-27001': 'selected_for_mapping' }, scopeEvidence: [], responseStatus: 200, redirectChain: [], overallStatus: 'review', riskCount: 1,
    totals: { pass: 0, warning: 1, fail: 0, manual: 0, info: 0 }, counts: { checks: 1, observations: 1, findings: 1, evidenceItems: 1, controlMappings: 0, controlEvaluations: 1 },
    checks: [check], findings: [finding], testResults: [{ ...check, outcome: check.status, state: check.testState, stateLabel: 'Technical check completed' }], controlEvaluations: [control],
    frameworkResults: [{ id: 'iso-27001', label: 'ISO 27001', applicability: 'selected_for_mapping', applicabilityLabel: 'Selected for mapping', scopeBasis: 'operator_selected_for_mapping', scopeConfidence: 'not_determined', scopeDecisionRequired: true, controlSatisfaction: 'not_determined', coverage: 'partial', publicEvidence: [], technicalControls: [], missingEvidence: [], controlEvaluations: [control], evidenceItems: [], evidenceStatements: [], technicalEvidenceStatements: [], attentionFindings: [] }],
    tlsAnalysis: null, browserScan: { state: 'confirmed', resources: [], cookies: [], storage: { localStorageKeys: [], sessionStorageKeys: [] }, authenticatedPages: [], consentScenarios: [] }, crawl: null,
    policyDocumentQuality: [], gdprPublicNoticeMatrix: [], gdprPublicNoticeAggregate: 'not_assessed', localeCoverage: { detectedLocale: 'unknown', testedLocale: 'unknown', availableLocales: [], contentLocalesDiscovered: [], policyLocalesTested: [], languageSignals: [], state: 'locale_parity_not_assessed', localeParity: 'locale_parity_not_assessed' },
    paymentFlow: { paymentFlowObserved: false, architecture: 'unknown', providerHosts: [], merchantManagedScriptsObserved: false, testedOriginParticipatesInPaymentFlow: null, cardDataHandling: 'not_determined', pciScopeConclusion: 'requires_scope_confirmation' }, consentAssessment: { policyClaimObserved: false, runtimeBehaviorObserved: true, claimNotVerified: false, confirmedRuntimeMismatch: false, scenarios: [], conclusion: 'runtime_behavior_observed' },
    evidenceArchive: { metadata: { finalUrl: 'https://example.test/' }, http: { initialResponse: {} }, browser: {}, crawl: { pages: [], errors: [] } },
    disclaimer: 'Technical compliance pre-assessment only.'
  };
  return { ...base, ...overrides };
}

export function assertConservativeInvariants(assert, summary) {
  assert.equal(summary.assessmentType, 'compliance_pre_assessment');
  assert.equal(summary.complianceConclusion, 'not_determined');
  assert.equal(summary.coverage, 'partial');
  assert.ok((summary.controlEvaluations || []).every((control) => control.controlSatisfaction === 'not_determined'));
}
