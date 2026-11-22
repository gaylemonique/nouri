"use client";

import { onlineManager, type QueryClient } from "@tanstack/react-query";
import { useSyncExternalStore } from "react";
import { deviceStore } from "@/infrastructure/storage/device-store";
import {
  deleteEntry,
  logFood,
  updateEntry,
  withServerNumbers,
  type DiaryEntry,
  type ItemRow,
} from "@/services/repositories/diary-repository";
import { entryIdOf, nextToSend, queueDelete, shouldRetryLater, type QueuedOp } from "./queue-model";

// Every diary write goes through this queue, online or not.
//
// - A change is saved to device storage before anything is sent, so closing
//   the app or losing signal never loses it.
// - Changes are sent one at a time, in the order they were made. The RPCs
//   are idempotent on the entry id, so a change sent twice (app killed after
//   the server answered) does no harm.
// - "Try again later" errors (no connection, expired token) stop the run; it
//   resumes when the device comes back online, when the app returns to the
//   foreground, and every 15 seconds while something is waiting.
// - A server refusal is final for that change: an add is kept as "Not saved"
//   for the user to retry or remove; an edit or delete is dropped and a
//   message says so.
//
// Screens draw the saved diary from the query cache with the queued changes
// applied on top (applyQueue), so a refetch never hides a queued change.

type State = { ops: QueuedOp[]; notice: string | null; sendingOpId: string | null };

const RETRY_MS = 15_000;
const storageKey = (userId: string) => `nouri.write-queue.${userId}`;

let state: State = { ops: [], notice: null, sendingOpId: null };
let userId: string | null = null;
let queryClient: QueryClient | null = null;
let retryTimer: ReturnType<typeof setTimeout> | undefined;
let saving: Promise<void> = Promise.resolve();
const listeners = new Set<() => void>();

function emit(next: Partial<State>) {
  state = { ...state, ...next };
  listeners.forEach((l) => l());
}

// Writes are chained so an older copy can never land after a newer one.
function persist() {
  if (!userId) return;
  const key = storageKey(userId);
  const value = JSON.stringify(state.ops);
  saving = saving.then(() => deviceStore.setItem(key, value)).catch(() => undefined);
}

function setOps(ops: QueuedOp[]) {
  emit({ ops });
  persist();
}

const dayKey = (logDate: string) => ["diary", userId, logDate] as const;

function patchDay(logDate: string, change: (old: DiaryEntry[]) => DiaryEntry[]) {
  if (!queryClient) return;
  const key = dayKey(logDate);
  if (queryClient.getQueryData(key)) queryClient.setQueryData<DiaryEntry[]>(key, (old) => (old ? change(old) : old));
  else void queryClient.invalidateQueries({ queryKey: key });
}

function refreshDerived(recent: boolean) {
  if (!queryClient) return;
  void queryClient.invalidateQueries({ queryKey: ["daily-totals", userId] });
  if (recent) void queryClient.invalidateQueries({ queryKey: ["recent-foods", userId] });
}

async function send(op: QueuedOp): Promise<ItemRow | null> {
  if (op.kind === "add") return logFood(op.input);
  if (op.kind === "update") return updateEntry(op.input);
  await deleteEntry(op.entryId);
  return null;
}

// The server's answer goes into the cache in the same tick the change leaves
// the queue, so the entry never flickers.
function onSaved(op: QueuedOp, row: ItemRow | null) {
  if (op.kind === "add" && row) {
    patchDay(op.logDate, (old) => [...old.filter((e) => e.id !== row.id), withServerNumbers(op.entry, row)]);
  } else if (op.kind === "update" && row) {
    patchDay(op.logDate, (old) => old.map((e) => (e.id === row.id ? withServerNumbers(e, row) : e)));
  } else if (op.kind === "delete") {
    patchDay(op.logDate, (old) => old.filter((e) => e.id !== op.entryId));
  }
  setOps(state.ops.filter((o) => o.opId !== op.opId));
  refreshDerived(op.kind !== "update");
}

