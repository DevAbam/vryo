import { afterEach, describe, expect, it, vi } from "vitest";
import { AppError, errorResponse, toErrorBody } from "@/lib/errors";
import { logger, redact } from "@/lib/observability/logger";
import { rateLimitKey } from "@/lib/rate-limit/key";
import { resolveRequestId } from "@/lib/security/request-id";

describe("error contract", () => {
  it("returns the public shape for AppError", () => {
    const { status, body } = toErrorBody(new AppError("FORBIDDEN"), "req-12345678");
    expect(status).toBe(403);
    expect(body).toEqual({
      error: {
        code: "FORBIDDEN",
        message: "You don't have permission to do that.",
        requestId: "req-12345678",
      },
    });
  });

  it("hides details of unexpected errors", () => {
    const { status, body } = toErrorBody(
      new Error('relation "secret_table" does not exist'),
      "req-12345678",
    );
    expect(status).toBe(500);
    expect(JSON.stringify(body)).not.toContain("secret_table");
  });

  it("sets retry-after for rate limits", async () => {
    const response = errorResponse(
      new AppError("RATE_LIMITED", { retryAfterSeconds: 30 }),
      "req-12345678",
    );
    expect(response.status).toBe(429);
    expect(response.headers.get("retry-after")).toBe("30");
    expect(response.headers.get("x-request-id")).toBe("req-12345678");
  });
});

describe("logger", () => {
  afterEach(() => vi.restoreAllMocks());

  it("redacts sensitive keys at any depth", () => {
    const out = redact({
      userId: "u1",
      headers: { Authorization: "Bearer abc", cookie: "sb=1" },
      nested: [{ access_token: "t", password: "p", apiKey: "k" }],
      body: "private message",
    });
    expect(JSON.stringify(out)).not.toMatch(/Bearer abc|sb=1|"t"|"p"|"k"|private message/);
    expect(out).toMatchObject({ userId: "u1" });
  });

  it("writes one JSON line per entry", () => {
    const spy = vi.spyOn(console, "log").mockImplementation(() => {});
    logger.info("test.event", { requestId: "r1", token: "secret" });
    const line = JSON.parse(spy.mock.calls[0][0] as string);
    expect(line).toMatchObject({ level: "info", message: "test.event", requestId: "r1" });
    expect(line.token).toBe("[redacted]");
  });
});

describe("rateLimitKey", () => {
  it("hashes identifiers and normalises case", () => {
    const a = rateLimitKey("loginByEmail", "Fan@Example.com", "salt-salt-salt-salt");
    const b = rateLimitKey("loginByEmail", "fan@example.com", "salt-salt-salt-salt");
    expect(a).toBe(b);
    expect(a.startsWith("loginByEmail:")).toBe(true);
    expect(a).not.toContain("fan@example.com");
  });

  it("depends on the salt", () => {
    expect(rateLimitKey("p", "1.2.3.4", "salt-one-salt-one")).not.toBe(
      rateLimitKey("p", "1.2.3.4", "salt-two-salt-two"),
    );
  });
});

describe("resolveRequestId", () => {
  it("keeps a well-formed id", () => {
    expect(resolveRequestId("abc-12345678")).toBe("abc-12345678");
  });

  it("replaces malformed or injected ids", () => {
    const id = resolveRequestId("bad id\r\nx-admin: 1");
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
  });
});
