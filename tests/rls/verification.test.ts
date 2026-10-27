import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  createTestUser,
  dbConfigured,
  deleteTestUsers,
  serviceClient,
  type Client,
  type TestUser,
} from "./helpers";

/**
 * Verification requests: eligibility, one open request, admin-only review,
 * rejection cooldown, revocation, and visibility of requests.
 * Followers are a placeholder (0) until Phase 2, so tests lower the threshold.
 */
describe.skipIf(!dbConfigured)("verification requests", () => {
  let a: TestUser;
  let b: TestUser;
  let c: TestUser;
  let mod: TestUser;
  let admin: TestUser;

  const setThreshold = (value: number) =>
    serviceClient().from("app_config").update({ value }).eq("key", "verification_min_followers");

  const submit = (client: Client, message = "") =>
    client.rpc("submit_verification_request", { p_message: message });

  const pendingId = async (user: TestUser) => {
    const { data } = await serviceClient()
      .from("verification_requests")
      .select("id")
      .eq("user_id", user.id)
      .eq("status", "pending")
      .single();
    return data!.id;
  };

  beforeAll(async () => {
    [a, b, c, mod, admin] = await Promise.all(
      ["va", "vb", "vc", "vmod", "vadmin"].map((label) => createTestUser(label)),
    );
    const service = serviceClient();
    for (const [user, i] of [a, b, c, mod, admin].map((u, i) => [u, i] as const)) {
      await service
        .from("profiles")
        .update({ handle: `vt_${i}_${Date.now().toString(36)}` })
        .eq("id", user.id);
    }
    await service.from("user_roles").insert([
      { user_id: mod.id, role: "moderator" },
      { user_id: admin.id, role: "admin" },
    ]);
  });

  afterAll(async () => {
    await setThreshold(10_000);
    await deleteTestUsers([a, b, c, mod, admin].filter(Boolean));
  });

  it("refuses applicants below the follower threshold", async () => {
    await setThreshold(10_000);
    const { error } = await submit(a.client);
    expect(error?.message).toBe("not_eligible");
  });

  it("accepts an eligible applicant once, and only once", async () => {
    await setThreshold(0);
    const first = await submit(a.client, "Official club account");
    expect(first.error).toBeNull();
    const second = await submit(a.client);
    expect(second.error?.message).toBe("already_pending");
  });

  it("never allows writing requests directly", async () => {
    const insert = await b.client
      .from("verification_requests")
      .insert({ user_id: b.id, follower_count_at_submit: 999_999 });
    expect(insert.error?.code).toBe("42501");
    const update = await a.client
      .from("verification_requests")
      .update({ status: "approved" })
      .eq("user_id", a.id);
    expect(update.error?.code).toBe("42501");
  });

  it("shows requests only to their owner and admins", async () => {
    expect((await a.client.from("verification_requests").select("id")).data).toHaveLength(1);
    expect((await b.client.from("verification_requests").select("id")).data).toEqual([]);
    expect((await mod.client.from("verification_requests").select("id")).data).toEqual([]);
    const adminView = await admin.client
      .from("verification_requests")
      .select("id")
      .eq("user_id", a.id);
    expect(adminView.data).toHaveLength(1);
  });

  it("lets only admins review", async () => {
    const id = await pendingId(a);
    for (const client of [a.client, b.client, mod.client]) {
      const { error } = await client.rpc("review_verification_request", {
        p_request_id: id,
        p_approve: true,
        p_note: "",
      });
      expect(error?.message).toBe("forbidden");
    }
  });

  it("approving verifies the account and writes the audit log", async () => {
    const id = await pendingId(a);
    const { error } = await admin.client.rpc("review_verification_request", {
      p_request_id: id,
      p_approve: true,
      p_note: "Checked official links",
    });
    expect(error).toBeNull();

    const service = serviceClient();
    const { data: profile } = await service
      .from("profiles")
      .select("verified_at")
      .eq("id", a.id)
      .single();
    expect(profile?.verified_at).not.toBeNull();
    const { data: audit } = await service
      .from("audit_log")
      .select("actor_id, action")
      .eq("target_id", a.id)
      .eq("action", "verification.approved");
    expect(audit).toEqual([{ actor_id: admin.id, action: "verification.approved" }]);

    const again = await admin.client.rpc("review_verification_request", {
      p_request_id: id,
      p_approve: false,
      p_note: "",
    });
    expect(again.error?.message).toBe("not_pending");
    expect((await submit(a.client)).error?.message).toBe("already_verified");
  });

  it("rejection shows the note to the applicant and starts a cooldown", async () => {
    expect((await submit(b.client)).error).toBeNull();
    const { error } = await admin.client.rpc("review_verification_request", {
      p_request_id: await pendingId(b),
      p_approve: false,
      p_note: "Couldn't confirm identity",
    });
    expect(error).toBeNull();
    const { data } = await b.client.from("verification_requests").select("status, review_note");
    expect(data).toEqual([{ status: "rejected", review_note: "Couldn't confirm identity" }]);
    expect((await submit(b.client)).error?.message).toBe("cooldown");
  });

  it("applicants can withdraw their own pending request", async () => {
    expect((await submit(c.client)).error).toBeNull();
    expect((await c.client.rpc("withdraw_verification_request")).error).toBeNull();
    const again = await c.client.rpc("withdraw_verification_request");
    expect(again.error?.message).toBe("not_pending");
  });

  it("admins can revoke and grant directly; others cannot", async () => {
    const denied = await mod.client.rpc("admin_set_verified", {
      p_user_id: c.id,
      p_verified: true,
      p_note: "",
    });
    expect(denied.error?.message).toBe("forbidden");

    const revoke = await admin.client.rpc("admin_set_verified", {
      p_user_id: a.id,
      p_verified: false,
      p_note: "Impersonation report",
    });
    expect(revoke.error).toBeNull();
    const { data } = await serviceClient()
      .from("profiles")
      .select("verified_at")
      .eq("id", a.id)
      .single();
    expect(data?.verified_at).toBeNull();
  });

  it("a suspended admin loses review powers", async () => {
    await serviceClient().from("profiles").update({ status: "suspended" }).eq("id", admin.id);
    const { error } = await admin.client.rpc("admin_set_verified", {
      p_user_id: c.id,
      p_verified: true,
      p_note: "",
    });
    expect(error?.message).toBe("forbidden");
  });
});
