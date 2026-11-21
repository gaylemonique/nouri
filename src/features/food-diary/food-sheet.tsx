"use client";

import { useState } from "react";
import { ChoiceGroup } from "@/components/ui/choice-group";
import { Sheet } from "@/components/ui/sheet";
import { Stepper } from "@/components/ui/stepper";
import { calculateConsumed } from "@/domain/nutrition/calculate";
import { MEALS, type CatalogFood, type MealType } from "@/fixtures/sample-data";
import { formatGrams, formatKcal } from "@/utils/format";

export type FoodSheetStart = {
  food: CatalogFood;
  meal: MealType;
  mode: "add" | "edit";
  servingName?: string;
  servingGrams?: number;
  quantity?: number;
};

const CUSTOM = "custom";

export function FoodSheet({ start, onClose }: { start: FoodSheetStart | null; onClose: () => void }) {
  return (
    <Sheet open={start !== null} onClose={onClose} title={start?.food.name ?? ""}>
      {/* Keyed by food so each opening starts from that food's defaults. */}
      {start ? <FoodSheetBody key={`${start.food.id}-${start.mode}-${start.servingName}`} start={start} /> : null}
    </Sheet>
  );
}

function FoodSheetBody({ start }: { start: FoodSheetStart }) {
  const { food } = start;
  const initialServing =
    food.servings.find((s) => s.name === start.servingName) ??
    (start.servingName ? undefined : food.servings.find((s) => s.isDefault) ?? food.servings[0]);

  const [servingId, setServingId] = useState<string>(initialServing?.id ?? CUSTOM);
  const [customGrams, setCustomGrams] = useState<string>(String(start.servingGrams ?? 100));
  const [quantity, setQuantity] = useState(start.quantity ?? 1);
  const [meal, setMeal] = useState<MealType>(start.meal);
  const [notice, setNotice] = useState(false);

  const serving = food.servings.find((s) => s.id === servingId);
  const parsedGrams = Number(customGrams);
  const gramsValid = servingId !== CUSTOM || (parsedGrams > 0 && parsedGrams <= 5000);
  const servingGrams = serving ? serving.grams : gramsValid ? parsedGrams : 0;
  const consumed = calculateConsumed(food.per100, servingGrams, servingId === CUSTOM ? 1 : quantity);

  const mealLabel = MEALS.find((m) => m.id === meal)?.label ?? "";

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
        {notice ? (
          <p role="status" className="rounded-lg bg-line/50 px-3 py-2 text-center text-sm text-ink-muted">
            Saving is not connected yet. Your diary will update here once sign-in is added.
          </p>
        ) : null}
        <button
          type="button"
          disabled={!gramsValid}
          onClick={() => setNotice(true)}
          className="h-12 w-full rounded-lg bg-accent font-semibold text-accent-ink disabled:opacity-50"
        >
          {start.mode === "add" ? `Add to ${mealLabel}` : "Save changes"}
        </button>
        {start.mode === "edit" ? (
          <button type="button" onClick={() => setNotice(true)} className="h-11 w-full text-sm text-ink-muted hover:text-ink">
            Remove from diary
          </button>
        ) : null}
      </div>
    </div>
  );
}
