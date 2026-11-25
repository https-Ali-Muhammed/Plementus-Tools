import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { submitFixturePreparedBranch } from '../src/github/native-branch-submission.mjs';
import { createFixtureBranchSubmission, FIXTURE_SCOPE } from '../src/workflow/sandbox-branch-submission.mjs';
import { prepareWorkspaceBranch } from '../src/popup/workspace-branch-preparation.mjs';

const url = `https://github.com/${FIXTURE_SCOPE.repository}/branches`;
// Explicit fallback for environments that prohibit navigation even to routed fixtures.
const simulatedLocation = process.env.PLEMENTUS_FIXTURE_SIMULATED_LOCATION === '1';
const name = FIXTURE_SCOPE.newBranch;
const sha = 'a'.repeat(40);
const marker = 'data-plementus-test-fixture="branch-submission-v1"';
const button = '<button type="button" id="create">Create new branch</button>';
const fixture = (picker = true, prepared = true, create = button) => `<html ${marker}><body>
  <dialog open><h2>${picker?'Create a branch':'New branch'}</h2>${picker?
  '<label>Source</label><button type="button" id="ref-picker-fixture" aria-haspopup="true" aria-label="main branch">main</button>':
  '<label for="source">Source branch</label><input id="source" value="main">'}
  <label for="name">New branch name</label><input type="text" id="name" value="${prepared?name:''}">${create}</dialog></body></html>`;
const browser = await chromium.launch({ headless:true,
  ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE} : {}),
  args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-sync'] });
