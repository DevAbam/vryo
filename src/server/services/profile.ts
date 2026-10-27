import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { findProfileById, type Profile } from "@/server/repositories/profiles";
import { requireUser, type SessionUser } from "./auth";

export type Viewer = { user: SessionUser; profile: Profile & { handle: string } };

/**
 * For app pages: signed-in user with a completed profile.
 * Redirects to onboarding until a handle is chosen.
 */
export const requireViewer = cache(async (): Promise<Viewer> => {
  const user = await requireUser();
  const profile = await findProfileById(user.id);
  if (!profile) redirect("/login");
  if (profile.status === "suspended" || profile.status === "deleted") {
    redirect("/account-restricted");
  }
  if (!profile.handle) redirect("/onboarding");
  return { user, profile: { ...profile, handle: profile.handle } };
});
