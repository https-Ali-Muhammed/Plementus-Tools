import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewedSandboxExecution, REVIEWED_SCOPE as scope, NATIVE_REF_READ_CANDIDATE } from '../src/background/reviewed-sandbox-execution.mjs';
import { createReviewedAttemptLedger } from '../src/background/reviewed-attempt-ledger.mjs';

const sender={id:'test-extension',origin:'chrome-extension://test-extension',url:'chrome-extension://test-extension/src/popup/popup.html?workspace=1',frameId:0,tab:{id:7,incognito:false}};
const message={type:'REVIEWED_SANDBOX_CREATE',acknowledged:true};
const url=`https://github.com/${scope.repository}/branches`;
const source={ref:'refs/heads/main',sha:scope.sourceSha}, dest={ref:`refs/heads/${scope.newBranch}`,sha:scope.sourceSha};
const events={addListener(){},removeListener(){}};
function setup({ledger=new Map(),authority,refs,add,script,tab,permission,waitMs=100,missing,refReadProfile}={}){
  const calls=[], session={}, heads=[source];let clicks=0,reads=0,auths=0;
  const decision={scope,securityApprovalReference:'synthetic-review-01',operator:'fixture-operator',reviewer:'fixture-independent-reviewer',expiresAt:Date.now()+60000};
  const api={runtime:{id:sender.id,getURL:p=>`${sender.origin}/${p}`},storage:{session:{setAccessLevel:async()=>{},get:async k=>({[k]:session[k]}),set:async v=>Object.assign(session,structuredClone(v))}},permissions:{contains:async()=>permission?.()??true},tabs:{create:async o=>{assert.equal(o.url,url);calls.push('navigate');return {id:42,url};},get:async id=>tab?.(id)??{id,windowId:1,incognito:false,status:'complete',url},onUpdated:events,onRemoved:events},scripting:{executeScript:async o=>{
    const name=o.func.name, mode=name==='reviewedSandboxBranchButton'?o.args.at(-1):null;
    calls.push(mode||name);let result=name==='openNativeBranchDialog'?'DIALOG_OPENED':name==='prepareNativeBranchForm'?'FORM_PREPARED':mode==='inspect'?'READY':true;
    if(mode==='dispatch'){clicks++;heads.push(dest);result='CLICK_DISPATCHED';}
    return script?.(o,result)??[{frameId:0,documentId:'fixture-doc',result}];
  }}};
  const services={api,ledger:{add:async(k,v)=>{calls.push(`ledger:${k}`);if(add)return add(k,v,ledger);if(ledger.has(k))return false;ledger.set(k,structuredClone(v));return true;}},authorize:async()=>{auths++;return authority?authority(decision,auths):decision;},readRefs:async repository=>{reads++;calls.push('refs');return refs?refs(heads,reads):{repository,complete:true,observedAt:Date.now(),heads:structuredClone(heads)};},waitMs,refReadProfile};
  if(missing)delete services[missing];
  return {run:(m=message,s=sender)=>createReviewedSandboxExecution(services).run(m,s),calls,ledger,session,get clicks(){return clicks;}};
}
test('offline live-shaped fixture connects actual controller and native adapter only after independent approval and durable claims',async()=>{
  const f=setup();const r=await f.run();assert.equal(r.state,'REFS_MATCHED');assert.equal(r.clickConfirmed,true);assert.equal(f.clicks,1);
  assert.ok(f.calls.indexOf('ledger:reservation')<f.calls.indexOf('navigate'));assert.ok(f.calls.indexOf('ledger:dispatch')<f.calls.indexOf('dispatch'));
  assert.equal(f.ledger.get('outcome').state,'REFS_MATCHED');assert.deepEqual(Object.keys(f.session),['reviewedSandboxExecution.preparation.v1']);
});
test('owner approval alone and absent trusted services are insufficient',async()=>{
  for(const f of [setup({missing:'authorize'}),setup({missing:'readRefs'}),setup({authority:d=>({...d,reviewer:d.operator})}),setup({authority:d=>({...d,securityApprovalReference:''})}),setup({authority:()=>true})]){
    assert.equal((await f.run()).state,'BLOCKED');assert.deepEqual(f.calls,[]);assert.equal(f.ledger.size,0);
  }
});
test('untrusted frame and caller-supplied target or authority are refused',async()=>{
  for(const [m,s] of [[message,{...sender,frameId:1}],[{...message,tabId:42},sender],[{...message,approvalReference:'fake'},sender],[message,{...sender,origin:'https://github.com'}]]){
    const f=setup();assert.equal((await f.run(m,s)).reason,'INVALID_REQUEST');assert.deepEqual(f.calls,[]);
  }
});
test('stale, incomplete, changed source, or existing destination snapshots fail closed',async()=>{
  for(const patch of [{complete:false},{observedAt:Date.now()-10000},{heads:[{...source,sha:'a'.repeat(40)}]},{heads:[source,dest]},{heads:[source,source]}]){
    const f=setup({refs:()=>({repository:scope.repository,complete:true,observedAt:Date.now(),heads:[source],...patch})});assert.equal((await f.run()).reason,'PREFLIGHT_REFS_MISMATCH');assert.equal(f.clicks,0);assert.equal(f.ledger.size,0);
  }
});
test('concurrent and restarted coordinators cannot repeat an immutable reservation',async()=>{
  const ledger=new Map(),a=setup({ledger}),b=setup({ledger});const r=await Promise.all([a.run(),b.run()]);assert.deepEqual(r.map(x=>x.state).sort(),['BLOCKED','REFS_MATCHED']);assert.equal(a.clicks+b.clicks,1);const c=setup({ledger});assert.equal((await c.run()).reason,'RESERVATION_CONFLICT');assert.equal(c.clicks,0);
});
test('final captured document mismatch prevents claim or dispatch',async()=>{
  const f=setup({script:(o,result)=>o.func.name==='verifyPreparedNativeBranchForm'?[{frameId:0,documentId:'different',result}]:null});assert.equal((await f.run()).reason,'PREPARATION_NOT_VERIFIED');assert.equal(f.clicks,0);assert.equal(f.ledger.has('dispatch'),false);
});
test('failed read-only button inspection prevents claim',async()=>{
  const f=setup({script:(o,result)=>o.args?.at(-1)==='inspect'?[{frameId:0,documentId:'fixture-doc',result:'NOT_READY'}]:null});assert.equal((await f.run()).reason,'NATIVE_BUTTON_NOT_VERIFIED');assert.equal(f.ledger.has('dispatch'),false);
});
test('claim rejection, authority loss or changed refs after claim prevents all clicks',async()=>{
  for(const config of [{add:async(k,v,l)=>{if(k==='dispatch')return false;l.set(k,v);return true;}},{refs:(heads,n)=>({repository:scope.repository,complete:true,observedAt:Date.now(),heads:n===2?[source,dest]:heads})},{authority:(d,n)=>n===3?null:d}]){
    const f=setup(config);assert.equal((await f.run()).state,'BLOCKED');assert.equal(f.clicks,0);assert.equal(f.ledger.has('reservation'),true);
  }
});
test('no replay if click response or independent postcondition is unknown',async()=>{
  for(const config of [{script:(o,result)=>o.args?.at(-1)==='dispatch'?[{frameId:0,documentId:'fixture-doc',result:'UNKNOWN'}]:null},{refs:()=>({repository:scope.repository,complete:true,observedAt:Date.now(),heads:[source]})}]){
    const f=setup(config);assert.equal((await f.run()).state,'OUTCOME_UNKNOWN');assert.equal(f.clicks,1);assert.equal((await setup({ledger:f.ledger}).run()).reason,'RESERVATION_CONFLICT');
  }
});
test('unresolved claim never allows late click',async()=>{
  let release;const gate=new Promise(r=>release=r);const f=setup({waitMs:20,add:async(k,v,l)=>{if(k==='dispatch')await gate;l.set(k,v);return true;}});
  const r=await f.run();assert.equal(r.reason,'DISPATCH_CLAIM_UNCONFIRMED');release();await new Promise(r=>setImmediate(r));assert.equal(f.clicks,0);
});
test('ledger resolves only after strict IndexedDB transaction commit and refuses duplicates',async()=>{
  let tx,req,closed=0;const db={close(){closed++},transaction(store,mode,opts){assert.equal(opts.durability,'strict');tx={objectStore(){return{add(){req={};return req;}}}};return tx;}};
  const factory={open(name,version){assert.equal(name,'plementus-reviewed-sandbox-execution-v1');const r={result:db};queueMicrotask(()=>r.onsuccess());return r;}};
  const ledger=createReviewedAttemptLedger(factory);let done=false;const p=ledger.add('reservation',{test:true}).then(v=>{done=true;return v;});await new Promise(r=>setImmediate(r));assert.equal(done,false);tx.oncomplete();assert.equal(await p,true);
  const q=ledger.add('reservation',{test:true});await new Promise(r=>setImmediate(r));req.error={name:'ConstraintError'};req.onerror();tx.onabort();assert.equal(await q,false);assert.equal(closed,2);await assert.rejects(ledger.add('reset',{}));
});
test('permission revoked by dispatch claim blocks native click',async()=>{
  let allowed=true;const f=setup({permission:()=>allowed,add:async(k,v,l)=>{l.set(k,v);if(k==='dispatch')allowed=false;return true;}});
  assert.equal((await f.run()).reason,'POST_CLAIM_REVALIDATION_FAILED');assert.equal(f.clicks,0);assert.equal(f.ledger.has('dispatch'),true);
});
test('failed outcome persistence is uncertain and never permits replay',async()=>{
  const f=setup({add:async(k,v,l)=>{if(k==='outcome')return false;l.set(k,v);return true;}});
  assert.equal((await f.run()).state,'OUTCOME_UNKNOWN');assert.equal(f.clicks,1);assert.equal((await setup({ledger:f.ledger}).run()).reason,'RESERVATION_CONFLICT');
});
test('pre-dispatch ref evidence must remain fresh after awaited context checks',async()=>{
  let readCount=0,hold=false;
  const f=setup({waitMs:2000,refs:(heads,n)=>{readCount=n;if(n===2){hold=true;return {repository:scope.repository,complete:true,observedAt:Date.now()-1500,heads:[source]};}return {repository:scope.repository,complete:true,observedAt:Date.now(),heads:structuredClone(heads)};},tab:async id=>{if(hold)await new Promise(r=>setTimeout(r,600));return {id,windowId:1,incognito:false,status:'complete',url};}});
  assert.equal((await f.run()).reason,'POST_CLAIM_REVALIDATION_FAILED');assert.equal(readCount,2);assert.equal(f.clicks,0);assert.equal(f.ledger.has('dispatch'),true);
});

