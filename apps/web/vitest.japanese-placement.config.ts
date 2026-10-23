import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

/** The independent assessment core runs without credentials or database setup. */
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    globalSetup: [],
    setupFiles: ["@testing-library/jest-dom/vitest"],
    include: [
      "src/lib/japanese-placement/__tests__/**/*.test.ts",
      "tests/japanese-placement/*.test.ts",
      "src/components/japanese-placement/__tests__/*.test.tsx",
    ],
  },
});
