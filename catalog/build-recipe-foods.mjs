// Turns recipes.json + usda-ingredients.json into per 100 g catalog rows and
// writes them as a Supabase migration.
//
//   node catalog/build-recipe-foods.mjs supabase/migrations/<timestamp>_filipino_recipe_foods.sql
//
// Method (see catalog/README.md):
//   dish nutrient per 100 g = (sum of ingredient grams * value / 100
//                              - removed fat) / finished weight * 100
import { readFileSync, writeFileSync } from "node:fs";
import { pathToFileURL } from "node:url";

const SOURCE_NAME = "Nouri recipe estimate (USDA SR Legacy ingredients)";
const KCAL_PER_G_FAT = 9;
// An ingredient with no published fiber or sugar value is treated as 0 when
// its share of the dish's carbohydrate is this small. Above it, the dish's
// value is left null rather than understated.
const MISSING_CARB_SHARE_LIMIT = 0.05;

const round2 = (n) => Math.round(n * 100) / 100;

// usda: { "<fdc id>": { kcal, protein_g, carbohydrates_g, fat_g, fiber_g, sugar_g, sodium_mg } }
export function computeRecipe(recipe, usda) {
  const totals = { kcal: 0, protein_g: 0, carbohydrates_g: 0, fat_g: 0, fiber_g: 0, sugar_g: 0, sodium_mg: 0 };
  const missingCarbs = { fiber_g: 0, sugar_g: 0 };
  let sodiumUnknown = false;
  let rawWeight = 0;

  for (const ing of recipe.ingredients) {
    const f = usda[String(ing.fdc)];
    if (!f) throw new Error(`${recipe.id}: fdc ${ing.fdc} missing from usda-ingredients.json`);
    const k = ing.g / 100;
    rawWeight += ing.g;
    for (const key of ["kcal", "protein_g", "carbohydrates_g", "fat_g"]) totals[key] += f[key] * k;
    for (const key of ["fiber_g", "sugar_g"]) {
      if (f[key] === null) missingCarbs[key] += f.carbohydrates_g * k;
      else totals[key] += f[key] * k;
    }
    if (f.sodium_mg === null) sodiumUnknown = true;
    else totals.sodium_mg += f.sodium_mg * k;
  }

  const fatRemoved = recipe.fat_removed_g ?? 0;
  totals.fat_g -= fatRemoved;
  totals.kcal -= fatRemoved * KCAL_PER_G_FAT;

  if (!(recipe.yield_g > 0)) throw new Error(`${recipe.id}: yield_g must be positive`);
  if (recipe.yield_g > rawWeight) throw new Error(`${recipe.id}: yield_g is more than the raw ingredients`);

  const per100 = {};
  for (const [key, value] of Object.entries(totals)) per100[key] = round2((value / recipe.yield_g) * 100);
  for (const key of ["fiber_g", "sugar_g"]) {
    if (totals.carbohydrates_g > 0 && missingCarbs[key] / totals.carbohydrates_g > MISSING_CARB_SHARE_LIMIT) {
      per100[key] = null;
    }
  }
  if (sodiumUnknown) per100.sodium_mg = null;

  if (per100.protein_g + per100.carbohydrates_g + per100.fat_g > 101) {
    throw new Error(`${recipe.id}: macros exceed 100 g per 100 g, check yield_g`);
  }
  if (per100.fat_g < 0 || per100.kcal < 0) throw new Error(`${recipe.id}: fat_removed_g is too large`);

  const servings = [];
  const pieceG = recipe.pieces ? Math.round(recipe.yield_g / recipe.pieces) : null;
  const servingG = Math.round(recipe.yield_g / recipe.servings);
  if (pieceG) servings.push({ name: "1 piece", g: pieceG, isDefault: true });
  servings.push({ name: recipe.serving_name ?? "1 serving", g: servingG, isDefault: !pieceG });
  if (recipe.cup_g) servings.push({ name: "1 cup", g: recipe.cup_g, isDefault: false });

  return { per100, servings, rawWeight };
}

