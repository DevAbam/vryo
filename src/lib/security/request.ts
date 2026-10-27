import "server-only";
import { headers } from "next/headers";
import { REQUEST_ID_HEADER, resolveRequestId } from "./request-id";

/** Request id set by src/proxy.ts; used to correlate logs and error responses. */
export async function getRequestId(): Promise<string> {
  return resolveRequestId((await headers()).get(REQUEST_ID_HEADER));
}

/**
 * Best-effort client IP from the hosting platform's forwarding headers.
 * Only trustworthy behind a proxy that overwrites these headers (Vercel, etc.).
 */
export async function getClientIp(): Promise<string> {
  const h = await headers();
  const forwarded = h.get("x-forwarded-for")?.split(",")[0]?.trim();
  return forwarded || h.get("x-real-ip") || "unknown";
}
