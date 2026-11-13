import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

/** Pure content tooling must never load .env or reseed a database. */
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    globalSetup: [],
    setupFiles: [],
    include: ["src/lib/japanese-content/__tests__/**/*.test.ts"],
  },
});
