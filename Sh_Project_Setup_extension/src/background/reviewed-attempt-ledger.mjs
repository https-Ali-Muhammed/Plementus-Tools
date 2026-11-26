// Dedicated reviewed-sandbox database, separate from ordinary session storage.
// No delete or overwrite operation. IndexedDB unique primary keys serialize competing inserts.
const dbName='plementus-reviewed-sandbox-execution-v1';
const storeName='attempt';
const allowed=new Set(['reservation','dispatch','outcome']);
export function createReviewedAttemptLedger(indexedDB){
  function open(){return new Promise((resolve,reject)=>{
    const request=indexedDB.open(dbName,1);let abandoned=false;
    request.onupgradeneeded=()=>request.result.createObjectStore(storeName);
    request.onblocked=()=>{abandoned=true;reject(Error('reviewed sandbox database blocked'));};
    request.onerror=()=>reject(Error('reviewed sandbox database unavailable'));
    request.onsuccess=()=>{const db=request.result;if(abandoned){db.close();return;}db.onversionchange=()=>db.close();resolve(db);};
  });}
  // Read-only admission check. Do not create a database just to check for
  // a prior attempt. An unsupported enumeration or inconsistent schema blocks.
  async function hasCheckpoint(){
    const entries=await indexedDB.databases();
    if(!Array.isArray(entries))throw Error('reviewed sandbox database inventory unavailable');
    const matches=entries.filter(entry=>entry?.name===dbName);
    if(matches.length===0)return false;
    if(matches.length!==1||matches[0].version!==1)throw Error('unexpected reviewed sandbox schema');
    const db=await new Promise((resolve,reject)=>{
      const request=indexedDB.open(dbName,1);let abandoned=false;
      request.onupgradeneeded=()=>{abandoned=true;request.transaction.abort();reject(Error('reviewed sandbox database changed'));};
      request.onblocked=()=>{abandoned=true;reject(Error('reviewed sandbox database blocked'));};
      request.onerror=()=>reject(Error('reviewed sandbox database unavailable'));
      request.onsuccess=()=>{const result=request.result;if(abandoned){result.close();return;}result.onversionchange=()=>result.close();resolve(result);};
    });
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readonly');
      const request=tx.objectStore(storeName).count();
      tx.oncomplete=()=>{if(!Number.isSafeInteger(request.result)||request.result<0)reject(Error('invalid checkpoint count'));else resolve(request.result>0);};
      tx.onabort=()=>reject(Error('reviewed sandbox checkpoint read aborted'));
    });}finally{db.close();}
  }
  return Object.freeze({hasCheckpoint,async add(key,value){
    if(!allowed.has(key))throw Error('unknown reviewed sandbox checkpoint');
    const db=await open();
    try{return await new Promise((resolve,reject)=>{
      const tx=db.transaction(storeName,'readwrite',{durability:'strict'});
      let conflict=false;
      tx.oncomplete=()=>resolve(!conflict);
      tx.onabort=()=>{if(conflict)resolve(false);else reject(Error('reviewed sandbox checkpoint aborted'));};
      const request=tx.objectStore(storeName).add(value,key);
      request.onerror=()=>{conflict=request.error?.name==='ConstraintError';};
    });}finally{db.close();}
  }});
}
