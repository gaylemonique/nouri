"use client";

import { Search } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { useMemo, useState } from "react";
import { SampleDataNote, ScreenHeader, SectionTitle } from "@/components/shared/screen";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { calculateConsumed } from "@/domain/nutrition/calculate";
import { FoodSheet, type FoodSheetStart } from "@/features/food-diary/food-sheet";
import { MEALS, RECENT_FOOD_IDS, SAMPLE_FOODS, foodById, type CatalogFood, type MealType } from "@/fixtures/sample-data";
import { formatGrams, formatKcal } from "@/utils/format";

type Filter = "all" | "filipino" | "rice" | "protein" | "fruit";

const FILTERS: { value: Filter; label: string; match: (f: CatalogFood) => boolean }[] = [
  { value: "all", label: "All", match: () => true },
  { value: "filipino", label: "Filipino dishes", match: (f) => f.category === "filipino_dish" },
  { value: "rice", label: "Rice", match: (f) => f.category === "rice_and_grains" },
  { value: "protein", label: "Meat, fish, eggs", match: (f) => ["meat_and_poultry", "seafood", "eggs_and_dairy"].includes(f.category) },
  { value: "fruit", label: "Fruit", match: (f) => f.category === "fruits" },
];

const isMeal = (v: string | null): v is MealType => MEALS.some((m) => m.id === v);

export function DiscoverView() {
  const params = useSearchParams();
  const mealParam = params.get("meal");
  const meal: MealType = isMeal(mealParam) ? mealParam : "lunch";
  const mealLabel = MEALS.find((m) => m.id === meal)?.label;

  const [query, setQuery] = useState("");
  const [filter, setFilter] = useState<Filter>("all");
  const [sheet, setSheet] = useState<FoodSheetStart | null>(null);

  const q = query.trim().toLowerCase();
  const results = useMemo(() => {
    const match = FILTERS.find((f) => f.value === filter)?.match ?? (() => true);
    return SAMPLE_FOODS.filter(
      (f) => match(f) && (!q || f.name.toLowerCase().includes(q) || f.aliases.some((a) => a.toLowerCase().includes(q))),
    );
  }, [q, filter]);

  const browsing = !q && filter === "all";
  const recent = RECENT_FOOD_IDS.map(foodById).filter((f): f is CatalogFood => Boolean(f));
  const open = (food: CatalogFood) => setSheet({ food, meal, mode: "add" });

  return (
    <>
      <ScreenHeader title="Discover" kicker={isMeal(mealParam) ? `Adding to ${mealLabel}` : undefined} />
      <SampleDataNote>Search covers {SAMPLE_FOODS.length} catalog foods here and the full catalog once sign-in is connected.</SampleDataNote>

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
        <div className="space-y-6">
          <section>
            <SectionTitle>Recent</SectionTitle>
            <FoodList foods={recent} onOpen={open} />
          </section>
          <section>
            <SectionTitle aside="Estimated from home recipes">Filipino dishes</SectionTitle>
            <FoodList foods={SAMPLE_FOODS.filter((f) => f.category === "filipino_dish")} onOpen={open} />
          </section>
        </div>
      ) : results.length ? (
        <section>
          <SectionTitle>{results.length === 1 ? "1 food" : `${results.length} foods`}</SectionTitle>
          <FoodList foods={results} onOpen={open} />
        </section>
      ) : (
        <div className="rounded-card border border-line px-4 py-6 text-center">
          <p className="font-medium">No food matches “{query.trim()}”</p>
          <p className="mt-1 text-sm text-ink-muted">Try the Tagalog or English name, or a shorter word.</p>
        </div>
      )}

      <FoodSheet start={sheet} onClose={() => setSheet(null)} />
    </>
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
                  {serving ? `${serving.name} · ${formatGrams(serving.grams)} g` : null}
                  {food.verification === "estimated" ? " · Estimated" : null}
                </span>
              </span>
              {kcal !== null ? <span className="text-sm font-semibold">{formatKcal(kcal)} kcal</span> : null}
            </button>
          </li>
        );
      })}
    </ul>
  );
}
