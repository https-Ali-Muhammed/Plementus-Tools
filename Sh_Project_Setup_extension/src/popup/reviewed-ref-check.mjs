const read=document.getElementById('read'), revoke=document.getElementById('revoke'), result=document.getElementById('result');
const permission={permissions:['nativeMessaging']};
function display(value){result.textContent=JSON.stringify(value,null,2);}
read.addEventListener('click',async()=>{
  read.disabled=revoke.disabled=true;
  try {
    // Request directly within the user gesture; never request at worker startup.
    if(await chrome.permissions.request(permission)!==true){display({ok:false,reason:'PERMISSION_DENIED'});return;}
    result.textContent='Reading…';
    display(await chrome.runtime.sendMessage({type:'REVIEWED_MAIN_REF_CHECK'}));
  } catch {display({ok:false,reason:'READ_UNAVAILABLE'});}
  finally {read.disabled=revoke.disabled=false;}
});
revoke.addEventListener('click',async()=>{
  read.disabled=revoke.disabled=true;
  try {display({revoked:await chrome.permissions.remove(permission)});}catch{display({revoked:false});}
  finally {read.disabled=revoke.disabled=false;}
});
