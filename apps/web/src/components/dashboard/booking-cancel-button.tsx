"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  bookingId: string;
};

export function BookingCancelButton({ bookingId }: Props) {
  const t = useTranslations("dashboard");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onCancel() {
    if (!window.confirm(t("cancelBookingConfirm"))) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/cancel`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("cancelBookingError"));
        return;
      }
      router.refresh();
    } catch {
      setError(t("cancelBookingError"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="inline-flex flex-col items-start gap-1">
      {error ? (
        <p className="max-w-xs text-xs" style={{ color: "var(--app-danger)" }} role="alert">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={onCancel}
        disabled={loading}
        className="rounded-full border border-border px-3 py-1 text-xs font-medium text-muted hover:bg-[var(--app-hover)] disabled:opacity-50"
      >
        {loading ? t("cancelBookingWorking") : t("cancelBooking")}
      </button>
    </div>
  );
}
