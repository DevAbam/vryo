# VYRO

Responsive football and basketball social platform: feed, authorized live-match streaming, live audio spaces and chat.

- **Engineering spec (binding):** [VYRO.md](VYRO.md)
- **Visual reference:** [ui_inspo.png](ui_inspo.png). It shows the mobile layout only; tablet, laptop and desktop layouts are designed separately (see [docs/architecture/overview.md](docs/architecture/overview.md#responsive-layout)).

## Status

| Phase | Scope                                                                     | State                                                                 |
| ----- | ------------------------------------------------------------------------- | --------------------------------------------------------------------- |
| 0     | Foundations: tooling, CI, docs, migrations                                | Done                                                                  |
| 1     | Identity and security: auth, profiles, roles, RLS, rate limits, audit log | Done. RLS suite and signed-in E2E pass against the hosted dev project |
| —     | Responsive app shell (all breakpoints)                                    | Done; pillars show honest empty states                                |
| 2     | Feed and social graph                                                     | Not started                                                           |
| 3     | Chat and notifications                                                    | Not started                                                           |
| 4     | Audio spaces (LiveKit)                                                    | Not started                                                           |
| 5     | Sports streaming (provider docs pending)                                  | Not started                                                           |
| 6     | Production hardening                                                      | Not started                                                           |

## Stack

Next.js 16 (App Router, Cache Components, `src/proxy.ts`) · React 19 · TypeScript strict · Tailwind CSS 4 · Supabase (Auth, Postgres + RLS) via `@supabase/ssr` · Zod · Vitest · Playwright + axe.

## Prerequisites

- Node.js 22.12+ and npm
- Docker Desktop (for the local Supabase stack)

## Local setup

```bash
npm install
npm run db:start                # starts local Supabase and applies supabase/migrations
npx supabase status -o env      # prints local URLs and keys
cp .env.example .env.local      # then fill in values from the command above
npm run db:types                # regenerate src/types/database.ts from the schema
npm run dev                     # http://localhost:3000
```

`.env.local` mapping from `supabase status -o env`:

| `.env.local`                           | from status                          |
| -------------------------------------- | ------------------------------------ |
| `NEXT_PUBLIC_SUPABASE_URL`             | `API_URL`                            |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | `PUBLISHABLE_KEY` (or `ANON_KEY`)    |
| `SUPABASE_SERVICE_ROLE_KEY`            | `SECRET_KEY` (or `SERVICE_ROLE_KEY`) |
| `RATE_LIMIT_SALT`                      | any long random string               |
| `NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT`    | ImageKit dashboard (optional)        |
| `IMAGEKIT_PRIVATE_KEY`                 | ImageKit dashboard (optional)        |

Confirmation and reset emails are captured locally by Mailpit at http://127.0.0.1:54324.

## Scripts

| Script                                                         | What it does                                                                                     |
| -------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| `npm run dev`                                                  | Dev server                                                                                       |
| `npm run build` / `start`                                      | Production build / serve                                                                         |
| `npm run check`                                                | Format check, lint, typecheck, unit tests, build                                                 |
| `npm test`                                                     | Unit tests                                                                                       |
| `npm run test:db`                                              | RLS and database tests (needs local Supabase + env)                                              |
| `npm run test:e2e`                                             | Playwright at 390 / 834 / 1280 / 1536 px with axe checks                                         |
| `npm run db:start` / `db:stop` / `db:reset`                    | Local Supabase lifecycle                                                                         |
| `npm run admin:role -- <handle> [--role moderator] [--revoke]` | Bootstrap staff roles (audited). Verification itself is done in the app at `/admin/verification` |
| `npm run db:types`                                             | Regenerate database types (CI fails on drift)                                                    |

To run the DB tests and the signed-in E2E flow, export the variables from `npx supabase status -o env` in your shell first.

## Layout

```
src/
  app/            routes: (public) landing, (auth) sign-in flows, (app) signed-in shell
  components/     ui/ primitives, shell/ navigation, auth/, profile/
  lib/            env, errors, logger, supabase clients, validation, security, rate-limit
  server/         actions/, services/, repositories/, providers/ (sports, livekit)
  proxy.ts        session refresh, request ids, auth redirects (UX only)
supabase/         config.toml, migrations/, seed.sql
tests/            unit/, rls/, e2e/
docs/             architecture/, decisions/, runbooks/
```

## Rules that matter most

- Authorization is enforced server-side and by RLS. The proxy and hidden buttons are UX only.
- `SUPABASE_SERVICE_ROLE_KEY` is used only in `src/lib/supabase/admin.ts`, for rate limiting and audit logging. Any new use needs a documented reason.
- Every schema change is a migration, and every table gets RLS plus a row in [the RLS matrix](docs/architecture/rls-matrix.md).
