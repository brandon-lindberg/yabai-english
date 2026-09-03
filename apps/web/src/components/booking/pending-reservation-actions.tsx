"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Status } from "@/components/ui/status";

/**
 * The two ways out of an unpaid reservation: finish paying, or give the time
 * back.
 *
 * Shared, because the student meets this state in two places — on the teacher's
 * page where they backed out of checkout, and on their dashboard where it is
 * the next thing in their calendar. Two copies of the pay call would be two
 * chances for one of them to drift.
 */
export function PendingReservationActions({
  bookingId,
  size = "sm",
}: {
  bookingId: string;
  size?: "sm" | "md";
}) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function onPay() {
    setBusy("pay");
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptedMarketplaceTerms: true }),
      });
      const data = (await res.json()) as { error?: string; checkoutUrl?: string };
      if (!res.ok) {
        setError(data.error ?? t("pendingReservationError"));
        return;
      }
      router.push(data.checkoutUrl ?? `/book/checkout/${bookingId}`);
    } catch {
      setError(t("pendingReservationError"));
    } finally {
      setBusy(null);
    }
  }

  async function onCancel() {
    if (!window.confirm(t("pendingReservationCancelConfirm"))) return;
    setBusy("cancel");
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("pendingReservationError"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("pendingReservationError"));
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      {error ? (
        <p role="alert" className="w-full">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void onPay()}
        disabled={busy !== null}
        className={buttonClasses({ size })}
      >
        {t("pendingReservationPay")}
      </button>
      <button
        type="button"
        onClick={() => void onCancel()}
        disabled={busy !== null}
        className={buttonClasses({ variant: "secondary", size })}
      >
        {busy === "cancel"
          ? t("pendingReservationCancelWorking")
          : t("pendingReservationCancel")}
      </button>
    </>
  );
}
