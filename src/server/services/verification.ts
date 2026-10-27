import "server-only";
import { cache } from "react";
import { notFound } from "next/navigation";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import {
  findLatestOwnRequest,
  getRequirements,
  type OwnRequest,
  type Requirements,
} from "@/server/repositories/verification";
import { requireViewer, type Viewer } from "./profile";

/** User-facing text for the refusal codes raised by the database functions. */
export const VERIFICATION_ERRORS: Record<string, string> = {
  not_authenticated: "You need to sign in.",
  not_allowed: "Your account can't apply for verification right now.",
  already_verified: "Your account is already verified.",
  already_pending: "You already have a request under review.",
  cooldown: "You can apply again once the waiting period after your last request ends.",
  not_eligible: "Your account doesn't meet the requirements yet.",
  message_too_long: "Keep your note under 500 characters.",
  not_pending: "That request has already been handled.",
  forbidden: "Only admins can do that.",
  not_found: "That account no longer exists.",
};

export type VerificationState = Requirements & {
  verified: boolean;
  latest: OwnRequest | null;
  /** Why the user can't apply right now, or null when they can. */
  blocker: "verified" | "pending" | "cooldown" | "followers" | null;
  reapplyAt: Date | null;
};

export async function getVerificationState(viewer: Viewer): Promise<VerificationState> {
  const [requirements, latest] = await Promise.all([
    getRequirements(viewer.profile.id),
    findLatestOwnRequest(viewer.profile.id),
  ]);
  const reapplyAt =
    latest?.status === "rejected" && latest.reviewed_at
      ? new Date(new Date(latest.reviewed_at).getTime() + requirements.reapplyDays * 86_400_000)
      : null;

  // Mirrors submit_verification_request(); the database stays authoritative.
  let blocker: VerificationState["blocker"] = null;
  if (viewer.profile.verified_at) blocker = "verified";
  else if (latest?.status === "pending") blocker = "pending";
  else if (reapplyAt && reapplyAt.getTime() > Date.now()) blocker = "cooldown";
  else if (requirements.followers < requirements.minFollowers) blocker = "followers";

  return {
    ...requirements,
    verified: Boolean(viewer.profile.verified_at),
    latest,
    blocker,
    reapplyAt,
  };
}

/** True when the signed-in user is an active admin (checked in the database). */
export const isAdmin = cache(async (): Promise<boolean> => {
  const supabase = await createSupabaseServerClient();
  const { data, error } = await supabase.rpc("has_role", { p_role: "admin" });
  if (error) throw error;
  return data === true;
});

/** For admin pages: non-admins get a 404 so the page's existence isn't revealed. */
export async function requireAdmin(): Promise<Viewer> {
  const viewer = await requireViewer();
  if (!(await isAdmin())) notFound();
  return viewer;
}
