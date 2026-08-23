import { detectBrowsers } from './environment-checker.js';

const TYPE_MAP = {
  Document: 'document', Stylesheet: 'stylesheet', Image: 'image', Media: 'media', Font: 'font',
  Script: 'script', XHR: 'xhr', Fetch: 'fetch', WebSocket: 'other', Manifest: 'other', Other: 'other'
};

function resolveUrl(value, baseUrl) {
  const raw = String(value || '').trim();
  if (!raw) throw new Error('Target page cannot be empty.');
  const url = new URL(raw, baseUrl);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`Unsupported target URL: ${raw}`);
  return url.href;
}

function normalizeHeaders(headers = {}) {
  const out = {};
  for (const [key, value] of Object.entries(headers || {})) out[String(key).toLowerCase()] = String(value);
  return out;
}

function isFirstParty(resourceUrl, pageUrl) {
  try {
    const resourceHost = new URL(resourceUrl).hostname.toLowerCase();
    const pageHost = new URL(pageUrl).hostname.toLowerCase();
    return resourceHost === pageHost || resourceHost.endsWith(`.${pageHost}`) || pageHost.endsWith(`.${resourceHost}`);
  } catch { return true; }
}

function resourceCategory(type, mimeType = '') {
  const mapped = TYPE_MAP[type] || 'other';
  if (mapped !== 'other') return mapped;
  const mime = String(mimeType).toLowerCase();
  if (mime.includes('javascript')) return 'script';
  if (mime.includes('css')) return 'stylesheet';
  if (mime.startsWith('image/')) return 'image';
  if (mime.startsWith('font/') || mime.includes('woff')) return 'font';
  if (mime.startsWith('video/') || mime.startsWith('audio/')) return 'media';
  if (mime.includes('json')) return 'xhr';
  return 'other';
}

function bytesByType(resources) {
  const result = { document: 0, script: 0, stylesheet: 0, image: 0, font: 0, media: 0, xhr: 0, fetch: 0, other: 0 };
  for (const resource of resources) result[resource.category] = (result[resource.category] || 0) + resource.transferBytes;
  return result;
}

function makeFinding(category, severity, title, detail, recommendation, count = 1) {
  return { category, severity, title, detail, recommendation, count };
}

