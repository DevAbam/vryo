import { z } from "zod";

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .max(254, "Email is too long.")
  .pipe(z.email("Enter a valid email address."));

// Mirrors supabase/config.toml: minimum 6, lower + upper + digit.
export const newPasswordSchema = z
  .string()
  .min(6, "Use at least 6 characters.")
  .max(72, "Use at most 72 characters.")
  .regex(/[a-z]/, "Include a lowercase letter.")
  .regex(/[A-Z]/, "Include an uppercase letter.")
  .regex(/[0-9]/, "Include a number.");

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password.").max(72),
});

export const signupSchema = z.object({
  displayName: z
    .string()
    .trim()
    .min(1, "Enter a display name.")
    .max(50, "Use at most 50 characters."),
  email: emailSchema,
  password: newPasswordSchema,
});

export const resetRequestSchema = z.object({ email: emailSchema });

export const updatePasswordSchema = z
  .object({ password: newPasswordSchema, confirm: z.string() })
  .refine((value) => value.password === value.confirm, {
    path: ["confirm"],
    message: "Passwords don't match.",
  });
