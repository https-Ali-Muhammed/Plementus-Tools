// Candidate transport only. Not imported by the installed worker. Transport
// budget is NOT the coordinator's independent evidence/freshness policy.
import { REVIEWED_SCOPE } from './reviewed-sandbox-execution.mjs';
export const NATIVE_HOST = 'com.plementus.reviewed_git_refs';
export const MAIN_NATIVE_HOST = 'com.plementus.reviewed_git_refs_main';
export const READ_KIND = 'READ_REVIEWED_GIT_REFS_V1';
export const TRANSPORT_MS = 6500;
const repo = REVIEWED_SCOPE.repository;
const sha = REVIEWED_SCOPE.sourceSha;
const main = 'refs/heads/main', dest = `refs/heads/${REVIEWED_SCOPE.newBranch}`;
const exact = (v,keys) => v !== null && typeof v === 'object' && Object.getPrototypeOf(v) === Object.prototype &&
  Reflect.ownKeys(v).length === keys.length && keys.every(k => Object.hasOwn(v,k) && Object.hasOwn(Object.getOwnPropertyDescriptor(v,k),'value'));
export const validNonce = v => typeof v === 'string' && /^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(v);
export const validRequest = v => exact(v,['kind','nonce']) && v.kind===READ_KIND && validNonce(v.nonce);
export function validSnapshot(s) {
  if (!exact(s,['repository','complete','observedAt','heads']) || s.repository!==repo || s.complete!==true ||
      !Number.isSafeInteger(s.observedAt) || s.observedAt<0 || !Array.isArray(s.heads) || s.heads.length<1 || s.heads.length>2) return false;
  const refs=new Set();
  for (const h of s.heads) {
    if (!exact(h,['ref','sha']) || ![main,dest].includes(h.ref) || h.sha!==sha || refs.has(h.ref)) return false;
    refs.add(h.ref);
  }
  return refs.has(main);
}
// One read at a time; no retry. A timeout poisons this instance because the
// underlying host might still be unwinding. It cannot authorize a write.
export function createReviewedNativeRefBridge({runtime, wall=Date.now, monotonic=()=>performance.now(), nonce=()=>crypto.randomUUID(), waitMs=TRANSPORT_MS, host=NATIVE_HOST}={}) {
  let busy=false, uncertain=false;
  const budget=Number.isFinite(waitMs)?Math.max(1,Math.min(TRANSPORT_MS,waitMs)):TRANSPORT_MS;
  return async repository => {
    if (![NATIVE_HOST, MAIN_NATIVE_HOST].includes(host) || repository!==repo || busy || uncertain || typeof runtime?.sendNativeMessage!=='function') return null;
    busy=true; let timer;
    try {
      const start=wall(), tick=monotonic(), id=nonce();
      if(!Number.isSafeInteger(start)||!Number.isFinite(tick)||!validNonce(id))return null;
      const expired=Symbol('expired');
      const response=await Promise.race([
        Promise.resolve().then(()=>runtime.sendNativeMessage(host,{kind:READ_KIND,nonce:id})),
        new Promise(resolve=>{timer=setTimeout(()=>resolve(expired),budget);})
      ]);
      const end=wall(), elapsed=monotonic()-tick;
      if(response===expired || !Number.isSafeInteger(end) || end<start || end-start>=budget || !Number.isFinite(elapsed) || elapsed<0 || elapsed>=budget){uncertain=true;return null;}
      if(!exact(response,['ok','nonce','snapshot']) || response.ok!==true || response.nonce!==id || !validSnapshot(response.snapshot) ||
         response.snapshot.observedAt<start || response.snapshot.observedAt>end) return null;
      // Never refresh the provider timestamp. Return only the fixed schema.
      const s=response.snapshot;
      return {repository:s.repository,complete:true,observedAt:s.observedAt,heads:s.heads.map(h=>({ref:h.ref,sha:h.sha}))};
    } catch {uncertain=true;return null;}
    finally {clearTimeout(timer);busy=false;}
  };
}
