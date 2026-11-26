import { createSandboxPreparationController, RECORD_KEY } from './sandbox-preparation-controller.mjs';
import { prepareWorkspaceBranch, verifyPreparedNativeBranchForm } from '../popup/workspace-branch-preparation.mjs';
import { reviewedSandboxBranchButton } from '../github/reviewed-sandbox-submission.mjs';

// Reviewed coordinator. The installed worker routes requests with both trusted services absent. The host
// must supply a separately approved authority and independent authenticated ref
// reader. Neither the workspace, DOM, nor a stored approval string is authority.
export const REVIEWED_SCOPE = Object.freeze({
  repository: 'https-Ali-Muhammed/plementus-mvp-sandbox', sourceBranch: 'main',
  newBranch: 'plementus-mvp-test01', sourceSha: '072833552870034a3772d58a4ff552868fb1eeab',
  approvalReference: 'F04.05-SANDBOX-APPROVAL-01', effect: 'CREATE_BRANCH', maxAttempts: 1,
});
const url = `https://github.com/${REVIEWED_SCOPE.repository}/branches`;
const args = [REVIEWED_SCOPE.repository, REVIEWED_SCOPE.sourceBranch, REVIEWED_SCOPE.newBranch];
const origin = { origins: ['https://github.com/*'] };
const preparationKey = 'reviewedSandboxExecution.preparation.v1';
const timeout = Symbol('timeout');
// Offline candidate only. A longer acquisition window is not a refresh of the
// provider observation time. The installed worker retains the legacy profile.
export const NATIVE_REF_READ_CANDIDATE = 'native-read-candidate-v1';
const NATIVE_READ_WAIT_MS = 7000;
const NATIVE_RECEIPT_AGE_MS = 6500;
const NATIVE_TOTAL_AGE_MS = 8500;
const POST_RECEIPT_MS = 2000;
const exact = (obj, keys) => obj && Object.getPrototypeOf(obj) === Object.prototype &&
  Object.keys(obj).length === keys.length && keys.every(k => Object.hasOwn(obj,k));
function trusted(api,sender) {
  try {
    const extensionOrigin = api.runtime.getURL('').slice(0,-1);
    return sender?.id === api.runtime.id && sender.origin === extensionOrigin &&
      sender.url === `${extensionOrigin}/src/popup/popup.html?workspace=1` &&
      sender.frameId === 0 && Number.isInteger(sender.tab?.id) && sender.tab.id >= 0 && sender.tab.incognito === false;
  } catch { return false; }
}
function approvalMatches(value, now) {
  // These fields are returned by the *trusted authority dependency*, never by UI.
  return exact(value,['scope','securityApprovalReference','operator','reviewer','expiresAt']) &&
    exact(value.scope,Object.keys(REVIEWED_SCOPE)) && Object.entries(REVIEWED_SCOPE).every(([k,v])=>value.scope[k]===v) &&
    typeof value.operator === 'string' && value.operator.length > 0 && value.operator.length <= 128 &&
    typeof value.reviewer === 'string' && value.reviewer.length > 0 && value.reviewer.length <= 128 &&
    value.operator !== value.reviewer && typeof value.securityApprovalReference === 'string' &&
    /^[a-zA-Z0-9._-]{1,128}$/.test(value.securityApprovalReference) &&
    Number.isSafeInteger(value.expiresAt) && value.expiresAt > now && value.expiresAt - now <= 300000;
}
function snapshotMatches(value, after, now, maxAge=2000) {
  if (!exact(value,['repository','complete','observedAt','heads']) || value.repository !== REVIEWED_SCOPE.repository ||
      value.complete !== true || !Number.isSafeInteger(value.observedAt) || value.observedAt > now || now-value.observedAt > maxAge ||
      !Array.isArray(value.heads) || value.heads.length !== (after ? 2 : 1)) return false;
  const expected = new Set(['refs/heads/main']);
  if (after) expected.add('refs/heads/plementus-mvp-test01');
  return value.heads.every(h=>exact(h,['ref','sha']) && h.sha === REVIEWED_SCOPE.sourceSha && expected.delete(h.ref)) && expected.size === 0;
}

