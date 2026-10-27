import type { Page } from "@playwright/test";
import { serviceClient, type TestUser } from "../rls/helpers";

export const TEST_PASSWORD = "Test-Password-2026";

/**
 * Every E2E test signs in from the same address, so a full run quickly trips the
 * real per-IP login limit (which is working as intended). Test environments
 * only: clear the login buckets before signing in.
 */
async function resetLoginRateLimits() {
  await serviceClient().from("rate_limits").delete().like("key", "login%");
}

export async function signIn(page: Page, user: TestUser, waitFor: RegExp = /\/feed/) {
  await resetLoginRateLimits();
  await page.goto("/login");
  await page.getByLabel("Email").fill(user.email);
  await page.getByLabel("Password").fill(TEST_PASSWORD);
  await page.getByRole("button", { name: "Sign in" }).click();
  await page.waitForURL(waitFor);
}
