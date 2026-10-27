import type { z } from "zod";

export type FieldErrors = Record<string, string>;

/** Flattens Zod issues into one message per field for accessible form errors. */
export function fieldErrors(error: z.ZodError): FieldErrors {
  const out: FieldErrors = {};
  for (const issue of error.issues) {
    const key = issue.path.join(".") || "form";
    out[key] ??= issue.message;
  }
  return out;
}

export type FormState = {
  status: "idle" | "error" | "success";
  message?: string;
  fieldErrors?: FieldErrors;
};

export const initialFormState: FormState = { status: "idle" };
