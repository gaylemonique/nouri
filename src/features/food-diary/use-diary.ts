"use client";

import { useMutation, useQuery, useQueryClient, type QueryClient } from "@tanstack/react-query";
import { useCallback, useMemo } from "react";
import { calculateConsumed } from "@/domain/nutrition/calculate";
import { useSession } from "@/features/auth/use-session";
import {
  deleteEntry,
  fetchDiaryDay,
  logFood,
  updateEntry,
  withServerNumbers,
  type DiaryEntry,
  type ServingChoice,
  type UpdateEntryInput,
} from "@/services/repositories/diary-repository";
import type { CatalogFood } from "@/services/repositories/food-repository";
import type { MealType } from "./meals";
import { outbox, useOutboxEntries, type OutboxEntry } from "./outbox";

export const diaryKeys = {
  all: (userId: string) => ["diary", userId] as const,
  day: (userId: string, logDate: string) => ["diary", userId, logDate] as const,
  recent: (userId: string) => ["recent-foods", userId] as const,
};

export type DayEntry = DiaryEntry & { status: "saved" | OutboxEntry["status"] };

function useUserId(): string {
  const { session } = useSession();
  // Diary screens render only inside AuthGate, which waits for a session.
  return session?.user.id ?? "";
}

// Saved entries from the server plus anything still in the outbox for that day.
export function useDiaryDay(logDate: string | null) {
  const userId = useUserId();
  const query = useQuery({
    queryKey: diaryKeys.day(userId, logDate ?? ""),
    queryFn: () => fetchDiaryDay(logDate!),
    enabled: Boolean(userId && logDate),
  });
  const pending = useOutboxEntries(logDate);
  const entries = useMemo<DayEntry[]>(() => {
    const saved = (query.data ?? []).map((e) => ({ ...e, status: "saved" as const }));
    const savedIds = new Set(saved.map((e) => e.id));
    return [...saved, ...pending.filter((e) => !savedIds.has(e.id))];
  }, [query.data, pending]);
  return { ...query, entries };
}

export type DayTotals = { calories: number; protein_g: number; carbohydrates_g: number; fat_g: number };

// Entries that failed to save are left out: they are not in the diary.
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

function send(queryClient: QueryClient, userId: string, entry: OutboxEntry) {
  const key = diaryKeys.day(userId, entry.logDate);
  outbox.setStatus(entry.id, "saving");
  logFood(entry.input)
    .then((row) => {
      const saved: DiaryEntry = { ...entry };
      delete (saved as Partial<OutboxEntry>).status;
      delete (saved as Partial<OutboxEntry>).input;
      const cached = queryClient.getQueryData<DiaryEntry[]>(key);
      if (cached) {
        queryClient.setQueryData<DiaryEntry[]>(key, [...cached.filter((e) => e.id !== entry.id), withServerNumbers(saved, row)]);
      } else {
        void queryClient.invalidateQueries({ queryKey: key });
      }
      outbox.remove(entry.id);
      void queryClient.invalidateQueries({ queryKey: diaryKeys.recent(userId) });
    })
    .catch(() => outbox.setStatus(entry.id, "failed"));
}

export type AddFoodInput = { food: CatalogFood; meal: MealType; logDate: string; quantity: number } & ServingChoice;

// Optimistic add: the entry shows at once with the client calculator's
// numbers and a device-made id. The RPC is idempotent on that id, so Retry
// can never create a duplicate.
export function useAddFood() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useCallback(
    ({ food, meal, logDate, quantity, ...serving }: AddFoodInput) => {
      const id = crypto.randomUUID();
      const picked = serving.servingId ? food.servings.find((s) => s.id === serving.servingId) : undefined;
      const servingGrams = picked ? picked.grams : (serving.servingGrams ?? 0);
      const entry: OutboxEntry = {
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
        status: "saving",
        input: { id, logDate, meal, foodId: food.id, quantity, ...serving } as OutboxEntry["input"],
      };
      outbox.put(entry);
      send(queryClient, userId, entry);
    },
    [queryClient, userId],
  );
}

export function useRetryAdd() {
  const queryClient = useQueryClient();
  const userId = useUserId();
  return useCallback(
    (id: string) => {
      const entry = outbox.get(id);
      if (entry) send(queryClient, userId, entry);
    },
    [queryClient, userId],
  );
}

type Snapshot = { key: readonly unknown[]; previous: DiaryEntry[] | undefined };

export function useUpdateEntry(logDate: string) {
  const queryClient = useQueryClient();
  const key = diaryKeys.day(useUserId(), logDate);
  return useMutation({
    mutationFn: (input: UpdateEntryInput) => updateEntry(input),
    onMutate: async (input): Promise<Snapshot> => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DiaryEntry[]>(key);
      queryClient.setQueryData<DiaryEntry[]>(key, (old) =>
        old?.map((e) => {
          if (e.id !== input.id) return e;
          const picked = input.servingId ? e.servings.find((s) => s.id === input.servingId) : undefined;
          const servingGrams = picked ? picked.grams : (input.servingGrams ?? e.servingGrams);
          // Same rule as the server: rescale from the entry's own snapshot.
          return {
            ...e,
            meal: input.meal,
            quantity: input.quantity,
            servingId: picked?.id ?? null,
            servingName: picked?.name ?? null,
            servingGrams,
            consumed: calculateConsumed(e.per100, servingGrams, input.quantity),
          };
        }),
      );
      return { key, previous };
    },
    onError: (_error, input, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
      const name = context?.previous?.find((e) => e.id === input.id)?.foodName ?? "the entry";
      outbox.notify(`Couldn't save your change to ${name}, so it is back to how it was. Try again.`);
    },
    onSuccess: (row) => {
      queryClient.setQueryData<DiaryEntry[]>(key, (old) => old?.map((e) => (e.id === row.id ? withServerNumbers(e, row) : e)));
    },
  });
}

export function useDeleteEntry(logDate: string) {
  const queryClient = useQueryClient();
  const key = diaryKeys.day(useUserId(), logDate);
  return useMutation({
    mutationFn: (id: string) => deleteEntry(id),
    onMutate: async (id): Promise<Snapshot> => {
      await queryClient.cancelQueries({ queryKey: key });
      const previous = queryClient.getQueryData<DiaryEntry[]>(key);
      queryClient.setQueryData<DiaryEntry[]>(key, (old) => old?.filter((e) => e.id !== id));
      return { key, previous };
    },
    onError: (_error, id, context) => {
      if (context) queryClient.setQueryData(context.key, context.previous);
      const name = context?.previous?.find((e) => e.id === id)?.foodName ?? "the entry";
      outbox.notify(`Couldn't remove ${name}. It is still in your diary. Try again.`);
    },
  });
}
