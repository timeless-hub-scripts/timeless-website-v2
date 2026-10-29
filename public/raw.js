const $ = (s) => document.querySelector(s);
let PW = sessionStorage.getItem("raw_pw") || "";
let PASTES = [];            // local view, corrected by the server on refresh
const LOCAL = {};           // name -> { numbers, content } saved this session

function esc(x) {
  const d = document.createElement("div");
  d.textContent = x == null ? "" : String(x);
  return d.innerHTML;
}
function status(el, msg, ok) {
  el.textContent = msg;
  el.className = "status " + (ok ? "ok" : "err");
}
const authHeaders = (extra) => Object.assign({ "x-admin-password": PW, cache: "no-store" }, extra || {});

function lock(message) {
  PW = "";
  sessionStorage.removeItem("raw_pw");
  $("#console").classList.add("hidden");
  $("#gate").classList.remove("hidden");
  $("#unlockErr").textContent = message || "session expired; unlock again";
}

function renderPastes() {
  const box = $("#pasteList");
  if (!PASTES.length) {
    box.innerHTML = '<p class="empty">no pastes yet</p>';
    return;
  }
  box.innerHTML = "";
  PASTES.forEach((p) => {
    const base = location.origin + "/" + p.name + ".cheat";
    const row = document.createElement("div");
    row.className = "paste-row";
    row.innerHTML = `
      <div class="paste-main">
        <strong>${esc(p.name)}</strong>
        <span class="paste-meta">${Number(p.size).toLocaleString()} chars${p.numbers ? " · nums " + esc(p.numbers) : ""}</span>
        <a class="paste-link" href="${esc(base)}" target="_blank" rel="noopener">${esc(base)}</a>
      </div>
      <div class="paste-actions">
        <button type="button" class="btn btn-sm" data-act="open">Open</button>
        <button type="button" class="btn btn-sm" data-act="copy">Copy link</button>
        <button type="button" class="btn btn-sm" data-act="edit">Edit</button>
        <button type="button" class="btn btn-sm danger" data-act="del">Delete</button>
      </div>`;
    row.querySelector('[data-act="open"]').onclick = () => window.open(base, "_blank");
    row.querySelector('[data-act="copy"]').onclick = async () => {
      try { await navigator.clipboard.writeText(base); } catch (e) {}
    };
    row.querySelector('[data-act="edit"]').onclick = async () => {
      if (LOCAL[p.name]) {
        $("#pName").value = p.name;
        $("#pNums").value = LOCAL[p.name].numbers || "";
        $("#pContent").value = LOCAL[p.name].content;
      } else {
        const g = await fetch("/api/raw/get?name=" + encodeURIComponent(p.name), { headers: authHeaders() });
        if (!g.ok) { status($("#pasteStatus"), "could not load paste", false); return; }
        const gj = await g.json();
        $("#pName").value = gj.name;
        $("#pNums").value = gj.numbers || "";
        $("#pContent").value = gj.content;
      }
      window.scrollTo({ top: 0, behavior: "smooth" });
      status($("#pasteStatus"), "editing " + p.name, true);
      $("#pasteLinks").textContent = "";
    };
    row.querySelector('[data-act="del"]').onclick = async () => {
      if (!confirm("Delete paste " + p.name + "?")) return;
      const d = await fetch("/api/raw/delete", { method: "POST", headers: authHeaders({ "content-type": "application/json" }), body: JSON.stringify({ name: p.name }) });
      if (!d.ok) { status($("#pasteStatus"), "delete failed", false); return; }
      PASTES = PASTES.filter((x) => x.name !== p.name);
      delete LOCAL[p.name];
      renderPastes();
    };
    box.appendChild(row);
  });
}

async function loadList() {
  const r = await fetch("/api/raw/list", { headers: authHeaders() });
  if (r.status === 401) { lock("session expired or password rejected"); return; }
  if (r.status === 503) { status($("#pasteStatus"), "admin password is not configured on the server", false); return; }
  if (!r.ok) { status($("#pasteStatus"), "could not load pastes", false); return; }
  const j = await r.json();
  // server wins, but keep pastes saved this session the server has not listed yet
  const server = j.pastes || [];
  const names = new Set(server.map((p) => p.name));
  const pending = Object.keys(LOCAL).filter((n) => !names.has(n))
    .map((n) => ({ name: n, numbers: LOCAL[n].numbers || "", size: LOCAL[n].content.length, updated: 0 }));
  PASTES = server.concat(pending);
  renderPastes();
}
$("#refreshBtn").onclick = loadList;

/* ---------- gate ---------- */
async function unlock() {
  const pw = $("#pw").value;
  $("#unlockErr").textContent = "";
  try {
    const r = await fetch("/api/verify", { headers: { "x-admin-password": pw }, cache: "no-store" });
    if (r.status === 503) { $("#unlockErr").textContent = "admin password is not configured on the server"; return; }
    if (!r.ok) { $("#unlockErr").textContent = "wrong password"; return; }
    const j = await r.json();
    if (!j || !j.configured) { $("#unlockErr").textContent = "admin password is not configured on the server"; return; }
    if (!j.ok) { $("#unlockErr").textContent = "wrong password"; return; }
  } catch (e) { $("#unlockErr").textContent = "could not reach server"; return; }
  PW = pw;
  sessionStorage.setItem("raw_pw", pw);
  $("#gate").classList.add("hidden");
  $("#console").classList.remove("hidden");
  loadList();
}
$("#unlockBtn").onclick = unlock;
$("#pw").addEventListener("keydown", (e) => { if (e.key === "Enter") unlock(); });

/* ---------- save ---------- */
$("#pasteForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const name = $("#pName").value.trim().toLowerCase();
  const numbers = $("#pNums").value.trim();
  const content = $("#pContent").value;
  const r = await fetch("/api/raw/save", {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify({ name, numbers, content })
  });
  const j = await r.json().catch(() => ({}));
  if (r.status === 401) { lock("session expired or password rejected"); return; }
  if (r.status === 503) { status($("#pasteStatus"), "admin password is not configured on the server", false); return; }
  if (!r.ok) { status($("#pasteStatus"), j.error || "save failed", false); $("#pasteLinks").textContent = ""; return; }
  const base = location.origin + j.url;
  $("#pasteLinks").textContent = base + (j.numberedUrl ? "  |  " + location.origin + j.numberedUrl : "");
  status($("#pasteStatus"), "saved " + name, true);
  LOCAL[name] = { numbers, content };
  const entry = { name, numbers, size: content.length, updated: Date.now() };
  const i = PASTES.findIndex((p) => p.name === name);
  if (i >= 0) PASTES[i] = entry; else PASTES.unshift(entry);
  renderPastes();
});

$("#clearBtn").onclick = () => {
  $("#pName").value = ""; $("#pNums").value = ""; $("#pContent").value = "";
  $("#pasteStatus").textContent = ""; $("#pasteStatus").className = "status";
  $("#pasteLinks").textContent = "";
};

$("#pFile").addEventListener("change", () => {
  const f = $("#pFile").files[0];
  if (!f) return;
  const reader = new FileReader();
  reader.onload = () => {
    $("#pContent").value = String(reader.result);
    status($("#pasteStatus"), "loaded " + f.name + " (" + Number(f.size).toLocaleString() + " bytes)", true);
  };
  reader.readAsText(f);
  $("#pFile").value = "";
});
