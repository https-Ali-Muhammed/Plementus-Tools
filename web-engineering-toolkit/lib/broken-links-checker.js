import dns from 'node:dns/promises';
import net from 'node:net';
import { detectBrowsers } from './environment-checker.js';
import { TOOL_VERSION } from './tool-version.js';

export const BROKEN_LINKS_SCHEMA_VERSION = '1.0.0';

const DEFAULTS = Object.freeze({
  maxPages: 25,
  maxTargets: 2000,
  timeoutMs: 10000,
  concurrency: 6,
  perHostConcurrency: 2,
  maxRedirects: 8,
  maxRuntimeMs: 120000
});

const LIMITS = Object.freeze({
  maxPages: [1, 100],
  maxTargets: [1, 5000],
  timeoutMs: [100, 30000],
  concurrency: [1, 12],
  maxRedirects: [0, 12]
});

const SENSITIVE_QUERY = /^(?:token|access_token|auth|authorization|session|session_id|key|api_key|code|signature|sig|jwt)$/i;
const UNSAFE_ACTION = /(?:^|[\/_-])(?:logout|log-out|signout|sign-out|delete|remove|unsubscribe|confirm|checkout|payment|pay)(?:[\/_-]|$)/i;
const REDACTED = '[REDACTED]';

function boundedInteger(value, fallback, [minimum, maximum], label) {
  const number = value == null || value === '' ? fallback : Number(value);
  if (!Number.isInteger(number) || number < minimum || number > maximum) {
    throw new Error(`${label} must be an integer from ${minimum} to ${maximum}.`);
  }
  return number;
}

function httpUrl(value, baseUrl, label = 'URL') {
  let url;
  try { url = new URL(String(value || '').trim(), baseUrl); } catch { throw new Error(`${label} must be a valid URL.`); }
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error(`${label} must use http:// or https://.`);
  if (url.username || url.password) throw new Error(`${label} must not contain URL credentials.`);
  return url;
}

function cleanStartingPages(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(/\r?\n/);
  const pages = [...new Set(source.map((item) => String(item || '').trim()).filter(Boolean))];
  return pages.length ? pages : ['/'];
}

function cleanIgnorePatterns(value) {
  const source = Array.isArray(value) ? value : String(value || '').split(/\r?\n/);
  const patterns = [...new Set(source.map((item) => String(item || '').trim()).filter(Boolean))];
  if (patterns.length > 20) throw new Error('Ignore URL patterns are limited to 20 entries.');
  if (patterns.some((pattern) => pattern.length > 200)) throw new Error('Each ignore URL pattern is limited to 200 characters.');
  return patterns;
}

export function validateBrokenLinksInput(input = {}) {
  const projectName = String(input.projectName || '').trim();
  if (projectName.length < 2 || projectName.length > 120) throw new Error('Project name must contain 2 to 120 characters.');
  const base = httpUrl(input.baseUrl, undefined, 'Base URL');
  base.hash = '';
  const startingPages = cleanStartingPages(input.startingPages ?? input.paths);
  for (const page of startingPages) httpUrl(page, base, 'Starting page');
  if (startingPages.length > 100) throw new Error('Starting pages are limited to 100 entries.');
  return {
    projectName,
    baseUrl: base.href.replace(/\/$/, ''),
    startingPages,
    scanScope: input.scanScope === 'crawl' ? 'crawl' : 'selected',
    checkExternal: input.checkExternal !== false,
    checkFragments: input.checkFragments !== false,
    checkResources: input.checkResources !== false,
    preferredBrowserPath: String(input.preferredBrowserPath || '').trim(),
    maxPages: boundedInteger(input.maxPages, DEFAULTS.maxPages, LIMITS.maxPages, 'Maximum pages'),
    maxTargets: boundedInteger(input.maxTargets, DEFAULTS.maxTargets, LIMITS.maxTargets, 'Maximum unique targets'),
    timeoutMs: boundedInteger(input.timeoutMs, DEFAULTS.timeoutMs, LIMITS.timeoutMs, 'Request timeout'),
    concurrency: boundedInteger(input.concurrency, DEFAULTS.concurrency, LIMITS.concurrency, 'Concurrency'),
    perHostConcurrency: Math.min(DEFAULTS.perHostConcurrency, boundedInteger(input.concurrency, DEFAULTS.concurrency, LIMITS.concurrency, 'Concurrency')),
    maxRedirects: boundedInteger(input.maxRedirects, DEFAULTS.maxRedirects, LIMITS.maxRedirects, 'Maximum redirects'),
    ignorePatterns: cleanIgnorePatterns(input.ignorePatterns),
    maxRuntimeMs: DEFAULTS.maxRuntimeMs
  };
}

