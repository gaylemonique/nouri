"use client";

// Single-choice row of options (serving, meal, week/month). Radio semantics,
// styled as buttons; wraps instead of scrolling sideways.
export function ChoiceGroup<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: { value: T; label: string }[];
  value: T;
  onChange: (v: T) => void;
}) {
  return (
    <div role="radiogroup" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => {
        const selected = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(o.value)}
            className={`min-h-10 rounded-lg border px-3 text-sm transition-colors duration-150 ${
              selected ? "border-ink bg-ink text-paper" : "border-line text-ink hover:border-ink-muted"
            }`}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
