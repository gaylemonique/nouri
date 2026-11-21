-- Checks for the food catalog: provenance rules, servings, search, and that
-- the recipe rows log through the nutrition engine correctly.
--
--   npx supabase db query --remote --yes -f supabase/tests/catalog_checks.sql
--
-- Runs in one transaction and rolls back.

begin;

-- Provenance and shape --------------------------------------------------------
do $$
declare
  v_recipe_source constant text := 'Nouri recipe estimate (USDA SR Legacy ingredients)';
begin
  assert (select count(*) from public.foods where source_name = v_recipe_source) = 24,
    'expected 24 recipe dishes';
  assert not exists (
      select 1 from public.foods
       where source_name = v_recipe_source and verification_status <> 'estimated'),
    'recipe dishes must be estimated, never verified';
  assert not exists (
      select 1 from public.foods
       where source_name = v_recipe_source and (source_ref is null or source_ref not like 'recipe:%')),
    'recipe dishes must point at their recipe';
  assert not exists (
      select 1 from public.foods
       where verification_status = 'verified' and source_ref is null),
    'verified foods need a source record';

  -- Every food has exactly one default serving.
  assert not exists (
      select 1 from public.foods f
       where (select count(*) from public.food_servings s where s.food_id = f.id and s.is_default) <> 1),
    'each food needs exactly one default serving';

  -- Every recipe dish can be found by at least one alias.
  assert not exists (
      select 1 from public.foods f
       where f.source_name = v_recipe_source
         and not exists (select 1 from public.food_aliases a where a.food_id = f.id)),
    'each recipe dish needs aliases';
end $$;

-- Search and logging as a signed-in user ---------------------------------------
insert into auth.users (id, email, aud, role)
values ('00000000-0000-4000-a000-0000000000c1', 'checks-catalog@nouri.invalid', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-0000000000c1","role":"authenticated"}';

do $$
declare
  v_food uuid;
  v_piece uuid;
  r public.food_log_items;
begin
  assert (select count(*) from public.search_foods('sinigang')) >= 2, 'search: sinigang finds both';
  assert exists (select 1 from public.search_foods('sinigan') where source_ref = 'recipe:sinigang-na-baboy'),
    'search: typo sinigan';
  assert exists (select 1 from public.search_foods('adobong manok') where source_ref = 'recipe:chicken-adobo'),
    'search: Tagalog alias';
  assert (select count(*) from public.search_foods('adobo') where source_ref like 'recipe:%adobo') = 2,
    'search: adobo finds pork and chicken';
  assert exists (select 1 from public.search_foods('lumpia') where source_ref = 'recipe:lumpiang-shanghai'),
    'search: lumpia';
  assert exists (select 1 from public.search_foods('pan de sal') where source_ref = 'recipe:pandesal'),
    'search: pan de sal';

  -- One pandesal: 35 g piece at 330.47 kcal per 100 g = 115.66 kcal.
  select f.id, s.id into v_food, v_piece
    from public.foods f
    join public.food_servings s on s.food_id = f.id and s.serving_name = '1 piece'
   where f.source_ref = 'recipe:pandesal';
  r := public.log_food_item(gen_random_uuid(), current_date, 'breakfast', v_food, 2, v_piece);
  assert r.total_weight_grams = 70, format('pandesal grams: %s', r.total_weight_grams);
  assert r.calories = 231.33, format('2 pandesal kcal: %s', r.calories);
  assert r.fiber_g is not null, 'pandesal has fiber';

  -- Sinigang has unknown fiber (yardlong beans have no USDA value): the entry
  -- keeps it null instead of pretending zero.
  select f.id into v_food from public.foods f where f.source_ref = 'recipe:sinigang-na-baboy';
  r := public.log_food_item(gen_random_uuid(), current_date, 'lunch', v_food, 1, null, 450);
  assert r.fiber_g is null, 'unknown fiber stays null';
  assert r.calories = 390.11, format('450 g sinigang kcal: %s', r.calories);
end $$;

reset role;
select 'all catalog checks passed' as result;

rollback;
