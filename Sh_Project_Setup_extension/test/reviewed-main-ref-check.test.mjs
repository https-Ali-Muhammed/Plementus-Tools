import test from 'node:test';
import assert from 'node:assert/strict';
import { createMainRefCheck, createMainRefReadService } from '../src/background/reviewed-main-ref-check.mjs';
import { REVIEWED_SCOPE as scope } from '../src/background/reviewed-sandbox-execution.mjs';
import { MAIN_NATIVE_HOST, READ_KIND } from '../src/background/reviewed-native-ref-bridge.mjs';
import { readFileSync } from 'node:fs';
const origin='chrome-extension://'+'a'.repeat(32), sender={id:'a'.repeat(32),origin,url:origin+'/src/popup/reviewed-ref-check.html',frameId:0,tab:{id:1,incognito:false}};
const request={type:'REVIEWED_MAIN_REF_CHECK'};
function fixture(){let allowed=true, calls=0, hold=null;const api={runtime:{id:sender.id,getURL:()=>origin+'/',sendNativeMessage:async(host,req)=>{calls++;assert.equal(host,MAIN_NATIVE_HOST);assert.equal(req.kind,READ_KIND);assert.deepEqual(Object.keys(req).sort(),['kind','nonce']);if(hold)await hold;return {ok:true,nonce:req.nonce,snapshot:{repository:scope.repository,complete:true,observedAt:Date.now(),heads:[{ref:'refs/heads/main',sha:scope.sourceSha}]}};}},permissions:{contains:async p=>{assert.deepEqual(p,{permissions:['nativeMessaging']});return allowed;}}};const service=createMainRefReadService(api);return {run:createMainRefCheck(api,service),service,setAllowed:v=>allowed=v,calls:()=>calls,hold:p=>hold=p};}
test('main read check returns exact snapshot through separate native host',async()=>{const f=fixture();const r=await f.run(request,sender);assert.equal(r.ok,true);assert.equal(r.snapshot.heads[0].sha,scope.sourceSha);assert.equal(f.calls(),1);});
test('main read check rejects untrusted senders and injected arguments',async()=>{const f=fixture();for(const patch of [{origin:'https://github.com'},{url:origin+'/src/popup/popup.html'},{frameId:1},{tab:{id:1,incognito:true}},{id:'b'.repeat(32)}])assert.equal((await f.run(request,{...sender,...patch})).reason,'INVALID_REQUEST');for(const extra of [{repository:'other'},{approval:true},{host:'other'}])assert.equal((await f.run({...request,...extra},sender)).reason,'INVALID_REQUEST');assert.equal(f.calls(),0);});
test('main read check requires optional permission and refuses revoked permission',async()=>{const f=fixture();f.setAllowed(false);assert.equal((await f.run(request,sender)).reason,'PERMISSION_REQUIRED');assert.equal(f.calls(),0);f.setAllowed(true);let release;f.hold(new Promise(r=>release=r));const p=f.run(request,sender);await new Promise(r=>setImmediate(r));f.setAllowed(false);release();assert.equal((await p).reason,'READ_UNAVAILABLE');});
test('main read check serializes concurrent requests',async()=>{const f=fixture();let release;f.hold(new Promise(r=>release=r));const p=f.run(request,sender);assert.equal((await f.run(request,sender)).reason,'BUSY');release();assert.equal((await p).ok,true);assert.equal(f.calls(),1);});
test('manifest adds only optional native permission',()=>{const manifest=JSON.parse(readFileSync(new URL('../manifest.json',import.meta.url),'utf8'));assert.deepEqual(manifest.permissions,['activeTab','scripting','storage']);assert.deepEqual(manifest.optional_permissions,['nativeMessaging']);assert.deepEqual(manifest.optional_host_permissions,['https://github.com/*']);});

test('worker-owned ref service supplies only the snapshot; exact scope required',async()=>{
  const f=fixture();assert.equal(await f.service.readRefs('other/repo'),null);assert.equal(f.calls(),0);
  const snapshot=await f.service.readRefs(scope.repository);assert.deepEqual(Object.keys(snapshot).sort(),['complete','heads','observedAt','repository']);assert.equal(snapshot.heads[0].sha,scope.sourceSha);assert.equal(f.calls(),1);
});
test('diagnostic and coordinator share one exclusive native read slot in both directions',async()=>{
  for(const diagnosticFirst of [true,false]){
    const f=fixture();let release;f.hold(new Promise(r=>release=r));
    const first=diagnosticFirst?f.run(request,sender):f.service.readRefs(scope.repository);
    await new Promise(r=>setImmediate(r));
    if(diagnosticFirst)assert.equal(await f.service.readRefs(scope.repository),null);
    else assert.equal((await f.run(request,sender)).reason,'BUSY');
    release();const result=await first;assert.equal(diagnosticFirst?result.ok:result.complete,true);assert.equal(f.calls(),1);
  }
});
test('coordinator-facing ref service refuses missing and revoked native permission',async()=>{
  const f=fixture();f.setAllowed(false);assert.equal(await f.service.readRefs(scope.repository),null);assert.equal(f.calls(),0);
  f.setAllowed(true);let release;f.hold(new Promise(r=>release=r));const pending=f.service.readRefs(scope.repository);
  await new Promise(r=>setImmediate(r));f.setAllowed(false);release();assert.equal(await pending,null);assert.equal(f.calls(),1);
});
