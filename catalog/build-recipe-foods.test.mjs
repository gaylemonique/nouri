// node --test "catalog/*.test.mjs"
import { test } from "node:test";
import assert from "node:assert/strict";
import { computeRecipe } from "./build-recipe-foods.mjs";

const usda = {
  1: { kcal: 200, protein_g: 20, carbohydrates_g: 0, fat_g: 13, fiber_g: 0, sugar_g: 0, sodium_mg: 60 }, // meat
  2: { kcal: 40, protein_g: 1, carbohydrates_g: 10, fat_g: 0, fiber_g: 2, sugar_g: 4, sodium_mg: 5 }, // vegetable
  3: { kcal: 0, protein_g: 0, carbohydrates_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 4 }, // water
  4: { kcal: 50, protein_g: 3, carbohydrates_g: 10, fat_g: 0, fiber_g: null, sugar_g: null, sodium_mg: 2 }, // no fiber/sugar data
};

const base = { id: "t", servings: 4, ingredients: [] };

test("divides ingredient totals by the finished weight", () => {
  // 500 g meat + 500 g veg + 1000 g water -> 1500 g: kcal = (1000 + 200) / 1500 * 100 = 80
  const { per100 } = computeRecipe(
    { ...base, yield_g: 1500, ingredients: [{ fdc: 1, g: 500 }, { fdc: 2, g: 500 }, { fdc: 3, g: 1000 }] },
    usda,
  );
  assert.equal(per100.kcal, 80);
  assert.equal(per100.protein_g, 7); // (100 + 5) / 15
  assert.equal(per100.fiber_g, 0.67); // 10 / 15
  assert.equal(per100.sodium_mg, 24.33); // (300 + 25 + 40) / 15
});

test("removed fat comes off fat and energy", () => {
  // 1000 g meat = 2000 kcal, 130 g fat; remove 50 g fat -> 1550 kcal, 80 g fat over 700 g
  const { per100 } = computeRecipe({ ...base, yield_g: 700, fat_removed_g: 50, ingredients: [{ fdc: 1, g: 1000 }] }, usda);
  assert.equal(per100.kcal, 221.43);
  assert.equal(per100.fat_g, 11.43);
});

test("fiber and sugar stay null when unknown ingredients carry real carbohydrate", () => {
  // ingredient 4 holds half the carbohydrate and has no fiber/sugar data
  const { per100 } = computeRecipe({ ...base, yield_g: 200, ingredients: [{ fdc: 2, g: 100 }, { fdc: 4, g: 100 }] }, usda);
  assert.equal(per100.fiber_g, null);
  assert.equal(per100.sugar_g, null);
});

test("a small unknown share is ignored", () => {
  // ingredient 4 is 1 g carb of 101 g total, under the 5% limit
  const { per100 } = computeRecipe({ ...base, yield_g: 1010, ingredients: [{ fdc: 2, g: 1000 }, { fdc: 4, g: 10 }] }, usda);
  assert.equal(per100.fiber_g, 1.98);
});

test("servings: pieces become the default, cup is optional", () => {
  const { servings } = computeRecipe(
    { ...base, yield_g: 800, pieces: 20, cup_g: 237, ingredients: [{ fdc: 2, g: 900 }] },
    usda,
  );
  assert.deepEqual(servings, [
    { name: "1 piece", g: 40, isDefault: true },
    { name: "1 serving", g: 200, isDefault: false },
    { name: "1 cup", g: 237, isDefault: false },
  ]);
});

test("rejects impossible yields", () => {
  assert.throws(() => computeRecipe({ ...base, yield_g: 2000, ingredients: [{ fdc: 2, g: 1000 }] }, usda), /more than the raw/);
  assert.throws(() => computeRecipe({ ...base, yield_g: 0, ingredients: [{ fdc: 2, g: 1000 }] }, usda), /positive/);
  assert.throws(() => computeRecipe({ ...base, yield_g: 100, ingredients: [{ fdc: 99, g: 100 }] }, usda), /missing/);
});
