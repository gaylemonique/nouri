"use client";

import { outbox, useDiaryNotice } from "./outbox";

// Shows the last edit or delete that failed and was undone.
export function DiaryNotice() {
  const notice = useDiaryNotice();
  if (!notice) return null;
  return (
    <div role="alert" className="mb-4 flex items-start gap-3 rounded-lg border border-ink px-3 py-2 text-sm">
      <p className="flex-1 py-1">{notice}</p>
      <button type="button" onClick={() => outbox.notify(null)} className="-my-1 h-9 px-1 font-medium text-accent">
        OK
      </button>
    </div>
  );
}
