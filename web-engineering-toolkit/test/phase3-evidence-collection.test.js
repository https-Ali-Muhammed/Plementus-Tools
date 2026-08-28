import assert from 'node:assert/strict';
import fs from 'node:fs';
import http from 'node:http';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import {
  buildCollectionCoverage,
  canonicalizeObservedUrl,
  classifyObservedDestination,
  compareConsentSnapshots,
  normalizeSafeFormMetadata
} from '../lib/security-collection-model.js';
import { discoverEvidencePages } from '../lib/website-crawler.js';
import { SecurityReportManager, writeEvidenceArchive } from '../lib/security-report-manager.js';
import { buildComplianceHtml } from '../lib/security-report-html.js';

test('URL identity removes transport noise but preserves meaningful query state', () => {
  assert.equal(canonicalizeObservedUrl('HTTPS://Example.test:443/privacy/?utm_source=a&view=print#top'), 'https://example.test/privacy?view=print');
  assert.equal(canonicalizeObservedUrl('https://example.test/privacy?view=full'), 'https://example.test/privacy?view=full');
  assert.equal(canonicalizeObservedUrl('https://example.test/privacy?b=2&a=1'), 'https://example.test/privacy?a=1&b=2');
  assert.notEqual(canonicalizeObservedUrl('https://example.test/app?id=1'), canonicalizeObservedUrl('https://example.test/app?id=2'));
});

test('network destination classification is factual and does not label related hosts as trackers', () => {
  assert.deepEqual(classifyObservedDestination('https://app.example.test/api', 'https://app.example.test/page'), { classification: 'same_origin', confidence: 'high' });
  assert.deepEqual(classifyObservedDestination('https://cdn.app.example.test/a.js', 'https://app.example.test/page'), { classification: 'related_host', confidence: 'medium' });
  assert.deepEqual(classifyObservedDestination('https://api.vendor.test/v1', 'https://app.example.test/page'), { classification: 'external_host', confidence: 'high' });
});

test('collection coverage has explicit collector states and never creates a score', () => {
  const coverage = buildCollectionCoverage({
    response: { status: 200 },
    tlsAnalysis: null,
    crawlEnabled: true,
    crawl: { state: 'partial', limitations: ['Sitemap URL limit reached.'] },
    browserScan: { state: 'confirmed', networkCollection: { state: 'partial', limitations: ['Network record limit reached.'] }, authentication: { enabled: false }, consentTesting: { mode: 'basic' } },
    zapResult: { enabled: false, state: 'not_tested' }
  });
  assert.equal(coverage.http.state, 'completed');
  assert.equal(coverage.tls.state, 'not_tested');
  assert.equal(coverage.crawl.state, 'partial');
  assert.equal(coverage.browser.state, 'partial');
  assert.equal(coverage.authenticated.state, 'not_tested');
  assert.equal(coverage.zapPassive.state, 'not_tested');
  assert.equal('score' in coverage, false);
  assert.equal('percentage' in coverage, false);
});

test('consent snapshot comparison exposes names and hosts only', () => {
  const delta = compareConsentSnapshots(
    { cookies: [{ name: 'essential' }], storage: { localStorageKeys: ['theme'], sessionStorageKeys: [] }, networkObservations: [{ destinationHost: 'app.test' }] },
    { cookies: [{ name: 'essential' }, { name: 'analytics' }], storage: { localStorageKeys: ['theme', 'analytics_id'], sessionStorageKeys: ['consent'] }, networkObservations: [{ destinationHost: 'app.test' }, { destinationHost: 'analytics.test' }] }
  );
  assert.deepEqual(delta.cookieNames.added, ['analytics']);
  assert.deepEqual(delta.localStorageKeys.added, ['analytics_id']);
  assert.deepEqual(delta.sessionStorageKeys.added, ['consent']);
  assert.deepEqual(delta.networkHosts.added, ['analytics.test']);
  assert.doesNotMatch(JSON.stringify(delta), /value|token|body/i);
});

test('safe form normalization records bounded flags without values', () => {
  const form = normalizeSafeFormMetadata({ action: '/upload', method: 'post', enctype: 'multipart/form-data', fields: [
    { type: 'password', name: 'password', autocomplete: 'current-password', value: 'SECRET' },
    { type: 'file', name: 'document', value: '/tmp/private.pdf' },
    { type: 'text', name: 'card_number', autocomplete: 'cc-number', value: '4111111111111111' }
  ] }, 'https://example.test/account');
  assert.equal(form.actionUrl, 'https://example.test/upload');
  assert.equal(form.hasPasswordInput, true);
  assert.equal(form.hasFileInput, true);
  assert.equal(form.hasPaymentRelevantInput, true);
  assert.deepEqual(form.autocompleteTokens, ['cc-number', 'current-password']);
  assert.doesNotMatch(JSON.stringify(form), /SECRET|411111|private\.pdf/);
});

