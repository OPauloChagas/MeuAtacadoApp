import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e",
  testIgnore: ["**/auth/**","**/admin/**","**/customers/**","**/products/**","**/commercial/**"],
  forbidOnly: Boolean(process.env.CI),
  retries: 0,
  workers: 2,
  reporter: "list",
  use: {
    baseURL: "http://127.0.0.1:3100",
    browserName: "chromium",
    trace: "retain-on-failure",
  },
  projects: [360, 390, 768, 1024, 1440].map((width) => ({
    name: `chromium-${width}`,
    use: { viewport: { width, height: 900 } },
  })),
  webServer: {
    command: "npm run start -- --port 3100",
    url: "http://127.0.0.1:3100",
    reuseExistingServer: false,
    timeout: 60_000,
  },
});
