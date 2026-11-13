import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

/** No credentials, seeds or application database in the default study suite. */
export default defineConfig({
  ...baseConfig,
  esbuild: { jsx: "automatic" },
  test: {
    ...baseConfig.test,
    globalSetup: [],
    setupFiles: ["@testing-library/jest-dom/vitest"],
    include: ["src/lib/__tests__/study-*.test.ts", "src/lib/__tests__/quick-review-*.test.ts", "src/components/dashboard/__tests__/dashboard-quick-review.test.tsx", "tests/study/*.test.ts", "tests/study/*.test.tsx"],
  },
});
