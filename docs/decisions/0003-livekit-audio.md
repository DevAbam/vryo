# 0003 — LiveKit for audio spaces

- Status: accepted (implementation in Phase 4)
- Date: 2026-10-27

## Decision

Use LiveKit (cloud or self-hosted, chosen in Phase 4) for WebRTC audio rooms. VYRO's backend authorizes every join and issues short-lived, least-privilege tokens; listeners in stage mode receive `canPublish: false`. Room lifecycle is reconciled from verified, idempotently processed webhooks plus periodic reconciliation.

## Consequences

- Audio bandwidth never touches the Next.js servers.
- The LiveKit API secret is server-only.
- `Permissions-Policy` already allows the microphone for our own origin.
