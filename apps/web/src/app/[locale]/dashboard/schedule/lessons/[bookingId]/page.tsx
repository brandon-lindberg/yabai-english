import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { prisma } from "@/lib/prisma";
import { Link } from "@/i18n/navigation";
import { redirect } from "@/i18n/navigation";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { LocalBookingDateTimeRange } from "@/components/dashboard/local-booking-datetime-range";
import { BookingCancelButton } from "@/components/dashboard/booking-cancel-button";
import { BookingCalendarRecoveryActions } from "@/components/dashboard/booking-calendar-recovery-actions";
import { TeacherBookingRescheduleForm } from "@/components/dashboard/teacher-booking-reschedule-form";
import { actionLinkClass } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/ui/page-header";
import { StudentProfilePanel } from "@/components/dashboard/student-profile-panel";

export default async function LessonDetailPage({
  params,
}: {
  params: Promise<{ bookingId: string }>;
}) {
  const session = await auth();
  if (!session?.user?.id) return null;

  const locale = await getLocale();
  const { bookingId } = await params;
  const t = await getTranslations("dashboard");
  const tLesson = await getTranslations("dashboard.lessonDetail");

  const booking = await prisma.booking.findUnique({
    where: { id: bookingId },
    include: {
      lessonProduct: true,
      student: {
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
      },
      teacher: {
        include: {
          user: { select: { name: true, email: true } },
          availabilitySlots: {
            where: { active: true },
            take: 1,
            select: { timezone: true },
          },
        },
      },
      invoice: { select: { id: true, paidAt: true } },
    },
  });

  if (!booking) notFound();

  // Only the teacher who owns this booking (or an admin) can view this page.
  const isTeacher = booking.teacher.userId === session.user.id;
  const isAdmin = session.user.role === "SUPER_ADMIN";
  if (!isTeacher && !isAdmin) {
    redirect({ href: "/dashboard/schedule", locale });
  }

  const statusLabels: Record<string, string> = {
    PENDING_PAYMENT: t("statusPendingPayment"),
    CONFIRMED: t("statusConfirmed"),
    COMPLETED: t("statusCompleted"),
    CANCELLED: t("statusCancelled"),
  };

  const student = booking.student;
  const profile = student.studentProfile;
  const teacherTimezone =
    booking.teacher.availabilitySlots[0]?.timezone ?? "Asia/Tokyo";

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <Link
        href="/dashboard/schedule"
        className="inline-flex items-center gap-1 text-sm text-muted hover:text-foreground"
      >
        &larr; {tLesson("backToSchedule")}
      </Link>

      {/* The page's h1 sat inside this section at `text-lg` — smaller than the
          h2 of every other section on the page. The lesson is what the page is
          about, so it titles it. */}
      <PageHeader
        title={`${booking.lessonProduct.nameJa} / ${booking.lessonProduct.nameEn}`}
      />

      <section className="border-t border-border pt-6">
        <div className="space-y-2">
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-muted">{tLesson("dateTime")}:</span>
            <span className="text-foreground">
              <LocalBookingDateTimeRange
                locale={locale}
                startsAtIso={booking.startsAt.toISOString()}
                endsAtIso={booking.endsAt.toISOString()}
                separator=" — "
              />
            </span>
          </div>
          <div className="flex items-center gap-2 text-sm">
            <span className="font-medium text-muted">{tLesson("status")}:</span>
            <span
              className={`rounded-full px-2 py-0.5 text-xs font-semibold ${
                booking.status === "CONFIRMED"
                  ? "bg-[var(--app-hover)] text-foreground"
                  : booking.status === "PENDING_PAYMENT"
                    ? "bg-[var(--app-hover)] text-muted"
                    : booking.status === "CANCELLED"
                      ? "bg-[var(--app-danger)]/10 text-[var(--app-danger)]"
                      : "bg-[var(--app-hover)] text-foreground"
              }`}
            >
              {statusLabels[booking.status] ?? booking.status}
            </span>
          </div>
          {booking.meetUrl && (
            <div className="flex items-center gap-2 text-sm">
              <span className="font-medium text-muted">{tLesson("meetLink")}:</span>
              <a
                href={booking.meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={actionLinkClass}
              >
                {t("meetLink")}
              </a>
            </div>
          )}
          {booking.status === "CONFIRMED" && !booking.googleEventId ? (
            <BookingCalendarRecoveryActions
              bookingId={booking.id}
              googleCalendarHref={buildGoogleCalendarUrl({
                uid: `booking-${booking.id}@english-studio.local`,
                title: `${booking.lessonProduct.nameEn} (${booking.lessonProduct.nameJa})`,
                description: `Student: ${booking.student.name ?? booking.student.email}`,
                location: booking.meetUrl ?? "English Studio lesson",
                startsAt: booking.startsAt,
                endsAt: booking.endsAt,
              })}
              connectHref={`/api/integrations/google/connect?returnTo=${encodeURIComponent(
                `/dashboard/schedule/lessons/${booking.id}`,
              )}`}
              canRetryInvite={isTeacher || isAdmin}
              copy={{
                title: t("calendarInviteMissingTitle"),
                body: t("calendarInviteMissingBody"),
                reconnect: t("reconnectGoogleCalendar"),
                retry: t("createCalendarInvite"),
                retrying: t("creatingCalendarInvite"),
                retrySuccess: t("calendarInviteCreated"),
                retryError: t("calendarInviteRetryError"),
                addToGoogleCalendar: t("addToGoogleCalendar"),
              }}
            />
          ) : null}
        </div>
        {(booking.status === "CONFIRMED" || booking.status === "PENDING_PAYMENT") && (
          <div className="mt-4 space-y-4">
            <TeacherBookingRescheduleForm
              bookingId={booking.id}
              initialStartsAtIso={booking.startsAt.toISOString()}
              teacherTimezone={teacherTimezone}
            />
            <BookingCancelButton bookingId={booking.id} />
          </div>
        )}
      </section>

      <StudentProfilePanel student={student} profile={profile} />
    </div>
  );
}
