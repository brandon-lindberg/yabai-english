import { getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import { shouldLoadTeacherBookingsOnSchedule } from "@/lib/dashboard/schedule-view-role";
import { RefundedLessons } from "@/components/dashboard/refunded-lessons";
import { Section } from "@/components/ui/section";

/**
 * Lessons that were cancelled and refunded.
 *
 * They used to hang off the bottom of Upcoming, which is a list of what is
 * still ahead — a refunded lesson is neither upcoming nor completed, and mixing
 * the two made a cancelled lesson read as a commitment.
 *
 * They get an address of their own rather than a section on the completed page
 * because a refund is a different fact from a lesson taught, and because this
 * is the only route either party has to the credit note issued for it.
 */
export default async function DashboardScheduleRefundedPage() {
  const session = await auth();
  if (!session?.user?.id) return null;

  const t = await getTranslations("dashboard.schedulePage");
  const td = await getTranslations("dashboard");

  if (shouldLoadTeacherBookingsOnSchedule(session.user.role)) {
    const profile = await prisma.teacherProfile.findUnique({
      where: { userId: session.user.id },
      select: { id: true },
    });
    const teacherBookings = profile
      ? await getTeacherBookingsForDashboard(prisma, profile.id)
      : { refunded: [] };

    return (
      <div className="space-y-8">
        <p className="max-w-[62ch] text-muted">{t("refundedIntro")}</p>
        <Section title={td("refundedLessons")} ruled>
          <ul className="list-none border-t border-border p-0">
            <RefundedLessons
              refunded={teacherBookings.refunded}
              counterpartLabel={t("studentLabel")}
              counterpartName={(b) => b.student.name ?? b.student.email ?? "—"}
            />
          </ul>
        </Section>
      </div>
    );
  }

  const { refunded } = await getStudentBookingsForDashboard(prisma, session.user.id);

  return (
    <div className="space-y-8">
      <p className="max-w-[62ch] text-muted">{t("refundedIntro")}</p>
      <Section title={td("refundedLessons")} ruled>
        <ul className="list-none border-t border-border p-0">
          <RefundedLessons
            refunded={refunded}
            counterpartLabel={td("teacher")}
            counterpartName={(b) => b.teacher.user.name ?? b.teacher.user.email ?? "—"}
          />
        </ul>
      </Section>
    </div>
  );
}
