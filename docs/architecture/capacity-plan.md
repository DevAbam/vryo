# Capacity plan

Status: **assumptions not yet agreed.** No load tests have been run. Fill this in before Phase 6.

## Workload assumptions (to confirm with product)

| Metric                        | Assumption                               | Source            |
| ----------------------------- | ---------------------------------------- | ----------------- |
| Registered users              | tens of thousands (growth target)        | VYRO.md           |
| Peak concurrent users         | TBD (e.g. 10% of DAU during big matches) |                   |
| Peak requests/second          | TBD                                      |                   |
| Feed reads : writes           | TBD                                      |                   |
| Concurrent video viewers      | TBD; governed by provider licence        | provider contract |
| Concurrent audio participants | TBD; governed by LiveKit plan            |                   |
| Messages per second (peak)    | TBD                                      |                   |
| Geography                     | TBD                                      |                   |

## Known limits to verify against plans

- Supabase plan: DB connections (use the pooler for serverless), Realtime concurrent connections and messages/second, Auth rate limits, storage egress.
- Hosting: function concurrency, execution time, regions.
- LiveKit: participants per room, total concurrent participants, egress.
- Sports provider: concurrent streams, territories, API rate limits.

## Phase 1 hot paths

- `proxy.ts` runs `getClaims()` on every request. With asymmetric JWT signing keys this verifies locally (cached JWKS). With legacy symmetric keys it calls the Auth server, so prefer asymmetric keys in every environment.
- `rate_limit_hit` performs one upsert per sensitive action. One row per key; indexed by primary key.

## Load test plan

See VYRO.md §12.4. Results will be recorded here with p50/p95/p99, error rate and saturation.
