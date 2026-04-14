import { describe, expect, test } from "vitest";
import {
  isConversationBlocked,
  isViewerBlockedByCounterpart,
} from "@/lib/chat-blocking";

const baseThread = {
  studentId: "student-1",
  teacherId: "teacher-1",
  studentBlockedAt: null,
  teacherBlockedAt: null,
};

describe("chat blocking helpers", () => {
  test("student is blocked when teacher blocks", () => {
    expect(
      isViewerBlockedByCounterpart(
        { ...baseThread, teacherBlockedAt: new Date().toISOString() },
        "student-1",
      ),
    ).toBe(true);
  });

  test("teacher is blocked when student blocks", () => {
    expect(
      isViewerBlockedByCounterpart(
        { ...baseThread, studentBlockedAt: new Date().toISOString() },
        "teacher-1",
      ),
    ).toBe(true);
  });

  test("conversation blocked when either side blocks", () => {
    expect(
      isConversationBlocked({
        ...baseThread,
        studentBlockedAt: new Date().toISOString(),
      }),
    ).toBe(true);
  });
});
