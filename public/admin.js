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
const DEFAULT_THEME = { name: "Default", accent: "#ff2e7d", accent2: "#ff7a18", glow: "#ff2e7d" };
const THEME_PRESETS = [
  { name: "Default",           accent: "#ff2e7d", accent2: "#ff7a18", glow: "#ff2e7d" },
  { name: "Halloween",         accent: "#ff7a18", accent2: "#8b2fd6", glow: "#ff7a18" },
  { name: "Christmas",         accent: "#e02430", accent2: "#1f9d55", glow: "#e02430" },
  { name: "New Year",          accent: "#ffd24a", accent2: "#ff7a18", glow: "#ffd24a" },
  { name: "New Year's Eve",    accent: "#f5c518", accent2: "#7b2ff7", glow: "#f5c518" },
  { name: "Valentine's Day",   accent: "#ff4d8d", accent2: "#e0245e", glow: "#ff4d8d" },
  { name: "St Patrick's Day",  accent: "#1fae55", accent2: "#a8d94a", glow: "#1fae55" },
  { name: "Easter",            accent: "#ff9ecb", accent2: "#a5d8ff", glow: "#ff9ecb" },
  { name: "Ramadan & Eid",     accent: "#2bb3a3", accent2: "#f2c14e", glow: "#2bb3a3" },
  { name: "Diwali",            accent: "#ff8c1a", accent2: "#ffd24a", glow: "#ff8c1a" },
  { name: "Bonfire Night",     accent: "#ff5a1f", accent2: "#e0245e", glow: "#ff5a1f" },
  { name: "Day of the Dead",   accent: "#ff2ea6", accent2: "#ff7a18", glow: "#ff2ea6" },
  { name: "Hanukkah",          accent: "#3b82f6", accent2: "#9fb7d6", glow: "#3b82f6" },
  { name: "Lunar New Year",    accent: "#e02430", accent2: "#ffd24a", glow: "#e02430" },
  { name: "Pride",             accent: "#ff6ec7", accent2: "#4dc9ff", glow: "#ff6ec7" },
  { name: "4th of July",       accent: "#e02430", accent2: "#3b82f6", glow: "#e02430" },
  { name: "Black Friday",      accent: "#ffb020", accent2: "#4a4a55", glow: "#ffb020" }
];
let activePreset = null;

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
}

function currentTheme() {
  const t = (DATA.theme && typeof DATA.theme === "object") ? DATA.theme : {};
  return {
    name: typeof t.name === "string" && t.name ? t.name : "Default",
    accent: hexOk(t.accent) ? t.accent : DEFAULT_THEME.accent,
    accent2: hexOk(t.accent2) ? t.accent2 : DEFAULT_THEME.accent2,
    glow: hexOk(t.glow) ? t.glow : DEFAULT_THEME.glow
  };
}

function renderTheme() {
  const t = currentTheme();
  const wrap = $("#themePresets");
  wrap.innerHTML = "";
  THEME_PRESETS.forEach((p) => {
    const b = document.createElement("button");
    b.type = "button";
    b.className = "theme-chip" + (p.name === t.name && p.accent === t.accent && p.accent2 === t.accent2 && p.glow === t.glow ? " active" : "");
    b.style.setProperty("--c1", p.accent);
    b.style.setProperty("--c2", p.accent2);
    b.innerHTML = '<span class="sw"></span>' + esc(p.name);
    b.onclick = () => {
      activePreset = p;
      $("#tAccent").value = p.accent;
      $("#tAccent2").value = p.accent2;
      $("#tGlow").value = p.glow;
      $("#tName").value = p.name;
      previewTheme(p);
      renderTheme();
      status($("#themeStatus"), "preset loaded, hit Save theme live to publish", true);
    };
    wrap.appendChild(b);
  });
  if (!hexOk(DATA.theme && DATA.theme.accent)) activePreset = null;
  $("#tAccent").value = t.accent;
  $("#tAccent2").value = t.accent2;
  $("#tGlow").value = t.glow;
  $("#tName").value = t.name;
  previewTheme(t);
}

["tAccent", "tAccent2", "tGlow"].forEach((id) => {
  $("#" + id).addEventListener("input", () => {
    activePreset = null;
    previewTheme({ accent: $("#tAccent").value, accent2: $("#tAccent2").value, glow: $("#tGlow").value });
    renderTheme();
  });
});

$("#themeSaveBtn").onclick = async () => {
  const t = {
    name: ($("#tName").value || "").trim().slice(0, 24) || "Custom",
    accent: $("#tAccent").value.toLowerCase(),
    accent2: $("#tAccent2").value.toLowerCase(),
    glow: $("#tGlow").value.toLowerCase()
  };
  DATA.theme = t;
  previewTheme(t);
  const btn = $("#themeSaveBtn");
  btn.disabled = true;
  btn.textContent = "Saving...";
  try {
    const r = await fetch("/api/data", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-admin-password": PW },
      body: JSON.stringify(DATA)
    });
    if (r.ok) status($("#themeStatus"), "theme saved live ✓", true);
    else if (r.status === 401) status($("#themeStatus"), "wrong password", false);
    else status($("#themeStatus"), "save failed (status " + r.status + ")", false);
  } catch (e) {
    status($("#themeStatus"), "save failed, backend not reachable", false);
  }
  btn.disabled = false;
  btn.textContent = "Save theme live";
};

$("#themeDefaultBtn").onclick = async () => {
  activePreset = THEME_PRESETS[0];
  DATA.theme = Object.assign({}, DEFAULT_THEME);
  $("#tAccent").value = DEFAULT_THEME.accent;
  $("#tAccent2").value = DEFAULT_THEME.accent2;
  $("#tGlow").value = DEFAULT_THEME.glow;
  $("#tName").value = DEFAULT_THEME.name;
  previewTheme(DEFAULT_THEME);
  renderTheme();
  try {
    const r = await fetch("/api/data", {
      method: "PUT",
      headers: { "content-type": "application/json", "x-admin-password": PW },
      body: JSON.stringify(DATA)
    });
    if (r.ok) status($("#themeStatus"), "reset to default and saved live ✓", true);
    else if (r.status === 401) status($("#themeStatus"), "wrong password", false);
    else status($("#themeStatus"), "reset failed (status " + r.status + ")", false);
  } catch (e) {
    status($("#themeStatus"), "reset failed, backend not reachable", false);
  }
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
