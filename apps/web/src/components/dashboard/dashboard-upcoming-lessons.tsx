import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import { buildGoogleCalendarUrl } from "@/lib/calendar";
import type { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { BookingCancelButton } from "@/components/dashboard/booking-cancel-button";
import { InvoiceDownloadLinks } from "@/components/dashboard/invoice-download-links";
import { LessonListEmpty, LessonRow } from "@/components/dashboard/lesson-row";
import { buttonClasses } from "@/components/ui/button";

type Upcoming = Awaited<ReturnType<typeof getStudentBookingsForDashboard>>["upcoming"];

export async function DashboardUpcomingLessons({ upcoming }: { upcoming: Upcoming }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");

  if (upcoming.length === 0) {
    return <LessonListEmpty>{t("noBookings")}</LessonListEmpty>;
  }

  return (
    <>
      {upcoming.map((b) => (
        <LessonRow
          key={b.id}
          bookingId={b.id}
          locale={locale}
          lessonNameJa={b.lessonProduct.nameJa}
          lessonNameEn={b.lessonProduct.nameEn}
          startsAtIso={b.startsAt.toISOString()}
          endsAtIso={b.endsAt.toISOString()}
          counterpartLabel={t("teacher")}
          counterpartName={b.teacher.user.name ?? b.teacher.user.email ?? "—"}
          status={{ tone: bookingStatusTone(b.status), label: t(bookingStatusKey(b.status)) }}
          inlineActions={
            <>
              {b.status === "PENDING_PAYMENT" ? (
                <Link href={`/book/checkout/${b.id}`} className={buttonClasses({ size: "sm" })}>
                  {t("completePayment")}
                </Link>
              ) : null}
              {b.invoice ? (
                <InvoiceDownloadLinks
                  invoiceId={b.invoice.id}
                  englishLabel={t("downloadInvoiceEn")}
                  japaneseLabel={t("downloadInvoiceJa")}
                />
              ) : null}
              {b.status === "CONFIRMED" && !b.googleEventId ? (
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
              ) : null}
              <a
                href={`/api/bookings/ics?bookingId=${b.id}`}
                className={buttonClasses({ variant: "secondary", size: "sm" })}
              >
                {t("downloadIcs")}
              </a>
              {b.status === "CONFIRMED" || b.status === "PENDING_PAYMENT" ? (
                <BookingCancelButton bookingId={b.id} />
              ) : null}
            </>
          }
          actions={
            b.meetUrl ? (
              <a
                href={b.meetUrl}
                target="_blank"
                rel="noopener noreferrer"
                className={buttonClasses({ size: "sm" })}
              >
                {t("meetLink")}
              </a>
            ) : null
          }
        />
      ))}
    </>
  );
}
