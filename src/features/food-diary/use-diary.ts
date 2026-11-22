"use client";

import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { calculateConsumed } from "@/domain/nutrition/calculate";
import { useSession } from "@/features/auth/use-session";
import { fetchDiaryDay, type DiaryEntry, type ServingChoice } from "@/services/repositories/diary-repository";
import type { CatalogFood } from "@/services/repositories/food-repository";
import type { MealType } from "./meals";
import { applyQueue, type DayEntry } from "./queue-model";
import { syncQueue, useQueuedOps } from "./sync-queue";

export type { DayEntry } from "./queue-model";

export const diaryKeys = {
  all: (userId: string) => ["diary", userId] as const,
  day: (userId: string, logDate: string) => ["diary", userId, logDate] as const,
  recent: (userId: string) => ["recent-foods", userId] as const,
  totals: (userId: string) => ["daily-totals", userId] as const,
};

function useUserId(): string {
  // Diary screens render only inside AuthGate, which waits for a session.
  return useSession().session?.user.id ?? "";
}

// The saved day from the server (or the device cache when offline) with
// every queued change for that day applied on top.
export function useDiaryDay(logDate: string | null) {
  const userId = useUserId();
  const query = useQuery({
    queryKey: diaryKeys.day(userId, logDate ?? ""),
    queryFn: () => fetchDiaryDay(logDate!),
    enabled: Boolean(userId && logDate),
  });
  const ops = useQueuedOps();
  const entries = useMemo<DayEntry[]>(
    () => (logDate ? applyQueue(query.data ?? [], ops, logDate) : []),
    [query.data, ops, logDate],
  );
  return { ...query, entries };
}

export type DayTotals = { calories: number; protein_g: number; carbohydrates_g: number; fat_g: number };

// Adds the server refused are left out: they are not in the diary.
export function dayTotals(entries: DayEntry[]): DayTotals {
  return entries
    .filter((e) => e.status !== "failed")
    .reduce<DayTotals>(
      (t, e) => ({
        calories: t.calories + e.consumed.calories,
        protein_g: t.protein_g + e.consumed.protein_g,
        carbohydrates_g: t.carbohydrates_g + e.consumed.carbohydrates_g,
        fat_g: t.fat_g + e.consumed.fat_g,
      }),
      { calories: 0, protein_g: 0, carbohydrates_g: 0, fat_g: 0 },
    );
}

export type AddFoodInput = { food: CatalogFood; meal: MealType; logDate: string; quantity: number } & ServingChoice;

// The entry id is made on the device; the RPC is idempotent on it.
export function useAddFood() {
  return useCallback(({ food, meal, logDate, quantity, ...serving }: AddFoodInput) => {
    const id = crypto.randomUUID();
    const picked = serving.servingId ? food.servings.find((s) => s.id === serving.servingId) : undefined;
    const servingGrams = picked ? picked.grams : (serving.servingGrams ?? 0);
    const entry: DiaryEntry = {
      id,
      logDate,
      meal,
      foodId: food.id,
      foodName: food.name,
      servingId: picked?.id ?? null,
      servingName: picked?.name ?? null,
      servingGrams,
      quantity,
      per100: food.per100,
      consumed: calculateConsumed(food.per100, servingGrams, quantity),
      servings: food.servings,
      verification: food.verification,
      source: food.source,
    };
    syncQueue.add({
      opId: crypto.randomUUID(),
      kind: "add",
      logDate,
      entry,
      input: { id, logDate, meal, foodId: food.id, quantity, ...serving },
      failed: false,
    });
  }, []);
}

export function useUpdateEntry() {
  return useCallback((entry: DayEntry, change: { meal: MealType; quantity: number } & ServingChoice) => {
    const picked = change.servingId ? entry.servings.find((s) => s.id === change.servingId) : undefined;
    syncQueue.update({
      opId: crypto.randomUUID(),
      kind: "update",
      logDate: entry.logDate,
      entryId: entry.id,
      foodName: entry.foodName,
      change: {
        meal: change.meal,
        quantity: change.quantity,
        servingId: picked?.id ?? null,
        servingName: picked?.name ?? null,
        servingGrams: picked ? picked.grams : (change.servingGrams ?? entry.servingGrams),
      },
      input: { id: entry.id, ...change },
    });
  }, []);
}

export function useDeleteEntry() {
  return useCallback((entry: DayEntry) => {
    syncQueue.remove({ opId: crypto.randomUUID(), kind: "delete", logDate: entry.logDate, entryId: entry.id, foodName: entry.foodName });
  }, []);
}
