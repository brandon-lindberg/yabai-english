import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DashboardScheduleSubNav } from "@/components/dashboard/dashboard-schedule-sub-nav";
import { hasRefundedLessons } from "@/lib/dashboard/has-refunded-lessons";
import { TeacherProfileForm } from "@/components/dashboard/teacher-profile-form";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { shouldLoadTeacherBookingsOnSchedule } from "@/lib/dashboard/schedule-view-role";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default async function DashboardScheduleLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("dashboard.schedulePage");
  const tCommon = await getTranslations("common");
  const session = await auth();
  /*
    The header's "Edit profile" opens the editor in place rather than sending
    the teacher to another page, so this needs the profile itself and not just
    whether one exists.
  */
  const teacherProfile =
    session?.user?.id != null
      ? await prisma.teacherProfile.findUnique({
          where: { userId: session.user.id },
          select: {
            id: true,
            displayName: true,
            bio: true,
            countryOfOrigin: true,
            credentials: true,
            instructionLanguages: true,
            specialties: true,
            marketplaceHidden: true,
            user: { select: { image: true } },
          },
        })
      : null;
  const hasTeacherProfile = Boolean(teacherProfile);
  // The Refunded tab only exists for someone who has one.
  const hasRefunds = await hasRefundedLessons(prisma, {
    studentUserId: teacherProfile ? null : session?.user?.id,
    teacherProfileId: teacherProfile?.id ?? null,
  });
  const isTeacher =
    Boolean(session?.user?.role && shouldLoadTeacherBookingsOnSchedule(session.user.role)) &&
    hasTeacherProfile;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        actions={
          isTeacher ? (
            <TeacherProfileForm
              presentation="trigger"
              showGooglePrefillHint={false}
              avatarUrl={teacherProfile?.user.image ?? null}
              initialTeacherProfileId={teacherProfile?.id ?? null}
              initialDisplayName={teacherProfile?.displayName ?? null}
              initialBio={teacherProfile?.bio ?? null}
              initialCountryOfOrigin={teacherProfile?.countryOfOrigin ?? null}
              initialCredentials={teacherProfile?.credentials ?? null}
              initialInstructionLanguages={teacherProfile?.instructionLanguages ?? ["EN"]}
              initialSpecialties={teacherProfile?.specialties ?? []}
              initialMarketplaceHidden={teacherProfile?.marketplaceHidden ?? false}
            />
          ) : (
            <Link href="/book" className={buttonClasses()}>
              {tCommon("bookLesson")}
            </Link>
          )
        }
      />

      <DashboardScheduleSubNav isTeacher={isTeacher} hasRefunds={hasRefunds} />

      {children}
    </div>
  );
}
