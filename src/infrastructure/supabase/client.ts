import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { env } from "./env";

export type NouriSupabaseClient = SupabaseClient<Database>;

let client: NouriSupabaseClient | undefined;

// Only repositories in src/services/repositories may call this. Components and
// hooks go through a repository, never the client.
export function getSupabase(): NouriSupabaseClient {
  // ponytail: sessions persist in WebView localStorage, which iOS can clear
  // under storage pressure. Swap in a Capacitor Preferences storage adapter
  // when auth lands (phase 03).
  client ??= createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: false },
  });
  return client;
}
