/* Central UI catalogue. Backend identifiers, input values and user notes stay unchanged. */
(() => {
  let language=localStorage.getItem('elmajd-language')||'fr';
  const fr={
    'Secure poultry monitoring':'Suivi avicole sécurisé','Supabase account':'Compte Supabase','Email':'Adresse e-mail','Password':'Mot de passe',
    'The app connects only to Supabase. MQTT broker credentials remain protected on the server.':'L’application se connecte à Supabase. Les identifiants MQTT restent protégés sur le serveur.',
    'Save login and keep cloud synchronization active':'Mémoriser la connexion et maintenir la synchronisation',
    'Sign in securely':'Se connecter','Poultry Monitor':'Suivi avicole','Connecting':'Connexion en cours','Farm snapshot':'Vue de l’élevage',
    'Overview':'Accueil','Latest live and production values':'Mesures et dernières données de production','Waiting for data':'En attente de données',
    'Live temperature':'Température en direct','Comfortable climate':'Température normale','Latest production':'Dernière production','Production rate':'Taux de ponte',
    'No production record':'Aucune production enregistrée','Awaiting cloud data':'En attente du serveur','At a glance':'En un coup d’œil','System health':'État du système',
    'Live':'En direct','Unknown':'Inconnu','UNKNOWN':'INCONNU','Signal':'Signal','Cloud':'Serveur','Live equipment':'Équipements en direct','Farm status':'État de l’élevage',
    'Temperature':'Température','Sensor normal':'Sonde normale','Sensor fault':'Défaut de sonde','Water supply':'Approvisionnement en eau','Cisterns':'Citernes',
    'Inputs I2-I4':'Entrées I2–I4','Feed storage':'Stockage d’aliment','Alveole silos':'Silos d’alvéoles','Inputs I5-I6':'Entrées I5–I6',
    'Evaporative cooling':'Refroidissement évaporatif','Cooling pad':'Pad cooling','Input I7':'Entrée I7','Air circulation':'Ventilation','8 ventilators':'8 ventilateurs',
    'Production performance':'Performances de production','Daily':'Journalier','Weekly':'Hebdomadaire','Actual flock':'Effectif actuel','Average production':'Taux de ponte moyen',
    'Total mortality':'Mortalité totale','Average production %':'Taux de ponte moyen (%)','Production %':'Taux de ponte (%)','Mortality':'Mortalité',
    'Last 14 days':'14 derniers jours','Last 8 weeks':'8 dernières semaines','No production data for this period.':'Aucune production pour cette période.',
    'Daily operation':'Saisie quotidienne','Stock, sortie and mortality':'Stock, sortie et mortalité','Production date':'Date de production','Current stock':'Stock actuel',
    'Calculated production':'Production calculée','Set the flock in Configuration first':'Renseignez d’abord l’effectif dans Configuration',
    'Production = current Stock + Sortie - previous Stock. Without an earlier Stock record, production starts at 0.':'Production = stock actuel + sortie − stock précédent. Sans stock antérieur, la première production est égale à 0.',
    'Calculate and save':'Calculer et enregistrer','Cloud sign-in is required':'Connexion au compte requise','Cloud records':'Données partagées','Recent production':'Production récente',
    'Records load after cloud sign-in.':'Les données seront chargées après connexion.','Farm setup':'Paramètres de l’élevage','Configuration':'Configuration',
    'Shared across authorized phones':'Partagé entre les téléphones autorisés','This number is the production-rate baseline. Mortality is deducted automatically.':'Cet effectif sert au calcul du taux de ponte. La mortalité est déduite automatiquement.',
    'Chicken count':'Effectif de poules','Current flock size':'Effectif actuel','Actual number of chickens':'Nombre actuel de poules','Save configuration':'Enregistrer la configuration',
    'Connectivity':'Connectivité','Communication':'Communication','OPTA and Supabase diagnostics':'Diagnostic OPTA et Supabase','Live links':'Liaisons en direct',
    'Connection status':'État de connexion','Diagnostics':'Diagnostic','OPTA device':'Automate OPTA','EMQX status via Supabase':'État EMQX via Supabase',
    'Live telemetry':'Mesures en direct','Realtime detail':'Détail du temps réel','WebSocket channel':'Canal WebSocket','Waiting for subscription':'En attente de l’abonnement',
    'Cloud session':'Session serveur','Sequence / uptime':'Séquence / durée de fonctionnement','WiFi signal':'Signal Wi-Fi','RSSI reported by OPTA':'RSSI mesuré par l’OPTA',
    'Cloud updates':'Mises à jour serveur','Realtime telemetry':'Mesures en temps réel','Remote control':'Commande à distance','Send OPTA command':'Envoyer une commande OPTA',
    'Server enforces QoS 0 - retain off':'QoS 0 imposé par le serveur — sans rétention','Target':'Cible','Action':'Action','Plain-text payload':'Commande en texte brut',
    'Send through Supabase':'Envoyer via Supabase','Connect to send a command':'Connectez-vous pour envoyer une commande','Sign out and disconnect':'Se déconnecter',
    'Status':'État','Configure':'Réglages','Connection':'Connexion','Alarms':'Alarmes','5-minute cloud samples':'Échantillons serveur de 5 minutes',
    'Loading shared history...':'Chargement de l’historique partagé…','Temperature alert':'Alerte de température','Sensor normal':'Sonde normale',
    'Online':'Connecté','Offline':'Hors ligne','Not set':'Non renseigné','Not configured':'Non configuré','Reconnecting':'Reconnexion','Data delayed':'Données anciennes',
    'Stopped':'Arrêté','Subscribed':'Abonné','Retrying WebSocket connection':'Nouvelle tentative WebSocket','Connection error':'Erreur de connexion',
    'Ready to send through Supabase':'Prêt à envoyer via Supabase','Ready to save a shared daily record':'Prêt à enregistrer une journée partagée',
    'Actual flock is synchronized with Supabase':'Effectif synchronisé avec Supabase','Actual flock synchronized':'Effectif synchronisé',
    'Enter the actual flock before recording production.':'Renseignez l’effectif avant la production.','Saving configuration...':'Enregistrement de la configuration…',
    'Enter a valid whole-number chicken count.':'Saisissez un effectif entier valide.','Calculating and saving...':'Calcul et enregistrement…',
    'Production record deleted and calculations updated.':'Production supprimée et calculs mis à jour.','No shared production records yet.':'Aucune production partagée pour le moment.',
    'Packaging inventory':'Stock d’alvéoles','Empty cartons':'Alvéoles disponibles','Received':'Reçues','Consumed':'Consommées','Available':'Disponibles',
    'Entry date (GMT+1)':'Date de l’entrée (GMT+1)','Cartons in this entry':'Nombre d’alvéoles de cette entrée','Delivery note':'Note de livraison',
    'Add to carton stock':'Ajouter au stock d’alvéoles','Cancel carton edit':'Annuler la modification','No carton entries yet.':'Aucune entrée d’alvéoles.',
    'Server alarm policy':'Politique d’alarme serveur','Temperature thresholds':'Seuils de température','Warning °C':'Avertissement (°C)','Critical °C':'Critique (°C)',
    'Save thresholds':'Enregistrer les seuils','Activation delays and recovery hysteresis follow the approved server policy.':'Les délais et l’hystérésis suivent la politique serveur approuvée.',
    'Refresh shared data':'Actualiser les données','Sign in to load packaging and alarm settings.':'Connectez-vous pour charger le stock et les alarmes.',
    'Chickens currently in the house':'Poules présentes dans le bâtiment','Available cartons':'Alvéoles disponibles','Tap to view or adjust stock':'Appuyer pour consulter ou ajuster le stock',
    'Server monitoring':'Surveillance serveur','Alarms & history':'Alarmes et historique','Active conditions, acknowledgements and recovery':'Conditions actives, acquittements et rétablissements',
    'Alarm history':'Historique des alarmes','Refresh':'Actualiser','Sign in to load alarms.':'Connectez-vous pour charger les alarmes.',
    'Phone notifications':'Notifications du téléphone','Firebase push':'Notifications Firebase','Sign in to register this phone.':'Connectez-vous pour enregistrer ce téléphone.',
    'Register / retry':'Enregistrer / réessayer','Send me a test notification':'M’envoyer une notification test',
    'Allow notifications in Android settings. Gmail fallback is still pending. Force-stopping the app in Android settings prevents messages until the app is reopened.':'Autorisez les notifications dans Android. L’envoi Gmail reste à configurer. Un arrêt forcé dans Android bloque les messages jusqu’à la réouverture.',
    'Acknowledgement stops reminders; recovery clears the condition. Check Connection for this phone’s push registration status.':'L’acquittement arrête les rappels. Le rétablissement clôt l’alarme. Consultez Connexion pour l’état des notifications.',
    'Cancel edit':'Annuler la modification','Edit / owner deletion':'Modifier / suppression réservée au propriétaire','Control status only — no rotation feedback':'État de commande — rotation non confirmée',
    '24-hour history from server five-minute aggregates. Gaps mean no valid measurement was recorded.':'Historique de 24 heures issu des agrégats de 5 minutes. Les interruptions correspondent à des mesures manquantes.',
    'Cartons counted':'Alvéoles comptabilisées','Edit':'Modifier','Adjust':'Ajuster','Delete':'Supprimer','Save audited correction':'Enregistrer la correction tracée',
    'Enter valid nonnegative whole numbers and a date no later than today (GMT+1).':'Saisissez des entiers positifs ou nuls et une date non future (GMT+1).',
    'Save carton correction':'Enregistrer la correction d’alvéoles','Critical threshold must be at least 1 °C above warning.':'Le seuil critique doit dépasser le seuil d’avertissement d’au moins 1 °C.',
    'Requesting a push test...':'Demande de notification test…','Recovered':'Rétablie','Active · acknowledged':'Active · acquittée','Active · acknowledgement needed':'Active · à acquitter',
    'Acknowledge':'Acquitter','No server alarms recorded.':'Aucune alarme serveur enregistrée.','Opening reference':'Référence initiale',
    'Add the first stock entry as the opening reference. Consumption starts on the following production day.':'La première entrée de stock sert de référence. La consommation commence le jour de production suivant.',
    'Could not read shared farm data.':'Impossible de lire les données partagées.','Correction saved; dependent production and flock recalculated.':'Correction enregistrée ; production et effectif recalculés.',
    'Saved to the shared database.':'Enregistré dans la base partagée.','Waiting for a live measurement':'En attente d’une mesure en direct','Temperature unavailable':'Température indisponible',
    'Critical temperature':'Température critique','Temperature warning':'Avertissement de température','Below warning threshold':'Température sous le seuil d’avertissement',
    'Running — auxiliary contact confirmed':'En fonctionnement — contact auxiliaire confirmé','Not running — auxiliary contact open':'À l’arrêt — contact auxiliaire ouvert',
    'No valid measurements in the last 24 hours.':'Aucune mesure valide sur les dernières 24 heures.','Unknown control state':'État de commande inconnu','Waiting for auxiliary feedback':'En attente du contact auxiliaire',
    'Registered — notifications enabled':'Enregistré — notifications autorisées','Registered — allow notifications in Android settings':'Enregistré — autorisez les notifications dans Android',
    'Registering with Firebase...':'Enregistrement auprès de Firebase…','Firebase token unavailable; check Google Play services and network':'Jeton Firebase indisponible : vérifiez Google Play et le réseau',
    'Phone registration failed — sign in again or retry':'Échec de l’enregistrement : reconnectez-vous ou réessayez',
    'Test accepted by Firebase — check the phone notification':'Test accepté par Firebase — vérifiez la notification',
    'Supabase email and password are required.':'L’adresse e-mail et le mot de passe Supabase sont obligatoires.',
    'This account is not assigned to the ElMajd farm.':'Ce compte n’est pas rattaché à l’élevage ElMajd.',
    'Invalid login credentials':'Adresse e-mail ou mot de passe incorrect','Email not confirmed':'Adresse e-mail non confirmée',
    'Production permission denied':'Droit de saisie de production refusé','Production edit permission denied':'Droit de modification refusé',
    'Only the owner/admin may delete production.':'Seul le propriétaire peut supprimer une production.',
    'Only the owner/admin may delete carton entries':'Seul le propriétaire peut supprimer une entrée d’alvéoles',
    'Mortality exceeds available flock.':'La mortalité dépasse l’effectif disponible.','Configure the flock first.':'Configurez d’abord l’effectif.',
    'Enter a valid receipt date and positive whole carton count.':'Saisissez une date valide et un nombre entier d’alvéoles supérieur à zéro.',
    'Carton entry not found':'Entrée d’alvéoles introuvable','No registered phone with notifications enabled':'Aucun téléphone enregistré avec notifications autorisées',
    'owner':'propriétaire','manager':'responsable','viewer':'consultation','worker':'opérateur',
    'temperature critical':'Température critique','temperature warning':'Avertissement de température','controller offline':'Automate hors ligne','sensor fault':'Défaut de sonde',
    'cooling unavailable':'Refroidissement indisponible','cistern i2':'Citerne 1 vide','cistern i3':'Citerne 2 vide','cistern i4':'Citerne 3 vide','silo i5':'Silo 1 vide','silo i6':'Silo 2 vide',
    'Date':'Date','Stock':'Stock','Sortie':'Sortie','Production':'Production','Rate':'Taux','Balance':'Solde',
    'ON':'MARCHE','OFF':'ARRÊT','TOGGLE':'INVERSER','ALL':'TOUS','online':'connecté','offline':'hors ligne','unknown':'inconnu',
    'Tap for temperature history':'Appuyer pour l’historique de température','Cooling pad status and history':'État et historique du refroidissement',
    'Production chart interval':'Période du graphique de production','Temperature unavailable':'Température indisponible',
    'Enter Stock, Sortie and mortality to calculate':'Renseignez stock, sortie et mortalité pour calculer',
    'No previous Stock - production starts at 0':'Aucun stock antérieur — la production démarre à 0',
    'Values exceed the available flock or produce a negative result':'Les valeurs dépassent l’effectif disponible ou donnent un résultat négatif',
    'Enter a command.':'Saisissez une commande.','Supabase is not connected.':'Supabase n’est pas connecté.',
    'Stock, sortie, and mortality cannot be negative.':'Stock, sortie et mortalité ne peuvent pas être négatifs.',
    'The actual chicken count cannot be negative.':'L’effectif ne peut pas être négatif.',
    'Enter nonnegative whole numbers.':'Saisissez des nombres entiers positifs ou nuls.',
    'Enter a valid date and nonnegative Stock, Sortie and mortality.':'Saisissez une date valide et des valeurs positives ou nulles pour le stock, la sortie et la mortalité.',
    'Authentication required':'Authentification requise','Invalid session':'Session invalide',
    'Push delivery is temporarily unavailable':'Les notifications sont temporairement indisponibles',
    'Open carton inventory':'Ouvrir le stock d’alvéoles','Open 24-hour five-minute history':'Ouvrir l’historique de 24 heures par pas de 5 minutes'
  };
  const patterns=[
    [/^Cistern (\d+)$/,m=>`Citerne ${m[1]}`],[/^Alveole silo (\d+)$/,m=>`Silo d’alvéoles ${m[1]}`],[/^Fan (\d+)$/,m=>`Ventilateur ${m[1]}`],
    [/^FULL - 1$/,()=> 'PLEIN - 1'],[/^EMPTY - 0$/,()=> 'VIDE - 0'],[/^ON - (.+)$/,m=>`MARCHE - ${m[1]}`],[/^OFF - (.+)$/,m=>`ARRÊT - ${m[1]}`],
    [/^Tap for (\d+)-hour chart$/,m=>`Historique de ${m[1]} heures`],[/^Tap a sensor to view (\d+)-hour history$/,m=>`Appuyer sur un capteur : historique de ${m[1]} heures`],
    [/^(.+) — last 24 hours$/,m=>`${text(m[1],'fr')} — dernières 24 heures`],[/^Recorded (.+)$/,m=>`Enregistré le ${m[1]}`],
    [/^([\d\s.,]+) eggs$/,m=>`${m[1]} œufs`],[/^([\d\s.,]+) cartons available\. Open packaging inventory\.$/,m=>`${m[1]} alvéoles disponibles. Ouvrir le stock.`],
    [/^(\d{4}-\d{2}-\d{2}) · (\d+) cartons$/,m=>`${m[1]} · ${m[2]} alvéoles`],[/^· Opening reference$/,()=> '· Référence initiale'],
    [/^Shared data synchronized • (.+)$/,m=>`Données synchronisées • ${text(m[1],'fr')}`],
    [/^Production for (.+) saved$/,m=>`Production du ${m[1]} enregistrée`],
    [/^Actual flock saved: (.+) chickens$/,m=>`Effectif enregistré : ${m[1]} poules`],
    [/^Opening reference: (.+)\. Production consumption starts after this date; 30 eggs\/carton with 10% allowance\.$/,m=>`Référence initiale : ${m[1]}. Consommation après cette date ; 30 œufs/alvéole et marge de 10 %.`],
    [/^(\d+) cartons of recorded consumption were not covered by available stock\. Available cartons remain at zero until a new delivery\.$/,m=>`${m[1]} alvéoles consommées n’étaient pas couvertes par le stock. Le stock disponible reste à zéro jusqu’à une nouvelle livraison.`],
    [/^Temperature is at or above (.+) °C$/,m=>`Température supérieure ou égale à ${m[1]} °C`],
    [/^Measured: (.+) • received: (.+)$/,m=>`Mesurée : ${m[1]} • reçue : ${m[2]}`],
    [/^Preview: (.+) chickens • (.+) cartons\. Server validates all affected dates\.$/,m=>`Aperçu : ${m[1]} poules • ${m[2]} alvéoles. Le serveur valide toutes les dates concernées.`],
    [/^Delete the production record for (.+)\?$/,m=>`Supprimer la production du ${m[1]} ?`],
    [/^Delete this carton entry\? If it is the opening entry, the next dated entry becomes the reference\.$/,()=> 'Supprimer cette entrée d’alvéoles ? Si elle est la référence initiale, l’entrée suivante devient la référence.'],
    [/^Cloud request failed \((\d+)\): (.*)$/,m=>`Erreur du serveur (${m[1]}) : ${text(m[2],'fr')}`],
    [/^Correction makes production invalid on (.+): production (.+), remaining flock (.+)\.$/,m=>`Correction impossible le ${m[1]} : production ${m[2]}, effectif restant ${m[3]}.`],
    [/^Sent "(.+)" through Supabase - QoS 0 - retain off$/,m=>`« ${m[1]} » envoyée via Supabase — QoS 0, sans rétention`],
    [/^No (daily|weekly) production data for this period\.$/,()=> 'Aucune production pour cette période.'],
    [/^Week of (.+)$/,m=>`Semaine du ${m[1]}`],[/^([\d.,]+) updates$/,m=>`${m[1]} mises à jour`],
    [/^.*duplicate key value violates unique constraint.*$/i,()=> 'Une entrée existe déjà pour cette date. Modifiez-la au lieu de la recréer.']
  ];
  function text(source,lang=language){if(lang!=='fr')return source;if(fr[source])return fr[source];for(const [regex,replace] of patterns){const match=source.match(regex);if(match)return replace(match);}return source;}
  const tracked=new WeakMap();
  const attributes=new WeakMap();
  function nodeText(node){
    if(node.parentElement?.closest('script,style,textarea,input,[data-user-content]'))return;
    const value=node.nodeValue,previous=tracked.get(node),source=previous?.rendered===value?previous.source:value;
    const trimmed=source.trim();if(!trimmed)return;
    const result=source.replace(trimmed,text(trimmed));tracked.set(node,{source,rendered:result});if(value!==result)node.nodeValue=result;
  }
  function render(root=document.body){
    if(root.nodeType===Node.TEXT_NODE){nodeText(root);return;}
    const walk=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);let node;while(node=walk.nextNode())nodeText(node);
    const elements=root.querySelectorAll?.('[aria-label],[aria-description],[title],[placeholder]')||[];
    for(const element of elements){const memory=attributes.get(element)||{};for(const name of ['aria-label','aria-description','title','placeholder']){
      if(!element.hasAttribute(name))continue;const value=element.getAttribute(name),previous=memory[name],source=previous?.rendered===value?previous.source:value;
      const translated=text(source);memory[name]={source,rendered:translated};if(value!==translated)element.setAttribute(name,translated);
    }attributes.set(element,memory);}
  }
  const confirmOriginal=window.confirm.bind(window);window.confirm=message=>confirmOriginal(text(message));
  function set(lang){language=lang==='en'?'en':'fr';localStorage.setItem('elmajd-language',language);document.documentElement.lang=language;
    window.ElMajdNative?.setLanguage?.(language);render();document.querySelectorAll('[data-language]').forEach(s=>s.value=language);
    window.dispatchEvent(new Event('elmajd-language'));
    try{if(typeof drawWeek==='function'){if(state.rows.length)renderRows(JSON.stringify(state.rows));drawWeek();if(e.dialog.open)drawChart(e.dialog.dataset.sensor);}}catch{}
    try{if(typeof state!=='undefined'&&state.cloud)window.ElMajdNative?.phase5Action?.('push_sync','{}');}catch{}
  }
  function start(){
    // Option labels may be translated; protocol values must remain stable.
    document.querySelectorAll('#commandAction option,#commandTarget option').forEach(o=>o.value=o.value);
    const selector='<label class="field"><span>Langue / Language</span><select data-language aria-label="Langue / Language"><option value="fr">Français</option><option value="en">English</option></select></label>';
    document.querySelector('.login-card').insertAdjacentHTML('afterbegin',selector);
    document.querySelector('[data-screen="configuration"]').insertAdjacentHTML('afterbegin',`<section class="panel">${selector}</section>`);
    document.querySelectorAll('[data-language]').forEach(s=>s.onchange=()=>set(s.value));
    new MutationObserver(records=>{for(const record of records){if(record.type==='characterData')render(record.target);else record.addedNodes.forEach(n=>render(n));}}).observe(document.body,{subtree:true,childList:true,characterData:true});
    document.addEventListener('invalid',event=>{const input=event.target;if(language!=='fr'||!input.setCustomValidity)return;
      input.setCustomValidity(input.validity.valueMissing?'Veuillez renseigner ce champ.':input.validity.typeMismatch?'Veuillez saisir une adresse e-mail valide.':input.validity.rangeUnderflow?'La valeur est inférieure au minimum autorisé.':'Veuillez saisir une valeur valide.');},true);
    document.addEventListener('input',event=>event.target.setCustomValidity?.(''));
    set(language);
  }
  window.I18n={text,locale:()=>language==='fr'?'fr-FR':'en-GB',language:()=>language,set,render,add:entries=>Object.assign(fr,entries)};
  document.addEventListener('DOMContentLoaded',start);
})();
