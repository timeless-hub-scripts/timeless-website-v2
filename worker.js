const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

// Serves /api/data and /api/verify. Static files in public/ are served first
// by the asset router; anything that is not an asset lands here.
export default {
  async fetch(request, env) {
    const { pathname } = new URL(request.url);

    if (pathname === "/api/data") {
      if (request.method === "GET") {
        try {
          if (!env.DATA) return json(null);
          const raw = await env.DATA.get("site-data");
          return json(raw ? JSON.parse(raw) : null);
        } catch (e) {
          return json({ error: "kv not configured" }, 500);
        }
      }
      if (request.method === "PUT") {
        const pw = request.headers.get("x-admin-password") || "";
        if (!env.ADMIN_PASSWORD || pw !== env.ADMIN_PASSWORD) return json({ error: "unauthorized" }, 401);
        let body;
        try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
        if (!body || !Array.isArray(body.tabs) || !Array.isArray(body.scripts)) return json({ error: "bad payload" }, 400);
        if (!env.DATA) return json({ error: "kv not configured" }, 500);
        await env.DATA.put("site-data", JSON.stringify(body));
        return json({ ok: true });
      }
      return json({ error: "method not allowed" }, 405);
    }

    if (pathname === "/api/verify") {
      const pw = request.headers.get("x-admin-password") || "";
      if (!env.ADMIN_PASSWORD) return json({ ok: false, configured: false });
      return json({ ok: pw === env.ADMIN_PASSWORD, configured: true });
    }

    return json({ error: "not found" }, 404);
  }
};
