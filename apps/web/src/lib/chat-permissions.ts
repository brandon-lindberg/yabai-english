import type { Role } from "@prisma/client";

export function canSendChatMessage({
  role,
  threadTwoWayEnabled,
  hasScheduledLessonWithTeacher,
  counterpartRole,
}: {
  role: Role;
  threadTwoWayEnabled: boolean;
  hasScheduledLessonWithTeacher: boolean;
  counterpartRole?: Role;
}) {
  if (role === "ADMIN") return true;

  // Admin ↔ user threads are read-only for non-admin users unless admin enables two-way.
  if (counterpartRole === "ADMIN") {
    return threadTwoWayEnabled;
  }

  if (role === "STUDENT") {
    return threadTwoWayEnabled && hasScheduledLessonWithTeacher;
  }
  return role === "TEACHER";
}
