import { createSandboxPreparationController, RECORD_KEY } from './sandbox-preparation-controller.mjs';
import { prepareWorkspaceBranch, verifyPreparedNativeBranchForm } from '../popup/workspace-branch-preparation.mjs';
import { createFixtureBranchSubmission, FIXTURE_SCOPE } from '../workflow/sandbox-branch-submission.mjs';

// Deliberately disconnected from background.js and runtime messages. All effects are
// confined to the exact synthetic scope enforced again by the native click function.
const preparationKey = 'fixtureBranchSubmission.preparation.v1';
const keys = [...Object.keys(FIXTURE_SCOPE),'operationId','approvalReference','sourceSha','expiresAt'];
const exact = (v,k) => v && Object.getPrototypeOf(v) === Object.prototype && Object.keys(v).length === k.length && k.every(x=>Object.hasOwn(v,x));
const valid = (v,t) => exact(v,keys) && Object.entries(FIXTURE_SCOPE).every(([k,value])=>v[k]===value) &&
  typeof v.operationId==='string' && /^fixture-operation-[a-z0-9-]{1,48}$/.test(v.operationId) &&
  typeof v.approvalReference==='string' && /^fixture-approval-[a-z0-9-]{1,48}$/.test(v.approvalReference) &&
  typeof v.sourceSha==='string' && /^[0-9a-f]{40}$/.test(v.sourceSha) && Number.isSafeInteger(v.expiresAt) && v.expiresAt>t && v.expiresAt-t<=300000;
const timeout=Symbol('timeout');
function trusted(api,sender){
  try { const origin=api.runtime.getURL('').slice(0,-1);return sender?.id===api.runtime.id && sender.origin===origin &&
    sender.url===`${origin}/src/popup/popup.html?workspace=1` && Number.isInteger(sender.tab?.id) && sender.tab.id>=0 && sender.tab.incognito===false; }
  catch{return false;}
}
function validBefore(s,op,now){return exact(s,['repository','complete','observedAt','heads'])&&s.repository===op.repository&&s.complete===true&&
  Number.isSafeInteger(s.observedAt)&&s.observedAt<=now&&now-s.observedAt<=2000&&Array.isArray(s.heads)&&s.heads.length===1&&
  exact(s.heads[0],['ref','sha'])&&s.heads[0].ref===`refs/heads/${op.sourceBranch}`&&s.heads[0].sha===op.sourceSha;}

/** ledger.add(key,value) MUST be atomic insert-if-absent, resolve true only after commit.
 * A reservation consumes this synthetic sandbox scope permanently, even on denial,
 * restart, or unknown outcome. No reset, replacement, automatic replay or retry API.
 * Injected authority and ref readers are controlled fixture services, not live proof.
 */
