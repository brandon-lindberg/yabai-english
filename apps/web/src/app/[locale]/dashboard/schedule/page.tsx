import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { DashboardScheduleCalendar } from "@/components/dashboard-schedule-calendar";
import { DashboardUpcomingLessons } from "@/components/dashboard/dashboard-upcoming-lessons";

export default async function DashboardSchedulePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard.schedulePage");
  const td = await getTranslations("dashboard");

  const { upcoming, scheduleItems } = await getStudentBookingsForDashboard(prisma, session.user.id);

  return (
    <div className="space-y-8">
      <p className="text-muted">{t("intro")}</p>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">{td("upcoming")}</h2>
        <DashboardScheduleCalendar items={scheduleItems} />
        <ul className="mt-4 space-y-4">
          <DashboardUpcomingLessons upcoming={upcoming} />
        </ul>
      </section>
    </div>
  );
}