/** The installed route is blocked until trusted services are provided. An injected authority must independently
 * authenticate and validate owner AND independent human security decisions; an
 * injected reader must obtain complete fresh authenticated provider refs. Tests
 * use synthetic implementations of both. Do not wire synthetic services live.
 * ledger.add must be atomic insert-if-absent, true only after durable commit.
 */
export function createReviewedSandboxExecution({api,ledger,authorize,readRefs,waitMs=2000,refReadProfile}={}) {
  const nativeRead = refReadProfile === NATIVE_REF_READ_CANDIDATE;
  let used=false;
  const wait = Number.isFinite(waitMs) ? Math.max(1,Math.min(2000,waitMs)) : 2000;
  return Object.freeze({async run(message,sender) {
    let reserved=false, dispatched=false, clickConfirmed=false, postcondition='NOT_CHECKED', finished=false;
    const report=(state,reason)=>Object.freeze({state,reason,scope:REVIEWED_SCOPE,reserved,dispatched,clickConfirmed,postcondition});
    if (used) return report('BLOCKED','ALREADY_ATTEMPTED');
    if (!trusted(api,sender) || !exact(message,['type','acknowledged']) || message.type!=='REVIEWED_SANDBOX_CREATE' || message.acknowledged!==true)
      return report('BLOCKED','INVALID_REQUEST');
    if (refReadProfile !== undefined && !nativeRead) return report('BLOCKED','INVALID_TIMING_PROFILE');
    if (typeof authorize!=='function'||typeof readRefs!=='function'||typeof ledger?.add!=='function')
      return report('BLOCKED','TRUSTED_SERVICES_UNAVAILABLE');
    used=true;
    const deadline=performance.now()+35000;
    const remaining=()=>deadline-performance.now();
    let approval;
    const current=()=>!finished && remaining()>0 && !!approval && Date.now()<approval.expiresAt;
    async function bounded(call, limit=wait) {
      const ms=Math.min(limit,remaining()); if(ms<=0)return timeout;
      let timer;
      try {const result=await Promise.race([Promise.resolve().then(call),new Promise(r=>{timer=setTimeout(()=>r(timeout),ms)})]);return remaining()>0?result:timeout;}
      finally{clearTimeout(timer);}
    }
    async function readSnapshot(after){
      const started=Date.now(), tick=performance.now();
      const value=await bounded(()=>readRefs(REVIEWED_SCOPE.repository),nativeRead?NATIVE_READ_WAIT_MS:wait);
      const receivedAt=Date.now(), checkedAt=performance.now();
      if(nativeRead && (!Number.isSafeInteger(started)||!Number.isSafeInteger(receivedAt)||receivedAt<started||
        receivedAt-started>=NATIVE_READ_WAIT_MS||!Number.isFinite(checkedAt-tick)||checkedAt<tick||checkedAt-tick>=NATIVE_READ_WAIT_MS||
        !Number.isSafeInteger(value?.observedAt)||value.observedAt<started||receivedAt-value.observedAt>=NATIVE_RECEIPT_AGE_MS))return null;
      return snapshotMatches(value,after,receivedAt,nativeRead?NATIVE_RECEIPT_AGE_MS:2000) ? {value,checkedAt,receivedAt} : null;
    }
    const refs=async after=>!!await readSnapshot(after);
    const freshSnapshot=proof=>{
      if(!proof)return false;
      const elapsed=performance.now()-proof.checkedAt, now=Date.now();
      if(!nativeRead)return elapsed<=2000&&snapshotMatches(proof.value,false,now);
      // Both clocks must remain forward-moving and the original timestamp is
      // retained. No late result or receipt can renew the evidence lifetime.
      return Number.isFinite(elapsed)&&elapsed>=0&&elapsed<POST_RECEIPT_MS&&Number.isSafeInteger(now)&&now>=proof.receivedAt&&
        now-proof.receivedAt<POST_RECEIPT_MS&&now-proof.value.observedAt<NATIVE_TOTAL_AGE_MS&&
        snapshotMatches(proof.value,false,now,NATIVE_TOTAL_AGE_MS);
    };
    async function stillAuthorized(){
      if(!current())return false;
      const value=await bounded(()=>authorize(REVIEWED_SCOPE,sender));
      return current()&&approvalMatches(value,Date.now())&&value.operator===approval.operator&&value.reviewer===approval.reviewer&&
        value.securityApprovalReference===approval.securityApprovalReference&&value.expiresAt===approval.expiresAt;
    }
    try {
      const decision=await bounded(()=>authorize(REVIEWED_SCOPE,sender));
      if(!approvalMatches(decision,Date.now()))return report('BLOCKED','INDEPENDENT_APPROVAL_UNAVAILABLE');
      approval=Object.freeze({...decision,scope:REVIEWED_SCOPE});
      if(!await refs(false)||!current())return report('BLOCKED','PREFLIGHT_REFS_MISMATCH');
      const operationId=crypto.randomUUID();
      const claim=Object.freeze({operationId,scope:REVIEWED_SCOPE,securityApprovalReference:approval.securityApprovalReference});
      const reservation=await bounded(()=>ledger.add('reservation',claim));
      if(reservation!==true)return report('BLOCKED',reservation===false?'RESERVATION_CONFLICT':'RESERVATION_UNCONFIRMED');
      reserved=true;
      if(!await stillAuthorized())return report('BLOCKED','AUTHORIZATION_UNAVAILABLE');
      const session=api.storage.session;
      const scopedApi={runtime:api.runtime,permissions:api.permissions,
        tabs:{get:id=>api.tabs.get(id),onUpdated:api.tabs.onUpdated,onRemoved:api.tabs.onRemoved,
          create:options=>{if(!current()||options.url!==url)throw Error('scope expired');return api.tabs.create(options);}},
        scripting:{executeScript:options=>{if(!current())throw Error('scope expired');return api.scripting.executeScript(options);}},
        storage:{session:{setAccessLevel:opts=>session.setAccessLevel(opts),
          get:async key=>{if(key!==RECORD_KEY)throw Error('unexpected key');return {[key]:(await session.get(preparationKey))[preparationKey]};},
          set:values=>{if(!exact(values,[RECORD_KEY]))throw Error('unexpected key');return session.set({[preparationKey]:values[RECORD_KEY]});}}}};
      let captured=null;
      const controller=createSandboxPreparationController(scopedApi,async options=>{
        let candidate=null;
        const observe={...options.api,scripting:{executeScript:async request=>{
          const response=await options.api.scripting.executeScript(request);
          if(request.func===verifyPreparedNativeBranchForm){
            const documentId=request.target?.documentIds?.[0], result=Array.isArray(response)&&response.length===1?response[0]:null;
            candidate=Number.isInteger(request.target?.tabId)&&request.target.tabId>=0&&request.target.documentIds?.length===1&&
              typeof documentId==='string'&&/^[a-zA-Z0-9-]{1,128}$/.test(documentId)&&result?.frameId===0&&result.documentId===documentId&&result.result===true?
              {tabId:request.target.tabId,documentId}:null;
          }
          return response;
        }}};
        const state=await prepareWorkspaceBranch({...options,api:observe,fresh:()=>current()&&options.fresh()});
        if(state==='FORM_PREPARED'&&candidate&&current())captured=Object.freeze(candidate);
        return state;
      },{waitMs:wait});
      const admission=await bounded(()=>controller.handle({type:'SANDBOX_PREPARATION_START',operationId,
        repository:REVIEWED_SCOPE.repository,sourceBranch:REVIEWED_SCOPE.sourceBranch,newBranch:REVIEWED_SCOPE.newBranch,acknowledged:true},sender),wait*5);
      if(!admission?.ok||admission.duplicate||admission.record?.operationId!==operationId||!current())return report('BLOCKED','PREPARATION_NOT_ADMITTED');
      if(await bounded(()=>controller.idle(),20000)===timeout||!current())return report('BLOCKED','PREPARATION_UNCONFIRMED');
      const status=await bounded(()=>controller.handle({type:'SANDBOX_PREPARATION_STATUS'},sender));
      const record=status?.record;
      if(!status?.ok||record?.state!=='FORM_PREPARED'||record.operationId!==operationId||record.runId!==admission.record.runId||
        record.repository!==args[0]||record.sourceBranch!==args[1]||record.newBranch!==args[2]||!captured||!current())return report('BLOCKED','PREPARATION_NOT_VERIFIED');
      const target={tabId:captured.tabId,documentIds:[captured.documentId]};
      const resultFor=values=>Array.isArray(values)&&values.length===1&&values[0]?.frameId===0&&values[0].documentId===captured.documentId?values[0].result:undefined;
      async function context(){
        if(!current())return false;
        const tab=await bounded(()=>api.tabs.get(captured.tabId));
        if(!current()||tab?.id!==captured.tabId||!Number.isInteger(tab.windowId)||tab.windowId<0||tab.incognito!==false||tab.status!=='complete'||tab.pendingUrl!=null||tab.url!==url)return false;
        return await bounded(()=>api.permissions.contains(origin))===true&&current();
      }
      const inspect=async()=>{
        if(!await context())return false;
        const epoch=Date.now()+Math.floor(Math.min(wait,remaining(),approval.expiresAt-Date.now()));
        return resultFor(await bounded(()=>api.scripting.executeScript({target,func:reviewedSandboxBranchButton,args:[...args,epoch,'inspect']})))==='READY'&&current();
      };
      if(!await inspect())return report('BLOCKED','NATIVE_BUTTON_NOT_VERIFIED');
      if(await bounded(()=>ledger.add('dispatch',claim))!==true)return report('BLOCKED','DISPATCH_CLAIM_UNCONFIRMED');
      // Fresh provider reads and approval checks after the durable claim. All
      // asynchronous checks precede the document-bound synchronous DOM guard.
      if(!await stillAuthorized())return report('BLOCKED','POST_CLAIM_REVALIDATION_FAILED');
      const preDispatchProof=await readSnapshot(false);
      if(!preDispatchProof||!await context()||!current()||!freshSnapshot(preDispatchProof))return report('BLOCKED','POST_CLAIM_REVALIDATION_FAILED');
      const epoch=Date.now()+Math.floor(Math.min(wait,remaining(),approval.expiresAt-Date.now()));
      let click;
      try{click=await bounded(()=>{
        if(!current()||Date.now()>=epoch||!freshSnapshot(preDispatchProof))return undefined;
        dispatched=true;
        return api.scripting.executeScript({target,func:reviewedSandboxBranchButton,args:[...args,epoch,'dispatch']});
      });}catch{/* provider outcome unknown */}
      if(!dispatched)return report('BLOCKED','DEADLINE_EXPIRED');
      clickConfirmed=resultFor(click)==='CLICK_DISPATCHED';
      try{postcondition=await refs(true)?'MATCHED':'NOT_CONFIRMED';}catch{postcondition='NOT_CONFIRMED';}
      const result=clickConfirmed&&postcondition==='MATCHED'?report('REFS_MATCHED','INDEPENDENT_REF_POSTCONDITION'):report('OUTCOME_UNKNOWN','RECONCILIATION_REQUIRED');
      if(await bounded(()=>ledger.add('outcome',Object.freeze({...claim,state:result.state,clickConfirmed,postcondition})))!==true)
        return report('OUTCOME_UNKNOWN','OUTCOME_PERSISTENCE_UNCONFIRMED');
      return result;
    } catch {return report(dispatched?'OUTCOME_UNKNOWN':'BLOCKED',dispatched?'RECONCILIATION_REQUIRED':'PRE_DISPATCH_FAILURE');}
    finally{finished=true;}
  }});
}
