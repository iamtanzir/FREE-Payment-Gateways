import { defineConfig, devices } from "@playwright/test";

// Standard Playwright config (no service-specific wrappers).
// Point E2E_BASE_URL at a running instance, e.g. http://localhost:8080 or your preview URL.
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  forbidOnly: true,
  retries: process.env.CI ? 2 : 0,
  reporter: "list",
  use: {
    baseURL: process.env.E2E_BASE_URL || "http://localhost:8080",
    trace: "on-first-retry",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
