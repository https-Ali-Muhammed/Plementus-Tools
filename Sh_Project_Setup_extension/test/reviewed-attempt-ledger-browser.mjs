import assert from 'node:assert/strict';
import { mkdtemp, readFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';

// A new disposable profile and intercepted loopback page, never a real account.
// No requests are forwarded. The exact production-candidate ledger runs in real IndexedDB.
const url = 'http://127.0.0.1:18739/reviewed-attempt-ledger-fixture';
const source = await readFile(new URL('../src/background/reviewed-attempt-ledger.mjs', import.meta.url), 'utf8');
const dir = await mkdtemp(join(tmpdir(), 'plementus-reviewed-idb-'));
const options = {
  headless: true,
  ...(process.env.CHROMIUM_EXECUTABLE ? { executablePath: process.env.CHROMIUM_EXECUTABLE } : {}),
  args: ['--no-sandbox', '--disable-background-networking', '--disable-component-update', '--disable-sync'],
  serviceWorkers: 'block',
};
let context, intercepted = 0, unexpected = 0;
async function start() {
  context = await chromium.launchPersistentContext(dir, options);
  await context.route('**/*', route => {
    if (route.request().url() === url) {
      intercepted++;
      return route.fulfill({ status: 200, contentType: 'text/html', body: '<!doctype html><title>Owned synthetic ledger fixture</title><link rel="icon" href="data:,">' });
    }
    unexpected++;
    return route.abort();
  });
}
async function page() {
  const p = await context.newPage();
  await p.goto(url, { timeout: 10000 });
  await p.evaluate(({ source, url }) => {
    if (location.href !== url || typeof indexedDB !== 'object') throw Error('Fixture origin or IndexedDB unavailable');
    window.fixtureLedger = new Function(source.replace('export function createReviewedAttemptLedger', 'function createReviewedAttemptLedger') + '\nreturn createReviewedAttemptLedger;')()(indexedDB);
  }, { source, url });
  return p;
}
const add = (p, key, value) => p.evaluate(({ key, value }) => window.fixtureLedger.add(key, value), { key, value });
async function read(p) {
  return p.evaluate(() => new Promise((resolve, reject) => {
    const request = indexedDB.open('plementus-reviewed-sandbox-execution-v1', 1);
    request.onerror = () => reject(Error('Read-only open failed'));
    request.onupgradeneeded = () => request.transaction.abort();
    request.onsuccess = () => {
      const db = request.result;
      const tx = db.transaction('attempt', 'readonly');
      const store = tx.objectStore('attempt');
      const keys = store.getAllKeys(), values = store.getAll();
      tx.oncomplete = () => { db.close(); resolve(Object.fromEntries(keys.result.map((key, i) => [key, values.result[i]]))); };
      tx.onabort = () => { db.close(); reject(Error('Read-only transaction aborted')); };
    };
  }));
}
const a = { fixture: 'A' }, b = { fixture: 'B' };
try {
  await start();
  const p = await page(), q = await page();
  const results = await Promise.all([add(p, 'reservation', a), add(q, 'reservation', b)]);
  assert.equal(results.filter(x => x === true).length, 1);
  assert.equal(results.filter(x => x === false).length, 1);
  const winner = results[0] ? a : b;
  assert.deepEqual(await read(p), { reservation: winner });
  console.log('PASS: competing tabs admit exactly one reservation; read-only transaction confirms winner');
  await context.close(); context = undefined;
  await start();
  const r = await page();
  assert.equal(await add(r, 'reservation', { fixture: 'replay' }), false);
  assert.deepEqual(await read(r), { reservation: winner });
  assert.equal(await add(r, 'dispatch', winner), true);
  assert.equal(await add(r, 'dispatch', b), false);
  assert.equal(await add(r, 'outcome', winner), true);
  assert.equal(await add(r, 'outcome', b), false);
  await assert.rejects(add(r, 'unknown', a), /unknown reviewed sandbox checkpoint/);
  console.log('PASS: reservation persists after browser restart; dispatch/outcome are insert-only');
  await context.close(); context = undefined;
  await start();
  const s = await page();
  assert.deepEqual(await read(s), { reservation: winner, dispatch: winner, outcome: winner });
  assert.deepEqual(await Promise.all(['reservation', 'dispatch', 'outcome'].map(k => add(s, k, { fixture: 'replay' }))), [false, false, false]);
  assert.deepEqual(await read(s), { reservation: winner, dispatch: winner, outcome: winner });
  assert.equal(unexpected, 0);
  assert.equal(intercepted, 4);
  console.log('PASS: all three immutable checkpoints survive second restart; all replays refused; 4 intercepted fixture navigations, zero forwarded requests');
} finally {
  try { await context?.close(); } finally { await rm(dir, { recursive: true, force: true }); }
}
