"use server";

import { redirect } from "next/navigation";
import { AppError } from "@/lib/errors";
import { publicEnv } from "@/lib/env/public";
import { logger } from "@/lib/observability/logger";
import { enforceRateLimit } from "@/lib/rate-limit";
import { recordAudit } from "@/lib/security/audit";
import { safeNextPath } from "@/lib/security/redirect";
import { getClientIp, getRequestId } from "@/lib/security/request";
import { createSupabaseServerClient } from "@/lib/supabase/server";
import { fieldErrors, type FormState } from "@/lib/validation/form";
import {
  loginSchema,
  resetRequestSchema,
  signupSchema,
  updatePasswordSchema,
} from "@/lib/validation/auth";
import { assertUser } from "@/server/services/auth";
import { failure } from "./result";

function callbackUrl(next: string) {
  const url = new URL("/auth/callback", publicEnv().NEXT_PUBLIC_SITE_URL);
  url.searchParams.set("next", next);
  return url.toString();
}

export async function signUpAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const requestId = await getRequestId();
  const parsed = signupSchema.safeParse({
    displayName: formData.get("displayName"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  try {
    await enforceRateLimit("signupByIp", await getClientIp());
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.signUp({
      email: parsed.data.email,
      password: parsed.data.password,
      options: {
        emailRedirectTo: callbackUrl("/onboarding"),
        data: { display_name: parsed.data.displayName },
      },
    });
    if (error) {
      if (error.code === "weak_password") {
        return { status: "error", fieldErrors: { password: "Choose a stronger password." } };
      }
      // Never reveal whether the email is already registered.
      if (error.code !== "user_already_exists" && error.code !== "email_exists") {
        logger.warn("auth.signup_failed", { requestId, code: error.code });
        throw new AppError("INTERNAL");
      }
    }
  } catch (error) {
    return failure(error, requestId, "auth.signup");
  }
  return {
    status: "success",
    message: "Check your inbox for a link to confirm your email, then sign in.",
  };
}

export async function signInAction(_prev: FormState, formData: FormData): Promise<FormState> {
  const requestId = await getRequestId();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  let needsOnboarding = false;
  try {
    await enforceRateLimit("loginByIp", await getClientIp());
    await enforceRateLimit("loginByEmail", parsed.data.email);
    const supabase = await createSupabaseServerClient();
    const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
    if (error) {
      return {
        status: "error",
        message: "Incorrect email or password, or your email is not confirmed yet.",
      };
    }
    // Send users without a handle straight to onboarding rather than letting
    // the app shell render and redirect mid-stream.
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", data.user.id)
      .maybeSingle();
    needsOnboarding = !profile?.handle;
  } catch (error) {
    return failure(error, requestId, "auth.login");
  }
  redirect(needsOnboarding ? "/onboarding" : safeNextPath(formData.get("next")));
}

export async function signOutAction(): Promise<void> {
  const supabase = await createSupabaseServerClient();
  await supabase.auth.signOut({ scope: "local" });
  redirect("/login");
}

export async function signOutEverywhereAction(): Promise<void> {
  const requestId = await getRequestId();
  const user = await assertUser();
  await enforceRateLimit("globalSignOutByUser", user.id);
  const supabase = await createSupabaseServerClient();
  const { error } = await supabase.auth.signOut({ scope: "global" });
  if (error) {
    logger.error("auth.global_signout_failed", { requestId, code: error.code });
    throw new AppError("DEPENDENCY_UNAVAILABLE");
  }
  await recordAudit({ actorId: user.id, action: "auth.sign_out_everywhere", requestId });
  redirect("/login");
}

export async function requestPasswordResetAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const requestId = await getRequestId();
  const parsed = resetRequestSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  try {
    await enforceRateLimit("passwordResetByIp", await getClientIp());
    await enforceRateLimit("passwordResetByEmail", parsed.data.email);
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
      redirectTo: callbackUrl("/update-password"),
    });
    if (error) logger.warn("auth.reset_request_failed", { requestId, code: error.code });
  } catch (error) {
    return failure(error, requestId, "auth.reset_request");
  }
  // Same response whether or not the account exists.
  return {
    status: "success",
    message: "If an account exists for that email, a reset link is on its way.",
  };
}

export async function updatePasswordAction(
  _prev: FormState,
  formData: FormData,
): Promise<FormState> {
  const requestId = await getRequestId();
  const parsed = updatePasswordSchema.safeParse({
    password: formData.get("password"),
    confirm: formData.get("confirm"),
  });
  if (!parsed.success) return { status: "error", fieldErrors: fieldErrors(parsed.error) };

  try {
    const user = await assertUser();
    const supabase = await createSupabaseServerClient();
    const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
    if (error) {
      if (error.code === "weak_password" || error.code === "same_password") {
        return {
          status: "error",
          fieldErrors: { password: "Choose a different, stronger password." },
        };
      }
      if (error.code === "reauthentication_needed") {
        return {
          status: "error",
          message: "For security, sign in again before changing your password.",
        };
      }
      logger.warn("auth.update_password_failed", { requestId, code: error.code });
      throw new AppError("INTERNAL");
    }
    await recordAudit({ actorId: user.id, action: "auth.password_changed", requestId });
  } catch (error) {
    return failure(error, requestId, "auth.update_password");
  }
  return { status: "success", message: "Your password has been updated." };
}
