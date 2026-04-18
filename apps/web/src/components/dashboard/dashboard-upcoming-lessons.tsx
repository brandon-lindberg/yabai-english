import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bookingStatusKey } from "@/lib/booking-status";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import type { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { BookingCancelButton } from "@/components/dashboard/booking-cancel-button";

type Upcoming = Awaited<ReturnType<typeof getStudentBookingsForDashboard>>["upcoming"];

export async function DashboardUpcomingLessons({ upcoming }: { upcoming: Upcoming }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");

  if (upcoming.length === 0) {
    return (
      <li className="rounded-2xl border border-dashed border-border bg-surface p-6 text-muted">
        {t("noBookings")}
      </li>
    );
  }

  return (
    <>
      {upcoming.map((b) => (
        <li
          key={b.id}
          id={`booking-${b.id}`}
          className="rounded-2xl border border-border bg-surface p-4 shadow-sm"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                {b.lessonProduct.nameJa} / {b.lessonProduct.nameEn}
              </p>
              <p className="text-sm text-muted">
                {b.startsAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })} —{" "}
                {b.endsAt.toLocaleString(locale, { dateStyle: "medium", timeStyle: "short" })}
              </p>
              <p className="text-sm text-muted">
                {t("teacher")}: {b.teacher.user.name ?? b.teacher.user.email}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <span className="rounded-full border border-border bg-background px-2.5 py-1 text-xs font-medium text-foreground">
                  {t(bookingStatusKey(b.status))}
                </span>
                {b.status === "PENDING_PAYMENT" && (
                  <Link
                    href={`/book/checkout/${b.id}`}
                    className="rounded-full bg-primary px-3 py-1 text-xs font-semibold text-primary-foreground hover:opacity-90"
                  >
                    {t("completePayment")}
                  </Link>
                )}
                {b.invoice && (
                  <a
                    href={`/api/invoices/${b.invoice.id}/pdf`}
                    className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-[var(--app-hover)]"
                  >
                    {t("downloadInvoice")}
                  </a>
                )}
                <a
                  href={buildGoogleCalendarUrl({
                    uid: `booking-${b.id}@english-studio.local`,
                    title: `${b.lessonProduct.nameEn} (${b.lessonProduct.nameJa})`,
                    description: `${t("teacher")}: ${b.teacher.user.name ?? b.teacher.user.email}`,
                    location: b.meetUrl ?? "English Studio lesson",
                    startsAt: b.startsAt,
                    endsAt: b.endsAt,
                  })}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-[var(--app-hover)]"
                >
                  {t("addToGoogleCalendar")}
                </a>
                <a
                  href={`/api/bookings/ics?bookingId=${b.id}`}
                  className="rounded-full border border-border bg-surface px-3 py-1 text-xs font-medium text-foreground hover:bg-[var(--app-hover)]"
                >
                  {t("downloadIcs")}
                </a>
                {(b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT") && (
                  <BookingCancelButton bookingId={b.id} />
                )}
              </div>
            </div>
            {b.meetUrl && (
              <a
                href={b.meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-2 inline-flex text-sm font-semibold text-link hover:opacity-90 sm:mt-0"
              >
                {t("meetLink")}
              </a>
            )}
          </div>
        </li>
      ))}
    </>
  );
}
