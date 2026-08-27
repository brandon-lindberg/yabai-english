import type { Role } from "@/generated/prisma/client";

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
  if (role === "SUPER_ADMIN") return true;

  // Whoever the counterpart is, replying to an admin is the admin's call.
  // Admin <-> teacher threads open two-way by default (teachers are staff) and
  // admin <-> student threads start closed, but either can be closed or opened
  // from the thread, which is how an admin sends an announcement nobody can
  // reply to.
  if (counterpartRole === "SUPER_ADMIN") {
    return threadTwoWayEnabled;
  }

  if (role === "STUDENT") {
    return threadTwoWayEnabled && hasScheduledLessonWithTeacher;
  }
  return role === "TEACHER";
}
