"use client";

import { Minus, Plus } from "lucide-react";
import { formatQuantity } from "@/utils/format";

export function Stepper({
  value,
  onChange,
  min = 0.5,
  max = 100,
  step = 0.5,
  label,
}: {
  value: number;
  onChange: (v: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label: string;
}) {
  const clamp = (v: number) => Math.min(max, Math.max(min, Math.round(v / step) * step));
  const button =
    "grid size-11 place-items-center rounded-full border border-line text-ink disabled:text-ink-muted/50 disabled:border-line/60";
  return (
    <div className="flex items-center gap-3" role="group" aria-label={label}>
      <button type="button" className={button} aria-label={`Less ${label.toLowerCase()}`} disabled={value <= min} onClick={() => onChange(clamp(value - step))}>
        <Minus aria-hidden size={18} />
      </button>
      <output aria-live="polite" className="min-w-10 text-center text-lg font-semibold">
        {formatQuantity(value)}
      </output>
      <button type="button" className={button} aria-label={`More ${label.toLowerCase()}`} disabled={value >= max} onClick={() => onChange(clamp(value + step))}>
        <Plus aria-hidden size={18} />
      </button>
    </div>
  );
}
