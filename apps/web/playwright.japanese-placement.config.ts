import { defineConfig } from "@playwright/test";
import base from "./playwright.mirror.config";
export default defineConfig({ ...base, testMatch: "japanese-placement.e2e.spec.ts", timeout: 120_000 });
