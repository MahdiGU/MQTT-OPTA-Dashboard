(() => {
  I18n.add({
    'Feed chains': 'Chaînes d’aliment',
    'Running feedback': 'Retours de marche',
    'Expansion inputs I1–I12': 'Entrées I1–I12 de l’extension',
    'Row 1': 'Rangée 1', 'Row 2': 'Rangée 2', 'Row 3': 'Rangée 3', 'Row 4': 'Rangée 4',
    'Level 1': 'Étage 1', 'Level 2': 'Étage 2', 'Level 3': 'Étage 3',
    'Chain running': 'En marche', 'Chain stopped': 'À l’arrêt', 'Chain status unavailable': 'Indisponible',
    'Waiting for expansion signals': 'En attente des signaux de l’extension',
    'No recent expansion reading': 'Aucune lecture récente de l’extension',
  });

  document.head.insertAdjacentHTML('beforeend', `<style>
    .feed-chain-row{margin:12px 0 0}
    .feed-chain-row h4{margin:0 0 6px;font-size:.78rem}
    .feed-chain-levels{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:6px}
    .feed-chain-tile{padding:8px 5px;border:1px solid var(--line);border-radius:10px;text-align:center;background:#f5f7f6}
    .feed-chain-tile strong,.feed-chain-tile small{display:block}
    .feed-chain-tile strong{font-size:.72rem}
    .feed-chain-tile small{color:var(--muted);font-size:.63rem}
    .feed-chain-state{display:block;margin-top:5px;font-weight:750;font-size:.65rem;color:var(--muted)}
    .feed-chain-state::before{content:'';display:inline-block;width:6px;height:6px;margin-right:4px;border-radius:50%;background:currentColor;vertical-align:1px}
    .feed-chain-tile[data-state="running"]{background:#eaf7ef;border-color:#b9dfc9}
    .feed-chain-tile[data-state="running"] .feed-chain-state{color:#08734f}
    .feed-chain-tile[data-state="stopped"] .feed-chain-state{color:#a23040}
    .feed-chain-summary{margin:4px 0;color:var(--muted);font-size:.72rem}
  </style>`);

  const rows = Array.from({ length: 4 }, (_, row) => {
    const levels = Array.from({ length: 3 }, (_, level) => {
      const input = row * 3 + level + 1;
      return `<div class="feed-chain-tile" data-input="${input}">
        <strong>Level ${level + 1}</strong><small>I${input}</small>
        <span class="feed-chain-state">Chain status unavailable</span>
      </div>`;
    }).join('');
    return `<section class="feed-chain-row"><h4>Row ${row + 1}</h4>
      <div class="feed-chain-levels">${levels}</div></section>`;
  }).join('');

  document.querySelector('#siloGrid').closest('.panel').insertAdjacentHTML('afterend', `
    <section class="panel" id="feedChainPanel" aria-labelledby="feedChainTitle">
      <div class="panel-head"><div><div class="eyebrow">Running feedback</div>
      <h3 id="feedChainTitle">Feed chains</h3></div><span class="hint">Expansion inputs I1–I12</span></div>
      <p id="feedChainSummary" class="feed-chain-summary">Waiting for expansion signals</p>
      ${rows}
    </section>`);

  const summary = document.querySelector('#feedChainSummary');
  const tiles = [...document.querySelectorAll('.feed-chain-tile')];
  let latest;
  let expiryTimer;
  const maxAgeMs = 20_000;

  function update() {
    clearTimeout(expiryTimer);
    const mask = latest?.feed_chains;
    const valid = Number.isInteger(mask) && mask >= 0 && mask <= 0xfff;
    const timestamp = Date.parse(latest?.captured_at ?? latest?.feed_chains_received_at);
    const remaining = maxAgeMs - Math.max(0, Date.now() - timestamp);
    const available = valid && state.cloud && latest.mqtt_status !== 'offline' && remaining > 0;
    summary.textContent = available ? 'Running feedback' :
      valid ? 'No recent expansion reading' : 'Waiting for expansion signals';
    tiles.forEach((tile, bit) => {
      const status = available ? ((mask & (1 << bit)) ? 'running' : 'stopped') : 'unavailable';
      tile.dataset.state = status;
      tile.querySelector('.feed-chain-state').textContent = {
        running: 'Chain running', stopped: 'Chain stopped', unavailable: 'Chain status unavailable',
      }[status];
    });
    if (available) expiryTimer = setTimeout(update, remaining + 1);
  }

  const previous = window.elMajdNativeEvent;
  window.elMajdNativeEvent = (type, data) => {
    previous(type, data);
    if (type === 'telemetry') {
      try { latest = JSON.parse(data); } catch { latest = undefined; }
      update();
    } else if (type === 'device_status' && ['offline', 'Delayed', 'No telemetry'].includes(data)) {
      latest = undefined;
      update();
    } else if (type === 'cloud_connection' || type === 'cloud_error') {
      if (!state.cloud) latest = undefined;
      update();
    }
  };

  document.querySelector('#logoutButton').addEventListener('click', () => {
    latest = undefined;
    update();
  });
})();
