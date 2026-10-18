import { defineConfig, devices } from "@playwright/test";

/**
 * End-to-end tests run against a running stack (backend + frontend + seeded database):
 *   docker compose up -d   (or run both apps locally), then `npm run e2e`.
 * E2E_BASE_URL overrides the target; PW_CHROMIUM_PATH points at a pre-installed Chromium if needed.
 */
const executablePath = process.env.PW_CHROMIUM_PATH || undefined;

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [["github"], ["html", { open: "never" }]] : "list",
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://localhost:3000",
    trace: "retain-on-failure",
    launchOptions: { executablePath },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], launchOptions: { executablePath } } },
    { name: "mobile", use: { ...devices["Pixel 7"], launchOptions: { executablePath } }, grep: /@mobile/ },
  ],
});
