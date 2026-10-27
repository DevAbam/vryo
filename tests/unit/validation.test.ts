import { describe, expect, it } from "vitest";
import { loginSchema, newPasswordSchema, signupSchema } from "@/lib/validation/auth";
import { handleSchema, onboardingSchema, profileUpdateSchema } from "@/lib/validation/profile";

describe("handleSchema", () => {
  it("normalises to lower case and trims", () => {
    expect(handleSchema.parse("  Kwame_10 ")).toBe("kwame_10");
  });

  it.each(["ab", "a".repeat(21), "has space", "emoji⚽", "dash-ed", "admin", "VYRO"])(
    "rejects %s",
    (input) => {
      expect(handleSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("newPasswordSchema", () => {
  it("accepts a strong password", () => {
    expect(newPasswordSchema.safeParse("Touchline2026").success).toBe(true);
  });

  it.each(["short1A", "alllowercase123", "ALLUPPERCASE123", "NoDigitsHereAtAll"])(
    "rejects %s",
    (input) => {
      expect(newPasswordSchema.safeParse(input).success).toBe(false);
    },
  );
});

describe("auth schemas", () => {
  it("normalises email", () => {
    const parsed = loginSchema.parse({ email: " Fan@Example.COM ", password: "x" });
    expect(parsed.email).toBe("fan@example.com");
  });

  it("strips unknown fields such as privileged flags", () => {
    const parsed = signupSchema.parse({
      displayName: "Fan",
      email: "fan@example.com",
      password: "Touchline2026",
      role: "admin",
    } as Record<string, unknown>);
    expect(parsed).not.toHaveProperty("role");
  });
});

describe("profile schemas", () => {
  it("deduplicates and limits sports", () => {
    const parsed = onboardingSchema.parse({
      handle: "fan_1",
      favouriteSports: ["football", "football"],
    });
    expect(parsed.favouriteSports).toEqual(["football"]);
    expect(
      onboardingSchema.safeParse({ handle: "fan_1", favouriteSports: ["cricket"] }).success,
    ).toBe(false);
  });

  it("limits bio length", () => {
    const result = profileUpdateSchema.safeParse({
      handle: "fan_1",
      displayName: "Fan",
      bio: "x".repeat(161),
    });
    expect(result.success).toBe(false);
  });

  it("does not accept status or role fields", () => {
    const parsed = profileUpdateSchema.parse({
      handle: "fan_1",
      displayName: "Fan",
      bio: "",
      status: "active",
      role: "admin",
    } as Record<string, unknown>);
    expect(Object.keys(parsed).sort()).toEqual(["bio", "displayName", "handle"]);
  });
});
