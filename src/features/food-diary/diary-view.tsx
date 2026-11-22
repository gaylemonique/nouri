"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ScreenHeader } from "@/components/shared/screen";
import { useToday } from "@/hooks/use-today";
import { addDays, formatGrams, formatKcal, parseLogDate, relativeDayLabel, toLogDate } from "@/utils/format";
import { DiaryNotice } from "./diary-notice";
import { EntryRow } from "./entry-row";
import { FoodSheet, type FoodSheetStart } from "./food-sheet";
import { MEALS } from "./meals";
import { useOnline } from "./sync-queue";
import { dayTotals, useDiaryDay } from "./use-diary";

export function DiaryView() {
  const today = useToday();
  const params = useSearchParams();
  const [chosen, setOffset] = useState<number | null>(null);
  const [sheet, setSheet] = useState<FoodSheetStart | null>(null);

  // ?date= opens a past day (Discover links here after adding to one).
  // Until the user moves, that day is shown; never a future day.
  const asked = parseLogDate(params.get("date"));
  const askedOffset = asked && today ? Math.min(0, Math.round((asked.getTime() - today.getTime()) / 86_400_000)) : 0;
  const offset = chosen ?? askedOffset;

  const day = today ? addDays(today, offset) : null;
  const logDate = day ? toLogDate(day) : null;
  const diary = useDiaryDay(logDate);
  const online = useOnline();
  const total = dayTotals(diary.entries);
  const dateParam = offset === 0 || !logDate ? "" : `&date=${logDate}`;

  const navButton = "grid size-11 place-items-center rounded-full border border-line disabled:opacity-40";

  return (
    <>
      <ScreenHeader title="Diary" />
      <DiaryNotice />

      <div className="mb-5 flex items-center gap-3">
        <button type="button" className={navButton} aria-label="Previous day" onClick={() => setOffset(offset - 1)}>
          <ChevronLeft aria-hidden size={20} />
        </button>
        <p className="flex-1 text-center text-lg font-semibold" aria-live="polite">
          {day && today ? relativeDayLabel(day, today) : " "}
        </p>
        <button type="button" className={navButton} aria-label="Next day" disabled={offset >= 0} onClick={() => setOffset(offset + 1)}>
          <ChevronRight aria-hidden size={20} />
        </button>
      </div>

      {offset !== 0 ? (
        <button type="button" onClick={() => setOffset(0)} className="mb-4 -mt-2 block w-full text-center text-sm text-accent">
          Back to today
        </button>
      ) : null}

      <dl className="mb-6 grid grid-cols-4 rounded-card border border-line bg-surface py-3 text-center">
        {[
          { label: "kcal", value: formatKcal(total.calories) },
          { label: "protein", value: `${formatGrams(total.protein_g)} g` },
          { label: "carbs", value: `${formatGrams(total.carbohydrates_g)} g` },
          { label: "fat", value: `${formatGrams(total.fat_g)} g` },
        ].map((s) => (
          <div key={s.label}>
            <dd className="font-semibold">{s.value}</dd>
            <dt className="text-xs text-ink-muted">{s.label}</dt>
          </div>
        ))}
      </dl>

      {!online && !diary.data ? (
        <p role="status" className="mb-6 rounded-card border border-line px-4 py-4 text-center text-sm text-ink-muted">
          This day isn&apos;t saved on this phone yet. What you add now is kept and syncs when you&apos;re back online.
        </p>
      ) : null}

      {diary.isError && !diary.data ? (
        <div role="alert" className="mb-6 rounded-card border border-line px-4 py-5 text-center">
          <p className="font-medium">Couldn&apos;t load this day</p>
          <p className="mt-1 text-sm text-ink-muted">Check your connection, then try again.</p>
          <button type="button" onClick={() => void diary.refetch()} className="mt-2 h-11 px-4 text-sm font-medium text-accent">
            Try again
          </button>
        </div>
      ) : null}

      <div className="space-y-6" aria-busy={diary.isPending}>
        {MEALS.map((meal) => {
          const mealEntries = diary.entries.filter((e) => e.meal === meal.id);
          const kcal = dayTotals(mealEntries).calories;
          const anyCounted = mealEntries.some((e) => e.status !== "failed");
          return (
            <section key={meal.id} aria-label={meal.label}>
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="font-display text-xl">{meal.label}</h2>
                {anyCounted ? <span className="text-sm text-ink-muted">{formatKcal(kcal)} kcal</span> : null}
              </div>
              <ul className="divide-y divide-line border-y border-line">
                {mealEntries.map((entry) => (
                  <li key={entry.id}>
                    <EntryRow entry={entry} onOpen={() => setSheet({ mode: "edit", entry })} />
                  </li>
                ))}
                <li>
                  <Link
                    href={`/discover/?meal=${meal.id}${dateParam}`}
                    className="flex min-h-12 items-center gap-2 text-sm font-medium text-accent"
                  >
                    <Plus aria-hidden size={18} />
                    {mealEntries.length ? "Add more" : `Add ${meal.label.toLowerCase()}`}
                  </Link>
                </li>
              </ul>
            </section>
          );
        })}
      </div>

      <FoodSheet start={sheet} onClose={() => setSheet(null)} />
    </>
  );
}
