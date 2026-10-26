const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

// ---- Discord OAuth2 (Timeless Script Manager, client id public) ----
const DISCORD_CLIENT_ID = "153198939185636972";
const b64url = (buf) => btoa(String.fromCharCode(...new Uint8Array(buf))).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
const b64urlDecode = (s) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), c => c.charCodeAt(0));
async function hmacKey(secret) {
  return crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign", "verify"]);
}
async function signSession(payload, secret) {
  const body = b64url(new TextEncoder().encode(JSON.stringify(payload)));
  const key = await hmacKey(secret);
  const sig = b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(body)));
  return body + "." + sig;
}
async function readSession(request, secret) {
  const cookies = request.headers.get("cookie") || "";
  const m = cookies.match(/(?:^|;\s*)ts_session=([^;]+)/);
  if (!m) return null;
  const parts = m[1].split(".");
  if (parts.length !== 2) return null;
  const key = await hmacKey(secret);
  const good = b64url(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(parts[0])));
  const a = b64urlDecode(parts[1]), b = b64urlDecode(good);
  if (a.length !== b.length) return null;
  let diff = 0; for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  if (diff !== 0) return null;
  try {
    const payload = JSON.parse(new TextDecoder().decode(b64urlDecode(parts[0])));
    if (!payload.exp || payload.exp < Date.now()) return null;
    return payload;
  } catch (e) { return null; }
}
function cookie(name, value, maxAge) {
  return `${name}=${value}; Path=/; Max-Age=${maxAge}; HttpOnly; Secure; SameSite=Lax`;
}
const DISCORD_SCOPES = "identify";


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
      "cache-control": "public, max-age=20",
      "x-content-type-options": "nosniff"
    }
  });
const rawAuthed = (request, env) => {
  const pw = request.headers.get("x-admin-password") || "";
  return Boolean(env.ADMIN_PASSWORD) && pw === env.ADMIN_PASSWORD;
};
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
      if (!env.ADMIN_PASSWORD) return json({ ok: false, configured: false });
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
      if (!rawAuthed(request, env)) return json({ error: "unauthorized" }, 401);
      const name = new URL(request.url).searchParams.get("name") || "";
      if (!RAW_NAME_RE.test(name)) return json({ error: "bad name" }, 400);
      if (!env.DATA) return json({ error: "kv not configured" }, 500);
      const rec = await rawGet(env, name);
      if (!rec) return json({ error: "not found" }, 404);
      return json({ name: rec.name, numbers: rec.numbers || "", content: rec.content, updated: rec.updated || 0 });
    }

    if (pathname === "/api/raw/list" && request.method === "GET") {
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
      if (!rawAuthed(request, env)) return json({ error: "unauthorized" }, 401);
      if (!env.DATA) return json({ error: "kv not configured" }, 500);
      let body;
      try { body = await request.json(); } catch (e) { return json({ error: "bad json" }, 400); }
      const name = String((body && body.name) || "").trim().toLowerCase();
      if (!RAW_NAME_RE.test(name)) return json({ error: "bad name" }, 400);
      await env.DATA.delete("raw:" + name);
      return json({ ok: true });
    }

    // ---- Discord OAuth2 routes ----
    if (pathname === "/auth/login") {
      const origin = new URL(request.url).origin;
      const state = crypto.getRandomValues(new Uint8Array(16));
      const stateHex = Array.from(state).map(b => b.toString(16).padStart(2, "0")).join("");
      const auth = new URL("https://discord.com/oauth2/authorize");
      auth.searchParams.set("client_id", DISCORD_CLIENT_ID);
      auth.searchParams.set("redirect_uri", origin + "/auth/callback");
      auth.searchParams.set("response_type", "code");
      auth.searchParams.set("scope", DISCORD_SCOPES);
      auth.searchParams.set("state", stateHex);
      auth.searchParams.set("prompt", "consent");
      return new Response(null, {
        status: 302,
        headers: {
          location: auth.toString(),
          "set-cookie": cookie("ts_oauth_state", stateHex, 600)
        }
      });
    }

    if (pathname === "/auth/callback") {
      const origin = new URL(request.url).origin;
      const url = new URL(request.url);
      const code = url.searchParams.get("code");
      const state = url.searchParams.get("state");
      const cm = (request.headers.get("cookie") || "").match(/(?:^|;\s*)ts_oauth_state=([^;]+)/);
      if (!code || !state || !cm || cm[1] !== state) {
        return Response.redirect(origin + "/?login=state", 302);
      }
      if (!env.DISCORD_CLIENT_SECRET) {
        return json({ error: "oauth not configured" }, 500);
      }
      const tokenRes = await fetch("https://discord.com/api/oauth2/token", {
        method: "POST",
        headers: { "content-type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          client_id: DISCORD_CLIENT_ID,
          client_secret: env.DISCORD_CLIENT_SECRET,
          grant_type: "authorization_code",
          code,
          redirect_uri: origin + "/auth/callback"
        })
      });
      if (!tokenRes.ok) {
        return Response.redirect(origin + "/?login=token", 302);
      }
      const token = await tokenRes.json();
      const meRes = await fetch("https://discord.com/api/users/@me", {
        headers: { authorization: "Bearer " + token.access_token }
      });
      if (!meRes.ok) {
        return Response.redirect(origin + "/?login=user", 302);
      }
      const me = await meRes.json();
      const payload = {
        id: me.id,
        username: me.username,
        global_name: me.global_name || me.username,
        avatar: me.avatar,
        exp: Date.now() + 7 * 24 * 3600 * 1000
      };
      if (!env.SESSION_SECRET) return json({ error: "oauth not configured" }, 500);
      const session = await signSession(payload, env.SESSION_SECRET);
      return new Response(null, {
        status: 302,
        headers: {
          location: origin + "/",
          "set-cookie": [
            cookie("ts_session", session, 7 * 24 * 3600),
            cookie("ts_oauth_state", "", 0)
          ].join(", ")
        }
      });
    }

    if (pathname === "/auth/logout") {
      const origin = new URL(request.url).origin;
      return new Response(null, {
        status: 302,
        headers: {
          location: origin + "/",
          "set-cookie": cookie("ts_session", "", 0)
        }
      });
    }

    if (pathname === "/api/me") {
      if (!env.SESSION_SECRET || !env.DISCORD_CLIENT_SECRET) return json({ user: null, oauthReady: false });
      const session = await readSession(request, env.SESSION_SECRET);
      if (!session) return json({ user: null, oauthReady: true });
      return json({
        user: { id: session.id, username: session.username, global_name: session.global_name, avatar: session.avatar }
      });
    }

    return json({ error: "not found" }, 404);
  }
};
