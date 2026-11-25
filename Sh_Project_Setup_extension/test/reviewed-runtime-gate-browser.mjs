import assert from 'node:assert/strict';
import { mkdtemp, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from 'playwright';

// Disposable empty profile, actual unpacked worker, no GitHub navigation or
// account reuse. This tests the blocked installed path, not live dispatch.
const extension = fileURLToPath(new URL('../',import.meta.url));
const profile = await mkdtemp(join(tmpdir(),'plementus-runtime-gate-'));
let context, external=0;
try {
  context=await chromium.launchPersistentContext(profile,{
    headless:false,
    ...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),
    args:['--headless=new','--no-first-run','--disable-background-networking','--disable-component-update','--disable-sync',
      `--disable-extensions-except=${extension}`,`--load-extension=${extension}`],
  });
  await context.route(/^https?:\/\//,route=>{external++;return route.abort();});
  const worker=context.serviceWorkers()[0]||await context.waitForEvent('serviceworker',{timeout:10000});
  const id=new URL(worker.url()).hostname;
  assert.match(id,/^[a-p]{32}$/);
  assert.equal(new URL(worker.url()).pathname,'/src/background.js');
  const page=await context.newPage();
  await page.goto(`chrome-extension://${id}/src/popup/popup.html?workspace=1`,{timeout:10000});
  const send=m=>page.evaluate(message=>chrome.runtime.sendMessage(message),m);
  assert.deepEqual(await send({type:'SANDBOX_PREPARATION_STATUS'}),{ok:true,record:null});
  const inspect=()=>worker.evaluate(async()=>({databases:(await indexedDB.databases()).map(d=>d.name),session:await chrome.storage.session.get(null)}));
  const before=await inspect();
  assert.ok(!before.databases.includes('plementus-reviewed-sandbox-execution-v1'));
  const request={type:'REVIEWED_SANDBOX_CREATE',acknowledged:true};
  const check=(result,reason)=>{
    assert.equal(result.state,'BLOCKED');assert.equal(result.reason,reason);
    assert.equal(result.reserved,false);assert.equal(result.dispatched,false);
    assert.equal(result.clickConfirmed,false);assert.equal(result.postcondition,'NOT_CHECKED');
  };
  check(await send(request),'TRUSTED_SERVICES_UNAVAILABLE');
  check(await send({...request,securityApprovalReference:'fabricated'}),'INVALID_REQUEST');
  check(await send({...request,refs:[]}), 'INVALID_REQUEST');
  for(const result of await page.evaluate(message=>Promise.all(Array.from({length:10},()=>chrome.runtime.sendMessage(message))),request))
    check(result,'TRUSTED_SERVICES_UNAVAILABLE');
  const popup=await context.newPage();
  await popup.goto(`chrome-extension://${id}/src/popup/popup.html`,{timeout:10000});
  check(await popup.evaluate(m=>chrome.runtime.sendMessage(m),request),'INVALID_REQUEST');
  assert.deepEqual(await inspect(),before);
  assert.deepEqual(await send({type:'SANDBOX_PREPARATION_STATUS'}),{ok:true,record:null});
  assert.ok(context.pages().every(p=>!/^https?:/.test(p.url())));
  assert.equal(external,0);
  console.log('PASS: actual unpacked worker; exact workspace requests blocked, fake evidence and popup refused, 10 concurrent requests refused, ordinary preparation status unchanged, no ledger database or GitHub tab, zero intercepted external page requests.');
}finally{
  if(context)await context.close();
  await rm(profile,{recursive:true,force:true});
}