export function classifyBrokenLinkStatus(status) {
  const value = Number(status) || 0;
  if (value >= 200 && value < 300) return 'healthy';
  if ([404, 410].includes(value)) return 'broken';
  if ([401, 403].includes(value)) return 'restricted';
  if (value === 429) return 'rate_limited';
  if (value >= 400 && value < 500) return 'client_error';
  if (value >= 500 && value < 600) return 'server_error';
  return 'failed_to_check';
}

export function redactBrokenLinkUrl(value) {
  const raw = String(value || '');
  try {
    const url = new URL(raw);
    url.username = '';
    url.password = '';
    for (const key of [...url.searchParams.keys()]) {
      if (SENSITIVE_QUERY.test(key)) url.searchParams.set(key, REDACTED);
    }
    return url.href;
  } catch {
    return raw.replace(/\/\/[^/@\s]+@/g, '//[REDACTED]@');
  }
}

function networkIdentity(value) {
  const url = new URL(value);
  url.hash = '';
  return url.href;
}

function targetIdentity(value) {
  const url = new URL(value);
  const fragment = url.hash;
  url.hash = '';
  return `${url.href}${fragment}`;
}

function safeDecodeFragment(hash) {
  try { return decodeURIComponent(String(hash || '').replace(/^#/, '')); } catch { return String(hash || '').replace(/^#/, ''); }
}

function isPrivateIp(address) {
  const version = net.isIP(address);
  if (version === 4) {
    const [a, b] = address.split('.').map(Number);
    return a === 0 || a === 10 || a === 127 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || a >= 224;
  }
  if (version === 6) {
    const normalized = address.toLowerCase().split('%')[0];
    return normalized === '::' || normalized === '::1' || normalized.startsWith('fc') || normalized.startsWith('fd') || normalized.startsWith('fe8') || normalized.startsWith('fe9') || normalized.startsWith('fea') || normalized.startsWith('feb') || normalized.startsWith('ff');
  }
  return false;
}

async function destinationSafety(url, baseHostname) {
  const parsed = new URL(url);
  if (!['http:', 'https:'].includes(parsed.protocol)) return { allowed: false, reason: 'non_http' };
  if (parsed.username || parsed.password) return { allowed: false, reason: 'url_credentials_rejected' };
  const hostname = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, '');
  let addresses;
  try {
    addresses = net.isIP(hostname) ? [{ address: hostname }] : await dns.lookup(hostname, { all: true, verbatim: true });
  } catch (error) {
    return { allowed: true, resolutionError: error };
  }
  const privateDestination = addresses.some(({ address }) => isPrivateIp(address));
  if (privateDestination && hostname !== baseHostname) return { allowed: false, reason: 'private_network_target_rejected' };
  return { allowed: true };
}

function globMatches(url, patterns) {
  return patterns.some((pattern) => {
    const escaped = pattern.replace(/[.+?^${}()|[\]\\]/g, '\\$&').replaceAll('*', '.*');
    return new RegExp(escaped, 'i').test(url);
  });
}

function referenceTypeFor(tagName, attribute, rel = '', as = '') {
  const tag = String(tagName || '').toLowerCase();
  if (attribute === 'poster') return 'image';
  if (tag === 'a') return 'link';
  if (tag === 'img') return 'image';
  if (tag === 'script') return 'script';
  if (tag === 'iframe') return 'iframe';
  if (['video', 'audio', 'source'].includes(tag)) return 'media';
  if (tag === 'link') {
    const relations = String(rel).toLowerCase().split(/\s+/);
    if (relations.includes('stylesheet')) return 'stylesheet';
    if (relations.includes('manifest')) return 'manifest';
    if (relations.includes('icon')) return 'image';
    if (relations.some((item) => ['preload', 'modulepreload'].includes(item))) {
      if (as === 'font') return 'font';
      if (as === 'image') return 'image';
      if (as === 'script' || relations.includes('modulepreload')) return 'script';
      if (as === 'style') return 'stylesheet';
      if (['audio', 'video'].includes(as)) return 'media';
      return 'preload';
    }
  }
  return 'other_resource';
}

async function extractRenderedReferences(page) {
  return page.evaluate(() => {
    const output = [];
    const push = (element, attribute, value) => {
      if (!value) return;
      output.push({ tagName: element.tagName.toLowerCase(), attribute, value, rel: element.getAttribute('rel') || '', as: element.getAttribute('as') || '', text: element.tagName === 'A' ? String(element.textContent || '').replace(/\s+/g, ' ').trim().slice(0, 240) : '' });
    };
    const srcset = (element, attribute) => String(element.getAttribute(attribute) || '').split(',').map((part) => part.trim().split(/\s+/)[0]).filter(Boolean).forEach((value) => push(element, attribute, value));
    document.querySelectorAll('a[href]').forEach((element) => push(element, 'href', element.getAttribute('href')));
    document.querySelectorAll('img[src]').forEach((element) => push(element, 'src', element.getAttribute('src')));
    document.querySelectorAll('img[srcset]').forEach((element) => srcset(element, 'srcset'));
    document.querySelectorAll('script[src]').forEach((element) => push(element, 'src', element.getAttribute('src')));
    document.querySelectorAll('link[href]').forEach((element) => {
      const rel = String(element.getAttribute('rel') || '').toLowerCase().split(/\s+/);
      if (rel.some((item) => ['stylesheet', 'icon', 'preload', 'modulepreload', 'manifest'].includes(item))) push(element, 'href', element.getAttribute('href'));
    });
    document.querySelectorAll('iframe[src],source[src],video[src],video[poster],audio[src]').forEach((element) => {
      for (const attribute of ['src', 'poster']) push(element, attribute, element.getAttribute(attribute));
    });
    document.querySelectorAll('source[srcset]').forEach((element) => srcset(element, 'srcset'));
    return { references: output, anchors: [...new Set([...document.querySelectorAll('[id],[name]')].flatMap((element) => [element.id, element.getAttribute('name')]).filter(Boolean))], title: document.title || '' };
  });
}

function outcomeRank(outcome) {
  return ({ broken: 0, fragment_missing: 1, server_error: 2, unreachable: 3, failed_to_check: 4, client_error: 5, redirected: 6, restricted: 7, rate_limited: 8, skipped: 9, healthy: 10 })[outcome] ?? 11;
}

async function fetchOnce(url, method, timeoutMs) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { method, redirect: 'manual', signal: controller.signal, headers: { 'User-Agent': `WebEngineeringToolkit/${TOOL_VERSION} BrokenLinksChecker`, Accept: '*/*' } });
  } finally {
    clearTimeout(timer);
  }
}

