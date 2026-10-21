import { defineConfig } from "@playwright/test";
import base from "./playwright.mirror.config";

/** Guest-only checks: no fixtures, authentication or database mutations. */
export default defineConfig({ ...base, testMatch: "header-preferences.e2e.spec.ts" });
