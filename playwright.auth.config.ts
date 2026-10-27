import { defineConfig } from "@playwright/test";

if (process.env.AUTH_E2E_LOCAL !== "1" || process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321" || process.env.APP_URL !== "http://127.0.0.1:3100") throw new Error("Execute npm run test:auth para garantir o ambiente local.");

export default defineConfig({
  testDir: "./tests/e2e/auth",
  testMatch: "**/*.spec.ts",
  outputDir: process.env.AUTH_E2E_OUTPUT ?? "test-results/auth",
  globalSetup: "./tests/e2e/auth/setup.ts",
  forbidOnly: Boolean(process.env.CI), retries: 0, workers: 1,
  timeout: 45_000,
  reporter: [["./tests/e2e/auth/reporter.ts"]],
  use: { baseURL: "http://127.0.0.1:3100", browserName: "chromium", trace: "off", screenshot: "off", video: "off", actionTimeout: 10_000 },
  projects: [360, 1440].map((width) => ({ name: `auth-${width}`, use: { viewport: { width, height: 900 } } })),
  webServer: {
    command: "npm run start -- --port 3100", url: "http://127.0.0.1:3100", reuseExistingServer: false,
    timeout: 60_000, env: { E2E_IDENTITY_FIXTURES: "" },
  },
});
