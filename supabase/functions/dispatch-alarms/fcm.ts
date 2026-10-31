export type ServiceAccount = { project_id:string; client_email:string; private_key:string };
let cachedToken="", expiresAt=0;
const encode=(value:string)=>btoa(value).replaceAll('+','-').replaceAll('/','_').replaceAll('=','');
export async function googleAccessToken(account:ServiceAccount):Promise<string>{
  if(cachedToken&&Date.now()<expiresAt)return cachedToken;
  if(account.project_id!=="elmajd-automation")throw new Error("Unexpected sender project");
  const seconds=Math.floor(Date.now()/1000);
  const unsigned=encode(JSON.stringify({alg:'RS256',typ:'JWT'}))+'.'+encode(JSON.stringify({iss:account.client_email,
    scope:'https://www.googleapis.com/auth/firebase.messaging',aud:'https://oauth2.googleapis.com/token',iat:seconds,exp:seconds+3600}));
  const der=Uint8Array.from(atob(account.private_key.replace(/-----[^-]+-----/g,'').replace(/\s/g,'')),c=>c.charCodeAt(0));
  const key=await crypto.subtle.importKey('pkcs8',der,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['sign']);
  const signature=new Uint8Array(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',key,new TextEncoder().encode(unsigned)));
  const jwt=unsigned+'.'+encode(String.fromCharCode(...signature));
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',body:new URLSearchParams({grant_type:'urn:ietf:params:oauth:grant-type:jwt-bearer',assertion:jwt}),signal:AbortSignal.timeout(10000)});
  const result=await response.json();if(!response.ok||!result.access_token)throw new Error('Google sender authorization failed');
  cachedToken=result.access_token;expiresAt=Date.now()+(Number(result.expires_in)-120)*1000;return cachedToken;
}
export async function sendPush(project:string,accessToken:string,token:string,data:Record<string,string>){
  const response=await fetch(`https://fcm.googleapis.com/v1/projects/${project}/messages:send`,{method:'POST',
    headers:{authorization:`Bearer ${accessToken}`,'content-type':'application/json'},
    body:JSON.stringify({message:{token,data,android:{priority:'HIGH',ttl:'300s',collapse_key:data.event_id}}}),signal:AbortSignal.timeout(10000)});
  const result=await response.json();
  if(response.ok)return {status:'sent',provider_message_id:String(result.name)};
  const code=result.error?.details?.find((x:Record<string,unknown>)=>x.errorCode)?.errorCode||result.error?.status||'FCM_ERROR';
  if(response.status===401){cachedToken='';expiresAt=0;}
  return {status:code==='UNREGISTERED'?'invalid':'retry',error_code:String(code)};
}
