import type { Role } from "@prisma/client";

export function canSendChatMessage({
  role,
  threadTwoWayEnabled,
  hasScheduledLessonWithTeacher,
}: {
  role: Role;
  threadTwoWayEnabled: boolean;
  hasScheduledLessonWithTeacher: boolean;
}) {
  if (role === "STUDENT") {
    return threadTwoWayEnabled && hasScheduledLessonWithTeacher;
  }
  return role === "TEACHER" || role === "ADMIN";
}
