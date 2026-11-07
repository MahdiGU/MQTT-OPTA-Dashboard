(() => {
  I18n.add({
    '3D live visualisation': 'Visualisation 3D en direct',
    'Inside your poultry house': 'Au cœur de votre élevage',
    'Explore the house and tap an equipment item to inspect its status.': 'Explorez le bâtiment et touchez un équipement pour consulter son état.',
    'Live 3D': '3D en direct', '3D house': 'Bâtiment 3D',
    'Reference model': 'Modèle de référence',
    'Based on your pictures. Building dimensions and equipment positions are indicative.': 'D’après vos photos. Les dimensions et les positions des équipements sont indicatives.',
    'Model overview': 'Vue générale', 'Top view': 'Vue de dessus', 'Fan wall': 'Ventilateurs',
    'Cooling pads': 'Pads cooling', 'Reset view': 'Recentrer',
    'Drag to rotate · pinch to zoom · two fingers to pan': 'Glisser pour tourner · pincer pour zoomer · deux doigts pour déplacer',
    'Rotate left': 'Tourner à gauche', 'Rotate right': 'Tourner à droite',
    'Zoom in': 'Agrandir', 'Zoom out': 'Réduire',
    'Running / commanded on': 'En marche / commande active',
    'Stopped / commanded off': 'À l’arrêt / commande inactive',
    'No recent data': 'Sans données récentes', 'Select equipment': 'Sélectionner un équipement',
    'Equipment details': 'Détails de l’équipement', 'Tap the model or choose an item below.': 'Touchez le modèle ou choisissez un élément ci-dessous.',
    'Control active': 'Commande active', 'Control inactive': 'Commande inactive',
    'Fan state follows the relay or LED control. Rotation feedback is not installed.': 'L’état du ventilateur suit la commande relais ou LED. Le retour de rotation reste à installer.',
    'Running confirmed': 'Marche confirmée', 'Stopped': 'À l’arrêt',
    'Expansion running feedback': 'Retour de marche de l’extension',
    'Shared I7 auxiliary feedback': 'Retour auxiliaire I7 commun',
    'Both pads display the same I7 signal. Individual pad faults cannot be distinguished.': 'Les deux pads affichent le même signal I7. Un défaut propre à un pad ne peut pas être distingué.',
    'Feed-chain running feedback from expansion input': 'Retour de marche de chaîne sur l’entrée extension',
    'Waiting for live telemetry': 'En attente des données en direct',
    'Live telemetry': 'Données en direct', 'Telemetry delayed': 'Données retardées',
    'Illustrative preview': 'Aperçu simulé', 'Preview data — not connected to the farm': 'Données simulées — aperçu du bâtiment',
    'Loading the 3D house…': 'Chargement du bâtiment 3D…',
    '3D is unavailable on this device. Equipment status is available below.': 'La 3D est indisponible sur cet appareil. L’état des équipements reste accessible ci-dessous.',
    'Retry 3D': 'Réessayer la 3D',
    'Fans': 'Ventilateurs', 'Chains': 'Chaînes', 'Pads': 'Pads',
    'Control status': 'État de commande', 'Equipment status': 'État des équipements', 'Camera view': 'Vue du bâtiment',
    'Interactive poultry house. Arrow keys rotate. Plus and minus zoom. Home resets the view.': 'Bâtiment avicole interactif. Les flèches tournent la vue. Plus et moins ajustent le zoom. La touche Début recentre la vue.',
    'Row 1': 'Rangée 1', 'Row 2': 'Rangée 2', 'Row 3': 'Rangée 3', 'Row 4': 'Rangée 4',
    'Level 1': 'Étage 1', 'Level 2': 'Étage 2', 'Level 3': 'Étage 3',
    'Pad 1': 'Pad 1', 'Pad 2': 'Pad 2',
  });

  const equipment = [
    ...FANS.map(([section, key], index) => ({
      id: `fan-${index}`, kind: 'fan', title: `Fan ${index + 1}`, short: `V${index + 1}`,
      source: key, section, key,
    })),
    ...Array.from({ length: 12 }, (_, index) => ({
      id: `feed-${index}`, kind: 'feed', row: Math.floor(index / 3) + 1, level: index % 3 + 1,
      short: `R${Math.floor(index / 3) + 1} · E${index % 3 + 1}`, source: `I${index + 1}`, bit: index,
    })),
    ...Array.from({ length: 2 }, (_, index) => ({
      id: `pad-${index}`, kind: 'pad', title: `Pad ${index + 1}`, short: `P${index + 1}`, source: 'I7',
    })),
  ];
  const icon = {
    fan: '<circle cx="12" cy="12" r="9"/><path d="M12 12C5 9 7 3 11 6S15 10 12 12C15 5 21 7 18 11S14 15 12 12C19 15 17 21 13 18S9 14 12 12C9 19 3 17 6 13S10 9 12 12Z"/>',
    feed: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><path d="M8 7h2m3 0h2M8 17h2m3 0h2"/>',
    pad: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M12 4v16M17 4v16M3 9h18M3 15h18"/>',
  };
  const svg = kind => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" aria-hidden="true">${icon[kind]}</svg>`;
  function tiles(kind) {
    return equipment.filter(item => item.kind === kind).map(item => `
      <button type="button" class="live3d-equipment" data-live3d-item="${item.id}" data-state="unavailable" aria-pressed="false">
        ${svg(kind)}<strong>${item.short}</strong><span class="live3d-item-state">No recent data</span>
        <small>${kind === 'feed' ? 'EXT · ' : ''}${item.source}</small>
      </button>`).join('');
  }
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = 'live3d.css';
  document.head.appendChild(link);
  document.querySelector('[data-screen="status"]').insertAdjacentHTML('afterend', `
    <section class="screen" data-screen="live3d" aria-labelledby="live3dTitle">
      <div class="hero live3d-heading"><div><div class="eyebrow">Inside your poultry house</div>
        <h2 id="live3dTitle">3D live visualisation</h2><p>Explore the house and tap an equipment item to inspect its status.</p></div></div>
      <div class="live3d-data"><span id="live3dDataState" data-state="unavailable">Waiting for live telemetry</span><time id="live3dTime"></time></div>
      <div class="live3d-summary" aria-label="Equipment status">
        <div>${svg('fan')}<span>Fans</span><strong id="live3dFanCount">— / 8</strong><small>Control status</small></div>
        <div>${svg('feed')}<span>Chains</span><strong id="live3dFeedCount">— / 12</strong><small>Running feedback</small></div>
        <div>${svg('pad')}<span>Pads</span><strong id="live3dPadCount">— / 2</strong><small>Shared I7 auxiliary feedback</small></div>
      </div>
      <section class="live3d-model" aria-label="3D house">
        <div class="live3d-viewbar" role="group" aria-label="Camera view">
          <button type="button" data-live3d-view="overview" aria-pressed="true">Model overview</button>
          <button type="button" data-live3d-view="top" aria-pressed="false">Top view</button>
          <button type="button" data-live3d-view="fans" aria-pressed="false">Fan wall</button>
          <button type="button" data-live3d-view="pads" aria-pressed="false">Cooling pads</button>
        </div>
        <div class="live3d-viewport" id="live3dViewport">
          <canvas id="live3dCanvas" tabindex="0" aria-label="Interactive poultry house. Arrow keys rotate. Plus and minus zoom. Home resets the view."></canvas>
          <div class="live3d-loading" id="live3dLoading">Loading the 3D house…</div>
          <div class="live3d-fallback hidden" id="live3dFallback" role="status"><p>3D is unavailable on this device. Equipment status is available below.</p><button type="button" id="live3dRetry">Retry 3D</button></div>
          <span class="live3d-model-label">ELMAJD <small>Reference model</small></span>
          <div class="live3d-zoom"><button type="button" id="live3dZoomIn" aria-label="Zoom in">+</button><button type="button" id="live3dZoomOut" aria-label="Zoom out">−</button><button type="button" id="live3dReset" aria-label="Reset view">⌂</button></div>
        </div>
        <p class="live3d-gesture">Drag to rotate · pinch to zoom · two fingers to pan</p>
        <div class="live3d-legend"><span data-state="running">Running / commanded on</span><span data-state="stopped">Stopped / commanded off</span><span data-state="unavailable">No recent data</span></div>
      </section>
      <section class="live3d-detail" id="live3dDetail" aria-live="polite" data-state="unavailable">
        <div class="eyebrow">Equipment details</div><h3 id="live3dSelectedName">Select equipment</h3>
        <strong id="live3dSelectedState"></strong><p id="live3dSelectedSource">Tap the model or choose an item below.</p>
      </section>
      <section class="panel live3d-picker"><div class="panel-head"><h3>Fans</h3><span class="hint">D0–D3 · L0–L3</span></div>
        <div class="live3d-fans">${tiles('fan')}</div><p class="live3d-note">Fan state follows the relay or LED control. Rotation feedback is not installed.</p></section>
      <section class="panel live3d-picker"><div class="panel-head"><h3>Feed chains</h3><span class="hint">Expansion inputs I1–I12</span></div>
        <div class="live3d-chains">${tiles('feed')}</div></section>
      <section class="panel live3d-picker"><div class="panel-head"><h3>Cooling pads</h3><span class="hint">Input I7</span></div>
        <div class="live3d-pads">${tiles('pad')}</div><p class="live3d-note">Both pads display the same I7 signal. Individual pad faults cannot be distinguished.</p></section>
      <p class="live3d-note">Based on your pictures. Building dimensions and equipment positions are indicative.</p>
    </section>`);
  document.querySelector('[data-nav="status"]').insertAdjacentHTML('afterend', `
    <button type="button" data-nav="live3d"><span class="nav-icon"><svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" stroke-width="1.6" aria-hidden="true"><path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10L3 7m9 5 9-5m-9 5v10"/></svg></span>Live 3D</button>`);

  const screen = document.querySelector('[data-screen="live3d"]');
  const nav = document.querySelector('[data-nav="live3d"]');
  const stage = $('live3dViewport');
  const tileNodes = new Map([...screen.querySelectorAll('[data-live3d-item]')].map(node => [node.dataset.live3dItem, node]));
  const preview = !native && new URLSearchParams(location.search).has('preview');
  let latest = null;
  let staleTimer;
  let engine;
  let engineLoading = false;
  let selected;
  let statuses = Object.fromEntries(equipment.map(item => [item.id, 'unavailable']));
  const maxAge = 20_000;
  let previewTimer;

  const title = item => item.kind === 'feed'
    ? `${I18n.text(`Row ${item.row}`)} · ${I18n.text(`Level ${item.level}`)}`
    : I18n.text(item.title);
  function stateLabel(item, status) {
    if (status === 'unavailable') return I18n.text('No recent data');
    if (item.kind === 'fan') return I18n.text(status === 'running' ? 'Control active' : 'Control inactive');
    return I18n.text(status === 'running' ? 'Running confirmed' : 'Stopped');
  }
  function details() {
    const item = equipment.find(candidate => candidate.id === selected);
    if (!item) return;
    $('live3dSelectedName').textContent = title(item);
    $('live3dSelectedState').textContent = stateLabel(item, statuses[item.id]);
    $('live3dDetail').dataset.state = statuses[item.id];
    const descriptions = {
      fan: 'Fan state follows the relay or LED control. Rotation feedback is not installed.',
      feed: 'Feed-chain running feedback from expansion input', pad: 'Shared I7 auxiliary feedback',
    };
    $('live3dSelectedSource').textContent = `${item.kind === 'feed' ? 'EXT · ' : ''}${item.source} · ${I18n.text(descriptions[item.kind])}`;
  }
  function choose(id, focus = true) {
    if (!tileNodes.has(id)) return;
    selected = id;
    tileNodes.forEach((node, key) => node.setAttribute('aria-pressed', String(key === id)));
    details();
    engine?.select(id, focus);
    if (focus) stage.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }
  function update() {
    clearTimeout(staleTimer);
    const timestamp = Date.parse(latest?.captured_at || latest?.received_at);
    const age = Date.now() - timestamp;
    const available = !!latest && state.cloud && latest.mqtt_status !== 'offline'
      && Number.isFinite(age) && age >= -60_000 && age < maxAge;
    const feedTimestamp = Date.parse(latest?.captured_at || latest?.feed_chains_received_at);
    const feedAge = Date.now() - feedTimestamp;
    const feedAvailable = available && Number.isInteger(latest.feed_chains)
      && latest.feed_chains >= 0 && latest.feed_chains <= 0xfff
      && Number.isFinite(feedAge) && feedAge >= -60_000 && feedAge < maxAge;
    for (const item of equipment) {
      let signal;
      if (available) {
        if (item.kind === 'fan') signal = latest[item.section]?.[item.key];
        else if (item.kind === 'pad') signal = latest.inputs?.I7;
        else if (feedAvailable) signal = (latest.feed_chains >> item.bit) & 1;
      }
      const status = signal === 1 ? 'running' : signal === 0 ? 'stopped' : 'unavailable';
      statuses[item.id] = status;
      const node = tileNodes.get(item.id);
      node.dataset.state = status;
      node.title = title(item);
      node.querySelector('.live3d-item-state').textContent = stateLabel(item, status);
      node.setAttribute('aria-label', `${title(item)} · ${item.source} · ${stateLabel(item, status)}`);
    }
    for (const [kind, id, count] of [['fan', 'live3dFanCount', 8], ['feed', 'live3dFeedCount', 12], ['pad', 'live3dPadCount', 2]]) {
      const group = equipment.filter(item => item.kind === kind);
      const known = group.filter(item => statuses[item.id] !== 'unavailable').length;
      const running = group.filter(item => statuses[item.id] === 'running').length;
      $(id).textContent = known ? `${running} / ${count}` : `— / ${count}`;
    }
    $('live3dDataState').dataset.state = available ? 'running' : 'unavailable';
    $('live3dDataState').textContent = I18n.text(preview ? 'Illustrative preview' : available ? 'Live telemetry' : latest ? 'Telemetry delayed' : 'Waiting for live telemetry');
    $('live3dTime').textContent = Number.isFinite(timestamp)
      ? new Date(timestamp).toLocaleTimeString(I18n.locale(), { hour: '2-digit', minute: '2-digit', second: '2-digit' }) : '';
    engine?.update(statuses);
    details();
    if (available) {
      const expires = feedAvailable ? Math.min(maxAge - age, maxAge - feedAge) : maxAge - age;
      staleTimer = setTimeout(update, Math.max(1, expires) + 1);
    }
  }
  function failure() {
    stage.dataset.renderer = 'unavailable';
    $('live3dLoading').classList.add('hidden');
    $('live3dFallback').classList.remove('hidden');
    engine?.setActive(false);
  }
  function initialise() {
    if (engine) return;
    engineLoading = false;
    try {
      engine = window.createElMajdScene($('live3dCanvas'), id => choose(id, false), failure);
      stage.dataset.renderer = 'ready';
      $('live3dLoading').classList.add('hidden');
      $('live3dFallback').classList.add('hidden');
      engine.update(statuses);
      if (selected) engine.select(selected);
      syncVisibility();
    } catch (error) {
      console.info('3D scene could not start:', error.message);
      failure();
    }
  }
  function loadScene() {
    if (engine || engineLoading || stage.dataset.renderer === 'unavailable') return;
    if (window.createElMajdScene) { initialise(); return; }
    engineLoading = true;
    const script = document.createElement('script');
    script.src = 'live3d-scene.bundle.js';
    script.onload = initialise;
    script.onerror = () => { engineLoading = false; failure(); script.remove(); };
    document.head.appendChild(script);
  }
  function syncVisibility() {
    const visible = screen.classList.contains('active') && !e.app.classList.contains('hidden') && !document.hidden;
    if (visible) loadScene();
    engine?.setActive(visible);
    stage.dataset.active = String(visible);
    clearInterval(previewTimer);
    if (visible && preview) {
      const demo = () => {
        latest = { ...sample, captured_at: new Date().toISOString(), feed_chains: 0xb6d,
          mqtt_status: 'online', inputs: { ...sample.inputs, I7: 1 } };
        update();
      };
      demo();
      previewTimer = setInterval(demo, 5000);
    }
  }
  nav.onclick = () => {
    document.querySelectorAll('[data-nav]').forEach(button => button.classList.toggle('active', button === nav));
    document.querySelectorAll('.screen').forEach(page => page.classList.toggle('active', page === screen));
    scrollTo({ top: 0, behavior: 'smooth' });
    syncVisibility();
  };
  document.querySelectorAll('[data-nav]').forEach(button => {
    button.addEventListener('click', () => button.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' }));
  });
  new MutationObserver(syncVisibility).observe(screen, { attributes: true, attributeFilter: ['class'] });
  new MutationObserver(() => {
    if (e.app.classList.contains('hidden')) { latest = null; update(); }
    syncVisibility();
  }).observe(e.app, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => { update(); syncVisibility(); });
  screen.querySelectorAll('[data-live3d-item]').forEach(button => {
    button.onclick = () => choose(button.dataset.live3dItem);
  });
  screen.querySelectorAll('[data-live3d-view]').forEach(button => {
    button.onclick = () => {
      engine?.preset(button.dataset.live3dView);
      screen.querySelectorAll('[data-live3d-view]').forEach(view => view.setAttribute('aria-pressed', String(view === button)));
    };
  });
  $('live3dReset').onclick = () => screen.querySelector('[data-live3d-view="overview"]').click();
  $('live3dZoomIn').onclick = () => engine?.zoom(0.82);
  $('live3dZoomOut').onclick = () => engine?.zoom(1.22);
  $('live3dCanvas').addEventListener('keydown', cameraKey);
  function cameraKey(event) {
    const actions = { ArrowLeft: () => engine?.rotate(-0.15), ArrowRight: () => engine?.rotate(0.15),
      '+': () => engine?.zoom(0.82), '=': () => engine?.zoom(0.82), '-': () => engine?.zoom(1.22),
      Home: () => engine?.preset('overview') };
    if (actions[event.key]) { event.preventDefault(); actions[event.key](); }
  }
  $('live3dRetry').onclick = () => {
    engine?.destroy();
    engine = undefined;
    delete stage.dataset.renderer;
    const canvas = $('live3dCanvas');
    canvas.replaceWith(canvas.cloneNode());
    $('live3dCanvas').addEventListener('keydown', cameraKey);
    $('live3dLoading').classList.remove('hidden');
    $('live3dFallback').classList.add('hidden');
    loadScene();
  };
  const previous = window.elMajdNativeEvent;
  window.elMajdNativeEvent = (type, data) => {
    previous(type, data);
    if (type === 'telemetry') {
      try { latest = JSON.parse(data); } catch { latest = null; }
      update();
    } else if (type === 'device_status' && ['offline', 'Delayed', 'No telemetry'].includes(data)) {
      latest = null;
      update();
    } else if (type === 'cloud_connection' || type === 'cloud_error') {
      if (!state.cloud) latest = null;
      update();
    }
  };
  addEventListener('elmajd-language', update);
  addEventListener('pagehide', () => { engine?.setActive(false); clearInterval(previewTimer); });
  addEventListener('pageshow', syncVisibility);
  update();
})();
