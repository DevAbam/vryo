import { z } from "zod";

// Browser-safe configuration. Next.js inlines NEXT_PUBLIC_* at build time, so
// each variable must be referenced literally (no dynamic process.env access).
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.url(),
  NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.url(),
  // Optional until ImageKit is set up; images fall back to initials.
  NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: z.url().optional(),
});

export type PublicEnv = z.infer<typeof schema>;

let cached: PublicEnv | undefined;

export function publicEnv(): PublicEnv {
  if (cached) return cached;
  const parsed = schema.safeParse({
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
    NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY: process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY,
    NEXT_PUBLIC_SITE_URL: process.env.NEXT_PUBLIC_SITE_URL,
    NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT: process.env.NEXT_PUBLIC_IMAGEKIT_URL_ENDPOINT || undefined,
  });
  if (!parsed.success) {
    const names = parsed.error.issues.map((issue) => issue.path.join(".")).join(", ");
    throw new Error(`Invalid or missing public environment variables: ${names}. See .env.example.`);
  }
  cached = parsed.data;
  return cached;
}
