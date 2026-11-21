-- Row Level Security and table privileges.
--
-- Start from nothing and grant only what the app needs. The anon role gets no
-- table access: every screen that reads data is behind sign-in.

revoke all on all tables in schema public from anon, authenticated;

alter table public.profiles enable row level security;
alter table public.nutrition_goals enable row level security;
alter table public.foods enable row level security;
alter table public.food_servings enable row level security;
alter table public.food_aliases enable row level security;
alter table public.food_logs enable row level security;
alter table public.food_log_items enable row level security;
alter table public.food_favorites enable row level security;

-- Profiles: created by the auth trigger, deleted with the auth user.
grant select on public.profiles to authenticated;
grant update (
  display_name, date_of_birth, height_cm, current_weight_kg, activity_level,
  tracking_objective, dietary_preference, onboarding_completed_at
) on public.profiles to authenticated;

create policy "profiles: read own" on public.profiles
  for select to authenticated
  using (id = (select auth.uid()));

create policy "profiles: update own" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));

-- Nutrition goals: the client upserts its own row.
grant select on public.nutrition_goals to authenticated;
grant insert (user_id, calorie_goal, protein_goal_g, carbohydrates_goal_g, fat_goal_g)
  on public.nutrition_goals to authenticated;
grant update (calorie_goal, protein_goal_g, carbohydrates_goal_g, fat_goal_g)
  on public.nutrition_goals to authenticated;

create policy "nutrition_goals: read own" on public.nutrition_goals
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "nutrition_goals: insert own" on public.nutrition_goals
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "nutrition_goals: update own" on public.nutrition_goals
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- Catalog: read-only for signed-in users. Writes happen in migrations or with
-- the service role.
grant select on public.foods, public.food_servings, public.food_aliases to authenticated;

create policy "foods: signed-in read" on public.foods
  for select to authenticated using (true);

create policy "food_servings: signed-in read" on public.food_servings
  for select to authenticated using (true);

create policy "food_aliases: signed-in read" on public.food_aliases
  for select to authenticated using (true);

-- Diary: read directly, write only through log_food_item,
-- update_food_log_item and delete_food_log_item, which calculate nutrients
-- on the server. No insert/update/delete grant on purpose.
grant select on public.food_logs, public.food_log_items to authenticated;

create policy "food_logs: read own" on public.food_logs
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "food_log_items: read own" on public.food_log_items
  for select to authenticated
  using (user_id = (select auth.uid()));

-- Favorites: plain add/remove, nothing to calculate.
grant select, delete on public.food_favorites to authenticated;
grant insert (user_id, food_id) on public.food_favorites to authenticated;

create policy "food_favorites: read own" on public.food_favorites
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy "food_favorites: insert own" on public.food_favorites
  for insert to authenticated
  with check (user_id = (select auth.uid()));

create policy "food_favorites: delete own" on public.food_favorites
  for delete to authenticated
  using (user_id = (select auth.uid()));
