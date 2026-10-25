const $ = (s) => document.querySelector(s);
let DATA = window.TIMELESS_DATA || { tabs: [], scripts: [] };
let activeTab = "ALL";

/* ---------- theme ---------- */
const DEFAULT_THEME = { name: "Default", accent: "#ff2e7d", accent2: "#ff7a18", glow: "#ff2e7d" };
function hexOk(h) { return typeof h === "string" && /^#[0-9a-f]{6}$/i.test(h); }
function hexRgb(h) { return [parseInt(h.slice(1,3),16), parseInt(h.slice(3,5),16), parseInt(h.slice(5,7),16)]; }
function applyTheme(t) {
  t = (t && typeof t === "object" && !Array.isArray(t)) ? t : {};
  const a  = hexOk(t.accent)  ? t.accent  : DEFAULT_THEME.accent;
  const a2 = hexOk(t.accent2) ? t.accent2 : DEFAULT_THEME.accent2;
  const g  = hexOk(t.glow)    ? t.glow    : DEFAULT_THEME.glow;
  const s = document.documentElement.style;
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

$("#continueBtn").onclick = () => {
  const l = $("#landing");
  l.classList.add("leave");
  setTimeout(() => {
    l.classList.add("hidden");
    const h = $("#hub");
    h.classList.remove("hidden");
    h.removeAttribute("aria-hidden");
    loadData();
  }, 330);
};

// Banner fallback if assets/banner.png is missing
$("#banner").addEventListener("error", () => {
  $("#banner").style.display = "none";
  $("#bannerFallback").classList.remove("hidden");
});
