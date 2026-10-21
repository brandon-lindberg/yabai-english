import type { PrismaClient } from "@/generated/prisma/client";
import type { LearningLanguage } from "@/generated/prisma/enums";
import { learningLanguageTeacherWhere } from "@/lib/learning-language";

export type StudentRosterTeacherRow = {
  rosterEntryId: string;
  teacherProfileId: string;
  displayName: string;
};

export async function getStudentRosterTeachers(
  prisma: Pick<PrismaClient, "teacherRosterEntry">,
  studentId: string,
  learningLanguage?: LearningLanguage,
): Promise<StudentRosterTeacherRow[]> {
  const entries = await prisma.teacherRosterEntry.findMany({
    where: { studentId, ...(learningLanguage ? { teacher: learningLanguageTeacherWhere(learningLanguage) } : {}) },
    include: {
      teacher: {
        select: {
          id: true,
          displayName: true,
          user: { select: { name: true } },
        },
      },
    },
    orderBy: { createdAt: "asc" },
  });

  return entries.map((e) => ({
    rosterEntryId: e.id,
    teacherProfileId: e.teacher.id,
    displayName: e.teacher.displayName ?? e.teacher.user.name ?? "Teacher",
  }));
}
