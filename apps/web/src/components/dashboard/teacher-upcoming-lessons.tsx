import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import type { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import { BookingCancelButton } from "@/components/dashboard/booking-cancel-button";
import { LocalBookingDateTimeRange } from "@/components/dashboard/local-booking-datetime-range";

type Upcoming = Awaited<ReturnType<typeof getTeacherBookingsForDashboard>>["upcoming"];

export async function TeacherUpcomingLessons({ upcoming }: { upcoming: Upcoming }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const to = await getTranslations("onboarding");

  const goalLabelById: Record<string, string> = {
    conversation: to("goalConversation"),
    business: to("goalBusiness"),
    exam: to("goalExam"),
    travel: to("goalTravel"),
  };

  if (upcoming.length === 0) {
    return <li className="rounded-2xl border border-dashed border-border bg-surface p-6 text-muted">{t("noBookings")}</li>;
  }

  return (
    <>
      {upcoming.map((b) => (
        <li
          key={b.id}
          id={`booking-${b.id}`}
          className="scroll-mt-24 rounded-2xl border-2 border-transparent bg-surface p-4 shadow-sm ring-1 ring-border transition-colors duration-300 target:border-primary target:ring-primary/30"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <Link
              href={`/dashboard/schedule/lessons/${b.id}`}
              className="min-w-0 flex-1 hover:opacity-80"
            >
              <p className="font-medium text-foreground">
                {b.lessonProduct.nameJa} / {b.lessonProduct.nameEn}
              </p>
              <p className="text-sm text-muted">
                <LocalBookingDateTimeRange
                  locale={locale}
                  startsAtIso={b.startsAt.toISOString()}
                  endsAtIso={b.endsAt.toISOString()}
                  separator=" - "
                />
              </p>
              <p className="text-sm text-muted">
                Student: {b.student.name ?? b.student.email}
              </p>
              {b.student.studentProfile?.learningGoals?.length ? (
                <p className="text-xs text-muted">
                  Goals:{" "}
                  {b.student.studentProfile.learningGoals
                    .map((goal) => goalLabelById[goal] ?? goal)
                    .join(", ")}
                </p>
              ) : null}
            </Link>
            <div className="mt-2 flex flex-col items-start gap-2 sm:mt-0 sm:items-end">
              {b.meetUrl ? (
                <a
                  href={b.meetUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex text-sm font-semibold text-link hover:opacity-90"
                >
                  {t("meetLink")}
                </a>
              ) : null}
              <Link
                href={`/dashboard/schedule/lessons/${b.id}`}
                className="inline-flex text-sm font-semibold text-link hover:opacity-90"
              >
                {t("viewDetails")}
              </Link>
              {(b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT") && (
                <BookingCancelButton bookingId={b.id} />
              )}
            </div>
          </div>
        </li>
      ))}
    </>
  );
}
