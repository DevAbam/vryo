import AxeBuilder from "@axe-core/playwright";
import { expect, test } from "@playwright/test";
import {
  createTestUser,
  dbConfigured,
  deleteTestUsers,
  serviceClient,
  type TestUser,
} from "../rls/helpers";
import { signIn } from "./support";

test.skip(!dbConfigured, "Supabase test environment not configured");

test.describe("verification review", () => {
  test.describe.configure({ timeout: 120_000 });

  let applicant: TestUser;
  let admin: TestUser;
  let applicantHandle: string;

  test.beforeEach(async () => {
    [applicant, admin] = await Promise.all([createTestUser("app"), createTestUser("adm")]);
    const service = serviceClient();
    const stamp = Date.now().toString(36);
    applicantHandle = `ap_${stamp}`;
    await service.from("profiles").update({ handle: applicantHandle }).eq("id", applicant.id);
    await service
      .from("profiles")
      .update({ handle: `ad_${stamp}` })
      .eq("id", admin.id);
    await service.from("user_roles").insert({ user_id: admin.id, role: "admin" });
    // Followers don't exist until Phase 2, so seed the pending request directly.
    await service.from("verification_requests").insert({
      user_id: applicant.id,
      message: "Official supporters club",
      follower_count_at_submit: 12_000,
    });
  });

  test.afterEach(async () => {
    await deleteTestUsers([applicant, admin]);
  });

  test("non-admins see no admin link and can't open the admin page", async ({ page }) => {
    await signIn(page, applicant);
    // Not hidden with CSS: the link must not be in the page at all.
    await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Verification" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Admin tools" })).toHaveCount(0);
    await expect(page.locator('a[href^="/admin"]')).toHaveCount(0);
    await page.goto("/admin/verification");
    await expect(page.getByRole("heading", { name: "Page not found" })).toBeVisible();
  });

  test("admins see the admin link", async ({ page }) => {
    await signIn(page, admin);
    const width = page.viewportSize()?.width ?? 0;
    if (width >= 768) {
      // Tablet rail and desktop sidebar.
      await expect(
        page.getByRole("navigation", { name: "Primary" }).getByRole("link", { name: "Admin" }),
      ).toBeVisible();
    }
    // Every size, including mobile: Settings → Admin tools.
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Admin tools" })).toBeVisible();
    await page.getByRole("link", { name: "Open verification queue" }).click();
    await expect(page).toHaveURL(/\/admin\/verification$/);
  });

  test("applicant sees requirements and their pending request", async ({ page }) => {
    await signIn(page, applicant);
    await page.goto("/settings");
    await expect(page.getByRole("heading", { name: "Verification" })).toBeVisible();
    await expect(page.getByText("Request under review")).toBeVisible();
    await expect(page.getByRole("progressbar", { name: /followers/i })).toBeVisible();
  });

  test("admin approves a request and the badge appears", async ({ page }, testInfo) => {
    await signIn(page, admin);
    await page.goto("/admin/verification");
    const card = page.locator("li", { hasText: `@${applicantHandle}` });
    await expect(card.getByText("Official supporters club")).toBeVisible();
    await expect(card.getByText("12,000")).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("admin-queue.png"), fullPage: true });

    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await card.getByRole("button", { name: "Approve" }).click();
    await card.getByLabel("Internal note (optional)").fill("Confirmed via club website");
    await card.getByRole("button", { name: "Yes, approve" }).click();
    await expect(
      page.getByRole("status").filter({ hasText: `Approved @${applicantHandle}` }),
    ).toBeVisible();
    await expect(page.locator("li", { hasText: `@${applicantHandle}` })).toHaveCount(0);

    await page.goto(`/profile/${applicantHandle}`);
    await expect(
      page.getByRole("main").getByRole("img", { name: "Verified account" }),
    ).toBeVisible();

    // Revoke from the profile page's admin bar.
    await page.getByRole("button", { name: "Revoke badge" }).click();
    await page.getByRole("button", { name: "Yes, revoke" }).click();
    await expect(page.getByText(`Removed the badge from @${applicantHandle}.`)).toBeVisible();
    await page.reload();
    await expect(page.getByRole("main").getByRole("img", { name: "Verified account" })).toHaveCount(
      0,
    );
  });
});
