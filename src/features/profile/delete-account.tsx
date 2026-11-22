"use client";

import { useEffect, useRef, useState } from "react";
import { useDeleteAccount } from "@/features/auth/use-delete-account";
import { useOnline } from "@/features/food-diary/sync-queue";

// Google Play requires apps with accounts to let people delete them from
// inside the app. Two steps, plain words about what goes, no way to reach it
// by accident.
export function DeleteAccount({ email }: { email: string | undefined }) {
  const deleteAccount = useDeleteAccount();
  const online = useOnline();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panel = useRef<HTMLElement>(null);

  // The panel opens at the bottom of a long screen; bring it into view.
  useEffect(() => {
    if (open) panel.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [open]);

  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      await deleteAccount();
    } catch {
      setError("Couldn't delete your account. Check your connection and try again.");
      setBusy(false);
    }
  };

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="h-11 w-full text-sm text-ink-muted hover:text-ink">
        Delete account
      </button>
    );
  }

  return (
    <section ref={panel} aria-label="Delete account" className="scroll-mb-24 space-y-3 rounded-card border border-ink p-4">
      <h2 className="font-medium">Delete your account?</h2>
      <p className="text-sm leading-relaxed">
        This deletes {email ? <span className="font-medium">{email}</span> : "your account"}, your profile, your targets and every diary
        entry, on the server and on this phone. It can&apos;t be undone.
      </p>
      {!online ? <p className="text-sm text-ink-muted">You&apos;re offline. Deleting needs a connection.</p> : null}
      {error ? (
        <p role="alert" className="text-sm">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void confirm()}
        disabled={busy || !online}
        className="h-12 w-full rounded-lg bg-ink font-semibold text-paper disabled:opacity-50"
      >
        {busy ? "Deleting…" : "Delete my account and data"}
      </button>
      <button type="button" onClick={() => setOpen(false)} disabled={busy} className="h-11 w-full text-sm text-ink-muted hover:text-ink">
        Keep my account
      </button>
    </section>
  );
}
