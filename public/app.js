const $ = (s) => document.querySelector(s);
let DATA = window.TIMELESS_DATA || { tabs: [], scripts: [] };
let activeTab = "ALL";


/* ---------- holiday vfx (3 effects per theme, multi-select) ---------- */
const THEME_BADGE = { Default:"✨", Halloween:"🎃", Christmas:"🎄", "New Year":"🎉", "New Year's Eve":"🥂", "Valentine's Day":"💗", "St Patrick's Day":"🍀", Easter:"🐣", "Ramadan & Eid":"🌙", Diwali:"🪔", "Bonfire Night":"🔥", "Day of the Dead":"💀", Hanukkah:"🕎", "Lunar New Year":"🏮", Pride:"🏳️‍🌈", "4th of July":"🇺🇸", "Black Friday":"🛍️" };
const FX_GROUPS = [
  { theme: "Decorations", effects: [
    { id: "deco-borders",  label: "Button borders", deco: "borders" },
    { id: "deco-outlines", label: "Tile outlines", deco: "outlines" },
    { id: "deco-icons",    label: "Icons on buttons", deco: "icons" },
    { id: "deco-banner",   label: "Banner strip", deco: "banner" } ] },
  { theme: "Default", effects: [
    { id: "def-sparkles", label: "Sparkles", emojis: ["✨","✧","✨","⭐"] },
    { id: "def-stars",    label: "Falling stars", emojis: ["⭐","🌟","✩","⭐"] },
    { id: "def-confetti", label: "Confetti", emojis: ["🎊","🎉","🎊","✨"] } ] },
  { theme: "Halloween", effects: [
    { id: "hal-bats",     label: "Bats", emojis: ["🦇","🦇","🦇","🎃"] },
    { id: "hal-pumpkins", label: "Pumpkins", emojis: ["🎃","🎃","👻","🎃"] },
    { id: "hal-ghosts",   label: "Ghosts", emojis: ["👻","🕸️","👻","🕷️"] } ] },
  { theme: "Christmas", effects: [
    { id: "xmas-snow",    label: "Snowfall", emojis: ["❄️","🌨️","❄️","✨"] },
    { id: "xmas-gifts",   label: "Gift boxes", emojis: ["🎁","🎁","❄️","🎁"] },
    { id: "xmas-snowmen", label: "Snowmen", emojis: ["⛄","⛄","❄️","⛄"] } ] },
  { theme: "New Year", effects: [
    { id: "ny-confetti",  label: "Confetti", emojis: ["🎉","🎊","🎉","✨"] },
    { id: "ny-sparkles",  label: "Gold sparkle", emojis: ["✨","🌟","✨","⭐"] },
    { id: "ny-balloons",  label: "Balloons", emojis: ["🎈","🎈","🎉","🎈"] } ] },
  { theme: "New Year's Eve", effects: [
    { id: "nye-fireworks", label: "Fireworks", emojis: ["🎆","🎇","🎆","✨"] },
    { id: "nye-champagne", label: "Champagne", emojis: ["🥂","🍾","🥂","✨"] },
    { id: "nye-confetti",  label: "Confetti", emojis: ["🎊","🎉","🎊","✨"] } ] },
  { theme: "Valentine's Day", effects: [
    { id: "val-hearts",   label: "Floating hearts", emojis: ["💗","💖","💗","💘"] },
    { id: "val-roses",    label: "Roses", emojis: ["🌹","🌹","💗","🌹"] },
    { id: "val-cupids",   label: "Cupid arrows", emojis: ["💘","💝","💘","💗"] } ] },
  { theme: "St Patrick's Day", effects: [
    { id: "pat-clovers",  label: "Clovers", emojis: ["🍀","☘️","🍀","🍀"] },
    { id: "pat-coins",    label: "Gold coins", emojis: ["🪙","🪙","🍀","🪙"] },
    { id: "pat-rainbows", label: "Rainbows", emojis: ["🌈","🌈","🍀","🌈"] } ] },
  { theme: "Easter", effects: [
    { id: "eas-eggs",     label: "Spring eggs", emojis: ["🥚","🥚","🐣","🥚"] },
    { id: "eas-chicks",   label: "Chicks", emojis: ["🐣","🐣","🥚","🐣"] },
    { id: "eas-tulips",   label: "Tulips", emojis: ["🌷","🌷","🐣","🌷"] } ] },
  { theme: "Ramadan & Eid", effects: [
    { id: "ram-moons",    label: "Crescent moons", emojis: ["🌙","🌙","✨","🌙"] },
    { id: "ram-stars",    label: "Stars", emojis: ["✨","⭐","✨","🌙"] },
    { id: "ram-lanterns", label: "Lanterns", emojis: ["🏮","🏮","🌙","🏮"] } ] },
  { theme: "Diwali", effects: [
    { id: "diw-diyas",    label: "Diya lamps", emojis: ["🪔","🪔","✨","🪔"] },
    { id: "diw-fireworks", label: "Fireworks", emojis: ["🎆","🎇","🎆","✨"] },
    { id: "diw-flowers",  label: "Lotus blooms", emojis: ["🌺","🪷","🌺","✨"] } ] },
  { theme: "Bonfire Night", effects: [
    { id: "bon-flames",   label: "Flames", emojis: ["🔥","🔥","💥","🔥"] },
    { id: "bon-rockets",  label: "Rockets", emojis: ["🎇","🎆","🎇","🔥"] },
    { id: "bon-sparks",   label: "Sparks", emojis: ["💥","✨","💥","🔥"] } ] },
  { theme: "Day of the Dead", effects: [
    { id: "dod-skulls",   label: "Sugar skulls", emojis: ["💀","💀","🌼","💀"] },
    { id: "dod-marigolds", label: "Marigolds", emojis: ["🌼","🌼","💀","🌼"] },
    { id: "dod-candles",  label: "Candles", emojis: ["🕯️","🕯️","🌼","🕯️"] } ] },
  { theme: "Hanukkah", effects: [
    { id: "han-menorahs", label: "Menorahs", emojis: ["🕎","🕎","✨","🕎"] },
    { id: "han-candles",  label: "Candles", emojis: ["🕯️","🕯️","🕎","🕯️"] },
    { id: "han-stars",    label: "Stars of David", emojis: ["✡️","✡️","✨","✡️"] } ] },
  { theme: "Lunar New Year", effects: [
    { id: "lun-lanterns", label: "Lanterns", emojis: ["🏮","🏮","🧧","🏮"] },
    { id: "lun-packets",  label: "Red packets", emojis: ["🧧","🧧","🏮","🧧"] },
    { id: "lun-dragons",  label: "Dragons", emojis: ["🐉","🐉","🏮","🐉"] } ] },
  { theme: "Pride", effects: [
    { id: "pri-flags",    label: "Rainbow flags", emojis: ["🏳️‍🌈","🏳️‍🌈","💖","🏳️‍🌈"] },
    { id: "pri-hearts",   label: "Hearts", emojis: ["💖","💗","💖","🏳️‍🌈"] },
    { id: "pri-confetti", label: "Confetti", emojis: ["🎊","🎉","🎊","💖"] } ] },
  { theme: "4th of July", effects: [
    { id: "jul-flags",    label: "Flags", emojis: ["🇺🇸","🇺🇸","🎆","🇺🇸"] },
    { id: "jul-fireworks", label: "Fireworks", emojis: ["🎆","🎇","🎆","⭐"] },
    { id: "jul-stars",    label: "Stars", emojis: ["⭐","🌟","⭐","🇺🇸"] } ] },
  { theme: "Black Friday", effects: [
    { id: "bf-bags",      label: "Shopping bags", emojis: ["🛍️","🛍️","🏷️","🛍️"] },
    { id: "bf-tags",      label: "Deal tags", emojis: ["🏷️","🏷️","🛍️","🏷️"] },
    { id: "bf-money",     label: "Falling money", emojis: ["💸","💸","🛒","💸"] } ] }
];
const FX_BY_ID = {};
FX_GROUPS.forEach((g) => g.effects.forEach((e) => { FX_BY_ID[e.id] = e; }));
const FX_LEGACY = {
  none: [],
  halloween: ["hal-bats","hal-pumpkins","hal-ghosts"],
  christmas: ["xmas-snow","xmas-gifts","xmas-snowmen"],
  newyear: ["ny-confetti","ny-sparkles","ny-balloons"],
  nye: ["nye-fireworks","nye-champagne","nye-confetti"],
  valentines: ["val-hearts","val-roses","val-cupids"],
  stpatricks: ["pat-clovers","pat-coins","pat-rainbows"],
  easter: ["eas-eggs","eas-chicks","eas-tulips"],
  ramadan: ["ram-moons","ram-stars","ram-lanterns"],
  diwali: ["diw-diyas","diw-fireworks","diw-flowers"],
  bonfire: ["bon-flames","bon-rockets","bon-sparks"],
  dayofdead: ["dod-skulls","dod-marigolds","dod-candles"],
  hanukkah: ["han-menorahs","han-candles","han-stars"],
  lunar: ["lun-lanterns","lun-packets","lun-dragons"],
  pride: ["pri-flags","pri-hearts","pri-confetti"],
  july4: ["jul-flags","jul-fireworks","jul-stars"],
  blackfriday: ["bf-bags","bf-tags","bf-money"]
};
function fxList(v) {
  if (typeof v === "string") v = FX_LEGACY[v] || [];
  if (!Array.isArray(v)) return [];
  return v.filter((id) => FX_BY_ID[id]);
}
let vfxTimer = null;
function applyVfx(list) {
  document.querySelectorAll(".vfx-layer").forEach((e) => e.remove());
  if (vfxTimer) { clearInterval(vfxTimer); vfxTimer = null; }
  const ids = fxList(list);
  const decos = ids.filter((id) => FX_BY_ID[id].deco);
  document.body.classList.remove("fx-borders", "fx-outlines", "fx-icons", "fx-banner");
  decos.forEach((id) => document.body.classList.add("fx-" + FX_BY_ID[id].deco));
  const sets = ids.filter((id) => FX_BY_ID[id].emojis).map((id) => FX_BY_ID[id].emojis);
  if (!sets.length) return;
  const layer = document.createElement("div");
  layer.className = "vfx-layer";
  layer.setAttribute("aria-hidden", "true");
  document.body.appendChild(layer);
  const spawn = () => {
    if (layer.childElementCount > 34) layer.firstElementChild.remove();
    const set = sets[Math.floor(Math.random() * sets.length)];
    const s = document.createElement("span");
    s.className = "vfx-item";
    s.textContent = set[Math.floor(Math.random() * set.length)];
    s.style.left = (Math.random() * 96 + 2) + "%";
    s.style.fontSize = (14 + Math.random() * 20) + "px";
    s.style.animationDuration = (9 + Math.random() * 10).toFixed(1) + "s";
    s.style.animationDelay = (-Math.random() * 10).toFixed(1) + "s";
    s.style.opacity = (0.3 + Math.random() * 0.45).toFixed(2);
    layer.appendChild(s);
  };
  for (let i = 0; i < 16; i++) spawn();
  vfxTimer = setInterval(spawn, 1200);
}

