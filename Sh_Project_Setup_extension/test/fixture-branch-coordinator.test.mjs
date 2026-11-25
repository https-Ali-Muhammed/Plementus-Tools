import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixtureBranchCoordinator } from '../src/background/fixture-branch-coordinator.mjs';
import { FIXTURE_SCOPE } from '../src/workflow/sandbox-branch-submission.mjs';
const sha='a'.repeat(40), url=`https://github.com/${FIXTURE_SCOPE.repository}/branches`;
const approval=()=>({...FIXTURE_SCOPE,operationId:'fixture-operation-integration',approvalReference:'fixture-approval-integration',sourceSha:sha,expiresAt:Date.now()+60000});
const sender={id:'fixture-extension',origin:'chrome-extension://fixture-extension',url:'chrome-extension://fixture-extension/src/popup/popup.html?workspace=1',tab:{id:7,incognito:false}};
const events={addListener(){},removeListener(){}};
function setup({ledger=new Map(), mutate, add, refs, permission=()=>true, authorization=()=>true}={}){
 const calls=[],session={},heads=[{ref:'refs/heads/main',sha}];let clicks=0;
 const store={add:async(key,value)=>{calls.push(`ledger:${key}`);if(add)return add(key,value,ledger);if(ledger.has(key))return false;ledger.set(key,structuredClone(value));return true;}};
 const api={runtime:{id:sender.id,getURL:p=>`${sender.origin}/${p}`},storage:{session:{setAccessLevel:async()=>{},get:async k=>({[k]:session[k]}),set:async v=>Object.assign(session,structuredClone(v))}},permissions:{contains:async()=>permission()},tabs:{create:async ({url:target})=>{assert.equal(target,url);calls.push('navigate');return {id:42,url:target}},get:async id=>({id,windowId:1,incognito:false,status:'complete',url}),onUpdated:events,onRemoved:events},scripting:{executeScript:async options=>{
   const name=options.func.name;calls.push(name);let result=name==='openNativeBranchDialog'?'DIALOG_OPENED':name==='prepareNativeBranchForm'?'FORM_PREPARED':true;
   if(name==='submitFixturePreparedBranch'){clicks++;heads.push({ref:`refs/heads/${FIXTURE_SCOPE.newBranch}`,sha});result='CLICK_DISPATCHED';}
   return mutate?.(name,options,result)??[{frameId:0,documentId:'fixture-document',result}];
 }}};
 const readRefs=async repository=>{calls.push('read');return refs?.(repository,heads)??{repository,complete:true,observedAt:Date.now(),heads:structuredClone(heads)}};
 const coordinator=createFixtureBranchCoordinator({api,ledger:store,readRefs,authorize:async()=>authorization(),waitMs:500});
 return {coordinator,ledger,calls,session,get clicks(){return clicks}};
}
test('worker-owned preparation hands off only the verified document; reservation and dispatch are persisted before action',async()=>{
 const f=setup(),r=await f.coordinator.run(approval(),sender);assert.equal(r.state,'FIXTURE_VERIFIED');assert.equal(r.liveExecutionAuthorized,false);assert.equal(f.clicks,1);
 assert.ok(f.calls.indexOf('ledger:reservation')<f.calls.indexOf('navigate'));assert.ok(f.calls.indexOf('ledger:dispatch')<f.calls.indexOf('submitFixturePreparedBranch'));assert.equal(f.ledger.get('outcome').state,'FIXTURE_VERIFIED');assert.equal(f.calls.filter(x=>x==='navigate').length,1);
});
test('rejects untrusted sender, nonfixture scope, invalid approval and missing authorization before navigation',async()=>{
 for(const [op,s,opts] of [[approval(),{...sender,origin:'https://github.com'},{}],[{...approval(),repository:'https-Ali-Muhammed/plementus-mvp-sandbox'},sender,{}],[{...approval(),expiresAt:0},sender,{}],[approval(),sender,{authorization:()=>false}]]){const f=setup(opts);assert.equal((await f.coordinator.run(op,s)).state,'BLOCKED');assert.equal(f.calls.includes('navigate'),false);assert.equal(f.ledger.size,0);}
});
test('atomic reservation prevents second controller instance and restarted replay even with new operation ID',async()=>{
 const ledger=new Map(),a=setup({ledger}),b=setup({ledger});const [r,s]=await Promise.all([a.coordinator.run(approval(),sender),b.coordinator.run({...approval(),operationId:'fixture-operation-other'},sender)]);assert.deepEqual([r.state,s.state].sort(),['BLOCKED','FIXTURE_VERIFIED']);assert.equal(a.clicks+b.clicks,1);const restarted=setup({ledger});assert.equal((await restarted.coordinator.run(approval(),sender)).state,'BLOCKED');assert.equal(restarted.calls.includes('navigate'),false);
});
test('missing or wrong final document never reaches submission',async()=>{
 const f=setup({mutate:(name,opts,result)=>name==='verifyPreparedNativeBranchForm'?[{frameId:0,documentId:'changed',result}]:null});const r=await f.coordinator.run(approval(),sender);assert.equal(r.state,'BLOCKED');assert.equal(f.clicks,0);assert.equal(f.ledger.has('dispatch'),false);
});
test('independent source mismatch or existing destination stops before preparation',async()=>{
 for(const heads of [[{ref:'refs/heads/main',sha:'b'.repeat(40)}],[{ref:'refs/heads/main',sha},{ref:'refs/heads/plementus-mvp-check',sha}]]){const f=setup({refs:repository=>({repository,complete:true,observedAt:Date.now(),heads})});assert.equal((await f.coordinator.run(approval(),sender)).state,'BLOCKED');assert.equal(f.calls.includes('navigate'),false);}
});
test('failed dispatch claim prevents native submission, and retains reservation',async()=>{
 const f=setup({add:async(key,value,ledger)=>{if(key==='dispatch')throw Error('storage unavailable');ledger.set(key,value);return true}});const r=await f.coordinator.run(approval(),sender);assert.equal(r.state,'BLOCKED');assert.equal(f.clicks,0);assert.equal(f.ledger.has('reservation'),true);
});
test('unconfirmed result cannot be promoted by the controller',async()=>{
 const f=setup({mutate:(name,opts,result)=>name==='submitFixturePreparedBranch'?[{frameId:0,documentId:'fixture-document',result:'UNKNOWN'}]:null});const r=await f.coordinator.run(approval(),sender);assert.equal(r.state,'OUTCOME_UNKNOWN');assert.equal(f.clicks,1);assert.equal(f.ledger.get('outcome').state,'OUTCOME_UNKNOWN');
});
test('lost outcome persistence is uncertain, never permits replay',async()=>{
 const f=setup({add:async(key,value,ledger)=>{if(key==='outcome')return false;ledger.set(key,value);return true}});const r=await f.coordinator.run(approval(),sender);assert.equal(r.state,'OUTCOME_UNKNOWN');assert.equal(f.clicks,1);const restart=setup({ledger:f.ledger});assert.equal((await restart.coordinator.run(approval(),sender)).state,'BLOCKED');assert.equal(restart.clicks,0);
});

