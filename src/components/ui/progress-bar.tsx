// Thin horizontal bar. Past the target it fills completely and switches to the
// ink colour, so "over" never looks like more success.
export function ProgressBar({
  value,
  max,
  fillClass = "bg-accent",
  label,
  size = "sm",
}: {
  value: number;
  max: number;
  fillClass?: string;
  label: string;
  size?: "sm" | "lg";
}) {
  const ratio = max > 0 ? value / max : 0;
  const over = ratio > 1;
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={Math.round(max)}
      aria-valuenow={Math.round(value)}
      className={`w-full overflow-hidden rounded-full bg-line ${size === "lg" ? "h-2.5" : "h-1.5"}`}
    >
      <div
        className={`h-full rounded-full transition-[width] duration-300 ${over ? "bg-ink" : fillClass}`}
        style={{ width: `${Math.min(ratio, 1) * 100}%` }}
      />
    </div>
  );
}
