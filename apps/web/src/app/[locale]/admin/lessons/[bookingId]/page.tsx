import type { ReactNode } from "react";
import { notFound } from "next/navigation";
import { getLocale, getTranslations } from "next-intl/server";
import { auth } from "@/auth";
import { Link } from "@/i18n/navigation";
import { prisma } from "@/lib/prisma";
import { adminLessonsHref, loadAdminLessonDetail } from "@/lib/admin/lesson-search";
import { adminLessonCalendarQuery, adminPersonScheduleHref } from "@/lib/admin/lesson-calendar";
import { bookingStatusKey, bookingStatusTone } from "@/lib/booking-status";
import { formatYen } from "@/lib/format-money";
import { lessonProductNames } from "@/lib/lesson-product-catalog";
import { AdminParticipantLink } from "@/components/admin/admin-participant-link";
import { AdminLessonScheduleLink } from "@/components/admin/admin-lesson-schedule-link";
import { AdminRefundStatus } from "@/components/admin/admin-refund-status";
import { LocalDateTime } from "@/components/local-datetime";
import { LocalBookingDateTimeRange } from "@/components/dashboard/local-booking-datetime-range";
import { DataList, DataRow } from "@/components/ui/data-row";
import { actionLinkClass } from "@/components/ui/inline-link";
import { PageHeader } from "@/components/ui/page-header";
import { Section } from "@/components/ui/section";
import { Status } from "@/components/ui/status";

function RecordValue({ label, children }: { label: string; children: ReactNode }) {
  return <div className="min-w-0">
    <dt className="text-sm text-muted">{label}</dt>
    <dd className="mt-1 break-words text-sm font-medium">{children}</dd>
  </div>;
}

