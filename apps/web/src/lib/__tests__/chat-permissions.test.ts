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

  test("teacher can send in normal student-teacher thread without two-way enablement", () => {
    expect(
      canSendChatMessage({
        role: "TEACHER",
        threadTwoWayEnabled: false,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(true);
  });

  test("admin can always send", () => {
    expect(
      canSendChatMessage({
        role: "ADMIN",
        threadTwoWayEnabled: false,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(true);
  });

  test("teacher can always reply to admin because admin\u2194teacher is two-way by design", () => {
    expect(
      canSendChatMessage({
        role: "TEACHER",
        counterpartRole: "ADMIN",
        threadTwoWayEnabled: false,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(true);
    expect(
      canSendChatMessage({
        role: "TEACHER",
        counterpartRole: "ADMIN",
        threadTwoWayEnabled: true,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(true);
  });

  test("student still cannot reply to admin unless admin enables two-way", () => {
    expect(
      canSendChatMessage({
        role: "STUDENT",
        counterpartRole: "ADMIN",
        threadTwoWayEnabled: false,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(false);
    expect(
      canSendChatMessage({
        role: "STUDENT",
        counterpartRole: "ADMIN",
        threadTwoWayEnabled: true,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(true);
  });
});
