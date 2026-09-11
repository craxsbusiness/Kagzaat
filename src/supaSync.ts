import { useCallback, useEffect, useRef, useState } from "react";
import { supabase, isSupabaseConfigured } from "./supabase";

/* ================================================================== */
/* Supabase-first data hook — no localStorage                          */
/*                                                                     */
/* Data lives ONLY in Supabase. On mount we fetch, on change we push.  */
/* Realtime channel keeps all devices in sync.                         */
/* ================================================================== */

export type SyncKey = "users" | "courts" | "cases" | "docs" | "evidence" | "audit" | "logins" | "security" | "notices";

export interface RegistryRow {
  id: SyncKey;
  payload: unknown;
  updated_at: string;
}

export const syncAvailable = (): boolean => isSupabaseConfigured();

/** Fetch all data from Supabase */
export async function fetchAllData(): Promise<Record<SyncKey, unknown[]>> {
  if (!supabase) {
    console.error("[SupaSync] Supabase client is null");
    return { users: [], courts: [], cases: [], docs: [], evidence: [], audit: [], logins: [], security: [], notices: [] };
  }

  const { data, error } = await supabase.from("registry").select("id,payload");
  if (error || !data) {
    console.error("[SupaSync] Fetch error:", error);
    return { users: [], courts: [], cases: [], docs: [], evidence: [], audit: [], logins: [], security: [], notices: [] };
  }

  const result: Record<string, unknown[]> = {
    users: [], courts: [], cases: [], docs: [], evidence: [], audit: [], logins: [], security: [], notices: [],
  };

  for (const row of data) {
    if (row.id && Array.isArray(row.payload)) {
      result[row.id] = row.payload;
    }
  }

  return result as Record<SyncKey, unknown[]>;
}

/** Push data to Supabase */
export async function pushToSupabase(key: SyncKey, data: unknown[]): Promise<void> {
  if (!supabase) return;

  const { error } = await supabase.from("registry").upsert({
    id: key,
    payload: data,
    updated_at: new Date().toISOString(),
  });

  if (error) {
    console.error(`[SupaSync] Push error for ${key}:`, error);
  }
}

/** Fetch registry rows (legacy API) */
export async function fetchRegistryRows(): Promise<RegistryRow[]> {
  if (!supabase) return [];
  const { data, error } = await supabase.from("registry").select("id,payload,updated_at");
  if (error || !data) return [];
  return data as unknown as RegistryRow[];
}

/** Upsert a registry row (legacy API) */
export function upsertRegistryRow(key: SyncKey, payload: unknown): void {
  if (!supabase) return;
  supabase.from("registry").upsert({ id: key, payload, updated_at: new Date().toISOString() })
    .then(({ error }) => {
      if (error) console.error(`[SupaSync] Upsert error for ${key}:`, error);
    });
}

/** Open realtime channel (legacy API) */
export function openRegistryChannel(onRow: (row: RegistryRow) => void): () => void {
  if (!supabase) return () => {};
  const channel = supabase
    .channel("lexvault-registry")
    .on("postgres_changes", { event: "*", schema: "public", table: "registry" }, (payload) => {
      const next = payload.new as RegistryRow | null;
      if (next && next.id) onRow(next);
    })
    .subscribe();
  return () => {
    if (supabase) supabase.removeChannel(channel);
  };
}

/** Hook that manages a single data collection in Supabase */
export function useSupabaseData<T>(
  key: SyncKey, 
  initial: T[] = []
): [T[], (data: T[] | ((prev: T[]) => T[])) => void, boolean] {
  const [data, setData] = useState<T[]>(initial);
  const [loaded, setLoaded] = useState(false);
  const lastPushed = useRef<string>("");
  const pushTimer = useRef<ReturnType<typeof setTimeout>>();

  // Fetch on mount
  useEffect(() => {
    if (!syncAvailable()) {
      setLoaded(true);
      return;
    }

    const load = async () => {
      const all = await fetchAllData();
      if (all[key] && all[key].length > 0) {
        setData(all[key] as T[]);
        lastPushed.current = JSON.stringify(all[key]);
      }
      setLoaded(true);
    };

    load();
  }, [key]);

  // Subscribe to realtime changes
  useEffect(() => {
    if (!syncAvailable() || !supabase) return;

    const channel = supabase
      .channel(`registry-${key}`)
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "registry", filter: `id=eq.${key}` },
        (payload) => {
          const newRow = payload.new as RegistryRow | null;
          if (newRow && Array.isArray(newRow.payload)) {
            const json = JSON.stringify(newRow.payload);
            if (json !== lastPushed.current) {
              setData(newRow.payload as T[]);
              lastPushed.current = json;
            }
          }
        }
      )
      .subscribe();

    return () => {
      if (supabase) {
        supabase.removeChannel(channel);
      }
    };
  }, [key]);

  // Update function — supports both direct values and updater functions
  const updateData = useCallback((newDataOrUpdater: T[] | ((prev: T[]) => T[])) => {
    const newData = typeof newDataOrUpdater === "function" 
      ? (newDataOrUpdater as (prev: T[]) => T[])(data)
      : newDataOrUpdater;
    
    setData(newData);

    if (!syncAvailable()) return;

    const json = JSON.stringify(newData);
    if (json === lastPushed.current) return;

    // Debounce rapid changes
    if (pushTimer.current) clearTimeout(pushTimer.current);
    pushTimer.current = setTimeout(() => {
      lastPushed.current = json;
      pushToSupabase(key, newData);
    }, 300);
  }, [key, data]);

  return [data, updateData, loaded];
}
