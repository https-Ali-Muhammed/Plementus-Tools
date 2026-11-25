import test from 'node:test';
import assert from 'node:assert/strict';
import { createReviewedGitRefReader } from '../tools/reviewed-git-ref-reader.mjs';
import { REVIEWED_SCOPE as scope } from '../src/background/reviewed-sandbox-execution.mjs';
const url=`https://github.com/${scope.repository}.git`;
const main=`${scope.sourceSha}\trefs/heads/main\n`;
const dest=`${scope.sourceSha}\trefs/heads/${scope.newBranch}\n`;
function fixture({stdout=main,resolved=url+'\n',stderr='',error=false,advance=0}={}) {
  const calls=[];let ms=0;
  const reader=createReviewedGitRefReader({monotonic:()=>ms,wall:()=>1000000+ms,execute:async(...args)=>{
    calls.push(args);ms+=advance;
    if(calls.length===1)return {stdout:resolved,stderr:''};
    if(error)throw Error('private diagnostic must not escape');
    return {stdout,stderr};
  }});
  return {calls,reader};
}
test('fixed read-only argv, bounded process and conservative observation timestamp',async()=>{
  const {reader,calls}=fixture({advance:50});
  const r=await reader(scope.repository);
  assert.equal(r.ok,true);assert.equal(r.snapshot.observedAt,1000000);
  assert.deepEqual(r.snapshot.heads,[{ref:'refs/heads/main',sha:scope.sourceSha}]);
  assert.equal(calls.length,2);
  assert.deepEqual(calls[0][1].slice(-4),['ls-remote','--get-url','--',url]);
  assert.deepEqual(calls[1][1].slice(-5),['ls-remote','--heads','--exit-code','--',url]);
  for(const [program,args,opts] of calls){assert.equal(program,'/usr/bin/git');assert.equal(opts.shell,false);assert.equal(opts.cwd,'/');assert.equal(opts.env.GIT_TERMINAL_PROMPT,'0');assert.equal(opts.env.GIT_ASKPASS,'/bin/false');assert.equal(opts.env.GIT_TRACE,undefined);assert.equal(opts.maxBuffer,4096);assert.ok(opts.timeout<=5000);assert.ok(args.includes('protocol.https.allow=always'));}
  assert.ok(calls[1][2].timeout<calls[0][2].timeout);
});
test('exact postcondition with main and destination is returned',async()=>{
  const {reader}=fixture({stdout:dest+main});const r=await reader(scope.repository);assert.equal(r.ok,true);assert.equal(r.snapshot.heads.length,2);
});
test('wrong repository never invokes Git',async()=>{
  const {reader,calls}=fixture();assert.deepEqual(await reader('other/repo'),{ok:false,reason:'SCOPE_MISMATCH'});assert.equal(calls.length,0);
});
test('rewritten remote is rejected before network read',async()=>{
  const {reader,calls}=fixture({resolved:'https://example.invalid/repo.git\n'});assert.deepEqual(await reader(scope.repository),{ok:false,reason:'URL_CHECK_FAILED'});assert.equal(calls.length,1);
});
test('missing, changed, duplicate, unexpected and malformed refs fail closed',async()=>{
  for(const stdout of ['',dest,main+main,main+dest+dest,main.replace(scope.sourceSha,'a'.repeat(40)),main+`${scope.sourceSha}\trefs/heads/other\n`,main.trim(),main.replace('\t',' '),main.replace('\n','\r\n'),main+'x'.repeat(4096)]){
    const {reader}=fixture({stdout});assert.deepEqual(await reader(scope.repository),{ok:false,reason:'REFS_MISMATCH'});
  }
});
test('process failure and diagnostic stderr expose no raw error content',async()=>{
  for(const options of [{error:true},{stderr:'private diagnostic'}]){
    const {reader}=fixture(options);const result=await reader(scope.repository);assert.equal(result.ok,false);assert.doesNotMatch(JSON.stringify(result),/private diagnostic/);
  }
});
test('total deadline expires after URL or network read, no fresh snapshot',async()=>{
  for(const [advance,count] of [[5000,1],[2500,2]]){const {reader,calls}=fixture({advance});assert.deepEqual(await reader(scope.repository),{ok:false,reason:'DEADLINE_EXCEEDED'});assert.equal(calls.length,count);}
});
test('clock rollback or invalid clock cannot create fresh evidence',async()=>{
  for(const delta of [-1,NaN]){const {reader}=fixture({advance:delta});assert.deepEqual(await reader(scope.repository),{ok:false,reason:'DEADLINE_EXCEEDED'});}
});

test('measured 2232 ms network read plus URL preflight succeeds without refreshing observation time',async()=>{
  const calls=[];let ms=0;
  const reader=createReviewedGitRefReader({monotonic:()=>ms,wall:()=>1000000+ms,execute:async(...args)=>{
    calls.push(args);ms+=calls.length===1?25:2232;
    return {stdout:calls.length===1?url+'\n':main,stderr:''};
  }});
  const r=await reader(scope.repository);
  assert.equal(r.ok,true);assert.equal(r.snapshot.observedAt,1000000);
  assert.equal(calls[0][2].timeout,5000);assert.equal(calls[1][2].timeout,4975);
});
test('total budget is not reset between commands, exact boundary and late completion refused',async()=>{
  for(const elapsed of [4999,5000,5001]){
    const {reader,calls}=fixture({advance:elapsed/2});
    const result=await reader(scope.repository);
    assert.equal(result.ok,elapsed<5000);
    if(elapsed>=5000)assert.equal(result.reason,'DEADLINE_EXCEEDED');
    assert.equal(calls.length,2);
    assert.ok(calls[1][2].timeout<calls[0][2].timeout);
  }
});
