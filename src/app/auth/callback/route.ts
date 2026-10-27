import type { EmailOtpType } from "@supabase/supabase-js";
import { NextResponse, type NextRequest } from "next/server";
import { logger } from "@/lib/observability/logger";
import { safeNextPath } from "@/lib/security/redirect";
import { REQUEST_ID_HEADER } from "@/lib/security/request-id";
import { createSupabaseServerClient } from "@/lib/supabase/server";

const OTP_TYPES = new Set<string>(["signup", "recovery", "email_change", "email", "invite"]);

/** Completes email confirmation and password recovery links (and OAuth later). */
export async function GET(request: NextRequest) {
  const { searchParams, origin } = request.nextUrl;
  const next = safeNextPath(searchParams.get("next"));
  const code = searchParams.get("code");
  const tokenHash = searchParams.get("token_hash");
  const type = searchParams.get("type");

  const supabase = await createSupabaseServerClient();
  let failedCode: string | undefined;
  let userId: string | undefined;

  if (code) {
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);
    failedCode = error ? (error.code ?? "exchange_failed") : undefined;
    userId = data.user?.id;
  } else if (tokenHash && type && OTP_TYPES.has(type)) {
    const { data, error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    failedCode = error ? (error.code ?? "verify_failed") : undefined;
    userId = data.user?.id;
  } else {
    failedCode = searchParams.get("error_code") ?? "missing_params";
  }

  if (failedCode || !userId) {
    logger.warn("auth.callback_failed", {
      requestId: request.headers.get(REQUEST_ID_HEADER),
      code: failedCode ?? "no_user",
    });
    return NextResponse.redirect(new URL("/login?error=link", origin));
  }

  // Password recovery goes straight to its form; everyone else needs a handle first.
  if (next !== "/update-password") {
    const { data: profile } = await supabase
      .from("profiles")
      .select("handle")
      .eq("id", userId)
      .maybeSingle();
    if (!profile?.handle) return NextResponse.redirect(new URL("/onboarding", origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}
