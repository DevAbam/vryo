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

// Needs the local Supabase stack (npm run db:start) and the app pointed at it.
test.skip(!dbConfigured, "Supabase test environment not configured");

test.describe("signed-in app shell", () => {
  // Many round trips to a hosted Supabase project; the default 30s is too tight.
  test.describe.configure({ timeout: 90_000 });

  let user: TestUser;

  test.beforeEach(async () => {
    user = await createTestUser("e2e");
  });

  test.afterEach(async () => {
    await deleteTestUsers([user]);
  });

  test("onboarding, navigation, profile edit and sign out", async ({ page }, testInfo) => {
    await signIn(page, user, /\/onboarding$/);

    await expect(page).toHaveURL(/\/onboarding$/);
    const handle = `e2e_${Date.now().toString(36)}`.slice(0, 20);
    await page.getByLabel("Choose your handle").fill(handle);
    await page.getByRole("button", { name: "Continue" }).click();
    await expect(page).toHaveURL(/\/feed$/);

    const width = page.viewportSize()?.width ?? 0;
    const primary = page.getByRole("navigation", { name: "Primary" });
    const sections = page.getByRole("navigation", { name: "Sections" });
    const liveRail = page.getByRole("complementary", { name: "Live now" });

    if (width < 768) {
      await expect(sections).toBeVisible();
      await expect(liveRail).toBeHidden();
      await sections.getByRole("link", { name: "Stream" }).click();
    } else {
      await expect(primary.getByRole("link", { name: "Stream" })).toBeVisible();
      await expect(liveRail).toBeVisible({ visible: width >= 1024 });
      await expect(sections).toBeVisible({ visible: width < 1024 });
      await primary.getByRole("link", { name: "Stream" }).click();
    }
    await expect(page).toHaveURL(/\/stream$/);
    await expect(page.getByText("No matches to show yet")).toBeVisible();

    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(0);
    await page.screenshot({ path: testInfo.outputPath("stream.png"), fullPage: true });

    const axe = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
    expect(axe.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);

    await page.goto("/settings");
    await page.getByLabel("Bio").fill("Here for the tactics.");
    await page.getByRole("button", { name: "Save profile" }).click();
    await expect(page.getByText("Profile saved.")).toBeVisible();

    await page.goto(`/profile/${handle}`);
    await expect(page.getByText("Here for the tactics.")).toBeVisible();
    const badge = page.getByRole("main").getByRole("img", { name: "Verified account" });
    await expect(badge).toHaveCount(0);
    await serviceClient()
      .from("profiles")
      .update({ verified_at: new Date().toISOString() })
      .eq("id", user.id);
    await page.reload();
    await expect(badge).toBeVisible();
    await page.screenshot({ path: testInfo.outputPath("profile-verified.png") });

    await page.goto("/settings");
    // The sidebar also has a sign-out button from `lg`; use the settings one.
    await page.getByRole("main").getByRole("button", { name: "Sign out", exact: true }).click();
    await expect(page).toHaveURL(/\/login$/);
    await page.goto("/feed");
    await expect(page).toHaveURL(/\/login\?next=%2Ffeed$/);
  });
});
