import assert from 'node:assert/strict';
import test from 'node:test';
import { browserSkipReason, detectBrowserCapabilities } from '../lib/browser-capability.js';
import { runBrowserSecurityScan, scanWebsiteSecurity } from '../lib/security-scanner.js';
import { startSecurityLab } from './fixtures/security-lab-server.js';

test('browser network evidence is capped and retains safe source provenance', { timeout: 45_000 }, async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: `${lab.baseUrl}/phase3-runtime` });
  const reason = browserSkipReason(capability, 'navigation');
  if (reason) return t.skip(reason);
  const browser = await runBrowserSecurityScan(`${lab.baseUrl}/phase3-runtime`, { retryCount: 0, navigationTimeout: 8_000, maxNetworkRecords: 25 });
  assert.equal(browser.networkCollection.state, 'partial');
  assert.equal(browser.networkCollection.recordLimit, 25);
  assert.ok(browser.resources.length <= 25);
  assert.ok(browser.resources.every((resource) => resource.sourcePageUrl && resource.destinationHost && resource.observedAt));
  assert.ok(browser.resources.every((resource) => ['same_origin', 'related_host', 'external_host'].includes(resource.partyClassification)));
  assert.ok(browser.apiObservations.length > 0);
  assert.doesNotMatch(JSON.stringify(browser.apiObservations), /authorization|requestHeaders|responseHeaders|requestBody/i);
});

test('consent actions expose safe deltas and ambiguous controls require manual confirmation', { timeout: 45_000 }, async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: `${lab.baseUrl}/consent-banner` });
  const reason = browserSkipReason(capability, 'navigation');
  if (reason) return t.skip(reason);
  const browser = await runBrowserSecurityScan(`${lab.baseUrl}/consent-banner`, { retryCount: 0, navigationTimeout: 8_000, consentTesting: { mode: 'advanced', scenarios: ['accept', 'reject', 'reopen_preferences'] } });
  const accept = browser.consentScenarios.find((scenario) => scenario.scenario === 'accept');
  const reject = browser.consentScenarios.find((scenario) => scenario.scenario === 'reject');
  const ambiguous = browser.consentScenarios.find((scenario) => scenario.scenario === 'reopen_preferences');
  assert.equal(accept.actionState, 'completed');
  assert.ok(accept.deltaFromFreshLoad.cookieNames.added.includes('analytics'));
  assert.ok(accept.deltaFromFreshLoad.localStorageKeys.added.includes('analytics_id'));
  assert.ok(reject.deltaFromFreshLoad.sessionStorageKeys.added.includes('consent'));
  assert.equal(ambiguous.actionState, 'requires_manual_confirmation');
  assert.doesNotMatch(JSON.stringify(browser.consentScenarios), /redacted|cookieValue|storageValue/i);
});

test('scan output exposes non-scored collector coverage and keeps conservative invariants', { timeout: 45_000 }, async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: `${lab.baseUrl}/secure-corporate` });
  const reason = browserSkipReason(capability, 'navigation');
  if (reason) return t.skip(reason);
  const scan = await scanWebsiteSecurity({ projectName: 'Phase 3 coverage', targetUrl: `${lab.baseUrl}/secure-corporate`, frameworks: ['iso-27001'], crawl: true, maxCrawlPages: 2, browserRetryCount: 0, browserTimeoutMs: 8_000 });
  assert.equal(scan.schemaVersion, '2.6.0');
  assert.deepEqual(Object.keys(scan.collectionCoverage), ['http', 'tls', 'dns', 'crawl', 'browser', 'authenticated', 'consent', 'zapPassive']);
  assert.equal(scan.collectionCoverage.crawl.state, 'partial');
  assert.equal(scan.assessmentType, 'compliance_pre_assessment');
  assert.equal(scan.complianceConclusion, 'not_determined');
  assert.equal(scan.coverage, 'partial');
  assert.ok(scan.controlEvaluations.every((control) => control.controlSatisfaction === 'not_determined'));
  assert.equal('score' in scan.collectionCoverage, false);
});

test('authenticated crawl publishes deterministic budgets and safe form metadata only', { timeout: 45_000 }, async (t) => {
  const lab = await startSecurityLab();
  t.after(() => lab.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: `${lab.baseUrl}/login/normal` });
  const reason = browserSkipReason(capability, 'navigation');
  if (reason) return t.skip(reason);
  const browser = await runBrowserSecurityScan(`${lab.baseUrl}/dashboard`, {
    retryCount: 0,
    navigationTimeout: 8_000,
    authenticatedCrawlMaxPages: 1,
    authenticatedCrawlMaxDepth: 1,
    authenticatedCrawlMaxQueue: 2,
    authenticatedCrawlMaxRuntimeMs: 15_000,
    authentication: { enabled: true, role: 'normal', loginUrl: `${lab.baseUrl}/login/normal`, usernameSelector: '[name="username"]', passwordSelector: '[name="password"]', submitSelector: 'button', successUrlPattern: '**/app/normal', username: 'fixture', password: 'SECRET_AUTH_PASSWORD' }
  });
  assert.equal(browser.authentication.state, 'confirmed');
  assert.equal(browser.authenticatedCollection.pageLimit, 1);
  assert.equal(browser.authenticatedCollection.depthLimit, 1);
  assert.equal(browser.authenticatedCollection.state, 'partial');
  assert.equal(browser.authenticatedPages[0].forms[0].hasPasswordInput, true);
  assert.equal(browser.authenticatedPages[0].forms[0].hasFileInput, true);
  assert.equal(browser.authenticatedPages[0].forms[0].hasPaymentRelevantInput, true);
  assert.doesNotMatch(JSON.stringify(browser.authenticatedPages[0].forms), /SECRET_AUTH_PASSWORD|411111|value/i);
});
