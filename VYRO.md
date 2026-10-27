# VYRO — Production-Minded Technical Architecture & Implementation Specification

> **Purpose:** This document is the engineering source of truth for building VYRO, a responsive football and basketball social platform with a personalized feed, authorized live-match streaming, live audio spaces, and chat.
>
> **Audience:** Coding agent, engineers, reviewers, and operators.
>
> **Product constraints:** Tens of thousands of active users as the growth target; responsive web first; Next.js + Supabase preferred; LiveKit (or a justified equivalent) for audio; UI/visual design supplied separately.
>
> **Important:** No architecture can guarantee zero risk or zero downtime. This specification requires security controls, capacity testing, observability, backups, and recovery procedures designed to reduce risk and limit the impact of failures.

---

## 0. Instructions to the coding agent

1. Read this document before implementation. Treat it as a binding engineering specification, not a suggestion list.
2. Inspect the existing repository and preserve useful code. If no repository exists, create a clean, documented project.
3. The UI reference is provided separately. Follow it for visual styling, but do not let visual requirements override accessibility, security, responsiveness, or the contracts in this document.
4. Build in phases. Do not generate the whole application as one unreviewed change. After each phase, run formatting, linting, type checks, automated tests, and relevant security checks. Report what passed, failed, and remains incomplete.
5. Do not claim a feature is complete merely because a page renders. Completion requires the acceptance criteria in this document.
6. Do not invent details about the streaming provider. Read the supplied API documentation and build an isolated adapter around its actual contracts. Record unresolved questions rather than guessing.
7. Never put secrets in client bundles, source control, prompts, logs, screenshots, or test fixtures. Never use service-role keys or LiveKit API secrets in browser code.
8. Prefer stable, supported versions and pin them with the package manager lockfile. Record material architectural decisions in `docs/decisions/`.
9. If requirements conflict, prioritize security and data integrity, then this specification, then the supplied UI reference. Ask for clarification where a product decision is genuinely blocking.
10. Do not silently weaken RLS, authentication, validation, or tests to make a demo work.

## 1. Product scope

### 1.1 Core product areas

**For You feed**
- Football and basketball posts; text and permitted media attachments.
- Follow/unfollow users; like/unlike; comment/reply; repost/quote if included; bookmark; shareable post URLs.
- Chronological feed initially, with a replaceable ranking interface for future personalization.
- Cursor pagination, duplicate prevention, optimistic UI with rollback, loading/empty/error states.
- Report post/user, block user, mute user, and moderation enforcement.
- No unbounded feed queries and no N+1 queries.

**Stream**
- Discover matches, leagues, teams, schedules, status, and authorized stream playback using the supplied API.
- Display only streams and media that the platform is licensed/authorized to display.
- Keep provider-specific logic in a server-side adapter. Never expose provider credentials.
- Normalize provider data into VYRO-owned internal types. Do not let provider response formats leak across the application.
- Handle unavailable, delayed, expired, region-restricted, or failed streams gracefully.
- Cache schedules and match metadata where permitted. Do not cache protected stream URLs or tokens beyond the provider's terms and security needs.
- Do not proxy high-bandwidth video through Next.js. Playback should use the provider's authorized delivery mechanism/CDN.
- Check provider terms, concurrency limits, geoblocking, token expiry, CORS, DRM requirements, rate limits, and redistribution rights before production launch.

**Audio spaces**
- Stage format: host/moderators plus a controlled number of speakers and listeners.
- Open format: multiple participants may speak, subject to room limits and host/moderator controls.
- Create, discover, join, leave, end, and report spaces.
- Host controls: invite/approve/remove speakers, mute or remove participants where supported, lock room, transfer host role safely, and end space.
- Request-to-speak queue; clear speaker/listener status; capacity and abuse limits.
- Use LiveKit for WebRTC audio rooms unless an architecture review documents why a supported alternative is better.
- Backend authorizes every room join and issues short-lived, least-privilege LiveKit tokens. The browser must never receive LiveKit API secrets.
- Use provider webhooks/events for room lifecycle where appropriate, but verify webhook signatures and make event handling idempotent.
- Reconcile stale room metadata after crashes/disconnects. The database record is not proof that a media room is still active.
- Define retention and consent rules before introducing recording. Recording is off by default unless explicit product/legal approval changes this.

**Chat**
- One-to-one and group conversations.
- Message history, unread counts, optional typing indicators/read receipts, and safe notification delivery.
- Block/report controls; membership enforcement; group membership management.
- Message edits/deletes only if product rules define how they appear to participants and moderators.
- Attachments only through authorized storage paths with type/size validation and signed access where appropriate.
- Typing/presence are ephemeral and must not be persisted as durable messages.
- Messages are private to conversation members and explicitly authorized moderators/systems.

### 1.2 Cross-cutting requirements
- One identity and profile across all areas.
- Notifications with durable records and optional realtime delivery.
- Report, block, mute, rate-limit, and moderation enforcement capabilities.
- Admin/moderator tools protected by server-side role checks and audit logs.
- Accessibility, responsive behavior, localization-ready strings, and timezone-safe date handling.
- Clear terms/privacy notices, account deletion/export process as legally required, and a published content policy.
- Avoid collecting sensitive personal data unless required and justified.

### 1.3 Explicitly out of scope for the first release unless separately approved
- Native mobile apps.
- Complex ML recommendation models.
- User-created live video broadcasting (viewing provider streams is in scope; user broadcast is not).
- Payments, betting, gambling, or paid memberships.
- Recording audio spaces.
- End-to-end encrypted chat. Do not claim E2EE unless it is actually implemented and independently reviewed.

## 2. Architecture decision

### 2.1 Recommended initial architecture: modular monolith

Use a single Next.js application with clearly separated domain modules, Supabase-managed services, and dedicated media infrastructure. Do not begin with microservices. At the target scale, a well-designed modular monolith is simpler to secure and operate. Extract a module only when measured traffic, team boundaries, or deployment needs justify it.

### 2.2 Logical architecture

```text
Browser (responsive web)
  |
  | HTTPS; secure session cookies
  v
Next.js application (server components, server actions/API routes as appropriate)
  |-- Authentication/session verification
  |-- Domain services and authorization
  |-- Input validation and rate limiting
  |-- Feed / profiles / moderation / chat APIs
  |-- Stream-provider adapter
  |-- LiveKit token issuer + webhook handler
  |
  +--> Supabase Auth
  +--> PostgreSQL (source of truth; RLS)
  +--> Supabase Storage (media, controlled policies)
  +--> Supabase Realtime (selected low-volume authorized events)
  +--> LiveKit (WebRTC audio media plane)
  +--> Authorized sports streaming provider/CDN (video media plane)
  +--> Optional job queue/worker and cache when justified
  +--> Logs, metrics, traces, alerts, error tracking
```

