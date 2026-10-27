import "server-only";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import type { Database } from "@/types/database";

type Request = Database["public"]["Tables"]["verification_requests"]["Row"];
export type VerificationStatus = Database["public"]["Enums"]["verification_status"];

export type OwnRequest = Pick<
  Request,
  "id" | "status" | "message" | "review_note" | "created_at" | "reviewed_at"
>;

/** Latest request by the signed-in user (RLS limits rows to their own). */
export async function findLatestOwnRequest(userId: string): Promise<OwnRequest | null> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("verification_requests")
    .select("id, status, message, review_note, created_at, reviewed_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export type Requirements = { followers: number; minFollowers: number; reapplyDays: number };

export async function getRequirements(userId: string): Promise<Requirements> {
  const supabase = await createSupabaseServerClient();
  const [followers, minFollowers, reapplyDays] = await Promise.all([
    supabase.rpc("follower_count", { p_user_id: userId }),
    supabase.rpc("verification_min_followers"),
    supabase.rpc("verification_reapply_days"),
  ]);
  for (const result of [followers, minFollowers, reapplyDays]) {
    if (result.error) throw result.error;
  }
  return {
    followers: followers.data ?? 0,
    minFollowers: minFollowers.data ?? 10_000,
    reapplyDays: reapplyDays.data ?? 30,
  };
}

const APPLICANT = "applicant:profiles!verification_requests_user_id_fkey";
const REVIEWER = "reviewer:profiles!verification_requests_reviewer_id_fkey";

export type ReviewItem = Request & {
  applicant: {
    id: string;
    handle: string | null;
    display_name: string;
    avatar_path: string | null;
    verified_at: string | null;
    created_at: string;
  } | null;
  reviewer: { handle: string | null; display_name: string } | null;
};

export const ADMIN_PAGE_SIZE = 50;

/** Admin queue. RLS returns rows only when the caller is an admin. */
export async function listRequests(status: VerificationStatus | "history"): Promise<ReviewItem[]> {
  const supabase = await createSupabaseServerClient();
  let query = supabase
    .from("verification_requests")
    .select(
      `*, ${APPLICANT}(id, handle, display_name, avatar_path, verified_at, created_at), ${REVIEWER}(handle, display_name)`,
    )
    .limit(ADMIN_PAGE_SIZE);
  query =
    status === "history"
      ? query.neq("status", "pending").order("reviewed_at", { ascending: false })
      : query.eq("status", status).order("created_at", { ascending: true });
  const { data, error } = await query;
  if (error) throw error;
  return data as unknown as ReviewItem[];
}

export type VerifiedProfile = {
  id: string;
  handle: string | null;
  display_name: string;
  avatar_path: string | null;
  verified_at: string | null;
};

export async function listVerifiedProfiles(): Promise<VerifiedProfile[]> {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase
    .from("profiles")
    .select("id, handle, display_name, avatar_path, verified_at")
    .not("verified_at", "is", null)
    .order("verified_at", { ascending: false })
    .limit(ADMIN_PAGE_SIZE);
  if (error) throw error;
  return data;
}

/** Calls a verification RPC and returns the database's refusal code, if any. */
export async function callVerificationRpc(
  call: (
    supabase: Awaited<ReturnType<typeof createSupabaseServerClient>>,
  ) => PromiseLike<{ error: { code?: string; message: string } | null }>,
): Promise<string | null> {
  const supabase = await createSupabaseServerClient();
  const { error } = await call(supabase);
  if (!error) return null;
  // Our functions raise P0001 with a short code as the message.
  if (error.code === "P0001") return error.message;
  throw error;
}
