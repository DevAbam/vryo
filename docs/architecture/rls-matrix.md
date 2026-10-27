# RLS and access matrix

Default deny. Table privileges are revoked from `anon` and `authenticated`, then granted back per operation (and per column for updates). RLS policies then restrict rows. `service_role` bypasses RLS and is used only where listed below.

Tested in `tests/rls/identity.test.ts` as: anonymous, user A, user B, moderator, admin and suspended user.

## Phase 1 tables

| Table              | anon                                       | authenticated                                                                                                                                                 | moderator / admin                                                                   | service role (server only)                                 |
| ------------------ | ------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------- | ---------------------------------------------------------- |
| `profiles`         | SELECT rows with status `active`/`limited` | SELECT same + own row always. UPDATE own row, columns `handle, display_name, bio, avatar_path` only, while own status is `active`/`limited`. No INSERT/DELETE | same as authenticated (moderation paths come in Phase 2 via audited server actions) | trigger inserts; status changes                            |
| `user_roles`       | none                                       | SELECT own rows                                                                                                                                               | SELECT all rows                                                                     | INSERT/DELETE through audited admin workflow (to be built) |
| `user_preferences` | none                                       | SELECT/UPDATE own row (`locale, timezone, favourite_sports`)                                                                                                  | own only                                                                            | trigger inserts                                            |
| `audit_log`        | none                                       | none                                                                                                                                                          | none (staff viewer comes with the moderation queue)                                 | INSERT via `recordAudit()`                                 |
| `rate_limits`      | none                                       | none                                                                                                                                                          | none                                                                                | via `rate_limit_hit()`                                     |

## Functions

| Function                       | Security                  | Execute granted to          | Notes                                                      |
| ------------------------------ | ------------------------- | --------------------------- | ---------------------------------------------------------- |
| `has_role(app_role)`           | definer, `search_path=''` | authenticated, service_role | Admin implies moderator; suspended/deleted users get false |
| `rate_limit_hit(text,int,int)` | invoker                   | service_role                | Validates arguments                                        |
| `handle_new_user()`            | definer, `search_path=''` | trigger only                |                                                            |
| `set_updated_at()`             | invoker                   | trigger only                |                                                            |

## Service-role uses (exhaustive)

| Where                         | Why                                                                                              | Independent authorization                                 |
| ----------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------- |
| `src/lib/rate-limit/index.ts` | Shared counters must not be client-writable, or users could reset or exhaust other users' limits | Keys are derived server-side from hashed IP/email/user id |
| `src/lib/security/audit.ts`   | The audit log must not be readable or writable by users                                          | Called only after the action was authorized and committed |

Adding a row here requires review.

## Invariants covered by tests

- Users cannot edit another user's profile or preferences (0 rows affected).
- Users cannot set `status`, `id` or `created_at` (privilege error 42501).
- Users and moderators cannot grant themselves roles.
- Handles are unique case-insensitively and must be stored lower-case.
- Suspended users are hidden from others, cannot edit, and lose staff roles.
- Anonymous visitors cannot read preferences, roles, the audit log or rate limits, and cannot call privileged functions.
