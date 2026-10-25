const $ = (s) => document.querySelector(s);
let DATA = window.TIMELESS_DATA || { tabs: [], scripts: [] };
let PW = sessionStorage.getItem("cyr0x_pw") || "";
let kvReady = false;

function esc(x) {
  const d = document.createElement("div");
  d.textContent = x == null ? "" : String(x);
  return d.innerHTML;
}
function status(el, msg, ok) {
  el.textContent = msg;
  el.className = "status " + (ok ? "ok" : "err");
}

async function loadData() {
  try {
    const r = await fetch("/api/data", { cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      if (j && Array.isArray(j.tabs)) DATA = j;
      kvReady = true;
    }
  } catch (e) { /* static mode */ }
  fillGameSelect();
  renderScripts();
  renderGames();
  staged = currentTheme();
  renderVfxBox();
  renderTheme();
}

/* ---------- gate ---------- */
async function unlock() {
  const pw = $("#pw").value;
  $("#unlockErr").textContent = "";
  try {
    const r = await fetch("/api/verify", { headers: { "x-admin-password": pw }, cache: "no-store" });
    if (r.ok) {
      const j = await r.json();
      if (j && j.configured && !j.ok) {
        $("#unlockErr").textContent = "wrong password";
        return;
      }
      kvReady = true;
    } else if (r.status === 404 || r.status === 405) {
      // backend not deployed yet, static mode with download publish
    } else if (r.status === 401) {
      $("#unlockErr").textContent = "wrong password";
      return;
    }
  } catch (e) { /* no backend, static mode */ }
  PW = pw;
  sessionStorage.setItem("cyr0x_pw", pw);
  $("#gate").classList.add("hidden");
  $("#console").classList.remove("hidden");
  loadData();
}
$("#unlockBtn").onclick = unlock;
$("#pw").addEventListener("keydown", (e) => { if (e.key === "Enter") unlock(); });

/* ---------- scripts ---------- */
function fillGameSelect() {
  const sel = $("#sGame");
  sel.innerHTML = "";
  DATA.tabs.forEach((t) => {
    const o = document.createElement("option");
    o.value = t; o.textContent = t;
    sel.appendChild(o);
  });
}

$("#scriptForm").addEventListener("submit", (e) => {
  e.preventDefault();
  const idx = $("#editIdx").value;
  const script = {
    name: $("#sName").value.trim(),
    game: $("#sGame").value,
    description: $("#sDesc").value.trim(),
    loadstring: $("#sLoad").value.trim()
  };
  if (!script.name || !script.loadstring) return;
  if (idx === "") DATA.scripts.push(script);
  else DATA.scripts[+idx] = script;
  clearForm();
  renderScripts();
  status($("#scriptStatus"), idx === "" ? "script added (not published yet)" : "script updated (not published yet)", true);
});
function clearForm() {
  $("#editIdx").value = "";
  $("#sName").value = "";
  $("#sDesc").value = "";
  $("#sLoad").value = "";
  $("#formTitle").textContent = "Upload a script";
  $("#uploadBtn").textContent = "Upload script";
  $("#cancelEdit").classList.add("hidden");
}
$("#cancelEdit").onclick = clearForm;

function renderScripts() {
  const list = $("#scriptList");
  list.innerHTML = "";
  DATA.scripts.forEach((s, i) => {
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML =
      '<div class="meta"><b>' + esc(s.name) + "</b><span>" + esc(s.game) + " · " + esc(s.description || "no description") + "</span></div>" +
      '<button class="btn btn-sm act-edit">Edit</button>' +
      '<button class="btn btn-sm danger act-del">Delete</button>';
    row.querySelector(".act-edit").onclick = () => {
      $("#editIdx").value = i;
      $("#sName").value = s.name;
      $("#sGame").value = s.game;
      $("#sDesc").value = s.description || "";
      $("#sLoad").value = s.loadstring || "";
      $("#formTitle").textContent = "Edit script: " + s.name;
      $("#uploadBtn").textContent = "Save changes";
      $("#cancelEdit").classList.remove("hidden");
      window.scrollTo({ top: 0, behavior: "smooth" });
    };
    row.querySelector(".act-del").onclick = () => {
      if (!confirm("Delete script '" + s.name + "'?")) return;
      DATA.scripts.splice(i, 1);
      renderScripts();
      clearForm();
      status($("#scriptStatus"), "script deleted (not published yet)", true);
    };
    list.appendChild(row);
  });
  if (!DATA.scripts.length) list.innerHTML = '<p class="empty" style="padding:14px 0">no scripts yet</p>';
}

/* ---------- games ---------- */
$("#addGameBtn").onclick = () => {
  const name = $("#gName").value.trim().toUpperCase();
  if (!name) return;
  if (DATA.tabs.includes(name)) return status($("#gameStatus"), "that game already exists", false);
  DATA.tabs.push(name);
  $("#gName").value = "";
  fillGameSelect();
  renderGames();
  status($("#gameStatus"), "game added (not published yet)", true);
};

function renderGames() {
  const list = $("#gameList");
  list.innerHTML = "";
  DATA.tabs.forEach((t, i) => {
    const count = DATA.scripts.filter((s) => s.game === t).length;
    const row = document.createElement("div");
    row.className = "item";
    row.innerHTML =
      '<div class="meta"><b>' + esc(t) + "</b><span>" + count + " script" + (count === 1 ? "" : "s") + "</span></div>" +
      '<button class="btn btn-sm act-ren">Rename</button>' +
      '<button class="btn btn-sm danger act-del">Delete</button>';
    row.querySelector(".act-ren").onclick = () => {
      const nn = prompt("Rename game tab:", t);
      if (!nn || !nn.trim()) return;
      const clean = nn.trim().toUpperCase();
      if (DATA.tabs.includes(clean)) return status($("#gameStatus"), "that game already exists", false);
      DATA.scripts.forEach((s) => { if (s.game === t) s.game = clean; });
      DATA.tabs[i] = clean;
      fillGameSelect();
      renderGames();
      status($("#gameStatus"), "game renamed (not published yet)", true);
    };
    row.querySelector(".act-del").onclick = () => {
      if (DATA.tabs.length <= 1) return status($("#gameStatus"), "you need at least one game tab", false);
      const count = DATA.scripts.filter((s) => s.game === t).length;
      let msg = "Delete game tab '" + t + "'?";
      if (count) msg += "\n" + count + " script(s) use it and will move to " + DATA.tabs.find((x) => x !== t) + ".";
      if (!confirm(msg)) return;
      const fallback = DATA.tabs.find((x) => x !== t);
      DATA.scripts.forEach((s) => { if (s.game === t) s.game = fallback; });
      DATA.tabs.splice(i, 1);
      fillGameSelect();
      renderGames();
      status($("#gameStatus"), "game deleted (not published yet)", true);
    };
    list.appendChild(row);
  });
}


/* ---------- themes ---------- */
const DEFAULT_THEME = { name: "Default", accent: "#ff2e7d", accent2: "#ff7a18", glow: "#ff2e7d", vfx: [] };
const PRESET_FX = {
  "Default": ["def-sparkles","def-stars","def-confetti"],
  "Halloween": ["hal-bats","hal-pumpkins","hal-ghosts"],
  "Christmas": ["xmas-snow","xmas-gifts","xmas-snowmen"],
  "New Year": ["ny-confetti","ny-sparkles","ny-balloons"],
  "New Year's Eve": ["nye-fireworks","nye-champagne","nye-confetti"],
  "Valentine's Day": ["val-hearts","val-roses","val-cupids"],
  "St Patrick's Day": ["pat-clovers","pat-coins","pat-rainbows"],
  "Easter": ["eas-eggs","eas-chicks","eas-tulips"],
  "Ramadan & Eid": ["ram-moons","ram-stars","ram-lanterns"],
  "Diwali": ["diw-diyas","diw-fireworks","diw-flowers"],
  "Bonfire Night": ["bon-flames","bon-rockets","bon-sparks"],
  "Day of the Dead": ["dod-skulls","dod-marigolds","dod-candles"],
  "Hanukkah": ["han-menorahs","han-candles","han-stars"],
  "Lunar New Year": ["lun-lanterns","lun-packets","lun-dragons"],
  "Pride": ["pri-flags","pri-hearts","pri-confetti"],
  "4th of July": ["jul-flags","jul-fireworks","jul-stars"],
  "Black Friday": ["bf-bags","bf-tags","bf-money"]
};
const THEME_PRESETS = Object.keys(PRESET_FX).map((name) => ({
  name,
  accent: { "Default":"#ff2e7d", "Halloween":"#ff7a18", "Christmas":"#e02430", "New Year":"#ffd24a",
            "New Year's Eve":"#f5c518", "Valentine's Day":"#ff4d8d", "St Patrick's Day":"#1fae55",
            "Easter":"#ff9ecb", "Ramadan & Eid":"#2bb3a3", "Diwali":"#ff8c1a", "Bonfire Night":"#ff5a1f",
            "Day of the Dead":"#ff2ea6", "Hanukkah":"#3b82f6", "Lunar New Year":"#e02430", "Pride":"#ff6ec7",
            "4th of July":"#e02430", "Black Friday":"#ffb020" }[name],
  accent2: { "Default":"#ff7a18", "Halloween":"#8b2fd6", "Christmas":"#1f9d55", "New Year":"#ff7a18",
             "New Year's Eve":"#7b2ff7", "Valentine's Day":"#e0245e", "St Patrick's Day":"#a8d94a",
             "Easter":"#a5d8ff", "Ramadan & Eid":"#f2c14e", "Diwali":"#ffd24a", "Bonfire Night":"#e0245e",
             "Day of the Dead":"#ff7a18", "Hanukkah":"#9fb7d6", "Lunar New Year":"#ffd24a", "Pride":"#4dc9ff",
             "4th of July":"#3b82f6", "Black Friday":"#4a4a55" }[name],
  glow: { "Default":"#ff2e7d", "Halloween":"#ff7a18", "Christmas":"#e02430", "New Year":"#ffd24a",
          "New Year's Eve":"#f5c518", "Valentine's Day":"#ff4d8d", "St Patrick's Day":"#1fae55",
          "Easter":"#ff9ecb", "Ramadan & Eid":"#2bb3a3", "Diwali":"#ff8c1a", "Bonfire Night":"#ff5a1f",
          "Day of the Dead":"#ff2ea6", "Hanukkah":"#3b82f6", "Lunar New Year":"#e02430", "Pride":"#ff6ec7",
          "4th of July":"#e02430", "Black Friday":"#ffb020" }[name],
  vfx: PRESET_FX[name]
}));
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
  none: [], halloween: PRESET_FX["Halloween"], christmas: PRESET_FX["Christmas"],
  newyear: PRESET_FX["New Year"], nye: PRESET_FX["New Year's Eve"], valentines: PRESET_FX["Valentine's Day"],
  stpatricks: PRESET_FX["St Patrick's Day"], easter: PRESET_FX["Easter"], ramadan: PRESET_FX["Ramadan & Eid"],
  diwali: PRESET_FX["Diwali"], bonfire: PRESET_FX["Bonfire Night"], dayofdead: PRESET_FX["Day of the Dead"],
  hanukkah: PRESET_FX["Hanukkah"], lunar: PRESET_FX["Lunar New Year"], pride: PRESET_FX["Pride"],
  july4: PRESET_FX["4th of July"], blackfriday: PRESET_FX["Black Friday"]
};
function fxList(v) {
  if (typeof v === "string") v = FX_LEGACY[v] || [];
  if (!Array.isArray(v)) return [];
  return v.filter((id) => FX_BY_ID[id]);
}
function previewVfx(list) {
  document.querySelectorAll(".vfx-layer").forEach((e) => e.remove());
  if (previewVfx.timer) { clearInterval(previewVfx.timer); previewVfx.timer = null; }
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
  previewVfx.timer = setInterval(spawn, 1200);
}
function renderVfxBox() {
  const box = $("#tVfxBox");
  box.innerHTML = "";
  FX_GROUPS.forEach((g) => {
    const grp = document.createElement("div");
    grp.className = "fx-group";
    grp.innerHTML = "<h4>" + esc(g.theme) + "</h4>";
    const row = document.createElement("div");
    row.className = "fx-row";
    g.effects.forEach((e) => {
      const l = document.createElement("label");
      l.className = "fx-chk";
      l.innerHTML = '<input type="checkbox" value="' + e.id + '"> ' + esc(e.label);
      row.appendChild(l);
    });
    grp.appendChild(row);
    box.appendChild(grp);
  });
}
function vfxFromBox() {
  return Array.prototype.slice.call($("#tVfxBox").querySelectorAll("input:checked")).map((c) => c.value);
}

