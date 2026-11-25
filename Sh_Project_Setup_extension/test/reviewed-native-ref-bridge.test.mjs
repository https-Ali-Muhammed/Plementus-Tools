import test from 'node:test';
import assert from 'node:assert/strict';
import { PassThrough } from 'node:stream';
import { spawn } from 'node:child_process';
import { endianness } from 'node:os';
import { createReviewedNativeRefBridge, NATIVE_HOST, READ_KIND, validSnapshot } from '../src/background/reviewed-native-ref-bridge.mjs';
import { validOrigin, frame, readOne, handleRequest } from '../tools/reviewed-native-ref-host.mjs';
import { REVIEWED_SCOPE as scope } from '../src/background/reviewed-sandbox-execution.mjs';
const nonce='11111111-1111-4111-8111-111111111111';
const request={kind:READ_KIND,nonce};
const snapshot=(observedAt=1000,heads=[{ref:'refs/heads/main',sha:scope.sourceSha}])=>({repository:scope.repository,complete:true,observedAt,heads});
const reply=(s=snapshot())=>({ok:true,nonce,snapshot:s});
const reader=async()=>({ok:true,snapshot:snapshot()});
const id='a'.repeat(32), origin=`chrome-extension://${id}/`;
function decode(data){const size=endianness()==='LE'?data.readUInt32LE():data.readUInt32BE();assert.equal(size,data.length-4);return JSON.parse(data.subarray(4));}
async function streamInput(chunks,{end=true,waitMs=30}={}){
  const stream=new PassThrough();const p=readOne(stream,waitMs);for(const c of chunks)stream.write(c);if(end)stream.end();const value=await p;stream.destroy();return value;
}
function fixture(fn,{waitMs=100,wall=()=>1000,monotonic=()=>0}={}){
  const calls=[];const bridge=createReviewedNativeRefBridge({runtime:{sendNativeMessage:(...args)=>{calls.push(args);return fn(...args);}},wall,monotonic,nonce:()=>nonce,waitMs});return {bridge,calls};
}
function runChild(args,data,{close=true}={}){
  return new Promise((resolve,reject)=>{
    const child=spawn(process.execPath,args,{stdio:['pipe','pipe','pipe']});const out=[],err=[];
    const timer=setTimeout(()=>{child.kill('SIGKILL');reject(Error('child timeout'));},4000);
    child.stdout.on('data',x=>out.push(x));child.stderr.on('data',x=>err.push(x));child.stdin.on('error',()=>{});
    child.on('error',e=>{clearTimeout(timer);reject(e);});child.on('close',code=>{clearTimeout(timer);resolve({code,stdout:Buffer.concat(out),stderr:Buffer.concat(err).toString()});});
    if(data)child.stdin.write(data);if(close)child.stdin.end();
  });
}
test('exact extension origin; wrong ID, wildcard and suffix are refused',()=>{
  assert.equal(validOrigin(id,origin),true);assert.equal(validOrigin(id,origin.slice(0,-1)),true);
  for(const x of ['https://github.com',origin+'path',origin+'?x=1',`chrome-extension://${'b'.repeat(32)}/`,undefined])assert.equal(validOrigin(id,x),false);
  assert.equal(validOrigin('*',origin),false);
});
test('fragmented native-endian UTF-8 frame resolves without EOF',async()=>{
  const bytes=frame(request);assert.deepEqual(decode(bytes),request);assert.deepEqual(await streamInput([bytes.subarray(0,2),bytes.subarray(2,7),bytes.subarray(7)],{end:false}),request);
});
test('oversize, truncated, extra frame, invalid UTF-8 and malformed JSON refused',async()=>{
  const good=frame(request),large=Buffer.alloc(4);endianness()==='LE'?large.writeUInt32LE(513):large.writeUInt32BE(513);
  const malformed=Buffer.from(good);malformed[4]=255;
  for(const bytes of [large,good.subarray(0,3),good.subarray(0,-1),Buffer.concat([good,good]),malformed,frame('x').subarray(0,-1)])assert.equal(await streamInput([bytes]),null);
  assert.equal(await streamInput([],{end:false,waitMs:10}),null);
});
test('host permits only fixed read request and exact repository',async()=>{
  const calls=[];const read=async repo=>{calls.push(repo);return reader();};
  for(const bad of [null,[],{...request,url:'https://example.invalid'},{...request,kind:'CREATE_BRANCH'},{...request,nonce:'invalid'},{...request,command:'git push'}])assert.deepEqual(await handleRequest(bad,read),{ok:false,reason:'INVALID_REQUEST'});
  assert.equal(calls.length,0);assert.deepEqual(await handleRequest(request,read),reply());assert.deepEqual(calls,[scope.repository]);
});
test('host failure does not expose diagnostic or unexpected refs',async()=>{
  for(const read of [async()=>{throw Error('private details');},async()=>({ok:false,reason:'private details'}),async()=>({ok:true,snapshot:snapshot(1000,[{ref:'refs/heads/other',sha:scope.sourceSha}])})])assert.deepEqual(await handleRequest(request,read),{ok:false,reason:'READ_UNAVAILABLE'});
});
test('bridge sends only fixed host, kind and nonce; preserves observation time',async()=>{
  let now=1000;const {bridge,calls}=fixture(()=>{now=1008;return reply(snapshot(1003));},{wall:()=>now});
  assert.equal(await bridge('other/repo'),null);assert.equal(calls.length,0);assert.deepEqual(await bridge(scope.repository),snapshot(1003));assert.deepEqual(calls,[[NATIVE_HOST,request]]);
});
test('wrong nonce, missing/extra fields, stale, future or changed refs are refused',async()=>{
  const invalid=[null,{...reply(),nonce:'bad'},{...reply(),extra:true},reply(snapshot(999)),reply(snapshot(1001)),reply({...snapshot(),repository:'other/repo'}),reply({...snapshot(),complete:false}),reply(snapshot(1000,[{ref:'refs/heads/main',sha:'a'.repeat(40)}])),reply(snapshot(1000,[{ref:'refs/heads/main',sha:scope.sourceSha},{ref:'refs/heads/main',sha:scope.sourceSha}]))];
  for(const value of invalid){const {bridge}=fixture(()=>value);assert.equal(await bridge(scope.repository),null);}
  assert.equal(validSnapshot(snapshot(1000,[{ref:`refs/heads/${scope.newBranch}`,sha:scope.sourceSha},{ref:'refs/heads/main',sha:scope.sourceSha}])),true);
});
test('concurrent read is refused; timeout poisons instance and late reply cannot be used',async()=>{
  let release;const {bridge,calls}=fixture(()=>new Promise(r=>{release=r;}),{waitMs:15});const first=bridge(scope.repository);
  await Promise.resolve();assert.equal(await bridge(scope.repository),null);assert.equal(await first,null);release(reply());assert.equal(await bridge(scope.repository),null);assert.equal(calls.length,1);
});
test('clock rollback, exact deadline, rejection and missing API fail closed',async()=>{
  for(const elapsed of [-1,100]){let tick=0;const {bridge}=fixture(()=>{tick=elapsed;return reply();},{monotonic:()=>tick});assert.equal(await bridge(scope.repository),null);}
  const {bridge,calls}=fixture(()=>Promise.reject(Error('private')));assert.equal(await bridge(scope.repository),null);assert.equal(await bridge(scope.repository),null);assert.equal(calls.length,1);
  assert.equal(await createReviewedNativeRefBridge({})(scope.repository),null);
});
test('real host CLI rejects unauthorized caller and malformed message without Git',async()=>{
  const script=new URL('../tools/reviewed-native-ref-host.mjs',import.meta.url);
  for(const [args,data,reason] of [[[script.pathname,'--allowed-extension-id',id,'https://github.com'],frame(request),'ORIGIN_REFUSED'],[[script.pathname,'--allowed-extension-id',id,origin],frame({...request,kind:'WRITE'}),'INVALID_REQUEST']]){
    const result=await runChild(args,data);assert.equal(result.code,0);assert.equal(result.stderr,'');assert.deepEqual(decode(result.stdout),{ok:false,reason});
  }
});
test('real subprocess native framing with synthetic reader returns one correlated response without EOF',async()=>{
  const host=new URL('../tools/reviewed-native-ref-host.mjs',import.meta.url).href;
  const code=`import {frame,readOne,handleRequest} from ${JSON.stringify(host)};const req=await readOne(process.stdin);const result=await handleRequest(req,async()=>(${JSON.stringify({ok:true,snapshot:snapshot()})}));process.stdin.destroy();await new Promise(r=>process.stdout.write(frame(result),r));`;
  const result=await runChild(['--input-type=module','-e',code],frame(request),{close:false});assert.equal(result.code,0);assert.equal(result.stderr,'');assert.deepEqual(decode(result.stdout),reply());
});
