# Data model

Source of truth: `supabase/migrations/`. This document explains intent; if they disagree, the migration wins and this file must be fixed.

## Phase 1 — identity (`20261027120000_identity.sql`)

### `profiles`

| Column                     | Type                     | Notes                                                                         |
| -------------------------- | ------------------------ | ----------------------------------------------------------------------------- |
| `id`                       | uuid PK                  | = `auth.users.id`, cascade delete                                             |
| `handle`                   | citext, unique, nullable | `^[a-z0-9_]{3,20}$`, stored lower-case. Null until onboarding                 |
| `display_name`             | text                     | 1–50 chars                                                                    |
| `bio`                      | text                     | ≤ 160 chars, default `''`                                                     |
| `avatar_path`              | text, nullable           | storage path (not URL), ≤ 512 chars. Upload flow in Phase 2                   |
| `status`                   | `profile_status`         | `active` · `limited` · `suspended` · `deleted`. Server/moderator-managed only |
| `created_at`, `updated_at` | timestamptz              | `updated_at` maintained by trigger                                            |

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

## Enums

- `app_role`: `moderator`, `admin`
- `profile_status`: `active`, `limited`, `suspended`, `deleted`
- `sport`: `football`, `basketball`

## Retention (to confirm with product/legal)

- Profiles: deleted with the auth user (cascade). Account deletion flow is still to be built.
- Audit log: proposed 1 year. `actor_id` is set to null if the profile is deleted.
- Rate limits: transient; purge after window expiry.
