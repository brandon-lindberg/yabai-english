import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import type { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { BookingCancelButton } from "@/components/dashboard/booking-cancel-button";
import { LocalBookingDateTimeRange } from "@/components/dashboard/local-booking-datetime-range";
import { InvoiceDownloadLinks } from "@/components/dashboard/invoice-download-links";
import { Status } from "@/components/ui/status";
import { buttonClasses } from "@/components/ui/button";

type Upcoming = Awaited<ReturnType<typeof getStudentBookingsForDashboard>>["upcoming"];

export async function DashboardUpcomingLessons({ upcoming }: { upcoming: Upcoming }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");

  if (upcoming.length === 0) {
    return (
      <li className="border-t border-border py-6 text-muted">
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
          className="border-t border-border pt-4"
        >
          <div className="flex flex-col gap-1 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="font-medium text-foreground">
                {b.lessonProduct.nameJa} / {b.lessonProduct.nameEn}
              </p>
              <p className="text-sm text-muted">
                <LocalBookingDateTimeRange
                  locale={locale}
                  startsAtIso={b.startsAt.toISOString()}
                  endsAtIso={b.endsAt.toISOString()}
                />
              </p>
              <p className="text-sm text-muted">
                {t("teacher")}: {b.teacher.user.name ?? b.teacher.user.email}
              </p>
              <div className="mt-2 flex flex-wrap gap-2">
                <Status tone={bookingStatusTone(b.status)}>{t(bookingStatusKey(b.status))}</Status>
                {b.status === "PENDING_PAYMENT" && (
                  <Link
                    href={`/book/checkout/${b.id}`}
                    className={buttonClasses({ size: "sm" })}
                  >
                    {t("completePayment")}
                  </Link>
                )}
                {b.invoice && (
                  <InvoiceDownloadLinks
                    invoiceId={b.invoice.id}
                    englishLabel={t("downloadInvoiceEn")}
                    japaneseLabel={t("downloadInvoiceJa")}
                  />
                )}
                {b.status === "CONFIRMED" && !b.googleEventId && (
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
                    className={buttonClasses({ variant: "secondary", size: "sm" })}
                  >
                    {t("addToGoogleCalendar")}
                  </a>
                )}
                <a
                  href={`/api/bookings/ics?bookingId=${b.id}`}
                  className={buttonClasses({ variant: "secondary", size: "sm" })}
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
