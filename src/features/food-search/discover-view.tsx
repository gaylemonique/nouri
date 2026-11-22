"use client";

import { Search } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useState } from "react";
import { ScreenHeader, SectionTitle } from "@/components/shared/screen";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { calculateConsumed } from "@/domain/nutrition/calculate";
import { FoodSheet, type FoodSheetStart } from "@/features/food-diary/food-sheet";
import { isMeal, mealLabel, type MealType } from "@/features/food-diary/meals";
import { useOnline } from "@/features/food-diary/sync-queue";
import { useToday } from "@/hooks/use-today";
import type { CatalogFood } from "@/services/repositories/food-repository";
import { formatGrams, formatKcal, parseLogDate, relativeDayLabel, toLogDate } from "@/utils/format";
import { useDebounced, useFilipinoDishes, useFoodSearch, useRecentFoods } from "./use-food-search";

type Filter = "all" | "filipino" | "rice" | "protein" | "fruit";

const FILTERS: { value: Filter; label: string; categories: string[] | null }[] = [
  { value: "all", label: "All", categories: null },
  { value: "filipino", label: "Filipino dishes", categories: ["filipino_dish"] },
  { value: "rice", label: "Rice", categories: ["rice_and_grains"] },
  { value: "protein", label: "Meat, fish, eggs", categories: ["meat_and_poultry", "seafood", "eggs_and_dairy"] },
  { value: "fruit", label: "Fruit", categories: ["fruits"] },
];

export function DiscoverView() {
  const params = useSearchParams();
  const today = useToday();
  const mealParam = params.get("meal");
  const meal: MealType = isMeal(mealParam) ? mealParam : "lunch";
  // ?date= comes from the Diary when adding to an earlier day. Never the future.
  const asked = parseLogDate(params.get("date"));
  const day = asked && today && asked <= today ? asked : today;
  const logDate = day ? toLogDate(day) : null;
  const dayNote = day && today && logDate !== toLogDate(today) ? ` · ${relativeDayLabel(day, today)}` : "";

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sheet, setSheet] = useState<FoodSheetStart | null>(null);
  const [added, setAdded] = useState<string | null>(null);

  const debounced = useDebounced(query);
  const categories = FILTERS.find((f) => f.value === filter)?.categories ?? null;
  const browsing = !query.trim() && filter === "all";
  const results = useFoodSearch(debounced, categories);
  const online = useOnline();

  const open = (food: CatalogFood) => {
    if (logDate) setSheet({ mode: "add", food, meal, logDate });
  };

  return (
    <>
      <ScreenHeader title="Discover" kicker={isMeal(mealParam) ? `Adding to ${mealLabel(meal)}${dayNote}` : undefined} />

      {added ? (
        <p role="status" className="mb-4 flex items-center justify-between gap-3 rounded-lg bg-line/50 px-3 py-2 text-sm">
          <span>{added}</span>
          <Link href={dayNote && logDate ? `/diary/?date=${logDate}` : "/diary/"} className="shrink-0 font-medium text-accent">
            Open diary
          </Link>
        </p>
      ) : null}

      <label className="relative mb-3 block">
        <span className="sr-only">Search foods</span>
        <Search aria-hidden size={18} className="pointer-events-none absolute top-1/2 left-3 -translate-y-1/2 text-ink-muted" />
        <input
          type="search"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search sinigang, kanin, saging..."
          className="h-12 w-full rounded-lg border border-line bg-surface pr-3 pl-10 text-base placeholder:text-ink-muted"
        />
      </label>

      <div className="mb-6">
        <ChoiceGroup label="Food type" value={filter} onChange={setFilter} options={FILTERS.map(({ value, label }) => ({ value, label }))} />
      </div>

      {browsing ? (
        <Browse onOpen={open} />
      ) : !online && !results.data ? (
        <div role="status" className="rounded-card border border-line px-4 py-6 text-center">
          <p className="font-medium">Search needs a connection</p>
          <p className="mt-1 text-sm text-ink-muted">Clear the search to see your recent foods and the Filipino dishes, which work offline.</p>
        </div>
      ) : results.isError ? (
        <Problem onRetry={() => void results.refetch()} />
      ) : !results.data ? (
        <p role="status" className="py-6 text-center text-sm text-ink-muted">
          Searching…
        </p>
      ) : results.data.length ? (
        <section aria-busy={results.isFetching}>
          <SectionTitle>{results.data.length === 1 ? "1 food" : `${results.data.length} foods`}</SectionTitle>
          <FoodList foods={results.data} onOpen={open} />
        </section>
      ) : (
        <div className="rounded-card border border-line px-4 py-6 text-center">
          <p className="font-medium">{query.trim() ? `No food matches “${query.trim()}”` : "No foods of this type yet"}</p>
          <p className="mt-1 text-sm text-ink-muted">
            {query.trim() ? "Try the Tagalog or English name, or a shorter word." : "The catalog is still small. Try another type."}
          </p>
        </div>
      )}

      <FoodSheet start={sheet} onClose={() => setSheet(null)} onAdded={setAdded} />
    </>
  );
}

function Browse({ onOpen }: { onOpen: (f: CatalogFood) => void }) {
  const recent = useRecentFoods();
  const dishes = useFilipinoDishes();
  return (
    <div className="space-y-6">
      <section>
        <SectionTitle>Recent</SectionTitle>
        {recent.data?.length ? (
          <FoodList foods={recent.data} onOpen={onOpen} />
        ) : recent.isPending ? null : (
          <p className="border-y border-line py-3 text-sm text-ink-muted">Foods you log show up here, so you can add them again in one tap.</p>
        )}
      </section>
      <section>
        <SectionTitle aside="Estimated from home recipes">Filipino dishes</SectionTitle>
        {dishes.isError ? <Problem onRetry={() => void dishes.refetch()} /> : dishes.data ? <FoodList foods={dishes.data} onOpen={onOpen} /> : null}
      </section>
    </div>
  );
}

function Problem({ onRetry }: { onRetry: () => void }) {
  return (
    <div role="alert" className="rounded-card border border-line px-4 py-6 text-center">
      <p className="font-medium">Couldn&apos;t load foods</p>
      <p className="mt-1 text-sm text-ink-muted">Check your connection, then try again.</p>
      <button type="button" onClick={onRetry} className="mt-3 h-11 px-4 text-sm font-medium text-accent">
        Try again
      </button>
    </div>
  );
}

function FoodList({ foods, onOpen }: { foods: CatalogFood[]; onOpen: (f: CatalogFood) => void }) {
  return (
    <ul className="divide-y divide-line border-y border-line">
      {foods.map((food) => {
        const serving = food.servings.find((s) => s.isDefault) ?? food.servings[0];
        const kcal = serving ? calculateConsumed(food.per100, serving.grams, 1).calories : null;
        return (
          <li key={food.id}>
            <button type="button" onClick={() => onOpen(food)} className="flex min-h-14 w-full items-center gap-3 py-2.5 text-left">
              <span className="min-w-0 flex-1">
                <span className="block truncate font-medium">{food.name}</span>
                <span className="block text-sm text-ink-muted">
                  {serving ? `${serving.name} · ${formatGrams(serving.grams)} g` : "Per 100 g"}
                  {food.verification === "estimated" ? " · Estimated" : null}
                </span>
              </span>
              <span className="text-sm font-semibold">{formatKcal(kcal ?? food.per100.calories)} kcal</span>
            </button>
          </li>
        );
      })}
    </ul>
  );
}
