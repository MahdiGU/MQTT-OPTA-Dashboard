/* Android phase 5: uses the authenticated native service for every cloud write. */
(() => {
  const businessDate = () => new Date(Date.now()+3600000).toISOString().slice(0,10);
  const escape = value => String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const uid = () => '10000000-1000-4000-8000-100000000000'.replace(/[018]/g,c=>(+c^crypto.getRandomValues(new Uint8Array(1))[0]&15>>+c/4).toString(16));
  let role='viewer', house='', editing=null, requestId=uid(), busy=false, productionBusy=false, warningC=30, criticalC=33, receiptEditing=null, receiptRows=[], referenceDay=null;
  let previewReady=false,previewRequest=0,previewTimer,flockBusy=false,flockRequestId=uid(),lastSharedData;
  const canEdit=()=>['owner','manager'].includes(role);
  const call=(action,input={})=>{if(native&&state.cloud)window.ElMajdNative.phase5Action(action,JSON.stringify(input));else message('Cloud sign-in is required.');};
  const message=text=>{$('phase5Message').textContent=text;};
  I18n.add({
    'Enter Stock, Sortie and mortality to check saved records.':'Saisissez le stock, la sortie et la mortalité pour vérifier les données enregistrées.',
    'Checking saved records…':'Vérification des données enregistrées…',
    'Enter valid whole numbers between 0 and 2147483647.':'Saisissez des nombres entiers compris entre 0 et 2147483647.',
    'A record already exists on this date. Use Edit.':'Une entrée existe déjà à cette date. Utilisez Modifier.',
    'These values would invalidate a later record.':'Ces valeurs rendraient une entrée ultérieure invalide.',
    'Historical records need complete Stock, Sortie and flock values.':'Les anciennes entrées doivent contenir le stock, la sortie et l’effectif.',
    'Previous stock date':'Date du stock précédent','First record: production is zero.':'Première entrée : la production est égale à zéro.',
    'Preview checked against saved records. Final validation occurs when saving.':'Aperçu vérifié sur les données enregistrées. La validation finale a lieu lors de l’enregistrement.',
    'Gmail configured':'Gmail configuré','Gmail authorization required':'Autorisation Gmail requise',
    'Push sender configured':'Service de notifications configuré',
    'Recovered at':'Rétablie le','Acknowledged at':'Acquittée le',
    'Flock adjustment':'Mouvement d’effectif','Effective date':'Date d’effet','Adjustment category':'Catégorie du mouvement',
    'Count correction':'Correction du comptage','Initial flock':'Effectif initial','Birds received':'Réception de poules','Transfer in':'Transfert entrant','Transfer out':'Transfert sortant','Count reference':'Effectif de référence',
    'Reason / reference':'Motif / référence','Flock movement history':'Historique des mouvements d’effectif',
    'Enter the actual flock after this adjustment. Mortality is recorded in Production. Backdated changes recalculate later rates.':'Saisissez l’effectif actuel après ce mouvement. La mortalité se saisit dans Production. Une date antérieure recalcule les taux suivants.',
    'No flock movements recorded.':'Aucun mouvement d’effectif enregistré.',
    'A correction reason is required.':'Un motif est obligatoire pour corriger l’effectif.',
    'Flock adjustment saved with audit history.':'Mouvement d’effectif enregistré avec historique.',
    'Received birds must increase the current flock.':'Une réception doit augmenter l’effectif actuel.',
    'Transferred birds must decrease the current flock.':'Un transfert sortant doit diminuer l’effectif actuel.',
    'The flock is already initialized. Use a dated adjustment.':'L’effectif est déjà initialisé. Utilisez un mouvement daté.',
    'Adjustment makes a historical flock count invalid.':'Ce mouvement rend un effectif historique invalide.',
    'Production date precedes the initial flock date.':'La date de production précède l’arrivée de l’effectif initial.',
    'Allow notifications in Android settings. Gmail fallback follows the server alarm policy. Force-stopping the app prevents messages until it is reopened.':'Autorisez les notifications dans Android. Le secours Gmail suit la politique d’alarme du serveur. Un arrêt forcé bloque les messages jusqu’à la réouverture.',
  });
  e.configBtn.insertAdjacentHTML('beforebegin',`<label class="field"><span>Effective date</span><input id="flockDate" type="date" required></label><label class="field"><span>Adjustment category</span><select id="flockCategory"><option value="correction">Count correction</option><option value="received">Birds received</option><option value="transfer_in">Transfer in</option><option value="transfer_out">Transfer out</option><option value="initial">Initial flock</option></select></label><label class="field"><span>Reason / reference</span><input id="flockReason" maxlength="500" required></label><p class="p5-section-note">Enter the actual flock after this adjustment. Mortality is recorded in Production. Backdated changes recalculate later rates.</p>`);
  e.configForm.insertAdjacentHTML('beforeend','<h3>Flock movement history</h3><div id="flockHistory"></div>');
  $('flockDate').value=$('flockDate').max=businessDate();e.flockInput.max='2147483647';
  $('flockCategory').onchange=()=>$('flockReason').required=$('flockCategory').value==='correction';
  e.configForm.onsubmit=event=>{event.preventDefault();if(flockBusy||!state.cloud||!canEdit())return;const count=Number(e.flockInput.value);
    if(!Number.isInteger(count)||count<0||count>2147483647||!$('flockDate').value)return;
    if($('flockCategory').value==='correction'&&!$('flockReason').value.trim()){e.configMsg.textContent='A correction reason is required.';return;}
    flockBusy=true;controls();call('flock_adjust',{date:$('flockDate').value,count,category:$('flockCategory').value,note:$('flockReason').value,request_id:flockRequestId});};
  document.head.insertAdjacentHTML('beforeend',`<style>
    .p5-actions{display:flex;flex-wrap:wrap;gap:8px;margin-top:8px}.p5-actions button,.p5-small{padding:9px 12px;border:1px solid var(--line);border-radius:10px;background:white;color:var(--g);font-weight:800}
    .alarm-item{padding:12px;border:1px solid var(--line);border-left:4px solid var(--amber);border-radius:12px;margin:8px 0}.alarm-item.critical{border-left-color:var(--red)}.alarm-item small{display:block;color:var(--muted);margin-top:5px}.p5-shortage{color:var(--red)}.p5-section-note{font-size:.75rem;color:var(--muted)}
    .nav{grid-template-columns:repeat(6,minmax(0,1fr))}.nav button{font-size:.53rem}
    .carton-overview{width:100%;font:inherit;text-align:left;cursor:pointer;position:relative;overflow:hidden}.carton-overview svg{width:72px;height:64px;float:right;margin:-4px -5px 0 4px;transition:transform .25s,color .25s;color:#aab6ac}.carton-overview.available svg{color:var(--g)}.carton-overview:active svg,.carton-overview:hover svg{transform:translateY(-4px) rotate(-3deg)}.carton-overview .tray-extra{opacity:.2;transition:opacity .3s}.carton-overview.available .tray-extra{opacity:1}.carton-entry{padding:12px 0;border-bottom:1px solid var(--line)}
    @media(prefers-reduced-motion:reduce){.carton-overview svg{transition:none;transform:none!important}}
  </style>`);
  document.querySelector('[data-screen="configuration"]').insertAdjacentHTML('beforeend',`
    <section class="panel" id="packagingPanel"><div class="eyebrow">Packaging inventory</div><h3>Empty cartons</h3><div class="quick"><div><span>Received</span><strong id="cartonsReceived">—</strong></div><div><span>Consumed</span><strong id="cartonsConsumed">—</strong></div><div><span>Available</span><strong id="cartonsBalance">—</strong></div></div><p class="p5-section-note" id="packagingReference">The first stock entry is the opening reference. Consumption starts on the next production day. 30 eggs/carton with 10% allowance.</p><p class="p5-section-note" id="packagingShortfall"></p>
    <form id="cartonForm" class="form"><label class="field"><span>Entry date (GMT+1)</span><input type="date" id="receiptDate" required></label><label class="field"><span>Cartons in this entry</span><input type="number" min="1" step="1" id="receiptQuantity" required></label><label class="field"><span>Delivery note</span><input maxlength="500" id="receiptNote"></label><button class="primary" id="receiptSave" disabled>Add to carton stock</button><button type="button" id="cancelReceiptEdit" class="p5-small hidden">Cancel carton edit</button></form><div id="cartonReceipts" class="p5-section-note"></div></section>
    <section class="panel"><div class="eyebrow">Server alarm policy</div><h3>Temperature thresholds</h3><form id="thresholdForm" class="form"><div class="two"><label class="field"><span>Warning °C</span><input id="warningThreshold" type="number" min="-49" max="98" step="0.1" required></label><label class="field"><span>Critical °C</span><input id="criticalThreshold" type="number" min="-48" max="100" step="0.1" required></label></div><button id="thresholdSave" class="primary" disabled>Save thresholds</button></form><p class="p5-section-note">Activation delays and recovery hysteresis follow the approved server policy.</p></section>
    <section class="panel"><button class="p5-small" id="phase5Refresh">Refresh shared data</button><p id="phase5Message" class="message">Sign in to load packaging and alarm settings.</p></section>`);
  const overview=document.querySelector('[data-screen="overview"]');
  overview.querySelector('.kpis').insertAdjacentHTML('beforeend',`<article class="kpi"><div class="kpi-icon">C</div><span>Actual flock</span><strong id="overviewFlock">—</strong><small>Chickens currently in the house</small></article><button type="button" class="kpi carton-overview" id="overviewCartons" aria-label="Open carton inventory"><svg viewBox="0 0 90 75" aria-hidden="true"><g fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"><path d="M9 40 L25 29 H65 L81 40 L76 51 H14 Z"/><path class="tray-extra" d="M10 50 L16 61 H75 L81 50 M12 59 L18 69 H73 L79 59"/><path d="M9 40 H81 M23 42 V50 M38 42 V50 M53 42 V50 M68 42 V50"/></g><g fill="currentColor" opacity=".35"><ellipse cx="28" cy="31" rx="7" ry="10"/><ellipse cx="45" cy="31" rx="7" ry="10"/><ellipse cx="62" cy="31" rx="7" ry="10"/></g></svg><span>Available cartons</span><strong id="overviewCartonCount">—</strong><small>Tap to view or adjust stock</small></button>`);
  overview.appendChild(document.querySelector('.panel.weekly'));
  document.querySelector('[data-screen="status"]').insertAdjacentHTML('afterend',`<section class="screen" data-screen="alarms"><div class="hero"><div><div class="eyebrow">Server monitoring</div><h2>Alarms & history</h2><p>Active conditions, acknowledgements and recovery</p></div></div><section class="panel"><div class="panel-head"><h3>Alarm history</h3><button class="p5-small" id="alarmRefresh">Refresh</button></div><p class="p5-section-note">Acknowledgement stops reminders; recovery clears the condition. Phone push delivery is still being connected.</p><div id="alarmList">Sign in to load alarms.</div></section></section>`);
  document.querySelector('[data-nav="status"]').insertAdjacentHTML('afterend','<button data-nav="alarms"><span class="nav-icon">!</span>Alarms</button>');
  document.querySelectorAll('[data-nav]').forEach(button=>button.onclick=()=>{document.querySelectorAll('[data-nav]').forEach(b=>b.classList.toggle('active',b===button));document.querySelectorAll('.screen').forEach(s=>s.classList.toggle('active',s.dataset.screen===button.dataset.nav));scrollTo({top:0,behavior:'smooth'});if(button.dataset.nav==='overview')requestAnimationFrame(drawWeek);});
  document.querySelector('[data-screen="connection"]').insertAdjacentHTML('afterbegin',`<section class="panel"><div class="eyebrow">Phone notifications</div><h3>Firebase push</h3><p id="pushStatus" class="message">Sign in to register this phone.</p><div class="p5-actions"><button id="retryPush">Register / retry</button><button id="testPush">Send me a test notification</button></div><p class="p5-section-note">Allow notifications in Android settings. Gmail fallback follows the server alarm policy. Force-stopping the app prevents messages until it is reopened.</p></section>`);
  $('retryPush').onclick=()=>call('push_sync');$('testPush').onclick=()=>{message('Requesting a push test...');call('push_test');};
  $('pushStatus').insertAdjacentHTML('afterend','<p id="channelStatus" class="p5-section-note"></p>');
  document.querySelector('[data-screen="alarms"] .p5-section-note').textContent='Acknowledgement stops reminders; recovery clears the condition. Check Connection for this phone’s push registration status.';
  $('overviewCartons').onclick=()=>{document.querySelector('[data-nav="configuration"]').click();$('packagingPanel').scrollIntoView({behavior:'smooth',block:'start'});};
  e.prodBtn.insertAdjacentHTML('afterend','<button type="button" class="p5-small hidden" id="cancelProductionEdit">Cancel edit</button>');
  e.date.value=$('receiptDate').value=businessDate(); e.date.max=$('receiptDate').max=businessDate();
  e.date.previousElementSibling.textContent='Production date (fixed GMT+1)';
  document.querySelectorAll('[data-sensor]').forEach(b=>{b.setAttribute('aria-description','Open 24-hour five-minute history');});
  document.querySelectorAll('.hint').forEach(n=>{if(n.textContent.includes('Tap X'))n.textContent='Edit / owner deletion';if(n.textContent.includes('D0-D3'))n.textContent='Control status only — no rotation feedback';});
  document.querySelector('.dialog-note').textContent='24-hour history from server five-minute aggregates. Gaps mean no valid measurement was recorded.';
  document.querySelectorAll('.overview-meta span,.temp-copy p,.hero p').forEach(n=>{n.innerHTML=n.innerHTML.replaceAll('12-hour','24-hour');});
  function controls(){
    $('receiptSave').disabled=$('thresholdSave').disabled=busy||!state.cloud||!canEdit();
    e.prodBtn.disabled=productionBusy||!state.cloud||!canEdit()||(native&&!previewReady);e.configBtn.disabled=flockBusy||!state.cloud||!canEdit();
    e.send.disabled=!state.cloud||!canEdit();
    $('retryPush').disabled=$('testPush').disabled=!state.cloud||!canEdit();
    document.querySelectorAll('[data-delete]').forEach(b=>b.hidden=role!=='owner');
    document.querySelectorAll('[data-edit-production]').forEach(b=>b.hidden=!canEdit());
    document.querySelectorAll('[data-receipt-edit]').forEach(b=>b.hidden=!canEdit());
    document.querySelectorAll('[data-receipt-delete]').forEach(b=>b.hidden=role!=='owner');
  }
  function cancelEdit(){editing=null;e.date.disabled=false;$('cancelProductionEdit').classList.add('hidden');e.prodBtn.textContent='Calculate and save';e.stock.value=e.sortie.value=e.mortality.value='';e.date.value=businessDate();preview();}
  $('cancelProductionEdit').onclick=cancelEdit;
  const originalRows=renderRows;
  renderRows=data=>{originalRows(data);e.history.querySelectorAll('.production-row').forEach((row,index)=>{
    const item=(window.productionPageRows||state.rows)[index],used=referenceDay&&item.production_date>referenceDay?(item.cartons_used??Math.ceil(item.eggs*1.1/30)):0;row.insertAdjacentHTML('beforeend',`<div><span>Cartons counted</span><strong>${escape(used)}</strong></div><div class="p5-actions"><button type="button" data-edit-production="${item.id}">Edit</button></div>`);
  });controls();};
  e.history.addEventListener('click',event=>{
    const button=event.target.closest('[data-edit-production]');if(!button||!canEdit())return;
    const row=[...state.rows,...(window.productionPageRows||[])].find(r=>String(r.id)===button.dataset.editProduction);if(!row)return;
    editing=row;e.date.value=row.production_date;e.date.disabled=true;e.stock.value=row.stock;e.sortie.value=row.sortie;e.mortality.value=row.mortality;
    e.prodBtn.textContent='Save audited correction';$('cancelProductionEdit').classList.remove('hidden');preview();e.prodForm.scrollIntoView({behavior:'smooth'});
  });
  preview=()=>{
    clearTimeout(previewTimer);previewRequest++;previewReady=false;
    if([e.stock,e.sortie,e.mortality].some(x=>x.value==='')){e.calc.textContent=e.rate.textContent='—';e.remaining.textContent='Enter Stock, Sortie and mortality to check saved records.';controls();return;}
    if(native){
      const values=[e.stock,e.sortie,e.mortality].map(x=>Number(x.value));
      if(!state.cloud||!e.date.value||!values.every(x=>Number.isInteger(x)&&x>=0&&x<=2147483647)){e.calc.textContent=e.rate.textContent='—';e.remaining.textContent='Enter valid whole numbers between 0 and 2147483647.';controls();return;}
      e.calc.textContent=e.rate.textContent='—';e.remaining.textContent='Checking saved records…';controls();
      const input={date:e.date.value,stock:values[0],sortie:values[1],mortality:values[2],request_id:String(previewRequest)};
      if(editing)input.id=editing.id;
      previewTimer=setTimeout(()=>call('production_preview',input),350);return;
    }
    const earlier=state.rows.filter(r=>r.production_date<e.date.value).sort((a,b)=>b.production_date.localeCompare(a.production_date))[0];
    const following=state.rows.filter(r=>r.production_date>e.date.value).sort((a,b)=>a.production_date.localeCompare(b.production_date))[0];
    const base=editing?+editing.chicken_count+ +editing.mortality:following?+following.chicken_count+ +following.mortality:state.flock;
    const eggs=earlier?+e.stock.value+ +e.sortie.value- +earlier.stock:0,remaining=base===null?null:base- +e.mortality.value;
    e.calc.textContent=`${eggs.toLocaleString(I18n.locale())} eggs`;e.rate.textContent=remaining===null||eggs<0||eggs>remaining?'—':remaining?`${(eggs/remaining*100).toFixed(2)}%`:'0.00%';
    e.remaining.textContent=`Preview: ${remaining??'unknown'} chickens • ${Math.ceil(Math.max(0,eggs)*1.1/30)} cartons. Server validates all affected dates.`;
  };
  [e.stock,e.sortie,e.mortality].forEach(x=>x.oninput=preview);e.date.onchange=preview;
  e.prodForm.onsubmit=event=>{
    event.preventDefault();if(!canEdit()||!state.cloud||(native&&!previewReady))return;
    const values=[e.stock,e.sortie,e.mortality].map(x=>x.value===''?NaN:Number(x.value));
    if(!e.date.value||e.date.value>businessDate()||!values.every(x=>Number.isInteger(x)&&x>=0&&x<=2147483647)){e.prodMsg.textContent='Enter valid nonnegative whole numbers and a date no later than today (GMT+1).';return;}
    const input={date:e.date.value,stock:values[0],sortie:values[1],mortality:values[2]};productionBusy=true;e.prodBtn.disabled=true;
    if(editing){input.id=editing.id;call('edit',input);}else if(native)window.ElMajdNative.publishProduction(JSON.stringify(input));
  };
  function cancelReceipt(){receiptEditing=null;$('receiptSave').textContent='Add to carton stock';$('cancelReceiptEdit').classList.add('hidden');$('receiptQuantity').value=$('receiptNote').value='';$('receiptDate').value=businessDate();}
  $('cancelReceiptEdit').onclick=cancelReceipt;
  $('cartonForm').onsubmit=event=>{event.preventDefault();if(busy||!canEdit())return;const n=Number($('receiptQuantity').value);if(!Number.isSafeInteger(n)||n<=0)return;
    busy=true;controls();call(receiptEditing?'receipt_edit':'receipt',{id:receiptEditing?.id,date:$('receiptDate').value,quantity:n,note:$('receiptNote').value,request_id:requestId});};
  $('cartonReceipts').onclick=event=>{
    const edit=event.target.closest('[data-receipt-edit]'),del=event.target.closest('[data-receipt-delete]');
    const row=receiptRows.find(r=>String(r.id)===(edit?.dataset.receiptEdit||del?.dataset.receiptDelete));if(!row||busy)return;
    if(edit&&canEdit()){receiptEditing=row;$('receiptDate').value=row.receipt_date;$('receiptQuantity').value=row.quantity;$('receiptNote').value=row.note;$('receiptSave').textContent='Save carton correction';$('cancelReceiptEdit').classList.remove('hidden');$('cartonForm').scrollIntoView({behavior:'smooth'});}
    if(del&&role==='owner'&&confirm('Delete this carton entry? If it is the opening entry, the next dated entry becomes the reference.')){busy=true;controls();call('receipt_delete',{id:row.id});}
  };
  $('thresholdForm').onsubmit=event=>{event.preventDefault();if(!canEdit())return;const warning=Number($('warningThreshold').value),critical=Number($('criticalThreshold').value);
    if(critical<warning+1){message('Critical threshold must be at least 1 °C above warning.');return;}busy=true;controls();call('thresholds',{house_id:house,warning,critical});};
  $('phase5Refresh').onclick=$('alarmRefresh').onclick=()=>call('refresh');
  document.querySelectorAll('[data-nav]').forEach(button=>button.addEventListener('click',()=>{if(state.cloud)call('refresh');}));
  $('alarmList').onclick=event=>{const b=event.target.closest('[data-ack]');if(!b)return;b.disabled=true;call('ack',{id:b.dataset.ack});};
  function featureData(data){
    lastSharedData=data;
    role=data.role;house=data.house_id;const cartons=data.cartons?.[0];referenceDay=cartons?.reference_date||null;
    const categories={reference:'Count reference',initial:'Initial flock',received:'Birds received',transfer_in:'Transfer in',transfer_out:'Transfer out',correction:'Count correction'};
    $('flockHistory').innerHTML=(data.flock_adjustments||[]).map(a=>`<article class="carton-entry"><strong>${escape(a.effective_date)} · ${I18n.text(categories[a.category]||a.category)}</strong><p>${escape(a.previous_count)} → ${escape(a.new_count)} (${Number(a.delta)>0?'+':''}${escape(a.delta)})</p><p data-user-content>${escape(a.note)}</p></article>`).join('')||I18n.text('No flock movements recorded.');
    if(data.channels)$('channelStatus').textContent=`${I18n.text(data.channels.push_configured?'Push sender configured':'Not configured')} · ${I18n.text(data.channels.gmail_configured?'Gmail configured':'Gmail authorization required')}`;
    $('cartonsReceived').textContent=cartons?.received??0;$('cartonsConsumed').textContent=cartons?.consumed??0;$('cartonsBalance').textContent=cartons?.balance??0;
    $('overviewCartonCount').textContent=Number(cartons?.balance??0).toLocaleString(I18n.locale());$('overviewCartons').classList.toggle('available',Number(cartons?.balance)>0);
    $('overviewCartons').setAttribute('aria-label',`${cartons?.balance??0} cartons available. Open packaging inventory.`);
    $('packagingReference').textContent=referenceDay?`Opening reference: ${referenceDay}. Production consumption starts after this date; 30 eggs/carton with 10% allowance.`:'Add the first stock entry as the opening reference. Consumption starts on the following production day.';
    $('packagingShortfall').textContent=cartons?.shortfall>0?`${cartons.shortfall} cartons of recorded consumption were not covered by available stock. Available cartons remain at zero until a new delivery.`:'';
    receiptRows=data.receipts||[];
    $('cartonReceipts').innerHTML=receiptRows.map(r=>`<article class="carton-entry"><strong>${escape(r.receipt_date)} · ${escape(r.quantity)} cartons</strong>${r.receipt_date===referenceDay?' · Opening reference':''}<p data-user-content>${escape(r.note)}</p><div class="p5-actions"><button data-receipt-edit="${escape(r.id)}">Adjust</button><button data-receipt-delete="${escape(r.id)}">Delete</button></div></article>`).join('')||'<p>No carton entries yet.</p>';
    if(state.rows.length)renderRows(JSON.stringify(state.rows));
    const cfg=data.settings?.[0];if(cfg){warningC=+cfg.warning_c;criticalC=+cfg.critical_c;if(document.activeElement!==$('warningThreshold')&&document.activeElement!==$('criticalThreshold')){$('warningThreshold').value=cfg.warning_c;$('criticalThreshold').value=cfg.critical_c;}}
    const alarms=[...(data.alarms||[])].sort((a,b)=>Number(!!a.resolved_at)-Number(!!b.resolved_at));
    $('alarmList').innerHTML=alarms.map(a=>`<article class="alarm-item ${escape(a.severity)}"><strong>${escape(a.code.replaceAll('_',' '))}</strong><small>${a.resolved_at?'Recovered':a.acknowledged_at?'Active · acknowledged':'Active · acknowledgement needed'} · ${escape(new Date(a.activated_at).toLocaleString(I18n.locale()))}</small>${a.acknowledged_at?`<small>${I18n.text('Acknowledged at')} ${escape(new Date(a.acknowledged_at).toLocaleString(I18n.locale()))}</small>`:''}${a.resolved_at?`<small>${I18n.text('Recovered at')} ${escape(new Date(a.resolved_at).toLocaleString(I18n.locale()))}</small>`:''}${!a.resolved_at&&!a.acknowledged_at?`<div class="p5-actions"><button data-ack="${escape(a.id)}">Acknowledge</button></div>`:''}</article>`).join('')||'<p>No server alarms recorded.</p>';
    message(`Shared data synchronized • ${role}`);controls();
  }
  addEventListener('elmajd-language',()=>{if(lastSharedData)featureData(lastSharedData);});
  const originalEvent=window.elMajdNativeEvent;
  window.elMajdNativeEvent=(type,data)=>{
    originalEvent(type,data);
    if(type==='production_preview'||type==='production_preview_error'){
      try {
        const result=JSON.parse(data);if(result.request_id!==String(previewRequest))return;
        previewReady=type==='production_preview'&&result.valid===true;
        if(previewReady){
          e.calc.textContent=`${Number(result.eggs).toLocaleString(I18n.locale())} eggs`;
          e.rate.textContent=`${Number(result.production_rate).toLocaleString(I18n.locale(),{minimumFractionDigits:2,maximumFractionDigits:2})}%`;
          e.remaining.textContent=`${I18n.text(`Preview: ${result.remaining_flock} chickens • ${result.cartons_used} cartons. Server validates all affected dates.`)} ${result.first_record?I18n.text('First record: production is zero.'):`${I18n.text('Previous stock date')}: ${result.previous_date}.`} ${I18n.text('Preview checked against saved records. Final validation occurs when saving.')}`;
          e.prodMsg.textContent='';
        } else {
          const errors={flock_missing:'Configure the flock first.',flock_not_started:'Production date precedes the initial flock date.',date_exists:'A record already exists on this date. Use Edit.',mortality_exceeds_flock:'Mortality exceeds available flock.',negative_production:'Values exceed the available flock or produce a negative result',production_exceeds_flock:'Values exceed the available flock or produce a negative result',dependent_record_invalid:'These values would invalidate a later record.',historical_incomplete:'Historical records need complete Stock, Sortie and flock values.'};
          e.calc.textContent=e.rate.textContent='—';e.remaining.textContent=I18n.text(errors[result.error]||result.message||'Could not read shared farm data.');
          if(result.affected_date)e.remaining.textContent+=` (${result.affected_date})`;
        }
      }catch{previewReady=false;e.remaining.textContent=I18n.text('Could not read shared farm data.');}
    }
    if(type==='phase5_data'){try{featureData(JSON.parse(data));}catch{message('Could not read shared farm data.');}}
    if(type==='phase5_saved'){busy=false;if(data==='edit'){productionBusy=false;cancelEdit();e.prodMsg.textContent='Correction saved; dependent production and flock recalculated.';}if(['receipt','receipt_edit','receipt_delete'].includes(data)){requestId=uid();cancelReceipt();}message('Saved to the shared database.');controls();}
    if(type==='phase5_saved'&&data==='flock_adjust'){flockBusy=false;flockRequestId=uid();$('flockReason').value='';e.configMsg.textContent='Flock adjustment saved with audit history.';}
    if(type==='phase5_error'){busy=false;productionBusy=false;if(flockBusy){flockBusy=false;e.configMsg.textContent=data;}e.prodBtn.disabled=!state.cloud||!canEdit();message(data);e.prodMsg.textContent=data;$('alarmList').querySelectorAll('[data-ack]').forEach(b=>b.disabled=false);controls();}
    if(type==='production_saved'||type==='production_deleted'){productionBusy=false;cancelEdit();if(state.cloud)call('refresh');}
    if(type==='production_error')productionBusy=false;
    if(type==='cloud_connection'){if(data!=='online'){clearTimeout(previewTimer);previewRequest++;previewReady=false;}controls();if(data==='online')call('refresh');}
    if(type==='production_history')controls();
    if(type==='push_status')$('pushStatus').textContent=data;
    if(type==='open_alarms')document.querySelector('[data-nav="alarms"]').click();
    if(type==='configuration'){
      $('overviewFlock').textContent=Number.isInteger(state.flock)?state.flock.toLocaleString(I18n.locale()):'Not configured';
      const initialized=Number.isInteger(state.flock);$('flockCategory').querySelector('[value="initial"]').disabled=initialized;
      if(!initialized)$('flockCategory').value='initial';else if($('flockCategory').value==='initial')$('flockCategory').value='correction';
      $('flockReason').required=$('flockCategory').value==='correction';
    }
    if(type==='telemetry'){
      const p=JSON.parse(data),source=p.captured_at||p.received_at;
      e.updated.textContent=`Measured: ${source?new Date(source).toLocaleString(I18n.locale()):'time unavailable'} • received: ${p.received_at?new Date(p.received_at).toLocaleTimeString():'—'}`;
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
    c.font='10px system-ui';for(let i=0;i<=4;i++){const y=top+h*i/4;c.strokeStyle='#dce8df';c.beginPath();c.moveTo(left,y);c.lineTo(left+w,y);c.stroke();c.fillStyle='#718179';c.fillText((high-(high-low)*i/4).toFixed(sensor==='temp'?1:2),0,y+3);c.fillText(new Date(from+(to-from)*i/4).toLocaleTimeString(I18n.locale(),{hour:'2-digit',minute:'2-digit'}),Math.min(left+w-28,left+w*i/4),box.height-10);}
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
  if(native){e.otemp.textContent=e.temp.textContent='—';e.updated.textContent='Waiting for a live measurement';e.otempStatus.textContent=e.tempStatus.textContent='Waiting for a live measurement';e.volts.textContent=e.ovolts.textContent='—';document.querySelectorAll('.equipment').forEach(n=>{n.classList.remove('full');n.querySelector('.equipment-state').textContent='UNKNOWN';});document.querySelectorAll('.fan-card').forEach(n=>{n.classList.remove('on');n.querySelector('small').textContent='Unknown control state';});$('coolingPad').classList.remove('on');$('coolingPadState').textContent='UNKNOWN';$('coolingPadDescription').textContent='Waiting for auxiliary feedback';controls();}
  else if(location.search.includes('preview'))featureData({role:'owner',house_id:'preview',settings:[{warning_c:30,critical_c:33}],cartons:[{received:1000,consumed:780,balance:220}],receipts:[],alarms:[]});
})();
