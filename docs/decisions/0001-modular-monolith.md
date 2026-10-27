# 0001 — Modular monolith on Next.js + Supabase

- Status: accepted
- Date: 2026-10-27

## Context

VYRO targets tens of thousands of active users and has a small team. The spec (VYRO.md §2.1) recommends a modular monolith.

## Decision

One Next.js App Router application. Domain logic lives in `src/server/{services,repositories}` and `src/domains`; provider integrations live in `src/server/providers`. Supabase supplies Auth, Postgres (RLS), Storage and selective Realtime. Media planes are external: LiveKit for audio, the licensed provider's CDN for video.

## Consequences

- One deployable; simpler security review and operations.
- Module boundaries are a code-review rule rather than a network boundary. Avoid cross-domain imports except through services.
- A module is extracted only when measured load or team boundaries justify it.
