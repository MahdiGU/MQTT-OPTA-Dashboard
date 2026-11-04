import {
  jsonResponse,
  readJson,
  requireEnvironment,
  requireSupabaseSecretKey,
} from "../_shared/http.ts";

const FARM_SLUG = Deno.env.get("FARM_SLUG")?.trim() || "elmajd-poultry";
const DEFAULT_TOPIC = Deno.env.get("EMQX_COMMAND_TOPIC")?.trim() || "opta/cmd";
const COMMAND_PATTERN = /^(D[0-3]|LED[0-3]|ALL)\s+(ON|OFF|TOGGLE|1|0)$/i;

type JsonObject = Record<string, unknown>;

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") {
    return new Response(null, {
      status: 204,
      headers: {
        "access-control-allow-origin": "*",
        "access-control-allow-headers": "authorization, apikey, content-type",
        "access-control-allow-methods": "POST, OPTIONS",
      },
    });
  }
  if (request.method !== "POST") return jsonResponse({ error: "Method not allowed" }, 405);

  let commandId: string | null = null;
  try {
    const supabaseUrl = requireEnvironment("SUPABASE_URL");
    const serviceRoleKey = requireSupabaseSecretKey();
    const authorization = request.headers.get("authorization") || "";
    if (!authorization.toLowerCase().startsWith("bearer ")) {
      return jsonResponse({ error: "Authentication required" }, 401);
    }
    const serviceHeaders = {
      apikey: serviceRoleKey,
      authorization: `Bearer ${serviceRoleKey}`,
      "content-type": "application/json",
    };

    const body = await request.json() as JsonObject;
    const payload = String(body.payload || "").trim().replace(/\s+/g, " ").toUpperCase();
    if (!COMMAND_PATTERN.test(payload)) {
      return jsonResponse({
        error: "Invalid command. Use a plain string such as D0 ON, LED2 OFF, or ALL OFF.",
      }, 400);
    }

    const clientApiKey = request.headers.get("apikey");
    if (!clientApiKey) return jsonResponse({ error: "API key required" }, 401);
    const permissionResponse = await fetch(
      `${supabaseUrl}/rest/v1/rpc/authorize_mqtt_command`,
      {
        method: "POST",
        headers: {
          apikey: clientApiKey,
          authorization,
          "content-type": "application/json",
        },
        body: JSON.stringify({ target_farm_slug: FARM_SLUG }),
      },
    );
    const permission = await readJson(permissionResponse) as JsonObject;
    if (permissionResponse.status === 401) return jsonResponse({ error: "Invalid session" }, 401);
    if (!permissionResponse.ok) {
      return jsonResponse({ error: "Command authorization temporarily unavailable" }, 503);
    }
    if (permission?.allowed !== true || !permission.farm_id || !permission.user_id) {
      return jsonResponse({ error: "You do not have permission to control this farm" }, 403);
    }
    const farmId = String(permission.farm_id);
    const userId = String(permission.user_id);

    const createResponse = await fetch(`${supabaseUrl}/rest/v1/device_commands`, {
      method: "POST",
      headers: { ...serviceHeaders, prefer: "return=representation" },
      body: JSON.stringify({
        farm_id: farmId,
        requested_by: userId,
        topic: DEFAULT_TOPIC,
        payload,
        qos: 0,
        retain: false,
        status: "pending",
      }),
    });
    const created = await readJson(createResponse);
    if (!createResponse.ok || !Array.isArray(created) || !created[0]?.id) {
      throw new Error("Could not create command audit record");
    }
    commandId = String(created[0].id);

    const apiBase = requireEnvironment("EMQX_API_BASE_URL").replace(/\/+$/, "");
    const appId = requireEnvironment("EMQX_APP_ID");
    const appSecret = requireEnvironment("EMQX_APP_SECRET");
    const brokerResponse = await fetch(`${apiBase}/publish`, {
      method: "POST",
      headers: {
        authorization: `Basic ${btoa(`${appId}:${appSecret}`)}`,
        "content-type": "application/json",
      },
      body: JSON.stringify({ topic: DEFAULT_TOPIC, payload, qos: 0, retain: false }),
    });
    const brokerResult = await readJson(brokerResponse);
    if (!brokerResponse.ok) {
      const detail = typeof brokerResult === "string"
        ? brokerResult.slice(0, 300)
        : JSON.stringify(brokerResult).slice(0, 300);
      await fetch(`${supabaseUrl}/rest/v1/device_commands?id=eq.${commandId}`, {
        method: "PATCH",
        headers: serviceHeaders,
        body: JSON.stringify({ status: "failed", error_message: detail }),
      });
      return jsonResponse({ error: "EMQX rejected the command", command_id: commandId }, 502);
    }

    const brokerMessageId = typeof brokerResult === "object" && brokerResult !== null
      ? String((brokerResult as JsonObject).id || "") || null
      : null;
    await fetch(`${supabaseUrl}/rest/v1/device_commands?id=eq.${commandId}`, {
      method: "PATCH",
      headers: serviceHeaders,
      body: JSON.stringify({
        status: "sent",
        sent_at: new Date().toISOString(),
        broker_message_id: brokerMessageId,
      }),
    });
    return jsonResponse({ sent: true, command_id: commandId, payload, qos: 0, retain: false });
  } catch (error) {
    console.error(error);
    return jsonResponse({ error: "Command delivery failed", command_id: commandId }, 500);
  }
});
