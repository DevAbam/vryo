import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { publicEnv } from "@/lib/env/public";
import type { Database } from "@/types/database";

/**
 * Per-request Supabase client acting as the signed-in user (RLS applies).
 * Create a new one for every request; never share across requests.
 */
export async function createSupabaseServerClient() {
  // Supabase checks token expiry with Date.now(), which Cache Components
  // forbids during prerendering (including per-session prefetches). Defer all
  // session work to request time; prefetches carry the static shell instead.
  await connection();
  const cookieStore = await cookies();
  const env = publicEnv();

  return createServerClient<Database>(
    env.NEXT_PUBLIC_SUPABASE_URL,
    env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    {
      cookies: {
        getAll() {
          return cookieStore.getAll();
        },
        setAll(cookiesToSet) {
          try {
            for (const { name, value, options } of cookiesToSet) {
              cookieStore.set(name, value, options);
            }
          } catch {
            // Server Components cannot set cookies. The proxy refreshes the
            // session on every request, so this write is safe to skip there.
          }
        },
      },
    },
  );
}
