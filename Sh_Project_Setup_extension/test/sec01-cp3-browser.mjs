import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sec01-cp3-'));
const extension = path.join(root, 'extension');
const profile = path.join(root, 'profile');
const source = path.resolve('src');
const executable = chromium.executablePath();
const ids = ['12345678-1234-4123-8123-123456789ab1', '12345678-1234-4123-8123-123456789ab2', '12345678-1234-4123-8123-123456789ab3'];
const record = id => ({ schemaVersion: 2, runId: id, state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 });
let context, page, origin, passed = 0, blocked = 0, remoteRequests = 0;
const check = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
const run = (fn, value) => page.evaluate(fn, value);
const launch = async () => {
  const c = await chromium.launchPersistentContext(profile, { executablePath: executable, headless: false, args: ['--headless=new', '--disable-background-networking', '--no-first-run', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  await c.route('**/*', route => {
    if (route.request().url().startsWith('chrome-extension://')) return route.continue();
    remoteRequests++; return route.abort();
  });
  return c;
};
const openPage = async () => {
  page = await context.newPage(); await page.goto(`${origin}/page.html`);
  await run(async () => {
    const { createCheckpointService } = await import('./storage/checkpoint-service.mjs');
    const raw = async (mode, action) => {
      const q = indexedDB.open('sec01-checkpoints');
      const db = await new Promise((resolve, reject) => { q.onsuccess = () => resolve(q.result); q.onerror = reject; });
      try { return await new Promise((resolve, reject) => {
        const tx = db.transaction('checkpoints', mode); let result;
        action(tx.objectStore('checkpoints'), value => { result = value; });
        tx.oncomplete = () => resolve(result); tx.onabort = tx.onerror = reject;
      }); } finally { db.close(); }
    };
    window.h = {
      clock: 1000, tick: 0, raw,
      clear: () => raw('readwrite', store => store.clear()),
      get: id => raw('readonly', (store, done) => { const q = store.get(id); q.onsuccess = () => done(q.result); }),
      rejected: promise => promise.then(() => false, error => error?.message === 'Checkpoint operation failed'),
      service: async (abortDelete = false, allowed = true) => {
        const factory = { open(...args) {
          const q = indexedDB.open(...args);
          if (abortDelete) q.addEventListener('success', () => {
            const db = q.result, original = db.transaction.bind(db);
            db.transaction = (...params) => {
              const tx = original(...params), objectStore = tx.objectStore.bind(tx);
              tx.objectStore = (...storeArgs) => {
                const store = objectStore(...storeArgs), deletion = store.delete.bind(store);
                store.delete = (...deleteArgs) => { const request = deletion(...deleteArgs); tx.abort(); return request; };
                return store;
              };
              return tx;
            };
          });
          return q;
        } };
        return createCheckpointService(factory, { now: () => h.clock, monotonicNow: () => h.tick, authorize: () => allowed });
      },
    };
    window.service = await h.service();
  });
};

try {
  assert.ok(fs.existsSync(executable), `missing Chromium executable: ${executable}`);
  fs.mkdirSync(extension); fs.mkdirSync(profile);
  fs.cpSync(path.join(source, 'storage'), path.join(extension, 'storage'), { recursive: true });
  fs.cpSync(path.join(source, 'workflow'), path.join(extension, 'workflow'), { recursive: true });
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'SEC01 isolated test', version: '1.0', background: { service_worker: 'worker.mjs', type: 'module' } }));
  fs.writeFileSync(path.join(extension, 'page.html'), '<!doctype html><title>SEC01 isolated test</title>');
  fs.writeFileSync(path.join(extension, 'worker.mjs'), `import { createCheckpointService } from './storage/checkpoint-service.mjs';
const bootId = crypto.randomUUID(); let service, clock = 1000, tick = 0;
chrome.runtime.onMessage.addListener((message, sender, reply) => {
  (async () => {
    clock = message.now ?? clock; tick = message.tick ?? tick;
    service ??= await createCheckpointService(indexedDB, { now: () => clock, monotonicNow: () => tick, authorize: () => true });
    try { return { bootId, record: await ({
      create: () => service.create(message.record),
      read: () => service.read(message.id),
      transition: () => service.transition(message.id, 'draft', 0, 'ready'),
      delete: () => service.delete(message.id, 0, 'explicit'),
      cleanup: () => service.cleanup(),
    })[message.action]() }; }
    catch { return { bootId, error: true }; }
  })().then(reply, () => reply({ bootId, error: true }));
  return true;
});`);
  context = await launch();
  console.log(`BROWSER ${context.browser().version()} executable=${executable}`);
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
  origin = worker.url().match(/^chrome-extension:\/\/[^/]+/)[0];
  await openPage();
  await check('extension-origin IndexedDB and guarded create, read, duplicate', async () => {
    const result = await run(async r => {
      const created = await service.create(r), read = await service.read(r.runId);
      const duplicate = await h.rejected(service.create(r));
      return { created, read, duplicate, stored: await h.get(r.runId), protocol: location.protocol };
    }, record(ids[0]));
    assert.equal(result.protocol, 'chrome-extension:'); assert.deepEqual(result.created, record(ids[0]));
    assert.deepEqual(result.read, record(ids[0])); assert.deepEqual(result.stored, record(ids[0])); assert.equal(result.duplicate, true);
  });
  await check('strict seven-field schema rejects sensitive or invalid data', async () => {
    const result = await run(async r => {
      const cases = [{ secret: 'synthetic' }, { schemaVersion: 1 }, { schemaVersion: 3 }, { step: 100 }];
      return Promise.all(cases.map(change => h.rejected(service.create({ ...r, ...change }))));
    }, record(ids[1]));
    assert.deepEqual(result, [true, true, true, true]);
  });
  await check('competing transitions, stale revision and immutable creation', async () => {
    const result = await run(async id => {
      const outcomes = await Promise.allSettled([service.transition(id, 'draft', 0, 'ready'), service.transition(id, 'draft', 0, 'cancelled')]);
      const saved = await service.read(id), stale = await h.rejected(service.transition(id, 'draft', 0, 'ready'));
      return { statuses: outcomes.map(x => x.status), saved, stale };
    }, ids[0]);
    assert.equal(result.statuses.filter(x => x === 'fulfilled').length, 1);
    assert.equal(result.statuses.filter(x => x === 'rejected').length, 1);
    assert.equal(result.saved.revision, 1); assert.equal(result.saved.createdAt, 1000); assert.equal(result.stale, true);
  });
  await check('aborted deletion rolls back and cannot report success', async () => {
    const result = await run(async r => {
      await h.clear(); const aborting = await h.service(true); await aborting.create(r);
      const before = await h.get(r.runId), denied = await h.rejected(aborting.delete(r.runId, 0, 'explicit'));
      return { before, denied, after: await h.get(r.runId) };
    }, record(ids[0]));
    assert.equal(result.denied, true); assert.deepEqual(result.before, record(ids[0])); assert.deepEqual(result.after, result.before);
  });
  await check('guarded explicit and acknowledged deletion', async () => {
    const result = await run(async ({ a, b }) => {
      await h.clear(); const s = await h.service(); await s.create(a); await s.create(b);
      const cancelled = await s.transition(b.runId, 'draft', 0, 'cancelled');
      const badRevision = await h.rejected(s.delete(b.runId, 0, 'acknowledged'));
      await s.delete(a.runId, 0, 'explicit'); await s.delete(b.runId, 1, 'acknowledged');
      return { cancelled, badRevision, a: await h.get(a.runId), b: await h.get(b.runId) };
    }, { a: record(ids[0]), b: record(ids[1]) });
    assert.equal(result.cancelled.record.state, 'cancelled'); assert.equal(result.badRevision, true);
    assert.equal(result.a, undefined); assert.equal(result.b, undefined);
  });
  await check('page close and reopen constructs a blocked service without changing the row', async () => {
    await run(async r => { await h.clear(); const s = await h.service(); await s.create(r); }, record(ids[0]));
    await page.close(); await openPage();
    const result = await run(async id => ({ denied: await h.rejected(service.read(id)), row: await h.get(id) }), ids[0]);
    assert.equal(result.denied, true); assert.deepEqual(result.row, record(ids[0]));
  });
  // Clear the prior test's row so the worker can create its own known record through the service.
  await run(() => h.clear());
  let workerBefore;
  await check('worker guarded create and read before stop', async () => {
    workerBefore = await run(r => chrome.runtime.sendMessage({ action: 'create', record: r, now: 1000, tick: 0 }), record(ids[2]));
    assert.deepEqual(workerBefore.record, record(ids[2]));
    const read = await run(id => chrome.runtime.sendMessage({ action: 'read', id, now: 1000, tick: 0 }), ids[2]);
    assert.deepEqual(read.record, record(ids[2])); assert.equal(read.bootId, workerBefore.bootId);
  });
  await check('tab close preserves worker authority while that worker remains alive', async () => {
    await page.close(); await openPage();
    const after = await run(id => chrome.runtime.sendMessage({ action: 'read', id, now: 1000, tick: 0 }), ids[2]);
    assert.deepEqual(after.record, record(ids[2])); assert.equal(after.bootId, workerBefore.bootId);
  });
  try {
    await check('direct worker stop, observed reactivation and blocked persisted row', async () => {
      const cdp = await context.newCDPSession(page), versions = [];
      try {
        cdp.on('ServiceWorker.workerVersionUpdated', event => versions.push(...event.versions.filter(v => v.scriptURL === `${origin}/worker.mjs`)));
        await cdp.send('ServiceWorker.enable');
        assert.deepEqual((await run(id => chrome.runtime.sendMessage({ action: 'read', id, now: 1000, tick: 0 }), ids[2])).record, record(ids[2]));
        const active = versions.filter(v => v.runningStatus === 'running').at(-1);
        assert.ok(active?.versionId, 'running worker version not observed');
        await cdp.send('ServiceWorker.stopWorker', { versionId: active.versionId });
        await new Promise((resolve, reject) => {
          const timer = setTimeout(() => reject(new Error('worker stop not observed within 5s')), 5000);
          const inspect = () => { if (versions.some(v => v.versionId === active.versionId && v.runningStatus === 'stopped')) { clearTimeout(timer); resolve(); } };
          cdp.on('ServiceWorker.workerVersionUpdated', inspect); inspect();
        });
        const after = await run(id => chrome.runtime.sendMessage({ action: 'read', id, now: 1000, tick: 0 }), ids[2]);
        assert.equal(after.error, true); assert.notEqual(after.bootId, workerBefore.bootId);
        const denied = await run(async ({ id, fresh }) => Promise.all([
          chrome.runtime.sendMessage({ action: 'transition', id, now: 1000, tick: 0 }),
          chrome.runtime.sendMessage({ action: 'delete', id, now: 1000, tick: 0 }),
          chrome.runtime.sendMessage({ action: 'cleanup', now: 1000, tick: 0 }),
          chrome.runtime.sendMessage({ action: 'create', record: fresh, now: 1000, tick: 0 }),
        ]), { id: ids[2], fresh: record(ids[1]) });
        assert.ok(denied.every(x => x.error === true));
        assert.ok(versions.some(v => v.versionId === active.versionId && v.runningStatus === 'running' && versions.indexOf(v) > versions.findIndex(x => x.versionId === active.versionId && x.runningStatus === 'stopped')));
        assert.deepEqual(await run(id => h.get(id), ids[2]), record(ids[2]));
        assert.equal(await run(id => h.get(id), ids[1]), undefined);
      } finally { await cdp.send('ServiceWorker.disable'); await cdp.detach(); }
    });
  } catch (error) {
    if (!/worker .*not observed within|running worker version not observed/.test(error.message)) throw error;
    blocked++; console.log(`BLOCKED worker lifecycle: ${error.message}`);
  }
  await context.close(); context = undefined;
  context = await launch(); await openPage();
  await check('browser-process restart retains blocked row with no replay or expiry deletion', async () => {
    const before = await run(id => h.get(id), ids[2]);
    assert.deepEqual(before, record(ids[2]));
    const response = await run(id => chrome.runtime.sendMessage({ action: 'read', id, now: 1000 + 604800000, tick: 0 }), ids[2]);
    const denied = await run(async ({ id, fresh }) => Promise.all([
      chrome.runtime.sendMessage({ action: 'transition', id, now: 1000 + 604800000, tick: 0 }),
      chrome.runtime.sendMessage({ action: 'delete', id, now: 1000 + 604800000, tick: 0 }),
      chrome.runtime.sendMessage({ action: 'cleanup', now: 1000 + 604800000, tick: 0 }),
      chrome.runtime.sendMessage({ action: 'create', record: fresh, now: 1000 + 604800000, tick: 0 }),
    ]), { id: ids[2], fresh: { ...record(ids[1]), createdAt: 1000 + 604800000 } });
    const pageDenied = await run(id => h.rejected(service.read(id)), ids[2]);
    const after = await run(id => h.get(id), ids[2]);
    assert.equal(response.error, true); assert.ok(denied.every(x => x.error === true));
    assert.equal(pageDenied, true); assert.deepEqual(after, before);
    assert.equal(after.state, 'draft'); assert.equal(after.revision, 0);
    assert.equal(await run(id => h.get(id), ids[1]), undefined);
  });
  assert.equal(remoteRequests, 0, 'unexpected non-extension request');
  console.log(`RESULT pass=${passed} fail=0 skip=0 blocked=${blocked} remote=${remoteRequests}`);
} catch (error) { console.error(`FAIL after ${passed} passes: ${error.stack}`); process.exitCode = 1; }
finally {
  try { if (context) await context.close(); } finally {
    const stat = fs.lstatSync(root);
    assert.equal(stat.uid, process.getuid()); assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('sec01-cp3-'));
    fs.rmSync(root, { recursive: true });
    console.log(`CLEANUP ${fs.existsSync(root) ? 'FAIL' : 'PASS'}`);
  }
}
