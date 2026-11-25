import test from 'node:test';
import assert from 'node:assert/strict';
import { createFixtureBranchSubmission, FIXTURE_SCOPE } from '../src/workflow/sandbox-branch-submission.mjs';
const sha = 'a'.repeat(40);
const operation = { ...FIXTURE_SCOPE, operationId: 'fixture-operation-1', approvalReference: 'fixture-approval-1', sourceSha: sha, expiresAt: 5000 };
const target = { operationId: operation.operationId, tabId: 42, documentId: 'fixture-document', state: 'FORM_PREPARED' };
const head = { ref: 'refs/heads/main', sha };
const branch = { ref: 'refs/heads/plementus-mvp-check', sha };
const deferred = () => { let resolve; const promise = new Promise(r => { resolve = r; }); return { promise, resolve }; };
function fixture() {
  const calls = [];
  const state = { now: 1000, allowed: true, granted: true, fresh: true, claimed: false, reads: 0, clicked: false,
    before: [head], after: [head, branch], claimResult: true, result: 'CLICK_DISPATCHED', documentId: target.documentId };
  const api = { permissions: { contains: async () => state.granted }, tabs: { get: async id => ({ id, windowId: 1,
    incognito: false, status: 'complete', url: `https://github.com/${operation.repository}/branches` }) },
    scripting: { executeScript: async options => {
      calls.push(options.func.name);
      assert.deepEqual(options.target, { tabId: 42, documentIds: [target.documentId] });
      if (options.func.name === 'verifyPreparedNativeBranchForm') return [{ frameId: 0, documentId: state.documentId, result: true }];
      assert.equal(options.func.name, 'submitFixturePreparedBranch');
      state.clicked = true;
      return [{ frameId: 0, documentId: state.documentId, result: state.result }];
    } } };
  const readRefs = async repository => {
    calls.push('read'); state.reads++;
    return { repository, complete: true, observedAt: state.now, heads: state.clicked ? state.after : state.before };
  };
  const options = { api, readRefs, authorize: async () => state.allowed,
    claimAttempt: async () => { calls.push('claim'); if (state.claimed) return false; state.claimed = true; return state.claimResult; },
    fresh: () => state.fresh, now: () => state.now, timeoutMs: 200 };
  return { calls, state, api, options, create: () => createFixtureBranchSubmission(options) };
}
const run = (f, op = operation, t = target) => f.create().run(op, t);
test('one claimed click and independent matching before/after refs, fixture evidence only', async () => {
  const f = fixture(); const result = await run(f);
  assert.equal(result.state, 'FIXTURE_VERIFIED');
  assert.equal(result.evidenceTier, 'CONTROLLED_FIXTURE');
  assert.equal(result.liveExecutionAuthorized, false);
  assert.equal(result.clickConfirmed, true);
  assert.equal(result.postcondition, 'MATCHED');
  assert.equal(result.expectedSourceSha,sha);assert.equal(result.observedDestinationSha,sha);
  assert.equal(result.operationId,operation.operationId);
  assert.deepEqual(f.calls, ['read','verifyPreparedNativeBranchForm','claim','read','submitFixturePreparedBranch','read']);
});
test('rejects wrong scope, invalid SHA, expired approval, missing prepared context, and extra payload fields', async () => {
  for (const [op, t] of [[{...operation,repository:'other/repo'},target],[{...operation,sourceSha:'abc'},target],
    [{...operation,expiresAt:1000},target],[operation,{...target,state:'UNKNOWN'}],[{...operation,secret:'x'},target],
    [operation,{...target,operationId:'other'}]]) {
    const f=fixture(); assert.equal((await run(f,op,t)).state,'BLOCKED'); assert.deepEqual(f.calls,[]);
  }
});
test('authorization denied, permission missing, wrong tab/document, existing target, or moved source prevent click', async () => {
  for (const change of [f=>{f.state.allowed=false}, f=>{f.state.granted=false}, f=>{f.state.documentId='other'},
    f=>{f.api.tabs.get=async()=>({id:42,url:'https://github.com/other/repo/branches'})},
    f=>{f.state.before=[head,branch]},f=>{f.state.before=[{...head,sha:'b'.repeat(40)}]},
    f=>{f.state.before=[head,head]},f=>{f.state.before=[head,{ref:'refs/heads/unexpected',sha}]}]) {
    const f=fixture(); change(f); assert.equal((await run(f)).state,'BLOCKED'); assert.equal(f.state.clicked,false);
  }
});
test('claim failure, duplicate claim and concurrent run prevent second click', async () => {
  const f=fixture(); const executor=f.create();
  const [a,b]=await Promise.all([executor.run(operation,target),executor.run(operation,target)]);
  assert.equal(a.state,'FIXTURE_VERIFIED'); assert.equal(b.state,'BLOCKED');
  assert.equal(f.calls.filter(x=>x==='submitFixturePreparedBranch').length,1);
  assert.equal((await run(f)).state,'BLOCKED');
  const g=fixture();g.state.claimResult=false; assert.equal((await run(g)).state,'BLOCKED');assert.equal(g.state.clicked,false);
});
test('post-claim fresh source, permission, and authority are checked again', async () => {
  for(const mutate of [f=>{f.state.before=[head,branch]},f=>{f.state.allowed=false},f=>{f.state.granted=false},f=>{f.state.fresh=false},f=>{f.state.now=5000}]){
    const f=fixture();const claim=f.options.claimAttempt;f.options.claimAttempt=async (...args)=>{const r=await claim(...args);mutate(f);return r};
    assert.equal((await run(f)).state,'BLOCKED');assert.equal(f.state.clicked,false);
  }
});
test('post-read mismatch or unavailable is unknown, never successful or retried', async () => {
  for(const after of [[head],[head,{...branch,sha:'b'.repeat(40)}],[{...head,sha:'b'.repeat(40)},branch],
    [head,branch,{ref:'refs/heads/unexpected',sha}]]) {
    const f=fixture();f.state.after=after;const r=await run(f);assert.equal(r.state,'OUTCOME_UNKNOWN');assert.equal(r.clickConfirmed,true);
  }
  const f=fixture();const read=f.options.readRefs;f.options.readRefs=async repo=>{if(f.state.clicked)throw Error('offline');return read(repo)};
  assert.equal((await run(f)).state,'OUTCOME_UNKNOWN');
});
test('injection result missing or wrong document cannot attribute matched ref to the click',async()=>{
  const f=fixture();f.state.result='UNKNOWN';const r=await run(f);
  assert.equal(r.state,'OUTCOME_UNKNOWN');assert.equal(r.postcondition,'MATCHED');assert.equal(r.clickConfirmed,false);
});
test('unresolved claim and late result are bounded and cannot dispatch',async()=>{
  const f=fixture();const gate=deferred();f.options.timeoutMs=25;f.options.claimAttempt=()=>gate.promise;
  const r=await run(f);assert.equal(r.state,'BLOCKED');gate.resolve(true);await new Promise(r=>setImmediate(r));assert.equal(f.state.clicked,false);
});
test('unresolved dispatched click is unknown and late completion does not retry',async()=>{
  const f=fixture();const gate=deferred();f.options.timeoutMs=25;const inject=f.api.scripting.executeScript;
  f.api.scripting.executeScript=async opts=>opts.func.name==='submitFixturePreparedBranch'? (f.calls.push('submitFixturePreparedBranch'),gate.promise):inject(opts);
  const executor=f.create();const r=await executor.run(operation,target);assert.equal(r.state,'OUTCOME_UNKNOWN');
  gate.resolve([{frameId:0,documentId:target.documentId,result:'CLICK_DISPATCHED'}]);await new Promise(r=>setImmediate(r));
  assert.equal((await executor.run(operation,target)).state,'BLOCKED');assert.equal(f.calls.filter(x=>x==='submitFixturePreparedBranch').length,1);
});