async function checkHttpTarget(rawUrl, config, baseHostname) {
  let current = rawUrl;
  const redirectChain = [];
  let method = 'HEAD';
  let usedFallback = false;
  try {
    for (let hop = 0; hop <= config.maxRedirects; hop += 1) {
      const safety = await destinationSafety(current, baseHostname);
      if (!safety.allowed) return { outcome: 'skipped', status: 0, finalUrl: redactBrokenLinkUrl(current), redirectChain, checkMethod: 'safety_check', failureReason: safety.reason };
      let response = await fetchOnce(current, method, config.timeoutMs);
      if (method === 'HEAD' && [405, 501].includes(response.status)) {
        try { await response.body?.cancel(); } catch {}
        method = 'GET';
        usedFallback = true;
        response = await fetchOnce(current, method, config.timeoutMs);
      }
      const status = response.status;
      if (status >= 300 && status < 400) {
        const location = response.headers.get('location');
        try { await response.body?.cancel(); } catch {}
        if (!location) return { outcome: 'failed_to_check', status, finalUrl: redactBrokenLinkUrl(current), redirectChain, checkMethod: usedFallback ? 'head_get_fallback' : 'head', failureReason: 'redirect_without_location' };
        const next = new URL(location, current).href;
        redirectChain.push({ url: redactBrokenLinkUrl(current), status, location: redactBrokenLinkUrl(next) });
        if (hop === config.maxRedirects) return { outcome: 'failed_to_check', status, finalUrl: redactBrokenLinkUrl(current), redirectChain, checkMethod: usedFallback ? 'head_get_fallback' : 'head', failureReason: 'redirect_limit_reached' };
        current = next;
        continue;
      }
      try { await response.body?.cancel(); } catch {}
      const outcome = classifyBrokenLinkStatus(status);
      return { outcome: redirectChain.length && outcome === 'healthy' ? 'redirected' : outcome, status, finalUrl: redactBrokenLinkUrl(current), redirectChain, checkMethod: usedFallback ? 'head_get_fallback' : method.toLowerCase(), failureReason: '' };
    }
  } catch (error) {
    const message = error?.name === 'AbortError' ? `Timed out after ${config.timeoutMs} ms` : String(error?.message || 'Network request failed');
    return { outcome: 'unreachable', status: 0, finalUrl: redactBrokenLinkUrl(current), redirectChain, checkMethod: usedFallback ? 'head_get_fallback' : method.toLowerCase(), failureReason: message.slice(0, 300) };
  }
  return { outcome: 'failed_to_check', status: 0, finalUrl: redactBrokenLinkUrl(current), redirectChain, checkMethod: 'head', failureReason: 'No result was established.' };
}