function analyzeFindings(pageResult) {
  const findings = [];
  const b = pageResult.breakdown;
  const total = pageResult.totalTransferBytes;
  const requests = pageResult.requestCount;

  if (total > 5 * 1024 * 1024) findings.push(makeFinding('Page weight', 'high', 'Very heavy page', `The page transferred ${(total / 1024 / 1024).toFixed(2)} MB.`, 'Aim to keep the initial page transfer below roughly 3 MB by reducing images, scripts, fonts and third-party resources.'));
  else if (total > 3 * 1024 * 1024) findings.push(makeFinding('Page weight', 'medium', 'Heavy page', `The page transferred ${(total / 1024 / 1024).toFixed(2)} MB.`, 'Review the largest resources and remove or compress assets that are not essential to the initial experience.'));

  if (requests > 150) findings.push(makeFinding('Requests', 'high', 'Very high request count', `${requests} network requests were made.`, 'Bundle or remove unnecessary assets and reduce third-party requests.'));
  else if (requests > 100) findings.push(makeFinding('Requests', 'medium', 'High request count', `${requests} network requests were made.`, 'Reduce unnecessary assets and third-party requests where possible.'));

  if (b.script > 1.5 * 1024 * 1024) findings.push(makeFinding('JavaScript', 'high', 'Large JavaScript payload', `${(b.script / 1024 / 1024).toFixed(2)} MB of JavaScript was transferred.`, 'Split bundles, remove unused dependencies, defer non-critical scripts and audit third-party JavaScript.'));
  else if (b.script > 800 * 1024) findings.push(makeFinding('JavaScript', 'medium', 'JavaScript payload needs review', `${(b.script / 1024).toFixed(0)} KB of JavaScript was transferred.`, 'Check the largest JavaScript files and defer code that is not needed for initial rendering.'));

  if (b.image > 4 * 1024 * 1024) findings.push(makeFinding('Images', 'high', 'Very large image payload', `${(b.image / 1024 / 1024).toFixed(2)} MB of images was transferred.`, 'Resize oversized images, use modern formats such as WebP/AVIF and lazy-load below-the-fold media.'));
  else if (b.image > 2 * 1024 * 1024) findings.push(makeFinding('Images', 'medium', 'Large image payload', `${(b.image / 1024 / 1024).toFixed(2)} MB of images was transferred.`, 'Optimize the heaviest images and avoid loading below-the-fold images immediately.'));

  const heavyAssets = pageResult.resources.filter((resource) => resource.transferBytes > 1024 * 1024);
  if (heavyAssets.length) findings.push(makeFinding('Assets', 'high', 'Assets larger than 1 MB', `${heavyAssets.length} resource${heavyAssets.length === 1 ? '' : 's'} exceeded 1 MB.`, 'Compress, resize, split or defer these resources.', heavyAssets.length));

  const heavyImages = pageResult.resources.filter((resource) => resource.category === 'image' && resource.transferBytes > 500 * 1024);
  if (heavyImages.length) findings.push(makeFinding('Images', 'medium', 'Large individual images', `${heavyImages.length} image${heavyImages.length === 1 ? '' : 's'} exceeded 500 KB.`, 'Resize images to their rendered dimensions and use efficient image formats.', heavyImages.length));

  const heavyFonts = pageResult.resources.filter((resource) => resource.category === 'font' && resource.transferBytes > 250 * 1024);
  if (heavyFonts.length) findings.push(makeFinding('Fonts', 'medium', 'Large font files', `${heavyFonts.length} font file${heavyFonts.length === 1 ? '' : 's'} exceeded 250 KB.`, 'Subset fonts, remove unused weights/styles and prefer WOFF2.', heavyFonts.length));

  const uncompressed = pageResult.resources.filter((resource) => ['script', 'stylesheet', 'document', 'xhr', 'fetch'].includes(resource.category) && resource.transferBytes > 50 * 1024 && !resource.contentEncoding);
  if (uncompressed.length) findings.push(makeFinding('Compression', 'medium', 'Large text resources appear uncompressed', `${uncompressed.length} text resource${uncompressed.length === 1 ? '' : 's'} over 50 KB did not advertise gzip, Brotli or another content encoding.`, 'Enable Brotli or gzip compression for HTML, CSS, JavaScript, JSON and other text responses.', uncompressed.length));

  const staticWithoutCache = pageResult.resources.filter((resource) => ['script', 'stylesheet', 'image', 'font'].includes(resource.category) && resource.transferBytes > 10 * 1024 && !/max-age|s-maxage|immutable/i.test(resource.cacheControl));
  if (staticWithoutCache.length) findings.push(makeFinding('Caching', 'low', 'Static assets without clear cache lifetime', `${staticWithoutCache.length} static resource${staticWithoutCache.length === 1 ? '' : 's'} did not expose a clear max-age/immutable cache policy.`, 'Add suitable Cache-Control headers to versioned static assets.', staticWithoutCache.length));

  if (pageResult.thirdPartyBytes > total * 0.4 && total > 0) findings.push(makeFinding('Third-party', 'medium', 'High third-party transfer share', `${Math.round(pageResult.thirdPartyBytes / total * 100)}% of transferred bytes came from third-party hosts.`, 'Review analytics, widgets, advertising, embeds and other third-party code for necessity and weight.'));

  if (pageResult.dom?.belowFoldImagesWithoutLazy > 0) findings.push(makeFinding('Images', 'low', 'Below-the-fold images without lazy loading', `${pageResult.dom.belowFoldImagesWithoutLazy} below-the-fold image${pageResult.dom.belowFoldImagesWithoutLazy === 1 ? '' : 's'} did not use loading="lazy".`, 'Lazy-load non-critical below-the-fold images when appropriate.', pageResult.dom.belowFoldImagesWithoutLazy));

  return findings;
}

