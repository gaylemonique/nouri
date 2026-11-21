"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { TextField } from "@/components/ui/text-field";
import { macroGramsFromCalories } from "@/domain/goals/macro-split";
import type { GoalsInput } from "@/services/repositories/profile-repository";

const kcal = z
  .string()
  .trim()
  .refine((v) => /^\d+$/.test(v) && Number(v) >= 500 && Number(v) <= 10000, "Enter whole kcal between 500 and 10,000.");

// Same upper limits as the check constraints on nutrition_goals.
const grams = (max: number) =>
  z
    .string()
    .trim()
    .refine((v) => v === "" || (/^\d+(\.\d)?$/.test(v) && Number(v) <= max), `Leave empty or enter up to ${max} g.`);

const schema = z.object({
  displayName: z.string().trim().max(80, "Keep it under 80 characters."),
  calories: kcal,
  protein: grams(1000),
  carbs: grams(1500),
  fat: grams(1000),
});
type Values = z.infer<typeof schema>;

export type GoalsFormResult = { displayName: string | null; goals: GoalsInput };

const toField = (n: number | null | undefined) => (n === null || n === undefined ? "" : String(n));
const toNumber = (v: string) => (v === "" ? null : Number(v));

export function GoalsForm({
  initial,
  initialName,
  askName = false,
  submitLabel,
  submitError,
  onSubmit,
}: {
  initial: GoalsInput | null;
  initialName?: string | null;
  askName?: boolean;
  submitLabel: string;
  submitError?: string | null;
  onSubmit: (result: GoalsFormResult) => Promise<unknown>;
}) {
  const {
    register,
    handleSubmit,
    getValues,
    setValue,
    trigger,
    formState: { errors, isSubmitting },
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      displayName: initialName ?? "",
      calories: toField(initial?.calorie_goal),
      protein: toField(initial?.protein_goal_g),
      carbs: toField(initial?.carbohydrates_goal_g),
      fat: toField(initial?.fat_goal_g),
    },
  });

  const fillFromCalories = async () => {
    if (!(await trigger("calories"))) return;
    const g = macroGramsFromCalories(Number(getValues("calories")));
    setValue("protein", String(g.protein_g), { shouldValidate: true });
    setValue("carbs", String(g.carbohydrates_g), { shouldValidate: true });
    setValue("fat", String(g.fat_g), { shouldValidate: true });
  };

  const submit = handleSubmit((v) =>
    onSubmit({
      displayName: v.displayName === "" ? null : v.displayName,
      goals: {
        calorie_goal: Number(v.calories),
        protein_goal_g: toNumber(v.protein),
        carbohydrates_goal_g: toNumber(v.carbs),
        fat_goal_g: toNumber(v.fat),
      },
    }),
  );

  return (
    <form onSubmit={submit} noValidate className="space-y-6">
      {askName ? (
        <TextField
          label="Your name"
          hint="Optional. Shown on your profile."
          autoComplete="given-name"
          error={errors.displayName?.message}
          {...register("displayName")}
        />
      ) : null}

      <TextField
        label="Calories per day"
        inputMode="numeric"
        suffix="kcal"
        className="max-w-56"
        error={errors.calories?.message}
        {...register("calories")}
      />

      <fieldset className="space-y-3">
        <legend className="text-sm font-medium">Protein, carbs and fat</legend>
        <p className="text-sm text-ink-muted">
          Optional. Leave a box empty to track it without a target.{" "}
          <button type="button" onClick={fillFromCalories} className="font-medium text-accent underline-offset-2 hover:underline">
            Fill from calories
          </button>{" "}
          uses 25% protein, 50% carbs and 25% fat as a starting point.
        </p>
        <div className="grid grid-cols-3 gap-2">
          <TextField label="Protein" inputMode="decimal" suffix="g" error={errors.protein?.message} {...register("protein")} />
          <TextField label="Carbs" inputMode="decimal" suffix="g" error={errors.carbs?.message} {...register("carbs")} />
          <TextField label="Fat" inputMode="decimal" suffix="g" error={errors.fat?.message} {...register("fat")} />
        </div>
      </fieldset>

      {submitError ? (
        <p role="alert" className="rounded-lg border border-ink px-3 py-2 text-sm">
          {submitError}
        </p>
      ) : null}

      <button
        type="submit"
        disabled={isSubmitting}
        className="h-12 w-full rounded-lg bg-accent font-semibold text-accent-ink disabled:opacity-60"
      >
        {isSubmitting ? "Saving…" : submitLabel}
      </button>
    </form>
  );
}
