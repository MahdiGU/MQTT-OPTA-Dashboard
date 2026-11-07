const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const root = path.resolve(__dirname, '../app/src/main/assets');
const server = http.createServer((request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
  const file = path.resolve(root, name);
  if (!file.startsWith(root + path.sep) || !fs.existsSync(file)) { response.writeHead(404); response.end(); return; }
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.svg': 'image/svg+xml', '.png': 'image/png' };
  response.setHeader('Content-Type', types[path.extname(file)] || 'text/plain');
  response.end(fs.readFileSync(file));
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({ headless: true,
    args: ['--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: 320, height: 900 }, reducedMotion: 'reduce' });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    await page.addInitScript(() => {
      window.designCalls = [];
      window.ElMajdNative = { hasSavedLogin: () => false, phase5Action: (...args) => designCalls.push(args), requestCloudHistory: () => {} };
    });
    const url = `http://127.0.0.1:${server.address().port}/`;
    await page.goto(url);
    await page.fill('#username', 'design-test@example.invalid');
    await page.fill('#password', 'ExamplePassword12!');
    await page.click('.login-designs [data-design-choice="atelier"]');
    assert.equal(await page.locator('html').getAttribute('data-design'), 'atelier');
    assert.equal(await page.locator('#username').inputValue(), 'design-test@example.invalid');
    assert.equal(await page.locator('#password').inputValue(), 'ExamplePassword12!');
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-design'), 'atelier', 'design persists across a new page load');
    const shared = { role: 'owner', house_id: 'design-test', settings: [{ warning_c: 30, critical_c: 33 }], cartons: [{ received: 100, consumed: 0, balance: 100 }], receipts: [], alarms: [] };
    await page.evaluate(data => {
      showApp();
      elMajdNativeEvent('cloud_connection', 'online');
      elMajdNativeEvent('connection', 'online');
      elMajdNativeEvent('phase5_data', JSON.stringify(data));
      elMajdNativeEvent('configuration', '{"chicken_count":100}');
      elMajdNativeEvent('production_history', JSON.stringify([{ id: 1, production_date: '2026-01-01', stock: 350, sortie: 50, mortality: 0, eggs: 100, chicken_count: 100, production_rate: 100 }]));
      document.getElementById('eggStock').value = '123';
      document.getElementById('eggSortie').value = '100';
    }, shared);

    const tabs = ['overview', 'status', 'live3d', 'alarms', 'production', 'configuration', 'connection'];
    let semanticColors;
    for (const design of ['emerald', 'atelier', 'clay']) {
      await page.click('.design-shortcut');
      const before = await page.evaluate(() => designCalls.length);
      await page.click(`#designPanel [data-design-choice="${design}"]`);
      assert.equal(await page.evaluate(() => designCalls.length), before, 'changing design must not call a cloud operation');
      assert.equal(await page.locator('html').getAttribute('data-design'), design);
      assert.equal(await page.locator(`[data-design-choice="${design}"][aria-pressed="true"]`).count(), 2);
      assert.equal(await page.locator('#eggStock').inputValue(), '123');
      assert.equal(await page.locator('#eggSortie').inputValue(), '100');
      await page.waitForFunction(() => document.querySelector('.identity img').complete && document.querySelector('.identity img').naturalWidth > 0);
      assert.match(await page.locator('.identity img').getAttribute('src'), new RegExp(`brand-${design}\\.svg$`));
      for (const width of [320, 390]) {
        await page.setViewportSize({ width, height: 900 });
        for (const tab of tabs) {
          await page.click(`[data-nav="${tab}"]`);
          assert.equal(await page.locator(`[data-screen="${tab}"]`).isVisible(), true);
          const overflow = await page.evaluate(() => ({ width: innerWidth, scroll: document.documentElement.scrollWidth,
            elements: [...document.querySelectorAll('.screen.active *')].filter(element => element.clientWidth && element.scrollWidth > element.clientWidth + 1)
              .map(element => ({ id: element.id, class: element.className, width: element.clientWidth, scroll: element.scrollWidth })).slice(0, 12) }));
          assert.ok(overflow.scroll <= overflow.width, `${design} ${tab} at ${width}px: ${JSON.stringify(overflow)}`);
          if (tab === 'status' || tab === 'live3d') {
            await page.evaluate(() => elMajdNativeEvent('telemetry', JSON.stringify({ ...sample, feed_chains: 2081, captured_at: new Date().toISOString(), mqtt_status: 'online' })));
          }
          if (tab === 'live3d') {
            await page.waitForSelector('#live3dViewport[data-renderer="ready"]');
            assert.equal(await page.locator('[data-live3d-item]').count(), 28);
            assert.equal(await page.locator('#live3dEggStock').textContent(), '350');
          }
          if (tab === 'connection') assert.equal(await page.locator('#sendCommand').isDisabled(), false);
        }
      }
      await page.click('[data-nav="status"]');
      await page.evaluate(() => elMajdNativeEvent('telemetry', JSON.stringify({ ...sample, feed_chains: 2081, captured_at: new Date().toISOString(), mqtt_status: 'online' })));
      const colors = await page.evaluate(() => ({
        fan: getComputedStyle(document.querySelector('.fan-card.on .fan')).borderTopColor,
        running: getComputedStyle(document.querySelector('.feed-chain-tile[data-state="running"] .feed-chain-state')).color,
        stopped: getComputedStyle(document.querySelector('.feed-chain-tile[data-state="stopped"] .feed-chain-state')).color,
        cooling: getComputedStyle(document.getElementById('coolingPad')).borderTopColor,
      }));
      if (!semanticColors) semanticColors = colors;
      else assert.deepEqual(colors, semanticColors, 'equipment status colors retain the same meaning in every design');
    }
    await page.evaluate(() => I18n.set('en'));
    await page.click('.design-shortcut');
    assert.match(await page.locator('#designPanel').innerText(), /Choose your interface/);
    assert.equal(await page.locator('html').getAttribute('data-design'), 'clay');
    await page.evaluate(() => localStorage.setItem('elmajd-design', 'invalid-design'));
    await page.reload();
    assert.equal(await page.locator('html').getAttribute('data-design'), 'emerald');
    assert.deepEqual(errors, []);
    console.log('PASS: three designs, saved preference, login/form/session preservation, all seven tabs at 320/390px, 3D viewer and consistent status colors');
  } finally { await browser.close(); server.close(); }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
