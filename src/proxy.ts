import { NextResponse, type NextRequest } from "next/server";
import { updateSession } from "@/lib/supabase/proxy";
import { DEFAULT_AFTER_LOGIN } from "@/lib/security/redirect";
import { REQUEST_ID_HEADER, resolveRequestId } from "@/lib/security/request-id";

const PROTECTED_PREFIXES = [
  "/feed",
  "/stream",
  "/spaces",
  "/search",
  "/competitions",
  "/notifications",
  "/messages",
  "/profile",
  "/settings",
  "/admin",
  "/onboarding",
  "/update-password",
];
const GUEST_ONLY = ["/", "/login", "/signup"];

function matches(pathname: string, prefixes: string[]) {
  return prefixes.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
}

// Proxy is a UX gate and session refresher only. Every page, action and route
// handler still verifies the user on the server; RLS enforces access in the DB.
export async function proxy(request: NextRequest) {
  const requestId = resolveRequestId(request.headers.get(REQUEST_ID_HEADER));
  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(REQUEST_ID_HEADER, requestId);

  const { response, userId } = await updateSession(request, requestHeaders);
  const { pathname, search } = request.nextUrl;

  let redirectTo: URL | null = null;
  if (!userId && matches(pathname, PROTECTED_PREFIXES)) {
    redirectTo = new URL("/login", request.url);
    redirectTo.searchParams.set("next", `${pathname}${search}`);
  } else if (userId && GUEST_ONLY.includes(pathname)) {
    redirectTo = new URL(DEFAULT_AFTER_LOGIN, request.url);
  }

  const sessionResponse = response();
  let result: NextResponse = sessionResponse;
  if (redirectTo) {
    result = NextResponse.redirect(redirectTo);
    // Carry refreshed auth cookies and no-store headers onto the redirect.
    for (const cookie of sessionResponse.cookies.getAll()) result.cookies.set(cookie);
    const cacheControl = sessionResponse.headers.get("cache-control");
    if (cacheControl) result.headers.set("cache-control", cacheControl);
  }
  result.headers.set(REQUEST_ID_HEADER, requestId);
  return result;
}

export const config = {
  matcher: [
    // Skip static assets and image optimization; run on pages, actions and API routes.
    "/((?!_next/static|_next/image|favicon.ico|.*\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)",
  ],
};
