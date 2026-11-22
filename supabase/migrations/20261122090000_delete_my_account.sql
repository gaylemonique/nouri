-- delete_my_account ------------------------------------------------------------
--
-- Lets a signed-in user delete their own account from inside the app, which
-- Google Play requires for apps that let people create accounts.
--
-- Deleting the auth.users row removes everything the user owns: profiles,
-- nutrition_goals, food_logs, food_log_items and food_favorites all reference
-- auth.users with on delete cascade, and Supabase cascades its own auth
-- tables (identities, sessions, refresh tokens). Catalog rows are shared and
-- untouched.
--
-- security definer because the client role cannot touch auth.users. The
-- function only ever deletes the caller's own row.
create function public.delete_my_account()
returns void
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

  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.delete_my_account() from public, anon;
grant execute on function public.delete_my_account() to authenticated;
