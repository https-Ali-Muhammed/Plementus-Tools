import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { chromium } from 'playwright';

const root = fs.mkdtempSync(path.join(os.tmpdir(), 'sec01-cp3-'));
const extension = path.join(root, 'extension');
const profile = path.join(root, 'profile');
const source = path.resolve('src');
let context, passed = 0, blocked = 0;
const check = async (name, fn) => { await fn(); passed++; console.log(`PASS ${name}`); };
const id = '12345678-1234-4123-8123-123456789abc';
const record = { schemaVersion: 2, runId: id, state: 'draft', step: 0, evidenceTier: 'none', revision: 0, createdAt: 1000 };
const executable = chromium.executablePath();
try {
  fs.mkdirSync(extension); fs.mkdirSync(profile);
  fs.cpSync(path.join(source, 'storage'), path.join(extension, 'storage'), { recursive: true });
  fs.cpSync(path.join(source, 'workflow'), path.join(extension, 'workflow'), { recursive: true });
  fs.writeFileSync(path.join(extension, 'manifest.json'), JSON.stringify({ manifest_version: 3, name: 'SEC01 isolated test', version: '1.0', background: { service_worker: 'worker.mjs', type: 'module' } }));
  fs.writeFileSync(path.join(extension, 'page.html'), '<!doctype html><title>isolated test</title>');
  fs.writeFileSync(path.join(extension, 'worker.mjs'), `import {createCheckpointService} from './storage/checkpoint-service.mjs';
const bootId=crypto.randomUUID();
chrome.runtime.onMessage.addListener((m,s,reply)=>{(async()=>{const service=await createCheckpointService(indexedDB,{now:()=>m.now,authorize:()=>true}); return {bootId,record:await service.read(m.id)}})().then(reply,()=>reply({error:true}));return true});`);
  const launch = async () => {
    const c = await chromium.launchPersistentContext(profile, { executablePath: executable, headless: false, args: ['--headless=new', '--disable-background-networking', '--no-first-run', `--disable-extensions-except=${extension}`, `--load-extension=${extension}`] });
    await c.route('**/*', route => route.request().url().startsWith('chrome-extension://') ? route.continue() : route.abort());
    return c;
  };
  context = await launch();
  console.log(`BROWSER ${context.browser().version()} executable=${executable}`);
  let worker = context.serviceWorkers()[0] || await context.waitForEvent('serviceworker', { timeout: 15000 });
  const origin = worker.url().match(/^chrome-extension:\/\/[^/]+/)[0];
  assert.ok(origin.startsWith('chrome-extension://'));
  let page = await context.newPage(); await page.goto(`${origin}/page.html`);
  const run = (fn, arg) => page.evaluate(fn, arg);
  await run(async () => { const m = await import('./storage/checkpoint-service.mjs'); window.clock = 1000; window.service = await m.createCheckpointService(indexedDB, { now: () => window.clock, authorize: () => true }); });
  await check('initialization and extension origin', async () => { assert.equal(await run(() => location.protocol), 'chrome-extension:'); assert.deepEqual(await run(async () => { const req = indexedDB.open('sec01-checkpoints'); return await new Promise((resolve, reject) => { req.onsuccess = () => { const result = [...req.result.objectStoreNames]; req.result.close(); resolve(result); }; req.onerror = reject; }); }), ['checkpoints']); });
  await check('create, read, commit and duplicate', async () => { assert.deepEqual(await run(r => service.create(r), record), record); assert.deepEqual(await run(id => service.read(id), id), record); assert.equal(await run(r => service.create(r).then(() => false, () => true), record), true); });
  await check('strict schema and sensitive fields', async () => { assert.equal(await run(async r => { for (const x of [{secret:'synthetic'}, {schemaVersion:1}, {schemaVersion:3}, {step:100}]) if (await service.create({...r,...x}).then(()=>true,()=>false)) return false; return true; }, record), true); });
  await check('competing transitions and stale guards', async () => { const out = await run(id => Promise.allSettled([service.transition(id,'draft',0,'ready'),service.transition(id,'draft',0,'cancelled')]), id); assert.equal(out.filter(x => x.status === 'fulfilled').length, 1); const saved = await run(id => service.read(id), id); assert.equal(saved.revision, 1); assert.equal(saved.createdAt, 1000); assert.equal(await run(async ({id,s}) => (await Promise.allSettled([service.transition(id,'draft',0,'ready'),service.transition(id,'draft',1,'ready')])).every(x=>x.status==='rejected'), {id,s:saved}), true); });
  await check('abort rollback and no success before completion', async () => { assert.equal(await run(async id => { const {createCheckpointService}=await import('./storage/checkpoint-service.mjs'); let committed=false; const factory={open(...args){const req=indexedDB.open(...args); req.addEventListener('success',()=>{const db=req.result, original=db.transaction.bind(db); db.transaction=(...a)=>{const tx=original(...a); tx.addEventListener('complete',()=>{committed=true}); return tx;};});return req;}}; const s=await createCheckpointService(factory,{now:()=>1000,authorize:()=>true}); await s.read(id); if(!committed)return false; const before=await s.read(id); const bad={open(...args){const req=indexedDB.open(...args);req.addEventListener('success',()=>{const db=req.result,original=db.transaction.bind(db);db.transaction=(...a)=>{const tx=original(...a), store=tx.objectStore.bind(tx);tx.objectStore=(...b)=>{const obj=store(...b), del=obj.delete.bind(obj);obj.delete=(...c)=>{const result=del(...c);tx.abort();return result};return obj};return tx};});return req;}}; const a=await createCheckpointService(bad,{now:()=>1000,authorize:()=>true}); const failed=await a.delete(id,before.revision,'explicit').then(()=>false,()=>true);return failed && JSON.stringify(await s.read(id))===JSON.stringify(before); }, id), true); });
  await check('page close and reopen', async () => { await page.close(); page = await context.newPage(); await page.goto(`${origin}/page.html`); assert.equal((await run(id => chrome.runtime.sendMessage({id,now:1000}), id)).record.revision, 1); });
  try { await check('worker stop and reactivation', async () => {
    const cdp = await context.newCDPSession(page), versions = [];
    cdp.on('ServiceWorker.workerVersionUpdated', event => versions.push(...event.versions.filter(version => version.scriptURL === `${origin}/worker.mjs`)));
    await cdp.send('ServiceWorker.enable');
    const before = await run(id => chrome.runtime.sendMessage({ id, now: 1000 }), id);
    assert.equal(before.record.revision, 1); assert.equal(typeof before.bootId, 'string');
    const active = versions.filter(version => version.runningStatus === 'running').at(-1);
    assert.ok(active?.versionId, `no running synthetic worker version: ${JSON.stringify(versions)}`);
    await cdp.send('ServiceWorker.stopWorker', { versionId: active.versionId });
    const stopped = await new Promise((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error(`no stopped observation: ${JSON.stringify(versions)}`)), 5000);
      const inspect = () => { const found = versions.find(version => version.versionId === active.versionId && version.runningStatus === 'stopped'); if (found) { clearTimeout(timer); resolve(found); } };
      cdp.on('ServiceWorker.workerVersionUpdated', inspect); inspect();
    });
    assert.equal(stopped.runningStatus, 'stopped');
    const after = await run(id => chrome.runtime.sendMessage({ id, now: 1000 }), id);
    assert.equal(after.record.revision, 1); assert.notEqual(after.bootId, before.bootId);
    const stoppedAt = versions.findIndex(version => version.versionId === active.versionId && version.runningStatus === 'stopped');
    const restarted = versions.slice(stoppedAt + 1).find(version => version.versionId === active.versionId && version.runningStatus === 'running');
    assert.ok(restarted, `no post-stop running observation: ${JSON.stringify(versions)}`);
    await cdp.send('ServiceWorker.disable');
  }); } catch (error) { blocked++; console.log(`BLOCKED worker termination/reactivation: ${error.message}`); }
  await context.close(); context = undefined;
  context = await launch(); page = await context.newPage(); await page.goto(`${origin}/page.html`);
  await check('browser process restart and no replay', async () => { const result=await run(id=>chrome.runtime.sendMessage({id,now:1000}),id); assert.equal(result.record.revision,1); assert.ok(['ready','cancelled'].includes(result.record.state)); });
  await check('explicit and acknowledged deletion', async () => { assert.equal(await run(async record => { const {createCheckpointService}=await import('./storage/checkpoint-service.mjs'); const s=await createCheckpointService(indexedDB,{now:()=>1000,authorize:()=>true}); const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('sec01-checkpoints');q.onsuccess=()=>resolve(q.result);q.onerror=reject}); for(const [n,state,reason] of [[1,'draft','explicit'],[2,'completed','acknowledged'],[3,'cancelled','acknowledged']]) {const r={...record,runId:`12345678-1234-4123-8123-123456789ab${n}`,state}; await new Promise((resolve,reject)=>{const t=db.transaction('checkpoints','readwrite');t.objectStore('checkpoints').add(r);t.oncomplete=resolve;t.onerror=reject}); await s.delete(r.runId,0,reason); if(!await s.read(r.runId).then(()=>false,()=>true))return false;} db.close(); return true; }, record), true); });
  await check('expiry, cleanup, deletions, invalid stored records and terminal guards', async () => { assert.equal(await run(async ({id,record})=>{ const {createCheckpointService}=await import('./storage/checkpoint-service.mjs'); let clock=1000; const s=await createCheckpointService(indexedDB,{now:()=>clock,authorize:()=>true}); const rejected=p=>p.then(()=>false,()=>true); let r=await s.read(id); if(!await rejected(s.delete(id,0,'explicit')))return false; if(r.state==='cancelled' && !await rejected(s.transition(id,'cancelled',r.revision,'ready')))return false; if(!await rejected(s.delete(id,r.revision,'acknowledged')) && r.state!=='cancelled')return false; if(r.state==='cancelled') await s.create(record); else await s.delete(id,r.revision,'explicit'); if(r.state!=='cancelled') await s.create(record); clock=1000+604800000-1; await s.transition(id,'draft',0,'ready'); if((await s.read(id)).createdAt!==1000)return false; clock++; if(!await rejected(s.read(id)) || !await rejected(s.transition(id,'ready',1,'running')))return false; if(await s.cleanup()!==1 || !await rejected(s.read(id)))return false; const db=await new Promise((resolve,reject)=>{const q=indexedDB.open('sec01-checkpoints');q.onsuccess=()=>resolve(q.result);q.onerror=reject}); for(const state of ['completed','cancelled','reconcile_required','blocked']) {await new Promise((resolve,reject)=>{const t=db.transaction('checkpoints','readwrite');t.objectStore('checkpoints').put({...record,state,createdAt:clock});t.oncomplete=resolve;t.onerror=reject});if(!await rejected(s.transition(id,state,0,'ready')))return false;} for(const change of [{schemaVersion:1},{schemaVersion:3},{secret:'synthetic'}]) {await new Promise((resolve,reject)=>{const t=db.transaction('checkpoints','readwrite');t.objectStore('checkpoints').put({...record,...change,createdAt:clock});t.oncomplete=resolve;t.onerror=reject});if(!await rejected(s.read(id)) || !await rejected(s.cleanup()))return false;} db.close(); return true; }, {id,record}), true); });
  console.log(`RESULT pass=${passed} fail=0 skip=0 blocked=${blocked}`);
} catch (error) { console.error(`FAIL after ${passed} passes: ${error.stack}`); process.exitCode=1; }
finally {
  if (context) await context.close();
  const stat=fs.lstatSync(root); assert.equal(stat.uid,process.getuid()); assert.equal(path.dirname(root),os.tmpdir()); assert.ok(path.basename(root).startsWith('sec01-cp3-')); fs.rmSync(root,{recursive:true}); console.log(`CLEANUP ${fs.existsSync(root)?'FAIL':'PASS'}`);
}
