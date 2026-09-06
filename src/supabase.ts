import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/* ================================================================== */
/* Supabase bridge                                                     */
/*                                                                     */
/* Set these in a `.env` file at the project root (see .env.example):  */
/*   VITE_SUPABASE_URL=https://xxxx.supabase.co                        */
/*   VITE_SUPABASE_ANON_KEY=eyJ…                                       */
/*                                                                     */
/* The anon key is PUBLIC-SAFE by design (Supabase's RLS protects the  */
/* data) — it is not a secret like a service-role key.                 */
/*                                                                     */
/* For emails to actually leave Supabase, enable SMTP in the Supabase  */
/* dashboard (Project → Auth → Emails → SMTP settings). Without SMTP,  */
/* OTP codes only appear in the Supabase logs and the portal falls     */
/* back to its offline demo channel automatically.                     */
/*                                                                     */
/* Person-code emails are dispatched through the `send-person-code`    */
/* Edge Function (see supabase/functions/send-person-code). Deploy it  */
/* once with `supabase functions deploy send-person-code` and set its  */
/* RESEND_API_KEY (or your provider) secret.                           */
/* ================================================================== */

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};
const SUPABASE_URL = env.VITE_SUPABASE_URL ?? "";
const SUPABASE_ANON_KEY = env.VITE_SUPABASE_ANON_KEY ?? "";

export const supabase: SupabaseClient | null =
  SUPABASE_URL.length > 0 && SUPABASE_ANON_KEY.length > 0 ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY) : null;

export const isSupabaseConfigured = (): boolean => supabase !== null;

/** Factor-2 delivery — asks Supabase to email a one-time code (or magic link) to the user.
 *  The link returns the browser to this portal with a token in the URL hash,
 *  which the gateway captures to complete the step even if the email template
 *  doesn't print the 6-digit code. */
export async function sendOtpEmail(email: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "not-configured" };
  try {
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        shouldCreateUser: true,
        emailRedirectTo: `${window.location.origin}/`,
      },
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Drop the Supabase session created when a magic link is followed —
 *  the portal keeps its own short-lived session. */
export async function discardSupabaseSession(): Promise<void> {
  if (!supabase) return;
  try {
    await supabase.auth.signOut({ scope: "local" });
  } catch {
    /* best effort */
  }
}

/**
 * Factor-2 verification — checks the entered code against Supabase.
 * The portal keeps its own short-lived session, so the Supabase session
 * created by verification is discarded immediately (local scope only).
 */
export async function verifyEmailOtp(email: string, token: string): Promise<{ ok: boolean; error?: string }> {
  if (!supabase) return { ok: false, error: "not-configured" };
  try {
    const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
    if (error) return { ok: false, error: error.message };
    await supabase.auth.signOut({ scope: "local" });
    return { ok: true };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Post-registration person-code dispatch via the Edge Function. */
export async function sendPersonCodeEmail(p: { to: string; phone?: string; name: string; personCode: string }): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.functions.invoke("send-person-code", { body: p });
    return !error;
  } catch {
    return false;
  }
}
