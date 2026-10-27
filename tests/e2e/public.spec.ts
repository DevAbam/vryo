import AxeBuilder from "@axe-core/playwright";
import { expect, test, type Page } from "@playwright/test";

async function expectNoHorizontalScroll(page: Page) {
  const overflow = await page.evaluate(
    () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
  );
  expect(overflow).toBeLessThanOrEqual(0);
}

async function expectAccessible(page: Page) {
  const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa"]).analyze();
  expect(results.violations.map((v) => `${v.id}: ${v.help}`)).toEqual([]);
}

test.describe("public pages", () => {
  test("landing page", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByRole("heading", { level: 1 })).toContainText("Every match");
    await expect(page.getByRole("link", { name: "Create your account" })).toBeVisible();
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
  });

  test("login page", async ({ page }, testInfo) => {
    await page.goto("/login");
    await expect(page.getByRole("heading", { name: "Welcome back" })).toBeVisible();
    await expect(page.getByLabel("Email")).toBeVisible();
    await expect(page.getByLabel("Password")).toBeVisible();
    // Brand panel appears beside the form from the laptop breakpoint.
    const wide = (page.viewportSize()?.width ?? 0) >= 1024;
    await expect(page.getByText("Every match. Every take.")).toBeVisible({ visible: wide });
    await expectNoHorizontalScroll(page);
    await expectAccessible(page);
    await page.screenshot({ path: testInfo.outputPath("login.png"), fullPage: true });
  });

  test("signup validates input on the server", async ({ page }) => {
    await page.goto("/signup");
    await page.getByLabel("Display name").fill("Fan");
    await page.getByLabel("Email").fill("not-an-email");
    await page.getByLabel("Password").fill("short");
    await page.getByRole("button", { name: "Create account" }).click();
    await expect(page.getByText("Enter a valid email address.")).toBeVisible();
    await expect(page.getByText("Use at least 10 characters.")).toBeVisible();
    await expect(page.getByLabel("Email")).toHaveAttribute("aria-invalid", "true");
    await expectAccessible(page);
  });

  test("protected pages redirect to login with a safe next path", async ({ page }) => {
    await page.goto("/settings");
    await expect(page).toHaveURL(/\/login\?next=%2Fsettings$/);
  });

  test("security headers are set", async ({ request }) => {
    const response = await request.get("/login");
    const headers = response.headers();
    expect(headers["content-security-policy"]).toContain("frame-ancestors 'none'");
    expect(headers["x-content-type-options"]).toBe("nosniff");
    expect(headers["x-frame-options"]).toBe("DENY");
    expect(headers["x-request-id"]).toBeTruthy();
    expect(headers["x-powered-by"]).toBeUndefined();
  });
});
