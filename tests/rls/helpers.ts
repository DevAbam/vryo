import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/types/database";

/**
 * Connection details for the local Supabase stack. Accepts the names printed by
 * `supabase status -o env` (CI) or the app's own .env names (local dev).
 */
const url = process.env.API_URL ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey =
  process.env.PUBLISHABLE_KEY ??
  process.env.ANON_KEY ??
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;
const serviceKey =
  process.env.SECRET_KEY ?? process.env.SERVICE_ROLE_KEY ?? process.env.SUPABASE_SERVICE_ROLE_KEY;

export const dbConfigured = Boolean(url && anonKey && serviceKey);

if (!dbConfigured && process.env.REQUIRE_DB_TESTS === "1") {
  throw new Error("REQUIRE_DB_TESTS=1 but Supabase connection env vars are missing.");
}

export type Client = SupabaseClient<Database>;

const noSession = { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false };

export function anonClient(): Client {
  return createClient<Database>(url!, anonKey!, { auth: noSession });
}

/** Test-only privileged client for setup/teardown. Never use in app code paths. */
export function serviceClient(): Client {
  return createClient<Database>(url!, serviceKey!, { auth: noSession });
}

export type TestUser = { id: string; email: string; client: Client };

const PASSWORD = "Test-Password-2026";

export async function createTestUser(label: string): Promise<TestUser> {
  const email = `${label}-${crypto.randomUUID().slice(0, 8)}@test.vyro.local`;
  const admin = serviceClient();
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { display_name: `Test ${label}` },
  });
  if (error || !data.user) throw error ?? new Error("createUser failed");

  const client = anonClient();
  const { error: signInError } = await client.auth.signInWithPassword({
    email,
    password: PASSWORD,
  });
  if (signInError) throw signInError;
  return { id: data.user.id, email, client };
}

export async function deleteTestUsers(users: Array<TestUser | undefined>) {
  const admin = serviceClient();
  await Promise.all(
    users
      .filter((user): user is TestUser => Boolean(user))
      .map((user) => admin.auth.admin.deleteUser(user.id)),
  );
}
