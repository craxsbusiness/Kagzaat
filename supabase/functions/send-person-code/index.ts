/* LexVault — person-code dispatch Edge Function (Deno)
 *
 * Invoked by the portal after a fresh registration:
 *   supabase.functions.invoke("send-person-code", { body: { to, phone, name, personCode } })
 *
 * Deploy:  supabase functions deploy send-person-code
 * Secret:  supabase secrets set RESEND_API_KEY=re_xxxxxxxx
 *
 * Swap the provider freely — the portal only cares that the function
 * returns 2xx. SMS can be added here alongside email (Twilio/MSG91/…)
 * using the `phone` field.
 */

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Content-Type": "application/json",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const { to, name, personCode, phone } = await req.json();
    const key = Deno.env.get("RESEND_API_KEY");
    if (!key) {
      return new Response(JSON.stringify({ ok: false, error: "RESEND_API_KEY not set" }), { status: 500, headers: cors });
    }

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "LexVault Registry <noreply@lexvault.example>",
        to: [to],
        subject: "Your LexVault person code",
        html: `
          <div style="font-family:Georgia,serif;max-width:520px;margin:0 auto;padding:24px">
            <h2 style="letter-spacing:0.12em;text-transform:uppercase">LexVault Registry</h2>
            <p>Hello ${name ?? "principal"},</p>
            <p>Your account has been provisioned. Your unique person code is:</p>
            <p style="font-family:monospace;font-size:26px;letter-spacing:0.18em;background:#f3ecdb;border:1px solid #c9b98f;padding:14px 18px;display:inline-block">
              ${personCode}
            </p>
            ${phone ? `<p>Registered contact: ${phone}</p>` : ""}
            <p style="color:#6b6152;font-size:13px">Keep this code safe — it identifies you across the registry and is not shown again.</p>
          </div>`,
      }),
    });

    if (!res.ok) {
      const body = await res.text();
      return new Response(JSON.stringify({ ok: false, error: body }), { status: 502, headers: cors });
    }
    return new Response(JSON.stringify({ ok: true }), { headers: cors });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, error: String(e) }), { status: 500, headers: cors });
  }
});
