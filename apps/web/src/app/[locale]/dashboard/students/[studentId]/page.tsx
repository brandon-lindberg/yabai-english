import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link, redirect } from "@/i18n/navigation";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { BookingStatus } from "@/generated/prisma/client";
import { PageHeader } from "@/components/ui/page-header";
import { StudentProfilePanel } from "@/components/dashboard/student-profile-panel";

type Props = {
  params: Promise<{ studentId: string }>;
};

export default async function TeacherViewStudentProfilePage({ params }: Props) {
  const session = await auth();
  const locale = await getLocale();
  const viewerUserId = session?.user?.id;
  if (!viewerUserId || !session?.user || !isTeacherCabinetRole(session.user.role)) {
    redirect({ href: "/dashboard", locale });
  }

  const { studentId } = await params;

  const teacherProfile = await prisma.teacherProfile.findUnique({
    where: { userId: viewerUserId },
    select: { id: true },
  });
  const teacherProfileId = teacherProfile?.id;
  if (!teacherProfileId) {
    redirect({ href: "/dashboard", locale });
  }

  const [roster, booking] = await Promise.all([
    prisma.teacherRosterEntry.findFirst({
      where: { teacherId: teacherProfileId, studentId },
      select: { id: true },
    }),
    prisma.booking.findFirst({
      where: {
        teacherId: teacherProfileId,
        studentId,
        status: {
          in: [
            BookingStatus.CONFIRMED,
            BookingStatus.PENDING_PAYMENT,
            BookingStatus.COMPLETED,
          ],
        },
      },
      select: { id: true },
    }),
  ]);

  if (!roster && !booking) {
    notFound();
  }

  const student = await prisma.user.findUnique({
    where: { id: studentId },
    include: {
      studentProfile: {
        select: {
          placedLevel: true,
          placedSubLevel: true,
          learningGoals: true,
          learningGoalsNote: true,
          shortBio: true,
          timezone: true,
        },
      },
    },
  });

  if (!student || student.role !== "STUDENT") {
    notFound();
  }

  const t = await getTranslations("dashboard.studentProfilePage");

  const profile = student.studentProfile;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/students"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        &larr; {t("backToList")}
      </Link>

      <PageHeader title={t("title")} description={t("intro")} />

      <StudentProfilePanel student={student} profile={profile} />
    </div>
  );
}
