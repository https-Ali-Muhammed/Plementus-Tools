import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import test from 'node:test';
import { SecurityReportManager } from '../lib/security-report-manager.js';
import { createComplianceSummary, assertConservativeInvariants } from './fixtures/compliance-summary-fixture.js';

const forbidden = ['SECRET_PHASE3_AUTH', 'SECRET_PHASE3_REQUEST_BODY', 'SECRET_PHASE3_RESPONSE_BODY', 'SECRET_PHASE3_STORAGE_VALUE'];

test('Phase 3 collection metadata survives public formats without leaking restricted network data', async (t) => {
  const reportsRoot = fs.mkdtempSync(path.join(os.tmpdir(), 'phase3-cross-format-'));
  t.after(() => fs.rmSync(reportsRoot, { recursive: true, force: true }));
  const collectionCoverage = {
    http: { state: 'completed', limitations: [] },
    tls: { state: 'completed', limitations: [] },
    dns: { state: 'completed', limitations: [] },
    crawl: { state: 'partial', limitations: ['Crawl page limit reached (2).'] },
    browser: { state: 'completed', limitations: [] },
    authenticated: { state: 'not_tested', limitations: [] },
    consent: { state: 'not_tested', limitations: [] },
    zapPassive: { state: 'not_tested', limitations: [] }
  };
  const summary = createComplianceSummary({
    schemaVersion: '2.5.0',
    collectionCoverage,
    browserScan: {
      state: 'confirmed',
      networkCollection: { state: 'completed', recordsCaptured: 2, recordLimit: 25, limitations: [] },
      resources: [{
        url: 'https://api.example.test/v1', sourcePageUrl: 'https://example.test/', destinationHost: 'api.example.test', destinationOrigin: 'https://api.example.test', partyClassification: 'related_host', observedAt: '2026-08-28T00:00:00.000Z',
        requestHeaders: { authorization: 'Bearer SECRET_PHASE3_AUTH' }, requestBody: 'SECRET_PHASE3_REQUEST_BODY', responseBody: 'SECRET_PHASE3_RESPONSE_BODY'
      }],
      apiObservations: [{
        url: 'https://api.example.test/v1', method: 'GET', status: 200, sourcePageUrl: 'https://example.test/', destinationHost: 'api.example.test', destinationOrigin: 'https://api.example.test', category: 'fetch', partyClassification: 'related_host', observedAt: '2026-08-28T00:00:00.000Z', requestBody: 'SECRET_PHASE3_REQUEST_BODY'
      }],
      cookies: [],
      storage: { localStorageKeys: ['theme'], sessionStorageKeys: [] },
      authenticatedPages: [],
      consentScenarios: [{ scenario: 'fresh_load', cookies: [], storage: { localStorageKeys: ['theme'], values: ['SECRET_PHASE3_STORAGE_VALUE'] }, networkObservations: [{ destinationHost: 'api.example.test', requestBody: 'SECRET_PHASE3_REQUEST_BODY' }] }]
    },
    evidenceArchive: {
      metadata: { finalUrl: 'https://example.test/' },
      http: { initialResponse: {} },
      browser: { resources: [{ requestHeaders: { authorization: 'Bearer SECRET_PHASE3_AUTH' }, requestBody: 'SECRET_PHASE3_REQUEST_BODY' }] },
      crawl: { pages: [], errors: [] }
    }
  });
  const manager = new SecurityReportManager({
    reportsRoot,
    pdfGenerator: async ({ pdfPath }) => {
      fs.writeFileSync(pdfPath, Buffer.from('%PDF-1.4\nPhase 3 deterministic placeholder\n%%EOF\n'));
      return { durationMs: 1, method: 'phase3_test_pdf' };
    }
  });
  const saved = await manager.save(summary);
  const root = path.join(reportsRoot, saved.reportName);
  const canonical = JSON.parse(fs.readFileSync(path.join(root, 'summary.json'), 'utf8'));
  const metadata = JSON.parse(fs.readFileSync(path.join(root, 'metadata.json'), 'utf8'));
  const manifest = JSON.parse(fs.readFileSync(path.join(root, 'report-manifest.json'), 'utf8'));
  const html = fs.readFileSync(path.join(root, 'summary.html'), 'utf8');
  const csv = fs.readFileSync(path.join(root, 'findings.csv'), 'utf8');

  assertConservativeInvariants(assert, canonical);
  assert.equal(canonical.schemaVersion, '2.5.0');
  assert.deepEqual(canonical.collectionCoverage, collectionCoverage);
  assert.deepEqual(canonical.overview.collectionCoverage, collectionCoverage);
  assert.deepEqual(metadata.collectionCoverage, collectionCoverage);
  assert.equal(metadata.schemaVersion, '2.5.0');
  assert.equal(canonical.browserScan.apiObservations[0].destinationHost, 'api.example.test');
  assert.equal(canonical.browserScan.apiObservations[0].requestBody, undefined);
  assert.match(html, /Runtime network \/ API evidence/);
  assert.match(html, /api\.example\.test/);
  assert.match(html, /Passive metadata only/);
  assert.doesNotMatch(csv, /api\.example\.test/, 'runtime network metadata must not be forced into findings.csv');

  for (const file of ['summary.json', 'summary.html', 'findings.csv', 'summary.csv', 'metadata.json']) {
    const content = fs.readFileSync(path.join(root, file), 'utf8');
    for (const value of forbidden) assert.equal(content.includes(value), false, `${file} leaked ${value}`);
  }
  for (const file of ['summary.json', 'summary.html', 'summary.pdf', 'metadata.json']) assert.ok(manifest.files.some((entry) => entry.file === file), `${file} missing from report manifest`);
  assert.equal(manifest.files.some((entry) => entry.file === 'summary.xlsx'), true);

  const restrictedNetwork = fs.readFileSync(path.join(root, 'evidence', 'browser', 'network.json'), 'utf8');
  assert.match(restrictedNetwork, /SECRET_PHASE3_AUTH/);
  assert.equal(manifest.files.some((entry) => entry.file === 'evidence/browser/network.json'), false, 'restricted raw evidence must not enter the public report manifest');
});
