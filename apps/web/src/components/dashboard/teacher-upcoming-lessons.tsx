import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import { BookingCancelButton } from "@/components/dashboard/booking-cancel-button";
import { BookingCalendarRecoveryActions } from "@/components/dashboard/booking-calendar-recovery-actions";
import { LessonListEmpty, LessonRow } from "@/components/dashboard/lesson-row";
import { buttonClasses } from "@/components/ui/button";

type Upcoming = Awaited<ReturnType<typeof getTeacherBookingsForDashboard>>["upcoming"];

export async function TeacherUpcomingLessons({ upcoming }: { upcoming: Upcoming }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const to = await getTranslations("onboarding");
  const ts = await getTranslations("dashboard.schedulePage");

  const goalLabelById: Record<string, string> = {
    conversation: to("goalConversation"),
    business: to("goalBusiness"),
    exam: to("goalExam"),
    travel: to("goalTravel"),
  };

  if (upcoming.length === 0) {
    return <LessonListEmpty>{t("noBookings")}</LessonListEmpty>;
  }

  return (
    <>
      {upcoming.map((b) => {
        const goals = b.student.studentProfile?.learningGoals ?? [];
        return (
          <LessonRow
            key={b.id}
            bookingId={b.id}
            locale={locale}
            lessonNameJa={b.lessonProduct.nameJa}
            lessonNameEn={b.lessonProduct.nameEn}
            startsAtIso={b.startsAt.toISOString()}
            endsAtIso={b.endsAt.toISOString()}
            separator=" - "
            counterpartLabel={ts("studentLabel")}
            counterpartName={b.student.name ?? b.student.email ?? "—"}
            meta={
              goals.length > 0
                ? `${to("goalsLabel")}: ${goals.map((g) => goalLabelById[g] ?? g).join(", ")}`
                : null
            }
            actions={
              <>
                {b.meetUrl ? (
                  <a
                    href={b.meetUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={buttonClasses({ size: "sm" })}
                  >
                    {t("meetLink")}
                  </a>
                ) : null}
                <Link
                  href={`/dashboard/schedule/lessons/${b.id}`}
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
                >
                  {t("viewDetails")}
                </Link>
                {b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT" ? (
                  <BookingCancelButton bookingId={b.id} />
                ) : null}
              </>
            }
          >
            {b.status === "CONFIRMED" && !b.googleEventId ? (
              <BookingCalendarRecoveryActions
                bookingId={b.id}
                googleCalendarHref={buildGoogleCalendarUrl({
                  uid: `booking-${b.id}@english-studio.local`,
                  title: `${b.lessonProduct.nameEn} (${b.lessonProduct.nameJa})`,
                  description: `${ts("studentLabel")}: ${b.student.name ?? b.student.email}`,
                  location: b.meetUrl ?? "English Studio lesson",
                  startsAt: b.startsAt,
                  endsAt: b.endsAt,
                })}
                connectHref={`/api/integrations/google/connect?returnTo=${encodeURIComponent(
                  `/dashboard/schedule/lessons/${b.id}`,
                )}`}
                canRetryInvite
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
          </LessonRow>
        );
      })}
    </>
  );
}
