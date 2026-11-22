import Link from "next/link";
import { ProgressBar } from "@/components/ui/progress-bar";
import { formatKcal } from "@/utils/format";

// The one number people open the app for: how much is left today.
export function CalorieSummary({ eaten, target }: { eaten: number; target: number | null }) {
  if (target === null) {
    return (
      <section aria-label="Calories today" className="rounded-card border border-line bg-surface px-4 pt-4 pb-5">
        <p className="text-5xl font-semibold leading-none tracking-tight">
          {formatKcal(eaten)}
          <span className="ml-2 text-base font-normal tracking-normal text-ink-muted">kcal eaten</span>
        </p>
        <p className="mt-3 text-sm text-ink-muted">
          No calorie target yet.{" "}
          <Link href="/profile/" className="font-medium text-accent">
            Set one in Profile
          </Link>
        </p>
      </section>
    );
  }

  const remaining = target - eaten;
  const over = remaining < 0;
  return (
    <section aria-label="Calories today" className="rounded-card border border-line bg-surface px-4 pt-4 pb-5">
      <p className="text-5xl font-semibold leading-none tracking-tight">
        {formatKcal(Math.abs(remaining))}
        <span className="ml-2 text-base font-normal tracking-normal text-ink-muted">{over ? "kcal over target" : "kcal left"}</span>
      </p>
      <div className="mt-4">
        <ProgressBar value={eaten} max={target} label="Calories eaten against target" size="lg" />
      </div>
      <dl className="mt-3 flex justify-between text-sm">
        <div>
          <dt className="sr-only">Eaten</dt>
          <dd>
            <span className="font-semibold">{formatKcal(eaten)}</span> <span className="text-ink-muted">eaten</span>
          </dd>
        </div>
        <div className="text-right">
          <dt className="sr-only">Target</dt>
          <dd>
            <span className="font-semibold">{formatKcal(target)}</span> <span className="text-ink-muted">target</span>
          </dd>
        </div>
      </dl>
    </section>
  );
}
