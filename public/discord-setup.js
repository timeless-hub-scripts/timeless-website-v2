const $ = (s) => document.querySelector(s);
let PW = sessionStorage.getItem("raw_pw") || "";
const authHeaders = (extra) => Object.assign({ "x-admin-password": PW, cache: "no-store" }, extra || {});

function status(el, msg, ok) {
  el.textContent = msg;
  el.className = "status " + (ok ? "ok" : "err");
}

async function loadConfig() {
  const r = await fetch("/api/discord/config", { headers: authHeaders() });
  if (r.status === 401) { $("#gate").classList.remove("hidden"); $("#console").classList.add("hidden"); return; }
  const j = await r.json();
  $("#cid").value = j.clientId || "";
  $("#gid").value = j.guildId || "";
  const bits = [];
  bits.push("client secret: " + (j.set.clientSecret ? "saved" : "not set"));
  bits.push("bot token: " + (j.set.botToken ? "saved" : "not set") + (j.set.botToken && !j.guildId ? " (guild id missing, auto-join off)" : ""));
  status($("#cfgStatus"), bits.join(" · "), j.set.clientSecret);
}

$("#unlockBtn").onclick = async () => {
  const pw = $("#pw").value;
  const r = await fetch("/api/verify", { headers: { "x-admin-password": pw }, cache: "no-store" });
  if (!r.ok) { $("#unlockErr").textContent = "wrong password"; return; }
  const j = await r.json().catch(() => ({}));
  if (j && j.configured && !j.ok) { $("#unlockErr").textContent = "wrong password"; return; }
  PW = pw;
  sessionStorage.setItem("raw_pw", pw);
  $("#unlockErr").textContent = "";
  $("#gate").classList.add("hidden");
  $("#console").classList.remove("hidden");
  loadConfig();
};
$("#pw").addEventListener("keydown", (e) => { if (e.key === "Enter") $("#unlockBtn").click(); });

$("#cfgForm").onsubmit = async (e) => {
  e.preventDefault();
  const body = {
    clientId: $("#cid").value.trim(),
    guildId: $("#gid").value.trim(),
    clientSecret: $("#csecret").value.trim(),
    botToken: $("#btok").value.trim()
  };
  const r = await fetch("/api/discord/config", {
    method: "POST",
    headers: authHeaders({ "content-type": "application/json" }),
    body: JSON.stringify(body)
  });
  if (r.status === 401) { status($("#cfgStatus"), "session expired, unlock again", false); return; }
  const j = await r.json().catch(() => ({}));
  if (!r.ok) { status($("#cfgStatus"), j.error || "could not save", false); return; }
  $("#csecret").value = "";
  $("#btok").value = "";
  status($("#cfgStatus"), "saved. login is live" + (j.set.botToken && $("#gid").value.trim() ? " and auto-join is on" : ""), true);
};

if (PW) $("#unlockBtn").click();
