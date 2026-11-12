/* FLOW architectural view. All states come from the existing validated live-3D adapter. */
(() => {
 const api=window.ElMajdLive3D;if(!api)return;
 I18n.add({'Architectural view':'Vue du bâtiment','Free 3D view':'Vue 3D libre','Explore the 3D house':'Explorer la vue 3D','View history':'Voir l’historique'});
 const escape=value=>String(value).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const flowSignals={fans:Array(8).fill(null),chains:Array(12).fill(null),silos:Array(2).fill(null),water:Array(3).fill(null),pads:Array(2).fill(null)};
 const ids={fans:'fan',chains:'feed',silos:'silo',water:'cistern',pads:'pad'};
 const itemId=(kind,index)=>ids[kind]+'-'+index;
 let current=api.snapshot(),selectedItem=null,mode='architecture',pending=false;
 const screen=document.querySelector('[data-screen="live3d"]'),model=screen.querySelector('.live3d-model');
 const toolbar=document.createElement('div');toolbar.className='flow-view-modes';toolbar.setAttribute('role','group');toolbar.setAttribute('aria-label',I18n.text('Camera view'));toolbar.innerHTML='<button type="button" data-flow-mode="architecture" aria-pressed="true">Architectural view</button><button type="button" data-flow-mode="free" aria-pressed="false">Free 3D view</button>';
 const stage=document.createElement('section');stage.id='flowLiveArt';stage.className='flow-live-art';stage.setAttribute('aria-label',I18n.text('3D house'));
 model.before(toolbar,stage);
 function setMode(value){mode=value==='free'?'free':'architecture';stage.hidden=mode!=='architecture';model.hidden=mode==='architecture';toolbar.querySelectorAll('button').forEach(button=>button.setAttribute('aria-pressed',String(button.dataset.flowMode===mode)));api.setIllustrated(mode==='architecture');schedule();}
 toolbar.querySelectorAll('button').forEach(button=>button.onclick=()=>setMode(button.dataset.flowMode));
const flowFanGeometry=[{x:302,y:282},{x:382,y:282},{x:505,y:307},{x:589,y:307},{x:505,y:226},{x:589,y:226},{x:718,y:282},{x:793,y:282}];
const flowChainGeometry=[{back:[334,402],front:[221,745]},{back:[491,402],front:[454,745]},{back:[650,402],front:[691,745]},{back:[796,402],front:[894,745]}];
function flowSelected(){return selectedItem;}
function flowModelItem(kind,index){
 const id=itemId(kind,index),item=current.equipment.find(value=>value.id===id),status=current.statuses[id]||'unavailable';
 const label=document.querySelector('[data-live3d-item="'+id+'"] .live3d-item-state')?.textContent||I18n.text('No recent data');
 const title=item?.kind==='feed'?I18n.text('Row '+item.row)+' · '+I18n.text('Level '+item.level):I18n.text(item?.title||'Egg depot');
 return {title,state:label,on:status==='running',known:status!=='unavailable',status};
}
function flowSvgGroup(kind,index,phone,interactive,selected){const item=flowModelItem(kind,index);return 'class="flow-model-part model-kind-'+kind+' '+(item.on?'is-on':'is-off')+' state-'+item.status+' '+(selected?.kind===kind&&selected.index===index?'is-selected':'')+'"'+(interactive?' data-flow-select="'+kind+'" data-flow-index="'+index+'" role="button" tabindex="0" aria-label="'+escape(item.title+' · '+item.state)+'"':'');}
function flowModelOverlay(phone,interactive=true){
 const selected=interactive?flowSelected(phone):null,prefix=`flow-${interactive?'stage':'overview'}-${phone}`;
 const chains=flowChainGeometry.map((row,r)=>[0,1,2].map(level=>{
   const index=r*3+level,depth=2-level,start=[row.back[0],row.back[1]+depth*18],end=[row.front[0],row.front[1]+depth*67];
   const path=`M${start[0]} ${start[1]} L${end[0]} ${end[1]}`,on=!!flowSignals.chains[index];
   return `<g ${flowSvgGroup('chains',index,phone,interactive,selected)}><title>${escape(flowModelItem('chains',index).title+' · '+flowModelItem('chains',index).state)}</title><path class="flow-chain-hit" d="${path}"/><path class="flow-chain-selected" d="${path}"/><path class="flow-chain-rail" d="${path}"/><path class="flow-chain-track" d="${path}"/><path class="flow-chain-links" d="${path}"/><circle class="flow-chain-drive" cx="${end[0]}" cy="${end[1]}" r="9"/><path class="flow-drive-cross" d="M${end[0]-4} ${end[1]}h8m-4-4v8"/></g>`;
 }).join('')).join('');
 const fans=flowFanGeometry.map((position,n)=>{
   const on=flowSignals.fans[n]!==0;
   return `<g ${flowSvgGroup('fans',n,phone,interactive,selected)} transform="translate(${position.x} ${position.y})"><title>${escape(flowModelItem('fans',n).title+' · '+flowModelItem('fans',n).state)}</title><rect class="flow-fan-halo" x="-4" y="-4" width="84" height="84" rx="6"/><rect class="flow-fan-frame" width="76" height="76" rx="4"/><rect x="5" y="5" width="66" height="66" rx="2" fill="#5b6770"/>${on?`<circle cx="38" cy="38" r="31" fill="#303b42"/><g class="flow-fan-rotor"><path d="M38 34C14 23 21 8 30 11c11 4 16 14 8 23Zm4 4c11-24 26-17 23-8-4 11-14 16-23 8Zm-4 4c24 11 17 26 8 23-11-4-16-14-8-23Zm-4-4C23 62 8 55 11 46c4-11 14-16 23-8Z" fill="#c1cdd2" stroke="#9aabb4" stroke-width="1.2"/></g><circle cx="38" cy="38" r="7" fill="#9baeb8"/>`:`<rect class="flow-closed-shutters" x="5" y="5" width="66" height="66" fill="#b9c8d0"/>${Array.from({length:7},(_,s)=>`<path d="M6 ${8+s*9}h64v6H6Z" fill="${s%2?'#b4c2cb':'#c6d2d9'}"/><path d="M6 ${14+s*9}h64" stroke="#728893" stroke-width="1.3"/>`).join('')}`}<circle cx="6" cy="6" r="1.5" fill="#71818a"/><circle cx="70" cy="70" r="1.5" fill="#71818a"/><circle class="flow-fan-led" cx="68" cy="7" r="4"/></g>`;
 }).join('');
 const siloPositions=[{x:929,y:710,w:54,h:116,badgeX:902,badgeY:868},{x:1020,y:684,w:52,h:115,badgeX:1010,badgeY:836}];
 const silos=siloPositions.map((p,n)=>{const on=!!flowSignals.silos[n];return `<g ${flowSvgGroup('silos',n,phone,interactive,selected)}><title>${escape(flowModelItem('silos',n).title+' · '+flowModelItem('silos',n).state)}</title><rect class="flow-silo-hit" x="${p.x-26}" y="${p.y-38}" width="${p.w+52}" height="${p.h+80}" rx="22"/><rect class="flow-silo-window" x="${p.x}" y="${p.y}" width="${p.w}" height="${p.h}" rx="12"/><rect class="flow-silo-contents" x="${p.x+5}" y="${p.y+5}" width="${p.w-10}" height="${p.h-10}" rx="7" fill="url(#${prefix}-grain)"/><path d="M${p.x+10} ${p.y+9}v${p.h-18}" stroke="#ffffff70" stroke-width="3"/><rect class="flow-silo-badge" x="${p.badgeX}" y="${p.badgeY}" width="128" height="39" rx="18"/><text class="flow-silo-label" x="${p.badgeX+64}" y="${p.badgeY+26}" text-anchor="middle">S${n+1} · ${on?'PLEIN':'VIDE'}</text></g>`;}).join('');
 const water=[302,454,607].map((x,n)=>`<g ${flowSvgGroup('water',n,phone,interactive,selected)}><rect class="flow-water-hit" x="${x-7}" y="878" width="137" height="151" rx="13"/><rect class="flow-water-fill" x="${x+18}" y="915" width="79" height="83" rx="8"/><circle class="flow-water-dot" cx="${x+54}" cy="1016" r="7"/></g>`).join('');
 const pads=['112,525 235,357 235,571 112,721','946,357 1008,494 1008,668 946,546'].map((points,n)=>`<g ${flowSvgGroup('pads',n,phone,interactive,selected)}><polygon class="flow-pad-hit" points="${points}"/></g>`).join('');
 return `<svg class="flow-model-overlay" viewBox="0 0 1280 1280" ${interactive?'role="group" aria-label="Équipements et états du bâtiment"':'aria-hidden="true"'}><defs><pattern id="${prefix}-grain" patternUnits="userSpaceOnUse" width="13" height="16"><rect width="13" height="16" fill="#dab56d"/><ellipse cx="4" cy="4" rx="2.5" ry="4" fill="#f0d598" transform="rotate(28 4 4)"/><ellipse cx="10" cy="12" rx="2.5" ry="4" fill="#b48b44" transform="rotate(-25 10 12)"/></pattern></defs><g class="flow-chain-layers">${chains}</g><g class="flow-fan-layers">${fans}</g><g class="flow-water-layers">${water}</g><g class="flow-pad-layers">${pads}</g><g class="flow-silo-layers">${silos}</g></svg>`;
}
function flowModelArt(phone,interactive){return `<div class="flow-model-wrap"><img src="flow-building.png" alt=""><span class="flow-model-state-layer">${flowModelOverlay(phone,interactive)}</span></div>`;}

 function refresh(){
  pending=false;current=api.snapshot();selectedItem=null;
  for(const [kind,prefix] of Object.entries(ids)){flowSignals[kind]=flowSignals[kind].map((_,index)=>{const status=current.statuses[prefix+'-'+index];return status==='running'?1:status==='stopped'?0:null;});if(current.selected?.startsWith(prefix+'-'))selectedItem={kind,index:Number(current.selected.slice(prefix.length+1))};}
  for(const [host,interactive,n] of [[stage,true,1],[document.getElementById('flowOverviewArt'),false,0]]){
   if(!host)continue;
   host.innerHTML=flowModelArt(n,interactive);
   host.dataset.active=String(!e.app.classList.contains('hidden')&&!document.hidden&&host.closest('.screen')?.classList.contains('active'));
   host.querySelectorAll('.model-kind-silos .flow-silo-label').forEach((label,index)=>label.textContent='S'+(index+1)+' · '+(flowSignals.silos[index]===null?'—':I18n.text(flowSignals.silos[index]?'Full':'Empty')));
   // The depot door is a scaled stock illustration, never a fixed photograph of full shelves.
   const svg=host.querySelector('svg.flow-model-overlay'),inventory=current.inventory;
   const fill=inventory?.available?inventory.fill:0,count=fill>0?Math.max(1,Math.ceil(fill*12)):0;
   const trays=Array.from({length:count},(_,index)=>'<rect x="'+(1127+(index%2)*38)+'" y="'+(930-Math.floor(index/2)*22)+'" width="34" height="15" rx="3" fill="#d5b98a" stroke="#8f7955" stroke-width="2"/>').join('');
   svg.insertAdjacentHTML('beforeend','<g '+(interactive?'data-flow-depot="true" role="button" tabindex="0" aria-label="'+escape(I18n.text('Egg depot'))+'"':'')+'><rect x="1120" y="747" width="88" height="219" fill="#59636b" opacity=".97"/>'+trays+'</g>');
  }
  const reading=current.telemetry?.i1,valid=reading&&reading.fault===0&&typeof reading.temp_c==='number'&&Number.isFinite(reading.temp_c);
  if(!valid){e.otemp.textContent=e.temp.textContent='—';e.otempStatus.textContent=e.tempStatus.textContent=I18n.text(reading?.fault?'Sensor fault':'No recent data');e.health.textContent=I18n.text(reading?.fault?'Sensor fault':'No recent data');e.volts.textContent=e.ovolts.textContent='—';e.gauge.style.background='#dce8ed';e.alert.classList.remove('show');}
  else {e.otemp.textContent=reading.temp_c.toFixed(1);e.temp.textContent=reading.temp_c.toFixed(1)+' °C';}
  const history=document.getElementById('flowSelectedHistory');if(history){const item=current.equipment.find(item=>item.id===current.selected);history.hidden=!item||item.kind!=='pad';}
 }
 function schedule(){if(!pending){pending=true;requestAnimationFrame(refresh);}}
 function pick(event){const target=event.target.closest('[data-flow-select],[data-flow-depot]');if(!target||!target.closest('#flowLiveArt'))return;api.select(target.hasAttribute('data-flow-depot')?'egg-depot':itemId(target.dataset.flowSelect,Number(target.dataset.flowIndex)));}
 stage.addEventListener('click',pick);stage.addEventListener('keydown',event=>{if(['Enter',' '].includes(event.key)&&event.target.matches('[data-flow-select],[data-flow-depot]')){event.preventDefault();pick(event);}});
 const history=document.createElement('button');history.type='button';history.id='flowSelectedHistory';history.textContent='View history';history.hidden=true;history.onclick=()=>{const item=api.snapshot().equipment.find(item=>item.id===api.snapshot().selected);if(item)document.querySelector(item.kind==='pad'?'#coolingPad':'#asset-'+item.source)?.click();};screen.querySelector('.live3d-detail-actions').append(history);
 window.addEventListener('elmajd-live3d',schedule);window.addEventListener('elmajd-language',schedule);document.addEventListener('visibilitychange',schedule);
 new MutationObserver(schedule).observe(screen,{attributes:true,attributeFilter:['class']});new MutationObserver(schedule).observe(e.app,{attributes:true,attributeFilter:['class']});
 document.querySelector('[data-nav="overview"]').addEventListener('click',schedule);
 window.FlowArt=Object.freeze({refresh:schedule,setMode});setMode('architecture');refresh();
})();
