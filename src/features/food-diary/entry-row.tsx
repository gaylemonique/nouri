"use client";

import { formatGrams, formatKcal, formatQuantity } from "@/utils/format";
import { syncQueue, useOnline } from "./sync-queue";
import type { DayEntry } from "./use-diary";

export function amountLabel(entry: DayEntry): string {
  if (!entry.servingName) return `${formatGrams(entry.consumed.grams)} g`;
  const serving = entry.quantity === 1 ? entry.servingName : `${formatQuantity(entry.quantity)} × ${entry.servingName}`;
  return `${serving} · ${formatGrams(entry.consumed.grams)} g`;
}

// Saved and queued entries both open for editing; a queued edit follows the
// queued add. One the server refused offers Retry (same id, so never a
// duplicate) or Remove.
export function EntryRow({ entry, onOpen }: { entry: DayEntry; onOpen: () => void }) {
  const online = useOnline();
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{entry.foodName}</span>
        <span className="block text-sm text-ink-muted">
          {amountLabel(entry)}
          {entry.status === "pending" ? (online ? " · Saving…" : " · Waiting for connection") : null}
        </span>
      </span>
      <span className="text-sm font-semibold">{formatKcal(entry.consumed.calories)}</span>
    </>
  );

  if (entry.status !== "failed") {
    return (
      <button type="button" onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left">
        {body}
      </button>
    );
  }

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-3">{body}</div>
      <div className="mt-1 flex items-center gap-1 text-sm">
        <span className="mr-auto">Not saved. The server refused this entry.</span>
        <button type="button" onClick={() => syncQueue.retry(entry.id)} className="h-11 px-2 font-medium text-accent">
          Retry
        </button>
        <button type="button" onClick={() => syncQueue.discard(entry.id)} className="h-11 px-2 text-ink-muted hover:text-ink">
          Remove
        </button>
      </div>
    </div>
  );
}
