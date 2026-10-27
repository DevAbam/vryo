import { existsSync } from "node:fs";
import { defineConfig, devices } from "@playwright/test";

// Test helpers create users through the same project the app talks to.
// Variables already set in the shell (e.g. by CI) take precedence.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

// Own port so tests never reuse a developer's `npm run dev` on :3000, which is
// slower (on-demand compilation) and not what ships.
const port = Number(process.env.E2E_PORT ?? 3100);
const baseURL = process.env.E2E_BASE_URL ?? `http://localhost:${port}`;

export default defineConfig({
  testDir: "./tests/e2e",
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: { baseURL, trace: "retain-on-failure" },
  projects: [
    {
      name: "mobile",
      use: { ...devices["Desktop Chrome"], viewport: { width: 390, height: 844 } },
    },
    {
      name: "tablet",
      use: { ...devices["Desktop Chrome"], viewport: { width: 834, height: 1112 } },
    },
    {
      name: "laptop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1280, height: 800 } },
    },
    {
      name: "desktop",
      use: { ...devices["Desktop Chrome"], viewport: { width: 1536, height: 960 } },
    },
  ],
  webServer: process.env.E2E_BASE_URL
    ? undefined
    : {
        // CI builds in an earlier step; locally build first.
        command: process.env.CI
          ? `npx next start -p ${port}`
          : `npm run build && npx next start -p ${port}`,
        url: baseURL,
        timeout: 300_000,
        reuseExistingServer: false,
      },
});
