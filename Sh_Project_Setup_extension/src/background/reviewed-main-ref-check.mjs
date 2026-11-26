import { createReviewedNativeRefBridge, MAIN_NATIVE_HOST } from './reviewed-native-ref-bridge.mjs';
import { REVIEWED_SCOPE } from './reviewed-sandbox-execution.mjs';
// Read-only diagnostic; never supplies authority or evidence to the submission coordinator.
export function createMainRefCheck(api) {
  const read = createReviewedNativeRefBridge({runtime:api.runtime,host:MAIN_NATIVE_HOST});
  let busy=false;
  const denied=reason=>({ok:false,reason});
  return async (message,sender) => {
    try {
      const base=api.runtime.getURL('');
      if (!message || Object.getPrototypeOf(message)!==Object.prototype || Reflect.ownKeys(message).length!==1 ||
          message.type!=='REVIEWED_MAIN_REF_CHECK' || sender?.id!==api.runtime.id || sender.origin!==base.slice(0,-1) ||
          sender.url!==base+'src/popup/reviewed-ref-check.html' || sender.frameId!==0 ||
          !Number.isInteger(sender.tab?.id) || sender.tab.id<0 || sender.tab.incognito!==false) return denied('INVALID_REQUEST');
      if(busy)return denied('BUSY');
      busy=true;
      try {
        if(await api.permissions.contains({permissions:['nativeMessaging']})!==true)return denied('PERMISSION_REQUIRED');
        const snapshot=await read(REVIEWED_SCOPE.repository);
        if(!snapshot || await api.permissions.contains({permissions:['nativeMessaging']})!==true)return denied('READ_UNAVAILABLE');
        return {ok:true,snapshot};
      } finally {busy=false;}
    } catch {return denied('READ_UNAVAILABLE');}
  };
}