### 2.3 Technology choices

- **Web:** Next.js App Router, React, TypeScript with strict mode.
- **Validation:** A maintained schema validator such as Zod at all untrusted boundaries.
- **Database/auth/storage/realtime:** Supabase (PostgreSQL, Supabase Auth, Storage, selective Realtime).
- **Database changes:** SQL migrations committed to version control; never rely on manual production edits.
- **Audio:** LiveKit, with server-side token creation and short-lived participant permissions.
- **Sports data/video:** adapter for the actual supplied provider API; playback served by provider infrastructure/CDN.
- **Testing:** unit, integration, RLS/authorization, browser E2E, accessibility, load, and security tests.
- **Deployment:** managed Next.js-compatible hosting plus Supabase managed project, with separate development, staging, and production environments.
- **Observability:** structured logs, exception reporting, metrics, tracing where practical, uptime checks, and alert routing.
- **Optional Redis/cache/queue:** introduce only for a defined requirement (e.g. distributed rate limits, expensive repeated reads, background work). Do not add infrastructure without an operational owner and failure plan.

Pin versions at implementation time; check current official documentation before choosing versions or deprecated APIs.

### 2.4 Server/client boundary

- Server-side code owns privileged operations and secrets.
- Browser code may use the Supabase publishable/anon key only with correctly configured RLS and intended public access.
- The Supabase service-role/secret key bypasses RLS: server-only, tightly scoped, never shipped to the browser.
- Never treat hiding a button or a client-side role value as authorization.
- Verify the current user on the server for sensitive mutations. Enforce access again in database policies where supported.
- Use server-side data access for operations that require privileged provider credentials or complex authorization.
- Do not build generic SQL/RPC endpoints that allow clients to select arbitrary tables, columns, or operations.

## 3. Repository structure

Use a structure comparable to the following. Adjust to the chosen Next.js conventions, but preserve domain boundaries.

```text
src/
  app/
    (public)/
    (auth)/
    (app)/
      feed/
      stream/
      spaces/
      chat/
      profile/
      settings/
    api/
      feed/
      posts/
      comments/
      follows/
      conversations/
      messages/
      notifications/
      spaces/
      stream/
      reports/
      webhooks/
  components/
    ui/                 # visual components guided by supplied UI reference
    feed/
    stream/
    audio/
    chat/
  domains/
    auth/
    profiles/
    feed/
    posts/
    follows/
    comments/
    media/
    stream/
    spaces/
    chat/
    notifications/
    moderation/
  lib/
    supabase/
    validation/
    security/
    rate-limit/
    observability/
    errors/
  server/
    services/
    repositories/
    providers/
      sports/
      livekit/
    jobs/
  types/
  tests/
supabase/
  migrations/
  seed.sql
docs/
  architecture/
  decisions/
  runbooks/
```

Rules:
- UI components must not contain database authorization logic.
- Domain services implement use cases; repositories own data access.
- Provider adapters translate external APIs into internal domain types.
- Do not expose database-generated types as the only validation for HTTP input.
- Avoid circular dependencies between domains.
- Avoid giant route files, duplicated validation, untyped `any`, and catch-all error swallowing.
- Generate and maintain database types from migrations/schema, and validate generated output in CI.

## 4. Identity, authentication, and authorization

### 4.1 Authentication
- Use Supabase Auth with a supported secure session flow for Next.js.
- Follow current Supabase SSR guidance. Use secure, HttpOnly cookies where appropriate; set `Secure` in production and an appropriate `SameSite` policy.
- Do not store long-lived access/refresh tokens in localStorage.
- Protect session refresh and logout paths. Never log credentials or tokens.
- Validate email/password flows, password reset tokens, email verification, and session revocation behavior.
- Consider CAPTCHA or bot protection on public signup/login/reset endpoints when abuse appears or launch risk warrants it.
- Add MFA for administrative accounts; require stronger controls for privileged operators.
- If OAuth is enabled, validate callback state and redirect allowlists.

### 4.2 Authorization
- Enforce least privilege: default deny.
- Model roles explicitly. Suggested platform roles: `user`, `moderator`, `admin`. Use separate membership/role tables or trusted server-managed claims; users must never self-assign privileged roles.
- Conversation membership, space membership/roles, ownership, and moderation permissions must be checked server-side.
- For sensitive writes, verify both identity and resource relationship, not just that a user is signed in.
- Protect against IDOR: changing a post, conversation, message, or room ID must not reveal or mutate another user's data.
- Admin functions must use explicit server-side guards and audit logging.
- For actions that require elevated database privileges, use narrowly scoped server functions and validate all inputs; never expose the service-role key.

## 5. Data model

Use UUID primary keys unless a documented reason supports another type. Include `created_at`/`updated_at` where relevant, use UTC timestamps, and add indexes based on actual query patterns. Use foreign keys and appropriate delete behavior. Define all constraints in migrations.

The following is a logical model, not a demand to copy every column blindly. Before implementation, document precise column types, unique constraints, foreign keys, and retention behavior.

### 5.1 Identity and profiles
- `profiles`: `id` (equals `auth.users.id`), `handle` (unique, normalized), `display_name`, `bio`, `avatar_path`, `created_at`, `updated_at`, `status`.
- `user_roles`: user ID, role, assigned by, created at. Writes restricted to trusted server/admin workflows.
- `user_blocks`: `blocker_id`, `blocked_id`, `created_at`; unique pair; prevent self-block.
- `user_mutes`: `muter_id`, `muted_id`, `created_at`; unique pair.
- Optional `user_preferences`: feed preferences, notification preferences, locale/timezone; never trust preferences as authorization.

