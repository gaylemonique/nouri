"use client";

import { useOnline, usePendingCount } from "./sync-queue";

// One quiet line while the device is offline, so nobody wonders whether
// what they log is kept.
export function SyncStatus() {
  const online = useOnline();
  const pending = usePendingCount();
  if (online) return null;
  return (
    <p role="status" className="mt-4 rounded-lg bg-line/50 px-3 py-2 text-sm text-ink-muted">
      <span className="font-semibold text-ink">Offline.</span>{" "}
      {pending
        ? `${pending === 1 ? "1 change is" : `${pending} changes are`} kept on this phone and will sync when you're back online.`
        : "What you log is kept on this phone and syncs when you're back online."}
    </p>
  );
}
