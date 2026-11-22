// How a finished day compares with the calorie target. "Within" means within
// 10% either side, so a day 50 kcal under a 2,000 kcal target still counts.
export type DayStatus = "in" | "over" | "under" | "none";

export const TARGET_BAND = 0.1;

export type DayTotal = { calories: number; itemCount: number };

export function dayStatus(day: DayTotal, target: number): DayStatus {
  if (day.itemCount === 0) return "none";
  if (day.calories > target * (1 + TARGET_BAND)) return "over";
  if (day.calories < target * (1 - TARGET_BAND)) return "under";
  return "in";
}

// Summary of finished days. Days with nothing logged are left out of the
// average and the counts: an empty day means "not tracked", not "ate 0 kcal".
export function summarizeDays(days: DayTotal[], target: number) {
  const logged = days.filter((d) => d.itemCount > 0);
  const statuses = logged.map((d) => dayStatus(d, target));
  return {
    logged: logged.length,
    average: logged.length ? logged.reduce((sum, d) => sum + d.calories, 0) / logged.length : null,
    within: statuses.filter((s) => s === "in").length,
    over: statuses.filter((s) => s === "over").length,
  };
}
