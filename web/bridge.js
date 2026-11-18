import {createClient} from '@supabase/supabase-js';
import {config} from './config.js';
import {telemetry, history, operation, businessDate} from './data.js';

const storageKey='elmajd-flow-web-session';
const preference='elmajd-flow-web-remember';
const storage={
  getItem:key=>sessionStorage.getItem(key)??localStorage.getItem(key),
  setItem:(key,value)=>{const keep=localStorage.getItem(preference)==='true';(keep?localStorage:sessionStorage).setItem(key,value);(keep?sessionStorage:localStorage).removeItem(key);},
  removeItem:key=>{localStorage.removeItem(key);sessionStorage.removeItem(key);},
};
const client=createClient(config.url,config.publishableKey,{
  auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:false,storage,storageKey},
  realtime:{params:{eventsPerSecond:2}},
  global:{fetch:(url,options={})=>fetch(url,{...options,signal:options.signal??AbortSignal.timeout(15000)})},
});
let farm=null,user=null,channel=null,subscribed=false,lastLive=0,epoch=0,starting=null,activeUser=null;
let refreshTimer,latestTimer,phaseTimer;const pending=new Map();
const emit=(type,data='')=>window.elMajdNativeEvent?.(type,typeof data==='string'?data:JSON.stringify(data));
const message=error=>String(error?.message||error||'Cloud request failed.').replace(/[<>]/g,'').slice(0,350);
const unwrap=async query=>{const result=await query;if(result.error)throw result.error;return result.data;};
const table=name=>client.from(name).select('*').eq('farm_id',farm.id);
const rpc=(name,body)=>unwrap(client.rpc(name,body));
const authenticated=()=>{if(!farm||!user)throw Error('Cloud sign-in is required.');};
function liveStatus(payload){
  const age=Date.now()-Date.parse(payload.captured_at||payload.received_at);
  emit('device_status',payload.mqtt_status==='offline'?'offline':Number.isFinite(age)&&age>=-60000&&age<20000?'online':'Delayed');
}
async function once(key,fn){
  if(pending.has(key))return pending.get(key);
  const promise=Promise.resolve().then(fn).finally(()=>{if(pending.get(key)===promise)pending.delete(key);});
  pending.set(key,promise);return promise;
}
async function action(errorType,fn,input){
  const generation=epoch;
  try{authenticated();await fn(generation);}
  catch(error){if(generation!==epoch)return;
    emit(errorType,input?.request_id?{request_id:input.request_id,message:message(error)}:message(error));
  }
}
function announce(type,data,generation){if(generation===epoch&&user)emit(type,data);}
async function latest(){return once('latest',async()=>{
  const generation=epoch;authenticated();
  const rows=await unwrap(table('device_latest').order('received_at',{ascending:false}).limit(1));
  if(generation!==epoch||!user)return;
  if(rows.length){const payload=telemetry(rows[0]);emit('telemetry',payload);liveStatus(payload);}
  else emit('device_status','No telemetry');
});}
async function records(){return once('records',async()=>{
  const generation=epoch;authenticated();const rows=await unwrap(table('daily_production').order('production_date',{ascending:false}).limit(90));
  announce('production_history',rows,generation);
});}
async function configuration(){return once('configuration',async()=>{
  const generation=epoch;authenticated();const rows=await unwrap(table('flock_settings').limit(1));announce('configuration',rows[0]||{},generation);
});}
async function samples(){return once('samples',async()=>{
  const generation=epoch;authenticated();const since=new Date(Date.now()-43200000).toISOString();
  const rows=await unwrap(client.from('telemetry_five_minute').select('bucket_start,temp_last,i2_last,i3_last,i4_last,i5_last,i6_last,i7_last').eq('farm_id',farm.id).gte('bucket_start',since).order('bucket_start').limit(160));
  announce('history',history(rows),generation);
});}
async function shared(){return once('shared',async()=>{
  const generation=epoch;authenticated();const farmId=farm.id;
  const [membership,houses]=await Promise.all([
    unwrap(client.from('farm_members').select('role').eq('farm_id',farmId).eq('user_id',user.id).limit(1)),
    unwrap(table('poultry_houses').order('slug').limit(1)),
  ]);
  const house=houses[0]?.id;
  const [channels,flock_adjustments,settings,cartons,receipts,alarms]=await Promise.all([
    rpc('notification_channels_status',{target_farm:farmId}),
    unwrap(table('flock_adjustments').order('created_at',{ascending:false}).limit(50)),
    house?unwrap(client.from('alarm_settings').select('house_id,warning_c,critical_c').eq('house_id',house)):[],
    unwrap(table('carton_balance')),unwrap(table('carton_receipts').order('created_at',{ascending:false}).limit(100)),
    unwrap(table('alarm_events').order('resolved_at',{ascending:false,nullsFirst:true}).order('activated_at',{ascending:false}).limit(100)),
  ]);
  announce('phase5_data',{role:membership[0]?.role||'viewer',house_id:house||'',channels,flock_adjustments,settings,cartons,receipts,alarms},generation);
  if(generation===epoch)document.dispatchEvent(new CustomEvent('elmajd-web-account',{detail:{email:user.email,farm:farm.name,role:membership[0]?.role||'viewer'}}));
});}
async function business(){await Promise.allSettled([
  action('production_history_error',records),action('configuration_error',configuration),action('phase5_error',shared),
]);}
function scheduleBusiness(){clearTimeout(phaseTimer);phaseTimer=setTimeout(()=>business(),350);}
function subscribe(){
  if(!farm||!user)return;subscribed=false;
  if(channel)client.removeChannel(channel);
  const generation=epoch;
  channel=client.channel('flow-web-'+farm.id);
  channel.on('postgres_changes',{event:'*',schema:'public',table:'device_latest',filter:'farm_id=eq.'+farm.id},event=>{
    if(generation!==epoch)return;lastLive=Date.now();
    if(event.eventType==='DELETE'){action('realtime_error',latest);return;}
    const payload=telemetry(event.new);emit('telemetry',payload);liveStatus(payload);
  });
  for(const name of ['daily_production','alarm_events','carton_receipts','flock_adjustments']){
    channel.on('postgres_changes',{event:'*',schema:'public',table:name,filter:'farm_id=eq.'+farm.id},()=>{if(generation===epoch)scheduleBusiness();});
  }
  channel.subscribe(status=>{
    if(generation!==epoch)return;subscribed=status==='SUBSCRIBED';
    emit('connection',subscribed?'online':status==='CLOSED'?'offline':'reconnecting');
    emit('realtime_error',subscribed?'Subscribed':status==='CHANNEL_ERROR'?'Realtime unavailable · REST fallback active':'Connecting · REST fallback active');
    if(subscribed){lastLive=Date.now();action('realtime_error',latest);scheduleBusiness();}
  });
}
async function start(session){
  if(document.readyState==='loading')await new Promise(resolve=>document.addEventListener('DOMContentLoaded',resolve,{once:true}));
  if(!session?.user)return;
  if(activeUser===session.user.id)return starting;
  activeUser=session.user.id;const generation=++epoch;pending.clear();
  starting=(async()=>{
    try{
      user=session.user;emit('cloud_connection','connecting');
      const farms=await unwrap(client.from('farms').select('id,name,slug').eq('slug',config.farmSlug).limit(1));
      if(generation!==epoch)return;
      if(!farms.length)throw Error('This account does not have access to the ElMAJD farm.');
      farm=farms[0];document.getElementById('password').value='';
      document.getElementById('loginView').classList.add('hidden');document.getElementById('appView').classList.remove('hidden');
      emit('cloud_connection','online');emit('cloud_session','Authenticated');
      emit('push_status','Phone notifications use the Android app. The web dashboard monitors while this tab is open.');
      await Promise.allSettled([business(),action('realtime_error',latest),action('history_error',samples)]);
      if(generation!==epoch)return;subscribe();clearInterval(latestTimer);clearInterval(refreshTimer);
      latestTimer=setInterval(()=>{if(!document.hidden&&(!subscribed||Date.now()-lastLive>25000))action('realtime_error',latest);},15000);
      refreshTimer=setInterval(()=>{if(!document.hidden){business();action('history_error',samples);}},300000);
    }catch(error){if(generation!==epoch)return;activeUser=null;farm=null;user=null;emit('cloud_error',message(error));showLogin(message(error));}
  })();return starting;
}
function showLogin(text=''){
  document.getElementById('appView').classList.add('hidden');document.getElementById('loginView').classList.remove('hidden');
  emit('error',text);document.getElementById('loginMessage').textContent=message(text||'');
}
function stop(){
  epoch++;activeUser=null;farm=null;user=null;pending.clear();subscribed=false;
  clearInterval(latestTimer);clearInterval(refreshTimer);clearTimeout(phaseTimer);
  if(channel){client.removeChannel(channel);channel=null;}
  emit('cloud_connection','offline');emit('device_status','offline');emit('connection','stopped');
  emit('production_history',[]);emit('configuration',{});
  document.dispatchEvent(new CustomEvent('elmajd-web-account',{detail:null}));
}
async function gateway(body,token){
  if(!token){const {data,error}=await client.auth.getSession();if(error)throw error;token=data.session?.access_token;}
  const response=await fetch(config.url+'/functions/v1/web-dashboard-api',{
    method:'POST',headers:{apikey:config.publishableKey,'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},
    body:JSON.stringify(body),signal:AbortSignal.timeout(50000),
  });
  const data=await response.json();if(!response.ok)throw Error(data.error||data.message||'Cloud request failed ('+response.status+')');return data;
}
async function authRequest(path,body,token,method='POST'){
  const response=await fetch(config.url+path,{method,headers:{apikey:config.publishableKey,'content-type':'application/json',...(token?{authorization:'Bearer '+token}:{})},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(15000)});
  const data=await response.json().catch(()=>({}));if(!response.ok)throw Error(data.msg||data.error_description||data.message||'Account request failed');return data;
}
async function withVerifiedPassword(input,email,kind){
  if(typeof input.password!=='string'||input.password.length<12||input.password.length>128)throw Error('Use a password with 12 to 128 characters.');
  const session=kind==='recovery'
    ?await authRequest('/auth/v1/verify',{email,token:input.code,type:'recovery'})
    :await authRequest('/auth/v1/token?grant_type=password',{email,password:input.current});
  try{await authRequest('/auth/v1/user',{password:input.password},session.access_token,'PUT');}
  finally{await authRequest('/auth/v1/logout?scope=local',null,session.access_token).catch(()=>{});}
}
async function phase(actionName,text){
  let input;try{input=JSON.parse(text||'{}');}catch{emit('phase5_error','Invalid request');return;}
  const errorType=['production_page','production_preview'].includes(actionName)?actionName+'_error':actionName==='password_change'?'account_error':actionName==='email_test'?'email_status':actionName==='push_test'?'push_status':'phase5_error';
  await action(errorType,async generation=>{
    if(actionName==='refresh'){await shared();return;}
    if(actionName==='push_sync'){emit('push_status','Phone notifications use the Android app. The web dashboard monitors while this tab is open.');return;}
    if(actionName==='password_change'){await withVerifiedPassword(input,user.email,'password');announce('account_saved','password_change',generation);return;}
    if(actionName==='push_test'||actionName==='email_test'){
      await gateway({operation:'notification_test',action:actionName==='email_test'?'test_email':'test'});
      announce(actionName==='email_test'?'email_status':'push_status',actionName==='email_test'?'Test accepted by Gmail — check your inbox and spam folder':'Test accepted by Firebase — check the phone notification',generation);return;
    }
    if(actionName==='production_page'){
      let query=table('daily_production').order('production_date',{ascending:false}).limit(31);if(input.before)query=query.lt('production_date',input.before);
      const rows=await unwrap(query);announce('production_page',{rows:rows.slice(0,30),has_more:rows.length>30,request_id:input.request_id},generation);return;
    }
    const [name,args]=operation(actionName,input,farm.id),data=await rpc(name,args);
    if(actionName==='production_preview'){announce('production_preview',{...data,request_id:input.request_id},generation);return;}
    announce('phase5_saved',actionName,generation);await business();
  },input);
}
window.ElMajdNative={
  hasSavedLogin:()=>false,getSavedSupabaseEmail:()=>localStorage.getItem('elmajd-flow-web-email')||'',getHistory:()=>'[]',setLanguage:()=>{},
  connect:(email,password,remember)=>{(async()=>{
    try{localStorage.setItem(preference,String(!!remember));if(remember)localStorage.setItem('elmajd-flow-web-email',email);else localStorage.removeItem('elmajd-flow-web-email');
      const {data,error}=await client.auth.signInWithPassword({email,password});if(error)throw error;await start(data.session);
    }catch(error){emit('cloud_error',message(error));showLogin(message(error));}finally{document.getElementById('password').value='';}
  })();},
  resumeSavedMonitoring:()=>client.auth.getSession().then(({data})=>start(data.session)),
  publish:payload=>action('publish_error',async generation=>{const response=await gateway({operation:'command',payload});announce('published',response.payload||payload,generation);}),
  publishProduction:text=>action('production_error',async generation=>{const input=JSON.parse(text),[name,args]=operation('create',input,farm.id);await rpc(name,args);announce('production_saved',input.date,generation);await business();}),
  deleteProduction:id=>action('production_delete_error',async generation=>{await rpc(...operation('delete',{id},farm.id));announce('production_deleted',String(id),generation);await business();}),
  saveConfiguration:count=>phase('flock_adjust',JSON.stringify({date:businessDate(),count,category:'correction',note:'Web configuration',request_id:crypto.randomUUID()})),
  requestCloudHistory:()=>action('history_error',samples),requestProductionHistory:()=>action('production_history_error',records),requestConfiguration:()=>action('configuration_error',configuration),
  phase5Action:phase,
  recoverAccount:(name,text)=>{(async()=>{try{const input=JSON.parse(text);
    if(name==='request')await gateway({operation:'account_recovery',email:input.email});
    else if(name==='reset')await withVerifiedPassword(input,input.email,'recovery');else throw Error('Unknown account operation.');
    emit('account_saved',name);
  }catch(error){emit('account_error',message(error));}})();},
  signOut:()=>{stop();storage.removeItem(storageKey);client.auth.signOut({scope:'local'}).catch(()=>{});},
};
client.auth.onAuthStateChange((event,session)=>{
  if(event==='SIGNED_OUT'){stop();showLogin();}
  else if(session&&['SIGNED_IN','INITIAL_SESSION'].includes(event))setTimeout(()=>start(session),0);
});
async function ready(){
  document.getElementById('username').value=localStorage.getItem('elmajd-flow-web-email')||'';
  const {data,error}=await client.auth.getSession();if(error)showLogin(message(error));else if(data.session)await start(data.session);
}
if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',ready,{once:true});else ready();
function resume(){if(user&&!document.hidden){business();action('realtime_error',latest);action('history_error',samples);if(!subscribed)subscribe();}}
document.addEventListener('visibilitychange',resume);addEventListener('online',resume);
addEventListener('offline',()=>{emit('connection','offline');emit('realtime_error','Network offline');emit('device_status','offline');});