### 5.2 Posts and social graph
- `posts`: `id`, `author_id`, `body`, `visibility`, `status`, optional `quoted_post_id`, `created_at`, `updated_at`, `deleted_at`.
- `post_media`: `id`, `post_id`, `storage_path`, media type, size, dimensions/duration if applicable, processing status, created at.
- `follows`: `follower_id`, `followed_id`, `created_at`; unique pair; prevent self-follow.
- `post_likes`: `user_id`, `post_id`, `created_at`; unique pair.
- `post_bookmarks`: `user_id`, `post_id`, `created_at`; unique pair.
- `post_reposts` if supported: `user_id`, `post_id`, optional quote post ID, `created_at`; unique rule explicitly defined.
- `comments`: `id`, `post_id`, `author_id`, optional `parent_comment_id`, `body`, `status`, `created_at`, `updated_at`, `deleted_at`.
- `reports`: `id`, `reporter_id`, target type and target ID (or normalized target references), reason, details with length limits, status, reviewer ID, resolution, timestamps. Restrict read access.
- `moderation_actions`: actor, target, action, reason, expiry, related report, timestamp. Append-only to normal users; audit privileged changes.
- Use counter caches only if needed. If present, update atomically through a transaction/RPC/trigger designed for concurrency, and provide reconciliation tooling. Do not trust client-submitted like/comment counts.

### 5.3 Streaming catalogue
- `sports_entities`: provider-independent teams/leagues/competitions as required.
- `matches`: internal ID, provider ID, sport, competition/team references, start time, status, last provider sync, metadata.
- `stream_assets` or equivalent: match ID, provider reference, availability/status, permitted playback metadata only if policy permits. Do not persist secrets or protected playback URLs unnecessarily.
- Cache provider responses according to provider terms. Store only fields needed for the product.
- Use unique constraints on provider ID + provider namespace. Make sync jobs idempotent.
- Define stale-data behavior, provider timeouts, and circuit-breaker/backoff policy.

### 5.4 Audio spaces
- `spaces`: `id`, `host_id`, title, topic, mode (`stage`/`open`), status (`scheduled`/`live`/`ended`), visibility, capacity, `livekit_room_name` (non-secret identifier), started/ended times, timestamps.
- `space_participants`: `space_id`, `user_id`, role (`host`/`moderator`/`speaker`/`listener`), status, joined/left times; unique active membership policy.
- `space_speaker_requests`: `space_id`, `user_id`, status, created/decided times, decided by.
- `space_moderation_events`: room, actor, target, action, reason, timestamp.
- Validate capacity and role transitions atomically. Prevent a former host from retaining host privileges after ownership transfer.
- Room names should be unguessable or opaque, but secrecy of a room name is not authorization.

### 5.5 Chat
- `conversations`: `id`, type (`direct`/`group`), created_by, title where relevant, timestamps.
- `conversation_members`: `conversation_id`, `user_id`, role, joined_at, muted/left state as product requires. Index membership lookups.
- `messages`: `id`, `conversation_id`, `sender_id`, body or structured content, status, created_at, edited_at, deleted_at. Use pagination and appropriate content limits.
- `message_attachments`: `id`, `message_id`, storage path, type, size, scan/processing status.
- Optional `message_receipts` and `conversation_user_state` for read cursor/unread state. Avoid one row per read event if a per-user last-read cursor is sufficient.
- `message_reports` or generic reports with carefully restricted access.
- Enforce direct-conversation uniqueness through a robust canonical participant key or dedicated direct-conversation mapping. Do not rely on a race-prone client-side “check then insert.”
- A sender must be an active member of the conversation. Leaving a group must revoke future access according to the product's explicit history policy.

### 5.6 Notifications and background work
- `notifications`: recipient, type, actor/resource references, read time, created time, deduplication key where applicable.
- `outbox_events` or an equivalent reliable event/outbox pattern for actions that must trigger side effects (e.g. notification delivery) without losing them between database commit and job execution.
- `job_runs`/provider sync metadata where operationally useful.
- Do not rely on in-memory process state for durable work. Jobs must be retryable, idempotent, observable, and have bounded retry/backoff and a dead-letter/manual-recovery path.

### 5.7 Indexing and data integrity
At minimum, evaluate and test indexes for:
- `profiles(handle)`.
- `posts(created_at DESC, id DESC)`, `posts(author_id, created_at DESC, id DESC)`, plus status/visibility filters used by feed queries.
- `follows(follower_id, followed_id)` and reverse lookups where needed.
- Unique `post_likes(user_id, post_id)`, `post_bookmarks(user_id, post_id)`.
- `comments(post_id, created_at, id)`.
- `messages(conversation_id, created_at DESC, id DESC)`.
- `conversation_members(user_id, conversation_id)` and `conversation_members(conversation_id, user_id)`.
- `notifications(recipient_id, created_at DESC, id DESC)` and unread queries.
- `space_participants(space_id, status)` and `spaces(status, created_at DESC)`.
- Provider IDs and sync lookup columns.
Use `EXPLAIN (ANALYZE, BUFFERS)` on representative staging queries. Do not add every conceivable index: indexes consume storage and increase write costs.

## 6. Row Level Security (RLS) and database rules

### 6.1 Required policy principles
- Enable RLS on every table exposed through Supabase's API schemas.
- Every table must have an explicit policy matrix documented in `docs/architecture/rls-matrix.md`.
- Default-deny. Add only the specific `SELECT`, `INSERT`, `UPDATE`, and `DELETE` policies needed.
- A policy for `SELECT` does not authorize writes; each operation must be considered independently.
- Use `auth.uid()` and verified resource relationships where appropriate.
- Never rely solely on client filtering to hide private rows.
- Never permit users to update their own role, moderation status, verification status, ownership, or other privileged fields.
- Ensure users cannot forge `author_id`, `sender_id`, `created_at`, counts, role, status, or moderator decisions through mass assignment.
- Review security-definer functions: set a safe `search_path`, minimize grants, validate arguments, and avoid unintended privilege escalation.
- Test policies as anonymous users, user A, user B, a moderator, and an admin in automated integration tests.
- Service-role operations bypass RLS; every use requires a documented reason, server-only location, and independent authorization.

### 6.2 Suggested access matrix (must be made precise in SQL)
- Profiles: public profile fields may be readable according to product visibility; private settings visible only to owner and explicitly authorized systems.
- Posts/comments: readable only when visibility/status permits and the viewer is not blocked or otherwise excluded; author may edit/delete their own content within policy; moderators act through audited privileged paths.
- Likes/bookmarks: users may create/remove their own; bookmarks private to owner.
- Follows: read/write rules defined explicitly; users cannot follow themselves.
- Reports/moderation actions: reporters can see only their own report status if product requires; only authorized moderators can access report details; ordinary users cannot read internal moderation actions.
- Conversations/members/messages: only active authorized conversation members may read; only active members may send; only authorized members may manage membership; sender/author fields must match `auth.uid()`.
- Spaces: public live-space discovery can expose public metadata; membership changes and role changes require authorization; only host/moderators can perform room controls; token issuance has separate server checks.
- Notifications: recipient only.
- Provider sync, job, outbox, audit, and privileged tables: not exposed to ordinary clients.
- Storage: bucket/object policies must match the same visibility and membership rules as database records.

