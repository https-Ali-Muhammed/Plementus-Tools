import { createReviewedNativeRefBridge, MAIN_NATIVE_HOST } from './reviewed-native-ref-bridge.mjs';
import { REVIEWED_SCOPE } from './reviewed-sandbox-execution.mjs';

// Worker-owned read service shared by diagnostics and the reviewed coordinator.
// It supplies evidence, never authority. The single busy flag spans both paths,
// including the optional permission checks before and after the native call.
export function createMainRefReadService(api) {
  const read = createReviewedNativeRefBridge({runtime:api.runtime,host:MAIN_NATIVE_HOST});
  let busy=false;
  const denied=reason=>({ok:false,reason});
  async function check(repository) {
    if(repository!==REVIEWED_SCOPE.repository)return denied('INVALID_REQUEST');
    if(busy)return denied('BUSY');
    busy=true;
    try {
      if(await api.permissions.contains({permissions:['nativeMessaging']})!==true)return denied('PERMISSION_REQUIRED');
      const snapshot=await read(repository);
      if(!snapshot || await api.permissions.contains({permissions:['nativeMessaging']})!==true)return denied('READ_UNAVAILABLE');
      return {ok:true,snapshot};
    } catch {return denied('READ_UNAVAILABLE');}
    finally {busy=false;}
  }
  return Object.freeze({check,async readRefs(repository){
    const result=await check(repository);
    return result.ok===true?result.snapshot:null;
  }});
}

// Read-only diagnostic accepts only the dedicated top-frame extension page.
// Never accept a caller-provided repository, evidence or authority.
export function createMainRefCheck(api, service=createMainRefReadService(api)) {
  return async (message,sender) => {
    try {
      const base=api.runtime.getURL('');
      if (!message || Object.getPrototypeOf(message)!==Object.prototype || Reflect.ownKeys(message).length!==1 ||
          message.type!=='REVIEWED_MAIN_REF_CHECK' || sender?.id!==api.runtime.id || sender.origin!==base.slice(0,-1) ||
          sender.url!==base+'src/popup/reviewed-ref-check.html' || sender.frameId!==0 ||
          !Number.isInteger(sender.tab?.id) || sender.tab.id<0 || sender.tab.incognito!==false) return {ok:false,reason:'INVALID_REQUEST'};
      return await service.check(REVIEWED_SCOPE.repository);
    } catch {return {ok:false,reason:'READ_UNAVAILABLE'};}
  };
}
