import test from 'node:test';
import assert from 'node:assert/strict';
import {createSandboxOperationGate} from '../src/background/sandbox-operation-gate.mjs';
import {createSandboxPreparationController,isPreparationIdle,RECORD_KEY} from '../src/background/sandbox-preparation-controller.mjs';
import {createReviewedSandboxExecution} from '../src/background/reviewed-sandbox-execution.mjs';
import {createReviewedAttemptLedger} from '../src/background/reviewed-attempt-ledger.mjs';

const origin='chrome-extension://fixture-id';
const sender={id:'fixture-id',origin,url:`${origin}/src/popup/popup.html?workspace=1`,frameId:0,tab:{id:7,incognito:false}};
const start={type:'SANDBOX_PREPARATION_START',operationId:'123e4567-e89b-42d3-a456-426614174000',repository:'fixture-owner/disposable-repo',sourceBranch:'main',newBranch:'plementus-mvp-check',acknowledged:true};
const request={type:'REVIEWED_SANDBOX_CREATE',acknowledged:true};
const status={type:'SANDBOX_PREPARATION_STATUS'};
const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return {resolve,promise};};
function fixture({session={},hasReviewedCheckpoint=async()=>false,execute=async()=> 'FORM_PREPARED',authorize=async()=>null,set=async()=>{},waitMs=100}={}){
  const calls=[];
  const api={runtime:{id:sender.id,getURL:p=>`${origin}/${p}`},permissions:{contains:async()=>true},storage:{session:{
    setAccessLevel:async()=>{},get:async k=>({[k]:session[k]}),set:async v=>{await set(v);Object.assign(session,structuredClone(v));calls.push('session.set');}}}};
  const gate=createSandboxOperationGate({ordinaryIdle:async s=>isPreparationIdle(await ordinary.handle(status,s)),hasReviewedCheckpoint,waitMs});
  const ordinary=createSandboxPreparationController(api,async options=>{calls.push('prepare');return execute(options);},{operationGate:gate,waitMs});
  const reviewed=()=>createReviewedSandboxExecution({api,operationGate:gate,authorize:async()=>{calls.push('authorize');return authorize();},
    readRefs:async()=>{calls.push('refs');return null;},ledger:{add:async()=>{calls.push('ledger.add');return false;}},waitMs});
  return {gate,ordinary,reviewed,calls,session};
}

