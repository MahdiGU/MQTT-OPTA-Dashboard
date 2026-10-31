/* Android phase 5: uses the authenticated native service for every cloud write. */
(() => {
  const businessDate = () => new Date(Date.now()+3600000).toISOString().slice(0,10);
  const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(+c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>+c/4).toString(16));
  let role='viewer', house='', editing=null, requestId=uid(), busy=false, productionBusy=false, warningC=30, criticalC=33;
  const canEdit=()=>['owner','manager'].includes(role);
  const call=(action,input={})=>{if(native&&state.cloud)window.ElMajdNative.phase5Action(action,JSON.stringify(input));else message('Cloud sign-in is required.');};
  const message=text=>{$('phase5Message').textContent=text;};
  document.head.insertAdjacentHTML('beforeend',`<style>
    .p5-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.p5-actions button,.p5-small{padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:white;color:var(--g);font-weight:800}
    .alarm-item{padding:12px;border:1px solid var(--line);border-left:4px solid var(--amber);border-radius:12px;margin:8px 0}.alarm-item.critical{border-left-color:var(--red)}.alarm-item small{display:block;color:var(--muted);margin-top:5px}.p5-shortage{color:var(--red)}.p5-section-note{font-size:.75rem;color:var(--muted)}
  </style>`);
  document.querySelector('[data-screen="configuration"]').insertAdjacentHTML('beforeend',`
    <section class="panel"><div class="eyebrow">Packaging inventory</div><h3>Empty cartons</h3><div class="quick"><div><span>Received</span><strong id="cartonsReceived">—</strong></div><div><span>Consumed</span><strong id="cartonsConsumed">—</strong></div><div><span>Balance</span><strong id="cartonsBalance">—</strong></div></div><p class="p5-section-note">30 eggs/carton with 10% allowance. A negative balance indicates missing cartons or receipts.</p>
    <form id="cartonForm" class="form"><label class="field"><span>Receipt date (GMT+1)</span><input type="date" id="receiptDate" required></label><label class="field"><span>New cartons received</span><input type="number" min="1" step="1" id="receiptQuantity" required></label><label class="field"><span>Delivery note</span><input maxlength="500" id="receiptNote"></label><button class="primary" id="receiptSave" disabled>Add to carton stock</button></form><div id="cartonReceipts" class="p5-section-note"></div></section>
    <section class="panel"><div class="eyebrow">Server alarm policy</div><h3>Temperature thresholds</h3><form id="thresholdForm" class="form"><div class="two"><label class="field"><span>Warning °C</span><input id="warningThreshold" type="number" min="-49" max="98" step="0.1" required></label><label class="field"><span>Critical °C</span><input id="criticalThreshold" type="number" min="-48" max="100" step="0.1" required></label></div><button id="thresholdSave" class="primary" disabled>Save thresholds</button></form><p class="p5-section-note">Activation delays and recovery hysteresis follow the approved server policy.</p></section>
    <section class="panel"><button class="p5-small" id="phase5Refresh">Refresh shared data</button><p id="phase5Message" class="message">Sign in to load packaging and alarm settings.</p></section>`);
  document.querySelector('[data-screen="status"]').insertAdjacentHTML('afterbegin',`<section class="panel"><div class="panel-head"><div><div class="eyebrow">Server monitoring</div><h3>Alarms & history</h3></div><button class="p5-small" id="alarmRefresh">Refresh</button></div><p class="p5-section-note">Acknowledgement stops reminders; recovery clears the condition. Phone push delivery is still being connected.</p><div id="alarmList">Sign in to load alarms.</div></section>`);
  e.prodBtn.insertAdjacentHTML('afterend','<button type="button" class="p5-small hidden" id="cancelProductionEdit">Cancel edit</button>');
  e.date.value=$('receiptDate').value=businessDate(); e.date.max=$('receiptDate').max=businessDate();
  e.date.previousElementSibling.textContent='Production date (fixed GMT+1)';
  document.querySelectorAll('[data-sensor]').forEach(b=>{b.setAttribute('aria-description','Open 24-hour five-minute history');});
  document.querySelectorAll('.hint').forEach(n=>{if(n.textContent.includes('Tap X'))n.textContent='Edit / owner deletion';if(n.textContent.includes('D0-D3'))n.textContent='Control status only — no rotation feedback';});
  document.querySelector('.dialog-note').textContent='24-hour history from server five-minute aggregates. Gaps mean no valid measurement was recorded.';
  document.querySelectorAll('.overview-meta span,.temp-copy p,.hero p').forEach(n=>{n.innerHTML=n.innerHTML.replaceAll('12-hour','24-hour');});
  function controls(){
    $('receiptSave').disabled=$('thresholdSave').disabled=busy||!state.cloud||!canEdit();
    e.prodBtn.disabled=productionBusy||!state.cloud||!canEdit();e.configBtn.disabled=!state.cloud||!canEdit();
    e.send.disabled=!state.cloud||!canEdit();
    document.querySelectorAll('[data-delete]').forEach(b=>b.hidden=role!=='owner');
    document.querySelectorAll('[data-edit-production]').forEach(b=>b.hidden=!canEdit());
  }
  function cancelEdit(){editing=null;e.date.disabled=false;$('cancelProductionEdit').classList.add('hidden');e.prodBtn.textContent='Calculate and save';e.stock.value=e.sortie.value=e.mortality.value='';e.date.value=businessDate();preview();}
  $('cancelProductionEdit').onclick=cancelEdit;
  const originalRows=renderRows;
  renderRows=data=>{originalRows(data);e.history.querySelectorAll('.production-row').forEach((row,index)=>{
    const item=state.rows[index];row.insertAdjacentHTML('beforeend',`<div><span>Cartons used</span><strong>${escape(item.cartons_used??Math.ceil(item.eggs*1.1/30))}</strong></div><div class="p5-actions"><button type="button" data-edit-production="${item.id}">Edit</button></div>`);
  });controls();};
  e.history.addEventListener('click',event=>{
    const button=event.target.closest('[data-edit-production]');if(!button||!canEdit())return;
    const row=state.rows.find(r=>String(r.id)===button.dataset.editProduction);if(!row)return;
    editing=row;e.date.value=row.production_date;e.date.disabled=true;e.stock.value=row.stock;e.sortie.value=row.sortie;e.mortality.value=row.mortality;
    e.prodBtn.textContent='Save audited correction';$('cancelProductionEdit').classList.remove('hidden');preview();e.prodForm.scrollIntoView({behavior:'smooth'});
  });
  preview=()=>{
    if([e.stock,e.sortie,e.mortality].some(x=>x.value==='')){e.calc.textContent=e.rate.textContent='—';return;}
    const earlier=state.rows.filter(r=>r.production_date<e.date.value).sort((a,b)=>b.production_date.localeCompare(a.production_date))[0];
    const following=state.rows.filter(r=>r.production_date>e.date.value).sort((a,b)=>a.production_date.localeCompare(b.production_date))[0];
    const base=editing?+editing.chicken_count+ +editing.mortality:following?+following.chicken_count+ +following.mortality:state.flock;
    const eggs=earlier?+e.stock.value+ +e.sortie.value- +earlier.stock:0,remaining=base===null?null:base- +e.mortality.value;
    e.calc.textContent=`${eggs.toLocaleString()} eggs`;e.rate.textContent=remaining===null||eggs<0||eggs>remaining?'—':remaining?`${(eggs/remaining*100).toFixed(2)}%`:'0.00%';
    e.remaining.textContent=`Preview: ${remaining??'unknown'} chickens • ${Math.ceil(Math.max(0,eggs)*1.1/30)} cartons. Server validates all affected dates.`;
  };
  [e.stock,e.sortie,e.mortality].forEach(x=>x.oninput=preview);e.date.onchange=preview;
  e.prodForm.onsubmit=event=>{
    event.preventDefault();if(!canEdit()||!state.cloud)return;
    const values=[e.stock,e.sortie,e.mortality].map(x=>x.value===''?NaN:Number(x.value));
    if(!e.date.value||e.date.value>businessDate()||!values.every(x=>Number.isSafeInteger(x)&&x>=0)){e.prodMsg.textContent='Enter valid nonnegative whole numbers and a date no later than today (GMT+1).';return;}
    const input={date:e.date.value,stock:values[0],sortie:values[1],mortality:values[2]};productionBusy=true;e.prodBtn.disabled=true;
    if(editing){input.id=editing.id;call('edit',input);}else if(native)window.ElMajdNative.publishProduction(JSON.stringify(input));
  };
  $('cartonForm').onsubmit=event=>{event.preventDefault();if(busy||!canEdit())return;const n=Number($('receiptQuantity').value);if(!Number.isSafeInteger(n)||n<=0)return;
    busy=true;controls();call('receipt',{date:$('receiptDate').value,quantity:n,note:$('receiptNote').value,request_id:requestId});};
  $('thresholdForm').onsubmit=event=>{event.preventDefault();if(!canEdit())return;const warning=Number($('warningThreshold').value),critical=Number($('criticalThreshold').value);
    if(critical<warning+1){message('Critical threshold must be at least 1 °C above warning.');return;}busy=true;controls();call('thresholds',{house_id:house,warning,critical});};
  $('phase5Refresh').onclick=$('alarmRefresh').onclick=()=>call('refresh');
  document.querySelectorAll('[data-nav]').forEach(button=>button.addEventListener('click',()=>{if(state.cloud)call('refresh');}));
  $('alarmList').onclick=event=>{const b=event.target.closest('[data-ack]');if(!b)return;b.disabled=true;call('ack',{id:b.dataset.ack});};
  function featureData(data){
    role=data.role;house=data.house_id;const cartons=data.cartons?.[0];
    $('cartonsReceived').textContent=cartons?.received??0;$('cartonsConsumed').textContent=cartons?.consumed??0;$('cartonsBalance').textContent=cartons?.balance??0;
    $('cartonsBalance').classList.toggle('p5-shortage',Number(cartons?.balance)<0);
    $('cartonReceipts').innerHTML=(data.receipts||[]).map(r=>`<p>${escape(r.receipt_date)} · +${escape(r.quantity)} cartons · ${escape(r.note)}</p>`).join('')||'<p>No carton receipts yet.</p>';
    const cfg=data.settings?.[0];if(cfg){warningC=+cfg.warning_c;criticalC=+cfg.critical_c;if(document.activeElement!==$('warningThreshold')&&document.activeElement!==$('criticalThreshold')){$('warningThreshold').value=cfg.warning_c;$('criticalThreshold').value=cfg.critical_c;}}
    const alarms=[...(data.alarms||[])].sort((a,b)=>Number(!!a.resolved_at)-Number(!!b.resolved_at));
    $('alarmList').innerHTML=alarms.map(a=>`<article class="alarm-item ${escape(a.severity)}"><strong>${escape(a.code.replaceAll('_',' '))}</strong><small>${a.resolved_at?'Recovered':a.acknowledged_at?'Active · acknowledged':'Active · acknowledgement needed'} · ${escape(new Date(a.activated_at).toLocaleString())}</small>${!a.resolved_at&&!a.acknowledged_at?`<div class="p5-actions"><button data-ack="${escape(a.id)}">Acknowledge</button></div>`:''}</article>`).join('')||'<p>No server alarms recorded.</p>';
    message(`Shared data synchronized • ${role}`);controls();
  }
  const originalEvent=window.elMajdNativeEvent;
  window.elMajdNativeEvent=(type,data)=>{
    originalEvent(type,data);
    if(type==='phase5_data'){try{featureData(JSON.parse(data));}catch{message('Could not read shared farm data.');}}
    if(type==='phase5_saved'){busy=false;if(data==='edit'){productionBusy=false;cancelEdit();e.prodMsg.textContent='Correction saved; dependent production and flock recalculated.';}if(data==='receipt'){requestId=uid();$('receiptQuantity').value=$('receiptNote').value='';}message('Saved to the shared database.');controls();}
    if(type==='phase5_error'){busy=false;productionBusy=false;e.prodBtn.disabled=!state.cloud||!canEdit();message(data);e.prodMsg.textContent=data;$('alarmList').querySelectorAll('[data-ack]').forEach(b=>b.disabled=false);controls();}
    if(type==='production_saved'||type==='production_deleted'){productionBusy=false;cancelEdit();if(state.cloud)call('refresh');}
    if(type==='production_error')productionBusy=false;
    if(type==='cloud_connection'){controls();if(data==='online')call('refresh');}
    if(type==='production_history')controls();
    if(type==='telemetry'){
      const p=JSON.parse(data),source=p.captured_at||p.received_at;
      e.updated.textContent=`Measured: ${source?new Date(source).toLocaleString():'time unavailable'} • received: ${p.received_at?new Date(p.received_at).toLocaleTimeString():'—'}`;
      if(p.i1?.temp_c===null||p.i1?.temp_c===undefined){e.temp.textContent=e.otemp.textContent='—';e.tempStatus.textContent=e.otempStatus.textContent='Temperature unavailable';}
      else {const t=+p.i1.temp_c;e.alert.textContent=`Temperature is at or above ${criticalC} °C`;e.alert.classList.toggle('show',t>=criticalC);e.tempStatus.textContent=e.otempStatus.textContent=t>=criticalC?'Critical temperature':t>=warningC?'Temperature warning':'Below warning threshold';}
      $('coolingPadDescription').textContent=p.inputs.I7===1?'Running — auxiliary contact confirmed':'Not running — auxiliary contact open';
    }
    controls();
  };
  // Chart keeps min/max scaling while explicitly breaking lines across gaps.
  drawChart=sensor=>{
    e.chartTitle.textContent=`${NAMES[sensor]} — last 24 hours`;
    const box=e.chart.getBoundingClientRect();if(box.width<10)return;
    const ratio=devicePixelRatio||1;e.chart.width=box.width*ratio;e.chart.height=box.height*ratio;
    const c=e.chart.getContext('2d');c.scale(ratio,ratio);const from=Date.now()-86400000,to=Date.now();
    const rows=state.history.filter(r=>r.t>=from&&r.t<=to).sort((a,b)=>a.t-b.t),valid=rows.filter(r=>r[sensor]!==null&&r[sensor]!==undefined&&Number.isFinite(+r[sensor]));
    e.chartEmpty.classList.toggle('hidden',valid.length>0);if(!valid.length){e.chartEmpty.textContent='No valid measurements in the last 24 hours.';return;}
    const values=valid.map(r=>+r[sensor]),min=Math.min(...values),max=Math.max(...values),pad=Math.max((max-min)*.12,sensor==='temp'?.5:.1),low=min-pad,high=max+pad;
    const left=44,right=12,top=18,bottom=34,w=box.width-left-right,h=box.height-top-bottom,X=t=>left+(t-from)/86400000*w,Y=v=>top+h-(v-low)/(high-low)*h;
    c.font='10px system-ui';for(let i=0;i<=4;i++){const y=top+h*i/4;c.strokeStyle='#dce8df';c.beginPath();c.moveTo(left,y);c.lineTo(left+w,y);c.stroke();c.fillStyle='#718179';c.fillText((high-(high-low)*i/4).toFixed(sensor==='temp'?1:2),0,y+3);c.fillText(new Date(from+(to-from)*i/4).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'}),Math.min(left+w-28,left+w*i/4),box.height-10);}
    c.strokeStyle=sensor==='temp'?'#e99424':'#3388dc';c.lineWidth=2.5;c.beginPath();let prior=null;
    rows.forEach(row=>{if(row[sensor]===null||row[sensor]===undefined||!Number.isFinite(+row[sensor])){prior=null;return;}const x=X(row.t),y=Y(+row[sensor]);if(!prior||row.t-prior.t>450000)c.moveTo(x,y);else{if(sensor!=='temp')c.lineTo(x,Y(+prior[sensor]));c.lineTo(x,y);}prior=row;});c.stroke();
    c.fillStyle=c.strokeStyle;valid.forEach(r=>{c.beginPath();c.arc(X(r.t),Y(+r[sensor]),2,0,Math.PI*2);c.fill();});
  };
  productionSeries=()=>{
    const today=new Date(`${businessDate()}T00:00:00Z`),dayMs=86400000;
    if(state.performance==='daily')return Array.from({length:14},(_,i)=>{const d=new Date(+today-(13-i)*dayMs),key=d.toISOString().slice(0,10),r=state.rows.find(x=>x.production_date===key);return{label:key,short:key.slice(8),rate:r?+r.production_rate:null,m:r?+r.mortality:0};});
    const monday=+today-((today.getUTCDay()+6)%7)*dayMs;
    return Array.from({length:8},(_,i)=>{const start=new Date(monday-(7-i)*7*dayMs).toISOString().slice(0,10),end=new Date(monday-(6-i)*7*dayMs).toISOString().slice(0,10),rows=state.rows.filter(r=>r.production_date>=start&&r.production_date<end);return{label:`Week of ${start}`,short:start.slice(5),rate:rows.length?rows.reduce((n,r)=>n+ +r.production_rate,0)/rows.length:null,m:rows.reduce((n,r)=>n+ +r.mortality,0)};});
  };
  if(native){e.otemp.textContent=e.temp.textContent='—';e.updated.textContent='Waiting for a live measurement';document.querySelectorAll('.equipment').forEach(n=>{n.classList.remove('full');n.querySelector('.equipment-state').textContent='UNKNOWN';});document.querySelectorAll('.fan-card').forEach(n=>{n.classList.remove('on');n.querySelector('small').textContent='Unknown control state';});$('coolingPad').classList.remove('on');$('coolingPadState').textContent='UNKNOWN';$('coolingPadDescription').textContent='Waiting for auxiliary feedback';controls();}
  else if(location.search.includes('preview'))featureData({role:'owner',house_id:'preview',settings:[{warning_c:30,critical_c:33}],cartons:[{received:1000,consumed:780,balance:220}],receipts:[],alarms:[]});
})();