export default async function AdminLessonDetailPage({ params, searchParams }: {
  params: Promise<{ bookingId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const session = await auth();
  if (session?.user.role !== "SUPER_ADMIN") return null;
  const [{ bookingId }, raw, locale, t, dashboard, subject, calendar] = await Promise.all([
    params, searchParams, getLocale(), getTranslations("admin.lessonDetail"), getTranslations("dashboard"), getTranslations("admin.teachingLanguages"), getTranslations("admin.lessonCalendar"),
  ]);
  if (bookingId.length > 200) notFound();
  const booking = await loadAdminLessonDetail(prisma, bookingId);
  if (!booking) notFound();
  const names = lessonProductNames(booking.lessonProduct, booking.learningLanguage);
  const teacher = { ...booking.teacher.user, name: booking.teacher.displayName ?? booking.teacher.user.name };
  const calendarQuery = adminLessonCalendarQuery.safeParse(raw);
  const fromCalendar = calendarQuery.success && (raw.calendarPerson === booking.student.id || raw.calendarPerson === teacher.id)
    ? adminPersonScheduleHref(raw.calendarPerson, calendarQuery.data) : null;
  const paymentsHref = `/admin/payments?${new URLSearchParams({ booking: booking.id })}`;
  const date = (value: Date) => <LocalDateTime iso={value.toISOString()} locale={locale} />;

  return (
    <main className="space-y-7">
      <Link className={`${actionLinkClass} text-sm`} href={fromCalendar ?? adminLessonsHref(typeof raw.from === "string" ? raw.from : undefined)}>
        {fromCalendar ? calendar("back") : t("back")}
      </Link>
      <div className="break-words">
        <PageHeader title={locale === "ja" ? names.nameJa : names.nameEn} />
        <p className="-mt-4 text-sm text-muted">
          <LocalBookingDateTimeRange locale={locale} startsAtIso={booking.startsAt.toISOString()} endsAtIso={booking.endsAt.toISOString()} />
        </p>
      </div>

      <Section title={t("booking")}>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <RecordValue label={t("subject")}>{subject(booking.learningLanguage)}</RecordValue>
          <RecordValue label={t("status")}><Status tone={bookingStatusTone(booking.status)}>{dashboard(bookingStatusKey(booking.status))}</Status></RecordValue>
          <RecordValue label={t("student")}>
            <AdminParticipantLink participant={booking.student} />
            <AdminLessonScheduleLink personId={booking.student.id} startsAtIso={booking.startsAt.toISOString()}>{calendar("studentCalendar")}</AdminLessonScheduleLink>
          </RecordValue>
          <RecordValue label={t("teacher")}>
            <AdminParticipantLink participant={teacher} />
            <AdminLessonScheduleLink personId={teacher.id} startsAtIso={booking.startsAt.toISOString()}>{calendar("teacherCalendar")}</AdminLessonScheduleLink>
          </RecordValue>
        </dl>
        <dl className="mt-4"><RecordValue label={t("bookingId")}>{booking.id}</RecordValue></dl>
      </Section>

      <Section title={t("reschedule")}>
        <dl className="grid grid-cols-2 gap-4 lg:grid-cols-4">
          <RecordValue label={t("status")}>{t(`rescheduleStatus.${booking.privateRescheduleStatus ?? "NONE"}`)}</RecordValue>
          <RecordValue label={t("changes")}>{booking.rescheduleCount}</RecordValue>
          {booking.rescheduleRequestedAt && <RecordValue label={t("requestedAt")}>{date(booking.rescheduleRequestedAt)}</RecordValue>}
          {booking.rescheduleResolvedAt && <RecordValue label={t("resolvedAt")}>{date(booking.rescheduleResolvedAt)}</RecordValue>}
        </dl>
      </Section>

      <div id="payment" className="scroll-mt-32">
        <Section title={t("payments")} actions={booking.payments.length > 0 && <Link href={paymentsHref} className={`${actionLinkClass} text-sm`}>{t("recoveryLink")}</Link>}>
          <dl className="mb-4"><RecordValue label={t("quotedPrice")}>{formatYen(booking.quotedPriceYen, locale)}</RecordValue></dl>
          {booking.payments.length > 0 ? <DataList>{booking.payments.map((payment) => (
            <DataRow key={payment.id}>
              <p className="font-semibold">{formatYen(payment.amountYen, locale)} · {t(`paymentStatus.${payment.status}`)}</p>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <RecordValue label={t("paymentMethod")}>{payment.provider} · {t(`method.${payment.method}`)}</RecordValue>
                <RecordValue label={t("paymentId")}>{payment.id}</RecordValue>
                {payment.providerPaymentId && <RecordValue label={t("providerPaymentId")}>{payment.providerPaymentId}</RecordValue>}
                {payment.paidAt && <RecordValue label={t("paidAt")}>{date(payment.paidAt)}</RecordValue>}
                {payment.recovery && <RecordValue label={t("recoveryState")}>
                  {t(`recovery.${payment.recovery.state}`)}
                  {payment.recovery.feeRecoveryPending && <span className="mt-1 block text-muted">{t("feePending")}</span>}
                </RecordValue>}
              </dl>
            </DataRow>
          ))}</DataList> : <p className="text-sm text-muted">{t("noPayments")}</p>}
          {booking.invoice && <dl className="mt-4 grid gap-4 sm:grid-cols-3">
            <RecordValue label={t("invoice")}>{booking.invoice.invoiceNo}</RecordValue>
            <RecordValue label={t("invoiceAmount")}>{formatYen(booking.invoice.amountYen, locale)}</RecordValue>
            <RecordValue label={t("paidAt")}>{date(booking.invoice.paidAt)}</RecordValue>
          </dl>}
        </Section>
      </div>

      <div id="refunds" className="scroll-mt-32">
        <Section title={t("refunds")}>
          {booking.refunds.length > 0 ? <DataList>{booking.refunds.map((refund) => (
            <DataRow key={refund.id} actions={<AdminRefundStatus status={refund.status} />}>
              <p className="font-semibold">{formatYen(refund.amountYen, locale)}</p>
              <dl className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <RecordValue label={t("refundId")}>{refund.id}</RecordValue>
                <RecordValue label={t("recordedAt")}>{date(refund.createdAt)}</RecordValue>
                {refund.providerRefundId && <RecordValue label={t("providerRefundId")}>{refund.providerRefundId}</RecordValue>}
                {refund.creditNoteNo && <RecordValue label={t("creditNote")}>{refund.creditNoteNo}</RecordValue>}
              </dl>
            </DataRow>
          ))}</DataList> : <p className="text-sm text-muted">{t("noRefunds")}</p>}
        </Section>
      </div>
    </main>
  );
}
