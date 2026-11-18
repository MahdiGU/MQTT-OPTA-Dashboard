/* Web-only layout; Android assets and event handlers remain shared. */
(() => {
 const $=id=>document.getElementById(id),t=key=>I18n.text(key);
 // Preserve MQTT protocol values before translating option labels.
 document.querySelectorAll('#commandAction option,#commandTarget option').forEach(option=>option.value=option.value);
 document.documentElement.dataset.platform='web';
 const css=document.createElement('link');css.rel='stylesheet';css.href='desktop.css';document.head.append(css);
 I18n.add({
  'Your farm. A clearer view.':'Votre élevage. Une vision claire.',
  'One workspace for your equipment, production and farm team.':'Un seul espace pour vos équipements, votre production et votre équipe.',
  'Farm operations':'Supervision avicole','Web dashboard':'Tableau de bord web','Live supervision':'Supervision en direct',
  'Secure cloud connection':'Connexion cloud sécurisée','Account':'Compte','Refresh data':'Actualiser les données',
  'Shared with your Android app':'Partagé avec votre application Android',
  'Phone notifications use the Android app. The web dashboard monitors while this tab is open.':'Les notifications téléphoniques utilisent l’application Android. La supervision web fonctionne lorsque cet onglet est ouvert.',
  'Browser monitoring':'Supervision dans le navigateur','Keep this tab open for live readings. Android notifications and server email alerts remain independent.':'Gardez cet onglet ouvert pour les mesures en direct. Les notifications Android et les alertes e-mail du serveur restent indépendantes.',
  'Send a test to my phone':'Envoyer un test sur mon téléphone','Refresh web connection':'Actualiser la connexion web',
  'Password changed. Your web session stays signed in.':'Mot de passe modifié. Votre session web reste connectée.',
  'Initializing secure session…':'Initialisation de la session sécurisée…','Sign out':'Se déconnecter',
 });
 const intro=document.createElement('section');intro.className='web-login-story';
 intro.innerHTML='<div class="web-product-brand"><img src="flow-logo.svg" alt=""><span>ElMAJD <small>AUTOMATION / FLOW</small></span></div><span class="web-kicker">Farm operations</span><h2>Your farm. A clearer view.</h2><p>One workspace for your equipment, production and farm team.</p><div class="web-login-building"><img src="flow-building.png" alt=""></div><div class="web-login-footer"><span>Secure cloud connection</span><span>Shared with your Android app</span></div>';
 $('loginView').prepend(intro);
 document.querySelector('.login-card .note').textContent='Shared with your Android app';
 const toolbar=document.createElement('div');toolbar.className='web-workspace';
 toolbar.innerHTML='<div><span class="web-kicker">Web dashboard</span><strong id="webWorkspaceTitle">Farm operations</strong></div><div class="web-toolbar-actions"><button id="webRefresh" type="button" aria-label="Refresh data">↻</button><span id="webAccount" class="web-user" title="Account">—</span><button type="button" id="webLogout">Sign out</button></div>';
 document.querySelector('.appbar').append(toolbar);$('webLogout').onclick=()=>$('logoutButton').click();
 let refreshBusy=false;
 $('webRefresh').onclick=()=>{if(refreshBusy)return;refreshBusy=true;$('webRefresh').disabled=true;
   ElMajdNative.requestProductionHistory();ElMajdNative.requestConfiguration();ElMajdNative.requestCloudHistory();ElMajdNative.phase5Action('refresh','{}');
   setTimeout(()=>{refreshBusy=false;$('webRefresh').disabled=false;},1500);
 };
 document.addEventListener('elmajd-web-account',event=>{
   const account=event.detail;const value=account?.email||'';$('webAccount').textContent=value?value[0].toUpperCase():'—';$('webAccount').title=value;$('webWorkspaceTitle').textContent=account?.farm||t('Farm operations');
 });
 const note=document.createElement('section');note.className='panel web-browser-note';note.innerHTML='<div class="eyebrow">Browser monitoring</div><p>Keep this tab open for live readings. Android notifications and server email alerts remain independent.</p>';
 document.querySelector('[data-screen="connection"]').prepend(note);
 $('retryPush').textContent='Refresh web connection';$('testPush').textContent='Send a test to my phone';
 const previous=window.elMajdNativeEvent;
 window.elMajdNativeEvent=(type,data)=>{
   previous(type,data);
   if(type==='account_saved'&&data==='password_change')$('accountMessage').textContent=t('Password changed. Your web session stays signed in.');
   if(type==='cloud_session')$('cloudSessionStatus')&&($('cloudSessionStatus').textContent=data);
 };
 // Hide Android-only permission instructions. The test still targets the signed-in user's registered phone.
 const pushPanel=$('pushStatus')?.closest('section');
 if(pushPanel)pushPanel.querySelectorAll('.p5-section-note').forEach(p=>p.textContent='Phone notifications use the Android app. The web dashboard monitors while this tab is open.');
 function charts(){
   const host=$('flowPerformance');if(host.querySelector('.web-production-charts'))return;
   const headings=[...host.querySelectorAll(':scope>.flow-chart-heading')];if(headings.length!==2)return;
   const blocks=headings.map(heading=>[heading,heading.nextElementSibling,heading.nextElementSibling?.nextElementSibling]);
   const grid=document.createElement('div');grid.className='web-production-charts';headings[0].before(grid);
   blocks.forEach(elements=>{const section=document.createElement('section');section.className='web-chart-block';elements.filter(Boolean).forEach(element=>section.append(element));grid.append(section);});
 }
 new MutationObserver(charts).observe($('flowPerformance'),{childList:true});charts();
 // Use fixed GMT+1 for browser production entry, matching the app and server.
 e.date.value=new Date(Date.now()+3600000).toISOString().slice(0,10);
 document.querySelectorAll('.overview-temp>span').forEach(unit=>{if(unit.textContent.trim()==='C')unit.textContent='°C';});
 I18n.render();
})();
