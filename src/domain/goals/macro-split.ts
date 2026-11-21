// Turns a calorie target into gram targets for a given share of energy per
// macro. Protein and carbohydrate give 4 kcal per gram, fat 9.
export type MacroSplit = { protein: number; carbohydrates: number; fat: number };

// Offered as an editable starting point in the goals form, not a recommendation.
export const STARTING_SPLIT: MacroSplit = { protein: 0.25, carbohydrates: 0.5, fat: 0.25 };

export function macroGramsFromCalories(calories: number, split: MacroSplit = STARTING_SPLIT) {
  return {
    protein_g: Math.round((calories * split.protein) / 4),
    carbohydrates_g: Math.round((calories * split.carbohydrates) / 4),
    fat_g: Math.round((calories * split.fat) / 9),
  };
}
