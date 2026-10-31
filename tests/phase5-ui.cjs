const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const root=path.resolve(__dirname,'../app/src/main/assets');
const server=http.createServer((req,res)=>{const name=req.url.split('?')[0]==='/'?'index.html':req.url.split('?')[0].slice(1);const file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'image/png');res.end(fs.readFileSync(file));});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
  try{
    const page=await browser.newPage({viewport:{width:390,height:844}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
    await page.addInitScript(()=>{window.testCalls=[];window.ElMajdNative={hasSavedLogin:()=>false,phase5Action:(a,p)=>testCalls.push([a,JSON.parse(p)]),requestCloudHistory:()=>{},publishProduction:p=>testCalls.push(['create',JSON.parse(p)])};});
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    const data={role:'manager',house_id:'test-house',settings:[{warning_c:30,critical_c:33}],cartons:[{received:100,consumed:20,balance:80}],receipts:[],alarms:[{id:'test-alarm',code:'temperature_critical',severity:'critical',activated_at:new Date().toISOString(),resolved_at:null,acknowledged_at:null}]};
    await page.evaluate(data=>{showApp();elMajdNativeEvent('cloud_connection','online');elMajdNativeEvent('phase5_data',JSON.stringify(data));elMajdNativeEvent('production_history',JSON.stringify([{id:1,production_date:'2026-10-20',stock:1000,sortie:0,mortality:2,eggs:0,chicken_count:998,production_rate:0,cartons_used:0}]));},data);
    await page.click('[data-nav="production"]');assert.equal(await page.locator('[data-delete]').isVisible(),false);
    await page.click('[data-edit-production="1"]');await page.fill('#eggStock','1100');await page.click('#saveProduction');
    assert.equal(await page.evaluate(()=>testCalls.some(([a,p])=>a==='edit'&&p.id===1&&p.stock===1100)),true);
    await page.evaluate(()=>elMajdNativeEvent('phase5_saved','edit'));
    await page.click('[data-nav="configuration"]');await page.fill('#receiptQuantity','100');await page.click('#receiptSave');
    assert.equal(await page.evaluate(()=>testCalls.filter(([a])=>a==='receipt').length),1);assert.equal(await page.locator('#receiptSave').isDisabled(),true);
    await page.evaluate(()=>elMajdNativeEvent('phase5_saved','receipt'));await page.fill('#warningThreshold','31');await page.fill('#criticalThreshold','34');await page.click('#thresholdSave');
    assert.equal(await page.evaluate(()=>testCalls.some(([a,p])=>a==='thresholds'&&p.warning===31&&p.critical===34)),true);
    await page.evaluate(()=>elMajdNativeEvent('phase5_saved','thresholds'));await page.click('[data-nav="status"]');await page.click('[data-ack="test-alarm"]');
    assert.equal(await page.evaluate(()=>testCalls.some(([a,p])=>a==='ack'&&p.id==='test-alarm')),true);
    await page.evaluate(data=>elMajdNativeEvent('phase5_data',JSON.stringify({...data,role:'viewer'})),data);
    await page.click('[data-nav="configuration"]');assert.equal(await page.locator('#receiptSave').isDisabled(),true);assert.equal(await page.locator('#saveConfiguration').isDisabled(),true);
    await page.evaluate(data=>elMajdNativeEvent('phase5_data',JSON.stringify({...data,role:'owner'})),data);await page.click('[data-nav="production"]');
    assert.equal(await page.locator('[data-delete]').isVisible(),true);
    assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),true);
    assert.deepEqual(errors,[]);
    console.log('PASS: edit bridge, manager deletion hidden, carton submit/duplicate prevention, thresholds, alarm acknowledgement, viewer restrictions, owner deletion, 390px layout, no JS errors');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
