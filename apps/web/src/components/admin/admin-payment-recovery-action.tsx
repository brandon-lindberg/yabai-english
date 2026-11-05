"use client";
import { useState } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { Status } from "@/components/ui/status";

type Props = { onCompleted: () => void; feeOnly?: boolean } & ({ paymentId: string; eventId?: never } | { eventId: string; paymentId?: never });
export function AdminPaymentRecoveryAction(props: Props) {
  const t = useTranslations("admin.refundsPage");
  const [open, setOpen] = useState(false), [busy, setBusy] = useState(false), [error, setError] = useState(false);
  const [outcome, setOutcome] = useState<"complete" | "queued" | null>(null);
  async function confirm() {
    if (busy) return; setBusy(true); setError(false);
    try {
      const response = await fetch("/api/admin/payments/recovery", { method: "POST", headers: { "Content-Type": "application/json" },
        body: JSON.stringify(props.eventId ? { eventId: props.eventId } : { paymentId: props.paymentId }) });
      const data = await response.json();
      if (!response.ok) { setError(true); return; }
      setOpen(false); setOutcome(data.pending ? "queued" : "complete"); props.onCompleted();
    } catch { setError(true); }
    finally { setBusy(false); }
  }
  return <div className="space-y-2">
    <Button variant="secondary" size="sm" onClick={() => { setOpen(true); setError(false); }}>{t(props.eventId ? "retryEvent" : "retryRecovery")}</Button>
    {outcome ? <p role="status" className="text-xs text-muted">{t(outcome === "complete" ? "recoveryComplete" : "recoveryQueued")}</p> : null}
    {open ? <Modal open title={t("recoveryConfirmTitle")} onClose={() => { if (!busy) setOpen(false); }} dismissOnBackdrop={!busy}
      actions={<><Button variant="secondary" disabled={busy} onClick={() => setOpen(false)}>{t("keepRecovery")}</Button>
        <Button loading={busy} onClick={() => void confirm()}>{t("confirmRecovery")}</Button></>}>
      <p className="text-sm">{t(props.eventId ? "eventConfirm" : props.feeOnly ? "feeRecoveryConfirm" : "recoveryConfirm")}</p>
      {error ? <p role="alert" className="mt-3"><Status tone="error">{t("recoveryError")}</Status></p> : null}
    </Modal> : null}
  </div>;
}
