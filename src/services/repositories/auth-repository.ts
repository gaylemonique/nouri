import type { AuthChangeEvent, Session } from "@supabase/supabase-js";
import { getSupabase } from "@/infrastructure/supabase/client";

export type Credentials = { email: string; password: string };

// Email confirmation is off on the project for now, so sign-up returns a
// session straight away. ponytail: once custom SMTP exists and confirmation is
// turned back on, signUp returns no session and the screen must say "check
// your email".
export async function signUp({ email, password }: Credentials): Promise<void> {
  const { error } = await getSupabase().auth.signUp({ email, password });
  if (error) throw error;
}

export async function signIn({ email, password }: Credentials): Promise<void> {
  const { error } = await getSupabase().auth.signInWithPassword({ email, password });
  if (error) throw error;
}

export async function signOut(): Promise<void> {
  // "local" ends this device's session only; other devices stay signed in.
  const { error } = await getSupabase().auth.signOut({ scope: "local" });
  if (error) throw error;
}

// Fires once with the stored session (INITIAL_SESSION), then on every change.
// Returns the unsubscribe function.
export function watchSession(listener: (event: AuthChangeEvent, session: Session | null) => void): () => void {
  const { data } = getSupabase().auth.onAuthStateChange(listener);
  return () => data.subscription.unsubscribe();
}

// Deletes the account and everything it owns on the server (delete_my_account
// cascades). The session on this device is then useless, so it is cleared
// locally; that call may fail because the user no longer exists.
export async function deleteAccount(): Promise<void> {
  const supabase = getSupabase();
  const { error } = await supabase.rpc("delete_my_account");
  if (error) throw error;
  await supabase.auth.signOut({ scope: "local" }).catch(() => undefined);
}
