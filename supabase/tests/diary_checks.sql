-- End-to-end checks for RLS, grants and the nutrition engine.
--
-- Runs inside one transaction and rolls back, so it leaves nothing behind.
-- Any failed check raises and aborts the run.
--
--   npx supabase db query --remote --yes -f supabase/tests/diary_checks.sql
--
-- Expected numbers are worked out by hand from the USDA reference rows:
--   white rice 130 kcal / 2.69 g protein per 100 g, 1 cup = 158 g
--   chicken breast 165 kcal per 100 g

begin;

-- Two throwaway users. The auth trigger should give each a profile.
insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-00000000000a', 'checks-a@nouri.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-00000000000b', 'checks-b@nouri.invalid', 'authenticated', 'authenticated');

create temp table ids on commit drop as
select
  (select id from public.foods where source_ref = 'fdc:169757') as rice,
  (select s.id from public.food_servings s join public.foods f on f.id = s.food_id
    where f.source_ref = 'fdc:169757' and s.serving_name = '1 cup') as rice_cup,
  (select id from public.foods where source_ref = 'fdc:171477') as chicken,
  (select s.id from public.food_servings s join public.foods f on f.id = s.food_id
    where f.source_ref = 'fdc:171477' and s.is_default) as chicken_default;
grant select on ids to authenticated, anon;

do $$
begin
  assert (select count(*) from public.profiles
           where id in ('00000000-0000-4000-a000-00000000000a', '00000000-0000-4000-a000-00000000000b')) = 2,
    'auth trigger should create a profile per user';
  assert (select rice is not null and rice_cup is not null and chicken is not null from ids),
    'reference foods should be seeded';
end $$;

-- User A ----------------------------------------------------------------------
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';

do $$
declare
  r public.food_log_items;
  v_ids record;
begin
  select * into v_ids from ids;

  -- 1.5 cups of rice: 158 * 1.5 = 237 g; 130 * 237 / 100 = 308.10 kcal; 2.69 * 237 / 100 = 6.3753 -> 6.38 g
  r := public.log_food_item('00000000-0000-4000-b000-000000000001', current_date, 'lunch', v_ids.rice, 1.5, v_ids.rice_cup);
  assert r.total_weight_grams = 237, format('rice grams: got %s', r.total_weight_grams);
  assert r.calories = 308.10, format('rice kcal: got %s', r.calories);
  assert r.protein_g = 6.38, format('rice protein: got %s', r.protein_g);
  assert r.serving_name_snapshot = '1 cup', 'serving name snapshot';
  assert r.food_name_snapshot = 'White rice, cooked', 'food name snapshot';

  -- Replaying the same id returns the same row and adds nothing.
  r := public.log_food_item('00000000-0000-4000-b000-000000000001', current_date, 'lunch', v_ids.rice, 1.5, v_ids.rice_cup);
  assert (select count(*) from public.food_log_items) = 1, 'replay must not duplicate';

  -- Custom grams: 200 g chicken breast = 330 kcal.
  r := public.log_food_item('00000000-0000-4000-b000-000000000002', current_date, 'dinner', v_ids.chicken, 1, null, 200);
  assert r.calories = 330, format('chicken kcal: got %s', r.calories);
  assert r.food_serving_id is null and r.serving_name_snapshot is null, 'custom grams has no named serving';

  -- Edit quantity to 2 cups: 316 g -> 410.80 kcal.
  r := public.update_food_log_item('00000000-0000-4000-b000-000000000001', p_quantity => 2);
  assert r.calories = 410.80, format('edited rice kcal: got %s', r.calories);
  assert r.meal_type = 'lunch', 'meal kept when not passed';
end $$;

-- Bad input is rejected with the expected error codes.
do $$
declare
  v_ids record;
  v_state text;
begin
  select * into v_ids from ids;

  begin
    insert into public.food_log_items (id, food_log_id, user_id, meal_type, food_name_snapshot,
      serving_weight_grams, quantity, nutrients_per_100g, calories, protein_g, carbohydrates_g, fat_g)
    values (gen_random_uuid(), gen_random_uuid(), (select auth.uid()), 'lunch', 'fake', 100, 1, '{}', 1, 0, 0, 0);
    raise exception 'direct insert into food_log_items should be denied';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.log_food_item(gen_random_uuid(), current_date, 'lunch', v_ids.rice, 1, v_ids.chicken_default);
    raise exception 'serving from another food should be rejected';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    assert v_state = '22023', format('foreign serving: sqlstate %s', v_state);
  end;

  begin
    perform public.log_food_item(gen_random_uuid(), current_date, 'lunch', v_ids.rice, 1, v_ids.rice_cup, 100);
    raise exception 'serving and grams together should be rejected';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    assert v_state = '22023', format('serving + grams: sqlstate %s', v_state);
  end;

  begin
    perform public.log_food_item(gen_random_uuid(), current_date, 'brunch', v_ids.rice, 1, v_ids.rice_cup);
    raise exception 'unknown meal type should be rejected';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    assert v_state = '22023', format('meal type: sqlstate %s', v_state);
  end;

  begin
    perform public.log_food_item(gen_random_uuid(), current_date, 'lunch', v_ids.rice, 0, v_ids.rice_cup);
    raise exception 'zero quantity should be rejected';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    assert v_state = '22023', format('quantity: sqlstate %s', v_state);
  end;

  begin
    perform public.log_food_item(gen_random_uuid(), current_date + 5, 'lunch', v_ids.rice, 1, v_ids.rice_cup);
    raise exception 'future date should be rejected';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    assert v_state = '22023', format('future date: sqlstate %s', v_state);
  end;