test('stale, incomplete, malformed or wrong-repository snapshot does not prove absence',async()=>{
  for(const mutate of [s=>({...s,complete:false}),s=>({...s,observedAt:-5000}),s=>({...s,observedAt:1001}),
    s=>({...s,repository:'other/repo'}),s=>({...s,heads:[{...head,extra:'unknown'}]})]){
    const f=fixture();const read=f.options.readRefs;f.options.readRefs=async repo=>mutate(await read(repo));
    assert.equal((await run(f)).state,'BLOCKED');assert.equal(f.state.clicked,false);
  }
});
test('authorization revoked during the final independent preflight blocks dispatch',async()=>{
  const f=fixture();const read=f.options.readRefs;f.options.readRefs=async repo=>{const s=await read(repo);if(f.state.reads===2)f.state.allowed=false;return s};
  assert.equal((await run(f)).state,'BLOCKED');assert.equal(f.state.clicked,false);
});
test('changed injection document cannot attribute matching fixture result',async()=>{
  const f=fixture();const inject=f.api.scripting.executeScript;f.api.scripting.executeScript=async opts=>{
    if(opts.func.name==='submitFixturePreparedBranch')f.state.documentId='replacement-document';return inject(opts);};
  const r=await run(f);assert.equal(r.state,'OUTCOME_UNKNOWN');assert.equal(r.postcondition,'MATCHED');assert.equal(r.clickConfirmed,false);
});
