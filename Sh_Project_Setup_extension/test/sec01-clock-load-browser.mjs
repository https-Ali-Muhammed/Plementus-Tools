import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { Worker } from 'node:worker_threads';
import { classifyBracket, classifyPair } from './sec01-clock-source-browser.mjs';

const BATCHES = 10;
const BATCH_SIZE = 2000;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));

function distribution(values) {
  if (!values.length) return null;
  values.sort((a, b) => a - b);
  return { min: values[0], p50: values[Math.floor((values.length - 1) * 0.5)],
    p90: values[Math.floor((values.length - 1) * 0.9)],
    p99: values[Math.floor((values.length - 1) * 0.99)], max: values.at(-1) };
}

function summarize(samples) {
  const widths = [], steps = [], wallSteps = [], consecutive = [], firstToCurrent = [];
  const counts = { total: samples.length, validBrackets: 0, wideBrackets: 0, invalidBrackets: 0,
    consecutiveComparable: 0, consecutiveExcluded: 0, consecutiveOver1_1ms: 0,
    firstComparable: 0, firstExcluded: 0, firstOver1_1ms: 0,
    wallRollback: 0, monotonicRegression: 0 };
  for (let i = 0; i < samples.length; i++) {
    const bracket = classifyBracket(samples[i]);
    if (bracket.status === 'invalid') counts.invalidBrackets++;
    else {
      widths.push(bracket.width);
      counts[bracket.status === 'wide' ? 'wideBrackets' : 'validBrackets']++;
    }
    if (!i) continue;
    const step = samples[i].before - samples[i - 1].before;
    if (Number.isFinite(step) && step > 0) steps.push(step);
    const wallStep = samples[i].wall - samples[i - 1].wall;
    if (Number.isFinite(wallStep) && wallStep > 0) wallSteps.push(wallStep);
    for (const [previous, comparable, excluded, over, values] of [
      [samples[i - 1], 'consecutiveComparable', 'consecutiveExcluded', 'consecutiveOver1_1ms', consecutive],
      [samples[0], 'firstComparable', 'firstExcluded', 'firstOver1_1ms', firstToCurrent]
    ]) {
      const pair = classifyPair(previous, samples[i]);
      if (pair.status === 'invalid') counts[excluded]++;
      else if (pair.status === 'wall_rollback' || pair.status === 'monotonic_regression') {
        if (comparable === 'consecutiveComparable') counts[pair.status === 'wall_rollback' ? 'wallRollback' : 'monotonicRegression']++;
        counts[excluded]++;
      } else {
        counts[comparable]++;
        values.push(pair.discrepancy);
        if (pair.status === 'forward_excess') counts[over]++;
      }
    }
  }
  assert.equal(counts.validBrackets + counts.wideBrackets + counts.invalidBrackets, counts.total);
  assert.equal(counts.consecutiveComparable + counts.consecutiveExcluded, Math.max(0, counts.total - 1));
  assert.equal(counts.firstComparable + counts.firstExcluded, Math.max(0, counts.total - 1));
  return { counts, widthMs: distribution(widths), consecutiveDiscrepancyMs: distribution(consecutive),
    firstDiscrepancyMs: distribution(firstToCurrent), positiveBeforeStepMs: distribution(steps),
    positiveWallStepMs: distribution(wallSteps),
    positiveBracketWidthMs: distribution(widths.filter(width => width > 0)) };
}

// Check the exclusion arithmetic before measuring a real worker.
const synthetic = summarize([
  { before: 0, wall: 1000, after: 0 },
  { before: 2, wall: 1002, after: 4 },
  { before: 5, wall: 1005, after: 5 },
  { before: 6, wall: 1008, after: 6 }
]);
assert.equal(synthetic.counts.wideBrackets, 1);
assert.equal(synthetic.counts.consecutiveExcluded, 2);
assert.equal(synthetic.counts.consecutiveComparable, 1);
assert.equal(synthetic.counts.consecutiveOver1_1ms, 1);
assert.equal(synthetic.counts.firstExcluded, 1);
assert.equal(synthetic.counts.firstComparable, 2);