test('ordinary preparation retains exclusive slot after admission reply until controller settles',async()=>{
  const hold=deferred(),entered=deferred();
  const f=fixture({execute:async()=>{entered.resolve();await hold.promise;return 'FORM_PREPARED';}});
  assert.equal((await f.ordinary.handle(start,sender)).ok,true);await entered.promise;
  assert.equal((await f.reviewed().run(request,sender)).reason,'OPERATION_CONFLICT');
  assert.ok(!f.calls.includes('authorize'));
  hold.resolve();await f.ordinary.idle();
  assert.equal((await f.reviewed().run(request,sender)).reason,'INDEPENDENT_APPROVAL_UNAVAILABLE');
  assert.ok(f.calls.includes('authorize'));
});
test('reviewed operation excludes ordinary admission while awaiting authority',async()=>{
  const hold=deferred(),entered=deferred();const f=fixture({authorize:async()=>{entered.resolve();await hold.promise;return null;}});
  const run=f.reviewed().run(request,sender);await entered.promise;
  assert.deepEqual(await f.ordinary.handle(start,sender),{ok:false,reason:'OPERATION_CONFLICT'});
  assert.deepEqual(f.calls,['authorize']);hold.resolve();assert.equal((await run).reason,'INDEPENDENT_APPROVAL_UNAVAILABLE');
  assert.equal((await f.ordinary.handle(start,sender)).ok,true);await f.ordinary.idle();
});
test('restarted worker blocks reviewed execution on ordinary interruption or uncertain record',async()=>{
  const hold=deferred();const first=fixture({execute:async()=>{await hold.promise;return 'FORM_PREPARED';}});
  assert.equal((await first.ordinary.handle(start,sender)).ok,true);
  const session=structuredClone(first.session);hold.resolve();await first.ordinary.idle();
  for(const state of ['ADMITTED','NAVIGATION_PENDING','PREPARATION_UNCERTAIN','NAVIGATION_TIMEOUT']){
    const f=fixture({session:{[RECORD_KEY]:{...session[RECORD_KEY],state}}});
    assert.equal((await f.reviewed().run(request,sender)).reason,'OPERATION_CONFLICT');
    assert.ok(!f.calls.includes('authorize'));assert.ok(!f.calls.includes('prepare'));
  }
});
test('durable checkpoint blocks both routes on a fresh worker without consuming another claim',async()=>{
  const f=fixture({hasReviewedCheckpoint:async()=>true});
  assert.equal((await f.ordinary.handle(start,sender)).reason,'OPERATION_CONFLICT');
  assert.equal((await f.reviewed().run(request,sender)).reason,'OPERATION_CONFLICT');assert.deepEqual(f.calls,[]);
});
test('unknown, rejected and hung checkpoint checks fail closed; late result cannot reacquire',async()=>{
  for(const read of [async()=>undefined,async()=>{throw Error('unavailable');}]){
    const f=fixture({hasReviewedCheckpoint:read});assert.equal((await f.ordinary.handle(start,sender)).reason,'OPERATION_CONFLICT');assert.deepEqual(f.calls,[]);
  }
  const hold=deferred();let n=0;const gate=createSandboxOperationGate({ordinaryIdle:async()=>true,hasReviewedCheckpoint:()=>++n===1?hold.promise:false,waitMs:10});
  assert.equal(await gate.acquire('ordinary',sender),null);const release=await gate.acquire('reviewed',sender);assert.equal(typeof release,'function');
  hold.resolve(false);await new Promise(r=>setImmediate(r));assert.equal(await gate.acquire('ordinary',sender),null);release();
  const next=await gate.acquire('ordinary',sender);assert.equal(typeof next,'function');next();
});
test('ordinary persistence rejection releases slot but blocks review via unavailable status',async()=>{
  const f=fixture({set:async()=>{throw Error('unavailable');}});
  assert.equal((await f.ordinary.handle(start,sender)).reason,'SESSION_UNAVAILABLE');
  assert.equal((await f.reviewed().run(request,sender)).reason,'OPERATION_CONFLICT');assert.deepEqual(f.calls,[]);
});
test('gate refuses concurrent acquisition and stale release cannot unlock newer owner',async()=>{
  const gate=createSandboxOperationGate({ordinaryIdle:async()=>true,hasReviewedCheckpoint:async()=>false});
  const [a,b]=await Promise.all([gate.acquire('ordinary',sender),gate.acquire('reviewed',sender)]);assert.equal(typeof a,'function');assert.equal(b,null);a();
  const next=await gate.acquire('reviewed',sender);a();assert.equal(await gate.acquire('ordinary',sender),null);next();
});
test('ledger admission read does not create absent database; inventory failure blocks',async()=>{
  const ledger=createReviewedAttemptLedger({databases:async()=>[],open(){throw Error('must not open');}});
  assert.equal(await ledger.hasCheckpoint(),false);
  for(const entries of [null,[{name:'plementus-reviewed-sandbox-execution-v1',version:2}]]){
    await assert.rejects(createReviewedAttemptLedger({databases:async()=>entries}).hasCheckpoint());
  }
});
test('ledger admission read waits for readonly transaction completion, counts any checkpoint',async()=>{
  let tx,req,closed=0;const db={close(){closed++;},transaction(store,mode){assert.equal(store,'attempt');assert.equal(mode,'readonly');return tx={objectStore(){return{count(){return req={};}}}};}};
  const ledger=createReviewedAttemptLedger({databases:async()=>[{name:'plementus-reviewed-sandbox-execution-v1',version:1}],open(){const r={result:db};queueMicrotask(()=>r.onsuccess());return r;}});
  for(const count of [0,1,3]){let settled=false;const p=ledger.hasCheckpoint().then(v=>{settled=true;return v;});await new Promise(r=>setImmediate(r));req.result=count;assert.equal(settled,false);tx.oncomplete();assert.equal(await p,count>0);}
  const failure=ledger.hasCheckpoint();await new Promise(r=>setImmediate(r));tx.onabort();await assert.rejects(failure);assert.equal(closed,4);
});
test('a read resolved after the deadline cannot grant the slot even before timer delivery',async()=>{
  const gate=createSandboxOperationGate({ordinaryIdle:async()=>true,hasReviewedCheckpoint:async()=>{
    const end=performance.now()+15;while(performance.now()<end){}return false;
  },waitMs:5});
  assert.equal(await gate.acquire('ordinary',sender),null);
});
