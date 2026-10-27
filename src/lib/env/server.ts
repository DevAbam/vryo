import "server-only";
import { z } from "zod";

const schema = z.object({
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  RATE_LIMIT_SALT: z.string().min(16),
});

export type ServerEnv = z.infer<typeof schema>;

let cached: ServerEnv | undefined;

/** Server-only secrets. Importing this module from client code fails the build. */
export function serverEnv(): ServerEnv {
  if (cached) return cached;
  const parsed = schema.safeParse({
    SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY,
    RATE_LIMIT_SALT: process.env.RATE_LIMIT_SALT,
  });
  if (!parsed.success) {
    // Report names only, never values.
    const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid or missing server environment variables: ${names}. See .env.example.`);
  }
  cached = parsed.data;
  return cached;
}