test('robots and sitemap are bounded discovery inputs and meaningful query routes remain distinct', async (t) => {
  const requests = [];
  const server = http.createServer((request, response) => {
    requests.push(request.url);
    response.setHeader('Content-Type', request.url.endsWith('.xml') ? 'application/xml' : 'text/html; charset=utf-8');
    if (request.url === '/robots.txt') return response.end('User-agent: *\nDisallow: /private\nSitemap: /sitemap-index.xml');
    if (request.url === '/sitemap-index.xml') return response.end('<?xml version="1.0"?><sitemapindex><sitemap><loc>/sitemap.xml</loc></sitemap><sitemap><loc>/ignored.xml</loc></sitemap></sitemapindex>');
    if (request.url === '/sitemap.xml') return response.end('<?xml version="1.0"?><urlset><url><loc>/privacy?view=full</loc></url><url><loc>/privacy?view=print&amp;utm_source=test</loc></url></urlset>');
    if (request.url.startsWith('/privacy')) return response.end('<title>Privacy policy</title><p>Privacy data protection privacy rights.</p>');
    return response.end('<title>Home</title>');
  });
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => new Promise((resolve) => server.close(resolve)));
  const { port } = server.address();
  const baseUrl = `http://127.0.0.1:${port}/`;
  const pages = await discoverEvidencePages(baseUrl, '<title>Home</title>', { maxPages: 2, maxSitemapDocuments: 2, maxSitemapUrls: 5 });
  assert.equal(pages.filter((page) => page.found && page.source === 'sitemap').length, 2);
  assert.ok(pages.some((page) => /view=full/.test(page.finalUrl)));
  assert.ok(pages.some((page) => /view=print/.test(page.finalUrl)));
  assert.equal(requests.includes('/private'), false, 'robots disallow must not be treated as a page to test');
  assert.equal(requests.includes('/ignored.xml'), false, 'sitemap document budget must be enforced');
  assert.equal(pages.collectionMetadata.state, 'partial');
  assert.ok(pages.collectionMetadata.limitations.some((item) => /page limit reached/i.test(item)));
});

test('evidence archive registers browser network once even when supplied once', () => {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), 'phase3-evidence-'));
  try {
    const manifest = writeEvidenceArchive(root, { browser: { resources: [{ url: 'https://example.test/api' }] } });
    const networkArtifacts = manifest.artifacts.filter((artifact) => artifact.id === 'browser-network' || (artifact.roles || []).includes('browser-network'));
    assert.equal(networkArtifacts.length, 1);
  } finally {
    fs.rmSync(root, { recursive: true, force: true });
  }
});

test('collection coverage is rendered compactly and retains conservative conclusions', () => {
  const html = buildComplianceHtml({
    schemaVersion: '2.5.0', projectName: 'Phase 3', finalUrl: 'https://example.test', generatedAt: new Date().toISOString(),
    assessmentType: 'compliance_pre_assessment', complianceConclusion: 'not_determined', coverage: 'partial',
    collectionCoverage: { http: { state: 'completed', limitations: [] }, crawl: { state: 'partial', limitations: ['Page budget reached.'] }, browser: { state: 'failed_to_test', limitations: ['Browser unavailable.'] } },
    findings: [], checks: [], controlEvaluations: [], frameworkResults: [], evidenceManifest: { artifacts: [] }, relationshipDefinitions: {}
  });
  assert.match(html, /Collection Coverage/);
  assert.match(html, /Page budget reached/);
  assert.doesNotMatch(html, /coverage percentage|compliance score/i);
  assert.match(html, /Compliance conclusion:\s*<strong>Not determined<\/strong>/);

  const legacyHtml = buildComplianceHtml({
    schemaVersion: '2.4.0', projectName: 'Legacy', finalUrl: 'https://example.test', generatedAt: new Date().toISOString(),
    assessmentType: 'compliance_pre_assessment', complianceConclusion: 'not_determined', coverage: 'partial',
    browserScan: { apiObservations: [], resources: [] }, findings: [], checks: [], controlEvaluations: [], frameworkResults: [], evidenceManifest: { artifacts: [] }, relationshipDefinitions: {}
  });
  assert.doesNotMatch(legacyHtml, /Runtime network \/ API evidence/);
});
