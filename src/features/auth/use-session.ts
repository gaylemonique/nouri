"use client";

import type { Session } from "@supabase/supabase-js";
import { useSyncExternalStore } from "react";
import { watchSession } from "@/services/repositories/auth-repository";

export type SessionState =
  | { status: "loading"; session: null }
  | { status: "signed-out"; session: null }
  | { status: "signed-in"; session: Session };

const LOADING: SessionState = { status: "loading", session: null };

let state: SessionState = LOADING;
const listeners = new Set<() => void>();
let started = false;

// One subscription for the whole app, opened by the first component that asks.
// Supabase reads the stored session, then reports refreshes and sign-outs.
function start() {
  if (started) return;
  started = true;
  watchSession((_event, session) => {
    state = session ? { status: "signed-in", session } : { status: "signed-out", session: null };
    listeners.forEach((l) => l());
  });
}

function subscribe(listener: () => void) {
  start();
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export function useSession(): SessionState {
  return useSyncExternalStore(
    subscribe,
    () => state,
    () => LOADING,
  );
}
