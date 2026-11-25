// Dedicated reviewed-sandbox candidate database, not the installed runtime's storage. No delete or
// overwrite operation. IndexedDB unique primary keys serialize competing inserts.
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
  return Object.freeze({async add(key,value){
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
