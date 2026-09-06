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

export type SyncKey = "users" | "cases" | "docs" | "evidence";
export const SYNC_KEYS: SyncKey[] = ["users", "cases", "docs", "evidence"];

export interface RegistryRow {
  id: SyncKey;
  payload: unknown;
  updated_at: string;
}

export const syncAvailable = (): boolean => isSupabaseConfigured();

export async function fetchRegistryRows(): Promise<RegistryRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("registry").select("id,payload,updated_at");
  if (error || !data) return [];
  return data as unknown as RegistryRow[];
}

export function upsertRegistryRow(key: SyncKey, payload: unknown): void {
  if (!supabase) return;
  void supabase.from("registry").upsert({ id: key, payload, updated_at: new Date().toISOString() });
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