async function analyzePage(browser, targetUrl, device) {
  const mobile = device === 'mobile';
  const context = await browser.newContext({
    viewport: mobile ? { width: 390, height: 844 } : { width: 1440, height: 900 },
    isMobile: mobile,
    deviceScaleFactor: mobile ? 2 : 1,
    ignoreHTTPSErrors: false,
    serviceWorkers: 'block'
  });
  const page = await context.newPage();
  const cdp = await context.newCDPSession(page);
  await cdp.send('Network.enable', { maxTotalBufferSize: 100000000, maxResourceBufferSize: 10000000 });
  await cdp.send('Network.setCacheDisabled', { cacheDisabled: true });

  const resources = new Map();
  cdp.on('Network.requestWillBeSent', (event) => {
    const existing = resources.get(event.requestId) || {};
    resources.set(event.requestId, {
      ...existing,
      requestId: event.requestId,
      url: event.request.url,
      method: event.request.method,
      type: event.type || existing.type || 'Other',
      startTime: event.timestamp,
      transferBytes: existing.transferBytes || 0,
      failed: false
    });
  });
  cdp.on('Network.responseReceived', (event) => {
    const existing = resources.get(event.requestId) || { requestId: event.requestId, url: event.response.url };
    const headers = normalizeHeaders(event.response.headers);
    resources.set(event.requestId, {
      ...existing,
      url: event.response.url || existing.url,
      type: event.type || existing.type || 'Other',
      status: event.response.status,
      mimeType: event.response.mimeType || '',
      headers,
      contentEncoding: headers['content-encoding'] || '',
      cacheControl: headers['cache-control'] || '',
      protocol: event.response.protocol || '',
      fromDiskCache: Boolean(event.response.fromDiskCache),
      fromServiceWorker: Boolean(event.response.fromServiceWorker)
    });
  });
  cdp.on('Network.loadingFinished', (event) => {
    const existing = resources.get(event.requestId);
    if (!existing) return;
    resources.set(event.requestId, { ...existing, transferBytes: Math.max(0, Number(event.encodedDataLength) || 0), endTime: event.timestamp });
  });
  cdp.on('Network.loadingFailed', (event) => {
    const existing = resources.get(event.requestId);
    if (!existing) return;
    resources.set(event.requestId, { ...existing, failed: true, errorText: event.errorText || 'Request failed', endTime: event.timestamp });
  });

  let response;
  const startedAt = Date.now();
  try {
    response = await page.goto(targetUrl, { waitUntil: 'load', timeout: 45000 });
    try { await page.waitForLoadState('networkidle', { timeout: 12000 }); } catch {}
    await page.waitForTimeout(750);
  } catch (error) {
    await context.close();
    throw new Error(`Could not load ${targetUrl}: ${error.message}`);
  }

  let dom = {};
  try {
    dom = await page.evaluate(() => {
      const images = [...document.images];
      return {
        title: document.title || '',
        domElements: document.querySelectorAll('*').length,
        images: images.length,
        belowFoldImagesWithoutLazy: images.filter((img) => img.getBoundingClientRect().top > innerHeight && String(img.loading || '').toLowerCase() !== 'lazy').length
      };
    });
  } catch {}

  const finalUrl = page.url();
  const pageHost = new URL(finalUrl).hostname;
  const list = [...resources.values()].filter((resource) => /^https?:/i.test(resource.url || '')).map((resource) => {
    const transferBytes = Math.max(0, Number(resource.transferBytes) || 0);
    const category = resourceCategory(resource.type, resource.mimeType);
    let host = '';
    try { host = new URL(resource.url).hostname; } catch {}
    return {
      url: resource.url,
      host,
      method: resource.method || 'GET',
      status: resource.status || 0,
      category,
      resourceType: resource.type || 'Other',
      mimeType: resource.mimeType || '',
      transferBytes,
      contentEncoding: resource.contentEncoding || '',
      cacheControl: resource.cacheControl || '',
      protocol: resource.protocol || '',
      firstParty: isFirstParty(resource.url, finalUrl),
      failed: Boolean(resource.failed),
      errorText: resource.errorText || ''
    };
  });

  const totalTransferBytes = list.reduce((sum, resource) => sum + resource.transferBytes, 0);
  const thirdParty = list.filter((resource) => !resource.firstParty);
  const thirdPartyBytes = thirdParty.reduce((sum, resource) => sum + resource.transferBytes, 0);
  const thirdPartyHosts = new Map();
  for (const resource of thirdParty) {
    if (!thirdPartyHosts.has(resource.host)) thirdPartyHosts.set(resource.host, { host: resource.host, requests: 0, bytes: 0 });
    const item = thirdPartyHosts.get(resource.host); item.requests += 1; item.bytes += resource.transferBytes;
  }

  const result = {
    requestedUrl: targetUrl,
    finalUrl,
    pageHost,
    device,
    status: response?.status() || 0,
    durationMs: Date.now() - startedAt,
    title: dom.title || '',
    dom,
    requestCount: list.length,
    failedRequestCount: list.filter((resource) => resource.failed || resource.status >= 400).length,
    totalTransferBytes,
    thirdPartyBytes,
    thirdPartyRequests: thirdParty.length,
    breakdown: bytesByType(list),
    resources: list.sort((a, b) => b.transferBytes - a.transferBytes),
    thirdPartyHosts: [...thirdPartyHosts.values()].sort((a, b) => b.bytes - a.bytes)
  };
  result.findings = analyzeFindings(result);
  await context.close();
  return result;
}

