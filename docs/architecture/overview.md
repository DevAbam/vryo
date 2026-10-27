# Architecture overview

VYRO is a **modular monolith**: one Next.js application with domain-separated modules, Supabase for auth/data/storage/realtime, LiveKit for audio, and the licensed sports provider's CDN for video. See [ADR 0001](../decisions/0001-modular-monolith.md).

```text
Browser ──HTTPS, HttpOnly session cookies──► Next.js (src/proxy.ts → pages / server actions / route handlers)
                                              │  validation (Zod) · authorization · rate limits · audit
                                              ├─► Supabase Auth
                                              ├─► Postgres (RLS on every table)
                                              ├─► Supabase Storage / Realtime        (Phase 2–3)
                                              ├─► LiveKit token issuer + webhooks    (Phase 4)
                                              └─► Sports provider adapter            (Phase 5)
```

## Request path

1. **`src/proxy.ts`** runs on every page, action and API request. It assigns or keeps an `x-request-id`, refreshes the Supabase session cookie (`getClaims()` verifies the JWT), and redirects signed-out users away from app routes. It is a UX gate only.
2. **Pages** render a static shell. Anything that reads the session sits behind `<Suspense>` (required by Cache Components; see [ADR 0004](../decisions/0004-cache-components-and-static-csp.md)). Each app page calls `requireViewer()`, which redirects to login, onboarding or the restricted page as appropriate.
3. **Server actions** (`src/server/actions`) validate input with Zod, call `assertUser()`, apply rate limits, perform the write through the user-scoped Supabase client (so RLS applies), then write an audit record where relevant.
4. **Repositories** (`src/server/repositories`) own queries. Services (`src/server/services`) own use-case logic and guards.

## Supabase clients

| Client               | File                         | Key          | RLS          | Use                             |
| -------------------- | ---------------------------- | ------------ | ------------ | ------------------------------- |
| Server (per request) | `src/lib/supabase/server.ts` | publishable  | applies      | all user-initiated reads/writes |
| Proxy                | `src/lib/supabase/proxy.ts`  | publishable  | applies      | session refresh only            |
| Browser              | `src/lib/supabase/client.ts` | publishable  | applies      | future realtime subscriptions   |
| Admin                | `src/lib/supabase/admin.ts`  | service role | **bypassed** | rate limiting, audit log only   |

## Responsive layout

`ui_inspo.png` defines the visual language (near-black surfaces, lime accent, red LIVE badges, pill chips) but shows mobile only. Layouts per breakpoint:

| Breakpoint       | Width       | Layout                                                                                                           |
| ---------------- | ----------- | ---------------------------------------------------------------------------------------------------------------- |
| mobile           | < 768px     | Top bar (avatar, wordmark, settings), Feed/Stream/Spaces tabs, single column, fixed bottom nav (as in the inspo) |
| tablet (`md`)    | 768–1023px  | Icon rail on the left replaces the bottom nav; tabs stay; wider column                                           |
| laptop (`lg`)    | 1024–1439px | Labelled sidebar · content column (40rem) · live rail (20rem). Tabs move into the sidebar                        |
| desktop (`desk`) | ≥ 1440px    | Same three columns with wider rails (18rem / 42rem / 24rem)                                                      |

Planned in later phases: the "watching a stream" view becomes player + chat side by side from `lg`, and "inside a space" becomes a centred stage from `lg`. Both will use their own route-group layout without the live rail.

Auth pages show a brand panel beside the form from `lg`.

## Error handling

`AppError` (`src/lib/errors`) carries a code from a fixed taxonomy and a user-safe message. Route handlers return `{ error: { code, message, requestId } }`. Server actions map errors to form state via `failure()`. Unexpected errors are logged with the request id and shown as a generic message.

## Observability

`src/lib/observability/logger.ts` writes one JSON line per event and redacts keys matching authorization/cookie/password/secret/token/api key/body. Error tracking, metrics and alerting arrive in Phase 6.
