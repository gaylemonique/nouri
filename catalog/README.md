# Food catalog sources

How the numbers in `public.foods` are produced, so anyone can check or redo them.

## Where values come from

| Source | Rows | `verification_status` | `source_ref` |
| --- | --- | --- | --- |
| USDA FoodData Central, SR Legacy | plain ingredients (rice, egg, fish, fruit) | `verified` | `fdc:<id>` |
| Recipe estimate from USDA ingredients | Filipino dishes | `estimated` | `recipe:<id>` in `recipes.json` |

USDA data is public domain. DOST-FNRI's Philippine Food Composition Tables would be the better source for Filipino dishes, but the licence for using them in an app has not been confirmed. Until FNRI grants permission, no FNRI values go in.

## Recipe method

For each dish in `recipes.json`:

1. List every ingredient by raw, edible weight in grams with its SR Legacy FDC id. Bones, shells and peels are left out.
2. Add up each nutrient: grams × value per 100 g / 100.
3. If the dish pours off rendered fat, subtract `fat_removed_g` from fat and 9 kcal per gram from energy.
4. For deep-fried dishes, count only the oil the food absorbs, listed as its own ingredient.
5. Divide by `yield_g`, the weight of the finished dish, and scale to 100 g.

Water changes during cooking only change `yield_g`. Nutrient losses from heat (vitamins) are not modelled. Energy and macros barely change, and vitamins are not tracked.

Fiber and sugar: some USDA ingredients have no published value. If those ingredients hold more than 5% of the dish's carbohydrate, the dish's fiber or sugar is left `null` instead of understated. Sodium is `null` if any ingredient lacks a sodium value.

Servings come from the recipe itself: `1 serving` is yield ÷ servings, `1 piece` is yield ÷ pieces, and soups and porridges also get `1 cup` = 237 g (assumes a density of about 1 g/ml).

## Substitutions

USDA has no entry for some Filipino ingredients. Each one is named in the recipe's ingredient note:

| Ingredient | Used instead |
| --- | --- |
| Kangkong | Raw spinach |
| Oxtail | Boneless beef short rib, lean and fat |
| Bone marrow (bulalo) | Beef separable fat |
| Pork maskara (sisig) | Pork ears |
| Saba banana | Ripe plantain |
| Tablea | Unsweetened cocoa powder |

## Regenerating

```bash
# 1. extract ingredient values (only when recipes use new FDC ids)
#    download FoodData_Central_sr_legacy_food_csv_2018-04.zip from fdc.nal.usda.gov first
node catalog/extract-usda.mjs <path>/FoodData_Central_sr_legacy_food_csv_2018-04

# 2. review the computed table, then write a NEW migration
node catalog/build-recipe-foods.mjs
node catalog/build-recipe-foods.mjs supabase/migrations/<timestamp>_<name>.sql

# 3. tests for the calculator
node --test "catalog/*.test.mjs"
```

Inserts skip foods that already exist (`on conflict do nothing`), so changing a recipe that is already in the database needs a migration that updates the row, plus a version bump in `recipes.json`. Entries already logged keep their old values either way.

## Not covered yet

- Halo-halo, leche flan, ube halaya, kakanin beyond puto and bibingka: too many components without USDA equivalents.
- Packaged and restaurant foods (Jollibee and others): need brand-published data, and Open Food Facts is under ODbL, which requires share-alike for the database.
- Condiments eaten on the side, such as bagoong, are not in any dish total.