let staged = null;

function hexOk(h) { return typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h); }
function hexRgb(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function previewTheme(t) {
  const a = hexOk(t.accent) ? t.accent : DEFAULT_THEME.accent;
  const a2 = hexOk(t.accent2) ? t.accent2 : DEFAULT_THEME.accent2;
  const g = hexOk(t.glow) ? t.glow : DEFAULT_THEME.glow;
  const s = document.documentElement.style;
  s.setProperty("--accent", a);
  s.setProperty("--accent2", a2);
  s.setProperty("--glow", g);
  const [r1,g1,b1] = hexRgb(a);
  s.setProperty("--accent-soft", `rgba(${r1},${g1},${b1},.14)`);
  s.setProperty("--accent-border", `rgba(${r1},${g1},${b1},.35)`);
  s.setProperty("--accent-glow", `rgba(${r1},${g1},${b1},.3)`);
  const [r2,g2,b2] = hexRgb(g);
  s.setProperty("--glow-1", `rgba(${r2},${g2},${b2},.10)`);
  s.setProperty("--glow-2", `rgba(${r2},${g2},${b2},.06)`);
  s.setProperty("--fx-badge", THEME_BADGE[t.name] || "✨");
}

function currentTheme() {
  const t = (DATA.theme && typeof DATA.theme === "object") ? DATA.theme : {};
  return {
    name: typeof t.name === "string" && t.name ? t.name : "Default",
    accent: hexOk(t.accent) ? t.accent : DEFAULT_THEME.accent,
    accent2: hexOk(t.accent2) ? t.accent2 : DEFAULT_THEME.accent2,
    glow: hexOk(t.glow) ? t.glow : DEFAULT_THEME.glow,
    vfx: fxList(t.vfx)
  };
}

function renderTheme() {
  if (!staged) staged = currentTheme();
  const wrap = $("#themePresets");
  wrap.innerHTML = "";
  THEME_PRESETS.forEach((p) => {
    const b = document.createElement("button");
    b.type = "button";
    const isActive = p.name === staged.name && p.accent === staged.accent && p.accent2 === staged.accent2 && p.glow === staged.glow && (p.vfx || []).join(",") === (staged.vfx || []).join(",");
    b.className = "theme-chip" + (isActive ? " active" : "");
    b.style.setProperty("--c1", p.accent);
    b.style.setProperty("--c2", p.accent2);
    b.innerHTML = '<span class="sw"></span>' + esc(p.name);
    b.onclick = () => {
      const keepDecos = (staged.vfx || []).filter((id) => FX_BY_ID[id] && FX_BY_ID[id].deco);
      staged = Object.assign({}, p, { vfx: (p.vfx || []).concat(keepDecos) });
      syncThemeInputs();
      previewTheme(staged);
      previewVfx(staged.vfx);
      renderTheme();
      status($("#themeStatus"), "preset loaded, hit Save theme live to publish", true);
    };
    wrap.appendChild(b);
  });
  syncThemeInputs();
  previewTheme(staged);
}

function syncThemeInputs() {
  $("#tAccent").value = staged.accent;
  $("#tAccent2").value = staged.accent2;
  $("#tGlow").value = staged.glow;
  $("#tName").value = staged.name;
  $("#tVfxBox").querySelectorAll("input[type=checkbox]").forEach((c) => { c.checked = (staged.vfx || []).includes(c.value); });
}

["tAccent", "tAccent2", "tGlow"].forEach((id) => {
  $("#" + id).addEventListener("input", () => {
    staged[id.replace("t", "").toLowerCase()] = $("#" + id).value;
    staged.name = "Custom";
    $("#tName").value = "Custom";
    previewTheme(staged);
    renderTheme();
  });
});
$("#tVfxBox").addEventListener("change", () => {
  staged.vfx = vfxFromBox();
  previewVfx(staged.vfx);
  renderTheme();
});

async function pushData(label, okMsg) {
  const btn = $(label);
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    const r = await fetch("/api/data", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-admin-password": PW },
      body: JSON.stringify(DATA)
    });
    if (r.ok) status($("#themeStatus"), okMsg, true);
    else if (r.status === 401) status($("#themeStatus"), "wrong password", false);
    else status($("#themeStatus"), "save failed (status " + r.status + ")", false);
  } catch (e) {
    status($("#themeStatus"), "save failed, backend not reachable", false);
  }
  btn.disabled = false;
  btn.textContent = label === "#themeSaveBtn" ? "Save theme live" : "Reset to default";
}