### 6.3 Storage
- Use separate buckets or clearly isolated paths for public profile media, post media, and private chat attachments.
- Validate MIME type, extension, size, and actual file content where possible. Do not trust browser-supplied MIME type.
- Restrict upload paths to the authenticated user's permitted namespace or a server-issued upload record.
- Use signed URLs for private media with short expiry; do not store signed URLs as durable references.
- Consider malware scanning, image re-encoding, EXIF stripping, and video transcoding through a controlled worker when supported/needed.
- Prevent arbitrary object overwrite and cross-user path access.
- Set quotas and rate limits. Define orphaned upload cleanup.

## 7. API and domain contracts

Use versioned, documented JSON contracts for public APIs where appropriate. Internal server actions may be used for tightly scoped UI operations, but the same validation, authorization, error, and rate-limit requirements apply. Generate an OpenAPI document for route-based APIs where practical.

### 7.1 Common API conventions
- Use standard HTTP methods/status codes and consistent error bodies.
- Validate every input at the boundary; reject unknown or privileged fields.
- Apply request body size limits, pagination limits, and content length limits.
- Use cursor pagination for feeds, comments, messages, and notifications. Prefer stable compound cursors such as `(created_at, id)`; avoid large offsets.
- Use idempotency keys for operations that may be retried and could otherwise duplicate a side effect.
- Return only fields the requester is authorized to see.
- Use optimistic concurrency or version checks where simultaneous updates can conflict.
- Never return stack traces, secrets, SQL details, internal provider credentials, or raw sensitive provider errors.
- Add request IDs and trace/correlation IDs to logs and safe error responses.

Example error contract:

```json
{
  "error": {
    "code": "RESOURCE_NOT_FOUND",
    "message": "The requested resource was not found.",
    "requestId": "server-generated-id"
  }
}
```

### 7.2 Suggested endpoint surface

The final routes may differ, but equivalent use cases and authorization must exist.

| Method | Route | Purpose |
|---|---|---|
| GET | `/api/feed?cursor=...&limit=...` | Feed page |
| POST | `/api/posts` | Create post |
| GET | `/api/posts/:postId` | Read authorized post |
| PATCH | `/api/posts/:postId` | Edit own post |
| DELETE | `/api/posts/:postId` | Delete own post |
| POST/DELETE | `/api/posts/:postId/like` | Like/unlike idempotently |
| POST/DELETE | `/api/posts/:postId/bookmark` | Bookmark/unbookmark |
| GET/POST | `/api/posts/:postId/comments` | List/create comments |
| POST/DELETE | `/api/users/:userId/follow` | Follow/unfollow |
| GET | `/api/stream/matches` | Cached/normalized match catalogue |
| GET | `/api/stream/matches/:matchId` | Match details and availability |
| POST | `/api/spaces` | Create a space |
| POST | `/api/spaces/:spaceId/join` | Authorize membership and issue media token |
| POST | `/api/spaces/:spaceId/leave` | Leave room |
| POST | `/api/spaces/:spaceId/speaker-requests` | Request speaker role |
| POST | `/api/spaces/:spaceId/moderation` | Host/moderator control action |
| POST | `/api/spaces/:spaceId/end` | End a space, host/moderator only |
| GET | `/api/conversations` | List caller's conversations |
| POST | `/api/conversations` | Create/get direct conversation or group |
| GET/POST | `/api/conversations/:id/messages` | List/send messages |
| PATCH | `/api/conversations/:id/read-state` | Update read cursor |
| GET | `/api/notifications` | List caller's notifications |
| PATCH | `/api/notifications/:id` | Mark own notification read |
| POST | `/api/reports` | Report content/user/space/message |
| POST/DELETE | `/api/users/:userId/block` | Block/unblock user |
| POST | `/api/webhooks/livekit` | Verified LiveKit event receiver |
| POST | `/api/webhooks/sports-provider` | Only if provider supports authenticated webhooks |

Do not create endpoints solely because they are listed. Use the simplest safe interface that fits the chosen architecture.

### 7.3 Mutation behavior
- Validate body and path parameters.
- Authenticate and authorize against the target resource.
- Enforce block/mute/visibility rules.
- Apply rate limits and spam checks.
- Execute the durable database mutation transactionally where possible.
- Commit before emitting non-transactional notifications; use an outbox/job for important side effects.
- Return canonical persisted state. Do not treat optimistic client state as authoritative.
- Make likes, follows, bookmarks, joins, and retries idempotent where practical.

### 7.4 Feed behavior
- First release: chronological or simple recency-based ranking with explicit visibility and block rules.
- Use a feed service abstraction so ranking can evolve without changing the UI/API contract.
- Cursor pagination; cap page size (for example, 20–50, with a hard server maximum).
- Fetch required author/media/interaction summaries efficiently; avoid one query per post.
- Do not calculate every user's full personalized feed on every request using unbounded joins.
- Start with indexed queries and measured caching. Consider fan-out-on-write or hybrid feed generation only after profiling. Very high-follower accounts may need a different strategy.
- Avoid invalidating a global cache on every like. Use bounded cache lifetimes and clear invalidation rules.
- Apply deletion, moderation, privacy, and blocking rules even when cached data exists.

### 7.5 Realtime behavior
- Use Supabase Realtime selectively for relevant updates, not as a broadcast channel for every event to every user.
- Authorize each subscription/channel; never place secrets in channel names and do not assume an obscure channel name is secure.
- Persist durable messages/notifications in Postgres before notifying clients.
- Clients must recover after reconnect by fetching from the durable cursor; realtime is a delivery optimization, not the source of truth.
- Handle duplicate, late, and out-of-order events.
- Add subscription cleanup, backoff, and connection-state UI. Avoid opening a new subscription on every component render.
- Load-test concurrent subscriptions and event throughput against the selected Supabase plan and actual project limits.

## 8. LiveKit audio implementation

### 8.1 Token flow
1. Authenticated user requests to join a VYRO space.
2. Server loads the space and membership/role state.
3. Server checks space status, ban/block rules, capacity, age/consent policy if applicable, and whether the user is allowed to listen or publish audio.
4. Server creates a short-lived LiveKit token with the minimum necessary room and publish/subscribe permissions.
5. Client joins LiveKit using that token.
6. Host/moderator actions are authorized by VYRO's backend and reflected in both durable VYRO state and the media provider.
7. On disconnect/end, update membership state reliably and reconcile stale sessions.

