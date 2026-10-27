import { describe, expect, it } from "vitest";
import { safeNextPath } from "@/lib/security/redirect";

describe("safeNextPath", () => {
  it.each([
    ["/feed", "/feed"],
    ["/settings", "/settings"],
    ["/profile/kwame", "/profile/kwame"],
    ["/stream?sport=football", "/stream?sport=football"],
  ])("allows in-app path %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });

  it.each([
    ["absolute URL", "https://evil.example/feed"],
    ["protocol-relative", "//evil.example/feed"],
    ["backslash trick", "/\evil.example"],
    ["javascript scheme", "javascript:alert(1)"],
    ["unknown path", "/admin"],
    ["prefix lookalike", "/feedback"],
    ["control characters", "/feed\n"],
    ["empty", ""],
    ["non-string", 42],
    ["null", null],
    ["path traversal out of allowlist", "/feed/../admin"],
  ])("rejects %s", (_label, input) => {
    expect(safeNextPath(input)).toBe("/feed");
  });

  it("uses the provided fallback", () => {
    expect(safeNextPath("https://evil.example", "/onboarding")).toBe("/onboarding");
  });
});
