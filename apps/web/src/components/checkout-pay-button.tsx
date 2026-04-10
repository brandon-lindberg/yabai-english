"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";

type Props = {
  bookingId: string;
};

export function CheckoutPayButton({ bookingId }: Props) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPay() {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/bookings/${bookingId}/pay`, { method: "POST" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? t("paymentFailed"));
        return;
      }
      router.push("/dashboard");
    } catch {
      setError(t("paymentFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p className="text-sm" style={{ color: "var(--app-danger)" }}>
          {error}
        </p>
      )}
      <button
        type="button"
        onClick={onPay}
        disabled={loading}
        className="rounded-full bg-primary px-5 py-2.5 text-sm font-semibold text-primary-foreground hover:opacity-90 disabled:opacity-50"
      >
        {loading ? "…" : t("payNow")}
      </button>
    </div>
  );
}
