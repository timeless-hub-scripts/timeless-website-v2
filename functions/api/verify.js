const json = (data, status = 200) =>
  new Response(JSON.stringify(data), { status, headers: { "content-type": "application/json" } });

export async function onRequestGet({ env, request }) {
  const pw = request.headers.get("x-admin-password") || "";
  if (!env.ADMIN_PASSWORD) return json({ ok: false, configured: false });
  return json({ ok: pw === env.ADMIN_PASSWORD, configured: true });
}
