import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type SessionUser = { id: string; email: string | null };
export type AppRole = Database["public"]["Enums"]["app_role"];

/** Verified current user for this request, or null. Deduplicated per request. */
export const getSessionUser = cache(async (): Promise<SessionUser | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.auth.getClaims();
  if (error || !data?.claims?.sub) return null;
  const email = typeof data.claims.email === "string" ? data.claims.email : null;
  return { id: data.claims.sub, email };
});

/** For pages: redirects to login when signed out. */
export async function requireUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) redirect("/login");
  return user;
}

/** For server actions and route handlers: throws instead of redirecting. */
export async function assertUser(): Promise<SessionUser> {
  const user = await getSessionUser();
  if (!user) throw new AppError("UNAUTHENTICATED");
  return user;
}

/**
 * Throws FORBIDDEN unless the caller holds the role (admin implies moderator).
 * Checked in the database via has_role(), never from client-supplied state.
 */
export async function assertRole(role: AppRole): Promise<SessionUser> {
  const user = await assertUser();
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("has_role", { p_role: role });
  if (error) throw new AppError("DEPENDENCY_UNAVAILABLE", { cause: error });
  if (data !== true) throw new AppError("FORBIDDEN");
  return user;
}
