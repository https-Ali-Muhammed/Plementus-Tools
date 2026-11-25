import assert from 'node:assert/strict';
import { mkdtemp, open, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { chromium } from 'playwright';
import { createReviewedSandboxExecution, REVIEWED_SCOPE as scope } from '../src/background/reviewed-sandbox-execution.mjs';
// Never visit the actual repository. Simulate location in an isolated DOM and
// route-abort every network request. All authority and ref evidence is synthetic.
const url=`https://github.com/${scope.repository}/branches`;
const source={ref:'refs/heads/main',sha:scope.sourceSha}, destination={ref:`refs/heads/${scope.newBranch}`,sha:scope.sourceSha};
const heads=[source], sender={id:'fixture-extension',origin:'chrome-extension://fixture-extension',url:'chrome-extension://fixture-extension/src/popup/popup.html?workspace=1',frameId:0,tab:{id:7,incognito:false}};
const message={type:'REVIEWED_SANDBOX_CREATE',acknowledged:true};
const decision={scope,securityApprovalReference:'synthetic-independent-review',operator:'fixture-operator',reviewer:'fixture-reviewer',expiresAt:Date.now()+60000};
const html=`<html><body><button type="button" id="opener">New branch</button><script>
document.querySelector('#opener').onclick=()=>{const dialog=document.createElement('dialog');dialog.open=true;
dialog.innerHTML='<h2>Create a branch</h2><label>Source</label><button id="ref-picker-fixture" type="button" aria-haspopup="true" aria-label="main branch">main</button><label for="name">New branch name</label><input id="name" type="text"><button id="create" type="button">Create new branch</button>';
document.body.append(dialog);document.querySelector('#create').onclick=()=>{window.providerResult=window.fixtureCreate()};};</script></body></html>`;
const browser=await chromium.launch({headless:true,...(process.env.CHROMIUM_EXECUTABLE?{executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-sync']});
let dir;
try{
  const context=await browser.newContext();let external=0;
  await context.route('**/*',route=>{external++;return route.abort();});
  const page=await context.newPage();let clicks=0,navigations=0;const calls=[],session={};
  await page.exposeFunction('fixtureCreate',()=>{clicks++;heads.push(destination);return true;});
  await page.setContent(html);await page.evaluate(u=>window.fixtureLocation=new URL(u),url);
  dir=await mkdtemp(join(tmpdir(),'reviewed-sandbox-offline-'));
  const ledger={add:async(key,value)=>{let f;try{f=await open(join(dir,key),'wx',0o600);await f.writeFile(JSON.stringify(value));await f.sync();return true;}catch(e){if(e.code==='EEXIST')return false;throw e;}finally{await f?.close();}}};
  const events={addListener(){},removeListener(){}};
  const api={runtime:{id:sender.id,getURL:p=>`${sender.origin}/${p}`},storage:{session:{setAccessLevel:async()=>{},get:async k=>({[k]:session[k]}),set:async v=>Object.assign(session,structuredClone(v))}},permissions:{contains:async()=>true},tabs:{create:async o=>{assert.equal(o.url,url);navigations++;return{id:42,url};},get:async id=>({id,windowId:1,incognito:false,status:'complete',url}),onUpdated:events,onRemoved:events},scripting:{executeScript:async options=>{
    assert.equal(options.target.tabId,42);calls.push(options.func.name);
    if(options.target.documentIds)assert.deepEqual(options.target.documentIds,['fixture-doc']);else assert.deepEqual(options.target.frameIds,[0]);
    const result=await page.evaluate(({source,args})=>new Function('location','args',`return (${source})(...args)`)(window.fixtureLocation,args),{source:options.func.toString(),args:options.args});
    if(result==='CLICK_DISPATCHED')await page.evaluate(()=>window.providerResult);
    return [{frameId:0,documentId:'fixture-doc',result}];
  }}};
  const make=(readRefs=async repository=>({repository,complete:true,observedAt:Date.now(),heads:structuredClone(heads)}))=>createReviewedSandboxExecution({api,ledger,authorize:async()=>decision,readRefs});
  const result=await make().run(message,sender);assert.equal(result.state,'REFS_MATCHED');assert.equal(result.clickConfirmed,true);assert.equal(navigations,1);assert.equal(clicks,1);
  assert.equal(calls.filter(x=>x==='reviewedSandboxBranchButton').length,2);
  const replay=await make(async repository=>({repository,complete:true,observedAt:Date.now(),heads:[source]})).run(message,sender);assert.equal(replay.reason,'RESERVATION_CONFLICT');assert.equal(clicks,1);assert.equal(navigations,1);assert.equal(external,0);
  console.log('PASS: exact-scope coordinator + actual preparation engine + native button in isolated Chromium; synthetic approval/refs, atomic filesystem ledger, zero external requests, one click, no replay.');
  await context.close();
}finally{await browser.close();if(dir)await rm(dir,{recursive:true,force:true});}
