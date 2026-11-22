"use client";

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { DayTotal } from "@/domain/goals/day-status";
import { useSession } from "@/features/auth/use-session";
import { dayTotals, diaryKeys, useDiaryDay } from "@/features/food-diary/use-diary";
import { fetchDailyTotals } from "@/services/repositories/diary-repository";
import { addDays, toLogDate } from "@/utils/format";

export const HISTORY_DAYS = 30;

export type ProgressDay = DayTotal & { date: Date; protein_g: number; carbohydrates_g: number; fat_g: number };

// The last 30 days, oldest first, ending today. One request covers both the
// week and the month view. Today comes from the diary cache instead, so it
// includes entries still saving and matches Home exactly.
export function useProgressDays(today: Date | null) {
  const userId = useSession().session?.user.id ?? "";
  const from = today ? toLogDate(addDays(today, -(HISTORY_DAYS - 1))) : "";
  const to = today ? toLogDate(today) : "";
  const history = useQuery({
    queryKey: [...diaryKeys.totals(userId), from, to],
    queryFn: () => fetchDailyTotals(from, to),
    enabled: Boolean(userId && today),
  });
  const todayDiary = useDiaryDay(today ? to : null);

  const days = useMemo<ProgressDay[] | null>(() => {
    if (!today || !history.data) return null;
    const rows = history.data.map((d, i) => ({
      date: addDays(today, i - (history.data.length - 1)),
      calories: d.calories,
      protein_g: d.protein_g,
      carbohydrates_g: d.carbohydrates_g,
      fat_g: d.fat_g,
      itemCount: d.itemCount,
    }));
    const live = todayDiary.entries.filter((e) => e.status !== "failed");
    if (todayDiary.data && rows.length) {
      rows[rows.length - 1] = { ...rows[rows.length - 1]!, ...dayTotals(todayDiary.entries), itemCount: live.length };
    }
    return rows;
  }, [today, history.data, todayDiary.data, todayDiary.entries]);

  return { days, isError: history.isError, refetch: history.refetch };
}
