"use client";

import Link from "next/link";
import { useState } from "react";
import { ScreenHeader, SectionTitle } from "@/components/shared/screen";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { dayStatus, summarizeDays, TARGET_BAND, type DayStatus } from "@/domain/goals/day-status";
import { useSession } from "@/features/auth/use-session";
import { useGoals } from "@/features/profile/use-profile";
import { useToday } from "@/hooks/use-today";
import { formatKcal } from "@/utils/format";
import { useProgressDays, type ProgressDay } from "./use-progress";

type Range = "week" | "month";

export function ProgressView() {
  const [range, setRange] = useState<Range>("week");
  const today = useToday();
  const { days, isError, refetch } = useProgressDays(today);
  const goals = useGoals(useSession().session?.user.id);
  const target = goals.data?.calorie_goal ?? null;

  return (
    <>
      <ScreenHeader title="Progress" />
      <div className="mb-6">
        <ChoiceGroup
          label="Time range"
          value={range}
          onChange={setRange}
          options={[
            { value: "week", label: "Last 7 days" },
            { value: "month", label: "Last 30 days" },
          ]}
        />
      </div>

      {isError && !days ? (
        <div role="alert" className="rounded-card border border-line px-4 py-6 text-center">
          <p className="font-medium">Couldn&apos;t load your history</p>
          <p className="mt-1 text-sm text-ink-muted">Check your connection, then try again.</p>
          <button type="button" onClick={() => void refetch()} className="mt-2 h-11 px-4 text-sm font-medium text-accent">
            Try again
          </button>
        </div>
      ) : !days || goals.isPending ? (
        <p role="status" className="sr-only">
          Loading
        </p>
      ) : target === null ? (
        <p className="rounded-card border border-line px-4 py-6 text-center text-sm">
          Progress compares each day with your calorie target.{" "}
          <Link href="/profile/" className="font-medium text-accent">
            Set a target in Profile
          </Link>
        </p>
      ) : range === "week" ? (
        <Week days={days.slice(-7)} target={target} />
      ) : (
        <Month days={days} target={target} />
      )}
    </>
  );
}

const weekdayLetter = new Intl.DateTimeFormat("en-PH", { weekday: "narrow" });
const weekdayLong = new Intl.DateTimeFormat("en-PH", { weekday: "long" });
const longDate = new Intl.DateTimeFormat("en-PH", { weekday: "long", day: "numeric", month: "long" });

const overTarget = (calories: number, target: number) => calories > target * (1 + TARGET_BAND);

