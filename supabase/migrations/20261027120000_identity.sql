-- Phase 1: identity, roles, preferences, audit log, rate limiting.
-- Access rules are documented in docs/architecture/rls-matrix.md. Keep both in sync.

create extension if not exists citext with schema extensions;

-- ---------------------------------------------------------------------------
-- Types
-- ---------------------------------------------------------------------------
create type public.app_role as enum ('moderator', 'admin');
create type public.profile_status as enum ('active', 'limited', 'suspended', 'deleted');
create type public.sport as enum ('football', 'basketball');

-- ---------------------------------------------------------------------------
-- Shared helpers
-- ---------------------------------------------------------------------------
create or replace function public.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- profiles: one row per auth user, created by trigger on signup.
-- ---------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  -- Null until onboarding. Stored lower-case; citext keeps uniqueness case-insensitive.
  handle extensions.citext unique
    check (handle::text ~ '^[a-z0-9_]{3,20}$'),
  display_name text not null
    check (char_length(display_name) between 1 and 50),
  bio text not null default ''
    check (char_length(bio) <= 160),
  avatar_path text
    check (avatar_path is null or char_length(avatar_path) <= 512),
  status public.profile_status not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create trigger profiles_set_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- user_roles: elevated platform roles only. Absence of a row means "user".
-- Never writable by clients; assigned through audited server/admin workflows.
-- ---------------------------------------------------------------------------
create table public.user_roles (
  user_id uuid not null references public.profiles (id) on delete cascade,
  role public.app_role not null,
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  primary key (user_id, role)
);

-- ---------------------------------------------------------------------------
-- user_preferences: owner-private settings. Never used for authorization.
-- ---------------------------------------------------------------------------
create table public.user_preferences (
  user_id uuid primary key references public.profiles (id) on delete cascade,
  locale text not null default 'en'
    check (locale ~ '^[a-z]{2}(-[A-Z]{2})?$'),
  timezone text not null default 'UTC'
    check (char_length(timezone) between 1 and 64),
  favourite_sports public.sport[] not null default '{}'
    check (cardinality(favourite_sports) <= 2),
  updated_at timestamptz not null default now()
);

create trigger user_preferences_set_updated_at
  before update on public.user_preferences
  for each row execute function public.set_updated_at();

-- ---------------------------------------------------------------------------
-- audit_log: append-only record of security-relevant actions.
-- Written only by server code with the service role. Not exposed to clients.
-- ---------------------------------------------------------------------------
create table public.audit_log (
  id bigint generated always as identity primary key,
  actor_id uuid references public.profiles (id) on delete set null,
  action text not null check (char_length(action) between 1 and 100),
  target_type text check (char_length(target_type) <= 50),
  target_id text check (char_length(target_id) <= 100),
  metadata jsonb not null default '{}'::jsonb,
  request_id text check (char_length(request_id) <= 100),
  created_at timestamptz not null default now()
);

create index audit_log_actor_created_idx on public.audit_log (actor_id, created_at desc);

-- ---------------------------------------------------------------------------
-- rate_limits: fixed-window counters shared by all app instances.
-- Keys are hashed by the application; raw IPs/emails are never stored.
-- ---------------------------------------------------------------------------
create table public.rate_limits (
  key text primary key check (char_length(key) <= 200),
  window_start timestamptz not null,
  count integer not null
);

create index rate_limits_window_start_idx on public.rate_limits (window_start);

create or replace function public.rate_limit_hit(p_key text, p_limit integer, p_window_seconds integer)
returns table (allowed boolean, retry_after_seconds integer)
language plpgsql
set search_path = ''
as $$
declare
  v_window interval;
  v_row public.rate_limits;
begin
  if p_key is null or char_length(p_key) > 200 or p_limit < 1 or p_window_seconds < 1 then
    raise exception 'invalid rate limit arguments';
  end if;
  v_window := make_interval(secs => p_window_seconds);

  insert into public.rate_limits as rl (key, window_start, count)
  values (p_key, now(), 1)
  on conflict (key) do update
    set window_start = case when rl.window_start + v_window <= now() then now() else rl.window_start end,
        count = case when rl.window_start + v_window <= now() then 1 else rl.count + 1 end
  returning rl.* into v_row;

  allowed := v_row.count <= p_limit;
  retry_after_seconds := case
    when allowed then 0
    else greatest(1, ceil(extract(epoch from (v_row.window_start + v_window - now())))::integer)
  end;
  return next;
end;
$$;

-- ---------------------------------------------------------------------------
-- Role helper for policies and server checks. Admin implies moderator.
-- ---------------------------------------------------------------------------
create or replace function public.has_role(p_role public.app_role)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.user_roles ur
    join public.profiles p on p.id = ur.user_id
    where ur.user_id = (select auth.uid())
      and p.status in ('active', 'limited')
      and (ur.role = p_role or ur.role = 'admin')
  );
$$;

-- ---------------------------------------------------------------------------
-- Signup trigger: create profile + preferences for every new auth user.
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
    nullif(new.raw_user_meta_data ->> 'display_name', ''),
    split_part(new.email, '@', 1),
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

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ---------------------------------------------------------------------------
-- Grants: start from nothing, then add exactly what each role needs.
-- Supabase grants broad table privileges to anon/authenticated by default.
-- ---------------------------------------------------------------------------
revoke all on public.profiles, public.user_roles, public.user_preferences,
  public.audit_log, public.rate_limits from anon, authenticated;

grant select on public.profiles to anon, authenticated;
grant update (handle, display_name, bio, avatar_path) on public.profiles to authenticated;

grant select on public.user_roles to authenticated;

grant select on public.user_preferences to authenticated;
grant update (locale, timezone, favourite_sports) on public.user_preferences to authenticated;

revoke all on function public.rate_limit_hit(text, integer, integer) from public, anon, authenticated;
grant execute on function public.rate_limit_hit(text, integer, integer) to service_role;

revoke all on function public.has_role(public.app_role) from public, anon;
grant execute on function public.has_role(public.app_role) to authenticated, service_role;

revoke all on function public.handle_new_user() from public, anon, authenticated;
revoke all on function public.set_updated_at() from public, anon, authenticated;

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.profiles enable row level security;
alter table public.user_roles enable row level security;
alter table public.user_preferences enable row level security;
alter table public.audit_log enable row level security;
alter table public.rate_limits enable row level security;

-- profiles: visible publicly while active/limited; owners always see their own row.
create policy profiles_select_visible on public.profiles
  for select to anon, authenticated
  using (status in ('active', 'limited') or id = (select auth.uid()));

-- profiles: owners may edit safe columns (column grants above) unless suspended/deleted.
create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = (select auth.uid()) and status in ('active', 'limited'))
  with check (id = (select auth.uid()));

-- user_roles: users may read their own roles; moderators/admins may read all.
create policy user_roles_select_own_or_staff on public.user_roles
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role('moderator')));

-- user_preferences: owner only.
create policy user_preferences_select_own on public.user_preferences
  for select to authenticated
  using (user_id = (select auth.uid()));

create policy user_preferences_update_own on public.user_preferences
  for update to authenticated
  using (user_id = (select auth.uid()))
  with check (user_id = (select auth.uid()));

-- audit_log, rate_limits: no policies. Only the service role (which bypasses RLS) may access.
