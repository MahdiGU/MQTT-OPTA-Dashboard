import assert from 'node:assert/strict';
const config={client_id:'test-client',client_secret:'test-secret',refresh_token:'test-refresh',sender_email:'sender@example.invalid'};
let mode='sent',refreshes=0,messages=[];
globalThis.fetch=async(url,options)=>{
  if(url==='https://oauth2.googleapis.com/token'){refreshes++;assert.equal(options.body.get('grant_type'),'refresh_token');return Response.json({access_token:'test-access',expires_in:3600});}
  assert.equal(url,'https://gmail.googleapis.com/gmail/v1/users/me/messages/send');assert.equal(options.headers.authorization,'Bearer test-access');
  const raw=Buffer.from(JSON.parse(options.body).raw,'base64url').toString('utf8');messages.push(raw);
  if(mode==='retry')return Response.json({error:{}},{status:429});if(mode==='failed')return Response.json({error:{}},{status:403});
  return Response.json({id:'gmail-provider-id'});
};
const {sendGmail}=await import('../supabase/functions/_shared/gmail.ts');
assert.deepEqual(await sendGmail(config,'owner@example.invalid','Alarme température','Température critique à 33 °C.','delivery-test'),{status:'sent',provider_message_id:'gmail-provider-id'});
assert.match(messages[0],/Message-ID: <delivery-test@example.invalid>/);assert.match(messages[0],/Date: .+ GMT\r\n/);
assert.match(Buffer.from(messages[0].split('\r\n\r\n')[1].replaceAll('\r\n',''),'base64').toString(),/Température critique/);
mode='retry';assert.equal((await sendGmail(config,'owner@example.invalid','Test','Test','test')).status,'retry');
mode='failed';assert.equal((await sendGmail(config,'owner@example.invalid','Test','Test','test')).status,'failed');assert.equal(refreshes,1);
await assert.rejects(()=>sendGmail(config,'victim@example.invalid\r\nBcc: other@example.invalid','Test','Test','test'),/INVALID_MAIL_ADDRESS/);
await assert.rejects(()=>sendGmail(config,'owner@example.invalid','Test\r\nBcc:other','Test','test'),/INVALID_MAIL_HEADER/);
console.log('PASS: Gmail token reuse, UTF-8 MIME, delivery reference, retry/permanent errors and header injection rejection');
