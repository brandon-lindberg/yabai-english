import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { DashboardScheduleCalendar } from "@/components/dashboard-schedule-calendar";
import { DashboardUpcomingLessons } from "@/components/dashboard/dashboard-upcoming-lessons";

export default async function DashboardSchedulePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard.schedulePage");
  const td = await getTranslations("dashboard");
  const tCommon = await getTranslations("common");

  const { upcoming, scheduleItems } = await getStudentBookingsForDashboard(prisma, session.user.id);

  return (
    <div className="space-y-8">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0 space-y-2">
          <h1 className="text-2xl font-bold text-foreground">{t("title")}</h1>
          <p className="text-muted">{t("intro")}</p>
        </div>
        <Link
          href="/book"
          className="shrink-0 rounded-full bg-primary px-4 py-2 text-sm font-semibold text-primary-foreground hover:opacity-90"
        >
          {tCommon("bookLesson")}
        </Link>
      </header>

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
