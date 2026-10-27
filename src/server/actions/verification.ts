"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";
import { enforceRateLimit } from "@/lib/rate-limit";
import { getRequestId } from "@/lib/security/request";
import { fieldErrors, type FormState } from "@/lib/validation/form";
import { handleSchema } from "@/lib/validation/profile";
import { findProfileByHandle } from "@/server/repositories/profiles";
import { callVerificationRpc } from "@/server/repositories/verification";
import { assertRole, assertUser } from "@/server/services/auth";
import { VERIFICATION_ERRORS } from "@/server/services/verification";
import { failure } from "./result";

const noteSchema = z.string().trim().max(500, "Keep it under 500 characters.");

function refused(code: string): FormState {
  return { status: "error", message: VERIFICATION_ERRORS[code] ?? VERIFICATION_ERRORS.not_allowed };
}

export type AdminNotice = "approved" | "rejected" | "verified" | "revoked";

/**
 * Actions taken on the admin page return there with a banner, because the
 * item acted on (and any inline message) leaves the list once it refreshes.
 */
function backToAdmin(formData: FormData, notice: AdminNotice, handle: string | null): void {
  if (formData.get("returnTo") !== "admin") return;
  const view = notice === "verified" || notice === "revoked" ? "verified" : "pending";
  const params = new URLSearchParams({ view, notice });
  const parsedHandle = handleSchema.safeParse(handle ?? "");
  if (parsedHandle.success) params.set("handle", parsedHandle.data);
  redirect(`/admin/verification?${params}`);
}

function refreshVerificationViews() {
  revalidatePath("/settings");
  revalidatePath("/admin/verification");
  revalidatePath("/profile/[handle]", "page");
}

export async function submitVerificationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const requestId = await getRequestId();
  const parsed = noteSchema.safeParse(formData.get("message") ?? "");
  if (!parsed.success) {
    return { status: "error", fieldErrors: { message: parsed.error.issues[0].message } };
  }
  try {
    const user = await assertUser();
    await enforceRateLimit("verificationSubmitByUser", user.id);
    const code = await callVerificationRpc((supabase) =>
      supabase.rpc("submit_verification_request", { p_message: parsed.data }),
    );
    if (code) return refused(code);
  } catch (error) {
    return failure(error, requestId, "verification.submit");
  }
  refreshVerificationViews();
  return { status: "success", message: "Request sent. We'll review your account soon." };
}

export async function withdrawVerificationAction(): Promise<FormState> {
  const requestId = await getRequestId();
  try {
    await assertUser();
    const code = await callVerificationRpc((supabase) =>
      supabase.rpc("withdraw_verification_request"),
    );
    if (code) return refused(code);
  } catch (error) {
    return failure(error, requestId, "verification.withdraw");
  }
  refreshVerificationViews();
  return { status: "success", message: "Request withdrawn." };
}

const reviewSchema = z.object({
  requestId: z.uuid(),
  decision: z.enum(["approve", "reject"]),
  note: noteSchema,
});

export async function reviewVerificationAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const requestId = await getRequestId();
  const parsed = reviewSchema.safeParse({
    requestId: formData.get("requestId"),
    decision: formData.get("decision"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  try {
    const admin = await assertRole("admin");
    await enforceRateLimit("adminActionByUser", admin.id);
    const code = await callVerificationRpc((supabase) =>
      supabase.rpc("review_verification_request", {
        p_request_id: parsed.data.requestId,
        p_approve: parsed.data.decision === "approve",
        p_note: parsed.data.note,
      }),
    );
    if (code) return refused(code);
  } catch (error) {
    return failure(error, requestId, "verification.review");
  }
  refreshVerificationViews();
  backToAdmin(
    formData,
    parsed.data.decision === "approve" ? "approved" : "rejected",
    String(formData.get("handle") ?? ""),
  );
  return {
    status: "success",
    message: parsed.data.decision === "approve" ? "Approved and verified." : "Request rejected.",
  };
}

const setVerifiedSchema = z.object({
  handle: handleSchema,
  verified: z.enum(["true", "false"]).transform((value) => value === "true"),
  note: noteSchema,
});

/** Verify or revoke any account directly by handle (admins only). */
export async function setVerifiedAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const requestId = await getRequestId();
  const parsed = setVerifiedSchema.safeParse({
    handle: String(formData.get("handle") ?? "").replace(/^@/, ""),
    verified: formData.get("verified"),
    note: formData.get("note") ?? "",
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  try {
    const admin = await assertRole("admin");
    await enforceRateLimit("adminActionByUser", admin.id);
    const profile = await findProfileByHandle(parsed.data.handle);
    if (!profile)
      return { status: "error", fieldErrors: { handle: "No account with that handle." } };
    const code = await callVerificationRpc((supabase) =>
      supabase.rpc("admin_set_verified", {
        p_user_id: profile.id,
        p_verified: parsed.data.verified,
        p_note: parsed.data.note,
      }),
    );
    if (code) return refused(code);
  } catch (error) {
    return failure(error, requestId, "verification.set");
  }
  refreshVerificationViews();
  backToAdmin(formData, parsed.data.verified ? "verified" : "revoked", parsed.data.handle);
  return {
    status: "success",
    message: parsed.data.verified
      ? `@${parsed.data.handle} is now verified.`
      : `Removed the badge from @${parsed.data.handle}.`,
  };
}
