import { describe, expect, test } from "vitest";
import { canShowManualOverrideToggle } from "@/lib/manual-override";

describe("canShowManualOverrideToggle", () => {
  test("shows toggle for teacher/admin", () => {
    expect(canShowManualOverrideToggle("TEACHER")).toBe(true);
    expect(canShowManualOverrideToggle("ADMIN")).toBe(true);
  });

  test("hides toggle for student", () => {
    expect(canShowManualOverrideToggle("STUDENT")).toBe(false);
  });
});
