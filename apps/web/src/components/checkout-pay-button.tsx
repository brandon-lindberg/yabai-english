"use client";

import { useState } from "react";
import { useRouter } from "@/i18n/navigation";
import { useTranslations } from "next-intl";
import { CheckoutTermsAgreementLabel } from "@/components/checkout-terms-agreement-label";
import { buttonClasses } from "@/components/ui/button";
import { CheckRow } from "@/components/ui/check-row";
import { Status } from "@/components/ui/status";
import { CheckoutMethodBadges } from "@/components/payment-method-logos";
import type { CheckoutMethod } from "@/lib/payment-methods";

type Props = {
  bookingId: string;
  checkoutMethods?: CheckoutMethod[];
};

export function CheckoutPayButton({ bookingId, checkoutMethods = [] }: Props) {
  const t = useTranslations("booking");
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onPay() {
    setLoading(true);
    setError(null);
    if (!accepted) {
      setError(t("acceptCheckoutTermsError"));
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/bookings/${bookingId}/pay`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ acceptedMarketplaceTerms: true }),
      });
      const data = (await res.json()) as { error?: string; checkoutUrl?: string };
      if (!res.ok) {
        setError(data.error ?? t("paymentFailed"));
        return;
      }
      router.push(data.checkoutUrl ?? "/dashboard");
    } catch {
      setError(t("paymentFailed"));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-3">
      {error && (
        <p role="alert">
          <Status tone="error">{error}</Status>
        </p>
      )}
      <CheckRow checked={accepted} onChange={setAccepted}>
        <CheckoutTermsAgreementLabel />
      </CheckRow>
      <button
        type="button"
        onClick={onPay}
        disabled={loading || !accepted}
        className={buttonClasses({ size: "lg" })}
      >
        {loading ? "…" : t("payNow")}
      </button>
      {checkoutMethods.length > 0 ? (
        <div className="space-y-2">
          <p className="max-w-[56ch] text-sm text-muted">{t("payNowMethodsHint")}</p>
          <CheckoutMethodBadges methods={checkoutMethods} />
        </div>
      ) : null}
    </div>
  );
}
