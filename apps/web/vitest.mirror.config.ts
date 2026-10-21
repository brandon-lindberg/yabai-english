import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

/** Mirror regressions mock persistence; never load credentials or seed a database. */
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    globalSetup: [],
    setupFiles: [],
    include: [
      "src/lib/__tests__/learning-language*.test.ts",
      "tests/mirror/*.test.ts",
      "src/__tests__/auth.learning-language.test.ts",
      "src/__tests__/learning-language-pages.test.ts",
      "src/lib/__tests__/marketplace-teacher-filter.test.ts",
      "src/lib/__tests__/teacher-marketplace-booking-access.test.ts",
      "src/lib/__tests__/lesson-products.test.ts",
      "src/lib/__tests__/teacher-lesson-offering-input.test.ts",
      "src/app/api/bookings/__tests__/*.test.ts",
      "src/app/api/lesson-products/__tests__/*.test.ts",
      "src/app/api/teacher/lesson-offerings/__tests__/*.test.ts",
      "src/app/api/admin/teacher-offerings/__tests__/*.test.ts",
      "src/app/api/student/learning-language/__tests__/*.test.ts",
    ],
  },
});
