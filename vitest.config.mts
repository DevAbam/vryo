import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

// DB tests read the same .env.local as the app. Variables already set in the
// shell (e.g. by CI) take precedence.
if (existsSync(".env.local")) process.loadEnvFile(".env.local");

const alias = { "@": fileURLToPath(new URL("./src", import.meta.url)) };

export default defineConfig({
  test: {
    projects: [
      {
        resolve: { alias },
        test: {
          name: "unit",
          include: ["src/**/*.test.ts", "tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        resolve: { alias },
        test: {
          name: "db",
          include: ["tests/rls/**/*.test.ts"],
          environment: "node",
          testTimeout: 30_000,
          hookTimeout: 60_000,
          fileParallelism: false,
        },
      },
    ],
  },
});
