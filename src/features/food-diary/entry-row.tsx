"use client";

import { outbox } from "./outbox";
import { useRetryAdd, type DayEntry } from "./use-diary";
import { formatGrams, formatKcal, formatQuantity } from "@/utils/format";

export function amountLabel(entry: DayEntry): string {
  if (!entry.servingName) return `${formatGrams(entry.consumed.grams)} g`;
  const serving = entry.quantity === 1 ? entry.servingName : `${formatQuantity(entry.quantity)} × ${entry.servingName}`;
  return `${serving} · ${formatGrams(entry.consumed.grams)} g`;
}

// A saved entry opens for editing. One still saving can't be edited yet, and
// one that failed offers Retry (same id, so no duplicate) or Remove.
export function EntryRow({ entry, onOpen }: { entry: DayEntry; onOpen: () => void }) {
  const retry = useRetryAdd();
  const body = (
    <>
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{entry.foodName}</span>
        <span className="block text-sm text-ink-muted">
          {amountLabel(entry)}
          {entry.status === "saving" ? " · Saving…" : null}
        </span>
      </span>
      <span className="text-sm font-semibold">{formatKcal(entry.consumed.calories)}</span>
    </>
  );

  if (entry.status === "saved") {
    return (
      <button type="button" onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left">
        {body}
      </button>
    );
  }

  if (entry.status === "saving") {
    return <div className="flex min-h-14 items-center gap-3 py-2.5 opacity-70">{body}</div>;
  }

  return (
    <div className="py-2.5">
      <div className="flex items-center gap-3">{body}</div>
      <div className="mt-1 flex items-center gap-1 text-sm">
        <span className="mr-auto">Not saved. Check your connection.</span>
        <button type="button" onClick={() => retry(entry.id)} className="h-11 px-2 font-medium text-accent">
          Retry
        </button>
        <button type="button" onClick={() => outbox.remove(entry.id)} className="h-11 px-2 text-ink-muted hover:text-ink">
          Remove
        </button>
      </div>
    </div>
  );
}
