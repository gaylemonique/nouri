-- Let the client upsert its own goals without sending user_id.
--
-- authenticated may update only the goal columns, not user_id. A PostgREST
-- upsert sets every column in the payload on conflict, so a payload that
-- carries user_id fails the column grant. With this default the client sends
-- only the goal columns, inserts fill user_id from the JWT, and the existing
-- RLS check still requires it to be the caller.
alter table public.nutrition_goals
  alter column user_id set default auth.uid();
