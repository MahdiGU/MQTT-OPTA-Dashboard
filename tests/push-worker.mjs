import assert from 'node:assert/strict';
import {generateKeyPairSync,verify} from 'node:crypto';
const {privateKey,publicKey}=generateKeyPairSync('rsa',{modulusLength:2048});
const secret={project_id:'elmajd-automation',client_email:'test@example.invalid',private_key:privateKey.export({type:'pkcs8',format:'pem'})};
let handler,finish,sendCount=0;
globalThis.Deno={env:{get:key=>({SUPABASE_URL:'https://test.supabase.invalid',SUPABASE_SERVICE_ROLE_KEY:'service-test'})[key]},serve:fn=>handler=fn};
globalThis.fetch=async(url,options={})=>{
  url=String(url);const ok=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'content-type':'application/json'}});
  if(url.endsWith('/rpc/push_worker_config'))return ok({service_account:secret,worker_secret:'worker-test'});
  if(url.endsWith('/rpc/gmail_worker_config'))return ok(null);
  if(url==='https://oauth2.googleapis.com/token'){
    const jwt=options.body.get('assertion'),[header,payload,signature]=jwt.split('.');
    assert(verify('RSA-SHA256',Buffer.from(header+'.'+payload),publicKey,Buffer.from(signature,'base64url')));
    const claims=JSON.parse(Buffer.from(payload,'base64url'));assert.equal(claims.scope,'https://www.googleapis.com/auth/firebase.messaging');
    return ok({access_token:'google-test',expires_in:3600});
  }
  if(url.endsWith('/rpc/claim_push_deliveries'))return ok([{id:'delivery1',lease_id:'lease1',event_id:'event1',recipient_id:'self-user',code:'temperature_critical',severity:'critical',devices:[{installation_id:'a',token:'valid-a'},{installation_id:'b',token:'invalid-b'}]}]);
  if(url.endsWith('/rpc/finish_push_delivery')){finish=JSON.parse(options.body);return ok(null);}
  if(url.endsWith('/rpc/push_target_authorized'))return ok(true);
  if(url.startsWith('https://fcm.googleapis.com/')){
    sendCount++;const body=JSON.parse(options.body);assert.equal(options.headers.authorization,'Bearer google-test');
    if(body.message.token==='invalid-b')return ok({error:{status:'NOT_FOUND',details:[{errorCode:'UNREGISTERED'}]}},404);
    if(body.message.token==='retry')return ok({error:{status:'UNAVAILABLE'}},503);
    assert.equal(body.message.android.priority,'HIGH');assert(body.message.data.delivery_key);return ok({name:'projects/test/messages/1'});
  }
  if(url.endsWith('/auth/v1/user'))return ok({id:'self-user'});
  if(url.includes('/rest/v1/farm_members'))return ok([{farm_id:'farm1'}]);
  if(url.includes('/rest/v1/push_devices')){assert(url.includes('user_id=eq.self-user'));return ok([{farm_id:'farm1',fcm_token:'valid-a'}]);}
  throw Error('Unexpected fetch '+url);
};
await import('../supabase/functions/dispatch-alarms/index.ts');
let response=await handler(new Request('https://test.invalid',{method:'POST',headers:{'x-worker-secret':'worker-test'},body:'{}'}));
assert.equal(response.status,200);assert.equal((await response.json()).processed,1);assert.deepEqual(finish.results.map(r=>r.status),['sent','invalid']);
assert.equal(finish.lease,'lease1');assert.equal(finish.results[0].provider_message_id,'projects/test/messages/1');
const before=sendCount;
response=await handler(new Request('https://test.invalid',{method:'POST',body:'{}'}));assert.equal(response.status,401);assert.equal(sendCount,before);
response=await handler(new Request('https://test.invalid',{method:'POST',headers:{authorization:'Bearer self-test'},body:'{"action":"test"}'}));assert.equal(response.status,200);assert.equal((await response.json()).accepted_by_fcm,1);
const {sendPush}=await import('../supabase/functions/dispatch-alarms/fcm.ts');assert.equal((await sendPush('elmajd-automation','google-test','retry',{event_id:'test',delivery_key:'test'})).status,'retry');
console.log('PASS: signed OAuth JWT, worker authentication, per-device outcomes, invalid-token detection, self-only test, transient retry classification');
