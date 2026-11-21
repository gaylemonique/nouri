-- Core schema: profiles, goals, food catalog, diary.
-- Units: energy kcal, macros g, sodium mg. Catalog nutrients are per 100 g.

create extension if not exists pg_trgm with schema extensions;

-- Internal helpers live outside the API-exposed public schema.
create schema if not exists private;
revoke all on schema private from public, anon, authenticated;

create function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Profiles ------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text check (char_length(display_name) between 1 and 80),
  date_of_birth date check (date_of_birth > date '1900-01-01'),
  height_cm numeric(5, 1) check (height_cm between 50 and 275),
  current_weight_kg numeric(5, 1) check (current_weight_kg between 20 and 500),
  activity_level text check (
    activity_level in ('sedentary', 'light', 'moderate', 'active', 'very_active')
  ),
  tracking_objective text check (
    tracking_objective in ('lose_weight', 'maintain_weight', 'gain_weight', 'track_only')
  ),
  dietary_preference text check (
    dietary_preference in ('none', 'vegetarian', 'vegan', 'pescatarian', 'halal', 'other')
  ),
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
before update on public.profiles
for each row execute function private.set_updated_at();

-- Nutrition goals (one row per user) ----------------------------------------

create table public.nutrition_goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references auth.users (id) on delete cascade,
  calorie_goal numeric(6, 0) not null check (calorie_goal between 1 and 10000),
  protein_goal_g numeric(6, 1) check (protein_goal_g between 0 and 1000),
  carbohydrates_goal_g numeric(6, 1) check (carbohydrates_goal_g between 0 and 1500),
  fat_goal_g numeric(6, 1) check (fat_goal_g between 0 and 1000),
  updated_at timestamptz not null default now()
);

create trigger nutrition_goals_set_updated_at
before update on public.nutrition_goals
for each row execute function private.set_updated_at();

-- Food catalog --------------------------------------------------------------

create table public.foods (
  id uuid primary key default gen_random_uuid(),
  name text not null check (char_length(name) between 1 and 200),
  description text,
  category text not null check (
    category in (
      'filipino_dish', 'rice_and_grains', 'meat_and_poultry', 'seafood',
      'eggs_and_dairy', 'vegetables', 'fruits', 'condiments_and_sauces',
      'snacks', 'desserts', 'beverages', 'packaged_food'
    )
  ),
  brand text,
  calories_per_100g numeric(7, 2) not null check (calories_per_100g between 0 and 1000),
  protein_per_100g numeric(6, 2) not null check (protein_per_100g between 0 and 100),
  carbohydrates_per_100g numeric(6, 2) not null check (carbohydrates_per_100g between 0 and 100),
  fat_per_100g numeric(6, 2) not null check (fat_per_100g between 0 and 100),
  -- Optional nutrients stay null when the source has no value. Null is not zero.
  fiber_per_100g numeric(6, 2) check (fiber_per_100g between 0 and 100),
  sugar_per_100g numeric(6, 2) check (sugar_per_100g between 0 and 100),
  sodium_mg_per_100g numeric(8, 2) check (sodium_mg_per_100g between 0 and 40000),
  source_name text not null check (char_length(source_name) between 1 and 200),
  source_ref text,
  verification_status text not null default 'unverified' check (
    verification_status in ('verified', 'estimated', 'unverified')
  ),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint foods_macros_fit_100g
    check (protein_per_100g + carbohydrates_per_100g + fat_per_100g <= 101),
  -- A food can only be "verified" if it points at a specific source record.
  constraint foods_verified_needs_source_ref
    check (verification_status <> 'verified' or source_ref is not null),
  constraint foods_source_record_unique unique (source_name, source_ref)
);

create index foods_name_trgm_idx on public.foods using gin (name extensions.gin_trgm_ops);
create index foods_category_idx on public.foods (category);

