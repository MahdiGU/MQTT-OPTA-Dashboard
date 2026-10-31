import {jsonResponse,requireEnvironment,requireSupabaseSecretKey} from '../_shared/http.ts';
import {googleAccessToken,sendPush} from './fcm.ts';
import {alarmText} from './language.ts';

Deno.serve(async(request)=>{
  const startedAt=Date.now();
  if(request.method!=='POST')return jsonResponse({error:'POST required'},405);
  const base=requireEnvironment('SUPABASE_URL'),key=requireSupabaseSecretKey();
  const headers={apikey:key,authorization:`Bearer ${key}`,'content-type':'application/json'};
  async function rpc(name:string,body:unknown={}){
    const response=await fetch(`${base}/rest/v1/rpc/${name}`,{method:'POST',headers,body:JSON.stringify(body),signal:AbortSignal.timeout(10000)});
    if(!response.ok)throw new Error(`Database operation failed: ${name}`);return response.json();
  }
  try{
    const config=await rpc('push_worker_config');
    const worker=request.headers.get('x-worker-secret');
    let testUser:string|null=null;
    if(!worker||worker!==config.worker_secret){
      const auth=request.headers.get('authorization')||'';
      if(!auth.startsWith('Bearer '))return jsonResponse({error:'Authentication required'},401);
      const verified=await fetch(`${base}/auth/v1/user`,{headers:{apikey:key,authorization:auth}});
      if(!verified.ok)return jsonResponse({error:'Invalid session'},401);
      testUser=String((await verified.json()).id);
      const body=await request.json();if(body.action!=='test')return jsonResponse({error:'Only a self-test is permitted'},403);
    }
    const access=await googleAccessToken(config.service_account);
    if(testUser){
      const members=await fetch(`${base}/rest/v1/farm_members?select=farm_id&user_id=eq.${testUser}&role=in.(owner,manager)`,{headers});
      if(!members.ok)throw new Error('Membership lookup failed');const memberships=await members.json();
      const allowed=new Set(memberships.map((m:{farm_id:string})=>m.farm_id));
      const phones=await fetch(`${base}/rest/v1/push_devices?select=installation_id,farm_id,fcm_token,language_code&user_id=eq.${testUser}&enabled=eq.true&limit=10`,{headers});
      if(!phones.ok)throw new Error('Phone lookup failed');
      const devices=(await phones.json()).filter((p:{farm_id:string})=>allowed.has(p.farm_id));
      if(!devices.length)return jsonResponse({error:'No registered phone with notifications enabled'},409);
      let accepted=0;const id=crypto.randomUUID();
      for(const phone of devices){const outcome=await sendPush(config.service_account.project_id,access,phone.fcm_token,
        {title:'ElMAJD Automation',body:phone.language_code==='fr'?'Notification test reçue avec succès.':'Push notification test received successfully.',event_id:`test-${id}`,delivery_key:id,recipient_id:testUser,code:'test'});if(outcome.status==='sent')accepted++;}
      return jsonResponse({accepted_by_fcm:accepted,phones:devices.length},accepted?200:502);
    }
    const jobs=await rpc('claim_push_deliveries');let processed=0;
    for(const job of jobs){
      const results=[];
      for(const device of job.devices){
        let outcome;
        try{
          if(Date.now()-startedAt>40000)outcome={status:'retry',error_code:'WORKER_BUDGET'};
          else if(!await rpc('push_target_authorized',{delivery:job.id,lease:job.lease_id,installation:device.installation_id,device_token:device.token}))outcome={status:'invalid',error_code:'TARGET_REVOKED'};
          else outcome=await sendPush(config.service_account.project_id,access,device.token,{
            title:device.language==='fr'?`ElMAJD — ${job.severity==='critical'?'alarme critique':'avertissement'}`:`ElMAJD ${job.severity} alarm`,body:alarmText(job.code,device.language),event_id:job.event_id,delivery_key:job.id,recipient_id:job.recipient_id,code:job.code});
        }
        catch{outcome={status:'retry',error_code:'NETWORK_ERROR'};}
        results.push({...outcome,installation_id:device.installation_id,token:device.token});
      }
      await rpc('finish_push_delivery',{delivery:job.id,lease:job.lease_id,results});processed++;
    }
    return jsonResponse({processed});
  }catch(error){console.error(error instanceof Error?error.message:'Push dispatch error');return jsonResponse({error:'Push delivery is temporarily unavailable'},503);}
});
