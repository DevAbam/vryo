import "server-only";
import { createClient } from "@supabase/supabase-js";
import { publicEnv } from "@/lib/env/public";
import { serverEnv } from "@/lib/env/server";
import type { Database } from "@/types/database";

/**
 * Service-role client. BYPASSES RLS.
 *
 * Allowed uses (each must authorize the caller independently first):
 *  - rate limiting (src/lib/rate-limit)
 *  - audit logging (src/lib/security/audit.ts)
 * Add new uses only with a documented reason in docs/architecture/rls-matrix.md.
 */
export function createSupabaseAdminClient() {
  return createClient<Database>(
    publicEnv().NEXT_PUBLIC_SUPABASE_URL,
    serverEnv().SUPABASE_SERVICE_ROLE_KEY,
    { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } },
  );
}
