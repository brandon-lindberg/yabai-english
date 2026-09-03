import { getLocale, getTranslations } from "next-intl/server";
import type { ReactNode } from "react";
import { Link } from "@/i18n/navigation";
import type { BookingDisplayStatus } from "@/lib/booking-status";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import { BookingCancelButton } from "@/components/dashboard/booking-cancel-button";
import { NextLessonWhen } from "@/components/dashboard/next-lesson-when";
import { Status } from "@/components/ui/status";
import { InlineAlert } from "@/components/ui/inline-alert";
import { PendingReservationActions } from "@/components/booking/pending-reservation-actions";
import { buttonClasses } from "@/components/ui/button";

/**
 * The dashboard's focal moment, for whoever is looking at it.
 *
 * This was written for students, typed to the student booking query, and its
 * own comment asserted that the next lesson is "the single thing a student
 * opens the dashboard to find out" — without ever asking whether that is also
 * true of a teacher. It is. The teacher dashboard opened on a ledger of counts
 * and buried the next lesson in a list.
 *
 * So the shape is normalised: whoever the other person is, they are the
 * counterpart. What differs between the flows is only what to offer when there
 * is no next lesson — a student books one, a teacher opens their availability.
 */

export type NextLessonView = {
  id: string;
  startsAt: Date;
  endsAt: Date;
  /** The other person: the teacher for a student, the student for a teacher. */
  counterpartName: string;
  lessonNameJa: string;
  lessonNameEn: string;
  status: BookingDisplayStatus;
  meetUrl: string | null;
  /** When an unpaid reservation stops holding its slot. Null once confirmed. */
  holdExpiresAt?: Date | null;
};

export async function DashboardNextLesson({
  next,
  emptyMessage,
  emptyAction,
  canCompletePayment = false,
}: {
  next: NextLessonView | null;
  emptyMessage: string;
  emptyAction: ReactNode;
  /**
   * Whether this viewer is the one who owes the money. A teacher sees the same
   * unpaid booking, but cannot settle it — offering them "Complete payment"
   * would be offering to charge somebody else's card.
   */
  canCompletePayment?: boolean;
}) {
  const locale = await getLocale();
  const t = await getTranslations("dashboard");
  const th = await getTranslations("dashboard.highlights");

  /*
    An unpaid booking is a reservation, not a lesson. Shown under "Next lesson"
    with a big confirmed-looking time, it read as done — while a three-hour hold
    quietly ran out and the slot went back on sale. So it says what it is, says
    when it lapses, and leads with the way to finish.
  */
  const awaitingPayment = Boolean(
    next && next.status === "PENDING_PAYMENT" && canCompletePayment,
  );

  if (!next) {
    return (
      <section className="border-t border-border pt-6" aria-labelledby="next-lesson-heading">
        <h2
          id="next-lesson-heading"
          className="text-xl font-bold tracking-[-0.02em] text-foreground"
        >
          {th("nextLessonTitle")}
        </h2>
        <p className="mt-2 max-w-[52ch] text-base text-muted">{emptyMessage}</p>
        <div className="mt-5">{emptyAction}</div>
      </section>
    );
  }

  return (
    <section className="border-t border-border pt-6" aria-labelledby="next-lesson-heading">
      {/*
        A visible section heading, at the same weight this component already
        uses for its empty state. DESIGN.md §4 bans eyebrows — a small tracked
        label acting as a category tag — but a heading that names the section is
        not one, and a time with nothing above it read as unmoored.
      */}
      <h2
        id="next-lesson-heading"
        className="text-xl font-bold tracking-[-0.02em] text-foreground"
      >
        {awaitingPayment ? th("reservationTitle") : th("nextLessonTitle")}
      </h2>

      <NextLessonWhen
        className="mt-3"
        locale={locale}
        startsAtIso={next.startsAt.toISOString()}
        endsAtIso={next.endsAt.toISOString()}
      />

      {/* The other person, named and prominent: continuity with one person is
          the product's whole thesis, and it was previously a grey line. */}
      <p className="mt-5 text-lg font-bold tracking-[-0.02em] text-foreground">
        {next.counterpartName}
      </p>
      <p className="mt-0.5 text-sm text-muted">
        {next.lessonNameJa} / {next.lessonNameEn}
      </p>

      {awaitingPayment ? (
        <InlineAlert variant="warning" role="status" className="mt-5">
          {next.holdExpiresAt
            ? th("reservationExplain", {
                expires: new Intl.DateTimeFormat(locale, {
                  weekday: "short",
                  hour: "2-digit",
                  minute: "2-digit",
                }).format(next.holdExpiresAt),
              })
            : th("reservationExplain", { expires: "—" })}
        </InlineAlert>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        {awaitingPayment ? null : (
          <Status tone={bookingStatusTone(next.status)}>{t(bookingStatusKey(next.status))}</Status>
        )}
        {awaitingPayment ? <PendingReservationActions bookingId={next.id} /> : null}
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
        {next.status === "CONFIRMED" ? <BookingCancelButton bookingId={next.id} /> : null}
      </div>
    </section>
  );
}