let root, context, activityPage;
const burners = [];
let remote = 0;
try {
  const { chromium } = await import('playwright');
  const executable = chromium.executablePath();
  assert.ok(fs.existsSync(executable), `installed Chromium missing: ${executable}`);
  root = fs.mkdtempSync(path.join(os.tmpdir(), 'sec01-clock-load-'));
  const extension = path.join(root, 'extension'), profile = path.join(root, 'profile');
  fs.mkdirSync(extension); fs.mkdirSync(profile);
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3,
    name: 'SEC01 clock load observation', version: '1.0', background: { service_worker: 'worker.mjs' } }));
  fs.writeFileSync(path.join(extension, 'page.html'), '<!doctype html><title>SEC01 clock load</title><main></main>');
  fs.writeFileSync(path.join(extension, 'worker.mjs'), `chrome.runtime.onMessage.addListener((message, sender, reply) => {
  const samples = [];
  for (let i = 0; i < message.count; i++) {
    const before = performance.now(), wall = Date.now(), after = performance.now();
    samples.push({ before, wall, after });
  }
  reply(samples);
});`);
  context = await chromium.launchPersistentContext(profile, { executablePath: executable, headless: false,
    args: ['--headless=new', '--disable-background-networking', '--no-first-run',
      `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  await context.route('**/*', route => {
    if (route.request().url().startsWith('chrome-extension://')) return route.continue();
    remote++;
    return route.abort();
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
  const origin = worker.url().match(/^chrome-extension:\/\/[^/]+/)?.[0];
  assert.ok(origin, 'extension worker origin unavailable');
  const page = await context.newPage();
  await page.goto(`${origin}/page.html`);
  console.log(`ENV ${JSON.stringify({ chromium: context.browser().version(), executable,
    os: `${os.type()} ${os.release()}`, architecture: os.arch(), availableParallelism: os.availableParallelism(),
    node: process.version, batches: BATCHES, batchSize: BATCH_SIZE })}`);
  for (const scenario of ['idle_light', 'page_activity', 'cpu_contention']) {
    if (scenario === 'page_activity') {
      activityPage = await context.newPage();
      await activityPage.goto(`${origin}/page.html`);
      await activityPage.evaluate(() => {
        window.activity = { ticks: 0, done: false };
        const end = performance.now() + 3500;
        function tick() {
          const until = performance.now() + 4;
          while (performance.now() < until) Math.sqrt(window.activity.ticks + 1);
          document.querySelector('main').textContent = String(++window.activity.ticks);
          if (performance.now() < end) setTimeout(tick, 0);
          else window.activity.done = true;
        }
        tick();
      });
    }
    if (scenario === 'cpu_contention') {
      for (let i = 0; i < 4; i++) burners.push(new Worker(`const { parentPort } = require('node:worker_threads');
        const end = performance.now() + 3500; let iterations = 0;
        while (performance.now() < end) { Math.sqrt(++iterations); }
        parentPort.postMessage(iterations);`, { eval: true }));
      await Promise.all(burners.map(burner => new Promise(resolve => burner.once('online', resolve))));
    }
    const samples = [];
    for (let batch = 0; batch < BATCHES; batch++) {
      samples.push(...await page.evaluate(count => chrome.runtime.sendMessage({ count }), BATCH_SIZE));
      await pause(100);
    }
    assert.equal(samples.length, BATCHES * BATCH_SIZE, `${scenario} sample count`);
    const activity = activityPage && scenario === 'page_activity'
      ? await activityPage.evaluate(() => ({ ...window.activity })) : undefined;
    console.log(`SCENARIO ${JSON.stringify({ scenario, activity, ...summarize(samples) })}`);
    if (activityPage) { await activityPage.close(); activityPage = undefined; }
    if (burners.length) { await Promise.all(burners.splice(0).map(burner => burner.terminate())); }
  }
  assert.equal(remote, 0, 'external page requests');
  console.log(`RESULT pass=3 fail=0 remote=${remote}`);
} catch (error) {
  process.exitCode = 1;
  console.error(`FAIL ${error.stack}`);
} finally {
  await Promise.allSettled(burners.splice(0).map(burner => burner.terminate()));
  if (activityPage) await activityPage.close().catch(error => console.error(`CLOSE ${error.message}`));
  if (context) await context.close().catch(error => { process.exitCode = 1; console.error(`CLOSE ${error.message}`); });
  if (root) {
    assert.equal(path.dirname(root), os.tmpdir());
    assert.ok(path.basename(root).startsWith('sec01-clock-load-'));
    fs.rmSync(root, { recursive: true });
    assert.ok(!fs.existsSync(root), 'owned profile cleanup');
    console.log('CLEANUP PASS');
  }
}
