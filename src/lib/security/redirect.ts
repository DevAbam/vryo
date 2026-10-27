const ALLOWED_PREFIXES = [
  "/feed",
  "/stream",
  "/spaces",
  "/search",
  "/competitions",
  "/notifications",
  "/messages",
  "/profile",
  "/settings",
  "/onboarding",
  "/update-password",
];

export const DEFAULT_AFTER_LOGIN = "/feed";

/**
 * Returns a same-origin path from an untrusted `next` parameter, or the fallback.
 * Blocks absolute URLs, protocol-relative URLs, backslash tricks and unknown paths.
 */
export function safeNextPath(input: unknown, fallback = DEFAULT_AFTER_LOGIN): string {
  if (typeof input !== "string" || input.length === 0 || input.length > 512) return fallback;
  if (!input.startsWith("/") || input.startsWith("//") || input.includes("\\")) return fallback;
  if (/[\u0000-\u001f]/.test(input)) return fallback;

  let url: URL;
  try {
    url = new URL(input, "http://vyro.local");
  } catch {
    return fallback;
  }
  if (url.origin !== "http://vyro.local") return fallback;

  const allowed = ALLOWED_PREFIXES.some(
    (prefix) => url.pathname === prefix || url.pathname.startsWith(`${prefix}/`),
  );
  return allowed ? `${url.pathname}${url.search}` : fallback;
}
