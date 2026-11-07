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
    'Cooling active': 'Refroidissement actif',
    'Stopped / commanded off': 'À l’arrêt / commande inactive',
    'No recent data': 'Sans données récentes', 'Select equipment': 'Sélectionner un équipement',
    'Equipment details': 'Détails de l’équipement', 'Tap the model or choose an item below.': 'Touchez le modèle ou choisissez un élément ci-dessous.',
    'Front view · 2 + (2 × 2) + 2': 'Vue de face · 2 + (2 × 2) + 2',
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
    'Water cisterns': 'Citernes d’eau', 'Exterior silos': 'Silos extérieurs', 'Egg depot': 'Dépôt d’œufs',
    'Water': 'Eau', 'Silos': 'Silos', 'Depot': 'Dépôt',
    'Full': 'Plein', 'Empty': 'Vide', 'Binary level feedback': 'Retour de niveau binaire',
    'Silo 1': 'Silo 1', 'Silo 2': 'Silo 2',
    'Inside the poultry house': 'À l’intérieur du bâtiment', 'Outside the poultry house': 'À l’extérieur du bâtiment',
    'View level history': 'Voir l’historique du niveau', 'Open production': 'Ouvrir la production',
    'Saved egg stock': 'Stock d’œufs enregistré', 'Eggs stored': 'Œufs stockés',
    'Trays with eggs': 'Plateaux avec œufs', 'One-week capacity': 'Capacité d’une semaine',
    'Latest stock date': 'Date du dernier stock', 'Capacity rule': 'Règle de capacité',
    'Actual flock × 7 eggs · 30 eggs per tray': 'Effectif actuel × 7 œufs · 30 œufs par plateau',
    'No saved stock entry': 'Aucun stock enregistré', 'Configure the actual flock to calculate capacity.': 'Configurez l’effectif actuel pour calculer la capacité.',
    'Storage available': 'Place disponible', 'Depot full': 'Dépôt plein', 'Capacity exceeded': 'Capacité dépassée',
    'Saved stock unavailable': 'Stock enregistré indisponible', 'Saved records': 'Données enregistrées',
    'Offline · last saved stock': 'Hors ligne · dernier stock enregistré',
    'Could not refresh saved stock': 'Actualisation du stock impossible',
    'Tray stacks are a scaled illustration of saved egg stock.': 'Les piles de plateaux illustrent le stock d’œufs à une échelle adaptée.',
    'Stock uses the latest production entry, including edits and deletions.': 'Le stock suit la dernière saisie de production, y compris les modifications et suppressions.',
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
    ...Array.from({ length: 3 }, (_, index) => ({
      id: `cistern-${index}`, kind: 'cistern', title: `Cistern ${index + 1}`, short: `C${index + 1}`, source: `I${index + 2}`,
    })),
    ...Array.from({ length: 2 }, (_, index) => ({
      id: `silo-${index}`, kind: 'silo', title: `Silo ${index + 1}`, short: `S${index + 1}`, source: `I${index + 5}`,
    })),
    { id: 'egg-depot', kind: 'depot', title: 'Egg depot', short: 'Egg depot', source: 'Stock' },
  ];
  const icon = {
    fan: '<circle cx="12" cy="12" r="9"/><path d="M12 12C5 9 7 3 11 6S15 10 12 12C15 5 21 7 18 11S14 15 12 12C19 15 17 21 13 18S9 14 12 12C9 19 3 17 6 13S10 9 12 12Z"/>',
    feed: '<rect x="2" y="7" width="20" height="10" rx="5"/><circle cx="7" cy="12" r="2"/><circle cx="17" cy="12" r="2"/><path d="M8 7h2m3 0h2M8 17h2m3 0h2"/>',
    pad: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 4v16M12 4v16M17 4v16M3 9h18M3 15h18"/>',
    cistern: '<ellipse cx="12" cy="5" rx="7" ry="3"/><path d="M5 5v14c0 4 14 4 14 0V5M5 12c0 4 14 4 14 0"/>',
    silo: '<path d="m5 7 7-5 7 5v10l-7 5-7-5ZM5 7h14M5 17h14M7 19v4m10-4v4"/>',
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
        <div data-kind="pad" id="live3dPadSummary">${svg('pad')}<span>Pads</span><strong id="live3dPadCount">— / 2</strong><small>Shared I7 auxiliary feedback</small></div>
      </div>
      <section class="live3d-model" aria-label="3D house">
        <div class="live3d-viewbar" role="group" aria-label="Camera view">
          <button type="button" data-live3d-view="overview" aria-pressed="true">Model overview</button>
          <button type="button" data-live3d-view="top" aria-pressed="false">Top view</button>
          <button type="button" data-live3d-view="fans" aria-pressed="false">Fan wall</button>
          <button type="button" data-live3d-view="pads" aria-pressed="false">Cooling pads</button>
          <button type="button" data-live3d-view="cisterns" aria-pressed="false">Water</button>
          <button type="button" data-live3d-view="silos" aria-pressed="false">Silos</button>
          <button type="button" data-live3d-view="depot" aria-pressed="false">Depot</button>
        </div>
        <div class="live3d-viewport" id="live3dViewport">
          <canvas id="live3dCanvas" tabindex="0" aria-label="Interactive poultry house. Arrow keys rotate. Plus and minus zoom. Home resets the view."></canvas>
          <div class="live3d-loading" id="live3dLoading">Loading the 3D house…</div>
          <div class="live3d-fallback hidden" id="live3dFallback" role="status"><p>3D is unavailable on this device. Equipment status is available below.</p><button type="button" id="live3dRetry">Retry 3D</button></div>
          <span class="live3d-model-label">ELMAJD <small>Reference model</small></span>
          <div class="live3d-zoom"><button type="button" id="live3dZoomIn" aria-label="Zoom in">+</button><button type="button" id="live3dZoomOut" aria-label="Zoom out">−</button><button type="button" id="live3dReset" aria-label="Reset view">⌂</button></div>
        </div>
        <p class="live3d-gesture" id="live3dGesture">Drag to rotate · pinch to zoom · two fingers to pan</p>
        <div class="live3d-legend"><span data-state="running">Running / commanded on</span><span data-state="cooling">Cooling active</span><span data-state="stopped">Stopped / commanded off</span><span data-state="unavailable">No recent data</span></div>
      </section>
      <section class="live3d-detail" id="live3dDetail" aria-live="polite" data-state="unavailable">
        <div class="eyebrow">Equipment details</div><h3 id="live3dSelectedName">Select equipment</h3>
        <strong id="live3dSelectedState"></strong><p id="live3dSelectedSource">Tap the model or choose an item below.</p>
        <div class="live3d-detail-actions"><button type="button" id="live3dLevelHistory" class="hidden">View level history</button><button type="button" id="live3dOpenProduction" class="hidden">Open production</button></div>
      </section>
      <section class="panel live3d-picker"><div class="panel-head"><h3>Water cisterns</h3><span class="hint">I2–I4</span></div>
        <div class="live3d-cisterns">${tiles('cistern')}</div><p class="live3d-note">Inside the poultry house</p></section>
      <section class="panel live3d-picker"><div class="panel-head"><h3>Exterior silos</h3><span class="hint">I5–I6</span></div>
        <div class="live3d-pads">${tiles('silo')}</div><p class="live3d-note">Outside the poultry house</p></section>
      <section class="panel live3d-depot-panel"><div class="panel-head"><h3>Egg depot</h3><span class="hint" id="live3dStockConnection">Saved records</span></div>
        <button type="button" class="live3d-inventory" data-live3d-item="egg-depot" data-state="unavailable" aria-pressed="false">
          <span>Saved egg stock</span><strong id="live3dEggStock">—</strong><span class="live3d-item-state" id="live3dStockState">Saved stock unavailable</span>
          <div class="live3d-stock-meter" id="live3dStockMeter" role="meter" aria-label="Egg depot" aria-valuemin="0" aria-valuemax="100"><i id="live3dStockFill"></i></div>
          <div class="live3d-stock-stats"><div><span>Trays with eggs</span><strong id="live3dStockTrays">—</strong></div><div><span>One-week capacity</span><strong id="live3dStockCapacity">—</strong></div></div>
          <small><span>Latest stock date</span> · <span id="live3dStockDate">—</span></small>
        </button><p class="live3d-note">Actual flock × 7 eggs · 30 eggs per tray</p><p class="live3d-note">Tray stacks are a scaled illustration of saved egg stock.</p>
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
  let stockRecord = null;
  let flockCount = null;
  let stockLoaded = false;
  let stockError = false;
  let depotReading;

  function wholeNumber(value) {
    if (typeof value !== 'number' && typeof value !== 'string') return null;
    if (typeof value === 'string' && !/^\d+$/.test(value)) return null;
    const number = Number(value);
    return Number.isSafeInteger(number) && number >= 0 ? number : null;
  }
  function inventoryReading() {
    const stock = wholeNumber(stockRecord?.stock);
    const capacity = flockCount === null || !Number.isSafeInteger(flockCount * 7) ? null : flockCount * 7;
    const available = stock !== null && capacity !== null;
    const overflow = available && stock > capacity;
    let fill = 0;
    if (available) fill = capacity > 0 ? Math.min(1, stock / capacity) : stock > 0 ? 1 : 0;
    const status = !available ? 'unavailable' : stock === 0 ? 'empty' : overflow ? 'overflow' : 'stored';
    return { stock, capacity, available, overflow, fill, status,
      trays: stock === null ? null : Math.ceil(stock / 30),
      capacityTrays: capacity === null ? null : Math.ceil(capacity / 30) };
  }
  function depotLabel() {
    if (!depotReading?.available) return I18n.text('Saved stock unavailable');
    if (depotReading.overflow) return I18n.text('Capacity exceeded');
    if (!depotReading.stock) return I18n.text('Empty');
    return I18n.text(depotReading.fill >= 1 ? 'Depot full' : 'Storage available');
  }
  function renderInventory() {
    depotReading = inventoryReading();
    const number = value => value === null ? '—' : value.toLocaleString(I18n.locale());
    $('live3dEggStock').textContent = number(depotReading.stock);
    $('live3dStockTrays').textContent = number(depotReading.trays);
    $('live3dStockCapacity').textContent = number(depotReading.capacity);
    $('live3dStockDate').textContent = stockRecord?.production_date || '—';
    let label = depotLabel();
    if (!stockRecord) label = I18n.text(stockLoaded ? 'No saved stock entry' : 'Saved stock unavailable');
    else if (flockCount === null) label = I18n.text('Configure the actual flock to calculate capacity.');
    $('live3dStockState').textContent = depotReading.available ? `${Math.round(depotReading.fill * 100)}% · ${label}` : label;
    $('live3dStockConnection').textContent = I18n.text(stockError ? 'Could not refresh saved stock' : state.cloud ? 'Saved records' : 'Offline · last saved stock');
    const tile = tileNodes.get('egg-depot');
    tile.dataset.state = depotReading.status;
    tile.setAttribute('aria-label', `${I18n.text('Egg depot')} · ${number(depotReading.stock)} ${I18n.text('Eggs stored')} · ${label}`);
    $('live3dStockFill').style.width = `${depotReading.fill * 100}%`;
    const meter = $('live3dStockMeter');
    if (depotReading.available) meter.setAttribute('aria-valuenow', String(Math.round(depotReading.fill * 100)));
    else meter.removeAttribute('aria-valuenow');
    meter.setAttribute('aria-valuetext', `${number(depotReading.stock)} / ${number(depotReading.capacity)} · ${label}`);
    statuses['egg-depot'] = depotReading.status;
    engine?.updateInventory(depotReading);
    details();
  }

  const title = item => item.kind === 'feed'
    ? `${I18n.text(`Row ${item.row}`)} · ${I18n.text(`Level ${item.level}`)}`
    : I18n.text(item.title);
  function stateLabel(item, status) {
    if (item.kind === 'depot') return depotLabel();
    if (status === 'unavailable') return I18n.text('No recent data');
    if (item.kind === 'cistern' || item.kind === 'silo') return I18n.text(status === 'running' ? 'Full' : 'Empty');
    if (item.kind === 'fan') return I18n.text(status === 'running' ? 'Control active' : 'Control inactive');
    return I18n.text(status === 'running' ? 'Running confirmed' : 'Stopped');
  }
  function details() {
    const item = equipment.find(candidate => candidate.id === selected);
    if (!item) return;
    $('live3dSelectedName').textContent = title(item);
    $('live3dSelectedState').textContent = stateLabel(item, statuses[item.id]);
    $('live3dDetail').dataset.state = statuses[item.id];
    $('live3dDetail').dataset.kind = item.kind;
    const level = item.kind === 'cistern' || item.kind === 'silo';
    $('live3dLevelHistory').classList.toggle('hidden', !level);
    $('live3dOpenProduction').classList.toggle('hidden', item.kind !== 'depot');
    if (item.kind === 'depot') {
      $('live3dSelectedSource').textContent = `${I18n.text('Latest stock date')} · ${stockRecord?.production_date || '—'} · ${I18n.text('Actual flock × 7 eggs · 30 eggs per tray')}`;
      return;
    }
    const descriptions = {
      fan: 'Fan state follows the relay or LED control. Rotation feedback is not installed.',
      feed: 'Feed-chain running feedback from expansion input', pad: 'Shared I7 auxiliary feedback',
      cistern: 'Binary level feedback', silo: 'Binary level feedback',
    };
    $('live3dSelectedSource').textContent = `${item.kind === 'feed' ? 'EXT · ' : ''}${item.source} · ${I18n.text(descriptions[item.kind])}`;
  }
  function choose(id, focus = true) {
    if (!tileNodes.has(id)) return;
    if (focus) {
      const item = equipment.find(candidate => candidate.id === id);
      const views = { fan: 'fans', cistern: 'cisterns', silo: 'silos', depot: 'depot', pad: 'pads', feed: 'overview' };
      screen.querySelector(`[data-live3d-view="${views[item.kind]}"]`).click();
    }
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
      if (item.kind === 'depot') continue;
      let signal;
      if (available) {
        if (item.kind === 'fan') signal = latest[item.section]?.[item.key];
        else if (item.kind === 'pad') signal = latest.inputs?.I7;
        else if (item.kind === 'cistern' || item.kind === 'silo') signal = latest.inputs?.[item.source];
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
    $('live3dPadSummary').dataset.state = statuses['pad-0'];
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
      engine.updateInventory(depotReading);
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
          mqtt_status: 'online', inputs: { ...sample.inputs, I2: 1, I3: 0, I4: 1, I5: 1, I6: 0, I7: 1 } };
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
    if (e.app.classList.contains('hidden')) {
      latest = null;
      stockRecord = null;
      flockCount = null;
      stockLoaded = false;
      stockError = false;
      renderInventory();
      update();
    }
    syncVisibility();
  }).observe(e.app, { attributes: true, attributeFilter: ['class'] });
  document.addEventListener('visibilitychange', () => { update(); syncVisibility(); });
  screen.querySelectorAll('[data-live3d-item]').forEach(button => {
    button.onclick = () => choose(button.dataset.live3dItem);
  });
  screen.querySelectorAll('[data-live3d-view]').forEach(button => {
    button.onclick = () => {
      stage.dataset.view = button.dataset.live3dView;
      $('live3dGesture').textContent = I18n.text(button.dataset.live3dView === 'fans'
        ? 'Front view · 2 + (2 × 2) + 2' : 'Drag to rotate · pinch to zoom · two fingers to pan');
      engine?.preset(button.dataset.live3dView);
      screen.querySelectorAll('[data-live3d-view]').forEach(view => view.setAttribute('aria-pressed', String(view === button)));
    };
  });
  $('live3dReset').onclick = () => screen.querySelector('[data-live3d-view="overview"]').click();
  $('live3dLevelHistory').onclick = () => {
    const item = equipment.find(candidate => candidate.id === selected);
    if (item && (item.kind === 'cistern' || item.kind === 'silo')) $(`asset-${item.source}`).click();
  };
  $('live3dOpenProduction').onclick = () => document.querySelector('[data-nav="production"]').click();
  $('live3dZoomIn').onclick = () => engine?.zoom(0.82);
  $('live3dZoomOut').onclick = () => engine?.zoom(1.22);
  $('live3dCanvas').addEventListener('keydown', cameraKey);
  function cameraKey(event) {
    const actions = { ArrowLeft: () => engine?.rotate(-0.15), ArrowRight: () => engine?.rotate(0.15),
      '+': () => engine?.zoom(0.82), '=': () => engine?.zoom(0.82), '-': () => engine?.zoom(1.22),
      Home: () => $('live3dReset').click() };
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
      renderInventory();
      update();
    } else if (type === 'production_history' && state.cloud && !e.app.classList.contains('hidden')) {
      const rows = Array.isArray(state.rows) ? state.rows : [];
      stockRecord = [...rows].sort((a, b) => String(b.production_date).localeCompare(String(a.production_date)))[0] || null;
      stockLoaded = true;
      stockError = false;
      renderInventory();
    } else if (type === 'configuration' && state.cloud && !e.app.classList.contains('hidden')) {
      try { flockCount = wholeNumber(JSON.parse(data).chicken_count); } catch { flockCount = null; }
      renderInventory();
    } else if (type === 'production_history_error') {
      stockError = true;
      renderInventory();
    }
  };
  addEventListener('elmajd-language', () => { update(); renderInventory(); });
  addEventListener('pagehide', () => { engine?.setActive(false); clearInterval(previewTimer); });
  addEventListener('pageshow', syncVisibility);
  if (preview) {
    flockCount = wholeNumber(state.flock);
    stockRecord = [...state.rows].sort((a, b) => String(b.production_date).localeCompare(String(a.production_date)))[0] || null;
    stockLoaded = true;
  }
  renderInventory();
  update();
  if (preview && location.hash === '#live3d') nav.click();
})();
