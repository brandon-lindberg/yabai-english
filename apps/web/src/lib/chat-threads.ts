import { prisma } from "@/lib/prisma";

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