// Native timing is an explicit offline profile, never a workspace request option.
const nativeProfile=NATIVE_REF_READ_CANDIDATE;
const snapshot=(heads,observedAt=Date.now())=>({repository:scope.repository,complete:true,observedAt,heads:structuredClone(heads)});
test('native candidate accepts measured slow acquisition without replacing the provider timestamp',async()=>{
  const f=setup({refReadProfile:nativeProfile,waitMs:1000,refs:async heads=>{
    const proof=snapshot(heads); await new Promise(r=>setTimeout(r,2250)); return proof;
  }});
  const r=await f.run();assert.equal(r.state,'REFS_MATCHED');assert.equal(f.clicks,1);
});
test('legacy profile still refuses slow reads; unknown profiles cannot perform effects',async()=>{
  const f=setup({waitMs:20,refs:async heads=>{await new Promise(r=>setTimeout(r,60));return snapshot(heads);}});
  assert.equal((await f.run()).reason,'PREFLIGHT_REFS_MISMATCH');assert.equal(f.ledger.size,0);assert.equal(f.clicks,0);
  const invalid=setup({refReadProfile:'unknown'});assert.equal((await invalid.run()).reason,'INVALID_TIMING_PROFILE');assert.deepEqual(invalid.calls,[]);
  const injected=setup();assert.equal((await injected.run({...message,refReadProfile:nativeProfile})).reason,'INVALID_REQUEST');assert.deepEqual(injected.calls,[]);
});
test('native candidate rejects a replayed snapshot predating the current acquisition',async()=>{
  const f=setup({refReadProfile:nativeProfile,refs:heads=>snapshot(heads,Date.now()-1)});
  assert.equal((await f.run()).reason,'PREFLIGHT_REFS_MISMATCH');assert.equal(f.ledger.size,0);assert.equal(f.clicks,0);
});
test('native candidate rejects post-receipt evidence aged by awaited context checks',async()=>{
  let hold=false;
  const f=setup({refReadProfile:nativeProfile,waitMs:2000,refs:(heads,n)=>{if(n===2)hold=true;return snapshot(heads);},
    tab:async id=>{if(hold)await new Promise(r=>setTimeout(r,1150));return {id,windowId:1,incognito:false,status:'complete',url};},
    permission:async()=>{if(hold)await new Promise(r=>setTimeout(r,1150));return true;}});
  assert.equal((await f.run()).reason,'POST_CLAIM_REVALIDATION_FAILED');assert.equal(f.clicks,0);assert.equal(f.ledger.has('dispatch'),true);
});
