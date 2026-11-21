// Client copy of the server's nutrition formula (private.scale_nutrient and
// log_food_item in supabase/migrations/20261121090200_diary_functions.sql).
// Used to show an entry the moment it is added, before the server answers.
// The server stays the source of truth; tests/unit/nutrition.test.ts pins the
// two to the same numbers.
//
//   grams eaten = round(serving grams * quantity, 2)
//   nutrient    = round(per 100 g value * grams eaten / 100, 2)
//
// Postgres numeric rounds exact decimals half away from zero. Floats cannot
// (0.005 is not representable), so the maths runs on integer hundredths.

export type NutrientsPer100g = {
  calories: number;
  protein_g: number;
  carbohydrates_g: number;
  fat_g: number;
  fiber_g: number | null;
  sugar_g: number | null;
  sodium_mg: number | null;
};

export type ConsumedNutrients = NutrientsPer100g & { grams: number };

const toHundredths = (n: number) => Math.round(n * 100);

// Both inputs carry at most 2 decimals (numeric(_, 2) columns).
// a/100 * b/100 = ab / 10_000; rounding to 2 decimals = round(ab / 100) / 100.
function multiplyRound2(a: number, b: number): number {
  const product = toHundredths(a) * toHundredths(b); // scaled by 10_000
  return Math.round(product / 100) / 100; // values are never negative
}

export function gramsEaten(servingGrams: number, quantity: number): number {
  return multiplyRound2(servingGrams, quantity);
}

export function scaleNutrient(per100g: number, grams: number): number;
export function scaleNutrient(per100g: number | null, grams: number): number | null;
export function scaleNutrient(per100g: number | null, grams: number): number | null {
  if (per100g === null) return null;
  // per100g * grams / 100 = ab / 1_000_000; to 2 decimals = round(ab / 10_000) / 100
  const product = toHundredths(per100g) * toHundredths(grams);
  return Math.round(product / 10_000) / 100;
}

export function calculateConsumed(
  per100g: NutrientsPer100g,
  servingGrams: number,
  quantity: number,
): ConsumedNutrients {
  const grams = gramsEaten(servingGrams, quantity);
  return {
    grams,
    calories: scaleNutrient(per100g.calories, grams),
    protein_g: scaleNutrient(per100g.protein_g, grams),
    carbohydrates_g: scaleNutrient(per100g.carbohydrates_g, grams),
    fat_g: scaleNutrient(per100g.fat_g, grams),
    fiber_g: scaleNutrient(per100g.fiber_g, grams),
    sugar_g: scaleNutrient(per100g.sugar_g, grams),
    sodium_mg: scaleNutrient(per100g.sodium_mg, grams),
  };
}
