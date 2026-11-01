/* Historical paging keeps the latest dashboard data separate from the visible page. */
(() => {
  I18n.add({'Newer entries':'Entrées récentes','Older entries':'Entrées anciennes','Latest entries':'Dernières entrées','Loading records…':'Chargement des entrées…','Page':'Page','No more records.':'Fin de l’historique.','History refreshed after a change.':'Historique actualisé après une modification.','Measurements':'Mesures','Minimum':'Minimum','Maximum':'Maximum','Production history pages':'Pages de l’historique de production'});
  const $=id=>document.getElementById(id);
  let index=0,cursors=[null],pending=null,request=0,more=false,exhausted=null;
  e.history.insertAdjacentHTML('afterend','<div class="p5-actions" aria-label="Production history pages"><button type="button" id="productionNewer">Newer entries</button><button type="button" id="productionOlder">Older entries</button></div><p id="productionPageStatus" role="status" aria-live="polite"></p>');
  function controls(){
    const rows=window.productionPageRows||state.rows.slice(0,30);
    $('productionNewer').disabled=!!pending||index===0||!state.cloud;
    $('productionOlder').disabled=!!pending||!state.cloud||!rows.length||rows.at(-1)?.production_date===exhausted||!(index===0?state.rows.length>30:more);
    $('productionPageStatus').textContent=pending?I18n.text('Loading records…'):`${I18n.text('Page')} ${index+1} · ${index===0?I18n.text('Latest entries'):(rows[0]?.production_date||'—')+' – '+(rows.at(-1)?.production_date||'—')}`;
  }
  function reset(){request++;pending=null;index=0;cursors=[null];window.productionPageRows=null;more=false;exhausted=null;}
  function load(next){
    if(!native||!state.cloud||pending)return;
    if(next===0){reset();renderRows(JSON.stringify(state.rows));controls();return;}
    const before=next>index?(window.productionPageRows||state.rows.slice(0,30)).at(-1)?.production_date:cursors[next];
    if(!before)return;
    pending={index:next,before,request_id:String(++request)};controls();
    window.ElMajdNative.phase5Action('production_page',JSON.stringify({before,request_id:pending.request_id}));
  }
  $('productionNewer').onclick=()=>load(index-1);$('productionOlder').onclick=()=>load(index+1);
  const original=window.elMajdNativeEvent;
  window.elMajdNativeEvent=(type,data)=>{
    if(['production_saved','production_deleted'].includes(type)||(type==='phase5_saved'&&data==='edit')||(type==='cloud_connection'&&data!=='online'))reset();
    original(type,data);
    if(type==='production_page'||type==='production_page_error'){
      try{
        const result=JSON.parse(data);if(!pending||result.request_id!==pending.request_id)return;
        if(type==='production_page_error'){pending=null;controls();$('productionPageStatus').textContent=result.message;return;}
        if(!Array.isArray(result.rows))throw Error('Invalid history page');
        if(!result.rows.length){exhausted=pending.before;pending=null;more=false;controls();$('productionPageStatus').textContent=I18n.text('No more records.');return;}
        index=pending.index;cursors[index]=pending.before;window.productionPageRows=result.rows;more=result.has_more===true;pending=null;
        renderRows(JSON.stringify(state.rows));
      }catch{pending=null;controls();$('productionPageStatus').textContent=I18n.text('Could not read shared farm data.');return;}
    }
    if(type==='production_history'&&index>0&&!pending)load(index);
    controls();
  };
  addEventListener('elmajd-language',controls);
  document.head.insertAdjacentHTML('beforeend',`<style>
    button{min-height:44px}button:focus-visible,input:focus-visible,select:focus-visible{outline:3px solid #08785c;outline-offset:3px}
    .nav button{font-size:.63rem;min-height:60px}.field input{min-height:44px}
    @media(prefers-reduced-motion:reduce){*,*::before,*::after{animation:none!important;transition:none!important;scroll-behavior:auto!important}}
  </style>`);
  [e.prodMsg,e.configMsg,e.commandMsg,$('pushStatus')].forEach(n=>{n.setAttribute('role','status');n.setAttribute('aria-live','polite');});
  [e.stock,e.sortie,e.mortality,$('receiptQuantity')].forEach(n=>n.max='2147483647');
  const chart=drawChart;
  drawChart=sensor=>{
    chart(sensor);
    const values=state.history.filter(r=>r.t>=Date.now()-86400000&&r.t<=Date.now()&&r[sensor]!==null&&r[sensor]!==undefined&&Number.isFinite(+r[sensor])).map(r=>+r[sensor]);
    const label=values.length?`${I18n.text(NAMES[sensor])}. ${I18n.text('Measurements')}: ${values.length}. ${I18n.text('Minimum')}: ${Math.min(...values)}. ${I18n.text('Maximum')}: ${Math.max(...values)}.`:I18n.text('No valid measurements in the last 24 hours.');
    e.chart.setAttribute('role','img');e.chart.setAttribute('aria-label',label);
  };
  controls();
})();
