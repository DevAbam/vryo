import { z } from "zod";

export const SPORTS = ["football", "basketball"] as const;
export type Sport = (typeof SPORTS)[number];

const RESERVED_HANDLES = new Set([
  "admin",
  "administrator",
  "moderator",
  "mod",
  "support",
  "help",
  "vyro",
  "official",
  "settings",
  "login",
  "signup",
  "api",
  "root",
  "system",
  "null",
  "undefined",
]);

// Mirrors the profiles.handle check constraint: ^[a-z0-9_]{3,20}$ (stored lower-case).
export const handleSchema = z
  .string()
  .trim()
  .toLowerCase()
  .regex(/^[a-z0-9_]{3,20}$/, "Use 3–20 letters, numbers or underscores.")
  .refine((handle) => !RESERVED_HANDLES.has(handle), "That handle is reserved.");

export const displayNameSchema = z
  .string()
  .trim()
  .min(1, "Enter a display name.")
  .max(50, "Use at most 50 characters.");

export const bioSchema = z.string().trim().max(160, "Use at most 160 characters.");

export const sportsSchema = z
  .array(z.enum(SPORTS))
  .max(2)
  .transform((list) => [...new Set(list)]);

export const onboardingSchema = z.object({
  handle: handleSchema,
  favouriteSports: sportsSchema,
});

export const profileUpdateSchema = z.object({
  handle: handleSchema,
  displayName: displayNameSchema,
  bio: bioSchema,
});
