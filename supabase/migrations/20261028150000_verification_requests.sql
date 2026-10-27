-- Verification requests: users who meet the requirements apply; admins review
-- in the app, approve or reject, and can revoke later. All writes go through
-- the security-definer functions below; clients have no table write grants.

-- ---------------------------------------------------------------------------
-- App configuration (staff-managed values the database rules read)
-- ---------------------------------------------------------------------------
create table public.app_config (
  key text primary key check (char_length(key) <= 100),
  value jsonb not null,
  updated_at timestamptz not null default now()
);

alter table public.app_config enable row level security;
revoke all on public.app_config from anon, authenticated;

insert into public.app_config (key, value) values
  ('verification_min_followers', '10000'),
  ('verification_reapply_days', '30');

create or replace function public.config_int(p_key text, p_default integer)
returns integer
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select (value #>> '{}')::integer from public.app_config where key = p_key),
    p_default
  );
$$;

create or replace function public.verification_min_followers()
returns integer
language sql
stable
security definer
set search_path = ''
as $$ select public.config_int('verification_min_followers', 10000); $$;

create or replace function public.verification_reapply_days()
returns integer
language sql
stable
security definer
set search_path = ''
as $$ select public.config_int('verification_reapply_days', 30); $$;

-- ---------------------------------------------------------------------------
-- Follower count. PLACEHOLDER until the follow graph lands in Phase 2, which
-- replaces this function with a real count from public.follows.
-- ---------------------------------------------------------------------------
create or replace function public.follower_count(p_user_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$ select 0; $$;

-- ---------------------------------------------------------------------------
-- Requests
-- ---------------------------------------------------------------------------
create type public.verification_status as enum ('pending', 'approved', 'rejected', 'withdrawn');

create table public.verification_requests (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.verification_status not null default 'pending',
  message text not null default '' check (char_length(message) <= 500),
  follower_count_at_submit integer not null check (follower_count_at_submit >= 0),
  reviewer_id uuid references public.profiles (id) on delete set null,
  review_note text check (review_note is null or char_length(review_note) <= 500),
  created_at timestamptz not null default now(),
  reviewed_at timestamptz
);

-- At most one open request per user, enforced even under concurrent submits.
create unique index verification_requests_one_pending
  on public.verification_requests (user_id) where status = 'pending';
create index verification_requests_status_created_idx
  on public.verification_requests (status, created_at);
create index verification_requests_user_created_idx
  on public.verification_requests (user_id, created_at desc);

alter table public.verification_requests enable row level security;
revoke all on public.verification_requests from anon, authenticated;
grant select on public.verification_requests to authenticated;

-- Applicants see their own requests (including the reviewer's note); admins see all.
create policy verification_requests_select_own_or_admin on public.verification_requests
  for select to authenticated
  using (user_id = (select auth.uid()) or (select public.has_role('admin')));

-- ---------------------------------------------------------------------------
-- Applicant actions
-- ---------------------------------------------------------------------------
create or replace function public.submit_verification_request(p_message text)
returns uuid
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
  v_profile public.profiles;
  v_last_rejected timestamptz;
  v_followers integer;
  v_id uuid;
begin
  if v_uid is null then
    raise exception 'not_authenticated' using errcode = 'P0001';
  end if;
  if char_length(coalesce(p_message, '')) > 500 then
    raise exception 'message_too_long' using errcode = 'P0001';
  end if;

  select * into v_profile from public.profiles where id = v_uid;
  if v_profile.id is null or v_profile.status <> 'active' or v_profile.handle is null then
    raise exception 'not_allowed' using errcode = 'P0001';
  end if;
  if v_profile.verified_at is not null then
    raise exception 'already_verified' using errcode = 'P0001';
  end if;
  if exists (
    select 1 from public.verification_requests where user_id = v_uid and status = 'pending'
  ) then
    raise exception 'already_pending' using errcode = 'P0001';
  end if;

  select max(reviewed_at) into v_last_rejected
  from public.verification_requests
  where user_id = v_uid and status = 'rejected';
  if v_last_rejected is not null
     and v_last_rejected > now() - make_interval(days => public.verification_reapply_days()) then
    raise exception 'cooldown' using errcode = 'P0001';
  end if;

  v_followers := public.follower_count(v_uid);
  if v_followers < public.verification_min_followers() then
    raise exception 'not_eligible' using errcode = 'P0001';
  end if;

  begin
    insert into public.verification_requests (user_id, message, follower_count_at_submit)
    values (v_uid, btrim(coalesce(p_message, '')), v_followers)
    returning id into v_id;
  exception when unique_violation then
    raise exception 'already_pending' using errcode = 'P0001';
  end;
  return v_id;
end;
$$;

create or replace function public.withdraw_verification_request()
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.verification_requests
  set status = 'withdrawn', reviewed_at = now()
  where user_id = auth.uid() and status = 'pending';
  if not found then
    raise exception 'not_pending' using errcode = 'P0001';
  end if;
end;
$$;

-- ---------------------------------------------------------------------------
-- Admin actions (audited in the same transaction)
-- ---------------------------------------------------------------------------
create or replace function public.review_verification_request(
  p_request_id uuid,
  p_approve boolean,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_request public.verification_requests;
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if char_length(coalesce(v_note, '')) > 500 then
    raise exception 'message_too_long' using errcode = 'P0001';
  end if;

  select * into v_request
  from public.verification_requests
  where id = p_request_id
  for update;
  if v_request.id is null or v_request.status <> 'pending' then
    raise exception 'not_pending' using errcode = 'P0001';
  end if;

  update public.verification_requests
  set status = case when p_approve then 'approved'::public.verification_status
                    else 'rejected'::public.verification_status end,
      reviewer_id = auth.uid(),
      review_note = v_note,
      reviewed_at = now()
  where id = p_request_id;

  if p_approve then
    update public.profiles
    set verified_at = coalesce(verified_at, now())
    where id = v_request.user_id;
  end if;

  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    case when p_approve then 'verification.approved' else 'verification.rejected' end,
    'profile',
    v_request.user_id::text,
    jsonb_build_object('request_id', p_request_id, 'note', v_note)
  );
end;
$$;

create or replace function public.admin_set_verified(
  p_user_id uuid,
  p_verified boolean,
  p_note text
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_note text := nullif(btrim(coalesce(p_note, '')), '');
begin
  if not public.has_role('admin') then
    raise exception 'forbidden' using errcode = 'P0001';
  end if;
  if char_length(coalesce(v_note, '')) > 500 then
    raise exception 'message_too_long' using errcode = 'P0001';
  end if;

  update public.profiles
  set verified_at = case when p_verified then coalesce(verified_at, now()) else null end
  where id = p_user_id;
  if not found then
    raise exception 'not_found' using errcode = 'P0001';
  end if;

  insert into public.audit_log (actor_id, action, target_type, target_id, metadata)
  values (
    auth.uid(),
    case when p_verified then 'profile.verified' else 'profile.verification_revoked' end,
    'profile',
    p_user_id::text,
    jsonb_build_object('note', v_note, 'via', 'admin_ui')
  );
end;
$$;

-- ---------------------------------------------------------------------------
-- Grants
-- ---------------------------------------------------------------------------
revoke all on function public.config_int(text, integer) from public, anon, authenticated;
revoke all on function public.verification_min_followers() from public, anon;
revoke all on function public.verification_reapply_days() from public, anon;
revoke all on function public.follower_count(uuid) from public;
revoke all on function public.submit_verification_request(text) from public, anon;
revoke all on function public.withdraw_verification_request() from public, anon;
revoke all on function public.review_verification_request(uuid, boolean, text) from public, anon;
revoke all on function public.admin_set_verified(uuid, boolean, text) from public, anon;

grant execute on function public.verification_min_followers() to authenticated;
grant execute on function public.verification_reapply_days() to authenticated;
grant execute on function public.follower_count(uuid) to anon, authenticated;
grant execute on function public.submit_verification_request(text) to authenticated;
grant execute on function public.withdraw_verification_request() to authenticated;
grant execute on function public.review_verification_request(uuid, boolean, text) to authenticated;
grant execute on function public.admin_set_verified(uuid, boolean, text) to authenticated;
