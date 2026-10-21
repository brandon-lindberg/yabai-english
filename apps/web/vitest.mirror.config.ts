import { defineConfig } from "vitest/config";
import baseConfig from "./vitest.config";

/** Mirror regressions mock persistence; never load credentials or seed a database. */
export default defineConfig({
  ...baseConfig,
  test: {
    ...baseConfig.test,
    globalSetup: [],
    setupFiles: ["@testing-library/jest-dom/vitest"],
    include: [
      "src/lib/__tests__/learning-language*.test.ts",
      "src/lib/__tests__/learning-journey*.test.ts",
      "src/lib/__tests__/student-onboarding-next-links.test.ts",
      "src/lib/__tests__/onboarding-routing.test.ts",
      "src/lib/shell/__tests__/header-nav-links.test.ts",
      "src/app/api/auth/learning-journey/__tests__/*.test.ts",
      "src/components/auth/__tests__/sign-in-retry.test.tsx",
      "src/components/marketing/__tests__/learning-landing.test.tsx",
      "src/components/dashboard/__tests__/student-dashboard-language.test.ts",
      "src/components/dashboard/__tests__/teacher-lesson-add-modal.test.tsx",
      "src/components/__tests__/onboarding-form.test.tsx",
      "src/components/__tests__/locale-switcher.test.tsx",
      "src/components/__tests__/theme-toggle.test.tsx",
      "src/components/shell/__tests__/site-header*.test.tsx",
      "src/components/__tests__/providers.test.tsx",
      "src/lib/__tests__/free-trial-offering*.test.ts",
      "src/lib/__tests__/schedule-offering-sync.test.ts",
      "src/app/api/teacher/availability/__tests__/*.test.ts",
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
