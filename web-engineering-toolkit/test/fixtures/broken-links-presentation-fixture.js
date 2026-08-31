const OUTCOME_PLAN = [
  ['broken', 8, 404],
  ['fragment_missing', 4, 200],
  ['server_error', 3, 500],
  ['unreachable', 3, 0],
  ['failed_to_check', 2, 0],
  ['client_error', 2, 422],
  ['redirected', 8, 200],
  ['restricted', 4, 403],
  ['rate_limited', 2, 429],
  ['skipped', 4, 0]
];

function occurrence(targetUrl, index, sourceIndex) {
  return {
    sourcePageUrl: `https://fixture.test/source-${sourceIndex}`,
    targetUrl,
    referenceType: index % 3 === 0 ? 'image' : 'link',
    attribute: index % 3 === 0 ? 'src' : 'href',
    linkText: index % 3 === 0 ? '' : `Reference ${index}`,
    fragment: targetUrl.includes('#') ? targetUrl.split('#')[1] : ''
  };
}

function target(outcome, status, index) {
  const longTail = index % 17 === 0 ? `/a-very-long-resource-name-${'segment-'.repeat(16)}${index}` : `/resource-${index}`;
  const fragment = outcome === 'fragment_missing' ? '#missing-section' : '';
  const targetUrl = `https://fixture.test${longTail}?variant=${index}${fragment}`;
  const occurrenceCount = index % 11 === 0 ? 14 : index % 5 === 0 ? 7 : 1;
  const occurrences = Array.from({ length: occurrenceCount }, (_, sourceIndex) => occurrence(targetUrl, index, sourceIndex));
  return {
    targetUrl,
    finalUrl: outcome === 'redirected' ? `https://fixture.test/final-${index}` : targetUrl,
    outcome,
    httpStatus: status || null,
    referenceType: index % 3 === 0 ? 'image' : 'link',
    referenceTypes: index % 7 === 0 ? ['link', 'image'] : [index % 3 === 0 ? 'image' : 'link'],
    internal: index % 9 !== 0,
    checkMethod: index % 3 === 0 ? 'browser_get' : 'head',
    failureReason: ['unreachable', 'failed_to_check'].includes(outcome) ? `Controlled ${outcome.replaceAll('_', ' ')} evidence` : outcome === 'server_error' ? 'Server returned an error response' : '',
    redirectCount: outcome === 'redirected' ? 2 : 0,
    redirectChain: outcome === 'redirected' ? [{ url: targetUrl, status: 301, location: `https://fixture.test/intermediate-${index}` }, { url: `https://fixture.test/intermediate-${index}`, status: 302, location: `https://fixture.test/final-${index}` }] : [],
    fragment: fragment.slice(1),
    networkTarget: outcome !== 'skipped',
    occurrenceCount,
    sourcePages: [...new Set(occurrences.map((item) => item.sourcePageUrl))],
    occurrences
  };
}

export function createBrokenLinksPresentationFixture(targetCount = 320) {
  const targets = [];
  let index = 0;
  for (const [outcome, count, status] of OUTCOME_PLAN) {
    for (let offset = 0; offset < count && targets.length < targetCount; offset += 1) targets.push(target(outcome, status, index++));
  }
  while (targets.length < targetCount) targets.push(target('healthy', 200, index++));
  // Healthy-first input proves the presentation, rather than source order, drives remediation priority.
  targets.sort((left, right) => Number(right.outcome === 'healthy') - Number(left.outcome === 'healthy') || left.targetUrl.localeCompare(right.targetUrl));
  const count = (outcome) => targets.filter((item) => item.outcome === outcome).length;
  const occurrenceCount = targets.reduce((sum, item) => sum + item.occurrenceCount, 0);
  return {
    schemaVersion: '1.0.0',
    reportType: 'broken-links-resources',
    projectName: 'Large presentation fixture',
    baseUrl: 'https://fixture.test',
    generatedAt: '2026-08-29T12:00:00.000Z',
    durationMs: 875,
    browser: { name: 'Fixture Browser', path: '/fixture/browser', version: '1' },
    scope: { mode: 'selected', startingPages: ['https://fixture.test/', 'https://fixture.test/docs'], checkExternal: true, checkFragments: true, checkResources: true, ignorePatternCount: 0 },
    limits: { maxPages: 25, maxTargets: 2000, timeoutMs: 10000, concurrency: 6, perHostConcurrency: 2, maxRedirects: 8, pageLimitReached: false, targetLimitReached: targetCount >= 2000, runtimeLimitReached: false },
    summary: {
      pagesScanned: 2,
      uniqueTargets: targets.length,
      occurrences: occurrenceCount,
      healthy: count('healthy'),
      broken: count('broken') + count('fragment_missing'),
      httpBroken: count('broken'),
      fragmentMissing: count('fragment_missing'),
      redirected: count('redirected'),
      unavailable: ['server_error', 'unreachable', 'failed_to_check', 'client_error', 'restricted', 'rate_limited'].reduce((sum, outcome) => sum + count(outcome), 0),
      externalTargets: targets.filter((item) => !item.internal).length,
      skipped: count('skipped')
    },
    pages: [],
    targets,
    summaryHref: '/reports/fixture/summary.html',
    jsonHref: '/reports/fixture/summary.json',
    csvHref: '/reports/fixture/summary.csv',
    pdfHref: '/api/reports/fixture/download/pdf'
  };
}
