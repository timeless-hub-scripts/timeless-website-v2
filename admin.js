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