const sql = (v) => (v === null || v === undefined ? "null" : typeof v === "number" ? String(v) : `'${String(v).replaceAll("'", "''")}'`);

function main(outPath) {
const here = new URL(".", import.meta.url);
const { recipes } = JSON.parse(readFileSync(new URL("recipes.json", here), "utf8"));
const { foods: usda } = JSON.parse(readFileSync(new URL("usda-ingredients.json", here), "utf8"));
const rows = recipes.map((r) => ({ recipe: r, ...computeRecipe(r, usda) }));

console.error("dish                                   kcal   prot   carb    fat  fiber  sugar  sodium  servings");
for (const { recipe, per100: p, servings } of rows) {
  console.error(
    `${recipe.id.padEnd(36)} ${String(p.kcal).padStart(6)} ${String(p.protein_g).padStart(6)} ${String(p.carbohydrates_g).padStart(6)} ${String(p.fat_g).padStart(6)} ${String(p.fiber_g).padStart(6)} ${String(p.sugar_g).padStart(6)} ${String(p.sodium_mg).padStart(7)}  ${servings.map((s) => `${s.name}=${s.g}g`).join(", ")}`,
  );
}

if (outPath) {
  const foodValues = rows
    .map(({ recipe: r, per100: p }) =>
      `    (${[
        sql(`recipe:${r.id}`), sql(r.name),
        sql(`${r.description} Estimated from a home recipe, v${r.version}: ${r.assumptions}`),
        p.kcal, p.protein_g, p.carbohydrates_g, p.fat_g, sql(p.fiber_g), sql(p.sugar_g), sql(p.sodium_mg),
      ].join(", ")})`)
    .join(",\n");
  const servingValues = rows
    .flatMap(({ recipe: r, servings }) =>
      servings.map((s, i) => `    (${[sql(`recipe:${r.id}`), sql(s.name), s.g, s.isDefault, i].join(", ")})`))
    .join(",\n");
  const aliasValues = rows
    .flatMap(({ recipe: r }) => r.aliases.map((a) => `    (${sql(`recipe:${r.id}`)}, ${sql(a)})`))
    .join(",\n");

  const migration = `-- Filipino dishes as recipe estimates.
-- Generated by catalog/build-recipe-foods.mjs from catalog/recipes.json and
-- catalog/usda-ingredients.json. Do not edit by hand: change the recipe and
-- regenerate into a new migration.
--
-- Each dish is the sum of its USDA SR Legacy ingredients (public domain)
-- divided by the finished weight, so every row is 'estimated', never
-- 'verified'. source_ref = 'recipe:<id>' points at the recipe in the repo.

with src (source_ref, name, description, kcal, protein, carbs, fat, fiber, sugar, sodium) as (
  values
${foodValues}
),
inserted as (
  insert into public.foods (
    name, description, category, calories_per_100g, protein_per_100g,
    carbohydrates_per_100g, fat_per_100g, fiber_per_100g, sugar_per_100g,
    sodium_mg_per_100g, source_name, source_ref, verification_status
  )
  select
    name, description, 'filipino_dish', kcal, protein, carbs, fat,
    fiber::numeric, sugar::numeric, sodium::numeric,
    ${sql(SOURCE_NAME)}, source_ref, 'estimated'
  from src
  on conflict (source_name, source_ref) do nothing
  returning id, source_ref
),
servings (source_ref, serving_name, grams, is_default, sort_order) as (
  values
${servingValues}
),
aliases (source_ref, alias) as (
  values
${aliasValues}
),
serving_rows as (
  insert into public.food_servings (food_id, serving_name, weight_grams, is_default, sort_order)
  select i.id, s.serving_name, s.grams, s.is_default, s.sort_order
  from servings s
  join inserted i on i.source_ref = s.source_ref
  returning 1
)
insert into public.food_aliases (food_id, alias)
select i.id, a.alias
from aliases a
join inserted i on i.source_ref = a.source_ref;
`;
  writeFileSync(outPath, migration);
  console.error(`\nwrote ${outPath}: ${rows.length} dishes`);
}
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main(process.argv[2]);
}
