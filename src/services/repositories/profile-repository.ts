import { getSupabase } from "@/infrastructure/supabase/client";
import type { Tables } from "@/types/database.types";

export type Profile = Tables<"profiles">;
export type NutritionGoals = Tables<"nutrition_goals">;
export type GoalsInput = Pick<NutritionGoals, "calorie_goal" | "protein_goal_g" | "carbohydrates_goal_g" | "fat_goal_g">;

export async function fetchProfile(userId: string): Promise<Profile> {
  const { data, error } = await getSupabase().from("profiles").select("*").eq("id", userId).single();
  if (error) throw error;
  return data;
}

export async function fetchGoals(userId: string): Promise<NutritionGoals | null> {
  const { data, error } = await getSupabase().from("nutrition_goals").select("*").eq("user_id", userId).maybeSingle();
  if (error) throw error;
  return data;
}

// user_id is left out on purpose: the column defaults to auth.uid(), and the
// client role has no update grant on it (see 20261121120000_goals_user_default).
export async function saveGoals(input: GoalsInput): Promise<NutritionGoals> {
  const { data, error } = await getSupabase()
    .from("nutrition_goals")
    .upsert(input, { onConflict: "user_id" })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function completeOnboarding(userId: string, displayName: string | null): Promise<Profile> {
  const { data, error } = await getSupabase()
    .from("profiles")
    .update({ display_name: displayName, onboarding_completed_at: new Date().toISOString() })
    .eq("id", userId)
    .select()
    .single();
  if (error) throw error;
  return data;
}
