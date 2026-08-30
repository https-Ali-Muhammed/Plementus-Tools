import assert from 'node:assert/strict';
import test from 'node:test';
import { checkBrokenLinksAndResources, classifyBrokenLinkStatus, redactBrokenLinkUrl, validateBrokenLinksInput } from '../lib/broken-links-checker.js';
import { detectBrowserCapabilities } from '../lib/browser-capability.js';
import { startBrokenLinksLab } from './fixtures/broken-links-lab-server.js';

test('checker input is bounded and rejects invalid base configuration', () => {
  assert.throws(() => validateBrokenLinksInput({ projectName: 'x', baseUrl: 'file:///tmp/test', startingPages: ['/'] }), /Project name/);
  assert.throws(() => validateBrokenLinksInput({ projectName: 'Fixture', baseUrl: 'file:///tmp/test', startingPages: ['/'] }), /http:\/\/ or https:\/\//);
  assert.throws(() => validateBrokenLinksInput({ projectName: 'Fixture', baseUrl: 'https://user:pass@example.test/', startingPages: ['/'] }), /credentials/);
  assert.throws(() => validateBrokenLinksInput({ projectName: 'Fixture', baseUrl: 'https://example.test/', startingPages: ['/'], maxPages: 1000 }), /Maximum pages/);
  const normalized = validateBrokenLinksInput({ projectName: 'Fixture', baseUrl: 'https://example.test', startingPages: [] });
  assert.deepEqual(normalized.startingPages, ['/']);
  assert.equal(normalized.maxPages, 25);
  assert.equal(normalized.maxTargets, 2000);
  assert.equal(normalized.concurrency, 6);
});

test('HTTP classification distinguishes broken, restricted, rate-limited, and server outcomes', () => {
  assert.equal(classifyBrokenLinkStatus(200), 'healthy');
  assert.equal(classifyBrokenLinkStatus(404), 'broken');
  assert.equal(classifyBrokenLinkStatus(410), 'broken');
  assert.equal(classifyBrokenLinkStatus(401), 'restricted');
  assert.equal(classifyBrokenLinkStatus(403), 'restricted');
  assert.equal(classifyBrokenLinkStatus(429), 'rate_limited');
  assert.equal(classifyBrokenLinkStatus(422), 'client_error');
  assert.equal(classifyBrokenLinkStatus(500), 'server_error');
});

test('public URL projection redacts sensitive query values and strips credentials', () => {
  assert.equal(redactBrokenLinkUrl('https://example.test/path?token=SECRET&view=full'), 'https://example.test/path?token=%5BREDACTED%5D&view=full');
  assert.equal(redactBrokenLinkUrl('https://user:pass@example.test/path?api_key=SECRET'), 'https://example.test/path?api_key=%5BREDACTED%5D');
});

test('rendered discovery checks unique targets once and preserves occurrences and factual outcomes', { timeout: 45_000 }, async (t) => {
  const lab = await startBrokenLinksLab();
  t.after(() => lab.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: lab.baseUrl });
  if (capability.navigation !== 'available') return t.skip(capability.reasons?.join('; ') || 'Browser navigation unavailable');

  const result = await checkBrokenLinksAndResources({
    projectName: 'Broken links fixture', baseUrl: lab.baseUrl, startingPages: ['/', '/page-two'],
    scanScope: 'selected', checkExternal: true, checkFragments: true, checkResources: true,
    timeoutMs: 100, maxPages: 10, maxTargets: 200, concurrency: 4, maxRedirects: 4
  });
  const byPath = (path) => result.targets.find((target) => new URL(target.targetUrl).pathname + new URL(target.targetUrl).hash === path);
  assert.equal(byPath('/missing').outcome, 'broken');
  assert.equal(byPath('/gone').outcome, 'broken');
  assert.equal(byPath('/restricted').outcome, 'restricted');
  assert.equal(byPath('/forbidden').outcome, 'restricted');
  assert.equal(byPath('/rate-limited').outcome, 'rate_limited');
  assert.equal(byPath('/server-error').outcome, 'server_error');
  assert.equal(byPath('/redirect-one').outcome, 'redirected');
  assert.equal(byPath('/redirect-one').redirectChain.length, 2);
  assert.equal(byPath('/head-unsupported').outcome, 'healthy');
  assert.equal(byPath('/head-unsupported').checkMethod, 'head_get_fallback');
  assert.equal(byPath('/slow').outcome, 'unreachable');
  assert.equal(byPath('/#top').outcome, 'healthy');
  assert.equal(byPath('/#missing-anchor').outcome, 'fragment_missing');
  assert.equal(byPath('/page-two#team').outcome, 'healthy');
  assert.equal(byPath('/page-two#absent').outcome, 'fragment_missing');
  assert.ok(result.targets.some((target) => new URL(target.targetUrl).pathname === '/dynamic-link'));
  assert.equal(byPath('/logout').outcome, 'skipped');
  assert.equal(result.targets.find((target) => target.targetUrl.startsWith('mailto:')).outcome, 'skipped');
  assert.equal(result.targets.find((target) => target.targetUrl.includes('169.254.169.254')).outcome, 'skipped');
  assert.ok(result.targets.some((target) => target.targetUrl.includes('token=%5BREDACTED%5D')));
  assert.equal(JSON.stringify(result).includes('SECRET_TOKEN'), false);
  assert.equal(byPath('/missing').occurrenceCount, 2);
  assert.equal(new Set(byPath('/missing').occurrences.map((item) => item.sourcePageUrl)).size, 2);
  assert.ok(result.targets.some((target) => target.targetUrl.endsWith('/query?id=1')));
  assert.ok(result.targets.some((target) => target.targetUrl.endsWith('/query?id=2')));
  assert.ok(result.targets.some((target) => target.targetUrl === `${lab.externalUrl}/external-ok` && target.outcome === 'healthy'));
  assert.ok(result.targets.some((target) => target.referenceTypes.includes('image') && target.outcome === 'broken'));
  assert.ok(result.targets.some((target) => target.referenceTypes.includes('script') && target.outcome === 'broken'));
  assert.ok(result.targets.some((target) => target.referenceTypes.includes('stylesheet') && target.outcome === 'broken'));
  assert.ok(result.targets.some((target) => target.referenceTypes.includes('iframe') && target.outcome === 'broken'));
  assert.equal(lab.requestCount('HEAD', '/missing'), 1, 'duplicate document target should receive one explicit status check');
  assert.equal(lab.requestCount('HEAD', '/logout'), 0, 'safety-sensitive discovered target must not be requested');
  assert.equal(result.summary.broken > 0, true);
  assert.equal(result.schemaVersion, '1.0.0');
});

test('bounded internal crawl renders discovered same-origin pages without crawling external pages', { timeout: 30_000 }, async (t) => {
  const lab = await startBrokenLinksLab();
  t.after(() => lab.close());
  const capability = await detectBrowserCapabilities({ fixtureUrl: lab.baseUrl });
  if (capability.navigation !== 'available') return t.skip(capability.reasons?.join('; ') || 'Browser navigation unavailable');
  const result = await checkBrokenLinksAndResources({ projectName: 'Crawl fixture', baseUrl: lab.baseUrl, startingPages: ['/'], scanScope: 'crawl', maxPages: 2, maxTargets: 100, timeoutMs: 150, concurrency: 3 });
  assert.equal(result.pages.length, 2);
  assert.ok(result.pages.some((page) => new URL(page.finalUrl).pathname === '/page-two'));
  assert.equal(result.limits.pageLimitReached, true);
  assert.equal(result.pages.some((page) => new URL(page.finalUrl).origin === lab.externalUrl), false);
});