$("#themeSaveBtn").onclick = () => {
  staged.name = ($("#tName").value || "").trim().slice(0, 24) || "Custom";
  staged = {
    name: staged.name,
    accent: $("#tAccent").value.toLowerCase(),
    accent2: $("#tAccent2").value.toLowerCase(),
    glow: $("#tGlow").value.toLowerCase(),
    vfx: fxList(staged.vfx)
  };
  DATA.theme = staged;
  previewTheme(staged);
  pushData("#themeSaveBtn", "theme saved live ✓");
};

$("#themeDefaultBtn").onclick = () => {
  staged = Object.assign({}, DEFAULT_THEME);
  DATA.theme = Object.assign({}, DEFAULT_THEME);
  renderTheme();
  pushData("#themeDefaultBtn", "reset to default and saved live ✓");
};

/* ---------- publish ---------- */
$("#publishBtn").onclick = async () => {
  if (!kvReady) {
    status($("#pubStatus"), "no live backend connected yet, using Download data.js instead", false);
    return;
  }
  const btn = $("#publishBtn");
  btn.disabled = true;
  btn.textContent = "Publishing...";
  try {
    const r = await fetch("/api/data", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-admin-password": PW },
      body: JSON.stringify(DATA)
    });
    if (r.ok) status($("#pubStatus"), "published live ✓", true);
    else if (r.status === 401) status($("#pubStatus"), "wrong password", false);
    else status($("#pubStatus"), "publish failed (status " + r.status + ")", false);
  } catch (e) {
    status($("#pubStatus"), "publish failed, backend not reachable", false);
  }
  btn.disabled = false;
  btn.textContent = "Publish live";
};

$("#downloadBtn").onclick = () => {
  const blob = new Blob(["window.TIMELESS_DATA = " + JSON.stringify(DATA, null, 2) + ";\n"], { type: "text/javascript" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = "data.js";
  a.click();
  URL.revokeObjectURL(a.href);
};
