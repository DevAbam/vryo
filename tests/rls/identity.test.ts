import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  anonClient,
  createTestUser,
  dbConfigured,
  deleteTestUsers,
  serviceClient,
  type TestUser,
} from "./helpers";

/**
 * Phase 1 exit gate: identity tables enforce RLS for anonymous visitors,
 * two unrelated users, a moderator, an admin and a suspended user.
 * Mirrors docs/architecture/rls-matrix.md.
 */
describe.skipIf(!dbConfigured)("identity RLS", () => {
  let a: TestUser;
  let b: TestUser;
  let mod: TestUser;
  let admin: TestUser;
  let suspended: TestUser;

  beforeAll(async () => {
    [a, b, mod, admin, suspended] = await Promise.all([
      createTestUser("a"),
      createTestUser("b"),
      createTestUser("mod"),
      createTestUser("admin"),
      createTestUser("suspended"),
    ]);
    const service = serviceClient();
    const { error } = await service.from("user_roles").insert([
      { user_id: mod.id, role: "moderator" },
      { user_id: admin.id, role: "admin" },
    ]);
    if (error) throw error;
    const { error: statusError } = await service
      .from("profiles")
      .update({ status: "suspended" })
      .eq("id", suspended.id);
    if (statusError) throw statusError;
  });

  afterAll(async () => {
    await deleteTestUsers([a, b, mod, admin, suspended].filter(Boolean));
  });

  describe("signup trigger", () => {
    it("creates a profile and preferences for each new user", async () => {
      const { data: profile } = await a.client
        .from("profiles")
        .select("id, handle, display_name, status")
        .eq("id", a.id)
        .single();
      expect(profile).toMatchObject({
        id: a.id,
        handle: null,
        display_name: "Test a",
        status: "active",
      });

      const { data: prefs } = await a.client
        .from("user_preferences")
        .select("user_id, favourite_sports")
        .single();
      expect(prefs).toMatchObject({ user_id: a.id, favourite_sports: [] });
    });
  });

  describe("anonymous visitor", () => {
    let anon: ReturnType<typeof anonClient>;
    beforeAll(() => {
      anon = anonClient();
    });

    it("can read active profiles but not suspended ones", async () => {
      const { data } = await anon.from("profiles").select("id").in("id", [a.id, suspended.id]);
      expect(data?.map((row) => row.id)).toEqual([a.id]);
    });

    it("cannot read preferences, roles, audit log or rate limits", async () => {
      const prefs = await anon.from("user_preferences").select("user_id");
      expect(prefs.data ?? []).toHaveLength(0);
      for (const table of ["user_roles", "audit_log", "rate_limits"] as const) {
        const { error } = await anon.from(table).select("*").limit(1);
        expect(error?.code, table).toBe("42501");
      }
    });

    it("cannot write profiles", async () => {
      const { error } = await anon
        .from("profiles")
        .update({ display_name: "hacked" })
        .eq("id", a.id);
      expect(error?.code).toBe("42501");
    });

    it("cannot call privileged functions", async () => {
      const limiter = await anon.rpc("rate_limit_hit", {
        p_key: "x",
        p_limit: 1,
        p_window_seconds: 60,
      });
      expect(limiter.error).not.toBeNull();
      const role = await anon.rpc("has_role", { p_role: "admin" });
      expect(role.error).not.toBeNull();
    });
  });

  describe("user A vs user B", () => {
    it("A can update their own safe profile fields", async () => {
      const { data, error } = await a.client
        .from("profiles")
        .update({ display_name: "Kwame", bio: "Midfield maestro", handle: "rls_fan_a" })
        .eq("id", a.id)
        .select("display_name, handle");
      expect(error).toBeNull();
      expect(data).toEqual([{ display_name: "Kwame", handle: "rls_fan_a" }]);
    });

    it("A cannot update B's profile", async () => {
      const { data, error } = await a.client
        .from("profiles")
        .update({ display_name: "pwned" })
        .eq("id", b.id)
        .select("id");
      expect(error).toBeNull();
      expect(data).toEqual([]);
      const { data: bProfile } = await serviceClient()
        .from("profiles")
        .select("display_name")
        .eq("id", b.id)
        .single();
      expect(bProfile?.display_name).toBe("Test b");
    });

    it("A cannot change protected columns on their own profile", async () => {
      for (const patch of [
        { status: "active" as const },
        { id: b.id },
        { created_at: "2000-01-01T00:00:00Z" },
        { verified_at: "2026-01-01T00:00:00Z" },
      ]) {
        const { error } = await a.client.from("profiles").update(patch).eq("id", a.id);
        expect(error?.code, JSON.stringify(patch)).toBe("42501");
      }
    });

    it("A cannot insert or delete profiles", async () => {
      const insert = await a.client
        .from("profiles")
        .insert({ id: crypto.randomUUID(), display_name: "ghost" });
      expect(insert.error?.code).toBe("42501");
      const del = await a.client.from("profiles").delete().eq("id", a.id);
      expect(del.error?.code).toBe("42501");
    });

    it("handles are unique and must be lower case", async () => {
      const upper = await b.client.from("profiles").update({ handle: "RLS_FAN_A" }).eq("id", b.id);
      expect(upper.error?.code).toBe("23514");
      const taken = await b.client.from("profiles").update({ handle: "rls_fan_a" }).eq("id", b.id);
      expect(taken.error?.code).toBe("23505");
    });

    it("A cannot read or update B's preferences", async () => {
      const read = await a.client.from("user_preferences").select("user_id").eq("user_id", b.id);
      expect(read.data).toEqual([]);
      const write = await a.client
        .from("user_preferences")
        .update({ favourite_sports: ["football"] })
        .eq("user_id", b.id)
        .select("user_id");
      expect(write.data).toEqual([]);
    });

    it("A can update their own preferences", async () => {
      const { data, error } = await a.client
        .from("user_preferences")
        .update({ favourite_sports: ["football", "basketball"] })
        .eq("user_id", a.id)
        .select("favourite_sports");
      expect(error).toBeNull();
      expect(data).toEqual([{ favourite_sports: ["football", "basketball"] }]);
    });
  });

  describe("avatar paths", () => {
    it("A can point their avatar at a file in their own folder", async () => {
      const path = `/avatars/${a.id}/avatar_x1Y2.webp`;
      const { error } = await a.client
        .from("profiles")
        .update({ avatar_path: path })
        .eq("id", a.id);
      expect(error).toBeNull();
      await a.client.from("profiles").update({ avatar_path: null }).eq("id", a.id);
    });

    it("avatar_file_id must look like an ImageKit id", async () => {
      const ok = await a.client
        .from("profiles")
        .update({ avatar_file_id: "65f1a2b3c4d5e6f7a8b9c0d1" })
        .eq("id", a.id);
      expect(ok.error).toBeNull();
      const bad = await a.client
        .from("profiles")
        .update({ avatar_file_id: "../../etc" })
        .eq("id", a.id);
      expect(bad.error?.code).toBe("23514");
      await a.client.from("profiles").update({ avatar_file_id: null }).eq("id", a.id);
    });

    it.each([
      ["another user's folder", (t: { b: string }) => `/avatars/${t.b}/avatar.webp`],
      ["an external URL", () => "https://evil.example/a.png"],
      ["a path traversal", (t: { a: string }) => `/avatars/${t.a}/../x.webp`],
    ])("A cannot point their avatar at %s", async (_label, build) => {
      const path = (build as (t: { a: string; b: string }) => string)({ a: a.id, b: b.id });
      const { error } = await a.client
        .from("profiles")
        .update({ avatar_path: path })
        .eq("id", a.id);
      expect(error?.code).toBe("23514");
    });
  });

  describe("verification", () => {
    it("is visible to everyone once staff set it", async () => {
      await serviceClient()
        .from("profiles")
        .update({ verified_at: new Date().toISOString() })
        .eq("id", b.id);
      const { data } = await anonClient().from("profiles").select("verified_at").eq("id", b.id);
      expect(data?.[0]?.verified_at).not.toBeNull();
    });

    it("cannot be removed by the user either", async () => {
      const { error } = await b.client
        .from("profiles")
        .update({ verified_at: null })
        .eq("id", b.id);
      expect(error?.code).toBe("42501");
    });
  });

  describe("role escalation", () => {
    it("a user cannot grant themselves a role", async () => {
      const { error } = await a.client.from("user_roles").insert({ user_id: a.id, role: "admin" });
      expect(error?.code).toBe("42501");
    });

    it("a moderator cannot promote themselves to admin", async () => {
      const insert = await mod.client.from("user_roles").insert({ user_id: mod.id, role: "admin" });
      expect(insert.error?.code).toBe("42501");
      const update = await mod.client
        .from("user_roles")
        .update({ role: "admin" })
        .eq("user_id", mod.id);
      expect(update.error?.code).toBe("42501");
    });

    it("has_role reflects server-managed roles only", async () => {
      expect((await a.client.rpc("has_role", { p_role: "moderator" })).data).toBe(false);
      expect((await mod.client.rpc("has_role", { p_role: "moderator" })).data).toBe(true);
      expect((await mod.client.rpc("has_role", { p_role: "admin" })).data).toBe(false);
      expect((await admin.client.rpc("has_role", { p_role: "moderator" })).data).toBe(true);
      expect((await admin.client.rpc("has_role", { p_role: "admin" })).data).toBe(true);
    });

    it("users see only their own roles; staff see all", async () => {
      const own = await mod.client.from("user_roles").select("user_id, role");
      expect(own.data).toEqual(
        expect.arrayContaining([
          { user_id: mod.id, role: "moderator" },
          { user_id: admin.id, role: "admin" },
        ]),
      );
      const plain = await a.client.from("user_roles").select("user_id");
      expect(plain.data).toEqual([]);
    });
  });

  describe("suspended user", () => {
    it("can see their own profile but cannot edit it", async () => {
      const read = await suspended.client.from("profiles").select("status").eq("id", suspended.id);
      expect(read.data).toEqual([{ status: "suspended" }]);
      const write = await suspended.client
        .from("profiles")
        .update({ display_name: "still here" })
        .eq("id", suspended.id)
        .select("id");
      expect(write.data).toEqual([]);
    });

    it("loses staff privileges while suspended", async () => {
      const service = serviceClient();
      await service.from("user_roles").insert({ user_id: suspended.id, role: "moderator" });
      const { data } = await suspended.client.rpc("has_role", { p_role: "moderator" });
      expect(data).toBe(false);
    });

    it("is hidden from other users", async () => {
      const { data } = await b.client.from("profiles").select("id").eq("id", suspended.id);
      expect(data).toEqual([]);
    });
  });

  describe("rate limiter", () => {
    it("allows up to the limit within a window, then blocks", async () => {
      const service = serviceClient();
      const key = `test:${crypto.randomUUID()}`;
      const results = [];
      for (let i = 0; i < 4; i++) {
        const { data, error } = await service.rpc("rate_limit_hit", {
          p_key: key,
          p_limit: 3,
          p_window_seconds: 60,
        });
        expect(error).toBeNull();
        results.push(data?.[0]);
      }
      expect(results.map((r) => r?.allowed)).toEqual([true, true, true, false]);
      expect(results[3]?.retry_after_seconds).toBeGreaterThan(0);
      await service.from("rate_limits").delete().eq("key", key);
    });

    it("is not callable by signed-in users", async () => {
      const { error } = await a.client.rpc("rate_limit_hit", {
        p_key: "x",
        p_limit: 1,
        p_window_seconds: 60,
      });
      expect(error).not.toBeNull();
    });
  });
});
