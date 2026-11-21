import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database.types";
import { env } from "./env";
import { sessionStorage } from "./session-storage";

export type NouriSupabaseClient = SupabaseClient<Database>;

let client: NouriSupabaseClient | undefined;

// Only repositories in src/services/repositories may call this. Components and
// hooks go through a repository, never the client.
export function getSupabase(): NouriSupabaseClient {
  client ??= createClient<Database>(env.NEXT_PUBLIC_SUPABASE_URL, env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      storage: sessionStorage,
      persistSession: true,
      autoRefreshToken: true,
      // Sign-in is email and password; no tokens ever arrive in the URL.
      detectSessionInUrl: false,
    },
  });
  return client;
}
