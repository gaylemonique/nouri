import { describe, expect, it } from "vitest";
import { calculateConsumed, gramsEaten, scaleNutrient, type NutrientsPer100g } from "@/domain/nutrition/calculate";

// Every expected number below is what the database returned in
// supabase/tests/diary_checks.sql and catalog_checks.sql. If the client and
// the server ever disagree, this file is where it shows.

const whiteRice: NutrientsPer100g = {
  calories: 130, protein_g: 2.69, carbohydrates_g: 28.2, fat_g: 0.28, fiber_g: 0.4, sugar_g: 0.05, sodium_mg: 1,
};

describe("matches the server", () => {
  it("1.5 cups of rice (158 g cup)", () => {
    const r = calculateConsumed(whiteRice, 158, 1.5);
    expect(r.grams).toBe(237);
    expect(r.calories).toBe(308.1);
    expect(r.protein_g).toBe(6.38);
  });

  it("2 cups of rice after an edit", () => {
    expect(calculateConsumed(whiteRice, 158, 2).calories).toBe(410.8);
  });

  it("200 g of chicken breast", () => {
    expect(scaleNutrient(165, gramsEaten(200, 1))).toBe(330);
  });

  it("2 pandesal (35 g piece)", () => {
    expect(scaleNutrient(330.47, gramsEaten(35, 2))).toBe(231.33);
  });

  it("450 g of sinigang, fiber unknown", () => {
    const r = calculateConsumed(
      { calories: 86.69, protein_g: 2.84, carbohydrates_g: 2.55, fat_g: 7.3, fiber_g: null, sugar_g: null, sodium_mg: 104.94 },
      450,
      1,
    );
    expect(r.calories).toBe(390.11);
    expect(r.fiber_g).toBeNull();
    expect(r.sugar_g).toBeNull();
  });
});

describe("rounds like Postgres numeric", () => {
  it("rounds exact halves away from zero", () => {
    // round(0.5 * 1 / 100, 2) = round(0.005, 2) = 0.01 in Postgres; 0.005 is 0.00499.. as a float
    expect(scaleNutrient(0.5, 1)).toBe(0.01);
    expect(gramsEaten(0.05, 0.1)).toBe(0.01); // round(0.005, 2)
    expect(scaleNutrient(1.15, 100)).toBe(1.15);
  });

  it("keeps two decimals on awkward products", () => {
    expect(scaleNutrient(2.69, 316)).toBe(8.5); // 8.5004
    expect(scaleNutrient(7851, 30)).toBe(2355.3); // fish sauce sodium
  });
});
