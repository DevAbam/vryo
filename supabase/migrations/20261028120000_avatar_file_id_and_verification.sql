-- Avatar cleanup and verified accounts.

-- ImageKit file id of the current avatar, so the old file can be deleted when
-- it is replaced or removed. Users may write it (alongside avatar_path), so the
-- server re-checks with ImageKit that a file is in the owner's folder before
-- deleting it; this column is never trusted on its own.
alter table public.profiles
  add column avatar_file_id text
    check (avatar_file_id is null or avatar_file_id ~ '^[A-Za-z0-9_-]{1,100}$');

grant update (avatar_file_id) on public.profiles to authenticated;

-- Verified badge. Null means not verified. There is deliberately no client
-- UPDATE grant: only staff tooling using the service role (audited) sets it.
alter table public.profiles
  add column verified_at timestamptz;

comment on column public.profiles.verified_at is
  'When staff verified this account; null if not verified. Set only by audited server tooling.';