export function createFixtureBranchCoordinator({api,ledger,readRefs,authorize,waitMs=2000}={}){
  let used=false;
  const wait=Number.isFinite(waitMs)?Math.max(1,Math.min(2000,waitMs)):2000;
  const report=(state,reason,extra={})=>Object.freeze({state,reason,evidenceTier:'CONTROLLED_FIXTURE',liveExecutionAuthorized:false,...extra});
  return Object.freeze({async run(approval,sender){
    if(used)return report('BLOCKED','ALREADY_ATTEMPTED');used=true;
    let op, reserved=false, finished=false, submissionStarted=false;
    const deadline=performance.now()+35000;
    const remaining=()=>deadline-performance.now();
    const current=()=>!finished&&remaining()>0&&!!op&&valid(op,Date.now());
    async function bounded(call,limit=wait){
      const ms=Math.min(limit,remaining());if(ms<=0)return timeout;
      let timer;try{return await Promise.race([Promise.resolve().then(call),new Promise(r=>{timer=setTimeout(()=>r(timeout),ms)})]);}finally{clearTimeout(timer);}
    }
    try{
      if(!valid(approval,Date.now())||!trusted(api,sender)||typeof ledger?.add!=='function'||typeof readRefs!=='function'||typeof authorize!=='function')return report('BLOCKED','INVALID_SCOPE');
      op=Object.freeze({...approval});
      if(await bounded(()=>authorize(op))!==true||!current())return report('BLOCKED','AUTHORIZATION_UNAVAILABLE');
      if(!validBefore(await bounded(()=>readRefs(op.repository)),op,Date.now())||!current())return report('BLOCKED','PREFLIGHT_REFS_MISMATCH');
      const owner=crypto.randomUUID();
      const claim=Object.freeze({operationId:op.operationId,approvalReference:op.approvalReference,sourceSha:op.sourceSha,owner});
      // No preparation is admitted before a durable, exclusive reservation.
      const admitted=await bounded(()=>ledger.add('reservation',claim));
      if(admitted!==true)return report('BLOCKED',admitted===false?'RESERVATION_CONFLICT':'RESERVATION_UNCONFIRMED');
      reserved=true;
      if(!current()||await bounded(()=>authorize(op))!==true||!current())return report('BLOCKED','AUTHORIZATION_UNAVAILABLE');
      const session=api.storage.session;
      // Do not use or overwrite the installed preparation controller's session record.
      const scopedApi={runtime:api.runtime,permissions:api.permissions,
        tabs:{get:id=>api.tabs.get(id),onUpdated:api.tabs.onUpdated,onRemoved:api.tabs.onRemoved,
          create:options=>{if(!current()||options.url!==`https://github.com/${op.repository}/branches`)throw Error('fixture context expired');return api.tabs.create(options);}},
        scripting:{executeScript:options=>{if(!current())throw Error('fixture context expired');return api.scripting.executeScript(options);}},storage:{session:{
        setAccessLevel:opts=>session.setAccessLevel(opts),
        get:async key=>{if(key!==RECORD_KEY)throw Error('unexpected key');const data=await session.get(preparationKey);return {[key]:data[preparationKey]};},
        set:values=>{if(!exact(values,[RECORD_KEY]))throw Error('unexpected key');return session.set({[preparationKey]:values[RECORD_KEY]});},
      }}};
      let captured=null;
      const controller=createSandboxPreparationController(scopedApi,async options=>{
        let candidate=null;
        const observe={...options.api,scripting:{executeScript:async request=>{
          const response=await options.api.scripting.executeScript(request);
          if(request.func===verifyPreparedNativeBranchForm){
            const documentId=request.target?.documentIds?.[0];
            const result=Array.isArray(response)&&response.length===1?response[0]:null;
            candidate=Number.isInteger(request.target?.tabId)&&request.target.tabId>=0&&request.target.documentIds?.length===1&&
              typeof documentId==='string'&&/^[a-zA-Z0-9-]{1,128}$/.test(documentId)&&result?.frameId===0&&result.documentId===documentId&&result.result===true?
              {tabId:request.target.tabId,documentId}:null;
          }
          return response;
        }}};
        const state=await prepareWorkspaceBranch({...options,api:observe,fresh:()=>current()&&options.fresh()});
        if(state==='FORM_PREPARED'&&candidate&&current())captured=Object.freeze({...candidate,state,operationId:op.operationId});
        return state;
      },{waitMs:wait});
      const operationId=crypto.randomUUID();
      const start=await bounded(()=>controller.handle({type:'SANDBOX_PREPARATION_START',operationId,repository:op.repository,sourceBranch:op.sourceBranch,newBranch:op.newBranch,acknowledged:true},sender),wait*5);
      if(!start?.ok||start.duplicate||start.record?.operationId!==operationId||!current())return report('BLOCKED','PREPARATION_NOT_ADMITTED');
      const runId=start.record.runId;
      if(await bounded(()=>controller.idle(),20000)===timeout||!current())return report('BLOCKED','PREPARATION_UNCONFIRMED');
      const status=await bounded(()=>controller.handle({type:'SANDBOX_PREPARATION_STATUS'},sender));
      const r=status?.record;
      if(!status?.ok||r?.state!=='FORM_PREPARED'||r.operationId!==operationId||r.runId!==runId||r.repository!==op.repository||r.sourceBranch!==op.sourceBranch||r.newBranch!==op.newBranch||!captured||!current())return report('BLOCKED','PREPARATION_NOT_VERIFIED');
      // The caller cannot provide a tab/document. Only the accepted engine's final
      // document-targeted read and persisted controller result can produce a handoff.
      let claimAttempted=false;
      const executor=createFixtureBranchSubmission({api,readRefs,authorize,fresh:current,timeoutMs:Math.min(15000,remaining()),
        claimAttempt:async operation=>{
          if(claimAttempted||operation.operationId!==op.operationId||!current())return false;
          claimAttempted=true;
          return await bounded(()=>ledger.add('dispatch',claim))===true&&current();
        }});
      submissionStarted=true;
      const result=await executor.run(op,captured);
      const saved=await bounded(()=>ledger.add('outcome',Object.freeze({...claim,state:result.state,reason:result.reason,
        clickConfirmed:result.clickConfirmed,submissionDispatched:result.submissionDispatched,postcondition:result.postcondition})));
      if(saved!==true)return report(result.submissionDispatched?'OUTCOME_UNKNOWN':'BLOCKED','OUTCOME_PERSISTENCE_UNCONFIRMED');
      return result;
    }catch{return report(submissionStarted?'OUTCOME_UNKNOWN':'BLOCKED',reserved?'RESERVED_OPERATION_UNCONFIRMED':'ADMISSION_UNCONFIRMED');}
    finally{finished=true;}
  }});
}
