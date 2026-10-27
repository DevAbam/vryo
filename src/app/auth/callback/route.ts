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

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    failedCode = error ? (error.code ?? "exchange_failed") : undefined;
  } else if (tokenHash && type && OTP_TYPES.has(type)) {
    const { error } = await supabase.auth.verifyOtp({
      token_hash: tokenHash,
      type: type as EmailOtpType,
    });
    failedCode = error ? (error.code ?? "verify_failed") : undefined;
  } else {
    failedCode = "missing_params";
  }

  if (failedCode) {
    logger.warn("auth.callback_failed", {
      requestId: request.headers.get(REQUEST_ID_HEADER),
      code: failedCode,
    });
    return NextResponse.redirect(new URL("/login?error=link", origin));
  }
  return NextResponse.redirect(new URL(next, origin));
}
