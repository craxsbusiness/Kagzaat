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

/* ================================================================== */
/* Data Sync Functions - Save/Load all app data to Supabase           */
/* ================================================================== */

export async function syncAllData(data: {
  users: any[];
  courts: any[];
  cases: any[];
  docs: any[];
  evidence: any[];
  audit: any[];
  logins: any[];
  security: any[];
  notices: any[];
}): Promise<boolean> {
  if (!supabase) return false;
  try {
    const { error } = await supabase.from('app_data').upsert({
      id: 'main',
      data: data,
      updated_at: new Date().toISOString()
    });
    return !error;
  } catch {
    return false;
  }
}

export async function loadAllData(): Promise<any | null> {
  if (!supabase) return null;
  try {
    const { data, error } = await supabase.from('app_data').select('data').eq('id', 'main').single();
    if (error || !data) return null;
    return data.data;
  } catch {
    return null;
  }
}

/** Record a login attempt in the login_history table */
export async function recordLoginAttempt(params: {
  userId?: string;
  userCode?: string;
  email: string;
  ipAddress: string;
  userAgent: string;
  deviceInfo: string;
  location: string;
  status: "SUCCESS" | "FAILED" | "LOCKED" | "LOGOUT";
  failureReason?: string;
  attemptNumber?: number;
  sessionToken?: string;
}): Promise<{ ok: boolean; loginId?: string; error?: string }> {
  if (!supabase) return { ok: false, error: "not-configured" };
  try {
    const { data, error } = await supabase.rpc("record_login_attempt", {
      p_user_id: params.userId || null,
      p_user_code: params.userCode || null,
      p_email: params.email,
      p_ip_address: params.ipAddress,
      p_user_agent: params.userAgent,
      p_device_info: params.deviceInfo,
      p_location: params.location,
      p_status: params.status,
      p_failure_reason: params.failureReason || null,
      p_attempt_number: params.attemptNumber || 1,
      p_session_token: params.sessionToken || null,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, loginId: data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Get recent login history for a user */
export async function getUserLoginHistory(userId: string, limit = 50): Promise<{ ok: boolean; data?: any[]; error?: string }> {
  if (!supabase) return { ok: false, error: "not-configured" };
  try {
    const { data, error } = await supabase.rpc("get_user_login_history", {
      p_user_id: userId,
      p_limit: limit,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

/** Count recent failed login attempts */
export async function countRecentFailedLogins(email: string, minutes = 60): Promise<{ ok: boolean; count?: number; error?: string }> {
  if (!supabase) return { ok: false, error: "not-configured" };
  try {
    const { data, error } = await supabase.rpc("count_recent_failed_logins", {
      p_email: email,
      p_minutes: minutes,
    });
    if (error) return { ok: false, error: error.message };
    return { ok: true, count: data };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}
