import assert from 'node:assert/strict';
import { chromium } from 'playwright';
import { reviewedSandboxBranchButton } from '../src/github/reviewed-sandbox-submission.mjs';

// Offline DOM contract only: no provider navigation, login, permissions, or ref writes.
const repository = 'https-Ali-Muhammed/plementus-mvp-sandbox';
const name = 'plementus-mvp-test01';
const url = `https://github.com/${repository}/branches`;
const html = `<dialog open><h2>Create a branch</h2>
  <label for="name">New branch name</label><input id="name" type="text" value="${name}">
  <label>Source</label><button type="button" id="ref-picker-main" aria-haspopup="true" aria-label="main branch">main</button>
  <button type="button" id="create">Create new branch</button></dialog>`;
const browser = await chromium.launch({headless:true,
  ...(process.env.CHROMIUM_EXECUTABLE ? {executablePath:process.env.CHROMIUM_EXECUTABLE}:{}),
  args:['--no-sandbox','--disable-background-networking','--disable-component-update','--disable-sync']});
const context = await browser.newContext();
let intercepted = 0;
try {
  await context.route('**/*',route=>{intercepted++;return route.abort();});
  const page = await context.newPage();
  async function reset() {
    await page.setContent(html);
    await page.evaluate(target=>{
      window.contractLocation=new URL(target);window.clickCount=0;window.submitCount=0;
      document.querySelector('#create').onclick=()=>window.clickCount++;
      document.querySelector('dialog').onsubmit=e=>{window.submitCount++;e.preventDefault();};
    },url);
  }
  const run = (mode='inspect', args=[repository,'main',name,Date.now()+5000,mode]) =>
    page.evaluate(({source,args})=>new Function('location','args',`return (${source})(...args)`)(window.contractLocation,args),
      {source:reviewedSandboxBranchButton.toString(),args});
  const counts=()=>page.evaluate(()=>[window.clickCount,window.submitCount]);
  await reset();assert.equal(await run(),'READY');assert.deepEqual(await counts(),[0,0]);
  assert.equal(await run('dispatch'),'CLICK_DISPATCHED');assert.deepEqual(await counts(),[1,0]);
  const negative = [
    ['missing explicit type',()=>document.querySelector('#create').removeAttribute('type')],
    ['submit type',()=>document.querySelector('#create').type='submit'],
    ['disabled',()=>document.querySelector('#create').disabled=true],
    ['hidden',()=>document.querySelector('#create').hidden=true],
    ['aria-disabled',()=>document.querySelector('#create').setAttribute('aria-disabled','true')],
    ['aria-label differs from observed contract',()=>document.querySelector('#create').setAttribute('aria-label','Create new branch')],
    ['popup attribute',()=>document.querySelector('#create').setAttribute('aria-haspopup','false')],
    ['associated form',()=>{const form=document.createElement('form');document.querySelector('dialog').append(form);form.append(document.querySelector('#create'));}],
    ['form attribute',()=>document.querySelector('#create').setAttribute('form','other')],
    ['form override',()=>document.querySelector('#create').setAttribute('formaction','https://example.invalid/')],
    ['ambiguous button',()=>document.querySelector('dialog').insertAdjacentHTML('beforeend','<button type="button" disabled>Create new branch</button>')],
    ['second visible dialog',()=>document.body.insertAdjacentHTML('beforeend','<dialog open>Other</dialog>')],
    ['busy dialog',()=>document.querySelector('dialog').setAttribute('aria-busy','true')],
    ['inert dialog',()=>document.querySelector('dialog').setAttribute('inert','')],
    ['wrong name',()=>document.querySelector('#name').value='other'],
    ['read-only name',()=>document.querySelector('#name').readOnly=true],
    ['ambiguous name label',()=>document.querySelector('dialog').insertAdjacentHTML('beforeend','<label>New branch name</label>')],
    ['source changed',()=>document.querySelector('#ref-picker-main').textContent='develop'],
    ['source label changed',()=>document.querySelector('#ref-picker-main').setAttribute('aria-label','develop branch')],
    ['source picker disabled',()=>document.querySelector('#ref-picker-main').disabled=true],
    ['heading changed',()=>document.querySelector('h2').textContent='New branch'],
    ['pending query',()=>window.contractLocation.search='?changed=1'],
    ['wrong repository location',()=>window.contractLocation.pathname='/other/repo/branches'],
  ];
  for (const [label, mutate] of negative) {
    await reset();await page.evaluate(mutate);
    assert.equal(await run('dispatch'),'NOT_READY',label);assert.deepEqual(await counts(),[0,0],label);
  }
  await reset();
  for (const args of [
    ['other/repo','main',name,Date.now()+5000,'dispatch'],
    [repository,'develop',name,Date.now()+5000,'dispatch'],
    [repository,'main','other',Date.now()+5000,'dispatch'],
    [repository,'main',name,Date.now()-1,'dispatch'],
    [repository,'main',name,Date.now()+60000,'dispatch'],
    [repository,'main',name,Date.now()+5000,'unknown'],
  ]) assert.equal(await run('dispatch',args),'NOT_READY');
  assert.deepEqual(await counts(),[0,0]);
  assert.equal(intercepted,0);
  console.log(`PASS: isolated Chromium DOM, 1 inspection, 1 native fixture click, ${negative.length+6} blocked scenarios, zero external requests; no runtime or live write`);
} finally {await context.close();await browser.close();}
