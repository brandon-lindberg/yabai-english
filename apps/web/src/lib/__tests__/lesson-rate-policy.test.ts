import { describe, expect, test } from "vitest";
import {
  MIN_PUBLIC_LESSON_RATE_YEN,
  validatePublicLessonRateYen,
} from "@/lib/lesson-rate-policy";

describe("lesson rate policy", () => {
  test("uses a ¥3000 public minimum", () => {
    expect(MIN_PUBLIC_LESSON_RATE_YEN).toBe(3000);
  });

  test("rejects public rates below the minimum", () => {
    expect(validatePublicLessonRateYen(2500)).toEqual({
      ok: false,
      error: "Public lesson rates must be at least ¥3,000.",
    });
  });

  test("allows public rates at or above the minimum", () => {
    expect(validatePublicLessonRateYen(3000)).toEqual({ ok: true });
    expect(validatePublicLessonRateYen(5000)).toEqual({ ok: true });
  });
});
