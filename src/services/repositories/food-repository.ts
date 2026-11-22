import type { NutrientsPer100g } from "@/domain/nutrition/calculate";
import { getSupabase } from "@/infrastructure/supabase/client";
import type { Tables } from "@/types/database.types";

export type Serving = { id: string; name: string; grams: number; isDefault: boolean };

export type Verification = "verified" | "estimated" | "unverified";

export type CatalogFood = {
  id: string;
  name: string;
  category: string;
  verification: Verification;
  source: string;
  per100: NutrientsPer100g;
  servings: Serving[];
};

export type ServingRow = Pick<Tables<"food_servings">, "id" | "serving_name" | "weight_grams" | "is_default" | "sort_order">;
type FoodRow = Tables<"foods"> & { food_servings: ServingRow[] };

// search_foods and recent_foods return foods rows, so servings embed the same way.
const FOOD_SELECT = "*, food_servings(id, serving_name, weight_grams, is_default, sort_order)";

export function toServings(rows: ServingRow[]): Serving[] {
  return [...rows]
    .sort((a, b) => a.sort_order - b.sort_order)
    .map((s) => ({ id: s.id, name: s.serving_name, grams: s.weight_grams, isDefault: s.is_default }));
}

export function sourceLabel(verification: string, sourceName: string): string {
  if (verification === "estimated") return "Estimated from a home recipe using USDA ingredient values";
  if (sourceName.startsWith("USDA")) return "USDA FoodData Central";
  return sourceName;
}

function toCatalogFood(row: FoodRow): CatalogFood {
  return {
    id: row.id,
    name: row.name,
    category: row.category,
    verification: row.verification_status as Verification,
    source: sourceLabel(row.verification_status, row.source_name),
    per100: {
      calories: row.calories_per_100g,
      protein_g: row.protein_per_100g,
      carbohydrates_g: row.carbohydrates_per_100g,
      fat_g: row.fat_per_100g,
      fiber_g: row.fiber_per_100g,
      sugar_g: row.sugar_per_100g,
      sodium_mg: row.sodium_mg_per_100g,
    },
    servings: toServings(row.food_servings),
  };
}

export async function searchFoods(query: string): Promise<CatalogFood[]> {
  const { data, error } = await getSupabase().rpc("search_foods", { p_query: query, p_limit: 50 }).select(FOOD_SELECT);
  if (error) throw error;
  return (data as unknown as FoodRow[]).map(toCatalogFood);
}

export async function fetchFoodsInCategories(categories: string[]): Promise<CatalogFood[]> {
  const { data, error } = await getSupabase().from("foods").select(FOOD_SELECT).in("category", categories).order("name");
  if (error) throw error;
  return (data as unknown as FoodRow[]).map(toCatalogFood);
}

export async function fetchRecentFoods(): Promise<CatalogFood[]> {
  const { data, error } = await getSupabase().rpc("recent_foods", { p_limit: 8 }).select(FOOD_SELECT);
  if (error) throw error;
  return (data as unknown as FoodRow[]).map(toCatalogFood);
}
