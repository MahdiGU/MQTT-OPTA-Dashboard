export const jsonHeaders = {
  "content-type": "application/json; charset=utf-8",
};

export function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), { status, headers: jsonHeaders });
}

export function requireEnvironment(name: string): string {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Missing required secret: ${name}`);
  return value;
}

export function requireSupabaseSecretKey(): string {
  const keyBundle = Deno.env.get("SUPABASE_SECRET_KEYS")?.trim();
  if (keyBundle) {
    try {
      const keys = JSON.parse(keyBundle) as Record<string, unknown>;
      const preferred = keys.default;
      if (typeof preferred === "string" && preferred) return preferred;
      const first = Object.values(keys).find((value) =>
        typeof value === "string" && value.length > 0
      );
      if (typeof first === "string") return first;
    } catch {
      throw new Error("SUPABASE_SECRET_KEYS is not valid JSON");
    }
  }
  return requireEnvironment("SUPABASE_SERVICE_ROLE_KEY");
}

export async function readJson(response: Response): Promise<unknown> {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}
