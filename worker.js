const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

// Serves /api/data and /api/verify. Static files in public/ are served first
// by the asset router; anything that is not an asset lands here.

// ---- Raw pastebin (managed at /raw, served as /name.cheat) ----
const RAW_NAME_RE = /^[a-z0-9_-]{1,60}$/;
function normNumbers(v) {
  if (v === undefined || v === null || String(v).trim() === "") return "";
  const parts = String(v).split(",").map((p) => p.trim()).filter((p) => p !== "");
  if (parts.length !== 5 || parts.some((p) => !/^\d+$/.test(p))) return null;
  return parts.join(",");
}
const rawText = (body, status = 200) =>
  new Response(body, {
    status,
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "access-control-allow-origin": "*",
      "cache-control": "no-store",
      "x-content-type-options": "nosniff"
    }
  });
const rawAuthed = (request, env) => {
  const pw = request.headers.get("x-admin-password") || "";
  return Boolean(env.ADMIN_PASSWORD) && pw === env.ADMIN_PASSWORD;
};
const rawConfigError = (env) => !env.ADMIN_PASSWORD ? json({ error: "admin password not configured" }, 503) : null;
async function rawGet(env, name) {
  const v = await env.DATA.get("raw:" + name);
  if (!v) return null;
  try { return JSON.parse(v); } catch (e) { return null; }
}

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
        if (body.theme !== undefined && body.theme !== null) {
          const t = body.theme;
          if (typeof t !== "object" || Array.isArray(t)) return json({ error: "bad payload" }, 400);
          const clean = {};
          for (const k of ["name", "accent", "accent2", "glow"]) {
            if (t[k] === undefined || t[k] === null) continue;
            if (typeof t[k] !== "string" || t[k].length > 40) return json({ error: "bad payload" }, 400);
            if (k !== "name" && !/^#[0-9a-fA-F]{6}$/.test(t[k])) return json({ error: "bad payload" }, 400);
            clean[k] = k === "name" ? t[k].slice(0, 40) : t[k].toLowerCase();
          }
          if (t.vfx !== undefined && t.vfx !== null) {
            let v = t.vfx;
            if (typeof v === "string") v = v ? [v] : [];
            if (!Array.isArray(v) || v.length > 8) return json({ error: "bad payload" }, 400);
            for (const x of v) {
              if (typeof x !== "string" || x.length > 20 || !/^[a-z0-9_-]{1,20}$/.test(x)) return json({ error: "bad payload" }, 400);
            }
            clean.vfx = v;
          }
          body.theme = clean;
        }
        if (!env.DATA) return json({ error: "kv not configured" }, 500);
        await env.DATA.put("site-data", JSON.stringify(body));
        return json({ ok: true });
      }
      return json({ error: "method not allowed" }, 405);
    }

    if (pathname === "/api/verify") {
      const pw = request.headers.get("x-admin-password") || "";
      if (!env.ADMIN_PASSWORD) return json({ ok: false, configured: false }, 503);
      return json({ ok: pw === env.ADMIN_PASSWORD, configured: true });
    }

    

    // ---- raw paste serving: /name.cheat and /name/1,2,3,4,5.cheat (plain text, no auth) ----
    let rm = pathname.match(/^\/([a-z0-9_-]{1,60})\/(\d+(?:,\d+){4})\.cheat$/);
    if (rm) {
      if (!env.DATA) return rawText("kv not configured", 500);
      const rec = await rawGet(env, rm[1]);
      if (!rec || !rec.numbers || normNumbers(rm[2]) !== rec.numbers) return rawText("paste not found", 404);
      return rawText(rec.content);
    }
    rm = pathname.match(/^\/([a-z0-9_-]{1,60})\.cheat$/);
    if (rm) {
      if (!env.DATA) return rawText("kv not configured", 500);
      const rec = await rawGet(env, rm[1]);
      if (!rec) return rawText("paste not found", 404);
      return rawText(rec.content);
    }

    if (pathname === "/api/raw/get" && request.method === "GET") {
      const configError = rawConfigError(env);
      if (configError) return configError;
      if (!rawAuthed(request, env)) return json({ error: "unauthorized" }, 401);
      const name = new URL(request.url).searchParams.get("name") || "";
      if (!RAW_NAME_RE.test(name)) return json({ error: "bad name" }, 400);
      if (!env.DATA) return json({ error: "kv not configured" }, 500);
      const rec = await rawGet(env, name);
      if (!rec) return json({ error: "not found" }, 404);
      return json({ name: rec.name, numbers: rec.numbers || "", content: rec.content, updated: rec.updated || 0 });
    }

    if (pathname === "/api/raw/list" && request.method === "GET") {
      const configError = rawConfigError(env);
      if (configError) return configError;
      if (!rawAuthed(request, env)) return json({ error: "unauthorized" }, 401);
      if (!env.DATA) return json({ error: "kv not configured" }, 500);
      const pastes = [];
      let cursor;
      for (;;) {
        const page = await env.DATA.list({ prefix: "raw:", cursor });
        for (const key of page.keys) {
          const rec = await rawGet(env, key.name.slice(4));
          if (rec && rec.name) {
            pastes.push({ name: rec.name, numbers: rec.numbers || "", size: (rec.content || "").length, updated: rec.updated || 0 });
          }
        }
        if (page.list_complete) break;
        cursor = page.cursor;
      }
      pastes.sort((a, b) => b.updated - a.updated);
      return json({ pastes });
    }

    if (pathname === "/api/raw/save" && request.method === "POST") {
      const configError = rawConfigError(env);
      if (configError) return configError;
      if (!rawAuthed(request, env)) return json({ error: "unauthorized" }, 401);
      if (!env.DATA) return json({ error: "kv not configured" }, 500);
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
      const name = String((body && body.name) || "").trim().toLowerCase();
      if (!RAW_NAME_RE.test(name)) return json({ error: "name must be letters, numbers, - or _" }, 400);
      const numbers = normNumbers(body && body.numbers);
      if (numbers === null) return json({ error: "numbers must be 5 numbers separated by commas" }, 400);
      const content = typeof (body && body.content) === "string" ? body.content : "";
      await env.DATA.put("raw:" + name, JSON.stringify({ name, numbers, content, updated: Date.now() }));
      return json({ ok: true, url: "/" + name + ".cheat", numberedUrl: numbers ? "/" + name + "/" + numbers + ".cheat" : null });
    }

    if (pathname === "/api/raw/delete" && request.method === "POST") {
      const configError = rawConfigError(env);
      if (configError) return configError;
      if (!rawAuthed(request, env)) return json({ error: "unauthorized" }, 401);
      if (!env.DATA) return json({ error: "kv not configured" }, 500);
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
      const name = String((body && body.name) || "").trim().toLowerCase();
      if (!RAW_NAME_RE.test(name)) return json({ error: "bad name" }, 400);
      await env.DATA.delete("raw:" + name);
      return json({ ok: true });
    }

    // ---- /main: the logged-in scripts page ----
    if (pathname === "/main") {
      const url = new URL(request.url);
      const asset = await env.ASSETS.fetch(new Request(url.origin + "/main.html", { headers: request.headers }));
      return new Response(asset.body, asset);
    }

    return json({ error: "not found" }, 404);
  }
};
