const http=require('node:http'),fs=require('node:fs'),path=require('node:path'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright'),root=path.resolve(__dirname,'../app/src/main/assets');
const server=http.createServer((req,res)=>{const name=req.url==='/'?'index.html':req.url.slice(1),file=path.resolve(root,name);if(!file.startsWith(root+path.sep)||!fs.existsSync(file)){res.writeHead(404);res.end();return;}res.setHeader('Content-Type',file.endsWith('.js')?'application/javascript':file.endsWith('.html')?'text/html':'image/png');res.end(fs.readFileSync(file));});
(async()=>{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const browser=await chromium.launch({headless:true,...(process.env.BROWSER_EXECUTABLE?{executablePath:process.env.BROWSER_EXECUTABLE}:{})});
  try{
    const cases=[['2026-03-29T22:30:00Z','2026-03-29','2026-03-23'],['2026-03-29T23:30:00Z','2026-03-30','2026-03-30'],['2026-10-25T22:30:00Z','2026-10-25','2026-10-19'],['2026-10-25T23:30:00Z','2026-10-26','2026-10-26']];
    for(const [at,day,monday] of cases){
      const page=await browser.newPage({timezoneId:'Europe/Berlin'});
      await page.addInitScript(stamp=>{Date.now=()=>stamp;window.ElMajdNative={hasSavedLogin:()=>false};},Date.parse(at));
      await page.goto(`http://127.0.0.1:${server.address().port}/`);
      const actual=await page.evaluate(()=>{state.performance='daily';const daily=productionSeries().at(-1).label;state.performance='weekly';return{date:e.date.value,daily,weekly:productionSeries().at(-1).label,receipt:document.getElementById('receiptDate').value,flock:document.getElementById('flockDate').value};});
      assert.deepEqual(actual,{date:day,daily:day,weekly:'Week of '+monday,receipt:day,flock:day});await page.close();
    }
    console.log('PASS: fixed GMT+1 production/receipt/flock dates and daily/weekly grouping across both Berlin DST transitions');
  }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);server.close();process.exitCode=1;});
