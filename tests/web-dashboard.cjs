const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),http=require('node:http'),vm=require('node:vm');
const {chromium}=require('playwright'),esbuild=require('esbuild');
const root=path.resolve(__dirname,'../web/dist');
const dataModule={exports:{}};vm.runInNewContext(esbuild.transformSync(fs.readFileSync(path.resolve(__dirname,'../web/data.js'),'utf8'),{format:'cjs'}).code,{module:dataModule,exports:dataModule.exports});
const {bit,telemetry,operation}=dataModule.exports;
assert.equal(bit(null),null);assert.equal(bit(false),0);assert.equal(bit(1),1);
assert.equal(telemetry({raw_payload:{feed_chains:2081},i5:true}).feed_chains,2081);
assert.equal(telemetry({}).inputs.I5,null,'unknown input never turns into an OFF measurement');
assert.throws(()=>operation('create',{stock:-1,sortie:0,mortality:0},'farm'));
assert.equal(operation('receipt_delete',{id:'entry'},'farm')[1].receipt_id,'entry');

async function gatewayChecks(){
 const compiled=esbuild.transformSync(fs.readFileSync(path.resolve(__dirname,'../supabase/functions/web-dashboard-api/index.ts'),'utf8'),{loader:'ts',format:'cjs'}).code;
 let handler,forwarded=[];vm.runInNewContext(compiled,{module:{exports:{}},exports:{},Request,Response,AbortSignal,console,
  Deno:{serve:fn=>handler=fn,env:{get:()=> 'https://project.supabase.co'}},
  fetch:async(url,options)=>{forwarded.push({url,options});return new Response('{"payload":"D0 ON"}',{status:200});},
 });
 const call=body=>handler(new Request('https://api.example/',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
 assert.equal((await handler(new Request('https://api.example/',{method:'OPTIONS'}))).status,204);
 assert.equal((await call({operation:'command',payload:'D0 ON'})).status,401);
 assert.equal(forwarded.length,0,'anonymous command never reaches the broker function');
 const token='Bearer a.b.c';
 const command=await handler(new Request('https://api.example/',{method:'POST',headers:{authorization:token,'x-worker-secret':'DO-NOT-FORWARD'},body:JSON.stringify({operation:'command',payload:'led2  off'})}));
 assert.equal(command.status,200);assert.equal(forwarded[0].url,'https://project.supabase.co/functions/v1/send-mqtt-command');
 assert.equal(JSON.parse(forwarded[0].options.body).payload,'LED2 OFF');assert.equal(forwarded[0].options.headers['x-worker-secret'],undefined);
 assert.equal(forwarded[0].options.headers.authorization,token);
 const invalid=await handler(new Request('https://api.example/',{method:'POST',headers:{authorization:token},body:JSON.stringify({operation:'notification_test',action:'run_worker'})}));
 assert.equal(invalid.status,403);assert.equal(forwarded.length,1,'gateway cannot trigger the alarm worker');
 console.log('PASS: web telemetry/RPC mapping, numeric bounds, browser gateway auth, command normalization and worker-header isolation');
}
const types={'.html':'text/html','.js':'application/javascript','.css':'text/css','.svg':'image/svg+xml','.png':'image/png','.ttf':'font/ttf'};
const server=http.createServer((req,res)=>{const name=new URL(req.url,'http://localhost').pathname.slice(1)||'index.html',file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));});
(async()=>{
 await gatewayChecks();await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
 const browser=await chromium.launch({headless:true,args:['--enable-webgl','--use-angle=swiftshader','--enable-unsafe-swiftshader'],...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
 try{
  const page=await browser.newPage({viewport:{width:1440,height:1000}}),errors=[],requests=[];page.setDefaultTimeout(12000);page.on('pageerror',error=>{errors.push(error.message);console.error('Browser error:',error.stack);});
  const uid='11111111-1111-4111-8111-111111111111',farm='daef3e76-9e91-4210-8d34-fc0906ab3eae',house='6d52494a-78fe-4ba1-b9b8-2a358dced3c0';
  const user={id:uid,aud:'authenticated',role:'authenticated',email:'test@example.invalid',email_confirmed_at:new Date().toISOString(),app_metadata:{provider:'email'},user_metadata:{},identities:[],created_at:new Date().toISOString()};
  const encode=value=>Buffer.from(JSON.stringify(value)).toString('base64url');
  const token=encode({alg:'HS256',typ:'JWT'})+'.'+encode({sub:uid,exp:Math.floor(Date.now()/1000)+3600,aud:'authenticated',role:'authenticated'})+'.test';
  const session={access_token:token,refresh_token:'test-refresh-token',expires_in:3600,expires_at:Math.floor(Date.now()/1000)+3600,token_type:'bearer',user};
  const today=new Date(Date.now()+3600000).toISOString().slice(0,10);
  let row={device_id:'test-device',farm_id:farm,received_at:new Date().toISOString(),captured_at:new Date().toISOString(),mqtt_status:'online',temp_c:28.5,volts:5,sensor_fault:false,rssi:-45,seq:12,up_s:345,d0:false,d1:true,d2:false,d3:false,l0:true,l1:false,l2:false,l3:false,i2:true,i3:false,i4:true,i5:true,i6:false,i7:true,i8:false,raw_payload:{feed_chains:2081}};
  let production=[{id:1,production_date:today,stock:3500,sortie:800,eggs:900,mortality:2,production_rate:90,chicken_count:1000,cartons_used:33}];
  const tableRows={farms:[{id:farm,name:'ElMAJD Poultry',slug:'elmajd-poultry'}],farm_members:[{role:'owner'}],poultry_houses:[{id:house,slug:'house'}],flock_settings:[{chicken_count:1000}],flock_adjustments:[],alarm_settings:[{house_id:house,warning_c:30,critical_c:33}],carton_balance:[{received:200,consumed:33,balance:167,reference_date:today,shortfall:0}],carton_receipts:[],alarm_events:[],telemetry_five_minute:[{bucket_start:new Date(Date.now()-300000).toISOString(),temp_last:28.1,i2_last:true,i3_last:false,i4_last:true,i5_last:true,i6_last:false,i7_last:true}]};
  await page.route('https://zlmaombpfdznambrgqiv.supabase.co/**',async route=>{
   const request=route.request(),url=new URL(request.url()),body=request.postDataJSON?.()||{};requests.push({path:url.pathname,query:url.search,body,auth:request.headers().authorization});
   const headers={'access-control-allow-origin':'*','access-control-allow-headers':'*','content-type':'application/json'};
   const respond=(data,status=200)=>route.fulfill({status,headers,body:JSON.stringify(data)});
   if(request.method()==='OPTIONS')return route.fulfill({status:204,headers});
   if(url.pathname==='/auth/v1/token')return respond(session);
   if(url.pathname==='/auth/v1/user')return respond(user);
   if(url.pathname==='/auth/v1/logout')return route.fulfill({status:204,headers});
   if(url.pathname==='/functions/v1/web-dashboard-api')return respond(body.operation==='command'?{payload:body.payload}:{message:'accepted'});
   const name=url.pathname.split('/').at(-1);
   if(url.pathname.startsWith('/rest/v1/rpc/')){
    if(name==='preview_daily_production')return respond({valid:true,eggs:body.stock_count===700?0:800,production_rate:body.stock_count===700?0:80,remaining_flock:1000,cartons_used:body.stock_count===700?0:30,previous_date:new Date(Date.now()+3600000-2*86400000).toISOString().slice(0,10),first_record:body.stock_count===700});
    if(name==='notification_channels_status')return respond({gmail_configured:true,push_configured:true});
    return respond({});
   }
   if(name==='device_latest')return respond([row]);
   if(name==='daily_production')return respond(production);
   if(name in tableRows)return respond(tableRows[name]);
   return respond({message:'Unexpected mocked route '+url.pathname},404);
  });
  let websocket,join,binding;
  await page.routeWebSocket('wss://zlmaombpfdznambrgqiv.supabase.co/**',socket=>{
   websocket=socket;
   socket.onMessage(raw=>{
    const packet=JSON.parse(raw),array=Array.isArray(packet);
    const [joinRef,ref,topic,event,payload]=array?packet:[packet.join_ref,packet.ref,packet.topic,packet.event,packet.payload];
    if(event==='phx_join'){
     join={joinRef,topic,array};binding=payload.config.postgres_changes.map((value,id)=>({...value,id:id+1}));
     const data={status:'ok',response:{postgres_changes:binding}};
     socket.send(JSON.stringify(array?[joinRef,ref,topic,'phx_reply',data]:{join_ref:joinRef,ref,topic,event:'phx_reply',payload:data}));
    }else if(event==='heartbeat')socket.send(JSON.stringify(array?[joinRef,ref,topic,'phx_reply',{status:'ok',response:{}}]:{ref,topic,event:'phx_reply',payload:{status:'ok',response:{}}}));
   });
  });
  const base=`http://127.0.0.1:${server.address().port}`;
  await page.goto(base+'/?preview');await page.evaluate(()=>document.fonts.ready);
  await page.waitForFunction(()=>document.querySelector('link[href="brand.css"]')?.sheet);
  assert.equal(await page.locator('html').getAttribute('data-brand'),'elmajd');
  assert.equal(await page.locator('.login-brand img').getAttribute('src'),'elmajd-logo.png');
  assert.equal(await page.locator('.identity img').getAttribute('src'),'elmajd-logo.png');
  assert.equal(await page.locator('#loginForm .primary').evaluate(node=>getComputedStyle(node).backgroundColor),'rgb(255, 139, 0)');
  assert.equal(await page.locator('#loginView').isVisible(),true,'web build never signs in through demo query parameters');
  await page.waitForFunction(()=>document.querySelector('link[href="desktop.css"]')?.sheet,undefined,{timeout:12000}).catch(async error=>{console.error(await page.evaluate(()=>({errors:document.getElementById('loginMessage').textContent,html:document.documentElement.dataset,styles:[...document.querySelectorAll('link[rel=stylesheet]')].map(l=>({href:l.href,loaded:!!l.sheet}))})));throw error;});
  assert.equal(await page.locator('.web-login-story').isVisible(),true,JSON.stringify(await page.evaluate(()=>({width:innerWidth,style:getComputedStyle(document.querySelector('.web-login-story')).display,errors:document.querySelector('#loginMessage').textContent}))));
  const screenshot=async name=>{if(process.env.WEB_SCREENSHOTS){fs.mkdirSync(process.env.WEB_SCREENSHOTS,{recursive:true});await page.evaluate(()=>scrollTo(0,0));await page.screenshot({path:path.join(process.env.WEB_SCREENSHOTS,name+'.png'),fullPage:true,animations:'disabled'});if(name==='web-overview')await page.screenshot({path:path.join(process.env.WEB_SCREENSHOTS,'dashboard-preview.png'),animations:'disabled'});}};
  await screenshot('web-login');
  await page.setViewportSize({width:320,height:844});assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,'new logo and login fit a narrow phone');await page.setViewportSize({width:1440,height:1000});
  await page.fill('#username',user.email);await page.fill('#password','BrowserTestPassword12!');await page.click('#loginForm button[type=submit]');
  await page.waitForFunction(()=>state.cloud&&state.flock===1000&&state.rows.length===1,undefined,{timeout:12000}).catch(async error=>{console.error('Sign-in diagnostic',await page.evaluate(()=>({cloud:state.cloud,flock:state.flock,rows:state.rows.length,login:document.getElementById('loginMessage').textContent,app:document.getElementById('appView').className})),requests.map(r=>r.path));throw error;});
  await page.waitForFunction(()=>/Subscribed|Abonn/.test(document.getElementById('realtimeDetail').textContent));
  assert.match(await page.locator('#overviewTemperature').textContent(),/28\.5/);
  assert.equal(await page.locator('#overviewCartonCount').textContent(),'167');
  assert.equal(await page.locator('.app>.nav [data-nav]').count(),5);
  assert.equal(await page.locator('#password').inputValue(),'');
  assert.equal(await page.evaluate(()=>JSON.stringify(localStorage).includes('BrowserTestPassword12!')),false,'raw password is never persisted');
  assert.equal(await page.locator('.flow-chart-point').count(),1);
  await screenshot('web-overview');
  assert.equal((await page.locator('.app>.nav').boundingBox()).x<40,true,'desktop uses the side navigation');
  assert.equal(await page.locator('#eggStock').evaluate(node=>parseFloat(getComputedStyle(node.closest('label').querySelector('span')).fontSize)>=14),true,'production labels remain readable');
  assert.equal(await page.locator('#webResetEntry').isEnabled(),true);
  // A real SDK channel handles the server-shaped update; no native event shortcut is used.
  row={...row,temp_c:31.2,i5:false,i6:true,captured_at:new Date().toISOString(),received_at:new Date().toISOString()};
  const change={ids:[binding.find(b=>b.table==='device_latest').id],data:{schema:'public',table:'device_latest',columns:Object.keys(row).map(name=>({name,type:typeof row[name]==='boolean'?'bool':typeof row[name]==='number'?'float8':typeof row[name]==='object'?'jsonb':'text'})),commit_timestamp:new Date().toISOString(),type:'UPDATE',record:row,old_record:{}}};
  websocket.send(JSON.stringify(join.array?[join.joinRef,null,join.topic,'postgres_changes',change]:{topic:join.topic,event:'postgres_changes',payload:change}));
  await page.waitForFunction(()=>document.getElementById('overviewTemperature').textContent==='31.2',undefined,{timeout:12000}).catch(async error=>{console.error('Realtime diagnostic',await page.evaluate(()=>({temp:e.otemp.textContent,connection:document.getElementById('realtimeDetail').textContent,payload:state.payload})),{join,binding,change});throw error;});
  await page.click('[data-nav="live3d"]');await page.waitForSelector('#flowLiveArt .model-kind-silos.state-running');await screenshot('web-live3d');
  await page.click('[data-nav="connection"]');
  await page.selectOption('#commandTarget','LED2');await page.selectOption('#commandAction','OFF');await page.click('#sendCommand');
  await page.waitForFunction(()=>document.getElementById('commandMessage').textContent.includes('LED2 OFF'));
  const command=requests.find(r=>r.body.operation==='command');assert.equal(command.body.payload,'LED2 OFF');assert.equal(command.auth,'Bearer '+token);
  await page.click('[data-nav="production"]');
  await page.fill('#productionDate',new Date(Date.now()+3600000-86400000).toISOString().slice(0,10));
  await page.fill('#eggStock','4000');await page.fill('#eggSortie','300');
  await page.fill('#mortality','0');
  await page.waitForFunction(()=>document.getElementById('calculatedProduction').textContent.includes('800'));
  assert.equal(await page.locator('#webProductionValidation').getAttribute('data-state'),'valid');
  await page.fill('#mortality','00');
  await page.waitForFunction(()=>document.getElementById('webProductionValidation').dataset.state==='valid');
  assert.equal(await page.locator('#webEquationPrevious').textContent(),'3 500');
  await page.evaluate(()=>elMajdNativeEvent('production_preview',JSON.stringify({request_id:'stale-request',valid:true,eggs:9999,production_rate:99,previous_date:'2000-01-01'})));
  assert.equal(await page.locator('#webEquationPrevious').textContent(),'3 500','late previews do not replace the current stock reference');
  assert.equal(await page.locator('.web-ledger-table').isVisible(),true);
  await screenshot('web-production');
  // Initial stock uses the server's first-record rule rather than showing a misleading equation.
  await page.fill('#eggStock','700');
  await page.waitForFunction(()=>document.getElementById('webOpeningReference').hidden===false);
  assert.equal(await page.locator('.web-production-equation').isVisible(),false);
  assert.match(await page.locator('#calculatedProduction').textContent(),/^0\s/);
  await page.fill('#eggStock','4000');
  await page.waitForFunction(()=>document.getElementById('webOpeningReference').hidden===true&&document.getElementById('webProductionValidation').dataset.state==='valid');
  await page.click('#saveProduction');
  await page.waitForFunction(()=>document.getElementById('productionMessage').textContent.includes('saved')||document.getElementById('productionMessage').textContent.includes('enregistr'));
  assert.equal(requests.some(r=>r.path.endsWith('/rpc/record_daily_production')&&r.body.stock_count===4000&&r.body.target_farm===farm),true);
  assert.equal(await page.locator('#webProductionRows tr').count(),1);
  assert.equal(await page.evaluate(()=>{const button=document.querySelector('[data-web-edit]');button.focus();elMajdNativeEvent('telemetry',JSON.stringify(state.payload));return document.activeElement===button&&button.isConnected;}),true,'live telemetry does not rebuild the ledger or interrupt keyboard focus');
  await page.fill('#webProductionFrom',new Date(Date.now()+3600000+86400000).toISOString().slice(0,10));
  assert.equal(await page.locator('#webProductionExport').isDisabled(),true);
  assert.match(await page.locator('#webProductionRows').textContent(),/Aucune saisie/);
  await page.click('#webClearProductionFilters');
  await page.fill('#webProductionFrom',today);await page.fill('#webProductionTo','2020-01-01');
  assert.match(await page.locator('#webProductionFilterError').textContent(),/date de début/);
  await page.click('#webClearProductionFilters');
  const downloading=page.waitForEvent('download');await page.click('#webProductionExport');const downloaded=await downloading;
  const csv=fs.readFileSync(await downloaded.path(),'utf8');assert.match(csv,/3500/);assert.match(csv,/Stock final/);
  assert.equal(csv.trim().split('\r\n').length,2,'CSV includes only the displayed filtered history rows');
  await page.locator('[data-web-edit="1"]').click();
  assert.equal(await page.locator('#productionDate').isDisabled(),true);
  assert.match(await page.locator('#webEntryTitle').textContent(),/Correction/);
  await page.click('#cancelProductionEdit');
  assert.equal(await page.locator('#productionDate').isDisabled(),false);
  // Reuse original role controls and verify the new ledger mirrors them.
  tableRows.farm_members=[{role:'manager'}];await page.evaluate(()=>ElMajdNative.phase5Action('refresh','{}'));
  await page.waitForFunction(()=>document.querySelectorAll('[data-web-edit]').length===1&&document.querySelectorAll('[data-web-delete]').length===0);
  tableRows.farm_members=[{role:'viewer'}];await page.evaluate(()=>ElMajdNative.phase5Action('refresh','{}'));
  await page.waitForFunction(()=>document.querySelectorAll('[data-web-edit]').length===0);
  assert.equal(await page.locator('#saveProduction').isDisabled(),true);
  tableRows.farm_members=[{role:'owner'}];await page.evaluate(()=>ElMajdNative.phase5Action('refresh','{}'));
  await page.waitForSelector('[data-web-delete="1"]');
  for(const width of [320,390,768,1440]){
   await page.setViewportSize({width,height:1000});
   for(const screen of ['overview','status','live3d','production','configuration','alarms','connection']){
    await page.click(`[data-nav="${screen}"]`);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true,`${screen} fits width ${width}`);
   }
  }
  await page.setViewportSize({width:390,height:844});await page.click('[data-nav="production"]');await screenshot('web-production-mobile');
  assert.equal(await page.locator('#productionForm>.web-calculation').count(),1,'mobile places the calculation before saving');
  await page.setViewportSize({width:390,height:844});await page.click('[data-nav="overview"]');await screenshot('web-mobile');
  await page.reload();await page.waitForFunction(()=>state.cloud&&state.flock===1000);
  assert.equal(await page.locator('#loginView').isVisible(),false,'remembered session restores without a stored password');
  await page.click('[data-nav="connection"]');await page.click('#logoutButton');
  await page.waitForSelector('#loginView:not(.hidden)');
  assert.equal(await page.evaluate(()=>localStorage.getItem('elmajd-flow-web-session')),null);
  assert.equal(await page.locator('.flow-chart-point').count(),0);
  await page.reload();assert.equal(await page.locator('#loginView').isVisible(),true);
  assert.deepEqual(errors,[]);
  console.log('PASS: real browser bridge/SDK login, session restore/logout, scoped reads, Realtime, roles/forms/RPC saves, plain-string commands, local assets and desktop/mobile layouts');
 }finally{await browser.close();server.close();}
})().catch(error=>{console.error(error);server.close();process.exitCode=1;});
