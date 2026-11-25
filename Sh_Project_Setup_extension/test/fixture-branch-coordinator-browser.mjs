import assert from 'node:assert/strict';
import { mkdtemp, open, rm, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createFixtureBranchCoordinator } from '../src/background/fixture-branch-coordinator.mjs';
import { FIXTURE_SCOPE } from '../src/workflow/sandbox-branch-submission.mjs';

const simulated=process.env.PLEMENTUS_FIXTURE_SIMULATED_LOCATION==='1';
const url=`https://github.com/${FIXTURE_SCOPE.repository}/branches`;
const sha='a'.repeat(40), heads=[{ref:'refs/heads/main',sha}];
const sender={id:'fixture-extension',origin:'chrome-extension://fixture-extension',url:'chrome-extension://fixture-extension/src/popup/popup.html?workspace=1',tab:{id:7,incognito:false}};
const op=()=>({...FIXTURE_SCOPE,operationId:'fixture-operation-controller',approvalReference:'fixture-approval-controller',sourceSha:sha,expiresAt:Date.now()+60000});
const html=`<html data-plementus-test-fixture="branch-submission-v1"><body><button type="button" id="opener">New branch</button><script>
document.querySelector('#opener').onclick=()=>{const dialog=document.createElement('dialog');dialog.open=true;
dialog.innerHTML='<h2>Create a branch</h2><label>Source</label><button id="ref-picker-fixture" type="button" aria-haspopup="true" aria-label="main branch">main</button><label for="name">New branch name</label><input id="name" type="text"><button id="create" type="button">Create new branch</button>';
document.body.append(dialog);document.querySelector('#create').onclick=()=>{window.providerResult=window.fixtureCreate()};};</script></body></html>`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-sync']});
let dir;
try{
 const context=await browser.newContext();let blocked=0;
 await context.route('**/*',route=>route.request().url()===url?route.fulfill({status:200,contentType:'text/html',body:html}):(blocked++,route.abort()));
 const page=await context.newPage();let clicks=0,navigation=0;const calls=[];const session={};
 await page.exposeFunction('fixtureCreate',()=>{clicks++;heads.push({ref:`refs/heads/${FIXTURE_SCOPE.newBranch}`,sha});return true});
 async function load(){if(simulated){await page.setContent(html);await page.evaluate(u=>window.fixtureLocation=new URL(u),url)}else await page.goto(url)}
 await load();
 let ledger;
 if(simulated){
   // An opaque simulated page cannot provide origin-scoped IndexedDB. The fallback uses
   // a real atomic filesystem test adapter and never the installed extension runtime.
   dir=await mkdtemp(join(tmpdir(),'fixture-controller-browser-'));
   ledger={add:async(key,value)=>{let f;try{f=await open(join(dir,key),'wx',0o600);await f.writeFile(JSON.stringify(value));await f.sync();return true}catch(e){if(e.code==='EEXIST')return false;throw e}finally{await f?.close()}}};
 }else{
   // Execute the exact ledger module inside the ephemeral routed fixture origin.
   const source=await readFile(new URL('../src/background/fixture-attempt-ledger.mjs',import.meta.url),'utf8');
   await page.evaluate(source=>{window.fixtureLedgerFactory=new Function(source.replace('export function','function')+'\nreturn createFixtureAttemptLedger;')()},source);
   ledger={add:(key,value)=>page.evaluate(({key,value})=>window.fixtureLedgerFactory(indexedDB).add(key,value),{key,value})};
 }
 const events={addListener(){},removeListener(){}};const api={runtime:{id:sender.id,getURL:p=>`${sender.origin}/${p}`},storage:{session:{setAccessLevel:async()=>{},get:async key=>({[key]:session[key]}),set:async v=>Object.assign(session,structuredClone(v))}},permissions:{contains:async()=>true},
 tabs:{create:async({url:target})=>{assert.equal(target,url);navigation++;return {id:42,url:target}},get:async id=>({id,windowId:1,incognito:false,status:'complete',url}),onUpdated:events,onRemoved:events},
 scripting:{executeScript:async options=>{assert.equal(options.target.tabId,42);calls.push(options.func.name);
   if(options.target.documentIds)assert.deepEqual(options.target.documentIds,['fixture-controller-document']);else assert.deepEqual(options.target.frameIds,[0]);
   const result=await page.evaluate(({source,args,simulated})=>simulated?new Function('location','args',`return (${source})(...args)`)(window.fixtureLocation,args):(0,eval)(`(${source})`)(...args),{source:options.func.toString(),args:options.args,simulated});
   if(result==='CLICK_DISPATCHED')await page.evaluate(()=>window.providerResult);
   return [{frameId:0,documentId:'fixture-controller-document',result}];}}};
 const readRefs=async repository=>({repository,complete:true,observedAt:Date.now(),heads:structuredClone(heads)});
 const authority=async()=>true;
 const make=()=>createFixtureBranchCoordinator({api,ledger,readRefs,authorize:authority});
 const result=await make().run(op(),sender);
 assert.equal(result.state,'FIXTURE_VERIFIED');assert.equal(result.liveExecutionAuthorized,false);assert.equal(clicks,1);assert.equal(navigation,1);assert.equal(calls.filter(x=>x==='submitFixturePreparedBranch').length,1);
 // A separate instance with the exact original preflight snapshot must still lose the
 // immutable reservation, rather than relying solely on seeing the branch already exists.
 const restarted=createFixtureBranchCoordinator({api,ledger,authorize:authority,readRefs:async repository=>({repository,complete:true,observedAt:Date.now(),heads:[heads[0]]})});
 assert.equal((await restarted.run(op(),sender)).reason,'RESERVATION_CONFLICT');assert.equal(clicks,1);assert.equal(navigation,1);
 assert.deepEqual(Object.keys(session),['fixtureBranchSubmission.preparation.v1']);
 if(!simulated){const duplicate=await Promise.all([ledger.add('dispatch',{other:true}),ledger.add('reservation',{other:true})]);assert.deepEqual(duplicate,[false,false]);}
 assert.equal(blocked,0);console.log(`PASS: actual preparation controller + native Chromium fixture + ${simulated?'atomic filesystem test ledger (simulated location)':'IndexedDB ledger (routed fixture)'}; one navigation, one click, no replay, no external requests`);
 await context.close();
}finally{await browser.close();if(dir)await rm(dir,{recursive:true,force:true});}
