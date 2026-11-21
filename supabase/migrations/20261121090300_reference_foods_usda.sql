-- First reference foods: staples common in Filipino meals, taken from USDA
-- FoodData Central, SR Legacy (public domain). Values are per 100 g exactly as
-- published; source_ref holds the FDC id so each row can be checked at
-- https://fdc.nal.usda.gov/food-details/<id>/nutrients.
-- Serving weights are the gram weights USDA publishes for each food.
-- Milkfish has no published sugar value, so it stays null.
--
-- Filipino dishes (sinigang, adobo, kare-kare...) are not here on purpose.
-- They need FNRI or recipe-based values and a licence check (phase 04).

with src (fdc_id, name, category, kcal, protein, carbs, fat, fiber, sugar, sodium) as (
  values
    ('169757', 'White rice, cooked',                 'rice_and_grains',  130, 2.69, 28.2, 0.28, 0.4, 0.05,   1),
    ('169704', 'Brown rice, cooked',                 'rice_and_grains',  123, 2.74, 25.6, 0.97, 1.6, 0.24,   4),
    ('173424', 'Egg, hard-boiled',                   'eggs_and_dairy',   155, 12.6, 1.12, 10.6, 0,   1.12, 124),
    ('171477', 'Chicken breast, roasted, no skin',   'meat_and_poultry', 165, 31,   0,    3.57, 0,   0,     74),
    ('173625', 'Chicken thigh, roasted, with skin',  'meat_and_poultry', 232, 23.3, 0,    14.7, 0,   0,    102),
    ('167812', 'Pork belly, raw',                    'meat_and_poultry', 518, 9.34, 0,    53,   0,   0,     32),
    ('173675', 'Milkfish, raw',                      'seafood',          148, 20.5, 0,    6.73, 0,   null,  72),
    ('175177', 'Tilapia, cooked',                    'seafood',          128, 26.2, 0,    2.65, 0,   0,     56),
    ('173944', 'Banana, raw',                        'fruits',            89, 1.09, 22.8, 0.33, 2.6, 12.2,   1),
    ('169910', 'Mango, raw',                         'fruits',            60, 0.82, 15,   0.38, 1.6, 13.7,   1)
),
inserted as (
  insert into public.foods (
    name, category, calories_per_100g, protein_per_100g, carbohydrates_per_100g,
    fat_per_100g, fiber_per_100g, sugar_per_100g, sodium_mg_per_100g,
    source_name, source_ref, verification_status
  )
  select
    name, category, kcal, protein, carbs, fat, fiber, sugar, sodium,
    'USDA FoodData Central (SR Legacy)', 'fdc:' || fdc_id, 'verified'
  from src
  on conflict (source_name, source_ref) do nothing
  returning id, source_ref
),
servings (fdc_id, serving_name, grams, is_default, sort_order) as (
  values
    ('169757', '1 cup',                     158,   true,  0),
    ('169704', '1 cup',                     202,   true,  0),
    ('173424', '1 large egg',                50,   true,  0),
    ('173424', '1 cup, chopped',            136,   false, 1),
    ('171477', '1/2 breast',                 86,   true,  0),
    ('171477', '1 cup, diced',              140,   false, 1),
    ('173625', '1 thigh',                   137,   true,  0),
    ('173625', '3 oz',                       85,   false, 1),
    ('167812', '4 oz',                      113,   true,  0),
    ('173675', '3 oz',                       85,   true,  0),
    ('175177', '1 fillet',                   87,   true,  0),
    ('173944', '1 medium (7 to 7 7/8 in)',  118,   true,  0),
    ('173944', '1 small (6 to 6 7/8 in)',   101,   false, 1),
    ('173944', '1 large (8 to 8 7/8 in)',   136,   false, 2),
    ('173944', '1 cup, sliced',             150,   false, 3),
    ('169910', '1 cup, pieces',             165,   true,  0),
    ('169910', '1 whole mango, no peel or seed', 336, false, 1)
),
aliases (fdc_id, alias) as (
  values
    ('169757', 'kanin'),
    ('169757', 'steamed rice'),
    ('169757', 'plain rice'),
    ('169704', 'brown kanin'),
    ('173424', 'nilagang itlog'),
    ('173424', 'boiled egg'),
    ('171477', 'pitso ng manok'),
    ('173625', 'hita ng manok'),
    ('167812', 'liempo'),
    ('173675', 'bangus'),
    ('175177', 'tilapya'),
    ('173944', 'saging'),
    ('169910', 'mangga')
),
serving_rows as (
  insert into public.food_servings (food_id, serving_name, weight_grams, is_default, sort_order)
  select i.id, s.serving_name, s.grams, s.is_default, s.sort_order
  from servings s
  join inserted i on i.source_ref = 'fdc:' || s.fdc_id
  returning 1
)
insert into public.food_aliases (food_id, alias)
select i.id, a.alias
from aliases a
join inserted i on i.source_ref = 'fdc:' || a.fdc_id;
