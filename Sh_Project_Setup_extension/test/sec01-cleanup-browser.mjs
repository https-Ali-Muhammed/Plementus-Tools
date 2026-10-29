import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sec01-cleanup-'));
const extension = path.join(root, 'extension');
const profile = path.join(root, 'profile');
const executable = chromium.executablePath();
const day7 = 604800000;
const ids = ['12345678-1234-4123-8123-123456789ab1', '12345678-1234-4123-8123-123456789ab2', '12345678-1234-4123-8123-123456789ab3'];
const record = (runId, createdAt = 1000) => ({ schemaVersion: 2, runId, state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt });
let context, page, origin, passed = 0, blocked = 0;
const check = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
const run = (fn, value) => page.evaluate(fn, value);
const launch = async () => {
  const browser = await chromium.launchPersistentContext(profile, { executablePath: executable, headless: false, args: ['--headless=new', '--disable-background-networking', '--no-first-run', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  await browser.route('**/*', route => route.request().url().startsWith('chrome-extension://') ? route.continue() : route.abort());
  return browser;
};
const openPage = async () => {
  page = await context.newPage();
  await page.goto(`${origin}/page.html`);
  await run(async () => {
    const { createCheckpointService } = await import('./storage/checkpoint-service.mjs');
    const open = () => new Promise((resolve, reject) => { const q = indexedDB.open('sec01-checkpoints'); q.onsuccess = () => resolve(q.result); q.onerror = reject; });
    const raw = async (mode, action) => { const db = await open(); try { return await new Promise((resolve, reject) => { const tx = db.transaction('checkpoints', mode); let result; action(tx.objectStore('checkpoints'), value => { result = value; }); tx.oncomplete = () => resolve(result); tx.onabort = tx.onerror = reject; }); } finally { db.close(); } };
    window.h = {
      raw,
      clear: () => raw('readwrite', store => store.clear()),
      put: value => raw('readwrite', store => store.put(value)),
      get: id => raw('readonly', (store, done) => { const q = store.get(id); q.onsuccess = () => done(q.result); }),
      clock: 1000,
      events: [],
      rejected: promise => promise.then(() => false, () => true),
      async service() {
        const events = this.events;
        const factory = { open(...args) {
          const q = indexedDB.open(...args);
          q.addEventListener('success', () => {
            const db = q.result, original = db.transaction.bind(db);
            db.transaction = (...params) => {
              const tx = original(...params);
              events.push(`start:${params[1]}`);
              tx.addEventListener('complete', () => events.push(`complete:${params[1]}`));
              tx.addEventListener('abort', () => events.push(`abort:${params[1]}`));
              return tx;
            };
          });
          return q;
        } };
        return createCheckpointService(factory, { now: () => this.clock, authorize: () => true });
      },
    };
    await h.service();
  });
};

try {
  assert.ok(fs.existsSync(executable), `missing Chrome executable: ${executable}`);
  fs.mkdirSync(extension); fs.mkdirSync(profile);
  const source = path.resolve('src');
  fs.cpSync(path.join(source, 'storage'), path.join(extension, 'storage'), { recursive: true });
  fs.cpSync(path.join(source, 'workflow'), path.join(extension, 'workflow'), { recursive: true });
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'SEC01 cleanup isolated test', version: '1.0', background: { service_worker: 'worker.mjs', type: 'module' } }));
  fs.writeFileSync(path.join(extension, 'page.html'), '<!doctype html><title>SEC01 isolated test</title>');
  fs.writeFileSync(path.join(extension, 'worker.mjs'), `import { createCheckpointService } from './storage/checkpoint-service.mjs';
const bootId = crypto.randomUUID();
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  (async () => {
    const service = await createCheckpointService(indexedDB, { now: () => message.now, authorize: () => true });
    try { return { bootId, record: await service.read(message.id) }; }
    catch { return { bootId, error: true }; }
  })().then(reply, () => reply({ bootId, error: true }));
  return true;
});`);
  context = await launch();
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
  origin = worker.url().match(/^chrome-extension:\/\/[^/]+/)[0];
  console.log(`BROWSER ${context.browser().version()} executable=${executable}`);
  await openPage();

  await check('initialization and first operation cleanup ordering', async () => {
    const result = await run(async ({ id, r }) => {
      await h.put(r); const service = await h.service();
      const value = await service.read(id);
      return { value, events: h.events.slice(), stores: await new Promise((resolve, reject) => { const q = indexedDB.open('sec01-checkpoints'); q.onsuccess = () => { const names = [...q.result.objectStoreNames]; q.result.close(); resolve(names); }; q.onerror = reject; }) };
    }, { id: ids[0], r: record(ids[0]) });
    assert.deepEqual(result.value, record(ids[0]));
    assert.deepEqual(result.stores, ['checkpoints']);
    assert.deepEqual(result.events, ['start:readwrite', 'complete:readwrite', 'start:readonly', 'complete:readonly']);
  });
  await check('repeated operations do not cache cleanup success', async () => {
    const events = await run(async id => { h.events.length = 0; const service = await h.service(); await service.read(id); await service.read(id); return h.events.slice(); }, ids[0]);
    assert.deepEqual(events, ['start:readwrite','complete:readwrite','start:readonly','complete:readonly','start:readwrite','complete:readwrite','start:readonly','complete:readonly']);
  });
  await check('exact expiry, immutable creation and physical absence', async () => {
    const result = await run(async ({ id, day7 }) => {
      const service = await h.service(); h.clock = 1000 + day7 - 1;
      const before = await service.transition(id, 'draft', 0, 'ready');
      const eligible = await service.read(id);
      h.clock++;
      const denied = await h.rejected(service.transition(id, 'ready', 1, 'running'));
      const absent = await h.get(id);
      const unreadable = await h.rejected(service.read(id));
      return { before, eligible, denied, absent, unreadable };
    }, { id: ids[0], day7 });
    assert.equal(result.before.record.createdAt, 1000);
    assert.equal(result.eligible.createdAt, 1000);
    assert.equal(result.eligible.revision, 1);
    assert.equal(result.denied, true); assert.equal(result.absent, undefined); assert.equal(result.unreadable, true);
  });
  await check('multiple expiry deletions commit atomically and preserve fresh row', async () => {
    const result = await run(async ({ ids, day7 }) => {
      await h.clear(); await h.put({ schemaVersion: 2, runId: ids[0], state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 });
      await h.put({ schemaVersion: 2, runId: ids[1], state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 });
      await h.put({ schemaVersion: 2, runId: ids[2], state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 + day7 });
      h.clock = 1000 + day7; h.events.length = 0;
      const service = await h.service(); const count = await service.cleanup();
      return { count, events: h.events.slice(), rows: await Promise.all(ids.map(id => h.get(id))) };
    }, { ids, day7 });
    assert.equal(result.count, 2);
    assert.deepEqual(result.events, ['start:readwrite','complete:readwrite']);
    assert.equal(result.rows[0], undefined); assert.equal(result.rows[1], undefined);
    assert.deepEqual(result.rows[2], record(ids[2], 1000 + day7));
  });
  await check('later legacy row aborts prior staged deletion and blocks access', async () => {
    const result = await run(async ({ ids }) => {
      await h.clear(); await h.put({ schemaVersion: 2, runId: ids[0], state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 });
      await h.put({ schemaVersion: 1, runId: ids[1], state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 });
      h.events.length = 0; const service = await h.service();
      const denied = await h.rejected(service.read(ids[0]));
      return { denied, events: h.events.slice(), first: await h.get(ids[0]), legacy: await h.get(ids[1]) };
    }, { ids });
    assert.equal(result.denied, true);
    assert.deepEqual(result.events, ['start:readwrite','abort:readwrite']);
    assert.deepEqual(result.first, record(ids[0]));
    assert.equal(result.legacy.schemaVersion, 1);
  });
  await check('concurrent callers share failed cleanup; later request retries without replay', async () => {
    const result = await run(async ({ ids }) => {
      h.events.length = 0; const service = await h.service();
      const calls = await Promise.allSettled([service.read(ids[0]), service.transition(ids[0], 'draft', 0, 'ready'), service.delete(ids[0], 0, 'explicit')]);
      const firstEvents = h.events.slice(); const stillThere = await h.get(ids[0]);
      await h.raw('readwrite', store => store.delete(ids[1]));
      h.events.length = 0; const retry = await h.rejected(service.read(ids[0]));
      return { statuses: calls.map(x => x.status), firstEvents, stillThere, retry, retryEvents: h.events.slice(), absent: await h.get(ids[0]) };
    }, { ids });
    assert.deepEqual(result.statuses, ['rejected','rejected','rejected']);
    assert.deepEqual(result.firstEvents, ['start:readwrite','abort:readwrite']);
    assert.deepEqual(result.stillThere, record(ids[0]));
    assert.equal(result.retry, true); assert.deepEqual(result.retryEvents, ['start:readwrite','complete:readwrite','start:readonly','abort:readonly']);
    assert.equal(result.absent, undefined);
  });
  await check('concurrent successful callers wait for one committed cleanup', async () => {
    const result = await run(async ({ ids, day7 }) => {
      await h.clear(); await h.put({ schemaVersion: 2, runId: ids[0], state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 + day7 });
      h.events.length = 0; const service = await h.service();
      const rows = await Promise.all([service.read(ids[0]), service.read(ids[0])]);
      return { rows, events: h.events.slice() };
    }, { ids, day7 });
    assert.deepEqual(result.rows, [record(ids[0], 1000 + day7), record(ids[0], 1000 + day7)]);
    assert.deepEqual(result.events.slice(0, 2), ['start:readwrite','complete:readwrite']);
    assert.equal(result.events.filter(x => x === 'start:readwrite').length, 1);
    assert.equal(result.events.filter(x => x === 'start:readonly').length, 2);
  });
  await check('competing transition expected-state and revision guards', async () => {
    const result = await run(async id => {
      const service = await h.service();
      const outcomes = await Promise.allSettled([service.transition(id, 'draft', 0, 'ready'), service.transition(id, 'draft', 0, 'cancelled')]);
      const saved = await service.read(id);
      const stale = await h.rejected(service.transition(id, 'draft', 0, 'ready'));
      return { statuses: outcomes.map(x => x.status), saved, stale };
    }, ids[0]);
    assert.equal(result.statuses.filter(x => x === 'fulfilled').length, 1);
    assert.equal(result.statuses.filter(x => x === 'rejected').length, 1);
    assert.equal(result.saved.revision, 1); assert.equal(result.saved.createdAt, 1000 + day7); assert.equal(result.stale, true);
  });
  await check('invalid and backward clock samples fail closed', async () => {
    const result = await run(async id => {
      const service = await h.service(); h.clock = NaN;
      const invalid = await h.rejected(service.read(id));
      h.clock = undefined; const unavailable = await h.rejected(service.read(id));
      h.clock = 1000 + 604800000 + 1; await service.read(id);
      h.clock--; const backward = await h.rejected(service.read(id));
      return { invalid, unavailable, backward, retained: await h.get(id) };
    }, ids[0]);
    assert.equal(result.invalid, true); assert.equal(result.unavailable, true); assert.equal(result.backward, true); assert.equal(result.retained.revision, 1);
  });

  try {
    await check('direct MV3 worker stop and first post-reactivation cleanup', async () => {
      await run(async id => { await h.clear(); h.clock = 1000; await h.put({ schemaVersion: 2, runId: id, state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 }); }, ids[0]);
      const cdp = await context.newCDPSession(page), versions = [];
      cdp.on('ServiceWorker.workerVersionUpdated', event => versions.push(...event.versions.filter(v => v.scriptURL === `${origin}/worker.mjs`)));
      await cdp.send('ServiceWorker.enable');
      const before = await run(({ id }) => chrome.runtime.sendMessage({ id, now: 1000 }), { id: ids[0] });
      assert.deepEqual(before.record, record(ids[0]));
      const active = versions.filter(v => v.runningStatus === 'running').at(-1);
      assert.ok(active?.versionId, 'worker running version not observed');
      await cdp.send('ServiceWorker.stopWorker', { versionId: active.versionId });
      await new Promise((resolve, reject) => {
        const timer = setTimeout(() => reject(new Error('worker stop not observed within 5s')), 5000);
        const inspect = () => { if (versions.some(v => v.versionId === active.versionId && v.runningStatus === 'stopped')) { clearTimeout(timer); resolve(); } };
        cdp.on('ServiceWorker.workerVersionUpdated', inspect); inspect();
      });
      const after = await run(({ id, now }) => chrome.runtime.sendMessage({ id, now }), { id: ids[0], now: 1000 + day7 });
      assert.equal(after.error, true); assert.notEqual(after.bootId, before.bootId);
      assert.equal(await run(id => h.get(id), ids[0]), undefined);
      await cdp.send('ServiceWorker.disable'); await cdp.detach();
    });
  } catch (error) { blocked++; console.log(`BLOCKED worker lifecycle: ${error.message}`); }

  await run(async id => { await h.clear(); await h.put({ schemaVersion: 2, runId: id, state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 }); }, ids[0]);
  await context.close(); context = undefined;
  context = await launch(); await openPage();
  await check('browser-process restart, first service execution, expired absence', async () => {
    assert.deepEqual(await run(id => h.get(id), ids[0]), record(ids[0]));
    const result = await run(({ id, now }) => chrome.runtime.sendMessage({ id, now }), { id: ids[0], now: 1000 + day7 + 1 });
    assert.equal(result.error, true);
    assert.equal(await run(id => h.get(id), ids[0]), undefined);
    assert.equal(await run(async id => { h.clock = 1000 + 604800000; const service = await h.service(); return h.rejected(service.read(id)); }, ids[0]), true);
  });
  console.log(`RESULT pass=${passed} fail=0 skip=0 blocked=${blocked}`);
} catch (error) { console.error(`FAIL after ${passed} passes: ${error.stack}`); process.exitCode = 1; }
finally {
  if (context) await context.close();
  const stat = fs.lstatSync(root);
  assert.equal(stat.uid, process.getuid()); assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('sec01-cleanup-'));
  fs.rmSync(root, { recursive: true });
  console.log(`CLEANUP ${fs.existsSync(root) ? 'FAIL' : 'PASS'}`);
}
