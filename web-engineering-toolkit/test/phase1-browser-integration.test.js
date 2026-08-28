import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { browserSkipReason, detectBrowserCapabilities } from '../lib/browser-capability.js';
import { scanWebsiteSecurity } from '../lib/security-scanner.js';
import { SecuritySessionStore } from '../lib/security-session-store.js';
import { startSecurityLab } from './fixtures/security-lab-server.js';

function assertAssessmentBoundary(scan) {
  assert.equal(scan.assessmentType, 'compliance_pre_assessment');
  assert.equal(scan.complianceConclusion, 'not_determined');
  assert.equal(scan.coverage, 'partial');
  assert.ok(scan.controlEvaluations.every((control) => control.controlSatisfaction === 'not_determined'));
}

async function scanFixture(lab, path, frameworks = ['iso-27001', 'gdpr', 'soc-2', 'hipaa', 'pci-dss']) {
  return scanWebsiteSecurity({
    projectName: `Phase 1 ${path}`,
    targetUrl: `${lab.baseUrl}${path}`,
    frameworks,
    frameworkApplicability: Object.fromEntries(frameworks.map((framework) => [framework, 'unknown'])),
    crawl: true,
    maxCrawlPages: 1,
    browserRetryCount: 0,
    browserTimeoutMs: 8_000
  });
}

test('controlled browser archetypes preserve conservative scope and payment semantics', { timeout: 90_000 }, async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: `${lab.baseUrl}/secure-corporate` });
  const reason = browserSkipReason(capability, 'navigation');
  if (reason) return t.skip(reason);

  const scans = new Map();
  for (const route of ['/secure-corporate', '/weak-security', '/payment-generic', '/payment-redirect', '/payment-iframe', '/payment-hosted-fields', '/payment-merchant-form', '/healthcare', '/healthcare-phi', '/html-lang-only']) {
    const scan = await scanFixture(lab, route);
    assertAssessmentBoundary(scan);
    scans.set(route, scan);
  }

  const genericPayment = scans.get('/payment-generic').paymentFlow;
  assert.equal(genericPayment.architecture, 'unknown');
  assert.equal(genericPayment.testedOriginParticipatesInPaymentFlow, null);
  assert.equal(genericPayment.cardDataHandling, 'not_determined');
  assert.equal(scans.get('/payment-redirect').paymentFlow.architecture, 'redirect');
  assert.equal(scans.get('/payment-iframe').paymentFlow.architecture, 'iframe');
  assert.equal(scans.get('/payment-hosted-fields').paymentFlow.architecture, 'hosted_fields');
  assert.equal(scans.get('/payment-merchant-form').paymentFlow.architecture, 'merchant_form');
  for (const route of ['/payment-generic', '/payment-redirect', '/payment-iframe', '/payment-hosted-fields', '/payment-merchant-form']) {
    assert.equal(scans.get(route).paymentFlow.cardDataHandling, 'not_determined', route);
  }

  assert.equal(scans.get('/healthcare').frameworkResults.find((framework) => framework.id === 'hipaa').applicability, 'not_indicated');
  assert.equal(scans.get('/healthcare-phi').frameworkResults.find((framework) => framework.id === 'hipaa').applicability, 'potentially_applicable');
  const localeCoverage = scans.get('/html-lang-only').localeCoverage;
  assert.ok(localeCoverage.languageSignals.some((signal) => /en-US/i.test(signal)));
  assert.equal(localeCoverage.contentLocalesDiscovered.includes('en-US'), false);
  const secureScan = scans.get('/secure-corporate');
  const eprivacyControls = secureScan.controlEvaluations.filter((control) => control.controlId.startsWith('EPRIVACY-'));
  assert.ok(eprivacyControls.length > 0, 'fixture should exercise canonical ePrivacy control projection');
  assert.deepEqual(secureScan.frameworkResults.find((framework) => framework.id === 'eprivacy').controlEvaluations.map((control) => control.controlId), eprivacyControls.map((control) => control.controlId));
  assert.equal(secureScan.frameworkResults.filter((framework) => framework.id !== 'eprivacy').some((framework) => framework.controlEvaluations.some((control) => control.controlId.startsWith('EPRIVACY-'))), false);
});

test('browser capability probe reports launch, navigation, and PDF independently', { timeout: 30_000 }, async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: `${lab.baseUrl}/secure-corporate` });
  assert.equal(typeof capability.browserDetected, 'boolean');
  assert.ok(['available', 'unavailable', 'launch_failed'].includes(capability.launch));
  if (capability.launch !== 'available') return t.skip(browserSkipReason(capability, 'navigation'));
  assert.ok(['available', 'restricted', 'failed'].includes(capability.navigation));
  assert.ok(['available', 'restricted', 'failed'].includes(capability.pdfSourceNavigation));
  assert.ok(['available', 'not_tested', 'failed'].includes(capability.pdfRendering));
});

