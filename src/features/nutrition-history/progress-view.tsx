"use client";

import { useState } from "react";
import { SampleDataNote, ScreenHeader, SectionTitle } from "@/components/shared/screen";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { SAMPLE_MONTH, SAMPLE_TARGETS, SAMPLE_TODAY, SAMPLE_WEEK_CALORIES, sumRows, toRow, type DayStatus } from "@/fixtures/sample-data";
import { useToday } from "@/hooks/use-today";
import { addDays, formatKcal } from "@/utils/format";

type Range = "week" | "month";

export function ProgressView() {
  const [range, setRange] = useState<Range>("week");
  return (
    <>
      <ScreenHeader title="Progress" />
      <SampleDataNote>Past days are invented to show the layout. Today matches the sample diary.</SampleDataNote>
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
      {range === "week" ? <Week /> : <Month />}
    </>
  );
}

const weekdayLetter = new Intl.DateTimeFormat("en-PH", { weekday: "narrow" });
const weekdayLong = new Intl.DateTimeFormat("en-PH", { weekday: "long" });

function Week() {
  const today = useToday();
  const todayTotal = sumRows(SAMPLE_TODAY.map(toRow));
  const values = [...SAMPLE_WEEK_CALORIES, todayTotal.calories];
  const target = SAMPLE_TARGETS.calories;
  const scale = Math.max(target, ...values) * 1.1;
  // Today is still in progress, so it stays out of the average and the count.
  const finished = values.slice(0, -1);
  const overDays = finished.filter((v) => v > target * 1.1).length;
  const average = finished.reduce((a, b) => a + b, 0) / finished.length;

  const macroKcal = [
    { label: "Protein", kcal: todayTotal.protein_g * 4, fill: "bg-protein" },
    { label: "Carbs", kcal: todayTotal.carbohydrates_g * 4, fill: "bg-carbs" },
    { label: "Fat", kcal: todayTotal.fat_g * 9, fill: "bg-fat" },
  ];
  const macroSum = macroKcal.reduce((a, m) => a + m.kcal, 0);

  return (
    <div className="space-y-8">
      <section>
        <SectionTitle>Calories per day against your {formatKcal(target)} kcal target</SectionTitle>
        <p className="mb-4 text-sm">
          <span className="text-2xl font-semibold">{formatKcal(average)}</span>
          <span className="text-ink-muted">
            {" "}
            kcal a day before today · {overDays === 1 ? "1 day" : `${overDays} days`} over target
          </span>
        </p>
        <div aria-hidden className="relative h-44">
          <div
            className="absolute inset-x-0 border-t border-dashed border-ink-muted"
            style={{ bottom: `${(target / scale) * 100}%` }}
          />
          <div className="absolute inset-0 grid grid-cols-7 items-end gap-2">
            {values.map((v, i) => (
              <div
                key={i}
                className={`rounded-t-md ${v > target * 1.1 ? "bg-ink" : "bg-accent"} ${i === values.length - 1 ? "" : "opacity-80"}`}
                style={{ height: `${(v / scale) * 100}%` }}
              />
            ))}
          </div>
        </div>
        <div aria-hidden className="mt-2 grid grid-cols-7 gap-2 text-center text-xs text-ink-muted">
          {values.map((_, i) => (
            <span key={i} className={i === values.length - 1 ? "font-semibold text-ink" : ""}>
              {today ? weekdayLetter.format(addDays(today, i - 6)) : " "}
            </span>
          ))}
        </div>
        <table className="sr-only">
          <caption>Calories per day, last 7 days</caption>
          <tbody>
            {values.map((v, i) => (
              <tr key={i}>
                <th scope="row">{today ? weekdayLong.format(addDays(today, i - 6)) : `Day ${i + 1}`}</th>
                <td>{formatKcal(v)} kcal</td>
              </tr>
            ))}
          </tbody>
        </table>
        <p className="mt-3 text-xs text-ink-muted">Dashed line: target. Dark bars: more than 10% over.</p>
      </section>

      <section>
        <SectionTitle>Where today&apos;s calories came from</SectionTitle>
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

function Month() {
  const today = useToday();
  // The last cell is today, which is still in progress: shown, not counted.
  const past = SAMPLE_MONTH.slice(0, -1);
  const within = past.filter((s) => s === "in").length;
  const logged = past.filter((s) => s !== "none").length;
  const lastIndex = SAMPLE_MONTH.length - 1;
  const first = today ? addDays(today, -(SAMPLE_MONTH.length - 1)) : null;
  // Start the grid on Monday so columns line up with weekdays.
  const lead = first ? (first.getDay() + 6) % 7 : 0;

  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>Days within your calorie target</SectionTitle>
        <p className="mb-4 text-sm">
          <span className="text-2xl font-semibold">{within}</span>
          <span className="text-ink-muted"> of {logged} logged days within 10% of target</span>
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
          {SAMPLE_MONTH.map((status, i) => {
            const date = first ? addDays(first, i) : null;
            const isToday = i === lastIndex;
            const label = isToday ? "Today, in progress" : STATUS[status].label;
            return (
              <li
                key={i}
                aria-label={date ? `${date.toDateString()}: ${label}` : label}
                className={`grid aspect-square place-items-center rounded-md text-xs ${
                  isToday ? "border-2 border-ink font-semibold text-ink" : STATUS[status].cell
                }`}
              >
                {date ? date.getDate() : ""}
              </li>
            );
          })}
        </ol>
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