/* ---------- theme ---------- */
const DEFAULT_THEME = { name: "Default", accent: "#ff2e7d", accent2: "#ff7a18", glow: "#ff2e7d", vfx: [] };
function hexOk(h) { return typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h); }
function hexRgb(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function applyTheme(t) {
  t = (t && typeof t === "object" && !Array.isArray(t)) ? t : {};
  applyVfx(t.vfx);
  const a  = hexOk(t.accent)  ? t.accent  : DEFAULT_THEME.accent;
  const a2 = hexOk(t.accent2) ? t.accent2 : DEFAULT_THEME.accent2;
  const g  = hexOk(t.glow)    ? t.glow    : DEFAULT_THEME.glow;
  const s = document.documentElement.style;
  s.setProperty("--fx-badge", THEME_BADGE[t.name] || "✨");
  s.setProperty("--accent", a);
  s.setProperty("--accent2", a2);
  s.setProperty("--glow", g);
  const [r1,g1,b1] = hexRgb(a);
  s.setProperty("--accent-soft",  `rgba(${r1},${g1},${b1},.14)`);
  s.setProperty("--accent-border",`rgba(${r1},${g1},${b1},.35)`);
  s.setProperty("--accent-glow",  `rgba(${r1},${g1},${b1},.3)`);
  const [r2,g2,b2] = hexRgb(g);
  s.setProperty("--glow-1", `rgba(${r2},${g2},${b2},.10)`);
  s.setProperty("--glow-2", `rgba(${r2},${g2},${b2},.06)`);
}
applyTheme(window.TIMELESS_DATA && window.TIMELESS_DATA.theme);



function esc(x) {
  const d = document.createElement("div");
  d.textContent = x == null ? "" : String(x);
  return d.innerHTML;
}

async function loadData() {
  try {
    const r = await fetch("/api/data", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      if (j && Array.isArray(j.tabs)) DATA = j;
    }
  } catch (e) { /* no KV yet, static data.js stays in use */ }
  applyTheme(DATA.theme);
  renderTabs();
  renderScripts();
}

function chip(name, active) {
  const b = document.createElement("button");
  b.className = "chip" + (active ? " active" : "");
  b.textContent = name;
  b.onclick = () => { activeTab = name; renderTabs(); renderScripts(); };
  return b;
}

function renderTabs() {
  const nav = $("#tabs");
  nav.innerHTML = "";
  nav.appendChild(chip("ALL", activeTab === "ALL"));
  DATA.tabs.forEach((t) => nav.appendChild(chip(t, activeTab === t)));
}

function renderScripts() {
  const grid = $("#scripts");
  grid.innerHTML = "";
  const list = activeTab === "ALL" ? DATA.scripts : DATA.scripts.filter((s) => s.game === activeTab);
  $("#empty").classList.toggle("hidden", list.length > 0);
  list.forEach((s, i) => grid.appendChild(tile(s, i)));
}

function tile(s, i) {
  const el = document.createElement("article");
  el.className = "tile";
  el.style.animationDelay = Math.min(i * 40, 400) + "ms";
  el.innerHTML =
    '<span class="tab-badge">' + esc(s.game) + "</span>" +
    "<h3>" + esc(s.name) + "</h3>" +
    '<p class="desc">' + esc(s.description) + "</p>" +
    '<div class="load-row"><code>' + esc(s.loadstring) + "</code>" +
    '<button class="btn btn-sm copy">Copy</button></div>' +
    '<button class="expand-btn" aria-label="Expand"><svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg></button>';
  el.querySelector(".copy").onclick = (e) => copyText(s.loadstring, e.target);
  el.querySelector(".expand-btn").onclick = () => openExpanded(s);
  return el;
}

async function copyText(text, btn) {
  try {
    await navigator.clipboard.writeText(text);
  } catch (e) {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand("copy");
    ta.remove();
  }
  if (btn) {
    const old = btn.textContent;
    btn.textContent = "Copied";
    btn.classList.add("copied");
    setTimeout(() => { btn.textContent = old; btn.classList.remove("copied"); }, 1200);
  }
}

function openExpanded(s) {
  $("#xName").textContent = s.name;
  $("#xDesc").textContent = s.description || "";
  $("#xLoad").textContent = s.loadstring;
  $("#xCopy").onclick = (e) => copyText(s.loadstring, e.target);
  $("#expanded").classList.remove("hidden");
  document.body.style.overflow = "hidden";
}
function closeExpanded() {
  $("#expanded").classList.add("hidden");
  document.body.style.overflow = "";
}
$("#minimise").onclick = closeExpanded;
$("#expanded").addEventListener("click", (e) => { if (e.target.id === "expanded") closeExpanded(); });
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeExpanded(); });

