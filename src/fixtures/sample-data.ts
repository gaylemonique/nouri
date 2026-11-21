// Prototype data for designing the screens before they are wired to Supabase.
//
// Food values are copied from the real catalog (USDA rows and the recipe
// estimates in catalog/recipes.json), so every number shown is true for that
// food. The diary, targets, week and month are made up and every screen that
// shows them says "Sample data". Delete this file when the screens read from
// repositories (phases 05 and 06).
import { calculateConsumed, type ConsumedNutrients, type NutrientsPer100g } from "@/domain/nutrition/calculate";

export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

export const MEALS: { id: MealType; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

export type FoodCategory = "filipino_dish" | "rice_and_grains" | "meat_and_poultry" | "seafood" | "eggs_and_dairy" | "fruits";

export type Serving = { id: string; name: string; grams: number; isDefault: boolean };

export type CatalogFood = {
  id: string;
  name: string;
  category: FoodCategory;
  verification: "verified" | "estimated";
  source: string;
  per100: NutrientsPer100g;
  servings: Serving[];
  aliases: string[];
};

const usda = "USDA FoodData Central";
const recipe = "Estimated from a home recipe";

const n = (
  calories: number, protein_g: number, carbohydrates_g: number, fat_g: number,
  fiber_g: number | null, sugar_g: number | null, sodium_mg: number | null,
): NutrientsPer100g => ({ calories, protein_g, carbohydrates_g, fat_g, fiber_g, sugar_g, sodium_mg });

const s = (id: string, name: string, grams: number, isDefault = false): Serving => ({ id, name, grams, isDefault });

export const SAMPLE_FOODS: CatalogFood[] = [
  { id: "rice", name: "White rice, cooked", category: "rice_and_grains", verification: "verified", source: usda,
    per100: n(130, 2.69, 28.2, 0.28, 0.4, 0.05, 1), servings: [s("rice-cup", "1 cup", 158, true)], aliases: ["kanin", "steamed rice"] },
  { id: "egg", name: "Egg, hard-boiled", category: "eggs_and_dairy", verification: "verified", source: usda,
    per100: n(155, 12.6, 1.12, 10.6, 0, 1.12, 124), servings: [s("egg-large", "1 large egg", 50, true)], aliases: ["nilagang itlog"] },
  { id: "banana", name: "Banana, raw", category: "fruits", verification: "verified", source: usda,
    per100: n(89, 1.09, 22.8, 0.33, 2.6, 12.2, 1),
    servings: [s("banana-m", "1 medium", 118, true), s("banana-s", "1 small", 101), s("banana-l", "1 large", 136)], aliases: ["saging"] },
  { id: "mango", name: "Mango, raw", category: "fruits", verification: "verified", source: usda,
    per100: n(60, 0.82, 15, 0.38, 1.6, 13.7, 1), servings: [s("mango-cup", "1 cup, pieces", 165, true), s("mango-whole", "1 whole mango", 336)], aliases: ["mangga"] },
  { id: "tilapia", name: "Tilapia, cooked", category: "seafood", verification: "verified", source: usda,
    per100: n(128, 26.2, 0, 2.65, 0, 0, 56), servings: [s("tilapia-fillet", "1 fillet", 87, true)], aliases: ["tilapya"] },
  { id: "sinigang", name: "Sinigang na baboy", category: "filipino_dish", verification: "estimated", source: recipe,
    per100: n(86.69, 2.84, 2.55, 7.3, null, null, 104.94),
    servings: [s("sinigang-serving", "1 bowl", 450, true), s("sinigang-cup", "1 cup", 237)], aliases: ["sinigang", "pork sinigang"] },
  { id: "pork-adobo", name: "Pork adobo", category: "filipino_dish", verification: "estimated", source: recipe,
    per100: n(320.19, 14.6, 2.65, 27.35, 0.16, 0.99, 651.05), servings: [s("pork-adobo-serving", "1 serving", 183, true)], aliases: ["adobo", "adobong baboy"] },
  { id: "chicken-adobo", name: "Chicken adobo", category: "filipino_dish", verification: "estimated", source: recipe,
    per100: n(219.66, 15.44, 2.76, 15.82, 0.16, 0.95, 645.26), servings: [s("chicken-adobo-serving", "1 serving", 192, true)], aliases: ["adobo", "adobong manok"] },
  { id: "kare-kare", name: "Kare-kare", category: "filipino_dish", verification: "estimated", source: recipe,
    per100: n(143.5, 9, 3.98, 10.47, null, null, 68.9), servings: [s("kare-kare-serving", "1 serving", 400, true)], aliases: ["kare kare"] },
  { id: "pancit-canton", name: "Pancit canton", category: "filipino_dish", verification: "estimated", source: recipe,
    per100: n(131.51, 7.04, 15.24, 4.82, 1.43, 1.57, 202.56), servings: [s("canton-serving", "1 serving", 242, true)], aliases: ["canton"] },
  { id: "lumpia", name: "Lumpiang shanghai", category: "filipino_dish", verification: "estimated", source: recipe,
    per100: n(338.98, 13.58, 14.91, 24.79, 0.87, null, 272.13),
    servings: [s("lumpia-piece", "1 piece", 16, true), s("lumpia-serving", "1 serving (5 pieces)", 82)], aliases: ["lumpia", "shanghai"] },
  { id: "tapsilog", name: "Tapsilog", category: "filipino_dish", verification: "estimated", source: recipe,
    per100: n(197.05, 9.34, 18.09, 9.38, 0.3, 1.5, 187.86), servings: [s("tapsilog-plate", "1 plate", 362, true)], aliases: ["tapa"] },
  { id: "pandesal", name: "Pandesal", category: "filipino_dish", verification: "estimated", source: recipe,
    per100: n(330.47, 8.7, 56.95, 7.2, 1.99, 9.04, 456.48),
    servings: [s("pandesal-piece", "1 piece", 35, true), s("pandesal-serving", "1 serving (2 pieces)", 70)], aliases: ["pan de sal"] },
  { id: "turon", name: "Turon", category: "filipino_dish", verification: "estimated", source: recipe,
    per100: n(235.2, 2.01, 43.52, 7.35, 1.51, null, 59.45), servings: [s("turon-piece", "1 piece", 87, true)], aliases: ["banana lumpia"] },
  { id: "champorado", name: "Champorado", category: "filipino_dish", verification: "estimated", source: recipe,
    per100: n(101.16, 1.97, 22.54, 0.96, 1.46, null, 12.21), servings: [s("champorado-serving", "1 bowl", 233, true)], aliases: ["chocolate porridge"] },
  { id: "arroz-caldo", name: "Arroz caldo", category: "filipino_dish", verification: "estimated", source: recipe,
    per100: n(83.52, 4.43, 7.35, 3.87, 0.32, null, 112.39),
    servings: [s("arroz-serving", "1 bowl", 417, true), s("arroz-cup", "1 cup", 237)], aliases: ["lugaw", "chicken porridge"] },
];

export const foodById = (id: string) => SAMPLE_FOODS.find((f) => f.id === id);

export type DiaryEntry = {
  id: string;
  foodId: string;
  meal: MealType;
  servingName: string;
  servingGrams: number;
  quantity: number;
};

export type DiaryRow = DiaryEntry & { food: CatalogFood; consumed: ConsumedNutrients };

export function toRow(entry: DiaryEntry): DiaryRow {
  const food = foodById(entry.foodId);
  if (!food) throw new Error(`sample food ${entry.foodId} missing`);
  return { ...entry, food, consumed: calculateConsumed(food.per100, entry.servingGrams, entry.quantity) };
}

// One plausible day. Only "today" has entries, so other days show the empty state.
export const SAMPLE_TODAY: DiaryEntry[] = [
  { id: "e1", foodId: "pandesal", meal: "breakfast", servingName: "1 piece", servingGrams: 35, quantity: 2 },
  { id: "e2", foodId: "egg", meal: "breakfast", servingName: "1 large egg", servingGrams: 50, quantity: 1 },
  { id: "e3", foodId: "chicken-adobo", meal: "lunch", servingName: "1 serving", servingGrams: 192, quantity: 1 },
  { id: "e4", foodId: "rice", meal: "lunch", servingName: "1 cup", servingGrams: 158, quantity: 1 },
  { id: "e5", foodId: "banana", meal: "snack", servingName: "1 medium", servingGrams: 118, quantity: 1 },
];

export const SAMPLE_TARGETS = { calories: 2000, protein_g: 100, carbohydrates_g: 250, fat_g: 65 };

export type DayTotal = { calories: number; protein_g: number; carbohydrates_g: number; fat_g: number };

export function sumRows(rows: DiaryRow[]): DayTotal {
  return rows.reduce<DayTotal>(
    (t, r) => ({
      calories: t.calories + r.consumed.calories,
      protein_g: t.protein_g + r.consumed.protein_g,
      carbohydrates_g: t.carbohydrates_g + r.consumed.carbohydrates_g,
      fat_g: t.fat_g + r.consumed.fat_g,
    }),
    { calories: 0, protein_g: 0, carbohydrates_g: 0, fat_g: 0 },
  );
}

// Last 7 days, oldest first; the final day is today's sample diary.
export const SAMPLE_WEEK_CALORIES = [1840, 2150, 1720, 1960, 2310, 1890];

// 30 days, oldest first: "in" within 10% of target, "over", "under", "none" not logged.
export type DayStatus = "in" | "over" | "under" | "none";
export const SAMPLE_MONTH: DayStatus[] = (
  "in in over in none in under in in over in in in none none in over in in under in in in over in in in none in in"
).split(" ") as DayStatus[];

export const RECENT_FOOD_IDS = ["chicken-adobo", "rice", "pandesal", "banana", "egg"];
