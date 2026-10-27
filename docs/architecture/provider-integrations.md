# Provider integrations

## Sports streaming provider (Phase 5)

**Status: blocked on documentation.** The provider has been chosen but its API documentation has not been added to the repo yet.

`src/server/providers/sports/types.ts` defines a draft VYRO-owned interface (`SportsProvider`, `MatchSummary`, `PlaybackAccess`). Fields marked TBD will change once the real contract is known. No fake provider is wired into product paths.

Questions to answer from the docs and contract before implementation:

1. Authentication model for server-to-server calls (API key, OAuth client credentials, signed requests)?
2. Endpoints for competitions, fixtures, live status and scores; pagination model; rate limits?
3. Playback authorization: signed URLs, per-viewer tokens, DRM (Widevine/FairPlay)? Token lifetime?
4. Geo-restrictions: does the provider enforce them, or must we? Which territories are licensed?
5. Concurrent-viewer limits and how they are counted.
6. Webhooks for status changes? Signature scheme?
7. Caching terms: how long may schedules and metadata be cached?
8. CORS and allowed player origins; required player SDK?
9. Redistribution rights: may we show clips, thumbnails or crests?

## LiveKit (Phase 4)

Not yet configured. Planned: server-issued tokens with short TTL (≤ 10 min), `canPublish` only for host/speakers in stage mode, webhook receiver at `/api/webhooks/livekit` verified with the official SDK. See VYRO.md §8 and [ADR 0003](../decisions/0003-livekit-audio.md).

## Supabase

- Local: `supabase/config.toml`. Email confirmations on, minimum password length 10 with mixed case and digits, TOTP MFA enabled, refresh token rotation on.
- Hosted projects (staging/production) must mirror these Auth settings. They are not applied automatically from `config.toml`.
- Prefer asymmetric JWT signing keys so `getClaims()` verifies locally.
