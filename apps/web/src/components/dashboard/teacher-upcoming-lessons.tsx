import { getLocale, getTranslations } from "next-intl/server";
import type { getTeacherBookingsForDashboard } from "@/lib/dashboard/teacher-bookings";
import { BookingCancelButton } from "@/components/dashboard/booking-cancel-button";

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
        <li key={b.id} className="rounded-2xl border border-border bg-surface p-4 shadow-sm">
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                {b.lessonProduct.nameJa} / {b.lessonProduct.nameEn}
              </p>
              <p className="text-sm text-muted">
                {b.startsAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })} -{" "}
                {b.endsAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
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
            </div>
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
