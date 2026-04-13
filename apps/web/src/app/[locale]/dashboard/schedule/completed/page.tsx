import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { DashboardCompletedLessons } from "@/components/dashboard/dashboard-completed-lessons";

export default async function DashboardScheduleCompletedPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard.schedulePage");

  const { completed } = await getStudentBookingsForDashboard(prisma, session.user.id);

  return (
    <div className="space-y-8">
      <p className="text-muted">{t("completedIntro")}</p>

      <section>
        <h2 className="mb-3 text-lg font-semibold text-foreground">{t("completedSectionTitle")}</h2>
        <ul className="space-y-4">
          <DashboardCompletedLessons completed={completed} />
        </ul>
      </section>
    </div>
  );
}
