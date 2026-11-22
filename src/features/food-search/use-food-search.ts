"use client";

import { keepPreviousData, useQuery } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { useSession } from "@/features/auth/use-session";
import { diaryKeys } from "@/features/food-diary/use-diary";
import { fetchFoodsInCategories, fetchRecentFoods, searchFoods } from "@/services/repositories/food-repository";

// The catalog changes only through migrations, so it can stay cached a while.
const CATALOG_STALE_MS = 10 * 60_000;

export function useDebounced<T>(value: T, ms = 250): T {
  const [debounced, setDebounced] = useState(value);
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms);
    return () => clearTimeout(t);
  }, [value, ms]);
  return debounced;
}

// Text search ranks by match (search_foods); a type filter narrows the
// results on the device. With no text, a filter lists that type by name.
export function useFoodSearch(query: string, categories: string[] | null) {
  const q = query.trim();
  return useQuery({
    queryKey: ["foods", q ? "search" : "category", q || categories?.join(",")],
    queryFn: async () => {
      const foods = q ? await searchFoods(q) : await fetchFoodsInCategories(categories ?? []);
      return categories ? foods.filter((f) => categories.includes(f.category)) : foods;
    },
    enabled: Boolean(q || categories),
    staleTime: CATALOG_STALE_MS,
    placeholderData: keepPreviousData,
  });
}

export function useFilipinoDishes() {
  return useQuery({
    queryKey: ["foods", "category", "filipino_dish"],
    queryFn: () => fetchFoodsInCategories(["filipino_dish"]),
    staleTime: CATALOG_STALE_MS,
  });
}

export function useRecentFoods() {
  const userId = useSession().session?.user.id ?? "";
  return useQuery({
    queryKey: diaryKeys.recent(userId),
    queryFn: fetchRecentFoods,
    enabled: Boolean(userId),
  });
}
