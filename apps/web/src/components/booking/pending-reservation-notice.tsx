"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { useRouter } from "@/i18n/navigation";
import { buttonClasses } from "@/components/ui/button";
import { Status } from "@/components/ui/status";

type Props = {
  bookingId: string;
  startsAtIso: string;
  expiresAtIso: string;
  viewerTimezone: string;
};

/**
 * A student who backs out of checkout leaves a booking holding its slot with no
 * way forward from this page: the slot reads "Reserved" and the only recovery
 * lives in the schedule. This puts both exits — finish paying, or give the time
 * back — where the reservation was made.
 */
export function PendingReservationNotice({
  bookingId,
  startsAtIso,
  expiresAtIso,
  viewerTimezone,
}: Props) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [busy, setBusy] = useState<"pay" | "cancel" | null>(null);
  const [error, setError] = useState<string | null>(null);

  const format = (iso: string) =>
    new Date(iso).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
      timeZone: viewerTimezone,
    });

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
    <section className="mb-6 rounded-xl border border-[var(--app-warning-border)] bg-[var(--app-warning-bg)] p-4">
      <h2 className="text-sm font-bold tracking-[-0.01em] text-[var(--app-warning-text)]">
        {t("pendingReservationTitle")}
      </h2>
      <p className="mt-1 max-w-[60ch] text-sm text-foreground">
        {t("pendingReservationBody", {
          when: format(startsAtIso),
          expires: format(expiresAtIso),
        })}
      </p>
      {error ? (
        <p role="alert" className="mt-2">
          <Status tone="error">{error}</Status>
        </p>
      ) : null}
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => void onPay()}
          disabled={busy !== null}
          className={buttonClasses({ size: "sm" })}
        >
          {t("pendingReservationPay")}
        </button>
        <button
          type="button"
          onClick={() => void onCancel()}
          disabled={busy !== null}
          className={buttonClasses({ variant: "secondary", size: "sm" })}
        >
          {busy === "cancel"
            ? t("pendingReservationCancelWorking")
            : t("pendingReservationCancel")}
        </button>
      </div>
    </section>
  );
}
