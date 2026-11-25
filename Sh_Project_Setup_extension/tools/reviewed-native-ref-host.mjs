// Unregistered read-only Native Messaging candidate for Linux. No write,
// credential API, arbitrary command, URL, file path or authority endpoint.
import { endianness } from 'node:os';
import { pathToFileURL } from 'node:url';
import { createReviewedGitRefReader } from './reviewed-git-ref-reader.mjs';
import { REVIEWED_SCOPE } from '../src/background/reviewed-sandbox-execution.mjs';
import { validRequest, validSnapshot } from '../src/background/reviewed-native-ref-bridge.mjs';
const CAP=512;
const LE=endianness()==='LE';
const fail=reason=>({ok:false,reason});
export function validOrigin(id,origin){
  return typeof id==='string' && /^[a-p]{32}$/.test(id) &&
    (origin===`chrome-extension://${id}`||origin===`chrome-extension://${id}/`);
}
export function frame(value){
  const body=Buffer.from(JSON.stringify(value),'utf8');
  if(body.length<1||body.length>4096)throw Error('frame bound');
  const header=Buffer.alloc(4); LE?header.writeUInt32LE(body.length):header.writeUInt32BE(body.length);
  return Buffer.concat([header,body]);
}
// One request per process. A complete first frame does not require EOF
// (Chrome keeps the pipe open). Extra bytes already received are rejected;
// later bytes are never handled. Bound both input size and input wait.
export function readOne(input,waitMs=1500){
  return new Promise(resolve=>{
    let buffer=Buffer.alloc(0), done=false;
    function finish(value){if(done)return;done=true;clearTimeout(timer);input.removeListener('data',data);input.removeListener('end',end);input.removeListener('error',end);input.pause();resolve(value);}
    function end(){finish(null);}
    function data(chunk){
      if(!Buffer.isBuffer(chunk)||chunk.length>CAP+4-buffer.length)return finish(null);
      buffer=Buffer.concat([buffer,chunk]);
      if(buffer.length<4)return;
      const length=LE?buffer.readUInt32LE():buffer.readUInt32BE();
      if(length<1||length>CAP||buffer.length>length+4)return finish(null);
      if(buffer.length!==length+4)return;
      try {finish(JSON.parse(new TextDecoder('utf-8',{fatal:true}).decode(buffer.subarray(4))));}catch{finish(null);}
    }
    const timer=setTimeout(end,waitMs);
    input.on('data',data);input.once('end',end);input.once('error',end);
  });
}
export async function handleRequest(request,reader){
  if(!validRequest(request))return fail('INVALID_REQUEST');
  try{
    const response=await reader(REVIEWED_SCOPE.repository);
    if(response?.ok!==true||!validSnapshot(response.snapshot))return fail('READ_UNAVAILABLE');
    return {ok:true,nonce:request.nonce,snapshot:response.snapshot};
  }catch{return fail('READ_UNAVAILABLE');}
}
// The future reviewed launcher must fix the ID; it is not supplied by JSON.
// OS user, launcher and registration are trusted prerequisites, not attested
// by this protocol. No test override is exposed through the executable CLI.
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const [flag,id,origin,...extra]=process.argv.slice(2);
  const allowed=flag==='--allowed-extension-id'&&extra.length===0&&validOrigin(id,origin);
  const request=allowed?await readOne(process.stdin):null;
  const result=allowed?await handleRequest(request,createReviewedGitRefReader()):fail('ORIGIN_REFUSED');
  process.stdin.destroy();
  await new Promise((resolve,reject)=>process.stdout.write(frame(result),e=>e?reject(e):resolve()));
}
