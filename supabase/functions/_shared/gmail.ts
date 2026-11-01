export type GmailConfig={client_id:string;client_secret:string;refresh_token:string;sender_email:string};
export type MailResult={status:'sent'|'retry'|'failed';provider_message_id?:string;error_code?:string};
let cached:{key:string;token:string;until:number}|null=null;
export async function gmailAccessToken(config:GmailConfig):Promise<string>{
  if(cached?.key===config.refresh_token&&cached.until>Date.now())return cached.token;
  const response=await fetch('https://oauth2.googleapis.com/token',{method:'POST',headers:{'content-type':'application/x-www-form-urlencoded'},
    body:new URLSearchParams({client_id:config.client_id,client_secret:config.client_secret,refresh_token:config.refresh_token,grant_type:'refresh_token'}),signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw new Error('GMAIL_AUTH_UNAVAILABLE');const result=await response.json();
  if(typeof result.access_token!=='string')throw new Error('GMAIL_AUTH_UNAVAILABLE');
  cached={key:config.refresh_token,token:result.access_token,until:Date.now()+Math.max(0,(Number(result.expires_in)||3600)-120)*1000};return cached.token;
}
function base64(value:string){return btoa(String.fromCharCode(...new TextEncoder().encode(value)));}
function address(value:string){if(!/^[^\s<>@\r\n]+@[^\s<>@\r\n]+\.[^\s<>@\r\n]+$/.test(value))throw new Error('INVALID_MAIL_ADDRESS');return value;}
export async function sendGmail(config:GmailConfig,to:string,subject:string,text:string,id:string):Promise<MailResult>{
  if(/[\r\n]/.test(subject)||!/^[a-zA-Z0-9-]{1,100}$/.test(id))throw new Error('INVALID_MAIL_HEADER');
  const sender=address(config.sender_email);
  const raw=[`From: ElMAJD Automation <${sender}>`,`To: ${address(to)}`,`Date: ${new Date().toUTCString()}`,
    `Subject: =?UTF-8?B?${base64(subject)}?=`,`Message-ID: <${id}@${sender.split('@')[1]}>`,
    'MIME-Version: 1.0','Content-Type: text/plain; charset=UTF-8','Content-Transfer-Encoding: base64','',base64(text).match(/.{1,76}/g)?.join('\r\n')||''].join('\r\n');
  try{
    const token=await gmailAccessToken(config);
    const response=await fetch('https://gmail.googleapis.com/gmail/v1/users/me/messages/send',{method:'POST',headers:{authorization:`Bearer ${token}`,'content-type':'application/json'},
      body:JSON.stringify({raw:base64(raw).replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'')}),signal:AbortSignal.timeout(12000)});
    const result=await response.json().catch(()=>({}));
    if(response.ok&&typeof result.id==='string')return {status:'sent',provider_message_id:result.id};
    if(response.status===401)cached=null;
    const reason=result.error?.errors?.[0]?.reason;
    return {status:response.status===429||response.status>=500||response.status===401||reason==='rateLimitExceeded'||reason==='userRateLimitExceeded'?'retry':'failed',error_code:`GMAIL_HTTP_${response.status}`};
  }catch{return {status:'retry',error_code:'GMAIL_NETWORK_OR_AUTH'};}
}
