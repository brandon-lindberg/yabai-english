import { describe, expect, test } from "vitest";
import { canSendChatMessage } from "@/lib/chat-permissions";

describe("canSendChatMessage", () => {
  test("student cannot send when two-way is disabled", () => {
    expect(
      canSendChatMessage({
        role: "STUDENT",
        threadTwoWayEnabled: false,
        hasScheduledLessonWithTeacher: true,
      }),
    ).toBe(false);
  });

  test("student can send when two-way is enabled and lesson exists", () => {
    expect(
      canSendChatMessage({
        role: "STUDENT",
        threadTwoWayEnabled: true,
        hasScheduledLessonWithTeacher: true,
      }),
    ).toBe(true);
  });

  test("teacher/admin can send without two-way enablement", () => {
    expect(
      canSendChatMessage({
        role: "TEACHER",
        threadTwoWayEnabled: false,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(true);
    expect(
      canSendChatMessage({
        role: "ADMIN",
        threadTwoWayEnabled: false,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(true);
  });
});
