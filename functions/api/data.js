const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export async function onRequestGet({ env }) {
  try {
    const raw = await env.DATA.get("site-data");
    return json(raw ? JSON.parse(raw) : null);
  } catch (e) {
    return json({ error: "kv not configured" }, 500);
  }
}

export async function onRequestPut({ env, request }) {
  const pw = request.headers.get("x-admin-password") || "";
  if (!env.ADMIN_PASSWORD || pw !== env.ADMIN_PASSWORD) return json({ error: "unauthorized" }, 401);
  let body;
  try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
  if (!body || !Array.isArray(body.tabs) || !Array.isArray(body.scripts)) return json({ error: "bad payload" }, 400);
  await env.DATA.put("site-data", JSON.stringify(body));
  return json({ ok: true });
}
