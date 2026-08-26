import { Role } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

type ThreadParticipants = {
  studentId: string;
  teacherId: string;
};

export async function ensureStudentTeacherThread(studentId: string, teacherUserId: string) {
  return prisma.chatThread.upsert({
    where: {
      studentId_teacherId: {
        studentId,
        teacherId: teacherUserId,
      },
    },
    create: {
      studentId,
      teacherId: teacherUserId,
    },
    update: {},
  });
}

/**
 * A ChatThread has exactly two slots. Admins are not students or teachers, so
 * an admin conversation borrows the slot the counterpart does not occupy. This
 * keeps every admin conversation a real two-party thread of its own instead of
 * an admin writing into somebody else's student/teacher conversation.
 */
export function adminThreadSlots(
  adminUserId: string,
  target: { id: string; role: Role },
): ThreadParticipants {
  return target.role === Role.TEACHER
    ? { studentId: adminUserId, teacherId: target.id }
    : { studentId: target.id, teacherId: adminUserId };
}

/**
 * Admin <-> teacher threads are two-way by design so teachers can reply to
 * admin messages. Admin <-> student threads stay read-only until the admin
 * explicitly opens two-way on that thread.
 */
function adminThreadTwoWay(targetRole: Role) {
  const twoWayEnabled = targetRole === Role.TEACHER;
  return {
    twoWayEnabled,
    twoWayEnabledByRole: twoWayEnabled ? Role.SUPER_ADMIN : null,
  };
}

export async function ensureAdminUserThread(
  adminUserId: string,
  target: { id: string; role: Role },
) {
  const slots = adminThreadSlots(adminUserId, target);
  const twoWay = adminThreadTwoWay(target.role);
  return prisma.chatThread.upsert({
    where: { studentId_teacherId: slots },
    update: twoWay,
    create: { ...slots, ...twoWay },
  });
}

/**
 * Scope a thread query by participation rather than by role: a user can sit in
 * either slot (an admin thread puts a teacher in the teacher slot and the admin
 * in the student slot), and a thread the viewer cannot see is a thread whose
 * unread messages never reach their badge.
 */
export function chatThreadParticipantWhere(userId: string) {
  return { OR: [{ studentId: userId }, { teacherId: userId }] };
}

/** The other party in `thread`, or null when `senderId` is not a participant. */
export function resolveChatRecipientId(
  thread: ThreadParticipants,
  senderId: string,
): string | null {
  if (senderId === thread.studentId) return thread.teacherId;
  if (senderId === thread.teacherId) return thread.studentId;
  return null;
}

/**
 * Creating a ChatMessage does not touch its thread row, so `updatedAt` would
 * otherwise reflect the last moderation action rather than the last message and
 * conversations with new messages would not sort to the top.
 */
export async function touchChatThread(threadId: string) {
  await prisma.chatThread.update({
    where: { id: threadId },
    data: { updatedAt: new Date() },
  });
}