function Week({ days, target }: { days: ProgressDay[]; target: number }) {
  const todayRow = days[days.length - 1]!;
  // Today is still in progress, so it stays out of the average and the count.
  const summary = summarizeDays(days.slice(0, -1), target);
  const scale = Math.max(target, ...days.map((d) => d.calories)) * 1.1;

  const macroKcal = [
    { label: "Protein", kcal: todayRow.protein_g * 4, fill: "bg-protein" },
    { label: "Carbs", kcal: todayRow.carbohydrates_g * 4, fill: "bg-carbs" },
    { label: "Fat", kcal: todayRow.fat_g * 9, fill: "bg-fat" },
  ];
  const macroSum = macroKcal.reduce((a, m) => a + m.kcal, 0);

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>Calories per day against your {formatKcal(target)} kcal target</SectionTitle>
        {summary.average === null ? (
          <p className="mb-4 text-sm text-ink-muted">No finished days logged this week yet. Each day you log shows up here.</p>
        ) : (
          <p className="mb-4 text-sm">
            <span className="text-2xl font-semibold">{formatKcal(summary.average)}</span>
            <span className="text-ink-muted">
              {" "}
              kcal a day on {summary.logged === 1 ? "1 logged day" : `${summary.logged} logged days`} ·{" "}
              {summary.over === 1 ? "1 day" : `${summary.over} days`} over target
            </span>
          </p>
        )}
        <div aria-hidden className="relative h-44">
          <div className="absolute inset-x-0 border-t border-dashed border-ink-muted" style={{ bottom: `${(target / scale) * 100}%` }} />
          <div className="absolute inset-0 grid grid-cols-7 items-end gap-2">
            {days.map((d, i) =>
              d.itemCount === 0 ? (
                <div key={i} className="h-1 rounded-full bg-line" />
              ) : (
                <div
                  key={i}
                  className={`rounded-t-md ${overTarget(d.calories, target) ? "bg-ink" : "bg-accent"} ${i === days.length - 1 ? "" : "opacity-80"}`}
                  style={{ height: `${Math.max((d.calories / scale) * 100, 1)}%` }}
                />
              ),
            )}
          </div>
        </div>
        <div aria-hidden className="mt-2 grid grid-cols-7 gap-2 text-center text-xs text-ink-muted">
          {days.map((d, i) => (
            <span key={i} className={i === days.length - 1 ? "font-semibold text-ink" : ""}>
              {weekdayLetter.format(d.date)}
            </span>
          ))}
        </div>
        <table className="sr-only">
          <caption>Calories per day, last 7 days</caption>
          <tbody>
            {days.map((d, i) => (
              <tr key={i}>
                <th scope="row">{i === days.length - 1 ? "Today" : weekdayLong.format(d.date)}</th>
                <td>{d.itemCount ? `${formatKcal(d.calories)} kcal` : "Nothing logged"}</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-ink-muted">Dashed line: target. Dark bars: more than 10% over. Flat grey: nothing logged.</p>
      </section>

      <section>
        <SectionTitle>Where today&apos;s calories came from</SectionTitle>
        {macroSum > 0 ? (
          <>
            <div className="flex h-3 overflow-hidden rounded-full" aria-hidden>
              {macroKcal.map((m) => (
                <div key={m.label} className={m.fill} style={{ width: `${(m.kcal / macroSum) * 100}%` }} />
              ))}
            </div>
            <ul className="mt-3 grid grid-cols-3 gap-2 text-sm">
              {macroKcal.map((m) => (
                <li key={m.label}>
                  <span className="block font-semibold">{Math.round((m.kcal / macroSum) * 100)}%</span>
                  <span className="flex items-center gap-1.5 text-ink-muted">
                    <span aria-hidden className={`inline-block h-2.5 w-1 rounded-full ${m.fill}`} />
                    {m.label}
                  </span>
                </li>
              ))}
            </ul>
          </>
        ) : (
          <p className="text-sm text-ink-muted">Nothing logged today yet.</p>
        )}
      </section>
    </div>
  );
}

const STATUS: Record<DayStatus, { label: string; cell: string }> = {
  in: { label: "Within target", cell: "bg-accent text-accent-ink" },
  over: { label: "Over target", cell: "bg-ink text-paper" },
  under: { label: "Well under target", cell: "border border-accent text-ink" },
  none: { label: "Nothing logged", cell: "border border-dashed border-ink-muted/60 text-ink-muted" },
};

function Month({ days, target }: { days: ProgressDay[]; target: number }) {
  // The last cell is today, which is still in progress: shown, not counted.
  const summary = summarizeDays(days.slice(0, -1), target);
  const lastIndex = days.length - 1;
  // Start the grid on Monday so columns line up with weekdays.
  const lead = (days[0]!.date.getDay() + 6) % 7;

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>Days within your calorie target</SectionTitle>
        <p className="mb-4 text-sm">
          <span className="text-2xl font-semibold">{summary.within}</span>
          <span className="text-ink-muted">
            {" "}
            of {summary.logged === 1 ? "1 logged day" : `${summary.logged} logged days`} within 10% of target
          </span>
        </p>
        <div className="mb-1 grid grid-cols-7 gap-1.5 text-center text-xs text-ink-muted" aria-hidden>
          {["M", "T", "W", "T", "F", "S", "S"].map((d, i) => (
            <span key={i}>{d}</span>
          ))}
        </div>
        <ol className="grid grid-cols-7 gap-1.5">
          {Array.from({ length: lead }, (_, i) => (
            <li key={`lead-${i}`} aria-hidden />
          ))}
          {days.map((d, i) => {
            const isToday = i === lastIndex;
            const status = dayStatus(d, target);
            const label = isToday ? "Today, in progress" : STATUS[status].label;
            return (
              <li
                key={i}
                aria-label={`${longDate.format(d.date)}: ${label}`}
                className={`grid aspect-square place-items-center rounded-md text-xs ${
                  isToday ? "border-2 border-ink font-semibold text-ink" : STATUS[status].cell
                }`}
              >
                {d.date.getDate()}
              </li>
            );
          })}
        </ol>
        {/* ponytail: every day is compared with today's target. Store goal
            history if people change targets often enough for this to mislead. */}
        <p className="mt-3 text-xs text-ink-muted">Each day is compared with your current target.</p>
      </section>
      <ul className="grid grid-cols-2 gap-2 text-sm">
        {(Object.keys(STATUS) as DayStatus[]).map((s) => (
          <li key={s} className="flex items-center gap-2">
            <span aria-hidden className={`size-4 shrink-0 rounded ${STATUS[s].cell}`} />
            {STATUS[s].label}
          </li>
        ))}
        <li className="flex items-center gap-2">
          <span aria-hidden className="size-4 shrink-0 rounded border-2 border-ink" />
          Today, in progress
        </li>
      </ul>
    </div>
  );
}
