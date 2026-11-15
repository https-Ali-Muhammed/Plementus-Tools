import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { runInNewContext } from 'node:vm';
import { assessFixtureUtilitiesModules as assess } from '../src/odoo-sh/utilities-modules-fixture-flow.mjs';
const flags = 'browserObserved permissionVerified accountVerified rightsVerified subscriptionVerified approvalGranted executionAuthorized mutationAuthorized installationAuthorized trustedContinuingContext associationVerified productionDatabaseVerified stagingCopyVerified moduleInstalled effectsApplied readAuthorized writeAuthorized'.split(' ');
const rounds = [];
function inputs(r={},u={},m={}) {
 const common={version:1,projectToken:'fixture-project-001',environmentToken:'fixture-production-001',documentGeneration:4,contextGeneration:5,sequence:7,lifecycle:'active'};
 return [{...common,utilityToken:null,moduleToken:'pl_auth',review:'pending',...r},
 {...common,sequence:8,authentication:'none',utilityToken:null,handoff:'none',writeOutcome:'none',...u},
 {...common,sequence:8,authentication:'none',databaseToken:'fixture-customer-db-001',moduleToken:'pl_auth',availability:'available',installation:'not_installed',approval:'awaiting_approval',writeOutcome:'none',...m}];
}
function check(args,reason) {
 const out=assess(...args); assert.equal(out.reason,reason);
 assert.equal(out.evidenceTier,'SIMULATED'); assert.equal(out.provenance,'SYNTHETIC_UNTRUSTED'); assert.equal(out.fixtureOnly,true);
 for(const f of flags) assert.equal(out[f],false,f);
 assert.ok(Object.isFrozen(out)); assert.ok(JSON.stringify(out).length<=2048);
 assert.doesNotMatch(JSON.stringify(out),/fixture-project|fixture-utility|fixture-secret|https:|@/);
 assert.ok(Object.values(out).every(v=>['string','number','boolean'].includes(typeof v)));
 assert.deepEqual(assess(...args),out); assert.notEqual(assess(...args),out);
 rounds.push([[...args],JSON.stringify(out)]); return out;
}
function run(r,u,m,reason){return check(inputs(r,u,m).map(JSON.stringify),reason);}
const cases=[
 [{},{},{},'approval_awaiting_approval'],
 [{utilityToken:'fixture-utility-001'},{utilityToken:'fixture-utility-001'}, {},'utilities_review_required'],
 ...['configured','access_reported','unknown','failed','denied','conflicting'].map((handoff,i)=>[{utilityToken:'fixture-utility-001'},{utilityToken:'fixture-utility-001',handoff},{},['configuration_unverified','access_unverified','utilities_unknown','utilities_failed','utilities_denied','utilities_conflicting'][i]]),
 [{},{handoff:'configured'},{},'utilities_conflicting'],
 [{},{utilityToken:'fixture-utility-002'},{},'utilities_target_mismatch'],
 [{review:'declined'},{},{},'utilities_denied'],
 [{},{},{databaseToken:null},'module_target_mismatch'],
 [{},{},{databaseToken:'fixture-customer-db-002'},'module_target_mismatch'],
 [{moduleToken:null},{},{},'module_missing'],
 [{moduleToken:'fixture-missing-module'},{},{},'module_missing'],
 [{},{},{moduleToken:'cedar_labels'},'module_selection_mismatch'],
 ...['conflicting','stale','unknown','missing'].map(availability=>[{},{},{availability},'availability_'+availability]),
 ...['conflicting','stale','unknown'].map(installation=>[{},{},{installation},'installation_'+installation]),
 [{},{},{installation:'reported_installed',approval:'reviewed'},'installation_baseline_conflict'],
 [{moduleToken:'cedar_labels'},{},{moduleToken:'cedar_labels'},'installation_baseline_conflict'],
 [{moduleToken:'cedar_labels'},{},{moduleToken:'cedar_labels',installation:'reported_installed',approval:'reviewed'},'installation_report_untrusted'],
 ...['conflicting','declined','missing','awaiting_approval'].map(approval=>[{},{},{approval},'approval_'+approval]),
 [{},{},{approval:'reviewed'},'installation_pending'],
 [{moduleToken:'cedar_labels'},{},{moduleToken:'cedar_labels',installation:'static_installed',approval:'reviewed'},'static_fixture_installed'],
];
for (const [i,c] of cases.entries()) test(`checkpoint ${i}: ${c[3]}`,()=>run(...c));
const failures=[
 [{},{writeOutcome:'uncertain'},{},'possible_write_unresolved'],
 [{lifecycle:'cancelled'},{},{},'operator_cancelled'],
 [{},{},{lifecycle:'worker_lost'},'context_lost'],
 [{},{lifecycle:'interrupted'},{},'interrupted'],
 [{},{authentication:'mfa'},{},'authentication_required'],
 [{documentGeneration:null},{},{},'document_generation_missing'],
 [{},{documentGeneration:3},{},'document_generation_mismatch'],
 [{contextGeneration:null},{},{},'context_generation_missing'],
 [{},{},{contextGeneration:6},'context_generation_mismatch'],
 [{},{sequence:7},{},'duplicate_observation'],
 [{},{},{sequence:6},'delayed_observation'],
 [{},{sequence:9},{},'observation_gap'],
 [{projectToken:null},{},{},'target_missing'],
 [{},{},{environmentToken:'fixture-staging-001'},'target_mismatch'],
];
for(const [i,c] of failures.entries()) test(`global ${i}: ${c[3]}`,()=>run(...c));
test('compatible competing global failures follow first match',()=>{
 for(let i=0;i<failures.length;i++)for(let j=i+1;j<failures.length;j++) {
  const a=failures[i],b=failures[j];
  if([0,1,2].some(s=>Object.keys(a[s]).some(k=>k in b[s]&&a[s][k]!==b[s][k])))continue;
  run(...[0,1,2].map(s=>({...b[s],...a[s]})),a[3]);
 }
});
test('uncertainty persists through review installation and cancellation reports',()=>{
 for(const review of ['pending','reviewed','declined'])for(const installation of ['static_installed','reported_installed','not_installed'])
 run({review,lifecycle:'cancelled'},{writeOutcome:'uncertain'},{installation},'possible_write_unresolved');
 run({},{},{writeOutcome:'uncertain'},'possible_write_unresolved');
});
test('each lifecycle and authentication envelope fails closed',()=>{
 for(let s=0;s<3;s++)for(const [lifecycle,reason] of [['cancelled','operator_cancelled'],['worker_lost','context_lost'],['session_lost','context_lost'],['interrupted','interrupted']]){const a=inputs();a[s].lifecycle=lifecycle;check(a.map(JSON.stringify),reason);}
 for(const s of [1,2])for(const authentication of ['login','mfa','captcha','session_expired']){const a=inputs();a[s].authentication=authentication;check(a.map(JSON.stringify),'authentication_required');}
});
test('independent states never infer access from a static installation',()=>{
 const a=run({utilityToken:'fixture-utility-001',moduleToken:'cedar_labels'},{utilityToken:'fixture-utility-001',handoff:'access_reported'},{moduleToken:'cedar_labels',installation:'static_installed',approval:'reviewed'},'access_unverified');
 assert.equal(a.moduleReason,'static_fixture_installed'); assert.equal(a.utilitiesReason,'access_unverified');
 const b=run({utilityToken:'fixture-utility-001'},{utilityToken:'fixture-utility-001',handoff:'configured'},{},'configuration_unverified');assert.equal(b.moduleReason,'approval_awaiting_approval');
});
test('hostile values never invoke hooks',()=>{
 let touched=0;const trap=()=>{touched++;throw Error('fixture-secret');};const p=new Proxy({}, {get:trap,ownKeys:trap});const revoked=Proxy.revocable({},{});revoked.revoke();
 for(const bad of [p,revoked.proxy,{get version(){return trap();}}, {toString:trap,toJSON:trap},null,undefined,1,1n,Symbol(),[],new String('{}')])for(let s=0;s<3;s++){const a=inputs().map(JSON.stringify);a[s]=bad;check(a,'invalid_input');}assert.equal(touched,0);
});
test('strict transport closed fields types bounds versions and ordering',()=>{
 for(let s=0;s<3;s++){
  const base=inputs()[s],text=JSON.stringify(base);
  for(const bad of ['', '{','null','[]',text+'\n',' '+text,text.replace('"version":1','"version":1,"version":1'),text.replace('"version":1','"version":1.0'),text.replace('fixture-project','\\u0066ixture-project'),text.replace('fixture-project','é'),JSON.stringify(Object.fromEntries(Object.entries(base).reverse()))]){const a=inputs().map(JSON.stringify);a[s]=bad;check(a,'invalid_input');}
  for(const k of Object.keys(base)){
   for(const bad of [{},[],true,'fixture-secret']){const a=inputs();a[s][k]=bad;check(a.map(JSON.stringify),'invalid_input');}
   const a=inputs();delete a[s][k];check(a.map(JSON.stringify),'invalid_input');
  }
  for(const k of ['version','sequence','documentGeneration','contextGeneration'])for(const bad of [-1,0.5,1000001]){const a=inputs();a[s][k]=bad;check(a.map(JSON.stringify),'invalid_input');}
  const a=inputs();a[s].version=2;check(a.map(JSON.stringify),'unsupported_version');a[s].extra=true;check(a.map(JSON.stringify),'invalid_input');
  const b=inputs().map(JSON.stringify);b[s]='x'.repeat(1025);check(b,'input_too_large');b[(s+1)%3]={};check(b,'invalid_input');
 }
});
test('baseline inert HTML markers remain honest',()=>{
 const p=readFileSync(new URL('../fixtures/odoo-sh/production.html',import.meta.url),'utf8');const a=readFileSync(new URL('../fixtures/customer-odoo/apps.html',import.meta.url),'utf8');
 assert.match(p,/utility-access-checkpoint/);assert.match(p,/no repository access is granted/);assert.match(p,/module-installation-checkpoint/);assert.match(p,/<button[^>]*disabled/);
 assert.match(a,/module-pl-auth" data-availability="available" data-installation="not-installed"/);assert.match(a,/module-cedar-labels" data-availability="available" data-installation="installed"/);assert.match(a,/data-state="awaiting-approval"/);assert.match(a,/data-fixture="install-control" disabled/);
});
test('replay and cancellation are stateless and outputs immutable',()=>{
 const before=run({},{},{},'approval_awaiting_approval');run({lifecycle:'cancelled'},{},{},'operator_cancelled');assert.deepEqual(run({},{},{},'approval_awaiting_approval'),before);assert.throws(()=>{before.approvalGranted=true;},TypeError);
});
test('M isolation: import initialization and all scenarios have zero capability access',()=>{
 const source=readFileSync(new URL('../src/odoo-sh/utilities-modules-fixture-flow.mjs',import.meta.url),'utf8');
 const names='import require fetch XMLHttpRequest WebSocket chrome browser localStorage sessionStorage indexedDB process eval Function globalThis window document navigator Date performance setTimeout setInterval setImmediate queueMicrotask Worker Promise console'.split(' ');
 assert.doesNotMatch(source,new RegExp('\\b(?:'+names.join('|')+')\\b'));assert.doesNotMatch(source,/Math\.random|node:|child_process/);
 for(const f of readdirSync(new URL('../src/',import.meta.url),{recursive:true,withFileTypes:true}))if(f.isFile()&&/\.(mjs|js|html|json)$/.test(f.name)&&f.name!=='utilities-modules-fixture-flow.mjs')assert.doesNotMatch(readFileSync(`${f.parentPath}/${f.name}`,'utf8'),/utilities-modules-fixture-flow|assessFixtureUtilitiesModules/);
 let touched=0;const context={};for(const k of names)Object.defineProperty(context,k,{get(){touched++;throw Error('capability');}});
 const isolated=runInNewContext(source.replace('export function','function')+'\nassessFixtureUtilitiesModules;',context,{codeGeneration:{strings:false,wasm:false}});
 for(const [args,want] of rounds)assert.equal(JSON.stringify(isolated(...args)),want);assert.equal(touched,0);
});
