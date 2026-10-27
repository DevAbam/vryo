import { describe, expect, it } from "vitest";
import { cn } from "@/lib/cn";

describe("cn", () => {
  it("lets later classes override conflicting earlier ones", () => {
    expect(cn("inline-flex items-center", "hidden lg:inline-flex")).toBe(
      "items-center hidden lg:inline-flex",
    );
    expect(cn("rounded-lg bg-surface-2", "size-10 rounded-full")).toBe(
      "bg-surface-2 size-10 rounded-full",
    );
  });

  it("keeps custom utilities and drops falsy values", () => {
    expect(cn("pt-safe", false, null, undefined, "px-4")).toBe("pt-safe px-4");
  });
});
