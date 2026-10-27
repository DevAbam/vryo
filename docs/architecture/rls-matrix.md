# RLS and access matrix

Default deny. Table privileges are revoked from `anon` and `authenticated`, then granted back per operation (and per column for updates). RLS policies then restrict rows. `service_role` bypasses RLS and is used only where listed below.

Tested in `tests/rls/identity.test.ts` as: anonymous, user A, user B, moderator, admin and suspended user.

## Phase 1 tables

| Table              | anon                                       | authenticated                                                                                                                                                                                               | moderator / admin                                                                   | service role (server only)                                 |
| ------------------ | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `profiles`         | SELECT rows with status `active`/`limited` | SELECT same + own row always. UPDATE own row, columns `handle, display_name, bio, avatar_path, avatar_file_id` only (not `verified_at`, `status`), while own status is `active`/`limited`. No INSERT/DELETE | same as authenticated (moderation paths come in Phase 2 via audited server actions) | trigger inserts; status changes                            |
| `user_roles`       | none                                       | SELECT own rows                                                                                                                                                                                             | SELECT all rows                                                                     | INSERT/DELETE through audited admin workflow (to be built) |
| `user_preferences` | none                                       | SELECT/UPDATE own row (`locale, timezone, favourite_sports`)                                                                                                                                                | own only                                                                            | trigger inserts                                            |
| `audit_log`        | none                                       | none                                                                                                                                                                                                        | none (staff viewer comes with the moderation queue)                                 | INSERT via `recordAudit()`                                 |
| `rate_limits`      | none                                       | none                                                                                                                                                                                                        | none                                                                                | via `rate_limit_hit()`                                     |

| `verification_requests` | none | SELECT own requests (incl. reviewer note). No direct writes | admin: SELECT all | — |
| `app_config` | none | none | none | config values read by definer functions |

## Functions

| Function                                      | Security                  | Execute granted to          | Notes                                                                                                                                                  |
| --------------------------------------------- | ------------------------- | --------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `has_role(app_role)`                          | definer, `search_path=''` | authenticated, service_role | Admin implies moderator; suspended/deleted users get false                                                                                             |
| `rate_limit_hit(text,int,int)`                | invoker                   | service_role                | Validates arguments                                                                                                                                    |
| `submit_verification_request(text)`           | definer                   | authenticated               | Checks active profile, handle set, not verified, no pending request, 30-day cooldown after rejection, `follower_count >= verification_min_followers()` |
| `withdraw_verification_request()`             | definer                   | authenticated               | Own pending request only                                                                                                                               |
| `review_verification_request(uuid,bool,text)` | definer                   | authenticated               | Admin only (`has_role(admin)`); pending only (row lock); sets `verified_at` on approve; audits in the same transaction                                 |
| `admin_set_verified(uuid,bool,text)`          | definer                   | authenticated               | Admin only; direct verify/revoke; audited                                                                                                              |
| `follower_count(uuid)`                        | invoker                   | anon, authenticated         | **Placeholder returning 0 until Phase 2 adds `follows`**                                                                                               |
| `handle_new_user()`                           | definer, `search_path=''` | trigger only                |                                                                                                                                                        |
| `set_updated_at()`                            | invoker                   | trigger only                |                                                                                                                                                        |

## Service-role uses (exhaustive)

| Where                         | Why                                                                                              | Independent authorization                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `src/lib/rate-limit/index.ts` | Shared counters must not be client-writable, or users could reset or exhaust other users' limits | Keys are derived server-side from hashed IP/email/user id |
| `scripts/grant-admin.mjs`     | Bootstrap the first admins/moderators; no client can write `user_roles`                          | Run manually by a trusted operator; writes `audit_log`    |
| `src/lib/security/audit.ts`   | The audit log must not be readable or writable by users                                          | Called only after the action was authorized and committed |

Adding a row here requires review.

## Invariants covered by tests

- Users cannot edit another user's profile or preferences (0 rows affected).
- Users cannot set `status`, `id`, `created_at` or `verified_at` (privilege error 42501).
- Avatar paths must point into the owner's own folder; file ids must look like ImageKit ids.
- Users and moderators cannot grant themselves roles.
- Only admins can review verification requests or set badges; applicants see only their own requests.
- Handles are unique case-insensitively and must be stored lower-case.
- Suspended users are hidden from others, cannot edit, and lose staff roles.
- Anonymous visitors cannot read preferences, roles, the audit log or rate limits, and cannot call privileged functions.