function onRefused(op: QueuedOp) {
  if (op.kind === "add") {
    setOps(state.ops.map((o) => (o.opId === op.opId ? { ...op, failed: true } : o)));
    return;
  }
  setOps(state.ops.filter((o) => o.opId !== op.opId));
  emit({
    notice:
      op.kind === "update"
        ? `Couldn't save your change to ${op.foodName}, so it is back to how it was. Try again.`
        : `Couldn't remove ${op.foodName}. It is still in your diary. Try again.`,
  });
}

async function flush() {
  if (state.sendingOpId || !userId || !queryClient || !onlineManager.isOnline()) return;
  const op = nextToSend(state.ops);
  if (!op) return;
  clearTimeout(retryTimer);
  emit({ sendingOpId: op.opId });
  try {
    const row = await send(op);
    emit({ sendingOpId: null });
    onSaved(op, row);
  } catch (error) {
    emit({ sendingOpId: null });
    if (shouldRetryLater(error)) {
      retryTimer = setTimeout(() => void flush(), RETRY_MS);
      return;
    }
    onRefused(op);
  }
  void flush();
}

const onVisible = () => {
  if (document.visibilityState === "visible") void flush();
};
let unsubscribeOnline: (() => void) | undefined;

export const syncQueue = {
  // Called once a session exists. Loads what an earlier run left behind and
  // sends it. Changes made before loading finished are kept after it.
  async start(forUser: string, client: QueryClient) {
    if (userId === forUser) return;
    userId = forUser;
    queryClient = client;
    const stored = await deviceStore.getItem(storageKey(forUser)).catch(() => null);
    const restored: QueuedOp[] = stored ? JSON.parse(stored) : [];
    const known = new Set(restored.map((o) => o.opId));
    setOps([...restored, ...state.ops.filter((o) => !known.has(o.opId))]);
    unsubscribeOnline?.();
    unsubscribeOnline = onlineManager.subscribe((online) => {
      if (online) void flush();
    });
    document.addEventListener("visibilitychange", onVisible);
    void flush();
  },

  add(op: Extract<QueuedOp, { kind: "add" }>) {
    setOps([...state.ops, op]);
    void flush();
  },

  update(op: Extract<QueuedOp, { kind: "update" }>) {
    setOps([...state.ops, op]);
    void flush();
  },

  remove(op: Extract<QueuedOp, { kind: "delete" }>) {
    setOps(queueDelete(state.ops, op, state.sendingOpId));
    void flush();
  },

  retry(entryId: string) {
    setOps(state.ops.map((o) => (o.kind === "add" && o.entry.id === entryId ? { ...o, failed: false } : o)));
    void flush();
  },

  // A refused add the user gives up on: it and anything queued for it go.
  discard(entryId: string) {
    setOps(state.ops.filter((o) => entryIdOf(o) !== entryId));
  },

  notify(notice: string | null) {
    emit({ notice });
  },

  // Sign-out: forget this user's queue on the device too. The Profile screen
  // asks before signing out while changes are still waiting.
  async reset() {
    clearTimeout(retryTimer);
    unsubscribeOnline?.();
    document.removeEventListener("visibilitychange", onVisible);
    if (userId) await deviceStore.removeItem(storageKey(userId)).catch(() => undefined);
    userId = null;
    queryClient = null;
    emit({ ops: [], notice: null, sendingOpId: null });
  },
};

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

const EMPTY: State = { ops: [], notice: null, sendingOpId: null };
const useQueueState = () => useSyncExternalStore(subscribe, () => state, () => EMPTY);

export const useQueuedOps = () => useQueueState().ops;
export const useDiaryNotice = () => useQueueState().notice;
export const usePendingCount = () => useQueueState().ops.length;

export function useOnline(): boolean {
  return useSyncExternalStore(
    (l) => onlineManager.subscribe(l),
    () => onlineManager.isOnline(),
    () => true,
  );
}
