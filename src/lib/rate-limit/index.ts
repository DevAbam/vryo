import "server-only";
import { AppError } from "@/lib/errors";
import { serverEnv } from "@/lib/env/server";
import { logger } from "@/lib/observability/logger";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import { rateLimitKey } from "./key";
import { RATE_LIMITS, type RateLimitPolicy } from "./policies";

/**
 * Counts one attempt against a distributed (Postgres-backed) fixed window.
 * Throws RATE_LIMITED when over the limit. Fails closed: if the limiter is
 * unavailable the request is refused rather than left unprotected.
 */
export async function enforceRateLimit(policy: RateLimitPolicy, identifier: string): Promise<void> {
  const { limit, windowSeconds } = RATE_LIMITS[policy];
  const key = rateLimitKey(policy, identifier, serverEnv().RATE_LIMIT_SALT);

  const { data, error } = await createSupabaseAdminClient().rpc("rate_limit_hit", {
    p_key: key,
    p_limit: limit,
    p_window_seconds: windowSeconds,
  });

  if (error || !data?.[0]) {
    logger.error("rate_limit.unavailable", { policy, error: error?.message });
    throw new AppError("DEPENDENCY_UNAVAILABLE", { cause: error });
  }
  if (!data[0].allowed) {
    logger.warn("rate_limit.exceeded", { policy });
    throw new AppError("RATE_LIMITED", { retryAfterSeconds: data[0].retry_after_seconds });
  }
}
