import { getLocale, getTranslations } from "next-intl/server";
import { Link } from "@/i18n/navigation";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import type { getStudentBookingsForDashboard } from "@/lib/dashboard/student-bookings";
import { BookingCancelButton } from "@/components/dashboard/booking-cancel-button";
import { LocalBookingDateTimeRange } from "@/components/dashboard/local-booking-datetime-range";
import { Status } from "@/components/ui/status";
import { buttonClasses } from "@/components/ui/button";

type Upcoming = Awaited<ReturnType<typeof getStudentBookingsForDashboard>>["upcoming"];

/**
 * The dashboard's focal moment.
 *
 * Previously this was one card in a two-up grid, equal in weight to the profile
 * summary. It is not equal: it is the single thing a student opens the dashboard
 * to find out. So it loses the card, takes the page's full measure, and sets the
 * time at display scale.
 *
 * The heading is screen-reader-only on purpose. A small "Next lesson" label sat
 * above a large date would be an eyebrow, which the craft floor bans outright —
 * the date carries its own weight, and the landmark stays properly labelled.
 */
export async function DashboardNextLesson({ upcoming }: { upcoming: Upcoming }) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const th = await getTranslations("dashboard.highlights");
  const next = upcoming[0];

  if (!next) {
    return (
      <section className="border-t border-border pt-6" aria-labelledby="next-lesson-heading">
        <h2 id="next-lesson-heading" className="text-xl font-bold tracking-[-0.02em] text-foreground">
          {th("nextLessonTitle")}
        </h2>
        <p className="mt-2 max-w-[52ch] text-base text-muted">{th("noNextLesson")}</p>
        <Link href="/book" className={`mt-5 ${buttonClasses({ size: "lg" })}`}>
          {th("bookCta")}
        </Link>
      </section>
    );
  }

  return (
    <section className="border-t border-border pt-6" aria-labelledby="next-lesson-heading">
      <h2 id="next-lesson-heading" className="sr-only">
        {th("nextLessonTitle")}
      </h2>

      <LocalBookingDateTimeRange
        locale={locale}
        startsAtIso={next.startsAt.toISOString()}
        endsAtIso={next.endsAt.toISOString()}
        className="block text-[clamp(1.75rem,4.5vw,3.25rem)] font-black leading-[1.05] tracking-[-0.035em] tabular-nums text-foreground"
      />

      {/* The teacher, named and prominent: continuity with one person is the
          product's whole thesis, and it was previously a grey "Teacher: x" line. */}
      <p className="mt-3 text-lg font-bold tracking-[-0.02em] text-foreground">
        {next.teacher.user.name ?? next.teacher.user.email}
      </p>
      <p className="mt-0.5 text-sm text-muted">
        {next.lessonProduct.nameJa} / {next.lessonProduct.nameEn}
      </p>

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <Status tone={bookingStatusTone(next.status)}>{t(bookingStatusKey(next.status))}</Status>
        {next.meetUrl && next.status === "CONFIRMED" ? (
          <a
            href={next.meetUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={buttonClasses({ size: "sm" })}
          >
            {t("meetLink")}
          </a>
        ) : null}
        <Link href="/dashboard/schedule" className={buttonClasses({ variant: "ghost", size: "sm" })}>
          {th("fullSchedule")}
        </Link>
        {next.status === "CONFIRMED" || next.status === "PENDING_PAYMENT" ? (
          <BookingCancelButton bookingId={next.id} />
        ) : null}
      </div>
    </section>
  );
}
