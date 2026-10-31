(() => {
  I18n.add({
    'My account':'Mon compte','Change password':'Modifier le mot de passe',
    'Current password':'Mot de passe actuel','New password':'Nouveau mot de passe',
    'Confirm new password':'Confirmer le nouveau mot de passe',
    'Use 12 to 128 characters.':'Utilisez entre 12 et 128 caractères.',
    'Forgot password?':'Mot de passe oublié ?','Recover my account':'Récupérer mon compte',
    'Email address':'Adresse e-mail','Send recovery code':'Envoyer le code de récupération',
    'Recovery code':'Code de récupération','Set new password':'Enregistrer le nouveau mot de passe',
    'Return to sign in':'Retour à la connexion',
    'Passwords do not match.':'Les mots de passe ne correspondent pas.',
    'Working…':'Traitement en cours…',
    'If this account exists, a recovery code has been sent. Check your inbox and spam folder.':'Si ce compte existe, un code de récupération a été envoyé. Vérifiez votre boîte de réception et vos courriers indésirables.',
    'Password changed. Your saved login has been updated.':'Mot de passe modifié. Les identifiants enregistrés ont été mis à jour.',
    'Password changed. Sign in with your new password.':'Mot de passe modifié. Connectez-vous avec votre nouveau mot de passe.',
    'Password changed, but could not be saved on this phone. Sign in again and enable saved login.':'Mot de passe modifié, mais non enregistré sur ce téléphone. Reconnectez-vous et activez la mémorisation.',
    'Password management is available in the Android app.':'La gestion des mots de passe est disponible dans l’application Android.',
    'Use a password with 12 to 128 characters.':'Utilisez un mot de passe de 12 à 128 caractères.',
    'Enter the code from the recovery email.':'Saisissez le code reçu par e-mail.',
    'Email fallback':'Secours par e-mail','Send me a test email':'M’envoyer un e-mail test',
    'Eligible alarms are emailed after 10 minutes without acknowledgement.':'Les alarmes éligibles sont envoyées par e-mail après 10 minutes sans acquittement.',
    'Test accepted by Gmail — check your inbox and spam folder':'Test accepté par Gmail — vérifiez votre boîte de réception et vos courriers indésirables',
    'Gmail authorization is not configured yet.':'L’autorisation Gmail n’est pas encore configurée.',
    'Email recovery is not configured yet.':'La récupération par e-mail n’est pas encore configurée.',
    'Please wait before sending another test email.':'Veuillez patienter avant d’envoyer un autre e-mail test.',
  });
  const $=id=>document.getElementById(id),field=(id,label,auto)=>`<label class="field"><span>${label}</span><input id="${id}" type="password" autocomplete="${auto}" required minlength="12" maxlength="128"></label>`;
  document.querySelector('[data-screen="configuration"]').insertAdjacentHTML('beforeend',`<section class="panel" id="accountPanel"><h2>My account</h2><form id="passwordForm">${field('currentPassword','Current password','current-password')}${field('newPassword','New password','new-password')}${field('confirmPassword','Confirm new password','new-password')}<p class="muted">Use 12 to 128 characters.</p><button id="changePassword" type="submit">Change password</button></form><p id="accountMessage" role="status" aria-live="polite"></p></section>`);
  // The current password may predate the new length requirement.
  $('currentPassword').removeAttribute('minlength');
  document.querySelector('.login-card').insertAdjacentHTML('beforeend','<button id="forgotPassword" type="button">Forgot password?</button>');
  document.querySelector('[data-screen="connection"]').insertAdjacentHTML('beforeend','<section class="panel"><h2>Email fallback</h2><p>Eligible alarms are emailed after 10 minutes without acknowledgement.</p><button type="button" id="testEmail">Send me a test email</button><p id="emailStatus" role="status"></p></section>');
  $('testEmail').onclick=()=>{if(!state.cloud||!native)return;$('testEmail').disabled=true;message('emailStatus','Working…');window.ElMajdNative.phase5Action('email_test','{}');};
  document.body.insertAdjacentHTML('beforeend',`<dialog id="recoveryDialog" class="panel"><h2>Recover my account</h2><form id="recoveryForm"><label class="field"><span>Email address</span><input id="recoveryEmail" type="email" autocomplete="username" required></label><button type="button" id="sendRecovery">Send recovery code</button><label class="field"><span>Recovery code</span><input id="recoveryCode" inputmode="numeric" autocomplete="one-time-code" required pattern="[0-9]{6,10}" maxlength="10"></label>${field('recoveryPassword','New password','new-password')}${field('recoveryConfirm','Confirm new password','new-password')}<p class="muted">Use 12 to 128 characters.</p><button id="resetPassword" type="submit">Set new password</button><p id="recoveryMessage" role="status" aria-live="polite"></p><button id="closeRecovery" type="button">Return to sign in</button></form></dialog>`);
  let busy=false,operation='',cooldown=0;
  const message=(id,text)=>{$(id).textContent=I18n.text(text);};
  function controls(){['changePassword','sendRecovery','resetPassword'].forEach(id=>$(id).disabled=busy||(id==='changePassword'&&!state.cloud)||(id==='sendRecovery'&&Date.now()<cooldown));}
  function clear(){['currentPassword','newPassword','confirmPassword','recoveryPassword','recoveryConfirm','recoveryCode'].forEach(id=>$(id).value='');}
  function send(action,input){
    if(!native){message(operation==='password_change'?'accountMessage':'recoveryMessage','Password management is available in the Android app.');return;}
    busy=true;controls();message(operation==='password_change'?'accountMessage':'recoveryMessage','Working…');
    if(action==='password_change')window.ElMajdNative.phase5Action(action,JSON.stringify(input));
    else window.ElMajdNative.recoverAccount(action,JSON.stringify(input));
  }
  $('forgotPassword').onclick=()=>{$('recoveryEmail').value=e.email.value;message('recoveryMessage','');$('recoveryDialog').showModal();controls();};
  $('closeRecovery').onclick=()=>{$('recoveryDialog').close();clear();};
  $('recoveryDialog').addEventListener('close',clear);
  $('sendRecovery').onclick=()=>{if(busy||Date.now()<cooldown||!$('recoveryEmail').reportValidity())return;operation='request';send('request',{email:$('recoveryEmail').value.trim()});};
  $('recoveryForm').onsubmit=event=>{event.preventDefault();if(busy)return;if($('recoveryPassword').value!==$('recoveryConfirm').value){message('recoveryMessage','Passwords do not match.');return;}operation='reset';send('reset',{email:$('recoveryEmail').value.trim(),code:$('recoveryCode').value,password:$('recoveryPassword').value});};
  $('passwordForm').onsubmit=event=>{event.preventDefault();if(busy||!state.cloud)return;if($('newPassword').value!==$('confirmPassword').value){message('accountMessage','Passwords do not match.');return;}operation='password_change';send('password_change',{current:$('currentPassword').value,password:$('newPassword').value});};
  const original=window.elMajdNativeEvent;
  window.elMajdNativeEvent=(type,data)=>{
    original(type,data);
    if(type==='email_status'){message('emailStatus',data);$('testEmail').disabled=!state.cloud;}
    if(type==='cloud_connection')$('testEmail').disabled=!state.cloud;
    if(type==='account_saved'){
      busy=false;
      if(data==='request'){cooldown=Date.now()+60000;setTimeout(controls,60000);message('recoveryMessage','If this account exists, a recovery code has been sent. Check your inbox and spam folder.');}
      else if(data==='reset'){clear();e.password.value='';message('recoveryMessage','Password changed. Sign in with your new password.');}
      else {clear();e.password.value='';message('accountMessage',data==='password_changed_unsaved'?'Password changed, but could not be saved on this phone. Sign in again and enable saved login.':'Password changed. Your saved login has been updated.');}
    }
    if(type==='account_error'){busy=false;message(operation==='password_change'?'accountMessage':'recoveryMessage',data);clear();}
    if(type==='cloud_connection'&&data!=='online'){clear();}
    controls();
  };
  controls();
})();
