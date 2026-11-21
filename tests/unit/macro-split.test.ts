import { describe, expect, it } from "vitest";
import { macroGramsFromCalories } from "@/domain/goals/macro-split";

describe("macroGramsFromCalories", () => {
  it("splits 2000 kcal 25/50/25 into grams", () => {
    // 500 kcal / 4, 1000 kcal / 4, 500 kcal / 9 = 55.6
    expect(macroGramsFromCalories(2000)).toEqual({ protein_g: 125, carbohydrates_g: 250, fat_g: 56 });
  });

  it("uses a custom split", () => {
    expect(macroGramsFromCalories(1800, { protein: 0.3, carbohydrates: 0.4, fat: 0.3 })).toEqual({
      protein_g: 135,
      carbohydrates_g: 180,
      fat_g: 60,
    });
  });
});
