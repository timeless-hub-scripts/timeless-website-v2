# Timeless Scripts website (v2)

Modern script hub: clean home tile, hub with game tabs and script tiles,
and an owner console at `/cyr0x`.

## Pages
- `index.html` — landing (Continue / Join Discord / Social), hub with game tabs,
  script tiles (copy loadstring, expand to a big tile with minimise).
- `cyr0x.html` — owner console, password-gated: upload / edit / delete scripts,
  add / rename / delete game tabs, publish live or download `data.js`.
- `assets/banner.png` — the hub banner image (drop your image here with this name,
  or it falls back to a text banner).

## Data
- `data.js` — seed/default data (`window.TIMELESS_DATA`).
- Live data is served by the Pages Functions in `functions/api/` from a
  Cloudflare KV binding named `DATA`, so owner edits publish instantly without
  redeploying. If KV isn't configured the site falls back to `data.js`.

## Deploy on Cloudflare Pages
1. Connect this repo in the Cloudflare Pages dashboard (framework preset: None,
   no build command, output dir `/`).
2. Create a KV namespace, then in the Pages project settings bind it to the
   functions as variable name `DATA`.
3. Add an environment variable (encrypt it) named `ADMIN_PASSWORD` with the
   owner password for `/cyr0x`.
4. Redeploy. Publishing from `/cyr0x` then writes straight to KV.

## Discord OAuth (planned, not wired yet)
The hub is structured so a Discord OAuth login can drop in without reworking
it: data stays in KV, and the console gate (`x-admin-password` header) is
independent of site visitors. A stub comment marks the header slot in
`index.html` where the login button will mount.
