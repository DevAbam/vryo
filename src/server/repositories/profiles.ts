import "server-only";
import { cache } from "react";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

export type Profile = Pick<
  Database["public"]["Tables"]["profiles"]["Row"],
  "id" | "handle" | "display_name" | "bio" | "avatar_path" | "status" | "created_at"
>;

export type Preferences = Pick<
  Database["public"]["Tables"]["user_preferences"]["Row"],
  "favourite_sports" | "locale" | "timezone"
>;

const PROFILE_COLUMNS = "id, handle, display_name, bio, avatar_path, status, created_at";

/** Reads go through the user-scoped client, so RLS decides visibility. */
export const findProfileById = cache(async (id: string): Promise<Profile | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("id", id)
    .maybeSingle();
  if (error) throw error;
  return data;
});

export const findProfileByHandle = cache(async (handle: string): Promise<Profile | null> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select(PROFILE_COLUMNS)
    .eq("handle", handle.toLowerCase())
    .maybeSingle();
  if (error) throw error;
  return data;
});

export async function findOwnPreferences(userId: string): Promise<Preferences | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("user_preferences")
    .select("favourite_sports, locale, timezone")
    .eq("user_id", userId)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type ProfilePatch = { handle?: string; display_name?: string; bio?: string };

/** Returns "handle_taken" on unique violation so the UI can show a field error. */
export async function updateOwnProfile(
  userId: string,
  patch: ProfilePatch,
): Promise<"ok" | "handle_taken" | "not_found"> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .update(patch)
    .eq("id", userId)
    .select("id");
  if (error) {
    if (error.code === "23505") return "handle_taken";
    throw error;
  }
  return data.length === 1 ? "ok" : "not_found";
}

export async function updateOwnPreferences(
  userId: string,
  patch: Partial<Pick<Preferences, "favourite_sports">>,
): Promise<void> {
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.from("user_preferences").update(patch).eq("user_id", userId);
  if (error) throw error;
}
