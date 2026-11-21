import type { ReactNode } from "react";

export function ScreenHeader({ title, kicker }: { title: string; kicker?: ReactNode }) {
  return (
    <header className="pt-6 pb-5">
      {kicker ? <p className="text-sm text-ink-muted">{kicker}</p> : null}
      <h1 className="font-display text-[2rem] leading-tight tracking-[-0.01em]">{title}</h1>
    </header>
  );
}

// Marks a screen section that exists in the layout but is not wired to data
// yet. Says what will appear, never shows sample numbers.
export function NotBuiltYet({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="rounded-card border border-dashed border-line px-4 py-5">
      <div className="flex items-baseline justify-between gap-3">
        <h2 className="font-medium">{heading}</h2>
        <span className="shrink-0 text-xs text-ink-muted">Not built yet</span>
      </div>
      <p className="mt-1.5 text-sm leading-relaxed text-ink-muted">{children}</p>
    </section>
  );
}
