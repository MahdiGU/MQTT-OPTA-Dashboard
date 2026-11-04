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
  if (value === null || value === undefined || value === "") return null;
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

function limitedText(value: unknown, maximum: number): string | null {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text.slice(0, maximum) : null;
}

function capturedAt(value: unknown): string | null {
  const seconds = finiteNumber(value);
  if (seconds === null || seconds < 1_700_000_000 || seconds > 4_102_444_800) {
    return null;
  }
  return new Date(seconds * 1000).toISOString();
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
    const topic = String(envelope.topic || "opta/outputs").slice(0, 256);
    const deviceId = String(
      envelope.clientid || envelope.client_id || envelope.device_id || "",
    ).trim().slice(0, 128);
    if (!deviceId) return jsonResponse({ error: "MQTT client ID is required" }, 400);

    const payload = parsePayload(envelope.payload ?? envelope);
    const receivedAt = new Date().toISOString();
    const restHeaders = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    };

    const telemetry = object(payload);
    const outputs = object(telemetry.outputs);
    const leds = object(telemetry.leds);
    const i1 = object(telemetry.i1);
    const inputs = object(telemetry.inputs);
    const buffer = object(telemetry.buffer);
    const normalized = {
      received_at: receivedAt,
      captured_at: capturedAt(telemetry.captured_at),
      boot_id: limitedText(telemetry.boot_id, 96),
      schema_version: integer(telemetry.schema),
      firmware_version: limitedText(telemetry.firmware, 64),
      replay: bit(telemetry.replay) ?? false,
      buffer_pending: integer(buffer.pending),
      buffer_dropped: integer(buffer.dropped),
      payload_farm_id: limitedText(telemetry.farm_id, 128),
      payload_house_id: limitedText(telemetry.house_id, 128),
      payload_device_id: limitedText(telemetry.device_id, 128),
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
      l0: bit(leds.L0),
      l1: bit(leds.L1),
      l2: bit(leds.L2),
      l3: bit(leds.L3),
      i2: bit(inputs.I2),
      i3: bit(inputs.I3),
      i4: bit(inputs.I4),
      i5: bit(inputs.I5),
      i6: bit(inputs.I6),
      i7: bit(inputs.I7),
      i8: bit(inputs.I8),
      raw_payload: telemetry,
    };

    const statusText = typeof payload === "string"
      ? payload.toLowerCase()
      : String(object(payload).status || "unknown").toLowerCase();
    const mqttStatus = statusText === "online" || statusText === "offline"
      ? statusText
      : "unknown";
    const ingestResponse = await fetch(`${supabaseUrl}/rest/v1/rpc/ingest_mqtt_message`, {
      method: "POST",
      headers: restHeaders,
      body: JSON.stringify({
        target_farm_slug: FARM_SLUG,
        target_device: deviceId,
        target_topic: topic,
        normalized: Object.keys(telemetry).length ? normalized : null,
        target_status: mqttStatus,
        status_received_at: receivedAt,
      }),
    });
    const ingestResult = await readJson(ingestResponse);
    if (!ingestResponse.ok) throw new Error("Could not store telemetry");
    const result = object(ingestResult);
    if (result.accepted !== true) {
      const reason = String(result.error || "MQTT message was rejected");
      return jsonResponse({ error: reason }, reason === "Invalid telemetry payload" ? 400 : 403);
    }
    return jsonResponse(result);
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "MQTT ingestion failed" }, 500);
  }
});
