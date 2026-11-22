-- Checks for delete_my_account: the caller's account and everything they own
-- goes, another user's data and the catalog stay, anon cannot call it.
--
-- Runs inside one transaction and rolls back. Any failed check aborts the run.
--
--   npx supabase db query --remote --yes -f supabase/tests/account_checks.sql

begin;

insert into auth.users (id, email, aud, role)
values
  ('00000000-0000-4000-a000-0000000000d1', 'checks-d1@nouri.invalid', 'authenticated', 'authenticated'),
  ('00000000-0000-4000-a000-0000000000d2', 'checks-d2@nouri.invalid', 'authenticated', 'authenticated');

create temp table ids on commit drop as
select
  (select count(*) from public.foods) as foods_before,
  (select id from public.foods where source_ref = 'fdc:169757') as rice,
  (select s.id from public.food_servings s join public.foods f on f.id = s.food_id
    where f.source_ref = 'fdc:169757' and s.serving_name = '1 cup') as rice_cup;
grant select on ids to authenticated, anon;

-- Each user logs a meal and saves goals.
set local role authenticated;
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-0000000000d1","role":"authenticated"}';
do $$
declare v record;
begin
  select * into v from ids;
  perform public.log_food_item('00000000-0000-4000-b000-0000000000d1', current_date, 'lunch', v.rice, 1, v.rice_cup);
  insert into public.nutrition_goals (calorie_goal) values (1800);
end $$;

set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-0000000000d2","role":"authenticated"}';
do $$
declare v record;
begin
  select * into v from ids;
  perform public.log_food_item('00000000-0000-4000-b000-0000000000d2', current_date, 'lunch', v.rice, 2, v.rice_cup);
  insert into public.nutrition_goals (calorie_goal) values (2200);
end $$;

-- User d1 deletes their account.
set local request.jwt.claims to '{"sub":"00000000-0000-4000-a000-0000000000d1","role":"authenticated"}';
select public.delete_my_account();

reset role;
do $$
begin
  assert not exists (select 1 from auth.users where id = '00000000-0000-4000-a000-0000000000d1'), 'account deleted';
  assert not exists (select 1 from public.profiles where id = '00000000-0000-4000-a000-0000000000d1'), 'profile deleted';
  assert not exists (select 1 from public.nutrition_goals where user_id = '00000000-0000-4000-a000-0000000000d1'), 'goals deleted';
  assert not exists (select 1 from public.food_logs where user_id = '00000000-0000-4000-a000-0000000000d1'), 'diary days deleted';
  assert not exists (select 1 from public.food_log_items where user_id = '00000000-0000-4000-a000-0000000000d1'), 'entries deleted';

  assert exists (select 1 from auth.users where id = '00000000-0000-4000-a000-0000000000d2'), 'other account kept';
  assert (select count(*) from public.food_log_items where user_id = '00000000-0000-4000-a000-0000000000d2') = 1, 'other diary kept';
  assert exists (select 1 from public.nutrition_goals where user_id = '00000000-0000-4000-a000-0000000000d2'), 'other goals kept';
  assert (select count(*) from public.foods) = (select foods_before from ids), 'catalog untouched';
end $$;

-- anon cannot call it at all.
set local role anon;
do $$
begin
  begin
    perform public.delete_my_account();
    raise exception 'anon should not call delete_my_account';
  exception when insufficient_privilege then null;
  end;
end $$;

rollback;
