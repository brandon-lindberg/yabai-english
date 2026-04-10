import { describe, expect, test } from "vitest";
import { validateManualOverrideReason } from "@/lib/manual-override";

describe("validateManualOverrideReason", () => {
  test("does not require reason when override is off", () => {
    expect(validateManualOverrideReason(false, "")).toEqual({
      ok: true,
      normalizedReason: null,
    });
  });

  test("requires reason when override is on", () => {
    expect(validateManualOverrideReason(true, "  ")).toEqual({
      ok: false,
      normalizedReason: null,
    });
  });

  test("normalizes reason when provided", () => {
    expect(validateManualOverrideReason(true, " urgent student request ")).toEqual({
      ok: true,
      normalizedReason: "urgent student request",
    });
  });
});
