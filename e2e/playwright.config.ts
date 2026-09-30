import { defineConfig, devices } from "@playwright/test";
import { defineBddConfig } from "playwright-bdd";

// bddgen compiles the .feature files into Playwright specs under .features-gen/.
const testDir = defineBddConfig({
  features: "features/*.feature",
  steps: "steps/*.ts",
});

export default defineConfig({
  testDir,
  // Inside compose the dev server is reachable as http://web:5173.
  use: {
    baseURL: process.env.E2E_BASE_URL ?? "http://web:5173",
    trace: "retain-on-failure",
  },
  reporter: [["list"], ["html", { open: "never" }]],
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"] } }],
});
