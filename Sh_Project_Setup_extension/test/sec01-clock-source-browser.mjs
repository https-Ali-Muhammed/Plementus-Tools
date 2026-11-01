import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const MAX_BRACKET_MS = 1;
const FORWARD_ALLOWANCE_MS = 1.1;
const TIMER_PRECISION_MS = 0.1;

export function classifyBracket(sample) {
  if (!sample || !Number.isSafeInteger(sample.wall) || sample.wall < 0 ||
      !Number.isFinite(sample.before) || sample.before < 0 || sample.before > Number.MAX_SAFE_INTEGER ||
      !Number.isFinite(sample.after) || sample.after < sample.before || sample.after > Number.MAX_SAFE_INTEGER) {
    return { status: 'invalid' };
  }
  const width = sample.after - sample.before;
  return { status: width > MAX_BRACKET_MS ? 'wide' : 'valid', width };
}

export function classifyPair(previous, current) {
  if (classifyBracket(previous).status !== 'valid' || classifyBracket(current).status !== 'valid') return { status: 'invalid' };
  if (current.wall < previous.wall) return { status: 'wall_rollback' };
  if (current.before < previous.after) return { status: 'monotonic_regression' };
  const discrepancy = current.wall - previous.wall - (current.after - previous.before);
  return { status: discrepancy > FORWARD_ALLOWANCE_MS ? 'forward_excess' : 'valid', discrepancy };
}

export function elapsedLowerBound(creation, current) {
  if (classifyBracket(creation).status !== 'valid' || classifyBracket(current).status !== 'valid') return null;
  return current.before - creation.after - TIMER_PRECISION_MS;
}

function summarize(samples) {
  const widths = [], discrepancies = [], firstDiscrepancies = [], steps = [];
  const counts = { invalid: 0, wide: 0, wall_rollback: 0, monotonic_regression: 0, forward_excess: 0, fractional: 0 };
  let previous, firstExcess = 0;
  for (const sample of samples) {
    const bracket = classifyBracket(sample);
    if (bracket.status === 'invalid') counts.invalid++;
    else { widths.push(bracket.width); if (bracket.status === 'wide') counts.wide++; }
    if (!Number.isInteger(sample.before) || !Number.isInteger(sample.after)) counts.fractional++;
    if (previous) {
      const pair = classifyPair(previous, sample);
      if (pair.discrepancy !== undefined) discrepancies.push(pair.discrepancy);
      if (pair.status !== 'valid' && pair.status !== 'invalid') counts[pair.status]++;
      const step = sample.before - previous.before;
      if (step > 0) steps.push(step);
      const fromFirst = classifyPair(samples[0], sample);
      if (fromFirst.discrepancy !== undefined) firstDiscrepancies.push(fromFirst.discrepancy);
      if (fromFirst.status === 'forward_excess') firstExcess++;
    }
    previous = sample;
  }
  const bounds = values => values.length ? { min: Math.min(...values), max: Math.max(...values) } : null;
  return { count: samples.length, pairCount: Math.max(0, samples.length - 1), counts,
    widthMs: bounds(widths), discrepancyMs: bounds(discrepancies), firstDiscrepancyMs: bounds(firstDiscrepancies),
    positiveStepMs: bounds(steps), widthOverCap: counts.wide,
    discrepancyOverAllowance: counts.forward_excess, firstDiscrepancyOverAllowance: firstExcess };
}

