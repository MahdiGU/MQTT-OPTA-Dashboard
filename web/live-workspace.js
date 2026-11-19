/* Web equipment workspace: the existing validated adapter remains the source of truth. */
(() => {
  const api=window.ElMajdLive3D,screen=document.querySelector('[data-screen="live3d"]');if(!api||!screen)return;
  const t=key=>I18n.text(key),esc=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  I18n.add({
    'House · equipment view':'Bâtiment avicole · Vue des équipements','Front view':'Vue avant','Show labels':'Afficher les étiquettes','Running':'En marche',
    'Hide labels':'Masquer les étiquettes','Feeding-chain feedback':'Retour de marche des chaînes','Lower':'Bas','Middle':'Milieu','Upper':'Haut',
    'Select an item in the building or the equipment lists.':'Sélectionnez un élément dans le bâtiment ou les listes d’équipements.',
    'Last signal':'Dernier signal','Last measurement':'Dernière mesure','Measurement time':'Heure de mesure','Received':'Reçu',
    '12-hour history':'Historique · 12 h','Latest sample every 5 minutes':'Dernière mesure par intervalle de 5 minutes',
    'No stored history for this equipment.':'Aucun historique enregistré pour cet équipement.',
    'No valid samples in the last 12 hours.':'Aucune mesure valide sur les 12 dernières heures.',
    'History could not be refreshed. Showing previously loaded samples.':'Actualisation de l’historique impossible. Affichage des mesures déjà chargées.',
    'Sample':'Mesure','No sample at this time':'Aucune mesure à cette heure','Equipment lists':'Listes des équipements',
    'Architectural illustration · indicative positions':'Illustration du bâtiment · positions indicatives',
    'Drag to rotate in Free 3D view.':'Passez en vue 3D libre pour tourner le bâtiment.',
    'Select temperature':'Sélectionner la température','Live temperature':'Température en direct',
    'Full / empty sensor only; no measured percentage.':'Capteur plein / vide uniquement ; aucun pourcentage mesuré.',
    'Stock / one-week capacity':'Stock / capacité d’une semaine','History sample':'Mesure historique',
  });
  screen.classList.add('web-live-workspace');
  screen.querySelector('.live3d-heading h2').textContent=t('Live 3D');
  screen.querySelector('.live3d-heading p').textContent=t('House · equipment view');
  const summary=screen.querySelector('.live3d-summary');
  const temp=document.createElement('button');temp.type='button';temp.className='wl-temperature';temp.dataset.wlSelect='temperature';
  temp.innerHTML='<span>'+t('Live temperature')+'</span><strong id="wlTemperature">—</strong><small>I1 · PT100</small>';summary.prepend(temp);
  const modes=screen.querySelector('.flow-view-modes');modes.hidden=true;
  const oldArt=document.getElementById('flowLiveArt'),model=screen.querySelector('.live3d-model'),detail=document.getElementById('live3dDetail');
  const workspace=document.createElement('div');workspace.className='wl-workspace';
  const scene=document.createElement('section');scene.className='wl-scene';scene.setAttribute('aria-label',t('3D house'));
  scene.innerHTML=`<div class="wl-toolbar" role="group" aria-label="${esc(t('Camera view'))}">
    <button type="button" data-wl-view="front" aria-pressed="true">${t('Front view')}</button>
    <button type="button" data-wl-view="top" aria-pressed="false">${t('Top view')}</button>
    <button type="button" data-wl-view="free" aria-pressed="false">${t('Free 3D view')}</button>
    <button type="button" data-wl-reset>${t('Reset view')}</button>
    <button type="button" data-wl-labels aria-pressed="true">${t('Hide labels')}</button></div>
    <div id="wlBuilding" class="wl-building"></div><div class="wl-matrix"><h3>${t('Feeding-chain feedback')}</h3><div class="wl-matrix-grid" role="group" aria-label="${esc(t('Feed chains'))}"></div></div>
    <p class="wl-scene-note">${t('Architectural illustration · indicative positions')}</p>`;
  model.before(workspace);workspace.append(scene,detail);scene.querySelector('#wlBuilding').after(model);
  const lists=document.createElement('details');lists.className='wl-equipment-lists';lists.innerHTML='<summary>'+t('Equipment lists')+'</summary><div class="wl-equipment-content"></div>';
  workspace.after(lists);screen.querySelectorAll('.live3d-picker,.live3d-depot-panel').forEach(node=>lists.lastElementChild.append(node));
  const description=document.createElement('p');description.id='wlSelectedNote';description.className='wl-detail-note';
  const readings=document.createElement('dl');readings.className='wl-readings';
  readings.innerHTML=`<div><dt>${t('Last signal')}</dt><dd id="wlSignal">—</dd></div><div><dt>${t('Measurement time')}</dt><dd id="wlMeasuredAt">—</dd></div><div><dt>${t('Received')}</dt><dd id="wlReceivedAt">—</dd></div>`;
  const history=document.createElement('section');history.className='wl-history';history.setAttribute('aria-labelledby','wlHistoryTitle');
  history.innerHTML=`<h4 id="wlHistoryTitle">${t('12-hour history')}</h4><p class="wl-history-caption">${t('Latest sample every 5 minutes')}</p><div id="wlChart"></div><p id="wlChartStatus" role="status"></p><output id="wlChartReading" aria-live="polite"></output>`;
  detail.querySelector('.live3d-detail-actions').before(description,readings,history);
  const legend=document.createElement('div');legend.className='wl-legend';legend.innerHTML=`<span data-color="running">${t('Running confirmed')} / ${t('Full')}</span><span data-color="stopped">${t('Stopped')} / ${t('Empty')}</span><span data-color="cooling">${t('Cooling active')}</span><span data-color="unavailable">${t('No recent data')}</span>`;detail.append(legend);
  const matrix=scene.querySelector('.wl-matrix-grid');
  matrix.innerHTML='<span></span>'+[1,2,3].map((n)=>'<span class="wl-level">E'+n+' · '+t(['Lower','Middle','Upper'][n-1])+'</span>').join('')+Array.from({length:4},(_,r)=>'<strong>'+t('Row '+(r+1))+'</strong>'+[0,1,2].map(l=>`<button type="button" data-wl-select="feed-${r*3+l}" data-state="unavailable" aria-pressed="false"><i></i><span>—</span></button>`).join('')).join('');
  let view='front',labels=true,selected='silo-0',lastApiSelection=null,scheduled=false,lastChartKey='',historyError=false;
  const building=scene.querySelector('#wlBuilding');
  const equipment=api.snapshot().equipment;
  const name=item=>item.kind==='feed'?t('Row '+item.row)+' · '+t('Level '+item.level):t(item.title);
  function group(id,body){const item=equipment.find(item=>item.id===id);return `<g class="wl-part wl-${item.kind}" data-wl-select="${id}" data-state="unavailable" role="button" tabindex="0" aria-label="${esc(name(item))}" aria-pressed="false"><title>${esc(name(item))}</title>${body}</g>`;}
  const label=(x,y,text,width=80)=>`<g class="wl-label"><rect x="${x-width/2}" y="${y-21}" width="${width}" height="30" rx="8"/><text x="${x}" y="${y}">${esc(text)}</text></g>`;
  function fan(x,y,n){return group('fan-'+n,`<g transform="translate(${x} ${y})"><rect class="wl-selection" x="-5" y="-5" width="76" height="76" rx="6"/><rect width="66" height="66" rx="4" fill="url(#wlSteel)" stroke="#70838e" stroke-width="2"/><rect x="5" y="5" width="56" height="56" rx="3" fill="#33434d"/>
    <g class="wl-fan-open"><circle cx="33" cy="33" r="25" fill="#28343c"/><g class="wl-rotor"><path d="M33 30C12 21 19 6 27 11c9 5 13 13 6 19Zm3 3c9-21 24-14 19-6-5 9-13 13-19 6Zm-3 3c21 9 14 24 6 19-9-5-13-13-6-19Zm-3-3C21 54 6 47 11 39c5-9 13-13 19-6Z" fill="#c9d5da"/></g><circle cx="33" cy="33" r="6" fill="#94a8b1"/></g>
    <g class="wl-fan-closed"><rect x="5" y="5" width="56" height="56" fill="#bccad1"/>${Array.from({length:7},(_,i)=>`<path d="M6 ${7+i*8}h54v6H6Z" fill="url(#wlSteel)" stroke="#8298a3" stroke-width=".8"/>`).join('')}</g><circle class="wl-signal" cx="59" cy="7" r="4"/>${label(33,-12,'V'+(n+1),42)}</g>`);}
  function tank(x,n){return group('cistern-'+n,`<g transform="translate(${x} 768)"><ellipse cx="48" cy="112" rx="61" ry="10" fill="#39454a18"/><rect x="-5" y="99" width="110" height="14" rx="2" fill="#c3a26e"/><path d="M0 7 12 0h85l9 7v94H0Z" fill="url(#wlTank)" stroke="#a8b7bd" stroke-width="2"/><rect class="wl-water" x="7" y="24" width="91" height="70" rx="5"/><path d="M0 7h106M0 31h106M0 54h106M0 77h106M0 99h106M7 7v92M31 7v92M57 7v92M82 7v92M101 7v92" fill="none" stroke="#72848c" stroke-width="2.7"/><ellipse cx="53" cy="5" rx="13" ry="4" fill="#3b454b"/>${label(52,133,'C'+(n+1),55)}<circle class="wl-signal" cx="53" cy="91" r="5"/><rect class="wl-selection" x="-8" y="-8" width="122" height="125" rx="7"/></g>`);}
  function silo(x,y,n){return group('silo-'+n,`<g transform="translate(${x} ${y})"><ellipse cx="0" cy="220" rx="55" ry="12" fill="#39454a18"/><path d="M-36 125v91m72-91v91m-72 0 72-78m0 78-72-78" stroke="#778a94" stroke-width="5"/><path d="M-45 111 0 165l45-54" fill="url(#wlSteel)" stroke="#8698a2" stroke-width="2"/><rect x="-45" y="-21" width="90" height="138" rx="9" fill="url(#wlSteel)" stroke="#83949c" stroke-width="2"/>${Array.from({length:28},(_,i)=>`<path d="M-44 ${-14+i*4.5}h88" stroke="#81929b" stroke-opacity=".35"/>`).join('')}<path d="M-48-17 0-48 48-17Z" fill="url(#wlSteel)" stroke="#83949c" stroke-width="2"/><ellipse cy="-46" rx="6" ry="3" fill="#bcc7cd"/><rect x="-28" y="7" width="56" height="82" rx="8" fill="#e2e8ec" stroke="#7d929e" stroke-width="3"/><rect class="wl-grain" x="-24" y="11" width="48" height="74" rx="5" fill="url(#wlGrain)"/><rect class="wl-selection" x="-53" y="-54" width="106" height="279" rx="10"/>${label(0,245,'S'+(n+1),115)}<text class="wl-silo-state wl-label" x="0" y="275">—</text></g>`);}
  function cageRow(r){
    const xb=277+r*121,xf=199+r*177.3;let cells='',rails='';
    for(let level=0;level<3;level++){
      const by=409-level*39,fy=756-level*60;
      for(let s=0;s<7;s++){
        const a=s/7,b=(s+1)/7,x1=xb+(xf-xb)*a,x2=xb+(xf-xb)*b,y1=by+(fy-by)*a,y2=by+(fy-by)*b,w1=29+a*20,w2=29+b*20;
        cells+=`<path d="M${x1-w1} ${y1} ${x1+w1} ${y1} ${x2+w2} ${y2} ${x2-w2} ${y2}Z" fill="url(#wlCage)" stroke="#9aa7ad" stroke-width="1"/><use href="#wlHen" transform="translate(${(x1+x2)/2} ${(y1+y2)/2-13}) scale(${.55+a*.4})"/><path d="M${x1-w1} ${y1-18} ${x2-w2} ${y2-25} ${x2+w2} ${y2-25} ${x1+w1} ${y1-18}Z" fill="url(#wlWire)" stroke="#9aa7ad" stroke-width="1"/>`;
      }
      const end=fy-25,start=by-18,id='feed-'+(r*3+level);
      rails+=group(id,`<path class="wl-chain-hit" d="M${xb-30} ${start} ${xf-50} ${end}"/><path class="wl-chain-rail" d="M${xb-30} ${start} ${xf-50} ${end}"/><path class="wl-chain-track" d="M${xb-30} ${start} ${xf-50} ${end}"/><path class="wl-chain-links" d="M${xb-30} ${start} ${xf-50} ${end}"/><circle class="wl-chain-drive wl-signal" cx="${xf-50}" cy="${end}" r="6"/>`);
    }
    return `<g><g class="wl-cage-cells">${cells}<path d="M${xf-48} 755v25m96-25v25" stroke="#7f929d" stroke-width="4"/></g>${rails}${label(xf,753,t('Row '+(r+1)),115)}</g>`;
  }
  function depot(){return group('egg-depot',`<g transform="translate(1000 325)"><path d="M0 24 70 0 170 28v160H0Z" fill="#e5e9ed" stroke="#b7c3ca" stroke-width="2"/><path d="M-10 25 70-9 180 26l-8 10L70 6 0 36Z" fill="url(#wlSteel)"/><rect x="19" y="53" width="132" height="123" fill="#56616a"/><g id="wlTrays"></g><path d="M14 49h142M14 178h142" stroke="#b8c6cc" stroke-width="6"/>${label(80,213,t('Egg depot'),173)}<rect class="wl-selection" x="-12" y="-12" width="192" height="200" rx="6"/><text id="wlDepotCount" class="wl-depot-count" x="80" y="242">—</text></g>`);}
  function frontScene(){return `<svg class="wl-architecture" viewBox="0 0 1200 960" role="group" aria-label="${esc(t('3D house'))}"><defs>
    <linearGradient id="wlSteel"><stop stop-color="#8497a3"/><stop offset=".25" stop-color="#d8e1e6"/><stop offset=".65" stop-color="#e6ecee"/><stop offset="1" stop-color="#859aa7"/></linearGradient>
    <linearGradient id="wlFloor" x2="0" y2="1"><stop stop-color="#d6dce0"/><stop offset="1" stop-color="#eef1f3"/></linearGradient>
    <linearGradient id="wlWall"><stop stop-color="#cdd6dc"/><stop offset="1" stop-color="#edf0f2"/></linearGradient>
    <linearGradient id="wlTank"><stop stop-color="#d2dde2"/><stop offset=".4" stop-color="#f4f7f8"/><stop offset="1" stop-color="#b9c8cf"/></linearGradient>
    <linearGradient id="wlCage" x2="0" y2="1"><stop stop-color="#d4dde1"/><stop offset="1" stop-color="#f4f6f7"/></linearGradient>
    <pattern id="wlWire" width="8" height="8" patternUnits="userSpaceOnUse"><path d="M0 0h8v8" fill="none" stroke="#81959e" stroke-opacity=".5" stroke-width=".8"/></pattern>
    <pattern id="wlGrain" width="9" height="10" patternUnits="userSpaceOnUse"><rect width="9" height="10" fill="#dfbb70"/><ellipse cx="3" cy="3" rx="1.4" ry="2.5" fill="#f7dca6"/><ellipse cx="8" cy="8" rx="1.3" ry="2" fill="#bb8f42"/></pattern>
    <g id="wlHen"><ellipse cx="0" cy="0" rx="12" ry="10" fill="#fffdf2" stroke="#d8d2bf"/><path d="m-10-2-8-8 4 14" fill="#e7dfcc"/><ellipse cx="9" cy="-11" rx="5" ry="7" fill="#fff9e9"/><path d="m7-17 2-5 2 4 3-2v5" fill="#ca5143"/><circle cx="11" cy="-13" r="1" fill="#3b4146"/><path d="m14-11 5 2-5 1M-3 9v7m8-7v7" stroke="#c49552" stroke-width="2"/></g></defs>
    <image href="house-architecture.png" x="-20" y="64" width="1040" height="832" preserveAspectRatio="none"/>
    <g class="wl-base-structure"><path d="M24 820 234 310 818 310 945 820 945 895 24 895Z" fill="#38414b0c"/>
    <path d="M40 824 242 318 810 318 932 824Z" fill="url(#wlFloor)" stroke="#bac6ce" stroke-width="2"/>
    ${Array.from({length:7},(_,i)=>`<path d="M${242-i*29} ${318+i*72}H${810+i*17}" stroke="#bbc6cd" stroke-opacity=".45"/>`).join('')}
    <path d="M240 148 525 57 815 148v172H240Z" fill="url(#wlWall)" stroke="#b0bdc6" stroke-width="2"/>
    ${Array.from({length:26},(_,n)=>`<path d="M${248+n*22} 153v162" stroke="#c2cdd3" stroke-width="1"/>`).join('')}
    <path d="M40 824V650L240 148v172Z" fill="url(#wlWall)" stroke="#acbbc5" stroke-width="3"/>
    <path d="M932 824V650L815 148v172Z" fill="url(#wlWall)" stroke="#acbbc5" stroke-width="3"/>
    <path d="M36 650 238 141 525 49 819 141 936 650" fill="none" stroke="#ccd8e4" stroke-width="11"/></g>
    ${group('pad-0','<path class="wl-pad-surface" d="M62 643 219 244v178L62 756Z"/><path class="wl-air" d="M95 535q80-45 145 0m-105 50q80-45 145 0"/>')}
    ${group('pad-1','<path class="wl-pad-surface" d="M749 246 878 644v112L749 423Z"/><path class="wl-air" d="M714 535q80-45 145 0m-180 50q80-45 145 0"/>')}
    ${[[245,224],[315,224],[430,224],[500,224],[430,147],[500,147],[615,224],[685,224]].map((p,n)=>fan(...p,n)).join('')}
    ${Array.from({length:4},(_,r)=>cageRow(r)).join('')}${[330,465,600].map(tank).join('')}${depot()}${silo(982,630,0)}${silo(1110,630,1)}</svg>`;}
  function topScene(){return `<svg class="wl-plan" viewBox="0 0 1200 960" role="group" aria-label="${esc(t('Top view'))}"><rect x="120" y="80" width="700" height="780" rx="10" fill="#e9edf0" stroke="#bbc7cf" stroke-width="10"/>${[[200,85],[275,85],[400,85],[475,85],[400,160],[475,160],[625,85],[700,85]].map((p,n)=>fan(...p,n)).join('')}
    ${[0,1].map(n=>group('pad-'+n,`<rect class="wl-pad-surface" x="${n?792:128}" y="300" width="20" height="340" rx="6"/>`)).join('')}
    ${[0,1,2,3].map(r=>`<g><rect x="${195+r*142}" y="275" width="85" height="400" rx="5" fill="url(#wlWire)" stroke="#8295a1"/>${[0,1,2].map(l=>group('feed-'+(r*3+l),`<path class="wl-chain-hit" d="M${209+r*142+l*25} 285v380"/><path class="wl-chain-rail" d="M${209+r*142+l*25} 285v380"/><path class="wl-chain-track" d="M${209+r*142+l*25} 285v380"/><path class="wl-chain-links" d="M${209+r*142+l*25} 285v380"/>`)).join('')}${label(237+r*142,710,t('Row '+(r+1)),125)}</g>`).join('')}
    ${[250,435,620].map((x,n)=>group('cistern-'+n,`<rect x="${x}" y="750" width="100" height="80" rx="8" fill="url(#wlTank)" stroke="#8498a2" stroke-width="3"/><rect class="wl-water" x="${x+6}" y="756" width="88" height="68" rx="4"/>${label(x+50,798,'C'+(n+1),50)}<rect class="wl-selection" x="${x-5}" y="745" width="110" height="90" rx="8"/>`)).join('')}${depot()}${silo(950,635,0)}${silo(1090,635,1)}</svg>`;}
  // Reuse front-view definitions in the plan without loading another renderer.
  const frontMarkup=frontScene();
  function drawBuilding(){building.innerHTML=view==='top'?topScene().replace('<rect x="120"',frontMarkup.match(/<defs>[\s\S]*?<\/defs>/)[0]+'<rect x="120"'):frontMarkup;building.classList.toggle('wl-no-labels',!labels);}
  function setView(next){view=next;const free=next==='free';if(free&&selected==='temperature')selected=api.snapshot().selected||'silo-0';window.FlowArt.setMode(free?'free':'architecture');building.hidden=free;model.hidden=!free;scene.querySelectorAll('[data-wl-view]').forEach(b=>b.setAttribute('aria-pressed',String(b.dataset.wlView===next)));if(!free)drawBuilding();schedule();}
  scene.querySelectorAll('[data-wl-view]').forEach(b=>b.onclick=()=>setView(b.dataset.wlView));
  scene.querySelector('[data-wl-reset]').onclick=()=>{if(view==='free')document.getElementById('live3dReset').click();else setView('front');};
  scene.querySelector('[data-wl-labels]').onclick=event=>{labels=!labels;building.classList.toggle('wl-no-labels',!labels);event.currentTarget.setAttribute('aria-pressed',String(labels));event.currentTarget.textContent=t(labels?'Hide labels':'Show labels');};
  function pick(event){const node=event.target.closest('[data-wl-select],[data-live3d-item]');if(!node||!screen.contains(node))return;selected=node.dataset.wlSelect||node.dataset.live3dItem;if(selected!=='temperature'&&!node.dataset.live3dItem)api.select(selected);lastChartKey='';schedule();}
  screen.addEventListener('click',pick);building.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.matches('[data-wl-select]')){event.preventDefault();pick(event);}});
  const number=value=>value===null||value===undefined?'—':Number(value).toLocaleString(I18n.locale());
  const time=value=>Number.isFinite(Date.parse(value))?new Date(value).toLocaleTimeString(I18n.locale(),{hour:'2-digit',minute:'2-digit',second:'2-digit'}):'—';
  const labelState=(item,status)=>status==='unavailable'?t('No recent data'):item.kind==='silo'||item.kind==='cistern'?t(status==='running'?'Full':'Empty'):item.kind==='fan'?t(status==='running'?'Control active':'Control inactive'):item.kind==='pad'?t(status==='running'?'Cooling active':'Stopped'):t(status==='running'?'Running confirmed':'Stopped');
  function update(){
    scheduled=false;const snap=api.snapshot();if(snap.selected!==lastApiSelection){lastApiSelection=snap.selected;if(snap.selected)selected=snap.selected;}
    screen.dataset.wlActive=String(!document.hidden&&screen.classList.contains('active'));
    const reading=snap.telemetry?.i1,tempValue=reading?.fault===0&&typeof reading.temp_c==='number'&&Number.isFinite(reading.temp_c)?reading.temp_c:null;
    document.getElementById('wlTemperature').textContent=tempValue===null?'—':number(tempValue)+' °C';
    screen.querySelectorAll('[data-wl-select]').forEach(node=>{const id=node.dataset.wlSelect,item=equipment.find(i=>i.id===id),status=snap.statuses[id]||'unavailable';node.setAttribute('aria-pressed',String(id===selected));if(!item)return;node.dataset.state=status;node.setAttribute('aria-label',name(item)+' · '+labelState(item,status));const badge=node.querySelector('.wl-silo-state');if(badge)badge.textContent=status==='unavailable'?'—':labelState(item,status);const matrixText=node.matches('button')&&node.querySelector('span');if(matrixText)matrixText.textContent=status==='unavailable'?'—':status==='running'?t('Running'):t('Stopped');});
    const inventory=snap.inventory,trays=document.getElementById('wlTrays');
    if(trays){const count=inventory?.available?Math.ceil(inventory.fill*24):0;trays.innerHTML=Array.from({length:count},(_,n)=>{const x=26+(n%4)*29,y=162-Math.floor(n/4)*18;return `<g><rect x="${x}" y="${y}" width="25" height="10" rx="2" fill="#bf9d6d"/>${[0,1,2].map(e=>`<ellipse cx="${x+5+e*7}" cy="${y}" rx="3" ry="4" fill="#f8e4bb"/>`).join('')}</g>`;}).join('');}
    const stock=document.getElementById('wlDepotCount');if(stock)stock.textContent=number(inventory?.stock)+' / '+number(inventory?.capacity);
    const item=selected==='temperature'?{id:'temperature',kind:'temperature',source:'temp',title:'Temperature'}:equipment.find(i=>i.id===selected);if(!item)return;
    const status=item.kind==='temperature'?(tempValue===null?'unavailable':'running'):snap.statuses[item.id];
    detail.dataset.kind=item.kind;detail.dataset.state=status;document.getElementById('live3dSelectedName').textContent=name(item);
    document.getElementById('live3dSelectedState').textContent=item.kind==='temperature'?(tempValue===null?t('No recent data'):number(tempValue)+' °C'):item.kind==='depot'?document.getElementById('live3dStockState').textContent:labelState(item,status);
    const sourceNotes={temperature:'I1 · PT100 · 0–10 V',cistern:t('Full / empty sensor only; no measured percentage.'),silo:t('Full / empty sensor only; no measured percentage.'),pad:t('Both pads display the same I7 signal. Individual pad faults cannot be distinguished.'),feed:t('Expansion running feedback'),fan:t('Fan state follows the relay or LED control. Rotation feedback is not installed.'),depot:t('Actual flock × 7 eggs · 30 eggs per tray')};
    document.getElementById('live3dSelectedSource').textContent=(item.kind==='feed'?'EXT · ':'')+(item.kind==='temperature'?'I1':item.source)+' · '+(item.kind==='depot'?t('Saved records'):t('Equipment status'));
    description.textContent=sourceNotes[item.kind];
    document.getElementById('wlSignal').textContent=item.kind==='temperature'?number(tempValue):item.kind==='depot'?number(inventory?.stock)+' / '+number(inventory?.capacity):status==='unavailable'?'—':status==='running'?'1':'0';
    document.getElementById('wlMeasuredAt').textContent=item.kind==='depot'?document.getElementById('live3dStockDate').textContent:time(snap.telemetry?.captured_at);
    document.getElementById('wlReceivedAt').textContent=item.kind==='depot'?'—':time(snap.telemetry?.received_at);
    document.getElementById('live3dLevelHistory').classList.toggle('hidden',!['cistern','silo','temperature','pad'].includes(item.kind));
    document.getElementById('live3dOpenProduction').classList.toggle('hidden',item.kind!=='depot');
    document.getElementById('flowSelectedHistory').hidden=true;
    drawHistory(item);
  }
  function schedule(){if(!scheduled){scheduled=true;requestAnimationFrame(update);}}
  let points=[];
  function drawHistory(item){
    const chart=document.getElementById('wlChart'),status=document.getElementById('wlChartStatus'),output=document.getElementById('wlChartReading');
    const sensor=item.kind==='temperature'?'temp':['cistern','silo','pad'].includes(item.kind)?item.source:null;
    const end=Date.now(),start=end-43200000;
    const rows=(state.cloud&&sensor?state.history:[]).filter(row=>Number.isFinite(row.t)&&row.t>=start&&row.t<=end).sort((a,b)=>a.t-b.t);
    const key=JSON.stringify([item.id,rows.map(r=>[r.t,r[sensor]]),historyError,I18n.locale(),Math.floor(end/300000),state.cloud]);if(key===lastChartKey)return;lastChartKey=key;output.textContent='';
    points=rows.filter(row=>typeof row[sensor]==='number'&&Number.isFinite(row[sensor])&&(sensor==='temp'||row[sensor]===0||row[sensor]===1));
    status.textContent=historyError?t('History could not be refreshed. Showing previously loaded samples.'):!sensor?t('No stored history for this equipment.'):!points.length?t('No valid samples in the last 12 hours.'):'';
    history.querySelector('.wl-history-caption').hidden=!sensor;
    if(!points.length){chart.innerHTML='';return;}
    const min=sensor==='temp'?Math.min(...points.map(r=>r[sensor])):0,max=sensor==='temp'?Math.max(...points.map(r=>r[sensor])):1;
    const pad=sensor==='temp'?Math.max(.5,(max-min)*.12):.15,lo=min-pad,hi=max+pad;
    const x=tm=>60+(tm-start)/43200000*280,y=v=>130-(v-lo)/(hi-lo)*100;
    let path='',previous=null;
    for(const row of rows){const valid=points.includes(row);if(!valid){previous=null;continue;}const gap=!previous||row.t-previous.t>450000;path+=(gap?'M':sensor==='temp'?'L':'H')+x(row.t).toFixed(2)+(gap||sensor==='temp'?' '+y(row[sensor]).toFixed(2):'V'+y(row[sensor]).toFixed(2));previous=row;}
    const binaryLabel=value=>t(sensor==='I7'?(value?'Cooling active':'Stopped'):(value?'Full':'Empty'));
    const axis=sensor==='temp'?[lo,(lo+hi)/2,hi]:[0,1];
    chart.innerHTML=`<svg viewBox="0 0 360 177" role="img" aria-label="${esc(name(item)+' · '+t('12-hour history'))}">
      ${axis.map(v=>`<path d="M60 ${y(v)}H340" stroke="#dce2e8" stroke-dasharray="3 4"/><text x="52" y="${y(v)+4}" text-anchor="end">${sensor==='temp'?number(Number(v.toFixed(1))):sensor==='I7'?(v?'ON':'OFF'):binaryLabel(v)}</text>`).join('')}
      ${[0,4,8,12].map(h=>{const tm=start+h*3600000;return `<text x="${x(tm)}" y="159" text-anchor="middle">${new Date(tm).toLocaleTimeString(I18n.locale(),{hour:'2-digit',minute:'2-digit'})}</text>`;}).join('')}
      <path class="wl-history-line ${sensor==='temp'?'is-temperature':sensor==='I7'?'is-cooling':''}" d="${path}"/>${points.map(r=>`<circle cx="${x(r.t)}" cy="${y(r[sensor])}" r="2.8" class="wl-history-dot"><title>${esc(new Date(r.t).toLocaleString(I18n.locale())+' · '+number(r[sensor]))}</title></circle>`).join('')}
      <line id="wlChartCursor" x1="60" x2="60" y1="15" y2="135" hidden/><rect class="wl-chart-hit" x="60" y="15" width="280" height="120" fill="transparent" tabindex="0" role="slider" aria-label="${esc(t('History sample'))}" aria-valuemin="0" aria-valuemax="${points.length-1}" aria-valuenow="0"/>
    </svg>`;
    const hit=chart.querySelector('.wl-chart-hit');let index=0;
    function show(n){index=Math.max(0,Math.min(points.length-1,n));const row=points[index],value=row[sensor],cursor=document.getElementById('wlChartCursor');cursor.removeAttribute('hidden');cursor.setAttribute('x1',x(row.t));cursor.setAttribute('x2',x(row.t));const text=new Date(row.t).toLocaleString(I18n.locale())+' · '+(sensor==='temp'?number(value)+' °C':sensor==='I7'?t(value?'Cooling active':'Stopped'):t(value?'Full':'Empty'));output.textContent=text;hit.setAttribute('aria-valuenow',String(index));hit.setAttribute('aria-valuetext',text);}
    hit.addEventListener('pointermove',event=>{const rect=chart.querySelector('svg').getBoundingClientRect(),tm=start+Math.max(0,Math.min(1,((event.clientX-rect.left)/rect.width*360-60)/280))*43200000;show(points.reduce((best,row,n)=>Math.abs(row.t-tm)<Math.abs(points[best].t-tm)?n:best,0));});
    hit.addEventListener('keydown',event=>{if(['ArrowLeft','ArrowRight','Home','End'].includes(event.key)){event.preventDefault();show(event.key==='Home'?0:event.key==='End'?points.length-1:index+(event.key==='ArrowRight'?1:-1));}});hit.addEventListener('focus',()=>show(index));
  }
  document.getElementById('live3dLevelHistory').onclick=()=>{const item=equipment.find(i=>i.id===selected);document.querySelector(selected==='temperature'?'#tempCard':item?.kind==='pad'?'#coolingPad':'#asset-'+item?.source)?.click();};
  const previous=window.elMajdNativeEvent;window.elMajdNativeEvent=(type,data)=>{previous(type,data);if(type==='history_error')historyError=true;if(type==='history')historyError=false;if(['history','history_error','cloud_connection','cloud_error','production_history','configuration'].includes(type))schedule();};
  window.addEventListener('elmajd-live3d',schedule);
  function translate(){
    const texts=[['.live3d-heading h2','Live 3D'],['.live3d-heading p','House · equipment view'],['.wl-temperature>span','Live temperature'],['[data-wl-view=front]','Front view'],['[data-wl-view=top]','Top view'],['[data-wl-view=free]','Free 3D view'],['[data-wl-reset]','Reset view'],['[data-wl-labels]',labels?'Hide labels':'Show labels'],['.wl-matrix h3','Feeding-chain feedback'],['.wl-scene-note','Architectural illustration · indicative positions'],['.wl-equipment-lists>summary','Equipment lists'],['#wlHistoryTitle','12-hour history'],['.wl-history-caption','Latest sample every 5 minutes']];
    texts.forEach(([selector,key])=>screen.querySelector(selector).textContent=t(key));
    readings.querySelectorAll('dt').forEach((node,n)=>node.textContent=t(['Last signal','Measurement time','Received'][n]));
    matrix.querySelectorAll('.wl-level').forEach((node,n)=>node.textContent='E'+(n+1)+' · '+t(['Lower','Middle','Upper'][n]));
    matrix.querySelectorAll('strong').forEach((node,n)=>node.textContent=t('Row '+(n+1)));
    legend.children[0].textContent=t('Running confirmed')+' / '+t('Full');legend.children[1].textContent=t('Stopped')+' / '+t('Empty');legend.children[2].textContent=t('Cooling active');legend.children[3].textContent=t('No recent data');
  }
  window.addEventListener('elmajd-language',()=>{translate();lastChartKey='';if(view!=='free')drawBuilding();schedule();});
  document.addEventListener('visibilitychange',()=>{screen.dataset.wlActive=String(!document.hidden&&screen.classList.contains('active'));schedule();});new MutationObserver(schedule).observe(screen,{attributes:true,attributeFilter:['class']});
  // A real default item, never a simulated full sensor. No additional cloud polling is introduced.
  drawBuilding();api.select(selected);update();
})();
