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

    const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
      headers: { apikey: serviceRoleKey, authorization },
    });
    const user = await readJson(userResponse) as JsonObject;
    if (!userResponse.ok || !user?.id) return jsonResponse({ error: "Invalid session" }, 401);

    const body = await request.json() as JsonObject;
    const payload = String(body.payload || "").trim().replace(/\s+/g, " ").toUpperCase();
    if (!COMMAND_PATTERN.test(payload)) {
      return jsonResponse({
        error: "Invalid command. Use a plain string such as D0 ON, LED2 OFF, or ALL OFF.",
      }, 400);
    }

    const farmResponse = await fetch(
      `${supabaseUrl}/rest/v1/farms?slug=eq.${encodeURIComponent(FARM_SLUG)}&select=id&limit=1`,
      { headers: serviceHeaders },
    );
    const farms = await readJson(farmResponse);
    if (!farmResponse.ok || !Array.isArray(farms) || !farms[0]?.id) {
      throw new Error("Configured farm was not found");
    }
    const farmId = String(farms[0].id);
    const membershipResponse = await fetch(
      `${supabaseUrl}/rest/v1/farm_members?farm_id=eq.${farmId}&user_id=eq.${user.id}&role=in.(owner,manager,worker)&select=role&limit=1`,
      { headers: serviceHeaders },
    );
    const memberships = await readJson(membershipResponse);
    if (!membershipResponse.ok || !Array.isArray(memberships) || memberships.length === 0) {
      return jsonResponse({ error: "You do not have permission to control this farm" }, 403);
    }

    const createResponse = await fetch(`${supabaseUrl}/rest/v1/device_commands`, {
      method: "POST",
      headers: { ...serviceHeaders, prefer: "return=representation" },
      body: JSON.stringify({
        farm_id: farmId,
        requested_by: user.id,
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
