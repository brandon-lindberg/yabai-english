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
        role: "SUPER_ADMIN",
        threadTwoWayEnabled: false,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(true);
  });

  test("teacher replies to admin only while the admin leaves two-way on", () => {
    // Admin\u2194teacher threads open two-way by default, but the admin can close
    // it to send an announcement the recipient cannot reply to.
    expect(
      canSendChatMessage({
        role: "TEACHER",
        counterpartRole: "SUPER_ADMIN",
        threadTwoWayEnabled: false,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(false);
    expect(
      canSendChatMessage({
        role: "TEACHER",
        counterpartRole: "SUPER_ADMIN",
        threadTwoWayEnabled: true,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(true);
  });

  test("student still cannot reply to admin unless admin enables two-way", () => {
    expect(
      canSendChatMessage({
        role: "STUDENT",
        counterpartRole: "SUPER_ADMIN",
        threadTwoWayEnabled: false,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(false);
    expect(
      canSendChatMessage({
        role: "STUDENT",
        counterpartRole: "SUPER_ADMIN",
        threadTwoWayEnabled: true,
        hasScheduledLessonWithTeacher: false,
      }),
    ).toBe(true);
  });
});
