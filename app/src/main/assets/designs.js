(() => {
  const choices = [
    { id: 'emerald', name: 'Émeraude', description: 'Soft green · rounded cards · calm farm overview', color: '#edf6f0' },
    { id: 'atelier', name: 'Atelier', description: 'Cobalt blue · compact panels · clear operational data', color: '#eef3fa' },
    { id: 'clay', name: 'Argile', description: 'Warm cream · terracotta · spacious editorial layout', color: '#faf4e9' },
  ];
  I18n.add({
    'App design': 'Design de l’application', 'Choose your interface': 'Choisissez votre interface',
    'Three designs, one farm': 'Trois designs pour votre élevage',
    'Soft green · rounded cards · calm farm overview': 'Vert doux · cartes arrondies · vue apaisée de l’élevage',
    'Cobalt blue · compact panels · clear operational data': 'Bleu cobalt · panneaux compacts · données opérationnelles lisibles',
    'Warm cream · terracotta · spacious editorial layout': 'Crème et terracotta · typographie élégante · présentation aérée',
    'Design is saved on this phone. You can change it at any time.': 'Le design est mémorisé sur ce téléphone. Vous pouvez le modifier à tout moment.',
    'Choose a design': 'Choisir un design', 'Design saved': 'Design enregistré',
  });

  const icons = {
    overview: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3Z"/>',
    status: '<path d="M3 12h4l3-8 4 16 3-8h4"/>',
    live3d: '<path d="m12 2 9 5v10l-9 5-9-5V7Zm0 10L3 7m9 5 9-5m-9 5v10"/>',
    alarms: '<path d="M6 9a6 6 0 0 1 12 0v6l3 3H3l3-3Zm4 12h4"/>',
    production: '<path d="M4 20V10m8 10V4m8 16v-7M2 22h20"/>',
    configuration: '<path d="M4 6h16M4 12h16M4 18h16"/><circle cx="9" cy="6" r="2"/><circle cx="16" cy="12" r="2"/><circle cx="8" cy="18" r="2"/>',
    connection: '<path d="M3 8a14 14 0 0 1 18 0M6 12a9 9 0 0 1 12 0m-9 4a4 4 0 0 1 6 0"/><circle cx="12" cy="20" r="1"/>',
    eggs: '<path d="M12 3c-4 0-8 8-8 12a8 8 0 0 0 16 0c0-4-4-12-8-12Z"/>',
    rate: '<path d="m5 19 14-14"/><circle cx="7" cy="7" r="3"/><circle cx="17" cy="17" r="3"/>',
    flock: '<path d="M5 16c0-5 4-8 9-8l4-3v5l3 2-3 2c-1 5-6 7-10 5l-4 2 1-5Zm4 4v3m5-3v3"/><circle cx="15" cy="10" r=".6"/>',
  };
  const svg = name => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${icons[name]}</svg>`;
  document.querySelectorAll('[data-nav]').forEach(button => {
    button.querySelector('.nav-icon').innerHTML = svg(button.dataset.nav);
  });
  const metricIcons = [...document.querySelectorAll('[data-screen="overview"] .kpi-icon')];
  ['eggs', 'rate', 'flock'].forEach((name, index) => {
    if (metricIcons[index]) metricIcons[index].innerHTML = svg(name);
  });

  function selector(compact = false) {
    return `<div class="design-options ${compact ? 'design-options-compact' : ''}" role="group" aria-label="Choose a design">${choices.map(choice => `
      <button type="button" class="design-choice" data-design-choice="${choice.id}" aria-pressed="false">
        <span class="design-mini" data-mini-design="${choice.id}" aria-hidden="true"><i></i><b></b><em></em><em></em></span>
        <strong>${choice.name}</strong><small>${choice.description}</small><span class="design-check" aria-hidden="true">✓</span>
      </button>`).join('')}</div>`;
  }
  const configuration = document.querySelector('[data-screen="configuration"]');
  configuration.insertAdjacentHTML('afterbegin', `<section class="panel design-panel" id="designPanel">
    <div class="eyebrow">App design</div><h2>Choose your interface</h2>${selector()}
    <p class="design-note">Design is saved on this phone. You can change it at any time.</p>
    <p class="design-feedback" id="designFeedback" role="status" aria-live="polite"></p>
  </section>`);
  document.querySelector('.login-card').insertAdjacentHTML('beforeend', `<section class="login-designs"><span>App design</span>${selector(true)}</section>`);
  const shortcut = document.createElement('button');
  shortcut.type = 'button';
  shortcut.className = 'design-shortcut';
  shortcut.setAttribute('aria-label', 'Choose a design');
  shortcut.innerHTML = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M12 3a9 9 0 1 0 0 18h1a2 2 0 0 0 1-3.7 1.5 1.5 0 0 1 1-2.8h2a4 4 0 0 0 4-4C21 6.4 17 3 12 3Z"/><circle cx="8" cy="8" r="1"/><circle cx="13" cy="6.5" r="1"/><circle cx="6" cy="13" r="1"/></svg>';
  document.querySelector('.appbar').appendChild(shortcut);
  shortcut.onclick = () => {
    document.querySelector('[data-nav="configuration"]').click();
    document.getElementById('designPanel').scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  let selected = 'emerald';
  function apply(id, announce = false) {
    const choice = choices.find(item => item.id === id) || choices[0];
    selected = choice.id;
    document.documentElement.dataset.design = selected;
    try { localStorage.setItem('elmajd-design', selected); } catch { /* Continue with the selected design for this session. */ }
    document.querySelector('meta[name="theme-color"]').content = choice.color;
    document.querySelectorAll('.identity img,.login-brand img').forEach(image => {
      image.src = `brand-${selected}.svg`;
    });
    document.querySelectorAll('[data-design-choice]').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.designChoice === selected));
    });
    if (announce) document.getElementById('designFeedback').textContent = `${I18n.text('Design saved')} · ${choice.name}`;
    requestAnimationFrame(() => window.dispatchEvent(new Event('resize')));
  }
  document.querySelectorAll('[data-design-choice]').forEach(button => {
    button.onclick = () => apply(button.dataset.designChoice, true);
  });
  try { selected = localStorage.getItem('elmajd-design') || selected; } catch { /* Use the default design. */ }
  const query = new URLSearchParams(location.search);
  if (!native && query.has('preview') && choices.some(choice => choice.id === query.get('design'))) selected = query.get('design');
  if (!native && query.has('preview') && Number.isInteger(state.flock)) {
    window.elMajdNativeEvent('configuration', JSON.stringify({ chicken_count: state.flock }));
  }
  apply(selected);
  addEventListener('elmajd-language', () => {
    const feedback = document.getElementById('designFeedback');
    if (feedback.textContent) feedback.textContent = `${I18n.text('Design saved')} · ${choices.find(choice => choice.id === selected).name}`;
  });
})();
