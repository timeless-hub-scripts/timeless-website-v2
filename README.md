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

## Using npx wrangler

`wrangler.jsonc` is the Pages config for this site: project name
`timeless-website-v2`, no build step, output dir is the repo root.

- Local dev: `npx wrangler pages dev . --kv DATA --var ADMIN_PASSWORD:yourpassword`
  The `--kv` flag gives the functions a local-only KV store bound as `DATA`,
  so `/cyr0x` publishing works locally without touching production.
- Deploy: `npx wrangler pages deploy .`
  If your Pages project on the dashboard has a different name, either pass
  `--project-name <name>` or change `name` in `wrangler.jsonc`.
- `ADMIN_PASSWORD` stays a dashboard secret for production. For local dev pass
  it with `--var` like above. Never commit it.

## Structure (Workers + static assets)

Cloudflare deploys this repo as a Worker with static assets, so the deploy
command in the dashboard is `npx wrangler deploy`:

- `public/` — the site: index.html, styles.css, data.js, app.js, cyr0x.html,
  admin.js, assets/banner.png.
- `worker.js` — serves `/api/data` (GET public, PUT password-gated) and
  `/api/verify`. Non-asset requests land here.
- `wrangler.jsonc` — name `timeless-website`, no build step.

## Bindings

- `ADMIN_PASSWORD` — add it as a secret in the dashboard (Variables and
  Secrets). Enable "Keep vars" there so dashboard secrets survive deploys.
- `DATA` (KV) — create a KV namespace, then send the namespace id and it gets
  added to `wrangler.jsonc` as binding `DATA`. Until then the site runs on the
  seed data in `public/data.js` and `/cyr0x` publishing returns "kv not
  configured".
