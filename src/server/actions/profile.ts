"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/security/audit";
import { getRequestId } from "@/lib/security/request";
import { fieldErrors, type FormState } from "@/lib/validation/form";
import { onboardingSchema, profileUpdateSchema } from "@/lib/validation/profile";
import {
  findProfileById,
  updateOwnPreferences,
  updateOwnProfile,
} from "@/server/repositories/profiles";
import { assertUser } from "@/server/services/auth";
import { deleteOldAvatar, storeAvatar } from "@/server/services/media";
import { failure } from "./result";

const HANDLE_TAKEN: FormState = {
  status: "error",
  fieldErrors: { handle: "That handle is taken." },
};
const NOT_EDITABLE: FormState = { status: "error", message: "Your account cannot be edited." };

export async function completeOnboardingAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const requestId = await getRequestId();
  const parsed = onboardingSchema.safeParse({
    handle: formData.get("handle"),
    favouriteSports: formData.getAll("favouriteSports"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  try {
    const user = await assertUser();
    await enforceRateLimit("profileUpdateByUser", user.id);
    const result = await updateOwnProfile(user.id, { handle: parsed.data.handle });
    if (result === "handle_taken") return HANDLE_TAKEN;
    if (result === "not_found") return NOT_EDITABLE;
    await updateOwnPreferences(user.id, { favourite_sports: parsed.data.favouriteSports });
    await recordAudit({
      actorId: user.id,
      action: "profile.handle_set",
      targetType: "profile",
      targetId: user.id,
      requestId,
    });
  } catch (error) {
    return failure(error, requestId, "profile.onboarding");
  }
  redirect("/feed");
}

export async function updateProfileAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const requestId = await getRequestId();
  const parsed = profileUpdateSchema.safeParse({
    handle: formData.get("handle"),
    displayName: formData.get("displayName"),
    bio: formData.get("bio") ?? "",
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  try {
    const user = await assertUser();
    await enforceRateLimit("profileUpdateByUser", user.id);
    const before = await findProfileById(user.id);
    const result = await updateOwnProfile(user.id, {
      handle: parsed.data.handle,
      display_name: parsed.data.displayName,
      bio: parsed.data.bio,
    });
    if (result === "handle_taken") return HANDLE_TAKEN;
    if (result === "not_found") return NOT_EDITABLE;
    if (before?.handle && before.handle !== parsed.data.handle) {
      await recordAudit({
        actorId: user.id,
        action: "profile.handle_changed",
        targetType: "profile",
        targetId: user.id,
        metadata: { from: before.handle, to: parsed.data.handle },
        requestId,
      });
    }
  } catch (error) {
    return failure(error, requestId, "profile.update");
  }
  revalidatePath("/settings");
  return { status: "success", message: "Profile saved." };
}

export async function uploadAvatarAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const requestId = await getRequestId();
  const file = formData.get("avatar");
  if (!(file instanceof File) || file.size === 0) {
    return { status: "error", fieldErrors: { avatar: "Choose an image to upload." } };
  }

  try {
    const user = await assertUser();
    await enforceRateLimit("avatarUploadByUser", user.id);
    const previous = await findProfileById(user.id);
    const stored = await storeAvatar(user.id, file);
    let result: Awaited<ReturnType<typeof updateOwnProfile>>;
    try {
      result = await updateOwnProfile(user.id, {
        avatar_path: stored.filePath,
        avatar_file_id: stored.fileId,
      });
    } catch (error) {
      await deleteOldAvatar(user.id, stored.fileId);
      throw error;
    }
    if (result === "not_found") {
      await deleteOldAvatar(user.id, stored.fileId);
      return NOT_EDITABLE;
    }
    // Only after the new photo is saved: remove the one it replaced.
    if (previous?.avatar_file_id && previous.avatar_file_id !== stored.fileId) {
      await deleteOldAvatar(user.id, previous.avatar_file_id);
    }
    await recordAudit({
      actorId: user.id,
      action: "profile.avatar_changed",
      targetType: "profile",
      targetId: user.id,
      requestId,
    });
  } catch (error) {
    return failure(error, requestId, "profile.avatar_upload");
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "Profile photo updated." };
}

export async function removeAvatarAction(): Promise<FormState> {
  const requestId = await getRequestId();
  try {
    const user = await assertUser();
    await enforceRateLimit("profileUpdateByUser", user.id);
    const previous = await findProfileById(user.id);
    const result = await updateOwnProfile(user.id, { avatar_path: null, avatar_file_id: null });
    if (result === "not_found") return NOT_EDITABLE;
    await deleteOldAvatar(user.id, previous?.avatar_file_id ?? null);
  } catch (error) {
    return failure(error, requestId, "profile.avatar_remove");
  }
  revalidatePath("/", "layout");
  return { status: "success", message: "Profile photo removed." };
}