### 8.2 Audio controls and capacity
- Stage mode: listeners cannot publish audio unless promoted/approved.
- Open mode: publishing is permitted only while room policy allows it; still enforce room capacity and moderation controls.
- Set a documented maximum participant count per mode based on tested service limits and cost.
- Define host transfer, host disconnect, reconnect grace period, speaker demotion, room locking, and forced room termination.
- Do not rely solely on client UI to prevent publishing; use server-issued media permissions and provider-side enforcement.
- Never log tokens or include them in analytics/error payloads.

### 8.3 Webhooks and consistency
- Verify LiveKit webhook signatures using the official SDK/current documentation.
- Treat webhook delivery as at-least-once: handlers must be idempotent.
- Validate event age/replay considerations where supported.
- Do not trust a browser's claim that a participant joined or left.
- Use periodic reconciliation or event-driven cleanup to handle process crashes and lost disconnect events.

## 9. Sports streaming provider integration

### 9.1 Adapter boundary
Define a typed internal interface, for example:

```ts
interface SportsProvider {
  listMatches(input: MatchQuery): Promise<MatchPage>;
  getMatch(providerMatchId: string): Promise<MatchDetails | null>;
  getPlaybackAccess(input: PlaybackRequest): Promise<PlaybackAccess>;
}
```

The names and return types must be adapted to the actual provider documentation. `PlaybackAccess` must not be returned to users unless authorized and safe for the client; provider secrets remain server-side.

### 9.2 Operational controls
- Use bounded timeouts, retry only safe/idempotent calls, exponential backoff with jitter, and a circuit breaker or equivalent failure protection.
- Respect provider rate limits, cache headers, licensing terms, and concurrent-session restrictions.
- Use cached match catalogue data when the provider is temporarily unavailable; clearly label stale data if meaningful.
- Do not repeatedly poll the provider from each user's browser.
- Separate match metadata refresh from per-viewer playback authorization.
- Protect against SSRF: never accept arbitrary provider URLs from user input. Use fixed configured base URLs and allowlisted hosts.
- Validate provider responses; treat upstream data as untrusted.
- Redact playback tokens and sensitive query parameters from logs.
- Test token expiry, unavailable streams, geo restrictions, provider timeout, invalid payloads, rate limits, and API outage.
- Confirm the provider allows the expected number of concurrent viewers and target countries before launch.

## 10. Security threat model

Maintain `docs/architecture/threat-model.md` and update it as features change. At minimum, address:

| Threat | Required controls |
|---|---|
| Cross-user data exposure / IDOR | RLS, server authorization, relationship checks, negative tests |
| Privilege escalation | Server-managed roles, protected fields, admin MFA, audit logs |
| Credential/session theft | Secure cookies, TLS, token hygiene, session revocation, no tokens in logs |
| SQL injection | Parameterized queries, safe ORM/client APIs, no unsafe SQL string concatenation |
| XSS / stored malicious content | Context-aware output escaping, safe Markdown/URL handling, restrictive CSP where feasible |
| CSRF | Appropriate cookie policy, origin checks/CSRF defenses for cookie-authenticated mutations |
| Brute force / account enumeration | Rate limits, generic auth errors where appropriate, bot protection |
| Spam and scraping | Per-user/IP/device-aware limits, quotas, abuse detection, bounded public APIs |
| Malicious uploads | Type/size/content validation, private paths, scanning/re-encoding where appropriate |
| Realtime leakage | Channel authorization, private events, reconnect authorization |
| Chat privacy violation | Membership-based RLS, tests for former/nonmembers, private attachment policy |
| Audio token abuse | Short TTL, least privilege, server authorization, secret protection |
| Forged webhooks | Signature verification, idempotency, timestamp/replay controls where supported |
| Provider outage / API abuse | Cache, timeout, backoff, circuit breaker, quotas |
| Resource exhaustion | Query limits, pagination caps, request body limits, concurrency/load tests |
| Supply-chain compromise | Lockfile, dependency updates, audit, secret scanning, minimal packages |
| Insider/admin misuse | Least privilege, MFA, audit trails, documented access and incident response |
| Data loss / accidental deletion | Automated backups/PITR where available, restore drills, migrations, deletion safeguards |
| Cache serving unauthorized content | Correct cache keys, short TTLs, never shared-cache private data without safe user partitioning |
| Denial of service | Edge protections, rate limits, budgets/alerts, bounded expensive operations |

### 10.1 Mandatory baseline controls
- TLS everywhere; HSTS and suitable security headers in production.
- Content Security Policy designed and tested with the selected hosting/UI setup.
- Validate and normalize all input; encode output; sanitize any supported rich text.
- No secrets in client bundles, public environment variables, repository, error messages, or logs.
- Keep dependencies updated; run dependency and secret scanning in CI.
- Separate environments and credentials. Never test with production secrets in local development.
- Limit admin access; MFA required for privileged accounts.
- Define data retention and account deletion behavior.
- Run a pre-launch security review and test RLS/authorization from multiple user identities.
- Establish an incident response contact and credential rotation procedure.

## 11. Rate limits, abuse prevention, and moderation

Implement rate limiting at more than one layer where appropriate: edge/platform controls plus application-level per-user limits for sensitive operations. Use a distributed limiter if traffic spans multiple application instances; do not rely on in-memory counters in serverless deployments.

Create documented configurable limits for:
- Login/signup/password reset attempts.
- Post/comment creation, likes/follows, reports, and search.
- Message send rate and maximum message size.
- Space creation/join/speaker requests and moderation actions.
- Stream access/token issuance and provider requests.
- Upload count, file size, and storage quota.
- Public profile/feed endpoints where scraping is a risk.

Limits should be configurable and informed by load tests and abuse patterns, not arbitrary hard-coded values scattered across the codebase. Return `429` with a safe retry hint when appropriate.

Moderation requirements:
- Report reasons and clear user-facing reporting flows.
- Block/mute behavior consistently applied across feed, search, comments, chat, notifications, and spaces.
- Moderator queue with status, assignee, reason, evidence references, and resolution history.
- Audited actions: content removal, temporary restrictions, suspension, ban, and appeal/review path if supported.
- Prevent reported users from accessing internal report details.
- Moderation actions must be server-authorized, idempotent where appropriate, and logged without unnecessarily retaining sensitive message content.
- Rate-limit malicious or retaliatory reporting.
- Publish community rules and define an escalation path for credible threats or illegal content.
- Do not introduce automated content moderation that permanently punishes users without review and documented policy.

