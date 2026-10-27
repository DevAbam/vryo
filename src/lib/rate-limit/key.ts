import { createHash } from "node:crypto";

/** Hashes the identifier so raw IPs/emails are never stored in the rate_limits table. */
export function rateLimitKey(policy: string, identifier: string, salt: string): string {
  const digest = createHash("sha256")
    .update(`${salt}:${identifier.trim().toLowerCase()}`)
    .digest("base64url");
  return `${policy}:${digest}`;
}
