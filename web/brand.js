/* ElMAJD's owner-supplied logo and web identity. No cloud/data behavior changes. */
(() => {
  const t=key=>I18n.text(key);
  document.documentElement.dataset.brand='elmajd';
  document.querySelector('meta[name="theme-color"]').content='#111316';
  document.title='ElMAJD Automation · Dashboard';
  I18n.add({'Farm supervision':'Supervision avicole','Operations workspace':'Espace de supervision','ElMAJD Automation logo':'Logo ElMAJD Automation','Delayed':'Données retardées'});
  I18n.add({'Feed silos':'Silos d’aliment','Feed silo 1':'Silo d’aliment 1','Feed silo 2':'Silo d’aliment 2','Alveole silo 1':'Silo d’aliment 1','Alveole silo 2':'Silo d’aliment 2'});
  document.querySelector('#siloGrid').closest('.panel').querySelector('h3').textContent='Feed silos';
  for(const [key,label] of [['I5','Feed silo 1'],['I6','Feed silo 2']]){NAMES[key]=label;document.querySelector('#asset-'+key+' .equipment-name').textContent=label;}
  document.querySelectorAll('.identity img,.login-brand img,.web-product-brand img').forEach(image=>{
    image.src='elmajd-logo.png';image.alt=t('ElMAJD Automation logo');image.width=2172;image.height=724;
  });
  const favicon=document.querySelector('link[rel="icon"]');if(favicon){favicon.type='image/png';favicon.href='elmajd-logo.png';}
  const label=document.createElement('span');label.className='brand-sidebar-caption';label.textContent='Farm supervision';
  document.querySelector('.identity').append(label);
  const workspace=document.querySelector('.web-workspace .web-kicker');if(workspace)workspace.textContent='Operations workspace';
  // Decorative step numbers and link arrows aren't needed in the new visual hierarchy.
  document.querySelectorAll('#webConfigureFlock [aria-hidden],#webProductionExport [aria-hidden]').forEach(node=>node.remove());
  document.querySelectorAll('.flow-explore>span[aria-hidden]').forEach(node=>node.remove());
  const scroller=document.querySelector('.web-ledger-scroll');
  if(scroller)new ResizeObserver(()=>scroller.closest('.web-ledger').classList.toggle('web-ledger-has-scroll',scroller.scrollWidth>scroller.clientWidth+1)).observe(scroller);
  I18n.render();
})();
