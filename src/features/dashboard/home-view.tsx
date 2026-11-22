"use client";

import { Plus } from "lucide-react";
import Link from "next/link";
import { ScreenHeader, SectionTitle } from "@/components/shared/screen";
import { TodayLabel } from "@/components/shared/today-label";
import { useSession } from "@/features/auth/use-session";
import { DiaryNotice } from "@/features/food-diary/diary-notice";
import { MEALS } from "@/features/food-diary/meals";
import { dayTotals, useDiaryDay } from "@/features/food-diary/use-diary";
import { useGoals } from "@/features/profile/use-profile";
import { useToday } from "@/hooks/use-today";
import { formatKcal, toLogDate } from "@/utils/format";
import { CalorieSummary } from "./calorie-summary";
import { MacroList } from "./macro-list";

export function HomeView() {
  const today = useToday();
  const diary = useDiaryDay(today ? toLogDate(today) : null);
  const goals = useGoals(useSession().session?.user.id);
  const total = dayTotals(diary.entries);
  const g = goals.data;
  const failed = diary.entries.filter((e) => e.status === "failed").length;

  return (
    <>
      <ScreenHeader title="Today" kicker={<TodayLabel />} />
      <DiaryNotice />
      {failed ? (
        <p role="alert" className="mb-4 rounded-lg border border-ink px-3 py-2 text-sm">
          {failed === 1 ? "1 entry was" : `${failed} entries were`} not saved.{" "}
          <Link href="/diary/" className="font-medium text-accent">
            Open diary to retry
          </Link>
        </p>
      ) : null}
      {diary.isError && !diary.data ? (
        <p role="alert" className="mb-4 rounded-lg border border-ink px-3 py-2 text-sm">
          Couldn&apos;t load today&apos;s diary. Check your connection.{" "}
          <button type="button" onClick={() => void diary.refetch()} className="font-medium text-accent">
            Try again
          </button>
        </p>
      ) : null}

      <div className="space-y-7" aria-busy={diary.isPending || goals.isPending}>
        <CalorieSummary eaten={total.calories} target={g?.calorie_goal ?? null} />

        <section>
          <SectionTitle>Protein, carbs and fat</SectionTitle>
          <MacroList
            protein={[total.protein_g, g?.protein_goal_g ?? null]}
            carbs={[total.carbohydrates_g, g?.carbohydrates_goal_g ?? null]}
            fat={[total.fat_g, g?.fat_goal_g ?? null]}
          />
        </section>

        <section>
          <SectionTitle aside={<Link href="/diary/" className="underline-offset-2 hover:underline">Open diary</Link>}>
            Meals
          </SectionTitle>
          <ul className="divide-y divide-line rounded-card border border-line bg-surface">
            {MEALS.map((meal) => {
              const mealEntries = diary.entries.filter((e) => e.meal === meal.id);
              const kcal = dayTotals(mealEntries).calories;
              return (
                <li key={meal.id} className="flex items-center gap-3 px-4 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{meal.label}</p>
                    <p className="truncate text-sm text-ink-muted">
                      {mealEntries.length ? mealEntries.map((e) => e.foodName).join(" · ") : "Nothing logged"}
                    </p>
                  </div>
                  {mealEntries.length ? <span className="text-sm font-semibold">{formatKcal(kcal)} kcal</span> : null}
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
