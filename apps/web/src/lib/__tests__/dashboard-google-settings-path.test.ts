import { describe, expect, test } from "vitest";
import { DASHBOARD_GOOGLE_SETTINGS_PATH } from "@/lib/dashboard-google-settings-path";

describe("DASHBOARD_GOOGLE_SETTINGS_PATH", () => {
  test("is the dashboard route used for Google OAuth return", () => {
    expect(DASHBOARD_GOOGLE_SETTINGS_PATH).toBe("/dashboard/settings");
  });
});
