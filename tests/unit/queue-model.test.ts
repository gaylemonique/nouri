import { describe, expect, it } from "vitest";
import { applyQueue, shouldRetryLater, nextToSend, queueDelete, type QueuedOp } from "@/features/food-diary/queue-model";
import type { DiaryEntry } from "@/services/repositories/diary-repository";

const rice: DiaryEntry = {
  id: "e-rice",
  logDate: "2026-11-22",
  meal: "lunch",
  foodId: "f-rice",
  foodName: "White rice, cooked",
  servingId: "s-cup",
  servingName: "1 cup",
  servingGrams: 158,
  quantity: 1,
  per100: { calories: 130, protein_g: 2.69, carbohydrates_g: 28.2, fat_g: 0.28, fiber_g: 0.4, sugar_g: 0.05, sodium_mg: 1 },
  consumed: { grams: 158, calories: 205.4, protein_g: 4.25, carbohydrates_g: 44.56, fat_g: 0.44, fiber_g: 0.63, sugar_g: 0.08, sodium_mg: 1.58 },
  servings: [{ id: "s-cup", name: "1 cup", grams: 158, isDefault: true }],
  verification: "verified",
  source: "USDA FoodData Central",
};

const egg: DiaryEntry = { ...rice, id: "e-egg", foodName: "Egg", meal: "breakfast" };

const add = (entry: DiaryEntry, failed = false): QueuedOp => ({
  opId: `add-${entry.id}`,
  kind: "add",
  logDate: entry.logDate,
  entry,
  input: { id: entry.id, logDate: entry.logDate, meal: entry.meal, foodId: "f", quantity: 1, servingId: "s-cup" },
  failed,
});

const update1_5: QueuedOp = {
  opId: "upd",
  kind: "update",
  logDate: "2026-11-22",
  entryId: "e-rice",
  foodName: "White rice, cooked",
  change: { meal: "dinner", quantity: 1.5, servingId: "s-cup", servingName: "1 cup", servingGrams: 158 },
  input: { id: "e-rice", meal: "dinner", quantity: 1.5, servingId: "s-cup" },
};

const del = (entryId: string): Extract<QueuedOp, { kind: "delete" }> => ({
  opId: `del-${entryId}`,
  kind: "delete",
  logDate: "2026-11-22",
  entryId,
  foodName: "x",
});

describe("applyQueue", () => {
  it("adds queued entries as pending and failed ones as failed", () => {
    const day = applyQueue([egg], [add(rice), add({ ...rice, id: "e-2" }, true)], "2026-11-22");
    expect(day.map((e) => [e.id, e.status])).toEqual([
      ["e-egg", "saved"],
      ["e-rice", "pending"],
      ["e-2", "failed"],
    ]);
  });

  it("applies a queued edit with the server's rounding (1.5 cups = 237 g, 308.10 kcal)", () => {
    const [entry] = applyQueue([rice], [update1_5], "2026-11-22");
    expect(entry).toMatchObject({ meal: "dinner", quantity: 1.5, status: "pending" });
    expect(entry!.consumed.grams).toBe(237);
    expect(entry!.consumed.calories).toBe(308.1);
  });

  it("hides deleted entries and ignores other days", () => {
    expect(applyQueue([rice, egg], [del("e-rice")], "2026-11-22").map((e) => e.id)).toEqual(["e-egg"]);
    expect(applyQueue([rice], [del("e-rice")], "2026-11-21").map((e) => e.id)).toEqual(["e-rice"]);
  });

  it("does not show an add twice once the server has the row", () => {
    expect(applyQueue([rice], [add(rice)], "2026-11-22")).toHaveLength(1);
  });
});

describe("queueDelete", () => {
  it("drops an unsent add and its edits instead of calling the server", () => {
    expect(queueDelete([add(rice), update1_5, add(egg)], del("e-rice"), null).map((o) => o.opId)).toEqual(["add-e-egg"]);
  });

  it("queues the delete when the add is already being sent", () => {
    expect(queueDelete([add(rice)], del("e-rice"), "add-e-rice").map((o) => o.opId)).toEqual(["add-e-rice", "del-e-rice"]);
  });

  it("queues the delete for a saved entry", () => {
    expect(queueDelete([], del("e-rice"), null).map((o) => o.opId)).toEqual(["del-e-rice"]);
  });
});

describe("nextToSend", () => {
  it("keeps edits to a refused add waiting with it", () => {
    expect(nextToSend([add(rice, true), update1_5, add(egg)])?.opId).toBe("add-e-egg");
  });
});

describe("shouldRetryLater", () => {
  it("retries failed fetches and expired tokens, not server refusals", () => {
    expect(shouldRetryLater(new TypeError("Failed to fetch"))).toBe(true);
    expect(shouldRetryLater({ message: "TypeError: Failed to fetch", code: "" })).toBe(true);
    expect(shouldRetryLater({ message: "serving does not belong to this food", code: "22023" })).toBe(false);
    expect(shouldRetryLater({ message: "JWT expired", code: "PGRST303" })).toBe(true);
    expect(shouldRetryLater({ message: "food not found", code: "P0002" })).toBe(false);
  });
});
