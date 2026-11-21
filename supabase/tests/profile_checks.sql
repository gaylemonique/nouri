-- Checks for what onboarding and the Profile screen write: profiles and
-- nutrition_goals, through the same statements PostgREST runs.
--
-- Runs inside one transaction and rolls back. Any failed check aborts the run.
--
--   npx supabase db query --remote --yes -f supabase/tests/profile_checks.sql

begin;

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000c1', 'checks-c1@nouri.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000c2', 'checks-c2@nouri.invalid', 'authenticated', 'authenticated');

set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-0000000000c1","role":"authenticated"}';

do $$
declare
  g public.nutrition_goals;
begin
  -- Onboarding: name and completion time on the profile the auth trigger made.
  update public.profiles
     set display_name = 'Checks', onboarding_completed_at = now()
   where id = '00000000-0000-4000-a000-0000000000c1';
  assert found, 'user can update own profile';

  -- Upsert without user_id, as supabase-js upsert({ ... }, { onConflict: 'user_id' }) sends it.
  insert into public.nutrition_goals (calorie_goal, protein_goal_g, carbohydrates_goal_g, fat_goal_g)
  values (1800, 110, 200, 60)
  on conflict (user_id) do update
    set calorie_goal = excluded.calorie_goal,
        protein_goal_g = excluded.protein_goal_g,
        carbohydrates_goal_g = excluded.carbohydrates_goal_g,
        fat_goal_g = excluded.fat_goal_g
  returning * into g;
  assert g.user_id = '00000000-0000-4000-a000-0000000000c1', 'user_id defaults to the caller';
  assert g.calorie_goal = 1800, 'first save inserts';

  -- Second save updates the same row; macros may be cleared.
  insert into public.nutrition_goals (calorie_goal, protein_goal_g, carbohydrates_goal_g, fat_goal_g)
  values (2100, null, null, null)
  on conflict (user_id) do update
    set calorie_goal = excluded.calorie_goal,
        protein_goal_g = excluded.protein_goal_g,
        carbohydrates_goal_g = excluded.carbohydrates_goal_g,
        fat_goal_g = excluded.fat_goal_g
  returning * into g;
  assert g.calorie_goal = 2100 and g.protein_goal_g is null, 'second save updates';
  assert (select count(*) from public.nutrition_goals) = 1, 'one goals row per user';

  -- Out-of-range targets are rejected by the check constraint.
  begin
    insert into public.nutrition_goals (calorie_goal) values (0)
    on conflict (user_id) do update set calorie_goal = excluded.calorie_goal;
    raise exception 'calorie_goal 0 should fail';
  exception when check_violation then null;
  end;

  -- Writing goals for someone else fails RLS.
  begin
    insert into public.nutrition_goals (user_id, calorie_goal)
    values ('00000000-0000-4000-a000-0000000000c2', 1500);
    raise exception 'insert for another user should fail';
  exception when insufficient_privilege then null;
  end;

  -- user_id cannot be changed after insert (no column grant).
  begin
    update public.nutrition_goals set user_id = '00000000-0000-4000-a000-0000000000c2';
    raise exception 'updating user_id should fail';
  exception when insufficient_privilege then null;
  end;
end $$;

-- The other user sees neither the profile nor the goals.
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-0000000000c2","role":"authenticated"}';

do $$
begin
  assert (select count(*) from public.nutrition_goals) = 0, 'goals are private';
  assert (select count(*) from public.profiles) = 1, 'only own profile is visible';
  update public.profiles set display_name = 'Hijack' where id = '00000000-0000-4000-a000-0000000000c1';
  assert not found, 'cannot update another profile';
end $$;

rollback;
