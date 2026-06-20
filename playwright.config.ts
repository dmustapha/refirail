// File: playwright.config.ts  (T4/T5)
import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./e2e",
  testMatch: "**/*.spec.ts",
  timeout: 90_000, // first preview/deleverage hits a cold gRPC init (~12s)
  expect: { timeout: 30_000 },
  fullyParallel: false, // shared live mainnet position + warm cache → run serially
  workers: 1,
  reporter: [["list"]],
  use: {
    baseURL: process.env.BASE ?? "http://localhost:3000",
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
  webServer: {
    command: "npm run dev",
    url: process.env.BASE ?? "http://localhost:3000",
    reuseExistingServer: true,
    timeout: 120_000,
  },
});
