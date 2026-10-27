# Threat model

Living document. Update it whenever a feature adds an asset, an entry point or a trust boundary.

## Assets

User accounts and sessions · profile data · private preferences · (later) private messages, chat attachments, LiveKit tokens, provider playback credentials · audit log · service-role and provider secrets.

## Trust boundaries

Browser ↔ Next.js · Next.js ↔ Supabase (publishable key + user JWT vs service role) · Next.js ↔ LiveKit / sports provider (Phase 4–5) · webhooks into Next.js (Phase 4–5).

## Controls in place (Phase 1)

| Threat                    | Control                                                                                                                                               | Where                                              |
| ------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------- |
| Cross-user access / IDOR  | RLS with owner checks; column-level UPDATE grants; negative tests                                                                                     | migration, `tests/rls`                             |
| Privilege escalation      | Roles in `user_roles` with no client write grants; `has_role()` checks profile status                                                                 | migration                                          |
| Mass assignment           | Zod schemas whitelist fields; DB grants deny protected columns                                                                                        | `src/lib/validation`, migration                    |
| Session theft             | `@supabase/ssr` HttpOnly cookies; `getClaims()` verification; no tokens in localStorage or logs; `Cache-Control: private` on cookie-setting responses | `src/lib/supabase/*`                               |
| Open redirect             | `safeNextPath()` allowlist for `next` parameters                                                                                                      | `src/lib/security/redirect.ts`                     |
| CSRF                      | Server actions enforce same-origin (Next.js origin check); cookies `SameSite=Lax`; `form-action 'self'`                                               | framework, `next.config.ts`                        |
| Brute force / enumeration | Distributed rate limits on login (IP + email), signup, reset; generic login/reset/signup responses; Supabase Auth's own limits                        | `src/lib/rate-limit`, `src/server/actions/auth.ts` |
| Weak passwords            | Minimum 10 characters with mixed case and a digit, enforced by Supabase Auth and Zod                                                                  | `supabase/config.toml`                             |
| XSS                       | React escaping; no `dangerouslySetInnerHTML`; CSP with `object-src 'none'`, `base-uri 'self'`                                                         | `next.config.ts`                                   |
| Clickjacking              | `frame-ancestors 'none'`, `X-Frame-Options: DENY`                                                                                                     | `next.config.ts`                                   |
| Secret exposure           | Server-only env module (`import "server-only"`); CI greps client bundles; gitleaks                                                                    | `src/lib/env/server.ts`, CI                        |
| Log leakage               | Logger redacts sensitive keys; only ids and codes are logged                                                                                          | `src/lib/observability/logger.ts`                  |
| Request header injection  | Request ids validated against a strict pattern                                                                                                        | `src/lib/security/request-id.ts`                   |
| Supply chain              | Exact-pinned direct dependencies, lockfile, `npm audit` in CI                                                                                         | `package.json`, CI                                 |

## Residual risks and open items

| Risk                                                                     | Status           | Plan                                                                                                                      |
| ------------------------------------------------------------------------ | ---------------- | ------------------------------------------------------------------------------------------------------------------------- |
| CSP allows `'unsafe-inline'` scripts (no nonces, so pages can prerender) | Accepted for now | Evaluate SRI hash-based CSP before launch ([ADR 0004](../decisions/0004-cache-components-and-static-csp.md))              |
| Client IP for rate limits comes from `x-forwarded-for`                   | Depends on host  | Confirm the hosting platform overwrites the header; otherwise IP limits are spoofable (email and user limits still apply) |
| Rate limiter fails closed                                                | By design        | Login/signup are refused while the DB is down, which is also when Auth is down                                            |
| Admin MFA not enforced in code yet                                       | Open             | TOTP is enabled in Auth config. Require `aal2` in `assertRole('admin')` once admin tools exist                            |
| No CAPTCHA on signup/login                                               | Open             | Add Supabase Auth CAPTCHA (Turnstile/hCaptcha) if abuse appears or before public launch                                   |
| Account deletion and export                                              | Open             | Build before public launch (legal requirement in many regions)                                                            |
| `rate_limits` rows are never purged                                      | Open             | Scheduled cleanup job                                                                                                     |
