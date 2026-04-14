import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { DashboardScheduleCalendar } from "@/components/dashboard-schedule-calendar";
import { DashboardUpcomingLessons } from "@/components/dashboard/dashboard-upcoming-lessons";
import { TeacherAvailabilityCalendar } from "@/components/dashboard/teacher-availability-calendar";
import { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import { TeacherUpcomingLessons } from "@/components/dashboard/teacher-upcoming-lessons";

export default async function DashboardSchedulePage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard.schedulePage");
  const td = await getTranslations("dashboard");

  if (session.user.role === "TEACHER") {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      include: {
        availabilitySlots: {
          where: { active: true },
          orderBy: [{ dayOfWeek: "asc" }, { startMin: "asc" }],
        },
      },
    });

    const teacherBookings = profile
      ? await getTeacherBookingsForDashboard(prisma, profile.id)
      : { bookings: [], upcoming: [], completed: [], scheduleItems: [] };

    return (
      <div className="space-y-8">
        <p className="text-muted">Set your availability and manage upcoming sessions.</p>

        <TeacherAvailabilityCalendar
          initialSlots={(profile?.availabilitySlots ?? []).map((slot) => ({
            id: slot.id,
            dayOfWeek: slot.dayOfWeek,
            startMin: slot.startMin,
            endMin: slot.endMin,
            timezone: slot.timezone,
          }))}
          defaultTimezone={profile?.availabilitySlots?.[0]?.timezone ?? "Asia/Tokyo"}
        />

        <section>
          <h2 className="mb-3 text-lg font-semibold text-foreground">{td("upcoming")}</h2>
          {teacherBookings.scheduleItems.length > 0 ? (
            <DashboardScheduleCalendar items={teacherBookings.scheduleItems} />
          ) : null}
          <ul className="mt-4 space-y-4">
            <TeacherUpcomingLessons upcoming={teacherBookings.upcoming} />
          </ul>
        </section>
      </div>
    );
  }

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