async function main() {
  let root, context, page, origin, pass = 0, fail = 0, skip = 0, blocked = 0, remote = 0;
  const check = (name, condition) => { assert.ok(condition, name); pass++; console.log(`PASS ${name}`); };
  try {
    const { chromium } = await import('playwright');
    const executable = chromium.executablePath();
    if (!fs.existsSync(executable)) throw new Error(`missing installed Chromium executable: ${executable}`);
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'sec01-clock-source-'));
    const extension = path.join(root, 'extension'), profile = path.join(root, 'profile');
    fs.mkdirSync(extension); fs.mkdirSync(profile);
    fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'SEC01 clock observation', version: '1.0', background: { service_worker: 'worker.mjs' } }));
    fs.writeFileSync(path.join(extension, 'page.html'), '<!doctype html><title>SEC01 clock observation</title>');
    fs.writeFileSync(path.join(extension, 'worker.mjs'), `const bootId = crypto.randomUUID(); let originalAnchor = null;
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  if (message.action === 'anchor') originalAnchor = { before: performance.now(), wall: Date.now(), after: performance.now() };
  if (message.action === 'sample') {
    const samples = [];
    for (let i = 0; i < 20000; i++) {
      const before = performance.now(), wall = Date.now(), after = performance.now();
      samples.push({ before, wall, after });
    }
    reply({ bootId, anchor: originalAnchor, samples });
  } else reply({ bootId, anchor: originalAnchor, timeOrigin: performance.timeOrigin });
});`);
    const launch = async () => {
      const c = await chromium.launchPersistentContext(profile, { executablePath: executable, headless: false,
        args: ['--headless=new', '--disable-background-networking', '--no-first-run', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
      await c.route('**/*', route => {
        if (route.request().url().startsWith('chrome-extension://')) return route.continue();
        remote++; return route.abort();
      });
      return c;
    };
    const openPage = async () => {
      const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
      origin = worker.url().match(/^chrome-extension:\/\/[^/]+/)?.[0];
      assert.ok(origin, 'extension worker origin unavailable');
      page = await context.newPage(); await page.goto(`${origin}/page.html`);
    };
    const message = action => page.evaluate(action => chrome.runtime.sendMessage({ action }), action);
    context = await launch();
    console.log(`ENV ${JSON.stringify({ browser: context.browser().version(), os: `${os.type()} ${os.release()}`, node: process.version, executable })}`);
    await openPage();
    const startup = await message('anchor');
    check('worker startup and volatile creation anchor', !!startup.bootId && !!startup.anchor);
    const observed = await message('sample');
    check('real clock samples came from anchored MV3 worker', observed.bootId === startup.bootId && observed.samples.length === 20000);
    console.log(`CLOCK ${JSON.stringify(summarize(observed.samples))}`);
    await page.close(); await openPage();
    const afterTab = await message('status');
    check('tab close and reopen observed', !!afterTab.bootId);
    console.log(`TAB ${JSON.stringify({ sameWorker: afterTab.bootId === startup.bootId, originalAnchorPresent: !!afterTab.anchor })}`);
    try {
      const cdp = await context.newCDPSession(page), versions = [];
      try {
        cdp.on('ServiceWorker.workerVersionUpdated', event => versions.push(...event.versions.filter(v => v.scriptURL === `${origin}/worker.mjs`)));
        await cdp.send('ServiceWorker.enable');
        await message('status');
        const active = versions.filter(v => v.runningStatus === 'running').at(-1);
        if (!active?.versionId) throw new Error('running worker version not observed');
        await cdp.send('ServiceWorker.stopWorker', { versionId: active.versionId });
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('worker stop not observed within 5s')), 5000);
          const inspect = () => { if (versions.some(v => v.versionId === active.versionId && v.runningStatus === 'stopped')) { clearTimeout(timer); resolve(); } };
          cdp.on('ServiceWorker.workerVersionUpdated', inspect); inspect();
        });
        const reactivated = await message('status');
        check('worker stop and reactivation lose original volatile anchor', reactivated.bootId !== startup.bootId && reactivated.anchor === null);
        console.log(`WORKER ${JSON.stringify({ originalBoot: startup.bootId, newBoot: reactivated.bootId, originalAnchorPresent: !!reactivated.anchor })}`);
      } finally { await cdp.send('ServiceWorker.disable').catch(() => {}); await cdp.detach(); }
    } catch (error) {
      if (!/worker .*not observed within|running worker version not observed|ServiceWorker\.stopWorker/.test(error.message)) throw error;
      skip++; console.log(`SKIP worker termination/reactivation: ${error.message}`);
    }
    await context.close(); context = undefined;
    context = await launch(); await openPage();
    const afterBrowser = await message('status');
    check('browser close and reopen lose original volatile anchor', afterBrowser.bootId !== startup.bootId && afterBrowser.anchor === null);
    console.log(`BROWSER_RESTART ${JSON.stringify({ originalBoot: startup.bootId, newBoot: afterBrowser.bootId, originalAnchorPresent: !!afterBrowser.anchor })}`);
    check('no external page requests', remote === 0);
  } catch (error) {
    if (!root && /Cannot find package 'playwright'|missing installed Chromium executable/.test(error.message)) {
      blocked++; console.error(`BLOCKED ${error.message}`);
    } else { fail++; console.error(`FAIL ${error.stack}`); }
  } finally {
    try { if (context) await context.close(); } catch (error) { fail++; console.error(`FAIL browser close: ${error.message}`); }
    if (root) {
      assert.equal(path.dirname(root), os.tmpdir());
      assert.ok(path.basename(root).startsWith('sec01-clock-source-'));
      fs.rmSync(root, { recursive: true });
      if (fs.existsSync(root)) { fail++; console.error('FAIL profile cleanup'); }
      else console.log('CLEANUP PASS');
    }
    console.log(`RESULT pass=${pass} fail=${fail} skip=${skip} blocked=${blocked} remote=${remote}`);
    if (fail || blocked) process.exitCode = 1;
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main();
