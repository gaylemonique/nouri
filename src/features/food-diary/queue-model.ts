// Pure rules for the write queue: what a queued change looks like, how queued
// changes are drawn on top of the saved diary, and which errors mean "try
// again later". No React, no storage, no network, so it is unit-tested.
import { calculateConsumed } from "@/domain/nutrition/calculate";
import type { DiaryEntry, LogFoodInput, UpdateEntryInput } from "@/services/repositories/diary-repository";
import type { MealType } from "./meals";

export type EntryChange = {
  meal: MealType;
  quantity: number;
  servingId: string | null;
  servingName: string | null;
  servingGrams: number;
};

export type QueuedOp =
  | { opId: string; kind: "add"; logDate: string; entry: DiaryEntry; input: LogFoodInput; failed: boolean }
  | { opId: string; kind: "update"; logDate: string; entryId: string; foodName: string; change: EntryChange; input: UpdateEntryInput }
  | { opId: string; kind: "delete"; logDate: string; entryId: string; foodName: string };

// saved: on the server. pending: queued, shown with the client calculator's
// numbers. failed: the server refused an add; the user retries or removes it.
export type DayEntry = DiaryEntry & { status: "saved" | "pending" | "failed" };

export const entryIdOf = (op: QueuedOp) => (op.kind === "add" ? op.entry.id : op.entryId);

export function applyChange(entry: DiaryEntry, change: EntryChange): DiaryEntry {
  // Same rule as update_food_log_item: rescale from the entry's own snapshot.
  return { ...entry, ...change, consumed: calculateConsumed(entry.per100, change.servingGrams, change.quantity) };
}

// The day as the user should see it: saved entries with every queued change
// for that day applied in order.
export function applyQueue(saved: DiaryEntry[], ops: QueuedOp[], logDate: string): DayEntry[] {
  let list: DayEntry[] = saved.map((e) => ({ ...e, status: "saved" }));
  for (const op of ops) {
    if (op.logDate !== logDate) continue;
    if (op.kind === "add") {
      if (!list.some((e) => e.id === op.entry.id)) list.push({ ...op.entry, status: op.failed ? "failed" : "pending" });
    } else if (op.kind === "update") {
      list = list.map((e) =>
        e.id === op.entryId ? { ...applyChange(e, op.change), status: e.status === "failed" ? "failed" : "pending" } : e,
      );
    } else {
      list = list.filter((e) => e.id !== op.entryId);
    }
  }
  return list;
}

// Removing an entry whose add has not been sent yet never needs the server:
// drop the add and every change queued after it. Otherwise queue the delete.
export function queueDelete(ops: QueuedOp[], op: Extract<QueuedOp, { kind: "delete" }>, inFlightOpId: string | null): QueuedOp[] {
  const add = ops.find((o) => o.kind === "add" && o.entry.id === op.entryId);
  if (add && add.opId !== inFlightOpId) return ops.filter((o) => entryIdOf(o) !== op.entryId);
  return [...ops, op];
}

// The next change to send. Changes to an entry whose add the server refused
// wait with it, since the server has no such entry.
export function nextToSend(ops: QueuedOp[]): QueuedOp | undefined {
  const blocked = new Set(ops.filter((o) => o.kind === "add" && o.failed).map(entryIdOf));
  return ops.find((o) => !blocked.has(entryIdOf(o)));
}

// Errors that mean "send it again later" rather than "the server refused":
// - supabase-js turns a failed fetch into an error with an empty code and the
//   fetch error's message;
// - after a long time offline the access token can be expired or not yet
//   refreshed (PGRST301/PGRST303, or the RPCs' own 42501 "not authenticated").
// Anything else with a code is a real answer from the server.
const RETRY_CODES = new Set(["PGRST301", "PGRST303", "42501"]);

export function shouldRetryLater(error: unknown): boolean {
  if (error instanceof TypeError) return true;
  if (typeof error !== "object" || error === null) return false;
  const { code, message } = error as { code?: unknown; message?: unknown };
  if (typeof code === "string" && RETRY_CODES.has(code)) return true;
  return !code && typeof message === "string" && /fetch|network|load failed|timed out/i.test(message);
}