function enterHub() {
  const l = $("#landing");
  l.classList.add("leave");
  setTimeout(() => {
    l.classList.add("hidden");
    const h = $("#hub");
    h.classList.remove("hidden");
    h.removeAttribute("aria-hidden");
    loadData();
  }, 330);
}
// Continue is gated on Discord verification once login is configured:
// logged-in users walk straight in, everyone else is asked to verify first.
$("#continueBtn").onclick = async () => {
  let me = null;
  try { me = await (await fetch("/api/me", { cache: "no-store" })).json(); } catch (e) {}
  if (me && me.user) { enterHub(); return; }
  if (me && me.oauthReady) { location.href = "/auth/login"; return; }
  enterHub();
};

// Banner fallback if assets/banner.png is missing
$("#banner").addEventListener("error", () => {
  $("#banner").style.display = "none";
  $("#bannerFallback").classList.remove("hidden");
});

/* ---------- discord login (account chip) ---------- */
const LOGIN_MSG = {
  joined: "welcome, you are logged in and in the server",
  joinfail: "logged in, but could not add you to the server, try again",
  notready: "discord login is not configured yet",
  state: "login did not line up, try again",
  token: "discord rejected the login, try again",
  user: "could not read your discord profile, try again"
};
async function renderAccount() {
  const box = $("#account");
  if (!box) return;
  let me = null;
  try { me = await (await fetch("/api/me", { cache: "no-store" })).json(); } catch (e) {}
  if (me && me.user) {
    const u = me.user;
    const ava = u.avatar
      ? "https://cdn.discordapp.com/avatars/" + u.id + "/" + u.avatar + ".png?size=64"
      : "https://cdn.discordapp.com/embed/avatars/0.png";
    box.textContent = "";
    const img = document.createElement("img");
    img.className = "acc-ava"; img.src = ava; img.alt = "";
    const nm = document.createElement("span");
    nm.className = "acc-name"; nm.textContent = u.global_name || u.username;
    const out = document.createElement("button");
    out.className = "acc-logout"; out.textContent = "Logout";
    out.onclick = () => { location.href = "/auth/logout"; };
    box.append(img, nm, out);
  } else {
    box.textContent = "";
  }
  const p = new URLSearchParams(location.search);
  const code = p.get("login");
  if (code && LOGIN_MSG[code]) {
    history.replaceState(null, "", location.pathname);
    const note = document.createElement("p");
    note.className = "login-note";
    note.textContent = LOGIN_MSG[code];
    box.insertAdjacentElement("afterend", note);
    setTimeout(() => note.remove(), 6000);
  }
}
renderAccount();