test('reservation and dispatch are exclusive across separate instances sharing an atomic filesystem fixture store',async()=>{
 const {mkdtemp,open,rm}=await import('node:fs/promises');const {tmpdir}=await import('node:os');const {join}=await import('node:path');
 const dir=await mkdtemp(join(tmpdir(),'fixture-attempt-'));
 const add=async(key,value)=>{let file;try{file=await open(join(dir,key),'wx',0o600);await file.writeFile(JSON.stringify(value));await file.sync();return true;}catch(e){if(e.code==='EEXIST')return false;throw e;}finally{await file?.close();}};
 try{const a=setup({add}),b=setup({add});const r=await Promise.all([a.coordinator.run(approval(),sender),b.coordinator.run(approval(),sender)]);assert.deepEqual(r.map(x=>x.state).sort(),['BLOCKED','FIXTURE_VERIFIED']);assert.equal(a.clicks+b.clicks,1);const restarted=setup({add});assert.equal((await restarted.coordinator.run(approval(),sender)).reason,'RESERVATION_CONFLICT');assert.equal(restarted.clicks,0);}finally{await rm(dir,{recursive:true,force:true});}
});
test('late reservation completion cannot authorize any action',async()=>{
 let release;const pending=new Promise(r=>release=r);const f=setup({add:async(key,value,ledger)=>{await pending;ledger.set(key,value);return true}});
 const result=await f.coordinator.run(approval(),sender);assert.equal(result.reason,'RESERVATION_UNCONFIRMED');release();await new Promise(r=>setImmediate(r));assert.equal(f.calls.includes('navigate'),false);assert.equal(f.clicks,0);
});

test('post-reservation authorization loss consumes fixture scope without navigation',async()=>{
 let count=0;const f=setup({authorization:()=>++count===1});const r=await f.coordinator.run(approval(),sender);assert.equal(r.reason,'AUTHORIZATION_UNAVAILABLE');assert.equal(f.ledger.has('reservation'),true);assert.equal(f.calls.includes('navigate'),false);
});
test('IndexedDB adapter waits for transaction completion, rejects duplicates and unknown keys (event mock)',async()=>{
 const {createFixtureAttemptLedger}=await import('../src/background/fixture-attempt-ledger.mjs');let tx,req,closed=0,opens=0;
 const db={close(){closed++},transaction(){tx={objectStore(){return {add(){req={};return req}}}};return tx;}};
 const factory={open(){opens++;const r={result:db};queueMicrotask(()=>r.onsuccess());return r;}};
 const ledger=createFixtureAttemptLedger(factory);let completed=false;
 const p=ledger.add('reservation',{test:true}).then(v=>{completed=true;return v});await new Promise(r=>setImmediate(r));assert.equal(completed,false);tx.oncomplete();assert.equal(await p,true);
 const duplicate=ledger.add('reservation',{test:true});await new Promise(r=>setImmediate(r));req.error={name:'ConstraintError'};req.onerror();tx.onabort();assert.equal(await duplicate,false);
 await assert.rejects(ledger.add('unexpected',{test:true}),/unknown fixture checkpoint/);assert.equal(opens,2);assert.equal(closed,2);
});
