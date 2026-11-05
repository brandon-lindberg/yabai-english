import { defineConfig } from "@playwright/test";
import base from "./playwright.mirror.config";
import { MIRROR_RELEASE_AUTH_ENV } from "./test/mirror-release-environment";

if (!process.env.MIRROR_QA_DATABASE_URL) throw new Error("Run the isolated test:mirror:e2e command");
const server = base.webServer;
if (!server || Array.isArray(server)) throw new Error("One owned QA server is required");
export default defineConfig({
  ...base, testMatch: ["booking-lifecycle.e2e.spec.ts", "payment-recovery.e2e.spec.ts", "student-onboarding-to-booking.e2e.spec.ts", "teacher-onboarding.e2e.spec.ts", "teacher-lesson-completion.e2e.spec.ts", "placement-study.release.e2e.spec.ts"], timeout: 120_000,
  use: { ...base.use, actionTimeout: 20_000 },
  webServer: { ...server, env: {
    MIRROR_QA_DIST_DIR: ".next/mirror-qa",
    DATABASE_URL: process.env.MIRROR_QA_DATABASE_URL, DEV_AUTH_BYPASS: "true", AUTH_GOOGLE_ID: "", AUTH_GOOGLE_SECRET: "",
    STRIPE_SECRET_KEY: "", STRIPE_WEBHOOK_SECRET: "", BOOKING_AUTO_CONFIRM: "false",
    ...MIRROR_RELEASE_AUTH_ENV,
    NEXT_PUBLIC_APP_URL: "http://localhost:3100", AUTH_URL: "http://localhost:3100", AUTH_TRUST_HOST: "true",
  } },
});