create trigger foods_set_updated_at
before update on public.foods
for each row execute function private.set_updated_at();

create table public.food_servings (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  serving_name text not null check (char_length(serving_name) between 1 and 80),
  weight_grams numeric(7, 2) not null check (weight_grams > 0 and weight_grams <= 5000),
  is_default boolean not null default false,
  sort_order smallint not null default 0,
  constraint food_servings_name_unique unique (food_id, serving_name),
  -- Target for the composite FK on food_log_items, so a logged serving
  -- must belong to the logged food.
  constraint food_servings_id_food_unique unique (id, food_id)
);

create unique index food_servings_one_default_idx
  on public.food_servings (food_id) where is_default;

create table public.food_aliases (
  id uuid primary key default gen_random_uuid(),
  food_id uuid not null references public.foods (id) on delete cascade,
  alias text not null check (char_length(alias) between 1 and 200)
);

create unique index food_aliases_food_alias_idx on public.food_aliases (food_id, lower(alias));
create index food_aliases_alias_trgm_idx on public.food_aliases using gin (alias extensions.gin_trgm_ops);

-- Diary ---------------------------------------------------------------------

-- One diary per user per local calendar date. The client sends the date as
-- the user sees it; the server never derives it from a UTC timestamp.
create table public.food_logs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  log_date date not null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_logs_user_date_unique unique (user_id, log_date)
);

create trigger food_logs_set_updated_at
before update on public.food_logs
for each row execute function private.set_updated_at();

create table public.food_log_items (
  -- Supplied by the client so log calls are idempotent (see log_food_item).
  id uuid primary key,
  food_log_id uuid not null references public.food_logs (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  -- Nullable so the entry and its snapshot survive a catalog deletion.
  food_id uuid references public.foods (id) on delete set null,
  food_serving_id uuid,
  meal_type text not null check (meal_type in ('breakfast', 'lunch', 'dinner', 'snack')),
  food_name_snapshot text not null,
  serving_name_snapshot text,
  serving_weight_grams numeric(7, 2) not null check (serving_weight_grams > 0 and serving_weight_grams <= 5000),
  quantity numeric(6, 2) not null check (quantity > 0 and quantity <= 100),
  total_weight_grams numeric(9, 2)
    generated always as (round(serving_weight_grams * quantity, 2)) stored,
  -- Per 100 g values at the time of logging. Edits rescale from this, never
  -- from the live catalog, so catalog corrections do not rewrite history.
  nutrients_per_100g jsonb not null,
  calories numeric(9, 2) not null check (calories >= 0),
  protein_g numeric(9, 2) not null check (protein_g >= 0),
  carbohydrates_g numeric(9, 2) not null check (carbohydrates_g >= 0),
  fat_g numeric(9, 2) not null check (fat_g >= 0),
  fiber_g numeric(9, 2) check (fiber_g >= 0),
  sugar_g numeric(9, 2) check (sugar_g >= 0),
  sodium_mg numeric(10, 2) check (sodium_mg >= 0),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint food_log_items_serving_matches_food
    foreign key (food_serving_id, food_id)
    references public.food_servings (id, food_id)
    on delete set null (food_serving_id)
);

create index food_log_items_food_log_id_idx on public.food_log_items (food_log_id);
create index food_log_items_user_created_idx on public.food_log_items (user_id, created_at desc);
create index food_log_items_food_id_idx on public.food_log_items (food_id);
create index food_log_items_serving_idx on public.food_log_items (food_serving_id, food_id);

create trigger food_log_items_set_updated_at
before update on public.food_log_items
for each row execute function private.set_updated_at();

-- Favorites -----------------------------------------------------------------

create table public.food_favorites (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  food_id uuid not null references public.foods (id) on delete cascade,
  created_at timestamptz not null default now(),
  constraint food_favorites_user_food_unique unique (user_id, food_id)
);

create index food_favorites_food_id_idx on public.food_favorites (food_id);