## 12. Scalability and performance plan

### 12.1 Design assumptions
“Tens of thousands of active users” is not a sufficient capacity specification by itself. Before launch, define expected peak concurrent users, peak requests/second, feed reads/writes, concurrent live video viewers, concurrent audio participants, message rate, and geographic distribution. Video/audio concurrency and bandwidth are governed substantially by their providers, not just Next.js.

Create a capacity worksheet in `docs/architecture/capacity-plan.md` and record assumptions. Test the busiest realistic workload and a failure scenario.

### 12.2 Scale practices
- Use a managed Next.js deployment that can scale horizontally and supports the required streaming/realtime behavior.
- Keep app instances stateless. Do not store durable sessions, room state, or jobs only in process memory.
- Use pooled database connections and follow the current Supabase/hosting guidance for serverless connection patterns.
- Avoid long-running work in request handlers. Use a durable queue/worker for imports, media processing, provider synchronization, and retries.
- Paginate every unbounded list; cap page sizes and request sizes.
- Add indexes from measured query plans.
- Cache public, safe-to-share data (e.g. match catalogue) with explicit TTL/invalidation. Do not shared-cache private chat, user-specific feed data, or authorization results without a rigorously correct key and policy.
- Use Realtime only where it adds user value. Reconcile missed events with durable reads.
- Use a queue/outbox for important notifications and background effects.
- Protect expensive provider integrations with caching, concurrency limits, timeout budgets, and circuit breakers.
- Add CDN/media transformations and object storage delivery as appropriate; do not route media bytes through application servers unnecessarily.
- Apply backpressure and graceful degradation when providers or optional features fail.
- Establish resource/cost alerts before launch.

### 12.3 Initial performance targets (validate and adjust)
These are initial targets, not guarantees:
- Standard read API: p95 under 300 ms at target load, excluding third-party/provider latency.
- Standard mutation API: p95 under 500 ms at target load, excluding third-party/provider latency.
- No unbounded query or endpoint.
- No sustained database saturation or connection exhaustion during the agreed peak-load test.
- Realtime reconnect must recover missed durable data.
- Main navigation and core feed should remain usable when audio, streaming metadata provider, or notification delivery is degraded.
- Define Web Vitals goals with the supplied UI and realistic media; target good Core Web Vitals on representative devices/network conditions.
- Establish explicit availability SLOs and alert thresholds before production. Do not advertise an uptime guarantee that the provider plans cannot support.

### 12.4 Load testing
Run tests against staging using synthetic users and realistic data volume:
- Feed browsing and pagination.
- Concurrent likes/comments/follows on hot posts.
- Chat sends and history pagination in many conversations.
- Realtime connections and burst event delivery.
- Space joins/leaves and role changes.
- Match catalogue reads and provider outage behavior.
- Authentication bursts and rate-limit enforcement.
- Database failover/connection pressure to the extent supported by the environment.
Report throughput, p50/p95/p99 latency, error rate, saturation, and cost-sensitive bottlenecks. Do not run destructive load tests against production without explicit approval.

## 13. Error handling and resilience

- Use a typed internal error taxonomy and consistent external error responses.
- Fail closed for authorization and token issuance.
- Use bounded retries with jitter; never retry non-idempotent operations blindly.
- Use timeouts for every external dependency.
- Circuit-break failing providers where useful; return a graceful unavailable state.
- Distinguish user-correctable validation errors from transient server failures.
- Add idempotency and reconciliation for jobs/webhooks.
- Do not swallow exceptions or return success when a write failed.
- Avoid cascading failure: optional notification delivery must not prevent a committed post/message from being accepted.
- Define degraded modes: cached match catalogue, reconnecting chat/audio, and explicit stream-unavailable states.
- Keep database transactions short; do not hold a transaction open while waiting on external HTTP calls.

## 14. Observability and operations

### 14.1 Logs
- Structured JSON logs with timestamp, severity, environment, request ID, route/domain, and safe actor/resource identifiers.
- Redact authorization headers, cookies, passwords, reset tokens, LiveKit tokens/secrets, provider playback credentials, private message bodies, and unnecessary personal data.
- Set retention and access controls for logs.
- Use correlation IDs across application and job execution.

### 14.2 Metrics and alerts
Track:
- Request volume, latency percentiles, error rate, rate-limit responses.
- Database CPU/connection saturation/query latency and pool wait.
- Realtime connections, subscription failures, reconnects, and event delays.
- Chat send success/failure and queue lag.
- LiveKit token issuance failures, room join/leave discrepancies, webhook failures.
- Sports provider latency, error/timeout/rate-limit rates, cache hit ratio, and stale catalogue age.
- Job queue depth, retries, dead-letter count, and job age.
- Upload failures, storage growth, and moderation queue age.
- Cost/resource usage and backup status.

Alert on actionable symptoms and assign an owner/runbook. Avoid alert floods. Verify alerts through a test notification before launch.

### 14.3 Error tracking and tracing
- Use a maintained error monitoring solution with source maps protected from public access.
- Scrub sensitive data before sending exceptions.
- Add traces around slow database operations and external calls where supported.
- Track release/version and deployment metadata to correlate regressions.

### 14.4 Runbooks
Create runbooks for:
- Database unavailable/connection exhaustion.
- Supabase Auth or Realtime degradation.
- Sports provider outage or credential expiry.
- LiveKit outage/token abuse.
- Queue backlog or repeated job failure.
- Suspected account compromise or leaked secret.
- Unauthorized data exposure.
- Failed migration and rollback/recovery.
- Restore from backup.
- High-cost/high-traffic incident.

## 15. Backups, migrations, and disaster recovery

- Enable the backup/PITR capability appropriate to the chosen Supabase plan and verify its retention and recovery-point limits against business needs.
- Confirm whether storage objects are covered by the same backup plan; do not assume database backups restore media objects.
- Define and document Recovery Point Objective (RPO) and Recovery Time Objective (RTO) before launch.
- Run a restore drill in a separate environment before production and on a regular schedule.
- Version every schema change. Review migrations for locks, table rewrites, and backwards compatibility.
- Prefer expand/migrate/contract for risky schema changes: add compatible schema, deploy code that supports both forms, backfill, then remove old schema in a later release.
- Never edit production schema manually without an emergency change record and a matching migration.
- Take additional backups before high-risk migrations where supported.
- Use staged rollout/rollback for application deployments; understand that database migrations may not be safely reversible.
- Maintain a credential rotation plan and ensure backups are access-controlled.
- Define deletion propagation and retention for user data, media, logs, reports, and backups according to policy/law.
- Record and test the recovery process, not merely the fact that backups are enabled.

