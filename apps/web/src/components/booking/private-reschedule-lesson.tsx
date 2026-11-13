"use client";
import { useState } from "react";
import { useLocale, useTranslations } from "next-intl";
import { Link, useRouter } from "@/i18n/navigation";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Status } from "@/components/ui/status";
import { StudentReschedule } from "./student-reschedule";
import { TeacherBookingRescheduleForm } from "@/components/dashboard/teacher-booking-reschedule-form";
import { formatYen } from "@/lib/format-money";
import type { PrivateRescheduleStatus, BookingStatus } from "@/generated/prisma/client";
import { MAX_STUDENT_RESCHEDULES } from "@/lib/booking-reschedule";

type Props = { bookingId: string; lessonLabel: string; counterpart: string; startsAtIso: string; timeZone: string;
  rescheduleCount: number; status: PrivateRescheduleStatus; bookingStatus: BookingStatus; viewer: "teacher" | "student";
  paidAmountYen: number; refundStatus: string | null; hasCalendar: boolean };

export function PrivateRescheduleLesson(props: Props) {
  const t = useTranslations("dashboard.privateReschedule");
  const td = useTranslations("dashboard");
  const locale = useLocale();
  const pending = props.status === "PENDING" && props.bookingStatus === "CANCELLED";
  const rescheduled = props.status === "RESCHEDULED" && props.bookingStatus === "CONFIRMED";
  const status = pending ? t("pendingStatus") : rescheduled ? t("rescheduledStatus") : props.refundStatus
    ? t(props.refundStatus === "SUCCEEDED" ? "refundSucceededStatus" : "refundPendingStatus") : t("closedStatus");
  return <article data-private-request={props.bookingId} className="space-y-4 border-t border-border py-6">
    <div className="space-y-2">
      <h3 className="text-lg font-semibold">{props.lessonLabel}</h3>
      <p className="text-sm text-muted">{t("with", { name: props.counterpart })}</p>
      <p className="text-sm text-muted">{t("lessonTime")}: {new Date(props.startsAtIso).toLocaleString(locale, { timeZone: props.timeZone, dateStyle: "medium", timeStyle: "short" })}</p>
      <Status tone={pending || (props.refundStatus && props.refundStatus !== "SUCCEEDED") ? "pending" : rescheduled ? "settled" : "spent"}>{status}</Status>
    </div>
    {pending ? <>
      <p className="max-w-prose text-sm text-muted">{t(props.viewer === "teacher" ? "teacherHelp" : "studentHelp")}</p>
      {props.viewer === "teacher" ? <TeacherBookingRescheduleForm bookingId={props.bookingId} initialStartsAtIso={props.startsAtIso} teacherTimezone={props.timeZone} />
        : props.rescheduleCount < MAX_STUDENT_RESCHEDULES ? <StudentReschedule bookingId={props.bookingId} timeZone={props.timeZone} unavailableMessage={t("noAvailability")} />
          : <p className="text-sm text-muted">{td("lessonDetail.rescheduleLimitReached")}</p>}
    </> : rescheduled ? <>
      {!props.hasCalendar ? <p role="status" className="text-sm text-muted">{td("lessonDetail.rescheduleCalendarPartial")}</p> : null}
      <Link href="/dashboard/schedule" className="text-sm underline underline-offset-4">{td("lessonDetail.backToSchedule")}</Link>
    </> : !props.refundStatus ? <p className="text-sm text-muted">{t("closedHelp")}</p> : null}
    {props.viewer === "teacher" && (pending || (props.status === "REFUND_REQUESTED" && !props.refundStatus))
      ? <TeacherResolution {...props} /> : null}
  </article>;
}

function TeacherResolution({ bookingId, paidAmountYen, status }: Props) {
  const t = useTranslations("dashboard.privateReschedule");
  const locale = useLocale();
  const router = useRouter();
  const [action, setAction] = useState<"close" | "refund" | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  async function confirm() {
    if (!action || busy) return;
    setBusy(true); setError(false);
    try {
      const response = await fetch(`/api/bookings/${encodeURIComponent(bookingId)}/reschedule-request`, {
        method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action }),
      });
      if (!response.ok) { setError(true); return; }
      setAction(null); router.refresh();
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  return <div className="space-y-3 border-t border-border pt-4">
    <p className="text-sm text-muted">{t("refundTeacherHelp")}</p>
    <div className="flex flex-wrap gap-2">
      {status === "PENDING" ? <Button variant="secondary" onClick={() => { setAction("close"); setError(false); }}>{t("closeAction")}</Button> : null}
      {paidAmountYen > 0 ? <Button variant="secondary" onClick={() => { setAction("refund"); setError(false); }}>{t(status === "REFUND_REQUESTED" ? "retryRefund" : "refundAction")}</Button> : null}
    </div>
    {action ? <Modal open title={t(action === "refund" ? "refundConfirmTitle" : "closeConfirmTitle")}
      onClose={() => { if (!busy) setAction(null); }} dismissOnBackdrop={!busy}
      actions={<><Button variant="secondary" disabled={busy} onClick={() => setAction(null)}>{t("keepRequest")}</Button>
        <Button variant="destructive" loading={busy} onClick={() => void confirm()}>{t(action === "refund" ? "confirmRefund" : "confirmClose")}</Button></>}>
      <p className="text-sm">{action === "refund" ? t("refundConfirm", { amount: formatYen(paidAmountYen, locale) }) : t("closeConfirm")}</p>
      {error ? <p role="alert"><Status tone="error">{t("error")}</Status></p> : null}
    </Modal> : null}
  </div>;
}
