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
  if (role === "ADMIN") return true;

  // Admin <-> teacher threads are two-way by design: teachers are staff and
  // must be able to respond to admin messages without admin having to flip a
  // per-thread toggle.
  if (role === "TEACHER" && counterpartRole === "ADMIN") {
    return true;
  }

  // Admin <-> student threads stay read-only for students unless the admin
  // explicitly enables two-way on the thread.
  if (counterpartRole === "ADMIN") {
    return threadTwoWayEnabled;
  }

  if (role === "STUDENT") {
    return threadTwoWayEnabled && hasScheduledLessonWithTeacher;
  }
  return role === "TEACHER";
}
