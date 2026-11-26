import test from 'node:test';
import assert from 'node:assert/strict';

// Import the real installed entry point, not a test-only router. Every Chrome
// provider and ledger call is a tripwire; only ordinary session reads are allowed.
const origin = 'chrome-extension://fixture-id';
const sender = {id:'fixture-id', origin, url:`${origin}/src/popup/popup.html?workspace=1`,
  frameId:0, tab:{id:7,incognito:false}};
const request = {type:'REVIEWED_SANDBOX_CREATE',acknowledged:true};
let serial = 0;
async function boot(t, { checkpoint = false } = {}) {
  const originalChrome=Object.getOwnPropertyDescriptor(globalThis,'chrome');
  const originalIDB=Object.getOwnPropertyDescriptor(globalThis,'indexedDB');
  const effects=[], sessionCalls=[], listeners=[];
  const fail=name=>(...args)=>{effects.push(name);throw Error(`unexpected ${name}`);};
  const chrome={runtime:{id:sender.id,getURL:p=>`${origin}/${p}`,onMessage:{addListener:fn=>listeners.push(fn)},onInstalled:{addListener(){}},sendNativeMessage:fail('runtime.sendNativeMessage')},
    storage:{session:{setAccessLevel:async()=>sessionCalls.push('access'),get:async k=>{sessionCalls.push(`get:${k}`);return {};},set:fail('session.set')}},
    permissions:{contains:checkpoint?async()=>true:fail('permissions.contains'),request:fail('permissions.request')},
    tabs:{create:fail('tabs.create'),get:fail('tabs.get')},scripting:{executeScript:fail('script')}};
  Object.defineProperty(globalThis,'chrome',{value:chrome,writable:true,configurable:true});
  const idb=checkpoint?{
    databases:async()=>[{name:'plementus-reviewed-sandbox-execution-v1',version:1}],
    open:()=>{const db={close(){},transaction(store,mode){
      assert.equal(mode,'readonly');const tx={objectStore(){return {count(){return {result:1};}}}};
      queueMicrotask(()=>tx.oncomplete());return tx;
    }};const request={result:db};queueMicrotask(()=>request.onsuccess());return request;},
  }:{open:fail('indexedDB.open'),databases:fail('indexedDB.databases')};
  Object.defineProperty(globalThis,'indexedDB',{value:idb,configurable:true});
  t.after(()=>{for(const [key,old] of [['chrome',originalChrome],['indexedDB',originalIDB]]){
    if(old)Object.defineProperty(globalThis,key,old);else delete globalThis[key];
  }});
  await import(`../src/background.js?boot=${++serial}`);
  assert.equal(listeners.length,1);
  async function send(message,from=sender){
    return new Promise((resolve,reject)=>{
      let timer=setTimeout(()=>reject(Error('no worker reply')),1000);
      const returned=listeners[0](message,from,result=>{clearTimeout(timer);resolve(result);});
      assert.equal(returned,true);
    });
  }
  assert.deepEqual(await send({type:'SANDBOX_PREPARATION_STATUS'}),{ok:true,record:null});
  return {send,effects,sessionCalls};
}
function blocked(result,reason){
  assert.equal(result.state,'BLOCKED');assert.equal(result.reason,reason);
  assert.equal(result.reserved,false);assert.equal(result.dispatched,false);
  assert.equal(result.clickConfirmed,false);assert.equal(result.postcondition,'NOT_CHECKED');
}

test('installed worker routes exact reviewed request and fails closed with missing trusted authorization (native reader wired)',async t=>{
  const f=await boot(t),before=[...f.sessionCalls];
  blocked(await f.send(request),'TRUSTED_SERVICES_UNAVAILABLE');
  assert.deepEqual(f.effects,[]);assert.deepEqual(f.sessionCalls,before);
});
test('installed worker refuses caller-supplied authority, refs, target, or bypass fields',async t=>{
  const f=await boot(t);
  for(const patch of [{authorization:true},{securityApprovalReference:'fake'},{readRefs:{}},{scope:{}},{repository:'other/repo'},{tabId:1},{mode:'dispatch'},{acknowledged:false}])
    blocked(await f.send({...request,...patch}),'INVALID_REQUEST');
  assert.deepEqual(f.effects,[]);
});
test('installed worker refuses content scripts, subframes, incognito and non-workspace callers',async t=>{
  const f=await boot(t);
  for(const patch of [{id:'other'},{origin:'https://github.com'},{url:'https://github.com/test'},{frameId:1},{tab:{id:7,incognito:true}},{url:`${origin}/src/popup/popup.html`},{url:`${sender.url}&handoff=other`}])
    blocked(await f.send(request,{...sender,...patch}),'INVALID_REQUEST');
  assert.deepEqual(f.effects,[]);
});
test('concurrent gated requests never reserve an attempt or change preparation state',async t=>{
  const f=await boot(t);
  for(const result of await Promise.all(Array.from({length:10},()=>f.send(request))))blocked(result,'TRUSTED_SERVICES_UNAVAILABLE');
  assert.deepEqual(await f.send({type:'SANDBOX_PREPARATION_STATUS'}),{ok:true,record:null});
  assert.deepEqual(f.effects,[]);
});
test('ordinary status and malformed message behavior are preserved alongside reviewed routing',async t=>{
  const f=await boot(t);
  assert.deepEqual(await f.send({type:'SANDBOX_PREPARATION_START',unexpected:true}),{ok:false,reason:'MALFORMED_MESSAGE'});
  assert.deepEqual(await f.send({type:'SANDBOX_PREPARATION_STATUS'}),{ok:true,record:null});
  assert.deepEqual(await f.send({type:'SANDBOX_PREPARATION_STATUS'},{...sender,origin:'https://github.com'}),{ok:false,reason:'UNTRUSTED_SENDER'});
  assert.deepEqual(f.effects,[]);
});

test('installed ordinary route cannot admit a new preparation after a durable reviewed checkpoint',async t=>{
  const f=await boot(t,{checkpoint:true});
  const start={type:'SANDBOX_PREPARATION_START',operationId:'123e4567-e89b-42d3-a456-426614174000',repository:'fixture-owner/disposable-repo',sourceBranch:'main',newBranch:'plementus-mvp-check',acknowledged:true};
  assert.deepEqual(await f.send(start),{ok:false,reason:'OPERATION_CONFLICT'});
  assert.deepEqual(await f.send({type:'SANDBOX_PREPARATION_STATUS'}),{ok:true,record:null});
  blocked(await f.send(request),'TRUSTED_SERVICES_UNAVAILABLE');
  assert.deepEqual(f.effects,[]);
});
