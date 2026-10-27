# 0002 — Supabase Auth with @supabase/ssr cookie sessions

- Status: accepted
- Date: 2026-10-27

## Decision

- Sessions live in HttpOnly cookies managed by `@supabase/ssr`. Nothing is stored in localStorage.
- `src/proxy.ts` refreshes the session on every request and verifies it with `getClaims()`. It never uses `getSession()` for trust decisions.
- Server code creates a new Supabase client per request. User-initiated reads and writes use the publishable key with the user's JWT, so RLS always applies.
- The service-role key is confined to `src/lib/supabase/admin.ts`, with an exhaustive list of uses in the RLS matrix.
- Email confirmation is required. Auth links land on `/auth/callback`, which supports both PKCE `code` and `token_hash` flows and allowlists the `next` redirect.
- Roles are stored in `user_roles` and checked through `has_role()`, never through JWT custom claims for now. That keeps revocation immediate at the cost of a query per check.

## Consequences

- Protected pages must read the session inside `<Suspense>` (see ADR 0004).
- Hosted Supabase projects must have their Auth settings configured to match `supabase/config.toml`.
