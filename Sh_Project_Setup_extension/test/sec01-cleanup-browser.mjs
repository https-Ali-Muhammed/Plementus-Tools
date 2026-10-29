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
let context, page, passed = 0, remoteRequests = 0;
const check = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
const run = (fn, value) => page.evaluate(fn, value);

try {
  assert.ok(fs.existsSync(executable), `missing Chromium executable: ${executable}`);
  fs.mkdirSync(extension); fs.mkdirSync(profile);
  const source = path.resolve('src');
  fs.cpSync(path.join(source, 'storage'), path.join(extension, 'storage'), { recursive: true });
  fs.cpSync(path.join(source, 'workflow'), path.join(extension, 'workflow'), { recursive: true });
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'SEC01 isolated test', version: '1.0', background: { service_worker: 'worker.mjs', type: 'module' } }));
  fs.writeFileSync(path.join(extension, 'page.html'), '<!doctype html><title>SEC01 isolated test</title>');
  fs.writeFileSync(path.join(extension, 'worker.mjs'), 'chrome.runtime.onMessage.addListener(() => {});');
  context = await chromium.launchPersistentContext(profile, { executablePath: executable, headless: false, args: ['--headless=new', '--disable-background-networking', '--no-first-run', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
  await context.route('**/*', route => {
    if (route.request().url().startsWith('chrome-extension://')) return route.continue();
    remoteRequests++; return route.abort();
  });
  const worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
  const origin = worker.url().match(/^chrome-extension:\/\/[^/]+/)[0];
  console.log(`BROWSER ${context.browser().version()} executable=${executable}`);
  page = await context.newPage(); await page.goto(`${origin}/page.html`);
  await run(async () => {
    const { createCheckpointService } = await import('./storage/checkpoint-service.mjs');
    const raw = async (mode, action) => {
      const request = indexedDB.open('sec01-checkpoints');
      const db = await new Promise((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = reject; });
      try { return await new Promise((resolve, reject) => {
        const tx = db.transaction('checkpoints', mode); let result;
        action(tx.objectStore('checkpoints'), value => { result = value; });
        tx.oncomplete = () => resolve(result); tx.onabort = tx.onerror = reject;
      }); } finally { db.close(); }
    };
    window.h = {
      clock: 1000, tick: 0, events: [],
      raw, get: id => raw('readonly', (store, done) => { const q = store.get(id); q.onsuccess = () => done(q.result); }),
      rejected: promise => promise.then(() => false, error => error?.message === 'Checkpoint operation failed'),
      async service(allowed = true) {
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
        return createCheckpointService(factory, { now: () => this.clock, monotonicNow: () => this.tick, authorize: () => allowed });
      },
      async reset() { await raw('readwrite', store => store.clear()); this.clock = 1000; this.tick = 0; this.events.length = 0; },
    };
    await h.service();
  });

  await check('extension origin and seven-field guarded create', async () => {
    const result = await run(async r => {
      const service = await h.service(); const created = await service.create(r); const read = await service.read(r.runId);
      return { created, read, stored: await h.get(r.runId), events: h.events.slice(), origin: location.protocol };
    }, record(ids[0]));
    assert.equal(result.origin, 'chrome-extension:');
    assert.deepEqual(result.created, record(ids[0])); assert.deepEqual(result.read, record(ids[0]));
    assert.deepEqual(result.stored, record(ids[0])); assert.equal(Object.keys(result.stored).length, 7);
    assert.deepEqual(result.events.slice(0, 4), ['start:readwrite', 'complete:readwrite', 'start:readwrite', 'complete:readwrite']);
  });
  await check('each bounded operation has a committed cleanup gate', async () => {
    const events = await run(async id => {
      await h.reset(); const service = await h.service(); await service.create({ schemaVersion: 2, runId: id, state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 });
      h.events.length = 0; await service.read(id); await service.read(id); return h.events.slice();
    }, ids[0]);
    assert.deepEqual(events, ['start:readwrite','complete:readwrite','start:readonly','complete:readonly','start:readwrite','complete:readwrite','start:readonly','complete:readonly']);
  });
  await check('concurrent successful reads share one committed cleanup', async () => {
    const result = await run(async r => {
      await h.reset(); const service = await h.service(); await service.create(r);
      h.events.length = 0; const rows = await Promise.all([service.read(r.runId), service.read(r.runId)]);
      return { rows, events: h.events.slice() };
    }, record(ids[0]));
    assert.deepEqual(result.rows, [record(ids[0]), record(ids[0])]);
    assert.deepEqual(result.events.slice(0, 2), ['start:readwrite', 'complete:readwrite']);
    assert.equal(result.events.filter(x => x === 'start:readwrite').length, 1);
    assert.equal(result.events.filter(x => x === 'start:readonly').length, 2);
  });
  await check('concurrent failed cleanup blocks callers and stays blocked after corrupt-row removal', async () => {
    const result = await run(async ({ a, b }) => {
      await h.reset(); const service = await h.service(); await service.create(a);
      await h.raw('readwrite', store => store.put({ ...b, schemaVersion: 1 }));
      h.events.length = 0;
      const calls = await Promise.allSettled([service.read(a.runId), service.transition(a.runId, 'draft', 0, 'ready'), service.delete(a.runId, 0, 'explicit')]);
      const firstEvents = h.events.slice(), retained = await h.get(a.runId);
      await h.raw('readwrite', store => store.delete(b.runId));
      h.events.length = 0; const stillBlocked = await h.rejected(service.read(a.runId));
      return { statuses: calls.map(x => x.status), firstEvents, retained, stillBlocked, retryEvents: h.events.slice(), after: await h.get(a.runId) };
    }, { a: record(ids[0]), b: record(ids[1]) });
    assert.deepEqual(result.statuses, ['rejected', 'rejected', 'rejected']);
    assert.deepEqual(result.firstEvents, ['start:readwrite', 'abort:readwrite']);
    assert.deepEqual(result.retained, record(ids[0])); assert.equal(result.stillBlocked, true);
    assert.deepEqual(result.retryEvents, []); assert.deepEqual(result.after, result.retained);
  });
  await check('trusted elapsed time expires exactly at seven days and commits deletion', async () => {
    const result = await run(async ({ id, day7 }) => {
      await h.reset(); const service = await h.service();
      await service.create({ schemaVersion: 2, runId: id, state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 });
      h.clock += day7 - 1; h.tick += day7 - 1;
      const before = await service.transition(id, 'draft', 0, 'ready'); const eligible = await service.read(id);
      h.clock++; h.tick++; h.events.length = 0;
      const count = await service.cleanup(); const events = h.events.slice(); const absent = await h.get(id);
      return { before, eligible, count, events, absent, denied: await h.rejected(service.read(id)) };
    }, { id: ids[0], day7 });
    assert.equal(result.before.record.createdAt, 1000); assert.equal(result.eligible.createdAt, 1000);
    assert.equal(result.eligible.revision, 1); assert.equal(result.count, 1);
    assert.deepEqual(result.events, ['start:readwrite','complete:readwrite']);
    assert.equal(result.absent, undefined); assert.equal(result.denied, true);
  });
  await check('rollback blocks the same instance after apparent repair without deletion', async () => {
    const result = await run(async r => {
      await h.reset(); const service = await h.service(); await service.create(r); await service.read(r.runId);
      h.clock = 999; h.tick = 1; const rollback = await h.rejected(service.read(r.runId));
      h.clock = 1000; h.tick = 2; const repaired = await h.rejected(service.read(r.runId));
      return { rollback, repaired, stored: await h.get(r.runId) };
    }, record(ids[0]));
    assert.equal(result.rollback, true); assert.equal(result.repaired, true); assert.deepEqual(result.stored, record(ids[0]));
  });
  await check('unexplained forward movement blocks later plausible samples and retains data', async () => {
    const result = await run(async ({ r, day7 }) => {
      await h.reset(); const service = await h.service(); await service.create(r);
      h.clock += day7; h.tick = 1; const jump = await h.rejected(service.cleanup());
      h.clock = 1001; h.tick = 2; const later = await h.rejected(service.read(r.runId));
      return { jump, later, stored: await h.get(r.runId) };
    }, { r: record(ids[0]), day7 });
    assert.equal(result.jump, true); assert.equal(result.later, true); assert.deepEqual(result.stored, record(ids[0]));
  });
  await check('multiple trusted expiry deletions commit atomically and preserve fresh row', async () => {
    const result = await run(async ({ ids, day7 }) => {
      await h.reset(); const service = await h.service();
      await service.create({ schemaVersion: 2, runId: ids[0], state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 });
      await service.create({ schemaVersion: 2, runId: ids[1], state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 });
      h.clock += day7; h.tick += day7;
      const count = await service.cleanup();
      await service.create({ schemaVersion: 2, runId: ids[2], state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: h.clock });
      return { count, rows: await Promise.all(ids.map(id => h.get(id))), fresh: await service.read(ids[2]) };
    }, { ids, day7 });
    assert.equal(result.count, 2);
    assert.equal(result.rows[0], undefined); assert.equal(result.rows[1], undefined);
    assert.deepEqual(result.rows[2], record(ids[2], 1000 + day7)); assert.deepEqual(result.fresh, result.rows[2]);
  });
  await check('legacy corruption aborts staged cleanup and reports no committed deletion', async () => {
    const result = await run(async ({ ids, day7 }) => {
      await h.reset(); const service = await h.service(); await service.create({ schemaVersion: 2, runId: ids[0], state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 });
      await h.raw('readwrite', store => store.put({ schemaVersion: 1, runId: ids[1], state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 }));
      h.clock += day7; h.tick += day7; h.events.length = 0;
      const denied = await h.rejected(service.cleanup());
      return { denied, events: h.events.slice(), first: await h.get(ids[0]), legacy: await h.get(ids[1]) };
    }, { ids, day7 });
    assert.equal(result.denied, true); assert.deepEqual(result.events, ['start:readwrite','abort:readwrite']);
    assert.deepEqual(result.first, record(ids[0])); assert.equal(result.legacy.schemaVersion, 1);
  });
  await check('revision, terminal-state, authorization and sanitized failure guards', async () => {
    const result = await run(async r => {
      await h.reset(); const service = await h.service(false); await service.create(r);
      const unauthorized = await h.rejected(service.transition(r.runId, 'draft', 0, 'ready'));
      const deniedDelete = await h.rejected(service.delete(r.runId, 0, 'explicit'));
      const permitted = await h.service();
      // A fresh instance cannot inherit the prior instance's known-record authority.
      const freshDenied = await h.rejected(permitted.read(r.runId));
      return { unauthorized, deniedDelete, freshDenied, stored: await h.get(r.runId) };
    }, record(ids[0]));
    assert.equal(result.unauthorized, true); assert.equal(result.deniedDelete, true);
    assert.equal(result.freshDenied, true); assert.deepEqual(result.stored, record(ids[0]));
  });
  await check('revision conflicts, terminal protection and schema rejection', async () => {
    const result = await run(async r => {
      await h.reset(); const service = await h.service(); await service.create(r);
      const invalid = await h.rejected(service.create({ ...r, runId: '12345678-1234-4123-8123-123456789ab2', secret: 'synthetic' }));
      const stale = await h.rejected(service.transition(r.runId, 'draft', 1, 'ready'));
      const cancelled = await service.transition(r.runId, 'draft', 0, 'cancelled');
      const terminal = await h.rejected(service.transition(r.runId, 'cancelled', 1, 'ready'));
      const badAck = await h.rejected(service.delete(r.runId, 0, 'acknowledged'));
      return { invalid, stale, cancelled, terminal, badAck, stored: await h.get(r.runId) };
    }, record(ids[0]));
    assert.equal(result.invalid, true); assert.equal(result.stale, true); assert.equal(result.terminal, true); assert.equal(result.badAck, true);
    assert.equal(result.cancelled.record.revision, 1); assert.equal(result.cancelled.record.createdAt, 1000);
    assert.deepEqual(result.stored, result.cancelled.record);
  });
  assert.equal(remoteRequests, 0, 'unexpected non-extension request');
  console.log(`RESULT pass=${passed} fail=0 skip=0 blocked=0 remote=${remoteRequests}`);
} catch (error) { console.error(`FAIL after ${passed} passes: ${error.stack}`); process.exitCode = 1; }
finally {
  try { if (context) await context.close(); } finally {
    const stat = fs.lstatSync(root);
    assert.equal(stat.uid, process.getuid()); assert.equal(path.dirname(root), os.tmpdir()); assert.ok(path.basename(root).startsWith('sec01-cleanup-'));
    fs.rmSync(root, { recursive: true });
    console.log(`CLEANUP ${fs.existsSync(root) ? 'FAIL' : 'PASS'}`);
  }
}
