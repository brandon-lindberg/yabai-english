import { describe, expect, test } from "vitest";
import { formatAvailabilitySlotMeta } from "@/lib/availability-slot-lesson-meta";

describe("formatAvailabilitySlotMeta", () => {
  test("uses translated preset type and level", () => {
    const s = formatAvailabilitySlotMeta(
      { lessonLevel: "intermediate", lessonType: "grammar", lessonTypeCustom: null },
      (k) => `L:${k}`,
      (k) => `T:${k}`,
    );
    expect(s).toBe("L:intermediate · T:grammar");
  });

  test("uses custom text for custom lesson type", () => {
    const s = formatAvailabilitySlotMeta(
      { lessonLevel: "beginner", lessonType: "custom", lessonTypeCustom: "  Mock trial  " },
      (k) => `L:${k}`,
      () => "unused",
    );
    expect(s).toBe("L:beginner · Mock trial");
  });
});