const context = await browser.newContext();
let routeBody = fixture();
let blocked = 0;
try {
  await context.route('**/*', route => route.request().url() === url ?
    route.fulfill({status:200,contentType:'text/html',body:routeBody}) : (blocked++,route.abort()));
  const page = await context.newPage();
  async function loadFixtureDocument(html) {
    routeBody = html;
    if (simulatedLocation) {
      await page.setContent(html);
      await page.evaluate(target => { window.__fixtureLocation = new URL(target); }, url);
    } else await page.goto(url);
  }
  async function load(html = fixture()) {
    await loadFixtureDocument(html);
    await page.evaluate(() => {
      window.clicks = 0; window.submits = 0;
      document.addEventListener('click', e => { if(e.target.id === 'create')window.clicks++ });
      document.addEventListener('submit', e => { window.submits++; e.preventDefault() });
    });
  }
  const evaluate = (func,args) => page.evaluate(({source,args,simulated})=> simulated
    ? new Function('location','args', `return (${source})(...args)`)(window.__fixtureLocation,args)
    : (0,eval)(`(${source})`)(...args),{source:func.toString(),args,simulated:simulatedLocation});
  const submit = (deadline = Date.now()+5000, repo=FIXTURE_SCOPE.repository) => evaluate(submitFixturePreparedBranch,[repo,'main',name,deadline]);
  let positive = 0, negative = 0;
  for(const picker of [true,false]) {
    await load(fixture(picker));
    assert.equal(await submit(),'CLICK_DISPATCHED');
    assert.deepEqual(await page.evaluate(()=>[window.clicks,window.submits]),[1,0]);positive++;
  }
  const postForm = fixture(false).replace('<h2>',`<form method="post" action="${url}"><h2>`).replace(button,'<button id="create" type="submit">Create new branch</button></form>');
  await load(postForm);
  assert.equal(await submit(),'CLICK_DISPATCHED');
  assert.deepEqual(await page.evaluate(()=>[window.clicks,window.submits]),[1,1]);positive++;
  const invalid = [
    ['missing fixture marker', () => document.documentElement.removeAttribute('data-plementus-test-fixture')],
    ['wrong branch', () => {document.querySelector('#name').value='other'}],
    ['wrong source', () => {document.querySelector('#ref-picker-fixture').textContent='other'}],
    ['wrong accessibility label', () => document.querySelector('#ref-picker-fixture').setAttribute('aria-label','other branch')],
    ['hidden input', () => {document.querySelector('#name').hidden=true}],
    ['read-only input', () => {document.querySelector('#name').readOnly=true}],
    ['disabled button', () => {document.querySelector('#create').disabled=true}],
    ['hidden button', () => {document.querySelector('#create').hidden=true}],
    ['busy dialog', () => document.querySelector('dialog').setAttribute('aria-busy','true')],
    ['inert dialog', () => document.querySelector('dialog').setAttribute('inert','')],
    ['ambiguous button', () => document.querySelector('dialog').insertAdjacentHTML('beforeend','<button type="button" disabled>Create new branch</button>')],
    ['ambiguous heading', () => document.querySelector('dialog').insertAdjacentHTML('beforeend','<h2>New branch</h2>')],
    ['ambiguous name', () => document.querySelector('dialog').insertAdjacentHTML('beforeend','<label for="dup">New branch name</label><input id="dup">')],
    ['external form target', () => document.querySelector('#create').setAttribute('form','other')],
    ['override action', () => document.querySelector('#create').setAttribute('formaction','https://example.invalid/')],
    ['unsupported submit outside form', () => {document.querySelector('#create').type='submit'}],
    ['wrong control text', () => {document.querySelector('#create').textContent='Cancel'}],
    ['wrong location', () => {if(window.__fixtureLocation)window.__fixtureLocation.hash='#changed';else history.replaceState(null,'','#changed')}],
  ];
  for(const [label,mutate] of invalid) {
    await load();await page.evaluate(mutate);
    assert.equal(await submit(),'NOT_READY',label);
    assert.deepEqual(await page.evaluate(()=>[window.clicks,window.submits]),[0,0],label);negative++;
  }
  await load();assert.equal(await submit(Date.now()-1),'NOT_READY');negative++;
  assert.equal(await submit(Date.now()+5000,'https-Ali-Muhammed/plementus-mvp-sandbox'),'NOT_READY');negative++;
  assert.deepEqual(await page.evaluate(()=>[window.clicks,window.submits]),[0,0]);
  // Actual preparation engine and submission candidate share the same captured fixture document.
  // The separate in-memory provider model is updated only by the native fixture click event.
  const head = {ref:'refs/heads/main',sha};
  const destination = {ref:`refs/heads/${name}`,sha};
  const refs=[head];let writes=0, navigation=0, claims=0, readCount=0;
  await page.exposeFunction('fixtureCreateBranch',()=>{writes++; if(writes===1)refs.push(destination);return true});
  const dialog = fixture(true,false).match(/<dialog[\s\S]*<\/dialog>/)[0];
  routeBody = `<html ${marker}><body><button type="button" id="opener">New branch</button><script>
    document.querySelector('#opener').addEventListener('click',()=>{
      document.body.insertAdjacentHTML('beforeend',${JSON.stringify(dialog)});
      document.querySelector('#create').addEventListener('click',()=>{window.providerWrite=window.fixtureCreateBranch()});
    });</script></body></html>`;
  const listeners={addListener(){},removeListener(){}};
  const doc='fixture-e2e-document';const tabId=71;let captured;
  const api={permissions:{contains:async()=>true},tabs:{create:async ({url:target})=>{
    assert.equal(target,url);navigation++;await loadFixtureDocument(routeBody);return {id:tabId,url:target};},
    get:async id=>({id,windowId:1,incognito:false,status:'complete',url:simulatedLocation?url:page.url()}),onUpdated:listeners,onRemoved:listeners},
    scripting:{executeScript:async options=>{
      assert.equal(options.target.tabId,tabId);
      if(options.target.documentIds)assert.deepEqual(options.target.documentIds,[doc]);
      else assert.deepEqual(options.target.frameIds,[0]);
      const result=await evaluate(options.func,options.args);
      if(options.func.name==='verifyPreparedNativeBranchForm' && result===true)captured={tabId,documentId:doc};
      if(options.func.name==='submitFixturePreparedBranch' && result==='CLICK_DISPATCHED')await page.evaluate(()=>window.providerWrite);
      return [{frameId:0,documentId:doc,result}];
    }}};
  const prepared=await prepareWorkspaceBranch({api,review:{...FIXTURE_SCOPE,destination:url},permissionRequest:Promise.resolve(true),fresh:()=>true,onState:()=>{}});
  assert.equal(prepared,'FORM_PREPARED');assert.ok(captured);assert.equal(writes,0);
  const op={...FIXTURE_SCOPE,operationId:'fixture-operation-e2e',approvalReference:'fixture-approval-e2e',sourceSha:sha,expiresAt:Date.now()+15000};
  const executor=createFixtureBranchSubmission({api,fresh:()=>true,authorize:async()=>true,
    claimAttempt:async()=>++claims===1,readRefs:async repository=>{readCount++;return {repository,complete:true,observedAt:Date.now(),heads:refs.map(x=>({...x}))}}});
  const result=await executor.run(op,{...captured,operationId:op.operationId,state:prepared});
  assert.equal(result.state,'FIXTURE_VERIFIED');assert.equal(result.liveExecutionAuthorized,false);
  assert.equal(writes,1);assert.equal(navigation,1);assert.equal(claims,1);assert.equal(readCount,3);
  assert.deepEqual(refs,[head,destination]);
  assert.equal((await executor.run(op,{...captured,operationId:op.operationId,state:prepared})).state,'BLOCKED');assert.equal(writes,1);
  console.log(`PASS (${simulatedLocation ? "isolated DOM, simulated location" : "routed fixture"}): ${positive} positive + ${negative} blocked Chromium DOM scenarios; 1 full preparation/submission fixture; ${blocked} nonfixture requests intercepted`);
} finally { await context.close();await browser.close(); }
