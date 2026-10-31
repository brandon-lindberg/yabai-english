import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

/** English route/UI regressions mock persistence; no credentials or database seeding. */
export default defineConfig({
  ...baseConfig,
  esbuild: { jsx: "automatic" },
  test: {
    ...baseConfig.test,
    globalSetup: [],
    setupFiles: ["@testing-library/jest-dom/vitest"],
    include: [
      "src/app/api/placement/__tests__/*.test.ts",
      "src/components/__tests__/placement-quiz*.test.tsx",
      "src/lib/__tests__/placement-cooldown.test.ts",
      "src/lib/__tests__/placement-evidence.test.ts",
      "src/lib/__tests__/placement-staircase.test.ts",
      "src/lib/__tests__/adaptive-staircase.test.ts",
      "tests/english-placement/*.test.ts",
    ],
  },
});
