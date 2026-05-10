import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link, redirect } from "@/i18n/navigation";
import { isTeacherCabinetRole } from "@/lib/dashboard/teacher-cabinet-role";
import { BookingStatus } from "@/generated/prisma/client";

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
  const tLesson = await getTranslations("dashboard.lessonDetail");
  const to = await getTranslations("onboarding");

  const goalLabelById: Record<string, string> = {
    conversation: to("goalConversation"),
    business: to("goalBusiness"),
    exam: to("goalExam"),
    travel: to("goalTravel"),
  };

  const levelLabels: Record<string, string> = {
    UNSET: tLesson("levelUnset"),
    BEGINNER: tLesson("levelBeginner"),
    INTERMEDIATE: tLesson("levelIntermediate"),
    ADVANCED: tLesson("levelAdvanced"),
  };

  const profile = student.studentProfile;

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/students"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        &larr; {t("backToList")}
      </Link>

      <header>
        <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
        <p className="mt-2 text-sm text-muted">{t("intro")}</p>
      </header>

      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">{tLesson("studentProfile")}</h2>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            {student.image ? (
              /* eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar */
              <img
                src={student.image}
                alt=""
                className="h-12 w-12 rounded-full border border-border object-cover"
              />
            ) : (
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-border bg-muted/20 text-lg font-semibold text-muted">
                {(student.name ?? student.email ?? "?").charAt(0).toUpperCase()}
              </div>
            )}
            <div>
              <p className="font-medium text-foreground">{student.name ?? tLesson("unnamed")}</p>
              {student.email ? <p className="text-sm text-muted">{student.email}</p> : null}
            </div>
          </div>

          {profile ? (
            <div className="space-y-2 border-t border-border pt-3">
              <div className="grid gap-3 sm:grid-cols-2">
                <div>
                  <p className="text-xs font-medium text-muted">{tLesson("level")}</p>
                  <p className="text-sm text-foreground">
                    {levelLabels[profile.placedLevel] ?? profile.placedLevel}
                    {profile.placedSubLevel ? ` (${profile.placedSubLevel})` : ""}
                  </p>
                </div>
                <div>
                  <p className="text-xs font-medium text-muted">{tLesson("timezone")}</p>
                  <p className="text-sm text-foreground">{profile.timezone}</p>
                </div>
              </div>

              {profile.learningGoals.length > 0 ? (
                <div>
                  <p className="text-xs font-medium text-muted">{tLesson("goals")}</p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    {profile.learningGoals.map((goal) => (
                      <span
                        key={goal}
                        className="rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary"
                      >
                        {goalLabelById[goal] ?? goal}
                      </span>
                    ))}
                  </div>
                </div>
              ) : null}

              {profile.shortBio ? (
                <div>
                  <p className="text-xs font-medium text-muted">{tLesson("bio")}</p>
                  <p className="mt-1 text-sm text-foreground">{profile.shortBio}</p>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </section>
    </div>
  );
}