## 16. Testing and quality gates

### 16.1 Required layers
1. **Unit tests:** domain logic, validation, permission decisions, ranking, rate-limit rules.
2. **Integration tests:** repositories, transactions, provider adapters, job handlers, idempotency.
3. **RLS tests:** anonymous and multiple authenticated identities; positive and negative cases for every sensitive table.
4. **API tests:** schema validation, auth, authorization, error contracts, pagination, rate limits.
5. **E2E tests:** signup/login, profile, feed, post interactions, stream discovery/playback failure, create/join/leave/moderate audio space, direct/group chat, block/report.
6. **Accessibility tests:** keyboard navigation, labels, focus management, contrast and screen-reader semantics; supplement automation with manual review.
7. **Performance/load tests:** target workload and overload behavior.
8. **Security checks:** dependency audit, secret scan, static analysis where available, common web vulnerability review.
9. **Migration tests:** apply migrations to a clean database and test upgrade path from the previous supported schema.

### 16.2 CI gates
Every pull request must pass:
- Formatting and lint.
- TypeScript strict type check.
- Unit/integration tests.
- Migration/schema checks.
- RLS/security tests.
- Dependency and secret scanning.
- Build.
- E2E smoke tests on staging or a representative CI environment where practical.

Do not ignore failures or add blanket lint/test suppressions to ship faster. Any justified exception must be documented with an owner and expiry.

### 16.3 Minimum test identities
Test as:
- Anonymous visitor.
- User A, normal user.
- User B, unrelated user.
- Blocked user.
- Former conversation member.
- Space listener.
- Space speaker.
- Space host.
- Space moderator.
- Suspended/limited user.
- Platform moderator/admin.

Include attempts to access another user's private messages, change another user's post, self-promote to moderator, join a full/ended/locked space, publish audio as a listener, forge sender/author IDs, and replay webhook events.

## 17. Deployment and environment management

### 17.1 Environments
Maintain separate development, staging, and production environments, including separate Supabase projects and provider credentials where possible.
- Development uses seeded, synthetic data.
- Staging mirrors production configuration and access policies without production secrets/data unless explicitly approved and appropriately protected.
- Production credentials are stored only in the hosting/provider secret manager.
- Do not copy real user data to local machines for routine debugging.

### 17.2 Environment variables
Maintain `.env.example` with names and descriptions only, no working credentials. Classify variables explicitly as browser-safe or server-only. Names vary by provider; expected categories include:
- Public Supabase project URL and publishable/anon key (browser-safe, protected by RLS).
- Server-only Supabase service-role/secret key if genuinely required.
- LiveKit server URL (may be public endpoint) and server-only API key/secret.
- Sports provider API key/secret.
- Webhook secrets/signing keys.
- Rate-limit/cache/queue credentials if those services are introduced.
- Error monitoring DSN/config, with appropriate public/private classification.
- Site URL and trusted origin configuration.

Never prefix a secret with a public/client-exposed environment variable prefix. Validate required environment variables at startup and fail clearly if required configuration is missing.

### 17.3 Release process
1. CI passes.
2. Review migrations and compatibility.
3. Deploy to staging.
4. Run smoke, RLS, provider, and relevant load tests.
5. Approve release.
6. Apply migrations using the controlled release process.
7. Deploy application.
8. Verify health, error rate, key user flows, provider health, and alerts.
9. Roll back app release if needed; follow the documented database recovery plan for schema issues.
10. Record release/version and incident notes.

Use health checks and gradual/canary rollout where the hosting platform supports them.

## 18. Privacy and data governance

- Publish a clear privacy policy and terms before public launch.
- Collect only data required for the product and security.
- Define who can access private messages and under what documented moderation/legal process.
- Define content/report/log retention and user data deletion/export workflows.
- Avoid logging private message content and audio.
- Do not record audio spaces by default.
- Provide account/session revocation and a clear account deletion process.
- Consider age requirements, user safety, data protection obligations, copyright, and regional requirements for target markets.
- Use lawful and authorized sports feeds; maintain records of provider permissions and territories.
- Document subprocessors and cross-border processing where required.
- Get qualified legal advice for licensing, privacy, and applicable jurisdictional obligations; this document is not legal advice.

## 19. Accessibility and user experience quality

The supplied UI reference governs the visual design. Independently ensure:
- Responsive behavior on mobile, tablet, and desktop.
- Semantic headings, labels, landmarks, and accessible form errors.
- Keyboard navigation and visible focus.
- No color-only indication of state.
- Reduced-motion support where applicable.
- Correct loading, empty, offline, error, and permission-denied states.
- Confirmations for destructive actions.
- Optimistic updates revert when the server rejects the operation.
- Chat and audio status updates are accessible and not excessively noisy.
- Match playback errors explain the next available action without exposing provider internals.
- No fake functionality, dead buttons, or hardcoded demo data in production paths.

## 20. Phased implementation plan

Do not attempt to implement all domains simultaneously. Each phase ends with tests and a review.

### Phase 0 — Discovery and foundations
- Inspect repository and UI reference.
- Read actual streaming API docs.
- Confirm product rules: public/private profiles, post visibility, chat history after leaving, moderation policy, space capacity, provider licensing, and privacy requirements.
- Create architecture decisions, threat model, capacity plan, RLS matrix, data model, and environment setup.
- Bootstrap Next.js, strict TypeScript, formatting/lint, CI, Supabase migrations, and test framework.

**Exit gate:** Architecture and provider unknowns documented; CI builds; migrations run cleanly; no secrets committed.

### Phase 1 — Identity and security foundation
- Supabase Auth/session integration.
- Profiles and handles.
- Server authorization helpers and role model.
- RLS for profiles and user preferences.
- Security headers, validation, rate-limit foundation, audit logging.
- Account settings and logout/session behavior.

**Exit gate:** Multi-user authorization tests pass; role escalation and cross-user access attempts fail.

### Phase 2 — Feed and social graph
- Posts and media metadata.
- Follow graph.
- Feed pagination.
- Likes, comments, bookmarks, and optional reposts.
- Block/mute, report, moderation state.
- Safe media upload flow and storage policies.
- Query/index tuning.

