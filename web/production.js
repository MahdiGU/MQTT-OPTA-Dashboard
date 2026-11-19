/* Production workspace: preserves the shared form handlers, server preview and permissions. */
(() => {
  const $=id=>document.getElementById(id),t=key=>I18n.text(key);
  const escape=value=>String(value??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const number=value=>value===null||value===undefined||value===''?null:Number.isFinite(Number(value))?Number(value):null;
  const fmt=(value,digits=0)=>number(value)===null?'—':Number(value).toLocaleString(I18n.locale(),{maximumFractionDigits:digits});
  const today=()=>new Date(Date.now()+3600000).toISOString().slice(0,10);
  const date=value=>/^\d{4}-\d{2}-\d{2}$/.test(value||'')?new Date(value+'T12:00:00Z').toLocaleDateString(I18n.locale(),{day:'2-digit',month:'short',year:'numeric',timeZone:'UTC'}):'—';
  const screen=document.querySelector('[data-screen="production"]'),layout=screen.querySelector('.production-layout'),form=e.prodForm;
  I18n.add({
    'Record the day. Understand the result.':'Saisissez la journée. Comprenez le résultat.',
    'Daily entry':'Saisie journalière','New entry':'Nouvelle saisie','Audited correction':'Correction de saisie',
    'Reset entry':'Réinitialiser','Date and quantities':'Date et quantités','Closing egg stock':'Stock d’œufs en fin de journée',
    'Eggs left in the depot after dispatches.':'Œufs restant dans le dépôt après les sorties.',
    'Eggs dispatched':'Sorties d’œufs','Sales, transfers and other eggs taken out today.':'Ventes, transferts et autres sorties de la journée.',
    'Daily mortality':'Mortalité du jour','Birds lost on the selected date. Enter 0 if none.':'Poules perdues à la date choisie. Saisissez 0 si aucune.',
    'Registered flock':'Effectif actuel enregistré','Configure flock':'Configurer l’effectif',
    'Previous egg stock':'Stock d’œufs précédent','Selected day (GMT+1)':'Journée sélectionnée (GMT+1)',
    'Calculation preview':'Aperçu du calcul','Result checked against shared records':'Résultat vérifié sur les données partagées',
    'Complete the three quantities':'Complétez les trois quantités','Checking the entry…':'Vérification de la saisie…',
    'Ready to save':'Prêt à enregistrer','Review the entry':'Vérifiez la saisie','Read-only account':'Compte en lecture seule',
    'Sign in to save':'Connectez-vous pour enregistrer','Saving the entry…':'Enregistrement en cours…',
    'Opening stock reference':'Stock de référence initial','The first entry establishes the stock reference; production is zero.':'La première saisie établit le stock de référence ; la production est égale à zéro.',
    'Calculations account for previous stock, flock and subsequent entries.':'Le calcul tient compte du stock précédent, de l’effectif et des journées suivantes.',
    'Packaging use':'Alvéoles comptabilisées','Final checks when saving.':'Les données seront vérifiées à l’enregistrement.',
    'Latest saved stock':'Dernier stock enregistré','Latest daily performance':'Dernière performance journalière',
    'Mortality · last 7 days':'Mortalité · 7 derniers jours','recorded days':'jours renseignés','recorded day':'jour renseigné','No recorded day':'Aucune journée renseignée',
    'Production ledger':'Registre de production','Review saved days and their calculated results.':'Consultez les journées enregistrées et leurs résultats calculés.',
    'Filter this history page':'Filtrer cette page d’historique','From date':'Du','To date':'Au','Clear filters':'Effacer les filtres',
    'Export selection':'Exporter la sélection','Date (GMT+1)':'Date (GMT+1)','Closing stock':'Stock final',
    'Dispatches':'Sorties','Egg production':'Œufs produits','Rate (%)':'Taux (%)','Flock after mortality':'Effectif après mortalité',
    'Actions':'Actions','Edit entry':'Modifier la saisie','Delete entry':'Supprimer la saisie','No entry matches these dates.':'Aucune saisie ne correspond à ces dates.',
    'No production entries yet. Start with an opening stock reference.':'Aucune saisie pour le moment. Commencez par un stock de référence.',
    'Filters and CSV apply to the displayed history page. Use Older entries for earlier days.':'Les filtres et le CSV portent sur la page affichée. Utilisez « Entrées anciennes » pour remonter dans l’historique.',
    'saved entries':'saisies enregistrées','Correct or delete using your account permissions.':'Les actions disponibles dépendent des droits de votre compte.',
    'Start date must be on or before end date.':'La date de début doit précéder ou correspondre à la date de fin.',
    'Scroll horizontally to see all columns.':'Faites défiler horizontalement pour voir toutes les colonnes.',
    'Shared records':'Données partagées','Save daily entry':'Enregistrer la journée','Save correction':'Enregistrer la correction',
  });
  layout.classList.add('web-production-layout');
  screen.querySelector('.hero p').textContent='Record the day. Understand the result.';
  const performance=screen.querySelector('.flow-performance-link');screen.querySelector('.hero').append(performance);
  const summary=document.createElement('div');summary.id='webProductionSummary';summary.className='web-production-summary';layout.before(summary);
  const heading=document.createElement('div');heading.className='web-entry-heading';
  heading.innerHTML='<div><span class="web-entry-step">01</span><div><div class="eyebrow">Daily entry</div><h3 id="webEntryTitle">New entry</h3></div></div><button type="button" id="webResetEntry">Reset entry</button>';
  form.prepend(heading);
  const dateField=e.date.closest('.field');dateField.classList.add('web-production-date');
  dateField.querySelector('span').textContent='Selected day (GMT+1)';
  const context=document.createElement('div');context.className='web-flock-context';context.innerHTML='<span>Registered flock <strong id="webEntryFlock">—</strong></span><button type="button" id="webConfigureFlock"><span>Configure flock</span> <span aria-hidden="true">↗</span></button>';dateField.after(context);
  $('webConfigureFlock').onclick=()=>document.querySelector('[data-nav="configuration"]').click();
  for(const [input,label,help,kind] of [[e.stock,'Closing egg stock','Eggs left in the depot after dispatches.','stock'],[e.sortie,'Eggs dispatched','Sales, transfers and other eggs taken out today.','dispatch'],[e.mortality,'Daily mortality','Birds lost on the selected date. Enter 0 if none.','mortality']]){
    const field=input.closest('.field');field.classList.add('web-quantity','web-quantity-'+kind);field.querySelector('span').textContent=label;
    input.inputMode='numeric';input.setAttribute('aria-describedby','webHelp-'+kind);
    const helpNode=document.createElement('small');helpNode.id='webHelp-'+kind;helpNode.textContent=help;field.append(helpNode);
  }
  const calculation=document.createElement('aside');calculation.className='panel web-calculation';calculation.setAttribute('aria-labelledby','webCalculationTitle');
  calculation.innerHTML='<div class="web-entry-heading"><div><span class="web-entry-step">02</span><div><div class="eyebrow">Calculation preview</div><h3 id="webCalculationTitle">Calculated production</h3></div></div></div><div class="web-validation" id="webProductionValidation" role="status" aria-live="polite"></div><div class="web-production-equation"><div><span>Closing stock</span><strong id="webEquationStock">—</strong></div><b>+</b><div><span>Dispatches</span><strong id="webEquationSortie">—</strong></div><b>−</b><div><span>Previous egg stock</span><strong id="webEquationPrevious">—</strong><small id="webPreviousStockDate"></small></div></div><p id="webOpeningReference" hidden>Opening stock reference</p>';
  calculation.append(e.calc.closest('.calc'));
  const note=form.querySelector('.note');note.className='web-calculation-note';note.textContent='Calculations account for previous stock, flock and subsequent entries.';calculation.append(note);form.after(calculation);
  const footer=document.createElement('div');footer.className='web-entry-footer';form.insertBefore(footer,e.prodBtn);footer.append(e.prodBtn,$('cancelProductionEdit'),e.prodMsg);
  // On smaller screens, show the checked result before the save button.
  const narrow=matchMedia('(max-width:1049px)');
  function placeCalculation(){if(narrow.matches)form.insertBefore(calculation,footer);else form.after(calculation);}
  narrow.addEventListener('change',placeCalculation);placeCalculation();
  e.prodMsg.setAttribute('role','status');e.prodMsg.setAttribute('aria-live','polite');
  const historyPanel=e.history.closest('.production-history');historyPanel.classList.add('web-ledger');
  historyPanel.querySelector('.panel-head').innerHTML='<div><div class="eyebrow">Shared records</div><h3>Production ledger</h3><p>Review saved days and their calculated results.</p></div><button type="button" id="webProductionExport"><span>Export selection</span> <span aria-hidden="true">↓</span></button>';
  e.history.classList.add('web-history-source');
  const ledger=document.createElement('div');ledger.id='webProductionLedger';
  ledger.innerHTML='<div class="web-ledger-filters" role="group" aria-label="Filter this history page"><label class="field"><span>From date</span><input type="date" id="webProductionFrom"></label><label class="field"><span>To date</span><input type="date" id="webProductionTo"></label><button type="button" id="webClearProductionFilters">Clear filters</button><span id="webProductionCount"></span></div><p id="webProductionHistoryError" role="alert"></p><p id="webProductionFilterError" role="alert"></p><p class="web-table-scroll-hint">Scroll horizontally to see all columns.</p><div class="web-ledger-scroll" tabindex="0" role="region" aria-label="Production ledger"><table class="web-ledger-table"><thead><tr><th scope="col">Date (GMT+1)</th><th scope="col">Closing stock</th><th scope="col">Dispatches</th><th scope="col">Egg production</th><th scope="col">Rate (%)</th><th scope="col">Mortality</th><th scope="col">Flock after mortality</th><th scope="col">Actions</th></tr></thead><tbody id="webProductionRows"></tbody></table></div><p class="web-ledger-scope">Filters and CSV apply to the displayed history page. Use Older entries for earlier days.</p>';
  e.history.after(ledger);const pagination=$('productionOlder').closest('.p5-actions');pagination.classList.add('web-ledger-pagination');historyPanel.append(pagination,$('productionPageStatus'));
  let role='viewer',lastRequest=null,lastResult=null,saving=false,filtered=[];
  const inputs=()=>({date:e.date.value,stock:e.stock.value,sortie:e.sortie.value,mortality:e.mortality.value});
  const sameInput=snapshot=>snapshot&&snapshot.date===e.date.value&&['stock','sortie','mortality'].every(key=>inputs()[key]!==''&&Number(snapshot[key])===Number(inputs()[key]));
  const ownButton=(attribute,id)=>[...e.history.querySelectorAll('['+attribute+']')].find(button=>button.getAttribute(attribute)===String(id));
  function renderSummary(){
    const rows=[...state.rows].filter(row=>row.production_date<=today()).sort((a,b)=>String(b.production_date).localeCompare(String(a.production_date))),latest=rows[0];
    const from=new Date(Date.parse(today()+'T12:00:00Z')-6*86400000).toISOString().slice(0,10);
    const days=rows.filter(row=>row.production_date>=from&&number(row.mortality)!==null);
    summary.innerHTML=[
      ['Latest saved stock',fmt(latest?.stock),latest?date(latest.production_date):t('No recorded day'),'stock'],
      ['Latest daily performance',number(latest?.production_rate)===null?'—':fmt(latest.production_rate,2)+' %',latest?fmt(latest.eggs)+' '+t('Eggs')+' · '+date(latest.production_date):t('No recorded day'),'performance'],
      ['Mortality · last 7 days',days.length?fmt(days.reduce((sum,row)=>sum+Number(row.mortality),0)):'—',days.length+' '+t(days.length===1?'recorded day':'recorded days'),'mortality'],
    ].map(([label,value,context,kind])=>`<article class="web-production-stat stat-${kind}"><span>${t(label)}</span><strong>${escape(value)}</strong><small>${escape(context)}</small></article>`).join('');
    $('webEntryFlock').textContent=fmt(state.flock);
  }
  function renderCalculation(){
    const complete=[e.stock,e.sortie,e.mortality].every(input=>input.value!==''&&input.validity.valid)&&!!e.date.value;
    const match=lastResult&&sameInput(lastRequest),valid=match&&lastResult.valid===true;
    const first=valid&&lastResult.first_record===true;
    const result=lastResult||{};let mode='waiting',label='Complete the three quantities';
    if(!state.cloud){mode='offline';label='Sign in to save';}
    else if(!['owner','manager'].includes(role)){mode='readonly';label='Read-only account';}
    else if(saving){mode='pending';label='Saving the entry…';}
    else if(valid){mode='valid';label='Ready to save';}
    else if(match){mode='invalid';label='Review the entry';}
    else if(complete){mode='pending';label='Checking the entry…';}
    $('webProductionValidation').dataset.state=mode;$('webProductionValidation').textContent=t(label);
    $('webEquationStock').textContent=fmt(e.stock.value);$('webEquationSortie').textContent=fmt(e.sortie.value);
    $('webEquationPrevious').textContent=valid&&!first?fmt(Number(lastRequest.stock)+Number(lastRequest.sortie)-Number(result.eggs)):'—';
    $('webPreviousStockDate').textContent=valid&&!first?date(result.previous_date):'';
    if(valid)e.remaining.textContent=t('Flock after mortality')+' : '+fmt(result.remaining_flock)+' · '+t('Packaging use')+' : '+fmt(result.cartons_used)+'. '+t('Final checks when saving.');
    calculation.querySelector('.web-production-equation').hidden=first;
    $('webOpeningReference').hidden=!first;$('webOpeningReference').textContent=t('The first entry establishes the stock reference; production is zero.');
    $('webEntryTitle').textContent=t(e.date.disabled?'Audited correction':'New entry');
    if(!saving)e.prodBtn.textContent=t(e.date.disabled?'Save correction':'Save daily entry');
    $('webResetEntry').disabled=saving;
  }
  function renderHistory(){
    const rows=(window.productionPageRows||state.rows).slice(0,30),from=$('webProductionFrom').value,to=$('webProductionTo').value;
    const invalid=from&&to&&from>to;
    $('webProductionFilterError').textContent=invalid?t('Start date must be on or before end date.'):'';
    filtered=invalid?[]:rows.filter(row=>(!from||row.production_date>=from)&&(!to||row.production_date<=to));
    $('webProductionCount').textContent=filtered.length+' / '+rows.length+' '+t('saved entries');
    $('webProductionExport').disabled=!filtered.length;
    $('webProductionRows').innerHTML=filtered.map(row=>{
      const edit=ownButton('data-edit-production',row.id),remove=ownButton('data-delete',row.id);
      const canEdit=edit&&!edit.hidden&&!edit.disabled&&state.cloud&&!saving;
      const canDelete=remove&&!remove.hidden&&!remove.disabled&&state.cloud&&!saving;
      return `<tr><th scope="row">${escape(date(row.production_date))}</th><td>${fmt(row.stock)}</td><td>${fmt(row.sortie)}</td><td class="web-eggs-cell">${fmt(row.eggs)}</td><td><span class="web-rate-cell">${fmt(row.production_rate,2)}${number(row.production_rate)===null?'':' %'}</span></td><td>${fmt(row.mortality)}</td><td>${fmt(row.chicken_count)}</td><td class="web-record-actions">${canEdit?`<button type="button" data-web-edit="${escape(row.id)}" aria-label="${t('Edit entry')} ${escape(row.production_date)}">${t('Edit')}</button>`:''}${canDelete?`<button type="button" data-web-delete="${escape(row.id)}" aria-label="${t('Delete entry')} ${escape(row.production_date)}" title="${t('Delete entry')}"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M9 7V4h6v3M6 7l1 14h10l1-14M10 11v6m4-6v6"/></svg></button>`:''}${!canEdit&&!canDelete?'—':''}</td></tr>`;
    }).join('')||`<tr><td colspan="8" class="web-ledger-empty">${t(rows.length?'No entry matches these dates.':'No production entries yet. Start with an opening stock reference.')}</td></tr>`;
  }
  function reset(){lastRequest=null;lastResult=null;renderCalculation();}
  $('webResetEntry').onclick=()=>{if(saving)return;$('cancelProductionEdit').click();reset();};
  for(const input of [e.date,e.stock,e.sortie,e.mortality])for(const type of ['input','change'])input.addEventListener(type,reset);
  form.addEventListener('submit',()=>{if(!e.prodBtn.disabled||!state.cloud||!['owner','manager'].includes(role))return;/* Original handler has already disabled it for a valid save. */if(lastResult?.valid&&sameInput(lastRequest)){saving=true;renderCalculation();renderHistory();}});
  // Android Java bridge methods are read-only. Observe requests without replacing them.
  window.addEventListener('elmajd-production-preview-request',event=>{lastRequest={...event.detail};lastResult=null;renderCalculation();});
  const previous=window.elMajdNativeEvent;
  window.elMajdNativeEvent=(type,data)=>{
    previous(type,data);
    if(type==='phase5_data'){try{role=JSON.parse(data).role||'viewer';}catch{role='viewer';}}
    if(['production_preview','production_preview_error'].includes(type)){
      try{const result=JSON.parse(data);if(lastRequest&&result.request_id===lastRequest.request_id&&sameInput(lastRequest))lastResult=type==='production_preview'?result:{...result,valid:false};}catch{}
    }
    if(['production_saved','production_deleted','production_error','production_delete_error','phase5_error'].includes(type)||(type==='phase5_saved'&&data==='edit')){saving=false;if(['production_error','phase5_error'].includes(type)){lastResult={valid:false};}else if(type!=='production_delete_error'){lastRequest=null;lastResult=null;}}
    if(type==='production_history_error')$('webProductionHistoryError').textContent=data;
    if(type==='production_history')$('webProductionHistoryError').textContent='';
    if(type==='cloud_connection'&&data!=='online'){saving=false;lastRequest=null;lastResult=null;}
    if(['production_history','production_page','production_deleted','production_saved','configuration','phase5_data','cloud_connection'].includes(type))renderSummary();
    if(['production_preview','production_preview_error','production_history','production_page','production_history_error','production_deleted','production_saved','production_error','production_delete_error','configuration','phase5_data','phase5_saved','phase5_error','cloud_connection','cloud_error'].includes(type))renderCalculation();
    if(['production_history','production_page','production_history_error','production_deleted','production_saved','production_error','production_delete_error','configuration','phase5_data','phase5_saved','phase5_error','cloud_connection','cloud_error'].includes(type))renderHistory();
  };
  $('webProductionRows').onclick=event=>{
    const edit=event.target.closest('[data-web-edit]'),remove=event.target.closest('[data-web-delete]');
    if(edit){const original=ownButton('data-edit-production',edit.dataset.webEdit);if(original&&!original.hidden){original.click();reset();form.scrollIntoView({behavior:matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',block:'start'});}}
    else if(remove){const original=ownButton('data-delete',remove.dataset.webDelete);if(original&&!original.hidden)original.click();}
  };
  for(const id of ['webProductionFrom','webProductionTo'])$(id).onchange=renderHistory;
  $('webClearProductionFilters').onclick=()=>{$('webProductionFrom').value=$('webProductionTo').value='';renderHistory();};
  $('webProductionExport').onclick=()=>{
    const french=I18n.language()==='fr',separator=french?';':',';
    const headers=['Date (GMT+1)','Closing stock','Dispatches','Egg production','Rate (%)','Mortality','Flock after mortality'].map(t);
    const rows=filtered.map(row=>[row.production_date,row.stock,row.sortie,row.eggs,row.production_rate,row.mortality,row.chicken_count].map(value=>value===null||value===undefined?'':typeof value==='number'&&french?String(value).replace('.',','):String(value)));
    const csv=[headers,...rows].map(row=>row.map(value=>'"'+String(value).replace(/"/g,'""')+'"').join(separator)).join('\r\n');
    if(document.documentElement.dataset.platform==='android'&&typeof window.ElMajdNative.exportProductionCsv==='function'){
      window.ElMajdNative.exportProductionCsv('\ufeff'+csv,'ElMAJD-production-'+today()+'.csv');return;
    }
    const url=URL.createObjectURL(new Blob(['\ufeff'+csv],{type:'text/csv;charset=utf-8'})),link=document.createElement('a');link.href=url;link.download='ElMAJD-production-'+today()+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  };
  new MutationObserver(renderHistory).observe(e.history,{childList:true,subtree:true,attributes:true,attributeFilter:['hidden','disabled']});
  window.addEventListener('elmajd-language',()=>{renderSummary();renderCalculation();renderHistory();});
  window.addEventListener('elmajd-flow-records',()=>{if(e.app.classList.contains('hidden')){$('webProductionFrom').value=$('webProductionTo').value='';$('webProductionHistoryError').textContent='';lastRequest=lastResult=null;saving=false;role='viewer';}renderSummary();renderHistory();});
  renderSummary();renderCalculation();renderHistory();I18n.render();
})();
