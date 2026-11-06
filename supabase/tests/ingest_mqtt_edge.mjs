// Run with Node 24: node --experimental-strip-types supabase/tests/ingest_mqtt_edge.mjs
import assert from 'node:assert/strict';

let handler;
globalThis.Deno = {
  env: { get: (key) => ({
    EMQX_WEBHOOK_SECRET: 'test-secret',
    SUPABASE_URL: 'https://test.invalid',
    SUPABASE_SERVICE_ROLE_KEY: 'test-key',
  })[key] },
  serve: (callback) => { handler = callback; },
};

const requests = [];
globalThis.fetch = async (url, options) => {
  assert.match(url, /\/rest\/v1\/rpc\/ingest_mqtt_message$/);
  const body = JSON.parse(options.body);
  requests.push(body);
  if (body.target_device === 'unknown') {
    return Response.json({ accepted: false, error: 'Unknown or disabled MQTT device' });
  }
  if (body.target_topic === 'unregistered') {
    return Response.json({ accepted: false, error: 'Topic is not registered for this device' });
  }
  if (body.target_topic === 'opta/outputs' && body.normalized === null) {
    return Response.json({ accepted: false, error: 'Invalid telemetry payload' });
  }
  return Response.json({ accepted: true, kind: body.target_topic === 'opta/status' ? 'status' : 'telemetry' });
};

await import('../functions/ingest-mqtt/index.ts');
function post(clientid, topic, payload, secret = 'test-secret') {
  return handler(new Request('https://test.invalid/functions/v1/ingest-mqtt', {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-emqx-webhook-secret': secret },
    body: JSON.stringify({ clientid, topic, payload }),
  }));
}

assert.equal((await post('opta-control-01', 'opta/outputs', { seq: 8 })).status, 200);
assert.equal(requests[0].target_farm_slug, 'elmajd-poultry');
assert.equal(requests[0].normalized.seq, 8);
assert.equal(Object.hasOwn(requests[0].normalized.raw_payload, 'feed_chains'), false);
assert.equal((await post('opta-control-01', 'opta/status', 'online')).status, 200);
assert.equal(requests[1].target_status, 'online');
assert.equal(requests[1].normalized, null);
assert.equal((await post('unknown', 'opta/outputs', { seq: 9 })).status, 403);
assert.equal((await post('opta-control-01', 'unregistered', { seq: 9 })).status, 403);
assert.equal((await post('opta-control-01', 'opta/outputs', 'bad')).status, 400);
const before = requests.length;
assert.equal((await post('opta-control-01', 'opta/outputs', { seq: 9 }, 'wrong')).status, 401);
assert.equal(requests.length, before);
for (const [input, expected] of [[0, 0], [2081, 2081], [4095, 4095], [null, null],
  [-1, null], [4096, null], [1.5, null], ['7', null], [{ value: 7 }, null]]) {
  const response = await post('opta-control-01', 'opta/outputs', {
    seq: 10, i1: { temp_c: 22 }, feed_chains: input,
  });
  assert.equal(response.status, 200);
  assert.equal(requests.at(-1).normalized.temp_c, 22);
  assert.equal(requests.at(-1).normalized.raw_payload.feed_chains, expected);
  assert.equal(requests.at(-1).normalized.raw_payload.feed_chains_received_at, requests.at(-1).normalized.received_at);
}
console.log('single-request MQTT webhook checks passed');
