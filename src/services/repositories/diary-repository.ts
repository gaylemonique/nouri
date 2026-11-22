import type { ConsumedNutrients, NutrientsPer100g } from "@/domain/nutrition/calculate";
import type { MealType } from "@/features/food-diary/meals";
import { getSupabase } from "@/infrastructure/supabase/client";
import type { Tables } from "@/types/database.types";
import { sourceLabel, toServings, type Serving, type ServingRow, type Verification } from "./food-repository";

// One logged item as the screens use it. Nutrients are the server's numbers
// for saved entries and the client calculator's for entries still saving.
export type DiaryEntry = {
  id: string;
  logDate: string;
  meal: MealType;
  foodId: string | null;
  foodName: string;
  servingId: string | null;
  servingName: string | null; // null when logged by weight
  servingGrams: number;
  quantity: number;
  per100: NutrientsPer100g; // the snapshot the entry was logged with
  consumed: ConsumedNutrients;
  servings: Serving[]; // the catalog food's servings, for editing
  verification: Verification;
  source: string;
};

export type ItemRow = Tables<"food_log_items">;
type ItemWithFood = ItemRow & {
  foods: { verification_status: string; source_name: string; food_servings: ServingRow[] } | null;
};

const DAY_SELECT =
  "*, food_logs!inner(log_date), foods(verification_status, source_name, food_servings(id, serving_name, weight_grams, is_default, sort_order))";

function snapshot(json: ItemRow["nutrients_per_100g"]): NutrientsPer100g {
  const s = json as Record<string, number | null>;
  return {
    calories: s.calories ?? 0,
    protein_g: s.protein_g ?? 0,
    carbohydrates_g: s.carbohydrates_g ?? 0,
    fat_g: s.fat_g ?? 0,
    fiber_g: s.fiber_g ?? null,
    sugar_g: s.sugar_g ?? null,
    sodium_mg: s.sodium_mg ?? null,
  };
}

// Copies the columns a write can change from a server row onto an entry.
// RPC results carry no food details (servings, verification), so those stay
// as they were.
export function withServerNumbers(entry: DiaryEntry, row: ItemRow): DiaryEntry {
  return {
    ...entry,
    meal: row.meal_type as MealType,
    servingId: row.food_serving_id,
    servingName: row.serving_name_snapshot,
    servingGrams: row.serving_weight_grams,
    quantity: row.quantity,
    consumed: {
      grams: row.total_weight_grams ?? row.serving_weight_grams * row.quantity,
      calories: row.calories,
      protein_g: row.protein_g,
      carbohydrates_g: row.carbohydrates_g,
      fat_g: row.fat_g,
      fiber_g: row.fiber_g,
      sugar_g: row.sugar_g,
      sodium_mg: row.sodium_mg,
    },
  };
}

function toEntry(row: ItemWithFood, logDate: string): DiaryEntry {
  const base: DiaryEntry = {
    id: row.id,
    logDate,
    meal: row.meal_type as MealType,
    foodId: row.food_id,
    foodName: row.food_name_snapshot,
    servingId: row.food_serving_id,
    servingName: row.serving_name_snapshot,
    servingGrams: row.serving_weight_grams,
    quantity: row.quantity,
    per100: snapshot(row.nutrients_per_100g),
    consumed: { grams: 0, calories: 0, protein_g: 0, carbohydrates_g: 0, fat_g: 0, fiber_g: null, sugar_g: null, sodium_mg: null },
    servings: row.foods ? toServings(row.foods.food_servings) : [],
    verification: (row.foods?.verification_status ?? "unverified") as Verification,
    source: row.foods ? sourceLabel(row.foods.verification_status, row.foods.source_name) : "No longer in the catalog",
  };
  return withServerNumbers(base, row);
}

export async function fetchDiaryDay(logDate: string): Promise<DiaryEntry[]> {
  const { data, error } = await getSupabase()
    .from("food_log_items")
    .select(DAY_SELECT)
    .eq("food_logs.log_date", logDate)
    .order("created_at");
  if (error) throw error;
  return (data as unknown as ItemWithFood[]).map((row) => toEntry(row, logDate));
}

// Exactly one of servingId or servingGrams, as the RPCs require.
export type ServingChoice = { servingId: string; servingGrams?: undefined } | { servingId?: undefined; servingGrams: number };

export type LogFoodInput = { id: string; logDate: string; meal: MealType; foodId: string; quantity: number } & ServingChoice;

// Idempotent on id: retrying a call that already went through returns the same row.
export async function logFood(input: LogFoodInput): Promise<ItemRow> {
  const { data, error } = await getSupabase().rpc("log_food_item", {
    p_id: input.id,
    p_log_date: input.logDate,
    p_meal_type: input.meal,
    p_food_id: input.foodId,
    p_quantity: input.quantity,
    p_serving_id: input.servingId,
    p_serving_grams: input.servingGrams,
  });
  if (error) throw error;
  return data;
}

export type UpdateEntryInput = { id: string; meal: MealType; quantity: number } & ServingChoice;

export async function updateEntry(input: UpdateEntryInput): Promise<ItemRow> {
  const { data, error } = await getSupabase().rpc("update_food_log_item", {
    p_id: input.id,
    p_meal_type: input.meal,
    p_quantity: input.quantity,
    p_serving_id: input.servingId,
    p_serving_grams: input.servingGrams,
  });
  if (error) throw error;
  return data;
}

export async function deleteEntry(id: string): Promise<void> {
  const { error } = await getSupabase().rpc("delete_food_log_item", { p_id: id });
  if (error) throw error;
}
