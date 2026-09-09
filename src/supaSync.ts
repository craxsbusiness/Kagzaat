import { supabase, isSupabaseConfigured } from "./supabase";

/* ================================================================== */
/* Real-time registry sync                                             */
/*                                                                     */
/* Four collections travel through the `registry` table (one row per   */
/* collection): users · cases · docs · evidence. Local edits are       */
/* debounced-upserted; the realtime channel pushes remote rows back    */
/* into every open device. JSON equality guards prevent echo loops.    */
/*                                                                     */
/* Prerequisite: run supabase/schema.sql once in the SQL editor.       */
/* ================================================================== */

export type SyncKey = "users" | "courts" | "cases" | "docs" | "evidence" | "audit" | "logins" | "security" | "notices";
export const SYNC_KEYS: SyncKey[] = ["users", "courts", "cases", "docs", "evidence", "audit", "logins", "security", "notices"];

export interface RegistryRow {
  id: SyncKey;
  payload: unknown;
  updated_at: string;
}

export const syncAvailable = (): boolean => isSupabaseConfigured();

export async function fetchRegistryRows(): Promise<RegistryRow[]> {
  if (!supabase) {
    console.error('[SupaSync] Supabase client is null');
    return [];
  }
  console.log('[SupaSync] Fetching registry rows from Supabase...');
  const { data, error } = await supabase.from("registry").select("id,payload,updated_at");
  if (error) {
    console.error('[SupaSync] Error fetching registry:', error);
    return [];
  }
  if (!data) {
    console.log('[SupaSync] No data returned from registry table');
    return [];
  }
  console.log('[SupaSync] Successfully fetched', data.length, 'rows');
  return data as unknown as RegistryRow[];
}

export function upsertRegistryRow(key: SyncKey, payload: unknown): void {
  if (!supabase) {
    console.error('[SupaSync] Cannot upsert - Supabase client is null');
    return;
  }
  console.log('[SupaSync] Upserting', key, 'to Supabase with', Array.isArray(payload) ? payload.length : 'non-array', 'items');
  supabase.from("registry").upsert({ id: key, payload, updated_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error) {
        console.error('[SupaSync] Error upserting', key, ':', error);
      } else {
        console.log('[SupaSync] Successfully upserted', key);
      }
    });
}

export type RowHandler = (row: RegistryRow) => void;

/** Opens the realtime channel; returns an unsubscribe function. */
export function openRegistryChannel(onRow: RowHandler): () => void {
  const client = supabase;
  if (!client) return () => {};
  const channel = client
    .channel("lexvault-registry")
    .on(
      "postgres_changes",
      { event: "*", schema: "public", table: "registry" },
      (payload) => {
        const next = payload.new as unknown as RegistryRow | null;
        if (next && next.id) onRow(next);
      }
    )
    .subscribe();
  return () => {
    void client.removeChannel(channel);
  };
}