export async function analyzeWebsiteAssets(input = {}) {
  let chromium;
  try {
    ({ chromium } = await import('playwright-core'));
  } catch {
    throw new Error('Playwright Core is not installed. Run npm install, then try the analysis again.');
  }
  const projectName = String(input.projectName || '').trim();
  const baseUrl = String(input.baseUrl || '').trim();
  const device = input.device === 'mobile' ? 'mobile' : 'desktop';
  if (projectName.length < 2) throw new Error('Project name must contain at least 2 characters.');
  let parsedBase;
  try { parsedBase = new URL(baseUrl); } catch { throw new Error('Enter a valid Base URL.'); }
  if (!['http:', 'https:'].includes(parsedBase.protocol)) throw new Error('Base URL must use http:// or https://.');
  const rawPaths = Array.isArray(input.paths) ? input.paths : [];
  if (!rawPaths.length) throw new Error('Add at least one page to analyze.');
  if (rawPaths.length > 30) throw new Error('Analyze up to 30 pages in one report.');
  const urls = [...new Set(rawPaths.map((value) => resolveUrl(value, baseUrl)))];

  const browsers = await detectBrowsers();
  const preferred = String(input.preferredBrowserPath || '').trim();
  const browserInfo = preferred ? browsers.find((browser) => browser.path === preferred) : browsers[0];
  if (!browserInfo) throw new Error('Chrome, Chromium or Brave is required for the Asset & Page-Weight Analyzer.');

  const browser = await chromium.launch({ executablePath: browserInfo.path, headless: true, args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'] });
  const pages = [];
  try {
    for (const url of urls) pages.push(await analyzePage(browser, url, device));
  } finally {
    await browser.close();
  }

  const totalBytes = pages.reduce((sum, page) => sum + page.totalTransferBytes, 0);
  const totalRequests = pages.reduce((sum, page) => sum + page.requestCount, 0);
  const aggregateBreakdown = pages.reduce((out, page) => {
    for (const [key, value] of Object.entries(page.breakdown)) out[key] = (out[key] || 0) + value;
    return out;
  }, {});
  const allResources = pages.flatMap((page) => page.resources.map((resource) => ({ ...resource, pageUrl: page.finalUrl })));
  const findingMap = new Map();
  for (const page of pages) {
    for (const finding of page.findings) {
      const key = `${finding.category}|${finding.title}`;
      if (!findingMap.has(key)) findingMap.set(key, { ...finding, pages: [], occurrences: 0 });
      const item = findingMap.get(key); item.pages.push(page.finalUrl); item.occurrences += 1;
    }
  }

  return {
    reportType: 'asset-page-weight',
    projectName,
    baseUrl: parsedBase.href.replace(/\/$/, ''),
    device,
    browser: browserInfo,
    generatedAt: new Date().toISOString(),
    pages,
    summary: {
      pageCount: pages.length,
      totalBytes,
      averageBytes: pages.length ? totalBytes / pages.length : 0,
      averageRequests: pages.length ? totalRequests / pages.length : 0,
      totalRequests,
      thirdPartyBytes: pages.reduce((sum, page) => sum + page.thirdPartyBytes, 0),
      breakdown: aggregateBreakdown
    },
    largestAssets: allResources.sort((a, b) => b.transferBytes - a.transferBytes).slice(0, 30),
    findings: [...findingMap.values()].sort((a, b) => {
      const rank = { high: 3, medium: 2, low: 1 };
      return (rank[b.severity] || 0) - (rank[a.severity] || 0) || b.occurrences - a.occurrences;
    })
  };
}
