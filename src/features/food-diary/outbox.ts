"use client";

import { useMemo, useSyncExternalStore } from "react";
import type { DiaryEntry, LogFoodInput } from "@/services/repositories/diary-repository";

// New entries live here from the moment they are added until the server has
// them. The screens list them next to saved entries, marked "Saving" or
// "Not saved" with Retry. Keeping them out of the query cache means a refetch
// can never drop an entry the server has not stored.
//
// ponytail: memory only. Closing the app loses unsaved entries, and nothing
// retries on its own. The SQLite sync queue (phase 07) replaces this store.
export type OutboxEntry = DiaryEntry & { status: "saving" | "failed"; input: LogFoodInput };

type State = { entries: OutboxEntry[]; notice: string | null };

let state: State = { entries: [], notice: null };
const listeners = new Set<() => void>();

function set(next: State) {
  state = next;
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

export const outbox = {
  put(entry: OutboxEntry) {
    set({ ...state, entries: [...state.entries.filter((e) => e.id !== entry.id), entry] });
  },
  setStatus(id: string, status: OutboxEntry["status"]) {
    set({ ...state, entries: state.entries.map((e) => (e.id === id ? { ...e, status } : e)) });
  },
  remove(id: string) {
    set({ ...state, entries: state.entries.filter((e) => e.id !== id) });
  },
  get(id: string) {
    return state.entries.find((e) => e.id === id);
  },
  // One message at a time for edits and deletes that failed and were undone.
  notify(notice: string | null) {
    set({ ...state, notice });
  },
  clear() {
    set({ entries: [], notice: null });
  },
};

const getState = () => state;
const EMPTY: State = { entries: [], notice: null };

export function useOutboxEntries(logDate: string | null): OutboxEntry[] {
  const { entries } = useSyncExternalStore(subscribe, getState, () => EMPTY);
  return useMemo(() => entries.filter((e) => e.logDate === logDate), [entries, logDate]);
}

export function useDiaryNotice(): string | null {
  return useSyncExternalStore(subscribe, getState, () => EMPTY).notice;
}
