"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { SampleDataNote, ScreenHeader, SectionTitle } from "@/components/shared/screen";
import { TodayLabel } from "@/components/shared/today-label";
import { MEALS, SAMPLE_TARGETS, SAMPLE_TODAY, sumRows, toRow } from "@/fixtures/sample-data";
import { formatKcal } from "@/utils/format";
import { CalorieSummary } from "./calorie-summary";
import { MacroList } from "./macro-list";

export function HomeView() {
  const rows = SAMPLE_TODAY.map(toRow);
  const total = sumRows(rows);
  const t = SAMPLE_TARGETS;

  return (
    <>
      <ScreenHeader title="Today" kicker={<TodayLabel />} />
      <SampleDataNote>Your own meals replace this day once logging is connected.</SampleDataNote>

      <div className="space-y-7">
        <CalorieSummary eaten={total.calories} target={t.calories} />

        <section>
          <SectionTitle>Protein, carbs and fat</SectionTitle>
          <MacroList
            protein={[total.protein_g, t.protein_g]}
            carbs={[total.carbohydrates_g, t.carbohydrates_g]}
            fat={[total.fat_g, t.fat_g]}
          />
        </section>

        <section>
          <SectionTitle aside={<Link href="/diary/" className="underline-offset-2 hover:underline">Open diary</Link>}>
            Meals
          </SectionTitle>
          <ul className="divide-y divide-line rounded-card border border-line bg-surface">
            {MEALS.map((meal) => {
              const mealRows = rows.filter((r) => r.meal === meal.id);
              const kcal = mealRows.reduce((sum, r) => sum + r.consumed.calories, 0);
              return (
                <li key={meal.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{meal.label}</p>
                    <p className="truncate text-sm text-ink-muted">
                      {mealRows.length ? mealRows.map((r) => r.food.name).join(" · ") : "Nothing logged"}
                    </p>
                  </div>
                  {mealRows.length ? <span className="text-sm font-semibold">{formatKcal(kcal)} kcal</span> : null}
                  <Link
                    href={`/discover/?meal=${meal.id}`}
                    aria-label={`Add food to ${meal.label.toLowerCase()}`}
                    className="-mr-2 grid size-11 shrink-0 place-items-center rounded-full text-accent hover:bg-line/60"
                  >
                    <Plus aria-hidden size={20} />
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      </div>
    </>
  );
}
