import { defineConfig } from "@playwright/test";
import base from "./playwright.config";

/** Uses a task-owned local server started explicitly; never reuses the user's port 3000. */
export default defineConfig({
  ...base, webServer: undefined, fullyParallel: false, workers: 1, retries: 0,
  timeout: 60_000, testMatch: "mirror-journeys.e2e.spec.ts",
  use: { ...base.use, baseURL: "http://localhost:3100", trace: "off" },
});
