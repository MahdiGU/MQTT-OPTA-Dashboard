const http = require('node:http');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');
const { chromium } = require(process.env.PLAYWRIGHT_MODULE || 'playwright');
const assets = path.resolve(__dirname, '../app/src/main/assets');
const server = http.createServer((request, response) => {
  const name = new URL(request.url, 'http://localhost').pathname.slice(1) || 'index.html';
  const file = path.resolve(assets, name);
  if (!file.startsWith(assets + path.sep) || !fs.existsSync(file)) {
    response.writeHead(404);
    response.end();
    return;
  }
  const types = { '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css', '.png': 'image/png' };
  response.setHeader('Content-Type', types[path.extname(file)] || 'text/plain');
  response.end(fs.readFileSync(file));
});

(async () => {
  await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
  const browser = await chromium.launch({
    headless: true,
    args: ['--enable-webgl', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
    ...(process.env.BROWSER_EXECUTABLE ? { executablePath: process.env.BROWSER_EXECUTABLE } : {}),
  });
  try {
    const page = await browser.newPage({ viewport: { width: Number(process.env.UI_WIDTH) || 390, height: 844 } });
    await page.clock.install();
    const errors = [];
    const external = [];
    page.on('pageerror', error => errors.push(error.message));
    page.on('request', request => {
      if (request.url().startsWith('http') && !request.url().startsWith('http://127.0.0.1:')) external.push(request.url());
    });
    await page.addInitScript(() => {
      window.ElMajdNative = { hasSavedLogin: () => false, phase5Action: () => {}, requestCloudHistory: () => {}, signOut: () => {} };
    });
    await page.goto(`http://127.0.0.1:${server.address().port}/`);
    assert.equal(await page.locator('script[src="live3d-scene.bundle.js"]').count(), 0, '3D loads only when its tab opens');
    await page.evaluate(() => { showApp(); elMajdNativeEvent('cloud_connection', 'online'); });
    await page.click('[data-nav="live3d"]');
    await page.waitForFunction(() => document.getElementById('live3dViewport').dataset.renderer === 'ready', { timeout: 30000 });
    assert.equal(await page.locator('[data-live3d-item]').count(), 28);
    assert.equal(await page.locator('[data-live3d-item][data-state="unavailable"]').count(), 28);
    const inventory = page.locator('[data-live3d-item="egg-depot"]');
    const records = rows => page.evaluate(rows => elMajdNativeEvent('production_history', JSON.stringify(rows)), rows);
    const record = stock => ({ id: 2, production_date: '2026-01-02', stock, sortie: 50, eggs: 100, mortality: 0, chicken_count: 100, production_rate: 100 });
    await page.evaluate(() => elMajdNativeEvent('configuration', '{"chicken_count":100}'));
    await records([record(350)]);
    assert.equal(await page.locator('#live3dEggStock').textContent(), '350');
    assert.equal(await page.locator('#live3dStockCapacity').textContent(), '700');
    assert.equal(await page.locator('#live3dStockTrays').textContent(), '12');
    assert.equal(await page.locator('#live3dStockMeter').getAttribute('aria-valuenow'), '50');
    const send = (reading, age = 0) => page.evaluate(({ reading, age }) => elMajdNativeEvent('telemetry', JSON.stringify({
      ...sample, captured_at: new Date(Date.now() - age).toISOString(), mqtt_status: 'online', ...reading,
    })), { reading, age });
    await send({ feed_chains: 2081 });
    assert.equal(await page.locator('#live3dFanCount').textContent(), '2 / 8');
    assert.equal(await page.locator('#live3dFeedCount').textContent(), '3 / 12');
    assert.equal(await page.locator('#live3dPadCount').textContent(), '2 / 2');
    for (const id of ['fan-1', 'fan-4', 'feed-0', 'feed-5', 'feed-11', 'pad-0', 'pad-1']) {
      assert.equal(await page.locator(`[data-live3d-item="${id}"]`).getAttribute('data-state'), 'running');
    }
    assert.equal(await page.locator('[data-live3d-item="feed-1"]').getAttribute('data-state'), 'stopped');
    await send({ feed_chains: 2081, inputs: { I2: 1, I3: 0, I4: 1, I5: 1, I6: 0, I7: 1, I8: 0 } });
    for (const id of ['cistern-0', 'cistern-2', 'silo-0']) {
      assert.equal(await page.locator(`[data-live3d-item="${id}"]`).getAttribute('data-state'), 'running');
    }
    for (const id of ['cistern-1', 'silo-1']) {
      assert.equal(await page.locator(`[data-live3d-item="${id}"]`).getAttribute('data-state'), 'stopped');
    }
    await page.click('[data-live3d-item="cistern-2"]');
    assert.match(await page.locator('#live3dSelectedSource').textContent(), /I4/);
    await page.click('#live3dLevelHistory');
    assert.equal(await page.locator('#historyDialog').getAttribute('data-sensor'), 'I4');
    await page.click('#closeChart');
    await page.click('[data-live3d-item="silo-1"]');
    assert.match(await page.locator('#live3dSelectedSource').textContent(), /I6/);
    await inventory.click();
    assert.match(await page.locator('#live3dSelectedName').textContent(), /Dépôt/);
    assert.equal(await page.locator('[data-live3d-view="depot"]').getAttribute('aria-pressed'), 'true');
    await page.click('#live3dOpenProduction');
    assert.equal(await page.locator('[data-screen="production"]').isVisible(), true);
    await page.click('[data-nav="live3d"]');
    await records([record(700)]);
    assert.equal(await page.locator('#live3dStockMeter').getAttribute('aria-valuenow'), '100');
    await records([record(701)]);
    assert.equal(await inventory.getAttribute('data-state'), 'overflow');
    await records([record(0)]);
    assert.equal(await inventory.getAttribute('data-state'), 'empty');
    assert.equal(await page.locator('#live3dStockMeter').getAttribute('aria-valuenow'), '0');
    await records([record(null)]);
    assert.equal(await inventory.getAttribute('data-state'), 'unavailable');
    await records([record(350)]);
    await page.evaluate(() => elMajdNativeEvent('configuration', '{}'));
    assert.equal(await inventory.getAttribute('data-state'), 'unavailable');
    assert.equal(await page.locator('#live3dStockMeter').getAttribute('aria-valuenow'), null);
    await page.evaluate(() => elMajdNativeEvent('configuration', '{"chicken_count":0}'));
    assert.equal(await inventory.getAttribute('data-state'), 'overflow');
    await page.evaluate(() => elMajdNativeEvent('configuration', '{"chicken_count":200}'));
    assert.equal((await page.locator('#live3dStockCapacity').textContent()).replace(/\s/g, ''), '1400');
    assert.equal(await page.locator('#live3dStockMeter').getAttribute('aria-valuenow'), '25');
    // The latest calendar date wins, even when backend rows arrive in another order.
    const older = { ...record(10), id: 1, production_date: '2026-01-01' };
    await records([older, record(350)]);
    assert.equal(await page.locator('#live3dEggStock').textContent(), '350');
    await records([older]); // Latest row deleted; the prior saved stock becomes the reference.
    assert.equal(await page.locator('#live3dEggStock').textContent(), '10');
    await records([]);
    assert.equal(await inventory.getAttribute('data-state'), 'unavailable');
    await records([record(350)]);
    await page.click('[data-live3d-item="feed-5"]');
    assert.match(await page.locator('#live3dSelectedName').textContent(), /Rangée 2.*Étage 3/);
    assert.match(await page.locator('#live3dSelectedSource').textContent(), /I6/);
    await page.click('[data-live3d-view="fans"]');
    assert.equal(await page.locator('[data-live3d-view="fans"]').getAttribute('aria-pressed'), 'true');
    await page.evaluate(() => scrollTo({ top: 0, behavior: 'instant' }));
    await page.clock.runFor(100);
    const canvasBounds = await page.locator('#live3dCanvas').boundingBox();
    // Every fan in the 2 + (2 x 2) + 2 arrangement must be selectable from the front.
    const fanPicks = [
      [1, 0.164, 0.6], [2, 0.283, 0.6], [3, 0.438, 0.6], [4, 0.562, 0.6],
      [5, 0.438, 0.45], [6, 0.562, 0.45], [7, 0.717, 0.6], [8, 0.836, 0.6],
    ];
    for (const [fan, x, y] of fanPicks) {
      await page.mouse.click(canvasBounds.x + canvasBounds.width * x, canvasBounds.y + canvasBounds.height * y);
      assert.equal(await page.locator('#live3dSelectedName').textContent(), `Ventilateur ${fan}`);
    }
    await page.click('[data-live3d-item="feed-5"]');
    await page.click('#live3dZoomIn');
    await page.click('#live3dZoomOut');
    await page.locator('#live3dCanvas').focus();
    await page.keyboard.press('ArrowLeft');
    await page.keyboard.press('Home');
    await page.evaluate(() => I18n.set('en'));
    assert.match(await page.locator('#live3dSelectedName').textContent(), /Row 2.*Level 3/);
    await page.evaluate(() => I18n.set('fr'));
    await page.click('#live3dReset');
    await page.locator('[data-screen="live3d"]').scrollIntoViewIfNeeded();
    await page.evaluate(() => scrollTo(0, 0));
    await page.waitForTimeout(300);
    if (process.env.UI_SCREENSHOT) await page.screenshot({ path: process.env.UI_SCREENSHOT, fullPage: true });
    // A subsequent frame replaces the bitmask; zeros must never inherit earlier running states.
    await send({ feed_chains: 0, outputs: { D0: 0, D1: 0, D2: 0, D3: 0 }, leds: { L0: 0, L1: 0, L2: 0, L3: 0 }, inputs: { ...await page.evaluate(() => sample.inputs), I7: 0 } });
    assert.equal(await page.locator('[data-live3d-item][data-state="stopped"]').count(), 27);
    await send({ feed_chains: 4096 });
    assert.equal(await page.locator('[data-live3d-item^="feed-"][data-state="unavailable"]').count(), 12);
    await send({ feed_chains: null });
    assert.equal(await page.locator('#live3dFeedCount').textContent(), '— / 12');
    await send({ feed_chains: 2081 }, 21000);
    assert.equal(await page.locator('[data-live3d-item][data-state="unavailable"]').count(), 27);
    await send({ feed_chains: 2081 });
    await page.click('[data-nav="overview"]');
    await page.waitForFunction(() => document.getElementById('live3dViewport').dataset.active === 'false');
    await page.clock.fastForward(21000);
    assert.equal(await page.locator('[data-live3d-item][data-state="unavailable"]').count(), 27, 'running feedback expires without another message');
    await send({ feed_chains: 2081 });
    await page.evaluate(() => elMajdNativeEvent('cloud_error', 'Offline'));
    assert.equal(await page.locator('[data-live3d-item][data-state="unavailable"]').count(), 27);
    assert.equal(await page.locator('#live3dEggStock').textContent(), '350', 'saved inventory remains visible with offline context');
    await page.evaluate(() => elMajdNativeEvent('cloud_connection', 'online'));
    await send({ feed_chains: 2081 });
    await page.evaluate(() => elMajdNativeEvent('device_status', 'offline'));
    assert.equal(await page.locator('[data-live3d-item][data-state="unavailable"]').count(), 27);
    await page.evaluate(() => { window.productionPageRows = [{ stock: 9999, production_date: '2025-12-01' }]; });
    await page.evaluate(() => I18n.set('en'));
    assert.equal(await page.locator('#live3dEggStock').textContent(), '350', 'history browsing cannot replace latest stock');
    await page.evaluate(() => { e.app.classList.add('hidden'); });
    await page.waitForFunction(() => document.getElementById('live3dEggStock').textContent === '—');
    await page.evaluate(() => elMajdNativeEvent('configuration', '{"chicken_count":999}'));
    await records([record(999)]);
    assert.equal(await page.locator('#live3dEggStock').textContent(), '—', 'late events after logout must not repopulate inventory');
    assert.equal(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), true);
    assert.deepEqual(errors, []);
    assert.deepEqual(external, []);
    await page.close();

    // Verify the same classic script bundle in the Android file:// loading environment.
    const local = await browser.newPage({ viewport: { width: 390, height: 844 } });
    const localErrors = [];
    local.on('pageerror', error => localErrors.push(error.message));
    await local.goto(require('node:url').pathToFileURL(path.join(assets, 'index.html')).href + '?preview');
    await local.click('[data-nav="live3d"]');
    await local.waitForFunction(() => document.getElementById('live3dViewport').dataset.renderer === 'ready');
    assert.match(await local.locator('#live3dDataState').textContent(), /simulé/);
    await local.waitForTimeout(250);
    if (process.env.UI_SCREENSHOT) await local.screenshot({ path: process.env.UI_SCREENSHOT, fullPage: true });
    assert.deepEqual(localErrors, []);
    await local.close();

    const fallback = await browser.newPage();
    await fallback.addInitScript(() => {
      const original = HTMLCanvasElement.prototype.getContext;
      HTMLCanvasElement.prototype.getContext = function (kind, ...args) {
        return kind.startsWith('webgl') ? null : original.call(this, kind, ...args);
      };
    });
    await fallback.goto(`http://127.0.0.1:${server.address().port}/?preview`);
    await fallback.click('[data-nav="live3d"]');
    await fallback.waitForSelector('#live3dFallback:not(.hidden)');
    assert.equal(await fallback.locator('[data-live3d-item]').count(), 28, 'equipment remains accessible without WebGL');
    await fallback.close();
    console.log('PASS: 28 interactive objects, exact I/O, cistern/silo history, depot stock/flock/edits/deletion/overflow/logout, fan picking, expiry, offline loading and WebGL fallback');
  } finally {
    await browser.close();
    server.close();
  }
})().catch(error => { console.error(error); server.close(); process.exitCode = 1; });