end $$;

-- Totals, search, recent foods for A.
do $$
declare
  t record;
begin
  assert (select count(*) from public.daily_nutrition_totals(current_date - 2, current_date)) = 3,
    'one row per day including empty days';
  select * into t from public.daily_nutrition_totals(current_date, current_date);
  assert t.calories = 740.80 and t.item_count = 2, format('today totals: %s kcal, %s items', t.calories, t.item_count);
  select * into t from public.daily_nutrition_totals(current_date - 1, current_date - 1);
  assert t.calories = 0 and t.item_count = 0, 'empty day is zero';

  assert exists (select 1 from public.search_foods('bangus') where source_ref = 'fdc:173675'), 'alias search: bangus';
  assert exists (select 1 from public.search_foods('mangoo') where source_ref = 'fdc:169910'), 'typo search: mangoo';
  assert exists (select 1 from public.search_foods('RICE') where source_ref = 'fdc:169757'), 'case-insensitive search';
  assert not exists (select 1 from public.search_foods('   ')), 'blank query returns nothing';
  assert not exists (select 1 from public.search_foods('100%_')), 'wildcards in the query are literal';

  assert (select count(*) from public.recent_foods()) = 2, 'recent foods';
end $$;

-- Catalog edits must not touch logged history.
reset role;
update public.foods set calories_per_100g = 999 where source_ref = 'fdc:169757';
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';

do $$
declare
  r public.food_log_items;
begin
  r := public.update_food_log_item('00000000-0000-4000-b000-000000000001', p_meal_type => 'breakfast');
  assert r.calories = 410.80, format('snapshot should survive catalog edit: got %s', r.calories);
end $$;

-- User B: cannot see or change anything of A's ---------------------------------
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-00000000000b","role":"authenticated"}';

do $$
declare
  v_state text;
  v_ids record;
begin
  select * into v_ids from ids;

  assert (select count(*) from public.food_log_items) = 0, 'B sees none of A''s items';
  assert (select count(*) from public.food_logs) = 0, 'B sees none of A''s logs';
  assert (select count(*) from public.profiles) = 1, 'B sees only their own profile';
  assert (select calories from public.daily_nutrition_totals(current_date, current_date)) = 0, 'B totals are empty';
  assert (select count(*) from public.recent_foods()) = 0, 'B has no recent foods';

  assert public.delete_food_log_item('00000000-0000-4000-b000-000000000001') = false, 'B cannot delete A''s item';

  begin
    perform public.update_food_log_item('00000000-0000-4000-b000-000000000001', p_quantity => 9);
    raise exception 'B should not update A''s item';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    assert v_state = 'P0002', format('cross-user update: sqlstate %s', v_state);
  end;

  begin
    perform public.log_food_item('00000000-0000-4000-b000-000000000001', current_date, 'lunch', v_ids.rice, 1, v_ids.rice_cup);
    raise exception 'B should not reuse A''s entry id';
  exception when others then
    get stacked diagnostics v_state = returned_sqlstate;
    assert v_state = '23505', format('id reuse: sqlstate %s', v_state);
  end;

  begin
    insert into public.nutrition_goals (user_id, calorie_goal)
    values ('00000000-0000-4000-a000-00000000000a', 2000);
    raise exception 'B should not write A''s goals';
  exception when insufficient_privilege then null;
  end;

  insert into public.nutrition_goals (user_id, calorie_goal, protein_goal_g)
  values ('00000000-0000-4000-a000-00000000000b', 1800, 90);
  assert (select count(*) from public.nutrition_goals) = 1, 'B can set own goals';

  insert into public.food_favorites (user_id, food_id) values ((select auth.uid()), v_ids.rice);
  assert (select count(*) from public.food_favorites) = 1, 'B can favorite a food';
end $$;

-- Back to A: delete is idempotent.
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-00000000000a","role":"authenticated"}';

do $$
begin
  assert (select count(*) from public.food_favorites) = 0, 'A does not see B''s favorites';
  assert public.delete_food_log_item('00000000-0000-4000-b000-000000000002') = true, 'A deletes own item';
  assert public.delete_food_log_item('00000000-0000-4000-b000-000000000002') = false, 'second delete is a no-op';
end $$;

-- Anonymous callers get nothing.
set local role anon;

do $$
begin
  begin
    perform 1 from public.foods limit 1;
    raise exception 'anon should not read the catalog';
  exception when insufficient_privilege then null;
  end;

  begin
    perform public.search_foods('rice');
    raise exception 'anon should not call search_foods';
  exception when insufficient_privilege then null;
  end;
end $$;

reset role;
select 'all diary checks passed' as result;

rollback;