test('authenticated fixture encrypts and reuses bounded role evidence without an RBAC verdict', { timeout: 45_000 }, async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: `${lab.baseUrl}/login/normal` });
  const reason = browserSkipReason(capability, 'navigation');
  if (reason) return t.skip(reason);
  const sessionRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase1-auth-session-'));
  t.after(() => fs.rmSync(sessionRoot, { recursive: true, force: true }));
  const sessionStore = new SecuritySessionStore({ root: sessionRoot, encryptionSecret: 'phase1-session-fixture-key' });
  const authentication = {
    enabled: true,
    role: 'normal-user',
    loginUrl: `${lab.baseUrl}/login/normal`,
    usernameSelector: '[name="username"]',
    passwordSelector: '[name="password"]',
    submitSelector: 'button',
    successUrlPattern: '**/app/normal',
    successSelector: 'h1',
    username: 'fixture-user',
    password: 'SECRET_FIXTURE_PASSWORD',
    reuseSession: false
  };
  const baseConfig = { projectName: 'Phase 1 Auth', targetUrl: `${lab.baseUrl}/dashboard`, frameworks: ['iso-27001'], crawl: false, maxCrawlPages: 3, browserRetryCount: 0, browserTimeoutMs: 8_000 };
  const first = await scanWebsiteSecurity({ ...baseConfig, authentication }, { sessionStore });
  assertAssessmentBoundary(first);
  assert.equal(first.browserScan.authentication.state, 'confirmed');
  assert.equal(first.evidenceLevel, 'authenticated_application');
  assert.ok(first.checks.find((check) => check.id === 'authenticated-crawl').limitations.some((item) => /does not prove|require explicit/i.test(item)));
  const encrypted = fs.readFileSync(path.join(sessionRoot, fs.readdirSync(sessionRoot)[0]), 'utf8');
  assert.equal(encrypted.includes('SECRET_FIXTURE_PASSWORD'), false);
  assert.match(encrypted, /aes-256-gcm/);

  const reused = await scanWebsiteSecurity({ ...baseConfig, authentication: { ...authentication, username: '', password: '', reuseSession: true } }, { sessionStore });
  assertAssessmentBoundary(reused);
  assert.equal(reused.browserScan.authentication.state, 'observed');
  assert.equal(reused.browserScan.authentication.sessionReused, true);
  assert.equal(reused.evidenceLevel, 'authenticated_application');
  assert.doesNotMatch(JSON.stringify(reused.checks), /RBAC (?:validated|passed)|authorization model passed/i);
});

test('advanced consent scenarios remain independent and bounded', { timeout: 45_000 }, async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: `${lab.baseUrl}/consent-banner` });
  const reason = browserSkipReason(capability, 'navigation');
  if (reason) return t.skip(reason);
  const scan = await scanWebsiteSecurity({
    projectName: 'Phase 1 Consent',
    targetUrl: `${lab.baseUrl}/consent-banner`,
    frameworks: ['gdpr'],
    frameworkApplicability: { gdpr: 'unknown' },
    crawl: false,
    browserRetryCount: 0,
    browserTimeoutMs: 8_000,
    consentTesting: {
      mode: 'advanced',
      scenarios: ['accept', 'reject', 'reopen_preferences', 'withdraw', 'returning_user', 'locale_variant'],
      localeUrls: [`${lab.baseUrl}/en`, `${lab.baseUrl}/ar`]
    }
  });
  assertAssessmentBoundary(scan);
  const scenarios = scan.browserScan.consentScenarios;
  for (const expected of ['fresh_load', 'accept', 'reject', 'reopen_preferences', 'withdraw', 'returning_user', 'locale_variant']) assert.ok(scenarios.some((scenario) => scenario.scenario === expected), expected);
  assert.equal(scenarios.find((scenario) => scenario.scenario === 'accept').actionSucceeded, true);
  assert.equal(scenarios.find((scenario) => scenario.scenario === 'reject').actionSucceeded, true);
  assert.equal(scenarios.find((scenario) => scenario.scenario === 'reopen_preferences').actionSucceeded, false);
  assert.equal(scenarios.find((scenario) => scenario.scenario === 'withdraw').state, 'observed');
  assert.equal(scenarios.find((scenario) => scenario.scenario === 'returning_user').state, 'observed');
  assert.equal(scenarios.filter((scenario) => scenario.scenario === 'locale_variant').length, 2);
  assert.ok(scenarios.every((scenario) => scenario.state !== 'failed_to_test'));
  assert.equal(scan.consentAssessment.runtimeBehaviorObserved, true);
  assert.equal(scan.complianceConclusion, 'not_determined');
});
