"use client";

import { X } from "lucide-react";
import { useEffect, useRef, type ReactNode } from "react";

// Bottom sheet on the native <dialog> element: focus trap, Escape to close and
// an inert background come from the browser, so no dialog library is needed.
export function Sheet({
  open,
  onClose,
  title,
  children,
  footer,
}: {
  open: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
  footer?: ReactNode;
}) {
  const ref = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    <dialog
      ref={ref}
      aria-label={title}
      onClose={onClose}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose(); // tap on the backdrop
      }}
      className="sheet m-0 mt-auto mx-auto max-h-[88dvh] w-full max-w-md rounded-t-2xl bg-surface p-0 text-ink backdrop:bg-black/40"
    >
      <div className="flex max-h-[88dvh] flex-col">
        <div className="flex items-start justify-between gap-4 px-4 pt-4">
          <h2 className="font-display text-2xl leading-tight">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="-mr-2 -mt-1 grid size-11 shrink-0 place-items-center rounded-full text-ink-muted hover:text-ink"
          >
            <X aria-hidden size={20} />
          </button>
        </div>
        <div className="overflow-y-auto px-4 pb-4">{children}</div>
        {footer ? (
          <div className="border-t border-line px-4 pt-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">{footer}</div>
        ) : null}
      </div>
    </dialog>
  );
}
