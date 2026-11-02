"use client";

import { useEffect, useRef, useState } from "react";
import { Link, useRouter } from "@/i18n/navigation";
import { useLocale, useTranslations } from "next-intl";
import { Status } from "@/components/ui/status";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { StudentReschedule } from "@/components/booking/student-reschedule";
import { formatYen } from "@/lib/format-money";
import type { BookingCancellationPreview } from "@/lib/booking-cancellation-preview";

type Props = {
  bookingId: string;
  withinDialog?: boolean;
  onCompleted?: () => void;
};

export function BookingCancelButton({ bookingId, withinDialog = false, onCompleted }: Props) {
  const t = useTranslations("dashboard");
  const locale = useLocale();
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [checking, setChecking] = useState(false);
  const [saving, setSaving] = useState(false);
  const [moving, setMoving] = useState(false);
  const [rescheduling, setRescheduling] = useState(false);
  const [requestPending, setRequestPending] = useState(false);
  const [moved, setMoved] = useState(false);
  const [preview, setPreview] = useState<BookingCancellationPreview | null>(null);
  const [outcome, setOutcome] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const read = useRef<AbortController | null>(null);
  const busy = saving || moving;
  const url = `/api/bookings/${encodeURIComponent(bookingId)}/cancel`;
  const title = rescheduling ? t("lessonDetail.rescheduleTitle") : moved ? t("privateReschedule.rescheduledTitle")
    : requestPending ? t("privateReschedule.requestSentTitle") : outcome ? t("statusCancelled")
    : preview?.studentPrivate ? t("cancelBookingChoiceTitle") : t("cancelBooking");
  useEffect(() => () => read.current?.abort(), []);

  async function begin() {
    read.current?.abort();
    const controller = new AbortController();
    read.current = controller;
    setPreview(null); setOutcome(null); setError(null); setRescheduling(false); setRequestPending(false); setMoved(false); setChecking(true); setOpen(true);
    try {
      const response = await fetch(url, { cache: "no-store", signal: controller.signal });
      if (!response.ok) throw new Error("Preview unavailable");
      const data: BookingCancellationPreview = await response.json();
      if (!controller.signal.aborted) setPreview(data);
    } catch {
      if (!controller.signal.aborted) setError(t("cancelBookingLoadError"));
    } finally {
      if (!controller.signal.aborted) setChecking(false);
    }
  }

  function close() {
    if (busy) return;
    read.current?.abort(); setOpen(false);
    if (outcome) { router.refresh(); onCompleted?.(); }
  }

  async function onCancel() {
    if (!preview?.policy.allowed || busy) return;
    setSaving(true);
    setError(null);
    try {
      const intent = preview.studentPrivate && preview.policy.rescheduleOffered ? "request_reschedule" : preview.refundAmountYen > 0 ? "refund" : "cancel";
      const res = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ intent }) });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "REFUND_WINDOW_CHANGED" && data.policy) {
          setPreview({ ...preview, policy: data.policy, refundAmountYen: 0 });
          setError(t("privateReschedule.refundWindowChanged"));
        } else if (data.code === "POLICY_CHANGED") {
          await begin();
        } else setError(t("cancelBookingError"));
        return;
      }
      const pending = data.booking?.privateRescheduleStatus === "PENDING";
      setRequestPending(pending);
      setOutcome(t(pending ? "privateReschedule.requestSent" : data.refund ? data.refund.status === "SUCCEEDED" ? "cancelBookingRefunded" : "cancelBookingRefundPending" : "cancelBookingCancelled"));
    } catch {
      setError(t("cancelBookingError"));
    } finally {
      setSaving(false);
    }
  }

  const content = <div className="space-y-4">
      {checking ? <p role="status" className="text-sm text-muted">{t("cancelBookingLoading")}</p> : null}
      {error ? (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}
      {outcome ? !rescheduling ? <p role="status" className="text-sm">{outcome}</p> : null : preview ? <>
        {!rescheduling ? <p className="text-sm text-muted">{t(preview.studentPrivate && !preview.policy.rescheduleOffered ? "cancelBookingChoiceHelp" : "cancelBookingConfirm")}</p> : null}
        {!rescheduling && preview.studentPrivate && preview.policy.rescheduleOffered ? <p className="text-sm">{t("cancelBookingRescheduleOnly")}</p> : null}
        {!rescheduling && preview.policy.allowed && preview.refundAmountYen > 0 ? <p className="text-sm">{t("cancelBookingRefundHelp", { amount: formatYen(preview.refundAmountYen, locale) })}</p> : null}
        {!preview.policy.allowed && !preview.policy.rescheduleOffered ? <p className="text-sm text-muted">{t("cancelBookingUnavailable")}</p> : null}
      </> : null}
      {preview?.studentPrivate && preview.reschedule?.allowed && (requestPending || (!outcome && !preview.policy.rescheduleOffered)) ? <StudentReschedule
        bookingId={bookingId} timeZone={preview.timeZone} unavailableMessage={t(requestPending ? "privateReschedule.noAvailability" : "cancelBookingNoAvailability")}
        onBusyChange={setMoving} onOpenChange={setRescheduling} backLabel={t("cancelBookingBack")} showHeading={false}
        onSaved={calendarUpdated => {
          setRequestPending(false); setRescheduling(false); setMoved(true);
          if (calendarUpdated) { setOpen(false); onCompleted?.(); }
          else setOutcome(t("lessonDetail.rescheduleCalendarPartial"));
        }} /> : null}
      {requestPending && !rescheduling ? <Link href="/dashboard/schedule/reschedule" className="inline-block text-sm underline underline-offset-4">{t("privateReschedule.manage")}</Link> : null}
      {!rescheduling ? <div className="flex flex-wrap justify-end gap-2 border-t border-border pt-4">
        <Button variant="secondary" disabled={busy} onClick={close}>{t(outcome ? "cancelBookingDone" : "cancelBookingKeep")}</Button>
        {preview?.policy.allowed && !outcome ? <Button variant="destructive" loading={saving} disabled={moving} onClick={() => void onCancel()}>
          {t(saving ? "cancelBookingWorking" : preview.studentPrivate && preview.policy.rescheduleOffered ? "privateReschedule.lateCancelAction" : preview.refundAmountYen > 0 ? "cancelBookingRefund" : "cancelBookingConfirmAction")}
        </Button> : null}
      </div> : null}
    </div>;

  if (open && withinDialog) return <section aria-label={title} className="w-full space-y-4 border-t border-border pt-5">
    <h2 className="text-base font-semibold">{title}</h2>{content}
  </section>;
  return <>
    <Button variant="secondary" size="sm" onClick={() => void begin()}>{t("cancelBooking")}</Button>
    {open ? <Modal open title={title} onClose={close} dismissOnBackdrop={!busy}>{content}</Modal> : null}
  </>;
}
