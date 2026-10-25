import {
  jsonResponse,
  readJson,
  requireEnvironment,
  requireSupabaseSecretKey,
} from "../_shared/http.ts";

const FARM_SLUG = Deno.env.get("FARM_SLUG")?.trim() || "elmajd-poultry";

type JsonObject = Record<string, unknown>;

function object(value: unknown): JsonObject {
  return value !== null && typeof value === "object" && !Array.isArray(value)
    ? value as JsonObject
    : {};
}

function finiteNumber(value: unknown): number | null {
  const number = typeof value === "number" ? value : Number(value);
  return Number.isFinite(number) ? number : null;
}

function integer(value: unknown): number | null {
  const number = finiteNumber(value);
  return number === null ? null : Math.trunc(number);
}

function bit(value: unknown): boolean | null {
  if (value === true || value === 1 || value === "1") return true;
  if (value === false || value === 0 || value === "0") return false;
  return null;
}

function fiveMinuteBucket(date: Date): string {
  const ms = 5 * 60 * 1000;
  return new Date(Math.floor(date.getTime() / ms) * ms).toISOString();
}

async function parseBody(request: Request): Promise<JsonObject> {
  const contentType = request.headers.get("content-type") || "";
  if (contentType.includes("application/json")) return object(await request.json());
  const text = await request.text();
  try {
    return object(JSON.parse(text));
  } catch {
    return { payload: text };
  }
}

function parsePayload(value: unknown): unknown {
  if (typeof value !== "string") return value;
  try {
    return JSON.parse(value);
  } catch {
    return value.trim();
  }
}

Deno.serve(async (request) => {
  if (request.method !== "POST") {
    return jsonResponse({ error: "Method not allowed" }, 405);
  }

  try {
    const expectedSecret = requireEnvironment("EMQX_WEBHOOK_SECRET");
    if (request.headers.get("x-emqx-webhook-secret") !== expectedSecret) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const supabaseUrl = requireEnvironment("SUPABASE_URL");
    const serviceRoleKey = requireSupabaseSecretKey();
    const envelope = await parseBody(request);
    const topic = String(envelope.topic || "opta/outputs");
    const deviceId = String(
      envelope.clientid || envelope.client_id || envelope.device_id || "arduino-opta",
    ).slice(0, 128);
    const payload = parsePayload(envelope.payload ?? envelope);
    const receivedAt = new Date();
    const restHeaders = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    };

    const farmResponse = await fetch(
      `${supabaseUrl}/rest/v1/farms?slug=eq.${encodeURIComponent(FARM_SLUG)}&select=id&limit=1`,
      { headers: restHeaders },
    );
    const farms = await readJson(farmResponse);
    if (!farmResponse.ok || !Array.isArray(farms) || !farms[0]?.id) {
      throw new Error("Configured farm was not found");
    }
    const farmId = String(farms[0].id);

    if (topic.endsWith("/status")) {
      const statusText = typeof payload === "string"
        ? payload.toLowerCase()
        : String(object(payload).status || "unknown").toLowerCase();
      const mqttStatus = statusText === "online" || statusText === "offline"
        ? statusText
        : "unknown";
      const statusResponse = await fetch(
        `${supabaseUrl}/rest/v1/device_latest?on_conflict=farm_id,device_id`,
        {
          method: "POST",
          headers: {
            ...restHeaders,
            prefer: "resolution=merge-duplicates,return=minimal",
          },
          body: JSON.stringify({
            farm_id: farmId,
            device_id: deviceId,
            mqtt_status: mqttStatus,
            received_at: receivedAt.toISOString(),
          }),
        },
      );
      if (!statusResponse.ok) throw new Error("Could not store device status");
      return jsonResponse({ accepted: true, kind: "status", mqtt_status: mqttStatus });
    }

    const telemetry = object(payload);
    const outputs = object(telemetry.outputs);
    const leds = object(telemetry.leds);
    const i1 = object(telemetry.i1);
    const inputs = object(telemetry.inputs);
    if (Object.keys(telemetry).length === 0) {
      return jsonResponse({ error: "Telemetry payload must be a JSON object" }, 400);
    }

    const values = {
      farm_id: farmId,
      device_id: deviceId,
      recorded_at: receivedAt.toISOString(),
      seq: integer(telemetry.seq),
      up_s: integer(telemetry.up_s),
      rssi: integer(telemetry.rssi),
      volts: finiteNumber(i1.volts),
      temp_c: finiteNumber(i1.temp_c),
      sensor_fault: bit(i1.fault),
      d0: bit(outputs.D0),
      d1: bit(outputs.D1),
      d2: bit(outputs.D2),
      d3: bit(outputs.D3),
      i2: bit(inputs.I2),
      i3: bit(inputs.I3),
      i4: bit(inputs.I4),
      i5: bit(inputs.I5),
      i6: bit(inputs.I6),
      i7: bit(inputs.I7),
      i8: bit(inputs.I8),
      raw_payload: telemetry,
    };
    const latest = {
      ...values,
      mqtt_status: "online",
      received_at: receivedAt.toISOString(),
      l0: bit(leds.L0),
      l1: bit(leds.L1),
      l2: bit(leds.L2),
      l3: bit(leds.L3),
    };
    delete (latest as JsonObject).recorded_at;

    const latestResponse = await fetch(
      `${supabaseUrl}/rest/v1/device_latest?on_conflict=farm_id,device_id`,
      {
        method: "POST",
        headers: {
          ...restHeaders,
          prefer: "resolution=merge-duplicates,return=minimal",
        },
        body: JSON.stringify(latest),
      },
    );
    if (!latestResponse.ok) throw new Error("Could not update latest device state");

    const historyResponse = await fetch(
      `${supabaseUrl}/rest/v1/telemetry?on_conflict=farm_id,device_id,ingest_bucket`,
      {
        method: "POST",
        headers: {
          ...restHeaders,
          prefer: "resolution=ignore-duplicates,return=minimal",
        },
        body: JSON.stringify({
          ...values,
          ingest_bucket: fiveMinuteBucket(receivedAt),
        }),
      },
    );
    if (!historyResponse.ok) throw new Error("Could not store telemetry history");

    return jsonResponse({ accepted: true, kind: "telemetry", device_id: deviceId });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "MQTT ingestion failed" }, 500);
  }
});
