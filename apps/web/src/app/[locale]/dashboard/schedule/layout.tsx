import type { ReactNode } from "react";
import { getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { DashboardScheduleSubNav } from "@/components/dashboard/dashboard-schedule-sub-nav";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { shouldLoadTeacherBookingsOnSchedule } from "@/lib/dashboard/schedule-view-role";
import { buttonClasses } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";

export default async function DashboardScheduleLayout({ children }: { children: ReactNode }) {
  const t = await getTranslations("dashboard.schedulePage");
  const tCommon = await getTranslations("common");
  const tTeacher = await getTranslations("dashboard.teacherHome");
  const session = await auth();
  const hasTeacherProfile =
    session?.user?.id != null
      ? Boolean(
          await prisma.teacherProfile.findUnique({
            where: { userId: session.user.id },
            select: { id: true },
          }),
        )
      : false;
  const isTeacher =
    Boolean(session?.user?.role && shouldLoadTeacherBookingsOnSchedule(session.user.role)) &&
    hasTeacherProfile;

  return (
    <div className="space-y-8">
      <PageHeader
        title={t("title")}
        actions={
          isTeacher ? (
            <Link
              href="/dashboard/profile"
              className={buttonClasses({ variant: "secondary" })}
            >
              {tTeacher("editProfile")}
            </Link>
          ) : (
            <Link href="/book" className={buttonClasses()}>
              {tCommon("bookLesson")}
            </Link>
          )
        }
      />

      <DashboardScheduleSubNav isTeacher={isTeacher} />

      {children}
    </div>
  );
}
