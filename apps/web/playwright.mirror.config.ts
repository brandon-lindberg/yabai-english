import { defineConfig } from "@playwright/test";
import base from "./playwright.config";
import { MIRROR_GOOGLE_AUTH_ENV } from "./test/mirror-release-environment";

/** The explicit browser command owns its server and refuses an occupied QA port. */
export default defineConfig({
  ...base, fullyParallel: false, workers: 1, retries: 0,
  webServer: {
    command: "yarn dev --hostname localhost --port 3100", url: "http://localhost:3100", reuseExistingServer: false,
    env: { DEV_AUTH_BYPASS: "true", ...MIRROR_GOOGLE_AUTH_ENV },
    gracefulShutdown: { signal: "SIGTERM", timeout: 5_000 },
  },
  timeout: 60_000, testMatch: "mirror-journeys.e2e.spec.ts",
  use: { ...base.use, baseURL: "http://localhost:3100", trace: "off" },
});
