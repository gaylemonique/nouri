import type { ReactNode } from "react";

export function ScreenHeader({ title, kicker, action }: { title: string; kicker?: ReactNode; action?: ReactNode }) {
  return (
    <header className="flex items-end justify-between gap-4 pt-6 pb-4">
      <div>
        {kicker ? <p className="text-sm text-ink-muted">{kicker}</p> : null}
        <h1 className="font-display text-[2rem] leading-tight tracking-[-0.01em]">{title}</h1>
      </div>
      {action}
    </header>
  );
}

export function SectionTitle({ children, aside }: { children: ReactNode; aside?: ReactNode }) {
  return (
    <div className="mb-2 flex items-baseline justify-between gap-3">
      <h2 className="text-[0.8125rem] font-semibold text-ink-muted">{children}</h2>
      {aside ? <span className="text-xs text-ink-muted">{aside}</span> : null}
    </div>
  );
}
