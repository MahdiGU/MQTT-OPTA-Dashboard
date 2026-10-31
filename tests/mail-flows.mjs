import assert from 'node:assert/strict';
let handler,recipient=true,allowed=true,mailCount=0,finished;
globalThis.Deno={env:{get:k=>({SUPABASE_URL:'https://test.invalid',SUPABASE_SERVICE_ROLE_KEY:'service-test'})[k]},serve:fn=>handler=fn};
const config={client_id:'test-client',client_secret:'secret',refresh_token:'refresh-mail-flows',sender_email:'sender@example.invalid'};
globalThis.fetch=async(url,options={})=>{
  url=String(url);const ok=value=>Response.json(value);
  if(url.endsWith('/rpc/gmail_worker_config'))return ok(config);
  if(url.endsWith('/rpc/reserve_account_recovery'))return ok(allowed);
  if(url.endsWith('/rpc/account_recovery_recipient'))return ok(recipient?{email:'owner@example.invalid',language:'fr'}:null);
  if(url.endsWith('/auth/v1/admin/generate_link')){assert.deepEqual(JSON.parse(options.body),{type:'recovery',email:'owner@example.invalid'});return ok({email_otp:'123456'});}
  if(url==='https://oauth2.googleapis.com/token')return ok({access_token:'test-access',expires_in:3600});
  if(url.includes('gmail.googleapis.com')){mailCount++;return ok({id:'mail1'});}
  if(url.endsWith('/rpc/push_worker_config'))return ok({worker_secret:'worker-test'});
  if(url.endsWith('/rpc/claim_push_deliveries'))return ok([]);
  if(url.endsWith('/rpc/claim_email_deliveries'))return ok([{id:'test-delivery',lease_id:'lease',email:'owner@example.invalid',language:'fr',code:'temperature_critical',event_id:'event1',activated_at:new Date().toISOString()}]);
  if(url.endsWith('/rpc/email_target_authorized'))return ok(allowed);
  if(url.endsWith('/rpc/finish_email_delivery')){finished=JSON.parse(options.body);return ok(null);}
  throw Error('Unexpected '+url);
};
await import('../supabase/functions/account-recovery/index.ts');
const recovery=handler,request=()=>new Request('https://test.invalid',{method:'POST',body:'{"email":"owner@example.invalid"}'});
let r=await recovery(request());assert.equal(r.status,200);const known=await r.json();assert.equal(mailCount,1);
recipient=false;r=await recovery(request());assert.deepEqual(await r.json(),known);assert.equal(mailCount,1);
allowed=false;r=await recovery(request());assert.deepEqual(await r.json(),known);assert.equal(mailCount,1);
await import('../supabase/functions/dispatch-alarms/index.ts');
const dispatch=()=>handler(new Request('https://test.invalid',{method:'POST',headers:{'x-worker-secret':'worker-test'},body:'{}'}));
allowed=true;r=await dispatch();assert.equal(r.status,200);assert.equal((await r.json()).email_processed,1);assert.equal(finished.result.status,'sent');assert.equal(mailCount,2);
allowed=false;await dispatch();assert.equal(finished.result.error_code,'TARGET_REVOKED');assert.equal(mailCount,2);
console.log('PASS: recovery code sent only to eligible accounts, generic responses, throttling, alarm email and pre-send revocation');