async function mapWithHostLimit(items, config, worker) {
  const pending = [...items];
  const activeHosts = new Map();
  const results = new Array(items.length);
  let active = 0;
  await new Promise((resolve) => {
    const schedule = () => {
      if (!pending.length && active === 0) return resolve();
      let started = false;
      while (active < config.concurrency) {
        const position = pending.findIndex(({ host }) => (activeHosts.get(host) || 0) < config.perHostConcurrency);
        if (position < 0) break;
        const item = pending.splice(position, 1)[0];
        active += 1;
        activeHosts.set(item.host, (activeHosts.get(item.host) || 0) + 1);
        started = true;
        Promise.resolve(worker(item)).then((value) => { results[item.index] = value; }).finally(() => {
          active -= 1;
          activeHosts.set(item.host, Math.max(0, (activeHosts.get(item.host) || 1) - 1));
          schedule();
        });
      }
      if (!started && !active && pending.length) throw new Error('Could not schedule bounded target checks.');
    };
    schedule();
  });
  return results;
}

export async function checkBrokenLinksAndResources(input = {}) {
  const config = validateBrokenLinksInput(input);
  let chromium;
  try { ({ chromium } = await import('playwright-core')); } catch { throw new Error('Playwright Core is required for rendered link discovery.'); }
  const browsers = await detectBrowsers();
  const browserInfo = config.preferredBrowserPath ? browsers.find((item) => item.path === config.preferredBrowserPath) : browsers[0];
  if (!browserInfo) throw new Error('Chrome, Chromium or Brave is required for Broken Links & Resources Checker.');

  const base = new URL(config.baseUrl);
  const startedAt = Date.now();
  const requestedPages = config.startingPages.map((value) => httpUrl(value, base, 'Starting page').href);
  const queue = [...new Set(requestedPages)];
  const queued = new Set(queue.map(networkIdentity));
  const pages = [];
  const occurrences = [];
  const observations = new Map();
  const anchorDocuments = new Map();
  const browser = await chromium.launch({ executablePath: browserInfo.path, headless: true, args: ['--disable-dev-shm-usage', '--no-first-run', '--no-default-browser-check'] });
  try {
    while (queue.length && pages.length < config.maxPages && Date.now() - startedAt < config.maxRuntimeMs) {
      const requestedUrl = queue.shift();
      const pageSafety = await destinationSafety(requestedUrl, base.hostname.toLowerCase());
      if (!pageSafety.allowed) {
        pages.push({ requestedUrl: redactBrokenLinkUrl(requestedUrl), finalUrl: redactBrokenLinkUrl(requestedUrl), title: '', status: 0, durationMs: 0, referenceCount: 0, error: pageSafety.reason });
        continue;
      }
      const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, serviceWorkers: 'block', ignoreHTTPSErrors: false });
      await context.route('**/*', async (route) => {
        const requestUrl = route.request().url();
        if (!/^https?:/i.test(requestUrl)) return route.continue();
        const safety = await destinationSafety(requestUrl, base.hostname.toLowerCase());
        return safety.allowed ? route.continue() : route.abort('blockedbyclient');
      });
      const page = await context.newPage();
      const runtimeFailures = [];
      page.on('response', (response) => {
        const request = response.request();
        const url = networkIdentity(response.url());
        observations.set(url, { outcome: classifyBrokenLinkStatus(response.status()), status: response.status(), finalUrl: redactBrokenLinkUrl(response.url()), redirectChain: [], checkMethod: 'browser_get', failureReason: '', resourceType: request.resourceType() });
      });
      page.on('requestfailed', (request) => {
        if (!/^https?:/i.test(request.url())) return;
        const failureReason = String(request.failure()?.errorText || 'Browser request failed').slice(0, 300);
        runtimeFailures.push({ url: request.url(), resourceType: request.resourceType(), failureReason });
        const identity = networkIdentity(request.url());
        if (!observations.get(identity)?.status) observations.set(identity, { outcome: 'unreachable', status: 0, finalUrl: redactBrokenLinkUrl(request.url()), redirectChain: [], checkMethod: 'browser_runtime', failureReason, resourceType: request.resourceType() });
      });
      const pageStarted = Date.now();
      let response = null;
      let error = '';
      try {
        response = await page.goto(requestedUrl, { waitUntil: 'domcontentloaded', timeout: Math.max(config.timeoutMs, 1000) });
        await page.waitForTimeout(120);
      } catch (caught) {
        error = String(caught?.message || 'Page render failed').slice(0, 300);
      }
      const finalUrl = page.url() || requestedUrl;
      let rendered = { references: [], anchors: [], title: '' };
      try { rendered = await extractRenderedReferences(page); } catch {}
      const publicSourceUrl = redactBrokenLinkUrl(finalUrl);
      pages.push({ requestedUrl: redactBrokenLinkUrl(requestedUrl), finalUrl: publicSourceUrl, title: rendered.title, status: response?.status() || 0, durationMs: Date.now() - pageStarted, referenceCount: rendered.references.length + runtimeFailures.length, error });
      const anchorSet = new Set(rendered.anchors);
      anchorDocuments.set(networkIdentity(requestedUrl), anchorSet);
      anchorDocuments.set(networkIdentity(finalUrl), anchorSet);

      const addOccurrence = (rawValue, meta) => {
        const raw = String(rawValue || '').trim();
        if (!raw || occurrences.length >= config.maxTargets * 20) return;
        let resolved;
        try { resolved = new URL(raw, finalUrl); } catch {
          occurrences.push({ sourcePageUrl: publicSourceUrl, targetUrl: raw.slice(0, 1000), rawTargetUrl: '', referenceType: meta.referenceType, attribute: meta.attribute, linkText: meta.text || '', fragment: '', safetyReason: 'malformed_url' });
          return;
        }
        const schemeAllowed = ['http:', 'https:'].includes(resolved.protocol);
        const safetyReason = !schemeAllowed ? 'non_http' : (resolved.username || resolved.password ? 'url_credentials_rejected' : (globMatches(resolved.href, config.ignorePatterns) ? 'ignored_pattern' : (meta.referenceType === 'link' && UNSAFE_ACTION.test(`${resolved.pathname}${resolved.search}`) ? 'safety_sensitive_navigation' : '')));
        occurrences.push({ sourcePageUrl: publicSourceUrl, targetUrl: redactBrokenLinkUrl(resolved.href), rawTargetUrl: resolved.href, referenceType: meta.referenceType, attribute: meta.attribute, linkText: String(meta.text || '').slice(0, 240), fragment: safeDecodeFragment(resolved.hash), safetyReason });
        if (config.scanScope === 'crawl' && meta.referenceType === 'link' && !safetyReason && resolved.origin === base.origin && pages.length + queue.length < config.maxPages) {
          const identity = networkIdentity(resolved.href);
          if (!queued.has(identity)) { queued.add(identity); queue.push(identity); }
        }
      };
      for (const reference of rendered.references) {
        const referenceType = referenceTypeFor(reference.tagName, reference.attribute, reference.rel, reference.as);
        if (!config.checkResources && referenceType !== 'link') continue;
        addOccurrence(reference.value, { ...reference, referenceType });
      }
      for (const failure of runtimeFailures) {
        if (!config.checkResources) continue;
        addOccurrence(failure.url, { referenceType: ['image', 'script', 'stylesheet', 'font', 'media', 'iframe'].includes(failure.resourceType) ? failure.resourceType : 'other_resource', attribute: 'runtime', text: '' });
      }
      await context.close();
    }
  } finally {
    await browser.close();
  }

  const targetMap = new Map();
  for (const occurrence of occurrences) {
    const identity = occurrence.rawTargetUrl ? targetIdentity(occurrence.rawTargetUrl) : `invalid:${occurrence.targetUrl}`;
    if (!targetMap.has(identity)) {
      if (targetMap.size >= config.maxTargets) continue;
      targetMap.set(identity, { identity, rawTargetUrl: occurrence.rawTargetUrl, targetUrl: occurrence.targetUrl, occurrences: [], referenceTypes: new Set(), safetyReason: occurrence.safetyReason });
    }
    const target = targetMap.get(identity);
    target.occurrences.push({ sourcePageUrl: occurrence.sourcePageUrl, targetUrl: occurrence.targetUrl, referenceType: occurrence.referenceType, attribute: occurrence.attribute, linkText: occurrence.linkText, fragment: occurrence.fragment });
    target.referenceTypes.add(occurrence.referenceType);
    if (!target.safetyReason && occurrence.safetyReason) target.safetyReason = occurrence.safetyReason;
  }

  const networkChecks = new Map();
  const work = [];
  for (const target of targetMap.values()) {
    if (!target.rawTargetUrl || target.safetyReason) continue;
    const parsed = new URL(target.rawTargetUrl);
    if (!['http:', 'https:'].includes(parsed.protocol)) continue;
    const identity = networkIdentity(parsed.href);
    if (networkChecks.has(identity)) continue;
    const external = parsed.origin !== base.origin;
    if (external && !config.checkExternal) { networkChecks.set(identity, { outcome: 'skipped', status: 0, finalUrl: redactBrokenLinkUrl(parsed.href), redirectChain: [], checkMethod: 'scope_filter', failureReason: 'external_checks_disabled' }); continue; }
    const observed = observations.get(identity);
    if (observed) { networkChecks.set(identity, observed); continue; }
    work.push({ index: work.length, host: parsed.host, identity, rawUrl: identity });
  }
  const checked = await mapWithHostLimit(work, config, (item) => checkHttpTarget(item.rawUrl, config, base.hostname.toLowerCase()));
  work.forEach((item, index) => networkChecks.set(item.identity, checked[index]));

  const targets = [];
  for (const target of targetMap.values()) {
    let check;
    let internal = false;
    let fragment = '';
    if (!target.rawTargetUrl || target.safetyReason) {
      check = { outcome: 'skipped', status: 0, finalUrl: target.targetUrl, redirectChain: [], checkMethod: 'not_requested', failureReason: target.safetyReason || 'malformed_url' };
    } else {
      const parsed = new URL(target.rawTargetUrl);
      internal = parsed.origin === base.origin;
      fragment = safeDecodeFragment(parsed.hash);
      check = { ...(networkChecks.get(networkIdentity(parsed.href)) || { outcome: 'failed_to_check', status: 0, finalUrl: redactBrokenLinkUrl(parsed.href), redirectChain: [], checkMethod: 'none', failureReason: 'No network result was available.' }) };
      if (fragment && config.checkFragments && ['healthy', 'redirected'].includes(check.outcome)) {
        const anchors = anchorDocuments.get(networkIdentity(parsed.href));
        if (anchors) {
          if (!anchors.has(fragment)) check = { ...check, outcome: 'fragment_missing', failureReason: `Rendered document does not contain fragment #${fragment}.` };
        } else {
          check = { ...check, outcome: 'failed_to_check', failureReason: 'Fragment target was not rendered within bounded page scope.' };
        }
      }
    }
    const referenceTypes = [...target.referenceTypes].sort();
    targets.push({
      targetUrl: target.targetUrl,
      referenceType: referenceTypes.length === 1 ? referenceTypes[0] : 'multiple',
      referenceTypes,
      internal,
      outcome: check.outcome,
      httpStatus: check.status || 0,
      finalUrl: check.finalUrl || target.targetUrl,
      redirectCount: check.redirectChain?.length || 0,
      redirectChain: check.redirectChain || [],
      checkMethod: check.checkMethod || 'none',
      failureReason: check.failureReason || '',
      fragment,
      networkTarget: Boolean(target.rawTargetUrl && /^https?:/i.test(target.rawTargetUrl)),
      occurrenceCount: target.occurrences.length,
      sourcePages: [...new Set(target.occurrences.map((item) => item.sourcePageUrl))],
      occurrences: target.occurrences
    });
  }
  targets.sort((a, b) => outcomeRank(a.outcome) - outcomeRank(b.outcome) || a.targetUrl.localeCompare(b.targetUrl));
  const count = (outcome) => targets.filter((target) => target.outcome === outcome).length;
  const unavailableOutcomes = new Set(['client_error', 'restricted', 'rate_limited', 'server_error', 'unreachable', 'failed_to_check', 'fragment_missing']);
  const summary = {
    pagesScanned: pages.length,
    uniqueTargets: targets.length,
    occurrences: targets.reduce((sum, target) => sum + target.occurrenceCount, 0),
    healthy: count('healthy'),
    broken: count('broken') + count('fragment_missing'),
    httpBroken: count('broken'),
    fragmentMissing: count('fragment_missing'),
    redirected: count('redirected'),
    unavailable: targets.filter((target) => unavailableOutcomes.has(target.outcome)).length,
    externalTargets: targets.filter((target) => !target.internal && target.networkTarget).length,
    skipped: count('skipped')
  };
  const publicLimits = { maxPages: config.maxPages, maxTargets: config.maxTargets, timeoutMs: config.timeoutMs, concurrency: config.concurrency, perHostConcurrency: config.perHostConcurrency, maxRedirects: config.maxRedirects, pageLimitReached: queue.length > 0 || (config.scanScope === 'crawl' && pages.length >= config.maxPages), targetLimitReached: targetMap.size >= config.maxTargets, runtimeLimitReached: Date.now() - startedAt >= config.maxRuntimeMs };
  return {
    schemaVersion: BROKEN_LINKS_SCHEMA_VERSION,
    reportType: 'broken-links-resources',
    projectName: config.projectName,
    baseUrl: redactBrokenLinkUrl(config.baseUrl),
    generatedAt: new Date().toISOString(),
    durationMs: Date.now() - startedAt,
    browser: { name: browserInfo.name, path: browserInfo.path, version: browserInfo.version || '' },
    scope: { mode: config.scanScope, startingPages: requestedPages.map(redactBrokenLinkUrl), checkExternal: config.checkExternal, checkFragments: config.checkFragments, checkResources: config.checkResources, ignorePatternCount: config.ignorePatterns.length },
    limits: publicLimits,
    summary,
    pages,
    targets
  };
}
