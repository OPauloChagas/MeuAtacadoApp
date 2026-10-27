import { defineConfig } from "@playwright/test";
if (process.env.AUTH_E2E_LOCAL !== "1" || process.env.NEXT_PUBLIC_SUPABASE_URL !== "http://127.0.0.1:54321") throw new Error("Execute npm run test:products: somente serviços locais.");
export default defineConfig({
  testDir: "./tests/e2e/products", testMatch: "**/*.spec.ts", globalSetup: "./tests/e2e/products/setup.ts",
  outputDir: process.env.AUTH_E2E_OUTPUT ?? "test-results/products", forbidOnly: Boolean(process.env.CI), retries: 0, workers: 1, timeout: 60_000,
  reporter: [["./tests/e2e/auth/reporter.ts"]],
  use: { baseURL: "http://127.0.0.1:3100", browserName: "chromium", trace: "off", screenshot: "off", video: "off", actionTimeout: 12_000 },
  projects: [360, 1440].map(width => ({ name: `products-${width}`, use: { viewport: { width, height: 900 } } })),
  webServer: { command: "npm run start -- --port 3100", url: "http://127.0.0.1:3100", reuseExistingServer: false, timeout: 60_000,
    env: { E2E_IDENTITY_FIXTURES: "", E2E_CUSTOMER_FIXTURES: "", E2E_PRODUCT_FIXTURES: "" } },
});
