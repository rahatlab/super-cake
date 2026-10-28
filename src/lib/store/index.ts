import type { Store } from "./store-interface";
import { localStore } from "./local";
import { supabaseStore } from "./supabase";

export type { Store } from "./store-interface";

/**
 * Returns the active data store.
 *
 * - Supabase (PostgreSQL)  -> when NEXT_PUBLIC_SUPABASE_URL + key are set
 * - Local JSON file store  -> zero-config demo / development mode
 *
 * Both implementations expose the exact same interface, so the rest of the
 * app never needs to know which one is live. The Supabase client itself is
 * created lazily on first query, so importing it here is free.
 */
export function getStore(): Store {
  if (isSupabaseConfigured()) return supabaseStore;

  if (process.env.NODE_ENV === "production" && process.env.ALLOW_LOCAL_STORE !== "true") {
    throw new Error(
      "Production requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY. " +
        "The local JSON store is for development only (set ALLOW_LOCAL_STORE=true to override).",
    );
  }

  return localStore;
}

export const isSupabaseConfigured = (): boolean =>
  Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);
