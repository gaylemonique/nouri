"use client";

import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { useState } from "react";
import { SampleDataNote, ScreenHeader } from "@/components/shared/screen";
import { MEALS, SAMPLE_TODAY, sumRows, toRow, type DiaryRow } from "@/fixtures/sample-data";
import { useToday } from "@/hooks/use-today";
import { addDays, formatGrams, formatKcal, formatQuantity, relativeDayLabel } from "@/utils/format";
import { FoodSheet, type FoodSheetStart } from "./food-sheet";

export function DiaryView() {
  const today = useToday();
  const [offset, setOffset] = useState(0);
  const [sheet, setSheet] = useState<FoodSheetStart | null>(null);

  const day = today ? addDays(today, offset) : null;
  const rows = offset === 0 ? SAMPLE_TODAY.map(toRow) : [];
  const total = sumRows(rows);

  const navButton = "grid size-11 place-items-center rounded-full border border-line disabled:opacity-40";

  return (
    <>
      <ScreenHeader title="Diary" />
      <SampleDataNote>Only today has entries. Other days show what an empty day looks like.</SampleDataNote>

      <div className="mb-5 flex items-center gap-3">
        <button type="button" className={navButton} aria-label="Previous day" onClick={() => setOffset((o) => o - 1)}>
          <ChevronLeft aria-hidden size={20} />
        </button>
        <p className="flex-1 text-center text-lg font-semibold" aria-live="polite">
          {day && today ? relativeDayLabel(day, today) : " "}
        </p>
        <button type="button" className={navButton} aria-label="Next day" disabled={offset >= 0} onClick={() => setOffset((o) => o + 1)}>
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

      <div className="space-y-6">
        {MEALS.map((meal) => {
          const mealRows = rows.filter((r) => r.meal === meal.id);
          const kcal = mealRows.reduce((sum, r) => sum + r.consumed.calories, 0);
          return (
            <section key={meal.id} aria-label={meal.label}>
              <div className="mb-1 flex items-baseline justify-between">
                <h2 className="font-display text-xl">{meal.label}</h2>
                {mealRows.length ? <span className="text-sm text-ink-muted">{formatKcal(kcal)} kcal</span> : null}
              </div>
              <ul className="divide-y divide-line border-y border-line">
                {mealRows.map((r) => (
                  <li key={r.id}>
                    <EntryRow
                      row={r}
                      onOpen={() =>
                        setSheet({ food: r.food, meal: r.meal, mode: "edit", servingName: r.servingName, servingGrams: r.servingGrams, quantity: r.quantity })
                      }
                    />
                  </li>
                ))}
                <li>
                  <Link
                    href={`/discover/?meal=${meal.id}`}
                    className="flex min-h-12 items-center gap-2 text-sm font-medium text-accent"
                  >
                    <Plus aria-hidden size={18} />
                    {mealRows.length ? "Add more" : `Add ${meal.label.toLowerCase()}`}
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

function EntryRow({ row, onOpen }: { row: DiaryRow; onOpen: () => void }) {
  const amount = row.quantity === 1 ? row.servingName : `${formatQuantity(row.quantity)} × ${row.servingName}`;
  return (
    <button type="button" onClick={onOpen} className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left">
      <span className="min-w-0 flex-1">
        <span className="block truncate font-medium">{row.food.name}</span>
        <span className="block text-sm text-ink-muted">
          {amount} · {formatGrams(row.consumed.grams)} g
        </span>
      </span>
      <span className="text-sm font-semibold">{formatKcal(row.consumed.calories)}</span>
    </button>
  );
}