**Exit gate:** Feed and mutations work end-to-end; pagination is stable; RLS tests cover every relevant table; no unbounded feed queries.

### Phase 3 — Chat and notifications
- Direct/group conversations and membership.
- Durable messages and cursor pagination.
- Unread/read state.
- Selective Realtime updates with reconnect recovery.
- Block/report integration.
- Notification records and reliable background delivery.

**Exit gate:** Nonmembers and former members cannot read/send according to policy; duplicate sends/retries are handled; reconnect restores missed data.

### Phase 4 — Audio spaces
- LiveKit project/environment setup.
- Server-side token issuer.
- Stage/open room rules.
- Host/moderator controls, speaker requests, capacity.
- Webhook verification, idempotency, reconciliation.
- Audio moderation and failure states.

**Exit gate:** Listener cannot publish without permission; unauthorized users cannot obtain room tokens; room capacity/role rules hold under concurrent joins; stale-room recovery is tested.

### Phase 5 — Sports streaming
- Implement adapter using the actual API docs.
- Match catalogue and metadata cache.
- Match detail/status pages.
- Authorized playback flow and expiry/error handling.
- Provider timeouts, rate limits, backoff, and observability.

**Exit gate:** Playback works with permitted test credentials; secrets are not exposed; provider failures degrade gracefully; licensing and concurrency assumptions are confirmed.

### Phase 6 — Production hardening
- Full RLS review and security threat review.
- Load test and database query analysis.
- Error tracking, dashboards, alerts, runbooks.
- Backup/PITR configuration and restore drill.
- Accessibility review and E2E coverage.
- Cost estimates, capacity limits, incident contacts, privacy/terms.
- Staging-to-production release rehearsal.

**Exit gate:** All launch criteria below are met, or any exception is explicitly approved and documented.

### Phase 7 — Growth and optimization
Only based on evidence:
- Feed ranking improvements.
- Redis/distributed rate limiting or caching if needed.
- Durable queue/workers for higher job volume.
- Read replicas or dedicated read paths if supported and justified.
- Extract independent services only when a clear bottleneck/team boundary exists.
- Native mobile client only after product validation.

## 21. Production launch acceptance criteria

The app is not production-ready until all applicable items are checked and evidence is recorded.

### Product functionality
- [ ] All four pillars have working end-to-end flows.
- [ ] No dead buttons, fake backend operations, or production demo data.
- [ ] Stream playback is authorized and provider errors are handled.
- [ ] Stage and open audio modes enforce their permissions.
- [ ] Chat supports durable history and correct membership checks.
- [ ] Block/report/moderation controls work across relevant surfaces.
- [ ] Loading, empty, offline, failure, and retry states are implemented.

### Security and privacy
- [ ] RLS is enabled and tested on every exposed table.
- [ ] Cross-user and cross-conversation negative tests pass.
- [ ] Service-role and provider secrets never reach client bundles or logs.
- [ ] Admin/moderator actions are server-authorized and audited.
- [ ] Webhooks are verified and idempotent.
- [ ] Rate limits and upload quotas are enabled.
- [ ] Dependency/secret scans pass with reviewed exceptions only.
- [ ] Privacy, terms, retention, deletion, and incident-response processes are documented.

### Reliability and performance
- [ ] Capacity worksheet defines peak concurrent users and workload assumptions.
- [ ] Staging load test meets agreed latency/error/saturation targets.
- [ ] No unbounded queries, uncontrolled polling, or N+1 feed queries.
- [ ] Database connection behavior is safe for selected hosting.
- [ ] Realtime reconnect recovery is tested.
- [ ] External calls have timeouts and bounded retries.
- [ ] Background work is durable, retryable, idempotent, and observable.
- [ ] Provider outage and degraded modes are tested.
- [ ] Cost/resource alerts and usage limits are configured.

### Operations and recovery
- [ ] Development/staging/production are separated.
- [ ] Migrations run from a clean database and upgrade from the prior version.
- [ ] Backups/PITR settings and retention are verified.
- [ ] A restore drill has succeeded and RPO/RTO are documented.
- [ ] Dashboards and actionable alerts are verified.
- [ ] Runbooks and incident contacts exist.
- [ ] Rollback/recovery process is rehearsed.
- [ ] Legal/licensing approval for live sports content is confirmed.

### Engineering quality
- [ ] Format, lint, strict type check, build, tests, and CI gates pass.
- [ ] E2E covers critical flows and key permission failures.
- [ ] Accessibility review is complete.
- [ ] Architecture decisions and known limitations are documented.
- [ ] Remaining risks have an owner, mitigation, and due date.

## 22. Required documentation artifacts

The coding agent must create and maintain:
- `README.md` — setup, scripts, architecture overview, development workflow.
- `docs/architecture/overview.md` — current architecture and boundaries.
- `docs/architecture/data-model.md` — tables, relationships, constraints.
- `docs/architecture/rls-matrix.md` — table-by-table access matrix.
- `docs/architecture/threat-model.md` — assets, attackers, threats, mitigations, residual risk.
- `docs/architecture/capacity-plan.md` — workload assumptions, load-test results, limits.
- `docs/architecture/api.md` or OpenAPI output — endpoints and schemas.
- `docs/architecture/provider-integrations.md` — actual sports provider and LiveKit contracts/configuration.
- `docs/decisions/` — concise architecture decision records.
- `docs/runbooks/` — operational and incident procedures.
- `.env.example` — names and explanations only, no secrets.
- CI configuration with required quality gates.

## 23. Final implementation rules

- Build a secure, testable product before optimizing for speculative scale.
- Never bypass RLS to fix a frontend permission problem without documenting the reason and adding a safer server-side design.
- Never expose service credentials or media-provider secrets.
- Never treat client-supplied roles, counts, sender IDs, ownership, or moderation state as trusted.
- Never trust a successful UI animation as proof that a database write succeeded.
- Never proxy high-bandwidth match video through the Next.js application.
- Never assume realtime delivery is durable.
- Never assume a database backup also protects object storage.
- Never deploy a schema change without a migration and recovery plan.
- Never claim security, compliance, or scalability is “guaranteed.” Describe tested limits and known residual risks.
- Keep the UI design separate from the system design, while ensuring every interaction has a real, authorized backend implementation.

**Definition of done:** VYRO is ready for a controlled production launch only when the launch acceptance criteria are evidenced, remaining risks are documented, and the operator can observe, recover, and safely maintain the system.
