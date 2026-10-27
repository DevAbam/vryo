import { twMerge } from "tailwind-merge";

/** Joins class names; later Tailwind classes override conflicting earlier ones. */
export function cn(...classes: Array<string | false | null | undefined>): string {
  return twMerge(classes.filter(Boolean).join(" "));
}
