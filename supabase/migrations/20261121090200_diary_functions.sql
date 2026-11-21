-- Server-side nutrition engine and the RPC functions the app calls.
--
-- Diary writes are security definer because client roles have no write grant
-- on the diary tables. Each one checks auth.uid() itself and filters by it.

-- The one nutrition formula. Everything that turns grams into nutrients
-- calls this, so there is a single place to change rounding.
--   nutrient eaten = nutrient per 100 g * grams eaten / 100
create function private.scale_nutrient(per_100g numeric, grams numeric)
returns numeric
language sql
immutable
parallel safe
set search_path = ''
as $$
  select round(per_100g * grams / 100, 2);
$$;

-- Profile row for every new auth user ---------------------------------------

create function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    nullif(left(trim(new.raw_user_meta_data ->> 'display_name'), 80), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

create trigger on_auth_user_created
after insert on auth.users
for each row execute function private.handle_new_user();

-- log_food_item --------------------------------------------------------------
--
-- Adds one entry to the caller's diary.
--
-- p_id is generated on the device. Calling again with the same id returns the
-- row that was already written instead of adding a second one, so the app can
-- retry, replay its offline queue, and render the entry optimistically with
-- the id it will keep.
--
-- Pass either p_serving_id (a serving of this food) or p_serving_grams
-- (custom weight in grams), not both. Nutrients come from the catalog row,
-- never from the client.
create function public.log_food_item(
  p_id uuid,
  p_log_date date,
  p_meal_type text,
  p_food_id uuid,
  p_quantity numeric,
  p_serving_id uuid default null,
  p_serving_grams numeric default null
)
returns public.food_log_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_food public.foods;
  v_quantity numeric := round(p_quantity, 2);
  v_serving_name text;
  v_serving_grams numeric;
  v_grams numeric;
  v_log_id uuid;
  v_item public.food_log_items;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;
  if p_id is null then
    raise exception 'p_id is required' using errcode = '22004';
  end if;

  -- Replay of a call that already succeeded.
  select * into v_item from public.food_log_items where id = p_id;
  if found then
    if v_item.user_id <> v_uid then
      raise exception 'entry id already in use' using errcode = '23505';
    end if;
    return v_item;
  end if;

  if p_log_date is null or p_log_date < date '2000-01-01' or p_log_date > current_date + 1 then
    raise exception 'log_date must be a real calendar date, not in the future' using errcode = '22023';
  end if;
  if p_meal_type is null or p_meal_type not in ('breakfast', 'lunch', 'dinner', 'snack') then
    raise exception 'meal_type must be breakfast, lunch, dinner or snack' using errcode = '22023';
  end if;
  if v_quantity is null or v_quantity <= 0 or v_quantity > 100 then
    raise exception 'quantity must be greater than 0 and at most 100' using errcode = '22023';
  end if;
  if (p_serving_id is null) = (p_serving_grams is null) then
    raise exception 'pass exactly one of p_serving_id or p_serving_grams' using errcode = '22023';
  end if;

  select * into v_food from public.foods where id = p_food_id;
  if not found then
    raise exception 'food not found' using errcode = 'P0002';
  end if;

  if p_serving_id is not null then
    select s.serving_name, s.weight_grams
      into v_serving_name, v_serving_grams
      from public.food_servings s
     where s.id = p_serving_id and s.food_id = p_food_id;
    if not found then
      raise exception 'serving does not belong to this food' using errcode = '22023';
    end if;
  else
    v_serving_grams := round(p_serving_grams, 2);
    if v_serving_grams <= 0 or v_serving_grams > 5000 then
      raise exception 'serving grams must be greater than 0 and at most 5000' using errcode = '22023';
    end if;
  end if;

  v_grams := round(v_serving_grams * v_quantity, 2);

  insert into public.food_logs (user_id, log_date)
  values (v_uid, p_log_date)
  on conflict (user_id, log_date) do update set updated_at = now()
  returning id into v_log_id;

  insert into public.food_log_items (
    id, food_log_id, user_id, food_id, food_serving_id, meal_type,
    food_name_snapshot, serving_name_snapshot, serving_weight_grams, quantity,
    nutrients_per_100g,
    calories, protein_g, carbohydrates_g, fat_g, fiber_g, sugar_g, sodium_mg
  )
  values (
    p_id, v_log_id, v_uid, v_food.id, p_serving_id, p_meal_type,
    v_food.name, v_serving_name, v_serving_grams, v_quantity,
    jsonb_build_object(
      'calories', v_food.calories_per_100g,
      'protein_g', v_food.protein_per_100g,
      'carbohydrates_g', v_food.carbohydrates_per_100g,
      'fat_g', v_food.fat_per_100g,
      'fiber_g', v_food.fiber_per_100g,
      'sugar_g', v_food.sugar_per_100g,
      'sodium_mg', v_food.sodium_mg_per_100g
    ),
    private.scale_nutrient(v_food.calories_per_100g, v_grams),
    private.scale_nutrient(v_food.protein_per_100g, v_grams),
    private.scale_nutrient(v_food.carbohydrates_per_100g, v_grams),
    private.scale_nutrient(v_food.fat_per_100g, v_grams),
    private.scale_nutrient(v_food.fiber_per_100g, v_grams),
    private.scale_nutrient(v_food.sugar_per_100g, v_grams),
    private.scale_nutrient(v_food.sodium_mg_per_100g, v_grams)
  )
  on conflict (id) do nothing
  returning * into v_item;

  -- A concurrent call with the same id won the race. Return its row.
  if not found then
    select * into v_item from public.food_log_items where id = p_id;
    if v_item.user_id <> v_uid then
      raise exception 'entry id already in use' using errcode = '23505';
    end if;
  end if;

  return v_item;
end;
$$;

-- update_food_log_item --------------------------------------------------------
--
-- Changes meal, quantity or serving of one of the caller's entries. Null
-- arguments keep the current value. Nutrients are rescaled from the entry's
-- own per 100 g snapshot, so a catalog correction never changes a past entry.
-- ponytail: last write wins. Fine for one person editing their own diary;
-- add a version check if multi-device conflicts show up in practice.
create function public.update_food_log_item(
  p_id uuid,
  p_meal_type text default null,
  p_quantity numeric default null,
  p_serving_id uuid default null,
  p_serving_grams numeric default null
)
returns public.food_log_items
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
  v_item public.food_log_items;
  v_meal_type text;
  v_quantity numeric;
  v_serving_id uuid;
  v_serving_name text;
  v_serving_grams numeric;
  v_grams numeric;
  v_snap jsonb;
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  select * into v_item
    from public.food_log_items
   where id = p_id and user_id = v_uid
   for update;
  if not found then
    raise exception 'entry not found' using errcode = 'P0002';
  end if;

  v_meal_type := coalesce(p_meal_type, v_item.meal_type);
  if v_meal_type not in ('breakfast', 'lunch', 'dinner', 'snack') then
    raise exception 'meal_type must be breakfast, lunch, dinner or snack' using errcode = '22023';
  end if;

  v_quantity := round(coalesce(p_quantity, v_item.quantity), 2);
  if v_quantity <= 0 or v_quantity > 100 then
    raise exception 'quantity must be greater than 0 and at most 100' using errcode = '22023';
  end if;

  if p_serving_id is not null and p_serving_grams is not null then
    raise exception 'pass at most one of p_serving_id or p_serving_grams' using errcode = '22023';
  elsif p_serving_id is not null then
    select s.id, s.serving_name, s.weight_grams
      into v_serving_id, v_serving_name, v_serving_grams
      from public.food_servings s
     where s.id = p_serving_id and s.food_id = v_item.food_id;
    if not found then
      raise exception 'serving does not belong to this food' using errcode = '22023';
    end if;
  elsif p_serving_grams is not null then
    v_serving_id := null;
    v_serving_name := null;
    v_serving_grams := round(p_serving_grams, 2);
    if v_serving_grams <= 0 or v_serving_grams > 5000 then
      raise exception 'serving grams must be greater than 0 and at most 5000' using errcode = '22023';
    end if;
  else
    v_serving_id := v_item.food_serving_id;
    v_serving_name := v_item.serving_name_snapshot;
    v_serving_grams := v_item.serving_weight_grams;
  end if;

  v_grams := round(v_serving_grams * v_quantity, 2);
  v_snap := v_item.nutrients_per_100g;

  update public.food_log_items
     set meal_type = v_meal_type,
         quantity = v_quantity,
         food_serving_id = v_serving_id,
         serving_name_snapshot = v_serving_name,
         serving_weight_grams = v_serving_grams,
         calories = private.scale_nutrient((v_snap ->> 'calories')::numeric, v_grams),
         protein_g = private.scale_nutrient((v_snap ->> 'protein_g')::numeric, v_grams),
         carbohydrates_g = private.scale_nutrient((v_snap ->> 'carbohydrates_g')::numeric, v_grams),
         fat_g = private.scale_nutrient((v_snap ->> 'fat_g')::numeric, v_grams),
         fiber_g = private.scale_nutrient((v_snap ->> 'fiber_g')::numeric, v_grams),
         sugar_g = private.scale_nutrient((v_snap ->> 'sugar_g')::numeric, v_grams),
         sodium_mg = private.scale_nutrient((v_snap ->> 'sodium_mg')::numeric, v_grams)
   where id = v_item.id
  returning * into v_item;

  return v_item;
end;
$$;

-- delete_food_log_item --------------------------------------------------------
--
-- Returns true if a row was removed, false if it was already gone. Not an
-- error either way, so a replayed delete is harmless.
create function public.delete_food_log_item(p_id uuid)
returns boolean
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := (select auth.uid());
begin
  if v_uid is null then
    raise exception 'not authenticated' using errcode = '42501';
  end if;

  delete from public.food_log_items where id = p_id and user_id = v_uid;
  return found;
end;
$$;

-- search_foods ----------------------------------------------------------------
--
-- Substring match on name and aliases, plus trigram similarity so small typos
-- still find the food ("sinigan", "adbo"). Returns catalog rows, so the client
-- can embed servings: rpc('search_foods', ...).select('*, food_servings(*)').
-- ponytail: trigram search is enough for a catalog in the low thousands.
-- Move to full-text search with a Filipino/English dictionary past that.
create function public.search_foods(p_query text, p_limit integer default 20)
returns setof public.foods
language sql
stable
security invoker
set search_path = ''
as $$
  with q as (
    select
      lower(trim(p_query)) as term,
      '%' || replace(replace(replace(lower(trim(p_query)), '\', '\\'), '%', '\%'), '_', '\_') || '%' as pattern
  ),
  matches as (
    select f.id, extensions.similarity(f.name, q.term) as score
      from public.foods f, q
     where f.name ilike q.pattern
        or f.name operator(extensions.%) q.term
    union all
    select a.food_id, extensions.similarity(a.alias, q.term)
      from public.food_aliases a, q
     where a.alias ilike q.pattern
        or a.alias operator(extensions.%) q.term
  ),
  ranked as (
    select id, max(score) as score from matches group by id
  )
  select f.*
    from ranked r
    join public.foods f on f.id = r.id
   where char_length(trim(p_query)) > 0
   order by r.score desc, f.name
   limit least(greatest(coalesce(p_limit, 20), 1), 50);
$$;

-- recent_foods ----------------------------------------------------------------
--
-- Foods the caller logged most recently, newest first. Derived from the
-- diary, so there is no separate table to keep in sync.
create function public.recent_foods(p_limit integer default 20)
returns setof public.foods
language sql
stable
security invoker
set search_path = ''
as $$
  select f.*
    from (
      select i.food_id, max(i.created_at) as last_logged_at
        from public.food_log_items i
       where i.user_id = (select auth.uid())
         and i.food_id is not null
       group by i.food_id
       order by last_logged_at desc
       limit least(greatest(coalesce(p_limit, 20), 1), 50)
    ) r
    join public.foods f on f.id = r.food_id
   order by r.last_logged_at desc;
$$;

-- daily_nutrition_totals --------------------------------------------------------
--
-- One row per date in [p_from, p_to], including days with nothing logged
-- (zeros), for the dashboard and the weekly and monthly charts.
-- Fiber, sugar and sodium sum only the entries that have a value.
create function public.daily_nutrition_totals(p_from date, p_to date)
returns table (
  log_date date,
  calories numeric,
  protein_g numeric,
  carbohydrates_g numeric,
  fat_g numeric,
  fiber_g numeric,
  sugar_g numeric,
  sodium_mg numeric,
  item_count integer
)
language plpgsql
stable
security invoker
set search_path = ''
as $$
begin
  if p_from is null or p_to is null or p_to < p_from or p_to - p_from > 400 then
    raise exception 'date range must be valid and at most 400 days' using errcode = '22023';
  end if;

  return query
  select
    d.day::date,
    coalesce(sum(i.calories), 0),
    coalesce(sum(i.protein_g), 0),
    coalesce(sum(i.carbohydrates_g), 0),
    coalesce(sum(i.fat_g), 0),
    coalesce(sum(i.fiber_g), 0),
    coalesce(sum(i.sugar_g), 0),
    coalesce(sum(i.sodium_mg), 0),
    count(i.id)::integer
  from generate_series(p_from, p_to, interval '1 day') as d(day)
  left join public.food_logs l
    on l.log_date = d.day::date
   and l.user_id = (select auth.uid())
  left join public.food_log_items i
    on i.food_log_id = l.id
  group by d.day
  order by d.day;
end;
$$;

-- Function privileges -----------------------------------------------------------
-- Supabase grants execute on new functions to anon by default. Take it back.

revoke execute on function
  public.log_food_item(uuid, date, text, uuid, numeric, uuid, numeric),
  public.update_food_log_item(uuid, text, numeric, uuid, numeric),
  public.delete_food_log_item(uuid),
  public.search_foods(text, integer),
  public.recent_foods(integer),
  public.daily_nutrition_totals(date, date)
from public, anon;

grant execute on function
  public.log_food_item(uuid, date, text, uuid, numeric, uuid, numeric),
  public.update_food_log_item(uuid, text, numeric, uuid, numeric),
  public.delete_food_log_item(uuid),
  public.search_foods(text, integer),
  public.recent_foods(integer),
  public.daily_nutrition_totals(date, date)
to authenticated;

revoke execute on all functions in schema private from public, anon, authenticated;
