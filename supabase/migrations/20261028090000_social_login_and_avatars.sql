-- Google/Apple sign-in and ImageKit avatars.

-- ---------------------------------------------------------------------------
-- Signup trigger: also take the name that Google/Apple provide.
-- ---------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_display_name text;
begin
  v_display_name := left(btrim(coalesce(
    nullif(btrim(new.raw_user_meta_data ->> 'display_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'full_name'), ''),
    nullif(btrim(new.raw_user_meta_data ->> 'name'), ''),
    nullif(split_part(coalesce(new.email, ''), '@', 1), ''),
    'VYRO fan'
  )), 50);
  if v_display_name = '' then
    v_display_name := 'VYRO fan';
  end if;

  insert into public.profiles (id, display_name) values (new.id, v_display_name);
  insert into public.user_preferences (user_id) values (new.id);
  return new;
end;
$$;

revoke all on function public.handle_new_user() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- avatar_path: an ImageKit file path inside the owner's own folder only, so a
-- user can never point their profile at another user's or an arbitrary file.
-- ---------------------------------------------------------------------------
alter table public.profiles
  add constraint profiles_avatar_path_owned
  check (
    avatar_path is null
    or avatar_path ~ ('^/avatars/' || id::text || '/[A-Za-z0-9._-]{1,200}$')
  );
