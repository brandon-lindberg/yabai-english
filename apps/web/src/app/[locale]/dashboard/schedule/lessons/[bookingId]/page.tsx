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
  const to = await getTranslations("onboarding");

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

      {/* Lesson info */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h1 className="text-lg font-semibold text-foreground">
          {booking.lessonProduct.nameJa} / {booking.lessonProduct.nameEn}
        </h1>
        <div className="mt-3 space-y-2">
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
                  ? "bg-green-100 text-green-800"
                  : booking.status === "PENDING_PAYMENT"
                    ? "bg-amber-100 text-amber-800"
                    : booking.status === "CANCELLED"
                      ? "bg-red-100 text-red-800"
                      : "bg-zinc-100 text-zinc-800"
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
                className="font-semibold text-link hover:opacity-90"
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
              connectHref={`/api/integrations/google/connect?feature=calendar&returnTo=${encodeURIComponent(
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

      {/* Student profile */}
      <section className="rounded-2xl border border-border bg-surface p-5 shadow-sm">
        <h2 className="text-base font-semibold text-foreground">{tLesson("studentProfile")}</h2>
        <div className="mt-3 space-y-3">
          <div className="flex items-center gap-3">
            {student.image ? (
              /* eslint-disable-next-line @next/next/no-img-element -- external OAuth avatar, host not in next.config */
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
              <p className="font-medium text-foreground">
                {student.name ?? tLesson("unnamed")}
              </p>
              {student.email && (
                <p className="text-sm text-muted">{student.email}</p>
              )}
            </div>
          </div>

          {profile && (
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

              {profile.learningGoals.length > 0 && (
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
              )}

              {profile.shortBio && (
                <div>
                  <p className="text-xs font-medium text-muted">{tLesson("bio")}</p>
                  <p className="mt-1 text-sm text-foreground">{profile.shortBio}</p>
                </div>
              )}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
