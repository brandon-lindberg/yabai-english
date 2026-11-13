import "server-only";
import { Prisma, type LearningLanguage } from "@/generated/prisma/client";
import { lockActiveAccounts } from "@/lib/active-account-lock";
import { teacherCanTeach } from "@/lib/learning-language";
import { teacherMarketplaceRosterOnly, type TeacherMarketplaceVisibility } from "@/lib/teacher-marketplace-booking-access";

/** Recheck and hold the current permission and privacy until the booking commits. */
export async function lockTeacherBookingAccess(tx: Prisma.TransactionClient, {
  studentId, teacherUserId, teacherId, learningLanguage,
}: { studentId: string; teacherUserId: string; teacherId: string; learningLanguage: LearningLanguage }) {
  if (!await lockActiveAccounts(tx, studentId, teacherUserId)) return false;
  const [teacher] = await tx.$queryRaw<Array<TeacherMarketplaceVisibility & { teachingLanguages: LearningLanguage[] }>>(
    Prisma.sql`SELECT "teachingLanguages", "marketplaceHidden", "japaneseMarketplaceHidden"
      FROM "TeacherProfile" WHERE id = ${teacherId} FOR SHARE`,
  );
  if (!teacher || !teacherCanTeach(teacher, learningLanguage)) return false;
  if (!teacherMarketplaceRosterOnly(teacher, learningLanguage)) return true;
  const roster = await tx.$queryRaw<Array<{ id: string }>>(
    Prisma.sql`SELECT id FROM "TeacherRosterEntry"
      WHERE "teacherId" = ${teacherId} AND "studentId" = ${studentId} FOR UPDATE`,
  );
  return roster.length > 0;
}
