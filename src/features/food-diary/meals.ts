export type MealType = "breakfast" | "lunch" | "dinner" | "snack";

// Same four values as the meal_type check in the database.
export const MEALS: { id: MealType; label: string }[] = [
  { id: "breakfast", label: "Breakfast" },
  { id: "lunch", label: "Lunch" },
  { id: "dinner", label: "Dinner" },
  { id: "snack", label: "Snacks" },
];

export const isMeal = (v: string | null | undefined): v is MealType => MEALS.some((m) => m.id === v);

export const mealLabel = (id: MealType) => MEALS.find((m) => m.id === id)?.label ?? id;
