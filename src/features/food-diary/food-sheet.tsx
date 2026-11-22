"use client";

import { useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { calculateConsumed } from "@/domain/nutrition/calculate";
import type { CatalogFood } from "@/services/repositories/food-repository";
import { formatGrams, formatKcal } from "@/utils/format";
import { MEALS, mealLabel, type MealType } from "./meals";
import { useAddFood, useDeleteEntry, useUpdateEntry, type DayEntry } from "./use-diary";

export type FoodSheetStart =
  | { mode: "add"; food: CatalogFood; meal: MealType; logDate: string }
  | { mode: "edit"; entry: DayEntry };

const CUSTOM = "custom";

export function FoodSheet({
  start,
  onClose,
  onAdded,
}: {
  start: FoodSheetStart | null;
  onClose: () => void;
  onAdded?: (message: string) => void;
}) {
  const title = start ? (start.mode === "add" ? start.food.name : start.entry.foodName) : "";
  const key = start ? (start.mode === "add" ? `add-${start.food.id}` : `edit-${start.entry.id}`) : "none";
  return (
    <Sheet open={start !== null} onClose={onClose} title={title}>
      {/* Keyed so each opening starts from that food's or entry's values. */}
      {start ? <FoodSheetBody key={key} start={start} onClose={onClose} onAdded={onAdded} /> : null}
    </Sheet>
  );
}

// What the sheet needs from a catalog food or a logged entry. Entries use
// their own per 100 g snapshot, the same values the server rescales from.
function describe(start: FoodSheetStart) {
  if (start.mode === "add") {
    const { food } = start;
    const serving = food.servings.find((s) => s.isDefault) ?? food.servings[0];
    return { per100: food.per100, servings: food.servings, verification: food.verification, source: food.source,
      servingId: serving?.id ?? CUSTOM, grams: 100, quantity: 1, meal: start.meal };
  }
  const { entry } = start;
  const known = entry.servings.some((s) => s.id === entry.servingId);
  return { per100: entry.per100, servings: entry.servings, verification: entry.verification, source: entry.source,
    servingId: known && entry.servingId ? entry.servingId : CUSTOM,
    grams: known ? 100 : entry.consumed.grams, quantity: known ? entry.quantity : 1, meal: entry.meal };
}

function FoodSheetBody({
  start,
  onClose,
  onAdded,
}: {
  start: FoodSheetStart;
  onClose: () => void;
  onAdded?: (message: string) => void;
}) {
  const food = describe(start);
  const logDate = start.mode === "add" ? start.logDate : start.entry.logDate;
  const addFood = useAddFood();
  const updateEntry = useUpdateEntry();
  const deleteEntry = useDeleteEntry();

  const [servingId, setServingId] = useState<string>(food.servingId);
  const [customGrams, setCustomGrams] = useState<string>(String(food.grams));
  const [quantity, setQuantity] = useState(food.quantity);
  const [meal, setMeal] = useState<MealType>(food.meal);

  const serving = food.servings.find((s) => s.id === servingId);
  const parsedGrams = Number(customGrams);
  const gramsValid = servingId !== CUSTOM || (parsedGrams > 0 && parsedGrams <= 5000);
  const servingGrams = serving ? serving.grams : gramsValid ? parsedGrams : 0;
  const amount = servingId === CUSTOM ? 1 : quantity;
  const consumed = calculateConsumed(food.per100, servingGrams, amount);
  const choice = serving ? { servingId: serving.id } : { servingGrams: parsedGrams };

  // Writes are optimistic: the sheet closes at once and the diary shows the
  // change, marked while it saves. Failures surface on the diary screens.
  const save = () => {
    if (!gramsValid) return;
    if (start.mode === "add") {
      addFood({ food: start.food, meal, logDate, quantity: amount, ...choice });
      onAdded?.(`${start.food.name} added to ${mealLabel(meal).toLowerCase()}.`);
    } else {
      updateEntry(start.entry, { meal, quantity: amount, ...choice });
    }
    onClose();
  };

  const remove = () => {
    if (start.mode !== "edit") return;
    deleteEntry(start.entry);
    onClose();
  };

  return (
    <div className="space-y-6 pt-1">
      <p className="text-sm text-ink-muted">
        {food.source}
        {food.verification === "estimated" ? ". Values change with how it is cooked." : null}
      </p>

      <section aria-label="Nutrition for this amount">
        <p className="text-sm text-ink-muted">{formatGrams(consumed.grams)} g</p>
        <p className="text-4xl font-semibold leading-none">
          {formatKcal(consumed.calories)} <span className="text-base font-normal text-ink-muted">kcal</span>
        </p>
        <dl className="mt-4 grid grid-cols-3 gap-2">
          {[
            { label: "Protein", value: consumed.protein_g, bar: "bg-protein" },
            { label: "Carbs", value: consumed.carbohydrates_g, bar: "bg-carbs" },
            { label: "Fat", value: consumed.fat_g, bar: "bg-fat" },
          ].map((m) => (
            <div key={m.label} className="rounded-card border border-line px-3 py-2.5">
              <dt className="text-xs text-ink-muted">{m.label}</dt>
              <dd className="mt-0.5 text-lg font-semibold">{formatGrams(m.value)} g</dd>
              <div aria-hidden className={`mt-2 h-1 w-6 rounded-full ${m.bar}`} />
            </div>
          ))}
        </dl>
        <dl className="mt-3 divide-y divide-line text-sm">
          {[
            { label: "Fiber", value: consumed.fiber_g, unit: "g" },
            { label: "Sugar", value: consumed.sugar_g, unit: "g" },
            { label: "Sodium", value: consumed.sodium_mg, unit: "mg" },
          ].map((r) => (
            <div key={r.label} className="flex justify-between py-2">
              <dt className="text-ink-muted">{r.label}</dt>
              <dd>{r.value === null ? <span className="text-ink-muted">No data for this food</span> : `${formatGrams(r.value)} ${r.unit}`}</dd>
            </div>
          ))}
        </dl>
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Serving</h3>
        <ChoiceGroup
          label="Serving"
          value={servingId}
          onChange={setServingId}
          options={[
            ...food.servings.map((s) => ({ value: s.id, label: `${s.name} · ${formatGrams(s.grams)} g` })),
            { value: CUSTOM, label: "Grams" },
          ]}
        />
        {servingId === CUSTOM ? (
          <label className="block">
            <span className="text-sm text-ink-muted">Weight in grams</span>
            <input
              type="number"
              inputMode="decimal"
              min={1}
              max={5000}
              value={customGrams}
              onChange={(e) => setCustomGrams(e.target.value)}
              aria-invalid={!gramsValid}
              className="mt-1 block h-11 w-32 rounded-lg border border-line bg-paper px-3 text-lg"
            />
            {!gramsValid ? <span className="mt-1 block text-sm text-ink">Enter between 1 and 5000 g.</span> : null}
          </label>
        ) : (
          <Stepper label="Quantity" value={quantity} onChange={setQuantity} />
        )}
      </section>

      <section className="space-y-3">
        <h3 className="text-sm font-semibold">Meal</h3>
        <ChoiceGroup label="Meal" value={meal} onChange={setMeal} options={MEALS.map((m) => ({ value: m.id, label: m.label }))} />
      </section>

      <div className="space-y-2">
        <button
          type="button"
          disabled={!gramsValid}
          onClick={save}
          className="h-12 w-full rounded-lg bg-accent font-semibold text-accent-ink disabled:opacity-50"
        >
          {start.mode === "add" ? `Add to ${mealLabel(meal)}` : "Save changes"}
        </button>
        {start.mode === "edit" ? (
          <button type="button" onClick={remove} className="h-11 w-full text-sm text-ink-muted hover:text-ink">
            Remove from diary
          </button>
        ) : null}
      </div>
    </div>
  );
}
