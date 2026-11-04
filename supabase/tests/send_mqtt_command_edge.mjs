// Run with Node 24: node --experimental-strip-types supabase/tests/send_mqtt_command_edge.mjs
import assert from 'node:assert/strict';

let handler;
globalThis.Deno = {
  env: { get: (key) => ({
    SUPABASE_URL: 'https://test.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'test-secret',
    EMQX_API_BASE_URL: 'https://broker.invalid/api/v5',
    EMQX_APP_ID: 'app-id',
    EMQX_APP_SECRET: 'app-secret',
  })[key] },
  serve: (callback) => { handler = callback; },
};

const calls = [];
let permission = { allowed: true, farm_id: 'farm-1', user_id: 'user-1', role: 'manager' };
globalThis.fetch = async (url, options) => {
  calls.push({ url, options });
  if (url.endsWith('/rest/v1/rpc/authorize_mqtt_command')) {
    assert.equal(options.headers.authorization, 'Bearer valid-jwt');
    assert.equal(options.headers.apikey, 'test-publishable');
    return Response.json(permission);
  }
  if (url.endsWith('/rest/v1/device_commands')) {
    const row = JSON.parse(options.body);
    assert.equal(row.requested_by, 'user-1');
    assert.equal(row.payload, 'D0 ON');
    assert.equal(row.qos, 0);
    assert.equal(row.retain, false);
    return Response.json([{ id: 'command-1' }]);
  }
  if (url.endsWith('/publish')) {
    const command = JSON.parse(options.body);
    assert.deepEqual(command, { topic: 'opta/cmd', payload: 'D0 ON', qos: 0, retain: false });
    return Response.json({ id: 'broker-message-1' });
  }
  if (url.includes('/rest/v1/device_commands?id=eq.command-1')) return Response.json({});
  throw new Error(`Unexpected fetch: ${url}`);
};

await import('../functions/send-mqtt-command/index.ts');
function post(payload) {
  return handler(new Request('https://test.invalid/functions/v1/send-mqtt-command', {
    method: 'POST',
    headers: {
      authorization: 'Bearer valid-jwt',
      apikey: 'test-publishable',
      'content-type': 'application/json',
    },
    body: JSON.stringify({ payload }),
  }));
}

const sent = await post(' d0   on ');
assert.equal(sent.status, 200);
assert.equal((await sent.json()).sent, true);
assert.equal(calls.length, 4);
assert.ok(calls.every(({ url }) => !url.includes('/auth/v1/user')));

calls.length = 0;
permission = { allowed: false };
const denied = await post('D0 ON');
assert.equal(denied.status, 403);
assert.equal(calls.length, 1);

calls.length = 0;
const invalid = await post('NOT A COMMAND');
assert.equal(invalid.status, 400);
assert.equal(calls.length, 0);
console.log('command authorization and QoS 0 checks passed');
