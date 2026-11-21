import { useId, type InputHTMLAttributes, type ReactNode, type Ref } from "react";

type Props = InputHTMLAttributes<HTMLInputElement> & {
  label: string;
  hint?: ReactNode;
  error?: string;
  suffix?: string;
  trailing?: ReactNode;
  ref?: Ref<HTMLInputElement>;
};

// Label above, error below, both tied to the input for screen readers.
// Works with react-hook-form's register(): ref is a plain prop in React 19.
export function TextField({ label, hint, error, suffix, trailing, className = "", ref, ...input }: Props) {
  const id = useId();
  const describedBy = [hint ? `${id}-hint` : null, error ? `${id}-error` : null].filter(Boolean).join(" ") || undefined;
  return (
    <div className={className}>
      <label htmlFor={id} className="text-sm font-medium">
        {label}
      </label>
      {hint ? (
        <p id={`${id}-hint`} className="text-sm text-ink-muted">
          {hint}
        </p>
      ) : null}
      <div
        className={`mt-1.5 flex h-12 items-center rounded-lg border bg-paper focus-within:border-ink ${
          error ? "border-ink" : "border-line"
        }`}
      >
        <input
          id={id}
          ref={ref}
          aria-invalid={error ? true : undefined}
          aria-describedby={describedBy}
          className="h-full min-w-0 flex-1 rounded-lg bg-transparent px-3 text-base outline-none"
          {...input}
        />
        {suffix ? <span className="pr-3 text-sm text-ink-muted">{suffix}</span> : null}
        {trailing}
      </div>
      {error ? (
        <p id={`${id}-error`} className="mt-1 text-sm text-ink">
          {error}
        </p>
      ) : null}
    </div>
  );
}
