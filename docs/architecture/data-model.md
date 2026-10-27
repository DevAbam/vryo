# Data model

Source of truth: `supabase/migrations/`. This document explains intent; if they disagree, the migration wins and this file must be fixed.

## Phase 1 — identity (`20261027120000_identity.sql`)

### `profiles`

| Column                     | Type                     | Notes                                                                                                                                                                                          |
| -------------------------- | ------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `id`                       | uuid PK                  | = `auth.users.id`, cascade delete                                                                                                                                                              |
| `handle`                   | citext, unique, nullable | `^[a-z0-9_]{3,20}$`, stored lower-case. Null until onboarding                                                                                                                                  |
| `display_name`             | text                     | 1–50 chars                                                                                                                                                                                     |
| `bio`                      | text                     | ≤ 160 chars, default `''`                                                                                                                                                                      |
| `avatar_path`              | text, nullable           | ImageKit file path (not URL). Must match `/avatars/<own id>/<file>` (check constraint)                                                                                                         |
| `avatar_file_id`           | text, nullable           | ImageKit file id of the current avatar, used to delete it when replaced or removed. User-writable, so the server confirms with ImageKit that the file is in the owner's folder before deleting |
| `verified_at`              | timestamptz, nullable    | Verified badge. Set only by admins in the app (approve a request or verify directly), audited; no client write grant                                                                           |
| `status`                   | `profile_status`         | `active` · `limited` · `suspended` · `deleted`. Server/moderator-managed only                                                                                                                  |
| `created_at`, `updated_at` | timestamptz              | `updated_at` maintained by trigger                                                                                                                                                             |

Display name comes from signup metadata: `display_name`, else `full_name`/`name` (for future social sign-in), else the email prefix (`20261028090000_social_login_and_avatars.sql`).

Rows are created by the `on_auth_user_created` trigger (`handle_new_user`, security definer) together with `user_preferences`.

### `user_roles`

Elevated roles only (`moderator`, `admin`); no row means a regular user. PK `(user_id, role)`. `assigned_by` references the granting admin. Never client-writable.

`has_role(role)` (security definer, `search_path=''`) returns true if the caller holds the role, or `admin`, **and** their profile is `active`/`limited`, so suspension removes staff powers immediately.

### `user_preferences`

`user_id` PK, `locale` (`xx` or `xx-YY`), `timezone` (≤ 64 chars), `favourite_sports sport[]` (≤ 2). Owner-private. Never used for authorization.

### `audit_log`

Append-only, service-role only. `actor_id`, `action`, `target_type`, `target_id`, `metadata jsonb`, `request_id`, `created_at`. Index `(actor_id, created_at desc)`. Never store secrets or private content in `metadata`.

### `rate_limits`

`key` PK (`<policy>:<sha256(salt:identifier)>`), `window_start`, `count`. `rate_limit_hit(key, limit, window_seconds)` atomically increments a fixed window via `insert … on conflict`. Execute is granted to `service_role` only.

**Open item:** expired rows are not yet purged. Add a scheduled cleanup (`pg_cron`, delete rows whose window ended > 1 day ago) before launch.

### `verification_requests`

One row per application. `status` `pending`/`approved`/`rejected`/`withdrawn`; `message` (≤ 500, applicant), `follower_count_at_submit`, `reviewer_id`, `review_note` (≤ 500, shown to applicant), `created_at`, `reviewed_at`. Partial unique index allows one `pending` per user. All writes via definer functions (see RLS matrix).

### `app_config`

Key/value settings read by database rules: `verification_min_followers` (10000), `verification_reapply_days` (30). Not client-accessible; change with SQL until a settings UI exists.

## Enums

- `app_role`: `moderator`, `admin`
- `profile_status`: `active`, `limited`, `suspended`, `deleted`
- `sport`: `football`, `basketball`
- `verification_status`: `pending`, `approved`, `rejected`, `withdrawn`

## Retention (to confirm with product/legal)

- Profiles: deleted with the auth user (cascade). Account deletion flow is still to be built.
- Audit log: proposed 1 year. `actor_id` is set to null if the profile is deleted.
- Rate limits: transient; purge after window expiry.
